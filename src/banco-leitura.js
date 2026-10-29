import { mkdir, readFile, readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from './config.js';
import { salvarAtomico } from './http.js';

// Separação escrita × leitura do banco (doc 09). A carga (`src/banco.js`) escreve no primário; as consultas
// leem uma cópia publicada, aberta como imutável (sem bloqueio nem leitura do WAL). Assim leitores não seguram
// o checkpoint do primário. No Windows um arquivo aberto não pode ser substituído, por isso cada cópia tem nome
// próprio e `atual.json` aponta a vigente; quem já tinha a anterior aberta continua nela até fechar.

export const BANCO_PRIMARIO = path.join(DIR_DADOS, 'db', 'eleicao2026.sqlite');
export const DIR_LEITURA = path.join(DIR_DADOS, 'db', 'leitura');
const PONTEIRO = 'atual.json';

const uriImutavel = (arquivo) => `file:${path.resolve(arquivo).split(path.sep).join('/')}?immutable=1`;

// Índices só da cópia de leitura (auditoria de 29/10/2026, doc 09). No primário eles atrasariam a carga.
// Consultas de presidente devem usar `cargo = 1` literal para aproveitar o índice parcial.
export const INDICES_LEITURA = [
  'CREATE INDEX IF NOT EXISTS leitura_voto_bu_presidente ON voto_bu (turno, uf, municipio, zona, secao, tipo_voto, numero, quantidade) WHERE cargo = 1',
  'CREATE INDEX IF NOT EXISTS leitura_voto_bu_cargo_numero ON voto_bu (turno, cargo, numero, uf, quantidade)',
  'CREATE INDEX IF NOT EXISTS leitura_voto_oficial_cargo_numero ON voto_oficial (turno, cargo, numero, quantidade)',
  'CREATE INDEX IF NOT EXISTS leitura_secao_eleicao_eleicao ON secao_eleicao (turno, eleicao)',
  'CREATE INDEX IF NOT EXISTS leitura_secao_agregada_principal ON secao_agregada (turno, uf, municipio, zona, secao_principal)',
];

/** Cria os índices analíticos e as estatísticas do planejador na cópia (antes de ela virar vigente). */
function otimizarCopia(arquivo, indices) {
  const db = new DatabaseSync(arquivo);
  try {
    db.exec('PRAGMA journal_mode = OFF; PRAGMA synchronous = OFF; PRAGMA temp_store = MEMORY; PRAGMA cache_size = -1048576;');
    const tabelas = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((t) => t.name));
    const criados = [];
    for (const sql of indices) {
      const tabela = /\bON (\w+)/.exec(sql)?.[1];
      if (tabela && !tabelas.has(tabela)) continue;
      db.exec(sql);
      criados.push(/INDEX IF NOT EXISTS (\w+)/.exec(sql)?.[1] ?? sql);
    }
    db.exec('ANALYZE; PRAGMA optimize;');
    return criados;
  } finally {
    db.close();
  }
}

async function lerPonteiro(dir) {
  try {
    return JSON.parse(await readFile(path.join(dir, PONTEIRO), 'utf8'));
  } catch (erro) {
    if (erro.code === 'ENOENT') return null;
    throw erro;
  }
}

/** Gera uma cópia consistente do primário (VACUUM INTO, só leitura) e passa a apontá-la como vigente. */
export async function publicarLeitura({ primario = BANCO_PRIMARIO, dir = DIR_LEITURA, agora = new Date(), indices = INDICES_LEITURA } = {}) {
  await mkdir(dir, { recursive: true });
  const carimbo = agora.toISOString().replace(/[-:]/g, '').replace(/\..*$/, '');
  const arquivo = path.join(dir, `eleicao2026-${carimbo}.sqlite`);
  const origem = new DatabaseSync(primario, { readOnly: true });
  let cargas = [];
  try {
    origem.exec(`VACUUM INTO '${arquivo.replaceAll("'", "''")}'`);
    try {
      cargas = origem.prepare('SELECT turno, COUNT(*) AS ufs FROM carga GROUP BY turno ORDER BY turno').all().map((r) => ({ ...r }));
    } catch {
      cargas = [];
    }
  } finally {
    origem.close();
  }
  const indicesCriados = otimizarCopia(arquivo, indices);
  const info = { arquivo: path.basename(arquivo), criadoEm: agora.toISOString(), bytes: (await stat(arquivo)).size, cargas, indices: indicesCriados };
  await salvarAtomico(path.join(dir, PONTEIRO), JSON.stringify(info, null, 2));
  return { ...info, caminho: arquivo };
}

