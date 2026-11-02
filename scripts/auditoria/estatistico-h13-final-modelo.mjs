// Estatístico eleitoral, fechamento da H13, seção 4 do plano pré-registrado (doc 27, commit 89ede09): método único nas 28 UFs.
//   Estágio 1, em cada uma das 27 UFs: N2 (nível do 2º turno), P (painel por eleitor do cadastro) e N1 (linha de base),
//     efeito fixo de local, peso 13 + 22, CR1 por local; mínimo detectável por injeção (f = 1%, pesos fixos).
//   Estágio 2: efeitos aleatórios entre UFs (DerSimonian-Laird; Hartung-Knapp-Sidik-Jonkman com piso; t com k − p gl):
//     μ_BR (só intercepto) e meta-regressão com indicador do Nordeste (μ_NE = a + δ, δ_NE).
//   Equivalência no Nordeste (margem 44.302 votos), cerco aritmético (H13-L) nas 28 UFs, estimativa ecológica,
//   sensibilidades e conferências 1 a 3 da seção 9.
// Uso: node --max-old-space-size=16000 scripts/auditoria/estatistico-h13-final-modelo.mjs
// Saídas: data/parsed/auditoria/estatistico/h13-final/{modelo.json, ufs.csv, cerco.csv}
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { parseArgs } from 'node:util';
import { paraCsv } from './forense-lib.mjs';
import {
  SAIDA as SAIDA_PLANO, UFS27, NE, VIAS, P_BONF, Z_B2, carregar, montar, ajustar, pNormal2, pT2, tCrit,
} from './estatistico-h13-final-lib.mjs';

// --denominador aptos --saida <dir>: adendo 1 do plano 27 (commit ed0474c); o padrão (perfil) reproduz o doc 28.
const { values: args } = parseArgs({ options: { denominador: { type: 'string', default: 'perfil' }, saida: { type: 'string' } } });
const DEN = args.denominador;
if (!['perfil', 'aptos'].includes(DEN)) throw new Error('--denominador perfil|aptos');
const SAIDA = args.saida ? path.resolve(args.saida) : SAIDA_PLANO;
await mkdir(SAIDA, { recursive: true });
const t0 = Date.now();
const log = (m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);

const { secoes, relidas } = await carregar([...UFS27, 'zz']);
log(`seções carregadas: ${secoes.size}; linhas substituídas pela releitura com união: ${relidas}`);
const porUf = new Map();
for (const s of secoes.values()) { const l = porUf.get(s.uf); if (l) l.push(s); else porUf.set(s.uf, [s]); }

// ---------- margens (BU, presidente) ----------
const { db } = await abrirLeitura();
const margens = {};
for (const turno of [1, 2]) {
  const tot = db.prepare(`SELECT numero, SUM(quantidade) q FROM voto_bu WHERE turno = ? AND cargo = 1 AND tipo_voto = 'nominal' GROUP BY numero ORDER BY q DESC`).all(turno);
  const validos = tot.reduce((s, r) => s + r.q, 0);
  margens[turno] = { totais: tot.map((r) => ({ numero: r.numero, votos: r.q })), validos };
}
db.close();
const v = (t, n) => margens[t].totais.find((r) => r.numero === n)?.votos ?? 0;
margens.margem2 = v(2, 13) - v(2, 22);
log(`margem do 2º turno (13 − 22): ${margens.margem2}`);

// ---------- conferência 1: totais das vias ----------
const conf1 = {};
for (const turno of [1, 2]) {
  const c = { v1: 0, v2: 0, v3m: 0, v3s: 0, outra: 0, votosDiario: 0, secoesComDiario: 0, compBU: 0, secoesComBU: 0 };
  for (const s of secoes.values()) {
    const t = s[`t${turno}`];
    if (t?.comp) { c.compBU += t.comp; c.secoesComBU++; }
    if (t?.log) { c.secoesComDiario++; c.votosDiario += t.log.votos; for (const k of ['v1', 'v2', 'v3m', 'v3s', 'outra']) c[k] += t.log[k]; }
  }
  conf1[turno] = c;
}
log(`conferência 1, 2º turno: ${JSON.stringify(conf1[2])}`);

