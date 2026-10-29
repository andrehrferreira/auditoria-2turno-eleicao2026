// Procura um identificador (ex.: título de eleitor) nos arquivos públicos de urna, em texto, binário e hash.
// Uso: BUSCA_IDENTIFICADOR=<número> node src/busca-identificador.js <dir...>
// O número vem do ambiente para não ficar na linha de comando. Os achados vão para data/private/ (fora do git):
// só o próprio titular pode pedir essa busca, e o resultado não é publicado (doc 05).
import { createHash } from 'node:crypto';
import { open, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DIR_DADOS } from './config.js';
import { salvarAtomico } from './http.js';
import { lerEntrada, listarEntradas } from './zip.js';

const ALGORITMOS = ['md5', 'sha1', 'sha256', 'sha512'];

/** Dígitos em BCD compactado (2 por byte); `invertido` troca os nibbles. Número ímpar de dígitos ganha um 0 à esquerda. */
function bcd(digitos, invertido = false) {
  const par = digitos.length % 2 ? `0${digitos}` : digitos;
  const bytes = [];
  for (let i = 0; i < par.length; i += 2) {
    const [a, b] = [Number(par[i]), Number(par[i + 1])];
    bytes.push(invertido ? (b << 4) | a : (a << 4) | b);
  }
  return Buffer.from(bytes);
}

function inteiro(digitos) {
  const valor = BigInt(digitos);
  const be = Buffer.alloc(8);
  be.writeBigUInt64BE(valor);
  const le = Buffer.alloc(8);
  le.writeBigUInt64LE(valor);
  const minimo = be.subarray(be.findIndex((b) => b !== 0));
  return { be, le, minimo };
}

/**
 * Representações do identificador nos tipos de dado vistos nos arquivos do TSE (doc 06):
 * texto latin1/UTF-16 (log, JSON), inteiro e BCD (ASN.1 do BU/RDV) e hashes (SHA-256/512 do aux.json e do .vsc).
 */
export function variantes(identificador) {
  const doze = identificador.replace(/\D/g, '');
  if (!/^\d{6,20}$/.test(doze)) throw new Error('identificador precisa ter de 6 a 20 dígitos');
  const semZeros = doze.replace(/^0+/, '');
  const textos = { completo: doze, semZeros, agrupado: doze.replace(/(\d{4})(?=\d)/g, '$1 ') };

  const lista = [];
  for (const [nome, texto] of Object.entries(textos)) {
    lista.push([`texto:${nome}`, Buffer.from(texto, 'latin1')]);
    lista.push([`utf16le:${nome}`, Buffer.from(texto, 'utf16le')]);
  }
  lista.push(['bcd', bcd(doze)], ['bcd-invertido', bcd(doze, true)]);
  const { be, le, minimo } = inteiro(semZeros);
  lista.push(['int64be', be], ['int64le', le], ['int-minimo-be', minimo]);
  for (const [nome, texto] of Object.entries({ completo: doze, semZeros })) {
    for (const algoritmo of ALGORITMOS) {
      const hash = createHash(algoritmo).update(texto).digest();
      lista.push([`${algoritmo}(${nome}):bytes`, hash]);
      lista.push([`${algoritmo}(${nome}):hex`, Buffer.from(hash.toString('hex'), 'latin1')]);
      lista.push([`${algoritmo}(${nome}):HEX`, Buffer.from(hash.toString('hex').toUpperCase(), 'latin1')]);
      lista.push([`${algoritmo}(${nome}):base64`, Buffer.from(hash.toString('base64'), 'latin1')]);
    }
  }
  // Um padrão vazio ou repetido não acrescenta nada
  const vistos = new Set();
  return lista.filter(([, b]) => b.length > 0 && !vistos.has(b.toString('hex')) && vistos.add(b.toString('hex')));
}

/** Posições de cada variante em `buffer`. */
export function procurar(buffer, lista) {
  const achados = [];
  for (const [variante, padrao] of lista) {
    for (let p = buffer.indexOf(padrao); p !== -1; p = buffer.indexOf(padrao, p + 1)) achados.push({ variante, posicao: p });
  }
  return achados;
}

