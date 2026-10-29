// Revisor cético, achado svc: confere casos no log BRUTO (todos os logd.dat do pacote, inclusive os de dentro de .jez).
// Para cada seção, imprime as linhas do log num intervalo de data/hora (padrão: 24/10 12:00 a 25/10 12:00), filtrando
// por um regex opcional na mensagem/aplicação. Só confirma casos; não gera número da auditoria.
// Uso: node scripts/auditoria/cetico-svc-casos.mjs --ids ms/90514/0008/0486,... [--de 2026102412] [--ate 2026102512] [--filtro regex] [--turno 2]
import { open, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { values } = parseArgs({ options: { ids: { type: 'string' }, de: { type: 'string', default: '2026102412' }, ate: { type: 'string', default: '2026102512' }, filtro: { type: 'string' }, turno: { type: 'string', default: '2' } } });
const re = values.filtro ? new RegExp(values.filtro) : null;
const mem = (buf) => ({ read: async (d, o, l, p) => ({ bytesRead: buf.copy(d, o, p, p + l) }), stat: async () => ({ size: buf.length }) });
async function logs(h, prof = 0, nome = '', out = []) {
  for (const e of await listarEntradas(h)) {
    const d = await lerEntrada(h, e);
    if (/\.dat$/i.test(e.nome)) out.push({ prof, nome: `${nome}${e.nome}`, texto: d.toString('latin1') });
    else if (/\.jez$/i.test(e.nome)) await logs(mem(d), prof + 1, `${nome}${e.nome}>`, out);
  }
  return out;
}
const chave = (dh) => dh.slice(6, 10) + dh.slice(3, 5) + dh.slice(0, 2) + dh.slice(11, 13) + dh.slice(14, 16) + dh.slice(17, 19);
const { db } = await abrirLeitura();
const q = db.prepare('SELECT hash, tipo_urna, numero_interno_urna, modelo_urna, data_hora_carga, abertura, comparecimento FROM secao WHERE turno = ? AND uf = ? AND municipio = ? AND zona = ? AND secao = ?');
for (const id of values.ids.split(',')) {
  const [uf, mu, zo, se] = id.split('/');
  const s = q.get(Number(values.turno), uf, mu, zo, se);
  console.log(`\n######## ${id} BU: ${JSON.stringify({ ...s, hash: undefined })}`);
  const dS = path.join(DIR_DADOS, 'raw', `${values.turno}t`, 'urnas', uf, mu, zo, se);
  const dir = path.join(dS, (await readdir(dS)).find((n) => n.startsWith(s.hash)));
  const nLog = (await readdir(dir)).find((n) => n.endsWith('-log.jez') || n.endsWith('-logsa.jez'));
  const h = await open(path.join(dir, nLog));
  let ls; try { ls = await logs(h); } finally { await h.close(); }
  for (const l of ls) {
    console.log(`=== log ${l.nome} (profundidade ${l.prof})`);
    for (const linha of l.texto.split('\n')) {
      const c = linha.replace(/\r$/, '').split('\t');
      if (!/^\d\d\/\d\d\/\d{4} /.test(c[0] ?? '')) continue;
      const k = chave(c[0]);
      if (k.slice(0, 10) < values.de || k.slice(0, 10) > values.ate) continue;
      if (re && !re.test(`${c[3]}\t${c[4] ?? ''}`)) continue;
      console.log([c[0], c[1], c[2], c[3], (c[4] ?? '').slice(0, 170)].join(' | '));
    }
  }
}