// ---------- estágio 1 ----------
const DESF = ['N2', 'P', 'N1'];
const est1 = {}; // uf → desfecho → { N, locais, exc, v2: {beta,se,z}, ..., mde }
const linhasDe = {}; // uf → desfecho → linhas (para votos e injeção)

function injetar(rs, desfecho, via, f, cand) {
  const iv = VIAS.indexOf(via);
  const ys = [], focs = [], dCs = [];
  let base = 0;
  for (const r of rs) {
    const a = r.s.t2, b = r.s.t1;
    if (desfecho === 'P') {
      const L = Math.max(0, a.log[via] - b.log[via]);
      const F = f * L; base += L;
      const v13 = a.v13 + (cand === 13 ? F : 0), v22 = a.v22 + (cand === 22 ? F : 0);
      ys.push(v13 / (v13 + v22) - b.v13 / (b.v13 + b.v22));
      const el = r.den2;
      focs.push(r.foc.map((x, i) => (i === iv ? x + F / el : x)));
      dCs.push(r.dC + F / el);
    } else {
      const t = desfecho === 'N2' ? a : b;
      const L = t.log[via];
      const F = f * L; base += L;
      const v13 = t.v13 + (cand === 13 ? F : 0), v22 = t.v22 + (cand === 22 ? F : 0);
      ys.push(v13 / (v13 + v22));
      focs.push(VIAS.map((w) => (t.log[w] + (w === via ? F : 0)) / (t.log.votos + F)));
      dCs.push(null);
    }
  }
  return { ys, focs, dCs, base };
}

for (const uf of UFS27) {
  est1[uf] = {}; linhasDe[uf] = {};
  for (const d of DESF) {
    const exc = {};
    const rs = montar(porUf.get(uf), d, exc, { denominador: DEN });
    linhasDe[uf][d] = rs;
    const fit = ajustar(rs, d);
    const o = { N: fit?.N ?? 0, locais: fit?.locais ?? 0, linhas: rs.length, exc, base: fit?.base };
    if (!fit) { est1[uf][d] = { ...o, falha: true }; continue; }
    for (const via of VIAS) o[via] = fit[via];
    if (d === 'P') o.dC = fit.dC;
    // mínimo detectável por injeção (N2 e P)
    if (d !== 'N1') {
      o.mde = {};
      for (const via of VIAS) {
        o.mde[via] = {};
        for (const cand of [13, 22]) {
          const inj = injetar(rs, d, via, 0.01, cand);
          const f2 = ajustar(rs, d, { ys: inj.ys, focs: inj.focs, dCs: inj.dCs });
          const dBeta = f2[via].beta - fit[via].beta; // pontos, por f = 1%
          const dz = dBeta / fit[via].se;
          const fMDE = Math.abs(dz) > 0 ? (0.01 * (Z_B2 + 0.84)) / Math.abs(dz) : Infinity;
          o.mde[via][cand] = { dBetaPorF1: dBeta, dzPorF1: dz, fMDE, base: inj.base, votosMDE: fMDE * inj.base };
        }
      }
    }
    est1[uf][d] = o;
  }
  log(`${uf}: N2 ${est1[uf].N2.N}, P ${est1[uf].P.N}, N1 ${est1[uf].N1.N}`);
}

