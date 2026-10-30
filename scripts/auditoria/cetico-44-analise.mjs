// Cético, parecer 44 (H01, demógrafo doc 10): análise sobre a releitura própria (cetico-44-serie.mjs brasil|uf|detalhe).
// Confere: série por faixa (dois caminhos de leitura), régua do arquivo (códigos de faixa, inválidos, data de geração,
// 1º = 2º turno, total × detalhe por seção), Censo 2010/2022 com janelas de idade ESTRITAS (teto sem mortes válido para
// qualquer data de referência da idade entre agosto e dezembro do ano da eleição), retenção das coortes só com o TSE,
// sensibilidade da decomposição à mortalidade, grupos de UF e de município (com uma medida de biometria que não contém
// os próprios títulos de 90+), comparecimento dos 100+ por ano e os municípios citados no tópico 6.
// Uso: node scripts/auditoria/cetico-44-analise.mjs   Saída: data/parsed/auditoria/cetico-revisor/44-resumo.json
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const DIR = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico-revisor');
const IBGE = path.join(RAIZ, 'data', 'raw', 'externos', 'ibge');
const ler = (f) => JSON.parse(readFileSync(f, 'utf8'));
const r3 = (x) => (Number.isFinite(x) ? +x.toFixed(3) : null);
const ANOS = ['2014', '2018', '2022', '2026'];
const FX = { 8084: '80-84', 8589: '85-89', 9094: '90-94', 9599: '95-99', 9999: '100+', '-3': 'invalida', 1600: '16-17', 1700: '16-17' };
const UFCOD = { 11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO', 21: 'MA', 22: 'PI', 23: 'CE', 24: 'RN', 25: 'PB', 26: 'PE', 27: 'AL', 28: 'SE', 29: 'BA', 31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP', 41: 'PR', 42: 'SC', 43: 'RS', 50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF' };
const UFS = Object.values(UFCOD).sort();
const R = {};

// ---------- 1. série pelos dois caminhos (BRASIL.csv e CSV por UF), sem exterior
const BR = ler(path.join(DIR, '44-brasil.json')).anos; const UFL = ler(path.join(DIR, '44-uf.json')).anos;
function agrega(A, turno) { // por faixa (Brasil sem ZZ/VT), por UF×faixa, por município×faixa, por zona (total)
  const br = {}; const uf = {}; const mun = {}; const zona = {}; const comp = {};
  for (const [k, [ap, cp]] of Object.entries(A.zonaFaixa)) {
    const [t, u, m, z, fx] = k.split('|'); if (t !== turno || u === 'ZZ' || u === 'VT') continue;
    const f = FX[fx] ?? `c${fx}`;
    br[f] = (br[f] ?? 0) + ap; br.total = (br.total ?? 0) + ap; comp[f] = (comp[f] ?? 0) + cp;
    const o = (uf[u] ??= {}); o[f] = (o[f] ?? 0) + ap; o.total = (o.total ?? 0) + ap;
    const om = (mun[`${u}|${m}`] ??= {}); om[f] = (om[f] ?? 0) + ap; om[`comp_${f}`] = (om[`comp_${f}`] ?? 0) + cp;
    zona[`${u}|${m}|${z}`] = (zona[`${u}|${m}|${z}`] ?? 0) + ap;
  }
  return { br, uf, mun, zona, comp };
}
const S = {}; const SU = {}; const S2 = {};
for (const a of ANOS) { S[a] = agrega(BR[a], '1'); SU[a] = agrega(UFL[a], '1'); if (a !== '2026') S2[a] = agrega(BR[a], '2'); }
const LIN = ['80-84', '85-89', '90-94', '95-99', '100+', 'invalida', '16-17', 'total'];
R.serie = Object.fromEntries(LIN.map((f) => [f, Object.fromEntries(ANOS.map((a) => [a, S[a].br[f] ?? 0]))]));
R.serieCaminhoPorUF = Object.fromEntries(LIN.map((f) => [f, Object.fromEntries(ANOS.map((a) => [a, SU[a].br[f] ?? 0]))]));
R.ufsNoCaminhoPorUF = Object.fromEntries(ANOS.map((a) => [a, Object.keys(SU[a].uf).sort().join(' ')]));
// os dois caminhos coincidem nas UFs presentes nos dois?
R.brasilVsPorUF = Object.fromEntries(ANOS.map((a) => {
  let dif = 0; let ufs = 0;
  for (const u of Object.keys(SU[a].uf)) { ufs++; for (const f of LIN) if ((SU[a].uf[u][f] ?? 0) !== (S[a].uf[u]?.[f] ?? 0)) dif++; }
  return [a, { ufsComparadas: ufs, celulasDiferentes: dif }];
}));
// comparação com a base do demógrafo
{
  const D = ler(path.join(RAIZ, 'data', 'parsed', 'auditoria', 'demografo', 'aptos100-base.json'));
  R.vsDemografo = Object.fromEntries(ANOS.map((a) => [a, LIN.filter((f) => (D.brasil[a][f] ?? 0) !== (S[a].br[f] ?? 0)).map((f) => `${f}: demógrafo ${D.brasil[a][f]} × cético ${S[a].br[f]}`)]));
}
R.faixasPorAno = Object.fromEntries(ANOS.map((a) => [a, Object.keys(BR[a].faixas).map((k) => k.split('=')[0]).sort((x, y) => Number(x) - Number(y)).join(',')]));
R.mesmasFaixasNos4Anos = new Set(Object.values(R.faixasPorAno)).size === 1;
R.geracao = Object.fromEntries(ANOS.map((a) => [a, Object.keys(BR[a].geracao)]));
R.exterior = Object.fromEntries(ANOS.map((a) => [a, BR[a].ufTurno['1|ZZ']?.[0] ?? 0]));
R.totalComExterior = Object.fromEntries(ANOS.map((a) => [a, (S[a].br.total ?? 0) + R.exterior[a]]));
// 1º turno = 2º turno, célula a célula (zona × faixa)
R.primeiroIgualSegundo = Object.fromEntries(['2014', '2018', '2022'].map((a) => {
  let dif = 0; let n = 0;
  for (const [k, [ap]] of Object.entries(BR[a].zonaFaixa)) { if (!k.startsWith('1|')) continue; n++; const v = BR[a].zonaFaixa[`2${k.slice(1)}`]?.[0]; if (v !== ap) dif++; }
  return [a, { celulas: n, diferentes: dif }];
}));
// comparecimento por faixa, 1º turno (e 2º quando há)
R.comparecimento = Object.fromEntries(['90-94', '95-99', '100+', '80-84', '85-89'].map((f) => [f, Object.fromEntries(ANOS.map((a) => [a, { aptos: S[a].br[f], votaram: S[a].comp[f], taxa: r3(100 * S[a].comp[f] / S[a].br[f]), ...(S2[a] ? { votaram2t: S2[a].comp[f], taxa2t: r3(100 * S2[a].comp[f] / S2[a].br[f]) } : {}) }]))]));
R.comparecimento100ComExterior2026 = { aptos: S['2026'].br['100+'] + (BR['2026'].zonaFaixa ? Object.entries(BR['2026'].zonaFaixa).filter(([k]) => k.startsWith('1|ZZ|') && k.endsWith('|9999')).reduce((s, [, v]) => s + v[0], 0) : 0),
  votaram: S['2026'].comp['100+'] + Object.entries(BR['2026'].zonaFaixa).filter(([k]) => k.startsWith('1|ZZ|') && k.endsWith('|9999')).reduce((s, [, v]) => s + v[1], 0) };

// ---------- 2. total do arquivo por idade × detalhe por seção (Presidente), por zona, 1º e 2º turno
{
  const DT = ler(path.join(DIR, '44-detalhe.json')).anos; R.detalhe = {};
  for (const a of ['2018', '2022', '2026']) for (const t of ['1', '2']) {
    const P = t === '1' ? S[a] : S2[a]; if (!P) continue;
    const det = {}; let secoes = DT[a].secoes[t] ?? 0; let tDet = 0;
    for (const [k, v] of Object.entries(DT[a].zona)) { const [tt, u, m, z] = k.split('|'); if (tt !== t || u === 'ZZ' || u === 'VT') continue; det[`${u}|${m}|${z}`] = v; tDet += v; }
    const ch = new Set([...Object.keys(det), ...Object.keys(P.zona)]); let abs = 0; let zd = 0; let maior = null;
    for (const k of ch) { const d = (det[k] ?? 0) - (P.zona[k] ?? 0); if (d) { zd++; abs += Math.abs(d); if (!maior || Math.abs(d) > Math.abs(maior.d)) maior = { k, d }; } }
    // por UF
    const ufDif = {}; for (const k of ch) { const u = k.split('|')[0]; ufDif[u] = (ufDif[u] ?? 0) + (det[k] ?? 0) - (P.zona[k] ?? 0); }
    R.detalhe[`${a}-${t}t`] = { geracaoDetalhe: Object.keys(DT[a].geracao), secoesPresidente: secoes, aptosDetalhe: tDet, aptosPerfil: P.br.total, diferenca: tDet - P.br.total, zonas: ch.size, zonasDiferentes: zd, somaAbs: abs, maiorDiferencaZona: maior, maiorDiferencaUF: Object.entries(ufDif).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])).slice(0, 3) };
  }
}

