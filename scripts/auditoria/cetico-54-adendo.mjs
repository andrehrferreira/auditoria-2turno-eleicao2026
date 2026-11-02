// Cético revisor, parecer 54, adendo 1: reprodução própria do painel com o denominador do adendo 1 do plano 27
// (e_v = L_v,2 ÷ aptos_2 − L_v,1 ÷ aptos_1; Δc igual; controle de tamanho = log dos aptos do 2º turno; controles de
// composição do perfil do mesmo ano; efeito fixo de local do 2º turno; peso 13 + 22 do 2º turno; CR1 por local), para
// MG, RS e SP, em 2026 e em 2022. Sem importar a lib do estatístico.
//   2026: banco de leitura (secao, voto_bu, secao_eleicao: maior aptos da seção no turno), vias do h08 (+ h08-uniao),
//         perfil forense/perfil/<uf>.csv.
//   2022: boletim lido por mim por tag (MG: cetico/48/bu2022.csv; RS e SP: cetico/54/bu2022-<uf>.csv) para aptos,
//         comparecimento, local, 13 e 22; vias do diário de 2022 (h13-v2/diario2022); perfil 2022 relido do zip do TSE;
//         modelo da urna de 2022 da tabela do adendo (adendo1/secoes-2022.csv, coluna modelo_2).
// Também a variante do parecer 54 (ΔL ÷ aptos do 2º turno, controle log dos eleitores do perfil), para ligar os números.
// Uso: node --max-old-space-size=16000 scripts/auditoria/cetico-54-adendo.mjs
// Saída: data/parsed/auditoria/cetico/54/adendo.json
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { dividirCsv, linhasZip, pad } from './forense-lib.mjs';

const EST = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico');
const C = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');
const MODELOS = ['ue2009', 'ue2010', 'ue2011', 'ue2013', 'ue2015', 'ue2020', 'ue2022'];
const UFS = ['mg', 'rs', 'sp'];
const n = (v) => (v === '' || v == null ? null : Number(v));
const csv = async (f, sep) => { const L = (await readFile(f, 'utf8')).split('\n').filter(Boolean); const cab = L[0].split(sep); return L.slice(1).map((l) => { const c = l.split(sep); return Object.fromEntries(cab.map((k, i) => [k, c[i]])); }); };

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
function ols(rows, nomes, nFoc) {
  const grupos = new Map();
  rows.forEach((r, i) => { (grupos.get(r.g) ?? grupos.set(r.g, []).get(r.g)).push(i); });
  const K = nomes.length; const X = [], Y = [], W = [], G = [];
  let gi = 0;
  for (const ii of grupos.values()) {
    if (ii.length < 2) continue;
    let sw = 0, my = 0; const mx = new Array(K).fill(0);
    for (const i of ii) { const r = rows[i]; sw += r.w; my += r.w * r.y; for (let k = 0; k < K; k++) mx[k] += r.w * r.x[k]; }
    for (const i of ii) { const r = rows[i]; X.push(r.x.map((v, k) => v - mx[k] / sw)); Y.push(r.y - my / sw); W.push(r.w); G.push(gi); }
    gi++;
  }
  let vivas = [...Array(K).keys()].filter((k) => X.some((x) => Math.abs(x[k]) > 1e-12));
  let k2, XtX, XtY, beta;
  for (;;) {
    k2 = vivas.length;
    XtX = vivas.map(() => new Array(k2).fill(0)); XtY = vivas.map(() => [0]);
    for (let i = 0; i < X.length; i++) for (let a = 0; a < k2; a++) { const xa = X[i][vivas[a]] * W[i]; XtY[a][0] += xa * Y[i]; for (let b = 0; b < k2; b++) XtX[a][b] += xa * X[i][vivas[b]]; }
    try { beta = resolver(XtX, XtY).map((r) => r[0]); break; } catch (e) { if (e.coluna === undefined || vivas[e.coluna] < nFoc) throw e; vivas = vivas.filter((_, a) => a !== e.coluna); }
  }
  const S = new Map();
  for (let i = 0; i < X.length; i++) {
    let e = Y[i]; for (let a = 0; a < k2; a++) e -= X[i][vivas[a]] * beta[a];
    const v = S.get(G[i]) ?? S.set(G[i], new Array(k2).fill(0)).get(G[i]);
    for (let a = 0; a < k2; a++) v[a] += W[i] * X[i][vivas[a]] * e;
  }
  const meat = vivas.map(() => new Array(k2).fill(0));
  for (const v of S.values()) for (let a = 0; a < k2; a++) for (let b = 0; b < k2; b++) meat[a][b] += v[a] * v[b];
  const inv = resolver(XtX, XtX.map((_, i) => XtX.map((__, j) => (i === j ? 1 : 0))));
  const N = X.length, c = (gi / (gi - 1)) * ((N - 1) / (N - k2));
  const t1 = inv.map((r) => vivas.map((_, j) => r.reduce((s, v, a) => s + v * meat[a][j], 0)));
  const V = t1.map((r) => vivas.map((_, j) => c * r.reduce((s, v, a) => s + v * inv[a][j], 0)));
  const out = { N, locais: gi };
  vivas.forEach((k, a) => { if (k < nFoc) out[nomes[k]] = { b: +(beta[a] * 100).toFixed(3), se: +(Math.sqrt(V[a][a]) * 100).toFixed(3), z: +(beta[a] / Math.sqrt(V[a][a])).toFixed(2) }; });
  return out;
}

