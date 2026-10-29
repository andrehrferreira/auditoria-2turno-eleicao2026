import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { appendFile, copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';
import { DIR_DADOS } from './config.js';
import { acharArquivo } from './lacres.js';

// Registro de evidências da perícia: deixa rastro verificável de QUAIS arquivos foram analisados e de
// COMO cada verificação foi feita.
//   - Índice por UF: uma linha por seção com o SHA-256 de cada arquivo (bu, rdv, log, vota.vsc, imgbu, aux.json).
//   - Cadeia (cadeia.jsonl): cada entrada leva o SHA-256 da linha anterior; alterar o passado quebra a cadeia.
//   - Âncora (ancora.txt): SHA-256 da última linha; é o valor a carimbar no tempo por terceiro (TSA/OpenTimestamps).
// O que é pequeno fica em docs/pericia/evidencias (versionado); saídas grandes ficam em data/evidencias
// (fora do git), sempre com o hash registrado na cadeia.

const RAIZ = path.resolve(import.meta.dirname, '..');
export const DIR_REGISTRO = path.join(RAIZ, 'docs', 'pericia', 'evidencias');
export const DIR_EXTERNO = path.join(DIR_DADOS, 'evidencias');
const ZERO = '0'.repeat(64);
// Colunas do índice. Seções do Sistema de Apuração usam as mesmas colunas (sa.vsc, busa.dat, rdv.dat, logsa.jez, imgbusa.dat).
const TIPOS_ARQUIVO = ['vota.vsc', 'bu.dat', 'rdv.dat', 'log.jez', 'imgbu.dat'];
const CHAVE_TIPO = { 'vota.vsc': 'vsc', 'bu.dat': 'bu', 'rdv.dat': 'rdv', 'log.jez': 'log', 'imgbu.dat': 'imgbu' };
const LIMITE_VERSIONADO = 5 * 1024 * 1024;

const sha256 = (dados) => createHash('sha256').update(dados).digest('hex');
const relativo = (p) => path.relative(RAIZ, p).split(path.sep).join('/');

export function sha256Arquivo(caminho) {
  return new Promise((resolve, reject) => {
    const h = createHash('sha256');
    createReadStream(caminho).on('data', (c) => h.update(c)).on('error', reject).on('end', () => resolve(h.digest('hex')));
  });
}

async function subdiretorios(dir) {
  return (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
}

/**
 * Índice de uma UF: `base/{mun}/{zona}/{secao}/[aux.json, {hash}/arquivos]`.
 * Uma linha por pacote distinto da seção (cópias idênticas do mesmo vota.vsc contam uma vez), ordenado.
 */
export async function indexarUf(baseUf) {
  const linhas = [];
  let arquivos = 0;
  let bytes = 0;
  for (const mun of await subdiretorios(baseUf)) {
    for (const zona of await subdiretorios(path.join(baseUf, mun))) {
      for (const secao of await subdiretorios(path.join(baseUf, mun, zona))) {
        const dirSecao = path.join(baseUf, mun, zona, secao);
        const aux = path.join(dirSecao, 'aux.json');
        const hashAux = await sha256Arquivo(aux).catch((e) => (e.code === 'ENOENT' ? '-' : Promise.reject(e)));
        const vistos = new Set();
        for (const dirHash of await subdiretorios(dirSecao)) {
          const nomes = await readdir(path.join(dirSecao, dirHash));
          const colunas = [];
          for (const tipo of TIPOS_ARQUIVO) {
            const nome = acharArquivo(nomes, CHAVE_TIPO[tipo]);
            if (!nome) { colunas.push('-'); continue; }
            const p = path.join(dirSecao, dirHash, nome);
            colunas.push(await sha256Arquivo(p));
            arquivos++;
            bytes += (await stat(p)).size;
          }
          if (colunas[0] === '-' || vistos.has(colunas[0])) continue;
          vistos.add(colunas[0]);
          linhas.push([mun, zona, secao, ...colunas, hashAux].join('\t'));
        }
        if (hashAux !== '-') { arquivos++; bytes += (await stat(aux)).size; }
      }
    }
  }
  linhas.sort();
  const cabecalho = `# municipio\tzona\tsecao\t${TIPOS_ARQUIVO.map((t) => `sha256_${t.replace('.', '_')}`).join('\t')}\tsha256_aux_json`;
  return { conteudo: `${cabecalho}\n${linhas.join('\n')}\n`, pacotes: linhas.length, arquivos, bytes };
}

function infoGit() {
  try {
    const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: RAIZ, encoding: 'utf8' }).trim();
    const pendentes = execFileSync('git', ['status', '--porcelain', '--', 'src', 'package.json'], { cwd: RAIZ, encoding: 'utf8' }).trim();
    return { commit, codigoComAlteracoesNaoCommitadas: pendentes.length > 0 };
  } catch {
    return { commit: null, codigoComAlteracoesNaoCommitadas: null };
  }
}

