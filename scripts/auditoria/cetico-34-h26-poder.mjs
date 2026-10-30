// Parecer cético 34 (H26), passo 3: poder da triagem. Insere votos simulados para o 13 e refaz o esperado (MQ por UF
// com as seções do ajuste), o z robusto por região, o BH e o corte do plano (q < 0,01 e ≥ 2 p.p.).
// Inserção em uma zona, em 1%, 5%, 10%, 25% das zonas de uma UF, em todas as zonas de uma capital e na UF inteira.
// Dois modos: "acrescimo" (votos a mais para o 13, sobe o comparecimento) e "troca" (voto do 22 vira voto do 13).
// Os votos inseridos são repartidos entre as seções da zona na proporção do comparecimento do 2º turno.
// A conta é exata em forma fechada: a inserção muda Xᵀy da UF; Δb = (XᵀX)⁻¹·Σ k·GX, e o esperado de cada zona muda
// SX·Δb (SX = soma dos x das seções da zona; GX = soma de x·peso das seções da zona que entram no ajuste).
// Uso: node --max-old-space-size=8192 scripts/auditoria/cetico-34-h26-poder.mjs
// Saídas em data/parsed/auditoria/cetico-revisor/: 34-h26-poder.json, 34-h26-poder-zonas.csv.
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { SAIDA, lerSecoes, normais, coeficientes, porZona, inversa, matVec, dot, mediana, p2, QMAX, PPMIN, csv, r } from './cetico-34-h26-lib.mjs';

const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const S = await lerSecoes();
const N = normais(S);
const C = coeficientes(N);
const Ainv = new Map([...N].map(([uf, n]) => [uf, inversa(n.A)]));
const Z = porZona(S, C).filter((z) => z.reg !== 'EX');
Z.forEach((z, i) => { z.i = i; z.GX = new Float64Array(9); z.C2 = z.lista.reduce((a, s) => a + s.c2, 0); });
for (const z of Z) for (const s of z.lista) if (s.fit) { const w = s.c2 / z.C2; for (let j = 0; j < 9; j++) z.GX[j] += s.x[j] * w; }
const n = Z.length;
const porUF = new Map(), porReg = new Map();
for (const z of Z) { (porUF.get(z.uf) ?? porUF.set(z.uf, []).get(z.uf)).push(z); (porReg.get(z.reg) ?? porReg.set(z.reg, []).get(z.reg)).push(z); }
// auto-absorção: fração dos votos inseridos numa zona que o próprio esperado engole (h = SX·A⁻¹·GX)
for (const z of Z) z.h = dot(z.SX, matVec(Ainv.get(z.uf), z.GX));

/**
 * Cenário: inj = Map(zona → k votos). Devolve, para cada zona, {alem, z, q, fora} recalculados.
 * modo 'acrescimo': y13 += k; modo 'troca': y13 += k e y22 −= k.
 */
const base = { rl: Float64Array.from(Z, (z) => z.rl), n2: Float64Array.from(Z, (z) => z.n2) };
function cenario(inj, modo) {
  const rl = Float64Array.from(base.rl), n2 = Float64Array.from(base.n2);
  const ufs = new Map();
  for (const [z, k] of inj) {
    const g = ufs.get(z.uf) ?? ufs.set(z.uf, new Float64Array(9)).get(z.uf);
    for (let j = 0; j < 9; j++) g[j] += k * z.GX[j];
    if (modo === 'acrescimo') { rl[z.i] += k; n2[z.i] += k; } else rl[z.i] += 2 * k;
  }
  for (const [uf, g] of ufs) {
    const db = matVec(Ainv.get(uf), g);
    const f = modo === 'acrescimo' ? 1 : 2;
    for (const z of porUF.get(uf)) rl[z.i] -= f * dot(z.SX, db);
  }
  const t = Float64Array.from(Z, (z, i) => rl[i] / Math.sqrt(n2[i]));
  const zz = new Float64Array(n);
  for (const l of porReg.values()) {
    const v = l.map((z) => t[z.i]);
    const m = mediana(v), mad = 1.4826 * mediana(v.map((x) => Math.abs(x - m)));
    for (const z of l) zz[z.i] = (t[z.i] - m) / mad;
  }
  const p = Array.from(zz, (x) => p2(x));
  const ordem = p.map((_, i) => i).sort((a, b) => p[a] - p[b]);
  const q = new Float64Array(n);
  let acc = 1;
  for (let k = n - 1; k >= 0; k--) { acc = Math.min(acc, p[ordem[k]] * n / (k + 1)); q[ordem[k]] = acc; }
  const alem = Float64Array.from(rl, (x, i) => 100 * x / n2[i]);
  const fora = Int8Array.from(alem, (a, i) => (q[i] < QMAX && Math.abs(a) >= PPMIN ? (a > 0 ? 13 : 22) : 0));
  return { rl, n2, alem, z: zz, q, fora };
}
const sanidade = cenario(new Map(), 'acrescimo');
const out = { zonas: n, foraBase: { 13: [...sanidade.fora].filter((f) => f === 13).length, 22: [...sanidade.fora].filter((f) => f === 22).length } };

