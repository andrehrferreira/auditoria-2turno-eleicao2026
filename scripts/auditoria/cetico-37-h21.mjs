// Parecer cético 37, H21 (número nulo como "senha" no RDV): reprodução por caminho próprio e teste do passo exploratório.
// Não lê as saídas de estatistico-h21-*.mjs. Uma passada própria pela voto_rdv (tipo_voto = 'nulo', dois turnos), testes
// C, R e G do plano (13-h21-plano.md) com código próprio, famílias F1–F6 reconstruídas dos dados abertos.
// Além do plano:
//   Q1 cobertura das famílias benignas: que fração de todos os números possíveis de cada cargo e UF cai em alguma família
//      (o que o teste nunca poderia apontar como "senha", por construção).
//   Q2 2º turno sem o corte R e sem famílias: números com concentração (C) e crescimento (G) na mesma zona.
//   Q3 controle de acaso do passo exploratório (14 de 19 "perto de candidato forte"): fração incondicional (como na origem)
//      e fração condicional aos números que passam pelas famílias (o universo de onde os 19 saíram), com limiar de 2%, 5% e 10%.
// Só leitura. Uso: node --max-old-space-size=12288 scripts/auditoria/cetico-37-h21.mjs
// Saída: data/parsed/auditoria/cetico-revisor/37-h21.json
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { entradasZip, linhasBrutas } from './contagem-zip.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const SAIDA = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico-revisor');
await mkdir(SAIDA, { recursive: true });
const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const CARGOS = new Set([1, 3, 5, 6, 7, 8]);
const DIG = { 1: 2, 3: 2, 5: 3, 6: 4, 7: 5, 8: 5 };
const GOV2 = new Set(['ac', 'am', 'df', 'es', 'rn', 'to']);
const res = {};

// ---------- distribuições próprias ----------
function lgamma(x) {
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61503916999185, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  x -= 1; let a = c[0]; const t = x + 7.5; for (let i = 1; i < 9; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
function cfBeta(a, b, x) { // Lentz modificado
  const TINY = 1e-300; let f = 1, C = 1, D = 0;
  for (let i = 0; i <= 3000; i++) {
    let num;
    if (i === 0) num = 1;
    else { const m = Math.floor(i / 2); num = i % 2 === 0 ? (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m)) : -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1)); }
    D = 1 + num * D; if (Math.abs(D) < TINY) D = TINY; D = 1 / D;
    C = 1 + num / C; if (Math.abs(C) < TINY) C = TINY;
    const cd = C * D; f *= cd;
    if (Math.abs(1 - cd) < 1e-15) break;
  }
  return f - 1;
}
function lnIbeta(a, b, x) { // ln I_x(a, b)
  if (x <= 0) return -Infinity; if (x >= 1) return 0;
  const lnF = a * Math.log(x) + b * Math.log1p(-x) - (lgamma(a) + lgamma(b) - lgamma(a + b));
  if (x < (a + 1) / (a + b + 2)) return lnF - Math.log(a) + Math.log(cfBeta(a, b, x));
  return Math.log(Math.max(1e-300, 1 - Math.exp(lnF - Math.log(b) + Math.log(cfBeta(b, a, 1 - x)))));
}
const lnSup = (n, p, k) => (k <= 0 ? 0 : k > n || p <= 0 ? -Infinity : p >= 1 ? 0 : lnIbeta(k, n - k + 1, p)); // ln P(Bin(n,p) ≥ k)
function bhq(ps) {
  const n = ps.length, ord = ps.map((_, i) => i).sort((i, j) => ps[i] - ps[j]), q = new Array(n); let acc = Infinity;
  for (let r = n - 1; r >= 0; r--) { acc = Math.min(acc, (ps[ord[r]] * n) / (r + 1)); q[ord[r]] = Math.min(1, acc); }
  return q;
}