/** SHA-256 de cada arquivo do código (src/*.js e package.json) no momento do registro. */
async function hashesCodigo() {
  const arquivos = (await readdir(path.join(RAIZ, 'src'))).filter((n) => n.endsWith('.js')).sort().map((n) => path.join(RAIZ, 'src', n));
  arquivos.push(path.join(RAIZ, 'package.json'));
  const mapa = {};
  for (const a of arquivos) mapa[relativo(a)] = await sha256Arquivo(a);
  return mapa;
}

async function lerLinhas(caminho) {
  try {
    return (await readFile(caminho, 'utf8')).split('\n').filter((l) => l.length > 0);
  } catch (erro) {
    if (erro.code === 'ENOENT') return [];
    throw erro;
  }
}

/** Acrescenta uma entrada à cadeia e atualiza a âncora. Retorna a entrada gravada e o hash da linha. */
export async function acrescentar(dirRegistro, dados) {
  await mkdir(dirRegistro, { recursive: true });
  const arquivoCadeia = path.join(dirRegistro, 'cadeia.jsonl');
  const linhas = await lerLinhas(arquivoCadeia);
  const anterior = linhas.length ? sha256(linhas.at(-1)) : ZERO;
  const entrada = { seq: linhas.length + 1, em: new Date().toISOString(), anterior, ...dados };
  const linha = JSON.stringify(entrada);
  await appendFile(arquivoCadeia, `${linha}\n`);
  const hash = sha256(linha);
  await writeFile(path.join(dirRegistro, 'ancora.txt'),
    `${hash}\n\nSHA-256 da entrada ${entrada.seq} de cadeia.jsonl (${entrada.em}).\nEste valor resume toda a cadeia: qualquer alteração em entradas anteriores muda este hash.\n`);
  return { entrada, hash };
}

/**
 * Confere a cadeia: numeração, ligação com a linha anterior e o SHA-256 de cada arquivo citado
 * (campo `arquivos: [{caminho, sha256}]`). Arquivos fora do git que não estão presentes são listados à parte.
 */
export async function verificarCadeia(dirRegistro, raiz = RAIZ) {
  const linhas = await lerLinhas(path.join(dirRegistro, 'cadeia.jsonl'));
  const erros = [];
  const ausentes = [];
  let anterior = ZERO;
  for (const [i, linha] of linhas.entries()) {
    let e;
    try {
      e = JSON.parse(linha);
    } catch {
      erros.push(`linha ${i + 1}: JSON inválido`);
      anterior = sha256(linha);
      continue;
    }
    if (e.seq !== i + 1) erros.push(`linha ${i + 1}: seq ${e.seq} fora de ordem`);
    if (e.anterior !== anterior) erros.push(`linha ${i + 1}: não aponta para a linha anterior (cadeia quebrada)`);
    for (const a of e.arquivos ?? []) {
      const p = path.join(raiz, a.caminho);
      const atual = await sha256Arquivo(p).catch((err) => (err.code === 'ENOENT' ? null : Promise.reject(err)));
      if (atual === null) ausentes.push(`linha ${i + 1}: ${a.caminho}`);
      else if (atual !== a.sha256) erros.push(`linha ${i + 1}: ${a.caminho} mudou depois de registrado`);
    }
    anterior = sha256(linha);
  }
  const ancora = (await readFile(path.join(dirRegistro, 'ancora.txt'), 'utf8').catch(() => '')).split('\n')[0];
  if (linhas.length && ancora !== anterior) erros.push('ancora.txt não corresponde à última linha da cadeia');
  return { ok: erros.length === 0, entradas: linhas.length, ultimoHash: linhas.length ? anterior : null, erros, ausentes };
}

