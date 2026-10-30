// Leitor mínimo de 7z (formato do .logjez das urnas de 2022), sem dependências: cabeçalho simples ou codificado,
// pastas com um único codificador LZMA (03 01 01) ou cópia (00), CRC-32 de cada arquivo conferido.
// O decodificador LZMA segue a especificação de referência (LzmaSpec.cpp, Igor Pavlov, domínio público).
// Uso: lerArquivos7z(buffer) → [{ nome, dados }] (diretórios e arquivos vazios ficam de fora).
import { crc32 } from 'node:zlib';

export const ASSINATURA_7Z = Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]);
export const eh7z = (b) => b.length >= 32 && b.subarray(0, 6).equals(ASSINATURA_7Z);

// ---------------- LZMA ----------------
const PROB_INI = 1024;
function decodificarLzma(props, entrada, inicio, tamanhoSaida) {
  const d = props[0];
  if (d >= 9 * 5 * 5) throw new Error('LZMA: propriedades inválidas');
  const lc = d % 9, lp = Math.floor(d / 9) % 5, pb = Math.floor(d / 45);
  const out = Buffer.allocUnsafe(tamanhoSaida);
  let pos = 0;
  let ip = inicio;
  const fim = entrada.length;
  const byte = () => (ip < fim ? entrada[ip++] : 0);
  if (byte() !== 0) throw new Error('LZMA: primeiro byte do decodificador não é zero');
  let range = 0xffffffff, code = 0;
  for (let i = 0; i < 4; i++) code = ((code * 256) + byte()) >>> 0;
  if (code === range) throw new Error('LZMA: fluxo corrompido');
  const bit = (p, i) => {
    const v = p[i];
    const bound = (range >>> 11) * v;
    let b;
    if (code < bound) { p[i] = v + ((2048 - v) >>> 5); range = bound; b = 0; } else { p[i] = v - (v >>> 5); code -= bound; range -= bound; b = 1; }
    if (range < 0x1000000) { range = (range * 256) >>> 0; code = ((code * 256) + byte()) >>> 0; }
    return b;
  };
  const diretos = (n) => {
    let r = 0;
    while (n--) {
      range >>>= 1;
      let b = 0;
      if (code >= range) { code -= range; b = 1; }
      if (range < 0x1000000) { range = (range * 256) >>> 0; code = ((code * 256) + byte()) >>> 0; }
      r = r * 2 + b;
    }
    return r;
  };
  const arvore = (p, base, n) => { let m = 1; for (let i = 0; i < n; i++) m = (m << 1) + bit(p, base + m); return m - (1 << n); };
  const arvoreRev = (p, base, n) => { let m = 1, s = 0; for (let i = 0; i < n; i++) { const b = bit(p, base + m); m = (m << 1) + b; s |= b << i; } return s; };
  const novo = (n) => new Uint16Array(n).fill(PROB_INI);
  const lit = novo(0x300 << (lc + lp));
  const isMatch = novo(12 << 4), isRep = novo(12), isRepG0 = novo(12), isRepG1 = novo(12), isRepG2 = novo(12), isRep0Long = novo(12 << 4);
  const posSlot = novo(4 << 6), posDec = novo(1 + 114), align = novo(1 << 4);
  const len = () => ({ choice: novo(2), low: novo(16 << 3), mid: novo(16 << 3), high: novo(1 << 8) });
  const lenDec = len(), repLenDec = len();
  const decLen = (L, ps) => {
    if (bit(L.choice, 0) === 0) return arvore(L.low, ps << 3, 3);
    if (bit(L.choice, 1) === 0) return 8 + arvore(L.mid, ps << 3, 3);
    return 16 + arvore(L.high, 0, 8);
  };
  const pbMask = (1 << pb) - 1, lpMask = (1 << lp) - 1;
  let state = 0, rep0 = 0, rep1 = 0, rep2 = 0, rep3 = 0;
  while (pos < tamanhoSaida) {
    const ps = pos & pbMask;
    if (bit(isMatch, (state << 4) + ps) === 0) {
      const prev = pos > 0 ? out[pos - 1] : 0;
      const base = 0x300 * (((pos & lpMask) << lc) + (prev >> (8 - lc)));
      let s = 1;
      if (state >= 7) {
        let mb = out[pos - rep0 - 1];
        do {
          const m = (mb >> 7) & 1;
          mb <<= 1;
          const b = bit(lit, base + ((1 + m) << 8) + s);
          s = (s << 1) | b;
          if (m !== b) break;
        } while (s < 0x100);
      }
      while (s < 0x100) s = (s << 1) | bit(lit, base + s);
      out[pos++] = s - 0x100;
      state = state < 4 ? 0 : state < 10 ? state - 3 : state - 6;
      continue;
    }
    let n;
    if (bit(isRep, state) !== 0) {
      if (pos === 0) throw new Error('LZMA: repetição sem dados');
      if (bit(isRepG0, state) === 0) {
        if (bit(isRep0Long, (state << 4) + ps) === 0) {
          state = state < 7 ? 9 : 11;
          out[pos] = out[pos - rep0 - 1];
          pos++;
          continue;
        }
      } else {
        let dist;
        if (bit(isRepG1, state) === 0) dist = rep1;
        else {
          if (bit(isRepG2, state) === 0) dist = rep2;
          else { dist = rep3; rep3 = rep2; }
          rep2 = rep1;
        }
        rep1 = rep0;
        rep0 = dist;
      }
      n = decLen(repLenDec, ps);
      state = state < 7 ? 8 : 11;
    } else {
      rep3 = rep2; rep2 = rep1; rep1 = rep0;
      n = decLen(lenDec, ps);
      state = state < 7 ? 7 : 10;
      const ls = n < 3 ? n : 3;
      const slot = arvore(posSlot, ls << 6, 6);
      if (slot < 4) rep0 = slot;
      else {
        const nd = (slot >> 1) - 1;
        let dist = (2 | (slot & 1)) * 2 ** nd;
        if (slot < 14) dist += arvoreRev(posDec, dist - slot, nd);
        else dist += diretos(nd - 4) * 16 + arvoreRev(align, 0, 4);
        rep0 = dist >>> 0;
      }
      if (rep0 === 0xffffffff) break; // marcador de fim
      if (rep0 >= pos) throw new Error('LZMA: distância além dos dados');
    }
    n += 2;
    if (n > tamanhoSaida - pos) throw new Error('LZMA: repetição passa do tamanho declarado');
    const de = pos - rep0 - 1;
    for (let i = 0; i < n; i++) out[pos + i] = out[de + i];
    pos += n;
  }
  if (pos !== tamanhoSaida) throw new Error(`LZMA: saída com ${pos} de ${tamanhoSaida} bytes`);
  return out;
}

