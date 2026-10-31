// Demógrafo (H27/H01, seções novas 2022 × 2026): parcela sem biometria por faixa de idade no cadastro de 2022 e de 2026, no país,
// pelo perfil do eleitorado por seção (saída de demografo-novas-2022-perfil.mjs). Serve para saber se "100% com biometria"
// marca o eleitor recém-alistado nos dois anos (em 2022, o alistamento feito durante a pandemia não coletava biometria).
// Também conta, por ano, as seções com nenhum eleitor sem biometria, e quantas delas são novas.
// Saída: data/parsed/auditoria/demografo/novas-2022-biometria-idade.json
// Uso: node scripts/auditoria/demografo-novas-2022-biometria-idade.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { BANDAS, DIR_FINO } from './demografo-novas-2022-perfil.mjs';

const NB = BANDAS.length;
const GRUPOS = [['16-17', '1600', '1700'], ['18-20', '1800', '2000'], ['21-24', '2124', '2124'], ['25-34', '2529', '3034'], ['35-44', '3539', '4044'], ['45-59', '4549', '5559'], ['60-69', '6064', '6569'], ['70-79', '7074', '7579'], ['80+', '8084', '9999']];
const R = {};
for (const ano of [2022, 2026]) {
  const tot = new Float64Array(2 + 2 * NB); let secoes = 0; let secoesSemBio0 = 0;
  for (const f of readdirSync(path.join(DIR_FINO, String(ano))).filter((n) => n.endsWith('.tsv'))) {
    const L = readFileSync(path.join(DIR_FINO, String(ano), f), 'utf8').trimEnd().split('\n');
    for (const l of L.slice(1)) {
      const c = l.split('\t'); secoes++;
      for (let i = 0; i < tot.length; i++) tot[i] += Number(c[5 + i]);
      if (Number(c[5]) > 0 && Number(c[5]) === Number(c[6])) secoesSemBio0++;
    }
  }
  const i = (b) => BANDAS.indexOf(b);
  const faixas = Object.fromEntries(GRUPOS.map(([n, a, b]) => { let e = 0; let s = 0; for (let j = i(a); j <= i(b); j++) { e += tot[2 + j]; s += tot[2 + NB + j]; } return [n, { eleitores: e, semBiometria: s, pctSemBiometria: +(100 * s / e).toFixed(2) }]; }));
  R[ano] = { secoes, eleitores: tot[0], semBiometria: tot[0] - tot[1], pctSemBiometria: +(100 * (tot[0] - tot[1]) / tot[0]).toFixed(2), secoesComTodosComBiometria: secoesSemBio0, faixas };
}
await writeFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'demografo', 'novas-2022-biometria-idade.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
