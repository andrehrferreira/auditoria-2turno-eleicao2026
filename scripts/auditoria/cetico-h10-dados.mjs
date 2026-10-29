// Revisor cético, lente "dados e definições", achado h10-crescimento-cabe-no-disponivel
// (docs/analysis/cientista-politico/01-balanco-turnos.md).
//
// Confere, sem rede e com o banco em somente leitura:
//   1. totais de presidente por UF e turno: votacao_secao × detalhe × munzona × soma dos BUs (banco);
//   2. o candidato 28 (votos sem linha no munzona) nas três bases e no BU;
//   3. a definição de "disponível": aptos iguais nos dois turnos? por seção, município e UF;
//      quanto da perda do 22 (e do "excesso" do 13) as mudanças de aptos explicam;
//   4. campos que mudam a conta: QT_VOTOS_LEGENDA, QT_VOTOS_ANULADOS_APU_SEP (97), seções não instaladas
//      ou anuladas, origem do voto (U/T/C/R/B), voto em trânsito (ST_VOTO_EM_TRANSITO, SG_UF = VT),
//      destinação dos votos (NM_TIPO_DESTINACAO_VOTOS);
//   5. aptos_tte (transferência temporária) do BU por UF e turno.
//
// Uso: node scripts/auditoria/cetico-h10-dados.mjs
// Saída: data/parsed/auditoria/cetico/h10-dados.json
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { ZIPS, entradasZip, linhasBrutas } from './contagem-zip.mjs';

const SAIDA = 'data/parsed/auditoria/cetico';
mkdirSync(SAIDA, { recursive: true });
const ELEICAO_PRES = { 1: 6257, 2: 6258 };

/** Linhas do CSV como [valores, índice de coluna]; aspas simples nas pontas, como no contagem-zip. */
async function* csv(zip, nome) {
  const e = (await entradasZip(zip)).find((x) => x.nome === nome);
  if (!e) throw new Error(`${nome} não está em ${zip}`);
  let col = null;
  for await (const c of linhasBrutas(zip, e)) {
    if (!col) { col = Object.fromEntries(c.map((x, i) => [x, i])); continue; }
    yield [c, col];
  }
}
const inc = (o, k, q = 1) => { o[k] = (o[k] ?? 0) + q; };
const pega = (o, k, f) => (o[k] ??= f());

const out = { geradoEm: new Date().toISOString() };

// ---------- 1. votacao_secao (presidente) ----------
const vs = {}; // t|uf → { nr → votos }
const vsUfs = {};
const vsGeracao = new Set();
for await (const [c, col] of csv(ZIPS.votacaoSecao, 'votacao_secao_2026_BR.csv')) {
  if (c[col.CD_CARGO] !== '1') continue;
  const t = c[col.NR_TURNO];
  const uf = c[col.SG_UF].toLowerCase();
  vsGeracao.add(`${c[col.DT_GERACAO]} ${c[col.HH_GERACAO]} el=${c[col.CD_ELEICAO]}`);
  inc(vsUfs, uf);
  inc(pega(vs, `${t}|${uf}`, () => ({})), c[col.NR_VOTAVEL], Number(c[col.QT_VOTOS]));
}
console.error('votacao_secao ok');

// ---------- 2. detalhe por seção (presidente) ----------
const det = {}; // t|uf → somas
const detSec = new Map(); // uf|mun|zona|secao → [aptos1, aptos2, comp1, comp2]
const detGeracao = new Set();
const campoNum = ['QT_APTOS', 'QT_COMPARECIMENTO', 'QT_ABSTENCOES', 'QT_VOTOS_NOMINAIS', 'QT_VOTOS_BRANCOS', 'QT_VOTOS_NULOS', 'QT_VOTOS_LEGENDA', 'QT_VOTOS_ANULADOS_APU_SEP'];
for await (const [c, col] of csv(ZIPS.detalheSecao, 'detalhe_votacao_secao_2026_BR.csv')) {
  if (c[col.CD_CARGO] !== '1') continue;
  const t = Number(c[col.NR_TURNO]);
  const uf = c[col.SG_UF].toLowerCase();
  detGeracao.add(`${c[col.DT_GERACAO]} ${c[col.HH_GERACAO]} el=${c[col.CD_ELEICAO]}`);
  const a = pega(det, `${t}|${uf}`, () => ({ secoes: 0, origem: {}, naoInstalada: 0, anulada: 0 }));
  a.secoes++;
  for (const f of campoNum) inc(a, f, Number(c[col[f]]));
  inc(a.origem, c[col.DS_ORIGEM_VOTO]);
  if (c[col.ST_SECAO_INSTALADA] !== 'Sim' && c[col.ST_SECAO_INSTALADA] !== 'S') a.naoInstalada++;
  if (c[col.ST_SECAO_ANULADA] !== 'Não' && c[col.ST_SECAO_ANULADA] !== 'N') a.anulada++;
  const k = `${uf}|${Number(c[col.CD_MUNICIPIO])}|${Number(c[col.NR_ZONA])}|${Number(c[col.NR_SECAO])}`;
  let s = detSec.get(k);
  if (!s) { s = [null, null, null, null]; detSec.set(k, s); }
  s[t - 1] = Number(c[col.QT_APTOS]);
  s[t + 1] = Number(c[col.QT_COMPARECIMENTO]);
}
console.error('detalhe ok');

