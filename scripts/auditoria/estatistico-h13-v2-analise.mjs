// Estatístico eleitoral, H13 sinal V2 do painel (adendo de 30/10/2026 ao plano 16; resultado no doc 19).
// Separa composição (quem voltou a votar) de inserção no sinal "ΔV2 → ΔY" fora do Nordeste:
//   (a) A1: Δx_V2 × p16–24 e × p70+ da seção; A2: Δx_V2 × fração de 16–24 e de 70+ entre os SEM biometria no cadastro;
//   (b) B1: Δx_V2 da última hora antes do encerramento × resto do dia; B2: V2 em sequência (anterior também V2) × isolado;
//       descritivo: parcela da última hora por via e turno (diferença em diferenças), rajadas;
//   (d) contribuição de cada seção ao β (Frisch–Waugh), por zona e município; sem os 10 municípios de maior
//       contribuição; sem cada UF; lista das 20 seções de maior contribuição (para o teste c no bruto).
// Modelo de base = painel do plano 16: MQP, peso 13 + 22 do 2º turno, efeito fixo de local, CR1 por local, controles
// (sem biometria no cadastro, 60+, 16–24, escolaridade baixa, superior, log do eleitorado, modelo da urna no 2º turno).
// 18 testes (3 unidades × 6), Bonferroni |z| ≥ 2,99.
// Uso: node --max-old-space-size=14000 scripts/auditoria/estatistico-h13-v2-analise.mjs
// Entradas: banco (cópia de leitura), estatistico/h08/<t>t/*.secoes.jsonl, estatistico/h13-v2/{perfil-idade.csv,
//   horario-1t.jsonl, horario-2t.jsonl}, forense/perfil/<uf>.csv
// Saída: data/parsed/auditoria/estatistico/h13-v2/{resultado.json, top20.csv, concentracao-municipios.csv}
import { createReadStream } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { lerTabela } from './forense-lib.mjs';

const EST = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico');
const SAIDA = path.join(EST, 'h13-v2');
const REGIOES = {
  Nordeste: ['al', 'ba', 'ce', 'ma', 'pb', 'pe', 'pi', 'rn', 'se'],
  Norte: ['ac', 'am', 'ap', 'pa', 'ro', 'rr', 'to'],
  'Centro-Oeste': ['df', 'go', 'ms', 'mt'],
  Sudeste: ['es', 'mg', 'rj', 'sp'],
  Sul: ['pr', 'rs', 'sc'],
};
const UFS_BR = Object.values(REGIOES).flat();
const NE = new Set(REGIOES.Nordeste);
const UNIDADES = { 'Fora do Nordeste': UFS_BR.filter((u) => !NE.has(u)), Sudeste: REGIOES.Sudeste, Sul: REGIOES.Sul, Nordeste: REGIOES.Nordeste };
const TESTADAS = ['Fora do Nordeste', 'Sudeste', 'Sul'];
const N_TESTES = 18;
const Z_BONF = 2.9913; // Φ⁻¹(1 − 0,05 / 36)
const pBi = (z) => { const x = Math.abs(z) / Math.SQRT2, t = 1 / (1 + 0.5 * x); return t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))))); };

