// Auditoria C (A10/H08): tempo de cada ciclo de voto no log bruto, separado pelo número de cargos que o eleitor
// confirmou ("Voto confirmado para [cargo]"), para achar o mínimo real com 1 e com 2 cargos (o eleitor em trânsito
// vota só para presidente, então o número de cargos do BU não basta). Resolução do log: 1 s.
// Uso: node scripts/auditoria/tempo-ciclos.mjs --uf ac,df,rn,to [--paralelo 4]
// Saída: data/parsed/auditoria/tempo/2t/ciclos-<ufs>.json
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerLogs } from '../../src/perfil-secoes.js';

const DIA = '25/10/2026';
const seg = (l) => Number(l.slice(11, 13)) * 3600 + Number(l.slice(14, 16)) * 60 + Number(l.slice(17, 19));
const sub = async (d) => (await readdir(d, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);

async function processar(secoes) {
  // por número de cargos confirmados: histograma de habilitação→computado e menores casos
  const hist = {}, menores = [];
  let duplicadas = 0;
  for (const dir of secoes) {
    for (const hash of await sub(dir)) {
      const nomes = await readdir(path.join(dir, hash));
      const log = acharArquivo(nomes, 'log');
      if (!log || !acharArquivo(nomes, 'bu')) continue;
      const { texto } = await lerLogs(path.join(dir, hash, log));
      const vistas = new Set();
      let hab = null, conf = 0, primeiraConf = null;
      for (const l of texto.split('\n')) {
        if (!l.startsWith(DIA)) continue;
        if (vistas.has(l)) { duplicadas++; continue; } // registro repetido (cópia do log na contingência)
        vistas.add(l);
        const m = l.split('\t')[4] ?? '';
        if (m === 'Eleitor foi habilitado') { hab = seg(l); conf = 0; primeiraConf = null; }
        else if (m.startsWith('Voto confirmado para [')) { conf++; primeiraConf ??= seg(l); }
        else if (m === 'O voto do eleitor foi computado' && hab !== null) {
          const t = seg(l) - hab;
          const h = (hist[conf] ??= {});
          h[Math.min(t, 120)] = (h[Math.min(t, 120)] ?? 0) + 1;
          if ((conf >= 2 && t <= 5) || t <= 1) menores.push({ secao: path.relative(path.join(DIR_DADOS, 'raw', '2t', 'urnas'), dir).replaceAll('\\', '/'), cargos: conf, segundos: t, habAtePrimeiraConfirmacao: primeiraConf - hab, hora: l.slice(11, 19) });
          hab = null;
        } else if (m === 'Aguardando digitação do identificador do eleitor') hab = null;
      }
      break;
    }
  }
  return { hist, menores, duplicadas };
}

if (!isMainThread) parentPort.postMessage(await processar(workerData));
else {
  const { values } = parseArgs({ options: { uf: { type: 'string' }, paralelo: { type: 'string', default: '4' } } });
  const ufs = values.uf.split(',');
  const secoes = [];
  for (const uf of ufs) {
    const base = path.join(DIR_DADOS, 'raw', '2t', 'urnas', uf);
    for (const mun of await sub(base)) for (const z of await sub(path.join(base, mun))) for (const s of await sub(path.join(base, mun, z))) secoes.push(path.join(base, mun, z, s));
  }
  const k = Number(values.paralelo);
  const partes = await Promise.all(Array.from({ length: k }, (_, i) => new Promise((resolve, reject) => {
    const w = new Worker(import.meta.filename, { workerData: secoes.filter((_, j) => j % k === i) });
    w.on('message', resolve); w.on('error', reject);
  })));
  const hist = {};
  for (const p of partes) for (const [c, h] of Object.entries(p.hist)) for (const [t, n] of Object.entries(h)) { hist[c] ??= {}; hist[c][t] = (hist[c][t] ?? 0) + n; }
  const menores = partes.flatMap((p) => p.menores).sort((a, b) => a.segundos - b.segundos);
  const resumo = { ufs, secoes: secoes.length, linhasDuplicadasIgnoradas: partes.reduce((a, p) => a + p.duplicadas, 0), ciclosPorCargosConfirmados: Object.fromEntries(Object.entries(hist).map(([c, h]) => [c, Object.values(h).reduce((a, b) => a + b, 0)])), habilitacaoAteComputadoSegundos: hist, menores };
  const saida = path.join(DIR_DADOS, 'parsed', 'auditoria', 'tempo', '2t', `ciclos-${ufs.join('-')}.json`);
  await writeFile(saida, JSON.stringify(resumo, null, 1));
  console.log(JSON.stringify({ ...resumo, habilitacaoAteComputadoSegundos: Object.fromEntries(Object.entries(hist).map(([c, h]) => [c, Object.fromEntries(Object.entries(h).slice(0, 8))])), menores: menores.slice(0, 25) }, null, 1));
}
