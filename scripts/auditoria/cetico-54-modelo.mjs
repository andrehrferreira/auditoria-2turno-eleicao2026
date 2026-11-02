// Cético revisor, parecer 54 (H13, fechamento; doc 28 do estatístico): reprodução própria do sinal V3m de MG (painel) em
// 2026 e em 2022, e testes da leitura benigna e da leitura de fraude.
//
// Caminho próprio, sem importar estatistico-h13-final-lib.mjs:
//   2026: banco de leitura (secao, voto_bu; número interno da urna nos dois turnos), vias do diário (h08 + h08-uniao),
//         perfil forense/perfil/mg.csv; opcionalmente as vias recontadas pelo censo próprio (cetico-54-censo-v3.mjs),
//         com a V3m pela regra de 2022 (biometria do mesário encontrada, nos arquivos ou em eleitores).
//   2022: boletim lido por tag (cetico/48/bu2022.csv: 13, 22, comparecimento, V2 e V3 total), vias do diário de 2022
//         (h13-v2/diario2022), perfil 2022 relido do zip do TSE, modelo da urna de secoes-2022.csv.
//   Regressão: eliminação de Gauss com pivô (não Cholesky), efeito fixo de local por desvio da média ponderada, CR1 por
//   local (ou por município, quando pedido).
//
// Blocos (todos exploratórios, exceto R, que reproduz o teste declarado):
//   R   réplica: ΔY ~ e_V2 + e_V3m + e_V3s + Δc + controles | local (2026 e 2022);
//   B   só boletim: e_V2 e e_V3 total do BU (não depende da tradução das mensagens);
//   H   censo próprio 2026: V3m pela regra de 2026 (deve reproduzir R) e pela regra de 2022 (comparação justa com 2022);
//   S   divisão "V3m subiu" × "V3m caiu" (inclinações separadas), nos dois anos, e com Y1/x_V3m,1 (regressão à média);
//   U   2026: mesma urna nos dois turnos × urna trocada (interação);
//   L   nível: Y1 e Y2 sobre a queda e a alta da V3m (leitura de fraude no 1º turno);
//   K   alavanca por município (efeito de Poços de Caldas e dos maiores) e erro por município;
//   V   conversão em votos (várias leituras) e tetos aritméticos.
// Uso: node --max-old-space-size=8000 scripts/auditoria/cetico-54-modelo.mjs
// Saída: data/parsed/auditoria/cetico/54/modelo.json
import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { dividirCsv, linhasZip, pad } from './forense-lib.mjs';

const EST = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico');
const C48 = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', '48');
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', '54');
await mkdir(SAIDA, { recursive: true });
const csv = async (f) => { const L = (await readFile(f, 'utf8')).split('\n').filter(Boolean); const cab = dividirCsv(L[0]); return L.slice(1).map((l) => { const c = dividirCsv(l); return Object.fromEntries(cab.map((k, i) => [k, c[i]])); }); };
const n = (v) => (v === '' || v == null ? null : Number(v));

// ======================= 2026 =======================
const s26 = new Map();
const { db } = await abrirLeitura();
for (const r of db.prepare("SELECT turno, municipio, zona, secao, local, comparecimento c, sem_biometria sb, por_biometria pb, por_biografia pg, modelo_urna m, numero_interno_urna u FROM secao WHERE uf = 'mg'").iterate()) {
  const id = `mg/${r.municipio}/${r.zona}/${r.secao}`;
  const o = s26.get(id) ?? {}; s26.set(id, o);
  o[r.turno] = { local: r.local, comp: r.c, v2bu: r.sb, v1bu: r.pb, v3bu: r.pg, modelo: (r.m ?? '').toLowerCase(), urna: r.u, v13: 0, v22: 0 };
}
for (const v of db.prepare("SELECT turno, municipio, zona, secao, numero, quantidade q FROM voto_bu WHERE uf = 'mg' AND cargo = 1 AND numero IN (13, 22)").iterate()) {
  const t = s26.get(`mg/${v.municipio}/${v.zona}/${v.secao}`)?.[v.turno];
  if (t) t[v.numero === 13 ? 'v13' : 'v22'] += v.q;
}
for (const a of db.prepare("SELECT municipio, zona, secao, max(aptos) aptos FROM secao_eleicao WHERE uf = 'mg' AND turno = 2 GROUP BY 1, 2, 3").iterate()) { const o = s26.get(`mg/${a.municipio}/${a.zona}/${a.secao}`); if (o) o.aptos = a.aptos; }
const nomeMun = new Map();
try { for (const r of db.prepare("SELECT * FROM municipio WHERE uf = 'mg'").all()) nomeMun.set(`mg/${r.codigo ?? r.municipio}`, r.nome ?? null); } catch { /* sem tabela */ }
db.close();
for (const t of [1, 2]) {
  for (const dir of [path.join(EST, 'h08', `${t}t`), path.join(EST, 'h08-uniao', `${t}t`)]) {
    for (const f of (await readdir(dir)).filter((x) => x.endsWith('.secoes.jsonl') && (x.startsWith('mg-') || x === 'selecao.secoes.jsonl')).sort()) {
      for (const l of (await readFile(path.join(dir, f), 'utf8')).split('\n')) {
        if (!l) continue;
        const x = JSON.parse(l);
        if (x.uf !== 'mg') continue;
        const o = s26.get(`mg/${x.municipio}/${x.zona}/${x.secao}`)?.[t];
        if (o) o.log = { votos: x.votos, ...x.vias };
      }
    }
  }
  const fc = path.join(SAIDA, `censo-v3-${t}t.jsonl`);
  if (existsSync(fc)) {
    for (const l of (await readFile(fc, 'utf8')).split('\n')) {
      if (!l) continue;
      const x = JSON.parse(l);
      const o = s26.get(x.id)?.[t];
      if (o) o.censo = x;
    }
  }
}
for (const p of await csv(path.join(DIR_DADOS, 'parsed', 'auditoria', 'forense', 'perfil', 'mg.csv'))) {
  const o = s26.get(`mg/${p.municipio}/${p.zona}/${p.secao}`);
  if (o) o.perfil = { eleitores: n(p.eleitores), biometria: n(p.biometria), idade60: n(p.idade60), idade16a24: n(p.idade16a24), escol_baixa: n(p.escol_baixa), superior: n(p.superior) };
}

