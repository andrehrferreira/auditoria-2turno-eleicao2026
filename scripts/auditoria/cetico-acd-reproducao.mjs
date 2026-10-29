// Cético, achado "aumento de comparecimento difuso" (estatístico eleitoral, docs/analysis/estatistico-eleitoral/01 a 05).
// Lente: reprodução e código. Refaz o número central de forma INDEPENDENTE, a partir do banco (cópia de leitura, 28 UFs nos
// dois turnos), sem usar pares-*.csv nem estatistico-lib.mjs. O modelo segue a especificação escrita no doc 01, com código próprio.
//
// Uso: node --max-old-space-size=4096 scripts/auditoria/cetico-acd-reproducao.mjs [replicas]
// Saída: data/parsed/auditoria/cetico/acd-reproducao.json (e .csv das seções z ≥ 4)
//
// Diferenças deliberadas em relação ao autor (para medir a robustez):
//  - comparecimento = soma dos votos de presidente no BU (13 + 22 + outros + brancos + nulos), não o campo secao.comparecimento,
//    porque esse campo vem 0 nas seções do Sistema de Apuração (tipo_arquivo saManual / saMista...). Conta as diferenças.
//  - categorias de habilitação nulas (exterior, SA) ficam como ausentes, não 0.
//  - agregadas somadas à principal pela tabela secao_agregada do banco (o autor usa locais.csv).
//  - gerador: mulberry32 (Math.imul); binomial por soma de Bernoulli (exata, sem truque).
import { readdirSync, createReadStream, mkdirSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const SAIDA = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico');
const REPL = Number(process.argv[2] ?? 10);
const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const r3 = (x) => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : null);
const NE = new Set(['al', 'ba', 'ce', 'ma', 'pb', 'pe', 'pi', 'rn', 'se']);

