// H18: inserção uniforme num município inteiro (plano registrado antes: docs/analysis/estatistico-eleitoral/11-h18-plano.md).
// Universo completo: todas as seções pareadas dos dois turnos (pares-banco.csv), menos o exterior (H22).
//   Esperado por seção: MQ por UF, sem intercepto, dos votos do 13 e do 22 no 2º turno sobre o vetor do 1º turno
//     [13, 22, 14, 30, 55, 70, demais, brancos+nulos, abstenção, governador A, governador B, senador A, senador B]
//     (A e B = os dois mais votados da UF no 1º turno). Ajuste nas seções com c1 ≥ 10, a2 ≥ 20, |a2 − a1| ≤ 10.
//     Deixa-um-município-de-fora: os coeficientes que preveem o município m saem da UF sem m.
//   A  VAE = Σ resíduo líquido (13 − 22)/Σ nominais do 2º turno, em p.p. da margem. σ do município pela dispersão entre as
//      seções; τ da região calibrado para mediana de z² = 0,4549. Município com 3+ seções. Corte: BH q < 0,01 e |VAE| ≥ 2 p.p.
//   B1 log(variância ponderada do resíduo por seção / piso 4·π13·π22/nominais), z robusto na região (+ 2/(k − 1)).
//      Seções com nominais ≥ 20; município com 10+ delas. Corte: z ≤ −1,645.
//   B2 φ2 = índice de dispersão da parcela do 13 entre os nominais do 2º turno; cauda inferior do χ²(k − 1); BH q < 0,01.
//   Controles: φ1 (1º turno, 13 × 22), governador do 2º turno (AC, AM, DF, ES, RN, TO), eleição suplementar de prefeito,
//   2018 e 2022 por município (estatistico-h18-historico.mjs).
// Só leitura. Uso: node --max-old-space-size=12288 scripts/auditoria/estatistico-h18-municipios.mjs
// Saídas em data/parsed/auditoria/estatistico-eleitoral/h18/: municipios.csv, marcados.csv, resumo.json
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { RAIZ, paraCsv, lerTabela, mediana, pearson, lnGama, gamaQ } from './forense-lib.mjs';
import { lerPares, REGIAO, bh, pNormal2, zBilateral } from './estatistico-lib.mjs';

const SAIDA = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'estatistico-eleitoral', 'h18');
const ELIMINADOS = [14, 30, 55, 70];
const NOMES_X = ['v13_1', 'v22_1', 'e14', 'e30', 'e55', 'e70', 'demais', 'bn1', 'abst1', 'govA', 'govB', 'senA', 'senB'];
const K = NOMES_X.length;
const Q_A = 0.01, PP_A = 2, K_A = 3, K_B = 10, NOM_B = 20, Z_B1 = -1.645, Q_B2 = 0.01, MEDIANA_CHI1 = 0.4549;
const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const r2 = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : null);
const r4 = (x) => (Number.isFinite(x) ? Math.round(x * 1e4) / 1e4 : null);
const sig = (x) => (Number.isFinite(x) ? Number(x.toPrecision(3)) : null);
const chave = (uf, m, z, s) => `${uf}|${m}|${z}|${s}`;
await mkdir(SAIDA, { recursive: true });

// ---------- 1. dados ----------
const todos = await lerPares('banco');
const P = todos.filter((s) => s.uf !== 'zz');
const resumo = { geradoEm: new Date().toISOString(), plano: 'docs/analysis/estatistico-eleitoral/11-h18-plano.md',
  conferencias: { paresTotal: todos.length, exterior: todos.length - P.length, secoes: P.length } };
const porChave = new Map();
for (const s of P) {
  Object.assign(s, { e14: 0, e30: 0, e55: 0, e70: 0, dem: 0, govA: 0, govB: 0, senA: 0, senB: 0, g1: null, g2: null });
  porChave.set(chave(s.uf, s.municipio, s.zona, s.secao), s);
}
const ufs = [...new Set(P.map((s) => s.uf))].sort();
log(`${P.length} seções em ${ufs.length} UFs`);

