// Estatístico eleitoral: funções comuns (docs/analysis/estatistico-eleitoral/).
// Reaproveita a leitura de CSV e as distribuições de forense-lib.mjs; acrescenta regressão com efeito fixo absorvido
// e erro-padrão agrupado, Benjamini-Hochberg, cauda normal e o modelo de referência de Δcomparecimento por zona.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { RAIZ, lerTabela } from './forense-lib.mjs';

export const DIR_SAIDA = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'estatistico-eleitoral');

export async function salvar(nome, conteudo) {
  await mkdir(DIR_SAIDA, { recursive: true });
  const arquivo = path.join(DIR_SAIDA, nome);
  await writeFile(arquivo, typeof conteudo === 'string' ? conteudo : JSON.stringify(conteudo, null, 1));
  return arquivo;
}

export const COLUNAS_ABERTOS = ['uf', 'municipio', 'zona', 'secao', 'local1', 'local2', 'modelo1', 'modelo2',
  'a1', 'c1', 'v13_1', 'v22_1', 'out1', 'bn1', 'a2', 'c2', 'v13_2', 'v22_2', 'out2', 'bn2'];
export const COLUNAS_BANCO = [...COLUNAS_ABERTOS, 'sb1', 'pb1', 'pg1', 'sb2', 'pb2', 'pg2', 'urna1', 'urna2',
  'hpm1', 'hpm2', 'anb1', 'anb2', 'dpc1', 'dpc2', 'jv1', 'jv2', 'nmes1', 'nmes2', 'mesa_comum', 'pres_igual',
  'libmax1', 'libmax2', 'secoes_mesario1', 'secoes_mesario2', 'perfil1', 'perfil2'];
const TEXTO = new Set(['uf', 'municipio', 'zona', 'secao', 'modelo1', 'modelo2']);

/** Lê o arquivo de pares gerado por estatistico-pares.mjs (`abertos` ou `banco`). */
export async function lerPares(fonte) {
  const cols = fonte === 'banco' ? COLUNAS_BANCO : COLUNAS_ABERTOS;
  return lerTabela(path.join(DIR_SAIDA, `pares-${fonte}.csv`), cols.filter((c) => !TEXTO.has(c)));
}

export const REGIAO = {
  ac: 'N', am: 'N', ap: 'N', pa: 'N', ro: 'N', rr: 'N', to: 'N',
  al: 'NE', ba: 'NE', ce: 'NE', ma: 'NE', pb: 'NE', pe: 'NE', pi: 'NE', rn: 'NE', se: 'NE',
  df: 'CO', go: 'CO', ms: 'CO', mt: 'CO', es: 'SE', mg: 'SE', rj: 'SE', sp: 'SE', pr: 'S', rs: 'S', sc: 'S', zz: 'EX',
};

// ---------- testes ----------

/** Benjamini-Hochberg: valores-q na mesma ordem dos valores-p. */
export function bh(ps) {
  const m = ps.length;
  const ordem = ps.map((p, i) => [p, i]).sort((a, b) => a[0] - b[0]);
  const q = new Array(m);
  let min = 1;
  for (let k = m - 1; k >= 0; k--) {
    const [p, i] = ordem[k];
    min = Math.min(min, (p * m) / (k + 1));
    q[i] = min;
  }
  return q;
}

/** erfc (Numerical Recipes, erro < 1,2e-7). */
export function erfc(x) {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 +
    t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}
/** P(|Z| ≥ |z|) e P(Z ≥ z) da normal padrão. */
export const pNormal2 = (z) => erfc(Math.abs(z) / Math.SQRT2);
export const pNormalSup = (z) => 0.5 * erfc(z / Math.SQRT2);

// ---------- regressão com efeito fixo absorvido e EP agrupado ----------

function inverter(M) {
  const n = M.length;
  const A = M.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    const d = A[c][c];
    if (Math.abs(d) < 1e-300) throw new Error('matriz singular');
    for (let j = 0; j < 2 * n; j++) A[c][j] /= d;
    for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c]; for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[c][j]; }
  }
  return A.map((r) => r.slice(n));
}

/**
 * MQ ponderado com um efeito fixo absorvido (média ponderada do grupo subtraída de y e de cada x) e EP agrupado
 * (CR1, ajuste G/(G−1)·(n−1)/(n−k)). `x(s)` devolve o vetor de preditores (sem constante quando há efeito fixo).
 * Grupos com uma única seção saem (não informam a inclinação).
 */
