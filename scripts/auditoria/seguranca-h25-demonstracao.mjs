import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync } from 'node:fs';
import { createPrivateKey, generateKeyPairSync, sign, verify, X509Certificate } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DIR_DADOS } from '../../src/config.js';
import { certificadoDoVsc, DIR_ACS_H25, DIR_H25, nos } from './seguranca-h25-lib.mjs';

// H25, item 5 (engenheiro de segurança): demonstrações simples, em memória e em laboratório, do que a validade vencida
// da AC URNA permite e não permite.
//   A. Com um certificado REAL de urna UE2013 (AC URNA) e o certificado publicado da AC URNA:
//      A1 a assinatura confere; A2 mudar 1 byte da data de validade derruba a assinatura; A3 um certificado "novo"
//      (datas novas, chave nova) assinado com outra chave não confere com a chave da AC URNA; A4 a conta da assinatura
//      não recebe data nenhuma (a validade é uma regra à parte, que o verificador decide aplicar ou não).
//   B. OpenSSL (verificador padrão) com o mesmo par real: na data da eleição recusa por validade vencida; antes de
//      18/07/2026 aceita; com a conferência de data desligada aceita. Mostra que a recusa é só de data.
//   C. Laboratório (chaves de teste geradas na hora, nada do TSE): uma AC "renovada com a mesma chave" ganha número de
//      série novo; o certificado de urna emitido antes aponta (AKI) para a série antiga. O OpenSSL não aceita a renovada
//      como emissora. Reproduz a situação das urnas AC URNA, cujo AKI aponta para "AC RAIZ UE, série 03".
// Saída: data/parsed/auditoria/seguranca-h25/demonstracao.json (e lab/ com os PEM de teste).
//
// Uso: node scripts/auditoria/seguranca-h25-demonstracao.mjs [--uf to]

const UF = process.argv.includes('--uf') ? process.argv[process.argv.indexOf('--uf') + 1] : 'to';
const LAB = path.join(DIR_H25, 'lab');
await rm(LAB, { recursive: true, force: true });
await mkdir(LAB, { recursive: true });
const pem = (der) => `-----BEGIN CERTIFICATE-----\n${der.toString('base64').match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----\n`;
const resultado = { geradoEm: new Date().toISOString() };

// ---- certificado real de urna AC URNA, sem bytes a mais (o primeiro do 2º turno na UF escolhida) ----
let caso = null;
for await (const texto of createInterface({ input: createReadStream(path.join(DIR_DADOS, 'parsed', 'auditoria', 'integridade', '2t', `${UF}.jsonl`)) })) {
  if (!texto.includes('"emissor":"AC URNA"') || !texto.includes('"papel":"oficial"')) continue;
  const l = JSON.parse(texto);
  const vsc = await readFile(path.join(DIR_DADOS, 'raw', '2t', 'urnas', l.uf, l.municipio, l.zona, l.secao, l.hash, l.vsc));
  const c = certificadoDoVsc(vsc);
  if (c.sobra === 0) {
    caso = { onde: `${l.uf}/${l.municipio}/${l.zona}/${l.secao}`, der: c.der };
    break;
  }
}
if (!caso) throw new Error(`nenhum certificado AC URNA sem sobra em ${UF}`);
const acurnaDer = await readFile(path.join(DIR_ACS_H25, 'acurna.der'));
const acurna = new X509Certificate(acurnaDer);
const urna = new X509Certificate(caso.der);
const [cert] = nos(caso.der);
const [tbsNo, , sigNo] = nos(caso.der, cert.ini, cert.fim);
const tbs = caso.der.subarray(tbsNo.p, tbsNo.fim);
const assinatura = caso.der.subarray(sigNo.ini + 1, sigNo.fim);
const confere = (dados, chave) => verify('sha512', dados, chave, assinatura);

