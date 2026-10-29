// Revisor cético, achado "linha-de-base-2018-2022", lente: dados e definições.
// A correlação 0,51 das viradas municipais 2026 × 2018 é geografia política ou efeito mecânico da definição
// (virada = variação da fatia do 13 no confronto; ela depende do tamanho dos eliminados e do teto f1·(1−f1))?
// Recalcula a correlação do autor e a correlação parcial controlando, nos dois anos, a fatia dos eliminados,
// a fatia do 13 no 1º turno e f1·(1−f1). Também mede a correlação das variações de votos nominais por município.
// Uso: node scripts/auditoria/cetico-lbh-dados-virada.mjs   Saída: data/parsed/auditoria/cetico/cetico-lbh-dados-virada.json
import { writeFileSync } from 'node:fs';
import { entradasZip, linhasBrutas } from './contagem-zip.mjs';

async function municipios(ano) {
  const zip = `data/raw/dadosabertos/votacao_candidato_munzona/votacao_candidato_munzona_${ano}.zip`;
  const e = (await entradasZip(zip)).find((x) => x.nome === `votacao_candidato_munzona_${ano}_BR.csv`);
  const mun = new Map();
  let col = null;
  for await (const c of linhasBrutas(zip, e)) {
    if (!col) { col = Object.fromEntries(c.map((x, i) => [x.trim(), i])); continue; }
    if (c[col.CD_CARGO] !== '1') continue;
    const k = `${c[col.SG_UF].toLowerCase()}|${c[col.CD_MUNICIPIO]}`;
    let m = mun.get(k);
    if (!m) mun.set(k, (m = [null, {}, {}]));
    const t = Number(c[col.NR_TURNO]), nr = c[col.NR_CANDIDATO];
    m[t][nr] = (m[t][nr] ?? 0) + Number(c[col.QT_VOTOS_NOMINAIS]);
  }
  const out = new Map();
  const outro = { 2018: '17', 2022: '22', 2026: '22' }[ano];
  for (const [k, [, v1, v2]] of mun) {
    const t1 = Object.values(v1).reduce((a, b) => a + b, 0), t2 = Object.values(v2).reduce((a, b) => a + b, 0);
    const h1 = (v1['13'] ?? 0) + (v1[outro] ?? 0), h2 = (v2['13'] ?? 0) + (v2[outro] ?? 0);
    if (h1 < 100 || h2 < 100) continue;
    const f1 = (v1['13'] ?? 0) / h1, f2 = (v2['13'] ?? 0) / h2;
    out.set(k, { virada: f2 - f1, f1, teto: f1 * (1 - f1), elim: (t1 - h1) / t1, dNom: t2 / t1 - 1, peso: h2 });
  }
  return out;
}

// regressão ponderada por mínimos quadrados (equações normais, Gauss), devolve resíduos
function residuos(y, X, w) {
  const p = X[0].length + 1, A = Array.from({ length: p }, () => new Array(p + 1).fill(0));
  for (let i = 0; i < y.length; i++) {
    const x = [1, ...X[i]];
    for (let a = 0; a < p; a++) { for (let b = 0; b < p; b++) A[a][b] += w[i] * x[a] * x[b]; A[a][p] += w[i] * x[a] * y[i]; }
  }
  for (let a = 0; a < p; a++) {
    let piv = a; for (let r = a + 1; r < p; r++) if (Math.abs(A[r][a]) > Math.abs(A[piv][a])) piv = r;
    [A[a], A[piv]] = [A[piv], A[a]];
    for (let r = 0; r < p; r++) if (r !== a) { const f = A[r][a] / A[a][a]; for (let c = a; c <= p; c++) A[r][c] -= f * A[a][c]; }
  }
  const beta = A.map((r, i) => r[p] / r[i]);
  return y.map((v, i) => v - [1, ...X[i]].reduce((s, x, j) => s + beta[j] * x, 0));
}
const corr = (x, y, w) => {
  const sw = w.reduce((a, b) => a + b, 0);
  const mx = x.reduce((a, v, i) => a + w[i] * v, 0) / sw, my = y.reduce((a, v, i) => a + w[i] * v, 0) / sw;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < x.length; i++) { sxy += w[i] * (x[i] - mx) * (y[i] - my); sxx += w[i] * (x[i] - mx) ** 2; syy += w[i] * (y[i] - my) ** 2; }
  return +(sxy / Math.sqrt(sxx * syy)).toFixed(3);
};

const dados = {};
for (const ano of [2018, 2022, 2026]) { dados[ano] = await municipios(ano); console.error(ano, dados[ano].size); }
const res = {};
for (const ano of [2018, 2022]) {
  const ks = [...dados[2026].keys()].filter((k) => dados[ano].has(k));
  const a = ks.map((k) => dados[2026].get(k)), b = ks.map((k) => dados[ano].get(k)), w = a.map((x) => x.peso);
  const y26 = a.map((x) => x.virada), yAno = b.map((x) => x.virada);
  const ctl = ks.map((_, i) => [a[i].f1, a[i].teto, a[i].elim, b[i].f1, b[i].teto, b[i].elim]);
  res[`2026x${ano}`] = {
    municipios: ks.length,
    correlacaoAutor: corr(y26, yAno, w),
    parcialControles: corr(residuos(y26, ctl, w), residuos(yAno, ctl, w), w),
    viradaVsElim2026: corr(y26, a.map((x) => x.elim), w),
    viradaVsElimAno: corr(yAno, b.map((x) => x.elim), w),
    elim2026xElimAno: corr(a.map((x) => x.elim), b.map((x) => x.elim), w),
    dNominais2026xAno: corr(a.map((x) => x.dNom), b.map((x) => x.dNom), w),
  };
}
writeFileSync('data/parsed/auditoria/cetico/cetico-lbh-dados-virada.json', JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
