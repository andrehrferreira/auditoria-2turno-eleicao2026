// Cético revisor, parecer 28: o "lote das 19:03" (achado exploratório do doc 06 da linha do tempo). As UFs com mais 22
// foram totalizadas antes dentro do lote (Spearman −0,41, p = 0,037). Isto é do 2º turno ou é a ordem de sempre do
// sistema? Linha de base: o primeiro lote do 1º turno (as primeiras 5.651 seções recebidas a partir das 17:00 de
// Brasília, mesmo tamanho) e o primeiro minuto com recebimento do 1º turno. Mede também se a ordem das UFs dentro do
// lote se repete entre os turnos.
// Uso: node scripts/auditoria/cetico-chegada-bu-lote.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';

const linhas = (await readFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'chegada-bu', 'secoes.csv'), 'utf8')).split('\n');
const cab = linhas[0].split(',');
const ci = Object.fromEntries(cab.map((c, k) => [c, k]));
const DIA2 = Date.UTC(2026, 9, 25), DIA1 = Date.UTC(2026, 9, 4);
const seg = (s, dia) => (s ? (Date.parse(`${s.replace(' ', 'T')}Z`) - dia) / 1000 : NaN);
const S = [];
for (const l of linhas.slice(1)) {
  if (!l) continue;
  const c = l.split(',');
  if (c[ci.uf] === 'zz') continue;
  S.push({ uf: c[ci.uf], rec: seg(c[ci.receb_br], DIA2), tot: seg(c[ci.tot_br], DIA2), v13: +c[ci.v13] || 0, v22: +c[ci.v22] || 0,
    rec1: seg(c[ci.receb1_br], DIA1), tot1: seg(c[ci.tot1_br], DIA1), v13a: +c[ci.v13_1] || 0, v22a: +c[ci.v22_1] || 0 });
}
const H = (h, m = 0, s = 0) => h * 3600 + m * 60 + s;
const rk = (v) => { const o = v.map((x, k) => [x, k]).sort((p, q) => p[0] - q[0]); const r = new Float64Array(v.length); for (let k = 0, j; k < o.length; k = j) { j = k; while (j < o.length && o[j][0] === o[k][0]) j++; for (let q = k; q < j; q++) r[o[q][1]] = (k + j - 1) / 2; } return r; };
const spear = (a, b) => { const ra = rk(a), rb = rk(b), n = a.length; const ma = ra.reduce((x, y) => x + y, 0) / n, mb = rb.reduce((x, y) => x + y, 0) / n; let sab = 0, saa = 0, sbb = 0; for (let k = 0; k < n; k++) { sab += (ra[k] - ma) * (rb[k] - mb); saa += (ra[k] - ma) ** 2; sbb += (rb[k] - mb) ** 2; } return sab / Math.sqrt(saa * sbb); };
let st = 2828;
const rnd = () => { st = (st + 0x6d2b79f5) | 0; let t = Math.imul(st ^ (st >>> 15), 1 | st); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const perm = (x, y, P = 20000) => { const r0 = spear(x, y); let c = 0; const yy = y.slice(); for (let r = 0; r < P; r++) { for (let a = yy.length - 1; a > 0; a--) { const j = Math.floor(rnd() * (a + 1)); [yy[a], yy[j]] = [yy[j], yy[a]]; } if (Math.abs(spear(x, yy)) >= Math.abs(r0)) c++; } return { rho: Math.round(r0 * 1e4) / 1e4, p: Math.round(((c + 1) / (P + 1)) * 1e4) / 1e4, ufs: x.length }; };
const med = (a) => { const b = a.slice().sort((p, q) => p - q); return b[Math.floor(b.length / 2)]; };
const hh = (s) => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function lote(sel, tk, a13, a22, rotulo) {
  const porUf = new Map();
  for (const s of sel) { const u = porUf.get(s.uf) ?? { n: 0, a: 0, b: 0, t: [] }; u.n++; u.a += s[a13]; u.b += s[a22]; u.t.push(s[tk]); porUf.set(s.uf, u); }
  const l = [...porUf].map(([uf, u]) => ({ uf, n: u.n, p22: u.b / (u.a + u.b), tMed: med(u.t) })).sort((a, b) => a.tMed - b.tMed);
  const comMin = (k) => l.filter((x) => x.n >= k);
  return { rotulo, secoes: sel.length, totalizadoDe: hh(Math.min(...sel.map((s) => s[tk]))), ate: hh(Math.max(...sel.map((s) => s[tk]))),
    horaMediana_x_p22: perm(l.map((x) => x.tMed), l.map((x) => x.p22)),
    horaMediana_x_p22_ufsCom20ouMais: perm(comMin(20).map((x) => x.tMed), comMin(20).map((x) => x.p22)),
    horaMediana_x_tamanhoNoLote: perm(l.map((x) => x.tMed), l.map((x) => x.n)),
    ordem: l.map((x) => `${x.uf}(${x.n})`).join(' '), _l: l };
}
const l2 = lote(S.filter((s) => s.rec >= H(19, 3) && s.rec < H(19, 4) && s.v13 + s.v22 > 0), 'tot', 'v13', 'v22', '2T: recebidas 19:03:37–19:03:56');
const prim1 = S.filter((s) => s.rec1 >= H(17) && s.v13a + s.v22a > 0).sort((a, b) => a.rec1 - b.rec1 || a.tot1 - b.tot1);
const l1a = lote(prim1.slice(0, l2.secoes), 'tot1', 'v13a', 'v22a', `1T: primeiras ${l2.secoes} recebidas`);
const m1 = Math.floor(prim1[0].rec1 / 60);
const l1b = lote(prim1.filter((s) => Math.floor(s.rec1 / 60) === m1), 'tot1', 'v13a', 'v22a', `1T: primeiro minuto com recebimento (${hh(m1 * 60)})`);
// a ordem das UFs dentro do lote se repete entre os turnos?
const comum = l2._l.filter((x) => l1a._l.some((y) => y.uf === x.uf));
const ordemEntreTurnos = perm(comum.map((x) => x.tMed), comum.map((x) => l1a._l.find((y) => y.uf === x.uf).tMed));
// e se, no lote do 2º turno, eu usar a parcela do 22 do 1º turno da UF (o que já se sabia antes do 2º turno)?
const p22a = new Map(); for (const s of S) { const u = p22a.get(s.uf) ?? { a: 0, b: 0 }; u.a += s.v13a; u.b += s.v22a; p22a.set(s.uf, u); }
const lote2_x_p22do1T = perm(l2._l.map((x) => x.tMed), l2._l.map((x) => p22a.get(x.uf).b / (p22a.get(x.uf).a + p22a.get(x.uf).b)));
for (const x of [l2, l1a, l1b]) delete x._l;
const out = { comando: 'node scripts/auditoria/cetico-chegada-bu-lote.mjs', lote2T: l2, lote1T_mesmoTamanho: l1a, lote1T_primeiroMinuto: l1b, ordemUfNoLote_2T_x_1T: ordemEntreTurnos, lote2T_x_p22do1TdaUF: lote2_x_p22do1T };
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor');
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, '28-chegada-bu-lote.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
