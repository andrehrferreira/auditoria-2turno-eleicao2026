// Cético revisor, parecer 51 (H13, sinal V2 no Sul, 2022 × 2026; doc 26 do estatístico, adendo 6 do plano 16):
// reprodução do teste declarado por caminho próprio, mais as variantes que o parecer pede.
//
// Caminho próprio (o que NÃO vem da cadeia do estatístico):
//   2022: votos de 13 e 22, comparecimento, local e vias do boletim (V2 = comparecimento − [2]; V3 = [1]) do .bu de cada
//         seção (sul2022/bu2022-<uf>.csv, conferido seção a seção no bruto pelo cetico-51-bruto.mjs, que extrai com o
//         7-Zip oficial); perfil do eleitorado lido aqui do perfil_eleitor_secao_2022_<UF>.zip do TSE.
//   2026: votos, comparecimento, local, modelo da urna e sem_biometria do banco (cópia de leitura); perfil de forense/perfil.
//   Regressão: código do parecer 48 (eliminação de Gauss com pivô, não Cholesky), efeito fixo de local por desvio da
//   média ponderada, CR1 por local.
// Da cadeia do estatístico: a divisão V3m/V3s e a V2 do diário (diario2022/<uf>-<t>t.jsonl; 2026: h08 e h08-uniao) e o
// modelo da urna de 2022 (secoes-2022.csv, do detalhe).
//
// Especificações, por unidade (PR, SC, RS, Sul e Sul sem PR):
//   R  réplica do doc 26 (V2, V3m, V3s e Δc do diário ÷ eleitores do perfil); T1 a T4 do adendo 6, com o repeso P;
//   B  só boletim em 2022 e em 2026 (V2 e V3 total do boletim; Δc do boletim);
//   S  sem o controle da fração sem biometria (sensibilidade do adendo 1 do parecer 48);
//   PU repeso por UF × faixa de 5 pontos (no Sul, iguala também a mistura de UFs);
//   F  uma inclinação de e_V2 por faixa de sem biometria (as do adendo 6).
// Uso: node --max-old-space-size=8000 scripts/auditoria/cetico-51-modelo.mjs
// Saída: data/parsed/auditoria/cetico/51/modelo.json
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { dividirCsv, linhasZip, pad } from './forense-lib.mjs';

const EST = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico');
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', '51');
await mkdir(SAIDA, { recursive: true });
const UFS = ['pr', 'sc', 'rs'];
const Z16 = 2.9552, Z8 = 2.7344; // Bonferroni bicaudal a 5% para 16 e para 8 testes
const csv = async (f) => { const L = (await readFile(f, 'utf8')).split('\n').filter(Boolean); const cab = dividirCsv(L[0]); return L.slice(1).map((l) => { const c = dividirCsv(l); return Object.fromEntries(cab.map((k, i) => [k, c[i]])); }); };
const n = (v) => (v === '' || v == null ? null : Number(v));
const lista = UFS.map((u) => `'${u}'`).join(',');

// ======================= 2026 =======================
const s26 = new Map();
const { db } = await abrirLeitura();
for (const r of db.prepare(`SELECT uf, turno, municipio, zona, secao, local, comparecimento c, sem_biometria sb, por_biografia pg, modelo_urna m FROM secao WHERE uf IN (${lista})`).iterate()) {
  const id = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
  const o = s26.get(id) ?? { uf: r.uf }; s26.set(id, o);
  o[r.turno] = { local: r.local, comp: r.c, v2bu: r.sb, v3bu: r.pg, modelo: (r.m ?? '').toLowerCase(), v13: 0, v22: 0 };
}
for (const v of db.prepare(`SELECT uf, turno, municipio, zona, secao, numero, quantidade q FROM voto_bu WHERE uf IN (${lista}) AND cargo = 1 AND numero IN (13, 22)`).iterate()) {
  const t = s26.get(`${v.uf}/${v.municipio}/${v.zona}/${v.secao}`)?.[v.turno];
  if (t) t[v.numero === 13 ? 'v13' : 'v22'] += v.q;
}
db.close();
for (const t of [1, 2]) {
  for (const dir of [path.join(EST, 'h08', `${t}t`), path.join(EST, 'h08-uniao', `${t}t`)]) {
    for (const f of (await readdir(dir)).filter((x) => x.endsWith('.secoes.jsonl') && (UFS.some((u) => x.startsWith(`${u}-`)) || x === 'selecao.secoes.jsonl')).sort()) {
      for (const l of (await readFile(path.join(dir, f), 'utf8')).split('\n')) {
        if (!l) continue;
        const x = JSON.parse(l);
        const o = s26.get(`${x.uf}/${x.municipio}/${x.zona}/${x.secao}`)?.[t];
        if (o) o.log = { votos: x.votos, ...x.vias };
      }
    }
  }
}
for (const uf of UFS) for (const p of await csv(path.join(DIR_DADOS, 'parsed', 'auditoria', 'forense', 'perfil', `${uf}.csv`))) {
  const o = s26.get(`${uf}/${p.municipio}/${p.zona}/${p.secao}`);
  if (o) o.perfil = { eleitores: n(p.eleitores), biometria: n(p.biometria), idade60: n(p.idade60), idade16a24: n(p.idade16a24), escol_baixa: n(p.escol_baixa), superior: n(p.superior) };
}

