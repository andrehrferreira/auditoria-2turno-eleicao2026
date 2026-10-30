// Estatístico eleitoral, doc 08: o sinal do H05 (PR, SP, Brasil, trocadas de MG) é reclassificação pela falha do leitor?
// Pré-registro em docs/analysis/estatistico-eleitoral/08-h05-falha-do-leitor.md (escrito antes de rodar).
//
// Entrada: pares-banco.csv (estatistico-pares.mjs banco) e leitor/<uf>.jsonl (estatistico-h05-leitor-varrer.mjs).
// Uso: node --max-old-space-size=6144 scripts/auditoria/estatistico-h05-leitor.mjs
// Saída: data/parsed/auditoria/estatistico-eleitoral/h05-leitor.json, h05-leitor-por-uf.csv, h05-leitor-grafico.csv
//        e h05-leitor.svg
//
// Passo 1: classe do leitor por seção (A, pela leitura na 1ª tentativa entre os reconhecidos, robusta a inserção;
//          B, pela falha registrada = manual ÷ (biometria + manual), descritiva).
// Passo 2: teste do H05 do doc 06 (efeito fixo de município, peso c1, EP agrupado por município; DF por zona):
//          M0 base; M1 = M0 + reclassificação esperada pelo leitor ÷ c1; M2 = M0 + reclassificação registrada ÷ c1;
//          estrato "leitor normal nos dois turnos" com M0. Regra de decisão e família de 56 testes declaradas antes.
import { createReadStream } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { paraCsv } from './forense-lib.mjs';
import { DIR_SAIDA, bh, diferenca, filtrar, lerPares, mqEfeitoFixo, pNormal2, prepararBiometria, salvar, zBilateral } from './estatistico-lib.mjs';

const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const r4 = (x) => (Number.isFinite(x) ? Math.round(x * 10000) / 10000 : null);
const r2 = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : null);
const soma = (l, f) => l.reduce((a, s) => a + f(s), 0);
const res = { geradoEm: new Date().toISOString() };

// ---------- universo: o do doc 06 ----------
const todos = await lerPares('banco');
const { P } = filtrar(todos);
prepararBiometria(todos);
const E = P.filter((s) => s.temBio && s.c1 >= 20);
log(`${E.length} seções no universo do doc 06`);

// ---------- medidas do log por turno ----------
const leitor = new Map();
const DIR_LEITOR = path.join(DIR_SAIDA, 'leitor');
const errosVarredura = [];
for (const f of (await readdir(DIR_LEITOR)).sort()) {
  if (!f.endsWith('.jsonl')) continue;
  for await (const l of createInterface({ input: createReadStream(path.join(DIR_LEITOR, f), 'utf8'), crlfDelay: Infinity })) {
    if (!l) continue;
    const r = JSON.parse(l);
    if (f.endsWith('.erros.jsonl')) { errosVarredura.push(r); continue; }
    const med = (d) => (d ? { votos: d.votos, bio: d.bio, man: d.man, anb: d.anb, s1: d.suc[1], B: d.bio + d.man } : null);
    leitor.set(`${r.uf}|${r.municipio}|${r.zona}|${r.secao}`, { bate1: r.bate1, bate2: r.bate2, fonte1: r.fonte1, d1: med(r.d1), d2: med(r.d2),
      tent: [r.d1, r.d2].map((d) => (d ? { suc: d.suc, manTent: d.manTent, bioSemPedido: d.bioSemPedido, mais: d.sucMais + d.manMais } : null)) });
  }
}
log(`${leitor.size} seções com medida do log; ${errosVarredura.length} erros de leitura`);
const excl = { semRegistro: 0, logNaoBate1: 0, logNaoBate2: 0, porUf: {} };
const L = [];
for (const s of E) {
  const r = leitor.get(`${s.uf}|${s.municipio}|${s.zona}|${s.secao}`);
  let motivo = null;
  if (!r) motivo = 'semRegistro'; else if (!r.bate1) motivo = 'logNaoBate1'; else if (!r.bate2) motivo = 'logNaoBate2';
  if (motivo) { excl[motivo]++; excl.porUf[s.uf] = (excl.porUf[s.uf] ?? 0) + 1; continue; }
  s.L1 = r.d1; s.L2 = r.d2; s.fonte1 = r.fonte1;
  s.mun = `${s.uf}|${s.municipio}`; s.zon = `${s.uf}|${s.zona}`;
  s.urnaTrocada = s.urna1 !== s.urna2 ? 1 : 0;
  L.push(s);
}
// conferência das tentativas (todas as seções lidas, não só as do teste)
const tentConf = { manuaisCom4: 0, manuaisOutras: 0, reconhecidosSemPedido: 0, acimaDe4: 0, reconhecidosPorTentativa: [0, 0, 0, 0, 0] };
for (const r of leitor.values()) for (const t of r.tent) {
  if (!t) continue;
  tentConf.manuaisCom4 += t.manTent[4]; tentConf.manuaisOutras += t.manTent[0] + t.manTent[1] + t.manTent[2] + t.manTent[3];
  tentConf.reconhecidosSemPedido += t.bioSemPedido; tentConf.acimaDe4 += t.mais;
  t.suc.forEach((v, i) => { tentConf.reconhecidosPorTentativa[i] += v; });
}
res.universo = { doc06: E.length, noTeste: L.length, exclusoes: excl, errosLeituraLog: errosVarredura.length, secoesLidas: leitor.size,
  dia1DoPacoteDo1t: L.filter((s) => s.fonte1 === '1t').length, urnaTrocada: L.filter((s) => s.urnaTrocada).length, tentativas: tentConf };
