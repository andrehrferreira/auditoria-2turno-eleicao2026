// Revisor cético, achado linha-de-base-2018-2022 (docs/analysis/cientista-politico/04-linha-de-base-historica.md).
// Lente: explicações alternativas e poder do teste.
//  1. Reprodução independente (munzona 2018/2022/2026, presidente): ΔA, ΔB, eliminados, parte do disponível,
//     variação dos nominais por região, Norte capital × interior, correlação das viradas. Confere com a saída do autor.
//  2. Mapeamento dos finalistas: números com voto no 2º turno × DS_SIT_TOT_TURNO "2º TURNO" no 1º turno.
//  3. Decomposição do +4,0% de 2026: comparecimento × brancos/nulos × nº 28 (nulo técnico), com os totais oficiais
//     (data/raw/<t>t/referencia/br-c0001-*.json) e por região/município com o detalhe_votacao_secao_2026_BR.
//     2018 e 2022: o repo não tem detalhe; usa totais nacionais de referência externa (constantes abaixo),
//     validados pela identidade comparecimento − brancos − nulos = nominais do munzona.
//  4. Regressão ecológica por município: de onde vem o ΔA (eliminados × votos nominais novos), nos três anos.
//  5. Poder: (a) troca de votos B→A no 2º turno e a "parte do disponível"; (b) correlação das viradas sob
//     desvio uniforme e localizado (simulação).
// Uso: node scripts/auditoria/cetico-linha-de-base-2018-2022-alternativas.mjs
// Saída: data/parsed/auditoria/cetico/linha-de-base-2018-2022-alternativas.json (+ .txt com o resumo)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { entradasZip, linhasBrutas } from './contagem-zip.mjs';

const OUT = 'data/parsed/auditoria/cetico';
mkdirSync(OUT, { recursive: true });
const MZ = (a) => `data/raw/dadosabertos/votacao_candidato_munzona/votacao_candidato_munzona_${a}.zip`;
const DET = 'data/raw/dadosabertos/detalhe_votacao_secao/detalhe_votacao_secao_2026.zip';
const REGIAO = {
  AC: 'N', AM: 'N', AP: 'N', PA: 'N', RO: 'N', RR: 'N', TO: 'N',
  AL: 'NE', BA: 'NE', CE: 'NE', MA: 'NE', PB: 'NE', PE: 'NE', PI: 'NE', RN: 'NE', SE: 'NE',
  DF: 'CO', GO: 'CO', MS: 'CO', MT: 'CO', ES: 'SE', MG: 'SE', RJ: 'SE', SP: 'SE', PR: 'S', RS: 'S', SC: 'S', ZZ: 'EX',
};
// Referência EXTERNA (não há arquivo no repo): totais nacionais de presidente divulgados pelo TSE.
// Validação interna: comparecimento − brancos − nulos tem de dar os nominais do munzona do mesmo turno.
const EXT = {
  2018: { 1: { comp: 117364654, brancos: 3106937, nulos: 7206205 }, 2: { comp: 115933451, brancos: 2486593, nulos: 8608105 } },
  2022: { 1: { comp: 123682372, brancos: 1964779, nulos: 3487874 }, 2: { comp: 124252796, brancos: 1769678, nulos: 3930765 } },
};
const log = [];
const p = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
const pc = (x, d = 1) => (100 * x).toFixed(d);
const fmt = (x) => Math.round(x).toLocaleString('pt-BR');

