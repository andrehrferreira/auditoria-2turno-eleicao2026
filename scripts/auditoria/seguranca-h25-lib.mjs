import { createHash } from 'node:crypto';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';

// H25 (engenheiro de segurança): leitura dos certificados de urna e de AC, sem dependência de src/lacres.js
// (que não aceita bytes a mais depois do DER). Usado por seguranca-h25-*.mjs.

export const DIR_H25 = path.join(DIR_DADOS, 'parsed', 'auditoria', 'seguranca-h25');
export const DIR_ACS_H25 = path.join(DIR_DADOS, 'certificados', 'ac');
export const DATA_ELEICAO = { 1: '2026-10-04', 2: '2026-10-25' };

export const sha256 = (b) => createHash('sha256').update(b).digest('hex');

/** Nós DER de b[inicio, fim). Lança se um comprimento passar do limite. */
export function nos(b, inicio = 0, fim = b.length) {
  const lista = [];
  for (let p = inicio; p < fim;) {
    const tag = b[p];
    let q = p + 1;
    let n = b[q++];
    if (n & 0x80) {
      const k = n & 0x7f;
      n = 0;
      for (let j = 0; j < k; j++) n = n * 256 + b[q++];
    }
    if (q + n > fim) throw new Error(`DER: nó em ${p} ultrapassa o limite`);
    lista.push({ tag, p, ini: q, fim: q + n });
    p = q + n;
  }
  return lista;
}

export const OIDS = {
  '2a8648ce3d040304': 'ecdsa-with-SHA512',
  '2b0601040182dc2c0201': 'ed521',
  '2a8648ce3d0201': 'id-ecPublicKey',
  '2b81040023': 'secp521r1',
};
export const oid = (b, n) => {
  const h = b.subarray(n.ini, n.fim).toString('hex');
  return OIDS[h] ?? h;
};
/** UTCTime/GeneralizedTime → { cru, iso } */
export function tempo(b, n) {
  const s = b.subarray(n.ini, n.fim).toString('latin1');
  const m = n.tag === 0x17 ? s.match(/^(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)Z$/) : s.match(/^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)Z$/);
  if (!m) return { cru: s, iso: null };
  const ano = n.tag === 0x17 ? (Number(m[1]) < 50 ? 2000 : 1900) + Number(m[1]) : Number(m[1]);
  return { cru: s, iso: `${ano}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z` };
}
/** CN de um Name (SEQUENCE de SET de AttributeTypeAndValue). */
export function cn(b, nome) {
  for (const rdn of nos(b, nome.ini, nome.fim)) {
    for (const atv of nos(b, rdn.ini, rdn.fim)) {
      const [t, v] = nos(b, atv.ini, atv.fim);
      if (b.subarray(t.ini, t.fim).toString('hex') === '550403') return b.subarray(v.ini, v.fim).toString('latin1');
    }
  }
  return null;
}

