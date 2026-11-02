// Estatístico eleitoral, H14(b) do plano 31 (commit 067d1a7): o déficit de comparecimento do 1º turno nas seções que
// votaram com urna reserva vem da interrupção do dia (troca de urna) ou aparece também onde a reserva já estava instalada?
// Entradas: reservas-1t2t/secoes.csv (doc 07) e h14-h19-final/diario-reservas-1t.jsonl (estatistico-h14-h19-final-diario1t.mjs).
// Modelo (parecer 30): comparecimento ÷ aptos do 1º turno (p.p.), MQP com peso = aptos, efeito fixo de local de votação,
// log dos aptos, CR1 por zona; contra as seções de controle (mesma urna de seção nos dois turnos) do mesmo local.
// Família B (4 testes, Bonferroni |z| ≥ 2,50): β(C1), β(C2), β(C3) e a inclinação em D (horas) dentro de C1 + C2.
// Regra: explicado pela falha no dia se (i) inclinação negativa passa; (ii) β(C3) não passa e |β(C3)| < 0,375;
// (iii) C1 + C2 respondem por ≥ 50% do déficit em eleitores. Fato que pede explicação se β(C3) < 0 passa. Senão, não decidível.
// Saída: h14-h19-final/reservas1t.json
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { DIR_FINAL, lerCsv, linhasJsonl, mqef, num, pBi, zBonf } from './estatistico-h14-h19-final-lib.mjs';

const tab = await lerCsv(path.join(DIR_DADOS, 'parsed', 'auditoria', 'reservas-1t2t', 'secoes.csv'));
const FORA = new Set(['sem_bu', 'sistema_apuracao', 'so_um_turno']);
const lerDiario = async (t) => { const m = new Map(); for await (const r of linhasJsonl(path.join(DIR_FINAL, `diario-reservas-${t}t.jsonl`))) m.set(r.id, r); return m; };
const d1 = await lerDiario(1), d2 = await lerDiario(2);
const S = tab.filter((o) => !FORA.has(o.classe)).map((o) => {
  const id = `${o.uf}/${o.municipio}/${o.zona}/${o.secao}`;
  const s = { id, uf: o.uf, classe: o.classe, tipo1: o.tipo1, zon: `${o.uf}/${o.municipio}/${o.zona}`, loc1: `${o.uf}/${o.municipio}/${o.zona}/${o.local1}`, loc2: `${o.uf}/${o.municipio}/${o.zona}/${o.local2}` };
  for (const k of ['a1', 'c1', 'a2', 'c2', 'v13_1', 'v22_1', 'v13_2', 'v22_2']) s[k] = num(o[k]);
  s.controle = o.classe === 'controle';
  s.r1 = d1.get(id) ?? null;
  s.r2 = o.classe.startsWith('contingencia_dia') ? d2.get(id) ?? null : null;
  return s;
});
const res1 = S.filter((s) => s.tipo1 === 'reservaSecao');
const Z = zBonf(4);
const R = { geradoEm: new Date().toISOString(), plano: '31 (commit 067d1a7)', corteBonferroni4: Z, universo: {} };

// ---------- descritivo das classes
const cls = (s) => s.r1?.classe ?? 'C4';
R.universo.reservas1t = res1.length;
R.universo.lidasNoDiario = res1.filter((s) => s.r1 && !s.r1.erro).length;
R.universo.erros = res1.filter((s) => s.r1?.erro).map((s) => ({ id: s.id, erro: s.r1.erro }));
R.universo.porClasse = {};
for (const c of ['C1', 'C2', 'C3', 'C4']) {
  const l = res1.filter((s) => cls(s) === c);
  const D = l.map((s) => s.r1?.Dmin ?? 0).sort((a, b) => a - b);
  const it = l.map((s) => s.r1?.intervaloTrocaMin).filter(Number.isFinite).sort((a, b) => a - b);
  R.universo.porClasse[c] = { secoes: l.length, herdadas: l.filter((s) => s.classe === 'reserva_herdada').length, aptos: l.reduce((a, s) => a + s.a1, 0),
    medianaDmin: D[Math.floor(D.length / 2)] ?? null, p90Dmin: D[Math.floor(D.length * 0.9)] ?? null, medianaIntervaloTrocaMin: it[Math.floor(it.length / 2)] ?? null,
    comRetrocessoRelogio: l.filter((s) => s.r1 && s.r1.urnas?.[s.r1.urnaBu]?.retrocessos > 0).length };
}
// critério do engenheiro × doc 07 (classe pela atividade da original)
const cruz = {};
for (const s of res1) { const k = `${cls(s)}|${s.r1?.contingenciaEngenheiro ?? '—'}`; cruz[k] = (cruz[k] ?? 0) + 1; }
R.universo.classeXcriterioEngenheiro = cruz;

