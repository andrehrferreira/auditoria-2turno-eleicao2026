// Cético (lente: dados e definições) sobre o achado "centenarios-nao-votam" (docs/analysis/demografo/03-muito-idosos.md §2).
// Só leitura: dados abertos do TSE (zips), saídas do demógrafo (perfil/*.tsv, secao-turnos.tsv) e o banco em readOnly.
// Modos:
//   faixas  → comparecimento OFICIAL por faixa etária no 1º turno (perfil_comparecimento_abstencao_2026, por UF/município/zona),
//             contagem de eleitores por faixa nesse arquivo × perfil por seção (julho). Saída: cetico/faixas-1t.json, zonas-1t.tsv
//   poder   → reproduz a regressão do autor, mede o viés contextual (placebo e calibração com o comparecimento oficial),
//             e simula uso de títulos 100+ / 90–99 sem biometria em várias intensidades e concentrações. Saída: cetico/cnv-dados-poder.json
// Uso: node scripts/auditoria/cetico-centenarios-nao-votam-dados.mjs faixas | poder
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { entradasZip, linhasBrutas } from './contagem-zip.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(RAIZ, 'data/parsed/auditoria/cetico');
const DEM = path.join(RAIZ, 'data/parsed/auditoria/demografo');
const ZIP_COMP = path.join(RAIZ, 'data/raw/dadosabertos/perfil_comparecimento_abstencao/perfil_comparecimento_abstencao_2026.zip');
const r4 = (x) => Math.round(x * 10000) / 10000;
const modo = process.argv[2];
await mkdir(OUT, { recursive: true });

// Faixas do TSE → grupos usados pelo autor
function grupo(cod) {
  if (cod === 1600 || cod === 1700) return 'f16_17';
  if (cod >= 1800 && cod <= 6569) return 'f18_69';
  if (cod === 7074 || cod === 7579) return 'f70_79';
  if (cod === 8084 || cod === 8589) return 'f80_89';
  if (cod === 9094 || cod === 9599) return 'f90_99';
  if (cod === 9999) return 'f100';
  return 'invalida';
}
const GRUPOS = ['f16_17', 'f18_69', 'f70_79', 'f80_89', 'f90_99', 'f100', 'invalida'];

