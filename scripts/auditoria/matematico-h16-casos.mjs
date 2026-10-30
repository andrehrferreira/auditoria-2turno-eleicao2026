// Matemático forense, H16: leitura dos casos fora do padrão gravados por matematico-h16-sessoes.mjs (um turno).
//  1. Classifica cada caso (órfã, voto sem habilitação, suspenso com confirmação, vetor fora do padrão, BU ≠ log).
//     "Voto sem habilitação" com uma linha de habilitação corrompida no trecho (até 2 caracteres trocados em
//     "Eleitor foi habilitado") vira "explicado: linha corrompida" e continua listado.
//  2. Reconciliação multicargo (T1): em cada seção e para cada eleição E além da federal, o número de sessões
//     computadas que trazem o cargo de E (G = estadual; PF = prefeito suplementar; Q = consulta popular) = comparecimento
//     de E (secao_eleicao; nas consultas sem comparecimento no BU, a soma dos votos do cargo, 1 escolha). O eleitor em
//     trânsito de outra UF (ou de outro município, nas eleições municipais) vota só presidente e cai fora dessa conta.
//     Seção fora do jsonl tem todas as sessões no mesmo vetor; nela vale c(E) = c(federal). Fecho global: a soma das
//     sessões com cada letra no resumo nacional = soma de c(E).
//  3. Validação nas seções com urna reserva (tipo_urna reservaSecao/reservaEncerrandoSecao), a partir do resumo.
// Uso: node scripts/auditoria/matematico-h16-casos.mjs --turno 2
// Saída: data/parsed/auditoria/h16/casos-<t>t.json e impressão no terminal (trechos já mascarados).
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, trechos: { type: 'boolean' } } });
const turno = Number(values.turno);
const DIR = path.join(DIR_DADOS, 'parsed', 'auditoria', 'h16', 'sessoes', `${turno}t`);
const FED = { 1: 6257, 2: 6258 }[turno];
const EST = { 1: 6259, 2: 6260 }[turno];

