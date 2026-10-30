// Cético, parecer 39 (H23): a contagem de "recarga sem motivo" depende da regra "qualquer linha ERRO na sessão anterior
// é motivo"? Refaz a classificação do matemático (mesma ordem pelo arquivamento, mesmos motivos) sobre a releitura dele
// (h23-relidos.jsonl, lida do bruto) e de novo com a regra estrita: ERRO só conta como motivo se não for um dos dois
// erros de rotina vistos a cada ligação ("Problema ao desmontar a MR") ou no atendimento ("Falha na captura da digital").
// Para saber se esses dois são rotina, mede a frequência deles nas sessões vivas (diário do BU) do 2º turno relidas.
// Uso: node scripts/auditoria/cetico-39-h23-regra.mjs → data/parsed/auditoria/cetico-revisor/39-h23-regra.json
import { createReadStream } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DIR_DADOS } from '../../src/config.js';
import { abrirLeitura } from '../../src/banco-leitura.js';

const MF = path.join(DIR_DADOS, 'parsed', 'auditoria', 'matematico-forense');
const OUT = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor');
const iso = (s) => (s ? `${s.slice(6, 10)}-${s.slice(3, 5)}-${s.slice(0, 2)} ${s.replace(' - ', ' ').slice(11, 19)}` : null);
const ordem = (g) => { const m = /^\d{8}(\d{2})(\d{2})(\d{4})(\d{2})(\d{2})(\d{2})-0\d\.jez$/.exec(g.nome); return m ? Number(`${m[3]}${m[2]}${m[1]}${m[4]}${m[5]}${m[6]}`) : 99999999999999; };
const periodo = (q) => (!q ? '?' : q < '2026-10-04' ? 'antes do 1º turno' : q < '2026-10-05' ? 'dia do 1º turno' : q < '2026-10-25' ? 'entre os turnos' : q < '2026-10-26' ? 'dia do 2º turno' : 'depois');
const ROTINA = /desmontar a MR|Falha na captura da digital/;
const mesma = (a, b) => a.secao === b.secao && a.zona === b.zona && a.municipio === b.municipio;
const motivo = (a, b, estrita) => {
  const erros = estrita ? Object.entries(a.errosMsg).filter(([m]) => !ROTINA.test(m)).reduce((x, [, n]) => x + n, 0) : a.erros;
  const votos = Object.values(a.votos).reduce((x, y) => x + y, 0);
  return !a.carga.ok ? 'falhou' : erros > 0 ? 'erro' : a.carga.secao === '0000' && b.carga.secao !== '0000' ? 'reserva' : b.carga.secao === '0000' ? 'paraReserva'
    : !mesma(a.carga, b.carga) ? 'outraSecao' : votos > 0 ? 'votou' : b.carga.fcGeracao && iso(b.carga.fcGeracao) > (iso(a.carga.relogio) ?? '') ? 'novaMidia' : 'semMotivo';
};
const codigos1t = new Set();
for await (const l of createInterface({ input: createReadStream(path.join(MF, 'h23-sessoes-1t.jsonl')), crlfDelay: Infinity })) if (l) { const s = JSON.parse(l); codigos1t.add(`${s.urna}|${s.codigo}`); }
const pares = { 1: new Map(), 2: new Map() };
const rotinaVivas = { sessoesVivas2t: 0, comDesmontarMR: 0, comFalhaCaptura: 0 };
for await (const l of createInterface({ input: createReadStream(path.join(MF, 'h23-relidos.jsonl')), crlfDelay: Infinity })) {
  if (!l) continue;
  const p = JSON.parse(l);
  if (!p.logs) continue;
  const pu = new Map();
  for (const g of p.logs) {
    if (p.turno === 2 && g.prof === 0) { rotinaVivas.sessoesVivas2t++; const ks = Object.keys(g.errosMsg); if (ks.some((m) => /desmontar a MR/.test(m))) rotinaVivas.comDesmontarMR++; if (ks.some((m) => /Falha na captura da digital/.test(m))) rotinaVivas.comFalhaCaptura++; }
    if (!g.carga?.codigo) continue;
    (pu.get(g.urna) ?? pu.set(g.urna, []).get(g.urna)).push(g);
  }
  for (const [u, L] of pu) {
    if (L.length < 2) continue;
    L.sort((a, b) => ordem(a) - ordem(b));
    for (let i = 1; i < L.length; i++) {
      const a = L[i - 1]; const b = L[i];
      if (a.carga.codigo === b.carga.codigo) continue;
      const id = `${u}|${a.carga.codigo}|${b.carga.codigo}`;
      if (pares[p.turno].has(id)) continue;
      const q = iso(b.carga.digitada);
      if (p.turno === 2 && q && q < '2026-10-05') continue;
      if (p.turno === 2 && codigos1t.has(`${u}|${b.carga.codigo}`)) continue;
      pares[p.turno].set(id, { k: p.k, urna: u, nova: b.carga.codigo, periodo: periodo(q), original: motivo(a, b, false), estrita: motivo(a, b, true),
        errosAnterior: Object.keys(a.errosMsg) });
    }
  }
}
const { db, fonte } = await abrirLeitura();
const bu = { 1: new Map(), 2: new Map() };
for (const r of db.prepare("SELECT turno, uf, municipio, zona, secao, numero_interno_urna u, codigo_carga c FROM secao WHERE situacao = 'completa'").iterate()) bu[r.turno].set(`${String(r.u).padStart(8, '0')}|${r.c}`, `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`);
db.close();
const R = { fonte, rotinaVivas };
for (const t of [1, 2]) {
  const tab = {}; const novosSem = []; let buOrig = 0; let buEstr = 0;
  for (const r of pares[t].values()) {
    const c = `${r.periodo} · ${r.original} → ${r.estrita}`;
    tab[c] = (tab[c] ?? 0) + 1;
    const k = bu[t].get(`${r.urna}|${r.nova}`);
    if (r.original === 'semMotivo' && k) buOrig++;
    if (r.estrita === 'semMotivo' && k) buEstr++;
    if (r.estrita === 'semMotivo' && r.original !== 'semMotivo') novosSem.push({ k: r.k, periodo: r.periodo, geraBu: k ?? null, errosAnterior: r.errosAnterior });
  }
  const sem = (campo, per) => [...pares[t].values()].filter((r) => r[campo] === 'semMotivo' && (!per || r.periodo === per)).length;
  R[`${t}t`] = { recargas: pares[t].size, semMotivoOriginal: sem('original'), semMotivoEstrita: sem('estrita'),
    semMotivoEntreTurnosOriginal: sem('original', 'entre os turnos'), semMotivoEntreTurnosEstrita: sem('estrita', 'entre os turnos'),
    buDeSemMotivoOriginal: buOrig, buDeSemMotivoEstrita: buEstr, mudancas: Object.fromEntries(Object.entries(tab).filter(([c]) => !c.endsWith(c.split(' → ')[0].split(' · ')[1]))),
    novosSemMotivo: t === 2 ? novosSem : novosSem.length };
}
await writeFile(path.join(OUT, '39-h23-regra.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, (c, v) => (c === 'novosSemMotivo' && Array.isArray(v) ? v.slice(0, 12) : v), 1));
