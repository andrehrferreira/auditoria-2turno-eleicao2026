// Auditor A (contagem): leitura em streaming dos CSVs dos dados abertos do TSE, de dentro do zip, sem extrair.
// Uso como módulo: `for await (const linha of linhasCsv(zip, entrada)) ...` (linha = objeto coluna → valor).
// Uso direto: node scripts/auditoria/contagem-zip.mjs <zip> [nº de linhas]  → lista as entradas e mostra as primeiras linhas.
import { createReadStream } from 'node:fs';
import { open } from 'node:fs/promises';
import readline from 'node:readline';
import { createInflateRaw } from 'node:zlib';
import { listarEntradas } from '../../src/zip.js';

export const ZIPS = {
  votacaoSecao: 'data/raw/dadosabertos/votacao_secao/votacao_secao_2026_BR.zip',
  detalheSecao: 'data/raw/dadosabertos/detalhe_votacao_secao/detalhe_votacao_secao_2026.zip',
  munzona: 'data/raw/dadosabertos/votacao_candidato_munzona/votacao_candidato_munzona_2026.zip',
};

export async function entradasZip(zip) {
  const h = await open(zip, 'r');
  try {
    const entradas = await listarEntradas(h);
    for (const e of entradas) {
      const cab = Buffer.alloc(30);
      await h.read(cab, 0, 30, e.offsetLocal);
      e.inicioDados = e.offsetLocal + 30 + cab.readUInt16LE(26) + cab.readUInt16LE(28);
    }
    return entradas;
  } finally {
    await h.close();
  }
}

/** Linhas do CSV (separador ';', aspas, latin1) como arrays; a primeira é o cabeçalho. */
export async function* linhasBrutas(zip, entrada) {
  const fim = entrada.inicioDados + entrada.tamanhoComprimido - 1;
  let fluxo = createReadStream(zip, { start: entrada.inicioDados, end: Math.max(fim, entrada.inicioDados) });
  if (entrada.metodo === 8) fluxo = fluxo.pipe(createInflateRaw());
  const rl = readline.createInterface({ input: fluxo.setEncoding('latin1'), crlfDelay: Infinity });
  for await (const linha of rl) {
    if (linha) yield linha.split(';').map((x) => x.replace(/^"|"$/g, ''));
  }
}

/** Linhas do CSV como objetos {coluna: valor}. */
export async function* linhasCsv(zip, entrada) {
  let col = null;
  for await (const c of linhasBrutas(zip, entrada)) {
    if (!col) { col = c; continue; }
    const o = {};
    for (let i = 0; i < col.length; i++) o[col[i]] = c[i];
    yield o;
  }
}

if (process.argv[1]?.endsWith('contagem-zip.mjs')) {
  const zip = process.argv[2];
  const n = Number(process.argv[3] ?? 3);
  if (zip) {
    const entradas = await entradasZip(zip);
    for (const e of entradas) console.log(`${e.nome}\t${e.tamanho} bytes`);
    for (const e of entradas.filter((x) => x.nome.endsWith('.csv')).slice(0, 1)) {
      let i = 0;
      for await (const l of linhasBrutas(zip, e)) { console.log(l.join(' ; ')); if (++i > n) break; }
    }
  }
}
