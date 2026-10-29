// T15, tópico 07: as 41 seções do exterior sem arquivo de urna, no 2º turno, vistas no detalhe_votacao_secao do TSE.
// Confere se alguma teve comparecimento acima dos aptos (a frase "nenhuma seção do 2º turno" cobre as 499.248).
// Uso: node --max-old-space-size=4096 scripts/auditoria/t15-07-limites-41-secoes.mjs
import { open, writeFile } from 'node:fs/promises';
import { listarEntradas, lerEntrada } from '../../src/zip.js';
import { abrirLeitura } from '../../src/banco-leitura.js';

const { db } = await abrirLeitura();
const alvo = new Set(db.prepare('select municipio, zona, secao from secao where turno = 2 and hash is null').all()
  .map((r) => `${Number(r.municipio)}|${Number(r.zona)}|${Number(r.secao)}`));
const h = await open('data/raw/dadosabertos/detalhe_votacao_secao/detalhe_votacao_secao_2026.zip', 'r');
const ent = (await listarEntradas(h)).find((e) => e.nome === 'detalhe_votacao_secao_2026_BR.csv');
const texto = (await lerEntrada(h, ent)).toString('latin1');
await h.close();
const linhas = texto.split(/\r?\n/);
const cab = linhas[0].split(';').map((c) => c.replace(/"/g, ''));
const ix = (n) => cab.indexOf(n);
const [iT, iUf, iM, iZ, iS, iC, iA, iCo, iI] = ['NR_TURNO', 'SG_UF', 'CD_MUNICIPIO', 'NR_ZONA', 'NR_SECAO', 'CD_CARGO', 'QT_APTOS', 'QT_COMPARECIMENTO', 'ST_SECAO_INSTALADA'].map(ix);
const r = { alvo: alvo.size, achadas: 0, aptos: 0, comparecimento: 0, acimaDosAptos: 0, instalada: {} };
for (let k = 1; k < linhas.length; k++) {
  const c = linhas[k].split(';').map((x) => x.replace(/"/g, ''));
  if (c[iT] !== '2' || c[iUf] !== 'ZZ' || c[iC] !== '1') continue;
  if (!alvo.has(`${Number(c[iM])}|${Number(c[iZ])}|${Number(c[iS])}`)) continue;
  r.achadas++; r.aptos += +c[iA]; r.comparecimento += +c[iCo];
  if (+c[iCo] > +c[iA]) r.acimaDosAptos++;
  r.instalada[c[iI]] = (r.instalada[c[iI]] ?? 0) + 1;
}
console.log(JSON.stringify(r));
await writeFile('data/parsed/auditoria/t15/07-limites-41-secoes.json', JSON.stringify(r, null, 1));
