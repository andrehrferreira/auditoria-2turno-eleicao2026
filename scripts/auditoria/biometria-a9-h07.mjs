// Teste 4 (A9/H02) e teste 5 (H07/B4).
// A9: parcela de cada finalista (13 e 22, entre os votos nos dois) × taxa de liberação sem biometria, com controles:
//   efeito fixo de UF e de zona, % sem biometria no cadastro, faixa etária do eleitorado, tamanho da seção, modelo da
//   urna e urna de contingência. MQO com erro-padrão agrupado por município. Linha de base: o 1º turno nas UFs
//   prontas, e a variação 1º → 2º turno na mesma seção.
// H07: taxa sem biometria por modelo de urna dentro da UF, observada × esperada pelo cadastro, e o efeito do modelo
//   dentro da mesma zona.
// Requer biometria-cadastro.mjs. Uso: node scripts/auditoria/biometria-a9-h07.mjs [--ufs-1t ac,al,...]
// Saída: data/parsed/auditoria/biometria/a9-h07-resumo.json
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_SAIDA, cadastroDaUrna, chave, demeanar, lerAgregadas, lerCadastro, mqo, perfis, resumir, spearman, ufsComPerfil } from './biometria-comum.mjs';

const { values } = parseArgs({ options: { 'ufs-1t': { type: 'string' } } });
const cadastro = await lerCadastro();
const agregadas = { 1: await lerAgregadas(1), 2: await lerAgregadas(2) };
const ufsAgregadas = Object.fromEntries([1, 2].map((t) => [t, new Set([...agregadas[t].keys()].map((k) => k.slice(0, 2)))]));
const MODELOS = ['ue2013', 'ue2015', 'ue2020']; // base: ue2022

async function carregar(turno, ufs) {
  const linhas = new Map();
  for await (const p of perfis(turno, ufs)) {
    const s = resumir(p);
    const ab = s.v13 + s.v22;
    if (s.comparecimento < 20 || ab < 20 || !s.temDetalhamento) continue;
    const k = chave(s);
    // o cadastro é o de 2026 (julho); as agregadas de cada turno vêm do banco do próprio turno
    // (UF do 1º turno ainda não carregada no banco: usa as agregadas do 2º turno)
    const c = cadastroDaUrna(cadastro, ufsAgregadas[turno].has(s.uf) ? agregadas[turno] : agregadas[2], k);
    if (!c || c.eleitores < 20) continue;
    const semBioCad = c.eleitores - c.biometria;
    const f = (n) => (c.faixas[n] ?? 0) / c.eleitores;
    linhas.set(k, {
      k, uf: s.uf, mun: `${s.uf}/${s.municipio}`, zona: `${s.uf}/${s.municipio}/${s.zona}`,
      p13: s.v13 / ab, p22: s.v22 / ab,
      taxaAno: s.semBio / s.comparecimento, taxaManual: s.manual / s.comparecimento, taxaSemBio: (s.semBio + s.manual) / s.comparecimento,
      cadSemBio: semBioCad / c.eleitores, idade70: f('70a79') + f('80mais'), jovem: f('16a17') + f('18a20'), idade60: f('60a69'),
      logAptos: Math.log(c.eleitores), comparecimento: s.comparecimento / (s.aptos || c.eleitores),
      excesso: semBioCad >= 10 && c.biometria >= 30 ? s.semBio / semBioCad - (s.porBio + s.manual) / c.biometria : null,
      modelo: s.modelo?.toLowerCase() ?? null, contingencia: s.tipoUrna !== 1 ? 1 : 0,
      semBio: s.semBio, manual: s.manual, comp: s.comparecimento, semBioCad, eleitores: c.eleitores,
    });
  }
  return linhas;
}

