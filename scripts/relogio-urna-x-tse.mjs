// O relógio da urna segue o fuso local ou o de Brasília? Teste com um relógio que NÃO é o da urna: a hora em que o
// servidor do TSE recebeu o boletim (DT_RECEBIMENTO_BU_HOR_TSE, dados abertos, horário de Brasília).
//   atraso = recebimento no TSE − encerramento gravado pela urna
// Se a urna marca a hora local, nos municípios a −1 h e −2 h o atraso fica ~1 h e ~2 h maior que nos de Brasília.
// Se a urna marcasse Brasília, o atraso seria igual em todos os grupos e haveria boletins recebidos antes das 17h.
// Grupo de fuso: tabela do Auditor C (docs/analysis/linha-do-tempo/01). Uso: node scripts/relogio-urna-x-tse.mjs
import { open, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../src/banco-leitura.js';
import { DIR_DADOS } from '../src/config.js';
import { lerEntrada, listarEntradas } from '../src/zip.js';

const fuso = new Map();
for (const l of (await readFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'tempo', '2t', 'fuso-municipio.csv'), 'utf8')).split(/\r?\n/).slice(1)) {
  const c = l.split(',');
  if (c.length > 6) fuso.set(`${c[0]}/${Number(c[1])}`, Number(c[6]));
}
const { db } = await abrirLeitura();
const encerramento = new Map();
for (const r of db.prepare("select uf, municipio, zona, secao, encerramento from secao where turno = 2 and uf <> 'zz'").iterate()) {
  const m = /(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d):(\d\d)/.exec(r.encerramento ?? '');
  if (m) encerramento.set(`${r.uf}/${Number(r.municipio)}/${Number(r.zona)}/${Number(r.secao)}`, Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
}

const dir = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'detalhe_votacao_secao');
const h = await open(path.join(dir, (await readdir(dir)).find((n) => n.endsWith('.zip'))));
const grupos = new Map();
for (const e of (await listarEntradas(h)).filter((x) => x.nome.endsWith('.csv') && !/_BR\.csv$/i.test(x.nome) && !/_ZZ\.csv$/i.test(x.nome))) {
  const buf = await lerEntrada(h, e);
  const fimCab = buf.indexOf(10);
  const col = buf.toString('latin1', 0, fimCab).trim().split(';').map((c) => c.replace(/"/g, ''));
  const i = (n) => col.indexOf(n);
  for (let pos = fimCab + 1; pos < buf.length; ) {
    let fim = Math.min(buf.length, pos + 64 * 1024 * 1024);
    if (fim < buf.length) fim = buf.indexOf(10, fim) + 1 || buf.length;
    for (const l of buf.toString('latin1', pos, fim).split(/\r?\n/)) {
      if (!l) continue;
      const c = l.split(';').map((x) => x.replace(/"/g, ''));
      if (c[i('NR_TURNO')] !== '2' || c[i('DS_CARGO')] !== 'Presidente') continue;
      const uf = c[i('SG_UF')].toLowerCase();
      const k = `${uf}/${Number(c[i('CD_MUNICIPIO')])}/${Number(c[i('NR_ZONA')])}/${Number(c[i('NR_SECAO')])}`;
      const m = /(\d\d)\/(\d\d)\/(\d{4}) (\d\d):(\d\d):(\d\d)/.exec(c[i('DT_RECEBIMENTO_BU_HOR_TSE')]);
      const enc = encerramento.get(k);
      const d = fuso.get(`${uf}/${Number(c[i('CD_MUNICIPIO')])}`);
      if (!m || enc === undefined || d === undefined) continue;
      const receb = Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6]);
      const g = grupos.get(d) ?? { atrasos: [], recebidoAntes17: 0, encerramentoLocalMin: Infinity, recebimentoMin: Infinity };
      g.atrasos.push((receb - enc) / 60000);
      // fecharam (no relógio da urna) depois das 17:10: a porta do TSE já estava aberta, só a transmissão pesa
      if (enc >= Date.UTC(2026, 9, 25, 17, 10, 0)) { g.tarde = g.tarde ?? []; g.tarde.push((receb - enc) / 60000); }
      const h17 = Date.UTC(2026, 9, 25, 17, 0, 0);
      if (receb < h17) g.recebidoAntes17++;
      g.encerramentoLocalMin = Math.min(g.encerramentoLocalMin, enc);
      g.recebimentoMin = Math.min(g.recebimentoMin, receb);
      grupos.set(d, g);
    }
    pos = fim;
  }
}
await h.close();
const q = (v, p) => v[Math.floor(p * (v.length - 1))];
const hh = (ms) => new Date(ms).toISOString().slice(11, 19);
console.log('fuso do município | seções | atraso recebimento TSE − encerramento gravado pela urna (min): p1 / p10 / mediana / p90 | recebidos antes das 17h de Brasília | encerramento mais cedo gravado | recebimento mais cedo no TSE');
for (const d of [...grupos.keys()].sort((a, b) => a - b)) {
  const g = grupos.get(d);
  const v = g.atrasos.sort((a, b) => a - b);
  console.log(`${String(d).padStart(3)} h  ${String(v.length).padStart(8)}   ${q(v, 0.01).toFixed(0)} / ${q(v, 0.1).toFixed(0)} / ${q(v, 0.5).toFixed(0)} / ${q(v, 0.9).toFixed(0)}   ${g.recebidoAntes17}   ${hh(g.encerramentoLocalMin)}   ${hh(g.recebimentoMin)}`);
}
console.log('\nSó seções cujo encerramento GRAVADO pela urna é depois das 17:10 (o sistema do TSE já recebia):');
console.log('fuso | seções | menor atraso (min) | p1 | mediana');
for (const d of [...grupos.keys()].sort((a, b) => a - b)) {
  const v = (grupos.get(d).tarde ?? []).sort((a, b) => a - b);
  if (v.length) console.log(`${String(d).padStart(3)} h  ${String(v.length).padStart(7)}   ${v[0].toFixed(1)}   ${q(v, 0.01).toFixed(1)}   ${q(v, 0.5).toFixed(1)}`);
}