// ======================= 2022 =======================
const s22 = new Map();
for (const r of await csv(path.join(C48, 'bu2022.csv'))) {
  const o = s22.get(r.id) ?? {}; s22.set(r.id, o);
  const comp = n(r.comp), lib = n(r.lib), cb = n(r.compBio);
  o[r.turno] = { local: n(r.local), aptos: n(r.aptos), comp, v2bu: comp - cb, v3bu: lib, v1bu: cb - lib, v13: n(r.v13), v22: n(r.v22) };
}
for (const t of [1, 2]) {
  for (const l of (await readFile(path.join(EST, 'h13-v2', 'diario2022', `${t}t.jsonl`), 'utf8')).split('\n')) {
    if (!l) continue;
    const x = JSON.parse(l);
    const o = s22.get(`mg/${x.municipio}/${x.zona}/${x.secao}`)?.[t];
    if (o && !x.erro) o.log = { votos: x.votos, ...x.vias };
  }
}
{
  const P = new Map(); let idx = null;
  for await (const [, linha] of linhasZip(path.join(DIR_DADOS, 'raw', 'dadosabertos', 'perfil_eleitor_secao', 'perfil_eleitor_secao_2022_MG.zip'))) {
    const c = dividirCsv(linha).map((x) => x.replaceAll('"', '').trim());
    if (!idx) { idx = Object.fromEntries(c.map((k, i) => [k, i])); continue; }
    const id = `mg/${pad(c[idx.CD_MUNICIPIO], 5)}/${pad(c[idx.NR_ZONA], 4)}/${pad(c[idx.NR_SECAO], 4)}`;
    const p = P.get(id) ?? { eleitores: 0, biometria: 0, idade60: 0, idade16a24: 0, escol_baixa: 0, superior: 0 }; P.set(id, p);
    const q = Number(c[idx.QT_ELEITORES_PERFIL]), f = Number(c[idx.CD_FAIXA_ETARIA]), e = Number(c[idx.CD_GRAU_ESCOLARIDADE]);
    p.eleitores += q; p.biometria += Number(c[idx.QT_ELEITORES_BIOMETRIA]);
    if (f >= 6000) p.idade60 += q;
    if (f >= 1600 && f <= 2124) p.idade16a24 += q;
    if (e >= 1 && e <= 3) p.escol_baixa += q;
    if (e === 8) p.superior += q;
  }
  for (const [id, p] of P) { const o = s22.get(id); if (o) o.perfil = p; }
}
for (const r of await csv(path.join(EST, 'h13-v2', 'secoes-2022.csv'))) { const o = s22.get(r.id); if (o?.[2]) o[2].modelo = (r.modelo_2 ?? '').toLowerCase(); }

