// Cético, parecer 41, item 1(b): certificado de urna das 2 seções da BA zona 71, nos dois turnos, conferido por outro
// caminho (node:crypto / OpenSSL, sem src/lacres.js). Procura no .vsc do pacote cada SEQUENCE DER (30 82 len) que seja
// um X.509 válido e confere a assinatura com o certificado publicado da AC URNA (data/certificados/ac/acurna.der).
// Uso: node scripts/auditoria/cetico-41-certs.mjs
import { X509Certificate } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';

const ac = new X509Certificate(readFileSync(path.join(DIR_DADOS, 'certificados', 'ac', 'acurna.der')));
const cn = (dn) => dn.split('\n').find((x) => x.startsWith('CN=')) ?? dn;
console.log(`AC: ${cn(ac.subject)} série ${ac.serialNumber} ${ac.validFrom} → ${ac.validTo}`);
function certs(b) {
  const out = [];
  for (let i = 0; i < b.length - 4; i++) {
    if (b[i] !== 0x30 || b[i + 1] !== 0x82) continue;
    const len = b.readUInt16BE(i + 2) + 4; if (i + len > b.length) continue;
    try { out.push(new X509Certificate(b.subarray(i, i + len))); i += len - 1; } catch { /* não é certificado */ }
  }
  return out;
}
for (const t of [1, 2]) for (const k of ['ba/33774/0071/0150', 'ba/39144/0071/0170']) {
  const base = path.join(DIR_DADOS, 'raw', `${t}t`, 'urnas', ...k.split('/'));
  const d = readdirSync(base, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  for (const h of d) {
    const vsc = readdirSync(path.join(base, h)).find((n) => n.endsWith('.vsc'));
    for (const c of certs(readFileSync(path.join(base, h, vsc)))) {
      console.log(`${t}t ${k} ${cn(c.subject)} série ${c.serialNumber} ${c.validFrom} → ${c.validTo} emissor ${cn(c.issuer)} assinatura da AC URNA confere: ${c.verify(ac.publicKey)}`);
    }
  }
}