log(`${L.length} seções no teste`);

// ---------- passo 1: medidas e classes ----------
for (const s of L) for (const m of [s.L1, s.L2]) { m.f = m.B > 0 ? m.man / m.B : null; m.p1 = m.bio > 0 ? m.s1 / m.bio : null; }
const zProp = (x1, n1, x2, n2) => { const p = (x1 + x2) / (n1 + n2); const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2)); return se > 0 ? (x1 / n1 - x2 / n2) / se : 0; };
function classeA(s) {
  if (s.urnaTrocada) return 'trocada';
  const [a, b] = [s.L1, s.L2];
  if (a.B < 20 || b.B < 20) return 'semMedida';
  const sl1 = a.bio < 10, sl2 = b.bio < 10;
  if (sl1 && sl2) return 'semLeituraDois';
  if (sl2) { s.semLeitura = 2; return 'pior2'; }
  if (sl1) { s.semLeitura = 1; return 'pior1'; }
  const z = zProp(a.s1, a.bio, b.s1, b.bio); // > 0: menos leitura na 1ª no 2º turno
  if (z >= 3 && a.p1 - b.p1 >= 0.10) return 'pior2';
  if (z <= -3 && b.p1 - a.p1 >= 0.10) return 'pior1';
  return 'normal';
}
function classeB(s) {
  if (s.urnaTrocada) return 'trocada';
  const [a, b] = [s.L1, s.L2];
  if (a.B < 20 || b.B < 20) return 'semMedida';
  const z = zProp(b.man, b.B, a.man, a.B); // > 0: mais falha registrada no 2º turno
  if (z >= 3 && b.f - a.f >= 0.10) return 'pior2';
  if (z <= -3 && a.f - b.f >= 0.10) return 'pior1';
  return 'normal';
}
for (const s of L) { s.cA = classeA(s); s.cB = classeB(s); }

// falha esperada pelo desempenho do leitor: média de manual ÷ B nas seções-turno do mesmo modelo e da mesma faixa de p1
const faixa = (m) => (m.bio >= 10 ? String(Math.min(19, Math.floor(m.p1 / 0.05))) : m.B >= 10 ? 'SL' : null);
const tabG = new Map();
const acumular = (modelo, k, m) => { const c = `${modelo}|${k}`; const a = tabG.get(c) ?? { man: 0, B: 0, n: 0 }; a.man += m.man; a.B += m.B; a.n++; tabG.set(c, a); };
for (const s of L) for (const [m, mod] of [[s.L1, s.modelo1], [s.L2, s.modelo2]]) {
  acumular(mod, 'todas', m);
  const k = faixa(m); if (k != null) acumular(mod, k, m);
}
const fEsp = (m, mod) => { const k = faixa(m); const a = (k != null && tabG.get(`${mod}|${k}`)) || tabG.get(`${mod}|todas`); return a.B > 0 ? a.man / a.B : 0; };
res.tabelaFalhaEsperada = Object.fromEntries([...tabG].sort().map(([k, a]) => [k, { secoesTurno: a.n, B: a.B, falha: r4(a.man / a.B) }]));
for (const s of L) {
  s.B1 = s.L1.B;
  s.fe1 = fEsp(s.L1, s.modelo1); s.fe2 = fEsp(s.L2, s.modelo2);
  s.Rt = (s.fe2 - s.fe1) * s.B1;                                                // reclassificação esperada pelo leitor
  s.R = s.L1.B > 0 && s.L2.B > 0 ? (s.L2.f - s.L1.f) * s.B1 : 0;                // reclassificação registrada
  s.dsem = s.dsb + s.dpg;
  s.reclMin = Math.sign(s.dpb) * Math.sign(s.dsem) < 0 ? Math.min(Math.abs(s.dpb), Math.abs(s.dsem)) : 0;
}