function regressoes(lista, rotulo) {
  const col = (f) => Float64Array.from(lista, f);
  const y = col((r) => r.p13);
  const xs = { taxaAno: col((r) => r.taxaAno), taxaManual: col((r) => r.taxaManual) };
  const ctrl = {
    cadSemBio: col((r) => r.cadSemBio), idade70: col((r) => r.idade70), idade60: col((r) => r.idade60), jovem: col((r) => r.jovem),
    logAptos: col((r) => r.logAptos), contingencia: col((r) => r.contingencia),
    ...Object.fromEntries(MODELOS.map((m) => [m, col((r) => (r.modelo === m ? 1 : 0))])),
  };
  const mun = lista.map((r) => r.mun);
  const sd = (v) => { const m = v.reduce((a, b) => a + b, 0) / v.length; return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length); };
  const res = { rotulo, secoes: lista.length, sd: { p13: +sd(y).toFixed(4), taxaAno: +sd(xs.taxaAno).toFixed(4), taxaManual: +sd(xs.taxaManual).toFixed(4) } };
  res.spearman = { taxaAno: +spearman(xs.taxaAno, y).toFixed(3), taxaManual: +spearman(xs.taxaManual, y).toFixed(3), taxaSemBioTotal: +spearman(col((r) => r.taxaSemBio), y).toFixed(3) };
  res.M0_semControle = mqo(y, [xs.taxaAno, xs.taxaManual], ['taxaAno', 'taxaManual'], mun, { intercepto: true });
  const [yU, ...xU] = demeanar([y, xs.taxaAno, xs.taxaManual], lista.map((r) => r.uf));
  res.M1_efeitoFixoUF = mqo(yU, xU, ['taxaAno', 'taxaManual'], mun);
  const nomesCtrl = Object.keys(ctrl);
  const [yZ, ...xZ] = demeanar([y, xs.taxaAno, xs.taxaManual, ...Object.values(ctrl)], lista.map((r) => r.zona));
  res.M2_efeitoFixoZona = mqo(yZ, xZ.slice(0, 2), ['taxaAno', 'taxaManual'], mun);
  // modelos sem variação dentro da zona viram coluna nula: retirar
  const usar = nomesCtrl.map((n, i) => [n, xZ[2 + i]]).filter(([, v]) => v.some((x) => Math.abs(x) > 1e-12));
  res.M3_zonaMaisControles = mqo(yZ, [...xZ.slice(0, 2), ...usar.map(([, v]) => v)], ['taxaAno', 'taxaManual', ...usar.map(([n]) => n)], mun);
  // excesso de comparecimento do grupo sem biometria sobre o grupo com biometria
  const sub = lista.filter((r) => r.excesso !== null);
  const [yE, ...xE] = demeanar([Float64Array.from(sub, (r) => r.p13), Float64Array.from(sub, (r) => r.excesso), Float64Array.from(sub, (r) => r.cadSemBio), Float64Array.from(sub, (r) => r.idade70), Float64Array.from(sub, (r) => r.logAptos)], sub.map((r) => r.zona));
  res.M4_excessoSemBio_zona = { ...mqo(yE, xE, ['excessoSemBio', 'cadSemBio', 'idade70', 'logAptos'], sub.map((r) => r.mun)), spearmanBruto: +spearman(Float64Array.from(sub, (r) => r.excesso), Float64Array.from(sub, (r) => r.p13)).toFixed(3) };
  // efeito em pontos percentuais de parcela por 1 desvio-padrão de taxa (M3)
  res.efeitoPor1DP_M3 = { taxaAno: +(100 * res.M3_zonaMaisControles.coef.taxaAno.beta * res.sd.taxaAno).toFixed(2), taxaManual: +(100 * res.M3_zonaMaisControles.coef.taxaManual.beta * res.sd.taxaManual).toFixed(2) };
  return res;
}

