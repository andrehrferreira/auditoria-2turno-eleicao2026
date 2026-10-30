// Parecer cético 34 (H26), passo 4: teste de horário dentro da zona.
//  (a) refaz a inclinação do autor: virada além do esperado da seção (p.p.) sobre Δ parcela de votos desde 15h / 17h
//      (2º − 1º turno), centradas na zona, peso = nominais do 2º turno, erro-padrão agrupado por zona;
//  (b) separa Δ em parcela do 1º turno e do 2º turno (regressão com as duas);
//  (c) acrescenta controles: tamanho (aptos), Δcomparecimento, parcela do 13 e abstenção no 1º turno;
//  (d) metade/metade: Δparcela tardia medida só no 1º turno contra a virada (regressão à média);
//  (e) poder: votos para o 13 inseridos depois das 15h/17h do 2º turno em 1% das seções; a partir de quantos votos por
//      seção a inclinação fica positiva e significativa;
//  (f) seções com voto depois das 17h no 2º turno: desvio da virada contra a própria zona.
//  (g) picos por zona (hora de Brasília com mais votos), 1º × 2º turno.
// Entradas: 34-h26-secoes.csv e 34-h26-horas-zona.csv. Uso: node --max-old-space-size=8192 scripts/auditoria/cetico-34-h26-horario.mjs
// Saída: data/parsed/auditoria/cetico-revisor/34-h26-horario.json
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { SAIDA, lerSecoes, normais, coeficientes, dot, cholesky, pp, r } from './cetico-34-h26-lib.mjs';

const S = await lerSecoes();
const C = coeficientes(normais(S));
const out = {};
const L = [];
for (const s of S) {
  if (s.ht1 == null || s.ht2 == null || !(s.ht1 > 0) || !(s.ht2 > 0) || s.nom2 <= 0 || s.c1 <= 0 || s.c2 <= 0) continue;
  const { b13, b22 } = C.get(s.uf);
  const rl = (s.v13_2 - dot(s.x, b13)) - (s.v22_2 - dot(s.x, b22));
  L.push({ s, g: `${s.uf}|${s.zona}`, w: s.nom2, rl, y: pp(rl, s.nom2),
    l15_1: pp(s.h15_1, s.ht1), l15_2: pp(s.h15_2, s.ht2), l17_1: pp(s.h17_1, s.ht1), l17_2: pp(s.h17_2, s.ht2),
    loga: Math.log(s.a2), dcomp: pp(s.c2, s.a2) - pp(s.c1, s.a1), p13: pp(s.v13_1, s.c1), abst: pp(s.a1 - s.c1, s.a1) });
}
out.secoes = L.length;

