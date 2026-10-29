import assert from 'node:assert/strict';
import test from 'node:test';
import { contemCpf, lerConfig, textoDoSse } from '../src/modelos.js';

test('contemCpf detecta CPF válido com e sem pontuação', () => {
  // CPF fictício com dígitos verificadores válidos
  assert.equal(contemCpf('titular 529.982.247-25 votou'), true);
  assert.equal(contemCpf('linha 52998224725;'), true);
});

test('contemCpf ignora dígito verificador errado, repetições e números maiores', () => {
  assert.equal(contemCpf('529.982.247-26'), false);
  assert.equal(contemCpf('111.111.111-11'), false);
  assert.equal(contemCpf('seção 5299822472512 hash'), false);
});

test('lerConfig prefere o ambiente e cai no .env, com URL padrão', () => {
  assert.deepEqual(lerConfig({ NINEROUTER_API_KEY: 'amb' }, 'NINEROUTER_API_KEY=arq'), {
    baseUrl: 'http://localhost:20128/v1', chave: 'amb',
  });
  assert.deepEqual(lerConfig({}, '# x\r\nNINEROUTER_API_KEY="arq"\r\nNINEROUTER_BASE_URL=http://h/v1\r\n'), {
    baseUrl: 'http://h/v1', chave: 'arq',
  });
  assert.throws(() => lerConfig({}, ''), /NINEROUTER_API_KEY ausente/);
});

test('textoDoSse junta os deltas e ignora [DONE] e linhas vazias', () => {
  const sse = [
    'data: {"choices":[{"delta":{"role":"assistant"}}]}',
    '',
    'data: {"choices":[{"delta":{"content":"Olá, "}}]}',
    ': comentário',
    'data: {"choices":[{"delta":{"content":"mundo"}}]}',
    'data: [DONE]',
  ].join('\n');
  assert.equal(textoDoSse(sse), 'Olá, mundo');
});