// ---------- passada pela voto_rdv ----------
const { db, fonte } = await abrirLeitura();
res.fonte = path.basename(fonte);
const tot = { 1: 0, 2: 0 }, fora = {};
const nums = new Map(); // cargo|ambito|d -> { n:[0,0,0], z: Map(zona -> [0,c1,c2]) }
const expZ = new Map(), expA = new Map(), munZona = new Map();
const q = db.prepare(`SELECT turno, uf, municipio, zona, cargo, tipo_voto, digitacao d, quantidade q FROM voto_rdv WHERE tipo_voto IN ('nulo','nuloAposSuspensao','nuloPorRepeticao')`);
for (const r of q.iterate()) {
  if (r.tipo_voto !== 'nulo') { const k = `${r.turno}|${r.tipo_voto}`; fora[k] = (fora[k] ?? 0) + r.q; continue; }
  tot[r.turno] += r.q;
  const amb = r.cargo === 1 ? 'br' : r.uf, z = `${r.uf}|${r.zona}`, k = `${r.cargo}|${amb}|${r.d ?? ''}`;
  let o = nums.get(k); if (!o) { o = { n: [0, 0, 0], z: new Map() }; nums.set(k, o); }
  o.n[r.turno] += r.q;
  let zz = o.z.get(z); if (!zz) { zz = [0, 0, 0]; o.z.set(z, zz); } zz[r.turno] += r.q;
  const kz = `${r.cargo}|${z}`; let e = expZ.get(kz); if (!e) { e = [0, 0, 0]; expZ.set(kz, e); } e[r.turno] += r.q;
  const ka = `${r.cargo}|${amb}`; let ea = expA.get(ka); if (!ea) { ea = [0, 0, 0]; expA.set(ka, ea); } ea[r.turno] += r.q;
  if (r.turno === 1) { let m = munZona.get(z); if (!m) { m = new Map(); munZona.set(z, m); } m.set(r.municipio, (m.get(r.municipio) ?? 0) + r.q); }
}
res.totais = { nulo: tot, foraDoTeste: fora, numeros: nums.size };
log(`rdv lido: ${tot[1]} e ${tot[2]} nulos`);

// ---------- números válidos ----------
const qualquer = new Set(), partidos = new Set(), validos = new Map();
const nrm = (s) => String(Number(s));
const addV = (c, a, nr) => { const k = `${c}|${a}`; if (!validos.has(k)) validos.set(k, new Set()); validos.get(k).add(nr); };
{
  const zip = path.join(RAIZ, 'data', 'raw', 'dadosabertos', 'consulta_cand', 'consulta_cand_2026.zip');
  for (const e of (await entradasZip(zip)).filter((x) => x.nome.endsWith('.csv'))) {
    let col = null;
    for await (const c of linhasBrutas(zip, e)) {
      if (!col) { col = Object.fromEntries(c.map((x, i) => [x, i])); continue; }
      const cargo = Number(c[col.CD_CARGO]), nr = nrm(c[col.NR_CANDIDATO]), pt = nrm(c[col.NR_PARTIDO]);
      if (!Number.isFinite(Number(nr))) continue;
      qualquer.add(nr); if (Number(pt) > 0) { qualquer.add(pt); partidos.add(pt); }
      if (CARGOS.has(cargo)) { const a = cargo === 1 ? 'br' : c[col.SG_UF].toLowerCase(); addV(cargo, a, nr); if (cargo >= 6 && Number(pt) > 0) addV(cargo, a, pt); }
    }
  }
}
for (const ano of [2018, 2022]) {
  const zip = path.join(RAIZ, 'data', 'raw', 'dadosabertos', 'votacao_candidato_munzona', `votacao_candidato_munzona_${ano}.zip`);
  for (const e of (await entradasZip(zip)).filter((x) => /_[A-Z]{2}\.csv$/.test(x.nome))) {
    let col = null;
    for await (const c of linhasBrutas(zip, e)) {
      if (!col) { col = Object.fromEntries(c.map((x, i) => [x, i])); continue; }
      const nr = nrm(c[col.NR_CANDIDATO]), pt = nrm(c[col.NR_PARTIDO]);
      if (Number.isFinite(Number(nr))) qualquer.add(nr); if (Number(pt) > 0) { qualquer.add(pt); partidos.add(pt); }
    }
  }
  log(`munzona ${ano}`);
}
const viz = new Map();
for (const [k, set] of validos) {
  const v = new Set();
  for (const nr of set) for (let i = 0; i < nr.length; i++) {
    for (let d = 0; d <= 9; d++) v.add(nr.slice(0, i) + d + nr.slice(i + 1));
    if (i < nr.length - 1) v.add(nr.slice(0, i) + nr[i + 1] + nr[i] + nr.slice(i + 2));
  }
  for (const nr of set) v.delete(nr);
  viz.set(k, v);
}
function fam(cargo, amb, d) {
  const f = [];
  if (/^[1-9]/.test(d) && qualquer.has(nrm(d))) f.push('F1');
  if (d.length && /^(\d)\1*$/.test(d)) f.push('F2');
  if (viz.get(`${cargo}|${amb}`)?.has(d)) f.push('F3');
  if (d.length < DIG[cargo]) f.push('F4');
  if (cargo >= 5 && d.length >= 2 && d[0] !== '0' && partidos.has(nrm(d.slice(0, 2)))) f.push('F5');
  if (d.length >= 2) { let up = true, dn = true; for (let i = 1; i < d.length; i++) { if (+d[i] !== +d[i - 1] + 1) up = false; if (+d[i] !== +d[i - 1] - 1) dn = false; } if (up || dn) f.push('F6'); }
  return f;
}
res.validos = { numerosQualquer: qualquer.size, partidos: partidos.size };

