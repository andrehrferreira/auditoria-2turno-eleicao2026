// Cético revisor, parecer 54 (H13, fechamento): reprodução própria dos 5 testes que passam CONTRA o 13 no nível do 2º turno
// (ES V2, RJ V2, SP V2, SP V3m, SP V3s; doc 28, tabela 1.6) e do mesmo modelo no 1º turno (N1), para conferir se a
// associação "já estava no 1º turno". Também o painel (P) das mesmas UFs, para ver se o 2º turno acrescenta algo.
//
// Caminho próprio, sem importar estatistico-h13-final-lib.mjs: banco de leitura (secao, voto_bu), vias do diário
// (h08 + h08-uniao), perfil forense/perfil/<uf>.csv; regressão por eliminação de Gauss com pivô, efeito fixo de local do
// turno do desfecho (no painel, o do 2º), peso 13 + 22 do turno, CR1 por local. Exclusões como no plano 27, seção 3.
// Uso: node --max-old-space-size=12000 scripts/auditoria/cetico-54-nivel.mjs [--ufs es,rj,sp]
//      node --max-old-space-size=12000 scripts/auditoria/cetico-54-nivel.mjs --painel --ufs <27 UFs>  (painel com 3 denominadores:
//      perfil, como no plano; aptos do BU; só seções com perfil a menos de 10% dos aptos (A2); perfil, sem as seções com perfil abaixo da metade dos aptos (Q)) → painel-denominador.json
// Saída: data/parsed/auditoria/cetico/54/nivel.json
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { dividirCsv } from './forense-lib.mjs';

const { values } = parseArgs({ options: { ufs: { type: 'string', default: 'es,rj,sp' }, painel: { type: 'boolean' } } });
const EST = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico');
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', '54');
await mkdir(SAIDA, { recursive: true });
const MODELOS = ['ue2009', 'ue2010', 'ue2011', 'ue2013', 'ue2015', 'ue2020', 'ue2022'];

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

