// Consolidação do parecer "números omitidos no munzona" (cetico-revisor, parecer 09).
// Confere só os pontos em que as três lentes divergiram ou que nenhuma conferiu:
//   1. o conjunto omitido (BU nominal sem candidato no JSON oficial da divulgação) é o mesmo que falta na tabela `candidato` do banco?
//   2. contagem: 107 "números" são triplas UF × cargo × número; quantos candidatos distintos? 90 ou 93 deputados?
//   3. vnt (nulo técnico) = votos BU dos omitidos + legenda BU de partidos ausentes do JSON, por UF × cargo;
//   4. legenda: BU legenda × vl oficial, e partido a partido BU × tvtl com o destino (dvt) do partido;
//   5. governador RJ e DF: maioria absoluta com e sem os nulos técnicos.
// Banco somente leitura (cópia de leitura). Sem rede. Uso: node scripts/auditoria/cetico-numeros-omitidos-munzona-consolidacao.mjs
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { abrirLeitura } from '../../src/banco-leitura.js';

const OUT = 'data/parsed/auditoria/cetico';
mkdirSync(OUT, { recursive: true });
const log = [];
const p = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
const n = (x) => Number(x).toLocaleString('pt-BR');
const pct = (a, b) => `${(100 * a / b).toFixed(3)}%`;
const NOME = { 1: 'Presidente', 3: 'Governador', 5: 'Senador', 6: 'Dep. Federal', 7: 'Dep. Estadual', 8: 'Dep. Distrital' };
const UFS_AUTOR = ['ac', 'al', 'am', 'ap', 'ba', 'ce', 'df', 'es', 'go', 'ma', 'mg', 'ms', 'mt'];

const { db, fonte } = await abrirLeitura();
p(`Banco: ${fonte}`);
const carregadas = db.prepare('SELECT uf FROM carga WHERE turno = 1 ORDER BY uf').all().map((r) => r.uf).filter((u) => u !== 'zz');
p(`UFs do 1º turno carregadas (${carregadas.length}): ${carregadas.join(',')}`);

// ---------- JSON oficiais da divulgação ----------
const REF = 'data/raw/1t/referencia';
const ref = new Map(); // uf|cargo -> {v, cands:Set, partidos: Map(numero -> {dvt, tvtl})}
for (const f of readdirSync(REF).filter((x) => /-c\d{4}-e\d+-u\.json$/.test(x))) {
  const j = JSON.parse(readFileSync(`${REF}/${f}`, 'utf8'));
  const c = j.carg[0];
  const cands = new Map(); const partidos = new Map();
  for (const a of c.agr) for (const pa of a.par) {
    partidos.set(Number(pa.n), { dvt: pa.dvt, tvtl: Number(pa.tvtl || 0) });
    for (const ca of pa.cand) cands.set(Number(ca.n), { vap: Number(ca.vap), dvt: ca.dvt, nm: ca.nmu });
  }
  ref.set(`${j.cdabr}|${Number(c.cd)}`, { v: Object.fromEntries(Object.entries(j.v).map(([k, x]) => [k, Number(x)])), cands, partidos, dg: `${j.dg} ${j.hg}` });
}

// ---------- tabela candidato do banco ----------
const candBanco = new Set(db.prepare('SELECT cargo, abrangencia, numero FROM candidato WHERE turno = 1').all().map((r) => `${r.abrangencia}|${r.cargo}|${r.numero}`));

// ---------- BU ----------
const qBu = db.prepare(`SELECT cargo, tipo_voto, numero, SUM(quantidade) AS q FROM voto_bu
  WHERE turno = 1 AND uf = ? AND cargo IN (1,3,5,6,7,8) GROUP BY cargo, tipo_voto, numero`);
