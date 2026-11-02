// Estatístico eleitoral, fechamento da H13 (doc 28): EXPLORATÓRIO, fora do plano 27. O sinal novo que passou no teste
// declarado (MG, painel, e_V3m +1,93, z 4,15) é examinado aqui para dizer onde está e o que o explicaria. Nada daqui muda a
// forma final, que sai da regra do plano.
//   1. Concentração: contribuição de cada seção ao numerador do coeficiente (x residualizado no efeito fixo e nos outros
//      regressores × y); parte nas 1%, 5% e 10% maiores zonas e municípios; refeito sem os 10 municípios de maior contribuição.
//   2. Regressão à média: + parcela do 13 no 1º turno e x_V3m do 1º turno.
//   3. Por modelo de urna (UE2013/UE2015 contra UE2020/UE2022): interação e_V3m × urna antiga.
//   4. Por sinal da variação: e_V3m positivo (V3m cresceu) e negativo, em separado.
// Uso: node --max-old-space-size=8000 scripts/auditoria/estatistico-h13-final-mg-v3m.mjs
// Saída: data/parsed/auditoria/estatistico/h13-final/mg-v3m.json
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { SAIDA, carregar, montar, ajustar, regredir, ctrlDe, baseModelo, MODELOS } from './estatistico-h13-final-lib.mjs';

const { secoes } = await carregar(['mg']);
const rs = montar([...secoes.values()], 'P', {});
const base = ajustar(rs, 'P');
const out = { N: base.N, base: { v2: base.v2, v3m: base.v3m, v3s: base.v3s, dC: base.dC } };
const { base: bm } = baseModelo(rs);

// 1. concentração: x residualizado (e_V3m sobre os outros regressores, mesmo efeito fixo)
const outros = (r) => [r.foc[0], r.foc[2], r.dC, ...ctrlDe(r, bm)];
const nOutros = 3 + ctrlDe(rs[0], bm).length;
const rx = regredir(rs.map((r) => ({ w: r.w, g: r.g, y: r.foc[1], cols: outros(r), r })), Array.from({ length: nOutros }, (_, i) => `c${i}`), 0);
const contrib = new Map(), contribZ = new Map(), alav = new Map(), nSec = new Map();
let num = 0, den = 0;
rx.idx.forEach((i, k) => {
  const r = rs[i]; const x = rx.resid[k];
  const c = r.w * x * r.y; num += c; den += r.w * x * x;
  alav.set(r.mun, (alav.get(r.mun) ?? 0) + r.w * x * x);
  nSec.set(r.mun, (nSec.get(r.mun) ?? 0) + 1);
  contrib.set(r.mun, (contrib.get(r.mun) ?? 0) + c);
  contribZ.set(r.zona, (contribZ.get(r.zona) ?? 0) + c);
});
out.conferenciaFWL = { betaFWL: (num / den) * 100, betaModelo: base.v3m.beta };
const parte = (m) => { const v = [...m.values()].sort((a, b) => b - a); const n = v.length; const p = (q) => v.slice(0, Math.max(1, Math.round(q * n))).reduce((s, x) => s + x, 0) / num; return { unidades: n, top1: p(0.01), top5: p(0.05), top10: p(0.10), positivas: v.filter((x) => x > 0).length }; };
out.concentracao = { municipios: parte(contrib), zonas: parte(contribZ) };
const top10 = [...contrib.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
const { abrirLeitura } = await import('../../src/banco-leitura.js');
const { db } = await abrirLeitura();
const nomeMun = new Map(db.prepare("SELECT * FROM municipio WHERE uf = 'mg'").all().map((r) => [`mg/${r.codigo ?? r.municipio ?? r.cd_municipio}`, r.nome ?? r.nm_municipio ?? null]));
db.close();
out.top10Municipios = top10.map(([m, c]) => ({ municipio: m, nome: nomeMun.get(m) ?? null, secoes: nSec.get(m), parteDoNumerador: c / num, parteDaAlavanca: alav.get(m) / den,
  betaLocal: (c / alav.get(m)) * 100 }));
out.top10Soma = { numerador: top10.reduce((s, [, c]) => s + c, 0) / num, alavanca: top10.reduce((s, [m]) => s + alav.get(m), 0) / den, secoes: top10.reduce((s, [m]) => s + nSec.get(m), 0) };
const semTop = new Set(top10.map(([m]) => m));
const fSem = ajustar(rs.filter((r) => !semTop.has(r.mun)), 'P');
out.semTop10Municipios = { N: fSem.N, v3m: fSem.v3m, v2: fSem.v2 };

// 1b. referência nula da concentração (como no doc 22): efeito homogêneo + ruído com sinal sorteado por local,
// y* = β̂·r_x + η_local·e (e = resíduo do modelo completo), 1.000 repetições; estatísticas: parte das 1% maiores
// municípios no numerador e o β sem os 10 municípios de maior contribuição (sem reajuste: Σ fora ÷ alavanca fora).
{
  const bHat = num / den;
  const e = base.reg.resid; // mesma ordem de linhas que rx (mesmos grupos, mesmas linhas)
  const L = rx.idx.map((i, k) => ({ mun: rs[i].mun, g: rs[i].g, w: rs[i].w, x: rx.resid[k], e: e[k] }));
  const nTop1 = Math.max(1, Math.round(0.01 * contrib.size));
  const estat = (cs) => {
    const porMun = new Map(); for (let k = 0; k < L.length; k++) porMun.set(L[k].mun, (porMun.get(L[k].mun) ?? 0) + cs[k]);
    const tot = cs.reduce((s, c) => s + c, 0);
    const ord = [...porMun.entries()].sort((a, b) => b[1] - a[1]);
    const top1 = ord.slice(0, nTop1).reduce((s, [, c]) => s + c, 0) / tot;
    const fora = new Set(ord.slice(0, 10).map(([m]) => m));
    let nf = 0, df = 0; for (let k = 0; k < L.length; k++) if (!fora.has(L[k].mun)) { nf += cs[k]; df += L[k].w * L[k].x * L[k].x; }
    return { top1, betaSemTop10: (nf / df) * 100 };
  };
  const obs = estat(L.map((l) => l.w * l.x * (bHat * l.x + l.e)));
  let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  let geTop = 0, leSem = 0; const sims = [];
  for (let rep = 0; rep < 1000; rep++) {
    const eta = new Map();
    const cs = L.map((l) => { let h = eta.get(l.g); if (h === undefined) eta.set(l.g, (h = rnd() < 0.5 ? -1 : 1)); return l.w * l.x * (bHat * l.x + h * l.e); });
    const s = estat(cs); sims.push(s);
    if (s.top1 >= obs.top1) geTop++;
    if (s.betaSemTop10 <= obs.betaSemTop10) leSem++;
  }
  const q = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(p * (s.length - 1))]; };
  out.nulaConcentracao = { repeticoes: 1000, observado: obs, pTop1: geTop / 1000, pSemTop10: leSem / 1000,
    nulaTop1: { mediana: q(sims.map((s) => s.top1), 0.5), p95: q(sims.map((s) => s.top1), 0.95) },
    nulaSemTop10: { p05: q(sims.map((s) => s.betaSemTop10), 0.05), mediana: q(sims.map((s) => s.betaSemTop10), 0.5) } };
}

