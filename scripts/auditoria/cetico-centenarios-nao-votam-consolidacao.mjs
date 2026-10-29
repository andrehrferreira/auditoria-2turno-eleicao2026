// Revisor cético — consolidação do achado "centenarios-nao-votam".
// Confere o ponto em disputa entre as lentes: a diferença entre turnos (Δ 2º−1º, coeficiente p100 ≈ −0,10)
// seria "uso de 5–10% dos títulos 100+ só no 1º turno"? Testa contra o comparecimento oficial do 1º turno
// por faixa etária (perfil_comparecimento_abstencao, resumido por município em centenarios-oficial-municipios.tsv),
// separando municípios com excesso de 100+ (eleitores 100+ > coorte 96+ do Censo 2022, demografo/municipios.tsv).
// Só leitura de arquivos já gerados; sem banco, sem rede.
// Uso: node scripts/auditoria/cetico-centenarios-nao-votam-consolidacao.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico');
const lerTsv = (f) => {
  const l = readFileSync(f, 'utf8').trimEnd().split('\n');
  const h = l[0].split('\t');
  return l.slice(1).map((x) => Object.fromEntries(x.split('\t').map((v, i) => [h[i], v])));
};

const dem = lerTsv(path.join(RAIZ, 'data', 'parsed', 'auditoria', 'demografo', 'municipios.tsv'));
const excesso = new Map(dem.map((r) => [r.municipio_tse.padStart(5, '0'), +r.eleitores_100 > +r.pop96_2022]));
const nExcesso = [...excesso.values()].filter(Boolean).length;

const of = lerTsv(path.join(OUT, 'centenarios-oficial-municipios.tsv')).filter((r) => r.turno === '1');
const g = { excesso: { mun: 0, aptos: 0, comp: 0, a90: 0, c90: 0 }, sem_excesso: { mun: 0, aptos: 0, comp: 0, a90: 0, c90: 0 }, sem_par: { mun: 0, aptos: 0, comp: 0, a90: 0, c90: 0 } };
for (const r of of) {
  const k = r.municipio.padStart(5, '0');
  const grp = !excesso.has(k) ? 'sem_par' : excesso.get(k) ? 'excesso' : 'sem_excesso';
  const x = g[grp];
  x.mun++; x.aptos += +r.aptos_100; x.comp += +r.comp_100; x.a90 += +r.aptos_90_99; x.c90 += +r.comp_90_99;
}
for (const x of Object.values(g)) { x.taxa_100 = +(x.comp / x.aptos || 0).toFixed(4); x.taxa_90_99 = +(x.c90 / x.a90 || 0).toFixed(4); }

const aptos100 = of.reduce((s, r) => s + +r.aptos_100, 0);
const comp100 = of.reduce((s, r) => s + +r.comp_100, 0);
const cenarios = [0.05, 0.1].map((u) => ({
  uso_so_no_1t: u,
  votos_que_o_arquivo_oficial_teria_de_mostrar: Math.round(u * aptos100),
  oficial_observado: comp100,
  compativel: comp100 >= u * aptos100,
}));

const res = {
  gerado_em: new Date().toISOString(),
  fonte: 'centenarios-oficial-municipios.tsv (turno 1, arquivo TSE gerado em 13/10/2026) × demografo/municipios.tsv',
  municipios_com_excesso_no_cadastro: nExcesso,
  oficial_1t_100mais: { aptos: aptos100, comparecimento: comp100, taxa: +(comp100 / aptos100).toFixed(4) },
  por_grupo_de_municipio: g,
  hipotese_uso_so_no_1t: cenarios,
};
mkdirSync(OUT, { recursive: true });
writeFileSync(path.join(OUT, 'centenarios-consolidacao.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