// ---------- testes ----------
const nZonas = new Map();
for (const [kz, e] of expZ) { const [c, uf] = kz.split('|'); const a = c === '1' ? 'br' : uf; for (const t of [1, 2]) if (e[t] > 0) nZonas.set(`${c}|${a}|${t}`, (nZonas.get(`${c}|${a}|${t}`) ?? 0) + 1); }
const testes = [];
for (const [k, o] of nums) {
  const [cs, amb, d] = k.split('|'); const cargo = Number(cs);
  if (!CARGOS.has(cargo)) continue;
  for (const t of [1, 2]) {
    const N = o.n[t]; if (N < 10) continue;
    const E = expA.get(`${cargo}|${amb}`)[t];
    let best = null; const cont = [];
    for (const [z, c] of o.z) {
      const x = c[t]; if (!x) continue; cont.push(x);
      const e = expZ.get(`${cargo}|${z}`);
      const lp = lnSup(N, e[t] / E, x);
      if (!best || lp < best.lp) best = { z, x, e: e[t], lp, x1: c[1], x2: c[2], e1: e[1], e2: e[2] };
    }
    cont.sort((a, b) => b - a);
    const top3 = (cont[0] + (cont[1] ?? 0) + (cont[2] ?? 0)) / N;
    const resto = N - best.x, lift = resto > 0 ? (best.x / best.e) / (resto / (E - best.e)) : Infinity;
    const r = { t, cargo, amb, d, N, zona: best.z, x: best.x, lift, top3, lnp: Math.min(0, best.lp + Math.log(nZonas.get(`${cargo}|${amb}|${t}`))) };
    if (t === 2 && (cargo === 1 || (cargo === 3 && GOV2.has(amb)))) {
      const m = best.x1 + best.x2, pi = best.e2 / (best.e1 + best.e2);
      r.esp2 = m * pi; r.pG = Math.exp(lnSup(m, pi, best.x2)); r.G = r.pG < 0.01 && best.x2 >= 2 * r.esp2; r.x1 = best.x1;
    }
    testes.push(r);
  }
}
const qs = bhq(testes.map((r) => Math.exp(r.lnp)));
testes.forEach((r, i) => {
  r.q = qs[i]; r.C = r.q < 0.01 && r.lift >= 10 && r.x >= 10; r.R = r.top3 >= 0.5; r.gT = r.G !== undefined;
  r.sinal = r.C && r.R && (!r.gT || r.G); r.fam = fam(r.cargo, r.amb, r.d); r.cand = r.sinal && r.fam.length === 0;
});
const NOME = { 1: 'presidente', 3: 'governador', 5: 'senador', 6: 'dep. federal', 7: 'dep. estadual', 8: 'dep. distrital' };
res.porCargo = {};
for (const t of [1, 2]) for (const c of [1, 3, 5, 6, 7, 8]) {
  const l = testes.filter((r) => r.t === t && r.cargo === c); if (!l.length) continue;
  res.porCargo[`${t}T ${NOME[c]}`] = { testes: l.length, C: l.filter((r) => r.C).length, R: l.filter((r) => r.R).length, CeR: l.filter((r) => r.C && r.R).length,
    G: l.filter((r) => r.G).length, sinal: l.filter((r) => r.sinal).length, familia: l.filter((r) => r.sinal && r.fam.length).length, candidatos: l.filter((r) => r.cand).length };
}
const cands = testes.filter((r) => r.cand);
res.candidatos = { n: cands.length, ocorrencias: cands.reduce((a, r) => a + r.N, 0), naZona: cands.reduce((a, r) => a + r.x, 0),
  lista: cands.map((r) => ({ cargo: r.cargo, uf: r.amb, d: r.d, N: r.N, zona: r.zona, x: r.x })) };
