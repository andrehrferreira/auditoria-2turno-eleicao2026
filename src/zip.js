import { crc32, inflateRawSync } from 'node:zlib';

// Leitor mínimo de ZIP (com ZIP64) por leitura posicional: não carrega o arquivo inteiro.

const ASSINATURA_EOCD = 0x06054b50;
const ASSINATURA_LOCALIZADOR_ZIP64 = 0x07064b50;
const ASSINATURA_EOCD_ZIP64 = 0x06064b50;
const ASSINATURA_CENTRAL = 0x02014b50;
const ASSINATURA_LOCAL = 0x04034b50;
const MAX_U16 = 0xffff;
const MAX_U32 = 0xffffffff;

async function lerTrecho(handle, posicao, tamanho) {
  const buffer = Buffer.alloc(tamanho);
  const { bytesRead } = await handle.read(buffer, 0, tamanho, posicao);
  if (bytesRead !== tamanho) throw new Error(`ZIP truncado: esperado ${tamanho} bytes em ${posicao}, lidos ${bytesRead}`);
  return buffer;
}

function u64(buffer, posicao) {
  const valor = buffer.readBigUInt64LE(posicao);
  if (valor > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('ZIP64 com valor acima de 2^53');
  return Number(valor);
}

async function localizarDiretorioCentral(handle) {
  const { size } = await handle.stat();
  const tamanhoCauda = Math.min(size, 22 + MAX_U16);
  const cauda = await lerTrecho(handle, size - tamanhoCauda, tamanhoCauda);

  let eocd = -1;
  for (let i = cauda.length - 22; i >= 0; i--) {
    if (cauda.readUInt32LE(i) === ASSINATURA_EOCD) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('ZIP sem End Of Central Directory');

  let entradas = cauda.readUInt16LE(eocd + 10);
  let tamanhoCd = cauda.readUInt32LE(eocd + 12);
  let offsetCd = cauda.readUInt32LE(eocd + 16);

  if (entradas === MAX_U16 || tamanhoCd === MAX_U32 || offsetCd === MAX_U32) {
    const posLocalizador = eocd - 20;
    if (posLocalizador < 0 || cauda.readUInt32LE(posLocalizador) !== ASSINATURA_LOCALIZADOR_ZIP64) {
      throw new Error('ZIP64 sem localizador do EOCD64');
    }
    const offsetEocd64 = u64(cauda, posLocalizador + 8);
    const eocd64 = await lerTrecho(handle, offsetEocd64, 56);
    if (eocd64.readUInt32LE(0) !== ASSINATURA_EOCD_ZIP64) throw new Error('EOCD64 inválido');
    entradas = u64(eocd64, 32);
    tamanhoCd = u64(eocd64, 40);
    offsetCd = u64(eocd64, 48);
  }
  return { entradas, tamanhoCd, offsetCd };
}

function lerExtraZip64(extra, entrada) {
  for (let p = 0; p + 4 <= extra.length;) {
    const id = extra.readUInt16LE(p);
    const tamanho = extra.readUInt16LE(p + 2);
    if (id === 0x0001) {
      let q = p + 4;
      if (entrada.tamanho === MAX_U32) { entrada.tamanho = u64(extra, q); q += 8; }
      if (entrada.tamanhoComprimido === MAX_U32) { entrada.tamanhoComprimido = u64(extra, q); q += 8; }
      if (entrada.offsetLocal === MAX_U32) { entrada.offsetLocal = u64(extra, q); }
      return;
    }
    p += 4 + tamanho;
  }
  throw new Error(`entrada ${entrada.nome} exige ZIP64 mas não tem o campo extra 0x0001`);
}

/** Lista as entradas do ZIP aberto em `handle` (FileHandle de node:fs/promises). */
export async function listarEntradas(handle) {
  const { entradas, tamanhoCd, offsetCd } = await localizarDiretorioCentral(handle);
  const cd = await lerTrecho(handle, offsetCd, tamanhoCd);
  const lista = [];

  for (let p = 0; lista.length < entradas; ) {
    if (cd.readUInt32LE(p) !== ASSINATURA_CENTRAL) throw new Error(`diretório central corrompido na posição ${p}`);
    const flags = cd.readUInt16LE(p + 8);
    const tamanhoNome = cd.readUInt16LE(p + 28);
    const tamanhoExtra = cd.readUInt16LE(p + 30);
    const tamanhoComentario = cd.readUInt16LE(p + 32);
    const entrada = {
      nome: cd.toString(flags & 0x800 ? 'utf8' : 'latin1', p + 46, p + 46 + tamanhoNome),
      metodo: cd.readUInt16LE(p + 10),
      crc: cd.readUInt32LE(p + 16),
      tamanhoComprimido: cd.readUInt32LE(p + 20),
      tamanho: cd.readUInt32LE(p + 24),
      offsetLocal: cd.readUInt32LE(p + 42),
    };
    if (entrada.tamanho === MAX_U32 || entrada.tamanhoComprimido === MAX_U32 || entrada.offsetLocal === MAX_U32) {
      lerExtraZip64(cd.subarray(p + 46 + tamanhoNome, p + 46 + tamanhoNome + tamanhoExtra), entrada);
    }
    lista.push(entrada);
    p += 46 + tamanhoNome + tamanhoExtra + tamanhoComentario;
  }
  return lista;
}

/** Lê e descomprime uma entrada, conferindo tamanho e CRC-32. */
export async function lerEntrada(handle, entrada) {
  const cabecalho = await lerTrecho(handle, entrada.offsetLocal, 30);
  if (cabecalho.readUInt32LE(0) !== ASSINATURA_LOCAL) throw new Error(`cabeçalho local inválido: ${entrada.nome}`);
  const inicioDados = entrada.offsetLocal + 30 + cabecalho.readUInt16LE(26) + cabecalho.readUInt16LE(28);
  const bruto = await lerTrecho(handle, inicioDados, entrada.tamanhoComprimido);

  let dados;
  if (entrada.metodo === 0) dados = bruto;
  else if (entrada.metodo === 8) dados = inflateRawSync(bruto);
  else throw new Error(`método de compressão ${entrada.metodo} não suportado: ${entrada.nome}`);

  if (dados.length !== entrada.tamanho) throw new Error(`tamanho divergente em ${entrada.nome}`);
  if (crc32(dados) !== entrada.crc) throw new Error(`CRC divergente em ${entrada.nome}`);
  return dados;
}
