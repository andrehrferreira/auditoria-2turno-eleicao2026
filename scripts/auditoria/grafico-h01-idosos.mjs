// Gráfico do tópico 6 da perícia, parte 4 ("Por que mais idosos votaram em 2026"; H01, parecer cético 43):
// taxa de comparecimento por faixa de idade, de 70 a 74 até 100 ou mais, no 1º turno de 2018, 2022 e 2026.
// Não faz análise nova: lê a série gravada pelo demógrafo (perfil de comparecimento e abstenção do TSE, Brasil sem o
// exterior), confere votantes e aptos contra a tabela do tópico 6, refaz a taxa (votantes ÷ aptos), confere que cada
// taxa arredondada está escrita no tópico e grava o CSV e o SVG.
// Entrada: data/parsed/auditoria/demografo/salto-85-99-resumo.json (demografo-salto-85-99*.mjs)
// Saídas: docs/pericia/graficos/dados/h01-comparecimento-idosos.csv e docs/pericia/graficos/h01-comparecimento-idosos.svg
// Uso: node scripts/auditoria/grafico-h01-idosos.mjs
import { json, topico, confere, noTexto, csv, fmt, barras } from './grafico-comum.mjs';

const md = topico('06-titulos-de-falecidos.md');
const { serie } = json('demografo', 'salto-85-99-resumo.json');

const FAIXAS = [['70-74', '70 a 74'], ['75-79', '75 a 79'], ['80-84', '80 a 84'], ['85-89', '85 a 89'], ['90-94', '90 a 94'], ['95-99', '95 a 99'], ['100+', '100 ou mais']];
const ANOS = ['2018', '2022', '2026'];
// tabela "Os votantes e os aptos de 70 anos ou mais, 1º turno" do tópico 6: [votantes 2018, 2022, 2026, aptos 2018, 2022, 2026]
const TEXTO = {
  '70-74': [2628207, 3586278, 4785687, 4756393, 5873026, 6948245],
  '75-79': [1187990, 1611724, 2487406, 3167513, 3852604, 4757020],
  '80-84': [475771, 653575, 1019734, 1971647, 2422352, 2744129],
  '85-89': [148661, 209762, 356147, 1121195, 1333976, 1464715],
  '90-94': [33682, 49745, 89530, 688768, 738244, 664482],
  '95-99': [5082, 7591, 14661, 272334, 466703, 337136],
  '100+': [1506, 1675, 2141, 39026, 184330, 297977],
};
// a taxa abaixo de 1% vai com duas casas, como no texto (0,91% e 0,72%)
const casas = (t) => (t < 1 ? 2 : 1);

const linhas = [];
for (const [k, rot] of FAIXAS) {
  const v = ANOS.map((a) => serie[k][`${a}-1t`].votantes);
  const ap = ANOS.map((a) => serie[k][`${a}-1t`].aptos);
  confere([...v, ...ap].every((n, i) => n === TEXTO[k][i]), `${rot}: votantes e aptos de 2018, 2022 e 2026 = tabela do tópico 6`);
  noTexto(md, 'tópico 6', [`| ${rot} | ${[...v, ...ap].map((n) => fmt(n)).join(' | ')} |`]);
  const taxa = v.map((n, i) => (100 * n) / ap[i]);
  const txt = taxa.map((t) => `${fmt(t, casas(t))}%`);
  noTexto(md, 'tópico 6', [`| ${rot} | ${txt.join(' | ')} |`]);
  linhas.push({ k, rot, v, ap, taxa, txt });
}
const sobe = linhas.slice(0, 6).every((l) => l.taxa[2] > l.taxa[1] && l.taxa[2] > l.taxa[0]);
const cem = linhas[6].taxa;
confere(sobe && cem[2] < cem[1] && cem[1] < cem[0], 'de 70 a 99 anos a taxa de 2026 é a maior das três; em 100 ou mais é a menor');

csv('h01-comparecimento-idosos.csv',
  ['faixa_de_idade', 'votantes_2018', 'aptos_2018', 'taxa_pct_2018', 'votantes_2022', 'aptos_2022', 'taxa_pct_2022', 'votantes_2026', 'aptos_2026', 'taxa_pct_2026'],
  linhas.map((l) => [l.rot, ...ANOS.flatMap((_, i) => [l.v[i], l.ap[i], l.taxa[i].toFixed(casas(l.taxa[i]))])]));

barras({
  arquivo: 'h01-comparecimento-idosos.svg',
  titulo: 'Parte dos eleitores de 70 anos ou mais que foi votar, 1º turno',
  subtitulo: 'De 2022 para 2026 a parte subiu em todas as faixas de 70 a 99 anos, e caiu na de 100 ou mais.',
  series: ['2018', '2022', '2026'],
  classes: ['a0', 'a1', 'a2'],
  cats: linhas.map((l) => ({ rotulo: `${l.rot} anos`.replace('ou mais anos', 'anos ou mais'), valores: l.taxa, textos: l.txt })),
  marcas: [0, 10, 20, 30, 40, 50, 60, 70, 80],
  rotuloMarca: (m) => `${m}%`,
  eixo: 'Taxa de comparecimento: votantes ÷ eleitores aptos da faixa (%)',
  margE: 160, margD: 80,
  notas: ['A idade é a do dia da eleição. Depois dos 70 anos o voto é facultativo.'],
  fonte: 'Fonte: perfil de comparecimento e abstenção do TSE, 1º turno de cada ano, Brasil sem o exterior.',
});
