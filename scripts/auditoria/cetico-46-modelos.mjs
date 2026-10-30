// Cético revisor, parecer 46 (H13, sinal V2 fora do Nordeste; revisa docs/analysis/estatistico-eleitoral/19).
// Regressão própria (não usa o código do doc 19 nem o do parecer 42): mínimos quadrados ponderados com efeito fixo
// de local (média ponderada retirada dentro do local), colunas padronizadas, solução por Gauss-Jordan com pivô e
// descarte de coluna colinear (tolerância relativa), erro robusto por local (CR1).
// Partes:
//   R  reprodução do β de base do doc 19 (vias do diário do estatístico) e o mesmo com a V2 tirada só do BU;
//   A  idade (A1, A2 do adendo), refeita;
//   B  B1 (última hora antes do encerramento, do doc 19) e B1r (última hora pelo relógio, leitura do parecer 42);
//      B2 (sequência); descritivo da última hora pelo relógio;
//   D  sem os 10 municípios de maior contribuição (Frisch–Waugh próprio) e sem cada UF;
//   Q  explicações políticas no Sul, MG e RS (e comparação), com a exposição por eleitor do cadastro e o
//      comparecimento fixo (medida do parecer 42): mobilização por perfil, V2 com e sem foto, perfil dos sem
//      biometria, seção nova dentro do local, transferência temporária, tamanho do município;
//   M  magnitude em votos (contagens completas do BU e equivalentes do modelo).
// Uso: node --max-old-space-size=8000 scripts/auditoria/cetico-46-modelos.mjs
// Entrada: data/parsed/auditoria/cetico-revisor/46/secoes.csv (cetico-46-dados.mjs)
// Saída: data/parsed/auditoria/cetico-revisor/46/modelos.json
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';

const DIR = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '46');
const REG = {
  Nordeste: ['al', 'ba', 'ce', 'ma', 'pb', 'pe', 'pi', 'rn', 'se'], Norte: ['ac', 'am', 'ap', 'pa', 'ro', 'rr', 'to'],
  'Centro-Oeste': ['df', 'go', 'ms', 'mt'], Sudeste: ['es', 'mg', 'rj', 'sp'], Sul: ['pr', 'rs', 'sc'],
};
const NE = new Set(REG.Nordeste);
const TODAS = Object.values(REG).flat();
const UNI = {
  'Fora do Nordeste': TODAS.filter((u) => !NE.has(u)), Sudeste: REG.Sudeste, Sul: REG.Sul, Nordeste: REG.Nordeste,
  MG: ['mg'], RS: ['rs'], SP: ['sp'], PR: ['pr'], SC: ['sc'], RJ: ['rj'],
};

// ---------- leitura ----------
const texto = await readFile(path.join(DIR, 'secoes.csv'), 'utf8');
const linhasCsv = texto.split('\n');
const cab = linhasCsv[0].split(';');
const S = [];
for (let i = 1; i < linhasCsv.length; i++) {
  if (!linhasCsv[i]) continue;
  const c = linhasCsv[i].split(';');
  const o = {};
  for (let k = 0; k < cab.length; k++) { const v = c[k]; o[cab[k]] = v === '' ? null : k === 0 || cab[k].endsWith('_m') ? v : Number(v); }
  const [uf, mun, zona, sec] = o.id.split('/');
  Object.assign(o, { uf, mun: `${uf}/${mun}`, zona: `${uf}/${mun}/${zona}`, sec: Number(sec) });
  S.push(o);
}
console.log(`seções lidas: ${S.length}`);

