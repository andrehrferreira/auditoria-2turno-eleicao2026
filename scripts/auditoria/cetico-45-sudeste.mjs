// Cético, parecer 45 (H19): reprodução por caminho próprio do salto local (Parte 1) e do teste M2 (S↑), com prioridade
// para o único sinal que passou (Sudeste, 75 seções, +0,90 ponto), e as checagens que derrubam ou sustentam esse sinal.
// Código escrito do zero (não importa estatistico-h19-lib.mjs). Entrada: data/parsed/auditoria/estatistico/h19/medidas.csv.gz,
// conferida coluna a coluna contra o banco (cópia de leitura) para local, modelo, urna e votos 13 e 22 dos dois turnos.
// Regressão: MQP com efeito fixo do grupo (local × modelo da urna do 2º turno) por "demeaning" ponderado, solução por
// eliminação de Gauss-Jordan com pivô, erro CR1 por agrupamento.
// Checagens:
//   1. Parte 1: contagem de saltos (Bonferroni), S↑ e S↓, e a lista das 75 S↑ do Sudeste contra sudeste-sup.csv.
//   2. M2 nas 6 unidades; no Sudeste, variações: sem controles, sem peso, erro por município, sem as "emprestadas"
//      (falha própria subindo menos de 2 pontos), sem urnas trocadas.
//   3. Salto contra a própria seção (S↑ próprio): z da variação da falha da seção contra a variação da UF × modelo, sem os pares.
//   4. Inferência por aleatorização no Sudeste, na escala "ΔY da seção − ΔY ponderado dos pares": 20.000 sorteios de 75 seções
//      não S↑, estratificados pelo tamanho do grupo.
//   5. "Frágil?": quanto o t cai sem as 10 de maior peso quando o efeito é homogêneo (simulação com a mesma escala).
//   6. Mecanismo: comparecimento, falhas a mais (E) e votos a mais no 13 e no 22 nas S↑ do Sudeste contra os pares.
// Uso: node --max-old-space-size=8192 scripts/auditoria/cetico-45-sudeste.mjs
// Saída: data/parsed/auditoria/cetico/45/sudeste.json
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

const DIR_H19 = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h19');
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', '45');
const REG = { Nordeste: 'al ba ce ma pb pe pi rn se', Norte: 'ac am ap pa ro rr to', 'Centro-Oeste': 'df go ms mt', Sudeste: 'es mg rj sp', Sul: 'pr rs sc' };
const regiao = {};
for (const [r, l] of Object.entries(REG)) for (const u of l.split(' ')) regiao[u] = r;
const out = {};

// ---------- carga ----------
const txt = gunzipSync(await readFile(path.join(DIR_H19, 'medidas.csv.gz'))).toString('utf8').trim().split('\n');
const C = txt[0].split(';');
const ix = Object.fromEntries(C.map((c, i) => [c, i]));
const STR = new Set(['uf', 'municipio', 'zona', 'secao', 'modelo1', 'modelo2']);
const S = txt.slice(1).map((l) => { const p = l.split(';'); const o = {}; for (const c of C) { const v = p[ix[c]]; o[c] = STR.has(c) ? v : v === '' ? null : +v; } return o; });
const porId = new Map(S.map((s) => [`${s.uf}/${s.municipio}/${s.zona}/${s.secao}`, s]));

// ---------- conferência contra o banco ----------
{
  const { db, fonte } = await abrirLeitura();
  const dif = { local: 0, modelo: 0, urna: 0, v13: 0, v22: 0, ausente: 0 };
  const v = new Map();
  for (const t of [1, 2]) {
    for (const r of db.prepare('SELECT uf, municipio, zona, secao, numero, quantidade FROM voto_bu WHERE turno = ? AND cargo = 1 AND numero IN (13, 22)').iterate(t)) {
      const k = `${t}|${r.uf}/${r.municipio}/${r.zona}/${r.secao}|${r.numero}`;
      v.set(k, (v.get(k) ?? 0) + r.quantidade);
    }
    for (const r of db.prepare('SELECT uf, municipio, zona, secao, local, modelo_urna, numero_interno_urna FROM secao WHERE turno = ?').iterate(t)) {
      const id = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
      const s = porId.get(id);
      if (!s) continue;
      if (s[`local${t}`] !== r.local) dif.local++;
      if (s[`modelo${t}`] !== r.modelo_urna) dif.modelo++;
      if (s[`urna${t}`] !== r.numero_interno_urna) dif.urna++;
      if (s[`v13_${t}`] !== (v.get(`${t}|${id}|13`) ?? 0)) dif.v13++;
      if (s[`v22_${t}`] !== (v.get(`${t}|${id}|22`) ?? 0)) dif.v22++;
    }
  }
  db.close();
  out.conferenciaBanco = { arquivo: path.basename(fonte ?? ''), secoes: S.length, diferencas: dif };
}

