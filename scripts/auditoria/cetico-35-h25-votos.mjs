import { createReadStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

// Parecer 35 do cético (H25): para as urnas certificadas entre os turnos e as emissões isoladas em horário incomum
// (com o horário de verão de Brasília, analise.json → I), compara o BU (voto_bu) com o resultado oficial por seção
// (voto_oficial), presidente, número a número, em cada seção e turno em que o certificado assinou o pacote.
// Lembrete: BU = oficial mostra que o pacote foi contado; não mostra que o pacote é legítimo (o oficial sai do BU).
// Saída: data/parsed/auditoria/cetico-35/votos.json
// Uso: node scripts/auditoria/cetico-35-h25-votos.mjs

const DIR = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-35');
const R = JSON.parse(await readFile(path.join(DIR, 'analise.json'), 'utf8'));
const alvos = new Map([...R.D.entreTurnos.map((x) => [x.cn, 'entre os turnos']), ...R.I.isoladosIncomuns.map((x) => [x.cn, 'isolado em horário incomum'])]);
const secoes = [];
for (const t of [2, 1]) {
  const rl = createInterface({ input: createReadStream(path.join(DIR, `${t}t-dirs.jsonl`)), crlfDelay: Infinity });
  for await (const s of rl) {
    const m = s.match(/"cn":"([^"]+)"/);
    if (m && alvos.has(m[1])) { const d = JSON.parse(s); secoes.push({ t, uf: d.uf, mun: d.mun, zona: d.zona, secao: d.secao, cn: d.cn, motivo: alvos.get(d.cn) }); }
  }
}
const { db, fonte } = await abrirLeitura();
const qBu = db.prepare("select case tipo_voto when 'branco' then 95 when 'nulo' then 96 else numero end n, sum(quantidade) q from voto_bu where turno=? and uf=? and municipio=? and zona=? and secao=? and cargo=1 group by 1");
const qOf = db.prepare('select numero n, sum(quantidade) q from voto_oficial where turno=? and uf=? and municipio=? and zona=? and secao=? and cargo=1 group by 1');
const saida = secoes.map((s) => {
  const a = [s.t, s.uf, s.mun, s.zona, s.secao];
  const bu = new Map(qBu.all(...a).map((r) => [r.n, r.q]));
  const of = new Map(qOf.all(...a).map((r) => [r.n, r.q]));
  let diverg = 0;
  for (const n of new Set([...bu.keys(), ...of.keys()])) if ((bu.get(n) ?? 0) !== (of.get(n) ?? 0)) diverg++;
  return { ...s, linhasBu: bu.size, linhasOficial: of.size, divergencias: diverg, totalPresidente: [...of.values()].reduce((x, y) => x + y, 0) };
}).sort((x, y) => (`${x.cn}${x.t}` < `${y.cn}${y.t}` ? -1 : 1));
await writeFile(path.join(DIR, 'votos.json'), JSON.stringify({ fonte: path.basename(fonte), secoes: saida }, null, 1));
for (const s of saida) console.log(`${s.t}t ${s.uf}/${s.mun}/${s.zona}/${s.secao} ${s.cn} [${s.motivo}] BU ${s.linhasBu} linhas, oficial ${s.linhasOficial}, divergências ${s.divergencias}, total ${s.totalPresidente}`);
