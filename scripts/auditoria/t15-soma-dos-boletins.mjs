// T15, tópico 05 (soma dos boletins): confere os apontamentos dos modelos no universo completo do 2º turno.
// 1) Votos de Presidente (13+22+brancos+nulos) × comparecimento: por que a soma dos votos passa o comparecimento da tabela nacional.
// 2) As seções do 2º turno que ficam fora da comparação (sem voto de Presidente no BU) e a situação delas no aux.json.
// 3) Divergências BU × oficial (view v_divergencia_bu_oficial), por turno.
// Uso: node scripts/auditoria/t15-soma-dos-boletins.mjs   (saída: data/parsed/auditoria/t15/05-soma-dos-boletins.json)
import { mkdir, writeFile } from 'node:fs/promises';
import { abrirLeitura } from '../../src/banco-leitura.js';

const { db, ponteiro } = await abrirLeitura();
const q = (sql) => db.prepare(sql).all();

const votosXcomparecimento = q(`
  WITH v AS (SELECT uf, municipio, zona, secao, eleicao, SUM(quantidade) AS votos FROM voto_bu WHERE turno = 2 AND cargo = 1 GROUP BY 1,2,3,4,5)
  SELECT COUNT(*) AS secoes, SUM(v.votos) AS votos, SUM(s.comparecimento) AS comparecimento_secao,
    SUM(e.comparecimento_majoritario) AS comparecimento_eleicao_presidente,
    SUM(v.votos <> s.comparecimento) AS secoes_votos_dif_comparecimento_secao, SUM(v.votos - s.comparecimento) AS saldo,
    SUM(v.votos <> e.comparecimento_majoritario) AS secoes_votos_dif_comparecimento_eleicao
  FROM v JOIN secao s ON s.turno = 2 AND s.uf = v.uf AND s.municipio = v.municipio AND s.zona = v.zona AND s.secao = v.secao
  JOIN secao_eleicao e ON e.turno = 2 AND e.uf = v.uf AND e.municipio = v.municipio AND e.zona = v.zona AND e.secao = v.secao AND e.eleicao = v.eleicao`)[0];

const secoesDiferentes = q(`
  WITH v AS (SELECT uf, municipio, zona, secao, SUM(quantidade) AS votos FROM voto_bu WHERE turno = 2 AND cargo = 1 GROUP BY 1,2,3,4)
  SELECT s.uf, s.tipo_urna, s.tipo_arquivo, COUNT(*) AS secoes, SUM(v.votos) AS votos, SUM(s.comparecimento) AS comparecimento_secao
  FROM v JOIN secao s ON s.turno = 2 AND s.uf = v.uf AND s.municipio = v.municipio AND s.zona = v.zona AND s.secao = v.secao
  WHERE v.votos <> s.comparecimento GROUP BY 1,2,3`);

const foraDaComparacao = q(`
  SELECT s.situacao, s.status_aux, s.tipo_arquivo, COUNT(*) AS secoes, SUM(s.comparecimento) AS comparecimento
  FROM secao s WHERE s.turno = 2 AND NOT EXISTS (SELECT 1 FROM voto_bu v WHERE v.turno = 2 AND v.uf = s.uf AND v.municipio = s.municipio
    AND v.zona = s.zona AND v.secao = s.secao AND v.cargo = 1) GROUP BY 1,2,3`);

const secoesOficial = q(`SELECT turno, COUNT(*) AS secoes FROM (SELECT DISTINCT turno, uf, municipio, zona, secao FROM voto_oficial WHERE cargo = 1) GROUP BY turno`);
const divergencias = q(`SELECT turno, COUNT(*) AS linhas FROM v_divergencia_bu_oficial GROUP BY turno`);

const saida = { banco: ponteiro?.arquivo, cargas: ponteiro?.cargas, votosXcomparecimento, secoesDiferentes, foraDaComparacao, secoesOficial, divergencias };
await mkdir('data/parsed/auditoria/t15', { recursive: true });
await writeFile('data/parsed/auditoria/t15/05-soma-dos-boletins.json', JSON.stringify(saida, null, 1));
console.log(JSON.stringify(saida, null, 1));
