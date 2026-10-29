// H13, método ecológico: regressão de Goodman com controles, por região e por UF do Nordeste.
// Pergunta: os eleitores liberados sem biometria votam no 13 ACIMA do que explicam o perfil do eleitorado, a zona e
// os eleitores biométricos da mesma seção? O voto é secreto: o voto dos liberados só pode ser ESTIMADO.
//
// Modelo (forma de parcela, ponderada pelo comparecimento n; equivale ao modelo de contagem
//   votos_c = a_c·liberados + b_c·biométricos + controles, com variância proporcional a n):
//   v_c/n = α_zona + Σ_g d_{c,g}·(G_g/n) + γ_c'·X + erro,   c ∈ {13, 22}
//   d_{c,g} = a_{c,g} − b_c (parcela do grupo g que votou em c menos a dos biométricos da mesma seção).
// Definições de liberado:
//   L2 (BU): sem_biometria + por_biografia (todo habilitado sem digital). Um grupo: L.
//   L1 (log): habilitados_pelo_mesario ("Mesário … habilitou o eleitor"). Grupos: M (mesário) e O (outros sem
//            digital = L2 − M). Biométricos são a referência nos dois.
// Especificações: M0 sem controle (Goodman puro, com intercepto), M1 efeito fixo de zona, M2 zona + controles do
//   perfil do eleitorado (% sem biometria cadastrada, 60+, 16–24, escolaridade baixa, superior, % indígena,
//   % quilombola, log do eleitorado, local indígena, local quilombola), M2s = M2 sem o % sem biometria cadastrada
//   (sensibilidade: esse controle quase determina sem_biometria e pode absorver parte do efeito dos liberados).
//   Controle sem variação dentro das zonas do subconjunto (ex.: local quilombola em AL) sai da regressão.
// Níveis: a parcela de cada grupo é a média, ponderada pelo tamanho do grupo, da parcela prevista na própria seção.
//   Diferença total (liberados − biométricos) = condicional (mesma seção e perfil: d) + composição (onde estão).
// Incerteza: bootstrap por município (os municípios são sorteados com reposição; zonas ficam dentro do município),
//   conjunto para os dois turnos, para comparar 2º × 1º turno e M2 × M0 no mesmo sorteio.
// Uso: node --max-old-space-size=12000 scripts/auditoria/liberacao-ecologico-regressao.mjs [--reps 400] [--semente 2026]
// Saída: data/parsed/auditoria/liberacao/ecologico-resumo.json, ecologico-tabela.csv, ecologico-extremas.csv
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { categoria, lerTabela } from './forense-lib.mjs';

const { values } = parseArgs({ options: { reps: { type: 'string', default: '400' }, semente: { type: 'string', default: '2026' } } });
const REPS = Number(values.reps);
const DIR_SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'liberacao');
const DIR_FORENSE = path.join(DIR_DADOS, 'parsed', 'auditoria', 'forense');
const VARREDURA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'biometria', 'varredura');

export const REGIOES = {
  Nordeste: ['al', 'ba', 'ce', 'ma', 'pb', 'pe', 'pi', 'rn', 'se'],
  Norte: ['ac', 'am', 'ap', 'pa', 'ro', 'rr', 'to'],
  'Centro-Oeste': ['df', 'go', 'ms', 'mt'],
  Sudeste: ['es', 'mg', 'rj', 'sp'],
  Sul: ['pr', 'rs', 'sc'],
};
const regiaoDe = Object.fromEntries(Object.entries(REGIOES).flatMap(([r, ufs]) => ufs.map((u) => [u, r])));
const SUBCONJUNTOS = [
  { nome: 'Brasil', ufs: Object.values(REGIOES).flat() },
  ...Object.entries(REGIOES).map(([nome, ufs]) => ({ nome, ufs })),
  ...REGIOES.Nordeste.map((u) => ({ nome: u.toUpperCase(), ufs: [u] })),
];
const CONTROLES = ['cadSemBio', 'p60', 'p16a24', 'pBaixa', 'pSup', 'pInd', 'pQuil', 'logEle', 'dInd', 'dQuil'];
const DEFS = { L2: { grupos: ['L'], cols: ['l'] }, L1: { grupos: ['M', 'O'], cols: ['m', 'o'] } };
const SPECS = ['M0', 'M1', 'M2', 'M2s'];
// controles de cada especificação (M2s = M2 sem % sem biometria no cadastro, que determina quase mecanicamente sem_biometria)
const CTRL_IDX = { M0: [], M1: [], M2: CONTROLES.map((_, i) => i), M2s: CONTROLES.map((_, i) => i).filter((i) => CONTROLES[i] !== 'cadSemBio') };

