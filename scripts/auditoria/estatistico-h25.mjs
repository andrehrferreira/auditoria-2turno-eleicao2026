// H25 (estatístico eleitoral): as seções cujo pacote foi assinado por urna com certificado da AC URNA (UE2013/UE2015;
// AC vencida em 18/07/2026) votam diferente das seções com UE2020/UE2022 do MESMO local de votação?
// Pré-registro em docs/analysis/estatistico-eleitoral/10-h25-urnas-ac-vencida.md (gravado antes de rodar).
//
// Testes (desfechos em pontos percentuais: s13 = 13/(13+22); comp = comparecimento/aptos; bn = (brancos+nulos)/comparecimento):
//   1. nível no 2º turno, A × B, efeito fixo de local + perfil da seção (principal); sensibilidade: bruto, zona, sem controles,
//      sem peso; por UF e por modelo (exploratório);
//   2. variação 1º → 2º turno na mesma seção, mesma urna nos dois turnos (A × B), mesmo desenho;
//   3. A1 (certificado com bytes zero a mais) × resto de A, dentro do local, nível e variação;
//   4. escala: votos do 13 e do 22 nas seções A, Brasil e UF, contra a margem;
//   5. poder: menor efeito que o teste principal enxerga com 80% de chance (p.p. e votos).
//   Exploratório: cauda (seções A extremas dentro do local) e o 1º turno em nível (linha de base).
// Regressão: MQ ponderado com efeito fixo absorvido, EP agrupado (CR1) por município (DF: zona).
//
// Entrada: pares-banco.csv (estatistico-pares.mjs banco), data/parsed/auditoria/h25/ac-2t.csv (estatistico-h25-dados.mjs),
//          perfil do eleitorado por seção (data/parsed/auditoria/forense/perfil/, via carregarIdade).
// Saída:   data/parsed/auditoria/h25/resultado.json e CSVs dos gráficos (estatistico-h25-graficos.mjs).
// Uso: node --max-old-space-size=8192 scripts/auditoria/estatistico-h25.mjs
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { RAIZ, aleatorio, paraCsv } from './forense-lib.mjs';
import { bh, carregarIdade, lerPares, pNormal2, zBilateral } from './estatistico-lib.mjs';

const DIR = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'h25');
const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const r2 = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : null);
const r3 = (x) => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : null);
const r4 = (x) => (Number.isFinite(x) ? Math.round(x * 10000) / 10000 : null);
const soma = (l, f) => l.reduce((a, s) => a + (f(s) ?? 0), 0);
const Z80 = 0.8416;

// ---------- leitura e grupos ----------
const todos = await lerPares('banco');
const ac = new Map();
{
  const [cab, ...ls] = readFileSync(path.join(DIR, 'ac-2t.csv'), 'utf8').trim().split('\n');
  const k = cab.split(';');
  for (const l of ls) { const r = Object.fromEntries(l.split(';').map((v, i) => [k[i], v])); ac.set(`${r.uf}|${r.municipio}|${r.zona}|${r.secao}`, r); }
}
// classe da troca de urna entre os turnos (H14, estatistico-reservas-1t2t-dados.mjs): 'controle' = mesma urna de seção nos dois turnos
const classe = new Map();
{
  const [cab, ...ls] = readFileSync(path.join(RAIZ, 'data', 'parsed', 'auditoria', 'reservas-1t2t', 'secoes.csv'), 'utf8').trim().split('\n');
  const k = cab.split(';'), ic = k.indexOf('classe');
  for (const l of ls) { const c = l.split(';'); classe.set(`${c[0]}|${c[1]}|${c[2]}|${c[3]}`, c[ic]); }
}
const res = { geradoEm: new Date().toISOString(), universo: {} };
const U = res.universo;
U.pares = todos.length;
U.semAc = 0; U.modeloBuDifereDoVsc = 0;
const P = [];
for (const s of todos) {
  const r = ac.get(`${s.uf}|${s.municipio}|${s.zona}|${s.secao}`);
  if (!r) { U.semAc++; continue; }
  if (r.modeloVsc !== s.modelo2) U.modeloBuDifereDoVsc++;
  s.A = r.emissor === 'AC URNA' ? 1 : 0;
  s.A1 = Number(r.bytesAMais) === 1 ? 1 : 0;
  s.emissor = r.emissor; s.modeloVsc = r.modeloVsc;
  s.ue2013 = r.modeloVsc === 'ue2013' ? 1 : 0;
  s.mun = `${s.uf}|${s.municipio}`; s.zon = `${s.uf}|${s.zona}`; s.loc = `${s.uf}|${s.municipio}|${s.zona}|${s.local2}`;
  s.cl = s.uf === 'df' ? s.zon : s.mun;
  s.n1 = s.v13_1 + s.v22_1; s.n2 = s.v13_2 + s.v22_2;
  s.y2 = { s13: s.n2 > 0 ? (100 * s.v13_2) / s.n2 : NaN, comp: s.a2 > 0 ? (100 * s.c2) / s.a2 : NaN, bn: s.c2 > 0 ? (100 * s.bn2) / s.c2 : NaN };
  s.y1 = { s13: s.n1 > 0 ? (100 * s.v13_1) / s.n1 : NaN, comp: s.a1 > 0 ? (100 * s.c1) / s.a1 : NaN, bn: s.c1 > 0 ? (100 * s.bn1) / s.c1 : NaN };
  s.w2 = { s13: s.n2, comp: s.a2, bn: s.c2 };
  s.mesmaUrna = s.urna1 != null && s.urna1 === s.urna2 ? 1 : 0;
  s.mesmoLocal = s.local1 === s.local2 ? 1 : 0;
  s.aptosEstaveis = Math.abs(s.a2 - s.a1) <= 10 ? 1 : 0;
  s.classe = classe.get(`${s.uf}|${s.municipio}|${s.zona}|${s.secao}`) ?? null;
  P.push(s);
}
U.comAc = P.length; U.A = P.filter((s) => s.A).length; U.A1 = P.filter((s) => s.A1).length; U.B = P.filter((s) => !s.A).length;
U.porModelo = {};
for (const s of P) { const k = `${s.emissor}|${s.modeloVsc}`; U.porModelo[k] = (U.porModelo[k] ?? 0) + 1; }
log(`${P.length} seções; A ${U.A} (A1 ${U.A1}); B ${U.B}`);
U.perfilLinhas = await carregarIdade(P);
U.semPerfil = P.filter((s) => s.p60 == null).length;
U.semPerfilA = P.filter((s) => s.p60 == null && s.A).length;
for (const s of P) s.logA = Math.log(Math.max(s.a2, 1));
const PERFIL = ['p60', 'p1624', 'pEscB', 'pBioCad'];
const ctrlPerfil = (s) => [...PERFIL.map((c) => s[c]), s.logA];
const NOMES_PERFIL = [...PERFIL, 'logAptos'];

