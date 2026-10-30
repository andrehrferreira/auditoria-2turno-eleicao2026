// H15 e H17: testes pré-registrados em docs/analysis/estatistico-eleitoral/09-h15-h17-mesa.md sobre a varredura de
// estatistico-h15-h17-varrer.mjs (todas as seções, dia do 2º e do 1º turno do mesmo log).
// Uso: node --max-old-space-size=8192 scripts/auditoria/estatistico-h15-h17-analise.mjs
// Saída: data/parsed/auditoria/h15-h17/resumo.json, casos-h15.json, casos-h17.json, poder.csv, horas.csv, ja-votou.csv
import { createReadStream } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { caudaPoisson, demeanar, mqo } from './biometria-comum.mjs';
import { ALFA_B, DIR_H, hashPreRegistro } from './estatistico-h15-h17-varrer.mjs';
import { betaBinomialCauda, binomialCauda, sobredispersao } from './forense-lib.mjs';

const DIR_V = path.join(DIR_H, 'varredura');
const nome = (x) => `${x.uf.toUpperCase()} ${x.mun}/${x.zona}/${x.secao}`;
const r4 = (v) => (v == null || !Number.isFinite(v) ? null : Number(v.toPrecision(4)));
const semDig = (cl) => cl[1] + cl[2] + cl[3];

async function* linhas() {
  for (const arq of (await readdir(DIR_V)).filter((n) => /^[a-z]{2}\.jsonl$/.test(n)).sort()) {
    for await (const l of createInterface({ input: createReadStream(path.join(DIR_V, arq)), crlfDelay: Infinity })) if (l) yield JSON.parse(l);
  }
}

function novoTurno() {
  return {
    secoesDia: 0, cl: [0, 0, 0, 0, 0], ses: 0, cons: 0, jv: 0, jvc: 0, perd: 0, perdRet: 0, perdUH: 0, suspSV: 0, canc: 0, rec: 0, nada: 0,
    susp: { tot: 0, parc: 0, semVoto: 0, abort: 0, val: 0, inv: 0, porMes: 0 }, comConsulta: 0,
    hv: new Array(16).fill(0), hs: new Array(16).fill(0), hvUH: 0, hsUH: 0,
    runM: { k5: 0, k10: 0, k20: 0, s1: 0, s1s2: 0, s1s2s4: 0, s1s4: 0, s1uh: 0, s1s2uh: 0, votosS1S2: 0 },
    runA: { k5: 0, k10: 0, s1: 0, s1s2: 0, s1s2Cobertura: 0 },
    mh: {}, // por comparação e janela
  };
}

/** Acumula um estrato da razão de chances de Mantel-Haenszel (a, n1 do grupo exposto; c, n0 do de referência). */
function mhAcumular(acc, a, n1, c, n0) {
  const N = n1 + n0;
  if (!N || !n1 || !n0) return;
  const b = n1 - a, d = n0 - c;
  const R = (a * d) / N, S = (b * c) / N, P = (a + d) / N, Q = (b + c) / N;
  acc.R += R; acc.S += S; acc.PR += P * R; acc.PSQR += P * S + Q * R; acc.QS += Q * S;
  acc.a += a; acc.n1 += n1; acc.c += c; acc.n0 += n0; acc.E += (n1 * (a + c)) / N; acc.V += (n1 * n0 * (a + c) * (N - a - c)) / (N * N * Math.max(1, N - 1));
}
function mhResultado(acc) {
  const or = acc.R / acc.S;
  const v = acc.PR / (2 * acc.R ** 2) + acc.PSQR / (2 * acc.R * acc.S) + acc.QS / (2 * acc.S ** 2);
  const ep = Math.sqrt(v);
  const zMH = (acc.a - acc.E) / Math.sqrt(acc.V);
  const orMin = Math.exp(2.8 * ep); // menor OR detectável com poder 80% a 5% bilateral
  return {
    eventosExpostos: acc.a, votosExpostos: acc.n1, eventosReferencia: acc.c, votosReferencia: acc.n0,
    taxaExpostosPorMil: r4((1000 * acc.a) / acc.n1), taxaReferenciaPorMil: r4((1000 * acc.c) / acc.n0),
    orMH: r4(or), ic95: [r4(or * Math.exp(-1.96 * ep)), r4(or * Math.exp(1.96 * ep))], epLogOR: r4(ep),
    esperadoExpostos: r4(acc.E), excessoEventos: r4(acc.a - acc.E), zMH: r4(zMH),
    orMinimoDetectavel80: r4(orMin), excessoMinimoDetectavel80: r4(acc.E * (orMin - 1)),
  };
}
const novoMH = () => ({ R: 0, S: 0, PR: 0, PSQR: 0, QS: 0, a: 0, n1: 0, c: 0, n0: 0, E: 0, V: 0 });

