// Cético, parecer 58: funções próprias (não importa estatistico-h14-h19-final-lib.mjs nem estatistico-h19-lib.mjs).
//   - leitura de CSV (; e .gz);
//   - MQP com UM efeito fixo (centragem ponderada dentro do grupo) e erro agrupado CR1 (Stata: G/(G−1)·(N−1)/(N−K));
//   - normal (Φ por erf de Abramowitz-Stegun 7.1.26 refinada por série), quantil por bisseção.
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';

export async function csv(arq, sep = ';') {
  let b = await readFile(arq);
  if (arq.endsWith('.gz')) b = gunzipSync(b);
  const ls = b.toString('utf8').split(/\r?\n/).filter((l) => l.length);
  const cab = ls[0].split(sep);
  return ls.slice(1).map((l) => { const c = l.split(sep); const o = {}; for (let i = 0; i < cab.length; i++) o[cab[i]] = c[i]; return o; });
}
export const n = (x) => (x === undefined || x === null || x === '' ? NaN : Number(x));

// Φ(z) por integração de Simpson da densidade (precisão ~1e-12 para |z| < 9), sem tabelas copiadas de terceiros
export function Phi(z) {
  if (z < -9) return 0; if (z > 9) return 1;
  const a = 0, b = Math.abs(z), m = 2000, h = (b - a) / m;
  let s = 0;
  for (let i = 0; i <= m; i++) { const x = a + i * h; const f = Math.exp(-x * x / 2); s += (i === 0 || i === m ? 1 : i % 2 ? 4 : 2) * f; }
  const area = (s * h) / 3 / Math.sqrt(2 * Math.PI);
  return z >= 0 ? 0.5 + area : 0.5 - area;
}
export const p2 = (z) => 2 * (1 - Phi(Math.abs(z)));
export function zQuantil(p) { let lo = -9, hi = 9; for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (Phi(m) < p) lo = m; else hi = m; } return (lo + hi) / 2; }
export const zBonf = (k, alfa = 0.05) => zQuantil(1 - alfa / (2 * k));

/** Resolve A x = b (A simétrica positiva) por Gauss com pivô; devolve inversa. null se singular. */
function inversa(A) {
  const k = A.length, M = A.map((l, i) => [...l, ...Array.from({ length: k }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < k; c++) {
    let p = c; for (let r = c + 1; r < k; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12 * Math.max(1, Math.abs(A[c][c]))) return null;
    [M[c], M[p]] = [M[p], M[c]];
    const d = M[c][c]; for (let j = 0; j < 2 * k; j++) M[c][j] /= d;
    for (let r = 0; r < k; r++) if (r !== c && M[r][c]) { const f = M[r][c]; for (let j = 0; j < 2 * k; j++) M[r][j] -= f * M[c][j]; }
  }
  return M.map((l) => l.slice(k));
}

/**
 * MQP com efeito fixo `fe` e CR1 por `cl`. dados: [{ y, x:[...], w, fe, cl }]. Grupos com 1 linha saem.
 * As colunas de x que, depois da centragem, ficam (quase) colineares com as anteriores saem (devolvidas como null).
 */
export function mqp(dados) {
  const ok = dados.filter((d) => Number.isFinite(d.y) && d.w > 0 && d.x.every(Number.isFinite));
  const cont = new Map();
  for (const d of ok) cont.set(d.fe, (cont.get(d.fe) ?? 0) + 1);
  const L = ok.filter((d) => cont.get(d.fe) >= 2);
  const k = L[0].x.length;
  const S = new Map();
  for (const d of L) { let s = S.get(d.fe); if (!s) S.set(d.fe, (s = { w: 0, y: 0, x: new Float64Array(k) })); s.w += d.w; s.y += d.w * d.y; for (let j = 0; j < k; j++) s.x[j] += d.w * d.x[j]; }
  const N = L.length;
  const X = new Float64Array(N * k), Y = new Float64Array(N), W = new Float64Array(N), C = new Array(N);
  L.forEach((d, i) => { const s = S.get(d.fe); Y[i] = d.y - s.y / s.w; W[i] = d.w; C[i] = d.cl; for (let j = 0; j < k; j++) X[i * k + j] = d.x[j] - s.x[j] / s.w; });
  const XtX = Array.from({ length: k }, () => new Array(k).fill(0)), Xty = new Array(k).fill(0);
  for (let i = 0; i < N; i++) for (let a = 0; a < k; a++) { const xa = W[i] * X[i * k + a]; Xty[a] += xa * Y[i]; for (let b = 0; b < k; b++) XtX[a][b] += xa * X[i * k + b]; }
  // seleção de colunas: Gram-Schmidt pela diagonal residual
  const usa = [];
  for (let j = 0; j < k; j++) {
    const cand = [...usa, j];
    const inv = inversa(cand.map((a) => cand.map((b) => XtX[a][b])));
    if (inv && XtX[j][j] > 0) {
      // diagonal residual de j dada as anteriores = 1 / inv[j][j]
      const res = 1 / inv[cand.length - 1][cand.length - 1];
      if (res > 1e-9 * XtX[j][j]) usa.push(j);
    }
  }
  const A = usa.map((a) => usa.map((b) => XtX[a][b]));
  const Ai = inversa(A);
  const b = Ai.map((l) => l.reduce((s, v, j) => s + v * Xty[usa[j]], 0));
  const sc = new Map();
  for (let i = 0; i < N; i++) {
    let e = Y[i]; for (let a = 0; a < usa.length; a++) e -= X[i * k + usa[a]] * b[a];
    let u = sc.get(C[i]); if (!u) sc.set(C[i], (u = new Float64Array(usa.length)));
    for (let a = 0; a < usa.length; a++) u[a] += W[i] * X[i * k + usa[a]] * e;
  }
  const K = usa.length;
  const meat = Array.from({ length: K }, () => new Array(K).fill(0));
  for (const u of sc.values()) for (let a = 0; a < K; a++) for (let c = 0; c < K; c++) meat[a][c] += u[a] * u[c];
  const G = sc.size;
  const fc = (G / (G - 1)) * ((N - 1) / (N - K));
  const nG = S.size, fcAreg = (G / (G - 1)) * ((N - 1) / (N - K - nG));
  const se = new Array(K);
  for (let a = 0; a < K; a++) { let s = 0; for (let p = 0; p < K; p++) for (let q = 0; q < K; q++) s += Ai[a][p] * meat[p][q] * Ai[q][a]; se[a] = Math.sqrt(fc * s); }
  const beta = new Array(k).fill(null), ep = new Array(k).fill(null), z = new Array(k).fill(null), zAreg = new Array(k).fill(null);
  usa.forEach((j, a) => { beta[j] = b[a]; ep[j] = se[a]; z[j] = b[a] / se[a]; zAreg[j] = z[j] * Math.sqrt(fc / fcAreg); });
  return { beta, ep, z, zAreg, N, grupos: S.size, clusters: G };
}
