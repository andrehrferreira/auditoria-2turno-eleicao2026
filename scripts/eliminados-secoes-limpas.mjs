// Para onde foram os votos dos eliminados? Teste direto, sem regressão.
// Usa só seções "limpas": comparecimento e brancos/nulos quase iguais nos dois turnos (|Δ| ≤ 1% dos aptos cada).
// Nelas, o ganho de 13 e de 22 só pode vir dos eliminados (ou de troca entre os finalistas).
// Agrupa as seções pelo eliminado que teve mais votos e pela parcela dos eliminados no 1º turno.
// Uso: node scripts/eliminados-secoes-limpas.mjs [uf ...]
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { resumirSecao } from '../src/analises.js';
import { DIR_DADOS, UFS } from '../src/config.js';

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

const NOMES = { 14: 'Renan Santos', 55: 'Caiado', 70: 'Augusto Cury', 30: 'Zema' };
const grupos = {};
const somar = (g, s) => {
  const o = (grupos[g] ??= { secoes: 0, eliminados: 0, ganho13: 0, ganho22: 0, dComp: 0, dBN: 0 });
  o.secoes++;
  for (const k of ['eliminados', 'ganho13', 'ganho22', 'dComp', 'dBN']) o[k] += s[k];
};

const ufs = process.argv.slice(2).length ? process.argv.slice(2) : UFS;
let total = 0;
for (const uf of ufs) {
  const [p1, p2] = [await perfis(1, uf), await perfis(2, uf)];
  if (!p1 || !p2) { console.error(`[${uf}] sem perfil de um dos turnos: pulada`); continue; }
  for (const [k, s2] of p2) {
    const s1 = p1.get(k);
    if (!s1 || !s2 || s1.tipoUrna === 3 || s2.tipoUrna === 3 || !s1.aptos) continue;
    total++;
    const bn = (v) => (v.branco ?? 0) + (v.nulo ?? 0);
    const elim = Object.entries(s1.votos).filter(([n]) => /^\d+$/.test(n) && n !== '13' && n !== '22');
    const eliminados = elim.reduce((a, [, v]) => a + v, 0);
    const dComp = s2.comparecimento - s1.comparecimento;
    const dBN = bn(s2.votos) - bn(s1.votos);
    if (Math.abs(dComp) > 0.01 * s1.aptos || Math.abs(dBN) > 0.01 * s1.aptos || eliminados < 10) continue;
    const s = { eliminados, ganho13: (s2.votos['13'] ?? 0) - (s1.votos['13'] ?? 0), ganho22: (s2.votos['22'] ?? 0) - (s1.votos['22'] ?? 0), dComp, dBN };
    const [dominante] = elim.sort((a, b) => b[1] - a[1])[0];
    somar(`dominante: ${NOMES[dominante] ?? `outro (${dominante})`}`, s);
    const parcela = eliminados / s1.comparecimento;
    somar(`eliminados ${parcela < 0.05 ? '< 5%' : parcela < 0.1 ? '5–10%' : parcela < 0.2 ? '10–20%' : '≥ 20%'} dos votos da seção`, s);
    somar(`UF ${uf}`, s);
    somar('TODAS AS SEÇÕES LIMPAS', s);
  }
}

console.log(`Seções comparadas: ${total}. Limpas (|Δcomparecimento| e |Δbrancos/nulos| ≤ 1% dos aptos, ≥ 10 votos de eliminados): ${grupos['TODAS AS SEÇÕES LIMPAS']?.secoes ?? 0}\n`);
console.log('grupo'.padEnd(42) + 'seções'.padStart(8) + 'eliminados'.padStart(12) + 'ganho 13'.padStart(11) + 'ganho 22'.padStart(11) + '  parcela 13 / 22 do que os eliminados liberaram');
for (const [g, o] of Object.entries(grupos).sort((a, b) => (a[0].startsWith('UF') - b[0].startsWith('UF')) || a[0].localeCompare(b[0]))) {
  const soma = o.ganho13 + o.ganho22;
  console.log(g.padEnd(42) + String(o.secoes).padStart(8) + String(o.eliminados).padStart(12) + String(o.ganho13).padStart(11) + String(o.ganho22).padStart(11) + `  ${(100 * o.ganho13 / soma).toFixed(1)}% / ${(100 * o.ganho22 / soma).toFixed(1)}%   (Δcomp ${o.dComp}, Δbr/nulo ${o.dBN})`);
}
