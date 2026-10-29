// Revisor cético, achado "numeros-omitidos-munzona": fecha o nulo técnico (vnt) dos pares UF×cargo em que
// vnt ≠ votos nominais dos números omitidos. Hipótese testada: a diferença é voto de legenda (BU) de partido
// cuja lista inteira não aparece no JSON de resultados (lista invalidada → legenda vira nulo técnico).
// Entrada: data/parsed/auditoria/cetico/numeros-omitidos-munzona-reproducao-nulos.csv (de ...-reproducao.mjs).
// Uso: node scripts/auditoria/cetico-numeros-omitidos-munzona-legenda.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const SAIDA = 'data/parsed/auditoria/cetico';
const db = new DatabaseSync('data/db/eleicao2026.sqlite', { readOnly: true });
const q = db.prepare(`SELECT partido, SUM(quantidade) q FROM voto_bu WHERE turno = 1 AND uf = ? AND cargo = ? AND tipo_voto = 'legenda' GROUP BY partido`);
const linhas = readFileSync(`${SAIDA}/numeros-omitidos-munzona-reproducao-nulos.csv`, 'utf8').trim().split('\n');
const cab = linhas.shift().split(';');
const out = ['uf;cargo;vnt_oficial;omitidos_nominais_bu;legenda_bu_partidos_sem_lista;partidos_sem_lista;fecha'];
let fecha = 0, total = 0;
for (const l of linhas) {
  const o = Object.fromEntries(l.split(';').map((v, i) => [cab[i], v]));
  const cargo = Number(o.cargo);
  const j = JSON.parse(readFileSync(`data/raw/1t/referencia/${o.uf}-c${String(cargo).padStart(4, '0')}-e006259-u.json`, 'utf8'));
  const partidos = new Set(j.carg[0].agr.flatMap((a) => a.par.map((p) => Number(p.n))));
  const sem = q.all(o.uf, cargo).filter((r) => !partidos.has(r.partido));
  const leg = sem.reduce((s, r) => s + r.q, 0);
  const ok = Number(o.vnt_oficial) === Number(o.omitidos_bu) + leg;
  total++; if (ok) fecha++;
  if (leg || !ok) console.log(`${o.uf} cargo ${cargo}: vnt ${o.vnt_oficial} = omitidos ${o.omitidos_bu} + legenda sem lista ${leg} (${sem.map((r) => `${r.partido}:${r.q}`).join(', ')}) → ${ok ? 'fecha' : 'NÃO fecha'}`);
  out.push([o.uf, cargo, o.vnt_oficial, o.omitidos_bu, leg, sem.map((r) => `${r.partido}:${r.q}`).join(' '), ok].join(';'));
}
console.log(`vnt = nominais omitidos + legenda de partidos sem lista: ${fecha}/${total} pares UF×cargo`);
writeFileSync(`${SAIDA}/numeros-omitidos-munzona-reproducao-legenda.csv`, out.join('\n') + '\n');
