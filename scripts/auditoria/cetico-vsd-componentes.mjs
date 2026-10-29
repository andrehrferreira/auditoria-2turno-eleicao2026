// Revisor cético (lente dados e definições), complemento de cetico-vsd-dados.mjs: separa "sem digital" nos seus dois
// componentes (sem biometria cadastrada x liberação manual), controla o voto dos eliminados no 1º turno e mede o item 8
// e o exterior com as seções do Sistema de Apuração. Universo completo, cópia de leitura.
// Uso: node scripts/auditoria/cetico-vsd-componentes.mjs -> data/parsed/auditoria/cetico/vsd-componentes.json
import { writeFileSync } from 'node:fs';
import { abrirLeitura } from '../../src/banco-leitura.js';

const { db, ponteiro } = await abrirLeitura();
const V = new Map();
for (const v of db.prepare('SELECT turno, uf, municipio, zona, secao, tipo_voto, numero, quantidade FROM voto_bu WHERE cargo = 1').iterate()) {
  const k = `${v.turno}/${v.uf}/${v.municipio}/${v.zona}/${v.secao}`;
  const s = V.get(k) ?? { l: 0, f: 0, outros: 0, bn: 0 };
  if (v.tipo_voto !== 'nominal') s.bn += v.quantidade;
  else if (v.numero === 13) s.l += v.quantidade;
  else if (v.numero === 22) s.f += v.quantidade;
  else s.outros += v.quantidade;
  V.set(k, s);
}
const L = db.prepare(`SELECT s.uf, s.municipio, s.zona, s.secao, s.tipo_urna, s.comparecimento c, s.por_biometria bio, s.sem_biometria sb, s.por_biografia pb,
  s1.comparecimento c1, s1.por_biometria bio1, s1.sem_biometria sb1, s1.por_biografia pb1, p.modelo_urna_log ml, s.modelo_urna mb
  FROM secao s LEFT JOIN secao s1 ON s1.turno = 1 AND s1.uf = s.uf AND s1.municipio = s.municipio AND s1.zona = s.zona AND s1.secao = s.secao
  LEFT JOIN perfil_log p ON p.turno = 2 AND p.uf = s.uf AND p.municipio = s.municipio AND p.zona = s.zona AND p.secao = s.secao
  WHERE s.turno = 2 AND s.situacao = 'completa'`).all();
db.close();

const S = [], EXT = [];
for (const r of L) {
  const k = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
  const a = V.get(`1/${k}`), b = V.get(`2/${k}`);
  if (!a || !b) continue;
  const o = { ...r, k, zona: `${r.uf}/${r.municipio}/${r.zona}`, l1: a.l, f1: a.f, o1: a.outros, bn1: a.bn, l2: b.l, f2: b.f, bn2: b.bn };
  if (r.uf === 'zz') { EXT.push(o); continue; }
  if (!(r.c > 0) || o.l1 + o.f1 === 0 || o.l2 + o.f2 === 0) continue;
  o.p = 1 - r.bio / r.c; o.pman = r.pb / r.c; o.psb = r.sb / r.c;
  o.p1man = r.c1 > 0 && r.pb1 != null ? r.pb1 / r.c1 : NaN;
  o.p1sb = r.c1 > 0 && r.sb1 != null ? r.sb1 / r.c1 : NaN;
  o.elim1 = o.o1 / (o.l1 + o.f1 + o.o1);
  o.bn1s = o.bn1 / (o.l1 + o.f1 + o.o1 + o.bn1);
  o.s1 = o.l1 / (o.l1 + o.f1);
  S.push(o);
}