// ======================= painel =======================
const MODELOS = ['ue2009', 'ue2010', 'ue2011', 'ue2013', 'ue2015', 'ue2020', 'ue2022'];
const Yf = (t) => t.v13 / (t.v13 + t.v22);
function painel(S, ano) {
  const ex = {}; const exc = (m) => { ex[m] = (ex[m] ?? 0) + 1; };
  const rows = [];
  for (const [id, o] of S) {
    const b = o[1], a = o[2];
    if (!a?.comp || !b?.comp) { exc('sem os dois turnos'); continue; }
    if (!a.log || !b.log) { exc('sem diário'); continue; }
    if (a.log.votos !== a.comp || b.log.votos !== b.comp) { exc('diário ≠ BU'); continue; }
    if (a.v13 + a.v22 < 20 || b.v13 + b.v22 < 20) { exc('< 20 votos'); continue; }
    const p = o.perfil;
    if (!p?.eleitores) { exc('sem perfil'); continue; }
    const el = p.eleitores;
    const cz = a.censo && b.censo ? { v3m22: a.censo.v3m_22 - b.censo.v3m_22, v3_22: a.censo.v3_22 - b.censo.v3_22, v3m: a.censo.v3m - b.censo.v3m, v3s: a.censo.v3s - b.censo.v3s, igual: a.censo.v3m === a.log.v3m && b.censo.v3m === b.log.v3m && a.censo.v3s === a.log.v3s && b.censo.v3s === b.log.v3s && a.censo.v2 === a.log.v2 && b.censo.v2 === b.log.v2 } : null;
    rows.push({
      id, mun: id.split('/').slice(0, 2).join('/'), g: `${id.split('/').slice(0, 3).join('/')}/${a.local}`, w: a.v13 + a.v22, w1: b.v13 + b.v22, y: Yf(a) - Yf(b), Y1: Yf(b), Y2: Yf(a),
      modelo: a.modelo || '#nulo#', el, aptos: ano === 2026 ? o.aptos : a.aptos, comp1: b.comp, comp2: a.comp, mesmaUrna: ano === 2026 ? (a.urna != null && a.urna === b.urna ? 1 : 0) : null,
      d: { v2: a.log.v2 - b.log.v2, v3m: a.log.v3m - b.log.v3m, v3s: a.log.v3s - b.log.v3s, c: a.comp - b.comp, v2bu: a.v2bu - b.v2bu, v3bu: a.v3bu - b.v3bu },
      x1: { v3m: b.log.v3m / b.log.votos, v3s: b.log.v3s / b.log.votos, v2: b.log.v2 / b.log.votos }, x2: { v3m: a.log.v3m / a.log.votos, v3s: a.log.v3s / a.log.votos, v2: a.log.v2 / a.log.votos },
      v3m1: b.log.v3m, v3m2: a.log.v3m, v3s1: b.log.v3s, v3s2: a.log.v3s, cz,
      ctrl0: [1 - p.biometria / el, p.idade60 / el, p.idade16a24 / el, p.escol_baixa / el, p.superior / el, Math.log(el)],
    });
  }
  const cont = {}; for (const r of rows) cont[r.modelo] = (cont[r.modelo] ?? 0) + 1;
  const base = MODELOS.filter((m) => cont[m]).at(-1);
  const outros = MODELOS.filter((m) => cont[m] && m !== base);
  for (const r of rows) r.ctrl = [...r.ctrl0, ...outros.map((m) => (r.modelo === m ? 1 : 0))];
  return { rows, ex, modelos: cont, base, nomesCtrl: ['cadSemBio', 'p60', 'p16a24', 'pBaixa', 'pSup', 'logEle', ...outros] };
}

