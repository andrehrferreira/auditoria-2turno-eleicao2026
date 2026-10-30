// Parecer cético 34 (H26), passo 1: extração independente das seções dos dois turnos direto da cópia de leitura,
// sem usar pares-banco.csv nem virada-zonas.mjs. Uma linha por seção com: votos de presidente por candidato (13, 22,
// 14, 30, 55, 70, demais), brancos+nulos, aptos, comparecimento, habilitação (sem biometria / por biometria / por
// ano de nascimento), modelo da urna e votos por hora de Brasília (total, desde 15h, desde 17h). Também soma as horas
// por zona (24 valores por turno) para os picos.
// Fuso: hora local de abertura mais comum do município − 8 (exterior sem fuso); seções da tabela de relógio fora do
// fuso (data/parsed/auditoria/tempo/relogio-fora-do-fuso.csv) usam a própria diferença. Lido aqui com código próprio.
// Só leitura. Uso: node --max-old-space-size=8192 scripts/auditoria/cetico-34-h26-secoes.mjs
// Saídas em data/parsed/auditoria/cetico-revisor/: 34-h26-secoes.csv, 34-h26-horas-zona.csv, 34-h26-secoes.json.
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const SAIDA = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico-revisor');
await mkdir(SAIDA, { recursive: true });
const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const k4 = (uf, m, z, s) => `${uf}|${Number(m)}|${Number(z)}|${Number(s)}`;

const { db, fonte } = await abrirLeitura();
const conf = { fonte: path.basename(fonte) };
const T = [null, new Map(), new Map()];
const ELEICAO = { 1: 6257, 2: 6258 };
const qs = db.prepare(`SELECT s.uf, s.municipio, s.zona, s.secao, s.modelo_urna m, s.comparecimento c, s.sem_biometria sb,
    s.por_biometria pb, s.por_biografia pg, s.abertura, s.hash, e.aptos a
  FROM secao s LEFT JOIN secao_eleicao e ON e.turno = s.turno AND e.uf = s.uf AND e.municipio = s.municipio AND e.zona = s.zona
    AND e.secao = s.secao AND e.eleicao = ?
  WHERE s.turno = ? AND s.situacao = 'completa'`);
for (const t of [1, 2]) {
  for (const r of qs.iterate(ELEICAO[t], t)) {
    T[t].set(k4(r.uf, r.municipio, r.zona, r.secao), { ...r, v: new Map(), bn: 0 });
  }
  log(`turno ${t}: ${T[t].size} seções completas`);
}
conf.semAptos = [1, 2].map((t) => [...T[t].values()].filter((s) => s.a == null).length);

const qv = db.prepare(`SELECT uf, municipio, zona, secao, tipo_voto, numero, quantidade q FROM voto_bu WHERE turno = ? AND cargo = 1`);
conf.votosSemSecao = { 1: 0, 2: 0 };
conf.tipos = { 1: {}, 2: {} };
for (const t of [1, 2]) {
  for (const v of qv.iterate(t)) {
    const s = T[t].get(k4(v.uf, v.municipio, v.zona, v.secao));
    conf.tipos[t][v.tipo_voto] = (conf.tipos[t][v.tipo_voto] ?? 0) + v.q;
    if (!s) { conf.votosSemSecao[t] += v.q; continue; }
    if (v.tipo_voto === 'nominal') s.v.set(v.numero, (s.v.get(v.numero) ?? 0) + v.q);
    else if (v.tipo_voto === 'branco' || v.tipo_voto === 'nulo') s.bn += v.q;
  }
  log(`turno ${t}: votos lidos`);
}

// conferência contra o resultado oficial por seção (todos os candidatos de presidente)
const qo = db.prepare(`SELECT uf, municipio, zona, secao, numero, quantidade q FROM voto_oficial WHERE turno = ? AND cargo = 1`);
conf.oficial = {};
for (const t of [1, 2]) {
  const of = new Map();
  for (const o of qo.iterate(t)) {
    const k = k4(o.uf, o.municipio, o.zona, o.secao);
    if (!of.has(k)) of.set(k, new Map());
    of.get(k).set(o.numero, o.q);
  }
  let difere = 0, semOficial = 0, oficialSemSecao = 0;
  for (const [k, s] of T[t]) {
    const o = of.get(k);
    if (!o) { if (s.c > 0) semOficial++; continue; }
    for (const [n, q] of o) if (n !== 95 && n !== 96 && (s.v.get(n) ?? 0) !== q) { difere++; break; }
  }
  for (const k of of.keys()) if (!T[t].has(k)) oficialSemSecao++;
  conf.oficial[t] = { secoesComDiferencaNominal: difere, secoesComVotoSemOficial: semOficial, oficialSemSecaoCompleta: oficialSemSecao };
  log(`turno ${t}: oficial conferido`);
}

