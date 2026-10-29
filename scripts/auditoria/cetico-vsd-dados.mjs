// Revisor cético, lente "dados e definições", achado virada-sem-digital-e-liberacao-em-massa (perícia 04, itens 8 e 9).
// Universo completo (princípio 9): todas as seções do 2º turno, 28 UFs, cópia de leitura do banco.
// (1) teste dentro da zona (efeito fixo de zona e de município) da variação da parcela do 13 entre turnos contra a parcela
//     sem digital da seção, com erro-padrão agrupado por zona; (2) poder: injeção de votos 22 -> 13 numa cópia em memória;
// (3) definições (Sistema de Apuração, contingência, reserva, agregadas, exterior, nulos); (4) critério de virada e empates;
// (5) reconciliação com os números da perícia.
// Uso: node scripts/auditoria/cetico-vsd-dados.mjs  ->  data/parsed/auditoria/cetico/vsd-dados.json
import { writeFileSync, mkdirSync } from 'node:fs';
import { abrirLeitura } from '../../src/banco-leitura.js';

const SAIDA = 'data/parsed/auditoria/cetico/vsd-dados.json';
const { db, ponteiro } = await abrirLeitura();
const out = { copia: ponteiro?.criadoEm ?? null, definicoes: {}, reconciliacao: {}, dentroZona: {}, poder: {}, virada: {}, item8: {} };

// ---------- votos 13 e 22 de presidente, por seção e turno ----------
const votos = new Map();
for (const v of db.prepare('SELECT turno, uf, municipio, zona, secao, numero, quantidade FROM voto_bu WHERE cargo = 1 AND numero IN (13, 22)').iterate()) {
  const k = `${v.turno}/${v.uf}/${v.municipio}/${v.zona}/${v.secao}`;
  const s = votos.get(k) ?? { l: 0, f: 0 };
  if (v.numero === 13) s.l += v.quantidade; else s.f += v.quantidade;
  votos.set(k, s);
}
const totPres = new Map();
for (const v of db.prepare('SELECT turno, uf, municipio, zona, secao, SUM(quantidade) q FROM voto_bu WHERE cargo = 1 GROUP BY 1, 2, 3, 4, 5').iterate())
  totPres.set(`${v.turno}/${v.uf}/${v.municipio}/${v.zona}/${v.secao}`, v.q);

// ---------- (3) definições: o que cada tipo de boletim traz ----------
out.definicoes.porTipo = db.prepare(`SELECT turno, uf = 'zz' exterior, situacao, coalesce(tipo_urna, '-') tipo_urna, coalesce(tipo_arquivo, '-') tipo_arquivo,
  COUNT(*) secoes, SUM(comparecimento IS NULL) comp_null, SUM(comparecimento = 0) comp_zero, SUM(por_biometria IS NULL) bio_null,
  SUM(comparecimento <> coalesce(por_biometria, 0) + coalesce(sem_biometria, 0) + coalesce(por_biografia, 0)) soma_difere
  FROM secao GROUP BY 1, 2, 3, 4, 5 ORDER BY 1, 2, 3, 4, 5`).all().map((r) => ({ ...r }));
// seções de contingência / Sistema de Apuração: votos de presidente que têm
out.definicoes.sistemaApuracao = db.prepare(`SELECT turno, uf, municipio, zona, secao, tipo_arquivo, comparecimento FROM secao WHERE tipo_urna = 'contingencia' ORDER BY 1, 2, 3, 4, 5`)
  .all().map((r) => ({ ...r, votosPresidente: totPres.get(`${r.turno}/${r.uf}/${r.municipio}/${r.zona}/${r.secao}`) ?? 0, l: votos.get(`${r.turno}/${r.uf}/${r.municipio}/${r.zona}/${r.secao}`)?.l ?? 0, f: votos.get(`${r.turno}/${r.uf}/${r.municipio}/${r.zona}/${r.secao}`)?.f ?? 0 }));
const sa2 = out.definicoes.sistemaApuracao.filter((r) => r.turno === 2);
out.definicoes.sa2tResumo = { secoes: sa2.length, exterior: sa2.filter((r) => r.uf === 'zz').length, comVotoPresidente: sa2.filter((r) => r.votosPresidente > 0).length, votosPresidente: sa2.reduce((a, r) => a + r.votosPresidente, 0), l: sa2.reduce((a, r) => a + r.l, 0), f: sa2.reduce((a, r) => a + r.f, 0) };
out.definicoes.agregadas = db.prepare(`SELECT turno, COUNT(*) agregadas, COUNT(DISTINCT uf || '/' || municipio || '/' || zona || '/' || secao_principal) principais FROM secao_agregada GROUP BY 1`).all().map((r) => ({ ...r }));

