import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

// Parecer cético 38 (H27), parte 3: os votos das seções cuja correspondência só chegou ao TSE no dia da votação
// (45: 17 no 1º turno, 28 no 2º) e as 12 cujo par urna × carga só aparece no CEFT, recebido antes do dia, sem estar na
// CESP da véspera (2 no 1º turno, do MA; 10 no 2º: 5 de SE, 2 do MA, 2 de MG, 1 de MT) destoam do outro turno e das vizinhas?
// Para TODAS as seções com pacote de urna nos dois turnos (sem Sistema de Apuração), calcula:
//   p13 = votos do 13 / (votos do 13 + votos do 22), Presidente, resultado oficial, cada turno;
//   desvio = p13 da seção − p13 das OUTRAS seções do mesmo local de votação (mesmo turno);
//   virada = (p13 2º − p13 1º) da seção − (o mesmo para as outras seções do local);
//   comparecimento = comparecimento/aptos da seção − o das outras seções do local.
// A linha de base é a distribuição dessas medidas em todas as seções de locais com 3 ou mais seções. Cada caso recebe
// o percentil do valor absoluto. Só leitura.
// Saída: data/parsed/auditoria/cetico-revisor/38/votos.json
// Uso: node --max-old-space-size=4000 scripts/auditoria/cetico-38-votos.mjs

const DIR = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '38');
const { db } = await abrirLeitura();
const S = new Map(); // k -> {local, t: {1: {v13, v22, comp, aptos}, 2: ...}}
for (const r of db.prepare(`SELECT turno, uf, municipio, zona, secao, local, tipo_arquivo, comparecimento FROM secao WHERE situacao = 'completa'`).iterate()) {
  const k = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
  const s = S.get(k) ?? S.set(k, { local: `${r.uf}/${r.municipio}/${r.zona}/${r.local}`, sa: false, t: {} }).get(k);
  if (/^sa/.test(r.tipo_arquivo)) s.sa = true;
  s.t[r.turno] = { v13: 0, v22: 0, comp: r.comparecimento, aptos: 0 };
}
for (const r of db.prepare(`SELECT turno, uf, municipio, zona, secao, numero, quantidade FROM voto_oficial WHERE cargo = 1 AND numero IN (13, 22)`).iterate()) {
  const x = S.get(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`)?.t[r.turno];
  if (x) x[`v${r.numero}`] = r.quantidade;
}
for (const r of db.prepare(`SELECT turno, uf, municipio, zona, secao, aptos FROM secao_eleicao WHERE eleicao IN (6257, 6258)`).iterate()) {
  const x = S.get(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`)?.t[r.turno];
  if (x) x.aptos = r.aptos;
}
const L = new Map();
for (const [k, s] of S) {
  if (s.sa || !s.t[1] || !s.t[2]) continue;
  const l = L.get(s.local) ?? L.set(s.local, { n: 0, t: { 1: { v13: 0, v22: 0, comp: 0, aptos: 0 }, 2: { v13: 0, v22: 0, comp: 0, aptos: 0 } } }).get(s.local);
  l.n++;
  for (const t of [1, 2]) for (const c of ['v13', 'v22', 'comp', 'aptos']) l.t[t][c] += s.t[t][c];
}
const p = (x) => (x.v13 + x.v22 ? x.v13 / (x.v13 + x.v22) : null);
const menos = (a, b) => ({ v13: a.v13 - b.v13, v22: a.v22 - b.v22, comp: a.comp - b.comp, aptos: a.aptos - b.aptos });
function medidas(k) {
  const s = S.get(k);
  if (!s || s.sa || !s.t[1] || !s.t[2]) return null;
  const l = L.get(s.local);
  if (!l || l.n < 3) return null;
  const o1 = menos(l.t[1], s.t[1]);
  const o2 = menos(l.t[2], s.t[2]);
  const d = {};
  for (const t of [1, 2]) {
    const st = s.t[t]; const ot = t === 1 ? o1 : o2;
    d[`p13_${t}t`] = p(st); d[`p13Local_${t}t`] = p(ot);
    d[`desvio_${t}t`] = p(st) - p(ot);
    d[`comp_${t}t`] = st.comp / st.aptos; d[`compLocal_${t}t`] = ot.comp / ot.aptos;
    d[`desvioComp_${t}t`] = st.comp / st.aptos - ot.comp / ot.aptos;
  }
  d.virada = (p(s.t[2]) - p(s.t[1])) - (p(o2) - p(o1));
  d.secoesNoLocal = l.n;
  return d;
}
const base = { desvio_1t: [], desvio_2t: [], virada: [], desvioComp_1t: [], desvioComp_2t: [] };
for (const k of S.keys()) {
  const d = medidas(k);
  if (!d) continue;
  for (const c of Object.keys(base)) if (Number.isFinite(d[c])) base[c].push(Math.abs(d[c]));
}
for (const c of Object.keys(base)) base[c].sort((a, b) => a - b);
const pct = (c, v) => { const a = base[c]; let lo = 0; let hi = a.length; while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] < Math.abs(v)) lo = m + 1; else hi = m; } return +(100 * lo / a.length).toFixed(1); };

