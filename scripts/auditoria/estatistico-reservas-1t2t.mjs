import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';

// H14 (estatístico eleitoral): a variação 1º → 2º turno da MESMA seção é diferente nas seções que trocaram de urna
// (reserva nova no 2º turno, contingência no dia, urna de seção trocada) do que nas seções sem troca da MESMA zona?
// Diferença-em-diferenças com efeito fixo de zona (município × zona), controle do modelo da urna do 1º turno e do
// tamanho (log dos aptos), EP agrupado por zona (CR1). Três desfechos, em pontos percentuais:
//   comp = comparecimento/aptos; s13 = 13/(13+22); bn = (brancos+nulos)/comparecimento (presidente).
// Ponderação principal: pelo denominador do desfecho no 2º turno (aptos, 13+22, comparecimento) → efeito por voto;
// sem ponderação como robustez. Universo: todas as seções com BU nos dois turnos (fora: 41 sem arquivo, 31 SA).
// Entrada: data/parsed/auditoria/reservas-1t2t/secoes.csv (estatistico-reservas-1t2t-dados.mjs).
// Saída: resultado.json, efeito-uf.csv, efeito-modelo.csv, extremas-secoes.csv, extremas-zonas.csv, tabela-grupos.csv
// e os SVGs, na mesma pasta. Uso: node --max-old-space-size=8192 scripts/auditoria/estatistico-reservas-1t2t.mjs

const DIR = path.join(DIR_DADOS, 'parsed', 'auditoria', 'reservas-1t2t');
const t0 = Date.now();

// ---------- leitura ----------
const txt = readFileSync(path.join(DIR, 'secoes.csv'), 'utf8').split('\n');
const cab = txt[0].split(';');
const NUM = new Set(['agreg1', 'agreg2', 'a1', 'c1', 'v13_1', 'v22_1', 'out1', 'br1', 'nu1', 'a2', 'c2', 'v13_2', 'v22_2', 'out2', 'br2', 'nu2', 'local1', 'local2', 'urna1', 'urna2', 'votosOrig25']);
const todas = [];
for (let i = 1; i < txt.length; i++) {
  if (!txt[i]) continue;
  const c = txt[i].split(';');
  const s = {};
  cab.forEach((n, j) => { s[n] = NUM.has(n) ? (c[j] === '' ? null : Number(c[j])) : c[j]; });
  todas.push(s);
}
const FORA = new Set(['sem_bu', 'sistema_apuracao', 'so_um_turno']);
const U = todas.filter((s) => !FORA.has(s.classe));
for (const s of U) {
  s.zon = `${s.uf}/${s.municipio}/${s.zona}`;
  s.mun = `${s.uf}/${s.municipio}`;
  s.n1 = s.v13_1 + s.v22_1; s.n2 = s.v13_2 + s.v22_2;
  s.y = {
    comp: s.a1 > 0 && s.a2 > 0 ? 100 * (s.c2 / s.a2 - s.c1 / s.a1) : NaN,
    s13: s.n1 > 0 && s.n2 > 0 ? 100 * (s.v13_2 / s.n2 - s.v13_1 / s.n1) : NaN,
    bn: s.c1 > 0 && s.c2 > 0 ? 100 * ((s.br2 + s.nu2) / s.c2 - (s.br1 + s.nu1) / s.c1) : NaN,
  };
  s.w = { comp: s.a2, s13: s.n2, bn: s.c2 };
  s.mudouLocal = s.local1 !== s.local2;
  s.mudouAgreg = s.agreg1 !== s.agreg2;
  s.mudouAptos = Math.abs(s.a2 - s.a1) > 10;
  s.trocaNova = s.classe.startsWith('contingencia_dia') || s.classe === 'secao_reserva_antes' || s.classe === 'reserva_reserva_antes';
}
const DESF = { comp: 'comparecimento / aptos', s13: 'parcela do 13 em 13+22', bn: 'brancos+nulos / comparecimento' };

// ---------- grupos (item 1) ----------
const GRUPOS = [
  ['controle', 'Sem troca (mesma urna de seção nos dois turnos) — controle'],
  ['contingencia_dia_com_votos', 'Contingência no dia 25/10, urna original já tinha votos'],
  ['contingencia_dia_antes_abertura', 'Contingência no dia 25/10, antes do 1º voto'],
  ['secao_reserva_antes', 'Troca nova antes do dia: urna de seção (1T) → reserva (2T)'],
  ['reserva_reserva_antes', 'Troca nova antes do dia: reserva (1T) → outra reserva (2T)'],
  ['secao_secao', 'Outra urna de seção no 2T, sem contingência no BU'],
  ['reserva_secao', 'Reserva (1T) → urna de seção (2T), outra urna'],
  ['reserva_herdada', 'Mesma reserva do 1T mantida no 2T (sem troca nova)'],
  ['outros_mesma_urna', 'Mesma urna, tipo mudou (reserva↔seção)'],
];
const grupoDe = (s) => (s.classe === 'reserva_secao_mesma' || s.classe === 'secao_reserva_mesma' ? 'outros_mesma_urna' : s.classe);
const soma = (l, f) => l.reduce((a, s) => a + (f(s) ?? 0), 0);
const pct = (a, b) => (b ? (100 * a) / b : NaN);
const tabela = GRUPOS.map(([g, rot]) => {
  const l = U.filter((s) => grupoDe(s) === g);
  const t = { grupo: g, rotulo: rot, secoes: l.length };
  for (const k of ['a1', 'c1', 'v13_1', 'v22_1', 'out1', 'br1', 'nu1', 'a2', 'c2', 'v13_2', 'v22_2', 'out2', 'br2', 'nu2']) t[k] = soma(l, (s) => s[k]);
  t.comp1 = pct(t.c1, t.a1); t.comp2 = pct(t.c2, t.a2);
  t.s13_1 = pct(t.v13_1, t.v13_1 + t.v22_1); t.s13_2 = pct(t.v13_2, t.v13_2 + t.v22_2);
  t.bn1 = pct(t.br1 + t.nu1, t.c1); t.bn2 = pct(t.br2 + t.nu2, t.c2);
  t.mudouLocal = l.filter((s) => s.mudouLocal).length; t.mudouAgreg = l.filter((s) => s.mudouAgreg).length; t.mudouAptos = l.filter((s) => s.mudouAptos).length;
  return t;
});
const tn = U.filter((s) => s.trocaNova);
const linhaTN = { grupo: 'troca_nova_total', rotulo: 'Trocas novas por reserva (soma das 4 primeiras linhas de troca)', secoes: tn.length };
for (const k of ['a1', 'c1', 'v13_1', 'v22_1', 'out1', 'br1', 'nu1', 'a2', 'c2', 'v13_2', 'v22_2', 'out2', 'br2', 'nu2']) linhaTN[k] = soma(tn, (s) => s[k]);
Object.assign(linhaTN, { comp1: pct(linhaTN.c1, linhaTN.a1), comp2: pct(linhaTN.c2, linhaTN.a2), s13_1: pct(linhaTN.v13_1, linhaTN.v13_1 + linhaTN.v22_1),
  s13_2: pct(linhaTN.v13_2, linhaTN.v13_2 + linhaTN.v22_2), bn1: pct(linhaTN.br1 + linhaTN.nu1, linhaTN.c1), bn2: pct(linhaTN.br2 + linhaTN.nu2, linhaTN.c2),
  mudouLocal: tn.filter((s) => s.mudouLocal).length, mudouAgreg: tn.filter((s) => s.mudouAgreg).length, mudouAptos: tn.filter((s) => s.mudouAptos).length });
tabela.splice(5, 0, linhaTN);

