// Cético (achado centenarios-nao-votam, lente reprodução): refaz de forma independente a regressão do demógrafo
// (comparecimento da seção ~ parcelas etárias, efeito fixo de município) e mede o PODER do desenho por simulação.
// Fontes independentes do pipeline do autor: aptos e comparecimento de Presidente do banco (BU, secao_eleicao 6258/6257),
// agregação de seções pela tabela secao_agregada do banco. Composição etária: perfil por seção já resumido em
// data/parsed/auditoria/demografo/perfil/*.tsv, conferido aqui contra o zip bruto do TSE para AC e RR (parser próprio).
// Uso: node scripts/auditoria/cetico-centenarios-nao-votam-reproducao.mjs
// Saída: data/parsed/auditoria/cetico/centenarios-reproducao.json
import { readFileSync, readdirSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { entradasZip, linhasBrutas } from './contagem-zip.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(RAIZ, 'data/parsed/auditoria/cetico');
const PERFIL = path.join(RAIZ, 'data/parsed/auditoria/demografo/perfil');
const db = new DatabaseSync(path.join(RAIZ, 'data/db/eleicao2026.sqlite'), { readOnly: true });
const r4 = (x) => Math.round(x * 1e4) / 1e4;
const res = {};

// ---------- 0. Conferência do perfil resumido contra o zip bruto (AC, RR)
const COLS = readFileSync(path.join(PERFIL, 'ac.tsv'), 'utf8').split('\n', 1)[0].split('\t');
const I = Object.fromEntries(COLS.map((c, i) => [c, i - 4]));
res.conferencia_perfil = {};
for (const uf of ['AC', 'RR']) {
  const zip = path.join(RAIZ, `data/raw/dadosabertos/perfil_eleitor_secao/perfil_eleitor_secao_2026_${uf}.zip`);
  const e = (await entradasZip(zip)).find((x) => x.nome.endsWith('.csv'));
  const bruto = new Map(); let col = null;
  for await (const c of linhasBrutas(zip, e)) {
    if (!col) { col = Object.fromEntries(c.map((k, i) => [k, i])); continue; }
    const k = `${c[col.CD_MUNICIPIO].padStart(5, '0')}|${c[col.NR_ZONA].padStart(4, '0')}|${c[col.NR_SECAO].padStart(4, '0')}`;
    const o = bruto.get(k) ?? { tot: 0, bio: 0, c100: 0, c100sem: 0, c9099sem: 0 };
    const q = +c[col.QT_ELEITORES], b = +c[col.QT_ELEITORES_BIOMETRIA], f = c[col.CD_FAIXA_ETARIA];
    o.tot += q; o.bio += b;
    if (f === '9999') { o.c100 += q; o.c100sem += q - b; }
    if (f === '9094' || f === '9599') o.c9099sem += q - b;
    bruto.set(k, o);
  }
  let iguais = 0, difer = 0;
  for (const l of readFileSync(path.join(PERFIL, `${uf.toLowerCase()}.tsv`), 'utf8').trimEnd().split('\n').slice(1)) {
    const c = l.split('\t'); const v = c.slice(4).map(Number); const o = bruto.get(c.slice(1, 4).join('|'));
    if (o && o.tot === v[I.total] && o.bio === v[I.biometria] && o.c100 === v[I.f100] && o.c9099sem === v[I.sembio_f90_99]) iguais++; else difer++;
  }
  res.conferencia_perfil[uf] = { secoes_bruto: bruto.size, iguais, diferentes: difer };
}

// ---------- 1. Perfil por seção
const perfil = new Map();
for (const f of readdirSync(PERFIL)) {
  for (const l of readFileSync(path.join(PERFIL, f), 'utf8').trimEnd().split('\n').slice(1)) {
    const c = l.split('\t'); perfil.set(c.slice(0, 4).join('|'), c.slice(4).map(Number));
  }
}

// ---------- 2. Unidades de votação (principal + agregadas) do banco
function unidades(turno, eleicao) {
  const membros = new Map(); // principal -> [secoes]
  for (const a of db.prepare('SELECT uf, municipio, zona, secao, secao_principal FROM secao_agregada WHERE turno = ?').iterate(turno)) {
    const k = `${a.uf}|${a.municipio}|${a.zona}|${a.secao_principal}`; (membros.get(k) ?? membros.set(k, []).get(k)).push(a.secao);
  }
  const ufs = turno === 2 ? null : new Set(db.prepare('SELECT uf FROM carga WHERE turno = 1').all().map((r) => r.uf));
  const U = new Map(); let semPerfil = 0, exterior = 0;
  const q = db.prepare(`SELECT e.uf, e.municipio, e.zona, e.secao, e.aptos, e.comparecimento_majoritario c FROM secao_eleicao e JOIN secao s USING (turno, uf, municipio, zona, secao)
    WHERE e.turno = ? AND e.eleicao = ? AND s.situacao = 'completa'`);
  for (const r of q.iterate(turno, eleicao)) {
    if (r.uf === 'zz') { exterior++; continue; }
    if (ufs && !ufs.has(r.uf)) continue;
    if (!r.aptos || r.c == null) continue;
    const k = `${r.uf}|${r.municipio}|${r.zona}|${r.secao}`;
    const ms = [r.secao, ...(membros.get(k) ?? [])];
    const p = new Array(COLS.length - 4).fill(0); let falta = false;
    for (const s of ms) { const v = perfil.get(`${r.uf}|${r.municipio}|${r.zona}|${s}`); if (!v) { falta = true; break; } for (let i = 0; i < p.length; i++) p[i] += v[i]; }
    if (falta) { semPerfil++; continue; }
    U.set(k, { mun: `${r.uf}|${r.municipio}`, aptos: r.aptos, comp: r.c, p, nmembros: ms.length });
  }
  return { U, semPerfil, exterior, ufs: ufs ? [...ufs].sort() : 'todas' };
}

// ---------- 3. Regressão com efeito fixo de município (desvio da média), erro-padrão por cluster de município
const NOMES = ['p16_17', 'p70_79', 'p80_89', 'p90_99_com_bio', 'p90_99_sem_bio', 'p100', 'p18_69_sem_bio'];
const xDe = (p) => { const t = p[I.total]; return [p[I.f16_17] / t, p[I.f70_79] / t, p[I.f80_89] / t, (p[I.f90_99] - p[I.sembio_f90_99]) / t, p[I.sembio_f90_99] / t, p[I.f100] / t, p[I.sembio_f18_69] / t]; };
function inv(A) {
  const n = A.length; const M = A.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]];
    const d = M[c][c]; for (let j = 0; j < 2 * n; j++) M[c][j] /= d;
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[c][j]; }
  }
  return M.map((r) => r.slice(n));
}
function preparar(U, minTot = 50, fe = true) {
  const g = new Map();
  for (const [k, u] of U) { if (u.p[I.total] < minTot) continue; const a = g.get(u.mun) ?? g.set(u.mun, []).get(u.mun); a.push({ k, u, x: xDe(u.p), y: u.comp / u.aptos }); }
  const linhas = [];
  for (const [mun, a] of g) {
    if (fe && a.length < 2) continue;
    const K = a[0].x.length;
    const mx = fe ? Array.from({ length: K }, (_, j) => a.reduce((s, r) => s + r.x[j], 0) / a.length) : new Array(K).fill(0);
    const my = fe ? a.reduce((s, r) => s + r.y, 0) / a.length : 0;
    for (const r of a) linhas.push({ k: r.k, u: r.u, mun, xd: fe ? r.x.map((v, j) => v - mx[j]) : [1, ...r.x], yd: r.y - my });
  }
  const K = linhas[0].xd.length; const XtX = Array.from({ length: K }, () => new Array(K).fill(0)); const Xty = new Array(K).fill(0);
  for (const l of linhas) for (let a = 0; a < K; a++) { Xty[a] += l.xd[a] * l.yd; for (let b = 0; b < K; b++) XtX[a][b] += l.xd[a] * l.xd[b]; }
  const Ainv = inv(XtX);
  const beta = Ainv.map((r) => r.reduce((s, v, j) => s + v * Xty[j], 0));
  // erro-padrão robusto por cluster (município)
  const meat = Array.from({ length: K }, () => new Array(K).fill(0)); const sc = new Map();
  let sse = 0, sst = 0;
  for (const l of linhas) {
    const e = l.yd - l.xd.reduce((s, v, j) => s + v * beta[j], 0); sse += e * e; sst += l.yd * l.yd;
    const s = sc.get(l.mun) ?? sc.set(l.mun, new Array(K).fill(0)).get(l.mun); for (let j = 0; j < K; j++) s[j] += l.xd[j] * e;
  }
  for (const s of sc.values()) for (let a = 0; a < K; a++) for (let b = 0; b < K; b++) meat[a][b] += s[a] * s[b];
  const V = Ainv.map((r) => Ainv[0].map((_, j) => r.reduce((acc, v, m) => acc + v * meat[m].reduce((q, w, n) => q + w * Ainv[n][j], 0), 0)));
  return { linhas, Ainv, beta, se: V.map((r, i) => Math.sqrt(r[i])), r2: 1 - sse / sst, n: linhas.length, clusters: sc.size };
}
const fmt = (m, nomes) => Object.fromEntries(nomes.map((n, i) => [n, { beta: r4(m.beta[i]), se_cluster: r4(m.se[i]) }]));

