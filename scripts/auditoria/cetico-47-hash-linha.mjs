// Cético revisor, parecer 47 (H20). Complementa seguranca-h20-hash-linha.mjs: o "hash" de cada linha do logd.dat tem
// 16 hexadecimais (64 bits), o tamanho de somas de verificação NÃO criptográficas, que o teste do engenheiro (só resumos
// do OpenSSL) não cobriu. Testa CRC-64 (ECMA-182, XZ/GO-ECMA, ISO, WE, Jones/Redis), FNV-1 e FNV-1a de 64 bits, e
// CRC-32 duplo, sobre as mesmas combinações (linha sozinha, com o hash anterior em texto ou bytes, antes ou depois, com
// tabulação ou fim de linha), em latin1 e utf8, com o resultado em ordem normal e invertida, e procurando o valor
// gravado também como continuação do registro (estado = hash anterior).
// Uso: node scripts/auditoria/cetico-47-hash-linha.mjs --turno 2 --secao ac/01007/0009/0001 [--linhas 6]
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, secao: { type: 'string', default: 'ac/01007/0009/0001' }, linhas: { type: 'string', default: '6' } } });
const dirSecao = path.join(DIR_DADOS, 'raw', `${values.turno}t`, 'urnas', ...values.secao.split('/'));
const hp = (await readdir(dirSecao, { withFileTypes: true })).find((e) => e.isDirectory()).name;
const buf = await readFile(path.join(dirSecao, hp, acharArquivo(await readdir(path.join(dirSecao, hp)), 'log')));
const mem = (b) => ({ read: async (d, o, n, p) => ({ bytesRead: b.copy(d, o, p, p + n) }), stat: async () => ({ size: b.length }) });
const ent = (await listarEntradas(mem(buf))).find((e) => e.nome === 'logd.dat');
const L = (await lerEntrada(mem(buf), ent)).toString('latin1').split('\n').slice(0, Number(values.linhas)).map((l) => l.replace(/\r$/, ''));
const partes = L.map((l) => { const i = l.lastIndexOf('\t'); return { linha: l, corpo: l.slice(0, i), hash: l.slice(i + 1).toUpperCase() }; });

