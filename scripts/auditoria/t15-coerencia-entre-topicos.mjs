// T15, coerência entre tópicos: reconta, na cópia de leitura, os números usados para desempatar contradições
// entre os arquivos de docs/pericia/ (universo completo, 2º turno, 28 UFs).
// Uso: node scripts/auditoria/t15-coerencia-entre-topicos.mjs
// Saída: data/parsed/auditoria/t15/coerencia-entre-topicos.json
// (A comparação de Governador por município e zona é feita por scripts/auditoria/verifica-pericia-coerencia-munzona.mjs --turno 2.)
import { mkdirSync, writeFileSync } from 'node:fs';
import { abrirLeitura } from '../../src/banco-leitura.js';

const { db } = await abrirLeitura();
const um = (sql, ...p) => db.prepare(sql).get(...p);
const todos = (sql, ...p) => db.prepare(sql).all(...p);

// 1. Comparecimento ≥ 95% × > 95% (eleição de Presidente, a que existe em todas as seções do 2º turno)
const eleicaoPres = um('SELECT eleicao FROM secao_eleicao WHERE turno = 2 GROUP BY eleicao ORDER BY COUNT(*) DESC LIMIT 1').eleicao;
const comparecimento95 = um(`SELECT COUNT(*) secoes,
    SUM(comparecimento_majoritario * 100 > aptos * 95) acima95,
    SUM(comparecimento_majoritario * 100 >= aptos * 95) de95ouMais,
    SUM(comparecimento_majoritario * 100 = aptos * 95) exatamente95,
    SUM(comparecimento_majoritario = aptos) cem,
    SUM(comparecimento_majoritario > aptos) acimaDosAptos
  FROM secao_eleicao WHERE turno = 2 AND eleicao = ?`, eleicaoPres);

// 2. Datas de carga das urnas do 2º turno
const carga = um(`SELECT MIN(data_hora_carga) primeira, MAX(data_hora_carga) ultima, COUNT(data_hora_carga) secoes,
    SUM(data_hora_carga < '2026-10-05') ate04out, SUM(data_hora_carga >= '2026-10-05') depois09out,
    SUM(data_hora_carga < '2026-09-16') antes16set, SUM(data_hora_carga >= '2026-09-30' AND data_hora_carga < '2026-10-05') de30setA04out
  FROM secao WHERE turno = 2`);

// 3. Aumento de comparecimento sem digital, Brasil sem exterior e sem seções do Sistema de Apuração em algum turno
const aumento = um(`SELECT COUNT(*) secoes, SUM(b.comparecimento - a.comparecimento) aumento,
    SUM(b.sem_biometria - a.sem_biometria) anoDeNascimento, SUM(b.por_biografia - a.por_biografia) liberacaoManual,
    SUM(b.sem_biometria + b.por_biografia - a.sem_biometria - a.por_biografia) semDigital
  FROM secao a JOIN secao b ON b.turno = 2 AND b.uf = a.uf AND b.municipio = a.municipio AND b.zona = a.zona AND b.secao = a.secao
  WHERE a.turno = 1 AND a.uf <> 'zz' AND a.tipo_urna <> 'contingencia' AND b.tipo_urna <> 'contingencia' AND a.comparecimento IS NOT NULL`);

// 4. Tipo de urna no 2º turno e o caso de Ipixuna-AM 0045/0063 nos dois turnos
const tiposUrna2t = todos('SELECT tipo_urna, COUNT(*) secoes FROM secao WHERE turno = 2 GROUP BY tipo_urna ORDER BY secoes DESC');
const ipixuna = todos(`SELECT turno, municipio, tipo_urna, numero_interno_urna, data_hora_carga, comparecimento FROM secao
  WHERE uf = 'am' AND zona = '0045' AND secao = '0063' AND municipio = '02399' ORDER BY turno`);

const saida = { comparecimento95, carga, aumento, tiposUrna2t, ipixuna };
mkdirSync('data/parsed/auditoria/t15', { recursive: true });
writeFileSync('data/parsed/auditoria/t15/coerencia-entre-topicos.json', JSON.stringify(saida, null, 1));
console.log(JSON.stringify(saida, null, 1));
