// Estatístico eleitoral, H19: falha de digital induzida na seção-alvo (plano: docs/analysis/estatistico-eleitoral/20-h19-plano.md).
// Entrada: data/parsed/auditoria/estatistico/h19/medidas.csv.gz (estatistico-h19-medidas.mjs).
// Grupo de comparação g = local de votação do 2º turno × modelo da urna do 2º turno; erro-padrão CR1 por local.
// Parte 1 (detecção): salto local J = Δlogit(f) da seção − Δlogit(f) dos pares do grupo; z binomial e z com sobredispersão
//   por UF (τ² por MAD); Bonferroni e BH sobre todas as seções testadas.
// Parte 2 (confirmatória): M1 ΔY ~ Δa + Δf + Δh + controles (99 testes: 33 unidades × 3); M2 ΔY ~ S↑ + S↓ + controles
//   (6 testes: Brasil e 5 regiões, só S↑). Total 105, Bonferroni bicaudal. Placebo: Y do 1º turno. Sensibilidades exploratórias.
// Efeito mínimo detectável: β_MDE = (z_Bonf + z_0,8) × erro; em votos, injeção de φ = 1% das falhas a mais (E⁺) como voto a mais.
// Carga, salto por seção e regressão ficam em estatistico-h19-lib.mjs (o mesmo código do exploratório).
// Uso: node --max-old-space-size=8192 scripts/auditoria/estatistico-h19-analise.mjs
// Saída: data/parsed/auditoria/estatistico/h19/{resultado.json, testes.csv, saltos.csv}
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { REGIOES, UFS_BR, N_TESTES, DIR, pBicaudal, invNormal, Z_BONF, Z_PODER, mediana, bh, todas, descritivo, exclusoes, amostra, porGrupo, sobredispersao, regredir, linhasModelo, unidades } from './estatistico-h19-lib.mjs';

const nSec = amostra.length;
const zSecBonf = invNormal(1 - 0.05 / (2 * nSec));
const pOd = amostra.map((s) => pBicaudal(s.zOd));
const bhSec = bh(pOd);
amostra.forEach((s, i) => { s.bhOd = bhSec.has(i); });
const contaSaltos = (filtro) => {
  const v = amostra.filter(filtro);
  return { secoes: v.length, trocada: v.filter((s) => s.trocada).length, leitorPior: v.filter((s) => s.saltoA >= 0.3).length,
    somaEmais: Math.round(v.reduce((a, s) => a + s.Emais, 0)), somaE: Math.round(v.reduce((a, s) => a + s.E, 0)),
    mediaSaltoFpp: v.length ? (100 * v.reduce((a, s) => a + s.saltoF, 0)) / v.length : null,
    porRegiao: Object.fromEntries(Object.entries(REGIOES).map(([r, ufs]) => [r, v.filter((s) => ufs.includes(s.uf)).length])) };
};
const parte1 = {
  secoesTestadas: nSec, grupos: [...porGrupo.values()].filter((g) => g.length >= 2).length, zBonferroniSecao: zSecBonf, sobredispersao,
  binomial: { sobeBonf: contaSaltos((s) => s.zBin >= zSecBonf), desceBonf: contaSaltos((s) => s.zBin <= -zSecBonf) },
  sobredisperso: {
    sobeBonf: contaSaltos((s) => s.zOd >= zSecBonf), desceBonf: contaSaltos((s) => s.zOd <= -zSecBonf),
    sobeBH: contaSaltos((s) => s.bhOd && s.zOd > 0), desceBH: contaSaltos((s) => s.bhOd && s.zOd < 0),
    sobe3: contaSaltos((s) => s.zOd >= 3), desce3: contaSaltos((s) => s.zOd <= -3),
  },
  Sup: contaSaltos((s) => s.Sup), Sdown: contaSaltos((s) => s.Sdown),
  esperadoPorCaudaZ3: nSec * pBicaudal(3) / 2,
};
parte1.topo = amostra.filter((s) => s.zOd >= zSecBonf || s.Sup).sort((a, b) => b.zOd - a.zOd).slice(0, 10)
  .map((s) => ({ id: s.id, modelo1: s.modelo1, modelo2: s.modelo2, trocada: s.trocada, B1: s.B1, F1: s.F1, B2: s.B2, F2: s.F2, a1: s.a1, a2: s.a2, H1: s.H1, H2: s.H2, saltoFpp: 100 * s.saltoF, saltoA: s.saltoA, J: s.J, zBin: s.zBin, zOd: s.zOd, E: s.E, paresNoGrupo: porGrupo.get(s.g).length - 1 }));


const secsDe = (ufs, filtro = () => true) => { const set = new Set(ufs); return amostra.filter((s) => set.has(s.uf) && filtro(s)); };
const NOMES_M1 = ['Δa', 'Δf', 'Δh'];
const testes = [];
const regressoes = { M1: {}, M2: {}, placeboM1: {}, semTrocadasM1: {}, semTrocadasM2: {} };
const zDe = (r, i) => r.beta[i] / r.se[i];