// ---------- universo do 2º turno, Brasil ----------
const linhas = db.prepare(`SELECT s.uf, s.municipio, s.zona, s.secao, s.tipo_urna, s.comparecimento c, s.por_biometria bio, s.sem_biometria sb, s.por_biografia pb,
    s1.comparecimento c1, s1.por_biometria bio1, s1.sem_biometria sb1, s1.por_biografia pb1, s1.tipo_urna tipo1,
    (SELECT COUNT(*) FROM secao_agregada a WHERE a.turno = 2 AND a.uf = s.uf AND a.municipio = s.municipio AND a.zona = s.zona AND a.secao_principal = s.secao) nagreg
  FROM secao s LEFT JOIN secao s1 ON s1.turno = 1 AND s1.uf = s.uf AND s1.municipio = s.municipio AND s1.zona = s.zona AND s1.secao = s.secao
  WHERE s.turno = 2 AND s.situacao = 'completa' AND s.uf <> 'zz'`).all();
db.close();

const exclusoes = { compNuloOuZero: 0, bioNulo: 0, sem1t: 0, l1f1zero: 0, l2f2zero: 0 };
const S = [];
for (const r of linhas) {
  if (!(r.c > 0)) { exclusoes.compNuloOuZero++; continue; }
  if (r.bio == null) { exclusoes.bioNulo++; continue; }
  const k = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
  const a = votos.get(`1/${k}`), b = votos.get(`2/${k}`) ?? { l: 0, f: 0 };
  if (!a) { exclusoes.sem1t++; continue; }
  S.push({ k, uf: r.uf, mun: `${r.uf}/${r.municipio}`, zona: `${r.uf}/${r.municipio}/${r.zona}`, tipo: r.tipo_urna, tipo1: r.tipo1, c: r.c, bio: r.bio, sb: r.sb, pb: r.pb,
    c1: r.c1, bio1: r.bio1, pb1: r.pb1, sb1: r.sb1, l1: a.l, f1: a.f, l2: b.l, f2: b.f, nagreg: r.nagreg,
    p: 1 - r.bio / r.c, pman: r.pb / r.c, psb: r.sb / r.c, p1: r.c1 > 0 && r.bio1 != null ? 1 - r.bio1 / r.c1 : null });
}
out.definicoes.universoBrasil2t = { linhasSecao: linhas.length, usadas: S.length, exclusoes,
  porTipoUrna: Object.fromEntries([...new Set(S.map((s) => s.tipo))].map((t) => [t, S.filter((s) => s.tipo === t).length])),
  tipo1tDasUsadas: Object.fromEntries([...new Set(S.map((s) => s.tipo1 ?? 'null'))].map((t) => [t, S.filter((s) => (s.tipo1 ?? 'null') === t).length])),
  comAgregadas: S.filter((s) => s.nagreg > 0).length,
  pIgual1: S.filter((s) => s.p === 1).map((s) => ({ k: s.k, c: s.c, bio: s.bio, sb: s.sb, pb: s.pb, tipo: s.tipo })),
  pNaN: S.filter((s) => Number.isNaN(s.p)).length };

// ---------- faixas (mesma definição do autor) ----------
const FAIXAS = [['100%', 1, 1.0000001], ['80% a 99,9%', 0.8, 1], ['50% a 79,9%', 0.5, 0.8], ['20% a 49,9%', 0.2, 0.5], ['menos de 20%', 0, 0.2]];
const faixaDe = (p) => FAIXAS.find(([n, a, b]) => (n === '100%' ? p === 1 : p >= a && p < b))[0];
function tabelaFaixas(dados) {
  const g = new Map(FAIXAS.map(([n]) => [n, { secoes: 0, l1: 0, f1: 0, l2: 0, f2: 0, v13: 0, v22: 0 }]));
  for (const s of dados) {
    const x = g.get(faixaDe(s.p));
    x.secoes++; x.l1 += s.l1; x.f1 += s.f1; x.l2 += s.l2; x.f2 += s.f2;
    x.v13 += s.f1 > s.l1 && s.l2 > s.f2; x.v22 += s.l1 > s.f1 && s.f2 > s.l2;
  }
  return Object.fromEntries([...g].map(([n, x]) => [n, { ...x, s1: 100 * x.l1 / (x.l1 + x.f1), s2: 100 * x.l2 / (x.l2 + x.f2), ganho: 100 * (x.l2 / (x.l2 + x.f2) - x.l1 / (x.l1 + x.f1)) }]));
}
out.reconciliacao.faixas = tabelaFaixas(S);