const { db, fonte } = await abrirLeitura();
resumo.fonte = path.basename(fonte);
const conf = resumo.conferencias;
conf.semPar = { eliminados: 0, governador1: 0, senador1: 0, governador2: 0 };
const qv = db.prepare(`SELECT uf, municipio, zona, secao, numero, quantidade FROM voto_bu
  WHERE turno = 1 AND cargo = 1 AND tipo_voto = 'nominal' AND uf = ?`);
for (const uf of ufs) {
  for (const v of qv.iterate(uf)) {
    if (v.numero === 13 || v.numero === 22) continue;
    const s = porChave.get(chave(v.uf, v.municipio, v.zona, v.secao));
    if (!s) { conf.semPar.eliminados += v.quantidade; continue; }
    if (ELIMINADOS.includes(v.numero)) s[`e${v.numero}`] += v.quantidade; else s.dem += v.quantidade;
  }
}
conf.demaisDifereOut1 = P.filter((s) => s.e14 + s.e30 + s.e55 + s.e70 + s.dem !== s.out1).length;
log('eliminados lidos');

// governador do 2º turno (6 UFs): par de candidatos por UF
const qGov2 = db.prepare(`SELECT uf, municipio, zona, secao, numero, quantidade FROM voto_bu
  WHERE turno = 2 AND eleicao = 6260 AND cargo = 3 AND tipo_voto = 'nominal'`);
const parGov2 = new Map();
{
  const tot = new Map();
  const linhas = qGov2.all();
  for (const v of linhas) { const k = `${v.uf}|${v.numero}`; tot.set(k, (tot.get(k) ?? 0) + v.quantidade); }
  for (const uf of new Set(linhas.map((v) => v.uf))) {
    const par = [...tot].filter(([k]) => k.startsWith(`${uf}|`)).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => Number(k.split('|')[1]));
    parGov2.set(uf, par);
  }
  for (const v of linhas) {
    const s = porChave.get(chave(v.uf, v.municipio, v.zona, v.secao));
    if (!s) { conf.semPar.governador2 += v.quantidade; continue; }
    const i = parGov2.get(v.uf).indexOf(v.numero);
    if (i < 0) continue;
    s.g2 ??= [0, 0]; s.g2[i] += v.quantidade;
  }
  resumo.governador2t = Object.fromEntries(parGov2);
}
log(`governador 2º turno: ${[...parGov2.keys()].join(', ')}`);

// governador e senador do 1º turno: os 2 mais votados de cada UF
function doisMaisVotados(cargo, campoA, campoB, chaveSemPar, extra) {
  const q = db.prepare(`SELECT uf, municipio, zona, secao, numero, quantidade FROM voto_bu
    WHERE turno = 1 AND eleicao = 6259 AND cargo = ${cargo} AND tipo_voto = 'nominal'`);
  const tot = new Map();
  for (const v of q.iterate()) { const k = `${v.uf}|${v.numero}`; tot.set(k, (tot.get(k) ?? 0) + v.quantidade); }
  const top = new Map();
  for (const uf of ufs) top.set(uf, [...tot].filter(([k]) => k.startsWith(`${uf}|`)).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => Number(k.split('|')[1])));
  for (const v of q.iterate()) {
    const s = porChave.get(chave(v.uf, v.municipio, v.zona, v.secao));
    if (!s) { conf.semPar[chaveSemPar] += v.quantidade; continue; }
    const t = top.get(v.uf) ?? [];
    if (v.numero === t[0]) s[campoA] += v.quantidade; else if (v.numero === t[1]) s[campoB] += v.quantidade;
    if (extra) extra(s, v);
  }
  return Object.fromEntries(top);
}
resumo.governador1tTop2 = doisMaisVotados(3, 'govA', 'govB', 'governador1', (s, v) => {
  const par = parGov2.get(v.uf);
  if (!par) return;
  const i = par.indexOf(v.numero);
  if (i < 0) return;
  s.g1 ??= [0, 0]; s.g1[i] += v.quantidade;
});
log('governador 1º turno lido');
resumo.senador1tTop2 = doisMaisVotados(5, 'senA', 'senB', 'senador1');
log('senador 1º turno lido');

// eleição suplementar de prefeito no dia do 2º turno
const suplementar = new Set(db.prepare(`SELECT DISTINCT uf, municipio FROM voto_bu WHERE turno = 2 AND eleicao BETWEEN 6261 AND 6299 AND cargo = 11`)
  .all().map((r) => `${r.uf}|${r.municipio}`));