// ---------- carga ----------

async function carregarPerfil() {
  const campos = ['eleitores', 'biometria', 'idade60', 'idade16a24', 'escol_baixa', 'superior', 'indigena', 'quilombola'];
  const mapa = new Map();
  for (const uf of Object.values(REGIOES).flat()) {
    for (const p of await lerTabela(path.join(DIR_FORENSE, 'perfil', `${uf}.csv`), campos)) mapa.set(`${p.uf}/${p.municipio}/${p.zona}/${p.secao}`, p);
  }
  return mapa;
}

async function carregarLocais() {
  const porTurno = { 1: new Map(), 2: new Map() };
  for await (const l of createInterface({ input: createReadStream(path.join(DIR_FORENSE, 'locais.csv'), 'utf8'), crlfDelay: Infinity })) {
    const c = l.split(';');
    if (c[0] !== '1' && c[0] !== '2') continue;
    porTurno[c[0]].set(`${c[1]}/${c[2]}/${c[3]}/${c[4]}`, { nome_local: c[7], tipo_local: c[8] });
  }
  return porTurno;
}

/** 1º turno da BA: o log do 1º turno não está no banco; a varredura lê o dia do 1º turno no log cumulativo do 2º. */
async function carregarVarreduraD1(uf) {
  const arq = path.join(VARREDURA, `${uf}.jsonl`);
  const d1 = new Map();
  const d2 = new Map();
  if (!existsSync(arq)) return { d1, d2 };
  for await (const l of createInterface({ input: createReadStream(arq), crlfDelay: Infinity })) {
    if (!l) continue;
    const r = JSON.parse(l);
    const k = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
    if (r.d1?.mesmaSecao && r.d1.classes) d1.set(k, r.d1.classes.manualMesario);
    if (r.d2?.classes) d2.set(k, r.d2.classes.manualMesario);
  }
  return { d1, d2 };
}

async function carregarTurno(db, turno, perfil, locais, l1Extra) {
  const principal = new Map();
  for (const a of db.prepare('SELECT uf, municipio, zona, secao, secao_principal FROM secao_agregada WHERE turno = ?').all(turno)) {
    principal.set(`${a.uf}/${a.municipio}/${a.zona}/${a.secao}`, `${a.uf}/${a.municipio}/${a.zona}/${a.secao_principal}`);
  }
  const perfilSecao = new Map();
  for (const [k, p] of perfil) {
    const kp = principal.get(k) ?? k;
    let s = perfilSecao.get(kp);
    if (!s) { s = { eleitores: 0, biometria: 0, idade60: 0, idade16a24: 0, escol_baixa: 0, superior: 0, indigena: 0, quilombola: 0 }; perfilSecao.set(kp, s); }
    for (const c of Object.keys(s)) s[c] += p[c];
  }
  const votos = new Map();
  for (const v of db.prepare("SELECT uf, municipio, zona, secao, numero, quantidade FROM voto_bu WHERE turno = ? AND cargo = 1 AND tipo_voto = 'nominal' AND numero IN (13, 22)").all(turno)) {
    const k = `${v.uf}/${v.municipio}/${v.zona}/${v.secao}`;
    const r = votos.get(k) ?? { v13: 0, v22: 0 };
    if (v.numero === 13) r.v13 += v.quantidade; else r.v22 += v.quantidade;
    votos.set(k, r);
  }
  const linhas = db.prepare(`SELECT s.uf, s.municipio, s.zona, s.secao, s.comparecimento n, s.sem_biometria sb, s.por_biometria pb, s.por_biografia pbg,
      p.habilitados_pelo_mesario mes
    FROM secao s LEFT JOIN perfil_log p ON p.turno = s.turno AND p.uf = s.uf AND p.municipio = s.municipio AND p.zona = s.zona AND p.secao = s.secao
    WHERE s.turno = ? AND s.situacao = 'completa' AND s.uf != 'zz'`).all(turno);
  const descarte = { lidas: linhas.length, semDetalhamento: 0, menos20: 0, semPerfil: 0, semVoto: 0, l1Inconsistente: 0, l1SemLog: 0 };
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
    let M = r.mes ?? l1Extra.get(k) ?? null;
    if (M == null) descarte.l1SemLog++;
    else if (M > L2) { descarte.l1Inconsistente++; M = null; }
    const local = locais.get(k) ?? {};
    const e = pf.eleitores;
    const cat = categoria({ uf: r.uf, nome_local: local.nome_local, tipo_local: local.tipo_local, pInd: pf.indigena / e, pQuil: pf.quilombola / e });
    secoes.push({
      k, uf: r.uf, mun: `${r.uf}/${r.municipio}`, zona: `${r.uf}/${r.municipio}/${r.zona}`, n: r.n, B: r.pb, L2, M, v13: v.v13, v22: v.v22,
      X: {
        cadSemBio: 1 - pf.biometria / e, p60: pf.idade60 / e, p16a24: pf.idade16a24 / e, pBaixa: pf.escol_baixa / e, pSup: pf.superior / e,
        pInd: pf.indigena / e, pQuil: pf.quilombola / e, logEle: Math.log(e), dInd: cat === 'indigena' ? 1 : 0, dQuil: cat === 'quilombola' ? 1 : 0,
      },
    });
  }
  return { secoes, descarte };
}

