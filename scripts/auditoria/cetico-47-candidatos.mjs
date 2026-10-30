// Cético revisor, parecer 47 (H20). Separa, entre as seções que o teste do local de votação marcou como "tudo 1 h
// depois do local" (cetico-47-analise.mjs, analise.json), atraso real de relógio errado. Regra: se a MESMA urna votou
// no outro turno com horários normais e o relógio não mudou entre os turnos (nenhum acerto de hora cheia no diário,
// ajustes-hora-cheia.csv do engenheiro, e nenhum retrocesso no período do 2º turno antes da zerésima), o relógio estava
// certo nos dois turnos e o deslocamento do turno marcado foi horário real da mesa.
// Uso: node scripts/auditoria/cetico-47-candidatos.mjs
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';

const BASE = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '47');
const r = JSON.parse(await readFile(path.join(BASE, 'analise.json'), 'utf8'));
const hm = (t) => (t === null || t === undefined ? '' : `${String(Math.floor(t / 3600)).padStart(2, '0')}:${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}`);
const cheia = new Map(); // turno|id → [delta]
for (const l of (await readFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'engenheiro-seguranca-urna', 'h20', 'ajustes-hora-cheia.csv'), 'utf8')).split(/\r?\n/).slice(1)) {
  if (!l) continue;
  const c = l.split(',');
  const k = `${c[0]}|${c[1]}/${c[2]}/${c[3]}/${c[4]}`;
  if (!cheia.has(k)) cheia.set(k, []);
  cheia.get(k).push(`${c[5]} ${c[10]} min (${c[8]})`);
}
const cand = { 1: r.turnos[1].local.listaAdiantados, 2: r.turnos[2].local.listaAdiantados };
const precisa = new Map(); // `${turno}|${uf}` → Set(id)
for (const t of [1, 2]) for (const x of cand[t]) {
  const outro = 3 - t;
  const uf = x.id.slice(0, 2);
  for (const tt of [t, outro]) { const k = `${tt}|${uf}`; if (!precisa.has(k)) precisa.set(k, new Set()); precisa.get(k).add(x.id); }
}
const sec = new Map(); // turno|id → resumo
for (const [k, ids] of precisa) {
  const [t, uf] = k.split('|');
  for (const l of (await readFile(path.join(BASE, `${t}t`, `${uf}.jsonl`), 'utf8')).split('\n')) {
    if (!l) continue;
    const s = JSON.parse(l);
    const id = `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`;
    if (!ids.has(id)) continue;
    const comVoto = s.fluxos.filter((f) => f.nV);
    let enc = null, v1 = null, pr = null;
    for (const f of comVoto) {
      if (f.enc && (enc === null || f.enc[0] > enc)) enc = f.enc[0];
      if (f.v1 && (v1 === null || f.v1[0] < v1)) v1 = f.v1[0];
      if (f.pronta && (pr === null || f.pronta[0] < pr)) pr = f.pronta[0];
    }
    sec.set(`${t}|${id}`, { urnas: comVoto.map((f) => f.urna), enc, v1, pr, retAntesZer: comVoto.map((f) => f.retJanela.antesZer), contingencia: s.fluxos.some((f) => f.contingencia) });
  }
}
const out = { 1: [], 2: [] };
for (const t of [1, 2]) {
  for (const x of cand[t]) {
    const a = sec.get(`${t}|${x.id}`), b = sec.get(`${3 - t}|${x.id}`);
    const mesmaUrna = a && b && a.urnas.length === 1 && b.urnas.length === 1 && a.urnas[0] === b.urnas[0];
    const acertos = [...(cheia.get(`1|${x.id}`) ?? []), ...(cheia.get(`2|${x.id}`) ?? [])];
    const outroNormal = b && b.enc !== null && b.enc % 86400 < 17.5 * 3600 && b.v1 !== null && b.v1 < 8.5 * 3600 + (x.id.startsWith('zz') ? 0 : 0);
    let leitura;
    if (acertos.length) leitura = 'acerto de hora cheia no diário: relógio errado (ver caso)';
    else if (mesmaUrna && outroNormal) leitura = 'mesma urna, relógio sem acerto de hora cheia, outro turno normal: atraso real neste turno';
    else if (!mesmaUrna) leitura = 'urna diferente entre os turnos ou mais de uma urna: decidir no bruto';
    else leitura = 'mesma urna, outro turno também deslocado: relógio errado provável (ver caso)';
    out[t].push({ id: x.id, espera: x.espera, pronta: x.pronta, v1: x.v1, enc: x.enc, medEnc: x.medEnc, outroTurno: b ? { pronta: hm(b.pr), v1: hm(b.v1), enc: hm(b.enc), urnas: b.urnas.length } : null, mesmaUrna, acertos, leitura });
  }
}
for (const t of [1, 2]) {
  const cont = {};
  for (const o of out[t]) cont[o.leitura] = (cont[o.leitura] ?? 0) + 1;
  console.log(`\n== turno ${t}: ${out[t].length} seções "tudo 1 h depois do local"`);
  console.log(JSON.stringify(cont, null, 1));
  for (const o of out[t]) if (!o.leitura.startsWith('mesma urna, relógio sem')) console.log(JSON.stringify(o));
}
