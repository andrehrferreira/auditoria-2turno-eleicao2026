// Gráfico do tópico 14 da perícia, item 6 (H27, resultado trocado no caminho e seções fantasmas; parecer cético 38):
// onde o par urna e carga do boletim aparece nas listas de correspondências do TSE (lista da véspera, lista da manhã do
// dia, lista final), por turno, nas seções em que ele não está na linha da própria seção na lista da véspera.
// Não faz análise nova: lê a classificação seção a seção da segunda verificação, confere os subtotais contra a
// classificação do engenheiro de segurança (outra leitura das mesmas listas), confere que as linhas somam as seções com
// urna, confere cada número contra a tabela do tópico 14 e grava o CSV e o SVG.
// Entradas: data/parsed/auditoria/cetico-revisor/38/correspondencias-{1t,2t}.json   (cetico-38-correspondencias.mjs)
//           data/parsed/auditoria/seguranca-h27/correspondencias-{1t,2t}.json       (seguranca-h27-correspondencias.mjs)
// Saídas: docs/pericia/graficos/dados/h27-par-urna-carga-listas.csv e docs/pericia/graficos/h27-par-urna-carga-listas.svg
// Uso: node scripts/auditoria/grafico-h27.mjs
import { json, topico, confere, noTexto, csv, fmt, barras } from './grafico-comum.mjs';

const md = topico('14-outras-formas-de-fraude.md');
const LINHAS = [
  ['propria', 'Lista da véspera, na linha da própria seção'],
  ['zona', 'Lista da véspera, como reserva da própria zona'],
  ['manha', 'Só na lista da manhã do dia'],
  ['outra', 'Lista da véspera, mas como reserva de **outra** zona'],
  ['antes', 'Só na lista final, registrado antes do dia'],
  ['noDia', 'Só na lista final, registrado no dia da votação'],
];
// tabela do item 6 do tópico 14
const TEXTO = {
  1: { propria: 495981, zona: 2953, manha: 179, outra: 44, antes: 2, noDia: 17, total: 499176 },
  2: { propria: 496138, zona: 2549, manha: 345, outra: 98, antes: 20, noDia: 28, total: 499178 },
};
const d = {};
for (const t of [1, 2]) {
  const c = json('cetico-revisor', '38', `correspondencias-${t}t.json`).contagens;
  const g = json('seguranca-h27', `correspondencias-${t}t.json`).contagens.parBUEstrito;
  const e = c.estrito;
  const soma = (pref) => Object.entries(e).filter(([k]) => k.startsWith(pref)).reduce((s, [, v]) => s + v, 0);
  d[t] = {
    propria: e['vespera:csecDaSecao'],
    zona: e['vespera:contDaZona'],
    manha: soma('doDia:'),
    outra: e['soCeft:antes|vespera=parEmOutroLugar|dia=parEmOutroLugar'],
    antes: soma('soCeft:antes|') - e['soCeft:antes|vespera=parEmOutroLugar|dia=parEmOutroLugar'],
    noDia: soma('soCeft:noDia|'),
  };
  d[t].total = Object.values(d[t]).reduce((s, v) => s + v, 0);
  confere(d[t].total === Object.values(e).reduce((s, v) => s + v, 0), `${t}º turno: as 6 linhas cobrem todas as classes da segunda verificação`);
  confere(d[t].total === c.secoes - c.sa, `${t}º turno: as linhas somam as seções com urna (${fmt(c.secoes)} − ${c.sa} em cédula)`);
  confere(d[t].propria + d[t].zona === g.vesperaEstrito && d[t].outra === g.vesperaOutraZonaOuSecao && d[t].noDia === g['soCeft:noDia']
    && d[t].manha === g.soDiaEstrito, `${t}º turno: subtotais = classificação do engenheiro de segurança`);
  confere(Object.keys(TEXTO[t]).every((k) => d[t][k] === TEXTO[t][k]), `${t}º turno: as 7 contagens = tabela do tópico 14`);
}
noTexto(md, 'tópico 14', [
  ...LINHAS.map(([k, rot]) => `| ${rot} | ${fmt(d[1][k])} | ${fmt(d[2][k])} |`),
  `| **Subtotal: lista da véspera** | **${fmt(d[1].propria + d[1].zona)}** | **${fmt(d[2].propria + d[2].zona)}** |`,
  `| **Total de seções com urna** | **${fmt(d[1].total)}** | **${fmt(d[2].total)}** |`,
]);

csv('h27-par-urna-carga-listas.csv', ['onde_o_par_urna_e_carga_aparece', 'turno_1', 'turno_2'], [
  ...LINHAS.map(([k, rot]) => [rot.replace(/\*\*/g, ''), d[1][k], d[2][k]]),
  ['Total de seções com urna', d[1].total, d[2].total],
]);

const ROT = {
  zona: 'Lista da véspera, como\nreserva da própria zona',
  manha: 'Só na lista da\nmanhã do dia',
  outra: 'Lista da véspera, como\nreserva de outra zona',
  antes: 'Só na lista final,\nregistrado antes do dia',
  noDia: 'Só na lista final, registrado\nno dia da votação',
};
barras({
  arquivo: 'h27-par-urna-carga-listas.svg',
  titulo: 'Urna que votou fora da linha da própria seção na lista da véspera',
  subtitulo: `Onde ela foi achada. Na linha da própria seção estavam ${fmt(d[1].propria)} (1º turno) e ${fmt(d[2].propria)} (2º turno).`,
  series: ['1º turno (04/10)', '2º turno (25/10)'],
  classes: ['s0', 's1'],
  cats: Object.keys(ROT).map((k) => ({ rotulo: ROT[k], valores: [d[1][k], d[2][k]], textos: [fmt(d[1][k]), fmt(d[2][k])] })),
  marcas: [0, 500, 1000, 1500, 2000, 2500, 3000],
  rotuloMarca: (m) => fmt(m),
  eixo: 'Seções com urna (par urna e carga do boletim)',
  margE: 230, margD: 70,
  notas: ['Listas da véspera e da manhã: feitas antes da votação. Lista final: publicada depois, com a urna que de fato votou.'],
  fonte: 'Fonte: listas de correspondências do TSE e pacotes de todas as seções com urna, dois turnos; conferido por segunda verificação independente.',
});
