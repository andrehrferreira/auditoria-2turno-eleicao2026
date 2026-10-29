import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { juntarLogs, lerLogs, perfilBu, perfilLog } from '../src/perfil-secoes.js';
import { diretorioTemporario, montarZip } from './auxiliares.js';

// Log sintético no formato do logd.dat (TAB: data hora, nível, nº urna, aplicação, mensagem, hash). Títulos fictícios.
const linha = (hora, mensagem, nivel = 'INFO', dia = '25/10/2026') => `${dia} ${hora}\t${nivel}\t02199150\tVOTA\t${mensagem}\t0000000000000000`;
const ciclo = (h, ...habilitacao) => [
  linha(`${h}:00`, 'Aguardando digitação do identificador do eleitor'),
  ...habilitacao.map((m) => linha(`${h}:05`, m)),
  linha(`${h}:10`, 'Eleitor foi habilitado'),
  linha(`${h}:40`, 'O voto do eleitor foi computado'),
];

const LOG = [
  linha('17:00:00', 'Identificação do Modelo de Urna: UE2020', 'INFO', '24/10/2026'),
  linha('17:00:01', 'Número de série da MR: CD46FAA5', 'INFO', '24/10/2026'),
  linha('07:23:14', 'Registrando mesários antes da votação'),
  linha('07:23:44', 'Mesário 111111111111 não é eleitor da seção'),
  linha('07:23:46', 'Mesário 111111111111 registrado'),
  linha('07:25:43', 'Mesário 222222222222 é eleitor da seção'),
  linha('07:25:43', 'Mesário 222222222222 registrado'),
  linha('07:59:00', 'O voto do eleitor foi computado'), // fora da janela: antes de "Urna pronta"
  linha('08:00:01', 'Urna pronta para receber votos'),
  ...ciclo('08:01', 'Tipo de habilitação do eleitor [biométrica]'),
  ...ciclo('08:02', 'Ano de nascimento digitado é igual ao do cadastro'),
  ...ciclo('08:03', 'Dado digitado confere', 'Mesário 111111111111 habilitou o eleitor'),
  ...ciclo('08:04', 'Dado digitado confere', 'Mesário 111111111111 habilitou o eleitor'),
  ...ciclo('08:05', 'Dado digitado confere', 'Mesário 222222222222 habilitou o eleitor'),
  // habilitação sem biometria que não terminou em voto: não conta
  linha('08:06:00', 'Aguardando digitação do identificador do eleitor'),
  linha('08:06:05', 'Ano de nascimento digitado é igual ao do cadastro'),
  linha('08:06:30', 'Habilitação cancelada durante confirmação de dado do eleitor'),
  linha('08:07:00', 'Aguardando digitação do identificador do eleitor'),
  linha('08:07:02', 'O eleitor identificado já votou', 'ALERTA'),
  linha('16:58:30', 'Título digitado para encerramento: 111111111111'),
  linha('16:58:40', 'Registrando mesários após a votação'),
  linha('16:58:50', 'Mesário 111111111111 registrado'),
  linha('16:59:00', 'Inicio do Encerramento'),
].join('\n');

test('perfilLog conta habilitações só de eleitores que votaram, por forma de habilitação', () => {
  const p = perfilLog(LOG, '25/10/2026');
  assert.equal(p.votosComputados, 6);
  assert.equal(p.votosForaDaJanela, 1);
  assert.equal(p.habilitadosBiometria, 1);
  assert.equal(p.anoNascimentoSemBiometria, 1);
  assert.equal(p.dadoPessoalConfere, 3);
  assert.equal(p.habilitadosPeloMesario, 3);
  assert.equal(p.jaVotou, 1);
  assert.equal(p.alertas, 1);
});

test('perfilLog grava os dados dos mesários: registros, liberações por título e título de encerramento', () => {
  const { mesarios } = perfilLog(LOG, '25/10/2026');
  assert.deepEqual(mesarios.liberacoesPorMesario, { 111111111111: 2, 222222222222: 1 });
  assert.equal(mesarios.tituloEncerramento, '111111111111');
  assert.deepEqual(mesarios.registros.map(({ titulo, momento, eleitorDaSecao }) => [titulo, momento, eleitorDaSecao]), [
    ['111111111111', 'antes', false],
    ['222222222222', 'antes', true],
    ['111111111111', 'depois', false],
  ]);
});

test('perfilLog: seriais e modelo valem mesmo lidos na véspera; horários, rajada e intervalos', () => {
  const p = perfilLog(LOG, '25/10/2026');
  assert.equal(p.modeloUrna, 'UE2020');
  assert.equal(p.serialMR, 'CD46FAA5');
  assert.equal(p.urnaPronta, 8 * 3600 + 1);
  assert.equal(p.inicioEncerramento, 16 * 3600 + 59 * 60);
  assert.equal(p.votosPorHoraLocal[8], 5);
  assert.equal(p.votosPorHoraLocal[7], 1);
  assert.equal(p.maiorRajadaSemBiometria10min, 4);
  assert.equal(p.tempoHabilitacaoAteVoto.minimo, 30);
  assert.equal(p.intervaloEntreVotos.minimo, 60);
});

