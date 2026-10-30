import { createReadStream } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DIR_DADOS } from '../../src/config.js';

// Revisão cética nº 24. O engenheiro acha 7 zonas com excesso de trocas NOVAS de urna no 2º turno (Poisson contra a taxa
// da UF, Bonferroni) e sustenta a explicação benigna "urna velha falha mais" com uma taxa por modelo de denominador
// aproximado. Aqui a explicação é TESTADA: o esperado de cada zona passa a ser a soma, seção a seção, da taxa nacional de
// troca nova do modelo da urna que a seção usou no 1º turno (BU do 1º turno, .vsc). Mesma definição de troca nova:
// 2º turno com urna reserva (tipo 4 ou 6) e nº interno diferente do 1º turno. Universo: seções com urna nos dois turnos
// (SA de fora). Bonferroni pelo nº de zonas.
// Entrada: secoes.jsonl de integridade-resumo.mjs (2t e 1t-identificadores). Uso: node scripts/auditoria/cetico-integridade-trocas-modelo.mjs

const INT = path.join(DIR_DADOS, 'parsed', 'auditoria', 'integridade');
async function ler(arq) {
  const m = new Map();
  for await (const l of createInterface({ input: createReadStream(arq), crlfDelay: Infinity })) {
    if (!l) continue;
    const c = JSON.parse(l);
    if (!c.sa) m.set(c.k, { tipo: c.tipo, urna: c.urnaBU, modelo: c.modeloVsc });
  }
  return m;
}
const s1 = await ler(path.join(INT, '1t-identificadores', 'secoes.jsonl'));
const s2 = await ler(path.join(INT, '2t', 'secoes.jsonl'));
const porModelo = {};
const secoes = [];
for (const [k, b] of s2) {
  const a = s1.get(k);
  if (!a) continue;
  const nova = (b.tipo === 4 || b.tipo === 6) && b.urna !== a.urna;
  const m = (porModelo[a.modelo] ??= { secoes: 0, novas: 0 });
  m.secoes++;
  if (nova) m.novas++;
  secoes.push({ z: k.split('/').slice(0, 3).join('/'), modelo: a.modelo, nova });
}
for (const m of Object.values(porModelo)) m.taxa = m.novas / m.secoes;
const zonas = new Map();
for (const s of secoes) {
  const z = zonas.get(s.z) ?? { secoes: 0, novas: 0, esperado: 0, modelos: {} };
  z.secoes++;
  if (s.nova) z.novas++;
  z.esperado += porModelo[s.modelo].taxa;
  z.modelos[s.modelo] = (z.modelos[s.modelo] ?? 0) + 1;
  zonas.set(s.z, z);
}
// P(X >= k), X ~ Poisson(l)
function cauda(k, l) {
  if (k <= 0) return 1;
  let termo = Math.exp(-l);
  let acum = termo;
  for (let i = 1; i < k; i++) { termo *= l / i; acum += termo; }
  return Math.max(0, 1 - acum);
}
const nZ = zonas.size;
const lista = [...zonas].map(([z, v]) => ({ z, ...v, esperado: Number(v.esperado.toFixed(2)), p: cauda(v.novas, v.esperado) }))
  .map((x) => ({ ...x, pB: Math.min(1, x.p * nZ) })).sort((a, b) => a.p - b.p);
console.log('Taxa de troca nova no 2º turno pelo modelo da urna do 1º turno (universo: seções com urna nos dois turnos):');
console.table(Object.entries(porModelo).map(([m, v]) => ({ modelo: m, secoes: v.secoes, novas: v.novas, porMil: (1000 * v.taxa).toFixed(2) })));
console.log(`Seções: ${secoes.length}; trocas novas: ${secoes.filter((s) => s.nova).length}; zonas: ${nZ}`);
console.log(`Zonas com p Bonferroni < 0,05 (esperado ajustado pelo modelo): ${lista.filter((x) => x.pB < 0.05).length}`);
console.table(lista.slice(0, 12).map((x) => ({ zona: x.z, secoes: x.secoes, novas: x.novas, esperado: x.esperado, p: x.p.toExponential(2), pBonferroni: x.pB.toExponential(2), modelos: JSON.stringify(x.modelos) })));