// ---------------- 7z ----------------
const K = { End: 0x00, Header: 0x01, ArchiveProperties: 0x02, AdditionalStreamsInfo: 0x03, MainStreamsInfo: 0x04, FilesInfo: 0x05, PackInfo: 0x06, UnPackInfo: 0x07, SubStreamsInfo: 0x08, Size: 0x09, CRC: 0x0a, Folder: 0x0b, CodersUnPackSize: 0x0c, NumUnPackStream: 0x0d, EmptyStream: 0x0e, EmptyFile: 0x0f, Name: 0x11, EncodedHeader: 0x17, Dummy: 0x19 };

function leitor(buf) {
  let p = 0;
  const r = {
    get pos() { return p; },
    byte() { if (p >= buf.length) throw new Error('7z: cabeçalho truncado'); return buf[p++]; },
    num() {
      const first = r.byte();
      let mask = 0x80, valor = 0;
      for (let i = 0; i < 8; i++) {
        if ((first & mask) === 0) return valor + (first & (mask - 1)) * 2 ** (8 * i);
        valor += r.byte() * 2 ** (8 * i);
        mask >>= 1;
      }
      return valor;
    },
    bytes(n) { if (p + n > buf.length) throw new Error('7z: cabeçalho truncado'); const b = buf.subarray(p, p + n); p += n; return b; },
    u32() { const v = buf.readUInt32LE(p); p += 4; return v; },
    pular(n) { p += n; },
  };
  return r;
}
const bits = (r, n) => { const v = []; let b = 0, m = 0; for (let i = 0; i < n; i++) { if (m === 0) { b = r.byte(); m = 0x80; } v.push((b & m) !== 0); m >>= 1; } return v; };
const definidos = (r, n) => (r.byte() !== 0 ? new Array(n).fill(true) : bits(r, n));
function digests(r, n) { const def = definidos(r, n); return def.map((d) => (d ? r.u32() : null)); }

