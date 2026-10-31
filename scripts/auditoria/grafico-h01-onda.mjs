// Gráfico do tópico 6 da perícia, parte 5 ("Por que os eleitores de 100 anos ou mais saltaram de 2018 para 2022"; H01,
// parecer cético 44): a onda dos eleitores aptos de 95 a 99 e de 100 anos ou mais em 2014, 2018, 2022 e 2026, com os
// votantes de cada faixa, no 1º turno.
// Não faz análise nova: lê a série gravada pela segunda verificação (perfil de comparecimento e abstenção do TSE, Brasil
// sem o exterior), confere que os aptos do comparecimento são os da série por faixa, confere cada número e cada
// diferença entre anos contra as duas tabelas da parte 5 do tópico 6 e grava o CSV e o SVG.
// Entrada: data/parsed/auditoria/cetico-revisor/44-resumo.json (cetico-44-*.mjs)
// Saídas: docs/pericia/graficos/dados/h01-onda-95-mais.csv e docs/pericia/graficos/h01-onda-95-mais.svg
// Uso: node scripts/auditoria/grafico-h01-onda.mjs
import { json, topico, confere, noTexto, csv, fmt, xml, cabecalho, legenda, barra, gravar } from './grafico-comum.mjs';

const md = topico('06-titulos-de-falecidos.md');
const { serie, comparecimento } = json('cetico-revisor', '44-resumo.json');

const FAIXAS = [['95-99', 'Faixa de 95 a 99 anos'], ['100+', 'Faixa de 100 anos ou mais']];
const ANOS = ['2014', '2018', '2022', '2026'];
// tabela "Uma onda de títulos que envelhece" da parte 5 do tópico 6: [aptos 95-99, votaram 95-99, aptos 100+, votaram 100+]
const TEXTO = {
  2014: [72726, 4682, 21271, 2528],
  2018: [272334, 5082, 39026, 1506],
  2022: [466703, 7591, 184330, 1675],
  2026: [337136, 14661, 297977, 2141],
};

const d = {};
for (const [k] of FAIXAS) {
  d[k] = ANOS.map((a) => ({ aptos: comparecimento[k][a].aptos, votaram: comparecimento[k][a].votaram }));
  confere(ANOS.every((a, i) => d[k][i].aptos === serie[k][a]), `${k}: aptos do comparecimento = série por faixa, nos quatro anos`);
}
ANOS.forEach((a, i) => {
  const v = [d['95-99'][i].aptos, d['95-99'][i].votaram, d['100+'][i].aptos, d['100+'][i].votaram];
  confere(v.every((n, j) => n === TEXTO[a][j]), `${a}: aptos e votantes das duas faixas = tabela do tópico 6`);
  noTexto(md, 'tópico 6', [`| ${a} | ${v.map((n) => fmt(n)).join(' | ')} |`]);
});
// tabela "A faixa que recebe a onda ganha títulos, e não votantes"
const dif = (k, i, j) => [d[k][j].aptos - d[k][i].aptos, d[k][j].votaram - d[k][i].votaram];
noTexto(md, 'tópico 6', [
  `| 95 a 99 anos, de 2014 para 2018 | ${dif('95-99', 0, 1).map((n) => fmt(n)).join(' | ')} |`,
  `| 100 ou mais, de 2018 para 2022 | ${dif('100+', 1, 2).map((n) => fmt(n)).join(' | ')} |`,
  `| 100 ou mais, de 2022 para 2026 | ${dif('100+', 2, 3).map((n) => fmt(n)).join(' | ')} |`,
]);
const maxVot = Math.max(...FAIXAS.flatMap(([k]) => d[k].map((x) => x.votaram)));
confere(maxVot < 15000, `nenhuma faixa teve 15 mil votantes ou mais em nenhum ano (maior: ${fmt(maxVot)})`);

csv('h01-onda-95-mais.csv',
  ['ano', 'aptos_95_a_99', 'votaram_95_a_99', 'aptos_100_ou_mais', 'votaram_100_ou_mais'],
  ANOS.map((a, i) => [a, d['95-99'][i].aptos, d['95-99'][i].votaram, d['100+'][i].aptos, d['100+'][i].votaram]));

