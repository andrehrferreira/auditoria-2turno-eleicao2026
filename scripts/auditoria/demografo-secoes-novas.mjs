// Demógrafo (H01 × H27, parecer cético 38 item 5): seções novas com comparecimento de 95% ou mais.
// Hipótese do parecer: a seção nova não carrega eleitor morto ou que se mudou sem transferir o título ("peso morto" do
// cadastro), por isso o teto de comparecimento dela é maior. Este script testa isso, em agregado e sem CPF:
//   0. reprodução: "nova" = chave UF/município/zona/seção ausente do CEFT do 1º turno de 2022, ou (fora de DF e exterior)
//      ausente do CEFT do 1º turno de 2024 (mesma definição do parecer 38); aptos do BU (secao_eleicao), comparecimento
//      do BU (secao), só seções com pacote completo e fora do Sistema de Apuração;
//   1. perfil do cadastro (perfil do eleitorado por seção, jul/2026, somando as agregadas na principal): % sem biometria,
//      % por faixa de idade, novas × antigas;
//   2. mesmo local de votação (2026): locais com seções novas e antigas; comparecimento das novas e das antigas em 2026 e
//      das mesmas antigas em 2022 (detalhe_votacao_secao_2022, Presidente, mesmo turno);
//   3. regressão com efeito fixo de local (ponderada por aptos, erro-padrão agrupado por local): comparecimento ~ nova,
//      e ~ nova + parcela sem biometria por faixa + parcela por faixa de idade; decomposição da diferença nova − antiga
//      nos locais mistos em "explicada pelo perfil" e "resto";
//   4. linha de base histórica: o mesmo fenômeno em 2022 ("nova em 2022" = ausente do detalhe de 2018 ou, fora de DF e
//      exterior, de 2020), e o que aconteceu com essas seções em 2026 (o cadastro delas envelheceu?).
// Pré-requisitos: demografo-baixar-tse.mjs (detalhe 2018/2020/2022), seguranca-h27-baixar.mjs (CEFT 2022/2024),
// demografo-perfil.mjs (data/parsed/auditoria/demografo/perfil/*.tsv).
//   5. cauda: seções com 95% ou mais observadas × esperadas por binomial com a taxa das antigas do mesmo local.
// Saídas: data/parsed/auditoria/demografo/novas-{resumo.json,locais-2t.tsv,ge95-2t.tsv}
// Uso: node --max-old-space-size=6000 scripts/auditoria/demografo-secoes-novas.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { entradasZip, linhasBrutas } from './contagem-zip.mjs';
import { linhasZip } from './seguranca-h27-lib.mjs';

const OUT = path.join(DIR_DADOS, 'parsed', 'auditoria', 'demografo');
const DA = path.join(DIR_DADOS, 'raw', 'dadosabertos');
const p4 = (x) => String(Number(x)).padStart(4, '0');
const p5 = (x) => String(Number(x)).padStart(5, '0');
const K = (uf, m, z, s) => `${uf.toLowerCase()}/${p5(m)}/${p4(z)}/${p4(s)}`;
const pct = (a, b) => (b ? +(100 * a / b).toFixed(3) : null);
const r4 = (x) => (x === null || !Number.isFinite(x) ? null : +x.toFixed(4));
const log = (...a) => console.error(new Date().toISOString().slice(11, 19), ...a);

// ---------- CEFT 2022 e 2024 (definição de "nova" do parecer 38) e locais de 2022
async function ceft(pasta) {
  const s = new Set(); const local = new Map();
  for (const n of readdirSync(path.join(DA, 'correspondencias', pasta)).filter((x) => x.startsWith('CEFT_'))) {
    for await (const r of linhasZip(path.join(DA, 'correspondencias', pasta, n))) {
      const k = K(r.SG_UF, r.CD_MUNICIPIO, r.NR_ZONA, r.NR_SECAO);
      s.add(k);
      if (r.NR_LOCAL_VOTACAO) local.set(k, Number(r.NR_LOCAL_VOTACAO));
    }
  }
  return { s, local };
}
// ---------- detalhe_votacao_secao de um ano: Presidente (CD_CARGO 1) por turno, ou só o conjunto de seções
async function detalhe(ano, { soChaves = false } = {}) {
  const zip = path.join(DA, 'detalhe_votacao_secao', `detalhe_votacao_secao_${ano}.zip`);
  const ents = (await entradasZip(zip)).filter((e) => e.nome.toLowerCase().endsWith('.csv'));
  const br = ents.filter((e) => /_BR\.csv$/i.test(e.nome));
  const usar = br.length ? br : ents.filter((e) => !/BRASIL/i.test(e.nome));
  const chaves = new Set(); const t = { 1: new Map(), 2: new Map() };
  let cab = null; let linhas = 0;
  for (const e of usar) {
    let col = null;
    for await (const c of linhasBrutas(zip, e)) {
      if (!col) { col = Object.fromEntries(c.map((n, i) => [n, i])); cab ??= c; continue; }
      linhas++;
      const k = K(c[col.SG_UF], c[col.CD_MUNICIPIO], c[col.NR_ZONA], c[col.NR_SECAO]);
      chaves.add(k);
      if (soChaves || c[col.CD_CARGO] !== '1') continue;
      const m = t[c[col.NR_TURNO]]; if (!m) continue;
      const v = m.get(k) ?? m.set(k, { aptos: 0, comp: 0 }).get(k);
      v.aptos += Number(c[col.QT_APTOS]); v.comp += Number(c[col.QT_COMPARECIMENTO]);
    }
  }
  return { chaves, t, cab, linhas, entradas: usar.map((e) => e.nome) };
}

