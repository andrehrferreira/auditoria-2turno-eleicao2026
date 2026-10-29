import { createHash } from 'node:crypto';

// O `-vota.vsc` de cada seção é DER (ASN.1) e lista os arquivos da urna como
// SEQUENCE { GeneralString nome, SEQUENCE { INTEGER, OCTET STRING sha512 (64 bytes), ... } }.
// Essas listas ficam dentro de OCTET STRINGs que contêm DER aninhado.

const TAG_INTEGER = 0x02;
const TAG_OCTET_STRING = 0x04;
const TAG_SEQUENCE = 0x30;
const TAG_GENERAL_STRING = 0x1b;
const PROFUNDIDADE_MAXIMA = 32;

function lerTlv(buffer, posicao, limite) {
  if (posicao >= limite) throw new Error('DER: fim inesperado');
  const tag = buffer[posicao];
  let p = posicao + 1;
  if ((tag & 0x1f) === 0x1f) {
    while (p < limite && buffer[p] & 0x80) p++;
    p++;
  }
  if (p >= limite) throw new Error('DER: comprimento ausente');
  let comprimento = buffer[p++];
  if (comprimento & 0x80) {
    const bytes = comprimento & 0x7f;
    if (bytes === 0 || bytes > 4) throw new Error('DER: comprimento inválido');
    comprimento = 0;
    for (let i = 0; i < bytes; i++) {
      if (p >= limite) throw new Error('DER: comprimento truncado');
      comprimento = comprimento * 256 + buffer[p++];
    }
  }
  const fim = p + comprimento;
  if (fim > limite) throw new Error('DER: conteúdo ultrapassa o limite');
  return { tag, construido: (tag & 0x20) !== 0, inicio: p, fim };
}

function filhos(buffer, inicio, fim) {
  const lista = [];
  for (let p = inicio; p < fim; ) {
    const tlv = lerTlv(buffer, p, fim);
    lista.push(tlv);
    p = tlv.fim;
  }
  return lista;
}

function tentarFilhos(buffer, inicio, fim) {
  try {
    return filhos(buffer, inicio, fim);
  } catch {
    return null;
  }
}

function comoEntradaDeArquivo(buffer, tlv) {
  if (tlv.tag !== TAG_SEQUENCE) return null;
  const partes = tentarFilhos(buffer, tlv.inicio, tlv.fim);
  if (!partes || partes.length !== 2) return null;
  const [nome, dados] = partes;
  if (nome.tag !== TAG_GENERAL_STRING || dados.tag !== TAG_SEQUENCE) return null;
  const campos = tentarFilhos(buffer, dados.inicio, dados.fim);
  if (!campos || campos.length < 2) return null;
  const [inteiro, resumo] = campos;
  if (inteiro.tag !== TAG_INTEGER || resumo.tag !== TAG_OCTET_STRING || resumo.fim - resumo.inicio !== 64) return null;
  return {
    nome: buffer.toString('latin1', nome.inicio, nome.fim),
    sha512: buffer.toString('hex', resumo.inicio, resumo.fim),
  };
}

function percorrer(buffer, inicio, fim, profundidade, encontrados) {
  if (profundidade > PROFUNDIDADE_MAXIMA) return;
  const lista = tentarFilhos(buffer, inicio, fim);
  if (!lista) return;
  for (const tlv of lista) {
    const entrada = comoEntradaDeArquivo(buffer, tlv);
    if (entrada) {
      encontrados.push(entrada);
    } else if (tlv.construido) {
      percorrer(buffer, tlv.inicio, tlv.fim, profundidade + 1, encontrados);
    } else if (tlv.tag === TAG_OCTET_STRING && tlv.fim - tlv.inicio > 2 && buffer[tlv.inicio] === TAG_SEQUENCE) {
      percorrer(buffer, tlv.inicio, tlv.fim, profundidade + 1, encontrados);
    }
  }
}

/**
 * Extrai do `-vota.vsc` o mapa nome do arquivo → SHA-512 (hex).
 * Um mesmo arquivo pode aparecer em mais de um bloco; valores divergentes são erro.
 */
export function lerResumosVsc(buffer) {
  const raiz = lerTlv(buffer, 0, buffer.length);
  if (raiz.tag !== TAG_SEQUENCE) throw new Error('vota.vsc: raiz não é SEQUENCE');
  const encontrados = [];
  percorrer(buffer, raiz.inicio, raiz.fim, 0, encontrados);
  if (encontrados.length === 0) throw new Error('vota.vsc: nenhuma entrada de arquivo encontrada');

  const mapa = new Map();
  for (const { nome, sha512 } of encontrados) {
    const anterior = mapa.get(nome);
    if (anterior && anterior !== sha512) throw new Error(`vota.vsc: resumos divergentes para ${nome}`);
    mapa.set(nome, sha512);
  }
  return mapa;
}

/**
 * Nome do diretório de hash publicado pelo TSE: hex(base64(SHA-256(vota.vsc))),
 * com '/' trocado por '-' no base64 ('+' e '=' são mantidos), conforme os aux.json de 2026.
 */
export function hashDiretorio(vota) {
  const base64 = createHash('sha256').update(vota).digest('base64').replaceAll('/', '-');
  return Buffer.from(base64, 'latin1').toString('hex');
}

export const sha512Hex = (buffer) => createHash('sha512').update(buffer).digest('hex');
