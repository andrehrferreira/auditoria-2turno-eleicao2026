// Catálogo nacional de mensagens raras do log (perfil engenheiro-seguranca-urna). Junta os <uf>.catalogo.json de
// seguranca-varrer-logs.mjs e grava:
//   catalogo-nacional-<t>t.json  todas as mensagens normalizadas, com eventos, seções, UFs e amostra de seções (até 300
//                                por UF quando a mensagem aparece em até 2.000 seções; senão 50);
//   raras-<t>t.tsv               mensagens de período prep/dia/pos/outroAno em até --limite seções (padrão 500 = ~0,1%),
//                                com a concentração (maior UF e maior zona dentro da amostra).
// Imprime o resumo: contagem por nível, mensagens raras de ERRO/ALERTA/WHAT/EXTERNO e INFO, e linhas de verificação de
// assinatura que não terminam em [SUCESSO] (em qualquer período, inclusive antes do turno).
// Uso: node scripts/auditoria/seguranca-catalogo-nacional.mjs [--turno 2] [--limite 500] [--dir <saída da varredura>]
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, limite: { type: 'string', default: '500' }, dir: { type: 'string' } } });
const turno = values.turno;
const limite = Number(values.limite);
const base = path.join(DIR_DADOS, 'parsed', 'auditoria', 'engenheiro-seguranca-urna');
const dir = values.dir ?? path.join(base, `${turno}t`);

const nacional = new Map();
let pacotes = 0; let erros = 0; const ufs = [];
for (const arq of readdirSync(dir).filter((n) => n.endsWith('.catalogo.json')).sort()) {
  const c = JSON.parse(readFileSync(path.join(dir, arq), 'utf8'));
  pacotes += c.pacotes; erros += c.erros; ufs.push(c.uf);
  for (const [k, v] of Object.entries(c.mensagens)) {
    let e = nacional.get(k);
    if (!e) nacional.set(k, (e = { eventos: 0, secoes: 0, porUf: {}, amostraTruncada: false, amostra: [] }));
    e.eventos += v.eventos; e.secoes += v.secoes; e.porUf[c.uf] = v.secoes;
    if (v.secoes > v.amostra.length) e.amostraTruncada = true;
    e.amostra.push(...v.amostra);
  }
}
console.log(`UFs: ${ufs.length} (${ufs.join(',')}); pacotes ${pacotes}; erros de leitura ${erros}; mensagens distintas ${nacional.size}`);

const partes = (k) => { const [periodo, nivel, app, ...msg] = k.split('\t'); return { periodo, nivel, app, msg: msg.join('\t') }; };
const zonaDe = (id) => id.split('*')[0].split('/').slice(0, 3).join('/');
function concentracao(e) {
  const porZona = {};
  for (const id of e.amostra) porZona[zonaDe(id)] = (porZona[zonaDe(id)] ?? 0) + 1;
  const [zona, n] = Object.entries(porZona).sort((a, b) => b[1] - a[1])[0] ?? ['-', 0];
  const [uf, nUf] = Object.entries(e.porUf).sort((a, b) => b[1] - a[1])[0];
  return { ufs: Object.keys(e.porUf).length, maiorUf: `${uf}:${nUf}`, maiorZona: `${zona}:${n}`, zonas: Object.keys(porZona).length };
}

// Resumo por período e nível
const resumo = {};
for (const [k, e] of nacional) {
  const { periodo, nivel } = partes(k);
  const r = (resumo[`${periodo}\t${nivel}`] ??= { mensagens: 0, eventos: 0 });
  r.mensagens++; r.eventos += e.eventos;
}
console.log('\nperíodo\tnível\tmensagens distintas\teventos');
for (const [k, r] of Object.entries(resumo).sort()) console.log(`${k}\t${r.mensagens}\t${r.eventos}`);

const linhasTsv = ['periodo\tnivel\tapp\tsecoes\teventos\tufs\tmaior_uf\tmaior_zona\tzonas_na_amostra\tamostra_truncada\tmensagem\tamostra'];
const raras = [...nacional].filter(([k, e]) => partes(k).periodo !== 'pre' && e.secoes <= limite)
  .sort((a, b) => a[1].secoes - b[1].secoes || (a[0] < b[0] ? -1 : 1));
for (const [k, e] of raras) {
  const { periodo, nivel, app, msg } = partes(k);
  const c = concentracao(e);
  linhasTsv.push([periodo, nivel, app, e.secoes, e.eventos, c.ufs, c.maiorUf, c.maiorZona, c.zonas, e.amostraTruncada, msg.replace(/\t/g, ' '), e.amostra.slice(0, 20).join(' ')].join('\t'));
}
writeFileSync(path.join(base, `raras-${turno}t.tsv`), `${linhasTsv.join('\n')}\n`);
writeFileSync(path.join(base, `catalogo-nacional-${turno}t.json`), JSON.stringify({ turno: Number(turno), ufs, pacotes, erros, mensagens: Object.fromEntries([...nacional].map(([k, e]) => [k, { ...e, amostra: e.secoes <= 2000 ? e.amostra : e.amostra.slice(0, 50) }])) }));

