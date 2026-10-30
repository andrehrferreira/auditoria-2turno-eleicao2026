// Parecer cético 30 (H14): testes de voto que faltavam nas duas metades.
//  (a) definição dos grupos: estatístico (secoes.csv) × engenheiro (grupos.jsonl);
//  (b) nível da parcela do 13, comparecimento e brancos+nulos contra as vizinhas do MESMO LOCAL de votação, em cada
//      turno: é o teste que enxerga uma reserva manipulada igual nos dois turnos (reservas herdadas), e que a
//      diferença-em-diferenças cancela;
//  (c) votos das 125 seções H14 com reserva carregada para outra zona e das seções/reservas "quase sem digital":
//      diferença-em-diferenças com efeito fixo de zona, nível contra vizinhas do local, e resíduo por seção;
//  (d) biometria da reserva nas 125 (a carga de outra zona tinha as digitais dos eleitores da seção?).
// Universo: todas as seções com BU nos dois turnos (as 499.176 do estatístico). Nada é amostrado.
// Entradas: data/parsed/auditoria/reservas-1t2t/secoes.csv; reservas-rastro/{grupos.jsonl,secoes-rastro.jsonl,
//   biometria-por-urna.json,urna-sem-digital.json}. Saída: data/parsed/auditoria/cetico-revisor/h14-votos.json.
// Uso: node --max-old-space-size=8192 scripts/auditoria/cetico-h14-votos.mjs
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';

const A = path.join(DIR_DADOS, 'parsed', 'auditoria');
const SAIDA = path.join(A, 'cetico-revisor');
const t0 = Date.now();

// ---------- leitura ----------
const txt = readFileSync(path.join(A, 'reservas-1t2t', 'secoes.csv'), 'utf8').split('\n');
const cab = txt[0].split(';');
const NUM = new Set(['a1', 'c1', 'v13_1', 'v22_1', 'out1', 'br1', 'nu1', 'a2', 'c2', 'v13_2', 'v22_2', 'out2', 'br2', 'nu2', 'votosOrig25']);
const todas = [];
for (let i = 1; i < txt.length; i++) {
  if (!txt[i]) continue;
  const c = txt[i].split(';');
  const s = {};
  cab.forEach((n, j) => { s[n] = NUM.has(n) ? Number(c[j] || 0) : c[j]; });
  s.k = `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`;
  todas.push(s);
}
const eng = new Map();
for (const l of readFileSync(path.join(A, 'reservas-rastro', 'grupos.jsonl'), 'utf8').split('\n')) if (l) { const o = JSON.parse(l); eng.set(o.k, o.grupo); }
const rastro = new Map();
for (const l of readFileSync(path.join(A, 'reservas-rastro', 'secoes-rastro.jsonl'), 'utf8').split('\n')) if (l) { const o = JSON.parse(l); rastro.set(o.k, o); }
const bio = new Map(JSON.parse(readFileSync(path.join(A, 'reservas-rastro', 'biometria-por-urna.json'), 'utf8')).secoes.map((o) => [o.k, o]));

const FORA = new Set(['sem_bu', 'sistema_apuracao', 'so_um_turno']);
const TN = new Set(['contingencia_dia_com_votos', 'contingencia_dia_antes_abertura', 'secao_reserva_antes', 'reserva_reserva_antes']);
const U = todas.filter((s) => !FORA.has(s.classe));
const R = { universo: U.length };