async function perfil2022(uf) {
  const P = new Map(); let idx = null;
  for await (const [, linha] of linhasZip(path.join(DIR_DADOS, 'raw', 'dadosabertos', 'perfil_eleitor_secao', `perfil_eleitor_secao_2022_${uf.toUpperCase()}.zip`))) {
    const c = dividirCsv(linha).map((x) => x.replaceAll('"', '').trim());
    if (!idx) { idx = Object.fromEntries(c.map((k, i) => [k, i])); continue; }
    const id = `${uf}/${pad(c[idx.CD_MUNICIPIO], 5)}/${pad(c[idx.NR_ZONA], 4)}/${pad(c[idx.NR_SECAO], 4)}`;
    const p = P.get(id) ?? { el: 0, bio: 0, i60: 0, i16: 0, eb: 0, sup: 0 }; P.set(id, p);
    const q = Number(c[idx.QT_ELEITORES_PERFIL ?? idx.QT_ELEITORES]), f = Number(c[idx.CD_FAIXA_ETARIA]), e = Number(c[idx.CD_GRAU_ESCOLARIDADE]);
    p.el += q; p.bio += Number(c[idx.QT_ELEITORES_BIOMETRIA]);
    if (f >= 6000) p.i60 += q;
    if (f >= 1600 && f <= 2124) p.i16 += q;
    if (e >= 1 && e <= 3) p.eb += q;
    if (e === 8) p.sup += q;
  }
  return P;
}

async function carregar2026(uf, db) {
  const S = new Map();
  for (const r of db.prepare('SELECT turno, municipio, zona, secao, local, comparecimento c, modelo_urna m FROM secao WHERE uf = ?').iterate(uf)) {
    const id = `${uf}/${r.municipio}/${r.zona}/${r.secao}`;
    const o = S.get(id) ?? {}; S.set(id, o);
    o[r.turno] = { local: r.local, comp: r.c, modelo: (r.m ?? '').toLowerCase(), v13: 0, v22: 0 };
  }
  for (const v of db.prepare('SELECT turno, municipio, zona, secao, numero, quantidade q FROM voto_bu WHERE uf = ? AND cargo = 1 AND numero IN (13, 22)').iterate(uf)) {
    const t = S.get(`${uf}/${v.municipio}/${v.zona}/${v.secao}`)?.[v.turno]; if (t) t[v.numero === 13 ? 'v13' : 'v22'] += v.q;
  }
  for (const a of db.prepare('SELECT turno, municipio, zona, secao, max(aptos) aptos FROM secao_eleicao WHERE uf = ? GROUP BY 1, 2, 3, 4').iterate(uf)) {
    const t = S.get(`${uf}/${a.municipio}/${a.zona}/${a.secao}`)?.[a.turno]; if (t) t.aptos = a.aptos;
  }
  for (const t of [1, 2]) for (const dir of [path.join(EST, 'h08', `${t}t`), path.join(EST, 'h08-uniao', `${t}t`)]) {
    for (const f of (await readdir(dir)).filter((x) => x.endsWith('.secoes.jsonl') && (x.startsWith(`${uf}-`) || x === 'selecao.secoes.jsonl')).sort()) {
      for (const l of (await readFile(path.join(dir, f), 'utf8')).split('\n')) {
        if (!l) continue; const x = JSON.parse(l); if (x.uf !== uf) continue;
        const o = S.get(`${uf}/${x.municipio}/${x.zona}/${x.secao}`)?.[t]; if (o) o.log = { votos: x.votos, ...x.vias };
      }
    }
  }
  for (const p of await csv(path.join(DIR_DADOS, 'parsed', 'auditoria', 'forense', 'perfil', `${uf}.csv`), ';')) {
    const o = S.get(`${uf}/${p.municipio}/${p.zona}/${p.secao}`);
    if (o) o.p = { el: n(p.eleitores), bio: n(p.biometria), i60: n(p.idade60), i16: n(p.idade16a24), eb: n(p.escol_baixa), sup: n(p.superior) };
  }
  return S;
}

