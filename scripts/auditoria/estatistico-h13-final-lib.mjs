// Estatístico eleitoral, fechamento da H13 (plano pré-registrado: docs/analysis/estatistico-eleitoral/27-h13-plano-final.md,
// commit 89ede09). Funções comuns aos scripts estatistico-h13-final-*.mjs:
//   - carga das seções de 2026 (banco de leitura, vias do diário com a união das cópias, perfil do eleitorado);
//   - regressão ponderada com efeito fixo de grupo (demeaning) e erro CR1 por grupo (a mesma dos docs 24 e 26);
//   - linhas dos desfechos N2 (nível do 2º turno), N1 (nível do 1º) e P (painel por eleitor do cadastro);
//   - distribuição t (p bicaudal e quantil) e normal.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { lerTabela } from './forense-lib.mjs';

export const EST = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico');
export const SAIDA = path.join(EST, 'h13-final');
export const REGIOES = {
  Nordeste: ['al', 'ba', 'ce', 'ma', 'pb', 'pe', 'pi', 'rn', 'se'],
  Norte: ['ac', 'am', 'ap', 'pa', 'ro', 'rr', 'to'],
  'Centro-Oeste': ['df', 'go', 'ms', 'mt'],
  Sudeste: ['es', 'mg', 'rj', 'sp'],
  Sul: ['pr', 'rs', 'sc'],
};
export const UFS27 = Object.values(REGIOES).flat().sort();
export const NE = new Set(REGIOES.Nordeste);
export const MODELOS = ['ue2009', 'ue2010', 'ue2011', 'ue2013', 'ue2015', 'ue2020', 'ue2022'];
export const VIAS = ['v2', 'v3m', 'v3s'];
export const N_TESTES = 192;
export const P_BONF = 0.05 / N_TESTES; // 2,604e-4
export const Z_B2 = 3.6518; // bicaudal
export const Z_B1 = 3.4698; // unilateral

// ---------- normal e t ----------
export function pNormal2(z) {
  const x = Math.abs(z) / Math.SQRT2, t = 1 / (1 + 0.5 * x);
  return t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
}
export const pNormalSup = (z) => (z >= 0 ? pNormal2(z) / 2 : 1 - pNormal2(z) / 2);
function lgamma(x) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, tmp = x + 5.5; tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015; for (const v of c) ser += v / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}
function betacf(a, b, x) {
  let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - (qab * x) / qap;
  if (Math.abs(d) < 1e-300) d = 1e-300; d = 1 / d; let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m; let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d;
    const del = d * c; h *= del; if (Math.abs(del - 1) < 3e-14) break;
  }
  return h;
}
function betai(a, b, x) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b;
}
/** p bicaudal da t com df graus de liberdade. */
export const pT2 = (t, df) => betai(df / 2, 0.5, df / (df + t * t));
/** Quantil bicaudal: |t| com p bicaudal = p. */
export function tCrit(p, df) { let lo = 0, hi = 100; for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (pT2(m, df) > p) lo = m; else hi = m; } return (lo + hi) / 2; }
export function zCrit2(p) { let lo = 0, hi = 40; for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (pNormal2(m) > p) lo = m; else hi = m; } return (lo + hi) / 2; }

/** Benjamini-Hochberg: devolve, para cada p, se passa a 5%. */
export function bh(ps, q = 0.05) {
  const ord = ps.map((p, i) => [p, i]).filter(([p]) => Number.isFinite(p)).sort((a, b) => a[0] - b[0]);
  const m = ord.length; let k = -1;
  ord.forEach(([p], j) => { if (p <= ((j + 1) / m) * q) k = j; });
  const passa = new Array(ps.length).fill(false);
  for (let j = 0; j <= k; j++) passa[ord[j][1]] = true;
  return passa;
}

