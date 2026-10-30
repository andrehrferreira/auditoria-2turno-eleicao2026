// Cético revisor, parecer 48 (H13, sinal V2 em MG, 2022 × 2026): reprodução do teste do doc 24 do estatístico por caminho
// próprio, mais as variantes que o parecer pede.
//
// Caminho próprio (o que NÃO vem da cadeia do estatístico):
//   2022: votos de 13 e 22, comparecimento, aptos e local do próprio boletim de urna (.bu) de cada seção
//         (cetico-48-bu2022.mjs → cetico/48/bu2022.csv); perfil do eleitorado lido aqui do perfil_eleitor_secao_2022_MG.zip;
//         V2 e V3 (total) do boletim (V2 = comparecimento − CompBiometrico; V3 = LibCodigo).
//   2026: votos, comparecimento, local, modelo da urna e as três contagens do boletim (sem_biometria, por_biometria,
//         por_biografia) do banco (cópia de leitura); aptos de secao_eleicao; perfil de forense/perfil/mg.csv.
//   Regressão: código próprio (eliminação de Gauss com pivô, não Cholesky), efeito fixo de local por desvio da média
//   ponderada, CR1 por local.
// O que vem da cadeia do estatístico: a divisão V3m/V3s (só o diário separa), lida das saídas do diário de 2022
// (diario2022/<t>t.jsonl) e de 2026 (h08 e h08-uniao), e o modelo da urna de 2022 (secoes-2022.csv, do detalhe).
//
// Especificações (todas com controles: sem biometria do cadastro, 60+, 16–24, escolaridade baixa, superior, log do
// eleitorado e indicadores de modelo de urna; peso 13 + 22 do 2º turno; efeito fixo de local do 2º turno):
//   R  réplica do doc 24: e_V2, e_V3m, e_V3s, Δc do diário, ÷ eleitores do perfil;
//   B  só boletim: e_V2 e e_V3 (total) do boletim, Δc do boletim, ÷ eleitores do perfil (não usa diário nem tradução);
//   A  como R, mas ÷ aptos do boletim (2º turno) em vez do perfil (seções agregadas não inflam o denominador);
//   F  faixas de sem biometria no cadastro: uma inclinação de e_V2 por faixa, para comparar os anos na mesma faixa;
//   P  pesos de 2022 refeitos para a distribuição de sem biometria de 2026 (faixas de 5 pontos), suporte comum;
//   V3 contraste V3m − V3s e V3 total, nos dois anos.
// Uso: node --max-old-space-size=8000 scripts/auditoria/cetico-48-modelo.mjs
// Saída: data/parsed/auditoria/cetico/48/modelo.json
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
for (const a of db.prepare("SELECT municipio, zona, secao, max(aptos) aptos FROM secao_eleicao WHERE uf = 'mg' AND turno = 2 GROUP BY 1, 2, 3").iterate()) {
  const o = s26.get(`mg/${a.municipio}/${a.zona}/${a.secao}`); if (o) o.aptos = a.aptos;
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
      el, aptos: ano === 2026 ? o.aptos : a.aptos,
      d: { v2: a.log.v2 - b.log.v2, v3m: a.log.v3m - b.log.v3m, v3s: a.log.v3s - b.log.v3s, c: a.comp - b.comp, v2bu: a.v2bu - b.v2bu, v3bu: a.v3bu - b.v3bu },
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
const res = { amostra: {}, R: {}, B: {}, A: {}, F: {}, P: {}, V3: {}, testes: {} };
for (const ano of [2026, 2022]) {
  const { rows, ex, modelos, base, nomesCtrl } = PN[ano];
  res.amostra[ano] = { secoes: rows.length, exclusoes: ex, modelos, base };
  const R = ols(rows, (r) => [r.d.v2 / r.el, r.d.v3m / r.el, r.d.v3s / r.el, r.d.c / r.el, ...r.ctrl], ['eV2', 'eV3m', 'eV3s', 'dC', ...nomesCtrl]);
  res.R[ano] = limpa(R);
  res.V3[ano] = { 'V3m − V3s': (() => { const a = R.coef.eV3m, b = R.coef.eV3s; const d = a.b - b.b, se = Math.sqrt(a.se ** 2 + b.se ** 2 - 2 * R.cov('eV3m', 'eV3s')); return { b: +d.toFixed(3), se: +se.toFixed(3), z: +(d / se).toFixed(2) }; })() };
  const B = ols(rows, (r) => [r.d.v2bu / r.el, r.d.v3bu / r.el, r.d.c / r.el, ...r.ctrl], ['eV2bu', 'eV3bu', 'dC', ...nomesCtrl]);
  res.B[ano] = limpa(B);
  // B2: V2 do diário + V3 total do boletim; B3: V2 do boletim + V3m/V3s do diário (separa o efeito da medida da V2
  // do efeito de juntar V3m e V3s); concordância seção a seção entre a V2 do diário e a do boletim
  res.B[ano].B2 = limpa(ols(rows, (r) => [r.d.v2 / r.el, r.d.v3bu / r.el, r.d.c / r.el, ...r.ctrl], ['eV2', 'eV3bu', 'dC', ...nomesCtrl]));
  res.B[ano].B3 = limpa(ols(rows, (r) => [r.d.v2bu / r.el, r.d.v3m / r.el, r.d.v3s / r.el, r.d.c / r.el, ...r.ctrl], ['eV2bu', 'eV3m', 'eV3s', 'dC', ...nomesCtrl]));
  {
    const S = ano === 2026 ? s26 : s22;
    const c = { secoes: rows.length, t1iguais: 0, t2iguais: 0, deltaIgual: 0, somaAbsDifDelta: 0 };
    for (const r of rows) { const o = S.get(r.id); if (o[1].log.v2 === o[1].v2bu) c.t1iguais++; if (o[2].log.v2 === o[2].v2bu) c.t2iguais++; if (r.d.v2 === r.d.v2bu) c.deltaIgual++; c.somaAbsDifDelta += Math.abs(r.d.v2 - r.d.v2bu); }
    res.B[ano].concordanciaV2 = c;
  }
  // A2: réplica só nas seções em que perfil e aptos diferem menos de 10% (fora seções que recebem agregadas)
  const rP = rows.filter((r) => r.aptos > 0 && Math.abs(r.aptos - r.el) / r.el < 0.1);
  res.A[`${ano}_perfilPertoDeAptos`] = limpa(ols(rP, (r) => [r.d.v2 / r.el, r.d.v3m / r.el, r.d.v3s / r.el, r.d.c / r.el, ...r.ctrl], ['eV2', 'eV3m', 'eV3s', 'dC', ...nomesCtrl]));
  const rA = rows.filter((r) => r.aptos > 0);
  res.A[ano] = limpa(ols(rA, (r) => [r.d.v2 / r.aptos, r.d.v3m / r.aptos, r.d.v3s / r.aptos, r.d.c / r.aptos, ...r.ctrl], ['eV2', 'eV3m', 'eV3s', 'dC', ...nomesCtrl]));
  // F: inclinação de e_V2 por faixa de sem biometria no cadastro
  const FX = [[0, 0.15], [0.15, 0.30], [0.30, 0.50], [0.50, 1.01]];
  const nomeF = FX.map(([a, b]) => `eV2_sb${Math.round(a * 100)}a${Math.round(Math.min(b, 1) * 100)}`);
  const faixa = (sb) => FX.findIndex(([a, b]) => sb >= a && sb < b);
  const F = ols(rows, (r) => [...FX.map((_, k) => (faixa(r.sb) === k ? r.d.v2 / r.el : 0)), r.d.v3m / r.el, r.d.v3s / r.el, r.d.c / r.el, ...r.ctrl], [...nomeF, 'eV3m', 'eV3s', 'dC', ...nomesCtrl]);
  res.F[ano] = { ...limpa(F), secoesPorFaixa: Object.fromEntries(nomeF.map((nm, k) => [nm, rows.filter((r) => faixa(r.sb) === k).length])), pesoPorFaixa: Object.fromEntries(nomeF.map((nm, k) => [nm, +(rows.filter((r) => faixa(r.sb) === k).reduce((s, r) => s + r.w, 0) / rows.reduce((s, r) => s + r.w, 0)).toFixed(3)])) };
  // interação contínua e_V2 × (sb − média)
  const msb = rows.reduce((s, r) => s + r.w * r.sb, 0) / rows.reduce((s, r) => s + r.w, 0);
  res.F[ano].interacao = limpa(ols(rows, (r) => [r.d.v2 / r.el, (r.d.v2 / r.el) * (r.sb - msb), r.d.v3m / r.el, r.d.v3s / r.el, r.d.c / r.el, ...r.ctrl], ['eV2', 'eV2_x_sb', 'eV3m', 'eV3s', 'dC', ...nomesCtrl]));
  res.F[ano].interacao.mediaSb = +msb.toFixed(4);
}
// P: 2022 com pesos refeitos para a distribuição de sb de 2026 (faixas de 5 pontos; faixas sem as duas amostras saem)
{
  const bin = (sb) => Math.min(19, Math.max(0, Math.floor(sb * 20)));
  const dist = (rows) => { const d = new Array(20).fill(0); let s = 0; for (const r of rows) { d[bin(r.sb)] += r.w; s += r.w; } return d.map((v) => v / s); };
  const d26 = dist(PN[2026].rows), d22 = dist(PN[2022].rows);
  const rows = PN[2022].rows.filter((r) => d26[bin(r.sb)] > 0 && d22[bin(r.sb)] > 0).map((r) => ({ ...r, w: r.w * d26[bin(r.sb)] / d22[bin(r.sb)] }));
  const r26 = PN[2026].rows.filter((r) => d26[bin(r.sb)] > 0 && d22[bin(r.sb)] > 0);
  const R22 = ols(rows, (r) => [r.d.v2 / r.el, r.d.v3m / r.el, r.d.v3s / r.el, r.d.c / r.el, ...r.ctrl], ['eV2', 'eV3m', 'eV3s', 'dC', ...PN[2022].nomesCtrl]);
  const R26 = ols(r26, (r) => [r.d.v2 / r.el, r.d.v3m / r.el, r.d.v3s / r.el, r.d.c / r.el, ...r.ctrl], ['eV2', 'eV3m', 'eV3s', 'dC', ...PN[2026].nomesCtrl]);
  const msb = (rs) => rs.reduce((s, r) => s + r.w * r.sb, 0) / rs.reduce((s, r) => s + r.w, 0);
  res.P = { distribuicaoSb: { 2026: d26.map((v) => +v.toFixed(3)), 2022: d22.map((v) => +v.toFixed(3)) }, sbMedio: { '2022 original': +msb(PN[2022].rows).toFixed(4), '2022 repesado': +msb(rows).toFixed(4), 2026: +msb(r26).toFixed(4) }, 2022: limpa(R22), 2026: limpa(R26) };
  const d = R26.coef.eV2.b - R22.coef.eV2.b, se = Math.hypot(R26.coef.eV2.se, R22.coef.eV2.se);
  res.P.diferenca = { b: +d.toFixed(3), se: +se.toFixed(3), z: +(d / se).toFixed(2) };
}
// testes declarados (réplica) e poder
{
  const a = res.R[2026].eV2, b = res.R[2022].eV2;
  const d = a.b - b.b, se = Math.hypot(a.se, b.se);
  res.testes = {
    T1: b, T2: { b: +d.toFixed(3), se: +se.toFixed(3), z: +(d / se).toFixed(2), ic95: [+(d - 1.96 * se).toFixed(2), +(d + 1.96 * se).toFixed(2)] },
    mde80_T1: +((Z_B + 0.84) * b.se).toFixed(2), mde80_T2: +((Z_B + 0.84) * se).toFixed(2),
    razao2026sobre2022_ic95: (() => { // delta method aproximado, erros independentes
      const r = a.b / b.b, ser = Math.abs(r) * Math.sqrt((a.se / a.b) ** 2 + (b.se / b.b) ** 2);
      return { r: +r.toFixed(3), ic95: [+(r - 1.96 * ser).toFixed(2), +(r + 1.96 * ser).toFixed(2)] };
    })(),
  };
  const ab = res.B[2026].eV2bu, bb = res.B[2022].eV2bu, db_ = ab.b - bb.b, seb = Math.hypot(ab.se, bb.se);
  res.testes.T2_soBoletim = { b: +db_.toFixed(3), se: +seb.toFixed(3), z: +(db_ / seb).toFixed(2) };
  const aa = res.A[2026].eV2, ba = res.A[2022].eV2, da = aa.b - ba.b, sea = Math.hypot(aa.se, ba.se);
  res.testes.T2_aptos = { b: +da.toFixed(3), se: +sea.toFixed(3), z: +(da / sea).toFixed(2) };
  const v3a = res.R[2026].eV3m, v3b = res.R[2022].eV3m, dv = v3a.b - v3b.b, sev = Math.hypot(v3a.se, v3b.se);
  res.testes.V3m_2026_menos_2022 = { b: +dv.toFixed(3), se: +sev.toFixed(3), z: +(dv / sev).toFixed(2) };
  const t3a = res.B[2026].eV3bu, t3b = res.B[2022].eV3bu, dt = t3a.b - t3b.b, set = Math.hypot(t3a.se, t3b.se);
  res.testes.V3total_2026_menos_2022 = { b: +dt.toFixed(3), se: +set.toFixed(3), z: +(dt / set).toFixed(2) };
}
// descritivo: parcela de cada via nos votos (seções do painel) e e_V2 médio
res.descritivo = {};
for (const ano of [2026, 2022]) {
  const S = ano === 2026 ? s26 : s22;
  const tot = { 1: { c: 0, v2bu: 0, v3bu: 0 }, 2: { c: 0, v2bu: 0, v3bu: 0 } };
  for (const r of PN[ano].rows) for (const t of [1, 2]) { const o = S.get(r.id)[t]; tot[t].c += o.comp; tot[t].v2bu += o.v2bu; tot[t].v3bu += o.v3bu; }
  const sw = PN[ano].rows.reduce((s, r) => s + r.w, 0);
  res.descritivo[ano] = {
    parcelaV2bu: { 1: +(tot[1].v2bu / tot[1].c).toFixed(4), 2: +(tot[2].v2bu / tot[2].c).toFixed(4) }, parcelaV3bu: { 1: +(tot[1].v3bu / tot[1].c).toFixed(4), 2: +(tot[2].v3bu / tot[2].c).toFixed(4) },
    sbCadastroMedioPonderado: +(PN[ano].rows.reduce((s, r) => s + r.w * r.sb, 0) / sw).toFixed(4),
    deltaV2sobreDeltaC: +(PN[ano].rows.reduce((s, r) => s + r.d.v2, 0) / PN[ano].rows.reduce((s, r) => s + r.d.c, 0)).toFixed(4),
  };
}
await writeFile(path.join(SAIDA, 'modelo.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