// A1
const a1 = confere(tbs, acurna.publicKey);
// A2: soma 1 ao primeiro dígito do ano de vencimento (ex.: 2027 → 2037) dentro do TBS
const camposTbs = nos(caso.der, tbsNo.ini, tbsNo.fim);
const validade = camposTbs[camposTbs[0].tag === 0xa0 ? 4 : 3];
const [, naNo] = nos(caso.der, validade.ini, validade.fim);
const tbs2 = Buffer.from(tbs);
tbs2[naNo.ini - tbsNo.p] += 1;
resultado.A2vencimentoAlterado = { de: tbs.subarray(naNo.ini - tbsNo.p, naNo.fim - tbsNo.p).toString('latin1'), para: tbs2.subarray(naNo.ini - tbsNo.p, naNo.fim - tbsNo.p).toString('latin1') };
const a2 = confere(tbs2, acurna.publicKey);
// A3: certificado forjado = TBS alterado assinado com uma chave P-521 nova (quem não tem a chave da AC)
const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'secp521r1' });
const forjada = sign('sha512', tbs2, privateKey);
const a3 = { comChaveDaAcUrna: verify('sha512', tbs2, acurna.publicKey, forjada), comAChaveDoFalsificador: verify('sha512', tbs2, publicKey, forjada) };
resultado.A = {
  certificado: { onde: caso.onde, sujeito: urna.subject.split('\n').find((x) => x.startsWith('CN=')), serie: urna.serialNumber, validade: [urna.validFrom, urna.validTo], emissor: 'AC URNA' },
  acUrna: { validade: [acurna.validFrom, acurna.validTo] },
  'A1 assinatura original confere com a chave publicada da AC URNA': a1,
  'A2 1 byte da data de vencimento trocado: assinatura confere': a2,
  'A3 TBS alterado assinado com chave nova: confere com a chave da AC URNA': a3.comChaveDaAcUrna,
  'A3 o mesmo, conferido com a chave do falsificador': a3.comAChaveDoFalsificador,
  'A4 a função de verificação recebe data?': 'não: verify(algoritmo, dados, chave pública, assinatura)',
};

