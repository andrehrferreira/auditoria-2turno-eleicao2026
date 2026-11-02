// Parecer cético 53 (H26, fechamento): reprodução independente da estatística B7 (uniformidade da virada entre zonas)
// do plano docs/analysis/cientista-politico/06-h26-plano-final.md, seção 4.2, SEM importar politico-h26-lib.mjs nem
// forense-lib.mjs. Lê o votacao_candidato_munzona_<ano>_BR.csv direto do zip (unzip -p), soma por município × zona e por
// zona, e calcula:
//   B7a = % das zonas em que quem cresceu melhorou a margem (virada bruta > 0);
//   B7b = 1,4826 × MAD da virada bruta ÷ |virada nacional|.
//   Virada bruta da zona, orientada a quem cresceu: s × [(13 − R)/(13 + R) no 2º turno − (13 − R)/nominais no 1º turno], em p.p.
// Intervalos de 1 − 0,05/12 (99,58%) por 5.000 reamostragens, em três esquemas:
//   P = o do plano (unidades município × zona dentro da UF, reagregadas em zonas);
//   Z = zonas inteiras dentro da UF;
//   C = o do autor (conglomerado = município de maior voto do 2º turno na zona, dentro da UF).
// Análises FORA DO PLANO (declaradas no parecer): N1 margem de dois partidos no 1º turno; N2 dispersão absoluta em p.p.;
// N3 contrafactual da troca F5 (retira do 2026 uma troca do 22 para o 13 proporcional ao voto do 22 do tamanho que muda
// o vencedor e recalcula B7).
// Só leitura. Uso: node scripts/auditoria/cetico-53-b7.mjs [--reps 5000]
// Saída: data/parsed/auditoria/cetico-revisor/53-b7.json
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DA = path.join(RAIZ, 'data', 'raw', 'dadosabertos', 'votacao_candidato_munzona');
const SAIDA = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico-revisor');
const REPS = Number(process.argv[process.argv.indexOf('--reps') + 1]) || 5000;
const ALFA = 0.05 / 12;
const RIVAL = { 2018: '17', 2022: '22', 2026: '22' };
const SINAL = { 2018: 1, 2022: -1, 2026: 1 }; // +1: quem cresceu é o 13
const MARGEM = 64256232 - 59826041, TROCA = Math.ceil(MARGEM / 2);

function splitCsv(l) {
  const out = [];
  let i = 0;
  while (i <= l.length) {
    if (l[i] === '"') { const j = l.indexOf('"', i + 1); out.push(l.slice(i + 1, j)); i = j + 2; }
    else { let j = l.indexOf(';', i); if (j < 0) j = l.length; out.push(l.slice(i, j)); i = j + 1; }
  }
  return out;
}

async function lerMunzona(ano) {
  const zip = path.join(DA, `votacao_candidato_munzona_${ano}.zip`);
  const p = spawn('unzip', ['-p', zip, `votacao_candidato_munzona_${ano}_BR.csv`]);
  p.stdout.setEncoding('latin1');
  const rl = createInterface({ input: p.stdout, crlfDelay: Infinity });
  let col = null;
  const unid = new Map();
  const total = { 1: {}, 2: {} };
  let linhas = 0, outrosCargos = 0;
  for await (const l of rl) {
    if (!l) continue;
    const c = splitCsv(l);
    if (!col) { col = Object.fromEntries(c.map((x, i) => [x, i])); for (const f of ['NR_TURNO', 'SG_UF', 'CD_MUNICIPIO', 'NR_ZONA', 'CD_CARGO', 'NR_CANDIDATO', 'QT_VOTOS_NOMINAIS']) if (!(f in col)) throw new Error(`${ano}: sem ${f}`); continue; }
    linhas++;
    if (c[col.CD_CARGO] !== '1') { outrosCargos++; continue; }
    const t = Number(c[col.NR_TURNO]), uf = c[col.SG_UF].toLowerCase(), mun = Number(c[col.CD_MUNICIPIO]), zona = Number(c[col.NR_ZONA]);
    const nr = c[col.NR_CANDIDATO], q = Number(c[col.QT_VOTOS_NOMINAIS]);
    if (!Number.isFinite(q)) throw new Error(`${ano}: voto não numérico`);
    const k = `${uf}|${mun}|${zona}`;
    let u = unid.get(k);
    if (!u) { u = { uf, mun, zona, v: { 1: {}, 2: {} } }; unid.set(k, u); }
    u.v[t][nr] = (u.v[t][nr] ?? 0) + q;
    total[t][nr] = (total[t][nr] ?? 0) + q;
  }
  return { unid: [...unid.values()], total, linhas, outrosCargos };
}