const res = {};
const { db } = await abrirLeitura();
for (const uf of values.ufs.split(',')) {
  const S = new Map();
  for (const t of [1, 2]) {
    for (const r of db.prepare('SELECT municipio, zona, secao, local, comparecimento c, modelo_urna m FROM secao WHERE uf = ? AND turno = ?').iterate(uf, t)) {
      const id = `${uf}/${r.municipio}/${r.zona}/${r.secao}`;
      const o = S.get(id) ?? {}; S.set(id, o);
      o[t] = { local: r.local, comp: r.c, modelo: (r.m ?? '').toLowerCase(), v13: 0, v22: 0 };
    }
    for (const v of db.prepare('SELECT municipio, zona, secao, numero, quantidade q FROM voto_bu WHERE uf = ? AND turno = ? AND cargo = 1 AND numero IN (13, 22)').iterate(uf, t)) {
      const o = S.get(`${uf}/${v.municipio}/${v.zona}/${v.secao}`)?.[t]; if (o) o[v.numero === 13 ? 'v13' : 'v22'] += v.q;
    }
    for (const dir of [path.join(EST, 'h08', `${t}t`), path.join(EST, 'h08-uniao', `${t}t`)]) {
      for (const f of (await readdir(dir)).filter((x) => x.endsWith('.secoes.jsonl') && (x.startsWith(`${uf}-`) || x === 'selecao.secoes.jsonl')).sort()) {
        for (const l of (await readFile(path.join(dir, f), 'utf8')).split('\n')) {
          if (!l) continue; const x = JSON.parse(l); if (x.uf !== uf) continue;
          const o = S.get(`${uf}/${x.municipio}/${x.zona}/${x.secao}`)?.[t]; if (o) o.log = { votos: x.votos, ...x.vias };
        }
      }
    }
  }
  for (const a of db.prepare('SELECT municipio, zona, secao, max(aptos) aptos FROM secao_eleicao WHERE uf = ? AND turno = 2 GROUP BY 1, 2, 3').iterate(uf)) {
    const o = S.get(`${uf}/${a.municipio}/${a.zona}/${a.secao}`); if (o) o.aptos = a.aptos;
  }
  const L = (await readFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'forense', 'perfil', `${uf}.csv`), 'utf8')).split('\n').filter(Boolean);
  const cab = dividirCsv(L[0]);
  for (const l of L.slice(1)) {
    const c = Object.fromEntries(dividirCsv(l).map((v, i) => [cab[i], v]));
    const o = S.get(`${uf}/${c.municipio}/${c.zona}/${c.secao}`);
    if (o) o.p = { el: Number(c.eleitores), bio: Number(c.biometria), i60: Number(c.idade60), i16: Number(c.idade16a24), eb: Number(c.escol_baixa), sup: Number(c.superior) };
  }
  const ctrl0 = (p) => [1 - p.bio / p.el, p.i60 / p.el, p.i16 / p.el, p.eb / p.el, p.sup / p.el, Math.log(p.el)];
  const Y = (t) => t.v13 / (t.v13 + t.v22);
  const linhas = (desf, den = 'perfil') => {
    const rows = []; const ex = {};
    const x = (m) => { ex[m] = (ex[m] ?? 0) + 1; };
    for (const [id, o] of S) {
      const p = o.p; const g0 = id.split('/').slice(0, 3).join('/');
      if (desf === 'P') {
        const a = o[2], b = o[1];
        if (!a?.comp || !b?.comp) { x('sem os dois turnos'); continue; }
        if (!a.log || !b.log) { x('sem diário'); continue; }
        if (a.log.votos !== a.comp || b.log.votos !== b.comp) { x('diário ≠ BU'); continue; }
        if (a.v13 + a.v22 < 20 || b.v13 + b.v22 < 20) { x('< 20'); continue; }
        if (!p?.el) { x('sem perfil'); continue; }
        if (den !== 'perfil' && !(o.aptos > 0)) { x('sem aptos'); continue; }
        if (den === 'A2' && Math.abs(o.aptos - p.el) / p.el >= 0.1) { x('perfil longe dos aptos'); continue; }
        if (den === 'Q' && p.el < 0.5 * o.aptos) { x('perfil abaixo da metade dos aptos'); continue; }
        const D = den === 'aptos' ? o.aptos : p.el;
        rows.push({ g: `${g0}/${a.local}`, w: a.v13 + a.v22, y: Y(a) - Y(b), modelo: a.modelo, f: [(a.log.v2 - b.log.v2) / D, (a.log.v3m - b.log.v3m) / D, (a.log.v3s - b.log.v3s) / D, (a.log.votos - b.log.votos) / D], c: ctrl0(p) });
      } else {
        const t = o[desf === 'N2' ? 2 : 1];
        if (!t?.comp) { x('sem a seção no turno'); continue; }
        if (!t.log) { x('sem diário'); continue; }
        if (t.log.votos !== t.comp) { x('diário ≠ BU'); continue; }
        if (t.v13 + t.v22 < 20) { x('< 20'); continue; }
        if (!p?.el) { x('sem perfil'); continue; }
        rows.push({ g: `${g0}/${t.local}`, w: t.v13 + t.v22, y: Y(t), modelo: t.modelo, f: [t.log.v2 / t.log.votos, t.log.v3m / t.log.votos, t.log.v3s / t.log.votos], c: ctrl0(p) });
      }
    }
    const cont = {}; for (const r of rows) cont[r.modelo] = (cont[r.modelo] ?? 0) + 1;
    const base = MODELOS.filter((m) => cont[m]).at(-1); const outros = MODELOS.filter((m) => cont[m] && m !== base);
    for (const r of rows) r.x = [...r.f, ...r.c, ...outros.map((m) => (r.modelo === m ? 1 : 0))];
    const nf = desf === 'P' ? ['eV2', 'eV3m', 'eV3s', 'dC'] : ['xV2', 'xV3m', 'xV3s'];
    return { fit: ols(rows, [...nf, 'sb', 'p60', 'p16', 'pb', 'ps', 'logEl', ...outros], nf.length), exclusoes: ex };
  };
  res[uf] = values.painel ? { P: linhas('P'), P_aptos: linhas('P', 'aptos'), P_A2: linhas('P', 'A2'), P_Q: linhas('P', 'Q') } : { N2: linhas('N2'), N1: linhas('N1'), P: linhas('P') };
  console.error(uf, JSON.stringify(Object.fromEntries(Object.entries(res[uf]).map(([k, v]) => [k, v.fit]))));
}
db.close();
await writeFile(path.join(SAIDA, values.painel ? 'painel-denominador.json' : 'nivel.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