// ======================= 2022 =======================
const s22 = new Map();
for (const uf of UFS) for (const r of await csv(path.join(EST, 'h13-v2', 'sul2022', `bu2022-${uf}.csv`))) {
  const o = s22.get(r.id) ?? { uf }; s22.set(r.id, o);
  const comp = n(r.comp), lib = n(r.lib), cb = n(r.compBio);
  o[r.turno] = { local: n(r.local), comp, v2bu: comp - cb, v3bu: lib, v13: n(r.v13), v22: n(r.v22) };
}
for (const uf of UFS) for (const t of [1, 2]) {
  for (const l of (await readFile(path.join(EST, 'h13-v2', 'diario2022', `${uf}-${t}t.jsonl`), 'utf8')).split('\n')) {
    if (!l) continue;
    const x = JSON.parse(l);
    const o = s22.get(`${uf}/${x.municipio}/${x.zona}/${x.secao}`)?.[t];
    if (o && !x.erro) o.log = { votos: x.votos, ...x.vias };
  }
}
for (const uf of UFS) {
  let idx = null;
  const P = new Map();
  for await (const [, linha] of linhasZip(path.join(DIR_DADOS, 'raw', 'dadosabertos', 'perfil_eleitor_secao', `perfil_eleitor_secao_2022_${uf.toUpperCase()}.zip`))) {
    const c = dividirCsv(linha).map((x) => x.replaceAll('"', '').trim());
    if (!idx) { idx = Object.fromEntries(c.map((k, i) => [k, i])); continue; }
    const id = `${uf}/${pad(c[idx.CD_MUNICIPIO], 5)}/${pad(c[idx.NR_ZONA], 4)}/${pad(c[idx.NR_SECAO], 4)}`;
    const p = P.get(id) ?? { eleitores: 0, biometria: 0, idade60: 0, idade16a24: 0, escol_baixa: 0, superior: 0 };
    P.set(id, p);
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
function painel(S, ufs) {
  const ex = {};
  const exc = (m) => { ex[m] = (ex[m] ?? 0) + 1; };
  const rows = [];
  for (const [id, o] of S) {
    if (!ufs.includes(o.uf)) continue;
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
      id, uf: o.uf, g: `${id.split('/').slice(0, 3).join('/')}/${a.local}`, w: a.v13 + a.v22, y: Y(a) - Y(b), modelo: a.modelo || '#nulo#', el,
      d: { v2: a.log.v2 - b.log.v2, v3m: a.log.v3m - b.log.v3m, v3s: a.log.v3s - b.log.v3s, c: a.comp - b.comp, v2bu: a.v2bu - b.v2bu, v3bu: a.v3bu - b.v3bu },
      sb: 1 - p.biometria / el, parcV2_2: a.v2bu / a.comp,
      ctrl0: [1 - p.biometria / el, p.idade60 / el, p.idade16a24 / el, p.escol_baixa / el, p.superior / el, Math.log(el)],
    });
  }
  const cont = {};
  for (const r of rows) cont[r.modelo] = (cont[r.modelo] ?? 0) + 1;
  const base = MODELOS.filter((m) => cont[m]).at(-1);
  const outros = MODELOS.filter((m) => cont[m] && m !== base);
  for (const r of rows) r.ctrl = [...r.ctrl0, ...outros.map((m) => (r.modelo === m ? 1 : 0))];
  return { rows, ex, base, nomesCtrl: ['cadSemBio', 'p60', 'p16a24', 'pBaixa', 'pSup', 'logEle', ...outros] };
}

