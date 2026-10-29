// Conferência de casos citados em docs/pericia/03-linha-do-tempo.md no log BRUTO (só confirma; não gera número).
// Abre o .jez da seção com src/zip.js, desce nos .jez aninhados e imprime, de cada logd.dat em separado (sem juntar
// nem tirar duplicatas), as linhas do dia que casam com --filtro (regex) e, opcionalmente, a janela --de/--ate (hh:mm).
// Uso: node scripts/auditoria/verifica-pericia-linha-do-tempo-bruto.mjs --turno 2 --secao uf/mun/zona/secao [--filtro re] [--de 07:00 --ate 09:00] [--contar re]
import { open, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { listarEntradas, lerEntrada } from '../../src/zip.js';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, secao: { type: 'string' }, filtro: { type: 'string' }, de: { type: 'string' }, ate: { type: 'string' }, contar: { type: 'string' }, ruido: { type: 'boolean' } } });
const DIA = values.turno === '2' ? '25/10/2026' : '04/10/2026';
const memoria = (buf) => ({ read: async (d, o, n, p) => ({ bytesRead: buf.copy(d, o, p, p + n) }), stat: async () => ({ size: buf.length }) });
async function textos(handle, rotulo, prof = 0) {
  const out = [];
  for (const e of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, e);
    if (e.nome === 'logd.dat') out.push({ origem: `${rotulo}/logd.dat`, texto: dados.toString('latin1') });
    else if (e.nome.endsWith('.jez') && prof < 4) out.push(...(await textos(memoria(dados), `${rotulo}/${e.nome}`, prof + 1)));
  }
  return out;
}
const RUIDO = /^(Verificação de assinatura|Urna ligada conectada|Espaço (livre|utilizado)|Quantidade de memória)/;
const re = values.filtro ? new RegExp(values.filtro) : null;
const [uf, mun, zona, secao] = values.secao.split('/');
const dir = path.join(DIR_DADOS, 'raw', `${values.turno}t`, 'urnas', uf, mun, zona, secao);
for (const hash of (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name)) {
  const nLog = (await readdir(path.join(dir, hash))).find((n) => /log\.?jez$/.test(n) || n.endsWith('.logjez'));
  if (!nLog) continue;
  const h = await open(path.join(dir, hash, nLog));
  let ts; try { ts = await textos(h, nLog); } finally { await h.close(); }
  for (const { origem, texto } of ts) {
    const ls = texto.split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.startsWith(DIA));
    console.log(`== ${hash.slice(0, 8)} ${origem}: ${ls.length} linhas do dia, urnas ${[...new Set(ls.map((l) => l.split('\t')[2]))].join(',')}, votos ${ls.filter((l) => l.split('\t')[4] === 'O voto do eleitor foi computado').length}, linhas idênticas repetidas ${ls.length - new Set(ls).size}`);
    if (values.contar) { const rc = new RegExp(values.contar); console.log(`   contar /${values.contar}/: ${ls.filter((l) => rc.test(l.split('\t')[4] ?? '')).length}`); }
    for (const l of ls) {
      const c = l.split('\t'); const hm = c[0].slice(11, 16);
      if (values.de && hm < values.de) continue; if (values.ate && hm > values.ate) continue;
      if (!values.ruido && RUIDO.test(c[4] ?? '')) continue;
      if (re && !re.test(c[4] ?? '')) continue;
      console.log(`${c[0].slice(11)} ${(c[1] ?? '').padEnd(6)} ${c[2]} ${(c[3] ?? '').padEnd(8)} ${c[4]}`);
    }
  }
}
