// Cético, parecer 50 (H27, doc 11 do demógrafo): cruza a leitura própria do perfil (cetico-50-perfil.mjs) com as seções de
// 2022 e 2026 (cetico-50-novas.mjs). Mede:
//   1. as novas de 2026 com 0% sem biometria no cadastro (doc 11: 385 observadas × 52,0 esperadas);
//   2. a régua de TTE "aptos − cadastro": validação em 2026 contra o TTE do BU, com o sinal (zero, negativo, positivo), e o
//      mesmo em 2022 (onde não há TTE por seção);
//   3. invariante: seção cujo cadastro não tem eleitor sem biometria, sem TTE, e com habilitação pelo ano de nascimento no BU;
//   4. liberação sem digital de eleitor com biometria ("dado digitado confere") nas seções 100% biométricas, novas com 95%+
//      contra antigas do mesmo tamanho.
// Uso: node scripts/auditoria/cetico-50-cruzamento.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { DIR_50 } from './cetico-50-perfil.mjs';

const ler = (n) => readFileSync(path.join(DIR_50, n), 'utf8').trimEnd().split('\n').slice(1).map((l) => l.split('\t'));
const r2 = (x) => (x === null || !Number.isFinite(x) ? null : +x.toFixed(2));
const ge95 = (x) => x.comp * 100 >= 95 * x.aptos;
const perfil = (a) => { const M = new Map(); for (const [k, local, t, b, j] of ler(`perfil-${a}.tsv`)) M.set(k, { local, t: +t, b: +b, j: +j }); return M; };
const P22 = perfil(2022); const P26 = perfil(2026);
const membros = { 1: new Map(), 2: new Map() };
for (const [t, a, p] of ler('agregadas.tsv')) (membros[t].get(p) ?? membros[t].set(p, []).get(p)).push(a);
const S26 = { 1: [], 2: [] };
for (const c of ler('secoes-2026.tsv')) S26[c[0]].push({ k: c[1], aptos: +c[2], comp: +c[3], nova: c[4] === '1', local: c[5], localNovo: c[6] === '1', zonaNova: c[7] === '1', tte: +c[8], ano: +c[9], dado: +c[10], bio: +c[11] });
const S22 = { 1: [], 2: [] };
for (const c of ler('secoes-2022.tsv')) S22[c[0]].push({ k: c[1], aptos: +c[2], comp: +c[3], nova: c[4] === '1' });
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
const R = {};
// perfil de 2026 da seção do BU: principal + agregadas do turno
const perf26 = (k, t) => { let v = null; for (const m of [k, ...(membros[t].get(k) ?? [])]) { const q = P26.get(m); if (q) { v ??= { t: 0, b: 0, j: 0 }; v.t += q.t; v.b += q.b; v.j += q.j; } } return v; };

