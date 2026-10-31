// Gráfico do tópico 6 da perícia, seção "Um município que pede exame: Campinápolis (MT)" (H01; parecer cético 49,
// item 1 e ressalva R2): os 224 eleitores aptos de 100 anos ou mais do cadastro de 2026, por raça/cor, com quantos
// votaram no 1º turno, ao lado das pessoas que o Censo 2022 contou na geração que chega aos 100 anos em 2026.
// Não faz análise nova: recalcula dos arquivos oficiais, pelo mesmo caminho de cetico-49-cadastro.mjs (colunas pelo
// nome do cabeçalho, direto do zip), só o que o gráfico usa:
//  1. perfil_comparecimento_abstencao_2026_MT: Campinápolis (98655), zona 26, 1º turno, 100 anos ou mais, por raça/cor
//     (aptos e comparecimento);
//  2. perfil_eleitor_secao_2026_MT: os mesmos aptos por raça/cor e quantos têm biometria (confere o 1);
//  3. Censo 2022 (SIDRA 9514, idade simples, já guardado em data/raw/externos/ibge): Campinápolis com 95, 96 a 99 e
//     100 anos ou mais.
// Confere cada número contra as duas tabelas da seção no tópico 6 e grava o CSV e o SVG. Sem rede, sem CPF.
// Saídas: docs/pericia/graficos/dados/h01-campinapolis.csv e docs/pericia/graficos/h01-campinapolis.svg
// Uso: node scripts/auditoria/grafico-h01-campinapolis.mjs
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { DIR_DADOS } from '../../src/config.js';
import { topico, confere, noTexto, csv, fmt, xml, cabecalho, legenda, barra, gravar } from './grafico-comum.mjs';

const md = topico('06-titulos-de-falecidos.md');
const DA = path.join(DIR_DADOS, 'raw', 'dadosabertos');
const CAMP = '98655'; const CAMP_IBGE = '5102603'; const ZONA = 26;
const GRUPOS = [['indigena', 'Indígenas Xavante'], ['nao', 'Raça/cor não informada'], ['outra', 'Outra raça/cor']];
const grupo = (cod) => (cod === '4' ? 'indigena' : cod === '-1' ? 'nao' : 'outra');

