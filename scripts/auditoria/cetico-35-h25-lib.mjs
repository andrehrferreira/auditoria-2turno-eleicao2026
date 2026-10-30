import { createHash } from 'node:crypto';

// Parecer 35 do cético (H25): leitor TLV próprio, extração do certificado do .vsc e esqueleto do certificado.
// Independente de seguranca-h25-lib.mjs. Usado por cetico-35-h25-*.mjs.

export const h = (alg, b) => createHash(alg).update(b).digest('hex');

/** Um nó TLV em b[p]: { tag, p, ini, fim, nlen } (nlen = bytes do comprimento). Lança se passar do limite. */
export function tlv(b, p, lim = b.length) {
  if (p + 2 > lim) throw new Error(`TLV curto em ${p}`);
  const tag = b[p];
  let q = p + 1;
  const c0 = b[q++];
  let n = c0;
  let nlen = 1;
  if (c0 & 0x80) {
    const k = c0 & 0x7f;
    if (k === 0 || k > 4) throw new Error(`comprimento inválido em ${p}`);
    n = 0;
    for (let j = 0; j < k; j++) n = n * 256 + b[q++];
    nlen = 1 + k;
  }
  if (q + n > lim) throw new Error(`nó em ${p} passa do limite`);
  return { tag, p, ini: q, fim: q + n, nlen };
}
export function filhos(b, ini, fim) {
  const r = [];
  for (let p = ini; p < fim;) { const n = tlv(b, p, fim); r.push(n); p = n.fim; }
  return r;
}

/** Certificado do .vsc: o bloco SEQUENCE com campo [1] (0x81). DER direto (UE2013/2015) ou PEM (UE2020/2022). */
export function certDoVsc(vsc) {
  const raiz = tlv(vsc, 0);
  for (const bloco of filhos(vsc, raiz.ini, raiz.fim)) {
    if (bloco.tag !== 0x30) continue;
    const c = filhos(vsc, bloco.ini, bloco.fim).find((x) => x.tag === 0x81);
    if (!c) continue;
    let campo = vsc.subarray(c.ini, c.fim);
    if (campo.subarray(0, 5).toString('latin1') === '-----') {
      const s = campo.toString('latin1');
      const a = s.indexOf('-----BEGIN CERTIFICATE-----');
      const z = s.indexOf('-----END CERTIFICATE-----');
      campo = Buffer.from(s.slice(a + 27, z).replace(/[^A-Za-z0-9+/=]/g, ''), 'base64');
    }
    const n = tlv(campo, 0);
    const sobra = campo.subarray(n.fim);
    return { der: Buffer.from(campo.subarray(0, n.fim)), sobra: sobra.length, sobraZero: sobra.every((x) => x === 0) };
  }
  throw new Error('certificado não encontrado no .vsc');
}

/** Esqueleto do certificado (ver cabeçalho). Devolve { texto, ski, chave }. */
export function esqueleto(der) {
  const partes = [];
  let skiValor = null;
  let chaveBits = null;
  const prim = (n) => `${n.tag.toString(16)}/${n.nlen}/${n.fim - n.ini}:${der.subarray(n.ini, n.fim).toString('hex')}`;
  const cons = (n, dentro) => `${n.tag.toString(16)}/${n.nlen}{${dentro}}`; // comprimento total varia com os campos mascarados
  const geral = (n, prof = 0) => {
    if (n.tag & 0x20) return cons(n, filhos(der, n.ini, n.fim).map((x) => geral(x, prof + 1)).join(','));
    return prim(n);
  };
  const nome = (n, mascararDigitosCN) => cons(n, filhos(der, n.ini, n.fim).map((rdn) => cons(rdn, filhos(der, rdn.ini, rdn.fim).map((atv) => {
    const [t, v] = filhos(der, atv.ini, atv.fim);
    const oid = der.subarray(t.ini, t.fim).toString('hex');
    if (mascararDigitosCN && oid === '550403') {
      const val = der.subarray(v.ini, v.fim).toString('latin1').replace(/[0-9]/g, '9');
      return cons(atv, `${prim(t)},${v.tag.toString(16)}/${v.nlen}/${v.fim - v.ini}:"${val}"`);
    }
    return cons(atv, `${prim(t)},${prim(v)}`);
  }).join(','))).join(','));
  const cert = tlv(der, 0);
  if (cert.fim !== der.length) throw new Error('bytes depois do certificado');
  const [tbs, alg, assin, ...extraTopo] = filhos(der, cert.ini, cert.fim);
  const f = filhos(der, tbs.ini, tbs.fim);
  let i = 0;
  const out = [];
  if (f[0].tag === 0xa0) out.push(geral(f[i++]));
  const serie = f[i++];
  out.push(`serie:${serie.tag.toString(16)}/${serie.nlen}/MASC`);
  out.push(geral(f[i++])); // algoritmo
  out.push(nome(f[i++], false)); // emissor
  const val = f[i++];
  out.push(cons(val, filhos(der, val.ini, val.fim).map((d) => `${d.tag.toString(16)}/${d.nlen}/${d.fim - d.ini}:MASC`).join(',')));
  out.push(nome(f[i++], true)); // sujeito
  const spki = f[i++];
  const [algK, bits] = filhos(der, spki.ini, spki.fim);
  chaveBits = der.subarray(bits.ini + 1, bits.fim);
  out.push(cons(spki, `${geral(algK)},${bits.tag.toString(16)}/${bits.nlen}/${bits.fim - bits.ini}:${der[bits.ini].toString(16)}+MASC`));
  for (; i < f.length; i++) {
    const n = f[i];
    if (n.tag !== 0xa3) { out.push(geral(n)); continue; }
    const [lista] = filhos(der, n.ini, n.fim);
    out.push(cons(n, cons(lista, filhos(der, lista.ini, lista.fim).map((e) => {
      const ps = filhos(der, e.ini, e.fim);
      const oid = der.subarray(ps[0].ini, ps[0].fim).toString('hex');
      if (oid === '551d0e') {
        const oct = ps.at(-1);
        const [dentro] = filhos(der, oct.ini, oct.fim);
        skiValor = der.subarray(dentro.ini, dentro.fim).toString('hex');
        return cons(e, `${ps.slice(0, -1).map(prim).join(',')},${oct.tag.toString(16)}/${oct.nlen}/${oct.fim - oct.ini}:{${dentro.tag.toString(16)}/${dentro.nlen}/${dentro.fim - dentro.ini}:MASC}`);
      }
      return geral(e);
    }).join(','))));
  }
  const texto = `C{TBS{${out.join(',')}},${geral(alg)},assin:${assin.tag.toString(16)}/MASC${extraTopo.length ? `,EXTRA${extraTopo.length}` : ''}}`;
  return { texto, ski: skiValor, chave: chaveBits };
}