// ---------- 3. Censo 2010 e 2022 (idade simples, Brasil e UF; municípios por faixas)
const P10 = new Map(); const P22 = new Map();
const idade = (c) => (c >= 6613 && c <= 6652 ? c - 6613 + 60 : c === 6653 ? 100 : null);
for (const r of ler(path.join(IBGE, 'censo2010-1378-br-uf-idade-simples.json')).slice(1)) {
  const a = idade(Number(r.D6C)); if (a === null) continue; const l = r.NC === '1' ? 'BR' : UFCOD[Number(r.D1C)];
  (P10.get(l) ?? P10.set(l, new Map()).get(l)).set(a, Number(r.V) || 0);
}
for (const r of ler(path.join(IBGE, 'censo2022-9514-br-uf-idade-simples.json')).slice(1)) {
  const a = idade(Number(r.D5C)); if (a === null) continue; const l = r.NC === '1' ? 'BR' : UFCOD[Number(r.D1C)];
  (P22.get(l) ?? P22.set(l, new Map()).get(l)).set(a, Number(r.V) || 0);
}
const soma = (P, l, a0, a1) => { let s = 0; for (let a = a0; a <= a1; a++) s += P.get(l)?.get(a) ?? 0; return s; };
R.censoBR = { c2022_95: soma(P22, 'BR', 95, 95), c2022_96mais: soma(P22, 'BR', 96, 100), c2022_99: soma(P22, 'BR', 99, 99), c2022_100: soma(P22, 'BR', 100, 100), c2022_95_99: soma(P22, 'BR', 95, 99), c2022_90_94: soma(P22, 'BR', 90, 94) };
// 2022, mesmo ano do Censo: aptos ÷ Censo. A eleição (02/10) é 2 meses depois do Censo (31/07): o 100+ da eleição
// inclui parte dos de 99 anos do Censo. Teto estrito do 100+: 99 + 100+ do Censo.
R.razao2022 = Object.fromEntries([['80-84', 80, 84], ['85-89', 85, 89], ['90-94', 90, 94], ['95-99', 95, 99], ['100+', 100, 100]].map(([f, a0, a1]) => {
  const pop = soma(P22, 'BR', a0, a1); return [f, { aptos: S['2022'].br[f], censo: pop, razao: r3(S['2022'].br[f] / pop), excesso: S['2022'].br[f] - pop }];
}));
R.excesso100_2022_tetoEstrito = S['2022'].br['100+'] - soma(P22, 'BR', 99, 100);
// Janelas estritas (idade na eleição, para qualquer data de referência de ago a dez do ano da eleição) → idade no Censo
// (31/07). Faixa [lo,hi] em Y; Censo C: idades de lo-(Y-C)-1 até hi-(Y-C), e 100+ → 100-(Y-C)-1 em diante.
const janela = (Y, C, lo, hi) => [lo - (Y - C) - 1, hi === 100 ? 100 : hi - (Y - C)];
const TESTES = [['2014', 2010, '95-99', 95, 99], ['2014', 2010, '100+', 100, 100], ['2018', 2010, '90-94', 90, 94], ['2018', 2010, '95-99', 95, 99], ['2018', 2010, '100+', 100, 100], ['2022', 2010, '95-99', 95, 99], ['2022', 2010, '100+', 100, 100], ['2026', 2022, '95-99', 95, 99], ['2026', 2022, '100+', 100, 100]];
R.tetoEstritoBrasil = TESTES.map(([Y, C, f, lo, hi]) => {
  const [a0, a1] = janela(Number(Y), C, lo, hi); const P = C === 2010 ? P10 : P22; const t = soma(P, 'BR', a0, Math.min(a1, 100));
  return { ano: Y, faixa: f, censo: C, idadesNoCenso: `${a0}–${a1 === 100 ? '100+' : a1}`, aptos: S[Y].br[f], teto: t, excesso: S[Y].br[f] - t };
});
// por UF
R.tetoEstritoUF = {};
for (const [Y, C, f, lo, hi] of TESTES) {
  const [a0, a1] = janela(Number(Y), C, lo, hi); const P = C === 2010 ? P10 : P22; const acima = [];
  for (const u of UFS) { const t = soma(P, u, a0, Math.min(a1, 100)); const v = S[Y].uf[u]?.[f] ?? 0; if (v > t) acima.push(`${u} ${v}>${t}`); }
  R.tetoEstritoUF[`${Y} ${f}`] = acima;
}

