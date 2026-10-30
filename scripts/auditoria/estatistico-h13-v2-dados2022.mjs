// Estatístico eleitoral, H13 sinal V2 (adendo 4 de 30/10/2026 ao plano 16): tabela por seção de 2022 no Sul e em MG.
//   votos de presidente por turno (13 e 22) e local: votacao_secao_2022_BR.zip (CD_CARGO 1);
//   aptos, comparecimento, local e modelo da urna por turno: detalhe_votacao_secao_2022.zip (CD_CARGO 1; só _BR.csv,
//     porque o zip repete o presidente em _BRASIL.csv);
//   eleitores, com biometria, 60+, 16–24, escolaridade baixa (1–3) e superior (8): perfil_eleitor_secao_2022_<UF>.zip.
// Só contagens; nenhum dado pessoal.
// Uso: node scripts/auditoria/estatistico-h13-v2-dados2022.mjs
// Saída: data/parsed/auditoria/estatistico/h13-v2/secoes-2022.csv
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { dividirCsv, linhasZip, pad } from './forense-lib.mjs';

const AB = path.join(DIR_DADOS, 'raw', 'dadosabertos');
const UFS = new Set(['MG', 'PR', 'RS', 'SC']);
const S = new Map();
const s = (k) => { let o = S.get(k); if (!o) S.set(k, (o = {})); return o; };
const add = (o, c, v) => { o[c] = (o[c] ?? 0) + v; };
async function ler(arquivo, colunas, cada, filtro) {
  let idx = null, ncol = 0;
  for await (const [, linha] of linhasZip(arquivo, filtro)) {
    if (!idx) {
      const cab = dividirCsv(linha).map((c) => c.replaceAll('"', ''));
      ncol = cab.length;
      idx = Object.fromEntries(colunas.map((n) => { const i = cab.indexOf(n); if (i < 0) throw new Error(`${arquivo}: ${n}`); return [n, i]; }));
      continue;
    }
    let c = linha.split(';');
    if (c.length !== ncol) c = dividirCsv(linha);
    const uf = c[idx.SG_UF].replaceAll('"', '');
    if (!UFS.has(uf)) continue;
    cada(Object.fromEntries(colunas.map((n) => [n, c[idx[n]].replaceAll('"', '').trim()])));
  }
}
const chave = (r) => `${r.SG_UF.toLowerCase()}/${pad(r.CD_MUNICIPIO, 5)}/${pad(r.NR_ZONA, 4)}/${pad(r.NR_SECAO, 4)}`;

await ler(path.join(AB, 'votacao_secao', 'votacao_secao_2022_BR.zip'), ['SG_UF', 'CD_MUNICIPIO', 'NR_ZONA', 'NR_SECAO', 'NR_TURNO', 'CD_CARGO', 'NR_VOTAVEL', 'QT_VOTOS', 'NR_LOCAL_VOTACAO'], (r) => {
  if (r.CD_CARGO !== '1') return;
  const o = s(chave(r));
  if (r.NR_VOTAVEL === '13' || r.NR_VOTAVEL === '22') add(o, `v${r.NR_VOTAVEL}_${r.NR_TURNO}`, Number(r.QT_VOTOS));
  o[`localVot_${r.NR_TURNO}`] = r.NR_LOCAL_VOTACAO;
});
console.log(`votos: ${S.size} seções`);
await ler(path.join(AB, 'detalhe_votacao_secao', 'detalhe_votacao_secao_2022.zip'), ['SG_UF', 'CD_MUNICIPIO', 'NR_ZONA', 'NR_SECAO', 'NR_TURNO', 'CD_CARGO', 'QT_APTOS', 'QT_COMPARECIMENTO', 'NR_LOCAL_VOTACAO', 'DS_MODELO_URNA'], (r) => {
  if (r.CD_CARGO !== '1') return;
  const o = s(chave(r));
  add(o, `aptos_${r.NR_TURNO}`, Number(r.QT_APTOS));
  add(o, `comp_${r.NR_TURNO}`, Number(r.QT_COMPARECIMENTO));
  o[`local_${r.NR_TURNO}`] = r.NR_LOCAL_VOTACAO;
  o[`modelo_${r.NR_TURNO}`] = r.DS_MODELO_URNA.replaceAll(' ', '');
}, (n) => /_BR\.csv$/i.test(n)); // o presidente está em _BR.csv e repetido em _BRASIL.csv (os CSV das UFs não o trazem)
console.log(`detalhe: ${S.size} seções`);
for (const uf of UFS) {
  await ler(path.join(AB, 'perfil_eleitor_secao', `perfil_eleitor_secao_2022_${uf}.zip`), ['SG_UF', 'CD_MUNICIPIO', 'NR_ZONA', 'NR_SECAO', 'CD_FAIXA_ETARIA', 'CD_GRAU_ESCOLARIDADE', 'QT_ELEITORES_PERFIL', 'QT_ELEITORES_BIOMETRIA'], (r) => {
    const o = s(chave(r));
    const q = Number(r.QT_ELEITORES_PERFIL), f = Number(r.CD_FAIXA_ETARIA), e = Number(r.CD_GRAU_ESCOLARIDADE);
    add(o, 'eleitores', q); add(o, 'biometria', Number(r.QT_ELEITORES_BIOMETRIA));
    add(o, 'idade60', f >= 6000 ? q : 0); add(o, 'idade16a24', f >= 1600 && f <= 2124 ? q : 0);
    add(o, 'escol_baixa', e >= 1 && e <= 3 ? q : 0); add(o, 'superior', e === 8 ? q : 0);
  });
  console.log(`perfil ${uf}: ${S.size} seções`);
}
const C = ['v13_1', 'v22_1', 'v13_2', 'v22_2', 'aptos_1', 'comp_1', 'aptos_2', 'comp_2', 'local_2', 'modelo_2', 'localVot_2', 'eleitores', 'biometria', 'idade60', 'idade16a24', 'escol_baixa', 'superior'];
const out = [`id;${C.join(';')}`, ...[...S].sort().map(([k, o]) => `${k};${C.map((c) => o[c] ?? '').join(';')}`)];
await writeFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h13-v2', 'secoes-2022.csv'), `${out.join('\n')}\n`);
console.log(`RESUMO: ${S.size} seções`);
