// Cético: achado "eleitorado acima da população" (docs/analysis/demografo/02). Lente: explicações alternativas e poder do teste.
// Somente leitura. Entradas: municipios.tsv e perfil/ do demógrafo, Censo 2022 bruto (SIDRA 9514), banco (2º turno, BU por seção).
// Uso: node scripts/auditoria/cetico-eleitorado-acima-populacao-alternativas.mjs
// Saída: data/parsed/auditoria/cetico/eleitorado-acima-populacao-alternativas.json (+ .tsv por município)
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const DEM = path.join(RAIZ, 'data/parsed/auditoria/demografo');
const OUT = path.join(RAIZ, 'data/parsed/auditoria/cetico');
const IBGE = path.join(RAIZ, 'data/raw/externos/ibge');
mkdirSync(OUT, { recursive: true });
const db = new DatabaseSync(path.join(RAIZ, 'data/db/eleicao2026.sqlite'), { readOnly: true });
const r4 = (x) => Math.round(x * 10000) / 10000;
const res = {};

// ---------- 1. Reprodução independente: Censo bruto e perfil bruto
const censo = new Map();
for (const f of ['a', 'b', 'c']) {
  for (const l of JSON.parse(readFileSync(path.join(IBGE, `censo2022-9514-idade-${f}.json`), 'utf8')).slice(1)) {
    const o = censo.get(l.D1C) ?? {}; const v = Number(l.V); o[l.D5C] = Number.isFinite(v) ? v : 0; censo.set(l.D1C, o);
  }
}
const est = new Map();
for (const l of JSON.parse(readFileSync(path.join(IBGE, 'estimativa-6579-2024-2025.json'), 'utf8')).slice(1)) {
  const o = est.get(l.D1C) ?? {}; o[l.D3C] = Number(l.V); est.set(l.D1C, o);
}
const perfilMun = new Map(); let COL;
for (const f of readdirSync(path.join(DEM, 'perfil'))) {
  const ls = readFileSync(path.join(DEM, 'perfil', f), 'utf8').trimEnd().split('\n'); COL = ls[0].split('\t');
  for (const l of ls.slice(1)) {
    const c = l.split('\t'); if (c[0] === 'zz') continue;
    const v = c.slice(4).map(Number); const a = perfilMun.get(c[1]) ?? new Array(v.length).fill(0);
    for (let i = 0; i < v.length; i++) a[i] += v[i]; perfilMun.set(c[1], a);
  }
}
const I = Object.fromEntries(COL.slice(4).map((n, i) => [n, i]));

// BU 2º turno por município (carga completa; 1º turno ignorado por estar parcial)
const bu = new Map(db.prepare(`SELECT municipio, SUM(comparecimento) comp, SUM(por_biometria) bio, SUM(sem_biometria) sembio, SUM(por_biografia) biog
  FROM secao WHERE turno = 2 AND situacao = 'completa' AND uf <> 'zz' GROUP BY municipio`).all().map((r) => [r.municipio, r]));

const lin = readFileSync(path.join(DEM, 'municipios.tsv'), 'utf8').trimEnd().split('\n');
const H = lin[0].split('\t');
const M = lin.slice(1).map((l) => Object.fromEntries(l.split('\t').map((v, i) => [H[i], v]))).map((m) => {
  const c = censo.get(m.municipio_ibge); const p = perfilMun.get(m.municipio_tse); const b = bu.get(m.municipio_tse);
  const tot22 = c['100362']; const p12 = tot22 - c['93070'] - c['93084'] - c['6567'] - c['6568'];
  const p14 = p12 - c['6569'] - c['6570'];
  const p80p = c['49108'] + c['49109'] + c['60040'] + c['60041'] + c['6653'];
  const p66 = c['93096'] - c['6618'] + c['93097'] + c['93098'] + p80p; // 66+ em 2022 = 70+ em 2026
  const E = p[I.total]; const E70 = p[I.f70_79] + p[I.f80_89] + p[I.f90_99] + p[I.f100];
  return {
    uf: m.uf, mun: m.municipio_tse, ibge: m.municipio_ibge, nome: m.nome, E, Eautor: +m.eleitores, p12, p12autor: +m.pop12_2022, tot22, p14, p66,
    est25: est.get(m.municipio_ibge)?.['2025'] ?? NaN, aptos2: +m.aptos_2t, comp2: +m.comp_2t, mortAd: +m.obitos_adultos_ano,
    E70, E18_69: E - p[I.f16_17] - E70, bioCad: p[I.biometria],
    buComp: b?.comp ?? 0, buBio: b?.bio ?? 0, buSemBio: b?.sembio ?? 0, buBiog: b?.biog ?? 0,
    R: E / p12,
  };
});
res.reproducao = {
  municipios: M.length,
  eleitores_iguais_ao_autor: M.filter((x) => x.E === x.Eautor).length,
  pop12_igual_ao_autor: M.filter((x) => x.p12 === x.p12autor).length,
  R_nacional: r4(M.reduce((s, x) => s + x.E, 0) / M.reduce((s, x) => s + x.p12, 0)),
  R_acima_1: M.filter((x) => x.R > 1).length,
  excesso_onde_R_acima_1: M.filter((x) => x.R > 1).reduce((s, x) => s + x.E - x.p12, 0),
  R_acima: Object.fromEntries([1.25, 1.5, 2].map((t) => [t, M.filter((x) => x.R > t).length])),
  bu2t_comp_igual_detalhe_votacao: M.filter((x) => x.buComp === x.comp2).length,
};

