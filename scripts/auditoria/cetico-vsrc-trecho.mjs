// Revisor cético (votos-sem-log-reconciliacao): imprime, do pacote BRUTO de uma seção, as linhas de cada logd.dat
// (inclusive os .jez aninhados) num intervalo de horário do dia da votação. Só para conferir casos já medidos.
// Uso: node scripts/auditoria/cetico-vsrc-trecho.mjs --secao pb/21750/0002/0254 --de 12:30 --ate 12:50 [--turno 2] [--tudo]
//   --tudo inclui as linhas de verificação de assinatura e de espaço/memória (omitidas por padrão).
import { open, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { values } = parseArgs({ options: { secao: { type: 'string' }, de: { type: 'string', default: '00:00' }, ate: { type: 'string', default: '23:59:59' }, turno: { type: 'string', default: '2' }, tudo: { type: 'boolean' } } });
const turno = Number(values.turno);
const DIA = { 1: '04/10/2026', 2: '25/10/2026' }[turno];
const [uf, municipio, zona, secao] = values.secao.split('/');
const { db } = await abrirLeitura({ aoAvisar: () => {} });
const s = db.prepare('SELECT hash FROM secao WHERE turno = ? AND uf = ? AND municipio = ? AND zona = ? AND secao = ?').get(turno, uf, municipio, zona, secao);
const dir = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', uf, municipio, zona, secao, s.hash);
const nLog = acharArquivo(await readdir(dir), 'log');
const emMemoria = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
async function textos(handle, nome = '') {
  const r = [];
  for (const e of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, e);
    if (e.nome === 'logd.dat') r.push({ nome: `${nome}${e.nome}`, texto: dados.toString('latin1') });
    else if (e.nome.endsWith('.jez')) r.push(...(await textos(emMemoria(dados), `${nome}${e.nome}/`)));
  }
  return r;
}
const h = await open(path.join(dir, nLog));
const lista = await textos(h);
await h.close();
const ate = values.ate.length === 5 ? `${values.ate}:59` : values.ate;
for (const t of lista) {
  console.log(`== ${t.nome}`);
  for (const l of t.texto.split('\n')) {
    if (!l.startsWith(DIA)) continue;
    const hora = l.slice(11, 19);
    if (hora < values.de || hora > ate) continue;
    const c = l.replace(/\r$/, '').split('\t');
    if (!values.tudo && /Verificação de assinatura - Etapa|Espaço (livre|utilizado)|Quantidade de memória/.test(c[4] ?? '')) continue;
    console.log([c[0], c[1], c[2], c[3], (c[4] ?? '').slice(0, 140)].join('\t'));
  }
}
