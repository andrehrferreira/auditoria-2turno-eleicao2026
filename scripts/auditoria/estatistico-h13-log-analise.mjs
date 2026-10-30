// Estatístico eleitoral, H13 pelo diário da urna (plano: docs/analysis/estatistico-eleitoral/16-h13-log-plano.md).
// Vias de liberação por seção da leitura própria dos diários (estatistico-h08-varredura.mjs, os dois turnos):
//   V2 ano de nascimento (sem digital na urna), V3m manual com mesário associado, V3s manual sem mesário.
// Parte A (Fato, sem modelo): cerco aritmético da parte de cada via que pode ter votado no 13 e pior caso da margem.
// Parte B (estimativa): MQP com efeito fixo de local de votação, peso n = 13 + 22, CR1 por local;
//   nível 2º turno: Y2 ~ x_V2 + x_V3m + x_V3s + controles; painel: ΔY ~ Δx + controles; linha de base: nível do 1º turno.
//   Família: {Brasil, 5 regiões, 27 UFs} × 3 vias × 2 desfechos + Nordeste − resto (6) = 204 testes; Bonferroni e BH.
//   Efeito mínimo detectável: injeção de f = 1% dos liberados como voto a mais no 13 (ou no 22) e deslocamento de z.
// Uso: node --max-old-space-size=12000 scripts/auditoria/estatistico-h13-log-analise.mjs
// Saída: data/parsed/auditoria/estatistico/h13-log/{resultado.json, testes.csv, cerco.csv, conferencia.csv}
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { lerTabela } from './forense-lib.mjs';

const BASE_H08 = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h08');
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h13-log');
const REGIOES = {
  Nordeste: ['al', 'ba', 'ce', 'ma', 'pb', 'pe', 'pi', 'rn', 'se'],
  Norte: ['ac', 'am', 'ap', 'pa', 'ro', 'rr', 'to'],
  'Centro-Oeste': ['df', 'go', 'ms', 'mt'],
  Sudeste: ['es', 'mg', 'rj', 'sp'],
  Sul: ['pr', 'rs', 'sc'],
};
const UFS_BR = Object.values(REGIOES).flat();
const regiaoDe = Object.fromEntries(Object.entries(REGIOES).flatMap(([r, ufs]) => ufs.map((u) => [u, r])));
const VIAS = ['v2', 'v3m', 'v3s'];
const NOME_VIA = { v2: 'V2 ano de nascimento', v3m: 'V3m manual com mesário', v3s: 'V3s manual sem mesário' };
const CONTROLES = ['cadSemBio', 'p60', 'p16a24', 'pBaixa', 'pSup', 'logEle', 'u13', 'u15', 'u20'];
const N_TESTES = 204;

// ---------- normal ----------
function erfc(x) {
  const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}
const pBicaudal = (z) => erfc(Math.abs(z) / Math.SQRT2);
function invNormal(p) { // Acklam
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - pl) return -invNormal(1 - p);
  const q = p - 0.5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
const Z_BONF = invNormal(1 - 0.05 / (2 * N_TESTES));
const Z_PODER = invNormal(0.8);

// ---------- carga ----------
async function lerVarredura(turno) {
  const dir = path.join(BASE_H08, `${turno}t`);
  const mapa = new Map();
  for (const f of (await readdir(dir)).filter((x) => x.endsWith('.secoes.jsonl')).sort()) {
    for (const l of (await readFile(path.join(dir, f), 'utf8')).split('\n')) {
      if (!l) continue;
      const s = JSON.parse(l);
      mapa.set(`${s.uf}/${s.municipio}/${s.zona}/${s.secao}`, { votos: s.votos, ...s.vias });
    }
  }
  return mapa;
}