// ---------- modelos
const comp1 = (s) => (s.a1 > 0 ? (100 * s.c1) / s.a1 : NaN);
const comp2 = (s) => (s.a2 > 0 ? (100 * s.c2) / s.a2 : NaN);
const ind = (s, c) => (s.tipo1 === 'reservaSecao' && cls(s) === c ? 1 : 0);
const Dh = (s) => (s.tipo1 === 'reservaSecao' && (cls(s) === 'C1' || cls(s) === 'C2') ? (s.r1?.Dmin ?? 0) / 60 : 0);
const ITh = (s) => (s.tipo1 === 'reservaSecao' && (cls(s) === 'C1' || cls(s) === 'C2') && Number.isFinite(s.r1?.intervaloTrocaMin) ? Math.max(0, s.r1.intervaloTrocaMin) / 60 : 0);
const base = S.filter((s) => s.controle || s.tipo1 === 'reservaSecao');
const ef = (r, j, rotulo) => (r.beta[j] === null ? { rotulo, vazio: true } : { rotulo, beta: r.beta[j], ep: r.ep[j], z: r.z[j], p: pBi(r.z[j]), ic95: [r.beta[j] - 1.96 * r.ep[j], r.beta[j] + 1.96 * r.ep[j]], passa: Math.abs(r.z[j]) >= Z });
// colunas sem nenhuma seção (ex.: C4 vazio) saem do modelo e voltam como null
const rodar = (lista, x, nomes, { g = (s) => s.loc1, y = comp1, w = (s) => s.a1 } = {}) => {
  const usa = nomes.map((_, j) => lista.some((s) => x(s)[j] !== 0));
  const r0 = mqef(lista, { y, x: (s) => x(s).filter((_, j) => usa[j]), w, g, cl: (s) => s.zon });
  const r = { n: r0.n, grupos: r0.grupos, clusters: r0.clusters, beta: [], ep: [], z: [] };
  let k = 0;
  for (let j = 0; j < nomes.length; j++) { if (usa[j]) { r.beta.push(r0.beta[k]); r.ep.push(r0.ep[k]); r.z.push(r0.z[k]); k++; } else { r.beta.push(null); r.ep.push(null); r.z.push(null); } }
  return { n: r.n, grupos: r.grupos, clusters: r.clusters, coef: nomes.map((nm, j) => ef(r, j, nm)) };
};
const xC = (s) => [ind(s, 'C1'), ind(s, 'C2'), ind(s, 'C3'), ind(s, 'C4'), Math.log(Math.max(s.a1, 1))];
const nC = ['C1', 'C2', 'C3', 'C4', 'log_aptos'];
R.principal = rodar(base, xC, nC);
R.dose = rodar(base, (s) => [ind(s, 'C1'), ind(s, 'C2'), ind(s, 'C3'), ind(s, 'C4'), Dh(s), Math.log(Math.max(s.a1, 1))], [...nC.slice(0, 4), 'D_horas', 'log_aptos']);
R.todas = rodar(base, (s) => [s.tipo1 === 'reservaSecao' ? 1 : 0, Math.log(Math.max(s.a1, 1))], ['reserva1t', 'log_aptos']);
const testes = [R.principal.coef[0], R.principal.coef[1], R.principal.coef[2], R.dose.coef[4]];
R.familiaB = testes;
// (iii) parte do déficit em eleitores
const aptos = (c) => res1.filter((s) => cls(s) === c).reduce((a, s) => a + s.a1, 0);
const defC = Object.fromEntries(['C1', 'C2', 'C3', 'C4'].map((c, j) => [c, ((R.principal.coef[j].beta ?? 0) / 100) * aptos(c)]));
const defTotal = (R.todas.coef[0].beta / 100) * res1.reduce((a, s) => a + s.a1, 0);
R.deficitEleitores = { porClasse: defC, total: defTotal, parteC1C2: (defC.C1 + defC.C2) / defTotal };
// regra de decisão
const [b1, b2, b3, bD] = testes;
const i = bD.beta < 0 && bD.passa, ii = !b3.passa && Math.abs(b3.beta) < 0.375, iii = R.deficitEleitores.parteC1C2 >= 0.5;
R.decisao = { i, ii, iii, forma: i && ii && iii ? 'explicado pela falha no dia (Fato)' : b3.beta < 0 && b3.passa ? 'fato que pede explicação' : 'não decidível com dados públicos' };

