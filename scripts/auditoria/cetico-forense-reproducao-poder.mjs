// Revisor cético, achado forense-sem-marca-de-fraude, lente reprodução: PODER dos testes forenses (docs 02 a 07).
// Pergunta: se houvesse fraude pequena e espalhada a favor do 13, as estatísticas usadas pelo autor mudariam o
// bastante para alguém notar? Método: os dados reais do 2º turno (presidente) são a base "limpa" (por hipótese de
// trabalho). Injeta-se fraude simulada em cima deles e recalculam-se, com implementação própria, as estatísticas:
//   A4   seções ≥ 90% e 100% do 13, e o esperado beta-binomial da zona (p sem a própria seção, ρ de Kleinman);
//   Klimek canto ≥95/≥95 do 13 contra permutação do comparecimento dentro da zona (5×) e r dentro da zona;
//   Dígito último dígito do 13 (votos ≥ 100): χ² contra a distribuição dos dados reais (referência perfeita, a
//        mais favorável possível à detecção; o modelo do autor ajusta pior que isso);
//   z    seções com z robusto ≥ 5 (parcela do 13) acima e abaixo da zona (zonas com ≥ 10 seções);
//   Redondos  votos do 13 múltiplos de 10, contra a média dos vizinhos (±1, ±2) do histograma.
// Cenários (semente fixa): ver CENARIOS. Saída: data/parsed/auditoria/cetico/forense-reproducao-poder.json
// Uso: node --max-old-space-size=4096 scripts/auditoria/cetico-forense-reproducao-poder.mjs
// Entrada: data/parsed/auditoria/cetico/forense-secoes-2t.csv (de cetico-forense-reproducao.mjs).
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const DIR = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico');
const linhas = readFileSync(path.join(DIR, 'forense-secoes-2t.csv'), 'utf8').trim().split('\n');
const cab = linhas[0].split(';');
const I = Object.fromEntries(cab.map((c, i) => [c, i]));
const base = linhas.slice(1).map((l) => {
  const c = l.split(';');
  return { uf: c[I.uf], zona: c[I.zona], aptos: +c[I.aptos], comp: +c[I.comparecimento], v13: +c[I.v13], v22: +c[I.v22] };
}).filter((s) => s.aptos > 0 && s.v13 + s.v22 > 0);
const N = base.length;
const zonaDe = base.map((s) => `${s.uf}/${s.zona}`);
const zonasIdx = new Map();
zonaDe.forEach((k, i) => { if (!zonasIdx.has(k)) zonasIdx.set(k, []); zonasIdx.get(k).push(i); });
const zonas = [...zonasIdx.values()];

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const LANCZOS = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
function lnG(x) { if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lnG(1 - x); x -= 1; let a = LANCZOS[0]; const t = x + 7.5; for (let i = 1; i < 9; i++) a += LANCZOS[i] / (x + i); return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a); }
const lnB = (a, b) => lnG(a) + lnG(b) - lnG(a + b);

// ---------- cenários de fraude (sempre a favor do 13) ----------
// Cada um devolve [v13, v22, comp] por seção. "troca" = voto do 22 vira 13 (comparecimento igual);
// "enche" = voto novo do 13 no lugar de abstenção (comparecimento sobe; nunca passa dos aptos).
const CENARIOS = {
  'F0 sem fraude (dados reais)': () => base.map((s) => [s.v13, s.v22, s.comp]),
  'F1 troca 5 votos 22→13 em 10% das seções': (r) => base.map((s) => { const k = r() < 0.1 ? Math.min(5, s.v22) : 0; return [s.v13 + k, s.v22 - k, s.comp]; }),
  'F2 enche 5 votos do 13 em 10% das seções': (r) => base.map((s) => { const k = r() < 0.1 ? Math.min(5, s.aptos - s.comp) : 0; return [s.v13 + k, s.v22, s.comp + k]; }),
  'F3 troca 5 votos 22→13 em 50% das seções': (r) => base.map((s) => { const k = r() < 0.5 ? Math.min(5, s.v22) : 0; return [s.v13 + k, s.v22 - k, s.comp]; }),
  'F4 troca 10 votos 22→13 onde o 13 já tem ≥ 60% (redutos)': () => base.map((s) => { const k = s.v13 >= 1.5 * s.v22 ? Math.min(10, s.v22) : 0; return [s.v13 + k, s.v22 - k, s.comp]; }),
  'F5 troca proporcional 3,7% dos votos do 22 em todas (vira o resultado)': (r) => base.map((s) => { let k = 0; for (let j = 0; j < s.v22; j++) if (r() < 0.037) k++; return [s.v13 + k, s.v22 - k, s.comp]; }),
  'F6 troca 44 votos 22→13 em 10% das seções (vira o resultado)': (r) => base.map((s) => { const k = r() < 0.1 ? Math.min(44, s.v22) : 0; return [s.v13 + k, s.v22 - k, s.comp]; }),
  'F7 enche 30% das abstenções com 13 em 20% das seções': (r) => base.map((s) => { const k = r() < 0.2 ? Math.round(0.3 * (s.aptos - s.comp)) : 0; return [s.v13 + k, s.v22, s.comp + k]; }),
  'F8 controle positivo: enche TODAS as abstenções com 13 em 0,5% das seções': (r) => base.map((s) => { const k = r() < 0.005 ? s.aptos - s.comp : 0; return [s.v13 + k, s.v22, s.comp + k]; }),
};

