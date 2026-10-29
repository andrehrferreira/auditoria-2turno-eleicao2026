// Cético (achado h01-comparecimento-oficial-100mais, lente: explicações alternativas e poder do teste).
// Revisa docs/analysis/demografo/07-comparecimento-oficial-idosos.md e scripts/auditoria/demografo-comparecimento-oficial.mjs.
// Tudo agregado (município × zona × perfil, seção × contagem). Nenhum dado individual. Banco só pela cópia de leitura.
// Uso: node --max-old-space-size=4096 scripts/auditoria/cetico-h01-comparecimento-oficial-100mais-alternativas.mjs
// Saídas: data/parsed/auditoria/cetico/h01-oficial-alternativas.json e h01-oficial-zonas-lb.tsv
//
// O que mede:
//  A. Reprodução (157 / 970 / 133 zonas, 2.141 / 297.977, 15 municípios Bonferroni, 2 acima do teto).
//  B. 18–69: 82,6% (UFs sem ZZ) × 82,3% (arquivo BRASIL com exterior). Conta o ZZ à parte.
//  C. Definição de faixa: as 7 faixas, zona a zona, perfil de julho × comparecimento (não só a 100+).
//  D. Data de referência da idade × Censo: teto com a fração dos 95 anos do Censo que faz 100 até 04/10/2026.
//  E. O mínimo de 157 sob a definição de biometria do parecer 01 (foto sem digital; e o "excesso inverso"):
//     capacidade do log do 1º turno (habilitações por ano de nascimento sem biometria) por seção e por zona.
//  F. Alternativa não testada pelo autor: idade presumida de indígenas (cor/raça e grupo indígena do próprio arquivo).
//  G. Controle de composição por biometria na concentração (15 municípios) e controle "sem indígenas".
//  H. Poder: folga do teto do Censo; injeção não detectável pelo binomial com taxa da UF; leitura do "−0,82 × −0,83".
import { readFileSync, readdirSync } from 'node:fs';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { entradasZip, linhasBrutas } from './contagem-zip.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const ZIP = path.join(RAIZ, 'data/raw/dadosabertos/perfil_comparecimento_abstencao/perfil_comparecimento_abstencao_2026.zip');
const PERFIL = path.join(RAIZ, 'data/parsed/auditoria/demografo/perfil');
const IBGE = path.join(RAIZ, 'data/raw/externos/ibge');
const OUT = path.join(RAIZ, 'data/parsed/auditoria/cetico');
const r4 = (x) => Math.round(x * 1e4) / 1e4;
const FX = ['f16_17', 'f18_69', 'f70_79', 'f80_89', 'f90_99', 'f100', 'invalida'];
const faixa = (c) => (c === 1600 || c === 1700 ? 0 : c >= 1800 && c <= 6569 ? 1 : c === 7074 || c === 7579 ? 2 : c === 8084 || c === 8589 ? 3
  : c === 9094 || c === 9599 ? 4 : c === 9999 ? 5 : 6);
const R = {};