/**
 * Abre a cópia de leitura vigente, imutável. Sem cópia publicada, abre o primário só para leitura
 * (com concorrência) e avisa uma vez pelo `aoAvisar`.
 */
export async function abrirLeitura({ dir = DIR_LEITURA, primario = BANCO_PRIMARIO, aoAvisar = (m) => console.error(m) } = {}) {
  const ponteiro = await lerPonteiro(dir);
  if (!ponteiro) {
    aoAvisar('[banco-leitura] nenhuma cópia publicada; lendo o primário (concorre com a carga). Rode: node src/banco-leitura.js --publicar');
    return { db: new DatabaseSync(primario, { readOnly: true }), fonte: primario, ponteiro: null };
  }
  const arquivo = path.join(dir, ponteiro.arquivo);
  const db = new DatabaseSync(uriImutavel(arquivo), { readOnly: true });
  // Arquivo imutável: mapear na memória e usar cache grande acelera as varreduras; agrupamentos temporários em RAM.
  db.exec('PRAGMA mmap_size = 68719476736; PRAGMA cache_size = -524288; PRAGMA temp_store = MEMORY;');
  return { db, fonte: arquivo, ponteiro };
}

/** Cópias que não são a vigente. Com `remover`, apaga as que não estiverem abertas por outro processo. */
export async function copiasAntigas(dir = DIR_LEITURA, { remover = false } = {}) {
  const ponteiro = await lerPonteiro(dir);
  let nomes = [];
  try {
    nomes = await readdir(dir);
  } catch (erro) {
    if (erro.code !== 'ENOENT') throw erro;
  }
  const antigas = nomes.filter((n) => /^eleicao2026-\d{8}T\d{6}\.sqlite$/.test(n) && n !== ponteiro?.arquivo).sort();
  const resultado = [];
  for (const nome of antigas) {
    if (!remover) {
      resultado.push({ nome, removida: false });
      continue;
    }
    try {
      await unlink(path.join(dir, nome));
      resultado.push({ nome, removida: true });
    } catch (erro) {
      resultado.push({ nome, removida: false, motivo: erro.code === 'EBUSY' || erro.code === 'EPERM' ? 'em uso por outro processo' : erro.message });
    }
  }
  return resultado;
}

async function principal() {
  const { values } = parseArgs({
    options: {
      publicar: { type: 'boolean' }, status: { type: 'boolean' }, 'remover-antigas': { type: 'boolean' }, ajuda: { type: 'boolean', short: 'h' },
    },
  });
  if (values.ajuda || (!values.publicar && !values.status && !values['remover-antigas'])) {
    console.log(`Cópia de leitura do banco (doc 09): consultas sem concorrência com a carga.

  node src/banco-leitura.js --publicar          gera nova cópia a partir do primário e a torna vigente
  node src/banco-leitura.js --status            mostra a cópia vigente e as antigas
  node src/banco-leitura.js --remover-antigas   apaga as cópias antigas que ninguém estiver usando`);
    return;
  }
  if (values.publicar) {
    const inicio = Date.now();
    const info = await publicarLeitura();
    console.log(`[banco-leitura] publicada ${info.arquivo} (${(info.bytes / 1e9).toFixed(2)} GB, ${((Date.now() - inicio) / 1000).toFixed(0)} s) · cargas: ${JSON.stringify(info.cargas)}`);
  }
  if (values['remover-antigas']) {
    for (const c of await copiasAntigas(DIR_LEITURA, { remover: true })) console.log(`[banco-leitura] ${c.nome}: ${c.removida ? 'removida' : `mantida (${c.motivo})`}`);
  }
  if (values.status) {
    const ponteiro = await lerPonteiro(DIR_LEITURA);
    console.log(`[banco-leitura] vigente: ${ponteiro ? `${ponteiro.arquivo} (criada em ${ponteiro.criadoEm}, ${JSON.stringify(ponteiro.cargas)})` : 'nenhuma'}`);
    const antigas = await copiasAntigas(DIR_LEITURA);
    if (antigas.length) console.log(`[banco-leitura] antigas: ${antigas.map((c) => c.nome).join(', ')}`);
  }
}

if (import.meta.filename === path.resolve(process.argv[1] ?? '')) await principal();
