// Revisor cético — achado "virada-sem-digital-e-liberacao-em-massa" (perícia tópico 4, itens 8 e 9).
// Lente: explicações alternativas e poder do teste. Universo completo (princípio 9): todas as seções do Brasil
// (sem exterior) com BU completo nos dois turnos, lidas da cópia de leitura do banco.
//  1. Reproduz a tabela por faixa com aritmética inteira (sem o 1 - bio/comp em ponto flutuante) e conta empates.
//  2. Teste dentro da zona: Δ(parcela do 13 entre 13+22) ~ parcela sem digital no 2º turno, efeito fixo de zona
//     (UF+zona) e de município, erro-padrão agrupado por zona. Variantes: Δ da parcela sem digital; sem biometria
//     cadastrada × liberação manual separadas; faixas como indicadoras.
//  3. Poder: injeta numa cópia em memória X votos 22→13 por seção (ou fração φ dos votantes sem digital) e refaz
//     a tabela por faixa e o teste dentro da zona.
//  4. Item 8: reproduz e refaz a comparação dentro da zona (diferença em diferenças pareada por zona).
// Uso: node scripts/auditoria/cetico-vsdl-alternativas.mjs  → data/parsed/auditoria/cetico/vsdl-alternativas.json
import { writeFileSync, mkdirSync } from 'node:fs';
import { abrirLeitura } from '../../src/banco-leitura.js';

const SAIDA = 'data/parsed/auditoria/cetico/vsdl-alternativas.json';
const { db, ponteiro } = await abrirLeitura();
const out = { copia: ponteiro?.criadoEm ?? 'primário', exclusoes: {} };

// ---------- carga ----------
const S = new Map(); // chave uf/mun/zona/secao → registro
for (const r of db.prepare(`SELECT turno, uf, municipio, zona, secao, situacao, tipo_urna, comparecimento c, sem_biometria sb,
    por_biometria pb, por_biografia pg FROM secao WHERE uf <> 'zz'`).iterate()) {
  const k = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
  const s = S.get(k) ?? { uf: r.uf, mun: r.municipio, zona: r.zona, secao: r.secao, t: [null, null, null], v: [null, { l: 0, f: 0 }, { l: 0, f: 0 }] };
  s.t[r.turno] = { sit: r.situacao, tipo: r.tipo_urna, c: r.c, sb: r.sb, pb: r.pb, pg: r.pg };
  S.set(k, s);
}
for (const v of db.prepare('SELECT turno, uf, municipio, zona, secao, numero, quantidade q FROM voto_bu WHERE cargo = 1 AND numero IN (13, 22) AND uf <> \'zz\'').iterate()) {
  const s = S.get(`${v.uf}/${v.municipio}/${v.zona}/${v.secao}`);
  if (!s) continue;
  if (v.numero === 13) s.v[v.turno].l += v.q; else s.v[v.turno].f += v.q;
}
const modelo = new Map();
for (const p of db.prepare("SELECT uf, municipio, zona, secao, modelo_urna_log m FROM perfil_log WHERE turno = 2 AND uf <> 'zz'").iterate())
  modelo.set(`${p.uf}/${p.municipio}/${p.zona}/${p.secao}`, p.m);
db.close();

// ---------- universo e exclusões ----------
const U = [];
const ex = { semTurno1: 0, semTurno2: 0, naoCompleta2: 0, semComparecimento2: 0, porBiometriaNull2: 0, semVoto13ou22_1: 0, semVoto13ou22_2: 0, contingencia1: 0 };
for (const s of S.values()) {
  const [, a, b] = s.t;
  if (!b) { ex.semTurno2++; continue; }
  if (b.sit !== 'completa') { ex.naoCompleta2++; continue; }
  if (!(b.c > 0)) { ex.semComparecimento2++; continue; }
  if (b.pb == null) { ex.porBiometriaNull2++; continue; }
  if (!a) { ex.semTurno1++; continue; }
  if (a.tipo === 'contingencia') ex.contingencia1++; // fica no universo (votos existem); conta-se só para registro
  U.push(s);
}
out.exclusoes = ex;
out.universo = U.length;