function bandeiraH15(r, excesso) {
  if (!r || r.k < 5 || !(r.p < ALFA_B) || !(r.pr <= 0.05)) return false;
  return excesso == null ? true : excesso >= r.k / 2;
}

async function principal() {
  const inicio = Date.now();
  const T = { 1: novoTurno(), 2: novoTurno() };
  const inv = { secoes: 0, d2: 0, d1: 0, d1outraSecao: 0, d1ausente: 0, ambos: 0, ufs: new Set() };
  const inj = {}; let nInj = 0, nInjEx = 0;
  const casosH15 = { 1: [], 2: [] };
  const quaseH15 = { 1: [], 2: [] };
  const casosRunA = { 1: [], 2: [] };
  const roubo = { 1: [], 2: [] }; // seção-dias com 2+ eventos (candidatas)
  const sup = { 1: [], 2: [] }; // [zona, ses, perd, ref]
  const pares = []; // seções com os dois dias: para C15.1, C17.2, C17.3
  const excessos = [];

  for await (const x of linhas()) {
    inv.secoes++; inv.ufs.add(x.uf);
    if (x.d2) inv.d2++;
    if (x.d1) inv.d1++; else if (x.d1x === 'outraSecao') inv.d1outraSecao++; else inv.d1ausente++;
    if (x.d1 && x.d2) inv.ambos++;
    if (x.excesso != null) excessos.push(x.excesso);
    if (x.inj) {
      nInj++;
      if (x.excesso != null) nInjEx++;
      for (const [k, bits] of Object.entries(x.inj)) { inj[k] ??= [0, 0, 0, 0]; bits.forEach((b, i) => { inj[k][i] += b; }); }
    }
    const zona = `${x.uf}/${x.zona}`;
    const flag = {};
    for (const t of [1, 2]) {
      const d = x[`d${t}`];
      if (!d) continue;
      const A = T[t];
      A.secoesDia++;
      d.cl.forEach((v, i) => { A.cl[i] += v; });
      for (const c of ['ses', 'cons', 'jv', 'jvc', 'perd', 'perdRet', 'perdUH', 'suspSV', 'canc', 'rec', 'nada']) A[c] += d[c];
      for (const c of ['tot', 'parc', 'semVoto', 'abort', 'val', 'inv']) A.susp[c] += d.susp[c];
      A.susp.porMes += Object.values(d.susp.porMes).reduce((s, v) => s + v, 0);
      if (d.cons) A.comConsulta++;
      d.hv.forEach((v, i) => { A.hv[i] += v; });
      d.hs.forEach((v, i) => { A.hs[i] += v; });
      // H17-roubo: Mantel-Haenszel por seção-dia
      const { n, y600, y60 } = d.h17;
      const comps = { semDigital: [1, 2, 3], ano: [1], manualMesario: [2], manualSemMesario: [3] };
      for (const [nomeC, cls] of Object.entries(comps)) {
        for (const [jan, y] of [['600s', y600], ['60s', y60]]) {
          const acc = (A.mh[`${nomeC}-${jan}`] ??= novoMH());
          mhAcumular(acc, cls.reduce((s, c) => s + y[c], 0), cls.reduce((s, c) => s + n[c], 0), y[0], n[0]);
        }
      }
      const E = y600[1] + y600[2] + y600[3];
      if (E >= 2) roubo[t].push({ nome: nome(x), modelo: x.modelo, E, nSem: n[1] + n[2] + n[3], porClasse: [y600[1], y600[2], y600[3]], mesY: d.mesY, jv: d.jv, v: d.v, excesso: x.excesso, yBio: y600[0], nBio: n[0], y60sem: y60[1] + y60[2] + y60[3] });
      // H17-supressão
      sup[t].push([zona, d.ses, d.perd, { nome: nome(x), modelo: x.modelo, excesso: x.excesso, perdRet: d.perdRet, suspSV: d.suspSV, canc: d.canc, cons: d.cons, suspTot: d.susp.tot, porMes: Object.values(d.susp.porMes), perdUH: d.perdUH, d1: t === 2 && x.d1 ? { ses: x.d1.ses, perd: x.d1.perd } : null }]);
      // H15
      const rm = d.runM;
      if (rm) {
        if (rm.k >= 5) A.runM.k5++;
        if (rm.k >= 10) A.runM.k10++;
        if (rm.k >= 20) A.runM.k20++;
        const s1 = rm.k >= 5 && rm.p < ALFA_B;
        const s1s2 = bandeiraH15(rm, null);
        const s4 = t === 2 && x.excesso != null && x.excesso >= rm.k / 2;
        if (s1) { A.runM.s1++; if (rm.uh) A.runM.s1uh++; if (s4) A.runM.s1s4++; }
        if (s1s2) { A.runM.s1s2++; A.runM.votosS1S2 += rm.k; if (rm.uh) A.runM.s1s2uh++; if (s4) A.runM.s1s2s4++; }
        flag[t] = s1s2;
        flag[`s${t}`] = s1;
        flag[`m${t}`] = s1s2 && semDig(d.cl) / d.v < 0.5; // pós-hoc: fora as seções de liberação manual em massa
        if (s1) casosH15[t].push({ nome: nome(x), modelo: x.modelo, v: d.v, semDigital: semDig(d.cl), ...rm, excesso: x.excesso, s2: s1s2, s4: t === 2 ? s4 : null, errCap: d.errCap, inicios: d.inicios, encerr: d.encerr, ultimo: d.ultimo });
        if (rm.k >= 5) {
          quaseH15[t].push({ nome: nome(x), k: rm.k, p: rm.p, pr: rm.pr, uh: rm.uh, excesso: x.excesso });
          if (quaseH15[t].length > 400) { quaseH15[t].sort((a, b) => a.p - b.p); quaseH15[t].length = 200; }
        }
      }
      const ra = d.runA;
      if (ra) {
        if (ra.k >= 5) A.runA.k5++;
        if (ra.k >= 10) A.runA.k10++;
        if (ra.k >= 5 && ra.p < ALFA_B) {
          A.runA.s1++;
          const s1s2 = ra.pr <= 0.05;
          if (s1s2) { A.runA.s1s2++; if (ra.comp[1] + ra.comp[3] > 0) A.runA.s1s2Cobertura++; }
          casosRunA[t].push({ nome: nome(x), modelo: x.modelo, v: d.v, semDigital: semDig(d.cl), ...ra, excesso: x.excesso, s2: s1s2 });
        }
      }
    }
    if (x.d1 && x.d2) {
      pares.push({
        zona, mun: `${x.uf}/${x.mun}`, f1: !!flag[1], f2: !!flag[2], g1: !!flag.m1, g2: !!flag.m2, h1: !!flag.s1, h2: !!flag.s2,
        jv1: x.d1.jv, jv2: x.d2.jv, sd1: semDig(x.d1.cl), sd2: semDig(x.d2.cl), v1: x.d1.v, v2: x.d2.v,
        r1: x.d1.ses ? x.d1.perd / x.d1.ses : null, r2: x.d2.ses ? x.d2.perd / x.d2.ses : null, s1: x.d1.ses, s2: x.d2.ses,
        p1: x.d1.perd, p2: x.d2.perd, susp1: x.d1.suspSV, susp2: x.d2.suspSV,
      });
    }
  }

  // ---------- H15 ----------
  const media = (xs) => xs.reduce((s, v) => s + v, 0) / xs.length;
  const dp = (xs) => { const m = media(xs); return Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / (xs.length - 1)); };
  let b = 0, c = 0, ambos = 0;
  for (const p of pares) { if (p.f2 && !p.f1) b++; else if (p.f1 && !p.f2) c++; else if (p.f1 && p.f2) ambos++; }
  let bP = 0, cP = 0;
  for (const p of pares) { if (p.g2 && !p.g1) bP++; else if (p.g1 && !p.g2) cP++; }
  const posHoc = { so2T: bP, so1T: cP, p: r4(bP + cP ? Math.min(1, 2 * binomialCauda(bP + cP, 0.5, Math.max(bP, cP))) : 1) };
  // exploratório (não pré-registrado): só S1, o sinal que ainda apanha o bloco disfarçado
  let bS = 0, cS = 0;
  for (const p of pares) { if (p.h2 && !p.h1) bS++; else if (p.h1 && !p.h2) cS++; }
  const ubS = bS + cS ? Math.max(0, (bS - cS) + 1.645 * Math.sqrt(bS + cS)) : 3;
  const soS1 = { so2T: bS, so1T: cS, p: r4(bS + cS ? Math.min(1, 2 * binomialCauda(bS + cS, 0.5, Math.max(bS, cS))) : 1), excessoLimiteSuperior95: r4(ubS) };
  const pMcNemar = b + c ? Math.min(1, 2 * binomialCauda(b + c, 0.5, Math.max(b, c))) : 1;
  const excessoUB = b + c ? Math.max(0, (b - c) + 1.645 * Math.sqrt(b + c)) : 3;
  const poder = Object.fromEntries(Object.entries(inj).map(([k, bits]) => [k, { S1: r4(bits[0] / nInj), S1S2: r4(bits[1] / nInj), S1S2S4: r4(bits[2] / nInj), S1S4: r4(bits[3] / nInj) }]));
  const compativel = Object.fromEntries([5, 10, 20].map((k) => {
    const pw = poder[`reg${k}`].S1S2;
    return [`k${k}`, { poderRegular: pw, maxSecoes: pw > 0 ? r4(excessoUB / pw) : null, maxVotos: pw > 0 ? r4((excessoUB / pw) * k) : null }];
  }));
  const ex2 = casosH15[2].filter((x) => x.s2 && x.excesso != null).map((x) => x.excesso);
  const mediaGeral = media(excessos);
  const c152 = ex2.length >= 2 ? { n: ex2.length, mediaExcesso: r4(media(ex2)), ic95: [r4(media(ex2) - 1.96 * dp(ex2) / Math.sqrt(ex2.length)), r4(media(ex2) + 1.96 * dp(ex2) / Math.sqrt(ex2.length))], mediaTodasSecoes: r4(mediaGeral), kMedio: r4(media(casosH15[2].filter((x) => x.s2).map((x) => x.k))) } : { n: ex2.length, valores: ex2, mediaTodasSecoes: r4(mediaGeral) };

  // ---------- H17-roubo: bandeira por seção-dia ----------
  const r0 = { 1: T[1].mh['semDigital-600s'].c / T[1].mh['semDigital-600s'].n0, 2: T[2].mh['semDigital-600s'].c / T[2].mh['semDigital-600s'].n0 };
  const casosRoubo = {};
  for (const t of [1, 2]) {
    casosRoubo[t] = roubo[t].map((x) => {
      const p = caudaPoisson(x.E, x.nSem * r0[t]);
      const eMM = x.porClasse[1];
      const topo = x.mesY.reduce((m, [, , y]) => Math.max(m, y), 0);
      // controle dentro da seção (exploratório): taxa da própria seção depois de voto por biometria (mínimo 0,5 evento)
      const pSecao = x.nBio ? caudaPoisson(x.E, (x.nSem * Math.max(x.yBio, 0.5)) / x.nBio) : null;
      return { ...x, esperado: r4(x.nSem * r0[t]), p: r4(p), pSecao: r4(pSecao), s1: p < ALFA_B, concentrado: eMM > 0 && topo / x.E >= 2 / 3, cobertura: x.porClasse[0] + x.porClasse[2] > eMM ? 'faltante' : 'mesario' };
    }).filter((x) => x.p < 1e-3).sort((a, b) => a.p - b.p);
  }

  // ---------- C17.2: Δ já votou × Δ sem digital, dentro da zona ----------
  const pr = pares.filter((p) => p.v1 > 0 && p.v2 > 0);
  const [y, x1, x2] = demeanar([pr.map((p) => p.jv2 - p.jv1), pr.map((p) => p.sd2 - p.sd1), pr.map((p) => p.v2 - p.v1)], pr.map((p) => p.zona));
  const c172 = mqo(y, [x1, x2], ['deltaSemDigital', 'deltaVotos'], pr.map((p) => p.mun));

  // ---------- H17-supressão ----------
  const supRes = {};
  for (const t of [1, 2]) {
    const zonas = new Map();
    for (const [z, ses, perd] of sup[t]) { const a = zonas.get(z) ?? [0, 0]; a[0] += ses; a[1] += perd; zonas.set(z, a); }
    const { p: pNac, rho } = sobredispersao(sup[t].filter((s) => s[1] > 0).map((s) => ({ x: s[2], n: s[1] })));
    const flags = [];
    for (const [z, ses, perd, x] of sup[t]) {
      if (!ses) continue;
      const [zs, zp] = zonas.get(z);
      const mu = zs - ses > 0 ? (zp - perd) / (zs - ses) : pNac;
      if (mu <= 0) continue;
      const vari = ses * mu * (1 - mu) * (1 + (ses - 1) * rho);
      if ((perd - ses * mu) / Math.sqrt(vari) < 4) continue;
      const a = (mu * (1 - rho)) / rho, bb = ((1 - mu) * (1 - rho)) / rho;
      const p = betaBinomialCauda(ses, a, bb, perd);
      if (p < ALFA_B) {
        const porMes = x.porMes;
        const topo = porMes.length ? Math.max(...porMes) : 0;
        flags.push({ nome: x.nome, modelo: x.modelo, ses, perd, mu: r4(mu), p: r4(p), perdRet: x.perdRet, suspSV: x.suspSV, canc: x.canc, cons: x.cons, suspTot: x.suspTot, suspTopoMesario: topo, excesso: x.excesso, perdUH: x.perdUH, mu1: null, d1: x.d1, mesmaZona: z });
      }
    }
    // 1º turno da mesma seção (para a conjunção do 2º turno)
    if (t === 2) {
      const z1 = new Map();
      for (const [z, ses, perd] of sup[1]) { const a = z1.get(z) ?? [0, 0]; a[0] += ses; a[1] += perd; z1.set(z, a); }
      const { rho: rho1 } = sobredispersao(sup[1].filter((s) => s[1] > 0).map((s) => ({ x: s[2], n: s[1] })));
      for (const f of flags) {
        if (!f.d1 || !f.d1.ses) { f.p1 = null; continue; }
        const [zs, zp] = z1.get(f.mesmaZona) ?? [0, 0];
        const mu1 = zs - f.d1.ses > 0 ? (zp - f.d1.perd) / (zs - f.d1.ses) : 0;
        f.p1 = mu1 > 0 ? r4(betaBinomialCauda(f.d1.ses, (mu1 * (1 - rho1)) / rho1, ((1 - mu1) * (1 - rho1)) / rho1, f.d1.perd)) : null;
        f.mu1 = r4(mu1);
      }
    }
    for (const f of flags) delete f.mesmaZona;
    flags.sort((a, b) => a.p - b.p);
    const conj = t === 2 ? {
      s1: flags.length,
      eSem1T: flags.filter((f) => f.p1 != null && f.p1 > 0.01).length,
      eComparecimentoMenor: flags.filter((f) => f.p1 != null && f.p1 > 0.01 && f.excesso != null && f.excesso < 0).length,
      eConcentrado: flags.filter((f) => f.p1 != null && f.p1 > 0.01 && f.excesso != null && f.excesso < 0 && f.suspTot >= 3 && f.suspTopoMesario / f.suspTot >= 2 / 3).length,
    } : { s1: flags.length };
    supRes[t] = { rhoNacional: r4(rho), taxaNacional: r4(pNac), conjuncao: conj, casos: flags };
  }
  // C17.3: perdidos 2º × 1º turno, pareado
  const pp = pares.filter((p) => p.s1 >= 20 && p.s2 >= 20);
  const difs = pp.map((p) => p.r2 - p.r1);
  const c173 = { secoes: pp.length, taxa1: r4(pp.reduce((s, p) => s + p.p1, 0) / pp.reduce((s, p) => s + p.s1, 0)), taxa2: r4(pp.reduce((s, p) => s + p.p2, 0) / pp.reduce((s, p) => s + p.s2, 0)), mediaDiferenca: r4(media(difs)), ic95: [r4(media(difs) - 1.96 * dp(difs) / Math.sqrt(difs.length)), r4(media(difs) + 1.96 * dp(difs) / Math.sqrt(difs.length))], suspSemVoto1: pp.reduce((s, p) => s + p.susp1, 0), suspSemVoto2: pp.reduce((s, p) => s + p.susp2, 0) };

  // ---------- saída ----------
  const turnoOut = (t) => {
    const A = T[t];
    const ultimaHora = null;
    return {
      secoesDia: A.secoesDia, classes: { biometria: A.cl[0], ano: A.cl[1], manualMesario: A.cl[2], manualSemMesario: A.cl[3], outra: A.cl[4] },
      atendimentos: { foraDeConsulta: A.ses, consulta: A.cons, secoesComConsulta: A.comConsulta, jaVotouIsolado: A.jv, jaVotouEmConsulta: A.jvc, perdidos: A.perd, perdidosComRetomada: A.perdRet, perdidosUltimaHora: A.perdUH, suspensoSemVoto: A.suspSV, cancelada: A.canc, recusa: A.rec, semDesfecho: A.nada },
      suspensoes: A.susp, ultimaHora,
      porHora: A.hv.map((v, i) => ({ hora: i + 5, votos: v, semDigital: A.hs[i] })),
      h15: { runM: A.runM, runA: A.runA },
      h17roubo: Object.fromEntries(Object.entries(A.mh).map(([k, acc]) => [k, mhResultado(acc)])),
    };
  };
  const t1 = turnoOut(1), t2 = turnoOut(2);
  const dif = (k) => {
    const a = t2.h17roubo[k], z = t1.h17roubo[k];
    const d = Math.log(a.orMH) - Math.log(z.orMH);
    const ep = Math.sqrt(a.epLogOR ** 2 + z.epLogOR ** 2);
    return { razaoOR2sobre1: r4(Math.exp(d)), ic95: [r4(Math.exp(d - 1.96 * ep)), r4(Math.exp(d + 1.96 * ep))], z: r4(d / ep) };
  };
  const resumo = {
    geradoEm: new Date().toISOString(), preRegistroSha256: await hashPreRegistro(), alfaB: ALFA_B,
    preRegistroGravado: (await readFile(path.join(DIR_H, 'pre-registro.sha256'), 'utf8')).trim(),
    universo: { ...inv, ufs: inv.ufs.size, erros: await contarErros() },
    turno1: t1, turno2: t2,
    h15: {
      c151McNemar: { pares: pares.length, so2T: b, so1T: c, ambos, p: r4(pMcNemar), excessoLimiteSuperior95: r4(excessoUB), posHocSemManualEmMassa: posHoc, exploratorioSoS1: soS1 },
      c152Comparecimento: c152,
      poder: { secoes: nInj, secoesComExcesso: nInjEx, porVariante: poder }, compativel,
    },
    h17roubo: {
      taxaReferencia: { 1: r4(r0[1]), 2: r4(r0[2]) },
      diferencaTurnos: { '600s': dif('semDigital-600s'), '60s': dif('semDigital-60s'), manualMesario600s: dif('manualMesario-600s') },
      c172Regressao: c172,
      bandeira: Object.fromEntries([1, 2].map((t) => [t, { candidatas: roubo[t].length, s1: casosRoubo[t].filter((x) => x.s1).length, s1Concentrado: casosRoubo[t].filter((x) => x.s1 && x.concentrado).length }])),
    },
    h17supressao: { c173Pareado: c173, 1: { rho: supRes[1].rhoNacional, taxa: supRes[1].taxaNacional, conjuncao: supRes[1].conjuncao }, 2: { rho: supRes[2].rhoNacional, taxa: supRes[2].taxaNacional, conjuncao: supRes[2].conjuncao } },
    segundos: Math.round((Date.now() - inicio) / 1000),
  };
  quaseH15[1].sort((a, b) => a.p - b.p); quaseH15[2].sort((a, b) => a.p - b.p);
  await anexarPerfil([...casosH15[1], ...casosH15[2], ...casosRunA[1], ...casosRunA[2], ...casosRoubo[1], ...casosRoubo[2], ...supRes[1].casos, ...supRes[2].casos]);
  await writeFile(path.join(DIR_H, 'resumo.json'), JSON.stringify(resumo, null, 1));
  await writeFile(path.join(DIR_H, 'casos-h15.json'), JSON.stringify({ runM: casosH15, runA: casosRunA, menoresP: { 1: quaseH15[1].slice(0, 50), 2: quaseH15[2].slice(0, 50) } }, null, 1));
  await writeFile(path.join(DIR_H, 'casos-h17.json'), JSON.stringify({ roubo: casosRoubo, supressao: { 1: supRes[1].casos, 2: supRes[2].casos } }, null, 1));
  // dados dos gráficos
  await writeFile(path.join(DIR_H, 'poder.csv'), `forma,k,S1,S1S2,S1S2S4\n${Object.entries(poder).map(([k, v]) => `${k.slice(0, 3)},${k.slice(3)},${v.S1},${v.S1S2},${v.S1S2S4}`).join('\n')}\n`);
  await writeFile(path.join(DIR_H, 'horas.csv'), `hora,votos1,semDigital1,votos2,semDigital2\n${t1.porHora.map((h, i) => `${h.hora},${h.votos},${h.semDigital},${t2.porHora[i].votos},${t2.porHora[i].semDigital}`).join('\n')}\n`);
  const cls = [['biometria', null], ['ano', 'ano-600s'], ['manualMesario', 'manualMesario-600s'], ['manualSemMesario', 'manualSemMesario-600s']];
  await writeFile(path.join(DIR_H, 'ja-votou.csv'), `classe,votos1,eventos1,votos2,eventos2\n${cls.map(([n, k]) => {
    const a = n === 'biometria' ? [t1.h17roubo['semDigital-600s'].votosReferencia, t1.h17roubo['semDigital-600s'].eventosReferencia, t2.h17roubo['semDigital-600s'].votosReferencia, t2.h17roubo['semDigital-600s'].eventosReferencia]
      : [t1.h17roubo[k].votosExpostos, t1.h17roubo[k].eventosExpostos, t2.h17roubo[k].votosExpostos, t2.h17roubo[k].eventosExpostos];
    return `${n},${a.join(',')}`;
  }).join('\n')}\n`);
  console.log(JSON.stringify({ universo: resumo.universo, h15: resumo.h15, h17roubo: resumo.h17roubo, h17supressao: resumo.h17supressao }, null, 1));
}