// ---------- regressão com efeito fixo e erro agrupado ----------
// y = Δ parcela do 13 (pontos), X = colunas; efeito fixo por grupo `fe` (demean ponderado); cluster por `cl`.
function solve(A, b) { // Gauss pequeno
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let i = 0; i < n; i++) {
    let p = i; for (let j = i + 1; j < n; j++) if (Math.abs(M[j][i]) > Math.abs(M[p][i])) p = j;
    [M[i], M[p]] = [M[p], M[i]];
    for (let j = 0; j < n; j++) if (j !== i) { const f = M[j][i] / M[i][i]; for (let c = i; c <= n; c++) M[j][c] -= f * M[i][c]; }
  }
  return M.map((r, i) => r[n] / r[i]);
}
const inv = (A) => A.map((_, j) => solve(A, A.map((__, i) => (i === j ? 1 : 0))));
function regFE(dados, { y, xs, fe, cl = (s) => s.zona, w = () => 1 }) {
  const K = xs.length;
  const grupos = new Map();
  const rows = [];
  for (const s of dados) {
    const yy = y(s); if (!Number.isFinite(yy)) continue;
    const xx = xs.map((f) => f(s)); if (xx.some((v) => !Number.isFinite(v))) continue;
    const ww = w(s); if (!(ww > 0)) continue;
    const g = fe ? fe(s) : '_';
    const G = grupos.get(g) ?? { w: 0, y: 0, x: new Array(K).fill(0) };
    G.w += ww; G.y += ww * yy; xx.forEach((v, j) => (G.x[j] += ww * v));
    grupos.set(g, G);
    rows.push({ g, c: cl(s), y: yy, x: xx, w: ww });
  }
  const XtX = Array.from({ length: K }, () => new Array(K).fill(0)), Xty = new Array(K).fill(0);
  for (const r of rows) {
    const G = grupos.get(r.g);
    r.yt = r.y - G.y / G.w; r.xt = r.x.map((v, j) => v - G.x[j] / G.w);
    for (let i = 0; i < K; i++) { Xty[i] += r.w * r.xt[i] * r.yt; for (let j = 0; j < K; j++) XtX[i][j] += r.w * r.xt[i] * r.xt[j]; }
  }
  const beta = solve(XtX, Xty);
  const Ainv = inv(XtX);
  const meat = Array.from({ length: K }, () => new Array(K).fill(0));
  const sc = new Map();
  for (const r of rows) {
    const e = r.yt - r.xt.reduce((a, v, j) => a + v * beta[j], 0);
    const u = sc.get(r.c) ?? new Array(K).fill(0);
    r.xt.forEach((v, j) => (u[j] += r.w * v * e));
    sc.set(r.c, u);
  }
  for (const u of sc.values()) for (let i = 0; i < K; i++) for (let j = 0; j < K; j++) meat[i][j] += u[i] * u[j];
  const Gc = sc.size, N = rows.length, ajuste = (Gc / (Gc - 1)) * ((N - 1) / (N - K));
  const V = Ainv.map((r, i) => r.map((_, j) => ajuste * Ainv[i].reduce((a, v, k) => a + v * meat[k].reduce((b, m, l) => b + m * Ainv[l][j], 0), 0)));
  return { n: N, gruposFE: fe ? grupos.size : 1, clusters: Gc, beta, ep: beta.map((_, i) => Math.sqrt(V[i][i])), t: beta.map((b, i) => b / Math.sqrt(V[i][i])) };
}
const ds = (s) => 100 * (s.l2 / (s.l2 + s.f2) - s.l1 / (s.l1 + s.f1)); // pontos percentuais
const V2 = (s) => s.l2 + s.f2;
const xP = (s) => s.p;
function bateria(dados) {
  const r = {};
  r.semFE_peso = regFE(dados, { y: ds, xs: [xP], w: V2 });
  r.feUF_peso = regFE(dados, { y: ds, xs: [xP], fe: (s) => s.uf, w: V2 });
  r.feZona_peso = regFE(dados, { y: ds, xs: [xP], fe: (s) => s.zona, w: V2 });
  r.feZona_semPeso = regFE(dados, { y: ds, xs: [xP], fe: (s) => s.zona });
  r.feMun_peso = regFE(dados, { y: ds, xs: [xP], fe: (s) => s.mun, w: V2 });
  r.feZona_peso_manual_e_semBio = regFE(dados, { y: ds, xs: [(s) => s.pman, (s) => s.psb], fe: (s) => s.zona, w: V2 });
  r.feZona_peso_deltaP = regFE(dados, { y: ds, xs: [(s) => s.p - s.p1], fe: (s) => s.zona, w: V2 });
  r.feZona_peso_faixas = regFE(dados, { y: ds, xs: [(s) => +(s.p >= 0.2 && s.p < 0.5), (s) => +(s.p >= 0.5 && s.p < 0.8), (s) => +(s.p >= 0.8)], fe: (s) => s.zona, w: V2 });
  r.semFE_peso_dummy20 = regFE(dados, { y: ds, xs: [(s) => +(s.p >= 0.2)], w: V2 });
  return r;
}
const okV = S.filter((s) => s.l1 + s.f1 > 0 && s.l2 + s.f2 > 0);
exclusoes.l1f1zero = S.filter((s) => s.l1 + s.f1 === 0).length;
exclusoes.l2f2zero = S.filter((s) => s.l2 + s.f2 === 0).length;
out.dentroZona.nRegressao = okV.length;
out.dentroZona.real = bateria(okV);
// tradução em votos: β (pontos por unidade de p) × p × V2 / 100 = votos do 13 "a mais" em relação a p = 0
const sumPV = okV.reduce((a, s) => a + s.p * V2(s), 0);
const bz = out.dentroZona.real.feZona_peso;
out.dentroZona.emVotos = { somaPxV2: sumPV, beta: bz.beta[0], ep: bz.ep[0],
  votosPonto: bz.beta[0] * sumPV / 100, ic95: [(bz.beta[0] - 1.96 * bz.ep[0]) * sumPV / 100, (bz.beta[0] + 1.96 * bz.ep[0]) * sumPV / 100],
  porSecaoComP20: { secoes: okV.filter((s) => s.p >= 0.2).length } };
