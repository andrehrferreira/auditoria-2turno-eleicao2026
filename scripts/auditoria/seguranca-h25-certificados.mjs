import { verify, X509Certificate } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { verificarEd521 } from '../../src/ed521.js';
import { campos, certificadoDoVsc, DIR_ACS_H25, DIR_H25, nos, sha256 } from './seguranca-h25-lib.mjs';

// H25 (engenheiro de segurança): extrai o certificado de cada urna, diretório por diretório, de um turno inteiro.
// Universo: as linhas "oficial" da extração de integridade (2º turno: integridade/2t/<uf>.jsonl; 1º turno:
// integridade/1t-identificadores/<uf>.jsonl, que lista todos os diretórios do 1º turno). O caminho do .vsc é montado
// a partir da linha (data/raw/<t>t/urnas/<uf>/<mun>/<zona>/<secao>/<hash>/<vsc>); data/raw não é varrido.
// Para cada certificado grava: formato (PEM/DER), tamanho do campo [1] e do DER, bytes que sobram depois do DER,
// número de série, emissor, sujeito, validade (texto cru e ISO), algoritmos, SHA-256 da chave pública e do DER,
// extensões SKI, AKI (keyid, emissor e série da AC), keyUsage, basicConstraints; se o DER cortado abre como X.509
// (x509ok) e se a assinatura da AC sobre o certificado confere (assinaturaAc):
//   - AC URNA (ECDSA P-521, node:crypto): sempre;
//   - AC UE2020/AC UE2022 (Ed521, src/ed521.js, lento): só com --ed521; com --ed521-exceto <t> confere só os
//     certificados que não aparecem em <t>t-certs.jsonl (os do outro turno já conferidos por integridade-lacres).
// Saída: data/parsed/auditoria/seguranca-h25/<t>t-certs.jsonl (uma linha por diretório).
//
// Uso: node scripts/auditoria/seguranca-h25-certificados.mjs --turno 2 [--conc 32] [--uf ac,al] [--ed521 | --ed521-exceto 2]

const { values } = parseArgs({ options: {
  turno: { type: 'string', default: '2' }, conc: { type: 'string', default: '32' }, uf: { type: 'string' },
  ed521: { type: 'boolean', default: false }, 'ed521-exceto': { type: 'string' },
} });
const T = Number(values.turno);
const CONC = Number(values.conc);
const ufs = values.uf ? values.uf.split(',') : UFS;
const ORIGEM = path.join(DIR_DADOS, 'parsed', 'auditoria', 'integridade', T === 2 ? '2t' : '1t-identificadores');
await mkdir(DIR_H25, { recursive: true });

// Chaves das ACs: AC URNA (ECDSA) como KeyObject; AC UE2020/UE2022 (Ed521) como bytes crus.
const acs = {};
for (const n of ['acurna.der', 'acue2020.der', 'acue2022.der']) {
  const der = await readFile(path.join(DIR_ACS_H25, n));
  const c = campos(der);
  const [cert] = nos(der);
  const [tbs] = nos(der, cert.ini, cert.fim);
  const camposTbs = nos(der, tbs.ini, tbs.fim);
  const spki = camposTbs[camposTbs[0].tag === 0xa0 ? 6 : 5];
  const [, bits] = nos(der, spki.ini, spki.fim);
  acs[c.sujeito] = { algoritmo: c.algChave, chave: c.algChave === 'ed521' ? null : new X509Certificate(der).publicKey, chaveCrua: der.subarray(bits.ini + 1, bits.fim) };
}
let jaConferidos = null;
if (values['ed521-exceto']) {
  jaConferidos = new Set();
  const rl = createInterface({ input: createReadStream(path.join(DIR_H25, `${values['ed521-exceto']}t-certs.jsonl`)), crlfDelay: Infinity });
  for await (const l of rl) {
    const m = l.match(/"certSha":"([0-9a-f]+)"/);
    if (m) jaConferidos.add(m[1]);
  }
}

/** Assinatura da AC emissora sobre o TBS do certificado da urna; null se não conferida aqui. */
function assinaturaDaAc(der, emissor, certSha) {
  const ac = acs[emissor];
  if (!ac) return false;
  const [cert] = nos(der);
  const [tbs, , sig] = nos(der, cert.ini, cert.fim);
  const dados = der.subarray(tbs.p, tbs.fim);
  const assinatura = der.subarray(sig.ini + 1, sig.fim);
  if (ac.algoritmo !== 'ed521') return verify('sha512', dados, ac.chave, assinatura);
  if (values.ed521 || (jaConferidos && !jaConferidos.has(certSha))) return verificarEd521(ac.chaveCrua, dados, assinatura);
  return null;
}

async function processar(l) {
  const dir = path.join(DIR_DADOS, 'raw', `${T}t`, 'urnas', l.uf, l.municipio, l.zona, l.secao, l.hash);
  const base = {
    t: T, uf: l.uf, mun: l.municipio, zona: l.zona, secao: l.secao, hash: l.hash.slice(0, 24),
    modelo: l.vscInfo?.modelo ?? null, idHW: l.vscInfo?.idHW ?? null, tipoUrna: l.bu?.tipoUrna ?? null,
    origem: l.bu?.origem ?? null, numeroInternoUrna: l.bu?.numeroInternoUrna ?? null,
    falhasLacres: Array.isArray(l.falhas) ? l.falhas.length : null,
  };
  try {
    const vsc = await readFile(path.join(dir, l.vsc));
    const { der, ...resto } = certificadoDoVsc(vsc);
    const certSha = sha256(der);
    const c = campos(der);
    let x509ok = true;
    try {
      new X509Certificate(der);
    } catch {
      x509ok = false;
    }
    return { ...base, ...resto, certSha, ...c, x509ok, assinaturaAc: assinaturaDaAc(der, c.emissor, certSha) };
  } catch (erro) {
    return { ...base, erro: erro.message };
  }
}

const saida = createWriteStream(path.join(DIR_H25, `${T}t-certs.jsonl`));
let total = 0;
let erros = 0;
const inicio = Date.now();
for (const uf of ufs) {
  const linhas = [];
  const rl = createInterface({ input: createReadStream(path.join(ORIGEM, `${uf}.jsonl`)), crlfDelay: Infinity });
  for await (const texto of rl) {
    if (!texto.includes('"papel":"oficial"')) continue;
    const l = JSON.parse(texto);
    if (l.papel !== 'oficial' || !l.vsc || !l.hash) continue;
    linhas.push({ uf: l.uf, municipio: l.municipio, zona: l.zona, secao: l.secao, hash: l.hash, vsc: l.vsc, vscInfo: l.vscInfo, bu: l.bu, falhas: l.falhas });
  }
  let i = 0;
  const trabalhador = async () => {
    while (i < linhas.length) {
      const r = await processar(linhas[i++]);
      if (r.erro) erros++;
      saida.write(`${JSON.stringify(r)}\n`);
      total++;
    }
  };
  await Promise.all(Array.from({ length: CONC }, trabalhador));
  console.log(`${uf}: ${linhas.length} diretórios; acumulado ${total}, ${erros} erro(s), ${Math.round((Date.now() - inicio) / 1000)} s`);
}
await new Promise((ok) => saida.end(ok));
console.log(`turno ${T}: ${total} diretórios, ${erros} erro(s)`);
