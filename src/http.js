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

export async function baixarBuffer(url, { timeoutMs = 60_000, tentativas, esperaBaseMs } = {}) {
  return comRetentativa(async () => {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) {
      await res.body?.cancel();
      throw new ErroHttp(url, res.status, lerRetryAfter(res));
    }
    return Buffer.from(await res.arrayBuffer());
  }, { tentativas, esperaBaseMs });
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