// horas por seção
const relogio = { 1: new Map(), 2: new Map() };
{
  const txt = await readFile(path.join(RAIZ, 'data', 'parsed', 'auditoria', 'tempo', 'relogio-fora-do-fuso.csv'), 'utf8');
  const [cab, ...ls] = txt.split(/\r?\n/).filter(Boolean);
  const i = Object.fromEntries(cab.split(',').map((c, j) => [c, j]));
  for (const l of ls) {
    const c = l.split(',');
    relogio[Number(c[i.turno])].set(k4(c[i.uf], c[i.municipio], c[i.zona], c[i.secao]), Number(c[i.hora_relogio_das_8h_brasilia]) - 8);
  }
}
const qh = db.prepare(`SELECT uf, municipio, zona, secao, hash, json_extract(dados, '$.log.votosPorHoraLocal') h FROM perfil_log WHERE turno = ?`);
const horasZona = new Map();
conf.horas = {};
for (const t of [1, 2]) {
  const moda = new Map();
  for (const s of T[t].values()) {
    if (!s.abertura) continue;
    const km = `${s.uf}|${s.municipio}`;
    const h = Number(s.abertura.slice(11, 13));
    if (!moda.has(km)) moda.set(km, new Map());
    moda.get(km).set(h, (moda.get(km).get(h) ?? 0) + 1);
  }
  const fuso = new Map([...moda].map(([km, m]) => [km, km.startsWith('zz|') ? null : [...m].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0] - 8]));
  const c = conf.horas[t] = { comHoras: 0, semFuso: 0, hashDiferente: 0, somaDifere: 0 };
  for (const p of qh.iterate(t)) {
    const k = k4(p.uf, p.municipio, p.zona, p.secao);
    const s = T[t].get(k);
    if (!s || !p.h) continue;
    if (p.hash !== s.hash) { c.hashDiferente++; continue; }
    const d0 = fuso.get(`${s.uf}|${s.municipio}`);
    if (d0 == null) { c.semFuso++; continue; }
    const d = relogio[t].get(k) ?? d0;
    const loc = JSON.parse(p.h);
    const bsb = new Array(24).fill(0);
    let tot = 0;
    loc.forEach((v, hl) => { bsb[Math.min(23, Math.max(0, hl - d))] += v; tot += v; });
    if (tot !== s.c) c.somaDifere++;
    s.ht = tot; s.h15 = bsb.slice(15).reduce((a, b) => a + b, 0); s.h17 = bsb.slice(17).reduce((a, b) => a + b, 0);
    s.hpico = bsb.indexOf(Math.max(...bsb));
    s.bsb = bsb;
    c.comHoras++;
  }
  log(`turno ${t}: horas de ${c.comHoras} seções`);
}
db.close();

// pares
const linhas = [];
conf.semPar = 0;
const COL = ['uf', 'municipio', 'zona', 'secao', 'modelo1', 'modelo2', 'a1', 'c1', 'a2', 'c2', 'v13_1', 'v22_1', 'v14_1', 'v30_1',
  'v55_1', 'v70_1', 'dem_1', 'bn1', 'v13_2', 'v22_2', 'out2', 'bn2', 'sb1', 'pb1', 'pg1', 'sb2', 'pb2', 'pg2',
  'ht1', 'h15_1', 'h17_1', 'ht2', 'h15_2', 'h17_2'];
for (const [k, x1] of T[1]) {
  const x2 = T[2].get(k);
  if (!x2) { conf.semPar++; continue; }
  const g = (x, n) => x.v.get(n) ?? 0;
  let dem = 0, out2 = 0;
  for (const [n, q] of x1.v) if (![13, 22, 14, 30, 55, 70].includes(n)) dem += q;
  for (const [n, q] of x2.v) if (n !== 13 && n !== 22) out2 += q;
  const l = { uf: x1.uf, municipio: x1.municipio, zona: x1.zona, secao: x1.secao, modelo1: x1.m, modelo2: x2.m,
    a1: x1.a, c1: x1.c, a2: x2.a, c2: x2.c, v13_1: g(x1, 13), v22_1: g(x1, 22), v14_1: g(x1, 14), v30_1: g(x1, 30), v55_1: g(x1, 55),
    v70_1: g(x1, 70), dem_1: dem, bn1: x1.bn, v13_2: g(x2, 13), v22_2: g(x2, 22), out2, bn2: x2.bn,
    sb1: x1.sb, pb1: x1.pb, pg1: x1.pg, sb2: x2.sb, pb2: x2.pb, pg2: x2.pg,
    ht1: x1.ht ?? '', h15_1: x1.h15 ?? '', h17_1: x1.h17 ?? '', ht2: x2.ht ?? '', h15_2: x2.h15 ?? '', h17_2: x2.h17 ?? '' };
  linhas.push(l);
  const kz = `${x1.uf}|${x1.zona}`;
  if (x1.bsb && x2.bsb) {
    const z = horasZona.get(kz) ?? horasZona.set(kz, { h1: new Array(24).fill(0), h2: new Array(24).fill(0) }).get(kz);
    for (let h = 0; h < 24; h++) { z.h1[h] += x1.bsb[h]; z.h2[h] += x2.bsb[h]; }
  }
}
for (const k of T[2].keys()) if (!T[1].has(k)) conf.semPar++;
conf.pares = linhas.length;
conf.somas = Object.fromEntries(['v13_1', 'v22_1', 'v13_2', 'v22_2', 'c1', 'c2'].map((c) => [c, linhas.reduce((a, l) => a + l[c], 0)]));
const csv = (ls, cols) => [cols.join(';'), ...ls.map((l) => cols.map((c) => l[c]).join(';'))].join('\n') + '\n';
await writeFile(path.join(SAIDA, '34-h26-secoes.csv'), csv(linhas, COL));
const hz = [...horasZona].map(([k, z]) => ({ uf: k.split('|')[0], zona: k.split('|')[1], h1: z.h1.join(','), h2: z.h2.join(',') }));
await writeFile(path.join(SAIDA, '34-h26-horas-zona.csv'), csv(hz, ['uf', 'zona', 'h1', 'h2']));
await writeFile(path.join(SAIDA, '34-h26-secoes.json'), JSON.stringify(conf, null, 1));
console.log(JSON.stringify(conf, null, 1));
