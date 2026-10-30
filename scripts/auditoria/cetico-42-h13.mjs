// Cético revisor, parecer 42 (H13 pelo diário). Reprodução independente de docs/analysis/estatistico-eleitoral/18
// e testes de artefato do sinal V2 do painel. Código próprio (não reaproveita estatistico-h13-log-analise.mjs).
//
// Fonte das vias por seção: --fonte cetico (padrão; leitura própria cetico-42-varredura.mjs) ou --fonte estatistico
// (saída de estatistico-h08-varredura.mjs), para separar diferença de leitura de diferença de modelo.
// Modelo: MQP com efeito fixo de local de votação (UF, município, zona, local), peso = 13 + 22 do 2º turno,
// erro robusto por local (CR1). Indicadores de modelo de urna: referência = UE2022 se houver no subconjunto,
// senão o modelo mais comum; coluna sem variação dentro dos locais sai (regra explícita, não por falha numérica).
//
// Uso: node --max-old-space-size=8000 scripts/auditoria/cetico-42-h13.mjs [--fonte cetico|estatistico]
// Saída: data/parsed/auditoria/cetico-revisor/42/h13-<fonte>.json
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

const { values } = parseArgs({ options: { fonte: { type: 'string', default: 'cetico' } } });
const FONTE = values.fonte;
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '42');
const REG = { Nordeste: 'al ba ce ma pb pe pi rn se', Norte: 'ac am ap pa ro rr to', 'Centro-Oeste': 'df go ms mt', Sudeste: 'es mg rj sp', Sul: 'pr rs sc' };
const regiao = {};
for (const [r, s] of Object.entries(REG)) for (const u of s.split(' ')) regiao[u] = r;
const UFS = Object.keys(regiao);

// ---------- vias por seção ----------
function lerVias(turno) {
  const m = new Map();
  if (FONTE === 'cetico') {
    const dir = path.join(SAIDA, `${turno}t`);
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.jsonl'))) {
      for (const l of readFileSync(path.join(dir, f), 'utf8').split('\n')) {
        if (!l) continue;
        const s = JSON.parse(l);
        if (s.erro) continue;
        const late = (h) => Object.entries(h).reduce((a, [hh, n]) => a + (+hh >= 16 ? n : 0), 0);
        m.set(`${s.uf}/${s.municipio}/${s.zona}/${s.secao}`, { urnas: s.urnas, votos: s.votos, v1: s.vias.v1, v2: s.vias.v2, v3m: s.vias.v3m, v3s: s.vias.v3s, v2tarde: late(s.v2hora), tarde: late(s.hora), v2foto: s.v2foto });
      }
    }
  } else {
    const dir = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h08', `${turno}t`);
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.secoes.jsonl'))) {
      for (const l of readFileSync(path.join(dir, f), 'utf8').split('\n')) {
        if (!l) continue;
        const s = JSON.parse(l);
        m.set(`${s.uf}/${s.municipio}/${s.zona}/${s.secao}`, { votos: s.votos, ...s.vias });
      }
    }
  }
  return m;
}

