// Cético, achado a7: explicações alternativas e poder do teste (banco, somente leitura).
// 1. Composição: a liberação sem digital das seções ≥ 95% (9,4%) comparada com a esperada pelas próprias zonas, não com o país.
// 2. Taxa de base do filtro: fração de TODAS as seções que passa no filtro do autor (binomial p < 0,001 contra a zona)
//    por faixa de comparecimento. Se a fração nas ≥ 95% não for maior, o filtro não liga comparecimento alto a sem digital.
// 3. O filtro com beta-binomial (rho da sem digital estimado por momentos dentro das zonas) e com correção de Bonferroni.
// 4. Teste de mudança (alternativa não testada pelo autor): entre turnos, na mesma seção (mesmos aptos), quanto do
//    comparecimento a mais veio sem digital? Inclinação Δsem_digital ~ Δcomparecimento, por faixa de Δ.
// 5. Persistência da falha da digital entre turnos: mesma urna × urna diferente (hardware × eleitorado).
// 6. Poder: (a) votos sem digital que precisariam ser injetados nas seções ≥ 95% para o agregado passar do país;
//    (b) menor número de votos falsos sem digital que o filtro por seção detectaria (binomial e beta-binomial);
//    (c) simulação: injeta votos falsos sem digital no excesso (≈ 300 seções) e conta quantas o filtro pega.
// 7. Hipergeométrica do caso RN 17132/0010/0145 (cadastro de julho × aptos de outubro).
// Uso: node scripts/auditoria/cetico-a7-alternativas.mjs     Saída: data/parsed/auditoria/cetico/a7-alternativas.json
import { mkdirSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const OUT = 'data/parsed/auditoria/cetico';
mkdirSync(OUT, { recursive: true });
const db = new DatabaseSync('data/db/eleicao2026.sqlite', { readOnly: true });
const FED = { 1: 6257, 2: 6258 };
const lfC = [0];
const lf = (n) => { while (lfC.length <= n) lfC.push(lfC[lfC.length - 1] + Math.log(lfC.length)); return lfC[n]; };
const LZ = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
function lg(z) { if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lg(1 - z); z -= 1; let x = LZ[0]; for (let i = 1; i < 9; i++) x += LZ[i] / (z + i); const t = z + 7.5; return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x); }
function caudaBin(n, k, p) {
  if (k <= 0) return 1; if (k > n || p <= 0) return 0; if (p >= 1) return 1;
  let s = 0; for (let x = k; x <= n; x++) { const t = Math.exp(lf(n) - lf(x) - lf(n - x) + x * Math.log(p) + (n - x) * Math.log(1 - p)); s += t; if (t < 1e-16 * s && x > n * p) break; }
  return Math.min(1, s);
}
function caudaBB(n, k, p, rho) {
  if (k <= 0) return 1; if (k > n || p <= 0) return 0; if (p >= 1) return 1;
  const S = (1 - rho) / rho; const a = p * S; const b = (1 - p) * S; const base = lg(a + b) - lg(a) - lg(b) - lg(n + a + b) + lf(n);
  let s = 0; for (let x = k; x <= n; x++) { const t = Math.exp(base - lf(x) - lf(n - x) + lg(x + a) + lg(n - x + b)); s += t; if (t < 1e-16 * s && x > n * p) break; }
  return Math.min(1, s);
}
// gerador determinístico
let semente = 20261025;
const rnd = () => { semente = (semente * 1664525 + 1013904223) >>> 0; return semente / 2 ** 32; };
const binom = (n, p) => { let k = 0; for (let i = 0; i < n; i++) if (rnd() < p) k++; return k; };

function carregar(turno) {
  return db.prepare(`SELECT s.uf, s.municipio, s.zona, s.secao, s.numero_interno_urna AS urna, s.tipo_urna, e.aptos, e.comparecimento_majoritario AS comp,
      s.sem_biometria AS semcad, s.por_biografia AS manual, s.por_biometria AS bio
    FROM secao s JOIN secao_eleicao e ON e.turno = s.turno AND e.uf = s.uf AND e.municipio = s.municipio AND e.zona = s.zona AND e.secao = s.secao AND e.eleicao = ?
    WHERE s.turno = ? AND s.situacao = 'completa'`).all(FED[turno], turno);
}
const R = {};
const t2 = carregar(2);
const zk = (r) => `${r.uf}|${r.municipio}|${r.zona}`;
const zonas = new Map();
for (const r of t2) {
  const z = zonas.get(zk(r)) ?? { aptos: 0, comp: 0, sd: 0, compBio: 0, n: 0 };
  z.aptos += r.aptos; z.comp += r.comp; z.n++;
  if (r.semcad !== null && r.manual !== null) { z.sd += r.semcad + r.manual; z.compBio += r.comp; }
  zonas.set(zk(r), z);
}
const temBio = (r) => r.semcad !== null && r.manual !== null && r.comp > 0;
// rho da sem digital dentro das zonas (por momentos, taxa da zona sem a seção)
let q = 0; let n1 = 0;
for (const r of t2) {
  if (!temBio(r) || r.comp < 2) continue;
  const z = zonas.get(zk(r)); const den = z.compBio - r.comp; if (den <= 0) continue;
  const p = (z.sd - r.semcad - r.manual) / den; if (p <= 0 || p >= 1) continue;
  q += (r.semcad + r.manual - r.comp * p) ** 2 / (r.comp * p * (1 - p)) - 1; n1 += r.comp - 1;
}
const rhoSD = Math.max(1e-6, q / n1);
R.rho_sem_digital_intra_zona = +rhoSD.toFixed(5);

