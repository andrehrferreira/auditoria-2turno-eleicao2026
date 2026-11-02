// Estatístico eleitoral, doc 30 (plano 29): tetos aritméticos para "o efeito máximo pode mudar o vencedor?".
// 2º turno, todas as seções do banco: votos do 13 e do 22 (Presidente) pelo BU e pelo resultado oficial, comparecimento e as
// três categorias de habilitação (fora do exterior), e o comparecimento do exterior (lá, 100% liberado pelo ano de nascimento).
// Uso: node scripts/auditoria/estatistico-h02-h05-final-teto.mjs
// Saída: data/parsed/auditoria/estatistico-eleitoral/h02-h05-final/teto.json
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

const { db, ponteiro } = await abrirLeitura();
const bu = Object.fromEntries(db.prepare('SELECT numero, SUM(quantidade) q FROM voto_bu WHERE turno = 2 AND cargo = 1 AND numero IN (13, 22) GROUP BY numero').all().map((r) => [r.numero, r.q]));
let oficial = null;
try { oficial = Object.fromEntries(db.prepare('SELECT numero, SUM(quantidade) q FROM voto_oficial WHERE turno = 2 AND cargo = 1 AND numero IN (13, 22) GROUP BY numero').all().map((r) => [r.numero, r.q])); } catch (e) { oficial = { erro: e.message }; }
const hab = { ...db.prepare(`SELECT COUNT(*) secoes, SUM(comparecimento) c, SUM(sem_biometria) sb, SUM(por_biometria) pb, SUM(por_biografia) pg FROM secao WHERE turno = 2 AND uf <> 'zz'`).get() };
const ext = { ...db.prepare(`SELECT COUNT(*) secoes, SUM(comparecimento) c FROM secao WHERE turno = 2 AND uf = 'zz'`).get() };
db.close();
const margem = bu[13] - bu[22];
const semDigital = hab.sb + hab.pg + ext.c;
const res = { geradoEm: new Date().toISOString(), copia: ponteiro?.arquivo ?? null, presidente2t: { bu, oficial, margemBu: margem }, habilitacao2tSemExterior: hab, exterior2t: ext,
  tetoSemDigital: semDigital, tetoMaiorQueMargem: semDigital > margem, insercaoMinimaParaVirar: margem,
  nota: 'inserção a favor do 13: tirar V votos inseridos reduz a margem em V; para virar, V ≥ margem. Troca de voto (13 no lugar de 22) precisaria de V ≥ margem / 2.' };
await writeFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico-eleitoral', 'h02-h05-final', 'teto.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
