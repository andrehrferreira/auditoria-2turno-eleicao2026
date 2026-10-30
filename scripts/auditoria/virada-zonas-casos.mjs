// H26: as zonas fora da curva olhadas seção a seção (docs/analysis/virada-zonas/04-casos.md).
// Para cada zona: o resíduo líquido (13 − 22 além do esperado) por município, por local de votação e por modelo de urna;
// quanto dele vem das 10% piores seções; quantas seções têm resíduo do mesmo lado; Δcomparecimento; e a posição da
// zona em 2018 e 2022 (historico-zonas.csv).
// Entradas (de virada-zonas.mjs e virada-zonas-historico.mjs): data/parsed/auditoria/virada-zonas/secoes-caudas.csv,
// zonas.csv, historico-zonas.csv. Uso: node scripts/auditoria/virada-zonas-casos.mjs [uf/zona ...]
// Sem argumento: as zonas fora da curva (coluna fora ≠ 0). Saída: data/parsed/auditoria/virada-zonas/casos.json.
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { RAIZ, lerTabela } from './forense-lib.mjs';

const DIR = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'virada-zonas');
const r2 = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : null);
const pp = (a, b) => (b > 0 ? (100 * a) / b : NaN);
const NUM = ['a2', 'c1', 'c2', 'v13_1', 'v22_1', 'e14', 'e30', 'e55', 'e70', 'dem', 'bn1', 'v13_2', 'v22_2', 'bn2', 'p13', 'p22', 'rl', 'alem'];
const secoes = await lerTabela(path.join(DIR, 'secoes-caudas.csv'), NUM);
const zonas = await lerTabela(path.join(DIR, 'zonas.csv'), ['fora', 'z', 'alemEsperado', 'viradaBruta', 'secoes']);
const hist = new Map((await lerTabela(path.join(DIR, 'historico-zonas.csv'), ['z2022', 'pct2022', 'z2018', 'pct2018'])).map((h) => [`${h.uf}/${h.zona}`, h]));
const alvo = process.argv.length > 2 ? process.argv.slice(2) : zonas.filter((z) => z.fora).map((z) => `${z.uf}/${z.zona}`);

function grupo(lista, chave) {
  const m = new Map();
  for (const s of lista) {
    const k = chave(s);
    const g = m.get(k) ?? m.set(k, { secoes: 0, rl: 0, nom2: 0, c1: 0, c2: 0, a2: 0 }).get(k);
    g.secoes++; g.rl += s.rl; g.nom2 += s.v13_2 + s.v22_2; g.c1 += s.c1; g.c2 += s.c2; g.a2 += s.a2;
  }
  return [...m].map(([k, g]) => ({ grupo: k, secoes: g.secoes, residuoLiquido: Math.round(g.rl), alemEsperado: r2(pp(g.rl, g.nom2)), deltaComparecimento: r2(pp(g.c2 - g.c1, g.a2)) }))
    .sort((a, b) => a.residuoLiquido - b.residuoLiquido);
}

const casos = [];
for (const a of alvo) {
  const [uf, zona] = a.split('/');
  const z = zonas.find((x) => x.uf === uf && x.zona === zona);
  const l = secoes.filter((s) => s.uf === uf && s.zona === zona);
  if (!z || !l.length) throw new Error(`${a}: zona sem seções em secoes-caudas.csv`);
  const total = l.reduce((s, x) => s + x.rl, 0);
  const lado = Math.sign(total);
  const ord = [...l].sort((x, y) => lado * (y.rl - x.rl));
  const dec = Math.max(1, Math.round(l.length / 10));
  const h = hist.get(a);
  casos.push({
    zona: a, municipioPrincipal: z.municipioPrincipal, secoes: l.length, viradaBruta: z.viradaBruta, alemEsperado: z.alemEsperado, z: z.z,
    residuoLiquido: Math.round(total),
    secoesDoMesmoLado: l.filter((s) => Math.sign(s.rl) === lado).length,
    parcelaDas10PctPiores: r2((100 * ord.slice(0, dec).reduce((s, x) => s + x.rl, 0)) / total),
    porMunicipio: grupo(l, (s) => s.municipio),
    porModelo: grupo(l, (s) => s.modelo2),
    locais: grupo(l, (s) => `${s.municipio}/${s.local2}`).length,
    piores5Locais: grupo(l, (s) => `${s.municipio}/${s.local2}`).sort((x, y) => lado * (y.residuoLiquido - x.residuoLiquido)).slice(0, 5),
    piores5Secoes: ord.slice(0, 5).map((s) => ({ secao: `${s.municipio}/${s.secao}`, local: s.local2, modelo: s.modelo2, a2: s.a2, c1: s.c1, c2: s.c2,
      v13: `${s.v13_1}→${s.v13_2}`, v22: `${s.v22_1}→${s.v22_2}`, eliminados1: s.e14 + s.e30 + s.e55 + s.e70 + s.dem, bn: `${s.bn1}→${s.bn2}`,
      esperado13: s.p13, esperado22: s.p22, residuoLiquido: s.rl })),
    historico: h ? { z2022: h.z2022, pct2022: h.pct2022, z2018: h.z2018, pct2018: h.pct2018 } : null,
  });
}
await writeFile(path.join(DIR, 'casos.json'), JSON.stringify({ geradoEm: new Date().toISOString(), casos }, null, 1));
console.log(JSON.stringify(casos, null, 1));
