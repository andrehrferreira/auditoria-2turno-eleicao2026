// Revisor cético, achado forense-sem-marca-de-fraude, lente reprodução: os controles escondem fraude feita
// exatamente onde eles atuam? (circularidade de "aldeia/quilombo/presídio" e do perfil indígena/escolaridade).
// Injeta fraude a favor do 13 só nas seções que o autor classifica como indígena, quilombola ou prisional, ou com
// ≥ 30% de escolaridade baixa, e refaz o z robusto com controles (mesma regressão do doc 05, mediana só dos válidos).
// Pergunta: a cauda "com controles" continua simétrica (13 ≈ 22) mesmo com a fraude?
// Uso: node --max-old-space-size=4096 scripts/auditoria/cetico-forense-reproducao-circular.mjs
// Saída: data/parsed/auditoria/cetico/forense-reproducao-circular.json
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { carregarSecoes, mqo } from './forense-lib.mjs';

const DIR = path.resolve(import.meta.dirname, '..', '..', 'data', 'parsed', 'auditoria', 'cetico');
const CONTROLES = ['p60', 'pBaixa', 'pSup', 'pInd', 'pQuil'];
const secoes = (await carregarSecoes(2)).filter((s) => s.validos > 0 && s.aptos > 0);
const zonasM = new Map();
for (const s of secoes) { const k = `${s.uf}/${s.zona}`; if (!zonasM.has(k)) zonasM.set(k, []); zonasM.get(k).push(s); }
const grandes = [...zonasM.values()].filter((g) => g.length >= 10);
const med = (a) => { const v = Float64Array.from(a.filter(Number.isFinite)).sort(); const n = v.length; return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2; };

function rodar(v13de) {
  const y = (s) => v13de(s) / s.validos;
  let brutoA = 0, brutoB = 0;
  for (const g of grandes) {
    const ys = g.map(y); const m = med(ys), mad = 1.4826 * med(ys.map((v) => Math.abs(v - m)));
    if (mad > 0) for (const v of ys) { const z = (v - m) / mad; if (z >= 5) brutoA++; if (z <= -5) brutoB++; }
  }
  const X = [], Y = [], quem = [];
  for (const g of grandes) {
    const com = g.filter((s) => CONTROLES.every((c) => s[c] != null));
    if (com.length < 10) continue;
    const mC = CONTROLES.map((c) => com.reduce((a, s) => a + s[c], 0) / com.length);
    const mY = com.reduce((a, s) => a + y(s), 0) / com.length;
    for (const s of com) { X.push(CONTROLES.map((c, j) => s[c] - mC[j])); Y.push(y(s) - mY); quem.push(s); }
  }
  const b = mqo(X, Y);
  const res = new Map(quem.map((s, i) => [s, Y[i] - X[i].reduce((a, v, j) => a + v * b[j], 0)]));
  let ctrlA = 0, ctrlB = 0;
  for (const g of grandes) {
    const rs = g.map((s) => res.get(s) ?? NaN); const m = med(rs), mad = 1.4826 * med(rs.map((v) => Math.abs(v - m)));
    if (mad > 0) for (const v of rs) { if (!Number.isFinite(v)) continue; const z = (v - m) / mad; if (z >= 5) ctrlA++; if (z <= -5) ctrlB++; }
  }
  return { bruto: { alto13: brutoA, alto22: brutoB }, comControles: { alto13: ctrlA, alto22: ctrlB },
    coef: Object.fromEntries(CONTROLES.map((c, j) => [c, +b[j].toFixed(3)])) };
}

const alvoCat = (s) => ['indigena', 'quilombola', 'prisional'].includes(s.categoria);
const alvoBaixa = (s) => (s.pBaixa ?? 0) >= 0.3;
const troca = (alvo, k) => (s) => (alvo(s) ? s.v13 + Math.min(k, s.v22) : s.v13);
const out = { secoes: secoes.length, alvoCategoria: secoes.filter(alvoCat).length, alvoEscolBaixa30: secoes.filter(alvoBaixa).length, cenarios: {} };
const cen = {
  'sem fraude': (s) => s.v13,
  'troca 10 votos 22→13 em aldeia/quilombo/presídio': troca(alvoCat, 10),
  'troca 30 votos 22→13 em aldeia/quilombo/presídio': troca(alvoCat, 30),
  'troca 10 votos 22→13 onde escolaridade baixa ≥ 30%': troca(alvoBaixa, 10),
};
for (const [nome, f] of Object.entries(cen)) {
  const votos = secoes.reduce((a, s) => a + f(s) - s.v13, 0);
  out.cenarios[nome] = { votosTrocados: votos, ...rodar(f) };
  console.log(nome, JSON.stringify(out.cenarios[nome]));
}
writeFileSync(path.join(DIR, 'forense-reproducao-circular.json'), JSON.stringify(out, null, 1));
