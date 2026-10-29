// Teste 2 (H05/A11): rajadas de "O eleitor identificado já votou" sem voto computado entre elas, no país inteiro.
// Lê a saída de biometria-varredura-logs.mjs. Distribuição da maior rajada por seção, cauda, concentração por
// zona e município (Poisson contra a taxa nacional), e como foi habilitado o eleitor seguinte a cada rajada,
// comparado com a distribuição geral de habilitações. Linha de base: o dia do 1º turno no mesmo log.
// Uso: node scripts/auditoria/biometria-rajadas.mjs
// Saída: data/parsed/auditoria/biometria/rajadas-resumo.json
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_SAIDA, caudaPoisson, varredura } from './biometria-comum.mjs';

const FAIXAS = ['0', '1', '2', '3', '4', '5-9', '10-19', '20-49', '50+'];
const faixa = (n) => (n <= 4 ? String(n) : n <= 9 ? '5-9' : n <= 19 ? '10-19' : n <= 49 ? '20-49' : '50+');

const vazio = () => ({
  secoes: 0, votos: 0, jaVotou: 0, jaVotouLogoAposVoto: 0, dist: Object.fromEntries(FAIXAS.map((f) => [f, 0])),
  rajadas: {}, proximoPorFaixa: {}, classes: { biometria: 0, anoNascimento: 0, manualMesario: 0, manualSemMesario: 0, outra: 0 },
  grandes: [], porZona: new Map(), porMunicipio: new Map(), outrasRecusasEmRajada5: 0, eventosEmRajada5: 0, tituloEmRajada5: 0,
});
const dias = { d2: vazio(), d1: vazio() };
const ambos = { secoes: 0, grande2t: 0, grande1t: 0, grandeNosDois: 0 };

for await (const s of varredura()) {
  for (const d of ['d2', 'd1']) {
    const x = s[d];
    if (!x || x.mesmaSecao === false) continue; // log do dia de outra seção (urna trocada entre turnos)
    const a = dias[d];
    a.secoes++; a.votos += x.votos; a.jaVotou += x.jaVotou; a.jaVotouLogoAposVoto += x.jaVotouLogoAposVoto;
    a.dist[faixa(x.maiorRajada)]++;
    for (const [f, n] of Object.entries(x.rajadas)) a.rajadas[f] = (a.rajadas[f] ?? 0) + n;
    for (const [f, prox] of Object.entries(x.proximoPorFaixa)) {
      const alvo = (a.proximoPorFaixa[f] ??= {});
      for (const [c, n] of Object.entries(prox)) alvo[c] = (alvo[c] ?? 0) + n;
    }
    for (const [c, n] of Object.entries(x.classes)) a.classes[c] += n;
    const kz = `${s.uf}/${s.municipio}/${s.zona}`;
    const km = `${s.uf}/${s.municipio}`;
    const z = a.porZona.get(kz) ?? { secoes: 0, comRajada5: 0, comRajada10: 0 };
    const m = a.porMunicipio.get(km) ?? { secoes: 0, comRajada5: 0, comRajada10: 0 };
    z.secoes++; m.secoes++;
    if (x.maiorRajada >= 5) { z.comRajada5++; m.comRajada5++; }
    if (x.maiorRajada >= 10) { z.comRajada10++; m.comRajada10++; }
    a.porZona.set(kz, z); a.porMunicipio.set(km, m);
    for (const g of x.rajadasGrandes) { a.outrasRecusasEmRajada5 += g.outrasRecusas; a.eventosEmRajada5 += g.n; a.tituloEmRajada5 += g.titulo; }
    if (x.maiorRajada >= 10) {
      a.grandes.push({ secao: `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`, modelo: s.modelo, votos: x.votos, jaVotou: x.jaVotou, maiorRajada: x.maiorRajada, rajadas5: x.rajadasGrandes.length, detalhe: x.maiorRajadaDetalhe, classes: x.classes });
    }
  }
  if (s.d1 && s.d2 && s.d1.mesmaSecao !== false) {
    ambos.secoes++;
    const g2 = s.d2.maiorRajada >= 5;
    const g1 = s.d1.maiorRajada >= 5;
    if (g2) ambos.grande2t++;
    if (g1) ambos.grande1t++;
    if (g1 && g2) ambos.grandeNosDois++;
  }
}