// ---------- motor ----------
function gaussInv(A) { // inversa por Gauss-Jordan com pivô parcial; devolve null se singular
  const n = A.length, M = A.map((r, i) => [...r, ...r.map((_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    const d = M[c][c]; for (let j = 0; j < 2 * n; j++) M[c][j] /= d;
    for (let r = 0; r < n; r++) if (r !== c && M[r][c] !== 0) { const f = M[r][c]; for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[c][j]; }
  }
  return M.map((r) => r.slice(n));
}
/** rows: {g, w, y, x[]}; devolve {N, G, nomes, b, se, z, cov} com colinear descartada por Cholesky incremental (tol. relativa) */
function fe(rows, nomes, focais = 1) {
  const grupos = new Map();
  for (const r of rows) { const a = grupos.get(r.g); if (a) a.push(r); else grupos.set(r.g, [r]); }
  const K0 = nomes.length, X = [], Y = [], W = [], G = [];
  let gi = 0;
  for (const rs of grupos.values()) {
    if (rs.length < 2) continue;
    let sw = 0, my = 0; const mx = new Array(K0).fill(0);
    for (const r of rs) { sw += r.w; my += r.w * r.y; for (let k = 0; k < K0; k++) mx[k] += r.w * r.x[k]; }
    for (const r of rs) { X.push(r.x.map((v, k) => v - mx[k] / sw)); Y.push(r.y - my / sw); W.push(r.w); G.push(gi); }
    gi++;
  }
  const N = X.length;
  // padronização
  const sd = new Array(K0).fill(0); let sw = 0;
  for (let i = 0; i < N; i++) { sw += W[i]; for (let k = 0; k < K0; k++) sd[k] += W[i] * X[i][k] * X[i][k]; }
  for (let k = 0; k < K0; k++) sd[k] = Math.sqrt(sd[k] / sw);
  let ativ = [...Array(K0).keys()].filter((k) => sd[k] > 1e-12);
  const XtX = Array.from({ length: K0 }, () => new Array(K0).fill(0)), Xty = new Array(K0).fill(0);
  for (let i = 0; i < N; i++) { const xi = X[i], wi = W[i]; for (let p = 0; p < K0; p++) { if (!sd[p]) continue; const a = wi * xi[p] / sd[p]; Xty[p] += a * Y[i]; for (let q = 0; q <= p; q++) if (sd[q]) XtX[p][q] += a * xi[q] / sd[q]; } }
  for (let p = 0; p < K0; p++) for (let q = p + 1; q < K0; q++) XtX[p][q] = XtX[q][p];
  // Cholesky incremental: entra a coluna se o resíduo da diagonal passar de 1e-9 da diagonal
  const L = [], ok = [];
  for (const k of ativ) {
    // resolve L * l = XtX[ok, k]
    const l = []; for (let a = 0; a < ok.length; a++) { let s = XtX[k][ok[a]]; for (let b = 0; b < a; b++) s -= L[a][b] * l[b]; l.push(s / L[a][a]); }
    let d = XtX[k][k]; for (const v of l) d -= v * v;
    if (d > 1e-9 * XtX[k][k]) { L.push([...l, Math.sqrt(d)]); ok.push(k); } else if (k < focais) return null;
  }
  ativ = ok;
  const K = ativ.length;
  const A = ativ.map((p) => ativ.map((q) => XtX[p][q])), inv = gaussInv(A);
  if (!inv) return null;
  const bs = inv.map((r) => r.reduce((s, v, j) => s + v * Xty[ativ[j]], 0));
  const meat = Array.from({ length: K }, () => new Array(K).fill(0)), acc = new Map();
  for (let i = 0; i < N; i++) {
    let e = Y[i]; for (let a = 0; a < K; a++) e -= bs[a] * X[i][ativ[a]] / sd[ativ[a]];
    let v = acc.get(G[i]); if (!v) acc.set(G[i], (v = new Array(K).fill(0)));
    for (let a = 0; a < K; a++) v[a] += W[i] * X[i][ativ[a]] / sd[ativ[a]] * e;
  }
  for (const v of acc.values()) for (let a = 0; a < K; a++) for (let b = 0; b < K; b++) meat[a][b] += v[a] * v[b];
  const esc = (gi / (gi - 1)) * ((N - 1) / (N - K));
  const cov = inv.map((_, p) => inv.map((__, q) => { let s = 0; for (let a = 0; a < K; a++) { if (!inv[p][a]) continue; for (let b = 0; b < K; b++) s += inv[p][a] * meat[a][b] * inv[b][q]; } return esc * s / (sd[ativ[p]] * sd[ativ[q]]); }));
  const b = bs.map((v, a) => v / sd[ativ[a]]);
  return { N, G: gi, nomes: ativ.map((k) => nomes[k]), b, cov, X, Y, W, ativ, sd };
}
const cf = (r, n) => { if (!r) return null; const p = r.nomes.indexOf(n); if (p < 0) return null; const se = Math.sqrt(r.cov[p][p]); return { b: +(100 * r.b[p]).toFixed(3), z: +(r.b[p] / se).toFixed(2) }; };
const dif = (r, a, c) => { const p = r.nomes.indexOf(a), q = r.nomes.indexOf(c); const d = r.b[p] - r.b[q], se = Math.sqrt(r.cov[p][p] + r.cov[q][q] - 2 * r.cov[p][q]); return { dif: +(100 * d).toFixed(3), z: +(d / se).toFixed(2) }; };

// ---------- amostra do doc 19 ----------
const exc = {};
const X = (m) => { exc[m] = (exc[m] ?? 0) + 1; };
const base = [];
for (const s of S) {
  if (!(s.t1_c > 0) || !(s.t2_c > 0)) { X('sem a seção nos dois turnos'); continue; }
  if (s.t1_e_votos === null || s.t2_e_votos === null) { X('sem diário'); continue; }
  if (s.t1_e_votos !== s.t1_c || s.t2_e_votos !== s.t2_c) { X('diário ≠ BU'); continue; }
  if (s.t1_n13 + s.t1_n22 < 20 || s.t2_n13 + s.t2_n22 < 20) { X('< 20 votos 13+22'); continue; }
  if (!s.p_E) { X('sem perfil'); continue; }
  if (s.t1_h_v2 === null || s.t2_h_v2 === null) { X('sem horário'); continue; }
  if (s.t1_h_v2 !== s.t1_e_v2 || s.t2_h_v2 !== s.t2_e_v2) { X('V2 horário ≠ varredura'); continue; }
  const E = s.p_E, m = s.t2_m;
  s.g = `${s.zona}/${s.t2_local}`;
  s.w = s.t2_n13 + s.t2_n22;
  s.Y1 = s.t1_n13 / (s.t1_n13 + s.t1_n22); s.Y2 = s.t2_n13 / (s.t2_n13 + s.t2_n22); s.dy = s.Y2 - s.Y1;
  s.ctrl = [1 - s.p_B / E, s.p_i60 / E, s.p_j / E, s.p_eb / E, s.p_es / E, Math.log(E), m === 'ue2013' ? 1 : 0, m === 'ue2015' ? 1 : 0, m === 'ue2020' ? 1 : 0];
  const sh = (t, v) => s[`t${t}_e_${v}`] / s[`t${t}_e_votos`];
  s.dV2 = sh(2, 'v2') - sh(1, 'v2'); s.dV3m = sh(2, 'v3m') - sh(1, 'v3m'); s.dV3s = sh(2, 'v3s') - sh(1, 'v3s');
  s.dV2bu = s.t2_sb / s.t2_c - s.t1_sb / s.t1_c; s.dV3bu = s.t2_pg / s.t2_c - s.t1_pg / s.t1_c;
  base.push(s);
}
console.log('exclusões', exc, 'amostra', base.length);
const CT = ['cadSemBio', 'p60', 'p16a24', 'pBaixa', 'pSup', 'logE', 'u13', 'u15', 'u20'];
const R = { amostra: base.length, exclusoes: exc };
const sub = (ufs) => { const st = new Set(ufs); return base.filter((s) => st.has(s.uf)); };
const wm = (rs, f) => { let a = 0, b = 0; for (const r of rs) { const v = f(r); if (v === null || Number.isNaN(v)) continue; a += r.w * v; b += r.w; } return a / b; };
const run = (rs, cols, nomes, foc = 1) => fe(rs.map((s) => ({ g: s.g, w: s.w, y: s.dy, x: cols(s) })), nomes, foc);

// ---------- R, A, B, D ----------
for (const [u, ufs] of Object.entries(UNI)) {
  const rs = sub(ufs);
  const o = (R[u] = { secoes: rs.length });
  const b0 = run(rs, (s) => [s.dV2, s.dV3m, s.dV3s, ...s.ctrl], ['dV2', 'dV3m', 'dV3s', ...CT]);
  o.base = { N: b0.N, locais: b0.G, dV2: cf(b0, 'dV2') };
  o.baseBU = cf(run(rs, (s) => [s.dV2bu, s.dV3bu, ...s.ctrl], ['dV2', 'dV3', ...CT]), 'dV2');
  if (['MG', 'RS', 'SP', 'PR', 'SC', 'RJ'].includes(u)) continue;
  // A1
  const m1 = wm(rs, (s) => s.p_j / s.p_E), m7 = wm(rs, (s) => s.p_i70 / s.p_E);
  const a1 = run(rs, (s) => [s.dV2, s.dV2 * (s.p_j / s.p_E - m1), s.dV2 * (s.p_i70 / s.p_E - m7), s.dV3m, s.dV3s, ...s.ctrl, s.p_i70 / s.p_E], ['dV2', 'x1624', 'x70', 'dV3m', 'dV3s', ...CT, 'p70'], 3);
  o.A1 = { dV2: cf(a1, 'dV2'), x1624: cf(a1, 'x1624'), x70: cf(a1, 'x70') };
  // A2 (sem biometria < 5: média da unidade + indicador)
  const fj = (s) => (s.p_sb >= 5 ? s.p_sbj / s.p_sb : null), fi = (s) => (s.p_sb >= 5 ? s.p_sb70 / s.p_sb : null);
  const mj = wm(rs, fj), mi = wm(rs, fi);
  const a2 = run(rs, (s) => { const j = fj(s) ?? mj, i = fi(s) ?? mi; return [s.dV2, s.dV2 * (j - mj), s.dV2 * (i - mi), s.dV3m, s.dV3s, ...s.ctrl, j, i, s.p_sb < 5 ? 1 : 0]; }, ['dV2', 'xJov', 'xIdo', 'dV3m', 'dV3s', ...CT, 'fJ', 'fI', 'sb<5'], 3);
  o.A2 = { dV2: cf(a2, 'dV2'), xJov: cf(a2, 'xJov'), xIdo: cf(a2, 'xIdo'), secoesSbMenor5: rs.filter((s) => s.p_sb < 5).length };
  // B1 do doc (última hora antes do encerramento)
  const ul = (s) => s.t2_h_ult2 / s.t2_e_votos - s.t1_h_ult2 / s.t1_e_votos;
  const b1 = run(rs, (s) => [ul(s), s.dV2 - ul(s), s.dV3m, s.dV3s, ...s.ctrl], ['ult', 'resto', 'dV3m', 'dV3s', ...CT], 2);
  o.B1 = { ultima: cf(b1, 'ult'), resto: cf(b1, 'resto'), dif: dif(b1, 'ult', 'resto') };
  // B1r: última hora pelo relógio (abertura + 8 h), vias da leitura do parecer 42
  const okC = rs.filter((s) => s.t1_c_votos === s.t1_c && s.t2_c_votos === s.t2_c && s.t1_c_h0 !== null && s.t2_c_h0 !== null);
  const sh42 = (s, t, v) => s[`t${t}_c_${v}`] / s[`t${t}_c_votos`];
  const ulr = (s) => sh42(s, 2, 'v2ult') - sh42(s, 1, 'v2ult');
  const b1r = run(okC, (s) => [ulr(s), sh42(s, 2, 'v2') - sh42(s, 1, 'v2') - ulr(s), sh42(s, 2, 'v3m') - sh42(s, 1, 'v3m'), sh42(s, 2, 'v3s') - sh42(s, 1, 'v3s'), ...s.ctrl], ['ult', 'resto', 'dV3m', 'dV3s', ...CT], 2);
  o.B1relogio = { secoes: okC.length, ultima: cf(b1r, 'ult'), resto: cf(b1r, 'resto'), dif: dif(b1r, 'ult', 'resto') };
  const ag = (t, k) => okC.reduce((a, s) => a + s[`t${t}_c_${k}`], 0);
  o.B1relogioDescr = Object.fromEntries([1, 2].map((t) => [t, { V2: ag(t, 'v2'), V2ultima: ag(t, 'v2ult'), votos: ag(t, 'votos'), votosUltima: ag(t, 'totUlt'), parcelaV2ult: ag(t, 'v2ult') / ag(t, 'v2'), parcelaTodosUlt: ag(t, 'totUlt') / ag(t, 'votos'), V2manha3h: ag(t, 'v2manha') }]));
  // B2
  const sq = (s) => s.t2_h_seq / s.t2_e_votos - s.t1_h_seq / s.t1_e_votos;
  const b2 = run(rs, (s) => [sq(s), s.dV2 - sq(s), s.dV3m, s.dV3s, ...s.ctrl], ['seq', 'iso', 'dV3m', 'dV3s', ...CT], 2);
  o.B2 = { sequencia: cf(b2, 'seq'), isolado: cf(b2, 'iso'), dif: dif(b2, 'seq', 'iso') };
  // D: Frisch–Waugh próprio
  if (u === 'Nordeste') continue;
  const p = b0.nomes.indexOf('dV2'), out = b0.ativ.filter((_, a) => a !== p);
  const sub2 = (i, cols) => cols.map((k) => b0.X[i][k]);
  // regressão auxiliar de dV2 e y nas outras colunas (demeaned): reaproveita o motor sem efeito fixo (grupo único já retirado)
  const aux = (alvo) => { const rows = b0.X.map((x, i) => ({ g: 'u', w: b0.W[i], y: alvo(i), x: sub2(i, out) })); return fe(rows, out.map(String), 0); };
  const gx = aux((i) => b0.X[i][b0.ativ[p]]), gy = aux((i) => b0.Y[i]);
  // a ordem das linhas em b0.X segue a dos grupos; recompõe o município pelo mesmo agrupamento
  const ordem = []; { const gr = new Map(); for (const s of rs) { const a = gr.get(s.g); if (a) a.push(s); else gr.set(s.g, [s]); } for (const a of gr.values()) if (a.length >= 2) ordem.push(...a); }
  const pred = (r, x) => r.nomes.reduce((acc, nm, a) => acc + r.b[a] * x[r.ativ[a]], 0);
  const porMun = new Map(); let num = 0, den = 0;
  for (let i = 0; i < b0.X.length; i++) {
    const xo = sub2(i, out);
    const rx = b0.X[i][b0.ativ[p]] - pred(gx, xo), ry = b0.Y[i] - pred(gy, xo);
    const c = b0.W[i] * rx * ry; num += c; den += b0.W[i] * rx * rx;
    const k = ordem[i].mun; porMun.set(k, (porMun.get(k) ?? 0) + c);
  }
  const top = [...porMun].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k]) => k), tira = new Set(top);
  o.D = {
    betaFWL: +(100 * num / den).toFixed(3), top10: top, parteTop10: +(top.reduce((a, k) => a + porMun.get(k), 0) / num).toFixed(3),
    semTop10: cf(run(rs.filter((s) => !tira.has(s.mun)), (s) => [s.dV2, s.dV3m, s.dV3s, ...s.ctrl], ['dV2', 'dV3m', 'dV3s', ...CT]), 'dV2'),
    semCadaUF: Object.fromEntries(ufs.map((uf) => [uf, cf(run(rs.filter((s) => s.uf !== uf), (s) => [s.dV2, s.dV3m, s.dV3s, ...s.ctrl], ['dV2', 'dV3m', 'dV3s', ...CT]), 'dV2')])),
  };
  console.log(u, JSON.stringify(o));
}