// 1 e 2 e 3
const faixa = (t) => (t < 0.8 ? '<80%' : t < 0.85 ? '80–85%' : t < 0.9 ? '85–90%' : t < 0.95 ? '90–95%' : '≥95%');
const porFaixa = new Map();
const lista95 = [];
let nTestadas = 0;
for (const r of t2) {
  if (!temBio(r) || !r.aptos) continue;
  const z = zonas.get(zk(r)); const den = z.compBio - r.comp; if (den <= 0) continue;
  const pz = (z.sd - r.semcad - r.manual) / den; if (pz <= 0) continue;
  nTestadas++;
  const k = r.semcad + r.manual; const taxa = r.comp / r.aptos;
  const pB = caudaBin(r.comp, k, pz);
  const f = faixa(taxa);
  const o = porFaixa.get(f) ?? { secoes: 0, filtro_bin: 0, filtro_bb: 0, sd: 0, comp: 0, esperado_zona: 0 };
  o.secoes++; o.sd += k; o.comp += r.comp; o.esperado_zona += r.comp * pz;
  if (pB < 0.001) { o.filtro_bin++; if (caudaBB(r.comp, k, pz, rhoSD) < 0.001) o.filtro_bb++; }
  porFaixa.set(f, o);
  if (taxa >= 0.95) lista95.push({ ...r, pz, k, pB, pBB: caudaBB(r.comp, k, pz, rhoSD) });
}
R.por_faixa_comparecimento = Object.fromEntries(['<80%', '80–85%', '85–90%', '90–95%', '≥95%'].map((f) => { const o = porFaixa.get(f); return [f, {
  secoes: o.secoes, sem_digital_obs: +(100 * o.sd / o.comp).toFixed(2), sem_digital_esperado_pela_zona: +(100 * o.esperado_zona / o.comp).toFixed(2), razao_obs_esp: +(o.sd / o.esperado_zona).toFixed(3),
  filtro_binomial_p001: o.filtro_bin, pct_filtro_binomial: +(100 * o.filtro_bin / o.secoes).toFixed(2), filtro_beta_binomial_p001: o.filtro_bb, pct_filtro_bb: +(100 * o.filtro_bb / o.secoes).toFixed(3) }]; }));
R.secoes_testadas = nTestadas;
const bonf = 0.05 / lista95.length; const bonfTodas = 0.05 / nTestadas;
R.filtro_95 = {
  secoes: lista95.length, binomial_p001: lista95.filter((x) => x.pB < 0.001).length, beta_binomial_p001: lista95.filter((x) => x.pBB < 0.001).length,
  beta_binomial_bonferroni_639: lista95.filter((x) => x.pBB < bonf).length, beta_binomial_bonferroni_todas: lista95.filter((x) => x.pBB < bonfTodas).length,
  esperado_falsos_positivos_bb_p001: +(lista95.length * 0.001).toFixed(2),
  top: lista95.sort((a, b) => a.pBB - b.pBB).slice(0, 10).map((x) => ({ secao: `${x.uf} ${x.municipio}/${x.zona}/${x.secao}`, comp: `${x.comp}/${x.aptos}`, sem_digital: `${x.k} (${(100 * x.k / x.comp).toFixed(1)}%)`, zona: +(100 * x.pz).toFixed(1), p_bin: x.pB.toExponential(1), p_bb: x.pBB.toExponential(1) })),
};