// ---------- elegibilidade (regras do plano) ----------
const excl = {};
const el = [];
for (const s of S) {
  const motivo = !s.bate1 || !s.bate2 ? 'diario≠BU'
    : s.M1 + s.H1 !== s.F1 || s.M2 + s.H2 !== s.F2 ? 'H08≠leitor'
    : s.R1 + s.F1 < 20 || s.R2 + s.F2 < 20 || s.R1 < 10 || s.R2 < 10 ? 'B<20 ou R<10'
    : s.v13_1 + s.v22_1 < 20 || s.v13_2 + s.v22_2 < 20 ? '13+22<20'
    : !s.eleitores || s.idade70 === null ? 'sem perfil'
    : s.local2 === null || !s.modelo2 ? 'sem local/modelo' : null;
  if (motivo) { excl[motivo] = (excl[motivo] ?? 0) + 1; continue; }
  s.id = `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`;
  s.cl = `${s.uf}/${s.municipio}/${s.zona}/${s.local2}`;
  s.g = `${s.cl}/${s.modelo2}`;
  s.mun = `${s.uf}/${s.municipio}`;
  el.push(s);
}
const grupos = new Map();
for (const s of el) (grupos.get(s.g) ?? grupos.set(s.g, []).get(s.g)).push(s);
const A = [];
for (const g of grupos.values()) { if (g.length < 2) excl.sozinha = (excl.sozinha ?? 0) + g.length; else A.push(...g); }
out.elegibilidade = { exclusoes: excl, amostra: A.length };

// ---------- Parte 1 ----------
const lg = (f, r) => Math.log((f + 0.5) / (r + 0.5));
const med = (v) => { const s = Float64Array.from(v).sort(); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
for (const g of grupos.values()) {
  if (g.length < 2) continue;
  const T = g.reduce((o, s) => ({ F1: o.F1 + s.F1, R1: o.R1 + s.R1, F2: o.F2 + s.F2, R2: o.R2 + s.R2, w: o.w + s.v13_2 + s.v22_2 }), { F1: 0, R1: 0, F2: 0, R2: 0, w: 0 });
  for (const s of g) {
    const P = { F1: T.F1 - s.F1, R1: T.R1 - s.R1, F2: T.F2 - s.F2, R2: T.R2 - s.R2 };
    s.B1 = s.R1 + s.F1; s.B2 = s.R2 + s.F2; s.f1 = s.F1 / s.B1; s.f2 = s.F2 / s.B2;
    s.dP = lg(P.F2, P.R2) - lg(P.F1, P.R1);
    s.J = lg(s.F2, s.R2) - lg(s.F1, s.R1) - s.dP;
    s.V = [s.F1, s.R1, s.F2, s.R2, P.F1, P.R1, P.F2, P.R2].reduce((a, x) => a + 1 / (x + 0.5), 0);
    s.saltoF = s.f2 - s.f1 - (P.F2 / (P.F2 + P.R2) - P.F1 / (P.F1 + P.R1));
    s.dfProprio = s.f2 - s.f1;
    s.E = s.F2 - s.B2 / (1 + Math.exp(-(lg(s.F1, s.R1) + s.dP)));
    s.Y1 = s.v13_1 / (s.v13_1 + s.v22_1); s.Y2 = s.v13_2 / (s.v13_2 + s.v22_2);
    s.nGrupo = g.length;
  }
}
const tau = {};
for (const uf of new Set(A.map((s) => s.uf))) {
  const v = A.filter((s) => s.uf === uf);
  const m = med(v.map((s) => s.J)), mad = 1.4826 * med(v.map((s) => Math.abs(s.J - m)));
  const t2 = Math.max(0, mad * mad - med(v.map((s) => s.V)));
  tau[uf] = t2;
  for (const s of v) s.z = (s.J - m) / Math.sqrt(s.V + t2);
}
// Bonferroni bicaudal a 5% sobre as seções testadas: cauda normal por erfc (Numerical Recipes) e bisseção.
const cauda = (z) => { const x = z / Math.SQRT2, t = 1 / (1 + 0.5 * x); return 0.5 * t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))))); };
const zB = (() => { const alvo = 0.05 / (2 * A.length); let lo = 0, hi = 10; for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (cauda(m) > alvo) lo = m; else hi = m; } return lo; })();
for (const s of A) { s.Sup = s.z >= 3 && s.saltoF >= 0.05 ? 1 : 0; s.Sdn = s.z <= -3 && s.saltoF <= -0.05 ? 1 : 0; s.trocada = s.urna1 !== s.urna2 ? 1 : 0; }
const supSE = A.filter((s) => s.Sup && regiao[s.uf] === 'Sudeste');
const listaEst = (await readFile(path.join(DIR_H19, 'sudeste-sup.csv'), 'utf8')).trim().split('\n').slice(1).map((l) => l.split(';')[0]);
const meus = new Set(supSE.map((s) => s.id));
out.parte1 = {
  zBonferroni: +zB.toFixed(3), tau2MaiorQueZero: Object.values(tau).filter((x) => x > 0).length,
  bonfSobe: A.filter((s) => s.z >= zB).length, bonfDesce: A.filter((s) => s.z <= -zB).length,
  bonfTrocadas: A.filter((s) => Math.abs(s.z) >= zB && s.trocada).length,
  Sup: A.filter((s) => s.Sup).length, Sdown: A.filter((s) => s.Sdn).length,
  supSudeste: supSE.length, listaIgualAoEstatistico: listaEst.length === meus.size && listaEst.every((id) => meus.has(id)),
  supSudesteFalhaPropriaMenos2pp: supSE.filter((s) => s.dfProprio < 0.02).length,
  supSudesteFalhaPropriaParadaOuQueda: supSE.filter((s) => s.dfProprio <= 0).length,
  supBrasilFalhaPropriaParadaOuQueda: A.filter((s) => s.Sup && s.dfProprio <= 0).length,
  supBrasilFalhaPropriaMenos5pp: A.filter((s) => s.Sup && s.dfProprio < 0.05).length,
};