function lerPackInfo(r) {
  const info = { packPos: r.num(), tamanhos: [], crcs: [] };
  const n = r.num();
  for (;;) {
    const id = r.byte();
    if (id === K.End) break;
    if (id === K.Size) for (let i = 0; i < n; i++) info.tamanhos.push(r.num());
    else if (id === K.CRC) info.crcs = digests(r, n);
    else throw new Error(`7z: propriedade ${id} inesperada em PackInfo`);
  }
  return info;
}
function lerFolder(r) {
  const nc = r.num();
  const coders = [];
  let totIn = 0, totOut = 0;
  for (let i = 0; i < nc; i++) {
    const f = r.byte();
    const id = r.bytes(f & 0x0f).toString('hex');
    const complexo = (f & 0x10) !== 0;
    const nIn = complexo ? r.num() : 1, nOut = complexo ? r.num() : 1;
    const props = (f & 0x20) ? Buffer.from(r.bytes(r.num())) : null;
    if (f & 0x80) throw new Error('7z: codificador com métodos alternativos');
    coders.push({ id, nIn, nOut, props });
    totIn += nIn; totOut += nOut;
  }
  const pares = [];
  for (let i = 0; i < totOut - 1; i++) pares.push([r.num(), r.num()]);
  const nPacked = totIn - pares.length;
  const packed = [];
  if (nPacked > 1) for (let i = 0; i < nPacked; i++) packed.push(r.num());
  return { coders, totOut, pares, nPacked, tamanhos: [] };
}
function lerUnpackInfo(r) {
  if (r.byte() !== K.Folder) throw new Error('7z: UnPackInfo sem kFolder');
  const n = r.num();
  if (r.byte() !== 0) throw new Error('7z: pastas externas não suportadas');
  const folders = [];
  for (let i = 0; i < n; i++) folders.push(lerFolder(r));
  if (r.byte() !== K.CodersUnPackSize) throw new Error('7z: UnPackInfo sem kCodersUnPackSize');
  for (const f of folders) for (let i = 0; i < f.totOut; i++) f.tamanhos.push(r.num());
  for (;;) {
    const id = r.byte();
    if (id === K.End) break;
    if (id === K.CRC) digests(r, n).forEach((c, i) => { folders[i].crc = c; });
    else throw new Error(`7z: propriedade ${id} inesperada em UnPackInfo`);
  }
  return folders;
}
function lerSubStreams(r, folders) {
  const nPor = folders.map(() => 1);
  let id = r.byte();
  if (id === K.NumUnPackStream) { for (let i = 0; i < folders.length; i++) nPor[i] = r.num(); id = r.byte(); }
  const tamanhos = [];
  const temTam = id === K.Size;
  folders.forEach((f, i) => {
    if (nPor[i] === 0) return;
    const total = f.tamanhos[f.tamanhos.length - 1];
    let soma = 0;
    for (let j = 0; j < nPor[i] - 1; j++) { const t = temTam ? r.num() : 0; tamanhos.push(t); soma += t; }
    tamanhos.push(total - soma);
  });
  if (temTam) id = r.byte();
  let crcs = [];
  const semCrc = [];
  folders.forEach((f, i) => { for (let j = 0; j < nPor[i]; j++) semCrc.push(!(nPor[i] === 1 && f.crc != null)); });
  for (;;) {
    if (id === K.End) break;
    if (id === K.CRC) {
      const nDesc = semCrc.filter(Boolean).length;
      const d = digests(r, nDesc);
      let k = 0, s = 0;
      crcs = [];
      folders.forEach((f, i) => { for (let j = 0; j < nPor[i]; j++) { crcs.push(semCrc[s] ? d[k++] : f.crc); s++; } });
    } else throw new Error(`7z: propriedade ${id} inesperada em SubStreamsInfo`);
    id = r.byte();
  }
  if (!crcs.length) folders.forEach((f, i) => { for (let j = 0; j < nPor[i]; j++) crcs.push(nPor[i] === 1 ? f.crc ?? null : null); });
  return { nPor, tamanhos, crcs };
}
function lerStreamsInfo(r) {
  const s = { pack: null, folders: [], sub: null };
  for (;;) {
    const id = r.byte();
    if (id === K.End) break;
    if (id === K.PackInfo) s.pack = lerPackInfo(r);
    else if (id === K.UnPackInfo) s.folders = lerUnpackInfo(r);
    else if (id === K.SubStreamsInfo) s.sub = lerSubStreams(r, s.folders);
    else throw new Error(`7z: propriedade ${id} inesperada em StreamsInfo`);
  }
  if (!s.sub) s.sub = { nPor: s.folders.map(() => 1), tamanhos: s.folders.map((f) => f.tamanhos[f.tamanhos.length - 1]), crcs: s.folders.map((f) => f.crc ?? null) };
  return s;
}
/** Descomprime todas as pastas; devolve um Buffer por pasta. */
function desempacotar(buf, s) {
  let off = 32 + s.pack.packPos;
  return s.folders.map((f, i) => {
    if (f.coders.length !== 1 || f.nPacked !== 1) throw new Error('7z: pasta com mais de um codificador não suportada');
    const tamPack = s.pack.tamanhos[i];
    const pack = buf.subarray(off, off + tamPack);
    if (pack.length !== tamPack) throw new Error('7z: fluxo empacotado truncado');
    off += tamPack;
    const c = f.coders[0], tam = f.tamanhos[0];
    let dados;
    if (c.id === '00') dados = Buffer.from(pack);
    else if (c.id === '030101') dados = decodificarLzma(c.props, pack, 0, tam);
    else throw new Error(`7z: método ${c.id} não suportado`);
    if (f.crc != null && crc32(dados) !== f.crc) throw new Error('7z: CRC da pasta divergente');
    return dados;
  });
}

