// Estatístico eleitoral, H14(a) do plano 31 (commit 067d1a7): tamanho mínimo de desvio que os testes da H14 enxergam,
// por simulação de placebo com injeção (Bertrand, Duflo e Mullainathan, 2004) nos dados reais.
//
// Em cada réplica: sorteia, entre as seções de controle (mesma urna de seção nos dois turnos), um conjunto placebo do
// tamanho do grupo tratado, estratificado por zona × modelo da urna do 1º turno (a mesma estratificação da permutação do
// doc 07); injeta o desvio (forma F1–F4, concentração ρ, tamanho δ) nos votos do placebo; refaz o teste e anota se rejeita.
// As seções realmente trocadas ficam fora da amostra.
//
// Testes refeitos:
//   trocas novas (2.818): DiD do doc 07 (MQP, peso = denominador do 2º turno, efeito fixo de zona, modelo do 1º turno,
//     log dos aptos, CR1 por zona; rejeita se algum dos 3 desfechos tem p < 0,05/3); seções extremas (resíduo da zona,
//     escala MAD por decil de tamanho, p empírico contra o controle; rejeita se alguma passa o Bonferroni de 21.999);
//     excesso de cauda (|z| > 3 contra o esperado, binomial unilateral, p < 0,05/3 por desfecho); detector combinado.
//   herdadas (2.893; entram as que têm controle no mesmo local): nível do 2º turno contra o mesmo local (efeito fixo de
//     local, log dos aptos, peso, CR1 por zona; rejeita se algum desfecho tem p < 0,05/3). Desvio igual nos dois turnos:
//     o teste de nível do 2º turno só vê o 2º turno.
// O estimador usa Frisch-Waugh-Lovell: com o placebo como única coluna que muda, β, o erro CR1 e o resíduo de cada seção
// saem de somas por grupo pré-calculadas mais somas sobre as seções do placebo (exato; conferido contra a regressão
// completa no início, campo "validacao").
// Aproximação declarada: o peso de cada seção fica o original (na forma F3 o denominador 13+22 e o comparecimento crescem
// com o voto inserido; o efeito no peso é desprezível para δ pequeno).
//
// Uso: node --max-old-space-size=8192 scripts/auditoria/estatistico-h14-h19-final-poder.mjs [--reps 1000] [--parte trocas|herdadas|uf|tudo]
// Saída: data/parsed/auditoria/estatistico/h14-h19-final/poder/*.json
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_FINAL, binomial, inverter, invNormal, lerCsv, mqef, num, pBi, poisson, rng } from './estatistico-h14-h19-final-lib.mjs';