// conferência com o resultado oficial (dados.json da H14: soma do BU = voto_oficial, nos dois turnos)
{
  const of = JSON.parse(readFileSync(path.join(RAIZ, 'data', 'parsed', 'auditoria', 'reservas-1t2t', 'dados.json'), 'utf8')).conferenciaBuOficial;
  res.conferenciaOficial = {
    t2: { pares13: soma(todos, (s) => s.v13_2), pares22: soma(todos, (s) => s.v22_2), oficial13: of['2'].oficial['13'], oficial22: of['2'].oficial['22'] },
    t1: { pares13: soma(todos, (s) => s.v13_1), pares22: soma(todos, (s) => s.v22_1), oficial13: of['1'].oficial['13'], oficial22: of['1'].oficial['22'] },
  };
}

// ---------- regressão com efeito fixo absorvido e EP agrupado ----------
function inverter(M) {
  const n = M.length;
  const A = M.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    const d = A[c][c];
    if (Math.abs(d) < 1e-300) return null;
    for (let j = 0; j < 2 * n; j++) A[c][j] /= d;
    for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c]; for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[c][j]; }
  }
  return A.map((r) => r.slice(n));
}
/**
 * y ~ x | efeito fixo `grupo` (null = constante), MQ ponderado, EP CR1 agrupado por `cluster`.
 * Colunas sem variação dentro dos grupos ou colineares com as anteriores saem (o tratamento vem primeiro).
 * Devolve coef por nome, n, G (conglomerados), grupos usados e os resíduos (opcional).
 */
function mqef(lista, { y, x, nomes, w, grupo = null, cluster = (s) => s.cl, residuos = false }) {
  let L = [];
  for (const s of lista) {
    const yy = y(s), ww = w(s);
    if (!Number.isFinite(yy) || !(ww > 0)) continue;
    const xx = x(s);
    if (!xx.every(Number.isFinite)) continue;
    L.push({ s, y: yy, x: grupo ? xx : [1, ...xx], w: ww, g: grupo ? grupo(s) : 0 });
  }
  const nm = grupo ? nomes : ['const', ...nomes];
  const k0 = nm.length;
  if (grupo) {
    const acc = new Map();
    for (const l of L) {
      let a = acc.get(l.g);
      if (!a) { a = { w: 0, y: 0, x: new Float64Array(k0), n: 0 }; acc.set(l.g, a); }
      a.w += l.w; a.y += l.w * l.y; a.n++;
      for (let j = 0; j < k0; j++) a.x[j] += l.w * l.x[j];
    }
    L = L.filter((l) => acc.get(l.g).n > 1);
    for (const l of L) { const a = acc.get(l.g); l.y -= a.y / a.w; l.x = l.x.map((v, j) => v - a.x[j] / a.w); }
  }
  const XtX0 = Array.from({ length: k0 }, () => new Float64Array(k0));
  for (const l of L) for (let a = 0; a < k0; a++) for (let c = a; c < k0; c++) XtX0[a][c] += l.w * l.x[a] * l.x[c];
  for (let a = 0; a < k0; a++) for (let c = 0; c < a; c++) XtX0[a][c] = XtX0[c][a];
  const aceitas = [];
  for (let j = 0; j < k0; j++) {
    if (!(XtX0[j][j] > 1e-12)) continue;
    if (!aceitas.length) { aceitas.push(j); continue; }
    const iS = inverter(aceitas.map((a) => aceitas.map((c) => XtX0[a][c])));
    const v = aceitas.map((a) => XtX0[a][j]);
    const schur = XtX0[j][j] - v.reduce((acc, xv, a) => acc + xv * iS[a].reduce((t, yv, c) => t + yv * v[c], 0), 0);
    if (schur > 1e-9 * XtX0[j][j]) aceitas.push(j);
  }
  const k = aceitas.length;
  if (!k || L.length <= k + 1) return null;
  for (const l of L) l.x = aceitas.map((a) => l.x[a]);
  const XtX = aceitas.map((a) => aceitas.map((c) => XtX0[a][c]));
  const Xty = new Array(k).fill(0);
  for (const l of L) for (let a = 0; a < k; a++) Xty[a] += l.w * l.x[a] * l.y;
  const inv = inverter(XtX);
  if (!inv) return null;
  const b = inv.map((r) => r.reduce((acc, v, j) => acc + v * Xty[j], 0));
  const cl = new Map();
  let ssr = 0, sw = 0;
  for (const l of L) {
    const e = l.y - l.x.reduce((acc, v, j) => acc + v * b[j], 0);
    if (residuos) l.s._e = e;
    ssr += l.w * e * e; sw += l.w;
    const c = cluster(l.s);
    let g = cl.get(c);
    if (!g) { g = new Float64Array(k); cl.set(c, g); }
    for (let a = 0; a < k; a++) g[a] += l.w * l.x[a] * e;
  }
  const G = cl.size, n = L.length;
  const meat = Array.from({ length: k }, () => new Float64Array(k));
  for (const g of cl.values()) for (let a = 0; a < k; a++) for (let c = 0; c < k; c++) meat[a][c] += g[a] * g[c];
  const f = G > 1 ? (G / (G - 1)) * ((n - 1) / (n - k)) : NaN;
  const IM = inv.map((r) => Array.from({ length: k }, (_, c) => r.reduce((acc, v, j) => acc + v * meat[j][c], 0)));
  const V = IM.map((r) => Array.from({ length: k }, (_, c) => f * r.reduce((acc, v, j) => acc + v * inv[j][c], 0)));
  const coef = {};
  aceitas.forEach((j, i) => { coef[nm[j]] = { b: b[i], ep: Math.sqrt(V[i][i]) }; });
  return { coef, n, G, grupos: grupo ? new Set(L.map((l) => l.g)).size : 1, rmse: Math.sqrt(ssr / sw), linhas: L.map((l) => l.s) };
}

const DESF = ['s13', 'comp', 'bn'];
const ROT = { s13: 'parcela do 13 em 13+22', comp: 'comparecimento / aptos', bn: 'brancos+nulos / comparecimento' };
const NB = 12; // família confirmatória do pré-registro
const CRIT = zBilateral(0.05 / NB);
res.decisao = { familiaConfirmatoria: NB, limiarBonferroni: r3(CRIT) };

