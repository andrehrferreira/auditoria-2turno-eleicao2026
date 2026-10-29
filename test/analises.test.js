import assert from 'node:assert/strict';
import test from 'node:test';
import { analisar, spearman } from '../src/analises.js';

const horas = (mapa) => Object.assign(new Array(24).fill(0), mapa);
const secao = (n, extra = {}) => ({
  uf: 'xx', municipio: '00001', zona: '0001', secao: String(n).padStart(4, '0'),
  tipoUrna: 1, versao: 'v1', modelo: 'UE2020', numeroInternoUrna: 1000 + n, serialFV: `FV${n}`, serialMR: `MR${n}`,
  aptos: 100, aptosTTE: 0, comparecimento: 80, votos: { 13: 40, 22: 38, branco: 1, nulo: 1 },
  semBiometriaCadastrada: 4, comBiometriaPorAnoNascimento: 4, porBiometria: 72, habilitadosPeloMesario: 3, maiorMesario: 2,
  jaVotou: 0, horaAberturaLocal: 8, votosPorHoraLocal: horas({ 8: 40, 16: 40 }), votosForaDaJanela: 0,
  reinicios: 0, logsNoPacote: 1, maiorRajada: 1, habilitacaoAteVoto: [0, 0, 1, 79, 0, 0, 0, 0], intervaloMinimoEntreVotos: 30,
  ...extra,
});

test('spearman: monotônico = 1, inverso = -1', () => {
  assert.equal(spearman([1, 2, 3, 4], [10, 20, 30, 40]), 1);
  assert.equal(spearman([1, 2, 3, 4], [4, 3, 2, 1]), -1);
});

test('analisar: totais, 100%/90%, comparecimento ≥ aptos, votos após 17h e seriais repetidos', () => {
  const r = analisar([
    secao(1),
    secao(2, { votos: { 13: 50, branco: 0 }, comparecimento: 50 }), // 100% para o 13
    secao(3, { votos: { 13: 2, 22: 48 }, comparecimento: 50 }), // 96% para o 22
    secao(4, { comparecimento: 100, votosPorHoraLocal: horas({ 8: 90, 17: 10 }) }), // = aptos; 10 votos após 17h
    secao(5, { serialMR: 'MR1', titulosMesarios: ['999999999999'] }), // mesma mídia de resultado da seção 1; mesário também na seção 3
    secao(3.5, { secao: '0099', titulosMesarios: ['999999999999'] }),
    secao(6, { uf: 'yy', horaAberturaLocal: 6, votosPorHoraLocal: horas({ 6: 70, 15: 10 }) }), // fuso −2h: 15h local = 17h Brasília
  ]);
  assert.deepEqual(r.finalistas, ['13', '22']);
  assert.equal(r.nacional.secoes, 7);
  assert.deepEqual(r.a13.mesarioEmMaisDeUmaSecao, [{ serial: '999999999999', secoes: ['xx/00001/0001/0005', 'xx/00001/0001/0099'] }]);
  assert.equal(r.a3a4.cem, 1);
  assert.deepEqual(r.a3a4.cemPorCandidato, { 13: 1, 22: 0 });
  assert.equal(r.a3a4.noventa, 2);
  assert.equal(r.a7.secoes, 1);
  assert.equal(r.a2.votosApos17hBrasilia, 20);
  assert.equal(r.a2.secoesComVotoApos17h, 2);
  assert.deepEqual(r.a12.mrRepetida, [{ serial: 'MR1', secoes: ['xx/00001/0001/0001', 'xx/00001/0001/0005'] }]);
  assert.equal(r.a12.fvRepetida.length, 0);
});

test('analisar: fuso do município vem da abertura mais comum, não de uma urna de contingência aberta tarde', () => {
  const r = analisar([
    secao(1), secao(2), secao(3),
    secao(4, { tipoUrna: 4, horaAberturaLocal: 13, votosPorHoraLocal: horas({ 13: 30, 17: 5 }) }),
  ]);
  assert.equal(r.a2.votosApos17hBrasilia, 5);
});