// 4 e 5: entre turnos, mesma seção e mesmos aptos (1º turno parcial)
const t1 = carregar(1);
const m1 = new Map(t1.map((r) => [`${zk(r)}|${r.secao}`, r]));
const pares = [];
for (const b of t2) {
  const a = m1.get(`${zk(b)}|${b.secao}`);
  if (!a || a.aptos !== b.aptos || !temBio(a) || !temBio(b)) continue;
  pares.push({ a, b, dC: b.comp - a.comp, dSD: (b.semcad + b.manual) - (a.semcad + a.manual), dMan: b.manual - a.manual, dCad: b.semcad - a.semcad, mesma: a.urna === b.urna });
}
const ols = (xs, ys) => { const n = xs.length; const mx = xs.reduce((p, c) => p + c, 0) / n; const my = ys.reduce((p, c) => p + c, 0) / n; let sxy = 0; let sxx = 0; for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; } const b = sxy / sxx; let sr = 0; for (let i = 0; i < n; i++) sr += (ys[i] - my - b * (xs[i] - mx)) ** 2; return { inclinacao: +b.toFixed(4), ep: +Math.sqrt(sr / (n - 2) / sxx).toFixed(4), n }; };
const sdMedio = pares.reduce((p, x) => p + x.b.semcad + x.b.manual, 0) / pares.reduce((p, x) => p + x.b.comp, 0);
const grupos = { todas: pares, '2t ≥ 95%': pares.filter((x) => x.b.comp / x.b.aptos >= 0.95), 'Δ ≥ +10%': pares.filter((x) => x.dC >= 0.10 * x.b.aptos) };
R.mudanca_entre_turnos = { ufs_1t: [...new Set(t1.map((r) => r.uf))].join(','), pares: pares.length, sem_digital_media_2t: +(100 * sdMedio).toFixed(2) };
for (const [g, arr] of Object.entries(grupos)) {
  const sC = arr.reduce((p, x) => p + x.dC, 0); const sSD = arr.reduce((p, x) => p + x.dSD, 0); const sM = arr.reduce((p, x) => p + x.dMan, 0);
  R.mudanca_entre_turnos[g] = { secoes: arr.length, delta_comparecimento: sC, delta_sem_digital: sSD, delta_manual: sM, parcela_sem_digital_do_incremento: +(100 * sSD / sC).toFixed(2),
    inclinacao: ols(arr.map((x) => x.dC), arr.map((x) => x.dSD)) };
}
// seções em que a maior parte do incremento veio sem digital, com incremento relevante: cauda contra a parcela nacional
const cand = pares.filter((x) => x.dC >= 10).map((x) => ({ ...x, p: caudaBin(x.dC, Math.max(0, x.dSD), sdMedio) }));
R.mudanca_entre_turnos.secoes_incremento_10_ou_mais = cand.length;
R.mudanca_entre_turnos.incremento_sem_digital_p_1e3 = cand.filter((x) => x.dSD > 0 && x.p < 1e-3).length;
// Persistência da falha (manual / (bio + manual)) entre turnos
const corr = (arr) => { const xs = arr.map((x) => x.a.manual / (x.a.manual + x.a.bio)); const ys = arr.map((x) => x.b.manual / (x.b.manual + x.b.bio)); const n = xs.length; const mx = xs.reduce((p, c) => p + c, 0) / n; const my = ys.reduce((p, c) => p + c, 0) / n; let c = 0; let vx = 0; let vy = 0; for (let i = 0; i < n; i++) { c += (xs[i] - mx) * (ys[i] - my); vx += (xs[i] - mx) ** 2; vy += (ys[i] - my) ** 2; } return { n, r: +(c / Math.sqrt(vx * vy)).toFixed(3) }; };
const ok = pares.filter((x) => x.a.manual + x.a.bio >= 50 && x.b.manual + x.b.bio >= 50);
const corrCad = (arr) => { const xs = arr.map((x) => x.a.semcad / x.a.comp); const ys = arr.map((x) => x.b.semcad / x.b.comp); const n = xs.length; const mx = xs.reduce((p, c) => p + c, 0) / n; const my = ys.reduce((p, c) => p + c, 0) / n; let c = 0; let vx = 0; let vy = 0; for (let i = 0; i < n; i++) { c += (xs[i] - mx) * (ys[i] - my); vx += (xs[i] - mx) ** 2; vy += (ys[i] - my) ** 2; } return { n, r: +(c / Math.sqrt(vx * vy)).toFixed(3) }; };
R.persistencia_falha = { mesma_urna: corr(ok.filter((x) => x.mesma)), urna_diferente: corr(ok.filter((x) => !x.mesma)), sem_cadastro_mesma_urna: corrCad(ok.filter((x) => x.mesma)), sem_cadastro_urna_diferente: corrCad(ok.filter((x) => !x.mesma)) };

