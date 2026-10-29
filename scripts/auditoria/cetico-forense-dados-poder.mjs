// Revisão cética do achado "forense sem marca de fraude": PODER dos testes contra fraude pequena e espalhada.
// Uso: node scripts/auditoria/cetico-forense-dados-poder.mjs   → data/parsed/auditoria/cetico/forense-dados-poder.json
//
// Parte dos dados reais do 2º turno (forense/secoes-2t.csv + perfil + locais, as mesmas entradas do autor), injeta uma
// fraude conhecida e recalcula as estatísticas dos testes do autor, com as mesmas definições:
//   A4    seções com 13 ≥ 90% e = 100% dos válidos × esperado beta-binomial na zona (p sem a própria seção, ρ da zona)
//   Klimek r(comparecimento, parcela do 13) dentro da zona; canto ≥ 95/≥ 95 × permutação na zona (5×)
//   z     z robusto da parcela do 13 na zona (zonas ≥ 10 seções), bruto e com os controles do autor; assimetria
//   dígito último dígito do 13 (contagens ≥ 100) contra uniforme; 2º dígito (≥ 10) contra Benford
// Cenários (semente fixa): ver CENARIOS. "Detecta" = a estatística sai da faixa que o autor leu como "sem marca".
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import {
  aleatorio, binomialCauda, carregarSecoes, lnGama, medianaMad, mqo, parametrosBeta, pearson, quiQuadrado, sobredispersao, sortearBinomial,
} from './forense-lib.mjs';

const SAIDA = path.join(path.resolve(import.meta.dirname, '..', '..'), 'data', 'parsed', 'auditoria', 'cetico');
const base = (await carregarSecoes(2)).filter((s) => s.aptos > 0 && s.validos > 0);
const N = base.length;
const CONTROLES = ['p60', 'pBaixa', 'pSup', 'pInd', 'pQuil'];

// Índice de zona.
const zonaIdx = new Int32Array(N);
const zonasMap = new Map();
base.forEach((s, i) => {
  const k = `${s.uf}/${s.zona}`;
  if (!zonasMap.has(k)) zonasMap.set(k, zonasMap.size);
  zonaIdx[i] = zonasMap.get(k);
});
const NZ = zonasMap.size;
const membros = Array.from({ length: NZ }, () => []);
for (let i = 0; i < N; i++) membros[zonaIdx[i]].push(i);
const ctrl = base.map((s) => (CONTROLES.every((c) => s[c] != null) ? CONTROLES.map((c) => s[c]) : null));

const MAXN = base.reduce((m, s) => Math.max(m, s.aptos), 0) + 10;
const lnFat = new Float64Array(MAXN + 1);
for (let i = 1; i <= MAXN; i++) lnFat[i] = lnFat[i - 1] + Math.log(i);
const lnComb = (n, k) => lnFat[n] - lnFat[k] - lnFat[n - k];
const lnBeta = (a, b) => lnGama(a) + lnGama(b) - lnGama(a + b);

