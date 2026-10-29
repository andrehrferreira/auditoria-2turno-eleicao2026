// T15, tópico 08 (virada do 2º turno): confere no universo completo, pela cópia de leitura do banco, os números que os
// revisores externos apontaram. Saída: data/parsed/auditoria/t15/08-virada.json
// Uso: node scripts/auditoria/t15-08-virada.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

const { db } = await abrirLeitura();
const ELEICAO = { 1: 6257, 2: 6258 };

function turno(t) {
  const m = new Map();
  for (const r of db.prepare(`select uf, municipio, zona, secao, numero, tipo_voto, sum(quantidade) q from voto_bu
      where turno = ? and cargo = 1 and eleicao = ? group by 1,2,3,4,5,6`).iterate(t, ELEICAO[t])) {
    const k = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
    const s = m.get(k) ?? { uf: r.uf, l: 0, f: 0, outros: 0, b: 0, n: 0, total: 0 };
    if (r.numero === 13 && r.tipo_voto === 'nominal') s.l += r.q;
    else if (r.numero === 22 && r.tipo_voto === 'nominal') s.f += r.q;
    else if (r.tipo_voto === 'nominal') s.outros += r.q;
    else if (r.tipo_voto === 'branco') s.b += r.q;
    else s.n += r.q;
    s.total += r.q;
    m.set(k, s);
  }
  for (const r of db.prepare('select uf, municipio, zona, secao, aptos, comparecimento_majoritario c from secao_eleicao where turno = ? and eleicao = ?').iterate(t, ELEICAO[t])) {
    const s = m.get(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`);
    if (s) Object.assign(s, { aptos: r.aptos, comp: r.c });
  }
  for (const r of db.prepare("select uf, municipio, zona, secao, comparecimento, tipo_urna from secao where turno = ? and situacao = 'completa'").iterate(t)) {
    const s = m.get(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`);
    if (s) Object.assign(s, { compGeral: r.comparecimento, tipoUrna: r.tipo_urna });
  }
  return m;
}

const T = { 1: turno(1), 2: turno(2) };
const out = {};

// 1. Votos = comparecimento da eleição de presidente, por seção; campo geral zerado.
for (const t of [1, 2]) {
  let secoes = 0, iguais = 0, soma = 0, somaCompGeral = 0, l = 0, f = 0, b = 0, n = 0, outros = 0;
  const geralZerado = [];
  for (const [k, s] of T[t]) {
    secoes++;
    if (s.total === s.comp) iguais++;
    soma += s.total; somaCompGeral += s.compGeral ?? 0; l += s.l; f += s.f; b += s.b; n += s.n; outros += s.outros;
    if ((s.compGeral ?? 0) === 0 && s.total > 0) geralZerado.push({ k, votos: s.total });
  }
  out[`turno${t}`] = {
    secoesComVotoPresidente: secoes, votosIgualComparecimentoPresidente: iguais, votos: soma, lula: l, flavio: f, brancos: b, nulos: n, outros,
    somaCampoGeralComparecimento: somaCompGeral, diferencaCampoGeral: soma - somaCompGeral,
    campoGeralZerado: { secoes: geralZerado.length, porUf: geralZerado.reduce((a, x) => ((a[x.k.split('/')[0]] = (a[x.k.split('/')[0]] ?? 0) + 1), a), {}), votos: geralZerado.reduce((a, x) => a + x.votos, 0) },
  };
}

// 2. Votos do 22 por UF nos dois turnos (perdas líquidas).
const porUf = {};
for (const t of [1, 2]) for (const s of T[t].values()) { const u = (porUf[s.uf] ??= { f1: 0, f2: 0 }); u[`f${t}`] += s.f; }
out.perdaLiquida22PorUf = Object.fromEntries(Object.entries(porUf).filter(([, u]) => u.f2 < u.f1).map(([uf, u]) => [uf, u.f2 - u.f1]));

// 3. Seções pareadas (urna não de lona: tipo diferente de 'apuracao'?) com comparecimento que não caiu e perda do 22, em todas as UFs.
const p6 = {};
const tipos = new Set();
for (const [k, s2] of T[2]) {
  const s1 = T[1].get(k);
  if (!s1) continue;
  tipos.add(`${s1.tipoUrna}|${s2.tipoUrna}`);
  const dComp = s2.total - s1.total, dF = s2.f - s1.f;
  if (dComp >= 0 && dF < 0) {
    const u = (p6[s2.uf] ??= { secoes: 0, d22: 0, d13: 0, dBN: 0, secoesBNsubiu: 0, secoesD13menorQuePerda22: 0 });
    u.secoes++; u.d22 += dF; u.d13 += s2.l - s1.l; const dBN = (s2.b + s2.n) - (s1.b + s1.n); u.dBN += dBN;
    if (dBN > 0) u.secoesBNsubiu++;
    if (s2.l - s1.l < -dF) u.secoesD13menorQuePerda22++;
  }
}
out.tiposUrnaPares = [...tipos];
out.perda22SemQuedaComparecimento = p6;

// 4. Troca obrigatória (mesma fórmula de scripts/troca-obrigatoria-banco.mjs), na cópia de leitura.
let comparadas = 0;
const troca = { 13: { secoes: 0, eleitores: 0, lista: [] }, 22: { secoes: 0, eleitores: 0, lista: [] } };
for (const [k, b] of T[2]) {
  const a = T[1].get(k);
  if (!a || a.aptos == null || b.aptos == null) continue;
  comparadas++;
  const fontes = a.outros + a.b + a.n + Math.max(0, a.aptos - a.comp) + Math.max(0, b.aptos - a.aptos);
  for (const [c, v1, v2] of [['13', a.l, b.l], ['22', a.f, b.f]]) {
    const x = Math.max(0, v2 - (v1 + fontes));
    if (x > 0) { troca[c].secoes++; troca[c].eleitores += x; troca[c].lista.push({ k, troca: x, aptos1: a.aptos, aptos2: b.aptos }); }
  }
}
out.trocaObrigatoria = { comparadas, ...troca };

const dir = path.join(DIR_DADOS, 'parsed', 'auditoria', 't15');
await mkdir(dir, { recursive: true });
await writeFile(path.join(dir, '08-virada.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