// ---------- estágio 2 ----------
function inv2(M) { // inversa de matriz p×p (p ≤ 2)
  if (M.length === 1) return [[1 / M[0][0]]];
  const det = M[0][0] * M[1][1] - M[0][1] * M[1][0];
  return [[M[1][1] / det, -M[0][1] / det], [-M[1][0] / det, M[0][0] / det]];
}
function wls(X, y, w) {
  const p = X[0].length;
  const A = Array.from({ length: p }, () => new Array(p).fill(0)), b = new Array(p).fill(0);
  X.forEach((x, i) => { for (let a = 0; a < p; a++) { b[a] += w[i] * x[a] * y[i]; for (let c = 0; c < p; c++) A[a][c] += w[i] * x[a] * x[c]; } });
  const Ai = inv2(A);
  const coefs = Ai.map((row) => row.reduce((s, v2, j) => s + v2 * b[j], 0));
  const r = y.map((yi, i) => yi - X[i].reduce((s, xv, j) => s + xv * coefs[j], 0));
  return { coefs, Ai, A, r };
}
function tau2DL(X, y, vi) {
  const k = y.length, p = X[0].length;
  const w = vi.map((x) => 1 / x);
  const { Ai, r } = wls(X, y, w);
  const QE = r.reduce((s, ri, i) => s + w[i] * ri * ri, 0);
  // tr(P) = Σw − tr((X'WX)^{-1} X'W²X)
  const B = Array.from({ length: p }, () => new Array(p).fill(0));
  X.forEach((x, i) => { for (let a = 0; a < p; a++) for (let c = 0; c < p; c++) B[a][c] += w[i] * w[i] * x[a] * x[c]; });
  let tr = 0; for (let a = 0; a < p; a++) for (let c = 0; c < p; c++) tr += Ai[a][c] * B[c][a];
  const trP = w.reduce((s, x) => s + x, 0) - tr;
  return { tau2: Math.max(0, (QE - (k - p)) / trP), QE, df: k - p };
}
function tau2REML(X, y, vi) {
  const ll = (t2) => {
    const w = vi.map((x) => 1 / (x + t2));
    const { A, r } = wls(X, y, w);
    const det = A.length === 1 ? A[0][0] : A[0][0] * A[1][1] - A[0][1] * A[1][0];
    return -0.5 * vi.reduce((s, x) => s + Math.log(x + t2), 0) - 0.5 * Math.log(det) - 0.5 * r.reduce((s, ri, i) => s + w[i] * ri * ri, 0);
  };
  let lo = 0, hi = 50 * Math.max(...vi) + 100 * Math.max(...y.map((x) => x * x));
  for (let i = 0; i < 200; i++) { const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3; if (ll(m1) < ll(m2)) lo = m1; else hi = m2; }
  return (lo + hi) / 2;
}
/** Meta com efeitos aleatórios. X: 'intercepto' ou 'ne'. Devolve coeficientes, erro HKSJ com piso, t e p. */
function meta(ufs, betas, ses, { modelo = 'intercepto', tau2Metodo = 'DL' } = {}) {
  const X = ufs.map((u) => (modelo === 'ne' ? [1, NE.has(u) ? 1 : 0] : [1]));
  const vi = ses.map((s) => s * s);
  const dl = tau2DL(X, betas, vi);
  const tau2 = tau2Metodo === 'REML' ? tau2REML(X, betas, vi) : dl.tau2;
  const w = vi.map((x) => 1 / (x + tau2));
  const { coefs, Ai, r } = wls(X, betas, w);
  const k = betas.length, p = X[0].length, df = k - p;
  const s2 = r.reduce((s, ri, i) => s + w[i] * ri * ri, 0) / df;
  const esc = Math.max(1, s2);
  const V = Ai.map((row) => row.map((x) => x * esc));
  const out = { k, df, tau2, QE: dl.QE, I2: dl.QE > dl.df ? (dl.QE - dl.df) / dl.QE : 0, s2HKSJ: s2, pesos: Object.fromEntries(ufs.map((u, i) => [u, w[i]])) };
  const est = (c, varc) => { const se = Math.sqrt(varc); const t = c / se; return { beta: c, se, t, p: pT2(t, df), df }; };
  if (modelo === 'intercepto') out.mu = est(coefs[0], V[0][0]);
  else { out.a = est(coefs[0], V[0][0]); out.delta = est(coefs[1], V[1][1]); out.muNE = est(coefs[0] + coefs[1], V[0][0] + V[1][1] + 2 * V[0][1]); }
  // operador linear (pesos fixos) para o mínimo detectável: coeficientes = L · β
  out.L = Ai.map((row) => ufs.map((_, i) => row.reduce((s, a, j) => s + a * w[i] * X[i][j], 0)));
  return out;
}

