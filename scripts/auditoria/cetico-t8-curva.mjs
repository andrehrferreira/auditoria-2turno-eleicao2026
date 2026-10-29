// Revisão cética do tópico 8: cópia de scripts/curva-totalizacao.mjs com gerador corrigido, 100 embaralhamentos e um
// teste de poder (troca uniforme de 3,7% dos votos do 22 injetada antes de montar as curvas).
// Uso: node --max-old-space-size=8192 scripts/auditoria/cetico-t8-curva.mjs
// Reconstrói a curva da totalização oficial do 2º turno (presidente) pela hora em que cada seção entrou na totalização
// (DT_PRIM_TOT_PARCIAL_HOR_TSE de detalhe_votacao_secao) e testa se a forma dela se explica pela ordem de chegada das UFs.
// Hipótese do auditor: subida do 22 seguida de queda "linear e regular", impossível numa contagem aleatória.
// Contraprova: a contagem não é amostra aleatória; chega por região. Se embaralhar a ordem das seções DENTRO de cada UF,
// mantendo quantas seções de cada UF chegam em cada minuto, a curva muda pouco → a forma vem da ordem das UFs.
// O mesmo teste também é feito mantendo a ordem de chegada de cada MUNICÍPIO (capitais costumam transmitir antes).
// Votos por seção: tabela voto_oficial do banco SQLite (doc 09). Uso: node scripts/curva-totalizacao.mjs
import { open, readdir } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { db } = await abrirLeitura();
const votos = new Map();
for (const r of db.prepare("select uf, municipio, zona, secao, numero, quantidade from voto_oficial where turno = 2 and cargo = 1 and numero in (13, 22)").iterate()) {
  const k = `${r.uf}/${Number(r.municipio)}/${Number(r.zona)}/${Number(r.secao)}`;
  const v = votos.get(k) ?? { l: 0, f: 0 };
  if (r.numero === 13) v.l += r.quantidade; else v.f += r.quantidade;
  votos.set(k, v);
}

const dir = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'detalhe_votacao_secao');
const h = await open(path.join(dir, (await readdir(dir)).find((n) => n.endsWith('.zip'))));
const secoes = [];
for (const e of (await listarEntradas(h)).filter((x) => x.nome.endsWith('.csv') && !/_BR\.csv$/i.test(x.nome))) {
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
      const t = c[i('DT_PRIM_TOT_PARCIAL_HOR_TSE')];
      const m = /(\d\d)\/(\d\d)\/(\d{4}) (\d\d):(\d\d):(\d\d)/.exec(t);
      const v = votos.get(k);
      if (!m || !v) continue;
      secoes.push({ uf, mun: `${uf}/${Number(c[i('CD_MUNICIPIO')])}`, t: Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6]), ...v });
    }
    pos = fim;
  }
}
await h.close();
secoes.sort((a, b) => a.t - b.t);
const totL = secoes.reduce((a, s) => a + s.l, 0);
const totF = secoes.reduce((a, s) => a + s.f, 0);
console.log(`${secoes.length} seções com hora de totalização e voto oficial; total 13 = ${totL}, 22 = ${totF}`);

// curva: parcela do 22 entre os finalistas a cada 2% das seções apuradas
function curva(lista) {
  const pts = [];
  let l = 0, f = 0;
  const passo = Math.floor(lista.length / 50);
  lista.forEach((s, i) => {
    l += s.l; f += s.f;
    if ((i + 1) % passo === 0) pts.push(f / (l + f));
  });
  return pts;
}
const real = curva(secoes);

