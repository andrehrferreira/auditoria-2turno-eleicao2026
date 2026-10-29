// Cético (lente: reprodução e código) — achado "comparecimento-extra-sem-vies-biometria" (cientista-politico, E2).
// Refaz de forma independente a regressão por seção do autor (politico-biometria-crescimento.mjs), com:
//  - leitura própria do banco (uma passada por turno pelo índice de candidato, cargo 1 = presidente);
//  - invariantes: votos de presidente no BU = comparecimento; sem_biometria + por_biometria + por_biografia = comparecimento;
//  - erro-padrão robusto (HC1) e por conglomerado de município, que o autor não calcula;
//  - variante com "sem biometria cadastrada" e "liberado por ano de nascimento" separados;
//  - simulação de poder: injeta votos falsos (sem biometria, todos para um finalista) nos dados reais e mede
//    quanto o teste do autor se move.
// Uso: node scripts/auditoria/cetico-e2bio-reproducao.mjs [ufs separadas por vírgula | todas]
// Banco somente leitura. Saída: data/parsed/auditoria/cetico/e2bio-reproducao.json
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, writeFileSync } from 'node:fs';

const SAIDA = 'data/parsed/auditoria/cetico';
mkdirSync(SAIDA, { recursive: true });
const db = new DatabaseSync('data/db/eleicao2026.sqlite', { readOnly: true });
const ELEICAO = { 1: 6257, 2: 6258 };
const UFS_AUTOR = ['ac', 'al', 'am', 'ap', 'ba', 'ce', 'df', 'es', 'go', 'ma', 'mg', 'ms'];

// UFs com os dois turnos na tabela carga, com o número de seções declarado
const carga = db.prepare(`SELECT c1.uf, c1.secoes s1, c2.secoes s2 FROM carga c1 JOIN carga c2 ON c2.uf = c1.uf AND c2.turno = 2
  WHERE c1.turno = 1 ORDER BY c1.uf`).all();
const ufsTodas = carga.map((r) => r.uf);
console.error('UFs com 1º turno carregado:', ufsTodas.join(','));
const ufSet = new Set(ufsTodas);

// ---------- leitura ----------
const chave = (r) => `${r.uf}|${r.municipio}|${r.zona}|${r.secao}`;
const sec = [new Map(), new Map()];
const qSec = db.prepare(`SELECT uf, municipio, zona, secao, situacao, tipo_urna, comparecimento c, sem_biometria sb, por_biometria pb, por_biografia pg
  FROM secao WHERE turno = ? AND uf = ?`);
const contagem = {};
for (const t of [1, 2]) for (const uf of ufsTodas) {
  let n = 0;
  for (const r of qSec.iterate(t, uf)) { n++; sec[t - 1].set(chave(r), { ...r, L: 0, F: 0, E: 0, BN: 0, linhas: 0 }); }
  (contagem[uf] ??= {})[`secao_t${t}`] = n;
}
const qVoto = db.prepare(`SELECT uf, municipio, zona, secao, tipo_voto, numero, quantidade q FROM voto_bu INDEXED BY voto_bu_candidato
  WHERE turno = ? AND eleicao = ? AND cargo = 1`);
