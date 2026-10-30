// Parecer cético 33, item (b): confere no arquivo bruto 5 dos 54 certificados AC URNA emitidos depois do vencimento.
// Para cada caso: lê o .vsc da seção (caminho montado da linha de integridade; data/raw não é varrido), separa o
// certificado da urna por método próprio (X509Certificate do Node sobre o trecho "30 82 .. .. 30 82"), grava o DER em
// data/parsed/auditoria/cetico-revisor/33-bruto/ e roda o OpenSSL de linha de comando:
//   x509 -text (emissor, série, validade, AKI), verify -partial_chain com o acurna.der publicado
//   (a) sem conferir data, (b) na data do turno e (c) em 17/07/2026 (AC ainda válida, certificado ainda não emitido).
// Uso: node scripts/auditoria/cetico-33-h25-bruto.mjs   (OPENSSL= muda o caminho do executável)
import { execFileSync } from 'node:child_process';
import { X509Certificate } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DIR_DADOS } from '../../src/config.js';

const CASOS = [
  { t: 2, uf: 'sp', municipio: '71072', zona: '0254', secao: '0024', nota: 'primeiro depois do vencimento (série 34aea5)' },
  { t: 2, uf: 'sp', municipio: '71072', zona: '0004', secao: '0114', nota: 'emitido em 18/10, entre os turnos' },
  { t: 2, uf: 'sp', municipio: '62634', zona: '0214', secao: '0003', nota: 'emitido em 19/10, entre os turnos (urna reserva)' },
  { t: 1, uf: 'pe', municipio: '24198', zona: '0056', secao: '0102', nota: 'só no 1º turno' },
  { t: 1, uf: 'sp', municipio: '63711', zona: '0119', secao: '0173', nota: 'meio da faixa (12/09), urna reserva' },
];
const DIR = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '33-bruto');
await mkdir(DIR, { recursive: true });
const OPENSSL = [process.env.OPENSSL, 'C:/Program Files/Git/mingw64/bin/openssl.exe', 'openssl'].filter(Boolean).find((c) => c === 'openssl' || existsSync(c));
const ossl = (args) => {
  try {
    return { codigo: 0, saida: execFileSync(OPENSSL, args, { cwd: DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim() };
  } catch (e) {
    return { codigo: e.status, saida: `${e.stdout ?? ''}${e.stderr ?? ''}`.trim() };
  }
};
const pem = (der) => `-----BEGIN CERTIFICATE-----\n${der.toString('base64').match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----\n`;
const epoch = (iso) => String(Math.floor(Date.parse(iso) / 1000));
await writeFile(path.join(DIR, 'acurna.pem'), pem(await readFile(path.join(DIR_DADOS, 'certificados', 'ac', 'acurna.der'))));

const resultado = { openssl: ossl(['version']).saida, casos: [] };
for (const c of CASOS) {
  const origem = path.join(DIR_DADOS, 'parsed', 'auditoria', 'integridade', c.t === 2 ? '2t' : '1t-identificadores', `${c.uf}.jsonl`);
  let linha = null;
  for await (const texto of createInterface({ input: createReadStream(origem), crlfDelay: Infinity })) {
    if (!texto.includes(`"secao":"${c.secao}"`) || !texto.includes(`"municipio":"${c.municipio}"`)) continue;
    const l = JSON.parse(texto);
    if (l.papel === 'oficial' && l.zona === c.zona) { linha = l; break; }
  }
  if (!linha) { resultado.casos.push({ ...c, erro: 'linha de integridade não encontrada' }); continue; }
  const caminho = path.join('data', 'raw', `${c.t}t`, 'urnas', c.uf, c.municipio, c.zona, c.secao, linha.hash, linha.vsc);
  const vsc = await readFile(path.join(DIR_DADOS, '..', caminho));
  let der = null;
  for (let i = 0; i + 8 < vsc.length && !der; i++) {
    if (vsc[i] !== 0x30 || vsc[i + 1] !== 0x82 || vsc[i + 4] !== 0x30 || vsc[i + 5] !== 0x82) continue;
    const n = vsc[i + 2] * 256 + vsc[i + 3] + 4;
    try {
      const x = new X509Certificate(vsc.subarray(i, i + n));
      if (/CN=ueao/i.test(x.subject)) der = Buffer.from(vsc.subarray(i, i + n));
    } catch { /* segue */ }
  }
  const nome = `${c.t}t-${c.uf}-${c.municipio}-${c.zona}-${c.secao}`;
  await writeFile(path.join(DIR, `${nome}.pem`), pem(der));
  const x = new X509Certificate(der);
  const texto = ossl(['x509', '-in', `${nome}.pem`, '-noout', '-text']).saida;
  const pega = (re) => (texto.match(re)?.[1] ?? '').trim();
  const verificar = (extra) => ossl(['verify', '-partial_chain', '-trusted', 'acurna.pem', ...extra, `${nome}.pem`]);
  resultado.casos.push({
    ...c, vsc: caminho.replaceAll('\\', '/'), sha256Vsc: linha.sha256Vsc, tamanhoDer: der.length,
    bu: { tipoUrna: linha.bu?.tipoUrna, numeroInternoUrna: linha.bu?.numeroInternoUrna, dataHoraCarga: linha.bu?.dataHoraCarga, abertura: linha.bu?.abertura },
    sujeito: pega(/Subject: (.*)/), emissor: pega(/Issuer: (.*)/), serie: pega(/Serial Number:\s*\n?\s*([^\n]+)/),
    notBefore: pega(/Not Before: (.*)/), notAfter: pega(/Not After : (.*)/),
    aki: texto.slice(texto.indexOf('Authority Key Identifier'), texto.indexOf('serial:', texto.indexOf('Authority Key Identifier')) + 10).replace(/\s+/g, ' '),
    node: { verifyComChaveAcUrna: x.verify(new X509Certificate(await readFile(path.join(DIR_DADOS, 'certificados', 'ac', 'acurna.der'))).publicKey) },
    opensslSemData: verificar(['-no_check_time']),
    opensslNaDataDoTurno: verificar(['-attime', epoch(c.t === 2 ? '2026-10-25T12:00:00Z' : '2026-10-04T12:00:00Z')]),
    opensslEm17deJulho: verificar(['-attime', epoch('2026-07-17T12:00:00Z')]),
  });
}
await writeFile(path.join(DIR, 'resultado.json'), `${JSON.stringify(resultado, null, 1)}\n`);
console.log(JSON.stringify(resultado, null, 1));
