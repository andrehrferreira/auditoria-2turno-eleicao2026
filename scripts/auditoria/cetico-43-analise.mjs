// Cético, parecer 43: testes do salto dos votantes de 85–99 (demógrafo 09), por caminho próprio, sobre a leitura do
// cetico-43-pca.mjs (perfil de comparecimento 2018/2022/2026 lido do BRASIL.csv, faixa pelo texto).
//  A. série por faixa (Brasil sem exterior e sem VT), conferência do total de votantes contra detalhe por seção e BU,
//     definição de "votante" (aptos = comparecimento + abstenção; facultativo; TTE), pares código→texto de cada ano;
//  B. coorte (a mesma geração 4 anos depois) e escala logística; referência com cadastro fixo: 2022, 1º → 2º turno;
//  C. Censo 2022 (idade simples, conferida contra os grupos de 5 anos do próprio arquivo): teto sem mortes e votantes;
//  D. UF: correlação "sem biometria 90–99" × subida dos votantes, para 85–99 e para as faixas de controle (25–59 a
//     80–84), e para o EXCESSO de 85–99 sobre 70–79 (tira a mobilização regional que atinge todas as idades);
//  E. municípios por quinto de "sem biometria 90–99": 85–99, 70–74 (controle) e excesso;
//  F. zonas: pares 2022/2026; limite inferior de votantes sem biometria (80–89, 90–99) com a conferência do perfil
//     do cadastro contra os aptos do comparecimento, faixa a faixa (data de referência da idade), e contra o BU;
//  G. regressão ecológica por zona (efeito fixo de UF): habilitação sem digital (BU) × votantes por faixa (2026, 1º t.).
// Agregado; nenhum CPF, nenhum título. Banco pela cópia de leitura.
// Uso: node --max-old-space-size=6000 scripts/auditoria/cetico-43-analise.mjs
// Saída: data/parsed/auditoria/cetico-revisor/p43/analise.json
import { readFileSync, readdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', 'p43');
const IBGE = path.join(DIR_DADOS, 'raw', 'externos', 'ibge');
const PERF = path.join(DIR_DADOS, 'parsed', 'auditoria', 'demografo', 'perfil');
const P = JSON.parse(readFileSync(path.join(SAIDA, 'pca.json'), 'utf8'));
const Z = JSON.parse(readFileSync(path.join(SAIDA, 'pca-zonas.json'), 'utf8'));
const pct = (a, b) => (b ? +(100 * a / b).toFixed(3) : null);
const r3 = (x) => (x === null || Number.isNaN(x) ? null : +x.toFixed(3));
const logit = (p) => Math.log(p / (1 - p));
const B = ['16-17', '18-24', '25-59', '60-64', '65-69', '70-74', '75-79', '80-84', '85-89', '90-94', '95-99', '100+', 'invalida'];
const v = (ano, t, g, f) => P.anos[ano].brasil[`${t}|${g}|${f}`] ?? [0, 0, 0, 0, 0, 0, 0];
const somaF = (ano, t, g, fs) => fs.reduce((s, f) => s.map((x, i) => x + v(ano, t, g, f)[i]), [0, 0, 0, 0, 0, 0, 0]);
const R = {};

// ---------- A
R.A = { serie: {}, totais: {}, definicao: {}, pares: {} };
for (const f of B) {
  const o = {};
  for (const [ano, t] of [[2018, 1], [2018, 2], [2022, 1], [2022, 2], [2026, 1]]) { const x = v(ano, t, 'BR', f); if (x[0]) o[`${ano}-${t}t`] = { aptos: x[0], votantes: x[1], taxa: pct(x[1], x[0]) }; }
  if (o['2022-1t'] && o['2026-1t']) o.delta22a26 = { votantesPct: pct(o['2026-1t'].votantes - o['2022-1t'].votantes, o['2022-1t'].votantes), aptosPct: pct(o['2026-1t'].aptos - o['2022-1t'].aptos, o['2022-1t'].aptos), pontos: r3(o['2026-1t'].taxa - o['2022-1t'].taxa) };
  R.A.serie[f] = o;
}
for (const [ano, t] of [[2018, 1], [2018, 2], [2022, 1], [2022, 2], [2026, 1]]) {
  const br = somaF(ano, t, 'BR', B); const vt = somaF(ano, t, 'VT', B); const zz = somaF(ano, t, 'ZZ', B);
  const d = P.detalhe[ano][`${t}|BR`] ?? {}; const dz = P.detalhe[ano][`${t}|ZZ`] ?? {};
  R.A.totais[`${ano}-${t}t`] = { pcaBrasilSemVT: { aptos: br[0], votantes: br[1] }, pcaVT: { aptos: vt[0], votantes: vt[1] }, pcaZZ: { aptos: zz[0], votantes: zz[1] },
    detalheSemZZ: d, detalheZZ: dz, difVotantesPcaBrMaisVTMenosDetalhe: d.comparecimento !== undefined ? br[1] + vt[1] - d.comparecimento : null,
    bu: ano === 2026 ? P.bu2026.porTurno.filter((x) => x.turno === t) : undefined };
  R.A.definicao[`${ano}-${t}t`] = { linhasAptosDiferente: P.anos[ano].linhasAptosDiferenteDeCompMaisAbst,
    porFaixa: Object.fromEntries(['16-17', '25-59', '70-74', '85-89', '90-94', '95-99', '100+'].map((f) => { const x = v(ano, t, 'BR', f); return [f, { aptosMenosCompMenosAbst: x[0] - x[1] - x[2], tteSobreComp: pct(x[3], x[1]), facultSobreComp: pct(x[4], x[1]), obrigSobreComp: pct(x[5], x[1]), deficSobreComp: pct(x[6], x[1]) }]; })) };
}
for (const ano of [2018, 2022, 2026]) {
  const m = {}; for (const [par, n] of Object.entries(P.anos[ano].paresCodigoTexto)) { const [c, ds] = par.split('='); if (Number(c) >= 6000 || c === '-1' || Number(c) < 1800) m[c] = `${ds} (${n})`; }
  R.A.pares[ano] = m; R.A.geracao = { ...(R.A.geracao ?? {}), [ano]: P.anos[ano].geracao };
}

// ---------- B: coorte e escala logística
const tx = (ano, t, f) => { const x = v(ano, t, 'BR', f); return x[0] ? x[1] / x[0] : null; };
const ORD = ['60-64', '65-69', '70-74', '75-79', '80-84', '85-89', '90-94', '95-99', '100+'];
R.B = { coorte: {}, logit: {} };
for (let i = 0; i + 1 < ORD.length; i++) {
  const a = ORD[i]; const b = ORD[i + 1];
  R.B.coorte[`${a} → ${b}`] = { '2018→2022': r3(100 * (tx(2022, 1, b) - tx(2018, 1, a))), '2022→2026': r3(100 * (tx(2026, 1, b) - tx(2022, 1, a))),
    votantesMesmaGeracao2018a2022Pct: pct(v(2022, 1, 'BR', b)[1] - v(2018, 1, 'BR', a)[1], v(2018, 1, 'BR', a)[1]), votantesMesmaGeracao2022a2026Pct: pct(v(2026, 1, 'BR', b)[1] - v(2022, 1, 'BR', a)[1], v(2022, 1, 'BR', a)[1]) };
}
for (const f of ['25-59', ...ORD]) {
  R.B.logit[f] = { '2018→2022 (1º t.)': r3(logit(tx(2022, 1, f)) - logit(tx(2018, 1, f))), '2022→2026 (1º t.)': r3(logit(tx(2026, 1, f)) - logit(tx(2022, 1, f))),
    '2022 1º→2º t. (cadastro fixo)': r3(logit(tx(2022, 2, f)) - logit(tx(2022, 1, f))), '2018 1º→2º t.': r3(logit(tx(2018, 2, f)) - logit(tx(2018, 1, f))),
    razaoVotantes2022_2t_1t: r3(v(2022, 2, 'BR', f)[1] / v(2022, 1, 'BR', f)[1]), razaoVotantes2026_2022: r3(v(2026, 1, 'BR', f)[1] / v(2022, 1, 'BR', f)[1]) };
}

// ---------- C: Censo 2022
const UFCOD = { 11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO', 21: 'MA', 22: 'PI', 23: 'CE', 24: 'RN', 25: 'PB', 26: 'PE', 27: 'AL', 28: 'SE', 29: 'BA', 31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP', 41: 'PR', 42: 'SC', 43: 'RS', 50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF' };
const censo = JSON.parse(readFileSync(path.join(IBGE, 'censo2022-9514-br-uf-idade-simples.json'), 'utf8')).slice(1);
const cod = new Map(); // lugar → código → valor
for (const r of censo) { const l = r.NC === '1' ? 'BR' : UFCOD[Number(r.D1C)]; const m = cod.get(l) ?? cod.set(l, new Map()).get(l); m.set(Number(r.D5C), Number(r.V) || 0); }
// hipótese de código: 6618 = 65 anos ... 6652 = 99 anos; 6653 = 100+. Conferência pelos grupos de 5 anos do arquivo.
const idade = (l, a) => cod.get(l).get(a === 100 ? 6653 : 6618 + a - 65) ?? 0;
const faixaPop = (l, a0, a1) => { let s = 0; for (let a = a0; a <= a1; a++) s += idade(l, a); return s; };
R.C = { conferenciaCodigos: Object.fromEntries([[93096, 65, 69], [93097, 70, 74], [93098, 75, 79], [49108, 80, 84], [49109, 85, 89], [60040, 90, 94], [60041, 95, 99]].map(([c, a0, a1]) => [`${c} × ${a0}-${a1}`, { grupo: cod.get('BR').get(c), somaIdadesSimples: faixaPop('BR', a0, a1) }])), faixas: {} };
for (const [f, a0, a1] of [['70-74', 70, 74], ['75-79', 75, 79], ['80-84', 80, 84], ['85-89', 85, 89], ['90-94', 90, 94], ['95-99', 95, 99]]) {
  const p22 = faixaPop('BR', a0, a1); let teto = 0; for (let a = a0; a <= a1; a++) teto += idade('BR', a - 4);
  const v22 = v(2022, 1, 'BR', f)[1]; const v26 = v(2026, 1, 'BR', f)[1];
  R.C.faixas[f] = { pop2022: p22, votantes2022: v22, v22SobrePop22: pct(v22, p22), teto2026SemMortes: teto, votantes2026: v26, v26SobreTeto: pct(v26, teto), aptos2022: v(2022, 1, 'BR', f)[0], aptos2026: v(2026, 1, 'BR', f)[0], aptos22SobrePop22: pct(v(2022, 1, 'BR', f)[0], p22) };
}
{ const p100 = idade('BR', 100); R.C.faixas['100+'] = { pop2022: p100, votantes2022: v(2022, 1, 'BR', '100+')[1], v22SobrePop22: pct(v(2022, 1, 'BR', '100+')[1], p100), tetoAproximado2026_96mais: faixaPop('BR', 96, 99) + p100, votantes2026: v(2026, 1, 'BR', '100+')[1], aptos2022: v(2022, 1, 'BR', '100+')[0], aptos2026: v(2026, 1, 'BR', '100+')[0] }; }

// ---------- perfil do cadastro (jul/2026) por seção → zona, município, UF; conferência contra cadastro-secao.jsonl
const perfZ = new Map(); const IX = ['total', 'biometria', 'f70_79', 'f80_89', 'f90_99', 'f100', 'sembio_f70_79', 'sembio_f80_89', 'sembio_f90_99', 'sembio_f100'];
const perfS = new Map();
for (const f of readdirSync(PERF)) {
  const L = readFileSync(path.join(PERF, f), 'utf8').trimEnd().split('\n'); const ix = Object.fromEntries(L[0].split('\t').map((n, i) => [n, i]));
  for (const l of L.slice(1)) {
    const c = l.split('\t'); if (c[0] === 'zz') continue;
    const x = IX.map((n) => Number(c[ix[n]]));
    perfS.set(`${c[0]}/${c[1]}/${c[2]}/${c[3]}`, x);
    const k = `${c[0].toUpperCase()}|${c[1]}|${c[2]}`; const a = perfZ.get(k) ?? perfZ.set(k, IX.map(() => 0)).get(k); x.forEach((y, i) => { a[i] += y; });
  }
}
{ // conferência independente: total, biometria, 70–79 e 80+ do cadastro-secao.jsonl (outro agente, outra leitura do bruto)
  let n = 0; let dif = 0; let semPar = 0;
  for (const l of readFileSync(path.join(DIR_DADOS, 'parsed', 'auditoria', 'biometria', 'cadastro-secao.jsonl'), 'utf8').split('\n')) {
    if (!l) continue; const o = JSON.parse(l); if (o.k.startsWith('zz/')) continue; const x = perfS.get(o.k); if (!x) { semPar++; continue; } n++;
    const f80 = x[3] + x[4] + x[5];
    if (x[0] !== o.eleitores || x[1] !== o.biometria || x[2] !== (o.faixas['70a79'] ?? 0) || f80 !== (o.faixas['80mais'] ?? 0)) dif++;
  }
  R.perfilConferencia = { secoesComparadas: n, diferentes: dif, semParNoPerfil: semPar, secoesNoPerfil: perfS.size };
}
const ufDe = (k) => k.split('|')[0];
const aggZ = (ano, k, fs) => fs.reduce((s, f) => { const x = Z[ano][`${k}|${f}`]; return x ? [s[0] + x[0], s[1] + x[1]] : s; }, [0, 0]);
const zonasDe = (ano) => new Set(Object.keys(Z[ano]).map((k) => k.split('|').slice(0, 3).join('|')));
const z22 = zonasDe(2022); const z26 = zonasDe(2026);
const F8599 = ['85-89', '90-94', '95-99']; const F7079 = ['70-74', '75-79'];

// ---------- D: UF
function pearson(xs, w) { const W = w ? w.reduce((a, b) => a + b, 0) : xs.length; const ww = (i) => (w ? w[i] : 1); const mx = xs.reduce((s, p, i) => s + ww(i) * p[0], 0) / W; const my = xs.reduce((s, p, i) => s + ww(i) * p[1], 0) / W; let c = 0; let a = 0; let b = 0; xs.forEach((p, i) => { c += ww(i) * (p[0] - mx) * (p[1] - my); a += ww(i) * (p[0] - mx) ** 2; b += ww(i) * (p[1] - my) ** 2; }); return r3(c / Math.sqrt(a * b)); }
const rank = (a) => { const o = a.map((x, i) => [x, i]).sort((p, q) => p[0] - q[0]); const r = Array(a.length); o.forEach(([, i], j) => { r[i] = j; }); return r; };
const spearman = (xs) => { const rx = rank(xs.map((p) => p[0])); const ry = rank(xs.map((p) => p[1])); return pearson(rx.map((x, i) => [x, ry[i]])); };
const perfUf = new Map(); for (const [k, x] of perfZ) { const u = ufDe(k); const a = perfUf.get(u) ?? perfUf.set(u, IX.map(() => 0)).get(u); x.forEach((y, i) => { a[i] += y; }); }
const UFS = Object.values(UFCOD).sort();
const ufV = (ano, u, fs) => fs.reduce((s, f) => { const x = P.anos[ano].uf[`1|${u}|${f}`]; return x ? [s[0] + x[0], s[1] + x[1]] : s; }, [0, 0]);
const GR = { '25-59': ['25-59'], '60-64': ['60-64'], '65-69': ['65-69'], '70-74': ['70-74'], '75-79': ['75-79'], '80-84': ['80-84'], '85-99': F8599, '100+': ['100+'] };
R.D = { porUf: {}, correlacoes: {} };
for (const u of UFS) {
  const pf = perfUf.get(u); const o = { semBio90_99: pct(pf[8], pf[4]), semBio80_89: pct(pf[7], pf[3]) };
  for (const [g, fs] of Object.entries(GR)) { const a = ufV(2022, u, fs); const b = ufV(2026, u, fs); o[g] = { v22: a[1], v26: b[1], dVotPct: pct(b[1] - a[1], a[1]), dPontos: r3(100 * (b[1] / b[0] - a[1] / a[0])), dLogit: r3(logit(b[1] / b[0]) - logit(a[1] / a[0])) }; }
  const e8599 = Math.log(o['85-99'].v26 / o['85-99'].v22); const a = ufV(2022, u, F7079); const b = ufV(2026, u, F7079);
  o.excesso85_99sobre70_79 = r3(e8599 - Math.log(b[1] / a[1]));
  R.D.porUf[u] = o;
}
for (const g of [...Object.keys(GR), 'excesso']) {
  const xs = UFS.map((u) => [R.D.porUf[u].semBio90_99, g === 'excesso' ? R.D.porUf[u].excesso85_99sobre70_79 : R.D.porUf[u][g].dVotPct]);
  const w = UFS.map((u) => R.D.porUf[u]['85-99'].v22);
  const xl = g === 'excesso' ? null : UFS.map((u) => [R.D.porUf[u].semBio90_99, R.D.porUf[u][g].dLogit]);
  R.D.correlacoes[g] = { pearsonPonderadoV22_8599: pearson(xs, w), pearsonSemPeso: pearson(xs), spearman: spearman(xs), pearsonPonderadoNoLogitDaTaxa: xl ? pearson(xl, w) : null };
}
// região: Nordeste+Norte × resto, para ver se a correlação é geografia
const NNE = new Set(['AC', 'AM', 'AP', 'PA', 'RO', 'RR', 'TO', 'AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE']);
R.D.dentroDeRegiao = Object.fromEntries([['Norte+Nordeste', (u) => NNE.has(u)], ['Sul+Sudeste+Centro-Oeste', (u) => !NNE.has(u)]].map(([n, fn]) => { const us = UFS.filter(fn); const c = (g) => pearson(us.map((u) => [R.D.porUf[u].semBio90_99, g === 'excesso' ? R.D.porUf[u].excesso85_99sobre70_79 : R.D.porUf[u][g].dVotPct]), us.map((u) => R.D.porUf[u]['85-99'].v22)); return [n, { ufs: us.length, r8599: c('85-99'), r7074: c('70-74'), r2559: c('25-59'), rExcesso: c('excesso') }]; }));

// ---------- E: municípios
const munZ = new Map(); // UF|mun → {perf, zonas22:Set, zonas26:Set}
for (const k of new Set([...z22, ...z26, ...perfZ.keys()])) { const [u, m] = k.split('|'); const mk = `${u}|${m}`; const o = munZ.get(mk) ?? munZ.set(mk, { perf: IX.map(() => 0), zs: [] }).get(mk); o.zs.push(k); const pf = perfZ.get(k); if (pf) pf.forEach((y, i) => { o.perf[i] += y; }); }
const munL = [];
for (const [mk, o] of munZ) {
  const s = (ano, fs) => o.zs.reduce((t, k) => { const x = aggZ(ano, k, fs); return [t[0] + x[0], t[1] + x[1]]; }, [0, 0]);
  if (!o.perf[4]) continue;
  munL.push({ mk, sb: o.perf[8] / o.perf[4], a: s(2022, F8599)[1], b: s(2026, F8599)[1], c: s(2022, ['70-74'])[1], d: s(2026, ['70-74'])[1], e: s(2022, F7079)[1], f: s(2026, F7079)[1], g: s(2022, ['25-59'])[1], h: s(2026, ['25-59'])[1] });
}
munL.sort((x, y) => x.sb - y.sb);
R.E = { municipiosComPerfil90_99: munL.length, quintos: [0, 1, 2, 3, 4].map((q) => { const a = munL.slice(Math.floor(q * munL.length / 5), Math.floor((q + 1) * munL.length / 5)); const S = (k) => a.reduce((t, x) => t + x[k], 0); return { municipios: a.length, semBioDe: pct(a[0].sb, 1), semBioAte: pct(a.at(-1).sb, 1), v8599: `${S('a')} → ${S('b')}`, d8599Pct: pct(S('b') - S('a'), S('a')), d7074Pct: pct(S('d') - S('c'), S('c')), d7079Pct: pct(S('f') - S('e'), S('e')), d2559Pct: pct(S('h') - S('g'), S('g')), excesso: r3(Math.log(S('b') / S('a')) - Math.log(S('f') / S('e'))) }; }) };

// ---------- F: zonas
const { db, fonte } = await abrirLeitura();
const bu = new Map(); // UF|mun|zona → [comp, sem_bio, por_bio, por_biografia, pelo_mesario]
for (const r of db.prepare(`SELECT s.uf, s.municipio, s.zona, sum(s.comparecimento) c, sum(s.sem_biometria) sb, sum(s.por_biometria) pb, sum(s.por_biografia) pg, sum(p.habilitados_pelo_mesario) hm
  FROM secao s LEFT JOIN perfil_log p ON p.turno = s.turno AND p.uf = s.uf AND p.municipio = s.municipio AND p.zona = s.zona AND p.secao = s.secao AND p.hash = s.hash
  WHERE s.turno = 1 AND s.situacao = 'completa' AND s.uf <> 'zz' GROUP BY 1, 2, 3`).iterate()) bu.set(`${r.uf.toUpperCase()}|${r.municipio}|${r.zona}`, [r.c, r.sb ?? 0, r.pb ?? 0, r.pg ?? 0, r.hm ?? 0]);
db.close();
let pares = 0; let p22 = 0; let p26 = 0;
const lim = { '80-89': [0, 0], '90-99': [0, 0], '80-99 junto': [0, 0], '80-84 com 80-89 do perfil (só 80-84 do PCA)': [0, 0] };
const alin = { '70-79': [0, 0, 0], '80-89': [0, 0, 0], '90-99': [0, 0, 0], '100+': [0, 0, 0] }; // [zonas iguais, zonas diferentes, soma |dif|]
let limMaiorQueBU = 0; let zonasSemPerfil = 0; let zonasSemBu = 0;
const bins = new Map();
for (const k of z26) {
  const v26 = aggZ(2026, k, F8599)[1];
  if (z22.has(k)) { pares++; p22 += aggZ(2022, k, F8599)[1]; p26 += v26; }
  const pf = perfZ.get(k); if (!pf) { zonasSemPerfil++; continue; }
  // alinhamento das faixas: aptos do comparecimento (data da eleição) × aptos do perfil (jul/2026)
  for (const [f, fs, i] of [['70-79', F7079, 2], ['80-89', ['80-84', '85-89'], 3], ['90-99', ['90-94', '95-99'], 4], ['100+', ['100+'], 5]]) { const a = aggZ(2026, k, fs)[0]; const d = a - pf[i]; if (d === 0) alin[f][0]++; else alin[f][1]++; alin[f][2] += Math.abs(d); }
  const v8089 = aggZ(2026, k, ['80-84', '85-89'])[1]; const v9099 = aggZ(2026, k, ['90-94', '95-99'])[1];
  const c8089 = pf[3] - pf[7]; const c9099 = pf[4] - pf[8];
  const m1 = Math.max(0, v8089 - c8089); const m2 = Math.max(0, v9099 - c9099); const m3 = Math.max(0, v8089 + v9099 - c8089 - c9099);
  if (m1) { lim['80-89'][0] += m1; lim['80-89'][1]++; } if (m2) { lim['90-99'][0] += m2; lim['90-99'][1]++; } if (m3) { lim['80-99 junto'][0] += m3; lim['80-99 junto'][1]++; }
  const b = bu.get(k); if (!b) zonasSemBu++; else if (m1 + m2 > b[1]) limMaiorQueBU++;
  const sb = pf[4] ? pf[8] / pf[4] : null; if (sb === null) continue;
  const bin = sb < 0.1 ? '0-10%' : sb < 0.3 ? '10-30%' : sb < 0.5 ? '30-50%' : sb < 0.7 ? '50-70%' : sb < 0.9 ? '70-90%' : '90-100%';
  const o = bins.get(bin) ?? bins.set(bin, { zonas: 0, a26: 0, v26: 0, a22: 0, v22: 0, a7026: 0, v7026: 0, a7022: 0, v7022: 0 }).get(bin);
  if (!z22.has(k)) continue;
  o.zonas++; const x = aggZ(2026, k, ['90-94', '95-99']); const y = aggZ(2022, k, ['90-94', '95-99']); const x7 = aggZ(2026, k, ['70-74']); const y7 = aggZ(2022, k, ['70-74']);
  o.a26 += x[0]; o.v26 += x[1]; o.a22 += y[0]; o.v22 += y[1]; o.a7026 += x7[0]; o.v7026 += x7[1]; o.a7022 += y7[0]; o.v7022 += y7[1];
}
R.F = { fonteBanco: fonte, zonas2022: z22.size, zonas2026: z26.size, mesmaChave: pares, votantes85_99: `${p22} → ${p26}`, deltaPct: pct(p26 - p22, p22), zonasSemPerfil, zonasSemBu,
  limiteInferiorSemBiometria: lim, zonasEmQueOLimite80_99PassaDoSemBiometriaDoBU: limMaiorQueBU, alinhamentoFaixasPcaXPerfil: alin,
  bins90_99: Object.fromEntries([...bins.entries()].sort().map(([b, o]) => [b, { zonasPar: o.zonas, taxa90_99_2022: pct(o.v22, o.a22), taxa90_99_2026: pct(o.v26, o.a26), razao: r3((o.v26 / o.a26) / (o.v22 / o.a22)), taxa70_74_2022: pct(o.v7022, o.a7022), taxa70_74_2026: pct(o.v7026, o.a7026), razao70_74: r3((o.v7026 / o.a7026) / (o.v7022 / o.a7022)) }])) };

// ---------- G: regressão ecológica por zona, efeito fixo de UF (Frisch–Waugh: centra por UF), MQO sem peso
function mqo(linhas, nx) {
  const g = new Map(); for (const l of linhas) { const a = g.get(l.u) ?? g.set(l.u, []).get(l.u); a.push(l); }
  const XtX = Array.from({ length: nx }, () => Array(nx).fill(0)); const Xty = Array(nx).fill(0);
  for (const a of g.values()) {
    const mx = Array(nx).fill(0); let my = 0; for (const l of a) { l.x.forEach((x, i) => { mx[i] += x / a.length; }); my += l.y / a.length; }
    for (const l of a) { const d = l.x.map((x, i) => x - mx[i]); const dy = l.y - my; for (let i = 0; i < nx; i++) { Xty[i] += d[i] * dy; for (let j = 0; j < nx; j++) XtX[i][j] += d[i] * d[j]; } }
  }
  const M = XtX.map((r, i) => [...r, Xty[i]]); // Gauss
  for (let i = 0; i < nx; i++) { let p = i; for (let r = i + 1; r < nx; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r; [M[i], M[p]] = [M[p], M[i]]; for (let r = 0; r < nx; r++) if (r !== i) { const f = M[r][i] / M[i][i]; for (let c = i; c <= nx; c++) M[r][c] -= f * M[i][c]; } }
  return M.map((r, i) => r3(r[nx] / r[i]));
}
const GV = [['16-24', ['16-17', '18-24']], ['25-59', ['25-59']], ['60-69', ['60-64', '65-69']], ['70-79', F7079], ['80-89', ['80-84', '85-89']], ['90+', ['90-94', '95-99', '100+']]];
const linhasG = []; const linhasD = [];
for (const k of z26) {
  const b = bu.get(k); const pf = perfZ.get(k); if (!b || !pf) continue;
  const x = GV.map(([, fs]) => aggZ(2026, k, fs)[1]);
  linhasG.push({ u: ufDe(k), x, y: b[3], y2: b[1], y3: b[1] + b[3] });
  if (z22.has(k)) {
    const e22 = aggZ(2022, k, ['80-84', '85-89', '90-94', '95-99'])[1]; const e26 = aggZ(2026, k, ['80-84', '85-89', '90-94', '95-99'])[1];
    linhasD.push({ u: ufDe(k), x: [...GV.slice(0, 4).map(([, fs]) => aggZ(2026, k, fs)[1]), e22, e26 - e22, pf[7] + pf[8] + pf[9]], y: b[3] });
  }
}
R.G = { zonas: linhasG.length, nota: 'coeficiente = fração de cada faixa de votantes habilitada desse jeito (estimativa ecológica, efeito fixo de UF)', faixas: GV.map(([n]) => n),
  liberacaoManualComBiometriaCadastrada: mqo(linhasG, GV.length), semBiometriaCadastrada: mqo(linhasG.map((l) => ({ ...l, y: l.y2 })), GV.length), semDigitalTotal: mqo(linhasG.map((l) => ({ ...l, y: l.y3 })), GV.length),
  totaisBU1t: linhasG.reduce((s, l) => [s[0] + l.y, s[1] + l.y2], [0, 0]),
  comDelta: { zonas: linhasD.length, variaveis: ['16-24', '25-59', '60-69', '70-79', 'votantes 80+ em 2022', 'aumento dos votantes 80+ (2026 − 2022)', 'aptos 80+ sem biometria (perfil)'], liberacaoManual: mqo(linhasD, 7) } };

await writeFile(path.join(SAIDA, 'analise.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