log('CEFT 2022/2024');
const c22 = await ceft('2022-1t');
const c24 = await ceft('2024-1t');
log('detalhe 2022');
const d22 = await detalhe(2022);
log('detalhe 2020 e 2018 (só as chaves)');
const d20 = await detalhe(2020, { soChaves: true });
const d18 = await detalhe(2018, { soChaves: true });
const fora = (k) => k.startsWith('zz/') || k.startsWith('df/');
const nova26 = (k) => !c22.s.has(k) || (!fora(k) && !c24.s.has(k));
const nova22 = (k) => !d18.chaves.has(k) || (!fora(k) && !d20.chaves.has(k));

// ---------- perfil do eleitorado (jul/2026) por seção
log('perfil');
const FX = ['f16_17', 'f18_69', 'f70_79', 'f80_89', 'f90_99', 'f100', 'invalida'];
const perfil = new Map();
for (const f of readdirSync(path.join(OUT, 'perfil'))) {
  const L = readFileSync(path.join(OUT, 'perfil', f), 'utf8').trimEnd().split('\n');
  const col = L[0].split('\t');
  for (const l of L.slice(1)) {
    const c = l.split('\t'); const o = {};
    for (let i = 4; i < col.length; i++) o[col[i]] = Number(c[i]);
    perfil.set(K(c[0], c[1], c[2], c[3]), o);
  }
}

// faixas finas (18–20, 60–69) do mesmo perfil, já resumidas por seção em biometria/cadastro-secao.jsonl
const finas = new Map();
for (const l of readFileSync(path.join(DIR_DADOS, 'parsed', 'auditoria', 'biometria', 'cadastro-secao.jsonl'), 'utf8').split('\n')) {
  if (!l) continue; const o = JSON.parse(l);
  finas.set(o.k, { f18_20: o.faixas?.['18a20'] ?? 0, f60_69: o.faixas?.['60a69'] ?? 0, total: o.eleitores });
}

// tipo do local de votação (eleitorado_local_votacao_2026, por turno e seção): tipo oficial e classe pelo nome do local
const tipoLocal = { 1: new Map(), 2: new Map() };
const classeNome = (n) => (/ALDEIA|IND[IÍ]GENA|\bTI\b|POVO /.test(n) ? 'indígena' : /QUILOMB/.test(n) ? 'quilombola' : /ASSENTAMENTO|\bPA\b|AGROVILA/.test(n) ? 'assentamento' : /PRISIONAL|PENITENCI|PRES[IÍ]DIO|CADEIA|SOCIOEDUC|CDP|INTERNA[CÇ][AÃ]O|DETEN[CÇ]/.test(n) ? 'prisional/internação' : /HOSPITAL/.test(n) ? 'hospital' : 'outro');
{
  const zip = path.join(DA, 'eleitorado_locais_votacao', 'eleitorado_local_votacao_2026.zip');
  const e = (await entradasZip(zip)).find((x) => /BRASIL\.csv$/i.test(x.nome));
  let col = null;
  for await (const c of linhasBrutas(zip, e)) {
    if (!col) { col = Object.fromEntries(c.map((n, i) => [n, i])); continue; }
    const m = tipoLocal[c[col.NR_TURNO]]; if (!m) continue;
    m.set(K(c[col.SG_UF], c[col.CD_MUNICIPIO], c[col.NR_ZONA], c[col.NR_SECAO]), { tipo: c[col.DS_TIPO_LOCAL], classe: classeNome(c[col.NM_LOCAL_VOTACAO].normalize('NFC').toUpperCase()), localidade: c[col.DS_SITU_LOCALIDADE] });
  }
}

