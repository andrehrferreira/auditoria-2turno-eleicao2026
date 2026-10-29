// Revisor cético (H10): seções do detalhe_votacao_secao (presidente) em que aptos ≠ comparecimento + abstenções.
// Uso: node scripts/auditoria/cetico-h10-aptos.mjs
import { ZIPS, entradasZip, linhasCsv } from './contagem-zip.mjs';
const e = (await entradasZip(ZIPS.detalheSecao)).find((x) => x.nome === 'detalhe_votacao_secao_2026_BR.csv');
const l = [];
for await (const o of linhasCsv(ZIPS.detalheSecao, e)) {
  if (o.CD_CARGO !== '1') continue;
  const d = Number(o.QT_APTOS) - Number(o.QT_COMPARECIMENTO) - Number(o.QT_ABSTENCOES);
  if (d) l.push({ t: o.NR_TURNO, uf: o.SG_UF, mun: o.CD_MUNICIPIO, nome: o.NM_MUNICIPIO, zona: o.NR_ZONA, secao: o.NR_SECAO, aptos: +o.QT_APTOS, comp: +o.QT_COMPARECIMENTO, abst: +o.QT_ABSTENCOES, dif: d, origem: o.DS_ORIGEM_VOTO });
}
console.log(JSON.stringify(l, null, 0).replace(/},{/g, '},\n{'));
