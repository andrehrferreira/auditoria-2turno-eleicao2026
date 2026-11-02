// H26, fechamento (docs/analysis/cientista-politico/06-h26-plano-final.md): funções comuns às partes (a), (b) e (c).
//   - Leitura dos dados abertos (munzona e detalhe por seção) de 2018, 2022 e 2026, com cache em
//     data/parsed/auditoria/cientista-politico/.
//   - Motor da triagem por zona com estatísticas suficientes: cada zona guarda X'X e X'y das unidades do ajuste e as
//     somas de X e y de todas as unidades. Uma reamostragem de zonas (bootstrap por conglomerado) refaz o MQ por UF só
//     somando matrizes, sem reler as unidades.
//   - Seções de 2026 pelo caminho do plano 01 (pares-banco.csv + voto_bu + horas do log), como virada-zonas.mjs.
// Só leitura. Node 24, sem dependências.
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { RAIZ, medianaMad } from './forense-lib.mjs';
import { lerPares, REGIAO, bh, pNormal2 } from './estatistico-lib.mjs';
import { entradasZip, linhasBrutas } from './contagem-zip.mjs';
import { difRelogioPorSecao, difSecao } from './relogio-fora-do-fuso.mjs';

export { REGIAO, bh, pNormal2, medianaMad };
export const SAIDA = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cientista-politico');
export const DA = path.join(RAIZ, 'data', 'raw', 'dadosabertos');
export const r2 = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : null);
export const r4 = (x) => (Number.isFinite(x) ? Math.round(x * 10000) / 10000 : null);
export const pp = (a, b) => (b > 0 ? (100 * a) / b : NaN);
const t0 = Date.now();
export const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
export const QMAX = 0.01, PP_MIN = 2;

// Finalistas e o lado de quem cresceu (plano, seção 2). Preditores fixados pela regra dos 2% (plano 4.1, doc 03).
export const ANOS = {
  2018: { rival: '17', ganhou: '13', perdeu: '17', preditores: ['13', '17', '12', '45', '30'] },
  2022: { rival: '22', ganhou: '22', perdeu: '13', preditores: ['13', '22', '15', '12'] },
  2026: { rival: '22', ganhou: '13', perdeu: '22', preditores: ['13', '22', '70', '14', '55'] },
};
// UFs ajustadas juntas por terem poucas unidades (doc 03, historico.json → ajuste)
export const GRUPOS_PEQUENOS = {
  2018: { ac: 'N*', ap: 'N*', ro: 'N*', rr: 'N*', df: 'CO*' },
  2022: { ac: 'N*', ap: 'N*', rr: 'N*', df: 'CO*' },
  2026: { ac: 'N*', ap: 'N*', ro: 'N*', rr: 'N*', df: 'CO*' },
};

// ---------- leitura dos zips ----------

export async function* tabelaZip(zip, nomeRe) {
  const e = (await entradasZip(zip)).find((x) => nomeRe.test(x.nome));
  if (!e) throw new Error(`${zip}: nenhuma entrada ${nomeRe}`);
  let col = null, n = 0;
  for await (const c of linhasBrutas(zip, e)) {
    if (!col) { col = Object.fromEntries(c.map((x, i) => [x.trim(), i])); n = c.length; continue; }
    yield [c, col, c.length === n];
  }
}

const CAMPOS_DET = ['QT_APTOS', 'QT_COMPARECIMENTO', 'QT_ABSTENCOES', 'QT_VOTOS_NOMINAIS', 'QT_VOTOS_BRANCOS', 'QT_VOTOS_NULOS', 'QT_VOTOS_ANULADOS_APU_SEP'];
export const chaveSec = (uf, mun, zona, secao) => `${uf}|${Number(mun)}|${Number(zona)}|${Number(secao)}`;
export const chaveUnid = (uf, mun, zona) => `${uf}|${Number(mun)}|${Number(zona)}`;

