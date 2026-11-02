// Cético, parecer 58: reprodução própria de UM ponto da grade de poder da H14(a) (doc 32) e teste do pressuposto da
// simulação (o ruído do placebo é o mesmo do grupo tratado real). Código próprio (não importa a lib do autor).
//   trocas novas (2.818): DiD da parcela do 13 (2º − 1º turno), MQP peso 13+22 do 2º turno, efeito fixo de zona,
//     indicadores de modelo do 1º turno, log dos aptos, CR1 por zona; rejeita se |z| ≥ z(0,05/3 bicaudal).
//     Placebo: sorteio estratificado zona × modelo do 1º turno entre as seções de controle (falta → mesma zona); forma F1
//     (X ~ Binomial(v22, π) votos do 22 para o 13, π = δ·n/v22), ρ = 100%, δ ∈ {0; 0,10}.
//   herdadas (2.893): nível da parcela do 13 no 2º turno, efeito fixo de local, log dos aptos, CR1 por zona; só o erro
//     no nulo (δ = 0), contra o erro do teste real.
// Uso: node --max-old-space-size=8192 scripts/auditoria/cetico-58-poder.mjs [--reps 400]
// Saída: data/parsed/auditoria/cetico-revisor/58/poder.json
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { Phi, csv, mqp, n, zQuantil } from './cetico-58-lib.mjs';