for (const [unidade, ufs] of unidades) {
  const secs = secsDe(ufs);
  const base = regredir(linhasModelo(secs, 'M1'));
  if (!base) continue;
  const somaEmais = secs.reduce((a, s) => a + s.Emais, 0);
  const o = { N: base.N, grupos: base.grupos, locais: base.clusters, somaEmais };
  NOMES_M1.forEach((nome, i) => {
    const t = { modelo: 'M1', unidade, coef: nome, beta: base.beta[i], se: base.se[i], z: zDe(base, i), p: pBicaudal(zDe(base, i)), betaMDE: (Z_BONF + Z_PODER) * base.se[i] };
    if (nome !== 'Δa') {
      for (const cand of [13, 22]) {
        const r = regredir(linhasModelo(secs, 'M1', { inj: { phi: 0.01, cand, via: nome === 'Δh' ? 'h' : 'f' } }));
        const dz = (r.beta[i] - base.beta[i]) / base.se[i];
        const phi = Math.abs(dz) > 0 ? (0.01 * (Z_BONF + Z_PODER)) / Math.abs(dz) : Infinity;
        t[`phiMDE${cand}`] = phi; t[`votosMDE${cand}`] = phi * somaEmais; t[`dzPorPhi1pct${cand}`] = dz;
      }
    }
    testes.push(t);
    o[nome] = t;
  });
  regressoes.M1[unidade] = o;
  const pl = regredir(linhasModelo(secs, 'M1', { desfecho: 'placebo' }));
  regressoes.placeboM1[unidade] = Object.fromEntries(NOMES_M1.map((n, i) => [n, { beta: pl.beta[i], se: pl.se[i], z: zDe(pl, i) }]));
  const st = regredir(linhasModelo(secsDe(ufs, (s) => !s.trocada), 'M1'));
  if (st) regressoes.semTrocadasM1[unidade] = Object.fromEntries(NOMES_M1.map((n, i) => [n, { beta: st.beta[i], se: st.se[i], z: zDe(st, i) }]));
  if (unidade === 'Brasil' || REGIOES[unidade]) {
    const m2 = regredir(linhasModelo(secs, 'M2'));
    const somaEsup = secs.reduce((a, s) => a + (s.Sup ? s.Emais : 0), 0);
    const t = { modelo: 'M2', unidade, coef: 'S↑', beta: m2.beta[0], se: m2.se[0], z: zDe(m2, 0), p: pBicaudal(zDe(m2, 0)), betaMDE: (Z_BONF + Z_PODER) * m2.se[0], secoesSup: secs.filter((s) => s.Sup).length, secoesSdown: secs.filter((s) => s.Sdown).length };
    for (const cand of [13, 22]) {
      const r = regredir(linhasModelo(secs, 'M2', { inj: { phi: 0.01, cand, via: 'f', so: (s) => s.Sup } }));
      const dz = (r.beta[0] - m2.beta[0]) / m2.se[0];
      const phi = Math.abs(dz) > 0 ? (0.01 * (Z_BONF + Z_PODER)) / Math.abs(dz) : Infinity;
      t[`phiMDE${cand}`] = phi; t[`votosMDE${cand}`] = phi * somaEsup; t[`dzPorPhi1pct${cand}`] = dz;
    }
    testes.push(t);
    regressoes.M2[unidade] = { N: m2.N, Sup: t, Sdown: { beta: m2.beta[1], se: m2.se[1], z: zDe(m2, 1) }, somaEmaisSup: somaEsup };
    const m2st = regredir(linhasModelo(secsDe(ufs, (s) => !s.trocada), 'M2'));
    if (m2st) regressoes.semTrocadasM2[unidade] = { beta: m2st.beta[0], se: m2st.se[0], z: zDe(m2st, 0) };
  }
}
if (testes.length !== N_TESTES) console.error(`AVISO: ${testes.length} testes, plano declara ${N_TESTES}`);
const bhT = bh(testes.map((t) => t.p));
testes.forEach((t, i) => { t.bonferroni = Math.abs(t.z) >= Z_BONF; t.bh = bhT.has(i); });

// critério de decisão (conjunção do plano)
const decisoes = testes.filter((t) => t.bonferroni).map((t) => {
  const pl = t.modelo === 'M1' ? regressoes.placeboM1[t.unidade][t.coef] : null;
  const st = t.modelo === 'M1' ? regressoes.semTrocadasM1[t.unidade]?.[t.coef] : regressoes.semTrocadasM2[t.unidade];
  const c2 = pl ? Math.abs(pl.z) < 2 || Math.sign(pl.z) !== Math.sign(t.z) : true;
  const c3 = st ? Math.sign(st.z) === Math.sign(t.z) && Math.abs(st.z) >= 2 : false;
  return { modelo: t.modelo, unidade: t.unidade, coef: t.coef, z: t.z, placeboZ: pl?.z ?? null, semTrocadasZ: st?.z ?? null, criterio2: c2, criterio3: c3, leitura: c2 && c3 ? 'compatível com H19' : 'inconclusivo' };
});

