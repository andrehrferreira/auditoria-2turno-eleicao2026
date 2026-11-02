// H26, fechamento, parte (b), análise descritiva acrescentada depois de ver o resultado (desvio do plano, declarado em
// docs/analysis/cientista-politico/06-h26-resultado-final.md): de onde vem a uniformidade da virada bruta de 2026 (B7)?
//   Virada bruta da zona = virada esperada (o que o 1º turno da própria zona prevê) + virada além do esperado.
//   Para cada ano do nível A: dispersão robusta (1,4826 × MAD) de cada parte, correlação entre as partes, e a parte
//   esperada separada nos preditores (finalistas, eliminados, brancos+nulos, abstenção), orientada a quem cresceu.
//   Também: a dispersão entre as zonas da parte dos eliminados no 1º turno e da variação de comparecimento.
// Só leitura. Uso: node --max-old-space-size=8192 scripts/auditoria/politico-h26-b-uniformidade.mjs
// Saída: data/parsed/auditoria/cientista-politico/h26-b-uniformidade.json
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pearson } from './forense-lib.mjs';
import { SAIDA, ANOS, GRUPOS_PEQUENOS, r2, r4, pp, nivelA, prepararMotor, amostraReal, estatisticas, medianaMad } from './politico-h26-lib.mjs';

const R = { geradoEm: new Date().toISOString(), anos: {} };
const mad = (v) => medianaMad(v.filter(Number.isFinite)).mad;
for (const ano of [2018, 2022, 2026]) {
  const cfg = ANOS[ano];
  const dados = await nivelA(ano);
  const out = [];
  for (const u of dados.unidades) {
    const nom1 = Object.values(u.v1).reduce((a, b) => a + b, 0), nom2 = Object.values(u.v2).reduce((a, b) => a + b, 0);
    if (!(nom1 > 0) || !(nom2 > 0)) continue;
    const demais = Object.entries(u.v1).filter(([nr]) => !cfg.preditores.includes(nr)).reduce((a, [, q]) => a + q, 0);
    const [a1, c1, , , br1, nu1] = u.d1, [a2, c2] = u.d2;
    out.push({ uf: u.uf, zona: u.zona, mun: u.mun, X: [...cfg.preditores.map((nr) => u.v1[nr] ?? 0), demais, br1 + nu1, a1 - c1],
      y13: u.v2['13'] ?? 0, yR: u.v2[cfg.rival] ?? 0, ajusta: true, nom1, a13_1: u.v1['13'] ?? 0, aR_1: u.v1[cfg.rival] ?? 0, a1, c1, a2, c2 });
  }
  const k = cfg.preditores.length + 3;
  const motor = prepararMotor(out, { grupo: (uf) => GRUPOS_PEQUENOS[ano][uf] ?? uf, k });
  const sinal = cfg.ganhou === '13' ? 1 : -1;
  const det = estatisticas(motor, amostraReal(motor), { sinal, iSelf13: cfg.preditores.indexOf('13'), iSelfR: cfg.preditores.indexOf(cfg.rival), detalhar: true });
  // contribuição de cada bloco de preditores para a margem esperada do 2º turno, menos a margem do 1º turno
  const iF = [cfg.preditores.indexOf('13'), cfg.preditores.indexOf(cfg.rival)];
  const iE = cfg.preditores.map((_, i) => i).filter((i) => !iF.includes(i)).concat([cfg.preditores.length]);
  const iBN = cfg.preditores.length + 1, iAb = cfg.preditores.length + 2;
  const linhas = det.itens.map((it) => {
    const z = it.zona, g = det.grupos.get(z.grupo);
    const parte = (idx) => idx.reduce((a, i) => a + z.sX[i] * (g.b13[i] - g.bR[i]), 0);
    const m1 = pp(z.a13_1 - z.aR_1, z.nom1);
    return { virada: sinal * it.virada, alem: sinal * it.alem, esperada: sinal * (it.virada - it.alem),
      finalistas: sinal * (pp(parte(iF), z.nom2) - m1), eliminados: sinal * pp(parte(iE), z.nom2), brancosNulos: sinal * pp(parte([iBN]), z.nom2), abstencao: sinal * pp(parte([iAb]), z.nom2),
      parteEliminados1t: pp(z.nom1 - z.a13_1 - z.aR_1, z.nom1), dComp: it.dComp };
  });
  const col = (c) => linhas.map((l) => l[c]);
  // peso cruzado: voto de quem perdeu no 1º turno sobre o voto de quem cresceu no 2º (a marca de uma troca proporcional),
  // e o inverso; média dos grupos ponderada pelos votos do 1º turno de quem cede o voto
  const iG = sinal > 0 ? iF[0] : iF[1], iP = sinal > 0 ? iF[1] : iF[0];
  let sc = 0, wc = 0, si = 0, wi = 0;
  const porGrupo = {};
  for (const [nome, g] of det.grupos) {
    if (!g.b13) continue;
    const bG = sinal > 0 ? g.b13 : g.bR, bP = sinal > 0 ? g.bR : g.b13, vP = sinal > 0 ? g.vR : g.v13, vG = sinal > 0 ? g.v13 : g.vR;
    sc += bG[iP] * vP; wc += vP; si += bP[iG] * vG; wi += vG;
    porGrupo[nome] = { perdeuParaCresceu: r4(bG[iP]), cresceuParaPerdeu: r4(bP[iG]) };
  }
  const vals = Object.values(porGrupo).map((x) => x.perdeuParaCresceu);
  R.anos[ano] = {
    zonas: linhas.length, viradaNacional: r2(sinal * det.viradaNac),
    dispersao: Object.fromEntries(['virada', 'esperada', 'alem', 'finalistas', 'eliminados', 'brancosNulos', 'abstencao', 'parteEliminados1t', 'dComp'].map((c) => [c, r4(mad(col(c)))])),
    mediana: Object.fromEntries(['virada', 'esperada', 'alem', 'finalistas', 'eliminados', 'brancosNulos', 'abstencao', 'parteEliminados1t', 'dComp'].map((c) => [c, r4(medianaMad(col(c).filter(Number.isFinite)).mediana)])),
    correlacaoEsperadaAlem: r4(pearson(col('esperada'), col('alem'))),
    zonasComEsperadaPositiva: r2((100 * linhas.filter((l) => l.esperada > 0).length) / linhas.length),
    zonasComViradaPositiva: r2((100 * linhas.filter((l) => l.virada > 0).length) / linhas.length),
    cvEsperada: r4(mad(col('esperada')) / Math.abs(det.viradaNac)),
    pesoCruzado: { perdeuParaCresceuMedia: r4(sc / wc), cresceuParaPerdeuMedia: r4(si / wi), perdeuParaCresceuMin: r4(Math.min(...vals)), perdeuParaCresceuMax: r4(Math.max(...vals)),
      gruposAcimaDe0_05: Object.entries(porGrupo).filter(([, x]) => x.perdeuParaCresceu > 0.05).map(([g]) => g), porGrupo },
  };
  console.error(ano, JSON.stringify(R.anos[ano]));
}
await writeFile(path.join(SAIDA, 'h26-b-uniformidade.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