const { db } = await abrirLeitura();
const S = new Map();
for (const t of [1, 2]) {
  for (const r of db.prepare('SELECT uf, municipio, zona, secao, local, comparecimento c, sem_biometria sb, por_biometria pb, por_biografia pg, modelo_urna mo FROM secao WHERE turno = ?').iterate(t)) {
    const id = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
    const s = S.get(id) ?? { id, uf: r.uf, mun: r.municipio, zona: r.zona };
    s[t] = { local: r.local, c: r.c, sb: r.sb, pb: r.pb, pg: r.pg, mo: r.mo, n13: 0, n22: 0, T: 0, cand: {} };
    S.set(id, s);
  }
  for (const v of db.prepare('SELECT uf, municipio, zona, secao, tipo_voto, numero, quantidade q FROM voto_bu WHERE turno = ? AND cargo = 1').iterate(t)) {
    const s = S.get(`${v.uf}/${v.municipio}/${v.zona}/${v.secao}`)?.[t];
    if (!s) continue;
    s.T += v.q;
    if (v.numero === 13) s.n13 += v.q;
    else if (v.numero === 22) s.n22 += v.q;
    const chave = v.tipo_voto === 'nominal' ? String(v.numero) : 'bn';
    s.cand[chave] = (s.cand[chave] ?? 0) + v.q;
  }
}
db.close();
if (FONTE === 'bu') { for (const s of S.values()) for (const t of [1, 2]) { const a = s[t]; if (a?.c && a.pb !== null) a.log = { votos: a.c, v1: a.pb, v2: a.sb, v3m: a.pg, v3s: 0, v2tarde: 0, tarde: 0, v2foto: 0 }; } }
else for (const t of [1, 2]) for (const [id, v] of lerVias(t)) { const s = S.get(id)?.[t]; if (s) s.log = v; }
const perfil = new Map();
for (const uf of UFS) {
  const ls = readFileSync(path.join(DIR_DADOS, 'parsed', 'auditoria', 'forense', 'perfil', `${uf}.csv`), 'utf8').trim().split('\n');
  const cab = ls[0].split(';');
  for (const l of ls.slice(1)) { const c = l.split(';'); const o = Object.fromEntries(cab.map((k, i) => [k, i < 4 ? c[i] : +c[i]])); perfil.set(`${o.uf}/${o.municipio}/${o.zona}/${o.secao}`, o); }
}
const confere = (s, t) => { const a = s[t]; if (!a?.log) return false; if (a.log.votos !== a.c) return false; if (s.uf !== 'zz' && a.pb !== null && (a.log.v1 !== a.pb || a.log.v2 !== a.sb || a.log.v3m + a.log.v3s !== a.pg)) return false; return true; };

const out = { fonte: FONTE };

// ---------- conferência e totais ----------
{
  const tot = { 1: {}, 2: {} };
  for (const t of [1, 2]) {
    const c = { secoesComComparecimento: 0, semLog: 0, confere: 0, naoConfere: 0, v1: 0, v2: 0, v3m: 0, v3s: 0, votos: 0 };
    for (const s of S.values()) {
      const a = s[t];
      if (!a?.c) continue;
      c.secoesComComparecimento++;
      if (!a.log) { c.semLog++; continue; }
      for (const k of ['v1', 'v2', 'v3m', 'v3s', 'votos']) c[k] += a.log[k];
      if (confere(s, t)) c.confere++; else c.naoConfere++;
    }
    tot[t] = c;
  }
  out.totais = tot;
}

// ---------- cerco aritmético, 2º turno ----------
let margem = 0;
for (const s of S.values()) if (s[2]) margem += s[2].n13 - s[2].n22;
out.margemNacional = margem;
const CONJ = { V2: ['v2'], V3m: ['v3m'], V3s: ['v3s'], V3: ['v3m', 'v3s'], 'V2+V3': ['v2', 'v3m', 'v3s'] };
const cerco = {};
for (const s of S.values()) {
  const a = s[2];
  if (!a?.c || !a.log || !a.T) continue;
  const grupos = s.uf === 'zz' ? ['Exterior'] : ['Brasil', regiao[s.uf]];
  for (const [nome, vias] of Object.entries(CONJ)) {
    const L = Math.min(a.T, vias.reduce((x, v) => x + a.log[v], 0));
    // pior caso para o 13: os L liberados votaram o máximo possível no 13; o que sobra vai primeiro a branco/nulo/outros,
    // e só então ao 22. Anular esses L votos tira (no 13) − (no 22) da margem.
    const no13 = Math.min(L, a.n13);
    const outros = a.T - a.n13 - a.n22;
    const no22 = Math.max(0, L - no13 - outros);
    const min13 = Math.max(0, L - (a.T - a.n13));
    for (const g of grupos) {
      const c = ((cerco[g] ??= {})[nome] ??= { L: 0, max13: 0, min13: 0, perda: 0 });
      c.L += L; c.max13 += no13; c.min13 += min13; c.perda += no13 - no22;
    }
  }
}
for (const g of Object.values(cerco)) for (const c of Object.values(g)) { c.parteMin = c.min13 / c.L; c.parteMax = c.max13 / c.L; c.margemPiorCaso = margem - c.perda; }
out.cerco = cerco;