// ---------- carga ----------
const secoes = new Map();
const { db } = await abrirLeitura();
for (const turno of [1, 2]) {
  for (const r of db.prepare('SELECT uf, municipio, zona, secao, local, comparecimento, modelo_urna FROM secao WHERE turno = ?').iterate(turno)) {
    const id = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
    const s = secoes.get(id) ?? { id, uf: r.uf, municipio: r.municipio, zona: r.zona };
    s[`t${turno}`] = { local: r.local, comp: r.comparecimento, modelo: r.modelo_urna, v13: 0, v22: 0 };
    secoes.set(id, s);
  }
  for (const v of db.prepare('SELECT uf, municipio, zona, secao, numero, quantidade FROM voto_bu WHERE turno = ? AND cargo = 1 AND numero IN (13, 22)').iterate(turno)) {
    const t = secoes.get(`${v.uf}/${v.municipio}/${v.zona}/${v.secao}`)?.[`t${turno}`];
    if (t) t[v.numero === 13 ? 'v13' : 'v22'] += v.quantidade;
  }
}
db.close();
for (const turno of [1, 2]) {
  const dir = path.join(EST, 'h08', `${turno}t`);
  for (const f of (await readdir(dir)).filter((x) => x.endsWith('.secoes.jsonl'))) {
    for (const l of (await readFile(path.join(dir, f), 'utf8')).split('\n')) {
      if (!l) continue;
      const x = JSON.parse(l);
      const t = secoes.get(`${x.uf}/${x.municipio}/${x.zona}/${x.secao}`)?.[`t${turno}`];
      if (t) t.log = { votos: x.votos, ...x.vias };
    }
  }
  for await (const l of createInterface({ input: createReadStream(path.join(SAIDA, `horario-${turno}t.jsonl`)), crlfDelay: Infinity })) {
    if (!l) continue;
    const x = JSON.parse(l);
    const t = secoes.get(x.id)?.[`t${turno}`];
    if (t && !x.erro) t.hor = x;
  }
}
const perfil = new Map();
for (const uf of UFS_BR) for (const p of await lerTabela(path.join(DIR_DADOS, 'parsed', 'auditoria', 'forense', 'perfil', `${uf}.csv`), ['eleitores', 'biometria', 'idade60', 'idade16a24', 'escol_baixa', 'superior'])) perfil.set(`${p.uf}/${p.municipio}/${p.zona}/${p.secao}`, p);
const idade = new Map();
for (const p of await lerTabela(path.join(SAIDA, 'perfil-idade.csv'), ['eleitores', 'biometria', 'e16a24', 'e70', 'semBio', 'sb16a24', 'sb70'])) idade.set(`${p.uf}/${p.municipio}/${p.zona}/${p.secao}`, p);

// ---------- linhas do painel ----------
const exclusoes = {};
const exclui = (m) => { exclusoes[m] = (exclusoes[m] ?? 0) + 1; };
const linhas = [];
const somaV2 = (h) => (h.hora.v2 ?? []).reduce((a, b) => a + b, 0);
for (const s of secoes.values()) {
  if (s.uf === 'zz') continue;
  const a = s.t2, b = s.t1;
  if (!a?.comp || !b?.comp) { exclui('sem a seção nos dois turnos'); continue; }
  if (!a.log || !b.log) { exclui('sem diário'); continue; }
  if (a.log.votos !== a.comp || b.log.votos !== b.comp) { exclui('diário diferente do BU'); continue; }
  if (a.v13 + a.v22 < 20 || b.v13 + b.v22 < 20) { exclui('menos de 20 votos em 13 + 22'); continue; }
  const p = perfil.get(s.id), q = idade.get(s.id);
  if (!p || !p.eleitores || !q || !q.eleitores) { exclui('sem perfil do eleitorado'); continue; }
  if (!a.hor || !b.hor) { exclui('sem leitura de horário'); continue; }
  if (somaV2(a.hor) !== a.log.v2 || somaV2(b.hor) !== b.log.v2) { exclui('V2 do horário ≠ V2 da varredura'); continue; }
  const m = a.modelo;
  const xs = (t) => [t.log.v2 / t.log.votos, t.log.v3m / t.log.votos, t.log.v3s / t.log.votos];
  const xa = xs(a), xb = xs(b);
  const ult = (t) => (t.hor.ultima.v2 ?? 0) / t.log.votos;
  const sq = (t) => t.hor.v2Seq / t.log.votos;
  const Y = (t) => t.v13 / (t.v13 + t.v22);
  linhas.push({
    id: s.id, uf: s.uf, mun: `${s.uf}/${s.municipio}`, zona: `${s.uf}/${s.municipio}/${s.zona}`, g: `${s.uf}/${s.municipio}/${s.zona}/${a.local}`,
    w: a.v13 + a.v22, y: Y(a) - Y(b), y2: Y(a), dV2: xa[0] - xb[0], dV3m: xa[1] - xb[1], dV3s: xa[2] - xb[2], x2: xa,
    dV2ult: ult(a) - ult(b), dV2seq: sq(a) - sq(b),
    ctrl: [1 - p.biometria / p.eleitores, p.idade60 / p.eleitores, p.idade16a24 / p.eleitores, p.escol_baixa / p.eleitores, p.superior / p.eleitores, Math.log(p.eleitores), m === 'ue2013' ? 1 : 0, m === 'ue2015' ? 1 : 0, m === 'ue2020' ? 1 : 0],
    p1624: q.e16a24 / q.eleitores, p70: q.e70 / q.eleitores,
    semBioPoucos: q.semBio < 5 ? 1 : 0, fJovSB: q.semBio >= 5 ? q.sb16a24 / q.semBio : null, fIdoSB: q.semBio >= 5 ? q.sb70 / q.semBio : null,
    dV2abs: a.log.v2 - b.log.v2, a, b,
  });
}

