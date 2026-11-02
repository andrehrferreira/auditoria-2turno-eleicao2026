// Estatístico eleitoral, H19(a) do plano 31 (commit 067d1a7): as seções que são as únicas do prédio com aquele modelo de
// urna (26.933 no doc 21), comparadas com a zona × modelo da urna do 2º turno (g'). Salto da própria seção:
//   J' = [logit f₂ − logit f₁]ₛ − [logit f₂ − logit f₁] de g' sem a seção (+0,5 nas caselas), V binomial, τ² pelo MAD de
//   J' das isoladas por UF, z robusto pela mediana; Bonferroni sobre as isoladas testadas.
// M1-iso: ΔY ~ (Δa, Δf, Δh) separados para isoladas e não isoladas + controles do M1 + indicador de isolada, efeito fixo
//   g', peso 13 + 22 do 2º turno, CR1 por município. M2-iso: ΔY ~ S↑', S↓' (isoladas e não isoladas) + controles.
// Família A: 3 × 6 + 6 = 24 testes (Brasil e 5 regiões), |z| ≥ 3,08. Placebo (Y do 1º turno), rastro (Δcomparecimento),
// sem urnas trocadas, MDE (β e injeção em votos), sensibilidade com município × modelo.
// Entradas: estatistico/h19/medidas.csv.gz (doc 21, pela lib estatistico-h19-lib.mjs) e reservas-1t2t/secoes.csv (aptos).
// Saída: h14-h19-final/isoladas.json e isoladas-saltos.csv
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { REGIOES, UFS_BR, ctrlDe, mediana, regredir, todas } from './estatistico-h19-lib.mjs';
import { DIR_FINAL, bh, lerCsv, num, pBi, zBonf } from './estatistico-h14-h19-final-lib.mjs';

