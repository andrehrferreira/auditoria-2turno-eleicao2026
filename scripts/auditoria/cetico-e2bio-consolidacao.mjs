// Cético (consolidação) — achado "comparecimento-extra-sem-vies-biometria" (cientista-politico, E2).
// Confere os pontos em disputa do parecer da lente de reprodução (cetico-e2bio-reproducao.mjs):
//  1. o efeito fixo de UF "zera" o sinal nas 22 UFs, mas o subconjunto das UFs novas dava t = 3,1: de onde vem?
//     (subconjuntos: 12 do autor, novas, novas sem PR, PR, RS e todas)
//  2. RS, que o autor apontou como a UF onde o teste mais importa, terminou de carregar depois da rodada do revisor.
//  3. nível da parcela sem biometria por UF nos dois turnos (o único olhar possível para inserção uniforme numa UF).
// Mesmo modelo do autor: ganho do finalista (2ºT − 1ºT)/c1 ~ 1 + Δbio/c1 + ΔnãoBio/c1 + E1/c1 + BN1/c1, peso c1, c1 ≥ 20;
// nãoBio = sem_biometria + por_biografia. Erro-padrão agrupado por município.
// Uso: node scripts/auditoria/cetico-e2bio-consolidacao.mjs   (banco somente leitura; ~1–3 min)
// Saída: data/parsed/auditoria/cetico/e2bio-consolidacao.json
import { mkdirSync, writeFileSync } from 'node:fs';
import { abrirLeitura } from '../../src/banco-leitura.js';

const SAIDA = 'data/parsed/auditoria/cetico';
mkdirSync(SAIDA, { recursive: true });
const { db, fonte } = await abrirLeitura();
const ELEICAO = { 1: 6257, 2: 6258 };
const UFS_AUTOR = ['ac', 'al', 'am', 'ap', 'ba', 'ce', 'df', 'es', 'go', 'ma', 'mg', 'ms'];
const UFS_REVISOR = [...UFS_AUTOR, 'mt', 'pa', 'pb', 'pe', 'pi', 'pr', 'rj', 'rn', 'ro', 'rr'];

const carga = db.prepare(`SELECT c1.uf, c1.carregado_em FROM carga c1 JOIN carga c2 ON c2.uf = c1.uf AND c2.turno = 2
  WHERE c1.turno = 1 ORDER BY c1.uf`).all();
const ufs = carga.map((r) => r.uf);
const ufSet = new Set(ufs);
console.error('fonte:', fonte, '| UFs com 1º turno:', ufs.join(','));

const chave = (r) => `${r.uf}|${r.municipio}|${r.zona}|${r.secao}`;
const sec = [new Map(), new Map()];
const qSec = db.prepare(`SELECT uf, municipio, zona, secao, situacao, comparecimento c, sem_biometria sb, por_biometria pb, por_biografia pg
  FROM secao WHERE turno = ? AND uf = ?`);
for (const t of [1, 2]) for (const uf of ufs) for (const r of qSec.iterate(t, uf)) sec[t - 1].set(chave(r), { ...r, L: 0, F: 0, BN: 0 });

// só 13, 22 e branco/nulo (numero nulo): três buscas pelo índice de candidato; eliminados = c − 13 − 22 − BN
// (a soma dos votos = comparecimento foi verificada pelo revisor em todas as seções, exceto 2 de MG com c1 < 20)
const qNum = db.prepare(`SELECT uf, municipio, zona, secao, numero, quantidade q FROM voto_bu INDEXED BY voto_bu_candidato
  WHERE turno = ? AND eleicao = ? AND cargo = 1 AND numero = ?`);
const qBN = db.prepare(`SELECT uf, municipio, zona, secao, tipo_voto, quantidade q FROM voto_bu INDEXED BY voto_bu_candidato
  WHERE turno = ? AND eleicao = ? AND cargo = 1 AND numero IS NULL`);
