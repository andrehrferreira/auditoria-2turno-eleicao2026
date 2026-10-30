// Estatístico eleitoral, H13 sinal V2 (adendo 2 de 30/10/2026 ao plano 16, teste a): escolaridade e estado civil por
// seção, no eleitorado inteiro e só entre os SEM biometria (QT_ELEITORES − QT_ELEITORES_BIOMETRIA), a partir de
// perfil_eleitor_secao_2026_<UF>.zip. Escolaridade baixa = CD_GRAU_ESCOLARIDADE 1 a 3 (analfabeto, lê e escreve,
// fundamental incompleto); superior = 8 (superior completo). Estado civil: 1 solteiro, 3 casado. Só contagens.
// Uso: node scripts/auditoria/estatistico-h13-v2-perfil2.mjs
// Saída: data/parsed/auditoria/estatistico/h13-v2/perfil-escol-civil.csv
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { dividirCsv, linhasZip, pad } from './forense-lib.mjs';

const DIR = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'perfil_eleitor_secao');
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h13-v2');
await mkdir(SAIDA, { recursive: true });
const COLS = ['eleitores', 'semBio', 'baixa', 'sup', 'solt', 'casa', 'sbBaixa', 'sbSup', 'sbSolt', 'sbCasa'];
const out = [`uf;municipio;zona;secao;${COLS.join(';')}`];
for (const arquivo of (await readdir(DIR)).filter((f) => f.endsWith('.zip')).sort()) {
  const uf = arquivo.match(/_([A-Z]{2})\.zip$/)[1].toLowerCase();
  const porSecao = new Map();
  let idx = null, ncol = 0;
  for await (const [, linha] of linhasZip(path.join(DIR, arquivo))) {
    if (!idx) {
      const cab = dividirCsv(linha).map((c) => c.replaceAll('"', ''));
      ncol = cab.length;
      idx = Object.fromEntries(['CD_MUNICIPIO', 'NR_ZONA', 'NR_SECAO', 'CD_GRAU_ESCOLARIDADE', 'CD_ESTADO_CIVIL', 'QT_ELEITORES', 'QT_ELEITORES_BIOMETRIA'].map((n) => {
        const i = cab.indexOf(n);
        if (i < 0) throw new Error(`${arquivo}: coluna ${n} ausente`);
        return [n, i];
      }));
      continue;
    }
    let c = linha.split(';');
    if (c.length !== ncol) c = dividirCsv(linha);
    const t = (v) => v.replaceAll('"', '');
    const k = `${pad(t(c[idx.CD_MUNICIPIO]), 5)};${pad(t(c[idx.NR_ZONA]), 4)};${pad(t(c[idx.NR_SECAO]), 4)}`;
    let s = porSecao.get(k);
    if (!s) porSecao.set(k, (s = new Array(COLS.length).fill(0)));
    const q = Number(t(c[idx.QT_ELEITORES])), sb = q - Number(t(c[idx.QT_ELEITORES_BIOMETRIA]));
    const e = Number(t(c[idx.CD_GRAU_ESCOLARIDADE])), ec = Number(t(c[idx.CD_ESTADO_CIVIL]));
    s[0] += q; s[1] += sb;
    if (e >= 1 && e <= 3) { s[2] += q; s[6] += sb; }
    if (e === 8) { s[3] += q; s[7] += sb; }
    if (ec === 1) { s[4] += q; s[8] += sb; }
    if (ec === 3) { s[5] += q; s[9] += sb; }
  }
  for (const [k, s] of porSecao) out.push(`${uf};${k};${s.join(';')}`);
  console.log(`${uf}: ${porSecao.size} seções`);
}
await writeFile(path.join(SAIDA, 'perfil-escol-civil.csv'), `${out.join('\n')}\n`);
console.log(`RESUMO: ${out.length - 1} seções`);