// ---------- banco (cópia de leitura): seções de 2026
log('banco');
const { db } = await abrirLeitura();
const S = { 1: new Map(), 2: new Map() };
const excl = { 1: { semArquivo: 0, sa: 0 }, 2: { semArquivo: 0, sa: 0 } };
for (const r of db.prepare('SELECT turno, uf, municipio, zona, secao, local, situacao, tipo_arquivo, comparecimento, por_biometria FROM secao').iterate()) {
  if (r.situacao !== 'completa') { excl[r.turno].semArquivo++; continue; }
  if (/^sa/.test(r.tipo_arquivo)) { excl[r.turno].sa++; continue; }
  S[r.turno].set(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, { local: `${r.uf}/${r.municipio}/${r.zona}/${r.local}`, comp: r.comparecimento, bio: r.por_biometria, aptos: 0, tte: 0 });
}
for (const r of db.prepare('SELECT turno, uf, municipio, zona, secao, aptos, aptos_tte FROM secao_eleicao WHERE eleicao IN (6257, 6258)').iterate()) {
  const x = S[r.turno].get(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`);
  if (x) { x.aptos = r.aptos; x.tte = r.aptos_tte ?? 0; }
}
// perfil somado na principal (agregadas de cada turno)
const membros = { 1: new Map(), 2: new Map() };
for (const r of db.prepare('SELECT turno, uf, municipio, zona, secao, secao_principal FROM secao_agregada').iterate()) {
  const p = `${r.uf}/${r.municipio}/${r.zona}/${r.secao_principal}`;
  (membros[r.turno].get(p) ?? membros[r.turno].set(p, []).get(p)).push(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`);
}
for (const t of [1, 2]) {
  for (const [k, x] of S[t]) {
    const ks = [k, ...(membros[t].get(k) ?? [])];
    let p = null;
    for (const m of ks) { const q = perfil.get(m); if (!q) continue; p ??= Object.fromEntries(Object.keys(q).map((c) => [c, 0])); for (const c in q) p[c] += q[c]; }
    x.perfil = p; x.agregada = ks.length > 1;
    if (p) { let a = 0; let b = 0; for (const m of ks) { const q = finas.get(m); if (q) { a += q.f18_20; b += q.f60_69; } } p.f18_20 = a; p.f60_69 = b; }
    x.nova = nova26(k);
  }
}

// ---------- utilidades estatísticas
function agrega(it) {
  const a = { secoes: 0, aptos: 0, comp: 0, ge95: 0, cadastro: 0, semBio: 0, porBio: 0 };
  for (const f of FX) a[f] = 0;
  for (const x of it) {
    a.secoes++; a.aptos += x.aptos; a.comp += x.comp; if (x.comp / x.aptos >= 0.95) a.ge95++;
    a.porBio += x.bio ?? 0;
    if (x.perfil) { a.cadastro += x.perfil.total; a.semBio += x.perfil.total - x.perfil.biometria; for (const f of FX) a[f] += x.perfil[f]; }
  }
  return {
    secoes: a.secoes, aptos: a.aptos, comparecimento: a.comp, taxaComparecimento: pct(a.comp, a.aptos), secoesGe95: a.ge95, pctSecoesGe95: pct(a.ge95, a.secoes),
    aptosMedios: a.secoes ? +(a.aptos / a.secoes).toFixed(1) : null,
    cadastro: a.cadastro, pctSemBiometria: pct(a.semBio, a.cadastro),
    pct70mais: pct(a.f70_79 + a.f80_89 + a.f90_99 + a.f100, a.cadastro), pct80mais: pct(a.f80_89 + a.f90_99 + a.f100, a.cadastro),
    pct90mais: pct(a.f90_99 + a.f100, a.cadastro), pct100: pct(a.f100, a.cadastro), pct16_17: pct(a.f16_17, a.cadastro),
    pctLiberadoSemDigital: pct(a.comp - a.porBio, a.comp),
  };
}
// log-gama (Lanczos), para a cauda binomial exata
function lgam(x) { const g = [676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]; if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgam(1 - x); x -= 1; let a = 0.99999999999980993; const t = x + 7.5; for (let i = 0; i < 8; i++) a += g[i] / (x + i + 1); return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a); }
// resolve A x = b (Gauss com pivô)
function resolver(A, b) {
  const n = b.length; const M = A.map((l, i) => [...l, b[i]]);
  for (let i = 0; i < n; i++) {
    let p = i; for (let j = i + 1; j < n; j++) if (Math.abs(M[j][i]) > Math.abs(M[p][i])) p = j;
    [M[i], M[p]] = [M[p], M[i]];
    if (Math.abs(M[i][i]) < 1e-14) throw new Error('matriz singular');
    for (let j = 0; j < n; j++) { if (j === i) continue; const f = M[j][i] / M[i][i]; for (let c = i; c <= n; c++) M[j][c] -= f * M[i][c]; }
  }
  return M.map((l, i) => l[n] / l[i]);
}
function inversa(A) { const n = A.length; return A.map((_, i) => resolver(A, A.map((__, j) => (j === i ? 1 : 0)))).reduce((I, col, j) => { col.forEach((v, i) => { I[i][j] = v; }); return I; }, A.map(() => Array(n).fill(0))); }
// WLS com efeito fixo de grupo (transformação within ponderada), EP agrupado por grupo (sanduíche CR0)
function efeitoFixo(obs, nomes) {
  const grupos = new Map();
  for (const o of obs) (grupos.get(o.g) ?? grupos.set(o.g, []).get(o.g)).push(o);
  const k = nomes.length; const XtX = Array.from({ length: k }, () => Array(k).fill(0)); const Xty = Array(k).fill(0);
  const dm = [];
  for (const [g, os] of grupos) {
    if (os.length < 2) continue;
    const W = os.reduce((s, o) => s + o.w, 0);
    const mx = nomes.map((_, j) => os.reduce((s, o) => s + o.w * o.x[j], 0) / W); const my = os.reduce((s, o) => s + o.w * o.y, 0) / W;
    for (const o of os) {
      const x = o.x.map((v, j) => v - mx[j]); const y = o.y - my;
      dm.push({ g, w: o.w, x, y });
      for (let a = 0; a < k; a++) { Xty[a] += o.w * x[a] * y; for (let b = 0; b < k; b++) XtX[a][b] += o.w * x[a] * x[b]; }
    }
  }
  const beta = resolver(XtX, Xty);
  const inv = inversa(XtX); const meat = Array.from({ length: k }, () => Array(k).fill(0)); const sg = new Map();
  for (const o of dm) {
    const e = o.y - o.x.reduce((s, v, j) => s + v * beta[j], 0);
    const v = sg.get(o.g) ?? sg.set(o.g, Array(k).fill(0)).get(o.g);
    for (let a = 0; a < k; a++) v[a] += o.w * o.x[a] * e;
  }
  for (const v of sg.values()) for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) meat[a][b] += v[a] * v[b];
  const V = inv.map((l) => l.map(() => 0));
  for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) { let s = 0; for (let c = 0; c < k; c++) for (let d = 0; d < k; d++) s += inv[a][c] * meat[c][d] * inv[d][b]; V[a][b] = s; }
  return { n: dm.length, grupos: sg.size, coef: Object.fromEntries(nomes.map((nm, j) => [nm, { b: r4(beta[j]), ep: r4(Math.sqrt(V[j][j])) }])), beta };
}

