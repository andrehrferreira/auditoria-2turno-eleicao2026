import { createReadStream } from 'node:fs';
import { mkdir, open, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DatabaseSync } from 'node:sqlite';
import { parseArgs } from 'node:util';
import { createInflateRaw } from 'node:zlib';
import { decodificarArquivo } from './asn1.js';
import { DIR_DADOS, TURNOS, UFS, caminhos, dirSecao } from './config.js';
import { CARGO_CONSTITUCIONAL, arquivoBu, arquivoRdv, arquivoVsc } from './esquemas.js';
import { emParalelo } from './http.js';
import { montarSecoes } from './indice.js';
import { acharArquivo } from './lacres.js';
import { carregarReferencia } from './referencia.js';
import { criarProgresso } from './registro.js';
import { hashDiretorio } from './vsc.js';
import { listarEntradas } from './zip.js';

// Carrega BUs, RDVs, índice de seções, referência e perfis de log (src/perfil-secoes.js) num SQLite único para os
// dois turnos (doc 09). Carga idempotente por (turno, UF): apaga e insere de novo numa transação.
// Fonte da verdade continua sendo o binário: o banco é um índice para consulta (SQL/LLM).

export const BANCO_PADRAO = path.join(DIR_DADOS, 'db', 'eleicao2026.sqlite');
// Dados abertos do TSE: votos por seção dos dois turnos (NR_VOTAVEL 95 = branco, 96 = nulo).
export const ZIP_OFICIAL = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'votacao_secao', 'votacao_secao_2026_BR.zip');
const CODIGO_CARGO = Object.fromEntries(Object.entries(CARGO_CONSTITUCIONAL).map(([codigo, nome]) => [nome, Number(codigo)]));
const codigoDoCargo = (c) => (c?.cargoConstitucional ? CODIGO_CARGO[c.cargoConstitucional] : c?.numeroCargoConsultaLivre) ?? null;
const CHAVE = 'turno INTEGER NOT NULL, uf TEXT NOT NULL, municipio TEXT NOT NULL, zona TEXT NOT NULL, secao TEXT NOT NULL';
const MESMA_SECAO = (a, b) => `${a}.uf = ${b}.uf AND ${a}.municipio = ${b}.municipio AND ${a}.zona = ${b}.zona AND ${a}.secao = ${b}.secao`;

// Números do perfil promovidos a coluna (o resto fica em `dados`, para json_extract).
const COLUNAS_PERFIL = {
  logs_no_pacote: 'logsNoPacote', modelo_urna_log: 'modeloUrna',
  urna_pronta_s: 'urnaPronta', inicio_encerramento_s: 'inicioEncerramento', primeiro_voto_s: 'primeiroVoto', ultimo_voto_s: 'ultimoVoto',
  votos_computados: 'votosComputados', votos_fora_da_janela: 'votosForaDaJanela',
  habilitados_biometria: 'habilitadosBiometria', ano_nascimento_sem_biometria: 'anoNascimentoSemBiometria',
  dado_pessoal_confere: 'dadoPessoalConfere', habilitados_pelo_mesario: 'habilitadosPeloMesario',
  ja_votou: 'jaVotou', eleitor_nao_encontrado: 'eleitorNaoEncontrado', impedidos: 'impedidos', suspensos_pelo_mesario: 'suspensosPeloMesario',
  reinicios_durante_votacao: 'reiniciosDuranteVotacao', erros: 'erros', alertas: 'alertas',
  maior_rajada_sem_biometria_10min: 'maiorRajadaSemBiometria10min', sem_biometria_ultima_hora: 'semBiometriaUltimaHora',
};

