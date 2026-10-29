// Cético, achado "invariantes sem violação", item (c): refaz T1 (aptos da seção ≤ cadastro), T3 (limite cruzado) e
// Δ aptos da seção sem o código do autor, e mede a sensibilidade à UNIDADE: o que acontece se o cadastro NÃO somar as
// seções agregadas (seção principal sozinha). Se T1 só fecha somando as agregadas, o teste tem poder para detectar
// troca de unidade — e o 0 não é trivial.
// Fontes: cópia de leitura do banco (abrirLeitura) e data/parsed/auditoria/biometria/cadastro-secao.jsonl
// (perfil_eleitor_secao de 14/07/2026, já agregado por seção pelo auditor B).
// Saída: data/parsed/auditoria/cetico/invariantes-turnos-refeito.json
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { lerCadastro } from './biometria-cadastro.mjs';

const { db, ponteiro } = await abrirLeitura();
const cad = await lerCadastro();
const FED = { 1: 6257, 2: 6258 };
const sec = (t) => new Map(db.prepare(`SELECT s.uf, s.municipio, s.zona, s.secao, s.sem_biometria, s.por_biometria, s.por_biografia, e.aptos_secao, e.aptos_tte
  FROM secao s JOIN secao_eleicao e USING (turno, uf, municipio, zona, secao) WHERE s.turno = ? AND e.eleicao = ? AND s.situacao = 'completa' AND s.uf <> 'zz'`)
  .all(t, FED[t]).map((r) => [`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, r]));
const agr = (t) => {
  const m = new Map();
  for (const a of db.prepare('SELECT uf, municipio, zona, secao, secao_principal FROM secao_agregada WHERE turno = ? AND uf <> \'zz\'').all(t)) {
    const p = `${a.uf}/${a.municipio}/${a.zona}/${a.secao_principal}`;
    m.set(p, [...(m.get(p) ?? []), `${a.uf}/${a.municipio}/${a.zona}/${a.secao}`]);
  }
  return m;
};
const S = { 1: sec(1), 2: sec(2) };
const A = { 1: agr(1), 2: agr(2) };
const r = { copia: ponteiro.criadoEm, secoesAmbos: 0, semCadastro: 0, agregacaoDiferente: 0, comAgregadas: 0,
  T1: { testadas: 0, viol: 0, violSemSomarAgregadas: 0, iguais: 0 }, T3: { testadas: 0, viol: 0, folgaMinima: Infinity },
  deltaAptos: { min: Infinity, max: -Infinity, soma: 0, neg: 0, zero: 0, pos: 0 }, deltaTTE: 0, foraDoBanco: { soNo1: 0, soNo2: 0 } };
for (const k of S[1].keys()) if (!S[2].has(k)) r.foraDoBanco.soNo1++;
for (const [k, s2] of S[2]) {
  const s1 = S[1].get(k);
  if (!s1) { r.foraDoBanco.soNo2++; continue; }
  r.secoesAmbos++;
  const d = s2.aptos_secao - s1.aptos_secao;
  r.deltaAptos.min = Math.min(r.deltaAptos.min, d); r.deltaAptos.max = Math.max(r.deltaAptos.max, d); r.deltaAptos.soma += d;
  r.deltaAptos[d < 0 ? 'neg' : d > 0 ? 'pos' : 'zero']++;
  r.deltaTTE += s2.aptos_tte - s1.aptos_tte;
  const g1 = [k, ...(A[1].get(k) ?? [])].sort().join(',');
  const g2 = [k, ...(A[2].get(k) ?? [])].sort().join(',');
  if (g1 !== g2) r.agregacaoDiferente++;
  const membros = g2.split(',');
  if (membros.length > 1) r.comAgregadas++;
  if (membros.some((m) => !cad.has(m))) { r.semCadastro++; continue; }
  const N = membros.reduce((s, m) => s + cad.get(m).eleitores, 0);
  const Nprincipal = cad.get(k).eleitores;
  for (const s of [s1, s2]) {
    r.T1.testadas++;
    if (s.aptos_secao > N) r.T1.viol++;
    if (s.aptos_secao === N) r.T1.iguais++;
    if (s.aptos_secao > Nprincipal) r.T1.violSemSomarAgregadas++;
  }
  if (s1.sem_biometria === null || s2.sem_biometria === null) continue;
  r.T3.testadas++;
  const lim = N + s1.aptos_tte + s2.aptos_tte;
  const a = s2.por_biometria + s2.por_biografia + s1.sem_biometria;
  const b = s1.por_biometria + s1.por_biografia + s2.sem_biometria;
  if (a > lim || b > lim) r.T3.viol++;
  r.T3.folgaMinima = Math.min(r.T3.folgaMinima, lim - Math.max(a, b));
}
console.log(JSON.stringify(r, null, 1));
await writeFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'invariantes-turnos-refeito.json'), `${JSON.stringify(r, null, 1)}\n`);
