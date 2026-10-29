// Revisão cética do tópico 8 (itens 1 a 3): reprodução independente da regressão em seções limpas, bootstrap com
// gerador correto, modelos alternativos e poder (troca simulada injetada nos dados reais).
// Universo: todas as seções pareadas das 28 UFs (BU dos dois turnos), lidas de data/parsed/auditoria/cetico/t8-secoes.jsonl
// (gerado por cetico-t8-extrair.mjs). Uso: node --max-old-space-size=8192 scripts/auditoria/cetico-t8-regressao.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ARQ = fileURLToPath(new URL('../../data/parsed/auditoria/cetico/t8-secoes.jsonl', import.meta.url));
const L = readFileSync(ARQ, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function solve(A, b) {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}
function ols(rows, xf, yf) {
  const k = xf(rows[0]).length;
  const A = Array.from({ length: k }, () => new Array(k).fill(0));
  const b = new Array(k).fill(0);
  for (const r of rows) {
    const x = xf(r), y = yf(r);
    for (let i = 0; i < k; i++) {
      b[i] += x[i] * y;
      for (let j = 0; j < k; j++) A[i][j] += x[i] * x[j];
    }
  }
  return solve(A, b);
}
function boot(rows, fit, reps, seed) {
  const rnd = mulberry32(seed);
  const g = new Map();
  for (const r of rows) {
    const k = `${r.uf}/${r.mun}`;
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(r);
  }
  const G = [...g.values()];
  const out = [];
  for (let i = 0; i < reps; i++) {
    const s = [];
    for (let j = 0; j < G.length; j++) s.push(...G[Math.floor(rnd() * G.length)]);
    out.push(fit(s));
  }
  return out;
}
const q = (v, p) => [...v].sort((a, b) => a - b)[Math.floor(p * (v.length - 1))];
const f3 = (x) => (x >= 0 ? '+' : '') + x.toFixed(3);

// universo e seleção (mesma regra do autor): sem Sistema de Apuração, aptos > 0, |Δcomp| e |ΔBN| ≤ 1% dos aptos do 1T
const todos = L.filter((s) => s.a.tipo !== 3 && s.b.tipo !== 3 && s.a.aptos > 0);
const limpa = (s, tol = 0.01) => Math.abs(s.b.comp - s.a.comp) <= tol * s.a.aptos && Math.abs(s.b.bn - s.a.bn) <= tol * s.a.aptos;
const LIM = todos.filter((s) => limpa(s));
console.log(`pareadas ${L.length}; sem Sistema de Apuração ${todos.length} (excluídas ${L.length - todos.length}); limpas ${LIM.length} em ${new Set(LIM.map((s) => s.uf + s.mun)).size} municípios, ${new Set(LIM.map((s) => s.uf)).size} UFs`);
const X3 = (s) => [s.a.elim, s.a.f, s.a.l];
const dl = (s) => s.b.l - s.a.l;
const df = (s) => s.b.f - s.a.f;
const fitAll = (rows) => {
  const [a, b, c] = ols(rows, X3, dl);
  const [d, e, f] = ols(rows, X3, df);
  return { a, b, c, d, e, f };
};
const r0 = fitAll(LIM);
const B = boot(LIM, fitAll, 500, 7);
console.log('\n[1] Modelo do autor (Δ = a·E + b·F + c·L, sem intercepto); IC 95% por bootstrap de municípios (mulberry32, 500 réplicas)');
for (const k of 'abcdef') console.log(`  ${k} = ${f3(r0[k])}  [${f3(q(B.map((o) => o[k]), 0.025))}; ${f3(q(B.map((o) => o[k]), 0.975))}]`);
const T = LIM.reduce((o, s) => ({ E: o.E + s.a.elim, F: o.F + s.a.f, Lb: o.Lb + s.a.l, dl: o.dl + dl(s), df: o.df + df(s) }), { E: 0, F: 0, Lb: 0, dl: 0, df: 0 });
console.log(`  totais limpas: E ${T.E} F ${T.F} L ${T.Lb} Δ13 ${T.dl} Δ22 ${T.df}; parte do saldo com o 13 = ${((100 * T.dl) / (T.dl + T.df)).toFixed(1)}%`);
console.log(`  ganho do 13 atribuído: a·E ${(r0.a * T.E).toFixed(0)}  b·F ${(r0.b * T.F).toFixed(0)}  c·L ${(r0.c * T.Lb).toFixed(0)}`);
console.log(`  extrapolação nacional do termo b (base do 22): +${((r0.b * 56104503) / 1e6).toFixed(2)} mi / ${((r0.e * 56104503) / 1e6).toFixed(2)} mi → margem ${(((r0.b - r0.e) * 56104503) / 1e6).toFixed(2)} mi; com 2·b: ${((2 * r0.b * 56104503) / 1e6).toFixed(2)} mi`);
console.log(`  extrapolação nacional do termo c (base do 13): +${((r0.c * 53879538) / 1e6).toFixed(2)} mi / ${((r0.f * 53879538) / 1e6).toFixed(2)} mi → margem ${(((r0.c - r0.f) * 53879538) / 1e6).toFixed(2)} mi`);

// [2] modelos alternativos
const s13 = (s) => s.a.l / Math.max(1, s.a.l + s.a.f);
const X4 = (s) => [s.a.elim, s.a.f, s.a.l, s.a.elim * s13(s)];
const [a4, b4, c4, g4] = ols(LIM, X4, dl);
const [d4, e4, f4, h4] = ols(LIM, X4, df);
console.log(`\n[2] Com termo contextual E×fatia13 (eliminado se divide conforme a fatia local do 13):`);
console.log(`    Δ13: a ${f3(a4)} b ${f3(b4)} c ${f3(c4)} g ${f3(g4)} | Δ22: d ${f3(d4)} e ${f3(e4)} f ${f3(f4)} h ${f3(h4)}`);
const [a2, g2] = ols(LIM, (s) => [s.a.elim, s.a.elim * s13(s)], dl);
console.log(`    Só eliminados, divisão contextual: eliminado vai ${(100 * a2).toFixed(0)}% ao 13 onde a fatia do 13 é 0 e ${(100 * (a2 + g2)).toFixed(0)}% onde é 1`);
const LIMF = LIM.filter((s) => s.a.f >= 20);
const [ix, sx] = ols(LIMF, (s) => [1, s.a.elim / s.a.f].map((v) => v * Math.sqrt(s.a.f)), (s) => (df(s) / s.a.f) * Math.sqrt(s.a.f));
console.log(`    Razão com intercepto (F ≥ 20, peso F): Δ22/F = ${f3(ix)} + ${f3(sx)}·E/F   (intercepto = −troca uniforme por voto do 22)`);
const [ix2, sx2, tx2] = ols(LIMF, (s) => [1, s.a.elim / s.a.f, s.a.l / s.a.f].map((v) => v * Math.sqrt(s.a.f)), (s) => (df(s) / s.a.f) * Math.sqrt(s.a.f));
console.log(`    idem com L/F: Δ22/F = ${f3(ix2)} + ${f3(sx2)}·E/F + ${f3(tx2)}·L/F`);

// [3] por UF
console.log('\n[3] b (base do 22 → 13) e c (base do 13 → 13) por UF, modelo do autor (UFs com ≥ 200 seções limpas)');
const porUf = {};
for (const s of LIM) (porUf[s.uf] ??= []).push(s);
const bs = [];
for (const [uf, rows] of Object.entries(porUf)) {
  if (rows.length < 200) { console.log(`  ${uf}: ${rows.length} seções limpas (fora)`); continue; }
  const r = fitAll(rows);
  bs.push([uf, r.b, r.c, rows.length]);
}
console.log('  ' + bs.sort((x, y) => x[1] - y[1]).map(([u, b, c, n]) => `${u}(${n}) b ${f3(b)} c ${f3(c)}`).join('; '));

// [4] poder: troca injetada nos dados reais; a seleção de limpas não muda (troca não mexe em comparecimento nem em BN)
console.log('\n[4] Poder: troca simulada no 2º turno, aplicada às seções limpas, estimada pelo modelo do autor');
const inj = (fn) => LIM.map((s) => {
  const m = Math.max(0, Math.min(s.b.f, Math.round(fn(s))));
  return { ...s, b: { ...s.b, l: s.b.l + m, f: s.b.f - m } };
});
const cen = [
  ['uniforme 1% dos votos do 22', (s) => 0.01 * s.b.f],
  ['uniforme 3,7% dos votos do 22 (vira o resultado)', (s) => 0.037 * s.b.f],
  ['3,7% do 22 só onde o 13 teve ≥ 50% no 1T', (s) => (s13(s) >= 0.5 ? 0.037 * s.b.f : 0)],
  ['4% dos votos do 13 (tirados do 22)', (s) => 0.04 * s.b.l],
  ['20% dos votos de eliminados (tirados do 22)', (s) => 0.2 * s.a.elim],
];
for (const [n, fn] of cen) {
  const rows = inj(fn);
  const r = fitAll(rows);
  const mov = rows.reduce((a, s, i) => a + (s.b.l - LIM[i].b.l), 0);
  console.log(`  ${n.padEnd(50)} movidos ${String(mov).padStart(7)} (${((100 * mov) / LIM.reduce((a, s) => a + s.b.f, 0)).toFixed(2)}% do 22) | Δa ${f3(r.a - r0.a)} Δb ${f3(r.b - r0.b)} Δc ${f3(r.c - r0.c)}`);
}

// [5] teste direto sem regressão (autor: teste-desvio-uniforme.mjs), estendido
console.log('\n[5] Seções limpas (|Δ| ≤ 0,5% dos aptos), ≥ 50 votantes, por parcela de eliminados no 1T');
const L5 = todos.filter((s) => limpa(s, 0.005) && s.a.comp >= 50);
const soma = (g) => g.reduce((o, s) => ({ n: o.n + 1, E: o.E + s.a.elim, F: o.F + s.a.f, Lb: o.Lb + s.a.l, dl: o.dl + dl(s), df: o.df + df(s), perdeuF: o.perdeuF + (df(s) < 0), perdeuL: o.perdeuL + (dl(s) < 0) }), { n: 0, E: 0, F: 0, Lb: 0, dl: 0, df: 0, perdeuF: 0, perdeuL: 0 });
for (const [lo, hi] of [[0, 0.01], [0.01, 0.02], [0.02, 0.04], [0.04, 0.06], [0.06, 0.1], [0.1, 1.01]]) {
  const t = soma(L5.filter((s) => { const p = s.a.elim / s.a.comp; return p >= lo && p < hi; }));
  console.log(`  elim ${(100 * lo).toFixed(0)}–${(100 * hi).toFixed(0)}%: ${String(t.n).padStart(6)} seções; E ${t.E} F ${t.F} L ${t.Lb}; Δ22 ${t.df} (${((100 * t.df) / t.F).toFixed(2)}% do 22), Δ13 ${t.dl} (${((100 * t.dl) / t.Lb).toFixed(2)}% do 13); 13 ficou com ${((100 * t.dl) / (t.dl + t.df)).toFixed(1)}% do saldo; 22 perdeu em ${((100 * t.perdeuF) / t.n).toFixed(0)}% das seções, 13 em ${((100 * t.perdeuL) / t.n).toFixed(0)}%`);
}
console.log('  por quem dominava a seção no 1T (eliminados < 4%):');
for (const [n, lo, hi] of [['13 ≥ 70%', 0.7, 1.01], ['30–70%', 0.3, 0.7], ['13 < 30%', 0, 0.3]]) {
  const t = soma(L5.filter((s) => s.a.elim / s.a.comp < 0.04 && s.a.l + s.a.f > 0 && s13(s) >= lo && s13(s) < hi));
  console.log(`   ${n.padEnd(9)} ${String(t.n).padStart(5)} seções; E ${t.E} L ${t.Lb} F ${t.F}; Δ13 ${t.dl} (${((100 * t.dl) / t.Lb).toFixed(2)}%) Δ22 ${t.df} (${((100 * t.df) / t.F).toFixed(2)}%); Δ13 − E = ${t.dl - t.E}`);
}