const ESQUEMA = `
CREATE TABLE IF NOT EXISTS municipio (
  codigo TEXT PRIMARY KEY, uf TEXT NOT NULL, nome TEXT NOT NULL, codigo_ibge TEXT
);
CREATE TABLE IF NOT EXISTS cargo (codigo INTEGER PRIMARY KEY, nome TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS candidato (
  turno INTEGER NOT NULL, eleicao INTEGER NOT NULL, cargo INTEGER NOT NULL, abrangencia TEXT NOT NULL, numero INTEGER NOT NULL,
  nome TEXT, partido INTEGER, sigla_partido TEXT, situacao TEXT,
  PRIMARY KEY (turno, eleicao, cargo, abrangencia, numero)
);
CREATE INDEX IF NOT EXISTS candidato_partido ON candidato (turno, partido);
CREATE TABLE IF NOT EXISTS secao (
  ${CHAVE},
  local INTEGER,
  situacao TEXT NOT NULL,
  no_indice INTEGER NOT NULL,
  status_aux TEXT, status_pacote TEXT, recebido_tse TEXT,
  hash TEXT, pacotes INTEGER NOT NULL,
  tipo_urna TEXT, tipo_arquivo TEXT, modelo_urna TEXT, numero_interno_urna INTEGER, versao_software TEXT,
  data_hora_carga TEXT, codigo_carga TEXT, abertura TEXT, encerramento TEXT, emissao TEXT,
  comparecimento INTEGER, sem_biometria INTEGER, por_biometria INTEGER, por_biografia INTEGER,
  junta_apuradora INTEGER, turma_apuradora INTEGER,
  PRIMARY KEY (turno, uf, municipio, zona, secao)
);
CREATE INDEX IF NOT EXISTS secao_municipio ON secao (municipio, turno);
CREATE TABLE IF NOT EXISTS secao_agregada (
  ${CHAVE}, secao_principal TEXT NOT NULL,
  PRIMARY KEY (turno, uf, municipio, zona, secao)
);
CREATE TABLE IF NOT EXISTS secao_eleicao (
  ${CHAVE}, eleicao INTEGER NOT NULL,
  aptos INTEGER, aptos_secao INTEGER, aptos_tte INTEGER, comparecimento_majoritario INTEGER, comparecimento_proporcional INTEGER,
  PRIMARY KEY (turno, uf, municipio, zona, secao, eleicao)
);
CREATE TABLE IF NOT EXISTS voto_bu (
  ${CHAVE}, eleicao INTEGER NOT NULL, cargo INTEGER, tipo_voto TEXT NOT NULL, partido INTEGER, numero INTEGER, quantidade INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS voto_bu_secao ON voto_bu (turno, uf, municipio, zona, secao);
CREATE INDEX IF NOT EXISTS voto_bu_candidato ON voto_bu (turno, eleicao, cargo, numero);
CREATE TABLE IF NOT EXISTS voto_rdv (
  ${CHAVE}, eleicao INTEGER NOT NULL, cargo INTEGER, tipo_voto TEXT NOT NULL, digitacao TEXT, quantidade INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS voto_rdv_secao ON voto_rdv (turno, uf, municipio, zona, secao);
CREATE TABLE IF NOT EXISTS perfil_log (
  ${CHAVE}, hash TEXT NOT NULL, sha256_vsc TEXT NOT NULL,
  ${Object.keys(COLUNAS_PERFIL).map((c) => `${c} ${c === 'modelo_urna_log' ? 'TEXT' : 'INTEGER'}`).join(', ')},
  intervalo_minimo_entre_votos INTEGER, tempo_minimo_habilitacao_voto INTEGER, mesarios_registrados INTEGER,
  dados TEXT NOT NULL,
  PRIMARY KEY (turno, uf, municipio, zona, secao, hash)
);
CREATE TABLE IF NOT EXISTS carga (
  turno INTEGER NOT NULL, uf TEXT NOT NULL, carregado_em TEXT NOT NULL, duracao_ms INTEGER NOT NULL, origem TEXT NOT NULL,
  secoes INTEGER NOT NULL, completas INTEGER NOT NULL, incompletas INTEGER NOT NULL, sem_arquivo INTEGER NOT NULL, sem_pacote INTEGER NOT NULL,
  agregadas INTEGER NOT NULL, linhas_perfil INTEGER NOT NULL, erros INTEGER NOT NULL,
  PRIMARY KEY (turno, uf)
);
CREATE TABLE IF NOT EXISTS erro_carga (
  turno INTEGER NOT NULL, uf TEXT NOT NULL, municipio TEXT, zona TEXT, secao TEXT, hash TEXT, etapa TEXT NOT NULL, mensagem TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS erro_carga_uf ON erro_carga (turno, uf);
CREATE TABLE IF NOT EXISTS voto_oficial (
  ${CHAVE}, eleicao INTEGER NOT NULL, cargo INTEGER NOT NULL, numero INTEGER NOT NULL, quantidade INTEGER NOT NULL,
  PRIMARY KEY (turno, uf, municipio, zona, secao, cargo, numero)
);
CREATE INDEX IF NOT EXISTS voto_oficial_cargo ON voto_oficial (turno, uf, cargo);
CREATE TABLE IF NOT EXISTS carga_oficial (
  turno INTEGER NOT NULL, uf TEXT NOT NULL, carregado_em TEXT NOT NULL, origem TEXT NOT NULL, data_geracao TEXT, linhas INTEGER NOT NULL,
  PRIMARY KEY (turno, uf)
);

DROP VIEW IF EXISTS v_resultado_secao;
CREATE VIEW v_resultado_secao AS
SELECT v.turno, v.uf, v.municipio, m.nome AS nome_municipio, v.zona, v.secao, v.eleicao, v.cargo, cg.nome AS nome_cargo,
  v.tipo_voto, v.partido,
  COALESCE(cu.sigla_partido, cb.sigla_partido,
    (SELECT p.sigla_partido FROM candidato p WHERE p.turno = v.turno AND p.partido = v.partido LIMIT 1)) AS sigla_partido,
  v.numero, COALESCE(cu.nome, cb.nome) AS candidato, v.quantidade
FROM voto_bu v
LEFT JOIN municipio m ON m.codigo = v.municipio
LEFT JOIN cargo cg ON cg.codigo = v.cargo
LEFT JOIN candidato cu ON v.tipo_voto = 'nominal' AND cu.turno = v.turno AND cu.eleicao = v.eleicao AND cu.cargo = v.cargo
  AND cu.abrangencia = v.uf AND cu.numero = v.numero
LEFT JOIN candidato cb ON v.tipo_voto = 'nominal' AND cb.turno = v.turno AND cb.eleicao = v.eleicao AND cb.cargo = v.cargo
  AND cb.abrangencia = 'br' AND cb.numero = v.numero;

DROP VIEW IF EXISTS v_resultado_municipio;
CREATE VIEW v_resultado_municipio AS
SELECT turno, uf, municipio, nome_municipio, eleicao, cargo, nome_cargo, tipo_voto, partido, sigla_partido, numero, candidato,
  COUNT(*) AS secoes, SUM(quantidade) AS votos
FROM v_resultado_secao
GROUP BY turno, uf, municipio, eleicao, cargo, tipo_voto, partido, numero;

DROP VIEW IF EXISTS v_presidente_1t_2t;
CREATE VIEW v_presidente_1t_2t AS
SELECT v.uf, v.municipio, v.nome_municipio, v.zona, v.secao, v.tipo_voto, v.numero, MAX(v.candidato) AS candidato,
  SUM(CASE WHEN v.turno = 1 THEN v.quantidade ELSE 0 END) AS votos_1t,
  SUM(CASE WHEN v.turno = 2 THEN v.quantidade ELSE 0 END) AS votos_2t
FROM v_resultado_secao v
WHERE v.cargo = 1
  AND EXISTS (SELECT 1 FROM secao a WHERE a.turno = 1 AND ${MESMA_SECAO('a', 'v')} AND a.situacao = 'completa')
  AND EXISTS (SELECT 1 FROM secao b WHERE b.turno = 2 AND ${MESMA_SECAO('b', 'v')} AND b.situacao = 'completa')
GROUP BY v.uf, v.municipio, v.zona, v.secao, v.tipo_voto, v.numero;

DROP VIEW IF EXISTS v_presidente_1t_2t_secao;
CREATE VIEW v_presidente_1t_2t_secao AS
SELECT s2.uf, s2.municipio, m.nome AS nome_municipio, s2.zona, s2.secao,
  s1.tipo_urna AS tipo_urna_1t, s2.tipo_urna AS tipo_urna_2t,
  s1.numero_interno_urna AS urna_1t, s2.numero_interno_urna AS urna_2t,
  ${['1', '2'].map((t) => `
  (SELECT e.aptos FROM secao_eleicao e WHERE e.turno = s${t}.turno AND ${MESMA_SECAO('e', `s${t}`)}
    AND e.eleicao = (SELECT b.eleicao FROM voto_bu b WHERE b.turno = s${t}.turno AND ${MESMA_SECAO('b', `s${t}`)} AND b.cargo = 1 LIMIT 1)) AS aptos_${t}t,
  s${t}.comparecimento AS comparecimento_${t}t, s${t}.sem_biometria AS sem_biometria_${t}t, s${t}.por_biografia AS por_biografia_${t}t,
  ${['nominal', 'branco', 'nulo'].map((tipo) => `(SELECT SUM(b.quantidade) FROM voto_bu b WHERE b.turno = s${t}.turno AND ${MESMA_SECAO('b', `s${t}`)}
    AND b.cargo = 1 AND b.tipo_voto = '${tipo}') AS ${tipo}_${t}t`).join(',\n  ')}`).join(',')}
FROM secao s1
JOIN secao s2 ON s2.turno = 2 AND ${MESMA_SECAO('s2', 's1')}
LEFT JOIN municipio m ON m.codigo = s2.municipio
WHERE s1.turno = 1 AND s1.situacao = 'completa' AND s2.situacao = 'completa';

DROP VIEW IF EXISTS v_divergencia_bu_oficial;
CREATE VIEW v_divergencia_bu_oficial AS
WITH bu AS (
  SELECT turno, uf, municipio, zona, secao, cargo,
    CASE tipo_voto WHEN 'branco' THEN 95 WHEN 'nulo' THEN 96 ELSE numero END AS numero, SUM(quantidade) AS quantidade
  FROM voto_bu v
  -- só UFs e cargos presentes no oficial carregado (o votacao_secao_2026_BR traz só presidente)
  WHERE EXISTS (SELECT 1 FROM voto_oficial o WHERE o.turno = v.turno AND o.uf = v.uf AND o.cargo = v.cargo)
  GROUP BY turno, uf, municipio, zona, secao, cargo, 7
)
SELECT COALESCE(b.turno, o.turno) AS turno, COALESCE(b.uf, o.uf) AS uf, COALESCE(b.municipio, o.municipio) AS municipio,
  COALESCE(b.zona, o.zona) AS zona, COALESCE(b.secao, o.secao) AS secao, COALESCE(b.cargo, o.cargo) AS cargo,
  COALESCE(b.numero, o.numero) AS numero, b.quantidade AS votos_bu, o.quantidade AS votos_oficial,
  (SELECT s.situacao FROM secao s WHERE s.turno = COALESCE(b.turno, o.turno) AND s.uf = COALESCE(b.uf, o.uf)
    AND s.municipio = COALESCE(b.municipio, o.municipio) AND s.zona = COALESCE(b.zona, o.zona) AND s.secao = COALESCE(b.secao, o.secao)) AS situacao_secao
FROM bu b
FULL OUTER JOIN voto_oficial o ON o.turno = b.turno AND o.uf = b.uf AND o.municipio = b.municipio AND o.zona = b.zona
  AND o.secao = b.secao AND o.cargo = b.cargo AND o.numero = b.numero
WHERE IFNULL(b.quantidade, 0) <> IFNULL(o.quantidade, 0);
`;

