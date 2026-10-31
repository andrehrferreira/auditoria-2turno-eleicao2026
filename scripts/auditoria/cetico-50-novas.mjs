// Cético, parecer 50 (H27, doc 11 do demógrafo): reprodução própria das partes A (coorte de 2022 até 2026) e B (onde está o
// excesso de seções novas com 95%+), com leitor de CSV que respeita aspas, colunas pelo nome, contagem de linhas repetidas e,
// para 2026, o comparecimento tirado de duas fontes independentes: o detalhe_votacao_secao_2026 (dados abertos) e o BU do banco.
// Também mede: regressão à média (Δ por faixa de comparecimento de 2022 e por modelo nas antigas), decomposição do excesso em
// duas ordens (o resultado depende da ordem?), TTE exato de 2026 por categoria, e a liberação sem digital nas seções com 95%+.
// Só agregados por seção. Sem CPF, sem título, sem data/private.
// Saídas: data/parsed/auditoria/cetico-revisor/50/{novas-resumo.json, secoes-2022.tsv, secoes-2026.tsv, agregadas.tsv}
// Uso: node --max-old-space-size=6000 scripts/auditoria/cetico-50-novas.mjs
import { createReadStream, readdirSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import { createInflateRaw } from 'node:zlib';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { DIR_50, separar } from './cetico-50-perfil.mjs';
import { entradasZip } from './contagem-zip.mjs';

const DA = path.join(DIR_DADOS, 'raw', 'dadosabertos');
const p4 = (x) => String(Number(x)).padStart(4, '0');
const p5 = (x) => String(Number(x)).padStart(5, '0');
const K = (uf, m, z, s) => `${uf.trim().toLowerCase()}/${p5(m)}/${p4(z)}/${p4(s)}`;
const zonaDe = (k) => k.split('/').slice(0, 3).join('/');
const log = (...a) => console.error(new Date().toISOString().slice(11, 19), ...a);
const ge95 = (x) => x.comp * 100 >= 95 * x.aptos;
const r2 = (x) => (x === null || !Number.isFinite(x) ? null : +x.toFixed(2));

async function* csv(zip, re) {
  const ents = (await entradasZip(zip)).filter((e) => re.test(e.nome));
  if (ents.length !== 1) throw new Error(`${zip}: ${ents.length} entradas para ${re}`);
  const e = ents[0];
  let f = createReadStream(zip, { start: e.inicioDados, end: e.inicioDados + e.tamanhoComprimido - 1, highWaterMark: 1 << 20 });
  if (e.metodo === 8) f = f.pipe(createInflateRaw({ chunkSize: 1 << 20 }));
  const rl = readline.createInterface({ input: f.setEncoding('latin1'), crlfDelay: Infinity });
  let col = null; let nc = 0; let ruins = 0;
  for await (const l of rl) {
    if (!l) continue;
    const c = separar(l);
    if (!col) { col = Object.fromEntries(c.map((x, i) => [x.trim(), i])); nc = c.length; continue; }
    if (c.length !== nc) { ruins++; continue; }
    yield [col, c];
  }
  if (ruins) log(`${path.basename(zip)}: ${ruins} linhas com número de colunas diferente do cabeçalho`);
}
const R = { exclusoes: {} };

// ---------- CEFT 2022 e 2024 (1º turno)
async function ceft(pasta) {
  const s = new Set(); const dir = path.join(DA, 'correspondencias', pasta);
  for (const n of readdirSync(dir).filter((x) => /^CEFT_.*\.zip$/i.test(x))) {
    for await (const [col, c] of csv(path.join(dir, n), /\.csv$/i)) s.add(K(c[col.SG_UF], c[col.CD_MUNICIPIO], c[col.NR_ZONA], c[col.NR_SECAO]));
  }
  return s;
}
// ---------- detalhe: chaves, locais e zonas; com votos: Presidente por turno
async function detalhe(ano, re, comVotos) {
  const zip = path.join(DA, 'detalhe_votacao_secao', `detalhe_votacao_secao_${ano}.zip`);
  const chaves = new Set(); const locais = new Set(); const zonas = new Set(); const t = { 1: new Map(), 2: new Map() }; let repetidas = 0;
  for await (const [col, c] of csv(zip, re)) {
    const k = K(c[col.SG_UF], c[col.CD_MUNICIPIO], c[col.NR_ZONA], c[col.NR_SECAO]);
    const lk = `${zonaDe(k)}/${Number(c[col.NR_LOCAL_VOTACAO])}`;
    chaves.add(k); locais.add(lk); zonas.add(zonaDe(k));
    if (!comVotos || Number(c[col.CD_CARGO]) !== 1) continue;
    const m = t[Number(c[col.NR_TURNO])]; if (!m) continue;
    if (m.has(k)) { repetidas++; continue; }
    m.set(k, { aptos: Number(c[col.QT_APTOS]), comp: Number(c[col.QT_COMPARECIMENTO]), local: lk });
  }
  return { chaves, locais, zonas, t, repetidas };
}
log('CEFT');
const c22 = await ceft('2022-1t'); const c24 = await ceft('2024-1t');
log('detalhe');
const d18 = await detalhe(2018, /_BR\.csv$/i, false);
const d20 = await detalhe(2020, /BRASIL\.csv$/i, false);
const d22 = await detalhe(2022, /_BR\.csv$/i, true);
const d26 = await detalhe(2026, /_BR\.csv$/i, true);
R.fontes = { ceft2022: c22.size, ceft2024: c24.size, d18: d18.chaves.size, d20: d20.chaves.size, d22: d22.chaves.size, d26: d26.chaves.size, repetidasPresidente: { d22: d22.repetidas, d26: d26.repetidas }, d22pres: { t1: d22.t[1].size, t2: d22.t[2].size }, d26pres: { t1: d26.t[1].size, t2: d26.t[2].size } };
const fora = (k) => k.startsWith('zz/') || k.startsWith('df/');
const nova26 = (k) => !c22.has(k) || (!fora(k) && !c24.has(k));
const nova22 = (k) => !d18.chaves.has(k) || (!fora(k) && !d20.chaves.has(k));

// ---------- banco 2026 (BU)
log('banco');
const { db } = await abrirLeitura();
const B = { 1: new Map(), 2: new Map() }; const exB = {};
for (const r of db.prepare('SELECT turno, uf, municipio, zona, secao, local, situacao, tipo_arquivo, comparecimento, sem_biometria, por_biometria, por_biografia FROM secao').iterate()) {
  const k = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
  if (r.situacao !== 'completa' || /^sa/.test(r.tipo_arquivo)) { const m = `${r.turno}t ${r.situacao}/${r.tipo_arquivo || '-'}`; exB[m] = (exB[m] ?? 0) + 1; continue; }
  B[r.turno].set(k, { local: `${r.uf}/${r.municipio}/${r.zona}/${r.local}`, comp: r.comparecimento, ano: r.sem_biometria, bio: r.por_biometria, dado: r.por_biografia, aptos: 0, tte: 0 });
}
for (const r of db.prepare('SELECT turno, uf, municipio, zona, secao, aptos, aptos_tte FROM secao_eleicao WHERE eleicao IN (6257, 6258)').iterate()) {
  const x = B[r.turno].get(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`); if (x) { x.aptos = r.aptos; x.tte = r.aptos_tte ?? 0; }
}
R.exclusoes.banco = exB;
const agreg = ['turno\tagregada\tprincipal'];
for (const r of db.prepare('SELECT turno, uf, municipio, zona, secao, secao_principal FROM secao_agregada').iterate()) agreg.push(`${r.turno}\t${r.uf}/${r.municipio}/${r.zona}/${r.secao}\t${r.uf}/${r.municipio}/${r.zona}/${r.secao_principal}`);
// fonte 2026 x fonte 2026: detalhe × BU
{
  const cmp = {};
  for (const t of [1, 2]) {
    let ambos = 0; let soDet = 0; let soBU = 0; let difAptos = 0; let difComp = 0;
    for (const [k, x] of d26.t[t]) { const y = B[t].get(k); if (!y) { soDet++; continue; } ambos++; if (y.aptos !== x.aptos) difAptos++; if (y.comp !== x.comp) difComp++; }
    for (const k of B[t].keys()) if (!d26.t[t].has(k)) soBU++;
    cmp[`${t}t`] = { ambos, soDetalhe: soDet, soBU, difAptos, difComp };
  }
  R.detalhe2026xBU = cmp;
}

// ---------- listas
function lista(ano, t, fonte) {
  const L = [];
  if (ano === 2022) {
    for (const [k, v] of d22.t[t]) if (v.aptos > 0) L.push({ k, aptos: v.aptos, comp: v.comp, nova: nova22(k), local: v.local, localNovo: !d18.locais.has(v.local), zonaNova: !d18.zonas.has(zonaDe(k)) });
  } else {
    const M = fonte === 'bu' ? B[t] : d26.t[t];
    for (const [k, v] of M) {
      if (!(v.aptos > 0)) continue;
      const b = B[t].get(k);
      L.push({ k, aptos: v.aptos, comp: v.comp, nova: nova26(k), local: v.local, localNovo: !d22.locais.has(v.local), zonaNova: !d22.zonas.has(zonaDe(k)), tte: b ? b.tte : null, ano: b?.ano ?? null, dado: b?.dado ?? null, bio: b?.bio ?? null, compBU: b?.comp ?? null });
    }
  }
  return L;
}
// padronização indireta: faixas de 25 aptos, taxa de 95%+ das antigas da faixa
function padroniza(N, A, cat = () => 'total', estr = (x) => Math.floor(x.aptos / 25)) {
  const T = new Map();
  for (const x of A) { const e = estr(x); const v = T.get(e) ?? T.set(e, [0, 0]).get(e); v[0]++; if (ge95(x)) v[1]++; }
  const C = {};
  for (const x of N) {
    const c = cat(x); const o = (C[c] ??= { novas: 0, obs: 0, esp: 0, semBase: 0, semBaseGe: 0 });
    o.novas++; const v = T.get(estr(x));
    if (!v) { o.semBase++; if (ge95(x)) o.semBaseGe++; continue; }
    if (ge95(x)) o.obs++; o.esp += v[1] / v[0];
  }
  for (const o of Object.values(C)) { o.exc = r2(o.obs - o.esp); o.razao = r2(o.obs / o.esp); o.esp = r2(o.esp); }
  return C;
}
const catLocal = (x) => (x.zonaNova ? 'zona nova' : x.localNovo ? 'local novo' : 'local existente');
const L22 = { 1: lista(2022, 1), 2: lista(2022, 2) };
const L26 = { 1: lista(2026, 1, 'det'), 2: lista(2026, 2, 'det') };
const L26bu = { 1: lista(2026, 1, 'bu'), 2: lista(2026, 2, 'bu') };

// ---------- A. coorte de 2022
const media = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
const ep = (a) => { const m = media(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1) / a.length); };
// mínimos quadrados com intercepto (eliminação de Gauss, poucos regressores)
function mq(X, y) {
  const p = X[0].length; const M = Array.from({ length: p }, () => new Array(p + 1).fill(0));
  for (let i = 0; i < X.length; i++) for (let a = 0; a < p; a++) { for (let b = 0; b < p; b++) M[a][b] += X[i][a] * X[i][b]; M[a][p] += X[i][a] * y[i]; }
  for (let c = 0; c < p; c++) { let piv = c; for (let r = c + 1; r < p; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r; [M[c], M[piv]] = [M[piv], M[c]]; for (let r = 0; r < p; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let b = c; b <= p; b++) M[r][b] -= f * M[c][b]; } }
  return M.map((row, i) => row[p] / M[i][i]);
}
for (const t of [2, 1]) {
  for (const [nomeFonte, M] of [['detalhe2026', d26.t[t]], ['bu2026', B[t]]]) {
    const L = L22[t];
    const par = (a) => a.map((x) => ({ x, y: M.get(x.k) })).filter((o) => o.y && o.y.aptos > 0);
    const N = L.filter((x) => x.nova); const A = L.filter((x) => !x.nova);
    const res = (a) => { const p = par(a); const d = p.map((o) => 100 * (o.y.comp / o.y.aptos - o.x.comp / o.x.aptos)); return { secoes: a.length, comPar: p.length, taxa2022: r2(100 * p.reduce((s, o) => s + o.x.comp, 0) / p.reduce((s, o) => s + o.x.aptos, 0)), taxa2026: r2(100 * p.reduce((s, o) => s + o.y.comp, 0) / p.reduce((s, o) => s + o.y.aptos, 0)), delta: r2(media(d)), ep: r2(ep(d)), aptos2022: r2(media(p.map((o) => o.x.aptos))), aptos2026: r2(media(p.map((o) => o.y.aptos))), ge95em2026: p.filter((o) => ge95(o.y)).length, mesmoLocal: p.filter((o) => o.y.local === o.x.local).length }; };
    const g = (a) => a.filter(ge95);
    const N26 = par(N).map((o) => ({ ...o.y, k: o.x.k, origem: o.x })); const A26 = par(A).map((o) => ({ ...o.y, k: o.x.k, origem: o.x }));
    const r = { novas: res(N), antigas: res(A), novasGe95: res(g(N)), antigasGe95: res(g(A)),
      excesso2022: padroniza(N, A), excesso2026mesmas: padroniza(N26, A26),
      excesso2022porLocal: padroniza(N, A, catLocal), excesso2026mesmasPorLocal2022: padroniza(N26, A26, (y) => catLocal(y.origem)) };
    // regressão à média: Δ por faixa de comparecimento de 2022, novas × antigas
    const fx = (x) => { const q = 100 * x.comp / x.aptos; return q < 70 ? '<70' : q < 80 ? '70-80' : q < 85 ? '80-85' : q < 90 ? '85-90' : q < 95 ? '90-95' : '95+'; };
    const porFaixa = {};
    for (const [nome, a] of [['novas', N], ['antigas', A]]) for (const o of par(a)) { const f = fx(o.x); const v = ((porFaixa[f] ??= {})[nome] ??= []); v.push(100 * (o.y.comp / o.y.aptos - o.x.comp / o.x.aptos)); }
    r.deltaPorFaixa2022 = Object.fromEntries(Object.entries(porFaixa).map(([f, v]) => [f, { novas: v.novas ? [v.novas.length, r2(media(v.novas))] : null, antigas: v.antigas ? [v.antigas.length, r2(media(v.antigas))] : null }]));
    // modelo nas antigas com 90%+ em 2022: Δ = a + b·taxa2022 + c/√aptos2022 (+ d·ln(aptos2026/aptos2022)); previsto para as novas com 95%+
    const ant = par(A).filter((o) => o.x.comp * 100 >= 90 * o.x.aptos);
    const X1 = (o) => [1, 100 * o.x.comp / o.x.aptos, 1 / Math.sqrt(o.x.aptos)];
    const X2 = (o) => [...X1(o), Math.log(o.y.aptos / o.x.aptos)];
    const yv = ant.map((o) => 100 * (o.y.comp / o.y.aptos - o.x.comp / o.x.aptos));
    const nov = par(g(N));
    const prev = (X) => { const b = mq(ant.map(X), yv); return { coef: b.map((v) => +v.toFixed(3)), previstoNovasGe95: r2(media(nov.map((o) => X(o).reduce((s, v, i) => s + v * b[i], 0)))) }; };
    r.regressaoMedia = { antigasUsadas: ant.length, observadoNovasGe95: r2(media(nov.map((o) => 100 * (o.y.comp / o.y.aptos - o.x.comp / o.x.aptos)))), semCrescimento: prev(X1), comCrescimento: prev(X2) };
    R[`A_${t}t_${nomeFonte}`] = r;
  }
}
log('A ok');

// ---------- B. onde está o excesso; decomposição em duas ordens
for (const t of [2, 1]) {
  const P22 = padroniza(L22[t].filter((x) => x.nova), L22[t].filter((x) => !x.nova), catLocal);
  for (const [nomeFonte, L] of [['detalhe2026', L26[t]], ['bu2026', L26bu[t]]]) {
    const N = L.filter((x) => x.nova); const A = L.filter((x) => !x.nova);
    const P26 = padroniza(N, A, catLocal);
    const tot = (P) => Object.values(P).reduce((s, o) => s + (o.obs - o.esp), 0);
    // shift-share do "local novo": volume (nº de novas) × taxa de excesso por nova
    const n0 = P22['local novo'].novas; const e0 = P22['local novo'].exc / n0; const n1 = P26['local novo'].novas; const e1 = P26['local novo'].exc / n1;
    const ordemDoc = { volume: r2((n1 - n0) * e0), taxa: r2((e1 - e0) * n1) };
    const ordemInversa = { taxa: r2((e1 - e0) * n0), volume: r2((n1 - n0) * e1) };
    const r = { excesso2022: r2(tot(P22)), excesso2026: r2(tot(P26)), diferenca: r2(tot(P26) - tot(P22)), porLocal2022: P22, porLocal2026: P26,
      localNovo: { ordemDoc, ordemInversa, media: { volume: r2((ordemDoc.volume + ordemInversa.volume) / 2), taxa: r2((ordemDoc.taxa + ordemInversa.taxa) / 2) } },
      localExistente: r2(P26['local existente'].exc - P22['local existente'].exc), zonaNova: r2(P26['zona nova'].exc - P22['zona nova'].exc) };
    if (nomeFonte === 'bu2026') {
      // TTE exato do BU: categorias
      r.porTTEexato = padroniza(N, A, (x) => `${catLocal(x)} | ${x.tte === 0 ? 'sem TTE' : x.tte <= 3 ? 'TTE 1-3' : 'TTE 4+'}`);
      const s0 = (a) => a.filter((x) => x.tte === 0);
      r.semTTEexato = padroniza(s0(N), s0(A), catLocal);
      // liberação sem digital (ano de nascimento + dado digitado) por grupo, 95%+ ou não
      const lib = (a) => { const c = a.reduce((s, x) => s + x.comp, 0); return { secoes: a.length, votantes: c, pctAno: r2(100 * a.reduce((s, x) => s + x.ano, 0) / c), pctDado: r2(100 * a.reduce((s, x) => s + x.dado, 0) / c) }; };
      r.liberacao = { novasGe95: lib(N.filter(ge95)), antigasGe95: lib(A.filter(ge95)), novasMenos95: lib(N.filter((x) => !ge95(x))), antigasMenos95: lib(A.filter((x) => !ge95(x))) };
    }
    R[`B_${t}t_${nomeFonte}`] = r;
  }
}
log('B ok');
// soma de aptos e comparecimento 2022 (para comparar com o perfil de 2022)
R.somas = { aptos2022_1t: [...d22.t[1].values()].reduce((s, v) => s + v.aptos, 0), aptos2022_2t: [...d22.t[2].values()].reduce((s, v) => s + v.aptos, 0), aptos2026_2t_det: [...d26.t[2].values()].reduce((s, v) => s + v.aptos, 0) };

// ---------- saídas por seção para o cruzamento com o perfil
await mkdir(DIR_50, { recursive: true });
const s22 = ['turno\tchave\taptos\tcomp\tnova\tlocal\tlocal_novo\tzona_nova'];
for (const t of [1, 2]) for (const x of L22[t]) s22.push([t, x.k, x.aptos, x.comp, +x.nova, x.local, +x.localNovo, +x.zonaNova].join('\t'));
const s26 = ['turno\tchave\taptos\tcomp\tnova\tlocal\tlocal_novo\tzona_nova\ttte\tano\tdado\tbio'];
for (const t of [1, 2]) for (const x of L26bu[t]) s26.push([t, x.k, x.aptos, x.comp, +x.nova, x.local, +x.localNovo, +x.zonaNova, x.tte, x.ano, x.dado, x.bio].join('\t'));
await writeFile(path.join(DIR_50, 'secoes-2022.tsv'), `${s22.join('\n')}\n`);
await writeFile(path.join(DIR_50, 'secoes-2026.tsv'), `${s26.join('\n')}\n`);
await writeFile(path.join(DIR_50, 'agregadas.tsv'), `${agreg.join('\n')}\n`);
await writeFile(path.join(DIR_50, 'novas-resumo.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