// ---------- regressão com efeito fixo (demeaning ponderado), CR1 por grupo ----------
function cholInv(A) {
  const n = A.length, L = A.map((r) => r.map(() => 0));
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
    let s = A[i][j];
    for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
    if (i === j) { if (!(s > 1e-9 * A[i][i])) return { falha: i }; L[i][i] = Math.sqrt(s); } else L[i][j] = s / L[j][j];
  }
  const inv = A.map((_, c) => {
    const y = new Array(n).fill(0);
    for (let i = 0; i < n; i++) { let s = i === c ? 1 : 0; for (let k = 0; k < i; k++) s -= L[i][k] * y[k]; y[i] = s / L[i][i]; }
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) { let s = y[i]; for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k]; x[i] = s / L[i][i]; }
    return x;
  });
  return { inv };
}
/** rows: [{w, g, y, cols[]}]; nFoc primeiras colunas nunca saem. Devolve β, cov (CR1), nomes ativos, resíduos e matriz demeaned. */
function regredir(rows, nomes, nFoc) {
  const grupos = new Map();
  rows.forEach((r, i) => { const g = grupos.get(r.g); if (g) g.push(i); else grupos.set(r.g, [i]); });
  const K0 = nomes.length;
  const X = [], Y = [], W = [], G = [], idx = [];
  let gi = 0;
  for (const ii of grupos.values()) {
    if (ii.length < 2) continue;
    let sw = 0; const mx = new Array(K0).fill(0); let my = 0;
    for (const i of ii) { const r = rows[i]; sw += r.w; for (let k = 0; k < K0; k++) mx[k] += r.w * r.cols[k]; my += r.w * r.y; }
    for (let k = 0; k < K0; k++) mx[k] /= sw; my /= sw;
    for (const i of ii) { const r = rows[i]; X.push(r.cols.map((v, k) => v - mx[k])); Y.push(r.y - my); W.push(r.w); G.push(gi); idx.push(i); }
    gi++;
  }
  let ativas = [...Array(K0).keys()];
  for (;;) {
    const K = ativas.length;
    const A = ativas.map(() => new Array(K).fill(0)), bv = new Array(K).fill(0);
    for (let i = 0; i < X.length; i++) for (let p = 0; p < K; p++) { const xp = X[i][ativas[p]] * W[i]; bv[p] += xp * Y[i]; for (let q = 0; q <= p; q++) A[p][q] += xp * X[i][ativas[q]]; }
    for (let p = 0; p < K; p++) for (let q = p + 1; q < K; q++) A[p][q] = A[q][p];
    const sol = cholInv(A);
    if (sol.falha !== undefined) { if (ativas[sol.falha] < nFoc) return null; ativas = ativas.filter((_, a) => a !== sol.falha); continue; }
    const { inv } = sol;
    const beta = inv.map((row) => row.reduce((s, v, j) => s + v * bv[j], 0));
    const e = Y.map((y, i) => y - ativas.reduce((s, c, p) => s + X[i][c] * beta[p], 0));
    const meatG = new Map();
    for (let i = 0; i < X.length; i++) { let v = meatG.get(G[i]); if (!v) meatG.set(G[i], (v = new Array(K).fill(0))); for (let p = 0; p < K; p++) v[p] += W[i] * X[i][ativas[p]] * e[i]; }
    const meat = ativas.map(() => new Array(K).fill(0));
    for (const v of meatG.values()) for (let p = 0; p < K; p++) for (let q = 0; q < K; q++) meat[p][q] += v[p] * v[q];
    const N = X.length, esc = (gi / (gi - 1)) * ((N - 1) / (N - K));
    const cov = ativas.map((_, p) => ativas.map((__, q) => { let s = 0; for (let a = 0; a < K; a++) for (let b = 0; b < K; b++) s += inv[p][a] * meat[a][b] * inv[b][q]; return esc * s; }));
    return { N, grupos: gi, nomes: ativas.map((c) => nomes[c]), beta, cov, X, Y, W, idx, ativas };
  }
}
const coef = (r, nome) => { const p = r.nomes.indexOf(nome); return p < 0 ? null : { beta: r.beta[p], se: Math.sqrt(r.cov[p][p]), z: r.beta[p] / Math.sqrt(r.cov[p][p]) }; };
const diff = (r, a, b) => { const p = r.nomes.indexOf(a), q = r.nomes.indexOf(b); const d = r.beta[p] - r.beta[q]; const se = Math.sqrt(r.cov[p][p] + r.cov[q][q] - 2 * r.cov[p][q]); return { dif: d, se, z: d / se }; };
const CTRL = ['cadSemBio', 'p60', 'p16a24', 'pBaixa', 'pSup', 'logEle', 'u13', 'u15', 'u20'];
const wmean = (rs, f) => rs.reduce((a, r) => a + r.w * f(r), 0) / rs.reduce((a, r) => a + r.w, 0);