// ---------- 1. Comparecimento oficial (UFs, ZZ à parte). Por zona: 7 faixas [aptos, comp]; 100+ indígena; cor/raça nacional
const zonas = new Map(); // uf|mun|zona -> {f: [[a,c]x7], ind100: [a,c], ind90: [a,c], tte100}
const zz = FX.map(() => [0, 0]);
const corNac = new Map(); // faixa|cor -> [a, c]
const grupoInd100 = new Map();
let turnos = new Set(), linhas = 0;
for (const e of (await entradasZip(ZIP)).filter((x) => /_2026_[A-Z]{2}\.csv$/.test(x.nome) && !x.nome.includes('BRASIL'))) {
  let col = null;
  for await (const c of linhasBrutas(ZIP, e)) {
    if (!col) { col = Object.fromEntries(c.map((n, i) => [n, i])); continue; }
    linhas++; turnos.add(c[col.NR_TURNO]);
    if (c[col.NR_TURNO] !== '1') continue;
    const uf = c[col.SG_UF].toLowerCase(); const f = faixa(Number(c[col.CD_FAIXA_ETARIA]));
    const ap = Number(c[col.QT_APTOS]), cp = Number(c[col.QT_COMPARECIMENTO]);
    if (uf === 'zz') { zz[f][0] += ap; zz[f][1] += cp; continue; }
    const k = `${uf}|${c[col.CD_MUNICIPIO].padStart(5, '0')}|${c[col.NR_ZONA].padStart(4, '0')}`;
    let z = zonas.get(k); if (!z) zonas.set(k, (z = { f: FX.map(() => [0, 0]), ind100: [0, 0], ind90: [0, 0], tte100: 0 }));
    z.f[f][0] += ap; z.f[f][1] += cp;
    const cor = c[col.DS_COR_RACA]; const ind = /ind[ií]gena/i.test(cor) || Number(c[col.CD_GRUPO_INDIGENA]) > 0;
    if (f === 5) { z.tte100 += Number(c[col.QT_COMPARECIMENTO_TTE]); if (ind) { z.ind100[0] += ap; z.ind100[1] += cp; }
      const g = `${c[col.DS_GRUPO_INDIGENA]}`; const v = grupoInd100.get(g) ?? [0, 0]; v[0] += ap; v[1] += cp; grupoInd100.set(g, v); }
    if (f === 4 && ind) { z.ind90[0] += ap; z.ind90[1] += cp; }
    if (f >= 4) { const kc = `${FX[f]}|${cor}`; const v = corNac.get(kc) ?? [0, 0]; v[0] += ap; v[1] += cp; corNac.set(kc, v); }
  }
}
R.linhas_ufs = linhas; R.turnos_no_arquivo = [...turnos];

// ---------- 2. Perfil do eleitorado (jul/2026) por seção e por zona
const perfilSec = new Map(); const perfilZona = new Map(); let I;
for (const f of readdirSync(PERFIL)) {
  const ls = readFileSync(path.join(PERFIL, f), 'utf8').trimEnd().split('\n'); const cab = ls[0].split('\t');
  I = Object.fromEntries(cab.map((n, i) => [n, i]));
  for (const l of ls.slice(1)) {
    const c = l.split('\t'); if (c[0] === 'zz') continue;
    const v = c.slice(4).map(Number); perfilSec.set(`${c[0]}|${c[1]}|${c[2]}|${c[3]}`, v);
    const kz = `${c[0]}|${c[1]}|${c[2]}`; const a = perfilZona.get(kz); if (!a) perfilZona.set(kz, v.slice()); else for (let i = 0; i < v.length; i++) a[i] += v[i];
  }
}
const P = (n) => I[n] - 4; // índice dentro de v

// ---------- A/B/C. Reprodução, ZZ e as 7 faixas zona a zona
const nac = FX.map(() => [0, 0]);
const difFaixa = Object.fromEntries(FX.map((f) => [f, 0])); let zonasSemPerfil = 0;
for (const [k, z] of zonas) {
  for (let i = 0; i < 7; i++) { nac[i][0] += z.f[i][0]; nac[i][1] += z.f[i][1]; }
  const p = perfilZona.get(k); if (!p) { zonasSemPerfil++; continue; }
  for (let i = 0; i < 7; i++) difFaixa[FX[i]] += Math.abs(p[P(FX[i])] - z.f[i][0]);
}
let perfilSemComp = 0; for (const k of perfilZona.keys()) if (!zonas.has(k)) perfilSemComp++;
R.A_nacional_ufs = Object.fromEntries(FX.map((f, i) => [f, { aptos: nac[i][0], comp: nac[i][1], taxa: r4(nac[i][1] / nac[i][0]) }]));
R.B_zz_exterior = Object.fromEntries(FX.map((f, i) => [f, { aptos: zz[i][0], comp: zz[i][1], taxa: zz[i][0] ? r4(zz[i][1] / zz[i][0]) : null }]));
R.B_18_69_com_zz = { aptos: nac[1][0] + zz[1][0], comp: nac[1][1] + zz[1][1], taxa: r4((nac[1][1] + zz[1][1]) / (nac[1][0] + zz[1][0])) };
R.C_soma_dif_abs_por_faixa_zona_a_zona = difFaixa; R.C_zonas_comp_sem_perfil = zonasSemPerfil; R.C_zonas_perfil_sem_comp = perfilSemComp;