// ---------- 2. Alternativa benigna: crescimento pós-2022 e subenumeração do Censo (denominador 2025)
// p12 em 2025 ≈ est2025 × (p12/total em 2022). Hipótese generosa: crescimento igual em todas as idades.
for (const x of M) { x.p12_25 = x.est25 * x.p12 / x.tot22; x.R25 = x.E / x.p12_25; }
const ok25 = M.filter((x) => Number.isFinite(x.R25));
res.alt_crescimento_e_subenumeracao = {
  nota: 'denominador = estimativa IBGE 2025 (total) × fração 12+ do Censo 2022. A estimativa 2024/2025 já incorpora a correção de cobertura do Censo.',
  crescimento_pop_total_2022_2025: r4(ok25.reduce((s, x) => s + x.est25, 0) / ok25.reduce((s, x) => s + x.tot22, 0) - 1),
  R25_nacional: r4(ok25.reduce((s, x) => s + x.E, 0) / ok25.reduce((s, x) => s + x.p12_25, 0)),
  R25_acima_1: ok25.filter((x) => x.R25 > 1).length,
  R25_acima_1_25: ok25.filter((x) => x.R25 > 1.25).length,
  R25_acima_1_5: ok25.filter((x) => x.R25 > 1.5).length,
  excesso_R25_acima_1: Math.round(ok25.filter((x) => x.R25 > 1).reduce((s, x) => s + x.E - x.p12_25, 0)),
  eleitores_maior_que_pop_total_todas_idades_2025: ok25.filter((x) => x.E > x.est25).length,
  eleitores_maior_que_pop_total_todas_idades_2022: M.filter((x) => x.E > x.tot22).length,
};