// ---------- (a) definição dos grupos ----------
const cruz = {};
for (const s of todas) { const k = `${s.classe} | ${eng.get(s.k) ?? '(ausente)'}`; cruz[k] = (cruz[k] ?? 0) + 1; }
R.cruzamentoGrupos = Object.fromEntries(Object.entries(cruz).sort((a, b) => b[1] - a[1]));
const h14Est = new Set(U.filter((s) => TN.has(s.classe)).map((s) => s.k));
const h14Eng = new Set([...eng].filter(([, g]) => g.startsWith('h14')).map(([k]) => k));
R.mesmas2818 = { estatistico: h14Est.size, engenheiro: h14Eng.size, emAmbos: [...h14Est].filter((k) => h14Eng.has(k)).length };
const antesEst = (s) => s.classe === 'secao_reserva_antes' || s.classe === 'reserva_reserva_antes';
R.divergenciaAntesNoDia = { estatAntesEngDia: U.filter((s) => antesEst(s) && eng.get(s.k) === 'h14Dia').length,
  estatDiaEngAntes: U.filter((s) => s.classe.startsWith('contingencia_dia') && eng.get(s.k) === 'h14Antes').length,
  estatDiaEngSemRegistro: U.filter((s) => s.classe.startsWith('contingencia_dia') && eng.get(s.k) === 'h14SemRegistro').length,
  exemplos: U.filter((s) => antesEst(s) && eng.get(s.k) === 'h14Dia').slice(0, 8).map((s) => ({ k: s.k, troca: rastro.get(s.k)?.troca ?? null, logsOrig: s.urnasOrig, ultimaOrig: s.ultimaOrig, votosReservaDia: rastro.get(s.k)?.votosReservaDia })) };

// ---------- marcadores ----------
const outraZona = new Set([...rastro.values()].filter((o) => o.ind?.c_zonaCargaDiferente && o.grupo.startsWith('h14')).map((o) => o.k));
const outraZonaHerd = new Set([...rastro.values()].filter((o) => o.ind?.c_zonaCargaDiferente && o.grupo === 'herdada').map((o) => o.k));
const SEM_DIGITAL_7 = ['ba/36854/0180/0149', 'ba/36854/0180/0547', 'ba/37150/0078/0158', 'rj/60011/0188/0082', 'rj/58637/0221/0178', 'rs/87173/0118/0143', 'rs/89770/0088/0113'];
const SEM_DIGITAL_OUTROS = ['rj/60011/0008/0074', 'ba/34290/0127/0336']; // herdada e outra urna de seção com o mesmo padrão (urna-sem-digital.json)
R.marcadores = { outraZonaH14: outraZona.size, outraZonaHerdada: outraZonaHerd.size, semDigital7: SEM_DIGITAL_7.length };

for (const s of U) {
  s.zon = `${s.uf}/${s.municipio}/${s.zona}`;
  s.loc = `${s.zon}/${s.local1}`;
  s.n1 = s.v13_1 + s.v22_1; s.n2 = s.v13_2 + s.v22_2;
  s.L = { // nível por turno, p.p.
    1: { comp: s.a1 ? (100 * s.c1) / s.a1 : NaN, s13: s.n1 ? (100 * s.v13_1) / s.n1 : NaN, bn: s.c1 ? (100 * (s.br1 + s.nu1)) / s.c1 : NaN },
    2: { comp: s.a2 ? (100 * s.c2) / s.a2 : NaN, s13: s.n2 ? (100 * s.v13_2) / s.n2 : NaN, bn: s.c2 ? (100 * (s.br2 + s.nu2)) / s.c2 : NaN },
  };
  s.D = { comp: s.L[2].comp - s.L[1].comp, s13: s.L[2].s13 - s.L[1].s13, bn: s.L[2].bn - s.L[1].bn };
  s.W = { 1: { comp: s.a1, s13: s.n1, bn: s.c1 }, 2: { comp: s.a2, s13: s.n2, bn: s.c2 } };
  s.ctrl = s.classe === 'controle';
  s.tn = TN.has(s.classe);
  s.oz = outraZona.has(s.k);
  s.sd = SEM_DIGITAL_7.includes(s.k);
  s.herd = s.classe === 'reserva_herdada';
}
const DES = ['comp', 's13', 'bn'];

