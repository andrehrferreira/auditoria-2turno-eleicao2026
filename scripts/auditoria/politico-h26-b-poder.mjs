// H26, fechamento, parte (b), poder (docs/analysis/cientista-politico/06-h26-plano-final.md, seção 4.4).
//   Insere votos simulados no 2026 do nível A, refaz as 12 estatísticas e a triagem por zona, e procura (bissecção no
//   total inserido) o menor total que acende: alguma estatística passa a "fora do padrão" na direção de sinal a favor do 13
//   (sem ter esse sinal no dado real), ou a triagem do nível A passa a ter mais zonas do 13 no corte que no dado real.
//   O intervalo de 2026 com inserção é o do dado real deslocado (mesmas distâncias até o ponto), porque refazer 5.000
//   reamostragens a cada passo é inviável; os intervalos de 2018 e 2022 vêm de h26-b-historico.json.
//   Formas: F1 proporcional ao 13 do 1º turno (todas as UFs); F2 o mesmo só no Nordeste e só no Sudeste; F3 mesmo número
//   de votos por seção; F4 só nas 27 capitais, proporcional aos nominais; F5 troca do 22 para o 13 proporcional ao 22;
//   F6 p.p. iguais em 10% das zonas sorteadas (200 sorteios por passo; acende se ≥ 80% dos sorteios acendem).
// Só leitura. Uso: node --max-old-space-size=8192 scripts/auditoria/politico-h26-b-poder.mjs
// Saída: data/parsed/auditoria/cientista-politico/h26-b-poder.json
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { aleatorio } from './forense-lib.mjs';
import { SAIDA, ANOS, GRUPOS_PEQUENOS, FAMILIA, DIRECAO, REGIAO, log, nivelA, prepararMotor, amostraReal, estatisticas } from './politico-h26-lib.mjs';

const H = JSON.parse(readFileSync(path.join(SAIDA, 'h26-b-historico.json'), 'utf8'));
const MARGEM = 64256232 - 59826041, TROCA = Math.ceil(MARGEM / 2);
const cfg = ANOS[2026];
const dados = await nivelA(2026);
const CAPITAIS = { ac: 'RIO BRANCO', al: 'MACEIÓ', am: 'MANAUS', ap: 'MACAPÁ', ba: 'SALVADOR', ce: 'FORTALEZA', df: 'BRASÍLIA', es: 'VITÓRIA', go: 'GOIÂNIA',
  ma: 'SÃO LUÍS', mg: 'BELO HORIZONTE', ms: 'CAMPO GRANDE', mt: 'CUIABÁ', pa: 'BELÉM', pb: 'JOÃO PESSOA', pe: 'RECIFE', pi: 'TERESINA', pr: 'CURITIBA',
  rj: 'RIO DE JANEIRO', rn: 'NATAL', ro: 'PORTO VELHO', rr: 'BOA VISTA', rs: 'PORTO ALEGRE', sc: 'FLORIANÓPOLIS', se: 'ARACAJU', sp: 'SÃO PAULO', to: 'PALMAS' };
const base = [];
for (const u of dados.unidades) {
  const nom1 = Object.values(u.v1).reduce((a, b) => a + b, 0), nom2 = Object.values(u.v2).reduce((a, b) => a + b, 0);
  if (!(nom1 > 0) || !(nom2 > 0)) continue;
  const demais = Object.entries(u.v1).filter(([nr]) => !cfg.preditores.includes(nr)).reduce((a, [, q]) => a + q, 0);
  const [a1, c1, , , br1, nu1] = u.d1, [a2, c2] = u.d2;
  base.push({ uf: u.uf, zona: u.zona, mun: u.mun, capital: CAPITAIS[u.uf] === u.nome, secoes: u.secoes,
    X: [...cfg.preditores.map((nr) => u.v1[nr] ?? 0), demais, br1 + nu1, a1 - c1], y13: u.v2['13'] ?? 0, yR: u.v2['22'] ?? 0, ajusta: true,
    nom1, a13_1: u.v1['13'] ?? 0, aR_1: u.v1['22'] ?? 0, a1, c1, a2, c2 });
}
const capitaisAchadas = new Set(base.filter((u) => u.capital).map((u) => u.uf));
const opcoes = { sinal: 1, iSelf13: 0, iSelfR: 1 };
const grupo = (uf) => GRUPOS_PEQUENOS[2026][uf] ?? uf;
const stats = (unid) => { const m = prepararMotor(unid, { grupo, k: 8 }); return estatisticas(m, amostraReal(m), opcoes); };
const real = stats(base);
const toca = (a, b) => a[0] <= b[1] && b[0] <= a[1];
const NOSSO_LADO = FAMILIA.filter((f) => !['B2p', 'B3p', 'B4p'].includes(f));
function acesas(e) {
  const out = [];
  for (const f of NOSSO_LADO) {
    const I = H.nivelA[2026].intervalo[f], p0 = real[f];
    const J = [e[f] - (p0 - I[0]), e[f] + (I[1] - p0)];
    const h18 = H.nivelA[2018].intervalo[f], h22 = H.nivelA[2022].intervalo[f];
    if (toca(J, h18) || toca(J, h22)) continue;
    const acima = J[0] > Math.max(h18[1], h22[1]), abaixo = J[1] < Math.min(h18[0], h22[0]);
    if ((DIRECAO[f] > 0 && acima) || (DIRECAO[f] < 0 && abaixo)) out.push(f);
  }
  return out;
}
const jaAcesas = new Set(acesas(real));
const acende = (e) => acesas(e).some((f) => !jaAcesas.has(f)) || e.B3g > real.B3g;

