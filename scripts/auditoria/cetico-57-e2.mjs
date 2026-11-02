// Parecer cético 57: E2 (doc 06) refeito com código próprio, B1 (local de votação), testes benignos do PR e poder em padrões
// "finos" (1 a 9 votos por seção) que a tabela do doc 30 não cobre. Não importa estatistico-lib nem os scripts do autor.
// Uso: node --max-old-space-size=8192 scripts/auditoria/cetico-57-e2.mjs [réplicas=30]
// Saída: data/parsed/auditoria/cetico/57/e2.json
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { gerador, ids, lerPares2026, mqfe, Phi, r2, r4, zCorte } from './cetico-57-lib.mjs';

const R = Number(process.argv[2] ?? 30);
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', '57');
await mkdir(SAIDA, { recursive: true });
const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const { L, lidos } = await lerPares2026();
const n = L.length;
log(`${lidos} pares lidos; ${n} no E2`);
const w = Float64Array.from(L, (s) => s.c1);
const y = Float64Array.from(L, (s) => (s.v13_2 - s.v13_1) / s.c1);
const xPb = Float64Array.from(L, (s) => (s.pb2 - s.pb1) / s.c1);
const xSem = Float64Array.from(L, (s) => (s.sb2 - s.sb1 + s.pg2 - s.pg1) / s.c1);
const xSb = Float64Array.from(L, (s) => (s.sb2 - s.sb1) / s.c1);
const xPg = Float64Array.from(L, (s) => (s.pg2 - s.pg1) / s.c1);
const xOut = Float64Array.from(L, (s) => s.out1 / s.c1);
const xBn = Float64Array.from(L, (s) => s.bn1 / s.c1);
const gMun = ids(L, (s) => s.mun), gLoc = ids(L, (s) => s.loc), cl = ids(L, (s) => s.clu);
const X = [xPb, xSem, xOut, xBn];
const todos = Int32Array.from({ length: n }, (_, i) => i);
const ufs = [...new Set(L.map((s) => s.uf))].sort();
const idxUf = Object.fromEntries(ufs.map((u) => [u, todos.filter((i) => L[i].uf === u)]));
const fmt = (a) => ({ d: r4(a.d), ep: r4(a.ep), t: r2(a.t), n: a.n, G: a.G });
const out = { geradoEm: new Date().toISOString(), secoes: n };

// A. base
out.base = { brasil: fmt(mqfe(todos, y, X, w, gMun, cl)), sp: fmt(mqfe(idxUf.sp, y, X, w, gMun, cl)), pr: fmt(mqfe(idxUf.pr, y, X, w, gMun, cl)), mg: fmt(mqfe(idxUf.mg, y, X, w, gMun, cl)) };
log(`base ${JSON.stringify(out.base)}`);

// B. B1: efeito fixo do local; e o de município na MESMA amostra (sem as seções sozinhas no local)
{
  const nLoc = new Map(); for (const i of todos) nLoc.set(gLoc[i], (nLoc.get(gLoc[i]) ?? 0) + 1);
  const multi = (idx) => idx.filter((i) => nLoc.get(gLoc[i]) > 1);
  out.B1 = {};
  for (const u of ['brasil', 'sp', 'pr']) {
    const idx = u === 'brasil' ? todos : idxUf[u];
    const m = multi(idx);
    out.B1[u] = { local: fmt(mqfe(m, y, X, w, gLoc, cl)), municipioMesmaAmostra: fmt(mqfe(m, y, X, w, gMun, cl)), sozinhasNoLocal: idx.length - m.length,
      // o mesmo modelo na parte que sai: só seções sozinhas no local (efeito de município)
      soSozinhas: (() => { try { return fmt(mqfe(idx.filter((i) => nLoc.get(gLoc[i]) === 1), y, X, w, gMun, cl)); } catch { return null; } })() };
    log(`B1 ${u}: ${JSON.stringify(out.B1[u])}`);
  }
}