// ---------- 1. munzona ----------
const anos = {};
for (const ano of [2018, 2022, 2026]) {
  const zip = MZ(ano);
  const e = (await entradasZip(zip)).find((x) => x.nome.endsWith('_BR.csv'));
  let col = null;
  const mun = new Map();
  const sit1 = {}; const nomes = {}; const destin = {};
  for await (const c of linhasBrutas(zip, e)) {
    if (!col) { col = Object.fromEntries(c.map((x, i) => [x, i])); continue; }
    if (c[col.CD_CARGO] !== '1') continue;
    const t = Number(c[col.NR_TURNO]);
    const uf = c[col.SG_UF];
    const k = `${uf}|${c[col.CD_MUNICIPIO]}`;
    let m = mun.get(k);
    if (!m) { m = { uf, nome: c[col.NM_MUNICIPIO], v: [null, {}, {}] }; mun.set(k, m); }
    const nr = c[col.NR_CANDIDATO];
    const q = Number(c[col.QT_VOTOS_NOMINAIS]);
    m.v[t][nr] = (m.v[t][nr] ?? 0) + q;
    nomes[nr] ??= `${c[col.NM_URNA_CANDIDATO]} (${c[col.SG_PARTIDO]})`;
    if (t === 1) sit1[nr] = c[col.DS_SIT_TOT_TURNO];
    const d = `${t}|${c[col.NM_TIPO_DESTINACAO_VOTOS]}|nominais=${c[col.QT_VOTOS_NOMINAIS] === c[col.QT_VOTOS_NOMINAIS_VALIDOS] ? 'igual' : 'difere'}`;
    destin[d] = (destin[d] ?? 0) + q;
  }
  anos[ano] = { mun, sit1, nomes, destin };
}

const resultado = { geradoEm: new Date().toISOString(), reproducao: {}, finalistas: {}, decomposicao: {}, regressao: {}, poder: {} };
const autor = JSON.parse(readFileSync('data/parsed/auditoria/cientista-politico/linha-de-base.json', 'utf8'));

p('== 1/2. Reprodução e finalistas ==');
const totais = {};
for (const [ano, d] of Object.entries(anos)) {
  const tot = [null, {}, {}];
  for (const m of d.mun.values()) for (const t of [1, 2]) for (const [nr, q] of Object.entries(m.v[t])) tot[t][nr] = (tot[t][nr] ?? 0) + q;
  const comVoto2 = Object.entries(tot[2]).filter(([, q]) => q > 0).map(([nr]) => nr);
  const sit2T = Object.entries(d.sit1).filter(([, s]) => s === '2º TURNO').map(([nr]) => nr);
  const [A, B] = [...comVoto2].sort((x, y) => (tot[2][y] - tot[1][y]) - (tot[2][x] - tot[1][x]));
  const val1 = Object.values(tot[1]).reduce((s, q) => s + q, 0), val2 = Object.values(tot[2]).reduce((s, q) => s + q, 0);
  const dA = tot[2][A] - tot[1][A], dB = tot[2][B] - tot[1][B], E = val1 - tot[1][A] - tot[1][B];
  totais[ano] = { A, B, val1, val2, dA, dB, E, tot };
  resultado.finalistas[ano] = { comVotoNo2T: comVoto2, marcados2TurnoNo1T: sit2T, A: `${A} ${d.nomes[A]}`, B: `${B} ${d.nomes[B]}`,
    linhas2TcomOutrosNumeros: Object.keys(tot[2]).filter((nr) => !comVoto2.includes(nr)), destinacao: d.destin };
  const r = { dA, dB, E, val1, val2, parteA: dA / (dA + dB), dAsobreE: dA / E, dNom: (val2 - val1) / val1, disponivel: dA + dB, identidade: dA + dB === E + (val2 - val1) };
  resultado.reproducao[ano] = r;
  const au = autor.anos[ano].brasil;
  p(`${ano}: A=${A} ${d.nomes[A]} B=${B} ${d.nomes[B]}; com voto no 2T: ${comVoto2.join(',')}; "2º TURNO" no 1T: ${sit2T.join(',')}`);
  p(`   ΔA ${fmt(dA)} ΔB ${fmt(dB)} E ${fmt(E)} | parte A ${pc(r.parteA)}% (autor ${au.parteA}) | ΔA/E ${pc(r.dAsobreE)}% (autor ${au.dAsobreEliminados}) | Δnom ${pc(r.dNom, 2)}% (autor ${au.dNominaisPct}) | ΔA+ΔB = E+Δnom: ${r.identidade}`);
  p(`   destinação: ${JSON.stringify(d.destin)}`);
}

// regiões e Norte
const regNom = {};
for (const [ano, d] of Object.entries(anos)) {
  const rg = {};
  for (const m of d.mun.values()) {
    const r = REGIAO[m.uf]; rg[r] ??= [0, 0];
    for (const t of [1, 2]) rg[r][t - 1] += Object.values(m.v[t]).reduce((s, q) => s + q, 0);
  }
  regNom[ano] = Object.fromEntries(Object.entries(rg).map(([r, [a, b]]) => [r, +pc((b - a) / a, 2)]));
}
resultado.reproducao.regioesDeltaNominaisPct = regNom;
p('Δ nominais por região (%):', JSON.stringify(regNom));