function distancia(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const habCorrompida = (trecho) => (trecho ?? []).some((l) => {
  const m = l.split(' ').slice(3).join(' ');
  return m !== 'Eleitor foi habilitado' && m.length >= 20 && m.length <= 24 && distancia(m, 'Eleitor foi habilitado') <= 2;
});

const { db } = await abrirLeitura();
const comp = new Map(); // seção → Map(eleição → comparecimento)
for (const r of db.prepare('select uf, municipio, zona, secao, eleicao, comparecimento_majoritario maj from secao_eleicao where turno = ?').iterate(turno)) {
  const k = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
  if (!comp.has(k)) comp.set(k, new Map());
  comp.get(k).set(r.eleicao, r.maj);
}
const LETRA = new Map([[EST, 'G']]);
for (const r of db.prepare('select uf, municipio, zona, secao, eleicao, cargo, sum(quantidade) v from voto_bu where turno = ? and cargo in (11, 25, 26, 27) group by 1, 2, 3, 4, 5, 6').iterate(turno)) {
  LETRA.set(r.eleicao, r.cargo === 11 ? 'PF' : 'Q');
  const m = comp.get(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`);
  if (m && m.get(r.eleicao) == null) m.set(r.eleicao, r.v); // consulta sem comparecimento no BU
}
const tipos = new Map(db.prepare("select uf || '/' || municipio || '/' || zona || '/' || secao k, tipo_urna, tipo_arquivo from secao where turno = ? and situacao = 'completa'").all(turno).map((r) => [r.k, r]));

const out = { turno, secoesNoJsonl: 0, porTipo: {}, falta: [], extra: [], orfas: [], semHabilitacao: [], sComConf: [], confAposNulo: [], vazio: [], confFora: [],
  vetoresFora: {}, vetoresForaSecoes: {}, t1: { pares: 0, iguais: 0, foraDoJsonl: 0, divergentes: [], porLetra: {}, global: {} } };
const contagens = new Map(); // seção do jsonl → { letra: sessões }
for (const n of (await readdir(DIR)).filter((x) => x.endsWith('.jsonl')).sort()) {
  const txt = await readFile(path.join(DIR, n), 'utf8');
  for (const l of txt.split('\n').filter(Boolean)) {
    const p = JSON.parse(l);
    const loc = `${p.uf}/${p.municipio}/${p.zona}/${p.secao}`;
    out.secoesNoJsonl++;
    const base = { loc, tipo: p.tipo, bu: p.bu, logPropria: p.computadosPropria, logs: p.logs };
    if (p.dif > 0) out.falta.push({ ...base, falta: p.dif, c1: p.c1, c2: p.c2, c3: p.c3, interrompidas: p.interrompidas });
    if (p.dif < 0) out.extra.push({ ...base, extra: -p.dif });
    for (const c of p.casos) {
      const caso = { loc, tipo: p.tipo, hora: c.hora, urna: c.urna, vet: c.vet, trecho: c.trecho };
      if (c.tipo.startsWith('órfã')) out.orfas.push({ ...caso, motivo: c.tipo });
      else if (c.tipo === 'computado sem habilitação') out.semHabilitacao.push({ ...caso, explicacao: habCorrompida(c.trecho) ? 'linha de habilitação corrompida no log' : 'sem explicação automática (conferir no bruto)' });
      else if (c.tipo === 'suspenso sem voto com confirmação') out.sComConf.push(caso);
      else if (c.tipo === 'confirmação depois de nulo por suspensão') out.confAposNulo.push(caso);
      else if (c.tipo === 'computado sem nenhum cargo') out.vazio.push(caso);
      else if (c.tipo === 'Voto confirmado fora de sessão') out.confFora.push(caso);
    }
    const cnt = {};
    const somar = (v, k) => { for (const L of new Set(v.split(','))) cnt[L] = (cnt[L] ?? 0) + k; };
    somar(p.modal, p.V - Object.values(p.fora).reduce((a, k) => a + k, 0));
    for (const [v, k] of Object.entries(p.fora)) {
      const chave = `modal ${p.modal} | outro ${v}`;
      out.vetoresFora[chave] = (out.vetoresFora[chave] ?? 0) + k;
      (out.vetoresForaSecoes[chave] ??= []).length < 20 && out.vetoresForaSecoes[chave].push(loc);
      somar(v, k);
    }
    contagens.set(loc, { cnt, modal: p.modal });
  }
}
// T1 em todas as seções completas (sem SA: o log do SA não tem eleitor)
const resumo = JSON.parse(await readFile(path.join(DIR, '..', `resumo-${turno}t.json`), 'utf8'));
const esperadoPorLetra = {};
for (const [loc, m] of comp) {
  const t = tipos.get(loc);
  if (!t || t.tipo_arquivo?.startsWith('sa')) continue;
  const fed = m.get(FED);
  const s = contagens.get(loc);
  for (const [e, c] of m) {
    if (e === FED) continue;
    const L = LETRA.get(e) ?? `?${e}`;
    out.t1.pares++;
    esperadoPorLetra[L] = (esperadoPorLetra[L] ?? 0) + c;
    // fora do jsonl: BU = log e todas as sessões no mesmo vetor; então c(E) = c(federal)
    const obs = s ? (s.cnt[L] ?? 0) : null;
    const ok = s ? obs === c : c === fed;
    if (!s) out.t1.foraDoJsonl++;
    (out.t1.porLetra[L] ??= { pares: 0, iguais: 0 }).pares++;
    if (ok) { out.t1.iguais++; out.t1.porLetra[L].iguais++; } else out.t1.divergentes.push({ loc, tipo: t.tipo_urna, eleicao: e, letra: L, comparecimento: c, federal: fed, sessoesComOCargo: obs, modal: s?.modal ?? '(fora do jsonl)' });
  }
}
// fecho global pelo resumo nacional
for (const [v, n] of Object.entries(resumo.vetores)) {
  const vet = v.includes(' | outro ') ? v.split(' | outro ')[1] : v.slice(6);
  for (const L of new Set(vet.split(','))) if (L !== 'P') out.t1.global[L] = { sessoes: (out.t1.global[L]?.sessoes ?? 0) + n };
}
for (const [L, c] of Object.entries(esperadoPorLetra)) (out.t1.global[L] ??= { sessoes: 0 }).comparecimento = c;
out.porTipo = resumo.porTipoUrna;
await writeFile(path.join(DIR, '..', '..', `casos-${turno}t.json`), `${JSON.stringify(out, null, 1)}\n`);

const f = (x) => x.toLocaleString('pt-BR');
console.log(`${turno}º turno: ${out.secoesNoJsonl} seções com algo fora do padrão no jsonl`);
console.log(`falta (BU > log): ${out.falta.length} seções, ${out.falta.reduce((a, x) => a + x.falta, 0)} votos`);
for (const x of out.falta) console.log(`  ${x.loc} [${x.tipo}] BU ${x.bu} log ${x.logPropria} falta ${x.falta} (C1 ${x.c1} C2 ${x.c2} C3 ${x.c3}); interrompidas ${x.interrompidas.map((i) => `${i.hora}[${i.vet}] ${i.motivo}/${i.causa}`).join(' | ')}`);
console.log(`extra (log > BU): ${out.extra.length}`);
for (const x of out.extra) console.log(`  ${x.loc} [${x.tipo}] BU ${x.bu} log ${x.logPropria}`);
for (const [nome, lista] of [['órfãs', out.orfas], ['voto sem habilitação', out.semHabilitacao], ['suspenso com confirmação', out.sComConf], ['confirmação depois de nulo', out.confAposNulo], ['computado vazio', out.vazio], ['confirmação fora de sessão', out.confFora]]) {
  console.log(`${nome}: ${lista.length}`);
  for (const x of lista.slice(0, 30)) {
    console.log(`  ${x.loc} [${x.tipo}] ${x.hora ?? ''} urna ${x.urna ?? ''} ${x.motivo ?? ''} ${x.explicacao ?? ''} vet ${x.vet ?? ''}`);
    if (values.trechos) for (const t of (x.trecho ?? []).slice(-12)) console.log(`      ${t}`);
  }
}
console.log('vetores fora do modal:');
for (const [v, n] of Object.entries(out.vetoresFora).sort((a, b) => b[1] - a[1])) console.log(`  ${f(n)}  ${v}${n < 50 ? `  ex.: ${out.vetoresForaSecoes[v].slice(0, 5).join(', ')}` : ''}`);
console.log(`T1 (sessões com o cargo = comparecimento da eleição): ${out.t1.pares} pares seção × eleição (${out.t1.foraDoJsonl} fora do jsonl), ${out.t1.iguais} iguais, ${out.t1.divergentes.length} divergentes; por letra ${JSON.stringify(out.t1.porLetra)}`);
console.log(`  fecho global (sessões com a letra no resumo × soma do comparecimento, sem SA): ${JSON.stringify(out.t1.global)}`);
for (const d of out.t1.divergentes.slice(0, 40)) console.log(`  ${JSON.stringify(d)}`);
