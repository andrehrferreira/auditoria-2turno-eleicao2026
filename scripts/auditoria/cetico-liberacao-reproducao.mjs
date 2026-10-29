// Revisor cético, H13 (liberação sem biometria × voto no 13): reprodução INDEPENDENTE dos números centrais da
// síntese docs/analysis/hipotese-liberacao-mesario/00-sintese.md, com código próprio (não importa os scripts liberacao-*).
//
// Lê os perfis de seção data/parsed/<t>t/perfil/<uf>.jsonl (todas as seções, os dois turnos), o perfil do eleitorado
// data/parsed/auditoria/forense/perfil/<uf>.csv (controles do M2) e, da cópia de leitura do banco, secao_agregada e
// voto_oficial (cargo = 1, conferência dos votos do BU).
//
// Reproduz:
//  A) taxa de liberação por região (L1 = log habilitadosPeloMesario; L2 = BU semBio + porBiografia), 1º e 2º turnos;
//     invariantes log × BU (ano = semBio, dadoPessoal = porBiog, bio = porBio, L1 ≤ porBiog);
//  B) limites determinísticos (Duncan–Davis) agregados por região e seções que obrigam votos no 13/22, com um nulo de
//     permutação próprio (gerador xorshift, semente diferente) e um nulo alternativo (permutação das CONTAGENS de
//     liberados entre seções da zona com T parecido não é usado: usa a mesma taxa, mas outro sorteio);
//  C) Goodman com efeito fixo de zona (M1) no Nordeste, 2 grupos (L1 × resto) e 3 grupos (M, O, biométricos);
//     M2 = M1 + controles do perfil (sem as dummies de local indígena/quilombola), com bootstrap por município.
// Uso: node --max-old-space-size=8000 scripts/auditoria/cetico-liberacao-reproducao.mjs [--reps 100] [--boot 200]
// Saída: data/parsed/auditoria/cetico-revisor/liberacao-reproducao.json
import { createReadStream } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

const { values } = parseArgs({ options: { reps: { type: 'string', default: '100' }, boot: { type: 'string', default: '200' } } });
const REPS = Number(values.reps), BOOT = Number(values.boot);
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor');
const REG = {};
for (const [r, u] of Object.entries({ NE: 'al ba ce ma pb pe pi rn se', N: 'ac am ap pa ro rr to', CO: 'df go ms mt', SE: 'es mg rj sp', S: 'pr rs sc', ZZ: 'zz' })) for (const x of u.split(' ')) REG[x] = r;