const omit = []; // {uf, cargo, numero, votos, noBanco, noJson}
const pares = [];
const legDif = [];
let divergeConjunto = 0;
for (const uf of carregadas) {
  const tot = new Map();
  for (const r of qBu.all(uf)) {
    const k = r.cargo;
    const t = tot.get(k) ?? { nominal: 0, legenda: 0, branco: 0, nulo: 0, num: new Map(), leg: new Map() };
    t[r.tipo_voto] = (t[r.tipo_voto] ?? 0) + r.q;
    if (r.tipo_voto === 'nominal') t.num.set(r.numero, (t.num.get(r.numero) ?? 0) + r.q);
    if (r.tipo_voto === 'legenda') t.leg.set(r.numero, (t.leg.get(r.numero) ?? 0) + r.q);
    tot.set(k, t);
  }
  for (const [cargo, t] of tot) {
    const abr = cargo === 1 ? 'br' : uf;
    const j = ref.get(`${abr}|${cargo}`);
    if (!j) { p(`  sem JSON para ${abr}|${cargo}`); continue; }
    let omitVotos = 0;
    for (const [num, q] of t.num) {
      const noJson = j.cands.has(num);
      const noBanco = candBanco.has(`${abr}|${cargo}|${num}`);
      if (noJson !== noBanco) divergeConjunto++;
      if (!noJson) { omit.push({ uf, cargo, numero: num, votos: q, noBanco }); omitVotos += q; }
    }
    if (cargo === 1) continue; // presidente: divulgação só nacional, tratado à parte
    let legSemLista = 0;
    for (const [part, q] of t.leg) {
      const pj = j.partidos.get(part);
      if (!pj) { legSemLista += q; legDif.push({ uf, cargo, partido: part, bu: q, oficial: 0, dvt: 'ausente do JSON' }); continue; }
      if (pj.tvtl !== q || pj.dvt !== 'Válido (legenda)') legDif.push({ uf, cargo, partido: part, bu: q, oficial: pj.tvtl, dvt: pj.dvt });
    }
    const v = j.v;
    pares.push({ uf, cargo, buNulo: t.nulo, vn: v.vn, buBranco: t.branco, vb: v.vb, omitVotos, legSemLista, vnt: v.vnt,
      buLeg: t.legenda, vl: v.vl || 0, totBu: t.nominal + t.legenda, totOf: v.vnom + (v.vl || 0) + v.van + v.vansj + v.vnt });
  }
}

// ---------- 1 e 2: conjunto e contagens ----------
const resumo = (lista) => {
  const por = {}; for (const o of lista) { por[o.cargo] ??= { n: 0, v: 0 }; por[o.cargo].n++; por[o.cargo].v += o.votos; }
  return Object.entries(por).map(([c, x]) => `${NOME[c]} ${x.n}/${n(x.v)}`).join('; ');
};
const autor = omit.filter((o) => UFS_AUTOR.includes(o.uf));
p(`\n1. Omitidos (BU nominal sem candidato no JSON oficial):`);
p(`   13 UFs do autor: ${autor.length} triplas UF×cargo×número, ${n(autor.reduce((s, o) => s + o.votos, 0))} votos. ${resumo(autor)}`);
p(`   ${carregadas.length} UFs carregadas: ${omit.length} triplas, ${n(omit.reduce((s, o) => s + o.votos, 0))} votos. ${resumo(omit)}`);
p(`   Omitidos que EXISTEM na tabela candidato do banco: ${omit.filter((o) => o.noBanco).length}. Números em que JSON e tabela candidato discordam (presença): ${divergeConjunto}`);
const distintos = (l) => new Set(l.map((o) => (o.cargo === 1 ? `br|1|${o.numero}` : `${o.uf}|${o.cargo}|${o.numero}`))).size;
const deps = (l) => l.filter((o) => o.cargo >= 6).length;
p(`   Candidatos distintos (presidente conta 1 vez): 13 UFs ${distintos(autor)}; ${carregadas.length} UFs ${distintos(omit)}. Deputados nas 13 UFs: ${deps(autor)}. Números de presidente omitidos: ${[...new Set(omit.filter((o) => o.cargo === 1).map((o) => o.numero))].join(',')}`);

