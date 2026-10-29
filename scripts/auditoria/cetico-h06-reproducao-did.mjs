// Revisor cético, h06 (lente reprodução e código): refaz a comparação "locais encerrados às 19h × locais normais da
// mesma zona" e a diferença de diferenças contra o 1º turno, com o 1º turno que já está no banco AGORA (o autor rodou
// com 11 UFs, sem RJ/PE/PB), com erro-padrão entre zonas e com a mesma medida nos dois turnos (13/(13+22)) além da
// medida do autor (1º turno: 13/nominais). Fuso pela abertura do BU. Só leitura (abrirLeitura).
// Uso: node scripts/auditoria/cetico-h06-reproducao-did.mjs  → data/parsed/auditoria/cetico/h06-reproducao-did.json
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { abrirLeitura } from '../../src/banco-leitura.js';

const { db, fonte } = await abrirLeitura();
const hms = (s) => Number(s.slice(11, 13)) * 3600 + Number(s.slice(14, 16)) * 60 + Number(s.slice(17, 19));
const ufs1 = new Set(db.prepare(`SELECT DISTINCT uf FROM secao WHERE turno = 1 AND situacao = 'completa'`).all().map((r) => r.uf));
const sec = db.prepare(`SELECT uf, municipio, zona, secao, local, abertura, encerramento FROM secao WHERE turno = 2 AND situacao = 'completa' AND uf <> 'zz'`).all();
const moda = new Map();
for (const s of sec) { const k = `${s.uf}/${s.municipio}`; const h = Number(s.abertura.slice(11, 13)); const m = moda.get(k) ?? new Map(); m.set(h, (m.get(h) ?? 0) + 1); moda.set(k, m); }
const fuso = new Map([...moda].map(([k, m]) => [k, [...m].sort((a, b) => b[1] - a[1])[0][0] - 8]));
const votos = (turno) => {
  const m = new Map();
  for (const r of db.prepare(`SELECT uf, municipio, zona, secao, numero, quantidade FROM voto_bu WHERE turno = ? AND cargo = 1 AND tipo_voto = 'nominal'`).iterate(turno)) {
    const k = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
    const o = m.get(k) ?? { v13: 0, v22: 0, nom: 0 };
    o.nom += r.quantidade; if (r.numero === 13) o.v13 += r.quantidade; else if (r.numero === 22) o.v22 += r.quantidade;
    m.set(k, o);
  }
  return m;
};
const v2 = votos(2), v1 = votos(1);
const locais = new Map();
for (const s of sec) {
  s.k = `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`;
  s.enc = hms(s.encerramento) - fuso.get(`${s.uf}/${s.municipio}`) * 3600;
  s.c19 = s.enc >= 19 * 3600;
  const kl = `${s.uf}/${s.municipio}/${s.zona}/${s.local}`;
  (locais.get(kl) ?? locais.set(kl, []).get(kl)).push(s);
}
for (const l of locais.values()) { const n = l.filter((s) => s.c19).length; for (const s of l) s.tipoLocal = n === 0 ? 'normal' : n === l.length ? 'todas_19h' : 'misto'; }
const p2 = (s) => { const v = v2.get(s.k); return v && v.v13 + v.v22 >= 20 ? v.v13 / (v.v13 + v.v22) : null; };
const p1a = (s) => { const v = v1.get(s.k); return v && v.v13 + v.v22 >= 20 ? v.v13 / (v.v13 + v.v22) : null; };
const p1b = (s) => { const v = v1.get(s.k); return v && v.nom >= 20 ? v.v13 / v.nom : null; };
function comparar(filtro, grupoA, grupoB) {
  const zonas = new Map();
  for (const s of sec) if (filtro(s)) { const k = `${s.uf}/${s.municipio}/${s.zona}`; (zonas.get(k) ?? zonas.set(k, []).get(k)).push(s); }
  const est = (f) => {
    const dz = [];
    for (const l of zonas.values()) {
      const a = l.filter((s) => grupoA(s) && f(s) !== null), b = l.filter((s) => grupoB(s) && f(s) !== null);
      if (!a.length || !b.length) continue;
      const m = (x) => x.reduce((q, s) => q + f(s), 0) / x.length;
      dz.push({ w: Math.min(a.length, b.length), d: m(a) - m(b), na: a.length });
    }
    if (!dz.length) return null;
    const W = dz.reduce((q, z) => q + z.w, 0), e = dz.reduce((q, z) => q + z.w * z.d, 0) / W;
    const se = Math.sqrt(dz.reduce((q, z) => q + z.w * z.w * (z.d - e) ** 2, 0)) / W;
    return { zonas: dz.length, secoesGrupoA: dz.reduce((q, z) => q + z.na, 0), estimativa_pp: +(100 * e).toFixed(2), erroPadrao_pp: +(100 * se).toFixed(2), ic95_pp: [+(100 * (e - 1.96 * se)).toFixed(2), +(100 * (e + 1.96 * se)).toFixed(2)] };
  };
  return {
    segundoTurno: est(p2),
    did_mesmaMedida_13sobre13mais22: est((s) => (p2(s) === null || p1a(s) === null ? null : p2(s) - p1a(s))),
    did_medidaDoAutor_1tSobreNominais: est((s) => (p2(s) === null || p1b(s) === null ? null : p2(s) - p1b(s))),
  };
}
const locaisAB = [(s) => s.tipoLocal === 'todas_19h', (s) => s.tipoLocal === 'normal'];
const secoesAB = [(s) => s.c19, (s) => s.enc < 17.5 * 3600];
const out = { fonte, ufsDo1turno: [...ufs1].sort(), geradoEm: new Date().toISOString(), locais19hXnormais: {}, secoes19hXsecoes17h: {} };
for (const [nome, f] of [['todasUfsCom1t', (s) => ufs1.has(s.uf)], ['rj', (s) => s.uf === 'rj'], ['ba', (s) => s.uf === 'ba'], ['pe', (s) => s.uf === 'pe'], ['pb', (s) => s.uf === 'pb'], ['todasUfs_so2t', () => true]]) {
  out.locais19hXnormais[nome] = comparar(f, ...locaisAB);
  out.secoes19hXsecoes17h[nome] = comparar(f, ...secoesAB);
}
await writeFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'h06-reproducao-did.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 1));