const { values: A } = parseArgs({ options: { reps: { type: 'string', default: '1000' }, parte: { type: 'string', default: 'tudo' } } });
const REPS = Number(A.reps);
const SAIDA = path.join(DIR_FINAL, 'poder');
await mkdir(SAIDA, { recursive: true });
const t0 = Date.now();
const log = (...m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)} s]`, ...m);

// ---------------------------------------------------------------- dados
const BRUTO = await lerCsv(path.join(path.dirname(DIR_FINAL), '..', 'reservas-1t2t', 'secoes.csv'));
const FORA = new Set(['sem_bu', 'sistema_apuracao', 'so_um_turno']);
const S = BRUTO.filter((o) => !FORA.has(o.classe)).map((o) => {
  const s = { uf: o.uf, classe: o.classe, modelo1: o.modelo1, zon: `${o.uf}/${o.municipio}/${o.zona}`, loc: `${o.uf}/${o.municipio}/${o.zona}/${o.local2}` };
  for (const k of ['a1', 'c1', 'v13_1', 'v22_1', 'br1', 'nu1', 'a2', 'c2', 'v13_2', 'v22_2', 'br2', 'nu2']) s[k] = num(o[k]);
  s.trocaNova = s.classe.startsWith('contingencia_dia') || s.classe === 'secao_reserva_antes' || s.classe === 'reserva_reserva_antes';
  s.herdada = s.classe === 'reserva_herdada';
  s.controle = s.classe === 'controle';
  return s;
});
const N = S.length;
log(`seções: ${N}; controle ${S.filter((s) => s.controle).length}; trocas novas ${S.filter((s) => s.trocaNova).length}; herdadas ${S.filter((s) => s.herdada).length}`);
const DESF = ['comp', 's13', 'bn'];
const n2 = (s) => s.v13_2 + s.v22_2, n1 = (s) => s.v13_1 + s.v22_1;
const nivel2 = {
  comp: (s) => (s.a2 > 0 ? (100 * s.c2) / s.a2 : NaN),
  s13: (s) => (n2(s) > 0 ? (100 * s.v13_2) / n2(s) : NaN),
  bn: (s) => (s.c2 > 0 ? (100 * (s.br2 + s.nu2)) / s.c2 : NaN),
};
const nivel1 = {
  comp: (s) => (s.a1 > 0 ? (100 * s.c1) / s.a1 : NaN),
  s13: (s) => (n1(s) > 0 ? (100 * s.v13_1) / n1(s) : NaN),
  bn: (s) => (s.c1 > 0 ? (100 * (s.br1 + s.nu1)) / s.c1 : NaN),
};
const delta = Object.fromEntries(DESF.map((d) => [d, (s) => nivel2[d](s) - nivel1[d](s)]));
const peso = { comp: (s) => s.a2, s13: (s) => n2(s), bn: (s) => s.c2 };
const MODELOS = ['ue2015', 'ue2020', 'ue2022'];

// ---------------------------------------------------------------- motor FWL esparso
class Motor {
  /** idx: índices em S; y(s), w(s); xs(s) → controles; fe(s), cl(s) chaves (fe aninhado em cl). */
  constructor(idx, { y, w, xs, fe, cl }) {
    const rows = idx.filter((i) => { const s = S[i]; return Number.isFinite(y(s)) && w(s) > 0 && xs(s).every(Number.isFinite); });
    const cont = new Map();
    for (const i of rows) cont.set(fe(S[i]), (cont.get(fe(S[i])) ?? 0) + 1);
    this.rows = rows.filter((i) => cont.get(fe(S[i])) >= 2);
    const k = (this.k = xs(S[this.rows[0]]).length);
    this.pos = new Int32Array(N).fill(-1);
    const gid = new Map(), cid = new Map();
    const n = this.rows.length;
    this.g = new Int32Array(n); this.w = new Float64Array(n); this.y0 = new Float64Array(n); this.x = new Float64Array(n * k);
    this.gCl = []; this.W = []; this.Sx = []; this.Sy = [];
    this.rows.forEach((i, p) => {
      const s = S[i];
      this.pos[i] = p;
      const kf = fe(s);
      if (!gid.has(kf)) { gid.set(kf, gid.size); const kc = cl(s); if (!cid.has(kc)) cid.set(kc, cid.size); this.gCl.push(cid.get(kc)); this.W.push(0); this.Sx.push(new Float64Array(k)); this.Sy.push(0); }
      const g = gid.get(kf);
      this.g[p] = g; this.w[p] = w(s); this.y0[p] = y(s);
      const xv = xs(s);
      for (let j = 0; j < k; j++) this.x[p * k + j] = xv[j];
      this.W[g] += this.w[p]; this.Sy[g] += this.w[p] * this.y0[p];
      for (let j = 0; j < k; j++) this.Sx[g][j] += this.w[p] * xv[j];
    });
    const G = (this.G = gid.size); this.C = cid.size;
    // demeaning e X̃'WX̃
    const XtX = Array.from({ length: k }, () => new Array(k).fill(0)), Xty = new Array(k).fill(0);
    for (let p = 0; p < n; p++) {
      const g = this.g[p], wp = this.w[p];
      for (let j = 0; j < k; j++) this.x[p * k + j] -= this.Sx[g][j] / this.W[g];
      const yt = this.y0[p] - this.Sy[g] / this.W[g];
      for (let a = 0; a < k; a++) { Xty[a] += wp * this.x[p * k + a] * yt; for (let b = 0; b < k; b++) XtX[a][b] += wp * this.x[p * k + a] * this.x[p * k + b]; }
    }
    // colunas colineares (ou quase) com o efeito fixo e com as anteriores saem, como no doc 07: complemento de Schur da
    // coluna sobre as já aceitas < 1e-9 do seu Σw·x² (ex.: indicador de modelo que só varia em poucas zonas da UF)
    const kept = [];
    for (let j = 0; j < k; j++) {
      let schur = XtX[j][j];
      if (kept.length) {
        const inv = inverter(kept.map((a) => kept.map((b) => XtX[a][b])));
        const v = kept.map((a) => XtX[a][j]);
        schur -= v.reduce((s2, va, p) => s2 + va * inv[p].reduce((t, ip, q) => t + ip * v[q], 0), 0);
      }
      if (schur > 1e-9 * XtX[j][j]) kept.push(j);
    }
    if (kept.length < k) return new Motor(idx, { y, w, xs: (s) => { const v = xs(s); return kept.map((j) => v[j]); }, fe, cl });
    this.Ainv = inverter(XtX);
    this.b0 = this.Ainv.map((l) => l.reduce((s2, v, j) => s2 + v * Xty[j], 0));
    // Ỹ0 (resíduo completo), a_g = Σ w x̃ Ỹ0, B_g = Σ w x̃ x̃'
    this.yt = new Float64Array(n);
    this.a = Array.from({ length: G }, () => new Float64Array(k));
    this.B = Array.from({ length: G }, () => new Float64Array(k * k));
    for (let p = 0; p < n; p++) {
      const g = this.g[p], wp = this.w[p];
      let v = this.y0[p] - this.Sy[g] / this.W[g];
      for (let j = 0; j < k; j++) v -= this.x[p * k + j] * this.b0[j];
      this.yt[p] = v;
      for (let a = 0; a < k; a++) { this.a[g][a] += wp * this.x[p * k + a] * v; for (let b = 0; b < k; b++) this.B[g][a * k + b] += wp * this.x[p * k + a] * this.x[p * k + b]; }
    }
    this.n = n;
    this.fc = (this.C / (this.C - 1)) * ((n - 1) / (n - (k + 1) - G));
    // somas por agrupamento (para a parte genérica do escore: −γ·(a − Bψ) somado nos grupos do agrupamento)
    this.Ac = new Float64Array(this.C * k); this.Bc = new Float64Array(this.C * k * k);
    for (let g = 0; g < G; g++) { const c = this.gCl[g]; for (let j = 0; j < k; j++) this.Ac[c * k + j] += this.a[g][j]; for (let j = 0; j < k * k; j++) this.Bc[c * k * k + j] += this.B[g][j]; }
  }
  /** P: índices em S do placebo; dY: Map índice → ΔY (só as injetadas). Devolve β, ep, z. */
  estimar(P, dY) {
    const k = this.k, por = new Map();
    for (const i of P) {
      const p = this.pos[i];
      if (p < 0) continue;
      const g = this.g[p], wp = this.w[p], dy = dY.get(i) ?? 0;
      let e = por.get(g);
      if (!e) por.set(g, (e = { SD: 0, SY0: 0, SdY: 0, SX: new Float64Array(k), SXdY: new Float64Array(k) }));
      e.SD += wp; e.SY0 += wp * this.yt[p]; e.SdY += wp * dy;
      for (let j = 0; j < k; j++) { e.SX[j] += wp * this.x[p * k + j]; e.SXdY[j] += wp * this.x[p * k + j] * dy; }
    }
    if (!por.size) return null;
    const sx = new Float64Array(k), sxd = new Float64Array(k);
    for (const e of por.values()) for (let j = 0; j < k; j++) { sx[j] += e.SX[j]; sxd[j] += e.SXdY[j]; }
    const gam = this.Ainv.map((l) => l.reduce((s2, v, j) => s2 + v * sx[j], 0));
    const the = this.Ainv.map((l) => l.reduce((s2, v, j) => s2 + v * sxd[j], 0));
    const dot = (u, v) => { let t = 0; for (let j = 0; j < k; j++) t += u[j] * v[j]; return t; };
    let num_ = 0, den = 0;
    for (const [g, e] of por) {
      num_ += e.SY0 + e.SdY - (e.SD * e.SdY) / this.W[g] - dot(e.SX, the);
      den += e.SD - (e.SD * e.SD) / this.W[g] - dot(e.SX, gam);
    }
    const beta = num_ / den;
    const psi = the.map((v, j) => v - beta * gam[j]);
    // parte genérica por agrupamento, corrigida nos grupos que têm placebo (mesma conta, agrupada; exata)
    const sc = new Float64Array(this.C);
    const kk = k * k;
    for (let c = 0; c < this.C; c++) {
      let s = 0;
      for (let a = 0; a < k; a++) { let t = 0; for (let b = 0; b < k; b++) t += this.Bc[c * kk + a * k + b] * psi[b]; s -= gam[a] * (this.Ac[c * k + a] - t); }
      sc[c] = s;
    }
    const Bpsi = new Float64Array(k);
    for (const [g, e] of por) {
      const Bg = this.B[g];
      for (let a = 0; a < k; a++) { let t = 0; for (let b = 0; b < k; b++) t += Bg[a * k + b] * psi[b]; Bpsi[a] = t; }
      let gen = 0; for (let j = 0; j < k; j++) gen -= gam[j] * (this.a[g][j] - Bpsi[j]);
      const W = this.W[g], db = e.SD / W, c = -e.SdY / W + beta * db;
      let s = e.SY0 + e.SdY - beta * e.SD + c * e.SD - dot(e.SX, psi) - db * (e.SdY - beta * e.SD + c * W);
      for (let j = 0; j < k; j++) s -= gam[j] * (this.a[g][j] + e.SXdY[j] - beta * e.SX[j] - Bpsi[j]);
      sc[this.gCl[g]] += s - gen;
    }
    let V = 0;
    for (let c = 0; c < this.C; c++) V += sc[c] * sc[c];
    const ep = Math.sqrt((this.fc * V) / (den * den));
    return { beta, ep, z: beta / ep };
  }
}

// ---------------------------------------------------------------- injeção
/** Altera uma cópia dos votos do 2º turno da seção s com o desvio por seção dsec (p.p. da parcela do 13). */
function injetar(s, forma, dsec, r) {
  const v = { v13: s.v13_2, v22: s.v22_2, c2: s.c2, nu2: s.nu2 };
  const n = v.v13 + v.v22, p = n > 0 ? v.v13 / n : 0, d = dsec / 100;
  let mov = 0;
  if (forma === 'F1') { mov = binomial(r, v.v22, Math.min(1, (d * n) / Math.max(v.v22, 1))); v.v13 += mov; v.v22 -= mov; }
  else if (forma === 'F2') { mov = binomial(r, v.v13, Math.min(1, (d * n) / Math.max(v.v13, 1))); v.v13 -= mov; v.v22 += mov; }
  else if (forma === 'F3') { const lam = 1 - p - d > 0.001 ? (d * n) / (1 - p - d) : Infinity; mov = Math.min(poisson(r, Math.min(lam, 1e6)), Math.max(0, s.a2 - s.c2)); v.v13 += mov; v.c2 += mov; }
  else if (forma === 'F4') { const alvo = p + d < 1 ? n - v.v13 / (p + d) : v.v22; mov = binomial(r, v.v22, Math.min(1, Math.max(0, alvo) / Math.max(v.v22, 1))); v.v22 -= mov; v.nu2 += mov; }
  const nn = v.v13 + v.v22;
  const novo = { comp: s.a2 > 0 ? (100 * v.c2) / s.a2 : NaN, s13: nn > 0 ? (100 * v.v13) / nn : NaN, bn: v.c2 > 0 ? (100 * (s.br2 + v.nu2)) / v.c2 : NaN };
  return { dY: Object.fromEntries(DESF.map((k) => [k, novo[k] - nivel2[k](s)])), mov, dS13votos: nn > 0 ? (v.v13 / nn - s.v13_2 / Math.max(n, 1)) * nn : 0 };
}

// ---------------------------------------------------------------- sorteio estratificado
function sorteador(tratados, poolIdx, chave, chaveLarga) {
  const pool = new Map(), poolL = new Map();
  for (const i of poolIdx) { const k = chave(S[i]); if (!pool.has(k)) pool.set(k, []); pool.get(k).push(i); const kl = chaveLarga(S[i]); if (!poolL.has(kl)) poolL.set(kl, []); poolL.get(kl).push(i); }
  const pedido = new Map();
  for (const i of tratados) { const k = chave(S[i]); pedido.set(k, (pedido.get(k) ?? 0) + 1); }
  let semPool = 0, largos = 0;
  const plano = [];
  for (const [k, q] of pedido) {
    const l = pool.get(k) ?? [];
    const kl = k.split('|')[0];
    const tomar = Math.min(q, l.length);
    if (tomar) plano.push({ lista: l, q: tomar });
    if (q > tomar) { const ll = poolL.get(kl); if (ll && ll.length) { plano.push({ lista: ll, q: Math.min(q - tomar, ll.length) }); largos += q - tomar; } else semPool += q - tomar; }
  }
  return {
    semPool, largos,
    sortear(r) {
      const usado = new Set(), out = [];
      for (const { lista, q } of plano) {
        let got = 0, guard = 0;
        while (got < q && guard < q * 50) { const i = lista[Math.floor(r() * lista.length)]; guard++; if (usado.has(i)) continue; usado.add(i); out.push(i); got++; }
      }
      return out;
    },
  };
}
const embaralhar = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------------------------------------------------------------- detector de seções extremas (doc 07)
function detectorExtremas(motor, d) {
  const k = motor.k, n = motor.n;
  // u = y − X·b (X bruto), zona = grupo do motor
  const u = new Float64Array(n), Su = new Float64Array(motor.G);
  for (let p = 0; p < n; p++) {
    const s = S[motor.rows[p]];
    const xr = [...MODELOS.map((m) => (s.modelo1 === m ? 1 : 0)), Math.log(Math.max(s.a2, 1))];
    let v = motor.y0[p]; for (let j = 0; j < k; j++) v -= xr[j] * motor.b0[j];
    u[p] = v; Su[motor.g[p]] += motor.w[p] * v;
  }
  const ws = Float64Array.from(motor.w).sort();
  const cortes = Array.from({ length: 9 }, (_, i) => ws[Math.floor(((i + 1) / 10) * ws.length)]);
  const faixa = (w) => { let f = 0; while (f < 9 && w > cortes[f]) f++; return f; };
  const porF = Array.from({ length: 10 }, () => []);
  const res = new Float64Array(n);
  for (let p = 0; p < n; p++) { res[p] = u[p] - Su[motor.g[p]] / motor.W[motor.g[p]]; porF[faixa(motor.w[p])].push(res[p]); }
  const med = (a) => { const b = Float64Array.from(a).sort(); return b[Math.floor(b.length / 2)]; };
  const escala = porF.map((a) => { const m = med(a); return 1.4826 * med(a.map((v) => Math.abs(v - m))); });
  const absRef = new Float64Array(n);
  for (let p = 0; p < n; p++) absRef[p] = Math.abs(res[p] / escala[faixa(motor.w[p])]);
  absRef.sort();
  const pEmp = (a) => { let lo = 0, hi = n; while (lo < hi) { const m = (lo + hi) >> 1; if (absRef[m] < a) lo = m + 1; else hi = m; } return (n - lo + 1) / (n + 1); };
  const p3 = pEmp(3);
  return {
    desfecho: d, p0: p3,
    avaliar(P, dY) {
      const por = new Map();
      for (const i of P) { const p = motor.pos[i]; if (p < 0) continue; const g = motor.g[p]; const e = por.get(g) ?? { sw: 0, swu: 0 }; e.sw += motor.w[p]; e.swu += motor.w[p] * u[p]; por.set(g, e); }
      let minP = 1, alem3 = 0, m = 0;
      for (const i of P) {
        const p = motor.pos[i]; if (p < 0) continue;
        const g = motor.g[p], e = por.get(g);
        const Wn = motor.W[g] - e.sw;
        if (Wn <= 0) continue;
        const r = u[p] + (dY.get(i) ?? 0) - (Su[g] - e.swu) / Wn;
        const z = Math.abs(r / escala[faixa(motor.w[p])]);
        m++; if (z > 3) alem3++;
        const pe = pEmp(z); if (pe < minP) minP = pe;
      }
      const zc = (alem3 - m * p3) / Math.sqrt(m * p3 * (1 - p3));
      return { minP, zCauda: zc };
    },
  };
}

// ---------------------------------------------------------------- montagem
const ctrlIdx = [], trocaIdx = [], herdIdx = [];
S.forEach((s, i) => { if (s.controle) ctrlIdx.push(i); if (s.trocaNova) trocaIdx.push(i); if (s.herdada) herdIdx.push(i); });
// indicadores de modelo: os presentes, menos o primeiro; num subconjunto (UF), só os que variam dentro de alguma zona
// (senão ficam colineares com o efeito fixo de zona, como no doc 07)
const xsDiD = (lista) => {
  let mods = ['ue2013', ...MODELOS].filter((m) => lista.some((i) => S[i].modelo1 === m)).slice(1);
  const porZona = new Map();
  for (const i of lista) { const z = S[i].zon; if (!porZona.has(z)) porZona.set(z, new Set()); porZona.get(z).add(S[i].modelo1); }
  const varia = (m) => [...porZona.values()].some((ms) => ms.has(m) && ms.size > 1);
  mods = mods.filter(varia);
  const usados = [];
  for (const m of mods) { const cand = [...usados, m]; if ([...porZona.values()].some((ms) => ms.size > 1 && [...ms].some((x) => !cand.includes(x)))) usados.push(m); }
  return (s) => [...usados.map((m) => (s.modelo1 === m ? 1 : 0)), Math.log(Math.max(s.a2, 1))];
};
const xsNivel = (s) => [Math.log(Math.max(s.a2, 1))];
const ALFA3 = 0.05 / 3, Z3 = -invNormal(ALFA3 / 2), Z3uni = -invNormal(ALFA3);
const BONF_SEC = 0.05 / 21999;
const GRADE = [0, 0.02, 0.05, 0.08, 0.1, 0.12, 0.15, 0.2, 0.3, 0.5, 1.0];
const FORMAS = ['F1', 'F2', 'F3', 'F4'];
const RHOS = [1, 0.2, 0.05, 0.01];

function motoresDiD(idxBase) {
  const xs = xsDiD(idxBase);
  return Object.fromEntries(DESF.map((d) => [d, new Motor(idxBase, { y: delta[d], w: peso[d], xs, fe: (s) => s.zon, cl: (s) => s.zon })]));
}
function motoresNivel(idxBase) {
  return Object.fromEntries(DESF.map((d) => [d, new Motor(idxBase, { y: nivel2[d], w: peso[d], xs: xsNivel, fe: (s) => s.loc, cl: (s) => s.zon })]));
}

// validação: motor (FWL esparso) × regressão completa (mqef da lib) no mesmo conjunto, com o tratamento real como placebo
function validar(idxAmostra, P, tipo) {
  const out = {};
  const ms = tipo === 'did' ? motoresDiD(idxAmostra) : motoresNivel(idxAmostra);
  const Pset = new Set(P);
  for (const d of DESF) {
    const r1 = ms[d].estimar(P, new Map());
    const xs = tipo === 'did' ? xsDiD(idxAmostra) : xsNivel;
    const f = tipo === 'did' ? delta[d] : nivel2[d];
    const r2 = mqef(idxAmostra.map((i) => ({ i, s: S[i] })), { y: (o) => f(o.s), x: (o) => [Pset.has(o.i) ? 1 : 0, ...xs(o.s)], w: (o) => peso[d](o.s), g: (o) => (tipo === 'did' ? o.s.zon : o.s.loc), cl: (o) => o.s.zon });
    out[d] = { motor: { beta: r1.beta, ep: r1.ep }, completa: { beta: r2.beta[0], ep: r2.ep[0] }, difBeta: r1.beta - r2.beta[0], difEp: r1.ep - r2.ep[0] };
  }
  return out;
}

const resultado = { geradoEm: new Date().toISOString(), plano: 'docs/analysis/estatistico-eleitoral/31-h14-h19-plano-final.md (commit 067d1a7)', reps: REPS, semente: 20261102, grade: GRADE, formas: FORMAS, rhos: RHOS };

// conferência com o doc 07 (amostra do doc 07, trocaNova + outras) e com o parecer 30 (herdadas no nível)
{
  const U = S.map((s, i) => ({ s, i }));
  resultado.conferencia = { doc07: {}, parecer30: {} };
  for (const d of DESF) {
    const xs = xsDiD(S.map((_, i) => i));
    const r = mqef(U, { y: (o) => delta[d](o.s), x: (o) => [o.s.trocaNova ? 1 : 0, !o.s.trocaNova && !o.s.controle ? 1 : 0, ...xs(o.s)], w: (o) => peso[d](o.s), g: (o) => o.s.zon, cl: (o) => o.s.zon });
    resultado.conferencia.doc07[d] = { beta: r.beta[0], ep: r.ep[0], ic95: [r.beta[0] - 1.96 * r.ep[0], r.beta[0] + 1.96 * r.ep[0]] };
  }
  const base = S.map((_, i) => i).filter((i) => S[i].controle || S[i].herdada);
  for (const d of DESF) {
    const r = mqef(base.map((i) => S[i]), { y: nivel2[d], x: (s) => [s.herdada ? 1 : 0, Math.log(Math.max(s.a2, 1))], w: peso[d], g: (s) => s.loc, cl: (s) => s.zon });
    resultado.conferencia.parecer30[d] = { beta: r.beta[0], ep: r.ep[0], ic95: [r.beta[0] - 1.96 * r.ep[0], r.beta[0] + 1.96 * r.ep[0]] };
  }
  log('conferência', JSON.stringify(resultado.conferencia));
  resultado.validacao = {
    did: validar([...ctrlIdx, ...trocaIdx], trocaIdx, 'did'),
    nivel: validar([...ctrlIdx, ...herdIdx], herdIdx, 'nivel'),
  };
  log('validação', JSON.stringify(resultado.validacao));
}

function rodarGrade({ nome, tratados, motores, extremas, sort, reps, formas, rhos, grade, desfechos = DESF, alfa = ALFA3 }) {
  const zc = -invNormal(alfa / 2);
  const r = rng(20261102 + nome.length * 7919);
  const curvas = [];
  const nulo = new Map();
  const limiarCauda = new Map();
  for (const forma of formas) for (const rho of rhos) for (const delta_ of grade) {
    if (delta_ === 0 && nulo.has(rho)) { curvas.push({ ...nulo.get(rho), forma, rho, delta: 0 }); continue; }
    let rejDid = 0, rejExt = 0, rejCauda = 0, rejComb = 0, rejCaudaCal = 0, rejCombCal = 0, votos = 0, mov = 0;
    const zNulo = [];
    const rejPor = Object.fromEntries(desfechos.map((d) => [d, 0]));
    for (let rep = 0; rep < reps; rep++) {
      const P = sort.sortear(r);
      const atingidas = rho < 1 ? embaralhar([...P], r).slice(0, Math.max(1, Math.round(rho * P.length))) : P;
      const dY = Object.fromEntries(desfechos.map((d) => [d, new Map()]));
      if (delta_ > 0) {
        for (const i of atingidas) {
          const inj = injetar(S[i], forma, delta_ / rho, r);
          for (const d of desfechos) if (Number.isFinite(inj.dY[d]) && inj.dY[d] !== 0) dY[d].set(i, inj.dY[d]);
          votos += inj.dS13votos; mov += inj.mov;
        }
      }
      let did = false, ext = false, cauda = false, zMax = -Infinity;
      for (const d of desfechos) {
        const e = motores[d].estimar(P, dY[d]);
        if (e && Math.abs(e.z) >= zc) { did = true; rejPor[d]++; }
        if (extremas) {
          const x = extremas[d].avaliar(P, dY[d]);
          if (x.minP * 21999 < 0.05) ext = true;
          if (x.zCauda >= Z3uni) cauda = true;
          zMax = Math.max(zMax, x.zCauda);
        }
      }
      if (did) rejDid++; if (ext) rejExt++; if (cauda) rejCauda++; if (did || ext || cauda) rejComb++;
      if (extremas && delta_ === 0) zNulo.push([zMax, did || ext]);
      // calibração do excesso de cauda (plano 31: se o nulo não fica perto do α nominal, vale o corte empírico): o corte é o
      // quantil 95% do maior z de cauda entre os 3 desfechos nas réplicas nulas da mesma concentração ρ
      if (extremas && delta_ > 0) { const cal = zMax >= limiarCauda.get(rho); if (cal) rejCaudaCal++; if (did || ext || cal) rejCombCal++; }
    }
    if (extremas && delta_ === 0) {
      const zs = zNulo.map(([z]) => z).sort((a, b) => a - b);
      limiarCauda.set(rho, zs[Math.floor(0.95 * zs.length)]);
      rejCaudaCal = zNulo.filter(([z]) => z >= limiarCauda.get(rho)).length;
      rejCombCal = zNulo.filter(([z, de]) => de || z >= limiarCauda.get(rho)).length;
    }
    const linha = { forma, rho, delta: delta_, poderDid: rejDid / reps, poderExtremas: rejExt / reps, poderCauda: rejCauda / reps, poderCombinado: rejComb / reps,
      ...(extremas ? { poderCaudaCalibrado: rejCaudaCal / reps, poderCombinadoCalibrado: rejCombCal / reps, limiarCauda: limiarCauda.get(rho) } : {}),
      poderPorDesfecho: Object.fromEntries(desfechos.map((d) => [d, rejPor[d] / reps])), votosParcela13Medios: votos / reps, votosMovidosMedios: mov / reps };
    if (delta_ === 0) nulo.set(rho, linha);
    curvas.push(linha);
  }
  log(`${nome}: ${curvas.length} pontos`);
  return curvas;
}
/** MDE: menor δ com poder ≥ 0,8 (interpolação linear), e os votos correspondentes. */
function mde(curvas, campo) {
  const out = [];
  const grupos = new Map();
  for (const c of curvas) { const k = `${c.forma}|${c.rho}`; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(c); }
  for (const [k, l] of grupos) {
    l.sort((a, b) => a.delta - b.delta);
    let m = null;
    for (let i = 1; i < l.length; i++) {
      if (l[i][campo] >= 0.8 && l[i - 1][campo] < 0.8) {
        const f = (0.8 - l[i - 1][campo]) / (l[i][campo] - l[i - 1][campo]);
        m = { delta: l[i - 1].delta + f * (l[i].delta - l[i - 1].delta), votosParcela13: l[i - 1].votosParcela13Medios + f * (l[i].votosParcela13Medios - l[i - 1].votosParcela13Medios), votosMovidos: l[i - 1].votosMovidosMedios + f * (l[i].votosMovidosMedios - l[i - 1].votosMovidosMedios) };
        break;
      }
      if (i === 1 && l[0][campo] >= 0.8) { m = { delta: 0, nota: 'poder ≥ 0,8 já em δ = 0 (detector sem calibração)' }; break; }
    }
    const [forma, rho] = k.split('|');
    out.push({ forma, rho: Number(rho), campo, mde: m ?? { delta: null, nota: `poder < 0,8 até δ = ${l.at(-1).delta}` }, poderNulo: l[0][campo] });
  }
  return out;
}

const parte = A.parte;
if (parte === 'trocas' || parte === 'tudo') {
  const ms = motoresDiD(ctrlIdx);
  const ex = Object.fromEntries(DESF.map((d) => [d, detectorExtremas(ms[d], d)]));
  const sort = sorteador(trocaIdx, ctrlIdx, (s) => `${s.zon}|${s.modelo1}`, (s) => s.zon);
  resultado.trocas = { tratados: trocaIdx.length, sorteioLargo: sort.largos, semPool: sort.semPool };
  resultado.trocas.curvas = rodarGrade({ nome: 'trocas', tratados: trocaIdx, motores: ms, extremas: ex, sort, reps: REPS, formas: FORMAS, rhos: RHOS, grade: GRADE });
  resultado.trocas.mde = ['poderDid', 'poderExtremas', 'poderCauda', 'poderCombinado', 'poderCaudaCalibrado', 'poderCombinadoCalibrado'].flatMap((c) => mde(resultado.trocas.curvas, c));
  // robustez: placebo só de UE2013 e UE2015 (as urnas mais trocadas), F1, ρ = 100%
  const velhas = ctrlIdx.filter((i) => S[i].modelo1 === 'ue2013' || S[i].modelo1 === 'ue2015');
  const sortV = sorteador(trocaIdx, velhas, (s) => s.zon, (s) => s.zon);
  resultado.trocas.robustezVelhas = { semPool: sortV.semPool, curvas: rodarGrade({ nome: 'trocas-velhas', tratados: trocaIdx, motores: ms, extremas: null, sort: sortV, reps: REPS, formas: ['F1'], rhos: [1], grade: GRADE }) };
  resultado.trocas.robustezVelhas.mde = mde(resultado.trocas.robustezVelhas.curvas, 'poderDid');
  await writeFile(path.join(SAIDA, 'poder-trocas.json'), JSON.stringify({ ...resultado, herdadas: undefined }, null, 1));
}
if (parte === 'herdadas' || parte === 'tudo') {
  const ms = motoresNivel(ctrlIdx);
  const locCtrl = new Map();
  for (const i of ctrlIdx) locCtrl.set(S[i].loc, (locCtrl.get(S[i].loc) ?? 0) + 1);
  const eleg = herdIdx.filter((i) => (locCtrl.get(S[i].loc) ?? 0) >= 1);
  const pool = ctrlIdx.filter((i) => locCtrl.get(S[i].loc) >= 2);
  const sort = sorteador(eleg, pool, (s) => `${s.zon}|${s.modelo1}`, (s) => s.zon);
  resultado.herdadas = { tratados: herdIdx.length, elegiveis: eleg.length, sorteioLargo: sort.largos, semPool: sort.semPool };
  resultado.herdadas.curvas = rodarGrade({ nome: 'herdadas', tratados: eleg, motores: ms, extremas: null, sort, reps: REPS, formas: FORMAS, rhos: RHOS, grade: GRADE });
  resultado.herdadas.mde = mde(resultado.herdadas.curvas, 'poderDid');
  await writeFile(path.join(SAIDA, 'poder-herdadas.json'), JSON.stringify({ ...resultado, trocas: undefined }, null, 1));
}
if (parte === 'uf' || parte === 'tudo') {
  const reps = Math.max(100, Math.round(REPS / 2));
  const out = { reps, porModelo: [], porUf: [] };
  const ms = motoresDiD(ctrlIdx);
  for (const m of ['ue2013', 'ue2015', 'ue2020', 'ue2022']) {
    const tr = trocaIdx.filter((i) => S[i].modelo1 === m);
    const sort = sorteador(tr, ctrlIdx.filter((i) => S[i].modelo1 === m), (s) => `${s.zon}|${s.modelo1}`, (s) => s.zon);
    const curvas = rodarGrade({ nome: `modelo-${m}`, tratados: tr, motores: { s13: ms.s13 }, extremas: null, sort, reps, formas: ['F1'], rhos: [1], grade: GRADE, desfechos: ['s13'], alfa: 0.05 / 12 });
    out.porModelo.push({ modelo: m, trocas: tr.length, alfa: 0.05 / 12, curvas, mde: mde(curvas, 'poderDid')[0] });
  }
  const GR_UF = [...GRADE, 2, 3, 5, 8];
  for (const uf of [...new Set(S.map((s) => s.uf))].sort()) {
    const tr = trocaIdx.filter((i) => S[i].uf === uf);
    if (!tr.length) continue;
    const ctl = ctrlIdx.filter((i) => S[i].uf === uf);
    const mU = { s13: new Motor(ctl, { y: delta.s13, w: peso.s13, xs: xsDiD(ctl), fe: (s) => s.zon, cl: (s) => s.zon }) };
    if (process.env.DEPURAR_UF) { const sd = sorteador(tr, ctl, (s) => `${s.zon}|${s.modelo1}`, (s) => s.zon); console.log(uf, mU.s13.k, mU.s13.n, mU.s13.G, mU.s13.C, JSON.stringify(mU.s13.estimar(sd.sortear(rng(1)), new Map()))); continue; }
    const sort = sorteador(tr, ctl, (s) => `${s.zon}|${s.modelo1}`, (s) => s.zon);
    const curvas = rodarGrade({ nome: `uf-${uf}`, tratados: tr, motores: mU, extremas: null, sort, reps, formas: ['F1'], rhos: [1], grade: GR_UF, desfechos: ['s13'], alfa: 0.05 / 28 });
    const base13 = tr.reduce((a, i) => a + n2(S[i]), 0);
    out.porUf.push({ uf, trocas: tr.length, base13mais22: base13, alfa: 0.05 / 28, curvas, mde: mde(curvas, 'poderDid')[0] });
  }
  await writeFile(path.join(SAIDA, 'poder-uf-modelo.json'), JSON.stringify(out, null, 1));
}
log('fim');