// viradas e correlação
const virada = (ano) => {
  const { A, B } = totais[ano];
  const out = new Map();
  for (const [k, m] of anos[ano].mun) {
    const [, v1, v2] = m.v;
    const h1 = (v1[A] ?? 0) + (v1[B] ?? 0), h2 = (v2[A] ?? 0) + (v2[B] ?? 0);
    if (h1 < 100 || h2 < 100) continue;
    out.set(k, { f1: (v1['13'] ?? 0) / h1, f2: (v2['13'] ?? 0) / h2, peso: h2, a2: v2[A] ?? 0, b2: v2[B] ?? 0, uf: m.uf });
  }
  return out;
};
const vir = { 2018: virada(2018), 2022: virada(2022), 2026: virada(2026) };
const corrW = (x, y, w) => {
  const sw = w.reduce((a, b) => a + b, 0);
  const mx = x.reduce((a, v, i) => a + w[i] * v, 0) / sw, my = y.reduce((a, v, i) => a + w[i] * v, 0) / sw;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < x.length; i++) { sxy += w[i] * (x[i] - mx) * (y[i] - my); sxx += w[i] * (x[i] - mx) ** 2; syy += w[i] * (y[i] - my) ** 2; }
  return sxy / Math.sqrt(sxx * syy);
};
const pares = (anoB) => {
  const ks = [], x = [], y = [], w = [];
  for (const [k, v] of vir[2026]) { const o = vir[anoB].get(k); if (!o) continue; ks.push(k); x.push(v.f2 - v.f1); y.push(o.f2 - o.f1); w.push(v.peso); }
  return { ks, x, y, w };
};
const P18 = pares(2018), P22 = pares(2022);
const c18 = corrW(P18.x, P18.y, P18.w), c22 = corrW(P22.x, P22.y, P22.w);
// correlação de postos (Spearman simples, sem peso) para ver se 0,51 vem de poucos municípios grandes
const rank = (a) => { const o = a.map((v, i) => [v, i]).sort((p1, p2) => p1[0] - p2[0]); const r = new Array(a.length); o.forEach(([, i], j) => { r[i] = j; }); return r; };
const um = (n) => new Array(n).fill(1);
const s18 = corrW(rank(P18.x), rank(P18.y), um(P18.x.length)), s22 = corrW(rank(P22.x), rank(P22.y), um(P22.x.length));
// correlação dentro das UFs (tira a média da UF): a geografia é entre UFs ou dentro delas?
const dentroUF = (P) => {
  const g = {};
  P.ks.forEach((k, i) => { const uf = k.split('|')[0]; g[uf] ??= { sw: 0, sx: 0, sy: 0 }; g[uf].sw += P.w[i]; g[uf].sx += P.w[i] * P.x[i]; g[uf].sy += P.w[i] * P.y[i]; });
  const x = P.x.map((v, i) => { const u = g[P.ks[i].split('|')[0]]; return v - u.sx / u.sw; });
  const y = P.y.map((v, i) => { const u = g[P.ks[i].split('|')[0]]; return v - u.sy / u.sw; });
  return corrW(x, y, P.w);
};
resultado.reproducao.correlacao = {
  '2026x2018': { n: P18.x.length, ponderada: +c18.toFixed(3), autor: autor.persistenciaViradas['2026x2018'].correlacaoPonderada, spearmanSemPeso: +s18.toFixed(3), ponderadaDentroDaUF: +dentroUF(P18).toFixed(3) },
  '2026x2022': { n: P22.x.length, ponderada: +c22.toFixed(3), autor: autor.persistenciaViradas['2026x2022'].correlacaoPonderada, spearmanSemPeso: +s22.toFixed(3), ponderadaDentroDaUF: +dentroUF(P22).toFixed(3) },
};
{ // linha de base da própria correlação: 2022×2018 (anos com lados opostos crescendo)
  const x = [], y = [], w = [];
  for (const [k, v] of vir[2022]) { const o = vir[2018].get(k); if (!o) continue; x.push(v.f2 - v.f1); y.push(o.f2 - o.f1); w.push(v.peso); }
  resultado.reproducao.correlacao['2022x2018'] = { n: x.length, ponderada: +corrW(x, y, w).toFixed(3) };
}
p('Correlação das viradas:', JSON.stringify(resultado.reproducao.correlacao));
// Norte: capital × interior (votos nominais), AC, AP, RR, AM
const CAP = { AC: 'RIO BRANCO', AP: 'MACAPÁ', RR: 'BOA VISTA', AM: 'MANAUS' };
resultado.reproducao.norte = {};
for (const ano of [2018, 2022, 2026]) for (const uf of Object.keys(CAP)) {
  const s = { cap: [0, 0], int: [0, 0] };
  for (const m of anos[ano].mun.values()) { if (m.uf !== uf) continue; const g = m.nome === CAP[uf] ? 'cap' : 'int';
    for (const t of [1, 2]) s[g][t - 1] += Object.values(m.v[t]).reduce((a, q) => a + q, 0); }
  resultado.reproducao.norte[`${ano}-${uf}`] = { capital: +pc(s.cap[1] / s.cap[0] - 1), interior: +pc(s.int[1] / s.int[0] - 1) };
}
p('Norte capital/interior (Δ nominais %):', JSON.stringify(resultado.reproducao.norte));

