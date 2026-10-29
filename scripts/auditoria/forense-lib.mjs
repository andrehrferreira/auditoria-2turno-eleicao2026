// Funções comuns dos testes de forense estatística (docs/analysis/forense-estatistica/).
// Sem dependências: leitura de CSV (do disco ou de dentro de ZIP, em streaming), estatística básica,
// distribuições (χ², binomial, beta-binomial) e correção para múltiplos testes.
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, open, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { createInflateRaw } from 'node:zlib';
import { listarEntradas } from '../../src/zip.js';

export const RAIZ = path.resolve(import.meta.dirname, '..', '..');
export const DIR_SAIDA = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'forense');
export const BANCO = path.join(RAIZ, 'data', 'db', 'eleicao2026.sqlite');

export async function salvar(nome, conteudo) {
  await mkdir(DIR_SAIDA, { recursive: true });
  const arquivo = path.join(DIR_SAIDA, nome);
  await writeFile(arquivo, typeof conteudo === 'string' ? conteudo : JSON.stringify(conteudo, null, 1));
  return arquivo;
}

// ---------- CSV ----------

/** Divide uma linha CSV com separador `;` e aspas duplas opcionais. */
export function dividirCsv(linha, sep = ';') {
  if (!linha.includes('"')) return linha.split(sep);
  const campos = [];
  let atual = '';
  let aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i];
    if (aspas) {
      if (ch === '"') {
        if (linha[i + 1] === '"') { atual += '"'; i++; } else aspas = false;
      } else atual += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === sep) { campos.push(atual); atual = ''; }
    else atual += ch;
  }
  campos.push(atual);
  return campos;
}

/** Linhas de um CSV dentro de um ZIP, em streaming. `filtro(nome)` escolhe as entradas. */
export async function* linhasZip(arquivoZip, filtro = (n) => n.toLowerCase().endsWith('.csv'), encoding = 'latin1') {
  const handle = await open(arquivoZip, 'r');
  const entradas = [];
  try {
    for (const e of await listarEntradas(handle)) {
      if (!filtro(e.nome)) continue;
      const cab = Buffer.alloc(30);
      await handle.read(cab, 0, 30, e.offsetLocal);
      entradas.push({ ...e, inicio: e.offsetLocal + 30 + cab.readUInt16LE(26) + cab.readUInt16LE(28) });
    }
  } finally {
    await handle.close();
  }
  for (const e of entradas) {
    let fluxo = createReadStream(arquivoZip, { start: e.inicio, end: e.inicio + e.tamanhoComprimido - 1, highWaterMark: 1 << 20 });
    if (e.metodo === 8) fluxo = fluxo.pipe(createInflateRaw());
    else if (e.metodo !== 0) throw new Error(`método ${e.metodo} não suportado em ${e.nome}`);
    for await (const linha of createInterface({ input: fluxo.setEncoding(encoding), crlfDelay: Infinity })) yield [e.nome, linha];
  }
}

/** Lê um CSV `;` com cabeçalho (gerado por estes scripts) como lista de objetos. Colunas numéricas viram número. */
export async function lerTabela(arquivo, numericas = []) {
  const linhas = createInterface({ input: createReadStream(arquivo, { encoding: 'utf8' }), crlfDelay: Infinity });
  let cab = null;
  const num = new Set(numericas);
  const saida = [];
  for await (const l of linhas) {
    if (!l) continue;
    const c = dividirCsv(l);
    if (!cab) { cab = c; continue; }
    const o = {};
    for (let i = 0; i < cab.length; i++) o[cab[i]] = num.has(cab[i]) ? (c[i] === '' ? null : Number(c[i])) : c[i];
    saida.push(o);
  }
  return saida;
}