// sensibilidades (exploratórias): Brasil e regiões, M1 e M2
const sensibilidade = {};
const VARIANTES = {
  'grupo = local, com indicadores de modelo': { grupo: 'cl', opc: { modelos: true } },
  'com Δcomparecimento': { opc: { comComp: true } },
  'sem controle Δ(ano de nascimento)': { opc: { semAnb: true } },
};
for (const [nome, v] of Object.entries(VARIANTES)) {
  for (const [unidade, ufs] of unidades.slice(0, 6)) {
    const secs = secsDe(ufs);
    const r1 = regredir(linhasModelo(secs, 'M1', v));
    const r2 = regredir(linhasModelo(secs, 'M2', v));
    (sensibilidade[nome] ??= {})[unidade] = {
      M1: Object.fromEntries(NOMES_M1.map((n, i) => [n, { beta: r1.beta[i], se: r1.se[i], z: zDe(r1, i) }])),
      'M2 S↑': { beta: r2.beta[0], se: r2.se[0], z: zDe(r2, 0) },
    };
  }
}

// descritivo da amostra (para o texto)
const descAmostra = {};
for (const t of [1, 2]) {
  const d = { R: 0, F: 0, H: 0, tentR: 0 };
  for (const s of amostra) { d.R += s[`R${t}`]; d.F += s[`F${t}`]; d.H += s[`H${t}`]; d.tentR += s[`tentR${t}`]; }
  descAmostra[t] = { ...d, f: d.F / (d.R + d.F), a: d.tentR / d.R, hDeF: d.H / d.F };
}
const dist = (k) => { const v = amostra.map((s) => s[k]).sort((a, b) => a - b); const q = (p) => v[Math.floor(p * (v.length - 1))]; return { p01: q(0.001), p1: q(0.01), p5: q(0.05), p25: q(0.25), p50: q(0.5), p75: q(0.75), p95: q(0.95), p99: q(0.99), p999: q(0.999) }; };
for (const s of amostra) { s.dfpp = 100 * (s.f2 - s.f1); s.da = s.a2 - s.a1; s.dhpp = 100 * (s.h2 - s.h1); s.saltoFpp = 100 * s.saltoF; }
descAmostra.distribuicoes = { 'Δf (pontos)': dist('dfpp'), 'Δa (tentativas)': dist('da'), 'Δh (pontos)': dist('dhpp'), 'salto de f contra os pares (pontos)': dist('saltoFpp'), 'saltoA': dist('saltoA'), J: dist('J'), zOd: dist('zOd') };

// ---------- saída ----------
const resultado = {
  geradoEm: new Date().toISOString(), plano: 'docs/analysis/estatistico-eleitoral/20-h19-plano.md', zBonferroni: Z_BONF, zPoder80: Z_PODER, testes: testes.length,
  descritivo, exclusoes, amostra: amostra.length, descAmostra, parte1, regressoes, decisoes,
  significativosBonferroni: testes.filter((t) => t.bonferroni), significativosBH: testes.filter((t) => t.bh), sensibilidade,
};
await writeFile(path.join(DIR, 'resultado.json'), JSON.stringify(resultado, null, 1));
const csv = (linhas, cols) => [cols.join(';'), ...linhas.map((l) => cols.map((c) => (typeof l[c] === 'number' ? +l[c].toPrecision(6) : l[c] ?? '')).join(';'))].join('\n') + '\n';
await writeFile(path.join(DIR, 'testes.csv'), csv(testes, ['modelo', 'unidade', 'coef', 'beta', 'se', 'z', 'p', 'bonferroni', 'bh', 'betaMDE', 'phiMDE13', 'votosMDE13', 'phiMDE22', 'votosMDE22', 'secoesSup']));
const saltos = amostra.filter((s) => s.Sup || s.Sdown || Math.abs(s.zOd) >= zSecBonf).sort((a, b) => b.zOd - a.zOd)
  .map((s) => ({ id: s.id, modelo1: s.modelo1, modelo2: s.modelo2, trocada: s.trocada, B1: s.B1, F1: s.F1, H1: s.H1, B2: s.B2, F2: s.F2, H2: s.H2, a1: s.a1, a2: s.a2, saltoFpp: s.saltoFpp, saltoA: s.saltoA, J: s.J, zBin: s.zBin, zOd: s.zOd, E: s.E, Sup: s.Sup, Sdown: s.Sdown, bonfOd: Math.abs(s.zOd) >= zSecBonf ? 1 : 0 }));
await writeFile(path.join(DIR, 'saltos.csv'), csv(saltos, Object.keys(saltos[0] ?? { id: 0 })));
console.log(JSON.stringify({ zBonferroni: Z_BONF, exclusoes, amostra: amostra.length, descAmostra: { 1: descAmostra[1], 2: descAmostra[2] }, parte1: { ...parte1, sobredispersao: undefined }, decisoes, significativosBonferroni: resultado.significativosBonferroni.map((t) => [t.modelo, t.unidade, t.coef, +t.beta.toFixed(3), +t.z.toFixed(2)]) }, null, 1));
