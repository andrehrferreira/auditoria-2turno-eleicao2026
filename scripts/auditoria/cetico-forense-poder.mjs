// Revisor cético, achado "forense-sem-marca-de-fraude": PODER dos testes forenses do autor (docs/analysis/forense-estatistica/).
// Uso: node scripts/auditoria/cetico-forense-poder.mjs   → data/parsed/auditoria/cetico/forense-poder.json (+ log no stdout)
//
// Ideia: partir dos dados reais do 2º turno (forense/secoes-2t.csv, já gerado por forense-base.mjs), INJETAR fraudes
// sintéticas conhecidas e reaplicar as estatísticas que o autor usa para dizer "não há marca". Os modelos nulos do
// autor são ajustados nos próprios dados (taxa e ρ da zona, permutação na zona, mediana/MAD da zona); aqui eles são
// reajustados em cada cenário, exatamente como o autor faria se a fraude estivesse nos dados.
// Somente leitura: não abre o banco, só o CSV derivado e os perfis já em disco.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  RAIZ, aleatorio, carregarSecoes, holm, lnGama, medianaMad, mqo, parametrosBeta, pQuiQuadrado, quiQuadrado,
  sobredispersao, sortearBeta, sortearBinomial,
} from './forense-lib.mjs';

const DIR = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico');
const secoes = (await carregarSecoes(2)).filter((s) => s.validos > 0 && s.aptos > 0);
const N = secoes.length;
console.log(`seções: ${N}`);

// Estruturas fixas (não mudam com a fraude): zona, UF, aptos, perfil, categoria.
const zonaDe = new Int32Array(N), ufDe = new Int32Array(N);
const zonasMap = new Map(), ufsMap = new Map();
secoes.forEach((s, i) => {
  const kz = `${s.uf}/${s.zona}`;
  if (!zonasMap.has(kz)) zonasMap.set(kz, []);
  zonasMap.get(kz).push(i);
  if (!ufsMap.has(s.uf)) ufsMap.set(s.uf, ufsMap.size);
  ufDe[i] = ufsMap.get(s.uf);
});
const zonas = [...zonasMap.values()];
zonas.forEach((g, z) => g.forEach((i) => (zonaDe[i] = z)));
const ufs = [...ufsMap.keys()];
const aptos = Int32Array.from(secoes, (s) => s.aptos);
const CONTROLES = ['p60', 'pBaixa', 'pSup', 'pInd', 'pQuil'];
const temCtrl = secoes.map((s) => CONTROLES.every((c) => s[c] != null));
const cat = secoes.map((s) => s.categoria);

const base = {
  v13: Int32Array.from(secoes, (s) => s.v13), v22: Int32Array.from(secoes, (s) => s.v22),
  outros: Int32Array.from(secoes, (s) => s.outros), comp: Int32Array.from(secoes, (s) => s.comparecimento),
};
const copia = () => ({ v13: base.v13.slice(), v22: base.v22.slice(), outros: base.outros, comp: base.comp.slice() });

// ---------- estatísticas (reimplementação fiel, em arrays, dos testes do autor) ----------
const MAXN = 2000;
const lnFat = new Float64Array(MAXN + 1);
for (let i = 1; i <= MAXN; i++) lnFat[i] = lnFat[i - 1] + Math.log(i);
const lnComb = (n, k) => lnFat[n] - lnFat[k] - lnFat[n - k];
const lnBeta = (a, b) => lnGama(a) + lnGama(b) - lnGama(a + b);
const kMin = (n, t) => Math.floor((t * n + 99) / 100);