function mulberry32(a) {
  a >>>= 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const k4 = (u, m, z, s) => `${u}|${m}|${z}|${s}`;
const mediana = (v) => { const a = Float64Array.from(v).sort(); return a[Math.floor(a.length / 2)]; };
const quant = (v, q) => { const a = Float64Array.from(v).sort(); return a[Math.min(a.length - 1, Math.floor(q * a.length))]; };

// ---------- 1. dados do banco ----------
const { db, fonte } = await abrirLeitura();
const T = [null, new Map(), new Map()];
const conf = { arquivo: path.basename(fonte), campoComparecimentoDifereDoBU: [0, 0], difereSA: [0, 0], difereOutros: [0, 0], categoriaNula: [0, 0], semVotos: [0, 0] };
const tiposDifere = {};
for (const t of [1, 2]) {
  const el = t === 1 ? 6257 : 6258;
  const q = db.prepare(`SELECT s.uf, s.municipio, s.zona, s.secao, s.local, s.comparecimento c, s.sem_biometria sb, s.por_biometria pb,
      s.por_biografia pg, s.tipo_arquivo ta, e.aptos a
    FROM secao s JOIN secao_eleicao e ON e.turno = s.turno AND e.uf = s.uf AND e.municipio = s.municipio AND e.zona = s.zona AND e.secao = s.secao AND e.eleicao = ?
    WHERE s.turno = ? AND s.situacao = 'completa'`);
  for (const r of q.iterate(el, t)) T[t].set(k4(r.uf, r.municipio, r.zona, r.secao), { ...r, v13: 0, v22: 0, out: 0, bn: 0, nv: 0 });
  const qv = db.prepare(`SELECT uf, municipio, zona, secao,
      SUM(CASE WHEN tipo_voto = 'nominal' AND numero = 13 THEN quantidade ELSE 0 END) v13,
      SUM(CASE WHEN tipo_voto = 'nominal' AND numero = 22 THEN quantidade ELSE 0 END) v22,
      SUM(CASE WHEN tipo_voto = 'nominal' AND numero NOT IN (13, 22) THEN quantidade ELSE 0 END) out,
      SUM(CASE WHEN tipo_voto IN ('branco', 'nulo') THEN quantidade ELSE 0 END) bn, COUNT(*) nv
    FROM voto_bu WHERE eleicao = ? AND cargo = 1 GROUP BY uf, municipio, zona, secao`);
  for (const v of qv.iterate(el)) { const s = T[t].get(k4(v.uf, v.municipio, v.zona, v.secao)); if (s) Object.assign(s, { v13: v.v13, v22: v.v22, out: v.out, bn: v.bn, nv: v.nv }); }
  for (const s of T[t].values()) {
    s.cBU = s.v13 + s.v22 + s.out + s.bn;
    if (!s.nv) conf.semVotos[t - 1]++;
    if (s.c !== s.cBU) {
      conf.campoComparecimentoDifereDoBU[t - 1]++;
      const sa = /^sa/.test(s.ta ?? ''); conf[sa ? 'difereSA' : 'difereOutros'][t - 1]++;
      tiposDifere[`${t}|${s.ta}`] = (tiposDifere[`${t}|${s.ta}`] ?? 0) + 1;
    }
    if (s.sb == null || s.pb == null || s.pg == null) conf.categoriaNula[t - 1]++;
  }
  log(`turno ${t}: ${T[t].size} seções`);
}
conf.tiposDifere = tiposDifere;
const principal = new Map();
for (const r of db.prepare('SELECT uf, municipio, zona, secao, secao_principal p FROM secao_agregada WHERE turno = 2').iterate())
  principal.set(k4(r.uf, r.municipio, r.zona, r.secao), k4(r.uf, r.municipio, r.zona, String(r.p).padStart(4, '0')));
db.close();

// ---------- 2. pares e filtro ----------
const todos = [];
let semPar = 0;
for (const [k, x1] of T[1]) {
  const x2 = T[2].get(k);
  if (!x2) { semPar++; continue; }
  const [uf, municipio, zona, secao] = k.split('|');
  const bio = x1.sb != null && x1.pb != null && x1.pg != null && x2.sb != null && x2.pb != null && x2.pg != null;
  todos.push({ k, uf, municipio, zona, secao, zon: `${uf}|${zona}`, mun: `${uf}|${municipio}`, local1: x1.local, local2: x2.local,
    a1: x1.a, a2: x2.a, c1: x1.cBU, c2: x2.cBU, v13_1: x1.v13, v22_1: x1.v22, out1: x1.out, bn1: x1.bn, v13_2: x2.v13, v22_2: x2.v22, bn2: x2.bn,
    bio, dsb: bio ? x2.sb - x1.sb : null, dpb: bio ? x2.pb - x1.pb : null, dpg: bio ? x2.pg - x1.pg : null, ta1: x1.ta, ta2: x2.ta });
}
const filtro = { pares: todos.length, semPar, aptos2Menor20: 0, comp1Menor10: 0, aptosMudamMaisDe10: 0 };
const P = todos.filter((s) => {
  if (s.a2 < 20) { filtro.aptos2Menor20++; return false; }
  if (s.c1 < 10) { filtro.comp1Menor10++; return false; }
  if (Math.abs(s.a2 - s.a1) > 10) { filtro.aptosMudamMaisDe10++; return false; }
  return true;
});
filtro.usadas = P.length;
filtro.usadasSA = P.filter((s) => /^sa/.test(s.ta1 ?? '') || /^sa/.test(s.ta2 ?? '')).length;
filtro.usadasSemCategoria = P.filter((s) => !s.bio).length;
for (const s of P) {
  s.dpp = 100 * (s.c2 / s.a2 - s.c1 / s.a1); s.dc = s.c2 - s.c1;
  s.f1 = s.v13_1 + s.v22_1; s.f2 = s.v13_2 + s.v22_2;
  s.s1 = s.f1 > 0 ? s.v13_1 / s.f1 : null; s.s2 = s.f2 > 0 ? s.v13_2 / s.f2 : null;
}
log(`${P.length} seções no modelo`);

// ---------- 3. idade (perfil do eleitorado, agregadas somadas à principal) ----------
{
  const porK = new Map(P.map((s) => [s.k, s]));
  const dir = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'forense', 'perfil');
  for (const f of readdirSync(dir)) {
    let cab = true;
    for await (const l of createInterface({ input: createReadStream(path.join(dir, f), 'utf8'), crlfDelay: Infinity })) {
      if (cab) { cab = false; continue; }
      const c = l.split(';'); const k = k4(c[0], c[1], c[2], c[3]);
      const s = porK.get(principal.get(k) ?? k); if (!s) continue;
      s.el = (s.el ?? 0) + Number(c[4]); s.i60 = (s.i60 ?? 0) + Number(c[6]); s.i1624 = (s.i1624 ?? 0) + Number(c[7]);
    }
  }
  for (const s of P) { s.p60 = s.el > 0 ? s.i60 / s.el : null; s.p1624 = s.el > 0 ? s.i1624 / s.el : null; }
}
log(`perfil: ${P.filter((s) => s.p60 != null).length} seções com idade`);

