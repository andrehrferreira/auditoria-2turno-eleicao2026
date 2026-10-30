// Estatístico eleitoral, H13 sinal V2 (adendo 4 de 30/10/2026 ao plano 16; resultado no doc 23): comparação por seção
// com 2022 no Sul, em MG e no RS. Sem diário de 2022, a V2 por seção não existe; substituto e*_V2 = Δc × sb, com
// Δc = Δcomparecimento ÷ eleitores do cadastro e sb = fração sem biometria do cadastro do mesmo ano.
// Passo 1 (calibração em 2026): o substituto serve se o coeficiente de Δc × sb for positivo com z ≥ 2 e o sinal real
//   (e_V2 com Δc, medida do adendo 3) for positivo na mesma amostra. Passo 2 (2022, só onde serve): T1 = coeficiente em
//   2022; T2 = diferença 2026 − 2022. Até 6 testes, Bonferroni |z| ≥ 2,64.
// Modelo nos dois anos: ΔY ~ Δc × sb (centrado) + Δc + sb + 60+, 16–24, escolaridade baixa, superior, log do eleitorado,
//   modelo da urna; efeito fixo de local de votação; peso 13 + 22 do 2º turno; CR1 por local.
// Uso: node --max-old-space-size=8000 scripts/auditoria/estatistico-h13-v2-analise2022.mjs
// Entradas: banco (cópia de leitura), estatistico/h08 e h08-uniao, forense/perfil, h13-v2/secoes-2022.csv
// Saída: data/parsed/auditoria/estatistico/h13-v2/resultado-2022.json
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { lerTabela } from './forense-lib.mjs';

