import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { open, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import {
  dirSecao, interpretarNomeUrna, nomeZip, urlArquivo, urlAux, urlConfigUf, urlZip,
} from './config.js';
import { conferirSecao, hashesForaDoAux } from './conferencia.js';
import { baixarArquivoGrande, baixarBuffer, emParalelo, salvarAtomico } from './http.js';
import { montarSecoes } from './indice.js';
import { criarProgresso, formatarBytes } from './registro.js';
import { hashDiretorio } from './vsc.js';
import { lerEntrada, listarEntradas } from './zip.js';

async function existe(caminho) {
  try {
    return await stat(caminho);
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

async function sha256Arquivo(caminho) {
  const hash = createHash('sha256');
  await pipeline(createReadStream(caminho), hash);
  return hash.digest('hex');
}

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

/** Caminho relativo a data/, sempre com '/', para o manifesto ser portável entre sistemas. */
const relativo = (ctx, caminho) => path.relative(ctx.dirDados, caminho).split(path.sep).join('/');

/** Etapa 1: lista de seções por UF a partir do `cs.json` oficial. */
export async function etapaIndice(ctx) {
  const { turno, pleito, ufs, dirs, registro, atualizarIndice } = ctx;
  const indice = new Map();

  for (const uf of ufs) {
    const destino = path.join(dirs.config, `${uf}-p${pleito.padStart(6, '0')}-cs.json`);
    if (atualizarIndice || !(await existe(destino))) {
      const url = urlConfigUf(pleito, uf);
      const buffer = await baixarBuffer(url, { timeoutMs: 180_000 });
      JSON.parse(buffer.toString('utf8'));
      await salvarAtomico(destino, buffer);
      await registro.download({ etapa: 'indice', url, caminho: relativo(ctx, destino), bytes: buffer.length, sha256: sha256(buffer) });
    }
    const secoes = montarSecoes(JSON.parse(await readFile(destino, 'utf8')));
    for (const inconsistencia of secoes.inconsistencias) {
      await registro.ocorrencia({ etapa: 'indice', gravidade: 'aviso', ...inconsistencia });
    }
    indice.set(uf, secoes);
  }

  const principais = [...indice.values()].reduce((n, s) => n + s.principais.length, 0);
  const agregadas = [...indice.values()].reduce((n, s) => n + s.agregadas.length, 0);
  console.log(`[indice ${turno}t] ${ufs.length} UFs · ${principais} seções com urna · ${agregadas} agregadas · ${principais + agregadas} no total`);
  return indice;
}

/** Etapa 2: zips consolidados por UF na CDN do TSE (com retomada). */
export async function etapaZips(ctx) {
  const { sufixo, ufs, dirs, registro, zipsParalelos } = ctx;
  const pendentes = [];
  for (const uf of ufs) {
    if (!(await existe(path.join(dirs.zips, nomeZip(sufixo, uf))))) pendentes.push(uf);
  }
  if (pendentes.length === 0) {
    console.log('[zips] todos já baixados');
    return;
  }

  const totais = new Map();
  const recebidos = new Map();
  for (const uf of pendentes) {
    const res = await fetch(urlZip(sufixo, uf), { method: 'HEAD', signal: AbortSignal.timeout(60_000) });
    totais.set(uf, Number(res.headers.get('content-length')) || 0);
  }
  const totalGeral = [...totais.values()].reduce((a, b) => a + b, 0);
  console.log(`[zips] ${pendentes.length} UFs pendentes · ${formatarBytes(totalGeral)}`);
  const progresso = criarProgresso('zips', totalGeral, { formatar: formatarBytes });

  await emParalelo(pendentes, zipsParalelos, async (uf) => {
    const url = urlZip(sufixo, uf);
    const destino = path.join(dirs.zips, nomeZip(sufixo, uf));
    try {
      const info = await baixarArquivoGrande(url, destino, {
        aoProgresso: ({ inicio, recebidos: n }) => {
          recebidos.set(uf, n === 0 ? inicio : (recebidos.get(uf) ?? 0) + n);
          progresso.definir([...recebidos.values()].reduce((a, b) => a + b, 0));
        },
      });
      const hash = await sha256Arquivo(destino);
      await registro.zip({ uf, ...info, caminho: relativo(ctx, destino), sha256: hash });
    } catch (erro) {
      progresso.falhar();
      await registro.ocorrencia({ etapa: 'zips', gravidade: 'falha', uf, url, erro: erro.message });
    }
  });
  progresso.finalizar();
}

async function extrairSecao(handle, itens, dirUrnas) {
  const itemVota = itens.find((i) => i.info.tipo === 'vota.vsc');
  if (!itemVota) throw new Error('seção no zip sem vota.vsc');
  const vota = await lerEntrada(handle, itemVota.entrada);
  const dirHash = path.join(dirSecao(dirUrnas, itemVota.info), hashDiretorio(vota));

  for (const { entrada } of itens) {
    const destino = path.join(dirHash, entrada.nome);
    const atual = await existe(destino);
    if (atual && atual.size === entrada.tamanho) continue;
    await salvarAtomico(destino, entrada === itemVota.entrada ? vota : await lerEntrada(handle, entrada));
  }
}

/** Etapa 3: extrai cada zip para urnas/{uf}/{mun}/{zona}/{secao}/{hash}/ (CRC conferido). */
export async function etapaExtrair(ctx, indice) {
  const { pleito, sufixo, ufs, dirs, registro, concorrencia } = ctx;

  for (const uf of ufs) {
    const arquivoZip = path.join(dirs.zips, nomeZip(sufixo, uf));
    const infoZip = await existe(arquivoZip);
    if (!infoZip) {
      await registro.ocorrencia({ etapa: 'extrair', gravidade: 'aviso', uf, erro: 'zip ainda não baixado' });
      console.log(`[extrair ${uf}] zip ausente, pulando`);
      continue;
    }
    const marcador = `${arquivoZip}.extraido.json`;
    const anterior = await lerJsonOuNulo(marcador);
    if (!ctx.reextrair && anterior && anterior.bytesZip === infoZip.size && anterior.mtimeZip === infoZip.mtimeMs) {
      console.log(`[extrair ${uf}] já extraído (${anterior.secoes} seções)`);
      continue;
    }

    const handle = await open(arquivoZip, 'r');
    try {
      const entradas = await listarEntradas(handle);
      const grupos = new Map();
      const extras = [];
      for (const entrada of entradas) {
        const info = interpretarNomeUrna(entrada.nome);
        if (!info || info.pleito !== pleito || info.uf !== uf) {
          extras.push(entrada);
          continue;
        }
        const chave = `${info.municipio}/${info.zona}/${info.secao}`;
        if (!grupos.has(chave)) grupos.set(chave, []);
        grupos.get(chave).push({ entrada, info });
      }

      const progresso = criarProgresso(`extrair ${uf}`, grupos.size);
      await emParalelo([...grupos.entries()], concorrencia, async ([chave, itens]) => {
        try {
          await extrairSecao(handle, itens, dirs.urnas);
          progresso.avancar();
        } catch (erro) {
          progresso.falhar();
          await registro.ocorrencia({ etapa: 'extrair', gravidade: 'falha', uf, secao: chave, erro: erro.message });
        }
      });
      progresso.finalizar();

      for (const entrada of extras) {
        const nome = path.basename(entrada.nome);
        if (!nome || nome === '.' || nome === '..' || entrada.nome.endsWith('/')) continue;
        const destino = path.join(dirs.extrasZip, uf, nome);
        if (!(await existe(destino))) await salvarAtomico(destino, await lerEntrada(handle, entrada));
      }

      const noIndice = new Set(indice.get(uf).principais.map((s) => `${s.municipio}/${s.zona}/${s.secao}`));
      const foraDoIndice = [...grupos.keys()].filter((k) => !noIndice.has(k));
      const foraDoZip = [...noIndice].filter((k) => !grupos.has(k));
      for (const secao of foraDoIndice) await registro.ocorrencia({ etapa: 'extrair', gravidade: 'aviso', uf, secao, erro: 'seção no zip fora do índice' });
      for (const secao of foraDoZip) await registro.ocorrencia({ etapa: 'extrair', gravidade: 'aviso', uf, secao, erro: 'seção do índice ausente no zip' });
      console.log(`[extrair ${uf}] ${grupos.size} seções no zip · ${foraDoZip.length} do índice ausentes no zip · ${foraDoIndice.length} fora do índice · ${extras.length} arquivos extras`);

      if (progresso.falhas === 0) {
        await writeFile(marcador, JSON.stringify({ bytesZip: infoZip.size, mtimeZip: infoZip.mtimeMs, secoes: grupos.size, em: new Date().toISOString() }));
      }
    } finally {
      await handle.close();
    }
  }
}

/** Etapa 4: aux.json de cada seção com urna (lista oficial de hashes e arquivos). */
export async function etapaAux(ctx, indice) {
  const { pleito, ufs, dirs, registro, concorrencia } = ctx;
  const secoes = ufs.flatMap((uf) => indice.get(uf).principais);
  const progresso = criarProgresso('aux', secoes.length);

  await emParalelo(secoes, concorrencia, async (s) => {
    const destino = path.join(dirSecao(dirs.urnas, s), 'aux.json');
    const atual = await lerJsonOuNulo(destino);
    if (atual?.st === 'Totalizada') {
      progresso.avancar();
      return;
    }
    const url = urlAux(pleito, s);
    try {
      const buffer = await baixarBuffer(url);
      JSON.parse(buffer.toString('utf8'));
      await salvarAtomico(destino, buffer);
      progresso.avancar();
    } catch (erro) {
      progresso.falhar();
      await registro.ocorrencia({ etapa: 'aux', gravidade: 'falha', uf: s.uf, municipio: s.municipio, zona: s.zona, secao: s.secao, url, erro: erro.message });
    }
  });
  progresso.finalizar();
}

/** Etapa 5: confere tudo contra aux + vota.vsc, baixa o que falta e grava a cobertura. */
export async function etapaConferir(ctx, indice) {
  const { turno, pleito, ufs, dirs, registro, concorrencia, reparar } = ctx;
  const caminhoResumo = path.join(dirs.manifesto, 'resumo.json');
  const resumo = (await lerJsonOuNulo(caminhoResumo)) ?? { turno, pleito, ufs: {} };

  for (const uf of ufs) {
    const { principais, agregadas } = indice.get(uf);
    const registros = [];
    const progresso = criarProgresso(`conferir ${uf}`, principais.length);

    await emParalelo(principais, concorrencia, async (s) => {
      const dir = dirSecao(dirs.urnas, s);
      try {
        const aux = await lerJsonOuNulo(path.join(dir, 'aux.json'));
        const baixar = reparar
          ? async (hash, nome, destino) => {
            const url = urlArquivo(pleito, s, hash, nome);
            const buffer = await baixarBuffer(url);
            await salvarAtomico(destino, buffer);
            await registro.download({ etapa: 'conferir', url, caminho: relativo(ctx, destino), bytes: buffer.length, sha256: sha256(buffer) });
          }
          : undefined;
        const resultado = await conferirSecao({ dir, aux, baixar });
        const extras = await hashesForaDoAux(dir, aux);
        registros.push({ uf: s.uf, municipio: s.municipio, zona: s.zona, secao: s.secao, agregadas: s.agregadas, ...resultado, ...(extras.length ? { hashesForaDoAux: extras } : {}) });
        if (resultado.situacao === 'completa') progresso.avancar();
        else progresso.falhar();
      } catch (erro) {
        progresso.falhar();
        registros.push({ uf: s.uf, municipio: s.municipio, zona: s.zona, secao: s.secao, situacao: 'erro', erro: erro.message });
      }
    });
    progresso.finalizar();

    registros.sort((a, b) => `${a.municipio}${a.zona}${a.secao}`.localeCompare(`${b.municipio}${b.zona}${b.secao}`));
    await salvarAtomico(path.join(dirs.manifesto, 'cobertura', `${uf}.jsonl`), registros.map((r) => JSON.stringify(r)).join('\n') + '\n');

    const porSituacao = {};
    for (const r of registros) porSituacao[r.situacao] = (porSituacao[r.situacao] ?? 0) + 1;
    const completas = new Set(registros.filter((r) => r.situacao === 'completa').map((r) => `${r.municipio}/${r.zona}/${r.secao}`));
    const imgbu = registros.flatMap((r) => r.hashes ?? []).filter((h) => h.imgbu === 'ok').length;
    resumo.ufs[uf] = {
      secoesComUrna: principais.length,
      agregadas: agregadas.length,
      agregadasCobertas: agregadas.filter((a) => completas.has(`${a.municipio}/${a.zona}/${a.principal}`)).length,
      ...porSituacao,
      imgbuOk: imgbu,
      conferidoEm: new Date().toISOString(),
    };
  }

  const linhas = Object.entries(resumo.ufs).sort(([a], [b]) => a.localeCompare(b));
  const soma = (campo) => linhas.reduce((n, [, v]) => n + (v[campo] ?? 0), 0);
  resumo.total = {
    ufs: linhas.length,
    secoesComUrna: soma('secoesComUrna'),
    completas: soma('completa'),
    agregadas: soma('agregadas'),
    agregadasCobertas: soma('agregadasCobertas'),
  };
  resumo.coberturaTotal = resumo.total.ufs === ctx.totalUfs
    && resumo.total.completas === resumo.total.secoesComUrna
    && resumo.total.agregadasCobertas === resumo.total.agregadas;
  resumo.geradoEm = new Date().toISOString();
  await salvarAtomico(caminhoResumo, JSON.stringify(resumo, null, 2));

  console.table(Object.fromEntries(linhas.map(([uf, v]) => [uf.toUpperCase(), {
    'com urna': v.secoesComUrna, completas: v.completa ?? 0, incompletas: v.incompleta ?? 0,
    'sem aux': v.sem_aux ?? 0, 'sem arquivos oficiais': v.sem_arquivos_oficiais ?? 0, erro: v.erro ?? 0,
    agregadas: `${v.agregadasCobertas}/${v.agregadas}`, imgbu: v.imgbuOk,
  }])));
  const pct = resumo.total.secoesComUrna ? ((resumo.total.completas / resumo.total.secoesComUrna) * 100).toFixed(3) : '0';
  console.log(`[conferir] ${resumo.total.completas}/${resumo.total.secoesComUrna} seções com urna completas (${pct}%) · agregadas cobertas ${resumo.total.agregadasCobertas}/${resumo.total.agregadas} · cobertura total: ${resumo.coberturaTotal ? 'SIM' : 'NÃO'}`);
  return ufs.every((uf) => {
    const v = resumo.ufs[uf];
    return v.completa === v.secoesComUrna && v.agregadasCobertas === v.agregadas;
  });
}