// ---------- 4. regressão com efeito fixo (demeaning ponderado) e EP agrupado ----------
function solve(M, b) { // Gauss-Jordan
  const n = b.length; const A = M.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; [A[c], A[p]] = [A[p], A[c]];
    const d = A[c][c]; for (let j = c; j <= n; j++) A[c][j] /= d; for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c]; for (let j = c; j <= n; j++) A[r][j] -= f * A[c][j]; } }
  return A.map((r) => r[n]);
}
function inv(M) { const n = M.length; return M.map((_, j) => solve(M, M.map((__, i) => (i === j ? 1 : 0)))).map((col, j, all) => all.map((c) => c[j])); }
function fe(lista, yf, xf, wf, gf, cf) {
  const L = lista.map((s) => ({ s, y: yf(s), x: xf(s), w: wf(s), g: gf(s) })).filter((l) => Number.isFinite(l.y) && l.x.every(Number.isFinite) && l.w > 0);
  const k = L[0].x.length; const G = new Map();
  for (const l of L) { let a = G.get(l.g); if (!a) { a = { w: 0, y: 0, x: new Array(k).fill(0), n: 0 }; G.set(l.g, a); } a.w += l.w; a.y += l.w * l.y; a.n++; for (let j = 0; j < k; j++) a.x[j] += l.w * l.x[j]; }
  const M = L.filter((l) => G.get(l.g).n > 1);
  for (const l of M) { const a = G.get(l.g); l.y -= a.y / a.w; l.x = l.x.map((v, j) => v - a.x[j] / a.w); }
  const XX = Array.from({ length: k }, () => new Array(k).fill(0)), Xy = new Array(k).fill(0);
  for (const l of M) for (let a = 0; a < k; a++) { Xy[a] += l.w * l.x[a] * l.y; for (let c = 0; c < k; c++) XX[a][c] += l.w * l.x[a] * l.x[c]; }
  const b = solve(XX, Xy); const Ii = inv(XX);
  const cl = new Map();
  for (const l of M) { const e = l.y - l.x.reduce((a, v, j) => a + v * b[j], 0); const c = cf(l.s); let g = cl.get(c); if (!g) { g = new Array(k).fill(0); cl.set(c, g); } for (let a = 0; a < k; a++) g[a] += l.w * l.x[a] * e; }
  const meat = Array.from({ length: k }, () => new Array(k).fill(0));
  for (const g of cl.values()) for (let a = 0; a < k; a++) for (let c = 0; c < k; c++) meat[a][c] += g[a] * g[c];
  const nG = cl.size, n = M.length, fat = (nG / (nG - 1)) * ((n - 1) / (n - k));
  const V = Ii.map((r, a) => Ii.map((_, c) => fat * r.reduce((acc, v, j) => acc + v * meat[j].reduce((s2, m, l2) => s2 + m * Ii[l2][c], 0), 0)));
  return { b, ep: V.map((r, i) => Math.sqrt(r[i])), V, n, G: nG };
}