// =====================================================================================
if (modo === 'faixas') {
  const entradas = (await entradasZip(ZIP_COMP)).filter((e) => /_2026_[A-Z]{2}\.csv$/.test(e.nome) && !e.nome.includes('BRASIL'));
  const nac = {}; const porCod = {}; const zonas = new Map(); const turnos = {}; const datas = new Set();
  for (const e of entradas) {
    let col = null;
    for await (const c of linhasBrutas(ZIP_COMP, e)) {
      if (!col) { col = Object.fromEntries(c.map((n, i) => [n, i])); continue; }
      const turno = c[col.NR_TURNO]; turnos[turno] = (turnos[turno] ?? 0) + 1; datas.add(c[col.DT_GERACAO]);
      const cod = Number(c[col.CD_FAIXA_ETARIA]); const g = grupo(cod);
      const ap = Number(c[col.QT_APTOS]), co = Number(c[col.QT_COMPARECIMENTO]), tte = Number(c[col.QT_COMPARECIMENTO_TTE]) + Number(c[col.QT_ABSTENCAO_TTE]);
      const k = `${turno}|${g}`; const a = (nac[k] ??= { aptos: 0, comp: 0, tte: 0 }); a.aptos += ap; a.comp += co; a.tte += tte;
      const kc = `${turno}|${cod}|${c[col.DS_FAIXA_ETARIA]}`; const b = (porCod[kc] ??= { aptos: 0, comp: 0 }); b.aptos += ap; b.comp += co;
      const kz = `${turno}\t${c[col.SG_UF].toLowerCase()}\t${c[col.CD_MUNICIPIO].padStart(5, '0')}\t${String(Number(c[col.NR_ZONA])).padStart(4, '0')}`;
      let z = zonas.get(kz); if (!z) zonas.set(kz, (z = Object.fromEntries(GRUPOS.flatMap((x) => [[`a_${x}`, 0], [`c_${x}`, 0]]))));
      z[`a_${g}`] += ap; z[`c_${g}`] += co;
    }
    console.error(`${e.nome} ok`);
  }
  const taxa = Object.fromEntries(Object.entries(nac).map(([k, v]) => [k, { ...v, taxa: r4(v.comp / v.aptos) }]));
  // Perfil por seção (julho) somado: eleitores por grupo, para comparar a contagem 100+ entre as duas bases
  const perfilSoma = Object.fromEntries(GRUPOS.map((g) => [g, 0]));
  for (const f of readdirSync(path.join(DEM, 'perfil'))) {
    const l = readFileSync(path.join(DEM, 'perfil', f), 'utf8').trimEnd().split('\n'); const cab = l[0].split('\t');
    for (const x of l.slice(1)) { const c = x.split('\t'); for (const g of GRUPOS) perfilSoma[g] += Number(c[cab.indexOf(g)]); }
  }
  const lin = [['turno', 'uf', 'municipio', 'zona', ...GRUPOS.flatMap((x) => [`a_${x}`, `c_${x}`])].join('\t')];
  for (const [k, z] of zonas) lin.push([k, ...GRUPOS.flatMap((x) => [z[`a_${x}`], z[`c_${x}`]])].join('\t'));
  await writeFile(path.join(OUT, 'zonas-comparecimento-faixa.tsv'), lin.join('\n') + '\n');
  const res = { arquivo: path.relative(RAIZ, ZIP_COMP), dt_geracao: [...datas], linhas_por_turno: turnos, por_grupo: taxa, por_codigo: porCod, perfil_secao_julho_por_grupo: perfilSoma };
  await writeFile(path.join(OUT, 'faixas-comparecimento.json'), JSON.stringify(res, null, 1));
  console.log(JSON.stringify({ dt: res.dt_geracao, turnos, taxa, perfilSoma }, null, 1));
}