// ---------- banco (cópia de leitura): municípios, log do 1º turno por seção, seções agregadas do 1º turno
const { db, fonte } = await abrirLeitura(); R.fonte_banco = fonte;
const municipios = new Map(db.prepare('SELECT codigo, uf, nome, codigo_ibge FROM municipio').all().map((m) => [m.codigo, m]));
const agreg = new Map(); for (const a of db.prepare('SELECT uf, municipio, zona, secao, secao_principal FROM secao_agregada WHERE turno = 1').all()) agreg.set(`${a.uf}|${a.municipio}|${a.zona}|${a.secao}`, a.secao_principal);
const logSec = new Map(); const logUfs = new Set();
for (const s of db.prepare('SELECT uf, municipio, zona, secao, votos_computados v, habilitados_biometria b, ano_nascimento_sem_biometria a, habilitados_pelo_mesario m FROM perfil_log WHERE turno = 1').all()) {
  const k = `${s.uf}|${s.municipio}|${s.zona}|${s.secao}`; const o = logSec.get(k);
  if (o) { o.v += s.v; o.b += s.b; o.a += s.a; o.m += s.m; } else logSec.set(k, { v: s.v, b: s.b, a: s.a, m: s.m }); logUfs.add(s.uf);
}
R.log_1t_ufs = [...logUfs].sort(); R.log_1t_secoes = logSec.size;
// grupos de votação: seção principal + agregadas
const grupos = new Map(); // uf|mun|zona|principal -> {sem100, com100, sem, com}
for (const [k, v] of perfilSec) {
  const [uf, mun, zona, sec] = k.split('|'); const pr = agreg.get(k) ?? sec; const kg = `${uf}|${mun}|${zona}|${pr}`;
  const g = grupos.get(kg) ?? { sem100: 0, a100: 0, sem: 0, tot: 0 };
  g.sem100 += v[P('sembio_f100')]; g.a100 += v[P('f100')]; g.tot += v[P('total')]; g.sem += v[P('total')] - v[P('biometria')]; grupos.set(kg, g);
}
const logZona = new Map(); const capZona = new Map(); const gruposSemLog = new Map();
for (const [kg, g] of grupos) {
  const [uf, mun, zona] = kg.split('|'); const kz = `${uf}|${mun}|${zona}`; if (!logUfs.has(uf)) continue;
  const l = logSec.get(kg); if (!l) { gruposSemLog.set(kz, (gruposSemLog.get(kz) ?? 0) + g.a100); continue; }
  capZona.set(kz, (capZona.get(kz) ?? 0) + Math.min(g.sem100, l.a));
}
for (const [k, l] of logSec) { const kz = k.split('|').slice(0, 3).join('|'); const o = logZona.get(kz) ?? { v: 0, b: 0, a: 0, m: 0 }; o.v += l.v; o.b += l.b; o.a += l.a; o.m += l.m; logZona.set(kz, o); }

// ---------- E. Mínimo de 157 × log do 1º turno
let lb100 = 0, lb90 = 0; const lbUf = {}; const linhasLb = [];
const E = { zonas_lb: 0, lb_em_ufs_com_log: 0, zonas_lb_com_log: 0, zonas_lb_excesso_inverso: 0, lb_em_zonas_excesso_inverso: 0,
  zonas_lb_acima_capacidade_secao: 0, lb_acima_capacidade_secao: 0, lb_consistente_e_sem_inverso: 0, zonas_lb_sem_inverso_consistente: 0, lb_sem_log: 0 };