// ---------- regressão com efeito fixo ----------
const MODELOS = ['ue2013', 'ue2015', 'ue2020', 'ue2022'];
function solve(A, b) { // Gauss-Jordan com pivô; devolve inversa e solução
  const n = A.length, tol = 1e-10 * Math.max(...A.map((r, i) => Math.abs(r[i]))), M = A.map((r, i) => [...r, ...A.map((_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const d = M[c][c];
    if (Math.abs(d) < tol) throw new Error('singular');
    for (let j = 0; j < 2 * n; j++) M[c][j] /= d;
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; if (f) for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[c][j]; }
  }
  const inv = M.map((r) => r.slice(n));
  return { inv, beta: inv.map((r) => r.reduce((a, v, j) => a + v * b[j], 0)) };
}
/** linhas: {g, w, y, x:[...]} ; nomes: nomes das colunas de x. Devolve β, se, z por coluna e a matriz parcializada. */
function feWls(linhas, nomes, { manter = 3 } = {}) {
  const grupos = new Map();
  for (const r of linhas) { const a = grupos.get(r.g); if (a) a.push(r); else grupos.set(r.g, [r]); }
  const K0 = nomes.length;
  const X = [], Y = [], W = [], G = [], ref = [];
  let ng = 0;
  for (const rs of grupos.values()) {
    if (rs.length < 2) continue;
    let sw = 0, my = 0; const mx = new Array(K0).fill(0);
    for (const r of rs) { sw += r.w; my += r.w * r.y; for (let k = 0; k < K0; k++) mx[k] += r.w * r.x[k]; }
    for (const r of rs) { X.push(r.x.map((v, k) => v - mx[k] / sw)); Y.push(r.y - my / sw); W.push(r.w); G.push(ng); ref.push(r); }
    ng++;
  }
  // padroniza cada coluna (desvio ponderado dentro dos locais = 1) e tira a que não varia dentro dos locais
  let sw = 0; for (const w of W) sw += w;
  const sc = [...Array(K0).keys()].map((k) => { let v = 0; for (let i = 0; i < X.length; i++) v += W[i] * X[i][k] ** 2; return Math.sqrt(v / sw); });
  let cols = [...Array(K0).keys()].filter((k) => sc[k] > 1e-7);
  for (const x of X) for (const k of cols) x[k] /= sc[k];
  // escolha das colunas por Cholesky incremental, na ordem (vias, perfil, urna, extras): sai a coluna cuja variação
  // dentro dos locais é explicada em mais de 1 − 1e-9 pelas anteriores (colinearidade exata ou numérica)
  {
    const K1 = cols.length, F = cols.map(() => new Array(K1).fill(0));
    for (let i = 0; i < X.length; i++) for (let p = 0; p < K1; p++) { const xp = W[i] * X[i][cols[p]]; for (let q = 0; q <= p; q++) F[p][q] += xp * X[i][cols[q]]; }
    const kept = [], L = [];
    for (let p = 0; p < K1; p++) {
      const l = [];
      for (let j = 0; j < kept.length; j++) { let v = F[p][kept[j]]; for (let t = 0; t < j; t++) v -= l[t] * L[j][t]; l.push(v / L[j][j]); }
      let d = F[p][p]; for (const v of l) d -= v * v;
      if (d > 1e-9 * F[p][p]) { kept.push(p); L.push([...l, Math.sqrt(d)]); }
      else { if (cols[p] < manter) throw new Error('via colinear: ' + nomes[cols[p]]); (out.avisos ??= []).push(nomes[cols[p]]); }
    }
    cols = kept.map((p) => cols[p]);
  }
  for (;;) {
    const K = cols.length;
    const A = cols.map(() => new Array(K).fill(0)), b = new Array(K).fill(0);
    for (let i = 0; i < X.length; i++) for (let p = 0; p < K; p++) { const xp = W[i] * X[i][cols[p]]; b[p] += xp * Y[i]; for (let q = 0; q <= p; q++) A[p][q] += xp * X[i][cols[q]]; }
    for (let p = 0; p < K; p++) for (let q = p + 1; q < K; q++) A[p][q] = A[q][p];
    let sol;
    try { sol = solve(A, b); } catch { const c = cols.findLast((k) => k >= manter); if (c === undefined) throw new Error('vias colineares'); cols = cols.filter((k) => k !== c); (out.avisos ??= []).push(nomes[c]); continue; }
    const { inv, beta } = sol;
    const sg = new Map();
    const resid = new Array(X.length);
    for (let i = 0; i < X.length; i++) {
      let e = Y[i]; for (let p = 0; p < K; p++) e -= X[i][cols[p]] * beta[p];
      resid[i] = e;
      let v = sg.get(G[i]); if (!v) sg.set(G[i], (v = new Array(K).fill(0)));
      for (let p = 0; p < K; p++) v[p] += W[i] * X[i][cols[p]] * e;
    }
    const meat = cols.map(() => new Array(K).fill(0));
    for (const v of sg.values()) for (let p = 0; p < K; p++) for (let q = 0; q < K; q++) meat[p][q] += v[p] * v[q];
    const N = X.length, esc = (ng / (ng - 1)) * ((N - 1) / (N - K));
    const res = {};
    cols.forEach((c, p) => { let s = 0; for (let a = 0; a < K; a++) for (let bb = 0; bb < K; bb++) s += inv[p][a] * meat[a][bb] * inv[bb][p]; const se = Math.sqrt(esc * s); res[nomes[c]] = { beta: beta[p] / sc[c], se: se / sc[c], z: beta[p] / se }; });
    return { N, locais: ng, colunas: cols.map((c) => nomes[c]), res, _X: X, _Y: Y, _W: W, _ref: ref, _cols: cols, _beta: beta, _resid: resid, _sc: sc };
  }
}

function linhasDe(desfecho, ufs, { extra = null, efeito = 'local', exposicao = 'parcela', filtro = null } = {}) {
  const set = new Set(ufs);
  // modelos presentes no subconjunto → referência
  const cont = {};
  const base = [];
  const excl = {};
  const x = (m) => (excl[m] = (excl[m] ?? 0) + 1);
  for (const s of S.values()) {
    if (!set.has(s.uf)) continue;
    const a = s[2], b = s[1];
    if (!a?.c) continue;
    const usa = desfecho === 'nivel1' ? [b] : desfecho === 'nivel2' ? [a] : [a, b];
    if (usa.some((t) => !t?.c)) { x('sem o outro turno'); continue; }
    if (!confere(s, 2) && desfecho !== 'nivel1') { x('diário ≠ BU (2º)'); continue; }
    if (desfecho !== 'nivel2' && !confere(s, 1)) { x('diário ≠ BU (1º)'); continue; }
    if (usa.some((t) => t.n13 + t.n22 < 20)) { x('< 20 votos 13+22'); continue; }
    const p = perfil.get(s.id);
    if (!p || !p.eleitores) { x('sem perfil'); continue; }
    if (filtro && !filtro(s, p)) { x('filtro'); continue; }
    const mo = (desfecho === 'nivel1' ? b : a).mo ?? 'ue2022';
    cont[mo] = (cont[mo] ?? 0) + 1;
    base.push({ s, p, mo });
  }
  const refMo = cont.ue2022 ? 'ue2022' : Object.entries(cont).sort((p, q) => q[1] - p[1])[0][0];
  const dums = MODELOS.filter((m) => m !== refMo && cont[m]);
  const vias = ['v2', 'v3m', 'v3s'];
  const nomes = [...vias.map((v) => `x_${v}`), 'semBioCad', 'p60', 'p16a24', 'escBaixa', 'superior', 'logEleitores', ...dums.map((d) => `urna_${d}`), ...(extra ? extra.nomes : [])];
  const Yf = (t) => t.n13 / (t.n13 + t.n22);
  const linhas = base.map(({ s, p, mo }) => {
    const a = s[2], b = s[1];
    const xs = (t) => vias.map((v) => (exposicao === 'parcela' ? t.log[v] / t.log.votos : t.log[v] / p.eleitores));
    let y, xv, w;
    if (desfecho === 'painel') { const xa = xs(a), xb = xs(b); y = Yf(a) - Yf(b); xv = xa.map((v, i) => v - xb[i]); w = a.n13 + a.n22; }
    else { const t = desfecho === 'nivel1' ? b : a; y = Yf(t); xv = xs(t); w = t.n13 + t.n22; }
    const ctrl = [1 - p.biometria / p.eleitores, p.idade60 / p.eleitores, p.idade16a24 / p.eleitores, p.escol_baixa / p.eleitores, p.superior / p.eleitores, Math.log(p.eleitores), ...dums.map((d) => (mo === d ? 1 : 0))];
    const g = efeito === 'local' ? `${s.uf}/${s.mun}/${s.zona}/${a.local}` : efeito === 'zona' ? `${s.uf}/${s.mun}/${s.zona}` : `${s.uf}/${s.mun}/${s.zona}/${a.local}`;
    return { g, w, y, x: [...xv, ...ctrl, ...(extra ? extra.f(s, p) : [])], s, p };
  });
  return { linhas, nomes, refMo, excl };
}
const r2 = (v) => +v.toFixed(2);
const resumo = (reg, cols = ['x_v2', 'x_v3m', 'x_v3s']) => Object.fromEntries([['N', reg.N], ['locais', reg.locais], ...cols.filter((c) => reg.res[c]).map((c) => [c, `${r2(100 * reg.res[c].beta)} (z ${r2(reg.res[c].z)})`])]);
const UNID = [['Brasil', UFS], ...Object.entries(REG).map(([r, s]) => [r, s.split(' ')]), ...UFS.map((u) => [u.toUpperCase(), [u]]), ['Resto', UFS.filter((u) => regiao[u] !== 'Nordeste')]];

// 1) reprodução dos testes do plano (nível 2º, painel, nível 1º), todas as unidades
const repro = {};
const testes = [];
for (const desf of ['nivel2', 'painel', 'nivel1']) {
  for (const [nome, ufs] of UNID) {
    const { linhas, nomes, refMo } = linhasDe(desf, ufs);
    const reg = feWls(linhas, nomes);
    (repro[desf] ??= {})[nome] = { ...resumo(reg), refMo, colunas: reg.colunas.length };
    if (desf !== 'nivel1' && nome !== 'Resto') for (const v of ['x_v2', 'x_v3m', 'x_v3s']) testes.push({ desf, nome, v, ...reg.res[v] });
    if (desf !== 'nivel1' && nome === 'Resto') repro[desf]._resto = reg.res;
    if (desf !== 'nivel1' && nome === 'Nordeste') repro[desf]._ne = reg.res;
  }
  if (desf !== 'nivel1') for (const v of ['x_v2', 'x_v3m', 'x_v3s']) { const a = repro[desf]._ne[v], b = repro[desf]._resto[v]; if (!a || !b) continue; const d = a.beta - b.beta, se = Math.hypot(a.se, b.se); testes.push({ desf, nome: 'Nordeste − resto', v, beta: d, se, z: d / se }); }
  delete repro[desf]._ne; delete repro[desf]._resto;
}
out.reproducao = repro;
out.testes = { total: testes.length, bonferroni367: testes.filter((t) => Math.abs(t.z) >= 3.67).map((t) => `${t.desf} ${t.nome} ${t.v}: ${r2(100 * t.beta)} (z ${r2(t.z)})`) };
console.log(JSON.stringify({ totais: out.totais, margem, cercoBrasil: cerco.Brasil, cercoNE: cerco.Nordeste, testes: out.testes }, null, 1));

// 2) sinal V2 do painel: artefato?
const art = {};
const unidSinal = [['Brasil', UFS], ['Sudeste', REG.Sudeste.split(' ')], ['Sul', REG.Sul.split(' ')], ['MG', ['mg']], ['SP', ['sp']], ['RS', ['rs']], ['Nordeste', REG.Nordeste.split(' ')]];
const comp = (s, p) => [(s[2].c - s[1].c) / p.eleitores];
const terceiros = (s) => { const t = s[1]; return ['70', '14', '55', '30', 'bn'].map((k) => (t.cand[k] ?? 0) / t.T); };
const variantes = {
  plano: {},
  'Δcomparecimento': { extra: { nomes: ['dComp'], f: comp } },
  'Δcomparecimento + votos do 1º turno em 70, 14, 55, 30, branco/nulo': { extra: { nomes: ['dComp', 'c70', 'c14', 'c55', 'c30', 'cBN'], f: (s, p) => [...comp(s, p), ...terceiros(s)] } },
  '+ Y do 1º turno e x_V2 do 1º turno': { extra: { nomes: ['dComp', 'c70', 'c14', 'c55', 'c30', 'cBN', 'Y1', 'xv2_1'], f: (s, p) => [...comp(s, p), ...terceiros(s), s[1].n13 / (s[1].n13 + s[1].n22), s[1].log.v2 / s[1].log.votos] } },
  'efeito fixo de zona': { efeito: 'zona' },
  'sem seções com V2 acima do cadastro sem biometria (em algum turno)': { filtro: (s, p) => s[1].log.v2 <= p.eleitores - p.biometria && s[2].log.v2 <= p.eleitores - p.biometria },
  'só seções sem troca de urna (1 urna no diário nos dois turnos)': { filtro: (s) => (s[1].log.urnas ?? 1) === 1 && (s[2].log.urnas ?? 1) === 1 },
};
for (const [vn, opc] of Object.entries(variantes)) {
  for (const [nome, ufs] of unidSinal) {
    const { linhas, nomes } = linhasDe('painel', ufs, opc);
    const reg = feWls(linhas, nomes);
    (art[vn] ??= {})[nome] = resumo(reg);
  }
}
// decomposição: variação por via em proporção aos eleitores do perfil (v1 incluída), com Δcomparecimento implícito
{
  const dec = {};
  for (const [nome, ufs] of unidSinal) {
    const { linhas, nomes } = linhasDe('painel', ufs, { exposicao: 'eleitores', extra: { nomes: ['dV1_eleit'], f: (s, p) => [(s[2].log.v1 - s[1].log.v1) / p.eleitores] } });
    const reg = feWls(linhas, nomes);
    dec[nome] = resumo(reg, ['x_v2', 'x_v3m', 'x_v3s', 'dV1_eleit']);
  }
  art['decomposição: Δ(votos da via)/eleitores, com V1'] = dec;
  // mesma decomposição com Δcomparecimento/eleitores no lugar de ΔV1: o coeficiente de cada via vira (via − V1), com erro próprio
  const dif = {};
  for (const [nome, ufs] of unidSinal) {
    const { linhas, nomes } = linhasDe('painel', ufs, { exposicao: 'eleitores', extra: { nomes: ['dComp_eleit'], f: (s, p) => [(s[2].log.votos - s[1].log.votos) / p.eleitores] } });
    dif[nome] = resumo(feWls(linhas, nomes), ['x_v2', 'x_v3m', 'x_v3s', 'dComp_eleit']);
  }
  art['decomposição: via − V1 (com Δcomparecimento/eleitores)'] = dif;
}
// interação com idade
{
  const it = {};
  for (const [nome, ufs] of unidSinal.slice(0, 3)) {
    const { linhas, nomes } = linhasDe('painel', ufs, { extra: { nomes: ['dV2xJovem', 'dV2x60'], f: () => [0, 0] } });
    for (const r of linhas) { const dv2 = r.x[0]; r.x[r.x.length - 2] = dv2 * (r.p.idade16a24 / r.p.eleitores - 0.15); r.x[r.x.length - 1] = dv2 * (r.p.idade60 / r.p.eleitores - 0.25); }
    const reg = feWls(linhas, nomes);
    it[nome] = resumo(reg, ['x_v2', 'dV2xJovem', 'dV2x60']);
  }
  art['interação ΔV2 × idade (centrada em 15% jovens e 25% 60+)'] = it;
}
out.sinalV2 = art;
console.log(JSON.stringify(art, null, 1));

// 3) concentração: contribuição de cada seção ao β de V2 (Frisch-Waugh no modelo do plano), Brasil
{
  const { linhas, nomes } = linhasDe('painel', UFS);
  const reg = feWls(linhas, nomes);
  // resíduo de x_v2 sobre as outras colunas (já sem efeito fixo)
  const outras = reg._cols.filter((c) => c !== 0);
  const K = outras.length;
  const A = outras.map(() => new Array(K).fill(0)), b = new Array(K).fill(0);
  for (let i = 0; i < reg._X.length; i++) for (let p = 0; p < K; p++) { const xp = reg._W[i] * reg._X[i][outras[p]]; b[p] += xp * reg._X[i][0]; for (let q = 0; q < K; q++) A[p][q] += xp * reg._X[i][outras[q]]; }
  const g = solve(A, b).beta;
  let sxx = 0, sxy = 0;
  const contrib = reg._X.map((x, i) => { let e = x[0]; for (let p = 0; p < K; p++) e -= x[outras[p]] * g[p]; sxx += reg._W[i] * e * e; sxy += reg._W[i] * e * reg._Y[i]; return { i, num: reg._W[i] * e * reg._Y[i], ex: e }; });
  const beta = sxy / sxx / reg._sc[0];
  const por = (chave) => { const m = new Map(); contrib.forEach((c) => { const k = chave(reg._ref[c.i].s); m.set(k, (m.get(k) ?? 0) + c.num / sxx / reg._sc[0]); }); return [...m.entries()].sort((a, b2) => b2[1] - a[1]); };
  const zonas = por((s) => `${s.uf}/${s.mun}/${s.zona}`), muns = por((s) => `${s.uf}/${s.mun}`), ufs = por((s) => s.uf);
  const secs = contrib.map((c) => c.num / sxx / reg._sc[0]).sort((a, b2) => b2 - a);
  const somaTop = (arr, n) => arr.slice(0, n).reduce((a, v) => a + (Array.isArray(v) ? v[1] : v), 0);
  out.concentracao = {
    betaFWL: 100 * beta, N: contrib.length,
    fracaoDoBeta: { top100secoes: somaTop(secs, 100) / beta, top1pctSecoes: somaTop(secs, Math.round(secs.length / 100)) / beta, top10zonas: somaTop(zonas, 10) / beta, top50zonas: somaTop(zonas, 50) / beta, top10municipios: somaTop(muns, 10) / beta },
    secoesComContribuicaoPositiva: secs.filter((v) => v > 0).length,
    topMunicipios: muns.slice(0, 10).map(([k, v]) => [k, +(100 * v).toFixed(3)]), topZonas: zonas.slice(0, 10).map(([k, v]) => [k, +(100 * v).toFixed(3)]), porUF: ufs.map(([k, v]) => [k, +(100 * v).toFixed(3)]),
  };
  // refaz sem os 10 municípios e sem as 50 zonas de maior contribuição
  const semMun = new Set(muns.slice(0, 10).map(([k]) => k)), semZon = new Set(zonas.slice(0, 50).map(([k]) => k));
  for (const [rot, filtro] of [['sem os 10 municípios do topo', (r) => !semMun.has(`${r.s.uf}/${r.s.mun}`)], ['sem as 50 zonas do topo', (r) => !semZon.has(`${r.s.uf}/${r.s.mun}/${r.s.zona}`)], ['sem capitais (municípios com > 2.000 seções)', null]]) {
    let ls = linhas;
    if (filtro) ls = linhas.filter(filtro);
    else { const n = new Map(); for (const r of linhas) n.set(`${r.s.uf}/${r.s.mun}`, (n.get(`${r.s.uf}/${r.s.mun}`) ?? 0) + 1); ls = linhas.filter((r) => n.get(`${r.s.uf}/${r.s.mun}`) <= 2000); }
    out.concentracao[rot] = resumo(feWls(ls, nomes));
  }
  // horário e foto dos V2 (só leitura própria): seções de maior contribuição × resto
  if (FONTE === 'cetico') {
    const ordem = contrib.map((c) => ({ ...c, v: c.num / sxx / reg._sc[0] })).sort((a, b2) => b2.v - a.v);
    const grupo = (arr) => { const o = { secoes: arr.length, v2_1: 0, v2_2: 0, v2tarde1: 0, v2tarde2: 0, tarde1: 0, tarde2: 0, votos1: 0, votos2: 0, foto1: 0, foto2: 0 }; for (const c of arr) { const s = reg._ref[c.i].s; o.v2_1 += s[1].log.v2; o.v2_2 += s[2].log.v2; o.v2tarde1 += s[1].log.v2tarde; o.v2tarde2 += s[2].log.v2tarde; o.tarde1 += s[1].log.tarde; o.tarde2 += s[2].log.tarde; o.votos1 += s[1].log.votos; o.votos2 += s[2].log.votos; o.foto1 += s[1].log.v2foto; o.foto2 += s[2].log.v2foto; } o.fracV2tarde1 = o.v2tarde1 / o.v2_1; o.fracV2tarde2 = o.v2tarde2 / o.v2_2; o.fracTodosTarde1 = o.tarde1 / o.votos1; o.fracTodosTarde2 = o.tarde2 / o.votos2; o.fotoV2_1 = o.foto1 / o.v2_1; o.fotoV2_2 = o.foto2 / o.v2_2; return o; };
    const n1 = Math.round(ordem.length / 100);
    out.horario = { top1pct: grupo(ordem.slice(0, n1)), resto: grupo(ordem.slice(n1)), todas: grupo(ordem) };
    // painel com Δ(fração de V2 votados a partir das 16 h) como variável de desfecho alternativa: o ΔV2 está mais no fim do dia?
  }
}
// 4) V2 é fixo por eleitor? V2 do diário × eleitores sem biometria no perfil (cadastro)
{
  const r = { 1: { secoes: 0, v2AcimaDoCadastroSemBio: 0, excessoTotal: 0 }, 2: { secoes: 0, v2AcimaDoCadastroSemBio: 0, excessoTotal: 0 } };
  for (const s of S.values()) { if (s.uf === 'zz') continue; const p = perfil.get(s.id); if (!p) continue; for (const t of [1, 2]) { const a = s[t]; if (!a?.log) continue; r[t].secoes++; const sem = p.eleitores - p.biometria; if (a.log.v2 > sem) { r[t].v2AcimaDoCadastroSemBio++; r[t].excessoTotal += a.log.v2 - sem; } } }
  out.v2xCadastro = r;
}
mkdirSync(SAIDA, { recursive: true });
writeFileSync(path.join(SAIDA, `h13-${FONTE}.json`), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ concentracao: out.concentracao, horario: out.horario, v2xCadastro: out.v2xCadastro, avisos: out.avisos }, null, 1));