// ---------- Q: explicações políticas (exploratório), exposição por eleitor do cadastro ----------
const Q = (R.Q = {});
const QU = ['Fora do Nordeste', 'Sudeste', 'Sul', 'MG', 'RS', 'SP', 'PR', 'SC', 'RJ', 'Nordeste'];
// por eleitor, vias da leitura do parecer 42 (têm a marca de foto); só seções em que a leitura 42 bate com o BU
const pe = base.filter((s) => s.t1_c_votos === s.t1_c && s.t2_c_votos === s.t2_c);
for (const s of pe) {
  const E = s.p_E, d = (v) => (s[`t2_c_${v}`] - s[`t1_c_${v}`]) / E;
  s.q = { v2: d('v2'), v3m: d('v3m'), v3s: d('v3s'), vot: d('votos'), foto: d('v2foto'), semfoto: (s.t2_c_v2 - s.t2_c_v2foto - (s.t1_c_v2 - s.t1_c_v2foto)) / E };
  s.tteD = ((s.t2_tte ?? 0) - (s.t1_tte ?? 0)) / E;
}
// posição da seção dentro do local (0 = número mais baixo, 1 = mais alto), pelo número da seção
{ const gr = new Map(); for (const s of pe) { const a = gr.get(s.g); if (a) a.push(s); else gr.set(s.g, [s]); } for (const a of gr.values()) { a.sort((x, y) => x.sec - y.sec); a.forEach((s, i) => { s.nova = a.length > 1 ? i / (a.length - 1) : 0.5; }); } }
// tamanho do município (seções no painel)
const nMun = new Map(); for (const s of base) nMun.set(s.mun, (nMun.get(s.mun) ?? 0) + 1);
const QB = (s) => [s.q.v2, s.q.v3m, s.q.v3s, s.q.vot];
const QN = ['v2', 'v3m', 'v3s', 'vot'];
for (const u of QU) {
  const st = new Set(UNI[u]); const rs = pe.filter((s) => st.has(s.uf));
  const o = (Q[u] = { secoes: rs.length });
  const r0 = run(rs, (s) => [...QB(s), ...s.ctrl], [...QN, ...CT]);
  o.q0 = { v2proprio: cf(r0, 'v2'), comparecimento: cf(r0, 'vot'), v3m: cf(r0, 'v3m'), v3s: cf(r0, 'v3s') };
  // Q1: mobilização por perfil (Δcomparecimento × perfil da seção)
  const mc = { sb: wm(rs, (s) => s.ctrl[0]), eb: wm(rs, (s) => s.ctrl[3]), j: wm(rs, (s) => s.ctrl[2]), i: wm(rs, (s) => s.ctrl[1]), es: wm(rs, (s) => s.ctrl[4]) };
  const r1 = run(rs, (s) => [...QB(s), s.q.vot * (s.ctrl[0] - mc.sb), s.q.vot * (s.ctrl[3] - mc.eb), s.q.vot * (s.ctrl[2] - mc.j), s.q.vot * (s.ctrl[1] - mc.i), s.q.vot * (s.ctrl[4] - mc.es), ...s.ctrl], [...QN, 'vot×semBio', 'vot×baixa', 'vot×jovem', 'vot×60', 'vot×sup', ...CT]);
  o.q1mobilizacaoPorPerfil = { v2proprio: cf(r1, 'v2'), interacoes: Object.fromEntries(['vot×semBio', 'vot×baixa', 'vot×jovem', 'vot×60', 'vot×sup'].map((n) => [n, cf(r1, n)])) };
  // Q2: V2 com foto × sem foto
  const r2 = run(rs, (s) => [s.q.foto, s.q.semfoto, s.q.v3m, s.q.v3s, s.q.vot, ...s.ctrl], ['foto', 'semfoto', 'v3m', 'v3s', 'vot', ...CT], 2);
  o.q2foto = { comFoto: cf(r2, 'foto'), semFoto: cf(r2, 'semfoto'), dif: dif(r2, 'foto', 'semfoto'), somaPositivaFoto: rs.reduce((a, s) => a + Math.max(0, s.t2_c_v2foto - s.t1_c_v2foto), 0), somaPositivaSemFoto: rs.reduce((a, s) => a + Math.max(0, (s.t2_c_v2 - s.t2_c_v2foto) - (s.t1_c_v2 - s.t1_c_v2foto)), 0) };
  // Q3: perfil dos sem biometria (interação com ΔV2 por eleitor), um traço de cada vez
  const tr = { adulto2559: (s) => s.p_sbj !== null && s.p_sb >= 5 ? s.p_sba / s.p_sb : null, escolBaixa: (s) => (s.p_sb >= 5 ? s.p_sbeb / s.p_sb : null), superior: (s) => (s.p_sb >= 5 ? s.p_sbes / s.p_sb : null), solteiro: (s) => (s.p_sb >= 5 ? s.p_sbsol / s.p_sb : null), feminino: (s) => (s.p_sb >= 5 ? s.p_sbfem / s.p_sb : null) };
  o.q3perfilSemBio = {};
  for (const [n, f] of Object.entries(tr)) {
    const m = wm(rs, f);
    const r = run(rs, (s) => { const v = f(s) ?? m; return [s.q.v2, s.q.v2 * (v - m), s.q.v3m, s.q.v3s, s.q.vot, v, s.p_sb < 5 ? 1 : 0, ...s.ctrl]; }, ['v2', 'x', 'v3m', 'v3s', 'vot', 'nivel', 'sb<5', ...CT], 2);
    o.q3perfilSemBio[n] = { media: +m.toFixed(3), v2: cf(r, 'v2'), interacao: cf(r, 'x') };
  }
  // Q4: seção nova dentro do local; transferência temporária
  const r4 = run(rs, (s) => [s.q.v2, s.q.v2 * (s.nova - 0.5), s.q.v3m, s.q.v3s, s.q.vot, s.nova, ...s.ctrl], ['v2', 'x', 'v3m', 'v3s', 'vot', 'nova', ...CT], 2);
  o.q4secaoNova = { v2: cf(r4, 'v2'), interacao: cf(r4, 'x'), nivelNova: cf(r4, 'nova') };
  const r5 = run(rs, (s) => [...QB(s), s.tteD, ...s.ctrl], [...QN, 'tte', ...CT]);
  const semTte = rs.filter((s) => !(s.t1_tte > 0) && !(s.t2_tte > 0));
  o.q5tte = { comControle: cf(r5, 'v2'), coefTte: cf(r5, 'tte'), secoesComTte: rs.length - semTte.length, semSecoesTte: cf(run(semTte, (s) => [...QB(s), ...s.ctrl], [...QN, ...CT]), 'v2') };
  // Q6: por tamanho do município (seções no painel)
  o.q6tamanho = {};
  for (const [n, f] of [['ate200', (k) => k <= 200], ['201a2000', (k) => k > 200 && k <= 2000], ['maisDe2000', (k) => k > 2000]]) {
    const rr = rs.filter((s) => f(nMun.get(s.mun)));
    o.q6tamanho[n] = { secoes: rr.length, v2: cf(run(rr, (s) => [...QB(s), ...s.ctrl], [...QN, ...CT]), 'v2') };
  }
  // Q7: todos os controles políticos juntos
  const r7 = run(rs, (s) => { const fs = s.p_sb >= 5; return [...QB(s), s.q.vot * (s.ctrl[0] - mc.sb), s.q.vot * (s.ctrl[3] - mc.eb), s.q.vot * (s.ctrl[2] - mc.j), s.q.vot * (s.ctrl[1] - mc.i), s.tteD, s.nova, fs ? s.p_sba / s.p_sb : 0, fs ? s.p_sbeb / s.p_sb : 0, fs ? 0 : 1, ...s.ctrl]; }, [...QN, 'a', 'b', 'c', 'd', 'tte', 'nova', 'sbAd', 'sbEb', 'sb<5', ...CT]);
  o.q7tudo = cf(r7, 'v2');
  console.log('Q', u, JSON.stringify(o));
}