// ---------- acumuladores por município ----------

/** Colunas de cada seção para a definição: y13, y22, x do(s) grupo(s), controles. Contagens dos grupos. */
function colunasSecao(s, def) {
  const x = def === 'L2' ? [s.L2 / s.n] : [s.M / s.n, (s.L2 - s.M) / s.n];
  const grupos = def === 'L2' ? [s.B, s.L2] : [s.B, s.M, s.L2 - s.M]; // índice 0 = biométricos
  return { y: [s.v13 / s.n, s.v22 / s.n], x, c: CONTROLES.map((c) => s.X[c]), grupos };
}

/**
 * Monta, para (turno, definição), os acumuladores de cada especificação por município.
 * Layout: XtWX (k²) | XtWy13 (k) | XtWy22 (k) | por grupo: S, T13, T22, V (k), R (nx)
 */
function montar(secoes, def) {
  const amostra = secoes.filter((s) => def === 'L2' || s.M != null);
  const nx = DEFS[def].cols.length;
  const linhas = amostra.map((s) => ({ s, ...colunasSecao(s, def) }));
  // médias por zona ponderadas por n (para M1 e M2)
  const zonas = new Map();
  for (const r of linhas) {
    let z = zonas.get(r.s.zona);
    const tam = 2 + nx + CONTROLES.length;
    if (!z) { z = { w: 0, m: new Float64Array(tam) }; zonas.set(r.s.zona, z); }
    const w = r.s.n;
    z.w += w;
    const v = [...r.y, ...r.x, ...r.c];
    for (let i = 0; i < tam; i++) z.m[i] += w * v[i];
  }
  for (const z of zonas.values()) for (let i = 0; i < z.m.length; i++) z.m[i] /= z.w;
  const modelos = {};
  for (const spec of SPECS) {
    const ci = CTRL_IDX[spec];
    const k = spec === 'M0' ? 1 + nx : nx + ci.length;
    const nG = DEFS[def].grupos.length + 1;
    const P = k * k + 2 * k + nG * (3 + k + nx);
    const porMun = new Map();
    for (const r of linhas) {
      const z = zonas.get(r.s.zona).m;
      let X; let y; let ybar;
      if (spec === 'M0') { X = [1, ...r.x]; y = r.y; ybar = [0, 0]; }
      else {
        const xd = r.x.map((v, i) => v - z[2 + i]);
        X = [...xd, ...ci.map((i) => r.c[i] - z[2 + nx + i])];
        ybar = [z[0], z[1]];
        y = [r.y[0] - ybar[0], r.y[1] - ybar[1]];
      }
      let a = porMun.get(r.s.mun);
      if (!a) { a = new Float64Array(P); porMun.set(r.s.mun, a); }
      const w = r.s.n;
      for (let i = 0; i < k; i++) {
        const wi = w * X[i];
        for (let j = 0; j < k; j++) a[i * k + j] += wi * X[j];
        a[k * k + i] += wi * y[0];
        a[k * k + k + i] += wi * y[1];
      }
      let o = k * k + 2 * k;
      for (let g = 0; g < nG; g++) {
        const G = r.grupos[g];
        a[o] += G; a[o + 1] += G * ybar[0]; a[o + 2] += G * ybar[1];
        for (let i = 0; i < k; i++) a[o + 3 + i] += G * X[i];
        for (let i = 0; i < nx; i++) a[o + 3 + k + i] += G * r.x[i];
        o += 3 + k + nx;
      }
    }
    modelos[spec] = { k, nx, nG, P, porMun, colX: spec === 'M0' ? 1 : 0 };
  }
  return { amostra, modelos, zonas };
}