// contrafactual: mesma sequência de UFs (quantas seções de cada UF em cada posição), seções embaralhadas dentro da UF
// gerador corrigido (o LCG do autor perde bits em ponto flutuante e entra em ciclo de ~10 mil valores)
let semente = 2026;
const aleatorio = () => { semente = (semente + 0x6d2b79f5) | 0; let t = Math.imul(semente ^ (semente >>> 15), 1 | semente); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
/** Mantém em cada posição da fila o mesmo grupo (UF ou município) e embaralha as seções dentro do grupo. */
function embaralharDentro(chave) {
  const grupos = new Map();
  for (const s of secoes) {
    if (!grupos.has(s[chave])) grupos.set(s[chave], []);
    grupos.get(s[chave]).push(s);
  }
  for (const lista of grupos.values()) for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  const cursor = new Map([...grupos.keys()].map((g) => [g, 0]));
  return secoes.map((s) => grupos.get(s[chave])[cursor.set(s[chave], cursor.get(s[chave]) + 1).get(s[chave]) - 1]);
}
const NSIM = 100;
const sims = Array.from({ length: NSIM }, () => curva(embaralharDentro('uf')));
const simsMun = Array.from({ length: NSIM }, () => curva(embaralharDentro('mun')));
// contrafactual 2: ordem totalmente aleatória (o que seria "contagem aleatória")
function embaralharTudo() {
  const l = [...secoes];
  for (let i = l.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [l[i], l[j]] = [l[j], l[i]];
  }
  return l;
}
const aleat = curva(embaralharTudo());

const hora = (ms) => new Date(ms).toISOString().slice(11, 16);
const passo = Math.floor(secoes.length / 50);
const faixa = (lista, p) => {
  const v = lista.map((s) => s[p]).sort((a, b) => a - b);
  return `[${(100 * v[0]).toFixed(2)}–${(100 * v[v.length - 1]).toFixed(2)}%]`;
};
console.log('\n% apurado | hora (TSE) | parcela do 22: real | ordem das UFs mantida | ordem dos municípios mantida | ordem 100% aleatória');
for (let p = 0; p < real.length; p += 2) {
  console.log(`${String(2 * (p + 1)).padStart(4)}%     ${hora(secoes[(p + 1) * passo - 1].t)}      ${(100 * real[p]).toFixed(2)}%   ${faixa(sims, p).padEnd(18)}   ${faixa(simsMun, p).padEnd(18)}   ${(100 * aleat[p]).toFixed(2)}%`);
}
const maior = (lista) => Math.max(...real.map((r, p) => Math.max(...lista.map((s) => Math.abs(r - s[p])))));
console.log(`\nMaior diferença entre a curva real e as embaralhadas: dentro da UF ${(100 * maior(sims)).toFixed(2)} pp; dentro do município ${(100 * maior(simsMun)).toFixed(2)} pp`);
// ordem de chegada das UFs
const primeira = new Map();
for (const s of secoes) {
  const o = primeira.get(s.uf) ?? { n: 0, soma: 0 };
  o.n++; o.soma += s.t;
  primeira.set(s.uf, o);
}
console.log('Hora média de totalização por UF:', [...primeira].map(([u, o]) => [u, o.soma / o.n]).sort((a, b) => a[1] - b[1]).map(([u, t]) => `${u} ${hora(t)}`).join(', '));

// PODER: a curva real e a contrafactual são feitas com os mesmos votos. Uma troca nos votos entra nas duas.
const tr = (s) => { const m = Math.round(0.037 * s.f); return { ...s, l: s.l + m, f: s.f - m }; };
const orig = secoes.map((s) => ({ ...s }));
for (let i = 0; i < secoes.length; i++) secoes[i] = tr(orig[i]);
const realT = curva(secoes);
const simsMunT = Array.from({ length: 30 }, () => curva(embaralharDentro('mun')));
console.log(`
Com troca uniforme de 3,7% do 22 → 13 injetada: parcela final do 22 ${(100 * realT[realT.length - 1]).toFixed(2)}%; maior diferença real × embaralhada dentro do município ${(100 * Math.max(...realT.map((r, p) => Math.max(...simsMunT.map((x) => Math.abs(r - x[p])))))).toFixed(2)} pp (sem troca: ${(100 * maior(simsMun)).toFixed(2)} pp)`);
// troca ligada à ordem de chegada DENTRO do município: só nas seções que chegaram na 2ª metade do próprio município
const ordemMun = new Map();
for (const s of orig) { const o = ordemMun.get(s.mun) ?? []; o.push(s.t); ordemMun.set(s.mun, o); }
const mediana = new Map([...ordemMun].map(([k, v]) => [k, v.sort((a, b) => a - b)[v.length >> 1]]));
for (let i = 0; i < secoes.length; i++) secoes[i] = orig[i].t > mediana.get(orig[i].mun) ? tr(orig[i]) : { ...orig[i] };
const simsMunT2 = Array.from({ length: 30 }, () => curva(embaralharDentro('mun')));
console.log(`Troca de 3,7% só nas seções que chegaram depois da mediana do próprio município: maior diferença ${(100 * Math.max(...curva(secoes).map((r, p) => Math.max(...simsMunT2.map((s) => Math.abs(r - s[p])))))).toFixed(2)} pp`);
