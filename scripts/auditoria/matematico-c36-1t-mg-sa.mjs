// Matemático forense, C5 no 1º turno: as 2 seções de apuração mista de MG (saMistaBUImpressoCedula), conferidas no zip oficial.
// Lista os arquivos do pacote de cada seção e imprime, de cada boletim impresso (-imgbu.dat da urna, -imgbusa.dat da junta),
// as linhas de aptos, comparecimento, formas de habilitação e número de votos. Sem rede; lê o zip sem extrair.
// Uso: node scripts/auditoria/matematico-c36-1t-mg-sa.mjs
import { open } from 'node:fs/promises';
import { listarEntradas } from '../../src/zip.js';
import { lerEntradaH, texto } from './cetico-40-lib.mjs';

const ZIP = 'data/raw/1t/zip/bu_imgbu_logjez_rdv_vscmr_2026_1t_MG.zip';
const SECOES = [['50075', '0047', '0041'], ['41238', '0039', '0168']];
const LINHA = /Eleitores aptos|Comparecimento|Habilitação|No\. de votos|Eleitores faltosos/;

const h = await open(ZIP, 'r');
try {
  const entradas = await listarEntradas(h);
  for (const [mun, zona, secao] of SECOES) {
    const prefixo = `mg${mun}${zona}${secao}-`;
    const doPacote = entradas.filter((e) => e.nome.includes(prefixo));
    console.log(`\nMG ${mun}/${zona}/${secao}: ${doPacote.map((e) => e.nome.slice(e.nome.indexOf(prefixo) + prefixo.length)).sort().join(', ')}`);
    console.log(`  diário da urna (log.jez) no pacote: ${doPacote.some((e) => e.nome.endsWith('-log.jez')) ? 'sim' : 'NÃO'}`);
    for (const e of doPacote.filter((x) => /-imgbu(sa)?\.dat$/.test(x.nome))) {
      const linhas = texto(await lerEntradaH(h, e)).split('\n').filter((l) => LINHA.test(l));
      // o impresso repete o bloco por eleição; basta a primeira ocorrência de cada linha
      console.log(`  ${e.nome.endsWith('imgbusa.dat') ? 'boletim da junta (imgbusa)' : 'boletim da urna (imgbu)'}:`);
      for (const l of [...new Set(linhas.map((x) => x.trim()))]) console.log(`    ${l}`);
    }
  }
} finally {
  await h.close();
}