// mesma tabela por faixa, mas com a parcela da zona descontada (média ponderada de Δ da zona)
{
  const z = new Map();
  for (const s of okV) { const g = z.get(s.zona) ?? { w: 0, y: 0 }; g.w += V2(s); g.y += V2(s) * ds(s); z.set(s.zona, g); }
  const f = new Map(FAIXAS.map(([n]) => [n, { w: 0, y: 0, n: 0 }]));
  for (const s of okV) { const g = f.get(faixaDe(s.p)); const zz = z.get(s.zona); g.w += V2(s); g.y += V2(s) * (ds(s) - zz.y / zz.w); g.n++; }
  out.dentroZona.faixaMenosZona = Object.fromEntries([...f].map(([n, g]) => [n, { secoes: g.n, desvioMedioPontos: g.y / g.w }]));
}

// ---------- (2) poder: injeção 22 -> 13 numa cópia ----------
function injeta(dados, alvo, X) {
  let movidos = 0;
  const d = dados.map((s) => {
    if (!alvo(s)) return s;
    const m = typeof X === 'function' ? Math.min(X(s), s.f2) : Math.min(X, s.f2);
    movidos += m;
    return { ...s, l2: s.l2 + m, f2: s.f2 - m };
  });
  return { d, movidos };
}
const resumoPoder = (d, movidos, alvoN) => {
  const tf = tabelaFaixas(d);
  const rz = regFE(d, { y: ds, xs: [xP], fe: (s) => s.zona, w: V2 });
  const rzF = regFE(d, { y: ds, xs: [(s) => +(s.p >= 0.2 && s.p < 0.5), (s) => +(s.p >= 0.5 && s.p < 0.8), (s) => +(s.p >= 0.8)], fe: (s) => s.zona, w: V2 });
  const rt = regFE(d, { y: ds, xs: [(s) => +(s.p >= 0.2)], w: V2 });
  const rt50 = regFE(d, { y: ds, xs: [(s) => +(s.p >= 0.5)], w: V2 });
  return { secoesAlvo: alvoN, votosMovidos: movidos,
    ganhoFaixa: Object.fromEntries(Object.entries(tf).map(([n, x]) => [n, +x.ganho.toFixed(3)])),
    viradas13: Object.fromEntries(Object.entries(tf).map(([n, x]) => [n, x.v13])),
    zonaBetaP: { b: rz.beta[0], ep: rz.ep[0], t: rz.t[0] },
    zonaFaixas: { b: rzF.beta, ep: rzF.ep, t: rzF.t },
    tabelaSemFE_dummy20: { b: rt.beta[0], ep: rt.ep[0], t: rt.t[0] },
    tabelaSemFE_dummy50: { b: rt50.beta[0], ep: rt50.ep[0], t: rt50.t[0] } };
};
const cenarios = [];
for (const X of [0, 1, 2, 3, 5, 10]) {
  const alvo = (s) => s.p >= 0.2; const { d, movidos } = injeta(okV, alvo, X);
  cenarios.push({ cenario: `${X} votos por seção nas seções >= 20% sem digital`, ...resumoPoder(d, movidos, okV.filter(alvo).length) });
}
for (const X of [1, 2, 5, 10]) {
  const alvo = (s) => s.p >= 0.5; const { d, movidos } = injeta(okV, alvo, X);
  cenarios.push({ cenario: `${X} votos por seção nas seções >= 50% sem digital`, ...resumoPoder(d, movidos, okV.filter(alvo).length) });
}
// fraude que escala com o canal: fração phi dos votantes sem digital da seção trocada de 22 para 13
for (const phi of [0.005, 0.01, 0.02, 0.05]) {
  const alvo = () => true; const { d, movidos } = injeta(okV, alvo, (s) => Math.round(phi * (s.c - s.bio)));
  cenarios.push({ cenario: `${100 * phi}% dos votantes sem digital de cada seção (todas as seções)`, ...resumoPoder(d, movidos, okV.length) });
}
// fraude aleatória em parte das seções >= 20%: sorteio mulberry32
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
for (const [frac, X] of [[0.1, 10], [0.1, 20], [0.25, 10]]) {
  const rnd = mulberry32(20261029); const sel = new Set(okV.filter((s) => s.p >= 0.2 && rnd() < frac).map((s) => s.k));
  const alvo = (s) => sel.has(s.k); const { d, movidos } = injeta(okV, alvo, X);
  cenarios.push({ cenario: `${X} votos em ${100 * frac}% das seções >= 20% sem digital (sorteio)`, ...resumoPoder(d, movidos, sel.size) });
}
// limiar abaixo de 1 voto por seção: 1 voto numa fração q das seções >= 20% (sorteio), e fração phi dos sem digital com arredondamento sorteado
for (const q of [0.05, 0.1, 0.2, 0.3, 0.5]) {
  const rnd = mulberry32(7 + Math.round(q * 1000)); const sel = new Set(okV.filter((s) => s.p >= 0.2 && rnd() < q).map((s) => s.k));
  const alvo = (s) => sel.has(s.k); const { d, movidos } = injeta(okV, alvo, 1);
  cenarios.push({ cenario: `1 voto em ${100 * q}% das seções >= 20% sem digital (sorteio)`, ...resumoPoder(d, movidos, sel.size) });
}
for (const q of [0.2, 0.5]) {
  const rnd = mulberry32(11 + Math.round(q * 1000)); const sel = new Set(okV.filter((s) => s.p >= 0.5 && rnd() < q).map((s) => s.k));
  const alvo = (s) => sel.has(s.k); const { d, movidos } = injeta(okV, alvo, 1);
  cenarios.push({ cenario: `1 voto em ${100 * q}% das seções >= 50% sem digital (sorteio)`, ...resumoPoder(d, movidos, sel.size) });
}
for (const phi of [0.001, 0.0025, 0.005]) {
  const rnd = mulberry32(99 + Math.round(phi * 1e4)); const alvo = () => true;
  const { d, movidos } = injeta(okV, alvo, (s) => { const x = phi * (s.c - s.bio); const b = Math.floor(x); return b + (rnd() < x - b ? 1 : 0); });
  cenarios.push({ cenario: `${100 * phi}% dos votantes sem digital de cada seção, arredondamento sorteado`, ...resumoPoder(d, movidos, okV.length) });
}
out.poder.cenarios = cenarios;