// ---------- estatísticas ----------
function estatisticas(D, rnd) {
  const { v13, v22, comp, aptos } = D;
  const val = (i) => v13[i] + v22[i];
  const par = (i) => v13[i] / val(i);
  const cp = (i) => comp[i] / aptos[i];
  const out = {};

  // A4 com beta-binomial na zona.
  let obs90 = 0, obs100 = 0, esp90 = 0, esp100 = 0;
  for (let z = 0; z < NZ; z++) {
    const g = membros[z];
    let X = 0, Nn = 0;
    for (const i of g) { X += v13[i]; Nn += val(i); }
    const { rho } = sobredispersao(g.map((i) => ({ x: v13[i], n: val(i) })));
    for (const i of g) {
      const n = val(i), x = v13[i];
      const k90 = Math.floor((90 * n + 99) / 100);
      if (x >= k90) obs90++;
      if (x === n) obs100++;
      const p = Nn - n > 0 ? (X - x) / (Nn - n) : X / Nn;
      const pb = parametrosBeta(Math.min(Math.max(p, 1e-6), 1 - 1e-6), rho);
      let acum = 0, t100 = 0;
      if (pb) {
        const b0 = lnBeta(pb.a, pb.b);
        for (let j = n; j >= k90; j--) { const t = Math.exp(lnComb(n, j) + lnBeta(j + pb.a, n - j + pb.b) - b0); acum += t; if (j === n) t100 = t; }
      } else {
        const pp = Math.min(Math.max(p, 1e-12), 1 - 1e-12);
        for (let j = n; j >= k90; j--) { const t = Math.exp(lnComb(n, j) + j * Math.log(pp) + (n - j) * Math.log1p(-pp)); acum += t; if (j === n) t100 = t; }
      }
      esp90 += Math.min(1, acum); esp100 += t100;
    }
  }
  out.A4 = { obs90, esp90: +esp90.toFixed(1), razao90: +(obs90 / esp90).toFixed(3), obs100, esp100: +esp100.toFixed(1) };

  // Klimek: r dentro da zona e canto 95/95 com permutação (5×).
  const dx = [], dy = [];
  let zonasR05 = 0;
  for (let z = 0; z < NZ; z++) {
    const g = membros[z];
    if (g.length < 3) continue;
    const xs = g.map(cp), ys = g.map(par);
    const mx = xs.reduce((a, b) => a + b, 0) / g.length, my = ys.reduce((a, b) => a + b, 0) / g.length;
    for (let k = 0; k < g.length; k++) { dx.push(xs[k] - mx); dy.push(ys[k] - my); }
    if (g.length >= 20 && pearson(xs, ys) > 0.5) zonasR05++;
  }
  let canto = 0;
  for (let i = 0; i < N; i++) if (cp(i) >= 0.95 && par(i) >= 0.95) canto++;
  const perm = [];
  for (let r = 0; r < 5; r++) {
    let n = 0;
    for (const g of membros) {
      const cs = g.map(cp);
      for (let k = cs.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [cs[k], cs[j]] = [cs[j], cs[k]]; }
      g.forEach((i, k) => { if (cs[k] >= 0.95 && par(i) >= 0.95) n++; });
    }
    perm.push(n);
  }
  out.Klimek = { rDentroZona: +pearson(dx, dy).toFixed(4), zonasRmaior05: zonasR05, canto95: canto,
    canto95Perm: +(perm.reduce((a, b) => a + b, 0) / perm.length).toFixed(1), acima100: [...Array(N).keys()].filter((i) => comp[i] > aptos[i]).length };

  // z robusto da parcela do 13, bruto e com controles (como forense-zscore.mjs).
  const grandes = membros.filter((g) => g.length >= 10);
  const zb = new Float64Array(N).fill(NaN);
  for (const g of grandes) {
    const vs = g.map(par);
    const { mediana, mad } = medianaMad(vs);
    g.forEach((i, k) => { zb[i] = mad > 0 ? (vs[k] - mediana) / mad : NaN; });
  }
  const linhas = [], y = [], quem = [];
  for (const g of grandes) {
    const com = g.filter((i) => ctrl[i]);
    if (com.length < 10) continue;
    const mC = CONTROLES.map((_, j) => com.reduce((a, i) => a + ctrl[i][j], 0) / com.length);
    const mY = com.reduce((a, i) => a + par(i), 0) / com.length;
    for (const i of com) { linhas.push(ctrl[i].map((v, j) => v - mC[j])); y.push(par(i) - mY); quem.push(i); }
  }
  const b = mqo(linhas, y);
  const resid = new Float64Array(N).fill(NaN);
  quem.forEach((i, k) => { resid[i] = y[k] - linhas[k].reduce((a, v, j) => a + v * b[j], 0); });
  const zc = new Float64Array(N).fill(NaN);
  for (const g of grandes) {
    const ok = g.filter((i) => !Number.isNaN(resid[i]));
    const vs = g.map((i) => resid[i]);
    const { mediana, mad } = medianaMad(vs); // NaN entra como o autor (ordenado ao fim); ver nota no JSON
    g.forEach((i, k) => { zc[i] = ok.length && mad > 0 && !Number.isNaN(vs[k]) ? (vs[k] - mediana) / mad : NaN; });
  }
  let ba = 0, bb = 0, ca = 0, cb = 0;
  for (let i = 0; i < N; i++) {
    if (zb[i] >= 5) ba++; else if (zb[i] <= -5) bb++;
    if (zc[i] >= 5) ca++; else if (zc[i] <= -5) cb++;
  }
  const pSim = (a, c) => { const n = a + c; return n ? Math.min(1, 2 * Math.min(binomialCauda(n, 0.5, a), 1 - binomialCauda(n, 0.5, a + 1))) : 1; };
  out.z = { bruto13alto: ba, bruto13baixo: bb, ctrl13alto: ca, ctrl13baixo: cb, pAssimetriaCtrl: +pSim(ca, cb).toPrecision(3),
    coef: Object.fromEntries(CONTROLES.map((c, j) => [c, +b[j].toFixed(4)])) };

  // Dígitos do 13 (nacional).
  const ult = new Array(10).fill(0), seg = new Array(10).fill(0);
  const BENF2 = Array.from({ length: 10 }, (_, d) => { let p = 0; for (let k = 1; k <= 9; k++) p += Math.log10(1 + 1 / (10 * k + d)); return p; });
  for (let i = 0; i < N; i++) {
    const x = v13[i];
    if (x >= 100) ult[x % 10]++;
    if (x >= 10) seg[Math.floor(x / 10 ** (String(x).length - 2)) % 10]++;
  }
  const qu = quiQuadrado(ult, new Array(10).fill(0.1)), qs = quiQuadrado(seg, BENF2);
  out.digitos = { ultimo_x2: +qu.x2.toFixed(1), ultimo_p: +qu.p.toPrecision(3), segundo_x2: +qs.x2.toFixed(0), segundo_madPp: +qs.madPp.toFixed(3) };
  out.total = { v13: v13.reduce((a, b) => a + b, 0), v22: v22.reduce((a, b) => a + b, 0) };
  out.total.margem = out.total.v13 - out.total.v22;
  return out;
}

