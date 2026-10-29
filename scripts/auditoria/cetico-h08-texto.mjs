// Cético (H08): imprime as linhas do dia de um logd.dat escolhido de um pacote (por índice do texto), sem ruído,
// e as primeiras linhas do dia de cada texto. Uso: node scripts/auditoria/cetico-h08-texto.mjs <uf/mun/zona/secao> <índice> [max]
import { open, readdir } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { listarEntradas, lerEntrada } from '../../src/zip.js';
const mem = (b) => ({ read: async (d, o, n, p) => ({ bytesRead: b.copy(d, o, p, p + n) }), stat: async () => ({ size: b.length }) });
async function txt(h, r, out = []) { for (const e of await listarEntradas(h)) { const d = await lerEntrada(h, e); if (e.nome === 'logd.dat') out.push([r, d.toString('latin1')]); else if (e.nome.endsWith('.jez')) await txt(mem(d), r + '/' + e.nome, out); } return out; }
const [alvo, idx, max = '400'] = process.argv.slice(2);
const dir = path.join(DIR_DADOS, 'raw', '2t', 'urnas', ...alvo.split('/'));
const hash = (await readdir(dir))[0];
const f = (await readdir(path.join(dir, hash))).find((n) => n.endsWith('-log.jez'));
const h = await open(path.join(dir, hash, f));
const ts = await txt(h, f); await h.close();
const R = /^(Verificação de assinatura|Urna ligada conectada|Espaço (livre|utilizado)|Quantidade de memória|Tecla indevida)/;
ts.forEach(([r], i) => console.log(`[${i}] ${r}`));
const [r, t] = ts[Number(idx)];
const ls = t.split('\n').filter((l) => l.startsWith('25/10/2026') && !R.test(l.split('\t')[4] ?? ''));
console.log(`== ${r}: ${ls.length} linhas do dia sem ruído`);
for (const l of ls.slice(0, Number(max))) { const c = l.split('\t'); console.log(`${c[0].slice(11)} ${c[1]} ${c[2]} ${c[3]} ${c[4]}`); }