// ---- B e C: OpenSSL ----
const candidatos = [process.env.OPENSSL, 'C:/Program Files/Git/mingw64/bin/openssl.exe', 'C:/Program Files/OpenSSL-Win64/bin/openssl.exe', 'openssl'].filter(Boolean);
const OPENSSL = candidatos.find((c) => c === 'openssl' || existsSync(c));
const ossl = (args) => {
  try {
    return { codigo: 0, saida: execFileSync(OPENSSL, args, { cwd: LAB, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim() };
  } catch (erro) {
    return { codigo: erro.status, saida: `${erro.stdout ?? ''}${erro.stderr ?? ''}`.trim() };
  }
};
const epoch = (iso) => String(Math.floor(Date.parse(iso) / 1000));
try {
  resultado.openssl = ossl(['version']).saida;
  await writeFile(path.join(LAB, 'acurna.pem'), pem(acurnaDer));
  await writeFile(path.join(LAB, 'urna-real.pem'), pem(caso.der));
  const verificar = (extra) => ossl(['verify', '-partial_chain', '-trusted', 'acurna.pem', ...extra, 'urna-real.pem']);
  resultado.B = {
    'B1 na data do 2º turno (25/10/2026)': verificar(['-attime', epoch('2026-10-25T12:00:00Z')]),
    'B2 em 01/07/2026 (AC ainda válida)': verificar(['-attime', epoch('2026-07-01T12:00:00Z')]),
    'B3 hoje (depois de 18/07/2026) com a conferência de data desligada': verificar(['-no_check_time']),
  };

  // C: laboratório de "renovação com a mesma chave"
  await writeFile(path.join(LAB, 'ext.cnf'), [
    '[ac]', 'basicConstraints=critical,CA:TRUE', 'keyUsage=critical,keyCertSign,cRLSign', 'subjectKeyIdentifier=hash', 'authorityKeyIdentifier=keyid,issuer:always',
    '[folha]', 'basicConstraints=CA:FALSE', 'keyUsage=digitalSignature', 'subjectKeyIdentifier=hash', 'authorityKeyIdentifier=keyid,issuer:always',
    '[folha_so_keyid]', 'basicConstraints=CA:FALSE', 'keyUsage=digitalSignature', 'subjectKeyIdentifier=hash', 'authorityKeyIdentifier=keyid', '',
  ].join('\n'));
  const passos = [
    ['ecparam', '-name', 'secp521r1', '-genkey', '-noout', '-out', 'raiz.key'],
    ['req', '-x509', '-new', '-key', 'raiz.key', '-subj', '/CN=RAIZ TESTE', '-not_before', '20190101000000Z', '-not_after', '20450101000000Z', '-set_serial', '1', '-sha512', '-out', 'raiz.pem'],
    ['ecparam', '-name', 'secp521r1', '-genkey', '-noout', '-out', 'ac.key'],
    ['req', '-new', '-key', 'ac.key', '-subj', '/CN=AC TESTE', '-out', 'ac.csr'],
    ['x509', '-req', '-in', 'ac.csr', '-CA', 'raiz.pem', '-CAkey', 'raiz.key', '-set_serial', '3', '-not_before', '20200101000000Z', '-not_after', '20250101000000Z', '-sha512', '-extfile', 'ext.cnf', '-extensions', 'ac', '-out', 'ac-serie3.pem'],
    ['ecparam', '-name', 'secp521r1', '-genkey', '-noout', '-out', 'urna.key'],
    ['req', '-new', '-key', 'urna.key', '-subj', '/CN=ueao-teste', '-out', 'urna.csr'],
    ['x509', '-req', '-in', 'urna.csr', '-CA', 'ac-serie3.pem', '-CAkey', 'ac.key', '-set_serial', '100', '-not_before', '20210101000000Z', '-not_after', '20350101000000Z', '-sha512', '-extfile', 'ext.cnf', '-extensions', 'folha', '-out', 'urna-teste.pem'],
    ['x509', '-req', '-in', 'urna.csr', '-CA', 'ac-serie3.pem', '-CAkey', 'ac.key', '-set_serial', '101', '-not_before', '20210101000000Z', '-not_after', '20350101000000Z', '-sha512', '-extfile', 'ext.cnf', '-extensions', 'folha_so_keyid', '-out', 'urna-teste-so-keyid.pem'],
    // "renovação": mesma chave da AC (ac.key / ac.csr), série nova, validade nova
    ['x509', '-req', '-in', 'ac.csr', '-CA', 'raiz.pem', '-CAkey', 'raiz.key', '-set_serial', '4', '-days', '9000', '-sha512', '-extfile', 'ext.cnf', '-extensions', 'ac', '-out', 'ac-serie4-renovada.pem'],
  ];
  const falhou = passos.map((p) => ({ p: p.slice(0, 2).join(' '), r: ossl(p) })).filter((x) => x.r.codigo !== 0);
  if (falhou.length) throw new Error(`laboratório: ${JSON.stringify(falhou)}`);
    const aki = ossl(['x509', '-in', 'urna-teste.pem', '-noout', '-ext', 'authorityKeyIdentifier']).saida;
  resultado.C = {
    'C0 AKI do certificado de urna de teste': aki,
    'C1 em 2023, AC série 3 (válida de 2020 a 2025)': ossl(['verify', '-attime', epoch('2023-06-01T00:00:00Z'), '-CAfile', 'raiz.pem', '-untrusted', 'ac-serie3.pem', 'urna-teste.pem']),
    'C2 hoje, AC série 3 (vencida)': ossl(['verify', '-CAfile', 'raiz.pem', '-untrusted', 'ac-serie3.pem', 'urna-teste.pem']),
    'C3 hoje, AC renovada com a mesma chave (série 4, válida)': ossl(['verify', '-CAfile', 'raiz.pem', '-untrusted', 'ac-serie4-renovada.pem', 'urna-teste.pem']),
    'C3b controle: urna de teste com AKI só keyid (sem série da AC), hoje, AC renovada (série 4)': ossl(['verify', '-CAfile', 'raiz.pem', '-untrusted', 'ac-serie4-renovada.pem', 'urna-teste-so-keyid.pem']),
    'C4 assinatura da urna de teste confere com a chave da AC série 4 (mesma chave)?': (() => {
      const folha = new X509Certificate(execFileSync(OPENSSL, ['x509', '-in', 'urna-teste.pem', '-outform', 'DER'], { cwd: LAB }));
      const ac4 = new X509Certificate(execFileSync(OPENSSL, ['x509', '-in', 'ac-serie4-renovada.pem', '-outform', 'DER'], { cwd: LAB }));
      return folha.verify(ac4.publicKey);
    })(),
    'C5 hoje, AC série 3 vencida, conferência de data desligada': ossl(['verify', '-no_check_time', '-CAfile', 'raiz.pem', '-untrusted', 'ac-serie3.pem', 'urna-teste.pem']),
  };
  createPrivateKey(await readFile(path.join(LAB, 'ac.key'))); // a chave de teste é legível (sanidade do laboratório)
} catch (erro) {
  resultado.erroOpenssl = erro.message;
}
await writeFile(path.join(DIR_H25, 'demonstracao.json'), `${JSON.stringify(resultado, null, 1)}\n`);
console.log(JSON.stringify(resultado, null, 1));