// ---------- regressão com efeito fixo (demeaning ponderado), CR1 por grupo (a mesma dos docs 24 e 26) ----------
function cholInv(A) {
  const n = A.length, Lm = A.map((r) => r.map(() => 0));
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
    let s = A[i][j];
    for (let k = 0; k < j; k++) s -= Lm[i][k] * Lm[j][k];
    if (i === j) { if (!(s > 1e-9 * A[i][i])) return { falha: i }; Lm[i][i] = Math.sqrt(s); } else Lm[i][j] = s / Lm[j][j];
  }
  const inv = A.map((_, c) => {
    const y = new Array(n).fill(0);
    for (let i = 0; i < n; i++) { let s = i === c ? 1 : 0; for (let k = 0; k < i; k++) s -= Lm[i][k] * y[k]; y[i] = s / Lm[i][i]; }
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) { let s = y[i]; for (let k = i + 1; k < n; k++) s -= Lm[k][i] * x[k]; x[i] = s / Lm[i][i]; }
    return x;
  });
  return { inv };
}

/**
 * Prepara o demeaning por grupo (só grupos com 2+ linhas). rows: { w, g, y, cols[] }.
 * Devolve um objeto reaproveitável: ajustar(ysNovo?, colsNovas?) refaz a conta com outro y (ou outras colunas).
 */
export function regredir(rows, nomes, nFoc, { ys = null, cols = null, cluster = null } = {}) {
  const grupos = new Map();
  rows.forEach((r, i) => { const g = grupos.get(r.g); if (g) g.push(i); else grupos.set(r.g, [i]); });
  const K0 = nomes.length;
  const X = [], Y = [], W = [], G = [], idx = [];
  const clusters = new Map();
  for (const ii of grupos.values()) {
    if (ii.length < 2) continue;
    let sw = 0; const mx = new Array(K0).fill(0); let my = 0;
    for (const i of ii) { const r = rows[i]; const c = cols ? cols[i] : r.cols; const y = ys ? ys[i] : r.y; sw += r.w; for (let k = 0; k < K0; k++) mx[k] += r.w * c[k]; my += r.w * y; }
    for (let k = 0; k < K0; k++) mx[k] /= sw; my /= sw;
    for (const i of ii) {
      const r = rows[i]; const c = cols ? cols[i] : r.cols; const y = ys ? ys[i] : r.y;
      X.push(c.map((v, k) => v - mx[k])); Y.push(y - my); W.push(r.w); idx.push(i);
      const cl = cluster ? cluster(r) : r.g;
      let ci = clusters.get(cl); if (ci === undefined) clusters.set(cl, (ci = clusters.size));
      G.push(ci);
    }
  }
  const gi = clusters.size;
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
    return { N, grupos: grupos.size, clusters: gi, nomes: ativas.map((c) => nomes[c]), beta, cov, resid: e, idx };
  }
}
/** Coeficiente em pontos (×100), erro e z. */
export const coef = (r, nome) => { const p = r.nomes.indexOf(nome); return p < 0 ? null : { beta: r.beta[p] * 100, se: Math.sqrt(r.cov[p][p]) * 100, z: r.beta[p] / Math.sqrt(r.cov[p][p]) }; };

