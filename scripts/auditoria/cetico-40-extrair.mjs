// Cético revisor, parecer 40: extrai do zip oficial de cada UF o BU impresso (-imgbu.dat e -imgbusa.dat) de todas as
// seções, interpreta o texto (scripts/auditoria/cetico-40-lib.mjs) e grava um JSONL por turno. Não usa o banco nem o
// bu.dat. Uso: node scripts/auditoria/cetico-40-extrair.mjs --turno 2 [--uf ac]
// Saída: data/parsed/auditoria/cetico/40-imgbu-<t>t.jsonl (uma linha por seção) e 40-imgbu-<t>t-resumo.txt
import { createWriteStream, mkdirSync, writeFileSync } from 'node:fs';
import { open } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { UFS, nomeZip } from '../../src/config.js';
import { secoesDoZip, lerEntradaH, texto, interpretar } from './cetico-40-lib.mjs';

const { values: a } = parseArgs({ options: { turno: { type: 'string' }, uf: { type: 'string' } } });
const T = Number(a.turno);
const ufs = a.uf ? a.uf.split(',') : UFS;
const OUT = 'data/parsed/auditoria/cetico';
mkdirSync(OUT, { recursive: true });
const sufixo = a.uf ? `-${ufs.join('_')}` : '';
const out = createWriteStream(`${OUT}/40-imgbu-${T}t${sufixo}.jsonl`);
const resumo = [];
const p = (s) => { resumo.push(s); console.log(s); };
const MANTER_CANDS = new Set(['PRESIDENTE', 'GOVERNADOR']);
const compacto = (r) => r && ({
  sa: r.sa, cab: r.cab, saVotos: r.saVotos, avisos: r.avisos.length ? r.avisos.slice(0, 3) : undefined,
  cargos: r.cargos.map((c) => ({ ...c, cands: MANTER_CANDS.has(c.cargo) ? c.cands : undefined, ncands: Object.keys(c.cands).length })),
});
const ini = Date.now();
const tot = { secoes: 0, ue: 0, sa: 0, ambos: 0, nenhum: 0, avisos: 0, erros: 0 };
for (const uf of ufs) {
  const zip = `data/raw/${T}t/zip/${nomeZip(`${T}t`, uf)}`;
  const mapa = await secoesDoZip(zip);
  const h = await open(zip, 'r');
  const lista = [...mapa].sort((x, y) => (x[1].imgbu ?? x[1].imgbusa)?.offsetLocal - (y[1].imgbu ?? y[1].imgbusa)?.offsetLocal);
  let n = 0;
  for (const [k, s] of lista) {
    tot.secoes++; n++;
    const reg = { k, tipos: Object.fromEntries(s.tipos) };
    try {
      if (s.imgbu) reg.ue = compacto(interpretar(texto(await lerEntradaH(h, s.imgbu))));
      if (s.imgbusa) reg.sa = compacto(interpretar(texto(await lerEntradaH(h, s.imgbusa))));
    } catch (e) { reg.erro = e.message; tot.erros++; }
    if (reg.ue && reg.sa) tot.ambos++; else if (reg.ue) tot.ue++; else if (reg.sa) tot.sa++; else tot.nenhum++;
    if (reg.ue?.avisos || reg.sa?.avisos) tot.avisos++;
    out.write(JSON.stringify(reg) + '\n');
  }
  await h.close();
  p(`${uf}: ${n} seções no zip (${((Date.now() - ini) / 1000).toFixed(0)} s)`);
}
out.end();
p(`Turno ${T}: ${JSON.stringify(tot)}`);
writeFileSync(`${OUT}/40-imgbu-${T}t${sufixo}-resumo.txt`, resumo.join('\n') + '\n');
