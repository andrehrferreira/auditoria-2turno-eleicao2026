import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { certificadoDoVsc, DIR_H25, nos, sha256 } from './seguranca-h25-lib.mjs';

// H25, teste "certificado fora do padrão de produção" (engenheiro de segurança, doc 08).
// Relê o certificado de urna de TODOS os diretórios oficiais de um turno (mesmo universo de seguranca-h25-certificados.mjs:
// 2º turno de integridade/2t/<uf>.jsonl, 1º turno de integridade/1t-identificadores/<uf>.jsonl; data/raw não é varrido,
// o caminho do .vsc é montado pela linha) e descreve o certificado INTEIRO, campo a campo:
//   - versão, número de série (valor e tamanho), algoritmo de assinatura (OID e parâmetros, dentro e fora do TBS);
//   - emissor e sujeito: todos os atributos (OID, tipo de cadeia, valor), na ordem;
//   - validade: tipo de data (UTCTime/GeneralizedTime), início, fim, duração;
//   - chave pública: algoritmo, parâmetros, tamanho;
//   - issuerUniqueID / subjectUniqueID;
//   - todas as extensões: OID, crítica ou não, valor (ASN.1 decodificado em texto);
//   - SKI: como foi derivado (SHA-1 da chave, método 1 ou 2 da RFC 5280, ou outro);
//   - "molde": o certificado com os campos que mudam de urna para urna mascarados (série e seu tamanho, datas, dígitos do nome,
//     chave, SKI, assinatura). Dois certificados do mesmo processo de emissão têm o mesmo molde; qualquer campo a mais,
//     a menos ou diferente muda o molde.
// Do lado da seção, copia da linha de integridade: tipo de urna, origem, nº interno da urna no BU, código e data da carga
// no BU, e de todos os logs do pacote (inclusive o aninhado) as urnas que aparecem, os códigos de carga, a primeira data
// (aaaa-mm-dd hh:mm:ss, relógio da urna) e as verificações de assinatura sem sucesso.
// Saídas (data/parsed/auditoria/seguranca-h25/):
//   <t>t-padrao-dirs.jsonl   uma linha por diretório (seção + certSha + molde + dados de carga/log);
//   <t>t-padrao-certs.jsonl  uma linha por certificado distinto no turno (descrição completa).
//
// Uso: node scripts/auditoria/seguranca-h25-padrao-extrair.mjs --turno 2 [--conc 32] [--uf ac,al]

const { values } = parseArgs({ options: {
  turno: { type: 'string', default: '2' }, conc: { type: 'string', default: '32' }, uf: { type: 'string' },
} });
const T = Number(values.turno);
const CONC = Number(values.conc);
const ufs = values.uf ? values.uf.split(',') : UFS;
const ORIGEM = path.join(DIR_DADOS, 'parsed', 'auditoria', 'integridade', T === 2 ? '2t' : '1t-identificadores');
await mkdir(DIR_H25, { recursive: true });

const sha1 = (b) => createHash('sha1').update(b).digest('hex');
const hex = (b, n) => b.subarray(n.ini, n.fim).toString('hex');

/** OID DER → notação com pontos. */
export function oidPontos(bytes) {
  const partes = [];
  let v = 0;
  for (let i = 0; i < bytes.length; i++) {
    v = v * 128 + (bytes[i] & 0x7f);
    if (!(bytes[i] & 0x80)) {
      if (partes.length === 0) partes.push(v < 80 ? Math.floor(v / 40) : 2, v < 80 ? v % 40 : v - 80);
      else partes.push(v);
      v = 0;
    }
  }
  return partes.join('.');
}

const TIPOS = { 0x0c: 'UTF8', 0x13: 'Printable', 0x16: 'IA5', 0x14: 'T61', 0x1e: 'BMP', 0x1c: 'Universal', 0x12: 'Numeric' };

/** ASN.1 → texto compacto (genérico). Usado para mostrar o valor de cada extensão e de cada atributo. */
export function asn1Texto(b, ini, fim, prof = 0) {
  if (prof > 12) return '…';
  let lista;
  try {
    lista = nos(b, ini, fim);
  } catch {
    return `bytes:${b.subarray(ini, fim).toString('hex')}`;
  }
  return lista.map((n) => {
    const v = b.subarray(n.ini, n.fim);
    if (n.tag === 0x30) return `SEQ(${asn1Texto(b, n.ini, n.fim, prof + 1)})`;
    if (n.tag === 0x31) return `SET(${asn1Texto(b, n.ini, n.fim, prof + 1)})`;
    if (n.tag === 0x06) return `OID ${oidPontos(v)}`;
    if (n.tag === 0x01) return `BOOL ${v[0] ? 'true' : 'false'}`;
    if (n.tag === 0x02) return `INT ${v.toString('hex')}`;
    if (n.tag === 0x03) return `BITS ${v.toString('hex')}`;
    if (n.tag === 0x05) return 'NULL';
    if (n.tag === 0x04) {
      // OCTET STRING pode embrulhar outro DER (valor de extensão).
      try {
        const dentro = nos(b, n.ini, n.fim);
        if (dentro.length && dentro[0].tag === 0x30) return `OCT(${asn1Texto(b, n.ini, n.fim, prof + 1)})`;
      } catch { /* não é DER */ }
      return `OCT ${v.toString('hex')}`;
    }
    if (TIPOS[n.tag]) return `${TIPOS[n.tag]} "${v.toString('latin1')}"`;
    if (n.tag === 0x17 || n.tag === 0x18) return `TIME ${v.toString('latin1')}`;
    if ((n.tag & 0xa0) === 0xa0) return `[${n.tag & 0x1f}](${asn1Texto(b, n.ini, n.fim, prof + 1)})`;
    if ((n.tag & 0x80) === 0x80) return `[${n.tag & 0x1f}]prim ${/^[\x20-\x7e]*$/.test(v.toString('latin1')) ? `"${v.toString('latin1')}"` : v.toString('hex')}`;
    return `tag${n.tag.toString(16)} ${v.toString('hex')}`;
  }).join(', ');
}