const resultado = { geradoEm: new Date().toISOString(), exclusoes, linhas: linhas.length, testes: [], unidades: {} };
const testa = (unidade, teste, o) => { const t = { unidade, teste, ...o, p: pBi(o.z), bonferroni: Math.abs(o.z) >= Z_BONF }; if (TESTADAS.includes(unidade)) resultado.testes.push(t); return t; };

for (const [unidade, ufs] of Object.entries(UNIDADES)) {
  const set = new Set(ufs);
  const rs = linhas.filter((r) => set.has(r.uf));
  const U = { secoes: rs.length };
  // base
  const base = regredir(rs.map((r) => ({ w: r.w, g: r.g, y: r.y, cols: [r.dV2, r.dV3m, r.dV3s, ...r.ctrl] })), ['dV2', 'dV3m', 'dV3s', ...CTRL], 3);
  U.base = { N: base.N, locais: base.grupos, dV2: coef(base, 'dV2') };
  // inclinação política das faixas (nível do 2º turno, mesmos controles + p70)
  const niv = regredir(rs.map((r) => ({ w: r.w, g: r.g, y: r.y2, cols: [...r.x2, ...r.ctrl, r.p70] })), ['v2', 'v3m', 'v3s', ...CTRL, 'p70'], 3);
  U.inclinacaoIdadeNivel2 = { p16a24: coef(niv, 'p16a24'), p70: coef(niv, 'p70') };
  // A1
  const m1624 = wmean(rs, (r) => r.p1624), m70 = wmean(rs, (r) => r.p70);
  const a1 = regredir(rs.map((r) => ({ w: r.w, g: r.g, y: r.y, cols: [r.dV2, r.dV2 * (r.p1624 - m1624), r.dV2 * (r.p70 - m70), r.dV3m, r.dV3s, ...r.ctrl, r.p70] })), ['dV2', 'dV2xP1624', 'dV2xP70', 'dV3m', 'dV3s', ...CTRL, 'p70'], 5);
  U.A1 = { dV2: coef(a1, 'dV2'), x1624: testa(unidade, 'A1 ΔV2 × p16–24', coef(a1, 'dV2xP1624')), x70: testa(unidade, 'A1 ΔV2 × p70+', coef(a1, 'dV2xP70')), medias: { p1624: m1624, p70: m70 } };
  // A2
  const comSB = rs.filter((r) => r.fJovSB !== null);
  const mj = wmean(comSB, (r) => r.fJovSB), mi = wmean(comSB, (r) => r.fIdoSB);
  const fj = (r) => (r.fJovSB === null ? mj : r.fJovSB), fi = (r) => (r.fIdoSB === null ? mi : r.fIdoSB);
  const a2 = regredir(rs.map((r) => ({ w: r.w, g: r.g, y: r.y, cols: [r.dV2, r.dV2 * (fj(r) - mj), r.dV2 * (fi(r) - mi), r.dV3m, r.dV3s, ...r.ctrl, fj(r), fi(r), r.semBioPoucos] })), ['dV2', 'dV2xJovSB', 'dV2xIdoSB', 'dV3m', 'dV3s', ...CTRL, 'fJovSB', 'fIdoSB', 'semBio<5'], 5);
  U.A2 = { dV2: coef(a2, 'dV2'), xJovSB: testa(unidade, 'A2 ΔV2 × jovens entre os sem biometria', coef(a2, 'dV2xJovSB')), xIdoSB: testa(unidade, 'A2 ΔV2 × 70+ entre os sem biometria', coef(a2, 'dV2xIdoSB')), medias: { fJovSB: mj, fIdoSB: mi }, secoesSemBioMenor5: rs.length - comSB.length };
  // B1
  const b1 = regredir(rs.map((r) => ({ w: r.w, g: r.g, y: r.y, cols: [r.dV2ult, r.dV2 - r.dV2ult, r.dV3m, r.dV3s, ...r.ctrl] })), ['dV2ult', 'dV2resto', 'dV3m', 'dV3s', ...CTRL], 4);
  U.B1 = { ultima: coef(b1, 'dV2ult'), resto: coef(b1, 'dV2resto'), dif: testa(unidade, 'B1 última hora − resto', diff(b1, 'dV2ult', 'dV2resto')) };
  // B2
  const b2 = regredir(rs.map((r) => ({ w: r.w, g: r.g, y: r.y, cols: [r.dV2seq, r.dV2 - r.dV2seq, r.dV3m, r.dV3s, ...r.ctrl] })), ['dV2seq', 'dV2iso', 'dV3m', 'dV3s', ...CTRL], 4);
  U.B2 = { sequencia: coef(b2, 'dV2seq'), isolado: coef(b2, 'dV2iso'), dif: testa(unidade, 'B2 sequência − isolado', diff(b2, 'dV2seq', 'dV2iso')) };
  // descritivo: última hora por via e turno, rajadas
  const tot = { 1: { v1: 0, v2: 0, v1u: 0, v2u: 0, v2seq: 0, raj: [] }, 2: { v1: 0, v2: 0, v1u: 0, v2u: 0, v2seq: 0, raj: [] } };
  for (const r of rs) for (const [t, x] of [[1, r.b], [2, r.a]]) {
    tot[t].v1 += x.log.v1; tot[t].v2 += x.log.v2; tot[t].v1u += x.hor.ultima.v1 ?? 0; tot[t].v2u += x.hor.ultima.v2 ?? 0; tot[t].v2seq += x.hor.v2Seq;
  }
  const rajada = (t) => { let n10 = 0, n20 = 0; for (const r of rs) { const x = t === 1 ? r.b : r.a; if (x.hor.v2Rajada10 >= 10) n10++; if (x.hor.v2Rajada10 >= 20) n20++; } return { secoesComRajada10ouMais: n10, secoesComRajada20ouMais: n20 }; };
  U.descritivo = Object.fromEntries([1, 2].map((t) => [t, { V2: tot[t].v2, V1: tot[t].v1, parcelaUltimaHoraV2: tot[t].v2u / tot[t].v2, parcelaUltimaHoraV1: tot[t].v1u / tot[t].v1, parcelaV2emSequencia: tot[t].v2seq / tot[t].v2, ...rajada(t) }]));
  U.descritivo.difEmDifUltimaHora = (U.descritivo[2].parcelaUltimaHoraV2 - U.descritivo[1].parcelaUltimaHoraV2) - (U.descritivo[2].parcelaUltimaHoraV1 - U.descritivo[1].parcelaUltimaHoraV1);
  // V2 a mais por hora (2º − 1º) contra V1 a mais por hora
  const porHora = (via) => { const h = new Array(24).fill(0); for (const r of rs) for (let k = 0; k < 24; k++) h[k] += (r.a.hor.hora[via]?.[k] ?? 0) - (r.b.hor.hora[via]?.[k] ?? 0); return h; };
  U.descritivo.aMaisPorHora = { v1: porHora('v1'), v2: porHora('v2') };

  // (d) contribuições (Frisch–Waugh): resíduo de ΔV2 e de y sobre os outros regressores, dentro do local
  if (unidade === 'Fora do Nordeste' || unidade === 'Sudeste' || unidade === 'Sul') {
    const p = base.nomes.indexOf('dV2');
    const outros = base.ativas.filter((_, q) => q !== p);
    const K = outros.length;
    const A = outros.map(() => new Array(K).fill(0)), bx = new Array(K).fill(0), by = new Array(K).fill(0);
    const colV2 = base.ativas[p];
    for (let i = 0; i < base.X.length; i++) for (let a = 0; a < K; a++) { const xa = base.X[i][outros[a]] * base.W[i]; bx[a] += xa * base.X[i][colV2]; by[a] += xa * base.Y[i]; for (let b = 0; b <= a; b++) A[a][b] += xa * base.X[i][outros[b]]; }
    for (let a = 0; a < K; a++) for (let b = a + 1; b < K; b++) A[a][b] = A[b][a];
    const { inv } = cholInv(A);
    const gx = inv.map((row) => row.reduce((s, v, j) => s + v * bx[j], 0)), gy = inv.map((row) => row.reduce((s, v, j) => s + v * by[j], 0));
    const contrib = [];
    let num = 0, den = 0;
    for (let i = 0; i < base.X.length; i++) {
      let rx = base.X[i][colV2], ry = base.Y[i];
      for (let a = 0; a < K; a++) { rx -= base.X[i][outros[a]] * gx[a]; ry -= base.X[i][outros[a]] * gy[a]; }
      const c = base.W[i] * rx * ry, l = base.W[i] * rx * rx;
      num += c; den += l;
      contrib.push({ r: rs[base.idx[i]], c, l });
    }
    const agrega = (chave) => {
      const m = new Map();
      for (const x of contrib) { const k = x.r[chave]; const o = m.get(k) ?? { k, c: 0, l: 0, n: 0 }; o.c += x.c; o.l += x.l; o.n++; m.set(k, o); }
      const arr = [...m.values()].sort((a, b) => b.c - a.c);
      const parte = (f) => { const n = Math.max(1, Math.round(arr.length * f)); const top = arr.slice(0, n); return { unidades: n, numerador: top.reduce((s, o) => s + o.c, 0) / num, alavanca: top.reduce((s, o) => s + o.l, 0) / den }; };
      const positivos = arr.filter((o) => o.c > 0).reduce((s, o) => s + o.c, 0);
      return { total: arr.length, betaFWL: num / den, numeradorPositivo: positivos / num, top1: parte(0.01), top5: parte(0.05), top10: parte(0.1), maiores: arr.slice(0, 15).map((o) => ({ k: o.k, secoes: o.n, partNumerador: o.c / num, partAlavanca: o.l / den })), arr };
    };
    const porMun = agrega('mun'), porZona = agrega('zona');
    // sem os 10 municípios de maior contribuição
    const tirar = new Set(porMun.arr.slice(0, 10).map((o) => o.k));
    const semTop = regredir(rs.filter((r) => !tirar.has(r.mun)).map((r) => ({ w: r.w, g: r.g, y: r.y, cols: [r.dV2, r.dV3m, r.dV3s, ...r.ctrl] })), ['dV2', 'dV3m', 'dV3s', ...CTRL], 3);
    const jack = {};
    for (const uf of ufs) {
      const rj = regredir(rs.filter((r) => r.uf !== uf).map((r) => ({ w: r.w, g: r.g, y: r.y, cols: [r.dV2, r.dV3m, r.dV3s, ...r.ctrl] })), ['dV2', 'dV3m', 'dV3s', ...CTRL], 3);
      if (rj) jack[uf] = coef(rj, 'dV2');
    }
    const secoesTop = contrib.sort((a, b) => b.c - a.c).slice(0, 20).map((x) => ({ id: x.r.id, partNumerador: x.c / num, dV2abs: x.r.dV2abs, v2_1: x.r.b.log.v2, v2_2: x.r.a.log.v2, votos1: x.r.b.log.votos, votos2: x.r.a.log.votos, Y1: x.r.b.v13 / (x.r.b.v13 + x.r.b.v22), Y2: x.r.a.v13 / (x.r.a.v13 + x.r.a.v22) }));
    U.concentracao = {
      municipios: { ...porMun, arr: undefined }, zonas: { ...porZona, arr: undefined },
      semTop10Municipios: { tirados: [...tirar], dV2: coef(semTop, 'dV2'), concentradoPeloCriterio: Math.abs(coef(semTop, 'dV2').z) < 3.67 },
      semCadaUF: jack, secoesTop,
      parteSecoesTop20: secoesTop.reduce((s, x) => s + x.partNumerador, 0),
    };
    if (unidade === 'Fora do Nordeste') {
      await writeFile(path.join(SAIDA, 'concentracao-municipios.csv'), ['municipio;secoes;parteNumerador;parteAlavanca', ...porMun.arr.map((o) => `${o.k};${o.n};${(o.c / num).toPrecision(5)};${(o.l / den).toPrecision(5)}`)].join('\n') + '\n');
      await writeFile(path.join(SAIDA, 'top20.csv'), ['id;parteNumerador;v2_1t;v2_2t;votos_1t;votos_2t;parcela13_1t;parcela13_2t', ...secoesTop.map((x) => `${x.id};${x.partNumerador.toPrecision(4)};${x.v2_1};${x.v2_2};${x.votos1};${x.votos2};${x.Y1.toFixed(4)};${x.Y2.toFixed(4)}`)].join('\n') + '\n');
    }
  }
  resultado.unidades[unidade] = U;
}
resultado.bonferroni = { testes: resultado.testes.length, declarados: N_TESTES, z: Z_BONF, passam: resultado.testes.filter((t) => t.bonferroni).length };
await writeFile(path.join(SAIDA, 'resultado.json'), JSON.stringify(resultado, null, 1));
console.log(JSON.stringify(resultado, (k, v) => (typeof v === 'number' ? +v.toPrecision(5) : v), 1));
