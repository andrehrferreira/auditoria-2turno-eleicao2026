// Verificação independente dos números de docs/pericia/02-coerencia-entre-arquivos.md (regra "só dado 100% correto").
// Recalcula do banco (cópia de leitura imutável, src/banco-leitura.js) com consultas próprias (GROUP BY em SQL), sem
// reaproveitar o laço de contagem-coerencia.mjs. Universo: todas as seções completas das UFs pedidas.
// Uso:
//   node scripts/auditoria/verifica-pericia-coerencia.mjs --turno 2                      (C1 a C6, totais, exclusões)
//   node scripts/auditoria/verifica-pericia-coerencia.mjs --turno 1 --uf ac,al,am,...    (1º turno, só as UFs dadas)
// Saída: resumo em JSON no terminal.
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';

const { values: a } = parseArgs({ options: { turno: { type: 'string', default: '2' }, uf: { type: 'string' } } });
const turno = Number(a.turno);
const FEDERAL = { 1: 6257, 2: 6258 }[turno];
const PROP = new Set([6, 7, 8]);
const { db, ponteiro } = await abrirLeitura();
const ufs = a.uf ? a.uf.split(',') : db.prepare('SELECT DISTINCT uf FROM secao WHERE turno = ? ORDER BY uf').all(turno).map((r) => r.uf);

const r = {
  copia: ponteiro?.arquivo, turno, ufs: ufs.join(','), secoes: 0, completas: 0, naoCompletas: 0,
  c1: { grupos: 0, divergentes: 0, bu: {}, rdv: {} },
  c2: { comparadas: 0, divergentes: [], semPerfil: 0 },
  c3: { grupos: 0, divergentes: 0, semComparecimento: {}, secoesSemComparecimento: 0 },
  c4: { linhas: 0, divergentes: 0 },
  c5: { comparadas: 0, divergentes: 0, semDetalhe: 0, semDetalhePorUf: {} },
  c6: { comparadas: 0, divergentes: [], sa: 0 },
  sa: { secoes: 0, porUf: {}, votosFederal: 0 },
  comparecimentoTotal: 0, comparecimentoAcimaAptos: 0,
  reserva: 0, multiLog: 0, multiLogBuIgualLog: 0,
};
const soma = (o, k, n) => { o[k] = (o[k] ?? 0) + n; };
const key = (x) => `${x.municipio}|${x.zona}|${x.secao}`;

