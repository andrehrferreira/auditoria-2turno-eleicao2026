// Cientista político: contas sobre data/parsed/auditoria/cientista-politico/balanco-municipios.jsonl
// (gerado por politico-balanco-turnos.mjs). Sem inferência ecológica: só limites e somas.
// Uso: node scripts/auditoria/politico-limites-municipios.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const DIR = 'data/parsed/auditoria/cientista-politico';
const l = readFileSync(`${DIR}/balanco-municipios.jsonl`, 'utf8').trim().split('\n').map(JSON.parse);
const pct = (x) => +(100 * x).toFixed(1);
const out = {};

// 1. Onde o ganho de um finalista passa do disponível (= o outro perdeu votos): a queda de comparecimento cobre?
for (const [nr, ex] of [['13', 'excesso13'], ['22', 'excesso22']]) {
  const s = l.filter((x) => x[ex] > 0);
  const cobre = s.filter((x) => x.dComp < 0 && -x.dComp >= x[ex]);
  const resto = s.filter((x) => !(x.dComp < 0 && -x.dComp >= x[ex]));
  out[`naoCabe${nr}`] = {
    municipios: s.length, votos: s.reduce((a, x) => a + x[ex], 0),
    quedaComparecimentoCobre: { municipios: cobre.length, votos: cobre.reduce((a, x) => a + x[ex], 0) },
    naoCoberto: { municipios: resto.length, votos: resto.reduce((a, x) => a + x[ex], 0) },
    maiores: s.filter((x) => x.comp1 >= 2000).sort((a, b) => b[ex] / b.comp1 - a[ex] / a.comp1).slice(0, 10)
      .map((x) => ({ municipio: `${x.nome}/${x.uf}`, excesso: x[ex], pctComp: pct(x[ex] / x.comp1), dComp: x.dComp, eliminados: x.E })),
  };
}

// 2. Limite mínimo de transferência vinda do reduto de um eliminado: ganho do finalista que nada além
//    dos votos daquele eliminado (ou de eleitores do outro finalista) cobre, município a município.
out.limiteReduto = [['go', '55'], ['df', '55'], ['mg', '30'], ['sp', '14'], ['sp', '70']].map(([uf, nr]) => {
  let b13 = 0, b22 = 0, tot = 0;
  for (const x of l.filter((m) => m.uf === uf)) {
    const resto = x.E - (x.elim[nr] ?? 0) + Math.max(0, x.dComp) + Math.max(0, -x.dBN);
    b13 += Math.max(0, x.dL - resto); b22 += Math.max(0, x.dF - resto); tot += x.elim[nr] ?? 0;
  }
  return { uf, eliminado: nr, votos: tot, minimoPara13: b13, pct13: pct(b13 / tot), minimoPara22: b22, pct22: pct(b22 / tot) };
});

// 3. Comparecimento capital × interior
out.capitalInterior = {};
for (const uf of [...new Set(l.map((x) => x.uf))].filter((u) => u !== 'zz')) {
  const g = (f) => { const s = l.filter((x) => x.uf === uf && f(x)); const a = s.reduce((t, x) => ({ c1: t.c1 + x.comp1, c2: t.c2 + x.comp2, ap: t.ap + x.aptos1 }), { c1: 0, c2: 0, ap: 0 }); return { municipios: s.length, comp1: pct(a.c1 / a.ap), comp2: pct(a.c2 / a.ap) }; };
  out.capitalInterior[uf] = { capital: g((x) => x.capital), interior: g((x) => !x.capital) };
}

// 4. Municípios extremos e maiores viradas (5.000 aptos ou mais), fatia do 13 no confronto 13 × 22
const s = l.filter((x) => x.uf !== 'zz' && x.aptos2 >= 5000).map((x) => ({
  municipio: `${x.nome}/${x.uf}`, codigo: `${x.uf}|${x.codigo}`, fatia13_2t: pct(x.L2 / (x.L2 + x.F2)), fatia13_1t: pct(x.L1 / (x.L1 + x.F1)),
})).map((x) => ({ ...x, virada: +(x.fatia13_2t - x.fatia13_1t).toFixed(1) }));
out.extremos13 = [...s].sort((a, b) => b.fatia13_2t - a.fatia13_2t).slice(0, 12);
out.extremos22 = [...s].sort((a, b) => a.fatia13_2t - b.fatia13_2t).slice(0, 12);
out.viradas13 = [...s].sort((a, b) => b.virada - a.virada).slice(0, 8);
out.viradas22 = [...s].sort((a, b) => a.virada - b.virada).slice(0, 8);
out.capitais = l.filter((x) => x.capital).map((x) => ({ uf: x.uf, fatia13_2t: pct(x.L2 / (x.L2 + x.F2)) }));

writeFileSync(`${DIR}/limites-municipios.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ naoCabe13: { ...out.naoCabe13, maiores: undefined }, naoCabe22: { ...out.naoCabe22, maiores: undefined }, limiteReduto: out.limiteReduto }, null, 1));
