// H13, método entre turnos (painel da mesma seção). Estatístico eleitoral, 29/10/2026.
//
// Pergunta: quando uma seção liberou MAIS gente sem biometria no 2º turno do que no 1º, esse acréscimo de
// liberações acompanhou acréscimo de votos do 13 acima do que acompanha um eleitor a mais qualquer
// (e acima do que acompanha um eleitor biométrico a mais)?
//
// Unidade: seção (uf/município/zona/seção) com pacote único e BU com detalhamento nos dois turnos.
// Primeira diferença (efeito fixo de seção) + efeito fixo de zona na diferença (tendência comum da zona).
// Erro-padrão agrupado por município. Fonte: perfis de seção data/parsed/<t>t/perfil/<uf>.jsonl
// (src/perfil-secoes.js; a mesma fonte do perfil_log do banco, que na cópia de leitura vigente tem o
// 1º turno incompleto). Sem rede.
//
// Definições de liberação (reportadas separadamente):
//   L1 = habilitadosPeloMesario do log ("Mesário … habilitou o eleitor", termina em voto);
//   L2 = semBiometriaCadastrada + comBiometriaHabilitadosPorAnoNascimento do BU (todo habilitado sem digital).
//
// HIPÓTESES DECLARADAS ANTES DE RODAR (confirmatórias, 2 testes, Bonferroni α = 0,05/2 = 0,025 cada):
//   C1: Nordeste, modelo A (L2): γ_margem = 0, em Δ(13 − 22) ~ ΔC + ΔL2 + E1 + BN1 | zona.
//   C2: Nordeste, modelo B (L1): γ_margem = 0, em Δ(13 − 22) ~ ΔC + ΔL1 + E1 + BN1 | zona.
//   Alternativa unilateral de fraude: γ_margem > 0. O teste é bilateral (sinal contrário também é informação).
//   Tudo o mais (outras regiões, UFs, classes de mesário, decomposição, cauda, extremos) é EXPLORATÓRIO.
//
// Assinatura esperada se uma fração f das liberações a mais fosse voto inserido no 13 (eleitor a mais, liberado,
// voto no 13): γ_13 = f·(1 − β_C13), γ_22 = −f·β_C22, logo f = γ_margem / (1 − β_Cmargem).
//
// Uso:
//   node --max-old-space-size=8192 scripts/auditoria/liberacao-entreturnos-painel.mjs
//        [--ufs ac,al,...] [--perm 2000] [--sem-painel] [--efeito zona|municipio|uf --sufixo -uf]
// Saídas em data/parsed/auditoria/liberacao/: entreturnos-resumo<sufixo>.json, entreturnos-extremos<sufixo>.json,
// entreturnos-painel.jsonl (uma linha por seção, sem título de mesário).
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { demeanar, mqo } from './biometria-comum.mjs';

const { values: opt } = parseArgs({
  options: { ufs: { type: 'string' }, perm: { type: 'string', default: '2000' }, 'sem-painel': { type: 'boolean' }, efeito: { type: 'string', default: 'zona' }, sufixo: { type: 'string', default: '' } },
});
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'liberacao');
const REGIAO = {
  Nordeste: ['al', 'ba', 'ce', 'ma', 'pb', 'pe', 'pi', 'rn', 'se'],
  Norte: ['ac', 'am', 'ap', 'pa', 'ro', 'rr', 'to'],
  'Centro-Oeste': ['df', 'go', 'ms', 'mt'],
  Sudeste: ['es', 'mg', 'rj', 'sp'],
  Sul: ['pr', 'rs', 'sc'],
};
const regiaoDe = Object.fromEntries(Object.entries(REGIAO).flatMap(([r, us]) => us.map((u) => [u, r])));
const ELEICAO = { 1: 6257, 2: 6258 };
const N_PERM = Number(opt.perm);

const arqPerfil = (t, uf) => path.join(DIR_DADOS, 'parsed', `${t}t`, 'perfil', `${uf}.jsonl`);
const ufs = (opt.ufs ? opt.ufs.split(',') : Object.keys(regiaoDe)).filter((u) => existsSync(arqPerfil(1, u)) && existsSync(arqPerfil(2, u)));

