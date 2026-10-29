// Cético, caso PI 11878/0028/0099: lê os arquivos BRUTOS dos dois turnos (BU, RDV, log, .vsc) e compara.
// O 1º turno veio do ZIP e não tem aux.json, por isso src/exportar.js devolve "pacotes: []" para ele;
// aqui cada diretório de hash é lido direto, com as mesmas funções de src/.
//
// Uso: node scripts/auditoria/cetico-pi0099-bruto.mjs
// Saída: data/parsed/auditoria/cetico/cetico-pi0099-bruto.json (títulos de mesário NÃO são gravados, só contagens)
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { decodificarArquivo } from '../../src/asn1.js';
import { arquivoBu, arquivoRdv } from '../../src/esquemas.js';
import { carregarAcs, verificarLacres } from '../../src/lacres.js';
import { lerLogJez } from '../../src/exportar.js';
import { DIA_VOTACAO, perfilLog } from '../../src/perfil-secoes.js';

const SECAO = { uf: 'pi', municipio: '11878', zona: '0028', secao: '0099' };
const DATA = { 1: '2026-10-04', 2: '2026-10-25' };
const SAIDA = 'data/parsed/auditoria/cetico/cetico-pi0099-bruto.json';
const acs = await carregarAcs();

const segundos = (hms) => { const [h, m, s] = hms.split(':').map(Number); return h * 3600 + m * 60 + s; };
const hhmm = (t) => (t == null ? null : `${String(Math.floor(t / 3600)).padStart(2, '0')}:${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}`);

