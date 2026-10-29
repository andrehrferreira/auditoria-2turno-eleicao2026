// Cético (H08): imprime, para cada logd.dat de um pacote (inclusive .jez aninhados), as linhas de identificação
// (seção, município, zona, mídia, recuperação). Uso: node scripts/auditoria/cetico-h08-declaracoes.mjs <dir da seção>
import { open } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { listarEntradas, lerEntrada } from '../../src/zip.js';
const mem = (buf) => ({ read: async (d, o, n, p) => ({ bytesRead: buf.copy(d, o, p, p + n) }), stat: async () => ({ size: buf.length }) });
async function txt(h, r, out = []) { for (const e of await listarEntradas(h)) { const d = await lerEntrada(h, e); if (e.nome === 'logd.dat') out.push([r, d.toString('latin1')]); else if (e.nome.endsWith('.jez')) await txt(mem(d), r + '/' + e.nome, out); } return out; }
const dir = process.argv[2];
const hash = readdirSync(dir)[0];
const f = readdirSync(path.join(dir, hash)).find((n) => n.endsWith('-log.jez'));
const h = await open(path.join(dir, hash, f));
for (const [r, t] of await txt(h, f)) {
  console.log('== ' + r);
  const ls = t.split('\n');
  for (const l of ls) { const m = (l.split('\t')[4] ?? ''); if (/Seção Eleitoral|Município|Zona Eleitoral|Turno|Fase|Identificação da Mídia|Modo de|recupera|Recupera|Carga|contingência|Contingência|Data e hora|Iniciando aplica|substitu/i.test(m)) console.log('  ' + l.split('\t').slice(0,1).concat(l.split('\t').slice(2,5)).join(' | ')); }
}
await h.close();