// ---------- 5. modelo de transição por zona + covariáveis + φ da zona ----------
const grupos = (lista, f) => { const m = new Map(); for (const s of lista) { const k = f(s); if (!m.has(k)) m.set(k, []); m.get(k).push(s); } return m; };
function ls2(l) {
  let xx = 0, xz = 0, zz = 0, xy = 0, zy = 0;
  for (const s of l) { const x = s.c1, z = Math.max(s.a2 - s.c1, 0), y = s.c2; xx += x * x; xz += x * z; zz += z * z; xy += x * y; zy += z * y; }
  const d = xx * zz - xz * xz; if (!(d > 0)) return null;
  return { r: (xy * zz - zy * xz) / d, s: (zy * xx - xy * xz) / d };
}
const valido = (f) => f && f.r > 0 && f.r <= 1 && f.s >= 0 && f.s < 1;
function modelar(lista) {
  const rUf = new Map(); for (const [u, l] of grupos(lista, (s) => s.uf)) { const f = ls2(l); rUf.set(u, valido(f) ? f.r : 0.95); }
  const rMun = new Map(); for (const [m, l] of grupos(lista, (s) => s.mun)) { const f = l.length >= 15 ? ls2(l) : null; rMun.set(m, valido(f) ? f.r : rUf.get(l[0].uf)); }
  let proprias = 0;
  for (const [, l] of grupos(lista, (s) => s.zon)) {
    const f = l.length >= 15 ? ls2(l) : null; let r, sv;
    if (valido(f)) { r = f.r; sv = f.s; proprias++; } else {
      const cnt = new Map(); for (const s of l) cnt.set(s.mun, (cnt.get(s.mun) ?? 0) + 1);
      r = rMun.get([...cnt].sort((a, b) => b[1] - a[1])[0][0]);
      let nu = 0, de = 0; for (const s of l) { nu += s.c2 - r * s.c1; de += Math.max(s.a2 - s.c1, 0); } sv = de > 0 ? Math.min(Math.max(nu / de, 0), 1) : 0;
    }
    for (const s of l) { s.esp2 = r * s.c1 + sv * Math.max(s.a2 - s.c1, 0); s.res = s.c2 - s.esp2; }
  }
  const com = lista.filter((s) => s.p60 != null);
  const cov = fe(com, (s) => s.res / s.a2, (s) => [s.p60, Math.log(s.a2)], (s) => s.a2, (s) => s.zon, (s) => s.mun);
  const mz = new Map(); for (const s of com) { const m = mz.get(s.zon) ?? { w: 0, p: 0, l: 0 }; m.w += s.a2; m.p += s.a2 * s.p60; m.l += s.a2 * Math.log(s.a2); mz.set(s.zon, m); }
  for (const s of lista) { const m = mz.get(s.zon); s.resAj = s.p60 != null && m ? s.res - s.a2 * (cov.b[0] * (s.p60 - m.p / m.w) + cov.b[1] * (Math.log(s.a2) - m.l / m.w)) : s.res; }
  // φ
  for (const s of lista) { s.p = Math.min(Math.max((s.c2 - s.resAj) / s.a2, 0.005), 0.995); s.vb = s.a2 * s.p * (1 - s.p); }
  const phiDe = (l) => Math.max(mediana(l.map((s) => s.resAj ** 2 / s.vb)) / 0.4549, 1e-3);
  const phiUf = new Map(); for (const [u, l] of grupos(lista, (s) => s.uf)) phiUf.set(u, phiDe(l));
  for (const [, l] of grupos(lista, (s) => s.zon)) { const phi = l.length >= 30 ? phiDe(l) : phiUf.get(l[0].uf); for (const s of l) { s.phi = phi; s.V = phi * s.vb; s.z = s.resAj / Math.sqrt(s.V); } }
  return { zonasProprias: proprias, cov: { p60: r3(cov.b[0]), ep: r3(cov.ep[0]), logA: r3(cov.b[1]), epLogA: r3(cov.ep[1]) } };
}
const mod = modelar(P);
log('modelo ajustado');

// ---------- 6. números centrais ----------
const LIM = [2, 3, 4, 5];
const caudas = (zs) => Object.fromEntries(LIM.map((k) => [k, { acima: zs.filter((z) => z >= k).length, abaixo: zs.filter((z) => z <= -k).length }]));
const soma = (l, f) => l.reduce((a, s) => a + f(s), 0);
const z3 = P.filter((s) => s.z >= 3), z4 = P.filter((s) => s.z >= 4);
const res = {
  geradoEm: new Date().toISOString(), conf, filtro, modelo: mod, ufs: [...new Set(P.map((s) => s.uf))].length,
  dppMediana: r3(quant(P.map((s) => s.dpp), 0.5)), dcTotal: soma(P, (s) => s.dc), esperadoTotal: Math.round(soma(P, (s) => s.esp2 - s.c1)),
  caudas: caudas(P.map((s) => s.z)),
  z3: { secoes: z3.length, excesso: Math.round(soma(z3, (s) => s.resAj)), dc: soma(z3, (s) => s.dc) },
  z4: { secoes: z4.length, excesso: Math.round(soma(z4, (s) => s.resAj)), dc: soma(z4, (s) => s.dc) },
};
log(`z≥4 ${z4.length}, z≤−4 ${P.filter((s) => s.z <= -4).length}`);