export function lerArquivos7z(buf) {
  if (!eh7z(buf)) throw new Error('7z: assinatura ausente');
  const ini = buf.subarray(12, 32);
  if (crc32(ini) !== buf.readUInt32LE(8)) throw new Error('7z: CRC do cabeçalho inicial divergente');
  const offNext = Number(buf.readBigUInt64LE(12)), tamNext = Number(buf.readBigUInt64LE(20)), crcNext = buf.readUInt32LE(28);
  let cab = buf.subarray(32 + offNext, 32 + offNext + tamNext);
  if (cab.length !== tamNext || crc32(cab) !== crcNext) throw new Error('7z: cabeçalho final truncado ou com CRC divergente');
  let r = leitor(cab);
  let id = r.byte();
  while (id === K.EncodedHeader) {
    const s = lerStreamsInfo(r);
    cab = desempacotar(buf, s)[0];
    r = leitor(cab);
    id = r.byte();
  }
  if (id !== K.Header) throw new Error(`7z: cabeçalho inesperado ${id}`);
  let streams = { pack: null, folders: [], sub: { nPor: [], tamanhos: [], crcs: [] } };
  const nomes = [];
  let vazios = [];
  for (;;) {
    id = r.byte();
    if (id === K.End) break;
    if (id === K.ArchiveProperties) { for (;;) { const t = r.byte(); if (t === K.End) break; r.pular(r.num()); } }
    else if (id === K.AdditionalStreamsInfo) lerStreamsInfo(r);
    else if (id === K.MainStreamsInfo) streams = lerStreamsInfo(r);
    else if (id === K.FilesInfo) {
      const n = r.num();
      vazios = new Array(n).fill(false);
      for (;;) {
        const t = r.byte();
        if (t === K.End) break;
        const tam = r.num();
        const fimProp = r.pos + tam;
        if (t === K.EmptyStream) vazios = bits(r, n);
        else if (t === K.Name) {
          if (r.byte() !== 0) throw new Error('7z: nomes externos não suportados');
          const b = r.bytes(tam - 1);
          let a = 0;
          for (let i = 0; i < n; i++) { let z = a; while (b.readUInt16LE(z) !== 0) z += 2; nomes.push(b.toString('utf16le', a, z)); a = z + 2; }
        }
        r.pular(fimProp - r.pos);
      }
    } else throw new Error(`7z: propriedade ${id} inesperada no cabeçalho`);
  }
  const pastas = streams.folders.length ? desempacotar(buf, streams) : [];
  const fluxos = [];
  let k = 0;
  pastas.forEach((dados, i) => {
    let off = 0;
    for (let j = 0; j < streams.sub.nPor[i]; j++) { const t = streams.sub.tamanhos[k]; fluxos.push({ dados: dados.subarray(off, off + t), crc: streams.sub.crcs[k] }); off += t; k++; }
  });
  const saida = [];
  let f = 0;
  nomes.forEach((nome, i) => {
    if (vazios[i]) return;
    const s = fluxos[f++];
    if (!s) throw new Error('7z: mais arquivos que fluxos');
    if (s.crc != null && crc32(s.dados) !== s.crc) throw new Error(`7z: CRC divergente em ${nome}`);
    saida.push({ nome, dados: s.dados });
  });
  return saida;
}
