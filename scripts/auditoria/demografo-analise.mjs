// Demógrafo: frente agregada da H01. Cruza eleitorado (perfil por seção, TSE), comparecimento (detalhe_votacao_secao e BU),
// população (Censo 2022 e estimativas, IBGE), óbitos (Registro Civil/IBGE 2023-2024 e Portal da Transparência do Registro Civil 2026).
// Tudo agregado por seção ou município. Nenhum dado individual.
// Pré-requisitos: demografo-baixar-ibge.mjs, demografo-baixar-registrocivil.mjs, demografo-perfil.mjs, demografo-turnos.mjs.
// Uso: node scripts/auditoria/demografo-analise.mjs
// Saídas: data/parsed/auditoria/demografo/{resumo.json, municipios.tsv, secoes-*.tsv}
import { readFileSync, readdirSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(RAIZ, 'data/parsed/auditoria/demografo');
const IBGE = path.join(RAIZ, 'data/raw/externos/ibge');
const RC = path.join(RAIZ, 'data/raw/externos/registrocivil');
const { db } = await abrirLeitura(); // cópia imutável publicada (não concorre com a carga do primário)

// Datas: cadastro fechado em 07/05/2026 (150 dias antes de 04/10/2026, art. 91 da Lei 9.504/97 [a confirmar no calendário do TSE]).
const DIAS_ATE_1T = 150; // 07/05 → 04/10
const DIAS_ATE_2T = 171; // 07/05 → 25/10
const MIN_GRUPO = 20; // tamanho mínimo de grupo para taxa por seção

const resumo = {};
const r2 = (x) => Math.round(x * 100) / 100;
const r4 = (x) => Math.round(x * 10000) / 10000;
const quantis = (arr, ps = [0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99]) => {
  const s = [...arr].sort((a, b) => a - b);
  return Object.fromEntries([...ps.map((p) => [`p${Math.round(p * 100)}`, r4(s[Math.min(s.length - 1, Math.floor(p * s.length))])]), ['max', r4(s.at(-1))], ['n', s.length]]);
};
function postos(v) {
  const idx = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]);
  const rk = new Array(v.length);
  for (let i = 0; i < idx.length;) {
    let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    for (let k = i; k <= j; k++) rk[idx[k][1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return rk;
}
function pearson(a, b) {
  const n = a.length; const ma = a.reduce((s, x) => s + x, 0) / n; const mb = b.reduce((s, x) => s + x, 0) / n;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  return sab / Math.sqrt(saa * sbb);
}
const spearman = (a, b) => r4(pearson(postos(a), postos(b)));
// Mínimos quadrados com intercepto (equações normais, eliminação de Gauss)
function ols(X, y) {
  const k = X[0].length + 1; const A = Array.from({ length: k }, () => new Array(k + 1).fill(0));
  for (let i = 0; i < y.length; i++) {
    const x = [1, ...X[i]];
    for (let a = 0; a < k; a++) { for (let b = 0; b < k; b++) A[a][b] += x[a] * x[b]; A[a][k] += x[a] * y[i]; }
  }
  for (let c = 0; c < k; c++) {
    let p = c; for (let r = c + 1; r < k; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < k; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let j = c; j <= k; j++) A[r][j] -= f * A[c][j]; }
  }
  const beta = A.map((row, i) => row[k] / row[i]);
  let sse = 0, sst = 0; const my = y.reduce((s, v) => s + v, 0) / y.length;
  for (let i = 0; i < y.length; i++) { const yh = beta[0] + X[i].reduce((s, v, j) => s + v * beta[j + 1], 0); sse += (y[i] - yh) ** 2; sst += (y[i] - my) ** 2; }
  return { beta: beta.map(r4), r2: r4(1 - sse / sst), n: y.length };
}
const tsv = (linhas) => linhas.map((l) => l.join('\t')).join('\n') + '\n';

// ---------- Municípios (TSE → IBGE)
const municipios = new Map(db.prepare('SELECT codigo, uf, nome, codigo_ibge FROM municipio').all().map((m) => [m.codigo, m]));

// ---------- IBGE
function sidra(arquivo, chaveCat) {
  const j = JSON.parse(readFileSync(path.join(IBGE, arquivo), 'utf8')).slice(1);
  const m = new Map();
  for (const l of j) {
    const v = Number(l.V); // '-' e '...' viram NaN → 0
    const o = m.get(l.D1C) ?? {}; o[l[chaveCat]] = Number.isFinite(v) ? v : 0; m.set(l.D1C, o);
  }
  return m;
}
const censo = new Map();
for (const f of ['a', 'b', 'c']) for (const [cod, o] of sidra(`censo2022-9514-idade-${f}.json`, 'D5C')) censo.set(cod, { ...(censo.get(cod) ?? {}), ...o });
const pop = new Map();
for (const [cod, c] of censo) {
  const tot = c['100362'];
  const p12 = tot - c['93070'] - c['93084'] - c['6567'] - c['6568'];
  const p100 = c['6653']; const p95_99 = c['60041']; const p90_94 = c['60040']; const p85_89 = c['49109']; const p80_84 = c['49108'];
  const p70p = c['93097'] + c['93098'] + p80_84 + p85_89 + p90_94 + p95_99 + p100;
  pop.set(cod, {
    tot, p12, p14: p12 - c['6569'] - c['6570'],
    p66: c['93096'] - c['6618'] + p70p, // coorte que tem 70+ em 2026
    p76: c['93098'] - c['6628'] + p80_84 + p85_89 + p90_94 + p95_99 + p100, // 80+ em 2026
    p86: p85_89 - c['6638'] + p90_94 + p95_99 + p100, // 90+ em 2026
    p96: p95_99 - c['6648'] + p100, // 100+ em 2026
    p70p, p90p: p90_94 + p95_99 + p100, p100,
  });
}
const est = sidra('estimativa-6579-2024-2025.json', 'D3C');
const obitos = new Map();
for (const ano of ['2023', '2024']) {
  for (const [cod, o] of sidra(`obitos-2654-${ano}.json`, 'D7C')) {
    const a = obitos.get(cod) ?? { total: 0, adultos: 0, d90p: 0, d100: 0 };
    a.total += o['0'] / 2; a.adultos += (o['5965'] + o['5980']) / 2; a.d90p += (o['106182'] + o['106183'] + o['5996']) / 2; a.d100 += o['5996'] / 2;
    obitos.set(cod, a);
  }
}

// ---------- Registro Civil (janela 07/05–25/10/2026), por nome de cidade; uso por UF
const normal = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
const rcPorUf = {};
const rcMun = new Map();
for (const f of readdirSync(RC)) {
  const uf = f.split('-')[1].toLowerCase();
  for (const c of JSON.parse(readFileSync(path.join(RC, f), 'utf8')).data) {
    rcPorUf[uf] = (rcPorUf[uf] ?? 0) + c.total;
    rcMun.set(`${uf}|${normal(c.name)}`, c.total);
  }
}

// ---------- Perfil do eleitorado por seção (julho/2026)
const perfil = new Map(); // uf|mun|zona|secao → array
let COL;
for (const f of readdirSync(path.join(OUT, 'perfil'))) {
  const linhas = readFileSync(path.join(OUT, 'perfil', f), 'utf8').trimEnd().split('\n');
  COL = linhas[0].split('\t');
  for (const l of linhas.slice(1)) { const c = l.split('\t'); perfil.set(c.slice(0, 4).join('|'), c.slice(4).map(Number)); }
}
const I = Object.fromEntries(COL.slice(4).map((n, i) => [n, i]));
const velhos = (v) => v[I.f70_79] + v[I.f80_89] + v[I.f90_99] + v[I.f100];
const velhos80 = (v) => v[I.f80_89] + v[I.f90_99] + v[I.f100];

// ---------- Votação por seção principal e turno (detalhe_votacao_secao)
const unidades = { 1: new Map(), 2: new Map() };
{
  const linhas = readFileSync(path.join(OUT, 'secao-turnos.tsv'), 'utf8').trimEnd().split('\n').slice(1);
  for (const l of linhas) {
    const [t, uf, mun, zona, secao, aptos, comp, instalada, origem, , membros] = l.split('\t');
    const soma = new Array(COL.length - 4).fill(0); let semPerfil = 0;
    for (const s of membros.split(',')) {
      const v = perfil.get(`${uf}|${mun}|${zona}|${s}`);
      if (!v) { semPerfil++; continue; }
      for (let i = 0; i < soma.length; i++) soma[i] += v[i];
    }
    unidades[t].set(`${uf}|${mun}|${zona}|${secao}`, { uf, mun, zona, secao, aptos: +aptos, comp: +comp, instalada, origem, membros, p: soma, semPerfil });
  }
}

// =====================================================================
// T1. Eleitorado × população adulta por município
// =====================================================================
const porMun = new Map();
for (const [k, v] of perfil) {
  const [uf, mun] = k.split('|'); if (uf === 'zz') continue;
  const m = porMun.get(mun) ?? { uf, mun, p: new Array(v.length).fill(0), aptos: { 1: 0, 2: 0 }, comp: { 1: 0, 2: 0 } };
  for (let i = 0; i < v.length; i++) m.p[i] += v[i];
  porMun.set(mun, m);
}
for (const t of [1, 2]) for (const u of unidades[t].values()) { const m = porMun.get(u.mun); if (m) { m.aptos[t] += u.aptos; m.comp[t] += u.comp; } }

const linhasMun = [['uf', 'municipio_tse', 'municipio_ibge', 'nome', 'eleitores', 'pop12_2022', 'razao_eleitores_pop', 'est2025', 'eleitores_100', 'pop96_2022', 'pop100_2022', 'eleitores_90', 'pop86_2022', 'aptos_2t', 'comp_1t', 'comp_2t', 'abst_2t', 'obitos_adultos_ano', 'obitos_esperados_janela_2t', 'abst2t_sobre_obitos']];
const t1 = { E: 0, P: 0, E18: 0, P14: 0, semIbge: 0 };
const razoes = [];
const pares = { razao: [], comp2: [], mort: [], velhos: [] };
let E100 = 0, P96 = 0, P100 = 0, E90 = 0, P86 = 0, P90 = 0, E70 = 0, P66 = 0, E80 = 0, P76 = 0;
const t3 = { abst: 0, dJan: 0, abaixo1: [], abaixo2: 0, n: 0 };
const munsT2 = [];
for (const m of porMun.values()) {
  const info = municipios.get(m.mun); const cod = info?.codigo_ibge; const p = pop.get(cod);
  if (!p) { t1.semIbge++; continue; }
  const E = m.p[I.total]; const E18 = E - m.p[I.f16_17];
  t1.E += E; t1.P += p.p12; t1.E18 += E18; t1.P14 += p.p14;
  const razao = E / p.p12; razoes.push(razao);
  E100 += m.p[I.f100]; P96 += p.p96; P100 += p.p100;
  E90 += m.p[I.f90_99] + m.p[I.f100]; P86 += p.p86; P90 += p.p90p; E70 += velhos(m.p); P66 += p.p66; E80 += velhos80(m.p); P76 += p.p76;
  const ob = obitos.get(cod) ?? { total: 0, adultos: 0 };
  const abst2 = m.aptos[2] - m.comp[2];
  // óbitos de residentes adultos na janela, ajustados pela razão eleitores/adultos (≤ 1) — estimativa de eleitores mortos ainda no caderno
  const dJan = ob.adultos * (DIAS_ATE_2T / 365) * Math.min(1, razao);
  if (m.aptos[2] > 0) {
    t3.n++; t3.abst += abst2; t3.dJan += dJan;
    if (dJan > 0 && abst2 < dJan) t3.abaixo1.push(m.mun);
    if (dJan > 0 && abst2 < 2 * dJan) t3.abaixo2++;
    pares.razao.push(razao); pares.comp2.push(m.comp[2] / m.aptos[2]); pares.mort.push(ob.adultos / p.p12); pares.velhos.push(velhos(m.p) / E);
  }
  munsT2.push({ m, info, p, razao, ob, abst2, dJan });
  linhasMun.push([m.uf, m.mun, cod, info.nome, E, p.p12, r4(razao), est.get(cod)?.['2025'] ?? '', m.p[I.f100], p.p96, p.p100, m.p[I.f90_99] + m.p[I.f100], p.p86,
    m.aptos[2], m.comp[1], m.comp[2], abst2, r2(ob.adultos), r2(dJan), dJan > 0 ? r4(abst2 / dJan) : '']);
}
const razaoBR = t1.E / t1.P;
resumo.t1_eleitorado_x_populacao = {
  municipios: razoes.length, sem_ibge: t1.semIbge,
  eleitores_16mais: t1.E, pop_12mais_censo2022: t1.P, razao_nacional: r4(razaoBR),
  eleitores_18mais: t1.E18, pop_14mais_censo2022: t1.P14, razao18_nacional: r4(t1.E18 / t1.P14),
  quantis_razao: quantis(razoes),
  municipios_razao_acima: Object.fromEntries([1, 1.1, 1.25, 1.5, 2].map((x) => [x, razoes.filter((r) => r > x).length])),
  eleitores_excedentes_onde_razao_acima_1: munsT2.filter((x) => x.razao > 1).reduce((s, x) => s + x.m.p[I.total] - x.p.p12, 0),
  top: munsT2.sort((a, b) => b.razao - a.razao).slice(0, 25).map((x) => ({ uf: x.m.uf, mun: x.m.mun, nome: x.info.nome, eleitores: x.m.p[I.total], pop12_2022: x.p.p12, est2025: est.get(x.info.codigo_ibge)?.['2025'], razao: r2(x.razao) })),
};

// =====================================================================
// T2. Muito idosos: cadastro × população (coorte)
// =====================================================================
const t2mun = munsT2.filter((x) => x.m.p[I.f100] > x.p.p96);
resumo.t2_muito_idosos = {
  eleitores_70mais: E70, pop_66mais_2022: P66, razao_70: r4(E70 / P66),
  eleitores_80mais: E80, pop_76mais_2022: P76, razao_80: r4(E80 / P76),
  eleitores_90mais: E90, pop_86mais_2022: P86, razao_90: r4(E90 / P86), pop_90mais_2022: P90,
  eleitores_100mais: E100, pop_96mais_2022: P96, razao_100: r4(E100 / P96), pop_100mais_2022: P100,
  municipios_com_mais_eleitores_100_que_pop96_2022: t2mun.length,
  eleitores_100_nesses_municipios: t2mun.reduce((s, x) => s + x.m.p[I.f100], 0),
  pop96_nesses_municipios: t2mun.reduce((s, x) => s + x.p.p96, 0),
  sem_biometria_por_faixa: Object.fromEntries(['f16_17', 'f18_69', 'f70_79', 'f80_89', 'f90_99', 'f100'].map((f) => {
    let t = 0, s = 0; for (const x of munsT2) { t += x.m.p[I[f]]; s += x.m.p[I[`sembio_${f}`]]; } return [f, { eleitores: t, sem_biometria: s, pct: r2(100 * s / t) }];
  })),
  top_100mais: munsT2.filter((x) => x.m.p[I.f100] >= 10).sort((a, b) => b.m.p[I.f100] / Math.max(1, b.p.p96) - a.m.p[I.f100] / Math.max(1, a.p.p96)).slice(0, 25)
    .map((x) => ({ uf: x.m.uf, mun: x.m.mun, nome: x.info.nome, eleitores_100: x.m.p[I.f100], sem_bio_100: x.m.p[I.sembio_f100], pop96_2022: x.p.p96, pop100_2022: x.p.p100, obitos100_ano: r2(x.ob.d100 ?? 0) })),
};

// Comparecimento dos idosos: limite inferior ecológico por seção (todos os não idosos votaram)
function limites(t) {
  const lin = [];
  const dec = Array.from({ length: 10 }, () => ({ aptos: 0, comp: 0, n: 0 }));
  const out = { unidades: 0, lb70_acima_50: 0, lb70_acima_80: 0, lb80_acima_50: 0, lb80_acima_80: 0, grupo70_min: MIN_GRUPO };
  for (const u of unidades[t].values()) {
    if (u.uf === 'zz' || u.aptos === 0 || u.instalada !== 'Sim') continue;
    const tot = u.p[I.total]; if (!tot) continue;
    const o70 = velhos(u.p); const o80 = velhos80(u.p);
    const sh = o70 / tot; const d = Math.min(9, Math.floor(sh / 0.05));
    dec[d].aptos += u.aptos; dec[d].comp += u.comp; dec[d].n++;
    out.unidades++;
    const lb70 = o70 >= MIN_GRUPO ? Math.max(0, u.comp - (u.aptos - o70)) / o70 : null;
    const lb80 = o80 >= MIN_GRUPO ? Math.max(0, u.comp - (u.aptos - o80)) / o80 : null;
    if (lb70 > 0.5) out.lb70_acima_50++; if (lb70 > 0.8) out.lb70_acima_80++;
    if (lb80 > 0.5) out.lb80_acima_50++; if (lb80 > 0.8) out.lb80_acima_80++;
    if (lb70 > 0.5 || lb80 > 0.5) lin.push([u.uf, u.mun, u.zona, u.secao, u.membros, u.aptos, u.comp, tot, o70, o80, r4(u.comp / u.aptos), r4(lb70 ?? 0), r4(lb80 ?? 0)]);
  }
  out.comparecimento_por_parcela_70mais = dec.map((x, i) => ({ faixa: `${i * 5}-${i * 5 + 5}%${i === 9 ? '+' : ''}`, unidades: x.n, comparecimento: x.aptos ? r4(x.comp / x.aptos) : null }));
  lin.sort((a, b) => b[12] - a[12] || b[11] - a[11]);
  return { out, lin };
}
const lim = { 1: limites(1), 2: limites(2) };
resumo.t2_comparecimento_idosos = { turno1: lim[1].out, turno2: lim[2].out };

// Sobrevivência esperada da coorte (mortalidade anual por idade, IBGE 2023-2024 ÷ Censo 2022) e eleitores muito idosos além do possível
{
  let d90 = 0, d100 = 0, p90 = 0, p100 = 0;
  for (const [cod, o] of obitos) { const p = pop.get(cod); if (!p) continue; d90 += o.d90p; d100 += o.d100; p90 += p.p90p; p100 += p.p100; }
  const q90 = d90 / p90, q100 = d100 / p100;
  // coorte 96+ em 2022 → 100+ em 2026: 4 anos com a mortalidade do grupo 90+ (otimista: a mortalidade aos 96-100 é maior)
  const sobrev100 = (1 - q90) ** 4;
  const esperado100 = P96 * sobrev100;
  Object.assign(resumo.t2_muito_idosos, {
    mortalidade_anual_90mais: r4(q90), mortalidade_anual_100mais: r4(q100), obitos_anuais_90mais: Math.round(d90), obitos_anuais_100mais: Math.round(d100),
    residentes_100mais_esperados_2026: Math.round(esperado100), eleitores_100mais_alem_do_esperado: Math.round(E100 - esperado100),
  });
}

// Composição etária × comparecimento por seção, com efeito fixo de município (desvio da média do município).
// Se os títulos de 100+ (e 90+ sem biometria) fossem de pessoas mortas e nunca usados, o coeficiente deles seria ≈ −(comparecimento dos 18-69).
function composicao(t) {
  const grupos = new Map();
  for (const u of unidades[t].values()) {
    if (u.uf === 'zz' || !u.aptos || u.instalada !== 'Sim' || u.semPerfil) continue;
    const tot = u.p[I.total]; if (tot < 50) continue;
    const x = [u.p[I.f16_17] / tot, u.p[I.f70_79] / tot, u.p[I.f80_89] / tot,
      (u.p[I.f90_99] - u.p[I.sembio_f90_99]) / tot, u.p[I.sembio_f90_99] / tot, u.p[I.f100] / tot, u.p[I.sembio_f18_69] / tot];
    const g = grupos.get(u.mun) ?? []; g.push({ x, y: u.comp / u.aptos, u }); grupos.set(u.mun, g);
  }
  const X = [], y = [];
  for (const g of grupos.values()) {
    if (g.length < 2) continue;
    const mx = g[0].x.map((_, j) => g.reduce((s, r) => s + r.x[j], 0) / g.length); const my = g.reduce((s, r) => s + r.y, 0) / g.length;
    for (const r of g) { X.push(r.x.map((v, j) => v - mx[j])); y.push(r.y - my); }
  }
  const reg = ols(X, y);
  // limites por seção: algum eleitor 100+ (ou 90+) precisou votar?
  let lb100 = 0, lb100Sec = 0, lb90 = 0;
  for (const u of unidades[t].values()) {
    if (u.uf === 'zz' || !u.aptos || u.instalada !== 'Sim') continue;
    const e100 = u.p[I.f100], e90 = u.p[I.f90_99] + e100;
    if (e100 >= 5) { lb100Sec++; if (u.comp > u.aptos - e100) lb100++; }
    if (e90 >= 10 && u.comp > u.aptos - e90) lb90++;
  }
  return { variaveis: ['intercepto', 'p16_17', 'p70_79', 'p80_89', 'p90_99_com_bio', 'p90_99_sem_bio', 'p100', 'p18_69_sem_bio'], ...reg,
    secoes_com_5mais_eleitores_100: lb100Sec, dessas_algum_100mais_teve_que_votar: lb100, secoes_10mais_90mais_algum_teve_que_votar: lb90 };
}
resumo.t2_composicao_comparecimento = { turno1: composicao(1), turno2: composicao(2) };

// =====================================================================
// T2b/H01 técnico. Comparecimento do grupo SEM biometria cadastrada (BU) × aptos sem biometria (perfil)
// O eleitor sem biometria é habilitado só com o ano de nascimento: é o caminho de um título de falecido.
// =====================================================================
function semBio(t) {
  const elei = t === 1 ? 6257 : 6258;
  const q = db.prepare(`SELECT s.uf, s.municipio, s.zona, s.secao, s.comparecimento, s.sem_biometria, s.por_biografia, s.por_biometria, e.aptos, e.aptos_tte
    FROM secao s JOIN secao_eleicao e USING (turno, uf, municipio, zona, secao) WHERE s.turno = ? AND e.eleicao = ? AND s.situacao = 'completa' AND s.sem_biometria IS NOT NULL
      AND s.uf IN (SELECT uf FROM carga WHERE carga.turno = s.turno)`); // 1º turno: só UFs com carga concluída
  const out = { secoes: 0, ufs: new Set(), comp_sem_bio: 0, aptos_sem_bio: 0, comp_com_bio: 0, aptos_com_bio: 0, acima_100pct: 0, acima_100pct_sem_tte: 0, acima_90pct: 0, sem_perfil: 0 };
  const lin = []; const taxas = []; const porSecao = new Map();
  const xs = [], ys = [];
  for (const s of q.iterate(t, elei)) {
    const u = unidades[t].get(`${s.uf}|${s.municipio}|${s.zona}|${s.secao}`);
    if (!u || u.semPerfil || s.uf === 'zz') { out.sem_perfil++; continue; }
    const aSem = u.p[I.total] - u.p[I.biometria]; const aCom = u.p[I.biometria];
    out.secoes++; out.ufs.add(s.uf);
    out.comp_sem_bio += s.sem_biometria; out.aptos_sem_bio += aSem;
    out.comp_com_bio += s.comparecimento - s.sem_biometria; out.aptos_com_bio += aCom;
    const tte = s.aptos_tte ?? 0;
    if (s.sem_biometria > aSem + tte) out.acima_100pct++;
    if (s.sem_biometria > aSem && tte === 0) out.acima_100pct_sem_tte++;
    porSecao.set(`${s.uf}|${s.municipio}|${s.zona}|${s.secao}`, { comp: s.sem_biometria, aptos: aSem, compCom: s.comparecimento - s.sem_biometria, aptosCom: aCom });
    if (aSem >= MIN_GRUPO) {
      const tx = s.sem_biometria / aSem; taxas.push(tx); if (tx > 0.9) out.acima_90pct++;
      const semBioVelhos = u.p[I.sembio_f70_79] + u.p[I.sembio_f80_89] + u.p[I.sembio_f90_99] + u.p[I.sembio_f100];
      xs.push([semBioVelhos / aSem]); ys.push(tx);
      if (tx > 0.9) lin.push([s.uf, s.municipio, s.zona, s.secao, u.membros, s.aptos, tte, s.comparecimento, aSem, semBioVelhos, s.sem_biometria, s.por_biografia, r4(tx), r4((s.comparecimento - s.sem_biometria) / Math.max(1, aCom))]);
    } else if (s.sem_biometria > aSem + tte) {
      lin.push([s.uf, s.municipio, s.zona, s.secao, u.membros, s.aptos, tte, s.comparecimento, aSem, '', s.sem_biometria, s.por_biografia, aSem ? r4(s.sem_biometria / aSem) : 'inf', r4((s.comparecimento - s.sem_biometria) / Math.max(1, aCom))]);
    }
  }
  out.ufs = [...out.ufs].sort().join(' ');
  out.taxa_sem_bio = r4(out.comp_sem_bio / out.aptos_sem_bio);
  out.taxa_com_bio = r4(out.comp_com_bio / out.aptos_com_bio);
  out.quantis_taxa_sem_bio_secao = quantis(taxas);
  out.regressao_taxa_sem_bio_por_parcela_70mais_no_grupo = ols(xs, ys);
  lin.sort((a, b) => (b[12] === 'inf' ? 99 : b[12]) - (a[12] === 'inf' ? 99 : a[12]));
  return { out, lin, porSecao };
}
const sb = { 1: semBio(1), 2: semBio(2) };
resumo.h01_sem_biometria = { turno1: sb[1].out, turno2: sb[2].out };

// =====================================================================
// T3. Comparecimento × mortalidade por município
// =====================================================================
const rcUf = Object.entries(rcPorUf).map(([uf, n]) => {
  let ibge24 = 0; for (const [cod, o] of obitos) if (cod.startsWith(ufIbge(uf))) ibge24 += o.total;
  return { uf, registro_civil_janela_2026: n, ibge_media_2023_2024_prorata: Math.round(ibge24 * DIAS_ATE_2T / 365), razao: r4(n / (ibge24 * DIAS_ATE_2T / 365)) };
});
function ufIbge(uf) { return ({ ro: '11', ac: '12', am: '13', rr: '14', pa: '15', ap: '16', to: '17', ma: '21', pi: '22', ce: '23', rn: '24', pb: '25', pe: '26', al: '27', se: '28', ba: '29', mg: '31', es: '32', rj: '33', sp: '35', pr: '41', sc: '42', rs: '43', ms: '50', mt: '51', go: '52', df: '53' })[uf]; }
const naoCasados = [...municipios.values()].filter((m) => m.uf !== 'zz' && !rcMun.has(`${m.uf}|${normal(m.nome)}`)).length;
resumo.t3_mortalidade = {
  municipios: t3.n, abstencao_2t: t3.abst, obitos_esperados_no_caderno_janela_2t: Math.round(t3.dJan), razao_nacional: r4(t3.abst / t3.dJan),
  municipios_abst_menor_que_obitos: t3.abaixo1.length, municipios_abst_menor_que_2x_obitos: t3.abaixo2,
  lista_abst_menor_que_obitos: munsT2.filter((x) => t3.abaixo1.includes(x.m.mun)).map((x) => ({ uf: x.m.uf, mun: x.m.mun, nome: x.info.nome, aptos: x.m.aptos[2], abst_2t: x.abst2, obitos_esperados: r2(x.dJan) })),
  spearman_comparecimento2t_x_mortalidade_adulta: spearman(pares.comp2, pares.mort),
  spearman_comparecimento2t_x_parcela_70mais: spearman(pares.comp2, pares.velhos),
  spearman_mortalidade_x_parcela_70mais: spearman(pares.mort, pares.velhos),
  regressao_comparecimento2t: { variaveis: ['intercepto', 'mortalidade_adulta_anual', 'parcela_70mais', 'razao_eleitores_pop'], ...ols(pares.mort.map((m, i) => [m, pares.velhos[i], pares.razao[i]]), pares.comp2) },
  registro_civil_x_ibge_por_uf: rcUf, registro_civil_municipios_sem_par_por_nome: naoCasados,
};
// resíduo: municípios com comparecimento muito acima do previsto pela mortalidade e idade
{
  const reg = resumo.t3_mortalidade.regressao_comparecimento2t.beta;
  const res = munsT2.filter((x) => x.m.aptos[2] > 0).map((x) => {
    const prev = reg[0] + reg[1] * (x.ob.adultos / x.p.p12) + reg[2] * (velhos(x.m.p) / x.m.p[I.total]) + reg[3] * x.razao;
    return { uf: x.m.uf, mun: x.m.mun, nome: x.info.nome, aptos: x.m.aptos[2], comp2t: r4(x.m.comp[2] / x.m.aptos[2]), previsto: r4(prev), residuo: r4(x.m.comp[2] / x.m.aptos[2] - prev), razao_eleitores_pop: r2(x.razao) };
  });
  const rs = res.map((x) => x.residuo); const sd = Math.sqrt(rs.reduce((s, v) => s + v * v, 0) / rs.length);
  resumo.t3_mortalidade.residuo_dp = r4(sd);
  resumo.t3_mortalidade.residuo_acima_3dp = res.filter((x) => x.residuo > 3 * sd).sort((a, b) => b.residuo - a.residuo).slice(0, 30);
}

// =====================================================================
// T4. Variação entre turnos (mesma seção, mesma composição)
// =====================================================================
{
  const dec = Array.from({ length: 10 }, () => ({ a1: 0, c1: 0, a2: 0, c2: 0, n: 0 }));
  const X = [], y = []; const lin = []; let pares2 = 0, mudouComp = 0;
  const deltas = [];
  for (const [k, u2] of unidades[2]) {
    const u1 = unidades[1].get(k);
    if (!u1 || u2.uf === 'zz' || !u1.aptos || !u2.aptos || u1.instalada !== 'Sim' || u2.instalada !== 'Sim') continue;
    if (u1.membros !== u2.membros) { mudouComp++; continue; }
    const tot = u2.p[I.total]; if (!tot) continue;
    pares2++;
    const t1 = u1.comp / u1.aptos, t2 = u2.comp / u2.aptos, dlt = t2 - t1; deltas.push(dlt);
    const sh70 = velhos(u2.p) / tot, sh1617 = u2.p[I.f16_17] / tot, shSem = (tot - u2.p[I.biometria]) / tot;
    const d = Math.min(9, Math.floor(sh70 / 0.05)); dec[d].a1 += u1.aptos; dec[d].c1 += u1.comp; dec[d].a2 += u2.aptos; dec[d].c2 += u2.comp; dec[d].n++;
    X.push([sh70, sh1617, shSem]); y.push(dlt);
    // limite inferior do comparecimento 80+ nos dois turnos
    const o80 = velhos80(u2.p);
    const lb1 = o80 >= MIN_GRUPO ? Math.max(0, u1.comp - (u1.aptos - o80)) / o80 : null;
    const lb2 = o80 >= MIN_GRUPO ? Math.max(0, u2.comp - (u2.aptos - o80)) / o80 : null;
    lin.push({ k, u1, u2, t1, t2, dlt, sh70, sh1617, shSem, lb1, lb2 });
  }
  const reg = ols(X, y);
  const resid = lin.map((x, i) => y[i] - (reg.beta[0] + reg.beta[1] * X[i][0] + reg.beta[2] * X[i][1] + reg.beta[3] * X[i][2]));
  const sd = Math.sqrt(resid.reduce((s, v) => s + v * v, 0) / resid.length);
  lin.forEach((x, i) => { x.res = resid[i]; });
  const sb1 = sb[1].porSecao, sb2 = sb[2].porSecao;
  let semBioPares = 0, semBioA = 0, semBioC1 = 0, semBioC2 = 0, comBioA = 0, comBioC1 = 0, comBioC2 = 0; const semBioDelta = [];
  for (const [k, s2] of sb2) { const s1 = sb1.get(k); const u1 = unidades[1].get(k), u2 = unidades[2].get(k); if (!s1 || !u1 || u1.membros !== u2.membros) continue; semBioPares++; semBioA += s2.aptos; semBioC1 += s1.comp; semBioC2 += s2.comp; comBioA += s2.aptosCom; comBioC1 += s1.compCom; comBioC2 += s2.compCom; if (s2.aptos >= MIN_GRUPO) semBioDelta.push({ k, a: s2.aptos, c1: s1.comp, c2: s2.comp, d: (s2.comp - s1.comp) / s2.aptos }); }
  const sdSem = Math.sqrt(semBioDelta.reduce((s, v) => s + v.d * v.d, 0) / semBioDelta.length);
  resumo.t4_entre_turnos = {
    secoes_pareadas: pares2, composicao_mudou: mudouComp, quantis_delta_comparecimento: quantis(deltas),
    delta_por_parcela_70mais: dec.map((x, i) => ({ faixa: `${i * 5}-${i * 5 + 5}%${i === 9 ? '+' : ''}`, secoes: x.n, comp_1t: x.a1 ? r4(x.c1 / x.a1) : null, comp_2t: x.a2 ? r4(x.c2 / x.a2) : null })),
    regressao_delta: { variaveis: ['intercepto', 'parcela_70mais', 'parcela_16_17', 'parcela_sem_biometria'], ...reg }, residuo_dp: r4(sd),
    residuo_acima_4dp: lin.filter((x) => x.res > 4 * sd).length, residuo_abaixo_4dp: lin.filter((x) => x.res < -4 * sd).length,
    lb80_subiu_de_menos_50_para_mais_80: lin.filter((x) => x.lb1 !== null && x.lb1 < 0.5 && x.lb2 > 0.8).length,
    sem_biometria: { secoes_pareadas: semBioPares, aptos_sem_bio: semBioA, comp_1t: semBioC1, comp_2t: semBioC2, taxa_1t: r4(semBioC1 / semBioA), taxa_2t: r4(semBioC2 / semBioA), com_bio_taxa_1t: r4(comBioC1 / comBioA), com_bio_taxa_2t: r4(comBioC2 / comBioA),
      quantis_delta: quantis(semBioDelta.map((x) => x.d)), dp_delta: r4(sdSem), subiu_mais_de_30pp: semBioDelta.filter((x) => x.d > 0.3).length },
  };
  const top = lin.filter((x) => x.res > 4 * sd).sort((a, b) => b.res - a.res);
  await mkdir(OUT, { recursive: true });
  await writeFile(path.join(OUT, 'secoes-variacao-turnos.tsv'), tsv([['uf', 'municipio', 'zona', 'secao', 'membros', 'aptos_1t', 'comp_1t', 'aptos_2t', 'comp_2t', 'delta', 'residuo', 'parcela_70mais', 'parcela_16_17', 'parcela_sem_bio', 'lb80_1t', 'lb80_2t'],
    ...top.map((x) => [x.u2.uf, x.u2.mun, x.u2.zona, x.u2.secao, x.u2.membros, x.u1.aptos, x.u1.comp, x.u2.aptos, x.u2.comp, r4(x.dlt), r4(x.res), r4(x.sh70), r4(x.sh1617), r4(x.shSem), x.lb1 === null ? '' : r4(x.lb1), x.lb2 === null ? '' : r4(x.lb2)])]));
  resumo.t4_entre_turnos.top_residuo = top.slice(0, 20).map((x) => ({ secao: x.k, aptos: x.u2.aptos, comp_1t: x.u1.comp, comp_2t: x.u2.comp, delta: r4(x.dlt), parcela_70mais: r4(x.sh70), parcela_sem_bio: r4(x.shSem) }));
  resumo.t4_entre_turnos.sem_biometria.top_subida = semBioDelta.sort((a, b) => b.d - a.d).slice(0, 20).map((x) => ({ secao: x.k, aptos_sem_bio: x.a, comp_sem_bio_1t: x.c1, comp_sem_bio_2t: x.c2, delta: r4(x.d) }));
}

await writeFile(path.join(OUT, 'municipios.tsv'), tsv(linhasMun));
for (const t of [1, 2]) {
  await writeFile(path.join(OUT, `secoes-idosos-${t}t.tsv`), tsv([['uf', 'municipio', 'zona', 'secao', 'membros', 'aptos', 'comparecimento', 'eleitores_perfil', 'eleitores_70mais', 'eleitores_80mais', 'taxa_comparecimento', 'lb_comparecimento_70mais', 'lb_comparecimento_80mais'], ...lim[t].lin]));
  await writeFile(path.join(OUT, `secoes-sem-biometria-${t}t.tsv`), tsv([['uf', 'municipio', 'zona', 'secao', 'membros', 'aptos', 'aptos_tte', 'comparecimento', 'aptos_sem_bio_perfil', 'sem_bio_70mais_perfil', 'comp_sem_bio_bu', 'por_biografia_bu', 'taxa_sem_bio', 'taxa_com_bio'], ...sb[t].lin]));
}
resumo.gerado_em = new Date().toISOString();
await writeFile(path.join(OUT, 'resumo.json'), JSON.stringify(resumo, null, 2));
console.log(JSON.stringify(resumo, null, 1));
