// Revisor cético, H13 (lente: confusão e falácia ecológica). Nordeste, presidente, 2º turno (e 1º turno como base).
// Pergunta: a diferença condicional "liberados − biométricos" do método 03 (docs/analysis/hipotese-liberacao-mesario/03)
// sobrevive a controles que os autores NÃO usaram? E a queda de M1 (+9,3) para M2 (−0,5) é confusão real ou
// supercontrole?
//
// Controles novos (lidos do perfil bruto do TSE, perfil_eleitor_secao_2026_<UF>.zip):
//   gênero (% feminino), estado civil (% viúvo, % casado), idade fina (% 70+, % 80+), % analfabeto, % com deficiência,
//   raça (% raça informada, % preta ou parda), e o perfil do PRÓPRIO grupo de risco:
//   % com biometria e 70+ (quem pode falhar na digital), % sem biometria e 60+, % sem biometria e escolaridade baixa.
//   Modelo da urna (UE2013, UE2015, UE2020; referência UE2022) do BU.
//   Efeito fixo de LOCAL DE VOTAÇÃO (mesma escola), mais fino que o de zona.
// Teste de controle negativo (variável instrumental): o modelo antigo de urna (UE2013/UE2015) aumenta a liberação por
//   motivo técnico. Se a liberação não muda o voto (H0), a forma reduzida "urna antiga → margem" é zero na mesma zona.
//   Equilíbrio: a urna antiga não deve prever o perfil do eleitorado dentro da zona.
// Diagnóstico ecológico: parcela implícita dos liberados por seção fora de [0, 1] e fora dos limites determinísticos
//   da própria seção (max(0, v13 − (n − G)) / G a min(v13, G) / G).
// Modelo (igual ao do método 03): v_c/n = α_FE + Σ_g d_{c,g}·G_g/n + γ'X + erro, mínimos quadrados ponderados por n;
//   parcela do grupo e difCond calculadas como em liberacao-ecologico-regressao.mjs.
// Incerteza: bootstrap por município (FE de zona e de local ficam dentro do município), semente 2026.
// Uso: node --max-old-space-size=8000 scripts/auditoria/cetico-liberacao-confusao.mjs [--reps 300] [--semente 2026]
// Saída: data/parsed/auditoria/liberacao/cetico-confusao.json
import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { categoria, dividirCsv, linhasZip, pad } from './forense-lib.mjs';

const { values } = parseArgs({ options: { reps: { type: 'string', default: '300' }, semente: { type: 'string', default: '2026' } } });
const REPS = Number(values.reps);
const NE = ['al', 'ba', 'ce', 'ma', 'pb', 'pe', 'pi', 'rn', 'se'];
const DIR_SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'liberacao');
const DIR_PERFIL = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'perfil_eleitor_secao');
const LOCAIS = path.join(DIR_DADOS, 'parsed', 'auditoria', 'forense', 'locais.csv');
const inicio = Date.now();
const log = (m) => console.error(`[${((Date.now() - inicio) / 1000).toFixed(0)}s] ${m}`);

// ---------- perfil bruto ----------
const CAMPOS = ['eleitores', 'biometria', 'idade60', 'idade16a24', 'escol_baixa', 'superior', 'indigena', 'quilombola',
  'fem', 'viuvo', 'casado', 'id70', 'id80', 'analf', 'defic', 'racaInf', 'pretaParda', 'bio70', 'sb60', 'sbBaixa'];

