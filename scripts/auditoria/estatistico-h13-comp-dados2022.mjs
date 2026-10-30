// Estatístico eleitoral, doc 25 (comparecimento 2026 × 2022): tabela por seção de 2022, todas as UFs (sem exterior).
//   votos de presidente (13 e 22) por turno: votacao_secao_2022_BR.zip (CD_CARGO 1);
//   aptos, comparecimento, local e modelo da urna por turno: detalhe_votacao_secao_2022.zip, só _BR.csv (o presidente
//   está ali e repetido em _BRASIL.csv; os CSV das UFs não o trazem).
// Uso: node scripts/auditoria/estatistico-h13-comp-dados2022.mjs
// Saída: data/parsed/auditoria/estatistico/h13-comp/secoes-2022.csv
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { dividirCsv, linhasZip, pad } from './forense-lib.mjs';

const AB = path.join(DIR_DADOS, 'raw', 'dadosabertos');
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h13-comp');
await mkdir(SAIDA, { recursive: true });
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
    const r = Object.fromEntries(colunas.map((n) => [n, c[idx[n]].replaceAll('"', '').trim()]));
    if (r.SG_UF === 'ZZ' || r.CD_CARGO !== '1') continue;
    cada(r);
  }
}
const chave = (r) => `${r.SG_UF.toLowerCase()}/${pad(r.CD_MUNICIPIO, 5)}/${pad(r.NR_ZONA, 4)}/${pad(r.NR_SECAO, 4)}`;
await ler(path.join(AB, 'votacao_secao', 'votacao_secao_2022_BR.zip'), ['SG_UF', 'CD_MUNICIPIO', 'NR_ZONA', 'NR_SECAO', 'NR_TURNO', 'CD_CARGO', 'NR_VOTAVEL', 'QT_VOTOS'], (r) => {
  const o = s(chave(r));
  if (r.NR_VOTAVEL === '13' || r.NR_VOTAVEL === '22') add(o, `v${r.NR_VOTAVEL}_${r.NR_TURNO}`, Number(r.QT_VOTOS));
});
console.log(`votos: ${S.size} seções`);
await ler(path.join(AB, 'detalhe_votacao_secao', 'detalhe_votacao_secao_2022.zip'), ['SG_UF', 'CD_MUNICIPIO', 'NR_ZONA', 'NR_SECAO', 'NR_TURNO', 'CD_CARGO', 'QT_APTOS', 'QT_COMPARECIMENTO', 'NR_LOCAL_VOTACAO', 'DS_MODELO_URNA'], (r) => {
  const o = s(chave(r));
  add(o, `aptos_${r.NR_TURNO}`, Number(r.QT_APTOS));
  add(o, `comp_${r.NR_TURNO}`, Number(r.QT_COMPARECIMENTO));
  o[`local_${r.NR_TURNO}`] = r.NR_LOCAL_VOTACAO;
  o[`modelo_${r.NR_TURNO}`] = r.DS_MODELO_URNA.replaceAll(' ', '').toLowerCase();
}, (n) => /_BR\.csv$/i.test(n));
const C = ['v13_1', 'v22_1', 'v13_2', 'v22_2', 'aptos_1', 'comp_1', 'aptos_2', 'comp_2', 'local_1', 'local_2', 'modelo_1', 'modelo_2'];
await writeFile(path.join(SAIDA, 'secoes-2022.csv'), `${[`id;${C.join(';')}`, ...[...S].sort().map(([k, o]) => `${k};${C.map((c) => o[c] ?? '').join(';')}`)].join('\n')}\n`);
console.log(`RESUMO: ${S.size} seções`);