const imprimir = (titulo, filtro, max = 400) => {
  const sel = raras.filter(([k]) => filtro(partes(k)));
  console.log(`\n## ${titulo}: ${sel.length} mensagens (até ${limite} seções)`);
  for (const [k, e] of sel.slice(0, max)) {
    const { periodo, nivel, app, msg } = partes(k);
    const c = concentracao(e);
    console.log(`${e.secoes}\t${e.eventos}\t${periodo}\t${nivel}\t${app}\t${c.ufs} UF, ${c.maiorUf}, zona ${c.maiorZona}\t${msg.slice(0, 220)}`);
  }
};
imprimir('Raras de ERRO/ALERTA/WHAT/EXTERNO e outros níveis', (p) => p.nivel !== 'INFO');
imprimir('Raras de INFO', (p) => p.nivel === 'INFO', 250);

console.log('\n## Linhas com "assinatura" que não terminam em [SUCESSO] (todos os períodos)');
for (const [k, e] of [...nacional].filter(([k]) => /assinatura/i.test(k) && !/\[SUCESSO\]$/.test(k) && !/^Identificação de assinatura do arquivo /.test(partes(k).msg))) {
  const { periodo, nivel, app, msg } = partes(k);
  console.log(`${e.secoes}\t${e.eventos}\t${periodo}\t${nivel}\t${app}\t${concentracao(e).maiorUf}\t${msg.slice(0, 260)}\t${e.amostra.slice(0, 5).join(' ')}`);
}

// Temas (ERRO/ALERTA/WHAT/EXTERNO e níveis corrompidos, a partir da preparação do turno): agrupamento por expressão regular
const TEMAS = [
  ['assinatura/integridade', /assinatura|integridade|SEVIN|SAVD/i],
  ['relógio (ADH, data e hora)', /Data e Hora|ADH|data e hora/],
  ['log corrompido', /log corrompido|logs corrompidos/i],
  ['contingência / RED / SA', /[Cc]ontingência|RED|Sincroniz/],
  ['mídia (MR, MV, ME, MI, I/O)', /mídia|MR\b|MV\b|\bME\b|\bMI\b|Input\/output|FE_ESTATICO|FI_ESTATICO|montar|volume/i],
  ['biometria (leitor)', /biom|digital|FingerScanner|scanner|uescan/i],
  ['impressora', /[Ii]mpressora|bobina|guilhotina|papel|Printer/],
  ['energia / bateria', /[Bb]ateria|energia|ALIMENTAÇÃO/],
  ['teclado / terminal / tela', /[Tt]eclado|TM\b|LCD|Led|Kbd|Tela|Screen|beep|[Bb]ipe|[Áá]udio|[Vv]ídeo|Alto-falante/],
  ['procedimento de mesa', /[Mm]esário|[Ee]leitor|[Tt]ítulo|[Ee]ncerramento|suspender|[Aa]no de nascimento|vias|justific|idade/],
];
const temas = {};
for (const [k, e] of nacional) {
  const { periodo, nivel, msg } = partes(k);
  if (periodo === 'pre' || nivel === 'INFO') continue;
  const tema = TEMAS.find(([, re]) => re.test(msg))?.[0] ?? (/^(ERRO|ALERTA|WHAT|EXTERNO)$/.test(nivel) ? 'outros (software, erro inesperado)' : `nível fora do padrão (${nivel})`);
  const t = (temas[`${periodo}\t${tema}`] ??= { mensagens: 0, eventos: 0, maiorSecoes: 0, exemplo: '' });
  t.mensagens++; t.eventos += e.eventos;
  if (e.secoes > t.maiorSecoes) { t.maiorSecoes = e.secoes; t.exemplo = `${nivel} ${msg.slice(0, 90)}`; }
}
console.log('\n## Temas de ERRO/ALERTA/WHAT/EXTERNO (período prep/dia/pos/outroAno): período | tema | mensagens | eventos | seções da mensagem mais comum | exemplo');
for (const [k, t] of Object.entries(temas).sort()) console.log(`${k}\t${t.mensagens}\t${t.eventos}\t${t.maiorSecoes}\t${t.exemplo}`);

// Aplicações executadas por período (seções que registraram "Iniciando aplicação" da aplicação)
const apps = {};
for (const [k, e] of nacional) {
  const { periodo, app, msg } = partes(k);
  if (periodo !== 'pre' && /^Iniciando aplicação( |$)/.test(msg)) apps[`${periodo}\t${app}\t${msg.slice(0, 60)}`] = e.secoes;
}
console.log('\n## "Iniciando aplicação" por período e aplicação (seções)');
for (const [k, n] of Object.entries(apps).sort()) console.log(`${k}\t${n}`);