async function perfilUf(uf) {
  const arq = path.join(DIR_PERFIL, `perfil_eleitor_secao_2026_${uf.toUpperCase()}.zip`);
  const mapa = new Map();
  let idx = null; let ncol = 0;
  const tira = (v) => v.replaceAll('"', '');
  for await (const [, linha] of linhasZip(arq)) {
    if (!idx) {
      const cab = dividirCsv(linha).map(tira);
      ncol = cab.length;
      idx = Object.fromEntries(cab.map((c, i) => [c, i]));
      continue;
    }
    let c = linha.split(';');
    if (c.length !== ncol) c = dividirCsv(linha);
    const k = `${uf}/${pad(tira(c[idx.CD_MUNICIPIO]), 5)}/${pad(tira(c[idx.NR_ZONA]), 4)}/${pad(tira(c[idx.NR_SECAO]), 4)}`;
    let s = mapa.get(k);
    if (!s) { s = Object.fromEntries(CAMPOS.map((f) => [f, 0])); mapa.set(k, s); }
    const q = Number(tira(c[idx.QT_ELEITORES]));
    const qb = Number(tira(c[idx.QT_ELEITORES_BIOMETRIA]));
    const faixa = Number(tira(c[idx.CD_FAIXA_ETARIA]));
    const escol = Number(tira(c[idx.CD_GRAU_ESCOLARIDADE]));
    const raca = tira(c[idx.CD_RACA_COR]);
    const civil = tira(c[idx.CD_ESTADO_CIVIL]);
    s.eleitores += q; s.biometria += qb;
    if (faixa >= 6000) { s.idade60 += q; s.sb60 += q - qb; }
    if (faixa >= 1600 && faixa <= 2124) s.idade16a24 += q;
    if (faixa >= 7000) { s.id70 += q; s.bio70 += qb; }
    if (faixa >= 8000) s.id80 += q;
    if (escol >= 1 && escol <= 3) { s.escol_baixa += q; s.sbBaixa += q - qb; }
    if (escol === 1) s.analf += q;
    if (escol === 8) s.superior += q;
    if (raca === '4') s.indigena += q;
    if (raca !== '-1' && raca !== '') s.racaInf += q;
    if (raca === '2' || raca === '3') s.pretaParda += q;
    if (tira(c[idx.CD_QUILOMBOLA]) === '1') s.quilombola += q;
    if (tira(c[idx.CD_GENERO]) === '4') s.fem += q;
    if (civil === '5') s.viuvo += q;
    if (civil === '3') s.casado += q;
    s.defic += Number(tira(c[idx.QT_ELEITORES_DEFICIENCIA]));
  }
  return mapa;
}

async function carregarLocais() {
  const porTurno = { 1: new Map(), 2: new Map() };
  for await (const l of createInterface({ input: createReadStream(LOCAIS, 'utf8'), crlfDelay: Infinity })) {
    const c = l.split(';');
    if (c[0] !== '1' && c[0] !== '2') continue;
    porTurno[c[0]].set(`${c[1]}/${c[2]}/${c[3]}/${c[4]}`, { nome_local: c[7], tipo_local: c[8] });
  }
  return porTurno;
}

// ---------- variáveis ----------
// Vetor por seção: y13, y22, xL, xM, xO, controles..., velha (UE2013 ou UE2015)
const BASE = ['cadSemBio', 'p60', 'p16a24', 'pBaixa', 'pSup', 'pInd', 'pQuil', 'logEle', 'dInd', 'dQuil'];
const NOVOS = ['pFem', 'pViuvo', 'pCasado', 'p70', 'p80', 'pAnalf', 'pDef', 'pRacaInf', 'pPretaParda', 'pBio70', 'pSB60', 'pSBBaixa'];
const URNA = ['u13', 'u15', 'u20'];
const NOMES = ['y13', 'y22', 'xL', 'xM', 'xO', ...BASE, ...NOVOS, ...URNA, 'velha'];
const P = NOMES.length;
const I = Object.fromEntries(NOMES.map((n, i) => [n, i]));
const GRUPOS = ['B', 'L', 'M', 'O'];
const XRAW = ['xL', 'xM', 'xO'];

