// Teste 3 (B1b/A13/B1): liberações manuais por mesário, mesário registrado em mais de uma seção no mesmo dia e
// rajadas de liberação manual perto do encerramento. Lê a saída de biometria-varredura-logs.mjs, em que o título
// do mesário já é pseudônimo (HMAC). Linha de base: o dia do 1º turno no mesmo log.
// Uso: node scripts/auditoria/biometria-mesarios.mjs
// Saída: data/parsed/auditoria/biometria/mesarios-resumo.json
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura, DIR_SAIDA, caudaPoisson, resumoDist, varredura } from './biometria-comum.mjs';

const novo = () => ({
  secoes: 0, votos: 0, manualMesario: 0, manualSemMesario: 0, anoNascimento: 0,
  maiorPorMesario: [], maior10minPorMesario: [], parcelaDoPrincipal: [], porNaoRegistrado: 0, secoesComNaoRegistrado: 0,
  registros: new Map(), liberouEm: new Map(), ultimaHora: [], extremosMesario: [], extremos10min: [],
  manualUltimaHora: 0, votosUltimaHora: 0, mesariosLiberando: 0,
});
const dias = { d2: novo(), d1: novo() };
// Local de votação de cada seção (2º turno, do banco), para saber se o mesário repetido ficou no mesmo prédio
const { db } = await abrirLeitura();
const local = new Map(db.prepare('SELECT uf, municipio, zona, secao, local FROM secao WHERE turno = 2').all().map((r) => [`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, r.local]));
db.close();

for await (const s of varredura()) {
  for (const d of ['d2', 'd1']) {
    const x = s[d];
    if (!x || x.mesmaSecao === false) continue; // log do dia de outra seção (urna trocada entre turnos)
    const a = dias[d];
    const id = `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`;
    a.secoes++; a.votos += x.votos;
    a.manualMesario += x.classes.manualMesario; a.manualSemMesario += x.classes.manualSemMesario; a.anoNascimento += x.classes.anoNascimento;
    a.manualUltimaHora += x.manualUltimaHora; a.votosUltimaHora += x.votosUltimaHora;
    const lib = Object.entries(x.mesarios.liberacoes);
    a.mesariosLiberando += lib.length;
    const maior = lib.reduce((m, [, v]) => Math.max(m, v.total), 0);
    const maior10 = lib.reduce((m, [, v]) => Math.max(m, v.maior10min), 0);
    a.maiorPorMesario.push(maior);
    a.maior10minPorMesario.push(maior10);
    const manuais = x.classes.manualMesario + x.classes.manualSemMesario;
    if (x.classes.manualMesario >= 10) a.parcelaDoPrincipal.push(maior / x.classes.manualMesario);
    if (x.mesarios.liberacaoPorNaoRegistrado) { a.porNaoRegistrado += x.mesarios.liberacaoPorNaoRegistrado; a.secoesComNaoRegistrado++; }
    for (const [m, v] of lib) if (v.total > 0) { if (!a.liberouEm.has(m)) a.liberouEm.set(m, new Set()); a.liberouEm.get(m).add(id); }
    for (const m of x.mesarios.registrados) {
      if (!a.registros.has(m)) a.registros.set(m, []);
      a.registros.get(m).push(id);
    }
    // Última hora antes do encerramento: liberações manuais observadas × esperadas pela proporção de votos da hora
    if (x.votos >= 50 && manuais >= 5 && x.votosUltimaHora > 0) {
      const esperado = manuais * (x.votosUltimaHora / x.votos);
      const p = caudaPoisson(x.manualUltimaHora, esperado);
      a.ultimaHora.push({ secao: id, modelo: s.modelo, votos: x.votos, manuais, votosUltimaHora: x.votosUltimaHora, manualUltimaHora: x.manualUltimaHora, esperado: +esperado.toFixed(1), p });
    }
    if (maior >= 40) a.extremosMesario.push({ secao: id, modelo: s.modelo, votos: x.votos, manualMesario: x.classes.manualMesario, manualSemMesario: x.classes.manualSemMesario, biometria: x.classes.biometria, anoNascimento: x.classes.anoNascimento, maiorPorMesario: maior, maior10min: maior10 });
    if (maior10 >= 8) a.extremos10min.push({ secao: id, modelo: s.modelo, votos: x.votos, manuais, maior10min: maior10, maiorPorMesario: maior });
  }
}

const saida = {};
for (const [d, a] of Object.entries(dias)) {
  const multi = [...a.registros].filter(([, v]) => new Set(v).size > 1);
  const mesmaZona = multi.filter(([, v]) => new Set(v.map((x) => x.split('/').slice(0, 3).join('/'))).size === 1).length;
  const mesmoMunicipio = multi.filter(([, v]) => new Set(v.map((x) => x.split('/').slice(0, 2).join('/'))).size === 1).length;
  const mesmoLocal = multi.filter(([, v]) => new Set(v.map((x) => `${x.split('/').slice(0, 3).join('/')}#${local.get(x)}`)).size === 1).length;  const nSecoes = {};
  for (const [, v] of multi) { const n = new Set(v).size; nSecoes[n] = (nSecoes[n] ?? 0) + 1; }
  const ultimaHoraSig = a.ultimaHora.filter((x) => x.p < 1e-6).sort((x, y) => x.p - y.p);
  const nTestes = a.ultimaHora.length;
  saida[d] = {
    dia: d === 'd2' ? '25/10/2026' : '04/10/2026 (mesmo log do 2º turno)',
    secoes: a.secoes, votos: a.votos,
    liberacoes: { manualComMesarioIdentificado: a.manualMesario, manualSemAssociacaoNominal: a.manualSemMesario, anoNascimentoSemBiometriaCadastrada: a.anoNascimento },
    mesariosDistintosQueLiberaram_somaPorSecao: a.mesariosLiberando,
    maiorNumeroDeLiberacoesDeUmMesarioNaSecao: resumoDist(a.maiorPorMesario, 0),
    maiorNumeroDeLiberacoesDeUmMesarioEm10min: resumoDist(a.maior10minPorMesario, 0),
    parcelaDoMesarioPrincipal_secoesCom10OuMais: resumoDist(a.parcelaDoPrincipal, 3),
    liberacoesPorTituloNaoRegistradoComoMesarioNoDia: { liberacoes: a.porNaoRegistrado, secoes: a.secoesComNaoRegistrado },
    a13: {
      mesariosRegistrados: a.registros.size,
      emMaisDeUmaSecao: multi.length, porNumeroDeSecoes: nSecoes, todasNaMesmaZona: mesmaZona, todasNoMesmoMunicipio: mesmoMunicipio, todasNoMesmoLocalDeVotacao: mesmoLocal,
      liberaramEleitoresEmDuasOuMais: multi.filter(([m]) => (a.liberouEm.get(m)?.size ?? 0) >= 2).length,
      exemplos: multi.filter(([, v]) => new Set(v.map((x) => x.split('/').slice(0, 2).join('/'))).size > 1).slice(0, 20).map(([m, v]) => ({ mesario: m, secoes: [...new Set(v)] })),
      mesmaZonaExemplos: multi.slice(0, 10).map(([m, v]) => ({ mesario: m, secoes: [...new Set(v)] })),
    },
    ultimaHora: {
      manualNaUltimaHora: a.manualUltimaHora, votosNaUltimaHora: a.votosUltimaHora,
      secoesTestadas: nTestes, comPMenorQue1e6: ultimaHoraSig.length,
      lista: ultimaHoraSig.slice(0, 40).map((x) => ({ ...x, p: +x.p.toPrecision(2) })),
    },
    secoesComMesarioCom40OuMais: a.extremosMesario.sort((x, y) => y.maiorPorMesario - x.maiorPorMesario).slice(0, 60),
    secoesComMesarioCom8OuMaisEm10min: a.extremos10min.sort((x, y) => y.maior10min - x.maior10min).slice(0, 60),
    contagemMesarioCom40OuMais: a.extremosMesario.length, contagemMesarioCom8OuMaisEm10min: a.extremos10min.length,
  };
}
await writeFile(path.join(DIR_SAIDA, 'mesarios-resumo.json'), `${JSON.stringify(saida, null, 1)}\n`);
for (const d of ['d2', 'd1']) {
  const x = saida[d];
  console.log(`${x.dia}: ${x.secoes} seções · ${JSON.stringify(x.liberacoes)}`);
  console.log(' maior por mesário:', JSON.stringify(x.maiorNumeroDeLiberacoesDeUmMesarioNaSecao), '| em 10 min:', JSON.stringify(x.maiorNumeroDeLiberacoesDeUmMesarioEm10min));
  console.log(' parcela do principal:', JSON.stringify(x.parcelaDoMesarioPrincipal_secoesCom10OuMais));
  console.log(' não registrado:', JSON.stringify(x.liberacoesPorTituloNaoRegistradoComoMesarioNoDia));
  console.log(' A13:', JSON.stringify({ ...x.a13, exemplos: x.a13.exemplos.length, mesmaZonaExemplos: undefined }));
  console.log(' última hora:', JSON.stringify({ ...x.ultimaHora, lista: x.ultimaHora.lista.slice(0, 5) }));
  console.log(' mesário ≥40:', x.contagemMesarioCom40OuMais, '| ≥8 em 10 min:', x.contagemMesarioCom8OuMaisEm10min);
}