// descrição por classe
const CLASSES = ['normal', 'pior2', 'pior1', 'trocada', 'semLeituraDois', 'semMedida'];
function descrever(lista, campo) {
  const out = {};
  for (const c of CLASSES) {
    const l = lista.filter((s) => s[campo] === c);
    if (!l.length) continue;
    const S = (f) => soma(l, f);
    const B1 = S((s) => s.L1.B), B2 = S((s) => s.L2.B), bio1 = S((s) => s.L1.bio), bio2 = S((s) => s.L2.bio);
    out[c] = { secoes: l.length, c1: S((s) => s.c1), c2: S((s) => s.c2),
      falha1: r4(S((s) => s.L1.man) / B1), falha2: r4(S((s) => s.L2.man) / B2),
      leitura1a_1: r4(S((s) => s.L1.s1) / bio1), leitura1a_2: r4(S((s) => s.L2.s1) / bio2),
      anoNasc1: r4(S((s) => s.L1.anb) / S((s) => s.L1.votos)), anoNasc2: r4(S((s) => s.L2.anb) / S((s) => s.L2.votos)),
      manual1: S((s) => s.L1.man), manual2: S((s) => s.L2.man), dPorBiometria: S((s) => s.dpb), dSemBiometria: S((s) => s.dsem),
      dComparecimento: S((s) => s.c2 - s.c1), reclassificacaoMinima: S((s) => s.reclMin), dSemBioPositivo: S((s) => Math.max(s.dsem, 0)),
      reclassificacaoRegistrada: Math.round(S((s) => s.R)), reclassificacaoEsperadaLeitor: Math.round(S((s) => s.Rt)),
      ...(campo === 'cA' ? { semLeituraNum1Turno: l.filter((s) => s.semLeitura).length } : {}) };
  }
  return out;
}
const cruzar = (lista) => { const t = {}; for (const s of lista) { t[s.cA] ??= {}; t[s.cA][s.cB] = (t[s.cA][s.cB] ?? 0) + 1; } return t; };
// força do controle: quanto da reclassificação registrada a reclassificação esperada pelo leitor acompanha (diagnóstico, sem voto)
function forca(lista) {
  const w = (s) => s.c1; const W = soma(lista, w);
  const mx = soma(lista, (s) => w(s) * s.Rt / s.c1) / W, my = soma(lista, (s) => w(s) * s.R / s.c1) / W;
  let sxx = 0, syy = 0, sxy = 0;
  for (const s of lista) { const x = s.Rt / s.c1 - mx, y = s.R / s.c1 - my; sxx += w(s) * x * x; syy += w(s) * y * y; sxy += w(s) * x * y; }
  return { correlacao: r4(sxy / Math.sqrt(sxx * syy)), inclinacao: r4(sxy / sxx), somaR: Math.round(soma(lista, (s) => s.R)), somaRt: Math.round(soma(lista, (s) => s.Rt)),
    somaAbsR: Math.round(soma(lista, (s) => Math.abs(s.R))), somaAbsRt: Math.round(soma(lista, (s) => Math.abs(s.Rt))) };
}

