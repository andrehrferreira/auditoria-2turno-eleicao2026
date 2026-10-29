// Revisor cético (vsla): resume a calibração da H0 do autor (taxa de liberação manual da urna final aplicada à urna
// substituída da mesma seção), por modelo de urna e por tamanho do segmento. Entrada: saída de
// cetico-vsla-alternativas.mjs --nacional. Modelo da urna: banco (secao.modelo_urna pelo nº interno, 1º ou 2º turno).
// Uso: node scripts/auditoria/cetico-vsla-calibracao.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
const D = 'data/parsed/auditoria/cetico/vsla';
const cal = JSON.parse(readFileSync(`${D}/nacional-calibracao.json`, 'utf8'));
const db = new DatabaseSync('data/db/eleicao2026.sqlite', { readOnly: true });
// um único varrimento da tabela (sem índice em numero_interno_urna)
const MODELO = new Map(db.prepare('SELECT DISTINCT numero_interno_urna AS u, modelo_urna AS m FROM secao').all().map((r) => [r.u, r.m]));
const modelo = (u) => MODELO.get(Number(u)) ?? 'desconhecido';
const grupos = new Map();
for (const c of cal) {
  c.modelo = modelo(c.urna);
  for (const k of [c.modelo, 'todos']) {
    const g = grupos.get(k) ?? { segmentos: 0, p1e9: 0, curtos: 0, curtos85: 0, manual: 0, n: 0 };
    g.segmentos++; if (c.p < 1e-9) g.p1e9++; g.manual += c.manual; g.n += c.n;
    if (c.n >= 8 && c.n <= 30) { g.curtos++; if (c.frac >= 12 / 13 - 1e-9) g.curtos85++; }
    grupos.set(k, g);
  }
}
console.log('modelo | segmentos de urna substituída | p<1e-9 (H0 do autor) | taxa manual agregada | segmentos 8–30 votos | desses, ≥12/13 manual');
for (const [k, g] of grupos) console.log(`${k} | ${g.segmentos} | ${g.p1e9} (${(100 * g.p1e9 / g.segmentos).toFixed(1)}%) | ${(100 * g.manual / g.n).toFixed(1)}% | ${g.curtos} | ${g.curtos85}`);
const curtos = cal.filter((c) => c.n >= 8 && c.n <= 30 && c.frac >= 12 / 13 - 1e-9).sort((a, b) => a.p - b.p);
console.log('\nSegmentos de 8 a 30 votos com fração manual ≥ 12/13 (todos COM log):');
for (const c of curtos) console.log(`  ${c.onde} urna ${c.urna} (${c.modelo}): ${c.manual}/${c.n} · ref ${(100 * c.pRef).toFixed(1)}% · p=${c.p.toExponential(2)}`);
const faixa = [...new Set([...MODELO].filter(([u]) => u >= 1650000 && u <= 1690000).map(([, m]) => m))];
console.log(`\nModelos com nº interno entre 01650000 e 01690000 no banco: ${faixa.join(', ')} (01681986, urna sem log da BA, cai nessa faixa; não aparece no banco)`);
writeFileSync(`${D}/calibracao-resumo.json`, JSON.stringify({ grupos: Object.fromEntries(grupos), curtos }, null, 1));
