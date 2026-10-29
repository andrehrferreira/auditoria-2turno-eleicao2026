// Cético: consolidação do achado "eleitorado acima da população" (docs/analysis/demografo/02).
// Confere os pontos em que os revisores e o autor divergem: o excesso de títulos vota ou se abstém?
// Somente leitura. Entradas: Censo 2022 bruto (SIDRA 9514), estimativa IBGE 2025 (6579), banco (2º turno),
// e só a coluna de pareamento TSE->IBGE de data/parsed/auditoria/demografo/municipios.tsv.
// O eleitorado aqui é o de aptos do 2º turno no banco (eleição de presidente), não o perfil de julho.
// Uso: node scripts/auditoria/cetico-eleitorado-acima-populacao-consolidacao.mjs
// Saída: data/parsed/auditoria/cetico/eleitorado-acima-populacao-consolidacao.json
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const IBGE = path.join(RAIZ, 'data/raw/externos/ibge');
const OUT = path.join(RAIZ, 'data/parsed/auditoria/cetico');
mkdirSync(OUT, { recursive: true });
const db = new DatabaseSync(path.join(RAIZ, 'data/db/eleicao2026.sqlite'), { readOnly: true });
const r4 = (x) => Math.round(x * 10000) / 10000;

// Censo 2022: total e 12+ (total menos 0-4, 5-9, 10, 11 anos)
const censo = new Map();
for (const f of ['a', 'b', 'c']) {
  for (const l of JSON.parse(readFileSync(path.join(IBGE, `censo2022-9514-idade-${f}.json`), 'utf8')).slice(1)) {
    const o = censo.get(l.D1C) ?? {}; const v = Number(l.V); o[l.D5C] = Number.isFinite(v) ? v : 0; censo.set(l.D1C, o);
  }
}
const est = new Map();
for (const l of JSON.parse(readFileSync(path.join(IBGE, 'estimativa-6579-2024-2025.json'), 'utf8')).slice(1)) {
  if (l.D3C === '2025') est.set(l.D1C, Number(l.V));
}
// pareamento TSE -> IBGE (único uso do arquivo do autor)
const lin = readFileSync(path.join(RAIZ, 'data/parsed/auditoria/demografo/municipios.tsv'), 'utf8').trimEnd().split('\n');
const H = lin[0].split('\t'); const iT = H.indexOf('municipio_tse'); const iI = H.indexOf('municipio_ibge'); const iN = H.indexOf('nome');
const par = new Map(lin.slice(1).map((l) => l.split('\t')).map((c) => [c[iT], { ibge: c[iI], nome: c[iN] }]));

// Banco, 2º turno: aptos (eleição de presidente) e BU por município
const aptos = new Map(db.prepare(`SELECT municipio, uf, SUM(aptos) a FROM secao_eleicao
  WHERE turno = 2 AND uf <> 'zz' AND eleicao = (SELECT eleicao FROM secao_eleicao WHERE turno = 2 GROUP BY eleicao ORDER BY COUNT(*) DESC LIMIT 1)
  GROUP BY municipio`).all().map((r) => [r.municipio, r]));
const bu = new Map(db.prepare(`SELECT municipio, SUM(comparecimento) comp, SUM(por_biometria) bio, SUM(por_biografia) biog, SUM(sem_biometria) sem,
  SUM(situacao = 'completa') completas, COUNT(*) secoes
  FROM secao WHERE turno = 2 AND uf <> 'zz' GROUP BY municipio`).all().map((r) => [r.municipio, r]));

const M = [];
for (const [mun, a] of aptos) {
  const p = par.get(mun); const c = p && censo.get(p.ibge); const b = bu.get(mun);
  if (!c || !b) continue;
  const tot = c['100362']; const p12 = tot - c['93070'] - c['93084'] - c['6567'] - c['6568'];
  M.push({ uf: a.uf, mun, nome: p.nome, E: a.a, p12, tot, est25: est.get(p.ibge), comp: b.comp, bio: b.bio, biog: b.biog, sem: b.sem,
    incompletas: b.secoes - b.completas, R: a.a / p12 });
}

// Taxa de comparecimento dos residentes por UF, estimada nos municípios com R <= 1 (sem excesso)
const cuf = {};
for (const m of M) if (m.R <= 1) { const o = cuf[m.uf] ?? (cuf[m.uf] = { c: 0, e: 0 }); o.c += m.comp; o.e += m.E; }
for (const k in cuf) cuf[k] = cuf[k].c / cuf[k].e;

