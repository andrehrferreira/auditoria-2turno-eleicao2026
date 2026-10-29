// Conferência de coerência entre os tópicos de docs/pericia/ (29/10/2026).
// 1) BU × resultado oficial, Presidente, no turno pedido, seção a seção, em junção completa. O lado oficial é lido
//    DIRETO do CSV dentro do zip (votacao_secao_2026_BR.zip); o lado BU vem da tabela voto_bu da cópia de leitura.
// 2) UFs com Governador no 2º turno (voto_bu, cargo 3) e número de seções por UF.
// 3) Cobertura do 1º turno na cópia de leitura (seções por UF em secao, voto_bu e perfil_log).
// Uso: node --max-old-space-size=8192 scripts/auditoria/verifica-pericia-coerencia-topicos.mjs [--turno 1]
import { createReadStream } from 'node:fs';
import { open } from 'node:fs/promises';
import { createInflateRaw } from 'node:zlib';
import readline from 'node:readline';
import { parseArgs } from 'node:util';
import { listarEntradas } from '../../src/zip.js';
import { abrirLeitura } from '../../src/banco-leitura.js';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '1' } } });
const T = values.turno;
const chave = (uf, m, z, s) => `${uf.toLowerCase()}|${Number(m)}|${Number(z)}|${Number(s)}`;

// 1) Oficial, direto do CSV
const zip = 'data/raw/dadosabertos/votacao_secao/votacao_secao_2026_BR.zip';
const h = await open(zip, 'r');
const e = (await listarEntradas(h)).filter((x) => x.nome.endsWith('.csv'))[0];
const cab = Buffer.alloc(30);
await h.read(cab, 0, 30, e.offsetLocal);
const inicio = e.offsetLocal + 30 + cab.readUInt16LE(26) + cab.readUInt16LE(28);
await h.close();
const rl = readline.createInterface({
  input: createReadStream(zip, { start: inicio, end: inicio + e.tamanhoComprimido - 1 }).pipe(createInflateRaw()).setEncoding('latin1'),
});
let col = null;
const oficial = new Map();
const ufsOficial = new Set();
for await (const linha of rl) {
  const c = linha.split(';').map((x) => x.replace(/^"|"$/g, ''));
  if (!col) { col = Object.fromEntries(c.map((n, i) => [n, i])); continue; }
  if (c[col.NR_TURNO] !== T || c[col.CD_CARGO] !== '1') continue;
  ufsOficial.add(c[col.SG_UF]);
  const k = chave(c[col.SG_UF], c[col.CD_MUNICIPIO], c[col.NR_ZONA], c[col.NR_SECAO]);
  const o = oficial.get(k) ?? new Map();
  const n = Number(c[col.NR_VOTAVEL]);
  o.set(n, (o.get(n) ?? 0) + Number(c[col.QT_VOTOS]));
  oficial.set(k, o);
}

// BU, da cópia de leitura
const { db, ponteiro } = await abrirLeitura();
console.log('banco:', ponteiro?.arquivo, ponteiro?.criadoEm, JSON.stringify(ponteiro?.cargas));
const bu = new Map();
const ufsBu = new Set();
for (const r of db.prepare(`SELECT uf, municipio, zona, secao, CASE tipo_voto WHEN 'branco' THEN 95 WHEN 'nulo' THEN 96 ELSE numero END AS n, SUM(quantidade) AS q
  FROM voto_bu WHERE turno = ? AND cargo = 1 GROUP BY 1,2,3,4,5`).iterate(Number(T))) {
  ufsBu.add(r.uf);
  const k = chave(r.uf, r.municipio, r.zona, r.secao);
  const o = bu.get(k) ?? new Map();
  o.set(r.n, (o.get(r.n) ?? 0) + r.q);
  bu.set(k, o);
}
const tot = { bu: new Map(), of: new Map() };
for (const [lado, m] of [['bu', bu], ['of', oficial]]) for (const v of m.values()) for (const [n, q] of v) tot[lado].set(n, (tot[lado].get(n) ?? 0) + q);
const todas = new Set([...bu.keys(), ...oficial.keys()]);
let secDiv = 0; let paresDiv = 0; let soBu = 0; let soOf = 0;
const ex = [];
for (const k of todas) {
  const b = bu.get(k); const o = oficial.get(k);
  if (!b) { soOf++; secDiv++; if (ex.length < 10) ex.push({ k, so: 'oficial' }); continue; }
  if (!o) { soBu++; secDiv++; if (ex.length < 10) ex.push({ k, so: 'bu' }); continue; }
  let d = false;
  for (const n of new Set([...b.keys(), ...o.keys()])) if ((b.get(n) ?? 0) !== (o.get(n) ?? 0)) { d = true; paresDiv++; }
  if (d) { secDiv++; if (ex.length < 10) ex.push({ k, bu: Object.fromEntries(b), of: Object.fromEntries(o) }); }
}
const soma = (m) => [...m.values()].reduce((a, b) => a + b, 0);
console.log(`\n[1] Presidente, ${T}º turno: UFs no BU ${ufsBu.size}, UFs no CSV ${ufsOficial.size}`);
console.log('seções BU:', bu.size, '| seções oficial:', oficial.size, '| união:', todas.size, '| só BU:', soBu, '| só oficial:', soOf, '| seções divergentes:', secDiv, '| pares divergentes:', paresDiv);
console.log('votos BU:', soma(tot.bu), '| votos oficial:', soma(tot.of));
for (const n of [...tot.bu.keys()].sort((a, b) => tot.bu.get(b) - tot.bu.get(a)).slice(0, 6)) console.log(`  número ${n}: BU ${tot.bu.get(n)} | oficial ${tot.of.get(n) ?? 0}`);
if (ex.length) console.log(JSON.stringify(ex, null, 1));

// 2) Governador no 2º turno
console.log('\n[2] Governador, 2º turno, seções por UF:');
console.log(db.prepare(`SELECT uf, COUNT(DISTINCT municipio||zona||secao) secoes FROM voto_bu WHERE turno = 2 AND cargo = 3 GROUP BY uf`).all().map((r) => `${r.uf} ${r.secoes}`).join('; '));

// 3) Cobertura do 1º turno
console.log('\n[3] Cobertura, 1º turno:');
for (const [t, sql] of [['secao (completa)', `SELECT COUNT(DISTINCT uf) ufs, COUNT(*) n FROM secao WHERE turno = 1 AND situacao = 'completa'`],
  ['perfil_log', 'SELECT COUNT(DISTINCT uf) ufs, COUNT(*) n FROM perfil_log WHERE turno = 1'],
  ['carga', 'SELECT COUNT(*) ufs, SUM(completas) n FROM carga WHERE turno = 1']]) console.log(t, JSON.stringify(db.prepare(sql).get()));
db.close();
