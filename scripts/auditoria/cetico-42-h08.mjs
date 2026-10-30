// Cético revisor, parecer 42 (H08). Lê a leitura própria (cetico-42-varredura.mjs) dos dois turnos e reproduz
// docs/analysis/estatistico-eleitoral/17: mínimo e percentis do ciclo D por k, limite físico, limite de 0,1%,
// as 3 seções com erro de leitura no perfil, conferência com o BU. Acrescenta um teste dirigido ao risco do
// princípio 8: ciclos curtos cujo eleitor entrou SEM digital (ano de nascimento ou liberação manual), por seção.
// Uso: node scripts/auditoria/cetico-42-h08.mjs
// Saída: data/parsed/auditoria/cetico-revisor/42/h08.json
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

const BASE = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '42');
const M = (k) => 1.6 + 0.2 * k; // limite físico do plano 15 (10 teclas/s)
const tot = (a) => a.reduce((x, y) => x + y, 0);
const quant = (a, q) => { const n = tot(a); let c = 0; for (let i = 0; i < a.length; i++) { c += a[i]; if (c >= q * n) return i; } return a.length - 1; };
function LE(a) { const n = tot(a); let c = 0, s = -1; for (let i = 0; i < a.length; i++) { c += a[i]; if (c / n <= 0.001) s = i; else break; } let ca = 0; for (let i = 0; i <= s; i++) ca += a[i]; return { LE: s, p: ca / n, abaixo: ca, n }; }
const lgamma = (x) => { const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]; if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x); x -= 1; let a = c[0]; const t = x + g + 0.5; for (let i = 1; i < g + 2; i++) a += c[i] / (x + i); return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a); };
function log10CaudaBin(c, n, p) { if (c <= 0) return 0; let s = 0; const l = (j) => lgamma(n + 1) - lgamma(j + 1) - lgamma(n - j + 1) + j * Math.log(p) + (n - j) * Math.log1p(-p); const l0 = l(c); for (let j = c; j <= n; j++) { const r = Math.exp(l(j) - l0); s += r; if (r < 1e-16 * s) break; } return (l0 + Math.log(s)) / Math.LN10; }

