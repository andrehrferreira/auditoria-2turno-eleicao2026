// Confere no arquivo bruto, nos dois turnos, seções extremas do painel entre turnos (liberacao-entreturnos-painel.mjs).
// Lê direto do disco: -bu.dat (BU assinado, decodificado por src/lacres.js), -imgbu.dat (BU impresso, texto) e
// -log.jez (log do dia, src/perfil-secoes.js). Não depende do aux.json (as seções vindas dos ZIPs não o têm, e
// src/exportar.js sem aux não lista pacote). Títulos de mesário não são impressos: só quantas liberações o maior
// habilitador fez e se o mesmo título habilitou nos dois turnos.
//
// Uso: node scripts/auditoria/liberacao-entreturnos-conferir.mjs se/31593/0030/0173 ba/37397/0119/0060 ...
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { caminhos, dirSecao } from '../../src/config.js';
import { textoBuImpresso } from '../../src/exportar.js';
import { DIA_VOTACAO, lerLogs, perfilBu, perfilLog } from '../../src/perfil-secoes.js';

const ELEICAO = { 1: 6257, 2: 6258 };

async function turno(t, s) {
  const dir = dirSecao(caminhos(t).urnas, s);
  const pacotes = (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  const vistos = new Map();
  for (const h of pacotes) {
    const nomes = await readdir(path.join(dir, h));
    const achar = (suf) => nomes.find((n) => n.endsWith(suf));
    const buBytes = await readFile(path.join(dir, h, achar('-bu.dat')));
    const sha = createHash('sha256').update(buBytes).digest('hex');
    if (vistos.has(sha)) continue;
    const bu = perfilBu(buBytes);
    const e = bu.eleicoes.find((x) => x.idEleicao === ELEICAO[t]);
    const votos = e.cargos.find((c) => c.codigoCargo === 1).votos;
    const impresso = textoBuImpresso(await readFile(path.join(dir, h, achar('-imgbu.dat')))).texto;
    // trecho do BU impresso com o resultado de presidente (só para conferência visual)
    const i = impresso.search(/Presidente/i);
    const { texto } = await lerLogs(path.join(dir, h, achar('-log.jez')), s.secao);
    const log = perfilLog(texto, DIA_VOTACAO[t]);
    const lib = Object.entries(log.mesarios.liberacoesPorMesario);
    vistos.set(sha, {
      pacote: h.slice(0, 16), sha256Bu: sha.slice(0, 16), aptos: e.aptos, comparecimento: bu.qtdEleitoresCompareceram,
      detalhamento: bu.detalhamentoComparecimento, votosPresidente: votos,
      log: {
        votosComputados: log.votosComputados, biometria: log.habilitadosBiometria, anoNascimento: log.anoNascimentoSemBiometria,
        dadoPessoal: log.dadoPessoalConfere, habilitadosPeloMesario: log.habilitadosPeloMesario,
        liberacoesPorHabilitador: lib.map(([, n]) => n), maiorRajadaSemBiometria10min: log.maiorRajadaSemBiometria10min,
        semBiometriaUltimaHora: log.semBiometriaUltimaHora, jaVotou: log.jaVotou,
      },
      habilitadores: lib.map(([titulo]) => titulo),
      buImpressoPresidente: i < 0 ? null : impresso.slice(i, i + 400).replace(/\s+/g, ' '),
    });
  }
  return [...vistos.values()];
}

for (const arg of process.argv.slice(2)) {
  const [uf, municipio, zona, secao] = arg.split('/');
  const s = { uf, municipio, zona, secao };
  const [t1, t2] = [await turno(1, s), await turno(2, s)];
  const hab1 = new Set(t1.flatMap((p) => p.habilitadores));
  const mesmo = t2.flatMap((p) => p.habilitadores).filter((x) => hab1.has(x)).length;
  for (const p of [...t1, ...t2]) delete p.habilitadores;
  console.log(JSON.stringify({ secao: arg, turno1: t1, turno2: t2, habilitadoresDo2tQueTambemHabilitaramNo1t: mesmo }, null, 1));
}