export function mqEfeitoFixo(lista, { y, x, w = () => 1, grupo = null, cluster, scores = false }) {
  let linhas = lista.map((s) => ({ s, y: y(s), x: x(s), w: w(s), g: grupo ? grupo(s) : 0 }))
    .filter((l) => Number.isFinite(l.y) && l.x.every(Number.isFinite) && l.w > 0);
  const k = linhas[0]?.x.length ?? 0;
  if (grupo) {
    const acc = new Map();
    for (const l of linhas) {
      let a = acc.get(l.g);
      if (!a) { a = { w: 0, y: 0, x: new Float64Array(k), n: 0 }; acc.set(l.g, a); }
      a.w += l.w; a.y += l.w * l.y; a.n++;
      for (let j = 0; j < k; j++) a.x[j] += l.w * l.x[j];
    }
    linhas = linhas.filter((l) => acc.get(l.g).n > 1);
    for (const l of linhas) {
      const a = acc.get(l.g);
      l.y -= a.y / a.w;
      l.x = l.x.map((v, j) => v - a.x[j] / a.w);
    }
  }
  const n = linhas.length;
  if (n <= k + 1) return null;
  const XtX = Array.from({ length: k }, () => new Array(k).fill(0));
  const Xty = new Array(k).fill(0);
  for (const l of linhas) for (let a = 0; a < k; a++) { Xty[a] += l.w * l.x[a] * l.y; for (let c = 0; c < k; c++) XtX[a][c] += l.w * l.x[a] * l.x[c]; }
  let inv;
  try { inv = inverter(XtX); } catch { return null; }
  const b = inv.map((r) => r.reduce((acc, v, j) => acc + v * Xty[j], 0));
  const cl = new Map();
  let ssr = 0, sw = 0;
  for (const l of linhas) {
    const e = l.y - l.x.reduce((acc, v, j) => acc + v * b[j], 0);
    ssr += l.w * e * e; sw += l.w;
    const c = cluster(l.s);
    let g = cl.get(c);
    if (!g) { g = new Float64Array(k); cl.set(c, g); }
    for (let a = 0; a < k; a++) g[a] += l.w * l.x[a] * e;
  }
  const G = cl.size;
  const meat = Array.from({ length: k }, () => new Array(k).fill(0));
  for (const g of cl.values()) for (let a = 0; a < k; a++) for (let c = 0; c < k; c++) meat[a][c] += g[a] * g[c];
  const fator = G > 1 ? (G / (G - 1)) * ((n - 1) / (n - k)) : NaN;
  const V = inv.map((r, a) => inv.map((_, c) => fator * r.reduce((acc, v, j) => acc + v * meat[j].reduce((s2, m, l2) => s2 + m * inv[l2][c], 0), 0)));
  const ep = V.map((r, i) => Math.sqrt(r[i]));
  // scores = true: devolve também inv(X'WX) e Σ w·x·e por conglomerado (influência de um conglomerado: Δb ≈ −inv · score_g)
  return { b, ep, V, n, G, k, rmse: Math.sqrt(ssr / sw), ...(scores ? { inv, scoresPorCluster: cl } : {}) };
}

/** Diferença b[i] − b[j] com EP pelo V do ajuste. */
export function diferenca(aj, i, j) {
  const d = aj.b[i] - aj.b[j];
  const ep = Math.sqrt(aj.V[i][i] + aj.V[j][j] - 2 * aj.V[i][j]);
  return { d, ep, t: d / ep };
}