// locais mistos: têm A e B
const locais = new Map();
for (const s of P) { const m = locais.get(s.loc) ?? { A: 0, B: 0 }; s.A ? m.A++ : m.B++; locais.set(s.loc, m); }
const misto = (s) => { const m = locais.get(s.loc); return m.A > 0 && m.B > 0; };
for (const s of P) s.misto = misto(s) ? 1 : 0;
const zonas = new Map();
for (const s of P) { const m = zonas.get(s.zon) ?? { A: 0, B: 0 }; s.A ? m.A++ : m.B++; zonas.set(s.zon, m); }
for (const s of P) { const m = zonas.get(s.zon); s.zonaMista = m.A > 0 && m.B > 0 ? 1 : 0; }
U.locais = locais.size;
U.locaisMistos = [...locais.values()].filter((m) => m.A && m.B).length;
U.locaisSoA = [...locais.values()].filter((m) => m.A && !m.B).length;
U.secoesAEmLocalMisto = P.filter((s) => s.A && s.misto).length;
U.secoesBEmLocalMisto = P.filter((s) => !s.A && s.misto).length;
U.secoesAEmZonaMista = P.filter((s) => s.A && s.zonaMista).length;
U.secoesASoEmLocalSoA = P.filter((s) => s.A && !s.misto).length;
log(`locais mistos ${U.locaisMistos}: A ${U.secoesAEmLocalMisto}, B ${U.secoesBEmLocalMisto}`);

// ---------- perfil: A × B (balanço) ----------
{
  const bal = (l) => {
    const out = {};
    for (const c of PERFIL) {
      const ok = l.filter((s) => s[c] != null);
      const m = (f) => { const x = ok.filter(f); return x.length ? soma(x, (s) => s[c] * s.a2) / soma(x, (s) => s.a2) : NaN; };
      out[c] = { A: r4(m((s) => s.A)), B: r4(m((s) => !s.A)) };
    }
    out.aptosMedio = { A: r2(soma(l.filter((s) => s.A), (s) => s.a2) / l.filter((s) => s.A).length), B: r2(soma(l.filter((s) => !s.A), (s) => s.a2) / l.filter((s) => !s.A).length) };
    return out;
  };
  res.perfil = { brasil: bal(P), locaisMistos: bal(P.filter((s) => s.misto)) };
  // diferença de perfil A − B dentro do local (efeito fixo de local, peso aptos)
  res.perfil.dentroDoLocal = {};
  for (const c of [...PERFIL, 'logA']) {
    const a = mqef(P, { y: (s) => (c === 'logA' ? s.logA : 100 * s[c]), x: (s) => [s.A], nomes: ['A'], w: (s) => s.a2, grupo: (s) => s.loc });
    res.perfil.dentroDoLocal[c] = { dif: r3(a.coef.A.b), ep: r3(a.coef.A.ep), unidade: c === 'logA' ? 'log' : 'p.p.' };
  }
}

// ---------- teste 1: nível no 2º turno ----------
const amostra1 = P.filter((s) => s.p60 != null);
U.teste1 = { secoes: amostra1.length, foraSemPerfil: P.length - amostra1.length };
const ESPEC = [
  ['bruto', null, false],
  ['zona', (s) => s.zon, false],
  ['zona+perfil', (s) => s.zon, true],
  ['local', (s) => s.loc, false],
  ['local+perfil', (s) => s.loc, true],
];
const ef = (a, nome = 'A') => {
  const c = a?.coef[nome];
  if (!c) return null;
  const z = c.b / c.ep;
  return { b: r4(c.b), ep: r4(c.ep), z: r2(z), p: +pNormal2(z).toPrecision(3), ic95: [r4(c.b - 1.96 * c.ep), r4(c.b + 1.96 * c.ep)], n: a.n, G: a.G, grupos: a.grupos };
};
const votosDe = (lista) => ({ n13_22: soma(lista, (s) => s.n2), c: soma(lista, (s) => s.c2), aptos: soma(lista, (s) => s.a2) });
function nivel(lista, d, { grupo, perfil, ponderar = true, turno = 2, trat = (s) => [s.A], nomes = ['A'] }) {
  const y = turno === 2 ? (s) => s.y2[d] : (s) => s.y1[d];
  const w = !ponderar ? () => 1 : turno === 2 ? (s) => s.w2[d] : (s) => ({ s13: s.n1, comp: s.a1, bn: s.c1 }[d]);
  return mqef(lista, { y, x: perfil ? (s) => [...trat(s), ...ctrlPerfil(s)] : trat, nomes: perfil ? [...nomes, ...NOMES_PERFIL] : nomes, w, grupo });
}
res.teste1 = {};
for (const d of DESF) {
  res.teste1[d] = {};
  for (const [nome, grupo, perfil] of ESPEC) res.teste1[d][nome] = ef(nivel(amostra1, d, { grupo, perfil }));
  res.teste1[d]['local+perfil sem peso'] = ef(nivel(amostra1, d, { grupo: (s) => s.loc, perfil: true, ponderar: false }));
  res.teste1[d]['1º turno local+perfil'] = ef(nivel(amostra1, d, { grupo: (s) => s.loc, perfil: true, turno: 1 }));
  res.teste1[d]['1º turno zona+perfil'] = ef(nivel(amostra1, d, { grupo: (s) => s.zon, perfil: true, turno: 1 }));
  res.teste1[d]['1º turno bruto'] = ef(nivel(amostra1, d, { grupo: null, perfil: false, turno: 1 }));
  // por modelo (exploratório)
  const pm = nivel(amostra1, d, { grupo: (s) => s.loc, perfil: true, trat: (s) => [s.A && s.ue2013 ? 1 : 0, s.A && !s.ue2013 ? 1 : 0], nomes: ['UE2013', 'UE2015'] });
  res.teste1[d].porModelo = { UE2013: ef(pm, 'UE2013'), UE2015: ef(pm, 'UE2015') };
  log(`teste 1 ${d}: principal ${JSON.stringify(res.teste1[d]['local+perfil'])}`);
}
res.teste1.votosNosLocaisMistos = { A: votosDe(amostra1.filter((s) => s.A && s.misto)), B: votosDe(amostra1.filter((s) => !s.A && s.misto)) };
// médias brutas (descritivo)
{
  const g = (l) => ({ secoes: l.length, s13: r3((100 * soma(l, (s) => s.v13_2)) / soma(l, (s) => s.n2)), comp: r3((100 * soma(l, (s) => s.c2)) / soma(l, (s) => s.a2)), bn: r3((100 * soma(l, (s) => s.bn2)) / soma(l, (s) => s.c2)),
    s13_1: r3((100 * soma(l, (s) => s.v13_1)) / soma(l, (s) => s.n1)) });
  res.descritivo = { A: g(P.filter((s) => s.A)), B: g(P.filter((s) => !s.A)), A_localMisto: g(P.filter((s) => s.A && s.misto)), B_localMisto: g(P.filter((s) => !s.A && s.misto)),
    UE2013: g(P.filter((s) => s.A && s.ue2013)), UE2015: g(P.filter((s) => s.A && !s.ue2013)) };
}

