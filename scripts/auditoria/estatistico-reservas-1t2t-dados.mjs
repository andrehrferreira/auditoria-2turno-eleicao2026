import { createReadStream, existsSync, readdirSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

// H14 (estatístico eleitoral): urnas trocadas por reserva no 2º turno × a mesma seção no 1º turno.
// Monta uma linha por seção com os dois turnos: aptos, comparecimento, presidente (13, 22, demais, brancos, nulos),
// local de votação, nº de agregadas, tipo/nº/modelo da urna e a classe da troca entre turnos. Para as seções com urna
// reserva no 2º turno, lê a varredura de logs do engenheiro (seguranca-varrer-logs.mjs, 2t/*.secoes.jsonl) e marca se
// a urna original (log aninhado, profundidade > 0) ligou no dia 25/10/2026 (contingência no dia) e quantos votos ela
// computou nesse dia. Universo: todas as seções; nada é amostrado.
// Fonte dos votos: BU (voto_bu, cargo 1). Conferência: soma por turno contra voto_oficial (dados abertos).
// Saída: data/parsed/auditoria/reservas-1t2t/secoes.csv e dados.json.
// Uso: node --max-old-space-size=8192 scripts/auditoria/estatistico-reservas-1t2t-dados.mjs

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'reservas-1t2t');
const VARREDURA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'engenheiro-seguranca-urna', '2t');
const ELEICAO = { 1: 6257, 2: 6258 };
const t0 = Date.now();
const { db, fonte, ponteiro } = await abrirLeitura();
const chave = (r) => `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;

const S = new Map(); // chave → registro
const reg = (k) => {
  let r = S.get(k);
  if (!r) { r = { k, t: { 1: null, 2: null } }; S.set(k, r); }
  return r;
};
for (const turno of [1, 2]) {
  const q = db.prepare(`SELECT s.uf, s.municipio, s.zona, s.secao, s.situacao, s.local, s.tipo_urna, s.modelo_urna, s.numero_interno_urna,
      s.data_hora_carga, s.comparecimento, e.aptos, e.comparecimento_majoritario cm
    FROM secao s LEFT JOIN secao_eleicao e ON e.turno = s.turno AND e.uf = s.uf AND e.municipio = s.municipio AND e.zona = s.zona
      AND e.secao = s.secao AND e.eleicao = ${ELEICAO[turno]}
    WHERE s.turno = ${turno}`);
  for (const r of q.iterate()) {
    reg(chave(r)).t[turno] = { situacao: r.situacao, local: r.local, tipo: r.tipo_urna, modelo: r.modelo_urna, urna: r.numero_interno_urna,
      carga: r.data_hora_carga, comp: r.comparecimento, aptos: r.aptos, cm: r.cm, v13: 0, v22: 0, outros: 0, branco: 0, nulo: 0, agreg: 0 };
  }
  for (const r of db.prepare(`SELECT uf, municipio, zona, secao, tipo_voto, numero, quantidade FROM voto_bu WHERE turno = ${turno} AND cargo = 1`).iterate()) {
    const t = S.get(chave(r))?.t[turno];
    if (!t) continue;
    if (r.tipo_voto === 'branco') t.branco += r.quantidade;
    else if (r.tipo_voto === 'nulo') t.nulo += r.quantidade;
    else if (r.numero === 13) t.v13 += r.quantidade;
    else if (r.numero === 22) t.v22 += r.quantidade;
    else t.outros += r.quantidade;
  }
  for (const r of db.prepare(`SELECT uf, municipio, zona, secao_principal secao, COUNT(*) n FROM secao_agregada WHERE turno = ${turno} GROUP BY 1, 2, 3, 4`).iterate()) {
    const t = S.get(chave(r))?.t[turno];
    if (t) t.agreg = r.n;
  }
  console.log(`turno ${turno}: lido (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
// Conferência BU × oficial (soma de presidente por turno e por número 13, 22, 95, 96)
const conf = {};
for (const turno of [1, 2]) {
  const bu = { 13: 0, 22: 0, 95: 0, 96: 0, outros: 0 };
  for (const r of S.values()) {
    const t = r.t[turno];
    if (!t) continue;
    bu[13] += t.v13; bu[22] += t.v22; bu[95] += t.branco; bu[96] += t.nulo; bu.outros += t.outros;
  }
  const of = { 13: 0, 22: 0, 95: 0, 96: 0, outros: 0 };
  for (const r of db.prepare(`SELECT numero, SUM(quantidade) q FROM voto_oficial WHERE turno = ${turno} AND cargo = 1 GROUP BY numero`).all()) {
    if (of[r.numero] !== undefined) of[r.numero] += r.q; else of.outros += r.q;
  }
  conf[turno] = { bu, oficial: of };
}
db.close();

// Varredura de logs: urna original na contingência
const alvo = new Set();
for (const r of S.values()) if (r.t[2] && (r.t[2].tipo === 'reservaSecao' || r.t[2].tipo === 'reservaEncerrandoSecao')) alvo.add(r.k);
let lidasVarredura = 0;
if (!existsSync(VARREDURA)) throw new Error(`falta a varredura de logs do 2º turno em ${VARREDURA}`);
for (const arq of readdirSync(VARREDURA).filter((n) => n.endsWith('.secoes.jsonl')).sort()) {
  for await (const l of createInterface({ input: createReadStream(path.join(VARREDURA, arq)), crlfDelay: Infinity })) {
    if (!l) continue;
    const m = /^\{"uf":"(\w+)","municipio":"(\d+)","zona":"(\d+)","secao":"(\d+)"/.exec(l);
    if (!m) continue;
    const k = `${m[1]}/${m[2]}/${m[3]}/${m[4]}`;
    if (!alvo.has(k)) continue;
    const v = JSON.parse(l);
    lidasVarredura++;
    const orig = v.logs.filter((g) => g.profundidade > 0);
    const inst = v.logs.filter((g) => g.profundidade === 0);
    const boots25 = orig.flatMap((g) => g.boots).filter((b) => b.ligada?.startsWith('25/10/2026') || b.ultimaLinha?.startsWith('25/10/2026'));
    const r = S.get(k);
    r.var = {
      logsOrig: orig.length,
      urnasOrig: [...new Set(orig.flatMap((g) => g.urnas.map(Number)))],
      modeloOrig: [...new Set(orig.map((g) => g.modelo))].join('+'),
      orig25: boots25.length > 0,
      votosOrig25: boots25.reduce((a, b) => a + (b.votos ?? 0), 0),
      votosOrig: orig.flatMap((g) => g.boots).reduce((a, b) => a + (b.votos ?? 0), 0),
      votosInst: inst.flatMap((g) => g.boots).reduce((a, b) => a + (b.votos ?? 0), 0),
      ultimaOrig: orig.flatMap((g) => g.boots).map((b) => b.ultimaLinha).filter(Boolean).sort((a, b) => dataOrd(a).localeCompare(dataOrd(b))).at(-1) ?? null,
    };
  }
}
function dataOrd(s) { // "dd/mm/aaaa hh:mm:ss" → "aaaammdd hh:mm:ss"
  return `${s.slice(6, 10)}${s.slice(3, 5)}${s.slice(0, 2)} ${s.slice(11)}`;
}

// Classe da seção
const ehReserva = (t) => t.tipo === 'reservaSecao' || t.tipo === 'reservaEncerrandoSecao';
function classe(r) {
  const [a, b] = [r.t[1], r.t[2]];
  if (!a || !b) return 'so_um_turno';
  if (a.situacao !== 'completa' || b.situacao !== 'completa') return 'sem_bu';
  if (a.tipo === 'contingencia' || b.tipo === 'contingencia') return 'sistema_apuracao';
  const mesma = a.urna === b.urna;
  if (!ehReserva(b)) {
    if (a.tipo === 'secao') return mesma ? 'controle' : 'secao_secao';
    return mesma ? 'reserva_secao_mesma' : 'reserva_secao';
  }
  if (mesma) return a.tipo === 'secao' ? 'secao_reserva_mesma' : 'reserva_herdada';
  if (r.var?.orig25) return r.var.votosOrig25 > 0 ? 'contingencia_dia_com_votos' : 'contingencia_dia_antes_abertura';
  return a.tipo === 'secao' ? 'secao_reserva_antes' : 'reserva_reserva_antes';
}

const COLS = ['uf', 'municipio', 'zona', 'secao', 'classe',
  'tipo1', 'tipo2', 'urna1', 'urna2', 'modelo1', 'modelo2', 'carga2', 'local1', 'local2', 'agreg1', 'agreg2',
  'a1', 'c1', 'v13_1', 'v22_1', 'out1', 'br1', 'nu1', 'a2', 'c2', 'v13_2', 'v22_2', 'out2', 'br2', 'nu2',
  'orig25', 'votosOrig25', 'votosOrig', 'votosInst', 'urnasOrig', 'modeloOrig', 'ultimaOrig', 'orig_eh_urna1t'];
const linhas = [COLS.join(';')];
const contagem = {};
for (const r of S.values()) {
  const c = classe(r);
  contagem[c] = (contagem[c] ?? 0) + 1;
  const [a, b] = [r.t[1] ?? {}, r.t[2] ?? {}];
  const [uf, municipio, zona, secao] = r.k.split('/');
  const v = r.var ?? {};
  linhas.push([uf, municipio, zona, secao, c, a.tipo, b.tipo, a.urna, b.urna, a.modelo, b.modelo, b.carga, a.local, b.local, a.agreg, b.agreg,
    a.aptos, a.comp, a.v13, a.v22, a.outros, a.branco, a.nulo, b.aptos, b.comp, b.v13, b.v22, b.outros, b.branco, b.nulo,
    v.orig25 === undefined ? '' : v.orig25 ? 1 : 0, v.votosOrig25 ?? '', v.votosOrig ?? '', v.votosInst ?? '', (v.urnasOrig ?? []).join('+'), v.modeloOrig ?? '',
    v.ultimaOrig ?? '', v.urnasOrig ? (v.urnasOrig.includes(a.urna) ? 1 : 0) : ''].map((x) => x ?? '').join(';'));
}
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, 'secoes.csv'), `${linhas.join('\n')}\n`);
const meta = { geradoEm: new Date().toISOString(), fonte, ponteiro, secoes: S.size, classes: contagem, reservas2t: alvo.size, lidasVarredura, conferenciaBuOficial: conf };
await writeFile(path.join(SAIDA, 'dados.json'), JSON.stringify(meta, null, 1));
console.log(JSON.stringify(meta, null, 1));
console.log(`fim (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