resumo.municipiosComSuplementar = suplementar.size;
const nomeMun = new Map(db.prepare('SELECT uf, codigo, nome FROM municipio').all().map((m) => [`${m.uf}|${m.codigo}`, m.nome]));
const oficial = db.prepare(`SELECT turno, numero, SUM(quantidade) q FROM voto_oficial WHERE cargo = 1 AND numero IN (13, 22) AND uf <> 'zz'
  GROUP BY turno, numero`).all();
db.close();
conf.oficialSemExterior = oficial;
conf.pares = { 1: { 13: 0, 22: 0 }, 2: { 13: 0, 22: 0 } };
for (const s of P) { conf.pares[1][13] += s.v13_1; conf.pares[1][22] += s.v22_1; conf.pares[2][13] += s.v13_2; conf.pares[2][22] += s.v22_2; }

// ---------- 2. esperado por UF, deixando o município de fora ----------
const X = (s) => [s.v13_1, s.v22_1, s.e14, s.e30, s.e55, s.e70, s.dem, s.bn1, s.a1 - s.c1, s.govA, s.govB, s.senA, s.senB];
const elegivel = (s) => s.c1 >= 10 && s.a2 >= 20 && Math.abs(s.a2 - s.a1) <= 10;
const novaSoma = () => ({ xtx: new Float64Array(K * K), y13: new Float64Array(K), y22: new Float64Array(K), n: 0 });
function somar(acc, x, y13, y22) {
  for (let a = 0; a < K; a++) { acc.y13[a] += x[a] * y13; acc.y22[a] += x[a] * y22; for (let b = 0; b < K; b++) acc.xtx[a * K + b] += x[a] * x[b]; }
  acc.n++;
}
function resolver(xtx, y) {
  const A = Array.from({ length: K }, (_, i) => { const l = new Float64Array(K + 1); for (let j = 0; j < K; j++) l[j] = xtx[i * K + j]; l[K] = y[i]; return l; });
  for (let i = 0; i < K; i++) A[i][i] += 1e-9 * (Math.abs(A[i][i]) + 1); // crista mínima contra coluna nula
  for (let c = 0; c < K; c++) {
    let p = c;
    for (let r = c + 1; r < K; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < K; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let j = c; j <= K; j++) A[r][j] -= f * A[c][j];
    }
  }
  return Array.from({ length: K }, (_, i) => A[i][K] / A[i][i]);
}
resumo.ajuste = {};
const M = new Map(); // uf|municipio -> {secoes:[]}
for (const s of P) {
  const k = `${s.uf}|${s.municipio}`;
  (M.get(k) ?? M.set(k, { uf: s.uf, municipio: s.municipio, lista: [] }).get(k)).lista.push(s);
}
for (const uf of ufs) {
  const munsUf = [...M.values()].filter((m) => m.uf === uf);
  const total = novaSoma();
  const porMun = new Map();
  for (const m of munsUf) {
    const acc = novaSoma();
    for (const s of m.lista) if (elegivel(s)) { const x = X(s); somar(acc, x, s.v13_2, s.v22_2); somar(total, x, s.v13_2, s.v22_2); }
    porMun.set(m.municipio, acc);
  }
  const b13 = resolver(total.xtx, total.y13), b22 = resolver(total.xtx, total.y22);
  resumo.ajuste[uf] = { municipios: munsUf.length, secoesAjuste: total.n, b13: Object.fromEntries(NOMES_X.map((n, i) => [n, r4(b13[i])])),
    b22: Object.fromEntries(NOMES_X.map((n, i) => [n, r4(b22[i])])) };
  for (const m of munsUf) {
    const acc = porMun.get(m.municipio);
    let c13 = b13, c22 = b22;
    m.loo = munsUf.length > 1 && total.n - acc.n > 10 * K;
    if (m.loo) {
      const xtx = total.xtx.map((v, i) => v - acc.xtx[i]);
      c13 = resolver(xtx, total.y13.map((v, i) => v - acc.y13[i]));
      c22 = resolver(xtx, total.y22.map((v, i) => v - acc.y22[i]));
    }
    for (const s of m.lista) {
      const x = X(s);
      s.p13 = x.reduce((a, v, i) => a + v * c13[i], 0);
      s.p22 = x.reduce((a, v, i) => a + v * c22[i], 0);
      s.r = (s.v13_2 - s.p13) - (s.v22_2 - s.p22);
      s.nom2 = s.v13_2 + s.v22_2;
    }
  }
}
log('esperado ajustado (deixa-um-município-de-fora)');