// ---------- 7. nulo: três versões do sorteio, mesma média e variância por seção ----------
// (a) autor: Bin(c1, r) + Bin(a2 − c1, s) com a raiz de r MAIOR; (b) a raiz de r MENOR; (c) normal simétrica N(m, V).
// Quando V ≥ a2·p(1−p): beta-binomial (a, b) ou normal (c). Seções sem solução: normal.
function gama(a, rnd) { // Marsaglia-Tsang
  if (a < 1) return gama(a + 1, rnd) * rnd() ** (1 / a);
  const d = a - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) { let x, v; do { const u1 = rnd() || 1e-300, u2 = rnd(); x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); v = 1 + c * x; } while (v <= 0); v = v * v * v; const u = rnd(); if (Math.log(u || 1e-300) < 0.5 * x * x + d - d * v + d * Math.log(v)) return d * v; }
}
const bern = (n, p, rnd) => { let k = 0; for (let i = 0; i < n; i++) if (rnd() < p) k++; return k; };
const normal = (rnd) => Math.sqrt(-2 * Math.log(rnd() || 1e-300)) * Math.cos(2 * Math.PI * rnd());
for (const s of P) {
  const n1 = s.c1, n0 = Math.max(s.a2 - s.c1, 0), m = s.a2 * s.p;
  s.tipo = 'bin';
  if (n0 === 0 || s.p >= 0.995 || s.p <= 0.005) { s.tipo = 'normal'; continue; }
  if (s.V >= s.vb) { s.tipo = s.V > s.vb ? 'beta' : 'binA'; s.rho = (s.V / s.vb - 1) / Math.max(s.a2 - 1, 1); continue; }
  const A = (n1 * s.a2) / n0, B = (-2 * m * n1) / n0, C = (m * m) / n0 - m + s.V, D = B * B - 4 * A * C;
  if (D < 0) { s.tipo = 'normal'; continue; }
  const rM = (-B + Math.sqrt(D)) / (2 * A), rm = (-B - Math.sqrt(D)) / (2 * A);
  const sM = (m - n1 * rM) / n0, sm = (m - n1 * rm) / n0;
  s.rM = rM; s.sM = sM; s.rm = rm; s.sm = sm;
  s.okM = rM >= 0 && rM <= 1 && sM >= 0 && sM <= 1; s.okm = rm >= 0 && rm <= 1 && sm >= 0 && sm <= 1;
}
function sortear(s, versao, rnd) {
  const m = s.a2 * s.p;
  if (versao === 'normal' || s.tipo === 'normal') return m + Math.sqrt(s.V) * normal(rnd);
  if (s.tipo === 'binA') return bern(s.a2, s.p, rnd);
  if (s.tipo === 'beta') { const kk = (1 - s.rho) / s.rho; const x = gama(s.p * kk, rnd), y = gama((1 - s.p) * kk, rnd); return bern(s.a2, x / (x + y), rnd); }
  const ok = versao === 'rMaior' ? s.okM : s.okm;
  if (!ok) return m + Math.sqrt(s.V) * normal(rnd);
  const r = versao === 'rMaior' ? s.rM : s.rm, sv = versao === 'rMaior' ? s.sM : s.sm;
  return bern(s.c1, r, rnd) + bern(s.a2 - s.c1, sv, rnd);
}
const ufs = [...new Set(P.map((s) => s.uf))].sort();
res.nulo = { tipos: Object.fromEntries(['bin', 'beta', 'binA', 'normal'].map((t) => [t, P.filter((s) => s.tipo === t).length])),
  raizMaiorValida: P.filter((s) => s.okM).length, raizMenorValida: P.filter((s) => s.okm).length };