/** Resolve o sistema sem as colunas de variância nula (diagonal ~0); β dessas colunas = 0. */
function resolverAtivo(A, b, k) {
  let maior = 0;
  for (let i = 0; i < k; i++) maior = Math.max(maior, A[i * k + i]);
  const ativos = [];
  for (let i = 0; i < k; i++) if (A[i * k + i] > 1e-12 * maior) ativos.push(i);
  const kk = ativos.length;
  const Ar = new Float64Array(kk * kk);
  ativos.forEach((i, a) => ativos.forEach((j, c) => { Ar[a * kk + c] = A[i * k + j]; }));
  const sol = resolver(Ar, ativos.map((i) => b[i]), kk);
  if (!sol) return null;
  const beta = new Array(k).fill(0);
  ativos.forEach((i, a) => { beta[i] = sol[a]; });
  return beta;
}

function resolver(A, b, k) {
  const M = Array.from({ length: k }, (_, i) => [...A.subarray(i * k, i * k + k), b[i]]);
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
  return M.map((linha, i) => linha[k] / linha[i]);
}

/** Estatísticas de um modelo a partir do acumulador somado. */
function estatisticas(tot, m, def) {
  const { k, nx, nG, colX } = m;
  const A = tot.subarray(0, k * k);
  const b13 = resolverAtivo(A, tot.subarray(k * k, k * k + k), k);
  const b22 = resolverAtivo(A, tot.subarray(k * k + k, k * k + 2 * k), k);
  if (!b13 || !b22) return null;
  const beta = [b13, b22];
  const nivel = [];
  let o = k * k + 2 * k;
  for (let g = 0; g < nG; g++) {
    const S = tot[o];
    const base = [0, 1].map((c) => {
      let v = tot[o + 1 + c];
      for (let i = 0; i < k; i++) v += beta[c][i] * tot[o + 3 + i];
      for (let i = 0; i < nx; i++) v -= beta[c][colX + i] * tot[o + 3 + k + i];
      return v / S;
    });
    const proprio = g === 0 ? [0, 0] : [beta[0][colX + g - 1], beta[1][colX + g - 1]];
    nivel.push({ S, base, share: [base[0] + proprio[0], base[1] + proprio[1]], d: proprio });
    o += 3 + k + nx;
  }
  const tp = ([a, b]) => a / (a + b);
  const B = nivel[0];
  const out = { bio: { S: B.S, p13: B.share[0], p22: B.share[1], tp: tp(B.share) } };
  DEFS[def].grupos.forEach((nome, i) => {
    const G = nivel[i + 1];
    const tpG = tp(G.share);
    const tp0 = tp(G.base);
    out[nome] = {
      S: G.S, p13: G.share[0], p22: G.share[1], d13: G.d[0], d22: G.d[1], tp: tpG, tp0,
      difTotal: tpG - out.bio.tp, difCond: tpG - tp0, difComp: tp0 - out.bio.tp,
      votos13Extra: G.d[0] * G.S, margemExtra: (G.d[0] - G.d[1]) * G.S,
    };
  });
  return out;
}

