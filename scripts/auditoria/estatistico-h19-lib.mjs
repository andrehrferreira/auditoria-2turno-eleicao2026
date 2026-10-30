// Estatístico eleitoral, H19: biblioteca comum (carga, elegibilidade, salto local por seção e regressão) de
// estatistico-h19-analise.mjs (confirmatório) e estatistico-h19-exploratorio.mjs. Plano: docs/analysis/estatistico-eleitoral/20-h19-plano.md.
// Executa a carga ao ser importada (data/parsed/auditoria/estatistico/h19/medidas.csv.gz).
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { DIR_DADOS } from '../../src/config.js';

const DIR = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h19');
const REGIOES = {
  Nordeste: ['al', 'ba', 'ce', 'ma', 'pb', 'pe', 'pi', 'rn', 'se'],
  Norte: ['ac', 'am', 'ap', 'pa', 'ro', 'rr', 'to'],
  'Centro-Oeste': ['df', 'go', 'ms', 'mt'],
  Sudeste: ['es', 'mg', 'rj', 'sp'],
  Sul: ['pr', 'rs', 'sc'],
};
const UFS_BR = Object.values(REGIOES).flat();
const N_TESTES = 105;

// ---------- normal ----------
function erfc(x) {
  const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}
const pBicaudal = (z) => erfc(Math.abs(z) / Math.SQRT2);
function invNormal(p) { // Acklam
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - pl) return -invNormal(1 - p);
  const q = p - 0.5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
const Z_BONF = invNormal(1 - 0.05 / (2 * N_TESTES));
const Z_PODER = invNormal(0.8);
const mediana = (v) => { const s = Float64Array.from(v).sort(); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : NaN; };
const logit = (x, y) => Math.log((x + 0.5) / (y + 0.5));
const expit = (v) => 1 / (1 + Math.exp(-v));
function bh(ps, q = 0.05) {
  const ord = ps.map((p, i) => [p, i]).sort((a, b) => a[0] - b[0]);
  let k = 0;
  ord.forEach(([p], r) => { if (p <= (q * (r + 1)) / ps.length) k = r + 1; });
  return new Set(ord.slice(0, k).map(([, i]) => i));
}

// ---------- carga ----------
const texto = gunzipSync(await readFile(path.join(DIR, 'medidas.csv.gz'))).toString('utf8');
const [cab, ...corpo] = texto.trim().split('\n');
const COLS = cab.split(';');
const TEXTO = new Set(['uf', 'municipio', 'zona', 'secao', 'modelo1', 'modelo2']);
const todas = corpo.map((l) => {
  const p = l.split(';');
  const o = {};
  COLS.forEach((c, i) => { o[c] = TEXTO.has(c) ? p[i] : p[i] === '' ? null : Number(p[i]); });
  return o;
});

// ---------- descritivo nacional por turno e por modelo (todas as seções lidas) ----------
const descritivo = { secoesLidas: todas.length, porTurno: {}, porModelo: {} };
for (const t of [1, 2]) {
  const d = { votos: 0, R: 0, F: 0, B: 0, tentativas: 0, tentR: 0, H: 0, M: 0, anb: 0, r1: 0 };
  for (const s of todas) { d.votos += s[`votos${t}`]; d.R += s[`R${t}`]; d.F += s[`F${t}`]; d.tentativas += s[`tentR${t}`] + s[`tentF${t}`]; d.tentR += s[`tentR${t}`]; d.H += s[`H${t}`]; d.M += s[`M${t}`]; d.anb += s[`anb${t}`]; d.r1 += s[`r1_${t}`]; }
  d.B = d.R + d.F;
  Object.assign(d, { f: d.F / d.B, a: d.tentR / d.R, p1: d.r1 / d.R, hDeF: d.H / d.F, tentativasPorPedido: d.tentativas / d.B });
  descritivo.porTurno[t] = d;
  for (const s of todas) {
    const m = s[`modelo${t}`] ?? 'sem';
    const x = ((descritivo.porModelo[m] ??= {})[t] ??= { secoes: 0, R: 0, F: 0, tentR: 0, H: 0 });
    x.secoes++; x.R += s[`R${t}`]; x.F += s[`F${t}`]; x.tentR += s[`tentR${t}`]; x.H += s[`H${t}`];
  }
}
for (const m of Object.values(descritivo.porModelo)) for (const x of Object.values(m)) Object.assign(x, { f: x.F / (x.R + x.F), a: x.tentR / x.R, hDeF: x.H / x.F });