// ---------- passo 2: modelos ----------
const clu = (s) => (s.uf === 'df' ? s.zon : s.mun);
const XB = (s) => [s.dpb / s.c1, s.dsem / s.c1, s.out1 / s.c1, s.bn1 / s.c1];
const MOD = { M0: XB, M1: (s) => [...XB(s), s.Rt / s.c1], M2: (s) => [...XB(s), s.R / s.c1] };
const Y = { 13: (s) => (s.v13_2 - s.v13_1) / s.c1, 22: (s) => (s.v22_2 - s.v22_1) / s.c1 };
const ajustar = (lista, mod, y) => mqEfeitoFixo(lista, { y: Y[y], x: MOD[mod], w: (s) => s.c1, grupo: (s) => s.mun, cluster: clu, scores: true });
const dDe = (a) => { if (!a) return null; const d = diferenca(a, 1, 0); return { d: d.d, ep: d.ep, t: d.t, secoes: a.n, conglomerados: a.G }; };
// contribuição de cada conglomerado para d (já com o fator CR1): Var(d) = Σ u_g²
function uPorCluster(a) {
  const f = Math.sqrt((a.G / (a.G - 1)) * ((a.n - 1) / (a.n - a.k)));
  const m = new Map();
  for (const [g, sc] of a.scoresPorCluster) { let u = 0; for (let j = 0; j < a.k; j++) u += (a.inv[1][j] - a.inv[0][j]) * sc[j]; m.set(g, f * u); }
  return m;
}
function deltaD(aA, aB) {
  const uA = uPorCluster(aA), uB = uPorCluster(aB);
  let v = 0;
  for (const g of new Set([...uA.keys(), ...uB.keys()])) v += ((uA.get(g) ?? 0) - (uB.get(g) ?? 0)) ** 2;
  const dd = (aA.b[1] - aA.b[0]) - (aB.b[1] - aB.b[0]);
  return { dd: r4(dd), ep: r4(Math.sqrt(v)), t: r2(dd / Math.sqrt(v)) };
}
const fmtD = (x) => (x ? { d: r4(x.d), ep: r4(x.ep), t: r2(x.t), secoes: x.secoes, conglomerados: x.conglomerados } : null);
function decidir(d0, d1) {
  if (!d0 || !d1) return null;
  if (Math.abs(d1.t) < 1.96 && Math.abs(d1.d) <= 0.5 * Math.abs(d0.d)) return 'a reclassificação explica';
  if (Math.sign(d1.d) === Math.sign(d0.d) && Math.abs(d1.d) >= 0.5 * Math.abs(d0.d) && Math.abs(d1.t) >= 1.96) return 'a reclassificação não explica';
  return 'inconclusivo';
}
function recorte(lista, { estrato = true } = {}) {
  const out = { secoes: lista.length };
  for (const y of ['13', '22']) {
    const a = Object.fromEntries(['M0', 'M1', 'M2'].map((m) => [m, ajustar(lista, m, y)]));
    const d = Object.fromEntries(Object.entries(a).map(([m, x]) => [m, dDe(x)]));
    const normal = estrato ? dDe(ajustar(lista.filter((s) => s.cA === 'normal'), 'M0', y)) : null;
    out[`ganho${y}`] = {
      M0: fmtD(d.M0), M1: fmtD(d.M1), M2: fmtD(d.M2), estratoNormal: fmtD(normal),
      coefReclassEsperada: a.M1 ? r4(a.M1.b[4]) : null, tReclassEsperada: a.M1 ? r2(a.M1.b[4] / a.M1.ep[4]) : null,
      coefReclassRegistrada: a.M2 ? r4(a.M2.b[4]) : null, tReclassRegistrada: a.M2 ? r2(a.M2.b[4] / a.M2.ep[4]) : null,
      deltaM1: a.M0 && a.M1 ? deltaD(a.M1, a.M0) : null, deltaM2: a.M0 && a.M2 ? deltaD(a.M2, a.M0) : null,
      decisaoM1: decidir(d.M0, d.M1), decisaoM2: decidir(d.M0, d.M2), decisaoEstrato: decidir(d.M0, normal),
    };
  }
  return out;
}

const ufs = [...new Set(L.map((s) => s.uf))].sort();
const M = 2 * ufs.length + 2;
const CRIT = zBilateral(0.05 / M);
res.decisao = { testesConfirmatorios: M, limiarBonferroni: r2(CRIT) };

// reprodução do doc 06 (M0 no universo do doc 06, antes de excluir log que não bate)
for (const s of E) { s.mun ??= `${s.uf}|${s.municipio}`; s.zon ??= `${s.uf}|${s.zona}`; s.dsem ??= s.dsb + s.dpg; }
res.reproducaoDoc06 = Object.fromEntries([['brasil', E], ...['pr', 'sp', 'mg'].map((uf) => [uf, E.filter((s) => s.uf === uf)])]
  .map(([k, l]) => [k, fmtD(dDe(ajustar(l, 'M0', '13')))]));
