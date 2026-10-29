// Cético: revisão do achado "centenarios-nao-votam" (docs/analysis/demografo/03-muito-idosos.md, seção 2).
// Lente: explicações alternativas e poder do teste.
// 1) Reproduz a regressão com efeito fixo (EF) de município e calcula erro padrão robusto por município.
// 2) Confere o valor de referência −0,83 (comparecimento do grupo base 18–69 com biometria).
// 3) Simula uso de títulos 100+ (uniforme, concentrado, por município, k por seção) e mede quanto o coeficiente muda.
// 4) Testes alternativos: EF de local de votação, interação com municípios de "excesso" de 100+, 100+ com e sem biometria,
//    diferença entre turnos, folga do limite por seção.
// Somente leitura. Entradas: data/parsed/auditoria/demografo/{perfil/*.tsv, secao-turnos.tsv, municipios.tsv}, banco (local de votação, 2º turno).
// Uso: node scripts/auditoria/cetico-centenarios-poder.mjs
// Saída: data/parsed/auditoria/cetico/centenarios-poder.json
import { readFileSync, readdirSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const DEM = path.join(RAIZ, 'data/parsed/auditoria/demografo');
const OUT = path.join(RAIZ, 'data/parsed/auditoria/cetico');
const r4 = (x) => Math.round(x * 10000) / 10000;

// ---------- perfil
const perfil = new Map(); let COL;
for (const f of readdirSync(path.join(DEM, 'perfil'))) {
  const linhas = readFileSync(path.join(DEM, 'perfil', f), 'utf8').trimEnd().split('\n');
  COL = linhas[0].split('\t');
  for (const l of linhas.slice(1)) { const c = l.split('\t'); perfil.set(c.slice(0, 4).join('|'), Int32Array.from(c.slice(4).map(Number))); }
}
const I = Object.fromEntries(COL.slice(4).map((n, i) => [n, i]));

// ---------- municípios com excesso de 100+ (eleitores 100+ > coorte 96+ do Censo 2022)
const excesso = new Map();
{
  const l = readFileSync(path.join(DEM, 'municipios.tsv'), 'utf8').trimEnd().split('\n'); const h = l[0].split('\t');
  const ie = h.indexOf('eleitores_100'), ip = h.indexOf('pop96_2022'), im = h.indexOf('municipio_tse');
  for (const x of l.slice(1)) { const c = x.split('\t'); excesso.set(c[im], { e100: +c[ie], p96: +c[ip] }); }
}

// ---------- local de votação (2º turno, banco)
const db = new DatabaseSync(path.join(RAIZ, 'data/db/eleicao2026.sqlite'), { readOnly: true });
const local = new Map();
for (const r of db.prepare('SELECT uf, municipio, zona, secao, local FROM secao WHERE turno = 2').iterate()) local.set(`${r.uf}|${r.municipio}|${r.zona}|${r.secao}`, r.local);
const carga1 = db.prepare("SELECT count(*) n, sum(secoes) s FROM carga WHERE turno = 1").get();

// ---------- unidades por turno (mesmos filtros do autor: UF ≠ zz, aptos > 0, instalada, todo membro com perfil, 50+ no perfil)
const unidades = { 1: [], 2: [] };
{
  const linhas = readFileSync(path.join(DEM, 'secao-turnos.tsv'), 'utf8').trimEnd().split('\n').slice(1);
  for (const l of linhas) {
    const [t, uf, mun, zona, secao, aptos, comp, instalada, , , membros] = l.split('\t');
    if (uf === 'zz' || !+aptos || instalada !== 'Sim') continue;
    const soma = new Array(COL.length - 4).fill(0); let sem = 0;
    for (const s of membros.split(',')) { const v = perfil.get(`${uf}|${mun}|${zona}|${s}`); if (!v) { sem++; continue; } for (let i = 0; i < soma.length; i++) soma[i] += v[i]; }
    if (sem) continue;
    const tot = soma[I.total]; if (tot < 50) continue;
    const p = soma;
    const n100sem = p[I.sembio_f100], n100com = p[I.f100] - p[I.sembio_f100];
    unidades[t].push({
      k: `${uf}|${mun}|${zona}|${secao}`, uf, mun, zona, membros, aptos: +aptos, comp: +comp, tot, n100: p[I.f100], n100sem, n100com,
      n90sem: p[I.sembio_f90_99],
      x: [p[I.f16_17] / tot, p[I.f70_79] / tot, p[I.f80_89] / tot, (p[I.f90_99] - p[I.sembio_f90_99]) / tot, p[I.sembio_f90_99] / tot, p[I.f100] / tot, p[I.sembio_f18_69] / tot],
      base: (p[I.f18_69] - p[I.sembio_f18_69]) / tot,
      loc: `${uf}|${mun}|${zona}|${local.get(`${uf}|${mun}|${zona}|${secao}`)}`,
    });
  }
}
const NOMES = ['p16_17', 'p70_79', 'p80_89', 'p90_99_com_bio', 'p90_99_sem_bio', 'p100', 'p18_69_sem_bio'];
const J100 = 5, J90S = 4;

// ---------- regressão com EF (desvio da média do grupo, grupos com 2+ unidades), EP robusto por cluster
function solve(A, b) { // Gauss com pivô, A k×k
  const k = b.length; const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < k; c++) {
    let p = c; for (let r = c + 1; r < k; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < k; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let j = c; j <= k; j++) M[r][j] -= f * M[c][j]; }
  }
  return M.map((r, i) => r[k] / r[i]);
}
function inv(A) { const k = A.length; const cols = []; for (let j = 0; j < k; j++) cols.push(solve(A, A.map((_, i) => (i === j ? 1 : 0)))); return A.map((_, i) => cols.map((c) => c[i])); }
// prepara o desenho: devolve X demeaned, (X'X)^-1, índices de grupo e cluster; permite reaproveitar para vários y
function desenho(us, feKey, clKey, xf) {
  const grupos = new Map();
  us.forEach((u, i) => { const g = feKey(u); const a = grupos.get(g) ?? []; a.push(i); grupos.set(g, a); });
  const idx = []; const gid = []; const cl = [];
  let gi = 0; for (const a of grupos.values()) { if (a.length < 2) continue; for (const i of a) { idx.push(i); gid.push(gi); cl.push(clKey(us[i])); } gi++; }
  const k = xf(us[0]).length; const n = idx.length;
  const Xr = idx.map((i) => xf(us[i]));
  const mx = Array.from({ length: gi }, () => new Float64Array(k)); const cnt = new Float64Array(gi);
  for (let r = 0; r < n; r++) { cnt[gid[r]]++; for (let j = 0; j < k; j++) mx[gid[r]][j] += Xr[r][j]; }
  for (let g = 0; g < gi; g++) for (let j = 0; j < k; j++) mx[g][j] /= cnt[g];
  const X = Xr.map((x, r) => x.map((v, j) => v - mx[gid[r]][j]));
  const XtX = Array.from({ length: k }, () => new Array(k).fill(0));
  for (const x of X) for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) XtX[a][b] += x[a] * x[b];
  const XtXi = inv(XtX);
  return { idx, gid, cl, X, XtXi, k, n, ng: gi, cnt };
}
function ajusta(D, yf, { ep = true } = {}) {
  const { idx, gid, X, XtXi, k, n, ng, cnt } = D;
  const yr = idx.map(yf); const my = new Float64Array(ng);
  for (let r = 0; r < n; r++) my[gid[r]] += yr[r];
  for (let g = 0; g < ng; g++) my[g] /= cnt[g];
  const y = yr.map((v, r) => v - my[gid[r]]);
  const Xty = new Array(k).fill(0);
  for (let r = 0; r < n; r++) for (let j = 0; j < k; j++) Xty[j] += X[r][j] * y[r];
  const beta = XtXi.map((row) => row.reduce((s, v, j) => s + v * Xty[j], 0));
  if (!ep) return { beta };
  // EP robusto por cluster (CR0)
  const sc = new Map(); let sse = 0, sst = 0;
  for (let r = 0; r < n; r++) {
    const e = y[r] - X[r].reduce((s, v, j) => s + v * beta[j], 0); sse += e * e; sst += y[r] * y[r];
    const c = D.cl[r]; const a = sc.get(c) ?? new Float64Array(k); for (let j = 0; j < k; j++) a[j] += X[r][j] * e; sc.set(c, a);
  }
  const meat = Array.from({ length: k }, () => new Array(k).fill(0));
  for (const s of sc.values()) for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) meat[a][b] += s[a] * s[b];
  const V = XtXi.map((row) => XtXi[0].map((_, j) => row.reduce((s, v, m) => s + v * meat.map((mr) => mr.reduce((t, w, q) => t + w * XtXi[q][j], 0))[m], 0)));
  return { beta, ep: V.map((r, i) => Math.sqrt(r[i])), r2: 1 - sse / sst, n, grupos: ng, clusters: sc.size };
}
const fmt = (res, nomes) => Object.fromEntries(nomes.map((nm, j) => [nm, res.ep ? { b: r4(res.beta[j]), ep: r4(res.ep[j]) } : r4(res.beta[j])]));