const soma = (o) => Object.values(o).reduce((a, b) => a + b, 0);
function mediana(v) { const s = Float64Array.from(v).sort(); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; }
function mad(v) { const m = mediana(v); return 1.4826 * mediana(v.map((x) => Math.abs(x - m))); }
function quantil(v, p) { const s = Float64Array.from(v).sort(); const pos = (s.length - 1) * p, i = Math.floor(pos); return i + 1 < s.length ? s[i] + (s[i + 1] - s[i]) * (pos - i) : s[i]; }
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// unidade → somas mínimas para as estatísticas
function compactar(ano, unid) {
  const R = RIVAL[ano];
  const out = [];
  let excluidas = 0;
  for (const u of unid) {
    if (u.uf === 'zz') continue;
    const n1 = soma(u.v[1]), n2 = soma(u.v[2]);
    if (!(n1 > 0) || !(n2 > 0)) { excluidas++; continue; }
    out.push({ uf: u.uf, mun: u.mun, zona: u.zona, n1, a13: u.v[1]['13'] ?? 0, aR: u.v[1][R] ?? 0, y13: u.v[2]['13'] ?? 0, yR: u.v[2][R] ?? 0 });
  }
  return { out, excluidas };
}

// estatísticas a partir de uma lista de [unidade, cópia-da-zona]
function estat(ano, sel, { doisPartidos = false } = {}) {
  const s = SINAL[ano];
  const Z = new Map();
  for (const [u, cz] of sel) {
    const k = `${u.uf}|${u.zona}#${cz}`;
    let z = Z.get(k);
    if (!z) { z = { n1: 0, a13: 0, aR: 0, y13: 0, yR: 0 }; Z.set(k, z); }
    z.n1 += u.n1; z.a13 += u.a13; z.aR += u.aR; z.y13 += u.y13; z.yR += u.yR;
  }
  const T = { n1: 0, a13: 0, aR: 0, y13: 0, yR: 0 };
  const vir = [];
  for (const z of Z.values()) {
    for (const f in T) T[f] += z[f];
    const m1 = doisPartidos ? (100 * (z.a13 - z.aR)) / (z.a13 + z.aR) : (100 * (z.a13 - z.aR)) / z.n1;
    const m2 = (100 * (z.y13 - z.yR)) / (z.y13 + z.yR);
    vir.push(s * (m2 - m1));
  }
  const m1T = doisPartidos ? (100 * (T.a13 - T.aR)) / (T.a13 + T.aR) : (100 * (T.a13 - T.aR)) / T.n1;
  const nac = s * ((100 * (T.y13 - T.yR)) / (T.y13 + T.yR) - m1T);
  const d = mad(vir);
  return { zonas: vir.length, B7a: (100 * vir.filter((v) => v > 0).length) / vir.length, B7b: d / Math.abs(nac), madPP: d, nacional: nac,
    zonasNaoPositivas: vir.filter((v) => !(v > 0)).length, mediana: mediana(vir) };
}