const rnd = mulberry32(20261029);
const porUfNulo = {};
for (const versao of ['rMaior', 'rMenor', 'normal']) {
  const acc = Object.fromEntries(LIM.map((k) => [k, { acima: 0, abaixo: 0 }]));
  const uf4 = Object.fromEntries(ufs.map((u) => [u, { acima: 0, abaixo: 0, acima3: 0, abaixo3: 0 }]));
  const reps = versao === 'normal' ? REPL : REPL;
  for (let rep = 0; rep < reps; rep++) {
    for (const s of P) {
      const z = (sortear(s, versao, rnd) - s.a2 * s.p) / Math.sqrt(s.V);
      for (const k of LIM) { if (z >= k) acc[k].acima++; else if (z <= -k) acc[k].abaixo++; }
      if (z >= 4) uf4[s.uf].acima++; else if (z <= -4) uf4[s.uf].abaixo++;
      if (z >= 3) uf4[s.uf].acima3++; else if (z <= -3) uf4[s.uf].abaixo3++;
    }
    log(`nulo ${versao} réplica ${rep + 1}/${reps}`);
  }
  res.nulo[versao] = Object.fromEntries(LIM.map((k) => [k, { acima: r3(acc[k].acima / reps), abaixo: r3(acc[k].abaixo / reps), parteDireita: r3(acc[k].acima / (acc[k].acima + acc[k].abaixo)) }]));
  porUfNulo[versao] = uf4;
}

// ---------- 8. teste da cauda por UF: (a) o do autor (Bin(R+L, 1/2)); (b) contra a parte direita do NULO da própria UF ----------
const lnFat = (() => { const t = [0]; for (let i = 1; i <= 20000; i++) t[i] = t[i - 1] + Math.log(i); return t; })();
const binSup = (x, n, p) => { let a = 0; for (let k = x; k <= n; k++) a += Math.exp(lnFat[n] - lnFat[k] - lnFat[n - k] + k * Math.log(p) + (n - k) * Math.log1p(-p)); return Math.min(a, 1); };
const bh = (ps) => { const m = ps.length, o = ps.map((p, i) => [p, i]).sort((a, b) => a[0] - b[0]), q = new Array(m); let mn = 1; for (let k = m - 1; k >= 0; k--) { mn = Math.min(mn, (o[k][0] * m) / (k + 1)); q[o[k][1]] = mn; } return q; };
const pNac = res.nulo.rMaior[4].parteDireita, pNac3 = res.nulo.rMaior[3].parteDireita;
const linhasUf = ufs.map((uf) => {
  const l = P.filter((s) => s.uf === uf);
  const R = l.filter((s) => s.z >= 4).length, L = l.filter((s) => s.z <= -4).length, R3 = l.filter((s) => s.z >= 3).length, L3 = l.filter((s) => s.z <= -3).length;
  const nu = porUfNulo.rMaior[uf]; const pUf = (nu.acima + 0.5) / (nu.acima + nu.abaixo + 1), pUf3 = (nu.acima3 + 0.5) / (nu.acima3 + nu.abaixo3 + 1);
  return { uf, secoes: l.length, R4: R, L4: L, R3, L3, nuloR4: r3(nu.acima / REPL), nuloL4: r3(nu.abaixo / REPL), parteDireitaNuloUf4: r3(pUf), parteDireitaNuloUf3: r3(pUf3),
    pAutorMeio: R + L ? binSup(R, R + L, 0.5) : 1, pNuloUf4: R + L ? binSup(R, R + L, pUf) : 1, pNuloNac4: R + L ? binSup(R, R + L, pNac) : 1, pNuloUf3: R3 + L3 ? binSup(R3, R3 + L3, pUf3) : 1 };
});
for (const c of ['pAutorMeio', 'pNuloUf4', 'pNuloNac4', 'pNuloUf3']) { const q = bh(linhasUf.map((l) => l[c])); linhasUf.forEach((l, i) => { l['q' + c.slice(1)] = +q[i].toPrecision(3); l[c] = +l[c].toPrecision(3); }); }
res.caudaPorUf = linhasUf;
res.caudaPorUfResumo = { parteDireitaNuloNacional4: pNac, parteDireitaNuloNacional3: pNac3,
  ufsQ05: Object.fromEntries(['qAutorMeio', 'qNuloUf4', 'qNuloNac4', 'qNuloUf3'].map((c) => [c, linhasUf.filter((l) => l[c] < 0.05).map((l) => l.uf)])) };