log('reprodução do doc 06');

res.recortes = {};
const DECLARADOS = { brasil: L, pr: L.filter((s) => s.uf === 'pr'), sp: L.filter((s) => s.uf === 'sp'), mgTrocadas: L.filter((s) => s.uf === 'mg' && s.urnaTrocada) };
for (const [k, l] of Object.entries(DECLARADOS)) {
  res.recortes[k] = { ...recorte(l, { estrato: k !== 'mgTrocadas' }), classesA: descrever(l, 'cA'), classesB: descrever(l, 'cB'), cruzamentoAxB: cruzar(l), forcaDoControle: forca(l) };
  log(`recorte ${k}: M0 ${r4(res.recortes[k].ganho13.M0?.d)} → M1 ${r4(res.recortes[k].ganho13.M1?.d)} → M2 ${r4(res.recortes[k].ganho13.M2?.d)}`);
}
// MG inteiro e trocadas fora de MG (contexto)
res.recortes.mg = { ...recorte(L.filter((s) => s.uf === 'mg')), classesA: descrever(L.filter((s) => s.uf === 'mg'), 'cA'), forcaDoControle: forca(L.filter((s) => s.uf === 'mg')) };
res.recortes.mgMantidas = recorte(L.filter((s) => s.uf === 'mg' && !s.urnaTrocada), { estrato: false });

// família confirmatória: M1, 27 UFs + Brasil, 13 e 22
res.porUf = ufs.map((uf) => ({ uf, ...recorte(L.filter((s) => s.uf === uf)) }));
{
  const refs = [];
  for (const y of ['13', '22']) {
    refs.push({ uf: 'brasil', y, g: res.recortes.brasil[`ganho${y}`].M1 });
    for (const l of res.porUf) refs.push({ uf: l.uf, y, g: l[`ganho${y}`].M1 });
  }
  const ok = refs.filter((r) => r.g && Number.isFinite(r.g.t));
  bh(ok.map((r) => pNormal2(r.g.t))).forEach((q, i) => { ok[i].g.q = +q.toPrecision(3); ok[i].g.passaBonferroni = Math.abs(ok[i].g.t) >= CRIT; });
  res.familiaM1 = { testes: ok.length, passam: ok.filter((r) => r.g.passaBonferroni).map((r) => ({ uf: r.uf, ganho: r.y, d: r.g.d, t: r.g.t })) };
}
log('família M1');

// exploratório: d (M0) dentro de cada classe A, nos recortes declarados (rotulado exploratório no doc)
res.exploratorioPorClasse = {};
for (const [k, l] of Object.entries({ brasil: L, pr: DECLARADOS.pr, sp: DECLARADOS.sp, mg: L.filter((s) => s.uf === 'mg') })) {
  res.exploratorioPorClasse[k] = Object.fromEntries(CLASSES.map((c) => {
    const sub = l.filter((s) => s.cA === c);
    return [c, sub.length >= 200 ? fmtD(dDe(ajustar(sub, 'M0', '13'))) : { secoes: sub.length }];
  }));
}
// Brasil: classes A e B e cruzamento (todas as seções do teste)
res.brasilClasses = { A: res.recortes.brasil.classesA, B: res.recortes.brasil.classesB };
// leitor normal pela leitura na 1ª, mas falha registrada maior no 2º (padrão que a brecha também produz; princípio 8)
{
  const l = L.filter((s) => s.cA === 'normal' && s.cB === 'pior2');
  const porUf = {};
  for (const s of l) { const u = (porUf[s.uf] ??= { secoes: 0, manual1: 0, manual2: 0, dComparecimento: 0 }); u.secoes++; u.manual1 += s.L1.man; u.manual2 += s.L2.man; u.dComparecimento += s.c2 - s.c1; }
  res.normalComFalhaMaior2 = { secoes: l.length, manual1: soma(l, (s) => s.L1.man), manual2: soma(l, (s) => s.L2.man), dComparecimento: soma(l, (s) => s.c2 - s.c1),
    d13: soma(l, (s) => s.v13_2 - s.v13_1), d22: soma(l, (s) => s.v22_2 - s.v22_1), porUf,
    maiores: l.sort((a, b) => (b.L2.man - b.L1.man) - (a.L2.man - a.L1.man)).slice(0, 10).map((s) => ({ secao: `${s.uf} ${s.municipio}/${s.zona}/${s.secao}`,
      leitura1a: [r2(s.L1.p1), r2(s.L2.p1)], falha: [r2(s.L1.f), r2(s.L2.f)], manual: [s.L1.man, s.L2.man], c: [s.c1, s.c2] })) };
}
// seções do parecer 27 conferidas no bruto: onde caem
res.secoesParecer27 = ['pr|74993|0159|0009', 'pr|77399|0124|0080', 'mg|52752|0268|0068'].map((k) => {
  const s = L.find((x) => `${x.uf}|${x.municipio}|${x.zona}|${x.secao}` === k);
  return s ? { secao: k, classeA: s.cA, classeB: s.cB, leitura1a: [r2(s.L1.p1), r2(s.L2.p1)], falha: [r2(s.L1.f), r2(s.L2.f)], B: [s.L1.B, s.L2.B],
    reconhecidos: [s.L1.bio, s.L2.bio], manual: [s.L1.man, s.L2.man], anoNasc: [s.L1.anb, s.L2.anb], R: Math.round(s.R), Rt: Math.round(s.Rt), fonte1: s.fonte1 } : { secao: k, ausente: true };
});

