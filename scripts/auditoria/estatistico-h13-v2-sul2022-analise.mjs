// Estatístico eleitoral, H13 sinal V2, adendo 6 de 31/10/2026 ao plano 16 (resultado no doc 26): teste direto no Sul
// (PR, SC, RS e as três juntas) com os diários de urna de 2022. Mesmo modelo do doc 22 e do doc 24 nos dois anos:
//   ΔY ~ e_V2 + e_V3m + e_V3s + Δc + sem biometria do cadastro, 60+, 16–24, escolaridade baixa, superior, log do eleitorado,
//        um indicador por modelo de urna presente (base: o mais recente);
//   e_v = Δ(votos da via) ÷ eleitores do perfil do mesmo ano; Δc = Δ(votos do diário) ÷ eleitores;
//   efeito fixo de local de votação (2º turno); peso 13 + 22 do 2º turno; CR1 por local.
// Testes por unidade: T1 e_V2 em 2022; T2 2026 − 2022; T3 e_V2 em 2022 repesado pela distribuição de sem biometria de 2026
// (faixas de 5 pontos, suporte comum; variante P do parecer 48); T4 2026 (suporte comum) − 2022 repesado.
// 4 unidades × 4 = 16 testes; Bonferroni |z| ≥ 2,96. Regra de leitura no adendo 6.
// Relatados sem teste: regressão à média, V2 do boletim em 2022, faixas de sem biometria, parcela das vias.
// Uso: node --max-old-space-size=12000 scripts/auditoria/estatistico-h13-v2-sul2022-analise.mjs
// Entradas: banco (cópia de leitura), estatistico/h08 e h08-uniao (2026), forense/perfil/<uf>.csv (2026),
//           h13-v2/secoes-2022.csv (votos, comparecimento, local, modelo e perfil de 2022), h13-v2/secoes-<uf>-2022-diario.csv,
//           h13-v2/sul2022/bu2022-<uf>.csv (boletim de 2022)
// Saída: data/parsed/auditoria/estatistico/h13-v2/sul2022/resultado-sul-2022-diario.json
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { lerTabela } from './forense-lib.mjs';

const EST = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico');
const H13 = path.join(EST, 'h13-v2');
const SAIDA = path.join(H13, 'sul2022');
const UFS = ['pr', 'sc', 'rs'];
const UNIDADES = { PR: ['pr'], SC: ['sc'], RS: ['rs'], Sul: UFS };
const N_TESTES = 16;
const Z_B = 2.9552; // Φ⁻¹(1 − 0,05 / 32): 16 testes bicaudais
const pBi = (z) => { const x = Math.abs(z) / Math.SQRT2, t = 1 / (1 + 0.5 * x); return t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))))); };
const MODELOS = ['ue2009', 'ue2010', 'ue2011', 'ue2013', 'ue2015', 'ue2020', 'ue2022'];
const lista = UFS.map((u) => `'${u}'`).join(',');