// ---------- execução ----------

const inicio = Date.now();
const log = (m) => console.error(`[${((Date.now() - inicio) / 1000).toFixed(0)}s] ${m}`);
const { db, ponteiro } = await abrirLeitura();
const perfil = await carregarPerfil();
log(`perfil: ${perfil.size} seções`);
const locais = await carregarLocais();
const varrBa = await carregarVarreduraD1('ba');
const dados = {};
const validacaoVarredura = { secoes: 0, iguais: 0 };
for (const turno of [2, 1]) {
  const extra = turno === 1 ? varrBa.d1 : new Map();
  dados[turno] = await carregarTurno(db, turno, perfil, locais[turno], extra);
  log(`turno ${turno}: ${dados[turno].secoes.length} seções; descarte ${JSON.stringify(dados[turno].descarte)}`);
}
// Validação: no 2º turno da BA, a classe "mesário identificado" da varredura deve bater com habilitados_pelo_mesario do banco
for (const s of dados[2].secoes) {
  if (s.uf !== 'ba' || s.M == null || !varrBa.d2.has(s.k)) continue;
  validacaoVarredura.secoes++;
  if (varrBa.d2.get(s.k) === s.M) validacaoVarredura.iguais++;
}
db.close();

const ufsCom = (turno, def) => new Set(dados[turno].secoes.filter((s) => def === 'L2' || s.M != null).map((s) => s.uf));
const cobertura = {};
for (const t of [1, 2]) for (const def of Object.keys(DEFS)) cobertura[`${t}t_${def}`] = [...ufsCom(t, def)].sort();

const est = {};
for (const t of [1, 2]) for (const def of Object.keys(DEFS)) { est[`${t}|${def}`] = montar(dados[t].secoes, def); log(`montado ${t}|${def}: ${est[`${t}|${def}`].amostra.length} seções`); }

// Modelos avaliados em cada subconjunto: 2º turno, 1º turno e 2º turno restrito às UFs que têm o 1º turno daquela definição
const chavesModelo = [];
for (const def of Object.keys(DEFS)) for (const spec of SPECS) {
  chavesModelo.push({ id: `2t|${def}|${spec}`, t: 2, def, spec, filtroUf: null });
  chavesModelo.push({ id: `1t|${def}|${spec}`, t: 1, def, spec, filtroUf: null });
  chavesModelo.push({ id: `2tR|${def}|${spec}`, t: 2, def, spec, filtroUf: ufsCom(1, def) });
}