/** Name → lista de atributos [{rdn, oid, tipo, valor}]. */
function nome(b, n) {
  const r = [];
  nos(b, n.ini, n.fim).forEach((rdn, i) => {
    for (const atv of nos(b, rdn.ini, rdn.fim)) {
      const [t, v] = nos(b, atv.ini, atv.fim);
      r.push({ rdn: i, oid: oidPontos(b.subarray(t.ini, t.fim)), tipo: TIPOS[v.tag] ?? `tag${v.tag.toString(16)}`, valor: b.subarray(v.ini, v.fim).toString('latin1') });
    }
  });
  return r;
}

function tempoIso(b, n) {
  const s = b.subarray(n.ini, n.fim).toString('latin1');
  const m = n.tag === 0x17 ? s.match(/^(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)Z$/) : s.match(/^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)Z$/);
  if (!m) return null;
  const ano = n.tag === 0x17 ? (Number(m[1]) < 50 ? 2000 : 1900) + Number(m[1]) : Number(m[1]);
  return `${ano}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`;
}

/** Descrição completa de um certificado DER e o molde (campos variáveis mascarados). */
export function descrever(der) {
  const [cert] = nos(der);
  const topo = nos(der, cert.ini, cert.fim);
  const [tbs, algExt, assin] = topo;
  const f = nos(der, tbs.ini, tbs.fim);
  const temVersao = f[0].tag === 0xa0;
  const [serie, alg, emissor, validade, sujeito, spki, ...resto] = temVersao ? f.slice(1) : f;
  const [nb, na] = nos(der, validade.ini, validade.fim);
  const [algChave, chave] = nos(der, spki.ini, spki.fim);
  const chaveBytes = der.subarray(chave.ini + 1, chave.fim);
  const d = {
    elementosTopo: topo.length,
    versao: temVersao ? der[nos(der, f[0].ini, f[0].fim)[0].ini] + 1 : 1,
    serie: hex(der, serie),
    serieBytes: serie.fim - serie.ini,
    algTbs: asn1Texto(der, alg.ini, alg.fim),
    algExterno: asn1Texto(der, algExt.ini, algExt.fim),
    emissor: nome(der, emissor),
    sujeito: nome(der, sujeito),
    tipoDatas: `${nb.tag.toString(16)}/${na.tag.toString(16)}`,
    nb: tempoIso(der, nb),
    na: tempoIso(der, na),
    algChave: asn1Texto(der, algChave.ini, algChave.fim),
    chaveBytes: chaveBytes.length,
    chaveBitsNaoUsados: der[chave.ini],
    chaveSha: sha256(chaveBytes),
    assinaturaBytes: assin.fim - assin.ini - 1,
    extras: resto.filter((n) => n.tag !== 0xa3).map((n) => n.tag.toString(16)), // issuerUniqueID [1], subjectUniqueID [2]
    extensoes: [],
    skiMetodo: null,
    derBytes: der.length,
  };
  // Assinatura ECDSA (só AC URNA; Ed521 não tem r/s em DER): tamanhos de r e s.
  if (d.algExterno.includes('1.2.840.10045.4')) {
    try {
      const [rs] = nos(der, assin.ini + 1, assin.fim);
      const [r, s] = nos(der, rs.ini, rs.fim);
      d.ecdsaRS = `${r.fim - r.ini}/${s.fim - s.ini}`;
    } catch { d.ecdsaRS = 'erro'; }
  }
  const ext = resto.find((n) => n.tag === 0xa3);
  if (ext) {
    const [lista] = nos(der, ext.ini, ext.fim);
    for (const e of nos(der, lista.ini, lista.fim)) {
      const partes = nos(der, e.ini, e.fim);
      const oid = oidPontos(der.subarray(partes[0].ini, partes[0].fim));
      const critica = partes.length === 3 ? der[partes[1].ini] !== 0 : null; // null = campo ausente (padrão: não crítica)
      const valor = partes.at(-1);
      let texto = asn1Texto(der, valor.ini, valor.fim);
      if (oid === '2.5.29.14') {
        const [v] = nos(der, valor.ini, valor.fim);
        const ski = hex(der, v);
        const m1 = sha1(chaveBytes);
        d.skiMetodo = ski === m1 ? 'sha1-chave (RFC 5280 met. 1)'
          : (ski.length === 16 && ski === '4' + m1.slice(-15)) ? 'met. 2' : 'outro';
        if (d.skiMetodo === 'outro') d.skiMetodo = `outro (${ski.length / 2} bytes)`;
        d.skiBytes = ski.length / 2;
        texto = `SKI(${ski.length / 2} bytes)`; // varia por urna: mascarado
      }
      d.extensoes.push({ oid, critica, valor: texto });
    }
  }
  // Molde: tudo, menos os valores que mudam de urna para urna.
  const molde = {
    elementosTopo: d.elementosTopo, versao: d.versao, algTbs: d.algTbs, algExterno: d.algExterno,
    emissor: d.emissor,
    sujeito: d.sujeito.map((a) => ({ ...a, valor: a.valor.replace(/[0-9]/g, '9') })),
    tipoDatas: d.tipoDatas, algChave: d.algChave, chaveBytes: d.chaveBytes, chaveBitsNaoUsados: d.chaveBitsNaoUsados,
    extras: d.extras, extensoes: d.extensoes, skiMetodo: d.skiMetodo,
  };
  d.molde = sha256(Buffer.from(JSON.stringify(molde))).slice(0, 12);
  d.moldeObj = molde;
  return d;
}

