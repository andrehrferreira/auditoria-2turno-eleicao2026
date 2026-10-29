import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { open, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { lerEntrada, listarEntradas } from '../src/zip.js';
import { diretorioTemporario, montarZip } from './auxiliares.js';

const arquivos = [
  { nome: 'o03221xx0000100010001-bu.dat', dados: randomBytes(1000) },
  { nome: 'o03221xx0000100010001-log.jez', dados: Buffer.alloc(20000, 'log '), comprimir: true },
  { nome: 'leiame.pdf', dados: Buffer.from('pdf ficticio') },
];

async function lerTudo(t, zip) {
  const caminho = path.join(await diretorioTemporario(t), 'teste.zip');
  await writeFile(caminho, zip);
  const handle = await open(caminho, 'r');
  t.after(() => handle.close());
  const entradas = await listarEntradas(handle);
  return { handle, entradas };
}

for (const zip64 of [false, true]) {
  test(`lista e lê entradas stored/deflate (zip64=${zip64})`, async (t) => {
    const { handle, entradas } = await lerTudo(t, montarZip(arquivos, { zip64 }));
    assert.deepEqual(entradas.map((e) => e.nome), arquivos.map((a) => a.nome));
    for (const [i, entrada] of entradas.entries()) {
      assert.deepEqual(await lerEntrada(handle, entrada), arquivos[i].dados);
    }
  });
}

test('detecta corrupção pelo CRC', async (t) => {
  const zip = montarZip([arquivos[0]]);
  zip[30 + arquivos[0].nome.length + 10] ^= 0xff;
  const { handle, entradas } = await lerTudo(t, zip);
  await assert.rejects(lerEntrada(handle, entradas[0]), /CRC divergente/);
});

test('rejeita arquivo que não é ZIP', async (t) => {
  const caminho = path.join(await diretorioTemporario(t), 'falso.zip');
  await writeFile(caminho, randomBytes(500));
  const handle = await open(caminho, 'r');
  t.after(() => handle.close());
  await assert.rejects(listarEntradas(handle), /End Of Central Directory/);
});
