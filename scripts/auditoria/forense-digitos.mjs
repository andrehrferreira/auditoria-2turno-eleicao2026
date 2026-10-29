// Forense estatística, teste 3: dígitos das contagens de votos por seção.
// Uso: node scripts/auditoria/forense-digitos.mjs [turno]   → forense/digitos-<t>t.json
//
// (a) Último dígito (Beber e Scacco 2012): com contagens ≥ 100 o último dígito é praticamente uniforme;
//     números inventados à mão costumam fugir disso. χ² (9 gl) contra 10% por dígito.
// (b) 2º dígito de Benford (2BL, Mebane): contagens ≥ 10, χ² (9 gl) contra Benford. Como Benford não é a lei
//     certa para contagens limitadas pelo tamanho da seção, comparamos também com o esperado de um modelo SEM
//     fraude: votos simulados como beta-binomial com a taxa e a sobredispersão de cada zona (Monte Carlo).
// (c) 1º dígito de Benford só como demonstração: o mesmo modelo sem fraude já "reprova" no teste,
//     porque o 1º dígito depende do tamanho das seções (doc 07, D8).
// Valores-p corrigidos por Holm dentro de cada família (UF × candidato).
import {
  aleatorio, carregarSecoes, holm, parametrosBeta, pQuiQuadrado, quiQuadrado, salvar, sobredispersao, sortearBeta, sortearBinomial,
} from './forense-lib.mjs';

const turno = Number(process.argv[2] ?? 2);
const CANDIDATOS = [13, 22];
const REPETICOES = 10;
const rnd = aleatorio(4242);

const secoes = (await carregarSecoes(turno)).filter((s) => s.validos > 0);
const ufs = [...new Set(secoes.map((s) => s.uf))].sort();

const BENFORD1 = Array.from({ length: 9 }, (_, d) => Math.log10(1 + 1 / (d + 1)));
const BENFORD2 = Array.from({ length: 10 }, (_, d) => {
  let p = 0;
  for (let k = 1; k <= 9; k++) p += Math.log10(1 + 1 / (10 * k + d));
  return p;
});
const UNIFORME = new Array(10).fill(0.1);

const ultimo = (x) => (x >= 100 ? x % 10 : -1);
const segundo = (x) => (x >= 10 ? Math.floor(x / 10 ** (String(x).length - 2)) % 10 : -1);
const primeiro = (x) => (x >= 1 ? Number(String(x)[0]) - 1 : -1);

// Taxa e sobredispersão por zona, por candidato (para o modelo sem fraude).
const zonas = new Map();
for (const s of secoes) {
  const k = `${s.uf}/${s.zona}`;
  if (!zonas.has(k)) zonas.set(k, []);
  zonas.get(k).push(s);
}
const parametros = new Map();
for (const [k, g] of zonas) {
  for (const c of CANDIDATOS) parametros.set(`${k}/${c}`, sobredispersao(g.map((s) => ({ x: s[`v${c}`], n: s.validos }))));
}

const contar = () => ({ ultimo: new Array(10).fill(0), segundo: new Array(10).fill(0), primeiro: new Array(9).fill(0) });
const obs = {}, sim = {};
for (const uf of [...ufs, 'BR']) for (const c of CANDIDATOS) { obs[`${uf}/${c}`] = contar(); sim[`${uf}/${c}`] = contar(); }
const somar = (alvo, x) => {
  const u = ultimo(x), d2 = segundo(x), d1 = primeiro(x);
  if (u >= 0) alvo.ultimo[u]++;
  if (d2 >= 0) alvo.segundo[d2]++;
  if (d1 >= 0) alvo.primeiro[d1]++;
};

for (const s of secoes) {
  for (const c of CANDIDATOS) {
    const x = s[`v${c}`];
    somar(obs[`${s.uf}/${c}`], x);
    somar(obs[`BR/${c}`], x);
    const { p, rho } = parametros.get(`${s.uf}/${s.zona}/${c}`);
    const pb = parametrosBeta(Math.min(Math.max(p, 1e-6), 1 - 1e-6), rho);
    for (let r = 0; r < REPETICOES; r++) {
      const pi = pb ? sortearBeta(pb.a, pb.b, rnd) : p;
      const xs = sortearBinomial(s.validos, pi, rnd);
      somar(sim[`${s.uf}/${c}`], xs);
      somar(sim[`BR/${c}`], xs);
    }
  }
}

/** χ² contra o esperado simulado, descontando o ruído da simulação (variância do esperado = E/R). */
function quiSimulado(o, sSim) {
  const n = o.reduce((a, b) => a + b, 0), ns = sSim.reduce((a, b) => a + b, 0);
  const prop = sSim.map((v) => v / ns);
  const r = quiQuadrado(o, prop);
  const fator = 1 + n / ns;
  return { ...r, x2: r.x2 / fator, p: undefined, fator };
}

