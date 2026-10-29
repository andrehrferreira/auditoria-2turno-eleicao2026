// Cético, achado "invariantes sem violação", itens (c) e (d): refaz T1, T2, T3 e Δaptos entre turnos sem o código
// do autor (matematico-turnos.mjs). Banco: cópia de leitura (src/banco-leitura.js). Cadastro: a redução por seção
// já gravada pelo auditor B (data/parsed/auditoria/biometria/cadastro-secao.jsonl); com --conferir-uf <uf>, a
// redução é conferida contra o CSV bruto do perfil_eleitor_secao daquela UF (leitura própria do zip).
// Também mede o excesso de T2 em eleitores, para reconciliar com o parecer 01 (229.717 em 17.621 seções, 2º turno).
// Uso: node scripts/auditoria/cetico-isv-turnos.mjs [--conferir-uf ac]
import { createReadStream } from 'node:fs';
import { mkdir, open, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { createInflateRaw } from 'node:zlib';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { listarEntradas } from '../../src/zip.js';

const { values } = parseArgs({ options: { 'conferir-uf': { type: 'string' } } });
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'isv');
const { db, ponteiro } = await abrirLeitura();

const cad = new Map();
for (const l of (await readFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'biometria', 'cadastro-secao.jsonl'), 'utf8')).split('\n')) {
  if (!l) continue;
  const r = JSON.parse(l);
  cad.set(r.k, { n: r.eleitores, b: r.biometria, data: r.dataGeracao });
}

// Conferência independente da redução contra o CSV bruto de uma UF
const conferencia = {};
if (values['conferir-uf']) {
  const uf = values['conferir-uf'];
  const zip = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'perfil_eleitor_secao', `perfil_eleitor_secao_2026_${uf.toUpperCase()}.zip`);
  const h = await open(zip);
  const e = (await listarEntradas(h)).find((x) => x.nome.toLowerCase().endsWith('.csv'));
  const cab = Buffer.alloc(30);
  await h.read(cab, 0, 30, e.offsetLocal);
  await h.close();
  const ini = e.offsetLocal + 30 + cab.readUInt16LE(26) + cab.readUInt16LE(28);
  let fluxo = createReadStream(zip, { start: ini, end: ini + e.tamanhoComprimido - 1 });
  if (e.metodo === 8) fluxo = fluxo.pipe(createInflateRaw());
  const bruto = new Map();
  let col = null;
  for await (const linha of createInterface({ input: fluxo.setEncoding('latin1'), crlfDelay: Infinity })) {
    const c = [...linha.matchAll(/("([^"]*)"|[^;]*)(;|$)/g)].slice(0, -1).map((m) => m[2] ?? m[1]);
    if (!col) {
      col = Object.fromEntries(c.map((n, i) => [n, i]));
      continue;
    }
    const k = `${uf}/${c[col.CD_MUNICIPIO].padStart(5, '0')}/${c[col.NR_ZONA].padStart(4, '0')}/${c[col.NR_SECAO].padStart(4, '0')}`;
    const s = bruto.get(k) ?? { n: 0, b: 0 };
    s.n += Number(c[col.QT_ELEITORES]);
    s.b += Number(c[col.QT_ELEITORES_BIOMETRIA]);
    bruto.set(k, s);
  }
  let iguais = 0;
  const difs = [];
  for (const [k, s] of bruto) {
    const r = cad.get(k);
    if (r && r.n === s.n && r.b === s.b) iguais++;
    else difs.push({ k, bruto: s, reducao: r ?? null });
  }
  const soNaReducao = [...cad.keys()].filter((k) => k.startsWith(`${uf}/`) && !bruto.has(k)).length;
  Object.assign(conferencia, { uf, colunas: Object.keys(col), secoesBruto: bruto.size, iguais, diferentes: difs.length, soNaReducao, exemplos: difs.slice(0, 5) });
  console.log('conferência do cadastro', JSON.stringify(conferencia));
}

const FED = { 1: 6257, 2: 6258 };
const secoes = (t) => db.prepare(`SELECT s.uf, s.municipio, s.zona, s.secao, s.comparecimento, s.sem_biometria, s.por_biometria, s.por_biografia,
    e.aptos_secao, e.aptos_tte FROM secao s JOIN secao_eleicao e USING (turno, uf, municipio, zona, secao)
  WHERE s.turno = ? AND e.eleicao = ? AND s.situacao = 'completa' AND s.uf <> 'zz'`).all(t, FED[t]);
