// Estatístico eleitoral, doc 30 (plano 29, commit 45dc471), H05(a): que tamanho de inserção pela brecha o teste do eleitor a
// mais (E2 do doc 06) enxerga? Inserção simulada nas seções reais: +k votos do 13, +k comparecimento e +k na via (pg: liberação
// manual depois de 4 capturas; sb: sem biometria no arquivo), nunca acima dos ausentes (e, na via sb, de S − sb).
// Critérios (plano 29, seção 3): D1 teste como está (t ≥ 3,32 no Brasil ou numa UF); D2 linha de base descontada
// ((d_ins − d_0) / EP_ins ≥ 3,32 no Brasil ou numa UF, cada uma contra a própria base); D3 robusto ao modelo (em cada uma das
// 9 especificações do parecer 27, (d_ins,j − max_i d_0,i) / EP_ins,j ≥ 3,32 no Brasil).
// Tamanho mínimo = menor V da grade com detecção em ≥ 16 de 20 réplicas. Sorteio mulberry32, semente 20261102, seções em
// ordem de chave. Regressão de efeito fixo própria (arrays tipados; mesmo estimador de mqEfeitoFixo, conferido na base).
// Uso: node --max-old-space-size=8192 scripts/auditoria/estatistico-h02-h05-final-poder.mjs [réplicas=20]
// Saída: data/parsed/auditoria/estatistico-eleitoral/h02-h05-final/poder.json
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { aleatorio, quantil } from './forense-lib.mjs';
import { carregarIdade, diferenca, filtrar, lerPares, mqEfeitoFixo, prepararBiometria, zBilateral } from './estatistico-lib.mjs';

const R = Number(process.argv[2] ?? 20);
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico-eleitoral', 'h02-h05-final');
const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const r4 = (x) => (Number.isFinite(x) ? Math.round(x * 10000) / 10000 : null);
const r2 = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : null);
const MARGEM = 4430191;
const GRADE = [10000, 25000, 50000, 100000, 250000, 500000, 1000000, 2000000, MARGEM];

// ---------- universo (o do doc 06) ----------
const todos = await lerPares('banco');
const { P } = filtrar(todos);
prepararBiometria(todos);
const E = P.filter((s) => s.temBio && s.c1 >= 20).sort((a, b) => (`${a.uf}|${a.municipio}|${a.zona}|${a.secao}` < `${b.uf}|${b.municipio}|${b.zona}|${b.secao}` ? -1 : 1));
await carregarIdade(E);
for (const s of E) { const f = s.v13_1 + s.v22_1; s.s1 = f > 0 ? s.v13_1 / f : null; }
const n = E.length;
const ufs = [...new Set(E.map((s) => s.uf))].sort();
const CRIT = zBilateral(0.05 / (2 * ufs.length + 2));
log(`${n} seções, ${ufs.length} UFs, limiar ${CRIT.toFixed(3)}`);

