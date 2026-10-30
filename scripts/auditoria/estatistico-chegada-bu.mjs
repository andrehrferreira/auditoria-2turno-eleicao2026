// Estatístico eleitoral: ordem de CHEGADA dos BUs ao TSE × ordem de DIVULGAÇÃO (totalização) no 2º turno, Presidente.
// Hipótese a testar (André): "Às 19h, quando a divulgação foi liberada, mais de 90% dos BUs já tinham sido enviados
// ao TSE, mas foram liberados ao público de forma controlada, com variações e quedas impossíveis numa apuração aleatória."
// Lê data/parsed/auditoria/chegada-bu/secoes.csv (estatistico-chegada-bu-dados.mjs) e responde:
//   a) % de seções/votantes emitidos, recebidos e totalizados em cada horário (1º turno como linha de base);
//   b) atraso emissão → recebimento → totalização, por UF; a totalização segue a ordem de recebimento?;
//   c) a hora de recebimento/totalização depende da parcela do 22 dentro do mesmo local/zona/município?
//      (efeito, erro-padrão agrupado, permutação, poder com efeito injetado, 1º turno como linha de base);
//   d) curvas da parcela do 22 × % apurado em três ordens (totalização, recebimento, fim da votação) e teste de
//      embaralhamento dentro de UF / município / zona / local (reaproveita scripts/curva-totalizacao.mjs, com
//      gerador mulberry32 conforme o parecer cético 16);
//   e) arquivos para o gráfico: por-minuto.csv, por-percentual.csv, por-uf-minuto.csv, resumo.json.
// Uso: node --max-old-space-size=8192 scripts/auditoria/estatistico-chegada-bu.mjs [--replicas 200]
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';

const { values: opc } = parseArgs({ options: { replicas: { type: 'string', default: '200' } } });
const R = Number(opc.replicas);
const DIR = path.join(DIR_DADOS, 'parsed', 'auditoria', 'chegada-bu');
const inicio = Date.now();

// ---------- leitura ----------
const texto = await readFile(path.join(DIR, 'secoes.csv'), 'utf8');
const linhas = texto.split('\n');
const cab = linhas[0].split(',');
const ci = Object.fromEntries(cab.map((c, k) => [c, k]));
const N = linhas.length - 2 + (linhas.at(-1) === '' ? 0 : 1);
// segundos desde 00:00 de Brasília do dia da eleição (2T 25/10; 1T 04/10); NaN se vazio
const DIA2 = Date.UTC(2026, 9, 25), DIA1 = Date.UTC(2026, 9, 4);
const seg = (s, dia) => (s ? (Date.parse(`${s.replace(' ', 'T')}Z`) - dia) / 1000 : NaN);
const uf = new Array(N), chMun = new Array(N), chZona = new Array(N), chLocal = new Array(N), id = new Array(N);
const fim = new Float64Array(N), rec = new Float64Array(N), tot = new Float64Array(N);
const fim1 = new Float64Array(N), rec1 = new Float64Array(N), tot1 = new Float64Array(N);
const comp = new Float64Array(N), v13 = new Float64Array(N), v22 = new Float64Array(N), comp1 = new Float64Array(N), v13a = new Float64Array(N), v22a = new Float64Array(N);
const auxIgual = new Int8Array(N);
for (let i = 0; i < N; i++) {
  const c = linhas[i + 1].split(',');
  uf[i] = c[ci.uf];
  chMun[i] = `${c[ci.uf]}/${c[ci.municipio]}`;
  chZona[i] = `${chMun[i]}/${c[ci.zona]}`;
  chLocal[i] = `${chZona[i]}/${c[ci.local]}`;
  id[i] = `${chZona[i]}/${c[ci.secao]}`;
  fim[i] = seg(c[ci.fim_br], DIA2); rec[i] = seg(c[ci.receb_br], DIA2); tot[i] = seg(c[ci.tot_br], DIA2);
  fim1[i] = seg(c[ci.fim1_br], DIA1); rec1[i] = seg(c[ci.receb1_br], DIA1); tot1[i] = seg(c[ci.tot1_br], DIA1);
  comp[i] = +c[ci.comparecimento] || 0; v13[i] = +c[ci.v13] || 0; v22[i] = +c[ci.v22] || 0;
  comp1[i] = +c[ci.comparecimento1] || 0; v13a[i] = +c[ci.v13_1] || 0; v22a[i] = +c[ci.v22_1] || 0;
  auxIgual[i] = c[ci.aux_primeiro] === '' ? -1 : c[ci.aux_primeiro] === c[ci.receb_br] ? 1 : 0;
}
const H = (h, m = 0) => h * 3600 + m * 60;
const hhmm = (s) => (Number.isNaN(s) ? '' : `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`);
const r4 = (x) => Math.round(x * 1e4) / 1e4;
const r2 = (x) => Math.round(x * 100) / 100;
const quant = (arr, ps) => {
  const a = Float64Array.from(arr).sort();
  return Object.fromEntries(ps.map((p) => [`p${String(p * 100).replace('.', '_')}`, a.length ? a[Math.min(a.length - 1, Math.floor(p * (a.length - 1)))] : null]));
};
const PS = [0, 0.01, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99, 0.999, 1];
const resumo = { universo: { secoes: N }, comando: 'node --max-old-space-size=8192 scripts/auditoria/estatistico-chegada-bu.mjs', replicas: R };
const temVoto = (i) => v13[i] + v22[i] > 0;
const brasil = (i) => uf[i] !== 'zz';
resumo.universo.semFimConhecido = Array.from({ length: N }, (_, i) => i).filter((i) => Number.isNaN(fim[i])).length;
resumo.universo.semVoto13ou22 = Array.from({ length: N }, (_, i) => i).filter((i) => !temVoto(i)).length;
resumo.universo.auxPrimeiroIgualRecebimento = { igual: auxIgual.filter((x) => x === 1).length, diferente: auxIgual.filter((x) => x === 0).length, semAux: auxIgual.filter((x) => x === -1).length };

