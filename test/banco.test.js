import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { abrirBanco, carregarReferenciaNoBanco, carregarUf } from '../src/banco.js';
import { carregarReferencia } from '../src/referencia.js';
import { hashDiretorio } from '../src/vsc.js';

// Árvore mínima no layout de data/ montada com as fixtures reais:
//   AC 01007/0009/0002 contingência (BU + vota.vsc, sem aux.json) + diretório órfão com nome antigo
//   AC 01007/0009/0003 (aux.json; pacote só com RDV) + diretório de outra seção fora do aux
//   AC 01007/0009/0005 no índice, sem nada no disco; 0006 agregada à 0003
//   ZZ 29173/0001/0494 Sistema de Apuração (busa, rdv, sa.vsc) e ZZ 29629/0001/3014 "Nao instalada"
const fixture = (relativo) => fileURLToPath(new URL(`./fixtures/${relativo}`, import.meta.url));
const CONTINGENCIA = 'lacres/ac-01007-0009-0002-contingencia/o03221ac0100700090002';
const RDV_0003 = 'exportar/ac-01007-0009-0003/o03221ac0100700090003-rdv.dat';
const SA = 'exportar/zz-29173-0001-0494-sa/o03221zz2917300010494';
const ES = 'lacres/es-57037-0055-0372/o03221es5703700550372';

const json = (caminho, valor) => mkdir(path.dirname(caminho), { recursive: true }).then(() => writeFile(caminho, JSON.stringify(valor)));
async function copiar(destinoDir, origens) {
  await mkdir(destinoDir, { recursive: true });
  for (const [origem, nome] of origens) await copyFile(fixture(origem), path.join(destinoDir, nome));
}
const auxCom = (hash, st, arq) => ({ st, hashes: [{ hash, dr: '25/10/2026', hr: '19:57:34', st: 'Totalizado', arq }] });
const cs = (uf, municipios) => ({ abr: [{ cd: uf, mu: municipios }] });

async function montarTurno(dados, turno, pleito) {
  const raw = path.join(dados, 'raw', `${turno}t`);
  const urnas = path.join(raw, 'urnas');
  await json(path.join(raw, 'config', `ac-p00${pleito}-cs.json`), cs('ac', [{
    cd: '01007', nm: 'BUJARI', zon: [{ cd: '0009', sec: [{ ns: '0002' }, { ns: '0003', nsa: ['0006'] }, { ns: '0005' }, { ns: '0006', nsp: '0003' }] }],
  }]));
  await json(path.join(raw, 'config', `zz-p00${pleito}-cs.json`), cs('zz', [
    { cd: '29173', nm: 'CIDADE FICTÍCIA A', zon: [{ cd: '0001', sec: [{ ns: '0494' }] }] },
    { cd: '29629', nm: 'CIDADE FICTÍCIA B', zon: [{ cd: '0001', sec: [{ ns: '3014' }] }] },
  ]));

  const vscContingencia = await readFile(fixture(`${CONTINGENCIA}-vota.vsc`));
  const arquivos0002 = [[`${CONTINGENCIA}-bu.dat`, 'o03221ac0100700090002-bu.dat'], [`${CONTINGENCIA}-vota.vsc`, 'o03221ac0100700090002-vota.vsc']];
  const dir0002 = path.join(urnas, 'ac', '01007', '0009', '0002');
  await copiar(path.join(dir0002, hashDiretorio(vscContingencia)), arquivos0002);
  await copiar(path.join(dir0002, 'orfao-nome-antigo'), arquivos0002);

  const dir0003 = path.join(urnas, 'ac', '01007', '0009', '0003');
  await copiar(path.join(dir0003, 'aaaa'), [[RDV_0003, 'o03221ac0100700090003-rdv.dat']]);
  await copiar(path.join(dir0003, 'bbbb'), [[`${ES}-bu.dat`, 'o03221ac0100700090003-bu.dat'], [`${ES}-vota.vsc`, 'o03221ac0100700090003-vota.vsc']]);
  await json(path.join(dir0003, 'aux.json'), auxCom('aaaa', 'Totalizada', [
    { nm: 'o03221ac0100700090003-rdv.dat', tp: 'rdv' }, { nm: 'o03221ac0100700090003-bu.dat', tp: 'bu' }, { nm: 'o03221ac0100700090003-vota.vsc', tp: 'vota' },
  ]));

  const dir0494 = path.join(urnas, 'zz', '29173', '0001', '0494');
  await copiar(path.join(dir0494, 'cccc'), [
    [`${SA}-busa.dat`, 'o03221zz2917300010494-busa.dat'], [`${SA}-rdv.dat`, 'o03221zz2917300010494-rdv.dat'], [`${SA}-sa.vsc`, 'o03221zz2917300010494-sa.vsc'],
  ]);
  await json(path.join(dir0494, 'aux.json'), auxCom('cccc', 'Totalizada', [
    { nm: 'o03221zz2917300010494-sa.vsc', tp: 'sa' }, { nm: 'o03221zz2917300010494-busa.dat', tp: 'busa' }, { nm: 'o03221zz2917300010494-rdv.dat', tp: 'rdv' },
  ]));
  await json(path.join(urnas, 'zz', '29629', '0001', '3014', 'aux.json'), {
    st: 'Nao instalada', hashes: [{ hash: '0', dr: '', hr: '', st: 'Sem arquivo', arq: [{ nm: '', tp: '' }] }],
  });

  const sha256Vsc = createHash('sha256').update(vscContingencia).digest('hex');
  const perfil = { turno, uf: 'ac', municipio: '01007', zona: '0009', secao: '0002', sha256Vsc, pacotesNaSecao: 2, bu: {}, log: { votosComputados: 232, jaVotou: 3, intervaloEntreVotos: { minimo: 12 }, mesarios: { registros: [{}, {}] } } };
  const dirPerfil = path.join(dados, 'parsed', `${turno}t`, 'perfil');
  await mkdir(dirPerfil, { recursive: true });
  await writeFile(path.join(dirPerfil, 'ac.jsonl'), `${JSON.stringify(perfil)}\n`);
}

