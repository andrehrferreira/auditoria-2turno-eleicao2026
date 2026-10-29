// Forense estatística, teste 5: números e percentuais redondos.
// Uso: node scripts/auditoria/forense-redondos.mjs [turno]   → forense/redondos-<t>t.json
//
// (a) Contagens múltiplas de 10, 50 e 100 (votos do 13, do 22, brancos, nulos, comparecimento). Esperado de cada
//     valor redondo v = média do histograma em v−2, v−1, v+1 e v+2 (vizinhos não redondos). Excesso só no valor
//     redondo é a marca de número escrito à mão.
// (b) Percentuais redondos (Kobak, Shpilkin e Pshenichnikov 2016): seções cuja parcela do candidato ou cujo
//     comparecimento cai num percentual inteiro múltiplo de 5 (± 0,05 p.p.), sem contar 0% e 100%. Esperado por
//     reamostragem binomial com o mesmo n e a mesma parcela da seção (20 repetições), o que já inclui o efeito
//     das frações simples (1/2, 3/4...) em seções pequenas.
import { aleatorio, carregarSecoes, salvar, sortearBinomial } from './forense-lib.mjs';

const turno = Number(process.argv[2] ?? 2);
const REPETICOES = 20;
const rnd = aleatorio(777);
const secoes = (await carregarSecoes(turno)).filter((s) => s.validos > 0 && s.aptos > 0);

const contagens = { v13: (s) => s.v13, v22: (s) => s.v22, branco: (s) => s.branco, nulo: (s) => s.nulo, comparecimento: (s) => s.comparecimento };
const res = { turno, secoes: secoes.length, contagens: {}, percentuais: {} };

for (const [nome, f] of Object.entries(contagens)) {
  const h = new Map();
  for (const s of secoes) { const v = f(s); h.set(v, (h.get(v) ?? 0) + 1); }
  const H = (v) => h.get(v) ?? 0;
  res.contagens[nome] = {};
  for (const m of [10, 50, 100]) {
    let obs = 0, esp = 0;
    const max = [...h.keys()].reduce((a, b) => Math.max(a, b), 0);
    for (let v = m; v <= max; v += m) {
      obs += H(v);
      esp += (H(v - 2) + H(v - 1) + H(v + 1) + H(v + 2)) / 4;
    }
    res.contagens[nome][m] = { observado: obs, esperado: +esp.toFixed(1), razao: +(obs / esp).toFixed(3), z: +((obs - esp) / Math.sqrt(esp)).toFixed(2) };
  }
}

const redondo = (pct) => {
  if (pct <= 0.05 || pct >= 99.95) return false;
  const r = Math.round(pct / 5) * 5;
  return Math.abs(pct - r) <= 0.05;
};
const percentuais = {
  parcela13: (s) => [s.v13, s.validos],
  parcela22: (s) => [s.v22, s.validos],
  comparecimento: (s) => [s.comparecimento, s.aptos],
};
for (const [nome, f] of Object.entries(percentuais)) {
  let obs = 0;
  const sim = new Array(REPETICOES).fill(0);
  for (const s of secoes) {
    const [x, n] = f(s);
    if (redondo((100 * x) / n)) obs++;
    const p = Math.min(x / n, 1);
    for (let r = 0; r < REPETICOES; r++) if (redondo((100 * sortearBinomial(n, p, rnd)) / n)) sim[r]++;
  }
  const m = sim.reduce((a, b) => a + b, 0) / REPETICOES;
  const dp = Math.sqrt(sim.reduce((a, b) => a + (b - m) ** 2, 0) / (REPETICOES - 1));
  res.percentuais[nome] = { observado: obs, esperado: +m.toFixed(1), dp: +dp.toFixed(1), razao: +(obs / m).toFixed(3), z: +((obs - m) / Math.sqrt(m + dp * dp)).toFixed(2) };
}

await salvar(`redondos-${turno}t.json`, res);
console.log(`Números redondos, ${turno}º turno (${secoes.length} seções)`);
for (const [nome, r] of Object.entries(res.contagens)) {
  console.log(`  ${nome.padEnd(15)} ${Object.entries(r).map(([m, x]) => `×${m}: ${x.observado} / ${x.esperado} (razão ${x.razao}, z ${x.z})`).join('   ')}`);
}
console.log('Percentuais múltiplos de 5% (observado / esperado por reamostragem):');
for (const [nome, r] of Object.entries(res.percentuais)) console.log(`  ${nome.padEnd(15)} ${r.observado} / ${r.esperado} ± ${r.dp} (razão ${r.razao}, z ${r.z})`);