// ---------- regressão MQ ponderada com efeito fixo (absorvido) e EP agrupado ----------
function resolver(M, v) {
  const n = M.length; const A2 = M.map((r, i) => [...r, v[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A2[r][c]) > Math.abs(A2[p][c])) p = r;
    [A2[c], A2[p]] = [A2[p], A2[c]];
    const d = A2[c][c]; if (Math.abs(d) < 1e-12) return null;
    for (let j = c; j <= n; j++) A2[c][j] /= d;
    for (let r = 0; r < n; r++) if (r !== c) { const f = A2[r][c]; for (let j = c; j <= n; j++) A2[r][j] -= f * A2[c][j]; }
  }
  return A2.map((r) => r[n]);
}
function inversa(M) { const n = M.length; return M.map((_, i) => resolver(M, M.map((__, j) => (i === j ? 1 : 0)))).map((col, i, arr) => arr.map((c) => c[i])); }
function mqef(lista, { y, x, w, fe, cl }) {
  let L = lista.map((s) => ({ s, y: y(s), x: x(s), w: w(s), g: fe(s) })).filter((l) => Number.isFinite(l.y) && l.w > 0);
  const k = L[0].x.length;
  const acc = new Map();
  for (const l of L) { let a = acc.get(l.g); if (!a) { a = { w: 0, y: 0, x: new Float64Array(k), n: 0 }; acc.set(l.g, a); } a.w += l.w; a.y += l.w * l.y; a.n++; for (let j = 0; j < k; j++) a.x[j] += l.w * l.x[j]; }
  L = L.filter((l) => acc.get(l.g).n > 1);
  for (const l of L) { const a = acc.get(l.g); l.y -= a.y / a.w; l.x = l.x.map((v, j) => v - a.x[j] / a.w); }
  const XtX = Array.from({ length: k }, () => new Array(k).fill(0)); const Xty = new Array(k).fill(0);
  for (const l of L) for (let a = 0; a < k; a++) { Xty[a] += l.w * l.x[a] * l.y; for (let c = 0; c < k; c++) XtX[a][c] += l.w * l.x[a] * l.x[c]; }
  // colunas sem variação dentro do efeito fixo: zera e marca
  const ok = XtX.map((r, i) => r[i] > 1e-9);
  const idx = ok.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
  const Xs = idx.map((a) => idx.map((c) => XtX[a][c])); const ys = idx.map((a) => Xty[a]);
  const inv = inversa(Xs); const b = resolver(Xs, ys);
  if (!inv || !b) return null;
  const meat = Array.from({ length: idx.length }, () => new Array(idx.length).fill(0)); const clus = new Map();
  for (const l of L) {
    const xs = idx.map((j) => l.x[j]); const e = l.y - xs.reduce((s2, v, j) => s2 + v * b[j], 0);
    const c = cl(l.s); let g = clus.get(c); if (!g) { g = new Float64Array(idx.length); clus.set(c, g); }
    for (let a = 0; a < idx.length; a++) g[a] += l.w * xs[a] * e;
  }
  for (const g of clus.values()) for (let a = 0; a < idx.length; a++) for (let c = 0; c < idx.length; c++) meat[a][c] += g[a] * g[c];
  const G = clus.size, n = L.length, f = (G / (G - 1)) * ((n - 1) / (n - idx.length));
  const V = inv.map((r) => meat.map((_, c) => r.reduce((s2, v, j) => s2 + v * meat[j][c], 0))).map((r) => inv.map((_, c) => f * r.reduce((s2, v, j) => s2 + v * inv[j][c], 0)));
  const out = {}; idx.forEach((j, i) => { out[j] = { b: b[i], ep: Math.sqrt(V[i][i]), V: V[i] }; out[j].pos = i; });
  return { coef: out, n, G, emUso: new Set(L.map((l) => l.s)) };
}
function erfc(x) { const z = Math.abs(x); const t = 1 / (1 + 0.5 * z); const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))))); return x >= 0 ? r : 2 - r; }
const p2 = (z) => erfc(Math.abs(z) / Math.SQRT2);
const ef = (c, base, alfaZ = 1.96) => (c ? { pp: c.b, ep: c.ep, ic95: [c.b - 1.96 * c.ep, c.b + 1.96 * c.ep], p: p2(c.b / c.ep), mde80pp: (alfaZ + 0.8416) * c.ep,
  votos: (c.b / 100) * base, ic95Votos: [((c.b - 1.96 * c.ep) / 100) * base, ((c.b + 1.96 * c.ep) / 100) * base], mde80Votos: (((alfaZ + 0.8416) * c.ep) / 100) * base } : null);