/** A3/A4 com beta-binomial da zona (taxa sem a própria seção, ρ da zona): observado e esperado ≥ 90% e 100%, e Bonferroni. */
function a3a4(d, c) {
  const x = c === 13 ? d.v13 : d.v22;
  const val = (i) => d.v13[i] + d.v22[i] + d.outros[i];
  const zx = new Float64Array(zonas.length), zn = new Float64Array(zonas.length), zr = new Float64Array(zonas.length);
  zonas.forEach((g, z) => {
    let X = 0, M = 0;
    for (const i of g) { X += x[i]; M += val(i); }
    zx[z] = X; zn[z] = M;
    zr[z] = sobredispersao(g.map((i) => ({ x: x[i], n: val(i) }))).rho;
  });
  const limite = 0.05 / (2 * N);
  let obs90 = 0, obs100 = 0, esp90 = 0, esp100 = 0, surpreendentes = 0;
  for (let i = 0; i < N; i++) {
    const n = val(i), xi = x[i], z = zonaDe[i];
    const pz = zn[z] - n > 0 ? (zx[z] - xi) / (zn[z] - n) : zx[z] / zn[z];
    const k90 = kMin(n, 90);
    const pb = parametrosBeta(Math.min(Math.max(pz, 1e-6), 1 - 1e-6), zr[z]);
    const lt = pb ? (j) => lnComb(n, j) + lnBeta(j + pb.a, n - j + pb.b) - lnBeta(pb.a, pb.b)
      : (j) => lnComb(n, j) + j * Math.log(Math.max(pz, 1e-12)) + (n - j) * Math.log1p(-Math.min(pz, 1 - 1e-12));
    let acum = 0, tx = 1;
    for (let j = n; j >= Math.min(k90, xi >= k90 ? xi : k90); j--) {
      acum += Math.exp(lt(j));
      if (j === n) esp100 += acum;
      if (j === xi) tx = acum;
    }
    esp90 += Math.min(1, acum);
    if (xi >= k90) { obs90++; if (Math.min(1, tx) < limite) surpreendentes++; }
    if (xi === n) obs100++;
  }
  return { obs90, esp90: +esp90.toFixed(0), razao90: +(obs90 / esp90).toFixed(3), obs100, esp100: +esp100.toFixed(1), surpreendentes };
}

/** Klimek: r dentro da zona (13 × comparecimento, centrado na zona), zonas ≥20 com r > 0,5 e canto 95/95 vs esperança exata da permutação. */
function klimek(d) {
  let sxy = 0, sxx = 0, syy = 0, zonasR = 0, zonasTot = 0, canto = 0, cantoEsp = 0;
  const sh = (i) => d.v13[i] / (d.v13[i] + d.v22[i] + d.outros[i]);
  const tc = (i) => d.comp[i] / aptos[i];
  for (const g of zonas) {
    let mx = 0, my = 0, nc = 0, ns = 0;
    for (const i of g) { mx += tc(i); my += sh(i); if (tc(i) >= 0.95) nc++; if (sh(i) >= 0.95) ns++; if (tc(i) >= 0.95 && sh(i) >= 0.95) canto++; }
    mx /= g.length; my /= g.length;
    cantoEsp += (nc * ns) / g.length;
    let a = 0, b = 0, cc = 0;
    for (const i of g) { const dx = tc(i) - mx, dy = sh(i) - my; a += dx * dy; b += dx * dx; cc += dy * dy; }
    sxy += a; sxx += b; syy += cc;
    if (g.length >= 20 && b > 0 && cc > 0) { zonasTot++; if (a / Math.sqrt(b * cc) > 0.5) zonasR++; }
  }
  return { rDentroZona: +(sxy / Math.sqrt(sxx * syy)).toFixed(4), zonasR05: zonasR, zonasTot, canto95: canto, canto95Permutacao: +cantoEsp.toFixed(1) };
}

/** Último e 2º dígito contra o modelo sem fraude (beta-binomial da zona reajustada, 10 sorteios), Holm por família UF × candidato. */
function digitos(d, semente) {
  const rnd = aleatorio(semente);
  const R = 10;
  const res = {};
  for (const c of [13, 22]) {
    const x = c === 13 ? d.v13 : d.v22;
    const val = (i) => d.v13[i] + d.v22[i] + d.outros[i];
    const par = zonas.map((g) => sobredispersao(g.map((i) => ({ x: x[i], n: val(i) }))));
    const oU = ufs.map(() => new Array(10).fill(0)), sU = ufs.map(() => new Array(10).fill(0));
    const o2 = ufs.map(() => new Array(10).fill(0)), s2 = ufs.map(() => new Array(10).fill(0));
    const add = (u, s, v) => { if (v >= 100) u[v % 10]++; if (v >= 10) s[Math.floor(v / 10 ** (String(v).length - 2)) % 10]++; };
    for (let i = 0; i < N; i++) {
      const u = ufDe[i];
      add(oU[u], o2[u], x[i]);
      const { p, rho } = par[zonaDe[i]];
      const pb = parametrosBeta(Math.min(Math.max(p, 1e-6), 1 - 1e-6), rho);
      for (let r = 0; r < R; r++) add(sU[u], s2[u], sortearBinomial(val(i), pb ? sortearBeta(pb.a, pb.b, rnd) : p, rnd));
    }
    const teste = (o, s) => {
      const n = o.reduce((a, b) => a + b, 0), ns = s.reduce((a, b) => a + b, 0);
      if (n < 50 || !ns || s.some((v) => v === 0)) return null;
      const q = quiQuadrado(o, s.map((v) => v / ns));
      return pQuiQuadrado(q.x2 / (1 + n / ns), 9);
    };
    const pU = [], p2 = [];
    ufs.forEach((_, u) => { const a = teste(oU[u], sU[u]); if (a != null) pU.push(a); const b = teste(o2[u], s2[u]); if (b != null) p2.push(b); });
    const sum = (arrs) => arrs.reduce((acc, a) => acc.map((v, k) => v + a[k]), new Array(10).fill(0));
    res[c] = {
      ultimoSigHolm: holm(pU).filter((p) => p < 0.05).length, ultimoTestes: pU.length, ultimoBR_p: +teste(sum(oU), sum(sU)).toFixed(4),
      segundoSigHolm: holm(p2).filter((p) => p < 0.05).length, segundoBR_p: +teste(sum(o2), sum(s2)).toFixed(4),
    };
  }
  return res;
}