/** |z| tal que P(|Z| ≥ |z|) = p (bissecção sobre pNormal2). Ex.: limiar de Bonferroni para m testes = zBilateral(0,05/m). */
export function zBilateral(p) {
  let lo = 0, hi = 40;
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (pNormal2(m) > p) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

// ---------- categorias de habilitação (BU) e teste E2 ----------

/**
 * Δ das categorias de habilitação do BU entre os turnos: s.dsb (sem biometria cadastrada), s.dpb (por biometria),
 * s.dpg (liberado por ano de nascimento). s.temBio = 0 quando o BU de um dos turnos não traz o detalhamento
 * (exterior: urna sem detalhamento); nessas seções os Δ ficam null (antes, null − null virava 0 e o exterior
 * entrava nas regressões com Δcategoria = 0; parecer cético 22, problema 2).
 */
export function prepararBiometria(P) {
  for (const s of P) {
    s.temBio = s.sb1 != null && s.pb1 != null && s.pg1 != null && s.sb2 != null && s.pb2 != null && s.pg2 != null ? 1 : 0;
    s.dsb = s.temBio ? s.sb2 - s.sb1 : null;
    s.dpb = s.temBio ? s.pb2 - s.pb1 : null;
    s.dpg = s.temBio ? s.pg2 - s.pg1 : null;
  }
}

export const GANHOS = [['ganho13', (s) => (s.v13_2 - s.v13_1) / s.c1], ['ganho22', (s) => (s.v22_2 - s.v22_1) / s.c1]];

/**
 * Teste E2 (cientista político, cético 06): o eleitor a mais habilitado sem biometria divide o voto entre 13 e 22
 * como o eleitor a mais habilitado por biometria?
 *   ganho do finalista / c1 ~ Δpor biometria / c1 + Δsem biometria (cadastro + ano de nascimento) / c1
 *                             + eliminados do 1º / c1 + brancos e nulos do 1º / c1  [+ controles]
 * com efeito fixo `grupo` (UF, município ou zona), peso c1, EP agrupado por `cluster`, só seções com temBio e c1 ≥ minC1.
 * separar = true: "sem biometria cadastrada" e "ano de nascimento" em colunas próprias.
 * Devolve valores sem arredondar: d = coeficiente sem biometria − por biometria (H0: d = 0).
 */
export function testeE2(lista, { separar = false, grupo = (s) => s.zon, cluster = (s) => s.mun, minC1 = 20, controles = null } = {}) {
  const base = separar
    ? (s) => [s.dpb / s.c1, s.dsb / s.c1, s.dpg / s.c1, s.out1 / s.c1, s.bn1 / s.c1]
    : (s) => [s.dpb / s.c1, (s.dsb + s.dpg) / s.c1, s.out1 / s.c1, s.bn1 / s.c1];
  const x = controles ? (s) => [...base(s), ...controles(s)] : base;
  const l = lista.filter((s) => s.temBio && s.c1 >= minC1);
  const out = { secoes: 0, municipios: 0, totais: { dSemBiometria: 0, dAnoNascimento: 0, dPorBiometria: 0, dSemBioPositivo: 0, semBiometria2t: 0 } };
  for (const s of l) {
    out.totais.dSemBiometria += s.dsb; out.totais.dAnoNascimento += s.dpg; out.totais.dPorBiometria += s.dpb;
    out.totais.dSemBioPositivo += Math.max(s.dsb + s.dpg, 0); out.totais.semBiometria2t += s.sb2;
  }
  for (const [nome, y] of GANHOS) {
    const a = mqEfeitoFixo(l, { y, x, w: (s) => s.c1, grupo, cluster });
    if (!a) continue;
    out.secoes = a.n; out.municipios = a.G;
    if (separar) {
      const d1 = diferenca(a, 1, 0), d2 = diferenca(a, 2, 0);
      out[nome] = { porBiometria: a.b[0], semBiometriaCadastrada: a.b[1], anoNascimento: a.b[2], cadastroMenosBio: d1, anoMenosBio: d2 };
    } else {
      const d = diferenca(a, 1, 0);
      out[nome] = { porBiometria: a.b[0], semBiometria: a.b[1], d: d.d, ep: d.ep, t: d.t };
    }
  }
  return out;
}

// ---------- modelo de referência do Δcomparecimento ----------

/**
 * Modelo de transição por zona: c2 = r·c1 + s·(a2 − c1), com r = taxa de permanência (quem votou no 1º volta)
 * e s = taxa de retorno (quem faltou no 1º vota no 2º). r e s saem de MQ por zona (seções com aptos ≥ 20);
 * zonas com menos de 15 seções, ou com r/s fora de [0, 1], usam o r do município ou da UF e recalculam s pela média.
 * Isso inclui a regressão à média (quem teve comparecimento baixo no 1º sobe mais) no esperado.
 * Devolve, por seção, o esperado, o resíduo (eleitores) e a variância binomial do modelo.
 */
export function ajustarTransicao(pares) {
  const grupos = (f) => {
    const m = new Map();
    for (const s of pares) { const k = f(s); if (!m.has(k)) m.set(k, []); m.get(k).push(s); }
    return m;
  };
  const mq2 = (lista) => {
    // c2 = r·c1 + s·(a2 − c1), sem constante
    let xx = 0, xz = 0, zz = 0, xy = 0, zy = 0;
    for (const s of lista) {
      const x = s.c1, z = Math.max(s.a2 - s.c1, 0), y = s.c2;
      xx += x * x; xz += x * z; zz += z * z; xy += x * y; zy += z * y;
    }
    const det = xx * zz - xz * xz;
    if (!(det > 0)) return null;
    return { r: (xy * zz - zy * xz) / det, s: (zy * xx - xy * xz) / det };
  };
  const sDado = (lista, r) => {
    let num = 0, den = 0;
    for (const s of lista) { num += s.c2 - r * s.c1; den += Math.max(s.a2 - s.c1, 0); }
    return den > 0 ? Math.min(Math.max(num / den, 0), 1) : 0;
  };
  const ok = (f) => f && f.r > 0 && f.r <= 1 && f.s >= 0 && f.s < 1;
  const rUf = new Map();
  for (const [uf, l] of grupos((s) => s.uf)) { const f = mq2(l); rUf.set(uf, ok(f) ? f.r : 0.95); }
  const rMun = new Map();
  for (const [m, l] of grupos((s) => `${s.uf}|${s.municipio}`)) { const f = l.length >= 15 ? mq2(l) : null; rMun.set(m, ok(f) ? f.r : rUf.get(l[0].uf)); }
  const zonas = new Map();
  let proprias = 0, herdadas = 0;
  for (const [z, l] of grupos((s) => `${s.uf}|${s.zona}`)) {
    const f = l.length >= 15 ? mq2(l) : null;
    let r, sv;
    if (ok(f)) { r = f.r; sv = f.s; proprias++; } else {
      // a zona pode ter vários municípios: usa o r do município mais frequente
      const cont = new Map();
      for (const s of l) cont.set(s.municipio, (cont.get(s.municipio) ?? 0) + 1);
      const mun = [...cont.entries()].sort((a, b) => b[1] - a[1])[0][0];
      r = rMun.get(`${l[0].uf}|${mun}`); sv = sDado(l, r); herdadas++;
    }
    zonas.set(z, { r, s: sv, secoes: l.length });
    for (const s of l) {
      const ab1 = Math.max(s.a2 - s.c1, 0);
      s.esp2 = r * s.c1 + sv * ab1;
      s.res = s.c2 - s.esp2;
      s.varBin = s.c1 * r * (1 - r) + ab1 * sv * (1 - sv);
      s.r = r; s.s = sv;
    }
  }
  return { zonas, proprias, herdadas };
}

/**
 * Modelo nulo binomial de transição, calibrado pela massa central dos dados (perguntas 1 e 5).
 *   c2 = Bin(c1, r_i) + Bin(a2 − c1, s_i): cada eleitor que votou no 1º turno volta com probabilidade r_i e cada um
 *   que faltou vota com probabilidade s_i, independentes entre si. Média = esperado da seção (modelo de transição da
 *   zona + covariáveis); variância V_i = φ_z·a2·p(1−p), com φ_z da zona (≥ 30 seções; senão da UF) tal que a mediana de
 *   res²/V seja 0,4549 (mediana do χ² com 1 gl). A mediana torna a calibração robusta a uma cauda de seções anômalas.
 *   Dados m e V, r_i e s_i saem de uma equação do 2º grau (raiz com r maior, isto é, eleitores mais constantes).
 *   Se V passar do máximo binomial (a2·p(1−p), r = s), o excedente vira beta-binomial com ρ = (V/varBin − 1)/(a2 − 1).
 * As taxas r e s da regressão por zona (ajustarTransicao) são ecológicas e ficam perto de 1 e 0, porque a propensão a
 * votar varia entre eleitores; por isso a variância do nulo não sai delas.
 * Grava s.p, s.varBin, s.phi, s.V, s.rr, s.ss, s.rho e s.z = res/√V.
 */
export function calibrarNulo(pares, campoRes = 'res') {
  for (const s of pares) {
    s.p = Math.min(Math.max((s.c2 - s[campoRes]) / s.a2, 0.005), 0.995);
    s.varBin = s.a2 * s.p * (1 - s.p);
  }
  const phiDe = (l) => {
    const v = l.map((s) => (s[campoRes] ** 2) / s.varBin).sort((a, b) => a - b);
    return Math.max(v[Math.floor(v.length / 2)] / 0.4549, 1e-3);
  };
  const agrupar = (f) => { const m = new Map(); for (const s of pares) { const k = f(s); if (!m.has(k)) m.set(k, []); m.get(k).push(s); } return m; };
  const phiUf = new Map();
  for (const [uf, l] of agrupar((s) => s.uf)) phiUf.set(uf, phiDe(l));
  let zonasProprias = 0, inviaveis = 0;
  for (const [, l] of agrupar((s) => `${s.uf}|${s.zona}`)) {
    const phi = l.length >= 30 ? phiDe(l) : phiUf.get(l[0].uf);
    if (l.length >= 30) zonasProprias++;
    for (const s of l) {
      s.phi = phi; s.V = phi * s.varBin; s.normal = false; s.z = s[campoRes] / Math.sqrt(s.V);
      const n1 = s.c1, n0 = Math.max(s.a2 - s.c1, 0), m = s.a2 * s.p;
      s.rho = 0;
      // seção sem faltosos no 1º turno ou com esperado no limite (p cortado em 0,5% ou 99,5%): normal N(m, V)
      if (n0 === 0 || s.p >= 0.995 || s.p <= 0.005) { s.rr = s.p; s.ss = s.p; s.normal = true; inviaveis++; continue; }
      if (s.V >= s.varBin) {
        s.rr = s.p; s.ss = s.p;
        if (s.V > s.varBin) { s.rho = (s.V / s.varBin - 1) / Math.max(s.a2 - 1, 1); inviaveis++; }
        continue;
      }
      const A = (n1 * s.a2) / n0, B = (-2 * m * n1) / n0, C = (m * m) / n0 - m + s.V;
      const disc = B * B - 4 * A * C;
      const r = disc >= 0 ? (-B + Math.sqrt(disc)) / (2 * A) : -B / (2 * A);
      const sv = (m - n1 * r) / n0;
      s.rr = Math.min(Math.max(r, 0), 1); s.ss = Math.min(Math.max(sv, 0), 1);
      // r ou s fora de [0, 1]: a binomial de transição não atinge média e variância juntas; usa a normal N(m, V)
      if (r < 0 || r > 1 || sv < 0 || sv > 1 || disc < 0) { s.normal = true; inviaveis++; }
    }
  }
  const out = { zonasProprias, secoesForaDaBinomial: inviaveis, secoesBetaBinomial: pares.filter((s) => s.rho > 0).length, secoesNormal: pares.filter((s) => s.normal).length, porUf: {} };
  const med = (v) => { v.sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
  for (const [uf, l] of agrupar((s) => s.uf)) {
    out.porUf[uf] = { secoes: l.length, phiUf: +phiUf.get(uf).toFixed(3), phiMedianoZonas: +med(l.map((s) => s.phi)).toFixed(3),
      permanenciaMediana: +med(l.map((s) => s.rr)).toFixed(3), retornoMediano: +med(l.map((s) => s.ss)).toFixed(3) };
  }
  return out;
}

/** Um sorteio do nulo: c2* = Bin(c1, rr) + Bin(a2 − c1, ss); beta-binomial(a2, p, ρ) quando V passa da binomial; normal N(m, V) quando r ou s saem de [0, 1]. */
export function sortearNulo(s, rnd, sortearBinomial, sortearBeta) {
  if (s.normal) {
    let u = 0; while (u === 0) u = rnd();
    return Math.round(s.a2 * s.p + Math.sqrt(s.V) * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()));
  }
  if (s.rho > 0) { const k = (1 - s.rho) / s.rho; return sortearBinomial(s.a2, sortearBeta(s.p * k, (1 - s.p) * k, rnd), rnd); }
  return sortearBinomial(s.c1, s.rr, rnd) + sortearBinomial(Math.max(s.a2 - s.c1, 0), s.ss, rnd);
}

// ---------- preparação comum (perguntas 1 a 5) ----------

/** Filtro das seções: aptos ≥ 20, comparecimento do 1º turno ≥ 10 e aptos que mudam no máximo 10 entre os turnos. */
export function filtrar(todos) {
  const filtro = { lidos: todos.length, aptosMenor20: 0, comp1Menor10: 0, aptosMudam: 0 };
  const P = todos.filter((s) => {
    if (s.a2 < 20) { filtro.aptosMenor20++; return false; }
    if (s.c1 < 10) { filtro.comp1Menor10++; return false; }
    if (Math.abs(s.a2 - s.a1) > 10) { filtro.aptosMudam++; return false; }
    return true;
  });
  filtro.usadas = P.length;
  for (const s of P) {
    s.mun = `${s.uf}|${s.municipio}`; s.zon = `${s.uf}|${s.zona}`;
    s.dpp = 100 * (s.c2 / s.a2 - s.c1 / s.a1);
    s.dc = s.c2 - s.c1;
    s.f1 = s.v13_1 + s.v22_1; s.f2 = s.v13_2 + s.v22_2;
    s.s1 = s.f1 > 0 ? s.v13_1 / s.f1 : null; s.s2 = s.f2 > 0 ? s.v13_2 / s.f2 : null;
  }
  return { P, filtro };
}

/**
 * Parcela 60+ do eleitorado de cada seção (perfil_eleitor_secao lido por forense-eleitorado.mjs), com as seções agregadas
 * somadas à principal pelo locais.csv do 2º turno. Grava s.p60, s.pInd (parcela indígena), s.p1624 (16 a 24 anos),
 * s.pEscB (escolaridade baixa) e s.pBioCad (biometria cadastrada). Devolve as linhas de perfil usadas (0 se faltar o arquivo).
 */
export async function carregarIdade(P) {
  const { createReadStream, existsSync } = await import('node:fs');
  const { readdir } = await import('node:fs/promises');
  const { createInterface } = await import('node:readline');
  const forense = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'forense');
  const dir = path.join(forense, 'perfil'), arqLocais = path.join(forense, 'locais.csv');
  if (!existsSync(dir) || !existsSync(arqLocais)) return 0;
  const principal = new Map();
  for await (const l of createInterface({ input: createReadStream(arqLocais, 'utf8'), crlfDelay: Infinity })) {
    const c = l.split(';');
    if (c[0] !== '2' || c[5] !== 'Agregada') continue;
    principal.set(`${c[1]}|${c[2]}|${c[3]}|${c[4]}`, `${c[1]}|${c[2]}|${c[3]}|${String(Number(c[6])).padStart(4, '0')}`);
  }
  const porChave = new Map(P.map((s) => [`${s.uf}|${s.municipio}|${s.zona}|${s.secao}`, s]));
  let n = 0;
  for (const f of await readdir(dir)) {
    let cab = true;
    for await (const l of createInterface({ input: createReadStream(path.join(dir, f), 'utf8'), crlfDelay: Infinity })) {
      if (cab) { cab = false; continue; }
      const c = l.split(';');
      const k = `${c[0]}|${c[1]}|${c[2]}|${c[3]}`;
      const s = porChave.get(principal.get(k) ?? k);
      if (!s) continue;
      s.eleit = (s.eleit ?? 0) + Number(c[4]);
      s.bioCad = (s.bioCad ?? 0) + Number(c[5]);
      s.i60 = (s.i60 ?? 0) + Number(c[6]);
      s.i1624 = (s.i1624 ?? 0) + Number(c[7]);
      s.escB = (s.escB ?? 0) + Number(c[8]);
      s.ind = (s.ind ?? 0) + Number(c[10]);
      n++;
    }
  }
  for (const s of P) {
    const ok = s.eleit > 0;
    s.p60 = ok ? s.i60 / s.eleit : null; s.pInd = ok ? s.ind / s.eleit : null;
    s.p1624 = ok ? s.i1624 / s.eleit : null; s.pEscB = ok ? s.escB / s.eleit : null; s.pBioCad = ok ? Math.min(s.bioCad / s.eleit, 1) : null;
  }
  return n;
}

