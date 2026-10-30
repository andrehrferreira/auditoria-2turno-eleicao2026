// Cético, parecer 32 (H16): reprodução própria da busca por boletim inteiro repetido entre seções (1º turno).
// Lê voto_bu do banco (cópia de leitura) em ordem de seção e, por seção completa, monta o texto canônico de cada
// cargo e do boletim inteiro (todos os cargos e eleições). Estrato = UF × conjunto de cargos × votos de presidente
// (como o matemático). Conta: pares no estrato, pares iguais no boletim inteiro, pares iguais por cargo, pares iguais
// no país sem estrato, e pares iguais em presidente+governador juntos (quanto a coincidência cai ao juntar cargos).
// Uso: node scripts/auditoria/cetico-h16-vetores.mjs [--turno 1]
// Saída: data/parsed/auditoria/cetico/h16/vetores-<t>t.json
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS, UFS } from '../../src/config.js';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '1' } } });
const turno = Number(values.turno);
const { db } = await abrirLeitura();
const md5 = (x) => createHash('md5').update(x).digest('hex');
const C2 = (k) => (k * (k - 1)) / 2;
const faixa = (n) => (n === 0 ? '0' : n <= 10 ? '1-10' : n <= 20 ? '11-20' : n <= 50 ? '21-50' : n <= 100 ? '51-100' : '101+');

const estratos = new Map(); // estrato → { n, secoes, total: Map, porCargo: Map(cargo → Map), pg: Map }
const global = new Map();
let secoes = 0;
let semVoto = 0;
const t0 = Date.now();

function processar(uf, s) {
  secoes++;
  const cargos = [...s.keys()].sort();
  const hc = new Map(cargos.map((c) => [c, md5(s.get(c).sort().join('|'))]));
  let n = 0;
  for (const [c, l] of s) if (c.endsWith(':1')) for (const v of l) n += Number(v.split(':')[2]);
  if (n === 0) { semVoto++; return; }
  const total = md5(cargos.map((c) => `${c}=${hc.get(c)}`).join(';'));
  global.set(total, (global.get(total) ?? 0) + 1);
  const g = `${uf}|${cargos.map((c) => c.split(':')[1]).join(',')}|${n}`;
  let e = estratos.get(g);
  if (!e) estratos.set(g, (e = { n, secoes: 0, total: new Map(), porCargo: new Map(), pg: new Map() }));
  e.secoes++;
  e.total.set(total, (e.total.get(total) ?? 0) + 1);
  for (const [c, h] of hc) {
    const cargo = c.split(':')[1];
    if (!e.porCargo.has(cargo)) e.porCargo.set(cargo, new Map());
    const m = e.porCargo.get(cargo);
    m.set(h, (m.get(h) ?? 0) + 1);
  }
  const pick = (suf) => [...hc].filter(([c]) => c.endsWith(suf)).map(([, h]) => h).join();
  const pg = `${pick(':1')}|${pick(':3')}`;
  e.pg.set(pg, (e.pg.get(pg) ?? 0) + 1);
}

for (const uf of UFS) {
  const completas = new Set(db.prepare("select municipio || '/' || zona || '/' || secao k from secao where turno = ? and uf = ? and situacao = 'completa'").all(turno, uf).map((r) => r.k));
  let atual = null;
  let s = null;
  for (const r of db.prepare('select municipio, zona, secao, eleicao, cargo, tipo_voto, numero, quantidade from voto_bu where turno = ? and uf = ? order by municipio, zona, secao').iterate(turno, uf)) {
    const k = `${r.municipio}/${r.zona}/${r.secao}`;
    if (k !== atual) { if (s && completas.has(atual)) processar(uf, s); atual = k; s = new Map(); }
    const c = `${r.eleicao}:${r.cargo}`;
    if (!s.has(c)) s.set(c, []);
    s.get(c).push(`${r.tipo_voto}:${r.tipo_voto === 'nominal' || r.tipo_voto === 'legenda' ? r.numero : ''}:${r.quantidade}`);
  }
  if (s && completas.has(atual)) processar(uf, s);
  console.log(`${uf}: ${secoes} seções acumuladas (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}

const porFaixa = {};
const soma = (m) => [...m.values()].reduce((a, k) => a + C2(k), 0);
for (const e of estratos.values()) {
  const f = (porFaixa[faixa(e.n)] ??= { secoes: 0, pares: 0, iguaisTotal: 0, iguaisPresGov: 0, iguaisPorCargo: {} });
  f.secoes += e.secoes;
  f.pares += C2(e.secoes);
  f.iguaisTotal += soma(e.total);
  f.iguaisPresGov += soma(e.pg);
  for (const [c, m] of e.porCargo) f.iguaisPorCargo[c] = (f.iguaisPorCargo[c] ?? 0) + soma(m);
}
const tot = { secoes: 0, pares: 0, iguaisTotal: 0, iguaisPresGov: 0, iguaisPorCargo: {} };
for (const f of Object.values(porFaixa)) {
  tot.secoes += f.secoes; tot.pares += f.pares; tot.iguaisTotal += f.iguaisTotal; tot.iguaisPresGov += f.iguaisPresGov;
  for (const [c, n] of Object.entries(f.iguaisPorCargo)) tot.iguaisPorCargo[c] = (tot.iguaisPorCargo[c] ?? 0) + n;
}
const res = { turno, secoesCompletasComLinhaNoBu: secoes, semVotoDePresidente: semVoto, estratos: estratos.size, total: tot, porFaixa,
  paresIguaisNoPaisSemEstrato: soma(global), segundos: Math.round((Date.now() - t0) / 1000) };
const dest = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'h16');
await mkdir(dest, { recursive: true });
await writeFile(path.join(dest, `vetores-${turno}t.json`), `${JSON.stringify(res, null, 1)}\n`);
console.log(JSON.stringify(res, null, 1));