/** MQ ponderado com efeito fixo de zona (centrando na zona) e EP agrupado por zona. */
function mqZona(lista, xs, yf = (l) => l.y) {
  const G = new Map();
  for (const l of lista) (G.get(l.g) ?? G.set(l.g, []).get(l.g)).push(l);
  const k = xs.length;
  const A = Array.from({ length: k }, () => new Float64Array(k)), c = new Float64Array(k);
  const grupos = [];
  for (const g of G.values()) {
    if (g.length < 3) continue;
    const W = g.reduce((a, l) => a + l.w, 0);
    const mx = xs.map((f) => g.reduce((a, l) => a + l.w * f(l), 0) / W), my = g.reduce((a, l) => a + l.w * yf(l), 0) / W;
    const pts = g.map((l) => ({ w: l.w, x: xs.map((f, j) => f(l) - mx[j]), y: yf(l) - my }));
    for (const p of pts) for (let i = 0; i < k; i++) { c[i] += p.w * p.x[i] * p.y; for (let j = 0; j < k; j++) A[i][j] += p.w * p.x[i] * p.x[j]; }
    grupos.push(pts);
  }
  const b = cholesky(A, c);
  // sanduíche agrupado
  const Ainv = A.map((_, i) => cholesky(A, Float64Array.from({ length: k }, (_, j) => (i === j ? 1 : 0))));
  const M = Array.from({ length: k }, () => new Float64Array(k));
  for (const pts of grupos) {
    const u = new Float64Array(k);
    for (const p of pts) { const e = p.y - dot(p.x, b); for (let i = 0; i < k; i++) u[i] += p.w * p.x[i] * e; }
    for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) M[i][j] += u[i] * u[j];
  }
  const Gn = grupos.length;
  const V = Array.from({ length: k }, (_, i) => Float64Array.from({ length: k }, (_, j) => {
    let s = 0; for (let a = 0; a < k; a++) for (let d = 0; d < k; d++) s += Ainv[a][i] * M[a][d] * Ainv[d][j]; return s * Gn / (Gn - 1);
  }));
  return Array.from(b, (v, i) => ({ b: r(v, 4), ep: r(Math.sqrt(V[i][i]), 4), z: r(v / Math.sqrt(V[i][i]), 2) }));
}
const nomes = (arr, res) => Object.fromEntries(arr.map((n, i) => [n, res[i]]));
out.a_autor = {
  desde15: mqZona(L, [(l) => l.l15_2 - l.l15_1])[0],
  desde17: mqZona(L, [(l) => l.l17_2 - l.l17_1])[0],
};
out.b_separado = {
  desde15: nomes(['parcela2', 'parcela1'], mqZona(L, [(l) => l.l15_2, (l) => l.l15_1])),
  desde17: nomes(['parcela2', 'parcela1'], mqZona(L, [(l) => l.l17_2, (l) => l.l17_1])),
};
const CTRL = [(l) => l.loga, (l) => l.dcomp, (l) => l.p13, (l) => l.abst];
out.c_comControles = {
  desde15: nomes(['delta', 'logAptos', 'dComparecimento', 'parcela13_1t', 'abstencao_1t'], mqZona(L, [(l) => l.l15_2 - l.l15_1, ...CTRL])),
  desde17: nomes(['delta', 'logAptos', 'dComparecimento', 'parcela13_1t', 'abstencao_1t'], mqZona(L, [(l) => l.l17_2 - l.l17_1, ...CTRL])),
  separado15: nomes(['parcela2', 'parcela1', 'logAptos', 'dComparecimento', 'parcela13_1t', 'abstencao_1t'], mqZona(L, [(l) => l.l15_2, (l) => l.l15_1, ...CTRL])),
  separado17: nomes(['parcela2', 'parcela1', 'logAptos', 'dComparecimento', 'parcela13_1t', 'abstencao_1t'], mqZona(L, [(l) => l.l17_2, (l) => l.l17_1, ...CTRL])),
};
// por região: a associação com o voto tardio do 2º turno está em todo lugar ou concentrada?
{
  const REGIAO = { N: 'ac am ap pa ro rr to', NE: 'al ba ce ma pb pe pi rn se', CO: 'df go ms mt', SE: 'es mg rj sp', S: 'pr rs sc' };
  out.c_porRegiao = {};
  for (const [g, ufs] of Object.entries(REGIAO)) {
    const sub = L.filter((l) => ufs.split(' ').includes(l.s.uf));
    out.c_porRegiao[g] = { secoes: sub.length, com17h2t: sub.filter((l) => l.s.h17_2 > 0).length,
      separado17: nomes(['parcela2', 'parcela1', 'logAptos', 'dComparecimento', 'parcela13_1t', 'abstencao_1t'], mqZona(sub, [(l) => l.l17_2, (l) => l.l17_1, ...CTRL])).parcela2,
      separado15: nomes(['parcela2', 'parcela1', 'logAptos', 'dComparecimento', 'parcela13_1t', 'abstencao_1t'], mqZona(sub, [(l) => l.l15_2, (l) => l.l15_1, ...CTRL])).parcela2 };
  }
  // tamanho do efeito em votos: Σ coef × parcela2 tardia × nominais (17h), comparado com os votos depois das 17h
  const b17 = out.c_comControles.separado17.parcela2.b;
  out.c_efeitoEmVotos17 = { margemAssociada: Math.round(L.reduce((a, l) => a + b17 * l.l17_2 / 100 * l.s.nom2, 0)), votosDepoisDas17_2t: L.reduce((a, l) => a + l.s.h17_2, 0) };
}
// média e dispersão das variáveis
const med = (f) => L.reduce((a, l) => a + l.w * f(l), 0) / L.reduce((a, l) => a + l.w, 0);
out.medias = { l15_1: r(med((l) => l.l15_1)), l15_2: r(med((l) => l.l15_2)), l17_1: r(med((l) => l.l17_1)), l17_2: r(med((l) => l.l17_2), 3) };
out.secoesCom17h2t = L.filter((l) => l.s.h17_2 > 0).length;

