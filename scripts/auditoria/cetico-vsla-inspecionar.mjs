// Revisor cético (vsla), auxiliar: resume mensagens de erro/biometria de 25/10 por log do pacote de uma seção
// Uso: node scripts/auditoria/cetico-vsla-inspecionar.mjs uf/municipio/zona/secao [regex]
import { open, readdir } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { lerEntrada, listarEntradas } from '../../src/zip.js';
const [uf, mu, zo, se] = process.argv[2].split('/');
const db = new DatabaseSync('data/db/eleicao2026.sqlite', { readOnly: true });
const s = db.prepare('SELECT hash FROM secao WHERE turno=2 AND uf=? AND municipio=? AND zona=? AND secao=?').get(uf, mu, zo, se);
const dir = `data/raw/2t/urnas/${uf}/${mu}/${zo}/${se}/${s.hash}`;
const emMemoria = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
async function walk(h, nome, prof) { for (const e of await listarEntradas(h)) { const d = await lerEntrada(h, e); if (e.nome === 'logd.dat') resumir(nome, d.toString('latin1')); else if (e.nome.endsWith('.jez') && prof < 3) await walk(emMemoria(d), `${nome}/${e.nome}`, prof + 1); } }
const filtro = new RegExp(process.argv[3] ?? 'ERRO|uescan|Timeout|Solicitação de dado pessoal|Tipo de habilitação|Ano de nascimento|Dado digitado|Urna ligada|computado');
function resumir(nome, t) { const c = new Map(); for (const l of t.split('\n')) { if (!l.startsWith('25/10/2026')) continue; const x = l.split('\t'); const m = `${x[1]} ${x[2]} ${(x[4] ?? '').replace(/\d{8,}/g, 'N').replace(/\[\d+\] de \[\d+\]/g, '[k]').slice(0, 140)}`; if (filtro.test(m)) c.set(m, (c.get(m) ?? 0) + 1); } console.log(`== ${nome}`); for (const [m, n] of [...c].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(`  ${n}\t${m}`); }
const jez = (await readdir(dir)).find((n) => n.endsWith('-log.jez'));
const h = await open(`${dir}/${jez}`); await walk(h, 'log.jez', 0); await h.close();