// ---------- 3. municípios ----------
function lnGamaP(a, x) { // ln P(a, x), gama incompleta inferior regularizada
  if (x <= 0) return -Infinity;
  if (x < a + 1) {
    let ap = a, soma = 1 / a, del = soma;
    for (let n = 0; n < 2000; n++) { ap += 1; del *= x / ap; soma += del; if (Math.abs(del) < Math.abs(soma) * 1e-15) break; }
    return Math.log(soma) - x + a * Math.log(x) - lnGama(a);
  }
  return Math.log(Math.max(1e-300, 1 - gamaQ(a, x)));
}
function dispersao(lista, x, n) { // φ = Σ (x − n·p̄)²/(n·p̄(1 − p̄)) / (k − 1)
  let X0 = 0, N0 = 0;
  for (const s of lista) { X0 += x(s); N0 += n(s); }
  const p = X0 / N0, k = lista.length;
  if (k < 2 || p <= 0 || p >= 1) return { phi: NaN, k, p };
  let S = 0;
  for (const s of lista) { const nn = n(s); S += (x(s) - nn * p) ** 2 / (nn * p * (1 - p)); }
  return { phi: S / (k - 1), k, p };
}
const mun = [];
for (const m of M.values()) {
  const L = m.lista;
  const soma = (f) => L.reduce((a, s) => a + f(s), 0);
  const o = { uf: m.uf, regiao: REGIAO[m.uf], municipio: m.municipio, nome: nomeMun.get(`${m.uf}|${m.municipio}`) ?? m.municipio, secoes: L.length,
    loo: m.loo, a1: soma((s) => s.a1), a2: soma((s) => s.a2), c1: soma((s) => s.c1), c2: soma((s) => s.c2), v13_1: soma((s) => s.v13_1), v22_1: soma((s) => s.v22_1),
    out1: soma((s) => s.out1), v13_2: soma((s) => s.v13_2), v22_2: soma((s) => s.v22_2), R: soma((s) => s.r) };
  o.nom1 = o.v13_1 + o.v22_1 + o.out1;
  o.nom2 = o.v13_2 + o.v22_2;
  o.margem1 = (100 * (o.v13_1 - o.v22_1)) / o.nom1;
  o.margem2 = (100 * (o.v13_2 - o.v22_2)) / o.nom2;
  o.viradaBruta = o.margem2 - o.margem1;
  o.dComparecimento = (100 * o.c2) / o.a2 - (100 * o.c1) / o.a1;
  o.VAE = (100 * o.R) / o.nom2;
  if (L.length >= 2 && o.nom2 > 0) {
    const media = o.R / o.nom2;
    const ss = L.reduce((a, s) => a + (s.r - media * s.nom2) ** 2, 0);
    o.sigma2 = ((L.length / (L.length - 1)) * ss * 1e4) / (o.nom2 * o.nom2);
  }
  // B1 e B2: seções com nominais ≥ 20
  const LB = L.filter((s) => s.nom2 >= NOM_B);
  o.secoesB = LB.length;
  if (LB.length >= K_B) {
    const w = LB.reduce((a, s) => a + s.nom2, 0);
    const ub = LB.reduce((a, s) => a + s.r, 0) / w; // média ponderada de u = r/nominais
    const V = (LB.reduce((a, s) => a + s.nom2 * (s.r / s.nom2 - ub) ** 2, 0) / w) * (LB.length / (LB.length - 1));
    const pi13 = LB.reduce((a, s) => a + s.v13_2, 0) / w;
    const piso = (4 * pi13 * (1 - pi13) * LB.length) / w; // média ponderada (peso nominais) de 4π13π22/nominais
    o.phiB1 = V / piso;
    o.lnPhiB1 = Math.log(o.phiB1);
    const d2 = dispersao(LB, (s) => s.v13_2, (s) => s.nom2);
    o.phi2 = d2.phi;
    o.lnPB2 = Number.isFinite(d2.phi) ? lnGamaP((d2.k - 1) / 2, ((d2.k - 1) * d2.phi) / 2) : NaN;
    const L1 = LB.filter((s) => s.v13_1 + s.v22_1 >= NOM_B);
    o.phi1 = L1.length >= K_B ? dispersao(L1, (s) => s.v13_1, (s) => s.v13_1 + s.v22_1).phi : NaN;
  }
  // governador do 2º turno (controle)
  const Lg = L.filter((s) => s.g1 && s.g2);
  if (Lg.length) {
    const g1 = [0, 0], g2 = [0, 0];
    for (const s of Lg) { g1[0] += s.g1[0]; g1[1] += s.g1[1]; g2[0] += s.g2[0]; g2[1] += s.g2[1]; }
    o.govVirada = (100 * (g2[0] - g2[1])) / (g2[0] + g2[1]) - (100 * (g1[0] - g1[1])) / (g1[0] + g1[1]);
    o.govG = g1.concat(g2);
    const LgB = Lg.filter((s) => s.g2[0] + s.g2[1] >= NOM_B);
    o.phiGov2 = LgB.length >= K_B ? dispersao(LgB, (s) => s.g2[0], (s) => s.g2[0] + s.g2[1]).phi : NaN;
  }
  o.suplementar = suplementar.has(`${m.uf}|${m.municipio}`);
  mun.push(o);
}
// virada do governador relativa à UF
for (const uf of parGov2.keys()) {
  const l = mun.filter((o) => o.uf === uf && o.govG);
  const g = [0, 0, 0, 0];
  for (const o of l) for (let i = 0; i < 4; i++) g[i] += o.govG[i];
  const vUf = (100 * (g[2] - g[3])) / (g[2] + g[3]) - (100 * (g[0] - g[1])) / (g[0] + g[1]);
  for (const o of l) o.govRel = o.govVirada - vUf;
}
log(`${mun.length} municípios`);

