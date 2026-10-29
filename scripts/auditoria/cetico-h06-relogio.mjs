// Revisor cético, achado h06: limite para a deriva do relógio da urna. A emissão do BU (relógio da urna, hora local)
// tem de ser anterior ao recebimento no TSE (recebido_tse do aux, relógio do servidor, Brasília). Se a urna estivesse
// adiantada, haveria emissão "depois" do recebimento. Mostra a distribuição de recebido − emissão (Brasília).
// Uso: node scripts/auditoria/cetico-h06-relogio.mjs
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { abrirLeitura } from '../../src/banco-leitura.js';

const fuso = new Map((await readFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'tempo', '2t', 'fuso-municipio.csv'), 'utf8'))
  .trim().split('\n').slice(1).map((l) => l.split(',')).map((c) => [`${c[0]}/${c[1]}`, c[6] === '' ? null : Number(c[6])]));
const { db } = await abrirLeitura();
const difs = [];
const negativos = [];
for (const r of db.prepare(`SELECT uf, municipio, zona, secao, emissao, recebido_tse FROM secao
  WHERE turno = 2 AND uf <> 'zz' AND recebido_tse <> '' AND emissao IS NOT NULL`).iterate()) {
  const d = fuso.get(`${r.uf}/${r.municipio}`);
  if (d === null || d === undefined) continue;
  const [dd, mm, aa] = r.recebido_tse.slice(0, 10).split('/');
  const rec = Date.parse(`${aa}-${mm}-${dd}T${r.recebido_tse.slice(11)}Z`);
  const emi = Date.parse(`${r.emissao.replace(' ', 'T')}Z`) - d * 3600e3;
  const x = (rec - emi) / 1000;
  difs.push(x);
  if (x < 0) negativos.push(`${r.uf}/${r.municipio}/${r.zona}/${r.secao} emissão ${r.emissao} (local, d=${d}) recebido ${r.recebido_tse} → ${x} s`);
}
db.close();
difs.sort((a, b) => a - b);
const q = (p) => difs[Math.min(difs.length - 1, Math.floor(p * difs.length))];
const res = { secoes: difs.length, recebidoMenosEmissao_s: { min: difs[0], p001: q(0.001), p01: q(0.01), p50: q(0.5), p99: q(0.99), max: difs.at(-1) },
  negativos: negativos.length, exemplosNegativos: negativos.slice(0, 15) };
await writeFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'h06-relogio.json'), JSON.stringify(res, null, 2));
console.log(JSON.stringify(res, null, 1));
