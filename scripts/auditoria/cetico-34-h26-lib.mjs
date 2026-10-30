// Parecer cético 34 (H26): funções próprias (não reusa virada-zonas.mjs, forense-lib.mjs nem estatistico-lib.mjs).
// Lê 34-h26-secoes.csv (gerado por cetico-34-h26-secoes.mjs), ajusta o esperado por UF (MQ sem intercepto, solução por
// Cholesky), soma por zona, z robusto, Benjamini-Hochberg e o corte do plano (q < 0,01 e ≥ 2 p.p.).
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const RAIZ = path.resolve(import.meta.dirname, '..', '..');
export const SAIDA = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico-revisor');
export const REG = {
  ac: 'N', am: 'N', ap: 'N', pa: 'N', ro: 'N', rr: 'N', to: 'N',
  al: 'NE', ba: 'NE', ce: 'NE', ma: 'NE', pb: 'NE', pe: 'NE', pi: 'NE', rn: 'NE', se: 'NE',
  df: 'CO', go: 'CO', ms: 'CO', mt: 'CO', es: 'SE', mg: 'SE', rj: 'SE', sp: 'SE', pr: 'S', rs: 'S', sc: 'S', zz: 'EX',
};
export const NOMES_X = ['v13_1', 'v22_1', 'v14_1', 'v30_1', 'v55_1', 'v70_1', 'dem_1', 'bn1', 'abst1'];
export const xDe = (s) => [s.v13_1, s.v22_1, s.v14_1, s.v30_1, s.v55_1, s.v70_1, s.dem_1, s.bn1, s.a1 - s.c1];
export const noAjuste = (s) => s.c1 >= 10 && s.a2 >= 20 && Math.abs(s.a2 - s.a1) <= 10;
export const pp = (a, b) => (b > 0 ? (100 * a) / b : NaN);
export const QMAX = 0.01, PPMIN = 2;

export async function lerSecoes() {
  const txt = await readFile(path.join(SAIDA, '34-h26-secoes.csv'), 'utf8');
  const ls = txt.split('\n');
  const cab = ls[0].split(';');
  const texto = new Set(['uf', 'municipio', 'zona', 'secao', 'modelo1', 'modelo2']);
  const out = [];
  for (let i = 1; i < ls.length; i++) {
    if (!ls[i]) continue;
    const c = ls[i].split(';');
    const s = {};
    for (let j = 0; j < cab.length; j++) s[cab[j]] = texto.has(cab[j]) ? c[j] : c[j] === '' ? null : Number(c[j]);
    s.nom2 = s.v13_2 + s.v22_2;
    s.x = xDe(s);
    s.fit = noAjuste(s);
    out.push(s);
  }
  return out;
}

/** Resolve A·b = c (A simétrica positiva definida) por Cholesky. */
export function cholesky(A, c) {
  const n = A.length, L = A.map(() => new Float64Array(n));
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
    let s = A[i][j];
    for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
    if (i === j) { if (s <= 0) throw new Error('não positiva definida'); L[i][i] = Math.sqrt(s); } else L[i][j] = s / L[j][j];
  }
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) { let s = c[i]; for (let k = 0; k < i; k++) s -= L[i][k] * y[k]; y[i] = s / L[i][i]; }
  const b = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) { let s = y[i]; for (let k = i + 1; k < n; k++) s -= L[k][i] * b[k]; b[i] = s / L[i][i]; }
  return b;
}
export function inversa(A) {
  const n = A.length;
  const cols = [];
  for (let j = 0; j < n; j++) { const e = new Float64Array(n); e[j] = 1; cols.push(cholesky(A, e)); }
  return A.map((_, i) => Float64Array.from(cols.map((c) => c[i])));
}
export const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
export const matVec = (M, v) => Float64Array.from(M.map((r) => dot(r, v)));

/** Normais por UF: XtX, Xty13, Xty22 nas seções do ajuste. */
export function normais(secoes) {
  const N = new Map();
  for (const s of secoes) {
    if (!s.fit) continue;
    let n = N.get(s.uf);
    if (!n) { n = { A: Array.from({ length: 9 }, () => new Float64Array(9)), c13: new Float64Array(9), c22: new Float64Array(9) }; N.set(s.uf, n); }
    const x = s.x;
    for (let i = 0; i < 9; i++) { n.c13[i] += x[i] * s.v13_2; n.c22[i] += x[i] * s.v22_2; for (let j = 0; j < 9; j++) n.A[i][j] += x[i] * x[j]; }
  }
  return N;
}
/** Coeficientes MQ por UF. `limite` = [lo, hi] faz MQ com caixa (descida por coordenada nas normais). */
export function coeficientes(N, limite = null) {
  const C = new Map();
  for (const [uf, n] of N) {
    const b13 = limite ? caixa(n.A, n.c13, limite) : cholesky(n.A, n.c13);
    const b22 = limite ? caixa(n.A, n.c22, limite) : cholesky(n.A, n.c22);
    C.set(uf, { b13, b22 });
  }
  return C;
}
function caixa(A, c, [lo, hi]) {
  const n = c.length;
  const b = cholesky(A, c).map((v) => Math.min(hi, Math.max(lo, v)));
  for (let it = 0; it < 20000; it++) {
    let mud = 0;
    for (let i = 0; i < n; i++) {
      let g = c[i];
      for (let j = 0; j < n; j++) if (j !== i) g -= A[i][j] * b[j];
      const nv = Math.min(hi, Math.max(lo, g / A[i][i]));
      mud = Math.max(mud, Math.abs(nv - b[i]));
      b[i] = nv;
    }
    if (mud < 1e-10) break;
  }
  return b;
}