// ---------- regressão própria ----------
function mqpEF(rows, nx) {
  const byG = new Map();
  rows.forEach((r, i) => (byG.get(r.g) ?? byG.set(r.g, []).get(r.g)).push(i));
  const K0 = rows[0].x.length;
  const X = [], Y = [], W = [], CL = [];
  for (const idx of byG.values()) {
    if (idx.length < 2) continue;
    let sw = 0, my = 0; const mx = new Array(K0).fill(0);
    for (const i of idx) { const r = rows[i]; sw += r.w; my += r.w * r.y; for (let k = 0; k < K0; k++) mx[k] += r.w * r.x[k]; }
    for (const i of idx) { const r = rows[i]; X.push(r.x.map((v, k) => v - mx[k] / sw)); Y.push(r.y - my / sw); W.push(r.w); CL.push(r.cl); }
  }
  // colunas sem variação depois do efeito fixo saem (só controles)
  let cols = [...Array(K0).keys()].filter((k) => k < nx || X.some((x) => Math.abs(x[k]) > 1e-12));
  for (;;) {
    const K = cols.length;
    const M = cols.map(() => new Array(K).fill(0)), b = new Array(K).fill(0);
    for (let i = 0; i < X.length; i++) for (let a = 0; a < K; a++) { const xa = W[i] * X[i][cols[a]]; b[a] += xa * Y[i]; for (let c = 0; c < K; c++) M[a][c] += xa * X[i][cols[c]]; }
    // Gauss-Jordan com pivô parcial → inversa
    const aug = M.map((r, i) => [...r, ...cols.map((_, j) => (i === j ? 1 : 0))]);
    let singular = -1;
    for (let c = 0; c < K; c++) {
      let p = c; for (let r = c + 1; r < K; r++) if (Math.abs(aug[r][c]) > Math.abs(aug[p][c])) p = r;
      if (Math.abs(aug[p][c]) < 1e-10 * Math.max(1, Math.abs(M[c][c]))) { singular = c; break; }
      [aug[c], aug[p]] = [aug[p], aug[c]];
      const d = aug[c][c]; for (let j = 0; j < 2 * K; j++) aug[c][j] /= d;
      for (let r = 0; r < K; r++) if (r !== c) { const f = aug[r][c]; if (f) for (let j = 0; j < 2 * K; j++) aug[r][j] -= f * aug[c][j]; }
    }
    if (singular >= 0) { if (cols[singular] < nx) return null; cols = cols.filter((_, j) => j !== singular); continue; }
    const inv = aug.map((r) => r.slice(K));
    const beta = inv.map((r) => r.reduce((a, v, j) => a + v * b[j], 0));
    const sc = new Map();
    for (let i = 0; i < X.length; i++) {
      let e = Y[i]; for (let a = 0; a < K; a++) e -= X[i][cols[a]] * beta[a];
      let v = sc.get(CL[i]); if (!v) sc.set(CL[i], (v = new Array(K).fill(0)));
      for (let a = 0; a < K; a++) v[a] += W[i] * X[i][cols[a]] * e;
    }
    const N = X.length, nC = sc.size, f = (nC / (nC - 1)) * ((N - 1) / (N - K));
    const se = [...Array(nx).keys()].map((a) => { let s2 = 0; for (const v of sc.values()) { let u = 0; for (let p = 0; p < K; p++) u += inv[a][p] * v[p]; s2 += u * u; } return Math.sqrt(f * s2); });
    return { N, clusters: nC, beta: beta.slice(0, nx), se, z: beta.slice(0, nx).map((x, a) => x / se[a]) };
  }
}
const ctrl = (s) => { const e = s.eleitores; return [1 - s.biometria / e, s.idade60 / e, s.idade70 / e, s.idade16a24 / e, s.escolBaixa / e, s.superior / e, Math.log(e), s.trocada, s.f1, s.tentR1 / s.R1, s.anb2 / s.votos2 - s.anb1 / s.votos1]; };
const linhas = (secs, { x = (s) => [s.Sup, s.Sdn], semCtrl = false, semPeso = false, cl = 'cl', y = (s) => 100 * (s.Y2 - s.Y1) } = {}) =>
  secs.map((s) => ({ g: s.g, cl: s[cl], w: semPeso ? 1 : s.v13_2 + s.v22_2, x: semCtrl ? x(s) : [...x(s), ...ctrl(s)], y: y(s) }));