for (const [k, z] of zonas) {
  const p = perfilZona.get(k); if (!p) continue;
  const com100 = p[P('f100')] - p[P('sembio_f100')], com90 = p[P('f90_99')] - p[P('sembio_f90_99')];
  const l100 = Math.max(0, z.f[5][1] - com100), l90 = Math.max(0, z.f[4][1] - com90);
  lb100 += l100; lb90 += l90; const uf = k.split('|')[0]; if (l100) { lbUf[uf] = (lbUf[uf] ?? 0) + l100; E.zonas_lb++; }
  if (!l100) continue;
  const lz = logZona.get(k);
  if (!lz) { E.lb_sem_log += l100; linhasLb.push([k, z.f[5][0], p[P('sembio_f100')], z.f[5][1], l100, '', '', '', '', '', z.ind100[1]]); continue; }
  E.zonas_lb_com_log++; E.lb_em_ufs_com_log += l100;
  const comBioTot = p[P('biometria')]; const semTot = p[P('total')] - p[P('biometria')];
  const inverso = Math.max(0, lz.b + lz.m - comBioTot); // votantes com digital na urna acima de todos os "com biometria" do perfil (todas as idades)
  const direto = Math.max(0, lz.a - semTot); // votantes "sem biometria cadastrada" na urna acima dos "sem biometria" do perfil (foto sem digital)
  const cap = capZona.get(k) ?? 0; // teto de votos 100+ sem digital: soma por seção de min(sem100 do perfil, habilitações por ano de nascimento sem biometria)
  if (inverso > 0) { E.zonas_lb_excesso_inverso++; E.lb_em_zonas_excesso_inverso += l100; }
  if (l100 > cap) { E.zonas_lb_acima_capacidade_secao++; E.lb_acima_capacidade_secao += l100 - cap; }
  if (inverso === 0 && l100 <= cap) { E.zonas_lb_sem_inverso_consistente++; E.lb_consistente_e_sem_inverso += l100; }
  linhasLb.push([k, z.f[5][0], p[P('sembio_f100')], z.f[5][1], l100, lz.v, lz.a, semTot, inverso, cap, z.ind100[1], direto]);
}
R.A_lb100 = lb100; R.A_lb90 = lb90; R.A_lb100_por_uf = lbUf; R.E_minimo_157_x_log_1t = E;

// ---------- F. Indígenas (cor/raça "Indígena" ou grupo indígena informado) entre os 100+
R.F_cor_raca_90mais = Object.fromEntries([...corNac].sort().map(([k, v]) => [k, { aptos: v[0], comp: v[1], taxa: r4(v[1] / v[0]) }]));
R.F_grupo_indigena_100 = Object.fromEntries([...grupoInd100].sort((a, b) => b[1][1] - a[1][1]).slice(0, 15).map(([k, v]) => [k, { aptos: v[0], comp: v[1] }]));

// ---------- IBGE (mesmos arquivos do autor)
function sidra(arquivo, chaveCat) {
  const m = new Map();
  for (const l of JSON.parse(readFileSync(path.join(IBGE, arquivo), 'utf8')).slice(1)) { const v = Number(l.V); const o = m.get(l.D1C) ?? {}; o[l[chaveCat]] = Number.isFinite(v) ? v : 0; m.set(l.D1C, o); }
  return m;
}
const censoC = sidra('censo2022-9514-idade-c.json', 'D5C');
const FR95 = 65 / 365; // nascidos de 01/08/1926 a 04/10/1926: 95 anos no Censo (31/07/2022) e 100 em 04/10/2026
const coorte = (cod) => { const c = censoC.get(municipios.get(cod)?.codigo_ibge); if (!c) return null; return { p96: c['60041'] - c['6648'] + c['6653'], p95: c['6648'] }; };

// ---------- municípios
const mun = new Map();
for (const [k, z] of zonas) {
  const [uf, m] = k.split('|'); const p = perfilZona.get(k);
  const a = mun.get(m) ?? { uf, m, a: 0, c: 0, ai: 0, ci: 0, sem: 0, com: 0 };
  a.a += z.f[5][0]; a.c += z.f[5][1]; a.ai += z.ind100[0]; a.ci += z.ind100[1];
  if (p) { a.sem += p[P('sembio_f100')]; a.com += p[P('f100')] - p[P('sembio_f100')]; }
  mun.set(m, a);
}
// ---------- utilidades
function lgamma(x) { const g = 7, cf = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502971239, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x); x -= 1; let a = cf[0]; const t = x + g + 0.5; for (let i = 1; i < 9; i++) a += cf[i] / (x + i); return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a); }
function caudaBin(n, k, p) { if (k <= 0) return 1; if (k > n) return 0; if (p <= 0) return 0; let s = 0;
  for (let j = k; j <= n; j++) { const t = Math.exp(lgamma(n + 1) - lgamma(j + 1) - lgamma(n - j + 1) + j * Math.log(p) + (n - j) * Math.log(1 - p)); s += t; if (j > n * p && t < s * 1e-15) break; } return Math.min(1, s); }