// ---------- 4. retenção das coortes só com o TSE (títulos que chegam × títulos que partem) e sensibilidade à mortalidade
// coorte N+ em Y → (N+4)+ em Y+4. A idade de entrada da faixa partida pesa de 15% a 33% da faixa (intervalo) para cobrir a forma da população.
function ret(Y, fIni, acima, fim) {
  const ini = (p) => (S[Y].br[fIni] ?? 0) * (1 - p) + acima.reduce((s, f) => s + (S[Y].br[f] ?? 0), 0);
  const end = fim.reduce((s, f) => s + (S[String(Number(Y) + 4)].br[f] ?? 0), 0);
  return { inicioMin: Math.round(ini(0.33)), inicioMax: Math.round(ini(0.15)), fim: end, retencaoMin: r3(end / ini(0.15)), retencaoMax: r3(end / ini(0.33)) };
}
R.retencaoTSE = {};
for (const Y of ['2014', '2018', '2022']) R.retencaoTSE[`96+ ${Y}→100+ ${Number(Y) + 4}`] = ret(Y, '95-99', ['100+'], ['100+']);
for (const Y of ['2014', '2018', '2022']) R.retencaoTSE[`91+ ${Y}→95+ ${Number(Y) + 4}`] = ret(Y, '90-94', ['95-99', '100+'], ['95-99', '100+']);
for (const Y of ['2014', '2018', '2022']) R.retencaoTSE[`86+ ${Y}→90+ ${Number(Y) + 4}`] = ret(Y, '85-89', ['90-94', '95-99', '100+'], ['90-94', '95-99', '100+']);
// Sensibilidade: a coorte que tem 100+ na eleição de 2022 tinha 96+ em 2018. Vivos em 2018 = vivos em 2022 ÷ S4,
// com S4 = (1-q)^4 e q (mortalidade anual) de 20% a 35%. Vivos em 2022 = Censo 100+ (mais 0 a 1/6 dos de 99 anos).
{
  const v22min = R.censoBR.c2022_100; const v22max = R.censoBR.c2022_100 + R.censoBR.c2022_99 / 6;
  const t18 = R.retencaoTSE['96+ 2018→100+ 2022'];
  R.sensibilidadeDecomposicao = [0.20, 0.25, 0.28, 0.30, 0.35].map((q) => {
    const s4 = (1 - q) ** 4; const viv18min = v22min / s4; const viv18max = v22max / s4;
    return { mortalidadeAnual: q, sobrev4anos: r3(s4), vivos2018: [Math.round(viv18min), Math.round(viv18max)], excessoJaEm2018: [Math.round(t18.inicioMin - viv18max), Math.round(t18.inicioMax - viv18min)],
      mortesNaoBaixadas2018_2022: [Math.round((S['2022'].br['100+'] - v22max) - (t18.inicioMax - viv18min)), Math.round((S['2022'].br['100+'] - v22min) - (t18.inicioMin - viv18max))] };
  });
}