async function preparar(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'auditoria-banco-'));
  let db = null;
  // Fecha o banco antes de apagar: no Windows o -shm/-wal aberto dá EBUSY; maxRetries cobre exclusão pendente.
  t.after(async () => {
    db?.close();
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  });
  const dados = path.join(dir, 'data');
  await montarTurno(dados, 2, '3221');
  // Referência fictícia mínima no formato do TSE (src/referencia.js)
  const ref = path.join(dados, 'raw', '2t', 'referencia');
  await json(path.join(ref, 'br-c0001-e006258-u.json'), {
    ele: '6258', cdabr: 'br', carg: [{ cd: '1', agr: [{ par: [
      { n: '13', sg: 'PT', cand: [{ n: '13', nmu: 'CANDIDATO TREZE', st: 'Eleito' }] },
      { n: '22', sg: 'PL', cand: [{ n: '22', nmu: 'CANDIDATO VINTE E DOIS', st: 'Não eleito' }] },
    ] }] }],
  });
  await json(path.join(ref, 'mun-e006258-cm.json'), { abr: [{ cd: 'ac', mu: [{ cd: '01007', cdi: '1200138', nm: 'BUJARI' }] }] });
  db = abrirBanco(path.join(dir, 'teste.sqlite'));
  await carregarReferenciaNoBanco(db, 2, await carregarReferencia(2, { dirDados: dados }));
  return { db, dados };
}

const linhas = (db, sql, ...p) => db.prepare(sql).all(...p).map((r) => ({ ...r }));
const um = (db, sql, ...p) => ({ ...db.prepare(sql).get(...p) });
const DA_SECAO = "turno = ? AND uf = ? AND municipio = ? AND zona = ? AND secao = ?";