// =====================================================================================
if (modo === 'poder') {
  // ---- Perfil por seção (igual ao autor)
  const perfil = new Map(); let COL;
  for (const f of readdirSync(path.join(DEM, 'perfil'))) {
    const linhas = readFileSync(path.join(DEM, 'perfil', f), 'utf8').trimEnd().split('\n');
    COL = linhas[0].split('\t');
    for (const l of linhas.slice(1)) { const c = l.split('\t'); perfil.set(c.slice(0, 4).join('|'), c.slice(4).map(Number)); }
  }
  const I = Object.fromEntries(COL.slice(4).map((n, i) => [n, i]));
  const unidades = { 1: [], 2: [] };
  for (const l of readFileSync(path.join(DEM, 'secao-turnos.tsv'), 'utf8').trimEnd().split('\n').slice(1)) {
    const [t, uf, mun, zona, secao, aptos, comp, instalada, , , membros] = l.split('\t');
    const soma = new Array(COL.length - 4).fill(0); let semPerfil = 0;
    for (const s of membros.split(',')) { const v = perfil.get(`${uf}|${mun}|${zona}|${s}`); if (!v) { semPerfil++; continue; } for (let i = 0; i < soma.length; i++) soma[i] += v[i]; }
    if (uf === 'zz' || !+aptos || instalada !== 'Sim' || semPerfil) continue;
    if (soma[I.total] < 50) continue;
    unidades[t].push({ uf, mun, zona, secao, aptos: +aptos, comp: +comp, p: soma });
  }
  perfil.clear();

  // ---- BU: comparecimento sem biometria cadastrada (para placebo com/sem biometria)
  const db = new DatabaseSync(path.join(RAIZ, 'data/db/eleicao2026.sqlite'), { readOnly: true });
  const bu = { 1: new Map(), 2: new Map() };
  const cargas = new Set(db.prepare('SELECT turno || uf AS k FROM carga').all().map((r) => r.k));
  for (const r of db.prepare(`SELECT turno, uf, municipio, zona, secao, comparecimento, sem_biometria, por_biografia FROM secao WHERE situacao = 'completa' AND sem_biometria IS NOT NULL`).iterate()) {
    if (!cargas.has(`${r.turno}${r.uf}`)) continue;
    bu[r.turno].set(`${r.uf}|${r.municipio}|${r.zona}|${r.secao}`, r);
  }

  // ---- Regressão com efeito fixo de município (desvio da média), com EP robusto por cluster de município
  const NOMES = ['p16_17', 'p70_79', 'p80_89', 'p90_99_com_bio', 'p90_99_sem_bio', 'p100', 'p18_69_sem_bio'];
  const xDe = (u) => { const p = u.p, tot = p[I.total]; return [p[I.f16_17] / tot, p[I.f70_79] / tot, p[I.f80_89] / tot, (p[I.f90_99] - p[I.sembio_f90_99]) / tot, p[I.sembio_f90_99] / tot, p[I.f100] / tot, p[I.sembio_f18_69] / tot]; };
  function inv(M) { const n = M.length; const A = M.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
    for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; [A[c], A[p]] = [A[p], A[c]]; const d = A[c][c]; for (let j = 0; j < 2 * n; j++) A[c][j] /= d;
      for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c]; for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[c][j]; } }
    return A.map((r) => r.slice(n)); }
  // fe: 'mun' | 'nenhum' ; ys: função u → y ; filtro opcional
  function regFE(us, yf, { fe = 'mun', comSE = false } = {}) {
    const grupos = new Map();
    for (const u of us) { const y = yf(u); if (!Number.isFinite(y)) continue; const k = fe === 'mun' ? u.mun : 'all'; const g = grupos.get(k) ?? []; g.push([xDe(u), y]); grupos.set(k, g); }
    const k = NOMES.length; const XtX = Array.from({ length: k }, () => new Array(k).fill(0)); const Xty = new Array(k).fill(0);
    const dem = [];
    for (const [gk, g] of grupos) {
      if (g.length < 2) continue;
      const mx = new Array(k).fill(0); let my = 0; for (const [x, y] of g) { for (let j = 0; j < k; j++) mx[j] += x[j] / g.length; my += y / g.length; }
      const rows = g.map(([x, y]) => [x.map((v, j) => v - mx[j]), y - my]); dem.push(rows);
      for (const [x, y] of rows) for (let a = 0; a < k; a++) { Xty[a] += x[a] * y; for (let b = 0; b < k; b++) XtX[a][b] += x[a] * x[b]; }
    }
    const Ai = inv(XtX); const beta = Ai.map((r) => r.reduce((s, v, j) => s + v * Xty[j], 0));
    let se = null;
    if (comSE) {
      const M = Array.from({ length: k }, () => new Array(k).fill(0));
      for (const rows of dem) { const s = new Array(k).fill(0); for (const [x, y] of rows) { const e = y - x.reduce((t, v, j) => t + v * beta[j], 0); for (let j = 0; j < k; j++) s[j] += x[j] * e; } for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) M[a][b] += s[a] * s[b]; }
      // V = Ai M Ai (sanduíche por cluster de município)
      const AM = Ai.map((r) => M[0].map((_, j) => r.reduce((t, v, m) => t + v * M[m][j], 0)));
      const AMA = AM.map((r) => Ai[0].map((_, j) => r.reduce((t, v, m) => t + v * Ai[m][j], 0)));
      se = AMA.map((r, i) => r4(Math.sqrt(r[i])));
    }
    return { ...Object.fromEntries(NOMES.map((n, i) => [n, r4(beta[i])])), ...(se ? { ep_cluster_mun: Object.fromEntries(NOMES.map((n, i) => [n, se[i]])) } : {}), n: dem.reduce((s, r) => s + r.length, 0) };
  }
  const res = { definicoes: {}, reproducao: {}, placebo: {}, simulacao: {}, limite_secao: {} };

  // ---- 1. Reprodução e sensibilidade a definições
  for (const t of [1, 2]) {
    const us = unidades[t];
    res.reproducao[`turno${t}`] = {
      autor_y_comp_sobre_aptos_detalhe: regFE(us, (u) => u.comp / u.aptos, { comSE: true }),
      y_comp_sobre_perfil_julho: regFE(us, (u) => u.comp / u.p[I.total]),
      sem_efeito_fixo: regFE(us, (u) => u.comp / u.aptos, { fe: 'nenhum' }),
    };
  }
  // diferença aptos (detalhe, eleição) × perfil (julho)
  for (const t of [1, 2]) {
    const d = unidades[t].map((u) => u.aptos - u.p[I.total]); d.sort((a, b) => a - b);
    res.definicoes[`aptos_menos_perfil_t${t}`] = { p1: d[Math.floor(d.length * 0.01)], p50: d[Math.floor(d.length / 2)], p99: d[Math.floor(d.length * 0.99)], soma: d.reduce((s, v) => s + v, 0), n: d.length };
  }

  // ---- 2. Placebo: decompor o comparecimento em com e sem biometria cadastrada (BU). 92% dos 100+ não têm biometria:
  // num modelo de composição puro, o coeficiente de p100 na parte COM biometria fica em [-b, -b + 0,08] (b = taxa da base),
  // e na parte SEM biometria em [0; 0,92]. O que passar disso é viés contextual (efeito do lugar, não do grupo).
  for (const t of [1, 2]) {
    const us = unidades[t].filter((u) => bu[t].has(`${u.uf}|${u.mun}|${u.zona}|${u.secao}`) && bu[t].get(`${u.uf}|${u.mun}|${u.zona}|${u.secao}`).comparecimento === u.comp);
    const g = (u) => bu[t].get(`${u.uf}|${u.mun}|${u.zona}|${u.secao}`);
    const tot = us.reduce((s, u) => s + u.aptos, 0);
    res.placebo[`turno${t}`] = {
      secoes: us.length, ufs: [...new Set(us.map((u) => u.uf))].length,
      y_total: regFE(us, (u) => u.comp / u.aptos),
      y_com_biometria: regFE(us, (u) => (u.comp - g(u).sem_biometria) / u.aptos, { comSE: true }),
      y_sem_biometria: regFE(us, (u) => g(u).sem_biometria / u.aptos, { comSE: true }),
      taxa_base_aprox_com_bio: r4(us.reduce((s, u) => s + (u.comp - g(u).sem_biometria), 0) / us.reduce((s, u) => s + u.p[I.biometria], 0)),
      taxa_sem_bio_global: r4(us.reduce((s, u) => s + g(u).sem_biometria, 0) / us.reduce((s, u) => s + u.p[I.total] - u.p[I.biometria], 0)),
      aptos: tot,
    };
  }

  // ---- 3. Simulação de uso: adiciona votos de títulos 100+ (e 90–99 sem biometria) e mede o deslocamento do coeficiente.
  // Cenários: fração f dos títulos usada, concentrada em s% das seções que têm o grupo (sorteadas), ou no município inteiro (s% dos municípios),
  // ou nas seções com MAIS títulos do grupo (alvo preferido de quem fraudasse). O voto adicionado não passa da abstenção observada.
  // mulberry32 (Math.imul, 32 bits exatos). O LCG anterior estourava a precisão do double (errata de 29/10/2026 no parecer).
  let seed = 12345; const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  function simula(t, grupoIdx, f, s, modoC) {
    const us = unidades[t]; const elig = us.filter((u) => grupoIdx(u) > 0);
    let alvo;
    if (modoC === 'secoes') alvo = new Set(elig.filter(() => rnd() < s));
    else if (modoC === 'municipios') { const ms = [...new Set(elig.map((u) => u.mun))].filter(() => rnd() < s); const S = new Set(ms); alvo = new Set(elig.filter((u) => S.has(u.mun))); }
    else { const ord = [...elig].sort((a, b) => grupoIdx(b) / b.p[I.total] - grupoIdx(a) / a.p[I.total]); alvo = new Set(ord.slice(0, Math.round(s * ord.length))); }
    // fração dentro das seções-alvo para atingir f no total do grupo
    const totG = elig.reduce((q, u) => q + grupoIdx(u), 0); const totAlvo = [...alvo].reduce((q, u) => q + grupoIdx(u), 0);
    const fl = Math.min(1, f * totG / Math.max(1, totAlvo));
    let add = 0; const extra = new Map();
    for (const u of alvo) { const v = Math.min(u.aptos - u.comp, Math.round(fl * grupoIdx(u))); if (v > 0) { extra.set(u, v); add += v; } }
    const reg = regFE(us, (u) => (u.comp + (extra.get(u) ?? 0)) / u.aptos);
    return { f, concentracao: s, modo: modoC, fracao_local: r4(fl), votos_adicionados: add, votos_pretendidos: Math.round(f * totG), p100: reg.p100, p90_99_sem_bio: reg.p90_99_sem_bio };
  }
  const g100 = (u) => u.p[I.f100]; const g90s = (u) => u.p[I.sembio_f90_99];
  for (const t of [2, 1]) {
    const lst = [];
    for (const [nomeG, gi] of [['100+', g100], ['90-99 sem bio', g90s]]) {
      for (const f of [0.01, 0.05, 0.10, 0.20, 0.30, 0.40]) for (const [m, s] of [['secoes', 1], ['secoes', 0.10], ['municipios', 0.10], ['topo', 0.05]]) {
        if (f >= 0.2 && m !== 'secoes' && s !== 1 && m !== 'topo') { /* concentração alta com f alto pode saturar; ainda assim roda */ }
        lst.push({ grupo: nomeG, ...simula(t, gi, f, s, m) });
      }
    }
    res.simulacao[`turno${t}`] = lst;
    console.error(`simulação turno ${t} ok`);
  }

  // ---- 4. Poder do limite por seção (22.389 seções com 5+ eleitores 100+): se TODOS os 100+ votassem além do observado, em quantas seções o limite dispararia?
  for (const t of [1, 2]) {
    let n = 0, disp = 0, dispMetade = 0, folgaMed = [];
    for (const u of unidades[t]) { const e = u.p[I.f100]; if (e < 5) continue; n++; const folga = (u.aptos - e) - u.comp; folgaMed.push(folga / e);
      if (u.comp + Math.min(e, u.aptos - u.comp) > u.aptos - e) disp++; if (u.comp + Math.min(Math.round(e / 2), u.aptos - u.comp) > u.aptos - e) dispMetade++; }
    folgaMed.sort((a, b) => a - b);
    res.limite_secao[`turno${t}`] = { secoes_5mais_100: n, dispararia_se_todos_100_votassem_a_mais: disp, dispararia_se_metade: dispMetade, folga_em_multiplos_de_e100_mediana: r4(folgaMed[Math.floor(folgaMed.length / 2)]), folga_p5: r4(folgaMed[Math.floor(folgaMed.length * 0.05)]) };
  }

  // ---- 5. Calibração com o comparecimento OFICIAL por faixa (1º turno, por zona): mesma regressão em nível de zona com efeito fixo de UF,
  // onde o verdadeiro comparecimento do grupo 100+ é conhecido.
  const fz = path.join(OUT, 'zonas-comparecimento-faixa.tsv');
  if (existsSync(fz)) {
    const l = readFileSync(fz, 'utf8').trimEnd().split('\n'); const cab = l[0].split('\t'); const ix = Object.fromEntries(cab.map((n, i) => [n, i]));
    const zs = [];
    for (const x of l.slice(1)) { const c = x.split('\t'); if (c[0] !== '1' || c[1] === 'zz') continue; const a = (g) => +c[ix[`a_${g}`]], co = (g) => +c[ix[`c_${g}`]];
      const A = GRUPOS.reduce((s, g) => s + a(g), 0), C = GRUPOS.reduce((s, g) => s + co(g), 0); if (A < 1000) continue; zs.push({ uf: c[1], A, C, a, co }); }
    // y = C/A; x = parcelas por grupo (base 18-69); verdade: coef(g) = taxa(g) - taxa(18-69) se não houvesse viés
    const NZ = ['f16_17', 'f70_79', 'f80_89', 'f90_99', 'f100'];
    const por = new Map(); for (const z of zs) { const g = por.get(z.uf) ?? []; g.push([NZ.map((g2) => z.a(g2) / z.A), z.C / z.A]); por.set(z.uf, g); }
    const k = NZ.length; const XtX = Array.from({ length: k }, () => new Array(k).fill(0)); const Xty = new Array(k).fill(0);
    for (const g of por.values()) { if (g.length < 2) continue; const mx = new Array(k).fill(0); let my = 0; for (const [x, y] of g) { for (let j = 0; j < k; j++) mx[j] += x[j] / g.length; my += y / g.length; }
      for (const [x, y] of g) { const xd = x.map((v, j) => v - mx[j]); const yd = y - my; for (let a = 0; a < k; a++) { Xty[a] += xd[a] * yd; for (let b = 0; b < k; b++) XtX[a][b] += xd[a] * xd[b]; } } }
    const Ai = inv(XtX); const beta = Ai.map((r) => r.reduce((s, v, j) => s + v * Xty[j], 0));
    const tx = (g) => zs.reduce((s, z) => s + z.co(g), 0) / zs.reduce((s, z) => s + z.a(g), 0);
    res.calibracao_zona_1t = { zonas: zs.length, coef_estimado: Object.fromEntries(NZ.map((n, i) => [n, r4(beta[i])])), coef_verdadeiro_sem_vies: Object.fromEntries(NZ.map((n) => [n, r4(tx(n) - tx('f18_69'))])), taxa_oficial: Object.fromEntries(GRUPOS.map((g) => [g, r4(tx(g))])) };
    // Coerência: comparecimento por zona no arquivo por faixa (registro por eleitor) × soma das seções no detalhe_votacao_secao (BU), 1º turno
    const det = new Map();
    for (const x of readFileSync(path.join(DEM, 'secao-turnos.tsv'), 'utf8').trimEnd().split('\n').slice(1)) {
      const [t, uf, mun, zona, , aptos, comp] = x.split('\t'); if (t !== '1') continue; const k = `${uf}\t${mun}\t${zona}`; const d = det.get(k) ?? { a: 0, c: 0 }; d.a += +aptos; d.c += +comp; det.set(k, d);
    }
    let zIg = 0, zDif = 0, somaAbs = 0, totC = 0, totD = 0, totA = 0, totAD = 0; const difs = [];
    for (const x of l.slice(1)) { const c = x.split('\t'); if (c[0] !== '1') continue; const k = c.slice(1, 4).join('\t'); const C = GRUPOS.reduce((s, g) => s + +c[ix[`c_${g}`]], 0); const A = GRUPOS.reduce((s, g) => s + +c[ix[`a_${g}`]], 0);
      const d = det.get(k) ?? { a: 0, c: 0 }; totC += C; totD += d.c; totA += A; totAD += d.a; if (C === d.c) zIg++; else { zDif++; somaAbs += Math.abs(C - d.c); difs.push([k, C, d.c]); } }
    // zonas com maior comparecimento oficial de 100+ (1º turno)
    const topZ = zs.filter((z) => z.a('f100') >= 30).map((z) => ({ uf: z.uf, a100: z.a('f100'), c100: z.co('f100'), taxa100: r4(z.co('f100') / z.a('f100')), a90: z.a('f90_99'), taxa90: r4(z.co('f90_99') / z.a('f90_99')) })).sort((a, b) => b.taxa100 - a.taxa100);
    res.coerencia_oficial_x_bu_1t = { zonas_iguais: zIg, zonas_diferentes: zDif, soma_abs_dif: somaAbs, comp_oficial_faixa: totC, comp_detalhe: totD, aptos_oficial_faixa: totA, aptos_detalhe: totAD, exemplos_dif: difs.sort((a, b) => Math.abs(b[1] - b[2]) - Math.abs(a[1] - a[2])).slice(0, 10),
      zonas_30mais_100: topZ.length, zonas_taxa100_acima_5pct: topZ.filter((z) => z.taxa100 > 0.05).length, top_zonas_taxa100: topZ.slice(0, 10) };
  }
  await writeFile(path.join(OUT, 'cnv-dados-poder.json'), JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res, null, 1));
}