export function paraCsv(linhas, colunas) {
  const esc = (v) => (v == null ? '' : typeof v === 'string' && /[;"\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : String(v));
  return [colunas.join(';'), ...linhas.map((l) => colunas.map((c) => esc(l[c])).join(';'))].join('\n') + '\n';
}

export const chaveSecao = (s) => `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`;
export const pad = (v, n) => String(Number(v)).padStart(n, '0');

// ---------- estatística ----------

export function mediana(valores) {
  const v = Float64Array.from(valores).sort();
  const n = v.length;
  if (!n) return NaN;
  return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
}

export function quantil(valores, q) {
  const v = Float64Array.from(valores).sort();
  if (!v.length) return NaN;
  const pos = (v.length - 1) * q;
  const i = Math.floor(pos);
  return i + 1 < v.length ? v[i] + (v[i + 1] - v[i]) * (pos - i) : v[i];
}

/** Mediana e MAD escalado (×1,4826, comparável ao desvio-padrão na normal). */
export function medianaMad(valores) {
  const m = mediana(valores);
  return { mediana: m, mad: 1.4826 * mediana(valores.map((x) => Math.abs(x - m))) };
}

export function pearson(xs, ys) {
  const n = xs.length;
  if (n < 3) return NaN;
  let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; }
  const mx = sx / n, my = sy / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : NaN;
}

// ln Γ(x), aproximação de Lanczos (g = 7, 9 coeficientes); erro relativo < 1e-13 para x > 0.
const LANCZOS = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
export function lnGama(x) {
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lnGama(1 - x);
  x -= 1;
  let a = LANCZOS[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += LANCZOS[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Q(a, x): gama incompleta superior regularizada (Numerical Recipes, série e fração contínua). */
export function gamaQ(a, x) {
  if (x <= 0) return 1;
  const gln = lnGama(a);
  if (x < a + 1) {
    let ap = a, soma = 1 / a, del = soma;
    for (let n = 0; n < 1000; n++) {
      ap += 1; del *= x / ap; soma += del;
      if (Math.abs(del) < Math.abs(soma) * 1e-15) break;
    }
    return 1 - soma * Math.exp(-x + a * Math.log(x) - gln);
  }
  let b = x + 1 - a, c = 1 / 1e-300, d = 1 / b, h = d;
  for (let i = 1; i < 1000; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return Math.exp(-x + a * Math.log(x) - gln) * h;
}

/** Valor-p do χ² com `gl` graus de liberdade. */
export const pQuiQuadrado = (x2, gl) => gamaQ(gl / 2, x2 / 2);

/** χ² de aderência: `obs` e `esperadoProp` (proporções que somam 1). */
export function quiQuadrado(obs, esperadoProp) {
  const n = obs.reduce((a, b) => a + b, 0);
  let x2 = 0;
  for (let i = 0; i < obs.length; i++) {
    const e = n * esperadoProp[i];
    x2 += (obs[i] - e) ** 2 / e;
  }
  const gl = obs.length - 1;
  // MAD de proporções (Nigrini): média do |observado − esperado| em pontos percentuais.
  const madPp = (100 * obs.reduce((s, o, i) => s + Math.abs(o / n - esperadoProp[i]), 0)) / obs.length;
  return { n, x2, gl, p: pQuiQuadrado(x2, gl), madPp };
}

/** Correção de Holm–Bonferroni: devolve os valores-p ajustados na mesma ordem. */
export function holm(ps) {
  const ordem = ps.map((p, i) => [p, i]).sort((a, b) => a[0] - b[0]);
  const m = ps.length;
  const ajust = new Array(m);
  let max = 0;
  ordem.forEach(([p, i], k) => {
    max = Math.max(max, Math.min(1, (m - k) * p));
    ajust[i] = max;
  });
  return ajust;
}

const lnComb = (n, k) => lnGama(n + 1) - lnGama(k + 1) - lnGama(n - k + 1);
const lnBeta = (a, b) => lnGama(a) + lnGama(b) - lnGama(a + b);

/** P(X ≥ k) para X ~ Binomial(n, p). */
export function binomialCauda(n, p, k) {
  if (k <= 0) return 1;
  if (k > n) return 0;
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  let s = 0;
  for (let j = k; j <= n; j++) s += Math.exp(lnComb(n, j) + j * Math.log(p) + (n - j) * Math.log1p(-p));
  return Math.min(1, s);
}

/** P(X ≥ k) para X ~ BetaBinomial(n, α, β). */
export function betaBinomialCauda(n, a, b, k) {
  if (k <= 0) return 1;
  if (k > n) return 0;
  const base = lnBeta(a, b);
  let s = 0;
  for (let j = k; j <= n; j++) s += Math.exp(lnComb(n, j) + lnBeta(j + a, n - j + b) - base);
  return Math.min(1, s);
}

/**
 * Sobredispersão (ρ, correlação intraclasse) por método dos momentos num grupo de seções com
 * `x` sucessos em `n` tentativas. ρ = 0 é binomial; ρ > 0 alarga a distribuição (beta-binomial).
 */
export function sobredispersao(grupo) {
  let X = 0, N = 0;
  for (const g of grupo) { X += g.x; N += g.n; }
  const p = X / N;
  const k = grupo.length;
  if (k < 3 || p <= 0 || p >= 1) return { p, rho: 0 };
  // Estimador de Kleinman: S = Σ n_i (p_i − p)², E[S] = p(1−p)[(k−1) + ρ(N − Σn_i²/N − (k−1))]
  let S = 0, n2 = 0;
  for (const g of grupo) { S += g.n * (g.x / g.n - p) ** 2; n2 += g.n * g.n; }
  const den = N - n2 / N - (k - 1);
  let rho = den > 0 ? (S / (p * (1 - p)) - (k - 1)) / den : 0;
  rho = Math.min(Math.max(rho, 0), 0.99);
  return { p, rho };
}

export const fmt = (x, d = 0) => (x == null || Number.isNaN(x) ? '—' : Number(x).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }));
export const fmtP = (p) => (p < 1e-4 ? p.toExponential(1).replace('.', ',') : fmt(p, 4));

// ---------- amostragem (Monte Carlo dos modelos nulos) ----------

/** Gerador pseudoaleatório com semente (mulberry32), para a simulação ser reproduzível. */
export function aleatorio(semente = 2026) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Binomial(n, p) exata por inversão a partir da moda, alternando para baixo e para cima (O(√npq) passos). */
export function sortearBinomial(n, p, rnd) {
  if (n <= 0 || p <= 0) return 0;
  if (p >= 1) return n;
  const moda = Math.min(n, Math.floor((n + 1) * p));
  const q = 1 - p;
  const pm = Math.exp(lnComb(n, moda) + moda * Math.log(p) + (n - moda) * Math.log1p(-p));
  let u = rnd() - pm;
  if (u <= 0) return moda;
  let baixo = moda, alto = moda, pBaixo = pm, pAlto = pm;
  for (;;) {
    if (baixo > 0) {
      pBaixo *= (baixo * q) / ((n - baixo + 1) * p);
      baixo--;
      u -= pBaixo;
      if (u <= 0) return baixo;
    }
    if (alto < n) {
      pAlto *= ((n - alto) * p) / ((alto + 1) * q);
      alto++;
      u -= pAlto;
      if (u <= 0) return alto;
    }
    if (baixo === 0 && alto === n) return moda; // resto de arredondamento acumulado
  }
}

function normal(rnd) {
  let u = 0;
  while (u === 0) u = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
}

/** Gama(forma, 1) de Marsaglia–Tsang. */
export function sortearGama(forma, rnd) {
  if (forma < 1) return sortearGama(forma + 1, rnd) * rnd() ** (1 / forma);
  const d = forma - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x, v;
    do { x = normal(rnd); v = 1 + c * x; } while (v <= 0);
    v = v * v * v;
    const u = rnd();
    if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

export function sortearBeta(a, b, rnd) {
  const x = sortearGama(a, rnd);
  return x / (x + sortearGama(b, rnd));
}

/** Parâmetros α, β da beta-binomial com média p e correlação intraclasse ρ (null se ρ = 0). */
export function parametrosBeta(p, rho) {
  if (!(rho > 0)) return null;
  const s = (1 - rho) / rho;
  return { a: p * s, b: (1 - p) * s };
}

// ---------- regressão ----------

/** Mínimos quadrados: X (linhas de preditores; inclua a coluna 1 se quiser intercepto) e y. Gauss-Jordan. */
export function mqo(X, y) {
  const k = X[0].length;
  const A = Array.from({ length: k }, () => new Float64Array(k + 1));
  for (let i = 0; i < y.length; i++) {
    const xi = X[i];
    for (let r = 0; r < k; r++) {
      for (let c = 0; c < k; c++) A[r][c] += xi[r] * xi[c];
      A[r][k] += xi[r] * y[i];
    }
  }
  for (let col = 0; col < k; col++) {
    let piv = col;
    for (let r = col + 1; r < k; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
    [A[col], A[piv]] = [A[piv], A[col]];
    for (let r = 0; r < k; r++) {
      if (r === col) continue;
      const f = A[r][col] / A[col][col];
      for (let c = col; c <= k; c++) A[r][c] -= f * A[col][c];
    }
  }
  return Array.from({ length: k }, (_, r) => A[r][k] / A[r][r]);
}

// ---------- carga das seções com controles ----------

/**
 * Seções do turno (forense-base.mjs) com o perfil do eleitorado (forense-eleitorado.mjs perfil; seções agregadas
 * somadas à principal) e o local de votação (forense-eleitorado.mjs local). Acrescenta:
 * validos (13+22+outros), comp (comparecimento/aptos), frações do perfil e a categoria da seção.
 */
export async function carregarSecoes(turno) {
  const numericas = ['agregadas', 'aptos', 'aptos_tte', 'comparecimento', 'v13', 'v22', 'outros', 'branco', 'nulo'];
  const secoes = await lerTabela(path.join(DIR_SAIDA, `secoes-${turno}t.csv`), numericas);
  const porChave = new Map(secoes.map((s) => [chaveSecao(s), s]));

  const arqLocais = path.join(DIR_SAIDA, 'locais.csv');
  const locais = existsSync(arqLocais) ? await lerTabela(arqLocais) : [];
  const principalDe = new Map();
  for (const l of locais) {
    if (Number(l.turno) !== turno) continue;
    const k = chaveSecao(l);
    if (l.tipo_secao === 'Agregada') principalDe.set(k, `${l.uf}/${l.municipio}/${l.zona}/${pad(l.principal, 4)}`);
    const s = porChave.get(k);
    if (s) Object.assign(s, { nome_local: l.nome_local, tipo_local: l.tipo_local });
  }

  const campos = ['eleitores', 'biometria', 'idade60', 'idade16a24', 'escol_baixa', 'superior', 'indigena', 'quilombola'];
  const dirPerfil = path.join(DIR_SAIDA, 'perfil');
  if (existsSync(dirPerfil)) {
    for (const f of await readdir(dirPerfil)) {
      for (const p of await lerTabela(path.join(dirPerfil, f), campos)) {
        const k = chaveSecao(p);
        const s = porChave.get(principalDe.get(k) ?? k);
        if (!s) continue;
        s.perfil ??= Object.fromEntries(campos.map((c) => [c, 0]));
        for (const c of campos) s.perfil[c] += p[c];
      }
    }
  }

  for (const s of secoes) {
    s.validos = s.v13 + s.v22 + s.outros;
    s.comp = s.aptos > 0 ? s.comparecimento / s.aptos : null;
    const e = s.perfil?.eleitores;
    s.p60 = e ? s.perfil.idade60 / e : null;
    s.pBaixa = e ? s.perfil.escol_baixa / e : null;
    s.pSup = e ? s.perfil.superior / e : null;
    s.pInd = e ? s.perfil.indigena / e : null;
    s.pQuil = e ? s.perfil.quilombola / e : null;
    s.pBio = e ? s.perfil.biometria / e : null;
    s.categoria = categoria(s);
  }
  return secoes;
}

/** Categoria da seção para as explicações benignas, por prioridade: exterior, prisional, trânsito, indígena, quilombola. */
export function categoria(s) {
  if (s.uf === 'zz') return 'exterior';
  if (s.tipo_local === 'Preso provisório') return 'prisional';
  if (s.tipo_local === 'Voto em trânsito') return 'transito';
  if (/ALDEIA|IND[IÍ]GENA|TERRA IND/i.test(s.nome_local ?? '') || (s.pInd ?? 0) >= 0.5) return 'indigena';
  if (/QUILOMBO/i.test(s.nome_local ?? '') || (s.pQuil ?? 0) >= 0.5) return 'quilombola';
  if (s.tipo_local === 'Temporário') return 'temporario';
  return 'comum';
}

export const FAIXAS_TAMANHO = [[1, 19], [20, 49], [50, 99], [100, 199], [200, 299], [300, 399], [400, Infinity]];
export function faixaTamanho(n) {
  const f = FAIXAS_TAMANHO.find(([a, b]) => n >= a && n <= b);
  return f ? (f[1] === Infinity ? `${f[0]}+` : `${f[0]}-${f[1]}`) : '0';
}