// ---------- teste 2: variação 1º → 2º turno, mesma urna ----------
const amostra2 = amostra1.filter((s) => s.mesmaUrna && s.mesmoLocal && s.aptosEstaveis && s.n1 > 0 && s.c1 > 0);
U.teste2 = { secoes: amostra2.length, A: amostra2.filter((s) => s.A).length, foraUrnaDiferente: amostra1.filter((s) => !s.mesmaUrna).length,
  foraLocalDiferente: amostra1.filter((s) => s.mesmaUrna && !s.mesmoLocal).length, foraAptosMudam: amostra1.filter((s) => s.mesmaUrna && s.mesmoLocal && !s.aptosEstaveis).length };
const dy = (s, d) => s.y2[d] - s.y1[d];
function variacao(lista, d, { grupo, perfil, ponderar = true, trat = (s) => [s.A], nomes = ['A'] }) {
  return mqef(lista, { y: (s) => dy(s, d), x: perfil ? (s) => [...trat(s), ...ctrlPerfil(s)] : trat, nomes: perfil ? [...nomes, ...NOMES_PERFIL] : nomes, w: ponderar ? (s) => s.w2[d] : () => 1, grupo });
}
res.teste2 = {};
for (const d of DESF) {
  res.teste2[d] = {};
  for (const [nome, grupo, perfil] of ESPEC) res.teste2[d][nome] = ef(variacao(amostra2, d, { grupo, perfil }));
  res.teste2[d]['local+perfil sem peso'] = ef(variacao(amostra2, d, { grupo: (s) => s.loc, perfil: true, ponderar: false }));
  const pm = variacao(amostra2, d, { grupo: (s) => s.loc, perfil: true, trat: (s) => [s.A && s.ue2013 ? 1 : 0, s.A && !s.ue2013 ? 1 : 0], nomes: ['UE2013', 'UE2015'] });
  res.teste2[d].porModelo = { UE2013: ef(pm, 'UE2013'), UE2015: ef(pm, 'UE2015') };
  log(`teste 2 ${d}: principal ${JSON.stringify(res.teste2[d]['local+perfil'])}`);
}
res.teste2.votosNosLocaisMistos = { A: votosDe(amostra2.filter((s) => s.A && s.misto)), B: votosDe(amostra2.filter((s) => !s.A && s.misto)) };

// ---------- teste 3: A1 × resto de A ----------
{
  const soA = amostra1.filter((s) => s.A);
  const soA2 = amostra2.filter((s) => s.A);
  const locA = new Map();
  for (const s of soA) { const m = locA.get(s.loc) ?? { a1: 0, o: 0 }; s.A1 ? m.a1++ : m.o++; locA.set(s.loc, m); }
  res.teste3 = { secoesA: soA.length, A1: soA.filter((s) => s.A1).length, locaisComA1eOutraA: [...locA.values()].filter((m) => m.a1 && m.o).length,
    A1PorModelo: { UE2013: soA.filter((s) => s.A1 && s.ue2013).length, UE2015: soA.filter((s) => s.A1 && !s.ue2013).length },
    APorModelo: { UE2013: soA.filter((s) => s.ue2013).length, UE2015: soA.filter((s) => !s.ue2013).length } };
  const tr = (s) => [s.A1, s.ue2013], nm = ['A1', 'UE2013'];
  for (const d of DESF) {
    res.teste3[d] = {
      nivel: ef(nivel(soA, d, { grupo: (s) => s.loc, perfil: true, trat: tr, nomes: nm }), 'A1'),
      nivelZona: ef(nivel(soA, d, { grupo: (s) => s.zon, perfil: true, trat: tr, nomes: nm }), 'A1'),
      variacao: ef(variacao(soA2, d, { grupo: (s) => s.loc, perfil: true, trat: tr, nomes: nm }), 'A1'),
    };
    log(`teste 3 ${d}: ${JSON.stringify(res.teste3[d].nivel)}`);
  }
  // A1 contra B (dentro do local) para fechar o triângulo
  res.teste3.A1contraB = {};
  for (const d of DESF) {
    const a = nivel(amostra1, d, { grupo: (s) => s.loc, perfil: true, trat: (s) => [s.A1, s.A && !s.A1 ? 1 : 0], nomes: ['A1', 'Aresto'] });
    res.teste3.A1contraB[d] = { A1: ef(a, 'A1'), Aresto: ef(a, 'Aresto') };
  }
  res.teste3.A1PorUf = {};
  for (const s of soA) res.teste3.A1PorUf[s.uf] = (res.teste3.A1PorUf[s.uf] ?? 0) + s.A1;
}

// ---------- família confirmatória: decisão ----------
{
  const fam = [];
  for (const d of DESF) {
    fam.push({ teste: '1 nível A×B', desfecho: d, ...res.teste1[d]['local+perfil'] });
    fam.push({ teste: '2 variação A×B', desfecho: d, ...res.teste2[d]['local+perfil'] });
    fam.push({ teste: '3 nível A1×A', desfecho: d, ...res.teste3[d].nivel });
    fam.push({ teste: '3 variação A1×A', desfecho: d, ...res.teste3[d].variacao });
  }
  bh(fam.map((f) => f.p)).forEach((q, i) => { fam[i].q = +q.toPrecision(3); fam[i].passaBonferroni = Math.abs(fam[i].z) >= CRIT; });
  res.confirmatorio = fam;
  res.decisao.passamBonferroni = fam.filter((f) => f.passaBonferroni).map((f) => `${f.teste} ${f.desfecho}`);
}

// ---------- quem identifica o efeito: conglomerados com grupo misto ----------
/** Seções A em grupos (do efeito fixo) que têm A e B, e municípios distintos que contêm esses grupos. */
function cobertura(lista, grupo, trat = (s) => s.A) {
  const g = new Map();
  for (const s of lista) { const k = grupo(s); const m = g.get(k) ?? { a: 0, b: 0 }; trat(s) ? m.a++ : m.b++; g.set(k, m); }
  const mix = lista.filter((s) => { const m = g.get(grupo(s)); return m.a > 0 && m.b > 0; });
  return { gruposMistos: [...g.values()].filter((m) => m.a && m.b).length, secoesA: mix.filter(trat).length, secoesB: mix.filter((s) => !trat(s)).length,
    municipios: new Set(mix.map((s) => s.cl)).size, votosA_13_22: soma(mix.filter(trat), (s) => s.n2), parcelaDasA: r4(mix.filter(trat).length / lista.filter(trat).length) };
}
res.decisao.coberturaLocal = cobertura(amostra1, (s) => s.loc);