// 2. regressão à média
const rtm = regredir(rs.map((r) => ({ w: r.w, g: r.g, y: r.y, cols: [...r.foc, r.dC, r.s.t1.v13 / (r.s.t1.v13 + r.s.t1.v22), r.s.t1.log.v3m / r.s.t1.log.votos, ...ctrlDe(r, bm)], r })),
  ['eV2', 'eV3m', 'eV3s', 'dC', 'Y1', 'x3m1', ...Array.from({ length: ctrlDe(rs[0], bm).length }, (_, i) => `c${i}`)], 6);
const cf = (reg, n) => { const p = reg.nomes.indexOf(n); return { beta: reg.beta[p] * 100, se: Math.sqrt(reg.cov[p][p]) * 100, z: reg.beta[p] / Math.sqrt(reg.cov[p][p]) }; };
out.regressaoAMedia = { v3m: cf(rtm, 'eV3m'), v2: cf(rtm, 'eV2') };

// 3. urna antiga × nova
const antiga = (r) => (r.modelo === 'ue2013' || r.modelo === 'ue2015' ? 1 : 0);
const inter = regredir(rs.map((r) => ({ w: r.w, g: r.g, y: r.y, cols: [...r.foc, r.dC, r.foc[1] * antiga(r), ...ctrlDe(r, bm)], r })),
  ['eV2', 'eV3m', 'eV3s', 'dC', 'eV3mXantiga', ...Array.from({ length: ctrlDe(rs[0], bm).length }, (_, i) => `c${i}`)], 5);
out.urna = { secoesUrnaAntiga: rs.filter((r) => antiga(r)).length, v3mNova: cf(inter, 'eV3m'), interacaoAntiga: cf(inter, 'eV3mXantiga') };

// 4. V3m que cresceu × que caiu
const sep = regredir(rs.map((r) => ({ w: r.w, g: r.g, y: r.y, cols: [r.foc[0], Math.max(0, r.foc[1]), Math.min(0, r.foc[1]), r.foc[2], r.dC, ...ctrlDe(r, bm)], r })),
  ['eV2', 'eV3mSobe', 'eV3mDesce', 'eV3s', 'dC', ...Array.from({ length: ctrlDe(rs[0], bm).length }, (_, i) => `c${i}`)], 5);
out.sinalDaVariacao = { sobe: cf(sep, 'eV3mSobe'), desce: cf(sep, 'eV3mDesce'), secoesSobe: rs.filter((r) => r.foc[1] > 0).length, secoesDesce: rs.filter((r) => r.foc[1] < 0).length };

await writeFile(path.join(SAIDA, 'mg-v3m.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
void MODELOS;