// ---------- (4) virada: empates e denominador ----------
{
  const f = new Map(FAIXAS.map(([n]) => [n, { secoes: 0, empate1: 0, empate2: 0, vence22_1t: 0, vira13: 0, vira13_incluindoEmpate: 0, vence22_1t_margem10: 0, vira13_margem10: 0 }]));
  for (const s of okV) {
    const g = f.get(faixaDe(s.p)); g.secoes++;
    g.empate1 += s.l1 === s.f1; g.empate2 += s.l2 === s.f2;
    if (s.f1 > s.l1) { g.vence22_1t++; g.vira13 += s.l2 > s.f2; }
    g.vira13_incluindoEmpate += s.f1 >= s.l1 && s.l2 > s.f2 && !(s.f1 > s.l1 && s.l2 > s.f2) ? 1 : 0;
    const m = (s.f1 - s.l1) / (s.l1 + s.f1);
    if (m > 0 && m <= 0.10) { g.vence22_1t_margem10++; g.vira13_margem10 += s.l2 > s.f2; }
  }
  out.virada.porFaixa = Object.fromEntries([...f].map(([n, g]) => [n, { ...g, taxaVira13Entre22Vencedor: g.vence22_1t ? 100 * g.vira13 / g.vence22_1t : null, taxaVira13Margem10: g.vence22_1t_margem10 ? 100 * g.vira13_margem10 / g.vence22_1t_margem10 : null }]));
  // regressão dentro da zona: P(virar | 22 venceu no 1º com margem <= 10 pontos) contra p, com controle linear da margem
  const cand = okV.filter((s) => s.f1 > s.l1 && (s.f1 - s.l1) / (s.l1 + s.f1) <= 0.10);
  out.virada.lpmZona = regFE(cand, { y: (s) => 100 * (s.l2 > s.f2), xs: [xP, (s) => (s.f1 - s.l1) / (s.l1 + s.f1)], fe: (s) => s.zona });
  out.virada.lpmZona.n_candidatas = cand.length;
}