/** Abre (ou cria) o banco com o esquema, as views e a tabela de cargos. */
export function abrirBanco(caminho = BANCO_PADRAO) {
  const db = new DatabaseSync(caminho);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = OFF;');
  db.exec(ESQUEMA);
  const cargo = db.prepare('INSERT OR IGNORE INTO cargo (codigo, nome) VALUES (?, ?)');
  for (const [codigo, nome] of Object.entries(CARGO_CONSTITUCIONAL)) cargo.run(Number(codigo), nome);
  return db;
}

function emTransacao(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  return Promise.resolve()
    .then(fn)
    .then((r) => { db.exec('COMMIT'); return r; }, (erro) => { db.exec('ROLLBACK'); throw erro; });
}

/** Substitui candidatos do turno e acrescenta/atualiza municípios a partir da referência (src/referencia.js). */
export async function carregarReferenciaNoBanco(db, turno, referencia) {
  if (!referencia) return { candidatos: 0, municipios: 0 };
  await emTransacao(db, () => {
    db.prepare('DELETE FROM candidato WHERE turno = ?').run(Number(turno));
    const cand = db.prepare('INSERT INTO candidato VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const [chave, c] of referencia.candidatos) {
      const [eleicao, cargo, abr, numero] = chave.split('|');
      cand.run(Number(turno), Number(eleicao), Number(cargo), abr, Number(numero), c.nome ?? null, c.partido ?? null, c.siglaPartido ?? null, c.situacao ?? null);
    }
    const mun = db.prepare(`INSERT INTO municipio (codigo, uf, nome, codigo_ibge) VALUES (?, ?, ?, ?)
      ON CONFLICT (codigo) DO UPDATE SET uf = excluded.uf, nome = excluded.nome, codigo_ibge = COALESCE(excluded.codigo_ibge, codigo_ibge)`);
    for (const [codigo, m] of referencia.municipios) mun.run(codigo, m.uf, m.nome, m.ibge ?? null);
  });
  return { candidatos: referencia.candidatos.size, municipios: referencia.municipios.size };
}