// Δβ exato para um Δy (OLS é linear em y): Δβ = (X'X)^-1 X' Δy. Com X já centrado no município, o efeito fixo
// remove a média municipal de Δy automaticamente.
function deltaBeta(m, dy) {
  const K = m.beta.length; const v = new Array(K).fill(0);
  m.linhas.forEach((l, i) => { if (dy[i]) for (let j = 0; j < K; j++) v[j] += l.xd[j] * dy[i]; });
  return m.Ainv.map((r) => r.reduce((s, a, j) => s + a * v[j], 0));
}
// gerador pseudoaleatório com semente (resultados reprodutíveis)
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const binom = (n, p, R) => { let k = 0; for (let i = 0; i < n; i++) if (R() < p) k++; return k; };

const t2 = unidades(2, 6258);
const m2 = preparar(t2.U);
res.turno2 = { unidades_banco: t2.U.size, sem_perfil: t2.semPerfil, exterior_excluido: t2.exterior, n: m2.n, municipios: m2.clusters, r2: r4(m2.r2), coef: fmt(m2, NOMES) };
// Referência: sem efeito fixo, com intercepto (= comparecimento estimado do grupo base 18-69 com biometria)
const m2p = preparar(t2.U, 50, false);
res.turno2.sem_efeito_fixo = { n: m2p.n, coef: fmt(m2p, ['intercepto_base_18_69_bio', ...NOMES]) };
// Mesma especificação ponderada? Não: o autor não pondera; registramos só a sensibilidade ao corte de tamanho.
res.turno2.sensibilidade_corte = Object.fromEntries([1, 20, 100, 200].map((c) => { const m = preparar(t2.U, c); return [`tot>=${c}`, { n: m.n, p100: r4(m.beta[5]), p90_99_sem_bio: r4(m.beta[4]) }]; }));