const T_CRIT = { 26: tCrit(P_BONF, 26), 25: tCrit(P_BONF, 25) };
log(`cortes t (Bonferroni, p ≤ ${P_BONF.toExponential(3)}): 26 gl ${T_CRIT[26].toFixed(3)}, 25 gl ${T_CRIT[25].toFixed(3)}`);

const est2 = {};
for (const d of DESF) {
  est2[d] = {};
  for (const via of VIAS) {
    const ufs = UFS27.filter((u) => est1[u][d]?.[via] && Number.isFinite(est1[u][d][via].se) && est1[u][d][via].se > 0);
    const betas = ufs.map((u) => est1[u][d][via].beta), ses = ufs.map((u) => est1[u][d][via].se);
    const mBR = meta(ufs, betas, ses), mNE = meta(ufs, betas, ses, { modelo: 'ne' });
    const o = { ufs: ufs.length, naoEstimaveis: UFS27.filter((u) => !ufs.includes(u)), BR: mBR, NE: mNE };
    o.efeitoComum = (() => { const w = ses.map((s) => 1 / (s * s)); const sw = w.reduce((a, b) => a + b, 0); const m = betas.reduce((a, b, i) => a + w[i] * b, 0) / sw; return { beta: m, se: Math.sqrt(1 / sw), z: m / Math.sqrt(1 / sw) }; })();
    o.REML = { BR: meta(ufs, betas, ses, { tau2Metodo: 'REML' }).mu, NE: meta(ufs, betas, ses, { modelo: 'ne', tau2Metodo: 'REML' }).muNE };
    o.encolhidas = Object.fromEntries(ufs.map((u, i) => [u, mBR.mu.beta + (mBR.tau2 / (mBR.tau2 + ses[i] ** 2)) * (betas[i] - mBR.mu.beta)]));
    o.semUmaUf = Object.fromEntries(ufs.map((u, i) => {
      const uu = ufs.filter((_, j) => j !== i), bb = betas.filter((_, j) => j !== i), ss = ses.filter((_, j) => j !== i);
      return [u, { muBR: meta(uu, bb, ss).mu.beta, muNE: meta(uu, bb, ss, { modelo: 'ne' }).muNE.beta }];
    }));
    // mínimo detectável do estágio 2: Δμ = L · Δβ (pesos fixos), deslocamento de t por f = 1%
    if (d !== 'N1') {
      o.mde = {};
      for (const cand of [13, 22]) {
        const db = ufs.map((u) => est1[u][d].mde[via][cand].dBetaPorF1);
        const dMu = mBR.L[0].reduce((s, l, i) => s + l * db[i], 0);
        const dA = mNE.L[0].reduce((s, l, i) => s + l * db[i], 0), dD = mNE.L[1].reduce((s, l, i) => s + l * db[i], 0);
        const dtBR = dMu / mBR.mu.se, dtNE = (dA + dD) / mNE.muNE.se;
        const fBR = Math.abs(dtBR) > 0 ? (0.01 * (T_CRIT[26] + 0.84)) / Math.abs(dtBR) : Infinity;
        const fNE = Math.abs(dtNE) > 0 ? (0.01 * (T_CRIT[25] + 0.84)) / Math.abs(dtNE) : Infinity;
        const baseBR = ufs.reduce((s, u) => s + est1[u][d].mde[via][cand].base, 0);
        const baseNE = ufs.filter((u) => NE.has(u)).reduce((s, u) => s + est1[u][d].mde[via][cand].base, 0);
        o.mde[cand] = { BR: { fMDE: fBR, votos: fBR * baseBR, base: baseBR }, NE: { fMDE: fNE, votos: fNE * baseNE, base: baseNE } };
      }
    }
    est2[d][via] = o;
  }
}

