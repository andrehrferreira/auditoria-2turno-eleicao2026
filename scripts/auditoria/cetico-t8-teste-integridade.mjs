// Revisão cética do tópico 8, item "Teste de Integridade". (1) Refaz a conta (1 − x)^n do autor.
// (2) Alternativa fora do modelo do autor: desvio que só começa depois do k-ésimo voto da urna. Mede, no 2º turno inteiro
// (todas as seções, BU), que parte dos votos fica depois do k-ésimo voto da seção, para k na faixa de votos por urna do teste.
// Uso: node --max-old-space-size=8192 scripts/auditoria/cetico-t8-teste-integridade.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const ARQ = fileURLToPath(new URL('../../data/parsed/auditoria/cetico/t8-secoes.jsonl', import.meta.url));
console.log('(1) Chance de nenhuma divergência, (1 − x)^n');
for (const [n, rot] of [[156, 'TSE, 389 cédulas'], [1574, 'com biometria, 3.280 votantes'], [33930, 'comum nacional estimado']]) {
  console.log(`  ${rot.padEnd(32)} n=${n}: ` + [0.001, 0.005, 0.01, 0.023, 0.037, 0.05].map((x) => `x=${(100 * x).toFixed(1)}% → ${(Math.exp(n * Math.log1p(-x))).toExponential(1)}`).join('  '));
}
let tot = 0, tot22 = 0, n = 0;
const ks = [50, 100, 120, 150, 200, 250];
const depois = Object.fromEntries(ks.map((k) => [k, { v: 0, secoes: 0 }]));
const dist = [];
for (const l of readFileSync(ARQ, 'utf8').split('\n')) {
  if (!l) continue;
  const { b } = JSON.parse(l);
  if (b.tipo === 3) continue;
  n++; tot += b.comp; tot22 += b.f; dist.push(b.comp);
  for (const k of ks) if (b.comp > k) { depois[k].v += b.comp - k; depois[k].secoes++; }
}
dist.sort((a, c) => a - c);
console.log(`\n(2) 2º turno: ${n} seções, ${tot} votantes; votantes por seção: mediana ${dist[n >> 1]}, p10 ${dist[Math.floor(0.1 * n)]}, p90 ${dist[Math.floor(0.9 * n)]}`);
for (const k of ks) console.log(`  votos depois do ${k}º voto da seção: ${depois[k].v} (${((100 * depois[k].v) / tot).toFixed(1)}% de todos os votos; ${depois[k].secoes} seções)`);
console.log('  Desvio necessário para virar: 2.215.096 votos (metade da margem). Se o desvio só agisse depois do k-ésimo voto,');
for (const k of ks) console.log(`    k=${k}: precisaria desviar ${((100 * 2215096) / (depois[k].v * (tot22 / tot))).toFixed(1)}% dos votos do 22 dados depois do ${k}º voto`);

// (3) Rastro que esse desvio deixaria: o ganho líquido do 13 por votante cresceria com o tamanho da seção acima de k.
// Mede, dentro do município, o ganho líquido (Δ13 − Δ22) ÷ votantes do 2T por faixa de votantes (mesma urna nos dois turnos).
const S = [];
for (const l of readFileSync(ARQ, 'utf8').split('\n')) {
  if (!l) continue;
  const s = JSON.parse(l);
  const { a, b } = s;
  if (a.tipo === 3 || b.tipo === 3 || b.comp < 30) continue;
  S.push({ mun: `${s.uf}/${s.mun}`, comp: b.comp, x: (b.l - a.l - (b.f - a.f)) / b.comp, f2: b.f });
}
const porMun = new Map();
for (const s of S) { if (!porMun.has(s.mun)) porMun.set(s.mun, []); porMun.get(s.mun).push(s); }
const faixas = [[30, 150], [150, 200], [200, 250], [250, 300], [300, 350], [350, 2000]];
function porFaixa(lista) {
  const acc = faixas.map(() => ({ n: 0, peso: 0, soma: 0 }));
  const G = new Map();
  for (const s of lista) { if (!G.has(s.mun)) G.set(s.mun, []); G.get(s.mun).push(s); }
  for (const g of G.values()) {
    if (g.length < 2) continue;
    const m = g.reduce((t, s) => t + s.x * s.comp, 0) / g.reduce((t, s) => t + s.comp, 0);
    for (const s of g) { const i = faixas.findIndex(([lo, hi]) => s.comp >= lo && s.comp < hi); acc[i].n++; acc[i].peso += s.comp; acc[i].soma += (s.x - m) * s.comp; }
  }
  return acc.map((o) => ({ n: o.n, pp: (100 * o.soma) / o.peso }));
}
const real = porFaixa(S);
const sims = [[100, 0.061], [150, 0.088], [200, 0.153]].map(([k, x]) => [k, x, porFaixa(S.map((s) => (s.comp > k ? { ...s, x: s.x + (2 * Math.round((x * s.f2 * (s.comp - k)) / s.comp)) / s.comp } : s)))]);
console.log('\n(3) Ganho líquido do 13 por votante, desvio da média do município, por faixa de votantes do 2T');
console.log('    colunas simuladas: desvio do tamanho que vira o resultado, só depois do k-ésimo voto da seção');
faixas.forEach(([lo, hi], i) => console.log(`  ${String(lo).padStart(4)}–${String(hi).padEnd(4)} ${String(real[i].n).padStart(7)} seções  real ${(real[i].pp >= 0 ? '+' : '') + real[i].pp.toFixed(2)} pp  ` + sims.map(([k, x, r]) => `k=${k} (${(100 * x).toFixed(1)}%): ${(r[i].pp >= 0 ? '+' : '') + r[i].pp.toFixed(2)}`).join('  ')));
