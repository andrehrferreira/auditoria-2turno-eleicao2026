// Cético, parecer 44: testes de teto sem mortes por município com as janelas de idade ESTRITAS (idade na eleição para
// qualquer data de referência de agosto a dezembro do ano da eleição; Censo em 31/07). O demógrafo (doc 10) usou janelas
// um ano mais estreitas (87–91, 92+, 88+, 91–95, 96+), que deixam de fora parte de uma geração e baixam o teto.
// Lê data/parsed/auditoria/cetico-revisor/44-brasil.json e o Censo 2010 municipal (tabela 1378, 85–99 e 100+).
// Uso: node scripts/auditoria/cetico-44-municipios.mjs   Saída: data/parsed/auditoria/cetico-revisor/44-municipios.json
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const DIR = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico-revisor');
const IBGE = path.join(RAIZ, 'data', 'raw', 'externos', 'ibge');
const ler = (f) => JSON.parse(readFileSync(f, 'utf8'));
const BR = ler(path.join(DIR, '44-brasil.json')).anos;
const mun = {}; // ano → 'UF|mun' → {fx: aptos}
for (const a of ['2014', '2018', '2022']) {
  const o = (mun[a] = {});
  for (const [k, [ap]] of Object.entries(BR[a].zonaFaixa)) { const [t, u, m, , fx] = k.split('|'); if (t !== '1' || u === 'ZZ') continue; const x = (o[`${u}|${m}`] ??= {}); x[fx] = (x[fx] ?? 0) + ap; }
}
const { db } = await abrirLeitura();
const MUN = new Map(db.prepare('SELECT codigo, uf, codigo_ibge, nome FROM municipio').all().map((r) => [`${r.uf.toUpperCase()}|${Number(r.codigo)}`, r]));
const c10 = new Map();
const idade = (c) => (c >= 6613 && c <= 6652 ? c - 6613 + 60 : c === 6653 ? 100 : null);
for (const f of ['censo2010-1378-mun-85-92.json', 'censo2010-1378-mun-93-100.json']) for (const r of ler(path.join(IBGE, f)).slice(1)) {
  (c10.get(r.D1C) ?? c10.set(r.D1C, new Map()).get(r.D1C)).set(idade(Number(r.D6C)), Number(r.V) || 0);
}
const s = (m, a0, a1) => { let t = 0; for (let a = a0; a <= a1; a++) t += m.get(a) ?? 0; return t; };
const TESTES = [
  ['2014 95–99 > Censo 2010 90–95 (estrito) | demógrafo 91–95', '2014', '9599', 90, 95, 91, 95],
  ['2014 100+ > Censo 2010 95+ (estrito) | demógrafo 96+', '2014', '9999', 95, 100, 96, 100],
  ['2018 95–99 > Censo 2010 86–91 (estrito) | demógrafo 87–91', '2018', '9599', 86, 91, 87, 91],
  ['2018 100+ > Censo 2010 91+ (estrito) | demógrafo 92+', '2018', '9999', 91, 100, 92, 100],
  ['2022 100+ > Censo 2010 87+ (estrito) | demógrafo 88+', '2022', '9999', 87, 100, 88, 100],
];
const R = { semIbge: 0, sem2010: 0, testes: {} };
for (const [nome, Y, fx, a0, a1, d0, d1] of TESTES) {
  const est = []; const dem = [];
  for (const [k, v] of Object.entries(mun[Y])) {
    const ib = MUN.get(k)?.codigo_ibge; const m = ib ? c10.get(String(ib)) : null; if (!m) continue;
    const ap = v[fx] ?? 0; const te = s(m, a0, a1); const td = s(m, d0, d1);
    if (ap > te) est.push({ municipio: `${MUN.get(k).nome}/${k.split('|')[0]}`, aptos: ap, teto: te, excesso: ap - te });
    if (ap > td) dem.push(ap - td);
  }
  est.sort((x, y) => y.excesso - x.excesso);
  R.testes[nome] = { estrito: { municipios: est.length, excessoSomado: est.reduce((t, x) => t + x.excesso, 0), maiores: est.slice(0, 6) }, janelaDoDemografo: { municipios: dem.length, excessoSomado: dem.reduce((t, x) => t + x, 0) } };
}
for (const k of new Set(['2014', '2018', '2022'].flatMap((Y) => Object.keys(mun[Y])))) { const ib = MUN.get(k)?.codigo_ibge; if (!ib) R.semIbge++; else if (!c10.get(String(ib))) R.sem2010++; }
writeFileSync(path.join(DIR, '44-municipios.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
