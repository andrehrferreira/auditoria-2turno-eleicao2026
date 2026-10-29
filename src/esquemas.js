import {
  campo, choice, dataHora, der, enumerado, generalString, int, numericString, oct, seq, seqOf, serialFlash,
} from './asn1.js';

// Transcrição dos .asn1 do pacote oficial do TSE "formato-arquivos-bu-rdv-ass-digital-v2.zip"
// (SHA-256 1e423054f32b8ba056960c58ada167d702c2618cc4d1dfd5de88f5090c84a235): spec/bu.asn1, spec/rdv.asn1,
// spec/assinatura.asn1. Onde 2026 difere da v2, o desvio está comentado e foi observado nos arquivos reais (doc 06).

// ---- enums comuns ----
export const CARGO_CONSTITUCIONAL = {
  1: 'presidente', 2: 'vicePresidente', 3: 'governador', 4: 'viceGovernador', 5: 'senador', 6: 'deputadoFederal',
  7: 'deputadoEstadual', 8: 'deputadoDistrital', 9: 'primeiroSuplenteSenador', 10: 'segundoSuplenteSenador',
  11: 'prefeito', 12: 'vicePrefeito', 13: 'vereador',
};
const FASE = { 1: 'simulado', 2: 'oficial', 3: 'treinamento' };
const TIPO_URNA = { 1: 'secao', 3: 'contingencia', 4: 'reservaSecao', 6: 'reservaEncerrandoSecao' };
const TIPO_ARQUIVO = {
  1: 'votacaoUE', 2: 'votacaoRED', 3: 'saMistaMRParcialCedula', 4: 'saMistaBUImpressoCedula', 5: 'saManual', 6: 'saEletronica',
};
const TIPO_APURACAO = { 1: 'totalmenteManual', 2: 'totalmenteEletronica', 3: 'mistaBU', 4: 'mistaMR' };
const TIPO_ENVELOPE = { 1: 'envelopeBoletimUrna', 2: 'envelopeRegistroDigitalVoto', 4: 'envelopeBoletimUrnaImpresso', 5: 'envelopeImagemBiometria' };
const TIPO_CARGO_CONSULTA = { 1: 'majoritario', 2: 'proporcional', 3: 'consulta' };
export const TIPO_VOTO_BU = { 1: 'nominal', 2: 'branco', 3: 'nulo', 4: 'legenda', 5: 'cargoSemCandidato' };
// Atenção: no RDV a numeração é outra (spec/rdv.asn1).
export const TIPO_VOTO_RDV = {
  1: 'legenda', 2: 'nominal', 3: 'branco', 4: 'nulo', 5: 'brancoAposSuspensao', 6: 'nuloAposSuspensao',
  7: 'nuloPorRepeticao', 8: 'nuloCargoSemCandidato', 9: 'nuloAposSuspensaoCargoSemCandidato',
};