// ---------- 4. Poder: injeta votos de títulos 100+ (e 90-99 sem biometria) e mede Δβ e o teste de limite por seção
const L = m2.linhas; const N = L.length;
const n100 = L.map((l) => l.u.p[I.f100]);
const folga = L.map((l) => l.u.aptos - l.u.comp);
const ordem100 = [...L.keys()].sort((a, b) => n100[b] - n100[a]);
const comCent = [...L.keys()].filter((i) => n100[i] > 0);
const muns = [...new Set(L.map((l) => l.mun))];
const tot100 = n100.reduce((s, v) => s + v, 0);
const cenarios = [];
function cenario(nome, escolher, u, reps = 5) {
  const out = [];
  for (let r = 0; r < reps; r++) {
    const R = rng(1000 * r + Math.round(u * 1000) + nome.length);
    const sel = escolher(R); const dy = new Array(N).fill(0); let votos = 0, limite = 0, secoes = 0;
    for (const i of sel) {
      const k = Math.min(folga[i], binom(n100[i], u, R)); if (!k) continue;
      dy[i] = k / L[i].u.aptos; votos += k; secoes++;
      // teste de limite do autor: comparecimento > aptos − eleitores 100+ (só seções com 5+ eleitores 100+)
      if (n100[i] >= 5 && L[i].u.comp + k > L[i].u.aptos - n100[i]) limite++;
    }
    const d = deltaBeta(m2, dy);
    out.push({ votos, secoes, dp100: d[5], limite });
  }
  const med = (f) => r4(out.reduce((s, o) => s + o[f], 0) / out.length);
  const dp = med('dp100');
  cenarios.push({ cenario: nome, uso_entre_escolhidos: u, votos_injetados: Math.round(med('votos')), pct_titulos_100_usados: r4(med('votos') / tot100), secoes_afetadas: Math.round(med('secoes')),
    delta_beta_p100: dp, beta_p100_simulado: r4(m2.beta[5] + dp), z_contra_se_cluster: r4(dp / m2.se[5]), cruza_regra_menos_0_83: m2.beta[5] + dp > -0.83, secoes_que_o_teste_de_limite_acusa: med('limite') });
}
const todos = () => comCent;
for (const u of [0.01, 0.05, 0.1, 0.2, 0.3, 0.4]) cenario('uniforme: todas as seções com 100+', todos, u);
for (const [frac, u] of [[0.1, 0.5], [0.1, 1], [0.01, 1], [0.05, 1]]) {
  cenario(`aleatorio: ${frac * 100}% das seções com 100+`, (R) => comCent.filter(() => R() < frac), u);
  cenario(`concentrado: ${frac * 100}% das seções com mais 100+`, () => ordem100.slice(0, Math.round(frac * comCent.length)), u, 1);
  cenario(`municipios: ${frac * 100}% dos municípios sorteados`, (R) => { const s = new Set(muns.filter(() => R() < frac)); return comCent.filter((i) => s.has(L[i].mun)); }, u);
}
res.poder = { titulos_100_nas_secoes_do_modelo: tot100, secoes_com_100: comCent.length, beta_p100_observado: r4(m2.beta[5]), se_cluster: r4(m2.se[5]), cenarios };
// Efeito fixo absorve? Fraude que soma o MESMO número de votos em todas as seções de um município (sem relação com 100+)
{
  const R = rng(7); const s = new Set(muns.filter(() => R() < 0.1)); const dy = L.map((l) => (s.has(l.mun) ? Math.min(l.u.aptos - l.u.comp, 5) / l.u.aptos : 0));
  res.poder.fixo_5_votos_por_secao_em_10pct_municipios = { delta_beta_p100: r4(deltaBeta(m2, dy)[5]) };
}