/** Perfil do cadastro (biometria-cadastro.mjs): parcela de 70+ anos e de aptos sem biometria, como controle. */
async function anexarPerfil(casos) {
  const alvo = new Map();
  for (const c of casos) {
    const [uf, resto] = c.nome.split(' ');
    const k = `${uf.toLowerCase()}/${resto}`;
    if (!alvo.has(k)) alvo.set(k, []);
    alvo.get(k).push(c);
  }
  const arq = path.join(DIR_H, '..', 'biometria', 'cadastro-secao.jsonl');
  for await (const l of createInterface({ input: createReadStream(arq), crlfDelay: Infinity })) {
    if (!l) continue;
    const k = l.slice(6, l.indexOf('"', 6));
    if (!alvo.has(k)) continue;
    const s = JSON.parse(l);
    const f = s.faixas ?? {};
    for (const c of alvo.get(k)) c.perfil = { eleitores: s.eleitores, pct70mais: r4((100 * ((f['70a79'] ?? 0) + (f['80mais'] ?? 0))) / s.eleitores), pctSemBiometria: r4((100 * (s.eleitores - s.biometria)) / s.eleitores) };
  }
}

async function contarErros() {
  let n = 0;
  for (const arq of (await readdir(DIR_V)).filter((x) => x.endsWith('.erros.jsonl'))) n += (await readFile(path.join(DIR_V, arq), 'utf8')).split('\n').filter(Boolean).length;
  return n;
}

await principal();