/** z robusto da parcela do 13 e do comparecimento na zona (≥10 seções), bruto e com controles do perfil. */
function zscore(d) {
  const grandes = zonas.filter((g) => g.length >= 10);
  const sh = (i) => d.v13[i] / (d.v13[i] + d.v22[i] + d.outros[i]);
  const tc = (i) => d.comp[i] / aptos[i];
  const out = {};
  for (const [nome, f] of [['parcela13', sh], ['comparecimento', tc]]) {
    let alto = 0, baixo = 0;
    for (const g of grandes) {
      const vs = g.map(f); const { mediana, mad } = medianaMad(vs);
      if (!(mad > 0)) continue;
      for (const v of vs) { const z = (v - mediana) / mad; if (z >= 5) alto++; else if (z <= -5) baixo++; }
    }
    // controles
    const X = [], y = [], quem = [];
    for (const g of grandes) {
      const com = g.filter((i) => temCtrl[i]);
      if (com.length < 10) continue;
      const mC = CONTROLES.map((c) => com.reduce((a, i) => a + secoes[i][c], 0) / com.length);
      const mY = com.reduce((a, i) => a + f(i), 0) / com.length;
      for (const i of com) { X.push(CONTROLES.map((c, j) => secoes[i][c] - mC[j])); y.push(f(i) - mY); quem.push(i); }
    }
    const b = mqo(X, y);
    const resid = new Map(quem.map((i, k) => [i, y[k] - X[k].reduce((a, v, j) => a + v * b[j], 0)]));
    let ca = 0, cb = 0;
    for (const g of grandes) {
      const com = g.filter((i) => resid.has(i));
      if (!com.length) continue;
      const vs = com.map((i) => resid.get(i)); const { mediana, mad } = medianaMad(vs);
      if (!(mad > 0)) continue;
      for (const v of vs) { const z = (v - mediana) / mad; if (z >= 5) ca++; else if (z <= -5) cb++; }
    }
    out[nome] = { brutoAlto: alto, brutoBaixo: baixo, ctrlAlto: ca, ctrlBaixo: cb, coefInd: +b[3].toFixed(3) };
  }
  // assimetria com controles (parcela do 13): binomial bilateral exata contra 1/2 (aproximação normal)
  const { ctrlAlto: a, ctrlBaixo: bb } = out.parcela13;
  const zAs = (a - (a + bb) / 2) / Math.sqrt((a + bb) / 4);
  out.assimetriaCtrl_z = +zAs.toFixed(2);
  return out;
}

/** Números redondos: votos do 13 e comparecimento em múltiplos de 10, esperado pelos vizinhos (método do autor). */
function redondos(d) {
  const out = {};
  for (const [nome, arr] of [['v13', d.v13], ['comparecimento', d.comp]]) {
    const h = new Map();
    for (const v of arr) h.set(v, (h.get(v) ?? 0) + 1);
    const H = (v) => h.get(v) ?? 0;
    let obs = 0, esp = 0;
    const max = Math.max(...h.keys());
    for (let v = 10; v <= max; v += 10) { obs += H(v); esp += (H(v - 2) + H(v - 1) + H(v + 1) + H(v + 2)) / 4; }
    out[nome] = +((obs - esp) / Math.sqrt(esp)).toFixed(2);
  }
  return out;
}

// ---------- cenários de fraude (sempre a favor do 13; o efeito para o 22 seria espelhado) ----------
function enchimento(d, i, k) { // k votos novos no 13, limitados às abstenções
  const add = Math.max(0, Math.min(k, aptos[i] - d.comp[i]));
  d.v13[i] += add; d.comp[i] += add; return add;
}
function troca(d, i, k) { const t = Math.min(k, d.v22[i]); d.v22[i] -= t; d.v13[i] += t; return t; }

