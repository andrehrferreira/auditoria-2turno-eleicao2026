import assert from 'node:assert/strict';
import test from 'node:test';
import { compararSecao, finalistas, marcar, referencia, zRobusto } from '../src/comparar-turnos.js';

const FIN = ['13', '22'];
const turno = (votos, extra = {}) => ({
  aptos: 300, aptosTTE: 0, comparecimento: Object.values(votos).reduce((a, v) => a + v, 0), votos,
  semBiometriaCadastrada: 5, comBiometriaPorAnoNascimento: 4, habilitadosPeloMesario: 4, jaVotou: 0,
  numeroInternoUrna: 1, modelo: 'UE2020', titulosMesarios: ['m1', 'm2'], ...extra,
});

test('resíduo contábil não prova migração (contraexemplo da revisão T03, A1)', () => {
  // 100 aptos; 1T A=40, B=40, 20 abstenções; 2T A=50, B=30, 20 abstenções:
  // 10 abstencionistas votam A e 10 eleitores de B se abstêm, sem ninguém trocar de B para A
  const t1 = turno({ 13: 40, 22: 40 }, { aptos: 100 });
  const t2 = turno({ 13: 50, 22: 30 }, { aptos: 100 });
  const c = compararSecao(t1, t2, FIN);
  assert.equal(c.d.residuo13, 10);
  assert.equal(c.migracaoMinima['13'], 0);
});

test('migração mínima só aparece quando nem abstenção, eliminados e brancos cobrem o ganho', () => {
  // 1T: 13=20, 22=170, outros=5, nulos=5, abstenção 100; 2T: 13=140, 22=60
  const t1 = turno({ 13: 20, 22: 170, 30: 5, nulo: 5 });
  const t2 = turno({ 13: 140, 22: 60 });
  const c = compararSecao(t1, t2, FIN);
  // 140 − (20 + 5 + 5 + 100) = 10 eleitores que só podem ter vindo do 22
  assert.equal(c.migracaoMinima['13'], 10);
  assert.equal(c.migracaoMinima['22'], 0);
  const [s] = marcar([{ uf: 'ac', municipio: '1', zona: '1', secao: '1', ...c }]);
  assert.ok(s.alertas.some((a) => a.tipo === 'contabil' && a.texto.startsWith('13 precisa de pelo menos 10')));
});

test('aptos comparados sem o voto em trânsito e inconsistências registradas', () => {
  const t1 = turno({ 22: 1 }, { aptos: 301, aptosTTE: 2, comparecimento: 2, habilitadosPeloMesario: 6 });
  const c = compararSecao(t1, turno({ 22: 1 }), FIN);
  assert.equal(c.aptos1, 299);
  assert.equal(c.aptos2, 300);
  assert.equal(c.inconsistencias.length, 2);
  assert.match(c.inconsistencias[0], /soma dos votos 1 ≠ comparecimento 2/);
  assert.match(c.inconsistencias[1], /mais liberações pelo mesário \(6\) que manuais \(4\)/);
});

test('referência robusta: MAD zero cai no desvio absoluto médio (revisão T03, A3)', () => {
  assert.equal(zRobusto(5, [1, 1, 1]), null);
  assert.equal(+zRobusto(10, [1, 2, 3, 4, 5]).toFixed(3), +((10 - 3) / 1.4826).toFixed(3));
  const { centro, escala } = referencia([0, 0, 0, 0, 0, 0, 0, 0, 0, 20]);
  assert.equal(centro, 0);
  assert.equal(+escala.toFixed(4), +(2 * 1.2533).toFixed(4));
});

test('marcar exige z alto e desvio em eleitores em relação às vizinhas (revisão T03, A5)', () => {
  const base = (i, x) => ({
    uf: 'ac', municipio: '1', zona: '1', secao: String(i), aptos1: 300, aptos2: 300, aptosTTE1: 0, aptosTTE2: 0,
    comparecimento1: 200, comparecimento2: 200, migracaoMinima: {}, inconsistencias: [],
    m: { x: x / 300 }, d: { x }, den: { x: 300 },
  });
  // vizinhas caem 30; uma seção fica estável (desvio +30 em relação a elas) e outra cai só 8 a mais
  const secoes = [...Array.from({ length: 20 }, (_, i) => base(i, -30 + (i % 3))), base(98, 0), base(99, -38)];
  marcar(secoes);
  assert.deepEqual(secoes[20].alertas.map((a) => a.tipo), ['estatistico']);
  assert.deepEqual(secoes[21].alertas, []);
});

test('finalistas exige exatamente dois números no 2º turno', () => {
  assert.deepEqual(finalistas(new Map([['a', [{ votos: { 22: 1, 13: 2, nulo: 1 } }]]])), ['13', '22']);
  assert.throws(() => finalistas(new Map([['a', [{ votos: { 22: 1, 13: 2, 30: 1 } }]]])), /3 números nominais/);
});