// ======================= regressão própria (parecer 48) =======================
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
function ols(rows, cols, nomes, nFoc) {
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
  let vivas = [...Array(K).keys()].filter((k) => X.some((x) => Math.abs(x[k]) > 1e-12));
  const retiradas = [];
  let k2, XtX, XtY, beta;
  for (;;) {
    k2 = vivas.length;
    XtX = vivas.map(() => new Array(k2).fill(0)); XtY = vivas.map(() => [0]);
    for (let i = 0; i < X.length; i++) for (let a = 0; a < k2; a++) { const xa = X[i][vivas[a]] * W[i]; XtY[a][0] += xa * Y[i]; for (let b = 0; b < k2; b++) XtX[a][b] += xa * X[i][vivas[b]]; }
    try { beta = resolver(XtX, XtY).map((r) => r[0]); break; } catch (e) {
      if (e.coluna === undefined || vivas[e.coluna] < nFoc) throw e;
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
  const out = { N, locais: gi, retiradas };
  vivas.forEach((k, a) => { if (k < nFoc) out[nomes[k]] = { b: +(beta[a] * 100).toFixed(3), se: +(Math.sqrt(V[a][a]) * 100).toFixed(3), z: +(beta[a] / Math.sqrt(V[a][a])).toFixed(2) }; });
  return out;
}
const FOC = ['eV2', 'eV3m', 'eV3s', 'dC'];
const R = (rows, nomesCtrl, semSb = false) => ols(rows, (r) => [r.d.v2 / r.el, r.d.v3m / r.el, r.d.v3s / r.el, r.d.c / r.el, ...(semSb ? r.ctrl.slice(1) : r.ctrl)], [...FOC, ...(semSb ? nomesCtrl.slice(1) : nomesCtrl)], 4);
const dif = (a, b) => { const d = a.b - b.b, se = Math.hypot(a.se, b.se); return { b: +d.toFixed(3), se: +se.toFixed(3), z: +(d / se).toFixed(2), ic95: [+(d - 1.96 * se).toFixed(2), +(d + 1.96 * se).toFixed(2)] }; };
const bin = (sb) => Math.min(19, Math.max(0, Math.floor(sb * 20)));
const FX = [[0, 0.15], [0.15, 0.30], [0.30, 0.50], [0.50, 1.01]];
const faixa = (sb) => FX.findIndex(([a, b]) => sb >= a && sb < b);
const media = (rs, f) => rs.reduce((s, r) => s + r.w * f(r), 0) / rs.reduce((s, r) => s + r.w, 0);

/** Repeso de 2022 para a distribuição de 2026; `chave` define a célula (faixa de 5 pontos, ou UF × faixa). */
function repeso(r26, r22, chave) {
  const dist = (rows) => { const d = new Map(); let s = 0; for (const r of rows) { const k = chave(r); d.set(k, (d.get(k) ?? 0) + r.w); s += r.w; } for (const [k, v] of d) d.set(k, v / s); return d; };
  const d26 = dist(r26), d22 = dist(r22);
  const comum = (r) => (d26.get(chave(r)) ?? 0) > 0 && (d22.get(chave(r)) ?? 0) > 0;
  return { r22: r22.filter(comum).map((r) => ({ ...r, w: (r.w * d26.get(chave(r))) / d22.get(chave(r)) })), r26: r26.filter(comum), fora22: r22.filter((r) => !comum(r)).length, fora26: r26.filter((r) => !comum(r)).length };
}

const UNIDADES = { PR: ['pr'], SC: ['sc'], RS: ['rs'], Sul: UFS, 'Sul sem PR': ['sc', 'rs'] };
const res = { cortes: { Z16, Z8 }, unidades: {} };
for (const [nome, ufs] of Object.entries(UNIDADES)) {
  const P = { 2026: painel(s26, ufs), 2022: painel(s22, ufs) };
  const u = { amostra: {}, R: {}, B: {}, S: {}, F: {}, descritivo: {} };
  for (const ano of [2026, 2022]) {
    const { rows, ex, base, nomesCtrl } = P[ano];
    u.amostra[ano] = { painel: rows.length, exclusoes: ex, base };
    u.R[ano] = R(rows, nomesCtrl);
    u.S[ano] = R(rows, nomesCtrl, true);
    u.B[ano] = ols(rows, (r) => [r.d.v2bu / r.el, r.d.v3bu / r.el, r.d.c / r.el, ...r.ctrl], ['eV2bu', 'eV3bu', 'dC', ...nomesCtrl], 3);
    const nomeF = FX.map(([a, b]) => `eV2_sb${Math.round(a * 100)}a${Math.round(Math.min(b, 1) * 100)}`);
    const usadas = FX.map((_, k) => rows.filter((r) => faixa(r.sb) === k).length >= 50);
    u.F[ano] = { ...ols(rows, (r) => [...FX.map((_, k) => (usadas[k] && faixa(r.sb) === k ? r.d.v2 / r.el : 0)).filter((_, k) => usadas[k]), r.d.v3m / r.el, r.d.v3s / r.el, r.d.c / r.el, ...r.ctrl], [...nomeF.filter((_, k) => usadas[k]), 'eV3m', 'eV3s', 'dC', ...nomesCtrl], usadas.filter(Boolean).length + 3),
      peso: Object.fromEntries(nomeF.map((nm, k) => [nm, +(rows.filter((r) => faixa(r.sb) === k).reduce((s, r) => s + r.w, 0) / rows.reduce((s, r) => s + r.w, 0)).toFixed(3)])) };
    // parcela da V2 do boletim no comparecimento do 2º turno, por faixa (o grupo sem biometria vota igual nos dois anos?)
    u.descritivo[ano] = { sbMedio: +media(rows, (r) => r.sb).toFixed(4), parcV2_2: +media(rows, (r) => r.parcV2_2).toFixed(4),
      parcV2PorFaixa: Object.fromEntries(FX.map(([a], k) => { const s = rows.filter((r) => faixa(r.sb) === k); return [`sb${Math.round(a * 100)}`, s.length ? +media(s, (r) => r.parcV2_2).toFixed(4) : null]; })),
      deltaV2sobreDeltaC: +(rows.reduce((s, r) => s + r.d.v2bu, 0) / rows.reduce((s, r) => s + r.d.c, 0)).toFixed(4) };
  }
  const b26 = u.R[2026].eV2, b22 = u.R[2022].eV2;
  const rp = repeso(P[2026].rows, P[2022].rows, (r) => bin(r.sb));
  const P22 = R(rp.r22, P[2022].nomesCtrl), P26 = R(rp.r26, P[2026].nomesCtrl);
  const ru = repeso(P[2026].rows, P[2022].rows, (r) => `${r.uf}|${bin(r.sb)}`);
  const U22 = R(ru.r22, P[2022].nomesCtrl), U26 = R(ru.r26, P[2026].nomesCtrl);
  u.P = { 2022: P22.eV2, 2026: P26.eV2, fora: { 2022: rp.fora22, 2026: rp.fora26 }, sbMedio: { '2022 repesado': +media(rp.r22, (r) => r.sb).toFixed(4), '2026 suporte': +media(rp.r26, (r) => r.sb).toFixed(4) } };
  u.PU = { 2022: U22.eV2, 2026: U26.eV2, dif: dif(U26.eV2, U22.eV2), fora: { 2022: ru.fora22, 2026: ru.fora26 } };
  const T = { T1: b22, T2: dif(b26, b22), T3: P22.eV2, T4: dif(P26.eV2, P22.eV2) };
  for (const t of Object.values(T)) { t.passa16 = Math.abs(t.z) >= Z16; t.passa8 = Math.abs(t.z) >= Z8; t.mde80_16 = +((Z16 + 0.84) * t.se).toFixed(2); }
  u.testes = T; u.b26 = b26;
  u.B.dif = dif(u.B[2026].eV2bu, u.B[2022].eV2bu);
  u.S.dif = dif(u.S[2026].eV2, u.S[2022].eV2);
  res.unidades[nome] = u;
  const f = (x) => (x ? `${x.b.toFixed(2)} (se ${x.se.toFixed(2)}, z ${x.z.toFixed(2)})` : '—');
  console.log(`\n== ${nome}: painel 2026 ${u.amostra[2026].painel} N ${u.R[2026].N} / 2022 ${u.amostra[2022].painel} N ${u.R[2022].N}`);
  console.log(`R 2026 ${f(b26)} | 2022 ${f(b22)} | V3m ${f(u.R[2026].eV3m)} / ${f(u.R[2022].eV3m)} | dC ${f(u.R[2026].dC)} / ${f(u.R[2022].dC)}`);
  for (const [k, t] of Object.entries(T)) console.log(`  ${k}: ${f(t)} ${t.ic95 ? `IC ${t.ic95.join(' a ')}` : ''} passa16 ${t.passa16} passa8 ${t.passa8} mde80 ${t.mde80_16}`);
  console.log(`B (só boletim) 2026 ${f(u.B[2026].eV2bu)} | 2022 ${f(u.B[2022].eV2bu)} | dif ${f(u.B.dif)}`);
  console.log(`S (sem cadSemBio) 2026 ${f(u.S[2026].eV2)} | 2022 ${f(u.S[2022].eV2)}`);
  console.log(`PU (UF × faixa) 2026 ${f(u.PU[2026])} | 2022 ${f(u.PU[2022])} | dif ${f(u.PU.dif)}`);
  console.log(`F 2026 ${JSON.stringify(u.F[2026])}`);
  console.log(`F 2022 ${JSON.stringify(u.F[2022])}`);
  console.log(`desc ${JSON.stringify(u.descritivo)} exclusoes ${JSON.stringify(u.amostra)}`);
}
await writeFile(path.join(SAIDA, 'modelo.json'), JSON.stringify(res, null, 1));