/** Soma por zona (UF + zona) com o esperado de coeficientes C. */
export function porZona(secoes, C) {
  const Z = new Map();
  for (const s of secoes) {
    const k = `${s.uf}|${s.zona}`;
    let z = Z.get(k);
    if (!z) {
      z = { k, uf: s.uf, zona: s.zona, reg: REG[s.uf], secoes: 0, SX: new Float64Array(9), a1: 0, c1: 0, a2: 0, c2: 0, v13_1: 0, v22_1: 0,
        nom1: 0, v13_2: 0, v22_2: 0, nom2: 0, sb1: 0, pb1: 0, pg1: 0, sb2: 0, pb2: 0, pg2: 0, mun: new Map(), lista: [] };
      Z.set(k, z);
    }
    z.secoes++;
    for (let i = 0; i < 9; i++) z.SX[i] += s.x[i];
    for (const c of ['a1', 'c1', 'a2', 'c2', 'v13_1', 'v22_1', 'v13_2', 'v22_2', 'nom2', 'sb1', 'pb1', 'pg1', 'sb2', 'pb2', 'pg2']) z[c] += s[c];
    z.nom1 += s.v13_1 + s.v22_1 + s.v14_1 + s.v30_1 + s.v55_1 + s.v70_1 + s.dem_1;
    z.mun.set(s.municipio, (z.mun.get(s.municipio) ?? 0) + s.a2);
    z.lista.push(s);
  }
  const zonas = [...Z.values()];
  if (C) for (const z of zonas) recalcular(z, C.get(z.uf));
  return zonas;
}
export function recalcular(z, { b13, b22 }, extra13 = 0, extra22 = 0) {
  z.p13 = dot(z.SX, b13); z.p22 = dot(z.SX, b22);
  z.rl = (z.v13_2 + extra13 - z.p13) - (z.v22_2 + extra22 - z.p22);
  z.n2 = z.nom2 + extra13 + extra22;
  z.alem = pp(z.rl, z.n2);
  z.t = z.n2 > 0 ? z.rl / Math.sqrt(z.n2) : NaN;
}

export function mediana(v) {
  const a = Float64Array.from(v).sort();
  const n = a.length;
  return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
}
/** z robusto da zona: (t − mediana do grupo) / (1,4826·MAD do grupo); grupo com MAD 0 fica sem z. */
export function zRobusto(zonas, grupo = (z) => z.reg, campo = 't') {
  const G = new Map();
  for (const z of zonas) { if (!Number.isFinite(z[campo])) continue; const g = grupo(z); (G.get(g) ?? G.set(g, []).get(g)).push(z); }
  const esc = {};
  for (const [g, l] of G) {
    const m = mediana(l.map((z) => z[campo]));
    const mad = 1.4826 * mediana(l.map((z) => Math.abs(z[campo] - m)));
    esc[g] = { zonas: l.length, mediana: m, mad };
    for (const z of l) z.z = mad > 0 ? (z[campo] - m) / mad : NaN;
  }
  return esc;
}
/** erfc com fração contínua (x grande) e série (x pequeno); erro relativo ~1e-14. */
export function erfc(x) {
  if (x < 0) return 2 - erfc(-x);
  if (x < 2.5) {
    let s = x, t = x;
    for (let n = 1; n < 200; n++) { t *= -x * x / n; const d = t / (2 * n + 1); s += d; if (Math.abs(d) < 1e-17 * Math.abs(s)) break; }
    return 1 - (2 / Math.sqrt(Math.PI)) * s;
  }
  // Lentz para erfc(x) = exp(-x²)/√π · 1/(x + 1/2/(x + 1/(x + 3/2/(x + ...))))
  let f = x, C = x, D = 0;
  for (let n = 1; n < 500; n++) {
    const a = n / 2;
    D = x + a * D; D = 1 / D; C = x + a / C;
    const delta = C * D; f *= delta;
    if (Math.abs(delta - 1) < 1e-16) break;
  }
  return Math.exp(-x * x) / Math.sqrt(Math.PI) / f;
}
export const p2 = (z) => erfc(Math.abs(z) / Math.SQRT2);
export function bh(ps) {
  const m = ps.length, idx = ps.map((p, i) => i).sort((a, b) => ps[a] - ps[b]);
  const q = new Array(m);
  let acc = 1;
  for (let r = m - 1; r >= 0; r--) { acc = Math.min(acc, ps[idx[r]] * m / (r + 1)); q[idx[r]] = acc; }
  return q;
}
/** z, q e corte em todas as zonas (exterior sem z porque o grupo tem uma zona). */
export function triagem(zonas, grupo) {
  const esc = zRobusto(zonas, grupo);
  const com = zonas.filter((z) => Number.isFinite(z.z));
  const q = bh(com.map((z) => p2(z.z)));
  com.forEach((z, i) => { z.q = q[i]; });
  for (const z of zonas) {
    if (!Number.isFinite(z.z)) { z.q = NaN; z.fora = 0; continue; }
    z.fora = z.q < QMAX && Math.abs(z.alem) >= PPMIN ? (z.alem > 0 ? 13 : 22) : 0;
  }
  return esc;
}
export const csv = (ls, cols) => [cols.join(';'), ...ls.map((l) => cols.map((c) => (l[c] == null ? '' : typeof l[c] === 'number' && !Number.isInteger(l[c]) ? Number(l[c].toPrecision(6)) : l[c])).join(';'))].join('\n') + '\n';
export const r = (x, d = 2) => (Number.isFinite(x) ? Math.round(x * 10 ** d) / 10 ** d : null);
