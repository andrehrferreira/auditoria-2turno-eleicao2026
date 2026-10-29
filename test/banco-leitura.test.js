import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { abrirLeitura, copiasAntigas, publicarLeitura } from '../src/banco-leitura.js';
import { diretorioTemporario } from './auxiliares.js';

function primarioDeTeste(dir) {
  const arquivo = path.join(dir, 'primario.sqlite');
  const db = new DatabaseSync(arquivo);
  db.exec(`PRAGMA journal_mode = WAL;
    CREATE TABLE carga (turno INTEGER, uf TEXT);
    CREATE TABLE secao (turno INTEGER, uf TEXT, n INTEGER);
    INSERT INTO carga VALUES (2, 'ac'), (2, 'al');
    INSERT INTO secao VALUES (2, 'ac', 1), (2, 'al', 2);`);
  return { arquivo, db };
}

test('a cópia publicada não vê escritas posteriores no primário e abre como imutável', async (t) => {
  const dir = await diretorioTemporario(t);
  const { arquivo, db } = primarioDeTeste(dir);
  const leitura = path.join(dir, 'leitura');
  const info = await publicarLeitura({ primario: arquivo, dir: leitura, agora: new Date('2026-10-29T06:30:00Z') });
  assert.equal(info.arquivo, 'eleicao2026-20261029T063000.sqlite');
  assert.deepEqual(info.cargas, [{ turno: 2, ufs: 2 }]);

  db.exec("INSERT INTO secao VALUES (2, 'am', 3)");
  const { db: copia, fonte, ponteiro } = await abrirLeitura({ dir: leitura, primario: arquivo });
  try {
    assert.equal(path.basename(fonte), info.arquivo);
    assert.equal(ponteiro.arquivo, info.arquivo);
    assert.equal(copia.prepare('SELECT COUNT(*) AS n FROM secao').get().n, 2);
    assert.throws(() => copia.exec("INSERT INTO secao VALUES (2, 'x', 9)"), /readonly|read-only|attempt to write/i);
  } finally {
    // Fechar antes da limpeza do diretório: no Windows, arquivo aberto não pode ser apagado.
    copia.close();
    db.close();
  }
});

test('nova publicação vira a vigente; a anterior aparece como antiga e só sai se pedirem', async (t) => {
  const dir = await diretorioTemporario(t);
  const { arquivo, db } = primarioDeTeste(dir);
  const leitura = path.join(dir, 'leitura');
  const primeira = await publicarLeitura({ primario: arquivo, dir: leitura, agora: new Date('2026-10-29T06:00:00Z') });
  db.exec("INSERT INTO carga VALUES (1, 'ac')");
  db.close();
  const segunda = await publicarLeitura({ primario: arquivo, dir: leitura, agora: new Date('2026-10-29T07:00:00Z') });
  const ponteiro = JSON.parse(await readFile(path.join(leitura, 'atual.json'), 'utf8'));
  assert.equal(ponteiro.arquivo, segunda.arquivo);
  assert.deepEqual(ponteiro.cargas, [{ turno: 1, ufs: 1 }, { turno: 2, ufs: 2 }]);

  assert.deepEqual(await copiasAntigas(leitura), [{ nome: primeira.arquivo, removida: false }]);
  assert.deepEqual(await copiasAntigas(leitura, { remover: true }), [{ nome: primeira.arquivo, removida: true }]);
  assert.deepEqual(await copiasAntigas(leitura), []);
});

test('a cópia ganha os índices analíticos e as estatísticas; presidente usa o índice parcial', async (t) => {
  const dir = await diretorioTemporario(t);
  const arquivo = path.join(dir, 'primario.sqlite');
  const db = new DatabaseSync(arquivo);
  db.exec(`CREATE TABLE carga (turno INTEGER, uf TEXT);
    CREATE TABLE voto_bu (turno INTEGER, uf TEXT, municipio TEXT, zona TEXT, secao TEXT, eleicao INTEGER, cargo INTEGER,
      tipo_voto TEXT, partido INTEGER, numero INTEGER, quantidade INTEGER);
    CREATE INDEX voto_bu_secao ON voto_bu (turno, uf, municipio, zona, secao);`);
  const inserir = db.prepare('INSERT INTO voto_bu VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (let s = 1; s <= 200; s++) {
    for (const cargo of [1, 3, 5, 6, 7]) inserir.run(1, 'ac', '01007', '0009', String(s).padStart(4, '0'), 6257, cargo, 'nominal', 13, 13, s % 7);
  }
  db.close();
  const leitura = path.join(dir, 'leitura');
  const info = await publicarLeitura({ primario: arquivo, dir: leitura });
  // Só os índices das tabelas existentes; voto_oficial, secao_eleicao e secao_agregada não existem neste banco.
  assert.deepEqual(info.indices, ['leitura_voto_bu_presidente', 'leitura_voto_bu_cargo_numero']);

  const { db: copia } = await abrirLeitura({ dir: leitura, primario: arquivo });
  try {
    const plano = copia.prepare('EXPLAIN QUERY PLAN SELECT uf, municipio, zona, secao, SUM(quantidade) FROM voto_bu WHERE turno = 1 AND cargo = 1 GROUP BY uf, municipio, zona, secao')
      .all().map((r) => r.detail).join(' | ');
    assert.match(plano, /COVERING INDEX leitura_voto_bu_presidente/);
    assert.ok(copia.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'sqlite_stat1'").get().n === 1);
    assert.equal(copia.prepare('SELECT SUM(quantidade) AS n FROM voto_bu WHERE turno = 1 AND cargo = 1').get().n, Array.from({ length: 200 }, (_, i) => (i + 1) % 7).reduce((a, b) => a + b, 0));
  } finally {
    copia.close();
  }
});

test('sem cópia publicada, cai no primário só leitura e avisa', async (t) => {
  const dir = await diretorioTemporario(t);
  const { arquivo, db } = primarioDeTeste(dir);
  db.close();
  const avisos = [];
  const { db: leitura, ponteiro } = await abrirLeitura({ dir: path.join(dir, 'nao-existe'), primario: arquivo, aoAvisar: (m) => avisos.push(m) });
  try {
    assert.equal(ponteiro, null);
    assert.equal(leitura.prepare('SELECT COUNT(*) AS n FROM secao').get().n, 2);
    assert.equal(avisos.length, 1);
  } finally {
    leitura.close();
  }
});
