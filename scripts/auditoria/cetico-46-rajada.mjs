// Cético revisor, parecer 46: as seções com 10 ou mais V2 em 10 minutos no 2º turno (descritivo do doc 19).
// Pergunta: são seções de V2 alto (rajada esperada pelo ritmo de 1 cargo) e o 13 cresceu nelas mais que nas
// outras seções do mesmo local? Compara a parcela de V2 e o ganho do 13 (13 / (13 + 22), 2º − 1º turno) com a
// média ponderada das outras seções do mesmo local. Fora do Nordeste e Brasil sem exterior.
// Uso: node scripts/auditoria/cetico-46-rajada.mjs
// Entradas: data/parsed/auditoria/estatistico/h13-v2/horario-2t.jsonl, data/parsed/auditoria/cetico-revisor/46/secoes.csv
import { createReadStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DIR_DADOS } from '../../src/config.js';

const NE = new Set(['al', 'ba', 'ce', 'ma', 'pb', 'pe', 'pi', 'rn', 'se']);
const raj = new Map();
for await (const l of createInterface({ input: createReadStream(path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h13-v2', 'horario-2t.jsonl')), crlfDelay: Infinity })) {
  if (!l) continue;
  const x = JSON.parse(l);
  if (!x.erro) raj.set(x.id, x.v2Rajada10);
}
const txt = (await readFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '46', 'secoes.csv'), 'utf8')).split('\n');
const cab = txt[0].split(';'), ix = (n) => cab.indexOf(n);
const I = Object.fromEntries(['id', 't1_c', 't2_c', 't1_sb', 't2_sb', 't1_n13', 't1_n22', 't2_n13', 't2_n22', 't2_local'].map((n) => [n, ix(n)]));
const locais = new Map();
for (let i = 1; i < txt.length; i++) {
  if (!txt[i]) continue;
  const c = txt[i].split(';'), g = (n) => Number(c[I[n]]);
  const id = c[I.id], uf = id.slice(0, 2);
  if (!(g('t1_c') > 0 && g('t2_c') > 0)) continue;
  const w1 = g('t1_n13') + g('t1_n22'), w2 = g('t2_n13') + g('t2_n22');
  if (w1 < 20 || w2 < 20) continue;
  const s = { id, ne: NE.has(uf), x2: g('t2_sb') / g('t2_c'), dx: g('t2_sb') / g('t2_c') - g('t1_sb') / g('t1_c'), dy: g('t2_n13') / w2 - g('t1_n13') / w1, w: w2, raj: raj.get(id) ?? null };
  const k = `${id.split('/').slice(0, 3).join('/')}/${c[I.t2_local]}`;
  (locais.get(k) ?? locais.set(k, []).get(k)).push(s);
}
const res = {};
for (const [nome, f] of [['Fora do Nordeste', (s) => !s.ne], ['Brasil', () => true]]) {
  let n = 0, nPar = 0, somaDy = 0, somaDx = 0, somaX = 0, somaXpar = 0, nX30 = 0;
  for (const ss of locais.values()) {
    for (const s of ss) {
      if (!f(s) || !(s.raj >= 10)) continue;
      n++; somaX += s.x2; if (s.x2 >= 0.3) nX30++;
      const outros = ss.filter((o) => o !== s);
      if (!outros.length) continue;
      const sw = outros.reduce((a, o) => a + o.w, 0);
      nPar++;
      somaDy += s.dy - outros.reduce((a, o) => a + o.w * o.dy, 0) / sw;
      somaDx += s.dx - outros.reduce((a, o) => a + o.w * o.dx, 0) / sw;
      somaXpar += s.x2 - outros.reduce((a, o) => a + o.w * o.x2, 0) / sw;
    }
  }
  res[nome] = { secoesRajada10: n, mediaParcelaV2_2t: +(somaX / n).toFixed(3), comParcelaV2de30ouMais: nX30, comVizinhasNoLocal: nPar, difParcelaV2vsVizinhas: +(somaXpar / nPar).toFixed(3), difDeltaV2vsVizinhas: +(somaDx / nPar).toFixed(4), difGanho13vsVizinhas_pontos: +(100 * somaDy / nPar).toFixed(2) };
}
let tot = 0, sx = 0; for (const ss of locais.values()) for (const s of ss) if (!s.ne) { tot++; sx += s.x2; }
res.referenciaForaNE = { secoes: tot, mediaParcelaV2_2t: +(sx / tot).toFixed(3) };
console.log(JSON.stringify(res, null, 1));
await writeFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '46', 'rajada.json'), JSON.stringify(res, null, 1));