const { db } = await abrirLeitura();
const out = {};
for (const t of [1, 2]) {
  const dir = path.join(BASE, `${t}t`);
  const hist = {};
  for (const f of readdirSync(dir).filter((x) => x.startsWith('hist-'))) {
    for (const [k, a] of Object.entries(JSON.parse(readFileSync(path.join(dir, f), 'utf8')))) { if (!hist[k]) hist[k] = a.slice(); else a.forEach((v, i) => (hist[k][i] += v)); }
  }
  const secs = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.jsonl') && x !== 'selecao.jsonl')) for (const l of readFileSync(path.join(dir, f), 'utf8').split('\n')) if (l) secs.push(JSON.parse(l));
  const r = { secoes: secs.length, erros: secs.filter((s) => s.erro).length, votos: 0, vias: { v1: 0, v2: 0, v3m: 0, v3s: 0, o: 0 }, semHabilitacao: 0, dNeg: 0, repetidas: 0, computadosForaDaCopia: 0 };
  for (const s of secs) { if (s.erro) continue; r.votos += s.votos; for (const k in r.vias) r.vias[k] += s.vias[k]; r.semHabilitacao += s.semHabilitacao; r.dNeg += s.dNeg; r.repetidas += s.repetidas; r.computadosForaDaCopia += s.computadosForaDaCopia; }
  // D por k
  r.D = {};
  let ciclos = 0;
  for (const [k, a] of Object.entries(hist)) { const n = tot(a); ciclos += n; const min = a.findIndex((x) => x > 0); r.D[k] = { n, min, noMin: a[min], p01: quant(a, 0.001), p1: quant(a, 0.01), p5: quant(a, 0.05), p50: quant(a, 0.5), p99: quant(a, 0.99) }; }
  r.ciclosD = ciclos;
  const todos = new Array(3601).fill(0); for (const a of Object.values(hist)) a.forEach((v, i) => (todos[i] += v));
  const LEt = LE(todos);
  const lim = {}; for (const [k, a] of Object.entries(hist)) lim[k] = tot(a) >= 100000 ? LE(a) : LEt;
  r.LE = Object.fromEntries(Object.entries(lim).map(([k, v]) => [k, { LE: v.LE, pct: +(100 * v.p).toFixed(3) }]));
  // limite físico: com D mínimo ≥ 3 s nenhuma janela pode ter soma S + 1 ≤ Σ M(k) (cada D − M(k) > 0 para k ≤ 6)
  r.LF = { D_ate_1s: tot(Object.values(hist).map((a) => a[0] + a[1])), D_ate_3s: tot(Object.values(hist).map((a) => a[0] + a[1] + a[2] + a[3])), M6: M(6) };
  // seções com o menor D
  const minGlobal = secs.reduce((m, s) => (s.dMin !== null && !s.erro && s.dMin < m ? s.dMin : m), Infinity);
  r.menorD = { valor: minGlobal, secoes: secs.filter((s) => s.dMin === minGlobal).map((s) => `${s.uf}/${s.municipio}/${s.zona}/${s.secao} k=${s.dMinK}`) };
  const minPorK = {};
  for (const s of secs) for (const [c, n] of Object.entries(s.curtos ?? {})) { const [d, k] = c.split('|'); if (minPorK[k] === undefined || +d < minPorK[k].d) minPorK[k] = { d: +d, onde: [] }; if (+d === minPorK[k].d) minPorK[k].onde.push(`${s.uf}/${s.municipio}/${s.zona}/${s.secao}`); }
  r.menorDporK_ate60s = Object.fromEntries(Object.entries(minPorK).map(([k, v]) => [k, { d: v.d, secoes: v.onde.slice(0, 8), nSecoes: v.onde.length }]));
  // conferência com o BU
  const bu = new Map();
  for (const x of db.prepare('SELECT uf, municipio, zona, secao, comparecimento c, sem_biometria sb, por_biometria pb, por_biografia pg FROM secao WHERE turno = ?').iterate(t)) bu.set(`${x.uf}/${x.municipio}/${x.zona}/${x.secao}`, x);
  let iguais = 0, menor = 0, maior = 0, faltam = 0, viasDif = 0;
  const difs = [];
  for (const s of secs) {
    if (s.erro) continue;
    const b = bu.get(`${s.uf}/${s.municipio}/${s.zona}/${s.secao}`);
    if (!b) continue;
    const d = s.votos - (b.c ?? 0);
    if (d < 0) { menor++; faltam -= d; difs.push(`${s.uf}/${s.municipio}/${s.zona}/${s.secao} ${d}`); } else if (d > 0) { maior++; difs.push(`${s.uf}/${s.municipio}/${s.zona}/${s.secao} +${d}`); }
    const vd = s.uf !== 'zz' && b.pb !== null && (s.vias.v1 !== b.pb || s.vias.v2 !== b.sb || s.vias.v3m + s.vias.v3s !== b.pg);
    if (vd) viasDif++;
    if (!d && !vd) iguais++;
  }
  r.bu = { iguais, diarioMenor: menor, votosFaltando: faltam, diarioMaior: maior, viasDiferentes: viasDif, casos: difs };
  // as 3 seções
  r.tres = ['ba/39870/0133/0184', 'es/57932/0009/0085', 'mg/40690/0016/0264'].map((id) => { const s = secs.find((x) => `${x.uf}/${x.municipio}/${x.zona}/${x.secao}` === id); return s ? { id, votos: s.votos, dMin: s.dMin, k: s.dMinK, urnas: s.urnas } : { id, ausente: true }; });
  // ciclos curtos (≤ LE do k) por via do eleitor que chega
  const curtosVia = { v1: 0, v2: 0, v3m: 0, v3s: 0, o: 0 };
  const porSecao = [];
  for (const s of secs) {
    if (s.erro) continue;
    let c = 0, cnd = 0;
    for (const [ch, n] of Object.entries(s.curtos ?? {})) { const [d, k, via] = ch.split('|'); const L = (lim[k] ?? LEt).LE; if (+d <= L) { curtosVia[via] += n; c += n; if (via !== 'v1') cnd += n; } }
    const nsd = s.votos - s.vias.v1;
    if (c > 0) porSecao.push({ id: `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`, votos: s.votos, curtos: c, curtosSemDigital: cnd, fracSemDigital: s.votos ? nsd / s.votos : 0 });
  }
  r.curtosPorVia = curtosVia;
  r.todosPorVia = r.vias;
  // teste condicional: entre os ciclos curtos da seção, sem digital acima da fração sem digital da própria seção?
  for (const p of porSecao) p.log10p = p.curtosSemDigital > 0 && p.fracSemDigital > 0 && p.fracSemDigital < 1 ? log10CaudaBin(p.curtosSemDigital, p.curtos, p.fracSemDigital) : 0;
  const nTest = porSecao.filter((p) => p.fracSemDigital > 0 && p.fracSemDigital < 1).length;
  r.testeCurtosSemDigital = { secoesTestadas: nTest, log10AlfaBonferroni: Math.log10(0.05 / nTest), significativas: porSecao.filter((p) => p.log10p <= Math.log10(0.05 / nTest)).length, topo: porSecao.sort((a, b) => a.log10p - b.log10p).slice(0, 12), maisCurtosSemDigital: [...porSecao].sort((a, b) => b.curtosSemDigital - a.curtosSemDigital).slice(0, 12) };
  out[t] = r;
}
db.close();
writeFileSync(path.join(BASE, 'h08.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