// ---------- 4. calibração por região e testes ----------
function calibrar(lista, val, vari) {
  const med = mediana(lista.map(val));
  const f = (t2) => mediana(lista.map((o) => (val(o) - med) ** 2 / (t2 + vari(o))));
  if (f(0) <= MEDIANA_CHI1) return { med, t2: 0 };
  let lo = 0, hi = 1;
  while (f(hi) > MEDIANA_CHI1) hi *= 2;
  for (let i = 0; i < 100; i++) { const md = (lo + hi) / 2; if (f(md) > MEDIANA_CHI1) lo = md; else hi = md; }
  return { med, t2: (lo + hi) / 2 };
}
resumo.calibracao = {};
const elegA = mun.filter((o) => o.uf !== 'df' && o.loo && o.secoes >= K_A && Number.isFinite(o.sigma2));
const elegB = mun.filter((o) => Number.isFinite(o.lnPhiB1));
conf.exclusoesA = { df: mun.filter((o) => o.uf === 'df').length, menosDe3Secoes: mun.filter((o) => o.uf !== 'df' && o.secoes < K_A).length,
  semDeixarDeFora: mun.filter((o) => o.uf !== 'df' && o.secoes >= K_A && !o.loo).length };
for (const reg of ['N', 'NE', 'CO', 'SE', 'S']) {
  const la = elegA.filter((o) => o.regiao === reg);
  const ca = calibrar(la, (o) => o.VAE, (o) => o.sigma2);
  for (const o of la) { o.z = (o.VAE - ca.med) / Math.sqrt(ca.t2 + o.sigma2); o.tau = Math.sqrt(ca.t2); }
  const lb = elegB.filter((o) => o.regiao === reg);
  const cb = calibrar(lb, (o) => o.lnPhiB1, (o) => 2 / (o.secoesB - 1));
  for (const o of lb) o.zB1 = (o.lnPhiB1 - cb.med) / Math.sqrt(cb.t2 + 2 / (o.secoesB - 1));
  resumo.calibracao[reg] = { municipiosA: la.length, medianaVAE: r4(ca.med), tau: r4(Math.sqrt(ca.t2)), municipiosB: lb.length,
    medianaLnPhiB1: r4(cb.med), phiB1Mediano: r4(Math.exp(cb.med)), sB1: r4(Math.sqrt(cb.t2)) };
}
const qA = bh(elegA.map((o) => pNormal2(o.z)));
elegA.forEach((o, i) => { o.p = pNormal2(o.z); o.q = qA[i]; o.A = o.q < Q_A && Math.abs(o.VAE) >= PP_A ? (o.VAE > 0 ? 13 : 22) : 0; });
const elegB2 = elegB.filter((o) => Number.isFinite(o.lnPB2));
const qB2 = bh(elegB2.map((o) => Math.exp(o.lnPB2)));
elegB2.forEach((o, i) => { o.qB2 = qB2[i]; o.B2 = o.qB2 < Q_B2; });
for (const o of elegB) o.B1 = o.zB1 <= Z_B1;
for (const o of mun) {
  o.conj = !!(o.A && o.B1);
  o.conjB2 = !!(o.A && o.B2);
}

