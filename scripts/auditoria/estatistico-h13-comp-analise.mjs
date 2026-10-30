// Estatístico eleitoral, doc 25: variação do comparecimento entre turnos (÷ aptos do boletim) e ganho do 13, 2026 × 2022.
// Plano no doc 25 (registrado antes de rodar). Modelo nos dois anos: ΔY ~ Δc + c1 + Y1 + log aptos + aptos mudaram +
// modelo da urna, efeito fixo de local, peso 13 + 22 do 2º turno, CR1 por local. Testes: T1 MG; T2 cada outra UF;
// T3 Brasil sem MG (diferença 2026 − 2022); T4 decomposição de Δc por via (2026, boletim). 32 testes, |z| ≥ 3,16.
// Sensibilidades (c) e (d): seções principais com agregadas, aptos que mudaram, troca de urna; sem c1 e Y1.
// Uso: node --max-old-space-size=12000 scripts/auditoria/estatistico-h13-comp-analise.mjs
// Entradas: banco (cópia de leitura), estatistico/h08/<t>t/*.secoes.jsonl (urnas), forense/perfil/mg.csv,
//   estatistico/h13-comp/secoes-2022.csv (estatistico-h13-comp-dados2022.mjs)
// Saída: data/parsed/auditoria/estatistico/h13-comp/resultado.json
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { lerTabela } from './forense-lib.mjs';

const EST = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico');
const SAIDA = path.join(EST, 'h13-comp');
const pBi = (z) => { const x = Math.abs(z) / Math.SQRT2, t = 1 / (1 + 0.5 * x); return t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))))); };
const Z_B = 3.1622; // Φ⁻¹(1 − 0,05 / 64)
const UFS27 = ['ac', 'al', 'am', 'ap', 'ba', 'ce', 'df', 'es', 'go', 'ma', 'mg', 'ms', 'mt', 'pa', 'pb', 'pe', 'pi', 'pr', 'rj', 'rn', 'ro', 'rr', 'rs', 'sc', 'se', 'sp', 'to'];
const MODELOS = ['ue2009', 'ue2010', 'ue2011', 'ue2013', 'ue2015', 'ue2020', 'ue2022'];
const ex = { 2026: {}, 2022: {} };
const exc = (ano, m) => { ex[ano][m] = (ex[ano][m] ?? 0) + 1; };

