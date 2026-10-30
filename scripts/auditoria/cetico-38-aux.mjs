import { createReadStream } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DIR_DADOS } from '../../src/config.js';
import { linhasZip } from './seguranca-h27-lib.mjs';

// Parecer cético 38 (H27), parte 4: a "correspondência recebida no dia" chegou ANTES do pacote, ou é o próprio pacote?
// Cruza, no 2º turno e em TODAS as seções, três horários:
//   corr = DT_RECBTO_URNA_EFETIVADA do CEFT (hora local; convertida para Brasília pela diferença da UF, medida no CEFT);
//   aux  = hora do primeiro hash no aux.json da seção (chegada do pacote no TSE; data/parsed/auditoria/chegada-bu/
//          aux-horarios.csv, lido das 499.248 aux.json pelo caminho, sem varrer data/raw; conferido no bruto por amostra);
//   bu   = DT_RECEBIMENTO_BU_HOR_TSE do detalhe_votacao_secao (hora de Brasília).
// Pergunta: em quantas seções corr = aux (ao segundo)? Se a correspondência só existe a partir da chegada do pacote,
// ela não é registro anterior e independente.
// Saída: data/parsed/auditoria/cetico-revisor/38/aux.json
// Uso: node --max-old-space-size=4000 scripts/auditoria/cetico-38-aux.mjs

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '38');
const k4 = (uf, m, zn, s) => `${uf.toLowerCase()}/${String(m).padStart(5, '0')}/${String(zn).padStart(4, '0')}/${String(s).padStart(4, '0')}`;
const FUSO_UF = { ac: 2, am: 1, ms: 1, mt: 1, ro: 1, rr: 1 };
const ms = (s) => Date.parse(`${s.replace(' ', 'T')}Z`);
const brMs = (s) => { const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2}:\d{2})$/.exec(s ?? ''); return m ? Date.parse(`${m[3]}-${m[2]}-${m[1]}T${m[4]}Z`) : null; };
const inc = (o, k) => { o[k] = (o[k] ?? 0) + 1; };

const aux = new Map();
let cab = null;
for await (const l of createInterface({ input: createReadStream(path.join(DIR_DADOS, 'parsed', 'auditoria', 'chegada-bu', 'aux-horarios.csv')), crlfDelay: Infinity })) {
  const c = l.split(',');
  if (!cab) { cab = c; continue; }
  const o = Object.fromEntries(cab.map((n, i) => [n, c[i]]));
  aux.set(`${o.uf}/${o.municipio}/${o.zona}/${o.secao}`, o);
}
const ceft = new Map();
const dir = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'correspondencias', '2026-2t');
for (const n of (await readdir(dir)).filter((x) => x.startsWith('CEFT_'))) {
  for await (const r of linhasZip(path.join(dir, n))) {
    const k = k4(r.SG_UF, r.CD_MUNICIPIO, r.NR_ZONA, r.NR_SECAO);
    ceft.set(k, { rf: r.DT_RECBTO_URNA_EFETIVADA, re: r.DT_RECBTO_URNA_ESPERADA, sqIgual: r.SQ_CORRESPONDENCIA_ESPERADA === r.SQ_CORRESPONDENCIA_EFETIVADA, origem: r.CD_ORIGEM_VOTO });
  }
}
const R = { aux: aux.size, ceft: ceft.size, corrIgualAux: {}, auxMenosBu: {}, casosCorrNoDia: [], corrIgualAuxLista: [] };
for await (const r of linhasZip(path.join(DIR_DADOS, 'raw', 'dadosabertos', 'detalhe_votacao_secao', 'detalhe_votacao_secao_2026.zip'), /_BR\.csv$/)) {
  if (r.DS_CARGO !== 'Presidente' || r.NR_TURNO !== '2') continue;
  const k = k4(r.SG_UF, r.CD_MUNICIPIO, r.NR_ZONA, r.NR_SECAO);
  const a = aux.get(k);
  const f = ceft.get(k);
  if (!a || !f || k.startsWith('zz/') || f.origem === 'C') continue;
  const uf = k.slice(0, 2);
  const corr = f.rf ? ms(f.rf) + (FUSO_UF[uf] ?? 0) * 36e5 : null;
  const tAux = a.hr_primeiro ? ms(a.hr_primeiro) : null;
  const bu = brMs(r.DT_RECEBIMENTO_BU_HOR_TSE);
  if (tAux !== null && bu !== null) { const d = Math.round((tAux - bu) / 1000); inc(R.auxMenosBu, d === 0 ? 'igual' : d < 0 ? 'aux mais cedo' : 'aux mais tarde'); }
  if (corr !== null && tAux !== null) {
    const d = Math.round((corr - tAux) / 1000);
    const noDia = f.rf.slice(0, 10) === '2026-10-25';
    inc(R.corrIgualAux, `${noDia ? 'corrNoDia' : 'corrAntes'}|${Math.abs(d) <= 1 ? 'igual(±1s)' : Math.abs(d) <= 3600 ? 'até 1h' : 'mais de 1h'}`);
    if (Math.abs(d) <= 1) R.corrIgualAuxLista.push(k);
    if (noDia) R.casosCorrNoDia.push({ k, corrLocal: f.rf, corrBrasilia: new Date(corr).toISOString().slice(0, 19).replace('T', ' '), auxPrimeiro: a.hr_primeiro, nHashes: a.n_hashes, buDetalhe: r.DT_RECEBIMENTO_BU_HOR_TSE, segCorrMenosAux: d, minBuMenosAux: Math.round((bu - tAux) / 6e4), sqIgual: f.sqIgual });
  }
}
await writeFile(path.join(SAIDA, 'aux.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify({ ...R, casosCorrNoDia: R.casosCorrNoDia.length, corrIgualAuxLista: R.corrIgualAuxLista.length }, null, 1));
for (const c of R.casosCorrNoDia) console.log(c.k, 'corr', c.corrBrasilia, 'aux', c.auxPrimeiro, 'bu', c.buDetalhe, 'corr-aux(s)', c.segCorrMenosAux, 'bu-aux(min)', c.minBuMenosAux, 'hashes', c.nHashes);