test('perfilBu: amostra real (ES 57037/0055/0372) bate com os valores conferidos à mão', () => {
  const dir = path.join(import.meta.dirname, 'fixtures', 'lacres', 'es-57037-0055-0372');
  const bu = perfilBu(readFileSync(path.join(dir, readdirSync(dir).find((n) => n.endsWith('-bu.dat')))));
  assert.equal(bu.qtdEleitoresCompareceram, 263);
  assert.deepEqual(bu.detalhamentoComparecimento, { semBiometriaCadastrada: 38, porBiometria: 213, comBiometriaHabilitadosPorAnoNascimento: 12 });
  assert.equal(bu.urna.numeroInternoUrna, 2199150);
  assert.equal(bu.urna.tipoUrna, 1);
  assert.equal(bu.dataHoraAbertura, '20261025T080001');
  const presidente = bu.eleicoes.find((e) => e.idEleicao === 6258);
  assert.deepEqual([presidente.aptos, presidente.aptosSecao, presidente.aptosTTE], [363, 363, 0]);
  assert.deepEqual(presidente.cargos[0].votos, { 13: 96, 22: 161, branco: 3, nulo: 3 });
});

test('lerLogs junta o log da urna de contingência com o da urna original (jez aninhado), em ordem de horário', async (t) => {
  const dir = await diretorioTemporario(t);
  const original = montarZip([{ nome: 'logd.dat', dados: Buffer.from([linha('08:00:01', 'Urna pronta para receber votos'), linha('09:00:00', 'O voto do eleitor foi computado')].join('\n'), 'latin1'), comprimir: true }]);
  const reserva = [linha('13:00:00', 'Urna pronta para receber votos'), linha('13:30:00', 'O voto do eleitor foi computado')].join('\n');
  const caminho = path.join(dir, 'o03221ac0100700090002-log.jez');
  await writeFile(caminho, montarZip([
    { nome: '0227604025102026133917-01.jez', dados: original },
    { nome: 'logd.dat', dados: Buffer.from(reserva, 'latin1'), comprimir: true },
  ]));
  const { texto, quantidade } = await lerLogs(caminho);
  assert.equal(quantidade, 2);
  assert.deepEqual(texto.split('\n').map((l) => l.slice(11, 19)), ['08:00:01', '09:00:00', '13:00:00', '13:30:00']);
  assert.equal(perfilLog(texto, '25/10/2026').votosComputados, 2);
});

test('juntarLogs conta uma vez o log copiado em dois .jez do pacote (contingência BA 39870, MG 40690)', () => {
  const comHash = (hora, msg, hash) => linha(hora, msg).replace(/0{16}$/, hash);
  const original = [comHash('09:00:00', 'O voto do eleitor foi computado', 'AAAA000000000001'), comHash('09:01:00', 'O voto do eleitor foi computado', 'AAAA000000000002')].join('\n');
  const { texto, duplicadas } = juntarLogs([original, original], '0002');
  assert.equal(duplicadas, 2);
  assert.equal(perfilLog(texto, '25/10/2026').votosComputados, 2);
});

test('juntarLogs separa as linhas que a urna declarou como de outra seção (RED, ES 57932/0009/0085)', () => {
  const recuperada = [
    linha('08:00:00', 'Seção Eleitoral: 0112'),
    linha('09:00:00', 'O voto do eleitor foi computado'),
    linha('10:00:00', 'Seção Eleitoral: 0085'),
    linha('11:00:00', 'O voto do eleitor foi computado'),
  ].join('\n');
  const { texto, outrasSecoes } = juntarLogs([recuperada], '0085');
  assert.deepEqual(outrasSecoes, { '0112': 2 });
  assert.equal(perfilLog(texto, '25/10/2026').votosComputados, 1);
  // sem a seção (scripts antigos), nada é separado
  assert.equal(perfilLog(juntarLogs([recuperada]).texto, '25/10/2026').votosComputados, 2);
});

test('juntarLogs não reordena por hora: relógio ajustado no dia e urnas diferentes ficam na ordem gravada (PI 12190/0063/0345)', () => {
  // relógio da urna volta de 08:15 para 07:36 no meio do ciclo do eleitor
  const ajustado = [linha('08:15:00', 'Aguardando digitação do identificador do eleitor'), linha('07:36:00', 'Eleitor foi habilitado'), linha('07:36:30', 'O voto do eleitor foi computado')].join('\n');
  assert.deepEqual(juntarLogs([ajustado]).texto.split('\n').map((l) => l.slice(11, 19)), ['08:15:00', '07:36:00', '07:36:30']);
  // reserva com relógio atrasado: entra depois da urna que quebrou (termina depois), sem intercalar linhas
  const original = [linha('09:00:00', 'A'), linha('10:00:00', 'B')].join('\n');
  const reserva = [linha('09:30:00', 'C').replace('02199150', '02199151'), linha('11:00:00', 'D').replace('02199150', '02199151')].join('\n');
  assert.deepEqual(juntarLogs([reserva, original]).texto.split('\n').map((l) => l.split('\t')[4]), ['A', 'B', 'C', 'D']);
});

test('perfilBu: BU do Sistema de Apuração ([1] dadosSA) não confunde dados do SA com o detalhamento do comparecimento', () => {
  const dir = path.join(import.meta.dirname, 'fixtures', 'lacres', 'zz-29173-0001-0494-sa-ue2015');
  const bu = perfilBu(readFileSync(path.join(dir, readdirSync(dir).find((n) => n.endsWith('-busa.dat')))));
  assert.equal(bu.dataHoraAbertura, null);
  assert.equal(bu.urna.tipoUrna, 3);
  assert.equal(typeof bu.qtdEleitoresCompareceram, 'number');
  assert.equal(bu.detalhamentoComparecimento, null);
});
