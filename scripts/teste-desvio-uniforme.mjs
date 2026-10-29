// Teste da premissa "eleitor dos eliminados não iria para Lula" (pedido do auditor, 29/10/2026).
// Se a premissa vale, o resultado oficial só fecha com a urna gravando 13 para parte de quem digitou 22, em todo o país.
// Esse desvio deixa marca onde não há outra fonte de voto: em seções com quase nenhum voto de eliminado e sem mudança
// de comparecimento nem de brancos/nulos, Flávio apareceria PERDENDO votos e Lula ganhando, na proporção do desvio.
// Sem desvio, os dois ficam quase parados (só ruído de troca de eleitores).
// Uso: node scripts/teste-desvio-uniforme.mjs [uf ...]
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

const FAIXAS = [['eliminados = 0', 0, 0], ['até 1%', 1e-9, 0.01], ['1–2%', 0.01, 0.02], ['2–4%', 0.02, 0.04]];
const acc = Object.fromEntries(FAIXAS.map(([n]) => [n, { secoes: 0, elim: 0, f1: 0, l1: 0, df: 0, dl: 0, perdeuF: 0 }]));
// Teste de simetria: desvio do software faria o 22 perder em todo lugar, inclusive no reduto dele, e o 13 nunca perder;
// renovação de eleitores faz o dominante local crescer e o minoritário encolher, para os dois lados.
const REDUTOS = [['reduto 13 (13 ≥ 70% dos finalistas)', 0.7, 1.01], ['equilibrada (30–70%)', 0.3, 0.7], ['reduto 22 (13 < 30%)', 0, 0.3]];
const simetria = Object.fromEntries(REDUTOS.map(([n]) => [n, { secoes: 0, elim: 0, f1: 0, l1: 0, df: 0, dl: 0, perdeuF: 0, perdeuL: 0 }]));
const ufs = process.argv.slice(2).length ? process.argv.slice(2) : UFS;
for (const uf of ufs) {
  const [p1, p2] = [await perfis(1, uf), await perfis(2, uf)];
  if (!p1 || !p2) { console.error(`[${uf}] sem perfil de um dos turnos: pulada`); continue; }
  for (const [k, s2] of p2) {
    const s1 = p1.get(k);
    if (!s1 || !s2 || s1.tipoUrna === 3 || s2.tipoUrna === 3 || !s1.aptos || s1.comparecimento < 50) continue;
    const bn = (v) => (v.branco ?? 0) + (v.nulo ?? 0);
    const elim = Object.entries(s1.votos).filter(([n]) => /^\d+$/.test(n) && n !== '13' && n !== '22').reduce((a, [, v]) => a + v, 0);
    const dComp = s2.comparecimento - s1.comparecimento;
    const dBN = bn(s2.votos) - bn(s1.votos);
    if (Math.abs(dComp) > 0.005 * s1.aptos || Math.abs(dBN) > 0.005 * s1.aptos) continue;
    const parcela = elim / s1.comparecimento;
    const f1 = s1.votos['22'] ?? 0;
    const l1 = s1.votos['13'] ?? 0;
    const df = (s2.votos['22'] ?? 0) - f1;
    const dl = (s2.votos['13'] ?? 0) - l1;
    if (parcela < 0.04 && l1 + f1 > 0) {
      const r = REDUTOS.find(([, a, b]) => l1 / (l1 + f1) >= a && l1 / (l1 + f1) < b);
      const o = simetria[r[0]];
      o.secoes++; o.elim += elim; o.f1 += f1; o.l1 += l1; o.df += df; o.dl += dl;
      if (df < 0) o.perdeuF++;
      if (dl < 0) o.perdeuL++;
    }
    const faixa = FAIXAS.find(([, a, b]) => (a === 0 ? elim === 0 : parcela >= a && parcela < b));
    if (!faixa) continue;
    const o = acc[faixa[0]];
    o.secoes++; o.elim += elim; o.f1 += f1; o.l1 += l1; o.df += df; o.dl += dl;
    if (df < 0) o.perdeuF++;
  }
}
console.log('Seções sem mudança de comparecimento nem de brancos/nulos (|Δ| ≤ 0,5% dos aptos), ≥ 50 votantes.');
console.log('Se a urna desviasse x% dos votos do 22 para o 13, o 22 perderia ~x% dos seus votos nessas seções.\n');
console.log('votos de eliminados'.padEnd(20) + 'seções'.padStart(8) + 'eliminados'.padStart(12) + 'votos 22 (1T)'.padStart(15) + 'Δ22'.padStart(9) + 'Δ22/22'.padStart(9) + 'Δ13'.padStart(9) + '  seções em que 22 perdeu');
for (const [n] of FAIXAS) {
  const o = acc[n];
  if (!o.secoes) continue;
  console.log(n.padEnd(20) + String(o.secoes).padStart(8) + String(o.elim).padStart(12) + String(o.f1).padStart(15) + String(o.df).padStart(9) + `${((100 * o.df) / o.f1).toFixed(2)}%`.padStart(9) + String(o.dl).padStart(9) + `  ${o.perdeuF} (${((100 * o.perdeuF) / o.secoes).toFixed(0)}%)`);
}

console.log('\nSimetria (mesmas seções limpas, eliminados < 4%), por quem dominava no 1º turno:');
console.log('grupo'.padEnd(38) + 'seções'.padStart(8) + 'eliminados'.padStart(12) + 'Δ13/13'.padStart(9) + 'Δ22/22'.padStart(9) + '  13 perdeu em / 22 perdeu em');
for (const [n] of REDUTOS) {
  const o = simetria[n];
  if (!o.secoes) continue;
  console.log(n.padEnd(38) + String(o.secoes).padStart(8) + String(o.elim).padStart(12) + `${((100 * o.dl) / o.l1).toFixed(2)}%`.padStart(9) + `${((100 * o.df) / o.f1).toFixed(2)}%`.padStart(9) + `  ${((100 * o.perdeuL) / o.secoes).toFixed(0)}% / ${((100 * o.perdeuF) / o.secoes).toFixed(0)}%`);
}
