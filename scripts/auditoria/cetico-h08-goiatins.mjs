// Cético, achado h08: os 7.702 ciclos com 3 "Voto confirmado" (Governador > Presidente > Prefeito) e os ciclos que
// confirmaram um cargo só. Para as seções pedidas (padrão: as 34 de Goiatins/TO, município 95338, que têm a eleição
// de prefeito no BU do 2º turno), conta os ciclos do log por sequência de cargos confirmados e compara com o
// total de votos de cada cargo no BU. Também imprime o ciclo completo de cada ciclo fora do padrão da seção.
// Uso: node scripts/auditoria/cetico-h08-goiatins.mjs [--secao uf/mun/zona/secao,...] [--municipio to/95338]
// Saída: data/parsed/auditoria/cetico/h08-goiatins.json
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerLogs } from '../../src/perfil-secoes.js';

const { values } = parseArgs({ options: { secao: { type: 'string' }, municipio: { type: 'string', default: 'to/95338' }, saida: { type: 'string', default: 'h08-goiatins.json' } } });
const DIA = '25/10/2026';
const NOME = { 1: 'Presidente', 3: 'Governador', 11: 'Prefeito' };
const { db, fonte } = await abrirLeitura();
let alvos;
if (values.secao) alvos = values.secao.split(',').map((k) => { const [uf, municipio, zona, secao] = k.split('/'); return { uf, municipio, zona, secao }; });
else { const [uf, mun] = values.municipio.split('/'); alvos = db.prepare('SELECT DISTINCT uf, municipio, zona, secao FROM voto_bu WHERE turno = 2 AND uf = ? AND municipio = ? ORDER BY zona, secao').all(uf, mun); }
const buq = db.prepare('SELECT cargo, sum(quantidade) q FROM voto_bu WHERE turno = 2 AND uf = ? AND municipio = ? AND zona = ? AND secao = ? GROUP BY cargo');
const res = [];
const total = { padroes: {}, bu: {}, log: {} };
for (const a of alvos) {
  const k = `${a.uf}/${a.municipio}/${a.zona}/${a.secao}`;
  const bu = Object.fromEntries(buq.all(a.uf, a.municipio, a.zona, a.secao).map((r) => [NOME[r.cargo] ?? r.cargo, r.q]));
  const dir = path.join(DIR_DADOS, 'raw', '2t', 'urnas', a.uf, a.municipio, a.zona, a.secao);
  const hash = (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory())[0].name;
  const nomes = await readdir(path.join(dir, hash));
  const { texto } = await lerLogs(path.join(dir, hash, acharArquivo(nomes, 'log')), a.secao);
  const ls = texto.split('\n').filter((l) => l.startsWith(DIA));
  const padroes = {}, porCargo = {}, ciclos = [];
  let ini = 0, confs = [];
  ls.forEach((l, i) => {
    const m = l.split('\t')[4] ?? '';
    if (m === 'Aguardando digitação do identificador do eleitor') { ini = i; confs = []; }
    else if (m.startsWith('Voto confirmado para [')) confs.push(m.slice(22, -1));
    else if (m === 'O voto do eleitor foi computado') { const p = confs.join(' > '); padroes[p] = (padroes[p] ?? 0) + 1; for (const c of confs) porCargo[c] = (porCargo[c] ?? 0) + 1; ciclos.push({ p, ini, fim: i }); confs = []; }
  });
  const moda = Object.entries(padroes).sort((x, y) => y[1] - x[1])[0]?.[0];
  const foraDoPadrao = ciclos.filter((c) => c.p !== moda).map((c) => ({ padrao: c.p, ciclo: ls.slice(c.ini, c.fim + 1).map((l) => { const x = l.split('\t'); return `${x[0].slice(11)} ${x[4]}`; }) }));
  res.push({ k, bu, logConfirmacoesPorCargo: porCargo, padroes, foraDoPadrao });
  for (const [p, n] of Object.entries(padroes)) total.padroes[p] = (total.padroes[p] ?? 0) + n;
  for (const [c, n] of Object.entries(bu)) total.bu[c] = (total.bu[c] ?? 0) + n;
  for (const [c, n] of Object.entries(porCargo)) total.log[c] = (total.log[c] ?? 0) + n;
}
db.close();
console.log(JSON.stringify({ fonte, secoes: res.length, total }, null, 1));
for (const r of res) if (r.foraDoPadrao.length) console.log(`\n## ${r.k} BU ${JSON.stringify(r.bu)} log ${JSON.stringify(r.logConfirmacoesPorCargo)}\n` + r.foraDoPadrao.map((f) => `-- ${f.padrao || '(nenhum)'}\n   ${f.ciclo.join('\n   ')}`).join('\n'));
await mkdir(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico'), { recursive: true });
await writeFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', values.saida), JSON.stringify({ fonte, total, secoes: res }, null, 1));