// ---------- 1. uma zona por vez: menor inserção (p.p. dos nominais do 2º turno da zona) que passa o corte ----------
function limiar(z, modo) {
  const det = (s) => cenario(new Map([[z, (s / 100) * z.n2]]), modo).fora[z.i] === 13;
  let lo = 0, hi = 60;
  if (!det(hi)) return Infinity;
  for (let it = 0; it < 14; it++) { const m = (lo + hi) / 2; if (det(m)) hi = m; else lo = m; }
  return hi;
}
const linhas = [];
for (const z of Z) {
  const a = limiar(z, 'acrescimo'), tr = limiar(z, 'troca');
  linhas.push({ uf: z.uf, zona: z.zona, reg: z.reg, secoes: z.secoes, nominais2: z.n2, autoAbsorcao: z.h, alemBase: z.alem,
    limiarAcrescimoPp: a, limiarAcrescimoVotos: Math.round(a / 100 * z.n2), limiarTrocaPp: tr, limiarTrocaVotos: Math.round(tr / 100 * z.n2),
    porSecaoAcrescimo: a / 100 * z.n2 / z.secoes });
  if (linhas.length % 500 === 0) log(`${linhas.length} zonas`);
}
await writeFile(path.join(SAIDA, '34-h26-poder-zonas.csv'), csv(linhas, Object.keys(linhas[0])));
const qtl = (v, p) => { const a = v.filter(Number.isFinite).sort((x, y) => x - y); return a[Math.floor(p * (a.length - 1))]; };
const resumoLimiar = (l) => ({ zonas: l.length,
  acrescimoPp: { p10: r(qtl(l.map((x) => x.limiarAcrescimoPp), 0.1)), mediana: r(qtl(l.map((x) => x.limiarAcrescimoPp), 0.5)), p90: r(qtl(l.map((x) => x.limiarAcrescimoPp), 0.9)), max: r(Math.max(...l.map((x) => x.limiarAcrescimoPp))) },
  acrescimoVotos: { p10: qtl(l.map((x) => x.limiarAcrescimoVotos), 0.1), mediana: qtl(l.map((x) => x.limiarAcrescimoVotos), 0.5), p90: qtl(l.map((x) => x.limiarAcrescimoVotos), 0.9) },
  acrescimoVotosPorSecao: { mediana: r(qtl(l.map((x) => x.porSecaoAcrescimo), 0.5), 1) },
  trocaPp: { p10: r(qtl(l.map((x) => x.limiarTrocaPp), 0.1)), mediana: r(qtl(l.map((x) => x.limiarTrocaPp), 0.5)), p90: r(qtl(l.map((x) => x.limiarTrocaPp), 0.9)) },
  trocaVotos: { mediana: qtl(l.map((x) => x.limiarTrocaVotos), 0.5) },
  detectaCom: Object.fromEntries([2, 3, 5, 10].map((s) => [`${s}pp_acrescimo`, l.filter((x) => x.limiarAcrescimoPp <= s).length])),
  autoAbsorcao: { mediana: r(qtl(l.map((x) => x.autoAbsorcao), 0.5), 4), p99: r(qtl(l.map((x) => x.autoAbsorcao), 0.99), 4), max: r(Math.max(...l.map((x) => x.autoAbsorcao)), 4) } });
out.umaZona = { brasil: resumoLimiar(linhas), porRegiao: Object.fromEntries(['N', 'NE', 'CO', 'SE', 'S'].map((g) => [g, resumoLimiar(linhas.filter((x) => x.reg === g))])) };
const cortesN = [0.2, 0.4, 0.6, 0.8].map((p) => qtl(linhas.map((x) => x.nominais2), p));
out.umaZona.porTamanho = [0, 1, 2, 3, 4].map((f) => ({ quintil: f + 1, ...resumoLimiar(linhas.filter((x) => cortesN.filter((c) => x.nominais2 > c).length === f)) }));
out.umaZona.maiorAutoAbsorcao = [...linhas].sort((a, b) => b.autoAbsorcao - a.autoAbsorcao).slice(0, 5).map((x) => ({ uf: x.uf, zona: x.zona, h: r(x.autoAbsorcao, 3), limiarPp: r(x.limiarAcrescimoPp) }));
log('uma zona');