const realSel = (out) => out.map((u) => [u, 0]);
function esquemas(out) {
  // P: unidades dentro da UF; Z: zonas dentro da UF; C: conglomerado do autor dentro da UF
  const porUf = new Map();
  for (const u of out) (porUf.get(u.uf) ?? porUf.set(u.uf, []).get(u.uf)).push(u);
  const zonasUf = new Map(), clustUf = new Map();
  for (const [uf, l] of porUf) {
    const zs = new Map();
    for (const u of l) (zs.get(u.zona) ?? zs.set(u.zona, []).get(u.zona)).push(u);
    zonasUf.set(uf, [...zs.values()]);
    const cl = new Map();
    for (const zu of zs.values()) {
      const principal = [...zu].sort((a, b) => (b.y13 + b.yR) - (a.y13 + a.yR))[0].mun;
      (cl.get(principal) ?? cl.set(principal, []).get(principal)).push(zu);
    }
    clustUf.set(uf, [...cl.values()]);
  }
  return {
    P: (rnd) => { const sel = []; for (const l of porUf.values()) for (let i = 0; i < l.length; i++) sel.push([l[Math.floor(rnd() * l.length)], 0]); return sel; },
    Z: (rnd) => { const sel = []; let c = 0; for (const l of zonasUf.values()) for (let i = 0; i < l.length; i++) { c++; for (const u of l[Math.floor(rnd() * l.length)]) sel.push([u, c]); } return sel; },
    C: (rnd) => { const sel = []; let c = 0; for (const l of clustUf.values()) for (let i = 0; i < l.length; i++) { c++; for (const zu of l[Math.floor(rnd() * l.length)]) for (const u of zu) sel.push([u, c]); } return sel; },
  };
}
// Observação: no esquema P a mesma unidade sorteada duas vezes soma duas vezes na sua zona (a zona muda de composição),
// que é a leitura literal do plano ("reamostragens das unidades dentro de cada UF").

function intervalos(ano, out, opc, semente) {
  const E = esquemas(out);
  const res = {};
  for (const [nome, f] of Object.entries(E)) {
    const rnd = rng(semente + nome.charCodeAt(0));
    const acc = { B7a: [], B7b: [], madPP: [] };
    for (let r = 0; r < REPS; r++) { const e = estat(ano, f(rnd), opc); for (const k in acc) acc[k].push(e[k]); }
    res[nome] = Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, [quantil(v, ALFA / 2), quantil(v, 1 - ALFA / 2)]]));
  }
  return res;
}