const { db } = await abrirLeitura();
const secoes = new Map(); // id → { uf, local, t1: {...}, t2: {...} }
for (const turno of [1, 2]) {
  for (const r of db.prepare(`SELECT uf, municipio, zona, secao, local, comparecimento, sem_biometria, por_biometria, por_biografia, modelo_urna, situacao FROM secao WHERE turno = ?`).iterate(turno)) {
    const id = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
    const s = secoes.get(id) ?? { id, uf: r.uf, municipio: r.municipio, zona: r.zona };
    s[`t${turno}`] = { local: r.local, comp: r.comparecimento, semBio: r.sem_biometria, porBio: r.por_biometria, porBiog: r.por_biografia, modelo: r.modelo_urna, situacao: r.situacao, v13: 0, v22: 0, T: 0 };
    secoes.set(id, s);
  }
  for (const v of db.prepare('SELECT uf, municipio, zona, secao, numero, quantidade FROM voto_bu WHERE turno = ? AND cargo = 1').iterate(turno)) {
    const s = secoes.get(`${v.uf}/${v.municipio}/${v.zona}/${v.secao}`)?.[`t${turno}`];
    if (!s) continue;
    s.T += v.quantidade;
    if (v.numero === 13) s.v13 += v.quantidade;
    else if (v.numero === 22) s.v22 += v.quantidade;
  }
}
db.close();
for (const turno of [1, 2]) {
  const mapa = await lerVarredura(turno);
  for (const [id, l] of mapa) { const s = secoes.get(id)?.[`t${turno}`]; if (s) s.log = l; }
}
const perfil = new Map();
for (const uf of UFS_BR) {
  for (const p of await lerTabela(path.join(DIR_DADOS, 'parsed', 'auditoria', 'forense', 'perfil', `${uf}.csv`), ['eleitores', 'biometria', 'idade60', 'idade16a24', 'escol_baixa', 'superior'])) {
    perfil.set(`${p.uf}/${p.municipio}/${p.zona}/${p.secao}`, p);
  }
}

// ---------- conferência diário × BU (por turno) ----------
const conferencia = {};
const linhasConf = [];
for (const turno of [1, 2]) {
  const c = { secoesComVoto: 0, semLog: 0, iguaisVotosEVias: 0, votosDiferentes: 0, viasDiferentes: 0, exterior: 0, outra: 0 };
  const tot = { votos: 0, v1: 0, v2: 0, v3m: 0, v3s: 0, buComp: 0, buPorBio: 0, buSemBio: 0, buBiog: 0 };
  for (const s of secoes.values()) {
    const t = s[`t${turno}`];
    if (!t || !t.comp) continue;
    c.secoesComVoto++;
    if (s.uf === 'zz') c.exterior++;
    if (!t.log) { c.semLog++; continue; }
    c.outra += t.log.outra;
    tot.votos += t.log.votos; tot.v1 += t.log.v1; tot.v2 += t.log.v2; tot.v3m += t.log.v3m; tot.v3s += t.log.v3s;
    tot.buComp += t.comp;
    const dv = t.log.votos !== t.comp;
    let dVia = false;
    if (s.uf !== 'zz' && t.porBio !== null) {
      tot.buPorBio += t.porBio; tot.buSemBio += t.semBio; tot.buBiog += t.porBiog;
      dVia = t.log.v1 !== t.porBio || t.log.v2 !== t.semBio || t.log.v3m + t.log.v3s !== t.porBiog;
    }
    t.confere = !dv && !dVia;
    if (dv) c.votosDiferentes++;
    if (dVia) c.viasDiferentes++;
    if (t.confere) c.iguaisVotosEVias++;
    else linhasConf.push({ turno, id: s.id, votosLog: t.log.votos, compBu: t.comp, v1: t.log.v1, v2: t.log.v2, v3m: t.log.v3m, v3s: t.log.v3s, outra: t.log.outra, buPorBio: t.porBio, buSemBio: t.semBio, buBiog: t.porBiog });
  }
  conferencia[turno] = { ...c, totais: tot };
}

// ---------- Parte A: cerco aritmético (2º turno, Brasil sem exterior; exterior relatado à parte) ----------
let margemNacional = 0;
for (const s of secoes.values()) if (s.t2) margemNacional += s.t2.v13 - s.t2.v22;
const CONJ = { V2: ['v2'], V3m: ['v3m'], V3s: ['v3s'], V3: ['v3m', 'v3s'], 'V2+V3': ['v2', 'v3m', 'v3s'] };
const cerco = {};
const exclA = { semLog: 0, semVoto: 0, liberadosAcimaDoTotal: 0 };
for (const s of secoes.values()) {
  const t = s.t2;
  if (!t || !t.comp) continue;
  if (!t.log) { exclA.semLog++; continue; }
  if (!t.T) { exclA.semVoto++; continue; }
  const grupos = s.uf === 'zz' ? ['Exterior'] : ['Brasil', regiaoDe[s.uf], s.uf.toUpperCase()];
  const O = t.T - t.v13 - t.v22;
  for (const [nome, vias] of Object.entries(CONJ)) {
    let L = vias.reduce((a, v) => a + t.log[v], 0);
    if (L > t.T) { exclA.liberadosAcimaDoTotal++; L = t.T; }
    const max13 = Math.min(L, t.v13), min13 = Math.max(0, L - t.v22 - O);
    const b22 = Math.max(0, L - max13 - O);
    for (const g of grupos) {
      const c = ((cerco[g] ??= {})[nome] ??= { secoes: 0, L: 0, min13: 0, max13: 0, reducaoMargem: 0, v13: 0, v22: 0 });
      c.secoes++; c.L += L; c.min13 += min13; c.max13 += max13; c.reducaoMargem += max13 - b22; c.v13 += t.v13; c.v22 += t.v22;
    }
  }
}
for (const g of Object.values(cerco)) for (const c of Object.values(g)) Object.assign(c, { parteMin: c.min13 / c.L, parteMax: c.max13 / c.L, margemPiorCaso: margemNacional - c.reducaoMargem });