// ---------- a) cobertura por horário ----------
const HORAS = [[17, 0], [17, 30], [18, 0], [18, 30], [19, 0], [19, 30], [20, 0], [20, 30], [21, 0], [22, 0], [23, 0], [24, 0]];
const totComp = comp.reduce((a, b) => a + b, 0), totComp1 = comp1.reduce((a, b) => a + b, 0);
const nFim = N - resumo.universo.semFimConhecido;
resumo.a_cobertura = HORAS.map(([h, m]) => {
  const lim = H(h, m);
  let fS = 0, rS = 0, tS = 0, rC = 0, tC = 0, r1S = 0, t1S = 0, r1C = 0, f1S = 0;
  for (let i = 0; i < N; i++) {
    if (fim[i] < lim) fS++;
    if (rec[i] < lim) { rS++; rC += comp[i]; }
    if (tot[i] < lim) { tS++; tC += comp[i]; }
    if (fim1[i] < lim) f1S++;
    if (rec1[i] < lim) { r1S++; r1C += comp1[i]; }
    if (tot1[i] < lim) t1S++;
  }
  return { hora: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, emitidas: fS, emitidas_pct_brasil: r2((100 * fS) / nFim),
    recebidas: rS, recebidas_pct: r2((100 * rS) / N), recebidas_votantes_pct: r2((100 * rC) / totComp),
    totalizadas: tS, totalizadas_pct: r2((100 * tS) / N), totalizadas_votantes_pct: r2((100 * tC) / totComp),
    t1_emitidas_pct_brasil: r2((100 * f1S) / nFim), t1_recebidas: r1S, t1_recebidas_pct: r2((100 * r1S) / N), t1_recebidas_votantes_pct: r2((100 * r1C) / totComp1), t1_totalizadas_pct: r2((100 * t1S) / N) };
});
console.log('\n[a] cobertura (hora de Brasília; < hora):');
for (const l of resumo.a_cobertura) console.log(`  ${l.hora}  2T emitidas ${l.emitidas_pct_brasil}% | recebidas ${l.recebidas} (${l.recebidas_pct}%; votantes ${l.recebidas_votantes_pct}%) | totalizadas ${l.totalizadas} (${l.totalizadas_pct}%)  || 1T emitidas ${l.t1_emitidas_pct_brasil}% recebidas ${l.t1_recebidas_pct}% totalizadas ${l.t1_totalizadas_pct}%`);
// recebidas antes das 19h: composição
const antes19 = [];
for (let i = 0; i < N; i++) if (rec[i] < H(19)) antes19.push(i);
const porUfAntes = {};
for (const i of antes19) porUfAntes[uf[i]] = (porUfAntes[uf[i]] ?? 0) + 1;
resumo.a_recebidasAntes19h = { secoes: antes19.length, exterior: porUfAntes.zz ?? 0, brasil: antes19.length - (porUfAntes.zz ?? 0), porUf: porUfAntes,
  ate1710: antes19.filter((i) => rec[i] < H(17, 10)).length, entre1710e19: antes19.filter((i) => rec[i] >= H(17, 10)).length };

// fluxo por minuto (recebimento) e degraus
const fluxo = (arr, de, ate) => {
  const f = new Map();
  for (let i = 0; i < N; i++) if (arr[i] >= de && arr[i] < ate) { const m = Math.floor(arr[i] / 60); f.set(m, (f.get(m) ?? 0) + 1); }
  return f;
};
const fl2 = fluxo(rec, H(17), H(30)), fl1 = fluxo(rec1, H(17), H(30));
const lista = (f, de, ate) => { const o = []; for (let m = de / 60; m < ate / 60; m++) o.push(f.get(m) ?? 0); return o; };
resumo.a_fluxoRecebimento = { t2_1900a1940: lista(fl2, H(19), H(19, 40)), t1_1705a1830: lista(fl1, H(17, 5), H(18, 30)),
  t2_minutosSemRecebimentoEntre1708e1903: lista(fl2, H(17, 8), H(19, 3)).filter((x) => x === 0).length,
  t2_maiorMinuto: Math.max(...fl2.values()), t1_maiorMinuto: Math.max(...fl1.values()) };
// patamares: chegada livre (Poisson) daria variância ≈ média; fila atendida em ritmo fixo dá variância bem menor
const patamar = (f, de, ate) => { const v = lista(f, de, ate); const m = v.reduce((a, b) => a + b, 0) / v.length; const s2 = v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1); return { minutos: v.length, media: r2(m), variancia: r2(s2), indiceDispersao: r4(s2 / m) }; };
resumo.a_patamares = { t2_1918a1924: patamar(fl2, H(19, 18), H(19, 24)), t2_1924a1930: patamar(fl2, H(19, 24), H(19, 30)), t2_1930a1940: patamar(fl2, H(19, 30), H(19, 40)),
  t1_1714a1727: patamar(fl1, H(17, 14), H(17, 27)), t1_1740a1747: patamar(fl1, H(17, 40), H(17, 47)), t1_1753a1801: patamar(fl1, H(17, 53), H(18, 1)) };
{
  const entre = []; for (let i = 0; i < N; i++) if (rec[i] >= H(17, 10) && rec[i] < H(19)) entre.push(i);
  resumo.a_recebidasEntre1710e19h = { secoes: entre.length, exterior: entre.filter((i) => uf[i] === 'zz').length, comVotos: entre.filter(temVoto).length };
}

// ---------- b) atrasos ----------
const atrasoTR = [], atrasoTR1 = [], atrasoRF = [], atrasoRF1 = [];
for (let i = 0; i < N; i++) {
  atrasoTR.push(tot[i] - rec[i]); atrasoTR1.push(tot1[i] - rec1[i]);
  if (!Number.isNaN(fim[i])) atrasoRF.push((rec[i] - fim[i]) / 60);
  if (!Number.isNaN(fim1[i]) && !Number.isNaN(rec1[i])) atrasoRF1.push((rec1[i] - fim1[i]) / 60);
}
resumo.b_atrasos = {
  totMenosReceb_s_2t: quant(atrasoTR, PS), totMenosReceb_s_1t: quant(atrasoTR1, PS),
  recebMenosFim_min_2t: quant(atrasoRF, PS), recebMenosFim_min_1t: quant(atrasoRF1, PS),
  recebAntesDoFim_2t: atrasoRF.filter((x) => x < 0).length, totAntesDoReceb_2t: atrasoTR.filter((x) => x < 0).length,
  totIgualReceb_2t: atrasoTR.filter((x) => x === 0).length,
};
// represamento: emitidas antes das 19h e recebidas depois
let emit19 = 0, emit19rec = 0, emit19comp = 0, emit19recComp = 0;
for (let i = 0; i < N; i++) if (fim[i] < H(19)) { emit19++; emit19comp += comp[i]; if (rec[i] >= H(19)) { emit19rec++; emit19recComp += comp[i]; } }
resumo.b_represamento = { emitidasAntes19h: emit19, emitidasAntes19hPct: r2((100 * emit19) / nFim), dessasRecebidasDepois19h: emit19rec, pct: r2((100 * emit19rec) / emit19), votantesPct: r2((100 * emit19recComp) / emit19comp) };
// por UF
const ufs = [...new Set(uf)].sort();
resumo.b_porUf = ufs.map((u) => {
  const idx = []; for (let i = 0; i < N; i++) if (uf[i] === u) idx.push(i);
  const q = (arr, p) => { const a = Float64Array.from(idx.map((i) => arr[i]).filter((x) => !Number.isNaN(x))).sort(); return a.length ? a[Math.floor(p * (a.length - 1))] : NaN; };
  const tr = Float64Array.from(idx.map((i) => tot[i] - rec[i])).sort();
  const rf = Float64Array.from(idx.filter((i) => !Number.isNaN(fim[i])).map((i) => (rec[i] - fim[i]) / 60)).sort();
  return { uf: u, secoes: idx.length, fim_p50: hhmm(q(fim, 0.5)), receb_p01: hhmm(q(rec, 0.01)), receb_p50: hhmm(q(rec, 0.5)), receb_p99: hhmm(q(rec, 0.99)),
    t1_receb_p50: hhmm(q(rec1, 0.5)), recebMenosFim_min_p50: rf.length ? r2(rf[Math.floor(rf.length / 2)]) : null,
    totMenosReceb_s_p50: tr[Math.floor(tr.length / 2)], totMenosReceb_s_p99: tr[Math.floor(0.99 * (tr.length - 1))], totMenosReceb_s_max: tr.at(-1),
    recebidasAntes19h: idx.filter((i) => rec[i] < H(19)).length };
});
// ordem UF entre turnos (Spearman das medianas)
const spearman = (a, b) => {
  const rk = (v) => { const o = v.map((x, k) => [x, k]).sort((p, q) => p[0] - q[0]); const r = new Array(v.length); o.forEach(([, k], j) => { r[k] = j; }); return r; };
  const ra = rk(a), rb = rk(b), n = a.length, ma = (n - 1) / 2;
  let sab = 0, saa = 0, sbb = 0;
  for (let k = 0; k < n; k++) { sab += (ra[k] - ma) * (rb[k] - ma); saa += (ra[k] - ma) ** 2; sbb += (rb[k] - ma) ** 2; }
  return sab / Math.sqrt(saa * sbb);
};
{
  const br = resumo.b_porUf.filter((x) => x.uf !== 'zz');
  const s = (t) => { const [h, m, ss] = t.split(':').map(Number); return h * 3600 + m * 60 + ss; };
  resumo.b_ordemUfEntreTurnos_spearman = r4(spearman(br.map((x) => s(x.t1_receb_p50)), br.map((x) => s(x.receb_p50))));
}

