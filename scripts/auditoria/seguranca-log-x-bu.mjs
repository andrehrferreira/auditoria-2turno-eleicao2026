// Votos no log × comparecimento do BU, país inteiro (perfil engenheiro-seguranca-urna).
// Ataque testado: voto que entra no BU sem rastro no log (ou log com votos que o BU não tem). O BU, o RDV e o log são
// gravados pela mesma urna; divergência entre eles é o rastro que uma inserção ou remoção de votos fora do fluxo deixaria.
// 1) Banco: perfil_log.votos_computados (log do dia, todos os logd.dat do pacote juntos) × secao.comparecimento (BU).
// 2) Para cada seção divergente, a varredura do perfil (<uf>.secoes.jsonl) mostra cada logd.dat: nº da urna, boots e votos.
// Uso: node scripts/auditoria/seguranca-log-x-bu.mjs [--turno 2]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' } } });
const turno = Number(values.turno);
const { db, fonte } = await abrirLeitura();
console.error(`banco: ${fonte}`);
const base = path.join(DIR_DADOS, 'parsed', 'auditoria', 'engenheiro-seguranca-urna');

const total = db.prepare(`SELECT COUNT(*) AS n FROM secao s JOIN perfil_log p ON p.turno = s.turno AND p.uf = s.uf AND p.municipio = s.municipio
  AND p.zona = s.zona AND p.secao = s.secao AND p.hash = s.hash WHERE s.turno = ? AND s.situacao = 'completa' AND s.tipo_arquivo NOT LIKE 'sa%'`).get(turno).n;
const div = db.prepare(`SELECT s.uf, s.municipio, s.zona, s.secao, s.tipo_urna, s.tipo_arquivo, s.comparecimento AS bu, p.votos_computados AS log,
    json_extract(p.dados, '$.log.logsNoPacote') AS logs
  FROM secao s JOIN perfil_log p ON p.turno = s.turno AND p.uf = s.uf AND p.municipio = s.municipio AND p.zona = s.zona AND p.secao = s.secao AND p.hash = s.hash
  WHERE s.turno = ? AND s.situacao = 'completa' AND s.tipo_arquivo NOT LIKE 'sa%' AND p.votos_computados != s.comparecimento
  ORDER BY ABS(s.comparecimento - p.votos_computados) DESC`).all(turno);
console.log(`Seções com BU e perfil de log: ${total}. Votos no log ≠ comparecimento do BU: ${div.length}.`);
console.log(`BU maior que o log: ${div.filter((d) => d.bu > d.log).length} seções (${div.filter((d) => d.bu > d.log).reduce((a, d) => a + d.bu - d.log, 0)} votos); log maior que o BU: ${div.filter((d) => d.log > d.bu).length} seções.`);

const detalhes = [];
const cache = new Map();
for (const d of div) {
  const arq = path.join(base, `${turno}t`, `${d.uf}.secoes.jsonl`);
  let linhas = cache.get(d.uf);
  if (!linhas && existsSync(arq)) cache.set(d.uf, (linhas = readFileSync(arq, 'utf8').split('\n')));
  const alvo = linhas?.find((l) => l.includes(`"municipio":"${d.municipio}","zona":"${d.zona}","secao":"${d.secao}"`));
  const r = alvo ? JSON.parse(alvo) : null;
  const logs = r?.logs.map((l) => ({
    nome: l.nome, profundidade: l.profundidade, urnas: l.urnas, modelo: l.modelo,
    votosDia: l.boots.reduce((a, b) => a + b.votos, 0),
    boots: l.boots.map((b) => `${b.ligada}→${b.ultimaLinha} votos=${b.votos}${b.pronta ? ' pronta' : ''}`),
  })) ?? null;
  // Mesmo nº de urna em mais de um logd.dat do pacote: o mesmo log aparece duas vezes (cópia), e somar dobra os votos
  const urnasLogs = logs?.map((l) => l.urnas.join(',')) ?? [];
  const duplicado = urnasLogs.length !== new Set(urnasLogs).size;
  const porUrna = {};
  for (const l of logs ?? []) porUrna[l.urnas.join(',')] = Math.max(porUrna[l.urnas.join(',')] ?? 0, l.votosDia);
  const somaSemDuplicar = Object.values(porUrna).reduce((a, b) => a + b, 0);
  detalhes.push({ ...d, diferenca: d.bu - d.log, logDuplicado: duplicado, votosSemDuplicar: logs ? somaSemDuplicar : null, buMenosSemDuplicar: logs ? d.bu - somaSemDuplicar : null, logs });
}
writeFileSync(path.join(base, `log-x-bu-${turno}t.json`), JSON.stringify(detalhes, null, 1));
for (const d of detalhes) {
  console.log(`\n${d.uf}/${d.municipio}/${d.zona}/${d.secao} ${d.tipo_urna}/${d.tipo_arquivo}: BU ${d.bu}, log ${d.log} (${d.logs === null ? 'varredura da UF pendente' : `${d.logs?.length} logd.dat; mesmo nº de urna repetido: ${d.logDuplicado}; votos sem contar log repetido: ${d.votosSemDuplicar}; BU − isso: ${d.buMenosSemDuplicar}`})`);
  for (const l of d.logs ?? []) console.log(`  logd prof=${l.profundidade} urna=${l.urnas.join(',')} ${l.modelo} votos=${l.votosDia} | ${l.boots.join(' ; ')}`);
}