const M = (1n << 64n) - 1n;
const refl = (v, n) => { let r = 0n; for (let i = 0n; i < n; i++) { r = (r << 1n) | (v & 1n); v >>= 1n; } return r; };
function crc64(poly, init, refIn, refOut, xorOut) {
  const tab = [];
  for (let b = 0n; b < 256n; b++) {
    let c = refIn ? refl(b, 8n) << 56n : b << 56n;
    for (let k = 0; k < 8; k++) c = (c & (1n << 63n)) ? ((c << 1n) ^ poly) & M : (c << 1n) & M;
    tab.push(refIn ? refl(c, 64n) : c);
  }
  return (bytes, estado = init) => {
    let c = estado;
    if (refIn) for (const x of bytes) c = (tab[Number((c ^ BigInt(x)) & 0xffn)] ^ (c >> 8n)) & M;
    else for (const x of bytes) c = (tab[Number(((c >> 56n) ^ BigInt(x)) & 0xffn)] ^ (c << 8n)) & M;
    return ((refOut !== refIn ? refl(c, 64n) : c) ^ xorOut) & M;
  };
}
const fnv = (a) => (bytes) => { let h = 0xcbf29ce484222325n; for (const x of bytes) { if (a) { h ^= BigInt(x); h = (h * 0x100000001b3n) & M; } else { h = (h * 0x100000001b3n) & M; h ^= BigInt(x); } } return h; };
const crc32t = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t.push(c >>> 0); } return t; })();
const crc32 = (bytes) => { let c = 0xffffffff; for (const x of bytes) c = crc32t[(c ^ x) & 0xff] ^ (c >>> 8); return BigInt((c ^ 0xffffffff) >>> 0); };
const ALG = {
  'CRC-64/ECMA-182': crc64(0x42F0E1EBA9EA3693n, 0n, false, false, 0n),
  'CRC-64/XZ': crc64(0x42F0E1EBA9EA3693n, M, true, true, M),
  'CRC-64/GO-ISO': crc64(0x1Bn, M, true, true, M),
  'CRC-64/ISO-nao-refletido': crc64(0x1Bn, 0n, false, false, 0n),
  'CRC-64/WE': crc64(0x42F0E1EBA9EA3693n, M, false, false, M),
  'CRC-64/REDIS': crc64(0xAD93D23594C935A9n, 0n, true, true, 0n),
  'FNV-1-64': fnv(false), 'FNV-1a-64': fnv(true),
  'CRC32x2': (b) => (crc32(b) << 32n) | crc32(Buffer.from([...b].reverse())),
};
const hex = (v) => v.toString(16).toUpperCase().padStart(16, '0');
const inv = (h) => h.match(/../g).reverse().join('');
let tentativas = 0, achados = 0;
for (let k = 0; k < partes.length; k++) {
  const { corpo, hash } = partes[k];
  const ant = k ? partes[k - 1] : null;
  const variantes = { corpo, 'corpo\\t': `${corpo}\t`, 'corpo\\n': `${corpo}\n`, 'linha\\n': `${partes[k].linha}\n` };
  if (ant) Object.assign(variantes, { 'ant+corpo': ant.hash + corpo, 'corpo+ant': corpo + ant.hash, 'ant\\tcorpo': `${ant.hash}\t${corpo}`, 'corpo\\tant': `${corpo}\t${ant.hash}`,
    'linhaAnt\\ncorpo': `${ant.linha}\n${corpo}`, 'linhaAnt\\ncorpo\\t': `${ant.linha}\n${corpo}\t`, 'ant(min)+corpo': ant.hash.toLowerCase() + corpo });
  for (const [nome, f] of Object.entries(ALG)) {
    for (const enc of ['latin1', 'utf8']) {
      const lista = Object.entries(variantes).map(([r, v]) => [r, Buffer.from(v, enc)]);
      if (ant) {
        const ab = Buffer.from(ant.hash, 'hex');
        lista.push(['antBin+corpo', Buffer.concat([ab, Buffer.from(corpo, enc)])], ['corpo+antBin', Buffer.concat([Buffer.from(corpo, enc), ab])],
          ['antBinInv+corpo', Buffer.concat([Buffer.from(ab).reverse(), Buffer.from(corpo, enc)])]);
      }
      for (const [r, bytes] of lista) {
        tentativas++;
        const h = hex(f(bytes));
        if (h === hash || inv(h) === hash) { achados++; console.log(`ACHOU linha ${k}: ${nome} ${enc} ${r}`); }
      }
      // continuação: estado inicial = hash anterior (só CRC)
      if (ant && nome.startsWith('CRC-64')) {
        for (const st of [BigInt(`0x${ant.hash}`), BigInt(`0x${inv(ant.hash)}`)]) {
          for (const v of [corpo, `${corpo}\t`, `${corpo}\n`]) {
            tentativas++;
            const h = hex(f(Buffer.from(v, enc), st));
            if (h === hash || inv(h) === hash) { achados++; console.log(`ACHOU linha ${k}: ${nome} ${enc} continuação`); }
          }
        }
      }
    }
  }
}
// autoteste do CRC-64/XZ e do FNV-1a: valores de referência de "123456789"
const ref = Buffer.from('123456789');
const auto = { xz: hex(ALG['CRC-64/XZ'](ref)) === '995DC9BBDF1939FA', ecma: hex(ALG['CRC-64/ECMA-182'](ref)) === '6C40DF5F0B497347', fnv1a: hex(ALG['FNV-1a-64'](Buffer.from('a'))) === 'AF63DC4C8601EC8C' };
console.log(JSON.stringify({ secao: values.secao, turno: values.turno, linhas: partes.length, algoritmos: Object.keys(ALG).length, tentativas, achados, autoteste: auto }));
