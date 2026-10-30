// Auditor A (contagem), teste 1: BU × votacao_secao (dados abertos do TSE) para Presidente, seção a seção e votável a
// votável, lendo o CSV direto do zip (não depende de `voto_oficial` estar carregado no banco). Serve para o 1º turno,
// cujo oficial por seção ainda não está no banco. Só as UFs já carregadas no banco para o turno (tabela `carga`).
// Uso: node scripts/auditoria/contagem-secao-presidente.mjs --turno 1 [--uf ac,df]
// Saída: resumo no terminal e divergências em data/parsed/auditoria/contagem/secao-presidente-<t>t-divergencias.csv
import { mkdirSync, writeFileSync } from 'node:fs';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { parseArgs } from 'node:util';
import { ZIPS, entradasZip, linhasCsv } from './contagem-zip.mjs';

const { values: args } = parseArgs({ options: { turno: { type: 'string', default: '1' }, uf: { type: 'string' } } });
const turno = Number(args.turno);
const { db, fonte } = await abrirLeitura();
console.error(`banco: ${fonte}`);
const carregadas = db.prepare('SELECT uf FROM carga WHERE turno = ? ORDER BY uf').all(turno).map((r) => r.uf);
const ufs = new Set(args.uf ? args.uf.split(',').filter((u) => carregadas.includes(u)) : carregadas);
const pad = (v, n) => String(Number(v)).padStart(n, '0');

const qBu = db.prepare(`SELECT municipio, zona, secao, CASE tipo_voto WHEN 'branco' THEN 95 WHEN 'nulo' THEN 96 ELSE numero END AS numero,
  SUM(quantidade) AS q FROM voto_bu WHERE turno = ? AND uf = ? AND cargo = 1 GROUP BY 1, 2, 3, 4`);
const bu = new Map();
const secoesBu = new Set();
for (const uf of ufs) {
  for (const r of qBu.all(turno, uf)) {
    bu.set(`${uf}|${r.municipio}|${r.zona}|${r.secao}|${r.numero}`, r.q);
    secoesBu.add(`${uf}|${r.municipio}|${r.zona}|${r.secao}`);
  }
}
console.error(`banco: ${ufs.size} UFs (${[...ufs].join(',')}), ${secoesBu.size} seções com BU de presidente`);

const oficial = new Map();
const secoesOf = new Set();
let dataGeracao = null;
const e = (await entradasZip(ZIPS.votacaoSecao)).find((x) => x.nome.endsWith('.csv'));
for await (const o of linhasCsv(ZIPS.votacaoSecao, e)) {
  if (Number(o.NR_TURNO) !== turno || o.CD_CARGO !== '1') continue;
  const uf = o.SG_UF.toLowerCase();
  if (!ufs.has(uf)) continue;
  dataGeracao ??= `${o.DT_GERACAO} ${o.HH_GERACAO}`;
  const s = `${uf}|${pad(o.CD_MUNICIPIO, 5)}|${pad(o.NR_ZONA, 4)}|${pad(o.NR_SECAO, 4)}`;
  secoesOf.add(s);
  const k = `${s}|${Number(o.NR_VOTAVEL)}`;
  oficial.set(k, (oficial.get(k) ?? 0) + Number(o.QT_VOTOS));
}

const totais = new Map();
const divergencias = [];
for (const k of new Set([...bu.keys(), ...oficial.keys()])) {
  const numero = Number(k.split('|')[4]);
  const b = bu.get(k) ?? 0;
  const o = oficial.get(k) ?? 0;
  const t = totais.get(numero) ?? { bu: 0, oficial: 0 };
  t.bu += b; t.oficial += o; totais.set(numero, t);
  if (b !== o) { const [uf, municipio, zona, secao] = k.split('|'); divergencias.push({ uf, municipio, zona, secao, numero, bu: b, oficial: o }); }
}
const soBu = [...secoesBu].filter((s) => !secoesOf.has(s));
const soOf = [...secoesOf].filter((s) => !secoesBu.has(s));

console.log(`\nPresidente, ${turno}º turno: BU × votacao_secao (CSV gerado em ${dataGeracao}), UFs: ${[...ufs].join(',')}`);
console.log(`Seções com BU: ${secoesBu.size} · no oficial: ${secoesOf.size} · só no BU: ${soBu.length} · só no oficial: ${soOf.length}`);
for (const [n, t] of [...totais].sort((a, b) => b[1].bu - a[1].bu)) {
  const nome = n === 95 ? 'BRANCO' : n === 96 ? 'NULO' : `nº ${n}`;
  console.log(`  ${nome.padEnd(8)} BU ${String(t.bu).padStart(11)}  oficial ${String(t.oficial).padStart(11)}  dif ${t.oficial - t.bu}`);
}
console.log(`Divergências (seção×votável): ${divergencias.length} em ${new Set(divergencias.map((d) => `${d.uf}${d.municipio}${d.zona}${d.secao}`)).size} seções`);
for (const d of divergencias.slice(0, 20)) console.log(' ', d);
for (const s of [...soBu.slice(0, 10), ...soOf.slice(0, 10)]) console.log('  seção só de um lado:', s);

const dir = 'data/parsed/auditoria/contagem';
mkdirSync(dir, { recursive: true });
const sufixo = args.uf ? `-${[...ufs].join('_')}` : '';
writeFileSync(`${dir}/secao-presidente-${turno}t${sufixo}-divergencias.csv`,
  ['uf;municipio;zona;secao;numero;bu;oficial', ...divergencias.map((d) => Object.values(d).join(';'))].join('\n') + '\n');