const somaW = (l, t, d) => l.reduce((a, s) => a + (Number.isFinite(s.L[t][d]) ? s.W[t][d] : 0), 0);
const MODS = ['ue2015', 'ue2020', 'ue2022'];
const ctrlX = (s) => [...MODS.map((m) => (s.modelo1 === m ? 1 : 0)), Math.log(Math.max(s.a2, 1))];
const outrosGrupos = (s) => !s.ctrl && !s.tn && !s.herd;

// ---------- (b) nível contra vizinhas do mesmo local e da mesma zona, por turno ----------
// Regressão do NÍVEL de cada turno em indicadores de grupo, efeito fixo do local de votação (ou da zona), log dos
// aptos; peso = denominador do turno; EP agrupado por zona. Grupos: herdada, troca nova (2.818), outras trocas.
R.nivel = {};
const herd = U.filter((s) => s.herd); const tnL = U.filter((s) => s.tn);
for (const fe of ['local', 'zona']) {
  R.nivel[fe] = {};
  for (const t of [1, 2]) for (const d of DES) {
    const aj = mqef(U, { y: (s) => s.L[t][d], x: (s) => [s.herd ? 1 : 0, s.tn ? 1 : 0, outrosGrupos(s) ? 1 : 0, Math.log(Math.max(s.a2, 1))], w: (s) => s.W[t][d],
      fe: fe === 'local' ? (s) => s.loc : (s) => s.zon, cl: (s) => s.zon });
    const hU = herd.filter((s) => aj.emUso.has(s)); const tU = tnL.filter((s) => aj.emUso.has(s));
    R.nivel[fe][`t${t}_${d}`] = { herdada: { ...ef(aj.coef[0], somaW(hU, t, d)), secoesEmUso: hU.length }, trocaNova: { ...ef(aj.coef[1], somaW(tU, t, d)), secoesEmUso: tU.length } };
  }
}
// herdada × troca nova no 1º turno (urna ainda original nas trocas novas): diferença de nível 2T da herdada contra o
// "perfil" das seções que trocam de urna, medido no 1º turno das trocas novas.
console.log(`(b) nível: ${((Date.now() - t0) / 1000).toFixed(0)} s`);

// ---------- (c) diferença-em-diferenças com subgrupos ----------
// Mesmo desenho do estatístico (Δ 1T→2T, efeito fixo de zona, modelo do 1T, log aptos, peso do 2T, EP por zona), com
// as 2.818 separadas em: outra zona (125), quase sem digital (7) e demais trocas novas.
R.did = {};
const oz = U.filter((s) => s.oz); const sd = U.filter((s) => s.sd); const resto = U.filter((s) => s.tn && !s.oz && !s.sd);
const ozH = U.filter((s) => outraZonaHerd.has(s.k));
for (const d of DES) {
  const aj = mqef(U, { y: (s) => s.D[d], x: (s) => [s.oz ? 1 : 0, s.sd ? 1 : 0, s.tn && !s.oz && !s.sd ? 1 : 0, s.herd && !outraZonaHerd.has(s.k) ? 1 : 0, outraZonaHerd.has(s.k) ? 1 : 0, outrosGrupos(s) ? 1 : 0, ...ctrlX(s)],
    w: (s) => s.W[2][d], fe: (s) => s.zon, cl: (s) => s.zon });
  const c = aj.coef;
  // diferença outra zona − demais trocas novas
  const dif = { b: c[0].b - c[2].b, ep: Math.sqrt(c[0].ep ** 2 + c[2].ep ** 2 - 2 * c[0].V[c[2].pos]) };
  R.did[d] = { outraZona125: ef(c[0], somaW(oz, 2, d)), semDigital7: ef(c[1], somaW(sd, 2, d)), demaisTrocasNovas: ef(c[2], somaW(resto, 2, d)),
    herdadaOutraZona45: ef(c[4], somaW(ozH, 2, d)), outraZonaMenosDemais: ef(dif, somaW(oz, 2, d)) };
}
console.log(`(c) DiD: ${((Date.now() - t0) / 1000).toFixed(0)} s`);

