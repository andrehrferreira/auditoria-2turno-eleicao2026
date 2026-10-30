// Parecer cético 33 (docs/analysis/cetico-revisor/33-h25-certificado-ac-urna.md): recontagem INDEPENDENTE dos
// certificados de urna, dos dois turnos, sem usar seguranca-h25-lib.mjs nem src/lacres.js.
//   - Universo: linhas "oficial" de integridade/2t/<uf>.jsonl e integridade/1t-identificadores/<uf>.jsonl (as mesmas
//     do engenheiro); o total é conferido contra a tabela `secao` do banco (situacao = 'completa') no parecer.
//   - Extração: outro método. Procura no .vsc todo trecho "30 82 xx xx 30 82" (DER) ou o bloco PEM, entrega ao
//     X509Certificate do Node (OpenSSL) e fica com os certificados cujo sujeito é CN=ueao...; o leitor do OpenSSL
//     ignora os zeros que sobram depois do DER.
//   - Para emissor CN=AC URNA: assinatura conferida com a chave do acurna.der publicado (x509.verify) e
//     x509.checkIssued(acurna), que no OpenSSL (X509_check_issued) compara nome do emissor E o AKI (keyid, nome e
//     número de série do certificado da AC). Para Ed521 (AC UE2020/UE2022) só datas, série e emissor.
//   - Datas: validFromDate/validToDate do OpenSSL (não o texto cru).
// Saída: data/parsed/auditoria/cetico-revisor/33-h25-certificados.json
// Uso: node scripts/auditoria/cetico-33-h25-certificados.mjs [--conc 12]
import { X509Certificate } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { DIR_DADOS, UFS } from '../../src/config.js';

const { values } = parseArgs({ options: { conc: { type: 'string', default: '12' }, uf: { type: 'string' }, saida: { type: 'string' } } });
const CONC = Number(values.conc);
const SAIDA = values.saida ?? path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '33-h25-certificados.json');
await mkdir(path.dirname(SAIDA), { recursive: true });

const acs = {};
for (const n of ['acurna', 'acue2020', 'acue2022']) acs[n] = new X509Certificate(await readFile(path.join(DIR_DADOS, 'certificados', 'ac', `${n}.der`)));
const AC_URNA = acs.acurna;
const VENC_AC_URNA = AC_URNA.validToDate.getTime();
const DATA_TURNO = { 1: Date.parse('2026-10-04T08:00:00-03:00'), 2: Date.parse('2026-10-25T08:00:00-03:00') };
const cnDe = (dn) => (dn.split('\n').find((x) => x.startsWith('CN=')) ?? '').slice(3);

/** Todos os certificados de urna (CN=ueao…) achados no .vsc, por outro método que não o da lib do engenheiro. */
function certificadosNoVsc(vsc) {
  const achados = new Map();
  const tentar = (buf) => {
    try {
      const c = new X509Certificate(buf);
      if (/^ueao/i.test(cnDe(c.subject))) achados.set(c.fingerprint256, c);
    } catch { /* não é certificado */ }
  };
  const txt = vsc.toString('latin1');
  for (let i = txt.indexOf('-----BEGIN CERTIFICATE-----'); i >= 0; i = txt.indexOf('-----BEGIN CERTIFICATE-----', i + 1)) {
    const f = txt.indexOf('-----END CERTIFICATE-----', i);
    if (f > 0) tentar(Buffer.from(txt.slice(i, f + 25), 'latin1'));
  }
  for (let i = 0; i + 8 < vsc.length; i++) {
    if (vsc[i] !== 0x30 || vsc[i + 1] !== 0x82 || vsc[i + 4] !== 0x30 || vsc[i + 5] !== 0x82) continue;
    const n = vsc[i + 2] * 256 + vsc[i + 3];
    if (n < 200 || i + 4 + n > vsc.length + 8) continue;
    tentar(vsc.subarray(i, Math.min(vsc.length, i + 4 + n + 8)));
  }
  return [...achados.values()];
}

const out = { geradoEm: new Date().toISOString(), acUrna: { serie: AC_URNA.serialNumber, validade: [AC_URNA.validFromDate.toISOString(), AC_URNA.validToDate.toISOString()] }, turnos: {} };
const uniao = new Map(); // fingerprint → dados

