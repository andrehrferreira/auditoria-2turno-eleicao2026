// Verificação independente (docs/pericia/02): reconta, no arquivo bruto, os votos "computados" de cada log do pacote
// das seções em que BU e log não bateram de primeira. Cada log (logd.dat e .jez aninhados) é contado em separado;
// cópias do mesmo log não somam duas vezes porque o voto é identificado por (urna, data e hora da linha).
// Também conta ciclos com "Voto confirmado" sem "computado" antes do próximo eleitor, religamento ou fim do log.
// Uso: node scripts/auditoria/verifica-pericia-coerencia-logs.mjs --turno 2 uf/mun/zona/secao [...]
import { open, readdir } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { values: a, positionals } = parseArgs({ allowPositionals: true, options: { turno: { type: 'string', default: '2' } } });
const turno = Number(a.turno);
const dia = { 1: '04/10/2026', 2: '25/10/2026' }[turno];
const { db } = await abrirLeitura();
const q = db.prepare('SELECT hash, comparecimento, tipo_urna, tipo_arquivo, sem_biometria, por_biometria, por_biografia FROM secao WHERE turno = ? AND uf = ? AND municipio = ? AND zona = ? AND secao = ?');
const memoria = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });

async function logs(h, caminho, nivel = 0) {
  const out = [];
  for (const e of await listarEntradas(h)) {
    const buf = await lerEntrada(h, e);
    if (e.nome === 'logd.dat') out.push({ caminho, texto: buf.toString('latin1') });
    else if (e.nome.endsWith('.jez') && nivel < 4) out.push(...(await logs(memoria(buf), `${caminho}/${e.nome}`, nivel + 1)));
  }
  return out;
}

for (const alvo of positionals) {
  const [uf, mun, zona, sec] = alvo.split('/');
  const s = q.get(turno, uf, mun, zona, sec);
  const dir = `data/raw/${turno}t/urnas/${uf}/${mun}/${zona}/${sec}/${s.hash}`;
  const nome = (await readdir(dir)).find((n) => /-log(sa)?\.jez$/.test(n));
  const h = await open(`${dir}/${nome}`);
  let lista;
  try { lista = await logs(h, 'log.jez'); } finally { await h.close(); }
  console.log(`\n${alvo} [${s.tipo_urna}/${s.tipo_arquivo}] BU comparecimento ${s.comparecimento} (digital ${s.por_biometria}, biografia ${s.por_biografia}, sem biometria ${s.sem_biometria})`);
  const todos = new Set();
  for (const l of lista) {
    const linhas = l.texto.split(/\r?\n/).filter((x) => x.startsWith(dia)).map((x) => x.split('\t'));
    const secoes = new Set(linhas.map((c) => /^Seção Eleitoral: (\d+)/.exec(c[4] ?? '')?.[1]).filter(Boolean));
    const urnas = new Set(linhas.map((c) => c[2]));
    const comp = new Set(); let pend = false; let confirmadoSem = 0;
    const lib = { digital: 0, biografia: 0, semBio: 0 };
    for (const c of linhas) {
      const m = c[4] ?? '';
      if (/^O voto do eleitor foi computado/.test(m)) { comp.add(`${c[2]}|${c[0]}`); pend = false; }
      else if (/^Voto confirmado para/.test(m)) pend = true;
      else if (/^Eleitor foi habilitado/.test(m) || /^Urna ligada em/.test(m) || /^Início das operações do logd/.test(m)) { if (pend) confirmadoSem++; pend = false; }
    }
    if (pend) confirmadoSem++;
    for (const v of comp) todos.add(v);
    console.log(`  ${l.caminho}: urnas ${[...urnas].join(',')}; seção declarada ${[...secoes].join(',') || '-'}; computados ${comp.size}; confirmado sem computado ${confirmadoSem}; 1ª linha ${linhas[0]?.[0] ?? '-'}; última ${linhas.at(-1)?.[0] ?? '-'}`);
  }
  console.log(`  computados distintos no pacote (todas as cópias e seções declaradas): ${todos.size}`);
}