// ---------- B1 placebo: a última hora pelo relógio pesa mais só para a V2 ou para qualquer eleitor? ----------
const contr = (r, pesos) => { // pesos: {nome: c}; devolve Σ c·b com erro próprio
  const ix = Object.keys(pesos).map((n) => r.nomes.indexOf(n));
  if (ix.some((i) => i < 0)) return null;
  const c = Object.values(pesos); let v = 0, s = 0;
  for (let a = 0; a < ix.length; a++) { v += c[a] * r.b[ix[a]]; for (let b = 0; b < ix.length; b++) s += c[a] * c[b] * r.cov[ix[a]][ix[b]]; }
  return { valor: +(100 * v).toFixed(3), z: +(v / Math.sqrt(s)).toFixed(2) };
};
const B1P = (R.B1placebo = {});
for (const u of ['Fora do Nordeste', 'Sudeste', 'Sul', 'MG', 'RS', 'SP', 'Nordeste']) {
  const st = new Set(UNI[u]);
  const rs = pe.filter((s) => st.has(s.uf) && s.t1_c_h0 !== null && s.t2_c_h0 !== null);
  const shv = (s, t, k) => s[`t${t}_c_${k}`] / s[`t${t}_c_votos`];
  // (1) parcela: B1 pelo relógio + Δ(parcela de TODOS os votos na última hora)
  const r1 = run(rs, (s) => { const ul = shv(s, 2, 'v2ult') - shv(s, 1, 'v2ult'); return [ul, shv(s, 2, 'v2') - shv(s, 1, 'v2') - ul, shv(s, 2, 'v3m') - shv(s, 1, 'v3m'), shv(s, 2, 'v3s') - shv(s, 1, 'v3s'), shv(s, 2, 'totUlt') - shv(s, 1, 'totUlt'), ...s.ctrl]; }, ['ult', 'resto', 'v3m', 'v3s', 'todosUlt', ...CT], 2);
  // (2) por eleitor: V2 e não-V2, na última hora e no resto; diferença em diferenças das inclinações
  const E = (s) => s.p_E;
  const r2 = run(rs, (s) => {
    const d = (k) => (s[`t2_c_${k}`] - s[`t1_c_${k}`]) / E(s);
    const v2u = d('v2ult'), v2r = d('v2') - v2u, nu = d('totUlt') - v2u, nr = d('votos') - d('v2') - nu;
    return [v2u, v2r, nu, nr, ...s.ctrl];
  }, ['v2ult', 'v2resto', 'outrosUlt', 'outrosResto', ...CT], 4);
  B1P[u] = {
    secoes: rs.length,
    parcela: { ult: cf(r1, 'ult'), resto: cf(r1, 'resto'), dif: dif(r1, 'ult', 'resto'), todosUlt: cf(r1, 'todosUlt') },
    porEleitor: {
      v2ult: cf(r2, 'v2ult'), v2resto: cf(r2, 'v2resto'), outrosUlt: cf(r2, 'outrosUlt'), outrosResto: cf(r2, 'outrosResto'),
      premioV2: contr(r2, { v2ult: 1, v2resto: -1 }), premioOutros: contr(r2, { outrosUlt: 1, outrosResto: -1 }),
      difEmDif: contr(r2, { v2ult: 1, v2resto: -1, outrosUlt: -1, outrosResto: 1 }),
    },
  };
  console.log('B1P', u, JSON.stringify(B1P[u]));
}