const resultado = { gerado_em: new Date().toISOString(), aviso_1t: `secao-turnos.tsv vem de detalhe_votacao_secao (completo nos 2 turnos); o banco do 1º turno está parcial (${carga1.n} UFs carregadas, ${carga1.s} seções) e só foi usado para o local de votação do 2º turno.` };
const yComp = (us) => (i) => us[i].comp / us[i].aptos;

// ===== 1. Reprodução
const D = { 1: desenho(unidades[1], (u) => u.mun, (u) => u.mun, (u) => u.x), 2: desenho(unidades[2], (u) => u.mun, (u) => u.mun, (u) => u.x) };
const reg = { 1: ajusta(D[1], yComp(unidades[1])), 2: ajusta(D[2], yComp(unidades[2])) };
resultado.reproducao = { turno1: { ...fmt(reg[1], NOMES), n: reg[1].n, r2: r4(reg[1].r2), clusters: reg[1].clusters }, turno2: { ...fmt(reg[2], NOMES), n: reg[2].n, r2: r4(reg[2].r2), clusters: reg[2].clusters } };
console.log('reprodução', JSON.stringify(resultado.reproducao));

// ===== 2. Valor de referência: comparecimento do grupo base
{
  const out = {};
  for (const t of [1, 2]) {
    const us = unidades[t];
    // pooled sem EF, com intercepto: intercepto = comparecimento previsto de uma seção 100% base
    const Dp = desenho(us, () => 'all', (u) => u.mun, (u) => u.x);
    const rp = ajusta(Dp, yComp(us));
    let my = 0; const mx = new Array(7).fill(0); for (const u of us) { my += u.comp / u.aptos; u.x.forEach((v, j) => (mx[j] += v)); }
    my /= us.length; mx.forEach((_, j) => (mx[j] /= us.length));
    const intercepto = my - rp.beta.reduce((s, b, j) => s + b * mx[j], 0);
    // com EF: base implícita = média de y − Σ β·média(x)
    const b = reg[t].beta; const baseEF = my - b.reduce((s, v, j) => s + v * mx[j], 0);
    // comparecimento agregado nacional (aptos BU)
    let A = 0, C = 0; for (const u of us) { A += u.aptos; C += u.comp; }
    out[`turno${t}`] = { intercepto_sem_EF: r4(intercepto), p100_sem_EF: fmt(rp, NOMES).p100, base_implicita_com_EF: r4(baseEF), comparecimento_medio_secoes: r4(my), comparecimento_agregado: r4(C / A),
      taxa_implicita_100mais_com_EF: r4(baseEF + b[J100]), taxa_implicita_90_99_sem_bio_com_EF: r4(baseEF + b[J90S]) };
  }
  resultado.referencia = out;
  console.log('referência', JSON.stringify(out));
}