// ======================= regressão própria =======================
function resolver(A, B) {
  const k = A.length, m = B[0].length;
  const M = A.map((r, i) => [...r, ...B[i]]);
  const escala = Math.max(...A.map((r, i) => Math.abs(r[i])));
  for (let c = 0; c < k; c++) {
    let piv = c;
    for (let r = c + 1; r < k; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    if (Math.abs(M[piv][c]) < 1e-12 * escala) { const e = new Error('singular'); e.coluna = c; throw e; }
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = 0; r < k; r++) { if (r === c) continue; const f = M[r][c] / M[c][c]; if (f) for (let j = c; j < k + m; j++) M[r][j] -= f * M[c][j]; }
  }
  return M.map((r, i) => r.slice(k).map((v) => v / M[i][i]));
}
/** OLS ponderado com efeito fixo de grupo (rows[i].g) e CR1 por cluster (padrão: o grupo). y por função. */
function ols(rows, cols, nomes, { y = (r) => r.y, w = (r) => r.w, cluster = (r) => r.g, nFoc = 1 } = {}) {
  const grupos = new Map();
  rows.forEach((r, i) => { (grupos.get(r.g) ?? grupos.set(r.g, []).get(r.g)).push(i); });
  const K = nomes.length;
  const X = [], Y = [], W = [], G = [], R = [];
  const cl = new Map();
  for (const ii of grupos.values()) {
    if (ii.length < 2) continue;
    let sw = 0, my = 0; const mx = new Array(K).fill(0);
    for (const i of ii) { const wi = w(rows[i]); sw += wi; my += wi * y(rows[i]); const x = cols(rows[i]); for (let k = 0; k < K; k++) mx[k] += wi * x[k]; }
    for (const i of ii) {
      const x = cols(rows[i]); X.push(x.map((v, k) => v - mx[k] / sw)); Y.push(y(rows[i]) - my / sw); W.push(w(rows[i])); R.push(rows[i]);
      const c = cluster(rows[i]); let ci = cl.get(c); if (ci === undefined) cl.set(c, (ci = cl.size)); G.push(ci);
    }
  }
  let vivas = [...Array(K).keys()].filter((k) => X.some((x) => Math.abs(x[k]) > 1e-12));
  let k2, XtX, XtY, beta;
  for (;;) {
    k2 = vivas.length;
    XtX = vivas.map(() => new Array(k2).fill(0)); XtY = vivas.map(() => [0]);
    for (let i = 0; i < X.length; i++) for (let a = 0; a < k2; a++) { const xa = X[i][vivas[a]] * W[i]; XtY[a][0] += xa * Y[i]; for (let b = 0; b < k2; b++) XtX[a][b] += xa * X[i][vivas[b]]; }
    try { beta = resolver(XtX, XtY).map((r) => r[0]); break; } catch (e) { if (e.coluna === undefined || vivas[e.coluna] < nFoc) throw e; vivas = vivas.filter((_, a) => a !== e.coluna); }
  }
  const S = new Map(); const resid = [];
  for (let i = 0; i < X.length; i++) {
    let e = Y[i]; for (let a = 0; a < k2; a++) e -= X[i][vivas[a]] * beta[a];
    resid.push(e);
    const v = S.get(G[i]) ?? S.set(G[i], new Array(k2).fill(0)).get(G[i]);
    for (let a = 0; a < k2; a++) v[a] += W[i] * X[i][vivas[a]] * e;
  }
  const meat = vivas.map(() => new Array(k2).fill(0));
  for (const v of S.values()) for (let a = 0; a < k2; a++) for (let b = 0; b < k2; b++) meat[a][b] += v[a] * v[b];
  const inv = resolver(XtX, XtX.map((_, i) => XtX.map((__, j) => (i === j ? 1 : 0))));
  const N = X.length, gi = cl.size, c = (gi / (gi - 1)) * ((N - 1) / (N - k2));
  const t1 = inv.map((r) => vivas.map((_, j) => r.reduce((s, v, a) => s + v * meat[a][j], 0)));
  const V = t1.map((r) => vivas.map((_, j) => c * r.reduce((s, v, a) => s + v * inv[a][j], 0)));
  const out = { N, clusters: gi, coef: {} };
  vivas.forEach((k, a) => { out.coef[nomes[k]] = { b: beta[a] * 100, se: Math.sqrt(V[a][a]) * 100, z: beta[a] / Math.sqrt(V[a][a]) }; });
  out.cov = (n1, n2) => V[vivas.indexOf(nomes.indexOf(n1))][vivas.indexOf(nomes.indexOf(n2))] * 1e4;
  out.X = X; out.W = W; out.R = R; out.resid = resid; out.vivas = vivas;
  return out;
}
const CTRLN = new Set(['cadSemBio', 'p60', 'p16a24', 'pBaixa', 'pSup', 'logEle']);
const limpa = (r) => ({ N: r.N, clusters: r.clusters, ...Object.fromEntries(Object.entries(r.coef).filter(([k]) => !k.startsWith('ue') && !k.startsWith('#') && !CTRLN.has(k)).map(([k, v]) => [k, { b: +v.b.toFixed(3), se: +v.se.toFixed(3), z: +v.z.toFixed(2) }])) });
const dif = (a, b) => { const d = a.b - b.b, se = Math.hypot(a.se, b.se); return { b: +d.toFixed(3), se: +se.toFixed(3), z: +(d / se).toFixed(2) }; };

const PN = { 2026: painel(s26, 2026), 2022: painel(s22, 2022) };
const res = { amostra: {}, R: {}, B: {}, H: {}, S: {}, U: {}, L: {}, K: {}, V: {} };
const E = (r, k) => r.d[k] / r.el;
const NOMES4 = ['eV2', 'eV3m', 'eV3s', 'dC'];
const R4 = (r) => [E(r, 'v2'), E(r, 'v3m'), E(r, 'v3s'), E(r, 'c')];