// ---------- elegibilidade ----------
const exclusoes = {};
const exclui = (m) => { exclusoes[m] = (exclusoes[m] ?? 0) + 1; };
const elegiveis = [];
for (const s of todas) {
  if (!s.bate1 || !s.bate2) { exclui('diário diferente do BU em algum turno'); continue; }
  if (s.M1 + s.H1 !== s.F1 || s.M2 + s.H2 !== s.F2) { exclui('V3m + V3s da H08 diferente das falhas do leitor'); continue; }
  if (s.R1 + s.F1 < 20 || s.R2 + s.F2 < 20 || s.R1 < 10 || s.R2 < 10) { exclui('B < 20 ou R < 10 em algum turno'); continue; }
  if (s.v13_1 + s.v22_1 < 20 || s.v13_2 + s.v22_2 < 20) { exclui('menos de 20 votos em 13 + 22 em algum turno'); continue; }
  if (!s.eleitores || s.idade70 === null) { exclui('sem perfil do eleitorado'); continue; }
  if (s.local2 === null || !s.modelo2) { exclui('sem local ou modelo no 2º turno'); continue; }
  s.g = `${s.uf}/${s.municipio}/${s.zona}/${s.local2}/${s.modelo2}`;
  s.cl = `${s.uf}/${s.municipio}/${s.zona}/${s.local2}`;
  s.id = `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`;
  elegiveis.push(s);
}
const porGrupo = new Map();
for (const s of elegiveis) { const g = porGrupo.get(s.g); if (g) g.push(s); else porGrupo.set(s.g, [s]); }
const amostra = [];
for (const g of porGrupo.values()) { if (g.length < 2) { for (let i = 0; i < g.length; i++) exclui('sozinha no grupo local × modelo'); continue; } amostra.push(...g); }

// ---------- medidas derivadas ----------
for (const s of amostra) {
  s.B1 = s.R1 + s.F1; s.B2 = s.R2 + s.F2;
  s.f1 = s.F1 / s.B1; s.f2 = s.F2 / s.B2;
  s.a1 = s.tentR1 / s.R1; s.a2 = s.tentR2 / s.R2;
  s.h1 = s.H1 / s.B1; s.h2 = s.H2 / s.B2;
  s.Y1 = s.v13_1 / (s.v13_1 + s.v22_1); s.Y2 = s.v13_2 / (s.v13_2 + s.v22_2);
  s.xanb1 = s.anb1 / s.votos1; s.xanb2 = s.anb2 / s.votos2;
  s.trocada = s.urna1 !== s.urna2 ? 1 : 0;
}

// ---------- Parte 1: salto local ----------
for (const g of porGrupo.values()) {
  if (g.length < 2) continue;
  const tot = { F1: 0, R1: 0, F2: 0, R2: 0, tR1: 0, tR2: 0 };
  for (const s of g) { tot.F1 += s.F1; tot.R1 += s.R1; tot.F2 += s.F2; tot.R2 += s.R2; tot.tR1 += s.tentR1; tot.tR2 += s.tentR2; }
  for (const s of g) {
    const P = { F1: tot.F1 - s.F1, R1: tot.R1 - s.R1, F2: tot.F2 - s.F2, R2: tot.R2 - s.R2 };
    const ds = logit(s.F2, s.R2) - logit(s.F1, s.R1);
    const dP = logit(P.F2, P.R2) - logit(P.F1, P.R1);
    s.J = ds - dP;
    s.V = 1 / (s.F1 + 0.5) + 1 / (s.R1 + 0.5) + 1 / (s.F2 + 0.5) + 1 / (s.R2 + 0.5) + 1 / (P.F1 + 0.5) + 1 / (P.R1 + 0.5) + 1 / (P.F2 + 0.5) + 1 / (P.R2 + 0.5);
    s.zBin = s.J / Math.sqrt(s.V);
    const fP1 = P.F1 / (P.F1 + P.R1), fP2 = P.F2 / (P.F2 + P.R2);
    s.saltoF = (s.f2 - s.f1) - (fP2 - fP1); // em fração
    s.saltoA = (s.a2 - s.a1) - ((tot.tR2 - s.tentR2) / P.R2 - (tot.tR1 - s.tentR1) / P.R1);
    s.E = s.F2 - s.B2 * expit(logit(s.F1, s.R1) + dP);
    s.Emais = Math.max(0, s.E);
  }
}
const sobredispersao = {};
for (const uf of UFS_BR) {
  const v = amostra.filter((s) => s.uf === uf);
  if (!v.length) continue;
  const J = v.map((s) => s.J);
  const med = mediana(J);
  const mad = 1.4826 * mediana(J.map((x) => Math.abs(x - med)));
  const tau2 = Math.max(0, mad * mad - mediana(v.map((s) => s.V)));
  sobredispersao[uf] = { secoes: v.length, medianaJ: med, madJ: mad, medianaV: mediana(v.map((s) => s.V)), tau2 };
  for (const s of v) s.zOd = (s.J - med) / Math.sqrt(s.V + tau2);
}
for (const s of amostra) {
  s.Sup = s.zOd >= 3 && s.saltoF >= 0.05 ? 1 : 0;
  s.Sdown = s.zOd <= -3 && s.saltoF <= -0.05 ? 1 : 0;
}