// ---------- 2026 ----------
const S26 = new Map();
const { db } = await abrirLeitura();
for (const turno of [1, 2]) {
  for (const r of db.prepare('SELECT uf, municipio, zona, secao, local, comparecimento, modelo_urna, sem_biometria, por_biometria, por_biografia FROM secao WHERE turno = ? AND uf <> \'zz\'').iterate(turno)) {
    const id = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
    const s = S26.get(id) ?? { id, uf: r.uf, municipio: r.municipio, zona: r.zona };
    s[`t${turno}`] = { local: r.local, comp: r.comparecimento, modelo: r.modelo_urna, v1: r.por_biometria, sd: (r.sem_biometria ?? 0) + (r.por_biografia ?? 0), detalhe: r.por_biometria !== null, v13: 0, v22: 0, aptos: null };
    S26.set(id, s);
  }
  for (const r of db.prepare('SELECT uf, municipio, zona, secao, aptos FROM secao_eleicao WHERE turno = ? AND eleicao = ?').iterate(turno, turno === 1 ? 6257 : 6258)) {
    const t = S26.get(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`)?.[`t${turno}`];
    if (t) t.aptos = r.aptos;
  }
  for (const v of db.prepare('SELECT uf, municipio, zona, secao, numero, quantidade FROM voto_bu WHERE turno = ? AND cargo = 1 AND numero IN (13, 22)').iterate(turno)) {
    const t = S26.get(`${v.uf}/${v.municipio}/${v.zona}/${v.secao}`)?.[`t${turno}`];
    if (t) t[v.numero === 13 ? 'v13' : 'v22'] += v.quantidade;
  }
}
const principais = new Set();
for (const r of db.prepare('SELECT DISTINCT uf, municipio, zona, secao_principal FROM secao_agregada').iterate()) principais.add(`${r.uf}/${r.municipio}/${r.zona}/${String(r.secao_principal).padStart(4, '0')}`);
db.close();
// urnas com voto por turno (leitura do diário, doc 17; a releitura com união não muda as urnas)
for (const turno of [1, 2]) {
  const dir = path.join(EST, 'h08', `${turno}t`);
  for (const f of (await readdir(dir)).filter((x) => x.endsWith('.secoes.jsonl'))) {
    for (const l of (await readFile(path.join(dir, f), 'utf8')).split('\n')) {
      if (!l) continue;
      const x = JSON.parse(l);
      const t = S26.get(`${x.uf}/${x.municipio}/${x.zona}/${x.secao}`)?.[`t${turno}`];
      if (t) t.urnas = x.fluxos.filter((fl) => fl.votos > 0).map((fl) => fl.urna).sort().join(',');
    }
  }
}
// perfil 2026 (só MG, para a conta exploratória com o denominador antigo)
const perfilMG = new Map();
for (const p of await lerTabela(path.join(DIR_DADOS, 'parsed', 'auditoria', 'forense', 'perfil', 'mg.csv'), ['eleitores'])) perfilMG.set(`${p.uf}/${p.municipio}/${p.zona}/${p.secao}`, p.eleitores);

const L = { 2026: [], 2022: [] };
const Y = (v13, v22) => v13 / (v13 + v22);
for (const s of S26.values()) {
  const a = s.t2, b = s.t1;
  if (!a?.comp || !b?.comp || !b.aptos || !a.aptos) { exc(2026, 'sem a seção nos dois turnos'); continue; }
  if (a.v13 + a.v22 < 20 || b.v13 + b.v22 < 20) { exc(2026, 'menos de 20 votos em 13 + 22'); continue; }
  const ap = b.aptos;
  L[2026].push({
    uf: s.uf, id: s.id, g: `${s.uf}/${s.municipio}/${s.zona}/${a.local}`, w: a.v13 + a.v22, y: Y(a.v13, a.v22) - Y(b.v13, b.v22),
    dc: (a.comp - b.comp) / ap, c1: b.comp / ap, Y1: Y(b.v13, b.v22), logAp: Math.log(ap), aptosMudou: a.aptos !== b.aptos ? 1 : 0, modelo: a.modelo,
    agregada: principais.has(s.id) ? 1 : 0, trocaUrna: a.urnas === undefined || b.urnas === undefined ? null : (a.urnas !== b.urnas || a.urnas.includes(',') || b.urnas.includes(',') ? 1 : 0),
    dV1: a.detalhe && b.detalhe ? (a.v1 - b.v1) / ap : null, dSD: a.detalhe && b.detalhe ? (a.sd - b.sd) / ap : null,
    dcPerfil: s.uf === 'mg' && perfilMG.get(s.id) ? (a.comp - b.comp) / perfilMG.get(s.id) : null,
  });
}
// ---------- 2022 ----------
for (const o of await lerTabela(path.join(SAIDA, 'secoes-2022.csv'), ['v13_1', 'v22_1', 'v13_2', 'v22_2', 'aptos_1', 'comp_1', 'aptos_2', 'comp_2'])) {
  const [uf, mun, zona] = o.id.split('/');
  for (const c of ['v13_1', 'v22_1', 'v13_2', 'v22_2']) o[c] ??= 0;
  if (!o.comp_1 || !o.comp_2 || !o.aptos_1 || !o.aptos_2) { exc(2022, 'sem a seção nos dois turnos'); continue; }
  if (o.v13_1 + o.v22_1 < 20 || o.v13_2 + o.v22_2 < 20) { exc(2022, 'menos de 20 votos em 13 + 22'); continue; }
  const ap = o.aptos_1;
  L[2022].push({
    uf, id: o.id, g: `${uf}/${mun}/${zona}/${o.local_2}`, w: o.v13_2 + o.v22_2, y: Y(o.v13_2, o.v22_2) - Y(o.v13_1, o.v22_1),
    dc: (o.comp_2 - o.comp_1) / ap, c1: o.comp_1 / ap, Y1: Y(o.v13_1, o.v22_1), logAp: Math.log(ap), aptosMudou: o.aptos_1 !== o.aptos_2 ? 1 : 0, modelo: o.modelo_2,
    agregada: null, trocaUrna: o.modelo_1 && o.modelo_2 ? (o.modelo_1 !== o.modelo_2 ? 1 : 0) : null,
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


const CN = ['c1', 'Y1', 'logAp', 'aptosMudou', ...MODELOS];
const ctrl = (r, rm = true) => [...(rm ? [r.c1, r.Y1] : []), r.logAp, r.aptosMudou, ...MODELOS.map((m) => (r.modelo === m ? 1 : 0))];
const ajusta = (rs, { rm = true, x = (r) => [r.dc], nomes = ['dc'] } = {}) => {
  if (rs.length < 50) return null;
  const reg = regredir(rs.map((r) => ({ w: r.w, g: r.g, y: r.y, cols: [...x(r), ...ctrl(r, rm)] })), [...nomes, ...(rm ? CN : CN.slice(2))], nomes.length);
  if (!reg) return null;
  const o = { N: reg.N, locais: reg.grupos };
  for (const n of nomes) o[n] = coef(reg, n);
  if (nomes.length === 2) o.dif = diff(reg, nomes[1], nomes[0]);
  return o;
};
const res = { geradoEm: new Date().toISOString(), exclusoes: ex, secoes: { 2026: L[2026].length, 2022: L[2022].length }, testes: [], porUF: {}, sensibilidade: {}, T4: {} };
const testa = (o) => { const t = { ...o, p: pBi(o.z), bonferroni: Math.abs(o.z) >= Z_B }; res.testes.push(t); return t; };
const difAnos = (a, b) => { const d = a.dc.beta - b.dc.beta, se = Math.hypot(a.dc.se, b.dc.se); return { dif: d, se, z: d / se }; };
const sub = (ano, ufs, f = () => true) => { const set = new Set(ufs); return L[ano].filter((r) => set.has(r.uf) && f(r)); };
// distribuição do comparecimento (descritivo)
for (const ano of [2026, 2022]) {
  const tot = L[ano].reduce((s, r) => s + r.dc * Math.exp(r.logAp), 0), ap = L[ano].reduce((s, r) => s + Math.exp(r.logAp), 0);
  res[`comparecimento${ano}`] = { variacaoTotalVotantes: Math.round(tot), aptos1t: Math.round(ap), variacaoMedia: tot / ap, secoesAptosMudaram: L[ano].filter((r) => r.aptosMudou).length };
}
// T1, T2 e T3
const OUTRAS = UFS27.filter((u) => u !== 'mg');
for (const uf of UFS27) {
  const a = ajusta(sub(2026, [uf])), b = ajusta(sub(2022, [uf]));
  if (!a || !b) { res.porUF[uf] = { erro: 'amostra insuficiente' }; continue; }
  const t = testa({ teste: uf === 'mg' ? 'T1 MG' : `T2 ${uf.toUpperCase()}`, unidade: uf, ...difAnos(a, b) });
  res.porUF[uf] = { b2026: a.dc, b2022: b.dc, N2026: a.N, N2022: b.N, teste: t };
}
const a3 = ajusta(sub(2026, OUTRAS)), b3 = ajusta(sub(2022, OUTRAS));
res.T3 = { b2026: a3.dc, b2022: b3.dc, N2026: a3.N, N2022: b3.N, teste: testa({ teste: 'T3 Brasil sem MG', unidade: 'Brasil sem MG', ...difAnos(a3, b3) }) };
const aBR = ajusta(L[2026]), bBR = ajusta(L[2022]);
res.BrasilInteiro = { b2026: aBR.dc, b2022: bBR.dc, ...difAnos(aBR, bBR) };
// (c) e (d) sensibilidades, para MG e Brasil sem MG
const variantes = {
  'sem c1 e Y1 (regressão à média não controlada)': { rm: false },
  'sem principais com agregadas (2026) / sem aptos que mudaram (2022)': { f26: (r) => !r.agregada, f22: (r) => !r.aptosMudou },
  'sem aptos que mudaram (os dois anos)': { f26: (r) => !r.aptosMudou, f22: (r) => !r.aptosMudou },
  'sem troca de urna (2026: diário; 2022: modelo mudou)': { f26: (r) => r.trocaUrna === 0, f22: (r) => r.trocaUrna === 0 },
  'sem agregadas, sem aptos que mudaram e sem troca de urna': { f26: (r) => !r.agregada && !r.aptosMudou && r.trocaUrna === 0, f22: (r) => !r.aptosMudou && r.trocaUrna === 0 },
};
for (const [nome, v] of Object.entries(variantes)) {
  res.sensibilidade[nome] = {};
  for (const [u, ufs] of [['MG', ['mg']], ['Brasil sem MG', OUTRAS]]) {
    const a = ajusta(sub(2026, ufs, v.f26 ?? (() => true)), { rm: v.rm ?? true }), b = ajusta(sub(2022, ufs, v.f22 ?? (() => true)), { rm: v.rm ?? true });
    res.sensibilidade[nome][u] = { b2026: a.dc, b2022: b.dc, N2026: a.N, N2022: b.N, ...difAnos(a, b) };
  }
}
// exploratório: MG 2026 com o denominador do perfil (o do doc 24)
{
  const rs = sub(2026, ['mg'], (r) => r.dcPerfil !== null);
  const aPerfil = ajusta(rs, { x: (r) => [r.dcPerfil], nomes: ['dcPerfil'] }), aAptos = ajusta(rs);
  res.exploratorioDenominadorMG2026 = { porPerfil: aPerfil.dcPerfil, porAptos: aAptos.dc, N: aAptos.N, secoesPerfilAptosDiferem10pct: rs.filter((r) => Math.abs(r.dcPerfil / r.dc - 1) > 0.1 && r.dc !== 0).length, principaisComAgregadasMG: rs.filter((r) => r.agregada).length };
}
// T4: decomposição por via (2026, boletim)
for (const [u, ufs, tA, tD] of [['Brasil', UFS27, 'T4a', 'T4c'], ['MG', ['mg'], 'T4b', 'T4d']]) {
  const rs = sub(2026, ufs, (r) => r.dV1 !== null);
  const o = ajusta(rs, { x: (r) => [r.dV1, r.dSD], nomes: ['dV1', 'dSD'] });
  res.T4[u] = { N: o.N, dV1: testa({ teste: `${tA} β(ΔV1) ${u}`, unidade: u, ...o.dV1 }), dSD: o.dSD, difSDmenosV1: testa({ teste: `${tD} β(ΔSD) − β(ΔV1) ${u}`, unidade: u, ...o.dif }) };
}
// Exploratório (depois de ver o resultado): a mesma decomposição por via em MG 2022, com as vias do diário de 2022
// (doc 24, secoes-mg-2022-diario.csv), para conciliar com o parecer 48 (que pôs as vias no modelo).
{
  const vias = new Map();
  for (const o of await lerTabela(path.join(EST, 'h13-v2', 'secoes-mg-2022-diario.csv'), ['votos_1', 'v1_1', 'v2_1', 'v3m_1', 'v3s_1', 'votos_2', 'v1_2', 'v2_2', 'v3m_2', 'v3s_2'])) vias.set(o.id, o);
  const comp22 = new Map();
  for (const o of await lerTabela(path.join(SAIDA, 'secoes-2022.csv'), ['comp_1', 'comp_2'])) if (o.id.startsWith('mg/')) comp22.set(o.id, o);
  const rs = [];
  for (const r of sub(2022, ['mg'])) {
    const v = vias.get(r.id), c = comp22.get(r.id);
    if (!v || !c || v.votos_1 !== c.comp_1 || v.votos_2 !== c.comp_2) continue;
    const ap = Math.exp(r.logAp);
    const sd = (t) => v[`v2_${t}`] + v[`v3m_${t}`] + v[`v3s_${t}`];
    rs.push({ ...r, dV1: (v.v1_2 - v.v1_1) / ap, dSD: (sd(2) - sd(1)) / ap });
  }
  const o = ajusta(rs, { x: (r) => [r.dV1, r.dSD], nomes: ['dV1', 'dSD'] });
  const oDc = ajusta(rs);
  res.exploratorioMG2022PorVia = { N: o.N, dV1: o.dV1, dSD: o.dSD, difSDmenosV1: o.dif, dcMesmaAmostra: oDc.dc };
  // Conciliação com o parecer 48 (exploratório): controles do perfil do cadastro (sem biometria, 60+, 16–24, escolaridade
  // baixa, superior, log do eleitorado) no lugar de c1, Y1 e log dos aptos; mesma decomposição V1 × sem digital.
  const p22 = new Map();
  for (const q of await lerTabela(path.join(EST, 'h13-v2', 'secoes-2022.csv'), ['eleitores', 'biometria', 'idade60', 'idade16a24', 'escol_baixa', 'superior'])) if (q.id.startsWith('mg/') && q.eleitores) p22.set(q.id, q);
  const p26 = new Map();
  for (const q of await lerTabela(path.join(DIR_DADOS, 'parsed', 'auditoria', 'forense', 'perfil', 'mg.csv'), ['eleitores', 'biometria', 'idade60', 'idade16a24', 'escol_baixa', 'superior'])) if (q.eleitores) p26.set(`${q.uf}/${q.municipio}/${q.zona}/${q.secao}`, q);
  const pc = (q) => [1 - q.biometria / q.eleitores, q.idade60 / q.eleitores, q.idade16a24 / q.eleitores, q.escol_baixa / q.eleitores, q.superior / q.eleitores, Math.log(q.eleitores)];
  const PN = ['sb', 'p60', 'p16a24', 'pBaixa', 'pSup', 'logEle'];
  const ajustaPerfil = (rr, mapa, cols, nomes) => {
    const ok = rr.filter((r) => mapa.has(r.id));
    const reg = regredir(ok.map((r) => ({ w: r.w, g: r.g, y: r.y, cols: [...cols(r), ...pc(mapa.get(r.id)), r.aptosMudou, ...MODELOS.map((m) => (r.modelo === m ? 1 : 0))] })), [...nomes, ...PN, 'aptosMudou', ...MODELOS], nomes.length);
    const out = { N: reg.N };
    for (const n of nomes) out[n] = coef(reg, n);
    if (nomes.length === 2) out.dif = diff(reg, nomes[1], nomes[0]);
    return out;
  };
  const r26 = sub(2026, ['mg'], (r) => r.dV1 !== null);
  res.conciliacaoParecer48 = {
    'MG 2022, Δc': ajustaPerfil(rs, p22, (r) => [r.dc], ['dc']),
    'MG 2022, V1 × sem digital': ajustaPerfil(rs, p22, (r) => [r.dV1, r.dSD], ['dV1', 'dSD']),
    'MG 2026, Δc': ajustaPerfil(r26, p26, (r) => [r.dc], ['dc']),
    'MG 2026, V1 × sem digital': ajustaPerfil(r26, p26, (r) => [r.dV1, r.dSD], ['dV1', 'dSD']),
  };
}
res.bonferroni = { testes: res.testes.length, declarados: 32, z: Z_B, passam: res.testes.filter((t) => t.bonferroni).length };
await writeFile(path.join(SAIDA, 'resultado.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, (k, v) => (typeof v === 'number' ? +v.toPrecision(5) : v), 1));
