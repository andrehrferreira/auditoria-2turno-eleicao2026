// Parecer cético 33: recontagem, com código próprio, das repetições e validades a partir das linhas extraídas pelo
// engenheiro (data/parsed/auditoria/seguranca-h25/<t>t-certs.jsonl). Não relê o .vsc (isso é feito em
// cetico-33-h25-certificados.mjs); aqui só se confere a CONTA feita em seguranca-h25-analise.mjs.
// Saída: data/parsed/auditoria/cetico-revisor/33-h25-repeticoes.json
// Uso: node scripts/auditoria/cetico-33-h25-repeticoes.mjs
import { createReadStream } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DIR_DADOS } from '../../src/config.js';

const DIR = path.join(DIR_DADOS, 'parsed', 'auditoria', 'seguranca-h25');
const VENC = { 'AC URNA': '2026-07-18T21:59:57Z', 'AC UE2020': '2037-07-01T21:31:56Z', 'AC UE2022': '2039-02-24T13:46:49Z' };
const TURNO = { 1: '2026-10-04T11:00:00Z', 2: '2026-10-25T11:00:00Z' };
const certs = new Map();
const out = { turnos: {} };
for (const t of [2, 1]) {
  const r = { linhas: 0, erros: 0, porEmissor: {}, vencidoNoTurno: 0, naoValidoNoTurno: 0, akiSerieAcUrna: {}, naMinAcUrna: null, vencemDepoisDaAcUrna: 0, tardios: 0 };
  for await (const l of createInterface({ input: createReadStream(path.join(DIR, `${t}t-certs.jsonl`)), crlfDelay: Infinity })) {
    const d = JSON.parse(l);
    r.linhas++;
    if (d.erro) { r.erros++; continue; }
    r.porEmissor[d.emissor] = (r.porEmissor[d.emissor] ?? 0) + 1;
    if (d.na.iso < TURNO[t]) r.vencidoNoTurno++;
    if (d.nb.iso > TURNO[t]) r.naoValidoNoTurno++;
    if (d.emissor === 'AC URNA') {
      const k = `${d.akiKey}|${d.akiSerie}|${d.akiEmissor}`;
      r.akiSerieAcUrna[k] = (r.akiSerieAcUrna[k] ?? 0) + 1;
      if (!r.naMinAcUrna || d.na.iso < r.naMinAcUrna) r.naMinAcUrna = d.na.iso;
      if (d.na.iso > VENC['AC URNA']) r.vencemDepoisDaAcUrna++;
      if (d.nb.iso > VENC['AC URNA']) r.tardios++;
    }
    if (!certs.has(d.certSha)) certs.set(d.certSha, { chave: d.chaveSha, serie: `${d.emissor}|${d.serie}`, nome: String(d.sujeito).toLowerCase() });
  }
  out.turnos[`${t}t`] = r;
}
const dup = (campo) => {
  const c = new Map();
  for (const x of certs.values()) c.set(x[campo], (c.get(x[campo]) ?? 0) + 1);
  return [...c.values()].filter((n) => n > 1).length;
};
out.certificadosDistintos = certs.size;
out.chaveRepetida = dup('chave');
out.serieRepetidaNaMesmaAc = dup('serie');
out.nomeComMaisDeUmCertificado = dup('nome');
await writeFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '33-h25-repeticoes.json'), `${JSON.stringify(out, null, 1)}\n`);
console.log(JSON.stringify(out, null, 1));