for (const t of [2, 1]) {
  const L = S26[t].map((x) => ({ ...x, p: perf26(x.k, t) }));
  const semPerfil = L.filter((x) => !x.p || !x.p.t);
  const C = L.filter((x) => x.p && x.p.t > 0);
  const N = C.filter((x) => x.nova); const A = C.filter((x) => !x.nova);
  const sb = (x) => (x.p.t === x.p.b ? '0%' : (x.p.t - x.p.b) / x.p.t < 0.05 ? '0-5%' : '5%+');
  const r = { semPerfil: { secoes: semPerfil.length, novas: semPerfil.filter((x) => x.nova).length, novasGe95: semPerfil.filter((x) => x.nova && ge95(x)).length },
    novas: N.length, antigas: A.length, novasGe95: N.filter(ge95).length, antigasGe95: A.filter(ge95).length,
    porSemBio: padroniza(N, A, sb),
    // controle mais duro: base = antigas com a mesma faixa de sem biometria e o mesmo tamanho
    porSemBioControlado: padroniza(N, A, sb, (x) => `${Math.floor(x.aptos / 25)}|${sb(x)}`),
    porSemBioETTE: padroniza(N, A, (x) => `${sb(x)} | ${x.tte === 0 ? 'sem TTE' : 'com TTE'}`),
  };
  // 1b. o 0% sem biometria inclui eleitores em TTE no aptos, que não estão no cadastro da seção: quanto do 0% tem TTE?
  // 3. invariante: cadastro sem eleitor sem biometria, sem TTE, e BU com habilitação pelo ano de nascimento
  const inv = C.filter((x) => x.p.t === x.p.b && x.tte === 0);
  r.invariante = { secoes100bioSemTTE: inv.length, comAno: inv.filter((x) => x.ano > 0).length, votosAno: inv.reduce((s, x) => s + x.ano, 0), novasGe95comAno: inv.filter((x) => x.nova && ge95(x) && x.ano > 0).length, maxAno: Math.max(...inv.map((x) => x.ano)) };
  // 4. liberação "dado digitado confere" nas seções 100% biométricas: novas 95%+ × antigas, padronizado por tamanho (faixas de 25)
  const cem = C.filter((x) => x.p.t === x.p.b);
  const taxaDado = (a) => { const c = a.reduce((s, x) => s + x.comp, 0); return { secoes: a.length, votantes: c, dado: a.reduce((s, x) => s + x.dado, 0), ano: a.reduce((s, x) => s + x.ano, 0), pctDado: r2(100 * a.reduce((s, x) => s + x.dado, 0) / c) }; };
  const base = new Map(); for (const x of cem.filter((y) => !y.nova)) { const e = Math.floor(x.aptos / 25); const v = base.get(e) ?? base.set(e, [0, 0]).get(e); v[0] += x.comp; v[1] += x.dado; }
  const baseAlta = new Map(); for (const x of cem.filter((y) => !y.nova && y.comp * 100 >= 90 * y.aptos)) { const e = Math.floor(x.aptos / 50); const v = baseAlta.get(e) ?? baseAlta.set(e, [0, 0]).get(e); v[0] += x.comp; v[1] += x.dado; }
  const esperadoDado = (a, B, f) => { let e = 0; let o = 0; let sem = 0; for (const x of a) { const v = B.get(f(x)); if (!v || !v[0]) { sem++; continue; } e += x.comp * v[1] / v[0]; o += x.dado; } return { observado: o, esperado: r2(e), razao: r2(o / e), semBase: sem }; };
  r.liberacao100bio = { novasGe95: taxaDado(cem.filter((x) => x.nova && ge95(x))), antigasGe95: taxaDado(cem.filter((x) => !x.nova && ge95(x))), novasMenos95: taxaDado(cem.filter((x) => x.nova && !ge95(x))), antigasMenos95: taxaDado(cem.filter((x) => !x.nova && !ge95(x))),
    novasGe95contraAntigasMesmoTamanho: esperadoDado(cem.filter((x) => x.nova && ge95(x)), base, (x) => Math.floor(x.aptos / 25)),
    novasGe95contraAntigas90maisMesmoTamanho: esperadoDado(cem.filter((x) => x.nova && ge95(x)), baseAlta, (x) => Math.floor(x.aptos / 50)) };
  // 2. régua de TTE: aptos − cadastro
  if (t === 2) {
    const v = { secoes: C.length, tte0: 0, tte0est0: 0, tte0estNeg: 0, tte0estPos: 0, ttePos: 0, ttePosEstPos: 0, ttePosEstIgual: 0, igual: 0, somaEst: 0, somaTTE: 0 };
    for (const x of L) { if (!x.p) continue; const est = x.aptos - x.p.t; v.somaEst += est; v.somaTTE += x.tte; if (est === x.tte) v.igual++; if (x.tte === 0) { v.tte0++; if (est === 0) v.tte0est0++; else if (est < 0) v.tte0estNeg++; else v.tte0estPos++; } else { v.ttePos++; if (est > 0) v.ttePosEstPos++; if (est === x.tte) v.ttePosEstIgual++; } }
    R.regua2026 = v;
  }
  R[`2026_${t}t`] = r;
}
// 2022: perfil × aptos do detalhe
{
  const v = { perfilEleitores: [...P22.values()].reduce((s, q) => s + q.t, 0), perfilSecoes: P22.size };
  for (const t of [1, 2]) {
    let somaAptos = 0; let com = 0; let est0 = 0; let neg = 0; let pos = 0; let semPerfil = 0;
    for (const x of S22[t]) { somaAptos += x.aptos; const q = P22.get(x.k); if (!q) { semPerfil++; continue; } com++; const e = x.aptos - q.t; if (e === 0) est0++; else if (e < 0) neg++; else pos++; }
    const chaves = new Set(S22[t].map((x) => x.k));
    v[`${t}t`] = { secoesDetalhe: S22[t].length, somaAptos, comPerfil: com, semPerfil, est0, estNeg: neg, estPos: pos, perfilSemDetalhe: [...P22.keys()].filter((k) => !chaves.has(k)).length };
  }
  R.regua2022 = v;
  R.perfil2026 = { eleitores: [...P26.values()].reduce((s, q) => s + q.t, 0), secoes: P26.size };
}
// contagens diretas (sem modelo), para o texto para leigos: seções e seções com 95%+ por grupo
const conta = (a, f) => { const o = {}; for (const x of a) { const c = f(x); const v = (o[c] ??= [0, 0]); v[0]++; if (ge95(x)) v[1]++; } return o; };
const catLocal = (x) => (x.zonaNova ? 'zona nova' : x.localNovo ? 'local novo' : 'local existente');
{
  const S22b = { 1: [], 2: [] };
  for (const c of ler('secoes-2022.tsv')) S22b[c[0]].push({ k: c[1], aptos: +c[2], comp: +c[3], nova: c[4] === '1', localNovo: c[6] === '1', zonaNova: c[7] === '1' });
  R.contagens = {};
  for (const t of [1, 2]) {
    R.contagens[`${t}t`] = {
      2022: conta(S22b[t], (x) => `${x.nova ? 'nova' : 'antiga'} | ${catLocal(x)}`),
      2026: conta(S26[t], (x) => `${x.nova ? 'nova' : 'antiga'} | ${catLocal(x)}`),
      '2026 TTE': conta(S26[t], (x) => `${x.nova ? 'nova' : 'antiga'} | ${x.tte === 0 ? 'sem TTE' : x.tte <= 3 ? 'TTE 1-3' : 'TTE 4+'}`),
      '2026 sem biometria no cadastro': conta(S26[t].map((x) => ({ ...x, p: perf26(x.k, t) })), (x) => `${x.nova ? 'nova' : 'antiga'} | ${!x.p || !x.p.t ? 'sem perfil' : x.p.t === x.p.b ? '0%' : (x.p.t - x.p.b) / x.p.t < 0.05 ? '0-5%' : '5%+'}`),
    };
  }
}
// seções de trânsito: TTE como maioria dos aptos (2026, BU) e seções de 2022 sem cadastro no perfil (candidatas a seção só de TTE)
{
  R.transito = {};
  for (const t of [1, 2]) {
    const tt = (x) => (x.tte === 0 ? 'sem TTE' : x.tte * 2 >= x.aptos ? (x.tte === x.aptos ? 'só TTE' : 'TTE maioria') : 'TTE minoria');
    R.transito[`2026_${t}t`] = { porTipo: conta(S26[t], (x) => `${x.nova ? 'nova' : 'antiga'} | ${tt(x)}`), padronizado: padroniza(S26[t].filter((x) => x.nova), S26[t].filter((x) => !x.nova), tt) };
    const sp = S22[t].filter((x) => !P22.has(x.k)); const pouco = S22[t].filter((x) => P22.has(x.k) && P22.get(x.k).t * 2 < x.aptos);
    R.transito[`2022_${t}t`] = { semPerfil: conta(sp, (x) => (x.nova ? 'nova' : 'antiga')), cadastroMenorQueMetadeDosAptos: conta(pouco, (x) => (x.nova ? 'nova' : 'antiga')), padronizadoPorCadastro: padroniza(S22[t].filter((x) => x.nova), S22[t].filter((x) => !x.nova), (x) => (!P22.has(x.k) ? 'sem perfil' : P22.get(x.k).t * 2 < x.aptos ? 'cadastro < metade' : 'cadastro >= metade')) };
  }
}
writeFileSync(path.join(DIR_50, 'cruzamento-resumo.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