// ---------- 3. munzona (presidente) ----------
const mz = {}; // t|uf → { nr → votos }
const mzTransito = {}; const mzDestino = {}; const mzJulg = {};
const mzGeracao = new Set();
for await (const [c, col] of csv(ZIPS.munzona, 'votacao_candidato_munzona_2026_BR.csv')) {
  if (c[col.CD_CARGO] !== '1') continue;
  const t = c[col.NR_TURNO];
  const uf = c[col.SG_UF].toLowerCase();
  const nr = c[col.NR_CANDIDATO];
  mzGeracao.add(`${c[col.DT_GERACAO]} ${c[col.HH_GERACAO]} el=${c[col.CD_ELEICAO]}`);
  const q = Number(c[col.QT_VOTOS_NOMINAIS]);
  inc(pega(mz, `${t}|${uf}`, () => ({})), nr, q);
  inc(mzTransito, `${t}|${c[col.ST_VOTO_EM_TRANSITO]}`, q);
  inc(mzDestino, `${t}|${nr}|${c[col.NM_TIPO_DESTINACAO_VOTOS]}|validos=${c[col.QT_VOTOS_NOMINAIS_VALIDOS] === c[col.QT_VOTOS_NOMINAIS] ? 'igual' : 'difere'}`, q);
  mzJulg[`${t}|${nr}`] = `${c[col.NM_URNA_CANDIDATO]} | sq=${c[col.SQ_CANDIDATO]} | julg=${c[col.DS_SITUACAO_JULGAMENTO]} | tot=${c[col.DS_SIT_TOT_TURNO]}`;
}
console.error('munzona ok');

// ---------- 4. banco: soma dos BUs, aptos, aptos_tte ----------
const db = new DatabaseSync('data/db/eleicao2026.sqlite', { readOnly: true });
const carga = db.prepare('SELECT turno, uf, secoes, completas, incompletas, sem_arquivo, sem_pacote, agregadas FROM carga').all();
const carregada = new Set(carga.filter((x) => x.incompletas === 0 && x.sem_arquivo === 0 && x.sem_pacote === 0).map((x) => `${x.turno}|${x.uf}`));
const bu = {}; // t|uf → { nr|branco|nulo → votos }
for (const t of [1, 2]) {
  const linhas = db.prepare(`SELECT uf, tipo_voto, numero, SUM(quantidade) q FROM voto_bu
    WHERE turno = ? AND eleicao = ? AND cargo = 1 GROUP BY uf, tipo_voto, numero`).all(t, ELEICAO_PRES[t]);
  for (const r of linhas) {
    const k = r.tipo_voto === 'nominal' ? String(r.numero) : r.tipo_voto === 'branco' ? '95' : r.tipo_voto === 'nulo' ? '96' : `${r.tipo_voto}:${r.numero}`;
    inc(pega(bu, `${t}|${r.uf}`, () => ({})), k, r.q);
  }
  console.error(`banco turno ${t} ok`);
}
const aptosBu = {};
for (const r of db.prepare(`SELECT turno, uf, COUNT(*) n, SUM(aptos) aptos, SUM(aptos_secao) aptos_secao, SUM(aptos_tte) tte,
    SUM(comparecimento_majoritario) comp FROM secao_eleicao WHERE (turno = 1 AND eleicao = 6257) OR (turno = 2 AND eleicao = 6258)
    GROUP BY turno, uf`).all()) aptosBu[`${r.turno}|${r.uf}`] = r;
db.close();