// ---------- equivalência no Nordeste ----------
/** M = (β/100) Σ a_s n_s max(2, 1/(1 − p_s)), nas seções do Nordeste da amostra do desfecho. */
function votosDe(beta, d, via) {
  const iv = VIAS.indexOf(via);
  let soma = 0;
  for (const uf of UFS27.filter((u) => NE.has(u))) {
    for (const r of linhasDe[uf][d]) {
      const a = r.s.t2;
      const pS = a.v13 / (a.v13 + a.v22);
      const fator = Math.max(2, pS < 1 ? 1 / (1 - pS) : Infinity);
      const aS = d === 'P' ? Math.max(0, r.foc[iv]) * r.den2 / a.log.votos : r.foc[iv];
      soma += aS * r.w * (Number.isFinite(fator) ? fator : 1e9);
    }
  }
  return (beta / 100) * soma;
}
const MARGEM_EQ = Math.round(0.01 * margens.margem2);
const equivalencia = {};
for (const d of ['N2', 'P']) for (const via of VIAS) {
  const m = est2[d][via].NE.muNE;
  const sup = m.beta + T_CRIT[25] * m.se;
  const votosSup = votosDe(sup, d, via);
  equivalencia[`${d}/${via}`] = { muNE: m.beta, se: m.se, limiteSuperior: sup, votosLimiteSuperior: votosSup, margem: MARGEM_EQ, vale: votosSup <= MARGEM_EQ };
}
log(`equivalência: ${JSON.stringify(Object.fromEntries(Object.entries(equivalencia).map(([k, x]) => [k, Math.round(x.votosLimiteSuperior)])))}`);

// ---------- cerco (H13-L) nas 28 UFs ----------
const cerco = [];
const GRUPOS = { v2: ['v2'], v3m: ['v3m'], v3s: ['v3s'], v3: ['v3m', 'v3s'], lib: ['v2', 'v3m', 'v3s'] };
for (const turno of [1, 2]) for (const uf of [...UFS27, 'zz']) {
  const acc = Object.fromEntries(Object.keys(GRUPOS).map((g) => [g, { L: 0, min: 0, max: 0, secoes: 0 }]));
  for (const s of porUf.get(uf) ?? []) {
    const t = s[`t${turno}`];
    if (!t?.comp || !t.log) continue;
    for (const [g, vs] of Object.entries(GRUPOS)) {
      const L = vs.reduce((x, w) => x + t.log[w], 0);
      const T = t.comp;
      const a = acc[g];
      a.L += L; a.min += Math.max(0, L - (T - t.v13)); a.max += Math.min(L, t.v13); a.secoes++;
    }
  }
  for (const [g, a] of Object.entries(acc)) {
    const pmin = a.L ? a.min / a.L : null, pmax = a.L ? a.max / a.L : null;
    cerco.push({ turno, uf, grupo: g, secoes: a.secoes, liberados: a.L, minNo13: a.min, maxNo13: a.max, pMin: pmin, pMax: pmax,
      leitura: a.L === 0 ? 'sem liberados' : pmin > 0.5 ? 'maioria no 13 (Fato)' : pmax < 0.5 ? 'maioria fora do 13 (Fato)' : 'não decidível (voto secreto)' });
  }
}

