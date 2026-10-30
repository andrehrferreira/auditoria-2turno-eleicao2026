// Demógrafo (H01, doc 10): série dos aptos de 80+ (80–84, 85–89, 90–94, 95–99, 100+) em 2014, 2018, 2022 e 2026,
// no universo completo, em agregado e sem CPF. Pergunta: por que os aptos de 100+ passaram de 39.026 (2018) para 184.330
// (2022) e os de 95–99 de 272.334 para 466.703?
// Lê:
//   - perfil_comparecimento_abstencao_<ano>.zip (TSE): aptos por município, zona e faixa de idade, 1º e 2º turno.
//     2014 e 2026 pelos CSV por UF; 2018 e 2022 pelo BRASIL.csv (os zips desses anos não trazem DF nem exterior por UF).
//   - detalhe_votacao_secao_<ano>.zip (TSE), arquivo _BR (Presidente), 2018, 2022 e 2026: aptos por zona, para conferir
//     se o arquivo por idade cobre exatamente o eleitorado oficial (sem títulos suspensos ou cancelados a mais ou a menos).
// Exterior (ZZ) e voto em trânsito (VT) ficam fora. Nada de data/private/. Não varre data/raw: os caminhos são fixos.
// Uso: node --max-old-space-size=4096 scripts/auditoria/demografo-aptos-100-serie.mjs
// Saída: data/parsed/auditoria/demografo/aptos100-base.json (entrada de demografo-aptos-100-analise.mjs)
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { entradasZip, linhasBrutas } from './contagem-zip.mjs';

const OUT = path.join(DIR_DADOS, 'parsed', 'auditoria', 'demografo');
const DA = path.join(DIR_DADOS, 'raw', 'dadosabertos');
const p4 = (x) => String(Number(x)).padStart(4, '0');
const p5 = (x) => String(Number(x)).padStart(5, '0');
const log = (...a) => console.error(new Date().toISOString().slice(11, 19), ...a);

const FAIXAS = { 1600: '16-17', 1700: '16-17', 8084: '80-84', 8589: '85-89', 9094: '90-94', 9599: '95-99', 9999: '100+', '-3': 'invalida' };
const faixa = (c) => FAIXAS[c] ?? 'outras';
const inc = (o, k, v) => { o[k] = (o[k] ?? 0) + v; };

const R = { fontes: {}, brasil: {}, brasil2t: {}, uf: {}, municipio: {}, zonaPca: {}, conferenciaZonas: {} };
for (const ano of [2014, 2018, 2022, 2026]) {
  const zip = path.join(DA, 'perfil_comparecimento_abstencao', `perfil_comparecimento_abstencao_${ano}.zip`);
  const todos = (await entradasZip(zip)).filter((e) => /\.csv$/i.test(e.nome));
  const porUf = todos.filter((e) => !/BRASIL/i.test(e.nome));
  const ents = porUf.length >= 28 ? porUf : todos.filter((e) => /BRASIL/i.test(e.nome));
  const br = (R.brasil[ano] = {}); const br2 = (R.brasil2t[ano] = {}); const uf = (R.uf[ano] = {}); const mun = (R.municipio[ano] = {}); const zona = (R.zonaPca[ano] = {});
  const geracao = new Set(); let linhas = 0; let colunasDiferentes = 0;
  for (const e of ents) {
    let col = null; let nc = 0;
    for await (const c of linhasBrutas(zip, e)) {
      if (!col) { col = Object.fromEntries(c.map((n, i) => [n, i])); nc = c.length; continue; }
      linhas++; if (c.length !== nc) colunasDiferentes++;
      geracao.add(`${c[col.NR_TURNO]}:${c[col.DT_GERACAO]}`);
      const u = c[col.SG_UF]; if (u === 'ZZ' || u === 'VT') continue;
      const f = faixa(c[col.CD_FAIXA_ETARIA]); const ap = Number(c[col.QT_APTOS]);
      if (c[col.NR_TURNO] === '2') { inc(br2, f, ap); inc(br2, 'total', ap); continue; }
      if (c[col.NR_TURNO] !== '1') continue;
      inc(br, f, ap); inc(br, 'total', ap);
      const ou = (uf[u] ??= {}); inc(ou, f, ap); inc(ou, 'total', ap);
      const km = `${u}|${p5(c[col.CD_MUNICIPIO])}`; const om = (mun[km] ??= {}); inc(om, 'total', ap);
      if (f !== 'outras' && f !== '16-17') inc(om, f, ap);
      inc(zona, `${km}|${p4(c[col.NR_ZONA])}`, ap);
    }
  }
  R.fontes[ano] = { arquivo: path.relative(DIR_DADOS, zip).replaceAll('\\', '/'), csv: ents.map((e) => e.nome), linhas, linhasComColunasDiferentes: colunasDiferentes, geracao: [...geracao].sort() };
  log(`pca ${ano}: ${linhas} linhas`);
}

// Conferência: aptos por zona do arquivo por idade × aptos de Presidente (1º turno) do detalhe por seção
for (const ano of [2018, 2022, 2026]) {
  const zip = path.join(DA, 'detalhe_votacao_secao', `detalhe_votacao_secao_${ano}.zip`);
  const e = (await entradasZip(zip)).find((x) => new RegExp(`_${ano}_BR\\.csv$`, 'i').test(x.nome));
  const det = {}; let col = null; let secoes = 0;
  for await (const c of linhasBrutas(zip, e)) {
    if (!col) { col = Object.fromEntries(c.map((n, i) => [n, i])); continue; }
    if (c[col.NR_TURNO] !== '1' || c[col.CD_CARGO] !== '1') continue;
    const u = c[col.SG_UF]; if (u === 'ZZ' || u === 'VT') continue;
    secoes++; inc(det, `${u}|${p5(c[col.CD_MUNICIPIO])}|${p4(c[col.NR_ZONA])}`, Number(c[col.QT_APTOS]));
  }
  const pca = R.zonaPca[ano]; const chaves = new Set([...Object.keys(det), ...Object.keys(pca)]);
  let somaAbs = 0; let zonasDiferentes = 0; const exemplos = []; let tDet = 0; let tPca = 0;
  for (const k of chaves) {
    const d = det[k] ?? 0; const p = pca[k] ?? 0; tDet += d; tPca += p;
    if (d !== p) { zonasDiferentes++; somaAbs += Math.abs(d - p); if (exemplos.length < 20) exemplos.push({ zona: k, detalhe: d, perfilIdade: p }); }
  }
  R.conferenciaZonas[ano] = { arquivo: e.nome, secoes, zonas: chaves.size, aptosDetalhe: tDet, aptosPerfilIdade: tPca, zonasDiferentes, somaDiferencasAbs: somaAbs, exemplos };
  log(`detalhe ${ano}: ${secoes} seções, ${zonasDiferentes} zonas diferentes`);
}
delete R.zonaPca;
await writeFile(path.join(OUT, 'aptos100-base.json'), JSON.stringify(R));
console.log(JSON.stringify({ fontes: R.fontes, brasil: R.brasil, brasil2t: R.brasil2t, conferenciaZonas: R.conferenciaZonas }, null, 1));