// zonas que concentram a cauda direita z ≥ 4 nas UFs que passam
res.caudaDireitaPorZona = Object.entries(Object.groupBy(z4, (s) => s.zon)).map(([z, l]) => ({ zona: z, secoes: l.length, excesso: Math.round(soma(l, (s) => s.resAj)) }))
  .sort((a, b) => b.secoes - a.secoes).slice(0, 15);

// ---------- 9. resíduo pró-13: decis da parcela do 13 e controles ----------
const K = P.filter((s) => s.s1 != null && s.s2 != null && s.f1 >= 10 && s.f2 >= 10).sort((a, b) => a.s1 - b.s1);
K.forEach((s, i) => { s.dec = Math.min(9, Math.floor((i * 10) / K.length)); });
res.decis = Array.from({ length: 10 }, (_, d) => {
  const l = K.filter((s) => s.dec === d); const w = soma(l, (s) => s.a2);
  return { decil: d + 1, secoes: l.length, aptos: w, parcela13: r3(soma(l, (s) => s.a2 * s.s1) / w), excessoPP: r3(soma(l, (s) => s.resAj * 100) / w), excesso: Math.round(soma(l, (s) => s.resAj)),
    excessoNE: Math.round(soma(l.filter((s) => NE.has(s.uf)), (s) => s.resAj)), secoesNE: l.filter((s) => NE.has(s.uf)).length };
});
const base19 = soma(K.filter((s) => s.dec < 9), (s) => s.resAj) / soma(K.filter((s) => s.dec < 9), (s) => s.a2);
const d10 = K.filter((s) => s.dec === 9);
res.decil10 = { excesso: Math.round(soma(d10, (s) => s.resAj)), aptos: soma(d10, (s) => s.a2), excessoMedioDecis1a9PP: r3(100 * base19),
  excessoRelativoAosDecis1a9: Math.round(soma(d10, (s) => s.resAj) - base19 * soma(d10, (s) => s.a2)) };