/** detalhe_votacao_secao_<ano>_BR.csv, presidente: por seção e turno [aptos, comparecimento, abstenção, nominais, brancos, nulos, anulados]. */
export async function lerDetalhe(ano) {
  const zip = path.join(DA, 'detalhe_votacao_secao', `detalhe_votacao_secao_${ano}.zip`);
  const secoes = new Map();
  const conf = { linhas: 0, malformadas: 0, cargo1: 0, repetidas: 0, naoInstaladas: 0 };
  for await (const [c, col, ok] of tabelaZip(zip, new RegExp(`_${ano}_BR\\.csv$`, 'i'))) {
    conf.linhas++;
    if (!ok) { conf.malformadas++; continue; }
    if (c[col.CD_CARGO] !== '1') continue;
    conf.cargo1++;
    const t = Number(c[col.NR_TURNO]);
    const uf = c[col.SG_UF].toLowerCase();
    const k = chaveSec(uf, c[col.CD_MUNICIPIO], c[col.NR_ZONA], c[col.NR_SECAO]);
    let s = secoes.get(k);
    if (!s) { s = { local: c[col.NR_LOCAL_VOTACAO], t: [null, null, null] }; secoes.set(k, s); }
    if (s.t[t]) conf.repetidas++;
    const v = CAMPOS_DET.map((f) => Number(c[col[f]]) || 0);
    if (s.t[t]) for (let i = 0; i < v.length; i++) s.t[t][i] += v[i]; else s.t[t] = v;
  }
  return { secoes, conf };
}

/** UFs com 2º turno de governador no ano (detalhe _BRASIL.csv, cargo 3, turno 2). */
export async function ufsGovernador2t(ano) {
  const zip = path.join(DA, 'detalhe_votacao_secao', `detalhe_votacao_secao_${ano}.zip`);
  const ufs = new Set();
  for await (const [c, col, ok] of tabelaZip(zip, new RegExp(`_${ano}_BRASIL\\.csv$`, 'i'))) {
    if (ok && c[col.NR_TURNO] === '2' && c[col.CD_CARGO] === '3') ufs.add(c[col.SG_UF].toLowerCase());
  }
  return [...ufs].sort();
}

/** votacao_candidato_munzona_<ano>_BR.csv, presidente: votos nominais por município × zona, turno e candidato. */
export async function lerMunzona(ano) {
  const zip = path.join(DA, 'votacao_candidato_munzona', `votacao_candidato_munzona_${ano}.zip`);
  const unidades = new Map();
  const total = [null, {}, {}];
  const conf = { malformadas: 0 };
  for await (const [c, col, ok] of tabelaZip(zip, new RegExp(`_${ano}_BR\\.csv$`, 'i'))) {
    if (!ok) { conf.malformadas++; continue; }
    if (c[col.CD_CARGO] !== '1') continue;
    const t = Number(c[col.NR_TURNO]);
    const uf = c[col.SG_UF].toLowerCase();
    const k = chaveUnid(uf, c[col.CD_MUNICIPIO], c[col.NR_ZONA]);
    let u = unidades.get(k);
    if (!u) { u = { uf, mun: Number(c[col.CD_MUNICIPIO]), zona: Number(c[col.NR_ZONA]), nome: c[col.NM_MUNICIPIO], v: [null, {}, {}] }; unidades.set(k, u); }
    const nr = c[col.NR_CANDIDATO], q = Number(c[col.QT_VOTOS_NOMINAIS]);
    u.v[t][nr] = (u.v[t][nr] ?? 0) + q;
    total[t][nr] = (total[t][nr] ?? 0) + q;
  }
  return { unidades, total, conf };
}

/**
 * Nível A (plano 4.1): unidades município × zona do ano, com os votos do munzona e brancos, nulos, aptos e comparecimento
 * do detalhe somados. Cache em h26-nivelA-<ano>.json. Conferência munzona × detalhe por unidade e turno (plano, seção 6).
 */