// ---------- leitura ----------
function extrair(p) {
  const e = p.bu.eleicoes.find((x) => x.idEleicao === ELEICAO[p.turno]);
  const v = e?.cargos.find((c) => c.codigoCargo === 1)?.votos ?? {};
  let outros = 0;
  for (const [k, n] of Object.entries(v)) if (/^\d+$/.test(k) && k !== '13' && k !== '22') outros += n;
  const det = p.bu.detalhamentoComparecimento;
  const log = p.log ?? null;
  const lib = log?.mesarios?.liberacoesPorMesario ?? {};
  const hab = Object.keys(lib);
  return {
    pac: p.pacotesNaSecao ?? 1, C: p.bu.qtdEleitoresCompareceram, aptos: e?.aptos ?? null,
    v13: v['13'] ?? 0, v22: v['22'] ?? 0, outros, bn: (v.branco ?? 0) + (v.nulo ?? 0),
    det: !!det, B: det?.porBiometria ?? 0, SB: det?.semBiometriaCadastrada ?? 0, PG: det?.comBiometriaHabilitadosPorAnoNascimento ?? 0,
    log: !!log, lb: log?.habilitadosBiometria ?? 0, la: log?.anoNascimentoSemBiometria ?? 0, ld: log?.dadoPessoalConfere ?? 0,
    lm: log?.habilitadosPeloMesario ?? 0, vc: log?.votosComputados ?? 0,
    hab: new Set(hab), top: hab[0] ?? null, topN: hab.length ? lib[hab[0]] : 0,
    equipe: new Set((log?.mesarios?.registros ?? []).map((r) => r.titulo)),
  };
}

async function lerTurno(t, uf) {
  const m = new Map();
  for await (const linha of createInterface({ input: createReadStream(arqPerfil(t, uf)), crlfDelay: Infinity })) {
    if (!linha) continue;
    const p = JSON.parse(linha);
    const k = `${p.municipio}/${p.zona}/${p.secao}`;
    m.set(k, m.has(k) ? null : extrair(p)); // mais de um pacote: fora
  }
  return m;
}

const jaccard = (a, b) => {
  if (!a.size && !b.size) return null;
  let i = 0;
  for (const x of a) if (b.has(x)) i++;
  return i / (a.size + b.size - i);
};

const exclusao = { semPar: 0, duplicada: 0, semDetalhamento: 0, pequena: 0, aptosMudou: 0, identidadeVotos: 0, logInconsistente: 0 };
const linhas = [];
await mkdir(SAIDA, { recursive: true });
const painel = opt['sem-painel'] ? null : createWriteStream(path.join(SAIDA, `entreturnos-painel${opt.sufixo}.jsonl`));
for (const uf of ufs) {
  const t1 = await lerTurno(1, uf);
  const t2 = await lerTurno(2, uf);
  let n = 0;
  for (const [k, b] of t2) {
    const a = t1.get(k);
    if (a === undefined) { exclusao.semPar++; continue; }
    if (a === null || b === null) { exclusao.duplicada++; continue; } // pacotesNaSecao conta diretórios, inclusive cópias idênticas: só a chave repetida exclui
    if (!a.det || !b.det) { exclusao.semDetalhamento++; continue; }
    if (a.C < 20 || b.C < 20) { exclusao.pequena++; continue; }
    if (a.aptos == null || b.aptos == null || Math.abs(b.aptos - a.aptos) > 0.05 * a.aptos) { exclusao.aptosMudou++; continue; }
    if (a.v13 + a.v22 + a.outros + a.bn !== a.C || b.v13 + b.v22 + b.outros + b.bn !== b.C) { exclusao.identidadeVotos++; continue; }
    // log tem de reproduzir o detalhamento do BU (validação do doc biometria-mesarios/01), senão L1 não é comparável
    const ok = (s) => s.log && s.vc === s.C && s.lb === s.B && s.la === s.SB && s.ld === s.PG;
    if (!ok(a) || !ok(b)) { exclusao.logInconsistente++; continue; }
    const [mun, zona, secao] = k.split('/');
    let classe;
    if (!a.hab.size && !b.hab.size) classe = 'nenhum';
    else if (!a.hab.size || !b.hab.size) classe = 'umTurnoSo';
    else classe = [...a.hab].some((x) => b.hab.has(x)) ? 'mesmo' : 'diferente';
    const r = {
      uf, reg: regiaoDe[uf], mun, zona, secao,
      C1: a.C, C2: b.C, ap1: a.aptos, ap2: b.aptos,
      v13_1: a.v13, v22_1: a.v22, E1: a.outros, BN1: a.bn, v13_2: b.v13, v22_2: b.v22, BN2: b.bn,
      B1: a.B, B2: b.B, SB1: a.SB, SB2: b.SB, PG1: a.PG, PG2: b.PG, M1: a.lm, M2: b.lm,
      classe, mesmoTop: a.top !== null && a.top === b.top, topN1: a.topN, topN2: b.topN,
      equipeJac: jaccard(a.equipe, b.equipe),
    };
    linhas.push(r);
    painel?.write(`${JSON.stringify(r)}\n`);
    n++;
  }
  for (const k of t1.keys()) if (!t2.has(k)) exclusao.semPar++;
  console.error(`${uf}: ${n} seções no painel`, JSON.stringify(exclusao));
}
painel?.end();