/** Lê uma entrada de um zip do TSE (latin1, ';'), linha a linha, com as colunas pelo nome do cabeçalho. */
async function ler(zip, entrada, filtro, fn) {
  const p = spawn('unzip', ['-p', zip, entrada]);
  const rl = readline.createInterface({ input: p.stdout.setEncoding('latin1'), crlfDelay: Infinity });
  let H = null;
  for await (const l of rl) {
    if (!H) { H = Object.fromEntries(l.split(';').map((n, i) => [n.replace(/"/g, ''), i])); continue; }
    if (!filtro(l)) continue;
    const c = l.split(';').map((x) => x.replace(/^"|"$/g, ''));
    fn((n) => c[H[n]]);
  }
  const cod = await new Promise((r) => p.on('close', r));
  confere(cod === 0 && H, `${path.basename(zip)} → ${entrada}: lido inteiro`);
}
const zero = () => Object.fromEntries(GRUPOS.map(([k]) => [k, { aptos: 0, votaram: 0, biometria: 0, aptosPerfil: 0 }]));
const d = zero();

// 1. comparecimento por idade e raça/cor, 1º turno de 2026
const xavante = new Set();
await ler(path.join(DA, 'perfil_comparecimento_abstencao', 'perfil_comparecimento_abstencao_2026.zip'),
  'perfil_comparecimento_abstencao_2026_MT.csv', (l) => l.includes(CAMP) && l.includes('100 anos'), (g) => {
    if (g('CD_MUNICIPIO') !== CAMP || Number(g('NR_ZONA')) !== ZONA || g('NR_TURNO') !== '1' || g('DS_FAIXA_ETARIA') !== '100 anos ou mais') return;
    const k = grupo(g('CD_COR_RACA'));
    d[k].aptos += Number(g('QT_APTOS')); d[k].votaram += Number(g('QT_COMPARECIMENTO'));
    if (k === 'indigena') xavante.add(g('DS_GRUPO_INDIGENA'));
  });
confere(xavante.size === 1 && xavante.has('Xavante'), 'todos os indígenas de 100+ de Campinápolis são do grupo Xavante');

// 2. perfil do eleitorado por seção, julho de 2026
await ler(path.join(DA, 'perfil_eleitor_secao', 'perfil_eleitor_secao_2026_MT.zip'), 'perfil_eleitor_secao_2026_MT.csv',
  (l) => l.includes(`"${CAMP}"`) && l.includes('100 anos'), (g) => {
    if (g('CD_MUNICIPIO') !== CAMP || Number(g('NR_ZONA')) !== ZONA || g('DS_FAIXA_ETARIA') !== '100 anos ou mais') return;
    const k = grupo(g('CD_RACA_COR'));
    d[k].aptosPerfil += Number(g('QT_ELEITORES')); d[k].biometria += Number(g('QT_ELEITORES_BIOMETRIA'));
  });
for (const [k, rot] of GRUPOS) confere(d[k].aptos === d[k].aptosPerfil, `${rot}: aptos do comparecimento = aptos do perfil por seção (${d[k].aptos})`);

// 3. Censo 2022, idade simples
const simples = JSON.parse(readFileSync(path.join(DIR_DADOS, 'raw', 'externos', 'ibge', 'censo2022-9514-idade-simples-forma-declaracao.json'), 'utf8'));
const idade = {};
for (const x of simples.slice(1)) {
  if (x.D1C !== CAMP_IBGE || !/^Total/i.test(x.D6N)) continue;
  const m = /^(\d+) anos?$/.exec(x.D5N);
  if (m && +m[1] >= 95) idade[m[1]] = Number(x.V);
  if (/100 anos ou mais/.test(x.D5N)) idade['100+'] = Number(x.V);
}
confere(['95', '96', '97', '98', '99', '100+'].every((k) => Number.isInteger(idade[k])), 'Censo: Campinápolis tem 95, 96, 97, 98, 99 e 100 anos ou mais');
const c96 = ['96', '97', '98', '99', '100+'].reduce((s, k) => s + idade[k], 0);
const teto = c96 + idade['95'];

// conferência contra o tópico 6
const tot = GRUPOS.reduce((s, [k]) => ({ aptos: s.aptos + d[k].aptos, votaram: s.votaram + d[k].votaram, biometria: s.biometria + d[k].biometria }), { aptos: 0, votaram: 0, biometria: 0 });
noTexto(md, 'tópico 6', [
  ...GRUPOS.map(([k, rot]) => `| ${rot} | ${d[k].aptos} | ${d[k].biometria} | ${d[k].votaram} |`),
  `| **Total** | **${tot.aptos}** | **${tot.biometria}** | **${tot.votaram}** |`,
  `| Censo 2022, 96 anos ou mais (96: ${idade['96']}; 97: ${idade['97']}; 98: ${idade['98']}; 99: ${idade['99']}; 100 ou mais: ${idade['100+']}) | ${c96} |`,
  `| Censo 2022, 95 anos | ${idade['95']} |`,
  `| **Teto: pessoas que podiam ter 100+ em 2026, sem nenhuma morte em quatro anos** | **${teto}** |`,
  `| **Eleitores aptos de 100+ no cadastro de 2026** | **${tot.aptos}** |`,
]);
confere(tot.aptos === 224 && tot.votaram === 32 && c96 === 75 && idade['95'] === 4 && teto === 79, 'totais = parecer 49 (224 aptos, 32 votaram; Censo 75 + 4 = 79)');

csv('h01-campinapolis.csv', ['grupo', 'eleitores_aptos_100_ou_mais_2026', 'com_digital_cadastrada', 'votaram_1o_turno_2026', 'pessoas_no_censo_2022'], [
  ...GRUPOS.map(([k, rot]) => [`Cadastro 2026: ${rot}`, d[k].aptos, d[k].biometria, d[k].votaram, '']),
  ['Cadastro 2026: total de 100 anos ou mais', tot.aptos, tot.biometria, tot.votaram, ''],
  ['Censo 2022: 96 anos ou mais', '', '', '', c96],
  ['Censo 2022: 95 anos', '', '', '', idade['95']],
  ['Censo 2022: teto da geração que pode ter 100 ou mais em 2026, sem descontar mortes', '', '', '', teto],
]);

// ---- SVG: barras horizontais na mesma escala; bloco do cadastro por raça/cor e bloco de comparação com o Censo ----
const L = 760; const margE = 200; const margD = 90; const larg = L - margE - margD;
const TOPO_ESC = 250; const MARCAS = [0, 50, 100, 150, 200, 250];
const x = (v) => margE + (larg * v) / TOPO_ESC;
const alt = 14; const gapSerie = 3; const gapLinha = 12; const cabBloco = 24; const gapBloco = 26;
const BLOCOS = [
  { titulo: 'Cadastro de 2026: eleitores aptos de 100 anos ou mais, por raça/cor', linhas: GRUPOS.map(([k, rot]) => ({ rot, barras: [[d[k].aptos, 's0', 'aptos'], [d[k].votaram, 's1', 'votaram']] })) },
  { titulo: 'O total do cadastro e o Censo', linhas: [
    { rot: 'Cadastro de 2026, 100+', barras: [[tot.aptos, 's0', 'aptos'], [tot.votaram, 's1', 'votaram']] },
    { rot: 'Censo 2022, 95 anos ou mais', barras: [[teto, 's2', `pessoas: ${c96} com 96 anos ou mais + ${idade['95']} com 95`]] },
  ] },
];
const altLinha = (l) => l.barras.length * alt + (l.barras.length - 1) * gapSerie;
const altBloco = (b) => cabBloco + b.linhas.reduce((s, l) => s + altLinha(l), 0) + (b.linhas.length - 1) * gapLinha;
const topoPlot = 100;
const base = topoPlot + BLOCOS.reduce((s, b) => s + altBloco(b), 0) + (BLOCOS.length - 1) * gapBloco;
const NOTAS = [
  'O número ao lado de cada barra dá o valor. Nenhum dos 192 títulos sem raça/cor informada tem digital cadastrada.',
  'Como ler: a barra azul conta os títulos de 100 anos ou mais no cadastro; a laranja, quantos deles votaram no 1º turno.',
  `A barra verde soma quem o Censo 2022 contou com 95 anos ou mais, a geração que pode ter 100 anos ou mais em 2026,`,
  `sem descontar quem morreu desde então: é um teto. Mesmo esse teto, ${teto}, fica abaixo dos ${tot.aptos} títulos.`,
];
const H = base + 64 + NOTAS.length * 18 + 14;
const titulo = 'Campinápolis (MT): eleitores de 100 anos ou mais e quantos votaram, ao lado do Censo';
const subtitulo = `${tot.votaram} dos ${tot.aptos} títulos votaram no 1º turno de 2026. O Censo 2022 permite no máximo ${teto} pessoas dessa geração.`;
const p = [];
cabecalho(p, L, H, titulo, subtitulo, [
  ...GRUPOS.map(([k, rot]) => `${rot}: ${d[k].aptos} aptos, ${d[k].votaram} votaram`),
  `Total: ${tot.aptos} aptos, ${tot.votaram} votaram`,
  `Censo 2022: ${c96} pessoas com 96 anos ou mais e ${idade['95']} com 95, teto de ${teto}`,
].join('. '));
legenda(p, ['Eleitores aptos', 'Votaram', 'Pessoas no Censo 2022'], ['s0', 's1', 's2'], 66);
for (const m of MARCAS) {
  p.push(`<line class="grade" x1="${x(m)}" x2="${x(m)}" y1="${topoPlot - 6}" y2="${base + 4}" stroke-width="1"/>`);
  p.push(`<text class="t2" x="${x(m)}" y="${base + 20}" font-size="12" text-anchor="middle">${fmt(m)}</text>`);
}
p.push(`<line class="eixo" x1="${margE}" x2="${margE}" y1="${topoPlot - 6}" y2="${base + 4}" stroke-width="1"/>`);
let y0 = topoPlot;
for (const b of BLOCOS) {
  p.push(`<text class="t1" x="20" y="${y0 + 14}" font-size="13" font-weight="600">${xml(b.titulo)}</text>`);
  let ya = y0 + cabBloco;
  for (const l of b.linhas) {
    p.push(`<text class="t1" x="${margE - 10}" y="${ya + altLinha(l) / 2 + 4.5}" font-size="13" text-anchor="end">${xml(l.rot)}</text>`);
    l.barras.forEach(([v, cls, nome], si) => {
      const y = ya + si * (alt + gapSerie); const w = v > 0 ? Math.max(x(v) - margE, 2) : 0;
      p.push(barra(cls, margE, y, w, alt, `${l.rot}: ${fmt(v)} ${nome}`));
      const rotulo = cls === 's2' ? `${fmt(v)} (${c96} com 96 anos ou mais + ${idade['95']} com 95), sem descontar mortes` : fmt(v);
      p.push(`<text class="t1" x="${margE + w + 6}" y="${y + alt / 2 + 4.5}" font-size="12">${xml(rotulo)}</text>`);
    });
    ya += altLinha(l) + gapLinha;
  }
  y0 += altBloco(b) + gapBloco;
}
p.push(`<text class="t2" x="${margE + larg / 2}" y="${base + 40}" font-size="12.5" text-anchor="middle">Títulos de eleitor ou pessoas, na mesma escala</text>`);
NOTAS.forEach((t, i) => p.push(`<text class="t2" x="20" y="${H - 30 - (NOTAS.length - 1 - i) * 18}" font-size="12">${xml(t)}</text>`));
p.push(`<text class="t2" x="20" y="${H - 12}" font-size="11">${xml('Fonte: TSE, comparecimento por idade e raça/cor (1º turno de 2026) e perfil do eleitorado por seção (julho de 2026); IBGE, Censo 2022.')}</text>`);
gravar('h01-campinapolis.svg', p);