for (const t of [1, 2]) {
  const t0 = Date.now();
  for (const n of [13, 22]) for (const r of qNum.iterate(t, ELEICAO[t], n)) {
    if (!ufSet.has(r.uf)) continue; const s = sec[t - 1].get(chave(r)); if (!s) continue;
    if (n === 13) s.L += r.q; else s.F += r.q;
  }
  for (const r of qBN.iterate(t, ELEICAO[t])) {
    if (!ufSet.has(r.uf)) continue; const s = sec[t - 1].get(chave(r)); if (!s) continue;
    if (r.tipo_voto !== 'branco' && r.tipo_voto !== 'nulo') throw new Error(`tipo_voto inesperado com numero nulo: ${r.tipo_voto}`);
    s.BN += r.q;
  }
  console.error(`turno ${t}: ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}

const munId = new Map();
const S = [];
for (const [k, a] of sec[0]) {
  const b = sec[1].get(k);
  if (a.situacao !== 'completa' || !b || b.situacao !== 'completa' || a.c < 20 || a.sb == null || b.sb == null) continue;
  const m = `${a.uf}|${a.municipio}`; if (!munId.has(m)) munId.set(m, munId.size);
  S.push({ uf: a.uf, mun: munId.get(m), c1: a.c, c2: b.c, bio1: a.pb, bio2: b.pb, nb1: a.sb + a.pg, nb2: b.sb + b.pg,
    L1: a.L, L2: b.L, F1: a.F, F2: b.F, BN1: a.BN, E1: a.c - a.L - a.F - a.BN });
}
console.error('seções pareadas:', S.length);

function inverter(M) {
  const n = M.length; const A = M.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; const d = A[c][c];
    for (let j = 0; j < 2 * n; j++) A[c][j] /= d;
    for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c]; for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[c][j]; }
  }
  return A.map((r) => r.slice(n));
}
// MQ ponderado (peso c1) com EP agrupado por município
function mqp(xs, ys, ws, muns) {
  const p = xs[0].length; const n = xs.length;
  const XtX = Array.from({ length: p }, () => Array(p).fill(0)); const Xty = Array(p).fill(0);
  for (let i = 0; i < n; i++) for (let a = 0; a < p; a++) { Xty[a] += ws[i] * xs[i][a] * ys[i]; for (let c = 0; c < p; c++) XtX[a][c] += ws[i] * xs[i][a] * xs[i][c]; }
  const iv = inverter(XtX); const b = iv.map((r) => r.reduce((acc, v, j) => acc + v * Xty[j], 0));
  const cl = new Map();
  for (let i = 0; i < n; i++) {
    const e = ys[i] - xs[i].reduce((acc, v, j) => acc + v * b[j], 0);
    const g = cl.get(muns[i]) ?? Array(p).fill(0); for (let a = 0; a < p; a++) g[a] += ws[i] * xs[i][a] * e; cl.set(muns[i], g);
  }
  const meat = Array.from({ length: p }, () => Array(p).fill(0));
  for (const g of cl.values()) for (let a = 0; a < p; a++) for (let c = 0; c < p; c++) meat[a][c] += g[a] * g[c];
  const mult = (A, B) => A.map((r) => B[0].map((_, j) => r.reduce((acc, v, k) => acc + v * B[k][j], 0)));
  const G = cl.size; const f = G > 1 ? (G / (G - 1)) * ((n - 1) / (n - p)) : NaN;
  return { b, V: mult(mult(iv, meat), iv).map((r) => r.map((v) => v * f)), n, G };
}
const X = (s) => [(s.bio2 - s.bio1) / s.c1, (s.nb2 - s.nb1) / s.c1, s.E1 / s.c1, s.BN1 / s.c1];
const Y = { 13: (s) => (s.L2 - s.L1) / s.c1, 22: (s) => (s.F2 - s.F1) / s.c1 };
const r3 = (v) => Math.round(v * 1000) / 1000;
// fe = 'nenhum' (constante, modelo do autor) | 'uf' | 'mun'  → diferença nãoBio − bio com EP e t
function ajustar(lista, alvo, fe) {
  let xs = lista.map(X); let ys = lista.map(Y[alvo]); const ws = lista.map((s) => s.c1);
  let iB = 0, iN = 1;
  if (fe === 'nenhum') { xs = xs.map((x) => [1, ...x]); iB = 1; iN = 2; }
  else {
    const g = (s) => (fe === 'uf' ? s.uf : s.mun); const soma = new Map();
    lista.forEach((s, i) => { const a = soma.get(g(s)) ?? { w: 0, x: [0, 0, 0, 0], y: 0 }; a.w += ws[i]; a.y += ws[i] * ys[i]; xs[i].forEach((v, j) => { a.x[j] += ws[i] * v; }); soma.set(g(s), a); });
    xs = xs.map((x, i) => { const a = soma.get(g(lista[i])); return x.map((v, j) => v - a.x[j] / a.w); });
    ys = ys.map((y, i) => { const a = soma.get(g(lista[i])); return y - a.y / a.w; });
  }
  const r = mqp(xs, ys, ws, lista.map((s) => s.mun));
  const d = r.b[iN] - r.b[iB]; const ep = Math.sqrt(r.V[iN][iN] + r.V[iB][iB] - 2 * r.V[iN][iB]);
  return { bio: r3(r.b[iB]), naoBio: r3(r.b[iN]), d: r3(d), ep: r3(ep), t: Number.isFinite(ep) ? +(d / ep).toFixed(2) : null, secoes: r.n, municipios: r.G };
}
const bloco = (lista) => Object.fromEntries(['nenhum', 'uf', 'mun'].map((fe) => [fe, { 13: ajustar(lista, 13, fe), 22: ajustar(lista, 22, fe) }]));

const subconjuntos = {
  autor12: S.filter((s) => UFS_AUTOR.includes(s.uf)),
  novas10: S.filter((s) => UFS_REVISOR.includes(s.uf) && !UFS_AUTOR.includes(s.uf)),
  novas10SemPR: S.filter((s) => UFS_REVISOR.includes(s.uf) && !UFS_AUTOR.includes(s.uf) && s.uf !== 'pr'),
  revisor22: S.filter((s) => UFS_REVISOR.includes(s.uf)),
  revisor22SemPR: S.filter((s) => UFS_REVISOR.includes(s.uf) && s.uf !== 'pr'),
  todasCarregadas: S,
  todasSemPR: S.filter((s) => s.uf !== 'pr'),
};
for (const uf of ufs.filter((u) => !UFS_REVISOR.includes(u))) subconjuntos[`so_${uf}`] = S.filter((s) => s.uf === uf);
subconjuntos.so_pr = S.filter((s) => s.uf === 'pr');
subconjuntos.so_mg = S.filter((s) => s.uf === 'mg');

const res = { geradoEm: new Date().toISOString(), fonte, ufsCarregadas: ufs, carga, secoesPareadas: S.length, modelos: {} };
for (const [nome, lista] of Object.entries(subconjuntos)) { if (lista.length) res.modelos[nome] = bloco(lista); console.error(nome, lista.length); }

// nível por UF: parcela não-biométrica no comparecimento nos dois turnos e ganho dos finalistas
res.nivelPorUf = ufs.map((uf) => {
  const l = S.filter((s) => s.uf === uf); const sum = (f) => l.reduce((a, s) => a + f(s), 0);
  const c1 = sum((s) => s.c1), c2 = sum((s) => s.c2), nb1 = sum((s) => s.nb1), nb2 = sum((s) => s.nb2);
  return { uf, secoes: l.length, pctNaoBio1: +(100 * nb1 / c1).toFixed(2), pctNaoBio2: +(100 * nb2 / c2).toFixed(2),
    dNaoBio: nb2 - nb1, dComp: c2 - c1, dL: sum((s) => s.L2 - s.L1), dF: sum((s) => s.F2 - s.F1) };
});
writeFileSync(`${SAIDA}/e2bio-consolidacao.json`, JSON.stringify(res, null, 1));
for (const [nome, m] of Object.entries(res.modelos)) for (const fe of ['nenhum', 'uf', 'mun'])
  console.log(nome.padEnd(16), fe.padEnd(6), '13:', JSON.stringify(m[fe][13]), '| 22: d', m[fe][22].d, 't', m[fe][22].t);
for (const n of res.nivelPorUf) console.log(JSON.stringify(n));