// ---------- carga ----------
/** Seções de 2026 (todas as UFs pedidas): t1/t2 com local, comparecimento, modelo, 13, 22; log (vias do diário); perfil. */
export async function carregar(ufs) {
  const lista = ufs.map((u) => `'${u}'`).join(',');
  const secoes = new Map();
  const { db } = await abrirLeitura();
  for (const turno of [1, 2]) {
    for (const r of db.prepare(`SELECT uf, municipio, zona, secao, local, comparecimento, modelo_urna FROM secao WHERE turno = ? AND uf IN (${lista})`).iterate(turno)) {
      const id = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
      const s = secoes.get(id) ?? { id, uf: r.uf };
      s[`t${turno}`] = { local: r.local, comp: r.comparecimento, modelo: (r.modelo_urna ?? '').toLowerCase(), v13: 0, v22: 0 };
      secoes.set(id, s);
    }
    for (const v of db.prepare(`SELECT uf, municipio, zona, secao, numero, quantidade FROM voto_bu WHERE turno = ? AND uf IN (${lista}) AND cargo = 1 AND numero IN (13, 22)`).iterate(turno)) {
      const t = secoes.get(`${v.uf}/${v.municipio}/${v.zona}/${v.secao}`)?.[`t${turno}`];
      if (t) t[v.numero === 13 ? 'v13' : 'v22'] += v.quantidade;
    }
    // aptos do BU (adendo 1 do plano 27): maior `aptos` da seção em secao_eleicao no turno (o mesmo campo do parecer 54)
    for (const a of db.prepare(`SELECT uf, municipio, zona, secao, MAX(aptos) aptos FROM secao_eleicao WHERE turno = ? AND uf IN (${lista}) GROUP BY uf, municipio, zona, secao`).iterate(turno)) {
      const t = secoes.get(`${a.uf}/${a.municipio}/${a.zona}/${a.secao}`)?.[`t${turno}`];
      if (t) t.aptos = a.aptos;
    }
  }
  db.close();
  const ufSet = new Set(ufs);
  let relidas = 0;
  for (const turno of [1, 2]) {
    for (const dir of [path.join(EST, 'h08', `${turno}t`), path.join(EST, 'h08-uniao', `${turno}t`)]) { // a releitura com união vem depois e sobrescreve
      for (const f of (await readdir(dir)).filter((x) => x.endsWith('.secoes.jsonl') && (ufSet.has(x.slice(0, 2)) || x === 'selecao.secoes.jsonl')).sort()) {
        for (const l of (await readFile(path.join(dir, f), 'utf8')).split('\n')) {
          if (!l) continue;
          const x = JSON.parse(l);
          if (!ufSet.has(x.uf)) continue;
          const t = secoes.get(`${x.uf}/${x.municipio}/${x.zona}/${x.secao}`)?.[`t${turno}`];
          if (t) { t.log = { votos: x.votos, ...x.vias }; if (f === 'selecao.secoes.jsonl') relidas++; }
        }
      }
    }
  }
  const perfil = new Map();
  for (const uf of ufs.filter((u) => u !== 'zz')) for (const p of await lerTabela(path.join(DIR_DADOS, 'parsed', 'auditoria', 'forense', 'perfil', `${uf}.csv`), ['eleitores', 'biometria', 'idade60', 'idade16a24', 'escol_baixa', 'superior'])) perfil.set(`${p.uf}/${p.municipio}/${p.zona}/${p.secao}`, p);
  for (const s of secoes.values()) s.p = perfil.get(s.id) ?? null;
  return { secoes, relidas };
}

// ---------- linhas dos desfechos ----------
const Yf = (t) => t.v13 / (t.v13 + t.v22);
const grupoDe = (s, t) => `${s.id.split('/').slice(0, 3).join('/')}/${t.local}`;
const zonaDe = (s) => s.id.split('/').slice(0, 3).join('/');
/**
 * Monta as linhas de um desfecho ('N2', 'N1', 'P') para as seções dadas, com exclusões contadas.
 * Cada linha: { id, uf, g (local), zona, mun, w, y, foc[], ctrl info, s }.
 */