// ordem de totalização × ordem de recebimento, entre as recebidas a partir das 19h
{
  const idx = []; for (let i = 0; i < N; i++) if (rec[i] >= H(19)) idx.push(i);
  idx.sort((a, b) => rec[a] - rec[b] || tot[a] - tot[b]);
  // inversões estritas (rec_i < rec_j e tot_i > tot_j): merge sort sobre tot na ordem de rec; empates de rec não contam
  const n = idx.length;
  const grupoRec = new Float64Array(n), tt = new Float64Array(n);
  idx.forEach((i, k) => { grupoRec[k] = rec[i]; tt[k] = tot[i]; });
  // conta pares com rec diferente e tot invertido = inversões totais − inversões dentro de blocos de rec igual (zero, já ordenado por tot)
  let inv = 0;
  const tmp = new Float64Array(n);
  const ms = (lo, hi) => {
    if (hi - lo < 2) return;
    const mid = (lo + hi) >> 1; ms(lo, mid); ms(mid, hi);
    let a = lo, b = mid, k = lo;
    while (a < mid && b < hi) { if (tt[a] <= tt[b]) tmp[k++] = tt[a++]; else { inv += mid - a; tmp[k++] = tt[b++]; } }
    while (a < mid) tmp[k++] = tt[a++];
    while (b < hi) tmp[k++] = tt[b++];
    for (let j = lo; j < hi; j++) tt[j] = tmp[j];
  };
  ms(0, n);
  // pares com rec diferente
  let empRec = 0; for (let k = 0, j; k < n; k = j) { j = k; while (j < n && grupoRec[j] === grupoRec[k]) j++; empRec += ((j - k) * (j - k - 1)) / 2; }
  const pares = (n * (n - 1)) / 2 - empRec;
  // ultrapassadas: existe seção recebida mais de L s depois e totalizada antes
  const ultrap = (L) => {
    const sufMin = new Float64Array(n + 1); sufMin[n] = Infinity;
    for (let k = n - 1; k >= 0; k--) sufMin[k] = Math.min(sufMin[k + 1], tot[idx[k]]);
    let c = 0, j = 0;
    for (let k = 0; k < n; k++) { while (j < n && rec[idx[j]] <= rec[idx[k]] + L) j++; if (sufMin[j] < tot[idx[k]]) c++; }
    return c;
  };
  // Spearman global rec × tot (postos com empates resolvidos pela ordem; n grande, efeito desprezível)
  const r = spearman(idx.map((i) => rec[i]), idx.map((i) => tot[i]));
  resumo.b_ordemTotalizacao = { secoesRecebidasDesde19h: n, paresComRecebimentoDiferente: pares, paresInvertidos: inv, paresInvertidosPct: r4((100 * inv) / pares),
    spearman: Math.round(r * 1e6) / 1e6, ultrapassadasPorRecebidaMaisDe60sDepois: ultrap(60), ultrapassadasPorRecebidaMaisDe300sDepois: ultrap(300), ultrapassadasPorRecebidaMaisDe1800sDepois: ultrap(1800) };
}
// maiores atrasos receb → tot (para conferência)
{
  const o = Array.from({ length: N }, (_, i) => i).sort((a, b) => (tot[b] - rec[b]) - (tot[a] - rec[a])).slice(0, 15);
  resumo.b_maioresAtrasosTotalizacao = o.map((i) => ({ secao: id[i], receb: hhmm(rec[i]), tot: hhmm(tot[i]), atraso_s: tot[i] - rec[i], p22: temVoto(i) ? r4(v22[i] / (v13[i] + v22[i])) : null }));
}
// correlação 1T × 2T da ordem de recebimento dentro da zona e do local (postos percentuais dentro do grupo)
const postoNoGrupo = (chaves, val, filtro) => {
  const g = new Map();
  for (let i = 0; i < N; i++) if (filtro(i)) { const k = chaves[i]; if (!g.has(k)) g.set(k, []); g.get(k).push(i); }
  const p = new Float64Array(N).fill(NaN);
  for (const l of g.values()) {
    if (l.length < 2) continue;
    l.sort((a, b) => val[a] - val[b]);
    // empates: posto médio
    for (let k = 0, j; k < l.length; k = j) { j = k; while (j < l.length && val[l[j]] === val[l[k]]) j++; const m = (k + j - 1) / 2 / (l.length - 1); for (let q = k; q < j; q++) p[l[q]] = m; }
  }
  return p;
};
const pearson = (a, b, filtro = () => true) => {
  let n = 0, sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
  for (let i = 0; i < a.length; i++) { if (Number.isNaN(a[i]) || Number.isNaN(b[i]) || !filtro(i)) continue; n++; sa += a[i]; sb += b[i]; saa += a[i] * a[i]; sbb += b[i] * b[i]; sab += a[i] * b[i]; }
  return { n, r: (sab - (sa * sb) / n) / Math.sqrt((saa - (sa * sa) / n) * (sbb - (sb * sb) / n)) };
};
{
  const f = (i) => brasil(i) && !Number.isNaN(rec1[i]);
  const z1 = postoNoGrupo(chZona, rec1, f), z2 = postoNoGrupo(chZona, rec, f);
  const l1 = postoNoGrupo(chLocal, rec1, f), l2 = postoNoGrupo(chLocal, rec, f);
  const m1 = postoNoGrupo(chMun, rec1, f), m2 = postoNoGrupo(chMun, rec, f);
  resumo.b_ordem1Tx2T = { dentroDoMunicipio: pearson(m1, m2), dentroDaZona: pearson(z1, z2), dentroDoLocal: pearson(l1, l2) };
}
console.log('\n[b] atrasos e ordem:', JSON.stringify({ rep: resumo.b_represamento, tr: resumo.b_atrasos.totMenosReceb_s_2t, ordem: resumo.b_ordemTotalizacao, ufs: resumo.b_ordemUfEntreTurnos_spearman, o1x2: resumo.b_ordem1Tx2T }));