test('carga do AC: situações, BU de contingência, RDV, órfãos ignorados, agregada e perfil', async (t) => {
  const { db, dados } = await preparar(t);
  const r = await carregarUf(db, { turno: '2', uf: 'ac', dirDados: dados });
  assert.deepEqual({ secoes: r.secoes, completa: r.completa, incompleta: r.incompleta, sem_pacote: r.sem_pacote, agregadas: r.agregadas, perfis: r.linhasPerfil },
    { secoes: 3, completa: 1, incompleta: 1, sem_pacote: 1, agregadas: 1, perfis: 1 });

  const s0002 = um(db, `SELECT * FROM secao WHERE ${DA_SECAO}`, 2, 'ac', '01007', '0009', '0002');
  assert.equal(s0002.situacao, 'completa');
  assert.equal(s0002.status_aux, null);
  assert.equal(s0002.pacotes, 1, 'o diretório órfão não é pacote: o nome não é hashDiretorio(vota.vsc)');
  assert.equal(s0002.tipo_urna, 'reservaSecao');
  assert.equal(s0002.comparecimento, 232);
  assert.equal(s0002.sem_biometria + s0002.por_biometria + s0002.por_biografia, 232);
  assert.match(s0002.modelo_urna, /^ue\d{4}$/);

  assert.deepEqual(linhas(db, `SELECT candidato, sigla_partido, tipo_voto, quantidade FROM v_resultado_secao WHERE ${DA_SECAO} AND cargo = 1 ORDER BY quantidade DESC`, 2, 'ac', '01007', '0009', '0002'), [
    { candidato: 'CANDIDATO VINTE E DOIS', sigla_partido: 'PL', tipo_voto: 'nominal', quantidade: 144 },
    { candidato: 'CANDIDATO TREZE', sigla_partido: 'PT', tipo_voto: 'nominal', quantidade: 76 },
    { candidato: null, sigla_partido: null, tipo_voto: 'nulo', quantidade: 7 },
    { candidato: null, sigla_partido: null, tipo_voto: 'branco', quantidade: 5 },
  ]);
  const eleicoes = linhas(db, `SELECT eleicao, aptos, comparecimento_majoritario FROM secao_eleicao WHERE ${DA_SECAO} ORDER BY eleicao`, 2, 'ac', '01007', '0009', '0002');
  assert.deepEqual(eleicoes.map((e) => e.eleicao), [6258, 6260]);
  assert.ok(eleicoes.every((e) => e.comparecimento_majoritario === 232 && e.aptos >= 232));

  // 0003: aux lista só o pacote "aaaa" (só RDV); o diretório "bbbb" (BU de outra seção) fica de fora
  const s0003 = um(db, `SELECT situacao, status_aux, status_pacote, hash, recebido_tse FROM secao WHERE ${DA_SECAO}`, 2, 'ac', '01007', '0009', '0003');
  assert.deepEqual(s0003, { situacao: 'incompleta', status_aux: 'Totalizada', status_pacote: 'Totalizado', hash: 'aaaa', recebido_tse: '25/10/2026 19:57:34' });
  assert.deepEqual(linhas(db, `SELECT digitacao, quantidade FROM voto_rdv WHERE ${DA_SECAO} AND cargo = 1 AND tipo_voto = 'nominal' ORDER BY digitacao`, 2, 'ac', '01007', '0009', '0003'),
    [{ digitacao: '13', quantidade: 81 }, { digitacao: '22', quantidade: 146 }]);
  assert.equal(um(db, `SELECT SUM(quantidade) n FROM voto_rdv WHERE ${DA_SECAO} AND cargo = 1`, 2, 'ac', '01007', '0009', '0003').n, 241);
  assert.deepEqual(linhas(db, 'SELECT secao, etapa, mensagem FROM erro_carga'), [{ secao: '0003', etapa: 'bu', mensagem: 'pacote sem BU no disco' }]);

  assert.equal(um(db, `SELECT situacao FROM secao WHERE ${DA_SECAO}`, 2, 'ac', '01007', '0009', '0005').situacao, 'sem_pacote');
  assert.deepEqual(linhas(db, 'SELECT secao, secao_principal FROM secao_agregada'), [{ secao: '0006', secao_principal: '0003' }]);
  assert.equal(um(db, "SELECT COUNT(*) n FROM secao WHERE secao = '0006'").n, 0);

  const perfil = um(db, 'SELECT hash, votos_computados, ja_votou, intervalo_minimo_entre_votos, mesarios_registrados, json_extract(dados, \'$.pacotesNaSecao\') p FROM perfil_log');
  assert.deepEqual(perfil, { hash: s0002.hash, votos_computados: 232, ja_votou: 3, intervalo_minimo_entre_votos: 12, mesarios_registrados: 2, p: 2 });
  assert.deepEqual(um(db, 'SELECT codigo, nome, codigo_ibge FROM municipio WHERE codigo = ?', '01007'), { codigo: '01007', nome: 'BUJARI', codigo_ibge: '1200138' });
});

