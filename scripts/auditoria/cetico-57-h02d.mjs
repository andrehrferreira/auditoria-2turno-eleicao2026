// Parecer cético 57: reprodução independente da H02(d) do doc 30 e testes contra a classificação.
// Beta-binomial da zona (uf+zona), deixa-uma-de-fora, método dos momentos; níveis de reserva município → UF+modelo.
// BH q < 0,01 (fora do normal) e Bonferroni 5% (confirmado), por turno. Classes no 2º turno: leitor (p1 < percentil 10 do
// modelo no 2º turno, ou < 10 reconhecidos com ≥ 20 pedidos), crônico (fora no 1º turno com a mesma urna), sem explicação técnica.
// Código próprio (log-gama de Lanczos, cauda da beta-binomial por soma direta, BH, mediana/MAD). Lê: banco (cópia de leitura),
// leitor/<uf>.jsonl do doc 08 (p1) e os zips públicos do perfil 2026 (idade, teste benigno do revisor).
// Testes do revisor:
//   T1 sensibilidade do corte do leitor (percentil 10 → 20 e 25; p1 por modelo calculado só nas fora do normal × no universo);
//   T2 idade: parcela de 70 anos ou mais no perfil da seção × mediana da zona, nas 46 e nas 159;
//   T3 o 1º turno das 46: valor-p e taxa no 1º turno (estavam "quase fora"?);
//   T4 desvio contra a zona (z por mediana e MAD) das 46, refeito com o banco (comparecimento ÷ aptos, parcela do 13, variação).
// Uso: node --max-old-space-size=8192 scripts/auditoria/cetico-57-h02d.mjs
// Saída: data/parsed/auditoria/cetico/57/h02d.json e h02d-46.csv
import { createReadStream } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { linhasZip, pad } from './forense-lib.mjs';
import { campoPerfil } from './cetico-57-lib.mjs';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', '57');
await mkdir(SAIDA, { recursive: true });
const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const r4 = (x) => (Number.isFinite(x) ? Math.round(x * 1e4) / 1e4 : null);
const r2 = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : null);
const ch = (r) => `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;

// log-gama (Lanczos, g = 7)
const LC = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
function lgam(x) {
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgam(1 - x);
  x -= 1; let a = LC[0]; const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += LC[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
// P(X ≥ k), X ~ BB(n, a, b): soma direta dos termos em log
function caudaBB(n, a, b, k) {
  if (k <= 0) return 1; if (k > n) return 0;
  const lB = (p, q) => lgam(p) + lgam(q) - lgam(p + q);
  const base = lgam(n + 1) - lB(a, b);
  const termos = [];
  for (let j = k; j <= n; j++) termos.push(base - lgam(j + 1) - lgam(n - j + 1) + lB(j + a, n - j + b));
  const m = Math.max(...termos);
  return Math.min(1, Math.exp(m) * termos.reduce((s, x) => s + Math.exp(x - m), 0));
}
// quantil normal bilateral por bisseção
function zCorte(p) { let lo = 0, hi = 10; for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (cauda2(m) > p) lo = m; else hi = m; } return (lo + hi) / 2; }
function cauda2(z) { // 2·(1 − Φ(z)) por erfc (Numerical Recipes)
  const x = z / Math.SQRT2, t = 1 / (1 + 0.5 * x);
  const y = t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return y;
}

const { db } = await abrirLeitura();
const sec = {};
const out = { geradoEm: new Date().toISOString(), turnos: {} };
for (const t of [1, 2]) {
  const rows = db.prepare(`SELECT uf, municipio, zona, secao, comparecimento n, por_biografia x, numero_interno_urna urna, modelo_urna modelo
    FROM secao WHERE turno = ? AND uf <> 'zz' AND comparecimento > 0 AND por_biografia IS NOT NULL`).all(t).map((r) => ({ ...r, k: ch(r) }));
  const niveis = [(r) => `${r.uf}|${r.zona}`, (r) => `${r.uf}|${r.municipio}`, (r) => `${r.uf}|${r.modelo}`];
  const acc = niveis.map((f) => { const m = new Map(); for (const r of rows) { const g = m.get(f(r)) ?? [0, 0, 0, 0, 0, 0, 0]; g[0]++; g[1] += r.x; g[2] += r.n; g[3] += r.x * r.x; g[4] += r.x * r.n; g[5] += r.n * r.n; g[6] += r.n * (r.n - 1); m.set(f(r), g); } return m; });
  const nivelUsado = [0, 0, 0, 0];
  for (const r of rows) {
    let ok = false;
    for (let i = 0; i < 3; i++) {
      const g = acc[i].get(niveis[i](r)); if (g[0] - 1 < 10) continue;
      const X = g[1] - r.x, N = g[2] - r.n, X2 = g[3] - r.x * r.x, XN = g[4] - r.x * r.n, N2 = g[5] - r.n * r.n, NN1 = g[6] - r.n * (r.n - 1);
      const mu = X / N;
      // momento: Σ(x − μ n)² = μ(1−μ)[Σn + ρ Σn(n−1)]
      let rho = (X2 - 2 * mu * XN + mu * mu * N2 - mu * (1 - mu) * N) / (mu * (1 - mu) * NN1);
      rho = Math.min(Math.max(Number.isFinite(rho) ? rho : 1e-6, 1e-6), 0.99);
      r.mu = mu; r.rho = rho; r.nivel = i; nivelUsado[i]++; ok = true; break;
    }
    if (!ok) { nivelUsado[3]++; r.p = null; continue; }
    if (!(r.mu > 0)) { r.p = r.x > 0 ? 0 : 1; continue; }
    if (r.x <= r.n * r.mu) { r.p = 1; continue; }
    const a = r.mu * (1 - r.rho) / r.rho, b = (1 - r.mu) * (1 - r.rho) / r.rho;
    r.p = caudaBB(r.n, a, b, r.x);
  }
  const com = rows.filter((r) => r.p != null).sort((a, b) => a.p - b.p);
  let q = 1; for (let i = com.length - 1; i >= 0; i--) { q = Math.min(q, com[i].p * com.length / (i + 1)); com[i].q = q; }
  const bonf = 0.05 / com.length;
  const fora = com.filter((r) => r.q < 0.01);
  out.turnos[`${t}t`] = { secoes: rows.length, testadas: com.length, nivelUsado, foraDoNormal: fora.length, foraManual: fora.reduce((a, r) => a + r.x, 0),
    confirmadas: com.filter((r) => r.p < bonf).length, confirmadasManual: com.filter((r) => r.p < bonf).reduce((a, r) => a + r.x, 0), manualPais: rows.reduce((a, r) => a + r.x, 0),
    muZero: rows.filter((r) => r.p === 0 && !(r.mu > 0)).length };
  sec[t] = new Map(rows.map((r) => [r.k, r]));
  log(`turno ${t}: ${JSON.stringify(out.turnos[`${t}t`])}`);
}

// leitor (doc 08)
const leitor = new Map();
{
  const dir = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico-eleitoral', 'leitor');
  for (const f of (await readdir(dir)).filter((n) => /^[a-z]{2}\.jsonl$/.test(n))) {
    for await (const l of createInterface({ input: createReadStream(path.join(dir, f)), crlfDelay: Infinity })) {
      if (!l) continue; const r = JSON.parse(l);
      const um = (d) => { if (!d) return null; let rec = d.sucMais; for (const x of d.suc) rec += x; return { rec, ped: d.bio + d.man, p1: rec ? d.suc[1] / rec : null }; };
      leitor.set(ch(r), { d1: um(r.d1), d2: um(r.d2) });
    }
  }
}
const pctModelo = (p) => { const m = new Map(); for (const [k, l] of leitor) { const s = sec[2].get(k); if (!s || !l.d2 || l.d2.rec < 10) continue; if (!m.has(s.modelo)) m.set(s.modelo, []); m.get(s.modelo).push(l.d2.p1); }
  const o = {}; for (const [mm, v] of m) { v.sort((a, b) => a - b); o[mm] = v[Math.floor(p * (v.length - 1))]; } return o; };
const P10 = pctModelo(0.1), P20 = pctModelo(0.2), P25 = pctModelo(0.25), P50 = pctModelo(0.5);
out.p1 = { p10: P10, p20: P20, p25: P25, mediana: P50 };
const fora1 = new Set([...sec[1].values()].filter((r) => r.q < 0.01).map((r) => r.k));
const classe = (r, corte) => {
  const l = leitor.get(r.k); const r1 = sec[1].get(r.k);
  const ruim = l?.d2 ? (l.d2.rec < 10 && l.d2.ped >= 20) || (l.d2.rec >= 10 && l.d2.p1 < corte[r.modelo]) : false;
  if (ruim) return 'leitor';
  if (fora1.has(r.k) && r1 && r1.urna === r.urna) return 'cronico';
  return 'sem';
};
const F2 = [...sec[2].values()].filter((r) => r.q < 0.01);
const resumo = (corte) => { const o = { leitor: [0, 0], cronico: [0, 0], sem: [0, 0] }; for (const r of F2) { const c = classe(r, corte); o[c][0]++; o[c][1] += r.x; } const tot = F2.reduce((a, r) => a + r.x, 0); return { ...o, parcelaSem: r4(o.sem[1] / tot), total: [F2.length, tot] }; };
out.classes = { p10: resumo(P10), p20: resumo(P20), p25: resumo(P25) };
const G3 = F2.filter((r) => classe(r, P10) === 'sem');
out.semLeitorDado = G3.filter((r) => !leitor.get(r.k)?.d2).length;

// T2 idade (perfil 2026): parcela 70+ e 60+ por seção (com agregadas não somadas: a idade é proporção)
const idade = new Map();
{
  const dir = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'perfil_eleitor_secao');
  const precisa = new Set(); for (const r of F2) precisa.add(`${r.uf}|${r.zona}`);
  for (const z of (await readdir(dir)).filter((n) => /^perfil_eleitor_secao_2026_[A-Z]{2}\.zip$/.test(n) && !n.includes('_ZZ'))) {
    const uf = z.slice(-6, -4).toLowerCase();
    if (![...precisa].some((p) => p.startsWith(uf + '|'))) continue;
    let cab = null;
    for await (const [, l] of linhasZip(path.join(dir, z))) {
      if (!cab) { const h = l.split(';').map((n) => n.replace(/"/g, '')); cab = Object.fromEntries(h.map((n, i) => [n, i])); cab.__n = h.length; continue; }
      const f = campoPerfil(l, cab.__n); const c = new Proxy({}, { get: (_, i) => f(Number(i)) });
      const zona = pad(c[cab.NR_ZONA], 4);
      if (!precisa.has(`${uf}|${zona}`)) continue;
      const k = `${uf}/${pad(c[cab.CD_MUNICIPIO], 5)}/${zona}/${pad(c[cab.NR_SECAO], 4)}`;
      const ida = Number(String(c[cab.DS_FAIXA_ETARIA]).match(/\d+/)?.[0] ?? 0);
      const q = Number(c[cab.QT_ELEITORES]);
      const g = idade.get(k) ?? { e: 0, i70: 0, i60: 0 }; g.e += q; if (ida >= 70) g.i70 += q; if (ida >= 60) g.i60 += q; idade.set(k, g);
    }
  }
  log(`idade: ${idade.size} seções nas zonas das 159`);
}
const med = (v) => { const o = v.filter(Number.isFinite).sort((a, b) => a - b); return o.length ? o[Math.floor(o.length / 2)] : null; };
const idadeVsZona = (r) => { const g = idade.get(r.k); if (!g || g.e < 50) return null;
  const pares = [...idade].filter(([k, x]) => k !== r.k && k.startsWith(`${r.uf}/`) && k.split('/')[2] === r.zona && x.e >= 50);
  return { s70: g.i70 / g.e, z70: med(pares.map(([, x]) => x.i70 / x.e)), s60: g.i60 / g.e, z60: med(pares.map(([, x]) => x.i60 / x.e)), perfil: g.e }; };

// T4 desvio contra a zona, refeito
const vot = { 1: new Map(), 2: new Map() };
for (const t of [1, 2]) for (const v of db.prepare(`SELECT uf, municipio, zona, secao, numero, quantidade q FROM voto_bu WHERE turno = ? AND eleicao = ? AND cargo = 1 AND numero IN (13, 22)`).iterate(t, t === 1 ? 6257 : 6258)) {
  const k = ch(v); const g = vot[t].get(k) ?? { v13: 0, v22: 0 }; if (v.numero === 13) g.v13 += v.q; else g.v22 += v.q; vot[t].set(k, g);
}
const aptos = { 1: new Map(), 2: new Map() };
for (const t of [1, 2]) for (const a of db.prepare('SELECT uf, municipio, zona, secao, aptos FROM secao_eleicao WHERE turno = ? AND eleicao = ?').iterate(t, t === 1 ? 6257 : 6258)) aptos[t].set(ch(a), a.aptos);
db.close();
const met = (k) => { const s1 = sec[1].get(k), s2 = sec[2].get(k), a1 = aptos[1].get(k), a2 = aptos[2].get(k), v1 = vot[1].get(k), v2 = vot[2].get(k);
  if (!s1 || !s2 || !a1 || !a2 || !v1 || !v2 || a2 < 20 || s1.n < 10 || Math.abs(a2 - a1) > 10) return null;
  const sh1 = v1.v13 + v1.v22 ? v1.v13 / (v1.v13 + v1.v22) : null, sh2 = v2.v13 + v2.v22 ? v2.v13 / (v2.v13 + v2.v22) : null;
  return { dc: s2.n / a2 - s1.n / a1, sh2, ds: sh1 != null && sh2 != null ? sh2 - sh1 : null }; };
const porZona = new Map(); for (const k of sec[2].keys()) { const [uf, , zona] = k.split('/'); const z = `${uf}|${zona}`; if (!porZona.has(z)) porZona.set(z, []); porZona.get(z).push(k); }
const zr = (k, campo) => { const [uf, , zona] = k.split('/'); const m0 = met(k); if (!m0 || !Number.isFinite(m0[campo])) return null;
  const v = porZona.get(`${uf}|${zona}`).filter((o) => o !== k).map((o) => met(o)?.[campo]).filter(Number.isFinite).sort((a, b) => a - b);
  if (v.length < 5) return null; const m = v[Math.floor(v.length / 2)]; const d = v.map((x) => Math.abs(x - m)).sort((a, b) => a - b); const mad = 1.4826 * d[Math.floor(d.length / 2)];
  return mad ? (m0[campo] - m) / mad : null; };
const corte = zCorte(0.05 / (3 * G3.length));
const linhas = G3.map((r) => {
  const r1 = sec[1].get(r.k); const l = leitor.get(r.k); const id = idadeVsZona(r);
  const z = { dc: r2(zr(r.k, 'dc')), sh2: r2(zr(r.k, 'sh2')), ds: r2(zr(r.k, 'ds')) };
  return { k: r.k, modelo: r.modelo, n2: r.n, x2: r.x, taxa2: r4(r.x / r.n), mu2: r4(r.mu), q2: r.q, p1: r4(l?.d2?.p1), rec2: l?.d2?.rec ?? null,
    n1: r1?.n ?? null, x1: r1?.x ?? null, taxa1: r1 ? r4(r1.x / r1.n) : null, p1t: r1?.p ?? null, q1: r1?.q ?? null, fora1: fora1.has(r.k), mesmaUrna: r1 ? r1.urna === r.urna : null,
    s70: r4(id?.s70), z70: r4(id?.z70), s60: r4(id?.s60), z60: r4(id?.z60), perfil: id?.perfil ?? null, ...z,
    desvio: Object.values(z).some((v) => v != null && Math.abs(v) >= corte) };
});
// idade nas 159 por classe
const idadeClasse = {};
for (const c of ['leitor', 'cronico', 'sem']) {
  const v = F2.filter((r) => classe(r, P10) === c).map(idadeVsZona).filter(Boolean);
  idadeClasse[c] = { n: v.length, acima70: v.filter((x) => x.s70 > x.z70).length, medianaDif70: r4(med(v.map((x) => x.s70 - x.z70))), medianaDif60: r4(med(v.map((x) => x.s60 - x.z60))) };
}
out.g3 = { secoes: G3.length, manual: G3.reduce((a, r) => a + r.x, 0), corteZ: r2(corte), comDesvio: linhas.filter((x) => x.desvio).map((x) => x.k),
  trocaramUrna: linhas.filter((x) => x.mesmaUrna === false).length, foraNo1tComOutraUrna: linhas.filter((x) => x.fora1 && x.mesmaUrna === false).length,
  p1: { min: Math.min(...linhas.map((x) => x.p1 ?? 9)), max: Math.max(...linhas.map((x) => x.p1 ?? -9)) },
  primeiroTurno: { p1tAbaixoDe001: linhas.filter((x) => x.p1t != null && x.p1t < 0.01).length, p1tAbaixoDe005: linhas.filter((x) => x.p1t != null && x.p1t < 0.05).length,
    taxa1MaiorQueMediaZona: linhas.filter((x) => x.taxa1 != null && x.taxa1 > x.mu2).length },
  idade: idadeClasse };
out.lista46 = linhas;
await writeFile(path.join(SAIDA, 'h02d.json'), JSON.stringify(out, null, 1));
const cols = Object.keys(linhas[0]);
await writeFile(path.join(SAIDA, 'h02d-46.csv'), [cols.join(';'), ...linhas.map((x) => cols.map((c) => x[c]).join(';'))].join('\n') + '\n');
console.log(JSON.stringify({ turnos: out.turnos, p1: out.p1, classes: out.classes, semLeitorDado: out.semLeitorDado, g3: out.g3 }, null, 1));
log('fim');
