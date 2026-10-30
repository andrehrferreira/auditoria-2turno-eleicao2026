// Estatístico eleitoral, H13 sinal V2 do painel, adendo 3 de 30/10/2026 ao plano 16 (resultado no doc 22).
// Unidades: Sul, MG e RS. Medida principal: e_v = Δ(votos da via v) ÷ eleitores do cadastro, com Δc = Δ(votos) ÷ eleitores
// como controle: o coeficiente de e_V2 é a parte própria da V2 (V2 a mais contra eleitor pela digital a mais).
//   (a) A3/A4: e_V2 × escolaridade baixa, superior, solteiro, casado (seção inteira / só os sem biometria);
//   (b) e_V2 × fração dos V2 do 2º turno com "Foto do eleitor apresentada";
//   (c) referência nula da concentração por zona: bootstrap selvagem por local com efeito homogêneo (1.000 repetições);
//   (d) 2022 × 2026 por zona: ΔY ~ Δc + sb + Δc × sb (sb = sem biometria no cadastro de 2026), efeito fixo de UF.
// Vias pela leitura do diário com união das cópias (seções relidas em estatistico/h08-uniao). 39 testes, Bonferroni |z| ≥ 3,22.
// Uso: node --max-old-space-size=14000 scripts/auditoria/estatistico-h13-v2-analise2.mjs
// Entradas: as de estatistico-h13-v2-analise.mjs + h08-uniao/ + h13-v2/perfil-escol-civil.csv + h13-v2/zonas.csv
// Saída: data/parsed/auditoria/estatistico/h13-v2/resultado2.json
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
const UNID3 = { Sul: ['pr', 'rs', 'sc'], MG: ['mg'], RS: ['rs'] };
const TESTADAS = Object.keys(UNID3);
const N_TESTES = 39;
const Z_BONF = 3.2224; // Φ⁻¹(1 − 0,05 / 78)
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
// correção do parecer 42 (união das cópias da mesma urna): seções relidas com estatistico-h08-varredura.mjs --copias uniao
const uniao = { 1: 0, 2: 0 };
for (const turno of [1, 2]) {
  const dirU = path.join(EST, 'h08-uniao', `${turno}t`);
  for (const l of (await readFile(path.join(dirU, 'selecao.secoes.jsonl'), 'utf8')).split('\n')) {
    if (!l) continue;
    const x = JSON.parse(l);
    const t = secoes.get(`${x.uf}/${x.municipio}/${x.zona}/${x.secao}`)?.[`t${turno}`];
    if (t) { t.log = { votos: x.votos, ...x.vias }; uniao[turno]++; }
  }
  for (const l of (await readFile(path.join(EST, 'h08-uniao', `horario-${turno}t.jsonl`), 'utf8')).split('\n')) {
    if (!l) continue;
    const x = JSON.parse(l);
    const t = secoes.get(x.id)?.[`t${turno}`];
    if (t && !x.erro) t.hor = x;
  }
}
const escol = new Map();
for (const p of await lerTabela(path.join(SAIDA, 'perfil-escol-civil.csv'), ['eleitores', 'semBio', 'baixa', 'sup', 'solt', 'casa', 'sbBaixa', 'sbSup', 'sbSolt', 'sbCasa'])) escol.set(`${p.uf}/${p.municipio}/${p.zona}/${p.secao}`, p);
const perfil = new Map();
for (const uf of UFS_BR) for (const p of await lerTabela(path.join(DIR_DADOS, 'parsed', 'auditoria', 'forense', 'perfil', `${uf}.csv`), ['eleitores', 'biometria', 'idade60', 'idade16a24', 'escol_baixa', 'superior'])) perfil.set(`${p.uf}/${p.municipio}/${p.zona}/${p.secao}`, p);
const idade = new Map();
for (const p of await lerTabela(path.join(SAIDA, 'perfil-idade.csv'), ['eleitores', 'biometria', 'e16a24', 'e70', 'semBio', 'sb16a24', 'sb70'])) idade.set(`${p.uf}/${p.municipio}/${p.zona}/${p.secao}`, p);

