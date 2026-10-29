// Separa "desvio da urna" de "transferência dos eliminados" pela proporção, em seções limpas.
// Seção limpa: |Δcomparecimento| e |Δbrancos/nulos| ≤ 1% dos aptos (sem outra fonte de voto).
// Modelo sem intercepto, por mínimos quadrados, em eleitores:
//   Δ13 = a·eliminados + b·votos22_1T + c·votos13_1T
//   Δ22 = d·eliminados + e·votos22_1T + f·votos13_1T
// Desvio de x% dos votos do 22 para o 13: b ≈ +x, e ≈ −x (proporcional à base do 22).
// Transferência dos eliminados: a e d somam ~1, divididos; b e e ≈ 0.
// Premissa do auditor (eliminado não vai para o 13): a ≈ 0 e d ≈ 1; aí o ganho do 13 teria de vir de b > 0.
// Bootstrap por município para o intervalo. Uso: node scripts/separa-desvio-de-transferencia.mjs [uf ...]
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { resumirSecao } from '../src/analises.js';
import { DIR_DADOS, UFS } from '../src/config.js';

/** Resolve A x = b por eliminação de Gauss com pivoteamento parcial. */
function resolver(A, b) {
  const n = b.length;
  const M = A.map((linha, i) => [...linha, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c || M[c][c] === 0) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((linha, i) => linha[n] / linha[i]);
}

async function perfis(turno, uf) {
  const m = new Map();
  try {
    for await (const l of createInterface({ input: createReadStream(path.join(DIR_DADOS, 'parsed', `${turno}t`, 'perfil', `${uf}.jsonl`)) })) {
      if (!l.trim()) continue;
      const s = resumirSecao(JSON.parse(l));
      const k = `${s.municipio}/${s.zona}/${s.secao}`;
      m.set(k, m.has(k) ? null : s);
    }
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
  return m;
}

const linhas = [];
const ufs = process.argv.slice(2).length ? process.argv.slice(2) : UFS;
for (const uf of ufs) {
  const [p1, p2] = [await perfis(1, uf), await perfis(2, uf)];
  if (!p1 || !p2) { console.error(`[${uf}] sem perfil de um dos turnos: pulada`); continue; }
  for (const [k, s2] of p2) {
    const s1 = p1.get(k);
    if (!s1 || !s2 || s1.tipoUrna === 3 || s2.tipoUrna === 3 || !s1.aptos) continue;
    const bn = (v) => (v.branco ?? 0) + (v.nulo ?? 0);
    if (Math.abs(s2.comparecimento - s1.comparecimento) > 0.01 * s1.aptos || Math.abs(bn(s2.votos) - bn(s1.votos)) > 0.01 * s1.aptos) continue;
    const elim = Object.entries(s1.votos).filter(([n]) => /^\d+$/.test(n) && n !== '13' && n !== '22').reduce((a, [, v]) => a + v, 0);
    const [l1, f1] = [s1.votos['13'] ?? 0, s1.votos['22'] ?? 0];
    linhas.push({ uf, mun: `${uf}/${s1.municipio}`, x: [elim, f1, l1], dl: (s2.votos['13'] ?? 0) - l1, df: (s2.votos['22'] ?? 0) - f1 });
  }
}

function ajustar(lista) {
  const xtx = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const xl = [0, 0, 0];
  const xf = [0, 0, 0];
  for (const { x, dl, df } of lista) for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) xtx[i][j] += x[i] * x[j];
    xl[i] += x[i] * dl;
    xf[i] += x[i] * df;
  }
  const [a, b, c] = resolver(xtx, xl);
  const [d, e, f] = resolver(xtx, xf);
  return { a, b, c, d, e, f };
}

// bootstrap por município (semente fixa)
let semente = 777;
// mulberry32: aritmética inteira de 32 bits (o LCG anterior estourava a precisão do double e ciclava em ~10 mil)
const aleatorio = () => {
  semente = (semente + 0x6d2b79f5) | 0;
  let t = Math.imul(semente ^ (semente >>> 15), 1 | semente);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const porMun = new Map();
for (const l of linhas) {
  if (!porMun.has(l.mun)) porMun.set(l.mun, []);
  porMun.get(l.mun).push(l);
}
const municipios = [...porMun.values()];
const amostras = [];
for (let r = 0; r < 200; r++) {
  const lista = [];
  for (let i = 0; i < municipios.length; i++) lista.push(...municipios[Math.floor(aleatorio() * municipios.length)]);
  amostras.push(ajustar(lista));
}
const ic = (k) => {
  const v = amostras.map((s) => s[k]).sort((p, q) => p - q);
  return `[${v[5].toFixed(3)}; ${v[194].toFixed(3)}]`;
};

const r = ajustar(linhas);
console.log(`${linhas.length} seções limpas em ${municipios.length} municípios (${new Set(linhas.map((l) => l.uf)).size} UFs)\n`);
console.log('                              coeficiente   IC 95% (bootstrap por município)');
console.log(`eliminados → 13          a = ${r.a.toFixed(3).padStart(7)}     ${ic('a')}`);
console.log(`eliminados → 22          d = ${r.d.toFixed(3).padStart(7)}     ${ic('d')}`);
console.log(`base do 22 → 13 (desvio) b = ${r.b.toFixed(3).padStart(7)}     ${ic('b')}`);
console.log(`base do 22 → 22 (perda)  e = ${r.e.toFixed(3).padStart(7)}     ${ic('e')}`);
console.log(`base do 13 → 13          c = ${r.c.toFixed(3).padStart(7)}     ${ic('c')}`);
console.log(`base do 13 → 22          f = ${r.f.toFixed(3).padStart(7)}     ${ic('f')}`);
const tot = linhas.reduce((s, l) => ({ e: s.e + l.x[0], f: s.f + l.x[1], l: s.l + l.x[2], dl: s.dl + l.dl, df: s.df + l.df }), { e: 0, f: 0, l: 0, dl: 0, df: 0 });
console.log(`\nTotais: eliminados ${tot.e}, 22 no 1T ${tot.f}, 13 no 1T ${tot.l}; Δ13 ${tot.dl}, Δ22 ${tot.df}`);
console.log(`Ganho do 13 explicado: por eliminados ${(r.a * tot.e).toFixed(0)}, pela base do 22 ${(r.b * tot.f).toFixed(0)}, pela base do 13 ${(r.c * tot.l).toFixed(0)}`);
