// H18, linha de base: virada do 13 do 1º para o 2º turno por município em 2018, 2022 e 2026
// (plano: docs/analysis/estatistico-eleitoral/11-h18-plano.md).
//   - Fonte: votacao_candidato_munzona_<ano>_BR.csv do TSE (só votos nominais de presidente).
//   - Lado medido: o 13 contra o outro finalista (17 em 2018; 22 em 2022 e 2026).
//   - Margem = (13 − rival)/nominais, em p.p.; virada = margem do 2º turno − margem do 1º; virada relativa = virada do
//     município − virada da UF (nominais somados). Percentil da virada relativa entre os municípios do país no mesmo ano.
// Só leitura. Uso: node scripts/auditoria/estatistico-h18-historico.mjs
// Saída: data/parsed/auditoria/estatistico-eleitoral/h18/historico-municipios.csv e historico.json
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { RAIZ, paraCsv, pearson } from './forense-lib.mjs';
import { entradasZip, linhasBrutas } from './contagem-zip.mjs';

const SAIDA = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'estatistico-eleitoral', 'h18');
const RIVAL = { 2018: '17', 2022: '22', 2026: '22' };
const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const pp = (a, b) => (b > 0 ? (100 * a) / b : NaN);
const r2 = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : null);
await mkdir(SAIDA, { recursive: true });

async function lerAno(ano) {
  const zip = path.join(RAIZ, 'data', 'raw', 'dadosabertos', 'votacao_candidato_munzona', `votacao_candidato_munzona_${ano}.zip`);
  const e = (await entradasZip(zip)).find((x) => x.nome === `votacao_candidato_munzona_${ano}_BR.csv`);
  const mun = new Map();
  let col = null, colunasErradas = 0, linhas = 0;
  for await (const c of linhasBrutas(zip, e)) {
    if (!col) { col = Object.fromEntries(c.map((x, i) => [x, i])); continue; }
    if (c.length !== Object.keys(col).length) { colunasErradas++; continue; }
    if (c[col.CD_CARGO] !== '1') continue;
    linhas++;
    const t = Number(c[col.NR_TURNO]);
    const uf = c[col.SG_UF].toLowerCase();
    if (uf === 'zz' || uf === 'vt') continue;
    const k = `${uf}|${c[col.CD_MUNICIPIO].padStart(5, '0')}`;
    let m = mun.get(k);
    if (!m) { m = { uf, municipio: c[col.CD_MUNICIPIO].padStart(5, '0'), nome: c[col.NM_MUNICIPIO], v: [null, { nom: 0, a: 0, b: 0 }, { nom: 0, a: 0, b: 0 }] }; mun.set(k, m); }
    const q = Number(c[col.QT_VOTOS_NOMINAIS]);
    const nr = c[col.NR_CANDIDATO];
    m.v[t].nom += q;
    if (nr === '13') m.v[t].a += q;
    else if (nr === RIVAL[ano]) m.v[t].b += q;
  }
  return { mun, colunasErradas, linhas };
}

const resumo = { geradoEm: new Date().toISOString(), anos: {} };
const porAno = {};
for (const ano of [2018, 2022, 2026]) {
  const { mun, colunasErradas, linhas } = await lerAno(ano);
  const lista = [...mun.values()].filter((m) => m.v[1].nom > 0 && m.v[2].nom > 0);
  const uf = new Map();
  for (const m of lista) {
    const u = uf.get(m.uf) ?? uf.set(m.uf, [null, { nom: 0, a: 0, b: 0 }, { nom: 0, a: 0, b: 0 }]).get(m.uf);
    for (const t of [1, 2]) { u[t].nom += m.v[t].nom; u[t].a += m.v[t].a; u[t].b += m.v[t].b; }
  }
  const virada = (v) => pp(v[2].a - v[2].b, v[2].nom) - pp(v[1].a - v[1].b, v[1].nom);
  for (const m of lista) m.rel = virada(m.v) - virada(uf.get(m.uf));
  const ordenados = lista.map((m) => m.rel).sort((a, b) => a - b);
  const percentil = (x) => {
    let lo = 0, hi = ordenados.length;
    while (lo < hi) { const md = (lo + hi) >> 1; if (ordenados[md] < x) lo = md + 1; else hi = md; }
    return (100 * lo) / (ordenados.length - 1 || 1);
  };
  for (const m of lista) m.pct = percentil(m.rel);
  porAno[ano] = new Map(lista.map((m) => [`${m.uf}|${m.municipio}`, m]));
  resumo.anos[ano] = { rival: RIVAL[ano], linhasPresidente: linhas, colunasErradas, municipios: lista.length };
  log(`${ano}: ${lista.length} municípios`);
}

const chaves = [...porAno[2026].keys()];
const linhas = chaves.map((k) => {
  const m = porAno[2026].get(k), a = porAno[2022].get(k), b = porAno[2018].get(k);
  return { uf: m.uf, municipio: m.municipio, nome: m.nome, rel2026: r2(m.rel), pct2026: r2(m.pct),
    rel2022: r2(a?.rel), pct2022: r2(a?.pct), rel2018: r2(b?.rel), pct2018: r2(b?.pct) };
});
const par = (x, y) => { const l = linhas.filter((r) => r[x] != null && r[y] != null); return { municipios: l.length, r: r2(pearson(l.map((r) => r[x]), l.map((r) => r[y]))) }; };
resumo.correlacao = { '2026x2018': par('rel2026', 'rel2018'), '2026x2022': par('rel2026', 'rel2022'), '2022x2018': par('rel2022', 'rel2018') };
await writeFile(path.join(SAIDA, 'historico-municipios.csv'), paraCsv(linhas, Object.keys(linhas[0])));
await writeFile(path.join(SAIDA, 'historico.json'), JSON.stringify(resumo, null, 1));
log(`fim; correlações ${JSON.stringify(resumo.correlacao)}`);