function vetor(s, pf, cat) {
  const e = pf.eleitores;
  const v = new Float64Array(P);
  v[I.y13] = s.v13 / s.n; v[I.y22] = s.v22 / s.n;
  v[I.xL] = s.L2 / s.n; v[I.xM] = s.M / s.n; v[I.xO] = (s.L2 - s.M) / s.n;
  const X = {
    cadSemBio: 1 - pf.biometria / e, p60: pf.idade60 / e, p16a24: pf.idade16a24 / e, pBaixa: pf.escol_baixa / e, pSup: pf.superior / e,
    pInd: pf.indigena / e, pQuil: pf.quilombola / e, logEle: Math.log(e), dInd: cat === 'indigena' ? 1 : 0, dQuil: cat === 'quilombola' ? 1 : 0,
    pFem: pf.fem / e, pViuvo: pf.viuvo / e, pCasado: pf.casado / e, p70: pf.id70 / e, p80: pf.id80 / e, pAnalf: pf.analf / e,
    pDef: pf.defic / e, pRacaInf: pf.racaInf / e, pPretaParda: pf.pretaParda / e, pBio70: pf.bio70 / e, pSB60: pf.sb60 / e, pSBBaixa: pf.sbBaixa / e,
    u13: s.modelo === 'ue2013' ? 1 : 0, u15: s.modelo === 'ue2015' ? 1 : 0, u20: s.modelo === 'ue2020' ? 1 : 0,
    velha: s.modelo === 'ue2013' || s.modelo === 'ue2015' ? 1 : 0,
  };
  for (const [k, val] of Object.entries(X)) v[I[k]] = val;
  return v;
}

async function carregarTurno(db, turno, perfil, locais) {
  const lista = NE.map((u) => `'${u}'`).join(',');
  const principal = new Map();
  for (const a of db.prepare(`SELECT uf, municipio, zona, secao, secao_principal FROM secao_agregada WHERE turno = ? AND uf IN (${lista})`).all(turno)) {
    principal.set(`${a.uf}/${a.municipio}/${a.zona}/${a.secao}`, `${a.uf}/${a.municipio}/${a.zona}/${a.secao_principal}`);
  }
  const perfilSecao = new Map();
  for (const [k, p] of perfil) {
    const kp = principal.get(k) ?? k;
    let s = perfilSecao.get(kp);
    if (!s) { s = Object.fromEntries(CAMPOS.map((f) => [f, 0])); perfilSecao.set(kp, s); }
    for (const c of CAMPOS) s[c] += p[c];
  }
  const votos = new Map();
  for (const v of db.prepare(`SELECT uf, municipio, zona, secao, numero, quantidade FROM voto_bu WHERE turno = ? AND cargo = 1 AND tipo_voto = 'nominal' AND numero IN (13, 22) AND uf IN (${lista})`).all(turno)) {
    const k = `${v.uf}/${v.municipio}/${v.zona}/${v.secao}`;
    const r = votos.get(k) ?? { v13: 0, v22: 0 };
    if (v.numero === 13) r.v13 += v.quantidade; else r.v22 += v.quantidade;
    votos.set(k, r);
  }
  const linhas = db.prepare(`SELECT s.uf, s.municipio, s.zona, s.secao, s.local, s.modelo_urna modelo, s.comparecimento n, s.sem_biometria sb,
      s.por_biometria pb, s.por_biografia pbg, p.habilitados_pelo_mesario mes
    FROM secao s LEFT JOIN perfil_log p ON p.turno = s.turno AND p.uf = s.uf AND p.municipio = s.municipio AND p.zona = s.zona AND p.secao = s.secao
    WHERE s.turno = ? AND s.situacao = 'completa' AND s.uf IN (${lista})`).all(turno);
  const descarte = { lidas: linhas.length, semDetalhamento: 0, menos20: 0, semPerfil: 0, semVoto: 0, semL1: 0, l1Inconsistente: 0, semLocal: 0, modelos: {} };
  const secoes = [];
  for (const r of linhas) {
    const k = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
    if (r.sb == null || r.pb == null || r.pbg == null) { descarte.semDetalhamento++; continue; }
    if (r.n < 20) { descarte.menos20++; continue; }
    const pf = perfilSecao.get(k);
    if (!pf || pf.eleitores < 20) { descarte.semPerfil++; continue; }
    const v = votos.get(k);
    if (!v) { descarte.semVoto++; continue; }
    const L2 = r.sb + r.pbg;
    if (r.mes == null) { descarte.semL1++; continue; }
    if (r.mes > L2) { descarte.l1Inconsistente++; continue; }
    if (r.local == null) descarte.semLocal++;
    descarte.modelos[r.modelo] = (descarte.modelos[r.modelo] ?? 0) + 1;
    const loc = locais.get(k) ?? {};
    const cat = categoria({ uf: r.uf, nome_local: loc.nome_local, tipo_local: loc.tipo_local, pInd: pf.indigena / pf.eleitores, pQuil: pf.quilombola / pf.eleitores });
    const s = { k, uf: r.uf, mun: `${r.uf}/${r.municipio}`, zona: `${r.uf}/${r.municipio}/${r.zona}`, local: `${r.uf}/${r.municipio}/${r.zona}/L${r.local ?? 'x' + r.secao}`,
      n: r.n, B: r.pb, L2, M: r.mes, v13: v.v13, v22: v.v22, modelo: r.modelo };
    s.v = vetor(s, pf, cat);
    s.g = { B: r.pb, L: L2, M: r.mes, O: L2 - r.mes };
    secoes.push(s);
  }
  return { secoes, descarte };
}