// ---------- item 8 dentro da zona ----------
{
  const massa = (s) => s.pb * 2 >= s.c;
  const zonasM = new Set(okV.filter(massa).map((s) => s.zona));
  const d = okV.filter((s) => zonasM.has(s.zona));
  out.item8.secoesMassa = okV.filter(massa).length; out.item8.zonas = zonasM.size; out.item8.secoesNasZonas = d.length;
  out.item8.massaSemVotoValido = S.filter(massa).length - okV.filter(massa).length;
  out.item8.feZona_peso = regFE(d, { y: ds, xs: [(s) => +massa(s)], fe: (s) => s.zona, w: V2 });
  out.item8.feZona_semPeso = regFE(d, { y: ds, xs: [(s) => +massa(s)], fe: (s) => s.zona });
  const agr = (f) => { let l1 = 0, f1 = 0, l2 = 0, f2 = 0, n = 0; for (const s of d.filter(f)) { n++; l1 += s.l1; f1 += s.f1; l2 += s.l2; f2 += s.f2; } return { n, s1: 100 * l1 / (l1 + f1), s2: 100 * l2 / (l2 + f2) }; };
  out.item8.agregado = { massa: agr(massa), resto: agr((s) => !massa(s)) };
  out.item8.tambem1t = okV.filter(massa).filter((s) => s.c1 > 0 && s.pb1 * 2 >= s.c1).length;
}

mkdirSync('data/parsed/auditoria/cetico', { recursive: true });
writeFileSync(SAIDA, JSON.stringify(out, null, 1));
const f2 = (v) => (typeof v === 'number' ? +v.toFixed(4) : v);
console.log(JSON.stringify({ universo: out.definicoes.universoBrasil2t, sa2t: out.definicoes.sa2tResumo, faixas: out.reconciliacao.faixas,
  real: Object.fromEntries(Object.entries(out.dentroZona.real).map(([k, r]) => [k, { n: r.n, fe: r.gruposFE, cl: r.clusters, b: r.beta.map(f2), ep: r.ep.map(f2), t: r.t.map(f2) }])),
  emVotos: out.dentroZona.emVotos, faixaMenosZona: out.dentroZona.faixaMenosZona, virada: out.virada, item8: out.item8 }, null, 1));
for (const c of cenarios) console.log(JSON.stringify(c));