// ---------- 3. Alternativa testável: os títulos excedentes ficaram parados (abstenção) ou votaram?
// (a) Fato bruto: votantes do 2º turno acima dos residentes.
res.uso_do_excesso = {
  comparecimento2t_maior_que_pop12_2022: M.filter((x) => x.comp2 > x.p12).length,
  comparecimento2t_maior_que_pop12_2025: ok25.filter((x) => x.comp2 > x.p12_25).length,
  comparecimento2t_maior_que_pop_total_2025: ok25.filter((x) => x.comp2 > x.est25).length,
  votantes_acima_pop12_2025_somados: Math.round(ok25.filter((x) => x.comp2 > x.p12_25).reduce((s, x) => s + x.comp2 - x.p12_25, 0)),
};
// (b) Comparecimento implícito dos títulos excedentes. Residentes votam à taxa c_res da UF (municípios com 0,85 ≤ R ≤ 1).
const cres = {};
for (const x of M) if (x.R >= 0.85 && x.R <= 1 && x.aptos2) { const o = cres[x.uf] ?? { a: 0, c: 0 }; o.a += x.aptos2; o.c += x.comp2; cres[x.uf] = o; }
const cUF = (uf) => cres[uf] ? cres[uf].c / cres[uf].a : NaN;
function implicito(filtro, R0, den = 'p12') {
  let ex = 0, compEx = 0, n = 0, compTot = 0, aptos = 0;
  for (const x of M.filter(filtro)) {
    const residentes = Math.min(x.aptos2, R0 * x[den]); const exc = x.aptos2 - residentes; if (exc <= 0 || !Number.isFinite(cUF(x.uf))) continue;
    n++; ex += exc; compEx += x.comp2 - cUF(x.uf) * residentes; compTot += x.comp2; aptos += x.aptos2;
  }
  return { municipios: n, titulos_excedentes: Math.round(ex), comparecimento_total: r4(compTot / aptos), comparecimento_implicito_do_excesso: r4(compEx / ex) };
}
res.uso_do_excesso.c_res_por_uf = Object.fromEntries(Object.entries(cres).map(([u, o]) => [u, r4(o.c / o.a)]));
res.uso_do_excesso.comparecimento_implicito = {
  explicacao: 'R0 = fração dos residentes 12+ que tem título. R0=1 é o cenário mais generoso para "excesso = não residente que falta" (excesso mínimo).',
  R_acima_1_R0_1: implicito((x) => x.R > 1, 1),
  R_acima_1_25_R0_1: implicito((x) => x.R > 1.25, 1),
  R_acima_1_5_R0_1: implicito((x) => x.R > 1.5, 1),
  R_acima_1_5_R0_0_92: implicito((x) => x.R > 1.5, 0.92),
  R25_acima_1_25_R0_1_den2025: implicito((x) => x.R25 > 1.25, 1, 'p12_25'),
};
// (c) Comparecimento por faixa de R, ajustado por UF (diferença para a média da UF)
const ufMed = {};
for (const x of M) { const o = ufMed[x.uf] ?? { a: 0, c: 0, cb: 0, ec: 0, eb: 0 }; o.a += x.aptos2; o.c += x.comp2; o.cb += x.buBio; o.ec += x.E; o.eb += x.bioCad; ufMed[x.uf] = o; }
const faixas = [[0, 0.85], [0.85, 1], [1, 1.1], [1.1, 1.25], [1.25, 1.5], [1.5, 2], [2, 9]];
res.por_faixa_R = faixas.map(([a, b]) => {
  const g = M.filter((x) => x.R >= a && x.R < b && x.aptos2);
  const s = (f) => g.reduce((t, x) => t + f(x), 0);
  const u = (k1, k2, x) => ufMed[x.uf][k1] / ufMed[x.uf][k2];
  return {
    faixa: `${a}-${b}`, municipios: g.length,
    comparecimento: r4(s((x) => x.comp2) / s((x) => x.aptos2)),
    comparecimento_menos_uf: r4(s((x) => x.comp2 - x.aptos2 * u('c', 'a', x)) / s((x) => x.aptos2)),
    pct_votantes_por_biometria: r4(s((x) => x.buBio) / s((x) => x.buComp)),
    biometria_votantes_menos_uf: r4(s((x) => x.buBio - x.buComp * u('cb', 'c', x)) / s((x) => x.buComp)),
    pct_votantes_por_ano_nascimento: r4(s((x) => x.buBiog) / s((x) => x.buComp)),
    pct_cadastro_com_biometria: r4(s((x) => x.bioCad) / s((x) => x.E)),
    cadastro_biometria_menos_uf: r4(s((x) => x.bioCad - x.E * u('eb', 'ec', x)) / s((x) => x.E)),
    R_18_69_sobre_pop14_65: r4(s((x) => x.E18_69) / s((x) => x.p14 - x.p66)),
    R_70mais_sobre_pop66mais: r4(s((x) => x.E70) / s((x) => x.p66)),
    pop_mediana_2022: g.map((x) => x.tot22).sort((p, q) => p - q)[Math.floor(g.length / 2)],
  };
});

