// Cético 56: estrutura dos textos de log de um pacote (profundidade, urnas, 1ª e última linha de cada urna, nº de linhas)
// e, opcionalmente, as últimas N linhas de cada texto aninhado (dígitos de 6+ trocados por '#').
// Uso: node scripts/auditoria/cetico-56-textos.mjs --turno 2 --secao ba/34134/0171/0166 [--cauda 8]
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { values: v } = parseArgs({ options: { turno: { type: 'string', default: '2' }, secao: { type: 'string' }, cauda: { type: 'string', default: '0' } } });
const mem = (b) => ({ read: async (d, o, n, p) => ({ bytesRead: b.copy(d, o, p, p + n) }), stat: async () => ({ size: b.length }) });
async function textos(h, prof = 0, pre = '') {
  const out = [];
  for (const e of await listarEntradas(h)) {
    const d = await lerEntrada(h, e);
    const nome = `${pre}${e.nome.replace(/\d{6,}/g, '#')}`;
    if (e.nome.endsWith('.dat')) out.push({ prof, nome, t: d.toString('latin1') });
    else if (e.nome.endsWith('.jez') && prof < 4) out.push(...(await textos(mem(d), prof + 1, `${nome}/`)));
  }
  return out;
}
const dir = path.join(DIR_DADOS, 'raw', `${v.turno}t`, 'urnas', ...v.secao.split('/'));
const key = (dh) => dh.slice(6, 10) + dh.slice(3, 5) + dh.slice(0, 2) + dh.slice(10);
for (const h of (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name)) {
  const nomes = await readdir(path.join(dir, h));
  const log = nomes.find((x) => /-log(sa)?\.jez$/.test(x));
  for (const { prof, nome, t } of await textos(mem(await readFile(path.join(dir, h, log))))) {
    const por = new Map();
    const L = t.split('\n').map((x) => x.replace(/\r$/, '')).filter((x) => x.length > 20 && x[2] === '/');
    for (const l of L) {
      const c = l.split('\t');
      const r = por.get(c[2]) ?? { n: 0, pri: c[0], ult: c[0], max: c[0] };
      r.n++; r.ult = c[0]; if (key(c[0]) > key(r.max)) r.max = c[0];
      por.set(c[2], r);
    }
    console.log(`texto prof ${prof} ${nome}: ${[...por].map(([u, r]) => `urna ${u}: ${r.n} linhas, 1ª ${r.pri}, última ${r.ult}, maior ${r.max}`).join(' ; ')}`);
    const n = Number(v.cauda);
    if (n && prof > 0) for (const l of L.slice(-n)) console.log(`   ${l.split('\t').slice(0, 5).map((x, i) => (i === 2 ? x : x.replace(/\d{6,}/g, '#'))).join(' | ')}`);
  }
}