const res = { municipios: M.length, secoes_incompletas: M.reduce((s, m) => s + m.incompletas, 0) };
res.contagens = {
  aptos_maior_que_pop_total_2022: M.filter((m) => m.E > m.tot).length,
  comp2t_maior_que_pop12_2022: M.filter((m) => m.comp > m.p12).length,
  comp2t_maior_que_pop_total_2022: M.filter((m) => m.comp > m.tot).length,
  comp2t_maior_que_est2025_total: M.filter((m) => m.comp > m.est25).length,
  votantes_acima_pop12_2022_somados: M.filter((m) => m.comp > m.p12).reduce((s, m) => s + m.comp - m.p12, 0),
};
const dav = M.find((m) => m.mun === '93394');
res.davinopolis = { ...dav, R: r4(dav.R), comparecimento_maximo_se_excesso_se_abstivesse: r4(dav.p12 / dav.E), comparecimento_obs: r4(dav.comp / dav.E) };

// Faixas de R: comparecimento observado, comparecimento implícito do excesso, ano de nascimento e biometria ajustados pela UF
const ufTot = {};
for (const m of M) { const o = ufTot[m.uf] ?? (ufTot[m.uf] = { c: 0, bio: 0, biog: 0 }); o.c += m.comp; o.bio += m.bio; o.biog += m.biog; }
const faixas = [[0, 1], [1, 1.1], [1.1, 1.25], [1.25, 1.5], [1.5, 2], [2, 99]];
res.por_faixa = faixas.map(([lo, hi]) => {
  const S = M.filter((m) => m.R > lo && m.R <= hi);
  const E = S.reduce((s, m) => s + m.E, 0); const C = S.reduce((s, m) => s + m.comp, 0);
  const exc = S.reduce((s, m) => s + Math.max(0, m.E - m.p12), 0);
  const res_esperado = S.reduce((s, m) => s + cuf[m.uf] * Math.min(m.E, m.p12), 0);
  const biog = S.reduce((s, m) => s + m.biog, 0); const bio = S.reduce((s, m) => s + m.bio, 0);
  const biogEsp = S.reduce((s, m) => s + m.comp * ufTot[m.uf].biog / ufTot[m.uf].c, 0);
  const bioEsp = S.reduce((s, m) => s + m.comp * ufTot[m.uf].bio / ufTot[m.uf].c, 0);
  return { faixa: `${lo}-${hi}`, municipios: S.length, comparecimento: r4(C / E),
    comparecimento_implicito_do_excesso: exc > 0 ? r4((C - res_esperado) / exc) : null,
    pct_biometria: r4(bio / C), biometria_menos_uf_pp: r4(100 * (bio - bioEsp) / C),
    pct_ano_nascimento: r4(biog / C), ano_nascimento_menos_uf_pp: r4(100 * (biog - biogEsp) / C) };
});

// Poder: inclinação simples (sem controles) do comparecimento em R, observada e no cenário "excesso nunca vota"
function inclinacao(xs, ys) {
  const n = xs.length; const mx = xs.reduce((s, x) => s + x, 0) / n; const my = ys.reduce((s, y) => s + y, 0) / n;
  let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
  return sxy / sxx;
}
const xs = M.map((m) => m.R); const obs = M.map((m) => m.comp / m.E);
// cenário: residentes votam na taxa observada do próprio município corrigida (taxa dos residentes = comp/min(E,p12) não serve,
// então usa a taxa da UF mais o resíduo do município em relação à UF, aplicada só a min(E,p12))
const cenNunca = M.map((m) => (cuf[m.uf] * Math.min(m.E, m.p12)) / m.E);
const cenIgual = M.map((m) => cuf[m.uf]);
res.poder_inclinacao_simples = { observada: r4(inclinacao(xs, obs)), excesso_nunca_vota: r4(inclinacao(xs, cenNunca)), excesso_vota_igual_residente: r4(inclinacao(xs, cenIgual)) };

writeFileSync(path.join(OUT, 'eleitorado-acima-populacao-consolidacao.json'), JSON.stringify(res, null, 2));
console.log(JSON.stringify(res, null, 2));
