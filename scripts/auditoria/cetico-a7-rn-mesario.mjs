// Revisor cético, A7, caso RN 17132/0010/0145: urna e mesário que mais liberou sem digital, nas seções 0145 e 0183
// (mesmo local de votação), 1º e 2º turno. Imprime só comparações (nenhum título de mesário). Somente leitura.
// Uso: node scripts/auditoria/cetico-a7-rn-mesario.mjs
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { lerLogs, perfilBu, perfilLog } from '../../src/perfil-secoes.js';

const R = path.resolve(import.meta.dirname, '..', '..', 'data', 'raw');
const DIA = { 1: '04/10/2026', 2: '25/10/2026' };
const top = {}; const reg = {}; const urna = {};
for (const t of [1, 2]) for (const s of ['0145', '0183']) {
  const b = path.join(R, `${t}t/urnas/rn/17132/0010/${s}`); const d = path.join(b, readdirSync(b)[0]);
  const { texto } = await lerLogs(path.join(d, readdirSync(d).find((n) => n.endsWith('-log.jez'))), s);
  const p = perfilLog(texto, DIA[t]);
  const bu = perfilBu(readFileSync(path.join(d, readdirSync(d).find((n) => n.endsWith('-bu.dat')))));
  const k = `${t}t/${s}`;
  urna[k] = bu.urna.numeroInternoUrna;
  const lib = Object.entries(p.mesarios.liberacoesPorMesario);
  top[k] = { titulo: lib[0]?.[0], liberacoes: lib[0]?.[1], totalComMesario: p.habilitadosPeloMesario, semAssociacao: p.dadoPessoalConfere - p.habilitadosPeloMesario };
  reg[k] = p.mesarios.registros.map((r) => r.titulo);
}
console.log('número interno da urna:', urna);
const ref = top['2t/0145'].titulo;
for (const [k, v] of Object.entries(top)) {
  console.log(`${k}: principal liberador fez ${v.liberacoes} de ${v.totalComMesario} liberações com mesário (+${v.semAssociacao} sem associação nominal);`,
    `é o mesmo do 2t/0145? ${v.titulo === ref}; registrado como mesário em: ${Object.keys(reg).filter((x) => reg[x].includes(v.titulo)).join(',')}`);
}