async function carregar2022(uf, modelos) {
  const S = new Map();
  const fbu = uf === 'mg' ? path.join(C, '48', 'bu2022.csv') : path.join(C, '54', `bu2022-${uf}.csv`);
  for (const r of await csv(fbu, ';')) {
    const o = S.get(r.id) ?? {}; S.set(r.id, o);
    o[r.turno] = { local: n(r.local), aptos: n(r.aptos), comp: n(r.comp), v13: n(r.v13), v22: n(r.v22), modelo: r.turno === '2' ? (modelos.get(r.id) ?? '') : '' };
  }
  for (const t of [1, 2]) {
    const f = path.join(EST, 'h13-v2', 'diario2022', uf === 'mg' ? `${t}t.jsonl` : `${uf}-${t}t.jsonl`);
    for (const l of (await readFile(f, 'utf8')).split('\n')) {
      if (!l) continue; const x = JSON.parse(l);
      const o = S.get(`${uf}/${x.municipio}/${x.zona}/${x.secao}`)?.[t]; if (o && !x.erro) o.log = { votos: x.votos, ...x.vias };
    }
  }
  for (const [id, p] of await perfil2022(uf)) { const o = S.get(id); if (o) o.p = p; }
  return S;
}

function painel(S, variante) {
  const ex = {}; const x = (m) => { ex[m] = (ex[m] ?? 0) + 1; };
  const rows = [];
  for (const [id, o] of S) {
    const a = o[2], b = o[1], p = o.p;
    if (!a?.comp || !b?.comp) { x('sem os dois turnos'); continue; }
    if (!a.log || !b.log) { x('sem diário'); continue; }
    if (a.log.votos !== a.comp || b.log.votos !== b.comp) { x('diário ≠ BU'); continue; }
    if (a.v13 + a.v22 < 20 || b.v13 + b.v22 < 20) { x('< 20 votos'); continue; }
    if (!p?.el) { x('sem perfil'); continue; }
    if (!(a.aptos > 0) || !(b.aptos > 0)) { x('sem aptos'); continue; }
    const f = variante === 'adendo'
      ? ['v2', 'v3m', 'v3s'].map((v) => a.log[v] / a.aptos - b.log[v] / b.aptos).concat([a.log.votos / a.aptos - b.log.votos / b.aptos])
      : ['v2', 'v3m', 'v3s'].map((v) => (a.log[v] - b.log[v]) / a.aptos).concat([(a.log.votos - b.log.votos) / a.aptos]);
    const tam = variante === 'adendo' ? Math.log(a.aptos) : Math.log(p.el);
    rows.push({ g: `${id.split('/').slice(0, 3).join('/')}/${a.local}`, w: a.v13 + a.v22, y: a.v13 / (a.v13 + a.v22) - b.v13 / (b.v13 + b.v22), modelo: (a.modelo || '#nulo#').toLowerCase(),
      f, c: [1 - p.bio / p.el, p.i60 / p.el, p.i16 / p.el, p.eb / p.el, p.sup / p.el, tam] });
  }
  const cont = {}; for (const r of rows) cont[r.modelo] = (cont[r.modelo] ?? 0) + 1;
  const base = MODELOS.filter((m) => cont[m]).at(-1); const outros = MODELOS.filter((m) => cont[m] && m !== base);
  for (const r of rows) r.x = [...r.f, ...r.c, ...outros.map((m) => (r.modelo === m ? 1 : 0))];
  const fit = ols(rows, ['eV2', 'eV3m', 'eV3s', 'dC', 'sb', 'p60', 'p16', 'pb', 'ps', 'logTam', ...outros], 4);
  return { ...fit, exclusoes: ex };
}

const modelos2022 = new Map();
for (const r of await csv(path.join(EST, 'h13-final', 'adendo1', 'secoes-2022.csv'), ';')) modelos2022.set(r.id, r.modelo_2 ?? '');
const res = {};
const { db } = await abrirLeitura();
for (const uf of UFS) {
  const s26 = await carregar2026(uf, db);
  res[uf] = { 2026: { adendo: painel(s26, 'adendo'), parecer54: painel(s26, 'parecer54') } };
  s26.clear();
  const s22 = await carregar2022(uf, modelos2022);
  res[uf][2022] = { adendo: painel(s22, 'adendo') };
  console.error(uf, JSON.stringify({ 2026: res[uf][2026].adendo, 2022: res[uf][2022].adendo }));
}
db.close();
await writeFile(path.join(C, '54', 'adendo.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
