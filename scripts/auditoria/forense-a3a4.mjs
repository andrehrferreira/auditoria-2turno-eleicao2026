// Forense estatística, teste 1 (doc 07 A3/A4): seções com 100% e com ≥ 90% dos votos válidos para um candidato.
// Uso: node scripts/auditoria/forense-a3a4.mjs [turno]
// Entrada: forense/secoes-<t>t.csv (+ perfil e locais). Saída: forense/a3a4-<t>t.json e forense/a3a4-<t>t-secoes.csv.
//
// Para cada seção e finalista: x = votos do candidato, n = votos válidos (nominais). Esperado sob três modelos nulos,
// sempre com a taxa das OUTRAS seções do grupo (deixa a própria seção de fora):
//   binom-zona     X ~ Binomial(n, p da zona)      → eleitores da zona homogêneos (subestima a cauda: há bairros)
//   binom-mun      X ~ Binomial(n, p do município)
//   betabin-zona   X ~ BetaBinomial(n, p da zona, ρ da zona) → admite a heterogeneidade real entre seções da zona
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  DIR_SAIDA, carregarSecoes, chaveSecao, faixaTamanho, lnGama, paraCsv, parametrosBeta, salvar, sobredispersao,
} from './forense-lib.mjs';

const turno = Number(process.argv[2] ?? 2);
const CANDIDATOS = [13, 22];
const FAIXAS = ['90-95', '95-99', '99-100', '100'];

const secoes = (await carregarSecoes(turno)).filter((s) => s.validos > 0);
const MAXN = secoes.reduce((m, s) => Math.max(m, s.validos), 0) + 1;
const lnFat = new Float64Array(MAXN + 1);
for (let i = 1; i <= MAXN; i++) lnFat[i] = lnFat[i - 1] + Math.log(i);
const lnComb = (n, k) => lnFat[n] - lnFat[k] - lnFat[n - k];
const lnBeta = (a, b) => lnGama(a) + lnGama(b) - lnGama(a + b);

// 1º turno da mesma seção, para comparar (D5).
let outroTurno = null;
const arqOutro = path.join(DIR_SAIDA, `secoes-${turno === 2 ? 1 : 2}t.csv`);
if (existsSync(arqOutro)) outroTurno = new Map((await carregarSecoes(turno === 2 ? 1 : 2)).map((s) => [chaveSecao(s), s]));

/** k mínimo para x/n ≥ t% (inteiro, sem erro de ponto flutuante). */
const kMin = (n, t) => Math.floor((t * n + 99) / 100);

/** Caudas P(X ≥ k) para k em `ks` (decrescente), somando o termo `lnTermo(j)` de j = n até o menor k. */
function caudas(n, ks, lnTermo) {
  const res = new Map();
  let acum = 0;
  let i = 0;
  for (let j = n; j >= ks[ks.length - 1]; j--) {
    acum += Math.exp(lnTermo(j));
    while (i < ks.length && ks[i] === j) res.set(ks[i++], Math.min(1, acum));
  }
  while (i < ks.length) res.set(ks[i++], Math.min(1, acum));
  return res;
}

function agrupar(chave) {
  const g = new Map();
  for (const s of secoes) {
    const k = chave(s);
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(s);
  }
  return g;
}
const zonas = agrupar((s) => `${s.uf}/${s.zona}`);
const municipios = agrupar((s) => `${s.uf}/${s.municipio}`);

const vazio = () => Object.fromEntries(FAIXAS.map((f) => [f, 0]));
const resumo = {};
const lista = [];
const modelos = ['observado', 'binom-zona', 'binom-mun', 'betabin-zona'];
const conta = (obj, chave) => (obj[chave] ??= Object.fromEntries(modelos.map((m) => [m, vazio()])));