// C. PR: leituras benignas testáveis
{
  const pr = idxUf.pr; const C = {};
  // C1 canivete por município
  const muns = [...new Set([...pr].map((i) => gMun[i]))];
  const jk = muns.map((m) => { const a = mqfe(pr.filter((i) => gMun[i] !== m), y, X, w, gMun, cl); return { mun: L[pr.find((i) => gMun[i] === m)].mun, d: a.d, t: a.t }; }).sort((a, b) => a.t - b.t);
  C.canivete = { municipios: muns.length, menorT: { ...jk[0], d: r4(jk[0].d), t: r2(jk[0].t) }, maiorT: { ...jk.at(-1), d: r4(jk.at(-1).d), t: r2(jk.at(-1).t) },
    cincoQueMaisBaixam: jk.slice(0, 5).map((x) => ({ mun: x.mun, t: r2(x.t) })) };
  // sem os 5 que mais baixam juntos
  const cinco = new Set(jk.slice(0, 5).map((x) => x.mun));
  C.semOsCinco = fmt(mqfe(pr.filter((i) => !cinco.has(L[i].mun)), y, X, w, gMun, cl));
  // C2 municípios com eleição extra no 2º turno (consulta e prefeito suplementar)
  const { db } = await abrirLeitura();
  const extras = db.prepare(`SELECT DISTINCT uf, municipio, eleicao, cargo FROM voto_bu WHERE turno = 2 AND uf = 'pr' AND eleicao NOT IN (6258)`).all().map((r) => ({ ...r }));
  db.close();
  const mExtra = new Set(extras.map((r) => `pr|${r.municipio}`));
  C.eleicoesExtras = { lista: extras, secoesNoE2: [...pr].filter((i) => mExtra.has(L[i].mun)).length, semElas: fmt(mqfe(pr.filter((i) => !mExtra.has(L[i].mun)), y, X, w, gMun, cl)) };
  // C3 sem troca de urna entre os turnos
  C.mesmaUrna = fmt(mqfe(pr.filter((i) => L[i].urna1 === L[i].urna2), y, X, w, gMun, cl));
  C.trocaramUrna = pr.filter((i) => L[i].urna1 !== L[i].urna2).length;
  // C4 sem as seções com variação extrema da via sem biometria (1% de |Δsb|/c1 mais altos do PR)
  const ord = [...pr].map((i) => Math.abs(xSb[i])).sort((a, b) => a - b); const p99 = ord[Math.floor(0.99 * (ord.length - 1))];
  C.semDeltaSbExtremo = { corte: r4(p99), saem: pr.filter((i) => Math.abs(xSb[i]) > p99).length, e2: fmt(mqfe(pr.filter((i) => Math.abs(xSb[i]) <= p99), y, X, w, gMun, cl)) };
  // C5 vias separadas (B2) no PR
  const b2 = mqfe(pr, y, [xPb, xSb, xPg, xOut, xBn], w, gMun, cl);
  const dif = (i) => { const d = b2.b[i] - b2.b[0], ep = Math.sqrt(b2.V[i][i] + b2.V[0][0] - 2 * b2.V[i][0]); return { d: r4(d), t: r2(d / ep) }; };
  C.B2 = { sb: dif(1), pg: dif(2), somaDeltaSb: [...pr].reduce((a, i) => a + L[i].sb2 - L[i].sb1, 0), somaDeltaPg: [...pr].reduce((a, i) => a + L[i].pg2 - L[i].pg1, 0),
    somaAbsDeltaSb: [...pr].reduce((a, i) => a + Math.abs(L[i].sb2 - L[i].sb1), 0) };
  // C6 o mesmo teste com o 22 (espelho) e com brancos+nulos? (só 22: o painel tem v22)
  const y22 = Float64Array.from(L, (s) => (s.v22_2 - s.v22_1) / s.c1);
  C.espelho22 = fmt(mqfe(pr, y22, X, w, gMun, cl));
  out.PR = C;
  log(`PR ${JSON.stringify(C)}`);
}

