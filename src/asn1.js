import { createHash } from 'node:crypto';

// Decodificador DER guiado por esquema: os esquemas (src/esquemas.js) transcrevem os .asn1 oficiais do TSE
// (IMPLICIT TAGS). Saída em JSON legível: nomes da especificação, enums por nome, datas legíveis, hashes em hex.

const UNIVERSAL = { int: 0x02, oct: 0x04, der: 0x04, enum: 0x0a, seq: 0x30, seqOf: 0x30, generalString: 0x1b, numericString: 0x12 };
const TAMANHO_MAX_HEX = 64; // bytes; acima disso a saída traz tamanho + SHA-256 (assinaturas e certificados)

/** Lê um TLV DER em `buffer[pos..limite)`. Só formas definidas (DER). */
export function lerTlv(buffer, pos, limite = buffer.length) {
  if (pos >= limite) throw new Error('DER: fim inesperado');
  const tag = buffer[pos];
  let p = pos + 1;
  if ((tag & 0x1f) === 0x1f) throw new Error('DER: tag de número alto não suportada');
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
  return { tag, construido: (tag & 0x20) !== 0, inicio: p, fim, valor: buffer.subarray(p, fim), buffer };
}

export function filhos(no) {
  const lista = [];
  for (let p = no.inicio; p < no.fim; ) {
    const filho = lerTlv(no.buffer, p, no.fim);
    lista.push(filho);
    p = filho.fim;
  }
  return lista;
}

// ---- construtores de esquema ----
export const int = { k: 'int' };
export const oct = { k: 'oct' };
export const generalString = { k: 'generalString' };
export const numericString = { k: 'numericString' };
export const serialFlash = { k: 'oct', formato: 'serial' };
export const dataHora = { k: 'generalString', formato: 'dataHora' };
export const enumerado = (nomes) => ({ k: 'enum', nomes });
export const seq = (campos) => ({ k: 'seq', campos });
export const seqOf = (tipo) => ({ k: 'seqOf', tipo });
export const choice = (alternativas) => ({ k: 'choice', alternativas });
/** OCTET STRING cujo conteúdo é outro DER do `tipo` informado. */
export const der = (tipo) => ({ k: 'der', tipo });
/** Campo de SEQUENCE: [nome, tipo, { tag: n (contexto, IMPLICIT), opcional }]. */
export const campo = (nome, tipo, opcoes = {}) => ({ nome, tipo, ...opcoes });

function tagEsperada(tipo, tagContexto) {
  if (tagContexto !== undefined) {
    const construido = ['seq', 'seqOf'].includes(tipo.k);
    return (construido ? 0xa0 : 0x80) | tagContexto;
  }
  return UNIVERSAL[tipo.k];
}

function casa(tipo, no, tagContexto) {
  if (tipo.k === 'choice' && tagContexto === undefined) {
    return Object.keys(tipo.alternativas).some((n) => casa(tipo.alternativas[n][1], no, Number(n)));
  }
  return no.tag === tagEsperada(tipo, tagContexto);
}

function inteiro(valor) {
  if (valor.length === 0) throw new Error('INTEGER vazio');
  let n = BigInt.asIntN(valor.length * 8, BigInt(`0x${valor.toString('hex')}`));
  if (n >= BigInt(Number.MIN_SAFE_INTEGER) && n <= BigInt(Number.MAX_SAFE_INTEGER)) n = Number(n);
  else n = n.toString();
  return n;
}

function bytes(valor, formato) {
  if (formato === 'serial') return valor.toString('hex').toUpperCase();
  if (valor.length <= TAMANHO_MAX_HEX) return valor.toString('hex').toUpperCase();
  return { tamanho: valor.length, sha256: createHash('sha256').update(valor).digest('hex') };
}

function dataHoraLegivel(texto) {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(texto);
  return m ? `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}:${m[6]}` : texto;
}

/** Dump genérico (sem esquema) de um nó: usado para o que a especificação não descreve. */
export function generico(no, profundidade = 0) {
  const tag = `0x${no.tag.toString(16).padStart(2, '0')}`;
  if (no.construido && profundidade < 16) {
    try {
      return { tag, filhos: filhos(no).map((f) => generico(f, profundidade + 1)) };
    } catch {
      return { tag, bytes: bytes(no.valor) };
    }
  }
  if (no.tag === 0x02 || no.tag === 0x0a) return { tag, inteiro: inteiro(no.valor) };
  if (no.tag === 0x1b || no.tag === 0x12 || no.tag === 0x13 || no.tag === 0x0c) return { tag, texto: no.valor.toString('latin1') };
  return { tag, bytes: bytes(no.valor) };
}

/**
 * Decodifica `no` segundo `tipo`. Erros de estrutura viram exceção com o caminho do campo;
 * filhos a mais no fim de uma SEQUENCE vão para `_naoPrevistos` (diferença da especificação, sem perder dado).
 */
export function decodificar(tipo, no, caminho = '$', tagContexto = undefined) {
  if (tipo.k === 'choice') {
    for (const [numero, [nome, tipoAlt]] of Object.entries(tipo.alternativas)) {
      if (casa(tipoAlt, no, Number(numero))) return { [nome]: decodificar(tipoAlt, no, `${caminho}.${nome}`, Number(numero)) };
    }
    throw new Error(`${caminho}: nenhuma alternativa do CHOICE casa com a tag 0x${no.tag.toString(16)}`);
  }
  if (!casa(tipo, no, tagContexto)) {
    throw new Error(`${caminho}: tag 0x${no.tag.toString(16)} inesperada (esperado ${tipo.k})`);
  }
  switch (tipo.k) {
    case 'int': return inteiro(no.valor);
    case 'enum': {
      const codigo = inteiro(no.valor);
      return tipo.nomes[codigo] ?? `desconhecido(${codigo})`;
    }
    case 'oct': return bytes(no.valor, tipo.formato);
    case 'generalString':
    case 'numericString': {
      const texto = no.valor.toString('latin1');
      return tipo.formato === 'dataHora' ? dataHoraLegivel(texto) : texto;
    }
    case 'der': return decodificar(tipo.tipo, lerTlv(no.valor, 0), caminho);
    case 'seqOf': return filhos(no).map((f, i) => decodificar(tipo.tipo, f, `${caminho}[${i}]`));
    case 'seq': {
      const lista = filhos(no);
      const saida = {};
      let i = 0;
      for (const c of tipo.campos) {
        const filho = lista[i];
        if (filho && casa(c.tipo, filho, c.tag)) {
          saida[c.nome] = decodificar(c.tipo, filho, `${caminho}.${c.nome}`, c.tag);
          i++;
        } else if (!c.opcional) {
          throw new Error(`${caminho}.${c.nome}: campo obrigatório ausente ou com tag ${filho ? `0x${filho.tag.toString(16)}` : 'nenhuma'}`);
        }
      }
      if (i < lista.length) saida._naoPrevistos = lista.slice(i).map((f) => generico(f));
      return saida;
    }
    default: throw new Error(`${caminho}: tipo de esquema desconhecido ${tipo.k}`);
  }
}

/** Decodifica um arquivo DER inteiro. */
export const decodificarArquivo = (tipo, buffer) => decodificar(tipo, lerTlv(buffer, 0));
