// Cético, achado "votos sem rastro no log", lente de dados: o log que falta estaria em OUTRO pacote da mesma zona?
// Varre todos os pacotes (seções) de uma zona, abre o log.jez e os .jez aninhados, e lista as linhas que contêm algum
// dos termos (número de urna, serial de MV, código de carga). Para cada pacote com acerto: seção, caminho do log,
// nº de linhas com acerto, a 1ª e a última. Sem amostra: todas as seções da zona em todos os municípios dela.
// Uso: node scripts/auditoria/cetico-vsr-dados-busca-zona.mjs --turno 1 --uf ba --zona 0183 --termo 02424441 --termo 008B59DC
// Saída: data/parsed/auditoria/cetico/cetico-vsr-dados-busca-zona-<t>t-<uf>-<zona>.json
import { mkdir, open, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { values } = parseArgs({ options: { turno: { type: 'string' }, uf: { type: 'string' }, zona: { type: 'string' }, termo: { type: 'string', multiple: true } } });
const termos = values.termo ?? [];
const memoria = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
const subdirs = async (d) => {
  try {
    return (await readdir(d, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  } catch {
    return [];
  }
};

async function varrer(handle, nome, acertos) {
  for (const e of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, e);
    if (e.nome === 'logd.dat') {
      const linhas = dados.toString('latin1').split('\n').filter((l) => termos.some((t) => l.includes(t)));
      if (linhas.length) acertos.push({ log: nome, linhas: linhas.length, primeira: linhas[0].trim(), ultima: linhas.at(-1).trim(),
        porTermo: Object.fromEntries(termos.map((t) => [t, linhas.filter((l) => l.includes(t)).length])) });
    } else if (e.nome.endsWith('.jez')) await varrer(memoria(dados), `${nome}/${e.nome}`, acertos);
  }
}

const base = path.join(DIR_DADOS, 'raw', `${values.turno}t`, 'urnas', values.uf);
const resultado = { turno: Number(values.turno), uf: values.uf, zona: values.zona, termos, secoes: 0, pacotes: 0, semLog: 0, erros: [], acertos: [] };
for (const municipio of await subdirs(base)) {
  const dz = path.join(base, municipio, values.zona);
  for (const secao of await subdirs(dz)) {
    resultado.secoes++;
    for (const h of await subdirs(path.join(dz, secao))) {
      const dh = path.join(dz, secao, h);
      const nomeLog = (await readdir(dh)).find((n) => n.endsWith('-log.jez'));
      if (!nomeLog) {
        resultado.semLog++;
        continue;
      }
      resultado.pacotes++;
      const acertos = [];
      const handle = await open(path.join(dh, nomeLog));
      try {
        await varrer(handle, nomeLog, acertos);
      } catch (e) {
        resultado.erros.push({ secao: `${municipio}/${values.zona}/${secao}`, erro: e.message });
      } finally {
        await handle.close();
      }
      for (const a of acertos) resultado.acertos.push({ secao: `${municipio}/${values.zona}/${secao}`, ...a });
    }
  }
}
const destino = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');
await mkdir(destino, { recursive: true });
await writeFile(path.join(destino, `cetico-vsr-dados-busca-zona-${values.turno}t-${values.uf}-${values.zona}.json`), `${JSON.stringify(resultado, null, 1)}\n`);
console.log(`${values.turno}t ${values.uf} zona ${values.zona}: ${resultado.secoes} seções, ${resultado.pacotes} pacotes com log, ${resultado.semLog} sem log, ${resultado.erros.length} erros`);
for (const a of resultado.acertos) console.log(`  ${a.secao} ${a.log} ${a.linhas} linhas ${JSON.stringify(a.porTermo)}\n     1ª: ${a.primeira.slice(0, 150)}\n     últ: ${a.ultima.slice(0, 150)}`);