// ---------- 2. várias zonas de uma UF ----------
let semente = 20261030;
const rnd = () => { semente |= 0; semente = (semente + 0x6d2b79f5) | 0; let t = Math.imul(semente ^ (semente >>> 15), 1 | semente); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const sorteia = (l, k) => { const a = [...l]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, k); };
const UFS = ['sp', 'mg', 'ba', 'rj', 'pe', 'ce', 'go', 'pa', 'rs', 'am', 'ap'];
const REPS = 40;
function multi(alvos, s, modo) {
  const inj = new Map(alvos.map((z) => [z, (s / 100) * z.n2]));
  const c = cenario(inj, modo);
  const totInj = [...inj.values()].reduce((a, b) => a + b, 0) * (modo === 'troca' ? 2 : 1);
  const restou = alvos.reduce((a, z) => a + c.rl[z.i] - base.rl[z.i], 0);
  const doUF = porUF.get(alvos[0].uf);
  const restouUF = doUF.reduce((a, z) => a + c.rl[z.i] - base.rl[z.i], 0);
  return { detectadas: alvos.filter((z) => c.fora[z.i] === 13).length, alvos: alvos.length,
    falsos13: Z.filter((z) => c.fora[z.i] === 13 && !inj.has(z)).length, sobraNasAlvos: restou / totInj, sobraNaUF: restouUF / totInj };
}
out.variasZonas = [];
for (const uf of UFS) {
  const l = porUF.get(uf);
  for (const f of [0.01, 0.05, 0.10, 0.25, 1]) {
    const k = Math.max(1, Math.round(f * l.length));
    for (const s of [2, 3, 5, 10]) {
      for (const modo of ['acrescimo', 'troca']) {
        const reps = f === 1 ? 1 : REPS;
        let det = 0, alv = 0, sobra = 0, sobraUF = 0, falsos = 0, algumaDetectada = 0;
        for (let rep = 0; rep < reps; rep++) {
          const m = multi(f === 1 ? l : sorteia(l, k), s, modo);
          det += m.detectadas; alv += m.alvos; sobra += m.sobraNasAlvos; sobraUF += m.sobraNaUF; falsos += m.falsos13; if (m.detectadas) algumaDetectada++;
        }
        out.variasZonas.push({ uf, zonasUF: l.length, fracao: f, zonasInseridas: k, pp: s, modo, sorteios: reps,
          detectadasPorAlvo: r(det / alv, 3), sorteiosComAlguma: r(algumaDetectada / reps, 3), sobraNasAlvos: r(sobra / reps, 3), sobraNaUF: r(sobraUF / reps, 3), falsos13Medio: r(falsos / reps, 2) });
      }
    }
  }
}
log('várias zonas');

// ---------- 3. capitais inteiras ----------
out.capitais = [];
for (const [nome, uf, mun] of [['Salvador', 'ba', '38490'], ['São Paulo', 'sp', '71072'], ['Rio de Janeiro', 'rj', '60011'], ['Fortaleza', 'ce', '13897'], ['Belo Horizonte', 'mg', '41238']]) {
  const alvos = Z.filter((z) => z.uf === uf && [...z.mun].sort((a, b) => b[1] - a[1])[0][0] === mun);
  for (const s of [1, 2, 3, 5]) for (const modo of ['acrescimo', 'troca']) out.capitais.push({ nome, zonas: alvos.length, pp: s, modo, ...multi(alvos, s, modo) });
}
// ---------- 4. inserção proporcional ao voto do 13 no 1º turno, na UF inteira (multiplicar o 13 por 1 + α) ----------
{
  const uf = 'ba', l = porUF.get(uf), alfa = 0.05;
  // Δy13 da seção = α·v13_1: Δb = α·e₁ exatamente (v13_1 é a primeira coluna de X); esperado absorve 100%.
  const g = new Float64Array(9);
  for (const s of S) if (s.uf === uf && s.fit) for (let j = 0; j < 9; j++) g[j] += alfa * s.v13_1 * s.x[j];
  const db = matVec(Ainv.get(uf), g);
  const inj = l.reduce((a, z) => a + alfa * z.v13_1, 0);
  const abs = l.reduce((a, z) => a + dot(z.SX, db), 0);
  out.proporcionalAo13 = { uf, alfa, votosInseridos: Math.round(inj), absorvidos: Math.round(abs), deltaB: [...db].map((v) => r(v, 5)) };
}
await writeFile(path.join(SAIDA, '34-h26-poder.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ ...out, variasZonas: out.variasZonas.filter((v) => ['sp', 'ba', 'go', 'ap'].includes(v.uf) && v.modo === 'acrescimo') }, null, 0));