function concentracao(mapa, total, campo) {
  const taxa = [...mapa.values()].reduce((n, z) => n + z[campo], 0) / total;
  return [...mapa].filter(([, z]) => z[campo] >= 2)
    .map(([k, z]) => ({ k, secoes: z.secoes, observadas: z[campo], esperadas: +(z.secoes * taxa).toFixed(2), p: caudaPoisson(z[campo], z.secoes * taxa) }))
    .sort((a, b) => a.p - b.p).slice(0, 25)
    .map((x) => ({ ...x, p: +x.p.toPrecision(2) }));
}

const saida = {};
for (const [d, a] of Object.entries(dias)) {
  const totalClasses = Object.values(a.classes).reduce((x, y) => x + y, 0);
  const pct = (o) => { const t = Object.values(o).reduce((x, y) => x + y, 0); return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, `${v} (${(100 * v / t).toFixed(1)}%)`])); };
  saida[d] = {
    dia: d === 'd2' ? '25/10/2026' : '04/10/2026 (mesmo log do 2º turno)',
    secoes: a.secoes, votos: a.votos, jaVotou: a.jaVotou, jaVotouAte60sDepoisDeUmVoto: a.jaVotouLogoAposVoto,
    distribuicaoMaiorRajadaPorSecao: a.dist,
    rajadasPorTamanho: a.rajadas,
    eleitorSeguintePorTamanhoDaRajada: Object.fromEntries(Object.entries(a.proximoPorFaixa).map(([f, o]) => [f, pct(o)])),
    habilitacaoDeTodosOsVotos: pct(a.classes),
    rajadas5Mais: { eventos: a.eventosEmRajada5, porTitulo: a.tituloEmRajada5, outrasRecusasDentro: a.outrasRecusasEmRajada5 },
    zonasMaisConcentradas_rajada5: concentracao(a.porZona, a.secoes, 'comRajada5'),
    municipiosMaisConcentrados_rajada5: concentracao(a.porMunicipio, a.secoes, 'comRajada5'),
    secoesComRajada10Mais: a.grandes.sort((x, y) => y.maiorRajada - x.maiorRajada),
    totalClasses,
  };
}
saida.mesmaSecaoNosDoisDias = { ...ambos, nota: 'seções com log dos dois dias; rajada = 5 ou mais' };
await writeFile(path.join(DIR_SAIDA, 'rajadas-resumo.json'), `${JSON.stringify(saida, null, 1)}\n`);
for (const d of ['d2', 'd1']) {
  const x = saida[d];
  console.log(`${x.dia}: ${x.secoes} seções, ${x.jaVotou} "já votou" (${x.jaVotouAte60sDepoisDeUmVoto} até 60 s depois de um voto)`);
  console.log(' maior rajada por seção:', JSON.stringify(x.distribuicaoMaiorRajadaPorSecao));
  console.log(' eleitor seguinte:', JSON.stringify(x.eleitorSeguintePorTamanhoDaRajada));
  console.log(' todos os votos:', JSON.stringify(x.habilitacaoDeTodosOsVotos));
  console.log(' rajadas ≥5:', JSON.stringify(x.rajadas5Mais), '| seções com rajada ≥10:', x.secoesComRajada10Mais.length);
  console.log(' top:', x.secoesComRajada10Mais.slice(0, 12).map((g) => `${g.secao} ${g.maiorRajada}`).join(' · '));
  console.log(' zonas:', x.zonasMaisConcentradas_rajada5.slice(0, 6).map((z) => `${z.k} ${z.observadas}/${z.secoes} (esp ${z.esperadas}, p ${z.p})`).join(' · '));
}
console.log(JSON.stringify(saida.mesmaSecaoNosDoisDias));
