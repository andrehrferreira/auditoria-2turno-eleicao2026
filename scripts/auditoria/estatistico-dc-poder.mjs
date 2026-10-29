// Estatístico eleitoral, pergunta 5: poder do desenho. Insere votos falsos nos dados reais (cópia em memória),
// refaz o modelo e os testes das perguntas 1 a 4 e mede quantas vezes cada regra de decisão dispara.
//
// Uso: node --max-old-space-size=8192 scripts/auditoria/estatistico-dc-poder.mjs [banco|abertos] [replicas] [índices dos cenários, ex.: 0,13]
//   com índices, a saída vai para poder-<fonte>-<índices>.json
//   banco (padrão): UFs com o 1º turno na cópia de leitura (tem a categoria de habilitação, para o teste E2)
// Saída: data/parsed/auditoria/estatistico-eleitoral/poder-<fonte>.json
//
// Inserção: em cada seção sorteada, +k comparecimentos, +k votos para o finalista beneficiado e +k habilitações na
// categoria escolhida (sem biometria cadastrada, ano de nascimento ou por biometria). Nunca passa dos aptos (corta em a2).
// Regras de decisão (declaradas antes da simulação; limiar |t| ≥ 3,3, isto é, p ≈ 0,001 bilateral):
//   R1 cauda: seções com z ≥ 3 superam as com z ≤ −3 (binomial unilateral, p < 0,001)
//   R2 Klimek-Δ: inclinação de Δparcela do finalista sobre o excesso positivo, t ≥ 3,3 a favor dele
//   R3 proporção: o excesso se divide mais a favor do finalista do que o aumento esperado, t ≥ 3,3
//   R4 E2 nacional: coeficiente sem biometria − por biometria no ganho do finalista, t ≥ 3,3 (efeito fixo de zona)
//   R4uf E2 por UF: alguma UF com q (BH) < 0,05 a favor do finalista
//   R5 composição: parte do excesso que entra na categoria inserida maior que a do aumento esperado, t ≥ 3,3
import { aleatorio, quantil } from './forense-lib.mjs';
import { bh, carregarIdade, diferenca, filtrar, lerPares, modelar, mqEfeitoFixo, pNormal2, pNormalSup, salvar } from './estatistico-lib.mjs';

const fonte = process.argv[2] ?? 'banco';
const REPLICAS = Number(process.argv[3] ?? 5);
const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const r3 = (x) => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : null);
const r1 = (x) => (Number.isFinite(x) ? Math.round(x * 10) / 10 : null);

const { P, filtro } = filtrar(await lerPares(fonte));
await carregarIdade(P);
const temBio = P[0].sb1 != null;
const ORIG = P.map((s) => ({ c2: s.c2, v13_2: s.v13_2, v22_2: s.v22_2, sb2: s.sb2, pg2: s.pg2, pb2: s.pb2 }));
log(`${P.length} seções, biometria: ${temBio}`);

// redutos: parcela do finalista no 1º turno no quintil de cima da UF
const corte = {};
for (const uf of new Set(P.map((s) => s.uf))) {
  const l = P.filter((s) => s.uf === uf && s.s1 != null).map((s) => s.s1);
  corte[uf] = { q80: quantil(l, 0.8), q20: quantil(l, 0.2) };
}
const zonas = [...new Set(P.map((s) => s.zon))];
const porZona = new Map();
P.forEach((s, i) => { if (!porZona.has(s.zon)) porZona.set(s.zon, []); porZona.get(s.zon).push(i); });

function sortear(cen, rnd) {
  const alvo = Math.round(P.length * cen.fracao);
  let elegiveis;
  if (cen.alvo === 'zonas') {
    const ord = [...zonas]; for (let i = ord.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ord[i], ord[j]] = [ord[j], ord[i]]; }
    const out = []; for (const z of ord) { if (out.length >= alvo) break; out.push(...porZona.get(z)); }
    return out;
  }
  if (cen.alvo === 'redutos') elegiveis = P.map((s, i) => i).filter((i) => P[i].s1 != null && (cen.favorece === 13 ? P[i].s1 >= corte[P[i].uf].q80 : P[i].s1 <= corte[P[i].uf].q20));
  else elegiveis = P.map((_, i) => i);
  const sel = new Set();
  const n = Math.min(alvo, elegiveis.length);
  while (sel.size < n) sel.add(elegiveis[Math.floor(rnd() * elegiveis.length)]);
  return [...sel];
}