// ---- tipos comuns ----
const idEleitoral = choice({ 1: ['idProcessoEleitoral', int], 2: ['idPleito', int], 3: ['idEleicao', int] });
const cabecalhoEntidade = seq([campo('dataGeracao', dataHora), campo('idEleitoral', idEleitoral)]);
const municipioZona = seq([campo('municipio', int), campo('zona', int)]);
const identificacaoSecaoEleitoral = seq([campo('municipioZona', municipioZona), campo('local', int), campo('secao', int)]);
const identificacaoContingencia = seq([campo('municipioZona', municipioZona)]);
const identificacaoUrna = choice({
  0: ['identificacaoSecaoEleitoral', identificacaoSecaoEleitoral],
  1: ['identificacaoContingencia', identificacaoContingencia],
});
const identificadorGeradorMidia = seq([
  campo('nome', generalString), campo('serialCertificadoTPM', generalString), campo('serialInstalacao', generalString),
]);
const carga = seq([
  campo('numeroInternoUrna', int), campo('numeroSerieFC', serialFlash), campo('identificadorGeradorMidia', identificadorGeradorMidia),
  campo('dataHoraCarga', dataHora), campo('codigoCarga', generalString),
]);
const correspondenciaResultado = seq([campo('identificacao', identificacaoUrna), campo('carga', carga)]);
const apuracao = (motivos) => seq([campo('tipoApuracao', enumerado(TIPO_APURACAO)), campo('motivoApuracao', enumerado(motivos))]);
const tipoApuracaoSA = choice({
  0: ['apuracaoMistaMR', apuracao({ 1: 'naoObteveExitoContingencia', 2: 'indisponibilidadeUrnaContingencia', 3: 'indisponibilidadeFlashContingencia', 4: 'problemaEnergiaEletrica', 5: 'naoFoiPossivelTrocarUrna', 6: 'naoFoiSolicitadaTrocaUrna', 99: 'outros' })],
  1: ['apuracaoMistaBUAE', apuracao({ 1: 'urnaDataHoraIncorreta', 2: 'urnaComDefeito', 3: 'urnaOutrasecao', 4: 'urnaPreparadaIncorretamente', 5: 'urnaChegouAposInicioVotacao', 99: 'outros' })],
  2: ['apuracaoTotalmenteManual', apuracao({ 1: 'urnaComDefeito', 2: 'urnaIndisponivelInicio', 3: 'urnaOutraSecao', 99: 'outros' })],
  3: ['apuracaoEletronica', apuracao({ 1: 'naoFoiPossivelReuperarResultado', 2: 'urnaNaoChegouMidiaDefeituosa', 3: 'urnaNaoChegouMidiaExtraviada', 99: 'outros' })],
});
const urna = seq([
  campo('tipoUrna', enumerado(TIPO_URNA)), campo('versaoVotacao', generalString),
  campo('correspondenciaResultado', correspondenciaResultado), campo('tipoArquivo', enumerado(TIPO_ARQUIVO)),
  campo('numeroSerieFV', serialFlash), campo('motivoUtilizacaoSA', tipoApuracaoSA, { opcional: true }),
]);
const codigoCargoConsulta = choice({ 1: ['cargoConstitucional', enumerado(CARGO_CONSTITUCIONAL)], 2: ['numeroCargoConsultaLivre', int] });

// ---- BU ----
const totalVotosVotavel = seq([
  campo('tipoVoto', enumerado(TIPO_VOTO_BU), { tag: 1 }),
  campo('quantidadeVotos', int, { tag: 2 }),
  campo('identificacaoVotavel', seq([campo('partido', int), campo('codigo', int)]), { tag: 3, opcional: true }),
  campo('ordemGeracaoHash', int),
  campo('hash', oct),
]);
const totalVotosCargo = seq([
  campo('codigoCargo', codigoCargoConsulta), campo('ordemImpressao', int), campo('votosVotaveis', seqOf(totalVotosVotavel)),
]);
const resultadoVotacao = seq([
  campo('tipoCargo', enumerado(TIPO_CARGO_CONSULTA)), campo('qtdComparecimento', int), campo('totaisVotosCargo', seqOf(totalVotosCargo)),
]);
const resultadoVotacaoPorEleicao = seq([
  campo('idEleicao', int), campo('qtdEleitoresAptos', int), campo('qtdEleitoresAptosSecao', int), campo('qtdEleitoresAptosTTE', int),
  campo('resultadosVotacao', seqOf(resultadoVotacao)), campo('ultimoHashVotosVotavel', oct), campo('assinaturaUltimoHashVotosVotavel', oct),
]);
const dadosSecaoSA = choice({
  0: ['dadosSecao', seq([
    campo('dataHoraAbertura', dataHora), campo('dataHoraEncerramento', dataHora),
    campo('dataHoraDesligamentoVotoImpresso', dataHora, { opcional: true }),
  ])],
  1: ['dadosSA', seq([
    campo('juntaApuradora', int), campo('turmaApuradora', int), campo('numeroInternoUrnaOrigem', int, { opcional: true }),
  ])],
});
export const entidadeBoletimUrna = seq([
  campo('cabecalho', cabecalhoEntidade),
  campo('fase', enumerado(FASE)),
  campo('urna', urna),
  campo('identificacaoSecao', identificacaoSecaoEleitoral),
  campo('dataHoraEmissao', dataHora),
  campo('dadosSecaoSA', dadosSecaoSA),
  campo('qtdEleitoresCompareceram', int),
  campo('detalhamentoComparecimento', seq([
    campo('qtdEleitoresCompareceramSemBiometria', int),
    campo('qtdEleitoresHabilitadosPorBiometria', int),
    campo('qtdEleitoresHabilitadosPorBiografia', int),
  ]), { tag: 1, opcional: true }),
  campo('resultadosVotacaoPorEleicao', seqOf(resultadoVotacaoPorEleicao)),
  campo('historicoCodigosCarga', seqOf(generalString)),
  campo('historicoVotoImpresso', seqOf(seq([
    campo('idImpressoraVotos', int), campo('idRepositorioVotos', int), campo('dataHoraLigamento', dataHora),
  ])), { opcional: true }),
]);

