// Estatístico eleitoral, H14 e H19, fechamento (plano: docs/analysis/estatistico-eleitoral/31-h14-h19-plano-final.md,
// commit 067d1a7). Funções comuns aos scripts estatistico-h14-h19-final-*.mjs:
//   - contador de ciclos do diário (dedos lidos × tempo esgotado, quem autorizou, reconhecidos com tempo esgotado, escores),
//     o mesmo critério de estatistico-h19-captura.mjs, com extensões declaradas;
//   - mínimos quadrados ponderados com UM efeito fixo (transformação interna) e erro agrupado CR1;
//   - beta-binomial (cauda superior), Bonferroni, BH, normal.
// Nenhum título é gravado: o contador só devolve contagens; mesários viram M1, M2… dentro da seção.
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';
import { DIR_DADOS } from '../../src/config.js';

export const DIR_FINAL = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h14-h19-final');
export const MARGEM = 4430191; // 64.256.232 − 59.826.041 (voto_oficial, 2º turno, presidente)
export const REGIAO = {
  ac: 'Norte', am: 'Norte', ap: 'Norte', pa: 'Norte', ro: 'Norte', rr: 'Norte', to: 'Norte',
  al: 'Nordeste', ba: 'Nordeste', ce: 'Nordeste', ma: 'Nordeste', pb: 'Nordeste', pe: 'Nordeste', pi: 'Nordeste', rn: 'Nordeste', se: 'Nordeste',
  df: 'Centro-Oeste', go: 'Centro-Oeste', ms: 'Centro-Oeste', mt: 'Centro-Oeste',
  es: 'Sudeste', mg: 'Sudeste', rj: 'Sudeste', sp: 'Sudeste',
  pr: 'Sul', rs: 'Sul', sc: 'Sul',
};
export const REGIOES = ['Nordeste', 'Norte', 'Centro-Oeste', 'Sudeste', 'Sul'];

// ---------------------------------------------------------------- leitura de tabelas
export async function* linhasJsonl(arq) {
  for await (const l of createInterface({ input: createReadStream(arq), crlfDelay: Infinity })) if (l) yield JSON.parse(l);
}
export async function lerCsv(arq, sep = ';') {
  let txt = await readFile(arq);
  if (arq.endsWith('.gz')) txt = gunzipSync(txt);
  const ls = txt.toString('utf8').split('\n').filter(Boolean);
  const cab = ls[0].replace(/\r$/, '').split(sep);
  return ls.slice(1).map((l) => {
    const c = l.replace(/\r$/, '').split(sep);
    const o = {};
    cab.forEach((k, i) => { o[k] = c[i]; });
    return o;
  });
}
export const num = (x) => (x === '' || x === undefined || x === null ? NaN : Number(x));

// ---------------------------------------------------------------- normal, BH, Bonferroni
export function erfc(x) {
  const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807
    + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}
export const pBi = (z) => erfc(Math.abs(z) / Math.SQRT2);
export function invNormal(p) { // p ∈ (0,1) → z com Φ(z) = p (Acklam)
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const pl = 0.02425;
  if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - pl) return -invNormal(1 - p);
  const q = p - 0.5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
export const zBonf = (n, alfa = 0.05) => -invNormal(alfa / n / 2);
export function bh(ps) {
  const idx = ps.map((p, i) => [p, i]).sort((a, b) => a[0] - b[0]);
  const q = new Array(ps.length);
  let min = 1;
  for (let k = idx.length - 1; k >= 0; k--) { min = Math.min(min, (idx[k][0] * idx.length) / (k + 1)); q[idx[k][1]] = min; }
  return q;
}
export const mediana = (v) => { const s = [...v].sort((a, b) => a - b); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : NaN; };
export const mad = (v) => { const m = mediana(v); return 1.4826 * mediana(v.map((x) => Math.abs(x - m))); };
export const logit = (x, n) => Math.log((x + 0.5) / (n - x + 0.5));