// ---------- estimativa ecológica por UF (Hipótese de modelo), pelo N2 ----------
const ecologica = {};
for (const uf of UFS27) {
  const e = est1[uf].N2;
  if (e.falha) continue;
  ecologica[uf] = {};
  const b = VIAS.map((v2) => e[v2].beta / 100);
  for (const [iv, via] of VIAS.entries()) {
    let num = 0, den = 0, numV1 = 0, denV1 = 0;
    for (const r of linhasDe[uf].N2) {
      const t = r.s.t2;
      const Yh = r.y + b[iv] * (1 - r.foc[iv]) - VIAS.reduce((s, _, j) => s + (j === iv ? 0 : b[j] * r.foc[j]), 0);
      num += t.log[via] * Yh; den += t.log[via];
      const Y0 = r.y - VIAS.reduce((s, _, j) => s + b[j] * r.foc[j], 0);
      numV1 += t.log.v1 * Y0; denV1 += t.log.v1;
    }
    ecologica[uf][via] = { pNo13: den ? num / den : null, pV1No13: denV1 ? numV1 / denV1 : null };
  }
}

// ---------- sensibilidades (relatadas, sem teste) ----------
const sens = {};
for (const uf of UFS27) {
  sens[uf] = {};
  for (const d of ['N2', 'P']) {
    const rs = linhasDe[uf][d];
    const pega = (f) => (f ? Object.fromEntries(VIAS.map((v2) => [v2, f[v2]])) : null);
    const excD = {};
    const rsDif = montar(porUf.get(uf), d, excD, { aceitarDiferente: true, denominador: DEN });
    sens[uf][d] = {
      clusterMunicipio: pega(ajustar(rs, d, { cluster: (r) => r.mun })),
      efeitoFixoZona: pega(ajustar(rs, d, { grupo: (r) => r.zona })),
      semControles: pega(ajustar(rs, d, { semControles: true })),
      comDiarioDiferente: pega(ajustar(rsDif, d)),
    };
  }
}

// ---------- conferência 2: MG e RS no painel (docs 24 e 26) ----------
const conf2 = { MG: { esperado: { beta: 5.68, z: 4.19 }, obtido: est1.mg.P.v2, N: est1.mg.P.N }, RS: { esperado: { beta: 9.66, z: 3.69, N: 24405 }, obtido: est1.rs.P.v2, N: est1.rs.P.N } };
log(`conferência 2: MG ${est1.mg.P.v2.beta.toFixed(2)} (z ${est1.mg.P.v2.z.toFixed(2)}, N ${est1.mg.P.N}); RS ${est1.rs.P.v2.beta.toFixed(2)} (z ${est1.rs.P.v2.z.toFixed(2)}, N ${est1.rs.P.N})`);

// ---------- conferência 3: injeção de 10% dos V3m do Nordeste no 13 (N2) ----------
const conf3 = (() => {
  const ufs = UFS27.filter((u) => est1[u].N2.v3m);
  const betas = [], ses = [];
  for (const u of ufs) {
    if (!NE.has(u)) { betas.push(est1[u].N2.v3m.beta); ses.push(est1[u].N2.v3m.se); continue; }
    const rs = linhasDe[u].N2;
    const inj = injetar(rs, 'N2', 'v3m', 0.10, 13);
    const f = ajustar(rs, 'N2', { ys: inj.ys, focs: inj.focs });
    betas.push(f.v3m.beta); ses.push(f.v3m.se);
  }
  const m = meta(ufs, betas, ses, { modelo: 'ne' });
  return { antes: est2.N2.v3m.NE.muNE, depois: m.muNE, passa: m.muNE.p <= P_BONF && m.muNE.beta > 0 };
})();
log(`conferência 3: μ_NE V3m N2 ${conf3.antes.beta.toFixed(2)} → ${conf3.depois.beta.toFixed(2)} (t ${conf3.depois.t.toFixed(2)}), passa: ${conf3.passa}`);

