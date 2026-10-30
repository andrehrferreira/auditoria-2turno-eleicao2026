// Cético revisor, parecer 47 (H20). Ponto cego do teste de acertos de hora cheia do engenheiro (seguranca-h20-ajustes.mjs):
// no 2º turno ele só olha o diário a partir de 05/10 quando a urna não tem linha de 04/10, então a CARGA de setembro de
// uma urna que votou pela primeira vez no 2º turno (reserva nova na seção) fica de fora. Aqui:
//   1. pela varredura própria (cetico-47-varredura.mjs), acha as urnas que votaram no 2º turno numa seção e não votaram
//      nela no 1º turno;
//   2. relê o diário bruto do 2º turno dessas seções e, para cada uma dessas urnas, toda "Data e hora que foi digitada
//      pelo operador" (e o ADH): Δ = hora digitada − relógio da urna; e os eventos do dia (zerésima, pronta, votos,
//      encerramento) e as recusas do ADH depois da zerésima.
// Uso: node scripts/auditoria/cetico-47-carga-2t.mjs
// Saída: data/parsed/auditoria/cetico-revisor/47/carga-2t.json
import { open, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const BASE = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '47');
const mem = (b) => ({ read: async (d, o, n, p) => ({ bytesRead: b.copy(d, o, p, p + n) }), stat: async () => ({ size: b.length }) });
const abs = (s) => Date.UTC(+s.slice(6, 10), +s.slice(3, 5) - 1, +s.slice(0, 2), +s.slice(11, 13), +s.slice(14, 16), +(s.slice(17, 19) || 0)) / 1000;
async function textos(h, nivel, out) {
  for (const e of await listarEntradas(h)) {
    const d = await lerEntrada(h, e);
    if (e.nome === 'logd.dat') out.push(d.toString('latin1'));
    else if (e.nome.endsWith('.jez') && nivel < 5) await textos(mem(d), nivel + 1, out);
  }
  return out;
}
// 1. urnas novas no 2º turno
const urnas1 = new Map();
const novas = new Map(); // id → Set(urna)
for (const uf of UFS) {
  for (const l of (await readFile(path.join(BASE, '1t', `${uf}.jsonl`), 'utf8')).split('\n')) {
    if (!l) continue;
    const s = JSON.parse(l);
    urnas1.set(`${s.uf}/${s.municipio}/${s.zona}/${s.secao}`, new Set((s.fluxos ?? []).filter((f) => f.nV).map((f) => f.urna)));
  }
  for (const l of (await readFile(path.join(BASE, '2t', `${uf}.jsonl`), 'utf8')).split('\n')) {
    if (!l) continue;
    const s = JSON.parse(l);
    const id = `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`;
    const u1 = urnas1.get(id) ?? new Set();
    for (const f of s.fluxos ?? []) if (f.nV && !u1.has(f.urna)) { if (!novas.has(id)) novas.set(id, new Set()); novas.get(id).add(f.urna); }
  }
  urnas1.clear();
}
// 2. diário bruto do 2º turno dessas seções
const res = { secoes: novas.size, urnas: 0, semDigitada: 0, faixas: {}, horaCheia: [] };
const faixa = (d) => { const a = Math.abs(d); return a < 5 ? '0-4' : a < 45 ? '5-44' : a <= 75 ? (d > 0 ? '+45..+75' : '-45..-75') : a < 1440 ? '76min-1dia' : '>=1dia'; };
for (const [id, us] of novas) {
  const dir = path.join(DIR_DADOS, 'raw', '2t', 'urnas', ...id.split('/'));
  const linhasPorUrna = new Map();
  for (const pac of (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name)) {
    const arq = acharArquivo(await readdir(path.join(dir, pac)), 'log');
    if (!arq) continue;
    const h = await open(path.join(dir, pac, arq));
    let ts;
    try { ts = await textos(h, 0, []); } finally { await h.close(); }
    for (const t of ts) {
      const loc = new Map();
      for (const b of t.split('\n')) {
        const l = b.endsWith('\r') ? b.slice(0, -1) : b;
        const c = l.split('\t');
        if (c.length < 5 || !us.has(c[2])) continue;
        if (!loc.has(c[2])) loc.set(c[2], []);
        loc.get(c[2]).push(l);
      }
      for (const [u, ls] of loc) if ((linhasPorUrna.get(u)?.length ?? 0) < ls.length) linhasPorUrna.set(u, ls);
    }
  }
  for (const [u, ls] of linhasPorUrna) {
    res.urnas++;
    const ds = [];
    let zer = null, pronta = null, v1 = null, vN = null, enc = null, adhRecusa = 0;
    for (const l of ls) {
      const c = l.split('\t');
      const m = c[4];
      const dg = /(?:digitada pelo operador: |Ajuste de Data e Hora )(\d\d\/\d\d\/\d{4}) - (\d\d:\d\d)/.exec(m);
      if (dg) ds.push({ quando: l.slice(0, 16), app: c[3], delta: Math.round((abs(`${dg[1]} ${dg[2]}:00`) - abs(l)) / 60) });
      if (!l.startsWith('25/10/2026')) continue;
      const hh = l.slice(11, 16);
      if (m.startsWith('Imprimindo relatório [ZERÉSIMA]')) zer ??= hh;
      else if (m === 'Urna pronta para receber votos') pronta ??= hh;
      else if (m === 'O voto do eleitor foi computado') { v1 ??= hh; vN = hh; }
      else if (m === 'Procedimento de encerramento confirmado') enc ??= hh;
      else if (/não pode ser executado após a impressão da zerésima/.test(m)) adhRecusa++;
    }
    if (!ds.length) { res.semDigitada++; continue; }
    const ult = ds.at(-1);
    const soma = ds.reduce((a, d) => a + d.delta, 0);
    const f = faixa(soma);
    res.faixas[f] = (res.faixas[f] ?? 0) + 1;
    if (f.startsWith('+45') || f.startsWith('-45')) res.horaCheia.push({ id, urna: u, acertos: ds, somaMin: soma, zer, pronta, v1, vN, enc, adhRecusa, ultimo: ult.quando });
  }
}
await writeFile(path.join(BASE, 'carga-2t.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify({ ...res, horaCheia: res.horaCheia.length }, null, 1));
for (const x of res.horaCheia) console.log(JSON.stringify(x));