// ---------- permutação dentro do local (inferência que não depende do nº de conglomerados) ----------
// Sorteia de novo quais seções do local são A (mesmo número por local), 2.000 vezes; estatística = coeficiente de A na
// regressão com efeito fixo de local + perfil restrita aos locais mistos. p = fração das permutações com |b| ≥ |b observado|.

const NPERM = 2000;
function permutar(lista, y, w, rnd, n = NPERM) {
  const M = lista.filter((s) => s.misto && Number.isFinite(y(s)) && w(s) > 0);
  const porLocal = new Map();
  for (const s of M) { if (!porLocal.has(s.loc)) porLocal.set(s.loc, []); porLocal.get(s.loc).push(s); }
  const fit = () => mqef(M, { y, x: (s) => [s._t, ...ctrlPerfil(s)], nomes: ['A', ...NOMES_PERFIL], w, grupo: (s) => s.loc });
  for (const s of M) s._t = s.A;
  const obs = fit();
  if (!obs?.coef.A) return null;
  const b0 = obs.coef.A.b;
  let maiores = 0;
  for (let i = 0; i < n; i++) {
    for (const l of porLocal.values()) {
      const lab = l.map((s) => s.A);
      for (let j = lab.length - 1; j > 0; j--) { const r = Math.floor(rnd() * (j + 1)); [lab[j], lab[r]] = [lab[r], lab[j]]; }
      l.forEach((s, j) => { s._t = lab[j]; });
    }
    const a = fit();
    if (a?.coef.A && Math.abs(a.coef.A.b) >= Math.abs(b0) - 1e-12) maiores++;
  }
  for (const s of M) s._t = s.A;
  return { secoes: M.length, secoesA: M.filter((s) => s.A).length, locais: porLocal.size, municipios: new Set(M.map((s) => s.cl)).size,
    b: r4(b0), pPermutacao: r4((maiores + 1) / (n + 1)), permutacoes: n };
}
{
  const rnd = aleatorio(2526);
  const w2 = (d) => (s) => s.w2[d], w1 = (d) => (s) => ({ s13: s.n1, comp: s.a1, bn: s.c1 }[d]);
  res.permutacaoLocal = { brasil: {}, porUf: {} };
  for (const d of DESF) {
    res.permutacaoLocal.brasil[d] = {
      nivel2t: permutar(amostra1, (s) => s.y2[d], w2(d), rnd),
      nivel1t: permutar(amostra1, (s) => s.y1[d], w1(d), rnd),
      variacao: permutar(amostra2, (s) => dy(s, d), w2(d), rnd),
    };
    log(`permutação ${d}: ${JSON.stringify(res.permutacaoLocal.brasil[d])}`);
  }
  for (const uf of [...new Set(P.filter((s) => s.A && s.misto).map((s) => s.uf))].sort()) {
    const l1 = amostra1.filter((s) => s.uf === uf), l2 = amostra2.filter((s) => s.uf === uf);
    res.permutacaoLocal.porUf[uf] = { s13_nivel2t: permutar(l1, (s) => s.y2.s13, w2('s13'), rnd), s13_nivel1t: permutar(l1, (s) => s.y1.s13, w1('s13'), rnd),
      s13_variacao: permutar(l2, (s) => dy(s, 's13'), w2('s13'), rnd) };
  }
}

// ---------- camadas (exploratório, acrescentado depois de ver que o local cobre só 0,5% das seções A) ----------
// O mesmo modelo com efeito fixo de zona, município e UF: cada camada cobre mais seções A, mas compara lugares mais
// diferentes. Variação "ampla": efeito fixo de UF + perfil + composição do 1º turno (s13, eliminados, brancos e nulos,
// comparecimento), cobre todas as seções A em UF com B. Robustez da variação: só a classe 'controle' da H14
// (mesma urna de seção nos dois turnos, sem contingência nem reserva em nenhum turno).
const CAMADAS = [
  ['local', (s) => s.loc], ['zona', (s) => s.zon], ['municipio', (s) => s.mun], ['uf', (s) => s.uf],
];
const comp1 = (s) => [s.y1.s13, (100 * s.out1) / s.c1, (100 * s.bn1) / s.c1, s.y1.comp];
const NOMES_COMP1 = ['s13_1t', 'eliminados_1t', 'bn_1t', 'comp_1t'];
res.camadas = {};
for (const [nome, grupo] of CAMADAS) {
  const c = { cobertura1: cobertura(amostra1, grupo), cobertura2: cobertura(amostra2, grupo) };
  for (const d of DESF) {
    c[d] = {
      nivel2t: ef(nivel(amostra1, d, { grupo, perfil: true })),
      nivel1t: ef(nivel(amostra1, d, { grupo, perfil: true, turno: 1 })),
      variacao: ef(variacao(amostra2, d, { grupo, perfil: true })),
      variacaoControle: ef(variacao(amostra2.filter((s) => s.classe === 'controle'), d, { grupo, perfil: true })),
    };
  }
  res.camadas[nome] = c;
  log(`camada ${nome}: A ${c.cobertura1.secoesA}; s13 nível ${c.s13.nivel2t.b} (z ${c.s13.nivel2t.z}); variação ${c.s13.variacao.b} (z ${c.s13.variacao.z})`);
}
const amostraAmpla = amostra2.filter((s) => s.uf !== 'zz');
res.variacaoAmpla = { secoes: amostraAmpla.length, A: amostraAmpla.filter((s) => s.A).length, votosA_13_22: soma(amostraAmpla.filter((s) => s.A), (s) => s.n2) };
for (const d of DESF) {
  const a = mqef(amostraAmpla, { y: (s) => dy(s, d), x: (s) => [s.A, ...ctrlPerfil(s), ...comp1(s)], nomes: ['A', ...NOMES_PERFIL, ...NOMES_COMP1], w: (s) => s.w2[d], grupo: (s) => s.uf });
  const z = mqef(amostraAmpla, { y: (s) => dy(s, d), x: (s) => [s.A, ...ctrlPerfil(s), ...comp1(s)], nomes: ['A', ...NOMES_PERFIL, ...NOMES_COMP1], w: (s) => s.w2[d], grupo: (s) => s.zon });
  res.variacaoAmpla[d] = { uf: ef(a), zona: ef(z) };
  log(`variação ampla ${d}: UF ${JSON.stringify(res.variacaoAmpla[d].uf)}`);
}

