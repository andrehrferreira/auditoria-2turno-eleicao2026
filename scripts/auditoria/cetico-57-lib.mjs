// Parecer cético 57: funções próprias (não importa estatistico-lib nem os scripts estatistico-h02-h05-final-*).
// - lerPares2026(): lê pares-banco.csv (doc 06) e aplica os filtros do E2 (aptos2 ≥ 20, c1 ≥ 20, |a2 − a1| ≤ 10, vias completas);
// - mqfe(): mínimos quadrados ponderados com efeito fixo (desvio da média ponderada do grupo, grupos de 1 saem) e erro-padrão
//   agrupado CR1 (fator G/(G−1)·(n−1)/(n−k)), por eliminação de Gauss com pivô;
// - zCorte(p): quantil normal bilateral.
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DIR_DADOS } from '../../src/config.js';

export async function lerPares2026() {
  const arq = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico-eleitoral', 'pares-banco.csv');
  let cab = null; const L = []; let lidos = 0;
  const TXT = new Set(['uf', 'municipio', 'zona', 'secao', 'modelo1', 'modelo2']);
  for await (const l of createInterface({ input: createReadStream(arq), crlfDelay: Infinity })) {
    if (!l) continue; const c = l.split(';');
    if (!cab) { cab = c; continue; }
    lidos++;
    const s = {}; cab.forEach((k, i) => { s[k] = TXT.has(k) ? c[i] : (c[i] === '' ? null : Number(c[i])); });
    if (s.a2 < 20 || s.c1 < 20 || Math.abs(s.a2 - s.a1) > 10) continue;
    if ([s.sb1, s.pb1, s.pg1, s.sb2, s.pb2, s.pg2].some((v) => v == null || !Number.isFinite(v))) continue;
    s.k = `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`; s.mun = `${s.uf}|${s.municipio}`; s.zon = `${s.uf}|${s.zona}`;
    s.loc = `${s.uf}|${s.municipio}|${s.zona}|${s.local2}`; s.clu = s.uf === 'df' ? s.zon : s.mun;
    L.push(s);
  }
  L.sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : 0));
  return { L, lidos };
}

function resolver(M, v) { // M k×k, v k → M⁻¹ (devolve a inversa)
  const k = M.length; const A = M.map((r, i) => [...r, ...Array.from({ length: k }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < k; c++) {
    let p = c; for (let r = c + 1; r < k; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-15) throw new Error('singular'); [A[c], A[p]] = [A[p], A[c]];
    const d = A[c][c]; for (let j = 0; j < 2 * k; j++) A[c][j] /= d;
    for (let r = 0; r < k; r++) if (r !== c) { const f = A[r][c]; if (f) for (let j = 0; j < 2 * k; j++) A[r][j] -= f * A[c][j]; }
  }
  return A.map((r) => r.slice(k));
}

/**
 * idx: índices usados; y: Float64Array; X: array de Float64Array; w: Float64Array; g: Int32Array (grupo) ; cl: Int32Array (cluster)
 * Devolve b, V (CR1), n, G, e a diferença d = b[i] − b[j] com ep e t.
 */
export function mqfe(idx, y, X, w, g, cl, i = 1, j = 0) {
  const K = X.length;
  const gw = new Map(), gy = new Map(), gn = new Map(), gx = new Map();
  for (const r of idx) { const q = g[r]; gw.set(q, (gw.get(q) ?? 0) + w[r]); gy.set(q, (gy.get(q) ?? 0) + w[r] * y[r]); gn.set(q, (gn.get(q) ?? 0) + 1);
    let a = gx.get(q); if (!a) { a = new Float64Array(K); gx.set(q, a); } for (let c = 0; c < K; c++) a[c] += w[r] * X[c][r]; }
  const XtX = Array.from({ length: K }, () => new Array(K).fill(0)); const Xty = new Array(K).fill(0);
  const xd = new Float64Array(K); let n = 0;
  for (const r of idx) { const q = g[r]; if (gn.get(q) < 2) continue; n++; const W = gw.get(q), a = gx.get(q);
    const yd = y[r] - gy.get(q) / W; for (let c = 0; c < K; c++) xd[c] = X[c][r] - a[c] / W;
    for (let p = 0; p < K; p++) { Xty[p] += w[r] * xd[p] * yd; for (let s = 0; s < K; s++) XtX[p][s] += w[r] * xd[p] * xd[s]; } }
  const inv = resolver(XtX);
  const b = inv.map((row) => row.reduce((acc, v, c) => acc + v * Xty[c], 0));
  const sc = new Map();
  for (const r of idx) { const q = g[r]; if (gn.get(q) < 2) continue; const W = gw.get(q), a = gx.get(q);
    let e = y[r] - gy.get(q) / W; for (let c = 0; c < K; c++) { xd[c] = X[c][r] - a[c] / W; e -= xd[c] * b[c]; }
    let s = sc.get(cl[r]); if (!s) { s = new Float64Array(K); sc.set(cl[r], s); } for (let c = 0; c < K; c++) s[c] += w[r] * xd[c] * e; }
  const G = sc.size; const meat = Array.from({ length: K }, () => new Array(K).fill(0));
  for (const s of sc.values()) for (let p = 0; p < K; p++) for (let q = 0; q < K; q++) meat[p][q] += s[p] * s[q];
  const f = (G / (G - 1)) * ((n - 1) / (n - K));
  const V = inv.map((row, p) => inv.map((_, q) => f * row.reduce((acc, v, c) => acc + v * meat[c].reduce((s2, m, l) => s2 + m * inv[l][q], 0), 0)));
  const d = b[i] - b[j], ep = Math.sqrt(V[i][i] + V[j][j] - 2 * V[i][j]);
  return { b, V, n, G, d, ep, t: d / ep };
}

export const ids = (lista, f) => { const m = new Map(); return Int32Array.from(lista, (s) => { const k = f(s); if (!m.has(k)) m.set(k, m.size); return m.get(k); }); };

export function cauda2(z) {
  const x = Math.abs(z) / Math.SQRT2, t = 1 / (1 + 0.5 * x);
  return t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
}
export const Phi = (z) => (z >= 0 ? 1 - cauda2(z) / 2 : cauda2(z) / 2);
export function zCorte(p) { let lo = 0, hi = 12; for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (cauda2(m) > p) lo = m; else hi = m; } return (lo + hi) / 2; }
// gerador xorshift128+ simplificado (diferente do mulberry32 do autor, de propósito)
export function gerador(seed) { let a = seed >>> 0 || 1, b = 0x9e3779b9, c = 0x243f6a88, d = 0xb7e15162;
  return () => { const t = a ^ (a << 11); a = b; b = c; c = d; d = (d ^ (d >>> 19)) ^ (t ^ (t >>> 8)); return (d >>> 0) / 4294967296; }; }
export const r4 = (x) => (Number.isFinite(x) ? Math.round(x * 1e4) / 1e4 : null);
export const r2 = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : null);

/**
 * Leitura rápida de uma linha do perfil_eleitor_secao (split simples em vez do parser com aspas, 9× mais rápido).
 * Só NM_LOCAL_VOTACAO (índice 9) é texto livre: os campos até o índice 8 são lidos do começo e os do índice 10 em diante,
 * do fim (deslocados se o nome do local tiver ';'). Devolve uma função índice → valor sem aspas.
 */
export function campoPerfil(linha, ncab) {
  const c = linha.split(';'); const extra = c.length - ncab;
  return (i) => { const v = c[i <= 8 ? i : i + extra]; return v && v.charCodeAt(0) === 34 ? v.slice(1, -1) : v; };
}
