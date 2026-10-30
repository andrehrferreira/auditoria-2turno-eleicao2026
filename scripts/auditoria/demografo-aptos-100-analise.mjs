// Demógrafo (H01, doc 10): por que os aptos de 100+ passaram de 39.026 (2018) para 184.330 (2022) e os de 95–99 de
// 272.334 para 466.703? Em agregado e sem CPF. Lê a série gerada por demografo-aptos-100-serie.mjs e confronta com:
//   - Censo 2010 (IBGE, tabela 1378, idade simples 60–99 e 100+, Brasil, UF e município 85–99 e 100+);
//   - Censo 2022 (IBGE, tabela 9514, idade simples 65–99 e 100+ por Brasil/UF; grupos de 5 anos por município);
//   - óbitos do Registro Civil (IBGE, tabela 2654, média 2023–2024), para a mortalidade por grupo de idade;
//   - perfil do eleitorado por seção de 2026 (TSE, jul/2026), somado por município: aptos 90–99 e 100+ com e sem biometria.
// Testes: (1) série e "degrau" por idade; (2) régua do arquivo (zona a zona contra o eleitorado oficial; 1º = 2º turno;
// 16–17 anos presentes); (3) população possível (teto sem mortes e estimativa) por ano; (4) fluxo das coortes do
// cadastro (títulos que saem × mortes esperadas); (5) UF e município, com a biometria de 2026.
// Pré-requisitos: demografo-aptos-100-serie.mjs, demografo-aptos-100-baixar-censo2010.mjs, demografo-baixar-ibge.mjs,
// demografo-perfil.mjs (perfil por seção) e demografo-85-99-salto.mjs (série 65–79 de 2022, só para a tabela de razões).
// Uso: node scripts/auditoria/demografo-aptos-100-analise.mjs
// Saídas: data/parsed/auditoria/demografo/aptos100-{resumo.json,uf.tsv,municipios.tsv}
import { readFileSync, readdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

const OUT = path.join(DIR_DADOS, 'parsed', 'auditoria', 'demografo');
const IBGE = path.join(DIR_DADOS, 'raw', 'externos', 'ibge');
const ler = (f) => JSON.parse(readFileSync(f, 'utf8'));
const pct = (a, b) => (b ? +(100 * a / b).toFixed(2) : null);
const r3 = (x) => (x === null || x === undefined || Number.isNaN(x) ? null : +Number(x).toFixed(3));
const p5 = (x) => String(Number(x)).padStart(5, '0');
const ANOS = [2014, 2018, 2022, 2026];
const FX = ['80-84', '85-89', '90-94', '95-99', '100+'];
const FAIXA_IDADES = { '80-84': [80, 84], '85-89': [85, 89], '90-94': [90, 94], '95-99': [95, 99], '100+': [100, 100] };
const UFCOD = { 11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO', 21: 'MA', 22: 'PI', 23: 'CE', 24: 'RN', 25: 'PB', 26: 'PE', 27: 'AL', 28: 'SE', 29: 'BA', 31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP', 41: 'PR', 42: 'SC', 43: 'RS', 50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF' };
const UFS = Object.values(UFCOD).sort();

const B = ler(path.join(OUT, 'aptos100-base.json'));
const R = { fontes: B.fontes, conferenciaZonas: B.conferenciaZonas };
const ap = (ano, f, uf) => ((uf ? B.uf[ano][uf] : B.brasil[ano])?.[f] ?? 0);

// ---------- (1) série Brasil e régua do arquivo
R.serieBrasil = Object.fromEntries([...FX, 'invalida', '16-17', 'total'].map((f) => [f, Object.fromEntries(ANOS.map((a) => [a, ap(a, f)]))]));
R.primeiroIgualSegundoTurno = Object.fromEntries([2014, 2018, 2022].map((a) => [a, [...FX, 'total'].every((f) => B.brasil[a][f] === B.brasil2t[a][f])]));
R.degrau = Object.fromEntries(ANOS.map((a) => [a, { r95_99_sobre_90_94: r3(ap(a, '95-99') / ap(a, '90-94')), r100_sobre_95_99: r3(ap(a, '100+') / ap(a, '95-99')) }]));

// ---------- (3) população: Censo 2010 e 2022 por idade simples (Brasil e UF), mortalidade do Registro Civil
const P10 = new Map(); const P22 = new Map(); // lugar → Map(idade → pessoas); 100 = 100 anos ou mais
const idade = (c) => (c >= 6613 && c <= 6652 ? c - 6613 + 60 : c === 6653 ? 100 : null);
for (const r of ler(path.join(IBGE, 'censo2010-1378-br-uf-idade-simples.json')).slice(1)) {
  const a = idade(Number(r.D6C)); if (a === null) continue;
  const lugar = r.NC === '1' ? 'BR' : UFCOD[Number(r.D1C)];
  (P10.get(lugar) ?? P10.set(lugar, new Map()).get(lugar)).set(a, Number(r.V) || 0);
}
for (const r of ler(path.join(IBGE, 'censo2022-9514-br-uf-idade-simples.json')).slice(1)) {
  const a = idade(Number(r.D5C)); if (a === null) continue;
  const lugar = r.NC === '1' ? 'BR' : UFCOD[Number(r.D1C)];
  (P22.get(lugar) ?? P22.set(lugar, new Map()).get(lugar)).set(a, Number(r.V) || 0);
}
const p10 = (l, a) => P10.get(l)?.get(Math.min(a, 100)) ?? 0;
const p22 = (l, a) => P22.get(l)?.get(Math.min(a, 100)) ?? 0;
// mortalidade anual por grupo (Brasil), óbitos médios 2023–2024 ÷ Censo 2022 (a mesma conta do doc 09)
const obitos = new Map();
for (const f of ['obitos-2654-2023.json', 'obitos-2654-2024.json']) for (const r of ler(path.join(IBGE, f)).slice(1)) obitos.set(r.D7C, (obitos.get(r.D7C) ?? 0) + (Number(r.V) || 0) / 2);
const q = (c) => obitos.get(c) ?? 0;
const somaP22 = (a0, a1) => { let s = 0; for (let a = a0; a <= a1; a++) s += p22('BR', a); return s; };
const MORT = {
  '80-84': q('5979') / somaP22(80, 84), '85-89': (q('5980') - q('106182') - q('106183') - q('5996')) / somaP22(85, 89),
  '90-94': q('106182') / somaP22(90, 94), '95-99': q('106183') / somaP22(95, 99), '100+': q('5996') / p22('BR', 100),
};
const mIdade = (a) => Math.min(0.9, a < 85 ? MORT['80-84'] : a < 90 ? MORT['85-89'] : a < 95 ? MORT['90-94'] : a < 100 ? MORT['95-99'] : MORT['100+']);
R.mortalidadeAnualRegistroCivil = Object.fromEntries(Object.entries(MORT).map(([k, v]) => [k, +(100 * v).toFixed(2)]));
const sobrev = (x, anos, f) => { let s = 1; for (let j = 0; j < anos; j++) s *= 1 - Math.min(0.95, f * mIdade(x + j)); return s; };
// fator f por lugar: a coorte de 88+ de 2010, com mortalidade f × Registro Civil, tem de dar o 100+ do Censo 2022
function calibra(l) {
  const alvo = p22(l, 100); let lo = 0.05; let hi = 5;
  const proj = (f) => { let s = 0; for (let x = 88; x <= 100; x++) s += p10(l, x) * sobrev(x, 12, f); return s; };
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (proj(mid) > alvo) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
const FATOR = new Map([['BR', calibra('BR')], ...UFS.map((u) => [u, calibra(u)])]);
// população estimada de idade a (100 = 100+) em Y; e teto (sem mortes) a partir de 2010 e de 2022
function popEst(l, Y, a) {
  if (Y === 2022) return p22(l, a);
  if (Y > 2022) { // a partir do Censo 2022 com a mortalidade do Registro Civil (método do doc 09)
    const k = Y - 2022; const xs = a < 100 ? [a - k] : Array.from({ length: k + 1 }, (_, i) => 100 - k + i);
    return xs.reduce((s, x) => s + p22(l, x) * sobrev(x, k, 1), 0);
  }
  const k = Y - 2010; const f = FATOR.get(l);
  const xs = a < 100 ? [a - k] : Array.from({ length: k + 1 }, (_, i) => 100 - k + i);
  return xs.reduce((s, x) => {
    if (x + 12 <= 99) { const v0 = p10(l, x); const v1 = p22(l, x + 12); return s + (v0 ? v0 * (v1 / v0) ** (k / 12) : 0); }
    return s + p10(l, x) * sobrev(x, k, f);
  }, 0);
}
// Teto sem mortes, janela ESTRITA (parecer cético 44): o Censo conta a idade em 31/07 e a eleição é em outubro, então
// quem tem a anos na data de referência da idade (qualquer data de agosto a dezembro do ano Y) tinha a−k ou a−k−1 no Censo.
// Faixa [a0, a1] em Y ← idades [a0−k−1, a1−k] no Censo; 100+ ← (99−k)+. Ninguém morre e ninguém migra.
const tetoFaixa = (l, Y, f, base) => {
  const k = Y - base; const P = base === 2010 ? p10 : p22; const [a0, a1] = FAIXA_IDADES[f];
  const fim = a1 === 100 ? 100 : a1 - k; let s = 0; for (let x = a0 - k - 1; x <= fim; x++) s += P(l, x); return s;
};
const somaF = (fn, f) => { const [a0, a1] = FAIXA_IDADES[f]; let s = 0; for (let a = a0; a <= a1; a++) s += fn(a); return s; };

R.fatorMortalidade = Object.fromEntries([...FATOR].map(([k, v]) => [k, +v.toFixed(3)]));
{ // validação do modelo: coorte 83–87 de 2010 → 95–99 em 2022, contra o Censo 2022 (o fator foi calibrado só no 100+)
  const f = FATOR.get('BR'); let m = 0; for (let x = 83; x <= 87; x++) m += p10('BR', x) * sobrev(x, 12, f);
  R.validacaoModelo = { coorte83_87_2010_para_95_99_2022_modelo: Math.round(m), censo2022_95_99: somaP22(95, 99), geometrico: 'exato por construção para coortes que ainda têm idade simples em 2022' };
}
const POP = (l) => Object.fromEntries(ANOS.map((Y) => [Y, Object.fromEntries(FX.map((f) => {
  const est = Math.round(somaF((a) => popEst(l, Y, a), f));
  const t10 = tetoFaixa(l, Y, f, 2010);
  const t22 = Y > 2022 ? tetoFaixa(l, Y, f, 2022) : Y === 2022 && f === '100+' ? p22(l, 99) + p22(l, 100) : null; // 2022: mesmo ano, 99 e 100+
  return [f, { aptos: ap(Y, f, l === 'BR' ? null : l), populacaoEstimada: est, tetoSemMortesCenso2010: t10, tetoSemMortesCenso2022: t22 }];
}))]));
R.populacaoBrasil = POP('BR');
for (const Y of ANOS) for (const f of FX) {
  const o = R.populacaoBrasil[Y][f];
  Object.assign(o, { aptosSobrePop: r3(o.aptos / o.populacaoEstimada), excessoSobreEstimativa: o.aptos - o.populacaoEstimada, excessoSobreTeto2010: o.aptos - o.tetoSemMortesCenso2010, excessoSobreTeto2022: o.tetoSemMortesCenso2022 === null ? null : o.aptos - o.tetoSemMortesCenso2022 });
}
// razão aptos ÷ população do Censo 2022 por faixa (2022), 65+ (as faixas 65–79 vêm da série do doc 09)
{
  const s = ler(path.join(OUT, 'salto-85-99-resumo.json')).serie;
  R.razaoAptosPopCenso2022 = Object.fromEntries([['65-69', 65, 69], ['70-74', 70, 74], ['75-79', 75, 79], ['80-84', 80, 84], ['85-89', 85, 89], ['90-94', 90, 94], ['95-99', 95, 99], ['100+', 100, 100]].map(([f, a0, a1]) => {
    const aptos = s[f]['2022-1t'].aptos; const pop = somaP22(a0, a1); return [f, { aptos, censo2022: pop, razao: r3(aptos / pop), excesso: aptos - pop }];
  }));
}

// ---------- (4) fluxo das coortes do cadastro: títulos que saem × mortes esperadas
// coorte com N anos ou mais em Y tem N+4 ou mais em Y+4. N = 86, 91, 96: em Y+4 o corte cai na fronteira da faixa (90, 95, 100).
// Em Y, uma faixa é partida (85–89 sem os de 85 etc.): parcela da idade de entrada pela forma da população estimada ou uniforme (1/5).
function coorte(l, Y, N, modo) {
  const uf = l === 'BR' ? null : l; const fIni = { 86: '85-89', 91: '90-94', 96: '95-99' }[N];
  const acima = { 86: ['90-94', '95-99', '100+'], 91: ['95-99', '100+'], 96: ['100+'] }[N];
  const a0 = N - 1; const popFaixa = somaF((a) => popEst(l, Y, a), fIni);
  const parcelaEntrada = modo === 'uniforme' ? 0.2 : popEst(l, Y, a0) / popFaixa;
  const regY = ap(Y, fIni, uf) * (1 - parcelaEntrada) + acima.reduce((s, f) => s + ap(Y, f, uf), 0);
  const fim = { 86: ['90-94', '95-99', '100+'], 91: ['95-99', '100+'], 96: ['100+'] }[N];
  const regY4 = fim.reduce((s, f) => s + ap(Y + 4, f, uf), 0);
  let popY = popFaixa - popEst(l, Y, a0); for (const f of acima) popY += somaF((a) => popEst(l, Y, a), f);
  let popY4 = 0; for (const f of fim) popY4 += somaF((a) => popEst(l, Y + 4, a), f);
  const saidas = regY - regY4; const mortes = popY - popY4;
  return { titulosInicio: Math.round(regY), titulosFim: regY4, titulosQueSairam: Math.round(saidas), populacaoInicio: Math.round(popY), populacaoFim: Math.round(popY4), mortesEsperadas: Math.round(mortes), retencaoCadastro: r3(regY4 / regY), sobrevivenciaPopulacao: r3(popY4 / popY), saidasSobreMortes: r3(saidas / mortes), titulosNaoBaixados: Math.round(mortes - saidas),
    // se cada morte do período tivesse sido baixada e nenhum outro título saísse; excesso do início = títulos − população estimada
    titulosFimSeSoAsMortesSaissem: Math.round(regY - mortes), excessoInicio: Math.round(regY - popY), excessoFim: Math.round(regY4 - popY4) };
}
R.fluxoCoortesBrasil = {};
for (const Y of [2014, 2018, 2022]) for (const N of [86, 91, 96]) for (const modo of ['populacao', 'uniforme']) {
  (R.fluxoCoortesBrasil[`${Y}->${Y + 4}`] ??= {})[`${N}+ (${modo})`] = coorte('BR', Y, N, modo);
}
// sensibilidade da decomposição de 2018 → 2022 à mortalidade (parecer cético 44): vivos da geração em 2018 =
// (Censo 2022 de 100+ mais de 0 a 1/6 dos de 99 anos) ÷ (1 − q)^4; títulos da geração em 2018 = 100+ mais de 67% a 85%
// dos 95–99 (a idade de 95 anos com 15% a 33% da faixa). Estoque em 2018 = títulos − vivos; mortes não baixadas
// (líquido) = 100+ de 2022 − (títulos de 2018 − mortes), mortes = vivos 2018 − vivos 2022.
{
  const t2018 = [ap(2018, '100+') + 0.67 * ap(2018, '95-99'), ap(2018, '100+') + 0.85 * ap(2018, '95-99')];
  const viv22 = [p22('BR', 100), p22('BR', 100) + p22('BR', 99) / 6]; const fim = ap(2022, '100+');
  R.sensibilidadeDecomposicao2018_2022 = { titulosDaGeracao2018: t2018.map(Math.round), aptos100_2022: fim, porMortalidadeAnual: Object.fromEntries([0.20, 0.25, 0.28, 0.30, 0.35].map((qq) => {
    const s4 = (1 - qq) ** 4; const viv18 = viv22.map((v) => v / s4);
    const est = [t2018[0] - viv18[1], t2018[1] - viv18[0]];
    const naoBaixadas = [fim - (t2018[1] - (viv18[0] - viv22[0])), fim - (t2018[0] - (viv18[1] - viv22[1]))];
    return [`${Math.round(qq * 100)}%`, { vivos2018: viv18.map(Math.round), estoque2018: est.map(Math.round), mortesNaoBaixadas: naoBaixadas.map(Math.round), fimSeSoAsMortesSaissem: [Math.round(t2018[0] - (viv18[1] - viv22[1])), Math.round(t2018[1] - (viv18[0] - viv22[0]))] }];
  })) };
}
// teste sem Censo (parecer cético 44): a faixa que recebe o estoque ganha títulos e quase nenhum votante (série do doc 09)
{
  const s = ler(path.join(OUT, 'salto-85-99-resumo.json')).serie;
  R.titulosXVotantes = Object.fromEntries(['95-99', '100+'].map((f) => [f, Object.fromEntries(ANOS.map((a) => [a, { aptos: s[f][`${a}-1t`].aptos, votantes: s[f][`${a}-1t`].votantes, taxa: s[f][`${a}-1t`].taxa }]))]));
  const d = (f, a, b) => ({ titulos: s[f][`${b}-1t`].aptos - s[f][`${a}-1t`].aptos, votantes: s[f][`${b}-1t`].votantes - s[f][`${a}-1t`].votantes });
  R.titulosXVotantes.variacoes = { '95-99 2014->2018': d('95-99', 2014, 2018), '100+ 2018->2022': d('100+', 2018, 2022), '100+ 2022->2026': d('100+', 2022, 2026) };
}

// ---------- (5) UF: série, população, biometria de 2026 (perfil por seção somado), degrau
const perfMun = new Map(); const perfUf = new Map();
for (const f of readdirSync(path.join(OUT, 'perfil'))) {
  const L = readFileSync(path.join(OUT, 'perfil', f), 'utf8').trimEnd().split('\n'); const ix = Object.fromEntries(L[0].split('\t').map((n, i) => [n, i]));
  for (const l of L.slice(1)) {
    const c = l.split('\t'); if (c[0] === 'zz') continue;
    const v = ['f90_99', 'sembio_f90_99', 'f100', 'sembio_f100', 'f70_79', 'sembio_f70_79'].map((n) => Number(c[ix[n]]));
    for (const [m, k] of [[perfMun, `${c[0].toUpperCase()}|${c[1]}`], [perfUf, c[0].toUpperCase()]]) { const a = m.get(k) ?? m.set(k, [0, 0, 0, 0, 0, 0]).get(k); v.forEach((x, i) => { a[i] += x; }); }
  }
}
const sb90 = (pf) => (pf && pf[0] + pf[2] ? (pf[1] + pf[3]) / (pf[0] + pf[2]) : null); // sem biometria entre os aptos de 90+ (2026)
R.uf = {};
const ufTsv = ['uf\taptos95_99_2014\taptos95_99_2018\taptos95_99_2022\taptos95_99_2026\taptos100_2014\taptos100_2018\taptos100_2022\taptos100_2026\tdelta100_2018_2022\tpop100_censo2022\tpop95_99_censo2022\trazao100_2022\trazao95_99_2022\tdegrau95_2014\tdegrau100_2018\tdegrau_pop95\tdegrau_pop100\tsembio90mais_2026_pct\tsembio100_2026_pct\tsaidas_sobre_mortes_96_2014\tsaidas_sobre_mortes_96_2018\tsaidas_sobre_mortes_96_2022\tsaidas_sobre_mortes_86_2018'];
const deltaUf = [];
for (const u of UFS) {
  const pf = perfUf.get(u); const P = POP(u);
  const o = {
    aptos95_99: Object.fromEntries(ANOS.map((a) => [a, ap(a, '95-99', u)])), aptos100: Object.fromEntries(ANOS.map((a) => [a, ap(a, '100+', u)])),
    pop100Censo2022: p22(u, 100), pop95_99Censo2022: somaF((a) => p22(u, a), '95-99'),
    degrau95_2014: r3(ap(2014, '95-99', u) / ap(2014, '90-94', u)), degrau100_2018: r3(ap(2018, '100+', u) / ap(2018, '95-99', u)),
    degrauPop95_2014: r3(P[2014]['95-99'].populacaoEstimada / P[2014]['90-94'].populacaoEstimada), degrauPop100_2018: r3(P[2018]['100+'].populacaoEstimada / P[2018]['95-99'].populacaoEstimada),
    semBio90mais2026: pct(pf[1] + pf[3], pf[0] + pf[2]), semBio100_2026: pct(pf[3], pf[2]),
    saidasSobreMortes96: Object.fromEntries([2014, 2018, 2022].map((Y) => [Y, coorte(u, Y, 96, 'populacao').saidasSobreMortes])),
    saidasSobreMortes86_2018: coorte(u, 2018, 86, 'populacao').saidasSobreMortes,
    saidasSobreMortes86: Object.fromEntries([2014, 2018, 2022].map((Y) => [Y, coorte(u, Y, 86, 'populacao').saidasSobreMortes])),
    populacao: P,
  };
  o.razao100_2022 = r3(o.aptos100[2022] / o.pop100Censo2022); o.razao95_99_2022 = r3(o.aptos95_99[2022] / o.pop95_99Censo2022);
  o.delta100_2018_2022 = o.aptos100[2022] - o.aptos100[2018];
  R.uf[u] = o; deltaUf.push([u, o.delta100_2018_2022]);
  ufTsv.push([u, ...ANOS.map((a) => o.aptos95_99[a]), ...ANOS.map((a) => o.aptos100[a]), o.delta100_2018_2022, o.pop100Censo2022, o.pop95_99Censo2022, o.razao100_2022, o.razao95_99_2022, o.degrau95_2014, o.degrau100_2018, o.degrauPop95_2014, o.degrauPop100_2018, o.semBio90mais2026, o.semBio100_2026, o.saidasSobreMortes96[2014], o.saidasSobreMortes96[2018], o.saidasSobreMortes96[2022], o.saidasSobreMortes86_2018].join('\t'));
}
// grupos de UF definidos só pelos dados: (A) sem excesso de 100+ em 2022 (aptos < Censo 2022); (B) com excesso em 2022 e
// queda dos 100+ de 2022 para 2026 (limpeza no período); (C) com excesso em 2022 e alta em 2026
{
  const grupoDe = (o) => (o.razao100_2022 < 1 ? 'A' : o.aptos100[2026] < o.aptos100[2022] ? 'B' : 'C');
  R.ufGrupos = {};
  for (const u of UFS) {
    const o = R.uf[u]; const g = (R.ufGrupos[grupoDe(o)] ??= { ufs: [], aptos95_99: { 2014: 0, 2018: 0, 2022: 0, 2026: 0 }, aptos100: { 2014: 0, 2018: 0, 2022: 0, 2026: 0 }, pop100Censo2022: 0, pop95_99Censo2022: 0, aptos90mais2026: 0, semBio90mais2026: 0, saidas86: { 2014: 0, 2018: 0, 2022: 0 }, mortes86: { 2014: 0, 2018: 0, 2022: 0 } });
    g.ufs.push(u); for (const a of ANOS) { g.aptos95_99[a] += o.aptos95_99[a]; g.aptos100[a] += o.aptos100[a]; }
    g.pop100Censo2022 += o.pop100Censo2022; g.pop95_99Censo2022 += o.pop95_99Censo2022;
    const pf = perfUf.get(u); g.aptos90mais2026 += pf[0] + pf[2]; g.semBio90mais2026 += pf[1] + pf[3];
    for (const Y of [2014, 2018, 2022]) { const c = coorte(u, Y, 86, 'populacao'); g.saidas86[Y] += c.titulosQueSairam; g.mortes86[Y] += c.mortesEsperadas; }
  }
  for (const g of Object.values(R.ufGrupos)) {
    g.delta100_2018_2022 = g.aptos100[2022] - g.aptos100[2018]; g.parcelaDoDelta = null;
    g.razao100_2022 = r3(g.aptos100[2022] / g.pop100Censo2022); g.razao95_99_2022 = r3(g.aptos95_99[2022] / g.pop95_99Censo2022);
    g.semBio90mais2026Pct = pct(g.semBio90mais2026, g.aptos90mais2026);
    g.saidasSobreMortes86 = Object.fromEntries([2014, 2018, 2022].map((Y) => [`${Y}->${Y + 4}`, r3(g.saidas86[Y] / g.mortes86[Y])]));
  }
  const tot = Object.values(R.ufGrupos).reduce((s, g) => s + g.delta100_2018_2022, 0);
  for (const g of Object.values(R.ufGrupos)) g.parcelaDoDelta = pct(g.delta100_2018_2022, tot);
}
deltaUf.sort((a, b) => b[1] - a[1]);
const totDeltaUf = deltaUf.reduce((s, x) => s + x[1], 0);
R.ufConcentracaoDelta100_2018_2022 = { total: totDeltaUf, maiores: deltaUf.slice(0, 8).map(([u, d]) => ({ uf: u, delta: d, parcela: pct(d, totDeltaUf) })) };
// correlação entre UFs (ponderada pelos aptos de 90+ de 2022): sem biometria 90+ (2026) × razão aptos 100+ ÷ Censo 2022
{
  const xs = UFS.map((u) => [R.uf[u].semBio90mais2026, R.uf[u].razao100_2022, ap(2022, '90-94', u) + ap(2022, '95-99', u) + ap(2022, '100+', u)]);
  const W = xs.reduce((s, x) => s + x[2], 0); const mx = xs.reduce((s, x) => s + x[2] * x[0], 0) / W; const my = xs.reduce((s, x) => s + x[2] * x[1], 0) / W;
  const cov = xs.reduce((s, x) => s + x[2] * (x[0] - mx) * (x[1] - my), 0); const vx = xs.reduce((s, x) => s + x[2] * (x[0] - mx) ** 2, 0); const vy = xs.reduce((s, x) => s + x[2] * (x[1] - my) ** 2, 0);
  R.correlacaoUfSemBio90XRazao100 = r3(cov / Math.sqrt(vx * vy));
  // a mesma correlação com uma medida que não contém os títulos de 90+: sem biometria entre 70 e 79 anos (parecer cético 44)
  const ys = UFS.map((u) => { const pf = perfUf.get(u); return [pf[5] / pf[4], R.uf[u].razao100_2022, ap(2022, '90-94', u) + ap(2022, '95-99', u) + ap(2022, '100+', u)]; });
  const W2 = ys.reduce((s, x) => s + x[2], 0); const mx2 = ys.reduce((s, x) => s + x[2] * x[0], 0) / W2; const my2 = ys.reduce((s, x) => s + x[2] * x[1], 0) / W2;
  const c2 = ys.reduce((s, x) => s + x[2] * (x[0] - mx2) * (x[1] - my2), 0); const v2x = ys.reduce((s, x) => s + x[2] * (x[0] - mx2) ** 2, 0); const v2y = ys.reduce((s, x) => s + x[2] * (x[1] - my2) ** 2, 0);
  R.correlacaoUfSemBio70_79XRazao100 = r3(c2 / Math.sqrt(v2x * v2y));
}

// ---------- (5) município: tetos sem mortes (Censo 2010 e 2022), concentração, biometria de 2026
const { db } = await abrirLeitura();
const infoMun = new Map(db.prepare('SELECT codigo, uf, codigo_ibge, nome FROM municipio').all().map((r) => [`${r.uf.toUpperCase()}|${p5(r.codigo)}`, r]));
const c10 = new Map(); // ibge → Map(idade 85..100 → pessoas)
for (const f of ['censo2010-1378-mun-85-92.json', 'censo2010-1378-mun-93-100.json']) for (const r of ler(path.join(IBGE, f)).slice(1)) {
  const a = idade(Number(r.D6C)); (c10.get(r.D1C) ?? c10.set(r.D1C, new Map()).get(r.D1C)).set(a, Number(r.V) || 0);
}
const c22 = new Map(); // ibge → {g95_99, g100, s95, g90_94}
for (const f of ['censo2022-9514-idade-b.json', 'censo2022-9514-idade-c.json']) for (const r of ler(path.join(IBGE, f)).slice(1)) {
  const nome = { 60040: 'g90_94', 60041: 'g95_99', 6648: 's95', 6653: 'g100' }[r.D5C]; if (!nome) continue;
  (c22.get(r.D1C) ?? c22.set(r.D1C, {}).get(r.D1C))[nome] = Number(r.V) || 0;
}
const s10 = (m, a0, a1) => { let s = 0; for (let a = a0; a <= a1; a++) s += m.get(a) ?? 0; return s; };
const chaves = new Set(ANOS.flatMap((a) => Object.keys(B.municipio[a])));
const munTsv = ['uf\tmunicipio_tse\tibge\tnome\taptos95_99_2014\taptos95_99_2018\taptos95_99_2022\taptos95_99_2026\taptos100_2014\taptos100_2018\taptos100_2022\taptos100_2026\tcenso2010_87mais\tcenso2010_91mais\tcenso2010_95mais\tcenso2010_86_91\tcenso2010_90_95\tcenso2022_100\tcenso2022_95mais\tsembio90mais_2026_pct\tsembio100_2026_pct'];
// janelas estritas (parecer cético 44): a faixa de Y recebe as idades a−k e a−k−1 do Censo de 31/07
const testes = { '2014: 95–99 > Censo 2010 90–95': [], '2014: 100+ > Censo 2010 95+': [], '2018: 95–99 > Censo 2010 86–91': [], '2018: 100+ > Censo 2010 91+': [], '2022: 100+ > Censo 2010 87+': [], '2026: 100+ > Censo 2022 95+': [] };
const muns = []; let semIbge = 0; let sem2010 = 0;
for (const km of chaves) {
  const info = infoMun.get(km); const ib = info?.codigo_ibge; if (!ib) semIbge++;
  const m10 = ib ? c10.get(ib) : null; const m22 = ib ? c22.get(ib) : null; if (ib && !m10) sem2010++;
  const A = (a, f) => B.municipio[a][km]?.[f] ?? 0;
  const pf = perfMun.get(km);
  const x = { km, nome: info?.nome ?? '', ibge: ib ?? '', a95: ANOS.map((a) => A(a, '95-99')), a100: ANOS.map((a) => A(a, '100+')), sb: sb90(pf), sb100: pf && pf[2] ? pf[3] / pf[2] : null, sb70: pf && pf[4] ? pf[5] / pf[4] : null, apt90_2026: pf ? pf[0] + pf[2] : 0 };
  if (m10) Object.assign(x, { t87: s10(m10, 87, 100), t91: s10(m10, 91, 100), t95: s10(m10, 95, 100), t86_91: s10(m10, 86, 91), t90_95: s10(m10, 90, 95) });
  if (m22) Object.assign(x, { c100: m22.g100 ?? 0, c95: (m22.g95_99 ?? 0) + (m22.g100 ?? 0) });
  const t = (nome, v, teto) => { if (teto !== undefined && v > teto) testes[nome].push({ municipio: `${x.nome}/${km.split('|')[0]}`, aptos: v, teto, excesso: v - teto }); };
  if (m10) { t('2014: 95–99 > Censo 2010 90–95', x.a95[0], x.t90_95); t('2014: 100+ > Censo 2010 95+', x.a100[0], x.t95); t('2018: 95–99 > Censo 2010 86–91', x.a95[1], x.t86_91); t('2018: 100+ > Censo 2010 91+', x.a100[1], x.t91); t('2022: 100+ > Censo 2010 87+', x.a100[2], x.t87); }
  if (m22) t('2026: 100+ > Censo 2022 95+', x.a100[3], x.c95);
  muns.push(x);
  munTsv.push([...km.split('|'), x.ibge, x.nome, ...x.a95, ...x.a100, x.t87 ?? '', x.t91 ?? '', x.t95 ?? '', x.t86_91 ?? '', x.t90_95 ?? '', x.c100 ?? '', x.c95 ?? '', x.sb === null ? '' : +(100 * x.sb).toFixed(2), x.sb100 === null ? '' : +(100 * x.sb100).toFixed(2)].join('\t'));
}
R.municipioTestesTeto = { municipios: chaves.size, semCodigoIbge: semIbge, semCenso2010: sem2010,
  testes: Object.fromEntries(Object.entries(testes).map(([k, v]) => [k, { municipios: v.length, excessoSomado: v.reduce((s, y) => s + y.excesso, 0), maiores: v.sort((a, b) => b.excesso - a.excesso).slice(0, 12) }])) };
// concentração do aumento de 100+ de 2018 para 2022
{
  const d = muns.map((x) => ({ x, d: x.a100[2] - x.a100[1] })).sort((a, b) => b.d - a.d); const tot = d.reduce((s, y) => s + y.d, 0);
  const ac = (n) => d.slice(0, n).reduce((s, y) => s + y.d, 0);
  R.municipioConcentracaoDelta100_2018_2022 = { total: tot, subiram: d.filter((y) => y.d > 0).length, cairam: d.filter((y) => y.d < 0).length, iguais: d.filter((y) => y.d === 0).length,
    parcela10: pct(ac(10), tot), parcela100: pct(ac(100), tot), parcela1000: pct(ac(1000), tot),
    maiores: d.slice(0, 15).map((y) => ({ municipio: `${y.x.nome}/${y.x.km.split('|')[0]}`, aptos100_2018: y.x.a100[1], aptos100_2022: y.x.a100[2], censo2022_100: y.x.c100 ?? null, semBio90mais2026: y.x.sb === null ? null : +(100 * y.x.sb).toFixed(1) })) };
}
// municípios pela parcela sem biometria entre 70 e 79 anos (medida que não contém os títulos de 90+)
{
  const acima = muns.filter((x) => x.sb70 !== null && x.sb70 > 0.10); const resto = muns.filter((x) => !(x.sb70 !== null && x.sb70 > 0.10));
  const t26 = muns.reduce((s, x) => s + x.a100[3], 0); const sm = (a, i) => a.reduce((s, x) => s + x.a100[i], 0);
  R.municipioSemBio70_79 = { municipiosAcimaDe10pct: acima.length, aptos100_2026: sm(acima, 3), parcela100_2026: pct(sm(acima, 3), t26), demais: { municipios: resto.length, aptos100_2022: sm(resto, 2), aptos100_2026: sm(resto, 3) } };
}
// grupos de município pela parcela sem biometria entre os aptos de 90+ em 2026 (medida endógena: contém os próprios títulos)
{
  const G = [['até 5%', (v) => v <= 0.05], ['5% a 25%', (v) => v > 0.05 && v <= 0.25], ['25% a 75%', (v) => v > 0.25 && v < 0.75], ['75% ou mais', (v) => v >= 0.75]];
  R.municipioGruposBiometria = G.map(([nome, f]) => {
    const a = muns.filter((x) => x.sb !== null && f(x.sb)); const s = (fn) => a.reduce((t, x) => t + (fn(x) ?? 0), 0);
    const o = { grupo: nome, municipios: a.length, aptos90mais2026: s((x) => x.apt90_2026) };
    for (const [i, Y] of ANOS.entries()) { o[`aptos95_99_${Y}`] = s((x) => x.a95[i]); o[`aptos100_${Y}`] = s((x) => x.a100[i]); }
    o.censo2022_100 = s((x) => x.c100); o.censo2010_87mais = s((x) => x.t87); o.censo2022_95mais = s((x) => x.c95);
    o.razao100_2018_sobre_censo2010_91mais = r3(o.aptos100_2018 / s((x) => x.t91)); o.razao100_2022_sobre_censo2022 = r3(o.aptos100_2022 / o.censo2022_100);
    o.razao100_2026_sobre_censo2022_95mais = r3(o.aptos100_2026 / o.censo2022_95mais);
    o.crescimento100_2018_2022 = r3(o.aptos100_2022 / o.aptos100_2018); o.crescimento100_2022_2026 = r3(o.aptos100_2026 / o.aptos100_2022);
    o.degrau95_2014 = r3(o.aptos95_99_2014 / s((x) => B.municipio[2014][x.km]?.['90-94'] ?? 0)); o.degrau100_2018 = r3(o.aptos100_2018 / o.aptos95_99_2018);
    return o;
  });
}
await writeFile(path.join(OUT, 'aptos100-resumo.json'), JSON.stringify(R, null, 1));
await writeFile(path.join(OUT, 'aptos100-uf.tsv'), `${ufTsv.join('\n')}\n`);
await writeFile(path.join(OUT, 'aptos100-municipios.tsv'), `${munTsv.join('\n')}\n`);
const { uf: _u, ...curto } = R;
console.log(JSON.stringify(curto, null, 1));
