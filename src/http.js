import { once } from 'node:events';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { setTimeout as esperar } from 'node:timers/promises';

export class ErroHttp extends Error {
  constructor(url, status, retryAfterMs = null) {
    super(`HTTP ${status} em ${url}`);
    this.url = url;
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

const statusRetentavel = (status) => status === 408 || status === 425 || status === 429 || status >= 500;

function lerRetryAfter(res) {
  const valor = res.headers.get('retry-after');
  if (!valor) return null;
  const segundos = Number(valor);
  if (Number.isFinite(segundos)) return segundos * 1000;
  const data = Date.parse(valor);
  return Number.isNaN(data) ? null : Math.max(0, data - Date.now());
}

/**
 * Executa `fn` com nova tentativa e backoff exponencial com jitter.
 * Erros HTTP definitivos (ex.: 404) não são repetidos.
 */
export async function comRetentativa(fn, { tentativas = 6, esperaBaseMs = 1000 } = {}) {
  for (let tentativa = 1; ; tentativa++) {
    try {
      return await fn(tentativa);
    } catch (erro) {
      const definitivo = erro instanceof ErroHttp && !statusRetentavel(erro.status);
      if (definitivo || tentativa >= tentativas) throw erro;
      const backoff = esperaBaseMs * 2 ** (tentativa - 1) * (0.5 + Math.random());
      await esperar(erro.retryAfterMs ?? backoff);
    }
  }
}

/**
 * Controle de taxa compartilhado entre requisições simultâneas (aumento aditivo, redução multiplicativa).
 * O servidor do TSE responde 429 sem Retry-After quando a taxa passa do limite e bloqueia o IP por um tempo:
 * no 429, todas as requisições pausam juntas e a taxa cai pela metade; a cada `janelaSucessos` respostas
 * sem 429, a taxa sobe 10%.
 */
export function criarControleTaxa({
  inicial = 50, minimo = 5, maximo = 500, pausaBaseMs = 30_000, pausaMaximaMs = 600_000, janelaSucessos = 200,
  agora = () => Date.now(), dormir = esperar,
} = {}) {
  let taxa = inicial;
  let proximoSlot = 0;
  let pausaAte = 0;
  let pausaAtualMs = pausaBaseMs;
  let sucessosSeguidos = 0;
  let bloqueios = 0;

  return {
    async aguardarVez() {
      for (;;) {
        const t = agora();
        if (t < pausaAte) {
          await dormir(pausaAte - t);
          continue;
        }
        const slot = Math.max(t, proximoSlot);
        proximoSlot = slot + 1000 / taxa;
        if (slot > t) await dormir(slot - t);
        if (agora() >= pausaAte) return;
      }
    },
    sucesso() {
      sucessosSeguidos++;
      if (sucessosSeguidos >= janelaSucessos) {
        sucessosSeguidos = 0;
        taxa = Math.min(maximo, taxa * 1.1);
        pausaAtualMs = pausaBaseMs;
      }
    },
    limitado() {
      const t = agora();
      sucessosSeguidos = 0;
      if (t < pausaAte) return; // várias respostas 429 do mesmo surto contam uma vez
      bloqueios++;
      taxa = Math.max(minimo, taxa / 2);
      pausaAte = t + pausaAtualMs;
      pausaAtualMs = Math.min(pausaMaximaMs, pausaAtualMs * 2);
    },
    get taxa() { return taxa; },
    get bloqueios() { return bloqueios; },
  };
}

export async function baixarBuffer(url, { timeoutMs = 60_000, tentativas, esperaBaseMs, controle } = {}) {
  return comRetentativa(async () => {
    if (controle) await controle.aguardarVez();
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) {
      await res.body?.cancel();
      if (controle && res.status === 429) controle.limitado();
      // Com controle, a espera do 429 é a pausa global (aguardarVez), não o backoff individual.
      throw new ErroHttp(url, res.status, controle && res.status === 429 ? 0 : lerRetryAfter(res));
    }
    const corpo = Buffer.from(await res.arrayBuffer());
    controle?.sucesso();
    return corpo;
  }, { tentativas: tentativas ?? (controle ? 30 : undefined), esperaBaseMs });
}

/** Grava via arquivo temporário + rename, para nunca deixar arquivo final pela metade. */
export async function salvarAtomico(caminho, conteudo) {
  await mkdir(path.dirname(caminho), { recursive: true });
  const temporario = `${caminho}.part`;
  await writeFile(temporario, conteudo);
  await rename(temporario, caminho);
}

async function tamanhoOuNulo(caminho) {
  try {
    return (await stat(caminho)).size;
  } catch (erro) {
    if (erro.code === 'ENOENT') return null;
    throw erro;
  }
}

async function lerJsonOuNulo(caminho) {
  try {
    return JSON.parse(await readFile(caminho, 'utf8'));
  } catch (erro) {
    if (erro.code === 'ENOENT' || erro instanceof SyntaxError) return null;
    throw erro;
  }
}

/**
 * Baixa arquivo grande com retomada: o progresso fica em `<destino>.part` e o ETag
 * em `<destino>.part.json`. Na retomada usa Range + If-Range; se o arquivo remoto
 * mudou, o servidor devolve 200 e o download recomeça do zero.
 */
export async function baixarArquivoGrande(url, destino, {
  inatividadeMs = 120_000, tentativas = 30, esperaBaseMs = 2000, aoProgresso = () => {},
} = {}) {
  const parcial = `${destino}.part`;
  const metaParcial = `${destino}.part.json`;
  await mkdir(path.dirname(destino), { recursive: true });

  return comRetentativa(async () => {
    let inicio = (await tamanhoOuNulo(parcial)) ?? 0;
    const meta = inicio > 0 ? await lerJsonOuNulo(metaParcial) : null;
    const headers = {};
    if (inicio > 0 && meta?.etag) {
      headers.Range = `bytes=${inicio}-`;
      headers['If-Range'] = meta.etag;
    } else {
      inicio = 0;
    }

    const controle = new AbortController();
    let temporizador = setTimeout(() => controle.abort(new Error(`sem dados há ${inatividadeMs} ms`)), inatividadeMs);
    const rearmar = () => {
      clearTimeout(temporizador);
      temporizador = setTimeout(() => controle.abort(new Error(`sem dados há ${inatividadeMs} ms`)), inatividadeMs);
    };

    try {
      const res = await fetch(url, { headers, signal: controle.signal });
      let total;
      if (res.status === 206) {
        const faixa = /^bytes (\d+)-\d+\/(\d+)$/.exec(res.headers.get('content-range') ?? '');
        if (!faixa || Number(faixa[1]) !== inicio) {
          await res.body?.cancel();
          throw new Error(`Content-Range inesperado em ${url}: ${res.headers.get('content-range')}`);
        }
        total = Number(faixa[2]);
      } else if (res.status === 200) {
        inicio = 0;
        total = Number(res.headers.get('content-length'));
      } else {
        await res.body?.cancel();
        throw new ErroHttp(url, res.status, lerRetryAfter(res));
      }

      const etag = res.headers.get('etag');
      const ultimaModificacao = res.headers.get('last-modified');
      await writeFile(metaParcial, JSON.stringify({ url, etag, ultimaModificacao, total }));
      aoProgresso({ inicio, total, recebidos: 0 });

      const saida = createWriteStream(parcial, { flags: inicio > 0 ? 'a' : 'w' });
      const fechado = once(saida, 'close');
      try {
        await pipeline(
          Readable.fromWeb(res.body),
          async function* (origem) {
            for await (const pedaco of origem) {
              rearmar();
              aoProgresso({ inicio, total, recebidos: pedaco.length });
              yield pedaco;
            }
          },
          saida,
        );
      } finally {
        // No Windows, renomear/remover com o handle ainda aberto falha depois; espera o fechamento.
        await fechado;
      }

      const tamanhoFinal = await tamanhoOuNulo(parcial);
      if (Number.isFinite(total) && tamanhoFinal !== total) {
        throw new Error(`download incompleto de ${url}: ${tamanhoFinal}/${total} bytes`);
      }
      await rename(parcial, destino);
      await rename(metaParcial, `${destino}.meta.json`);
      return { url, etag, ultimaModificacao, bytes: tamanhoFinal };
    } finally {
      clearTimeout(temporizador);
    }
  }, { tentativas, esperaBaseMs });
}

/** Executa `fn` sobre `itens` com no máximo `limite` execuções simultâneas. */
export async function emParalelo(itens, limite, fn) {
  let proximo = 0;
  const trabalhadores = Array.from({ length: Math.min(limite, itens.length) }, async () => {
    while (proximo < itens.length) {
      const indice = proximo++;
      await fn(itens[indice], indice);
    }
  });
  await Promise.all(trabalhadores);
}