// ---------- estatística ----------
const D = {
  d13: (r) => r.v13_2 - r.v13_1, d22: (r) => r.v22_2 - r.v22_1, dm: (r) => (r.v13_2 - r.v22_2) - (r.v13_1 - r.v22_1),
  dC: (r) => r.C2 - r.C1, dB: (r) => r.B2 - r.B1, dSB: (r) => r.SB2 - r.SB1,
  dL2: (r) => r.SB2 + r.PG2 - r.SB1 - r.PG1, dL1: (r) => r.M2 - r.M1, dPGsem: (r) => (r.PG2 - r.M2) - (r.PG1 - r.M1), dPG: (r) => r.PG2 - r.PG1,
  E1: (r) => r.E1, BN1: (r) => r.BN1,
};
const MODELOS = {
  A_L2: ['dC', 'dL2', 'E1', 'BN1'],
  B_L1: ['dC', 'dL1', 'E1', 'BN1'],
  C_decomposicao: ['dB', 'dSB', 'dL1', 'dPGsem', 'E1', 'BN1'],
  // D (exploratório, acrescentado depois de ver C): excesso do eleitor sem biometria cadastrada (SB) e do liberado manual (PG) sobre um eleitor a mais qualquer
  D_SB_PG: ['dC', 'dSB', 'dPG', 'E1', 'BN1'],
};
// efeito fixo: zona (padrão), município ou UF (robustez: fraude que atingisse a zona inteira some no efeito de zona)
const zonaDe = { zona: (r) => `${r.uf}/${r.mun}/${r.zona}`, municipio: (r) => `${r.uf}/${r.mun}`, uf: (r) => r.uf }[opt.efeito];
const munDe = (r) => `${r.uf}/${r.mun}`;

// Cauda normal: erfc de Numerical Recipes (erro relativo < 1,2e-7 em toda a reta, inclusive caudas)
function erfc(x) {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}
const pBilateral = (t) => erfc(Math.abs(t) / Math.SQRT2);
const zCritico = (alfa) => { // Φ^{-1}(1 − alfa/2) por bisseção
  let lo = 0, hi = 40;
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (pBilateral(m) > alfa) lo = m; else hi = m; }
  return (lo + hi) / 2;
};

let testes = 0;
function ajustar(rs, xs, yNome) {
  const grupos = rs.map(zonaDe);
  const cols = [Float64Array.from(rs, D[yNome]), ...xs.map((x) => Float64Array.from(rs, D[x]))];
  const [y, ...X] = demeanar(cols, grupos);
  try {
    const m = mqo(y, X, xs, rs.map(munDe));
    testes++;
    return m;
  } catch (erro) {
    return { erro: erro.message }; // ex.: classe "nenhum", em que ΔL1 é sempre 0
  }
}