const semSecao = [0, 0];
for (const t of [1, 2]) {
  const t0 = Date.now();
  for (const r of qVoto.iterate(t, ELEICAO[t])) {
    if (!ufSet.has(r.uf)) continue;
    const s = sec[t - 1].get(chave(r));
    if (!s) { semSecao[t - 1]++; continue; }
    s.linhas++;
    if (r.tipo_voto === 'branco' || r.tipo_voto === 'nulo') s.BN += r.q;
    else if (r.tipo_voto !== 'nominal') throw new Error(`tipo_voto inesperado: ${r.tipo_voto}`);
    else if (r.numero === 13) s.L += r.q;
    else if (r.numero === 22) s.F += r.q;
    else s.E += r.q;
  }
  console.error(`turno ${t}: votos lidos em ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}

// ---------- invariantes e montagem ----------
const inv = { votosDiferemComparecimento: [0, 0], biometriaDifereComparecimento: [0, 0], semVotos: [0, 0], naoCompleta: [0, 0],
  e2tNaoZero: 0, semPar2t: 0, c1Menor20: 0, biometriaNula: 0, tipoUrna: {} };
const exemplos = [];
for (const t of [0, 1]) for (const s of sec[t].values()) {
  if (s.situacao !== 'completa') { inv.naoCompleta[t]++; continue; }
  if (s.linhas === 0) inv.semVotos[t]++;
  else if (s.L + s.F + s.E + s.BN !== s.c) { inv.votosDiferemComparecimento[t]++; if (exemplos.length < 5) exemplos.push({ t: t + 1, k: chave(s), soma: s.L + s.F + s.E + s.BN, c: s.c }); }
  if (s.sb != null && s.sb + s.pb + s.pg !== s.c) inv.biometriaDifereComparecimento[t]++;
  if (t === 1 && s.E !== 0) inv.e2tNaoZero++;
}
const munId = new Map();
const S = [];
for (const [k, a] of sec[0]) {
  const b = sec[1].get(k);
  if (a.situacao !== 'completa') continue;
  if (!b || b.situacao !== 'completa') { inv.semPar2t++; continue; }
  if (a.c < 20) { inv.c1Menor20++; continue; }
  if (a.sb == null || b.sb == null) { inv.biometriaNula++; continue; }
  const tu = `${a.tipo_urna}>${b.tipo_urna}`; inv.tipoUrna[tu] = (inv.tipoUrna[tu] ?? 0) + 1;
  const m = `${a.uf}|${a.municipio}`; if (!munId.has(m)) munId.set(m, munId.size);
  S.push({ uf: a.uf, k, mun: munId.get(m), c1: a.c, c2: b.c, bio1: a.pb, bio2: b.pb, sb1: a.sb, sb2: b.sb, pg1: a.pg, pg2: b.pg,
    L1: a.L, L2: b.L, F1: a.F, F2: b.F, E1: a.E, BN1: a.BN, BN2: b.BN });
}
console.error(`seções pareadas: ${S.length}`);

// ---------- MQ ponderado com EP robusto ----------
function inverter(M) {
  const n = M.length; const A = M.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; const d = A[c][c];
    for (let j = 0; j < 2 * n; j++) A[c][j] /= d;
    for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c]; for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[c][j]; }
  }
  return A.map((r) => r.slice(n));
}
// X: função seção -> vetor; Y: função seção -> y. Retorna b, V (cluster município) e VH (HC1)
function mqp(lista, X, Y, W = (s) => s.c1) {
  const xs = lista.map(X); const p = xs[0].length; const n = lista.length;
  const XtX = Array.from({ length: p }, () => Array(p).fill(0)); const Xty = Array(p).fill(0);
  const ys = lista.map(Y); const ws = lista.map(W);
  for (let i = 0; i < n; i++) { const x = xs[i], w = ws[i]; for (let a = 0; a < p; a++) { Xty[a] += w * x[a] * ys[i]; for (let c = 0; c < p; c++) XtX[a][c] += w * x[a] * x[c]; } }
  const inv_ = inverter(XtX); const b = inv_.map((r) => r.reduce((acc, v, j) => acc + v * Xty[j], 0));
  const meatH = Array.from({ length: p }, () => Array(p).fill(0)); const cl = new Map();
  for (let i = 0; i < n; i++) {
    const x = xs[i]; const e = ys[i] - x.reduce((acc, v, j) => acc + v * b[j], 0); const g = x.map((v) => ws[i] * v * e);
    for (let a = 0; a < p; a++) for (let c = 0; c < p; c++) meatH[a][c] += g[a] * g[c];
    const m = lista[i].mun; const acc = cl.get(m) ?? Array(p).fill(0); for (let a = 0; a < p; a++) acc[a] += g[a]; cl.set(m, acc);
  }
  const meatC = Array.from({ length: p }, () => Array(p).fill(0));
  for (const g of cl.values()) for (let a = 0; a < p; a++) for (let c = 0; c < p; c++) meatC[a][c] += g[a] * g[c];
  const mult = (A, B) => A.map((r) => B[0].map((_, j) => r.reduce((acc, v, k) => acc + v * B[k][j], 0)));
  const G = cl.size;
  const VH = mult(mult(inv_, meatH), inv_).map((r) => r.map((v) => v * n / (n - p)));
  const VC = mult(mult(inv_, meatC), inv_).map((r) => r.map((v) => v * (G / (G - 1)) * ((n - 1) / (n - p))));
  return { b, VH, VC, n, G };
}
const r3 = (v) => Math.round(v * 1000) / 1000;
const x5 = (s) => [1, (s.bio2 - s.bio1) / s.c1, (s.sb2 + s.pg2 - s.sb1 - s.pg1) / s.c1, s.E1 / s.c1, s.BN1 / s.c1];
const yL = (s) => (s.L2 - s.L1) / s.c1; const yF = (s) => (s.F2 - s.F1) / s.c1;
// diferença dNaoBio − dBio (índices 2 e 1) com EP
function dif(res, i = 2, j = 1) {
  const d = res.b[i] - res.b[j];
  const se = (V) => Math.sqrt(V[i][i] + V[j][j] - 2 * V[i][j]);
  return { d: r3(d), epHC1: r3(se(res.VH)), epCluster: r3(se(res.VC)), tCluster: +(d / se(res.VC)).toFixed(2) };
}
function resumo(lista) {
  const out = { secoes: lista.length };
  for (const [nome, Y] of [['ganho13', yL], ['ganho22', yF]]) {
    const r = mqp(lista, x5, Y);
    out[nome] = { dBio: r3(r.b[1]), dNaoBio: r3(r.b[2]), eliminados1t: r3(r.b[3]), brancosNulos1t: r3(r.b[4]),
      epCluster_dBio: r3(Math.sqrt(r.VC[1][1])), epCluster_dNaoBio: r3(Math.sqrt(r.VC[2][2])), naoBioMenosBio: dif(r) };
  }
  return out;
}

const res = { geradoEm: new Date().toISOString(), ufsCarregadas: ufsTodas, carga, contagem, semSecao, invariantes: inv, exemplosInvariante: exemplos };
const doAutor = S.filter((s) => UFS_AUTOR.includes(s.uf));
res.reproducao12 = resumo(doAutor);
res.todas = resumo(S);
res.porUf = {};
for (const uf of ufsTodas) res.porUf[uf] = resumo(S.filter((s) => s.uf === uf));
res.novasUfs = resumo(S.filter((s) => !UFS_AUTOR.includes(s.uf)));

// efeitos fixos (UF ou município): tira a média ponderada do grupo de y e de cada x; sem constante.
// O modelo do autor é agrupado sem efeito fixo: diferença entre UFs entra na inclinação.
function mqpFE(lista, X, Y, grupo) {
  const soma = new Map();
  const xs = lista.map((s) => X(s).slice(1)); const ys = lista.map(Y);
  lista.forEach((s, i) => {
    const g = grupo(s); const a = soma.get(g) ?? { w: 0, x: Array(xs[i].length).fill(0), y: 0 };
    a.w += s.c1; a.y += s.c1 * ys[i]; xs[i].forEach((v, j) => { a.x[j] += s.c1 * v; }); soma.set(g, a);
  });
  const wr = lista.map((s, i) => { const a = soma.get(grupo(s)); return { mun: s.mun, c1: s.c1, x: xs[i].map((v, j) => v - a.x[j] / a.w), y: ys[i] - a.y / a.w }; });
  return mqp(wr, (s) => s.x, (s) => s.y);
}
const resumoFE = (lista, X, grupo, i = 1, j = 0) => Object.fromEntries([['ganho13', yL], ['ganho22', yF]].map(([nome, Y]) => {
  const r = mqpFE(lista, X, Y, grupo); return [nome, { coef: r.b.map(r3), naoBioMenosBio: dif(r, i, j) }];
}));
res.efeitosFixos = {
  nota: 'coef sem constante: [dBio, dNaoBio, eliminados1t, brancosNulos1t]',
  ufFE_12: resumoFE(doAutor, x5, (s) => s.uf),
  ufFE_todas: resumoFE(S, x5, (s) => s.uf),
  municipioFE_todas: resumoFE(S, x5, (s) => s.mun),
  ufFE_novas: resumoFE(S.filter((s) => !UFS_AUTOR.includes(s.uf)), x5, (s) => s.uf),
};
{
  const X6 = (s) => [1, (s.bio2 - s.bio1) / s.c1, (s.sb2 - s.sb1) / s.c1, (s.pg2 - s.pg1) / s.c1, s.E1 / s.c1, s.BN1 / s.c1];
  res.efeitosFixos.ufFE_todas_anoNascimento = resumoFE(S, X6, (s) => s.uf, 2, 0);
  res.efeitosFixos.municipioFE_todas_anoNascimento = resumoFE(S, X6, (s) => s.mun, 2, 0);
}

// variante: sem biometria cadastrada e liberado por ano de nascimento separados
{
  const X6 = (s) => [1, (s.bio2 - s.bio1) / s.c1, (s.sb2 - s.sb1) / s.c1, (s.pg2 - s.pg1) / s.c1, s.E1 / s.c1, s.BN1 / s.c1];
  res.variante6 = {};
  for (const [nome, Y] of [['ganho13', yL], ['ganho22', yF]]) {
    const r = mqp(S, X6, Y);
    res.variante6[nome] = { dBio: r3(r.b[1]), dSemBioCadastrada: r3(r.b[2]), dAnoNascimento: r3(r.b[3]),
      ep: [1, 2, 3].map((i) => r3(Math.sqrt(r.VC[i][i]))), anoNascMenosBio: dif(r, 3, 1), semBioMenosBio: dif(r, 2, 1) };
  }
}
// variação das variáveis explicativas: quanto da variância de ΔnãoBio existe para identificar o coeficiente
{
  const v = S.map((s) => (s.sb2 + s.pg2 - s.sb1 - s.pg1)); const vs = [...v].sort((a, b) => a - b);
  const q = (p) => vs[Math.floor(p * (vs.length - 1))];
  res.distribuicaoDNaoBio = { p01: q(0.01), p10: q(0.1), p50: q(0.5), p90: q(0.9), p99: q(0.99), max: vs[vs.length - 1],
    totalDNaoBio: v.reduce((a, b) => a + b, 0), totalDComp: S.reduce((a, s) => a + s.c2 - s.c1, 0), totalDL: S.reduce((a, s) => a + s.L2 - s.L1, 0) };
}

// ---------- simulação de poder ----------
// Injeta k votos falsos em cada seção escolhida: +k em ΔnãoBio e +k no finalista beneficiado (13 ou 22).
let semente = 20261029;
const aleat = () => { semente = (semente * 1664525 + 1013904223) >>> 0; return semente / 2 ** 32; };
function injetar(lista, escolhidas, k, alvo) {
  return lista.map((s, i) => (escolhidas.has(i)
    ? { ...s, sb2: s.sb2 + k, c2: s.c2 + k, ...(alvo === 13 ? { L2: s.L2 + k } : { F2: s.F2 + k }) } : s));
}
function medir(lista, alvo) {
  const r = mqp(lista, x5, alvo === 13 ? yL : yF); return dif(r);
}
const base = S;
const fatia13 = base.map((s, i) => [i, s.L1 / s.c1]).sort((a, b) => b[1] - a[1]).map((x) => x[0]);
const fatia22 = base.map((s, i) => [i, s.F1 / s.c1]).sort((a, b) => b[1] - a[1]).map((x) => x[0]);
const cenarios = [];
const fracoes = [0.0025, 0.01, 0.05, 0.2];
const ks = [5, 10, 20, 40];
for (const alvo of [13, 22]) for (const sel of ['aleatoria', 'redutos']) for (const f of fracoes) for (const k of ks) {
  const n = Math.round(f * base.length);
  let escolhidas;
  if (sel === 'aleatoria') { escolhidas = new Set(); while (escolhidas.size < n) escolhidas.add(Math.floor(aleat() * base.length)); }
  else escolhidas = new Set((alvo === 13 ? fatia13 : fatia22).slice(0, n));
  const m = medir(injetar(base, escolhidas, k, alvo), alvo);
  const votos = n * k;
  cenarios.push({ alvo, selecao: sel, fracaoSecoes: f, secoes: n, votosPorSecao: k, votosInseridos: votos,
    pctGanhoAlvo: +(100 * votos / res.distribuicaoDNaoBio.totalDL).toFixed(2), ...m });
  console.error(alvo, sel, f, k, JSON.stringify(m));
}
// cenário "uma UF inteira": k votos em cada seção de uma UF só (ba, o maior ganho do 13)
for (const k of [2, 5, 10]) {
  const escolhidas = new Set(base.map((s, i) => [i, s.uf]).filter((x) => x[1] === 'ba').map((x) => x[0]));
  const mod = injetar(base, escolhidas, k, 13);
  const m = medir(mod, 13); const mUf = medir(mod.filter((s) => s.uf === 'ba'), 13);
  cenarios.push({ alvo: 13, selecao: 'uf ba inteira', secoes: escolhidas.size, votosPorSecao: k, votosInseridos: escolhidas.size * k, ...m, regressaoSoBa: mUf });
}
// poder no modelo com efeito fixo de UF (o que se deve usar com mais UFs)
const medirFE = (lista, alvo) => dif(mqpFE(lista, x5, alvo === 13 ? yL : yF, (s) => s.uf), 1, 0);
const cenariosFE = [];
for (const [f, k] of [[0.0025, 40], [0.01, 10], [0.01, 20], [0.05, 5], [0.05, 10], [0.2, 3], [0.2, 5]]) {
  const n = Math.round(f * base.length); const escolhidas = new Set();
  while (escolhidas.size < n) escolhidas.add(Math.floor(aleat() * base.length));
  cenariosFE.push({ alvo: 13, selecao: 'aleatoria', fracaoSecoes: f, votosPorSecao: k, votosInseridos: n * k, ...medirFE(injetar(base, escolhidas, k, 13), 13) });
  cenariosFE.push({ alvo: 13, selecao: 'redutos', fracaoSecoes: f, votosPorSecao: k, votosInseridos: n * k, ...medirFE(injetar(base, new Set(fatia13.slice(0, n)), k, 13), 13) });
}
{
  const escolhidas = new Set(base.map((s, i) => [i, s.uf]).filter((x) => x[1] === 'ba').map((x) => x[0]));
  for (const k of [5, 10]) cenariosFE.push({ alvo: 13, selecao: 'uf ba inteira', votosPorSecao: k, votosInseridos: escolhidas.size * k, ...medirFE(injetar(base, escolhidas, k, 13), 13) });
  // proporcional: 3% do comparecimento do 1º turno em todas as seções da BA
  const prop = base.map((s, i) => (escolhidas.has(i) ? (() => { const k = Math.round(0.03 * s.c1); return { ...s, sb2: s.sb2 + k, c2: s.c2 + k, L2: s.L2 + k }; })() : s));
  cenariosFE.push({ alvo: 13, selecao: 'uf ba inteira, 3% do comparecimento', votosInseridos: prop.reduce((a, s, i) => a + s.c2 - base[i].c2, 0), ...medirFE(prop, 13) });
}
res.poder = { referencia: medir(base, 13), referencia22: medir(base, 22), referenciaFE: medirFE(base, 13), cenarios, cenariosFE };
writeFileSync(`${SAIDA}/e2bio-reproducao.json`, JSON.stringify(res, null, 1));
console.log(JSON.stringify({ reproducao12: res.reproducao12, todas: res.todas, inv }, null, 1));