// ---------- testes do bloco do modelo (180) ----------
const testes = [];
for (const d of ['N2', 'P']) for (const via of VIAS) {
  for (const uf of UFS27) {
    const c = est1[uf][d][via];
    const m = est1[uf][d].mde?.[via];
    testes.push({ bloco: 'UF', unidade: uf.toUpperCase(), desfecho: d, via, beta: c?.beta, se: c?.se, estat: c?.z, gl: null, p: c ? pNormal2(c.z) : null,
      ne: NE.has(uf), N: est1[uf][d].N, base1: est1[uf].N1[via]?.beta, z1: est1[uf].N1[via]?.z,
      fMDE13: m?.[13].fMDE, votosMDE13: m?.[13].votosMDE, fMDE22: m?.[22].fMDE, votosMDE22: m?.[22].votosMDE });
  }
  const e = est2[d][via];
  testes.push({ bloco: 'meta', unidade: 'μ_BR', desfecho: d, via, beta: e.BR.mu.beta, se: e.BR.mu.se, estat: e.BR.mu.t, gl: e.BR.mu.df, p: e.BR.mu.p,
    base1: est2.N1[via].BR.mu.beta, z1: est2.N1[via].BR.mu.t, fMDE13: e.mde[13].BR.fMDE, votosMDE13: e.mde[13].BR.votos, fMDE22: e.mde[22].BR.fMDE, votosMDE22: e.mde[22].BR.votos });
  testes.push({ bloco: 'meta', unidade: 'μ_NE', desfecho: d, via, beta: e.NE.muNE.beta, se: e.NE.muNE.se, estat: e.NE.muNE.t, gl: e.NE.muNE.df, p: e.NE.muNE.p, ne: true,
    base1: est2.N1[via].NE.muNE.beta, z1: est2.N1[via].NE.muNE.t, fMDE13: e.mde[13].NE.fMDE, votosMDE13: e.mde[13].NE.votos, fMDE22: e.mde[22].NE.fMDE, votosMDE22: e.mde[22].NE.votos });
  testes.push({ bloco: 'meta', unidade: 'δ_NE', desfecho: d, via, beta: e.NE.delta.beta, se: e.NE.delta.se, estat: e.NE.delta.t, gl: e.NE.delta.df, p: e.NE.delta.p,
    base1: est2.N1[via].NE.delta.beta, z1: est2.N1[via].NE.delta.t });
}
log(`testes do bloco do modelo: ${testes.length}`);

const linhasUf = [];
for (const uf of UFS27) for (const d of DESF) for (const via of VIAS) {
  const c = est1[uf][d][via];
  linhasUf.push({ uf, desfecho: d, via, N: est1[uf][d].N, locais: est1[uf][d].locais, beta: c?.beta, se: c?.se, z: c?.z,
    encolhida: est2[d][via].encolhidas[uf], exclusoes: JSON.stringify(est1[uf][d].exc) });
}
await writeFile(path.join(SAIDA, 'ufs.csv'), paraCsv(linhasUf, ['uf', 'desfecho', 'via', 'N', 'locais', 'beta', 'se', 'z', 'encolhida', 'exclusoes']));
await writeFile(path.join(SAIDA, 'cerco.csv'), paraCsv(cerco, ['turno', 'uf', 'grupo', 'secoes', 'liberados', 'minNo13', 'maxNo13', 'pMin', 'pMax', 'leitura']));
const est2Sem = JSON.parse(JSON.stringify(est2, (k, x) => (k === 'L' ? undefined : x)));
await writeFile(path.join(SAIDA, 'modelo.json'), JSON.stringify({ geradoEm: new Date().toISOString(), plano: '89ede09', adendo: DEN === 'aptos' ? 'ed0474c' : null, denominador: DEN, margens, conf1, conf2, conf3, cortes: { P_BONF, Z_B2, tCrit26: T_CRIT[26], tCrit25: T_CRIT[25] },
  est1, est2: est2Sem, equivalencia, ecologica, sens, testes }, null, 1));
log('fim');