// ---------- linhas do painel (medida por eleitor do cadastro) ----------
const exclusoes = {};
const exclui = (m) => { exclusoes[m] = (exclusoes[m] ?? 0) + 1; };
const linhas = [];
const somaV2 = (h) => (h.hora.v2 ?? []).reduce((a, b) => a + b, 0);
const todasUfs = new Set(Object.values(UNID3).flat());
for (const s of secoes.values()) {
  if (!todasUfs.has(s.uf)) continue;
  const a = s.t2, b = s.t1;
  if (!a?.comp || !b?.comp) { exclui('sem a seção nos dois turnos'); continue; }
  if (!a.log || !b.log) { exclui('sem diário'); continue; }
  if (a.log.votos !== a.comp || b.log.votos !== b.comp) { exclui('diário diferente do BU'); continue; }
  if (a.v13 + a.v22 < 20 || b.v13 + b.v22 < 20) { exclui('menos de 20 votos em 13 + 22'); continue; }
  const p = perfil.get(s.id), e = escol.get(s.id);
  if (!p || !p.eleitores || !e || !e.eleitores) { exclui('sem perfil do eleitorado'); continue; }
  if (!a.hor || !b.hor) { exclui('sem leitura de horário'); continue; }
  if (somaV2(a.hor) !== a.log.v2 || somaV2(b.hor) !== b.log.v2) { exclui('V2 do horário ≠ V2 do diário'); continue; }
  const m = a.modelo, el = p.eleitores;
  const Y = (t) => t.v13 / (t.v13 + t.v22);
  linhas.push({
    id: s.id, uf: s.uf, mun: `${s.uf}/${s.municipio}`, zona: `${s.uf}/${s.municipio}/${s.zona}`, g: `${s.uf}/${s.municipio}/${s.zona}/${a.local}`,
    w: a.v13 + a.v22, y: Y(a) - Y(b), y2: Y(a), Y1: Y(b), xV2_1: b.log.v2 / b.log.votos,
    eV2: (a.log.v2 - b.log.v2) / el, eV3m: (a.log.v3m - b.log.v3m) / el, eV3s: (a.log.v3s - b.log.v3s) / el, dC: (a.log.votos - b.log.votos) / el,
    x2: [a.log.v2 / a.log.votos, a.log.v3m / a.log.votos, a.log.v3s / a.log.votos],
    ctrl: [1 - p.biometria / el, p.idade60 / el, p.idade16a24 / el, p.escol_baixa / el, p.superior / el, Math.log(el), m === 'ue2013' ? 1 : 0, m === 'ue2015' ? 1 : 0, m === 'ue2020' ? 1 : 0],
    tr: [e.baixa / e.eleitores, e.sup / e.eleitores, e.solt / e.eleitores, e.casa / e.eleitores],
    trSB: e.semBio >= 5 ? [e.sbBaixa / e.semBio, e.sbSup / e.semBio, e.sbSolt / e.semBio, e.sbCasa / e.semBio] : null, poucosSB: e.semBio < 5 ? 1 : 0,
    fFoto: a.log.v2 >= 5 ? a.hor.v2Foto / a.log.v2 : null, poucosV2: a.log.v2 < 5 ? 1 : 0,
    a, b,
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


const resultado = { geradoEm: new Date().toISOString(), uniaoSecoesRelidas: uniao, exclusoes, linhas: linhas.length, testes: [], unidades: {} };
const testa = (unidade, teste, o) => { const t = { unidade, teste, ...o, p: o.pUnilateral ?? pBi(o.z), bonferroni: o.pUnilateral !== undefined ? o.pUnilateral <= 0.05 / N_TESTES : Math.abs(o.z) >= Z_BONF }; resultado.testes.push(t); return t; };
const TR = ['baixa', 'sup', 'solt', 'casa'];
const BASE = ['eV2', 'eV3m', 'eV3s', 'dC'];
let semente = 20261030;
const aleat = () => { semente = (semente * 1664525 + 1013904223) >>> 0; return semente / 4294967296; };
function invN(p) {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  if (p < 0.02425) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - 0.02425) return -invN(1 - p);
  const q = p - 0.5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
const lin = (rs, extra, nomesExtra, nFocExtra = 0) => regredir(rs.map((r) => { const x = extra(r); return { w: r.w, g: r.g, y: r.y, cols: [...x.slice(0, nFocExtra), r.eV2, r.eV3m, r.eV3s, r.dC, ...r.ctrl, ...x.slice(nFocExtra)] }; }), [...nomesExtra.slice(0, nFocExtra), ...BASE, ...CTRL, ...nomesExtra.slice(nFocExtra)], nFocExtra + 4);

for (const unidade of TESTADAS) {
  const set = new Set(UNID3[unidade]);
  const rs = linhas.filter((r) => set.has(r.uf));
  const U = { secoes: rs.length };
  const base = lin(rs, () => [], []);
  U.base = { N: base.N, locais: base.grupos, eV2: coef(base, 'eV2'), eV3m: coef(base, 'eV3m'), eV3s: coef(base, 'eV3s'), dC: coef(base, 'dC') };
  const rm = lin(rs, (r) => [r.Y1, r.xV2_1], ['Y1', 'xV2_1']);
  U.sensibilidadeRegressaoAMedia = { eV2: coef(rm, 'eV2'), dC: coef(rm, 'dC') };
  // parcela (medida do plano 16) para comparação
  const parc = regredir(rs.map((r) => ({ w: r.w, g: r.g, y: r.y, cols: [r.x2[0] - r.b.log.v2 / r.b.log.votos, r.x2[1] - r.b.log.v3m / r.b.log.votos, r.x2[2] - r.b.log.v3s / r.b.log.votos, ...r.ctrl] })), ['dV2', 'dV3m', 'dV3s', ...CTRL], 3);
  U.medidaDoPlano16 = coef(parc, 'dV2');
  // inclinação política dos traços (nível do 2º turno)
  const media = (f, rr = rs) => wmean(rr, f);
  const trM = TR.map((_, k) => media((r) => r.tr[k]));
  const comSB = rs.filter((r) => r.trSB);
  const sbM = TR.map((_, k) => media((r) => r.trSB[k], comSB));
  const sbV = (r, k) => (r.trSB ? r.trSB[k] : sbM[k]);
  const niv = regredir(rs.map((r) => ({ w: r.w, g: r.g, y: r.y2, cols: [...r.x2, ...r.ctrl.slice(0, 3), r.ctrl[5], ...r.ctrl.slice(6), ...r.tr] })), ['v2', 'v3m', 'v3s', 'cadSemBio', 'p60', 'p16a24', 'logEle', 'u13', 'u15', 'u20', ...TR], 3);
  const nivSB = regredir(rs.map((r) => ({ w: r.w, g: r.g, y: r.y2, cols: [...r.x2, ...r.ctrl, ...TR.map((_, k) => sbV(r, k)), r.poucosSB] })), ['v2', 'v3m', 'v3s', ...CTRL, ...TR.map((t) => `sb_${t}`), 'poucosSB'], 3);
  U.inclinacaoNivel2 = { secao: Object.fromEntries(TR.map((t) => [t, coef(niv, t)])), semBio: Object.fromEntries(TR.map((t) => [t, coef(nivSB, `sb_${t}`)])) };
  // A3 (seção inteira) — as frações de escolaridade já entram nos controles como pBaixa/pSup; as duplicadas saem por colinearidade
  const a3 = lin(rs, (r) => [...TR.map((_, k) => r.eV2 * (r.tr[k] - trM[k])), r.tr[2], r.tr[3]], [...TR.map((t) => `x_${t}`), 'solt', 'casa'], 4);
  U.A3 = { eV2: coef(a3, 'eV2'), medias: Object.fromEntries(TR.map((t, k) => [t, trM[k]])), ...Object.fromEntries(TR.map((t) => [t, testa(unidade, `A3 e_V2 × ${t} (seção)`, coef(a3, `x_${t}`))])) };
  // A4 (sem biometria)
  const a4 = lin(rs, (r) => [...TR.map((_, k) => r.eV2 * (sbV(r, k) - sbM[k])), ...TR.map((_, k) => sbV(r, k)), r.poucosSB], [...TR.map((t) => `x_${t}`), ...TR.map((t) => `sb_${t}`), 'poucosSB'], 4);
  U.A4 = { eV2: coef(a4, 'eV2'), medias: Object.fromEntries(TR.map((t, k) => [t, sbM[k]])), secoesPoucosSB: rs.length - comSB.length, ...Object.fromEntries(TR.map((t) => [t, testa(unidade, `A4 e_V2 × ${t} (sem biometria)`, coef(a4, `x_${t}`))])) };
  // (b) foto
  const comF = rs.filter((r) => r.fFoto !== null);
  const fM = media((r) => r.fFoto, comF);
  const fv = (r) => (r.fFoto === null ? fM : r.fFoto);
  const bf = lin(rs, (r) => [r.eV2 * (fv(r) - fM), fv(r), r.poucosV2], ['x_foto', 'fFoto', 'poucosV2'], 1);
  const v2tot = comF.reduce((s, r) => s + r.a.log.v2, 0), fotoTot = comF.reduce((s, r) => s + r.a.hor.v2Foto, 0);
  U.B = { eV2: coef(bf, 'eV2'), foto: testa(unidade, 'B e_V2 × fração dos V2 com foto', coef(bf, 'x_foto')), mediaFotoPonderada: fM, parcelaV2ComFoto: fotoTot / v2tot, secoesComFoto: comF.length, secoesFoto0: comF.filter((r) => r.fFoto === 0).length, secoesFoto100: comF.filter((r) => r.fFoto === 1).length };
  // (c) nula da concentração por zona
  const p = base.nomes.indexOf('eV2');
  const outros = base.ativas.filter((_, q) => q !== p);
  const K = outros.length, colV2 = base.ativas[p];
  const A = outros.map(() => new Array(K).fill(0)), bx = new Array(K).fill(0), by = new Array(K).fill(0);
  for (let i = 0; i < base.X.length; i++) for (let a = 0; a < K; a++) { const xa = base.X[i][outros[a]] * base.W[i]; bx[a] += xa * base.X[i][colV2]; by[a] += xa * base.Y[i]; for (let b = 0; b <= a; b++) A[a][b] += xa * base.X[i][outros[b]]; }
  for (let a = 0; a < K; a++) for (let b = a + 1; b < K; b++) A[a][b] = A[b][a];
  const { inv } = cholInv(A);
  const gx = inv.map((row) => row.reduce((s, v, j) => s + v * bx[j], 0)), gy = inv.map((row) => row.reduce((s, v, j) => s + v * by[j], 0));
  const n = base.X.length, rx = new Float64Array(n), ry = new Float64Array(n), w = base.W;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    let x = base.X[i][colV2], y = base.Y[i];
    for (let a = 0; a < K; a++) { x -= base.X[i][outros[a]] * gx[a]; y -= base.X[i][outros[a]] * gy[a]; }
    rx[i] = x; ry[i] = y; num += w[i] * x * y; den += w[i] * x * x;
  }
  const beta = num / den;
  const e = new Float64Array(n);
  for (let i = 0; i < n; i++) e[i] = ry[i] - beta * rx[i];
  const zonaIdx = new Map(), zi = new Int32Array(n);
  for (let i = 0; i < n; i++) { const k = rs[base.idx[i]].zona; if (!zonaIdx.has(k)) zonaIdx.set(k, zonaIdx.size); zi[i] = zonaIdx.get(k); }
  const nZ = zonaIdx.size, topN = Math.max(1, Math.round(nZ * 0.01));
  const parteTop = (yv) => {
    const cz = new Float64Array(nZ);
    let tot = 0;
    for (let i = 0; i < n; i++) { const c = w[i] * rx[i] * yv(i); cz[zi[i]] += c; tot += c; }
    const ord = Array.from(cz).sort((x, y) => y - x);
    let s = 0; for (let k = 0; k < topN; k++) s += ord[k];
    return s / tot;
  };
  const obs = parteTop((i) => ry[i]);
  const G = base.G ?? null;
  // grupo (local) de cada linha demeaned: refaz o índice pelo campo g
  const gIdx = new Map(), gi = new Int32Array(n);
  for (let i = 0; i < n; i++) { const k = rs[base.idx[i]].g; if (!gIdx.has(k)) gIdx.set(k, gIdx.size); gi[i] = gIdx.get(k); }
  const partes = [];
  for (let r = 0; r < 1000; r++) {
    const eta = new Int8Array(gIdx.size);
    for (let g = 0; g < eta.length; g++) eta[g] = aleat() < 0.5 ? -1 : 1;
    partes.push(parteTop((i) => beta * rx[i] + eta[gi[i]] * e[i]));
  }
  partes.sort((x, y) => x - y);
  const pval = (partes.filter((x) => x >= obs).length + 1) / (partes.length + 1);
  U.C = { zonas: nZ, topZonas: topN, betaFWL: beta, observada: obs, nula: { p5: partes[50], mediana: partes[500], p95: partes[950], p99: partes[990], max: partes.at(-1) }, teste: testa(unidade, 'C concentração por zona além do efeito homogêneo', { z: -invN(pval), pUnilateral: pval }) };
  resultado.unidades[unidade] = U;
}

// ---------- (d) 2022 × 2026 por zona ----------
{
  const zl = await lerTabela(path.join(SAIDA, 'zonas.csv'), ['v13_2022_1', 'v22_2022_1', 'v13_2022_2', 'v22_2022_2', 'aptos_2022_1', 'comp_2022_1', 'aptos_2022_2', 'comp_2022_2', 'v13_2026_1', 'v22_2026_1', 'v13_2026_2', 'v22_2026_2', 'aptos_2026_1', 'comp_2026_1', 'aptos_2026_2', 'comp_2026_2', 'eleitores', 'semBio', 'v2log_1', 'votoslog_1', 'v2log_2', 'votoslog_2']);
  const D = {};
  const montar = (ano, ufs) => {
    const rs = [], ex = {};
    for (const o of zl) {
      const [uf, mun] = o.zona.split('/');
      if (!ufs.has(uf)) continue;
      const v1 = (c) => o[`${c}_${ano}_1`], v2 = (c) => o[`${c}_${ano}_2`];
      if (!(v1('v13') + v1('v22') > 0) || !(v2('v13') + v2('v22') > 0) || !v1('aptos') || !o.eleitores) { ex.semDado = (ex.semDado ?? 0) + 1; continue; }
      const Y1 = v1('v13') / (v1('v13') + v1('v22')), Y2 = v2('v13') / (v2('v13') + v2('v22'));
      rs.push({ uf, mun: `${uf}/${mun}`, w: v2('v13') + v2('v22'), y: Y2 - Y1, dc: (v2('comp') - v1('comp')) / v1('aptos'), sb: o.semBio / o.eleitores, eV2: ano === 2026 && o.votoslog_1 ? (o.v2log_2 - o.v2log_1) / o.eleitores : null });
    }
    return { rs, ex };
  };
  const ajusta = (rs, cols, nomes) => {
    const reg = regredir(rs.map((r) => ({ w: r.w, g: r.uf, y: r.y, cols: cols(r) })), nomes, nomes.length);
    const K = nomes.length;
    const AA = nomes.map(() => new Array(K).fill(0));
    for (let i = 0; i < reg.X.length; i++) for (let a = 0; a < K; a++) for (let b = 0; b < K; b++) AA[a][b] += reg.W[i] * reg.X[i][a] * reg.X[i][b];
    const invA = cholInv(AA).inv;
    const ee = reg.X.map((x, i) => reg.Y[i] - x.reduce((s, v, k) => s + v * reg.beta[k], 0));
    const porM = new Map();
    reg.X.forEach((x, i) => { const m = rs[reg.idx[i]].mun; let v = porM.get(m); if (!v) porM.set(m, (v = new Array(K).fill(0))); for (let k = 0; k < K; k++) v[k] += reg.W[i] * x[k] * ee[i]; });
    const meat = nomes.map(() => new Array(K).fill(0));
    for (const v of porM.values()) for (let a = 0; a < K; a++) for (let b = 0; b < K; b++) meat[a][b] += v[a] * v[b];
    const nM = porM.size, N = reg.X.length, esc = (nM / (nM - 1)) * ((N - 1) / (N - K));
    const out = { zonas: N, municipios: nM };
    nomes.forEach((nm, q) => { let s = 0; for (let a = 0; a < K; a++) for (let b = 0; b < K; b++) s += invA[q][a] * meat[a][b] * invA[b][q]; const se = Math.sqrt(esc * s); out[nm] = { beta: reg.beta[q], se, z: reg.beta[q] / se }; });
    return out;
  };
  for (const unidade of TESTADAS) {
    const ufs = new Set(UNID3[unidade]);
    const r22 = montar(2022, ufs), r26 = montar(2026, ufs);
    const modelo = (rs) => { const sbM = wmean(rs, (r) => r.sb), dcM = wmean(rs, (r) => r.dc); return ajusta(rs, (r) => [(r.dc - dcM) * (r.sb - sbM), r.dc, r.sb], ['dc_x_sb', 'dc', 'sb']); };
    const m22 = modelo(r22.rs), m26 = modelo(r26.rs);
    const t22 = testa(unidade, 'D Δc × sem biometria, 2022', m22.dc_x_sb);
    const t26 = testa(unidade, 'D Δc × sem biometria, 2026', m26.dc_x_sb);
    const dd = m26.dc_x_sb.beta - m22.dc_x_sb.beta, sdd = Math.hypot(m26.dc_x_sb.se, m22.dc_x_sb.se);
    const td = testa(unidade, 'D diferença 2026 − 2022', { dif: dd, se: sdd, z: dd / sdd });
    const cal = r26.rs.filter((r) => r.eV2 !== null);
    const mc = ajusta(cal, (r) => [r.eV2, r.dc, r.sb], ['eV2', 'dc', 'sb']);
    D[unidade] = { ano2022: { ...m22, exclusoes: r22.ex }, ano2026: { ...m26, exclusoes: r26.ex }, t22, t26, diferenca: td, calibracao2026ComV2Real: mc };
  }
  resultado.D = D;
}
resultado.bonferroni = { testes: resultado.testes.length, declarados: N_TESTES, z: Z_BONF, passam: resultado.testes.filter((t) => t.bonferroni).length };
await writeFile(path.join(SAIDA, 'resultado2.json'), JSON.stringify(resultado, null, 1));
console.log(JSON.stringify(resultado, (k, v) => (typeof v === 'number' ? +v.toPrecision(5) : v), 1));