// (e) poder: inserir k votos do 13 nas horas tardias do 2º turno em 1% das seções (sorteio fixo); sem refazer o esperado
// (com 1% espalhado pelo país a absorção pelo MQ é desprezível: cada UF recebe ~1% de seções com x típico).
let semente = 34;
const rnd = () => { semente = (semente * 1103515245 + 12345) % 2147483648; return semente / 2147483648; };
const alvo = new Set(L.filter(() => rnd() < 0.01));
out.e_poder = { secoesAlvo: alvo.size, porHora: {} };
for (const h0 of [15, 17]) {
  const linhas = [];
  for (const k of [1, 2, 3, 5, 10, 20]) {
    const sim = L.map((l) => {
      if (!alvo.has(l)) return l;
      const ht2 = l.s.ht2 + k, hl = (h0 === 15 ? l.s.h15_2 : l.s.h17_2) + k;
      return { ...l, w: l.w + k, y: pp(l.rl + k, l.s.nom2 + k), [`l${h0}_2`]: pp(hl, ht2) };
    });
    const res = mqZona(sim, [(l) => l[`l${h0}_2`] - l[`l${h0}_1`]])[0];
    linhas.push({ votosPorSecao: k, ...res });
  }
  out.e_poder.porHora[h0] = linhas;
}
// teste direto mais forte: dentro da zona, virada da seção sobre a parcela do 2º turno depois das 17h, controlando o 1º turno
// (já em b_separado/c). Aqui: seções com algum voto depois das 17h no 2º turno contra as demais da zona.
{
  const ind = (l) => (l.s.h17_2 > 0 ? 1 : 0);
  out.f_secoesCom17h = { secoes: L.filter((l) => ind(l)).length, desvio: mqZona(L, [ind])[0],
    comControles: nomes(['indicador', 'parcela17_1', 'logAptos', 'dComparecimento'], mqZona(L, [ind, (l) => l.l17_1, (l) => l.loga, (l) => l.dcomp])) };
}
// (g) picos
{
  const txt = await readFile(path.join(SAIDA, '34-h26-horas-zona.csv'), 'utf8');
  const [, ...ls] = txt.trim().split('\n');
  const p1 = {}, p2 = {};
  const tot1 = new Array(24).fill(0), tot2 = new Array(24).fill(0);
  for (const l of ls) {
    const [, , a, b] = l.split(';');
    const h1 = a.split(',').map(Number), h2 = b.split(',').map(Number);
    const pk = (h) => h.indexOf(Math.max(...h));
    p1[pk(h1)] = (p1[pk(h1)] ?? 0) + 1; p2[pk(h2)] = (p2[pk(h2)] ?? 0) + 1;
    for (let h = 0; h < 24; h++) { tot1[h] += h1[h]; tot2[h] += h2[h]; }
  }
  const T1 = tot1.reduce((a, b) => a + b, 0), T2 = tot2.reduce((a, b) => a + b, 0);
  out.g_picos = { zonas: ls.length, pico1: p1, pico2: p2,
    parcelaPorHora: Object.fromEntries([...Array(24).keys()].filter((h) => tot1[h] || tot2[h]).map((h) => [h, [r(pp(tot1[h], T1)), r(pp(tot2[h], T2), 3)]])),
    votosDesde17: [tot1.slice(17).reduce((a, b) => a + b, 0), tot2.slice(17).reduce((a, b) => a + b, 0)] };
}
await writeFile(path.join(SAIDA, '34-h26-horario.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 0));