// ---------- por UF (exploratório) ----------
// Três leituras por UF: nível e variação dentro da ZONA (+ perfil) e variação ampla (dentro da UF, + perfil + composição
// do 1º turno). O local fica só na permutação (3 UFs). EP agrupado por município só é confiável com muitos municípios
// no grupo misto: com menos de 20, a linha leva poucosConglomerados = 1 e não entra na contagem de sinais.
{
  const ufs = [...new Set(P.filter((s) => s.A).map((s) => s.uf))].filter((uf) => uf !== 'zz' && P.some((s) => s.uf === uf && !s.A)).sort();
  const linhas = [];
  for (const uf of ufs) {
    const l1 = amostra1.filter((s) => s.uf === uf), l2 = amostra2.filter((s) => s.uf === uf);
    const cz1 = cobertura(l1, (s) => s.zon), cz2 = cobertura(l2, (s) => s.zon), cu = cobertura(l2, () => uf);
    const lin = { uf, secoesA: P.filter((s) => s.uf === uf && s.A).length, secoesAZonaMista: cz1.secoesA, municipiosZonaMista: cz1.municipios,
      municipiosComA: cu.municipios, votosA_13_22: soma(l1.filter((s) => s.A), (s) => s.n2) };
    for (const d of DESF) {
      lin[`nivelZona_${d}`] = cz1.secoesA ? ef(nivel(l1, d, { grupo: (s) => s.zon, perfil: true })) : null;
      lin[`varZona_${d}`] = cz2.secoesA ? ef(variacao(l2, d, { grupo: (s) => s.zon, perfil: true })) : null;
      lin[`varAmpla_${d}`] = ef(mqef(l2, { y: (s) => dy(s, d), x: (s) => [s.A, ...ctrlPerfil(s), ...comp1(s)], nomes: ['A', ...NOMES_PERFIL, ...NOMES_COMP1], w: (s) => s.w2[d] }));
    }
    lin.poucosConglomeradosZona = cz1.municipios < 20 ? 1 : 0;
    lin.poucosConglomeradosAmpla = cu.municipios < 20 ? 1 : 0;
    linhas.push(lin);
  }
  const chaves = DESF.flatMap((d) => [`nivelZona_${d}`, `varZona_${d}`, `varAmpla_${d}`]);
  const refs = linhas.flatMap((l) => chaves.map((k) => l[k])).filter((g) => g && Number.isFinite(g.z));
  const crit = zBilateral(0.05 / refs.length);
  bh(refs.map((g) => g.p)).forEach((q, i) => { refs[i].q = +q.toPrecision(3); refs[i].passaBonferroni = Math.abs(refs[i].z) >= crit; });
  const conf = (l, k) => l[k] && !l[k.startsWith('varAmpla') ? 'poucosConglomeradosAmpla' : 'poucosConglomeradosZona'];
  const passam = linhas.flatMap((l) => chaves.filter((k) => l[k]?.passaBonferroni).map((k) => ({ uf: l.uf, teste: k, b: l[k].b, z: l[k].z, confiavel: conf(l, k) ? 1 : 0 })));
  const sinais = (k) => { const g = linhas.filter((l) => conf(l, k)).map((l) => l[k]); return { positivos: g.filter((x) => x.b > 0).length, negativos: g.filter((x) => x.b < 0).length,
    positivosQueSaoBonf: g.filter((x) => x.b > 0 && x.passaBonferroni).length, negativosQueSaoBonf: g.filter((x) => x.b < 0 && x.passaBonferroni).length }; };
  res.porUf = { ufs: linhas.length, testes: refs.length, limiarBonferroni: r3(crit), passamBonferroni: passam, qMenor005: refs.filter((g) => g.q < 0.05).length,
    sinais: { nivelZona_s13: sinais('nivelZona_s13'), varZona_s13: sinais('varZona_s13'), varAmpla_s13: sinais('varAmpla_s13') }, linhas };
  // CSV do gráfico por UF: variação ampla (cobre todas as A) e nível dentro da zona, parcela do 13
  const br = { uf: 'BR', secoesA: U.A, municipiosComA: null, varAmpla_s13: res.variacaoAmpla.s13.uf, nivelZona_s13: res.camadas.zona.s13.nivel2t };
  await mkdir(DIR, { recursive: true });
  await writeFile(path.join(DIR, 'grafico-uf-s13.csv'), paraCsv([br, ...linhas].map((l) => ({ uf: l.uf.toUpperCase(), secoesA: l.secoesA, municipiosComA: l.municipiosComA,
    variacao_pp: l.varAmpla_s13?.b, variacao_ic_inf: l.varAmpla_s13?.ic95[0], variacao_ic_sup: l.varAmpla_s13?.ic95[1], variacao_z: l.varAmpla_s13?.z, variacao_q: l.varAmpla_s13?.q,
    nivelZona_pp: l.nivelZona_s13?.b, nivelZona_ic_inf: l.nivelZona_s13?.ic95[0], nivelZona_ic_sup: l.nivelZona_s13?.ic95[1], nivelZona_z: l.nivelZona_s13?.z,
    poucosConglomerados: l.poucosConglomeradosAmpla ?? 0 })),
  ['uf', 'secoesA', 'municipiosComA', 'variacao_pp', 'variacao_ic_inf', 'variacao_ic_sup', 'variacao_z', 'variacao_q', 'nivelZona_pp', 'nivelZona_ic_inf', 'nivelZona_ic_sup', 'nivelZona_z', 'poucosConglomerados']));
  const tab = linhas.map((l) => ({ uf: l.uf, secoesA: l.secoesA, secoesAZonaMista: l.secoesAZonaMista, municipiosZonaMista: l.municipiosZonaMista, municipiosComA: l.municipiosComA,
    votosA_13_22: l.votosA_13_22, ...Object.fromEntries(chaves.flatMap((k) => [[k, l[k]?.b], [`${k}_ep`, l[k]?.ep], [`${k}_z`, l[k]?.z], [`${k}_q`, l[k]?.q]])) }));
  await writeFile(path.join(DIR, 'efeito-uf.csv'), paraCsv(tab, Object.keys(tab[0])));
}

