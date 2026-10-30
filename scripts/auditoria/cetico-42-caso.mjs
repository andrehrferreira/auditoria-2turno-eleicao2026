// Cético revisor, parecer 42: conferência de um caso no diário bruto. Lista os ciclos de eleitor com D ≤ limite
// (hora do voto computado, D, cargos, via, foto apresentada) e o resumo por hora. Sem título de eleitor ou mesário.
// Uso: node scripts/auditoria/cetico-42-caso.mjs --turno 2 --secao pe/24570/0118/0279 [--limite 24]
import { open, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { values } = parseArgs({ options: { turno: { type: 'string' }, secao: { type: 'string' }, limite: { type: 'string', default: '24' } } });
const DIA = { 1: '04/10/2026', 2: '25/10/2026' }[values.turno];
const [uf, m, z, s] = values.secao.split('/');
const dir = path.join(DIR_DADOS, 'raw', `${values.turno}t`, 'urnas', uf, m, z, s);
const mem = (b) => ({ read: async (d, o, n, p) => ({ bytesRead: b.copy(d, o, p, p + n) }), stat: async () => ({ size: b.length }) });
async function logs(h, out, nv = 0) { for (const e of await listarEntradas(h)) { if (e.nome === 'logd.dat') out.push((await lerEntrada(h, e)).toString('latin1')); else if (e.nome.endsWith('.jez') && nv < 5) await logs(mem(await lerEntrada(h, e)), out, nv + 1); } return out; }
const porUrna = new Map();
for (const pac of (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name)) {
  const arq = acharArquivo(await readdir(path.join(dir, pac)), 'log');
  if (!arq) continue;
  const h = await open(path.join(dir, pac, arq));
  for (const t of await logs(h, [])) {
    const dec = new Map();
    for (const b of t.split('\n')) {
      const l = b.replace(/\r$/, ''); const c = l.split('\t'); if (c.length < 5) continue;
      if (c[4].startsWith('Seção Eleitoral: ')) dec.set(c[2], c[4].slice(17).trim().padStart(4, '0'));
      if (!l.startsWith(DIA) || (dec.has(c[2]) && dec.get(c[2]) !== s)) continue;
      if (!porUrna.has(c[2])) porUrna.set(c[2], new Set());
      porUrna.get(c[2]).add(l);
    }
  }
  await h.close();
}
const seg = (h) => +h.slice(0, 2) * 3600 + +h.slice(3, 5) * 60 + +h.slice(6, 8);
for (const [urna, set] of porUrna) {
  let mk = 0, k = 0, ult = null, n = 0;
  const curtos = [], hora = {};
  for (const l of set) {
    const c = l.split('\t'), msg = c[4];
    if (msg === 'Identificador do eleitor digitado pelo mesário') mk = 0;
    else if (msg === 'Tipo de habilitação do eleitor [biométrica]') mk |= 1;
    else if (msg.startsWith('Ano de nascimento digitado é igual')) mk |= 2;
    else if (msg === 'Dado digitado confere') mk |= 4;
    else if (msg === 'Foto do eleitor apresentada') mk |= 16;
    else if (msg === 'Eleitor foi habilitado') k = 0;
    else if (msg.startsWith('Voto confirmado para [')) k++;
    else if (msg === 'O voto do eleitor foi computado') {
      const t = seg(c[0].slice(11, 19)); n++;
      const via = mk & 1 ? 'digital' : mk & 2 ? 'ano' : mk & 4 ? 'manual' : 'outra';
      const hh = c[0].slice(11, 13); hora[hh] ??= { digital: 0, ano: 0, manual: 0 }; hora[hh][via]++;
      if (ult !== null && t - ult <= +values.limite) curtos.push(`${c[0].slice(11, 19)} D=${t - ult} k=${k} ${via}${mk & 16 ? ' foto' : ''}`);
      ult = t; mk = 0; k = 0;
    }
  }
  console.log(`urna ${urna}: ${n} votos; ciclos ≤ ${values.limite} s: ${curtos.length}`);
  console.log(curtos.join('\n'));
  console.log('por hora', JSON.stringify(hora));
}