function inserir(pesoUnidade, total, troca = false) {
  const w = base.map(pesoUnidade), W = w.reduce((a, b) => a + b, 0);
  if (!(W > 0)) return base;
  return base.map((u, i) => {
    const v = (total * w[i]) / W;
    return troca ? { ...u, y13: u.y13 + v, yR: u.yR - v } : { ...u, y13: u.y13 + v, c2: u.c2 + v };
  });
}
function menorTotal(testa, max = 2e7) {
  let lo = 0, hi = max;
  if (!testa(hi)) return null;
  for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; if (testa(m)) hi = m; else lo = m; }
  return Math.round(hi);
}
const R = { geradoEm: new Date().toISOString(), margem: MARGEM, trocaQueMudaOVencedor: TROCA, capitaisAchadas: capitaisAchadas.size,
  real: Object.fromEntries(FAMILIA.map((f) => [f, real[f]])), jaForaNoDadoReal: [...jaAcesas], formas: {} };
const formas = {
  F1: (T) => inserir((u) => u.a13_1, T),
  F2_NE: (T) => inserir((u) => (REGIAO[u.uf] === 'NE' ? u.a13_1 : 0), T),
  F2_SE: (T) => inserir((u) => (REGIAO[u.uf] === 'SE' ? u.a13_1 : 0), T),
  F3: (T) => inserir((u) => u.secoes, T),
  F4: (T) => inserir((u) => (u.capital ? u.y13 + u.yR : 0), T),
  F5: (T) => inserir((u) => u.yR, T, true),
};
for (const [nome, f] of Object.entries(formas)) {
  const T = menorTotal((t) => acende(stats(f(t))), nome === 'F5' ? 1.5e7 : 2e7);
  const e = T ? stats(f(T)) : null;
  R.formas[nome] = { menorTotalVisto: T, quemAcende: e ? [...acesas(e).filter((x) => !jaAcesas.has(x)), ...(e.B3g > real.B3g ? ['triagem B3g'] : [])] : [],
    limiteQueMudaOVencedor: nome === 'F5' ? TROCA : MARGEM, vistoAntesDeMudarOVencedor: T !== null && T <= (nome === 'F5' ? TROCA : MARGEM) };
  log(`${nome}: ${JSON.stringify(R.formas[nome])}`);
}
// Fora do plano (descritivo, declarado como desvio): a troca F5 do tamanho que muda o vencedor baixa o peso próprio do 22
// (B4p). A família só conta B4p "maior"; aqui se mostra onde B4p ficaria contra os intervalos de 2018 e 2022.
{
  const e = stats(formas.F5(TROCA));
  R.F5NoTamanhoQueMudaOVencedor = { B4p: e.B4p, B4pReal: real.B4p, intervalo2026Deslocado: [e.B4p - (real.B4p - H.nivelA[2026].intervalo.B4p[0]), e.B4p + (H.nivelA[2026].intervalo.B4p[1] - real.B4p)],
    intervalo2018: H.nivelA[2018].intervalo.B4p, intervalo2022: H.nivelA[2022].intervalo.B4p, B4g: e.B4g, B7a: e.B7a, B7b: e.B7b, B3g: e.B3g };
  log(`F5 no tamanho que muda o vencedor: ${JSON.stringify(R.F5NoTamanhoQueMudaOVencedor)}`);
}
// F6: 10% das zonas sorteadas, p.p. iguais em cada uma (proporcional aos nominais das unidades da zona)
{
  const zonas = [...new Set(base.filter((u) => u.uf !== 'zz').map((u) => `${u.uf}|${u.zona}`))];
  const sorteios = Array.from({ length: 200 }, (_, i) => { const rnd = aleatorio(2606 + i); const s = new Set(); while (s.size < Math.round(zonas.length / 10)) s.add(zonas[Math.floor(rnd() * zonas.length)]); return s; });
  const taxa = (ppz) => {
    let n = 0, tot = 0;
    for (const s of sorteios) {
      const unid = base.map((u) => (s.has(`${u.uf}|${u.zona}`) ? { ...u, y13: u.y13 + (ppz / 100) * (u.y13 + u.yR), c2: u.c2 + (ppz / 100) * (u.y13 + u.yR) } : u));
      tot += base.reduce((a, u) => a + (s.has(`${u.uf}|${u.zona}`) ? (ppz / 100) * (u.y13 + u.yR) : 0), 0);
      if (acende(stats(unid))) n++;
    }
    return { taxa: n / sorteios.length, totalMedio: tot / sorteios.length };
  };
  let lo = 0, hi = 20;
  if (taxa(hi).taxa >= 0.8) { for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (taxa(m).taxa >= 0.8) hi = m; else lo = m; } }
  const t = taxa(hi);
  R.formas.F6 = { ppPorZona: Math.round(hi * 100) / 100, taxa: t.taxa, menorTotalVisto: Math.round(t.totalMedio), limiteQueMudaOVencedor: MARGEM, vistoAntesDeMudarOVencedor: t.totalMedio <= MARGEM };
  log(`F6: ${JSON.stringify(R.formas.F6)}`);
}
R.todasVistasAntesDeMudarOVencedor = Object.values(R.formas).every((f) => f.vistoAntesDeMudarOVencedor);
await writeFile(path.join(SAIDA, 'h26-b-poder.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