// ---------- 2026 ----------
const secoes = new Map();
const { db } = await abrirLeitura();
for (const turno of [1, 2]) {
  for (const r of db.prepare(`SELECT uf, municipio, zona, secao, local, comparecimento, modelo_urna FROM secao WHERE turno = ? AND uf IN (${lista})`).iterate(turno)) {
    const id = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
    const s = secoes.get(id) ?? { id, uf: r.uf };
    s[`t${turno}`] = { local: r.local, comp: r.comparecimento, modelo: (r.modelo_urna ?? '').toLowerCase(), v13: 0, v22: 0 };
    secoes.set(id, s);
  }
  for (const v of db.prepare(`SELECT uf, municipio, zona, secao, numero, quantidade FROM voto_bu WHERE turno = ? AND uf IN (${lista}) AND cargo = 1 AND numero IN (13, 22)`).iterate(turno)) {
    const t = secoes.get(`${v.uf}/${v.municipio}/${v.zona}/${v.secao}`)?.[`t${turno}`];
    if (t) t[v.numero === 13 ? 'v13' : 'v22'] += v.quantidade;
  }
}
db.close();
for (const turno of [1, 2]) {
  for (const dir of [path.join(EST, 'h08', `${turno}t`), path.join(EST, 'h08-uniao', `${turno}t`)]) { // a releitura com união vem depois e sobrescreve
    for (const f of (await readdir(dir)).filter((x) => x.endsWith('.secoes.jsonl') && (UFS.some((u) => x.startsWith(`${u}-`)) || x === 'selecao.secoes.jsonl')).sort()) {
      for (const l of (await readFile(path.join(dir, f), 'utf8')).split('\n')) {
        if (!l) continue;
        const x = JSON.parse(l);
        const t = secoes.get(`${x.uf}/${x.municipio}/${x.zona}/${x.secao}`)?.[`t${turno}`];
        if (t) t.log = { votos: x.votos, ...x.vias };
      }
    }
  }
}
const perfil26 = new Map();
for (const uf of UFS) for (const p of await lerTabela(path.join(DIR_DADOS, 'parsed', 'auditoria', 'forense', 'perfil', `${uf}.csv`), ['eleitores', 'biometria', 'idade60', 'idade16a24', 'escol_baixa', 'superior'])) perfil26.set(`${p.uf}/${p.municipio}/${p.zona}/${p.secao}`, p);

// ---------- 2022 ----------
const s22 = new Map();
for (const o of await lerTabela(path.join(H13, 'secoes-2022.csv'), ['v13_1', 'v22_1', 'v13_2', 'v22_2', 'aptos_1', 'comp_1', 'aptos_2', 'comp_2', 'eleitores', 'biometria', 'idade60', 'idade16a24', 'escol_baixa', 'superior'])) if (UFS.includes(o.id.slice(0, 2))) s22.set(o.id, o);
const NUM = ['votos', 'v1', 'v2', 'v3m', 'v3s', 'outra', 'erro'].flatMap((c) => [`${c}_1`, `${c}_2`]);
const d22 = new Map();
for (const uf of UFS) for (const o of await lerTabela(path.join(H13, `secoes-${uf}-2022-diario.csv`), NUM)) d22.set(o.id, o);
const bu22 = new Map(); // V2 do boletim por seção e turno (comparecimento − CompBiometrico)
for (const uf of UFS) for (const o of await lerTabela(path.join(SAIDA, `bu2022-${uf}.csv`), ['turno', 'comp', 'compBio'])) bu22.set(`${o.id}|${o.turno}`, o.comp - o.compBio);