// ---------- 5. UF e municípios: biometria de 2026 (perfil por seção, somado) com duas medidas
const { db } = await abrirLeitura();
const MUN = new Map(db.prepare('SELECT codigo, uf, codigo_ibge, nome FROM municipio').all().map((r) => [`${r.uf.toUpperCase()}|${Number(r.codigo)}`, r]));
const PERF = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'demografo', 'perfil');
const pm = new Map(); const pu = new Map();
const CAMPOS = ['f70_79', 'sembio_f70_79', 'f18_69', 'sembio_f18_69', 'f90_99', 'sembio_f90_99', 'f100', 'sembio_f100', 'f80_89', 'sembio_f80_89'];
for (const f of readdirSync(PERF)) {
  const L = readFileSync(path.join(PERF, f), 'utf8').trimEnd().split('\n'); const ix = Object.fromEntries(L[0].split('\t').map((n, i) => [n, i]));
  for (const l of L.slice(1)) {
    const c = l.split('\t'); if (c[0] === 'zz') continue; const v = CAMPOS.map((n) => Number(c[ix[n]]));
    for (const [m, k] of [[pm, `${c[0].toUpperCase()}|${Number(c[1])}`], [pu, c[0].toUpperCase()]]) { const a = m.get(k) ?? m.set(k, CAMPOS.map(() => 0)).get(k); v.forEach((x, i) => { a[i] += x; }); }
  }
}
const sb = (v, i) => (v && v[i] ? v[i + 1] / v[i] : null); // i=0: 70–79; 2: 18–69; 4: 90–99; 6: 100+
const sb90 = (v) => (v && v[4] + v[6] ? (v[5] + v[7]) / (v[4] + v[6]) : null);
R.perfilConferencia = { perfil100: UFS.reduce((s, u) => s + (pu.get(u)?.[6] ?? 0), 0), pca100_2026: S['2026'].br['100+'] };
// UF: grupos do demógrafo, refeitos, e a medida exógena (sem biometria entre 70–79, que não contém os 90+)
R.uf = {};
for (const u of UFS) {
  const v = pu.get(u); const a = (Y, f) => S[Y].uf[u]?.[f] ?? 0;
  R.uf[u] = { a100: ANOS.map((Y) => a(Y, '100+')), a95: ANOS.map((Y) => a(Y, '95-99')), censo100_2022: soma(P22, u, 100, 100), razao100_2022: r3(a('2022', '100+') / soma(P22, u, 100, 100)),
    sb90mais: r3(sb90(v)), sb70_79: r3(sb(v, 0)), sb18_69: r3(sb(v, 2)), sb80_89: r3(sb(v, 8)) };
  const o = R.uf[u]; o.grupo = o.razao100_2022 < 1 ? 'A' : o.a100[3] < o.a100[2] ? 'B' : 'C';
}
const grupos = {}; for (const u of UFS) { const o = R.uf[u]; const g = (grupos[o.grupo] ??= { ufs: [], a100: [0, 0, 0, 0] }); g.ufs.push(u); o.a100.forEach((x, i) => { g.a100[i] += x; }); }
const totD = Object.values(grupos).reduce((s, g) => s + g.a100[2] - g.a100[1], 0);
for (const g of Object.values(grupos)) g.parcelaDelta18_22 = r3(100 * (g.a100[2] - g.a100[1]) / totD);
R.gruposUF = grupos;
function corr(xs) { const W = xs.reduce((s, x) => s + x[2], 0); const mx = xs.reduce((s, x) => s + x[2] * x[0], 0) / W; const my = xs.reduce((s, x) => s + x[2] * x[1], 0) / W;
  const c = xs.reduce((s, x) => s + x[2] * (x[0] - mx) * (x[1] - my), 0); return r3(c / Math.sqrt(xs.reduce((s, x) => s + x[2] * (x[0] - mx) ** 2, 0) * xs.reduce((s, x) => s + x[2] * (x[1] - my) ** 2, 0))); }
