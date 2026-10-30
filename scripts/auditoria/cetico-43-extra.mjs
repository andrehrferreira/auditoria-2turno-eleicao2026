// Cético, parecer 43: testes complementares do salto de 85–99 (sobre a leitura do cetico-43-pca.mjs).
//  1. zonas por faixa de "sem biometria 90–99" (2026), TODAS as faixas, com aptos e votantes em número (o doc 09 mostra
//     só 3 das 6 faixas e só a taxa); UFs de cada faixa;
//  2. UF por população (Censo 2022): votantes ÷ população de 2022 e votantes 2026 ÷ teto sem mortes, 70–79 e 85–99;
//     correlação do excesso (85–99 sobre 70–79, por população) com "sem biometria 90–99";
//  3. ecológico por taxa (zona, efeito fixo de UF, ponderado pelo comparecimento): parcela de liberação manual
//     (BU por_biografia ÷ comparecimento) × parcela 80+ entre os votantes (PCA) e × o aumento dos 80+ além dos 70–79.
// Agregado; sem CPF, sem título.
// Uso: node --max-old-space-size=6000 scripts/auditoria/cetico-43-extra.mjs
// Saída: data/parsed/auditoria/cetico-revisor/p43/extra.json
import { readFileSync, readdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', 'p43');
const P = JSON.parse(readFileSync(path.join(SAIDA, 'pca.json'), 'utf8'));
const Z = JSON.parse(readFileSync(path.join(SAIDA, 'pca-zonas.json'), 'utf8'));
const pct = (a, b) => (b ? +(100 * a / b).toFixed(3) : null);
const r3 = (x) => (x === null || !Number.isFinite(x) ? null : +x.toFixed(3));
const aggZ = (ano, k, fs) => fs.reduce((s, f) => { const x = Z[ano][`${k}|${f}`]; return x ? [s[0] + x[0], s[1] + x[1]] : s; }, [0, 0]);
const zonas = (ano) => new Set(Object.keys(Z[ano]).map((k) => k.split('|').slice(0, 3).join('|')));
const z22 = zonas(2022); const z26 = zonas(2026);
const perfZ = new Map();
for (const f of readdirSync(path.join(DIR_DADOS, 'parsed', 'auditoria', 'demografo', 'perfil'))) {
  const L = readFileSync(path.join(DIR_DADOS, 'parsed', 'auditoria', 'demografo', 'perfil', f), 'utf8').trimEnd().split('\n'); const ix = Object.fromEntries(L[0].split('\t').map((n, i) => [n, i]));
  for (const l of L.slice(1)) { const c = l.split('\t'); if (c[0] === 'zz') continue; const k = `${c[0].toUpperCase()}|${c[1]}|${c[2]}`; const a = perfZ.get(k) ?? perfZ.set(k, [0, 0]).get(k); a[0] += Number(c[ix.f90_99]); a[1] += Number(c[ix.sembio_f90_99]); }
}
const R = {};
// 1
const bins = new Map();
for (const k of z26) {
  if (!z22.has(k)) continue; const pf = perfZ.get(k); if (!pf?.[0]) continue;
  const sb = pf[1] / pf[0]; const bin = sb < 0.1 ? '0-10%' : sb < 0.3 ? '10-30%' : sb < 0.5 ? '30-50%' : sb < 0.7 ? '50-70%' : sb < 0.9 ? '70-90%' : '90-100%';
  const o = bins.get(bin) ?? bins.set(bin, { zonas: 0, a22: 0, a26: 0, v22: 0, v26: 0, v7022: 0, v7026: 0, ufs: {} }).get(bin);
  const x22 = aggZ(2022, k, ['90-94', '95-99']); const x26 = aggZ(2026, k, ['90-94', '95-99']);
  o.zonas++; o.a22 += x22[0]; o.a26 += x26[0]; o.v22 += x22[1]; o.v26 += x26[1]; o.v7022 += aggZ(2022, k, ['70-74', '75-79'])[1]; o.v7026 += aggZ(2026, k, ['70-74', '75-79'])[1];
  const u = k.slice(0, 2); o.ufs[u] = (o.ufs[u] ?? 0) + 1;
}
R.binsZona = Object.fromEntries([...bins.entries()].sort().map(([b, o]) => [b, { zonas: o.zonas, aptos90_99: `${o.a22} → ${o.a26}`, aptosPct: pct(o.a26 - o.a22, o.a22), votantes90_99: `${o.v22} → ${o.v26}`, votantesPct: pct(o.v26 - o.v22, o.v22), taxa: `${pct(o.v22, o.a22)} → ${pct(o.v26, o.a26)}`, votantes70_79Pct: pct(o.v7026 - o.v7022, o.v7022), ufsPrincipais: Object.entries(o.ufs).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([u, n]) => `${u} ${n}`).join(', ') }]));

