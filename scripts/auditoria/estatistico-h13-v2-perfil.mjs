// Estatístico eleitoral, H13 sinal V2 (adendo de 30/10/2026 ao plano 16, teste a): idade do eleitorado por seção,
// com e sem biometria no cadastro, a partir de perfil_eleitor_secao_2026_<UF>.zip (dados abertos, disco local).
// Por seção: eleitores, com biometria, 16–24, 70+, e os mesmos só entre os SEM biometria (QT_ELEITORES − QT_ELEITORES_BIOMETRIA).
// Faixas (CD_FAIXA_ETARIA): 1600, 1700 … 2124 = 16 a 24 anos; ≥ 7000 = 70 anos ou mais. Só contagens.
// Uso: node scripts/auditoria/estatistico-h13-v2-perfil.mjs
// Saída: data/parsed/auditoria/estatistico/h13-v2/perfil-idade.csv
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { dividirCsv, linhasZip, pad } from './forense-lib.mjs';

const DIR = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'perfil_eleitor_secao');
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h13-v2');
await mkdir(SAIDA, { recursive: true });
const linhasSaida = ['uf;municipio;zona;secao;eleitores;biometria;e16a24;e70;semBio;sb16a24;sb70'];
for (const arquivo of (await readdir(DIR)).filter((f) => f.endsWith('.zip')).sort()) {
  const uf = arquivo.match(/_([A-Z]{2})\.zip$/)[1].toLowerCase();
  const porSecao = new Map();
  let idx = null, ncol = 0;
  for await (const [, linha] of linhasZip(path.join(DIR, arquivo))) {
    if (!idx) {
      const cab = dividirCsv(linha).map((c) => c.replaceAll('"', ''));
      ncol = cab.length;
      idx = Object.fromEntries(['CD_MUNICIPIO', 'NR_ZONA', 'NR_SECAO', 'CD_FAIXA_ETARIA', 'QT_ELEITORES', 'QT_ELEITORES_BIOMETRIA'].map((n) => {
        const i = cab.indexOf(n);
        if (i < 0) throw new Error(`${arquivo}: coluna ${n} ausente`);
        return [n, i];
      }));
      continue;
    }
    let c = linha.split(';');
    if (c.length !== ncol) c = dividirCsv(linha);
    const tira = (v) => v.replaceAll('"', '');
    const k = `${pad(tira(c[idx.CD_MUNICIPIO]), 5)};${pad(tira(c[idx.NR_ZONA]), 4)};${pad(tira(c[idx.NR_SECAO]), 4)}`;
    let s = porSecao.get(k);
    if (!s) porSecao.set(k, (s = [0, 0, 0, 0, 0, 0, 0]));
    const q = Number(tira(c[idx.QT_ELEITORES])), b = Number(tira(c[idx.QT_ELEITORES_BIOMETRIA]));
    const f = Number(tira(c[idx.CD_FAIXA_ETARIA]));
    const jovem = f >= 1600 && f <= 2124, idoso = f >= 7000;
    s[0] += q; s[1] += b; s[4] += q - b;
    if (jovem) { s[2] += q; s[5] += q - b; }
    if (idoso) { s[3] += q; s[6] += q - b; }
  }
  for (const [k, s] of porSecao) linhasSaida.push(`${uf};${k};${s.join(';')}`);
  console.log(`${uf}: ${porSecao.size} seções`);
}
await writeFile(path.join(SAIDA, 'perfil-idade.csv'), `${linhasSaida.join('\n')}\n`);
console.log(`RESUMO: ${linhasSaida.length - 1} seções`);
