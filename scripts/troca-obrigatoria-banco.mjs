// Segunda conta, independente de src/comparar-turnos.js (que usa os perfis): troca obrigatória entre finalistas por
// seção, direto do banco carregado dos BUs. Para cada finalista c:
//   troca(c) = max(0, votos2(c) − (votos1(c) + outros candidatos1 + brancos1 + nulos1 + abstenção1 + max(0, aptos2 − aptos1)))
// abstenção1 = aptos1 − comparecimento1 (da eleição de presidente). Lê o banco primário só para leitura.
// Uso: node scripts/troca-obrigatoria-banco.mjs
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { DIR_DADOS } from '../src/config.js';

const db = new DatabaseSync(path.join(DIR_DADOS, 'db', 'eleicao2026.sqlite'), { readOnly: true });
const ELEICAO = { 1: 6257, 2: 6258 };
function turno(t) {
  const m = new Map();
  for (const r of db.prepare(`select uf, municipio, zona, secao, numero, tipo_voto, sum(quantidade) q from voto_bu
      where turno = ? and cargo = 1 and eleicao = ? group by 1,2,3,4,5,6`).iterate(t, ELEICAO[t])) {
    const k = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
    const s = m.get(k) ?? { l: 0, f: 0, outros: 0, bn: 0 };
    if (r.numero === 13) s.l += r.q;
    else if (r.numero === 22) s.f += r.q;
    else if (r.tipo_voto === 'nominal') s.outros += r.q;
    else s.bn += r.q;
    m.set(k, s);
  }
  for (const r of db.prepare('select uf, municipio, zona, secao, aptos, comparecimento_majoritario c from secao_eleicao where turno = ? and eleicao = ?').iterate(t, ELEICAO[t])) {
    const s = m.get(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`);
    if (s) Object.assign(s, { aptos: r.aptos, comp: r.c });
  }
  return m;
}
const [t1, t2] = [turno(1), turno(2)];
let comparadas = 0;
const res = { 13: { secoes: 0, eleitores: 0, lista: [] }, 22: { secoes: 0, eleitores: 0, lista: [] } };
for (const [k, b] of t2) {
  const a = t1.get(k);
  if (!a || a.aptos == null || b.aptos == null) continue;
  comparadas++;
  const fontes = a.outros + a.bn + Math.max(0, a.aptos - a.comp) + Math.max(0, b.aptos - a.aptos);
  for (const [c, v1, v2] of [['13', a.l, b.l], ['22', a.f, b.f]]) {
    const troca = Math.max(0, v2 - (v1 + fontes));
    if (troca > 0) {
      res[c].secoes++;
      res[c].eleitores += troca;
      res[c].lista.push(`${k}:${troca}`);
    }
  }
}
console.log(`seções nos dois turnos: ${comparadas}`);
for (const c of ['13', '22']) console.log(`${c}: ${res[c].secoes} seções, ${res[c].eleitores} eleitores → ${res[c].lista.join(' ')}`);