const R = { fontes: { detalhe2022: { entradas: d22.entradas, linhas: d22.linhas, cabecalho: d22.cab }, secoes2022: d22.chaves.size, secoes2020: d20.chaves.size, secoes2018: d18.chaves.size, ceft2022: c22.s.size, ceft2024: c24.s.size }, exclusoes: excl };
// conferência: CEFT 2022 × detalhe 2022 (mesmas seções?)
let soCeft = 0; let soDet = 0;
for (const k of c22.s) if (!d22.chaves.has(k)) soCeft++;
for (const k of d22.chaves) if (!c22.s.has(k)) soDet++;
R.fontes.ceft2022xDetalhe2022 = { soNoCeft: soCeft, soNoDetalhe: soDet };

const SH = ['f16_17', 'f70_79', 'f80_89', 'f90_99', 'f100'];
const locaisTsv = ['turno\tlocal\tnovas\tantigas\taptos_novas\tcomp_novas\taptos_antigas\tcomp_antigas\taptos_antigas_2022\tcomp_antigas_2022\tnovas_ge95\tantigas_ge95\tsembio_novas_pct\tsembio_antigas_pct\t80mais_novas_pct\t80mais_antigas_pct'];
for (const t of [1, 2]) {
  const r = {};
  const todas = [...S[t].entries()].filter(([, x]) => x.aptos > 0).map(([k, x]) => ({ k, ...x }));
  r.semAptos = S[t].size - todas.length;
  const N = todas.filter((x) => x.nova); const A = todas.filter((x) => !x.nova);
  // 0. reprodução e 1. perfil
  r.novas = agrega(N); r.antigas = agrega(A);
  r.novasGe95 = agrega(N.filter((x) => x.comp / x.aptos >= 0.95)); r.antigasGe95 = agrega(A.filter((x) => x.comp / x.aptos >= 0.95));
  r.semPerfil = { novas: N.filter((x) => !x.perfil).length, antigas: A.filter((x) => !x.perfil).length };
  // 2. locais mistos
  const porLocal = new Map();
  for (const x of todas) (porLocal.get(x.local) ?? porLocal.set(x.local, { n: [], a: [] }).get(x.local))[x.nova ? 'n' : 'a'].push(x);
  const mistos = [...porLocal.entries()].filter(([, v]) => v.n.length && v.a.length);
  const Nm = mistos.flatMap(([, v]) => v.n); const Am = mistos.flatMap(([, v]) => v.a);
  const A22 = Am.map((x) => ({ x, v: d22.t[t].get(x.k) })).filter((o) => o.v && o.v.aptos > 0);
  const tx = (a) => a.reduce((s, x) => s + x.comp, 0) / a.reduce((s, x) => s + x.aptos, 0);
  let difPos = 0; let difNeg = 0; const difs = [];
  for (const [loc, v] of mistos) {
    const tn = tx(v.n); const ta = tx(v.a); difs.push(tn - ta); if (tn > ta) difPos++; else if (tn < ta) difNeg++;
    if (t === 2) {
      const a22 = v.a.map((x) => d22.t[2].get(x.k)).filter((y) => y && y.aptos > 0);
      const pn = agrega(v.n); const pa = agrega(v.a);
      locaisTsv.push([t, loc, v.n.length, v.a.length, pn.aptos, pn.comparecimento, pa.aptos, pa.comparecimento, a22.reduce((s, y) => s + y.aptos, 0), a22.reduce((s, y) => s + y.comp, 0), pn.secoesGe95, pa.secoesGe95, pn.pctSemBiometria, pa.pctSemBiometria, pn.pct80mais, pa.pct80mais].join('\t'));
    }
  }
  difs.sort((a, b) => a - b);
  r.locaisMistos = {
    locais: mistos.length, novas: agrega(Nm), antigas: agrega(Am),
    antigasEm2022: { secoesComPar: A22.length, secoesSemPar: Am.length - A22.length, aptos2022: A22.reduce((s, o) => s + o.v.aptos, 0), comp2022: A22.reduce((s, o) => s + o.v.comp, 0), taxa2022: pct(A22.reduce((s, o) => s + o.v.comp, 0), A22.reduce((s, o) => s + o.v.aptos, 0)), ge95Em2022: A22.filter((o) => o.v.comp / o.v.aptos >= 0.95).length, taxa2026MesmasSecoes: pct(A22.reduce((s, o) => s + o.x.comp, 0), A22.reduce((s, o) => s + o.x.aptos, 0)) },
    diferencaNovaMenosAntigaPorLocal: { mediana: r4(difs[Math.floor(difs.length / 2)]), p25: r4(difs[Math.floor(difs.length / 4)]), p75: r4(difs[Math.floor(3 * difs.length / 4)]), locaisNovaMaior: difPos, locaisNovaMenor: difNeg },
  };
  // 2b. antigas, mesma seção 2022 × 2026, universo
  const par = A.map((x) => ({ x, v: d22.t[t].get(x.k) })).filter((o) => o.v && o.v.aptos > 0);
  r.antigasMesmaSecao2022 = {
    secoesComPar: par.length, semPar: A.length - par.length,
    taxa2022: pct(par.reduce((s, o) => s + o.v.comp, 0), par.reduce((s, o) => s + o.v.aptos, 0)), taxa2026: pct(par.reduce((s, o) => s + o.x.comp, 0), par.reduce((s, o) => s + o.x.aptos, 0)),
    aptos2022: par.reduce((s, o) => s + o.v.aptos, 0), aptos2026: par.reduce((s, o) => s + o.x.aptos, 0),
    ge95Em2022: par.filter((o) => o.v.comp / o.v.aptos >= 0.95).length, ge95Em2026: par.filter((o) => o.x.comp / o.x.aptos >= 0.95).length,
    ge95NosDois: par.filter((o) => o.v.comp / o.v.aptos >= 0.95 && o.x.comp / o.x.aptos >= 0.95).length,
  };
  // 3. efeito fixo de local: só seções sem TTE, com perfil, em locais com 2+ seções
  const obs = todas.filter((x) => x.tte === 0 && x.perfil && x.perfil.total > 0).map((x) => {
    const P = x.perfil; const T = P.total;
    const sb = (f) => (P[f] - 0) / T; const ssb = (f) => P[`sembio_${f}`] / T;
    return { g: x.local, w: x.aptos, y: x.comp / x.aptos, nova: x.nova ? 1 : 0, sh: SH.map(sb), sbf: ['f18_69', 'f70_79', 'f80_89', 'f90_99', 'f100'].map(ssb), fin: [P.f18_20 / T, P.f60_69 / T], lt: Math.log(x.aptos) };
  });
  const m0 = efeitoFixo(obs.map((o) => ({ g: o.g, w: o.w, y: o.y, x: [o.nova] })), ['nova']);
  const n1 = ['nova', ...SH.map((f) => `parcela_${f}`), 'semBio_18_69', 'semBio_70_79', 'semBio_80_89', 'semBio_90_99', 'semBio_100'];
  const m1 = efeitoFixo(obs.map((o) => ({ g: o.g, w: o.w, y: o.y, x: [o.nova, ...o.sh, ...o.sbf] })), n1);
  const m2 = efeitoFixo(obs.map((o) => ({ g: o.g, w: o.w, y: o.y, x: [o.nova, ...o.sh, ...o.sbf, o.lt] })), [...n1, 'log_aptos']);
  const m3 = efeitoFixo(obs.map((o) => ({ g: o.g, w: o.w, y: o.y, x: [o.nova, ...o.sh, ...o.sbf, ...o.fin, o.lt] })), [...n1, 'parcela_f18_20', 'parcela_f60_69', 'log_aptos']);
  const m1a = efeitoFixo(obs.filter((o) => !o.nova).map((o) => ({ g: o.g, w: o.w, y: o.y, x: [...o.sh, ...o.sbf] })), n1.slice(1));
  // decomposição nos locais mistos (seções do modelo): diferença bruta nova − antiga ponderada, parte do perfil com os coeficientes das antigas
  const mistosSet = new Set(mistos.map(([l]) => l));
  const om = obs.filter((o) => mistosSet.has(o.g));
  const media = (a, f) => a.reduce((s, o) => s + o.w * f(o), 0) / a.reduce((s, o) => s + o.w, 0);
  const on = om.filter((o) => o.nova); const oa = om.filter((o) => !o.nova);
  const xs = (o) => [...o.sh, ...o.sbf];
  const dx = xs(on[0] ?? oa[0]).map((_, j) => media(on, (o) => xs(o)[j]) - media(oa, (o) => xs(o)[j]));
  const explicada = dx.reduce((s, d, j) => s + d * m1a.beta[j], 0);
  r.efeitoFixoLocal = {
    observacoes: obs.length, excluidasTteOuSemPerfil: todas.length - obs.length,
    modelo0_soNova: m0, modelo1_novaMaisPerfil: m1, modelo2_maisTamanho: m2, modelo3_maisFaixasFinas: m3, modelo1a_soAntigas: m1a,
    decomposicaoLocaisMistos: {
      secoesNovas: on.length, secoesAntigas: oa.length,
      taxaNovas: r4(media(on, (o) => o.y)), taxaAntigas: r4(media(oa, (o) => o.y)), diferenca: r4(media(on, (o) => o.y) - media(oa, (o) => o.y)),
      explicadaPeloPerfil: r4(explicada), diferencaDeVariaveis: Object.fromEntries(n1.slice(1).map((nm, j) => [nm, r4(dx[j])])),
      nota: 'diferença ponderada por aptos sem efeito fixo; parte explicada = Σ (média nova − média antiga) × coeficiente das antigas com efeito fixo de local',
    },
  };
  // "peso morto" atribuível ao perfil: Σ coeficiente (antigas, efeito fixo) × média do grupo, só nas variáveis de cadastro
  // envelhecido (sem biometria em todas as faixas, 90–99 e 100+). Lido como pontos de comparecimento a menos.
  const pm = (a) => { const idx = n1.slice(1).map((nm, j) => [nm, j]).filter(([nm]) => /semBio|f90_99|f100/.test(nm)); return r4(idx.reduce((s, [, j]) => s + m1a.beta[j] * media(a, (o) => xs(o)[j]), 0)); };
  r.efeitoFixoLocal.pesoMortoAtribuivel = { antigasTodas: pm(obs.filter((o) => !o.nova)), novasTodas: pm(obs.filter((o) => o.nova)), antigasLocaisMistos: pm(oa), novasLocaisMistos: pm(on), variaveis: 'semBio_*, parcela_f90_99, parcela_f100; coeficientes do modelo1a_soAntigas' };
  // 5. cauda: seções com 95% ou mais esperadas por binomial, com a taxa das antigas do mesmo local (sem a própria seção)
  // P(a <= X <= b), X ~ Binomial(n, p)
  const faixaB = (n, p, a, b) => { a = Math.max(0, a); b = Math.min(n, b); if (a > b) return 0; if (p <= 0) return a === 0 ? 1 : 0; if (p >= 1) return b === n ? 1 : 0; let s = 0; for (let i = a; i <= b; i++) s += Math.exp(lgam(n + 1) - lgam(i + 1) - lgam(n - i + 1) + i * Math.log(p) + (n - i) * Math.log(1 - p)); return Math.min(1, s); };
  const caudaB = (n, p) => faixaB(n, p, Math.ceil(0.95 * n - 1e-9), n);
  // caudas simétricas em torno da taxa do local: 15 pontos acima e 15 abaixo; e a cauda fixa de baixo (menos de 60%)
  const caudas = Object.fromEntries(['novas', 'antigas', 'novasSemTTE', 'antigasSemTTE'].map((g) => [g, { acima15: [0, 0], abaixo15: [0, 0], abaixo60: [0, 0] }]));
  const cauda = Object.fromEntries(['novas', 'antigas', 'novasSemTTE', 'antigasSemTTE'].map((g) => [g, { secoes: 0, observadas: 0, esperadasBinomial: 0 }]));
  const lista95 = [];
  for (const [, v] of porLocal) {
    const A0 = v.a.reduce((s, x) => s + x.aptos, 0); const C0 = v.a.reduce((s, x) => s + x.comp, 0);
    for (const x of [...v.n, ...v.a]) {
      const A1 = x.nova ? A0 : A0 - x.aptos; const C1 = x.nova ? C0 : C0 - x.comp;
      if (A1 < 100) continue; // precisa de base: 100+ aptos nas outras seções antigas do local
      const ge = x.comp / x.aptos >= 0.95; const pb = caudaB(x.aptos, C1 / A1);
      const q = C1 / A1; const n = x.aptos; const tx = x.comp / n;
      const tq = [['acima15', tx >= q + 0.15, faixaB(n, q, Math.ceil((q + 0.15) * n - 1e-9), n)], ['abaixo15', tx <= q - 0.15, faixaB(n, q, 0, Math.floor((q - 0.15) * n + 1e-9))], ['abaixo60', tx < 0.6, faixaB(n, q, 0, Math.ceil(0.6 * n - 1e-9) - 1)]];
      for (const g of [x.nova ? 'novas' : 'antigas', ...(x.tte === 0 ? [x.nova ? 'novasSemTTE' : 'antigasSemTTE'] : [])]) for (const [nm, obsv, esp] of tq) { caudas[g][nm][0] += obsv ? 1 : 0; caudas[g][nm][1] += esp; }
      for (const g of [x.nova ? 'novas' : 'antigas', ...(x.tte === 0 ? [x.nova ? 'novasSemTTE' : 'antigasSemTTE'] : [])]) { const c = cauda[g]; c.secoes++; if (ge) c.observadas++; c.esperadasBinomial += pb; }
      if (ge && t === 2) lista95.push({ k: x.k, nova: x.nova, aptos: x.aptos, comp: x.comp, tte: x.tte, taxaAntigasDoLocal: r4(C1 / A1), semBio: x.perfil ? r4((x.perfil.total - x.perfil.biometria) / x.perfil.total) : null });
    }
  }
  for (const c of Object.values(cauda)) { c.esperadasBinomial = +c.esperadasBinomial.toFixed(2); c.razao = c.esperadasBinomial ? +(c.observadas / c.esperadasBinomial).toFixed(1) : null; }
  for (const g of Object.values(caudas)) for (const nm of Object.keys(g)) { const [o, e] = g[nm]; g[nm] = { observadas: o, esperadasBinomial: +e.toFixed(2), razao: e ? +(o / e).toFixed(1) : null }; }
  r.caudaPorLocal = { ...cauda, caudasSimetricas: caudas, criterio: 'seção cujo local tem 100+ aptos em OUTRAS seções antigas; esperado = soma de P(Binomial(aptos, taxa das outras antigas do local) >= 95%)' };
  const ge95 = todas.filter((x) => x.comp / x.aptos >= 0.95);
  const cont = (a, f) => a.reduce((m, x) => { const k = f(x); m[k] = (m[k] ?? 0) + 1; return m; }, {});
  const tam = (n) => (n < 50 ? '<50' : n < 100 ? '50-99' : n < 200 ? '100-199' : n < 300 ? '200-299' : '300+');
  r.ge95Perfil = {
    novas: { porTamanho: cont(ge95.filter((x) => x.nova), (x) => tam(x.aptos)), comTTE: ge95.filter((x) => x.nova && x.tte > 0).length, semBioZero: ge95.filter((x) => x.nova && x.perfil && x.perfil.total === x.perfil.biometria).length, porUF: cont(ge95.filter((x) => x.nova), (x) => x.k.slice(0, 2)), emLocalMisto: ge95.filter((x) => x.nova && porLocal.get(x.local).a.length > 0).length },
    antigas: { porTamanho: cont(ge95.filter((x) => !x.nova), (x) => tam(x.aptos)), comTTE: ge95.filter((x) => !x.nova && x.tte > 0).length, semBioZero: ge95.filter((x) => !x.nova && x.perfil && x.perfil.total === x.perfil.biometria).length, porUF: cont(ge95.filter((x) => !x.nova), (x) => x.k.slice(0, 2)) },
    todasPorTamanho: { novas: cont(N, (x) => tam(x.aptos)), antigas: cont(A, (x) => tam(x.aptos)) },
    semBioZeroTodas: { novas: N.filter((x) => x.perfil && x.perfil.total === x.perfil.biometria).length, novasGe95: ge95.filter((x) => x.nova && x.perfil && x.perfil.total === x.perfil.biometria).length, antigas: A.filter((x) => x.perfil && x.perfil.total === x.perfil.biometria).length, antigasGe95: ge95.filter((x) => !x.nova && x.perfil && x.perfil.total === x.perfil.biometria).length },
    semTTE: { novas: N.filter((x) => x.tte === 0).length, novasGe95: ge95.filter((x) => x.nova && x.tte === 0).length, antigas: A.filter((x) => x.tte === 0).length, antigasGe95: ge95.filter((x) => !x.nova && x.tte === 0).length },
    tteNasNovasGe95: { aptos: ge95.filter((x) => x.nova).reduce((s, x) => s + x.aptos, 0), aptosTte: ge95.filter((x) => x.nova).reduce((s, x) => s + x.tte, 0), maioriaTTE: ge95.filter((x) => x.nova && x.tte / x.aptos > 0.5).length },
    tteNasAntigasGe95: { aptos: ge95.filter((x) => !x.nova).reduce((s, x) => s + x.aptos, 0), aptosTte: ge95.filter((x) => !x.nova).reduce((s, x) => s + x.tte, 0) },
    tteTodas: { novasComTTE: N.filter((x) => x.tte > 0).length, antigasComTTE: A.filter((x) => x.tte > 0).length, aptosTteNovas: N.reduce((s, x) => s + x.tte, 0), aptosTteAntigas: A.reduce((s, x) => s + x.tte, 0) },
    tipoLocal: Object.fromEntries([['novas', N], ['antigas', A], ['novasGe95', ge95.filter((x) => x.nova)], ['antigasGe95', ge95.filter((x) => !x.nova)]].map(([g, a]) => [g, { tipo: cont(a, (x) => tipoLocal[t].get(x.k)?.tipo ?? 'sem registro'), classePeloNome: cont(a, (x) => tipoLocal[t].get(x.k)?.classe ?? 'sem registro') }])),
    dispersao: { novasAbaixo60: N.filter((x) => x.comp / x.aptos < 0.6).length, antigasAbaixo60: A.filter((x) => x.comp / x.aptos < 0.6).length },
  };
  if (t === 2) await writeFile(path.join(OUT, 'novas-ge95-2t.tsv'), `k\tnova\taptos\tcomp\ttte\ttaxa_antigas_local\tsem_bio\n${lista95.map((o) => [o.k, o.nova ? 1 : 0, o.aptos, o.comp, o.tte, o.taxaAntigasDoLocal, o.semBio].join('\t')).join('\n')}\n`);
  R[`${t}t`] = r;
  log(`turno ${t} ok`);
}