// D. poder em padrões finos (via manual), critério D2 do autor e versão com ruído
{
  const CRIT = zCorte(0.05 / 56);
  const base = { brasil: mqfe(todos, y, X, w, gMun, cl) }; for (const u of ufs) base[u] = mqfe(idxUf[u], y, X, w, gMun, cl);
  const cap = Int32Array.from(L, (s) => Math.max(0, s.a2 - s.c2));
  const rnd = gerador(57057);
  const sortear = (m) => { const sel = new Set(); while (sel.size < m) sel.add(Math.floor(rnd() * n)); return [...sel]; };
  const rodar = (sel, kPor) => {
    const feitos = []; let tot = 0;
    for (const i of sel) { const k = Math.min(kPor, cap[i]); if (k <= 0) continue; const d = k / L[i].c1; y[i] += d; xSem[i] += d; feitos.push([i, d]); tot += k; }
    const zs = []; const a = mqfe(todos, y, X, w, gMun, cl); zs.push(['brasil', (a.d - base.brasil.d) / a.ep, a.t]);
    for (const u of ufs) { const b = mqfe(idxUf[u], y, X, w, gMun, cl); zs.push([u, (b.d - base[u].d) / b.ep, b.t]); }
    for (const [i, d] of feitos) { y[i] -= d; xSem[i] -= d; }
    const max = zs.reduce((m, z) => (z[1] > m[1] ? z : m));
    const pNenhum = zs.reduce((p, z) => p * (1 - Phi(z[1] - CRIT)), 1);
    return { tot, d2: max[1] >= CRIT, maxZ: max[1], maxUf: max[0], tBrasil: a.t, zBrasil: zs[0][1], poderComRuido: 1 - pNenhum };
  };
  const padroes = [
    { id: 'P1 (1%, k = ⌈V/n⌉), V = 25 mil', m: Math.round(0.01 * n), k: Math.ceil(25000 / Math.round(0.01 * n)), reps: R },
    { id: 'P1 (1%, k = ⌈V/n⌉), V = 50 mil', m: Math.round(0.01 * n), k: Math.ceil(50000 / Math.round(0.01 * n)), reps: R },
    { id: 'fino: k = 1 em 50% das seções', m: Math.round(0.5 * n), k: 1, reps: R },
    { id: 'fino: k = 2 em 50% das seções', m: Math.round(0.5 * n), k: 2, reps: R },
    { id: 'fino: k = 3 em 50% das seções', m: Math.round(0.5 * n), k: 3, reps: R },
    { id: 'fino: k = 1 em todas', m: n, k: 1, reps: 1 },
    { id: 'fino: k = 3 em todas', m: n, k: 3, reps: 1 },
    { id: 'fino: k = 9 em todas (≈ margem)', m: n, k: 9, reps: 1 },
  ];
  out.poder = { limiar: r2(CRIT), linhas: [] };
  for (const p of padroes) {
    const rr = []; for (let r = 0; r < p.reps; r++) rr.push(rodar(p.m === n ? [...todos] : sortear(p.m), p.k));
    const med = (f) => { const v = rr.map(f).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
    const lin = { id: p.id, kPorSecao: p.k, secoes: p.m, replicas: p.reps, votosMediana: med((x) => x.tot), D2: rr.filter((x) => x.d2).length,
      maxZMediana: r2(med((x) => x.maxZ)), maxZMin: r2(Math.min(...rr.map((x) => x.maxZ))), zBrasilMediana: r2(med((x) => x.zBrasil)), tBrasilMediana: r2(med((x) => x.tBrasil)),
      poderComRuidoMedio: r4(rr.reduce((a, x) => a + x.poderComRuido, 0) / rr.length), ufsMax: [...new Set(rr.map((x) => x.maxUf))].slice(0, 8) };
    out.poder.linhas.push(lin);
    log(`poder ${JSON.stringify(lin)}`);
    await writeFile(path.join(SAIDA, 'e2.json'), JSON.stringify(out, null, 1));
  }
}
await writeFile(path.join(SAIDA, 'e2.json'), JSON.stringify(out, null, 1));
log('fim');
