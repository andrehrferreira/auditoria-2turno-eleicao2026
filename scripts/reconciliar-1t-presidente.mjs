// Reconcilia os votos de presidente do 1º turno: soma dos BUs (banco) × voto_oficial (banco) × os dois arquivos de
// dados abertos que divergem em 5.246 votos nominais (votacao_candidato_munzona 119.300.788 × detalhe_votacao_secao
// 119.306.034). Lê o banco primário só para leitura. Uso: node scripts/reconciliar-1t-presidente.mjs
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { DIR_DADOS } from '../src/config.js';

const db = new DatabaseSync(path.join(DIR_DADOS, 'db', 'eleicao2026.sqlite'), { readOnly: true });
const q = (s, ...p) => db.prepare(s).all(...p).map((r) => ({ ...r }));

console.log('Cobertura 1º turno:', q("select count(distinct uf) ufs, count(distinct uf||municipio||zona||secao) secoes from voto_bu where turno = 1 and cargo = 1 and eleicao = 6257"));
const bu = q("select coalesce(cast(numero as text), tipo_voto) k, tipo_voto, sum(quantidade) v from voto_bu where turno = 1 and cargo = 1 and eleicao = 6257 group by k, tipo_voto order by v desc");
const of = new Map(q("select cast(numero as text) k, sum(quantidade) v from voto_oficial where turno = 1 and cargo = 1 and eleicao = 6257 group by k").map((r) => [r.k, r.v]));
let nominalBu = 0;
console.log('\nnúmero/tipo        BU            oficial       diferença');
for (const r of bu) {
  if (r.tipo_voto === 'nominal') nominalBu += r.v;
  const o = of.get(r.k);
  console.log(`${String(r.k).padEnd(10)} ${r.tipo_voto.padEnd(8)} ${String(r.v).padStart(12)} ${String(o ?? '-').padStart(12)} ${o === undefined ? '' : String(r.v - o).padStart(10)}`);
}
console.log(`\nnominais (BU): ${nominalBu}   munzona: 119300788 (diferença ${nominalBu - 119300788})   detalhe_votacao_secao: 119306034 (diferença ${nominalBu - 119306034})`);
const tipos = q("select distinct tipo_voto from voto_bu where turno = 1 and cargo = 1 and eleicao = 6257");
console.log('tipos de voto no BU:', tipos.map((t) => t.tipo_voto).join(', '));