// faixa por aritmética inteira: sem = c - pb
const FX = ['100%', '80% a 99,9%', '50% a 79,9%', '20% a 49,9%', 'menos de 20%'];
const faixaInt = (c, pb) => { const sem = c - pb; if (sem === c) return 0; if (sem * 10 >= 8 * c) return 1; if (sem * 10 >= 5 * c) return 2; if (sem * 10 >= 2 * c) return 3; return 4; };
const faixaFloat = (c, pb) => { const p = 1 - pb / c; if (p === 1) return 0; if (p >= 0.8) return 1; if (p >= 0.5) return 2; if (p >= 0.2) return 3; return 4; };
let fronteira = 0; const fronteiraPor = {};
for (const s of U) { const fi = faixaInt(s.t[2].c, s.t[2].pb), ff = faixaFloat(s.t[2].c, s.t[2].pb); if (fi !== ff) { fronteira++; const k = `${FX[ff]}→${FX[fi]}`; fronteiraPor[k] = (fronteiraPor[k] ?? 0) + 1; } }
out.fronteiraPontoFlutuante = { secoesMalClassificadasPeloAutor: fronteira, porTroca: fronteiraPor };

// ---------- tabela por faixa ----------
function tabela(U, votos, faixaDe) {
  const g = FX.map((n) => ({ faixa: n, secoes: 0, comp2: 0, vira13: 0, vira22: 0, l1: 0, f1: 0, l2: 0, f2: 0, empate1: 0, empate2: 0, vira13ComEmpate: 0, vira22ComEmpate: 0 }));
  U.forEach((s, i) => {
    const x = g[faixaDe(s)]; const [a, b] = votos(s, i);
    x.secoes++; x.comp2 += s.t[2].c; x.l1 += a.l; x.f1 += a.f; x.l2 += b.l; x.f2 += b.f;
    x.vira13 += a.f > a.l && b.l > b.f; x.vira22 += a.l > a.f && b.f > b.l;
    x.empate1 += a.l === a.f; x.empate2 += b.l === b.f;
    x.vira13ComEmpate += a.f >= a.l && b.l > b.f && !(a.f > a.l) ; // só os que vinham de empate
    x.vira22ComEmpate += a.l >= a.f && b.f > b.l && !(a.l > a.f);
  });
  for (const x of g) { x.p1 = +(100 * x.l1 / (x.l1 + x.f1)).toFixed(2); x.p2 = +(100 * x.l2 / (x.l2 + x.f2)).toFixed(2); x.ganho = +(100 * (x.l2 / (x.l2 + x.f2) - x.l1 / (x.l1 + x.f1))).toFixed(2); }
  return g;
}
const votosReais = (s) => [s.v[1], s.v[2]];
const fInt = (s) => faixaInt(s.t[2].c, s.t[2].pb);
out.tabelaFaixaInteira = tabela(U, votosReais, fInt);
out.tabelaFaixaFloatAutor = tabela(U, votosReais, (s) => faixaFloat(s.t[2].c, s.t[2].pb)).map(({ faixa, secoes, vira13, vira22, ganho }) => ({ faixa, secoes, vira13, vira22, ganho }));

// composição regional por faixa
const REG = { ac: 'N', am: 'N', ap: 'N', pa: 'N', ro: 'N', rr: 'N', to: 'N', al: 'NE', ba: 'NE', ce: 'NE', ma: 'NE', pb: 'NE', pe: 'NE', pi: 'NE', rn: 'NE', se: 'NE', df: 'CO', go: 'CO', ms: 'CO', mt: 'CO', es: 'SE', mg: 'SE', rj: 'SE', sp: 'SE', pr: 'S', rs: 'S', sc: 'S' };
const comp = FX.map(() => ({}));
for (const s of U) { const c = comp[fInt(s)]; c[REG[s.uf]] = (c[REG[s.uf]] ?? 0) + 1; }
out.composicaoRegionalPorFaixa = FX.map((n, i) => { const tot = Object.values(comp[i]).reduce((a, b) => a + b, 0); return { faixa: n, ...Object.fromEntries(Object.entries(comp[i]).map(([r, c]) => [r, +(100 * c / tot).toFixed(1)])) }; });
const ufTop = FX.map(() => ({}));
for (const s of U) { const c = ufTop[fInt(s)]; c[s.uf] = (c[s.uf] ?? 0) + 1; }
out.ufsMaisFrequentesPorFaixa = FX.map((n, i) => ({ faixa: n, top: Object.entries(ufTop[i]).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([u, c]) => `${u}:${c}`).join(' ') }));

