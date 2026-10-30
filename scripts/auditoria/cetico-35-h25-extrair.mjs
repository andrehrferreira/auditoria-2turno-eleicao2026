import { X509Certificate } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { certDoVsc, esqueleto, h } from './cetico-35-h25-lib.mjs';

// Parecer 35 do cético (H25, doc 08 do engenheiro de segurança): conferência INDEPENDENTE do "molde" dos certificados de urna.
// Não usa seguranca-h25-lib.mjs nem seguranca-h25-padrao-extrair.mjs:
//   - leitor TLV próprio (tlv/filhos abaixo) para tirar o certificado do .vsc e montar o esqueleto;
//   - X509Certificate do Node (OpenSSL) para sujeito, emissor, série e datas;
//   - esqueleto = o certificado byte a byte, com tag, forma do comprimento e conteúdo de TODO nó, exceto os campos que
//     mudam por natureza: valor da série (o tamanho fica de fora, porque o contador começa pequeno), conteúdo das duas
//     datas (o tipo e o tamanho ficam), bytes da chave (o tamanho e o byte de bits não usados ficam), conteúdo do SKI
//     (o tamanho fica), valor da assinatura e seu tamanho, e os dígitos do CN do sujeito (as letras ficam).
//     O esqueleto é mais estrito que o molde do doc 08: guarda também o comprimento e a forma de codificação de cada
//     campo não variável (um certificado reescrito por outra ferramenta muda isso mesmo com os mesmos textos).
// Universo: TODAS as linhas papel=oficial da integridade do turno (2º: integridade/2t; 1º: integridade/1t-identificadores);
//   data/raw não é varrido: o caminho do .vsc é montado pela linha. Linhas puladas são contadas por motivo.
// Saídas (data/parsed/auditoria/cetico-35/):
//   <t>t-dirs.jsonl   um por diretório: seção, sha do certificado, CN, número no .vsc, no BU, urnas e cargas dos logs;
//   <t>t-certs.jsonl  um por certificado distinto no turno: esqueleto (hash e texto), sujeito, emissor, série, datas, SKI ok.
// Uso: node scripts/auditoria/cetico-35-h25-extrair.mjs --turno 2 [--conc 24]

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, conc: { type: 'string', default: '24' } } });
const T = Number(values.turno);
const CONC = Number(values.conc);
const ORIGEM = path.join(DIR_DADOS, 'parsed', 'auditoria', 'integridade', T === 2 ? '2t' : '1t-identificadores');
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-35');
await mkdir(SAIDA, { recursive: true });

const vistos = new Set();
const saiD = createWriteStream(path.join(SAIDA, `${T}t-dirs.jsonl`));
const saiC = createWriteStream(path.join(SAIDA, `${T}t-certs.jsonl`));
const cont = { linhas: 0, oficial: 0, puladasSemVsc: 0, puladasSemHash: 0, diretorios: 0, erros: 0, certsDistintos: 0 };

async function processar(l) {
  const dir = path.join(DIR_DADOS, 'raw', `${T}t`, 'urnas', l.uf, l.municipio, l.zona, l.secao, l.hash);
  const logs = Array.isArray(l.logs) ? l.logs : [];
  const r = {
    t: T, uf: l.uf, mun: l.municipio, zona: l.zona, secao: l.secao,
    modeloVsc: l.vscInfo?.modelo ?? null, idHW: l.vscInfo?.idHW ?? null,
    buUrna: l.bu?.numeroInternoUrna ?? null, buCarga: l.bu?.codigoCarga ?? null, buDataCarga: l.bu?.dataHoraCarga ?? null,
    tipoUrna: l.bu?.tipoUrna ?? null, origem: l.bu?.origem ?? null,
    logUrnas: [...new Set(logs.flatMap((x) => Object.keys(x.urnas ?? {})))].map(Number),
    logCargas: [...new Set(logs.map((x) => x.codigoCarga).filter(Boolean))],
    nLogs: logs.length,
  };
  try {
    const vsc = await readFile(path.join(dir, l.vsc));
    const { der, sobra, sobraZero } = certDoVsc(vsc);
    const sha = h('sha256', der);
    r.cert = sha;
    r.sobra = sobra;
    r.sobraZero = sobraZero;
    const x = new X509Certificate(der);
    r.cn = (x.subject.match(/(?:^|\n)CN=([^\n]*)/) ?? [])[1] ?? null;
    if (!vistos.has(sha)) {
      vistos.add(sha);
      const e = esqueleto(der);
      saiC.write(`${JSON.stringify({
        cert: sha, esqueleto: h('sha256', e.texto).slice(0, 16), esqTexto: e.texto,
        sujeito: x.subject, emissor: x.issuer, serie: x.serialNumber, nb: x.validFromDate.toISOString(), na: x.validToDate.toISOString(),
        skiSha1Chave: e.ski === h('sha1', e.chave), derBytes: der.length,
      })}\n`);
    }
  } catch (erro) {
    r.erro = erro.message;
  }
  return r;
}

const arquivos = UFS.map((uf) => `${uf}.jsonl`); // só os arquivos de UF (a pasta tem outros .jsonl)
for (const arq of arquivos) {
  const linhas = [];
  const rl = createInterface({ input: createReadStream(path.join(ORIGEM, arq)), crlfDelay: Infinity });
  for await (const s of rl) {
    if (!s) continue;
    cont.linhas++;
    const l = JSON.parse(s);
    if (l.papel !== 'oficial') continue;
    cont.oficial++;
    if (!l.vsc) { cont.puladasSemVsc++; continue; }
    if (!l.hash) { cont.puladasSemHash++; continue; }
    linhas.push(l);
  }
  let i = 0;
  const trab = async () => {
    while (i < linhas.length) {
      const r = await processar(linhas[i++]);
      if (r.erro) cont.erros++;
      cont.diretorios++;
      saiD.write(`${JSON.stringify(r)}\n`);
    }
  };
  await Promise.all(Array.from({ length: CONC }, trab));
  console.log(`${arq}: ${linhas.length}; acumulado ${cont.diretorios}, erros ${cont.erros}, certificados ${vistos.size}`);
}
cont.certsDistintos = vistos.size;
await new Promise((ok) => saiD.end(ok));
await new Promise((ok) => saiC.end(ok));
console.log(JSON.stringify(cont));