const k = (r) => `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
const S = { 1: new Map(secoes(1).map((r) => [k(r), r])), 2: new Map(secoes(2).map((r) => [k(r), r])) };
const agreg = { 1: new Map(), 2: new Map() };
for (const a of db.prepare('SELECT turno, uf, municipio, zona, secao, secao_principal FROM secao_agregada').all()) {
  const p = `${a.uf}/${a.municipio}/${a.zona}/${a.secao_principal}`;
  agreg[a.turno].set(p, [...(agreg[a.turno].get(p) ?? []), `${a.uf}/${a.municipio}/${a.zona}/${a.secao}`]);
}
const grupo = (t, c) => [c, ...(agreg[t].get(c) ?? [])];
const somaCad = (g) => {
  let n = 0;
  let b = 0;
  for (const x of g) {
    const r = cad.get(x);
    if (!r) return null;
    n += r.n;
    b += r.b;
  }
  return { n, b };
};

const r = {
  copiaLeitura: ponteiro.criadoEm, secoes1: S[1].size, secoes2: S[2].size, ambos: 0, so1: 0, so2: 0, semCadastro: 0, semCadastroLista: [], grupoDiferente: 0,
  T1: { testadas: 0, violacoes: 0 }, T3: { testadas: 0, semDetalhamento: 0, violacoes: 0 },
  T2: { 1: { testadas: 0, violacoes: 0, soBiometria: 0, excesso: 0, porUf: {} }, 2: { testadas: 0, violacoes: 0, soBiometria: 0, excesso: 0, porUf: {} } },
  delta: { min: Infinity, max: -Infinity, zero: 0, pos: 0, neg: 0, soma: 0, somaTTE: 0 },
};
for (const c of S[1].keys()) if (!S[2].has(c)) r.so1++;
for (const [c, s2] of S[2]) {
  const s1 = S[1].get(c);
  if (!s1) {
    r.so2++;
    continue;
  }
  r.ambos++;
  const d = s2.aptos_secao - s1.aptos_secao;
  r.delta.min = Math.min(r.delta.min, d);
  r.delta.max = Math.max(r.delta.max, d);
  r.delta[d === 0 ? 'zero' : d > 0 ? 'pos' : 'neg']++;
  r.delta.soma += d;
  r.delta.somaTTE += s2.aptos_tte - s1.aptos_tte;
  const g1 = grupo(1, c);
  const g2 = grupo(2, c);
  if (g1.join() !== g2.join()) r.grupoDiferente++;
  const c1 = somaCad(g1);
  const c2 = somaCad(g2);
  if (!c1 || !c2) {
    r.semCadastro++;
    r.semCadastroLista.push(c);
    continue;
  }
  for (const [t, s, cc] of [[1, s1, c1], [2, s2, c2]]) {
    r.T1.testadas++;
    if (s.aptos_secao > cc.n) r.T1.violacoes++;
    if (s.sem_biometria === null) continue;
    const x = r.T2[t];
    x.testadas++;
    const com = s.por_biometria + s.por_biografia;
    if (com > cc.b + s.aptos_tte) {
      x.violacoes++;
      x.excesso += com - cc.b - s.aptos_tte;
      x.porUf[s.uf] = (x.porUf[s.uf] ?? 0) + 1;
    }
    if (s.por_biometria > cc.b + s.aptos_tte) x.soBiometria++;
  }
  if (s1.sem_biometria === null || s2.sem_biometria === null) {
    r.T3.semDetalhamento++;
    continue;
  }
  r.T3.testadas++;
  const lim = c1.n + s1.aptos_tte + s2.aptos_tte;
  if (s2.por_biometria + s2.por_biografia + s1.sem_biometria > lim || s1.por_biometria + s1.por_biografia + s2.sem_biometria > lim) r.T3.violacoes++;
}
// Poder de T1/T3: folga mínima (quanto faltaria para violar), por seção
const folgas = { T1: [], T3: [] };
for (const [c, s2] of S[2]) {
  const s1 = S[1].get(c);
  if (!s1) continue;
  const c1 = somaCad(grupo(1, c));
  if (!c1 || s1.sem_biometria === null || s2.sem_biometria === null) continue;
  folgas.T1.push(c1.n - Math.max(s1.aptos_secao, s2.aptos_secao));
  const lim = c1.n + s1.aptos_tte + s2.aptos_tte;
  folgas.T3.push(lim - Math.max(s2.por_biometria + s2.por_biografia + s1.sem_biometria, s1.por_biometria + s1.por_biografia + s2.sem_biometria));
}
const q = (xs, p) => {
  const o = [...xs].sort((a, b) => a - b);
  return o[Math.floor(p * (o.length - 1))];
};
r.folgaT1 = { p01: q(folgas.T1, 0.01), mediana: q(folgas.T1, 0.5), p99: q(folgas.T1, 0.99), zero: folgas.T1.filter((x) => x === 0).length };
r.folgaT3 = { p01: q(folgas.T3, 0.01), mediana: q(folgas.T3, 0.5), p99: q(folgas.T3, 0.99), ate5: folgas.T3.filter((x) => x <= 5).length };
r.conferencia = conferencia;
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, 'turnos.json'), `${JSON.stringify(r, null, 1)}\n`);
console.log(JSON.stringify({ ...r, semCadastroLista: r.semCadastroLista.length }, null, 1));