// 2: UF por população
const UFCOD = { 11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO', 21: 'MA', 22: 'PI', 23: 'CE', 24: 'RN', 25: 'PB', 26: 'PE', 27: 'AL', 28: 'SE', 29: 'BA', 31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP', 41: 'PR', 42: 'SC', 43: 'RS', 50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF' };
const cod = new Map();
for (const r of JSON.parse(readFileSync(path.join(DIR_DADOS, 'raw', 'externos', 'ibge', 'censo2022-9514-br-uf-idade-simples.json'), 'utf8')).slice(1)) { const l = r.NC === '1' ? 'BR' : UFCOD[Number(r.D1C)]; const m = cod.get(l) ?? cod.set(l, new Map()).get(l); m.set(Number(r.D5C), Number(r.V) || 0); }
const idade = (l, a) => cod.get(l).get(a === 100 ? 6653 : 6618 + a - 65) ?? 0;
const pop = (l, a0, a1, d = 0) => { let s = 0; for (let a = a0; a <= a1; a++) s += idade(l, a - d); return s; };
const ufV = (ano, u, fs) => fs.reduce((s, f) => { const x = P.anos[ano].uf[`1|${u}|${f}`]; return x ? s + x[1] : s; }, 0);
const semBioUf = new Map(); for (const [k, x] of perfZ) { const u = k.slice(0, 2); const a = semBioUf.get(u) ?? semBioUf.set(u, [0, 0]).get(u); a[0] += x[0]; a[1] += x[1]; }
R.ufPorPopulacao = {}; const xs = [];
for (const u of Object.values(UFCOD).sort()) {
  const q = (fs, a0, a1) => { const v22 = ufV(2022, u, fs); const v26 = ufV(2026, u, fs); const p22 = pop(u, a0, a1); const t26 = pop(u, a0, a1, 4); return { v22SobrePop: pct(v22, p22), v26SobreTeto: pct(v26, t26), razao: r3((v26 / t26) / (v22 / p22)), crescPop: pct(t26 - p22, p22) }; };
  const a = q(['70-74', '75-79'], 70, 79); const b = q(['85-89', '90-94', '95-99'], 85, 99);
  const sb = semBioUf.get(u); const o = { semBio90_99: pct(sb[1], sb[0]), '70-79': a, '85-99': b, excessoPorPop: r3(Math.log(b.razao) - Math.log(a.razao)) };
  R.ufPorPopulacao[u] = o; xs.push([o.semBio90_99, o.excessoPorPop, ufV(2022, u, ['85-89', '90-94', '95-99']), Math.log(b.razao), Math.log(a.razao)]);
}
const pear = (pts, wi) => { const W = pts.reduce((s, p) => s + (wi ? p[2] : 1), 0); const w = (p) => (wi ? p[2] : 1); const mx = pts.reduce((s, p) => s + w(p) * p[0], 0) / W; const my = pts.reduce((s, p) => s + w(p) * p[1], 0) / W; let c = 0; let a = 0; let b = 0; for (const p of pts) { c += w(p) * (p[0] - mx) * (p[1] - my); a += w(p) * (p[0] - mx) ** 2; b += w(p) * (p[1] - my) ** 2; } return r3(c / Math.sqrt(a * b)); };
R.correlacoesPorPopulacao = { excessoPonderado: pear(xs, true), excessoSemPeso: pear(xs), razao85_99Ponderado: pear(xs.map((p) => [p[0], p[3], p[2]]), true), razao70_79Ponderado: pear(xs.map((p) => [p[0], p[4], p[2]]), true) };

// 3: ecológico por taxa
const { db } = await abrirLeitura();
const bu = new Map();
for (const r of db.prepare(`SELECT uf, municipio, zona, sum(comparecimento) c, sum(por_biografia) pg, sum(sem_biometria) sb FROM secao WHERE turno = 1 AND situacao = 'completa' AND uf <> 'zz' GROUP BY 1, 2, 3`).iterate()) bu.set(`${r.uf.toUpperCase()}|${r.municipio}|${r.zona}`, r);
db.close();
const TODAS = ['16-17', '18-24', '25-59', '60-64', '65-69', '70-74', '75-79', '80-84', '85-89', '90-94', '95-99', '100+', 'invalida'];
const L = [];
for (const k of z26) {
  const b = bu.get(k); if (!b || !b.c || !z22.has(k)) continue;
  const tot = aggZ(2026, k, TODAS)[1]; if (!tot) continue;
  const e26 = aggZ(2026, k, ['80-84', '85-89', '90-94', '95-99'])[1]; const e22 = aggZ(2022, k, ['80-84', '85-89', '90-94', '95-99'])[1];
  const s26 = aggZ(2026, k, ['70-74', '75-79'])[1]; const s22 = aggZ(2022, k, ['70-74', '75-79'])[1];
  const s6 = aggZ(2026, k, ['60-64', '65-69'])[1]; const j = aggZ(2026, k, ['16-17', '18-24'])[1];
  // aumento dos 80+ além do que a subida dos 70–79 da mesma zona daria, em fração dos votantes de 2026
  const extra = e22 > 0 && s22 > 0 ? (e26 - e22 * (s26 / s22)) / tot : 0;
  L.push({ u: k.slice(0, 2), w: b.c, y: b.pg / b.c, y2: b.sb / b.c, x: [e26 / tot, s26 / tot, s6 / tot, j / tot, extra] });
}
function wls(rows, nx, campo = 'y') {
  const g = new Map(); for (const r of rows) (g.get(r.u) ?? g.set(r.u, []).get(r.u)).push(r);
  const A = Array.from({ length: nx }, () => Array(nx + 1).fill(0));
  for (const a of g.values()) {
    const W = a.reduce((s, r) => s + r.w, 0); const mx = Array(nx).fill(0); let my = 0;
    for (const r of a) { r.x.forEach((x, i) => { mx[i] += r.w * x / W; }); my += r.w * r[campo] / W; }
    for (const r of a) { const d = r.x.map((x, i) => x - mx[i]); const dy = r[campo] - my; for (let i = 0; i < nx; i++) { A[i][nx] += r.w * d[i] * dy; for (let j2 = 0; j2 < nx; j2++) A[i][j2] += r.w * d[i] * d[j2]; } }
  }
  for (let i = 0; i < nx; i++) { let p = i; for (let r = i + 1; r < nx; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r; [A[i], A[p]] = [A[p], A[i]]; for (let r = 0; r < nx; r++) if (r !== i) { const f = A[r][i] / A[i][i]; for (let c = i; c <= nx; c++) A[r][c] -= f * A[i][c]; } }
  return A.map((r, i) => r3(r[nx] / r[i]));
}
R.ecologicoTaxa = { zonas: L.length, variaveis: ['parcela 80+ nos votantes', 'parcela 70–79', 'parcela 60–69', 'parcela 16–24', 'aumento dos 80+ além do ritmo dos 70–79 (fração dos votantes)'],
  liberacaoManual: wls(L, 5), semBiometriaCadastrada: wls(L, 5, 'y2'), liberacaoManualSemExtra: wls(L.map((r) => ({ ...r, x: r.x.slice(0, 4) })), 4),
  mediaLiberacaoManual: pct(L.reduce((s, r) => s + r.w * r.y, 0), L.reduce((s, r) => s + r.w, 0)) };
// 4: piso e teto do canal "título sem biometria" para 80–89 e 90–99 (1º turno de 2026), zona a zona:
//    piso = max(0, votantes da faixa − aptos COM biometria da faixa); teto = min(votantes da faixa, aptos SEM biometria
//    da faixa, habilitados sem biometria cadastrada no BU da zona, todas as idades).
{
  const pz = new Map();
  for (const f of readdirSync(path.join(DIR_DADOS, 'parsed', 'auditoria', 'demografo', 'perfil'))) {
    const L2 = readFileSync(path.join(DIR_DADOS, 'parsed', 'auditoria', 'demografo', 'perfil', f), 'utf8').trimEnd().split('\n'); const ix = Object.fromEntries(L2[0].split('\t').map((n, i) => [n, i]));
    for (const l of L2.slice(1)) { const c = l.split('\t'); if (c[0] === 'zz') continue; const k = `${c[0].toUpperCase()}|${c[1]}|${c[2]}`; const a = pz.get(k) ?? pz.set(k, [0, 0, 0, 0]).get(k); a[0] += Number(c[ix.f80_89]); a[1] += Number(c[ix.sembio_f80_89]); a[2] += Number(c[ix.f90_99]); a[3] += Number(c[ix.sembio_f90_99]); }
  }
  const o = { piso8089: 0, teto8089: 0, piso9099: 0, teto9099: 0, tetoJunto: 0, votantes8089: 0, votantes9099: 0, aptosSemBio8089: 0, aptosSemBio9099: 0 };
  for (const k of z26) {
    const p = pz.get(k); const b = bu.get(k); if (!p || !b) continue;
    const v1 = aggZ(2026, k, ['80-84', '85-89'])[1]; const v2 = aggZ(2026, k, ['90-94', '95-99'])[1];
    o.votantes8089 += v1; o.votantes9099 += v2; o.aptosSemBio8089 += p[1]; o.aptosSemBio9099 += p[3];
    o.piso8089 += Math.max(0, v1 - (p[0] - p[1])); o.piso9099 += Math.max(0, v2 - (p[2] - p[3]));
    o.teto8089 += Math.min(v1, p[1], b.sb); o.teto9099 += Math.min(v2, p[3], b.sb); o.tetoJunto += Math.min(v1 + v2, p[1] + p[3], b.sb);
  }
  R.canalSemBiometria2026 = o;
}
// 6: referência com cadastro FIXO: a subida dos idosos do 1º para o 2º turno de 2022, por UF, tem a mesma geografia
//    que o salto de 2022 → 2026? (no 2º turno de 2022 o cadastro é o mesmo do 1º; nenhum título entra ou sai)
{
  const V = (ano, t, u, fs) => fs.reduce((s, f) => s + (P.anos[ano].uf[`${t}|${u}|${f}`]?.[1] ?? 0), 0);
  const F1 = ['85-89', '90-94', '95-99']; const F2 = ['70-74', '75-79'];
  const pts = Object.values(UFCOD).sort().map((u) => {
    const b22 = Math.log(V(2022, 2, u, F1) / V(2022, 1, u, F1)); const b22e = b22 - Math.log(V(2022, 2, u, F2) / V(2022, 1, u, F2));
    const s = Math.log(V(2026, 1, u, F1) / V(2022, 1, u, F1)); const se = s - Math.log(V(2026, 1, u, F2) / V(2022, 1, u, F2));
    const sb = semBioUf.get(u); return { u, sb: 100 * sb[1] / sb[0], b22, b22e, s, se, w: V(2022, 1, u, F1) };
  });
  const c = (fx, fy) => pear(pts.map((p) => [fx(p), fy(p), p.w]), true);
  R.referencia2022Turnos = { porUf: Object.fromEntries(pts.map((p) => [p.u, { subida85_99_1a2turno2022: r3(p.b22), excesso1a2turno2022: r3(p.b22e), salto85_99_2022a2026: r3(p.s), excesso2022a2026: r3(p.se) }])),
    corrSemBioXSubida2022Turnos: c((p) => p.sb, (p) => p.b22), corrSemBioXExcesso2022Turnos: c((p) => p.sb, (p) => p.b22e),
    corrSubida2022TurnosXSalto2026: c((p) => p.b22, (p) => p.s), corrExcesso2022TurnosXExcesso2026: c((p) => p.b22e, (p) => p.se) };
}
// 7: ESTIMATIVA (fica fora da perícia): vivos de 85–99 em 2026 pela mortalidade do Registro Civil (óbitos 2023–2024 ÷
//    Censo 2022 do grupo), e a subida na escala logística por pessoa viva, comparada à subida do 1º para o 2º turno de 2022.
{
  const ob = new Map(); for (const f of ['obitos-2654-2023.json', 'obitos-2654-2024.json']) for (const r of JSON.parse(readFileSync(path.join(DIR_DADOS, 'raw', 'externos', 'ibge', f), 'utf8')).slice(1)) ob.set(r.D7C, (ob.get(r.D7C) ?? 0) + (Number(r.V) || 0) / 2);
  const q = { 80: ob.get('5979') / pop('BR', 80, 84), 85: (ob.get('5980') - ob.get('106182') - ob.get('106183') - ob.get('5996')) / pop('BR', 85, 89), 90: ob.get('106182') / pop('BR', 90, 94), 95: ob.get('106183') / pop('BR', 95, 99) };
  const m = (a) => q[Math.min(95, Math.floor(a / 5) * 5)] ?? q[80];
  const lg = (p) => Math.log(p / (1 - p)); const out = {};
  for (const [f, a0, a1] of [['85-89', 85, 89], ['90-94', 90, 94], ['95-99', 95, 99]]) {
    let viv = 0; for (let a = a0; a <= a1; a++) { let s = 1; for (let k = 4; k >= 1; k--) s *= 1 - m(a - k); viv += idade('BR', a - 4) * s; }
    const v22 = P.anos[2022].brasil[`1|BR|${f}`][1]; const v26 = P.anos[2026].brasil[`1|BR|${f}`][1]; const p22 = pop('BR', a0, a1);
    const t2 = P.anos[2022].brasil[`2|BR|${f}`]; const t1 = P.anos[2022].brasil[`1|BR|${f}`];
    out[f] = { vivos2026: Math.round(viv), v22SobrePop: pct(v22, p22), v26SobreVivos: pct(v26, viv), subidaLogitPorVivo: r3(lg(v26 / viv) - lg(v22 / p22)), subidaLogit2022Turnos: r3(lg(t2[1] / t2[0]) - lg(t1[1] / t1[0])) };
    out[f].razao = r3(out[f].subidaLogitPorVivo / out[f].subidaLogit2022Turnos);
  }
  R.estimativaPorVivo = { mortalidadeAnual: Object.fromEntries(Object.entries(q).map(([k, x]) => [k, r3(100 * x)])), faixas: out };
}
// 5: município × teto do Censo (pessoas de 80 a 95 anos em 2022, sem descontar mortes) contra votantes de 85–99 em 2026
{
  const mun = new Map(); for (const [k, x] of Object.entries(Z[2026])) { const [u, m, , f] = k.split('|'); if (!['85-89', '90-94', '95-99'].includes(f)) continue; const kk = `${u.toLowerCase()}|${m}`; mun.set(kk, (mun.get(kk) ?? 0) + x[1]); }
  const c = new Map(); for (const f of ['censo2022-9514-idade-b.json', 'censo2022-9514-idade-c.json']) for (const r of JSON.parse(readFileSync(path.join(DIR_DADOS, 'raw', 'externos', 'ibge', f), 'utf8')).slice(1)) { const o = c.get(r.D1C) ?? c.set(r.D1C, {}).get(r.D1C); o[r.D5C] = Number(r.V) || 0; }
  const { db: db2 } = await abrirLeitura(); const ib = new Map(db2.prepare('SELECT codigo, uf, codigo_ibge FROM municipio').all().map((r) => [`${r.uf}|${r.codigo}`, r.codigo_ibge])); db2.close();
  let n = 0; let acima = 0; let sem = 0; let maior = 0;
  for (const [k, x] of mun) { const i = ib.get(k); const o = i && c.get(String(i)); if (!o) { sem++; continue; } n++; const teto = (o['49108'] ?? 0) + (o['49109'] ?? 0) + (o['60040'] ?? 0) + (o['6648'] ?? 0); if (x > teto) acima++; maior = Math.max(maior, x / teto); }
  R.municipioTeto = { municipios: n, semCodigoIbge: sem, acimaDoTeto: acima, maiorRazaoVotantesSobreTeto: r3(maior) };
}
await writeFile(path.join(SAIDA, 'extra.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