const toca = (a, b) => a[0] <= b[1] && b[0] <= a[1];
const R = { geradoEm: new Date().toISOString(), reps: REPS, confianca: 1 - ALFA, anos: {}, decisao: {} };
const dados = {};
for (const ano of [2018, 2022, 2026]) {
  const m = await lerMunzona(ano);
  const { out, excluidas } = compactar(ano, m.unid);
  dados[ano] = out;
  const nomT = (t) => soma(m.total[t]);
  const R_ = RIVAL[ano];
  R.anos[ano] = {
    linhasPresidente: m.linhas - m.outrosCargos, outrosCargos: m.outrosCargos, unidades: m.unid.length, unidadesUsadas: out.length, unidadesExcluidas: excluidas,
    total: { t1: { 13: m.total[1]['13'], [R_]: m.total[1][R_], nominais: nomT(1) }, t2: { 13: m.total[2]['13'], [R_]: m.total[2][R_], nominais: nomT(2) } },
    viradaDo13NoPaisComExterior: (100 * (m.total[2]['13'] - m.total[2][R_])) / nomT(2) - (100 * (m.total[1]['13'] - m.total[1][R_])) / nomT(1),
    parteEliminados1t: 100 * (1 - (m.total[1]['13'] + m.total[1][R_]) / nomT(1)),
    plano: estat(ano, realSel(out)),
    N1doisPartidos: estat(ano, realSel(out), { doisPartidos: true }),
  };
  // Identidade exata: virada do plano = virada de dois partidos + margem de dois partidos no 1º turno × parte dos
  // eliminados no 1º turno (orientado a quem cresceu). Mede-se, entre as zonas, a dispersão do termo mecânico e a
  // correlação dele com a virada de dois partidos (se negativa, o termo "aplaina" a virada do plano).
  {
    const Z = new Map();
    for (const u of out) { const k = `${u.uf}|${u.zona}`; const z = Z.get(k) ?? Z.set(k, { n1: 0, a13: 0, aR: 0, y13: 0, yR: 0 }).get(k); for (const f of ['n1', 'a13', 'aR', 'y13', 'yR']) z[f] += u[f]; }
    const s = SINAL[ano], v2p = [], termo = [];
    for (const z of Z.values()) {
      const m2 = (100 * (z.y13 - z.yR)) / (z.y13 + z.yR), m1p = (100 * (z.a13 - z.aR)) / (z.a13 + z.aR), e = 1 - (z.a13 + z.aR) / z.n1;
      v2p.push(s * (m2 - m1p)); termo.push(s * m1p * e);
    }
    const n = v2p.length, mx = v2p.reduce((a, b) => a + b, 0) / n, my = termo.reduce((a, b) => a + b, 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) { sxy += (v2p[i] - mx) * (termo[i] - my); sxx += (v2p[i] - mx) ** 2; syy += (termo[i] - my) ** 2; }
    R.anos[ano].termoMecanico = { madTermo: mad(termo), medianaTermo: mediana(termo), correlacaoComViradaDoisPartidos: sxy / Math.sqrt(sxx * syy) };
  }
  R.anos[ano].intervalosPlano = intervalos(ano, out, {}, 5300 + ano);
  R.anos[ano].intervalosN1 = intervalos(ano, out, { doisPartidos: true }, 5310 + ano);
  console.error(ano, JSON.stringify({ ...R.anos[ano], intervalosN1: undefined }));
}
// N3: contrafactual da troca F5 do tamanho que muda o vencedor, retirada do 2026 (proporcional ao voto do 22 no 2º turno)
{
  const out = dados[2026];
  const W = out.reduce((a, u) => a + u.yR, 0);
  const cf = out.map((u) => { const v = (TROCA * u.yR) / W; return { ...u, y13: u.y13 - v, yR: u.yR + v }; });
  R.N3contrafactualSemTroca = { troca: TROCA, ...estat(2026, realSel(cf)), intervalos: intervalos(2026, cf, {}, 5399) };
  // e o inverso: a troca F5 somada ao dado real
  const mais = out.map((u) => { const v = (TROCA * u.yR) / W; return { ...u, y13: u.y13 + v, yR: u.yR - v }; });
  R.N3comTrocaAMais = estat(2026, realSel(mais));
}
for (const [rot, campoI, campoP, chave] of [['plano', 'intervalosPlano', 'plano', null], ['N1', 'intervalosN1', 'N1doisPartidos', null]]) {
  for (const esq of ['P', 'Z', 'C']) for (const f of ['B7a', 'B7b', 'madPP']) {
    const I = Object.fromEntries([2018, 2022, 2026].map((a) => [a, R.anos[a][campoI][esq][f]]));
    const fora = !toca(I[2026], I[2018]) && !toca(I[2026], I[2022]);
    const lado = !fora ? 'dentro' : I[2026][0] > Math.max(I[2018][1], I[2022][1]) ? 'acima' : I[2026][1] < Math.min(I[2018][0], I[2022][0]) ? 'abaixo' : 'entre';
    R.decisao[`${rot}|${esq}|${f}`] = { pontual: Object.fromEntries([2018, 2022, 2026].map((a) => [a, R.anos[a][campoP][f]])), intervalo: I, lado };
  }
}
{
  const I = R.N3contrafactualSemTroca.intervalos.C;
  R.N3decisao = Object.fromEntries(['B7a', 'B7b', 'madPP'].map((f) => {
    const a = I[f], h18 = R.anos[2018].intervalosPlano.C[f], h22 = R.anos[2022].intervalosPlano.C[f];
    return [f, { intervalo: a, toca2018: toca(a, h18), toca2022: toca(a, h22) }];
  }));
}
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, '53-b7.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify({ anos: Object.fromEntries(Object.entries(R.anos).map(([a, v]) => [a, { total: v.total, unidadesUsadas: v.unidadesUsadas, parteEliminados1t: v.parteEliminados1t, plano: v.plano, N1: v.N1doisPartidos }])),
  decisao: R.decisao, N3: { ...R.N3contrafactualSemTroca, intervalos: undefined }, N3decisao: R.N3decisao, N3comTrocaAMais: R.N3comTrocaAMais }, null, 1));
