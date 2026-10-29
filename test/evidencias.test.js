import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { acrescentar, indexarUf, verificarCadeia } from '../src/evidencias.js';
import { diretorioTemporario } from './auxiliares.js';

async function montarUf(base) {
  // seção com duas cópias do mesmo pacote (zip + por seção) e seção com pacote incompleto
  const s1 = path.join(base, '01007', '0009', '0002');
  for (const h of ['aa', 'bb']) {
    await mkdir(path.join(s1, h), { recursive: true });
    await writeFile(path.join(s1, h, 'o03221ac0100700090002-vota.vsc'), 'vsc-1');
    await writeFile(path.join(s1, h, 'o03221ac0100700090002-bu.dat'), 'bu-1');
  }
  await writeFile(path.join(s1, 'aux.json'), '{"st":"Totalizada"}');
  const s2 = path.join(base, '01007', '0009', '0001', 'cc');
  await mkdir(s2, { recursive: true });
  await writeFile(path.join(s2, 'o03221ac0100700090001-vota.vsc'), 'vsc-2');
}

test('índice é determinístico, ordenado e não repete cópias idênticas do mesmo pacote', async (t) => {
  const dir = await diretorioTemporario(t);
  await montarUf(dir);
  const a = await indexarUf(dir);
  const b = await indexarUf(dir);
  assert.equal(a.conteudo, b.conteudo);
  const linhas = a.conteudo.trim().split('\n');
  assert.match(linhas[0], /^# municipio\tzona\tsecao\tsha256_vota_vsc/);
  assert.equal(a.pacotes, 2);
  assert.deepEqual(linhas.slice(1).map((l) => l.split('\t').slice(0, 3).join('/')), ['01007/0009/0001', '01007/0009/0002']);
  const [, , , vsc, bu, rdv, , , aux] = linhas[1].split('\t');
  assert.equal(vsc.length, 64);
  assert.equal(bu, '-'); // seção 0001 não tem bu.dat
  assert.equal(rdv, '-');
  assert.equal(aux, '-'); // nem aux.json
});

test('índice muda quando um arquivo de dados muda', async (t) => {
  const dir = await diretorioTemporario(t);
  await montarUf(dir);
  const antes = await indexarUf(dir);
  await writeFile(path.join(dir, '01007', '0009', '0001', 'cc', 'o03221ac0100700090001-vota.vsc'), 'vsc-2-alterado');
  assert.notEqual((await indexarUf(dir)).conteudo, antes.conteudo);
});

test('cadeia: entradas encadeadas, âncora = hash da última, verificação passa', async (t) => {
  const dir = await diretorioTemporario(t);
  await acrescentar(dir, { tipo: 'teste', n: 1 });
  const { hash } = await acrescentar(dir, { tipo: 'teste', n: 2 });
  const r = await verificarCadeia(dir, dir);
  assert.equal(r.ok, true);
  assert.equal(r.entradas, 2);
  assert.equal(r.ultimoHash, hash);
  assert.equal((await readFile(path.join(dir, 'ancora.txt'), 'utf8')).split('\n')[0], hash);
});

test('cadeia: alterar uma entrada antiga é detectado', async (t) => {
  const dir = await diretorioTemporario(t);
  await acrescentar(dir, { tipo: 'teste', resultado: '0 falhas' });
  await acrescentar(dir, { tipo: 'teste', n: 2 });
  const arquivo = path.join(dir, 'cadeia.jsonl');
  await writeFile(arquivo, (await readFile(arquivo, 'utf8')).replace('0 falhas', '1 falha'));
  const r = await verificarCadeia(dir, dir);
  assert.equal(r.ok, false);
  assert.ok(r.erros.some((e) => /cadeia quebrada/.test(e)));
});

test('cadeia: arquivo registrado que mudou depois é detectado; ausente é listado à parte', async (t) => {
  const dir = await diretorioTemporario(t);
  await writeFile(path.join(dir, 'saida.txt'), 'RESUMO: 0 falhas');
  const sha = (await import('node:crypto')).createHash('sha256').update('RESUMO: 0 falhas').digest('hex');
  await acrescentar(dir, { tipo: 'execucao', arquivos: [{ caminho: 'saida.txt', sha256: sha }, { caminho: 'fora-do-git.txt', sha256: sha }] });
  assert.equal((await verificarCadeia(dir, dir)).ok, true);
  assert.equal((await verificarCadeia(dir, dir)).ausentes.length, 1);
  await writeFile(path.join(dir, 'saida.txt'), 'RESUMO: 3 falhas');
  const r = await verificarCadeia(dir, dir);
  assert.equal(r.ok, false);
  assert.ok(r.erros.some((e) => /mudou depois de registrado/.test(e)));
});