// ---------- cenários de fraude ----------
const copia = () => ({
  v13: Int32Array.from(base, (s) => s.v13), v22: Int32Array.from(base, (s) => s.v22),
  comp: Int32Array.from(base, (s) => s.comparecimento), aptos: Int32Array.from(base, (s) => s.aptos),
});
const pBaixa = base.map((s) => s.pBaixa ?? 0);
const mediaBaixa = pBaixa.reduce((a, b) => a + b, 0) / N;

const CENARIOS = {
  S0_sem_fraude: () => {},
  // Pedido do coordenador: +5 votos no 13 em 10% das seções, como voto a mais (enchimento) ...
  S1_enchimento_5_em_10pct: (D, r) => { for (let i = 0; i < N; i++) if (r() < 0.1 && D.aptos[i] - D.comp[i] >= 5) { D.v13[i] += 5; D.comp[i] += 5; } },
  // ... e como voto trocado do 22 para o 13 (sem mudar o comparecimento).
  S2_troca_5_em_10pct: (D, r) => { for (let i = 0; i < N; i++) if (r() < 0.1 && D.v22[i] >= 5) { D.v22[i] -= 5; D.v13[i] += 5; } },
  // Fraude que, sozinha, inverteria o resultado (margem real 4,43 milhões): troca de 5 votos em 90% das seções.
  S3_troca_5_em_90pct: (D, r) => { for (let i = 0; i < N; i++) if (r() < 0.9 && D.v22[i] >= 5) { D.v22[i] -= 5; D.v13[i] += 5; } },
  // Mesma escala, proporcional ao voto do 22 na seção (3,8% do 22 de cada seção vira 13).
  S4_troca_3_8pct_do_22: (D, r) => { for (let i = 0; i < N; i++) { const x = sortearBinomial(D.v22[i], 0.038, r); D.v22[i] -= x; D.v13[i] += x; } },
  // Enchimento que inverteria o resultado: 15% das abstenções de cada seção viram voto no 13.
  S5_enchimento_15pct_abstencao: (D, r) => { for (let i = 0; i < N; i++) { const x = sortearBinomial(D.aptos[i] - D.comp[i], 0.15, r); D.v13[i] += x; D.comp[i] += x; } },
  // Enchimento concentrado em redutos (13 ≥ 70%): 50% das abstenções viram 13 (assinatura de Klimek clássica).
  S6_enchimento_redutos: (D, r) => { for (let i = 0; i < N; i++) if (D.v13[i] / (D.v13[i] + D.v22[i]) >= 0.7) { const x = sortearBinomial(D.aptos[i] - D.comp[i], 0.5, r); D.v13[i] += x; D.comp[i] += x; } },
  // Circularidade: troca 22→13 proporcional à escolaridade baixa do cadastro (variável de controle do autor),
  // com a mesma escala de S4 (≈ 2,2 milhões de votos).
  S7_troca_onde_controla: (D, r) => { for (let i = 0; i < N; i++) { const p = Math.min(0.5, 0.038 * (pBaixa[i] / mediaBaixa) ** 2); const x = sortearBinomial(D.v22[i], p, r); D.v22[i] -= x; D.v13[i] += x; } },
};

const res = { secoes: N, zonas: NZ, cenarios: {} };
for (const [nome, f] of Object.entries(CENARIOS)) {
  const t0 = Date.now();
  const D = copia();
  f(D, aleatorio(99));
  res.cenarios[nome] = estatisticas(D, aleatorio(2026));
  res.cenarios[nome].votosMovidos = res.cenarios[nome].total.margem - (res.cenarios.S0_sem_fraude?.total.margem ?? res.cenarios[nome].total.margem);
  console.log(nome, `${((Date.now() - t0) / 1000).toFixed(0)} s`, JSON.stringify(res.cenarios[nome]));
}
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, 'forense-dados-poder.json'), JSON.stringify(res, null, 1));