// ---- SVG: dois blocos (uma faixa cada), uma linha por ano, barra de aptos e barra de votantes na mesma escala ----
const L = 760; const margE = 150; const margD = 120; const larg = L - margE - margD;
const TOPO_ESC = 500000; const MARCAS = [0, 100000, 200000, 300000, 400000, 500000];
const x = (v) => margE + (larg * v) / TOPO_ESC;
const alt = 14; const gapSerie = 3; const altAno = 2 * alt + gapSerie; const gapAno = 10;
const cabBloco = 24; const altBloco = cabBloco + ANOS.length * altAno + (ANOS.length - 1) * gapAno; const gapBloco = 26;
const topoPlot = 100;
const altPlot = FAIXAS.length * altBloco + (FAIXAS.length - 1) * gapBloco;
const base = topoPlot + altPlot;
const NOTAS = [
  'Os votantes são tão poucos perto dos aptos que a barra laranja quase não aparece; o número ao lado dá o valor.',
  'Como ler: a barra azul conta os títulos da faixa no cadastro; a laranja, quantos deles foram votar.',
  'A seta segue a mesma geração: em 2018 ela enche a faixa de 95 a 99 anos e, em 2022, chega à de 100 ou mais,',
  `que ganha ${fmt(dif('100+', 1, 2)[0])} títulos e só ${fmt(dif('100+', 1, 2)[1])} votantes. O estoque de títulos cresceu; os votos, quase não.`,
];
const H = base + 64 + NOTAS.length * 18 + 14;
const titulo = 'Eleitores aptos de 95 a 99 e de 100 anos ou mais, e quantos votaram, 1º turno';
const subtitulo = 'Os títulos dessas idades se multiplicaram; os votantes ficaram abaixo de 15 mil por faixa em todo ano.';
const p = [];
cabecalho(p, L, H, titulo, subtitulo, FAIXAS.map(([k, rot]) => `${rot}: ${ANOS.map((a, i) => `${a}, ${fmt(d[k][i].aptos)} aptos e ${fmt(d[k][i].votaram)} votaram`).join('; ')}`).join('. '));
legenda(p, ['Eleitores aptos', 'Votaram'], ['s0', 's1'], 66);
for (const m of MARCAS) {
  p.push(`<line class="grade" x1="${x(m)}" x2="${x(m)}" y1="${topoPlot - 6}" y2="${base + 4}" stroke-width="1"/>`);
  p.push(`<text class="t2" x="${x(m)}" y="${base + 20}" font-size="12" text-anchor="middle">${fmt(m)}</text>`);
}
p.push(`<line class="eixo" x1="${margE}" x2="${margE}" y1="${topoPlot - 6}" y2="${base + 4}" stroke-width="1"/>`);
const larguraTexto = (s) => s.length * 6.8;
const pontaAptos = {}; // fim do rótulo da barra de aptos, para a seta da onda
FAIXAS.forEach(([k, rot], bi) => {
  const y0 = topoPlot + bi * (altBloco + gapBloco);
  p.push(`<text class="t1" x="20" y="${y0 + 14}" font-size="13" font-weight="600">${xml(rot)}</text>`);
  ANOS.forEach((a, i) => {
    const ya = y0 + cabBloco + i * (altAno + gapAno);
    p.push(`<text class="t1" x="${margE - 10}" y="${ya + altAno / 2 + 4.5}" font-size="13" text-anchor="end">${a}</text>`);
    const { aptos, votaram } = d[k][i];
    const dica = `${rot.replace('Faixa de ', '')}, ${a}: ${fmt(aptos)} aptos, ${fmt(votaram)} votaram`;
    [[aptos, 's0'], [votaram, 's1']].forEach(([v, cls], si) => {
      const y = ya + si * (alt + gapSerie); const w = Math.max(x(v) - margE, 2);
      p.push(barra(cls, margE, y, w, alt, dica));
      p.push(`<text class="t1" x="${margE + w + 6}" y="${y + alt / 2 + 4.5}" font-size="12">${fmt(v)}</text>`);
      if (si === 0) pontaAptos[`${k}|${a}`] = { x: margE + w + 6 + larguraTexto(fmt(v)), y: y + alt / 2 };
    });
  });
});
// seta da onda: 95 a 99 em 2018 → 100 ou mais em 2022
const de = pontaAptos['95-99|2018']; const ate = pontaAptos['100+|2022'];
const xs = margE + larg + 50;
p.push(`<path class="eixo" d="M${de.x + 6},${de.y}H${xs}V${ate.y}H${ate.x + 14}" fill="none" stroke-width="1.5" stroke-dasharray="4 3"/>`);
p.push(`<path class="t2" d="M${ate.x + 6},${ate.y}l8,-4.5v9z"/>`);
p.push(`<text class="t2" x="${xs + 16}" y="${(de.y + ate.y) / 2}" font-size="12" text-anchor="middle" transform="rotate(90 ${xs + 16} ${(de.y + ate.y) / 2})">a mesma geração, 4 anos depois</text>`);
p.push(`<text class="t2" x="${margE + larg / 2}" y="${base + 40}" font-size="12.5" text-anchor="middle">Eleitores (títulos aptos e votantes, na mesma escala)</text>`);
NOTAS.forEach((t, i) => p.push(`<text class="t2" x="20" y="${H - 30 - (NOTAS.length - 1 - i) * 18}" font-size="12">${xml(t)}</text>`));
p.push(`<text class="t2" x="20" y="${H - 12}" font-size="11">${xml('Fonte: perfil de comparecimento e abstenção do TSE, 1º turno de 2014, 2018, 2022 e 2026, Brasil sem o exterior.')}</text>`);
gravar('h01-onda-95-mais.svg', p);
