// Estima, por regressão ecológica de Goodman sobre as seções, para onde foi cada grupo de eleitores do 1º turno.
// Uso: node scripts/transferencia-votos.mjs [uf ...]   (padrão: todas as UFs com perfil nos dois turnos)
//
// Para cada destino do 2º turno (13, 22, branco+nulo, abstenção), ajusta por mínimos quadrados sem intercepto:
//   destino_2T(seção) = Σ_k  taxa_k × origem_k_1T(seção)
// com origens = 13, 22, 14, 55, 70, demais eliminados, branco+nulo e abstenção do 1º turno (em eleitores).
// A taxa_k estima a fração da origem k que foi para o destino. É estimativa ecológica: supõe taxas iguais entre
// seções do mesmo conjunto (falácia ecológica). Por isso roda também por UF, para ver se as taxas se sustentam.
// Linhas de base: as taxas de cada origem devem somar ~1 entre os quatro destinos.
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { resumirSecao } from '../src/analises.js';
import { DIR_DADOS, UFS } from '../src/config.js';

const ORIGENS = ['13', '22', '14', '55', '70', 'outros', 'brancoNulo', 'abstencao'];
const DESTINOS = ['13', '22', 'brancoNulo', 'abstencao'];

async function perfis(turno, uf) {
  const m = new Map();
  try {
    for await (const l of createInterface({ input: createReadStream(path.join(DIR_DADOS, 'parsed', `${turno}t`, 'perfil', `${uf}.jsonl`)) })) {
      if (!l.trim()) continue;
      const s = resumirSecao(JSON.parse(l));
      const k = `${s.municipio}/${s.zona}/${s.secao}`;
      m.set(k, m.has(k) ? null : s); // seção com mais de um pacote fica fora
    }
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
  return m;
}

function origens(s) {
  const v = s.votos;
  const nominal = Object.entries(v).filter(([k]) => /^\d+$/.test(k));
  const conhecidos = ['13', '22', '14', '55', '70'];
  return [
    v['13'] ?? 0, v['22'] ?? 0, v['14'] ?? 0, v['55'] ?? 0, v['70'] ?? 0,
    nominal.filter(([k]) => !conhecidos.includes(k)).reduce((a, [, n]) => a + n, 0),
    (v.branco ?? 0) + (v.nulo ?? 0),
    Math.max(0, (s.aptos ?? 0) - s.comparecimento),
  ];
}
const destinos = (s) => [s.votos['13'] ?? 0, s.votos['22'] ?? 0, (s.votos.branco ?? 0) + (s.votos.nulo ?? 0), Math.max(0, (s.aptos ?? 0) - s.comparecimento)];

/** Resolve A x = b por eliminação de Gauss com pivoteamento parcial. */
export function resolver(A, b) {
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

/** Acumula X'X e X'y de cada destino para ajustar depois (uma passada nos dados). */
function acumulador() {
  const k = ORIGENS.length;
  return { n: 0, xtx: Array.from({ length: k }, () => new Array(k).fill(0)), xty: DESTINOS.map(() => new Array(k).fill(0)), totX: new Array(k).fill(0), totY: new Array(DESTINOS.length).fill(0) };
}
function somar(acc, x, y) {
  acc.n++;
  for (let i = 0; i < x.length; i++) {
    acc.totX[i] += x[i];
    for (let j = 0; j < x.length; j++) acc.xtx[i][j] += x[i] * x[j];
    for (let d = 0; d < y.length; d++) acc.xty[d][i] += x[i] * y[d];
  }
  for (let d = 0; d < y.length; d++) acc.totY[d] += y[d];
}
function ajustar(acc) {
  const taxas = DESTINOS.map((_, d) => resolver(acc.xtx, acc.xty[d]));
  return Object.fromEntries(ORIGENS.map((o, i) => [o, Object.fromEntries(DESTINOS.map((d, j) => [d, +taxas[j][i].toFixed(3)]))]));
}

const ufs = process.argv.slice(2).length ? process.argv.slice(2) : UFS;
const nacional = acumulador();
const porUf = {};
for (const uf of ufs) {
  const [p1, p2] = [await perfis(1, uf), await perfis(2, uf)];
  if (!p1 || !p2) { console.error(`[${uf}] sem perfil de um dos turnos: pulada`); continue; }
  const acc = acumulador();
  for (const [k, s2] of p2) {
    const s1 = p1.get(k);
    if (!s1 || !s2 || s1.tipoUrna === 3 || s2.tipoUrna === 3) continue;
    const x = origens(s1);
    const y = destinos(s2);
    somar(acc, x, y);
    somar(nacional, x, y);
  }
  porUf[uf] = { secoes: acc.n, taxas: ajustar(acc) };
}

const fmt = (t) => ORIGENS.map((o) => `  ${o.padEnd(11)} → 13: ${String(t[o]['13']).padStart(6)}  22: ${String(t[o]['22']).padStart(6)}  br/nulo: ${String(t[o].brancoNulo).padStart(6)}  abstenção: ${String(t[o].abstencao).padStart(6)}  soma: ${(t[o]['13'] + t[o]['22'] + t[o].brancoNulo + t[o].abstencao).toFixed(2)}`).join('\n');
const tN = ajustar(nacional);
console.log(`NACIONAL (${nacional.n} seções, ${Object.keys(porUf).length} UFs)\nTotais 1T: ${ORIGENS.map((o, i) => `${o}=${nacional.totX[i]}`).join(' ')}\nTotais 2T: ${DESTINOS.map((d, i) => `${d}=${nacional.totY[i]}`).join(' ')}\n${fmt(tN)}`);
console.log('\nPOR UF: taxa de 22 do 1T → 13 no 2T, e de 55/14/70 → 13');
for (const [uf, r] of Object.entries(porUf)) {
  console.log(`  ${uf} (${r.secoes}): 22→13 ${r.taxas['22']['13']}  13→22 ${r.taxas['13']['22']}  55→13 ${r.taxas['55']['13']}  14→13 ${r.taxas['14']['13']}  70→13 ${r.taxas['70']['13']}  abst→13 ${r.taxas.abstencao['13']}  abst→22 ${r.taxas.abstencao['22']}`);
}
