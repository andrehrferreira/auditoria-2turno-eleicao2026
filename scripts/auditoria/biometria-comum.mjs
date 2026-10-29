// Funções comuns aos scripts de biometria e mesários (Auditor B): leitura dos perfis de seção, do cadastro por
// seção (biometria-cadastro.mjs), das seções agregadas e estatística simples (quantis, Spearman, MQO com efeito fixo).
import { createReadStream, existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

export const DIR_SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'biometria');
// Banco: sempre pela cópia de leitura (src/banco-leitura.js), para não concorrer com a carga no primário
export { abrirLeitura };
export const ELEICAO_PRESIDENTE = { 1: 6257, 2: 6258 };
export const chave = (s) => `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`;

/** Perfis de seção de um turno (src/perfil-secoes.js), um por vez. `ufs` limita as UFs. */
export async function* perfis(turno, ufs = null) {
  const dir = path.join(DIR_DADOS, 'parsed', `${turno}t`, 'perfil');
  for (const arq of (await readdir(dir)).filter((n) => /^[a-z]{2}\.jsonl$/.test(n)).sort()) {
    if (ufs && !ufs.includes(arq.slice(0, 2))) continue;
    for await (const linha of createInterface({ input: createReadStream(path.join(dir, arq)), crlfDelay: Infinity })) {
      if (linha) yield JSON.parse(linha);
    }
  }
}

/** UFs com perfil completo no turno (arquivo presente e sem processo de geração escrevendo: tamanho estável é conferido por quem chama). */
export async function ufsComPerfil(turno) {
  const dir = path.join(DIR_DADOS, 'parsed', `${turno}t`, 'perfil');
  return (await readdir(dir)).filter((n) => /^[a-z]{2}\.jsonl$/.test(n)).map((n) => n.slice(0, 2)).sort();
}

/** Cadastro por seção (saída de biometria-cadastro.mjs): Map chave → { eleitores, biometria, faixas, semBioFaixas }. */
export async function lerCadastro() {
  const mapa = new Map();
  for await (const linha of createInterface({ input: createReadStream(path.join(DIR_SAIDA, 'cadastro-secao.jsonl')), crlfDelay: Infinity })) {
    if (!linha) continue;
    const r = JSON.parse(linha);
    mapa.set(r.k, r);
  }
  return mapa;
}

/** Seções agregadas do turno, do banco: Map chave da principal → [chaves das agregadas]. */
export async function lerAgregadas(turno) {
  const { db } = await abrirLeitura();
  const mapa = new Map();
  for (const a of db.prepare('SELECT uf, municipio, zona, secao, secao_principal FROM secao_agregada WHERE turno = ?').all(turno)) {
    const k = chave({ ...a, secao: a.secao_principal });
    if (!mapa.has(k)) mapa.set(k, []);
    mapa.get(k).push(chave(a));
  }
  db.close();
  return mapa;
}

/** Soma o cadastro da seção principal e das agregadas. null se a principal não estiver no cadastro. */
export function cadastroDaUrna(cadastro, agregadas, k) {
  const principal = cadastro.get(k);
  if (!principal) return null;
  const soma = { eleitores: 0, biometria: 0, faixas: {}, semBioFaixas: {}, secoes: 0, faltando: 0 };
  for (const kk of [k, ...(agregadas.get(k) ?? [])]) {
    const c = cadastro.get(kk);
    if (!c) { soma.faltando++; continue; }
    soma.secoes++;
    soma.eleitores += c.eleitores;
    soma.biometria += c.biometria;
    for (const [f, v] of Object.entries(c.faixas)) soma.faixas[f] = (soma.faixas[f] ?? 0) + v;
    for (const [f, v] of Object.entries(c.semBioFaixas)) soma.semBioFaixas[f] = (soma.semBioFaixas[f] ?? 0) + v;
  }
  return soma;
}