for (const ano of [2026, 2022]) {
  const { rows, ex, modelos, base, nomesCtrl } = PN[ano];
  res.amostra[ano] = { secoes: rows.length, exclusoes: ex, modelos, base, v3mSubiu: rows.filter((r) => r.d.v3m > 0).length, v3mCaiu: rows.filter((r) => r.d.v3m < 0).length, v3mIgual: rows.filter((r) => r.d.v3m === 0).length };
  // R: réplica
  const R = ols(rows, (r) => [...R4(r), ...r.ctrl], [...NOMES4, ...nomesCtrl], { nFoc: 4 });
  res.R[ano] = limpa(R);
  { const a = R.coef.eV3m, b = R.coef.eV3s; const d = a.b - b.b, se = Math.sqrt(a.se ** 2 + b.se ** 2 - 2 * R.cov('eV3m', 'eV3s')); res.R[ano]['V3m − V3s'] = { b: +d.toFixed(3), se: +se.toFixed(3), z: +(d / se).toFixed(2) }; }
  res.R[ano].semControles = limpa(ols(rows, (r) => R4(r), NOMES4, { nFoc: 4 }));
  res.R[ano].erroPorMunicipio = limpa(ols(rows, (r) => [...R4(r), ...r.ctrl], [...NOMES4, ...nomesCtrl], { nFoc: 4, cluster: (r) => r.mun }));
  // B: V3 total do boletim
  const B = ols(rows, (r) => [E(r, 'v2bu'), E(r, 'v3bu'), E(r, 'c'), ...r.ctrl], ['eV2bu', 'eV3bu', 'dC', ...nomesCtrl], { nFoc: 3 });
  res.B[ano] = limpa(B);
  // S: subiu × caiu
  const up = (x) => Math.max(0, x), dn = (x) => Math.min(0, x);
  const nomS = ['eV2', 'eV3mSobe', 'eV3mDesce', 'eV3s', 'dC'];
  const colS = (r) => [E(r, 'v2'), up(E(r, 'v3m')), dn(E(r, 'v3m')), E(r, 'v3s'), E(r, 'c')];
  const S = ols(rows, (r) => [...colS(r), ...r.ctrl], [...nomS, ...nomesCtrl], { nFoc: 5 });
  res.S[ano] = { base: limpa(S), diferencaDesceMenosSobe: dif(S.coef.eV3mDesce, S.coef.eV3mSobe) };
  res.S[ano].comRegressaoAMedia = limpa(ols(rows, (r) => [...colS(r), r.Y1, r.x1.v3m, r.x1.v3s, r.x1.v2, ...r.ctrl], [...nomS, 'Y1', 'x1V3m', 'x1V3s', 'x1V2', ...nomesCtrl], { nFoc: 5 }));
  res.S[ano].semControles = limpa(ols(rows, (r) => colS(r), nomS, { nFoc: 5 }));
  // V3 total do BU, subiu × caiu
  res.S[ano].v3BoletimSobeDesce = limpa(ols(rows, (r) => [E(r, 'v2bu'), up(E(r, 'v3bu')), dn(E(r, 'v3bu')), E(r, 'c'), ...r.ctrl], ['eV2bu', 'eV3buSobe', 'eV3buDesce', 'dC', ...nomesCtrl], { nFoc: 4 }));
  // Troca V3m ↔ V3s: seções em que a V3m caiu e a V3s subiu pelo menos metade da queda (mesmas pessoas mudando de marca)
  const troca = (r) => (r.d.v3m < 0 && r.d.v3s >= -0.5 * r.d.v3m ? 1 : 0);
  res.S[ano].secoesTrocaV3mV3s = rows.filter(troca).length;
  res.S[ano].desceSeparadoTroca = limpa(ols(rows, (r) => [E(r, 'v2'), up(E(r, 'v3m')), dn(E(r, 'v3m')) * troca(r), dn(E(r, 'v3m')) * (1 - troca(r)), E(r, 'v3s'), E(r, 'c'), ...r.ctrl], ['eV2', 'eV3mSobe', 'eV3mDesceComTroca', 'eV3mDesceSemTroca', 'eV3s', 'dC', ...nomesCtrl], { nFoc: 6 }));
  // L: nível no 1º e no 2º turno sobre a queda e a alta da V3m (por eleitor), mesmo efeito fixo de local do 2º turno
  const qd = (r) => Math.max(0, -r.d.v3m) / r.el, al = (r) => Math.max(0, r.d.v3m) / r.el;
  res.L[ano] = {
    Y1: limpa(ols(rows, (r) => [qd(r), al(r), ...r.ctrl], ['quedaV3m', 'altaV3m', ...nomesCtrl], { y: (r) => r.Y1, w: (r) => r.w1, nFoc: 2 })),
    Y2: limpa(ols(rows, (r) => [qd(r), al(r), ...r.ctrl], ['quedaV3m', 'altaV3m', ...nomesCtrl], { y: (r) => r.Y2, nFoc: 2 })),
    N1: limpa(ols(rows, (r) => [r.x1.v2, r.x1.v3m, r.x1.v3s, ...r.ctrl], ['x1V2', 'x1V3m', 'x1V3s', ...nomesCtrl], { y: (r) => r.Y1, w: (r) => r.w1, nFoc: 3 })),
    N2: limpa(ols(rows, (r) => [r.x2.v2, r.x2.v3m, r.x2.v3s, ...r.ctrl], ['x2V2', 'x2V3m', 'x2V3s', ...nomesCtrl], { y: (r) => r.Y2, nFoc: 3 })),
  };
  // K: alavanca por município (FWL: e_V3m residualizado nos outros regressores e no efeito fixo)
  const rx = ols(rows, (r) => [E(r, 'v2'), E(r, 'v3s'), E(r, 'c'), ...r.ctrl], ['eV2', 'eV3s', 'dC', ...nomesCtrl], { y: (r) => E(r, 'v3m'), nFoc: 3 });
  const lev = new Map(), num = new Map(); let L = 0, Nn = 0;
  const ym = ols(rows, (r) => [E(r, 'v2'), E(r, 'v3s'), E(r, 'c'), ...r.ctrl], ['eV2', 'eV3s', 'dC', ...nomesCtrl], { nFoc: 3 });
  rx.R.forEach((r, i) => { const x = rx.resid[i], yv = ym.resid[i], w = rx.W[i]; lev.set(r.mun, (lev.get(r.mun) ?? 0) + w * x * x); num.set(r.mun, (num.get(r.mun) ?? 0) + w * x * yv); L += w * x * x; Nn += w * x * yv; });
  const topLev = [...lev.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([m, v]) => {
    const rs = rows.filter((r) => r.mun === m);
    return { municipio: m, nome: nomeMun.get(m) ?? null, secoes: rs.length, parteDaAlavanca: +(v / L).toFixed(3), parteDoNumerador: +(num.get(m) / Nn).toFixed(3), betaLocal: +((num.get(m) / v) * 100).toFixed(2),
      v3m1: rs.reduce((s, r) => s + r.v3m1, 0), v3m2: rs.reduce((s, r) => s + r.v3m2, 0), v3s1: rs.reduce((s, r) => s + r.v3s1, 0), v3s2: rs.reduce((s, r) => s + r.v3s2, 0) };
  });
  res.K[ano] = { betaFWL: +((Nn / L) * 100).toFixed(3), maioresAlavancas: topLev };
  // seções de maior alavanca (código público da seção; nenhum dado de pessoa)
  const secLev = rx.R.map((r, i) => ({ r, l: rx.W[i] * rx.resid[i] ** 2, c: rx.W[i] * rx.resid[i] * ym.resid[i] })).sort((a, b) => b.l - a.l);
  res.K[ano].secoesMaiorAlavanca = secLev.slice(0, 15).map(({ r, l, c }) => ({ id: r.id, parteDaAlavanca: +(l / L).toFixed(4), parteDoNumerador: +(c / Nn).toFixed(4), eleitoresPerfil: r.el, aptosBU: r.aptos, comp1: r.comp1, comp2: r.comp2, v3m1: r.v3m1, v3m2: r.v3m2, v3s1: r.v3s1, v3s2: r.v3s2, Y1: +r.Y1.toFixed(3), Y2: +r.Y2.toFixed(3) }));
  for (const q of [10, 50, 100]) res.K[ano][`parteDaAlavancaNas${q}Maiores`] = +(secLev.slice(0, q).reduce((s, x) => s + x.l, 0) / L).toFixed(3);
  res.K[ano].secoesPerfilMenorQueMetadeDoComparecimento = rows.filter((r) => r.el < 0.5 * Math.max(r.comp1, r.comp2)).length;
  // denominador: aptos do BU (A), e só seções com perfil perto dos aptos (A2)
  const rA = rows.filter((r) => r.aptos > 0);
  const EA = (r, k) => r.d[k] / r.aptos;
  res.K[ano].A_divAptos = limpa(ols(rA, (r) => [EA(r, 'v2'), EA(r, 'v3m'), EA(r, 'v3s'), EA(r, 'c'), ...r.ctrl], [...NOMES4, ...nomesCtrl], { nFoc: 4 }));
  res.K[ano].A_divAptosSobeDesce = limpa(ols(rA, (r) => [EA(r, 'v2'), up(EA(r, 'v3m')), dn(EA(r, 'v3m')), EA(r, 'v3s'), EA(r, 'c'), ...r.ctrl], [...nomS, ...nomesCtrl], { nFoc: 5 }));
  const rA2 = rows.filter((r) => r.aptos > 0 && Math.abs(r.aptos - r.el) / r.el < 0.1);
  res.K[ano].A2_perfilPertoDosAptos = limpa(ols(rA2, (r) => [...R4(r), ...r.ctrl], [...NOMES4, ...nomesCtrl], { nFoc: 4 }));
  res.K[ano].A2_sobeDesce = limpa(ols(rA2, (r) => [...colS(r), ...r.ctrl], [...nomS, ...nomesCtrl], { nFoc: 5 }));
  // perfil quebrado: seções com eleitores do perfil abaixo da metade dos aptos do BU (fora só elas; denominador do plano)
  const quebrado = (r) => r.aptos > 0 && r.el < 0.5 * r.aptos;
  const rQ = rows.filter((r) => !quebrado(r));
  res.K[ano].perfilQuebrado = { secoes: rows.filter(quebrado).length, comEleitoresAte25: rows.filter((r) => quebrado(r) && r.el <= 25).length,
    semElas: limpa(ols(rQ, (r) => [...R4(r), ...r.ctrl], [...NOMES4, ...nomesCtrl], { nFoc: 4 })),
    semElasSobeDesce: limpa(ols(rQ, (r) => [...colS(r), ...r.ctrl], [...nomS, ...nomesCtrl], { nFoc: 5 })) };
  // só as seções de perfil com até 25 eleitores e aptos ≥ 100 (as do topo da alavanca)
  const minusc = (r) => r.el <= 25 && r.aptos >= 100;
  res.K[ano].perfilAte25 = { secoes: rows.filter(minusc).map((r) => r.id), semElas: limpa(ols(rows.filter((r) => !minusc(r)), (r) => [...R4(r), ...r.ctrl], [...NOMES4, ...nomesCtrl], { nFoc: 4 })) };
  // denominador: votos do 1º turno (comparecimento), que não depende do perfil nem dos aptos
  const EC = (r, k) => r.d[k] / r.comp1;
  res.K[ano].C_divComparecimento1 = limpa(ols(rows, (r) => [EC(r, 'v2'), EC(r, 'v3m'), EC(r, 'v3s'), EC(r, 'c'), ...r.ctrl], [...NOMES4, ...nomesCtrl], { nFoc: 4 }));
  res.K[ano].C_sobeDesce = limpa(ols(rows, (r) => [EC(r, 'v2'), up(EC(r, 'v3m')), dn(EC(r, 'v3m')), EC(r, 'v3s'), EC(r, 'c'), ...r.ctrl], [...nomS, ...nomesCtrl], { nFoc: 5 }));
  // L2: decomposição exata do painel em Y2 e Y1 (mesmos regressores e mesmo peso: coef(Y2) − coef(Y1) = coef(ΔY))
  res.L[ano].decomposicao = {
    Y1: limpa(ols(rows, (r) => [...colS(r), ...r.ctrl], [...nomS, ...nomesCtrl], { y: (r) => r.Y1, nFoc: 5 })),
    Y2: limpa(ols(rows, (r) => [...colS(r), ...r.ctrl], [...nomS, ...nomesCtrl], { y: (r) => r.Y2, nFoc: 5 })),
  };
  const fora = new Set(topLev.map((t) => t.municipio));
  res.K[ano].semAs5MaioresAlavancas = limpa(ols(rows.filter((r) => !fora.has(r.mun)), (r) => [...R4(r), ...r.ctrl], [...NOMES4, ...nomesCtrl], { nFoc: 4 }));
  res.K[ano].semAMaiorAlavanca = limpa(ols(rows.filter((r) => r.mun !== topLev[0].municipio), (r) => [...R4(r), ...r.ctrl], [...NOMES4, ...nomesCtrl], { nFoc: 4 }));
  res.K[ano].semAMaiorAlavancaSobeDesce = limpa(ols(rows.filter((r) => r.mun !== topLev[0].municipio), (r) => [...colS(r), ...r.ctrl], [...nomS, ...nomesCtrl], { nFoc: 5 }));
}

