// Cético revisor, parecer 48 (H13, sinal V2 em MG com os diários de 2022): leitura bruta de uma seção de 2022, direto do
// zip por UF, para conferir à mão as mensagens usadas na tradução das vias (doc 24 do estatístico, seção 2).
// Mostra as linhas do dia do diário (números com 8 dígitos ou mais trocados por #: o título do mesário não é impresso),
// o texto do BU impresso (.imgbu) e, com --ciclos, os ciclos de eleitor completos que contêm uma mensagem.
//
// Uso: node scripts/auditoria/cetico-48-bruto.mjs --turno 2 --secao mg/40002/0025/0027 [--de 0 --ate 120] [--imgbu]
//      [--ciclos "O eleitor não possui biometria" --max 5]
import { open } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { lerEntrada, listarEntradas } from '../../src/zip.js';
import { TURNOS_2022, caminhoZip2022, interpretarNome2022 } from './coleta-2022-mg.mjs';
import { textos7z } from './estatistico-h13-v2-diario2022.mjs';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, secao: { type: 'string' }, de: { type: 'string', default: '0' }, ate: { type: 'string', default: '80' }, imgbu: { type: 'boolean' }, ciclos: { type: 'string' }, max: { type: 'string', default: '5' } } });
const t = Number(values.turno);
const { pleito, data: dia } = TURNOS_2022[t];
const [, mun, zona, sec] = values.secao.split('/');
const mascara = (s) => s.replace(/\d{8,}/g, '#');
const h = await open(caminhoZip2022(t), 'r');
try {
  const ents = (await listarEntradas(h)).filter((e) => { const i = interpretarNome2022(e.nome); return i && i.pleito === pleito && i.municipio === mun && i.zona === zona && i.secao === sec; });
  console.log('entradas:', ents.map((e) => e.nome).join(', '));
  if (values.imgbu) {
    const e = ents.find((x) => x.nome.endsWith('.imgbu'));
    console.log(mascara((await lerEntrada(h, e)).toString('latin1')));
  }
  const e = ents.find((x) => x.nome.endsWith('.logjez'));
  const ts = await textos7z(await lerEntrada(h, e));
  console.log(`textos (logd.dat) no logjez: ${ts.length}; linhas do dia por texto: ${ts.map((x) => x.split('\n').filter((l) => l.startsWith(dia)).length).join(', ')}`);
  const linhas = ts[0].split('\n').filter((l) => l.startsWith(dia)).map((l) => l.replace(/\r$/, ''));
  const msg = (l) => mascara(l.split('\t').slice(0, 5).join(' | '));
  if (values.ciclos) {
    // ciclo: de "Aguardando digitação do título" até a próxima ocorrência dela
    let atual = [], n = 0;
    for (const l of linhas) {
      if (l.split('\t')[4] === 'Aguardando digitação do título') {
        if (atual.some((x) => x.split('\t')[4]?.startsWith(values.ciclos))) { console.log('--- ciclo'); for (const x of atual) console.log(msg(x)); if (++n >= Number(values.max)) break; }
        atual = [];
      }
      atual.push(l);
    }
  } else {
    for (const l of linhas.slice(Number(values.de), Number(values.ate))) console.log(msg(l));
  }
} finally {
  await h.close();
}