/** Linha do perfil reduzida ao que os testes usam. */
export function resumir(p) {
  const e = p.bu.eleicoes.find((x) => x.idEleicao === ELEICAO_PRESIDENTE[p.turno]);
  const votos = e?.cargos.find((c) => c.codigoCargo === 1)?.votos ?? {};
  const d = p.bu.detalhamentoComparecimento ?? {};
  return {
    uf: p.uf, municipio: p.municipio, zona: p.zona, secao: p.secao, turno: p.turno,
    tipoUrna: p.bu.urna.tipoUrna, modelo: p.log?.modeloUrna ?? null,
    aptos: e?.aptos ?? null, aptosSecao: e?.aptosSecao ?? null, aptosTTE: e?.aptosTTE ?? 0,
    comparecimento: p.bu.qtdEleitoresCompareceram ?? 0,
    semBio: d.semBiometriaCadastrada ?? 0, porBio: d.porBiometria ?? 0, manual: d.comBiometriaHabilitadosPorAnoNascimento ?? 0,
    v13: votos['13'] ?? 0, v22: votos['22'] ?? 0, votos,
    pacotes: p.pacotesNaSecao,
    // Exterior (ZZ): o BU não traz o detalhamento e o log mostra 100% por ano de nascimento
    temDetalhamento: p.bu.detalhamentoComparecimento != null,
  };
}

export function quantil(ordenados, p) {
  if (!ordenados.length) return null;
  return ordenados[Math.min(ordenados.length - 1, Math.floor(p * (ordenados.length - 1)))];
}
export function resumoDist(valores, casas = 4) {
  const s = Float64Array.from(valores).sort();
  const r = (x) => (x == null ? null : +x.toFixed(casas));
  return { n: s.length, p01: r(quantil(s, 0.01)), p10: r(quantil(s, 0.1)), mediana: r(quantil(s, 0.5)), p90: r(quantil(s, 0.9)), p99: r(quantil(s, 0.99)), p999: r(quantil(s, 0.999)), maximo: r(s.at(-1)) };
}

function ranks(v) {
  const ordem = Array.from(v, (x, i) => [x, i]).sort((a, b) => a[0] - b[0]);
  const r = new Float64Array(v.length);
  for (let i = 0; i < ordem.length;) {
    let j = i;
    while (j + 1 < ordem.length && ordem[j + 1][0] === ordem[i][0]) j++;
    for (let k = i; k <= j; k++) r[ordem[k][1]] = (i + j) / 2;
    i = j + 1;
  }
  return r;
}
export function pearson(a, b) {
  const n = a.length;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
  ma /= n; mb /= n;
  let sab = 0;
  let saa = 0;
  let sbb = 0;
  for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  return saa && sbb ? sab / Math.sqrt(saa * sbb) : null;
}
export const spearman = (a, b) => pearson(ranks(a), ranks(b));

/** Subtrai a média do grupo (efeito fixo) de cada coluna. `cols` = arrays paralelos; `grupos` = chave por linha. */
export function demeanar(cols, grupos) {
  const soma = new Map();
  for (let i = 0; i < grupos.length; i++) {
    let g = soma.get(grupos[i]);
    if (!g) { g = { n: 0, s: new Float64Array(cols.length) }; soma.set(grupos[i], g); }
    g.n++;
    for (let c = 0; c < cols.length; c++) g.s[c] += cols[c][i];
  }
  return cols.map((col, c) => Float64Array.from(col, (x, i) => { const g = soma.get(grupos[i]); return x - g.s[c] / g.n; }));
}

function inverter(m) {
  const k = m.length;
  const a = m.map((linha, i) => [...linha, ...Array.from({ length: k }, (_, j) => (i === j ? 1 : 0))]);
  for (let i = 0; i < k; i++) {
    let p = i;
    for (let r = i + 1; r < k; r++) if (Math.abs(a[r][i]) > Math.abs(a[p][i])) p = r;
    [a[i], a[p]] = [a[p], a[i]];
    const d = a[i][i];
    if (Math.abs(d) < 1e-12) throw new Error('matriz singular');
    for (let j = 0; j < 2 * k; j++) a[i][j] /= d;
    for (let r = 0; r < k; r++) {
      if (r === i) continue;
      const f = a[r][i];
      if (f) for (let j = 0; j < 2 * k; j++) a[r][j] -= f * a[i][j];
    }
  }
  return a.map((linha) => linha.slice(k));
}