export async function nivelA(ano) {
  const cache = path.join(SAIDA, `h26-nivelA-${ano}.json`);
  if (existsSync(cache)) return JSON.parse(readFileSync(cache, 'utf8'));
  const mz = await lerMunzona(ano);
  log(`${ano}: munzona lido (${mz.unidades.size} unidades)`);
  const det = await lerDetalhe(ano);
  log(`${ano}: detalhe lido (${det.secoes.size} seções)`);
  const agg = new Map();
  for (const [k, s] of det.secoes) {
    const [uf, mun, zona] = k.split('|');
    const ku = chaveUnid(uf, mun, zona);
    const a = agg.get(ku) ?? agg.set(ku, { t: [null, new Array(7).fill(0), new Array(7).fill(0)], secoes: 0 }).get(ku);
    a.secoes++;
    for (const t of [1, 2]) if (s.t[t]) for (let i = 0; i < 7; i++) a.t[t][i] += s.t[t][i];
  }
  const conf = { munzona: mz.conf, detalhe: det.conf, unidadesMunzona: mz.unidades.size, unidadesDetalhe: agg.size,
    semDetalhe: 0, semMunzona: 0, nominaisDiferem: { 1: 0, 2: 0 }, nominaisDiferencaAbs: { 1: 0, 2: 0 }, porUf: {} };
  const unidades = [];
  for (const [k, u] of mz.unidades) {
    const d = agg.get(k);
    if (!d) { conf.semDetalhe++; continue; }
    const nom = (t) => Object.values(u.v[t]).reduce((a, b) => a + b, 0);
    for (const t of [1, 2]) {
      const dif = nom(t) - d.t[t][3];
      if (dif !== 0) { conf.nominaisDiferem[t]++; conf.nominaisDiferencaAbs[t] += Math.abs(dif); }
      const pu = (conf.porUf[`${u.uf}|${t}`] ??= { munzona: 0, detalhe: 0 });
      pu.munzona += nom(t); pu.detalhe += d.t[t][3];
    }
    unidades.push({ uf: u.uf, mun: u.mun, zona: u.zona, nome: u.nome, v1: u.v[1], v2: u.v[2], d1: d.t[1], d2: d.t[2], secoes: d.secoes });
  }
  for (const k of agg.keys()) if (!mz.unidades.has(k)) conf.semMunzona++;
  const saida = { ano, total: mz.total, conf, unidades };
  await mkdir(SAIDA, { recursive: true });
  await writeFile(cache, JSON.stringify(saida));
  return saida;
}

// ---------- motor da triagem por zona ----------

/**
 * Prepara o motor. `unidades`: lista de {uf, zona (chave), mun (chave de município), X (array k), y13, yR, ajusta (bool),
 * nom1, a13_1, aR_1, a1, c1, a2, c2}. `grupo(uf)` = grupo de ajuste. O conglomerado da reamostragem é o município
 * principal da zona (maior nominal do 2º turno) dentro da UF.
 */
export function prepararMotor(unidades, { grupo, k }) {
  const Z = new Map();
  for (const u of unidades) {
    const kz = `${u.uf}|${u.zona}`;
    let z = Z.get(kz);
    if (!z) {
      z = { chave: kz, uf: u.uf, regiao: REGIAO[u.uf], grupo: grupo(u.uf), XtX: new Float64Array(k * k), Xy13: new Float64Array(k), XyR: new Float64Array(k),
        sX: new Float64Array(k), y13: 0, yR: 0, nom1: 0, a13_1: 0, aR_1: 0, a1: 0, c1: 0, a2: 0, c2: 0, unidades: 0, mun: new Map() };
      Z.set(kz, z);
    }
    z.unidades++;
    const x = u.X;
    if (u.ajusta) {
      for (let i = 0; i < k; i++) {
        z.Xy13[i] += x[i] * u.y13; z.XyR[i] += x[i] * u.yR;
        for (let j = 0; j < k; j++) z.XtX[i * k + j] += x[i] * x[j];
      }
    }
    for (let i = 0; i < k; i++) z.sX[i] += x[i];
    z.y13 += u.y13; z.yR += u.yR; z.nom1 += u.nom1; z.a13_1 += u.a13_1; z.aR_1 += u.aR_1;
    z.a1 += u.a1; z.c1 += u.c1; z.a2 += u.a2; z.c2 += u.c2;
    let m = z.mun.get(u.mun);
    if (!m) { m = { sX: new Float64Array(k), y13: 0, yR: 0, nom2: 0 }; z.mun.set(u.mun, m); }
    for (let i = 0; i < k; i++) m.sX[i] += x[i];
    m.y13 += u.y13; m.yR += u.yR; m.nom2 += u.y13 + u.yR;
  }
  const zonas = [...Z.values()];
  for (const z of zonas) {
    z.nom2 = z.y13 + z.yR;
    z.cluster = `${z.uf}|${[...z.mun].sort((a, b) => b[1].nom2 - a[1].nom2)[0][0]}`;
  }
  const clusters = new Map();
  for (const z of zonas) (clusters.get(z.cluster) ?? clusters.set(z.cluster, []).get(z.cluster)).push(z);
  const clustersPorUf = new Map();
  for (const [c, l] of clusters) { const uf = l[0].uf; (clustersPorUf.get(uf) ?? clustersPorUf.set(uf, []).get(uf)).push(c); }
  return { k, zonas, clusters, clustersPorUf };
}