// ---------- acumuladores (por município) ----------
// layout: XtWX (P²) | por grupo g: S, Σ G·ybar13, Σ G·ybar22, Σ G·Vd (P), Σ G·Vraw[xL,xM,xO] (3)
const TG = 3 + P + 3;
const TAM = P * P + GRUPOS.length * TG;

function montar(secoes, fe) {
  const medias = new Map();
  for (const s of secoes) {
    const key = s[fe];
    let m = medias.get(key);
    if (!m) { m = { w: 0, v: new Float64Array(P), n: 0 }; medias.set(key, m); }
    m.w += s.n; m.n++;
    for (let i = 0; i < P; i++) m.v[i] += s.n * s.v[i];
  }
  for (const m of medias.values()) for (let i = 0; i < P; i++) m.v[i] /= m.w;
  const porMun = new Map();
  const vd = new Float64Array(P);
  for (const s of secoes) {
    const m = medias.get(s[fe]);
    for (let i = 0; i < P; i++) vd[i] = s.v[i] - m.v[i];
    let a = porMun.get(s.mun);
    if (!a) { a = new Float64Array(TAM); porMun.set(s.mun, a); }
    const w = s.n;
    for (let i = 0; i < P; i++) { const wi = w * vd[i]; if (!wi) continue; for (let j = 0; j < P; j++) a[i * P + j] += wi * vd[j]; }
    let o = P * P;
    for (const g of GRUPOS) {
      const G = s.g[g];
      a[o] += G; a[o + 1] += G * m.v[I.y13]; a[o + 2] += G * m.v[I.y22];
      for (let i = 0; i < P; i++) a[o + 3 + i] += G * vd[i];
      for (let i = 0; i < 3; i++) a[o + 3 + P + i] += G * s.v[I[XRAW[i]]];
      o += TG;
    }
  }
  const singletons = [...medias.values()].filter((m) => m.n === 1).length;
  return { porMun, medias, grupos: medias.size, singletons };
}

