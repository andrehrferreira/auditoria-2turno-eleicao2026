// Matemático forense, H23 e H24: funções comuns.
//  - carregarSecoes(db): uma linha por seção com BU nos dois turnos (Presidente): aptos, comparecimento, 13, 22,
//    brancos, nulos, local, tipo e número da urna, carga (data e código), abertura.
//  - testeZona(secoes, marcadas, medida): diferença da variação 1º → 2º turno (ou do nível de um turno) entre as seções
//    marcadas e a média ponderada das não marcadas da MESMA zona (ou do mesmo local), somada com peso de cada seção, e
//    teste de permutação: sorteia, dentro de cada zona (ou local), quais seções são "marcadas", mantendo o número delas.
// Nenhuma função grava título ou CPF.
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';

export const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'matematico-forense');
export const chave = (r) => `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
export const DIA = { 1: '2026-10-04', 2: '2026-10-25' };

/** Seções com BU completo nos dois turnos, com os votos de Presidente. Map chave → {t1, t2, ...}. */
export function carregarSecoes(db) {
  const S = new Map();
  const sec = db.prepare(`SELECT turno, uf, municipio, zona, secao, local, situacao, tipo_urna, numero_interno_urna, modelo_urna, data_hora_carga,
    codigo_carga, abertura, encerramento, comparecimento, sem_biometria, por_biometria, por_biografia FROM secao`);
  for (const r of sec.iterate()) {
    if (r.situacao !== 'completa') continue;
    const k = chave(r);
    const s = S.get(k) ?? { k, uf: r.uf, municipio: r.municipio, zona: r.zona, secao: r.secao };
    s[`t${r.turno}`] = { local: r.local, tipo: r.tipo_urna, urna: r.numero_interno_urna, modelo: r.modelo_urna, carga: r.data_hora_carga, codigo: r.codigo_carga,
      abertura: r.abertura, encerramento: r.encerramento, comp: r.comparecimento, semBio: r.sem_biometria, porBio: r.por_biometria, porBiografia: r.por_biografia,
      aptos: 0, v13: 0, v22: 0, nominal: 0, branco: 0, nulo: 0 };
    S.set(k, s);
  }
  const votos = db.prepare('SELECT turno, uf, municipio, zona, secao, tipo_voto, numero, quantidade FROM voto_bu WHERE cargo = 1');
  for (const r of votos.iterate()) {
    const t = S.get(chave(r))?.[`t${r.turno}`];
    if (!t) continue;
    if (r.tipo_voto === 'nominal') {
      t.nominal += r.quantidade;
      if (r.numero === 13) t.v13 += r.quantidade;
      else if (r.numero === 22) t.v22 += r.quantidade;
    } else if (r.tipo_voto === 'branco') t.branco += r.quantidade;
    else if (r.tipo_voto === 'nulo') t.nulo += r.quantidade;
  }
  // Aptos da eleição federal (a que tem o cargo 1)
  const aptos = db.prepare(`SELECT e.turno, e.uf, e.municipio, e.zona, e.secao, e.aptos FROM secao_eleicao e WHERE e.eleicao IN (6257, 6258)`);
  for (const r of aptos.iterate()) {
    const t = S.get(chave(r))?.[`t${r.turno}`];
    if (t) t.aptos = r.aptos;
  }
  for (const [k, s] of S) if (!s.t1 || !s.t2) S.delete(k);
  return S;
}

/** Medidas por seção. Devolve null quando a medida não existe (denominador zero). */
export const MEDIDAS = {
  comparecimento: (t) => (t.aptos ? (100 * t.comp) / t.aptos : null),
  parcela13: (t) => (t.v13 + t.v22 ? (100 * t.v13) / (t.v13 + t.v22) : null),
  brancosNulos: (t) => (t.comp ? (100 * (t.branco + t.nulo)) / t.comp : null),
};
export const PESO = { comparecimento: (t) => t.aptos, parcela13: (t) => t.v13 + t.v22, brancosNulos: (t) => t.comp };

function rng(semente) {
  let x = semente >>> 0 || 1;
  return () => {
    x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
    return x / 4294967296;
  };
}

/**
 * Compara as seções marcadas com as não marcadas do mesmo grupo (zona ou local).
 * modo 'variacao': valor = medida(2º) − medida(1º); modo 't1' / 't2': nível no turno.
 * grupo: 'zona' (uf/zona) ou 'local' (uf/município/zona/local do turno do nível, ou do 2º turno na variação).
 * Retorna: n marcadas usadas, efeito (média ponderada de marcada − média ponderada do grupo sem marcadas), em pontos
 * percentuais, e p de permutação bilateral (sorteios dentro do grupo).
 */
export function testeZona(S, marcadas, medida, { modo = 'variacao', grupo = 'zona', sorteios = 2000, semente = 20261030 } = {}) {
  const f = MEDIDAS[medida];
  const valor = (s) => {
    if (modo === 'variacao') {
      const a = f(s.t1); const b = f(s.t2);
      return a === null || b === null ? null : b - a;
    }
    return f(s[modo]);
  };
  const peso = (s) => (modo === 'variacao' ? Math.min(PESO[medida](s.t1), PESO[medida](s.t2)) : PESO[medida](s[modo]));
  const tl = modo === 't1' ? 't1' : 't2';
  const G = new Map();
  for (const s of S.values()) {
    const v = valor(s);
    const w = peso(s);
    if (v === null || !w) continue;
    const g = grupo === 'zona' ? `${s.uf}/${s.zona}` : `${s.uf}/${s.municipio}/${s.zona}/${s[tl].local}`;
    const l = G.get(g) ?? [];
    l.push({ v, w, m: marcadas.has(s.k) });
    G.set(g, l);
  }
  // Só grupos com ao menos 1 marcada e 1 não marcada. Por grupo: totais de v·w e w; a estatística de um sorteio só
  // precisa das somas das sorteadas: Σ_m (v − ref)·w, com ref = (Σvw − Σ_m vw) / (Σw − Σ_m w).
  const grupos = [...G.values()].filter((l) => l.some((x) => x.m) && l.some((x) => !x.m))
    .map((l) => ({ l, k: l.filter((x) => x.m).length, svw: l.reduce((a, x) => a + x.v * x.w, 0), sw: l.reduce((a, x) => a + x.w, 0) }));
  const estat = (escolha) => {
    let soma = 0; let pesoTot = 0;
    for (const g of grupos) {
      let mvw = 0; let mw = 0;
      for (const i of escolha(g)) { mvw += g.l[i].v * g.l[i].w; mw += g.l[i].w; }
      const ref = (g.svw - mvw) / (g.sw - mw);
      soma += mvw - ref * mw; pesoTot += mw;
    }
    return soma / pesoTot;
  };
  const obs = estat((g) => g.l.map((x, i) => (x.m ? i : -1)).filter((i) => i >= 0));
  const n = grupos.reduce((a, g) => a + g.k, 0);
  const r = rng(semente);
  let extremos = 0;
  const sim = [];
  for (let b = 0; b < sorteios; b++) {
    const e = estat((g) => {
      const idx = new Set();
      while (idx.size < g.k) idx.add(Math.floor(r() * g.l.length));
      return idx;
    });
    sim.push(e);
    if (Math.abs(e) >= Math.abs(obs) - 1e-12) extremos++;
  }
  sim.sort((a, b) => a - b);
  return { n, grupos: grupos.length, efeito: obs, p: (extremos + 1) / (sorteios + 1), nulo95: [sim[Math.floor(0.025 * sorteios)], sim[Math.floor(0.975 * sorteios)]] };
}

/** Soma de votos de um conjunto de seções nos dois turnos. */
export function somar(S, ks) {
  const z = () => ({ secoes: 0, aptos: 0, comp: 0, v13: 0, v22: 0, branco: 0, nulo: 0 });
  const o = { t1: z(), t2: z() };
  for (const k of ks) {
    const s = S.get(k);
    if (!s) continue;
    for (const t of ['t1', 't2']) {
      o[t].secoes++;
      for (const c of ['aptos', 'comp', 'v13', 'v22', 'branco', 'nulo']) o[t][c] += s[t][c];
    }
  }
  return o;
}