function resolver(A, b, k) {
  const M = Array.from({ length: k }, (_, i) => [...Array.from({ length: k }, (_, j) => A[i * k + j]), b[i]]);
  for (let c = 0; c < k; c++) {
    let p = c;
    for (let r = c + 1; r < k; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    if (Math.abs(M[c][c]) < 1e-12) return null;
    for (let r = 0; r < k; r++) { if (r === c) continue; const f = M[r][c] / M[c][c]; for (let j = c; j <= k; j++) M[r][j] -= f * M[c][j]; }
  }
  return M.map((r, i) => r[k] / r[i]);
}

/** Seleção de zonas de uma reamostragem: lista de [zona, cópia]. Sem argumento, cada zona uma vez (dado real). */
export function amostraReal(motor) { return motor.zonas.filter((z) => z.uf !== 'zz').map((z) => [z, 0]); }
export function amostraBootstrap(motor, rnd) {
  const sel = [];
  for (const [uf, cl] of motor.clustersPorUf) {
    if (uf === 'zz') continue;
    const vezes = new Map();
    for (let i = 0; i < cl.length; i++) {
      const c = cl[Math.floor(rnd() * cl.length)];
      const n = vezes.get(c) ?? 0; vezes.set(c, n + 1);
      for (const z of motor.clusters.get(c)) sel.push([z, n]);
    }
  }
  return sel;
}

function zRobusto(itens) {
  for (const reg of new Set(itens.map((z) => z.regiao))) {
    const l = itens.filter((z) => z.regiao === reg && Number.isFinite(z.t));
    const { mediana, mad } = medianaMad(l.map((z) => z.t));
    for (const z of l) z.z = mad > 0 ? (z.t - mediana) / mad : NaN;
  }
  const com = itens.filter((z) => Number.isFinite(z.z));
  const qs = bh(com.map((z) => pNormal2(z.z)));
  com.forEach((z, i) => { z.q = qs[i]; });
}

function icc(grupos) {
  const g = grupos.filter((l) => l.length > 1);
  const N = g.reduce((a, l) => a + l.length, 0), G = g.length;
  if (G < 2) return NaN;
  const media = g.flat().reduce((a, b) => a + b, 0) / N;
  let ssb = 0, ssw = 0;
  for (const l of g) { const m = l.reduce((a, b) => a + b, 0) / l.length; ssb += l.length * (m - media) ** 2; for (const v of l) ssw += (v - m) ** 2; }
  const msb = ssb / (G - 1), msw = ssw / (N - G);
  const n0 = (N - g.reduce((a, l) => a + l.length ** 2, 0) / N) / (G - 1);
  return (msb - msw) / (msb + (n0 - 1) * msw);
}

/**
 * As 12 estatísticas da família (plano 4.2) para uma seleção de zonas. `sinal` = +1 se quem cresceu é o 13, −1 se é o
 * rival. `iSelf13`/`iSelfR` = posição do 13 e do rival em X. `pesoSelf` = votos do 1º turno de cada finalista por grupo.
 */
export function estatisticas(motor, sel, { sinal, iSelf13, iSelfR, detalhar = false }) {
  const { k } = motor;
  // 1. MQ por grupo
  const G = new Map();
  for (const [z] of sel) {
    let g = G.get(z.grupo);
    if (!g) { g = { XtX: new Float64Array(k * k), Xy13: new Float64Array(k), XyR: new Float64Array(k), v13: 0, vR: 0 }; G.set(z.grupo, g); }
    for (let i = 0; i < k * k; i++) g.XtX[i] += z.XtX[i];
    for (let i = 0; i < k; i++) { g.Xy13[i] += z.Xy13[i]; g.XyR[i] += z.XyR[i]; }
    g.v13 += z.a13_1; g.vR += z.aR_1;
  }
  for (const g of G.values()) { g.b13 = resolver(g.XtX, g.Xy13, k); g.bR = resolver(g.XtX, g.XyR, k); }
  // 2. Zonas
  const itens = [];
  let T = { m1: 0, n1: 0, m2: 0, n2: 0 };
  const munis = new Map();
  for (const [z, copia] of sel) {
    const g = G.get(z.grupo);
    if (!g.b13 || !g.bR) continue;
    let p13 = 0, pR = 0;
    for (let i = 0; i < k; i++) { p13 += z.sX[i] * g.b13[i]; pR += z.sX[i] * g.bR[i]; }
    const rl = (z.y13 - p13) - (z.yR - pR);
    const m1 = pp(z.a13_1 - z.aR_1, z.nom1), m2 = pp(z.y13 - z.yR, z.nom2);
    itens.push({ zona: z, copia, uf: z.uf, regiao: z.regiao, cluster: `${z.cluster}#${copia}`, rl, nom2: z.nom2, alem: pp(rl, z.nom2), t: z.nom2 > 0 ? rl / Math.sqrt(z.nom2) : NaN,
      virada: m2 - m1, dComp: pp(z.c2 - z.c1, z.a2) });
    T.m1 += z.a13_1 - z.aR_1; T.n1 += z.nom1; T.m2 += z.y13 - z.yR; T.n2 += z.nom2;
    for (const [m, d] of z.mun) {
      const km = `${z.uf}|${m}#${copia}`;
      let mm = munis.get(km);
      if (!mm) { mm = { regiao: z.regiao, rl: 0, nom2: 0 }; munis.set(km, mm); }
      let q13 = 0, qR = 0;
      for (let i = 0; i < k; i++) { q13 += d.sX[i] * g.b13[i]; qR += d.sX[i] * g.bR[i]; }
      mm.rl += (d.y13 - q13) - (d.yR - qR); mm.nom2 += d.nom2;
    }
  }
  zRobusto(itens);
  const viradaNac = pp(T.m2, T.n2) - pp(T.m1, T.n1);
  const corte = (z) => Number.isFinite(z.q) && z.q < QMAX && Math.abs(z.alem) >= PP_MIN;
  // B5: inclinação dentro da UF (efeito fixo de UF, peso nom2) da virada além do esperado orientada sobre Δcomparecimento
  const porUf = new Map();
  for (const z of itens) { if (!Number.isFinite(z.dComp) || !Number.isFinite(z.alem)) continue; (porUf.get(z.uf) ?? porUf.set(z.uf, []).get(z.uf)).push(z); }
  let sxy = 0, sxx = 0;
  for (const l of porUf.values()) {
    const w = l.reduce((a, z) => a + z.nom2, 0);
    const mx = l.reduce((a, z) => a + z.nom2 * z.dComp, 0) / w, my = l.reduce((a, z) => a + z.nom2 * sinal * z.alem, 0) / w;
    for (const z of l) { sxy += z.nom2 * (z.dComp - mx) * (sinal * z.alem - my); sxx += z.nom2 * (z.dComp - mx) ** 2; }
  }
  // B6: ICC por município principal (cópia) e triagem por município
  const porCluster = new Map();
  for (const z of itens) if (Number.isFinite(z.z)) (porCluster.get(z.cluster) ?? porCluster.set(z.cluster, []).get(z.cluster)).push(z.z);
  const mlist = [...munis.values()].map((m) => ({ ...m, alem: pp(m.rl, m.nom2), t: m.nom2 > 0 ? m.rl / Math.sqrt(m.nom2) : NaN }));
  zRobusto(mlist);
  // B4: peso de cada finalista sobre ele mesmo, média dos grupos ponderada pelos votos do finalista no 1º turno
  let s13 = 0, w13 = 0, sR = 0, wR = 0;
  for (const g of G.values()) { if (!g.b13) continue; s13 += g.b13[iSelf13] * g.v13; w13 += g.v13; sR += g.bR[iSelfR] * g.vR; wR += g.vR; }
  const self13 = s13 / w13, selfR = sR / wR;
  const vir = itens.map((z) => sinal * z.virada).filter(Number.isFinite);
  const est = {
    B1: medianaMad(itens.map((z) => z.alem).filter(Number.isFinite)).mad,
    B2g: itens.filter((z) => sinal * z.z >= 3).length,
    B2p: itens.filter((z) => sinal * z.z <= -3).length,
    B3g: itens.filter((z) => corte(z) && sinal * z.alem > 0).length,
    B3p: itens.filter((z) => corte(z) && sinal * z.alem < 0).length,
    B4g: sinal > 0 ? self13 : selfR,
    B4p: sinal > 0 ? selfR : self13,
    B5: sxy / sxx,
    B6a: icc([...porCluster.values()]),
    B6b: mlist.filter((m) => corte(m) && sinal * m.alem > 0).length,
    B7a: (100 * vir.filter((v) => v > 0).length) / vir.length,
    B7b: medianaMad(vir).mad / Math.abs(viradaNac),
  };
  if (!detalhar) return est;
  return { est, itens, municipios: munis, mlist, grupos: G, viradaNac, B6bPerdeu: mlist.filter((m) => corte(m) && sinal * m.alem < 0).length };
}

export const FAMILIA = ['B1', 'B2g', 'B2p', 'B3g', 'B3p', 'B4g', 'B4p', 'B5', 'B6a', 'B6b', 'B7a', 'B7b'];
// Direção que conta como sinal a favor de quem cresceu (plano 4.2): +1 = maior; −1 = menor
export const DIRECAO = { B1: 1, B2g: 1, B2p: 1, B3g: 1, B3p: 1, B4g: 1, B4p: 1, B5: 1, B6a: 1, B6b: 1, B7a: 1, B7b: -1 };

// ---------- quantis ----------
export function quantis(v, ps) {
  const s = Float64Array.from(v.filter(Number.isFinite)).sort();
  return ps.map((p) => { const pos = (s.length - 1) * p, i = Math.floor(pos); return i + 1 < s.length ? s[i] + (s[i + 1] - s[i]) * (pos - i) : s[i]; });
}

// ---------- seções de 2026 pelo caminho do plano 01 ----------

/**
 * Seções pareadas de 2026 (pares-banco.csv) com os eliminados do 1º turno (voto_bu), as horas de Brasília por turno
 * (perfil_log, fuso do município e relógio fora do fuso), o encerramento do 2º turno em Brasília e o esperado do plano 01.
 */
export async function secoes2026() {
  const P = await lerPares('banco');
  const chave = (uf, m, z, s) => `${uf}|${m}|${z}|${s}`;
  const porChave = new Map();
  for (const s of P) {
    Object.assign(s, { e14: 0, e30: 0, e55: 0, e70: 0, dem: 0, h1: null, h2: null, encBsb2: null, regiao: REGIAO[s.uf] });
    porChave.set(chave(s.uf, s.municipio, s.zona, s.secao), s);
  }
  const ufs = [...new Set(P.map((s) => s.uf))].sort();
  const { db, fonte } = await abrirLeitura();
  const conf = { fonte: path.basename(fonte), secoes: P.length, ufs: ufs.length, votosEliminadosSemPar: 0 };
  const qv = db.prepare(`SELECT uf, municipio, zona, secao, numero, quantidade FROM voto_bu
    WHERE turno = 1 AND cargo = 1 AND tipo_voto = 'nominal' AND uf = ?`);
  for (const uf of ufs) {
    for (const v of qv.iterate(uf)) {
      if (v.numero === 13 || v.numero === 22) continue;
      const s = porChave.get(chave(v.uf, v.municipio, v.zona, v.secao));
      if (!s) { conf.votosEliminadosSemPar += v.quantidade; continue; }
      if ([14, 30, 55, 70].includes(v.numero)) s[`e${v.numero}`] += v.quantidade; else s.dem += v.quantidade;
    }
  }
  conf.oficial = db.prepare(`SELECT turno, numero, SUM(quantidade) q FROM voto_oficial WHERE cargo = 1 AND numero IN (13, 22) GROUP BY turno, numero`).all();
  const qh = db.prepare(`SELECT s.uf, s.municipio, s.zona, s.secao, s.abertura, s.encerramento, s.comparecimento c, s.tipo_arquivo, s.numero_interno_urna urna, s.modelo_urna,
      json_extract(p.dados, '$.log.votosPorHoraLocal') h
    FROM secao s LEFT JOIN perfil_log p ON p.turno = s.turno AND p.uf = s.uf AND p.municipio = s.municipio AND p.zona = s.zona
      AND p.secao = s.secao AND p.hash = s.hash
    WHERE s.turno = ? AND s.situacao = 'completa'`);
  conf.horas = {};
  for (const t of [1, 2]) {
    const linhas = qh.all(t);
    const modas = new Map();
    for (const l of linhas) {
      if (!l.abertura) continue;
      const k = `${l.uf}|${l.municipio}`;
      if (!modas.has(k)) modas.set(k, new Map());
      const h = Number(l.abertura.slice(11, 13));
      modas.get(k).set(h, (modas.get(k).get(h) ?? 0) + 1);
    }
    const fuso = new Map();
    for (const [k, m] of modas) fuso.set(k, k.startsWith('zz|') ? null : [...m].sort((a, b) => b[1] - a[1])[0][0] - 8);
    const relogio = difRelogioPorSecao(t);
    const c = conf.horas[t] = { secoes: 0, semPerfil: 0, semFuso: 0 };
    for (const l of linhas) {
      const s = porChave.get(chave(l.uf, l.municipio, l.zona, l.secao));
      if (!s) continue;
      if (t === 2) { s.tipoArquivo2 = l.tipo_arquivo; s.encLocal2 = l.encerramento; }
      const dMun = fuso.get(`${l.uf}|${l.municipio}`);
      if (dMun === null || dMun === undefined) { c.semFuso++; continue; }
      const d = difSecao(relogio, l.uf, l.municipio, l.zona, l.secao, dMun);
      if (t === 2) {
        s.d2 = d;
        if (l.encerramento) { const hh = l.encerramento.slice(11, 19); s.encBsb2 = Number(hh.slice(0, 2)) * 3600 + Number(hh.slice(3, 5)) * 60 + Number(hh.slice(6, 8)) - d * 3600; }
      }
      if (!l.h) { c.semPerfil++; continue; }
      const bsb = new Int32Array(24);
      JSON.parse(l.h).forEach((v, hl) => { bsb[Math.min(23, Math.max(0, hl - d))] += v; });
      s[`h${t}`] = bsb;
      c.secoes++;
    }
  }
  conf.nomeMun = Object.fromEntries(db.prepare('SELECT uf, codigo, nome FROM municipio').all().map((m) => [`${m.uf}|${m.codigo}`, m.nome]));
  db.close();
  // Esperado do plano 01 (virada-zonas.mjs, seção 2)
  const X = (s) => [s.v13_1, s.v22_1, s.e14, s.e30, s.e55, s.e70, s.dem, s.bn1, s.a1 - s.c1];
  for (const uf of ufs) {
    const doUf = P.filter((s) => s.uf === uf);
    const ajuste = doUf.filter((s) => s.c1 >= 10 && s.a2 >= 20 && Math.abs(s.a2 - s.a1) <= 10);
    const b13 = mqoK(ajuste.map(X), ajuste.map((s) => s.v13_2));
    const b22 = mqoK(ajuste.map(X), ajuste.map((s) => s.v22_2));
    for (const s of doUf) {
      const x = X(s);
      s.p13 = x.reduce((a, v, i) => a + v * b13[i], 0);
      s.p22 = x.reduce((a, v, i) => a + v * b22[i], 0);
      s.rl = (s.v13_2 - s.p13) - (s.v22_2 - s.p22);
      s.nom2 = s.v13_2 + s.v22_2;
    }
  }
  return { P, conf, porChave };
}

function mqoK(X, y) {
  const k = X[0].length;
  const A = new Float64Array(k * k), b = new Float64Array(k);
  for (let n = 0; n < y.length; n++) { const x = X[n]; for (let i = 0; i < k; i++) { b[i] += x[i] * y[n]; for (let j = 0; j < k; j++) A[i * k + j] += x[i] * x[j]; } }
  return resolver(A, b, k);
}
export { mqoK };