const cenarios = {
  S0_sem_fraude: () => ({ d: copia(), info: 'dados reais' }),
  S1_enche5_10pct: (rnd) => { const d = copia(); let v = 0, s = 0; for (let i = 0; i < N; i++) if (rnd() < 0.10) { v += enchimento(d, i, 5); s++; } return { d, votos: v, secoes: s }; },
  S2_troca5_10pct: (rnd) => { const d = copia(); let v = 0, s = 0; for (let i = 0; i < N; i++) if (rnd() < 0.10) { v += troca(d, i, 5); s++; } return { d, votos: v, secoes: s }; },
  S3_enche5_30pct: (rnd) => { const d = copia(); let v = 0, s = 0; for (let i = 0; i < N; i++) if (rnd() < 0.30) { v += enchimento(d, i, 5); s++; } return { d, votos: v, secoes: s }; },
  // Muda o resultado: 13−22 real = 4,43 milhões. Trocar ~2,2 milhões inverte a eleição.
  S4_troca_prop_3p7pct_todas: (rnd) => { const d = copia(); let v = 0; for (let i = 0; i < N; i++) v += troca(d, i, sortearBinomial(d.v22[i], 0.037, rnd)); return { d, votos: v, secoes: N }; },
  S5_troca5_90pct: (rnd) => { const d = copia(); let v = 0, s = 0; for (let i = 0; i < N; i++) if (rnd() < 0.90) { v += troca(d, i, 5); s++; } return { d, votos: v, secoes: s }; },
  // Dirigida a redutos: onde o 13 já tem ≥ 70%, metade das abstenções vira voto no 13.
  S6_enche_redutos70: () => { const d = copia(); let v = 0, s = 0; for (let i = 0; i < N; i++) { if (d.v13[i] / (d.v13[i] + d.v22[i] + d.outros[i]) >= 0.7) { v += enchimento(d, i, Math.floor((aptos[i] - d.comp[i]) / 2)); s++; } } return { d, votos: v, secoes: s }; },
  // Circular: só nas seções que o autor classifica como indígena, quilombola ou prisional (as "explicadas").
  S7_enche_categorias_benignas: () => { const d = copia(); let v = 0, s = 0; for (let i = 0; i < N; i++) { if (['indigena', 'quilombola', 'prisional'].includes(cat[i])) { v += enchimento(d, i, Math.floor((aptos[i] - d.comp[i]) / 2)); s++; } } return { d, votos: v, secoes: s }; },
  // Controle positivo (marca clássica): 1% das seções levadas a 100% de comparecimento, todas as abstenções no 13.
  S8_classico_1pct_100: (rnd) => { const d = copia(); let v = 0, s = 0; for (let i = 0; i < N; i++) if (rnd() < 0.01) { v += enchimento(d, i, aptos[i]); s++; } return { d, votos: v, secoes: s }; },
};

const saida = { gerado: new Date().toISOString(), secoes: N, margemReal13menos22: Number(base.v13.reduce((a, b) => a + b, 0) - base.v22.reduce((a, b) => a + b, 0)), cenarios: {} };
let semente = 11;
for (const [nome, f] of Object.entries(cenarios)) {
  const t0 = Date.now();
  const rnd = aleatorio(semente++);
  const { d, votos = 0, secoes: afetadas = 0 } = f(rnd);
  const margem = Number(d.v13.reduce((a, b) => a + b, 0) - d.v22.reduce((a, b) => a + b, 0));
  const r = {
    votosAlterados: votos, secoesAfetadas: afetadas, margem13menos22: margem,
    a3a4_13: a3a4(d, 13), a3a4_22: a3a4(d, 22), klimek: klimek(d), zscore: zscore(d), redondos: redondos(d), digitos: digitos(d, 4242),
  };
  saida.cenarios[nome] = r;
  console.log(`\n== ${nome} (${((Date.now() - t0) / 1000).toFixed(0)} s): votos alterados ${votos.toLocaleString('pt-BR')} em ${afetadas.toLocaleString('pt-BR')} seções; margem 13−22 ${margem.toLocaleString('pt-BR')}`);
  console.log(JSON.stringify(r));
}
await mkdir(DIR, { recursive: true });
await writeFile(path.join(DIR, 'forense-poder.json'), JSON.stringify(saida, null, 1));
console.log(`\n→ ${path.join(DIR, 'forense-poder.json')}`);