// ---------- 3: vnt ----------
const ok3 = pares.filter((r) => r.vnt === r.omitVotos + r.legSemLista);
const ok3sem = pares.filter((r) => r.vnt === r.omitVotos);
p(`\n3. vnt = omitidos + legenda de partido ausente do JSON: ${ok3.length} de ${pares.length} pares (sem a legenda: ${ok3sem.length}).`);
for (const r of pares.filter((x) => x.vnt !== x.omitVotos)) p(`   ${r.uf.toUpperCase()} ${NOME[r.cargo]}: vnt ${n(r.vnt)} = omitidos ${n(r.omitVotos)} + legenda sem lista ${n(r.legSemLista)}`);
p(`   vn = nulo BU: ${pares.filter((r) => r.vn === r.buNulo).length}/${pares.length}; vb = branco BU: ${pares.filter((r) => r.vb === r.buBranco).length}/${pares.length}; total nominal+legenda fecha: ${pares.filter((r) => r.totBu === r.totOf).length}/${pares.length}`);
const jp = ref.get('br|1');
p(`   Presidente nacional (${jp.dg}): vnt ${n(jp.v.vnt)}; BU nº 28 nas ${carregadas.length} UFs carregadas: ${n(omit.filter((o) => o.cargo === 1).reduce((s, o) => s + o.votos, 0))} (parcial; o total nacional sai do votacao_secao, lente reprodução/definições)`);

// ---------- 4: legenda ----------
const paresLeg = pares.filter((r) => r.buLeg !== r.vl);
p(`\n4. BU legenda ≠ vl oficial em ${paresLeg.length} de ${pares.length} pares. Partidos com legenda BU ≠ tvtl ou destino diferente de "Válido (legenda)": ${legDif.length}.`);
for (const d of legDif) p(`   ${d.uf.toUpperCase()} ${NOME[d.cargo]} partido ${d.partido}: BU ${n(d.bu)}, tvtl ${n(d.oficial)}, destino "${d.dvt}"`);

// ---------- 5: governador RJ e DF ----------
p(`\n5. Governador, maioria absoluta:`);
for (const uf of ['rj', 'df', 'se', 'pb', 'rn']) {
  const j = ref.get(`${uf}|3`); if (!j) continue;
  const cs = [...j.cands.entries()].map(([num, c]) => ({ num, ...c })).sort((a, b) => b.vap - a.vap);
  const v = j.v; const meta = Math.floor(v.vv / 2) + 1;
  p(`   ${uf.toUpperCase()}: 1º nº ${cs[0].num} ${n(cs[0].vap)} de ${n(v.vv)} válidos = ${pct(cs[0].vap, v.vv)} (maioria ${n(meta)}, ${cs[0].vap >= meta ? 'sobram ' + n(cs[0].vap - meta + 1) : 'faltam ' + n(meta - cs[0].vap)}). vnt ${n(v.vnt)}; com vnt como válido: ${pct(cs[0].vap, v.vv + v.vnt)}. Omitidos BU: ${omit.filter((o) => o.uf === uf && o.cargo === 3).map((o) => `nº ${o.numero} ${n(o.votos)}`).join(', ') || '(UF não carregada ou nenhum)'}`);
}

writeFileSync(`${OUT}/numeros-omitidos-munzona-consolidacao.txt`, log.join('\n') + '\n');
writeFileSync(`${OUT}/numeros-omitidos-munzona-consolidacao-lista.csv`, 'uf,cargo,numero,votos_bu,na_tabela_candidato\n' + omit.map((o) => `${o.uf},${o.cargo},${o.numero},${o.votos},${o.noBanco ? 1 : 0}`).join('\n') + '\n');
p(`\nSaídas: ${OUT}/numeros-omitidos-munzona-consolidacao.txt e -consolidacao-lista.csv`);
