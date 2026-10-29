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

test('seção "Nao instalada" (hash "0", sem arquivo) é sem_arquivos_oficiais', async (t) => {
  const dir = await diretorioTemporario(t);
  const naoInstalada = { st: 'Nao instalada', hashes: [{ hash: '0', dr: '', hr: '', st: 'Sem arquivo', arq: [{ nm: '', tp: '' }] }] };
  const r = await conferirSecao({ dir, aux: naoInstalada, baixar: async () => { throw new Error('não deveria baixar'); } });
  assert.equal(r.situacao, 'sem_arquivos_oficiais');
  assert.equal(r.statusAux, 'Nao instalada');
});

test('seção do Sistema de Apuração usa sa.vsc como manifesto e confere busa/logsa/imgbusa', async (t) => {
  const pfx = 'o03221zz0000100010001';
  const sa = {
    busa: Buffer.from('busa ficticio'), rdv: Buffer.from('rdv ficticio'),
    logsa: Buffer.from('logsa ficticio'), imgbusa: Buffer.from('imgbusa ficticio'),
  };
  const nome = { busa: `${pfx}-busa.dat`, rdv: `${pfx}-rdv.dat`, logsa: `${pfx}-logsa.jez`, imgbusa: `${pfx}-imgbusa.dat`, sa: `${pfx}-sa.vsc` };
  const manifesto = montarVsc(Object.keys(sa).map((tp) => ({ nome: nome[tp], buffer: sa[tp] })));
  const hashSa = hashDiretorio(manifesto);
  const dir = await diretorioTemporario(t);
  await mkdir(path.join(dir, hashSa));
  for (const tp of Object.keys(sa)) await writeFile(path.join(dir, hashSa, nome[tp]), sa[tp]);
  await writeFile(path.join(dir, hashSa, nome.sa), manifesto);
  const auxSa = { st: 'Totalizada', hashes: [{ hash: hashSa, st: 'Totalizado', arq: ['sa', 'busa', 'logsa', 'rdv'].map((tp) => ({ nm: nome[tp], tp })) }] };

  const r = await conferirSecao({ dir, aux: auxSa });
  assert.equal(r.situacao, 'completa');
  assert.deepEqual(r.hashes[0].arquivos, { sa: 'ok', busa: 'ok', logsa: 'ok', rdv: 'ok' });
  assert.equal(r.hashes[0].imgbu, 'ok');
});

test('sem aux.json, confere pelo disco (manifesto, nome do diretório e SHA-512)', async (t) => {
  const dir = await secaoCompleta(t);
  const r = await conferirSecao({ dir, aux: null });
  assert.equal(r.situacao, 'completa');
  assert.equal(r.fonte, 'disco');
  assert.deepEqual(r.hashes[0].arquivos, { vota: 'ok', bu: 'ok', rdv: 'ok', log: 'ok' });
});

test('sem aux.json, arquivo exigido ausente no disco deixa a seção incompleta', async (t) => {
  const dir = await secaoCompleta(t);
  await rm(path.join(dir, hash, nomes.log));
  const r = await conferirSecao({ dir, aux: null });
  assert.equal(r.situacao, 'incompleta');
  assert.equal(r.hashes[0].arquivos.log, 'ausente');
});

test('sem aux.json, diretório cujo nome não é o hash do manifesto é divergente', async (t) => {
  const dir = await diretorioTemporario(t);
  await mkdir(path.join(dir, 'nome-errado'));
  await writeFile(path.join(dir, 'nome-errado', nomes.vota), vota);
  const r = await conferirSecao({ dir, aux: null });
  assert.equal(r.situacao, 'incompleta');
  assert.equal(r.hashes[0].arquivos.vota, 'divergente');
});

test('lista diretórios de hash que não constam no aux', async (t) => {
  const dir = await secaoCompleta(t);
  await mkdir(path.join(dir, 'outrohash'));
  assert.deepEqual(await hashesForaDoAux(dir, aux), ['outrohash']);
});