async function gravarRegistrado(destino, conteudo) {
  await mkdir(path.dirname(destino), { recursive: true });
  await writeFile(destino, conteudo);
  return { caminho: relativo(destino), bytes: conteudo.length, sha256: sha256(conteudo) };
}

async function comandoIndexar(values, dirRegistro) {
  const turno = values.turno;
  const base = path.resolve(values.base ?? path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas'));
  const ufs = values.uf ? values.uf.split(',') : await subdiretorios(base);
  for (const uf of ufs) {
    const { conteudo, pacotes, arquivos, bytes } = await indexarUf(path.join(base, uf));
    // gzip sem nome nem data no cabeçalho: mesmo conteúdo → mesmo arquivo → mesmo hash
    const gz = gzipSync(Buffer.from(conteudo), { level: 9 });
    const indice = await gravarRegistrado(path.join(dirRegistro, 'indice', `${turno}t`, `${uf}.tsv.gz`), gz);
    const { entrada, hash } = await acrescentar(dirRegistro, {
      tipo: 'indice',
      descricao: `Índice dos arquivos de urna do ${turno}º turno, UF ${uf.toUpperCase()}`,
      origem: relativo(path.join(base, uf)),
      pacotes, arquivosIndexados: arquivos, bytesIndexados: bytes,
      sha256ConteudoSemCompactar: sha256(conteudo),
      arquivos: [indice],
      git: infoGit(),
    });
    console.log(`#${entrada.seq} índice ${turno}t/${uf}: ${pacotes} pacotes, ${arquivos} arquivos, ${(bytes / 2 ** 20).toFixed(1)} MiB → ${indice.caminho} (cadeia ${hash.slice(0, 16)}…)`);
  }
}

async function comandoExecutar(values, comando, dirRegistro) {
  if (!values.nome || comando.length === 0) throw new Error('uso: executar --nome <nome> [--descricao <texto>] -- <comando> [args]');
  const inicio = new Date();
  const carimbo = inicio.toISOString().replace(/[:.]/g, '-');
  const destino = path.join(DIR_EXTERNO, 'saidas', `${carimbo}-${values.nome}.txt`);
  await mkdir(path.dirname(destino), { recursive: true });
  const codigo = await hashesCodigo();
  const git = infoGit();
  const codigoSaida = await new Promise((resolve, reject) => {
    const saida = createWriteStream(destino);
    const filho = spawn(comando[0], comando.slice(1), { cwd: RAIZ, stdio: ['ignore', 'pipe', 'pipe'] });
    filho.stdout.pipe(saida, { end: false });
    filho.stderr.pipe(saida, { end: false });
    filho.on('error', reject);
    filho.on('close', (c) => saida.end(() => resolve(c)));
  });
  const fim = new Date();
  const bytesSaida = (await stat(destino)).size;
  const hashSaida = await sha256Arquivo(destino);
  const linhas = (await readFile(destino, 'utf8')).trimEnd().split('\n');
  const resumoSaida = linhas.slice(-5);
  const registros = [{ caminho: relativo(destino), bytes: bytesSaida, sha256: hashSaida, versionado: false }];
  // Saída pequena também vai versionada, ao lado da cadeia.
  if (bytesSaida <= LIMITE_VERSIONADO) {
    const copia = path.join(dirRegistro, 'saidas', path.basename(destino));
    await mkdir(path.dirname(copia), { recursive: true });
    await copyFile(destino, copia);
    registros.push({ caminho: relativo(copia), bytes: bytesSaida, sha256: hashSaida, versionado: true });
  }
  const { entrada, hash } = await acrescentar(dirRegistro, {
    tipo: 'execucao',
    nome: values.nome,
    descricao: values.descricao ?? '',
    comando,
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
    codigoSaida,
    resumoSaida,
    arquivos: registros,
    codigo,
    git,
  });
  console.log(`#${entrada.seq} execução "${values.nome}" terminou com código ${codigoSaida}; saída ${registros[0].caminho} (cadeia ${hash.slice(0, 16)}…)`);
  for (const l of resumoSaida) console.log(`  ${l}`);
  return codigoSaida;
}

async function comandoReferencia(values, dirRegistro) {
  if (!values.arquivo || !values.origem) throw new Error('uso: referencia --arquivo <caminho> --origem <url ou descrição> [--descricao <texto>]');
  const origemLocal = path.resolve(values.arquivo);
  const { size } = await stat(origemLocal);
  const pasta = size <= LIMITE_VERSIONADO ? path.join(dirRegistro, 'referencias') : path.join(DIR_EXTERNO, 'referencias');
  const destino = path.join(pasta, path.basename(origemLocal));
  await mkdir(pasta, { recursive: true });
  await copyFile(origemLocal, destino);
  const registro = { caminho: relativo(destino), bytes: size, sha256: await sha256Arquivo(destino), versionado: size <= LIMITE_VERSIONADO };
  const { entrada, hash } = await acrescentar(dirRegistro, {
    tipo: 'referencia', descricao: values.descricao ?? '', origem: values.origem, arquivos: [registro], git: infoGit(),
  });
  console.log(`#${entrada.seq} referência ${registro.caminho} sha256 ${registro.sha256} (cadeia ${hash.slice(0, 16)}…)`);
}

async function comandoVerificar(values, dirRegistro) {
  const r = await verificarCadeia(dirRegistro);
  console.log(`cadeia: ${r.entradas} entradas, último hash ${r.ultimoHash ?? '-'}`);
  for (const a of r.ausentes) console.log(`AUSENTE (fora do git ou não copiado): ${a}`);
  for (const e of r.erros) console.log(`ERRO: ${e}`);
  let ok = r.ok;
  if (values.profundo) {
    // Refaz cada índice a partir dos arquivos em disco e compara com o registrado.
    const linhas = await lerLinhas(path.join(dirRegistro, 'cadeia.jsonl'));
    for (const e of linhas.map((l) => JSON.parse(l)).filter((x) => x.tipo === 'indice')) {
      const atual = sha256((await indexarUf(path.join(RAIZ, e.origem))).conteudo);
      const igual = atual === e.sha256ConteudoSemCompactar;
      ok &&= igual;
      console.log(`${igual ? 'OK   ' : 'ERRO '} índice #${e.seq} (${e.origem}) refeito a partir dos arquivos em disco`);
    }
  }
  console.log(ok ? 'RESULTADO: íntegro' : 'RESULTADO: COM PROBLEMAS');
  return ok ? 0 : 1;
}

const AJUDA = `Registro de evidências da perícia (docs/pericia/evidencias).

  node src/evidencias.js indexar --turno <1|2> [--uf ac,rr] [--base <dir>]
      Índice por UF com o SHA-256 de cada arquivo de cada seção; registra na cadeia.
  node src/evidencias.js executar --nome <nome> [--descricao <texto>] -- <comando> [args]
      Roda uma verificação, guarda a saída e registra comando, código usado (hashes), commit e resultado.
  node src/evidencias.js referencia --arquivo <caminho> --origem <url> [--descricao <texto>]
      Guarda uma cópia de documento de referência (especificação, certificado) e registra o hash.
  node src/evidencias.js verificar [--profundo]
      Confere a cadeia e os arquivos registrados; --profundo refaz os índices a partir dos dados em disco.`;

async function principal() {
  const separador = process.argv.indexOf('--');
  const args = separador >= 0 ? process.argv.slice(2, separador) : process.argv.slice(2);
  const comando = separador >= 0 ? process.argv.slice(separador + 1) : [];
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      turno: { type: 'string', default: '2' }, uf: { type: 'string' }, base: { type: 'string' },
      nome: { type: 'string' }, descricao: { type: 'string' }, arquivo: { type: 'string' }, origem: { type: 'string' },
      profundo: { type: 'boolean' }, registro: { type: 'string' }, ajuda: { type: 'boolean', short: 'h' },
    },
  });
  const dirRegistro = path.resolve(values.registro ?? DIR_REGISTRO);
  const acao = positionals[0];
  if (values.ajuda || !acao) {
    console.log(AJUDA);
    process.exit(values.ajuda ? 0 : 2);
  }
  if (acao === 'indexar') await comandoIndexar(values, dirRegistro);
  else if (acao === 'executar') process.exit(await comandoExecutar(values, comando, dirRegistro));
  else if (acao === 'referencia') await comandoReferencia(values, dirRegistro);
  else if (acao === 'verificar') process.exit(await comandoVerificar(values, dirRegistro));
  else throw new Error(`ação desconhecida: ${acao}`);
}

if (import.meta.filename === path.resolve(process.argv[1] ?? '')) await principal();