const r2 = (r, i = 0) => (r ? { beta: +r.beta[i].toFixed(3), se: +r.se[i].toFixed(3), z: +r.z[i].toFixed(2), N: r.N } : null);
const daRegiao = (r) => A.filter((s) => r === 'Brasil' || regiao[s.uf] === r);
out.M2 = {};
for (const r of ['Brasil', ...Object.keys(REG)]) { const m = mqpEF(linhas(daRegiao(r)), 2); out.M2[r] = { Sup: r2(m, 0), Sdown: r2(m, 1), secoesSup: daRegiao(r).filter((s) => s.Sup).length }; }
// M1 (Δa, Δf, Δh) no Brasil e nas regiões, com o placebo do 1º turno
out.M1 = {};
const xM1 = (s) => [s.tentR2 / s.R2 - s.tentR1 / s.R1, s.f2 - s.f1, s.H2 / s.B2 - s.H1 / s.B1];
for (const r of ['Brasil', ...Object.keys(REG)]) {
  const m = mqpEF(linhas(daRegiao(r), { x: xM1 }), 3), p = mqpEF(linhas(daRegiao(r), { x: xM1, y: (s) => 100 * s.Y1 }), 3);
  out.M1[r] = Object.fromEntries(['Δa', 'Δf', 'Δh'].map((n, i) => [n, { ...r2(m, i), placeboZ: +p.z[i].toFixed(2) }]));
}
const SE = daRegiao('Sudeste');
const emprestadas = new Set(supSE.filter((s) => s.dfProprio < 0.02));
out.variacoesSudeste = {
  plano: r2(mqpEF(linhas(SE), 2)),
  semControles: r2(mqpEF(linhas(SE, { semCtrl: true }), 2)),
  semPeso: r2(mqpEF(linhas(SE, { semPeso: true }), 2)),
  erroPorMunicipio: r2(mqpEF(linhas(SE, { cl: 'mun' }), 2)),
  semEmprestadas: r2(mqpEF(linhas(SE.filter((s) => !emprestadas.has(s))), 2)),
  emprestadasComoNaoTratadas: r2(mqpEF(linhas(SE, { x: (s) => [emprestadas.has(s) ? 0 : s.Sup, s.Sdn] }), 2)),
  semTrocadas: r2(mqpEF(linhas(SE.filter((s) => !s.trocada)), 2)),
  placebo1T: r2(mqpEF(linhas(SE, { y: (s) => 100 * s.Y1 }), 2)),
  desfecho13porEleitor: r2(mqpEF(linhas(SE, { y: (s) => (100 * (s.v13_2 - s.v13_1)) / s.eleitores }), 2)),
  desfecho22porEleitor: r2(mqpEF(linhas(SE, { y: (s) => (100 * (s.v22_2 - s.v22_1)) / s.eleitores }), 2)),
  desfechoComparecimentoPorEleitor: r2(mqpEF(linhas(SE, { y: (s) => (100 * (s.comp2 - s.comp1)) / s.eleitores }), 2)),
};
// diferença Sudeste × resto do país
{
  const se = out.M2.Sudeste.Sup, resto = mqpEF(linhas(A.filter((s) => regiao[s.uf] !== 'Sudeste')), 2);
  out.heterogeneidade = { restoDoPais: r2(resto), zDiferenca: +((se.beta - resto.beta[0]) / Math.hypot(se.se, resto.se[0])).toFixed(2),
    somaZ2Regioes: +Object.keys(REG).reduce((a, r) => a + out.M2[r].Sup.z ** 2, 0).toFixed(2) };
}