// ---------- linhas do painel ----------
const ex = { 2026: {}, 2022: {} };
const exc = (ano, uf, m) => { const e = (ex[ano][uf] ??= {}); e[m] = (e[m] ?? 0) + 1; };
const conf = { 2026: {}, 2022: {} }; // diário × comparecimento do BU, por UF e turno, antes dos outros filtros
const confere = (ano, uf, turno, comp, votos) => {
  const c = ((conf[ano][uf] ??= {})[turno] ??= { secoesComComparecimento: 0, semDiario: 0, iguais: 0, diferentes: 0, votosBu: 0, votosDiario: 0 });
  if (!comp) return;
  c.secoesComComparecimento++;
  c.votosBu += comp;
  if (votos == null) { c.semDiario++; return; }
  c.votosDiario += votos;
  if (votos === comp) c.iguais++; else c.diferentes++;
};
function linha(ano, uf, id, a, b, la, lb, p, g) {
  if (!a?.comp || !b?.comp) return exc(ano, uf, 'sem a seção nos dois turnos');
  if (!la || !lb) return exc(ano, uf, 'sem diário');
  if (la.votos !== a.comp || lb.votos !== b.comp) return exc(ano, uf, 'diário diferente do BU');
  if (a.v13 + a.v22 < 20 || b.v13 + b.v22 < 20) return exc(ano, uf, 'menos de 20 votos em 13 + 22');
  if (!p || !p.eleitores) return exc(ano, uf, 'sem perfil');
  const el = p.eleitores;
  const Y = (t) => t.v13 / (t.v13 + t.v22);
  return { id, uf, g, w: a.v13 + a.v22, y: Y(a) - Y(b), Y1: Y(b), xV2_1: lb.v2 / lb.votos, la, lb,
    eV2: (la.v2 - lb.v2) / el, eV3m: (la.v3m - lb.v3m) / el, eV3s: (la.v3s - lb.v3s) / el, dC: (la.votos - lb.votos) / el,
    sb: 1 - p.biometria / el, modelo: a.modelo, p };
}
const L = { 2026: [], 2022: [] };
for (const s of secoes.values()) {
  const a = s.t2, b = s.t1;
  confere(2026, s.uf, 1, b?.comp, b?.log?.votos); confere(2026, s.uf, 2, a?.comp, a?.log?.votos);
  const r = linha(2026, s.uf, s.id, a, b, a?.log, b?.log, perfil26.get(s.id), a ? `${s.id.split('/').slice(0, 3).join('/')}/${a.local}` : null);
  if (r) L[2026].push(r);
}
for (const [id, o] of s22) {
  const uf = id.slice(0, 2);
  const d = d22.get(id);
  const lv = (t) => (d && d[`votos_${t}`] !== null && !d[`erro_${t}`] ? { votos: d[`votos_${t}`], v1: d[`v1_${t}`], v2: d[`v2_${t}`], v3m: d[`v3m_${t}`], v3s: d[`v3s_${t}`], outra: d[`outra_${t}`] } : null);
  for (const c of ['v13_1', 'v22_1', 'v13_2', 'v22_2']) o[c] ??= 0;
  const a = o.comp_2 ? { comp: o.comp_2, v13: o.v13_2, v22: o.v22_2 } : null, b = o.comp_1 ? { comp: o.comp_1, v13: o.v13_1, v22: o.v22_1 } : null;
  confere(2022, uf, 1, o.comp_1, lv(1)?.votos); confere(2022, uf, 2, o.comp_2, lv(2)?.votos);
  const r = linha(2022, uf, id, a, b, lv(2), lv(1), o, `${id.split('/').slice(0, 3).join('/')}/${o.local_2}`);
  if (r) {
    r.modelo = (o.modelo_2 ?? '').toLowerCase();
    const v2a = bu22.get(`${id}|2`), v2b = bu22.get(`${id}|1`);
    r.eV2bu = v2a == null || v2b == null ? null : (v2a - v2b) / r.p.eleitores;
    L[2022].push(r);
  }
}
const so22 = [...d22.keys()].filter((k) => !s22.has(k)).length; // diário de 2022 em seção fora do detalhe

