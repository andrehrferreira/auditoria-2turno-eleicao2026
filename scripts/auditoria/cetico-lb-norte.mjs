// Revisor cético, achado "linha-de-base-2018-2022": em 2026, a variação de votos nominais (proxy usada pelo autor
// para 2018/2022) acompanha a do comparecimento no Norte, capital × interior? Lê o detalhe_votacao_secao_2026_BR.csv
// pela entrada padrão. Uso:
//   unzip -p data/raw/dadosabertos/detalhe_votacao_secao/detalhe_votacao_secao_2026.zip detalhe_votacao_secao_2026_BR.csv | node scripts/auditoria/cetico-lb-norte.mjs
import readline from 'node:readline';
const CAP = { ac: 'RIO BRANCO', am: 'MANAUS', ap: 'MACAPÁ', rr: 'BOA VISTA', pa: 'BELÉM', ro: 'PORTO VELHO', to: 'PALMAS' };
const rl = readline.createInterface({ input: process.stdin.setEncoding('latin1'), crlfDelay: Infinity });
let col = null; const a = {};
for await (const l of rl) {
  const c = l.split(';').map((s) => s.replace(/^"|"$/g, ''));
  if (!col) { col = Object.fromEntries(c.map((v, i) => [v, i])); continue; }
  const uf = c[col.SG_UF].toLowerCase();
  if (!CAP[uf] || c[col.CD_CARGO] !== '1') continue;
  const k = `${uf}|${c[col.NM_MUNICIPIO] === CAP[uf] ? 'capital' : 'interior'}|${c[col.NR_TURNO]}`;
  const x = (a[k] ??= { aptos: 0, comp: 0, nom: 0 });
  x.aptos += +c[col.QT_APTOS]; x.comp += +c[col.QT_COMPARECIMENTO]; x.nom += +c[col.QT_VOTOS_NOMINAIS];
}
const f = (v) => (100 * v).toFixed(1);
for (const uf of Object.keys(CAP)) for (const p of ['capital', 'interior']) {
  const x = a[`${uf}|${p}|1`], y = a[`${uf}|${p}|2`];
  if (!x || !y) { console.log(uf, p, 'sem dados'); continue; }
  console.log(`${uf} ${p.padEnd(8)} nominais ${f(y.nom / x.nom - 1)}%  comparecimento ${f(y.comp / x.comp - 1)}%  (${f(x.comp / x.aptos)} -> ${f(y.comp / y.aptos)} p.p.)`);
}
