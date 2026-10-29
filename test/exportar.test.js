import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { campo, choice, decodificarArquivo, enumerado, int, seq, generalString } from '../src/asn1.js';
import { arquivoBu, arquivoRdv, arquivoVsc } from '../src/esquemas.js';
import { eventosLog, textoBuImpresso } from '../src/exportar.js';
import { der } from './auxiliares.js';

const fixture = (caminho) => readFileSync(new URL(`./fixtures/${caminho}`, import.meta.url));
const SA = 'exportar/zz-29173-0001-0494-sa/o03221zz2917300010494';

test('esquema: SEQUENCE com opcional de tag implícita, CHOICE, enum por nome e campos não previstos', () => {
  const tipo = seq([
    campo('numero', int),
    campo('detalhe', seq([campo('a', int)]), { tag: 1, opcional: true }),
    campo('escolha', choice({ 0: ['texto', generalString], 2: ['codigo', int] })),
    campo('fase', enumerado({ 2: 'oficial' })),
  ]);
  const bytes = der(0x30, Buffer.concat([
    der(0x02, Buffer.from([0x01, 0x07])),
    der(0x82, Buffer.from([5])),
    der(0x0a, Buffer.from([2])),
    der(0x02, Buffer.from([9])),
  ]));
  assert.deepEqual(decodificarArquivo(tipo, bytes), {
    numero: 263, escolha: { codigo: 5 }, fase: 'oficial', _naoPrevistos: [{ tag: '0x02', inteiro: 9 }],
  });
});

test('esquema: campo obrigatório ausente é erro com o caminho do campo', () => {
  const tipo = seq([campo('numero', int), campo('nome', generalString)]);
  assert.throws(() => decodificarArquivo(tipo, der(0x30, der(0x02, Buffer.from([1])))), /\$\.nome: campo obrigatório ausente/);
});

test('BU real (ES 57037/0055/0372) decodifica pela especificação, sem campos não previstos', () => {
  const bu = decodificarArquivo(arquivoBu, fixture('lacres/es-57037-0055-0372/o03221es5703700550372-bu.dat'));
  assert.equal(bu.tipoEnvelope, 'envelopeBoletimUrna');
  const c = bu.conteudo;
  assert.deepEqual(c.identificacaoSecao, { municipioZona: { municipio: 57037, zona: 55 }, local: 1430, secao: 372 });
  assert.equal(c.qtdEleitoresCompareceram, 263);
  assert.deepEqual(c.detalhamentoComparecimento, {
    qtdEleitoresCompareceramSemBiometria: 38, qtdEleitoresHabilitadosPorBiometria: 213, qtdEleitoresHabilitadosPorBiografia: 12,
  });
  assert.deepEqual(c.resultadosVotacaoPorEleicao.map((e) => e.idEleicao), [6258, 6260]);
  for (const e of c.resultadosVotacaoPorEleicao) {
    const soma = e.resultadosVotacao[0].totaisVotosCargo[0].votosVotaveis.reduce((n, v) => n + v.quantidadeVotos, 0);
    assert.equal(soma, 263);
  }
  assert.equal(JSON.stringify(bu).includes('_naoPrevistos'), false);
});

test('BU de urna de contingência traz tipoUrna reservaSecao', () => {
  const bu = decodificarArquivo(arquivoBu, fixture('lacres/ac-01007-0009-0002-contingencia/o03221ac0100700090002-bu.dat'));
  assert.equal(bu.conteudo.urna.tipoUrna, 'reservaSecao');
  assert.ok(bu.conteudo.urna.correspondenciaResultado.identificacao.identificacaoContingencia);
});

test('pacote de assinaturas (vota.vsc) decodifica com os 11 arquivos listados', () => {
  const vsc = decodificarArquivo(arquivoVsc, fixture('lacres/es-57037-0055-0372/o03221es5703700550372-vota.vsc'));
  assert.equal(vsc.assinaturaHW.autoAssinado.usuario.nomeUsuario, 'UEAO');
  assert.equal(vsc.assinaturaSW.autoAssinado.algoritmoAssinatura.algoritmo, 'cepesc');
  assert.equal(vsc.assinaturaHW.conteudoAutoAssinado.arquivosAssinados.length, 11);
  assert.equal(JSON.stringify(vsc).includes('_naoPrevistos'), false);
});

test('Sistema de Apuração: busa.dat, rdv.dat e sa.vsc seguem a especificação', () => {
  const bu = decodificarArquivo(arquivoBu, fixture(`${SA}-busa.dat`)).conteudo;
  assert.equal(bu.urna.tipoArquivo, 'saManual');
  assert.deepEqual(bu.dadosSecaoSA, { dadosSA: { juntaApuradora: 1, turmaApuradora: 1 } });
  const rdv = decodificarArquivo(arquivoRdv, fixture(`${SA}-rdv.dat`));
  assert.ok(rdv.rdv.eleicoes.eleicoesSA);
  const vsc = decodificarArquivo(arquivoVsc, fixture(`${SA}-sa.vsc`));
  assert.equal(vsc.assinaturaHW.autoAssinado.algoritmoAssinatura.algoritmo, 'ecdsa');
});

test('RDV de seção normal: tipos de voto pelo enum do RDV (diferente do BU)', () => {
  const rdv = decodificarArquivo(arquivoRdv, fixture('exportar/ac-01007-0009-0003/o03221ac0100700090003-rdv.dat'));
  const votos = rdv.rdv.eleicoes.eleicoesVota[0].votosCargos[0].votos;
  assert.equal(votos.length, 241);
  assert.deepEqual([...new Set(votos.map((v) => v.tipoVoto))].sort(), ['branco', 'nominal', 'nulo']);
  assert.ok(votos.filter((v) => v.tipoVoto === 'nominal').every((v) => /^\d+$/.test(v.digitacao)));
});

test('BU impresso: separa texto de blocos binários', () => {
  const binario = Buffer.alloc(40, 0x01);
  const conteudo = Buffer.concat([Buffer.from('Boletim de Urna - Seção 0001\n', 'latin1'), binario, Buffer.from('ASSINATURAS DOS MESÁRIOS:\n', 'latin1')]);
  const r = textoBuImpresso(conteudo);
  assert.equal(r.texto, 'Boletim de Urna - Seção 0001\n\nASSINATURAS DOS MESÁRIOS:\n');
  assert.deepEqual(r.blocosBinarios, [{ posicao: 29, tamanho: 40 }]);
  const real = textoBuImpresso(fixture(`${SA}-imgbusa.dat`));
  assert.match(real.texto, /Sistema de Apura/);
});

test('log: eventos com data legível e filtro do dia da votação', () => {
  const texto = [
    '24/10/2026 18:00:00\tINFO\t02269941\tGAP\tUrna ligada\tAAAA',
    '25/10/2026 06:00:01\tINFO\t02269941\tVOTA\tUrna pronta para receber votos\tBBBB',
    '25/10/2026 06:01:10\tINFO\t02269941\tVOTA\tO voto do eleitor foi computado\tCCCC',
    '',
  ].join('\r\n');
  const dia = eventosLog(texto, '25/10/2026');
  assert.equal(dia.eventos.length, 2);
  assert.deepEqual(dia.eventos[0], { dataHora: '2026-10-25 06:00:01', nivel: 'INFO', aplicacao: 'VOTA', mensagem: 'Urna pronta para receber votos', hash: 'BBBB' });
  assert.deepEqual(dia.urnas, ['02269941']);
  assert.equal(eventosLog(texto, null).eventos.length, 3);
});
