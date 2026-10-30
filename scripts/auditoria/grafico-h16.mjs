// Gráfico do tópico 13 da perícia (H16, o atendimento de cada eleitor no diário da urna; parecer cético 32):
// como terminaram as liberações de eleitor que não viraram voto gravado, no 1º e no 2º turno.
// Não faz análise nova: lê os resumos da segunda verificação (todos os pacotes dos dois turnos), confere a conta
// "liberações = votos + desistências + interrupções + sem fim", separa as interrupções pela causa anotada no diário,
// confere cada número contra o tópico 13 e grava o CSV e o SVG.
// Entradas: data/parsed/auditoria/cetico/h16/resumo-1t.json, resumo-2t.json, causas-1t.json, causas-2t.json
// Saídas: docs/pericia/graficos/dados/h16-desfechos-liberacoes.csv e docs/pericia/graficos/h16-desfechos-liberacoes.svg
// Uso: node scripts/auditoria/grafico-h16.mjs
import { json, topico, confere, noTexto, csv, fmt, barras } from './grafico-comum.mjs';

const md = topico('13-mesa-e-sessao-do-eleitor.md');
// números do tópico 13 (resposta curta, item 1 e item 5), por turno
const TEXTO = {
  1: { hab: 125322998, V: 125274326, S: 42951, I: 5721, O: 0, tecnica: 1008, chave: 2844, nenhuma: 1869 },
  2: { hab: 128244427, V: 128235189, S: 7860, I: 1378, O: 0, tecnica: 481, chave: 615, nenhuma: 282 },
};
const d = {};
for (const t of [1, 2]) {
  const r = json('cetico', 'h16', `resumo-${t}t.json`);
  const c = json('cetico', 'h16', `causas-${t}t.json`).porClasse;
  const tecnica = c['técnica dentro da sessão'] + c['técnica só nas 30 linhas antes'];
  const chave = c['só desligamento pela chave (pessoa)'];
  const nenhuma = c.nenhuma;
  confere(Object.keys(c).length === 4, `${t}º turno: as interrupções têm 4 classes de causa`);
  d[t] = { hab: r.hab, V: r.V, S: r.S, I: r.I, O: r.O, tecnica, chave, nenhuma };
  confere(r.hab === r.V + r.S + r.I + r.O, `${t}º turno: liberações = votos + desistências + interrupções + sem fim`);
  confere(r.I === tecnica + chave + nenhuma, `${t}º turno: interrupções = com erro ou falta de energia + só a chave + sem causa`);
  confere(Object.keys(TEXTO[t]).every((k) => d[t][k] === TEXTO[t][k]), `${t}º turno: os 8 números = tópico 13`);
}
noTexto(md, 'tópico 13', [
  `2º turno: ${fmt(d[2].hab)} liberações = ${fmt(d[2].V)} votos + ${fmt(d[2].S)} desistências + ${fmt(d[2].I)} interrupções`,
  `1º turno: ${fmt(d[1].hab)} liberações = ${fmt(d[1].V)} votos + ${fmt(d[1].S)} desistências + ${fmt(d[1].I)} interrupções`,
  `| … **sem fim registrado (sessão órfã)** | **${d[2].O}** | **${d[1].O}** |`,
  `só ${fmt(d[2].tecnica)} de ${fmt(d[2].I)} (2º turno) e ${fmt(d[1].tecnica)} de ${fmt(d[1].I)} (1º) têm erro ou falta de energia`,
  `pela chave (${fmt(d[2].chave)} e ${fmt(d[1].chave)}) ou não mostra causa (${fmt(d[2].nenhuma)} e ${fmt(d[1].nenhuma)})`,
]);

const LINHAS = [
  ['Liberações de eleitor', 'hab'],
  ['Terminaram em voto gravado', 'V'],
  ['Terminaram em desistência', 'S'],
  ['Interrompidas, com erro ou falta de energia anotados no diário', 'tecnica'],
  ['Interrompidas, só com o desligamento pela chave', 'chave'],
  ['Interrompidas, sem causa anotada no diário', 'nenhuma'],
  ['Sem fim registrado (sessão órfã)', 'O'],
];
csv('h16-desfechos-liberacoes.csv', ['desfecho', 'turno_1', 'turno_2'], LINHAS.map(([rot, k]) => [rot, d[1][k], d[2][k]]));

const ROT = {
  S: 'Desistência',
  tecnica: 'Interrompido, com erro ou\nfalta de energia no diário',
  chave: 'Interrompido, só com o\ndesligamento pela chave',
  nenhuma: 'Interrompido, sem causa\nanotada no diário',
  O: 'Sem fim registrado\n(sessão órfã)',
};
barras({
  arquivo: 'h16-desfechos-liberacoes.svg',
  titulo: 'Eleitores liberados que não terminaram em voto gravado, por turno',
  subtitulo: `Todos os outros votaram: ${fmt(d[1].V)} de ${fmt(d[1].hab)} no 1º turno e ${fmt(d[2].V)} de ${fmt(d[2].hab)} no 2º.`,
  series: ['1º turno (04/10)', '2º turno (25/10)'],
  classes: ['s0', 's1'],
  cats: Object.keys(ROT).map((k) => ({ rotulo: ROT[k], valores: [d[1][k], d[2][k]], textos: [fmt(d[1][k]), fmt(d[2][k])] })),
  marcas: [0, 10000, 20000, 30000, 40000, 50000],
  rotuloMarca: (m) => fmt(m),
  eixo: 'Liberações de eleitor (número de atendimentos)',
  margE: 230, margD: 70,
  notas: ['Sessão órfã: liberação sem voto, sem desistência e sem parada da urna no diário. Zero nos dois turnos.'],
  fonte: 'Fonte: diários de todas as urnas, dois turnos; números conferidos por segunda verificação independente.',
});
