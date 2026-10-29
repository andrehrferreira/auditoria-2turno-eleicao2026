import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { codificarPonto, decodificarPonto, verificarEd521 } from '../src/ed521.js';

// Vetores de teste da própria ECPy (src/ecpy/eddsa.py, bloco Ed521): uma mensagem simples e o
// TBSCertificate da AC Raiz Brasileira v7 da ICP-Brasil.
const vetores = JSON.parse(readFileSync(path.join(import.meta.dirname, 'fixtures', 'lacres', 'vetores-ecpy-ed521.json'), 'utf8'));
const hex = (s) => Buffer.from(s, 'hex');

for (const [i, v] of vetores.entries()) {
  const chave = codificarPonto(BigInt(`0x${v.x}`), BigInt(`0x${v.y}`));

  test(`vetor ECPy ${i + 1}: assinatura válida é aceita`, () => {
    assert.equal(verificarEd521(chave, hex(v.mensagem), hex(v.assinatura)), true);
  });

  test(`vetor ECPy ${i + 1}: mensagem ou assinatura alterada é rejeitada`, () => {
    const mensagem = hex(v.mensagem);
    mensagem[0] ^= 1;
    assert.equal(verificarEd521(chave, mensagem, hex(v.assinatura)), false);
    const assinatura = hex(v.assinatura);
    assinatura[100] ^= 1;
    assert.equal(verificarEd521(chave, hex(v.mensagem), assinatura), false);
  });

  test(`vetor ECPy ${i + 1}: codificação do ponto é reversível`, () => {
    assert.deepEqual(decodificarPonto(chave), [BigInt(`0x${v.x}`), BigInt(`0x${v.y}`)]);
  });
}

test('rejeita tamanhos errados sem lançar exceção', () => {
  const v = vetores[0];
  const chave = codificarPonto(BigInt(`0x${v.x}`), BigInt(`0x${v.y}`));
  assert.equal(verificarEd521(chave.subarray(1), hex(v.mensagem), hex(v.assinatura)), false);
  assert.equal(verificarEd521(chave, hex(v.mensagem), hex(v.assinatura).subarray(1)), false);
});