// ---------- S↑ próprio: contra a UF × modelo, sem os pares ----------
{
  const tend = new Map();
  for (const s of A) { const k = `${s.uf}/${s.modelo2}`; const o = tend.get(k) ?? tend.set(k, { F1: 0, R1: 0, F2: 0, R2: 0 }).get(k); o.F1 += s.F1; o.R1 += s.R1; o.F2 += s.F2; o.R2 += s.R2; }
  for (const s of A) {
    const o = tend.get(`${s.uf}/${s.modelo2}`);
    const d = lg(o.F2, o.R2) - lg(o.F1, o.R1);
    s.zProprio = (lg(s.F2, s.R2) - lg(s.F1, s.R1) - d) / Math.sqrt(1 / (s.F1 + 0.5) + 1 / (s.R1 + 0.5) + 1 / (s.F2 + 0.5) + 1 / (s.R2 + 0.5));
    const df = s.f2 - s.f1 - (o.F2 / (o.F2 + o.R2) - o.F1 / (o.F1 + o.R1));
    s.SupP = s.zProprio >= 3 && df >= 0.05 ? 1 : 0; s.SdnP = s.zProprio <= -3 && df <= -0.05 ? 1 : 0;
  }
  out.SupProprio = {};
  for (const r of ['Brasil', ...Object.keys(REG)]) {
    const secs = daRegiao(r);
    const m = mqpEF(linhas(secs, { x: (s) => [s.SupP, s.SdnP] }), 2);
    out.SupProprio[r] = { secoesSup: secs.filter((s) => s.SupP).length, secoesSdown: secs.filter((s) => s.SdnP).length, Sup: r2(m, 0), Sdown: r2(m, 1),
      sobreposicaoComSupDosPares: secs.filter((s) => s.SupP && s.Sup).length };
  }
}