const peso = (u) => S['2022'].uf[u]['90-94'] + S['2022'].uf[u]['95-99'] + S['2022'].uf[u]['100+'];
R.correlacaoUF = {
  sb90mais_x_razao100_2022: corr(UFS.map((u) => [R.uf[u].sb90mais, R.uf[u].razao100_2022, peso(u)])),
  sb70_79_x_razao100_2022: corr(UFS.map((u) => [R.uf[u].sb70_79, R.uf[u].razao100_2022, peso(u)])),
  sb18_69_x_razao100_2022: corr(UFS.map((u) => [R.uf[u].sb18_69, R.uf[u].razao100_2022, peso(u)])),
  sb70_79_x_sb90mais: corr(UFS.map((u) => [R.uf[u].sb70_79, R.uf[u].sb90mais, peso(u)])),
};
// municípios: grupo do demógrafo (sem biometria 90+ ≥ 75%) e grupo exógeno (sem biometria 70–79)
const chaves = new Set(ANOS.flatMap((Y) => Object.keys(S[Y].mun)));
const muns = [...chaves].map((k) => {
  const v = pm.get(k); const A = (Y, f) => S[Y].mun[k]?.[f] ?? 0;
  return { k, nome: MUN.get(k)?.nome ?? '', a100: ANOS.map((Y) => A(Y, '100+')), a95: ANOS.map((Y) => A(Y, '95-99')), c100_2026: A('2026', 'comp_100+'), c100_2022: A('2022', 'comp_100+'),
    sb90: sb90(v), sb70: sb(v, 0), sb18: sb(v, 2) };
});
const faixas = [['até 5%', (x) => x <= 0.05], ['5% a 25%', (x) => x > 0.05 && x <= 0.25], ['25% a 75%', (x) => x > 0.25 && x < 0.75], ['75% ou mais', (x) => x >= 0.75]];
const tab = (campo, cortes) => cortes.map(([n, fn]) => {
  const g = muns.filter((m) => m[campo] !== null && fn(m[campo]));
  const s = (f) => g.reduce((t, m) => t + f(m), 0);
  return { grupo: n, municipios: g.length, a100: ANOS.map((_, i) => s((m) => m.a100[i])), a95: ANOS.map((_, i) => s((m) => m.a95[i])), votaram100_2026: s((m) => m.c100_2026), votaram100_2022: s((m) => m.c100_2022) };
});
R.municipiosPorSb90 = tab('sb90', faixas);
R.municipiosPorSb70_79 = tab('sb70', [['até 10%', (x) => x <= 0.10], ['10% a 30%', (x) => x > 0.10 && x <= 0.30], ['30% a 60%', (x) => x > 0.30 && x <= 0.60], ['mais de 60%', (x) => x > 0.60]]);
R.municipiosSemPerfil = muns.filter((m) => m.sb90 === null).length;
const G950 = new Set(muns.filter((m) => m.sb90 !== null && m.sb90 >= 0.75).map((m) => m.k));
R.g950 = { municipios: G950.size, a100_2026: muns.filter((m) => G950.has(m.k)).reduce((s, m) => s + m.a100[3], 0), total100_2026: S['2026'].br['100+'] };
R.g950.parcela = r3(100 * R.g950.a100_2026 / R.g950.total100_2026);
// 1.068 municípios do tópico 6 (aptos 100+ 2026 > Censo 2022 96+) × 950
{
  const c22 = new Map();
  for (const r of ler(path.join(IBGE, 'censo2022-9514-idade-c.json')).slice(1)) { const n = { 60041: 'g95_99', 6648: 's95', 6653: 'g100' }[r.D5C]; if (n) (c22.get(r.D1C) ?? c22.set(r.D1C, {}).get(r.D1C))[n] = Number(r.V) || 0; }
  const sobra = muns.filter((m) => { const ib = MUN.get(m.k)?.codigo_ibge; const c = ib ? c22.get(String(ib)) : null; return c && m.a100[3] > (c.g95_99 - c.s95 + c.g100); });
  R.sobra1068 = { municipios: sobra.length, noGrupo950: sobra.filter((m) => G950.has(m.k)).length, a100_2026: sobra.reduce((s, m) => s + m.a100[3], 0), votaram: sobra.reduce((s, m) => s + m.c100_2026, 0) };
}
// municípios citados no tópico 6 e no doc 07
const CIT = [['MA', 'ICATU'], ['RS', 'REDENTORA'], ['SC', 'FLORIANÓPOLIS'], ['MA', 'PIRAPEMAS'], ['BA', 'PILÃO ARCADO'], ['MA', 'ARAME'], ['RJ', 'RIO DE JANEIRO'], ['SP', 'INDAIATUBA'], ['MT', 'SANTO ANTÔNIO DO LESTE'], ['PI', 'GUARIBAS'], ['MT', 'ALTO BOA VISTA'],
  ['MG', 'MONTES CLAROS'], ['PE', 'RECIFE'], ['ES', 'VITÓRIA'], ['MT', 'CAMPINÁPOLIS'], ['SP', 'MOCOCA'], ['MG', 'UBERLÂNDIA'], ['RJ', 'SÃO FIDÉLIS'], ['RJ', 'NITERÓI'], ['PA', 'CURRALINHO'], ['RS', 'BENJAMIN CONSTANT DO SUL'], ['MG', 'VARGEM GRANDE DO RIO PARDO'], ['MG', 'UBERABA']];
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
R.citados = CIT.map(([u, n]) => {
  const m = muns.find((x) => x.k.startsWith(`${u}|`) && norm(x.nome) === norm(n));
  if (!m) return { municipio: `${n}/${u}`, achado: false };
  return { municipio: `${n}/${u}`, codigoTSE: m.k, sb90mais: r3(m.sb90), sb70_79: r3(m.sb70), no950: G950.has(m.k), a100: m.a100, votaram100_2026: m.c100_2026 };
});
// município do caso ES do tópico 6 (código TSE 56995)
{ const m = muns.find((x) => x.k === 'ES|56995'); R.citados.push({ municipio: `${m?.nome}/ES (56995)`, codigoTSE: 'ES|56995', sb90mais: r3(m?.sb90), no950: G950.has('ES|56995'), a100: m?.a100 }); }
// comparecimento 100+ por grupo de UF e no 950, 2022 e 2026 (1º turno)
R.comparecimento100PorGrupo = Object.fromEntries(Object.entries(grupos).map(([g, o]) => {
  const vot = (Y) => o.ufs.reduce((s, u) => s + Object.entries(S[Y].mun).filter(([k]) => k.startsWith(`${u}|`)).reduce((t, [, v]) => t + (v['comp_100+'] ?? 0), 0), 0);
  return [g, { a100_2022: o.a100[2], votaram2022: vot('2022'), a100_2026: o.a100[3], votaram2026: vot('2026') }];
}));
R.comparecimento100no950 = { aptos2026: R.g950.a100_2026, votaram2026: muns.filter((m) => G950.has(m.k)).reduce((s, m) => s + m.c100_2026, 0), aptos2022: muns.filter((m) => G950.has(m.k)).reduce((s, m) => s + m.a100[2], 0), votaram2022: muns.filter((m) => G950.has(m.k)).reduce((s, m) => s + m.c100_2022, 0) };

writeFileSync(path.join(DIR, '44-resumo.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
