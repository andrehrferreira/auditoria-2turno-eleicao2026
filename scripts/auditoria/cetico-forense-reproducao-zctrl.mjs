// Revisor cético, achado forense-sem-marca-de-fraude, lente reprodução: conferência do "z com controles" (doc 05/07).
// Duas suspeitas de código em forense-zscore.mjs:
//   (1) filtro silencioso: seção sem perfil do eleitorado fica com z_ctrl = null e some da contagem "com controles";
//   (2) mediana/MAD do resíduo calculadas sobre um vetor com NaN (seções sem perfil da mesma zona). Float64Array.sort
//       põe NaN no fim, então a "mediana" vira um quantil acima de 50% dos valores válidos e o MAD também se desloca.
// Este script refaz o z com controles (a) como o autor (com NaN) e (b) corrigido (mediana e MAD só dos válidos), e
// conta quantas seções da cauda bruta caem por falta de perfil.
// Usa a carga de seções + perfil de forense-lib.mjs (carregarSecoes) só como fonte do perfil; o cálculo é próprio.
// Uso: node --max-old-space-size=4096 scripts/auditoria/cetico-forense-reproducao-zctrl.mjs
// Saída: data/parsed/auditoria/cetico/forense-reproducao-zctrl.json
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { carregarSecoes, mqo } from './forense-lib.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const SAIDA = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico');
mkdirSync(SAIDA, { recursive: true });
const CONTROLES = ['p60', 'pBaixa', 'pSup', 'pInd', 'pQuil'];
const LIM = 5, MINZ = 10;

const secoes = (await carregarSecoes(2)).filter((s) => s.validos > 0 && s.aptos > 0);
const zonas = new Map();
for (const s of secoes) { const k = `${s.uf}/${s.zona}`; if (!zonas.has(k)) zonas.set(k, []); zonas.get(k).push(s); }
const grandes = [...zonas.values()].filter((g) => g.length >= MINZ);

const medianaComNaN = (vs) => { const v = Float64Array.from(vs).sort(); const n = v.length; return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2; };
const medianaValidos = (vs) => medianaComNaN(vs.filter((x) => Number.isFinite(x)));

function z(g, valor, med) {
  const vs = g.map(valor);
  const m = med(vs);
  const mad = 1.4826 * med(vs.map((x) => Math.abs(x - m)));
  return vs.map((x) => (mad > 0 && Number.isFinite(x) ? (x - m) / mad : null));
}

const y13 = (s) => s.v13 / s.validos;
// z bruto
const zb = new Map();
for (const g of grandes) z(g, y13, medianaComNaN).forEach((v, i) => zb.set(g[i], v));
// resíduo (mesma regressão do autor: variáveis centradas na zona, só zonas com ≥ 10 seções com perfil completo)
const X = [], Y = [], quem = [];
for (const g of grandes) {
  const com = g.filter((s) => CONTROLES.every((c) => s[c] != null));
  if (com.length < MINZ) continue;
  const mC = CONTROLES.map((c) => com.reduce((a, s) => a + s[c], 0) / com.length);
  const mY = com.reduce((a, s) => a + y13(s), 0) / com.length;
  for (const s of com) { X.push(CONTROLES.map((c, j) => s[c] - mC[j])); Y.push(y13(s) - mY); quem.push(s); }
}
const b = mqo(X, Y);
const resid = new Map(quem.map((s, i) => [s, Y[i] - X[i].reduce((a, v, j) => a + v * b[j], 0)]));
const r = (s) => resid.get(s) ?? NaN;
const zA = new Map(), zC = new Map();
let zonasComNaN = 0, secoesSemResid = 0;
for (const g of grandes) {
  if (g.some((s) => !resid.has(s))) zonasComNaN++;
  secoesSemResid += g.filter((s) => !resid.has(s)).length;
  z(g, r, medianaComNaN).forEach((v, i) => zA.set(g[i], v));
  z(g, r, medianaValidos).forEach((v, i) => zC.set(g[i], v));
}
const todos = grandes.flat();
const conta = (m, f) => todos.filter((s) => m.get(s) != null && f(m.get(s))).length;
const brutoAlto = todos.filter((s) => (zb.get(s) ?? 0) >= LIM);
const res = {
  secoes: todos.length, zonas: grandes.length, coeficientes: Object.fromEntries(CONTROLES.map((c, j) => [c, +b[j].toFixed(4)])),
  secoesSemResiduo: secoesSemResid, zonasComSecaoSemResiduo: zonasComNaN,
  bruto: { alto13: brutoAlto.length, baixo13: conta(zb, (v) => v <= -LIM) },
  cauda13BrutaSemPerfil: brutoAlto.filter((s) => !resid.has(s)).length,
  cauda13BrutaSemPerfilPorCategoria: brutoAlto.filter((s) => !resid.has(s)).reduce((a, s) => ((a[s.categoria] = (a[s.categoria] ?? 0) + 1), a), {}),
  comoAutor: { alto13: conta(zA, (v) => v >= LIM), alto22: conta(zA, (v) => v <= -LIM) },
  corrigido: { alto13: conta(zC, (v) => v >= LIM), alto22: conta(zC, (v) => v <= -LIM) },
  // parte da diferença está só nas zonas com NaN
  soZonasComNaN: (() => {
    const zs = grandes.filter((g) => g.some((s) => !resid.has(s))).flat();
    const c = (m, f) => zs.filter((s) => m.get(s) != null && f(m.get(s))).length;
    return { secoes: zs.length, comoAutor: { alto13: c(zA, (v) => v >= LIM), alto22: c(zA, (v) => v <= -LIM) }, corrigido: { alto13: c(zC, (v) => v >= LIM), alto22: c(zC, (v) => v <= -LIM) } };
  })(),
};
// binomial bilateral contra 0,5 (simetria dos resíduos) e contra a parcela nacional 0,5179, para o corrigido
function pBin(k, n, p) {
  const lg = (x) => { let s = 0; for (let i = 2; i <= x; i++) s += Math.log(i); return s; };
  const pmf = (j) => Math.exp(lg(n) - lg(j) - lg(n - j) + j * Math.log(p) + (n - j) * Math.log(1 - p));
  const pk = pmf(k); let t = 0; for (let j = 0; j <= n; j++) { const q = pmf(j); if (q <= pk * (1 + 1e-9)) t += q; } return Math.min(1, t);
}
const nC = res.corrigido.alto13 + res.corrigido.alto22;
res.corrigido.p_vs_0_5 = +pBin(res.corrigido.alto13, nC, 0.5).toFixed(4);
res.corrigido.p_vs_0_5179 = +pBin(res.corrigido.alto13, nC, 0.5179).toFixed(4);
const nA = res.comoAutor.alto13 + res.comoAutor.alto22;
res.comoAutor.p_vs_0_5179 = +pBin(res.comoAutor.alto13, nA, 0.5179).toFixed(4);
writeFileSync(path.join(SAIDA, 'forense-reproducao-zctrl.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