/**
 * Esperado e resíduo padronizado de cada seção: transição por zona, ajuste por idade e tamanho dentro da zona,
 * nulo binomial calibrado. Grava s.esp2, s.res, s.resAj (excesso em eleitores), s.z e os parâmetros do nulo.
 */
export function modelar(P) {
  const transicao = ajustarTransicao(P);
  const comPerfil = P.filter((s) => s.p60 != null);
  const ajCov = comPerfil.length > 1000
    ? mqEfeitoFixo(comPerfil, { y: (s) => s.res / s.a2, x: (s) => [s.p60, Math.log(s.a2)], w: (s) => s.a2, grupo: (s) => s.zon, cluster: (s) => s.mun })
    : null;
  const med = new Map();
  for (const s of comPerfil) { const m = med.get(s.zon) ?? { w: 0, p: 0, l: 0 }; m.w += s.a2; m.p += s.a2 * s.p60; m.l += s.a2 * Math.log(s.a2); med.set(s.zon, m); }
  for (const s of P) {
    const m = med.get(s.zon);
    s.resAj = ajCov && s.p60 != null && m ? s.res - s.a2 * (ajCov.b[0] * (s.p60 - m.p / m.w) + ajCov.b[1] * (Math.log(s.a2) - m.l / m.w)) : s.res;
  }
  const disp = calibrarNulo(P, 'resAj');
  return { transicao, ajCov, disp };
}
