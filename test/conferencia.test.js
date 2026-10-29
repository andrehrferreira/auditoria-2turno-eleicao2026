import assert from 'node:assert/strict';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { conferirSecao, hashesForaDoAux } from '../src/conferencia.js';
import { hashDiretorio } from '../src/vsc.js';
import { diretorioTemporario, montarVsc } from './auxiliares.js';

const prefixo = 'o03221xx0000100010001';
const conteudos = {
  bu: Buffer.from('bu ficticio'),
  rdv: Buffer.from('rdv ficticio'),
  log: Buffer.from('log ficticio'),
  imgbu: Buffer.from('imgbu ficticio'),
};
const nomes = { bu: `${prefixo}-bu.dat`, rdv: `${prefixo}-rdv.dat`, log: `${prefixo}-log.jez`, imgbu: `${prefixo}-imgbu.dat`, vota: `${prefixo}-vota.vsc` };
const vota = montarVsc(['bu', 'rdv', 'log', 'imgbu'].map((tp) => ({ nome: nomes[tp], buffer: conteudos[tp] })));
const hash = hashDiretorio(vota);
const aux = {
  st: 'Totalizada',
  hashes: [{ hash, st: 'Totalizado', arq: ['log', 'bu', 'rdv', 'vota'].map((tp) => ({ nm: nomes[tp], tp })) }],
};

async function secaoCompleta(t) {
  const dir = await diretorioTemporario(t);
  await mkdir(path.join(dir, hash));
  for (const tp of ['bu', 'rdv', 'log', 'imgbu']) await writeFile(path.join(dir, hash, nomes[tp]), conteudos[tp]);
  await writeFile(path.join(dir, hash, nomes.vota), vota);
  return dir;
}

test('seção íntegra fica completa, com imgbu conferido', async (t) => {
  const r = await conferirSecao({ dir: await secaoCompleta(t), aux });
  assert.equal(r.situacao, 'completa');
  assert.deepEqual(r.hashes[0].arquivos, { vota: 'ok', log: 'ok', bu: 'ok', rdv: 'ok' });
  assert.equal(r.hashes[0].imgbu, 'ok');
});

test('arquivo ausente sem reparo deixa a seção incompleta', async (t) => {
  const dir = await secaoCompleta(t);
  await rm(path.join(dir, hash, nomes.bu));
  const r = await conferirSecao({ dir, aux });
  assert.equal(r.situacao, 'incompleta');
  assert.equal(r.hashes[0].arquivos.bu, 'ausente');
});

test('arquivo divergente vai para quarentena e é baixado de novo', async (t) => {
  const dir = await secaoCompleta(t);
  await writeFile(path.join(dir, hash, nomes.rdv), 'adulterado');
  const pedidos = [];
  const baixar = async (h, nome, destino) => {
    pedidos.push([h, nome]);
    await writeFile(destino, conteudos.rdv);
  };
  const r = await conferirSecao({ dir, aux, baixar });
  assert.equal(r.situacao, 'completa');
  assert.deepEqual(pedidos, [[hash, nomes.rdv]]);
  const arquivos = await readdir(path.join(dir, hash));
  const quarentena = arquivos.filter((n) => n.startsWith(`${nomes.rdv}.invalido-`));
  assert.equal(quarentena.length, 1);
  assert.equal((await readFile(path.join(dir, hash, quarentena[0]))).toString(), 'adulterado');
});

test('falha no download fica registrada e a seção segue incompleta', async (t) => {
  const dir = await secaoCompleta(t);
  await rm(path.join(dir, hash, nomes.log));
  const r = await conferirSecao({ dir, aux, baixar: async () => { throw new Error('HTTP 404'); } });
  assert.equal(r.situacao, 'incompleta');
  assert.equal(r.hashes[0].arquivos.log, 'ausente');
  assert.equal(r.hashes[0].erros.log, 'HTTP 404');
});

test('vota.vsc que não corresponde ao hash do diretório é divergente', async (t) => {
  const dir = await secaoCompleta(t);
  await writeFile(path.join(dir, hash, nomes.vota), Buffer.concat([vota, Buffer.from([0])]));
  const r = await conferirSecao({ dir, aux });
  assert.equal(r.situacao, 'incompleta');
  assert.equal(r.hashes[0].arquivos.vota, 'divergente');
});

test('sem aux e aux sem hashes têm situação própria', async (t) => {
  const dir = await diretorioTemporario(t);
  assert.equal((await conferirSecao({ dir, aux: null })).situacao, 'sem_aux');
  const r = await conferirSecao({ dir, aux: { st: 'Não instalada', hashes: [] } });
  assert.equal(r.situacao, 'sem_arquivos_oficiais');
  assert.equal(r.statusAux, 'Não instalada');
});

test('lista diretórios de hash que não constam no aux', async (t) => {
  const dir = await secaoCompleta(t);
  await mkdir(path.join(dir, 'outrohash'));
  assert.deepEqual(await hashesForaDoAux(dir, aux), ['outrohash']);
});
