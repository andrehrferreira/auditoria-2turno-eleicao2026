// Parecer cético 37, H18 (inserção uniforme num município inteiro): reprodução por caminho próprio e testes de poder.
// Não usa pares-banco.csv nem estatistico-h18-*.mjs. Base por seção: 34-h26-secoes.csv (extração independente do parecer 34,
// direto da cópia de leitura, conferida contra voto_oficial); governador e senador do 1º turno lidos aqui da voto_bu.
// Mesma especificação do plano (estatistico-eleitoral/11-h18-plano.md), código próprio:
//   esperado por UF (MQ sem intercepto, 13 preditores do 1º turno), deixa-um-município-de-fora (LOO), resíduo líquido,
//   VAE, σ por conglomerado, τ por região (mediana de z² = 0,4549), BH; B2 (φ2, cauda inferior do χ²); B1 e conjunção.
// Além do plano (só leitura, não muda nada do resultado de origem):
//   P1 sensibilidade: sem LOO; sem os 4 preditores de outros cargos.
//   P2 MDE a 50% e a 80% de poder; poder empírico por injeção de M1 num município (usa o resíduo real como ruído).
//   P3 ponto cego por UF: injeção de M1 (2% dos nominais do 22 passados ao 13) em todas as seções de uma UF, reajuste.
//   P4 inserção em muitos municípios: 25% dos municípios do Nordeste (sorteio com semente) com M1 de 2% dos nominais;
//      reajuste por UF, recalibração da região, quantos dos injetados passam o corte.
// Só leitura. Uso: node --max-old-space-size=8192 scripts/auditoria/cetico-37-h18.mjs
// Saída: data/parsed/auditoria/cetico-revisor/37-h18.json
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const SAIDA = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico-revisor');
await mkdir(SAIDA, { recursive: true });
const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const k4 = (uf, m, z, s) => `${uf}|${Number(m)}|${Number(z)}|${Number(s)}`;
const REG = { ac: 'N', am: 'N', ap: 'N', pa: 'N', ro: 'N', rr: 'N', to: 'N', al: 'NE', ba: 'NE', ce: 'NE', ma: 'NE', pb: 'NE', pe: 'NE',
  pi: 'NE', rn: 'NE', se: 'NE', df: 'CO', go: 'CO', ms: 'CO', mt: 'CO', es: 'SE', mg: 'SE', rj: 'SE', sp: 'SE', pr: 'S', rs: 'S', sc: 'S' };

