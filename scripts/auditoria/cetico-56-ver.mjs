// Cético 56 (parecer docs/analysis/cetico-revisor/56): visualizador de conferência no bruto.
// Mostra linhas do diário de uma seção (ou das primeiras seções de uma UF) em volta de uma mensagem-alvo, com TODA
// sequência de 6 ou mais dígitos trocada por '#', salvo o código da urna da própria linha (8 dígitos). Nenhum título sai.
// Uso: node scripts/auditoria/cetico-56-ver.mjs --turno 1 --uf ac --alvo "inválido para suspender" [--secao 01040/0004/0075]
//      [--antes 25] [--depois 10] [--max 3] [--data 04/10/2026]
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { values: v } = parseArgs({ options: { turno: { type: 'string', default: '2' }, uf: { type: 'string' }, secao: { type: 'string' }, alvo: { type: 'string' }, antes: { type: 'string', default: '25' }, depois: { type: 'string', default: '10' }, max: { type: 'string', default: '3' }, data: { type: 'string' }, urna: { type: 'string' } } });
const mem = (b) => ({ read: async (d, o, n, p) => ({ bytesRead: b.copy(d, o, p, p + n) }), stat: async () => ({ size: b.length }) });
async function textos(h, prof = 0) {
  const out = [];
  for (const e of await listarEntradas(h)) {
    const d = await lerEntrada(h, e);
    if (e.nome.endsWith('.dat') && !e.nome.includes('-')) out.push({ prof, nome: e.nome, t: d.toString('latin1') });
    else if (e.nome.endsWith('.jez') && prof < 4) out.push(...(await textos(mem(d), prof + 1)));
  }
  return out;
}
const mascara = (l) => { const c = l.split('\t'); return c.slice(0, 5).map((x, i) => (i === 2 ? x : x.replace(/\d{6,}/g, '#'))).join(' | '); };
const base = path.join(DIR_DADOS, 'raw', `${v.turno}t`, 'urnas', v.uf);
async function* secoes() {
  if (v.secao) { yield v.secao; return; }
  const sub = async (d) => (await readdir(d, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  for (const m of await sub(base)) for (const z of await sub(path.join(base, m))) for (const s of await sub(path.join(base, m, z))) yield `${m}/${z}/${s}`;
}
let n = 0;
for await (const s of secoes()) {
  const dir = path.join(base, ...s.split('/'));
  for (const h of (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name)) {
    const nomes = await readdir(path.join(dir, h));
    const log = nomes.find((x) => x.endsWith('-log.jez') || x.endsWith('-logsa.jez'));
    if (!log) continue;
    for (const { prof, t } of await textos(mem(await readFile(path.join(dir, h, log))))) {
      const L = t.split('\n').map((x) => x.replace(/\r$/, ''));
      for (let i = 0; i < L.length; i++) {
        if (!v.alvo || !L[i].includes(v.alvo)) continue;
        if (v.data && !L[i].startsWith(v.data)) continue;
        if (v.urna && L[i].split('\t')[2] !== v.urna) continue;
        console.log(`== ${v.uf}/${s} prof ${prof} linha ${i + 1}`);
        for (let j = Math.max(0, i - Number(v.antes)); j <= Math.min(L.length - 1, i + Number(v.depois)); j++) console.log(`${j + 1}${j === i ? '*' : ' '} ${mascara(L[j])}`);
        if (++n >= Number(v.max)) process.exit(0);
        i += Number(v.depois);
      }
    }
  }
}
