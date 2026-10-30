// Cético, parecer 45 (H19, falha de digital induzida): totais nacionais refeitos direto das leituras do diário,
// sem passar pela tabela medidas.csv.gz do estatístico.
// Fontes: data/parsed/auditoria/estatistico-eleitoral/leitor/<uf>.jsonl (doc 08) e data/parsed/auditoria/estatistico/h08/<t>t/*.secoes.jsonl (doc 17).
// Mede também o que a definição de "falha" deixa de fora:
//   - liberação manual com menos de 4 tentativas de digital (manTent[0..3]): o mesário teria liberado sem esgotar as tentativas;
//   - reconhecimento biométrico sem pedido de digital (bioSemPedido) e atendimentos de classe "outra";
//   - o número máximo de tentativas configurado ("de [m]").
// Só contagens. Nenhum título é lido.
// Uso: node scripts/auditoria/cetico-45-totais.mjs
// Saída: data/parsed/auditoria/cetico/45/totais.json
import { createReadStream } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DIR_DADOS } from '../../src/config.js';

const DIR_LEITOR = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico-eleitoral', 'leitor');
const DIR_H08 = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h08');
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', '45');

async function* linhas(arquivo) {
  const rl = createInterface({ input: createReadStream(arquivo), crlfDelay: Infinity });
  for await (const l of rl) if (l) yield l;
}

const zero = () => ({ secoes: 0, votos: 0, bio: 0, man: 0, anb: 0, outra: 0, bioSemPedido: 0, suc: [0, 0, 0, 0, 0], sucMais: 0, manTent: [0, 0, 0, 0, 0], manMais: 0, deM: {}, secoesManMenos4: 0 });
const tot = { 1: zero(), 2: zero() };
const naoBate = { 1: 0, 2: 0 };
let secoes = 0;
for (const f of (await readdir(DIR_LEITOR)).filter((x) => x.endsWith('.jsonl') && !x.endsWith('.erros.jsonl')).sort()) {
  for await (const l of linhas(path.join(DIR_LEITOR, f))) {
    const r = JSON.parse(l);
    secoes++;
    for (const t of [1, 2]) {
      const d = r[`d${t}`];
      if (!r[`bate${t}`]) naoBate[t]++;
      if (!d) continue;
      const x = tot[t];
      x.secoes++;
      for (const k of ['votos', 'bio', 'man', 'anb', 'outra', 'bioSemPedido', 'sucMais', 'manMais']) x[k] += d[k];
      for (let n = 0; n <= 4; n++) { x.suc[n] += d.suc[n]; x.manTent[n] += d.manTent[n]; }
      x.deM[d.deM] = (x.deM[d.deM] ?? 0) + 1;
      if (d.manTent[0] + d.manTent[1] + d.manTent[2] + d.manTent[3] > 0) x.secoesManMenos4++;
    }
  }
}
for (const t of [1, 2]) {
  const x = tot[t];
  const B = x.bio + x.man;
  const tentR = x.suc.reduce((a, v, n) => a + n * v, 0) + 5 * x.sucMais;
  Object.assign(x, { B, f: x.man / B, a: tentR / x.bio, p1: x.suc[1] / x.bio, naoBateBU: naoBate[t] });
}

const h08 = { 1: { v1: 0, v2: 0, v3m: 0, v3s: 0, outra: 0, secoes: 0 }, 2: { v1: 0, v2: 0, v3m: 0, v3s: 0, outra: 0, secoes: 0 } };
for (const t of [1, 2]) {
  const dir = path.join(DIR_H08, `${t}t`);
  for (const f of (await readdir(dir)).filter((x) => x.endsWith('.secoes.jsonl')).sort()) {
    if (f.startsWith('zz')) continue;
    for await (const l of linhas(path.join(dir, f))) {
      const r = JSON.parse(l);
      const x = h08[t];
      x.secoes++;
      for (const k of ['v1', 'v2', 'v3m', 'v3s', 'outra']) x[k] += r.vias[k];
    }
  }
  h08[t].v3sDeV3 = h08[t].v3s / (h08[t].v3m + h08[t].v3s);
}

const out = { secoes, leitor: tot, h08 };
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, 'totais.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
