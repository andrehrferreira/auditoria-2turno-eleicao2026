// Demógrafo: resume o perfil do eleitorado por seção (dados abertos do TSE, perfil_eleitor_secao_2026_<UF>.zip)
// em faixas de idade, com e sem biometria. Só contagens agregadas por seção; nenhum dado individual.
// Saída: data/parsed/auditoria/demografo/perfil/<uf>.tsv (uma linha por seção).
// Uso: node scripts/auditoria/demografo-perfil.mjs [UF ...]   (sem argumento: todas as UFs e ZZ)
import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import { createInflateRaw } from 'node:zlib';
import { entradasZip } from './contagem-zip.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const DIR_ZIP = path.join(RAIZ, 'data', 'raw', 'dadosabertos', 'perfil_eleitor_secao');
const DIR_SAIDA = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'demografo', 'perfil');
const TODAS = 'AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO ZZ'.split(' ');

// Faixas de saída (código CD_FAIXA_ETARIA do TSE → faixa). 70+ tem voto facultativo; 16 e 17 também.
export const FAIXAS = ['f16_17', 'f18_69', 'f70_79', 'f80_89', 'f90_99', 'f100', 'invalida'];
function faixa(cod) {
  if (cod === 1600 || cod === 1700) return 0;
  if (cod === 7074 || cod === 7579) return 2;
  if (cod === 8084 || cod === 8589) return 3;
  if (cod === 9094 || cod === 9599) return 4;
  if (cod === 9999) return 5;
  if (cod >= 1800 && cod <= 6569) return 1;
  return 6;
}
// Colunas: total, biometria, eleitores por faixa (7), sem biometria por faixa (7)
export const COLUNAS = ['uf', 'municipio', 'zona', 'secao', 'total', 'biometria', ...FAIXAS, ...FAIXAS.map((f) => `sembio_${f}`)];

async function processarUf(uf) {
  const zip = path.join(DIR_ZIP, `perfil_eleitor_secao_2026_${uf}.zip`);
  const entrada = (await entradasZip(zip)).find((e) => e.nome.endsWith('.csv'));
  let fluxo = createReadStream(zip, { start: entrada.inicioDados, end: entrada.inicioDados + entrada.tamanhoComprimido - 1, highWaterMark: 1 << 20 });
  if (entrada.metodo === 8) fluxo = fluxo.pipe(createInflateRaw({ chunkSize: 1 << 20 }));
  const rl = readline.createInterface({ input: fluxo.setEncoding('latin1'), crlfDelay: Infinity });
  const secoes = new Map();
  let idx = null;
  let linhas = 0;
  const num = (s) => Number(s.charCodeAt(0) === 34 ? s.slice(1, -1) : s);
  for await (const linha of rl) {
    if (!linha) continue;
    const c = linha.split(';');
    if (!idx) {
      const cab = c.map((x) => x.replace(/"/g, ''));
      idx = Object.fromEntries(['CD_MUNICIPIO', 'NR_ZONA', 'NR_SECAO', 'CD_FAIXA_ETARIA', 'QT_ELEITORES', 'QT_ELEITORES_BIOMETRIA'].map((k) => [k, cab.indexOf(k)]));
      if (Object.values(idx).some((i) => i < 0)) throw new Error(`${uf}: cabeçalho inesperado`);
      continue;
    }
    linhas++;
    const mun = c[idx.CD_MUNICIPIO].replace(/"/g, '').padStart(5, '0');
    const chave = `${mun}\t${String(num(c[idx.NR_ZONA])).padStart(4, '0')}\t${String(num(c[idx.NR_SECAO])).padStart(4, '0')}`;
    let v = secoes.get(chave);
    if (!v) secoes.set(chave, (v = new Array(16).fill(0)));
    const qt = num(c[idx.QT_ELEITORES]);
    const bio = num(c[idx.QT_ELEITORES_BIOMETRIA]);
    const f = faixa(num(c[idx.CD_FAIXA_ETARIA]));
    v[0] += qt; v[1] += bio; v[2 + f] += qt; v[9 + f] += qt - bio;
  }
  const saida = [COLUNAS.join('\t')];
  for (const [chave, v] of [...secoes].sort((a, b) => (a[0] < b[0] ? -1 : 1))) saida.push(`${uf.toLowerCase()}\t${chave}\t${v.join('\t')}`);
  await writeFile(path.join(DIR_SAIDA, `${uf.toLowerCase()}.tsv`), saida.join('\n') + '\n');
  const total = [...secoes.values()].reduce((s, v) => s + v[0], 0);
  console.log(`${uf}: ${linhas} linhas, ${secoes.size} seções, ${total} eleitores`);
}

if (process.argv[1]?.endsWith('demografo-perfil.mjs')) {
  await mkdir(DIR_SAIDA, { recursive: true });
  const ufs = process.argv.slice(2).map((u) => u.toUpperCase());
  for (const uf of ufs.length ? ufs : TODAS) await processarUf(uf);
}