// ---------- Parte B: regressões ----------
function covariaveis(s, turno) {
  const p = perfil.get(s.id);
  if (!p || !p.eleitores) return null;
  const m = s[`t${turno}`].modelo;
  return [1 - p.biometria / p.eleitores, p.idade60 / p.eleitores, p.idade16a24 / p.eleitores, p.escol_baixa / p.eleitores, p.superior / p.eleitores, Math.log(p.eleitores), m === 'ue2013' ? 1 : 0, m === 'ue2015' ? 1 : 0, m === 'ue2020' ? 1 : 0];
}
const exclB = {};
const conta = (desf, motivo) => { exclB[desf] ??= {}; exclB[desf][motivo] = (exclB[desf][motivo] ?? 0) + 1; };
/** Linhas de um desfecho: { uf, g (local), w, y, x[3], ctrl[], L[3] (para injeção), extra } */
function montar(desfecho, { incluirDivergentes = false, efeito = 'local' } = {}) {
  const linhas = [];
  for (const s of secoes.values()) {
    if (s.uf === 'zz' || !s.t2?.comp) continue;
    const a = s.t2, b = s.t1;
    const usa = desfecho === 'nivel1' ? [b] : desfecho === 'nivel2' ? [a] : [a, b];
    if (usa.some((t) => !t || !t.comp)) { conta(desfecho, 'sem a seção no outro turno'); continue; }
    if (usa.some((t) => !t.log)) { conta(desfecho, 'sem diário'); continue; }
    if (!incluirDivergentes && usa.some((t) => !t.confere)) { conta(desfecho, 'diário diferente do BU'); continue; }
    if (usa.some((t) => t.v13 + t.v22 < 20)) { conta(desfecho, 'menos de 20 votos em 13 + 22'); continue; }
    const ctrl = covariaveis(s, desfecho === 'nivel1' ? 1 : 2);
    if (!ctrl) { conta(desfecho, 'sem perfil do eleitorado'); continue; }
    const g = efeito === 'local' ? `${s.uf}/${s.municipio}/${s.zona}/${a.local}` : `${s.uf}/${s.municipio}/${s.zona}`;
    const xs = (t) => VIAS.map((v) => t.log[v] / t.log.votos);
    const Y = (t) => t.v13 / (t.v13 + t.v22);
    if (desfecho === 'painel') {
      const xa = xs(a), xb = xs(b);
      linhas.push({ id: s.id, uf: s.uf, g, w: a.v13 + a.v22, y: Y(a) - Y(b), x: xa.map((v, i) => v - xb[i]), ctrl, a, b });
    } else {
      const t = usa[0];
      linhas.push({ uf: s.uf, g, w: t.v13 + t.v22, y: Y(t), x: xs(t), ctrl, a: t });
    }
  }
  return linhas;
}

function resolverSimetrico(A, bvec) { // Cholesky; devolve { falha: i } se a coluna i depende das anteriores
  const n = A.length, L = A.map((r) => r.map(() => 0));
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
    let s = A[i][j];
    for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
    if (i === j) { if (s <= 1e-9 * A[i][i]) return { falha: i }; L[i][i] = Math.sqrt(s); } else L[i][j] = s / L[j][j];
  }
  const inv = A.map((_, c) => { // inversa coluna a coluna
    const e = A.map((__, r) => (r === c ? 1 : 0));
    const y = new Array(n).fill(0);
    for (let i = 0; i < n; i++) { let s = e[i]; for (let k = 0; k < i; k++) s -= L[i][k] * y[k]; y[i] = s / L[i][i]; }
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) { let s = y[i]; for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k]; x[i] = s / L[i][i]; }
    return x;
  });
  const beta = inv.map((row) => row.reduce((a, v, j) => a + v * bvec[j], 0));
  return { beta, inv };
}

