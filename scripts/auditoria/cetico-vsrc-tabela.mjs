// Revisor cético (votos-sem-log-reconciliacao): tabela final, seção por seção, a partir da varredura bruta
// de cetico-vsrc-dados.mjs (todas as UFs precisam estar feitas; a tabela recusa sair parcial).
// Critérios, todos em votos do BU menos rastro no log da própria seção, linhas por urna e sem cópias (C):
//   sem "computado"      = BU − linhas "O voto do eleitor foi computado"                       (engenheiro: 54 em 6)
//   sem ciclo hab+conf    = o anterior − ciclos habilitados com "Voto confirmado" e interrompidos (Auditor A: 50 em 3)
//   sem atendimento       = o anterior − habilitações sem confirmação interrompidas − atendimentos identificados e
//                           interrompidos antes da habilitação (limite inferior: nenhum rastro de eleitor)
// Uso: node scripts/auditoria/cetico-vsrc-tabela.mjs [--turno 2]
// Saída: data/parsed/auditoria/cetico/vsrc/tabela-<t>t.{json,txt}
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS, UFS } from '../../src/config.js';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' } } });
const turno = Number(values.turno);
const BASE = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'vsrc');
const faltam = UFS.filter((uf) => !existsSync(path.join(BASE, `${turno}t`, `${uf}.json`)));
if (faltam.length) {
  console.error(`varredura incompleta, faltam ${faltam.join(', ')}: a tabela não sai parcial`);
  process.exit(1);
}
const u = {
  secoesBanco: 0, secoesDisco: 0, soNoDisco: 0, semArquivo: 0, semArquivoComPacoteNoDisco: 0, sa: 0, urna: 0, comErro: 0, outrosDirsHash: 0,
  buDiferenteDoBanco: 0, logsPorPacote: {}, totais: { bu: 0, A: 0, B: 0, C: 0, duplicadas: 0 }, divergeA: 0, divergeB: 0, divergeC: 0, I11B: 0, I11C: 0,
  comInterrompidoConfirmado: 0, interrompidoConfirmadoViraVoto: 0, fontes: new Set(), erros: [], sa_lista: [], soNoDiscoLista: [],
};
const linhas = [];
const outros = [];
for (const uf of UFS) {
  const r = JSON.parse(readFileSync(path.join(BASE, `${turno}t`, `${uf}.json`), 'utf8'));
  for (const k of ['secoesBanco', 'secoesDisco', 'soNoDisco', 'semArquivo', 'semArquivoComPacoteNoDisco', 'sa', 'urna', 'comErro', 'outrosDirsHash', 'buDiferenteDoBanco',
    'divergeA', 'divergeB', 'divergeC', 'I11B', 'I11C', 'comInterrompidoConfirmado', 'interrompidoConfirmadoViraVoto']) u[k] += r[k];
  for (const [k, n] of Object.entries(r.logsPorPacote)) u.logsPorPacote[k] = (u.logsPorPacote[k] ?? 0) + n;
  for (const k of Object.keys(u.totais)) u.totais[k] += r.totais[k];
  u.fontes.add(r.fonte);
  u.erros.push(...r.erros.map((e) => ({ uf, ...e })));
  u.sa_lista.push(...r.sa_lista.map((s) => `${uf}/${s}`));
  u.soNoDiscoLista.push(...(r.soNoDiscoLista ?? []).map((s) => `${uf}/${s}`));
  for (const d of r.detalhe) {
    const a = d.completo;
    const C = a.C;
    const semComputado = Math.max(0, d.bu - C.computados);
    const semCiclo = Math.max(0, semComputado - C.interrompidosComConfirmacao);
    const semAtendimento = Math.max(0, semCiclo - C.interrompidosSemConfirmacao - C.identificadoInterrompido);
    const logs = a.porTexto.map((t) => ({
      arquivo: t.nome, urnas: Object.keys(t.urnas).join('+'), modelo: t.modelo, secoesDeclaradas: Object.keys(t.secoesDeclaradas).join('+') || '-',
      computados: t.computados, de: t.primeira?.slice(11), ate: t.ultima?.slice(11),
    }));
    const linha = {
      secao: d.secao, tipoUrna: d.tipoUrna, tipoArquivo: d.tipoArquivo, urnaBu: a.bu.numeroInterno, historicoCargas: a.bu.historicoCodigosCarga.length,
      abertura: a.bu.abertura?.slice(11), bu: d.bu, computadoBruto: d.A, computadoSemCopias: d.B, computadoDaSecao: C.computados,
      ciclosCompletos: C.completos, computadoSemConfirmacao: C.computadoSemConfirmacao, interrompidosComConfirmacao: C.interrompidosComConfirmacao,
      interrompidosSemConfirmacao: C.interrompidosSemConfirmacao, identificadoInterrompido: C.identificadoInterrompido, computadoSemHabilitacao: C.computadoSemHabilitacao,
      semComputado, semCiclo, semAtendimento, logBrutoMenosBu: d.A - d.bu, I11matematico: d.I11B, I11daSecao: d.I11C, linhasCopiadas: a.duplicadas, logs,
      interrompidos: C.interrompidos,
    };
    if (d.A !== d.bu || d.B !== d.bu || C.computados !== d.bu) linhas.push(linha);
    else outros.push(linha);
  }
}
const soma = (k, f = () => true) => linhas.filter(f).reduce((s, l) => s + l[k], 0);
const conta = (f) => linhas.filter(f).length;
const resumo = {
  turno, fontes: [...u.fontes], universo: {
    secoesNoBanco: u.secoesBanco, secoesNoDisco: u.secoesDisco, soNoDisco: u.soNoDisco, soNoDiscoLista: u.soNoDiscoLista,
    semArquivo: u.semArquivo, semArquivoComPacoteNoDisco: u.semArquivoComPacoteNoDisco, sistemaApuracao: u.sa, saLista: u.sa_lista,
    pacotesDeUrnaComparados: u.urna - u.comErro, comErro: u.comErro, erros: u.erros, secoesComOutroDiretorioDeHash: u.outrosDirsHash,
    buDiferenteDoBanco: u.buDiferenteDoBanco, logsPorPacote: u.logsPorPacote, totais: u.totais,
  },
  divergentes: {
    computadoBrutoDiferenteDoBu: u.divergeA, computadoSemCopiasDiferenteDoBu: u.divergeB, computadoDaSecaoDiferenteDoBu: u.divergeC,
    I11matematico: u.I11B, I11daSecao: u.I11C,
  },
  criterios: {
    semComputado: { votos: soma('semComputado'), secoes: conta((l) => l.semComputado > 0) },
    semCicloHabConf: { votos: soma('semCiclo'), secoes: conta((l) => l.semCiclo > 0) },
    semNenhumAtendimento: { votos: soma('semAtendimento'), secoes: conta((l) => l.semAtendimento > 0) },
    logAMaisBruto: { secoes: conta((l) => l.logBrutoMenosBu > 0), votos: soma('logBrutoMenosBu', (l) => l.logBrutoMenosBu > 0) },
  },
  interrompidosComConfirmacao: { secoes: u.comInterrompidoConfirmado, viraramVotoNoBu: u.interrompidoConfirmadoViraVoto, naoViraram: u.comInterrompidoConfirmado - u.interrompidoConfirmadoViraVoto },
  outrasSecoesComSinal: outros.map((l) => ({ secao: l.secao, bu: l.bu, C: l.computadoDaSecao, I11matematico: l.I11matematico, I11daSecao: l.I11daSecao, computadoSemHabilitacao: l.computadoSemHabilitacao })),
};
writeFileSync(path.join(BASE, `tabela-${turno}t.json`), JSON.stringify({ resumo, linhas }, null, 1));
const txt = [];
txt.push(`Turno ${turno}. Fonte: ${resumo.fontes.join(', ')}`);
txt.push(`Universo: ${u.secoesBanco} seções no banco (${u.secoesDisco} no disco, ${u.soNoDisco} só no disco); sem arquivo ${u.semArquivo} (com pacote no disco: ${u.semArquivoComPacoteNoDisco}); `
  + `Sistema de Apuração ${u.sa}; pacotes de urna comparados ${u.urna - u.comErro} de ${u.urna} (erro ${u.comErro}); outro diretório de hash na seção: ${u.outrosDirsHash}; BU lido ≠ banco: ${u.buDiferenteDoBanco}`);
