// Cético (lente: dados e definições) — complemento de cetico-centenarios-dados.mjs.
// (1) O excesso é só do 100+ (faixa aberta) ou já aparece em 90–99? Coorte 86–95 do Censo 2022 com mortalidade por idade (IBGE 2654).
// (2) Quanto do excesso nacional de 100+ está concentrado por UF e no Rio de Janeiro (capital), a partir de municipios.tsv do demógrafo.
// Uso: node scripts/auditoria/cetico-centenarios-coorte.mjs   Saída: data/parsed/auditoria/cetico/centenarios-coorte.json
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const IBGE = path.join(RAIZ, 'data/raw/externos/ibge');
const r4 = (x) => Math.round(x * 10000) / 10000;
const sidra = (arq, cat) => {
  const s = {};
  for (const l of JSON.parse(readFileSync(path.join(IBGE, arq), 'utf8')).slice(1)) { const v = Number(l.V); s[l[cat]] = (s[l[cat]] ?? 0) + (Number.isFinite(v) ? v : 0); }
  return s;
};
const c = { ...sidra('censo2022-9514-idade-b.json', 'D5C'), ...sidra('censo2022-9514-idade-c.json', 'D5C') };
const d23 = sidra('obitos-2654-2023.json', 'D7C'); const d24 = sidra('obitos-2654-2024.json', 'D7C');
const d = Object.fromEntries(Object.keys(d23).map((k) => [k, (d23[k] + (d24[k] ?? 0)) / 2]));
const p85_89 = c['49109'], p85 = c['6638'], p90_94 = c['60040'], p95_99 = c['60041'], p95 = c['6648'], p100 = c['6653'];
const q85 = (d['5980'] - d['106182'] - d['106183'] - d['5996']) / p85_89; // 85+ menos 90+ = 85–89
const q90 = d['106182'] / p90_94, q95 = d['106183'] / p95_99, q100 = d['5996'] / p100;
// Coorte 86–95 em 2022 (vira 90–99 em 2026). Aproximação: 86–89 passam ~2 anos em 85–89 e ~2 em 90–94; 90–94 passam ~2 em 90–94 e ~2 em 95–99; 95 passa 4 em 95–99.
const p86_89 = p85_89 - p85, p90_94_ = p90_94; // 90–94 inteiro + 95 (único ano) = 90–95
const viv90_99 = p86_89 * (1 - q85) ** 2 * (1 - q90) ** 2 + p90_94_ * (1 - q90) ** 2 * (1 - q95) ** 2 + p95 * (1 - q95) ** 4;
const coorte86_95 = p86_89 + p90_94_ + p95;
const eleitores90_99 = 665199 + 337556 - 717 - 420; // perfil jul/2026, sem ZZ (cetico-centenarios-dados.json)

// Concentração do excesso de 100+ (sem mortalidade) por UF e no município do Rio de Janeiro
const linhas = readFileSync(path.join(RAIZ, 'data/parsed/auditoria/demografo/municipios.tsv'), 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t'));
const porUf = {};
for (const x of linhas) { const u = (porUf[x[0]] ??= { e100: 0, p96: 0, eleitores: 0 }); u.e100 += +x[8]; u.p96 += +x[9]; u.eleitores += +x[4]; }
const ufs = Object.entries(porUf).map(([uf, u]) => ({ uf, ...u, excesso_sem_mortes: u.e100 - u.p96, razao: r4(u.e100 / u.p96), parcela_100_no_eleitorado: r4(u.e100 / u.eleitores) })).sort((a, b) => b.excesso_sem_mortes - a.excesso_sem_mortes);
const rio = linhas.find((x) => x[1] === '60011');
const res = {
  q: { q85_89: r4(q85), q90_94: r4(q90), q95_99: r4(q95), q100: r4(q100) },
  faixa_90_99: { coorte_86_95_censo2022: coorte86_95, vivos_esperados_2026: Math.round(viv90_99), eleitores_90_99_jul2026: eleitores90_99, excesso: Math.round(eleitores90_99 - viv90_99) },
  rio_capital: { e100: +rio[8], p96: +rio[9], p100: +rio[10], eleitores: +rio[4] },
  ufs,
};
await writeFile(path.join(RAIZ, 'data/parsed/auditoria/cetico/centenarios-coorte.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify({ ...res, ufs: ufs.slice(0, 8) }, null, 1));