const { values: ARG } = parseArgs({ options: { reps: { type: 'string', default: '400' }, exato: { type: 'boolean', default: false } } });
const REPS = Number(ARG.reps);
const P = path.join(DIR_DADOS, 'parsed', 'auditoria');
const SAIDA = path.join(P, 'cetico-revisor', '58');
await mkdir(SAIDA, { recursive: true });
const t0 = Date.now();
const log = (...m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)} s]`, ...m);

const FORA = new Set(['sem_bu', 'sistema_apuracao', 'so_um_turno']);
const S = (await csv(path.join(P, 'reservas-1t2t', 'secoes.csv'))).filter((o) => !FORA.has(o.classe)).map((o) => {
  const s = { classe: o.classe, m1: o.modelo1, zon: `${o.uf}/${o.municipio}/${o.zona}`, loc: `${o.uf}/${o.municipio}/${o.zona}/${o.local2}` };
  for (const k of ['a2', 'v13_1', 'v22_1', 'v13_2', 'v22_2']) s[k] = n(o[k]);
  s.n1 = s.v13_1 + s.v22_1; s.n2 = s.v13_2 + s.v22_2;
  s.y = s.n1 > 0 && s.n2 > 0 ? 100 * (s.v13_2 / s.n2 - s.v13_1 / s.n1) : NaN;
  s.lv = s.n2 > 0 ? (100 * s.v13_2) / s.n2 : NaN;
  s.ctl = o.classe === 'controle';
  s.troca = o.classe.startsWith('contingencia_dia') || o.classe === 'secao_reserva_antes' || o.classe === 'reserva_reserva_antes';
  s.herd = o.classe === 'reserva_herdada';
  return s;
});
const ctl = S.filter((s) => s.ctl && Number.isFinite(s.y) && s.n2 > 0);
const tro = S.filter((s) => s.troca && Number.isFinite(s.y) && s.n2 > 0);
const her = S.filter((s) => s.herd && Number.isFinite(s.lv) && s.n2 > 0);
const MOD = ['ue2015', 'ue2020', 'ue2022'];
const xc = (s) => [...MOD.map((m) => (s.m1 === m ? 1 : 0)), Math.log(Math.max(s.a2, 1))];
const R = { geradoEm: new Date().toISOString(), reps: REPS, secoes: { controle: ctl.length, trocas: tro.length, herdadas: her.length },
  base13mais22: { trocas2t: tro.reduce((a, s) => a + s.n2, 0), herdadas2t: her.reduce((a, s) => a + s.n2, 0) } };

// ---------- testes reais (código próprio): DiD trocas × controle; nível herdadas × controle
const real = mqp([...ctl, ...tro].map((s) => ({ y: s.y, x: [s.troca ? 1 : 0, ...xc(s)], w: s.n2, fe: s.zon, cl: s.zon })));
const realH = mqp([...ctl, ...her].map((s) => ({ y: s.lv, x: [s.herd ? 1 : 0, Math.log(Math.max(s.a2, 1))], w: s.n2, fe: s.loc, cl: s.zon })));
R.real = { trocas: { beta: real.beta[0], ep: real.ep[0], z: real.z[0], epAreg: real.beta[0] / real.zAreg[0] }, herdadas: { beta: realH.beta[0], ep: realH.ep[0], epAreg: realH.beta[0] / realH.zAreg[0] } };
log('real', JSON.stringify(R.real));

// ---------- motor rápido: MQP com efeito fixo, uma coluna que muda (placebo) + controles fixos; CR1 por agrupamento
function motor(lista, { y, xs, fe, cl, w }) {
  const cont = new Map(); for (const s of lista) cont.set(fe(s), (cont.get(fe(s)) ?? 0) + 1);
  const L = lista.filter((s) => cont.get(fe(s)) >= 2);
  const N = L.length, k = xs(L[0]).length;
  const gId = new Map(), cId = new Map();
  const g = new Int32Array(N), c = new Int32Array(N), W = new Float64Array(N), Y = new Float64Array(N), X = new Float64Array(N * k);
  L.forEach((s, i) => { if (!gId.has(fe(s))) gId.set(fe(s), gId.size); if (!cId.has(cl(s))) cId.set(cl(s), cId.size); g[i] = gId.get(fe(s)); c[i] = cId.get(cl(s)); W[i] = w(s); Y[i] = y(s); const v = xs(s); for (let j = 0; j < k; j++) X[i * k + j] = v[j]; });
  const G = gId.size, C = cId.size;
  const sw = new Float64Array(G), sy = new Float64Array(G), sx = new Float64Array(G * k);
  for (let i = 0; i < N; i++) { sw[g[i]] += W[i]; sy[g[i]] += W[i] * Y[i]; for (let j = 0; j < k; j++) sx[g[i] * k + j] += W[i] * X[i * k + j]; }
  for (let i = 0; i < N; i++) { Y[i] -= sy[g[i]] / sw[g[i]]; for (let j = 0; j < k; j++) X[i * k + j] -= sx[g[i] * k + j] / sw[g[i]]; }
  const pos = new Map(); L.forEach((s, i) => pos.set(s, i));
  return { N, k, G, C, g, c, W, Y, X, sw, pos, L };
}
function estimar(M, placebo, dy) { // placebo: índices no motor; dy: Map índice → Δy
  const { N, k, G, C, g, c, W, Y, X, sw } = M;
  const K = k + 1;
  const sd = new Float64Array(G), sdy = new Float64Array(G);
  const D = new Float64Array(N); for (const i of placebo) { D[i] = 1; sd[g[i]] += W[i]; }
  for (const [i, v] of dy) sdy[g[i]] += W[i] * v;
  const A = Array.from({ length: K }, () => new Float64Array(K)), b = new Float64Array(K);
  const xi = new Float64Array(K);
  const yt = new Float64Array(N), dt = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const gi = g[i];
    dt[i] = D[i] - sd[gi] / sw[gi];
    yt[i] = Y[i] + (dy.get(i) ?? 0) - sdy[gi] / sw[gi];
    xi[0] = dt[i]; for (let j = 0; j < k; j++) xi[j + 1] = X[i * k + j];
    const w = W[i];
    for (let a = 0; a < K; a++) { const wa = w * xi[a]; b[a] += wa * yt[i]; for (let q = 0; q <= a; q++) A[a][q] += wa * xi[q]; }
  }
  for (let a = 0; a < K; a++) for (let q = a + 1; q < K; q++) A[a][q] = A[q][a];
  // inversa por Gauss
  const M2 = Array.from({ length: K }, (_, i) => [...A[i], ...Array.from({ length: K }, (_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < K; col++) {
    let p = col; for (let r = col + 1; r < K; r++) if (Math.abs(M2[r][col]) > Math.abs(M2[p][col])) p = r;
    [M2[col], M2[p]] = [M2[p], M2[col]];
    const d = M2[col][col]; for (let j = 0; j < 2 * K; j++) M2[col][j] /= d;
    for (let r = 0; r < K; r++) if (r !== col) { const f = M2[r][col]; if (f) for (let j = 0; j < 2 * K; j++) M2[r][j] -= f * M2[col][j]; }
  }
  const Ai = M2.map((l) => l.slice(K));
  const beta = Ai.map((l) => l.reduce((s, v, j) => s + v * b[j], 0));
  const sc = new Float64Array(C * K);
  for (let i = 0; i < N; i++) {
    xi[0] = dt[i]; for (let j = 0; j < k; j++) xi[j + 1] = X[i * k + j];
    let e = yt[i]; for (let a = 0; a < K; a++) e -= xi[a] * beta[a];
    const w = W[i] * e, ci = c[i] * K;
    for (let a = 0; a < K; a++) sc[ci + a] += w * xi[a];
  }
  let v = 0;
  for (let cc = 0; cc < C; cc++) { let u = 0; for (let a = 0; a < K; a++) u += Ai[0][a] * sc[cc * K + a]; v += u * u; }
  const fcAreg = (C / (C - 1)) * ((N - 1) / (N - K - G));
  const ep = Math.sqrt(fcAreg * v);
  return { beta: beta[0], ep, z: beta[0] / ep };
}
// ---------- sorteio estratificado (xorshift32 com semente fixa, próprio)
let st = 58020261102 >>> 0;
const rnd = () => { st ^= st << 13; st >>>= 0; st ^= st >>> 17; st ^= st << 5; st >>>= 0; return st / 4294967296; };
const nrm = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };
// --exato: binomial por inversão da função de distribuição (sem aproximação normal; a aproximação arredondada
// tem viés para cima quando m·p é pequeno, que é o caso de δ ≈ 0,1 p.p.)
const binomExato = (m, p) => { const u = rnd(); let k = 0, pk = Math.pow(1 - p, m), F = pk; while (u > F && k < m) { pk *= ((m - k) / (k + 1)) * (p / (1 - p)); k++; F += pk; } return k; };
const binom = (m, p) => { if (m <= 0 || p <= 0) return 0; if (p >= 1) return m; if (ARG.exato) return binomExato(m, p); if (m < 60) { let x = 0; for (let i = 0; i < m; i++) if (rnd() < p) x++; return x; } return Math.max(0, Math.min(m, Math.round(m * p + Math.sqrt(m * p * (1 - p)) * nrm()))); };
function plano(tratados, pool, chave, larga) {
  const pm = new Map(), pl = new Map();
  for (const s of pool) { const a = chave(s), b = larga(s); if (!pm.has(a)) pm.set(a, []); pm.get(a).push(s); if (!pl.has(b)) pl.set(b, []); pl.get(b).push(s); }
  const ped = new Map(); for (const s of tratados) { const a = chave(s); const e = ped.get(a) ?? { q: 0, larga: larga(s) }; e.q++; ped.set(a, e); }
  const etapas = []; let largos = 0, sem = 0;
  for (const [a, { q, larga: b }] of ped) { const l = pm.get(a) ?? []; const t = Math.min(q, l.length); if (t) etapas.push([l, t]); if (q > t) { const ll = pl.get(b) ?? []; if (ll.length) { etapas.push([ll, Math.min(q - t, ll.length)]); largos += q - t; } else sem += q - t; } }
  return { largos, sem, sortear() { const u = new Set(); for (const [l, q] of etapas) { let k = 0, guarda = 0; while (k < q && guarda++ < 100 * q) { const s = l[Math.floor(rnd() * l.length)]; if (u.has(s)) continue; u.add(s); k++; } } return [...u]; } };
}

// ---------- trocas: δ = 0 e δ = 0,10 (F1, ρ = 100%)
const zc = -zQuantil(0.05 / 3 / 2);
const Mt = motor(ctl, { y: (s) => s.y, xs: xc, fe: (s) => s.zon, cl: (s) => s.zon, w: (s) => s.n2 });
const pt = plano(tro, Mt.L, (s) => `${s.zon}|${s.m1}`, (s) => s.zon);
R.trocas = { corte: zc, sorteioLargo: pt.largos, semPool: pt.sem, pontos: {} };
for (const delta of [0, 0.1, 0.123]) {
  let rej = 0, mov = 0, baseN = 0; const eps = [], betas = [];
  for (let r = 0; r < REPS; r++) {
    const Pl = pt.sortear();
    const idx = Pl.map((s) => Mt.pos.get(s)); baseN += Pl.reduce((a, s) => a + s.n2, 0);
    const dy = new Map();
    if (delta > 0) for (const s of Pl) { const d = delta / 100; const x = binom(s.v22_2, Math.min(1, (d * s.n2) / Math.max(1, s.v22_2))); mov += x; if (x) dy.set(Mt.pos.get(s), (100 * x) / s.n2); }
    const e = estimar(Mt, idx, dy);
    if (Math.abs(e.z) >= zc) rej++;
    eps.push(e.ep); betas.push(e.beta);
  }
  const m = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const sdb = Math.sqrt(m(betas.map((b) => (b - m(betas)) ** 2)));
  R.trocas.pontos[delta] = { poder: rej / REPS, epMedio: m(eps), dpBeta: sdb, votosMovidosMedios: mov / REPS, base13mais22Placebo: baseN / REPS, betaMedio: m(betas), desvioRealPp: (100 * mov) / baseN };
  log('trocas δ', delta, JSON.stringify(R.trocas.pontos[delta]));
}
// ---------- herdadas: erro do placebo no nulo
const locCtl = new Map(); for (const s of ctl) locCtl.set(s.loc, (locCtl.get(s.loc) ?? 0) + 1);
const herE = her.filter((s) => (locCtl.get(s.loc) ?? 0) >= 1);
const poolH = ctl.filter((s) => locCtl.get(s.loc) >= 2);
const Mh = motor(poolH, { y: (s) => s.lv, xs: (s) => [Math.log(Math.max(s.a2, 1))], fe: (s) => s.loc, cl: (s) => s.zon, w: (s) => s.n2 });
const ph = plano(herE, Mh.L, (s) => `${s.zon}|${s.m1}`, (s) => s.zon);
{
  const eps = [], betas = []; let rej = 0;
  for (let r = 0; r < Math.round(REPS / 2); r++) { const Pl = ph.sortear(); const e = estimar(Mh, Pl.map((s) => Mh.pos.get(s)), new Map()); eps.push(e.ep); betas.push(e.beta); if (Math.abs(e.z) >= zc) rej++; }
  const m = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  R.herdadas = { elegiveis: herE.length, sorteioLargo: ph.largos, nulo: { rejeicao: rej / eps.length, betaMedio: m(betas), epMedio: m(eps), dpBeta: Math.sqrt(m(betas.map((b) => (b - m(betas)) ** 2))) } };
  log('herdadas', JSON.stringify(R.herdadas));
  R.herdadas.pontos = {};
  for (const delta of [0.188, 0.2, 0.272]) {
    let rj = 0, mov = 0, baseN = 0; const bs = [];
    const reps = Math.round(REPS / 2);
    for (let r = 0; r < reps; r++) {
      const Pl = ph.sortear(); baseN += Pl.reduce((a, s) => a + s.n2, 0);
      const dy = new Map();
      for (const s of Pl) { const x = binom(s.v22_2, Math.min(1, ((delta / 100) * s.n2) / Math.max(1, s.v22_2))); mov += x; if (x) dy.set(Mh.pos.get(s), (100 * x) / s.n2); }
      const e = estimar(Mh, Pl.map((s) => Mh.pos.get(s)), dy); bs.push(e.beta); if (Math.abs(e.z) >= zc) rj++;
    }
    R.herdadas.pontos[delta] = { poder: rj / reps, votosMovidosMedios: mov / reps, desvioRealPp: (100 * mov) / baseN, betaMedio: bs.reduce((a, b) => a + b, 0) / reps };
    log('herdadas δ', delta, JSON.stringify(R.herdadas.pontos[delta]));
  }
}
// ---------- MDE com o erro do teste REAL, e o poder real no MDE publicado
const z80 = zQuantil(0.8);
const mde = (ep) => (zc + z80) * ep;
R.mde = {
  trocas: { comErroPlacebo: mde(R.trocas.pontos[0].epMedio), comErroReal: mde(R.real.trocas.epAreg), votosComErroReal: (mde(R.real.trocas.epAreg) / 100) * R.base13mais22.trocas2t,
    poderRealNoMdePublicado: 1 - Phi(zc - 0.098 / R.real.trocas.epAreg) + Phi(-zc - 0.098 / R.real.trocas.epAreg) },
  herdadas: { comErroPlacebo: mde(R.herdadas.nulo.epMedio), comErroReal: mde(R.real.herdadas.epAreg), votosComErroReal: (mde(R.real.herdadas.epAreg) / 100) * R.base13mais22.herdadas2t,
    poderRealNoMdePublicado: 1 - Phi(zc - 0.188 / R.real.herdadas.epAreg) + Phi(-zc - 0.188 / R.real.herdadas.epAreg) },
  robustezVelhas: { mdePublicadoPp: 0.142, votosNaBaseDasTrocas: (0.142 / 100) * R.base13mais22.trocas2t },
};
await writeFile(path.join(SAIDA, ARG.exato ? 'poder-exato.json' : 'poder.json'), JSON.stringify(R, null, 1));
log('fim', JSON.stringify(R.mde));