// H: censo próprio de 2026 (V3m pela regra de 2026 e pela de 2022)
{
  const { rows, nomesCtrl } = PN[2026];
  const rc = rows.filter((r) => r.cz);
  if (rc.length) {
    res.H.secoesComCenso = rc.length;
    res.H.secoesComViasIguaisAoH08 = rc.filter((r) => r.cz.igual).length;
    res.H.regra2026 = limpa(ols(rc, (r) => [E(r, 'v2'), r.cz.v3m / r.el, r.cz.v3s / r.el, E(r, 'c'), ...r.ctrl], [...NOMES4, ...nomesCtrl], { nFoc: 4 }));
    // regra de 2022: V3 = solicitação de dado pessoal; V3m = V3 com "biometria do mesário encontrada" (arquivos ou eleitores)
    res.H.regra2022 = limpa(ols(rc, (r) => [E(r, 'v2'), r.cz.v3m22 / r.el, (r.cz.v3_22 - r.cz.v3m22) / r.el, E(r, 'c'), ...r.ctrl], ['eV2', 'eV3m22', 'eV3s22', 'dC', ...nomesCtrl], { nFoc: 4 }));
    res.H.regra2022SobeDesce = limpa(ols(rc, (r) => [E(r, 'v2'), Math.max(0, r.cz.v3m22 / r.el), Math.min(0, r.cz.v3m22 / r.el), (r.cz.v3_22 - r.cz.v3m22) / r.el, E(r, 'c'), ...r.ctrl], ['eV2', 'eV3m22Sobe', 'eV3m22Desce', 'eV3s22', 'dC', ...nomesCtrl], { nFoc: 5 }));
  } else res.H.aviso = 'censo próprio ainda não rodado';
}

