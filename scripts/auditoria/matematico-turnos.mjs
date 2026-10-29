// Matemático forense: invariantes entre o 1º e o 2º turno na mesma seção, com o cadastro por seção
// (perfil_eleitor_secao dos dados abertos), nas UFs com os dois turnos no banco.
//
// Modelo: o cadastro fecha antes do 1º turno. Numa seção (principal + agregadas do turno), N eleitores, dos quais
// B com biometria cadastrada e A = N − B sem. Em cada turno t, TR_t deles pediram trânsito (saem da seção) e TTE_t
// eleitores de fora votam ali. Então, para todo t e t':
//   T1  aptos da seção_t = N − TR_t ≤ N
//   T2  com biometria_t (biometria + biografia) ≤ B + TTE_t
//   T3  com biometria_t + sem biometria_t' ≤ N + TTE_t + TTE_t'   (t ≠ t'; o mesmo eleitor não troca de grupo)
//   T4  descritivo: Δ aptos da seção (2º − 1º) = TR_1 − TR_2; Δ sem biometria cadastrada que votou.
// T3 usa só N (não depende de o dado aberto marcar biometria igual à urna). O limite sem biometria ≤ A + TTE é o B1a
// (auditor B) e não é repetido aqui.
//
// Uso: node scripts/auditoria/matematico-turnos.mjs [--uf ac,al]
// Saída: data/parsed/auditoria/matematico/turnos.json (resumo) e turnos-violacoes.jsonl
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { carregarUf } from './biometria-cadastro.mjs';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'matematico');
// Cópia de leitura imutável (doc 09, "Leitura sem concorrência"); as UFs do 1º turno nela estão em `ponteiro.cargas`.
const { db, ponteiro } = await abrirLeitura();
const { values } = parseArgs({ options: { uf: { type: 'string' } } });
const carregadas = db.prepare('SELECT uf FROM carga WHERE turno = 1 INTERSECT SELECT uf FROM carga WHERE turno = 2').all().map((r) => r.uf);
const ufs = values.uf ? values.uf.split(',') : carregadas.filter((u) => u !== 'zz');

const FEDERAL = { 1: 6257, 2: 6258 };
const secoesTurno = db.prepare(`SELECT s.municipio, s.zona, s.secao, s.tipo_urna, s.comparecimento, s.sem_biometria, s.por_biometria, s.por_biografia,
    e.aptos, e.aptos_secao, e.aptos_tte
  FROM secao s JOIN secao_eleicao e ON e.turno = s.turno AND e.uf = s.uf AND e.municipio = s.municipio AND e.zona = s.zona AND e.secao = s.secao AND e.eleicao = ?
  WHERE s.turno = ? AND s.uf = ? AND s.situacao = 'completa'`);
const agregadas = db.prepare('SELECT municipio, zona, secao, secao_principal FROM secao_agregada WHERE turno = ? AND uf = ?');

const k = (m, z, s) => `${m}/${z}/${s}`;
const percentil = (xs, p) => {
  const o = [...xs].sort((a, b) => a - b);
  return o.length ? o[Math.min(o.length - 1, Math.floor(p * o.length))] : null;
};