// nível das 125 e das 7 contra vizinhas do local, por turno
for (const t of [1, 2]) for (const d of DES) {
  const aj = mqef(U, { y: (s) => s.L[t][d], x: (s) => [s.oz ? 1 : 0, s.sd ? 1 : 0, s.tn && !s.oz && !s.sd ? 1 : 0, s.herd ? 1 : 0, outrosGrupos(s) ? 1 : 0, Math.log(Math.max(s.a2, 1))],
    w: (s) => s.W[t][d], fe: (s) => s.loc, cl: (s) => s.zon });
  R.nivel.local[`sub_t${t}_${d}`] = { outraZona125: { ...ef(aj.coef[0], somaW(oz.filter((s) => aj.emUso.has(s)), t, d)), secoesEmUso: oz.filter((s) => aj.emUso.has(s)).length },
    semDigital7: { ...ef(aj.coef[1], somaW(sd.filter((s) => aj.emUso.has(s)), t, d)), secoesEmUso: sd.filter((s) => aj.emUso.has(s)).length } };
}

// ---------- resíduo por seção (Δ − média da zona no controle), escala MAD do controle, p empírico ----------
const zonaMed = {}; const escala = {}; const absC = {};
for (const d of DES) {
  const m = new Map();
  for (const s of U) if (s.ctrl && Number.isFinite(s.D[d])) { const a = m.get(s.zon) ?? { w: 0, y: 0 }; a.w += s.W[2][d]; a.y += s.W[2][d] * s.D[d]; m.set(s.zon, a); }
  zonaMed[d] = m;
  const res = [];
  for (const s of U) { const a = m.get(s.zon); s.res = s.res ?? {}; s.res[d] = a && Number.isFinite(s.D[d]) ? s.D[d] - a.y / a.w : NaN; if (s.ctrl && Number.isFinite(s.res[d])) res.push(s.res[d]); }
  res.sort((x, y) => x - y); const med = res[res.length >> 1];
  const dev = res.map((v) => Math.abs(v - med)).sort((x, y) => x - y);
  escala[d] = 1.4826 * dev[dev.length >> 1];
  absC[d] = Float64Array.from(res.map((v) => Math.abs(v - med) / escala[d])).sort();
}
const pEmp = (d, z) => { const a = Math.abs(z), arr = absC[d]; let lo = 0, hi = arr.length; while (lo < hi) { const m2 = (lo + hi) >> 1; if (arr[m2] < a) lo = m2 + 1; else hi = m2; } return (arr.length - lo + 1) / (arr.length + 1); };
// vizinhas do local: média ponderada do controle do mesmo local, por turno
const locMed = new Map();
for (const s of U) if (s.ctrl) { const a = locMed.get(s.loc) ?? { n: 0, v13: [0, 0], nn: [0, 0], c: [0, 0], ap: [0, 0], bn: [0, 0] }; a.n++;
  a.v13[0] += s.v13_1; a.nn[0] += s.n1; a.v13[1] += s.v13_2; a.nn[1] += s.n2; a.c[0] += s.c1; a.c[1] += s.c2; a.ap[0] += s.a1; a.ap[1] += s.a2; a.bn[0] += s.br1 + s.nu1; a.bn[1] += s.br2 + s.nu2; locMed.set(s.loc, a); }
