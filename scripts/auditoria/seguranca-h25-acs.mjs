import { X509Certificate } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { campos, DIR_ACS_H25, DIR_H25, sha256 } from './seguranca-h25-lib.mjs';

// H25, item 3 (engenheiro de segurança): as 3 ACs publicadas em data/certificados/ac/. Para cada uma: SHA-256 do
// arquivo, número de série, emissor, sujeito, validade, algoritmos, SKI/AKI, keyUsage, basicConstraints, URLs de LCR
// e DPC, SHA-256 da chave pública; e as ligações entre elas (quem assina quem, se alguma compartilha chave).
// A origem (pacote oficial do TSE via espelho) está em data/certificados/README.md; este script só lê os arquivos.
// Saída: data/parsed/auditoria/seguranca-h25/acs.json.
//
// Uso: node scripts/auditoria/seguranca-h25-acs.mjs

await mkdir(DIR_H25, { recursive: true });
const acs = [];
for (const arquivo of (await readdir(DIR_ACS_H25)).filter((n) => n.endsWith('.der')).sort()) {
  const bytes = await readFile(path.join(DIR_ACS_H25, arquivo));
  const x = new X509Certificate(bytes);
  const c = campos(bytes);
  acs.push({
    arquivo, tamanho: bytes.length, sha256Arquivo: sha256(bytes), modificadoEm: (await stat(path.join(DIR_ACS_H25, arquivo))).mtime.toISOString(),
    sujeito: c.sujeito, emissor: c.emissor, serie: c.serie, nb: c.nb, na: c.na, algTbs: c.algTbs, algChave: c.algChave, curva: c.curva,
    chaveSha: c.chaveSha, ski: c.ski, akiKey: c.akiKey, akiSerie: c.akiSerie, akiEmissor: c.akiEmissor, ku: c.ku, ca: c.ca, urls: c.urls,
    sujeitoDn: x.subject.replaceAll('\n', ', '), emissorDn: x.issuer.replaceAll('\n', ', '),
  });
}

const ligacoes = [];
for (const a of acs) {
  const pai = acs.find((b) => b.ski && b.ski === a.akiKey);
  ligacoes.push({ ac: a.sujeito, emissor: a.emissor, akiKey: a.akiKey, emissorPublicado: pai ? pai.arquivo : null });
}
const chavesRepetidas = acs.filter((a, i) => acs.findIndex((b) => b.chaveSha === a.chaveSha) !== i).map((a) => a.arquivo);
const resultado = {
  geradoEm: new Date().toISOString(),
  acs,
  ligacoes,
  chavesRepetidasEntreAcs: chavesRepetidas,
  emissoresNaoPublicados: [...new Set(ligacoes.filter((l) => !l.emissorPublicado).map((l) => l.emissor))],
};
await writeFile(path.join(DIR_H25, 'acs.json'), `${JSON.stringify(resultado, null, 1)}\n`);
for (const a of acs) {
  console.log(`${a.arquivo}: ${a.sujeito} ← ${a.emissor} | série ${a.serie} | ${a.nb.iso} a ${a.na.iso} | ${a.algTbs}/${a.algChave}${a.curva ? `/${a.curva}` : ''}`);
  console.log(`  SHA-256 arquivo ${a.sha256Arquivo} | chave ${a.chaveSha.slice(0, 16)}… | SKI ${a.ski} | AKI ${a.akiKey}${a.akiSerie ? ` (emissor ${a.akiEmissor}, série ${a.akiSerie})` : ''}`);
  console.log(`  KU ${a.ku} CA ${a.ca} | ${a.urls.join(' ')}`);
}
console.log(`chaves repetidas entre ACs: ${chavesRepetidas.length}; emissores não publicados: ${resultado.emissoresNaoPublicados.join(', ')}`);