// ---------------------------------------------------------------- gerador com semente (mulberry32) e sorteios
export function rng(semente) {
  let s = semente >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function normal(r) { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
export function binomial(r, n, p) {
  if (n <= 0 || p <= 0) return 0;
  if (p >= 1) return n;
  if (n < 50) { let k = 0; for (let i = 0; i < n; i++) if (r() < p) k++; return k; }
  const k = Math.round(n * p + Math.sqrt(n * p * (1 - p)) * normal(r));
  return Math.max(0, Math.min(n, k));
}
export function poisson(r, lam) {
  if (lam <= 0) return 0;
  if (lam < 30) { const L = Math.exp(-lam); let k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; }
  return Math.max(0, Math.round(lam + Math.sqrt(lam) * normal(r)));
}

// ---------------------------------------------------------------- beta-binomial
const lgamma = (x) => { // Lanczos
  const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  x -= 1; let a = c[0]; const t = x + g + 0.5;
  for (let i = 1; i < 9; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
};
const lbeta = (a, b) => lgamma(a) + lgamma(b) - lgamma(a + b);
/** P(Z ≥ z) para Z ~ BetaBin(n, a, b); soma direta da cauda (n até alguns milhares). */
export function bbCaudaSup(z, n, a, b) {
  if (z <= 0) return 1;
  if (z > n) return 0;
  const lc = (k) => lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1) + lbeta(k + a, n - k + b) - lbeta(a, b);
  let s = 0;
  const l0 = lc(z);
  for (let k = z; k <= n; k++) { const t = Math.exp(lc(k) - l0); s += t; if (t < 1e-16 * s && k > z + 5) break; }
  return Math.min(1, Math.exp(l0) * s);
}
/** μ e ρ (correlação intraclasse) pelo método dos momentos, com pesos n (Kleinman). */
export function momentosBB(lista) { // lista de {z, n}, n ≥ 1
  let N = 0, Z = 0;
  for (const { z, n } of lista) { N += n; Z += z; }
  const mu = Z / N;
  let S = 0, n2 = 0;
  for (const { z, n } of lista) { S += n * (z / n - mu) ** 2; n2 += n * n; }
  const k = lista.length;
  const den = mu * (1 - mu) * (N - n2 / N);
  const rho = den > 0 ? Math.max(0, Math.min(0.99, (S - mu * (1 - mu) * (k - 1)) / den)) : 0;
  return { mu, rho, k, N };
}

// ---------------------------------------------------------------- MQP com um efeito fixo e erro CR1
/** linhas: array de objetos. y(o), x(o) → array de regressores, w(o), g(o) efeito fixo (string), cl(o) agrupamento.
 *  Devolve beta, ep, z por regressor (na ordem de x), n, grupos, clusters. Linhas com y/x/w não finitos ou peso 0 saem. */
export function mqef(linhas, { y, x, w = () => 1, g, cl }) {
  const rows = [];
  for (const o of linhas) {
    const yy = y(o), xx = x(o), ww = w(o);
    if (!Number.isFinite(yy) || !Number.isFinite(ww) || ww <= 0 || xx.some((v) => !Number.isFinite(v))) continue;
    rows.push({ y: yy, x: xx, w: ww, g: g ? g(o) : '', c: cl(o) });
  }
  const k = rows[0]?.x.length ?? 0;
  const grp = new Map();
  for (const r of rows) { let s = grp.get(r.g); if (!s) grp.set(r.g, (s = { w: 0, y: 0, x: new Array(k).fill(0), n: 0 })); s.w += r.w; s.y += r.w * r.y; s.n++; for (let j = 0; j < k; j++) s.x[j] += r.w * r.x[j]; }
  const XtX = Array.from({ length: k }, () => new Array(k).fill(0)), Xty = new Array(k).fill(0);
  const dem = [];
  for (const r of rows) {
    const s = grp.get(r.g);
    if (s.n < 2) continue; // grupo de 1 linha não informa
    const yt = r.y - s.y / s.w, xt = r.x.map((v, j) => v - s.x[j] / s.w);
    dem.push({ yt, xt, w: r.w, c: r.c });
    for (let a = 0; a < k; a++) { Xty[a] += r.w * xt[a] * yt; for (let b = 0; b <= a; b++) XtX[a][b] += r.w * xt[a] * xt[b]; }
  }
  for (let a = 0; a < k; a++) for (let b = a + 1; b < k; b++) XtX[a][b] = XtX[b][a];
  const inv = inverter(XtX);
  if (!inv) return null;
  const beta = inv.map((l) => l.reduce((s, v, j) => s + v * Xty[j], 0));
  const sc = new Map();
  for (const d of dem) {
    const e = d.yt - d.xt.reduce((s, v, j) => s + v * beta[j], 0);
    let u = sc.get(d.c); if (!u) sc.set(d.c, (u = new Array(k).fill(0)));
    for (let j = 0; j < k; j++) u[j] += d.w * d.xt[j] * e;
  }
  const meat = Array.from({ length: k }, () => new Array(k).fill(0));
  for (const u of sc.values()) for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) meat[a][b] += u[a] * u[b];
  const G = sc.size, n = dem.length, ng = [...grp.values()].filter((s) => s.n >= 2).length;
  const fc = (G / Math.max(1, G - 1)) * ((n - 1) / Math.max(1, n - k - ng));
  const V = mult(mult(inv, meat), inv).map((l) => l.map((v) => v * fc));
  const ep = V.map((l, j) => Math.sqrt(Math.max(0, l[j])));
  return { beta, ep, z: beta.map((b, j) => b / ep[j]), n, grupos: ng, clusters: G };
}
export function inverter(M) {
  const n = M.length, A = M.map((l, i) => [...l, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-300) return null;
    [A[c], A[p]] = [A[p], A[c]];
    const d = A[c][c]; for (let j = 0; j < 2 * n; j++) A[c][j] /= d;
    for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c]; if (f) for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[c][j]; }
  }
  return A.map((l) => l.slice(n));
}
const mult = (A, B) => A.map((l) => B[0].map((_, j) => l.reduce((s, v, i) => s + v * B[i][j], 0)));