const r1 = (v) => Math.round(v * 100) / 100;
const ficha = (s) => {
  const lm = locMed.get(s.loc); const zm = (d) => { const a = zonaMed[d].get(s.zon); return a ? a.y / a.w : NaN; };
  return { k: s.k, classe: s.classe, grupoEng: eng.get(s.k), modelo1: s.modelo1, modelo2: s.modelo2,
    t1: { aptos: s.a1, comp: s.c1, v13: s.v13_1, v22: s.v22_1, br: s.br1, nu: s.nu1, s13: r1(s.L[1].s13), compPct: r1(s.L[1].comp), bnPct: r1(s.L[1].bn) },
    t2: { aptos: s.a2, comp: s.c2, v13: s.v13_2, v22: s.v22_2, br: s.br2, nu: s.nu2, s13: r1(s.L[2].s13), compPct: r1(s.L[2].comp), bnPct: r1(s.L[2].bn) },
    deltaSecao: { s13: r1(s.D.s13), comp: r1(s.D.comp), bn: r1(s.D.bn) },
    deltaZonaControle: { s13: r1(zm('s13')), comp: r1(zm('comp')), bn: r1(zm('bn')) },
    z: Object.fromEntries(DES.map((d) => [d, r1(s.res[d] / escala[d])])), pEmp: Object.fromEntries(DES.map((d) => [d, Number(pEmp(d, s.res[d] / escala[d]).toPrecision(2))])),
    vizinhasLocal: lm ? { secoes: lm.n, s13_1: r1((100 * lm.v13[0]) / lm.nn[0]), s13_2: r1((100 * lm.v13[1]) / lm.nn[1]), comp_1: r1((100 * lm.c[0]) / lm.ap[0]), comp_2: r1((100 * lm.c[1]) / lm.ap[1]), bn_1: r1((100 * lm.bn[0]) / lm.c[0]), bn_2: r1((100 * lm.bn[1]) / lm.c[1]) } : null,
    reserva: bio.get(s.k)?.reserva ? { votos: bio.get(s.k).reserva.votos, semBio: bio.get(s.k).reserva.votos - bio.get(s.k).reserva.bio, semMesario: bio.get(s.k).reserva.semMesario } : null,
    outraUrnaDia: bio.get(s.k)?.outras ? { votos: bio.get(s.k).outras.votos, semBio: bio.get(s.k).outras.votos - bio.get(s.k).outras.bio } : null };
};
R.fichasSemDigital = [...SEM_DIGITAL_7, ...SEM_DIGITAL_OUTROS].map((k) => U.find((s) => s.k === k)).filter(Boolean).map(ficha);
// 125: resíduos (contagem de |z|>3) e soma de votos
const cauda = (l, d) => l.filter((s) => Math.abs(s.res[d] / escala[d]) > 3).length;
R.outraZona = { secoes: oz.length, porGrupoEst: Object.fromEntries([...new Set(oz.map((s) => s.classe))].map((c) => [c, oz.filter((s) => s.classe === c).length])),
  t1: { v13: oz.reduce((a, s) => a + s.v13_1, 0), v22: oz.reduce((a, s) => a + s.v22_1, 0), comp: oz.reduce((a, s) => a + s.c1, 0), aptos: oz.reduce((a, s) => a + s.a1, 0) },
  t2: { v13: oz.reduce((a, s) => a + s.v13_2, 0), v22: oz.reduce((a, s) => a + s.v22_2, 0), comp: oz.reduce((a, s) => a + s.c2, 0), aptos: oz.reduce((a, s) => a + s.a2, 0) },
  caudaZ3: Object.fromEntries(DES.map((d) => [d, { outraZona: cauda(oz, d), esperado: oz.length * (absC[d].filter((v) => v > 3).length / absC[d].length) }])),
  maiores: oz.map((s) => ({ k: s.k, zmax: Math.max(...DES.map((d) => Math.abs(s.res[d] / escala[d]))) })).sort((a, b) => b.zmax - a.zmax).slice(0, 5).map((o) => ficha(U.find((s) => s.k === o.k))) };
