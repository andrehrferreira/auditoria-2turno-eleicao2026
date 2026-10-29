// Revisor cético, h06 (lente reprodução e código): o +0,26 p.p. (seções com voto depois das 17h × sem, mesma zona)
// é composição prévia da seção ou efeito do 2º turno? Diferença de diferenças contra o 1º turno da MESMA seção,
// medida 13/(13+22) nos dois turnos, só UFs com 1º turno no banco. Erro-padrão entre zonas.
// Requer h06-secoes-tardias.csv (cetico-h06-reproducao.mjs). Uso: node scripts/auditoria/cetico-h06-reproducao-did-tardios.mjs
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { abrirLeitura } from '../../src/banco-leitura.js';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');
const t17 = new Map((await readFile(path.join(SAIDA, 'h06-secoes-tardias.csv'), 'utf8')).trim().split('\n').slice(1).map((l) => l.split(','))
  .map((c) => [`${c[0]}/${c[1]}/${c[2]}/${c[3]}`, Number(c[5])]));
const { db, fonte } = await abrirLeitura();
const ufs1 = new Set(db.prepare(`SELECT DISTINCT uf FROM secao WHERE turno = 1 AND situacao = 'completa'`).all().map((r) => r.uf));
const votos = (turno) => {
  const m = new Map();
  for (const r of db.prepare(`SELECT uf, municipio, zona, secao, numero, quantidade FROM voto_bu WHERE turno = ? AND cargo = 1 AND tipo_voto = 'nominal' AND numero IN (13, 22)`).iterate(turno)) {
    if (!ufs1.has(r.uf)) continue;
    const k = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
    const o = m.get(k) ?? { v13: 0, v22: 0 };
    if (r.numero === 13) o.v13 += r.quantidade; else o.v22 += r.quantidade;
    m.set(k, o);
  }
  return m;
};
const v2 = votos(2), v1 = votos(1);
const p = (v) => (v && v.v13 + v.v22 >= 20 ? v.v13 / (v.v13 + v.v22) : null);
const zonas = new Map();
for (const [k, v] of v2) {
  const a = p(v), b = p(v1.get(k));
  if (a === null || b === null) continue;
  const z = k.split('/').slice(0, 3).join('/');
  const t = t17.get(k) ?? 0, n = v.v13 + v.v22;
  (zonas.get(z) ?? zonas.set(z, []).get(z)).push({ tardio: t > 0, p2: a, did: a - b, n, x: t / n });
}
function est(campo, grupos = zonas) {
  const dz = [];
  for (const l of grupos.values()) {
    const A = l.filter((s) => s.tardio), B = l.filter((s) => !s.tardio);
    if (!A.length || !B.length) continue;
    const m = (x) => x.reduce((q, s) => q + s[campo], 0) / x.length;
    dz.push({ w: Math.min(A.length, B.length), d: m(A) - m(B) });
  }
  const W = dz.reduce((q, z) => q + z.w, 0), e = dz.reduce((q, z) => q + z.w * z.d, 0) / W;
  const se = Math.sqrt(dz.reduce((q, z) => q + z.w * z.w * (z.d - e) ** 2, 0)) / W;
  return { zonas: dz.length, estimativa_pp: +(100 * e).toFixed(3), erroPadrao_pp: +(100 * se).toFixed(3), ic95_pp: [+(100 * (e - 1.96 * se)).toFixed(3), +(100 * (e + 1.96 * se)).toFixed(3)] };
}
// Controle de tamanho: zona × tercil de votos (13+22) da seção no 2º turno
const porTamanho = new Map();
for (const [z, l] of zonas) [...l].sort((a, b) => a.n - b.n).forEach((s, i, o) => { const k = `${z}#${Math.floor((3 * i) / o.length)}`; (porTamanho.get(k) ?? porTamanho.set(k, []).get(k)).push(s); });
// Dose-resposta: inclinação de did ~ parcela tardia (t17/votos) dentro da zona; se todos os tardios fossem do 13, ≈ +0,48
function inclinacao() {
  let sxy = 0, sxx = 0;
  const g = [];
  for (const l of zonas.values()) {
    if (l.length < 2) continue;
    const mx = l.reduce((q, s) => q + s.x, 0) / l.length, my = l.reduce((q, s) => q + s.did, 0) / l.length;
    const xs = l.map((s) => s.x - mx), ys = l.map((s) => s.did - my);
    g.push({ xs, ys }); xs.forEach((x, i) => { sxy += x * ys[i]; sxx += x * x; });
  }
  const b = sxy / sxx;
  let meat = 0;
  for (const { xs, ys } of g) { const u = xs.reduce((q, x, i) => q + x * (ys[i] - b * x), 0); meat += u * u; }
  const se = Math.sqrt(meat) / sxx;
  return { inclinacao: +b.toFixed(3), erroPadraoAgrupado: +se.toFixed(3), ic95: [+(b - 1.96 * se).toFixed(3), +(b + 1.96 * se).toFixed(3)] };
}
const out = { fonte, ufs: [...ufs1].sort(), secoesNasDuasRodadas: [...zonas.values()].reduce((q, l) => q + l.length, 0),
  segundoTurno_nasUfsCom1t: est('p2'), diferencaDeDiferencas_2tMenos1t: est('did'),
  did_controleTamanho_zonaXtercil: est('did', porTamanho), doseResposta_did_x_parcelaTardia: inclinacao() };
await writeFile(path.join(SAIDA, 'h06-reproducao-did-tardios.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 1));