for (const T of [2, 1]) {
  const origem = path.join(DIR_DADOS, 'parsed', 'auditoria', 'integridade', T === 2 ? '2t' : '1t-identificadores');
  const r = { diretorios: 0, secoes: new Set(), erros: [], semCert: 0, maisDeUmCert: 0, porEmissor: {}, acUrna: { verifyOk: 0, verifyFalha: 0, checkIssuedOk: 0, checkIssuedFalha: 0, emitidoAposVencimento: 0, vencidoNoTurno: 0, aindaNaoValidoNoTurno: 0 }, tardios: [] };
  for (const uf of values.uf ? values.uf.split(',') : UFS) {
    const linhas = [];
    for await (const texto of createInterface({ input: createReadStream(path.join(origem, `${uf}.jsonl`)), crlfDelay: Infinity })) {
      if (!texto.includes('"oficial"')) continue;
      const l = JSON.parse(texto);
      if (l.papel !== 'oficial') continue;
      linhas.push(l);
    }
    let i = 0;
    const trabalhador = async () => {
      while (i < linhas.length) {
        const l = linhas[i++];
        r.diretorios++;
        r.secoes.add(`${l.uf}/${l.municipio}/${l.zona}/${l.secao}`);
        let lista;
        try {
          lista = certificadosNoVsc(await readFile(path.join(DIR_DADOS, 'raw', `${T}t`, 'urnas', l.uf, l.municipio, l.zona, l.secao, l.hash, l.vsc)));
        } catch (e) {
          r.erros.push(`${l.uf}/${l.municipio}/${l.zona}/${l.secao}: ${e.message}`);
          continue;
        }
        if (lista.length === 0) { r.semCert++; continue; }
        if (lista.length > 1) r.maisDeUmCert++;
        const c = lista[0];
        const emissor = cnDe(c.issuer);
        const e = (r.porEmissor[emissor] ??= { diretorios: 0, nbMin: null, nbMax: null });
        e.diretorios++;
        const nb = c.validFromDate.toISOString();
        if (!e.nbMin || nb < e.nbMin) e.nbMin = nb;
        if (!e.nbMax || nb > e.nbMax) e.nbMax = nb;
        const reg = (uniao.get(c.fingerprint256) ?? { emissor, serie: c.serialNumber, sujeito: cnDe(c.subject), nb, na: c.validToDate.toISOString(), usos: [] });
        uniao.set(c.fingerprint256, reg);
        if (emissor === 'AC URNA') {
          const v = c.verify(AC_URNA.publicKey);
          const ci = c.checkIssued(AC_URNA);
          r.acUrna[v ? 'verifyOk' : 'verifyFalha']++;
          r.acUrna[ci ? 'checkIssuedOk' : 'checkIssuedFalha']++;
          if (c.validToDate.getTime() < DATA_TURNO[T]) r.acUrna.vencidoNoTurno++;
          if (c.validFromDate.getTime() > DATA_TURNO[T]) r.acUrna.aindaNaoValidoNoTurno++;
          if (c.validFromDate.getTime() > VENC_AC_URNA) {
            r.acUrna.emitidoAposVencimento++;
            const b = l.bu ?? {};
            const uso = { t: T, secao: `${l.uf}/${l.municipio}/${l.zona}/${l.secao}`, tipoUrna: b.tipoUrna ?? null, numeroInternoUrna: b.numeroInternoUrna ?? null, dataHoraCarga: b.dataHoraCarga ?? null, verify: v, checkIssued: ci };
            reg.usos.push(uso);
            r.tardios.push({ serie: c.serialNumber, nb, sujeito: reg.sujeito, ...uso });
          }
        }
      }
    };
    await Promise.all(Array.from({ length: CONC }, trabalhador));
    process.stdout.write(`${T}t ${uf} ${r.diretorios}\n`);
  }
  r.secoes = r.secoes.size;
  r.tardios.sort((a, b) => a.nb.localeCompare(b.nb));
  out.turnos[`${T}t`] = r;
}
const tardiosUniao = [...uniao.values()].filter((c) => c.emissor === 'AC URNA' && Date.parse(c.nb) > VENC_AC_URNA).sort((a, b) => a.nb.localeCompare(b.nb));
out.uniao = {
  certificadosDistintos: uniao.size,
  porEmissor: [...uniao.values()].reduce((o, c) => ((o[c.emissor] = (o[c.emissor] ?? 0) + 1), o), {}),
  acUrnaEmitidosAposVencimento: tardiosUniao.length,
  tardios: tardiosUniao,
};
await writeFile(SAIDA, `${JSON.stringify(out, null, 1)}\n`);
console.log(JSON.stringify({ t2: { ...out.turnos['2t'], tardios: out.turnos['2t'].tardios.length }, t1: { ...out.turnos['1t'], tardios: out.turnos['1t'].tardios.length }, uniao: { ...out.uniao, tardios: undefined } }, null, 1));