// ---------- estatísticas ----------
function a4(v13, v22) {
  // ≥ 90% e 100% do 13 observados e esperados pela beta-binomial da zona (como forense-a3a4.mjs, implementação própria)
  let obs90 = 0, obs100 = 0, esp90 = 0, esp100 = 0;
  for (const g of zonas) {
    let X = 0, M = 0, S = 0, n2 = 0;
    for (const i of g) { X += v13[i]; M += v13[i] + v22[i]; }
    const p = X / M, k = g.length;
    for (const i of g) { const n = v13[i] + v22[i]; S += n * (v13[i] / n - p) ** 2; n2 += n * n; }
    const den = M - n2 / M - (k - 1);
    let rho = k >= 3 && p > 0 && p < 1 && den > 0 ? (S / (p * (1 - p)) - (k - 1)) / den : 0;
    rho = Math.min(Math.max(rho, 0), 0.99);
    for (const i of g) {
      const n = v13[i] + v22[i], x = v13[i];
      if (10 * x >= 9 * n) obs90++;
      if (x === n) obs100++;
      let pz = M - n > 0 ? (X - x) / (M - n) : p;
      pz = Math.min(Math.max(pz, 1e-6), 1 - 1e-6);
      const k90 = Math.ceil(0.9 * n - 1e-9);
      if (rho > 0) {
        const s = (1 - rho) / rho, a = pz * s, b = (1 - pz) * s;
        let f = Math.exp(lnB(n + a, b) - lnB(a, b)); // P(X = n)
        esp100 += f;
        let acc = f;
        for (let j = n; j > k90; j--) { f *= (j / (n - j + 1)) * ((n - j + b) / (j - 1 + a)); acc += f; }
        esp90 += acc;
      } else {
        let f = Math.exp(n * Math.log(pz));
        esp100 += f;
        let acc = f;
        for (let j = n; j > k90; j--) { f *= (j / (n - j + 1)) * ((1 - pz) / pz); acc += f; }
        esp90 += acc;
      }
    }
  }
  return { obs90, esp90: +esp90.toFixed(0), razao90: +(obs90 / esp90).toFixed(3), obs100, esp100: +esp100.toFixed(1) };
}