// ---------- robustez (exploratória)
R.robustez = {
  efeitoFixoZona: rodar(base, xC, nC, { g: (s) => s.zon }),
  doseIntervaloTroca: rodar(base, (s) => [ind(s, 'C1'), ind(s, 'C2'), ind(s, 'C3'), ind(s, 'C4'), ITh(s), Math.log(Math.max(s.a1, 1))], [...nC.slice(0, 4), 'intervaloTroca_horas', 'log_aptos']),
  soHerdadas: rodar(S.filter((s) => s.controle || s.classe === 'reserva_herdada'), xC, nC),
  semRetrocessoRelogio: rodar(base.filter((s) => !(s.r1 && s.r1.urnas?.[s.r1.urnaBu]?.retrocessos > 0)), xC, nC),
  criterioEngenheiro: rodar(base, (s) => { const e = s.tipo1 === 'reservaSecao' ? s.r1?.contingenciaEngenheiro ?? 'sem registro' : null; return [e === 'no dia' ? 1 : 0, e === 'antes do dia' ? 1 : 0, e === 'sem registro' ? 1 : 0, Math.log(Math.max(s.a1, 1))]; }, ['contingenciaNoDia', 'contingenciaAntes', 'semRegistro', 'log_aptos']),
  segundoTurnoMesmasSecoes: rodar(base, (s) => [ind(s, 'C1'), ind(s, 'C2'), ind(s, 'C3'), ind(s, 'C4'), Math.log(Math.max(s.a2, 1))], nC, { y: comp2, w: (s) => s.a2, g: (s) => s.loc2 }),
};
// comparação: contingências do 2º turno (doc 07), mesmo modelo, com D do dia 25/10
const c2 = (s) => s.r2 && !s.r2.erro && (s.r2.classe === 'C1' || s.r2.classe === 'C2');
const base2 = S.filter((s) => s.controle || c2(s));
R.comparacao2t = {
  secoesLidas: S.filter((s) => s.r2).length,
  porClasse: Object.fromEntries(['C1', 'C2', 'C3', 'C4'].map((c) => { const l = S.filter((s) => s.r2?.classe === c); const D = l.map((s) => s.r2.Dmin).sort((a, b) => a - b); return [c, { secoes: l.length, medianaDmin: D[Math.floor(D.length / 2)] ?? null }]; })),
  modelo: rodar(base2, (s) => [c2(s) ? 1 : 0, c2(s) ? s.r2.Dmin / 60 : 0, Math.log(Math.max(s.a2, 1))], ['contingencia2t', 'D_horas', 'log_aptos'], { y: comp2, w: (s) => s.a2, g: (s) => s.loc2 }),
};
// ---------- casos para conferência: 5 maiores D e 5 maiores déficits contra o local (1º turno)
const loc = new Map();
for (const s of S) if (s.controle) { const e = loc.get(s.loc1) ?? { a: 0, c: 0 }; e.a += s.a1; e.c += s.c1; loc.set(s.loc1, e); }
for (const s of res1) { const e = loc.get(s.loc1); s.defLocal = e ? comp1(s) - (100 * e.c) / e.a : null; }
const ficha = (s) => ({ id: s.id, classeDoc07: s.classe, classe: cls(s), Dmin: s.r1?.Dmin, intervaloTrocaMin: s.r1?.intervaloTrocaMin, votosOriginal: s.r1?.votosOriginal, votosDia: s.r1?.votosDia, c1: s.c1, a1: s.a1, comp1: comp1(s), difLocalPP: s.defLocal, ultimoVotoDia: s.r1?.ultimoVotoDia });
R.casos = {
  maioresD: [...res1].filter((s) => s.r1).sort((a, b) => (b.r1.Dmin ?? 0) - (a.r1.Dmin ?? 0)).slice(0, 5).map(ficha),
  maioresDeficits: [...res1].filter((s) => Number.isFinite(s.defLocal)).sort((a, b) => a.defLocal - b.defLocal).slice(0, 5).map(ficha),
};
await writeFile(path.join(DIR_FINAL, 'reservas1t.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify({ universo: R.universo, familiaB: R.familiaB, deficit: R.deficitEleitores, decisao: R.decisao, casos: R.casos }, null, 1));