// ---------------------------------------------------------------- contador do ciclo do eleitor no diário
const RE_SOLICITA = /^Solicita digital\. Tentativa \[(\d+)\] de \[(\d+)\]/;
const RE_CAPTURADA = /^Capturada a digital\. Tentativa \[(\d+)\] de \[(\d+)\]/;
const RE_TIMEOUT = /^Timeout de reconhecimento do dedo\. Tentativa \[(\d+)\] de \[(\d+)\]/;
const RE_MES = /^Mesário (\d+) habilitou o eleitor/;
const RE_SCORE = /^Batimento de digitais retornou o score (\d+)/;
const RE_SCORE4 = /^Digital capturada não corresponde a digital do eleitor: .*?\[score (\d+)\].*?\[score (\d+)\].*?\[score (\d+)\].*?\[score (\d+)\]/;
const NOVO = 'Não encontrou digital coletada em nenhum dos arquivos';
const VISTO = 'Digital coletada bate com uma digital gravada após o registro inicial de mesário';
const ERRO_LEITOR = /Falha na captura da digital|ERROR opening the biometric reader/;

export const novaContagem = () => ({
  votos: 0, R: 0, bioTmo: 0, ano: 0, F: 0, cap: [0, 0, 0, 0, 0], m: {}, semBloco: 0,
  aut: { mes: 0, novo: 0, visto: 0, nenhuma: 0, multi: 0 }, aut0: { mes: 0, novo: 0, visto: 0, outra: 0 },
  tentEleitor: { cap: 0, tout: 0 }, scores: { n: 0, zero: 0, soma: 0, hist: new Array(11).fill(0) }, scoresR: { n: 0, soma: 0 },
  mesarios: { registrados: 0, registroAntes: 0, registroDurante: 0 }, errosLeitor: 0, mesCmp: { n: 0, zero: 0 },
  autores: {}, porHora: {}, primeiroVoto: null, ultimoVoto: null, seqF: '',
});
/** Conta um fluxo (linhas já sem duplicatas, na ordem gravada). opc.ano2022: a mensagem "Solicitação de dado pessoal…"
 *  marca também "dado confere" (em 2022 não existe "Dado digitado confere"). opc.detalhe: grava autores (M1…), horas e
 *  a sequência F/R para o teste de rachas. Os títulos dos mesários só vivem dentro da função. */