// ZIP aninhado lido da memória: o leitor de src/zip.js só usa read() e stat().
const handleEmMemoria = (buffer) => ({
  read: async (destino, deslocamento, tamanho, posicao) => ({ bytesRead: buffer.copy(destino, deslocamento, posicao, posicao + tamanho) }),
  stat: async () => ({ size: buffer.length }),
});

/** Conteúdos a varrer de um arquivo: ele mesmo e, se for .jez (ZIP), cada entrada descomprimida, inclusive .jez aninhado. */
async function conteudos(bytes, nome, profundidade = 0) {
  const lista = [{ entrada: null, bytes }];
  if (!nome.endsWith('.jez') || profundidade > 3) return lista;
  for (const entrada of await listarEntradas(handleEmMemoria(bytes))) {
    const dados = await lerEntrada(handleEmMemoria(bytes), entrada);
    for (const interno of await conteudos(dados, entrada.nome, profundidade + 1)) {
      lista.push({ entrada: interno.entrada ? `${entrada.nome}/${interno.entrada}` : entrada.nome, bytes: interno.bytes });
    }
  }
  return lista;
}

async function* arquivos(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const caminho = path.join(dir, item.name);
    if (item.isDirectory()) yield* arquivos(caminho);
    else if (item.isFile()) yield caminho;
  }
}

/** Trecho em volta do achado, legível, para conferir à mão (fica só em data/private/). */
const contexto = (bytes, p, tamanho) =>
  bytes.subarray(Math.max(0, p - 80), p + tamanho + 80).toString('latin1').replace(/[^\x20-\x7e -ÿ]/g, '·');

async function principal(dirs) {
  const identificador = process.env.BUSCA_IDENTIFICADOR;
  if (!identificador || dirs.length === 0) {
    console.error('uso: BUSCA_IDENTIFICADOR=<número> node src/busca-identificador.js <dir...>');
    process.exit(2);
  }
  const lista = variantes(identificador);
  const tamanhos = Object.fromEntries(lista.map(([v, b]) => [v, b.length]));
  const contagem = { arquivos: 0, conteudos: 0, bytes: 0, erros: 0 };
  const achados = [];
  const inicio = Date.now();

  for (const dir of dirs) {
    for await (const caminho of arquivos(dir)) {
      contagem.arquivos++;
      try {
        for (const { entrada, bytes } of await conteudos(await readFile(caminho), path.basename(caminho))) {
          contagem.conteudos++;
          contagem.bytes += bytes.length;
          for (const a of procurar(bytes, lista)) {
            achados.push({ arquivo: path.relative(DIR_DADOS, caminho), entrada, ...a, contexto: contexto(bytes, a.posicao, tamanhos[a.variante]) });
          }
        }
      } catch (erro) {
        contagem.erros++;
        achados.push({ arquivo: path.relative(DIR_DADOS, caminho), erro: erro.message });
      }
      if (contagem.arquivos % 5000 === 0) process.stdout.write(`\r[busca] ${contagem.arquivos} arquivos, ${(contagem.bytes / 1e9).toFixed(2)} GB   `);
    }
  }

  const saida = path.join(DIR_DADOS, 'private', 'busca-identificador', `${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  const resumo = { dirs, variantes: lista.length, ...contagem, segundos: Math.round((Date.now() - inicio) / 1000) };
  await salvarAtomico(saida, JSON.stringify({ resumo, nomesVariantes: lista.map(([v]) => v), achados }, null, 2));
  console.log(`\n${JSON.stringify(resumo)}`);
  console.log(`achados: ${achados.filter((a) => !a.erro).length} (por variante: ${JSON.stringify(Object.fromEntries(
    [...new Set(achados.filter((a) => !a.erro).map((a) => a.variante))].map((v) => [v, achados.filter((a) => a.variante === v).length])))})`);
  console.log(`detalhes: ${saida}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await principal(process.argv.slice(2));
}