// ---------- 3. decomposição ----------
p('\n== 3. Decomposição do Δ nominais (comparecimento × brancos/nulos) ==');
const ofi = (t) => JSON.parse(readFileSync(t === 1 ? 'data/raw/1t/referencia/br-c0001-e006257-u.json' : 'data/raw/2t/referencia/br-c0001-e006258-u.json', 'utf8'));
const o1 = ofi(1), o2 = ofi(2);
const nac = {
  2026: {
    1: { aptos: +o1.e.te, comp: +o1.e.c, brancos: +o1.v.vb, nulos: +o1.v.tvn, nulosTecnicos: +o1.v.vnt, nom: +o1.v.vnom },
    2: { aptos: +o2.e.te, comp: +o2.e.c, brancos: +o2.v.vb, nulos: +o2.v.tvn, nulosTecnicos: +o2.v.vnt, nom: +o2.v.vnom },
  },
};
for (const ano of [2018, 2022]) nac[ano] = { 1: { ...EXT[ano][1], nom: EXT[ano][1].comp - EXT[ano][1].brancos - EXT[ano][1].nulos }, 2: { ...EXT[ano][2], nom: EXT[ano][2].comp - EXT[ano][2].brancos - EXT[ano][2].nulos } };
for (const ano of [2018, 2022, 2026]) {
  const [a, b] = [nac[ano][1], nac[ano][2]];
  const mz = resultado.reproducao[ano];
  const dNom = b.nom - a.nom, dComp = b.comp - a.comp, dBN = (b.brancos + b.nulos) - (a.brancos + a.nulos);
  const r = {
    nominais1_ref: a.nom, nominais1_munzona: mz.val1, dif1: a.nom - mz.val1, nominais2_ref: b.nom, nominais2_munzona: mz.val2, dif2: b.nom - mz.val2,
    dComp, dCompPct: +pc(dComp / a.comp, 2), dBrancosNulos: dBN, dBrancosNulosPct: +pc(dBN / (a.brancos + a.nulos), 1),
    pctBN_1: +pc((a.brancos + a.nulos) / a.comp, 2), pctBN_2: +pc((b.brancos + b.nulos) / b.comp, 2),
    dNom, parcelaComparecimento: +pc(dComp / dNom, 1), parcelaQuedaBrancosNulos: +pc(-dBN / dNom, 1),
    dNomSemAjuste: +pc(dNom / a.nom, 2),
    // "ajuste por brancos/nulos": variação que haveria se a fração de brancos+nulos do 1º turno se mantivesse
    dNomComFracaoBN1T: +pc((b.comp * (a.nom / a.comp) - a.nom) / a.nom, 2),
    eliminados: mz.E, disponivelSemNovos: mz.E, // se Δnom = 0
  };
  if (ano === 2026) { r.nulosTecnicos28 = a.nulosTecnicos; r.parcela28 = +pc(a.nulosTecnicos / dNom, 2); r.comparecimentoPp = +pc(b.comp / b.aptos - a.comp / a.aptos, 2); r.aptos1 = a.aptos; r.aptos2 = b.aptos; }
  resultado.decomposicao[ano] = r;
  p(`${ano}: Δcomp ${fmt(dComp)} (${r.dCompPct}%) | Δ(brancos+nulos) ${fmt(dBN)} (${r.dBrancosNulosPct}%; ${r.pctBN_1}% → ${r.pctBN_2}% do comparecimento) | Δnom ${fmt(dNom)} = ${r.parcelaComparecimento}% comparecimento + ${r.parcelaQuedaBrancosNulos}% queda de brancos/nulos`);
  p(`   nominais ref − munzona: 1T ${r.dif1}, 2T ${r.dif2} | Δnom com a fração de brancos/nulos do 1T mantida: ${r.dNomComFracaoBN1T}% (sem ajuste ${r.dNomSemAjuste}%)`);
  if (ano === 2026) p(`   nulos técnicos (nº 28) no 1T: ${fmt(a.nulosTecnicos)} = ${r.parcela28}% do Δnom | comparecimento ${pc(a.comp / a.aptos, 2)}% → ${pc(b.comp / b.aptos, 2)}% (${r.comparecimentoPp} p.p.) com aptos ${fmt(a.aptos)} / ${fmt(b.aptos)}`);
}