function somar(rs) {
  const s = { secoes: rs.length, C1: 0, C2: 0, L2_1: 0, L2_2: 0, L1_1: 0, L1_2: 0, SB1: 0, SB2: 0, PG1: 0, PG2: 0, B1: 0, B2: 0, v13_1: 0, v13_2: 0, v22_1: 0, v22_2: 0 };
  for (const r of rs) {
    s.C1 += r.C1; s.C2 += r.C2; s.L2_1 += r.SB1 + r.PG1; s.L2_2 += r.SB2 + r.PG2; s.L1_1 += r.M1; s.L1_2 += r.M2;
    s.SB1 += r.SB1; s.SB2 += r.SB2; s.PG1 += r.PG1; s.PG2 += r.PG2; // PG − L1 = liberação manual sem mesário associado
    s.B1 += r.B1; s.B2 += r.B2; s.v13_1 += r.v13_1; s.v13_2 += r.v13_2; s.v22_1 += r.v22_1; s.v22_2 += r.v22_2;
  }
  const pct = (a, b) => +(100 * a / b).toFixed(2);
  return {
    ...s, pctL2_1: pct(s.L2_1, s.C1), pctL2_2: pct(s.L2_2, s.C2), pctL1_1: pct(s.L1_1, s.C1), pctL1_2: pct(s.L1_2, s.C2),
    dC: s.C2 - s.C1, dL2: s.L2_2 - s.L2_1, dL1: s.L1_2 - s.L1_1, dB: s.B2 - s.B1, d13: s.v13_2 - s.v13_1, d22: s.v22_2 - s.v22_1,
    secoesDL2pos20: rs.filter((r) => D.dL2(r) >= 20).length, secoesDL1pos10: rs.filter((r) => D.dL1(r) >= 10).length,
  };
}

function analisarGrupo(rs) {
  if (rs.length < 200) return { secoes: rs.length, nota: 'menos de 200 seções: sem regressão' };
  const out = { desc: somar(rs), modelos: {} };
  for (const [nome, xs] of Object.entries(MODELOS)) {
    const m = {};
    for (const y of ['d13', 'd22', 'dm']) m[y] = ajustar(rs, xs, y);
    if (nome !== 'C_decomposicao') {
      const L = xs[1];
      const g = m.dm.coef[L];
      const den = 1 - m.dm.coef.dC.beta;
      m.fracaoImplicita = { f: +(g.beta / den).toFixed(4), ic95: [+((g.beta - 1.96 * g.ep) / den).toFixed(4), +((g.beta + 1.96 * g.ep) / den).toFixed(4)], p: pBilateral(g.t) };
    } else {
      // H0 de igualdade entre caminhos (contra o biométrico): diferenças aproximadas sem a covariância (conservador só se cov > 0)
      m.nota = 'coeficientes por caminho de habilitação; comparar dB com dSB, dL1, dPGsem';
    }
    out.modelos[nome] = m;
  }
  return out;
}

// cauda: seções com acréscimo grande de liberação; votos do 13 observados × previstos por modelo sem L
function cauda(rs, filtro, rotulo) {
  if (rs.length < 200) return null;
  const xs = ['dC', 'E1', 'BN1'];
  const grupos = rs.map(zonaDe);
  const res = {};
  for (const yNome of ['d13', 'd22']) {
    const cols = [Float64Array.from(rs, D[yNome]), ...xs.map((x) => Float64Array.from(rs, D[x]))];
    const dm = demeanar(cols, grupos);
    const fit = mqo(dm[0], dm.slice(1), xs, rs.map(munDe));
    testes++;
    let obsMenosPrev = 0, se2 = 0, n = 0, sL = 0;
    for (let i = 0; i < rs.length; i++) {
      if (!filtro(rs[i])) continue;
      let yhat = 0;
      xs.forEach((x, j) => { yhat += fit.coef[x].beta * dm[j + 1][i]; });
      const e = dm[0][i] - yhat;
      obsMenosPrev += e; se2 += e * e; n++; sL += rotulo === 'dL1>=10' ? D.dL1(rs[i]) : D.dL2(rs[i]);
    }
    res[yNome] = { secoes: n, somaLiberacoesExtras: sL, excessoVotos: Math.round(obsMenosPrev), ep: Math.round(Math.sqrt(se2)), z: +(obsMenosPrev / Math.sqrt(se2)).toFixed(2), excessoPorLiberacao: +(obsMenosPrev / sL).toFixed(4) };
  }
  return { criterio: rotulo, ...res };
}

