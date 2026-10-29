import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { procurar, variantes } from '../src/busca-identificador.js';

// Número fictício
const ID = '012345678901';

test('variantes cobre texto, BCD, inteiro e hashes, sem repetir', () => {
  const mapa = new Map(variantes(ID));
  assert.equal(mapa.get('texto:completo').toString(), ID);
  assert.equal(mapa.get('texto:semZeros').toString(), '12345678901');
  assert.equal(mapa.get('texto:agrupado').toString(), '0123 4567 8901');
  assert.equal(mapa.get('bcd').toString('hex'), ID);
  assert.equal(mapa.get('bcd-invertido').toString('hex'), '103254769810');
  assert.equal(mapa.get('int-minimo-be').toString('hex'), (12345678901).toString(16).padStart(10, '0'));
  assert.deepEqual(mapa.get('sha512(completo):bytes'), createHash('sha512').update(ID).digest());
  const hexes = variantes(ID).map(([, b]) => b.toString('hex'));
  assert.equal(new Set(hexes).size, hexes.length);
});

test('procurar acha cada ocorrência, em texto e em binário', () => {
  const lista = variantes(ID);
  const bcd = Buffer.from(ID, 'hex');
  const buffer = Buffer.concat([Buffer.from(`Mesário ${ID} habilitou | ${ID}`, 'latin1'), Buffer.from([0, 1]), bcd]);
  const achados = procurar(buffer, lista).map((a) => a.variante);
  assert.equal(achados.filter((v) => v === 'texto:completo').length, 2);
  assert.ok(achados.includes('bcd'));
  assert.deepEqual(procurar(Buffer.from('nada aqui'), lista), []);
});

test('variantes recusa entrada sem dígitos suficientes', () => {
  assert.throws(() => variantes('12-3'), /de 6 a 20 dígitos/);
});