// gradiente (autor): resAj/a2 × 100 ~ s1, zona; depois com controles
const bins = (v, cortes) => cortes.map((c, i) => Number(v >= c && (i === cortes.length - 1 || v < cortes[i + 1])));
const K2 = K.filter((s) => s.p60 != null && s.p1624 != null);
const q60 = [0.2, 0.4, 0.6, 0.8].map((q) => quant(K2.map((s) => s.p60), q)), q1624 = [0.2, 0.4, 0.6, 0.8].map((q) => quant(K2.map((s) => s.p1624), q));
const qab = [0.2, 0.4, 0.6, 0.8].map((q) => quant(K2.map((s) => 1 - s.c1 / s.a1), q));
const qout = [0.2, 0.4, 0.6, 0.8].map((q) => quant(K2.map((s) => s.out1 / s.c1), q)), qbn = [0.2, 0.4, 0.6, 0.8].map((q) => quant(K2.map((s) => s.bn1 / s.c1), q));
const y = (s) => (100 * s.resAj) / s.a2, w = (s) => s.a2, g = (s) => s.zon, c = (s) => s.mun;
const espec = {
  gradienteAutor: (s) => [s.s1 * 10],
  decil10: (s) => [Number(s.dec === 9)],
  decil10_idade: (s) => [Number(s.dec === 9), ...bins(s.p60, q60), ...bins(s.p1624, q1624)],
  decil10_idade_voto1t: (s) => [Number(s.dec === 9), ...bins(s.p60, q60), ...bins(s.p1624, q1624), ...bins(s.out1 / s.c1, qout), ...bins(s.bn1 / s.c1, qbn), ...bins(1 - s.c1 / s.a1, qab)],
  gradiente_idade_voto1t: (s) => [s.s1 * 10, ...bins(s.p60, q60), ...bins(s.p1624, q1624), ...bins(s.out1 / s.c1, qout), ...bins(s.bn1 / s.c1, qbn), ...bins(1 - s.c1 / s.a1, qab)],
};
res.residuo13 = {};
for (const [nome, xf] of Object.entries(espec)) {
  // cada controle vira 4 indicadoras (quintis 2 a 5; o 1º é a base)
  const aj = fe(K2, y, xf, w, g, c);
  const aptos10 = soma(K2.filter((s) => s.dec === 9), (s) => s.a2);
  res.residuo13[nome] = { b: r3(aj.b[0]), ep: r3(aj.ep[0]), t: r3(aj.b[0] / aj.ep[0]), n: aj.n, eleitoresNoDecil10: nome.startsWith('decil10') ? Math.round((aj.b[0] / 100) * aptos10) : undefined };
  for (const reg of ['NE']) {
    const l = K2.filter((s) => NE.has(s.uf)); const a2 = fe(l, y, xf, w, g, c);
    res.residuo13[nome][reg] = { b: r3(a2.b[0]), ep: r3(a2.ep[0]), t: r3(a2.b[0] / a2.ep[0]) };
  }
}
// composição do excesso do decil 10 (só seções com as três categorias nos dois turnos)
{
  const l = d10.filter((s) => s.bio);
  const part = (lista) => Object.fromEntries([['semBiometria', 'dsb'], ['porBiometria', 'dpb'], ['anoNascimento', 'dpg']].map(([n, f]) => {
    const a = fe(lista, (s) => s[f], (s) => [s.resAj, s.c2 - s.resAj - s.c1], () => 1, g, c); return [n, { doExcesso: r3(a.b[0]), ep: r3(a.ep[0]), doEsperado: r3(a.b[1]) }]; }));
  res.decil10Composicao = { secoes: l.length, todas: part(l), NE: part(l.filter((s) => NE.has(s.uf))) };
  res.decil10Composicao.exclusaoSemCategoria = d10.length - l.length;
}
// composição nacional do excesso (parte 2), sem o exterior / seções sem categoria
{
  const l = P.filter((s) => s.bio);
  res.parte2 = { secoes: l.length, excluidasSemCategoria: P.length - l.length, ...Object.fromEntries([['semBiometria', 'dsb'], ['porBiometria', 'dpb'], ['anoNascimento', 'dpg']].map(([n, f]) => {
    const a = fe(l, (s) => s[f], (s) => [s.resAj, s.c2 - s.resAj - s.c1], () => 1, g, c); return [n, { doExcesso: r3(a.b[0]), ep: r3(a.ep[0]), doEsperado: r3(a.b[1]), epEsp: r3(a.ep[1]) }]; })) };
}
// alvos para conferir no bruto
res.topoZ = [...P].sort((a, b) => b.z - a.z).slice(0, 10).map((s) => ({ k: s.k, a2: s.a2, c1: s.c1, c2: s.c2, z: r3(s.z), excesso: Math.round(s.resAj), v13: `${s.v13_1}->${s.v13_2}`, v22: `${s.v22_1}->${s.v22_2}`, dpb: s.dpb, dsb: s.dsb, dpg: s.dpg }));
res.topoDecil10NE = d10.filter((s) => NE.has(s.uf)).sort((a, b) => b.resAj - a.resAj).slice(0, 5).map((s) => ({ k: s.k, a2: s.a2, c1: s.c1, c2: s.c2, z: r3(s.z), excesso: Math.round(s.resAj), v13: `${s.v13_1}->${s.v13_2}`, v22: `${s.v22_1}->${s.v22_2}`, dpb: s.dpb, dsb: s.dsb, dpg: s.dpg }));

mkdirSync(SAIDA, { recursive: true });
writeFileSync(path.join(SAIDA, 'acd-reproducao.json'), JSON.stringify(res, null, 1));
writeFileSync(path.join(SAIDA, 'acd-reproducao-z4.csv'), ['chave;a1;a2;c1;c2;z;excesso', ...z4.sort((a, b) => b.z - a.z).map((s) => [s.k, s.a1, s.a2, s.c1, s.c2, r3(s.z), Math.round(s.resAj)].join(';'))].join('\n') + '\n');
log('fim');
console.log(JSON.stringify({ conf, filtro, dppMediana: res.dppMediana, caudas: res.caudas, z3: res.z3, z4: res.z4, nulo: res.nulo, resumoUf: res.caudaPorUfResumo, decil10: res.decil10, residuo13: res.residuo13 }, null, 1));