/** Envelope do `-bu.dat`/`-busa.dat`/`-imgbu.dat`: o conteúdo é outro DER (ou texto, no BU impresso). */
export const envelope = (conteudo) => seq([
  campo('cabecalho', cabecalhoEntidade),
  campo('fase', enumerado(FASE)),
  campo('urna', urna, { opcional: true }),
  campo('identificacao', identificacaoUrna),
  campo('tipoEnvelope', enumerado(TIPO_ENVELOPE)),
  campo('seguranca', seq([campo('idTipoArquivo', int), campo('idCriptografia', int), campo('idArquivoCD', int), campo('idArquivoChave', oct)]), { opcional: true }),
  campo('conteudo', conteudo),
]);
export const arquivoBu = envelope(der(entidadeBoletimUrna));

// ---- RDV ----
const voto = seq([campo('tipoVoto', enumerado(TIPO_VOTO_RDV)), campo('digitacao', numericString, { opcional: true })]);
const votosCargo = seq([campo('idCargo', codigoCargoConsulta), campo('quantidadeEscolhas', int), campo('votos', seqOf(voto))]);
const eleicoes = choice({
  1: ['eleicoesVota', seqOf(seq([campo('idEleicao', int), campo('votosCargos', seqOf(votosCargo))]))],
  2: ['eleicoesSA', seqOf(seq([
    campo('idEleicao', int), campo('tipoCedulaSA', enumerado({ 1: 'majoritario', 2: 'proporcional' })),
    campo('origemVotosSA', enumerado({ 1: 'cedula', 2: 'rdv', 3: 'bu' })), campo('votosCargos', seqOf(votosCargo)),
  ]))],
});
export const arquivoRdv = seq([
  campo('cabecalho', cabecalhoEntidade),
  campo('urna', urna),
  campo('rdv', seq([
    campo('pleito', int), campo('fase', enumerado(FASE)), campo('identificacao', identificacaoSecaoEleitoral),
    campo('historicoCodigosCarga', seqOf(generalString)), campo('eleicoes', eleicoes),
  ])),
]);

// ---- pacote de assinaturas (-vota.vsc / -sa.vsc) ----
const assinaturaDigital = seq([campo('tamanho', int), campo('hash', oct), campo('assinatura', oct)]);
const autoAssinaturaDigital = seq([
  campo('usuario', seq([campo('nomeUsuario', generalString), campo('serial', int)])),
  campo('algoritmoHash', seq([campo('algoritmo', enumerado({ 1: 'sha1', 2: 'sha256', 3: 'sha384', 4: 'sha512' }))])),
  campo('algoritmoAssinatura', seq([campo('algoritmo', enumerado({ 1: 'rsa', 2: 'ecdsa', 3: 'cepesc', 4: 'eddsa' })), campo('bits', int)])),
  campo('assinatura', assinaturaDigital),
]);
const assinaturaArquivos = seq([campo('arquivosAssinados', seqOf(seq([campo('nomeArquivo', generalString), campo('assinatura', assinaturaDigital)])))]);
// Em 2026, certificadoDigital e conjuntoChave vêm com tag de contexto ([1] e [0]), não como na v2.
const entidadeAssinatura = seq([
  campo('dataHoraCriacao', dataHora), campo('versao', int), campo('autoAssinado', autoAssinaturaDigital),
  campo('conteudoAutoAssinado', der(assinaturaArquivos)),
  campo('conjuntoChave', generalString, { tag: 0, opcional: true }),
  campo('certificadoDigital', oct, { tag: 1, opcional: true }),
]);
const MODELO_EQUIPAMENTO = { 1: 'tpm12', 2: 'tpm20', 9: 'ue2009', 10: 'ue2010', 11: 'ue2011', 13: 'ue2013', 15: 'ue2015', 20: 'ue2020', 22: 'ue2022' };
// Em 2026 o modelo vem por último, numa SEQUENCE com um segundo ENUMERATED não descrito na v2.
export const arquivoVsc = seq([
  campo('assinaturaSW', entidadeAssinatura),
  campo('assinaturaHW', entidadeAssinatura),
  campo('equipamento', seq([campo('modeloEquipamento', enumerado(MODELO_EQUIPAMENTO)), campo('naoDocumentado', enumerado({}))]), { opcional: true }),
]);