function rng(semente) {
  let a = semente >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function avaliar(munis, pesos) {
  const r = {};
  for (const cm of chavesModelo) {
    const m = est[`${cm.t}|${cm.def}`].modelos[cm.spec];
    const tot = new Float64Array(m.P);
    let usados = 0;
    for (let i = 0; i < munis.length; i++) {
      const w = pesos[i];
      if (!w) continue;
      if (cm.filtroUf && !cm.filtroUf.has(munis[i].slice(0, 2))) continue;
      const a = m.porMun.get(munis[i]);
      if (!a) continue;
      usados++;
      for (let j = 0; j < m.P; j++) tot[j] += w * a[j];
    }
    r[cm.id] = usados >= 5 ? estatisticas(tot, m, cm.def) : null;
  }
  return r;
}

// achata as estatísticas em pares nome → número
function achatar(r) {
  const f = {};
  for (const [id, e] of Object.entries(r)) {
    if (!e) continue;
    for (const [g, o] of Object.entries(e)) for (const [c, v] of Object.entries(o)) f[`${id}|${g}|${c}`] = v;
  }
  // derivados: 2º − 1º turno (mesmas UFs) e parte que some com os controles
  for (const def of Object.keys(DEFS)) for (const g of DEFS[def].grupos) {
    for (const spec of SPECS) {
      const a = f[`2tR|${def}|${spec}|${g}|difCond`]; const b = f[`1t|${def}|${spec}|${g}|difCond`];
      if (a != null && b != null) f[`delta2t1t|${def}|${spec}|${g}|difCond`] = a - b;
    }
    for (const t of ['2t', '1t']) {
      const c0 = f[`${t}|${def}|M0|${g}|difCond`]; const c2 = f[`${t}|${def}|M2|${g}|difCond`];
      if (c0 != null && c2 != null) f[`${t}|${def}|somePct|${g}|difCond`] = 1 - c2 / c0;
      const c1 = f[`${t}|${def}|M1|${g}|difCond`];
      if (c0 != null && c1 != null) f[`${t}|${def}|someZonaPct|${g}|difCond`] = 1 - c1 / c0;
    }
  }
  return f;
}

/** Fração de seções em que a parcela implícita do grupo (na própria seção) sai de [0, 1]: falha da suposição ecológica. */
function foraDoIntervalo(sub, pontos) {
  const res = {};
  for (const t of [1, 2]) for (const def of Object.keys(DEFS)) {
    const { amostra, modelos, zonas } = est[`${t}|${def}`];
    const m = modelos.M2;
    const nx = m.nx;
    const ids = `${t}t|${def}|M2`;
    const e = pontos[ids];
    if (!e) continue;
    // recalcula β do subconjunto (mesmo que em `estatisticas`) a partir dos acumuladores
    const tot = new Float64Array(m.P);
    for (const [mun, a] of m.porMun) if (sub.ufs.includes(mun.slice(0, 2))) for (let j = 0; j < m.P; j++) tot[j] += a[j];
    const k = m.k;
    const beta = [resolverAtivo(tot.subarray(0, k * k), tot.subarray(k * k, k * k + k), k), resolverAtivo(tot.subarray(0, k * k), tot.subarray(k * k + k, k * k + 2 * k), k)];
    const cont = { secoes: 0, bio13: 0, lib13: 0, lib22: 0, libSoma: 0 };
    for (const s of amostra) {
      if (!sub.ufs.includes(s.uf)) continue;
      const r = colunasSecao(s, def);
      const z = zonas.get(s.zona).m;
      const X = [...r.x.map((v, i) => v - z[2 + i]), ...r.c.map((v, i) => v - z[2 + nx + i])];
      const y0 = [0, 1].map((c) => { let v = z[c]; for (let i = 0; i < k; i++) v += beta[c][i] * X[i]; for (let i = 0; i < nx; i++) v -= beta[c][i] * r.x[i]; return v; });
      const lib = [y0[0] + beta[0][0], y0[1] + beta[1][0]]; // primeiro grupo de liberados (L ou M)
      cont.secoes++;
      if (y0[0] < 0 || y0[0] > 1) cont.bio13++;
      if (lib[0] < 0 || lib[0] > 1) cont.lib13++;
      if (lib[1] < 0 || lib[1] > 1) cont.lib22++;
      if (lib[0] + lib[1] > 1 || lib[0] < 0 || lib[1] < 0) cont.libSoma++;
    }
    res[ids] = cont;
  }
  return res;
}

const resultado = {
  geradoEm: new Date().toISOString(), banco: ponteiro?.arquivo, reps: REPS, semente: Number(values.semente),
  descarte: { 1: dados[1].descarte, 2: dados[2].descarte }, cobertura, validacaoVarredura,
  totais: {}, subconjuntos: {},
};
for (const t of [1, 2]) {
  const s = dados[t].secoes;
  const soma = (f) => s.reduce((a, x) => a + f(x), 0);
  resultado.totais[`${t}t`] = { secoes: s.length, n: soma((x) => x.n), B: soma((x) => x.B), L2: soma((x) => x.L2), M: soma((x) => x.M ?? 0), secoesComL1: s.filter((x) => x.M != null).length, v13: soma((x) => x.v13), v22: soma((x) => x.v22) };
}

const linhasCsv = [];
for (const sub of SUBCONJUNTOS) {
  const munis = [...est['2|L2'].modelos.M0.porMun.keys()].filter((m) => sub.ufs.includes(m.slice(0, 2))).sort();
  if (!munis.length) continue;
  const pontos = avaliar(munis, new Float64Array(munis.length).fill(1));
  const ponto = achatar(pontos);
  const amostras = Object.fromEntries(Object.keys(ponto).map((c) => [c, []]));
  const sorteio = rng(Number(values.semente) + SUBCONJUNTOS.indexOf(sub));
  for (let r = 0; r < REPS; r++) {
    const pesos = new Float64Array(munis.length);
    for (let i = 0; i < munis.length; i++) pesos[Math.floor(sorteio() * munis.length)]++;
    const f = achatar(avaliar(munis, pesos));
    for (const c of Object.keys(amostras)) if (f[c] != null && Number.isFinite(f[c])) amostras[c].push(f[c]);
  }
  const resumo = {};
  for (const [c, v] of Object.entries(ponto)) {
    const a = Float64Array.from(amostras[c]).sort();
    const media = a.reduce((x, y) => x + y, 0) / a.length;
    const ep = Math.sqrt(a.reduce((x, y) => x + (y - media) ** 2, 0) / (a.length - 1));
    const q = (p) => a[Math.min(a.length - 1, Math.max(0, Math.round(p * (a.length - 1))))];
    resumo[c] = { est: v, ep, ic95: [q(0.025), q(0.975)], reps: a.length };
  }
  resultado.subconjuntos[sub.nome] = { ufs: sub.ufs, municipios: munis.length, resumo, foraDoIntervalo: foraDoIntervalo(sub, pontos) };
  for (const [c, o] of Object.entries(resumo)) linhasCsv.push([sub.nome, ...c.split('|'), o.est, o.ep, o.ic95[0], o.ic95[1]].join(';'));
  log(`${sub.nome}: ${munis.length} municípios`);
}

// Testes: diferença condicional (M2) = 0, por subconjunto, definição, turno e 2º − 1º. z = estimativa / EP do bootstrap.
const phi = (z) => { const t = 1 / (1 + 0.2316419 * Math.abs(z)); const d = 0.3989423 * Math.exp(-z * z / 2); const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };
const testes = [];
for (const [nome, sub] of Object.entries(resultado.subconjuntos)) {
  for (const def of Object.keys(DEFS)) {
    const g = DEFS[def].grupos[0];
    for (const tipo of ['2t', '1t', 'delta2t1t']) {
      const o = sub.resumo[`${tipo}|${def}|M2|${g}|difCond`];
      if (!o || !(o.ep > 0)) continue;
      const z = o.est / o.ep;
      testes.push({ subconjunto: nome, def, grupo: g, tipo, est: o.est, ep: o.ep, z, p: 2 * (1 - phi(Math.abs(z))), confirmatorio: nome === 'Nordeste' && (tipo === '2t' || tipo === 'delta2t1t') });
    }
  }
}
const m = testes.length;
const ordem = [...testes].sort((a, b) => a.p - b.p);
for (const t of ordem) t.bonferroni = Math.min(1, t.p * m);
for (let i = ordem.length - 1, menor = 1; i >= 0; i--) { menor = Math.min(menor, (ordem[i].p * m) / (i + 1)); ordem[i].bh = Math.min(1, menor); }
resultado.testes = { total: m, lista: testes };

// Seções extremas para conferência no BU bruto: maior taxa L1 com ≥ 100 votantes no Nordeste, 2º turno
const ext = dados[2].secoes.filter((s) => regiaoDe[s.uf] === 'Nordeste' && s.M != null && s.n >= 100)
  .sort((a, b) => b.M / b.n - a.M / a.n).slice(0, 20)
  .map((s) => [s.k, s.n, s.B, s.L2, s.M, (s.M / s.n).toFixed(3), s.v13, s.v22, (s.v13 / (s.v13 + s.v22)).toFixed(3)].join(';'));

await mkdir(DIR_SAIDA, { recursive: true });
await writeFile(path.join(DIR_SAIDA, 'ecologico-resumo.json'), `${JSON.stringify(resultado, null, 1)}\n`);
await writeFile(path.join(DIR_SAIDA, 'ecologico-tabela.csv'), `subconjunto;modelo;def;spec;grupo;estatistica;est;ep;ic95_inf;ic95_sup\n${linhasCsv.join('\n')}\n`);
await writeFile(path.join(DIR_SAIDA, 'ecologico-extremas.csv'), `chave;comparecimento;biometricos;L2;L1;taxaL1;v13;v22;parcela13\n${ext.join('\n')}\n`);
log(`pronto: ${m} testes; saída em ${DIR_SAIDA}`);