function resolver(A, b, k) {
  const M = Array.from({ length: k }, (_, i) => [...A.slice(i * k, i * k + k), b[i]]);
  for (let c = 0; c < k; c++) {
    let p = c;
    for (let r = c + 1; r < k; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    if (Math.abs(M[c][c]) < 1e-14) return null;
    for (let r = 0; r < k; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      if (f) for (let j = c; j <= k; j++) M[r][j] -= f * M[c][j];
    }
  }
  return M.map((l, i) => l[k] / l[i]);
}

/** WLS de y (índice) sobre colunas (índices) a partir do XtWX somado; colunas sem variância saem (β = 0). */
function wls(tot, cols, y) {
  let maior = 0;
  for (const c of cols) maior = Math.max(maior, tot[c * P + c]);
  const ativos = cols.filter((c) => tot[c * P + c] > 1e-10 * maior);
  const k = ativos.length;
  const A = new Array(k * k); const b = new Array(k);
  ativos.forEach((ci, a) => { b[a] = tot[ci * P + y]; ativos.forEach((cj, c) => { A[a * k + c] = tot[ci * P + cj]; }); });
  const sol = resolverSimetrico(A, b, k);
  if (!sol) return null;
  const beta = new Map(cols.map((c) => [c, 0]));
  ativos.forEach((c, a) => beta.set(c, sol[a]));
  return beta;
}

/**
 * Gauss-Jordan simétrico (matriz XtWX, semidefinida positiva), na ordem das colunas: a coluna cujo pivô restante é
 * menor que 1e-9 do seu valor original é colinear com as anteriores e sai (β = 0). Evita que dummies que somam 1
 * dentro do efeito fixo, numa réplica do bootstrap, produzam coeficientes explosivos.
 */
function resolverSimetrico(A, b, k) {
  const M = Array.from({ length: k }, (_, i) => [...A.slice(i * k, i * k + k), b[i]]);
  const orig = M.map((l, i) => l[i]);
  const fora = new Array(k).fill(false);
  for (let c = 0; c < k; c++) {
    if (!(M[c][c] > 1e-9 * orig[c])) {
      fora[c] = true;
      for (let r = 0; r < k; r++) { M[r][c] = 0; M[c][r] = 0; }
      M[c][k] = 0;
      continue;
    }
    for (let r = 0; r < k; r++) {
      if (r === c || fora[r]) continue;
      const f = M[r][c] / M[c][c];
      if (f) for (let j = 0; j <= k; j++) M[r][j] -= f * M[c][j];
    }
  }
  return M.map((l, i) => (fora[i] ? 0 : l[k] / l[i]));
}

const DEFS = { L2: { x: ['xL'], grupos: ['L'] }, L1: { x: ['xM', 'xO'], grupos: ['M', 'O'] } };

function estatGrupos(tot, def, ctrl) {
  const xs = DEFS[def].x.map((n) => I[n]);
  const cols = [...xs, ...ctrl.map((n) => I[n])];
  const b13 = wls(tot, cols, I.y13); const b22 = wls(tot, cols, I.y22);
  if (!b13 || !b22) return null;
  const beta = [b13, b22];
  const nivel = {};
  for (const g of ['B', ...DEFS[def].grupos]) {
    const o = P * P + GRUPOS.indexOf(g) * TG;
    const S = tot[o];
    const base = [0, 1].map((c) => {
      let v = tot[o + 1 + c];
      for (const col of cols) v += beta[c].get(col) * tot[o + 3 + col];
      for (const xi of xs) v -= beta[c].get(xi) * tot[o + 3 + P + XRAW.indexOf(NOMES[xi])];
      return v / S;
    });
    const d = g === 'B' ? [0, 0] : [beta[0].get(I[DEFS[def].x[DEFS[def].grupos.indexOf(g)]]), beta[1].get(I[DEFS[def].x[DEFS[def].grupos.indexOf(g)]])];
    nivel[g] = { S, base, share: [base[0] + d[0], base[1] + d[1]], d };
  }
  const tp = ([a, b]) => a / (a + b);
  const out = { bio_tp: tp(nivel.B.share) };
  for (const g of DEFS[def].grupos) {
    const G = nivel[g];
    out[`${g}_tp`] = tp(G.share); out[`${g}_tp0`] = tp(G.base);
    out[`${g}_difCond`] = tp(G.share) - tp(G.base);
    out[`${g}_difTotal`] = tp(G.share) - out.bio_tp;
    out[`${g}_margemExtra`] = (G.d[0] - G.d[1]) * G.S;
    out[`${g}_d13`] = G.d[0]; out[`${g}_d22`] = G.d[1];
  }
  return { out, beta, cols };
}

// Especificações do Goodman condicional
const SPECS = {
  'zona|nenhum (M1)': { fe: 'zona', ctrl: [] },
  'zona|+cadSemBio': { fe: 'zona', ctrl: ['cadSemBio'] },
  'zona|+p60': { fe: 'zona', ctrl: ['p60'] },
  'zona|+pBaixa': { fe: 'zona', ctrl: ['pBaixa'] },
  'zona|+pSup': { fe: 'zona', ctrl: ['pSup'] },
  'zona|+logEle': { fe: 'zona', ctrl: ['logEle'] },
  'zona|base (M2)': { fe: 'zona', ctrl: BASE },
  'zona|base+urna': { fe: 'zona', ctrl: [...BASE, ...URNA] },
  'zona|base+novos': { fe: 'zona', ctrl: [...BASE, ...NOVOS] },
  'zona|base+novos+urna': { fe: 'zona', ctrl: [...BASE, ...NOVOS, ...URNA] },
  'zona|novos+urna sem cadSemBio': { fe: 'zona', ctrl: [...BASE.filter((c) => c !== 'cadSemBio'), ...NOVOS, ...URNA] },
  'local|nenhum': { fe: 'local', ctrl: [] },
  'local|base': { fe: 'local', ctrl: BASE },
  'local|base+novos+urna': { fe: 'local', ctrl: [...BASE, ...NOVOS, ...URNA] },
};
const IV_CTRL = [...BASE, ...NOVOS];
const IVS = [{ fe: 'uf', inst: 'velha' }, { fe: 'zona', inst: 'u20' }, { fe: 'local', inst: 'u20' }];
const FES = ['uf', 'zona', 'local'];
const EQUILIBRIO = ['cadSemBio', 'p60', 'p80', 'pBaixa', 'pAnalf', 'pSup', 'logEle', 'pBio70', 'pFem'];

function avaliar(acc) {
  const f = {};
  for (const [nome, sp] of Object.entries(SPECS)) {
    const tot = acc[sp.fe];
    for (const def of Object.keys(DEFS)) {
      const r = estatGrupos(tot, def, sp.ctrl);
      if (!r) continue;
      for (const [c, v] of Object.entries(r.out)) f[`${nome}|${def}|${c}`] = v;
    }
  }
  // controle negativo: modelo de urna como instrumento da liberação, com controles demográficos.
  // A urna antiga (UE2013/UE2015) vem por zona inteira (só 2 zonas do Nordeste misturam), então ela só tem variação
  // ENTRE zonas: FE de UF. Dentro da zona e do local, o contraste disponível é UE2020 × UE2022.
  for (const iv of IVS) {
    const tot = acc[iv.fe];
    const inst = I[iv.inst];
    const cols = [inst, ...IV_CTRL.map((n) => I[n])];
    const r = {};
    for (const y of ['y13', 'y22', 'xM', 'xL', 'xO']) { const b = wls(tot, cols, I[y]); r[y] = b ? b.get(inst) : NaN; }
    const id = `iv|${iv.fe}|${iv.inst}`;
    f[`${id}|fs_xM`] = r.xM; f[`${id}|fs_xL`] = r.xL; f[`${id}|fs_xO`] = r.xO;
    f[`${id}|rf_13`] = r.y13; f[`${id}|rf_22`] = r.y22; f[`${id}|rf_margem`] = r.y13 - r.y22;
    f[`${id}|iv_margem_por_L1`] = (r.y13 - r.y22) / r.xM;
    f[`${id}|iv_margem_por_L2`] = (r.y13 - r.y22) / r.xL;
    // equilíbrio: o instrumento prevê o perfil dentro do FE? (sem outros controles)
    for (const c of EQUILIBRIO) { const b = wls(tot, [inst], I[c]); f[`equilibrio|${iv.fe}|${iv.inst}|${c}`] = b ? b.get(inst) : NaN; }
  }
  return f;
}

function rng(semente) {
  let a = semente >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function somar(porMun, munis, pesos) {
  const tot = new Float64Array(TAM);
  for (let i = 0; i < munis.length; i++) {
    const w = pesos[i]; if (!w) continue;
    const a = porMun.get(munis[i]); if (!a) continue;
    for (let j = 0; j < TAM; j++) tot[j] += w * a[j];
  }
  return tot;
}

/** Parcela implícita por seção fora de [0,1] e fora dos limites determinísticos da seção (só estimativa pontual). */
function diagnostico(secoes, m, tot, def, ctrl) {
  const r = estatGrupos(tot, def, ctrl);
  const g = DEFS[def].grupos[0];
  const xi = I[DEFS[def].x[0]];
  const xs = DEFS[def].x.map((n) => I[n]);
  const c = { secoes: 0, G: 0, fora01: 0, fora01G: 0, foraLim: 0, foraLimG: 0, abaixoMin: 0, acimaMax: 0, foraLimRazao: 0 };
  for (const s of secoes) {
    const G = s.g[g]; if (!G) continue;
    const med = m.medias.get(s[m.fe]).v;
    const lib13 = (() => {
      let v = med[I.y13];
      for (const col of r.cols) v += r.beta[0].get(col) * (s.v[col] - med[col]);
      for (const x of xs) v -= r.beta[0].get(x) * s.v[x];
      return v + r.beta[0].get(xi);
    })();
    // lib13 está em parcela do grupo: votos 13 do grupo / G
    const lo = Math.max(0, s.v13 - (s.n - G)) / G; const hi = Math.min(s.v13, G) / G;
    c.secoes++; c.G += G;
    if (lib13 < 0 || lib13 > 1) { c.fora01++; c.fora01G += G; }
    if (lib13 < lo - 1e-9 || lib13 > hi + 1e-9) { c.foraLim++; c.foraLimG += G; if (lib13 < lo) c.abaixoMin++; else c.acimaMax++; }
  }
  c.foraLimRazao = c.foraLim / c.secoes;
  return c;
}

// ---------- execução ----------
const { db, ponteiro } = await abrirLeitura();
log(`banco: ${ponteiro?.arquivo}`);
const perfil = new Map();
await Promise.all(NE.map(async (uf) => { const m = await perfilUf(uf); for (const [k, v] of m) perfil.set(k, v); log(`perfil ${uf}: ${m.size}`); }));
const locais = await carregarLocais();
const resultado = { geradoEm: new Date().toISOString(), banco: ponteiro?.arquivo, reps: REPS, semente: Number(values.semente), turnos: {} };
const dadosT = {};
for (const turno of [2, 1]) {
  dadosT[turno] = await carregarTurno(db, turno, perfil, locais[turno]);
  log(`turno ${turno}: ${dadosT[turno].secoes.length} seções; ${JSON.stringify(dadosT[turno].descarte)}`);
}
db.close();

const munis = [...new Set([...dadosT[2].secoes, ...dadosT[1].secoes].map((s) => s.mun))].sort();
const est = {};
for (const t of [2, 1]) {
  est[t] = {};
  for (const fe of FES) { est[t][fe] = { ...montar(dadosT[t].secoes, fe), fe }; log(`montado ${t} ${fe}: ${est[t][fe].grupos} grupos, ${est[t][fe].singletons} com 1 seção`); }
}
const avaliarPesos = (pesos) => {
  const f = {};
  for (const t of [2, 1]) {
    const acc = Object.fromEntries(FES.map((fe) => [fe, somar(est[t][fe].porMun, munis, pesos)]));
    for (const [c, v] of Object.entries(avaliar(acc))) f[`${t}t|${c}`] = v;
  }
  for (const c of Object.keys(f)) if (c.startsWith('2t|')) { const c1 = `1t|${c.slice(3)}`; if (f[c1] != null) f[`delta|${c.slice(3)}`] = f[c] - f[c1]; }
  return f;
};
const ponto = avaliarPesos(new Float64Array(munis.length).fill(1));
const amostras = Object.fromEntries(Object.keys(ponto).map((c) => [c, []]));
const sorteio = rng(Number(values.semente));
for (let r = 0; r < REPS; r++) {
  const pesos = new Float64Array(munis.length);
  for (let i = 0; i < munis.length; i++) pesos[Math.floor(sorteio() * munis.length)]++;
  const f = avaliarPesos(pesos);
  for (const c of Object.keys(amostras)) if (Number.isFinite(f[c])) amostras[c].push(f[c]);
  if ((r + 1) % 50 === 0) log(`bootstrap ${r + 1}/${REPS}`);
}
const resumo = {};
for (const [c, v] of Object.entries(ponto)) {
  const a = Float64Array.from(amostras[c]).sort();
  const media = a.reduce((x, y) => x + y, 0) / a.length;
  const ep = Math.sqrt(a.reduce((x, y) => x + (y - media) ** 2, 0) / (a.length - 1));
  const q = (p) => a[Math.min(a.length - 1, Math.max(0, Math.round(p * (a.length - 1))))];
  resumo[c] = { est: v, ep, ic95: [q(0.025), q(0.975)], t: v / ep };
}
resultado.resumo = resumo;
resultado.municipios = munis.length;
for (const t of [2, 1]) {
  const s = dadosT[t].secoes;
  const soma = (fn) => s.reduce((a, x) => a + fn(x), 0);
  resultado.turnos[t] = { descarte: dadosT[t].descarte, secoes: s.length, n: soma((x) => x.n), L2: soma((x) => x.L2), M: soma((x) => x.M), v13: soma((x) => x.v13), v22: soma((x) => x.v22),
    gruposZona: est[t].zona.grupos, gruposLocal: est[t].local.grupos, locaisCom1Secao: est[t].local.singletons };
}
// diagnósticos ecológicos (2º turno, estimativa pontual)
const totZ = somar(est[2].zona.porMun, munis, new Float64Array(munis.length).fill(1));
const totL = somar(est[2].local.porMun, munis, new Float64Array(munis.length).fill(1));
resultado.diagnostico = {};
// grupos de efeito fixo em que o instrumento varia (identificação do teste de controle negativo)
resultado.variacaoInstrumento = {};
for (const iv of IVS) {
  const g = new Map();
  for (const s of dadosT[2].secoes) { const k = s[iv.fe]; const o = g.get(k) ?? { n: 0, v: 0 }; o.n++; o.v += s.v[I[iv.inst]]; g.set(k, o); }
  const mistos = [...g.values()].filter((o) => o.v > 0 && o.v < o.n);
  resultado.variacaoInstrumento[iv.fe + '|' + iv.inst] = { grupos: g.size, gruposMistos: mistos.length, secoesEmMistos: mistos.reduce((a, o) => a + o.n, 0) };
}
for (const [nome, sp] of [['zona|nenhum (M1)', SPECS['zona|nenhum (M1)']], ['zona|base (M2)', SPECS['zona|base (M2)']], ['zona|base+novos+urna', SPECS['zona|base+novos+urna']], ['local|base+novos+urna', SPECS['local|base+novos+urna']]]) {
  for (const def of Object.keys(DEFS)) resultado.diagnostico[`${nome}|${def}`] = diagnostico(dadosT[2].secoes, est[2][sp.fe], sp.fe === 'zona' ? totZ : totL, def, sp.ctrl);
}
// casos para conferência no bruto: maior L1/n com urna UE2013 e ≥ 100 votantes, e a seção com maior excesso pró-13 na mesma zona
const ext = dadosT[2].secoes.filter((s) => s.n >= 100 && s.modelo === 'ue2013').sort((a, b) => b.M / b.n - a.M / a.n).slice(0, 5)
  .map((s) => ({ k: s.k, n: s.n, B: s.B, L2: s.L2, M: s.M, v13: s.v13, v22: s.v22, modelo: s.modelo }));
resultado.extremasUe2013 = ext;
await mkdir(DIR_SAIDA, { recursive: true });
await writeFile(path.join(DIR_SAIDA, 'cetico-confusao.json'), `${JSON.stringify(resultado, null, 1)}\n`);
log(`pronto: ${Object.keys(resumo).length} estatísticas; ${path.join(DIR_SAIDA, 'cetico-confusao.json')}`);
