// Matemático forense, H24 (trânsito e atributos especiais), passo 1: atributos por seção nos dados abertos do TSE.
//  - eleitorado_local_votacao_2026.zip (um CSV por UF, os dois turnos): eleitores da seção, eleitores da eleição federal
//    e estadual, tipo de local (convencional, prisional...), seção agregada e principal, acessibilidade, local;
//  - perfil_eleitor_secao_2026_<UF>.zip (cadastro de julho): eleitores, com biometria e com deficiência, por seção.
// Só contagens por seção; nenhum dado pessoal.
// Uso: node scripts/auditoria/matematico-h24-dados.mjs → data/parsed/auditoria/matematico-forense/h24-atributos.jsonl
import { createReadStream } from 'node:fs';
import { mkdir, open, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { createInflateRaw } from 'node:zlib';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { listarEntradas } from '../../src/zip.js';
import { SAIDA } from './matematico-h23-lib.mjs';

const DA = path.join(DIR_DADOS, 'raw', 'dadosabertos');

/** Linhas de um CSV de dentro do zip, em streaming. */
async function* linhasCsv(arquivoZip, filtro) {
  const handle = await open(arquivoZip, 'r');
  let entrada;
  let inicio;
  try {
    entrada = (await listarEntradas(handle)).find(filtro);
    if (!entrada) throw new Error(`${path.basename(arquivoZip)} sem o CSV pedido`);
    const cab = Buffer.alloc(30);
    await handle.read(cab, 0, 30, entrada.offsetLocal);
    inicio = entrada.offsetLocal + 30 + cab.readUInt16LE(26) + cab.readUInt16LE(28);
  } finally {
    await handle.close();
  }
  let fluxo = createReadStream(arquivoZip, { start: inicio, end: inicio + entrada.tamanhoComprimido - 1 });
  if (entrada.metodo === 8) fluxo = fluxo.pipe(createInflateRaw());
  yield* createInterface({ input: fluxo.setEncoding('latin1'), crlfDelay: Infinity });
}
function separar(linha) {
  const campos = [];
  let atual = '';
  let aspas = false;
  for (const ch of linha) {
    if (ch === '"') aspas = !aspas;
    else if (ch === ';' && !aspas) { campos.push(atual); atual = ''; } else atual += ch;
  }
  campos.push(atual);
  return campos;
}
const k4 = (uf, m, z, s) => `${uf}/${String(m).padStart(5, '0')}/${String(z).padStart(4, '0')}/${String(s).padStart(4, '0')}`;

await mkdir(SAIDA, { recursive: true });
const sec = new Map();
const resumo = { locais: {}, perfil: {} };
const zipLoc = path.join(DA, 'eleitorado_locais_votacao', 'eleitorado_local_votacao_2026.zip');
for (const uf of UFS) {
  let col = null;
  let n = 0;
  for await (const l of linhasCsv(zipLoc, (e) => e.nome.toLowerCase() === `eleitorado_local_votacao_2026_${uf}.csv`)) {
    const c = separar(l);
    if (!col) { col = Object.fromEntries(c.map((x, i) => [x, i])); continue; }
    if (c.length < 10) continue;
    n++;
    const k = k4(uf, c[col.CD_MUNICIPIO], c[col.NR_ZONA], c[col.NR_SECAO]);
    const t = `t${c[col.NR_TURNO]}`;
    const o = sec.get(k) ?? { k };
    o[t] = { local: Number(c[col.NR_LOCAL_VOTACAO]), tipoLocal: c[col.DS_TIPO_LOCAL], agregada: c[col.DS_TIPO_SECAO_AGREGADA], principal: Number(c[col.NR_SECAO_PRINCIPAL]),
      acessibilidade: c[col.DS_SITU_SECAO_ACESSIBILIDADE], qtSecao: Number(c[col.QT_ELEITOR_SECAO]), qtFederal: Number(c[col.QT_ELEITOR_ELEICAO_FEDERAL]),
      qtEstadual: Number(c[col.QT_ELEITOR_ELEICAO_ESTADUAL]), situacao: c[col.DS_SITU_SECAO] };
    sec.set(k, o);
    const tl = `${t} ${c[col.DS_TIPO_LOCAL]}`;
    resumo.locais[tl] = (resumo.locais[tl] ?? 0) + 1;
  }
  console.log(`locais ${uf}: ${n} linhas`);
}
for (const uf of UFS) {
  let col = null;
  const zipP = path.join(DA, 'perfil_eleitor_secao', `perfil_eleitor_secao_2026_${uf.toUpperCase()}.zip`);
  for await (const l of linhasCsv(zipP, (e) => e.nome.toLowerCase().endsWith('.csv'))) {
    const c = separar(l);
    if (!col) { col = Object.fromEntries(c.map((x, i) => [x, i])); continue; }
    if (c.length < 10) continue;
    const k = k4(uf, c[col.CD_MUNICIPIO], c[col.NR_ZONA], c[col.NR_SECAO]);
    const o = sec.get(k) ?? { k };
    o.perfil ??= { eleitores: 0, biometria: 0, deficiencia: 0 };
    o.perfil.eleitores += Number(c[col.QT_ELEITORES]);
    o.perfil.biometria += Number(c[col.QT_ELEITORES_BIOMETRIA]);
    o.perfil.deficiencia += Number(c[col.QT_ELEITORES_DEFICIENCIA]);
    sec.set(k, o);
  }
  console.log(`perfil ${uf}`);
}
await writeFile(path.join(SAIDA, 'h24-atributos.jsonl'), `${[...sec.values()].map((o) => JSON.stringify(o)).join('\n')}\n`);
await writeFile(path.join(SAIDA, 'h24-atributos-resumo.json'), JSON.stringify({ secoes: sec.size, ...resumo }, null, 1));
console.log(sec.size, resumo.locais);