// ---------- 5. Primeira diferença entre turnos (mesma seção, mesma composição): só UFs do 1º turno já carregadas
const t1 = unidades(1, 6257);
{
  const U = new Map();
  for (const [k, u2] of t2.U) { const u1 = t1.U.get(k); if (!u1 || u1.nmembros !== u2.nmembros) continue; U.set(k, { ...u2, comp: u2.comp / u2.aptos - u1.comp / u1.aptos, aptos: 1 }); }
  const m1 = preparar(t1.U);
  const md = preparar(U);
  res.turno1_parcial = { ufs: t1.ufs, n: m1.n, coef: fmt(m1, NOMES) };
  res.primeira_diferenca_2t_menos_1t = { n: md.n, coef: fmt(md, NOMES), nota: 'coeficiente = variação, entre turnos, do comparecimento do grupo relativa ao grupo base; uso de u% dos títulos 100+ só no 2º turno soma ~u ao coeficiente p100' };
}

// ---------- 6. Limite técnico (rastro no BU): título 100+ SEM biometria só vota pelo caminho "compareceu sem biometria".
// Votos possíveis desses títulos na seção ≤ min(eleitores 100+ sem biometria no perfil, qtdEleitoresCompareceramSemBiometria do BU).
for (const [turno, eleicao] of [[2, 6258], [1, 6257]]) {
  const T = turno === 2 ? t2 : t1;
  const sb = new Map(db.prepare('SELECT uf, municipio, zona, secao, sem_biometria FROM secao WHERE turno = ? AND sem_biometria IS NOT NULL').all(turno).map((r) => [`${r.uf}|${r.municipio}|${r.zona}|${r.secao}`, r.sem_biometria]));
  let titSem = 0, titCom = 0, teto = 0, teto5 = 0, sec5 = 0, sec5TetoZero = 0, secoes = 0, semCampo = 0; const fracs = [];
  let autor5 = 0, autor5Obriga = 0; // teste de limite do autor, refeito: 5+ eleitores 100+ e comparecimento > aptos − eleitores 100+
  for (const [k, u] of T.U) {
    if (u.p[I.f100] >= 5) { autor5++; if (u.comp > u.aptos - u.p[I.f100]) autor5Obriga++; }
    const s = sb.get(k); if (s == null) { semCampo++; continue; }
    const a = u.p[I.sembio_f100]; titSem += a; titCom += u.p[I.f100] - a; secoes++;
    const m = Math.min(a, s); teto += m;
    if (a >= 5) { sec5++; teto5 += m; fracs.push(m / a); if (s === 0) sec5TetoZero++; }
  }
  fracs.sort((x, y) => x - y);
  res[`limite_tecnico_sem_biometria_turno${turno}`] = { ufs: T.ufs, secoes, sem_campo: semCampo, autor_secoes_5mais_100: autor5, autor_dessas_obriga_uso: autor5Obriga, titulos_100_sem_bio: titSem, titulos_100_com_bio: titCom,
    teto_votos_100_sem_bio: teto, teto_pct: r4(teto / titSem), secoes_5mais_100_sem_bio: sec5, teto_nessas: teto5, nessas_sem_nenhum_voto_sem_biometria: sec5TetoZero,
    mediana_teto_por_secao: r4(fracs[Math.floor(fracs.length / 2)] ?? 0) };
}

await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, 'centenarios-reproducao.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