export function montar(secoes, desfecho, exc = {}, { aceitarDiferente = false, denominador = 'perfil' } = {}) {
  const conta = (m) => { exc[m] = (exc[m] ?? 0) + 1; };
  const aptos = denominador === 'aptos';
  const out = [];
  for (const s of secoes) {
    const a = s.t2, b = s.t1;
    const p = s.p;
    if (desfecho === 'P') {
      if (!a?.comp || !b?.comp) { conta('sem a seção nos dois turnos'); continue; }
      if (!a.log || !b.log) { conta('sem diário'); continue; }
      if (!aceitarDiferente && (a.log.votos !== a.comp || b.log.votos !== b.comp)) { conta('diário diferente do BU'); continue; }
      if (a.v13 + a.v22 < 20 || b.v13 + b.v22 < 20) { conta('menos de 20 votos em 13 + 22'); continue; }
      if (!p || !p.eleitores) { conta('sem perfil'); continue; }
      if (aptos && !(a.aptos > 0 && b.aptos > 0)) { conta('sem aptos no BU'); continue; }
      const el = p.eleitores;
      // perfil (plano): Δ(votos da via) ÷ eleitores do perfil; aptos (adendo 1): taxa por apto do BU de cada turno
      const e = aptos ? (k) => a.log[k] / a.aptos - b.log[k] / b.aptos : (k) => (a.log[k] - b.log[k]) / el;
      out.push({ id: s.id, uf: s.uf, g: grupoDe(s, a), zona: zonaDe(s), mun: s.id.split('/').slice(0, 2).join('/'), w: a.v13 + a.v22, y: Yf(a) - Yf(b), modelo: a.modelo, p, s,
        foc: VIAS.map(e), dC: e('votos'), den2: aptos ? a.aptos : el, logTam: Math.log(aptos ? a.aptos : el) });
    } else {
      const t = desfecho === 'N2' ? a : b;
      if (!t?.comp) { conta('sem a seção no turno'); continue; }
      if (!t.log) { conta('sem diário'); continue; }
      if (!aceitarDiferente && t.log.votos !== t.comp) { conta('diário diferente do BU'); continue; }
      if (t.v13 + t.v22 < 20) { conta('menos de 20 votos em 13 + 22'); continue; }
      if (!p || !p.eleitores) { conta('sem perfil'); continue; }
      if (aptos && !(t.aptos > 0)) { conta('sem aptos no BU'); continue; }
      out.push({ id: s.id, uf: s.uf, g: grupoDe(s, t), zona: zonaDe(s), mun: s.id.split('/').slice(0, 2).join('/'), w: t.v13 + t.v22, y: Yf(t), modelo: t.modelo, p, s,
        foc: VIAS.map((v) => t.log[v] / t.log.votos), dC: null, logTam: Math.log(aptos ? t.aptos : p.eleitores) });
    }
  }
  return out;
}

const CTRLN = (base) => ['cadSemBio', 'p60', 'p16a24', 'pBaixa', 'pSup', 'logEle', ...MODELOS.filter((m) => m !== base)];
export const ctrlDe = (r, base) => { const p = r.p, el = p.eleitores; return [1 - p.biometria / el, p.idade60 / el, p.idade16a24 / el, p.escol_baixa / el, p.superior / el, r.logTam ?? Math.log(el), ...MODELOS.filter((m) => m !== base).map((m) => (r.modelo === m ? 1 : 0))]; };
export const baseModelo = (rs) => { const cont = {}; for (const r of rs) cont[r.modelo] = (cont[r.modelo] ?? 0) + 1; return { base: MODELOS.filter((m) => cont[m]).at(-1), cont }; };

/**
 * Ajusta o modelo do plano (seção 4) nas linhas rs do desfecho. comVias=false tira as vias (resíduo da seção 5).
 * opts.ys / opts.focs substituem y e as vias (injeção). opts.grupo troca o efeito fixo; opts.cluster troca o agrupamento do erro;
 * opts.semControles tira os controles.
 */
export function ajustar(rs, desfecho, { comVias = true, ys = null, focs = null, dCs = null, grupo = null, cluster = null, semControles = false } = {}) {
  const { base } = baseModelo(rs);
  const nomesFoc = [...(comVias ? ['eV2', 'eV3m', 'eV3s'] : []), ...(desfecho === 'P' ? ['dC'] : [])];
  const rows = rs.map((r, i) => {
    const f = focs ? focs[i] : r.foc;
    const dC = dCs ? dCs[i] : r.dC;
    const focais = [...(comVias ? f : []), ...(desfecho === 'P' ? [dC] : [])];
    return { w: r.w, g: grupo ? grupo(r) : r.g, y: ys ? ys[i] : r.y, cols: [...focais, ...(semControles ? [] : ctrlDe(r, base))], r };
  });
  const nomes = [...nomesFoc, ...(semControles ? [] : CTRLN(base))];
  const reg = regredir(rows, nomes, nomesFoc.length, { cluster: cluster ? (row) => cluster(row.r) : null });
  if (!reg) return null;
  const o = { N: reg.N, locais: reg.grupos, clusters: reg.clusters, base, reg };
  if (comVias) for (const [i, v] of VIAS.entries()) o[v] = coef(reg, ['eV2', 'eV3m', 'eV3s'][i]);
  if (desfecho === 'P') o.dC = coef(reg, 'dC');
  return o;
}

export const fmt = (x, d = 2) => (x == null || !Number.isFinite(x) ? '—' : x.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }));