export function contarFluxo(linhas, s, opc = {}) {
  const vistas = new Set();
  const titulos = new Map();
  let ciclo, bloco;
  const zeraBloco = () => ({ sol: new Set(), cap: new Set(), tout: new Set() });
  const zeraCiclo = () => { ciclo = { bio: false, ano: false, dado: false, mes: null, nMes: 0, novo: 0, visto: 0, congelado: null, tmo: false }; bloco = zeraBloco(); };
  zeraCiclo();
  let r, ultimoScore = null;
  for (const l of linhas) {
    if (vistas.has(l)) continue;
    vistas.add(l);
    const c = l.split('\t');
    const msg = c[4] ?? '';
    if (msg === 'Aguardando digitação do identificador do eleitor' || msg === 'Identificador do eleitor digitado pelo mesário') zeraCiclo();
    else if ((r = RE_SOLICITA.exec(msg))) { if (r[1] === '1') bloco = zeraBloco(); bloco.sol.add(r[1]); s.m[r[2]] = (s.m[r[2]] ?? 0) + (r[1] === '1' ? 1 : 0); }
    else if ((r = RE_CAPTURADA.exec(msg))) { bloco.cap.add(r[1]); s.tentEleitor.cap++; }
    else if ((r = RE_TIMEOUT.exec(msg))) { bloco.tout.add(r[1]); s.tentEleitor.tout++; ciclo.tmo = true; }
    else if (msg === 'Solicitação de dado pessoal do eleitor para habilitação manual') { ciclo.congelado = { sol: bloco.sol.size, cap: bloco.cap.size, tout: bloco.tout.size }; if (opc.ano2022) ciclo.dado = true; }
    else if (msg.startsWith('Tipo de habilitação do eleitor [') && msg.includes('[biométrica]')) ciclo.bio = true;
    else if (msg.startsWith('Ano de nascimento digitado é igual ao do cadastro') || (opc.ano2022 && msg === 'O eleitor não possui biometria')) ciclo.ano = true;
    else if (msg === 'Dado digitado confere') ciclo.dado = true;
    else if ((r = RE_MES.exec(msg))) { ciclo.nMes++; ciclo.mes = r[1]; }
    else if (msg.startsWith(NOVO)) ciclo.novo++;
    else if (msg.startsWith(VISTO)) ciclo.visto++;
    else if ((r = RE_SCORE.exec(msg))) { s.scoresR.n++; s.scoresR.soma += Number(r[1]); ultimoScore = Number(r[1]); }
    else if (msg.startsWith('Biometria coletada não é do mesário')) { s.mesCmp.n++; if (ultimoScore === 0) s.mesCmp.zero++; }
    else if ((r = RE_SCORE4.exec(msg))) {
      const mx = Math.max(+r[1], +r[2], +r[3], +r[4]);
      s.scores.n++; s.scores.soma += mx; if (mx === 0) s.scores.zero++;
      s.scores.hist[Math.min(10, Math.floor(mx / 10))]++;
    }
    else if (/^Mesário \d+ registrado$/.test(msg)) s.mesarios.registrados++;
    else if (msg === 'Registrando mesários antes da votação') s.mesarios.registroAntes++;
    else if (msg === 'Registrando mesários durante a votação') s.mesarios.registroDurante++;
    else if (ERRO_LEITOR.test(msg)) s.errosLeitor++;
    else if (msg === 'O voto do eleitor foi computado') {
      s.votos++;
      const hora = l.slice(11, 16);
      if (!s.primeiroVoto || hora < s.primeiroVoto) s.primeiroVoto = hora;
      if (!s.ultimoVoto || hora > s.ultimoVoto) s.ultimoVoto = hora;
      if (ciclo.bio) { s.R++; if (ciclo.tmo) s.bioTmo++; }
      else if (ciclo.ano) s.ano++;
      else if (ciclo.dado) {
        s.F++;
        const cg = ciclo.congelado;
        if (!cg) s.semBloco++; else s.cap[Math.min(cg.cap, 4)]++;
        const marcas = (ciclo.nMes > 0) + (ciclo.novo > 0) + (ciclo.visto > 0);
        let a;
        if (marcas > 1) a = 'multi'; else if (ciclo.nMes) a = 'mes'; else if (ciclo.novo) a = 'novo'; else if (ciclo.visto) a = 'visto'; else a = 'nenhuma';
        s.aut[a]++;
        if (cg && cg.cap === 0) s.aut0[a === 'mes' || a === 'novo' || a === 'visto' ? a : 'outra']++;
        if (opc.detalhe && a === 'mes') {
          if (!titulos.has(ciclo.mes)) titulos.set(ciclo.mes, `M${titulos.size + 1}`);
          const k = titulos.get(ciclo.mes); s.autores[k] = (s.autores[k] ?? 0) + 1;
        }
      }
      if (opc.detalhe) {
        const h = hora.slice(0, 2);
        const ph = (s.porHora[h] ??= { R: 0, F: 0, F0: 0, outros: 0 });
        if (ciclo.bio) ph.R++; else if (!ciclo.ano && ciclo.dado) { ph.F++; if (ciclo.congelado && ciclo.congelado.cap === 0) ph.F0++; } else ph.outros++;
        if (ciclo.bio) s.seqF += 'R'; else if (!ciclo.ano && ciclo.dado) s.seqF += 'F';
      }
      zeraCiclo();
    }
  }
  titulos.clear();
}
/** Teste de rachas (Wald-Wolfowitz) para a sequência R/F: z < −3 = falhas em blocos. */
export function rachas(seq) {
  const n1 = [...seq].filter((c) => c === 'F').length, n2 = seq.length - n1;
  if (n1 < 2 || n2 < 2) return { z: null, maior: 0 };
  let runs = 1, maior = seq[0] === 'F' ? 1 : 0, atual = maior;
  for (let i = 1; i < seq.length; i++) {
    if (seq[i] !== seq[i - 1]) runs++;
    atual = seq[i] === 'F' ? (seq[i - 1] === 'F' ? atual + 1 : 1) : 0;
    maior = Math.max(maior, atual);
  }
  const n = n1 + n2, mu = (2 * n1 * n2) / n + 1, v = (2 * n1 * n2 * (2 * n1 * n2 - n)) / (n * n * (n - 1));
  return { z: (runs - mu) / Math.sqrt(v), maior };
}