async function lerTurno(turno) {
  const base = path.join('data/raw', `${turno}t`, 'urnas', SECAO.uf, SECAO.municipio, SECAO.zona, SECAO.secao);
  const hashes = (await readdir(base, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  const pacotes = [];
  for (const h of hashes) {
    const dir = path.join(base, h);
    const nomes = (await readdir(dir)).sort();
    const buf = new Map();
    for (const n of nomes) buf.set(n, await readFile(path.join(dir, n)));
    const achar = (suf) => nomes.find((n) => n.endsWith(suf));
    const bu = decodificarArquivo(arquivoBu, buf.get(achar('-bu.dat')));
    const c = bu.conteudo;
    const eleicoes = c.resultadosVotacaoPorEleicao.map((e) => {
      const pres = e.resultadosVotacao.flatMap((r) => r.totaisVotosCargo).find((t) => t.codigoCargo?.cargoConstitucional === 'presidente');
      const votos = pres ? Object.fromEntries(pres.votosVotaveis.map((v) => [v.tipoVoto === 'nominal' ? String(v.identificacaoVotavel.codigo) : v.tipoVoto, v.quantidadeVotos])) : null;
      return { idEleicao: e.idEleicao, aptos: e.qtdEleitoresAptos, aptosSecao: e.qtdEleitoresAptosSecao, aptosTTE: e.qtdEleitoresAptosTTE, presidente: votos };
    });
    const rdv = decodificarArquivo(arquivoRdv, buf.get(achar('-rdv.dat')));
    const elRdv = rdv.rdv.eleicoes.eleicoesVota ?? [];
    let rdvPres = null;
    for (const e of elRdv) for (const vc of e.votosCargos) {
      if (vc.idCargo?.cargoConstitucional !== 'presidente' && vc.idCargo !== 'presidente') continue;
      rdvPres = {};
      for (const v of vc.votos) { const k = v.tipoVoto === 'nominal' ? String(Number(v.digitacao)) : v.tipoVoto; rdvPres[k] = (rdvPres[k] ?? 0) + 1; }
    }
    const arquivos = new Map([...buf].filter(([n]) => !n.endsWith('.vsc')));
    const { urna, resultados } = verificarLacres({ vsc: buf.get(achar('.vsc')), arquivos, acs, dataEleicao: new Date(DATA[turno]) });
    const texto = await lerLogJez(path.join(dir, achar('-log.jez')));
    const perfil = perfilLog(texto, DIA_VOTACAO[turno]);
    // Eventos do dia: urnas no log, mensagens ERRO/ALERTA, reinícios, contingência, votos por 30 min
    const urnasLog = new Set();
    const raros = {};
    const votos30 = {};
    const semBioHoras = [];
    let ciclo = { bio: false };
    for (const linha of texto.split('\n')) {
      const [dh, nivel, urnaLog, aplic, msg = ''] = linha.split('\t');
      if (!dh?.startsWith(DIA_VOTACAO[turno])) continue;
      urnasLog.add(urnaLog);
      const t = segundos(dh.slice(11, 19));
      if (nivel === 'ERRO' || nivel === 'ALERTA' || /conting|substitu|reinici|Urna ligada|falha|cancel/i.test(msg)) {
        const k = `${nivel} ${aplic}: ${msg.replace(/\d{12}/g, '<titulo>')}`;
        raros[k] = (raros[k] ?? 0) + 1;
      }
      if (msg === 'Aguardando digitação do identificador do eleitor') ciclo = { bio: false };
      if (msg.includes('Tipo de habilitação do eleitor [biométrica]')) ciclo.bio = true;
      if (msg === 'O voto do eleitor foi computado') {
        const k = hhmm(Math.floor(t / 1800) * 1800);
        votos30[k] = (votos30[k] ?? 0) + 1;
        if (!ciclo.bio) semBioHoras.push(hhmm(t));
      }
    }
    const regs = perfil.mesarios.registros;
    pacotes.push({
      hash: h,
      identificacaoBu: c.identificacaoSecao,
      tipoUrna: c.urna.tipoUrna,
      carga: c.urna.correspondenciaResultado.carga,
      versao: c.urna.versaoVotacao,
      abertura: c.dadosSecaoSA?.dadosSecao?.dataHoraAbertura, encerramento: c.dadosSecaoSA?.dadosSecao?.dataHoraEncerramento,
      emissao: c.dataHoraEmissao,
      comparecimento: c.qtdEleitoresCompareceram,
      detalhamento: c.detalhamentoComparecimento,
      eleicoes,
      rdvPresidente: rdvPres,
      integridade: { urna, conferencias: resultados.length, falhas: resultados.filter((r) => !r.ok).length },
      log: {
        urnasNoLog: [...urnasLog],
        modelo: perfil.modeloUrna, serialMR: perfil.serialMR, serialMV: perfil.serialMV,
        urnaPronta: hhmm(perfil.urnaPronta), primeiroVoto: hhmm(perfil.primeiroVoto), ultimoVoto: hhmm(perfil.ultimoVoto), inicioEncerramento: hhmm(perfil.inicioEncerramento),
        votosComputados: perfil.votosComputados, votosForaDaJanela: perfil.votosForaDaJanela,
        habilitadosBiometria: perfil.habilitadosBiometria, anoNascimentoSemBiometria: perfil.anoNascimentoSemBiometria,
        dadoPessoalConfere: perfil.dadoPessoalConfere, habilitadosPeloMesario: perfil.habilitadosPeloMesario,
        jaVotou: perfil.jaVotou, eleitorNaoEncontrado: perfil.eleitorNaoEncontrado, impedidos: perfil.impedidos,
        suspensos: perfil.suspensosPeloMesario, reinicios: perfil.reiniciosDuranteVotacao, erros: perfil.erros, alertas: perfil.alertas,
        maiorRajadaSemBiometria10min: perfil.maiorRajadaSemBiometria10min, semBiometriaUltimaHora: perfil.semBiometriaUltimaHora,
        intervaloEntreVotos: perfil.intervaloEntreVotos, tempoHabilitacaoAteVoto: perfil.tempoHabilitacaoAteVoto,
        votosPorMeiaHora: votos30, horariosSemBiometria: semBioHoras,
        mesariosRegistrados: new Set(regs.map((r) => r.titulo)).size,
        mesariosLiberaramEleitor: Object.keys(perfil.mesarios.liberacoesPorMesario).length,
        liberacoesPorMesario: Object.values(perfil.mesarios.liberacoesPorMesario),
        eventosRaros: raros,
      },
      _titulosMesarios: [...new Set(regs.map((r) => r.titulo))],
      _titulosLiberadores: Object.keys(perfil.mesarios.liberacoesPorMesario),
    });
  }
  return pacotes;
}

const t1 = await lerTurno(1);
const t2 = await lerTurno(2);
const a = t1[0], b = t2[0];
const comuns = a._titulosMesarios.filter((x) => b._titulosMesarios.includes(x)).length;
const liberadorMesmo = a._titulosLiberadores.filter((x) => b._titulosLiberadores.includes(x)).length;
for (const p of [...t1, ...t2]) { delete p._titulosMesarios; delete p._titulosLiberadores; }
const resultado = {
  geradoEm: new Date().toISOString(), secao: SECAO, pacotes1: t1.length, pacotes2: t2.length,
  comparacao: {
    mesmaUrna: a.carga.numeroInternoUrna === b.carga.numeroInternoUrna,
    mesmaCarga: a.carga.codigoCarga === b.carga.codigoCarga,
    mesmoLocal: a.identificacaoBu.local === b.identificacaoBu.local,
    mesmosAptos: JSON.stringify(a.eleicoes.map((e) => e.aptos)) === JSON.stringify(b.eleicoes.map((e) => e.aptos)) || `${a.eleicoes.map((e) => e.aptos)} vs ${b.eleicoes.map((e) => e.aptos)}`,
    mesariosEmComum: comuns, mesarios1: a.log.mesariosRegistrados, mesarios2: b.log.mesariosRegistrados,
    liberadorDeEleitorEmComum: liberadorMesmo,
    buIgualRdv1: JSON.stringify(Object.entries(a.eleicoes.find((e) => e.presidente)?.presidente ?? {}).sort()) === JSON.stringify(Object.entries(a.rdvPresidente ?? {}).sort()),
    buIgualRdv2: JSON.stringify(Object.entries(b.eleicoes.find((e) => e.presidente)?.presidente ?? {}).sort()) === JSON.stringify(Object.entries(b.rdvPresidente ?? {}).sort()),
  },
  turno1: t1, turno2: t2,
};
await mkdir(path.dirname(SAIDA), { recursive: true });
await writeFile(SAIDA, JSON.stringify(resultado, null, 1));
console.log(JSON.stringify(resultado, null, 1));
