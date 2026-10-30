import { createReadStream } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DIR_DADOS } from '../../src/config.js';

// H14 (engenheiro de segurança): funções comuns aos scripts seguranca-h14-*.mjs.

export const DIR_H14 = path.join(DIR_DADOS, 'parsed', 'auditoria', 'reservas-rastro');
export const DIR_INT = path.join(DIR_DADOS, 'parsed', 'auditoria', 'integridade');
export const DIR_ENG = path.join(DIR_DADOS, 'parsed', 'auditoria', 'engenheiro-seguranca-urna');

/** Lê um .jsonl linha a linha. */
export async function* linhasJsonl(arq) {
  for await (const l of createInterface({ input: createReadStream(arq), crlfDelay: Infinity })) if (l) yield JSON.parse(l);
}

/** Grupos de comparação (ordem dos gráficos e tabelas). */
export const GRUPOS = [
  { id: 'controle', nome: 'Controle: mesma urna de seção nos dois turnos, sem recarga' },
  { id: 'h14Antes', nome: 'H14 entre turnos: reserva assumiu antes de 25/10' },
  { id: 'h14Dia', nome: 'H14 no dia: reserva assumiu em 25/10' },
];
export const OUTROS_GRUPOS = [
  { id: 'h14SemRegistro', nome: 'H14 sem contingência no log da reserva' },
  { id: 'herdada', nome: 'Reserva do 1º turno mantida no 2º (mesma urna)' },
  { id: 'secaoSecao', nome: 'Outra urna de seção no 2º turno (sem contingência)' },
  { id: 'recarga', nome: 'Mesma urna, recarregada entre os turnos' },
  { id: 'outro', nome: 'Outras combinações' },
];
export const ehH14 = (g) => g === 'h14Antes' || g === 'h14Dia' || g === 'h14SemRegistro';

const lnFat = (() => {
  const c = [0];
  return (n) => {
    for (let i = c.length; i <= n; i++) c[i] = c[i - 1] + Math.log(i);
    return c[n];
  };
})();
const lnHiper = (a, b, c, d) => lnFat(a + b) + lnFat(c + d) + lnFat(a + c) + lnFat(b + d) - lnFat(a + b + c + d) - lnFat(a) - lnFat(b) - lnFat(c) - lnFat(d);

/** Teste exato de Fisher bilateral para a tabela [[a, b], [c, d]] (a = casos no grupo, b = não casos no grupo…). */
export function fisher(a, b, c, d) {
  const r1 = a + b;
  const c1 = a + c;
  const n = a + b + c + d;
  const pObs = lnHiper(a, b, c, d);
  let p = 0;
  for (let x = Math.max(0, r1 + c1 - n); x <= Math.min(r1, c1); x++) {
    const lp = lnHiper(x, r1 - x, c1 - x, n - r1 - c1 + x);
    if (lp <= pObs + 1e-7) p += Math.exp(lp);
  }
  return Math.min(1, p);
}

/** Intervalo de Wilson 95% para k em n. */
export function wilson(k, n, z = 1.96) {
  if (!n) return [null, null];
  const p = k / n;
  const den = 1 + (z * z) / n;
  const centro = (p + (z * z) / (2 * n)) / den;
  const meia = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / den;
  return [Math.max(0, centro - meia), Math.min(1, centro + meia)];
}

/** Diferença de proporções (grupo − controle) com IC 95% de Newcombe (método 10). */
export function difProporcoes(k1, n1, k2, n2) {
  const p1 = k1 / n1;
  const p2 = k2 / n2;
  const [l1, u1] = wilson(k1, n1);
  const [l2, u2] = wilson(k2, n2);
  const d = p1 - p2;
  return { d, ic: [d - Math.sqrt((p1 - l1) ** 2 + (u2 - p2) ** 2), d + Math.sqrt((u1 - p1) ** 2 + (p2 - l2) ** 2)] };
}

/** Comparação de uma característica binária entre um grupo e o controle. */
export function comparar(k1, n1, k2, n2) {
  const { d, ic } = difProporcoes(k1, n1, k2, n2);
  return { grupo: { k: k1, n: n1, taxa: k1 / n1 }, controle: { k: k2, n: n2, taxa: k2 / n2 }, dif: d, ic95: ic, pFisher: fisher(k1, n1 - k1, k2, n2 - k2), razao: k2 ? (k1 / n1) / (k2 / n2) : null };
}

/** Média, desvio e IC 95% de uma lista de números. */
export function media(xs) {
  const n = xs.length;
  if (!n) return { n: 0, media: null, dp: null, ep: null };
  const m = xs.reduce((s, x) => s + x, 0) / n;
  const v = n > 1 ? xs.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1) : 0;
  return { n, media: m, dp: Math.sqrt(v), ep: Math.sqrt(v / n) };
}

/** Diferença de médias (Welch) com IC 95% (aproximação normal; n grandes). */
export function difMedias(xs, ys) {
  const a = media(xs);
  const b = media(ys);
  const ep = Math.sqrt(a.ep ** 2 + b.ep ** 2);
  const d = a.media - b.media;
  const z = ep ? d / ep : 0;
  return { grupo: a, controle: b, dif: d, ic95: [d - 1.96 * ep, d + 1.96 * ep], z, p: 2 * (1 - normalCdf(Math.abs(z))) };
}

export function normalCdf(z) {
  // Abramowitz-Stegun 7.1.26
  const t = 1 / (1 + 0.3275911 * (z / Math.SQRT2));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return 0.5 * (1 + y);
}

export const pct = (x, casas = 2) => (x === null || x === undefined || Number.isNaN(x) ? '—' : `${(100 * x).toFixed(casas).replace('.', ',')}%`);
export const num = (x) => (x === null || x === undefined ? '—' : x.toLocaleString('pt-BR'));
export const fmtP = (p) => (p === null || p === undefined ? '—' : p < 1e-4 ? p.toExponential(1).replace('.', ',') : p.toFixed(4).replace('.', ','));

// "dd/mm/aaaa hh:mm:ss" ou "aaaammddThhmmss" → segundos UTC (sem fuso; só para diferenças)
export function seg(dh) {
  if (!dh) return null;
  if (/^\d{8}T\d{6}$/.test(dh)) return Date.UTC(+dh.slice(0, 4), +dh.slice(4, 6) - 1, +dh.slice(6, 8), +dh.slice(9, 11), +dh.slice(11, 13), +dh.slice(13, 15)) / 1000;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})(?: -)? (\d{2}):(\d{2})(?::(\d{2}))?/.exec(dh);
  if (!m) return null;
  return Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +(m[6] ?? 0)) / 1000;
}
export const diaDe = (dh) => (dh && /^\d{8}T/.test(dh) ? `${dh.slice(6, 8)}/${dh.slice(4, 6)}/${dh.slice(0, 4)}` : dh?.slice(0, 10) ?? null);
