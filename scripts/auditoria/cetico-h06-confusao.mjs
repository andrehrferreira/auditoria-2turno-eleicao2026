// Revisor cético, achado h06: a associação "seção com voto tardio × % do 13" sobrevive a controles óbvios?
//  1. Controle de tamanho: compara seções com e sem voto tardio dentro de (zona × faixa de comparecimento de 50).
//  2. Placebo do 1º turno com os votos tardios DO PRÓPRIO 1º turno (perfil_log do 1º turno; AM e BA sem perfil).
//     Se seções com voto tardio no 1º turno também pendem para o 13 no 1º turno, o padrão é do tipo de seção.
//  3. Diferença de diferenças 2º − 1º com controle de tamanho.
// Só lê a cópia de leitura do banco (abrirLeitura) e fuso-municipio.csv do autor.
// Uso: node scripts/auditoria/cetico-h06-confusao.mjs
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { abrirLeitura } from '../../src/banco-leitura.js';

const dirAutor = path.join(DIR_DADOS, 'parsed', 'auditoria', 'tempo', '2t');
const dirSaida = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');
await mkdir(dirSaida, { recursive: true });
const r3 = (x) => (x === null || Number.isNaN(x) ? null : +x.toFixed(3));
const fuso = new Map();
for (const l of (await readFile(path.join(dirAutor, 'fuso-municipio.csv'), 'utf8')).trim().split('\n').slice(1)) {
  const c = l.split(',');
  fuso.set(`${c[0]}/${c[1]}`, c[6] === '' ? null : Number(c[6]));
}
const { db, fonte } = await abrirLeitura();
console.error(`banco: ${fonte}`);

const S = new Map();
for (const turno of [2, 1]) {
  for (const r of db.prepare(`SELECT p.uf, p.municipio, p.zona, p.secao, json_extract(p.dados, '$.log.votosPorHoraLocal') AS ph, p.votos_computados AS votos
    FROM perfil_log p WHERE p.turno = ? AND p.uf <> 'zz'`).iterate(turno)) {
    const d = fuso.get(`${r.uf}/${r.municipio}`);
    if (d === null || d === undefined || !r.ph) continue;
    const k = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
    const s = S.get(k) ?? { uf: r.uf, mun: r.municipio, zona: r.zona };
    s[`late${turno}`] = JSON.parse(r.ph).slice(17 + d).reduce((a, b) => a + b, 0);
    s[`votos${turno}`] = r.votos;
    S.set(k, s);
  }
  for (const r of db.prepare(`SELECT uf, municipio, zona, secao,
      SUM(CASE WHEN tipo_voto = 'nominal' AND numero = 13 THEN quantidade ELSE 0 END) AS v13,
      SUM(CASE WHEN tipo_voto = 'nominal' AND numero = 22 THEN quantidade ELSE 0 END) AS v22
    FROM voto_bu WHERE turno = ? AND cargo = 1 GROUP BY uf, municipio, zona, secao`).iterate(turno)) {
    const s = S.get(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`);
    if (s && r.v13 + r.v22 >= 20) s[`p${turno}`] = r.v13 / (r.v13 + r.v22);
  }
}
db.close();

let semente = 4102026;
const aleat = () => { semente = (semente + 0x6d2b79f5) | 0; let t = Math.imul(semente ^ (semente >>> 15), 1 | semente); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; // mulberry32
// Diferença dentro do estrato (peso min(n_sim, n_nao)), bootstrap de estratos
function dif(lista, estrato, crit, y) {
  const g = new Map();
  for (const s of lista) { const v = y(s); if (v === null || v === undefined || Number.isNaN(v)) continue; const k = estrato(s); if (!g.has(k)) g.set(k, [[], []]); g.get(k)[crit(s) ? 0 : 1].push(v); }
  const zs = [];
  for (const [a, b] of g.values()) if (a.length && b.length) zs.push([Math.min(a.length, b.length), a.reduce((x, y_) => x + y_, 0) / a.length - b.reduce((x, y_) => x + y_, 0) / b.length]);
  const est = (arr) => arr.reduce((t, [w, d]) => t + w * d, 0) / arr.reduce((t, [w]) => t + w, 0);
  const e = est(zs);
  const boot = Array.from({ length: 300 }, () => est(Array.from({ length: zs.length }, () => zs[Math.floor(aleat() * zs.length)])));
  const mb = boot.reduce((a, b) => a + b, 0) / boot.length;
  const ep = Math.sqrt(boot.reduce((a, b) => a + (b - mb) ** 2, 0) / (boot.length - 1));
  return { estratos: zs.length, dif_pp: r3(100 * e), ep_pp: r3(100 * ep), z: +(e / ep).toFixed(2) };
}
const zona = (s) => `${s.uf}/${s.mun}/${s.zona}`;
const zonaTam = (t) => (s) => `${zona(s)}/${Math.floor(s[`votos${t}`] / 50)}`;
const todos = [...S.values()];
const l2 = todos.filter((s) => s.p2 !== undefined && s.late2 !== undefined);
const l12 = l2.filter((s) => s.p1 !== undefined);
const l1 = todos.filter((s) => s.p1 !== undefined && s.late1 !== undefined);
const res = {
  fonte: path.basename(fonte), geradoEm: new Date().toISOString(),
  n: { secoes2t: l2.length, secoes2tCom1t: l12.length, secoes1tComPerfil: l1.length, votosApos17_1t: l1.reduce((a, s) => a + s.late1, 0), secoesComTardio_1t: l1.filter((s) => s.late1 > 0).length },
  t2_tardio2_zona: dif(l2, zona, (s) => s.late2 > 0, (s) => s.p2),
  t2_tardio2_zonaETamanho: dif(l2, zonaTam(2), (s) => s.late2 > 0, (s) => s.p2),
  t2menos1_tardio2_zona: dif(l12, zona, (s) => s.late2 > 0, (s) => s.p2 - s.p1),
  t2menos1_tardio2_zonaETamanho: dif(l12, zonaTam(2), (s) => s.late2 > 0, (s) => s.p2 - s.p1),
  placebo_t1_tardio1_zona: dif(l1, zona, (s) => s.late1 > 0, (s) => s.p1),
  placebo_t1_tardio1_zonaETamanho: dif(l1, zonaTam(1), (s) => s.late1 > 0, (s) => s.p1),
  placebo_t2_tardio1_zona: dif(l1.filter((s) => s.p2 !== undefined), zona, (s) => s.late1 > 0, (s) => s.p2),
  nota: 'dif em p.p. do % do 13 em 13+22; positivo = seções com voto tardio mais favoráveis ao 13. Faixa de tamanho = votos no log / 50.',
};
await writeFile(path.join(dirSaida, 'h06-confusao.json'), JSON.stringify(res, null, 2));
console.log(JSON.stringify(res, null, 1));