// ---------- Parte 2: regressões ----------
const CTRL_NOMES = ['cadSemBio', 'p60', 'p70', 'p16a24', 'pBaixa', 'pSup', 'logEle', 'trocada', 'f1', 'a1', 'Δanb'];
const ctrlDe = (s, { semAnb = false, comComp = false, modelos = false } = {}) => {
  const e = s.eleitores;
  const c = [1 - s.biometria / e, s.idade60 / e, s.idade70 / e, s.idade16a24 / e, s.escolBaixa / e, s.superior / e, Math.log(e), s.trocada, s.f1, s.a1];
  if (!semAnb) c.push(s.xanb2 - s.xanb1);
  if (comComp) c.push((s.comp2 - s.comp1) / e);
  if (modelos) c.push(s.modelo2 === 'ue2013' ? 1 : 0, s.modelo2 === 'ue2015' ? 1 : 0, s.modelo2 === 'ue2020' ? 1 : 0, s.modelo2 === 'ue2022' ? 1 : 0);
  return c;
};

function resolverSimetrico(A, bvec) {
  const n = A.length, L = A.map((r) => r.map(() => 0));
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
    let s = A[i][j];
    for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
    if (i === j) { if (s <= 1e-9 * A[i][i]) return { falha: i }; L[i][i] = Math.sqrt(s); } else L[i][j] = s / L[j][j];
  }
  const inv = A.map((_, c) => {
    const y = new Array(n).fill(0);
    for (let i = 0; i < n; i++) { let s = i === c ? 1 : 0; for (let k = 0; k < i; k++) s -= L[i][k] * y[k]; y[i] = s / L[i][i]; }
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) { let s = y[i]; for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k]; x[i] = s / L[i][i]; }
    return x;
  });
  return { beta: inv.map((row) => row.reduce((a, v, j) => a + v * bvec[j], 0)), inv };
}

/**
 * MQP com efeito fixo do grupo `g` (demeaning ponderado), CR1 por `cl`. rows: { g, cl, w, x[], c[], y }.
 * As nx primeiras colunas (x) nunca saem; controles colineares saem. Devolve beta e se das nx primeiras.
 */