const vistos = new Set();
const saidaDirs = createWriteStream(path.join(DIR_H25, `${T}t-padrao-dirs.jsonl`));
const saidaCerts = createWriteStream(path.join(DIR_H25, `${T}t-padrao-certs.jsonl`));

async function processar(l) {
  const dir = path.join(DIR_DADOS, 'raw', `${T}t`, 'urnas', l.uf, l.municipio, l.zona, l.secao, l.hash);
  // Todos os logs do pacote (o log.jez pode trazer o log anterior aninhado, profundidade 1, com a carga).
  const logs = Array.isArray(l.logs) ? l.logs : [];
  const log0 = logs.find((x) => x.profundidade === 0) ?? logs[0] ?? null;
  const dataLog = (s) => (s ? s.replace(/^(\d\d)\/(\d\d)\/(\d{4}) (.*)$/, '$3-$2-$1 $4') : null);
  const primeiras = logs.map((x) => dataLog(x.primeiraData)).filter(Boolean).sort();
  const base = {
    t: T, uf: l.uf, mun: l.municipio, zona: l.zona, secao: l.secao, hash: l.hash.slice(0, 24),
    modelo: l.vscInfo?.modelo ?? null, idHW: l.vscInfo?.idHW ?? null,
    tipoUrna: l.bu?.tipoUrna ?? null, origem: l.bu?.origem ?? null, numeroInternoUrna: l.bu?.numeroInternoUrna ?? null,
    buCarga: l.bu?.codigoCarga ?? null, buDataCarga: l.bu?.dataHoraCarga ?? null, comparecimento: l.bu?.comparecimento ?? null,
    versao: l.bu?.versao ?? null, pacoteSt: l.pacoteSt ?? l.auxSt ?? null, falhas: Array.isArray(l.falhas) ? l.falhas.length : null,
    logs: Array.isArray(l.logs) ? l.logs.length : 0,
    logUrnas: [...new Set(logs.flatMap((x) => Object.keys(x.urnas ?? {})))], logModelo: log0?.modelo ?? null,
    logCargas: [...new Set(logs.map((x) => x.codigoCarga).filter(Boolean))], logCarga0: log0?.codigoCarga ?? null,
    logPrimeira: primeiras[0] ?? null, logSemSucesso: logs.reduce((n, x) => n + (x.verificacoesSemSucesso?.length ?? 0), 0),
  };
  try {
    const vsc = await readFile(path.join(dir, l.vsc));
    const { der } = certificadoDoVsc(vsc);
    const certSha = sha256(der);
    if (!vistos.has(certSha)) {
      vistos.add(certSha);
      const d = descrever(der);
      saidaCerts.write(`${JSON.stringify({ certSha, ...d })}\n`);
      return { ...base, certSha, molde: d.molde };
    }
    return { ...base, certSha };
  } catch (erro) {
    return { ...base, erro: erro.message };
  }
}

{
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
      linhas.push(l);
    }
    let i = 0;
    const trabalhador = async () => {
      while (i < linhas.length) {
        const r = await processar(linhas[i++]);
        if (r.erro) erros++;
        saidaDirs.write(`${JSON.stringify(r)}\n`);
        total++;
      }
    };
    await Promise.all(Array.from({ length: CONC }, trabalhador));
    console.log(`${uf}: ${linhas.length} diretórios; acumulado ${total}, ${erros} erro(s), ${vistos.size} certificados distintos, ${Math.round((Date.now() - inicio) / 1000)} s`);
  }
  await new Promise((ok) => saidaDirs.end(ok));
  await new Promise((ok) => saidaCerts.end(ok));
  console.log(`turno ${T}: ${total} diretórios, ${erros} erro(s), ${vistos.size} certificados distintos`);
}
