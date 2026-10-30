// Parecer cético 34 (H26), passo 5: o teste de modelo da urna dentro da zona.
// O autor soma o desvio da seção em relação à zona e divide pelos nominais de TODAS as seções do modelo, inclusive as de
// zonas com um só modelo (onde o desvio soma zero por construção). Aqui: (a) parcela dos nominais de cada modelo em zonas
// de modelo único; (b) o mesmo desvio só nas zonas mistas; (c) contraste com efeito fixo de zona (modelo × demais da
// mesma zona), peso = nominais do 2º turno, EP agrupado por zona; (d) menor desvio detectável (|z| = 3).
// Uso: node --max-old-space-size=8192 scripts/auditoria/cetico-34-h26-modelo.mjs  → 34-h26-modelo.json
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { SAIDA, lerSecoes, normais, coeficientes, dot, pp, r } from './cetico-34-h26-lib.mjs';

const S = await lerSecoes();
const C = coeficientes(normais(S));
const Z = new Map();
for (const s of S) {
  if (s.uf === 'zz' || s.nom2 <= 0) continue;
  const { b13, b22 } = C.get(s.uf);
  s.rl = (s.v13_2 - dot(s.x, b13)) - (s.v22_2 - dot(s.x, b22));
  s.g = s.modelo1 === s.modelo2 ? s.modelo2 : 'trocou';
  const k = `${s.uf}|${s.zona}`;
  (Z.get(k) ?? Z.set(k, []).get(k)).push(s);
}
const out = {};
for (const m of ['ue2013', 'ue2015', 'ue2020', 'ue2022']) {
  let Wtot = 0, Wmono = 0, D = 0, Wmix = 0;
  // contraste: y = pp(rl, nom2); x = 1 se modelo m; centrar na zona (ponderado)
  let Sxx = 0, Sxy = 0;
  const grupos = [];
  for (const l of Z.values()) {
    const W = l.reduce((a, s) => a + s.nom2, 0);
    const taxa = l.reduce((a, s) => a + s.rl, 0) / W;
    const doM = l.filter((s) => s.g === m);
    const wM = doM.reduce((a, s) => a + s.nom2, 0);
    Wtot += wM;
    if (wM === W) { Wmono += wM; continue; }
    if (wM === 0) continue;
    for (const s of doM) D += s.rl - s.nom2 * taxa;
    Wmix += wM;
    const mx = wM / W, my = l.reduce((a, s) => a + s.nom2 * pp(s.rl, s.nom2), 0) / W;
    const pts = l.map((s) => ({ w: s.nom2, x: (s.g === m ? 1 : 0) - mx, y: pp(s.rl, s.nom2) - my }));
    for (const p of pts) { Sxx += p.w * p.x * p.x; Sxy += p.w * p.x * p.y; }
    grupos.push(pts);
  }
  const b = Sxy / Sxx;
  let v = 0;
  for (const pts of grupos) { const u = pts.reduce((a, p) => a + p.w * p.x * (p.y - b * p.x), 0); v += u * u; }
  const G = grupos.length, ep = Math.sqrt(G / (G - 1) * v) / Sxx;
  out[m] = { parcelaEmZonasDeModeloUnico: r(pp(Wmono, Wtot), 1), desvioAutorPp: r(100 * D / Wtot, 4), desvioSoZonasMistasPp: r(100 * D / Wmix, 4),
    contrasteComZonaPp: { b: r(b, 4), ep: r(ep, 4), z: r(b / ep, 2), zonasMistas: G, menorDetectavelPp_z3: r(3 * ep, 3) } };
}
await writeFile(path.join(SAIDA, '34-h26-modelo.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