function caudaPois(mu, k) { if (k <= 0) return 1; if (mu <= 0) return 0; let s = 0;
  for (let j = k; j < k + 100000; j++) { const t = Math.exp(j * Math.log(mu) - mu - lgamma(j + 1)); s += t; if (j > mu && t < s * 1e-15) break; } return Math.min(1, s); }
const taxaUf = (lista, sel) => { const u = new Map(); for (const a of lista) { const [x, y] = sel(a); const o = u.get(a.uf) ?? [0, 0]; o[0] += x; o[1] += y; u.set(a.uf, o); } return u; };

const lista = [...mun.values()].filter((a) => a.a > 0);
const bonf = 0.05 / lista.length;
// G0. reprodução do binomial do autor
const uRate = taxaUf(lista, (a) => [a.a, a.c]);
const pB = (a, c, n) => caudaBin(n, c, uRate.get(a.uf)[1] / uRate.get(a.uf)[0]);
const sigAutor = lista.filter((a) => pB(a, a.c, a.a) < bonf).map((a) => a.m);
// G1. controle de composição por biometria: μ = k_UF × (r_com·com + r_sem·sem), r nacionais (Goodman do autor: 5,16% e 0,21%)
const RCOM = 0.0516, RSEM = 0.0021;
const base = (a) => RCOM * a.com + RSEM * a.sem;
const uBase = taxaUf(lista, (a) => [base(a), a.c]);
const sigComp = lista.filter((a) => { const u = uBase.get(a.uf); const mu = u[0] > 0 ? base(a) * (u[1] / u[0]) : 0; a.mu = mu; a.pComp = caudaPois(mu, a.c); return a.pComp < bonf; }).map((a) => a.m);
// G2. sem indígenas: binomial com taxa da UF calculada sem os 100+ indígenas
const uNi = taxaUf(lista, (a) => [a.a - a.ai, a.c - a.ci]);
const sigNi = lista.filter((a) => { const u = uNi.get(a.uf); const n = a.a - a.ai, c = a.c - a.ci; return n > 0 && caudaBin(n, c, u[1] / u[0]) < bonf; }).map((a) => a.m);
const nome = (m) => `${municipios.get(m)?.uf?.toUpperCase()} ${municipios.get(m)?.nome}`;
R.G_concentracao = {
  municipios_testados: lista.length, limiar_bonferroni: bonf,
  autor_reproduzido: sigAutor.length,
  com_controle_de_biometria: { significativos: sigComp.length, dos_15_do_autor_que_ficam: sigAutor.filter((m) => sigComp.includes(m)).map(nome), novos: sigComp.filter((m) => !sigAutor.includes(m)).map(nome) },
  sem_indigenas: { significativos: sigNi.length, dos_15_que_ficam: sigAutor.filter((m) => sigNi.includes(m)).map(nome), novos: sigNi.filter((m) => !sigAutor.includes(m)).map(nome) },
  detalhe_15: sigAutor.map((m) => { const a = mun.get(m); return { mun: nome(m), aptos100: a.a, comp100: a.c, aptos100_indigenas: a.ai, comp100_indigenas: a.ci, com_bio: a.com, sem_bio: a.sem, mu_composicao: r4(a.mu ?? 0), p_composicao: Number((a.pComp ?? 1).toPrecision(3)) }; }),
};

// ---------- D. Teto do Censo com a fração dos 95 anos
let acima96 = [], acimaAdj = [];
for (const a of mun.values()) { const c = coorte(a.m); if (!c) continue; if (a.c > c.p96) acima96.push(nome(a.m)); if (a.c > c.p96 + FR95 * c.p95) acimaAdj.push(`${nome(a.m)} (${a.c} > ${r4(c.p96 + FR95 * c.p95)}; 95 anos no Censo: ${c.p95})`); }
R.D_teto_censo = { acima_96mais: acima96, acima_96mais_mais_fracao_95: acimaAdj };