// ---------- gráfico das camadas (quanto do desvio é perfil do lugar) ----------
{
  const lin = [{ camada: 'bruto (sem controle)', secoesA: U.A, ...['nivel2t', 'nivel1t', 'variacao'].reduce((o, k) => {
    const g = k === 'nivel2t' ? res.teste1.s13.bruto : k === 'nivel1t' ? res.teste1.s13['1º turno bruto'] : res.teste2.s13.bruto;
    return { ...o, [`${k}_pp`]: g.b, [`${k}_inf`]: g.ic95[0], [`${k}_sup`]: g.ic95[1] };
  }, {}) }];
  for (const [nome] of [...CAMADAS].reverse()) {
    const c = res.camadas[nome];
    lin.push({ camada: `${nome} + perfil`, secoesA: c.cobertura1.secoesA, ...['nivel2t', 'nivel1t', 'variacao'].reduce((o, k) => ({ ...o, [`${k}_pp`]: c.s13[k].b, [`${k}_inf`]: c.s13[k].ic95[0], [`${k}_sup`]: c.s13[k].ic95[1] }), {}) });
  }
  await writeFile(path.join(DIR, 'grafico-camadas-s13.csv'), paraCsv(lin, ['camada', 'secoesA', 'nivel2t_pp', 'nivel2t_inf', 'nivel2t_sup', 'nivel1t_pp', 'nivel1t_inf', 'nivel1t_sup', 'variacao_pp', 'variacao_inf', 'variacao_sup']));
}

// ---------- teste 4: escala ----------
{
  const A = P.filter((s) => s.A);
  const tot = (l, t) => ({ v13: soma(l, (s) => (t === 2 ? s.v13_2 : s.v13_1)), v22: soma(l, (s) => (t === 2 ? s.v22_2 : s.v22_1)), comp: soma(l, (s) => (t === 2 ? s.c2 : s.c1)), secoes: l.length });
  const br2 = tot(P, 2), a2 = tot(A, 2), a1 = tot(A, 1), br1 = tot(P, 1), a1sub = tot(P.filter((s) => s.A1), 2);
  const margem = br2.v13 - br2.v22;
  res.teste4 = {
    brasil2t: br2, A2t: a2, A1_2t: a1sub, brasil1t: br1, A1t: a1,
    margem13menos22: margem,
    parcelaDosVotosNoA: r4((a2.v13 + a2.v22) / (br2.v13 + br2.v22)),
    // pior caso 1: todos os votos do 13 nas seções A eram do 22 (troca completa)
    margemSeTodo13DeAEra22: margem - 2 * a2.v13,
    // pior caso 2: todos os votos do 22 nas seções A eram do 13
    margemSeTodo22DeAEra13: margem + 2 * a2.v22,
    // seções A inteiras anuladas
    margemSemAsSecoesA: margem - (a2.v13 - a2.v22),
    // quantos votos precisariam ter sido trocados (22 → 13) só nas seções A para virar o resultado
    trocaMinimaParaVirar: Math.ceil(margem / 2) + (margem % 2 === 0 ? 1 : 0),
    trocaMinimaComoParcelaDoA: r4(Math.ceil(margem / 2) / (a2.v13 + a2.v22)),
    trocaMinimaComoParcelaDo13NoA: r4(Math.ceil(margem / 2) / a2.v13),
    A1: { margemSeTodo13DeA1Era22: margem - 2 * a1sub.v13 },
  };
  const ufs = [...new Set(P.map((s) => s.uf))].sort();
  const linhas = ufs.map((uf) => {
    const l = P.filter((s) => s.uf === uf), la = l.filter((s) => s.A);
    const t = tot(l, 2), ta = tot(la, 2);
    const m = t.v13 - t.v22;
    return { uf, secoes: l.length, secoesA: la.length, v13: t.v13, v22: t.v22, margem: m, A_v13: ta.v13, A_v22: ta.v22,
      parcelaA: r4((ta.v13 + ta.v22) / (t.v13 + t.v22)), margemSeTodo13DeAEra22: m - 2 * ta.v13, margemSeTodo22DeAEra13: m + 2 * ta.v22,
      vencedorMudaNoPiorCaso: (m > 0 && m - 2 * ta.v13 < 0) || (m < 0 && m + 2 * ta.v22 > 0) ? 1 : 0 };
  });
  res.teste4.porUf = linhas;
  res.teste4.ufsEmQueOPiorCasoViraAUf = linhas.filter((l) => l.vencedorMudaNoPiorCaso).map((l) => l.uf);
  await writeFile(path.join(DIR, 'escala-uf.csv'), paraCsv(linhas, Object.keys(linhas[0])));
  await writeFile(path.join(DIR, 'grafico-escala.csv'), paraCsv([
    { item: 'margem nacional do 13 sobre o 22 (2º turno)', votos: margem },
    { item: 'votos do 13 nas seções AC URNA', votos: a2.v13 },
    { item: 'votos do 22 nas seções AC URNA', votos: a2.v22 },
    { item: 'votos do 13 nas seções AC URNA com bytes a mais (A1)', votos: a1sub.v13 },
    { item: 'votos do 22 nas seções AC URNA com bytes a mais (A1)', votos: a1sub.v22 },
    { item: 'troca mínima 13→22 só nas seções A para virar o resultado', votos: Math.ceil(margem / 2) + (margem % 2 === 0 ? 1 : 0) },
  ], ['item', 'votos']));
}

// ---------- teste 5: poder ----------
// mde80: efeito que o teste detecta com 80% de chance (bilateral 5%, e Bonferroni 12 para o principal).
// Em votos: mde × votos 13+22 (aptos, comparecimento) das seções A que identificam o efeito / 100 = votos passados do 22 para o 13.
{
  const pw = (g, N, secoes) => g && { mde80_5pc_pp: r3((1.96 + Z80) * g.ep), mde80_bonf_pp: r3((CRIT + Z80) * g.ep),
    mde80_5pc_votos: Math.round(((1.96 + Z80) * g.ep * N) / 100), mde80_5pc_votosPorSecao: r3(((1.96 + Z80) * g.ep * N) / 100 / secoes),
    ic95_votos: [Math.round((g.ic95[0] * N) / 100), Math.round((g.ic95[1] * N) / 100)] };
  res.teste5 = { camadas: {} };
  for (const [nome] of CAMADAS) {
    const c = res.camadas[nome];
    res.teste5.camadas[nome] = { secoesA_nivel: c.cobertura1.secoesA, secoesA_variacao: c.cobertura2.secoesA,
      nivel_s13: pw(c.s13.nivel2t, c.cobertura1.votosA_13_22, c.cobertura1.secoesA), variacao_s13: pw(c.s13.variacao, c.cobertura2.votosA_13_22, c.cobertura2.secoesA) };
  }
  res.teste5.principal = { nivel_s13_bonf_pp: res.teste5.camadas.local.nivel_s13.mde80_bonf_pp, variacao_s13_bonf_pp: res.teste5.camadas.local.variacao_s13.mde80_bonf_pp };
  const am = res.variacaoAmpla;
  res.teste5.variacaoAmpla = { s13: pw(am.s13.uf, am.votosA_13_22, am.A), comp: pw(am.comp.uf, soma(amostraAmpla.filter((s) => s.A), (s) => s.a2), am.A),
    bn: pw(am.bn.uf, soma(amostraAmpla.filter((s) => s.A), (s) => s.c2), am.A), s13_zona: pw(am.s13.zona, am.votosA_13_22, am.A) };
  const soA = amostra1.filter((s) => s.A);
  res.teste5.A1nivel_s13 = pw(res.teste3.s13.nivel, soma(soA.filter((s) => s.A1), (s) => s.n2), soA.filter((s) => s.A1).length);
  res.teste5.A1variacao_s13 = pw(res.teste3.s13.variacao, soma(amostra2.filter((s) => s.A1), (s) => s.n2), amostra2.filter((s) => s.A1).length);
  res.teste5.porUf = res.porUf.linhas.map((l) => ({ uf: l.uf, secoesA: l.secoesA, varAmpla_mde80_pp: l.varAmpla_s13 ? r3((1.96 + Z80) * l.varAmpla_s13.ep) : null,
    varAmpla_mde80_votos: l.varAmpla_s13 ? Math.round(((1.96 + Z80) * l.varAmpla_s13.ep * l.votosA_13_22) / 100) : null,
    nivelZona_mde80_pp: l.nivelZona_s13 ? r3((1.96 + Z80) * l.nivelZona_s13.ep) : null, poucosConglomerados: l.poucosConglomeradosAmpla }));
}