txt.push(`logd.dat por pacote: ${JSON.stringify(u.logsPorPacote)}`);
txt.push(`Totais: BU ${u.totais.bu}; computado bruto ${u.totais.A}; sem cópias ${u.totais.B}; da seção ${u.totais.C}; linhas copiadas ${u.totais.duplicadas}`);
txt.push(`BU ≠ computado: bruto ${u.divergeA}, sem cópias ${u.divergeB}, da seção ${u.divergeC}. I11 (confirmações por cargo): método do matemático ${u.I11B}, só a seção ${u.I11C}`);
txt.push(`Sem "computado": ${resumo.criterios.semComputado.votos} votos em ${resumo.criterios.semComputado.secoes} seções; sem ciclo hab+conf: ${resumo.criterios.semCicloHabConf.votos} em ${resumo.criterios.semCicloHabConf.secoes}; `
  + `sem nenhum atendimento: ${resumo.criterios.semNenhumAtendimento.votos} em ${resumo.criterios.semNenhumAtendimento.secoes}; log bruto a mais: ${resumo.criterios.logAMaisBruto.secoes} seções (+${resumo.criterios.logAMaisBruto.votos})`);
txt.push(`Ciclos interrompidos com confirmação: ${u.comInterrompidoConfirmado} seções; viraram voto no BU em ${u.interrompidoConfirmadoViraVoto}`);
txt.push('');
txt.push(['seção', 'tipo', 'BU', 'comp.bruto', 'comp.s/cópia', 'comp.seção', 'completos', 'comp.s/conf', 'int.c/conf', 'int.s/conf', 'ident.int', 's/computado', 's/ciclo', 's/atend', 'I11 mat.', 'logs (arquivo: urna modelo seções computados de-até)'].join(' | '));
for (const l of linhas) {
  txt.push([l.secao, `${l.tipoUrna}/${l.tipoArquivo}`, l.bu, l.computadoBruto, l.computadoSemCopias, l.computadoDaSecao, l.ciclosCompletos, l.computadoSemConfirmacao,
    l.interrompidosComConfirmacao, l.interrompidosSemConfirmacao, l.identificadoInterrompido, l.semComputado, l.semCiclo, l.semAtendimento, l.I11matematico.length ? 'viola' : 'ok',
    l.logs.map((g) => `${g.arquivo}: ${g.urnas} ${g.modelo} sec ${g.secoesDeclaradas} ${g.computados} ${g.de}-${g.ate}`).join(' ; ')].join(' | '));
}
writeFileSync(path.join(BASE, `tabela-${turno}t.txt`), `${txt.join('\n')}\n`);
console.log(txt.join('\n'));