// ---------- regressão com efeito fixo absorvido e EP agrupado ----------
function inverter(M) {
  const n = M.length;
  const escalaDiag = Math.max(1e-300, ...M.map((r, i) => Math.abs(r[i])));
  const A = M.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    const d = A[c][c];
    if (Math.abs(d) < 1e-10 * escalaDiag) return null;
    for (let j = 0; j < 2 * n; j++) A[c][j] /= d;
    for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c]; for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[c][j]; }
  }
  return A.map((r) => r.slice(n));
}
/** y ~ x | efeito fixo de grupo, MQ ponderado, EP CR1 agrupado. Colunas sem variação dentro dos grupos saem (null). */
function mqef(lista, { y, x, nomes, w, grupo = (s) => s.zon, cluster = (s) => s.zon }) {
  let L = lista.map((s) => ({ s, y: y(s), x: x(s), w: w(s), g: grupo(s) })).filter((l) => Number.isFinite(l.y) && l.w > 0);
  const k0 = nomes.length;
  const acc = new Map();
  for (const l of L) {
    let a = acc.get(l.g);
    if (!a) { a = { w: 0, y: 0, x: new Float64Array(k0), n: 0 }; acc.set(l.g, a); }
    a.w += l.w; a.y += l.w * l.y; a.n++;
    for (let j = 0; j < k0; j++) a.x[j] += l.w * l.x[j];
  }
  L = L.filter((l) => acc.get(l.g).n > 1);
  for (const l of L) { const a = acc.get(l.g); l.y -= a.y / a.w; l.x = l.x.map((v, j) => v - a.x[j] / a.w); }
  // descarta colunas sem variação
  const ss = new Float64Array(k0);
  for (const l of L) for (let j = 0; j < k0; j++) ss[j] += l.w * l.x[j] * l.x[j];
  const usa = [...ss].map((v, j) => (v > 1e-9 ? j : -1)).filter((j) => j >= 0);
  for (const l of L) l.x = usa.map((j) => l.x[j]);
  let k = usa.length;
  const XtX = Array.from({ length: k }, () => new Array(k).fill(0));
  const Xty = new Array(k).fill(0);
  for (const l of L) for (let a = 0; a < k; a++) { Xty[a] += l.w * l.x[a] * l.y; for (let c = a; c < k; c++) XtX[a][c] += l.w * l.x[a] * l.x[c]; }
  for (let a = 0; a < k; a++) for (let c = 0; c < a; c++) XtX[a][c] = XtX[c][a];
  // Colunas colineares com as anteriores (ex.: UE2013 só em zonas inteiras de UE2013: os indicadores dos outros modelos
  // somam uma constante dentro da zona) saem. Teste: complemento de Schur da coluna sobre as já aceitas < 1e-9 do seu Σw·x².
  // As colunas de tratamento vêm primeiro e por isso nunca saem por causa dos controles.
  const aceitas = [];
  for (let j = 0; j < k; j++) {
    if (!aceitas.length) { aceitas.push(j); continue; }
    const iS = inverter(aceitas.map((a) => aceitas.map((c) => XtX[a][c])));
    const v = aceitas.map((a) => XtX[a][j]);
    const schur = XtX[j][j] - v.reduce((acc, x, a) => acc + x * iS[a].reduce((t, y, c) => t + y * v[c], 0), 0);
    if (iS && schur > 1e-9 * XtX[j][j]) aceitas.push(j);
  }
  if (aceitas.length < k) {
    const sub = (M) => aceitas.map((a) => aceitas.map((c) => M[a][c]));
    const novo = { XtX: sub(XtX), Xty: aceitas.map((a) => Xty[a]) };
    for (const l of L) l.x = aceitas.map((a) => l.x[a]);
    usa.splice(0, usa.length, ...aceitas.map((a) => usa[a]));
    XtX.splice(0, XtX.length, ...novo.XtX); Xty.splice(0, Xty.length, ...novo.Xty);
    k = aceitas.length;
  }
  const inv = inverter(XtX);
  if (!inv) return null;
  const b = inv.map((r) => r.reduce((s2, v, j) => s2 + v * Xty[j], 0));
  const cl = new Map();
  let ssr = 0, sw = 0;
  for (const l of L) {
    const e = l.y - l.x.reduce((s2, v, j) => s2 + v * b[j], 0);
    ssr += l.w * e * e; sw += l.w;
    const c = cluster(l.s);
    let g = cl.get(c);
    if (!g) { g = new Float64Array(k); cl.set(c, g); }
    for (let a = 0; a < k; a++) g[a] += l.w * l.x[a] * e;
  }
  const G = cl.size, n = L.length;
  const meat = Array.from({ length: k }, () => new Array(k).fill(0));
  for (const g of cl.values()) for (let a = 0; a < k; a++) for (let c = 0; c < k; c++) meat[a][c] += g[a] * g[c];
  const f = G > 1 ? (G / (G - 1)) * ((n - 1) / (n - k)) : NaN;
  const IM = inv.map((r) => meat.map((_, c) => r.reduce((s2, v, j) => s2 + v * meat[j][c], 0)));
  const V = IM.map((r) => inv.map((_, c) => f * r.reduce((s2, v, j) => s2 + v * inv[j][c], 0)));
  const out = {};
  usa.forEach((j, i) => { out[nomes[j]] = { b: b[i], ep: Math.sqrt(V[i][i]) }; });
  return { coef: out, n, G, rmse: Math.sqrt(ssr / sw) };
}

// ---------- normal ----------
function erfc(x) {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 +
    t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}
const p2 = (z) => erfc(Math.abs(z) / Math.SQRT2);
function zDe(p) { let lo = 0, hi = 40; for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (p2(m) > p) lo = m; else hi = m; } return (lo + hi) / 2; }
function bh(ps) {
  const m = ps.length; const o = ps.map((p, i) => [p, i]).sort((a, b) => a[0] - b[0]); const q = new Array(m); let min = 1;
  for (let k = m - 1; k >= 0; k--) { const [p, i] = o[k]; min = Math.min(min, (p * m) / (k + 1)); q[i] = min; }
  return q;
}
const Z80 = 0.8416;

// ---------- desenho do modelo ----------
const MODELOS = ['ue2015', 'ue2020', 'ue2022']; // base: ue2013
const TRAT = ['contingencia_dia_com_votos', 'contingencia_dia_antes_abertura', 'secao_reserva_antes', 'reserva_reserva_antes', 'secao_secao', 'reserva_secao', 'reserva_herdada', 'outros_mesma_urna'];
// Modelos usados como indicadores: os presentes no subconjunto, menos o primeiro deles (base). Num subconjunto sem UE2013
// (ex.: uma UF), usar as três outras como indicadores somaria 1 e ficaria colinear com o efeito fixo de zona.
const TODOS_MODELOS = ['ue2013', ...MODELOS];
const modelosDe = (lista) => TODOS_MODELOS.filter((m) => lista.some((s) => s.modelo1 === m)).slice(1);
const ctrl = (s, extra = [], mods = MODELOS) => [...mods.map((m) => (s.modelo1 === m ? 1 : 0)), Math.log(Math.max(s.a2, 1)), ...extra.map((f) => f(s))];
const nomesCtrl = (extra = [], mods = MODELOS) => [...mods.map((m) => `modelo1=${m}`), 'log_aptos', ...extra.map((_, i) => `extra${i}`)];
const EXTRAS = [(s) => (s.mudouLocal ? 1 : 0), (s) => (s.mudouAgreg ? 1 : 0), (s) => (s.mudouAptos ? 1 : 0), (s) => Math.abs(s.a2 - s.a1) / Math.max(s.a2, 1)];

const ajustar = (lista, d, { porGrupo = true, ponderar = true, extra = [], grupo } = {}) => {
  const tr = porGrupo ? TRAT : ['trocaNova', 'outrasTrocas'];
  const xt = porGrupo ? (s) => TRAT.map((g) => (grupoDe(s) === g ? 1 : 0)) : (s) => [s.trocaNova ? 1 : 0, !s.trocaNova && grupoDe(s) !== 'controle' ? 1 : 0];
  const mods = modelosDe(lista);
  return mqef(lista, { y: (s) => s.y[d], x: (s) => [...xt(s), ...ctrl(s, extra, mods)], nomes: [...tr, ...nomesCtrl(extra, mods)], w: ponderar ? (s) => s.w[d] : () => 1, ...(grupo ? { grupo } : {}) });
};
const efeito = (c, alfa = 0.05) => {
  if (!c) return null;
  const z = c.b / c.ep; const zc = zDe(alfa);
  return { pp: c.b, ep: c.ep, ic95: [c.b - 1.96 * c.ep, c.b + 1.96 * c.ep], z, p: p2(z), mde80: (zc + Z80) * c.ep };
};
// soma dos denominadores nas seções tratadas (para converter p.p. em votos)
const base = (lista, d) => soma(lista, (s) => (Number.isFinite(s.y[d]) ? s.w[d] : 0));

