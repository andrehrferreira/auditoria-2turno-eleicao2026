// Cientista político, H22: linha de base do exterior em 2018 e 2022 (votacao_candidato_munzona, presidente).
//
// O arquivo traz só votos nominais por cidade do exterior (sem comparecimento, brancos e nulos). Mede, por ano:
//   - votos nominais no 1º e no 2º turno e a variação (aproxima a variação do comparecimento);
//   - ganho de cada finalista e a parte do disponível (ΔA / (ΔA + ΔB));
//   - por continente e por cidade; correlação, entre cidades, do crescimento de 2026 com o de 2022 e com o de 2018;
//   - estabilidade política por cidade: fatia do 13 no 2º turno de 2022 × 2026;
//   - as 29 cidades/seções do Sistema de Apuração de 2026: a fatia do 13 nelas, nos três anos, contra o continente.
// Finalistas: 2018 13 × 17; 2022 13 × 22; 2026 13 × 22. "13" é o mesmo número de partido nos três anos.
//
// Uso: node scripts/auditoria/politico-h22-linha-de-base.mjs
// Saída: data/parsed/auditoria/cientista-politico/h22-linha-de-base.json
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { entradasZip, linhasCsv } from './contagem-zip.mjs';
import { DIR_SAIDA, ZIP_MUNZONA, lerLocaisZZ, pearson, pp, r } from './politico-h22-lib.mjs';

const { cidades } = await lerLocaisZZ();
const FINAL = { 2018: ['13', '17'], 2022: ['13', '22'], 2026: ['13', '22'] };
const ANOS = [2018, 2022, 2026];

const dados = {}; // ano → Map(cod → {nome, t1: {num: votos}, t2: {...}})
const geracao = {};
for (const ano of ANOS) {
  const zip = ZIP_MUNZONA(ano);
  const e = (await entradasZip(zip)).find((x) => x.nome === `votacao_candidato_munzona_${ano}_BR.csv`);
  const m = new Map();
  for await (const l of linhasCsv(zip, e)) {
    if (l.SG_UF !== 'ZZ' || l.CD_CARGO !== '1') continue;
    geracao[ano] ??= `${l.DT_GERACAO} ${l.HH_GERACAO}`;
    const c = m.get(l.CD_MUNICIPIO) ?? { nome: l.NM_MUNICIPIO, t1: {}, t2: {} };
    const t = c[`t${l.NR_TURNO}`];
    t[l.NR_CANDIDATO] = (t[l.NR_CANDIDATO] ?? 0) + Number(l.QT_VOTOS_NOMINAIS);
    m.set(l.CD_MUNICIPIO, c);
  }
  dados[ano] = m;
}
const soma = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const contDe = (cod) => cidades.get(cod)?.continente ?? 'sem continente (cidade fora de 2026)';

function balanco(lista, ano) {
  const [A, B] = FINAL[ano];
  let n1 = 0, n2 = 0, a1 = 0, a2 = 0, b1 = 0, b2 = 0;
  for (const c of lista) { n1 += soma(c.t1); n2 += soma(c.t2); a1 += c.t1[A] ?? 0; a2 += c.t2[A] ?? 0; b1 += c.t1[B] ?? 0; b2 += c.t2[B] ?? 0; }
  const dA = a2 - a1, dB = b2 - b1;
  return {
    cidades: lista.length, nominais1: n1, nominais2: n2, variacaoNominaisPct: pp((n2 - n1) / n1), eliminados1: n1 - a1 - b1,
    [`d${A}`]: dA, [`d${B}`]: dB, parteDisponivel13Pct: dA + dB ? pp(dA / (dA + dB)) : null,
    fatia13_1Pct: pp(a1 / (a1 + b1)), fatia13_2Pct: pp(a2 / (a2 + b2)),
  };
}

const porAno = {};
for (const ano of ANOS) {
  const lista = [...dados[ano].values()];
  const porCont = {};
  for (const [cod, c] of dados[ano]) (porCont[contDe(cod)] ??= []).push(c);
  porAno[ano] = { geradoEm: geracao[ano], total: balanco(lista, ano), continente: Object.fromEntries(Object.entries(porCont).map(([k, l]) => [k, balanco(l, ano)])) };
}