// U: mesma urna × urna trocada (2026)
{
  const { rows, nomesCtrl } = PN[2026];
  res.U.secoesMesmaUrna = rows.filter((r) => r.mesmaUrna).length;
  res.U.secoesUrnaTrocada = rows.filter((r) => !r.mesmaUrna).length;
  res.U.interacao = limpa(ols(rows, (r) => [...R4(r), E(r, 'v3m') * (1 - r.mesmaUrna), (1 - r.mesmaUrna), ...r.ctrl], [...NOMES4, 'eV3mXtrocada', 'trocada', ...nomesCtrl], { nFoc: 6 }));
  res.U.soMesmaUrna = limpa(ols(rows.filter((r) => r.mesmaUrna), (r) => [...R4(r), ...r.ctrl], [...NOMES4, ...nomesCtrl], { nFoc: 4 }));
  const tr = rows.filter((r) => !r.mesmaUrna);
  res.U.mediaAbsDeltaV3m = { mesma: +(rows.filter((r) => r.mesmaUrna).reduce((s, r) => s + Math.abs(r.d.v3m), 0) / Math.max(1, res.U.secoesMesmaUrna)).toFixed(2), trocada: +(tr.reduce((s, r) => s + Math.abs(r.d.v3m), 0) / Math.max(1, tr.length)).toFixed(2) };
}