const t0 = Date.now();
const log = (...m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)} s]`, ...m);
const aptos = new Map((await lerCsv(path.join(DIR_DADOS, 'parsed', 'auditoria', 'reservas-1t2t', 'secoes.csv'))).map((o) => [`${o.uf}/${o.municipio}/${o.zona}/${o.secao}`, [num(o.a1), num(o.a2)]]));
const logit = (x, y) => Math.log((x + 0.5) / (y + 0.5));
const expit = (v) => 1 / (1 + Math.exp(-v));

// ---------- elegibilidade: a do plano 20, sem a regra "sozinha no grupo" (mesma ordem e mesmos textos)
const exclusoes = {};
const exclui = (m) => { exclusoes[m] = (exclusoes[m] ?? 0) + 1; };
const eleg = [];
for (const s of todas) {
  if (!s.bate1 || !s.bate2) { exclui('diário diferente do BU em algum turno'); continue; }
  if (s.M1 + s.H1 !== s.F1 || s.M2 + s.H2 !== s.F2) { exclui('V3m + V3s da H08 diferente das falhas do leitor'); continue; }
  if (s.R1 + s.F1 < 20 || s.R2 + s.F2 < 20 || s.R1 < 10 || s.R2 < 10) { exclui('B < 20 ou R < 10 em algum turno'); continue; }
  if (s.v13_1 + s.v22_1 < 20 || s.v13_2 + s.v22_2 < 20) { exclui('menos de 20 votos em 13 + 22 em algum turno'); continue; }
  if (!s.eleitores || s.idade70 === null) { exclui('sem perfil do eleitorado'); continue; }
  if (s.local2 === null || !s.modelo2) { exclui('sem local ou modelo no 2º turno'); continue; }
  const id = `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`;
  const ap = aptos.get(id);
  const o = { ...s, id, gLoc: `${s.uf}/${s.municipio}/${s.zona}/${s.local2}/${s.modelo2}`, gZon: `${s.uf}/${s.municipio}/${s.zona}/${s.modelo2}`,
    gMun: `${s.uf}/${s.municipio}/${s.modelo2}`, mun: `${s.uf}/${s.municipio}`, a1x: ap?.[0], a2x: ap?.[1] };
  o.B1 = o.R1 + o.F1; o.B2 = o.R2 + o.F2; o.f1 = o.F1 / o.B1; o.f2 = o.F2 / o.B2; o.a1 = o.tentR1 / o.R1; o.a2 = o.tentR2 / o.R2;
  o.h1 = o.H1 / o.B1; o.h2 = o.H2 / o.B2; o.Y1 = o.v13_1 / (o.v13_1 + o.v22_1); o.Y2 = o.v13_2 / (o.v13_2 + o.v22_2);
  o.xanb1 = o.anb1 / o.votos1; o.xanb2 = o.anb2 / o.votos2; o.trocada = o.urna1 !== o.urna2 ? 1 : 0;
  eleg.push(o);
}
const cont = (k) => { const m = new Map(); for (const s of eleg) m.set(s[k], (m.get(s[k]) ?? 0) + 1); return m; };
const nLoc = cont('gLoc'), nZon = cont('gZon');
for (const s of eleg) s.iso = nLoc.get(s.gLoc) === 1 ? 1 : 0;
const iso = eleg.filter((s) => s.iso);
const isoSemZona = iso.filter((s) => nZon.get(s.gZon) === 1);
log(`elegíveis ${eleg.length}; isoladas no local × modelo ${iso.length}; destas, sozinhas também na zona × modelo ${isoSemZona.length}`);

// ---------- Parte 1-iso: salto da própria seção contra g' (zona × modelo) sem ela
function saltos(lista, chave) {
  const tot = new Map();
  for (const s of lista) { const t = tot.get(s[chave]) ?? { F1: 0, R1: 0, F2: 0, R2: 0, tR1: 0, tR2: 0, n: 0 }; t.F1 += s.F1; t.R1 += s.R1; t.F2 += s.F2; t.R2 += s.R2; t.tR1 += s.tentR1; t.tR2 += s.tentR2; t.n++; tot.set(s[chave], t); }
  for (const s of lista) {
    const t = tot.get(s[chave]);
    if (t.n < 2) { s.J = null; continue; }
    const P = { F1: t.F1 - s.F1, R1: t.R1 - s.R1, F2: t.F2 - s.F2, R2: t.R2 - s.R2 };
    const ds = logit(s.F2, s.R2) - logit(s.F1, s.R1), dP = logit(P.F2, P.R2) - logit(P.F1, P.R1);
    s.J = ds - dP;
    s.V = 1 / (s.F1 + 0.5) + 1 / (s.R1 + 0.5) + 1 / (s.F2 + 0.5) + 1 / (s.R2 + 0.5) + 1 / (P.F1 + 0.5) + 1 / (P.R1 + 0.5) + 1 / (P.F2 + 0.5) + 1 / (P.R2 + 0.5);
    s.saltoF = (s.f2 - s.f1) - (P.F2 / (P.F2 + P.R2) - P.F1 / (P.F1 + P.R1));
    s.saltoA = (s.a2 - s.a1) - ((t.tR2 - s.tentR2) / P.R2 - (t.tR1 - s.tentR1) / P.R1);
    s.E = s.F2 - s.B2 * expit(logit(s.F1, s.R1) + dP);
    s.Emais = Math.max(0, s.E);
  }
}
saltos(eleg, 'gZon');
const sobred = {};
const zRobusto = (lista, rotulo) => {
  for (const uf of UFS_BR) {
    const v = lista.filter((s) => s.uf === uf && s.J !== null);
    if (!v.length) continue;
    const J = v.map((s) => s.J), med = mediana(J), mad = 1.4826 * mediana(J.map((x) => Math.abs(x - med)));
    const tau2 = Math.max(0, mad * mad - mediana(v.map((s) => s.V)));
    (sobred[rotulo] ??= {})[uf] = { secoes: v.length, medianaJ: med, madJ: mad, tau2 };
    for (const s of v) s.zOd = (s.J - med) / Math.sqrt(s.V + tau2);
  }
};
zRobusto(iso, 'isoladas');
zRobusto(eleg.filter((s) => !s.iso), 'naoIsoladas');
for (const s of eleg) { s.Sup = s.J !== null && s.zOd >= 3 && s.saltoF >= 0.05 ? 1 : 0; s.Sdown = s.J !== null && s.zOd <= -3 && s.saltoF <= -0.05 ? 1 : 0; }
const testadas = iso.filter((s) => s.J !== null);
const ZB = zBonf(testadas.length);
const qs = bh(testadas.map((s) => pBi(s.zOd)));
testadas.forEach((s, i) => { s.q = qs[i]; });
const parte1 = { testadas: testadas.length, corteBonferroni: ZB, sobredispersao: sobred.isoladas };
for (const [nome, f] of [['sobe', (s) => s.zOd >= ZB], ['desce', (s) => s.zOd <= -ZB], ['sobeBH', (s) => s.q < 0.05 && s.zOd > 0], ['desceBH', (s) => s.q < 0.05 && s.zOd < 0], ['Ssobe', (s) => s.Sup], ['Sdesce', (s) => s.Sdown]]) {
  const l = testadas.filter(f);
  parte1[nome] = { secoes: l.length, trocada: l.filter((s) => s.trocada).length, leitorPior: l.filter((s) => s.saltoA >= 0.3).length,
    saltoMedioPontos: l.length ? (100 * l.reduce((a, s) => a + s.saltoF, 0)) / l.length : null, somaE: l.reduce((a, s) => a + s.E, 0),
    porRegiao: Object.fromEntries(Object.keys(REGIOES).map((r) => [r, l.filter((s) => REGIOES[r].includes(s.uf)).length])) };
}
parte1.maioresSubidas = [...testadas].sort((a, b) => b.zOd - a.zOd).slice(0, 5).map((s) => ({ id: s.id, z: s.zOd, urna1: s.urna1, urna2: s.urna2, modelo1: s.modelo1, modelo2: s.modelo2,
  R1: s.R1, F1: s.F1, R2: s.R2, F2: s.F2, H1: s.H1, H2: s.H2, a1: s.a1, a2: s.a2, v13_1: s.v13_1, v22_1: s.v22_1, v13_2: s.v13_2, v22_2: s.v22_2, saltoFpontos: 100 * s.saltoF }));
log('parte 1', JSON.stringify({ testadas: parte1.testadas, corte: ZB, sobe: parte1.sobe.secoes, desce: parte1.desce.secoes, Ssobe: parte1.Ssobe.secoes }));

// ---------- Parte 2-iso
const Z_A = zBonf(24), Z80 = 0.8416;
const UNI = [['Brasil', UFS_BR], ...Object.entries(REGIOES)];
const yDe = { delta: (s, v13, v22) => 100 * (v13 / (v13 + v22) - s.Y1), placebo: (s) => 100 * s.Y1,
  comp: (s, v13, v22, k = 0) => (s.a1x > 0 && s.a2x > 0 ? 100 * ((s.comp2 + k) / s.a2x - s.comp1 / s.a1x) : NaN) };
function linhas(lista, modelo, { desfecho = 'delta', grupo = 'gZon', inj = null } = {}) {
  const out = [];
  for (const s of lista) {
    let { F2, B2, H2, votos2, v13_2, v22_2 } = s;
    let k = 0;
    if (inj && inj.so(s)) { k = inj.phi * (s.Emais ?? 0); F2 += k; B2 += k; votos2 += k; if (inj.cand === 13) v13_2 += k; else v22_2 += k; }
    const f2 = F2 / B2, h2 = H2 / B2, xanb2 = s.anb2 / votos2;
    const dx = [s.a2 - s.a1, f2 - s.f1, h2 - s.h1];
    const x = modelo === 'M1' ? [...dx.map((v) => v * s.iso), ...dx.map((v) => v * (1 - s.iso))] : [s.Sup * s.iso, s.Sdown * s.iso, s.Sup * (1 - s.iso), s.Sdown * (1 - s.iso)];
    const y = desfecho === 'comp' ? yDe.comp(s, v13_2, v22_2, k) : desfecho === 'placebo' ? yDe.placebo(s) : yDe.delta(s, v13_2, v22_2);
    if (!Number.isFinite(y)) continue;
    out.push({ g: s[grupo], cl: s.mun, w: s.v13_2 + s.v22_2, x, c: [...ctrlDe({ ...s, xanb2 }), s.iso], y });
  }
  return out;
}
const NOMES = { M1: ['Δa', 'Δf', 'Δh'], M2: ['S↑', 'S↓'] };
const rodar = (lista, modelo, opc) => { const r = regredir(linhas(lista, modelo, opc)); return r; };
const familia = [];
const detalhe = {};
for (const [u, ufs] of UNI) {
  const L = eleg.filter((s) => ufs.includes(s.uf));
  const d = (detalhe[u] = { secoes: L.length, isoladas: L.filter((s) => s.iso).length, isoladasSup: L.filter((s) => s.iso && s.Sup).length });
  for (const modelo of ['M1', 'M2']) {
    const r = rodar(L, modelo, {});
    const pl = rodar(L, modelo, { desfecho: 'placebo' });
    const cp = rodar(L, modelo, { desfecho: 'comp' });
    const st = rodar(L.filter((s) => !s.trocada), modelo, {});
    const mu = rodar(L, modelo, { grupo: 'gMun' });
    const nIso = NOMES[modelo].length;
    d[modelo] = { N: r.N, grupos: r.grupos, clusters: r.clusters, coef: {} };
    NOMES[modelo].forEach((nm, j) => {
      const z = r.beta[j] / r.se[j];
      const e = { beta: r.beta[j], se: r.se[j], z, p: pBi(z), mdeBeta: (Z_A + Z80) * r.se[j],
        placeboZ: pl.beta[j] / pl.se[j], compBeta: cp.beta[j], compZ: cp.beta[j] / cp.se[j], semTrocadasZ: st.beta[j] / st.se[j], municipioXmodeloZ: mu.beta[j] / mu.se[j],
        naoIsoladas: { beta: r.beta[j + nIso], z: r.beta[j + nIso] / r.se[j + nIso] } };
      d[modelo].coef[nm] = e;
      if (modelo === 'M1' || nm === 'S↑') {
        const passa = Math.abs(z) >= Z_A;
        const compat = passa && (Math.abs(e.placeboZ) < 2 || Math.sign(e.placeboZ) !== Math.sign(z)) && Math.sign(e.semTrocadasZ) === Math.sign(z) && Math.abs(e.semTrocadasZ) >= 2
          && Math.sign(e.compZ) === Math.sign(z) && Math.abs(e.compZ) >= 2;
        familia.push({ unidade: u, modelo, coef: nm, beta: e.beta, se: e.se, z, p: e.p, passa, compativelH19: compat, placeboZ: e.placeboZ, compZ: e.compZ, semTrocadasZ: e.semTrocadasZ, mdeBeta: e.mdeBeta });
      }
    });
    // MDE em votos por injeção (φ = 1%): Δf no M1 e S↑ no M2, a favor do 13 e do 22, só nas isoladas
    const ESoma = L.filter((s) => s.iso && (modelo === 'M1' || s.Sup)).reduce((a, s) => a + (s.Emais ?? 0), 0);
    const j = modelo === 'M1' ? 1 : 0;
    const z0 = r.beta[j] / r.se[j];
    d[modelo].injecao = {};
    for (const cand of [13, 22]) {
      const ri = rodar(L, modelo, { inj: { phi: 0.01, cand, so: (s) => s.iso && (modelo === 'M1' || s.Sup) } });
      const dz = Math.abs(ri.beta[j] / ri.se[j] - z0);
      const phi = dz > 0 ? (0.01 * (Z_A + Z80)) / dz : null;
      d[modelo].injecao[cand] = { Emais: ESoma, deslocamentoZ: dz, phiMDE: phi, votosMDE: phi !== null ? phi * ESoma : null };
    }
    log(u, modelo, JSON.stringify(d[modelo].coef));
  }
}
const qF = bh(familia.map((f) => f.p));
familia.forEach((f, i) => { f.qBH = qF[i]; });
const R = { geradoEm: new Date().toISOString(), plano: '31 (commit 067d1a7)', exclusoes, elegiveis: eleg.length, isoladas: iso.length, isoladasSemVizinhaNaZonaModelo: isoSemZona.length,
  parte1, familiaA: { testes: familia.length, corte: Z_A, passam: familia.filter((f) => f.passa).length, compativeisH19: familia.filter((f) => f.compativelH19).length, lista: familia }, unidades: detalhe };
await writeFile(path.join(DIR_FINAL, 'isoladas.json'), JSON.stringify(R, null, 1));
const sal = testadas.filter((s) => Math.abs(s.zOd) >= 3).sort((a, b) => b.zOd - a.zOd);
await writeFile(path.join(DIR_FINAL, 'isoladas-saltos.csv'), ['id;modelo2;trocada;zOd;q;saltoFpontos;saltoA;E;R1;F1;R2;F2', ...sal.map((s) => [s.id, s.modelo2, s.trocada, s.zOd.toFixed(3), s.q.toExponential(3), (100 * s.saltoF).toFixed(2), s.saltoA.toFixed(3), s.E.toFixed(1), s.R1, s.F1, s.R2, s.F2].join(';'))].join('\n') + '\n');
log('fim', JSON.stringify({ passam: R.familiaA.passam, compat: R.familiaA.compativeisH19 }));
