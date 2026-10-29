// Cético (achado centenarios-nao-votam, lente reprodução): comparecimento OFICIAL por faixa etária,
// direto do arquivo do TSE perfil_comparecimento_abstencao_2026 (agregado por município/zona/perfil; nenhum dado individual).
// Mede o que a regressão do demógrafo tenta inferir: quantos eleitores 100+ e 90-99 compareceram.
// Uso: node scripts/auditoria/cetico-centenarios-nao-votam-oficial.mjs
// Saídas: data/parsed/auditoria/cetico/centenarios-oficial.json e centenarios-oficial-municipios.tsv
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { entradasZip, linhasBrutas } from './contagem-zip.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const ZIP = path.join(RAIZ, 'data/raw/dadosabertos/perfil_comparecimento_abstencao/perfil_comparecimento_abstencao_2026.zip');
const OUT = path.join(RAIZ, 'data/parsed/auditoria/cetico');
const ent = (await entradasZip(ZIP)).find((e) => e.nome.endsWith('_BRASIL.csv'));

const faixa = (c) => (c === 1600 || c === 1700 ? 'f16_17' : c >= 1800 && c <= 6569 ? 'f18_69' : c === 7074 || c === 7579 ? 'f70_79'
  : c === 8084 || c === 8589 ? 'f80_89' : c === 9094 || c === 9599 ? 'f90_99' : c === 9999 ? 'f100' : `outro_${c}`);
const nac = {}; // turno|faixa -> {aptos, comp, tte_c, tte_a}
const desc = {}; // código -> descrição
const mun = new Map(); // turno|uf|mun -> {faixa: [aptos, comp]}
let col = null, n = 0, geracao = new Set();
for await (const c of linhasBrutas(ZIP, ent)) {
  if (!col) { col = Object.fromEntries(c.map((k, i) => [k, i])); continue; }
  n++;
  const t = c[col.NR_TURNO], cf = Number(c[col.CD_FAIXA_ETARIA]); const f = faixa(cf);
  desc[cf] = c[col.DS_FAIXA_ETARIA]; geracao.add(`${t}:${c[col.DT_GERACAO]}`);
  const ap = Number(c[col.QT_APTOS]), cp = Number(c[col.QT_COMPARECIMENTO]);
  const k = `${t}|${f}`; const o = nac[k] ?? (nac[k] = { aptos: 0, comp: 0, linhas: 0 }); o.aptos += ap; o.comp += cp; o.linhas++;
  const km = `${t}|${c[col.SG_UF]}|${c[col.CD_MUNICIPIO]}|${c[col.NM_MUNICIPIO]}`;
  const m = mun.get(km) ?? {}; const mf = m[f] ?? (m[f] = [0, 0]); mf[0] += ap; mf[1] += cp; mun.set(km, m);
}
const r4 = (x) => Math.round(x * 1e4) / 1e4;
const res = { linhas: n, geracao: [...geracao], faixas_codigos: desc, nacional: {} };
for (const [k, o] of Object.entries(nac)) res.nacional[k] = { ...o, taxa: r4(o.comp / o.aptos) };
// distribuição por município do comparecimento 100+ (municípios com 20+ aptos 100+)
const lin = [['turno', 'uf', 'municipio', 'nome', 'aptos_100', 'comp_100', 'taxa_100', 'aptos_90_99', 'comp_90_99', 'taxa_90_99', 'aptos_18_69', 'taxa_18_69', 'taxa_total']];
for (const t of ['1', '2']) {
  const taxas = []; let soma = 0, munN = 0, munZero = 0, munAcima25 = 0;
  for (const [k, m] of mun) {
    if (!k.startsWith(`${t}|`)) continue;
    const a = m.f100 ?? [0, 0]; const b = m.f90_99 ?? [0, 0]; const c = m.f18_69 ?? [0, 0];
    const tot = Object.values(m).reduce((s, v) => [s[0] + v[0], s[1] + v[1]], [0, 0]);
    if (a[0] >= 20) { munN++; const tx = a[1] / a[0]; taxas.push(tx); if (a[1] === 0) munZero++; if (tx > 0.25) munAcima25++; }
    if (a[0] > 0) { soma += a[1]; const [, uf, cm, nome] = k.split('|'); lin.push([t, uf, cm, nome, a[0], a[1], r4(a[1] / a[0]), b[0], b[1], b[0] ? r4(b[1] / b[0]) : '', c[0], c[0] ? r4(c[1] / c[0]) : '', r4(tot[1] / tot[0])]); }
  }
  taxas.sort((x, y) => x - y);
  const q = (p) => r4(taxas[Math.min(taxas.length - 1, Math.floor(p * taxas.length))]);
  if (taxas.length) res[`municipios_100mais_turno${t}`] = { municipios_20mais_aptos_100: munN, comparecimento_100_zero: munZero, taxa_acima_25pct: munAcima25, p10: q(0.1), p50: q(0.5), p90: q(0.9), p99: q(0.99), max: r4(taxas.at(-1)), comp_100_total: soma };
}
await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, 'centenarios-oficial.json'), JSON.stringify(res, null, 1));
await writeFile(path.join(OUT, 'centenarios-oficial-municipios.tsv'), lin.map((l) => l.join('\t')).join('\n') + '\n');
console.log(JSON.stringify(res, null, 1));