function solve(A, b) {
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
  const K = xs.length, grupos = new Map(), rows = [];
  for (const s of dados) {
    const yy = y(s), xx = xs.map((f) => f(s)), ww = w(s);
    if (!Number.isFinite(yy) || xx.some((v) => !Number.isFinite(v)) || !(ww > 0)) continue;
    const g = fe ? fe(s) : '_';
    const G = grupos.get(g) ?? { w: 0, y: 0, x: new Array(K).fill(0) };
    G.w += ww; G.y += ww * yy; xx.forEach((v, j) => (G.x[j] += ww * v));
    grupos.set(g, G); rows.push({ g, c: cl(s), y: yy, x: xx, w: ww });
  }
  const XtX = Array.from({ length: K }, () => new Array(K).fill(0)), Xty = new Array(K).fill(0);
  for (const r of rows) {
    const G = grupos.get(r.g); r.yt = r.y - G.y / G.w; r.xt = r.x.map((v, j) => v - G.x[j] / G.w);
    for (let i = 0; i < K; i++) { Xty[i] += r.w * r.xt[i] * r.yt; for (let j = 0; j < K; j++) XtX[i][j] += r.w * r.xt[i] * r.xt[j]; }
  }
  const beta = solve(XtX, Xty), Ai = inv(XtX), meat = Array.from({ length: K }, () => new Array(K).fill(0)), sc = new Map();
  for (const r of rows) {
    const e = r.yt - r.xt.reduce((a, v, j) => a + v * beta[j], 0);
    const u = sc.get(r.c) ?? new Array(K).fill(0); r.xt.forEach((v, j) => (u[j] += r.w * v * e)); sc.set(r.c, u);
  }
  for (const u of sc.values()) for (let i = 0; i < K; i++) for (let j = 0; j < K; j++) meat[i][j] += u[i] * u[j];
  const G = sc.size, N = rows.length, aj = (G / (G - 1)) * ((N - 1) / (N - K));
  const Vc = Ai.map((r, i) => r.map((_, j) => aj * Ai[i].reduce((a, v, k) => a + v * meat[k].reduce((b, m, l) => b + m * Ai[l][j], 0), 0)));
  const ep = beta.map((_, i) => Math.sqrt(Vc[i][i]));
  return { n: N, fe: grupos.size, clusters: G, beta: beta.map((b) => +b.toFixed(4)), ep: ep.map((e) => +e.toFixed(4)), t: beta.map((b, i) => +(b / ep[i]).toFixed(2)) };
}
const ds = (s) => 100 * (s.l2 / (s.l2 + s.f2) - s.s1), W = (s) => s.l2 + s.f2, Z = (s) => s.zona;
const out = { copia: ponteiro?.criadoEm, n: S.length };
out.componentes = regFE(S, { y: ds, xs: [(s) => s.pman, (s) => s.psb], fe: Z, w: W });
out.componentesComControles = regFE(S, { y: ds, xs: [(s) => s.pman, (s) => s.psb, (s) => s.elim1, (s) => s.bn1s, (s) => s.s1], fe: Z, w: W });
out.pComControles = regFE(S, { y: ds, xs: [(s) => s.p, (s) => s.elim1, (s) => s.bn1s, (s) => s.s1], fe: Z, w: W });
out.componentesDelta = regFE(S, { y: ds, xs: [(s) => s.pman - s.p1man, (s) => s.psb - s.p1sb], fe: Z, w: W });
out.componentesNivel1t = regFE(S, { y: ds, xs: [(s) => s.p1man, (s) => s.p1sb], fe: Z, w: W });
const soma = (f) => S.reduce((a, s) => a + f(s) * W(s), 0);
out.somas = { pmanV: soma((s) => s.pman), psbV: soma((s) => s.psb), pV: soma((s) => s.p), V: soma(() => 1), l2: S.reduce((a, s) => a + s.l2, 0), f2: S.reduce((a, s) => a + s.f2, 0) };
const vv = (b, e, x) => ({ votos: Math.round((b * x) / 100), ic95: [Math.round(((b - 1.96 * e) * x) / 100), Math.round(((b + 1.96 * e) * x) / 100)] });
out.emVotos = {
  manual: vv(out.componentes.beta[0], out.componentes.ep[0], out.somas.pmanV),
  semBio: vv(out.componentes.beta[1], out.componentes.ep[1], out.somas.psbV),
  manualControles: vv(out.componentesComControles.beta[0], out.componentesComControles.ep[0], out.somas.pmanV),
  semBioControles: vv(out.componentesComControles.beta[1], out.componentesComControles.ep[1], out.somas.psbV),
  pControles: vv(out.pComControles.beta[0], out.pComControles.ep[0], out.somas.pV),
};
const massa = S.filter((s) => s.pb * 2 >= s.c);
const conta = (arr, f) => Object.fromEntries([...new Set(arr.map(f))].map((m) => [m, arr.filter((s) => f(s) === m).length]));
out.item8 = { secoes: massa.length, comp: massa.reduce((a, s) => a + s.c, 0), manual: massa.reduce((a, s) => a + s.pb, 0),
  modeloLog: conta(massa, (s) => s.ml), modeloBanco: conta(massa, (s) => s.mb), tipoUrna: conta(massa, (s) => s.tipo_urna) };
const ext = (arr) => {
  let l1 = 0, f1 = 0, l2 = 0, f2 = 0, v13 = 0, v22 = 0;
  for (const s of arr) { l1 += s.l1; f1 += s.f1; l2 += s.l2; f2 += s.f2; v13 += s.f1 > s.l1 && s.l2 > s.f2; v22 += s.l1 > s.f1 && s.f2 > s.l2; }
  return { secoes: arr.length, l1, f1, l2, f2, s1: +((100 * l1) / (l1 + f1)).toFixed(3), s2: +((100 * l2) / (l2 + f2)).toFixed(3), ganho: +(100 * (l2 / (l2 + f2) - l1 / (l1 + f1))).toFixed(3), v13, v22 };
};
out.exterior = { urna: ext(EXT.filter((s) => s.tipo_urna !== 'contingencia')), sistemaApuracao: ext(EXT.filter((s) => s.tipo_urna === 'contingencia')), todas: ext(EXT) };
// tabela por faixa de cada componente separado: ganho agregado e desvio dentro da zona (dummies com efeito fixo de zona, base < 10%)
const FX = [[0, 0.1], [0.1, 0.2], [0.2, 0.35], [0.35, 0.5], [0.5, 1.01]];
for (const [nome, fx] of [['semBio', (s) => s.psb], ['manual', (s) => s.pman]]) {
  const tab = FX.map(([a, b]) => { const g = S.filter((s) => fx(s) >= a && fx(s) < b); const L1 = g.reduce((x, s) => x + s.l1, 0), F1 = g.reduce((x, s) => x + s.f1, 0), L2 = g.reduce((x, s) => x + s.l2, 0), F2 = g.reduce((x, s) => x + s.f2, 0);
    return { faixa: `${100 * a}-${Math.min(100, 100 * b)}%`, secoes: g.length, s1: +(100 * L1 / (L1 + F1)).toFixed(2), s2: +(100 * L2 / (L2 + F2)).toFixed(2), ganho: +(100 * (L2 / (L2 + F2) - L1 / (L1 + F1))).toFixed(3) }; });
  const rz = regFE(S, { y: ds, xs: FX.slice(1).map(([a, b]) => (s) => +(fx(s) >= a && fx(s) < b)), fe: Z, w: W });
  out['faixas_' + nome] = { tabela: tab, dentroZonaContraBase10: rz };
}
writeFileSync('data/parsed/auditoria/cetico/vsd-componentes.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