// ---------- comparações por UF ----------
const ufs = [...new Set(Object.keys(det).map((k) => k.split('|')[1]))].sort();
const totais = {};
const somaObj = (o) => Object.values(o ?? {}).reduce((a, b) => a + b, 0);
const difObj = (a = {}, b = {}) => {
  const d = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if ((a[k] ?? 0) !== (b[k] ?? 0)) d[k] = [a[k] ?? 0, b[k] ?? 0];
  return d;
};
for (const t of [1, 2]) {
  for (const uf of ufs) {
    const k = `${t}|${uf}`;
    const v = vs[k] ?? {}; const d = det[k]; const m = mz[k] ?? {}; const b = bu[k];
    const nomVs = somaObj(Object.fromEntries(Object.entries(v).filter(([n]) => !['95', '96', '97'].includes(n))));
    const vSem28 = Object.fromEntries(Object.entries(v).filter(([n]) => !['95', '96', '97', '28'].includes(n)));
    totais[k] = {
      vs_nominais: nomVs, det_nominais: d.QT_VOTOS_NOMINAIS, vs_branco: v['95'] ?? 0, det_branco: d.QT_VOTOS_BRANCOS,
      vs_nulo: v['96'] ?? 0, det_nulo: d.QT_VOTOS_NULOS, vs_97: v['97'] ?? 0, det_anulApuSep: d.QT_VOTOS_ANULADOS_APU_SEP, det_legenda: d.QT_VOTOS_LEGENDA,
      det_comp: d.QT_COMPARECIMENTO, det_aptos: d.QT_APTOS, det_abst: d.QT_ABSTENCOES,
      det_fecha: d.QT_VOTOS_NOMINAIS + d.QT_VOTOS_BRANCOS + d.QT_VOTOS_NULOS === d.QT_COMPARECIMENTO && d.QT_APTOS === d.QT_COMPARECIMENTO + d.QT_ABSTENCOES,
      vs28: v['28'] ?? 0, mz28: m['28'] ?? 0, bu28: b?.['28'] ?? null,
      munzonaXvotacaoSecao_sem28: difObj(m, vSem28),
      buCarregadoCompleto: carregada.has(`${t}|${uf}`),
      buXvotacaoSecao: b ? difObj(b, v) : 'sem BU no banco',
      buAptos: aptosBu[k] ?? null,
      buAptosXdet: aptosBu[k] ? aptosBu[k].aptos - d.QT_APTOS : null,
      buCompXdet: aptosBu[k] ? aptosBu[k].comp - d.QT_COMPARECIMENTO : null,
      origem: d.origem, naoInstalada: d.naoInstalada, anulada: d.anulada, secoes: d.secoes,
    };
  }
}

// ---------- aptos entre turnos: seção, município, UF ----------
const porUf = {}; const porMun = {};
let secoesSo1 = 0, secoesSo2 = 0, secoesAptosDifere = 0, somaAbsSecao = 0;
const histDif = {};
for (const [k, [a1, a2, c1, c2]] of detSec) {
  const [uf, mun] = k.split('|');
  if (a1 === null) secoesSo2++;
  if (a2 === null) secoesSo1++;
  const d = (a2 ?? 0) - (a1 ?? 0);
  if (d) { secoesAptosDifere++; somaAbsSecao += Math.abs(d); }
  const faixa = d === 0 ? '0' : Math.abs(d) <= 2 ? '1-2' : Math.abs(d) <= 5 ? '3-5' : Math.abs(d) <= 20 ? '6-20' : '>20';
  inc(histDif, faixa);
  const u = pega(porUf, uf, () => ({ aptos1: 0, aptos2: 0, absSecao: 0, secoesSo1: 0, secoesSo2: 0 }));
  u.aptos1 += a1 ?? 0; u.aptos2 += a2 ?? 0; u.absSecao += Math.abs(d);
  if (a1 === null) u.secoesSo2++;
  if (a2 === null) u.secoesSo1++;
  const mm = pega(porMun, `${uf}|${mun}`, () => ({ aptos1: 0, aptos2: 0 }));
  mm.aptos1 += a1 ?? 0; mm.aptos2 += a2 ?? 0;
}
for (const u of Object.values(porUf)) u.dAptos = u.aptos2 - u.aptos1;
const munDif = Object.entries(porMun).filter(([, x]) => x.aptos1 !== x.aptos2);

