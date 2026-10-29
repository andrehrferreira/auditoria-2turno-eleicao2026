// Cético, caso PI 11878/0028/0099: quem está na cauda do desvio padronizado (z binomial do resíduo da fatia do 13
// em relação à mediana do município)? A cauda é assimétrica (contra o 13 × a favor do 13)? É efeito de "outros"
// candidatos do 1º turno, de tamanho da seção ou de UF?
// Uso: node scripts/auditoria/cetico-pi0099-cauda-z.mjs   Saída: data/parsed/auditoria/cetico/cetico-pi0099-cauda-z.json
import { createReadStream, readdirSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

const DIR = 'data/parsed/comparacao-turnos';
const mediana = (v) => { const s = [...v].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const r = (x, d = 3) => Math.round(x * 10 ** d) / 10 ** d;
const porMun = new Map();
for (const arq of readdirSync(DIR).filter((n) => /^[a-z]{2}\.jsonl$/.test(n))) {
  for await (const linha of createInterface({ input: createReadStream(`${DIR}/${arq}`) })) {
    if (!linha.trim()) continue;
    const s = JSON.parse(linha);
    const L1 = s.votos1['13'], F1 = s.votos1['22'], L2 = s.votos2['13'], F2 = s.votos2['22'];
    if (!(L1 + F1) || !(L2 + F2)) continue;
    const x = { k: `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`, uf: s.uf, v1: L1 + F1, v2: L2 + F2, p1: L1 / (L1 + F1), p2: L2 / (L2 + F2),
      outros1: s.votos1.outros / s.comparecimento1, dComp: s.comparecimento2 - s.comparecimento1, mig22: s.migracaoMinima['22'], mig13: s.migracaoMinima['13'] };
    x.d = x.p2 - x.p1;
    const km = `${s.uf}/${s.municipio}`;
    if (!porMun.has(km)) porMun.set(km, []);
    porMun.get(km).push(x);
  }
}
const todas = [];
for (const l of porMun.values()) { const m = mediana(l.map((x) => x.d)); for (const x of l) { x.res = x.d - m; x.nMun = l.length; todas.push(x); } }
const u = todas.filter((x) => x.v1 >= 200 && x.v2 >= 200 && x.nMun >= 10);
// p clipado em [0,5/v, 1-0,5/v]: com fatia 0% ou 100% nos dois turnos o denominador seria zero (z infinito)
const cl = (p, v) => Math.min(1 - 0.5 / v, Math.max(0.5 / v, p));
for (const x of u) { const a = cl(x.p1, x.v1), b = cl(x.p2, x.v2); x.z = x.res / Math.sqrt(a * (1 - a) / x.v1 + b * (1 - b) / x.v2); }
const lim = 4.4;
const baixo = u.filter((x) => x.z <= -lim).sort((a, b) => a.z - b.z);
const alto = u.filter((x) => x.z >= lim).sort((a, b) => b.z - a.z);
const fmt = (x) => ({ secao: x.k, z: r(x.z, 2), residuo: r(x.res), fatia1: r(x.p1), fatia2: r(x.p2), outros1: r(x.outros1), dComp: x.dComp, mig22: x.mig22, mig13: x.mig13 });
// Também sem exigir 200 votos: cauda em pp (|resíduo| >= 17,3 p.p.) com >= 100 votos válidos
const u100 = todas.filter((x) => x.v1 >= 100 && x.v2 >= 100 && x.nMun >= 10);
const pp = (s) => u100.filter((x) => s * x.res >= 0.173).length;
const out = {
  universo: u.length, limiteZ: lim,
  contraO13: baixo.length, aFavorDo13: alto.length,
  medianaResiduoUniverso: r(mediana(u.map((x) => x.res)), 4),
  zDaSecaoAlvoPosicao: baixo.findIndex((x) => x.k === 'pi/11878/0028/0099') + 1,
  listaContra: baixo.map(fmt), listaAFavor: alto.map(fmt),
  porUfContra: baixo.reduce((a, x) => ((a[x.uf] = (a[x.uf] ?? 0) + 1), a), {}),
  cauda100votos: { universo: u100.length, residuoContraO13_ge17_3pp: pp(-1), residuoAFavorDo13_ge17_3pp: pp(1) },
};
writeFileSync('data/parsed/auditoria/cetico/cetico-pi0099-cauda-z.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
