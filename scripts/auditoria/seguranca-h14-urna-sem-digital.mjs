import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_H14, comparar, linhasJsonl } from './seguranca-h14-lib.mjs';

// H14 item 4, parte 3 (engenheiro de segurança): "urna quase sem digital" — seção (fora do exterior) com 100 ou mais votos
// no log do dia e 90% ou mais deles habilitados sem biometria, numa seção que no 1º turno teve menos de 50% sem biometria.
// Compara o grupo H14 com o controle (mesma urna nos dois turnos). No H14, biometria-por-urna.json diz em qual urna foi.
// Uso: node scripts/auditoria/seguranca-h14-urna-sem-digital.mjs → reservas-rastro/urna-sem-digital.json

const grupos = new Map();
for await (const g of linhasJsonl(path.join(DIR_H14, 'grupos.jsonl'))) grupos.set(g.k, g.grupo);
const { db } = await abrirLeitura();
const sql = `SELECT s.uf || '/' || s.municipio || '/' || s.zona || '/' || s.secao AS k, p.votos_computados AS v, p.habilitados_biometria AS b
  FROM secao s JOIN perfil_log p ON p.turno = s.turno AND p.uf = s.uf AND p.municipio = s.municipio AND p.zona = s.zona AND p.secao = s.secao AND p.hash = s.hash
  WHERE s.turno = ? AND s.uf <> 'zz'`;
const t1 = new Map();
for (const r of db.prepare(sql).iterate(1)) t1.set(r.k, r);
const conta = {};
const casos = [];
for (const r of db.prepare(sql).iterate(2)) {
  const g = grupos.get(r.k);
  if (!g) continue;
  const a = t1.get(r.k);
  if (!a || !a.v) continue;
  const gs = g.startsWith('h14') ? [g, 'h14'] : [g];
  const caso = r.v >= 100 && (r.v - r.b) / r.v >= 0.9 && (a.v - a.b) / a.v < 0.5;
  for (const x of gs) {
    const c = (conta[x] ??= { n: 0, k: 0 });
    c.n++;
    if (caso) c.k++;
  }
  if (caso && g !== 'controle') casos.push({ k: r.k, grupo: g, t1: { votos: a.v, semBio: a.v - a.b }, t2: { votos: r.v, semBio: r.v - r.b } });
}
const saida = { definicao: '≥100 votos no dia, ≥90% sem biometria no 2º turno, <50% no 1º turno; fora do exterior', conta, comparacoes: {} };
for (const g of ['h14', 'h14Antes', 'h14Dia', 'herdada', 'secaoSecao']) saida.comparacoes[g] = comparar(conta[g].k, conta[g].n, conta.controle.k, conta.controle.n);
saida.casos = casos;
await writeFile(path.join(DIR_H14, 'urna-sem-digital.json'), JSON.stringify(saida, null, 1));
console.log(JSON.stringify({ conta, comparacoes: Object.fromEntries(Object.entries(saida.comparacoes).map(([g, c]) => [g, { taxa: c.grupo.taxa, controle: c.controle.taxa, razao: c.razao, p: c.pFisher }])) }, null, 1));
for (const c of casos.filter((c) => c.grupo.startsWith('h14'))) console.log(c.k, c.grupo, JSON.stringify(c.t1), JSON.stringify(c.t2));