function aplicar(idx, cen) {
  P.forEach((s, i) => Object.assign(s, ORIG[i]));
  let votos = 0;
  for (const i of idx) {
    const s = P[i];
    const k = Math.max(0, Math.min(cen.k, s.a2 - s.c2));
    votos += k;
    s.c2 += k;
    if (cen.favorece === 13) s.v13_2 += k; else s.v22_2 += k;
    if (temBio) s[cen.categoria] += k;
  }
  for (const s of P) {
    s.dpp = 100 * (s.c2 / s.a2 - s.c1 / s.a1); s.dc = s.c2 - s.c1;
    s.f2 = s.v13_2 + s.v22_2; s.s2 = s.f2 > 0 ? s.v13_2 / s.f2 : null;
    if (temBio) { s.dsb = s.sb2 - s.sb1; s.dpb = s.pb2 - s.pb1; s.dpg = s.pg2 - s.pg1; }
  }
  return votos;
}

function testes(cen) {
  modelar(P);
  for (const s of P) s.esp = s.c2 - s.resAj - s.c1;
  const lado = cen.favorece;
  const out = {};
  // R1
  const R = P.filter((s) => s.z >= 3).length, L = P.filter((s) => s.z <= -3).length;
  out.R1 = { z3acima: R, z3abaixo: L, p: pNormalSup((R - 0.5 - (R + L) / 2) / Math.sqrt((R + L) / 4)) };
  out.R1.dispara = out.R1.p < 0.001;
  // R2: Δ parcela do finalista beneficiado, menos a média da zona, sobre o excesso positivo
  const K = P.filter((s) => s.s1 != null && s.s2 != null && s.f1 >= 10 && s.f2 >= 10);
  const mz = new Map();
  for (const s of K) { const m = mz.get(s.zon) ?? { w: 0, ds: 0 }; m.w += s.a2; m.ds += s.a2 * (s.s2 - s.s1); mz.set(s.zon, m); }
  const sinal = lado === 13 ? 1 : -1;
  const a2r = mqEfeitoFixo(K, { y: (s) => sinal * 100 * (s.s2 - s.s1 - mz.get(s.zon).ds / mz.get(s.zon).w), x: (s) => [Math.min((100 * s.resAj) / s.a2, 0), Math.max((100 * s.resAj) / s.a2, 0)], w: (s) => s.a2, grupo: (s) => s.zon, cluster: (s) => s.mun });
  out.R2 = { b: r3(a2r.b[1]), t: r1(a2r.b[1] / a2r.ep[1]) }; out.R2.dispara = out.R2.t >= 3.3;
  // R3: excesso × esperado, termo cruzado do finalista beneficiado
  const X = (s) => { const e = s.resAj, esp = s.esp; return [e * s.s1, e * (1 - s.s1), esp * s.s1, esp * (1 - s.s1), s.out1, s.bn1 - s.bn2]; };
  const yv = lado === 13 ? (s) => s.v13_2 - s.v13_1 : (s) => s.v22_2 - s.v22_1;
  const a3 = mqEfeitoFixo(K, { y: yv, x: X, grupo: (s) => s.zon, cluster: (s) => s.mun });
  const d3 = lado === 13 ? diferenca(a3, 1, 3) : diferenca(a3, 0, 2);
  out.R3 = { d: r3(d3.d), t: r1(d3.t) }; out.R3.dispara = out.R3.t >= 3.3;
  if (temBio) {
    // R4: E2 com efeito fixo de zona
    const e2 = (lista) => mqEfeitoFixo(lista.filter((s) => s.c1 >= 20), { y: (s) => yv(s) / s.c1, x: (s) => [s.dpb / s.c1, (s.dsb + s.dpg) / s.c1, s.out1 / s.c1, s.bn1 / s.c1], w: (s) => s.c1, grupo: (s) => s.zon, cluster: (s) => s.mun });
    const a4 = e2(P); const d4 = diferenca(a4, 1, 0);
    out.R4 = { d: r3(d4.d), t: r1(d4.t) }; out.R4.dispara = out.R4.t >= 3.3;
    const porUf = [];
    for (const uf of new Set(P.map((s) => s.uf))) { const a = e2(P.filter((s) => s.uf === uf)); if (!a || !(a.G > 1)) continue; const d = diferenca(a, 1, 0); porUf.push({ uf, t: d.t }); }
    const q = bh(porUf.map((l) => pNormal2(l.t)));
    const disparam = porUf.filter((l, i) => q[i] < 0.05 && l.t > 0).map((l) => l.uf);
    out.R4uf = { ufs: disparam, dispara: disparam.length > 0 };
    // R5: parte do excesso na categoria inserida × parte do esperado
    const ycat = { sb2: (s) => s.dsb, pg2: (s) => s.dpg, pb2: (s) => s.dpb }[cen.categoria];
    const a5 = mqEfeitoFixo(P, { y: ycat, x: (s) => [s.resAj, s.esp], grupo: (s) => s.zon, cluster: (s) => s.mun });
    const d5 = diferenca(a5, 0, 1);
    out.R5 = { doExcesso: r3(a5.b[0]), doEsperado: r3(a5.b[1]), t: r1(d5.t) }; out.R5.dispara = out.R5.t >= 3.3;
  }
  return out;
}