// ---------- H. Poder
// H1. folga do teto: votos 100+ que caberiam sem passar do teto (96+ do Censo) nem dos títulos aptos, onde há títulos em excesso
let folgaTeto = 0, folgaVivos = 0, munExcesso = 0; const SOBREV = 0.4234;
for (const a of mun.values()) { const c = coorte(a.m); if (!c || a.a <= c.p96) continue; munExcesso++;
  folgaTeto += Math.max(0, Math.min(a.a, c.p96) - a.c); folgaVivos += Math.max(0, Math.min(a.a, Math.floor(c.p96 * SOBREV)) - a.c); }
// H2. injeção máxima não detectável por município (binomial taxa da UF fixa, Bonferroni)
let injMax = 0; const injPorUf = {};
for (const a of lista) { const pu = uRate.get(a.uf)[1] / uRate.get(a.uf)[0]; let lo = 0, hi = a.a - a.c;
  if (caudaBin(a.a, a.c + hi, pu) >= bonf) lo = hi; else { while (hi - lo > 1) { const md = (lo + hi) >> 1; if (caudaBin(a.a, a.c + md, pu) >= bonf) lo = md; else hi = md; } }
  injMax += lo; injPorUf[a.uf] = (injPorUf[a.uf] ?? 0) + lo; }
// H3. cenários simulados (determinísticos): o que o binomial do autor acusaria
function cenario(extra) { // extra(a) -> votos a mais no município; taxa da UF recalculada
  const l2 = lista.map((a) => ({ ...a, c: Math.min(a.a, a.c + extra(a)) })); const u = taxaUf(l2, (a) => [a.a, a.c]);
  const sig = l2.filter((a) => caudaBin(a.a, a.c, u.get(a.uf)[1] / u.get(a.uf)[0]) < bonf).length;
  const inj = l2.reduce((s, a, i) => s + a.c - lista[i].c, 0); const tot = l2.reduce((s, a) => s + a.c, 0);
  return { votos_injetados: inj, taxa_nacional_100: r4(tot / nac[5][0]), diferenca_para_18_69: r4(tot / nac[5][0] - nac[1][1] / nac[1][0]), municipios_bonferroni: sig };
}
const comExcesso = new Set([...mun.values()].filter((a) => { const c = coorte(a.m); return c && a.a > c.p96; }).map((a) => a.m));
R.H_poder = {
  municipios_com_titulos_100_acima_coorte96: munExcesso,
  folga_teto_absoluto_votos: folgaTeto, folga_vivos_esperados_votos: folgaVivos,
  injecao_max_nao_detectavel_binomial_uf_fixa: injMax, injecao_por_uf_top: Object.fromEntries(Object.entries(injPorUf).sort((a, b) => b[1] - a[1]).slice(0, 8)),
  cenario_1pct_uniforme: cenario((a) => Math.round(a.a * 0.01)),
  cenario_5pct_uniforme: cenario((a) => Math.round(a.a * 0.05)),
  cenario_1_voto_por_municipio_com_excesso: cenario((a) => (comExcesso.has(a.m) ? 1 : 0)),
  cenario_2pct_so_municipios_com_excesso: cenario((a) => (comExcesso.has(a.m) ? Math.round(a.a * 0.02) : 0)),
  cenario_100pct_na_zona_SP_Piracicaba: cenario((a) => (nome(a.m) === 'SP PIRACICABA' ? a.a - a.c : 0)),
};
R.gerado_em = new Date().toISOString();
await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, 'h01-oficial-alternativas.json'), JSON.stringify(R, null, 1));
await writeFile(path.join(OUT, 'h01-oficial-zonas-lb.tsv'), [['uf|mun|zona', 'aptos_100', 'sem_bio_100_perfil', 'votantes_100', 'lb_100_sem_bio', 'votos_log_zona', 'hab_ano_nasc_sem_bio_log', 'sem_bio_perfil_todas_idades', 'excesso_inverso_zona', 'capacidade_secao_100', 'votantes_100_indigenas', 'excesso_direto_zona'], ...linhasLb].map((l) => l.join('\t')).join('\n') + '\n');
console.log(JSON.stringify(R, null, 1));