/** Lê um certificado DER (bytes exatos) e devolve os campos usados em H25. */
export function campos(der) {
  const [cert] = nos(der);
  const [tbs, algExt, assinatura] = nos(der, cert.ini, cert.fim);
  const f = nos(der, tbs.ini, tbs.fim);
  const temVersao = f[0].tag === 0xa0;
  const [serie, alg, emissor, validade, sujeito, spki, ...resto] = temVersao ? f.slice(1) : f;
  const [nb, na] = nos(der, validade.ini, validade.fim);
  const [algChave, chave] = nos(der, spki.ini, spki.fim);
  const algChaveFilhos = nos(der, algChave.ini, algChave.fim);
  const r = {
    versao: temVersao ? der[nos(der, f[0].ini, f[0].fim)[0].ini] + 1 : 1,
    serie: der.subarray(serie.ini, serie.fim).toString('hex'),
    algTbs: oid(der, nos(der, alg.ini, alg.fim)[0]),
    algExterno: oid(der, nos(der, algExt.ini, algExt.fim)[0]),
    emissor: cn(der, emissor),
    emissorDn: sha256(der.subarray(emissor.p, emissor.fim)).slice(0, 16),
    sujeito: cn(der, sujeito),
    nb: tempo(der, nb),
    na: tempo(der, na),
    algChave: oid(der, algChaveFilhos[0]),
    curva: algChaveFilhos[1]?.tag === 0x06 ? oid(der, algChaveFilhos[1]) : null,
    chaveSha: sha256(der.subarray(chave.ini + 1, chave.fim)),
    tamAssinatura: assinatura.fim - assinatura.ini - 1,
    ski: null, akiKey: null, akiSerie: null, akiEmissor: null, ku: null, ca: null, extensoes: [], urls: [],
  };
  const ext = resto.find((n) => n.tag === 0xa3);
  if (ext) {
    const [lista] = nos(der, ext.ini, ext.fim);
    for (const e of nos(der, lista.ini, lista.fim)) {
      const partes = nos(der, e.ini, e.fim);
      const id = der.subarray(partes[0].ini, partes[0].fim).toString('hex');
      const valor = partes.at(-1);
      r.extensoes.push(id);
      const [v] = nos(der, valor.ini, valor.fim);
      if (id === '551d1f' || id === '551d20') r.urls.push(...(der.subarray(v.ini, v.fim).toString('latin1').match(/https?:\/\/[\x21-\x7e]+/g) ?? []));
      if (id === '551d0e') r.ski = der.subarray(v.ini, v.fim).toString('hex');
      if (id === '551d0f') r.ku = der.subarray(v.ini, v.fim).toString('hex');
      if (id === '551d13') {
        const filhos = nos(der, v.ini, v.fim);
        r.ca = filhos[0]?.tag === 0x01 ? der[filhos[0].ini] !== 0 : false;
      }
      if (id === '551d23') {
        for (const a of nos(der, v.ini, v.fim)) {
          if (a.tag === 0x80) r.akiKey = der.subarray(a.ini, a.fim).toString('hex');
          if (a.tag === 0x82) r.akiSerie = der.subarray(a.ini, a.fim).toString('hex');
          if (a.tag === 0xa1) {
            const [gn] = nos(der, a.ini, a.fim); // [4] directoryName (explícito)
            if (gn?.tag === 0xa4) r.akiEmissor = cn(der, nos(der, gn.ini, gn.fim)[0]);
          }
        }
      }
    }
  }
  return r;
}

/** Fim do primeiro nó DER de b (lê só o cabeçalho: o resto pode ter sobra). */
export function fimPrimeiroNo(b) {
  let q = 1;
  let n = b[q++];
  if (n & 0x80) {
    const k = n & 0x7f;
    n = 0;
    for (let j = 0; j < k; j++) n = n * 256 + b[q++];
  }
  return q + n;
}

/** Campo [1] do bloco HW do .vsc (certificado da urna), com o DER exato e o que sobra depois dele. */
export function certificadoDoVsc(vsc) {
  const [raiz] = nos(vsc);
  for (const bloco of nos(vsc, raiz.ini, raiz.fim)) {
    if (bloco.tag !== 0x30) continue;
    const c = nos(vsc, bloco.ini, bloco.fim).find((x) => x.tag === 0x81);
    if (!c) continue;
    const campo = vsc.subarray(c.ini, c.fim);
    if (campo.subarray(0, 10).toString('latin1') === '-----BEGIN') {
      // PEM (UE2020/UE2022): sobra = o que vem depois da linha END; e bytes do base64 depois do DER.
      const texto = campo.toString('latin1');
      const fimPem = texto.indexOf('-----END CERTIFICATE-----');
      const der = Buffer.from(texto.slice(texto.indexOf('\n') + 1, fimPem).replace(/\s/g, ''), 'base64');
      const fim = fimPrimeiroNo(der);
      if (fim > der.length) throw new Error(`certificado PEM declara ${fim} bytes, base64 tem ${der.length}`);
      const depois = campo.subarray(fimPem + 25);
      return { formato: 'pem', campo: campo.length, der: der.subarray(0, fim), derDeclarado: fim, base64Bytes: der.length,
        sobra: depois.length, sobraHex: depois.toString('hex').slice(0, 32), sobraZeros: false };
    }
    const fim = fimPrimeiroNo(campo);
    if (fim > campo.length) throw new Error(`certificado DER declara ${fim} bytes num campo de ${campo.length}`);
    const sobra = campo.subarray(fim);
    return { formato: 'der', campo: campo.length, der: campo.subarray(0, fim), derDeclarado: fim, sobra: sobra.length,
      sobraHex: sobra.toString('hex').slice(0, 32), sobraZeros: sobra.every((x) => x === 0) };
  }
  throw new Error('bloco HW com certificado não encontrado');
}