/**
 * MQP com efeito fixo (demeaning ponderado por grupo) e CR1 por grupo. `ys` opcional substitui y (injeção).
 * Devolve coeficientes e erros das 3 vias.
 */
function regredir(linhas, { usarControles = true, ys = null, xsOverride = null } = {}) {
  const cols = (r, i) => [...(xsOverride ? xsOverride[i] : r.x), ...(usarControles ? r.ctrl : [])];
  const grupos = new Map();
  linhas.forEach((r, i) => { const g = grupos.get(r.g); if (g) g.push(i); else grupos.set(r.g, [i]); });
  const K0 = 3 + (usarControles ? linhas[0].ctrl.length : 0);
  const X = [], Y = [], W = [], G = [];
  let gi = 0;
  for (const idx of grupos.values()) {
    if (idx.length < 2) continue;
    let sw = 0; const mx = new Array(K0).fill(0); let my = 0;
    for (const i of idx) { const w = linhas[i].w, c = cols(linhas[i], i); sw += w; for (let k = 0; k < K0; k++) mx[k] += w * c[k]; my += w * (ys ? ys[i] : linhas[i].y); }
    for (let k = 0; k < K0; k++) mx[k] /= sw; my /= sw;
    for (const i of idx) { const c = cols(linhas[i], i); X.push(c.map((v, k) => v - mx[k])); Y.push((ys ? ys[i] : linhas[i].y) - my); W.push(linhas[i].w); G.push(gi); }
    gi++;
  }
  // tira colunas sem variação dentro dos grupos (ou colineares), mantendo as 3 vias
  let ativas = [...Array(K0).keys()];
  for (;;) {
    const K = ativas.length;
    const XtX = ativas.map(() => new Array(K).fill(0)), XtY = new Array(K).fill(0);
    for (let i = 0; i < X.length; i++) { const w = W[i]; for (let a = 0; a < K; a++) { const xa = X[i][ativas[a]] * w; XtY[a] += xa * Y[i]; for (let b = 0; b <= a; b++) XtX[a][b] += xa * X[i][ativas[b]]; } }
    for (let a = 0; a < K; a++) for (let b = a + 1; b < K; b++) XtX[a][b] = XtX[b][a];
    const sol = resolverSimetrico(XtX, XtY);
    if (sol.falha !== undefined) {
      // tira a coluna que é combinação das anteriores (ex.: sem UE2022 no subconjunto, os 3 indicadores de modelo
      // somam 1 dentro de cada local); as vias vêm primeiro e nunca saem
      if (ativas[sol.falha] < 3) return null;
      ativas = ativas.filter((_, a) => a !== sol.falha);
      continue;
    }
    const { beta, inv } = sol;
    const N = X.length, nG = gi;
    const meat = ativas.map(() => new Array(K).fill(0));
    const somaG = new Map();
    for (let i = 0; i < N; i++) {
      let e = Y[i]; for (let a = 0; a < K; a++) e -= X[i][ativas[a]] * beta[a];
      let v = somaG.get(G[i]); if (!v) somaG.set(G[i], (v = new Array(K).fill(0)));
      for (let a = 0; a < K; a++) v[a] += W[i] * X[i][ativas[a]] * e;
    }
    for (const v of somaG.values()) for (let a = 0; a < K; a++) for (let b = 0; b < K; b++) meat[a][b] += v[a] * v[b];
    const esc = (nG / (nG - 1)) * ((N - 1) / (N - K));
    const se = [0, 1, 2].map((a) => { let s = 0; for (let p = 0; p < K; p++) for (let q = 0; q < K; q++) s += inv[a][p] * meat[p][q] * inv[q][a]; return Math.sqrt(esc * s); });
    return { N, grupos: nG, controlesUsados: ativas.filter((c) => c >= 3).map((c) => CONTROLES[c - 3] ?? 'Δcomparecimento'), beta: beta.slice(0, 3), se };
  }
}