const familias = { ultimo: [], ultimoModelo: [], segundoBenford: [], segundoModelo: [], primeiroBenfordModelo: [] };
const linhas = [];
for (const uf of [...ufs, 'BR']) {
  for (const c of CANDIDATOS) {
    const o = obs[`${uf}/${c}`], m = sim[`${uf}/${c}`];
    if (o.ultimo.reduce((a, b) => a + b, 0) < 50) continue;
    const ult = quiQuadrado(o.ultimo, UNIFORME);
    const um = quiSimulado(o.ultimo, m.ultimo);
    um.p = pQuiQuadrado(um.x2, 9);
    const sb = quiQuadrado(o.segundo, BENFORD2);
    const sm = quiSimulado(o.segundo, m.segundo);
    sm.p = pQuiQuadrado(sm.x2, 9);
    // 1º dígito do modelo SEM fraude contra Benford: mostra que o teste reprova até dados limpos.
    const pm = quiQuadrado(m.primeiro.map((v) => Math.round(v / REPETICOES)), BENFORD1);
    const po = quiQuadrado(o.primeiro, BENFORD1);
    const l = { uf, candidato: c, ultimo: ult, ultimoModelo: um, segundoBenford: sb, segundoModelo: sm, primeiroObservado: po, primeiroModeloSemFraude: pm,
      ultimoFreq: o.ultimo, ultimoModeloFreq: m.ultimo.map((v) => +(v / REPETICOES).toFixed(1)), segundoFreq: o.segundo, segundoModeloFreq: m.segundo.map((v) => +(v / REPETICOES).toFixed(1)) };
    linhas.push(l);
    if (uf !== 'BR') {
      familias.ultimo.push(l); familias.ultimoModelo.push(l); familias.segundoBenford.push(l); familias.segundoModelo.push(l); familias.primeiroBenfordModelo.push(l);
    }
  }
}
const ajustar = (lista, campo) => holm(lista.map((l) => l[campo].p)).forEach((p, i) => (lista[i][campo].pHolm = p));
ajustar(familias.ultimo, 'ultimo');
ajustar(familias.ultimoModelo, 'ultimoModelo');
ajustar(familias.segundoBenford, 'segundoBenford');
ajustar(familias.segundoModelo, 'segundoModelo');
ajustar(familias.primeiroBenfordModelo, 'primeiroModeloSemFraude');

await salvar(`digitos-${turno}t.json`, { turno, repeticoes: REPETICOES, linhas });

const f = (r) => `χ²=${r.x2.toFixed(1)} p=${r.p < 1e-4 ? r.p.toExponential(1) : r.p.toFixed(4)}${r.pHolm != null ? ` pHolm=${r.pHolm < 1e-4 ? r.pHolm.toExponential(1) : r.pHolm.toFixed(3)}` : ''} MAD=${r.madPp.toFixed(2)}pp n=${r.n}`;
console.log(`Dígitos, ${turno}º turno (${secoes.length} seções)`);
for (const l of linhas) {
  console.log(`${l.uf.padEnd(3)} ${l.candidato}  último×uniforme: ${f(l.ultimo)}   último×modelo: ${f(l.ultimoModelo)}`);
  console.log(`        2º×Benford: ${f(l.segundoBenford)}   2º×modelo: ${f(l.segundoModelo)}`);
  console.log(`        1º observado×Benford: χ²=${l.primeiroObservado.x2.toFixed(0)}   1º modelo SEM fraude×Benford: χ²=${l.primeiroModeloSemFraude.x2.toFixed(0)} p=${l.primeiroModeloSemFraude.p.toExponential(1)}`);
}
const sig = (fam, campo) => fam.filter((l) => l[campo].pHolm < 0.05).map((l) => `${l.uf}/${l.candidato}`);
console.log('\nSignificativos após Holm (α = 0,05):');
console.log('  último dígito × uniforme:', sig(familias.ultimo, 'ultimo'));
console.log('  último dígito × modelo sem fraude:', sig(familias.ultimoModelo, 'ultimoModelo'));
console.log('  2º dígito × Benford:', sig(familias.segundoBenford, 'segundoBenford'));
console.log('  2º dígito × modelo sem fraude:', sig(familias.segundoModelo, 'segundoModelo'));
console.log('  1º dígito do MODELO SEM FRAUDE × Benford:', sig(familias.primeiroBenfordModelo, 'primeiroModeloSemFraude').length, 'de', familias.primeiroBenfordModelo.length);