// ---------- 4. Poder: a regressão do autor (comparecimento ~ mortalidade + parcela 70+ + R) distingue "excesso falta" de "excesso vota"?
function ols(X, y) {
  const k = X[0].length + 1; const A = Array.from({ length: k }, () => new Array(k + 1).fill(0));
  for (let i = 0; i < y.length; i++) { const x = [1, ...X[i]]; for (let a = 0; a < k; a++) { for (let b = 0; b < k; b++) A[a][b] += x[a] * x[b]; A[a][k] += x[a] * y[i]; } }
  for (let c = 0; c < k; c++) {
    let p = c; for (let r = c + 1; r < k; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < k; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let j = c; j <= k; j++) A[r][j] -= f * A[c][j]; }
  }
  return A.map((row, i) => row[k] / row[i]);
}
const G = M.filter((x) => x.aptos2 > 0);
const Xreg = G.map((x) => [x.mortAd / x.p12, x.E70 / x.E, x.R]);
const yObs = G.map((x) => x.comp2 / x.aptos2);
const betaObs = ols(Xreg, yObs);
// Simulação: residentes votam à taxa da UF + ruído (DP dos municípios 0,85 ≤ R ≤ 1 em torno da UF); excesso vota à taxa cex.
// mulberry32 (Math.imul, 32 bits exatos). O LCG anterior, (seed * 1103515245 + 12345) % 2^31, estourava o double (errata 29/10/2026).
let seed = 20261029; const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
const base = M.filter((x) => x.R >= 0.85 && x.R <= 1 && x.aptos2);
const sdRes = Math.sqrt(base.reduce((s, x) => s + (x.comp2 / x.aptos2 - cUF(x.uf)) ** 2, 0) / base.length);
function simula(cexRel, R0, reps = 20) {
  const bs = [];
  for (let r = 0; r < reps; r++) {
    const y = G.map((x) => {
      const cr = Math.min(1, Math.max(0, cUF(x.uf) + sdRes * gauss()));
      const resid = Math.min(x.aptos2, R0 * x.p12); const exc = x.aptos2 - resid;
      return (cr * resid + cexRel * cr * exc) / x.aptos2;
    });
    bs.push(ols(Xreg, y)[3]);
  }
  const m = bs.reduce((s, v) => s + v, 0) / bs.length; const sd = Math.sqrt(bs.reduce((s, v) => s + (v - m) ** 2, 0) / bs.length);
  return { beta_R_medio: r4(m), dp: r4(sd) };
}
res.poder_regressao = {
  beta_observado: betaObs.map(r4), variaveis: ['intercepto', 'mortalidade_adulta', 'parcela_70mais', 'R'],
  dp_residual_base: r4(sdRes),
  cenarios: {
    excesso_nunca_vota_R0_1: simula(0, 1), excesso_nunca_vota_R0_0_92: simula(0, 0.92),
    excesso_vota_25pct_dos_residentes_R0_1: simula(0.25, 1),
    excesso_vota_50pct_dos_residentes_R0_1: simula(0.5, 1),
    excesso_vota_75pct_dos_residentes_R0_1: simula(0.75, 1),
    excesso_vota_igual_residentes_R0_1: simula(1, 1),
  },
};
// Poder do R como detector de inscrições fantasmas: quanto excesso um município precisaria para sair do p95?
{
  const rs = M.map((x) => x.R).sort((a, b) => a - b); const p95 = rs[Math.floor(0.95 * rs.length)];
  const inflados = (k) => M.filter((x) => x.R <= p95 && x.R * (1 + k) > p95).length / M.filter((x) => x.R <= p95).length;
  res.poder_R_detector = { p95: r4(p95), fracao_que_sairia_do_p95_com_inflacao: Object.fromEntries([0.05, 0.1, 0.2, 0.3, 0.5].map((k) => [k, r4(inflados(k))])) };
}

// ---------- 5. Casos extremos (top 15 por R): o que os arquivos dizem
res.top15 = [...M].sort((a, b) => b.R - a.R).slice(0, 15).map((x) => ({
  uf: x.uf, mun: x.mun, nome: x.nome, eleitores: x.E, pop_total_2022: x.tot22, pop_total_2025: x.est25, pop12_2022: x.p12, R: r4(x.R), R25: r4(x.R25),
  comp2t: x.comp2, comp2t_sobre_pop_total_2025: r4(x.comp2 / x.est25), pct_votantes_por_biometria: r4(x.buBio / x.buComp), pct_bio_uf: r4(ufMed[x.uf].cb / ufMed[x.uf].c),
  pct_por_ano_nascimento: r4(x.buBiog / x.buComp), R70: r4(x.E70 / x.p66),
}));

writeFileSync(path.join(OUT, 'eleitorado-acima-populacao-alternativas.json'), JSON.stringify(res, null, 2));
writeFileSync(path.join(OUT, 'eleitorado-acima-populacao-alternativas.tsv'),
  [['uf', 'mun', 'ibge', 'nome', 'eleitores', 'pop12_2022', 'pop12_2025', 'R', 'R25', 'aptos2', 'comp2', 'bu_por_biometria', 'bu_por_ano_nascimento', 'cadastro_biometria', 'E70', 'pop66_2022'].join('\t'),
    ...M.map((x) => [x.uf, x.mun, x.ibge, x.nome, x.E, x.p12, Math.round(x.p12_25), r4(x.R), r4(x.R25), x.aptos2, x.comp2, x.buBio, x.buBiog, x.bioCad, x.E70, x.p66].join('\t'))].join('\n') + '\n');
console.log(JSON.stringify(res, null, 1));
