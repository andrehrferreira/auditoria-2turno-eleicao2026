// Cético (consolidação) — achado centenarios-excesso-cadastro (docs/analysis/demografo/03, seção 1).
// Confere, sem reler arquivos brutos, os pontos que a lente "definições" levantou:
// (1) piso sem mortes e faixa do excesso conforme a mortalidade; (2) contagem de municípios com excesso e o saldo
// dos que têm sinal oposto; (3) concentração por UF; (4) sensibilidade do excesso 90–99 à repartição de anos entre
// faixas e a um sub-registro do Censo entre os muito idosos.
// Entradas: data/parsed/auditoria/demografo/municipios.tsv, data/parsed/auditoria/cetico/centenarios-dados.json,
//           data/raw/externos/ibge/*.json (Censo 9514, óbitos 2654). Só agregados.
// Uso: node scripts/auditoria/cetico-centenarios-excesso-consolidacao.mjs
// Saída: data/parsed/auditoria/cetico/centenarios-excesso-consolidacao.json
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const r4 = (x) => Math.round(x * 10000) / 10000;
const dados = JSON.parse(readFileSync(path.join(RAIZ, 'data/parsed/auditoria/cetico/centenarios-dados.json'), 'utf8'));

// (2) municípios
const cab = readFileSync(path.join(RAIZ, 'data/parsed/auditoria/demografo/municipios.tsv'), 'utf8').trim().split('\n');
const col = Object.fromEntries(cab[0].split('\t').map((k, i) => [k, i]));
const mun = cab.slice(1).map((l) => l.split('\t')).map((x) => ({ uf: x[col.uf], tse: x[col.municipio_tse], ibge: x[col.municipio_ibge], nome: x[col.nome], e100: +x[col.eleitores_100], p96: +x[col.pop96_2022] }));
const semIbge = mun.filter((m) => !m.ibge);
const mais = mun.filter((m) => m.e100 > m.p96), menos = mun.filter((m) => m.e100 < m.p96), iguais = mun.filter((m) => m.e100 === m.p96);
const soma = (l, f) => l.reduce((s, m) => s + f(m), 0);
const totE = soma(mun, (m) => m.e100), totP = soma(mun, (m) => m.p96);
// limiar mais exigente: excesso que não cabe nem com o dobro da coorte (migração/erro de domicílio pesado)
const mais2x = mun.filter((m) => m.e100 > 2 * m.p96 && m.e100 >= 20);
const extremos = ['53813', '48755', '51837', '42471', '88412', '60011'].map((t) => mun.find((m) => m.tse === t));

// (1) faixa do excesso nacional de 100+
const ib = dados.ibge;
const e100 = dados.perfil.total_100_sem_zz;
const faixa100 = { eleitores_100_sem_zz: e100, censo_96: ib.censo.p96, piso_sem_mortes: e100 - ib.censo.p96, autor_q90: e100 - ib.projecao_perfil.q90_autor, por_idade_perfil: e100 - ib.projecao_perfil.por_idade, por_idade_eleicao: e100 - ib.projecao_eleicao.por_idade };