for (const uf of ufs) {
  const secoes = new Map();
  for (const s of db.prepare('SELECT municipio, zona, secao, hash, situacao, tipo_urna, tipo_arquivo, comparecimento, sem_biometria, por_biometria, por_biografia FROM secao WHERE turno = ? AND uf = ?').iterate(turno, uf)) {
    r.secoes++;
    if (s.situacao !== 'completa') { r.naoCompletas++; continue; }
    r.completas++;
    secoes.set(key(s), { ...s, el: new Map() });
  }
  for (const e of db.prepare('SELECT municipio, zona, secao, eleicao, aptos, aptos_secao, aptos_tte, comparecimento_majoritario maj, comparecimento_proporcional prop FROM secao_eleicao WHERE turno = ? AND uf = ?').iterate(turno, uf)) {
    const s = secoes.get(key(e));
    if (s) s.el.set(e.eleicao, e);
  }
  const perfil = new Map();
  for (const p of db.prepare('SELECT municipio, zona, secao, hash, votos_computados vc, logs_no_pacote n FROM perfil_log WHERE turno = ? AND uf = ?').iterate(turno, uf)) perfil.set(`${key(p)}|${p.hash}`, p);

  // C1: BU × RDV, agregados em SQL por seção × eleição × cargo × chave
  const grupos = new Map(); // sec|eleicao|cargo → {bu: Map, rdv: Map, total}
  const g = (k) => { if (!grupos.has(k)) grupos.set(k, { bu: new Map(), rdv: new Map(), total: 0 }); return grupos.get(k); };
  for (const v of db.prepare(`SELECT municipio, zona, secao, eleicao, cargo, tipo_voto t,
      CASE WHEN tipo_voto IN ('nominal','legenda') THEN tipo_voto || ':' || numero ELSE tipo_voto END k, SUM(quantidade) q
      FROM voto_bu WHERE turno = ? AND uf = ? GROUP BY municipio, zona, secao, eleicao, cargo, tipo_voto, k`).iterate(turno, uf)) {
    if (!secoes.has(key(v))) continue;
    soma(r.c1.bu, v.t, v.q);
    const x = g(`${key(v)}|${v.eleicao}|${v.cargo}`); x.bu.set(v.k, (x.bu.get(v.k) ?? 0) + v.q); x.total += v.q;
  }
  for (const v of db.prepare(`SELECT municipio, zona, secao, eleicao, cargo, tipo_voto t,
      CASE WHEN tipo_voto = 'nominal' THEN 'nominal:' || CAST(digitacao AS INTEGER)
           WHEN tipo_voto = 'legenda' THEN 'legenda:' || CAST(substr(digitacao, 1, 2) AS INTEGER)
           WHEN tipo_voto LIKE 'nulo%' THEN 'nulo' ELSE tipo_voto END k, SUM(quantidade) q
      FROM voto_rdv WHERE turno = ? AND uf = ? GROUP BY municipio, zona, secao, eleicao, cargo, tipo_voto, k`).iterate(turno, uf)) {
    if (!secoes.has(key(v))) continue;
    soma(r.c1.rdv, v.t, v.q);
    const x = g(`${key(v)}|${v.eleicao}|${v.cargo}`); x.rdv.set(v.k, (x.rdv.get(v.k) ?? 0) + v.q);
  }
  const semComp = new Set();
  for (const [k, x] of grupos) {
    r.c1.grupos++;
    if ([...new Set([...x.bu.keys(), ...x.rdv.keys()])].some((c) => (x.bu.get(c) ?? 0) !== (x.rdv.get(c) ?? 0))) r.c1.divergentes++;
    // C3
    const [mun, zona, sec, eleicao, cargo] = k.split('|');
    const e = secoes.get(`${mun}|${zona}|${sec}`).el.get(Number(eleicao));
    const comp = e ? (PROP.has(Number(cargo)) ? e.prop : e.maj) : null;
    if (comp === null || comp === undefined) { soma(r.c3.semComparecimento, `eleicao ${eleicao} cargo ${cargo}`, 1); semComp.add(`${mun}|${zona}|${sec}`); continue; }
    r.c3.grupos++;
    if (x.total !== (turno === 1 && Number(cargo) === 5 ? 2 : 1) * comp) r.c3.divergentes++;
  }
  r.c3.secoesSemComparecimento += semComp.size;

  for (const [k, s] of secoes) {
    const sa = String(s.tipo_arquivo).startsWith('sa');
    const fed = s.el.get(FEDERAL);
    if (String(s.tipo_urna).startsWith('reserva')) r.reserva++;
    r.comparecimentoTotal += sa ? (fed?.maj ?? 0) : s.comparecimento;
    if (fed && (sa ? fed.maj : s.comparecimento) > fed.aptos) r.comparecimentoAcimaAptos++;
    if (sa) { r.sa.secoes++; soma(r.sa.porUf, uf, 1); r.sa.votosFederal += fed?.maj ?? 0; }
    // C2
    const p = perfil.get(`${k}|${s.hash}`);
    if (p && p.n > 1) { r.multiLog++; if (p.vc === s.comparecimento) r.multiLogBuIgualLog++; }
    if (!sa) {
      if (!p) r.c2.semPerfil++;
      else { r.c2.comparadas++; if (p.vc !== s.comparecimento) r.c2.divergentes.push(`${uf} ${k.replaceAll('|', '/')} log ${p.vc} BU ${s.comparecimento} logs ${p.n}`); }
    }
    // C4
    for (const e of s.el.values()) { r.c4.linhas++; if (e.aptos !== (e.aptos_secao ?? 0) + (e.aptos_tte ?? 0)) r.c4.divergentes++; }
    // C5
    if (s.sem_biometria === null || s.por_biometria === null || s.por_biografia === null) { r.c5.semDetalhe++; soma(r.c5.semDetalhePorUf, uf, 1); }
    else { r.c5.comparadas++; if (s.sem_biometria + s.por_biometria + s.por_biografia !== s.comparecimento) r.c5.divergentes++; }
    // C6
    if (sa) { r.c6.sa++; continue; }
    r.c6.comparadas++;
    const ruim = (fed && fed.maj !== s.comparecimento) || [...s.el.values()].some((e) => e.maj !== null && e.prop !== null && e.maj !== e.prop);
    if (ruim) r.c6.divergentes.push(`${uf} ${k.replaceAll('|', '/')} ${s.tipo_urna}/${s.tipo_arquivo}`);
  }
  console.error(`${uf} ok`);
}
console.log(JSON.stringify(r, null, 1));