function klimek(v13, v22, comp, r) {
  const par = (i) => v13[i] / (v13[i] + v22[i]);
  const cp = (i) => comp[i] / base[i].aptos;
  const obs = base.reduce((a, s, i) => a + (cp(i) >= 0.95 && par(i) >= 0.95 ? 1 : 0), 0);
  const perm = [];
  for (let t = 0; t < 5; t++) {
    let n = 0;
    for (const g of zonas) {
      const cs = g.map(cp);
      for (let i = cs.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [cs[i], cs[j]] = [cs[j], cs[i]]; }
      g.forEach((i, k) => { if (cs[k] >= 0.95 && par(i) >= 0.95) n++; });
    }
    perm.push(n);
  }
  const m = perm.reduce((a, b) => a + b, 0) / perm.length;
  const sd = Math.sqrt(perm.reduce((a, b) => a + (b - m) ** 2, 0) / (perm.length - 1));
  let sxy = 0, sxx = 0, syy = 0;
  for (const g of zonas) {
    if (g.length < 3) continue;
    const mx = g.reduce((a, i) => a + cp(i), 0) / g.length, my = g.reduce((a, i) => a + par(i), 0) / g.length;
    for (const i of g) { const dx = cp(i) - mx, dy = par(i) - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  }
  return { canto95: obs, canto95Perm: +m.toFixed(1), canto95PermDp: +sd.toFixed(1), rDentroZona: +(sxy / Math.sqrt(sxx * syy)).toFixed(4),
    acima100: base.reduce((a, s, i) => a + (comp[i] > s.aptos ? 1 : 0), 0), igual100: base.reduce((a, s, i) => a + (comp[i] === s.aptos ? 1 : 0), 0) };
}

const digitos = (v) => { const h = new Array(10).fill(0); for (const x of v) if (x >= 100) h[x % 10]++; return h; };
function chi2(obs, refProp) { const n = obs.reduce((a, b) => a + b, 0); return obs.reduce((a, o, i) => a + (o - n * refProp[i]) ** 2 / (n * refProp[i]), 0); }

function zrob(v13, v22) {
  let alto = 0, baixo = 0;
  const med = (a) => { const v = Float64Array.from(a).sort(); const n = v.length; return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2; };
  for (const g of zonas) {
    if (g.length < 10) continue;
    const ys = g.map((i) => v13[i] / (v13[i] + v22[i]));
    const m = med(ys), mad = 1.4826 * med(ys.map((y) => Math.abs(y - m)));
    if (!(mad > 0)) continue;
    for (const y of ys) { const z = (y - m) / mad; if (z >= 5) alto++; if (z <= -5) baixo++; }
  }
  return { alto13: alto, alto22: baixo };
}

function redondos(v) {
  const h = new Map();
  for (const x of v) h.set(x, (h.get(x) ?? 0) + 1);
  let obs = 0, esp = 0;
  for (let x = 10; x <= 1000; x += 10) { obs += h.get(x) ?? 0; esp += ((h.get(x - 2) ?? 0) + (h.get(x - 1) ?? 0) + (h.get(x + 1) ?? 0) + (h.get(x + 2) ?? 0)) / 4; }
  return { obs, esp: +esp.toFixed(0), z: +((obs - esp) / Math.sqrt(esp)).toFixed(2) };
}

// ---------- execução ----------
const resultado = {};
let refDig = null;
const tot0 = { v13: base.reduce((a, s) => a + s.v13, 0), v22: base.reduce((a, s) => a + s.v22, 0) };
for (const [nome, gerar] of Object.entries(CENARIOS)) {
  const t0 = Date.now();
  const r = rng(2026);
  const m = gerar(r);
  const v13 = m.map((x) => x[0]), v22 = m.map((x) => x[1]), comp = m.map((x) => x[2]);
  const t13 = v13.reduce((a, b) => a + b, 0), t22 = v22.reduce((a, b) => a + b, 0);
  const dig = digitos(v13);
  if (!refDig) { const n = dig.reduce((a, b) => a + b, 0); refDig = dig.map((d) => d / n); }
  const o = {
    votosMexidos: t13 - tot0.v13, secoesAlteradas: base.reduce((a, s, i) => a + (v13[i] !== s.v13 ? 1 : 0), 0),
    margem13menos22: t13 - t22, parcela13: +(100 * t13 / (t13 + t22)).toFixed(3),
    A4: a4(v13, v22), Klimek: klimek(v13, v22, comp, rng(7)),
    ultimoDigito: { chi2VsDadosReais: +chi2(dig, refDig).toFixed(2), critico9gl: 16.92 },
    zRobusto: zrob(v13, v22), redondos13x10: redondos(v13),
    segundos: (Date.now() - t0) / 1000,
  };
  resultado[nome] = o;
  console.log(nome, JSON.stringify(o));
}
writeFileSync(path.join(DIR, 'forense-reproducao-poder.json'), JSON.stringify({ secoes: N, margemReal: tot0.v13 - tot0.v22, cenarios: resultado }, null, 1));