// ---------- regressão com efeito fixo (demeaning ponderado), CR1 por grupo (a mesma do doc 24) ----------
function cholInv(A) {
  const n = A.length, Lm = A.map((r) => r.map(() => 0));
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
    let s = A[i][j];
    for (let k = 0; k < j; k++) s -= Lm[i][k] * Lm[j][k];
    if (i === j) { if (!(s > 1e-9 * A[i][i])) return { falha: i }; Lm[i][i] = Math.sqrt(s); } else Lm[i][j] = s / Lm[j][j];
  }
  const inv = A.map((_, c) => {
    const y = new Array(n).fill(0);
    for (let i = 0; i < n; i++) { let s = i === c ? 1 : 0; for (let k = 0; k < i; k++) s -= Lm[i][k] * y[k]; y[i] = s / Lm[i][i]; }
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) { let s = y[i]; for (let k = i + 1; k < n; k++) s -= Lm[k][i] * x[k]; x[i] = s / Lm[i][i]; }
    return x;
  });
  return { inv };
}
function regredir(rows, nomes, nFoc) {
  const grupos = new Map();
  rows.forEach((r, i) => { const g = grupos.get(r.g); if (g) g.push(i); else grupos.set(r.g, [i]); });
  const K0 = nomes.length;
  const X = [], Y = [], W = [], G = [];
  let gi = 0;
  for (const ii of grupos.values()) {
    if (ii.length < 2) continue;
    let sw = 0; const mx = new Array(K0).fill(0); let my = 0;
    for (const i of ii) { const r = rows[i]; sw += r.w; for (let k = 0; k < K0; k++) mx[k] += r.w * r.cols[k]; my += r.w * r.y; }
    for (let k = 0; k < K0; k++) mx[k] /= sw; my /= sw;
    for (const i of ii) { const r = rows[i]; X.push(r.cols.map((v, k) => v - mx[k])); Y.push(r.y - my); W.push(r.w); G.push(gi); }
    gi++;
  }
  let ativas = [...Array(K0).keys()];
  for (;;) {
    const K = ativas.length;
    const A = ativas.map(() => new Array(K).fill(0)), bv = new Array(K).fill(0);
    for (let i = 0; i < X.length; i++) for (let p = 0; p < K; p++) { const xp = X[i][ativas[p]] * W[i]; bv[p] += xp * Y[i]; for (let q = 0; q <= p; q++) A[p][q] += xp * X[i][ativas[q]]; }
    for (let p = 0; p < K; p++) for (let q = p + 1; q < K; q++) A[p][q] = A[q][p];
    const sol = cholInv(A);
    if (sol.falha !== undefined) { if (ativas[sol.falha] < nFoc) return null; ativas = ativas.filter((_, a) => a !== sol.falha); continue; }
    const { inv } = sol;
    const beta = inv.map((row) => row.reduce((s, v, j) => s + v * bv[j], 0));
    const e = Y.map((y, i) => y - ativas.reduce((s, c, p) => s + X[i][c] * beta[p], 0));
    const meatG = new Map();
    for (let i = 0; i < X.length; i++) { let v = meatG.get(G[i]); if (!v) meatG.set(G[i], (v = new Array(K).fill(0))); for (let p = 0; p < K; p++) v[p] += W[i] * X[i][ativas[p]] * e[i]; }
    const meat = ativas.map(() => new Array(K).fill(0));
    for (const v of meatG.values()) for (let p = 0; p < K; p++) for (let q = 0; q < K; q++) meat[p][q] += v[p] * v[q];
    const N = X.length, esc = (gi / (gi - 1)) * ((N - 1) / (N - K));
    const cov = ativas.map((_, p) => ativas.map((__, q) => { let s = 0; for (let a = 0; a < K; a++) for (let b = 0; b < K; b++) s += inv[p][a] * meat[a][b] * inv[b][q]; return esc * s; }));
    return { N, grupos: gi, nomes: ativas.map((c) => nomes[c]), beta, cov };
  }
}
const coef = (r, nome) => { const p = r.nomes.indexOf(nome); return p < 0 ? null : { beta: r.beta[p] * 100, se: Math.sqrt(r.cov[p][p]) * 100, z: r.beta[p] / Math.sqrt(r.cov[p][p]) }; };
const CTRLN = (base) => ['cadSemBio', 'p60', 'p16a24', 'pBaixa', 'pSup', 'logEle', ...MODELOS.filter((m) => m !== base)];
const FOC = ['eV2', 'eV3m', 'eV3s', 'dC'];
/** Ajusta o modelo nas linhas `rs` (controles com a base de modelo de urna da própria amostra). `foc` troca os regressores focais. */
function modelo(rs, { foc = (r) => [r.eV2, r.eV3m, r.eV3s, r.dC], nomesFoc = FOC, peso = (r) => r.w } = {}) {
  const cont = {};
  for (const r of rs) cont[r.modelo] = (cont[r.modelo] ?? 0) + 1;
  const base = MODELOS.filter((m) => cont[m]).at(-1);
  const ctrl = (r) => { const p = r.p, el = p.eleitores; return [r.sb, p.idade60 / el, p.idade16a24 / el, p.escol_baixa / el, p.superior / el, Math.log(el), ...MODELOS.filter((m) => m !== base).map((m) => (r.modelo === m ? 1 : 0))]; };
  const reg = regredir(rs.map((r) => ({ w: peso(r), g: r.g, y: r.y, cols: [...foc(r), ...ctrl(r)] })), [...nomesFoc, ...CTRLN(base)], nomesFoc.length);
  if (!reg) return null;
  return { N: reg.N, locais: reg.grupos, base, modelosDeUrna: cont, ...Object.fromEntries(nomesFoc.map((n) => [n, coef(reg, n)])) };
}
const dif = (a, b) => { const d = a.beta - b.beta, se = Math.hypot(a.se, b.se); return { dif: d, se, z: d / se, ic95: [d - 1.96 * se, d + 1.96 * se] }; };
const teste = (nome, x, beta = x.beta ?? x.dif) => ({ teste: nome, ...x, p: pBi(x.z), passa: Math.abs(x.z) >= Z_B, mde80: (Z_B + 0.84) * x.se, sinal: Math.sign(beta) });