// ---------- cauda: seções A extremas (exploratório) ----------
// Resíduo da parcela do 13 dentro do grupo (zona; perfil como controle; SEM o indicador A), em proporção, × √(13+22),
// padronizado pela mediana e pelo MAD das B do mesmo conjunto. Um software que mexesse em poucas urnas apareceria como
// excesso de A nas pontas, mesmo sem mudar a média. Nível (2º turno) e variação 1º → 2º.
async function cauda(lista, y, w, grupo, rotulo, arquivoHist) {
  const L = lista.filter((s) => s.zonaMista && s.n2 >= 20 && s.n1 >= 20);
  const a = mqef(L, { y, x: ctrlPerfil, nomes: NOMES_PERFIL, w, grupo, residuos: true });
  const usados = a.linhas;
  for (const s of usados) s._u = s._e * Math.sqrt(w(s));
  const med = (v) => { const o = Float64Array.from(v).sort(); return o[Math.floor(o.length / 2)]; };
  const uB = usados.filter((s) => !s.A).map((s) => s._u);
  const mB = med(uB), escala = 1.4826 * med(uB.map((u) => Math.abs(u - mB)));
  for (const s of usados) s._z = (s._u - mB) / escala;
  const grupos = { A: usados.filter((s) => s.A), B: usados.filter((s) => !s.A) };
  const out = { rotulo, secoes: usados.length, A: grupos.A.length, B: grupos.B.length, porLimiar: {} };
  for (const k of [3, 4, 5]) {
    const lin = {};
    for (const [g, l] of Object.entries(grupos)) lin[g] = { acima: l.filter((s) => s._z >= k).length, abaixo: l.filter((s) => s._z <= -k).length };
    for (const lado of ['acima', 'abaixo']) {
      const nA = grupos.A.length, nB = grupos.B.length;
      const pA = lin.A[lado] / nA, pB = lin.B[lado] / nB, pp = (lin.A[lado] + lin.B[lado]) / (nA + nB);
      const z = pp > 0 ? (pA - pB) / Math.sqrt(pp * (1 - pp) * (1 / nA + 1 / nB)) : NaN;
      lin[`${lado}_porMilA`] = r3(1000 * pA); lin[`${lado}_porMilB`] = r3(1000 * pB); lin[`${lado}_z`] = r2(z); lin[`${lado}_p`] = Number.isFinite(z) ? +pNormal2(z).toPrecision(3) : null;
    }
    out.porLimiar[k] = lin;
  }
  const bins = [];
  for (let x = -8; x < 8; x += 0.5) bins.push({ de: x, ate: x + 0.5, A: 0, B: 0 });
  for (const s of usados) { const i = Math.floor((Math.max(Math.min(s._z, 7.999), -8) + 8) / 0.5); bins[i][s.A ? 'A' : 'B']++; }
  await writeFile(path.join(DIR, arquivoHist), paraCsv(bins.map((b) => ({ de: b.de, ate: b.ate, secoesA: b.A, secoesB: b.B,
    fracaoA: +(b.A / grupos.A.length).toPrecision(4), fracaoB: +(b.B / grupos.B.length).toPrecision(4) })), ['de', 'ate', 'secoesA', 'secoesB', 'fracaoA', 'fracaoB']));
  const ext = grupos.A.filter((s) => Math.abs(s._z) >= 5).sort((x, yy) => Math.abs(yy._z) - Math.abs(x._z))
    .map((s) => ({ rotulo, uf: s.uf, municipio: s.municipio, zona: s.zona, secao: s.secao, local: s.local2, modelo: s.modeloVsc, A1: s.A1, z: r2(s._z),
      a1: s.a1, c1: s.c1, v13_1: s.v13_1, v22_1: s.v22_1, out1: s.out1, bn1: s.bn1, a2: s.a2, c2: s.c2, v13_2: s.v13_2, v22_2: s.v22_2, bn2: s.bn2 }));
  out.extremasA_z5 = ext.length; out.extremasA_z5_pro13 = ext.filter((e) => e.z > 0).length;
  out.extremasB_z5 = grupos.B.filter((s) => Math.abs(s._z) >= 5).length;
  return { out, ext };
}
{
  const c1 = await cauda(amostra1, (s) => s.y2.s13 / 100, (s) => s.n2, (s) => s.zon, 'nivel2t_zona', 'grafico-cauda-nivel-s13.csv');
  const c2 = await cauda(amostra2, (s) => dy(s, 's13') / 100, (s) => s.n2, (s) => s.zon, 'variacao_zona', 'grafico-cauda-variacao-s13.csv');
  res.cauda = { nivel: c1.out, variacao: c2.out };
  const ext = [...c1.ext, ...c2.ext];
  await writeFile(path.join(DIR, 'extremas-A.csv'), paraCsv(ext, ext.length ? Object.keys(ext[0]) : ['rotulo']));
  log(`cauda: nível A ${c1.out.extremasA_z5} (B ${c1.out.extremasB_z5}); variação A ${c2.out.extremasA_z5} (B ${c2.out.extremasB_z5})`);
}

await writeFile(path.join(DIR, 'resultado.json'), JSON.stringify(res, null, 1));
log('gravado data/parsed/auditoria/h25/resultado.json');
console.log(JSON.stringify({ universo: res.universo, decisao: res.decisao, confirmatorio: res.confirmatorio.map((f) => [f.teste, f.desfecho, f.b, f.ep, f.z, f.q]) }, null, 1));
