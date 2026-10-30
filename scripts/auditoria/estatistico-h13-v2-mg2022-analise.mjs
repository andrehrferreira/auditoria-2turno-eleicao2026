// Estatístico eleitoral, H13 sinal V2, adendo 5 de 30/10/2026 ao plano 16 (resultado no doc 24): teste direto em MG com
// os diários de urna de 2022. Mesmo modelo do doc 22 nos dois anos:
//   ΔY ~ e_V2 + e_V3m + e_V3s + Δc + sem biometria do cadastro, 60+, 16–24, escolaridade baixa, superior, log do eleitorado,
//        um indicador por modelo de urna presente (base: o mais recente);
//   e_v = Δ(votos da via) ÷ eleitores do perfil do mesmo ano; Δc = Δ(votos do diário) ÷ eleitores;
//   efeito fixo de local de votação (2º turno); peso 13 + 22 do 2º turno; CR1 por local.
// T1: e_V2 em 2022; T2: 2026 − 2022 (erros independentes). 2 testes, Bonferroni |z| ≥ 2,24.
// Uso: node --max-old-space-size=8000 scripts/auditoria/estatistico-h13-v2-mg2022-analise.mjs
// Entradas: banco (cópia de leitura), estatistico/h08 e h08-uniao (2026), forense/perfil/mg.csv (2026),
//           h13-v2/secoes-2022.csv (votos, comparecimento, local, modelo e perfil de 2022), h13-v2/secoes-mg-2022-diario.csv
// Saída: data/parsed/auditoria/estatistico/h13-v2/resultado-mg-2022-diario.json
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { lerTabela } from './forense-lib.mjs';

const EST = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico');
const SAIDA = path.join(EST, 'h13-v2');
const Z_B = 2.2414; // Φ⁻¹(1 − 0,05 / 4): 2 testes bicaudais
const pBi = (z) => { const x = Math.abs(z) / Math.SQRT2, t = 1 / (1 + 0.5 * x); return t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))))); };
const MODELOS = ['ue2009', 'ue2010', 'ue2011', 'ue2013', 'ue2015', 'ue2020', 'ue2022'];

