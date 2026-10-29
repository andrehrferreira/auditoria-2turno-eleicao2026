// Revisor cético, caso PI 11878/0028/0099 (lente: dados e definições).
// "Única seção do país com alerta contábil" depende do limiar MINIMO_MIGRACAO = 10 de src/comparar-turnos.js.
// Distribuição de migracaoMinima (13 e 22) em todas as seções comparadas, e quantas teriam alerta com limiares menores.
// Uso: node scripts/auditoria/cetico-pi0099-dados-limiar.mjs   Saída: data/parsed/auditoria/cetico/cetico-pi0099-dados-limiar.json
import { createReadStream, readdirSync, writeFileSync } from 'node:fs';
import readline from 'node:readline';

const DIR = 'data/parsed/comparacao-turnos';
const dist = { '13': {}, '22': {} };
const top = [];
let n = 0;
for (const f of readdirSync(DIR).filter((x) => /^[a-z]{2}\.jsonl$/.test(x))) {
  const rl = readline.createInterface({ input: createReadStream(`${DIR}/${f}`), crlfDelay: Infinity });
  for await (const l of rl) {
    const m = /"migracaoMinima":\{"13":(\d+),"22":(\d+)\}/.exec(l);
    if (!m) continue;
    n++;
    const a = Number(m[1]), b = Number(m[2]);
    dist['13'][a] = (dist['13'][a] ?? 0) + 1;
    dist['22'][b] = (dist['22'][b] ?? 0) + 1;
    if (a >= 3 || b >= 3) {
      const id = /"uf":"(\w+)","municipio":"(\d+)","zona":"(\d+)","secao":"(\d+)"/.exec(l);
      const c1 = /"comparecimento1":(\d+)/.exec(l)[1], ap = /"aptos1":(\d+)/.exec(l)[1];
      top.push({ secao: id.slice(1).join('/'), m13: a, m22: b, aptos1: Number(ap), comparecimento1: Number(c1) });
    }
  }
}
const acima = (lado, k) => Object.entries(dist[lado]).filter(([v]) => Number(v) >= k).reduce((s, [, c]) => s + c, 0);
const limiares = Object.fromEntries([1, 2, 3, 5, 10].map((k) => [k, { '13': acima('13', k), '22': acima('22', k) }]));
top.sort((x, y) => Math.max(y.m13, y.m22) - Math.max(x.m13, x.m22));
const out = { geradoEm: new Date().toISOString(), secoes: n, limiares, top: top.slice(0, 30) };
writeFileSync('data/parsed/auditoria/cetico/cetico-pi0099-dados-limiar.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