// ---------- escala simples: ΔY da seção − ΔY ponderado dos pares ----------
for (const g of grupos.values()) {
  if (g.length < 2) continue;
  const W = g.reduce((a, s) => a + s.v13_2 + s.v22_2, 0), WY = g.reduce((a, s) => a + (s.v13_2 + s.v22_2) * (s.Y2 - s.Y1), 0);
  const WC = g.reduce((a, s) => a + (s.comp2 - s.comp1) / s.eleitores, 0);
  for (const s of g) {
    const w = s.v13_2 + s.v22_2;
    s.dy = 100 * ((s.Y2 - s.Y1) - (WY - w * (s.Y2 - s.Y1)) / (W - w));
    s.dcomp = 100 * ((s.comp2 - s.comp1) / s.eleitores - (WC - (s.comp2 - s.comp1) / s.eleitores) / (g.length - 1));
  }
}
const tStat = (v) => { const n = v.length, m = v.reduce((a, x) => a + x, 0) / n; const sd = Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / (n - 1)); return { n, media: m, t: m / (sd / Math.sqrt(n)) }; };
let semente = 45;
const rnd = () => { semente = (semente * 1103515245 + 12345) % 2147483648; return semente / 2147483648; };
const estrato = (s) => (s.nGrupo === 2 ? '2' : s.nGrupo === 3 ? '3' : s.nGrupo <= 5 ? '4-5' : s.nGrupo <= 8 ? '6-8' : '9+');
{
  const obs = supSE.map((s) => s.dy);
  const base = tStat(obs);
  const fora = SE.filter((s) => !s.Sup);
  const porE = new Map();
  for (const s of fora) (porE.get(estrato(s)) ?? porE.set(estrato(s), []).get(estrato(s))).push(s.dy);
  const quota = {};
  for (const s of supSE) quota[estrato(s)] = (quota[estrato(s)] ?? 0) + 1;
  const sorteio = () => Object.entries(quota).flatMap(([e, n]) => { const v = porE.get(e); return Array.from({ length: n }, () => v[Math.floor(rnd() * v.length)]); });
  const NS = 20000;
  let maiorMedia = 0, maiorT = 0;
  const medias = [];
  for (let i = 0; i < NS; i++) { const a = sorteio(); const t = tStat(a); medias.push(t.media); if (t.media >= base.media) maiorMedia++; if (t.t >= base.t) maiorT++; }
  const ord = [...obs].sort((a, b) => b - a);
  const semTop = (v, k) => tStat([...v].sort((a, b) => b - a).slice(k));
  // efeito homogêneo: sorteio nulo + deslocamento igual à média observada menos a média nula
  const mediaNula = medias.reduce((a, x) => a + x, 0) / NS;
  const desl = base.media - mediaNula;
  const sim = { 5: [], 10: [] };
  for (let i = 0; i < 5000; i++) { const a = sorteio().map((x) => x + desl); for (const k of [5, 10]) sim[k].push(semTop(a, k).t); }
  const q = (v, p) => { const s = [...v].sort((a, b) => a - b); return s[Math.floor(p * (s.length - 1))]; };
  out.aleatorizacao = {
    escala: 'ΔY da seção − ΔY ponderado dos pares (pontos)', estratos: quota, observado: base, semTop5: semTop(ord, 5), semTop10: semTop(ord, 10),
    pMediaUnilateral: maiorMedia / NS, pTUnilateral: maiorT / NS, mediaNula, deslocamentoHomogeneo: desl,
    efeitoHomogeneo: { tSemTop5: { mediana: q(sim[5], 0.5), p10: q(sim[5], 0.1), p90: q(sim[5], 0.9) }, tSemTop10: { mediana: q(sim[10], 0.5), p10: q(sim[10], 0.1), p90: q(sim[10], 0.9) },
      fracaoTSemTop10AbaixoDoObservado: sim[10].filter((t) => t <= semTop(ord, 10).t).length / sim[10].length },
    SdownSudeste: tStat(SE.filter((s) => s.Sdn).map((s) => s.dy)),
    SupNordeste: tStat(A.filter((s) => s.Sup && regiao[s.uf] === 'Nordeste').map((s) => s.dy)),
  };
}

// ---------- mecanismo nas 75 ----------
{
  const soma = (k) => supSE.reduce((a, s) => a + k(s), 0);
  const parGrupo = (s, k) => { const g = grupos.get(s.g).filter((p) => p !== s); return g.reduce((a, p) => a + k(p), 0) / g.length; };
  out.mecanismo = {
    secoes: supSE.length, trocadas: supSE.filter((s) => s.trocada).length,
    falhasAMaisE: Math.round(soma((s) => s.E)), falhasAMaisEpositivo: Math.round(soma((s) => Math.max(0, s.E))),
    delta13: soma((s) => s.v13_2 - s.v13_1), delta22: soma((s) => s.v22_2 - s.v22_1), deltaComp: soma((s) => s.comp2 - s.comp1),
    delta13Pares: Math.round(soma((s) => parGrupo(s, (p) => p.v13_2 - p.v13_1))), delta22Pares: Math.round(soma((s) => parGrupo(s, (p) => p.v22_2 - p.v22_1))),
    deltaCompPares: Math.round(soma((s) => parGrupo(s, (p) => p.comp2 - p.comp1))),
    dcompContraPares: tStat(supSE.map((s) => s.dcomp)),
    dcompContraParesSdown: tStat(SE.filter((s) => s.Sdn).map((s) => s.dcomp)),
    dcompContraParesTodasSE: tStat(SE.map((s) => s.dcomp)),
  };
}
out.emprestadas = [...emprestadas].map((s) => ({ id: s.id, nGrupo: s.nGrupo, dfProprioPp: +(100 * s.dfProprio).toFixed(1), saltoFpp: +(100 * s.saltoF).toFixed(1), dy: +s.dy.toFixed(2),
  paresSdown: grupos.get(s.g).filter((p) => p !== s && p.Sdn).length }));
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, 'sudeste.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
