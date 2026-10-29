// Cético, achado "invariantes sem violação", item (d): reconcilia T2 do matemático (turnos-violacoes.jsonl,
// "com biometria > biometria do cadastro + TTE", seção×turno) com o "excesso inverso" do auditor B
// (biometria-b1a-diagnostico.mjs sobre b1a-<t>t.jsonl: comparecimento − sem biometria > cadastro com biometria +
// TTE + max(0, aptos da seção − cadastro)), que é o número de docs/pericia/04 (17.621 seções, 229.717 votantes).
// Saída: data/parsed/auditoria/cetico/invariantes-biometria-reconciliacao.json
import { createReadStream } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

const linhas = async function* (f) {
  for await (const l of createInterface({ input: createReadStream(f), crlfDelay: Infinity })) if (l) yield JSON.parse(l);
};
const autor = { 1: new Map(), 2: new Map() };
for await (const v of linhas(path.join(DIR_DADOS, 'parsed', 'auditoria', 'matematico', 'turnos-violacoes.jsonl'))) {
  if (v.inv !== 'T2') continue;
  const t = v.turno - 1;
  const exc = v.comBio - v.cadastro[t].b - v.tte[t];
  autor[v.turno].set(`${v.uf}/${v.secao}`, { exc, uf: v.uf });
}
const folga = (r) => (r.aptosTTE ?? 0) + Math.max(0, (r.aptosSecao ?? 0) - r.cadastro);
const out = {};
for (const t of [2, 1]) {
  const b = new Map();
  const ufsB = new Set();
  let folgaExtra = 0;
  for await (const r of linhas(path.join(DIR_DADOS, 'parsed', 'auditoria', 'biometria', `b1a-${t}t.jsonl`))) {
    ufsB.add(r.k.slice(0, 2));
    if ((r.aptosSecao ?? 0) > r.cadastro) folgaExtra++;
    const exc = r.comparecimento - r.semBioBU - r.cadastroBiometria - folga(r);
    if (exc > 0) b.set(r.k, exc);
  }
  const a = autor[t];
  const so = (x, y) => [...x.keys()].filter((k) => !y.has(k));
  const somaA = [...a.values()].reduce((s, x) => s + x.exc, 0);
  const somaB = [...b.values()].reduce((s, x) => s + x, 0);
  const aNasUfsB = [...a.entries()].filter(([k]) => ufsB.has(k.slice(0, 2)));
  const porUf = {};
  for (const [, x] of a) porUf[x.uf] = (porUf[x.uf] ?? 0) + 1;
  const difExc = [...a.entries()].filter(([k, x]) => b.has(k) && b.get(k) !== x.exc).length;
  out[`${t}t`] = {
    autorT2: { secoes: a.size, excesso: somaA }, b1aInverso: { secoes: b.size, excesso: somaB, ufs: [...ufsB].sort() },
    autorRestritoAsUfsDoB1a: { secoes: aNasUfsB.length, excesso: aNasUfsB.reduce((s, [, x]) => s + x.exc, 0) },
    soNoAutor: so(a, b).length, soNoB1a: so(b, a).length, mesmasSecoesComExcessoDiferente: difExc,
    secoesComFolgaExtraDoB1a: folgaExtra, autorPorUf: porUf,
  };
  console.log(`${t}t`, JSON.stringify(out[`${t}t`]));
}
const ambos = [...autor[2].keys()].filter((k) => autor[1].has(k)).length;
out.secoesDistintas = { ambosTurnos: ambos, total: autor[1].size + autor[2].size - ambos };
// Mesma carga (mesmo arquivo de eleitores na urna) nos dois turnos, nas seções com T2 violado
const { db } = await abrirLeitura();
const carga = db.prepare('SELECT a.codigo_carga = b.codigo_carga AS igual FROM secao a JOIN secao b ON b.turno = 2 AND b.uf = a.uf AND b.municipio = a.municipio AND b.zona = a.zona AND b.secao = a.secao WHERE a.turno = 1 AND a.uf = ? AND a.municipio = ? AND a.zona = ? AND a.secao = ?');
const todas = new Set([...autor[1].keys(), ...autor[2].keys()]);
let mesma = 0;
let ambosMesma = 0;
for (const k of todas) {
  const [uf, m, z, s] = k.split('/');
  const r = carga.get(uf, m, z, s);
  if (r?.igual) {
    mesma++;
    if (autor[1].has(k) && autor[2].has(k)) ambosMesma++;
  }
}
out.secoesDistintas.mesmaCargaNosDoisTurnos = mesma;
out.secoesDistintas.nosDoisTurnosEMesmaCarga = ambosMesma;
console.log(JSON.stringify(out.secoesDistintas));
await writeFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'invariantes-biometria-reconciliacao.json'), `${JSON.stringify(out, null, 1)}\n`);