// faixas de 5 pontos de sem biometria e repeso de 2022 para a distribuição de 2026 (variante P do parecer 48)
const bin = (sb) => Math.min(19, Math.max(0, Math.floor(sb * 20)));
const dist = (rows) => { const d = new Array(20).fill(0); let s = 0; for (const r of rows) { d[bin(r.sb)] += r.w; s += r.w; } return d.map((v) => v / s); };
const FX = [[0, 0.15], [0.15, 0.30], [0.30, 0.50], [0.50, 1.01]];
const nomeFx = ([a, b]) => `eV2_sb${Math.round(a * 100)}a${Math.round(Math.min(b, 1) * 100)}`;
const faixa = (sb) => FX.findIndex(([a, b]) => sb >= a && sb < b);
const media = (rs, f) => { let s = 0, sw = 0; for (const r of rs) { s += r.w * f(r); sw += r.w; } return s / sw; };

function leitura(b26, T1, T2, T3, T4) {
  if (b26.z < 2) return 'sem sinal de 2026 para comparar';
  const pos = (t) => t.passa && t.sinal > 0;
  if (pos(T1) && pos(T3) && !T2.passa && !T4.passa) return 'não é novidade de 2026, também na população comparável';
  if (pos(T1) && !T3.passa && !T4.passa) return 'não é novidade de 2026; na população comparável, inconclusivo';
  if (pos(T1) && pos(T2) && pos(T4)) return 'existia em 2022, maior em 2026';
  if (Math.abs(T1.z) < 2 && Math.abs(T3.z) < 2 && pos(T2) && pos(T4) && T1.mde80 <= b26.beta) return 'próprio de 2026';
  return 'inconclusivo';
}