const casos = [];
for (const t of [1, 2]) {
  const R = JSON.parse(await readFile(path.join(DIR, `correspondencias-${t}t.json`), 'utf8'));
  for (const x of R.foraDaVespera.filter((y) => y.classe.startsWith('soCeft:noDia') || y.classe.startsWith('soCeft:antes|vespera=null'))) {
    const d = medidas(x.k);
    const s = S.get(x.k);
    const item = { turno: t, k: x.k, semCespAlguma: /vespera=null\|dia=null/.test(x.classe), votos: { 1: s.t[1], 2: s.t[2] } };
    if (d) {
      Object.assign(item, Object.fromEntries(Object.entries(d).map(([a, b]) => [a, typeof b === 'number' && !Number.isInteger(b) ? +b.toFixed(4) : b])));
      item.percentil = { desvio_1t: pct('desvio_1t', d.desvio_1t), desvio_2t: pct('desvio_2t', d.desvio_2t), virada: pct('virada', d.virada), desvioComp_1t: pct('desvioComp_1t', d.desvioComp_1t), desvioComp_2t: pct('desvioComp_2t', d.desvioComp_2t) };
    } else item.semLinhaDeBase = 'local com menos de 3 seções';
    casos.push(item);
  }
}
const resumo = { secoesNaLinhaDeBase: base.virada.length, casos: casos.length, semLinhaDeBase: casos.filter((c) => !c.percentil).length, acimaP99: {}, acimaP95: {} };
for (const c of casos.filter((x) => x.percentil)) for (const [m, v] of Object.entries(c.percentil)) { if (v >= 99) resumo.acimaP99[m] = (resumo.acimaP99[m] ?? 0) + 1; if (v >= 95) resumo.acimaP95[m] = (resumo.acimaP95[m] ?? 0) + 1; }
resumo.p95 = Object.fromEntries(Object.entries(base).map(([c, a]) => [c, +a[Math.floor(a.length * 0.95)].toFixed(4)]));
resumo.p99 = Object.fromEntries(Object.entries(base).map(([c, a]) => [c, +a[Math.floor(a.length * 0.99)].toFixed(4)]));
await writeFile(path.join(DIR, 'votos.json'), JSON.stringify({ resumo, casos }, null, 1));
console.log(JSON.stringify(resumo, null, 1));
for (const c of casos) console.log(c.turno + 't', c.k, c.semCespAlguma ? 'SEM-CESP' : '', c.percentil ? `p13 ${c.p13_1t}/${c.p13_2t} local ${c.p13Local_1t}/${c.p13Local_2t} comp ${c.comp_2t} local ${c.compLocal_2t} | pct desv1 ${c.percentil.desvio_1t} desv2 ${c.percentil.desvio_2t} virada ${c.percentil.virada} comp1 ${c.percentil.desvioComp_1t} comp2 ${c.percentil.desvioComp_2t} (n=${c.secoesNoLocal})` : c.semLinhaDeBase);