const R = { universo: { secoes: U.length, fora: todas.length - U.length, classes: Object.fromEntries(GRUPOS.map(([g]) => [g, U.filter((s) => grupoDe(s) === g).length])) }, testes: {} };
let nTestes = 0;

// (a) confirmatório: trocas novas (2.818) × controle, 3 desfechos, Bonferroni por 3
const ALFA_CONF = 0.05 / 3;
R.confirmatorio = {};
for (const d of Object.keys(DESF)) {
  const aj = ajustar(U, d, { porGrupo: false });
  const e = efeito(aj.coef.trocaNova, ALFA_CONF);
  const nb = base(tn, d);
  R.confirmatorio[d] = { desfecho: DESF[d], ...e, pBonf3: Math.min(1, e.p * 3), votos: (e.pp / 100) * nb, ic95Votos: e.ic95.map((v) => (v / 100) * nb), mde80Votos: (e.mde80 / 100) * nb, baseVotos: nb, n: aj.n, zonas: aj.G };
  nTestes++;
}
// (b) por grupo (exploratório), ponderado e sem ponderar; com e sem efeito fixo de zona e sem controle de modelo (para ver o confundimento)
R.porGrupo = {};
for (const d of Object.keys(DESF)) {
  const aj = ajustar(U, d);
  const ajNP = ajustar(U, d, { ponderar: false });
  const ajExt = ajustar(U, d, { extra: EXTRAS });
  R.porGrupo[d] = Object.fromEntries(TRAT.map((g) => {
    const lg = U.filter((s) => grupoDe(s) === g);
    const nb = base(lg, d);
    const e = efeito(aj.coef[g]);
    nTestes++;
    return [g, { secoes: lg.length, ...e, votos: e ? (e.pp / 100) * nb : null, semPeso: efeito(ajNP.coef[g]), comLocalAgregAptos: efeito(ajExt.coef[g]) }];
  }));
}
// (c) explicações alternativas: sem efeito fixo de zona (só UF), sem controle de modelo, excluindo mudanças de local/agregação/aptos
R.alternativas = {};
const semMud = U.filter((s) => !s.mudouLocal && !s.mudouAgreg && !s.mudouAptos);
for (const d of Object.keys(DESF)) {
  const bruto = (() => { // diferença simples de médias ponderadas
    const m = (l) => soma(l, (s) => (Number.isFinite(s.y[d]) ? s.w[d] * s.y[d] : 0)) / base(l, d);
    return m(tn) - m(U.filter((s) => grupoDe(s) === 'controle'));
  })();
  const soUf = ajustar(U, d, { porGrupo: false, grupo: (s) => s.uf });
  const semModelo = mqef(U, { y: (s) => s.y[d], x: (s) => [s.trocaNova ? 1 : 0, !s.trocaNova && grupoDe(s) !== 'controle' ? 1 : 0, Math.log(Math.max(s.a2, 1))], nomes: ['trocaNova', 'outras', 'log_aptos'], w: (s) => s.w[d] });
  const so = ajustar(semMud, d, { porGrupo: false });
  const comExtras = ajustar(U, d, { porGrupo: false, extra: EXTRAS });
  R.alternativas[d] = { diferencaBruta: bruto, efeitoFixoUf: efeito(soUf.coef.trocaNova), efeitoFixoZonaSemModelo: efeito(semModelo.coef.trocaNova), principal: R.confirmatorio[d],
    excluindoMudancas: { ...efeito(so.coef.trocaNova), secoes: semMud.length, trocasNovas: semMud.filter((s) => s.trocaNova).length }, comControlesMudanca: efeito(comExtras.coef.trocaNova),
    mudancas: { trocaNova: { local: tn.filter((s) => s.mudouLocal).length, agreg: tn.filter((s) => s.mudouAgreg).length, aptos: tn.filter((s) => s.mudouAptos).length, n: tn.length },
      controle: (() => { const c = U.filter((s) => grupoDe(s) === 'controle'); return { local: c.filter((s) => s.mudouLocal).length, agreg: c.filter((s) => s.mudouAgreg).length, aptos: c.filter((s) => s.mudouAptos).length, n: c.length }; })() } };
}
// (d) por modelo da urna do 1º turno: interação troca nova × modelo
R.porModelo = {};
for (const d of Object.keys(DESF)) {
  const MOD = ['ue2013', ...MODELOS];
  const aj = mqef(U, { y: (s) => s.y[d], x: (s) => [...MOD.map((m) => (s.trocaNova && s.modelo1 === m ? 1 : 0)), !s.trocaNova && grupoDe(s) !== 'controle' ? 1 : 0, ...ctrl(s)],
    nomes: [...MOD.map((m) => `tn_${m}`), 'outras', ...nomesCtrl()], w: (s) => s.w[d] });
  R.porModelo[d] = MOD.map((m) => {
    const l = tn.filter((s) => s.modelo1 === m); const nb = base(l, d); const e = efeito(aj.coef[`tn_${m}`]);
    return { modelo: m, trocasNovas: l.length, ...e, votos: e ? (e.pp / 100) * nb : null };
  });
  const q = bh(R.porModelo[d].map((r) => r.p));
  R.porModelo[d].forEach((r, i) => { r.qBH = q[i]; r.pBonf = Math.min(1, r.p * R.porModelo[d].length); });
  nTestes += MOD.length;
}
// (e) por UF (regressão dentro da UF)
R.porUf = {};
const UFS = [...new Set(U.map((s) => s.uf))].sort();
for (const d of Object.keys(DESF)) {
  const linhas = [];
  for (const uf of UFS) {
    const l = U.filter((s) => s.uf === uf); const lt = l.filter((s) => s.trocaNova);
    if (lt.length < 3) { linhas.push({ uf, trocasNovas: lt.length, pp: null }); continue; }
    const aj = ajustar(l, d, { porGrupo: false });
    const e = efeito(aj?.coef.trocaNova);
    const nb = base(lt, d);
    linhas.push({ uf, trocasNovas: lt.length, secoes: l.length, ...e, votos: e ? (e.pp / 100) * nb : null, zonas: aj?.G });
  }
  const val = linhas.filter((r) => r.p !== undefined && r.p !== null && Number.isFinite(r.p));
  const q = bh(val.map((r) => r.p));
  val.forEach((r, i) => { r.qBH = q[i]; r.pBonf = Math.min(1, r.p * val.length); r.mdeBonf80 = (zDe(0.05 / val.length) + Z80) * r.ep; });
  nTestes += val.length;
  R.porUf[d] = linhas;
}