const res = { geradoEm: new Date().toISOString(), plano: 'adendo 6 do plano 16', nTestes: N_TESTES, corteBonferroni: Z_B, exclusoes: ex, diarioXbu: conf, diario2022ForaDoDetalhe: so22, unidades: {} };
for (const [nome, ufs] of Object.entries(UNIDADES)) {
  const R = { 2026: L[2026].filter((r) => ufs.includes(r.uf)), 2022: L[2022].filter((r) => ufs.includes(r.uf)) };
  const u = { secoesNoPainel: { 2026: R[2026].length, 2022: R[2022].length }, ano: {} };
  for (const ano of [2026, 2022]) {
    const rs = R[ano];
    const vias = {};
    for (const [t, k] of [[1, 'lb'], [2, 'la']]) { const o = (vias[t] = { votos: 0, v1: 0, v2: 0, v3m: 0, v3s: 0, outra: 0 }); for (const r of rs) for (const c in o) o[c] += r[k][c]; }
    const sbF = {};
    for (const fx of FX) { const sub = rs.filter((r) => faixa(r.sb) === faixa(fx[0])); sbF[nomeFx(fx)] = { secoes: sub.length, peso: sub.reduce((s, r) => s + r.w, 0) / rs.reduce((s, r) => s + r.w, 0) }; }
    const fxUsadas = FX.filter((fx) => sbF[nomeFx(fx)].secoes >= 50);
    u.ano[ano] = {
      base: modelo(rs),
      regressaoAMedia: modelo(rs, { foc: (r) => [r.eV2, r.eV3m, r.eV3s, r.dC, r.Y1, r.xV2_1], nomesFoc: [...FOC, 'Y1', 'xV2_1'] }),
      faixas: { distribuicao: sbF, modelo: modelo(rs, { foc: (r) => [...fxUsadas.map((fx) => (faixa(r.sb) === faixa(fx[0]) ? r.eV2 : 0)), r.eV3m, r.eV3s, r.dC], nomesFoc: [...fxUsadas.map(nomeFx), 'eV3m', 'eV3s', 'dC'] }) },
      medias: { eV2: media(rs, (r) => r.eV2), dC: media(rs, (r) => r.dC), semBio: media(rs, (r) => r.sb) },
      vias,
    };
    if (ano === 2022) {
      const rb = rs.filter((r) => r.eV2bu !== null);
      u.ano[ano].v2DoBoletim = { secoes: rb.length, ...modelo(rb, { foc: (r) => [r.eV2bu, r.eV3m, r.eV3s, r.dC], nomesFoc: ['eV2bu', 'eV3m', 'eV3s', 'dC'] }) };
    }
  }
  // repeso (P)
  const d26 = dist(R[2026]), d22 = dist(R[2022]);
  const comum = (r) => d26[bin(r.sb)] > 0 && d22[bin(r.sb)] > 0;
  const r22 = R[2022].filter(comum).map((r) => ({ ...r, w: (r.w * d26[bin(r.sb)]) / d22[bin(r.sb)] }));
  const r26 = R[2026].filter(comum);
  const P22 = modelo(r22), P26 = modelo(r26);
  u.repeso = { distribuicaoSb: { 2026: d26, 2022: d22 }, sbMedio: { '2022 original': media(R[2022], (r) => r.sb), '2022 repesado': media(r22, (r) => r.sb), '2026 suporte comum': media(r26, (r) => r.sb) },
    secoesForaDoSuporte: { 2026: R[2026].length - r26.length, 2022: R[2022].length - r22.length }, 2022: P22, 2026: P26 };
  const b26 = u.ano[2026].base.eV2, b22 = u.ano[2022].base.eV2;
  const T1 = teste('T1 e_V2 em 2022', b22);
  const T2 = teste('T2 2026 − 2022', dif(b26, b22));
  const T3 = teste('T3 e_V2 em 2022 repesado', P22.eV2);
  const T4 = teste('T4 2026 (suporte comum) − 2022 repesado', dif(P26.eV2, P22.eV2));
  u.testes = [T1, T2, T3, T4];
  u.razao2026sobre2022 = b26.beta / b22.beta;
  u.leitura = leitura(b26, T1, T2, T3, T4);
  res.unidades[nome] = u;
}
await writeFile(path.join(SAIDA, 'resultado-sul-2022-diario.json'), JSON.stringify(res, null, 1));
const curto = (x) => (x ? `${x.beta.toFixed(2)} (se ${x.se.toFixed(2)}, z ${x.z.toFixed(2)})` : '—');
for (const [nome, u] of Object.entries(res.unidades)) {
  console.log(`\n== ${nome} · painel 2026 ${u.secoesNoPainel[2026]} / 2022 ${u.secoesNoPainel[2022]} · leitura: ${u.leitura}`);
  for (const ano of [2026, 2022]) { const b = u.ano[ano].base; console.log(`${ano}: N ${b.N}, locais ${b.locais}, base ${b.base} · eV2 ${curto(b.eV2)} · eV3m ${curto(b.eV3m)} · eV3s ${curto(b.eV3s)} · dC ${curto(b.dC)} · RM eV2 ${curto(u.ano[ano].regressaoAMedia.eV2)}`); }
  console.log(`2022 V2 do boletim: ${curto(u.ano[2022].v2DoBoletim.eV2bu)} · repeso 2026 ${curto(u.repeso[2026].eV2)} / 2022 ${curto(u.repeso[2022].eV2)}`);
  for (const t of u.testes) console.log(`  ${t.teste}: ${(t.beta ?? t.dif).toFixed(2)} (se ${t.se.toFixed(2)}, z ${t.z.toFixed(2)}, p ${t.p.toExponential(2)}) passa=${t.passa} mde80=${t.mde80.toFixed(2)}${t.ic95 ? ` IC95 [${t.ic95.map((v) => v.toFixed(2)).join('; ')}]` : ''}`);
}