// detalhe 2026 por município e região
const det = new Map();
{
  const e = (await entradasZip(DET)).find((x) => x.nome.endsWith('_BR.csv'));
  let col = null;
  for await (const c of linhasBrutas(DET, e)) {
    if (!col) { col = Object.fromEntries(c.map((x, i) => [x, i])); continue; }
    if (c[col.CD_CARGO] !== '1') continue;
    const t = Number(c[col.NR_TURNO]);
    const k = `${c[col.SG_UF]}|${c[col.CD_MUNICIPIO]}`;
    let m = det.get(k);
    if (!m) { m = { uf: c[col.SG_UF], t: [null, { aptos: 0, comp: 0, nom: 0, bn: 0, br: 0, nu: 0 }, { aptos: 0, comp: 0, nom: 0, bn: 0, br: 0, nu: 0 }] }; det.set(k, m); }
    const x = m.t[t];
    x.aptos += +c[col.QT_APTOS]; x.comp += +c[col.QT_COMPARECIMENTO]; x.nom += +c[col.QT_VOTOS_NOMINAIS] + +c[col.QT_VOTOS_LEGENDA];
    x.br += +c[col.QT_VOTOS_BRANCOS]; x.nu += +c[col.QT_VOTOS_NULOS]; x.bn += +c[col.QT_VOTOS_BRANCOS] + +c[col.QT_VOTOS_NULOS];
  }
}
{
  const s = [null, { aptos: 0, comp: 0, nom: 0, br: 0, nu: 0 }, { aptos: 0, comp: 0, nom: 0, br: 0, nu: 0 }];
  const rg = {};
  for (const m of det.values()) for (const t of [1, 2]) {
    for (const f of ['aptos', 'comp', 'nom', 'br', 'nu']) s[t][f] += m.t[t][f];
    const r = REGIAO[m.uf]; rg[r] ??= [null, { comp: 0, nom: 0, bn: 0, aptos: 0 }, { comp: 0, nom: 0, bn: 0, aptos: 0 }];
    for (const f of ['comp', 'nom', 'bn', 'aptos']) rg[r][t][f] += m.t[t][f];
  }
  resultado.decomposicao.detalhe2026Total = { t1: s[1], t2: s[2] };
  p(`detalhe 2026 (BR): 1T aptos ${fmt(s[1].aptos)} comp ${fmt(s[1].comp)} nom ${fmt(s[1].nom)} br ${fmt(s[1].br)} nu ${fmt(s[1].nu)} | 2T aptos ${fmt(s[2].aptos)} comp ${fmt(s[2].comp)} nom ${fmt(s[2].nom)} br ${fmt(s[2].br)} nu ${fmt(s[2].nu)}`);
  resultado.decomposicao.regioes2026 = {};
  for (const [r, [, a, b]] of Object.entries(rg)) {
    const dNom = b.nom - a.nom;
    resultado.decomposicao.regioes2026[r] = { dNomPct: +pc(dNom / a.nom, 2), dCompPct: +pc((b.comp - a.comp) / a.comp, 2), dCompPp: +pc(b.comp / b.aptos - a.comp / a.aptos, 2), bn1Pct: +pc(a.bn / a.comp, 2), bn2Pct: +pc(b.bn / b.comp, 2), parcelaComparecimento: +pc((b.comp - a.comp) / dNom, 1) };
  }
  p('regiões 2026:', JSON.stringify(resultado.decomposicao.regioes2026));
}