/** Injeção: f dos liberados da via (nível) ou do aumento entre turnos (painel) viram votos a mais no candidato. */
function injetar(linhas, desfecho, via, f, cand) {
  const iv = VIAS.indexOf(via);
  const ys = [], xs = [];
  let votos = 0;
  for (const r of linhas) {
    const a = r.a;
    const L = desfecho === 'painel' ? Math.max(0, a.log[via] - r.b.log[via]) : a.log[via];
    const F = f * L;
    votos += F;
    const v13 = a.v13 + (cand === 13 ? F : 0), v22 = a.v22 + (cand === 22 ? F : 0);
    const Yn = v13 / (v13 + v22);
    const xn = VIAS.map((v) => (a.log[v] + (v === via ? F : 0)) / (a.log.votos + F));
    if (desfecho === 'painel') {
      const Yb = r.b.v13 / (r.b.v13 + r.b.v22);
      const xb = VIAS.map((v) => r.b.log[v] / r.b.log.votos);
      ys.push(Yn - Yb); xs.push(xn.map((v, i) => v - xb[i]));
    } else { ys.push(Yn); xs.push(xn); }
  }
  return { ys, xs, baseVotos: votos / f };
}

const unidades = [['Brasil', UFS_BR], ...Object.entries(REGIOES), ...UFS_BR.map((u) => [u.toUpperCase(), [u]]), ['Resto (fora do Nordeste)', UFS_BR.filter((u) => regiaoDe[u] !== 'Nordeste')]];
const testes = [];
const resultadoB = {};
const amostras = { nivel2: montar('nivel2'), painel: montar('painel'), nivel1: montar('nivel1') };
for (const desfecho of ['nivel2', 'painel', 'nivel1']) {
  const todas = amostras[desfecho];
  for (const [unidade, ufs] of unidades) {
    const set = new Set(ufs);
    const linhas = todas.filter((r) => set.has(r.uf));
    const reg = regredir(linhas);
    if (!reg) continue;
    const ybar = linhas.reduce((a, r) => a + r.w * (desfecho === 'painel' ? r.a.v13 / (r.a.v13 + r.a.v22) : r.y), 0) / linhas.reduce((a, r) => a + r.w, 0);
    const porVia = {};
    VIAS.forEach((via, i) => {
      const z = reg.beta[i] / reg.se[i];
      const o = { beta: reg.beta[i], se: reg.se[i], z, p: pBicaudal(z) };
      if (desfecho !== 'nivel1') {
        for (const cand of [13, 22]) {
          const inj = injetar(linhas, desfecho, via, 0.01, cand);
          const r2 = regredir(linhas, { ys: inj.ys, xsOverride: inj.xs });
          const dz = (r2.beta[i] - reg.beta[i]) / reg.se[i];
          const fMDE = Math.abs(dz) > 0 ? (0.01 * (Z_BONF + Z_PODER)) / Math.abs(dz) : Infinity;
          o[`mde${cand}`] = { deslocamentoZporF1pct: dz, fMDE, votosMDE: fMDE * inj.baseVotos, liberadosBase: inj.baseVotos };
        }
      }
      porVia[via] = o;
      if (desfecho !== 'nivel1' && unidade !== 'Resto (fora do Nordeste)') testes.push({ familia: 'principal', desfecho, unidade, via, ...o });
    });
    (resultadoB[desfecho] ??= {})[unidade] = { N: reg.N, locais: reg.grupos, controlesUsados: reg.controlesUsados, parcela13: ybar, vias: porVia };
  }
  if (desfecho !== 'nivel1') {
    const ne = resultadoB[desfecho].Nordeste, resto = resultadoB[desfecho]['Resto (fora do Nordeste)'];
    for (const via of VIAS) {
      const d = ne.vias[via].beta - resto.vias[via].beta, se = Math.hypot(ne.vias[via].se, resto.vias[via].se);
      testes.push({ familia: 'Nordeste − resto', desfecho, unidade: 'Nordeste − resto', via, beta: d, se, z: d / se, p: pBicaudal(d / se) });
    }
  }
}
// correções
const m = testes.length;
const ord = testes.map((t, i) => [t.p, i]).sort((a, b) => a[0] - b[0]);
let kBH = 0;
ord.forEach(([p], r) => { if (p <= (0.05 * (r + 1)) / m) kBH = r + 1; });
const bhSet = new Set(ord.slice(0, kBH).map(([, i]) => i));
testes.forEach((t, i) => { t.bonferroni = t.p <= 0.05 / m; t.bh = bhSet.has(i); });