// ---------- 2026 ----------
const secoes = new Map();
const { db } = await abrirLeitura();
for (const turno of [1, 2]) {
  for (const r of db.prepare("SELECT uf, municipio, zona, secao, local, comparecimento, modelo_urna FROM secao WHERE turno = ? AND uf = 'mg'").iterate(turno)) {
    const id = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
    const s = secoes.get(id) ?? { id, uf: r.uf, municipio: r.municipio, zona: r.zona };
    s[`t${turno}`] = { local: r.local, comp: r.comparecimento, modelo: (r.modelo_urna ?? '').toLowerCase(), v13: 0, v22: 0 };
    secoes.set(id, s);
  }
  for (const v of db.prepare("SELECT uf, municipio, zona, secao, numero, quantidade FROM voto_bu WHERE turno = ? AND uf = 'mg' AND cargo = 1 AND numero IN (13, 22)").iterate(turno)) {
    const t = secoes.get(`${v.uf}/${v.municipio}/${v.zona}/${v.secao}`)?.[`t${turno}`];
    if (t) t[v.numero === 13 ? 'v13' : 'v22'] += v.quantidade;
  }
}
db.close();
for (const turno of [1, 2]) {
  for (const dir of [path.join(EST, 'h08', `${turno}t`), path.join(EST, 'h08-uniao', `${turno}t`)]) { // a releitura com união vem depois e sobrescreve
    for (const f of (await readdir(dir)).filter((x) => x.endsWith('.secoes.jsonl') && (x.startsWith('mg-') || x === 'selecao.secoes.jsonl')).sort()) {
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
for (const p of await lerTabela(path.join(DIR_DADOS, 'parsed', 'auditoria', 'forense', 'perfil', 'mg.csv'), ['eleitores', 'biometria', 'idade60', 'idade16a24', 'escol_baixa', 'superior'])) perfil26.set(`${p.uf}/${p.municipio}/${p.zona}/${p.secao}`, p);

// ---------- 2022 ----------
const s22 = new Map();
for (const o of await lerTabela(path.join(SAIDA, 'secoes-2022.csv'), ['v13_1', 'v22_1', 'v13_2', 'v22_2', 'aptos_1', 'comp_1', 'aptos_2', 'comp_2', 'eleitores', 'biometria', 'idade60', 'idade16a24', 'escol_baixa', 'superior'])) if (o.id.startsWith('mg/')) s22.set(o.id, o);
const NUM = ['votos', 'v1', 'v2', 'v3m', 'v3s', 'outra', 'erro'].flatMap((c) => [`${c}_1`, `${c}_2`]);
const d22 = new Map();
for (const o of await lerTabela(path.join(SAIDA, 'secoes-mg-2022-diario.csv'), NUM)) d22.set(o.id, o);

// ---------- linhas do painel ----------
const ex = { 2026: {}, 2022: {} };
const exc = (ano, m) => { ex[ano][m] = (ex[ano][m] ?? 0) + 1; };
const conf = { 2026: {}, 2022: {} }; // diário × BU, por turno, antes dos outros filtros
const confere = (ano, turno, comp, votos) => {
  const c = (conf[ano][turno] ??= { secoesComComparecimento: 0, semDiario: 0, iguais: 0, diferentes: 0, votosBu: 0, votosDiario: 0, votosBuSemLinha: 0 });
  if (!comp) return;
  c.secoesComComparecimento++;
  c.votosBu += comp;
  if (votos == null) { c.semDiario++; c.votosBuSemLinha += comp; return; }
  c.votosDiario += votos;
  if (votos === comp) c.iguais++; else { c.diferentes++; c.votosBuSemLinha += Math.max(0, comp - votos); }
};
const ctrlDe = (p, modelo, base) => [1 - p.biometria / p.eleitores, p.idade60 / p.eleitores, p.idade16a24 / p.eleitores, p.escol_baixa / p.eleitores, p.superior / p.eleitores, Math.log(p.eleitores), ...MODELOS.filter((m) => m !== base).map((m) => (modelo === m ? 1 : 0))];
const vias = { 2026: { 1: {}, 2: {} }, 2022: { 1: {}, 2: {} } };
const somaVias = (ano, turno, x) => { const o = vias[ano][turno]; for (const k of ['votos', 'v1', 'v2', 'v3m', 'v3s', 'outra']) o[k] = (o[k] ?? 0) + x[k]; };
function linha(ano, id, a, b, la, lb, p, g, modeloBase) {
  if (!a?.comp || !b?.comp) return exc(ano, 'sem a seção nos dois turnos');
  if (!la || !lb) return exc(ano, 'sem diário');
  if (la.votos !== a.comp || lb.votos !== b.comp) return exc(ano, 'diário diferente do BU');
  if (a.v13 + a.v22 < 20 || b.v13 + b.v22 < 20) return exc(ano, 'menos de 20 votos em 13 + 22');
  if (!p || !p.eleitores) return exc(ano, 'sem perfil');
  const el = p.eleitores;
  const Y = (t) => t.v13 / (t.v13 + t.v22);
  somaVias(ano, 1, lb); somaVias(ano, 2, la);
  return { id, g, w: a.v13 + a.v22, y: Y(a) - Y(b), Y1: Y(b), xV2_1: lb.v2 / lb.votos,
    eV2: (la.v2 - lb.v2) / el, eV3m: (la.v3m - lb.v3m) / el, eV3s: (la.v3s - lb.v3s) / el, dC: (la.votos - lb.votos) / el, modelo: a.modelo, p, ctrl: null, base: modeloBase };
}
const L = { 2026: [], 2022: [] };
for (const s of secoes.values()) {
  const a = s.t2, b = s.t1;
  confere(2026, 1, b?.comp, b?.log?.votos); confere(2026, 2, a?.comp, a?.log?.votos);
  const r = linha(2026, s.id, a, b, a?.log, b?.log, perfil26.get(s.id), a ? `${s.id.split('/').slice(0, 3).join('/')}/${a.local}` : null);
  if (r) L[2026].push(r);
}
for (const [id, o] of s22) {
  const d = d22.get(id);
  const lv = (t) => (d && d[`votos_${t}`] !== null && !d[`erro_${t}`] ? { votos: d[`votos_${t}`], v1: d[`v1_${t}`], v2: d[`v2_${t}`], v3m: d[`v3m_${t}`], v3s: d[`v3s_${t}`], outra: d[`outra_${t}`] } : null);
  for (const c of ['v13_1', 'v22_1', 'v13_2', 'v22_2']) o[c] ??= 0;
  const a = o.comp_2 ? { comp: o.comp_2, v13: o.v13_2, v22: o.v22_2 } : null, b = o.comp_1 ? { comp: o.comp_1, v13: o.v13_1, v22: o.v22_1 } : null;
  confere(2022, 1, o.comp_1, lv(1)?.votos); confere(2022, 2, o.comp_2, lv(2)?.votos);
  const r = linha(2022, id, a, b, lv(2), lv(1), o, `${id.split('/').slice(0, 3).join('/')}/${o.local_2}`);
  if (r) { r.modelo = (o.modelo_2 ?? '').toLowerCase(); L[2022].push(r); }
}
// diário de 2022 lido em seções que não estão no detalhe (nem conferidas acima)
const so22 = [...d22.keys()].filter((k) => !s22.has(k)).length;
// base do modelo de urna: o mais recente presente em cada ano
const modelosPresentes = {};
for (const ano of [2026, 2022]) {
  const cont = {};
  for (const r of L[ano]) cont[r.modelo] = (cont[r.modelo] ?? 0) + 1;
  modelosPresentes[ano] = cont;
  const base = MODELOS.filter((m) => cont[m]).at(-1);
  for (const r of L[ano]) r.ctrl = ctrlDe(r.p, r.modelo, base);
  L[ano].base = base;
}

// ---------- regressão com efeito fixo (demeaning ponderado), CR1 por grupo (a mesma de estatistico-h13-v2-analise2.mjs) ----------
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
function regredir(rows, nomes, nFoc) {
  const grupos = new Map();
  rows.forEach((r, i) => { const g = grupos.get(r.g); if (g) g.push(i); else grupos.set(r.g, [i]); });
  const K0 = nomes.length;
  const X = [], Y = [], W = [], G = [];
  let gi = 0;
  for (const ii of grupos.values()) {
    if (ii.length < 2) continue;
    let sw = 0; const mx = new Array(K0).fill(0); let my = 0;
    for (const i of ii) { const r = rows[i]; sw += r.w; for (let k = 0; k < K0; k++) mx[k] += r.w * r.cols[k]; my += r.w * r.y; }
    for (let k = 0; k < K0; k++) mx[k] /= sw; my /= sw;
    for (const i of ii) { const r = rows[i]; X.push(r.cols.map((v, k) => v - mx[k])); Y.push(r.y - my); W.push(r.w); G.push(gi); }
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
    // desvio-padrão ponderado, dentro do local, de cada regressor focal (para ler o tamanho da variação)
    const dp = ativas.slice(0, nFoc).map((c) => { let s = 0, sw = 0; for (let i = 0; i < X.length; i++) { s += W[i] * X[i][c] ** 2; sw += W[i]; } return Math.sqrt(s / sw); });
    return { N, grupos: gi, nomes: ativas.map((c) => nomes[c]), beta, cov, dp };
  }
}
const coef = (r, nome) => { const p = r.nomes.indexOf(nome); return p < 0 ? null : { beta: r.beta[p] * 100, se: Math.sqrt(r.cov[p][p]) * 100, z: r.beta[p] / Math.sqrt(r.cov[p][p]) }; };
const CTRLN = (base) => ['cadSemBio', 'p60', 'p16a24', 'pBaixa', 'pSup', 'logEle', ...MODELOS.filter((m) => m !== base)];
const FOC = ['eV2', 'eV3m', 'eV3s', 'dC'];
const modelo = (rs, extra = []) => {
  const nomes = [...FOC, ...extra.map((e) => e.nome), ...CTRLN(rs.base)];
  const reg = regredir(rs.map((r) => ({ w: r.w, g: r.g, y: r.y, cols: [r.eV2, r.eV3m, r.eV3s, r.dC, ...extra.map((e) => e.f(r)), ...r.ctrl] })), nomes, FOC.length);
  return { N: reg.N, locais: reg.grupos, dpDentroDoLocal: Object.fromEntries(FOC.map((n, i) => [n, reg.dp[i]])), ...Object.fromEntries([...FOC, ...extra.map((e) => e.nome)].map((n) => [n, coef(reg, n)])) };
};

const res = { geradoEm: new Date().toISOString(), unidade: 'MG', exclusoes: ex, diarioXbu: conf, diario2022ForaDoDetalhe: so22, modelosDeUrna: modelosPresentes, base: { 2026: L[2026].base, 2022: L[2022].base }, secoes: { 2026: L[2026].length, 2022: L[2022].length }, vias, ano: {}, testes: [] };
for (const ano of [2026, 2022]) {
  const rs = L[ano];
  const sw = rs.reduce((a, r) => a + r.w, 0);
  res.ano[ano] = {
    base: modelo(rs),
    regressaoAMedia: modelo(rs, [{ nome: 'Y1', f: (r) => r.Y1 }, { nome: 'xV2_1', f: (r) => r.xV2_1 }]),
    medias: { eV2: rs.reduce((a, r) => a + r.w * r.eV2, 0) / sw, dC: rs.reduce((a, r) => a + r.w * r.dC, 0) / sw, semBio: rs.reduce((a, r) => a + r.w * r.ctrl[0], 0) / sw },
  };
}
const b26 = res.ano[2026].base.eV2, b22 = res.ano[2022].base.eV2;
const T1 = { teste: 'T1 e_V2 em 2022', ...b22, p: pBi(b22.z), bonferroni: Math.abs(b22.z) >= Z_B };
const d = b26.beta - b22.beta, se = Math.hypot(b26.se, b22.se);
const T2 = { teste: 'T2 diferença 2026 − 2022', dif: d, se, z: d / se, p: pBi(d / se), bonferroni: Math.abs(d / se) >= Z_B };
res.testes.push(T1, T2);
res.mde80_2022 = (Z_B + 0.84) * b22.se;
res.leitura = T1.beta > 0 && T1.bonferroni && !T2.bonferroni ? 'estrutural'
  : T1.beta > 0 && T1.bonferroni && T2.dif > 0 && T2.bonferroni ? 'existia em 2022, maior em 2026'
    : Math.abs(T1.z) < 2 && T2.dif > 0 && T2.bonferroni && res.mde80_2022 <= b26.beta ? 'próprio de 2026'
      : 'inconclusivo';
// Exploratório (depois de ver o resultado): por que o substituto do doc 23 (Δc × sb) leu "próprio de 2026"? Na mesma amostra
// de cada ano: o coeficiente do substituto (modelo do doc 23) e a correlação ponderada, dentro do local, entre Δc × sb e e_V2.
res.exploratorioSubstituto = {};
for (const ano of [2026, 2022]) {
  const rs = L[ano];
  const sw = rs.reduce((a, r) => a + r.w, 0);
  const mdc = rs.reduce((a, r) => a + r.w * r.dC, 0) / sw, msb = rs.reduce((a, r) => a + r.w * r.ctrl[0], 0) / sw;
  const reg = regredir(rs.map((r) => ({ w: r.w, g: r.g, y: r.y, cols: [(r.dC - mdc) * (r.ctrl[0] - msb), r.dC, ...r.ctrl] })), ['dc_x_sb', 'dc', ...CTRLN(rs.base)], 2);
  const g = new Map();
  for (const r of rs) { const o = g.get(r.g) ?? { w: 0, x: 0, y: 0, n: 0 }; o.w += r.w; o.x += r.w * r.dC * r.ctrl[0]; o.y += r.w * r.eV2; o.n++; g.set(r.g, o); }
  let sxy = 0, sxx = 0, syy = 0;
  for (const r of rs) { const o = g.get(r.g); if (o.n < 2) continue; const dx = r.dC * r.ctrl[0] - o.x / o.w, dy = r.eV2 - o.y / o.w; sxy += r.w * dx * dy; sxx += r.w * dx * dx; syy += r.w * dy * dy; }
  res.exploratorioSubstituto[ano] = { dc_x_sb: coef(reg, 'dc_x_sb'), correlacaoDentroDoLocal: sxy / Math.sqrt(sxx * syy) };
}
await writeFile(path.join(SAIDA, 'resultado-mg-2022-diario.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, (k, v) => (typeof v === 'number' ? +v.toPrecision(5) : v), 1));