// ---------- 4. regressão ecológica por município ----------
p('\n== 4. Regressão por município: ΔA = a·Eliminados + b·Δnominais (sem intercepto, MQO em votos) ==');
const ols = (X, y) => { // X: array de linhas; resolve (X'X) β = X'y por eliminação de Gauss
  const k = X[0].length; const M = Array.from({ length: k }, () => new Array(k + 1).fill(0));
  for (let i = 0; i < y.length; i++) for (let a = 0; a < k; a++) { M[a][k] += X[i][a] * y[i]; for (let b = 0; b < k; b++) M[a][b] += X[i][a] * X[i][b]; }
  for (let c = 0; c < k; c++) { let piv = c; for (let r = c + 1; r < k; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r; [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = 0; r < k; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let j = c; j <= k; j++) M[r][j] -= f * M[c][j]; } }
  return M.map((row, i) => row[k] / row[i]);
};
for (const ano of [2018, 2022, 2026]) {
  const { A, B } = totais[ano]; const X = [], y = [], X3 = [], y3 = [];
  for (const [k, m] of anos[ano].mun) {
    const [, v1, v2] = m.v; const val1 = Object.values(v1).reduce((s, q) => s + q, 0), val2 = Object.values(v2).reduce((s, q) => s + q, 0);
    if (!val1 || !val2) continue;
    const E = val1 - (v1[A] ?? 0) - (v1[B] ?? 0), dA = (v2[A] ?? 0) - (v1[A] ?? 0);
    X.push([E, val2 - val1]); y.push(dA);
    if (ano === 2026) { const d = det.get(k); if (d) { X3.push([E, d.t[2].comp - d.t[1].comp, -(d.t[2].bn - d.t[1].bn)]); y3.push(dA); } }
  }
  const [a, b] = ols(X, y);
  resultado.regressao[ano] = { municipios: y.length, aDosEliminados: +a.toFixed(3), bDosNominaisNovos: +b.toFixed(3) };
  p(`${ano} (A=${A}): ${y.length} municípios; a (fração dos eliminados para A) ${a.toFixed(3)}; b (fração dos nominais novos para A) ${b.toFixed(3)}`);
  if (ano === 2026) {
    const [a3, b3, c3] = ols(X3, y3);
    resultado.regressao['2026_3termos'] = { municipios: y3.length, eliminados: +a3.toFixed(3), comparecimentoNovo: +b3.toFixed(3), quedaBrancosNulos: +c3.toFixed(3) };
    p(`2026 com 3 termos: eliminados ${a3.toFixed(3)}; comparecimento novo ${b3.toFixed(3)}; queda de brancos/nulos ${c3.toFixed(3)} (${y3.length} municípios)`);
  }
}
// relação entre aumento de comparecimento e virada pró-13, 2026 (ponderada)
{
  const x = [], yv = [], w = [];
  for (const [k, v] of vir[2026]) { const d = det.get(k); if (!d || !d.t[1].aptos) continue; x.push(d.t[2].comp / d.t[2].aptos - d.t[1].comp / d.t[1].aptos); yv.push(v.f2 - v.f1); w.push(v.peso); }
  resultado.regressao.corrDeltaComparecimentoVirada2026 = +corrW(x, yv, w).toFixed(3);
  p(`corr(Δ comparecimento em p.p., virada pró-13) 2026, ponderada: ${resultado.regressao.corrDeltaComparecimentoVirada2026}`);
}