// Crescimento por cidade: 2026 × 2022 × 2018 (cidades com 500+ votos nominais no 1º turno de 2026).
const cres = (c) => (soma(c.t1) ? soma(c.t2) / soma(c.t1) - 1 : null);
const linhas = [];
for (const [cod, c26] of dados[2026]) {
  const c22 = dados[2022].get(cod), c18 = dados[2018].get(cod);
  if (soma(c26.t1) < 500) continue;
  const f = (c, a) => { const [A, B] = FINAL[a]; return c && (c.t2[A] ?? 0) + (c.t2[B] ?? 0) ? (c.t2[A] ?? 0) / ((c.t2[A] ?? 0) + (c.t2[B] ?? 0)) : null; };
  linhas.push({ cod, nome: c26.nome, pais: cidades.get(cod)?.pais, nominais1_2026: soma(c26.t1), cres2026: cres(c26), cres2022: c22 ? cres(c22) : null, cres2018: c18 ? cres(c18) : null, fatia13_2_2026: f(c26, 2026), fatia13_2_2022: f(c22, 2022) });
}
const par = (k1, k2) => { const l = linhas.filter((x) => x[k1] != null && x[k2] != null); return { cidades: l.length, correlacao: r(pearson(l.map((x) => x[k1]), l.map((x) => x[k2])), 3) }; };
const porCidade = {
  criterio: 'cidades com 500+ votos nominais no 1º turno de 2026',
  crescimento2026x2022: par('cres2026', 'cres2022'), crescimento2026x2018: par('cres2026', 'cres2018'), crescimento2022x2018: par('cres2022', 'cres2018'),
  fatia13_2T_2026x2022: par('fatia13_2_2026', 'fatia13_2_2022'),
  cidadesCrescimento2026AcimaDe20Pct: linhas.filter((x) => x.cres2026 > 0.2).length,
  cidadesCrescimento2022AcimaDe20Pct: linhas.filter((x) => x.cres2022 > 0.2).length,
  maiores2026: [...linhas].sort((a, b) => b.cres2026 - a.cres2026).slice(0, 12).map((x) => ({ cidade: `${x.nome} (${x.pais})`, nominais1: x.nominais1_2026, cres2026Pct: pp(x.cres2026), cres2022Pct: pp(x.cres2022), cres2018Pct: pp(x.cres2018) })),
  maiorMudancaFatia13: [...linhas].filter((x) => x.fatia13_2_2022 != null).sort((a, b) => Math.abs(b.fatia13_2_2026 - b.fatia13_2_2022) - Math.abs(a.fatia13_2_2026 - a.fatia13_2_2022)).slice(0, 10)
    .map((x) => ({ cidade: `${x.nome} (${x.pais})`, fatia13_2T_2022: pp(x.fatia13_2_2022), fatia13_2T_2026: pp(x.fatia13_2_2026) })),
  medianaCres: { 2026: pp(linhas.map((x) => x.cres2026).sort((a, b) => a - b)[Math.floor(linhas.length / 2)]), 2022: pp(linhas.filter((x) => x.cres2022 != null).map((x) => x.cres2022).sort((a, b) => a - b)[Math.floor(linhas.filter((x) => x.cres2022 != null).length / 2)]) },
};
const cidadesSo = { so2026: [...dados[2026].keys()].filter((k) => !dados[2022].has(k)).map((k) => dados[2026].get(k).nome), so2022: [...dados[2022].keys()].filter((k) => !dados[2026].has(k)).map((k) => dados[2022].get(k).nome) };

// Cidades do Sistema de Apuração de 2026 (lidas do resultado de politico-h22-apuracao.mjs): fatia do 13 nos três anos × continente.
let sa = null;
try {
  const ap = JSON.parse(readFileSync(`${DIR_SAIDA}/h22-apuracao.json`, 'utf8'));
  const cods = [...new Set(ap.secoes.filter((x) => x.uf === 'zz').map((x) => x.secao.slice(0, 5)))];
  // Só cidades em que a seção de SA é a única seção com voto (a cidade inteira é a seção): aí munzona = seção.
  const unicas = cods.filter((cod) => ap.secoes.filter((x) => x.uf === 'zz' && x.secao.startsWith(cod)).length === 2);
  sa = { cidades: cods.length, porAno: {} };
  for (const ano of ANOS) {
    const [A, B] = FINAL[ano];
    for (const t of ['t1', 't2']) {
      let a = 0, b = 0, esperado = 0, n = 0;
      const contAgg = {};
      for (const [cod, c] of dados[ano]) {
        const k = contDe(cod);
        contAgg[k] ??= { a: 0, b: 0 };
        if (!cods.includes(cod)) { contAgg[k].a += c[t][A] ?? 0; contAgg[k].b += c[t][B] ?? 0; }
      }
      for (const cod of cods) {
        const c = dados[ano].get(cod);
        if (!c) continue;
        n++;
        const x = c[t][A] ?? 0, y = c[t][B] ?? 0;
        a += x; b += y;
        const ref = contAgg[contDe(cod)];
        esperado += (x + y) * (ref.a / (ref.a + ref.b));
      }
      sa.porAno[`${ano}-${t}`] = { cidadesComVoto: n, votos13: a, votosOutroFinalista: b, fatia13Pct: pp(a / (a + b)), esperado13PeloContinente: Math.round(esperado), excesso13: Math.round(a - esperado) };
    }
  }
  sa.nota = `cidades inteiras (munzona); ${unicas.length} das ${cods.length} cidades têm só a seção de SA no BU de 2026`;
} catch (erro) {
  sa = { erro: `rode antes politico-h22-apuracao.mjs (${erro.message})` };
}

mkdirSync(DIR_SAIDA, { recursive: true });
const resultado = { geradoEm: new Date().toISOString(), finalistas: FINAL, porAno, porCidade, cidadesSo, sistemaDeApuracao: sa };
writeFileSync(`${DIR_SAIDA}/h22-linha-de-base.json`, JSON.stringify(resultado, null, 1));
for (const ano of ANOS) {
  console.log(`${ano} (arquivo de ${geracao[ano]}):`, JSON.stringify(porAno[ano].total));
  for (const [k, v] of Object.entries(porAno[ano].continente)) console.log(`   ${k}: nominais ${v.variacaoNominaisPct}%, parte 13 ${v.parteDisponivel13Pct}%, fatia13 ${v.fatia13_1Pct}→${v.fatia13_2Pct}`);
}
console.log('Por cidade:', JSON.stringify(porCidade));
console.log('Cidades só num ano:', JSON.stringify(cidadesSo));
console.log('SA:', JSON.stringify(sa));