async function lerOuNulo(caminho) {
  try {
    return await readFile(caminho);
  } catch (erro) {
    if (erro.code === 'ENOENT') return null;
    throw erro;
  }
}

async function subdiretorios(dir) {
  try {
    return (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  } catch (erro) {
    if (erro.code === 'ENOENT') return [];
    throw erro;
  }
}

/** Seções da UF que existem no disco (urnas/{uf}/{mun}/{zona}/{secao}). */
async function secoesNoDisco(baseUf) {
  const lista = [];
  for (const municipio of await subdiretorios(baseUf)) {
    for (const zona of await subdiretorios(path.join(baseUf, municipio))) {
      for (const secao of await subdiretorios(path.join(baseUf, municipio, zona))) lista.push({ municipio, zona, secao });
    }
  }
  return lista;
}

/**
 * Pacotes válidos de uma seção. Com aux.json, só os hashes que ele lista (ignora diretórios órfãos);
 * sem aux, só os diretórios cujo nome é hashDiretorio(manifesto). Lê vsc, BU e RDV de cada pacote.
 */
async function lerPacotes(dir, aux) {
  const candidatos = aux
    ? (aux.hashes ?? []).filter((h) => h.hash && h.hash !== '0' && (h.arq ?? []).some((a) => a.nm))
    : (await subdiretorios(dir)).map((hash) => ({ hash }));
  const pacotes = [];
  for (const h of candidatos) {
    const dirHash = path.join(dir, h.hash);
    let nomes;
    try {
      nomes = await readdir(dirHash);
    } catch (erro) {
      if (erro.code === 'ENOENT') continue;
      throw erro;
    }
    const ler = async (tipo) => {
      const nome = acharArquivo(nomes, tipo);
      return nome ? lerOuNulo(path.join(dirHash, nome)) : null;
    };
    const vsc = await ler('vsc');
    if (!aux && (!vsc || hashDiretorio(vsc) !== h.hash)) continue;
    pacotes.push({ hash: h.hash, st: h.st ?? null, recebido: h.dr ? `${h.dr} ${h.hr}` : null, vsc, bu: await ler('bu'), rdv: await ler('rdv') });
  }
  return pacotes;
}

/** Lê do disco tudo o que a seção precisa para ser inserida (sem decodificar). */
async function lerSecao(dirUrnas, uf, s) {
  const dir = dirSecao(dirUrnas, { uf, ...s });
  const textoAux = await lerOuNulo(path.join(dir, 'aux.json'));
  let aux = null;
  let erroAux = null;
  try {
    aux = textoAux ? JSON.parse(textoAux.toString('utf8')) : null;
  } catch (erro) {
    erroAux = `aux.json ilegível (${erro.message}); pacotes lidos pelo disco`;
  }
  return { aux, erroAux, pacotes: await lerPacotes(dir, aux) };
}

/** RDV agregado por (eleição, cargo, tipo de voto, digitação). Urna: eleicoesVota; Sistema de Apuração: eleicoesSA. */
function agregarRdv(rdv) {
  const total = new Map();
  for (const e of rdv.rdv.eleicoes.eleicoesVota ?? rdv.rdv.eleicoes.eleicoesSA ?? []) {
    for (const vc of e.votosCargos) {
      const cargo = codigoDoCargo(vc.idCargo);
      for (const v of vc.votos) {
        const chave = `${e.idEleicao}|${cargo}|${v.tipoVoto}|${v.digitacao ?? ''}`;
        const atual = total.get(chave) ?? { eleicao: e.idEleicao, cargo, tipoVoto: v.tipoVoto, digitacao: v.digitacao ?? null, quantidade: 0 };
        atual.quantidade++;
        total.set(chave, atual);
      }
    }
  }
  return [...total.values()];
}

const hashDoSha256 = (hex) => Buffer.from(Buffer.from(hex, 'hex').toString('base64').replaceAll('/', '-'), 'latin1').toString('hex');

function prepararInsercoes(db) {
  const n = (k) => Array(k).fill('?').join(', ');
  const colunasPerfil = [...Object.keys(COLUNAS_PERFIL), 'intervalo_minimo_entre_votos', 'tempo_minimo_habilitacao_voto', 'mesarios_registrados'];
  return {
    secao: db.prepare(`INSERT INTO secao VALUES (${n(29)})`),
    agregada: db.prepare('INSERT INTO secao_agregada VALUES (?, ?, ?, ?, ?, ?)'),
    eleicao: db.prepare(`INSERT INTO secao_eleicao VALUES (${n(11)})`),
    votoBu: db.prepare(`INSERT INTO voto_bu VALUES (${n(11)})`),
    votoRdv: db.prepare(`INSERT INTO voto_rdv VALUES (${n(10)})`),
    perfil: db.prepare(`INSERT INTO perfil_log (turno, uf, municipio, zona, secao, hash, sha256_vsc, ${colunasPerfil.join(', ')}, dados)
      VALUES (${n(8 + colunasPerfil.length)})`),
    municipio: db.prepare('INSERT INTO municipio (codigo, uf, nome) VALUES (?, ?, ?) ON CONFLICT (codigo) DO NOTHING'),
    erro: db.prepare('INSERT INTO erro_carga VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),
  };
}

/** Decodifica o pacote escolhido da seção. Erros de decodificação vão para erro_carga; o que der para ler segue. */
function decodificarSecao({ s, aux, pacotes, erroLeitura }, registrarErro) {
  const comArquivo = (aux?.hashes ?? []).some((h) => h.hash && h.hash !== '0' && (h.arq ?? []).some((a) => a.nm));
  // Mais de um pacote: usa o totalizado (ou o último listado). A quantidade fica em `pacotes`.
  const pacote = pacotes.find((p) => p.st === 'Totalizado') ?? pacotes.at(-1) ?? null;
  const d = { pacote, situacao: pacote || erroLeitura ? 'incompleta' : aux && !comArquivo ? 'sem_arquivo' : 'sem_pacote', bu: null, modelo: null, rdv: [] };
  if (!pacote) return d;
  const tentar = (etapa, fn) => {
    try {
      return fn();
    } catch (erro) {
      registrarErro(s, pacote.hash, etapa, erro.message);
      return null;
    }
  };
  if (pacote.bu) d.bu = tentar('bu', () => decodificarArquivo(arquivoBu, pacote.bu).conteudo);
  else registrarErro(s, pacote.hash, 'bu', 'pacote sem BU no disco');
  if (d.bu) d.situacao = 'completa';
  if (pacote.vsc) d.modelo = tentar('vsc', () => decodificarArquivo(arquivoVsc, pacote.vsc).equipamento?.modeloEquipamento ?? null);
  if (pacote.rdv) d.rdv = tentar('rdv', () => agregarRdv(decodificarArquivo(arquivoRdv, pacote.rdv))) ?? [];
  const id = d.bu?.identificacaoSecao;
  if (id && (id.municipioZona.municipio !== Number(s.municipio) || id.municipioZona.zona !== Number(s.zona) || id.secao !== Number(s.secao))) {
    registrarErro(s, pacote.hash, 'identificacao', `BU identifica ${id.municipioZona.municipio}/${id.municipioZona.zona}/${id.secao}`);
  }
  return d;
}

/** Insere a seção, as eleições e os votos do BU e do RDV já decodificados. */
function gravarSecao(ins, { turno, uf, s, noIndice, aux, pacotes }, { pacote, situacao, bu, modelo, rdv }) {
  const chave = [turno, uf, s.municipio, s.zona, s.secao];
  const urna = bu?.urna;
  const carga = urna?.correspondenciaResultado.carga;
  const dadosSecao = bu?.dadosSecaoSA.dadosSecao;
  const dadosSA = bu?.dadosSecaoSA.dadosSA;
  const det = bu?.detalhamentoComparecimento;
  ins.secao.run(
    ...chave, bu?.identificacaoSecao.local ?? null, situacao, noIndice ? 1 : 0,
    aux?.st ?? null, pacote?.st ?? null, pacote?.recebido ?? null, pacote?.hash ?? null, pacotes.length,
    urna?.tipoUrna ?? null, urna?.tipoArquivo ?? null, modelo, carga?.numeroInternoUrna ?? null, urna?.versaoVotacao ?? null,
    carga?.dataHoraCarga ?? null, carga?.codigoCarga ?? null, dadosSecao?.dataHoraAbertura ?? null, dadosSecao?.dataHoraEncerramento ?? null,
    bu?.dataHoraEmissao ?? null, bu?.qtdEleitoresCompareceram ?? null,
    det?.qtdEleitoresCompareceramSemBiometria ?? null, det?.qtdEleitoresHabilitadosPorBiometria ?? null, det?.qtdEleitoresHabilitadosPorBiografia ?? null,
    dadosSA?.juntaApuradora ?? null, dadosSA?.turmaApuradora ?? null,
  );
  for (const e of bu?.resultadosVotacaoPorEleicao ?? []) {
    const comparecimento = (tipo) => e.resultadosVotacao.find((r) => r.tipoCargo === tipo)?.qtdComparecimento ?? null;
    ins.eleicao.run(...chave, e.idEleicao, e.qtdEleitoresAptos, e.qtdEleitoresAptosSecao, e.qtdEleitoresAptosTTE, comparecimento('majoritario'), comparecimento('proporcional'));
    for (const rv of e.resultadosVotacao) {
      for (const tvc of rv.totaisVotosCargo) {
        const cargo = codigoDoCargo(tvc.codigoCargo);
        for (const v of tvc.votosVotaveis) {
          const id = v.identificacaoVotavel;
          ins.votoBu.run(...chave, e.idEleicao, cargo, v.tipoVoto, id?.partido ?? null, id?.codigo ?? null, v.quantidadeVotos);
        }
      }
    }
  }
  for (const r of rdv) ins.votoRdv.run(...chave, r.eleicao, r.cargo, r.tipoVoto, r.digitacao, r.quantidade);
}

/**
 * Grava uma seção dentro de um SAVEPOINT. Se o conteúdo decodificado não couber no esquema (ex.: eleição repetida
 * no BU), desfaz só essa seção, registra o erro e grava a linha da seção sem BU/RDV, como 'incompleta'.
 */
function inserirSecao(db, ins, secao, registrarErro) {
  const d = decodificarSecao(secao, registrarErro);
  db.exec('SAVEPOINT secao');
  try {
    gravarSecao(ins, secao, d);
  } catch (erro) {
    db.exec('ROLLBACK TO secao');
    registrarErro(secao.s, d.pacote?.hash ?? null, 'gravacao', erro.message);
    d.situacao = d.pacote ? 'incompleta' : d.situacao;
    gravarSecao(ins, secao, { ...d, bu: null, rdv: [] });
  }
  db.exec('RELEASE secao');
  return d.situacao;
}

/** Linhas de data/parsed/<t>t/perfil/<uf>.jsonl (src/perfil-secoes.js) → perfil_log. Não reprocessa logs. */
async function carregarPerfil(ins, { turno, uf, arquivo }, registrarErro) {
  let fluxo;
  try {
    fluxo = createReadStream(arquivo, { encoding: 'utf8' });
    await new Promise((resolve, reject) => { fluxo.once('open', resolve); fluxo.once('error', reject); });
  } catch (erro) {
    if (erro.code === 'ENOENT') return 0;
    throw erro;
  }
  let linhas = 0;
  for await (const linha of createInterface({ input: fluxo, crlfDelay: Infinity })) {
    if (!linha) continue;
    let p;
    try {
      p = JSON.parse(linha);
      const log = p.log ?? {};
      ins.perfil.run(
        Number(turno), uf, p.municipio, p.zona, p.secao, hashDoSha256(p.sha256Vsc), p.sha256Vsc,
        ...Object.values(COLUNAS_PERFIL).map((k) => log[k] ?? null),
        log.intervaloEntreVotos?.minimo ?? null, log.tempoHabilitacaoAteVoto?.minimo ?? null, log.mesarios?.registros?.length ?? null,
        linha,
      );
      linhas++;
    } catch (erro) {
      registrarErro(p ?? {}, null, 'perfil', erro.message);
    }
  }
  return linhas;
}

const TABELAS_POR_UF = ['secao', 'secao_agregada', 'secao_eleicao', 'voto_bu', 'voto_rdv', 'perfil_log', 'erro_carga', 'carga'];

/**
 * Carrega uma UF de um turno: índice (cs.json) ∪ seções do disco, BU/RDV/vsc do pacote de cada seção e perfis de log.
 * Erro numa seção vai para erro_carga e a carga segue.
 */
export async function carregarUf(db, { turno, uf, dirDados = DIR_DADOS, concorrencia = 32, progresso = false }) {
  const inicio = Date.now();
  const t = Number(turno);
  const dirs = caminhos(turno, dirDados);
  const arquivoIndice = path.join(dirs.config, `${uf}-p${TURNOS[turno].pleito.padStart(6, '0')}-cs.json`);
  const textoIndice = await lerOuNulo(arquivoIndice);
  const cs = textoIndice ? JSON.parse(textoIndice.toString('utf8')) : null;
  const indice = cs ? montarSecoes(cs) : { principais: [], agregadas: [] };
  const chave = (s) => `${s.municipio}/${s.zona}/${s.secao}`;
  const secoes = new Map(indice.principais.map((s) => [chave(s), { s: { municipio: s.municipio, zona: s.zona, secao: s.secao }, noIndice: true }]));
  for (const s of await secoesNoDisco(path.join(dirs.urnas, uf))) if (!secoes.has(chave(s))) secoes.set(chave(s), { s, noIndice: false });
  const lista = [...secoes.values()];
  const contagem = { completa: 0, incompleta: 0, sem_arquivo: 0, sem_pacote: 0 };
  let erros = 0;
  const arquivoPerfil = path.join(dirDados, 'parsed', `${turno}t`, 'perfil', `${uf}.jsonl`);

  const linhasPerfil = await emTransacao(db, async () => {
    for (const tabela of TABELAS_POR_UF) db.prepare(`DELETE FROM ${tabela} WHERE turno = ? AND uf = ?`).run(t, uf);
    const ins = prepararInsercoes(db);
    const registrarErro = (s, hash, etapa, mensagem) => {
      erros++;
      ins.erro.run(t, uf, s.municipio ?? null, s.zona ?? null, s.secao ?? null, hash, etapa, mensagem);
    };
    for (const abr of cs?.abr ?? []) for (const mu of abr.mu ?? []) ins.municipio.run(mu.cd, abr.cd, mu.nm);
    for (const ag of indice.agregadas) ins.agregada.run(t, uf, ag.municipio, ag.zona, ag.secao, ag.principal);
    const barra = progresso ? criarProgresso(`banco ${turno}t ${uf}`, lista.length) : null;
    await emParalelo(lista, concorrencia, async ({ s, noIndice }) => {
      let lido;
      try {
        lido = await lerSecao(dirs.urnas, uf, s);
        if (lido.erroAux) registrarErro(s, null, 'aux', lido.erroAux);
      } catch (erro) {
        registrarErro(s, null, 'leitura', erro.message);
        lido = { aux: null, pacotes: [], erroLeitura: true };
        barra?.falhar();
      }
      contagem[inserirSecao(db, ins, { turno: t, uf, s, noIndice, ...lido }, registrarErro)]++;
      barra?.avancar();
    });
    barra?.finalizar();
    const linhas = await carregarPerfil(ins, { turno, uf, arquivo: arquivoPerfil }, registrarErro);
    db.prepare(`INSERT INTO carga VALUES (${Array(13).fill('?').join(', ')})`).run(
      t, uf, new Date().toISOString(), Date.now() - inicio, path.join(dirs.urnas, uf),
      lista.length, contagem.completa, contagem.incompleta, contagem.sem_arquivo, contagem.sem_pacote,
      indice.agregadas.length, linhas, erros,
    );
    return linhas;
  });
  return { uf, secoes: lista.length, ...contagem, agregadas: indice.agregadas.length, linhasPerfil, erros, duracaoMs: Date.now() - inicio };
}

/** Divide uma linha do CSV do TSE (separador ';', campos entre aspas, "" como aspa escapada). */
function camposCsv(linha) {
  const campos = [];
  let atual = '';
  let aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i];
    if (aspas) {
      if (ch === '"' && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else if (ch === '"') aspas = false;
      else atual += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === ';') {
      campos.push(atual);
      atual = '';
    } else atual += ch;
  }
  campos.push(atual);
  return campos;
}

/** Linhas do CSV dentro do zip, em streaming (o CSV nacional passa de 1,5 GB descomprimido). */
async function* linhasCsvDoZip(arquivoZip) {
  const handle = await open(arquivoZip, 'r');
  let entrada;
  let inicio;
  try {
    entrada = (await listarEntradas(handle)).find((e) => e.nome.toLowerCase().endsWith('.csv'));
    if (!entrada) throw new Error(`${path.basename(arquivoZip)} sem CSV`);
    const cabecalho = Buffer.alloc(30);
    await handle.read(cabecalho, 0, 30, entrada.offsetLocal);
    inicio = entrada.offsetLocal + 30 + cabecalho.readUInt16LE(26) + cabecalho.readUInt16LE(28);
  } finally {
    await handle.close();
  }
  if (![0, 8].includes(entrada.metodo)) throw new Error(`método de compressão ${entrada.metodo} não suportado`);
  let fluxo = createReadStream(arquivoZip, { start: inicio, end: inicio + entrada.tamanhoComprimido - 1 });
  if (entrada.metodo === 8) fluxo = fluxo.pipe(createInflateRaw());
  // Só UF e campos numéricos são usados: ler como latin1 não altera nenhum deles.
  yield* createInterface({ input: fluxo.setEncoding('latin1'), crlfDelay: Infinity });
}

const COLUNAS_OFICIAL = ['NR_TURNO', 'SG_UF', 'CD_ELEICAO', 'CD_MUNICIPIO', 'NR_ZONA', 'NR_SECAO', 'CD_CARGO', 'NR_VOTAVEL', 'QT_VOTOS'];

/**
 * Carrega votacao_secao (dados abertos do TSE) do turno nas UFs pedidas, numa passada só pelo CSV.
 * Idempotente por (turno, UF). Serve para comparar BU × resultado oficial (v_divergencia_bu_oficial, H03).
 */
export async function carregarOficial(db, { turno, ufs, arquivoZip = ZIP_OFICIAL }) {
  const t = Number(turno);
  const alvo = new Set(ufs);
  const linhas = Object.fromEntries(ufs.map((uf) => [uf, 0]));
  let dataGeracao = null;
  await emTransacao(db, async () => {
    for (const uf of ufs) {
      db.prepare('DELETE FROM voto_oficial WHERE turno = ? AND uf = ?').run(t, uf);
      db.prepare('DELETE FROM carga_oficial WHERE turno = ? AND uf = ?').run(t, uf);
    }
    const inserir = db.prepare(`INSERT INTO voto_oficial VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT DO UPDATE SET quantidade = quantidade + excluded.quantidade`);
    let col = null;
    let total = 0;
    for await (const linha of linhasCsvDoZip(arquivoZip)) {
      if (!linha) continue;
      let c = linha.split(';');
      if (!col) {
        col = Object.fromEntries(c.map((nome, i) => [nome.replace(/^"|"$/g, ''), i]));
        total = c.length;
        const faltando = COLUNAS_OFICIAL.filter((nome) => col[nome] === undefined);
        if (faltando.length) throw new Error(`CSV oficial sem as colunas ${faltando.join(', ')}`);
        continue;
      }
      const campo = (nome) => c[col[nome]].replace(/^"|"$/g, '');
      if (campo('NR_TURNO') !== String(t)) continue;
      const uf = campo('SG_UF').toLowerCase();
      if (!alvo.has(uf)) continue;
      if (c.length !== total) c = camposCsv(linha); // ';' dentro de algum campo entre aspas
      if (col.DT_GERACAO !== undefined) dataGeracao ??= `${campo('DT_GERACAO')} ${campo('HH_GERACAO')}`;
      inserir.run(
        t, uf, campo('CD_MUNICIPIO').padStart(5, '0'), campo('NR_ZONA').padStart(4, '0'), campo('NR_SECAO').padStart(4, '0'),
        Number(campo('CD_ELEICAO')), Number(campo('CD_CARGO')), Number(campo('NR_VOTAVEL')), Number(campo('QT_VOTOS')),
      );
      linhas[uf]++;
    }
    const registro = db.prepare('INSERT INTO carga_oficial VALUES (?, ?, ?, ?, ?, ?)');
    for (const uf of ufs) registro.run(t, uf, new Date().toISOString(), arquivoZip, dataGeracao, linhas[uf]);
  });
  return { dataGeracao, linhas };
}

async function principal() {
  const { values } = parseArgs({
    options: {
      turno: { type: 'string', default: '2' }, uf: { type: 'string' }, banco: { type: 'string' },
      concorrencia: { type: 'string', default: '32' }, oficial: { type: 'boolean' }, 'so-oficial': { type: 'boolean' },
      'arquivo-oficial': { type: 'string', default: ZIP_OFICIAL }, ajuda: { type: 'boolean', short: 'h' },
    },
  });
  if (values.ajuda) {
    console.log(`Carrega BUs, RDVs, índice de seções e perfis de log num SQLite (doc 09).

Uso: node src/banco.js --turno 2 [--uf ac,sp] [--banco caminho] [--oficial]

  --turno <1|2>        turno (padrão: 2)
  --uf <ac,sp,...>     UFs a carregar (padrão: todas + zz); recarregar uma UF substitui as linhas dela
  --banco <arquivo>    destino (padrão: data/db/eleicao2026.sqlite)
  --concorrencia <n>   seções lidas do disco ao mesmo tempo (padrão: 32)
  --oficial            também carrega votacao_secao (dados abertos) das mesmas UFs em voto_oficial
  --so-oficial         carrega só voto_oficial, sem reler os BUs
  --arquivo-oficial    zip do votacao_secao (padrão: data/raw/dadosabertos/votacao_secao/votacao_secao_2026_BR.zip)`);
    return;
  }
  const turno = values.turno;
  if (!TURNOS[turno]) throw new Error(`--turno inválido: ${turno}`);
  const ufs = values.uf ? values.uf.toLowerCase().split(',').map((u) => u.trim()) : UFS;
  const invalidas = ufs.filter((u) => !UFS.includes(u));
  if (invalidas.length) throw new Error(`UF inválida: ${invalidas.join(', ')}`);
  const concorrencia = Number(values.concorrencia);
  if (!Number.isInteger(concorrencia) || concorrencia < 1) throw new Error('--concorrencia deve ser inteiro positivo');

  const caminho = path.resolve(values.banco ?? BANCO_PADRAO);
  await mkdir(path.dirname(caminho), { recursive: true });
  const db = abrirBanco(caminho);
  try {
    const ref = await carregarReferenciaNoBanco(db, turno, await carregarReferencia(turno));
    console.log(`[banco ${turno}t] referência: ${ref.candidatos} candidatos, ${ref.municipios} municípios`);
    let comErro = false;
    for (const uf of values['so-oficial'] ? [] : ufs) {
      const r = await carregarUf(db, { turno, uf, concorrencia, progresso: process.stdout.isTTY });
      if (r.erros) comErro = true;
      console.log(`[banco ${turno}t] ${uf}: ${r.secoes} seções (${r.completa} completas, ${r.incompleta} incompletas, ${r.sem_arquivo} sem arquivo, `
        + `${r.sem_pacote} sem pacote), ${r.agregadas} agregadas, ${r.linhasPerfil} perfis, ${r.erros} erro(s) · ${(r.duracaoMs / 1000).toFixed(1)} s`);
    }
    if (values.oficial || values['so-oficial']) {
      const inicio = Date.now();
      const o = await carregarOficial(db, { turno, ufs, arquivoZip: path.resolve(values['arquivo-oficial']) });
      const resumo = Object.entries(o.linhas).map(([uf, n]) => `${uf} ${n}`).join(', ');
      console.log(`[banco ${turno}t] oficial (gerado em ${o.dataGeracao}): ${resumo} linhas · ${((Date.now() - inicio) / 1000).toFixed(1)} s`);
    }
    console.log(`Banco: ${caminho}${comErro ? ' · houve erros: SELECT * FROM erro_carga' : ''}`);
    process.exitCode = comErro ? 1 : 0;
  } finally {
    db.close();
  }
}

if (import.meta.filename === path.resolve(process.argv[1] ?? '')) await principal();
