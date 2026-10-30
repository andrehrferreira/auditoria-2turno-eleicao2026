// Estatístico eleitoral, H13 sinal V2 (adendo 2 de 30/10/2026 ao plano 16, teste d): tabela por ZONA, igual para 2022 e
// 2026, para comparar a associação "variação do comparecimento × parte sem biometria → ganho do 13 entre turnos".
//   votos 13 e 22 por turno: 2022 de votacao_candidato_munzona_2022 (presidente, todas as linhas da zona, inclusive
//     trânsito); 2026 do banco (voto_bu, presidente);
//   aptos e comparecimento por turno: detalhe_votacao_secao_<ano> (CD_CARGO 1), somados por zona;
//   sem biometria no cadastro (2026, único disponível) de perfil-idade.csv (estatistico-h13-v2-perfil.mjs);
//   ΔV2 real por zona em 2026 (diário, estatistico/h08), para calibrar o substituto.
// Uso: node scripts/auditoria/estatistico-h13-v2-zonas.mjs
// Saída: data/parsed/auditoria/estatistico/h13-v2/zonas.csv
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { dividirCsv, lerTabela, linhasZip, pad } from './forense-lib.mjs';

const AB = path.join(DIR_DADOS, 'raw', 'dadosabertos');
const EST = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico');
const zonas = new Map();
const z = (k) => { let o = zonas.get(k); if (!o) zonas.set(k, (o = {})); return o; };
const add = (o, campo, v) => { o[campo] = (o[campo] ?? 0) + v; };

async function lerCsvZip(arquivo, colunas, cada) {
  let idx = null, ncol = 0;
  for await (const [, linha] of linhasZip(arquivo)) {
    if (!idx) {
      const cab = dividirCsv(linha).map((c) => c.replaceAll('"', ''));
      ncol = cab.length;
      idx = Object.fromEntries(colunas.map((n) => { const i = cab.indexOf(n); if (i < 0) throw new Error(`${arquivo}: ${n}`); return [n, i]; }));
      continue;
    }
    let c = linha.split(';');
    if (c.length !== ncol) c = dividirCsv(linha);
    const r = Object.fromEntries(colunas.map((n) => [n, c[idx[n]].replaceAll('"', '')]));
    cada(r);
  }
}
const chave = (r) => `${r.SG_UF.toLowerCase()}/${pad(r.CD_MUNICIPIO, 5)}/${pad(r.NR_ZONA, 4)}`;

// votos 2022
await lerCsvZip(path.join(AB, 'votacao_candidato_munzona', 'votacao_candidato_munzona_2022.zip'), ['SG_UF', 'CD_MUNICIPIO', 'NR_ZONA', 'NR_TURNO', 'CD_CARGO', 'NR_CANDIDATO', 'QT_VOTOS_NOMINAIS'], (r) => {
  if (r.CD_CARGO !== '1' || (r.NR_CANDIDATO !== '13' && r.NR_CANDIDATO !== '22')) return;
  add(z(chave(r)), `v${r.NR_CANDIDATO}_2022_${r.NR_TURNO}`, Number(r.QT_VOTOS_NOMINAIS));
});
// aptos e comparecimento, 2022 e 2026
for (const ano of [2022, 2026]) {
  await lerCsvZip(path.join(AB, 'detalhe_votacao_secao', `detalhe_votacao_secao_${ano}.zip`), ['SG_UF', 'CD_MUNICIPIO', 'NR_ZONA', 'NR_TURNO', 'CD_CARGO', 'QT_APTOS', 'QT_COMPARECIMENTO'], (r) => {
    if (r.CD_CARGO !== '1') return;
    const o = z(chave(r));
    add(o, `aptos_${ano}_${r.NR_TURNO}`, Number(r.QT_APTOS));
    add(o, `comp_${ano}_${r.NR_TURNO}`, Number(r.QT_COMPARECIMENTO));
  });
}
// votos 2026 (banco)
const { db } = await abrirLeitura();
for (const v of db.prepare('SELECT turno, uf, municipio, zona, numero, SUM(quantidade) q FROM voto_bu WHERE cargo = 1 AND numero IN (13, 22) GROUP BY turno, uf, municipio, zona, numero').iterate()) {
  add(z(`${v.uf}/${v.municipio}/${v.zona}`), `v${v.numero}_2026_${v.turno}`, v.q);
}
db.close();
// sem biometria no cadastro 2026 e ΔV2 do diário 2026
for (const p of await lerTabela(path.join(EST, 'h13-v2', 'perfil-idade.csv'), ['eleitores', 'semBio'])) {
  const o = z(`${p.uf}/${p.municipio}/${p.zona}`); add(o, 'eleitores', p.eleitores); add(o, 'semBio', p.semBio);
}
for (const turno of [1, 2]) {
  const dir = path.join(EST, 'h08', `${turno}t`);
  for (const f of (await readdir(dir)).filter((x) => x.endsWith('.secoes.jsonl'))) {
    for (const l of (await readFile(path.join(dir, f), 'utf8')).split('\n')) {
      if (!l) continue;
      const x = JSON.parse(l);
      const o = z(`${x.uf}/${x.municipio}/${x.zona}`);
      add(o, `v2log_${turno}`, x.vias.v2); add(o, `votoslog_${turno}`, x.votos);
    }
  }
}
const CAMPOS = ['v13_2022_1', 'v22_2022_1', 'v13_2022_2', 'v22_2022_2', 'aptos_2022_1', 'comp_2022_1', 'aptos_2022_2', 'comp_2022_2',
  'v13_2026_1', 'v22_2026_1', 'v13_2026_2', 'v22_2026_2', 'aptos_2026_1', 'comp_2026_1', 'aptos_2026_2', 'comp_2026_2', 'eleitores', 'semBio', 'v2log_1', 'votoslog_1', 'v2log_2', 'votoslog_2'];
const linhas = [`zona;${CAMPOS.join(';')}`, ...[...zonas].sort().map(([k, o]) => `${k};${CAMPOS.map((c) => o[c] ?? '').join(';')}`)];
await writeFile(path.join(EST, 'h13-v2', 'zonas.csv'), `${linhas.join('\n')}\n`);
console.log(`RESUMO: ${zonas.size} zonas`);
