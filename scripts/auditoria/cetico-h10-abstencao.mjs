// Revisor cético (H10): a perda do 22 em AC, AP, AM e MA cabe na queda de comparecimento, seção por seção?
// Banco em somente leitura (BUs dos dois turnos; só UFs com o 1º turno carregado). Sem rede.
// Para cada seção presente nos dois turnos:
//   atrito_F = F1 × (comp2/comp1 − 1) quando o comparecimento caiu (perda esperada se quem deixou de votar
//   tinha a composição da própria seção no 1º turno e o 22 não ganhou nada dos eliminados nem dos brancos/nulos).
//   perda não explicada = max(0, atrito_F − ΔF) ... ou seja, ΔF abaixo do que o atrito proporcional explica.
// Também: inclinação ponderada de Δcomp/aptos sobre a fatia do 22 no 1º turno, com erro-padrão (bootstrap por seção).
// Uso: node scripts/auditoria/cetico-h10-abstencao.mjs [ufs separadas por vírgula]
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, writeFileSync } from 'node:fs';

const UFS = (process.argv[2] ?? 'ac,ap,am,ma').split(',');
const db = new DatabaseSync('data/db/eleicao2026.sqlite', { readOnly: true });
const carregadas = new Set(db.prepare('select uf from carga where turno = 1').all().map((r) => r.uf));
const out = {};
for (const uf of UFS) {
  if (!carregadas.has(uf)) { out[uf] = { erro: '1º turno não carregado no banco' }; continue; }
  const sec = new Map();
  for (const r of db.prepare(`select turno, municipio, zona, secao, tipo_voto, numero, quantidade from voto_bu where uf = ? and cargo = 1`).iterate(uf)) {
    const k = `${r.municipio}|${r.zona}|${r.secao}`;
    let s = sec.get(k);
    if (!s) { s = { 1: { L: 0, F: 0, comp: 0 }, 2: { L: 0, F: 0, comp: 0 } }; sec.set(k, s); }
    const a = s[r.turno];
    a.comp += r.quantidade;
    if (r.tipo_voto === 'nominal' && r.numero === 13) a.L += r.quantidade;
    if (r.tipo_voto === 'nominal' && r.numero === 22) a.F += r.quantidade;
  }
  for (const r of db.prepare(`select turno, municipio, zona, secao, aptos from secao_eleicao where uf = ? and eleicao in (6257, 6258)`).iterate(uf)) {
    const s = sec.get(`${r.municipio}|${r.zona}|${r.secao}`);
    if (s) s[r.turno].aptos = r.aptos;
  }
  const R = { secoes: 0, dF: 0, dL: 0, atritoF: 0, atritoL: 0, naoExplicadaF: 0, secoesNaoExplicadaF: 0, naoExplicadaL: 0, secoesNaoExplicadaL: 0, secoesCompCaiu: 0 };
  const pts = [];
  for (const s of sec.values()) {
    const a = s[1], b = s[2];
    if (!a.comp || !b.comp || !a.aptos) continue;
    R.secoes++;
    const dF = b.F - a.F, dL = b.L - a.L;
    R.dF += dF; R.dL += dL;
    const f = Math.min(0, b.comp / a.comp - 1);
    if (f < 0) R.secoesCompCaiu++;
    const atF = a.F * f, atL = a.L * f;
    R.atritoF += atF; R.atritoL += atL;
    if (dF < atF) { R.naoExplicadaF += atF - dF; R.secoesNaoExplicadaF++; }
    if (dL < atL) { R.naoExplicadaL += atL - dL; R.secoesNaoExplicadaL++; }
    if (a.L + a.F >= 20) pts.push({ w: a.aptos, x: a.F / (a.L + a.F), y: (b.comp - a.comp) / a.aptos });
  }
  const reg = (p) => {
    let sw = 0, sx = 0, sy = 0;
    for (const q of p) { sw += q.w; sx += q.w * q.x; sy += q.w * q.y; }
    const mx = sx / sw, my = sy / sw;
    let sxy = 0, sxx = 0;
    for (const q of p) { sxy += q.w * (q.x - mx) * (q.y - my); sxx += q.w * (q.x - mx) ** 2; }
    return sxy / sxx;
  };
  const beta = reg(pts);
  // bootstrap simples (200 reamostragens) com gerador determinístico (mulberry32)
  let seed = 12345;
  const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const bs = [];
  for (let i = 0; i < 200; i++) bs.push(reg(Array.from({ length: pts.length }, () => pts[Math.floor(rnd() * pts.length)])));
  bs.sort((x, y) => x - y);
  for (const k of ['atritoF', 'atritoL', 'naoExplicadaF', 'naoExplicadaL']) R[k] = Math.round(R[k]);
  R.inclinacaoDCompSobreFatia22 = +beta.toFixed(4);
  R.ic95 = [+bs[5].toFixed(4), +bs[194].toFixed(4)];
  out[uf] = R;
}
db.close();
mkdirSync('data/parsed/auditoria/cetico', { recursive: true });
writeFileSync('data/parsed/auditoria/cetico/h10-abstencao.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