// ---------- regressão within com EP agrupado ----------
// linhas: { g (efeito fixo), cl (cluster), w, y, xs[] }. Retorna β, EP agrupado, t.
function within(n, gOf, clOf, wOf, yOf, xsOf, k) {
  const gm = new Map();
  for (let i = 0; i < n; i++) {
    const w = wOf(i); if (!(w > 0)) continue; const g = gOf(i); const m = gm.get(g) ?? { w: 0, y: 0, x: new Float64Array(k) };
    m.w += w; m.y += w * yOf(i); const xs = xsOf(i); for (let j = 0; j < k; j++) m.x[j] += w * xs[j]; gm.set(g, m);
  }
  const XX = Array.from({ length: k }, () => new Float64Array(k)), XY = new Float64Array(k);
  const yt = new Float64Array(n), xt = Array.from({ length: k }, () => new Float64Array(n)), ok = new Uint8Array(n);
  let N = 0;
  for (let i = 0; i < n; i++) {
    const w = wOf(i); if (!(w > 0)) continue; const m = gm.get(gOf(i)); if (m.w <= 0) continue;
    ok[i] = 1; N++; yt[i] = yOf(i) - m.y / m.w; const xs = xsOf(i);
    for (let j = 0; j < k; j++) xt[j][i] = xs[j] - m.x[j] / m.w;
    for (let a = 0; a < k; a++) { XY[a] += w * xt[a][i] * yt[i]; for (let b = 0; b < k; b++) XX[a][b] += w * xt[a][i] * xt[b][i]; }
  }
  const inv = inverter(XX); const beta = new Float64Array(k);
  for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) beta[a] += inv[a][b] * XY[b];
  const sc = new Map();
  for (let i = 0; i < n; i++) {
    if (!ok[i]) continue; const w = wOf(i); let u = yt[i]; for (let j = 0; j < k; j++) u -= beta[j] * xt[j][i];
    const c = clOf(i); const v = sc.get(c) ?? new Float64Array(k); for (let j = 0; j < k; j++) v[j] += w * xt[j][i] * u; sc.set(c, v);
  }
  const G = sc.size, M = Array.from({ length: k }, () => new Float64Array(k));
  for (const v of sc.values()) for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) M[a][b] += v[a] * v[b];
  const corr = G / (G - 1);
  const ep = new Float64Array(k);
  for (let a = 0; a < k; a++) { let s = 0; for (let p = 0; p < k; p++) for (let q = 0; q < k; q++) s += inv[a][p] * M[p][q] * inv[q][a]; ep[a] = Math.sqrt(corr * s); }
  return { N, G, efeitosFixos: gm.size, beta: [...beta], ep: [...ep], t: [...beta].map((b, j) => b / ep[j]) };
}
function inverter(A) {
  const k = A.length, M = A.map((r, i) => [...r, ...Array.from({ length: k }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < k; c++) {
    let p = c; for (let r = c + 1; r < k; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]]; const d = M[c][c];
    for (let j = 0; j < 2 * k; j++) M[c][j] /= d;
    for (let r = 0; r < k; r++) if (r !== c) { const f = M[r][c]; for (let j = 0; j < 2 * k; j++) M[r][j] -= f * M[c][j]; }
  }
  return M.map((r) => r.slice(k));
}

// vetores do universo
const n = U.length;
const zona = U.map((s) => `${s.uf}/${s.zona}`), mun = U.map((s) => `${s.uf}/${s.mun}`), ufk = U.map((s) => s.uf);
const x2 = new Float64Array(n), x1 = new Float64Array(n), sb2 = new Float64Array(n), pg2 = new Float64Array(n), V2 = new Float64Array(n);
let x1Null = 0;
U.forEach((s, i) => {
  const b = s.t[2], a = s.t[1];
  x2[i] = (b.c - b.pb) / b.c; sb2[i] = b.sb / b.c; pg2[i] = b.pg / b.c; V2[i] = s.v[2].l + s.v[2].f;
  if (a.c > 0 && a.pb != null) x1[i] = (a.c - a.pb) / a.c; else { x1[i] = NaN; x1Null++; }
});
out.exclusoes.x1IndefinidoNoTesteDeDelta = x1Null;
const share = (v) => v.l / (v.l + v.f);

function bateria(votos) { // votos(i) → [v1, v2]
  const y = new Float64Array(n), w = new Float64Array(n), wu = new Float64Array(n);
  for (let i = 0; i < n; i++) { const [a, b] = votos(i); const A = a.l + a.f, B = b.l + b.f; if (A > 0 && B > 0) { y[i] = 100 * (share(b) - share(a)); w[i] = (A + B) / 2; wu[i] = 1; } }
  const Y = (i) => y[i], W = (i) => w[i], WU = (i) => wu[i];
  const r = {};
  r.zona_x2_pesoVotos = within(n, (i) => zona[i], (i) => zona[i], W, Y, (i) => [x2[i]], 1);
  r.zona_x2_semPeso = within(n, (i) => zona[i], (i) => zona[i], WU, Y, (i) => [x2[i]], 1);
  r.municipio_x2_pesoVotos = within(n, (i) => mun[i], (i) => zona[i], W, Y, (i) => [x2[i]], 1);
  r.uf_x2_pesoVotos = within(n, (i) => ufk[i], (i) => zona[i], W, Y, (i) => [x2[i]], 1);
  r.zona_faixas = within(n, (i) => zona[i], (i) => zona[i], W, Y, (i) => [x2[i] >= 0.2 && x2[i] < 0.5 ? 1 : 0, x2[i] >= 0.5 && x2[i] < 0.8 ? 1 : 0, x2[i] >= 0.8 ? 1 : 0], 3);
  r.zona_x2_x1 = within(n, (i) => zona[i], (i) => zona[i], (i) => (Number.isNaN(x1[i]) ? 0 : w[i]), Y, (i) => [x2[i], Number.isNaN(x1[i]) ? 0 : x1[i]], 2);
  r.zona_deltaX = within(n, (i) => zona[i], (i) => zona[i], (i) => (Number.isNaN(x1[i]) ? 0 : w[i]), Y, (i) => [x2[i] - (Number.isNaN(x1[i]) ? 0 : x1[i])], 1);
  r.zona_semBio_manual = within(n, (i) => zona[i], (i) => zona[i], W, Y, (i) => [sb2[i], pg2[i]], 2);
  return r;
}
const votosBase = (i) => [U[i].v[1], U[i].v[2]];
out.testeDentroDaZona = bateria(votosBase);

// tabela por faixa com o Δ descontado da média da zona (resíduo dentro da zona), ponderado pelos votos
function faixaResidual(votos) {
  const zm = new Map(); const d = new Float64Array(n), w = new Float64Array(n);
  for (let i = 0; i < n; i++) { const [a, b] = votos(i); const A = a.l + a.f, B = b.l + b.f; if (!(A > 0 && B > 0)) continue; d[i] = 100 * (share(b) - share(a)); w[i] = (A + B) / 2; const m = zm.get(zona[i]) ?? { w: 0, d: 0 }; m.w += w[i]; m.d += w[i] * d[i]; zm.set(zona[i], m); }
  const acc = FX.map(() => ({ w: 0, r: 0, secoes: 0 }));
  for (let i = 0; i < n; i++) { if (!(w[i] > 0)) continue; const m = zm.get(zona[i]); const f = acc[fInt(U[i])]; f.w += w[i]; f.r += w[i] * (d[i] - m.d / m.w); f.secoes++; }
  return FX.map((nm, j) => ({ faixa: nm, secoes: acc[j].secoes, ganhoAcimaDaZonaPP: +(acc[j].r / acc[j].w).toFixed(3) }));
}
out.faixaDescontadaZona = faixaResidual(votosBase);

// votos: o que o β significa. Votos 13+22 dos votantes sem digital (aprox. x2·V2) e limite superior a 95%.
let semDigVotos = 0; for (let i = 0; i < n; i++) semDigVotos += x2[i] * V2[i];
const b0 = out.testeDentroDaZona.zona_x2_pesoVotos;
out.interpretacaoEmVotos = {
  votosValidos13e22DeSemDigital_aprox: Math.round(semDigVotos),
  beta_pp_por_100pc_semDigital: +b0.beta[0].toFixed(3), ep: +b0.ep[0].toFixed(3),
  // β em p.p. por 100% sem digital = fração dos votos dos sem digital trocada 22→13 (em %). Troca muda a parcela em 1 voto/V.
  votosTrocadosImplicitos: Math.round(b0.beta[0] / 100 * semDigVotos),
  limiteSuperior95: Math.round((b0.beta[0] + 1.96 * b0.ep[0]) / 100 * semDigVotos),
  limiteInferior95: Math.round((b0.beta[0] - 1.96 * b0.ep[0]) / 100 * semDigVotos),
};

// ---------- poder: injeção numa cópia ----------
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function injetar(m) { // m(i) → votos trocados 22→13 no 2º turno
  const v2 = U.map((s, i) => { const k = Math.min(Math.max(0, Math.round(m(i))), s.v[2].f); return { l: s.v[2].l + k, f: s.v[2].f - k, k }; });
  const total = v2.reduce((a, b) => a + b.k, 0);
  return { votos: (i) => [U[i].v[1], v2[i]], total, secoes: v2.filter((v) => v.k > 0).length };
}
const cenarios = [];
const resumoBat = (r) => ({
  zona_x2: { beta: +r.zona_x2_pesoVotos.beta[0].toFixed(3), ep: +r.zona_x2_pesoVotos.ep[0].toFixed(3), t: +r.zona_x2_pesoVotos.t[0].toFixed(2) },
  zona_faixas_t: r.zona_faixas.t.map((t) => +t.toFixed(2)), zona_faixas_beta: r.zona_faixas.beta.map((b) => +b.toFixed(3)),
  zona_deltaX_t: +r.zona_deltaX.t[0].toFixed(2), zona_manual_t: +r.zona_semBio_manual.t[1].toFixed(2),
});
const add = (nome, m) => {
  const inj = injetar(m); const bat = bateria(inj.votos); const tab = tabela(U, (s, i) => inj.votos(i), fInt);
  cenarios.push({ nome, votosInjetados: inj.total, secoesAlteradas: inj.secoes, ganhoPorFaixa: tab.map((x) => x.ganho), vira13PorFaixa: tab.map((x) => x.vira13), ...resumoBat(bat), faixaDescontadaZona: faixaResidual(inj.votos).map((x) => x.ganhoAcimaDaZonaPP) });
};
add('base (sem injeção)', () => 0);
for (const X of [1, 2, 3, 5, 10]) add(`${X} voto(s) por seção, todas as seções ≥ 20% sem digital`, (i) => (x2[i] >= 0.2 ? X : 0));
for (const X of [2, 5, 10, 20]) add(`${X} votos por seção, só seções ≥ 50% sem digital`, (i) => (x2[i] >= 0.5 ? X : 0));
for (const X of [5, 10, 20]) { const rnd = mulberry32(20261029 + X); add(`${X} votos em 10% (sorteio) das seções ≥ 20%`, (i) => (x2[i] >= 0.2 && rnd() < 0.1 ? X : 0)); }
for (const phi of [0.005, 0.01, 0.02, 0.05]) add(`φ=${phi * 100}% dos votos dos sem digital trocados, todas as seções`, (i) => phi * x2[i] * V2[i]);
for (const phi of [0.02, 0.05, 0.1]) add(`φ=${phi * 100}% dos votos dos liberados à mão trocados`, (i) => phi * pg2[i] * V2[i]);
out.poder = cenarios;

// ---------- item 8 ----------
const massa = new Set(), zonasMassa = new Set(), zonasUF = new Set();
let m8 = { secoes: 0, comp2: 0, manual2: 0, tambem1t: 0, cem: 0, antigas: 0 };
for (const s of S.values()) {
  const b = s.t[2]; if (!b || b.sit !== 'completa' || !(b.c > 0)) continue;
  if (b.pg * 2 >= b.c) {
    const k = `${s.uf}/${s.mun}/${s.zona}/${s.secao}`; massa.add(k); zonasMassa.add(`${s.uf}/${s.mun}/${s.zona}`); zonasUF.add(`${s.uf}/${s.zona}`);
    m8.secoes++; m8.comp2 += b.c; m8.manual2 += b.pg; m8.cem += b.pg === b.c; m8.tambem1t += s.t[1] && s.t[1].pg * 2 >= s.t[1].c ? 1 : 0;
    m8.antigas += ['UE2013', 'UE2015'].includes(modelo.get(k)) ? 1 : 0;
  }
}
m8.municipioZona = zonasMassa.size; m8.zonasEleitoraisDistintas = zonasUF.size;
// comparação pooled do autor e DiD dentro da zona
const pool = { m: { l1: 0, f1: 0, l2: 0, f2: 0, n: 0 }, r: { l1: 0, f1: 0, l2: 0, f2: 0, n: 0 } };
const porZ = new Map();
for (const s of S.values()) {
  const zk = `${s.uf}/${s.mun}/${s.zona}`; if (!zonasMassa.has(zk) || !s.t[2]) continue;
  const k = `${s.uf}/${s.mun}/${s.zona}/${s.secao}`; const g = pool[massa.has(k) ? 'm' : 'r'];
  g.l1 += s.v[1].l; g.f1 += s.v[1].f; g.l2 += s.v[2].l; g.f2 += s.v[2].f; g.n++;
  if (s.v[1].l + s.v[1].f > 0 && s.v[2].l + s.v[2].f > 0) {
    const z = porZ.get(zk) ?? { m: [], r: [] }; z[massa.has(k) ? 'm' : 'r'].push(100 * (share(s.v[2]) - share(s.v[1]))); porZ.set(zk, z);
  }
}
const pp = (g) => ({ secoes: g.n, p1: +(100 * g.l1 / (g.l1 + g.f1)).toFixed(2), p2: +(100 * g.l2 / (g.l2 + g.f2)).toFixed(2), var: +(100 * (g.l2 / (g.l2 + g.f2) - g.l1 / (g.l1 + g.f1))).toFixed(2) });
const dif = [];
for (const z of porZ.values()) if (z.m.length && z.r.length) { const mm = z.m.reduce((a, b) => a + b, 0) / z.m.length, mr = z.r.reduce((a, b) => a + b, 0) / z.r.length; for (const d of z.m) dif.push(d - mr); }
const md = dif.reduce((a, b) => a + b, 0) / dif.length, sd = Math.sqrt(dif.reduce((a, b) => a + (b - md) ** 2, 0) / (dif.length - 1));
// poder do item 8: quantos votos por seção nas 97 o DiD pegaria (|t| ≥ 2)
const sdDelta = sd; const epDiD = sd / Math.sqrt(dif.length);
let compMedio = 0; for (const k of massa) { const s = S.get(k); compMedio += s.v[2].l + s.v[2].f; } compMedio /= massa.size;
out.item8 = { ...m8, pooledAutor: { massa: pp(pool.m), resto: pp(pool.r) }, didDentroDaZona: { secoes: dif.length, mediaPP: +md.toFixed(3), ep: +epDiD.toFixed(3), t: +(md / epDiD).toFixed(2) },
  poder: { votos13e22MedioNas97: Math.round(compMedio), menorXpor_secao_t2: Math.ceil((2 * epDiD / 100) * compMedio), menorXpor_secao_t3_3: Math.ceil((3.3 * epDiD / 100) * compMedio) } };

mkdirSync('data/parsed/auditoria/cetico', { recursive: true });
writeFileSync(SAIDA, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