// ---------- arrays ----------
const idMap = (f) => { const m = new Map(); const a = new Int32Array(n); E.forEach((s, i) => { const k = f(s); if (!m.has(k)) m.set(k, m.size); a[i] = m.get(k); }); return { a, n: m.size }; };
const G = idMap((s) => s.mun), C = idMap((s) => (s.uf === 'df' ? s.zon : s.mun));
const w = Float64Array.from(E, (s) => s.c1);
const y = Float64Array.from(E, (s) => (s.v13_2 - s.v13_1) / s.c1);
const xPb = Float64Array.from(E, (s) => s.dpb / s.c1);
const xSem = Float64Array.from(E, (s) => (s.dsb + s.dpg) / s.c1);
const xOut = Float64Array.from(E, (s) => s.out1 / s.c1);
const xBn = Float64Array.from(E, (s) => s.bn1 / s.c1);
const temPerfil = E.map((s) => s.p60 != null && s.pEscB != null && s.pBioCad != null && s.p1624 != null && s.s1 != null);
const COV = { p60: (s) => s.p60, escolaridadeBaixa: (s) => s.pEscB, biometriaCadastrada: (s) => s.pBioCad, p1624: (s) => s.p1624, parcela13_1t: (s) => s.s1, semBio1t: (s) => (s.sb1 + s.pg1) / s.c1 };
const covArr = Object.fromEntries(Object.entries(COV).map(([k, f]) => [k, Float64Array.from(E, (s, i) => (temPerfil[i] ? f(s) : 0))]));
const ESPEC = {
  nenhuma: [], p60: ['p60'], escolaridadeBaixa: ['escolaridadeBaixa'], biometriaCadastrada: ['biometriaCadastrada'], p1624: ['p1624'],
  parcela13_1t: ['parcela13_1t'], semBio1t: ['semBio1t'],
  quatroPerfil: ['p60', 'escolaridadeBaixa', 'biometriaCadastrada', 'p1624'],
  quatroPerfilMaisParcela13: ['p60', 'escolaridadeBaixa', 'biometriaCadastrada', 'p1624', 'parcela13_1t'],
};
const todosIdx = Int32Array.from({ length: n }, (_, i) => i);
const idxPerfil = Int32Array.from(todosIdx.filter((i) => temPerfil[i]));
const idxUf = Object.fromEntries(ufs.map((uf) => [uf, Int32Array.from(todosIdx.filter((i) => E[i].uf === uf))]));

