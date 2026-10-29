import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { hashDiretorio, lerResumosVsc, sha512Hex } from '../src/vsc.js';
import { entradaVsc, montarVsc } from './auxiliares.js';

const bu = Buffer.from('conteudo ficticio do bu');
const log = Buffer.alloc(5000, 0x41);

test('extrai nome → SHA-512 de cada arquivo listado no vota.vsc', () => {
  const vsc = montarVsc([{ nome: 'o00001xx0000100010001-bu.dat', buffer: bu }, { nome: 'o00001xx0000100010001-log.jez', buffer: log }]);
  const mapa = lerResumosVsc(vsc);
  assert.equal(mapa.size, 2);
  assert.equal(mapa.get('o00001xx0000100010001-bu.dat'), sha512Hex(bu));
  assert.equal(mapa.get('o00001xx0000100010001-log.jez'), sha512Hex(log));
});

test('rejeita resumos divergentes para o mesmo arquivo', () => {
  const outro = entradaVsc('o00001xx0000100010001-bu.dat', createHash('sha512').update('outro').digest());
  const vsc = montarVsc([{ nome: 'o00001xx0000100010001-bu.dat', buffer: bu }], { entradasExtras: [outro] });
  assert.throws(() => lerResumosVsc(vsc), /divergentes/);
});

test('rejeita vota.vsc sem entradas ou truncado', () => {
  assert.throws(() => lerResumosVsc(Buffer.from([0x30, 0x00])), /nenhuma entrada/);
  const vsc = montarVsc([{ nome: 'a-bu.dat', buffer: bu }]);
  assert.throws(() => lerResumosVsc(vsc.subarray(0, vsc.length - 10)), /DER/);
});

test('hashDiretorio é o hex do base64 do SHA-256, com "/" trocado por "-"', () => {
  // SHA-256("abc") em base64 = ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0= (tem '+' e '/')
  const esperado = Buffer.from('ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD-YfIAFa0=', 'latin1').toString('hex');
  assert.equal(hashDiretorio(Buffer.from('abc')), esperado);
});
