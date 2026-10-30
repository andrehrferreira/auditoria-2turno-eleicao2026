import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

// Revisão cética nº 24. Conferência no bruto: para uma seção e uma urna, lista cada logd.dat do pacote oficial
// (principal e aninhados) com o código de carga, a primeira e a última linha da urna, as linhas de acerto de relógio
// ("Data e hora que foi digitada", "Data e hora atualizada", ADH) e os saltos de data para trás.
// Uso: node scripts/auditoria/cetico-integridade-log-urna.mjs --turno 2 --secao se/32417/0022/0096 --urna 02286264

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, secao: { type: 'string' }, urna: { type: 'string' } } });
const dir = path.join(DIR_DADOS, 'raw', `${values.turno}t`, 'urnas', ...values.secao.split('/'));
const mem = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
async function textos(h, prof = 0) {
  const out = [];
  for (const e of await listarEntradas(h)) {
    const d = await lerEntrada(h, e);
    if (e.nome === 'logd.dat') out.push({ prof, texto: d.toString('latin1') });
    else if (e.nome.endsWith('.jez') && prof < 3) out.push(...(await textos(mem(d), prof + 1)));
  }
  return out;
}
const aux = JSON.parse(await readFile(path.join(dir, 'aux.json'), 'utf8'));
const ordem = (d) => `${d.slice(6, 10)}${d.slice(3, 5)}${d.slice(0, 2)}${d.slice(11, 19)}`;
for (const h of aux.hashes.filter((x) => x.hash && x.hash !== '0' && (x.arq ?? []).some((a) => a.nm))) {
  const nomes = await readdir(path.join(dir, h.hash));
  for (const t of await textos(mem(await readFile(path.join(dir, h.hash, acharArquivo(nomes, 'log')))))) {
    const ls = t.texto.split('\n').map((l) => l.replace(/\r$/, '').split('\t')).filter((c) => c.length >= 5);
    const minhas = ls.filter((c) => c[2] === values.urna);
    if (!minhas.length) continue;
    const carga = ls.find((c) => c[4].startsWith('Código de carga '))?.[4] ?? '?';
    console.log(`\n== log prof ${t.prof}: ${ls.length} linhas, ${minhas.length} da urna ${values.urna}; ${carga}`);
    console.log(`   primeira: ${minhas[0].slice(0, 5).join(' | ')}`);
    console.log(`   última:   ${minhas.at(-1).slice(0, 5).join(' | ')}`);
    let max = '';
    for (const c of ls) {
      const o = ordem(c[0]);
      if (/digitada pelo operador|Data e hora atualizada|Ajuste de Data e Hora|Início das operações do logd/.test(c[4]) || (max && o < max)) {
        if (/digitada|atualizada|Ajuste/.test(c[4]) || (max && o < max)) console.log(`   ${c[0]} ${c[2]} ${c[3]} ${c[4].slice(0, 90)}${max && o < max ? `   <-- volta (máx. anterior ${max})` : ''}`);
      }
      if (o > max) max = o;
    }
  }
}
