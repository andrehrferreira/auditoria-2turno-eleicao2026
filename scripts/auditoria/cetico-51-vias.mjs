// Cético revisor, parecer 51: conferência, no universo de PR, SC e RS (2022, dois turnos), da V2 do diário contra a V2 do
// boletim, com o critério do adendo 6 (≥ 99% das seções iguais em cada turno e soma das diferenças absolutas ≤ 0,1% da
// soma da V2). Conta própria, sobre as saídas do diário (diario2022/<uf>-<t>t.jsonl) e do boletim (sul2022/bu2022-<uf>.csv);
// o boletim foi conferido seção a seção no bruto (7-Zip) pelo cetico-51-bruto.mjs. Mostra também o critério só nas seções
// em que o diário tem todos os votos do boletim, e a distribuição das diferenças.
//
// Uso: node scripts/auditoria/cetico-51-vias.mjs
// Saída: data/parsed/auditoria/cetico/51/vias.json
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';

const H13 = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h13-v2');
const res = {};
for (const uf of ['pr', 'sc', 'rs']) {
  const bu = new Map();
  for (const l of readFileSync(path.join(H13, 'sul2022', `bu2022-${uf}.csv`), 'utf8').split('\n').slice(1)) {
    if (!l) continue;
    const c = l.split(';');
    bu.set(`${c[0]}|${c[1]}`, { comp: +c[4], lib: +c[5], compBio: +c[6] });
  }
  for (const t of [1, 2]) {
    const r = (res[`${uf}-${t}t`] = { comparadas: 0, v2Igual: 0, somaV2bu: 0, somaV2diario: 0, difAbs: 0, difPorValor: {}, votosIguais: { comparadas: 0, v2Igual: 0, somaV2bu: 0, difAbs: 0 }, compBioMaiorQueComp: 0, v3Igual: 0 });
    for (const l of readFileSync(path.join(H13, 'diario2022', `${uf}-${t}t.jsonl`), 'utf8').split('\n')) {
      if (!l) continue;
      const x = JSON.parse(l);
      const b = bu.get(`${uf}/${x.municipio}/${x.zona}/${x.secao}|${t}`);
      if (!b || x.erro) continue;
      const v2bu = b.comp - b.compBio, d = x.vias.v2 - v2bu;
      r.comparadas++; r.somaV2bu += v2bu; r.somaV2diario += x.vias.v2; r.difAbs += Math.abs(d);
      if (d === 0) r.v2Igual++;
      if (x.vias.v3m + x.vias.v3s === b.lib) r.v3Igual++;
      if (v2bu < 0) r.compBioMaiorQueComp++;
      const k = d === 0 ? '0' : d > 0 ? `+${d > 2 ? '3 ou mais' : d}` : `${d < -2 ? '-3 ou menos' : d}`;
      r.difPorValor[k] = (r.difPorValor[k] ?? 0) + 1;
      if (x.votos === b.comp) { const q = r.votosIguais; q.comparadas++; q.somaV2bu += v2bu; q.difAbs += Math.abs(d); if (d === 0) q.v2Igual++; }
    }
    r.fracaoIgual = +(r.v2Igual / r.comparadas).toFixed(5); r.difSobreSoma = +(r.difAbs / r.somaV2bu).toFixed(5);
    r.confirmada = r.fracaoIgual >= 0.99 && r.difSobreSoma <= 0.001;
    const q = r.votosIguais; q.fracaoIgual = +(q.v2Igual / q.comparadas).toFixed(5); q.difSobreSoma = +(q.difAbs / q.somaV2bu).toFixed(5); q.confirmada = q.fracaoIgual >= 0.99 && q.difSobreSoma <= 0.001;
  }
}
writeFileSync(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', '51', 'vias.json'), JSON.stringify(res, null, 1));
for (const [k, r] of Object.entries(res)) console.log(k, `comparadas ${r.comparadas} · V2 igual ${r.v2Igual} (${(100 * r.fracaoIgual).toFixed(2)}%) · dif ${r.difAbs} / ${r.somaV2bu} (${(100 * r.difSobreSoma).toFixed(3)}%) · confirmada ${r.confirmada} · só votos iguais: ${(100 * r.votosIguais.fracaoIgual).toFixed(2)}%, ${(100 * r.votosIguais.difSobreSoma).toFixed(3)}%, ${r.votosIguais.confirmada} · dif ${JSON.stringify(r.difPorValor)} · [2]>comp ${r.compBioMaiorQueComp} · V3 igual ${r.v3Igual}`);