function xorshift(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

// ---------- A e B: leitura dos perfis ----------
function lim(L, T, V13, V22) {
  return { min13: Math.max(0, L - (T - V13)), max13: Math.min(L, V13), min22: Math.max(0, L - (T - V22)), max22: Math.min(L, V22) };
}
function agNovo() { return { secoes: 0, comp: 0, L1raw: 0, L2raw: 0, sec: { L1: 0, L2: 0 }, T: { L1: 0, L2: 0 }, L: { L1: 0, L2: 0 }, min13: { L1: 0, L2: 0 }, max13: { L1: 0, L2: 0 }, min22: { L1: 0, L2: 0 }, max22: { L1: 0, L2: 0 }, f13: { L1: 0, L2: 0 }, f22: { L1: 0, L2: 0 }, h13: { L1: 0, L2: 0 }, h22: { L1: 0, L2: 0 }, V13: 0, V22: 0 }; }

async function lerTurno(t) {
  const dir = path.join(DIR_DADOS, 'parsed', `${t}t`, 'perfil');
  const arqs = (await readdir(dir)).filter((n) => /^[a-z]{2}\.jsonl$/.test(n)).sort();
  const ag = {}; const g = (k) => (ag[k] ??= agNovo());
  const ctl = { linhas: 0, chavesRepetidas: 0, pacotesMaisDe1: 0, semLog: 0, logVotosDifereT: 0, semDetalhe: 0, detalheDifereT: 0, compDifereT: 0,
    invAnoDifSemBio: 0, invDpDifPorBiog: 0, invBioDifPorBio: 0, invL1MaiorPorBiog: 0, ufs: [] };
  const secoes = []; // para permutação e regressão
  const vistos = new Set();
  for (const arq of arqs) {
    const uf = arq.slice(0, 2); ctl.ufs.push(uf);
    for await (const linha of createInterface({ input: createReadStream(path.join(dir, arq)), crlfDelay: Infinity })) {
      if (!linha) continue;
      ctl.linhas++;
      const p = JSON.parse(linha);
      const k = `${p.uf}/${p.municipio}/${p.zona}/${p.secao}`;
      if (vistos.has(k)) { ctl.chavesRepetidas++; continue; }
      vistos.add(k);
      if (p.pacotesNaSecao > 1) ctl.pacotesMaisDe1++;
      let votos = null;
      for (const e of p.bu?.eleicoes ?? []) for (const c of e.cargos ?? []) if (c.codigoCargo === 1) votos = c.votos;
      const V13 = votos?.['13'] ?? 0, V22 = votos?.['22'] ?? 0;
      let T = 0; for (const q of Object.values(votos ?? {})) T += q;
      const comp = p.bu?.qtdEleitoresCompareceram ?? 0;
      if (comp !== T) ctl.compDifereT++;
      const d = p.bu?.detalhamentoComparecimento;
      const l = p.log;
      const r = REG[p.uf];
      for (const key of ['BR', r]) {
        const a = g(key);
        a.secoes++; a.comp += comp; a.V13 += V13; a.V22 += V22;
        if (l) a.L1raw += l.habilitadosPeloMesario ?? 0;
        if (d) a.L2raw += (d.semBiometriaCadastrada ?? 0) + (d.comBiometriaHabilitadosPorAnoNascimento ?? 0);
      }
      if (!l) ctl.semLog++;
      if (!d) ctl.semDetalhe++;
      if (l && d) {
        if (l.anoNascimentoSemBiometria !== d.semBiometriaCadastrada) ctl.invAnoDifSemBio++;
        if (l.dadoPessoalConfere !== d.comBiometriaHabilitadosPorAnoNascimento) ctl.invDpDifPorBiog++;
        if (l.habilitadosBiometria !== d.porBiometria) ctl.invBioDifPorBio++;
        if (l.habilitadosPeloMesario > d.comBiometriaHabilitadosPorAnoNascimento) ctl.invL1MaiorPorBiog++;
      }
      if (T === 0) continue;
      const L = {};
      if (l && l.votosComputados === T) L.L1 = l.habilitadosPeloMesario; else if (l) ctl.logVotosDifereT++;
      if (d) {
        if (d.semBiometriaCadastrada + d.porBiometria + d.comBiometriaHabilitadosPorAnoNascimento === T) L.L2 = d.semBiometriaCadastrada + d.comBiometriaHabilitadosPorAnoNascimento;
        else ctl.detalheDifereT++;
      }
      for (const def of ['L1', 'L2']) {
        if (L[def] === undefined || L[def] > T) continue;
        const b = lim(L[def], T, V13, V22);
        for (const key of ['BR', r]) {
          const a = g(key);
          a.sec[def]++; a.T[def] += T; a.L[def] += L[def];
          a.min13[def] += b.min13; a.max13[def] += b.max13; a.min22[def] += b.min22; a.max22[def] += b.max22;
          a.h13[def] += L[def] * V13 / T; a.h22[def] += L[def] * V22 / T;
          if (b.min13 >= 1) a.f13[def]++; if (b.min22 >= 1) a.f22[def]++;
        }
      }
      secoes.push({ k, uf: p.uf, r, mun: `${p.uf}/${p.municipio}`, zona: `${p.uf}/${p.zona}`, zonaMun: `${p.uf}/${p.municipio}/${p.zona}`, T, comp, V13, V22, L1: L.L1, L2: L.L2,
        semBio: d?.semBiometriaCadastrada, porBiog: d?.comBiometriaHabilitadosPorAnoNascimento, porBio: d?.porBiometria, hm: l?.habilitadosPeloMesario });
    }
  }
  const res = {};
  for (const [k, a] of Object.entries(ag)) {
    const q = (x, y) => (y ? +(100 * x / y).toFixed(3) : null);
    res[k] = { secoes: a.secoes, comp: a.comp, L1: a.L1raw, L2: a.L2raw, taxaL1: q(a.L1raw, a.comp), taxaL2: q(a.L2raw, a.comp), s13: q(a.V13, a.V13 + a.V22) };
    for (const def of ['L1', 'L2']) {
      res[k][def + '_limites'] = { secoes: a.sec[def], L: a.L[def], taxa: q(a.L[def], a.T[def]),
        faixa13DoisPartidos: [q(a.min13[def], a.min13[def] + a.max22[def]), q(a.max13[def], a.max13[def] + a.min22[def])],
        homog13DoisPartidos: q(a.h13[def], a.h13[def] + a.h22[def]), forcadas13: a.f13[def], forcadas22: a.f22[def] };
    }
  }
  return { ctl, res, secoes };
}

// Nulo de permutação: taxa L/T embaralhada entre seções da mesma UF/zona (como no método 02), outro gerador.
function permut(secoes, def, reps, seed, filtroReg) {
  const rnd = xorshift(seed);
  const porZ = new Map();
  for (const s of secoes) { const L = s[def]; if (L === undefined || L > s.T) continue; if (!porZ.has(s.zona)) porZ.set(s.zona, []); porZ.get(s.zona).push(s); }
  const conta = (reg, taxaDe) => { let f13 = 0, f22 = 0; for (const lista of porZ.values()) { if (filtroReg && lista[0].r !== reg) continue; const tx = taxaDe(lista); lista.forEach((s, i) => { const L = Math.min(s.T, Math.round(tx[i] * s.T)); const b = lim(L, s.T, s.V13, s.V22); if (b.min13 >= 1) f13++; if (b.min22 >= 1) f22++; }); } return { f13, f22 }; };
  const obs = conta(filtroReg, (lista) => lista.map((s) => s[def] / s.T));
  let s13 = 0, s22 = 0, ge13 = 0, ge22 = 0;
  for (let r = 0; r < reps; r++) {
    const e = conta(filtroReg, (lista) => { const t = lista.map((s) => s[def] / s.T); for (let i = t.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [t[i], t[j]] = [t[j], t[i]]; } return t; });
    s13 += e.f13; s22 += e.f22; if (e.f13 >= obs.f13) ge13++; if (e.f22 >= obs.f22) ge22++;
  }
  return { regiao: filtroReg, def, reps, obs13: obs.f13, esp13: +(s13 / reps).toFixed(1), razao13: +(obs.f13 / (s13 / reps)).toFixed(3), pmaiorIgual13: ge13 / reps,
    obs22: obs.f22, esp22: +(s22 / reps).toFixed(1), razao22: +(obs.f22 / (s22 / reps)).toFixed(3), pmaiorIgual22: ge22 / reps };
}

// ---------- C: Goodman com efeito fixo de zona ----------
function resolver(A, b) { // eliminação de Gauss com pivô parcial; A k×k, b k×m
  const k = A.length, m = b[0].length; const M = A.map((r, i) => [...r, ...b[i]]);
  for (let c = 0; c < k; c++) { let p = c; for (let i = c + 1; i < k; i++) if (Math.abs(M[i][c]) > Math.abs(M[p][c])) p = i; [M[c], M[p]] = [M[p], M[c]];
    for (let i = 0; i < k; i++) if (i !== c) { const f = M[i][c] / M[c][c]; for (let j = c; j < k + m; j++) M[i][j] -= f * M[c][j]; } }
  return M.map((r, i) => r.slice(k).map((v) => v / M[i][i]));
}
// Estatísticas suficientes por zona (aditivas; o bootstrap por município soma zonas com multiplicidade).
// x = [grupos/n..., controles...]; y = [v13/n, v22/n]; peso n. Para cada grupo g (e biométricos): ΣG, ΣG·Xc, e ΣG·(grupos/n) não é preciso.
function statsZona(lista, ng, nc, grupos) {
  const k = ng + nc; let W = 0; const mx = Array(k).fill(0), my = [0, 0];
  for (const s of lista) { W += s.w; for (let i = 0; i < k; i++) mx[i] += s.w * s.x[i]; my[0] += s.w * s.y[0]; my[1] += s.w * s.y[1]; }
  for (let i = 0; i < k; i++) mx[i] /= W; my[0] /= W; my[1] /= W;
  const Sxx = Array.from({ length: k }, () => Array(k).fill(0)), Sxy = Array.from({ length: k }, () => [0, 0]);
  for (const s of lista) { for (let i = 0; i < k; i++) { const di = s.x[i] - mx[i]; for (let j = 0; j < k; j++) Sxx[i][j] += s.w * di * (s.x[j] - mx[j]); Sxy[i][0] += s.w * di * (s.y[0] - my[0]); Sxy[i][1] += s.w * di * (s.y[1] - my[1]); } }
  const G = {}; for (const gname of [...grupos, 'B']) { let sg = 0; const sgx = Array(nc).fill(0); for (const s of lista) { const v = s.G[gname]; sg += v; for (let i = 0; i < nc; i++) sgx[i] += v * s.x[ng + i]; } G[gname] = { sg, sgx }; }
  return { W, mx, my, Sxx, Sxy, G };
}
function estimar(zonas, ng, nc, grupos, mult) {
  const k = ng + nc; const A = Array.from({ length: k }, () => Array(k).fill(0)), b = Array.from({ length: k }, () => [0, 0]);
  zonas.forEach((z, zi) => { const w = mult ? mult[zi] : 1; if (!w) return; for (let i = 0; i < k; i++) { for (let j = 0; j < k; j++) A[i][j] += w * z.Sxx[i][j]; b[i][0] += w * z.Sxy[i][0]; b[i][1] += w * z.Sxy[i][1]; } });
  // retira colunas sem variação
  const ativos = []; for (let i = 0; i < k; i++) if (A[i][i] > 1e-12) ativos.push(i);
  const sol = resolver(ativos.map((i) => ativos.map((j) => A[i][j])), ativos.map((i) => b[i]));
  const beta = Array.from({ length: k }, () => [0, 0]); ativos.forEach((i, a) => { beta[i] = sol[a]; });
  // nível do biométrico na seção: b_c,i = ȳ_z,c + γ_c'(Xc_i − X̄c_z) − d_c'ḡ_z ; grupo g: b + d_g
  const lev = {}; for (const gname of [...grupos, 'B']) lev[gname] = { b13: 0, b22: 0, n: 0 };
  zonas.forEach((z, zi) => { const w = mult ? mult[zi] : 1; if (!w) return;
    for (const gname of [...grupos, 'B']) { const { sg, sgx } = z.G[gname]; if (!sg) continue;
      for (const c of [0, 1]) { let v = sg * z.my[c]; for (let i = 0; i < nc; i++) v += beta[ng + i][c] * (sgx[i] - sg * z.mx[ng + i]); for (let i = 0; i < ng; i++) v -= beta[i][c] * z.mx[i] * sg; lev[gname][c ? 'b22' : 'b13'] += w * v; }
      lev[gname].n += w * sg; } });
  const out = {}; const tpB = lev.B.b13 / (lev.B.b13 + lev.B.b22);
  grupos.forEach((gname, gi) => { const L = lev[gname]; const l13 = L.b13 + beta[gi][0] * L.n, l22 = L.b22 + beta[gi][1] * L.n;
    const tp = l13 / (l13 + l22), tp0 = L.b13 / (L.b13 + L.b22); out[gname] = { tp: 100 * tp, tp0: 100 * tp0, difCond: 100 * (tp - tp0), difTotal: 100 * (tp - tpB), difComp: 100 * (tp0 - tpB) }; });
  out.bioTp = 100 * tpB; out.d = beta.slice(0, ng);
  return out;
}
function rodarModelo(secs, ng, nc, grupos, boot, seed) {
  const porZ = new Map(); for (const s of secs) { if (!porZ.has(s.zonaMun)) porZ.set(s.zonaMun, []); porZ.get(s.zonaMun).push(s); }
  const zonas = [], munDe = []; for (const lista of porZ.values()) { zonas.push(statsZona(lista, ng, nc, grupos)); munDe.push(lista[0].mun); }
  const ponto = estimar(zonas, ng, nc, grupos);
  if (!boot) return { ponto };
  const muns = [...new Set(munDe)]; const iMun = new Map(muns.map((m, i) => [m, i])); const zm = munDe.map((m) => iMun.get(m));
  const rnd = xorshift(seed); const amostras = {}; for (const gname of grupos) amostras[gname] = [];
  for (let r = 0; r < boot; r++) { const cnt = new Float64Array(muns.length); for (let i = 0; i < muns.length; i++) cnt[Math.floor(rnd() * muns.length)]++;
    const e = estimar(zonas, ng, nc, grupos, zm.map((m) => cnt[m])); for (const gname of grupos) amostras[gname].push(e[gname].difCond); }
  const ic = {}; for (const gname of grupos) { const a = amostras[gname].sort((x, y) => x - y); ic[gname] = [a[Math.floor(0.025 * boot)], a[Math.ceil(0.975 * boot) - 1]]; }
  return { ponto, icDifCond: ic };
}

async function main() {
  await mkdir(SAIDA, { recursive: true });
  const { db, ponteiro } = await abrirLeitura();
  const out = { geradoEm: new Date().toISOString(), copia: ponteiro?.arquivo ?? null, turnos: {} };
  // agregadas: perfil do eleitorado das seções agregadas somado na principal
  const principal = { 1: new Map(), 2: new Map() };
  for (const a of db.prepare('SELECT turno, uf, municipio, zona, secao, secao_principal FROM secao_agregada').all()) principal[a.turno]?.set(`${a.uf}/${a.municipio}/${a.zona}/${a.secao}`, `${a.uf}/${a.municipio}/${a.zona}/${a.secao_principal}`);
  out.agregadas = { 1: principal[1].size, 2: principal[2].size };
  // perfil do eleitorado do Nordeste
  const perf = new Map();
  for (const uf of 'al ba ce ma pb pe pi rn se'.split(' ')) {
    let cab = null;
    for await (const l of createInterface({ input: createReadStream(path.join(DIR_DADOS, 'parsed', 'auditoria', 'forense', 'perfil', `${uf}.csv`)), crlfDelay: Infinity })) {
      const c = l.split(';'); if (!cab) { cab = c; continue; }
      const o = Object.fromEntries(cab.map((h, i) => [h, i < 4 ? c[i] : Number(c[i])])); perf.set(`${o.uf}/${o.municipio}/${o.zona}/${o.secao}`, o);
    }
  }
  for (const t of [2, 1]) {
    const t0 = Date.now();
    const { ctl, res, secoes } = await lerTurno(t);
    console.error(`turno ${t}: ${secoes.length} seções em ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    const o = { controle: ctl, regioes: res, permutacao: [] };
    // conferência dos votos com voto_oficial (só 2º turno tem)
    if (t === 2) {
      const of = new Map();
      for (const v of db.prepare('SELECT uf, municipio, zona, secao, numero, quantidade FROM voto_oficial WHERE turno = 2 AND cargo = 1 AND numero IN (13, 22)').all()) {
        const k = `${v.uf}/${v.municipio}/${v.zona}/${v.secao}`; const r = of.get(k) ?? [0, 0]; r[v.numero === 13 ? 0 : 1] += v.quantidade; of.set(k, r);
      }
      let dif = 0, ausente = 0; for (const s of secoes) { const r = of.get(s.k); if (!r) { ausente++; continue; } if (r[0] !== s.V13 || r[1] !== s.V22) dif++; }
      o.conferenciaVotoOficial = { secoesOficial: of.size, secoesPerfil: secoes.length, divergentes: dif, ausentesNoOficial: ausente };
    }
    for (const [def, reg] of [['L1', 'NE'], ['L2', 'NE'], ['L1', 'S'], ['L1', 'BR']]) o.permutacao.push(permut(secoes, def, REPS, 977 + t * 31 + def.length, reg === 'BR' ? null : reg));
    // ---------- regressão no Nordeste ----------
    const pf = new Map();
    for (const [k, p] of perf) { const kp = principal[t].get(k) ?? k; const s = pf.get(kp) ?? { eleitores: 0, biometria: 0, idade60: 0, idade16a24: 0, escol_baixa: 0, superior: 0, indigena: 0, quilombola: 0 }; for (const c of Object.keys(s)) s[c] += p[c]; pf.set(kp, s); }
    const ne = []; const desc = { ne: 0, menos20: 0, semPerfil: 0, semDetalhe: 0, semL1: 0, l1MaiorL2: 0 };
    for (const s of secoes) {
      if (s.r !== 'NE') continue; desc.ne++;
      if (s.comp < 20) { desc.menos20++; continue; }
      if (s.semBio === undefined) { desc.semDetalhe++; continue; }
      const p = pf.get(s.k); if (!p || p.eleitores < 20) { desc.semPerfil++; continue; }
      const L2 = s.semBio + s.porBiog; const M = s.hm;
      const e = p.eleitores;
      const X = [1 - p.biometria / e, p.idade60 / e, p.idade16a24 / e, p.escol_baixa / e, p.superior / e, p.indigena / e, p.quilombola / e, Math.log(e)];
      ne.push({ ...s, L2b: L2, M: M === undefined ? null : (M > L2 ? (desc.l1MaiorL2++, null) : M), X });
      if (M === undefined) desc.semL1++;
    }
    const mk = (def, ctrl) => ne.filter((s) => def !== 'L1' || s.M !== null).map((s) => {
      const n = s.comp; const B = s.porBio;
      if (def === 'L2') return { ...s, w: n, y: [s.V13 / n, s.V22 / n], x: [s.L2b / n, ...(ctrl ? s.X : [])], G: { L: s.L2b, B } };
      if (def === 'L1') return { ...s, w: n, y: [s.V13 / n, s.V22 / n], x: [s.M / n, (s.L2b - s.M) / n, ...(ctrl ? s.X : [])], G: { M: s.M, O: s.L2b - s.M, B } };
      return { ...s, w: n, y: [s.V13 / n, s.V22 / n], x: [s.M / n, ...(ctrl ? s.X : [])], G: { M: s.M, B: n - s.M } }; // L1 contra todo o resto
    });
    const nc = 8;
    o.regressaoNE = { descarte: desc,
      M1_L1_dois_grupos: rodarModelo(mk('L1x', false), 1, 0, ['M'], 0).ponto,
      M1_L1_tres_grupos: rodarModelo(mk('L1', false), 2, 0, ['M', 'O'], 0).ponto,
      M1_L2: rodarModelo(mk('L2', false), 1, 0, ['L'], 0).ponto,
      M2_L1: rodarModelo(mk('L1', true), 2, nc, ['M', 'O'], BOOT, 2026 + t),
      M2_L2: rodarModelo(mk('L2', true), 1, nc, ['L'], BOOT, 2027 + t),
      M2s_L2_semCadSemBio: rodarModelo(mk('L2', true).map((s) => ({ ...s, x: [s.x[0], ...s.x.slice(2)] })), 1, nc - 1, ['L'], 0).ponto,
    };
    out.turnos[t] = o;
  }
  const arq = path.join(SAIDA, 'liberacao-reproducao.json');
  await writeFile(arq, JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, (k, v) => (typeof v === 'number' && !Number.isInteger(v) ? +v.toFixed(4) : v), 1));
}
await main();
