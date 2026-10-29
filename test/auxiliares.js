import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { crc32, deflateRawSync } from 'node:zlib';

export async function diretorioTemporario(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'auditoria-teste-'));
  // No Windows, arquivo recém-criado pode ficar com exclusão pendente (ENOTEMPTY no rmdir); maxRetries cobre isso.
  t.after(() => rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 }));
  return dir;
}

export function der(tag, conteudo) {
  const n = conteudo.length;
  let comprimento;
  if (n < 0x80) {
    comprimento = Buffer.from([n]);
  } else {
    const bytes = [];
    for (let x = n; x > 0; x = Math.floor(x / 256)) bytes.unshift(x & 0xff);
    comprimento = Buffer.from([0x80 | bytes.length, ...bytes]);
  }
  return Buffer.concat([Buffer.from([tag]), comprimento, conteudo]);
}

const seq = (...partes) => der(0x30, Buffer.concat(partes));

export function entradaVsc(nome, sha512) {
  return seq(
    der(0x1b, Buffer.from(nome, 'latin1')),
    seq(der(0x02, Buffer.from([0x01, 0x23])), der(0x04, sha512), der(0x04, Buffer.alloc(150, 0x24))),
  );
}

/** vota.vsc sintético no mesmo formato do TSE: lista de arquivos dentro de OCTET STRING. */
export function montarVsc(arquivos, { entradasExtras = [] } = {}) {
  const entradas = arquivos.map(({ nome, buffer }) => entradaVsc(nome, createHash('sha512').update(buffer).digest()));
  const lista = seq(seq(...entradas, ...entradasExtras));
  return seq(
    seq(der(0x1b, Buffer.from('20261025T170348')), der(0x02, Buffer.from([2])), der(0x04, lista)),
    seq(der(0x0a, Buffer.from([0x16]))),
  );
}

/** ZIP sintético (stored/deflate), opcionalmente em formato ZIP64. */
export function montarZip(arquivos, { zip64 = false } = {}) {
  const locais = [];
  const centrais = [];
  let offset = 0;

  for (const { nome, dados, comprimir = false } of arquivos) {
    const nomeBuf = Buffer.from(nome, 'latin1');
    const corpo = comprimir ? deflateRawSync(dados) : dados;
    const crc = crc32(dados);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(zip64 ? 45 : 20, 4);
    local.writeUInt16LE(comprimir ? 8 : 0, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(corpo.length, 18);
    local.writeUInt32LE(dados.length, 22);
    local.writeUInt16LE(nomeBuf.length, 26);
    locais.push(local, nomeBuf, corpo);

    const extra = zip64 ? Buffer.alloc(28) : Buffer.alloc(0);
    if (zip64) {
      extra.writeUInt16LE(0x0001, 0);
      extra.writeUInt16LE(24, 2);
      extra.writeBigUInt64LE(BigInt(dados.length), 4);
      extra.writeBigUInt64LE(BigInt(corpo.length), 12);
      extra.writeBigUInt64LE(BigInt(offset), 20);
    }
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(zip64 ? 45 : 20, 4);
    central.writeUInt16LE(zip64 ? 45 : 20, 6);
    central.writeUInt16LE(comprimir ? 8 : 0, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(zip64 ? 0xffffffff : corpo.length, 20);
    central.writeUInt32LE(zip64 ? 0xffffffff : dados.length, 24);
    central.writeUInt16LE(nomeBuf.length, 28);
    central.writeUInt16LE(extra.length, 30);
    central.writeUInt32LE(zip64 ? 0xffffffff : offset, 42);
    centrais.push(central, nomeBuf, extra);

    offset += 30 + nomeBuf.length + corpo.length;
  }

  const cd = Buffer.concat(centrais);
  const finais = [];
  if (zip64) {
    const eocd64 = Buffer.alloc(56);
    eocd64.writeUInt32LE(0x06064b50, 0);
    eocd64.writeBigUInt64LE(44n, 4);
    eocd64.writeBigUInt64LE(BigInt(arquivos.length), 24);
    eocd64.writeBigUInt64LE(BigInt(arquivos.length), 32);
    eocd64.writeBigUInt64LE(BigInt(cd.length), 40);
    eocd64.writeBigUInt64LE(BigInt(offset), 48);
    const localizador = Buffer.alloc(20);
    localizador.writeUInt32LE(0x07064b50, 0);
    localizador.writeBigUInt64LE(BigInt(offset + cd.length), 8);
    localizador.writeUInt32LE(1, 16);
    finais.push(eocd64, localizador);
  }
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(zip64 ? 0xffff : arquivos.length, 8);
  eocd.writeUInt16LE(zip64 ? 0xffff : arquivos.length, 10);
  eocd.writeUInt32LE(zip64 ? 0xffffffff : cd.length, 12);
  eocd.writeUInt32LE(zip64 ? 0xffffffff : offset, 16);
  finais.push(eocd);

  return Buffer.concat([...locais, cd, ...finais]);
}