res.testes = testes.length;
// presidente 2º turno: menor N, maior top3
const p2 = testes.filter((r) => r.t === 2 && r.cargo === 1);
res.presidente2T = { numeros: p2.length, menorN: Math.min(...p2.map((r) => r.N)), maiorTop3: Math.max(...p2.map((r) => r.top3)),
  semFamilia: p2.filter((r) => !r.fam.length).map((r) => r.d),
  // Q2: C e G na mesma zona, ignorando R e famílias
  CeG: testes.filter((r) => r.t === 2 && r.C && r.G).map((r) => ({ cargo: r.cargo, amb: r.amb, d: r.d, N: r.N, zona: r.zona, x2: r.x, x1: r.x1, esp2: +r.esp2.toFixed(1), familias: r.fam.join(',') })) };
log('testes');

// ---------- Q1 cobertura das famílias ----------
res.cobertura = {};
for (const c of [1, 5, 6, 7]) {
  const ambs = c === 1 ? ['br'] : [...new Set([...validos.keys()].filter((k) => k.startsWith(`${c}|`)).map((k) => k.split('|')[1]))];
  const L = DIG[c], total = 10 ** L, fr = [], frSemF5 = [];
  for (const a of ambs) {
    let n = 0, nSemF5 = 0;
    for (let i = 0; i < total; i++) {
      const d = String(i).padStart(L, '0'); const f = fam(c, a, d);
      if (f.length) n++; if (f.some((x) => x !== 'F5')) nSemF5++;
    }
    fr.push(n / total); frSemF5.push(nSemF5 / total);
  }
  fr.sort((a, b) => a - b); frSemF5.sort((a, b) => a - b);
  res.cobertura[NOME[c]] = { ambitos: ambs.length, digitos: L, fracaoEmFamilia: { min: +fr[0].toFixed(3), mediana: +fr[Math.floor(fr.length / 2)].toFixed(3), max: +fr.at(-1).toFixed(3) },
    semContarF5: { min: +frSemF5[0].toFixed(3), mediana: +frSemF5[Math.floor(frSemF5.length / 2)].toFixed(3), max: +frSemF5.at(-1).toFixed(3) } };
}
log('cobertura');

