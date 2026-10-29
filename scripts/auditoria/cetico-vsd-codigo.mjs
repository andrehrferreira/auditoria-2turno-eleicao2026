// Revisor cético, achado "virada-sem-digital-e-liberacao-em-massa" (perícia 04, itens 8 e 9), lente reprodução e código.
// Conta independente, direto da cópia de leitura do banco (tabelas secao, voto_bu, perfil_log), universo completo dos
// dois turnos. Não usa os perfis nem o t8-secoes.jsonl do autor.
// Faz: (1) reprodução da tabela por faixa (com aritmética inteira nas fronteiras), exterior e item 8; (2) teste dentro da
// zona (efeito fixo de zona, erro-padrão agrupado por zona); (3) poder: votos trocados do 22 para o 13 numa cópia em
// memória dos dados; (4) definições: SA, contingência, exterior, null, empates.
// Uso: node scripts/auditoria/cetico-vsd-codigo.mjs  → data/parsed/auditoria/cetico/cetico-vsd-codigo.json
import { writeFileSync } from 'node:fs';
import { abrirLeitura } from '../../src/banco-leitura.js';

const SAIDA = 'data/parsed/auditoria/cetico/cetico-vsd-codigo.json';
const t0 = Date.now();
const log = (...a) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)}s]`, ...a);
const { db, ponteiro } = await abrirLeitura();

const S = new Map(); // chave uf/mun/zona/secao → { uf, mun, zona, t1, t2, v1, v2 }
const pega = (k, uf, mun, zona) => { let s = S.get(k); if (!s) { s = { uf, mun, zona }; S.set(k, s); } return s; };
for (const r of db.prepare(`SELECT turno, uf, municipio, zona, secao, situacao, tipo_urna, tipo_arquivo, comparecimento c,
    sem_biometria sb, por_biometria pb, por_biografia pg FROM secao`).iterate()) {
  pega(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, r.uf, r.municipio, r.zona)[`t${r.turno}`] = { ...r };
}
log('secao', S.size);
for (const r of db.prepare(`SELECT turno, uf, municipio, zona, secao, SUM(CASE WHEN numero = 13 THEN quantidade ELSE 0 END) l,
    SUM(CASE WHEN numero = 22 THEN quantidade ELSE 0 END) f, SUM(quantidade) tot, COUNT(*) linhas FROM voto_bu WHERE cargo = 1
    GROUP BY turno, uf, municipio, zona, secao`).iterate()) {
  pega(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, r.uf, r.municipio, r.zona)[`v${r.turno}`] = { l: r.l, f: r.f, tot: r.tot };
}
log('voto_bu');
const modelos = new Map();
for (const r of db.prepare(`SELECT uf, municipio, zona, secao, COUNT(*) n, GROUP_CONCAT(DISTINCT modelo_urna_log) m FROM perfil_log
    WHERE turno = 2 GROUP BY 1, 2, 3, 4`).iterate()) modelos.set(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, { n: r.n, m: r.m });
db.close();
log('perfil_log');

// ---------- universo e exclusões ----------
const excl = { semLinha2t: 0, situacao2tNaoCompleta: 0, comp2tZeroOuNulo: 0, bio2tNulo: 0, identidadeQuebrada: 0, sem1t: 0, sem1tVotos: 0, comp1tZero: 0 };
const BR = [], EXT = [];
for (const [k, s] of S) {
  if (!s.t2) { excl.semLinha2t++; continue; }
  if (s.t2.situacao !== 'completa') { excl.situacao2tNaoCompleta++; continue; }
  if (!(s.t2.c > 0)) { excl.comp2tZeroOuNulo++; continue; }
  const v1 = s.v1 ?? { l: 0, f: 0, tot: 0 }, v2 = s.v2 ?? { l: 0, f: 0, tot: 0 };
  const reg = { k, uf: s.uf, zona: `${s.uf}/${s.zona}`, mz: `${s.uf}/${s.mun}/${s.zona}`, tipo2: s.t2.tipo_urna, arq1: s.t1?.tipo_arquivo,
    c2: s.t2.c, pb2: s.t2.pb, sb2: s.t2.sb, pg2: s.t2.pg, c1: s.t1?.c ?? null, pb1: s.t1?.pb ?? null, pg1: s.t1?.pg ?? null,
    l1: v1.l, f1: v1.f, l2: v2.l, f2: v2.f };
  if (s.uf === 'zz') { EXT.push(reg); continue; }
  if (s.t2.pb == null) { excl.bio2tNulo++; continue; }
  if (s.t2.c !== s.t2.sb + s.t2.pb + s.t2.pg) excl.identidadeQuebrada++;
  if (!s.t1) excl.sem1t++;
  if (!s.v1) excl.sem1tVotos++;
  if (s.t1 && !(s.t1.c > 0)) excl.comp1tZero++;
  BR.push(reg);
}
log('Brasil', BR.length, 'exterior', EXT.length, excl);

// faixa com aritmética inteira; o autor usa float (1 - pb/c), que põe "exatamente 20%" em "menos de 20%"
const FX = ['100%', '80% a 99,9%', '50% a 79,9%', '20% a 49,9%', 'menos de 20%'];
const faixaInt = (c, pb) => { const sd = c - pb; return pb === 0 ? 0 : sd * 5 >= c * 4 ? 1 : sd * 2 >= c ? 2 : sd * 5 >= c ? 3 : 4; };
const faixaFloat = (c, pb) => { const p = 1 - pb / c; return p === 1 ? 0 : p >= 0.8 ? 1 : p >= 0.5 ? 2 : p >= 0.2 ? 3 : 4; };
for (const r of BR) { r.fx = faixaInt(r.c2, r.pb2); r.fxF = faixaFloat(r.c2, r.pb2); }

const vira13 = (r) => r.f1 > r.l1 && r.l2 > r.f2;
const vira22 = (r) => r.l1 > r.f1 && r.f2 > r.l2;
function tabela(rows, campo = 'fx', l2k = 'l2', f2k = 'f2') {
  const g = FX.map((n) => ({ faixa: n, secoes: 0, comp2: 0, vira13: 0, vira22: 0, l1: 0, f1: 0, l2: 0, f2: 0, empate1: 0, empate2: 0, vira13Larga: 0 }));
  for (const r of rows) {
    const x = g[r[campo]], l2 = r[l2k], f2 = r[f2k];
    x.secoes++; x.comp2 += r.c2; x.l1 += r.l1; x.f1 += r.f1; x.l2 += l2; x.f2 += f2;
    x.vira13 += r.f1 > r.l1 && l2 > f2; x.vira22 += r.l1 > r.f1 && f2 > l2;
    x.empate1 += r.l1 === r.f1; x.empate2 += l2 === f2;
    x.vira13Larga += r.f1 >= r.l1 && l2 > f2 && !(r.f1 === 0 && r.l1 === 0); // 22 ≥ 13 no 1º (inclui empate), 13 > 22 no 2º
  }
  for (const x of g) { x.p1 = 100 * x.l1 / (x.l1 + x.f1); x.p2 = 100 * x.l2 / (x.l2 + x.f2); x.ganho = x.p2 - x.p1; }
  return g;
}
const tabInt = tabela(BR, 'fx'), tabFloat = tabela(BR, 'fxF');
const mudaramFaixa = BR.filter((r) => r.fx !== r.fxF).map((r) => ({ k: r.k, c2: r.c2, pb2: r.pb2, int: FX[r.fx], float: FX[r.fxF] }));
const cem = BR.filter((r) => r.fx === 0).map((r) => ({ ...r }));

// composição por UF de cada faixa (o problema ecológico)
const compUF = FX.map((n, i) => {
  const c = new Map(); let tot = 0;
  for (const r of BR) if (r.fx === i) { c.set(r.uf, (c.get(r.uf) ?? 0) + 1); tot++; }
  return { faixa: n, top: [...c].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([u, n2]) => `${u} ${n2} (${(100 * n2 / tot).toFixed(1)}%)`) };
});

// exterior
const ext = { secoes: EXT.length, bioNulo: EXT.filter((r) => r.pb2 == null).length, vira13: EXT.filter(vira13).length, vira22: EXT.filter(vira22).length,
  l1: 0, f1: 0, l2: 0, f2: 0, comp2: 0, tipos: {} };
for (const r of EXT) { ext.l1 += r.l1; ext.f1 += r.f1; ext.l2 += r.l2; ext.f2 += r.f2; ext.comp2 += r.c2; ext.tipos[r.tipo2] = (ext.tipos[r.tipo2] ?? 0) + 1; }
ext.p1 = 100 * ext.l1 / (ext.l1 + ext.f1); ext.p2 = 100 * ext.l2 / (ext.l2 + ext.f2); ext.ganho = ext.p2 - ext.p1;

// ---------- item 8 ----------
const massa = BR.filter((r) => r.pg2 * 2 >= r.c2);
const mzMassa = new Set(massa.map((r) => r.mz));
const it8 = { secoes: massa.length, zonasMunZona: mzMassa.size, zonasEleitorais: new Set(massa.map((r) => r.zona)).size,
  votantes: massa.reduce((a, r) => a + r.c2, 0), manual: massa.reduce((a, r) => a + r.pg2, 0), cem: massa.filter((r) => r.pg2 === r.c2).length,
  tambem1t: massa.filter((r) => r.c1 > 0 && r.pg1 * 2 >= r.c1).length, sem1t: massa.filter((r) => r.c1 == null).length,
  modelos: {}, maisDeUmLog: 0 };
for (const r of massa) { const m = modelos.get(r.k); it8.modelos[m?.m ?? 'sem log'] = (it8.modelos[m?.m ?? 'sem log'] ?? 0) + 1; if (m?.n > 1) it8.maisDeUmLog++; }
const grp = { massa: { secoes: 0, l1: 0, f1: 0, l2: 0, f2: 0 }, resto: { secoes: 0, l1: 0, f1: 0, l2: 0, f2: 0 } };
const massaK = new Set(massa.map((r) => r.k));
for (const r of BR) if (mzMassa.has(r.mz)) { const g = grp[massaK.has(r.k) ? 'massa' : 'resto']; g.secoes++; g.l1 += r.l1; g.f1 += r.f1; g.l2 += r.l2; g.f2 += r.f2; }
for (const g of Object.values(grp)) { g.p1 = 100 * g.l1 / (g.l1 + g.f1); g.p2 = 100 * g.l2 / (g.l2 + g.f2); g.var = g.p2 - g.p1; }
it8.voto = grp;
// item 8, mesma conta com efeito fixo da zona (diferença de ganho seção a seção)

// ---------- regressão com efeito fixo (ponderada), erro-padrão agrupado ----------
function inv(A) {
  const n = A.length, M = A.map((r, i) => [...r, ...A.map((_, j) => (i === j ? 1 : 0))]);
  for (let i = 0; i < n; i++) {
    let p = i; for (let j = i + 1; j < n; j++) if (Math.abs(M[j][i]) > Math.abs(M[p][i])) p = j;
    [M[i], M[p]] = [M[p], M[i]];
    const d = M[i][i]; for (let j = 0; j < 2 * n; j++) M[i][j] /= d;
    for (let j = 0; j < n; j++) if (j !== i) { const f = M[j][i]; for (let c = 0; c < 2 * n; c++) M[j][c] -= f * M[i][c]; }
  }
  return M.map((r) => r.slice(n));
}
// rows: { y, x: [..], w, fe, cl }. fe = null → só intercepto.
function regFE(rows, K) {
  const gm = new Map();
  for (const r of rows) {
    const key = r.fe ?? '_';
    let g = gm.get(key); if (!g) { g = { w: 0, y: 0, x: new Float64Array(K) }; gm.set(key, g); }
    g.w += r.w; g.y += r.w * r.y; for (let j = 0; j < K; j++) g.x[j] += r.w * r.x[j];
  }
  const XtX = Array.from({ length: K }, () => new Array(K).fill(0)), Xty = new Array(K).fill(0);
  const dm = rows.map((r) => {
    const g = gm.get(r.fe ?? '_'); const xt = r.x.map((v, j) => v - g.x[j] / g.w); const yt = r.y - g.y / g.w;
    for (let a = 0; a < K; a++) { Xty[a] += r.w * xt[a] * yt; for (let b = 0; b < K; b++) XtX[a][b] += r.w * xt[a] * xt[b]; }
    return { xt, yt };
  });
  const B = inv(XtX), beta = B.map((row) => row.reduce((a, v, j) => a + v * Xty[j], 0));
  const sc = new Map();
  rows.forEach((r, i) => {
    const { xt, yt } = dm[i]; const e = yt - xt.reduce((a, v, j) => a + v * beta[j], 0);
    let s = sc.get(r.cl); if (!s) { s = new Float64Array(K); sc.set(r.cl, s); }
    for (let j = 0; j < K; j++) s[j] += r.w * xt[j] * e;
  });
  const G = sc.size, meat = Array.from({ length: K }, () => new Array(K).fill(0));
  for (const s of sc.values()) for (let a = 0; a < K; a++) for (let b = 0; b < K; b++) meat[a][b] += s[a] * s[b];
  const adj = G / (G - 1);
  const V = B.map((ra) => B[0].map((_, b) => ra.reduce((acc, v, j) => acc + v * meat[j].reduce((a2, m, l) => a2 + m * B[l][b], 0), 0) * adj));
  return { beta, se: beta.map((_, j) => Math.sqrt(V[j][j])), t: beta.map((b, j) => b / Math.sqrt(V[j][j])), n: rows.length, grupos: gm.size, clusters: G };
}

// especificações; y = variação da parcela do 13 (entre 13+22) do 1º para o 2º turno, em pontos percentuais
const validos = BR.filter((r) => r.l1 + r.f1 > 0 && r.l2 + r.f2 > 0);
const exclReg = BR.length - validos.length;
function linhas(rows, spec, fe, peso, l2k = 'l2', f2k = 'f2', l1k = 'l1', f1k = 'f1') {
  const out = [];
  for (const r of rows) {
    const l2 = r[l2k], f2 = r[f2k], l1 = r[l1k], f1 = r[f1k];
    const y = 100 * (l2 / (l2 + f2) - l1 / (l1 + f1));
    const sd = (r.c2 - r.pb2) / r.c2;
    let x;
    if (spec === 'x2') x = [sd];
    else if (spec === 'dx') { if (!(r.c1 > 0) || r.pb1 == null) continue; x = [sd - (r.c1 - r.pb1) / r.c1]; }
    else if (spec === 'comp') x = [r.sb2 / r.c2, r.pg2 / r.c2];
    else if (spec === 'k') x = [100 * (r.c2 - r.pb2) / (l2 + f2)]; // coef = fração dos sem digital trocados do 22 p/ o 13
    else if (spec === 'kcomp') x = [100 * r.sb2 / (l2 + f2), 100 * r.pg2 / (l2 + f2)];
    else if (spec === 'dxcomp') { if (!(r.c1 > 0) || r.pb1 == null) continue; x = [r.sb2 / r.c2 - (r.c1 - r.pb1 - r.pg1) / r.c1, r.pg2 / r.c2 - r.pg1 / r.c1]; }
    else if (spec === 'massa') { if (!r.mzMassa) continue; x = [r.massa ? 1 : 0]; }
    else if (spec === 'vira') { if (!(f1 > l1)) continue; out.push({ y: 100 * (l2 > f2 ? 1 : 0), x: [sd, (f1 - l1) / (l1 + f1)], w: 1, fe: fe ? r[fe] : null, cl: r.zona }); continue; }
    else if (spec === 'faixas') x = [r.fx <= 1 ? 1 : 0, r.fx === 2 ? 1 : 0, r.fx === 3 ? 1 : 0];
    else if (spec === 'ge20') x = [r.fx <= 3 ? 1 : 0];
    else if (spec === 'nivel2') { x = [sd]; out.push({ y: 100 * l2 / (l2 + f2), x, w: peso ? l2 + f2 : 1, fe: fe ? r[fe] : null, cl: r.zona }); continue; }
    out.push({ y, x, w: peso ? l2 + f2 : 1, fe: fe ? r[fe] : null, cl: r.zona });
  }
  return out;
}
const K = { x2: 1, dx: 1, comp: 2, k: 1, faixas: 3, ge20: 1, nivel2: 1, kcomp: 2, dxcomp: 2, massa: 1, vira: 2 };
for (const r of validos) { r.mzMassa = mzMassa.has(r.mz); r.massa = massaK.has(r.k); }
const reg = {};
for (const spec of ['x2', 'dx', 'comp', 'k', 'faixas', 'ge20', 'nivel2', 'kcomp', 'dxcomp', 'massa', 'vira']) for (const fe of [null, 'zona', 'mz']) for (const peso of [true, false]) {
  const nome = `${spec}|fe=${fe ?? 'nenhum'}|${peso ? 'peso=votos' : 'sem peso'}`;
  reg[nome] = regFE(linhas(validos, spec, fe, peso), K[spec]);
}
log('regressões');
const mediaV = validos.reduce((a, r) => a + r.l2 + r.f2, 0) / validos.length;

// ---------- poder: troca de votos 22 → 13 no 2º turno, numa cópia em memória ----------
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function bootContraste(rows, l2k, f2k, alvo, reps = 200, semente = 20261029) {
  // contraste da tabela: ganho agregado (grupo alvo) − ganho agregado (menos de 20%), SE por bootstrap de zonas
  const z = new Map();
  for (const r of rows) {
    let a = z.get(r.zona); if (!a) { a = [new Float64Array(4), new Float64Array(4)]; z.set(r.zona, a); }
    const g = alvo(r) ? 0 : r.fx === 4 ? 1 : -1; if (g < 0) continue;
    a[g][0] += r.l1; a[g][1] += r.f1; a[g][2] += r[l2k]; a[g][3] += r[f2k];
  }
  const Z = [...z.values()];
  const est = (sel) => {
    const t = [new Float64Array(4), new Float64Array(4)];
    for (const a of sel) for (let g = 0; g < 2; g++) for (let j = 0; j < 4; j++) t[g][j] += a[g][j];
    const gan = (v) => 100 * (v[2] / (v[2] + v[3]) - v[0] / (v[0] + v[1]));
    return gan(t[0]) - gan(t[1]);
  };
  const c = est(Z), rnd = mulberry32(semente), bs = [];
  for (let b = 0; b < reps; b++) { const sel = new Array(Z.length); for (let i = 0; i < Z.length; i++) sel[i] = Z[Math.floor(rnd() * Z.length)]; bs.push(est(sel)); }
  const m = bs.reduce((a, v) => a + v, 0) / reps, se = Math.sqrt(bs.reduce((a, v) => a + (v - m) ** 2, 0) / (reps - 1));
  return { contraste: c, se, t: c / se };
}
function injeta(rows, quem, quanto, semente = 7, ambos = false) {
  const rnd = mulberry32(semente); let total = 0, secoes = 0;
  for (const r of rows) {
    r.l2i = r.l2; r.f2i = r.f2; r.l1i = r.l1; r.f1i = r.f1;
    if (!quem(r)) continue;
    let q = quanto(r, rnd); q = Math.min(q, r.f2); if (q <= 0) continue;
    r.l2i += q; r.f2i -= q; total += q; secoes++;
    if (ambos) { const q1 = Math.min(q, r.f1); r.l1i += q1; r.f1i -= q1; total += q1; }
  }
  return { total, secoes };
}
const ge20 = (r) => r.fx <= 3, ge50 = (r) => r.fx <= 2;
const cenarios = [
  ['controle (sem injeção)', ge20, () => 0],
  ...[1, 2, 3, 5, 10].map((x) => [`${x} voto(s) por seção, seções ≥ 20% sem digital`, ge20, () => x]),
  ...[2, 5, 10, 20, 40].map((x) => [`${x} votos por seção, seções ≥ 50% sem digital`, ge50, () => x]),
  ...[0.25, 0.5].map((x) => [`em média ${x} voto por seção (sorteio), seções ≥ 20% sem digital`, ge20, (r, rnd) => (rnd() < x ? 1 : 0)]),
  ...[1, 3].map((x) => [`${x} voto(s) por seção, seções ≥ 50% sem digital`, ge50, () => x]),
  ['5 votos por seção nos DOIS turnos, seções ≥ 20% sem digital', ge20, () => 5, true],
  ...[0.0025, 0.005, 0.01, 0.02, 0.05].map((k) => [`${(100 * k).toFixed(1)}% dos votantes sem digital, todas as seções`, () => true,
    (r, rnd) => { const e = k * (r.c2 - r.pb2); return Math.floor(e) + (rnd() < e - Math.floor(e) ? 1 : 0); }]),
];
const poder = [];
for (const [nome, quem, quanto, ambos] of cenarios) {
  const inj = injeta(validos, quem, quanto, 7, ambos);
  const L = ['l2i', 'f2i', 'l1i', 'f1i'];
  const rx = regFE(linhas(validos, 'x2', 'zona', true, ...L), 1);
  const rk = regFE(linhas(validos, 'ge20', 'zona', true, ...L), 1);
  const rx0 = regFE(linhas(validos, 'x2', null, true, ...L), 1);
  const rd = regFE(linhas(validos, 'dx', 'zona', true, ...L), 1);
  const rkc = regFE(linhas(validos, 'kcomp', 'zona', true, ...L), 2);
  const rn = regFE(linhas(validos, 'nivel2', 'zona', true, ...L), 1);
  for (const r of validos) { r.l1b = r.l1; r.f1b = r.f1; r.l1 = r.l1i; r.f1 = r.f1i; }
  const b20 = bootContraste(validos, 'l2i', 'f2i', ge20), b50 = bootContraste(validos, 'l2i', 'f2i', ge50);
  const tab = tabela(validos, 'fx', 'l2i', 'f2i');
  for (const r of validos) { r.l1 = r.l1b; r.f1 = r.f1b; }
  poder.push({ cenario: nome, votosTrocados: inj.total, secoesAlteradas: inj.secoes, ganhoPorFaixa: tab.map((g) => +g.ganho.toFixed(3)),
    FEzona_dx: { beta: rd.beta[0], se: rd.se[0], t: rd.t[0] }, FEzona_kcomp: { beta: rkc.beta, se: rkc.se, t: rkc.t },
    FEzona_nivel2: { beta: rn.beta[0], se: rn.se[0], t: rn.t[0] },
    tabela_ge20_menos_lt20: b20, tabela_ge50_menos_lt20: b50,
    FEzona_x2: { beta: rx.beta[0], se: rx.se[0], t: rx.t[0] }, FEzona_ge20: { beta: rk.beta[0], se: rk.se[0], t: rk.t[0] },
    semFE_x2: { beta: rx0.beta[0], se: rx0.se[0], t: rx0.t[0] } });
  log('poder', nome, inj.total, rx.t[0].toFixed(2), b20.t.toFixed(2));
}

const resultado = {
  copia: ponteiro?.criadoEm ?? null, universo: { secoesNoBanco: S.size, brasil2t: BR.length, exterior2t: EXT.length, exclusoes: excl,
    excluidasDaRegressao_semVoto13ou22numTurno: exclReg, mediaVotos13e22_2t: mediaV },
  tabelaInteira: tabInt, tabelaFloatDoAutor: tabFloat, mudaramFaixaPorFloat: { n: mudaramFaixa.length, exemplos: mudaramFaixa.slice(0, 5) },
  cem, composicaoUF: compUF, exterior: ext, item8: it8, regressoes: reg, poder,
};
writeFileSync(SAIDA, JSON.stringify(resultado, null, 1));
log('gravado', SAIDA);