// ---------- M: magnitude ----------
const M = (R.M = {});
for (const u of ['Fora do Nordeste', 'Sudeste', 'Sul', 'MG', 'RS', 'SP', 'Nordeste']) {
  const st = new Set(UNI[u]);
  const todas = S.filter((s) => st.has(s.uf) && s.t1_c > 0 && s.t2_c > 0);
  const soma = (f) => todas.reduce((a, s) => a + f(s), 0);
  M[u] = {
    secoes: todas.length, V2_1t: soma((s) => s.t1_sb), V2_2t: soma((s) => s.t2_sb), V2aMaisPositivo: soma((s) => Math.max(0, s.t2_sb - s.t1_sb)),
    comparecimento1t: soma((s) => s.t1_c), comparecimento2t: soma((s) => s.t2_c), margem2t: soma((s) => s.t2_n13 - s.t2_n22),
    ganho13: soma((s) => s.t2_n13 - s.t1_n13), ganho22: soma((s) => s.t2_n22 - s.t1_n22),
  };
  // equivalente do modelo: Σ β·max(0,Δ)·peso (parcela) e Σ γ·max(0,ΔV2)·(w/E) (por eleitor)
  const rs = base.filter((s) => st.has(s.uf));
  const b = R[u]?.base?.dV2?.b, g = Q[u]?.q0?.v2proprio?.b;
  if (b !== undefined) M[u].equivParcela = Math.round(rs.reduce((a, s) => a + (b / 100) * Math.max(0, s.dV2) * s.w, 0));
  if (g !== undefined) M[u].equivPorEleitor = Math.round(pe.filter((s) => st.has(s.uf)).reduce((a, s) => a + (g / 100) * Math.max(0, s.q.v2) * s.w, 0));
}
console.log('M', JSON.stringify(M));
await writeFile(path.join(DIR, 'modelos.json'), JSON.stringify(R, null, 1));
console.log('ok');