test('carga do ZZ: Sistema de Apuração (busa, eleicoesSA) e seção não instalada', async (t) => {
  const { db, dados } = await preparar(t);
  const r = await carregarUf(db, { turno: '2', uf: 'zz', dirDados: dados });
  assert.equal(r.erros, 0);
  const sa = um(db, `SELECT situacao, tipo_arquivo, comparecimento, junta_apuradora, turma_apuradora, abertura, modelo_urna FROM secao WHERE ${DA_SECAO}`, 2, 'zz', '29173', '0001', '0494');
  assert.deepEqual(sa, { situacao: 'completa', tipo_arquivo: 'saManual', comparecimento: 0, junta_apuradora: 1, turma_apuradora: 1, abertura: null, modelo_urna: 'ue2015' });
  assert.deepEqual(linhas(db, `SELECT numero, quantidade FROM voto_bu WHERE ${DA_SECAO} ORDER BY numero`, 2, 'zz', '29173', '0001', '0494'),
    [{ numero: 13, quantidade: 1 }, { numero: 22, quantidade: 12 }]);
  assert.deepEqual(linhas(db, `SELECT digitacao, quantidade FROM voto_rdv WHERE ${DA_SECAO} ORDER BY digitacao`, 2, 'zz', '29173', '0001', '0494'),
    [{ digitacao: '13', quantidade: 1 }, { digitacao: '22', quantidade: 12 }]);
  assert.deepEqual(um(db, `SELECT situacao, status_aux, hash, pacotes FROM secao WHERE ${DA_SECAO}`, 2, 'zz', '29629', '0001', '3014'),
    { situacao: 'sem_arquivo', status_aux: 'Nao instalada', hash: null, pacotes: 0 });
  assert.deepEqual(um(db, "SELECT nome FROM municipio WHERE codigo = '29173'"), { nome: 'CIDADE FICTÍCIA A' });
});

test('carga é idempotente por (turno, UF) e não mexe nas outras UFs', async (t) => {
  const { db, dados } = await preparar(t);
  const contar = () => um(db, `SELECT
    (SELECT COUNT(*) FROM secao) secao, (SELECT COUNT(*) FROM voto_bu) bu, (SELECT COUNT(*) FROM voto_rdv) rdv, (SELECT COUNT(*) FROM secao_eleicao) eleicao,
    (SELECT COUNT(*) FROM secao_agregada) agregada, (SELECT COUNT(*) FROM perfil_log) perfil, (SELECT COUNT(*) FROM erro_carga) erro, (SELECT COUNT(*) FROM carga) carga`);
  await carregarUf(db, { turno: '2', uf: 'ac', dirDados: dados });
  await carregarUf(db, { turno: '2', uf: 'zz', dirDados: dados });
  const antes = contar();
  await carregarUf(db, { turno: '2', uf: 'ac', dirDados: dados });
  assert.deepEqual(contar(), antes);
  assert.deepEqual(antes, { secao: 5, bu: 10, rdv: antes.rdv, eleicao: 3, agregada: 1, perfil: 1, erro: 1, carga: 2 });
  assert.ok(antes.rdv > 0);
});

test('views: resultado por município e comparação 1º × 2º turno de presidente', async (t) => {
  const { db, dados } = await preparar(t);
  await carregarUf(db, { turno: '2', uf: 'ac', dirDados: dados });
  assert.equal(linhas(db, 'SELECT * FROM v_presidente_1t_2t').length, 0, 'sem 1º turno a view fica vazia');
  assert.deepEqual(linhas(db, "SELECT numero, candidato, secoes, votos FROM v_resultado_municipio WHERE turno = 2 AND municipio = '01007' AND cargo = 1 AND tipo_voto = 'nominal' ORDER BY numero"), [
    { numero: 13, candidato: 'CANDIDATO TREZE', secoes: 1, votos: 76 },
    { numero: 22, candidato: 'CANDIDATO VINTE E DOIS', secoes: 1, votos: 144 },
  ]);

  // "1º turno" fictício com os mesmos arquivos: a view casa a seção e soma por turno
  await montarTurno(dados, 1, '3220');
  await carregarUf(db, { turno: '1', uf: 'ac', dirDados: dados });
  assert.deepEqual(linhas(db, "SELECT secao, tipo_voto, numero, candidato, votos_1t, votos_2t FROM v_presidente_1t_2t WHERE tipo_voto = 'nominal' ORDER BY numero"), [
    { secao: '0002', tipo_voto: 'nominal', numero: 13, candidato: 'CANDIDATO TREZE', votos_1t: 76, votos_2t: 76 },
    { secao: '0002', tipo_voto: 'nominal', numero: 22, candidato: 'CANDIDATO VINTE E DOIS', votos_1t: 144, votos_2t: 144 },
  ]);
  const s = um(db, 'SELECT * FROM v_presidente_1t_2t_secao');
  assert.equal(s.secao, '0002');
  assert.equal(s.nome_municipio, 'BUJARI');
  assert.deepEqual([s.comparecimento_1t, s.comparecimento_2t, s.nominal_1t, s.branco_2t, s.nulo_2t], [232, 232, 220, 5, 7]);
  assert.ok(s.aptos_1t >= 232 && s.aptos_1t === s.aptos_2t);
});
