// Cético revisor, adendo ao parecer 48 (resposta ao doc 25 do estatístico): de onde vem a diferença entre o "Δc por apto"
// do parecer 48 (MG: +4,93 em 2026, +0,04 em 2022) e o doc 25 (+4,10 e +4,74). Mesmos dados e mesma regressão do
// cetico-48-modelo.mjs (copiados daqui), numa grade: regressores × controles × denominador, MG, 2026 e 2022.
//   regressores: Δc só; ΔV1 + ΔSD (boletim); Δc + e_V2 + e_V3m + e_V3s (como o parecer 48: Δc vira o efeito do votante pela digital);
//   controles: P (perfil + modelo de urna, os do parecer 48); C (c1, Y1, log aptos, aptos mudaram, modelo de urna, os do doc 25);
//              Csb (C + sem biometria do cadastro); PsemSb (C + perfil sem a fração sem biometria); PC (os dois);
//   denominador: aptos do 1º turno (doc 25) ou do 2º turno (parecer 48).
// Uso: node --max-old-space-size=8000 scripts/auditoria/cetico-48-comp.mjs → data/parsed/auditoria/cetico/48/comp.json
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { dividirCsv, linhasZip, pad } from './forense-lib.mjs';

const EST = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico');
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', '48');
const Z_B = 2.2414;
const csv = async (f) => { const L = (await readFile(f, 'utf8')).split('\n').filter(Boolean); const cab = dividirCsv(L[0]); return L.slice(1).map((l) => { const c = dividirCsv(l); return Object.fromEntries(cab.map((k, i) => [k, c[i]])); }); };
const n = (v) => (v === '' || v == null ? null : Number(v));

// ======================= 2026 =======================
const s26 = new Map();
const { db } = await abrirLeitura();
for (const r of db.prepare("SELECT turno, municipio, zona, secao, local, comparecimento c, sem_biometria sb, por_biometria pb, por_biografia pg, modelo_urna m FROM secao WHERE uf = 'mg'").iterate()) {
  const id = `mg/${r.municipio}/${r.zona}/${r.secao}`;
  const o = s26.get(id) ?? {}; s26.set(id, o);
  o[r.turno] = { local: r.local, comp: r.c, v2bu: r.sb, v1bu: r.pb, v3bu: r.pg, modelo: (r.m ?? '').toLowerCase(), v13: 0, v22: 0 };
}
for (const v of db.prepare("SELECT turno, municipio, zona, secao, numero, quantidade q FROM voto_bu WHERE uf = 'mg' AND cargo = 1 AND numero IN (13, 22)").iterate()) {
  const t = s26.get(`mg/${v.municipio}/${v.zona}/${v.secao}`)?.[v.turno];
  if (t) t[v.numero === 13 ? 'v13' : 'v22'] += v.q;
}
for (const a of db.prepare("SELECT turno, municipio, zona, secao, max(aptos) aptos FROM secao_eleicao WHERE uf = 'mg' GROUP BY 1, 2, 3, 4").iterate()) {
  const o = s26.get(`mg/${a.municipio}/${a.zona}/${a.secao}`)?.[a.turno]; if (o) o.aptos = a.aptos;
}
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
}
for (const p of await csv(path.join(DIR_DADOS, 'parsed', 'auditoria', 'forense', 'perfil', 'mg.csv'))) {
  const o = s26.get(`mg/${p.municipio}/${p.zona}/${p.secao}`);
  if (o) o.perfil = { eleitores: n(p.eleitores), biometria: n(p.biometria), idade60: n(p.idade60), idade16a24: n(p.idade16a24), escol_baixa: n(p.escol_baixa), superior: n(p.superior) };
}

