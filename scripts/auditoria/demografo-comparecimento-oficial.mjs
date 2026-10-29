// Demógrafo: teste direto da H01 com o comparecimento OFICIAL por faixa etária (TSE, perfil_comparecimento_abstencao_2026.zip),
// por município e zona. Cruza com o perfil do eleitorado por seção (biometria por faixa) e com o Censo 2022 + mortalidade (IBGE).
// Tudo agregado. Pré-requisitos: demografo-baixar-ibge.mjs e demografo-perfil.mjs.
// Uso: node --max-old-space-size=8192 scripts/auditoria/demografo-comparecimento-oficial.mjs
// Saídas: data/parsed/auditoria/demografo/oficial-{resumo.json, municipios-100.tsv, zonas-100.tsv, concentracao-100.tsv}
import { readFileSync, readdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { entradasZip, linhasBrutas } from './contagem-zip.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const ZIP = path.join(RAIZ, 'data/raw/dadosabertos/perfil_comparecimento_abstencao/perfil_comparecimento_abstencao_2026.zip');
const OUT = path.join(RAIZ, 'data/parsed/auditoria/demografo');
const IBGE = path.join(RAIZ, 'data/raw/externos/ibge');
const r4 = (x) => Math.round(x * 10000) / 10000;
const tsv = (l) => l.map((x) => x.join('\t')).join('\n') + '\n';

// Faixas (mesmos códigos CD_FAIXA_ETARIA do perfil do eleitorado)
const FX = ['f16_17', 'f18_69', 'f70_79', 'f80_89', 'f90_99', 'f100', 'invalida'];
function faixa(c) {
  if (c === 1600 || c === 1700) return 'f16_17';
  if (c === 7074 || c === 7579) return 'f70_79';
  if (c === 8084 || c === 8589) return 'f80_89';
  if (c === 9094 || c === 9599) return 'f90_99';
  if (c === 9999) return 'f100';
  if (c >= 1800 && c <= 6569) return 'f18_69';
  return 'invalida';
}

// ---------- 1. Comparecimento oficial: (turno, uf, mun, zona) → faixa → [aptos, comp]; também por código fino de idade no país
const zonas = new Map();
const fino = new Map(); // turno|código → [aptos, comp]
const geracao = new Set();
for (const e of (await entradasZip(ZIP)).filter((x) => /_2026_[A-Z]{2}\.csv$/.test(x.nome) && !x.nome.includes('BRASIL'))) {
  let col = null;
  for await (const c of linhasBrutas(ZIP, e)) {
    if (!col) { col = Object.fromEntries(c.map((n, i) => [n, i])); continue; }
    const t = c[col.NR_TURNO]; const uf = c[col.SG_UF].toLowerCase();
    if (uf === 'zz' || uf === 'vt') continue;
    geracao.add(`${t}:${c[col.DT_GERACAO]}`);
    const cod = Number(c[col.CD_FAIXA_ETARIA]); const f = faixa(cod);
    const ap = Number(c[col.QT_APTOS]); const cp = Number(c[col.QT_COMPARECIMENTO]);
    const k = `${t}|${uf}|${c[col.CD_MUNICIPIO].padStart(5, '0')}|${c[col.NR_ZONA].padStart(4, '0')}`;
    let z = zonas.get(k); if (!z) zonas.set(k, (z = Object.fromEntries(FX.map((x) => [x, [0, 0]]))));
    z[f][0] += ap; z[f][1] += cp;
    const kf = `${t}|${cod}`; const v = fino.get(kf) ?? [0, 0]; v[0] += ap; v[1] += cp; fino.set(kf, v);
  }
}
const turnos = [...new Set([...zonas.keys()].map((k) => k.split('|')[0]))].sort();

// ---------- 2. Perfil (jul/2026) por zona: eleitores e sem biometria por faixa
const perfilZona = new Map();
let COL;
for (const f of readdirSync(path.join(OUT, 'perfil'))) {
  const linhas = readFileSync(path.join(OUT, 'perfil', f), 'utf8').trimEnd().split('\n');
  COL = linhas[0].split('\t');
  for (const l of linhas.slice(1)) {
    const c = l.split('\t'); if (c[0] === 'zz') continue;
    const k = `${c[0]}|${c[1]}|${c[2]}`; const v = c.slice(4).map(Number);
    const a = perfilZona.get(k); if (!a) perfilZona.set(k, v); else for (let i = 0; i < v.length; i++) a[i] += v[i];
  }
}
const I = Object.fromEntries(COL.slice(4).map((n, i) => [n, i]));

// ---------- 3. IBGE: coorte 96+ (100+ em 2026) e mortalidade do grupo 90+
function sidra(arquivo, chaveCat) {
  const m = new Map();
  for (const l of JSON.parse(readFileSync(path.join(IBGE, arquivo), 'utf8')).slice(1)) {
    const v = Number(l.V); const o = m.get(l.D1C) ?? {}; o[l[chaveCat]] = Number.isFinite(v) ? v : 0; m.set(l.D1C, o);
  }
  return m;
}
const censoC = sidra('censo2022-9514-idade-c.json', 'D5C');
let d90 = 0, p90 = 0;
for (const ano of ['2023', '2024']) for (const [, o] of sidra(`obitos-2654-${ano}.json`, 'D7C')) d90 += (o['106182'] + o['106183'] + o['5996']) / 2;
for (const [, c] of censoC) p90 += c['60040'] + c['60041'] + c['6653'];
const q90 = d90 / p90; const SOBREV = (1 - q90) ** 4; // otimista: usa a mortalidade de 90+ para quem tem 96+
const { db, fonte } = await abrirLeitura();
const municipios = new Map(db.prepare('SELECT codigo, uf, nome, codigo_ibge FROM municipio').all().map((m) => [m.codigo, m]));
const coorte = (codTse) => {
  const c = censoC.get(municipios.get(codTse)?.codigo_ibge); if (!c) return null;
  return { p96: c['60041'] - c['6648'] + c['6653'], p100: c['6653'] };
};

// ---------- Utilidades estatísticas
function lgamma(x) { // Lanczos
  const g = 7, cf = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502971239, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  x -= 1; let a = cf[0]; const t = x + g + 0.5; for (let i = 1; i < 9; i++) a += cf[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
const lbinom = (n, k, p) => lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1) + k * Math.log(p) + (n - k) * Math.log(1 - p);
function caudaSuperior(n, k, p) { // P(X ≥ k), X ~ Bin(n, p)
  if (k <= 0) return 1; let s = 0; for (let j = k; j <= n; j++) s += Math.exp(lbinom(n, j, p)); return Math.min(1, s);
}
// Regressão ecológica de Goodman: taxa = r_com·(1−s) + r_sem·s, ponderada pelos aptos do grupo, sem intercepto
function goodman(pontos) {
  let a = 0, b = 0, c = 0, d = 0, e = 0;
  for (const { n, taxa, s } of pontos) { const x1 = 1 - s, x2 = s; a += n * x1 * x1; b += n * x1 * x2; c += n * x2 * x2; d += n * x1 * taxa; e += n * x2 * taxa; }
  const det = a * c - b * b; return { r_com: r4((c * d - b * e) / det), r_sem: r4((a * e - b * d) / det), zonas: pontos.length };
}

const resumo = { fonte_banco: fonte, geracao: [...geracao].sort(), turnos_no_arquivo: turnos, mortalidade_anual_90mais: r4(q90), sobrevivencia_4_anos: r4(SOBREV) };

for (const t of turnos) {
  const R = (resumo[`turno${t}`] = {});
  // Taxas nacionais por faixa e por código fino
  const nac = Object.fromEntries(FX.map((f) => [f, [0, 0]]));
  const porUf = new Map();
  for (const [k, z] of zonas) {
    if (!k.startsWith(`${t}|`)) continue; const uf = k.split('|')[1];
    const u = porUf.get(uf) ?? Object.fromEntries(FX.map((f) => [f, [0, 0]]));
    for (const f of FX) { nac[f][0] += z[f][0]; nac[f][1] += z[f][1]; u[f][0] += z[f][0]; u[f][1] += z[f][1]; }
    porUf.set(uf, u);
  }
  R.nacional = Object.fromEntries(FX.map((f) => [f, { aptos: nac[f][0], comparecimento: nac[f][1], taxa: r4(nac[f][1] / nac[f][0]) }]));
  R.por_codigo_idade = [...fino].filter(([k]) => k.startsWith(`${t}|`) && Number(k.split('|')[1]) >= 6064)
    .map(([k, v]) => ({ codigo: Number(k.split('|')[1]), aptos: v[0], comparecimento: v[1], taxa: r4(v[1] / v[0]) })).sort((a, b) => a.codigo - b.codigo);
  R.taxa_100_por_uf = Object.fromEntries([...porUf].sort().map(([uf, u]) => [uf, { aptos: u.f100[0], comp: u.f100[1], taxa: r4(u.f100[1] / u.f100[0]) }]));

  // Por zona: limite inferior de votantes 100+ (e 90–99) SEM biometria = comparecimento oficial do grupo − eleitores do grupo com biometria
  let lbSem100 = 0, lbSem90 = 0; const zonasLista = []; let semPerfil = 0, difAptos100 = 0;
  const pontos = { f18_69: [], f70_79: [], f80_89: [], f90_99: [], f100: [] }; const pontosUf = new Map();
  for (const [k, z] of zonas) {
    if (!k.startsWith(`${t}|`)) continue; const [, uf, mun, zona] = k.split('|');
    const p = perfilZona.get(`${uf}|${mun}|${zona}`); if (!p) { semPerfil++; continue; }
    difAptos100 += Math.abs(p[I.f100] - z.f100[0]);
    const com100 = p[I.f100] - p[I.sembio_f100]; const com90 = p[I.f90_99] - p[I.sembio_f90_99];
    const lb100 = Math.max(0, z.f100[1] - com100); const lb90 = Math.max(0, z.f90_99[1] - com90);
    lbSem100 += lb100; lbSem90 += lb90;
    for (const f of Object.keys(pontos)) {
      if (z[f][0] < 10 || !p[I[f]]) continue;
      const pt = { n: z[f][0], taxa: z[f][1] / z[f][0], s: p[I[`sembio_${f}`]] / p[I[f]] };
      pontos[f].push(pt); const pu = pontosUf.get(uf) ?? {}; (pu[f] ??= []).push(pt); pontosUf.set(uf, pu);
    }
    if (z.f100[1] > 0) zonasLista.push([uf, mun, municipios.get(mun)?.nome ?? '', zona, z.f100[0], p[I.f100], p[I.sembio_f100], z.f100[1], lb100, z.f90_99[0], z.f90_99[1], p[I.sembio_f90_99], lb90]);
  }
  R.zonas_sem_perfil = semPerfil; R.soma_dif_abs_aptos100_oficial_x_perfil = difAptos100;
  R.votantes_100_sem_biometria_no_minimo = lbSem100; R.votantes_90_99_sem_biometria_no_minimo = lbSem90;
  R.goodman_nacional = Object.fromEntries(Object.entries(pontos).map(([f, ps]) => [f, goodman(ps)]));
  R.goodman_por_uf_f90_99 = Object.fromEntries([...pontosUf].sort().filter(([, pu]) => (pu.f90_99?.length ?? 0) >= 10).map(([uf, pu]) => [uf, goodman(pu.f90_99)]));
  R.goodman_por_uf_f80_89 = Object.fromEntries([...pontosUf].sort().filter(([, pu]) => (pu.f80_89?.length ?? 0) >= 10).map(([uf, pu]) => [uf, goodman(pu.f80_89)]));
  zonasLista.sort((a, b) => b[7] - a[7]);
  await writeFile(path.join(OUT, `oficial-zonas-100-${t}t.tsv`), tsv([['uf', 'municipio', 'nome', 'zona', 'aptos_100_oficial', 'eleitores_100_perfil', 'sem_bio_100_perfil', 'votantes_100', 'votantes_100_sem_bio_no_minimo', 'aptos_90_99', 'votantes_90_99', 'sem_bio_90_99_perfil', 'votantes_90_99_sem_bio_no_minimo'], ...zonasLista]));

  // Por município: votantes 100+ × centenários possíveis; concentração com controle de UF (binomial, taxa da UF)
  const mun = new Map();
  for (const [k, z] of zonas) {
    if (!k.startsWith(`${t}|`)) continue; const [, uf, m] = k.split('|');
    const a = mun.get(m) ?? { uf, m, a100: 0, c100: 0, a90: 0, c90: 0, aT: 0, cT: 0 };
    a.a100 += z.f100[0]; a.c100 += z.f100[1]; a.a90 += z.f90_99[0]; a.c90 += z.f90_99[1];
    for (const f of FX) { a.aT += z[f][0]; a.cT += z[f][1]; }
    mun.set(m, a);
  }
  const linhas = []; let acimaTeto = 0, acimaEsperado = 0, votAcimaTeto = 0, votAcimaEsp = 0, totVot = 0, totEsp = 0, totP96 = 0;
  const testados = [];
  for (const a of mun.values()) {
    const c = coorte(a.m); if (!c) continue;
    const esperado = c.p96 * SOBREV; totVot += a.c100; totEsp += esperado; totP96 += c.p96;
    if (a.c100 > c.p96) { acimaTeto++; votAcimaTeto += a.c100 - c.p96; }
    if (a.c100 > esperado) { acimaEsperado++; votAcimaEsp += a.c100 - esperado; }
    const pUf = R.taxa_100_por_uf[a.uf].taxa;
    let pval = null; if (a.a100 > 0) { pval = caudaSuperior(a.a100, a.c100, pUf); testados.push(pval); }
    linhas.push({ ...a, nome: municipios.get(a.m)?.nome ?? '', p96: c.p96, p100: c.p100, esperado, pUf, pval });
  }
  const bonf = 0.05 / testados.length;
  R.municipios = linhas.length;
  R.votantes_100_total = totVot; R.centenarios_possiveis_total = Math.round(totEsp); R.coorte_96_2022_total = totP96;
  R.municipios_votantes_100_maior_que_coorte_96_2022 = acimaTeto; R.excesso_sobre_coorte = votAcimaTeto;
  R.municipios_votantes_100_maior_que_esperado_vivos = acimaEsperado; R.excesso_sobre_esperado = Math.round(votAcimaEsp);
  R.concentracao = { municipios_testados: testados.length, limiar_bonferroni: bonf, significativos: linhas.filter((x) => x.pval !== null && x.pval < bonf).length,
    p_abaixo_0_01: testados.filter((p) => p < 0.01).length, esperado_ao_acaso_0_01: r4(testados.length * 0.01) };
  const ord = [...linhas].sort((x, y) => (y.c100 - y.p96) - (x.c100 - x.p96));
  R.top_acima_coorte = ord.filter((x) => x.c100 > x.p96).slice(0, 30).map((x) => ({ uf: x.uf, mun: x.m, nome: x.nome, aptos_100: x.a100, votantes_100: x.c100, taxa_100: r4(x.c100 / x.a100), coorte_96_2022: x.p96, centenarios_2022: x.p100, esperados_vivos_2026: r4(x.esperado) }));
  R.top_concentracao = linhas.filter((x) => x.pval !== null && x.pval < bonf).sort((x, y) => x.pval - y.pval).slice(0, 30)
    .map((x) => ({ uf: x.uf, mun: x.m, nome: x.nome, aptos_100: x.a100, votantes_100: x.c100, taxa_100: r4(x.c100 / x.a100), taxa_uf: x.pUf, p: Number(x.pval.toPrecision(3)), taxa_90_99_mun: r4(x.c90 / Math.max(1, x.a90)), taxa_total_mun: r4(x.cT / x.aT) }));
  await writeFile(path.join(OUT, `oficial-municipios-100-${t}t.tsv`), tsv([['uf', 'municipio', 'nome', 'aptos_100', 'votantes_100', 'taxa_100', 'taxa_100_uf', 'p_binomial', 'coorte_96_2022', 'centenarios_2022', 'esperados_vivos_2026', 'aptos_90_99', 'votantes_90_99', 'aptos_total', 'votantes_total'],
    ...ord.map((x) => [x.uf, x.m, x.nome, x.a100, x.c100, x.a100 ? r4(x.c100 / x.a100) : '', x.pUf, x.pval === null ? '' : x.pval.toPrecision(3), x.p96, x.p100, r4(x.esperado), x.a90, x.c90, x.aT, x.cT])]));
}
resumo.gerado_em = new Date().toISOString();
await writeFile(path.join(OUT, 'oficial-resumo.json'), JSON.stringify(resumo, null, 2));
console.log(JSON.stringify(resumo, null, 1));
