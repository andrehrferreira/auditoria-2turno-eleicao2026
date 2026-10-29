// H13, método descritivo: comparação entre as 27 UFs (exploratória, n = 27) da taxa de liberação e da parcela do 13,
// a partir de descritivo-resumo.json (rode antes liberacao-descritivo-distribuicao.mjs).
// Uso: node scripts/auditoria/liberacao-descritivo-ufs.mjs   Saída: data/parsed/auditoria/liberacao/descritivo-ufs.json
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { pearson, spearman } from './biometria-comum.mjs';

const DIR = path.join(DIR_DADOS, 'parsed', 'auditoria', 'liberacao');
const r = JSON.parse(await readFile(path.join(DIR, 'descritivo-resumo.json'), 'utf8'));
const a = r.turnos[1].porUf, b = r.turnos[2].porUf;
const ufs = Object.keys(b).filter((u) => u !== 'zz').sort();
const NE = new Set(['al', 'ba', 'ce', 'ma', 'pb', 'pe', 'pi', 'rn', 'se']);
const col = (f) => ufs.map(f);
const r3 = (x) => +x.toFixed(3);
const dL1 = col((u) => b[u].taxaL1 - a[u].taxaL1), dL2 = col((u) => b[u].taxaL2 - a[u].taxaL2), dP = col((u) => b[u].parcela13 - a[u].parcela13);
const media = (v, filtro) => { const s = v.filter((_, i) => filtro(ufs[i])); return r3(s.reduce((x, y) => x + y, 0) / s.length); };
const saida = {
  ufs: ufs.length,
  nivel2T: {
    spearmanL1xParcela13: r3(spearman(col((u) => b[u].taxaL1), col((u) => b[u].parcela13))),
    spearmanL2xParcela13: r3(spearman(col((u) => b[u].taxaL2), col((u) => b[u].parcela13))),
    spearmanManualxParcela13: r3(spearman(col((u) => b[u].taxaManual), col((u) => b[u].parcela13))),
  },
  variacao1Tpara2T: {
    spearmanDeltaL1xDeltaParcela13: r3(spearman(dL1, dP)), pearsonDeltaL1xDeltaParcela13: r3(pearson(dL1, dP)),
    spearmanDeltaL2xDeltaParcela13: r3(spearman(dL2, dP)),
    deltaL1MedioNordestePp: media(dL1, (u) => NE.has(u)), deltaL1MedioOutrasPp: media(dL1, (u) => !NE.has(u)),
    deltaParcela13MedioNordestePp: media(dP, (u) => NE.has(u)), deltaParcela13MedioOutrasPp: media(dP, (u) => !NE.has(u)),
  },
  porUf: Object.fromEntries(ufs.map((u, i) => [u, { deltaL1Pp: r3(dL1[i]), deltaL2Pp: r3(dL2[i]), deltaParcela13Pp: r3(dP[i]) }])),
};
await writeFile(path.join(DIR, 'descritivo-ufs.json'), JSON.stringify(saida, null, 1));
console.log(JSON.stringify({ nivel2T: saida.nivel2T, variacao1Tpara2T: saida.variacao1Tpara2T }, null, 1));