// ---------- 4. análogo histórico: seções novas em 2022
for (const t of [1, 2]) {
  const loc22 = (k) => (c22.local.has(k) ? `${k.split('/').slice(0, 3).join('/')}/${c22.local.get(k)}` : null);
  const L = [...d22.t[t].entries()].filter(([, v]) => v.aptos > 0).map(([k, v]) => ({ k, ...v, nova: nova22(k), local: loc22(k) }));
  const ag = (a) => ({ secoes: a.length, aptos: a.reduce((s, x) => s + x.aptos, 0), comp: a.reduce((s, x) => s + x.comp, 0), taxa: pct(a.reduce((s, x) => s + x.comp, 0), a.reduce((s, x) => s + x.aptos, 0)), ge95: a.filter((x) => x.comp / x.aptos >= 0.95).length, pctGe95: pct(a.filter((x) => x.comp / x.aptos >= 0.95).length, a.length), aptosMedios: a.length ? +(a.reduce((s, x) => s + x.aptos, 0) / a.length).toFixed(1) : null });
  const N = L.filter((x) => x.nova); const A = L.filter((x) => !x.nova);
  const pl = new Map(); for (const x of L) if (x.local) (pl.get(x.local) ?? pl.set(x.local, { n: [], a: [] }).get(x.local))[x.nova ? 'n' : 'a'].push(x);
  const mis = [...pl.values()].filter((v) => v.n.length && v.a.length);
  // as mesmas seções em 2026 (mesma chave), mesmo turno
  const em26 = (a) => a.map((x) => S[t].get(x.k)).filter((y) => y && y.aptos > 0);
  const ag26 = (a) => ({ secoes: a.length, taxa: pct(a.reduce((s, y) => s + y.comp, 0), a.reduce((s, y) => s + y.aptos, 0)), ge95: a.filter((y) => y.comp / y.aptos >= 0.95).length, pctGe95: pct(a.filter((y) => y.comp / y.aptos >= 0.95).length, a.length), pctSemBiometria: agrega(a).pctSemBiometria, pct80mais: agrega(a).pct80mais });
  R[`historico2022_${t}t`] = {
    definicao: 'nova em 2022 = ausente do detalhe_votacao_secao de 2018 ou (fora de DF e exterior) de 2020',
    novas2022: ag(N), antigas2022: ag(A), razaoBrutaGe95: N.length && A.length ? +((N.filter((x) => x.comp / x.aptos >= 0.95).length / N.length) / (A.filter((x) => x.comp / x.aptos >= 0.95).length / A.length)).toFixed(1) : null,
    locaisMistos2022: { locais: mis.length, novas: ag(mis.flatMap((v) => v.n)), antigas: ag(mis.flatMap((v) => v.a)) },
    semLocalNoCeft: L.filter((x) => !x.local).length,
    em2026: { novasDe2022: ag26(em26(N)), antigasDe2022: ag26(em26(A)) },
  };
}
await writeFile(path.join(OUT, 'novas-resumo.json'), JSON.stringify(R, null, 1));
await writeFile(path.join(OUT, 'novas-locais-2t.tsv'), `${locaisTsv.join('\n')}\n`);
console.log(JSON.stringify(R, null, 1));
