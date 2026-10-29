// Revisor cético, H06, consolidação: o limite "votos tardios cabem na margem" vale também para governador?
// Para cada UF com 2º turno de governador: margem entre os dois mais votados no BU (todas as seções do banco)
// e votos computados depois das 17h de Brasília nessa UF (logs-tardios.jsonl do Auditor C, universo das 29.854 seções).
// Banco somente leitura (abrirLeitura). Uso: node scripts/auditoria/cetico-h06-consolidacao-governador.mjs
// Saída: data/parsed/auditoria/cetico/h06-consolidacao-governador.json
import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DIR_DADOS } from '../../src/config.js';
import { abrirLeitura } from '../../src/banco-leitura.js';

const aberto = await abrirLeitura();
const { db } = aberto;
const linhas = db.prepare(`SELECT uf, numero, SUM(quantidade) AS votos FROM voto_bu
  WHERE turno = 2 AND cargo = 3 AND tipo_voto = 'nominal' GROUP BY uf, numero`).all();
const porUf = {};
for (const l of linhas) (porUf[l.uf] ??= []).push([l.numero, Number(l.votos)]);

const tardios = {};
const entrada = path.join(DIR_DADOS, 'parsed', 'auditoria', 'tempo', '2t', 'logs-tardios.jsonl');
for await (const linha of createInterface({ input: createReadStream(entrada) })) {
  if (!linha) continue;
  const r = JSON.parse(linha);
  if (r.erro || !r.tardios) continue;
  tardios[r.uf] = (tardios[r.uf] ?? 0) + r.tardios;
}
const saida = { geradoEm: new Date().toISOString(), fonte: aberto.fonte, ufs: {} };
for (const [uf, cands] of Object.entries(porUf)) {
  cands.sort((a, b) => b[1] - a[1]);
  const margem = cands[0][1] - (cands[1]?.[1] ?? 0);
  const t = tardios[uf] ?? 0;
  saida.ufs[uf] = { primeiro: cands[0], segundo: cands[1] ?? null, margem, votosTardios: t, pctDaMargemSeAcrescentados: Math.round((1e4 * t) / margem) / 100, pctDaMargemSeTrocados: Math.round((2e4 * t) / margem) / 100 };
}
await mkdir(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico'), { recursive: true });
await writeFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'h06-consolidacao-governador.json'), JSON.stringify(saida, null, 2));
console.log(JSON.stringify(saida, null, 1));
