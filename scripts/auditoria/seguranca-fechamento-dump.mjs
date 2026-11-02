// Engenheiro de segurança, fechamento H04/H09/H12/H20 (doc 13): imprime linhas do diário bruto de uma seção, com
// filtro por data e por texto. Sequências de 8 ou mais dígitos viram '#' (nenhum título sai na tela).
// Uso: node scripts/auditoria/seguranca-fechamento-dump.mjs --turno 2 --secao ba/34134/0171/0166 [--de 24/09/2026] [--ate 24/09/2026] [--re "carga|digitada"] [--max 400]
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, secao: { type: 'string' }, de: { type: 'string' }, ate: { type: 'string' }, re: { type: 'string' }, max: { type: 'string', default: '400' }, urna: { type: 'string' } } });
const ymd = (d) => d.slice(6, 10) + d.slice(3, 5) + d.slice(0, 2);
const de = values.de ? ymd(values.de) : '0', ate = values.ate ? ymd(values.ate) : '9';
const re = values.re ? new RegExp(values.re) : null;
const mem = (b) => ({ read: async (d, o, n, p) => ({ bytesRead: b.copy(d, o, p, p + n) }), stat: async () => ({ size: b.length }) });
async function textos(h, prof = 0) {
  const out = [];
  for (const e of await listarEntradas(h)) {
    const d = await lerEntrada(h, e);
    if (e.nome === 'logd.dat') out.push({ prof, t: d.toString('latin1') });
    else if (e.nome.endsWith('.jez') && prof < 4) out.push(...(await textos(mem(d), prof + 1)));
  }
  return out;
}
const [uf, m, z, s] = values.secao.split('/');
const dir = path.join(DIR_DADOS, 'raw', `${values.turno}t`, 'urnas', uf, m, z, s);
let n = 0;
for (const hp of (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name)) {
  const nomes = await readdir(path.join(dir, hp));
  const log = acharArquivo(nomes, 'log');
  if (!log) continue;
  for (const { prof, t } of await textos(mem(await readFile(path.join(dir, hp, log))))) {
    console.log(`== texto prof ${prof}`);
    let i = 0;
    for (const l of t.split('\n')) {
      i++;
      if (l.length < 20 || l[2] !== '/') continue;
      const c = l.replace(/\r$/, '').split('\t');
      if (values.urna && c[2] !== values.urna) continue;
      const d = ymd(c[0]);
      if (d < de || d > ate) continue;
      const msg = c.slice(1, 5).join(' | ');
      if (re && !re.test(msg)) continue;
      console.log(`${i}\t${c[0]}\t${msg.replace(/\d{8,}/g, (x) => (x === c[2] ? x : '#'))}`);
      if (++n >= Number(values.max)) process.exit(0);
    }
  }
}