// permutação dentro da zona (ter Braak / FWL): resíduo de L e de y sobre os controles, embaralha o de L na zona
function permutacao(rs, L) {
  const grupos = rs.map(zonaDe);
  const xs = ['dC', 'E1', 'BN1'];
  const cols = [Float64Array.from(rs, D.dm), Float64Array.from(rs, D[L]), ...xs.map((x) => Float64Array.from(rs, D[x]))];
  const [y, l, ...X] = demeanar(cols, grupos);
  const clusters = rs.map(munDe);
  const resid = (v) => {
    const f = mqo(v, X, xs, clusters);
    return Float64Array.from(v, (val, i) => val - xs.reduce((s, x, j) => s + f.coef[x].beta * X[j][i], 0));
  };
  const ry = resid(y);
  const rl = resid(l);
  let sxy = 0, sxx = 0;
  for (let i = 0; i < ry.length; i++) { sxy += rl[i] * ry[i]; sxx += rl[i] * rl[i]; }
  const g0 = sxy / sxx;
  const idx = new Map();
  grupos.forEach((g, i) => { if (!idx.has(g)) idx.set(g, []); idx.get(g).push(i); });
  let semente = 13013022;
  const aleat = () => { semente = (semente * 1103515245 + 12345) % 2147483648; return semente / 2147483648; };
  const perm = new Float64Array(rl.length);
  let extremos = 0;
  const dist = [];
  for (let p = 0; p < N_PERM; p++) {
    for (const ii of idx.values()) {
      const v = ii.map((i) => rl[i]);
      for (let a = v.length - 1; a > 0; a--) { const b = Math.floor(aleat() * (a + 1)); [v[a], v[b]] = [v[b], v[a]]; }
      ii.forEach((i, j) => { perm[i] = v[j]; });
    }
    let s = 0;
    for (let i = 0; i < ry.length; i++) s += perm[i] * ry[i];
    const g = s / sxx;
    dist.push(g);
    if (Math.abs(g) >= Math.abs(g0)) extremos++;
  }
  dist.sort((a, b) => a - b);
  return { gamma: +g0.toPrecision(4), permutacoes: N_PERM, p: (1 + extremos) / (1 + N_PERM), nulo_p2_5: +dist[Math.floor(0.025 * N_PERM)].toPrecision(3), nulo_p97_5: +dist[Math.floor(0.975 * N_PERM)].toPrecision(3) };
}

// extremos exploratórios: resíduo do modelo A na margem, z robusto (mediana/MAD) — Bonferroni sobre todas as seções
function extremos(rs) {
  const xs = MODELOS.A_L2;
  const grupos = rs.map(zonaDe);
  const cols = [Float64Array.from(rs, D.dm), ...xs.map((x) => Float64Array.from(rs, D[x]))];
  const [y, ...X] = demeanar(cols, grupos);
  const fit = mqo(y, X, xs, rs.map(munDe));
  const e = Float64Array.from(y, (v, i) => v - xs.reduce((s, x, j) => s + fit.coef[x].beta * X[j][i], 0));
  const ord = Float64Array.from(e).sort();
  const med = ord[Math.floor(ord.length / 2)];
  const mad = Float64Array.from(e, (v) => Math.abs(v - med)).sort()[Math.floor(e.length / 2)] * 1.4826;
  const zc = zCritico(0.05 / rs.length);
  const lista = rs.map((r, i) => ({ r, z: (e[i] - med) / mad, e: e[i] }));
  const fmt = ({ r, z, e: res }) => ({
    uf: r.uf, municipio: r.mun, zona: r.zona, secao: r.secao, z: +z.toFixed(2), residuoMargem: Math.round(res),
    C: [r.C1, r.C2], aptos: [r.ap1, r.ap2], v13: [r.v13_1, r.v13_2], v22: [r.v22_1, r.v22_2], E1: r.E1, BN: [r.BN1, r.BN2],
    L2: [r.SB1 + r.PG1, r.SB2 + r.PG2], L1: [r.M1, r.M2], bio: [r.B1, r.B2], classe: r.classe, maiorHabilitador: [r.topN1, r.topN2],
  });
  const comLib = lista.filter((x) => D.dL2(x.r) >= 10);
  const pro13 = [...comLib].sort((a, b) => b.z - a.z).slice(0, 15).map(fmt);
  const pro22 = [...comLib].sort((a, b) => a.z - b.z).slice(0, 15).map(fmt);
  const acima = lista.filter((x) => Math.abs(x.z) > zc);
  const acimaComLib = acima.filter((x) => D.dL2(x.r) >= 10);
  return {
    testes: rs.length, zCriticoBonferroni: +zc.toFixed(2), mediana: med, madEscalado: +mad.toFixed(2),
    acimaDoCritico: { total: acima.length, pro13: acima.filter((x) => x.z > 0).length, pro22: acima.filter((x) => x.z < 0).length },
    acimaDoCriticoComDL2maior10: { total: acimaComLib.length, pro13: acimaComLib.filter((x) => x.z > 0).length, pro22: acimaComLib.filter((x) => x.z < 0).length },
    nota: 'z robusto do resíduo não é normal (caudas pesadas): o critério de Bonferroni aqui é só ordenação, exploratório',
    pro13, pro22,
  };
}

