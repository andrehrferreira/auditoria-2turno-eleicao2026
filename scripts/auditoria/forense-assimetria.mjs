// Forense estatística, teste 6: as anomalias favorecem um lado?
// Uso: node scripts/auditoria/forense-assimetria.mjs [turno]   (depois de a3a4, klimek e zscore do mesmo turno)
// Saída: forense/assimetria-<t>t.json
//
// Para cada classe de anomalia: quantas favorecem o 13 e quantas o 22, comparado com
//   (i)  a proporção nacional de votos válidos (nulo ingênuo: anomalia distribuída como o voto);
//   (ii) o esperado pelo modelo nulo do próprio teste (beta-binomial na zona, permutação, normal), quando houver.
// Também repete só com seções "comuns" (fora de aldeia, quilombo, prisão, exterior, trânsito, local temporário).
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { DIR_SAIDA, binomialCauda, lerTabela, salvar } from './forense-lib.mjs';

const turno = Number(process.argv[2] ?? 2);
const ler = async (n) => JSON.parse(await readFile(path.join(DIR_SAIDA, n), 'utf8'));
const secoes = await lerTabela(path.join(DIR_SAIDA, `secoes-${turno}t.csv`), ['v13', 'v22']);
const v13 = secoes.reduce((a, s) => a + s.v13, 0), v22 = secoes.reduce((a, s) => a + s.v22, 0);
const p13 = v13 / (v13 + v22);

const a3 = await ler(`a3a4-${turno}t.json`);
const kl = await ler(`klimek-${turno}t.json`);
const zs = await ler(`zscore-${turno}t.json`);
const listaA3 = await lerTabela(path.join(DIR_SAIDA, `a3a4-${turno}t-secoes.csv`), ['candidato']);
const cauda = await lerTabela(path.join(DIR_SAIDA, `zscore-${turno}t-cauda.csv`),
  ['z_parcela13', 'z_ctrl_parcela13', 'z_comparecimento', 'z_ctrl_comparecimento', 'pct13']);

const soma = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const classes = [];
const add = (nome, n13, n22, esp13 = null, esp22 = null, obs = '') => {
  const n = n13 + n22;
  // Valor-p bilateral exato contra a proporção nacional.
  const pMais = binomialCauda(n, p13, n13), pMenos = 1 - binomialCauda(n, p13, n13 + 1);
  classes.push({ classe: nome, favorece13: n13, favorece22: n22, fracao13: n ? +(n13 / n).toFixed(3) : null,
    pValorVsNacional: n ? Math.min(1, 2 * Math.min(pMais, pMenos)) : null, esperadoModelo13: esp13, esperadoModelo22: esp22, obs });
};

const r = a3.resumo;
add('A3: 100% dos válidos', r[13].total.observado['100'], r[22].total.observado['100'], r[13].total['betabin-zona']['100'], r[22].total['betabin-zona']['100'], 'esperado: beta-binomial na zona');
add('A4: ≥ 90% dos válidos', soma(r[13].total.observado), soma(r[22].total.observado), +soma(r[13].total['betabin-zona']).toFixed(1), +soma(r[22].total['betabin-zona']).toFixed(1), 'esperado: beta-binomial na zona');
const comumA3 = (c, f) => listaA3.filter((l) => l.candidato === c && l.categoria === 'comum' && f(l)).length;
add('A4: ≥ 90%, só seções comuns', comumA3(13, () => true), comumA3(22, () => true),
  +soma(r[13].categoria.comum['betabin-zona']).toFixed(1), +soma(r[22].categoria.comum['betabin-zona']).toFixed(1));
add('A3: 100%, só seções comuns', comumA3(13, (l) => l.faixa === '100'), comumA3(22, (l) => l.faixa === '100'),
  +r[13].categoria.comum['betabin-zona']['100'].toFixed(1), +r[22].categoria.comum['betabin-zona']['100'].toFixed(1));
add('A4: surpreendentes (Bonferroni, beta-binomial)', a3.surpreendentes.pval_betabin_zona[13], a3.surpreendentes.pval_betabin_zona[22]);
const k = kl.candidatos;
add('Klimek: canto comparecimento ≥ 95% e parcela ≥ 95%', k[13].canto95.observado, k[22].canto95.observado, k[13].canto95.esperadoPermutacao, k[22].canto95.esperadoPermutacao, 'esperado: permutação do comparecimento dentro da zona');
add('Klimek: canto ≥ 90% e ≥ 90%', k[13].canto90.observado, k[22].canto90.observado, k[13].canto90.esperadoPermutacao, k[22].canto90.esperadoPermutacao);
add('Klimek: zonas com r(comparecimento, parcela) > 0,5', k[13].correlacao.zonasRmaior05, k[22].correlacao.zonasRmaior05);
const z = zs.variaveis.parcela13, z22 = zs.variaveis.parcela22; // "favorece" = parcela do candidato muito ACIMA da zona
add('z robusto: parcela ≥ 5 MAD acima da zona (bruto)', z.bruto.alto, z22.bruto.alto, z.esperadoNormal / 2, z.esperadoNormal / 2, 'esperado: normal (subestima caudas reais)');
add('z robusto: parcela ≥ 5 MAD acima da zona (com controles de perfil)', z.comControles.alto, z22.comControles.alto);
// Comparecimento extremo alto: quem venceu a seção (parcela do 13 acima ou abaixo de 50%).
// Esperado: fração de seções vencidas pelo 13 na zona de cada seção extrema (o 13 vence mais onde é forte).
const vence13 = new Map();
for (const s of secoes) {
  if (s.v13 === s.v22) continue;
  const kz = `${s.uf}/${s.zona}`;
  const v = vence13.get(kz) ?? { a: 0, n: 0 };
  v.n++; if (s.v13 > s.v22) v.a++;
  vence13.set(kz, v);
}
const esperadoZona = (lista) => {
  const e = lista.reduce((a, s) => { const v = vence13.get(`${s.uf}/${s.zona}`); return a + (v ? v.a / v.n : p13); }, 0);
  return [+e.toFixed(1), +(lista.length - e).toFixed(1)];
};
const compAlto = cauda.filter((s) => s.z_comparecimento >= 5 && s.pct13 !== 50);
add('comparecimento z ≥ 5: seção vencida por', compAlto.filter((s) => s.pct13 > 50).length, compAlto.filter((s) => s.pct13 < 50).length,
  ...esperadoZona(compAlto), 'esperado: fração de seções vencidas por cada um na mesma zona');
const compAltoCtrl = cauda.filter((s) => s.z_ctrl_comparecimento >= 5 && s.pct13 !== 50);
add('comparecimento z ≥ 5 (com controles): seção vencida por', compAltoCtrl.filter((s) => s.pct13 > 50).length, compAltoCtrl.filter((s) => s.pct13 < 50).length,
  ...esperadoZona(compAltoCtrl));

const res = { turno, parcelaNacional13: +p13.toFixed(4), classes };
await salvar(`assimetria-${turno}t.json`, res);
console.log(`Assimetria, ${turno}º turno. Parcela do 13 nos válidos: ${(100 * p13).toFixed(2)}%`);
for (const c of classes) {
  console.log(`  ${c.classe.padEnd(58)} 13: ${String(c.favorece13).padStart(5)}  22: ${String(c.favorece22).padStart(5)}  fração 13: ${c.fracao13 ?? '—'}  p(vs nacional): ${c.pValorVsNacional == null ? '—' : c.pValorVsNacional.toExponential(1)}${c.esperadoModelo13 != null ? `  modelo: 13 ${c.esperadoModelo13} / 22 ${c.esperadoModelo22}` : ''}`);
}