/**
 * MQO de y em X (colunas já demeanadas se houver efeito fixo; sem intercepto nesse caso), com erro-padrão
 * robusto agrupado por `clusters` (Liang-Zeger, sem correção de graus de liberdade além de G/(G-1)).
 */
export function mqo(y, X, nomes, clusters, { intercepto = false } = {}) {
  const n = y.length;
  const cols = intercepto ? [Float64Array.from({ length: n }, () => 1), ...X] : X;
  const nomesC = intercepto ? ['(intercepto)', ...nomes] : nomes;
  const k = cols.length;
  const xtx = Array.from({ length: k }, () => new Array(k).fill(0));
  const xty = new Array(k).fill(0);
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < k; a++) {
      const xa = cols[a][i];
      xty[a] += xa * y[i];
      for (let b = a; b < k; b++) xtx[a][b] += xa * cols[b][i];
    }
  }
  for (let a = 0; a < k; a++) for (let b = 0; b < a; b++) xtx[a][b] = xtx[b][a];
  const inv = inverter(xtx);
  const beta = inv.map((linha) => linha.reduce((s, v, j) => s + v * xty[j], 0));
  // resíduos e "carne" do sanduíche por cluster
  const porCluster = new Map();
  let sqr = 0;
  let sqt = 0;
  let my = 0;
  for (let i = 0; i < n; i++) my += y[i];
  my /= n;
  for (let i = 0; i < n; i++) {
    let yhat = 0;
    for (let a = 0; a < k; a++) yhat += beta[a] * cols[a][i];
    const e = y[i] - yhat;
    sqr += e * e;
    sqt += (y[i] - my) ** 2;
    let g = porCluster.get(clusters[i]);
    if (!g) { g = new Array(k).fill(0); porCluster.set(clusters[i], g); }
    for (let a = 0; a < k; a++) g[a] += cols[a][i] * e;
  }
  const meio = Array.from({ length: k }, () => new Array(k).fill(0));
  for (const g of porCluster.values()) for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) meio[a][b] += g[a] * g[b];
  const G = porCluster.size;
  const fator = G / (G - 1);
  const v = inv.map((linha, i) => inv.map((_, j) => linha.reduce((s, x, a) => s + x * meio[a].reduce((t, m, b) => t + m * inv[b][j], 0), 0) * fator));
  return {
    n, clusters: G, r2: +(1 - sqr / sqt).toFixed(4),
    coef: Object.fromEntries(nomesC.map((nm, i) => [nm, { beta: +beta[i].toPrecision(4), ep: +Math.sqrt(v[i][i]).toPrecision(3), t: +(beta[i] / Math.sqrt(v[i][i])).toFixed(1) }])),
  };
}

export const existe = existsSync;
export const lerJson = async (arq) => JSON.parse(await readFile(arq, 'utf8'));

/** P(X ≥ k) para X ~ Poisson(λ). */
export function caudaPoisson(k, lambda) {
  if (k <= 0) return 1;
  let termo = Math.exp(-lambda);
  let acumulado = termo;
  for (let i = 1; i < k; i++) { termo *= lambda / i; acumulado += termo; }
  return Math.max(0, 1 - acumulado);
}

/** Linhas da varredura de logs (biometria-varredura-logs.mjs), uma seção por vez. */
export async function* varredura() {
  const dir = path.join(DIR_SAIDA, 'varredura');
  for (const arq of (await readdir(dir)).filter((n) => /^[a-z]{2}\.jsonl$/.test(n)).sort()) {
    for await (const linha of createInterface({ input: createReadStream(path.join(dir, arq)), crlfDelay: Infinity })) {
      if (linha) yield JSON.parse(linha);
    }
  }
}