// ---------- c) a liberação depende do voto? ----------
// Regressão com efeito fixo do estrato (demeaning) e erro-padrão agrupado (sanduíche) por município.
function regressao(sel, y, Xs, estrato, cluster) {
  const n = sel.length, k = Xs.length;
  const grupos = new Map();
  for (const i of sel) { const g = estrato(i); if (!grupos.has(g)) grupos.set(g, []); grupos.get(g).push(i); }
  const Y = new Float64Array(n), X = Xs.map(() => new Float64Array(n)), cl = new Array(n);
  let p = 0, usados = 0;
  for (const l of grupos.values()) {
    const my = l.reduce((a, i) => a + y(i), 0) / l.length;
    const mx = Xs.map((x) => l.reduce((a, i) => a + x(i), 0) / l.length);
    for (const i of l) { Y[p] = y(i) - my; Xs.forEach((x, j) => { X[j][p] = x(i) - mx[j]; }); cl[p] = cluster(i); p++; }
    if (l.length > 1) usados += l.length;
  }
  const XtX = Array.from({ length: k }, (_, a) => Array.from({ length: k }, (_, b) => { let s = 0; for (let q = 0; q < n; q++) s += X[a][q] * X[b][q]; return s; }));
  const XtY = Array.from({ length: k }, (_, a) => { let s = 0; for (let q = 0; q < n; q++) s += X[a][q] * Y[q]; return s; });
  const inv = inverter(XtX);
  const b = inv.map((row) => row.reduce((s, v, j) => s + v * XtY[j], 0));
  const meat = Array.from({ length: k }, () => new Float64Array(k));
  const somaCl = new Map();
  for (let q = 0; q < n; q++) {
    const u = Y[q] - b.reduce((s, bj, j) => s + bj * X[j][q], 0);
    const v = somaCl.get(cl[q]) ?? new Float64Array(k);
    for (let j = 0; j < k; j++) v[j] += X[j][q] * u;
    somaCl.set(cl[q], v);
  }
  for (const v of somaCl.values()) for (let a = 0; a < k; a++) for (let c = 0; c < k; c++) meat[a][c] += v[a] * v[c];
  const G = somaCl.size, ajuste = G / (G - 1);
  const V = inv.map((row, a) => inv.map((_, c) => ajuste * row.reduce((s, ra, j) => s + ra * meat[j].reduce((t, mjl, l) => t + mjl * inv[l][c], 0), 0)));
  let syy = 0, sxx = 0; for (let q = 0; q < n; q++) { syy += Y[q] * Y[q]; sxx += X[0][q] * X[0][q]; }
  return { n, emEstratosComVariacao: usados, estratos: grupos.size, clusters: G, b: b.map(r4), se: V.map((r, a) => r4(Math.sqrt(r[a]))), z: r2(b[0] / Math.sqrt(V[0][0])),
    sdDentroY: r4(Math.sqrt(syy / n)), sdDentroX: r4(Math.sqrt(sxx / n)), Y, X0: X[0] };
}
function inverter(M) {
  const n = M.length, A = M.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    const d = A[c][c]; for (let j = 0; j < 2 * n; j++) A[c][j] /= d;
    for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c]; for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[c][j]; }
  }
  return A.map((r) => r.slice(n));
}
let semente = 2026;
const aleatorio = () => {
  semente = (semente + 0x6d2b79f5) | 0;
  let t = Math.imul(semente ^ (semente >>> 15), 1 | semente);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const p22 = (i) => v22[i] / (v13[i] + v22[i]);
const p22a = (i) => v22a[i] / (v13a[i] + v22a[i]);
const limpar = ({ Y, X0, ...r }) => r;
// correlação parcial dentro do estrato via postos (robusta): posto percentual de y e de x dentro do estrato
const postoCor = (sel, yv, xv, chaves) => {
  const f = new Set(sel);
  const filtro = (i) => f.has(i);
  return pearson(postoNoGrupo(chaves, yv, filtro), postoNoGrupo(chaves, xv, filtro)).r;
};
const permutacaoSd = (reg, reps) => {
  // embaralha X0 dentro do estrato já demeaned? Não: X0 demeaned por estrato tem média 0 em cada estrato, e a permutação
  // dentro do estrato preserva isso. Usa os índices do estrato guardados em reg.ordemEstratos.
  const bs = [];
  const { Y, X0, limites } = reg;
  const xp = Float64Array.from(X0);
  let sxx = 0; for (let q = 0; q < xp.length; q++) sxx += xp[q] * xp[q];
  for (let r = 0; r < reps; r++) {
    for (let g = 0; g < limites.length - 1; g++) {
      for (let a = limites[g + 1] - 1; a > limites[g]; a--) { const j = limites[g] + Math.floor(aleatorio() * (a - limites[g] + 1)); [xp[a], xp[j]] = [xp[j], xp[a]]; }
    }
    let sxy = 0; for (let q = 0; q < xp.length; q++) sxy += xp[q] * Y[q];
    bs.push(sxy / sxx);
  }
  const m = bs.reduce((a, b) => a + b, 0) / reps;
  return { media: r4(m), sd: r4(Math.sqrt(bs.reduce((a, b) => a + (b - m) ** 2, 0) / (reps - 1))) };
};
// a regressão guarda a ordem dos estratos (para a permutação): reconstrói os limites
function comLimites(sel, estrato, reg) {
  const tam = new Map();
  for (const i of sel) { const g = estrato(i); tam.set(g, (tam.get(g) ?? 0) + 1); }
  const limites = [0]; for (const t of tam.values()) limites.push(limites.at(-1) + t);
  return { ...reg, limites };
}
const testar = (rotulo, sel, y, xs, estrato, nomesX) => {
  const reg = comLimites(sel, estrato, regressao(sel, y, xs, estrato, (i) => chMun[i]));
  const out = { rotulo, ...limpar(reg), x: nomesX };
  delete out.limites;
  if (xs.length === 1) out.permutacao = permutacaoSd(reg, 100);
  out.minutosPor10ppDe22 = r2(reg.b[0] / 10);
  return { out, reg };
};
// c1) estágio de totalização: atraso tot − receb (s) × parcela do 22, dentro de município × minuto de recebimento
const selTodas = []; for (let i = 0; i < N; i++) if (temVoto(i)) selTodas.push(i);
const c1 = testar('c1: atraso receb→tot (s) ~ p22 | município × minuto de recebimento (2T)', selTodas, (i) => tot[i] - rec[i], [p22],
  (i) => `${chMun[i]}|${Math.floor(rec[i] / 60)}`, ['p22']);
c1.out.segundosPor10ppDe22 = r2(c1.out.b[0] / 10); delete c1.out.minutosPor10ppDe22;
// c2) a liberação (hora de recebimento = hora de totalização) × parcela do 22, entre as seções emitidas antes das 19h
const selRep = []; for (let i = 0; i < N; i++) if (temVoto(i) && fim[i] < H(19) && brasil(i)) selRep.push(i);
const yMin = (i) => (tot[i] - H(19)) / 60;
const c2 = [];
for (const [nome, est] of [['local', (i) => chLocal[i]], ['zona', (i) => chZona[i]], ['município', (i) => chMun[i]], ['UF', (i) => uf[i]]]) {
  c2.push(testar(`c2: hora de totalização (min) ~ p22 | ${nome} (2T, emitidas antes das 19h)`, selRep, yMin, [p22], est, ['p22']));
}
const selRep1 = selRep.filter((i) => !Number.isNaN(fim1[i]) && !Number.isNaN(rec1[i]) && v13a[i] + v22a[i] > 0);
c2.push(testar('c2: + fim da votação 2T + recebimento no 1T | local', selRep1, yMin, [p22, (i) => fim[i] / 60, (i) => rec1[i] / 60], (i) => chLocal[i], ['p22', 'fim2T_min', 'receb1T_min']));
c2.push(testar('c2: hora de totalização (min) ~ virada (p22 2T − p22 1T) | local', selRep1, yMin, [(i) => p22(i) - p22a(i)], (i) => chLocal[i], ['virada']));
// linha de base: 1º turno, mesma pergunta (hora de totalização no 1T × parcela do 22 no 1T entre 13 e 22)
const selT1 = []; for (let i = 0; i < N; i++) if (brasil(i) && v13a[i] + v22a[i] > 0 && !Number.isNaN(tot1[i])) selT1.push(i);
const y1 = (i) => (tot1[i] - H(17)) / 60;
for (const [nome, est] of [['local', (i) => chLocal[i]], ['zona', (i) => chZona[i]], ['município', (i) => chMun[i]]]) {
  c2.push(testar(`base 1T: hora de totalização (min) ~ p22 1T | ${nome}`, selT1, y1, [p22a], est, ['p22_1T']));
}
resumo.c_dependencia = { c1: c1.out, c2: c2.map((x) => x.out) };
resumo.c_postos = {
  local2T: r4(postoCor(selRep, tot, Float64Array.from({ length: N }, (_, i) => (temVoto(i) ? p22(i) : NaN)), chLocal)),
  zona2T: r4(postoCor(selRep, tot, Float64Array.from({ length: N }, (_, i) => (temVoto(i) ? p22(i) : NaN)), chZona)),
  local1T: r4(postoCor(selT1, tot1, Float64Array.from({ length: N }, (_, i) => (v13a[i] + v22a[i] > 0 ? p22a(i) : NaN)), chLocal)),
  zona1T: r4(postoCor(selT1, tot1, Float64Array.from({ length: N }, (_, i) => (v13a[i] + v22a[i] > 0 ? p22a(i) : NaN)), chZona)),
};
console.log('\n[c] dependência:');
for (const x of [c1.out, ...c2.map((y) => y.out)]) console.log(`  ${x.rotulo}: b=${x.b.join(', ')} se=${x.se.join(', ')} z=${x.z} n=${x.n} estratos=${x.estratos}${x.permutacao ? ` perm sd=${x.permutacao.sd}` : ''}`);
console.log('  postos:', JSON.stringify(resumo.c_postos));

// ---------- d) curvas ----------
const PASSOS = 200;
const ordenar = (sel, t) => Int32Array.from(sel).sort((a, b) => t[a] - t[b] || (id[a] < id[b] ? -1 : 1));
/** Parcela do 22 entre 13 e 22, acumulada a cada 0,5% das seções na ordem dada. */
function curva(ordem, a13v = v13, a22v = v22) {
  const pts = new Float64Array(PASSOS);
  let a13 = 0, a22 = 0, k = 0;
  const n = ordem.length;
  for (let q = 0; q < n; q++) {
    const i = ordem[q]; a13 += a13v[i]; a22 += a22v[i];
    while (k < PASSOS && q + 1 >= Math.round(((k + 1) * n) / PASSOS)) { pts[k] = a22 / (a13 + a22); k++; }
  }
  return pts;
}
const selBr = []; for (let i = 0; i < N; i++) if (brasil(i) && temVoto(i) && !Number.isNaN(fim[i])) selBr.push(i);
const ordTot = ordenar(selBr, tot), ordRec = ordenar(selBr, rec), ordFim = ordenar(selBr, fim), ordTotTudo = ordenar(selTodas, tot);
const cTot = curva(ordTot), cRec = curva(ordRec), cFim = curva(ordFim), cTotTudo = curva(ordTotTudo);
const maxDif = (a, b, de = 0) => { let m = 0, onde = 0; for (let k = de; k < PASSOS; k++) { const d = Math.abs(a[k] - b[k]); if (d > m) { m = d; onde = k; } } return { pp: r4(100 * m), emPct: (onde + 1) * (100 / PASSOS) }; };
resumo.d_curvas = { secoes: selBr.length, final22: r4(100 * cTot.at(-1)),
  totalizacaoXrecebimento: maxDif(cTot, cRec), totalizacaoXrecebimento_aPartirDe1_5pct: maxDif(cTot, cRec, 2),
  totalizacaoXfimDaVotacao: maxDif(cTot, cFim), totalizacaoXfimDaVotacao_aPartirDe5pct: maxDif(cTot, cFim, 9),
  extremos: Object.fromEntries([['totalizacao', cTot], ['recebimento', cRec], ['fim', cFim], ['totalizacaoComExterior', cTotTudo]].map(([n, c]) => {
    let mx = -1, mn = 2, kx = 0, kn = 0; for (let k = 0; k < PASSOS; k++) { if (c[k] > mx) { mx = c[k]; kx = k; } if (c[k] < mn) { mn = c[k]; kn = k; } }
    return [n, { max22: r4(100 * mx), emPct: (kx + 1) / 2, min22: r4(100 * mn), emPctMin: (kn + 1) / 2, aos0_5pct: r4(100 * c[0]), aos1pct: r4(100 * c[1]), aos5pct: r4(100 * c[9]), aos10pct: r4(100 * c[19]), aos25pct: r4(100 * c[49]), aos50pct: r4(100 * c[99]), aos75pct: r4(100 * c[149]), aos90pct: r4(100 * c[179]) }];
  })) };
// embaralhamento dentro do grupo, mantendo a sequência de grupos da ordem real de totalização
function preparar(ordem, chaves) {
  const gid = new Map(), membros = [];
  const seqG = new Int32Array(ordem.length);
  ordem.forEach((i, q) => { const k = chaves[i]; if (!gid.has(k)) { gid.set(k, membros.length); membros.push([]); } const g = gid.get(k); membros[g].push(i); seqG[q] = g; });
  return { seqG, membros: membros.map((m) => Int32Array.from(m)) };
}
function embaralhar({ seqG, membros }) {
  const cop = membros.map((m) => { const c = Int32Array.from(m); for (let a = c.length - 1; a > 0; a--) { const j = Math.floor(aleatorio() * (a + 1)); const t = c[a]; c[a] = c[j]; c[j] = t; } return c; });
  const cur = new Int32Array(membros.length);
  const o = new Int32Array(seqG.length);
  for (let q = 0; q < seqG.length; q++) { const g = seqG[q]; o[q] = cop[g][cur[g]++]; }
  return o;
}
const GRUPOS = [['UF', uf], ['municipio', chMun], ['zona', chZona], ['local', chLocal]];
/**
 * Teste de embaralhamento de uma curva: a q-ésima posição da fila mantém o grupo e o horário reais; as seções trocam de
 * lugar só dentro do grupo. Mede (1) o desvio máximo padronizado da curva real em relação às embaralhadas (p por
 * permutação) e (2) o maior salto da parcela de um minuto para o outro, depois de 1% apurado.
 */
function testeCurva(ordem, tempo, a13v, a22v) {
  const cReal = curva(ordem, a13v, a22v);
  const tempos = Float64Array.from(ordem, (i) => tempo[i]);
  const minutosFim = [];
  const m0 = Math.floor(tempos[0] / 60), m1 = Math.floor(tempos.at(-1) / 60);
  for (let m = m0, q = 0; m <= m1; m++) { while (q < tempos.length && Math.floor(tempos[q] / 60) <= m) q++; minutosFim.push(q); }
  const lim = Math.round(0.01 * ordem.length);
  const porMinuto = (o) => {
    const c = new Float64Array(minutosFim.length);
    let a13 = 0, a22 = 0, q = 0;
    minutosFim.forEach((fimQ, k) => { while (q < fimQ) { const i = o[q++]; a13 += a13v[i]; a22 += a22v[i]; } c[k] = a13 + a22 > 0 ? a22 / (a13 + a22) : NaN; });
    return c;
  };
  const saltos = (cm) => {
    let maxAbs = 0, maiorQueda = 0, maiorSubida = 0, soma2 = 0;
    for (let k = 1; k < cm.length; k++) {
      if (minutosFim[k - 1] < lim || Number.isNaN(cm[k - 1])) continue;
      const d = cm[k] - cm[k - 1];
      maxAbs = Math.max(maxAbs, Math.abs(d)); maiorQueda = Math.min(maiorQueda, d); maiorSubida = Math.max(maiorSubida, d); soma2 += d * d;
    }
    return { maxAbs, maiorQueda, maiorSubida, soma2 };
  };
  const sReal = saltos(porMinuto(ordem));
  const out = { secoes: ordem.length, final22: r4(100 * cReal.at(-1)), grupos: {} };
  const envs = {};
  for (const [nome, chaves] of GRUPOS) {
    const prep = preparar(ordem, chaves);
    const reps = [], sal = [];
    for (let r = 0; r < R; r++) { const o = embaralhar(prep); reps.push(curva(o, a13v, a22v)); sal.push(saltos(porMinuto(o))); }
    const media = new Float64Array(PASSOS), sd = new Float64Array(PASSOS), lo = new Float64Array(PASSOS), hi = new Float64Array(PASSOS);
    for (let k = 0; k < PASSOS; k++) {
      const v = reps.map((c) => c[k]).sort((a, b) => a - b);
      media[k] = v.reduce((a, b) => a + b, 0) / R;
      sd[k] = Math.sqrt(v.reduce((a, b) => a + (b - media[k]) ** 2, 0) / (R - 1));
      lo[k] = v[Math.floor(0.025 * (R - 1))]; hi[k] = v[Math.ceil(0.975 * (R - 1))];
    }
    const T = (c) => { let m = 0; for (let k = 0; k < PASSOS; k++) if (sd[k] > 0) m = Math.max(m, Math.abs(c[k] - media[k]) / sd[k]); return m; };
    const tReal = T(cReal), tReps = reps.map(T);
    const pv = (campo) => r4((1 + sal.filter((s) => Math.abs(s[campo]) >= Math.abs(sReal[campo])).length) / (R + 1));
    let maxDev = 0, onde = 0, sinal = 0;
    for (let k = 0; k < PASSOS; k++) { const d = cReal[k] - media[k]; if (Math.abs(d) > maxDev) { maxDev = Math.abs(d); onde = k; sinal = Math.sign(d); } }
    let maxDev5 = 0; for (let k = 9; k < PASSOS; k++) maxDev5 = Math.max(maxDev5, Math.abs(cReal[k] - media[k]));
    envs[nome] = { lo, hi, media };
    out.grupos[nome] = { grupos: prep.membros.length, maiorDesvioDaMedia_pp: r4(100 * maxDev * sinal), emPct: (onde + 1) / 2, maiorDesvioDaMedia_aPartirDe5pct_pp: r4(100 * maxDev5),
      pontosForaDoEnvelope95: Array.from({ length: PASSOS }, (_, k) => k).filter((k) => cReal[k] < lo[k] || cReal[k] > hi[k]).length, de: PASSOS,
      estatisticaMaxZ: r2(tReal), pValorMaxZ: r4((1 + tReps.filter((x) => x >= tReal).length) / (R + 1)),
      saltoPorMinuto: { real_maxAbs_pp: r4(100 * sReal.maxAbs), real_maiorQueda_pp: r4(100 * sReal.maiorQueda), real_maiorSubida_pp: r4(100 * sReal.maiorSubida),
        embaralhado_maxAbs_pp: Object.fromEntries(Object.entries(quant(sal.map((s) => 100 * s.maxAbs), [0.025, 0.5, 0.975])).map(([k, v]) => [k, r4(v)])),
        pValorMaxAbs: pv('maxAbs'), pValorMaiorQueda: pv('maiorQueda'), pValorSomaQuadrados: r4((1 + sal.filter((s) => s.soma2 >= sReal.soma2).length) / (R + 1)) } };
  }
  const o = Int32Array.from(ordem); for (let a = o.length - 1; a > 0; a--) { const j = Math.floor(aleatorio() * (a + 1)); const t = o[a]; o[a] = o[j]; o[j] = t; }
  envs.aleatoria = curva(o, a13v, a22v);
  out.ordemAleatoria = { aos1pct: r4(100 * envs.aleatoria[1]), aos10pct: r4(100 * envs.aleatoria[19]), maxAbsPorMinuto_pp: r4(100 * saltos(porMinuto(o)).maxAbs) };
  return { out, envs, cReal };
}
const t2 = testeCurva(ordTot, tot, v13, v22);
resumo.d_embaralhamento_2T = t2.out;
const env = t2.envs;
console.log('\n[d] 2T:', JSON.stringify(t2.out));
// linha de base: 1º turno, ordem real de totalização, parcela do 22 entre 13 e 22 no 1º turno
const selT1c = []; for (let i = 0; i < N; i++) if (brasil(i) && v13a[i] + v22a[i] > 0 && !Number.isNaN(tot1[i])) selT1c.push(i);
const t1 = testeCurva(ordenar(selT1c, tot1), tot1, v13a, v22a);
resumo.d_embaralhamento_1T = t1.out;
console.log('[d] 1T:', JSON.stringify(t1.out));

// lote das 19:03 (primeiro lote depois da liberação): a ordem de totalização dentro do lote depende da parcela do 22?
{
  const lote = []; for (let i = 0; i < N; i++) if (brasil(i) && temVoto(i) && rec[i] >= H(19, 3) && rec[i] < H(19, 4)) lote.push(i);
  const porUf = new Map();
  for (const i of lote) { const u = porUf.get(uf[i]) ?? { n: 0, v13: 0, v22: 0, t: [] }; u.n++; u.v13 += v13[i]; u.v22 += v22[i]; u.t.push(tot[i]); porUf.set(uf[i], u); }
  const ufsL = [...porUf].map(([u, x]) => ({ uf: u, n: x.n, p22: x.v22 / (x.v13 + x.v22), tMed: x.t.sort((a, b) => a - b)[Math.floor(x.t.length / 2)] }));
  const rho = spearman(ufsL.map((x) => x.tMed), ufsL.map((x) => x.p22));
  // permutação exata aproximada: embaralha as horas medianas entre UFs
  let maiores = 0; const P = 20000;
  for (let r = 0; r < P; r++) {
    const t = ufsL.map((x) => x.tMed); for (let a = t.length - 1; a > 0; a--) { const j = Math.floor(aleatorio() * (a + 1)); [t[a], t[j]] = [t[j], t[a]]; }
    if (Math.abs(spearman(t, ufsL.map((x) => x.p22))) >= Math.abs(rho)) maiores++;
  }
  const ordL = ordenar(lote, tot), ordLr = ordenar(lote, rec);
  const meio = Math.floor(lote.length / 2);
  const parc = (o, de, ate) => { let a = 0, b = 0; for (let q = de; q < ate; q++) { a += v13[o[q]]; b += v22[o[q]]; } return r4(100 * b / (a + b)); };
  // dentro do lote, controlando a UF: regressão da hora de totalização na parcela do 22 com efeito fixo de município
  const reg = regressao(lote, (i) => tot[i] - rec[i], [p22], (i) => chMun[i], (i) => chMun[i]);
  resumo.d_lote1903 = { secoes: lote.length, recebidoEntre: [hhmm(Math.min(...lote.map((i) => rec[i]))), hhmm(Math.max(...lote.map((i) => rec[i])))],
    totalizadoEntre: [hhmm(Math.min(...lote.map((i) => tot[i]))), hhmm(Math.max(...lote.map((i) => tot[i])))],
    p22_primeiraMetadeTotalizada: parc(ordL, 0, meio), p22_segundaMetadeTotalizada: parc(ordL, meio, lote.length),
    p22_primeiraMetadeRecebida: parc(ordLr, 0, meio), p22_segundaMetadeRecebida: parc(ordLr, meio, lote.length),
    ufs: ufsL.length, spearmanUf_horaMedianaTot_x_p22: r4(rho), pPermutacaoUf: r4((maiores + 1) / (P + 1)),
    dentroDoMunicipio_atrasoS_por10pp: r2(reg.b[0] / 10), z: reg.z,
    porUf: ufsL.sort((a, b) => a.tMed - b.tMed).map((x) => ({ uf: x.uf, n: x.n, p22: r4(x.p22), totMediana: hhmm(x.tMed) })) };
  console.log('[d] lote 19:03:', JSON.stringify({ ...resumo.d_lote1903, porUf: undefined }));
}

// poder do teste c2 (local): atrasa em δ minutos as seções com p22 acima da mediana do próprio local; mede z e o efeito na curva
{
  const sel = selRep;
  const med = new Map();
  { const g = new Map(); for (const i of sel) { const k = chLocal[i]; if (!g.has(k)) g.set(k, []); g.get(k).push(p22(i)); }
    for (const [k, v] of g) { v.sort((a, b) => a - b); med.set(k, v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2); } }
  const alto = new Int8Array(N); for (const i of sel) alto[i] = p22(i) > med.get(chLocal[i]) ? 1 : 0;
  resumo.c_poder = { desenho: 'atraso de δ min nas seções com p22 acima da mediana do próprio local (emitidas antes das 19h); z do teste c2 por local e deslocamento máximo da curva (a partir de 2% apurado)', casos: [] };
  for (const d of [0.25, 0.5, 1, 2, 5, 10, 30]) {
    const reg = regressao(sel, (i) => yMin(i) + d * alto[i], [p22], (i) => chLocal[i], (i) => chMun[i]);
    const tAlt = Float64Array.from(tot); for (const i of sel) if (alto[i]) tAlt[i] += d * 60;
    const c = curva(ordenar(selBr, tAlt));
    resumo.c_poder.casos.push({ atrasoMin: d, b: reg.b[0], z: reg.z, deslocamentoMaxDaCurva_aPartirDe2pct_pp: maxDif(c, cTot, 3).pp });
  }
  console.log('  [c] poder:', JSON.stringify(resumo.c_poder.casos));
}

// ---------- e) arquivos para o gráfico ----------
{
  const M0 = 17 * 60, M1 = 27 * 60; // 17:00 do dia até 03:00 do dia seguinte
  const cont = (arr, filtro = () => true, peso = null) => { const f = new Float64Array(M1 - M0 + 1); for (let i = 0; i < N; i++) { if (Number.isNaN(arr[i]) || !filtro(i)) continue; const m = Math.floor(arr[i] / 60) - M0; if (m >= 0 && m <= M1 - M0) f[m] += peso ? peso[i] : 1; else if (m < 0) f[0] += peso ? peso[i] : 1; } return f; };
  const fE = cont(fim), fR = cont(rec), fT = cont(tot), fR1 = cont(rec1), fT1 = cont(tot1);
  const fRc = cont(rec, () => true, comp), fTc = cont(tot, () => true, comp);
  const a13 = (arr) => cont(arr, temVoto, v13), a22 = (arr) => cont(arr, temVoto, v22);
  const s13 = { tot: a13(tot), rec: a13(rec), fim: cont(fim, (i) => temVoto(i), v13) }, s22 = { tot: a22(tot), rec: a22(rec), fim: cont(fim, (i) => temVoto(i), v22) };
  const acc = { e: 0, r: 0, t: 0, r1: 0, t1: 0, rc: 0, tc: 0, tot13: 0, tot22: 0, rec13: 0, rec22: 0, fim13: 0, fim22: 0 };
  const lin = ['minuto,hora,emitidas_acum,emitidas_pct,recebidas_no_minuto,recebidas_acum,recebidas_pct,recebidas_votantes_pct,totalizadas_no_minuto,totalizadas_acum,totalizadas_pct,totalizadas_votantes_pct,'
    + 'p22_ordem_totalizacao,p13_ordem_totalizacao,p22_ordem_recebimento,p13_ordem_recebimento,p22_ordem_fim,p13_ordem_fim,t1_recebidas_no_minuto,t1_recebidas_acum,t1_recebidas_pct,t1_totalizadas_acum,t1_totalizadas_pct'];
  const pc = (x, d) => (d ? (100 * x / d).toFixed(4) : '');
  const parc = (a, b) => (a + b > 0 ? (a / (a + b)).toFixed(6) : '');
  for (let m = 0; m <= M1 - M0; m++) {
    acc.e += fE[m]; acc.r += fR[m]; acc.t += fT[m]; acc.r1 += fR1[m]; acc.t1 += fT1[m]; acc.rc += fRc[m]; acc.tc += fTc[m];
    acc.tot13 += s13.tot[m]; acc.tot22 += s22.tot[m]; acc.rec13 += s13.rec[m]; acc.rec22 += s22.rec[m]; acc.fim13 += s13.fim[m]; acc.fim22 += s22.fim[m];
    const mm = M0 + m;
    lin.push([mm - M0, `${String(Math.floor(mm / 60) % 24).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}${mm >= 24 * 60 ? '+1d' : ''}`,
      acc.e, pc(acc.e, nFim), fR[m], acc.r, pc(acc.r, N), pc(acc.rc, totComp), fT[m], acc.t, pc(acc.t, N), pc(acc.tc, totComp),
      parc(acc.tot22, acc.tot13), parc(acc.tot13, acc.tot22), parc(acc.rec22, acc.rec13), parc(acc.rec13, acc.rec22), parc(acc.fim22, acc.fim13), parc(acc.fim13, acc.fim22),
      fR1[m], acc.r1, pc(acc.r1, N), acc.t1, pc(acc.t1, N)].join(','));
    // curva pública por minuto (todas as seções, com exterior): pico do 22 e trocas de liderança depois das 19h
    const p = acc.tot13 + acc.tot22 > 0 ? acc.tot22 / (acc.tot13 + acc.tot22) : NaN;
    if (mm >= 19 * 60) {
      const hh = lin.at(-1).split(',')[1];
      resumo.e_curvaPorMinuto ??= { p22_as_1902: null, max: { p22: 0 }, trocasDeLideranca: [] };
      if (mm === 19 * 60 + 2) resumo.e_curvaPorMinuto.p22_as_1902 = r4(100 * p);
      if (p > resumo.e_curvaPorMinuto.max.p22) resumo.e_curvaPorMinuto.max = { p22: p, hora: hh, totalizadasPct: r2((100 * acc.t) / N) };
      if (acc.prevP !== undefined && (acc.prevP < 0.5) !== (p < 0.5)) resumo.e_curvaPorMinuto.trocasDeLideranca.push({ hora: hh, totalizadasPct: r2((100 * acc.t) / N), p22: r4(100 * p), lider: p >= 0.5 ? 22 : 13 });
    }
    acc.prevP = p;
  }
  resumo.e_curvaPorMinuto.max.p22 = r4(100 * resumo.e_curvaPorMinuto.max.p22);
  await writeFile(path.join(DIR, 'por-minuto.csv'), `${lin.join('\n')}\n`);
  const hora = (ordem, k) => hhmm(({ tot, rec, fim })[ordem][({ tot: ordTot, rec: ordRec, fim: ordFim })[ordem][Math.min(ordTot.length - 1, Math.round(((k + 1) * ordTot.length) / PASSOS) - 1)]]);
  const lp = ['pct_apurado,hora_ordem_totalizacao,hora_ordem_recebimento,hora_ordem_fim,p22_ordem_totalizacao,p22_ordem_recebimento,p22_ordem_fim,p22_totalizacao_com_exterior,p22_ordem_aleatoria,'
    + GRUPOS.map(([n]) => `env_${n}_p2_5,env_${n}_media,env_${n}_p97_5`).join(',') + ',t1_p22_ordem_totalizacao,t1_env_municipio_p2_5,t1_env_municipio_p97_5'];
  for (let k = 0; k < PASSOS; k++) {
    lp.push([((k + 1) * 100) / PASSOS, hora('tot', k), hora('rec', k), hora('fim', k), cTot[k].toFixed(6), cRec[k].toFixed(6), cFim[k].toFixed(6), cTotTudo[k].toFixed(6), env.aleatoria[k].toFixed(6),
      ...GRUPOS.flatMap(([n]) => [env[n].lo[k].toFixed(6), env[n].media[k].toFixed(6), env[n].hi[k].toFixed(6)]),
      t1.cReal[k].toFixed(6), t1.envs.municipio.lo[k].toFixed(6), t1.envs.municipio.hi[k].toFixed(6)].join(','));
  }
  await writeFile(path.join(DIR, 'por-percentual.csv'), `${lp.join('\n')}\n`);
  const lu = ['uf,minuto,hora,secoes_uf,recebidas_acum,recebidas_pct,totalizadas_acum,t1_recebidas_acum,t1_recebidas_pct,p22_uf_ordem_totalizacao'];
  for (const u of ufs) {
    const f = (i) => uf[i] === u;
    const n = uf.filter((x) => x === u).length;
    const r = cont(rec, f), t = cont(tot, f), r1 = cont(rec1, f), t13 = cont(tot, (i) => f(i) && temVoto(i), v13), t22 = cont(tot, (i) => f(i) && temVoto(i), v22);
    let ar = 0, at = 0, ar1 = 0, a13u = 0, a22u = 0;
    for (let m = 0; m <= M1 - M0; m++) {
      ar += r[m]; at += t[m]; ar1 += r1[m]; a13u += t13[m]; a22u += t22[m];
      const mm = M0 + m;
      lu.push([u, m, `${String(Math.floor(mm / 60) % 24).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}${mm >= 24 * 60 ? '+1d' : ''}`, n, ar, pc(ar, n), at, ar1, pc(ar1, n), parc(a22u, a13u)].join(','));
    }
  }
  await writeFile(path.join(DIR, 'por-uf-minuto.csv'), `${lu.join('\n')}\n`);
}
resumo.segundos = Math.round((Date.now() - inicio) / 1000);
await writeFile(path.join(DIR, 'resumo.json'), JSON.stringify(resumo, null, 1));
console.log(`\n[ok] ${resumo.segundos} s → ${DIR}`);
console.log(JSON.stringify({ a: resumo.a_recebidasAntes19h, fluxo: resumo.a_fluxoRecebimento, d: resumo.d_curvas, aleat: resumo.d_ordemAleatoria }, null, 1));
