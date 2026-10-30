// Engenheiro de segurança, H20 (docs/analysis/engenheiro-seguranca-urna/11): mesma interface de relogio-fora-do-fuso.mjs
// (difRelogioPorSecao, difSecao, chaveSecao), acrescida das correções de relógio que são Fato depois do doc 11 e do
// parecer cético 47. Serve para refazer, com a régua dos scripts existentes, as contas por horário (H06).
// Correções (horas a somar à diferença relógio − Brasília do município; +1 = relógio 1 h adiantado):
//   1º turno: RJ 60011/0214/0279 +1; GO 92274/0119/0049 +1; PR 74357/0050/0033 −1.
//   2º turno: GO 92274/0119/0049 +1.
// (As urnas originais trocadas de RJ 0022/0024 e PR 0261 não entram: o perfil da seção mistura a hora delas com a da
// reserva, e o efeito delas nas contas depois das 17h é 0; ver seguranca-h20-h06-corrigido.mjs. Lisboa é exterior e
// fica fora das contas do Brasil.)
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { chaveSecao, difRelogioPorSecao as base, difSecao } from './relogio-fora-do-fuso.mjs';

export { chaveSecao, difSecao };
export const CORRECOES_FATO = {
  1: [['rj', '60011', '0214', '0279', 1], ['go', '92274', '0119', '0049', 1], ['pr', '74357', '0050', '0033', -1]],
  2: [['go', '92274', '0119', '0049', 1]],
};

const fuso = new Map();
for (const l of readFileSync(path.join(DIR_DADOS, 'parsed', 'auditoria', 'tempo', '2t', 'fuso-municipio.csv'), 'utf8').split(/\r?\n/).slice(1)) {
  if (!l) continue;
  const c = l.split(',');
  if (c[6] !== '') fuso.set(`${c[0]}/${Number(c[1])}`, Number(c[6]));
}

/** Map chaveSecao → diferença relógio − Brasília (horas): a tabela das 81 mais as correções que são Fato. */
export function difRelogioPorSecao(turno) {
  const m = base(turno);
  for (const [uf, mun, z, s, corr] of CORRECOES_FATO[turno] ?? []) {
    const k = chaveSecao(uf, mun, z, s);
    if (m.has(k)) throw new Error(`${k} já está na tabela das 81`);
    const d = fuso.get(`${uf}/${Number(mun)}`);
    if (d === undefined) throw new Error(`sem fuso para ${uf}/${mun}`);
    m.set(k, d + corr);
  }
  return m;
}