// ---------- funções numéricas próprias ----------
// erfc por fração continuada de Lentz (x grande) e série de Taylor de erf (x pequeno): erro relativo < 1e-13
function erfc(x) {
  if (x < 0) return 2 - erfc(-x);
  if (x < 2.5) {
    let soma = x, termo = x;
    for (let n = 1; n < 200; n++) { termo *= -x * x / n; const t = termo / (2 * n + 1); soma += t; if (Math.abs(t) < 1e-17) break; }
    return 1 - (2 / Math.sqrt(Math.PI)) * soma;
  }
  // erfc(x) = exp(−x²)/√π · 1/(x + 1/2/(x + 1/(x + 3/2/(x + ...))))
  let f = x, C = x, D = 0;
  for (let n = 1; n < 500; n++) {
    const a = n / 2;
    D = x + a * D; D = 1 / D; C = x + a / C;
    const d = C * D; f *= d;
    if (Math.abs(d - 1) < 1e-16) break;
  }
  return Math.exp(-x * x) / Math.sqrt(Math.PI) / f;
}
const p2 = (z) => erfc(Math.abs(z) / Math.SQRT2);
function zDe(p) { let lo = 0, hi = 40; for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (p2(m) > p) lo = m; else hi = m; } return (lo + hi) / 2; }
function lgamma(x) { // Lanczos g = 7
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61503916999185, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  x -= 1; let a = c[0]; const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
// ln P(a, x) (gama incompleta inferior regularizada); série se x < a + 1, senão 1 − Q por fração continuada
function lnP(a, x) {
  if (x <= 0) return -Infinity;
  if (x < a + 1) {
    let s = 1 / a, t = s, ap = a;
    for (let n = 0; n < 5000; n++) { ap += 1; t *= x / ap; s += t; if (t < s * 1e-16) break; }
    return Math.log(s) - x + a * Math.log(x) - lgamma(a);
  }
  let b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
  for (let i = 1; i < 5000; i++) { const an = -i * (i - a); b += 2; d = an * d + b; d = 1 / d; c = b + an / c; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-16) break; }
  const q = Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
  return Math.log(Math.max(1e-300, 1 - q));
}
function bhq(ps) { // valores-q de Benjamini-Hochberg
  const n = ps.length, ord = ps.map((p, i) => i).sort((i, j) => ps[i] - ps[j]), q = new Array(n);
  let acc = Infinity;
  for (let r = n - 1; r >= 0; r--) { acc = Math.min(acc, (ps[ord[r]] * n) / (r + 1)); q[ord[r]] = Math.min(1, acc); }
  return q;
}
const med = (v) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : NaN; };
function cholSolve(A, b, K) { // A simétrica K×K (Float64Array), jitter relativo pequeno contra coluna nula
  const L = new Float64Array(K * K);
  for (let i = 0; i < K; i++) {
    for (let j = 0; j <= i; j++) {
      let s = A[i * K + j] + (i === j ? 1e-9 * (Math.abs(A[i * K + i]) + 1) : 0);
      for (let k = 0; k < j; k++) s -= L[i * K + k] * L[j * K + k];
      L[i * K + j] = i === j ? Math.sqrt(Math.max(s, 1e-300)) : s / L[j * K + j];
    }
  }
  const y = new Float64Array(K), x = new Float64Array(K);
  for (let i = 0; i < K; i++) { let s = b[i]; for (let k = 0; k < i; k++) s -= L[i * K + k] * y[k]; y[i] = s / L[i * K + i]; }
  for (let i = K - 1; i >= 0; i--) { let s = y[i]; for (let k = i + 1; k < K; k++) s -= L[k * K + i] * x[k]; x[i] = s / L[i * K + i]; }
  return x;
}
function rng(seed) { let s = seed >>> 0; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

// ---------- dados ----------
const txt = await readFile(path.join(SAIDA, '34-h26-secoes.csv'), 'utf8');
const linhas = txt.split(/\r?\n/).filter(Boolean);
const cab = linhas[0].split(';');
const I = Object.fromEntries(cab.map((c, i) => [c, i]));
const S = [];
const porK = new Map();
for (let i = 1; i < linhas.length; i++) {
  const c = linhas[i].split(';');
  if (c[I.uf] === 'zz') continue;
  const n = (f) => Number(c[I[f]]);
  const s = { uf: c[I.uf], mun: c[I.municipio], a1: n('a1'), c1: n('c1'), a2: n('a2'), c2: n('c2'), v13_1: n('v13_1'), v22_1: n('v22_1'),
    e14: n('v14_1'), e30: n('v30_1'), e55: n('v55_1'), e70: n('v70_1'), dem: n('dem_1'), bn1: n('bn1'), v13_2: n('v13_2'), v22_2: n('v22_2'),
    govA: 0, govB: 0, senA: 0, senB: 0 };
  S.push(s); porK.set(k4(s.uf, s.mun, c[I.zona], c[I.secao]), s);
}
log(`${S.length} seções sem o exterior`);
const { db, fonte } = await abrirLeitura();
const conf = { fonte: path.basename(fonte), secoes: S.length, semSecao: {} };
for (const [cargo, A, B] of [[3, 'govA', 'govB'], [5, 'senA', 'senB']]) {
  const q = db.prepare(`SELECT uf, municipio, zona, secao, numero, quantidade q FROM voto_bu WHERE turno = 1 AND cargo = ? AND tipo_voto = 'nominal' AND uf <> 'zz'`);
  const tot = new Map(), rows = [];
  for (const r of q.iterate(cargo)) { rows.push(r); const k = `${r.uf}|${r.numero}`; tot.set(k, (tot.get(k) ?? 0) + r.q); }
  const top = {};
  for (const [k, v] of tot) { const [uf, nr] = k.split('|'); (top[uf] ??= []).push([Number(nr), v]); }
  for (const uf in top) top[uf] = top[uf].sort((a, b) => b[1] - a[1]).slice(0, 2).map((x) => x[0]);
  let sem = 0;
  for (const r of rows) {
    const s = porK.get(k4(r.uf, r.municipio, r.zona, r.secao));
    if (!s) { sem += r.q; continue; }
    if (r.numero === top[r.uf][0]) s[A] += r.q; else if (r.numero === top[r.uf][1]) s[B] += r.q;
  }
  conf.semSecao[cargo] = sem; conf[`top2cargo${cargo}`] = top;
  log(`cargo ${cargo} lido`);
}
db.close();
conf.somas = { v13_1: 0, v22_1: 0, v13_2: 0, v22_2: 0 };
for (const s of S) for (const k in conf.somas) conf.somas[k] += s[k];

// ---------- modelo ----------
const K_FULL = 13;
const Xfull = (s) => [s.v13_1, s.v22_1, s.e14, s.e30, s.e55, s.e70, s.dem, s.bn1, s.a1 - s.c1, s.govA, s.govB, s.senA, s.senB];
const Xsem = (s) => Xfull(s).slice(0, 9);
const elegivel = (s) => s.c1 >= 10 && s.a2 >= 20 && Math.abs(s.a2 - s.a1) <= 10;
const munsPorUf = new Map();
for (const s of S) {
  if (!munsPorUf.has(s.uf)) munsPorUf.set(s.uf, new Map());
  const m = munsPorUf.get(s.uf);
  if (!m.has(s.mun)) m.set(s.mun, []);
  m.get(s.mun).push(s);
}
// y13/y22 vêm de funções para permitir injeção
function ajustarUf(uf, { X = Xfull, loo = true, y13 = (s) => s.v13_2, y22 = (s) => s.v22_2 } = {}) {
  const K = X(S[0]).length;
  const mk = () => ({ A: new Float64Array(K * K), b13: new Float64Array(K), b22: new Float64Array(K), n: 0 });
  const add = (acc, s) => {
    const x = X(s), a = y13(s), b = y22(s);
    for (let i = 0; i < K; i++) { acc.b13[i] += x[i] * a; acc.b22[i] += x[i] * b; for (let j = 0; j < K; j++) acc.A[i * K + j] += x[i] * x[j]; }
    acc.n++;
  };
  const tot = mk(), por = new Map();
  for (const [mun, lista] of munsPorUf.get(uf)) { const acc = mk(); for (const s of lista) if (elegivel(s)) { add(acc, s); add(tot, s); } por.set(mun, acc); }
  const res = new Map();
  const nMun = munsPorUf.get(uf).size;
  for (const [mun, lista] of munsPorUf.get(uf)) {
    const acc = por.get(mun);
    let A = tot.A, b13 = tot.b13, b22 = tot.b22, usouLoo = false;
    if (loo && nMun > 1 && tot.n - acc.n > 10 * K) {
      A = tot.A.map((v, i) => v - acc.A[i]); b13 = tot.b13.map((v, i) => v - acc.b13[i]); b22 = tot.b22.map((v, i) => v - acc.b22[i]); usouLoo = true;
    }
    const c13 = cholSolve(A, b13, K), c22 = cholSolve(A, b22, K);
    const rs = lista.map((s) => {
      const x = X(s); let p13 = 0, p22 = 0;
      for (let i = 0; i < K; i++) { p13 += x[i] * c13[i]; p22 += x[i] * c22[i]; }
      const n2 = y13(s) + y22(s);
      return { r: (y13(s) - p13) - (y22(s) - p22), n2, v13: y13(s) };
    });
    res.set(mun, { rs, loo: usouLoo });
  }
  return res;
}
function municipio(uf, mun, ajuste) {
  const { rs, loo } = ajuste.get(mun);
  const R = rs.reduce((a, x) => a + x.r, 0), N2 = rs.reduce((a, x) => a + x.n2, 0), k = rs.length;
  const vae = (100 * R) / N2;
  const m = R / N2;
  const ss = rs.reduce((a, x) => a + (x.r - m * x.n2) ** 2, 0);
  const sigma2 = k >= 2 ? ((k / (k - 1)) * ss * 1e4) / (N2 * N2) : NaN;
  return { uf, mun, reg: REG[uf], k, R, N2, vae, sigma2, loo };
}
function calibrar(lista) {
  const m = med(lista.map((o) => o.vae));
  const f = (t2) => med(lista.map((o) => (o.vae - m) ** 2 / (t2 + o.sigma2)));
  let t2 = 0;
  if (f(0) > 0.4549) { let lo = 0, hi = 1; while (f(hi) > 0.4549) hi *= 2; for (let i = 0; i < 100; i++) { const x = (lo + hi) / 2; if (f(x) > 0.4549) lo = x; else hi = x; } t2 = (lo + hi) / 2; }
  return { med: m, t2 };
}
function sinalA(ajustes) { // ajustes: Map(uf -> ajuste)
  const mun = [];
  for (const [uf, aj] of ajustes) for (const m of aj.keys()) mun.push(municipio(uf, m, aj));
  const eleg = mun.filter((o) => o.uf !== 'df' && o.k >= 3 && Number.isFinite(o.sigma2));
  const cal = {};
  for (const r of ['N', 'NE', 'CO', 'SE', 'S']) {
    const l = eleg.filter((o) => o.reg === r); const c = calibrar(l); cal[r] = { med: c.med, tau: Math.sqrt(c.t2), n: l.length };
    for (const o of l) { o.tau = Math.sqrt(c.t2); o.med = c.med; o.z = (o.vae - c.med) / Math.sqrt(c.t2 + o.sigma2); o.p = p2(o.z); }
  }
  const q = bhq(eleg.map((o) => o.p));
  eleg.forEach((o, i) => { o.q = q[i]; o.A = o.q < 0.01 && Math.abs(o.vae) >= 2 ? (o.vae > 0 ? 13 : 22) : 0; });
  return { eleg, cal };
}
const ufs = [...munsPorUf.keys()].sort();
const base = new Map(ufs.map((uf) => [uf, ajustarUf(uf)]));
const A0 = sinalA(base);
log('sinal A reproduzido');
const marc = A0.eleg.filter((o) => o.A);
const res = { conf, sinalA: { testados: A0.eleg.length, marcados13: marc.filter((o) => o.A === 13).length, marcados22: marc.filter((o) => o.A === 22).length,
  qMenor001: A0.eleg.filter((o) => o.q < 0.01).length, calibracao: A0.cal,
  votosDeslocados13: Math.round(marc.filter((o) => o.A === 13).reduce((a, o) => a + o.R / 2, 0)),
  votosDeslocados22: Math.round(marc.filter((o) => o.A === 22).reduce((a, o) => a + o.R / 2, 0)),
  lista: marc.sort((a, b) => a.vae - b.vae).map((o) => ({ uf: o.uf, mun: o.mun, k: o.k, vae: +o.vae.toFixed(2), z: +o.z.toFixed(2), q: +o.q.toPrecision(3) })) } };

// ---------- B2, B1 e conjunção ----------
function disp(lista, x, n) {
  let X0 = 0, N0 = 0; for (const s of lista) { X0 += x(s); N0 += n(s); }
  const p = X0 / N0, k = lista.length;
  if (k < 2 || p <= 0 || p >= 1) return NaN;
  let Q = 0; for (const s of lista) { const nn = n(s); Q += (x(s) - nn * p) ** 2 / (nn * p * (1 - p)); }
  return Q / (k - 1);
}
const B = [];
for (const [uf, aj] of base) for (const [mun, { rs }] of aj) {
  const lista = munsPorUf.get(uf).get(mun).map((s, i) => ({ ...s, r: rs[i].r, n2: rs[i].n2 })).filter((s) => s.n2 >= 20);
  if (lista.length < 10) continue;
  const k = lista.length, w = lista.reduce((a, s) => a + s.n2, 0);
  const ub = lista.reduce((a, s) => a + s.r, 0) / w;
  const V = (lista.reduce((a, s) => a + s.n2 * (s.r / s.n2 - ub) ** 2, 0) / w) * (k / (k - 1));
  const pi = lista.reduce((a, s) => a + s.v13_2, 0) / w;
  const piso = (4 * pi * (1 - pi) * k) / w;
  const phi2 = disp(lista, (s) => s.v13_2, (s) => s.n2);
  B.push({ uf, mun, reg: REG[uf], k, lnB1: Math.log(V / piso), phi2, lnp: lnP((k - 1) / 2, ((k - 1) * phi2) / 2) });
}
const qB2 = bhq(B.map((o) => Math.exp(o.lnp)));
B.forEach((o, i) => (o.qB2 = qB2[i]));
for (const r of ['N', 'NE', 'CO', 'SE', 'S']) {
  const l = B.filter((o) => o.reg === r);
  const m = med(l.map((o) => o.lnB1));
  const f = (t2) => med(l.map((o) => (o.lnB1 - m) ** 2 / (t2 + 2 / (o.k - 1))));
  let t2 = 0;
  if (f(0) > 0.4549) { let lo = 0, hi = 1; while (f(hi) > 0.4549) hi *= 2; for (let i = 0; i < 100; i++) { const x = (lo + hi) / 2; if (f(x) > 0.4549) lo = x; else hi = x; } t2 = (lo + hi) / 2; }
  for (const o of l) o.zB1 = (o.lnB1 - m) / Math.sqrt(t2 + 2 / (o.k - 1));
}
const mapaA = new Map(A0.eleg.map((o) => [`${o.uf}|${o.mun}`, o]));
const b1 = B.filter((o) => o.zB1 <= -1.645);
const aComB = A0.eleg.filter((o) => o.A && B.some((b) => b.uf === o.uf && b.mun === o.mun));
const conj = b1.filter((o) => mapaA.get(`${o.uf}|${o.mun}`)?.A);
// poder do B2 para resultado fixado: menor k com P(χ²_{k−1} ≤ (k−1)·0,002) < 0,01/N
let kMin = null; for (let k = 3; k < 200 && kMin == null; k++) if (lnP((k - 1) / 2, ((k - 1) * 0.002) / 2) < Math.log(0.01 / B.length)) kMin = k;
// e para parcela comum com sorteio binomial perfeito (φ = 1): mediana do χ² — nunca passa
res.sinalB = { municipios: B.length, B2: B.filter((o) => o.qB2 < 0.01).length, menorPB2: Math.min(...B.map((o) => Math.exp(o.lnp))),
  phi2Mediano: +med(B.map((o) => o.phi2)).toFixed(2), phi2Abaixo1: B.filter((o) => o.phi2 < 1).length, B1: b1.length,
  conjuncao: conj.map((o) => `${o.uf}|${o.mun}`), conjuncaoEsperada: +(aComB.length * (b1.length / B.length)).toFixed(2), AcomB: aComB.length,
  secoesMinimasResultadoFixado: kMin,
  municipiosSemB: { total: A0.eleg.length + 1 - B.length } };
log('B1/B2 reproduzidos');

// ---------- P1 sensibilidade ----------
const semLoo = sinalA(new Map(ufs.map((uf) => [uf, ajustarUf(uf, { loo: false })])));
const semOutros = sinalA(new Map(ufs.map((uf) => [uf, ajustarUf(uf, { X: Xsem })])));
const chaves = (r) => new Set(r.eleg.filter((o) => o.A).map((o) => `${o.uf}|${o.mun}`));
const c0 = chaves(A0);
res.sensibilidade = {
  semLoo: { marcados: chaves(semLoo).size, emComum: [...chaves(semLoo)].filter((k) => c0.has(k)).length },
  semOutrosCargos: { marcados: chaves(semOutros).size, emComum: [...chaves(semOutros)].filter((k) => c0.has(k)).length,
    tau: Object.fromEntries(Object.entries(semOutros.cal).map(([r, c]) => [r, +c.tau.toFixed(2)])) },
};
log('sensibilidade');

// ---------- P2 MDE e poder empírico ----------
const N = A0.eleg.length;
const zBon = zDe(0.01 / N), zBH = zDe((0.01 * 20) / N); // BH com as 19 descobertas já existentes + 1
const faixas = [[3, 9], [10, 49], [50, 199], [200, 999], [1000, 1e9]];
res.mde = { zBonferroni: +zBon.toFixed(3), zBHcom19: +zBH.toFixed(3), porFaixa: faixas.map(([a, b]) => {
  const l = A0.eleg.filter((o) => o.k >= a && o.k <= b);
  const sd = l.map((o) => Math.sqrt(o.tau ** 2 + o.sigma2));
  return { secoes: `${a}-${b >= 1e9 ? '' : b}`, municipios: l.length, mde50: +med(sd.map((x) => Math.max(2, zBon * x))).toFixed(2),
    mde80: +med(sd.map((x) => Math.max(2, (zBon + 0.8416) * x))).toFixed(2) };
}) };
// poder empírico: soma Δ p.p. à VAE real do município (o esperado do município não muda, porque é LOO), mesmo τ e mediana
res.poderEmpirico = {};
for (const d of [2, 4, 6, 8, 10, 15]) {
  const det = (sinal, zc) => A0.eleg.filter((o) => Math.abs(o.vae + sinal * d - o.med) / Math.sqrt(o.tau ** 2 + o.sigma2) > zc && Math.abs(o.vae + sinal * d) >= 2).length / N;
  res.poderEmpirico[`${d}pp`] = { para13_bonf: +det(1, zBon).toFixed(3), para22_bonf: +det(-1, zBon).toFixed(3), para13_bh: +det(1, zBH).toFixed(3), para22_bh: +det(-1, zBH).toFixed(3) };
}
log('poder');

// ---------- P3 ponto cego por UF ----------
// M1: em toda seção da UF, f dos nominais do 2º turno passam do 22 para o 13 (no limite dos votos do 22)
res.pontoCegoUF = {};
for (const [uf, f] of [['ba', 0.02], ['mg', 0.02], ['sp', 0.02], ['go', 0.04]]) {
  const mov = (s) => Math.min(s.v22_2, Math.round(f * (s.v13_2 + s.v22_2)));
  const aj = ajustarUf(uf, { y13: (s) => s.v13_2 + mov(s), y22: (s) => s.v22_2 - mov(s) });
  const vaes0 = [...base.get(uf).keys()].map((m) => municipio(uf, m, base.get(uf)).vae);
  const vaes1 = [...aj.keys()].map((m) => municipio(uf, m, aj).vae);
  const mapa = new Map(base); mapa.set(uf, aj);
  const A1 = sinalA(mapa);
  const novos = A1.eleg.filter((o) => o.uf === uf && o.A && !c0.has(`${o.uf}|${o.mun}`)).length;
  const movidos = munsPorUf.get(uf); let tot = 0; for (const l of movidos.values()) for (const s of l) tot += mov(s);
  res.pontoCegoUF[uf] = { fracaoDosNominais: f, votosMovidos: tot, margemUFmudaPP: +(2 * f * 100).toFixed(1),
    vaeMedianaAntes: +med(vaes0).toFixed(2), vaeMedianaDepois: +med(vaes1).toFixed(2), municipiosNovosMarcados: novos };
}
log('ponto cego UF');

// ---------- P4 muitos municípios ----------
{
  const r = rng(20261030);
  const ne = ufs.filter((uf) => REG[uf] === 'NE');
  const alvo = new Set();
  for (const uf of ne) for (const m of munsPorUf.get(uf).keys()) if (r() < 0.25) alvo.add(`${uf}|${m}`);
  const out = {};
  for (const f of [0.02, 0.035]) {
    const mov = (s) => (alvo.has(`${s.uf}|${s.mun}`) ? Math.min(s.v22_2, Math.round(f * (s.v13_2 + s.v22_2))) : 0);
    const mapa = new Map(base);
    for (const uf of ne) mapa.set(uf, ajustarUf(uf, { y13: (s) => s.v13_2 + mov(s), y22: (s) => s.v22_2 - mov(s) }));
    const A1 = sinalA(mapa);
    const inj = A1.eleg.filter((o) => alvo.has(`${o.uf}|${o.mun}`));
    let votos = 0; for (const uf of ne) for (const l of munsPorUf.get(uf).values()) for (const s of l) votos += mov(s);
    out[`f${f}`] = { municipiosInjetados: inj.length, votosMovidos: votos, margemMudaPP: +(200 * f).toFixed(1), detectados: inj.filter((o) => o.A === 13).length,
      tauNEantes: +A0.cal.NE.tau.toFixed(2), tauNEdepois: +A1.cal.NE.tau.toFixed(2), medianaNEantes: +A0.cal.NE.med.toFixed(2), medianaNEdepois: +A1.cal.NE.med.toFixed(2),
      vaeMedianaInjetados: +med(inj.map((o) => o.vae)).toFixed(2) };
  }
  res.muitosMunicipiosNE = out;
}
log('muitos municípios');
await writeFile(path.join(SAIDA, '37-h18.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify({ ...res, conf: { ...res.conf, top2cargo3: undefined, top2cargo5: undefined } }, null, 1));