// V: votos
{
  const { rows } = PN[2026];
  const bR = res.R[2026].eV3m.b, bD = res.S[2026].base.eV3mDesce.b, bS = res.S[2026].base.eV3mSobe.b;
  let secoesY1igual1 = 0; let parcelaTodas = 0, parcelaDesce = 0, insercaoR1Desce = 0, trocaDesce = 0, parcelaSobe = 0;
  for (const r of rows) {
    const e = E(r, 'v3m');
    parcelaTodas += (bR / 100) * Math.abs(e) * r.w; // votos-equivalentes de parcela (|β·e|·n)
    if (e < 0) {
      const v = (bD / 100) * -e; // pontos de parcela (em fração) a menos no ganho do 13
      parcelaDesce += v * r.w;
      if (r.Y1 < 1) insercaoR1Desce += (v * r.w1) / (1 - r.Y1); else secoesY1igual1++; // votos inseridos no 13 no 1º turno que produziriam essa parcela
      trocaDesce += 2 * v * r.w; // efeito na margem se fossem votos trocados
    } else parcelaSobe += (Math.max(0, bS) / 100) * e * r.w;
  }
  const somaV3m2 = rows.reduce((s, r) => s + r.v3m2, 0), somaV3m1 = rows.reduce((s, r) => s + r.v3m1, 0);
  const aMais = rows.reduce((s, r) => s + Math.max(0, r.d.v3m), 0), aMenos = rows.reduce((s, r) => s + Math.max(0, -r.d.v3m), 0);
  res.V = {
    nota: 'votos-equivalentes = Σ |β·e_s|·(13+22)_s; inserção no 1º turno = Σ β·|e_s|·(13+22)_1 / (1 − Y1_s)',
    betaLinear: bR, betaDesce: bD, betaSobe: bS,
    parcelaTodasAsSecoes: Math.round(parcelaTodas),
    parcelaSoOndeCaiu: Math.round(parcelaDesce), margemSeFossemTrocados: Math.round(trocaDesce), insercaoNo1oTurnoOndeCaiu: Math.round(insercaoR1Desce), secoesY1igual1ForaDaInsercao: secoesY1igual1,
    parcelaSoOndeSubiu: Math.round(parcelaSobe),
    calibracaoDoAutor: { fPor1pct: 0.14040472517068747, f: bR / 0.14040472517068747 / 100, base: aMais, votos: Math.round((bR / 0.14040472517068747 / 100) * aMais) },
    tetos: { v3mMG2t: somaV3m2, v3mMG1t: somaV3m1, v3mAMais: aMais, v3mAMenos: aMenos, margem2t: 4430191, duasVezesV3mMG2t: 2 * somaV3m2 },
  };
}

const sai = JSON.stringify(res, null, 1);
await writeFile(path.join(SAIDA, 'modelo.json'), sai);
console.log(sai);
