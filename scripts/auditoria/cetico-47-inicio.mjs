// Cético revisor, parecer 47 (H20). Resolve as seções marcadas só pelo sinal de início de relógio atrasado (urna ligada
// ≥ 45 min antes do local, zerésima na trava, abertura na trava; cetico-47-analise.mjs). O mesário chega pela hora da
// parede, então um relógio 1 h atrasado que não mudou entre os turnos marca o sinal nos DOIS turnos. Regra: mesma urna
// nos dois turnos, nenhum acerto de hora cheia no diário (ajustes-hora-cheia.csv do engenheiro) e o outro turno sem o
// sinal → relógio certo (mesa que chegou cedo). O resto fica listado para leitura no bruto.
// Uso: node scripts/auditoria/cetico-47-inicio.mjs
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';

const BASE = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '47');
const r = JSON.parse(await readFile(path.join(BASE, 'analise.json'), 'utf8'));
const ini = { 1: new Set(), 2: new Set() };
for (const t of [1, 2]) for (const x of r.turnos[t].local.listaAtrasados) if (x.inicio) ini[t].add(x.id);
const cheia = new Set();
for (const l of (await readFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'engenheiro-seguranca-urna', 'h20', 'ajustes-hora-cheia.csv'), 'utf8')).split(/\r?\n/).slice(1)) {
  if (!l) continue;
  const c = l.split(',');
  cheia.add(`${c[1]}/${c[2]}/${c[3]}/${c[4]}`);
}
const todos = new Set([...ini[1], ...ini[2]]);
const ufs = new Set([...todos].map((id) => id.slice(0, 2)));
const urnas = { 1: new Map(), 2: new Map() };
for (const t of [1, 2]) for (const uf of ufs) {
  for (const l of (await readFile(path.join(BASE, `${t}t`, `${uf}.jsonl`), 'utf8')).split('\n')) {
    if (!l) continue;
    const s = JSON.parse(l);
    const id = `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`;
    if (todos.has(id)) urnas[t].set(id, (s.fluxos ?? []).filter((f) => f.nV).map((f) => f.urna).sort().join('+'));
  }
}
for (const t of [1, 2]) {
  const cont = {};
  const resto = [];
  for (const id of ini[t]) {
    const outro = 3 - t;
    const mesma = urnas[t].get(id) && urnas[t].get(id) === urnas[outro].get(id) && !urnas[t].get(id).includes('+');
    let leitura;
    if (cheia.has(id)) leitura = 'acerto de hora cheia no diário';
    else if (mesma && !ini[outro].has(id)) leitura = 'mesma urna, sem acerto, outro turno sem o sinal: relógio certo';
    else if (mesma) leitura = 'mesma urna, sinal nos dois turnos';
    else leitura = 'urna diferente entre os turnos';
    cont[leitura] = (cont[leitura] ?? 0) + 1;
    if (!leitura.startsWith('mesma urna, sem acerto')) resto.push(`${id}: ${leitura}`);
  }
  console.log(`\n== turno ${t}: ${ini[t].size} seções com o sinal de início`);
  console.log(JSON.stringify(cont, null, 1));
  for (const x of resto) console.log(`  ${x}`);
}