for (const c of CANDIDATOS) {
  const v = `v${c}`;
  const R = (resumo[c] = { total: Object.fromEntries(modelos.map((m) => [m, vazio()])), uf: {}, categoria: {}, tamanho: {} });
  const somaGrupo = (grupo) => grupo.reduce((a, s) => ({ x: a.x + s[v], n: a.n + s.validos }), { x: 0, n: 0 });
  const tot = new Map();
  for (const [k, g] of zonas) tot.set(`z:${k}`, { ...somaGrupo(g), rho: sobredispersao(g.map((s) => ({ x: s[v], n: s.validos }))).rho, k: g.length });
  for (const [k, g] of municipios) tot.set(`m:${k}`, somaGrupo(g));

  for (const s of secoes) {
    const n = s.validos, x = s[v];
    const z = tot.get(`z:${s.uf}/${s.zona}`);
    const m = tot.get(`m:${s.uf}/${s.municipio}`);
    const pz = z.n - n > 0 ? (z.x - x) / (z.n - n) : m.n - n > 0 ? (m.x - x) / (m.n - n) : z.x / z.n;
    const pm = m.n - n > 0 ? (m.x - x) / (m.n - n) : pz;
    const k90 = kMin(n, 90), k95 = kMin(n, 95), k99 = kMin(n, 99);
    const ks = [...new Set([n, k99, k95, k90, ...(x >= k90 ? [x] : [])])].sort((a, b) => b - a);

    const binom = (p) => (p <= 0 ? new Map(ks.map((k) => [k, 0])) : p >= 1 ? new Map(ks.map((k) => [k, 1]))
      : caudas(n, ks, (j) => lnComb(n, j) + j * Math.log(p) + (n - j) * Math.log1p(-p)));
    const pb = parametrosBeta(Math.min(Math.max(pz, 1e-6), 1 - 1e-6), z.rho);
    const base = pb ? lnBeta(pb.a, pb.b) : 0;
    const resultado = {
      'binom-zona': binom(pz),
      'binom-mun': binom(pm),
      'betabin-zona': pb ? caudas(n, ks, (j) => lnComb(n, j) + lnBeta(j + pb.a, n - j + pb.b) - base) : binom(pz),
    };
    const destinos = [R.total, conta(R.uf, s.uf), conta(R.categoria, s.categoria), conta(R.tamanho, faixaTamanho(n))];
    for (const [mod, t] of Object.entries(resultado)) {
      const p = { '90-95': t.get(k90) - t.get(k95), '95-99': t.get(k95) - t.get(k99), '99-100': t.get(k99) - t.get(n), '100': t.get(n) };
      for (const d of destinos) for (const f of FAIXAS) d[mod][f] += p[f];
    }
    if (x >= k90) {
      const faixa = x === n ? '100' : x >= k99 ? '99-100' : x >= k95 ? '95-99' : '90-95';
      for (const d of destinos) d.observado[faixa]++;
      const o = outroTurno?.get(chaveSecao(s));
      lista.push({
        uf: s.uf, municipio: s.municipio, nome_municipio: s.nome_municipio, zona: s.zona, secao: s.secao, categoria: s.categoria,
        nome_local: s.nome_local ?? '', tipo_urna: s.tipo_urna, candidato: c, votos: x, validos: n, pct: +(100 * x / n).toFixed(2), faixa,
        p_zona: +pz.toFixed(4), rho_zona: +z.rho.toFixed(4), p_mun: +pm.toFixed(4),
        pval_binom_zona: resultado['binom-zona'].get(x), pval_betabin_zona: resultado['betabin-zona'].get(x),
        comparecimento: s.comp == null ? '' : +s.comp.toFixed(3), p60: s.p60 == null ? '' : +s.p60.toFixed(3),
        escol_baixa: s.pBaixa == null ? '' : +s.pBaixa.toFixed(3), indigena: s.pInd == null ? '' : +s.pInd.toFixed(3),
        pct_outro_turno: o && o.validos > 0 ? +(100 * o[v] / o.validos).toFixed(2) : '',
        validos_outro_turno: o ? o.validos : '',
      });
    }
  }
}

// Limite de Bonferroni: uma seção é "surpreendente" se P(X ≥ x) < 0,05 / (seções × candidatos).
const limite = 0.05 / (secoes.length * CANDIDATOS.length);
const surpreendentes = (modelo) => lista.filter((l) => l[modelo] < limite);
const arredonda = (o) => JSON.parse(JSON.stringify(o, (k, val) => (typeof val === 'number' ? +val.toFixed(2) : val)));
const saida = {
  turno, secoes: secoes.length, limiteBonferroni: limite,
  surpreendentes: Object.fromEntries(['pval_binom_zona', 'pval_betabin_zona'].map((m) => [m,
    Object.fromEntries(CANDIDATOS.map((c) => [c, surpreendentes(m).filter((l) => l.candidato === c).length]))])),
  resumo: arredonda(resumo),
};
await salvar(`a3a4-${turno}t.json`, saida);
await salvar(`a3a4-${turno}t-secoes.csv`, paraCsv(lista.sort((a, b) => a.pval_betabin_zona - b.pval_betabin_zona), Object.keys(lista[0] ?? {})));

const f = (o) => FAIXAS.map((x) => `${x}: ${Math.round(o[x])}`).join(' · ');
console.log(`A3/A4, ${turno}º turno, ${secoes.length} seções com voto válido para presidente`);
for (const c of CANDIDATOS) {
  console.log(`\n${c}`);
  for (const m of modelos) console.log(`  ${m.padEnd(13)} ${f(resumo[c].total[m])}`);
  console.log('  por categoria (observado / esperado betabin-zona, ≥ 90%):');
  for (const [cat, d] of Object.entries(resumo[c].categoria)) {
    const soma = (o) => FAIXAS.reduce((a, x) => a + o[x], 0);
    console.log(`    ${cat.padEnd(12)} ${soma(d.observado)} / ${soma(d['betabin-zona']).toFixed(1)}   100%: ${d.observado['100']} / ${d['betabin-zona']['100'].toFixed(1)}`);
  }
  console.log('  por tamanho (votos válidos):');
  for (const [t, d] of Object.entries(resumo[c].tamanho).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))) {
    const soma = (o) => FAIXAS.reduce((a, x) => a + o[x], 0);
    console.log(`    ${t.padEnd(8)} ≥90%: ${soma(d.observado)} (binom ${soma(d['binom-zona']).toFixed(1)}, betabin ${soma(d['betabin-zona']).toFixed(1)})   100%: ${d.observado['100']} (binom ${d['binom-zona']['100'].toFixed(2)}, betabin ${d['betabin-zona']['100'].toFixed(2)})`);
  }
}
console.log(`\nSurpreendentes (P < ${limite.toExponential(1)}):`, JSON.stringify(saida.surpreendentes));