// ---------- regressão de efeito fixo (peso w, EP agrupado; igual a mqEfeitoFixo) ----------
const gW = new Float64Array(G.n), gY = new Float64Array(G.n), gN = new Int32Array(G.n);
const gX = Array.from({ length: 12 }, () => new Float64Array(G.n));
const cS = new Float64Array(C.n * 12);
function inverter(M) {
  const k = M.length; const A = M.map((r, i) => [...r, ...Array.from({ length: k }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < k; c++) {
    let p = c; for (let r = c + 1; r < k; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-14) throw new Error('singular'); [A[c], A[p]] = [A[p], A[c]];
    const d = A[c][c]; for (let j = 0; j < 2 * k; j++) A[c][j] /= d;
    for (let r = 0; r < k; r++) if (r !== c) { const f = A[r][c]; if (f) for (let j = 0; j < 2 * k; j++) A[r][j] -= f * A[c][j]; }
  }
  return A.map((r) => r.slice(k));
}
function ajustar(idx, cols) {
  const K = cols.length; const ga = G.a, ca = C.a;
  for (const i of idx) { const g = ga[i]; gW[g] += w[i]; gY[g] += w[i] * y[i]; gN[g]++; for (let j = 0; j < K; j++) gX[j][g] += w[i] * cols[j][i]; }
  const XtX = Array.from({ length: K }, () => new Array(K).fill(0)); const Xty = new Array(K).fill(0);
  const xd = new Float64Array(K); let nn = 0;
  for (const i of idx) {
    const g = ga[i]; if (gN[g] < 2) continue; nn++;
    const yd = y[i] - gY[g] / gW[g];
    for (let j = 0; j < K; j++) xd[j] = cols[j][i] - gX[j][g] / gW[g];
    for (let a = 0; a < K; a++) { Xty[a] += w[i] * xd[a] * yd; for (let b = a; b < K; b++) XtX[a][b] += w[i] * xd[a] * xd[b]; }
  }
  for (let a = 0; a < K; a++) for (let b = 0; b < a; b++) XtX[a][b] = XtX[b][a];
  const inv = inverter(XtX);
  const beta = inv.map((r) => r.reduce((acc, v, j) => acc + v * Xty[j], 0));
  const usados = new Set();
  for (const i of idx) {
    const g = ga[i]; if (gN[g] < 2) continue;
    let e = y[i] - gY[g] / gW[g];
    for (let j = 0; j < K; j++) { xd[j] = cols[j][i] - gX[j][g] / gW[g]; e -= xd[j] * beta[j]; }
    const c = ca[i]; usados.add(c); const o = c * 12;
    for (let a = 0; a < K; a++) cS[o + a] += w[i] * xd[a] * e;
  }
  const meat = Array.from({ length: K }, () => new Array(K).fill(0));
  for (const c of usados) { const o = c * 12; for (let a = 0; a < K; a++) for (let b = 0; b < K; b++) meat[a][b] += cS[o + a] * cS[o + b]; for (let a = 0; a < K; a++) cS[o + a] = 0; }
  const Gc = usados.size; const fator = (Gc / (Gc - 1)) * ((nn - 1) / (nn - K));
  const V = inv.map((r) => inv.map((_, c2) => fator * r.reduce((acc, v, j) => acc + v * meat[j].reduce((s2, m, l2) => s2 + m * inv[l2][c2], 0), 0)));
  for (const i of idx) { const g = ga[i]; gW[g] = 0; gY[g] = 0; gN[g] = 0; for (let j = 0; j < K; j++) gX[j][g] = 0; }
  const d = beta[1] - beta[0]; const ep = Math.sqrt(V[1][1] + V[0][0] - 2 * V[0][1]);
  return { d, ep, t: d / ep, n: nn, G: Gc };
}
const BASE_COLS = [xPb, xSem, xOut, xBn];
const colsDe = (esp) => [...BASE_COLS, ...ESPEC[esp].map((c) => covArr[c])];

// ---------- linha de base e conferência ----------
const res = { geradoEm: new Date().toISOString(), plano: '29 (45dc471; adendo 1989f56)', replicas: R, semente: 20261102, secoes: n, secoesComPerfil: idxPerfil.length, limiar: r4(CRIT), grade: GRADE };
const base = { brasil: ajustar(todosIdx, BASE_COLS), uf: {}, espec: {} };
for (const uf of ufs) base.uf[uf] = ajustar(idxUf[uf], BASE_COLS);
for (const esp of Object.keys(ESPEC)) base.espec[esp] = ajustar(idxPerfil, colsDe(esp));
const maxD0 = Math.max(...Object.values(base.espec).map((b) => b.d));
{ // conferência contra o estimador da biblioteca (mqEfeitoFixo) no Brasil
  const clu = (s) => (s.uf === 'df' ? s.zon : s.mun);
  const a = mqEfeitoFixo(E, { y: (s) => (s.v13_2 - s.v13_1) / s.c1, x: (s) => [s.dpb / s.c1, (s.dsb + s.dpg) / s.c1, s.out1 / s.c1, s.bn1 / s.c1], w: (s) => s.c1, grupo: (s) => s.mun, cluster: clu });
  const dd = diferenca(a, 1, 0);
  res.conferencia = { biblioteca: { d: r4(dd.d), ep: r4(dd.ep), t: r2(dd.t) }, propria: { d: r4(base.brasil.d), ep: r4(base.brasil.ep), t: r2(base.brasil.t) },
    sp: r2(base.uf.sp.t), pr: r2(base.uf.pr.t), especificacoes: Object.fromEntries(Object.entries(base.espec).map(([k, b]) => [k, { d: r4(b.d), t: r2(b.t) }])), maxD0: r4(maxD0),
    esperado: { brasil: '−0,0039, t −2,60', sp: '−5,59', pr: '2,74', especificacoes_t: 'nenhuma −2,60; p60 +5,93; escolaridade −3,81; biometria −3,20; 16–24 −0,03; parcela13 −2,39; semBio1t −2,22; quatro +5,06; quatro+parcela +5,09' } };
  log(`base: Brasil d ${base.brasil.d.toFixed(4)} t ${base.brasil.t.toFixed(2)} (biblioteca t ${dd.t.toFixed(2)}); SP t ${base.uf.sp.t.toFixed(2)}; PR t ${base.uf.pr.t.toFixed(2)}`);
  log(`especificações: ${Object.entries(base.espec).map(([k, b]) => `${k} ${b.t.toFixed(2)}`).join('; ')}`);
}

// ---------- inserção ----------
const rnd = aleatorio(20261102);
const S = Float64Array.from(E, (s) => (s.eleit > 0 ? Math.max(0, s.eleit - s.bioCad) : 0));
const capDe = (i, via) => { const s = E[i]; const aus = Math.max(0, s.a2 - s.c2); return via === 'sb' ? Math.min(aus, Math.max(0, S[i] - s.sb2)) : aus; };
function inserir(sel, V, via, proporcional) {
  let somaPeso = 0; for (const i of sel) somaPeso += proporcional ? E[i].c1 : 1;
  const feitos = []; let tot = 0;
  for (const i of sel) {
    const alvo = proporcional ? Math.round((V * E[i].c1) / somaPeso) : Math.ceil(V / sel.length);
    const k = Math.min(alvo, capDe(i, via)); if (k <= 0) continue;
    const dlt = k / E[i].c1; y[i] += dlt; xSem[i] += dlt; feitos.push([i, dlt]); tot += k;
  }
  return { tot, desfazer: () => { for (const [i, dlt] of feitos) { y[i] -= dlt; xSem[i] -= dlt; } } };
}
const sortear = (lista, m) => { const sel = new Set(); m = Math.min(m, lista.length); while (sel.size < m) sel.add(lista[Math.floor(rnd() * lista.length)]); return [...sel]; };
const corte80 = Object.fromEntries(ufs.map((uf) => [uf, quantil(E.filter((s) => s.uf === uf && s.s1 != null).map((s) => s.s1), 0.8)]));
const redutos = [...todosIdx].filter((i) => E[i].s1 != null && E[i].s1 >= corte80[E[i].uf]);
const unidadesAte = (chaveF, fracao) => {
  const por = new Map(); for (let i = 0; i < n; i++) { const k = chaveF(E[i]); if (!por.has(k)) por.set(k, []); por.get(k).push(i); }
  const ks = [...por.keys()]; for (let i = ks.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ks[i], ks[j]] = [ks[j], ks[i]]; }
  const alvo = Math.round(n * fracao); const out = []; for (const k of ks) { if (out.length >= alvo) break; out.push(...por.get(k)); } return out;
};
const PADROES = [
  { id: 'P1', nome: '1% das seções, aleatórias', sel: () => sortear(todosIdx, Math.round(n * 0.01)), prop: false, vias: ['pg', 'sb'] },
  { id: 'P2', nome: '5% das seções, aleatórias', sel: () => sortear(todosIdx, Math.round(n * 0.05)), prop: false, vias: ['pg', 'sb'] },
  { id: 'P3', nome: '20% das seções, aleatórias', sel: () => sortear(todosIdx, Math.round(n * 0.2)), prop: false, vias: ['pg'] },
  { id: 'P4', nome: 'redutos do 13 (quintil de cima na UF), 5% das seções', sel: () => sortear(redutos, Math.round(n * 0.05)), prop: false, vias: ['pg'] },
  { id: 'P5', nome: 'municípios inteiros até 20% das seções, proporcional a c1', sel: () => unidadesAte((s) => s.mun, 0.2), prop: true, vias: ['pg'] },
  { id: 'P6', nome: 'zonas inteiras até 20% das seções, proporcional a c1', sel: () => unidadesAte((s) => s.zon, 0.2), prop: true, vias: ['pg'] },
  { id: 'P7', nome: 'todas as seções do país, proporcional a c1', sel: () => [...todosIdx], prop: true, vias: ['pg'], det: true },
  ...['sp', 'mg', 'ba', 'pr'].map((uf) => ({ id: `P8-${uf}`, nome: `${uf.toUpperCase()} inteira, proporcional a c1`, sel: () => [...idxUf[uf]], prop: true, vias: ['pg'], det: true })),
];

function replica(p, V, via, comD3) {
  const { tot, desfazer } = inserir(p.sel(), V, via, p.prop);
  const br = ajustar(todosIdx, BASE_COLS);
  let d1 = br.t >= CRIT, d2 = (br.d - base.brasil.d) / br.ep >= CRIT; let ufD1 = null, ufD2 = null;
  const zBr = (br.d - base.brasil.d) / br.ep;
  for (const uf of ufs) {
    const a = ajustar(idxUf[uf], BASE_COLS);
    if (a.t >= CRIT && !ufD1) ufD1 = uf;
    if ((a.d - base.uf[uf].d) / a.ep >= CRIT && !ufD2) ufD2 = uf;
  }
  d1 = d1 || ufD1 != null; d2 = d2 || ufD2 != null;
  let d3 = null, d3min = null;
  if (comD3) {
    d3min = Infinity;
    for (const esp of Object.keys(ESPEC)) { const a = ajustar(idxPerfil, colsDe(esp)); d3min = Math.min(d3min, (a.d - maxD0) / a.ep); }
    d3 = d3min >= CRIT;
  }
  desfazer();
  return { votos: tot, tBrasil: r2(br.t), zDeltaBrasil: r2(zBr), d1, d2, d3, d3min: r2(d3min), ufD1, ufD2 };
}

res.padroes = [];
for (const p of PADROES) {
  for (const via of p.vias) {
    const linha = { id: p.id, nome: p.nome, via, deterministico: !!p.det, celulas: [], minimo: { D1: null, D2: null, D3: null } };
    const reps = p.det ? 1 : R;
    let parouD2 = false, parouD3 = false;
    for (const V of GRADE) {
      const rr = []; for (let r = 0; r < reps; r++) rr.push(replica(p, V, via, true));
      const conta = (f) => rr.filter(f).length;
      const cel = { V, votosMediana: Math.round(quantil(rr.map((x) => x.votos).sort((a, b) => a - b), 0.5)), replicas: reps,
        D1: conta((x) => x.d1), D2: conta((x) => x.d2), D3: conta((x) => x.d3),
        tBrasilMediana: r2(quantil(rr.map((x) => x.tBrasil).sort((a, b) => a - b), 0.5)), zDeltaBrasilMediana: r2(quantil(rr.map((x) => x.zDeltaBrasil).sort((a, b) => a - b), 0.5)),
        d3minMediana: r2(quantil(rr.map((x) => x.d3min).sort((a, b) => a - b), 0.5)),
        ufsD2: [...new Set(rr.map((x) => x.ufD2).filter(Boolean))], ufsD1: [...new Set(rr.map((x) => x.ufD1).filter(Boolean))] };
      linha.celulas.push(cel);
      const ok = (k) => k >= Math.ceil(0.8 * reps);
      for (const D of ['D1', 'D2', 'D3']) if (!linha.minimo[D] && ok(cel[D])) linha.minimo[D] = { V, votos: cel.votosMediana };
      log(`${p.id} ${via} V=${V}: votos ${cel.votosMediana} D1 ${cel.D1}/${reps} D2 ${cel.D2}/${reps} D3 ${cel.D3}/${reps} (t ${cel.tBrasilMediana}, zΔ ${cel.zDeltaBrasilMediana}, D3min ${cel.d3minMediana})`);
      parouD2 = parouD2 || ok(cel.D2); parouD3 = parouD3 || ok(cel.D3);
      // regra de parada do plano (D2) estendida até o D3 também passar (desvio declarado: só mais cálculo)
      if (parouD2 && parouD3) break;
    }
    res.padroes.push(linha);
    await mkdir(SAIDA, { recursive: true });
    await writeFile(path.join(SAIDA, 'poder.json'), JSON.stringify(res, null, 1));
  }
}
log('fim');