// ===== 3. Poder: simulação de uso (2º turno)
// O estimador é linear em y: Δβ = (X'X)^-1 X'·Δy, com Δy_s = usados_s / aptos_s. Uso aleatório → resultado ≈ esperado; 20 réplicas para o desvio.
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const binom = (n, p, R) => { let c = 0; for (let i = 0; i < n; i++) if (R() < p) c++; return c; };
const us2 = unidades[2]; const D2 = D[2]; const b100 = reg[2].beta[J100], ep100 = reg[2].ep[J100];
const tot100 = us2.reduce((s, u) => s + u.n100, 0);
const comCem = us2.map((u, i) => (u.n100 > 0 ? i : -1)).filter((i) => i >= 0);
function simula(nome, gerador, reps = 10) {
  const ds = [], vs = [];
  for (let r = 0; r < reps; r++) {
    const R = rng(1000 + r); const usados = gerador(R); let v = 0; for (const x of usados.values()) v += x; vs.push(v);
    const res = ajusta(D2, (i) => (usados.get(i) ?? 0) / us2[i].aptos, { ep: false }); ds.push(res.beta[J100]);
  }
  const m = ds.reduce((s, x) => s + x, 0) / reps; const sd = Math.sqrt(ds.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, reps - 1));
  const votos = vs.reduce((s, x) => s + x, 0) / reps;
  return { cenario: nome, votos_injetados: Math.round(votos), pct_dos_titulos_100: r4(votos / tot100), delta_b100: r4(m), dp_delta: r4(sd), b100_resultante: r4(b100 + m),
    regra_do_autor_detecta: b100 + m > -0.83, detecta_vs_linha_de_base_conhecida_2EP: m > 1.96 * ep100 };
}
const cen = [];
for (const u of [0.01, 0.05, 0.10, 0.20, 0.30, 0.40, 0.50]) cen.push(simula(`uniforme ${u * 100}% dos títulos 100+`, (R) => { const m = new Map(); for (const i of comCem) { const c = binom(us2[i].n100, u, R); if (c) m.set(i, c); } return m; }));
for (const frac of [0.01, 0.05, 0.10, 0.25]) for (const taxa of [0.5, 1.0]) cen.push(simula(`${frac * 100}% das seções com 100+, ${taxa * 100}% dos 100+ delas`, (R) => { const m = new Map(); for (const i of comCem) if (R() < frac) { const c = binom(us2[i].n100, taxa, R); if (c) m.set(i, c); } return m; }));
for (const kk of [1, 2]) for (const frac of [0.10, 0.5, 1.0]) cen.push(simula(`${kk} título(s) por seção em ${frac * 100}% das seções com ${kk}+ eleitores 100+`, (R) => { const m = new Map(); for (const i of comCem) if (us2[i].n100 >= kk && R() < frac) m.set(i, kk); return m; }));
// concentrado nos municípios com excesso (eleitores 100+ > coorte 96+), uso uniforme dentro do município
const exc = (u) => { const e = excesso.get(u.mun); return e && e.e100 > e.p96; };
for (const taxa of [0.1, 0.3, 0.5, 1.0]) cen.push(simula(`municípios com excesso de 100+: ${taxa * 100}% dos 100+ (todas as seções do município)`, (R) => { const m = new Map(); for (const i of comCem) if (exc(us2[i])) { const c = binom(us2[i].n100, taxa, R); if (c) m.set(i, c); } return m; }));
// concentrado nos municípios: uso igual a "títulos 100+ em excesso no município", espalhado por seções escolhidas onde o fraudador tem acesso (metade das seções)
// e caso extremo: fraudador usa só em seções com POUCOS 100+ (1 a 2), as de menor alavancagem
for (const taxa of [0.5, 1.0]) cen.push(simula(`só seções com 1–2 eleitores 100+: ${taxa * 100}% deles`, (R) => { const m = new Map(); for (const i of comCem) if (us2[i].n100 <= 2) { const c = binom(us2[i].n100, taxa, R); if (c) m.set(i, c); } return m; }));
// uso também nos 90–99 sem biometria (efeito no próprio β 100+ via correlação)
resultado.poder = { b100_observado_2t: r4(b100), ep_cluster_municipio: r4(ep100), titulos_100_na_amostra: tot100, secoes_com_100: comCem.length,
  uso_minimo_para_regra_do_autor: r4(-0.83 - b100), uso_minimo_detectavel_se_linha_de_base_fosse_conhecida: r4(1.96 * ep100), cenarios: cen };