const resultado = {
  geradoEm: new Date().toISOString(), efeitoFixo: opt.efeito, ufs, exclusao, secoesNoPainel: linhas.length,
  hipotesesConfirmatorias: ['C1: Nordeste, A_L2, γ_margem = 0', 'C2: Nordeste, B_L1, γ_margem = 0'], alfaBonferroni: 0.025,
  grupos: {}, mesario: {}, cauda: {}, permutacao: {},
};
const porGrupo = { Brasil: linhas };
for (const [r, us] of Object.entries(REGIAO)) porGrupo[r] = linhas.filter((x) => x.reg === r);
for (const u of REGIAO.Nordeste) porGrupo[`NE:${u}`] = linhas.filter((x) => x.uf === u);
for (const [g, rs] of Object.entries(porGrupo)) {
  console.error(`regressões: ${g} (${rs.length})`);
  resultado.grupos[g] = analisarGrupo(rs);
  resultado.cauda[g] = { L2: cauda(rs, (r) => D.dL2(r) >= 20, 'dL2>=20'), L1: cauda(rs, (r) => D.dL1(r) >= 10, 'dL1>=10') };
}
// mesário: mesmo habilitador nos dois turnos × diferente × só num turno
for (const g of ['Brasil', 'Nordeste']) {
  resultado.mesario[g] = {};
  for (const c of ['mesmo', 'diferente', 'umTurnoSo', 'nenhum']) {
    const rs = porGrupo[g].filter((x) => x.classe === c);
    resultado.mesario[g][c] = rs.length < 200 ? { secoes: rs.length } : {
      desc: somar(rs), mediaDL1: +(rs.reduce((s, r) => s + D.dL1(r), 0) / rs.length).toFixed(3),
      A_L2: { dm: ajustar(rs, MODELOS.A_L2, 'dm') }, B_L1: { dm: ajustar(rs, MODELOS.B_L1, 'dm') },
    };
  }
}
console.error('permutações (Nordeste)');
resultado.permutacao.Nordeste = { A_L2: permutacao(porGrupo.Nordeste, 'dL2'), B_L1: permutacao(porGrupo.Nordeste, 'dL1') };
resultado.testesRegressao = testes;
const ext = extremos(linhas);
resultado.extremos = { ...ext, pro13: undefined, pro22: undefined };
await writeFile(path.join(SAIDA, `entreturnos-extremos${opt.sufixo}.json`), `${JSON.stringify(ext, null, 1)}\n`);
await writeFile(path.join(SAIDA, `entreturnos-resumo${opt.sufixo}.json`), `${JSON.stringify(resultado, null, 1)}\n`);

// resumo no terminal
const lin = (g) => {
  const G = resultado.grupos[g];
  if (!G.modelos) return `${g}: ${G.secoes} seções`;
  const c = (m, y, x) => { const k = G.modelos[m][y].coef[x]; return `${k.beta}(t${k.t})`; };
  return `${g.padEnd(13)} n=${G.desc.secoes} L2 ${G.desc.pctL2_1}→${G.desc.pctL2_2}% | A: βC13 ${c('A_L2', 'd13', 'dC')} γ13 ${c('A_L2', 'd13', 'dL2')} γ22 ${c('A_L2', 'd22', 'dL2')} γm ${c('A_L2', 'dm', 'dL2')} f ${G.modelos.A_L2.fracaoImplicita.f}`
    + ` | B: γ13 ${c('B_L1', 'd13', 'dL1')} γ22 ${c('B_L1', 'd22', 'dL1')} γm ${c('B_L1', 'dm', 'dL1')} f ${G.modelos.B_L1.fracaoImplicita.f}`;
};
for (const g of Object.keys(porGrupo)) console.log(lin(g));
console.log('exclusões', JSON.stringify(exclusao), 'painel', linhas.length, 'regressões', testes);
console.log('permutação NE', JSON.stringify(resultado.permutacao.Nordeste));
