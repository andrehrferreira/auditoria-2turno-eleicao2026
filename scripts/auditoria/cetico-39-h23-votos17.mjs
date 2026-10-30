// Cético, parecer 39 (H23): teste de voto nas seções cujo BU do 2º turno saiu de recarga sem motivo pela regra ESTRITA
// (39-h23-regra.json: "Problema ao desmontar a MR" e "Falha na captura da digital" não contam como motivo).
// Usa o mesmo teste do matemático (testeZona, permutação dentro da zona, 2.000 sorteios), para comparar com os 10.
// Uso: node scripts/auditoria/cetico-39-h23-votos17.mjs → data/parsed/auditoria/cetico-revisor/39-h23-votos17.json
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { carregarSecoes, somar, testeZona } from './matematico-h23-lib.mjs';

const OUT = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor');
const regra = JSON.parse(await readFile(path.join(OUT, '39-h23-regra.json'), 'utf8'));
const h23 = JSON.parse(await readFile(path.join(OUT, '39-h23.json'), 'utf8'));
const novos = regra['2t'].novosSemMotivo.map((x) => x.geraBu).filter(Boolean);
const set = new Set([...h23['2t'].buSemMotivo, ...novos]);
const { db, fonte } = await abrirLeitura();
const S = carregarSecoes(db);
db.close();
const R = { fonte, secoes: [...set].sort(), n: set.size, somas: somar(S, [...set]), testes: {} };
for (const medida of ['comparecimento', 'parcela13', 'brancosNulos']) {
  const r = testeZona(S, set, medida, { modo: 'variacao', grupo: 'zona' });
  R.testes[medida] = { n: r.n, efeitoPp: +r.efeito.toFixed(3), p: +r.p.toFixed(4), faixa95: r.nulo95.map((x) => +x.toFixed(3)) };
}
await writeFile(path.join(OUT, '39-h23-votos17.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