// 6a: injeção para o agregado das ≥ 95% passar do país
{
  const S = lista95.reduce((p, x) => p + x.k, 0); const C = lista95.reduce((p, x) => p + x.comp, 0);
  const nac = t2.filter(temBio).reduce((p, r) => p + r.semcad + r.manual, 0) / t2.filter(temBio).reduce((p, r) => p + r.comp, 0);
  const esp = lista95.reduce((p, x) => p + x.comp * x.pz, 0) / C;
  const F = (nac * C - S) / (1 - nac); const Fz = (esp * C - S) / (1 - esp);
  R.poder_agregado = { sem_digital_95: +(100 * S / C).toFixed(2), pais: +(100 * nac).toFixed(2), esperado_pelas_zonas: +(100 * esp).toFixed(2), comparecimento_95: C,
    votos_falsos_sem_digital_para_igualar_pais: Math.round(F), por_secao_do_excesso_298: +(F / 298).toFixed(1),
    votos_falsos_para_igualar_esperado_das_zonas: Math.round(Fz), por_secao_do_excesso: +(Fz / 298).toFixed(1) };
}
// 6b: menor k falso detectável por seção (n = comparecimento, p = taxa da zona) a p < 0,001
R.poder_por_secao = [];
for (const [n, p] of [[100, 0.124], [200, 0.124], [300, 0.124], [200, 0.06], [200, 0.20]]) {
  const base = Math.round(n * p);
  let kb = null; let kbb = null;
  for (let f = 0; f <= n; f++) { const k = base + f; const N = n; if (kb === null && caudaBin(N, k, p) < 0.001) kb = f; if (kbb === null && caudaBB(N, k, p, rhoSD) < 0.001) kbb = f; if (kb !== null && kbb !== null) break; }
  R.poder_por_secao.push({ comparecimento: n, taxa_zona: p, votos_falsos_minimos_binomial: kb, votos_falsos_minimos_beta_binomial: kbb });
}
// 6c: simulação. Toma as seções < 95% de comparecimento com 85–95% e injeta, em cada uma, f votos falsos sem digital
// (até chegar a ≥ 95%, tirando de ausentes). Mede: fração que vira ≥ 95% e fração pega pelo filtro do autor (p < 0,001).
{
  const base = [];
  for (const r of t2) { if (!temBio(r) || !r.aptos) continue; const t = r.comp / r.aptos; if (t >= 0.88 && t < 0.95 && r.aptos >= 50) base.push(r); }
  const amostra = []; for (let i = 0; i < 3000; i++) amostra.push(base[Math.floor(rnd() * base.length)]);
  const res = [];
  for (const parcela of [1, 0.5]) {
    let viraram = 0; let pegosBin = 0; let pegosBB = 0; let falsos = 0;
    for (const r of amostra) {
      const z = zonas.get(zk(r)); const pz = (z.sd - r.semcad - r.manual) / (z.compBio - r.comp);
      const alvo = Math.ceil(0.95 * r.aptos); const f = alvo - r.comp; if (f <= 0) continue;
      const semDig = Math.round(f * parcela); // parcela dos falsos que entra sem digital (o resto, com digital de quem?)
      const k = r.semcad + r.manual + semDig; const n = r.comp + f; falsos += f; viraram++;
      if (caudaBin(n, k, pz) < 0.001) pegosBin++;
      if (caudaBB(n, k, pz, rhoSD) < 0.001) pegosBB++;
    }
    res.push({ parcela_sem_digital: parcela, secoes: viraram, votos_falsos_medios: +(falsos / viraram).toFixed(1), pegas_binomial: +(100 * pegosBin / viraram).toFixed(1), pegas_beta_binomial: +(100 * pegosBB / viraram).toFixed(1) });
  }
  R.simulacao_injecao = res;
}
// 7: hipergeométrica, RN 17132/0010/0145: julho 380 eleitores, 46 sem biometria; outubro 229 aptos da seção
{
  const N = 380; const K = 46; const n = 229;
  const lC = (a, b) => lf(a) - lf(b) - lf(a - b);
  const cauda = (k0) => { let s = 0; for (let k = k0; k <= Math.min(K, n); k++) s += Math.exp(lC(K, k) + lC(N - K, n - k) - lC(N, n)); return s; };
  R.caso_rn_hipergeometrica = { esperado_sem_bio_ficaram: +(n * K / N).toFixed(1), 'P(>=31 ficaram, 1t)': cauda(31).toExponential(2), 'P(>=33 ficaram, 2t)': cauda(33).toExponential(2),
    'P(>=43 ficaram: comparecimento dos sem biometria <= 76% da zona)': cauda(43).toExponential(2) };
}
writeFileSync(`${OUT}/a7-alternativas.json`, JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