// sensibilidades (exploratórias): Brasil e Nordeste
const sensib = {};
for (const [nome, opc, ctrl] of [['sem controles', {}, false], ['efeito fixo de zona', { efeito: 'zona' }, true], ['com seções diário ≠ BU', { incluirDivergentes: true }, true]]) {
  for (const desfecho of ['nivel2', 'painel']) {
    const todas = nome === 'sem controles' ? amostras[desfecho] : montar(desfecho, opc);
    for (const [unidade, ufs] of [['Brasil', UFS_BR], ['Nordeste', REGIOES.Nordeste]]) {
      const set = new Set(ufs);
      const reg = regredir(todas.filter((r) => set.has(r.uf)), { usarControles: ctrl });
      ((sensib[nome] ??= {})[desfecho] ??= {})[unidade] = { N: reg.N, locais: reg.grupos, ...Object.fromEntries(VIAS.map((v, i) => [v, { beta: reg.beta[i], se: reg.se[i], z: reg.beta[i] / reg.se[i] }])) };
    }
  }
}

// Exploratório (acrescentado depois do resultado, doc 18): painel com a variação do comparecimento da seção
// ((comparecimento 2º − 1º) / eleitores do perfil) como controle a mais. Pergunta: a associação do ΔV2 com ΔY
// é só o efeito de "quem voltou a votar" (o eleitor a mais do 2º turno entra mais pelo ano de nascimento)?
const exploratorioComparecimento = {};
{
  const porLinha = amostras.painel.map((r) => ({ ...r, ctrl: [...r.ctrl, (r.a.comp - r.b.comp) / perfil.get(r.id).eleitores] }));
  for (const [unidade, ufs] of unidades) {
    if (!['Brasil', 'Nordeste', 'Sudeste', 'Sul', 'Centro-Oeste', 'Norte', 'MG', 'SP', 'RS', 'RJ', 'SC'].includes(unidade)) continue;
    const set = new Set(ufs);
    const reg = regredir(porLinha.filter((r) => set.has(r.uf)));
    exploratorioComparecimento[unidade] = { N: reg.N, controlesUsados: reg.controlesUsados, ...Object.fromEntries(VIAS.map((v, i) => [v, { beta: reg.beta[i], se: reg.se[i], z: reg.beta[i] / reg.se[i] }])) };
  }
}

// ---------- saída ----------
await mkdir(SAIDA, { recursive: true });
const resultado = {
  geradoEm: new Date().toISOString(), zBonferroni: Z_BONF, zPoder80: Z_PODER, testes: m, testesDeclarados: N_TESTES,
  conferencia, margemNacional, cerco, exclusoesCerco: exclA, exclusoesRegressao: exclB,
  amostras: Object.fromEntries(Object.entries(amostras).map(([k, v]) => [k, v.length])),
  regressao: resultadoB, sensibilidade: sensib, exploratorioComparecimento,
  significativosBonferroni: testes.filter((t) => t.bonferroni), significativosBH: testes.filter((t) => t.bh).length,
};
await writeFile(path.join(SAIDA, 'resultado.json'), JSON.stringify(resultado, null, 1));
const csv = (linhas, cols) => [cols.join(';'), ...linhas.map((l) => cols.map((c) => (typeof l[c] === 'number' ? +l[c].toPrecision(6) : l[c])).join(';'))].join('\n') + '\n';
await writeFile(path.join(SAIDA, 'testes.csv'), csv(testes.map((t) => ({ ...t, fMDE13: t.mde13?.fMDE, votosMDE13: t.mde13?.votosMDE, fMDE22: t.mde22?.fMDE, votosMDE22: t.mde22?.votosMDE })), ['familia', 'desfecho', 'unidade', 'via', 'beta', 'se', 'z', 'p', 'bonferroni', 'bh', 'fMDE13', 'votosMDE13', 'fMDE22', 'votosMDE22']));
const linhasCerco = [];
for (const [g, conj] of Object.entries(cerco)) for (const [nome, c] of Object.entries(conj)) linhasCerco.push({ grupo: g, conjunto: nome, ...c });
await writeFile(path.join(SAIDA, 'cerco.csv'), csv(linhasCerco, ['grupo', 'conjunto', 'secoes', 'L', 'min13', 'max13', 'parteMin', 'parteMax', 'reducaoMargem', 'margemPiorCaso']));
await writeFile(path.join(SAIDA, 'conferencia.csv'), csv(linhasConf, ['turno', 'id', 'votosLog', 'compBu', 'v1', 'v2', 'v3m', 'v3s', 'outra', 'buPorBio', 'buSemBio', 'buBiog']));
console.log(JSON.stringify({ ...resultado, regressao: undefined, cerco: { Brasil: cerco.Brasil, Nordeste: cerco.Nordeste } }, null, 1));