const CENARIOS = [
  { nome: 'sem inserção (linha de base)', fracao: 0, k: 0, alvo: 'aleatoria', favorece: 13, categoria: 'sb2' },
  { nome: '5% das seções, +10 (pedido)', fracao: 0.05, k: 10, alvo: 'aleatoria', favorece: 13, categoria: 'sb2' },
  { nome: '5% dos redutos do 13, +10', fracao: 0.05, k: 10, alvo: 'redutos', favorece: 13, categoria: 'sb2' },
  { nome: '5% das seções em zonas inteiras, +10', fracao: 0.05, k: 10, alvo: 'zonas', favorece: 13, categoria: 'sb2' },
  { nome: '5% das seções, +10 como ano de nascimento', fracao: 0.05, k: 10, alvo: 'aleatoria', favorece: 13, categoria: 'pg2' },
  { nome: '5% das seções, +10 por biometria', fracao: 0.05, k: 10, alvo: 'aleatoria', favorece: 13, categoria: 'pb2' },
  { nome: '5% dos redutos do 22, +10 para o 22', fracao: 0.05, k: 10, alvo: 'redutos', favorece: 22, categoria: 'sb2' },
  { nome: '5% das seções, +5', fracao: 0.05, k: 5, alvo: 'aleatoria', favorece: 13, categoria: 'sb2' },
  { nome: '1% das seções, +10', fracao: 0.01, k: 10, alvo: 'aleatoria', favorece: 13, categoria: 'sb2' },
  { nome: '1% das seções, +20', fracao: 0.01, k: 20, alvo: 'aleatoria', favorece: 13, categoria: 'sb2' },
  { nome: '0,25% das seções, +40', fracao: 0.0025, k: 40, alvo: 'aleatoria', favorece: 13, categoria: 'sb2' },
  { nome: '20% dos redutos do 13, +5', fracao: 0.2, k: 5, alvo: 'redutos', favorece: 13, categoria: 'sb2' },
  { nome: '20% das seções em zonas inteiras, +5', fracao: 0.2, k: 5, alvo: 'zonas', favorece: 13, categoria: 'sb2' },
  { nome: 'sem inserção, regras lidas a favor do 22 (linha de base do cenário do 22)', fracao: 0, k: 0, alvo: 'aleatoria', favorece: 22, categoria: 'sb2' },
];
const so = process.argv[4] ? process.argv[4].split(',').map(Number) : null;
const ganho13 = P.reduce((a, s) => a + s.v13_2 - s.v13_1, 0);
const res = { geradoEm: new Date().toISOString(), fonte, filtro, replicas: REPLICAS, secoes: P.length, ufs: [...new Set(P.map((s) => s.uf))].sort(), ganho13Real: ganho13, cenarios: [] };
const rnd = aleatorio(5);
for (const [ci, cen] of CENARIOS.entries()) {
  if (so && !so.includes(ci)) continue;
  const reps = [];
  const nrep = cen.fracao === 0 ? 1 : REPLICAS;
  for (let r = 0; r < nrep; r++) {
    const idx = cen.fracao === 0 ? [] : sortear(cen, rnd);
    const votos = aplicar(idx, cen);
    reps.push({ secoes: idx.length, votos, ...testes(cen) });
    log(`${cen.nome} rep ${r + 1}/${nrep}`);
  }
  const regras = Object.keys(reps[0]).filter((k) => reps[0][k]?.dispara !== undefined);
  res.cenarios.push({ ...cen, votosMedios: Math.round(reps.reduce((a, r) => a + r.votos, 0) / reps.length),
    pctDoGanho13: r3((100 * reps.reduce((a, r) => a + r.votos, 0)) / reps.length / ganho13),
    poder: Object.fromEntries(regras.map((k) => [k, r3(reps.filter((r) => r[k].dispara).length / reps.length)])),
    estatisticaMedia: Object.fromEntries(regras.filter((k) => reps[0][k].t !== undefined).map((k) => [k, r1(reps.reduce((a, r) => a + r[k].t, 0) / reps.length)])),
    replicas: reps });
  await salvar(`poder-${fonte}${so ? `-${so.join('_')}` : ''}.json`, res);
}
P.forEach((s, i) => Object.assign(s, ORIG[i]));
log('fim');
console.table(res.cenarios.map((c) => ({ cenario: c.nome, votos: c.votosMedios, pct13: c.pctDoGanho13, ...Object.fromEntries(Object.entries(c.poder).map(([k, v]) => [`P_${k}`, v])), ...Object.fromEntries(Object.entries(c.estatisticaMedia).map(([k, v]) => [`t_${k}`, v])) })));