const EST = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico');
const SAIDA = path.join(EST, 'h13-v2');
const pBi = (z) => { const x = Math.abs(z) / Math.SQRT2, t = 1 / (1 + 0.5 * x); return t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))))); };
// ---------- 2026: BU, perfil, vias do diário (com a união das cópias) ----------
const UNID = { Sul: ['pr', 'rs', 'sc'], MG: ['mg'], RS: ['rs'] };
const UFSET = new Set(Object.values(UNID).flat());
const Z_B = 2.6383; // Φ⁻¹(1 − 0,05 / 12)
const secoes = new Map();
const { db } = await abrirLeitura();
for (const turno of [1, 2]) {
  for (const r of db.prepare('SELECT uf, municipio, zona, secao, local, comparecimento, modelo_urna FROM secao WHERE turno = ?').iterate(turno)) {
    if (!UFSET.has(r.uf)) continue;
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
  for (const dir of [path.join(EST, 'h08', `${turno}t`), path.join(EST, 'h08-uniao', `${turno}t`)]) { // a releitura com união vem depois e sobrescreve
    for (const f of (await readdir(dir)).filter((x) => x.endsWith('.secoes.jsonl')).sort()) {
      for (const l of (await readFile(path.join(dir, f), 'utf8')).split('\n')) {
        if (!l) continue;
        const x = JSON.parse(l);
        const t = secoes.get(`${x.uf}/${x.municipio}/${x.zona}/${x.secao}`)?.[`t${turno}`];
        if (t) t.log = { votos: x.votos, ...x.vias };
      }
    }
  }
}
const perfil26 = new Map();
for (const uf of UFSET) for (const p of await lerTabela(path.join(DIR_DADOS, 'parsed', 'auditoria', 'forense', 'perfil', `${uf}.csv`), ['eleitores', 'biometria', 'idade60', 'idade16a24', 'escol_baixa', 'superior'])) perfil26.set(`${p.uf}/${p.municipio}/${p.zona}/${p.secao}`, p);

const ex = { 2026: {}, 2022: {} };
const exc = (ano, m) => { ex[ano][m] = (ex[ano][m] ?? 0) + 1; };
const MODELOS = ['ue2009', 'ue2010', 'ue2011', 'ue2013', 'ue2015', 'ue2020', 'ue2022'];
const ctrlDe = (p, modelo) => [p.idade60 / p.eleitores, p.idade16a24 / p.eleitores, p.escol_baixa / p.eleitores, p.superior / p.eleitores, Math.log(p.eleitores), ...MODELOS.map((m) => (modelo === m ? 1 : 0))];
const CTRLN = ['p60', 'p16a24', 'pBaixa', 'pSup', 'logEle', ...MODELOS];
const L26 = [];
for (const s of secoes.values()) {
  const a = s.t2, b = s.t1;
  if (!a?.comp || !b?.comp) { exc(2026, 'sem a seção nos dois turnos'); continue; }
  if (a.v13 + a.v22 < 20 || b.v13 + b.v22 < 20) { exc(2026, 'menos de 20 votos em 13 + 22'); continue; }
  const p = perfil26.get(s.id);
  if (!p || !p.eleitores) { exc(2026, 'sem perfil'); continue; }
  if (!a.log || !b.log || a.log.votos !== a.comp || b.log.votos !== b.comp) { exc(2026, 'sem diário igual ao BU (precisa para o sinal real)'); continue; }
  const el = p.eleitores, sb = 1 - p.biometria / el, dc = (a.comp - b.comp) / el;
  L26.push({ uf: s.uf, g: `${s.uf}/${s.municipio}/${s.zona}/${a.local}`, w: a.v13 + a.v22, y: a.v13 / (a.v13 + a.v22) - b.v13 / (b.v13 + b.v22), dc, sb,
    eV2: (a.log.v2 - b.log.v2) / el, eV3m: (a.log.v3m - b.log.v3m) / el, eV3s: (a.log.v3s - b.log.v3s) / el, ctrl: ctrlDe(p, a.modelo) });
}
// ---------- 2022 ----------
const L22 = [];
for (const o of await lerTabela(path.join(SAIDA, 'secoes-2022.csv'), ['v13_1', 'v22_1', 'v13_2', 'v22_2', 'aptos_1', 'comp_1', 'aptos_2', 'comp_2', 'eleitores', 'biometria', 'idade60', 'idade16a24', 'escol_baixa', 'superior'])) {
  const [uf, mun, zona] = o.id.split('/');
  if (!UFSET.has(uf)) continue;
  for (const c of ['v13_1', 'v22_1', 'v13_2', 'v22_2']) o[c] ??= 0; // sem linha = 0 voto
  if (o.comp_1 === null || o.comp_2 === null) { exc(2022, 'sem a seção nos dois turnos'); continue; }
  if (o.v13_1 + o.v22_1 < 20 || o.v13_2 + o.v22_2 < 20) { exc(2022, 'menos de 20 votos em 13 + 22'); continue; }
  if (!o.eleitores) { exc(2022, 'sem perfil'); continue; }
  const el = o.eleitores;
  L22.push({ uf, g: `${uf}/${mun}/${zona}/${o.local_2}`, w: o.v13_2 + o.v22_2, y: o.v13_2 / (o.v13_2 + o.v22_2) - o.v13_1 / (o.v13_1 + o.v22_1), dc: (o.comp_2 - o.comp_1) / el, sb: 1 - o.biometria / el, ctrl: ctrlDe(o, (o.modelo_2 ?? '').toLowerCase()) });
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


const res = { geradoEm: new Date().toISOString(), exclusoes: ex, secoes: { 2026: L26.length, 2022: L22.length }, unidades: {}, testes: [] };
const proxy = (rs) => {
  const mdc = wmean(rs, (r) => r.dc), msb = wmean(rs, (r) => r.sb);
  const reg = regredir(rs.map((r) => ({ w: r.w, g: r.g, y: r.y, cols: [(r.dc - mdc) * (r.sb - msb), r.dc, r.sb, ...r.ctrl] })), ['dc_x_sb', 'dc', 'sb', ...CTRLN], 3);
  return { N: reg.N, locais: reg.grupos, dc_x_sb: coef(reg, 'dc_x_sb'), dc: coef(reg, 'dc'), sb: coef(reg, 'sb'), medias: { dc: mdc, sb: msb }, sbP10P90: (() => { const v = rs.map((r) => r.sb).sort((x, y) => x - y); return [v[Math.floor(0.1 * v.length)], v[Math.floor(0.9 * v.length)]]; })() };
};
/** correlação ponderada, dentro do local, entre o substituto Δc × sb e o e_V2 real */
function corrDentro(rs) {
  const g = new Map();
  for (const r of rs) { const k = r.g; const o = g.get(k) ?? { w: 0, x: 0, y: 0, n: 0 }; const x = r.dc * r.sb; o.w += r.w; o.x += r.w * x; o.y += r.w * r.eV2; o.n++; g.set(k, o); }
  let sxy = 0, sxx = 0, syy = 0;
  for (const r of rs) { const o = g.get(r.g); if (o.n < 2) continue; const dx = r.dc * r.sb - o.x / o.w, dy = r.eV2 - o.y / o.w; sxy += r.w * dx * dy; sxx += r.w * dx * dx; syy += r.w * dy * dy; }
  return sxy / Math.sqrt(sxx * syy);
}
const testa = (o) => { const t = { ...o, p: pBi(o.z), bonferroni: Math.abs(o.z) >= Z_B }; res.testes.push(t); return t; };
for (const [u, ufs] of Object.entries(UNID)) {
  const set = new Set(ufs);
  const r26 = L26.filter((r) => set.has(r.uf)), r22 = L22.filter((r) => set.has(r.uf));
  const real = regredir(r26.map((r) => ({ w: r.w, g: r.g, y: r.y, cols: [r.eV2, r.eV3m, r.eV3s, r.dc, r.sb, ...r.ctrl] })), ['eV2', 'eV3m', 'eV3s', 'dc', 'sb', ...CTRLN], 4);
  const p26 = proxy(r26);
  const real_eV2 = coef(real, 'eV2');
  const serve = p26.dc_x_sb.beta > 0 && p26.dc_x_sb.z >= 2 && real_eV2.beta > 0;
  const U = { calibracao2026: { sinalReal_eV2: real_eV2, substituto: p26, razaoSubstitutoSobreReal: p26.dc_x_sb.beta / real_eV2.beta, correlacaoDentroDoLocal: corrDentro(r26), serve } };
  const p22 = proxy(r22);
  U.ano2022 = p22;
  U.mde80_2022 = (Z_B + 0.84) * p22.dc_x_sb.se;
  if (serve) {
    U.T1 = testa({ unidade: u, teste: 'T1 Δc × sb em 2022', ...p22.dc_x_sb });
    const d = p26.dc_x_sb.beta - p22.dc_x_sb.beta, se = Math.hypot(p26.dc_x_sb.se, p22.dc_x_sb.se);
    U.T2 = testa({ unidade: u, teste: 'T2 diferença 2026 − 2022', dif: d, se, z: d / se });
    const t1 = U.T1, t2 = U.T2;
    U.leitura = t1.beta > 0 && t1.bonferroni && !t2.bonferroni ? 'estrutural' : Math.abs(t1.z) < 2 && t2.dif > 0 && t2.bonferroni ? 'próprio de 2026' : 'inconclusivo';
  } else U.leitura = 'substituto não serve: 2022 sem teste';
  res.unidades[u] = U;
}
// Exploratório (acrescentado depois de ver o resultado): em 2022 a cobertura biométrica era bem menor (revisão biométrica
// incompleta), então sb mede outra coisa. Refaz 2022 só com seções cujo sb fica até o percentil 90 de 2026 da mesma unidade.
res.exploratorio2022SbComparavel = {};
for (const [u, ufs] of Object.entries(UNID)) {
  const set = new Set(ufs);
  const lim = res.unidades[u].calibracao2026.substituto.sbP10P90[1];
  const rr = L22.filter((r) => set.has(r.uf) && r.sb <= lim);
  res.exploratorio2022SbComparavel[u] = { limiteSb: lim, ...proxy(rr) };
}
await writeFile(path.join(SAIDA, 'resultado-2022.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, (k, v) => (typeof v === 'number' ? +v.toPrecision(5) : v), 1));