// ---------- Q3 controle de acaso do passo exploratório ----------
const POS = { 1: [0, 0], 2: [0, 1], 3: [0, 2], 4: [1, 0], 5: [1, 1], 6: [1, 2], 7: [2, 0], 8: [2, 1], 9: [2, 2], 0: [3, 1] };
const adj = (a, b) => Math.abs(POS[a][0] - POS[b][0]) + Math.abs(POS[a][1] - POS[b][1]) === 1;
const dedo = (v, d) => { if (v.length !== d.length) return false; let n = 0; for (let i = 0; i < v.length; i++) { if (v[i] === d[i]) continue; if (!adj(v[i], d[i])) return false; n++; } return n > 0; };
function dl(a, b) { // Damerau-Levenshtein restrito (OSA)
  const m = a.length, n = b.length, D = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) D[i][0] = i; for (let j = 0; j <= n; j++) D[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) D[i][j] = Math.min(D[i][j], D[i - 2][j - 2] + 1);
  }
  return D[m][n];
}
const perto = (v, t) => v !== t && (dl(v, t) <= 2 || dedo(v, t));
const qMun = db.prepare('SELECT DISTINCT municipio FROM secao WHERE turno = 1 AND uf = ? AND zona = ?');
res.acaso = { porLimiar: {}, casos: [] };
const lims = [0.02, 0.05, 0.10];
const acc = Object.fromEntries(lims.map((l) => [l, { obsMesmoTamanho: 0, obsQualquerTamanho: 0, espIncond: 0, espCond: 0 }]));
for (const c of cands) {
  const [uf, zona] = c.zona.split('|');
  const muns = qMun.all(uf, zona).map((r) => r.municipio);
  const votos = db.prepare(`SELECT numero, SUM(quantidade) q FROM voto_bu WHERE turno = 1 AND uf = ? AND zona = ? AND cargo = ? AND tipo_voto = 'nominal'
    AND municipio IN (${muns.map(() => '?').join(',')}) GROUP BY numero`).all(uf, zona, c.cargo, ...muns);
  const T = votos.reduce((a, v) => a + v.q, 0);
  const caso = { cargo: c.cargo, uf, d: c.d, zona: c.zona };
  const L = c.d.length, total = 10 ** L;
  const semFam = new Uint8Array(total);
  for (let i = 0; i < total; i++) semFam[i] = fam(c.cargo, uf, String(i).padStart(L, '0')).length ? 0 : 1;
  const pertoCache = new Map();
  for (const lim of lims) {
    const fortes = votos.filter((v) => v.q >= lim * T).map((v) => String(v.numero));
    const fortesL = fortes.filter((v) => v.length === L);
    let incond = 0, cond = 0, base = 0;
    for (let i = 0; i < total; i++) {
      const t = String(i).padStart(L, '0');
      const p = fortesL.some((v) => { const kk = `${v}|${t}`; let r = pertoCache.get(kk); if (r === undefined) { r = perto(v, t); if (r) pertoCache.set(kk, r); } return r; });
      if (p) incond++;
      if (semFam[i]) { base++; if (p) cond++; }
    }
    const a = acc[lim];
    const obsL = fortesL.some((v) => perto(v, c.d)), obsQ = fortes.some((v) => perto(v, c.d));
    a.obsMesmoTamanho += obsL ? 1 : 0; a.obsQualquerTamanho += obsQ ? 1 : 0; a.espIncond += incond / total; a.espCond += base ? cond / base : 0;
    caso[`lim${lim}`] = { perto: obsQ, fracIncond: +(incond / total).toFixed(4), fracCond: base ? +(cond / base).toFixed(4) : null, baseSemFamilia: base };
  }
  res.acaso.casos.push(caso);
}
for (const l of lims) res.acaso.porLimiar[`${l * 100}%`] = { observadosMesmoTamanho: acc[l].obsMesmoTamanho, observadosQualquerTamanho: acc[l].obsQualquerTamanho,
  esperadoIncondicional: +acc[l].espIncond.toFixed(2), esperadoCondicionalSemFamilia: +acc[l].espCond.toFixed(2) };
db.close();
await writeFile(path.join(SAIDA, '37-h21.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify({ ...res, acaso: { porLimiar: res.acaso.porLimiar } }, null, 1));