function regredir(rows) {
  const nx = rows[0].x.length;
  const grupos = new Map();
  rows.forEach((r, i) => { const g = grupos.get(r.g); if (g) g.push(i); else grupos.set(r.g, [i]); });
  const K0 = nx + rows[0].c.length;
  const X = [], Y = [], W = [], CL = [];
  let nG = 0;
  for (const idx of grupos.values()) {
    if (idx.length < 2) continue;
    nG++;
    let sw = 0, my = 0; const mx = new Float64Array(K0);
    const cols = idx.map((i) => [...rows[i].x, ...rows[i].c]);
    idx.forEach((i, j) => { const w = rows[i].w; sw += w; for (let k = 0; k < K0; k++) mx[k] += w * cols[j][k]; my += w * rows[i].y; });
    for (let k = 0; k < K0; k++) mx[k] /= sw; my /= sw;
    idx.forEach((i, j) => { X.push(cols[j].map((v, k) => v - mx[k])); Y.push(rows[i].y - my); W.push(rows[i].w); CL.push(rows[i].cl); });
  }
  let ativas = [...Array(K0).keys()];
  for (;;) {
    const K = ativas.length;
    const XtX = ativas.map(() => new Array(K).fill(0)), XtY = new Array(K).fill(0);
    for (let i = 0; i < X.length; i++) { const w = W[i], xi = X[i]; for (let a = 0; a < K; a++) { const xa = xi[ativas[a]] * w; XtY[a] += xa * Y[i]; for (let b = 0; b <= a; b++) XtX[a][b] += xa * xi[ativas[b]]; } }
    for (let a = 0; a < K; a++) for (let b = a + 1; b < K; b++) XtX[a][b] = XtX[b][a];
    const sol = resolverSimetrico(XtX, XtY);
    if (sol.falha !== undefined) { if (ativas[sol.falha] < nx) return null; ativas = ativas.filter((_, a) => a !== sol.falha); continue; }
    const { beta, inv } = sol;
    const N = X.length;
    const somaCl = new Map();
    for (let i = 0; i < N; i++) {
      let e = Y[i]; for (let a = 0; a < K; a++) e -= X[i][ativas[a]] * beta[a];
      let v = somaCl.get(CL[i]); if (!v) somaCl.set(CL[i], (v = new Float64Array(K)));
      for (let a = 0; a < K; a++) v[a] += W[i] * X[i][ativas[a]] * e;
    }
    const meat = ativas.map(() => new Array(K).fill(0));
    for (const v of somaCl.values()) for (let a = 0; a < K; a++) for (let b = 0; b < K; b++) meat[a][b] += v[a] * v[b];
    const nC = somaCl.size;
    const esc = (nC / (nC - 1)) * ((N - 1) / (N - K));
    const se = [...Array(nx).keys()].map((a) => { let s = 0; for (let p = 0; p < K; p++) for (let q = 0; q < K; q++) s += inv[a][p] * meat[p][q] * inv[q][a]; return Math.sqrt(esc * s); });
    return { N, grupos: nG, clusters: nC, controlesSaidos: [...Array(K0 - nx).keys()].filter((c) => !ativas.includes(c + nx)).length, beta: beta.slice(0, nx), se };
  }
}

const pp = 100; // Y em pontos percentuais
/** Linhas do M1 (x = Δa, Δf, Δh) ou do M2 (x = S↑, S↓), com injeção opcional. */
function linhasModelo(secs, modelo, { desfecho = 'painel', opc = {}, inj = null, grupo = 'g' } = {}) {
  return secs.map((s) => {
    let { F2, B2, H2, votos2, v13_2, v22_2, anb2 } = s;
    if (inj && (!inj.so || inj.so(s))) {
      const k = inj.phi * s.Emais;
      F2 += k; B2 += k; votos2 += k;
      if (inj.via === 'h') H2 += k;
      if (inj.cand === 13) v13_2 += k; else v22_2 += k;
    }
    const f2 = F2 / B2, h2 = H2 / B2, Y2 = v13_2 / (v13_2 + v22_2), xanb2 = anb2 / votos2;
    const x = modelo === 'M1' ? [s.a2 - s.a1, f2 - s.f1, h2 - s.h1] : [s.Sup, s.Sdown];
    const c = ctrlDe({ ...s, xanb2 }, opc);
    const y = desfecho === 'placebo' ? pp * s.Y1 : pp * (Y2 - s.Y1);
    return { g: s[grupo], cl: s.cl, w: s.v13_2 + s.v22_2, x, c, y };
  });
}

const unidades = [['Brasil', UFS_BR], ...Object.entries(REGIOES), ...UFS_BR.map((u) => [u.toUpperCase(), [u]])];

export { REGIOES, UFS_BR, N_TESTES, DIR, pBicaudal, invNormal, Z_BONF, Z_PODER, mediana, bh, todas, descritivo, exclusoes, amostra, porGrupo, sobredispersao, CTRL_NOMES, ctrlDe, regredir, linhasModelo, pp, unidades };