// blocos das 125
const blocos = {};
for (const s of oz) {
  const o = rastro.get(s.k); const b = `${s.uf}/${s.municipio}/${s.zona} <- ${o.carga.municipio}/${o.carga.zona}`;
  const x = (blocos[b] ??= { n: 0, v13_1: 0, v22_1: 0, v13_2: 0, v22_2: 0, zonaCtrlDs13: r1(zonaMed.s13.get(s.zon) ? zonaMed.s13.get(s.zon).y / zonaMed.s13.get(s.zon).w : NaN) });
  x.n++; x.v13_1 += s.v13_1; x.v22_1 += s.v22_1; x.v13_2 += s.v13_2; x.v22_2 += s.v22_2;
}
R.outraZona.blocos = Object.fromEntries(Object.entries(blocos).sort((a, b) => b[1].n - a[1].n).map(([k, v]) => [k, { ...v, s13_1: r1((100 * v.v13_1) / (v.v13_1 + v.v22_1)), s13_2: r1((100 * v.v13_2) / (v.v13_2 + v.v22_2)) }]));

// ---------- (d) biometria da reserva nas 125 × demais H14 ----------
const bioSoma = (l) => l.reduce((a, s) => { const b = bio.get(s.k)?.reserva; if (b) { a.votos += b.votos; a.semBio += b.votos - b.bio; a.semMes += b.semMesario; a.n++; } return a; }, { n: 0, votos: 0, semBio: 0, semMes: 0 });
const bOz = bioSoma(oz), bResto = bioSoma(U.filter((s) => s.tn && !s.oz));
R.biometriaReserva = { outraZona: { ...bOz, pctSemBio: (100 * bOz.semBio) / bOz.votos }, demaisH14: { ...bResto, pctSemBio: (100 * bResto.semBio) / bResto.votos },
  // mesma seção no 1º turno: % sem biometria não está no secoes.csv; o engenheiro (item 4) traz o 1º turno por grupo
  secoesOutraZonaComReservaAcima50pctSemBio: oz.filter((s) => { const b = bio.get(s.k)?.reserva; return b && b.votos >= 50 && (b.votos - b.bio) / b.votos > 0.5; }).map((s) => s.k) };

// ---------- escala: o que as reservas poderiam mudar no resultado ----------
const tot = (l, f) => l.reduce((a, s) => a + f(s), 0);
const nac = { v13: tot(U, (s) => s.v13_2), v22: tot(U, (s) => s.v22_2) };
R.escala = { brasil2t: { ...nac, margem: nac.v13 - nac.v22 },
  trocasNovas: { v13: tot(tnL, (s) => s.v13_2), v22: tot(tnL, (s) => s.v22_2) },
  herdadas: { v13: tot(herd, (s) => s.v13_2), v22: tot(herd, (s) => s.v22_2) } };
R.escala.nota = 'universo do estatístico (499.176 seções com BU nos dois turnos), presidente, BU';

mkdirSync(SAIDA, { recursive: true });
writeFileSync(path.join(SAIDA, 'h14-votos.json'), JSON.stringify(R, (k, v) => (k === 'V' || k === 'pos' ? undefined : v), 1));
console.log(JSON.stringify(R, (k, v) => (k === 'V' || k === 'pos' ? undefined : typeof v === 'number' ? Number(v.toPrecision(5)) : v), 1));
console.log(`fim ${((Date.now() - t0) / 1000).toFixed(0)} s`);