function h07(lista) {
  const porUfModelo = {};
  const tUf = {};
  for (const r of lista) {
    const u = (tUf[r.uf] ??= { semBio: 0, semBioCad: 0 });
    u.semBio += r.semBio; u.semBioCad += r.semBioCad;
  }
  for (const r of lista) {
    const g = (porUfModelo[`${r.uf}|${r.modelo}`] ??= { secoes: 0, comp: 0, semBio: 0, manual: 0, semBioCad: 0, eleitores: 0, esperadoSemBio: 0 });
    g.secoes++; g.comp += r.comp; g.semBio += r.semBio; g.manual += r.manual; g.semBioCad += r.semBioCad; g.eleitores += r.eleitores;
    g.esperadoSemBio += r.semBioCad * (tUf[r.uf].semBio / tUf[r.uf].semBioCad);
  }
  const tabela = Object.entries(porUfModelo).sort().map(([k, g]) => {
    const [uf, modelo] = k.split('|');
    return { uf, modelo, secoes: g.secoes, comparecimento: g.comp, pctAnoNascSemBio: +(100 * g.semBio / g.comp).toFixed(2), pctManual: +(100 * g.manual / g.comp).toFixed(2), pctSemBioNoCadastro: +(100 * g.semBioCad / g.eleitores).toFixed(2), observadoSobreEsperado: +(g.semBio / g.esperadoSemBio).toFixed(3) };
  });
  // Dentro da zona: taxa de ano de nascimento e de manual ~ modelo + cadastro + idade
  const col = (f) => Float64Array.from(lista, f);
  const mods = MODELOS.map((m) => col((r) => (r.modelo === m ? 1 : 0)));
  const outros = [col((r) => r.cadSemBio), col((r) => r.idade70), col((r) => r.logAptos), col((r) => r.contingencia)];
  const zonas = lista.map((r) => r.zona);
  const mun = lista.map((r) => r.mun);
  const dm = demeanar([col((r) => r.taxaAno), col((r) => r.taxaManual), ...mods, ...outros], zonas);
  const nomes = [...MODELOS, 'cadSemBio', 'idade70', 'logAptos', 'contingencia'];
  return {
    tabela,
    dentroDaZona_taxaAnoNasc: mqo(dm[0], dm.slice(2), nomes, mun),
    dentroDaZona_taxaManual: mqo(dm[1], dm.slice(2), nomes, mun),
  };
}

const saida = {};
const l2 = await carregar(2, null);
const lista2 = [...l2.values()];
saida.a9_2t = regressoes(lista2, '2º turno, país');
saida.h07_2t = h07(lista2);
console.log(JSON.stringify({ a9: { ...saida.a9_2t }, h07: { dentroDaZona_taxaAnoNasc: saida.h07_2t.dentroDaZona_taxaAnoNasc, dentroDaZona_taxaManual: saida.h07_2t.dentroDaZona_taxaManual } }, null, 0));

const ufs1 = values['ufs-1t'] ? values['ufs-1t'].split(',') : await ufsComPerfil(1);
const l1 = await carregar(1, ufs1);
const lista1 = [...l1.values()];
saida.ufs1t = ufs1;
saida.a9_1t = regressoes(lista1, `1º turno, UFs ${ufs1.join(',')}`);
saida.a9_2t_mesmasUFs = regressoes(lista2.filter((r) => ufs1.includes(r.uf)), '2º turno, mesmas UFs do 1º');
// Variação na mesma seção: Δ parcela do 13 × Δ taxa sem biometria, efeito fixo de zona
const pares = lista2.filter((r) => l1.has(r.k)).map((r) => ({ r2: r, r1: l1.get(r.k) }));
const dy = Float64Array.from(pares, ({ r1, r2 }) => r2.p13 - r1.p13);
const dA = Float64Array.from(pares, ({ r1, r2 }) => r2.taxaAno - r1.taxaAno);
const dM = Float64Array.from(pares, ({ r1, r2 }) => r2.taxaManual - r1.taxaManual);
const [dyZ, dAZ, dMZ] = demeanar([dy, dA, dM], pares.map((p) => p.r2.zona));
saida.d5_variacao1t2t = {
  secoes: pares.length,
  spearman: { dTaxaAno: +spearman(dA, dy).toFixed(3), dTaxaManual: +spearman(dM, dy).toFixed(3) },
  zona: mqo(dyZ, [dAZ, dMZ], ['dTaxaAno', 'dTaxaManual'], pares.map((p) => p.r2.mun)),
};
await writeFile(path.join(DIR_SAIDA, 'a9-h07-resumo.json'), `${JSON.stringify(saida, null, 1)}\n`);
console.log(JSON.stringify({ a9_1t: saida.a9_1t, a9_2t_mesmasUFs: saida.a9_2t_mesmasUFs, d5: saida.d5_variacao1t2t }, null, 0));
