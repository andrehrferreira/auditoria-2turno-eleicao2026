// Cético (H08): para seções escolhidas, conta "O voto do eleitor foi computado" no log bruto somado, em
// juntarLogs() sem seção e em juntarLogs() com a seção (correção da sessão -64), contra o comparecimento do BU.
// Uso: node scripts/auditoria/cetico-h08-juntar.mjs uf/mun/zona/secao[,...]
import { open, readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { listarEntradas, lerEntrada } from '../../src/zip.js';
import { lerBu } from '../../src/lacres.js';
import { juntarLogs } from '../../src/perfil-secoes.js';
const mem = (b) => ({ read: async (d, o, n, p) => ({ bytesRead: b.copy(d, o, p, p + n) }), stat: async () => ({ size: b.length }) });
async function txt(h, out = []) { for (const e of await listarEntradas(h)) { const d = await lerEntrada(h, e); if (e.nome === 'logd.dat') out.push(d.toString('latin1')); else if (e.nome.endsWith('.jez')) await txt(mem(d), out); } return out; }
const conta = (t) => t.split('\n').filter((l) => l.startsWith('25/10/2026') && l.split('\t')[4] === 'O voto do eleitor foi computado').length;
const res = [];
for (const alvo of process.argv[2].split(',')) {
  const dir = path.join(DIR_DADOS, 'raw', '2t', 'urnas', ...alvo.split('/'));
  const hash = (await readdir(dir))[0];
  const nomes = await readdir(path.join(dir, hash));
  const h = await open(path.join(dir, hash, nomes.find((n) => n.endsWith('-log.jez'))));
  const ts = await txt(h); await h.close();
  const bu = lerBu(await readFile(path.join(dir, hash, nomes.find((n) => n.endsWith('-bu.dat'))))).qtdEleitoresCompareceram;
  const sem = juntarLogs(ts), com = juntarLogs(ts, alvo.split('/')[3]);
  const r = { secao: alvo, bu, bruto: ts.reduce((a, t) => a + conta(t), 0), juntarSemSecao: conta(sem.texto), juntarComSecao: conta(com.texto), duplicadas: com.duplicadas, outrasSecoes: com.outrasSecoes };
  res.push(r); console.log(JSON.stringify(r));
}
await mkdir(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico'), { recursive: true });
await writeFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'h08-juntar.json'), JSON.stringify(res, null, 1));
