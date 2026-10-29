// H03 / doc 07 A1-B2: soma dos BUs × resultado oficial (votacao_secao) para Presidente, no país inteiro.
// Uso: node scripts/h03-bu-x-oficial.mjs [turno]   (lê data/db/eleicao2026.sqlite, só leitura)
import { DatabaseSync } from 'node:sqlite';

const turno = Number(process.argv[2] ?? 2);
const db = new DatabaseSync('data/db/eleicao2026.sqlite', { readOnly: true });
const numero = "CASE tipo_voto WHEN 'branco' THEN 95 WHEN 'nulo' THEN 96 ELSE numero END";
const bu = db.prepare(`SELECT ${numero} AS numero, SUM(quantidade) AS votos, COUNT(DISTINCT uf||municipio||zona||secao) AS secoes
  FROM voto_bu WHERE turno = ? AND cargo = 1 GROUP BY 1 ORDER BY votos DESC`).all(turno);
const oficial = db.prepare(`SELECT numero, SUM(quantidade) AS votos, COUNT(DISTINCT uf||municipio||zona||secao) AS secoes
  FROM voto_oficial WHERE turno = ? AND cargo = 1 GROUP BY 1 ORDER BY votos DESC`).all(turno);
const nomes = new Map(db.prepare('SELECT numero, nome FROM candidato WHERE turno = ? AND cargo = 1').all(turno).map((c) => [c.numero, c.nome]));
const porNumero = new Map(oficial.map((o) => [o.numero, o]));
console.log(`Presidente, ${turno}º turno: soma dos BUs × votacao_secao (dados abertos)`);
for (const b of bu) {
  const o = porNumero.get(b.numero);
  const nome = b.numero === 95 ? 'BRANCO' : b.numero === 96 ? 'NULO' : nomes.get(b.numero) ?? b.numero;
  console.log(`  ${String(nome).padEnd(20)} BU ${String(b.votos).padStart(11)}  oficial ${String(o?.votos ?? 0).padStart(11)}  diferença ${b.votos - (o?.votos ?? 0)}`);
}
const div = db.prepare('SELECT COUNT(*) AS linhas, COUNT(DISTINCT uf||municipio||zona||secao) AS secoes FROM v_divergencia_bu_oficial WHERE turno = ? AND cargo = 1').get(turno);
const secoesBu = db.prepare('SELECT COUNT(DISTINCT uf||municipio||zona||secao) AS n FROM voto_bu WHERE turno = ? AND cargo = 1').get(turno).n;
const secoesOf = db.prepare('SELECT COUNT(DISTINCT uf||municipio||zona||secao) AS n FROM voto_oficial WHERE turno = ? AND cargo = 1').get(turno).n;
console.log(`Seções com BU: ${secoesBu} · seções no oficial: ${secoesOf} · linhas divergentes: ${div.linhas} em ${div.secoes} seções`);
if (div.linhas) console.log(db.prepare('SELECT * FROM v_divergencia_bu_oficial WHERE turno = ? AND cargo = 1 LIMIT 15').all(turno));