// ======================= 2022 =======================
const s22 = new Map();
for (const r of await csv(path.join(SAIDA, 'bu2022.csv'))) {
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
// perfil 2022, lido aqui
const P = new Map();
{
  let idx = null;
  for await (const [, linha] of linhasZip(path.join(DIR_DADOS, 'raw', 'dadosabertos', 'perfil_eleitor_secao', 'perfil_eleitor_secao_2022_MG.zip'))) {
    const c = dividirCsv(linha).map((x) => x.replaceAll('"', '').trim());
    if (!idx) { idx = Object.fromEntries(c.map((k, i) => [k, i])); continue; }
    const id = `mg/${pad(c[idx.CD_MUNICIPIO], 5)}/${pad(c[idx.NR_ZONA], 4)}/${pad(c[idx.NR_SECAO], 4)}`;
    const p = P.get(id) ?? { eleitores: 0, biometria: 0, idade60: 0, idade16a24: 0, escol_baixa: 0, superior: 0 };
    P.set(id, p);
    const q = Number(c[idx.QT_ELEITORES_PERFIL]), f = Number(c[idx.CD_FAIXA_ETARIA]), e = Number(c[idx.CD_GRAU_ESCOLARIDADE]);
    p.eleitores += q; p.biometria += Number(c[idx.QT_ELEITORES_BIOMETRIA]);
    if (f >= 6000) p.idade60 += q;
    if (f >= 1600 && f <= 2124) p.idade16a24 += q;
    if (e >= 1 && e <= 3) p.escol_baixa += q;
    if (e === 8) p.superior += q;
  }
}
for (const [id, p] of P) { const o = s22.get(id); if (o) o.perfil = p; }
for (const r of await csv(path.join(EST, 'h13-v2', 'secoes-2022.csv'))) { const o = s22.get(r.id); if (o?.[2]) o[2].modelo = (r.modelo_2 ?? '').toLowerCase(); }

// ======================= painel =======================
const MODELOS = ['ue2009', 'ue2010', 'ue2011', 'ue2013', 'ue2015', 'ue2020', 'ue2022'];
function painel(S, ano) {
  const ex = {};
  const exc = (m) => { ex[m] = (ex[m] ?? 0) + 1; };
  const rows = [];
  for (const [id, o] of S) {
    const b = o[1], a = o[2];
    if (!a?.comp || !b?.comp) { exc('sem os dois turnos'); continue; }
    if (!a.log || !b.log) { exc('sem diário'); continue; }
    if (a.log.votos !== a.comp || b.log.votos !== b.comp) { exc('diário ≠ BU'); continue; }
    if (a.v13 + a.v22 < 20 || b.v13 + b.v22 < 20) { exc('< 20 votos'); continue; }
    const p = o.perfil;
    if (!p?.eleitores) { exc('sem perfil'); continue; }
    const Y = (t) => t.v13 / (t.v13 + t.v22);
    const el = p.eleitores;
    rows.push({
      id, g: `${id.split('/').slice(0, 3).join('/')}/${a.local}`, w: a.v13 + a.v22, y: Y(a) - Y(b), modelo: a.modelo || '#nulo#',
      el, aptos: a.aptos, ap1: b.aptos, c1: b.comp / b.aptos, Y1: Y(b), aptosMudou: a.aptos !== b.aptos ? 1 : 0,
      d: { v1: a.log.v1 - b.log.v1, v1bu: a.v1bu - b.v1bu, sdbu: (a.v2bu + a.v3bu) - (b.v2bu + b.v3bu), v2: a.log.v2 - b.log.v2, v3m: a.log.v3m - b.log.v3m, v3s: a.log.v3s - b.log.v3s, c: a.comp - b.comp, v2bu: a.v2bu - b.v2bu, v3bu: a.v3bu - b.v3bu },
      sb: 1 - p.biometria / el,
      ctrl0: [1 - p.biometria / el, p.idade60 / el, p.idade16a24 / el, p.escol_baixa / el, p.superior / el, Math.log(el)],
    });
  }
  const cont = {};
  for (const r of rows) cont[r.modelo] = (cont[r.modelo] ?? 0) + 1;
  const base = MODELOS.filter((m) => cont[m]).at(-1);
  const outros = MODELOS.filter((m) => cont[m] && m !== base);
  for (const r of rows) r.ctrl = [...r.ctrl0, ...outros.map((m) => (r.modelo === m ? 1 : 0))];
  return { rows, ex, modelos: cont, base, nomesCtrl: ['cadSemBio', 'p60', 'p16a24', 'pBaixa', 'pSup', 'logEle', ...outros] };
}

// ======================= regressão própria =======================
function resolver(A, B) { // A k×k, B k×m; eliminação de Gauss com pivô parcial; devolve A⁻¹B
  const k = A.length, m = B[0].length;
  const M = A.map((r, i) => [...r, ...B[i]]);
  const escala = Math.max(...A.map((r, i) => Math.abs(r[i])));
  for (let c = 0; c < k; c++) {
    let piv = c;
    for (let r = c + 1; r < k; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    if (Math.abs(M[piv][c]) < 1e-12 * escala) { const e = new Error('singular'); e.coluna = c; throw e; }
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = 0; r < k; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      if (f) for (let j = c; j < k + m; j++) M[r][j] -= f * M[c][j];
    }
  }
  return M.map((r, i) => r.slice(k).map((v) => v / M[i][i]));
}
function ols(rows, cols, nomes) {
  const grupos = new Map();
  rows.forEach((r, i) => { (grupos.get(r.g) ?? grupos.set(r.g, []).get(r.g)).push(i); });
  const K = nomes.length;
  const X = [], Y = [], W = [], G = [];
  let gi = 0;
  for (const ii of grupos.values()) {
    if (ii.length < 2) continue;
    let sw = 0, my = 0; const mx = new Array(K).fill(0);
    for (const i of ii) { const w = rows[i].w; sw += w; my += w * rows[i].y; const x = cols(rows[i]); for (let k = 0; k < K; k++) mx[k] += w * x[k]; }
    for (const i of ii) { const x = cols(rows[i]); X.push(x.map((v, k) => v - mx[k] / sw)); Y.push(rows[i].y - my / sw); W.push(rows[i].w); G.push(gi); }
    gi++;
  }
  // tira colunas sem variação dentro do local (indicador de modelo de urna ausente)
  let vivas = [...Array(K).keys()].filter((k) => X.some((x) => Math.abs(x[k]) > 1e-12));
  const retiradas = [];
  let k2, XtX, XtY, beta;
  for (;;) { // coluna colinear (só controle) sai e a conta recomeça
    k2 = vivas.length;
    XtX = vivas.map(() => new Array(k2).fill(0)); XtY = vivas.map(() => [0]);
    for (let i = 0; i < X.length; i++) for (let a = 0; a < k2; a++) { const xa = X[i][vivas[a]] * W[i]; XtY[a][0] += xa * Y[i]; for (let b = 0; b < k2; b++) XtX[a][b] += xa * X[i][vivas[b]]; }
    try { beta = resolver(XtX, XtY).map((r) => r[0]); break; } catch (e) {
      if (e.coluna === undefined || vivas[e.coluna] < 4) throw e;
      retiradas.push(nomes[vivas[e.coluna]]); vivas = vivas.filter((_, a) => a !== e.coluna);
    }
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
  const out = { N, locais: gi, coef: {}, retiradas };
  vivas.forEach((k, a) => { out.coef[nomes[k]] = { b: beta[a] * 100, se: Math.sqrt(V[a][a]) * 100, z: beta[a] / Math.sqrt(V[a][a]) }; });
  out.cov = (n1, n2) => { const a = vivas.indexOf(nomes.indexOf(n1)), b = vivas.indexOf(nomes.indexOf(n2)); return V[a][b] * 1e4; };
  return out;
}
const limpa = (r) => ({ N: r.N, locais: r.locais, retiradas: r.retiradas, ...Object.fromEntries(Object.entries(r.coef).filter(([k]) => !k.startsWith('ue') && !['cadSemBio', 'p60', 'p16a24', 'pBaixa', 'pSup', 'logEle'].includes(k)).map(([k, v]) => [k, { b: +v.b.toFixed(3), se: +v.se.toFixed(3), z: +v.z.toFixed(2) }])) });


const PN = { 2026: painel(s26, 2026), 2022: painel(s22, 2022) };
const out = {};
const CTRLP = (P) => P.nomesCtrl;
for (const ano of [2026, 2022]) {
  const P = PN[ano];
  const nm = P.nomesCtrl; // perfil (6) + modelos
  const modelosIdx = nm.slice(6);
  const ctrlSets = {
    P: { nomes: nm, f: (r) => r.ctrl },
    C: { nomes: ['c1', 'Y1', 'logAp', 'aptosMudou', ...modelosIdx], f: (r) => [r.c1, r.Y1, Math.log(r.ap1), r.aptosMudou, ...r.ctrl.slice(6)] },
    Csb: { nomes: ['c1', 'Y1', 'logAp', 'aptosMudou', 'cadSemBio', ...modelosIdx], f: (r) => [r.c1, r.Y1, Math.log(r.ap1), r.aptosMudou, r.ctrl[0], ...r.ctrl.slice(6)] },
    PsemSb: { nomes: ['c1', 'Y1', 'logAp', 'aptosMudou', ...nm.slice(1)], f: (r) => [r.c1, r.Y1, Math.log(r.ap1), r.aptosMudou, ...r.ctrl.slice(1)] },
    PC: { nomes: ['c1', 'Y1', 'logAp', 'aptosMudou', ...nm], f: (r) => [r.c1, r.Y1, Math.log(r.ap1), r.aptosMudou, ...r.ctrl] },
  };
  const rows = P.rows.filter((r) => r.ap1 > 0 && r.aptos > 0);
  out[ano] = { N: rows.length };
  for (const [den, D] of [['ap1', (r) => r.ap1], ['ap2', (r) => r.aptos]]) {
    const regs = {
      dc: { nomes: ['dC'], f: (r) => [r.d.c / D(r)] },
      v1sd: { nomes: ['dV1', 'dSD'], f: (r) => [r.d.v1bu / D(r), r.d.sdbu / D(r)] },
      vias: { nomes: ['dC', 'eV2', 'eV3m', 'eV3s'], f: (r) => [r.d.c / D(r), r.d.v2 / D(r), r.d.v3m / D(r), r.d.v3s / D(r)] },
      viasDiario: { nomes: ['dV1', 'dV2', 'dV3m', 'dV3s'], f: (r) => [r.d.v1 / D(r), r.d.v2 / D(r), r.d.v3m / D(r), r.d.v3s / D(r)] },
    };
    for (const [cn, C] of Object.entries(ctrlSets)) for (const [rn, R] of Object.entries(regs)) {
      const o = ols(rows, (r) => [...R.f(r), ...C.f(r)], [...R.nomes, ...C.nomes]);
      out[ano][`${den}|${cn}|${rn}`] = Object.fromEntries(R.nomes.map((k) => [k, o.coef[k] ? `${o.coef[k].b.toFixed(2)} (${o.coef[k].z.toFixed(1)})` : null]));
    }
  }
  // correlação dentro do local entre ΔV1 e ΔV3 (troca de via da mesma pessoa entre turnos)
  const g = new Map();
  for (const r of rows) { const o = g.get(r.g) ?? { w: 0, a: 0, b: 0, n: 0 }; o.w += r.w; o.a += r.w * r.d.v1 / r.ap1; o.b += r.w * (r.d.v3m + r.d.v3s) / r.ap1; o.n++; g.set(r.g, o); }
  let sab = 0, saa = 0, sbb = 0;
  for (const r of rows) { const o = g.get(r.g); if (o.n < 2) continue; const a = r.d.v1 / r.ap1 - o.a / o.w, b = (r.d.v3m + r.d.v3s) / r.ap1 - o.b / o.w; sab += r.w * a * b; saa += r.w * a * a; sbb += r.w * b * b; }
  out[ano].corrDentroDoLocal_dV1_dV3 = +(sab / Math.sqrt(saa * sbb)).toFixed(3);
}
await writeFile(path.join(SAIDA, 'comp.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
