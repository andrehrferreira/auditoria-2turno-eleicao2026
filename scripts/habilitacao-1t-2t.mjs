// Por onde entrou o aumento de comparecimento do 2º turno? (H05/H10, premissa 8 do doc 01)
// Eleitor real entra quase sempre por biometria; voto no lugar de ausente, com mesário conivente, entraria por
// ano de nascimento (sem biometria cadastrada) ou por liberação manual. Compara os dois turnos na mesma seção e
// testa se o ganho de cada finalista acompanha o aumento das liberações sem biometria.
// Uso: node scripts/habilitacao-1t-2t.mjs [uf ...]
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

const campos = (s) => ({
  comparecimento: s.comparecimento, biometria: s.porBiometria, semBiometria: s.semBiometriaCadastrada,
  manual: s.comBiometriaPorAnoNascimento, manualSemMesario: Math.max(0, s.comBiometriaPorAnoNascimento - s.habilitadosPeloMesario),
  l: s.votos['13'] ?? 0, f: s.votos['22'] ?? 0,
});

// correlação de Pearson ponderada simples entre listas
function pearson(a, b) {
  const n = a.length;
  const ma = a.reduce((x, y) => x + y, 0) / n;
  const mb = b.reduce((x, y) => x + y, 0) / n;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  return saa && sbb ? sab / Math.sqrt(saa * sbb) : null;
}

const ufs = process.argv.slice(2).length ? process.argv.slice(2) : UFS;
const tot = { 1: {}, 2: {} };
const dL = [], dF = [], dNaoBio = [], dBio = [], dComp = [];
let secoes = 0;
const porUf = [];
for (const uf of ufs) {
  const [p1, p2] = [await perfis(1, uf), await perfis(2, uf)];
  if (!p1 || !p2) { console.error(`[${uf}] sem perfil de um dos turnos: pulada`); continue; }
  const u = { uf, secoes: 0, d: {} };
  for (const [k, s2] of p2) {
    const s1 = p1.get(k);
    if (!s1 || !s2 || s1.tipoUrna === 3 || s2.tipoUrna === 3) continue;
    const [a, b] = [campos(s1), campos(s2)];
    secoes++; u.secoes++;
    for (const c of Object.keys(a)) {
      tot[1][c] = (tot[1][c] ?? 0) + a[c];
      tot[2][c] = (tot[2][c] ?? 0) + b[c];
      u.d[c] = (u.d[c] ?? 0) + b[c] - a[c];
    }
    dL.push(b.l - a.l); dF.push(b.f - a.f); dComp.push(b.comparecimento - a.comparecimento);
    dBio.push(b.biometria - a.biometria);
    dNaoBio.push(b.semBiometria + b.manual - a.semBiometria - a.manual);
  }
  porUf.push(u);
}

const pct = (n, d) => `${((100 * n) / d).toFixed(1)}%`;
console.log(`${secoes} seções em ${porUf.length} UFs`);
for (const t of [1, 2]) {
  const x = tot[t];
  console.log(`${t}º turno: comparecimento ${x.comparecimento} | biometria ${x.biometria} (${pct(x.biometria, x.comparecimento)}) | sem biometria cadastrada ${x.semBiometria} (${pct(x.semBiometria, x.comparecimento)}) | manual ${x.manual} (${pct(x.manual, x.comparecimento)}) | manual sem mesário ${x.manualSemMesario}`);
}
const d = Object.fromEntries(Object.keys(tot[1]).map((c) => [c, tot[2][c] - tot[1][c]]));
console.log(`Variação 2T−1T: comparecimento ${d.comparecimento} | biometria ${d.biometria} | sem biometria cadastrada ${d.semBiometria} | manual ${d.manual} | manual sem mesário ${d.manualSemMesario} | 13 ${d.l} | 22 ${d.f}`);
console.log(`Do aumento de comparecimento, por biometria: ${pct(d.biometria, d.comparecimento)}`);
console.log('\nCorrelação por seção (Pearson):');
console.log(`  Δ13 × Δ(sem biometria + manual): ${pearson(dL, dNaoBio).toFixed(3)}   Δ22 × Δ(sem biometria + manual): ${pearson(dF, dNaoBio).toFixed(3)}`);
console.log(`  Δ13 × Δbiometria: ${pearson(dL, dBio).toFixed(3)}   Δ22 × Δbiometria: ${pearson(dF, dBio).toFixed(3)}`);
console.log(`  Δcomparecimento × Δbiometria: ${pearson(dComp, dBio).toFixed(3)}   Δcomparecimento × Δ(sem biometria + manual): ${pearson(dComp, dNaoBio).toFixed(3)}`);
console.log('\nPor UF (Δ = 2T − 1T):');
for (const u of porUf) console.log(`  ${u.uf} (${u.secoes}): Δcomp ${u.d.comparecimento}  Δbio ${u.d.biometria}  ΔsemBio ${u.d.semBiometria}  Δmanual ${u.d.manual}  Δ13 ${u.d.l}  Δ22 ${u.d.f}`);