// MDE do sinal A
const zc = zBilateral(Q_A / elegA.length);
for (const o of elegA) { o.mde = Math.max(PP_A, zc * Math.sqrt(o.tau ** 2 + o.sigma2)); o.mdeVotos = (o.mde / 200) * o.nom2; }
const FAIXAS = [[3, 9], [10, 49], [50, 199], [200, 999], [1000, Infinity]];
resumo.mdeA = { zCritico: r4(zc), porFaixaDeSecoes: FAIXAS.map(([a, b]) => {
  const l = elegA.filter((o) => o.secoes >= a && o.secoes <= b);
  return { secoes: `${a}–${b === Infinity ? '' : b}`, municipios: l.length, mdeMedianoPp: r2(mediana(l.map((o) => o.mde))),
    votosDeslocadosMediano: Math.round(mediana(l.map((o) => o.mdeVotos))), parcelaDosNominais: r2(mediana(l.map((o) => o.mde / 2))) };
}) };
// poder do B2 contra resultado fixado (φ ≈ 0,002, arredondamento) e contra parcela comum com ruído binomial (φ = 1)
const alfaB2 = Q_B2 / elegB2.length;
let kMin = null;
for (let k = 3; k < 500 && kMin === null; k++) if (lnGamaP((k - 1) / 2, ((k - 1) * 0.002) / 2) < Math.log(alfaB2)) kMin = k;
resumo.poderB2 = { alfaBonferroni: alfaB2, secoesMinimasParaResultadoFixado: kMin,
  nota: 'parcela comum com ruído binomial (φ = 1) fica no centro do χ² e não é detectável por B2' };

// ---------- 5. histórico ----------
const arqHist = path.join(SAIDA, 'historico-municipios.csv');
if (existsSync(arqHist)) {
  const hist = new Map((await lerTabela(arqHist, ['rel2026', 'pct2026', 'rel2022', 'pct2022', 'rel2018', 'pct2018'])).map((h) => [`${h.uf}|${h.municipio}`, h]));
  for (const o of mun) Object.assign(o, (({ rel2026, pct2026, rel2022, pct2022, rel2018, pct2018 }) => ({ relMz2026: rel2026, pct2026, rel2022, pct2022, rel2018, pct2018 }))(hist.get(`${o.uf}|${o.municipio}`) ?? {}));
  const par = (a, b) => { const l = elegA.filter((o) => Number.isFinite(o[a]) && Number.isFinite(o[b])); return { municipios: l.length, r: r2(pearson(l.map((o) => o[a]), l.map((o) => o[b]))) }; };
  resumo.historico = { 'VAE×2018': par('VAE', 'rel2018'), 'VAE×2022': par('VAE', 'rel2022'), 'VAE×viradaRelativa2026': par('VAE', 'relMz2026') };
}
const comGov = elegA.filter((o) => Number.isFinite(o.govRel));
resumo.governadorControle = { municipios: comGov.length, correlacaoVAExViradaGovernadorRelativa: r2(pearson(comGov.map((o) => o.VAE), comGov.map((o) => o.govRel))) };