console.log('poder', JSON.stringify(resultado.poder, null, 1));

// ===== 4. Testes alternativos
const alt = {};
// 4a. EF de local de votação (2º turno)
{
  const Dl = desenho(us2, (u) => u.loc, (u) => u.mun, (u) => u.x); const rl = ajusta(Dl, yComp(us2));
  alt.ef_local_votacao_2t = { ...fmt(rl, NOMES), n: rl.n, grupos: rl.grupos };
  // + controle de tamanho (aptos) e de divergência perfil×aptos (cadastro desatualizado)
  const xf = (u) => [...u.x, Math.log(u.aptos), (u.tot - u.aptos) / u.tot];
  const Dc = desenho(us2, (u) => u.mun, (u) => u.mun, xf); const rc = ajusta(Dc, yComp(us2));
  alt.ef_municipio_mais_controles_2t = { ...fmt(rc, [...NOMES, 'log_aptos', 'perfil_menos_aptos_rel']), n: rc.n };
}
// 4b. 100+ sem e com biometria separados
for (const t of [1, 2]) {
  const xf = (u) => [...u.x.slice(0, 5), u.n100sem / u.tot, u.n100com / u.tot, u.x[6]];
  const Ds = desenho(unidades[t], (u) => u.mun, (u) => u.mun, xf); const rs = ajusta(Ds, yComp(unidades[t]));
  alt[`p100_sem_x_com_bio_${t}t`] = fmt(rs, [...NOMES.slice(0, 5), 'p100_sem_bio', 'p100_com_bio', 'p18_69_sem_bio']);
}
// 4c. interação p100 × município com excesso de 100+ (onde estão 92% dos títulos 100+)
for (const t of [1, 2]) {
  const xf = (u) => [...u.x, exc(u) ? u.x[5] : 0, exc(u) ? u.x[4] : 0];
  const De = desenho(unidades[t], (u) => u.mun, (u) => u.mun, xf); const re = ajusta(De, yComp(unidades[t]));
  alt[`interacao_excesso_${t}t`] = fmt(re, [...NOMES, 'p100_x_excesso', 'p90_99_sem_bio_x_excesso']);
  const ne = unidades[t].filter(exc).length;
  alt[`interacao_excesso_${t}t`].secoes_em_municipios_com_excesso = ne;
}
// 4d. diferença entre turnos (mesma seção, mesmos membros): Δcomparecimento com EF de município
{
  const m1 = new Map(unidades[1].map((u) => [u.k, u]));
  const pares = us2.filter((u) => { const a = m1.get(u.k); return a && a.membros === u.membros; }).map((u) => ({ ...u, d: u.comp / u.aptos - m1.get(u.k).comp / m1.get(u.k).aptos }));
  const Dd = desenho(pares, (u) => u.mun, (u) => u.mun, (u) => u.x); const rd = ajusta(Dd, (i) => pares[i].d);
  alt.delta_2t_menos_1t = { ...fmt(rd, NOMES), n: rd.n };
  // robustez: EF de local de votação; 100+ separado por biometria; interação com municípios de excesso
  const Ddl = desenho(pares, (u) => u.loc, (u) => u.mun, (u) => u.x); const rdl = ajusta(Ddl, (i) => pares[i].d);
  alt.delta_2t_menos_1t_ef_local = { ...fmt(rdl, NOMES), n: rdl.n };
  const xs = (u) => [...u.x.slice(0, 5), u.n100sem / u.tot, u.n100com / u.tot, u.x[6]];
  const Dds = desenho(pares, (u) => u.mun, (u) => u.mun, xs); const rds = ajusta(Dds, (i) => pares[i].d);
  alt.delta_2t_menos_1t_p100_bio = fmt(rds, [...NOMES.slice(0, 5), 'p100_sem_bio', 'p100_com_bio', 'p18_69_sem_bio']);
  const xe = (u) => [...u.x, exc(u) ? u.x[5] : 0, exc(u) ? u.x[4] : 0];
  const Dde = desenho(pares, (u) => u.mun, (u) => u.mun, xe); const rde = ajusta(Dde, (i) => pares[i].d);
  alt.delta_2t_menos_1t_excesso = fmt(rde, [...NOMES, 'p100_x_excesso', 'p90_99_sem_bio_x_excesso']);
  // poder do teste de diferença: uso de u% dos 100+ só no 1º turno
  for (const u of [0.02, 0.05, 0.10]) {
    const R = rng(77); const inj = pares.map((p) => binom(p.n100, u, R) / p.aptos);
    const rr = ajusta(Dd, (i) => pares[i].d - inj[i], { ep: false });
    alt[`delta_poder_uso_${u * 100}pct_so_no_1t`] = { delta_b100: r4(rr.beta[J100] - rd.beta[J100]), ep_teste: fmt(rd, NOMES).p100.ep };
  }
}
// 4e. folga do limite por seção (seções com 5+ eleitores 100+): quantos 100+ caberiam votando sem violar comp ≤ aptos − n100
{
  const out = {};
  for (const t of [1, 2]) {
    const folgas = []; let cabe100 = 0, n = 0, titulos = 0;
    for (const u of unidades[t]) { if (u.n100 < 5) continue; n++; titulos += u.n100; const folga = u.aptos - u.n100 - u.comp; folgas.push(folga); if (folga >= u.n100) cabe100++; }
    folgas.sort((a, b) => a - b);
    out[`turno${t}`] = { secoes: n, titulos_100: titulos, folga_mediana_eleitores: folgas[Math.floor(n / 2)], folga_p1: folgas[Math.floor(n * 0.01)], folga_min: folgas[0],
      secoes_onde_todos_os_100_podiam_ter_votado_sem_violar: cabe100 };
  }
  alt.limite_por_secao = out;
}
resultado.alternativas = alt;
console.log('alternativas', JSON.stringify(alt, null, 1));
await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, 'centenarios-poder.json'), JSON.stringify(resultado, null, 2));
console.log('ok', path.join(OUT, 'centenarios-poder.json'));