// ---------- 5. poder ----------
p('\n== 5. Poder dos testes ==');
{
  const r = resultado.reproducao[2026]; const disp = r.disponivel;
  const T = totais[2026]; const a2 = T.tot[2][T.A], b2 = T.tot[2][T.B];
  const X_flip = (a2 - b2) / 2; // votos trocados B→A que, desfeitos, empatariam
  const parteVerdadeiraSeFlip = (r.dA - X_flip) / disp;
  const X_para2022 = (r.parteA - resultado.reproducao[2022].parteA) * disp;
  const X_para2018 = (r.parteA - resultado.reproducao[2018].parteA) * disp;
  resultado.poder.troca = { disponivel: disp, margem2T: a2 - b2, votosTrocadosParaEmpatar: Math.round(X_flip), parteAVerdadeiraSeHouvesseEssaTroca: +pc(parteVerdadeiraSeFlip),
    votosTrocadosQueLevariamDe2022AoObservado: Math.round(X_para2022), votosTrocadosQueLevariamDe2018AoObservado: Math.round(X_para2018) };
  p(`(a) troca B→A no 2T não muda o disponível (${fmt(disp)}); cada 141 mil votos trocados sobem a parte de A em 1 p.p.`);
  p(`    margem ${fmt(a2 - b2)}: uma troca de ${fmt(X_flip)} votos (o bastante para virar o resultado) partiria de uma parte "verdadeira" de ${pc(parteVerdadeiraSeFlip)}% e chegaria aos 73,6% observados.`);
  p(`    de 69,8% (2022) a 73,6%: ${fmt(X_para2022)} votos; de 64,8% (2018): ${fmt(X_para2018)} votos.`);
}
{
  // (b) correlação das viradas sob desvio
  const base = c18;
  const P = P18; const v26 = P.ks.map((k) => vir[2026].get(k));
  const corrCom = (fn) => { const x = P.ks.map((k, i) => { const v = v26[i]; const [a2, b2] = fn(i, v); return a2 / (a2 + b2) - v.f1; }); return corrW(x, P.y, P.w); };
  // uniforme: troca fração s dos votos de B para A em todo município
  const unif = [0.01, 0.02, 0.04].map((s) => { let moved = 0; const c = corrCom((i, v) => { const m = v.b2 * s; moved += m; return [v.a2 + m, v.b2 - m]; }); return { fracaoDeB: s, votosTrocados: Math.round(moved), correlacao: +c.toFixed(3) }; });
  // localizada: em k% dos municípios sorteados (semente fixa), troca fração s de B para A
  let seed = 20261025; const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; // mulberry32
  const loc = [];
  for (const frac of [0.05, 0.10, 0.20]) for (const s of [0.05, 0.10]) {
    const cs = []; let movedTot = 0;
    for (let rep = 0; rep < 50; rep++) {
      const alvo = P.ks.map(() => rnd() < frac); let moved = 0;
      cs.push(corrCom((i, v) => { if (!alvo[i]) return [v.a2, v.b2]; const m = v.b2 * s; moved += m; return [v.a2 + m, v.b2 - m]; }));
      movedTot += moved;
    }
    cs.sort((a, b) => a - b);
    loc.push({ fracaoMunicipios: frac, fracaoDeB: s, votosTrocadosMedio: Math.round(movedTot / 50), correlacaoMediana: +cs[25].toFixed(3), correlacaoP5: +cs[2].toFixed(3), correlacaoP95: +cs[47].toFixed(3) });
  }
  // manipulação "que copia 2018": troca proporcional à virada de 2018 (só onde ela foi positiva)
  let movedC = 0; const copia = corrCom((i, v) => { const s = Math.max(0, P.y[i]) * 0.3; const m = v.b2 * s; movedC += m; return [v.a2 + m, v.b2 - m]; });
  resultado.poder.correlacao = { base: +base.toFixed(3), uniforme: unif, localizadaAleatoria: loc, copiandoMapa2018: { votosTrocados: Math.round(movedC), correlacao: +copia.toFixed(3) } };
  p(`(b) corr 2026×2018 base ${base.toFixed(3)}`);
  p('    troca uniforme:', JSON.stringify(unif));
  p('    troca localizada aleatória (50 sorteios):', JSON.stringify(loc));
  p(`    troca que segue o mapa de 2018: ${fmt(movedC)} votos → corr ${copia.toFixed(3)}`);
}

writeFileSync(`${OUT}/linha-de-base-2018-2022-alternativas.json`, JSON.stringify(resultado, null, 1));
writeFileSync(`${OUT}/linha-de-base-2018-2022-alternativas.txt`, log.join('\n') + '\n');
console.log('ok');
