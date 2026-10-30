import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

// H14 (engenheiro de segurança). Conferência no bruto: imprime as linhas de cada logd.dat do pacote oficial de uma
// seção (principal e aninhados), com filtro opcional por expressão regular e por data.
// Uso: node scripts/auditoria/seguranca-h14-dump-log.mjs --turno 2 --secao ac/01074/0004/0394 [--filtro "SCUE|contingência"] [--dia 25/10/2026] [--max 400]

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, secao: { type: 'string' }, filtro: { type: 'string' }, dia: { type: 'string' }, max: { type: 'string', default: '400' } } });
const dir = path.join(DIR_DADOS, 'raw', `${values.turno}t`, 'urnas', ...values.secao.split('/'));
const mem = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
async function textos(h, prof = 0, nome = 'log.jez') {
  const out = [];
  for (const e of await listarEntradas(h)) {
    const d = await lerEntrada(h, e);
    if (e.nome === 'logd.dat') out.push({ prof, nome: `${nome}/${e.nome}`, texto: d.toString('latin1') });
    else if (e.nome.endsWith('.jez') && prof < 3) out.push(...(await textos(mem(d), prof + 1, `${nome}/${e.nome}`)));
  }
  return out;
}
const re = values.filtro ? new RegExp(values.filtro, 'i') : null;
const aux = JSON.parse(await readFile(path.join(dir, 'aux.json'), 'utf8'));
for (const h of aux.hashes.filter((x) => x.hash && x.hash !== '0' && (x.arq ?? []).some((a) => a.nm))) {
  const nomes = await readdir(path.join(dir, h.hash));
  for (const t of await textos(mem(await readFile(path.join(dir, h.hash, acharArquivo(nomes, 'log')))))) {
    const ls = t.texto.split('\n').map((l) => l.replace(/\r$/, ''));
    console.log(`\n== ${h.hash.slice(0, 12)} ${t.nome} prof ${t.prof}: ${ls.length} linhas`);
    let n = 0;
    for (const l of ls) {
      if (values.dia && !l.startsWith(values.dia)) continue;
      if (re && !re.test(l)) continue;
      console.log(l);
      if (++n >= Number(values.max)) { console.log('...'); break; }
    }
  }
}