const resumo = { geradoEm: new Date().toISOString(), copiaLeitura: ponteiro, ufs: {}, total: {} };
const violacoes = [];
for (const uf of ufs) {
  const inicio = Date.now();
  const cad = await carregarUf(uf); // chave `${uf}/${mun}/${zona}/${secao}`
  const porTurno = {};
  const membros = {};
  for (const t of [1, 2]) {
    porTurno[t] = new Map(secoesTurno.all(FEDERAL[t], t, uf).map((r) => [k(r.municipio, r.zona, r.secao), r]));
    membros[t] = new Map();
    for (const a of agregadas.all(t, uf)) {
      const p = k(a.municipio, a.zona, a.secao_principal);
      membros[t].set(p, [...(membros[t].get(p) ?? []), k(a.municipio, a.zona, a.secao)]);
    }
  }
  const cadastro = (t, chave) => {
    let n = 0;
    let b = 0;
    let faltando = 0;
    for (const c of [chave, ...(membros[t].get(chave) ?? [])]) {
      const r = cad.get(`${uf}/${c}`);
      if (!r) faltando++;
      else {
        n += r.eleitores;
        b += r.biometria;
      }
    }
    return { n, b, faltando, grupo: [chave, ...(membros[t].get(chave) ?? [])].sort().join(',') };
  };
  const datas = new Set([...cad.values()].map((x) => x.dataGeracao));
  const r = { dataGeracaoCadastro: [...datas].join(','), secoesAmbos: 0, semCadastro: 0, agregacaoDiferente: 0, T1: 0, T2: 0, T2soBiometria: 0, T3: 0, T3testadas: 0, deltaAptos: { neg: 0, zero: 0, pos: 0, absMaior5: 0, soma: 0 }, deltaTTE: 0, deltaSemBio: [] };
  const deltas = [];
  for (const [chave, s2] of porTurno[2]) {
    const s1 = porTurno[1].get(chave);
    if (!s1) continue;
    r.secoesAmbos++;
    const c1 = cadastro(1, chave);
    const c2 = cadastro(2, chave);
    const d = s2.aptos_secao - s1.aptos_secao;
    deltas.push(d);
    r.deltaAptos[d < 0 ? 'neg' : d > 0 ? 'pos' : 'zero']++;
    if (Math.abs(d) > 5) r.deltaAptos.absMaior5++;
    r.deltaAptos.soma += d;
    r.deltaTTE += s2.aptos_tte - s1.aptos_tte;
    if (s1.sem_biometria !== null && s2.sem_biometria !== null) r.deltaSemBio.push(s2.sem_biometria - s1.sem_biometria);
    if (c1.faltando || c2.faltando) {
      r.semCadastro++;
      continue;
    }
    const base = { uf, secao: chave, tipo_urna: [s1.tipo_urna, s2.tipo_urna], aptos_secao: [s1.aptos_secao, s2.aptos_secao], tte: [s1.aptos_tte, s2.aptos_tte], cadastro: [c1, c2].map((c) => ({ n: c.n, b: c.b })) };
    for (const [t, s, c] of [[1, s1, c1], [2, s2, c2]]) {
      if (s.aptos_secao > c.n) {
        r.T1++;
        violacoes.push({ inv: 'T1', turno: t, ...base });
      }
      if (s.sem_biometria !== null && s.por_biometria + s.por_biografia > c.b + s.aptos_tte) {
        r.T2++;
        violacoes.push({ inv: 'T2', turno: t, comBio: s.por_biometria + s.por_biografia, porBiometria: s.por_biometria, ...base });
      }
      if (s.sem_biometria !== null && s.por_biometria > c.b + s.aptos_tte) r.T2soBiometria++;
    }
    if (c1.grupo !== c2.grupo) {
      r.agregacaoDiferente++;
      continue;
    }
    if (s1.sem_biometria === null || s2.sem_biometria === null) continue;
    r.T3testadas++;
    const lim = c1.n + s1.aptos_tte + s2.aptos_tte;
    const a = s2.por_biometria + s2.por_biografia + s1.sem_biometria;
    const b = s1.por_biometria + s1.por_biografia + s2.sem_biometria;
    if (a > lim || b > lim) {
      r.T3++;
      violacoes.push({ inv: 'T3', comBio2MaisSem1: a, comBio1MaisSem2: b, limite: lim, ...base });
    }
  }
  r.deltaAptos.p01 = percentil(deltas, 0.01);
  r.deltaAptos.p99 = percentil(deltas, 0.99);
  r.deltaAptos.min = deltas.length ? Math.min(...deltas) : null;
  r.deltaAptos.max = deltas.length ? Math.max(...deltas) : null;
  const ds = r.deltaSemBio;
  r.deltaSemBio = { soma: ds.reduce((x, y) => x + y, 0), p01: percentil(ds, 0.01), p99: percentil(ds, 0.99), min: ds.length ? Math.min(...ds) : null, max: ds.length ? Math.max(...ds) : null };
  resumo.ufs[uf] = r;
  for (const [campo, v] of Object.entries(r)) if (typeof v === 'number') resumo.total[campo] = (resumo.total[campo] ?? 0) + v;
  console.log(`${uf}: ${r.secoesAmbos} seções nos 2 turnos, T1 ${r.T1}, T2 ${r.T2} (só biometria ${r.T2soBiometria}), T3 ${r.T3}/${r.T3testadas}, Δaptos soma ${r.deltaAptos.soma} (TTE ${r.deltaTTE}) · ${((Date.now() - inicio) / 1000).toFixed(0)} s`);
}
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, 'turnos.json'), `${JSON.stringify(resumo, null, 1)}\n`);
await writeFile(path.join(SAIDA, 'turnos-violacoes.jsonl'), violacoes.map((v) => JSON.stringify(v)).join('\n') + (violacoes.length ? '\n' : ''));
console.log('total', JSON.stringify(resumo.total));