// ---------- teste de permutação (inferência por aleatorização) ----------
// H0: dentro de cada estrato (zona × modelo da urna do 1º turno), a troca nova caiu em seções escolhidas ao acaso
// quanto à variação 1T→2T. Estatística: T = Σ_estratos [Σ_trocadas w·u − (Σ w trocadas)·média ponderada do controle do
// estrato] / Σ w trocadas, com u = Δ descontado o efeito do tamanho (log aptos, coeficiente nacional). Em cada sorteio,
// as k trocas de cada estrato vão para k seções sorteadas do estrato (trocadas + controle). p bilateral = (1 + nº de
// sorteios com |T| ≥ |T observado|) / (N + 1). Não depende de normalidade nem de EP agrupado: serve para UF e zona com
// poucas trocas, em que o EP agrupado subestima a incerteza.
const NPERM = 5000;
function gerador(semente) {
  let a = semente >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const ZONAS_FOCO = new Set(['se/31054/0001', 'se/31054/0002']);
function permutar(d, vals) {
  const est = new Map();
  for (const s of vals) {
    if (!(s.trocaNova || grupoDe(s) === 'controle')) continue;
    const k = `${s.zon}|${s.modelo1}`;
    let e = est.get(k);
    if (!e) { e = { chaves: ['BR', `uf:${s.uf}`, `m:${s.modelo1}`, ...(ZONAS_FOCO.has(s.zon) ? [`z:${s.zon}`] : [])], w: [], u: [], tr: [], A: 0, W: 0 }; est.set(k, e); }
    e.w.push(s.w[d]); e.u.push(s.u); e.tr.push(s.trocaNova ? 1 : 0); e.A += s.w[d] * s.u; e.W += s.w[d];
  }
  let semControle = 0;
  const L = [];
  for (const e of est.values()) {
    const t = e.tr.reduce((a, b) => a + b, 0);
    if (!t) continue;
    if (t === e.w.length) { semControle += t; continue; }
    L.push({ ...e, t, n: e.w.length, idx: Int32Array.from({ length: e.w.length }, (_, i) => i) });
  }
  const chaves = [...new Set(L.flatMap((e) => e.chaves))];
  const pos = new Map(chaves.map((c, i) => [c, i]));
  const num = new Float64Array(chaves.length), den = new Float64Array(chaves.length);
  const contrib = (e, sel) => { let a = 0, wt = 0; for (const i of sel) { a += e.w[i] * e.u[i]; wt += e.w[i]; } return [a - (wt * (e.A - a)) / (e.W - wt), wt]; };
  const acumular = (e, c, wt) => { for (const k of e.chaves) { const j = pos.get(k); num[j] += c; den[j] += wt; } };
  // observado
  num.fill(0); den.fill(0);
  const tratados = new Float64Array(chaves.length);
  for (const e of L) { const sel = e.tr.flatMap((v, i) => (v ? [i] : [])); const [c, wt] = contrib(e, sel); acumular(e, c, wt); for (const k of e.chaves) tratados[pos.get(k)] += e.t; }
  const obs = Array.from(num, (v, j) => v / den[j]);
  const baseW = Array.from(den);
  const rnd = gerador(20261025 + d.length);
  const maiores = new Int32Array(chaves.length); const sm = new Float64Array(chaves.length); const sq = new Float64Array(chaves.length);
  for (let it = 0; it < NPERM; it++) {
    num.fill(0); den.fill(0);
    for (const e of L) {
      const ix = e.idx;
      for (let i = 0; i < e.t; i++) { const j = i + Math.floor(rnd() * (e.n - i)); const tmp = ix[i]; ix[i] = ix[j]; ix[j] = tmp; }
      let a = 0, wt = 0;
      for (let i = 0; i < e.t; i++) { a += e.w[ix[i]] * e.u[ix[i]]; wt += e.w[ix[i]]; }
      acumular(e, a - (wt * (e.A - a)) / (e.W - wt), wt);
    }
    for (let j = 0; j < chaves.length; j++) { const T = num[j] / den[j]; sm[j] += T; sq[j] += T * T; if (Math.abs(T) >= Math.abs(obs[j]) - 1e-12) maiores[j]++; }
  }
  const out = { semControle, estratos: L.length, nPerm: NPERM };
  chaves.forEach((c, j) => {
    const media = sm[j] / NPERM; const dp = Math.sqrt(Math.max(0, sq[j] / NPERM - media * media));
    out[c] = { T: obs[j], dpPerm: dp, ic95: [obs[j] - 1.96 * dp, obs[j] + 1.96 * dp], p: (1 + maiores[j]) / (NPERM + 1), trocas: tratados[j], baseVotos: baseW[j], votos: (obs[j] / 100) * baseW[j] };
  });
  return out;
}

// ---------- resíduos (item 3) ----------
// Resíduo = Δ observado − previsão pelos controles (modelo, tamanho) − média ponderada da zona nas seções de controle.
// Escala robusta: MAD dos resíduos do controle por faixa de tamanho (decis do denominador). z = resíduo / (1,4826·MAD).
R.residuos = {};
const extremasSecoes = [];
const zonasOut = [];
for (const d of Object.keys(DESF)) {
  const aj = ajustar(U, d);
  const cf = aj.coef;
  const pred = (s) => MODELOS.reduce((a, m) => a + (s.modelo1 === m ? cf[`modelo1=${m}`]?.b ?? 0 : 0), 0) + (cf.log_aptos?.b ?? 0) * Math.log(Math.max(s.a2, 1));
  const zacc = new Map();
  for (const s of U) {
    if (!Number.isFinite(s.y[d]) || !(s.w[d] > 0)) continue;
    s.u = s.y[d] - pred(s);
    if (grupoDe(s) !== 'controle') continue;
    const a = zacc.get(s.zon) ?? { w: 0, u: 0 };
    a.w += s.w[d]; a.u += s.w[d] * s.u; zacc.set(s.zon, a);
  }
  const vals = U.filter((s) => Number.isFinite(s.y[d]) && s.w[d] > 0 && zacc.has(s.zon));
  for (const s of vals) s.res = s.u - zacc.get(s.zon).u / zacc.get(s.zon).w;
  const ctrlV = vals.filter((s) => grupoDe(s) === 'controle').map((s) => s.w[d]).sort((a, b) => a - b);
  const cortes = Array.from({ length: 9 }, (_, i) => ctrlV[Math.floor(((i + 1) / 10) * ctrlV.length)]);
  const faixa = (s) => { let f = 0; while (f < 9 && s.w[d] > cortes[f]) f++; return f; };
  const porFaixa = Array.from({ length: 10 }, () => []);
  for (const s of vals) if (grupoDe(s) === 'controle') porFaixa[faixa(s)].push(s.res);
  const med = (a) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
  const escala = porFaixa.map((a) => { const m = med(a); return 1.4826 * med(a.map((v) => Math.abs(v - m))); });
  for (const s of vals) { s.z = s.res / escala[faixa(s)]; s.zs = s.zs ?? {}; s.zs[d] = s.z; s.rs = s.rs ?? {}; s.rs[d] = s.res; }
  // Calibração empírica: p bilateral de |z| pela distribuição das 491 mil seções de controle (as caudas reais são mais
  // grossas que a normal). z* = quantil normal desse p, usado no Stouffer das zonas.
  const absC = Float64Array.from(vals.filter((s) => grupoDe(s) === 'controle').map((s) => Math.abs(s.z))).sort();
  const pEmp = (z) => { const a = Math.abs(z); let lo = 0, hi = absC.length; while (lo < hi) { const m = (lo + hi) >> 1; if (absC[m] < a) lo = m + 1; else hi = m; } return (absC.length - lo + 1) / (absC.length + 1); };
  for (const s of vals) { s.pe = s.pe ?? {}; s.pe[d] = pEmp(s.z); s.zst = s.zst ?? {}; s.zst[d] = Math.sign(s.z) * zDe(Math.min(1, s.pe[d])); }
  R.perm = R.perm ?? {};
  R.perm[d] = permutar(d, vals);
  console.log(`permutação ${d}: ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  // cauda: fração com |z| > 3 e > 5 em cada grupo
  const cauda = Object.fromEntries([['controle'], ...TRAT.map((g) => [g]), ['troca_nova']].map(([g]) => {
    const l = vals.filter((s) => (g === 'troca_nova' ? s.trocaNova : grupoDe(s) === g));
    const n3 = l.filter((s) => Math.abs(s.z) > 3).length; const n5 = l.filter((s) => Math.abs(s.z) > 5).length;
    const pos3 = l.filter((s) => s.z > 3).length; const neg3 = l.filter((s) => s.z < -3).length;
    return [g, { n: l.length, alem3: n3, pct3: pct(n3, l.length), alem5: n5, pct5: pct(n5, l.length), acima3: pos3, abaixo3: neg3 }];
  }));
  // binomial (aprox. normal) da fração além de 3 nas trocas novas contra a do controle
  const p0 = cauda.controle.alem3 / cauda.controle.n; const nT = cauda.troca_nova.n; const xT = cauda.troca_nova.alem3;
  const zc = (xT - nT * p0) / Math.sqrt(nT * p0 * (1 - p0));
  // histograma (p.p.) dos resíduos: trocas novas × controle
  const bins = []; const LIM = d === 'comp' ? 15 : d === 's13' ? 15 : 10; const PASSO = 0.5;
  for (let x = -LIM; x < LIM; x += PASSO) bins.push({ de: x, ate: x + PASSO, controle: 0, troca: 0 });
  let ctrlN = 0, trN = 0, ctrlFora = 0, trFora = 0;
  for (const s of vals) {
    const isT = s.trocaNova; const isC = grupoDe(s) === 'controle';
    if (!isT && !isC) continue;
    if (isT) trN++; else ctrlN++;
    const i = Math.floor((s.res + LIM) / PASSO);
    if (i < 0 || i >= bins.length) { if (isT) trFora++; else ctrlFora++; continue; }
    if (isT) bins[i].troca++; else bins[i].controle++;
  }
  const medPond = (l) => soma(l, (s) => s.w[d] * s.res) / soma(l, (s) => s.w[d]);
  R.residuos[d] = { escalaPorFaixa: escala, cortesFaixa: cortes, cauda, zCaudaTrocaNova: zc, pCaudaTrocaNova: p2(zc),
    mediaPondResiduo: { trocaNova: medPond(vals.filter((s) => s.trocaNova)), controle: medPond(vals.filter((s) => grupoDe(s) === 'controle')) },
    histograma: { bins, ctrlN, trN, ctrlFora, trFora, passo: PASSO } };
  // zonas: soma de z das trocas novas (Stouffer) e resíduo médio ponderado
  const zz = new Map();
  for (const s of vals) {
    if (!s.trocaNova) continue;
    const a = zz.get(s.zon) ?? { zona: s.zon, k: 0, sz: 0, w: 0, wr: 0, votos: 0 };
    a.k++; a.sz += s.zst[d]; a.w += s.w[d]; a.wr += s.w[d] * s.res; a.votos += (s.res / 100) * s.w[d]; zz.set(s.zon, a);
  }
  const zl = [...zz.values()].map((a) => ({ desfecho: d, zona: a.zona, trocasNovas: a.k, stouffer: a.sz / Math.sqrt(a.k), residuoMedioPP: a.wr / a.w, votosLiquidos: a.votos }));
  zl.forEach((r) => { r.p = p2(r.stouffer); r.pBonf = Math.min(1, r.p * zl.length * 3); });
  R.residuos[d].zonasTestadas = zl.length;
  R.residuos[d].zonasBonf005 = zl.filter((r) => r.pBonf < 0.05).length;
  zonasOut.push(...zl);
  nTestes += zl.length;
}
// seções extremas: trocas novas e trocas de seção, por |z| máximo entre os 3 desfechos
for (const s of U) {
  if (!s.zs || grupoDe(s) === 'controle') continue;
  const ds = Object.keys(DESF).filter((d) => Number.isFinite(s.zs[d]));
  if (!ds.length) continue;
  const dMax = ds.reduce((a, b) => (Math.abs(s.zs[b]) > Math.abs(s.zs[a]) ? b : a));
  extremasSecoes.push({ secao: `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`, classe: s.classe, trocaNova: s.trocaNova ? 1 : 0, modelo1: s.modelo1, desfecho: dMax, z: s.zs[dMax], pEmp: s.pe[dMax], residuoPP: s.rs[dMax],
    a1: s.a1, a2: s.a2, c1: s.c1, c2: s.c2, s13_1: pct(s.v13_1, s.n1), s13_2: pct(s.v13_2, s.n2), bn1: pct(s.br1 + s.nu1, s.c1), bn2: pct(s.br2 + s.nu2, s.c2),
    v13_1: s.v13_1, v22_1: s.v22_1, v13_2: s.v13_2, v22_2: s.v22_2, local1: s.local1, local2: s.local2, agreg1: s.agreg1, agreg2: s.agreg2, votosOrig25: s.votosOrig25,
    motivo: [s.mudouLocal ? 'mudou de local' : '', s.mudouAgreg ? `agregadas ${s.agreg1}→${s.agreg2}` : '', s.mudouAptos ? `aptos ${s.a1}→${s.a2}` : '', s.c1 < 30 || s.c2 < 30 ? 'seção pequena' : ''].filter(Boolean).join('; ') });
}
extremasSecoes.sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
const nZtrat = extremasSecoes.length;
// Bonferroni das seções: 3 desfechos × seções com troca
const zBonfSec = zDe(0.05 / (3 * nZtrat));
extremasSecoes.forEach((r) => { r.pBonf = Math.min(1, r.pEmp * 3 * nZtrat); });
R.extremas = { secoesComTroca: nZtrat, trocasNovas: extremasSecoes.filter((r) => r.trocaNova).length, zBonferroniNormal: zBonfSec, pMinimoPossivel: 1 / (491843 + 1),
  acimaBonferroniEmpirico: extremasSecoes.filter((r) => r.pBonf < 0.05).length, pEmpMenor1e4: extremasSecoes.filter((r) => r.pEmp < 1e-4).length,
  esperadoPEmpMenor1e4: 3 * nZtrat * 1e-4 };
nTestes += 3 * nZtrat;

// Aracaju (SE 31054/0001 e 0002)
R.aracaju = {};
for (const z of ['se/31054/0001', 'se/31054/0002']) {
  const l = U.filter((s) => s.zon === z);
  const r = { secoes: l.length, classes: {} };
  for (const s of l) r.classes[grupoDe(s)] = (r.classes[grupoDe(s)] ?? 0) + 1;
  for (const d of Object.keys(DESF)) {
    const mods = modelosDe(l);
    const aj = mqef(l, { y: (s) => s.y[d], x: (s) => [s.trocaNova ? 1 : 0, !s.trocaNova && grupoDe(s) !== 'controle' ? 1 : 0, ...ctrl(s, [], mods)],
      nomes: ['trocaNova', 'outras', ...nomesCtrl([], mods)], w: (s) => s.w[d], grupo: () => 0, cluster: (s) => s.secao });
    const lt = l.filter((s) => s.trocaNova); const nb = base(lt, d);
    const e = efeito(aj?.coef.trocaNova);
    const zs = lt.map((s) => s.zs?.[d]).filter(Number.isFinite);
    r[d] = { ...e, votos: e ? (e.pp / 100) * nb : null, stouffer: zs.reduce((a, b) => a + b, 0) / Math.sqrt(zs.length), maxAbsZ: Math.max(...zs.map(Math.abs)) };
    nTestes++;
  }
  r.modelos1Troca = Object.fromEntries([...new Set(l.filter((s) => s.trocaNova).map((s) => s.modelo1))].map((m) => [m, l.filter((s) => s.trocaNova && s.modelo1 === m).length]));
  r.trocas = l.filter((s) => s.trocaNova).map((s) => ({ secao: s.secao, classe: s.classe, modelo1: s.modelo1, a2: s.a2, s13_1: +pct(s.v13_1, s.n1).toFixed(2), s13_2: +pct(s.v13_2, s.n2).toFixed(2),
    comp1: +pct(s.c1, s.a1).toFixed(2), comp2: +pct(s.c2, s.a2).toFixed(2), zS13: +(s.zs?.s13 ?? NaN).toFixed(2), zComp: +(s.zs?.comp ?? NaN).toFixed(2), zBn: +(s.zs?.bn ?? NaN).toFixed(2) }));
  R.aracaju[z] = r;
}
for (const d of Object.keys(DESF)) {
  const P = R.perm[d];
  for (const r of R.porUf[d]) {
    const q = P[`uf:${r.uf}`];
    if (!q || r.trocasNovas < 3) continue;
    Object.assign(r, { ppPerm: q.T, icPerm: q.ic95, pPerm: q.p, dpPerm: q.dpPerm, votosPerm: q.votos });
  }
  const val = R.porUf[d].filter((r) => r.pPerm !== undefined);
  const qv = bh(val.map((r) => r.pPerm));
  val.forEach((r, i) => { r.qBH = qv[i]; r.pBonf = Math.min(1, r.pPerm * val.length); r.mdeBonf80 = (zDe(0.05 / val.length) + Z80) * r.dpPerm; });
  for (const r of R.porModelo[d]) { const q = P[`m:${r.modelo}`]; Object.assign(r, { ppPerm: q.T, icPerm: q.ic95, pPerm: q.p, dpPerm: q.dpPerm }); }
  const qm = bh(R.porModelo[d].map((r) => r.pPerm));
  R.porModelo[d].forEach((r, i) => { r.qBH = qm[i]; r.pBonf = Math.min(1, r.pPerm * R.porModelo[d].length); });
  for (const z of ZONAS_FOCO) { const q = P[`z:${z}`]; Object.assign(R.aracaju[z][d], { ppPerm: q.T, icPerm: q.ic95, pPerm: q.p, pBonf6: Math.min(1, q.p * 6), dpPerm: q.dpPerm, mde80Bonf6: (zDe(0.05 / 6) + Z80) * q.dpPerm, votosPerm: q.votos }); }
  const br = P.BR;
  Object.assign(R.confirmatorio[d], { ppPerm: br.T, icPerm: br.ic95, pPerm: br.p, dpPerm: br.dpPerm, mde80Perm: (zDe(ALFA_CONF) + Z80) * br.dpPerm, semControle: P.semControle });
}
R.nTestes = nTestes;

// ---------- saídas ----------
const csv = (linhas, cols) => `${cols.join(';')}\n${linhas.map((r) => cols.map((c) => (typeof r[c] === 'number' ? +r[c].toFixed(6) : r[c] ?? '')).join(';')).join('\n')}\n`;
await mkdir(DIR, { recursive: true });
await writeFile(path.join(DIR, 'tabela-grupos.csv'), csv(tabela, ['grupo', 'rotulo', 'secoes', 'a1', 'c1', 'v13_1', 'v22_1', 'out1', 'br1', 'nu1', 'a2', 'c2', 'v13_2', 'v22_2', 'br2', 'nu2', 'comp1', 'comp2', 's13_1', 's13_2', 'bn1', 'bn2', 'mudouLocal', 'mudouAgreg', 'mudouAptos']));
const ufCsv = Object.entries(R.porUf).flatMap(([d, l]) => l.map((r) => ({ desfecho: d, ...r, ic_lo: r.ic95?.[0], ic_hi: r.ic95?.[1] })));
await writeFile(path.join(DIR, 'efeito-uf.csv'), csv(ufCsv, ['desfecho', 'uf', 'trocasNovas', 'secoes', 'zonas', 'pp', 'ep', 'ic_lo', 'ic_hi', 'z', 'p', 'qBH', 'pBonf', 'mde80', 'mdeBonf80', 'votos']));
const modCsv = Object.entries(R.porModelo).flatMap(([d, l]) => l.map((r) => ({ desfecho: d, ...r, ic_lo: r.ic95?.[0], ic_hi: r.ic95?.[1] })));
await writeFile(path.join(DIR, 'efeito-modelo.csv'), csv(modCsv, ['desfecho', 'modelo', 'trocasNovas', 'pp', 'ep', 'ic_lo', 'ic_hi', 'z', 'p', 'qBH', 'pBonf', 'mde80', 'votos']));
await writeFile(path.join(DIR, 'extremas-secoes.csv'), csv(extremasSecoes.slice(0, 300), ['secao', 'classe', 'modelo1', 'desfecho', 'z', 'residuoPP', 'a1', 'a2', 'c1', 'c2', 's13_1', 's13_2', 'bn1', 'bn2', 'v13_1', 'v22_1', 'v13_2', 'v22_2', 'local1', 'local2', 'agreg1', 'agreg2', 'votosOrig25', 'motivo']));
zonasOut.sort((a, b) => a.p - b.p);
await writeFile(path.join(DIR, 'extremas-zonas.csv'), csv(zonasOut.slice(0, 200), ['desfecho', 'zona', 'trocasNovas', 'stouffer', 'p', 'pBonf', 'residuoMedioPP', 'votosLiquidos']));
R.tabela = tabela;
R.topSecoes = extremasSecoes.slice(0, 25);
R.topZonas = zonasOut.slice(0, 15);
await writeFile(path.join(DIR, 'resultado.json'), JSON.stringify(R, null, 1));

// ---------- SVGs ----------
const COR = { ctrl: '#2a78d6', troca: '#eb6834', txt: '#0b0b0b', txt2: '#52514e', grade: '#e4e3df', fundo: '#fcfcfb' };
const fmt = (v, c = 2) => (!Number.isFinite(v) ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c }));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
function svgHist(d) {
  const h = R.residuos[d].histograma; const W = 920, H = 470, ml = 64, mr = 20, mt = 78, mb = 92;
  const pw = W - ml - mr, ph = H - mt - mb;
  const dens = h.bins.map((b) => ({ ...b, fc: (100 * b.controle) / h.ctrlN, ft: (100 * b.troca) / h.trN }));
  const ymax = Math.ceil(Math.max(...dens.map((b) => Math.max(b.fc, b.ft))) * 1.1);
  const x0 = h.bins[0].de, x1 = h.bins.at(-1).ate;
  const X = (v) => ml + ((v - x0) / (x1 - x0)) * pw; const Y = (v) => mt + ph - (v / ymax) * ph;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="system-ui, sans-serif">`;
  s += `<rect width="${W}" height="${H}" fill="${COR.fundo}"/>`;
  const c0 = R.confirmatorio[d]; const igual = c0.pBonf3 >= 0.05;
  const tit = `${{ s13: 'Parcela do 13', comp: 'Comparecimento', bn: 'Brancos e nulos' }[d]}: seções com urna trocada ${igual ? 'variam como as da mesma zona' : 'variam diferente das da mesma zona'}`;
  s += `<text x="${ml}" y="26" font-size="15" font-weight="600" fill="${COR.txt}">${esc(tit)}</text>`;
  s += `<text x="${ml}" y="46" font-size="12" fill="${COR.txt2}">Distribuição da variação 1º→2º turno, descontada a média da zona (seções sem troca) e o efeito do modelo e do tamanho.</text>`;
  s += `<text x="${ml}" y="62" font-size="12" fill="${COR.txt2}">Barras: ${h.trN.toLocaleString('pt-BR')} seções com troca nova por reserva. Linha: ${h.ctrlN.toLocaleString('pt-BR')} seções sem troca. Fora do eixo: ${h.trFora} com troca, ${h.ctrlFora.toLocaleString("pt-BR")} sem troca.</text>`;
  for (let v = 0; v <= ymax; v += ymax > 12 ? 4 : 2) s += `<line x1="${ml}" x2="${ml + pw}" y1="${Y(v)}" y2="${Y(v)}" stroke="${COR.grade}"/><text x="${ml - 8}" y="${Y(v) + 4}" font-size="11" text-anchor="end" fill="${COR.txt2}">${v}%</text>`;
  for (let v = Math.ceil(x0 / 5) * 5; v <= x1; v += 5) s += `<text x="${X(v)}" y="${mt + ph + 18}" font-size="11" text-anchor="middle" fill="${COR.txt2}">${v > 0 ? '+' : ''}${v}</text>`;
  s += `<line x1="${X(0)}" x2="${X(0)}" y1="${mt}" y2="${mt + ph}" stroke="${COR.txt2}" stroke-dasharray="3 3"/>`;
  const bw = (pw / dens.length);
  for (const b of dens) if (b.ft > 0) s += `<rect x="${X(b.de) + 1}" y="${Y(b.ft)}" width="${bw - 2}" height="${mt + ph - Y(b.ft)}" fill="${COR.troca}" opacity="0.85"><title>${fmt(b.de, 1)} a ${fmt(b.ate, 1)} p.p.: ${b.troca} seções com troca (${fmt(b.ft, 1)}%)</title></rect>`;
  s += `<polyline fill="none" stroke="${COR.ctrl}" stroke-width="2" points="${dens.map((b) => `${X((b.de + b.ate) / 2)},${Y(b.fc)}`).join(' ')}"/>`;
  s += `<text x="${ml + pw / 2}" y="${mt + ph + 40}" font-size="12" text-anchor="middle" fill="${COR.txt}">Variação 1º→2º turno acima (+) ou abaixo (−) da média da zona, em pontos percentuais (${esc(DESF[d])})</text>`;
  s += `<text transform="translate(16 ${mt + ph / 2}) rotate(-90)" font-size="12" text-anchor="middle" fill="${COR.txt}">% das seções do grupo</text>`;
  const lx = ml + pw - 250;
  s += `<rect x="${lx}" y="${mt + 4}" width="14" height="10" fill="${COR.troca}"/><text x="${lx + 20}" y="${mt + 13}" font-size="12" fill="${COR.txt}">Com troca nova por reserva</text>`;
  s += `<line x1="${lx}" x2="${lx + 14}" y1="${mt + 28}" y2="${mt + 28}" stroke="${COR.ctrl}" stroke-width="2"/><text x="${lx + 20}" y="${mt + 32}" font-size="12" fill="${COR.txt}">Sem troca (controle)</text>`;
  const c = R.confirmatorio[d];
  s += `<text x="${ml}" y="${H - 30}" font-size="12" fill="${COR.txt}">Como ler: se a troca de urna mexesse no resultado, as barras sairiam do lugar da linha. Diferença medida: ${c.pp >= 0 ? '+' : ''}${fmt(c.pp, 3)} p.p.</text>`;
  s += `<text x="${ml}" y="${H - 12}" font-size="12" fill="${COR.txt}">(IC95 ${fmt(c.ic95[0], 3)} a ${fmt(c.ic95[1], 3)}); o teste enxergaria um desvio de ${fmt(c.mde80, 2)} p.p. (80% de poder).</text>`;
  return `${s}</svg>\n`;
}
function svgForest(d) {
  const l = R.porUf[d].filter((r) => Number.isFinite(r.ppPerm)); const nac = R.confirmatorio[d];
  const linhas = [...l.map((r) => ({ rot: `${r.uf.toUpperCase()} (${r.trocasNovas})`, pp: r.ppPerm, ic95: r.icPerm, qBH: r.qBH })),
    { rot: `Brasil (${tn.length})`, pp: nac.ppPerm, ic95: nac.icPerm, nac: true }];
  const W = 920, lh = 17, mt = 84, mb = 86, ml = 110, mr = 150; const H = mt + mb + lh * linhas.length; const pw = W - ml - mr;
  const lim = Math.min(12, Math.max(...linhas.map((r) => Math.max(Math.abs(r.ic95[0]), Math.abs(r.ic95[1])))) * 1.05);
  const X = (v) => ml + ((Math.max(-lim, Math.min(lim, v)) + lim) / (2 * lim)) * pw;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="system-ui, sans-serif"><rect width="${W}" height="${H}" fill="${COR.fundo}"/>`;
  const nSig = l.filter((r) => r.qBH < 0.05).length; const rotD = { s13: 'Parcela do 13', comp: 'Comparecimento', bn: 'Brancos e nulos' }[d];
  const tit = nSig ? `${rotD} por UF: ${nSig} UF(s) diferem das seções sem troca (q de BH < 0,05; ${l.length} testes)`
    : `${rotD} por UF: nenhuma UF difere das seções sem troca após a correção para ${l.length} testes`;
  s += `<text x="16" y="26" font-size="15" font-weight="600" fill="${COR.txt}">${esc(tit)}</text>`;
  s += `<text x="16" y="46" font-size="12" fill="${COR.txt2}">Diferença na variação 1º→2º turno (${esc(DESF[d])}) entre seções com troca nova por reserva e seções sem troca da mesma zona,</text>`;
  s += `<text x="16" y="62" font-size="12" fill="${COR.txt2}">em p.p., no mesmo modelo de urna do 1º turno e controlando o tamanho; intervalo pelo teste de permutação. Entre parênteses: nº de trocas.</text>`;
  for (let v = -Math.floor(lim); v <= lim; v += lim > 6 ? 2 : 1) s += `<line x1="${X(v)}" x2="${X(v)}" y1="${mt - 6}" y2="${H - mb + 4}" stroke="${COR.grade}"/><text x="${X(v)}" y="${H - mb + 18}" font-size="11" text-anchor="middle" fill="${COR.txt2}">${v > 0 ? '+' : ''}${v}</text>`;
  s += `<line x1="${X(0)}" x2="${X(0)}" y1="${mt - 6}" y2="${H - mb + 4}" stroke="${COR.txt2}"/>`;
  s += `<text x="${W - mr + 8}" y="${mt - 10}" font-size="11" fill="${COR.txt2}">efeito (q de BH)</text>`;
  linhas.forEach((r, i) => {
    const y = mt + i * lh + lh / 2; const cor = r.nac ? COR.txt : r.qBH < 0.05 ? COR.troca : COR.ctrl;
    s += `<text x="${ml - 8}" y="${y + 4}" font-size="11" text-anchor="end" fill="${COR.txt}" ${r.nac ? 'font-weight="600"' : ''}>${r.rot}</text>`;
    s += `<line x1="${X(r.ic95[0])}" x2="${X(r.ic95[1])}" y1="${y}" y2="${y}" stroke="${cor}" stroke-width="2"/>`;
    s += `<circle cx="${X(r.pp)}" cy="${y}" r="4" fill="${cor}" stroke="${COR.fundo}" stroke-width="2"><title>${r.rot}: ${fmt(r.pp, 2)} p.p. (IC95 ${fmt(r.ic95[0], 2)} a ${fmt(r.ic95[1], 2)})</title></circle>`;
    s += `<text x="${W - mr + 8}" y="${y + 4}" font-size="11" fill="${COR.txt2}">${r.pp >= 0 ? '+' : ''}${fmt(r.pp, 2)}${r.nac ? '' : ` (${fmt(r.qBH, 2)})`}</text>`;
  });
  s += `<text x="${ml + pw / 2}" y="${H - mb + 38}" font-size="12" text-anchor="middle" fill="${COR.txt}">Efeito da troca, em pontos percentuais (0 = igual às seções sem troca da zona)</text>`;
  s += `<text x="16" y="${H - 26}" font-size="12" fill="${COR.txt}">Como ler: cada traço é o intervalo de 95% da UF; se cruza o zero, a UF não difere das seções sem troca. Laranja = q de BH &lt; 0,05.</text>`;
  s += `<text x="16" y="${H - 10}" font-size="12" fill="${COR.txt}">UFs com poucas trocas têm traço largo: o teste ali só enxerga desvios grandes. Valores além de ±${fmt(lim, 0)} p.p. ficam cortados na borda.</text>`;
  return `${s}</svg>\n`;
}
function svgGrupos() {
  const W = 920; const ds = Object.keys(DESF); const gs = TRAT.filter((g) => R.porGrupo.s13[g]?.pp !== undefined);
  const lh = 18, bloco = gs.length * lh + 34, mt = 74, mb = 60; const H = mt + mb + bloco * ds.length; const ml = 330, mr = 110, pw = W - ml - mr;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="system-ui, sans-serif"><rect width="${W}" height="${H}" fill="${COR.fundo}"/>`;
  s += `<text x="16" y="26" font-size="15" font-weight="600" fill="${COR.txt}">Efeito de cada tipo de troca de urna na variação 1º→2º turno, nos três desfechos</text>`;
  s += `<text x="16" y="46" font-size="12" fill="${COR.txt2}">Pontos percentuais em relação às seções sem troca da mesma zona; traço = intervalo de 95%; entre parênteses, nº de seções.</text>`;
  ds.forEach((d, k) => {
    const y0 = mt + k * bloco; const l = gs.map((g) => ({ g, ...R.porGrupo[d][g] }));
    const lim = Math.max(1, ...l.map((r) => Math.max(Math.abs(r.ic95[0]), Math.abs(r.ic95[1])))) * 1.05; const L = Math.min(lim, 8);
    const X = (v) => ml + ((Math.max(-L, Math.min(L, v)) + L) / (2 * L)) * pw;
    s += `<text x="16" y="${y0 + 12}" font-size="13" font-weight="600" fill="${COR.txt}">${esc(DESF[d])} (eixo ±${fmt(L, 1)} p.p.)</text>`;
    s += `<line x1="${X(0)}" x2="${X(0)}" y1="${y0 + 18}" y2="${y0 + 18 + gs.length * lh}" stroke="${COR.txt2}"/>`;
    l.forEach((r, i) => {
      const y = y0 + 26 + i * lh; const rot = GRUPOS.find(([g]) => g === r.g)[1];
      const cor = r.p < 0.05 / (3 * gs.length) ? COR.troca : COR.ctrl;
      s += `<text x="${ml - 8}" y="${y + 4}" font-size="11" text-anchor="end" fill="${COR.txt}">${esc(rot.length > 48 ? `${rot.slice(0, 47)}…` : rot)} (${r.secoes.toLocaleString('pt-BR')})</text>`;
      s += `<line x1="${X(r.ic95[0])}" x2="${X(r.ic95[1])}" y1="${y}" y2="${y}" stroke="${cor}" stroke-width="2"/><circle cx="${X(r.pp)}" cy="${y}" r="4" fill="${cor}" stroke="${COR.fundo}" stroke-width="2"/>`;
      s += `<text x="${W - mr + 8}" y="${y + 4}" font-size="11" fill="${COR.txt2}">${r.pp >= 0 ? '+' : ''}${fmt(r.pp, 2)}</text>`;
    });
  });
  s += `<text x="16" y="${H - 28}" font-size="12" fill="${COR.txt}">Como ler: traço que cruza a linha do zero = o grupo varia como as seções sem troca. Laranja = diferente após Bonferroni (${3 * gs.length} testes).</text>`;
  s += `<text x="16" y="${H - 12}" font-size="12" fill="${COR.txt}">Os eixos dos três blocos têm escalas diferentes; compare dentro de cada bloco.</text>`;
  return `${s}</svg>\n`;
}
for (const d of Object.keys(DESF)) await writeFile(path.join(DIR, `hist-${d}.svg`), svgHist(d));
await writeFile(path.join(DIR, 'forest-uf-s13.svg'), svgForest('s13'));
await writeFile(path.join(DIR, 'forest-uf-comp.svg'), svgForest('comp'));
await writeFile(path.join(DIR, 'grupos.svg'), svgGrupos());

// ---------- console ----------
console.log('Universo:', R.universo);
console.table(tabela.map((t) => ({ grupo: t.grupo, secoes: t.secoes, comp1: t.comp1.toFixed(2), comp2: t.comp2.toFixed(2), s13_1: t.s13_1.toFixed(2), s13_2: t.s13_2.toFixed(2), bn1: t.bn1.toFixed(2), bn2: t.bn2.toFixed(2) })));
console.log('Confirmatório (trocas novas × controle, EF zona, modelo, log aptos; Bonferroni 3):');
console.table(Object.entries(R.confirmatorio).map(([d, e]) => ({ d, pp: e.pp.toFixed(4), ic: e.ic95.map((v) => v.toFixed(3)).join(' a '), p: e.p.toExponential(2), pB: e.pBonf3.toFixed(3), mde: e.mde80.toFixed(3), votos: Math.round(e.votos), icV: e.ic95Votos.map(Math.round).join(' a '), mdeV: Math.round(e.mde80Votos) })));
for (const d of Object.keys(DESF)) {
  console.log(`Por grupo — ${d}`);
  console.table(Object.entries(R.porGrupo[d]).map(([g, e]) => ({ g, n: e.secoes, pp: e.pp?.toFixed(3), ep: e.ep?.toFixed(3), p: e.p?.toExponential(2), semPeso: e.semPeso?.pp.toFixed(3), comMud: e.comLocalAgregAptos?.pp.toFixed(3) })));
  console.log(`Alternativas — ${d}:`, JSON.stringify({ bruto: R.alternativas[d].diferencaBruta, efUf: R.alternativas[d].efeitoFixoUf.pp, semModelo: R.alternativas[d].efeitoFixoZonaSemModelo.pp, exclMud: R.alternativas[d].excluindoMudancas.pp, exclMudEp: R.alternativas[d].excluindoMudancas.ep, comCtrlMud: R.alternativas[d].comControlesMudanca.pp, mud: R.alternativas[d].mudancas }));
  console.table(R.porModelo[d].map((r) => ({ m: r.modelo, n: r.trocasNovas, pp: r.pp?.toFixed(3), ep: r.ep?.toFixed(3), p: r.p?.toFixed(4), q: r.qBH?.toFixed(3), votos: Math.round(r.votos) })));
  console.table(R.porUf[d].filter((r) => r.p !== undefined).sort((a, b) => a.p - b.p).slice(0, 6).map((r) => ({ uf: r.uf, n: r.trocasNovas, pp: r.pp?.toFixed(3), ep: r.ep?.toFixed(3), p: r.p?.toFixed(4), q: r.qBH?.toFixed(3), pB: r.pBonf?.toFixed(3), mdeB: r.mdeBonf80?.toFixed(2) })));
  console.log('Cauda:', JSON.stringify(R.residuos[d].cauda.controle), JSON.stringify(R.residuos[d].cauda.troca_nova), 'z', R.residuos[d].zCaudaTrocaNova.toFixed(2), 'zonas Bonf', R.residuos[d].zonasBonf005, '/', R.residuos[d].zonasTestadas);
}
console.log('Extremas:', R.extremas);
console.table(extremasSecoes.slice(0, 15).map((r) => ({ s: r.secao, c: r.classe, d: r.desfecho, z: r.z.toFixed(1), res: r.residuoPP.toFixed(1), a: `${r.a1}→${r.a2}`, c12: `${r.c1}→${r.c2}`, s13: `${r.s13_1.toFixed(1)}→${r.s13_2.toFixed(1)}`, m: r.motivo })));
console.table(zonasOut.slice(0, 10).map((r) => ({ d: r.desfecho, z: r.zona, k: r.trocasNovas, st: r.stouffer.toFixed(2), pB: r.pBonf.toFixed(4), res: r.residuoMedioPP.toFixed(2), v: Math.round(r.votosLiquidos) })));
console.log('Aracaju:', JSON.stringify(Object.fromEntries(Object.entries(R.aracaju).map(([z, r]) => [z, { secoes: r.secoes, classes: r.classes, modelos: r.modelos1Troca, s13: r.s13, comp: r.comp, bn: r.bn }])), null, 1));
console.log('Testes feitos:', nTestes, `(${((Date.now() - t0) / 1000).toFixed(0)} s)`);
console.log('Permutação (estrato zona × modelo; N =', NPERM, '):');
for (const d of Object.keys(DESF)) {
  const c = R.confirmatorio[d];
  console.log(d, 'Brasil T', c.ppPerm.toFixed(4), 'IC', c.icPerm.map((v) => v.toFixed(3)).join(' a '), 'p', c.pPerm.toFixed(4), 'dp', c.dpPerm.toFixed(4), 'MDE80(Bonf3)', c.mde80Perm.toFixed(3), 'semControle', c.semControle);
  console.table(R.porUf[d].filter((r) => r.pPerm !== undefined).sort((a, b) => a.pPerm - b.pPerm).slice(0, 8).map((r) => ({ uf: r.uf, n: r.trocasNovas, T: r.ppPerm.toFixed(3), dp: r.dpPerm.toFixed(3), p: r.pPerm.toFixed(4), q: r.qBH.toFixed(3), pB: r.pBonf.toFixed(3), mdeB: r.mdeBonf80.toFixed(2), v: Math.round(r.votosPerm) })));
  console.table(R.porModelo[d].map((r) => ({ m: r.modelo, T: r.ppPerm.toFixed(3), p: r.pPerm.toFixed(4), q: r.qBH.toFixed(3) })));
  for (const z of ZONAS_FOCO) { const a = R.aracaju[z][d]; console.log(z, d, 'T', a.ppPerm.toFixed(3), 'IC', a.icPerm.map((v) => v.toFixed(2)).join(' a '), 'p', a.pPerm.toFixed(4), 'pBonf6', a.pBonf6.toFixed(3), 'MDE', a.mde80Bonf6.toFixed(2), 'votos', Math.round(a.votosPerm)); }
}
console.log('Extremas (p empírico):', R.extremas);
console.table(extremasSecoes.slice(0, 20).map((r) => ({ s: r.secao, c: r.classe, d: r.desfecho, z: r.z.toFixed(1), pE: r.pEmp.toExponential(1), pB: r.pBonf.toFixed(3) })));
console.table(extremasSecoes.filter((r) => r.trocaNova).slice(0, 12).map((r) => ({ s: r.secao, c: r.classe, d: r.desfecho, z: r.z.toFixed(1), pE: r.pEmp.toExponential(1), pB: r.pBonf.toFixed(3), a: `${r.a1}→${r.a2}`, c12: `${r.c1}→${r.c2}`, s13: `${r.s13_1.toFixed(1)}→${r.s13_2.toFixed(1)}`, bn: `${r.bn1.toFixed(1)}→${r.bn2.toFixed(1)}` })));
for (const d of Object.keys(DESF)) console.log('zonas', d, 'Bonf(3×zonas)<0,05:', R.residuos[d].zonasBonf005, 'de', R.residuos[d].zonasTestadas);
console.table(zonasOut.sort((a, b) => a.p - b.p).slice(0, 10).map((r) => ({ d: r.desfecho, z: r.zona, k: r.trocasNovas, st: r.stouffer.toFixed(2), pB: r.pBonf.toFixed(4), res: r.residuoMedioPP.toFixed(2), v: Math.round(r.votosLiquidos) })));
console.log('Testes (contagem final):', R.nTestes);
