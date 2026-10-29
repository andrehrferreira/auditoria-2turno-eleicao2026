// Verificação independente do tópico docs/pericia/05-soma-dos-boletins.md (2º turno, Presidente).
// Lado oficial: lido DIRETO do CSV dentro de data/raw/dadosabertos/votacao_secao/votacao_secao_2026_BR.zip
// (não usa a tabela voto_oficial nem a view v_divergencia_bu_oficial). Lado BU: tabela voto_bu da cópia de leitura.
// Compara cada par (seção, número votado) em junção completa: par presente só num lado conta como divergência.
// Uso: node scripts/auditoria/verifica-pericia-soma-boletins.mjs
import { createReadStream } from 'node:fs';
import { open } from 'node:fs/promises';
import { createInflateRaw } from 'node:zlib';
import readline from 'node:readline';
import { listarEntradas } from '../../src/zip.js';
import { abrirLeitura } from '../../src/banco-leitura.js';

const chave = (uf, m, z, s) => `${uf.toLowerCase()}|${Number(m)}|${Number(z)}|${Number(s)}`;
const iguais = (b, o) => [...new Set([...b.keys(), ...o.keys()])].every((n) => (b.get(n) ?? 0) === (o.get(n) ?? 0));

// 1) Oficial, direto do CSV
const zip = 'data/raw/dadosabertos/votacao_secao/votacao_secao_2026_BR.zip';
const h = await open(zip, 'r');
const entradas = (await listarEntradas(h)).filter((x) => x.nome.endsWith('.csv'));
const e = entradas[0];
const cab = Buffer.alloc(30);
await h.read(cab, 0, 30, e.offsetLocal);
const inicio = e.offsetLocal + 30 + cab.readUInt16LE(26) + cab.readUInt16LE(28);
await h.close();
const rl = readline.createInterface({
  input: createReadStream(zip, { start: inicio, end: inicio + e.tamanhoComprimido - 1 }).pipe(createInflateRaw()).setEncoding('latin1'),
});
let col = null;
const oficial = new Map();
const geracoes = new Set();
const turnos = new Map();
const cargos = new Map();
for await (const linha of rl) {
  const c = linha.split(';').map((x) => x.replace(/^"|"$/g, ''));
  if (!col) { col = Object.fromEntries(c.map((n, i) => [n, i])); continue; }
  turnos.set(c[col.NR_TURNO], (turnos.get(c[col.NR_TURNO]) ?? 0) + 1);
  cargos.set(c[col.CD_CARGO], (cargos.get(c[col.CD_CARGO]) ?? 0) + 1);
  if (c[col.NR_TURNO] !== '2' || c[col.CD_CARGO] !== '1') continue;
  geracoes.add(`${c[col.DT_GERACAO]} ${c[col.HH_GERACAO]}`);
  const k = chave(c[col.SG_UF], c[col.CD_MUNICIPIO], c[col.NR_ZONA], c[col.NR_SECAO]);
  const o = oficial.get(k) ?? new Map();
  const n = Number(c[col.NR_VOTAVEL]);
  o.set(n, (o.get(n) ?? 0) + Number(c[col.QT_VOTOS]));
  oficial.set(k, o);
}
console.log('CSV:', e.nome, '| entradas csv no zip:', entradas.length, '| linhas por turno:', Object.fromEntries(turnos), '| por cargo:', Object.fromEntries(cargos), '| geração (2º turno, presidente):', [...geracoes]);

// 2) BU, da cópia de leitura
const { db, ponteiro } = await abrirLeitura();
console.log('banco:', ponteiro?.arquivo, JSON.stringify(ponteiro?.cargas));
const bu = new Map();
const it = db.prepare(`SELECT uf, municipio, zona, secao, CASE tipo_voto WHEN 'branco' THEN 95 WHEN 'nulo' THEN 96 ELSE numero END AS n, SUM(quantidade) AS q
  FROM voto_bu WHERE turno = 2 AND cargo = 1 GROUP BY 1,2,3,4,5`).iterate();
for (const r of it) {
  const k = chave(r.uf, r.municipio, r.zona, r.secao);
  const o = bu.get(k) ?? new Map();
  o.set(r.n, (o.get(r.n) ?? 0) + r.q);
  bu.set(k, o);
}

// 3) Comparação completa
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
console.log('seções com BU de presidente:', bu.size, '| seções no CSV oficial:', oficial.size, '| união:', todas.size);
console.log('só no BU:', soBu, '| só no oficial:', soOf, '| seções divergentes:', secDiv, '| pares divergentes:', paresDiv);
const nums = [...new Set([...tot.bu.keys(), ...tot.of.keys()])].sort((a, b) => (tot.bu.get(b) ?? 0) - (tot.bu.get(a) ?? 0));
for (const n of nums) console.log(`  número ${n}: BU ${tot.bu.get(n) ?? 0} | oficial ${tot.of.get(n) ?? 0} | diferença ${(tot.bu.get(n) ?? 0) - (tot.of.get(n) ?? 0)}`);
if (ex.length) console.log(JSON.stringify(ex, null, 1));

// 4) Caso AC, Bujari (01007), zona 9, seção 3
const kc = chave('ac', '01007', '9', '3');
console.log('caso AC/01007/0009/0003 BU:', Object.fromEntries(bu.get(kc) ?? []), '| oficial:', Object.fromEntries(oficial.get(kc) ?? []));
console.log('caso RDV:', JSON.stringify(db.prepare(`SELECT tipo_voto, digitacao, SUM(quantidade) q FROM voto_rdv WHERE turno=2 AND cargo=1 AND uf='ac' AND municipio='01007' AND zona='0009' AND secao='0003' GROUP BY 1,2 ORDER BY q DESC`).all()));

// 5) Seções "Recebida" no aux.json (o campo status_aux só foi gravado para parte das seções)
const cob = db.prepare('SELECT uf, COUNT(*) n, SUM(status_aux IS NOT NULL) com_aux, SUM(status_aux = \'Recebida\') recebida FROM secao WHERE turno = 2 GROUP BY uf').all();
console.log('cobertura status_aux:', cob.filter((r) => r.com_aux).map((r) => `${r.uf} ${r.com_aux}/${r.n} rec=${r.recebida}`).join('; '));
const rec = db.prepare('SELECT uf, municipio, zona, secao, recebido_tse FROM secao WHERE turno = 2 AND status_aux = \'Recebida\'').all();
let recNoOf = 0; let recIg = 0; let minR = null; let maxR = null;
for (const r of rec) {
  const k = chave(r.uf, r.municipio, r.zona, r.secao);
  const b = bu.get(k); const o = oficial.get(k);
  if (o) recNoOf++;
  if (b && o && iguais(b, o)) recIg++;
  if (r.recebido_tse) { if (!minR || r.recebido_tse < minR) minR = r.recebido_tse; if (!maxR || r.recebido_tse > maxR) maxR = r.recebido_tse; }
}
console.log('Recebida:', rec.length, '| no oficial:', recNoOf, '| presidente igual ao BU:', recIg, '| recebido_tse de', minR, 'a', maxR);