// ---------- 6. resumo e saídas ----------
const marc = mun.filter((o) => o.A || o.B2);
const fracB1 = elegB.filter((o) => o.B1).length / elegB.length;
const aComB = elegA.filter((o) => o.A && Number.isFinite(o.zB1)).length;
resumo.resultado = {
  municipiosA: elegA.length, A13: elegA.filter((o) => o.A === 13).length, A22: elegA.filter((o) => o.A === 22).length,
  qMenor001SemCorte2pp: elegA.filter((o) => o.q < Q_A).length,
  municipiosB: elegB.length, B1: elegB.filter((o) => o.B1).length, fracB1: r4(fracB1),
  municipiosB2: elegB2.length, B2: elegB2.filter((o) => o.B2).length, phi2Abaixo1: elegB2.filter((o) => o.phi2 < 1).length,
  phi2Mediano: r2(mediana(elegB2.map((o) => o.phi2))), phi1Mediano: r2(mediana(elegB.filter((o) => Number.isFinite(o.phi1)).map((o) => o.phi1))),
  conjuncaoAeB1: mun.filter((o) => o.conj).length, AcomB1Definido: aComB, conjuncaoEsperadaSeIndependentes: r2(aComB * fracB1),
  conjuncaoAeB2: mun.filter((o) => o.conjB2).length,
  somaMarcadosA13VotosDeslocados: Math.round(elegA.filter((o) => o.A === 13).reduce((a, o) => a + o.R / 2, 0)),
  somaMarcadosA22VotosDeslocados: Math.round(elegA.filter((o) => o.A === 22).reduce((a, o) => a + o.R / 2, 0)),
  margem2tSemExterior: conf.pares[2][13] - conf.pares[2][22], vaeMediano: r2(mediana(elegA.map((o) => o.VAE))),
  vaeQuantis: { p01: r2(quantilSimples(elegA.map((o) => o.VAE), 0.01)), p99: r2(quantilSimples(elegA.map((o) => o.VAE), 0.99)) },
};
function quantilSimples(v, q) { const s = [...v].sort((a, b) => a - b); return s[Math.floor(q * (s.length - 1))]; }
const COLS = ['uf', 'regiao', 'municipio', 'nome', 'secoes', 'secoesB', 'loo', 'a2', 'nom1', 'nom2', 'dComparecimento', 'margem1', 'margem2', 'viradaBruta',
  'VAE', 'sigma', 'tau', 'z', 'p', 'q', 'A', 'mde', 'mdeVotos', 'votosDeslocados', 'phiB1', 'zB1', 'B1', 'phi1', 'phi2', 'pB2', 'qB2', 'B2', 'conj', 'conjB2',
  'govVirada', 'govRel', 'phiGov2', 'suplementar', 'relMz2026', 'pct2026', 'rel2022', 'pct2022', 'rel2018', 'pct2018'];
const fmt = (o) => ({ ...o, sigma: r2(Math.sqrt(o.sigma2)), tau: r2(o.tau), dComparecimento: r2(o.dComparecimento), margem1: r2(o.margem1), margem2: r2(o.margem2),
  viradaBruta: r2(o.viradaBruta), VAE: r2(o.VAE), z: r2(o.z), p: sig(o.p), q: sig(o.q), mde: r2(o.mde), mdeVotos: Math.round(o.mdeVotos ?? NaN) || null,
  votosDeslocados: Math.round(o.R / 2), phiB1: r2(o.phiB1), zB1: r2(o.zB1), phi1: r2(o.phi1), phi2: r2(o.phi2), pB2: sig(Math.exp(o.lnPB2)), qB2: sig(o.qB2),
  govVirada: r2(o.govVirada), govRel: r2(o.govRel), phiGov2: r2(o.phiGov2), A: o.A ?? null, B1: o.B1 ?? null, B2: o.B2 ?? null });
mun.sort((a, b) => (b.z ?? -Infinity) - (a.z ?? -Infinity));
await writeFile(path.join(SAIDA, 'municipios.csv'), paraCsv(mun.map(fmt), COLS));
await writeFile(path.join(SAIDA, 'marcados.csv'), paraCsv(marc.map(fmt), COLS));
await writeFile(path.join(SAIDA, 'resumo.json'), JSON.stringify(resumo, null, 1));
log(`fim: A ${resumo.resultado.A13} (13) + ${resumo.resultado.A22} (22); B1 ${resumo.resultado.B1}; B2 ${resumo.resultado.B2}; A∧B1 ${resumo.resultado.conjuncaoAeB1}`);
console.log(JSON.stringify(resumo.resultado, null, 1));
