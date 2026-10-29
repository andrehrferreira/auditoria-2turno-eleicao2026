// Cético, lente "dados e definições", achado aumento-comparecimento-difuso: o teste "cauda direita × esquerda" do autor
// usa a proporção 1/2 como nulo, mas o nulo que ele mesmo sorteia é assimétrico (turnout perto de 80% tem cauda esquerda
// mais longa). Aqui a proporção de referência de cada UF sai do próprio nulo do autor (40 sorteios, mulberry32) e o teste
// binomial unilateral (cauda direita acima do que o nulo prevê) é refeito por UF, com BH.
//
// Uso: node --max-old-space-size=4096 scripts/auditoria/cetico-acd-simetria.mjs [replicas]
// Saída: data/parsed/auditoria/cetico/acd-simetria.json
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { RAIZ, aleatorio, sortearBeta, sortearBinomial } from './forense-lib.mjs';
import { bh, carregarIdade, filtrar, lerPares, modelar, sortearNulo } from './estatistico-lib.mjs';

const REP = Number(process.argv[2] ?? 40);
const { P } = filtrar(await lerPares('abertos'));
await carregarIdade(P);
modelar(P);
const ufs = [...new Set(P.map((s) => s.uf))].sort();
const LIM = [3, 4];
const nulo = Object.fromEntries(ufs.map((u) => [u, Object.fromEntries(LIM.map((k) => [k, { acima: 0, abaixo: 0 }]))]));
const rnd = aleatorio(20261029);
for (let r = 0; r < REP; r++) for (const s of P) {
  const z = (sortearNulo(s, rnd, sortearBinomial, sortearBeta) - s.a2 * s.p) / Math.sqrt(s.V);
  for (const k of LIM) { if (z >= k) nulo[s.uf][k].acima++; else if (z <= -k) nulo[s.uf][k].abaixo++; }
}
// P(X ≥ R | n, p) exata (soma da binomial em log)
const lgam = (x) => { let s = 0; for (let i = 2; i <= x; i++) s += Math.log(i); return s; };
const pCaudaSup = (R, n, p) => {
  if (n === 0) return 1;
  if (p <= 0) return R > 0 ? 0 : 1;
  let t = 0;
  for (let x = R; x <= n; x++) t += Math.exp(lgam(n) - lgam(x) - lgam(n - x) + x * Math.log(p) + (n - x) * Math.log1p(-p));
  return Math.min(1, t);
};
const out = { replicas: REP, semente: 20261029, porLimiar: {} };
for (const k of LIM) {
  const linhas = ufs.map((u) => {
    const l = P.filter((s) => s.uf === u);
    const R = l.filter((s) => s.z >= k).length, L = l.filter((s) => s.z <= -k).length;
    const nA = nulo[u][k].acima, nB = nulo[u][k].abaixo;
    // proporção do nulo com pseudocontagem 0,5 em cada lado (UF com nulo quase vazio)
    const pNulo = (nA + 0.5) / (nA + nB + 1);
    return { uf: u, obsAcima: R, obsAbaixo: L, parteDireitaObs: R + L ? +(R / (R + L)).toFixed(3) : null,
      nuloAcimaMedia: +(nA / REP).toFixed(2), nuloAbaixoMedia: +(nB / REP).toFixed(2), parteDireitaNulo: +pNulo.toFixed(3),
      pMeio: pCaudaSup(R, R + L, 0.5), pNulo: pCaudaSup(R, R + L, pNulo) };
  });
  const qm = bh(linhas.map((l) => l.pMeio)), qn = bh(linhas.map((l) => l.pNulo));
  linhas.forEach((l, i) => { l.qMeio = +qm[i].toPrecision(3); l.qNulo = +qn[i].toPrecision(3); l.pMeio = +l.pMeio.toPrecision(3); l.pNulo = +l.pNulo.toPrecision(3); });
  const tA = linhas.reduce((a, l) => a + l.obsAcima, 0), tB = linhas.reduce((a, l) => a + l.obsAbaixo, 0);
  const nA = ufs.reduce((a, u) => a + nulo[u][k].acima, 0), nB = ufs.reduce((a, u) => a + nulo[u][k].abaixo, 0);
  out.porLimiar[k] = { nacional: { obsAcima: tA, obsAbaixo: tB, parteDireitaObs: +(tA / (tA + tB)).toFixed(3), nuloAcimaMedia: nA / REP, nuloAbaixoMedia: nB / REP, parteDireitaNulo: +(nA / (nA + nB)).toFixed(3) },
    ufsQMeioMenor005: linhas.filter((l) => l.qMeio < 0.05).map((l) => l.uf), ufsQNuloMenor005: linhas.filter((l) => l.qNulo < 0.05).map((l) => l.uf), porUf: linhas };
}
const dir = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico');
await mkdir(dir, { recursive: true });
await writeFile(path.join(dir, 'acd-simetria.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