// (4) sensibilidade do excesso 90–99
const IBGE = path.join(RAIZ, 'data/raw/externos/ibge');
const sidra = (arq, cat) => { const s = {}; for (const l of JSON.parse(readFileSync(path.join(IBGE, arq), 'utf8')).slice(1)) { const v = Number(l.V); s[l[cat]] = (s[l[cat]] ?? 0) + (Number.isFinite(v) ? v : 0); } return s; };
const c = { ...sidra('censo2022-9514-idade-b.json', 'D5C'), ...sidra('censo2022-9514-idade-c.json', 'D5C') };
const d23 = sidra('obitos-2654-2023.json', 'D7C'), d24 = sidra('obitos-2654-2024.json', 'D7C');
const d = Object.fromEntries(Object.keys(d23).map((k) => [k, (d23[k] + (d24[k] ?? 0)) / 2]));
const p85_89 = c['49109'], p85 = c['6638'], p90_94 = c['60040'], p95_99 = c['60041'], p95 = c['6648'], p100 = c['6653'];
const eleit90_99 = dados.perfil.faixas['9094|90 a 94 anos'][0] + dados.perfil.faixas['9599|95 a 99 anos'][0] - (dados.perfil.por_uf['ZZ|g90_94']?.[0] ?? 0) - (dados.perfil.por_uf['ZZ|g95_99']?.[0] ?? 0);
function viv90_99({ k = 1, a = 2 }) {
  // k: fator de sub-registro do Censo (pop real = pop × k; óbitos fixos → q ÷ k). a: anos na faixa inicial (o resto, 4 − a, na seguinte).
  const q85 = (d['5980'] - d['106182'] - d['106183'] - d['5996']) / (p85_89 * k), q90 = d['106182'] / (p90_94 * k), q95 = d['106183'] / (p95_99 * k);
  return k * ((p85_89 - p85) * (1 - q85) ** a * (1 - q90) ** (4 - a) + p90_94 * (1 - q90) ** a * (1 - q95) ** (4 - a) + p95 * (1 - q95) ** 4);
}
const cen = [];
for (const k of [1, 1.05, 1.1, 1.2]) for (const a of [1.5, 2, 2.5]) { const v = viv90_99({ k, a }); cen.push({ subregistro_censo: k, anos_faixa_inicial: a, vivos: Math.round(v), excesso: Math.round(eleit90_99 - v) }); }
// mesma sensibilidade para o 100+ (sub-registro do Censo de 96+)
const q95b = d['106183'] / p95_99, q100b = d['5996'] / p100;
const cen100 = [1, 1.1, 1.2, 1.5].map((k) => { const v = k * ((p95_99 - p95) * (1 - q95b / k) ** 2 * (1 - q100b / k) ** 1.95 + p100 * (1 - q100b / k) ** 3.95); return { subregistro_censo: k, vivos: Math.round(v), excesso: Math.round(e100 - v), piso_sem_mortes: Math.round(e100 - k * ib.censo.p96) }; });
// sub-registro do Censo necessário para zerar o piso sem mortes
const kZeraPiso = r4(e100 / ib.censo.p96);

// (3) UF e gênero
const ufs = Object.entries(dados.perfil.por_uf).filter(([k]) => k.endsWith('|g100') && !k.startsWith('ZZ')).map(([k, v]) => ({ uf: k.split('|')[0], e100: v[0], bio: v[1], parcela_bio: r4(v[1] / v[0]) })).sort((a, b) => b.e100 - a.e100);
const top4 = ufs.slice(0, 4).reduce((s, u) => s + u.e100, 0);
const g = dados.perfil.genero;
const masc = (gr) => r4(g[`${gr}|2`] / (g[`${gr}|0`] + g[`${gr}|2`] + g[`${gr}|4`]));

const res = {
  gerado_em: new Date().toISOString(),
  faixa100,
  municipios: { total: mun.length, sem_codigo_ibge: semIbge.length, mais_eleitores_100_que_p96: mais.length, menos: menos.length, iguais: iguais.length, soma_excessos_positivos: soma(mais, (m) => m.e100 - m.p96), soma_deficits: soma(menos, (m) => m.p96 - m.e100), saldo: totE - totP, total_e100: totE, total_p96: totP, mais_que_dobro_e_20mais: mais2x.length, extremos },
  sensibilidade_90_99: { eleitores_90_99_sem_zz: eleit90_99, cenarios: cen },
  sensibilidade_100: { cenarios: cen100, subregistro_censo_que_zera_piso: kZeraPiso },
  ufs: { top4_parcela: r4(top4 / e100), lista: ufs },
  parcela_masculina: { g90_94: masc('g90_94'), g95_99: masc('g95_99'), g100: masc('g100') },
  comparecimento_1t: Object.fromEntries(Object.entries(dados.comparecimento.faixas).filter(([k]) => /^1\|(9094|9599|9999|-3)\|/.test(k)).map(([k, v]) => [k, { aptos: v[0], comp: v[1], taxa: r4(v[1] / v[0]) }])),
};
await writeFile(path.join(RAIZ, 'data/parsed/auditoria/cetico/centenarios-excesso-consolidacao.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify({ ...res, ufs: { ...res.ufs, lista: res.ufs.lista.slice(0, 6) } }, null, 1));