// ---------- quanto das mudanças de aptos explica a perda do 22 e o "excesso" do 13 ----------
// Para cada município do arquivo do autor: se o 22 perdeu votos, a parte da perda explicável só por eleitores que
// saíram do cadastro da seção entre os turnos é no máximo  max(0, aptos1 − aptos2) × comp1/aptos1 × fatia do 22 no 1º.
// Teto mais folgado: max(0, aptos1 − aptos2) inteiro.
const munAutor = readFileSync('data/parsed/auditoria/cientista-politico/balanco-municipios.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
const explica = {};
for (const x of munAutor) {
  const g = pega(explica, x.uf, () => ({ perda22: 0, perda13: 0, teto22: 0, teto13: 0, esperado22: 0, esperado13: 0, municipiosPerda22: 0, dAptos: 0, compXaptosDifere: 0 }));
  g.dAptos += x.aptos2 - x.aptos1;
  const saida = Math.max(0, x.aptos1 - x.aptos2);
  if (x.dF < 0) {
    g.municipiosPerda22++;
    g.perda22 += -x.dF;
    g.teto22 += Math.min(-x.dF, saida);
    g.esperado22 += Math.min(-x.dF, saida * (x.comp1 / x.aptos1) * (x.F1 / x.comp1));
  }
  if (x.dL < 0) {
    g.perda13 += -x.dL;
    g.teto13 += Math.min(-x.dL, saida);
    g.esperado13 += Math.min(-x.dL, saida * (x.comp1 / x.aptos1) * (x.L1 / x.comp1));
  }
}
for (const g of Object.values(explica)) for (const k of ['esperado22', 'esperado13']) g[k] = Math.round(g[k]);
const tot = (f) => Object.values(explica).reduce((a, g) => a + g[f], 0);
explica.BR = { perda22: tot('perda22'), teto22: tot('teto22'), esperado22: tot('esperado22'), perda13: tot('perda13'), teto13: tot('teto13'), esperado13: tot('esperado13'), dAptos: tot('dAptos') };

// ---------- conta nacional do autor refeita a partir do votacao_secao + detalhe (independente do munzona) ----------
const nac = (t) => {
  const r = { L: 0, F: 0, E: 0, BN: 0, comp: 0, aptos: 0, v97: 0 };
  for (const uf of ufs) {
    const v = vs[`${t}|${uf}`] ?? {}; const d = det[`${t}|${uf}`];
    r.L += v['13'] ?? 0; r.F += v['22'] ?? 0; r.BN += (v['95'] ?? 0) + (v['96'] ?? 0); r.v97 += v['97'] ?? 0;
    for (const [n, q] of Object.entries(v)) if (!['13', '22', '95', '96', '97'].includes(n)) r.E += q;
    r.comp += d.QT_COMPARECIMENTO; r.aptos += d.QT_APTOS;
  }
  return r;
};
const n1 = nac(1), n2 = nac(2);
const disponivel = n1.E + (n1.BN - n2.BN) + (n2.comp - n1.comp);
out.nacional = { t1: n1, t2: n2, dL: n2.L - n1.L, dF: n2.F - n1.F, disponivel, parte13: (n2.L - n1.L) / disponivel,
  identidade: n2.L - n1.L + n2.F - n1.F === disponivel };

out.fontes = { votacaoSecao: [...vsGeracao], detalhe: [...detGeracao], munzona: [...mzGeracao] };
out.ufsVotacaoSecao = vsUfs;
out.carga = carga;
out.totais = totais;
out.candidato28 = { munzonaLinhas: Object.entries(mzJulg).filter(([k]) => k.endsWith('|28')), vs: ufs.reduce((a, u) => a + (vs[`1|${u}`]?.['28'] ?? 0), 0) };
out.munzona = { transito: mzTransito, destinacao: mzDestino, candidatos: mzJulg };
out.aptosEntreTurnos = {
  secoes: detSec.size, secoesSo1, secoesSo2, secoesAptosDifere, somaAbsSecao, histDif,
  municipiosAptosDifere: munDif.length, somaAbsMunicipio: munDif.reduce((a, [, x]) => a + Math.abs(x.aptos2 - x.aptos1), 0),
  maioresMunicipios: munDif.sort((a, b) => Math.abs(b[1].aptos2 - b[1].aptos1) - Math.abs(a[1].aptos2 - a[1].aptos1)).slice(0, 15)
    .map(([k, x]) => ({ k, ...x, d: x.aptos2 - x.aptos1 })),
  porUf,
};
out.explicacaoPorAptos = explica;
writeFileSync(`${SAIDA}/h10-dados.json`, JSON.stringify(out, null, 1));

// ---------- resumo na tela ----------
const r = {
  nacional: out.nacional,
  aptos: { ...out.aptosEntreTurnos, porUf: undefined, maioresMunicipios: out.aptosEntreTurnos.maioresMunicipios.slice(0, 5) },
  buXvs: Object.fromEntries(Object.entries(totais).filter(([, x]) => x.buXvotacaoSecao !== 'sem BU no banco').map(([k, x]) => [k, { completo: x.buCarregadoCompleto, difs: Object.keys(x.buXvotacaoSecao).length, d: x.buXvotacaoSecao }])),
};
console.log(JSON.stringify(r, null, 1));