// ---------- saída ----------
const arq = await salvar('h05-leitor.json', res);
const tab = res.porUf.map((l) => {
  const g = l.ganho13;
  return { uf: l.uf, secoes: l.secoes, d0: g.M0?.d, t0: g.M0?.t, d1: g.M1?.d, t1: g.M1?.t, q1: g.M1?.q, d2: g.M2?.d, t2: g.M2?.t,
    dNormal: g.estratoNormal?.d, tNormal: g.estratoNormal?.t, t22_M1: l.ganho22.M1?.t, decisaoM1: g.decisaoM1 };
});
await salvar('h05-leitor-por-uf.csv', paraCsv(tab, Object.keys(tab[0])));

// gráfico: d para o 13 em cada recorte declarado, por modelo
const ROT = { brasil: 'Brasil', sp: 'SP', pr: 'PR', mgTrocadas: 'MG, urna trocada' };
const MODS = [['M0', 'sem controle (doc 06)'], ['M1', 'com o desempenho do leitor'], ['M2', 'com a falha registrada (apaga também a brecha)'], ['estratoNormal', 'só seções de leitor normal nos dois turnos']];
const pontos = [];
for (const k of ['sp', 'pr', 'brasil', 'mgTrocadas']) for (const [m, rot] of MODS) {
  const g = res.recortes[k].ganho13[m];
  if (g) pontos.push({ recorte: ROT[k], modelo: rot, d: g.d, ep: g.ep, t: g.t, ic95_inf: r4(g.d - 1.96 * g.ep), ic95_sup: r4(g.d + 1.96 * g.ep), secoes: g.secoes });
}
await salvar('h05-leitor-grafico.csv', paraCsv(pontos, Object.keys(pontos[0])));
{
  const COR = { M0: '#52514e', M1: '#2a78d6', M2: '#eb6834', estratoNormal: '#3a9a5b', txt: '#0b0b0b', txt2: '#52514e', grade: '#e4e3df', fundo: '#fcfcfb' };
  const corDe = (rot) => COR[MODS.find(([, r]) => r === rot)[0]];
  const W = 920, lh = 20, gap = 14, mt = 92, mb = 110, ml = 170, mr = 120;
  const grupos = [...new Set(pontos.map((p) => p.recorte))];
  const H = mt + mb + pontos.length * lh + grupos.length * gap;
  const lim = Math.min(0.12, Math.max(...pontos.map((p) => Math.max(Math.abs(p.ic95_inf), Math.abs(p.ic95_sup)))) * 1.05); // eixo cortado em ±0,12: o M2 tem intervalos muito largos
  const pw = W - ml - mr; const X = (v) => ml + ((Math.max(-lim, Math.min(lim, v)) + lim) / (2 * lim)) * pw;
  const fmt = (v, c = 3) => v.toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="system-ui, sans-serif"><rect width="${W}" height="${H}" fill="${COR.fundo}"/>`;
  s += `<text x="16" y="26" font-size="15" font-weight="600" fill="${COR.txt}">H05: o sinal muda quando se desconta a falha do leitor de digital?</text>`;
  s += `<text x="16" y="46" font-size="12" fill="${COR.txt2}">d = quanto o eleitor a mais liberado sem digital deu ao 13, menos o que deu o eleitor a mais liberado por digital (mesmo município).</text>`;
  s += `<text x="16" y="62" font-size="12" fill="${COR.txt2}">Ponto = estimativa; traço = intervalo de 95%. À direita do zero: a favor do 13; à esquerda: a favor do 22.</text>`;
  const step = lim > 0.06 ? 0.02 : 0.01;
  for (let v = -Math.floor(lim / step) * step; v <= lim + 1e-9; v += step) s += `<line x1="${X(v)}" x2="${X(v)}" y1="${mt - 8}" y2="${H - mb + 4}" stroke="${COR.grade}"/><text x="${X(v)}" y="${H - mb + 18}" font-size="11" text-anchor="middle" fill="${COR.txt2}">${v > 0 ? '+' : ''}${fmt(v, 2)}</text>`;
  s += `<line x1="${X(0)}" x2="${X(0)}" y1="${mt - 8}" y2="${H - mb + 4}" stroke="${COR.txt2}"/>`;
  let y = mt;
  for (const g of grupos) {
    s += `<text x="16" y="${y + lh / 2 + 4}" font-size="12" font-weight="600" fill="${COR.txt}">${g}</text>`;
    for (const p of pontos.filter((x) => x.recorte === g)) {
      const yc = y + lh / 2; const c = corDe(p.modelo);
      s += `<line x1="${X(p.ic95_inf)}" x2="${X(p.ic95_sup)}" y1="${yc}" y2="${yc}" stroke="${c}" stroke-width="2"/>`;
      if (p.ic95_inf < -lim || p.ic95_sup > lim) s += `<text x="${p.ic95_sup > lim ? X(lim) - 2 : X(-lim) + 2}" y="${yc - 4}" font-size="10" text-anchor="${p.ic95_sup > lim ? "end" : "start"}" fill="${c}">${p.ic95_sup > lim && p.ic95_inf < -lim ? "↔ cortado" : p.ic95_sup > lim ? "cortado →" : "← cortado"}</text>`;
      s += `<circle cx="${X(p.d)}" cy="${yc}" r="4.5" fill="${c}" stroke="${COR.fundo}" stroke-width="1.5"><title>${g}, ${p.modelo}: d = ${fmt(p.d)} (t = ${fmt(p.t, 1)}; ${p.secoes} seções)</title></circle>`;
      s += `<text x="${W - mr + 8}" y="${yc + 4}" font-size="11" fill="${COR.txt2}">${p.d > 0 ? '+' : ''}${fmt(p.d)} (t ${fmt(p.t, 1)})</text>`;
      y += lh;
    }
    y += gap;
  }
  MODS.forEach(([m, rot], i) => {
    const lx = 16 + (i % 2) * 440, ly = H - mb + 42 + Math.floor(i / 2) * 17;
    s += `<circle cx="${lx + 5}" cy="${ly - 4}" r="4.5" fill="${COR[m]}"/><text x="${lx + 14}" y="${ly}" font-size="11" fill="${COR.txt}">${rot}</text>`;
  });
  s += `<text x="16" y="${H - 28}" font-size="12" fill="${COR.txt}">Como ler: se o ponto azul encosta no zero, a troca de categoria pela falha do leitor explica o sinal. Se fica longe, não explica.</text>`;
  s += `<text x="16" y="${H - 12}" font-size="12" fill="${COR.txt}">O ponto laranja apaga a falha do leitor e também qualquer liberação pela brecha; serve de limite, não de prova. Traços além de ±0,12 estão cortados (valores na direita).</text>`;
  await writeFile(path.join(DIR_SAIDA, 'h05-leitor.svg'), `${s}</svg>\n`);
}
log(`→ ${arq}`);
console.log(JSON.stringify({ universo: res.universo, reproducaoDoc06: res.reproducaoDoc06,
  recortes: Object.fromEntries(Object.entries(res.recortes).map(([k, v]) => [k, { g13: v.ganho13, forca: v.forcaDoControle }])), familiaM1: res.familiaM1 }, null, 1));
