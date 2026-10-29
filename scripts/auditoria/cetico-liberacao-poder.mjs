// Revisor cético, H13 (voto dos liberados sem biometria): PODER dos métodos 02, 03 e 04.
//
// Pergunta: se mesários tivessem habilitado eleitores ausentes e votado por eles (voto inserido, com liberação
// manual registrada), estes métodos teriam visto? Injeta fraude sintética nos dados REAIS do Nordeste,
// 2º turno, e refaz cada estatística confirmatória com a mesma especificação do método de origem.
//
// Fraude sintética "voto inserido com liberação do mesário": numa seção sorteada, +k comparecimento, +k L1
// (habilitados pelo mesário), +k L2 (por biografia) e +k votos para um lado (13 ou 22). O detalhamento fica
// coerente (é o que o BU e o log mostrariam). A seção real não muda em mais nada.
//
// Métodos refeitos (Nordeste, 2º turno; todas as seções que o método de origem usa):
//   02 limites: número de seções em que o limite inferior obriga votos no lado (min ≥ 1), com o nulo de
//      embaralhar a taxa de liberação dentro da zona (uf/zona), como em liberacao-limites-deterministicos.mjs.
//   03 ecológico: Goodman ponderado pelo comparecimento, efeito fixo de uf/município/zona, L1 em dois grupos
//      (M = mesário, O = outros sem digital) e L2 em um grupo; M1 sem controles e M2 com os controles do perfil
//      (sem dInd e dQuil, que exigem locais.csv; sem a soma das seções agregadas). Estatística: diferença
//      condicional difCond. Teste: z = est / EP, com o EP do bootstrap do próprio método 03
//      (ecologico-tabela.csv), Bonferroni sobre 4 (|z| > 2,498). Também o teste da variação 2º − 1º turno
//      (EP do delta), supondo fraude só no 2º turno.
//   04 painel: Δmargem ~ ΔC + ΔL + E1 + BN1 | zona (uf/município/zona), EP agrupado por município, como em
//      liberacao-entreturnos-painel.mjs. Teste: γ_margem, bilateral, α = 0,025 (|t| > 2,241).
//
// Uso: node --max-old-space-size=8192 scripts/auditoria/cetico-liberacao-poder.mjs [--reps 20] [--semente 7]
// Lê: data/parsed/auditoria/liberacao/{mesarios-secoes-2t.jsonl,entreturnos-painel.jsonl,ecologico-tabela.csv},
//     data/parsed/auditoria/forense/perfil/<uf>.csv. Sem banco, sem rede.
// Saída: data/parsed/auditoria/liberacao/cetico-poder.json
import { createReadStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { demeanar, mqo } from './biometria-comum.mjs';
import { lerTabela } from './forense-lib.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const DIR = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'liberacao');
const { values: opt } = parseArgs({ options: { reps: { type: 'string', default: '20' }, semente: { type: 'string', default: '7' } } });
const REPS = Number(opt.reps);
const NE = ['al', 'ba', 'ce', 'ma', 'pb', 'pe', 'pi', 'rn', 'se'];
const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${m}`);

function rng(semente) {
  let a = semente >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rand = rng(Number(opt.semente));
function sortearIndices(n, q) { // q índices distintos de 0..n-1
  const idx = Int32Array.from({ length: n }, (_, i) => i);
  for (let i = 0; i < q; i++) { const j = i + Math.floor(rand() * (n - i)); const x = idx[i]; idx[i] = idx[j]; idx[j] = x; }
  return idx.subarray(0, q);
}

// ---------------- dados ----------------
const perfil = new Map();
for (const uf of NE) {
  for (const p of await lerTabela(path.join(RAIZ, 'data', 'parsed', 'auditoria', 'forense', 'perfil', `${uf}.csv`),
    ['eleitores', 'biometria', 'idade60', 'idade16a24', 'escol_baixa', 'superior', 'indigena', 'quilombola'])) {
    perfil.set(`${p.uf}/${p.municipio}/${p.zona}/${p.secao}`, p);
  }
}
log(`perfil NE: ${perfil.size}`);

// seções do 2º turno do Nordeste (mesma fonte da conferência da síntese)
const sec = [];
const descarte = { lidas: 0, semBu: 0, semLog: 0, menos20: 0, semPerfil: 0, l1MaiorL2: 0 };
for await (const l of createInterface({ input: createReadStream(path.join(DIR, 'mesarios-secoes-2t.jsonl')), crlfDelay: Infinity })) {
  if (!l) continue;
  const r = JSON.parse(l);
  if (!NE.includes(r.uf)) continue;
  descarte.lidas++;
  if (!r.bu) { descarte.semBu++; continue; }
  if (!r.log) { descarte.semLog++; continue; }
  const k = `${r.uf}/${r.m}/${r.z}/${r.s}`;
  const n = r.comp;
  const T = r.v13 + r.v22 + (r.br ?? 0) + (r.nu ?? 0);
  const L2 = r.bu.semBio + r.bu.porBiog;
  const M = r.log.hm;
  sec.push({ k, uf: r.uf, zonaLim: `${r.uf}/${r.z}`, zonaEco: `${r.uf}/${r.m}/${r.z}`, mun: `${r.uf}/${r.m}`, n, T, B: r.bu.porBio, L2, M, v13: r.v13, v22: r.v22, logVotos: r.log.votos, pf: perfil.get(k) });
}
log(`seções NE 2º turno: ${sec.length}`);

// ---------------- método 02: limites ----------------
function forcadas(lista, lado, delta) { // delta: Map idx → {k, lado}
  let c = 0;
  for (let i = 0; i < lista.length; i++) {
    const s = lista[i];
    const d = delta?.get(i);
    const T = s.T + (d ? d.k : 0), L = s.M + (d ? d.k : 0);
    const V = (lado === 13 ? s.v13 : s.v22) + (d && d.lado === lado ? d.k : 0);
    if (L - (T - V) >= 1) c++;
  }
  return c;
}
const lim = sec.filter((s) => s.logVotos === s.T && s.M <= s.T);
function nuloLimites(lista, lado, delta, reps) {
  const porZona = new Map();
  lista.forEach((s, i) => { if (!porZona.has(s.zonaLim)) porZona.set(s.zonaLim, []); porZona.get(s.zonaLim).push(i); });
  const vals = [];
  for (let r = 0; r < reps; r++) {
    let c = 0;
    for (const ii of porZona.values()) {
      const taxas = ii.map((i) => { const d = delta?.get(i); return (lista[i].M + (d ? d.k : 0)) / (lista[i].T + (d ? d.k : 0)); });
      for (let a = taxas.length - 1; a > 0; a--) { const b = Math.floor(rand() * (a + 1)); [taxas[a], taxas[b]] = [taxas[b], taxas[a]]; }
      ii.forEach((i, j) => {
        const s = lista[i]; const d = delta?.get(i);
        const T = s.T + (d ? d.k : 0);
        const V = (lado === 13 ? s.v13 : s.v22) + (d && d.lado === lado ? d.k : 0);
        const L = Math.min(T, Math.round(taxas[j] * T));
        if (L - (T - V) >= 1) c++;
      });
    }
    vals.push(c);
  }
  const m = vals.reduce((a, b) => a + b, 0) / reps;
  const sd = Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / (reps - 1));
  return { esperado: +m.toFixed(1), dp: +sd.toFixed(1) };
}

// ---------------- método 03: ecológico ----------------
const CTRL = ['cadSemBio', 'p60', 'p16a24', 'pBaixa', 'pSup', 'pInd', 'pQuil', 'logEle'];
const eco = sec.filter((s) => s.n >= 20 && s.pf && s.pf.eleitores >= 20 && s.M <= s.L2 && s.B + s.L2 === s.n);
descarte.ecoUsadas = eco.length;
for (const s of eco) {
  const p = s.pf, e = p.eleitores;
  s.X = [1 - p.biometria / e, p.idade60 / e, p.idade16a24 / e, p.escol_baixa / e, p.superior / e, p.indigena / e, p.quilombola / e, Math.log(e)];
}
const zonasEco = new Map();
eco.forEach((s, i) => { if (!zonasEco.has(s.zonaEco)) zonasEco.set(s.zonaEco, []); zonasEco.get(s.zonaEco).push(i); });

function resolver(A, b, k) {
  const M = Array.from({ length: k }, (_, i) => [...A.slice(i * k, i * k + k), b[i]]);
  for (let c = 0; c < k; c++) {
    let p = c;
    for (let r = c + 1; r < k; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < k; r++) { if (r === c) continue; const f = M[r][c] / M[c][c]; if (f) for (let j = c; j <= k; j++) M[r][j] -= f * M[c][j]; }
  }
  return M.map((l, i) => l[k] / l[i]);
}

/** difCond do primeiro grupo de liberados (M em L1, L em L2), M1 ou M2. delta: Map idx → {k, lado}. */
function ecologico(def, spec, delta) {
  const nx = def === 'L1' ? 2 : 1;
  const nc = spec === 'M2' ? CTRL.length : 0;
  const k = nx + nc;
  const linha = (s, d) => {
    const add = d ? d.k : 0;
    const n = s.n + add, M = s.M + add, L2 = s.L2 + add;
    const v13 = s.v13 + (d && d.lado === 13 ? add : 0), v22 = s.v22 + (d && d.lado === 22 ? add : 0);
    const x = def === 'L1' ? [M / n, (L2 - M) / n] : [L2 / n];
    return { n, G: def === 'L1' ? M : L2, y: [v13 / n, v22 / n], x, c: spec === 'M2' ? s.X : [] };
  };
  const A = new Float64Array(k * k), b13 = new Float64Array(k), b22 = new Float64Array(k);
  const cache = new Array(eco.length);
  const zm = new Map();
  for (const [z, ii] of zonasEco) {
    const m = new Float64Array(2 + k); let W = 0;
    for (const i of ii) {
      const r = linha(eco[i], delta?.get(i)); cache[i] = r;
      const v = [...r.y, ...r.x, ...r.c];
      for (let j = 0; j < v.length; j++) m[j] += r.n * v[j];
      W += r.n;
    }
    for (let j = 0; j < m.length; j++) m[j] /= W;
    zm.set(z, m);
    for (const i of ii) {
      const r = cache[i];
      const X = [...r.x, ...r.c].map((v, j) => v - m[2 + j]);
      const y = [r.y[0] - m[0], r.y[1] - m[1]];
      for (let a = 0; a < k; a++) { const wa = r.n * X[a]; b13[a] += wa * y[0]; b22[a] += wa * y[1]; for (let c = 0; c < k; c++) A[a * k + c] += wa * X[c]; }
    }
  }
  const be = [resolver(A, b13, k), resolver(A, b22, k)];
  // níveis: base da seção = ȳ_z − β_x·x̄_z + β_c·(c − c̄_z); grupo = base + β do grupo; média ponderada pelo tamanho do grupo
  let S = 0; const base = [0, 0];
  for (const [z, ii] of zonasEco) {
    const m = zm.get(z);
    for (const i of ii) {
      const r = cache[i];
      if (!r.G) continue;
      for (let c = 0; c < 2; c++) {
        let v = m[c];
        for (let j = 0; j < nx; j++) v -= be[c][j] * m[2 + j];
        for (let j = 0; j < nc; j++) v += be[c][nx + j] * (r.c[j] - m[2 + nx + j]);
        base[c] += r.G * v;
      }
      S += r.G;
    }
  }
  base[0] /= S; base[1] /= S;
  const share = [base[0] + be[0][0], base[1] + be[1][0]];
  const tp = ([a, c]) => a / (a + c);
  return { difCond: tp(share) - tp(base), tpLib: tp(share), tpBase: tp(base), S };
}

// EP do bootstrap do método 03 (Nordeste)
const tab = (await readFile(path.join(DIR, 'ecologico-tabela.csv'), 'utf8')).split('\n').map((l) => l.split(';'));
const epDe = (modelo, def, spec, grupo) => { const r = tab.find((c) => c[0] === 'Nordeste' && c[1] === modelo && c[2] === def && c[3] === spec && c[4] === grupo && c[5] === 'difCond'); return r ? { est: +r[6], ep: +r[7] } : null; };
const EP = {};
for (const def of ['L1', 'L2']) for (const spec of ['M1', 'M2']) {
  const g = def === 'L1' ? 'M' : 'L';
  EP[`${def}|${spec}`] = { '2t': epDe('2t', def, spec, g), delta: epDe('delta2t1t', def, spec, g) };
}
const Z_ECO = 2.4977; // Bonferroni sobre 4, bilateral
const Phi = (z) => 0.5 * (1 + Math.sign(z) * Math.sqrt(1 - Math.exp(-2 * z * z / Math.PI))); // aproximação (erro < 0,002)

// ---------------- método 04: painel ----------------
const painel = [];
for await (const l of createInterface({ input: createReadStream(path.join(DIR, 'entreturnos-painel.jsonl')), crlfDelay: Infinity })) {
  if (!l) continue;
  const r = JSON.parse(l);
  if (r.reg !== 'Nordeste') continue;
  painel.push(r);
}
const pIdx = new Map(); // chave da seção → índice no painel
painel.forEach((r, i) => pIdx.set(`${r.uf}/${r.mun}/${r.zona}/${r.secao}`, i));
const zonaP = painel.map((r) => `${r.uf}/${r.mun}/${r.zona}`);
const munP = painel.map((r) => `${r.uf}/${r.mun}`);
const ufP = painel.map((r) => r.uf);
log(`painel NE: ${painel.length}`);
const Z_PAINEL = 2.2414;

/** delta2: Map idx → {k, lado} aplicado ao 2º turno; delta1: idem no 1º turno. */
function painelFit(L, delta2, delta1, grupos = zonaP) {
  const n = painel.length;
  const dm = new Float64Array(n), dC = new Float64Array(n), dL = new Float64Array(n), E1 = new Float64Array(n), BN1 = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const r = painel[i]; const a = delta1?.get(i); const b = delta2?.get(i);
    const ka = a ? a.k : 0, kb = b ? b.k : 0;
    const m1 = (r.v13_1 - r.v22_1) + (a ? (a.lado === 13 ? ka : -ka) : 0);
    const m2 = (r.v13_2 - r.v22_2) + (b ? (b.lado === 13 ? kb : -kb) : 0);
    dm[i] = m2 - m1; dC[i] = (r.C2 + kb) - (r.C1 + ka);
    dL[i] = L === 'L1' ? (r.M2 + kb) - (r.M1 + ka) : (r.SB2 + r.PG2 + kb) - (r.SB1 + r.PG1 + ka);
    E1[i] = r.E1; BN1[i] = r.BN1 + 0; // E1 e BN1 do 1º turno: a fraude do 1º turno aumentaria E1 só se fosse para outro candidato
  }
  const [y, ...X] = demeanar([dm, dC, dL, E1, BN1], grupos);
  const fit = mqo(y, X, ['dC', 'dL', 'E1', 'BN1'], munP);
  const g = fit.coef.dL, den = 1 - fit.coef.dC.beta;
  return { gamma: g.beta, ep: g.ep, t: g.beta / g.ep, f: g.beta / den, rejeita: Math.abs(g.beta / g.ep) > Z_PAINEL };
}

// ---------------- cenários ----------------
const nNE = sec.length;
function cenario(nome, gerar) { return { nome, gerar }; }
const porTaxaL1 = [...sec.keys()].sort((a, b) => sec[b].M / sec[b].n - sec[a].M / sec[a].n);
const zonasLista = [...new Set(sec.map((s) => s.zonaEco))];
const CENARIOS = [
  cenario('2% das seções, +10 liberações, todas no 13', () => ({ idx: sortearIndices(nNE, Math.round(0.02 * nNE)), k: 10, lado: 13 })),
  cenario('2% das seções, +10 liberações, todas no 22', () => ({ idx: sortearIndices(nNE, Math.round(0.02 * nNE)), k: 10, lado: 22 })),
  cenario('5% das seções, +10, no 13', () => ({ idx: sortearIndices(nNE, Math.round(0.05 * nNE)), k: 10, lado: 13 })),
  cenario('10% das seções, +10, no 13', () => ({ idx: sortearIndices(nNE, Math.round(0.10 * nNE)), k: 10, lado: 13 })),
  cenario('20% das seções, +10, no 13', () => ({ idx: sortearIndices(nNE, Math.round(0.20 * nNE)), k: 10, lado: 13 })),
  cenario('2% das seções, +30, no 13 (mesário corrupto concentrado)', () => ({ idx: sortearIndices(nNE, Math.round(0.02 * nNE)), k: 30, lado: 13 })),
  cenario('2% das seções que já mais liberam (taxa L1), +10, no 13', () => ({ idx: Int32Array.from(porTaxaL1.slice(0, Math.round(0.02 * nNE))), k: 10, lado: 13 })),
  cenario('todas as seções de 10% das zonas, +10, no 13 (fraude de zona inteira)', () => {
    const zs = new Set([...sortearIndices(zonasLista.length, Math.round(0.10 * zonasLista.length))].map((i) => zonasLista[i]));
    return { idx: Int32Array.from([...sec.keys()].filter((i) => zs.has(sec[i].zonaEco))), k: 10, lado: 13 };
  }),
  cenario('todas as seções, +3, no 13 (fraude espalhada por igual)', () => ({ idx: Int32Array.from(sec.keys()), k: 3, lado: 13 })),
  cenario('todas as seções, +10, no 13 (fraude espalhada por igual)', () => ({ idx: Int32Array.from(sec.keys()), k: 10, lado: 13 })),
  cenario('10% das seções de maior % de escolaridade baixa, +10, no 13 (fraude alinhada ao perfil)', () => {
    const comPf = [...sec.keys()].filter((i) => sec[i].pf?.eleitores > 0).sort((a, b) => sec[b].pf.escol_baixa / sec[b].pf.eleitores - sec[a].pf.escol_baixa / sec[a].pf.eleitores);
    return { idx: Int32Array.from(comPf.slice(0, Math.round(0.10 * nNE))), k: 10, lado: 13 };
  }),
];

const ecoPos = new Map(eco.map((s, i) => [s.k, i]));
const limPos = new Map(lim.map((s, i) => [s.k, i]));
function mapear(inj, pos, lista) { // inj sobre sec → Map no índice da lista
  const m = new Map();
  for (const i of inj.idx) { const j = pos.get(sec[i].k); if (j !== undefined) m.set(j, { k: inj.k, lado: inj.lado }); }
  return m;
}

const saida = { geradoEm: new Date().toISOString(), reps: REPS, semente: Number(opt.semente), descarte, secoesNE: nNE, painelNE: painel.length, base: {}, cenarios: [] };

// linha de base (sem injeção): reprodução
saida.base.limites = { forcadas13: forcadas(lim, 13), forcadas22: forcadas(lim, 22), nulo13: nuloLimites(lim, 13, null, 30), nulo22: nuloLimites(lim, 22, null, 30), secoes: lim.length };
for (const def of ['L1', 'L2']) for (const spec of ['M1', 'M2']) saida.base[`eco_${def}_${spec}`] = ecologico(def, spec, null);
for (const L of ['L1', 'L2']) saida.base[`painel_${L}`] = painelFit(L, null, null);
log(`base: ${JSON.stringify(saida.base)}`);

for (const c of CENARIOS) {
  const reps = c.nome.startsWith('2% das seções que') || c.nome.startsWith('todas as seções, +') || c.nome.startsWith('10% das seções de maior') ? 1 : REPS;
  const acum = { votos: [], lim13: [], lim22: [], eco: {}, painel: {}, painelAmbos: {} };
  for (let r = 0; r < reps; r++) {
    const inj = c.gerar();
    acum.votos.push(inj.idx.length * inj.k);
    const dLim = mapear(inj, limPos, lim);
    acum.lim13.push(forcadas(lim, 13, dLim)); acum.lim22.push(forcadas(lim, 22, dLim));
    const dEco = mapear(inj, ecoPos, eco);
    for (const def of ['L1', 'L2']) for (const spec of ['M1', 'M2']) {
      const key = `${def}_${spec}`;
      const e = ecologico(def, spec, dEco);
      (acum.eco[key] ??= []).push(e.difCond);
    }
    const dP = mapear(inj, pIdx, painel);
    for (const L of ['L1', 'L2']) {
      (acum.painel[L] ??= []).push(painelFit(L, dP, null));
      if (r === 0) { acum.painelAmbos[L] = painelFit(L, dP, dP); (acum.painelUF ??= {})[L] = painelFit(L, dP, null, ufP); } // mesma fraude nos dois turnos; efeito fixo de UF
    }
  }
  const media = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const res = { cenario: c.nome, reps, votosInseridos: Math.round(media(acum.votos)), limites: {}, ecologico: {}, painel: {} };
  // limites
  const nulo = c.nome.includes('22') ? null : null;
  res.limites = { forcadas13: media(acum.lim13), forcadas22: media(acum.lim22), acrescimo13: media(acum.lim13) - saida.base.limites.forcadas13, acrescimo22: media(acum.lim22) - saida.base.limites.forcadas22 };
  // ecológico: deslocamento e detecção
  for (const [key, vals] of Object.entries(acum.eco)) {
    const [def, spec] = key.split('_');
    const b = saida.base[`eco_${key}`].difCond;
    const ep = EP[`${def}|${spec}`];
    const desl = media(vals) - b;
    const est2t = ep['2t'].est + desl; // estimativa publicada + deslocamento causado pela fraude
    const estD = ep.delta ? ep.delta.est + desl : null;
    res.ecologico[key] = {
      deslocamentoPontos: +(100 * desl).toFixed(3),
      z2t: +(est2t / ep['2t'].ep).toFixed(2), detecta2t: Math.abs(est2t / ep['2t'].ep) > Z_ECO,
      zDelta: estD == null ? null : +(estD / ep.delta.ep).toFixed(2), detectaDelta: estD == null ? null : Math.abs(estD / ep.delta.ep) > Z_ECO,
      poder2tSeNuloCentrado: +(Phi(Math.abs(desl) / ep['2t'].ep - Z_ECO)).toFixed(3),
      poderDeltaSeNuloCentrado: ep.delta ? +(Phi(Math.abs(desl) / ep.delta.ep - Z_ECO)).toFixed(3) : null,
    };
  }
  for (const [L, fits] of Object.entries(acum.painel)) {
    res.painel[L] = {
      gammaMedio: +media(fits.map((f) => f.gamma)).toPrecision(4), tMedio: +media(fits.map((f) => f.t)).toFixed(2),
      fMedio: +media(fits.map((f) => f.f)).toFixed(4), fracaoRejeita: +(fits.filter((f) => f.rejeita).length / fits.length).toFixed(2),
      mesmaFraudeNosDoisTurnos: { t: +acum.painelAmbos[L].t.toFixed(2), rejeita: acum.painelAmbos[L].rejeita },
      efeitoFixoUF: { t: +acum.painelUF[L].t.toFixed(2), f: +acum.painelUF[L].f.toFixed(4), rejeita: acum.painelUF[L].rejeita },
    };
  }
  void nulo;
  saida.cenarios.push(res);
  log(`${c.nome}: ${JSON.stringify(res)}`);
}

// nulo dos limites sob o cenário pedido (2%, +10, 13 e 22): esperado e DP do embaralhamento na zona
{
  const inj = CENARIOS[0].gerar();
  const d = mapear(inj, limPos, lim);
  saida.limitesCenario2pct = { forcadas13: forcadas(lim, 13, d), nulo13: nuloLimites(lim, 13, d, 30) };
  const inj22 = CENARIOS[1].gerar();
  const d22 = mapear(inj22, limPos, lim);
  saida.limitesCenario2pct22 = { forcadas22: forcadas(lim, 22, d22), nulo22: nuloLimites(lim, 22, d22, 30) };
}

// varredura de tamanho mínimo detectável (método 04, L1; método 03, M2 L1, delta): 1 sorteio por ponto
saida.varredura = [];
for (const p of [0.02, 0.05, 0.1, 0.2, 0.3, 0.5]) {
  const inj = { idx: sortearIndices(nNE, Math.round(p * nNE)), k: 10, lado: 13 };
  const pf = painelFit('L1', mapear(inj, pIdx, painel), null);
  const e = ecologico('L1', 'M2', mapear(inj, ecoPos, eco));
  const desl = e.difCond - saida.base.eco_L1_M2.difCond;
  saida.varredura.push({ fracaoSecoes: p, votosInseridos: inj.idx.length * 10, painelL1_t: +pf.t.toFixed(2), painelL1_f: +pf.f.toFixed(4), ecoM2L1_desloc: +(100 * desl).toFixed(2), ecoM2L1_z2t: +((EP['L1|M2']['2t'].est + desl) / EP['L1|M2']['2t'].ep).toFixed(2), ecoM2L1_zDelta: +((EP['L1|M2'].delta.est + desl) / EP['L1|M2'].delta.ep).toFixed(2) });
  log(`varredura ${p}: ${JSON.stringify(saida.varredura.at(-1))}`);
}

// votos inseridos (só no 2º turno, seções sorteadas) que o painel L1 precisa para t = 3,08
// (80% de poder com α = 0,025 bilateral), por tamanho k da fraude por seção. 1 sorteio por ponto.
saida.votosMinimosPainel = [];
for (const k of [1, 3, 10, 30]) {
  const pontos = [];
  for (const p of [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.4, 0.8]) {
    const inj = { idx: sortearIndices(nNE, Math.round(p * nNE)), k, lado: 13 };
    const pf = painelFit('L1', mapear(inj, pIdx, painel), null);
    const e = ecologico('L1', 'M2', mapear(inj, ecoPos, eco));
    const desl = e.difCond - saida.base.eco_L1_M2.difCond;
    pontos.push({ fracaoSecoes: p, votos: inj.idx.length * k, painelT: +pf.t.toFixed(2), painelF: +pf.f.toFixed(4), ecoM2desloc: +(100 * desl).toFixed(2), ecoM2zCentrado: +(desl / EP['L1|M2']['2t'].ep).toFixed(2) });
  }
  // interpolação linear do t do painel acima do valor de base até 3,08 de diferença sobre o t de base
  const tb = saida.base.painel_L1.t;
  const alvo = pontos.find((q) => q.painelT - tb >= 3.08);
  saida.votosMinimosPainel.push({ k, pontos, primeiroPontoComDeltaT308: alvo ?? null });
  log(`k=${k}: ${JSON.stringify(pontos)}`);
}

await writeFile(path.join(DIR, 'cetico-poder.json'), `${JSON.stringify(saida, null, 1)}\n`);
log(`gravado ${path.join(DIR, 'cetico-poder.json')}`);
