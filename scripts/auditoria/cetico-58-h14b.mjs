// Cético, parecer 58: reprodução própria da H14(b) do doc 32 (déficit de comparecimento do 1º turno nas seções que votaram
// com urna reserva) e testes adversariais. Usa só a tabela do doc 07 (reservas-1t2t/secoes.csv) e o diário já lido pelo
// autor (diario-reservas-1t.jsonl: classe e D por seção); a regressão é a de cetico-58-lib.mjs (código próprio).
// Saída: data/parsed/auditoria/cetico-revisor/58/h14b.json
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { csv, mqp, n, zBonf } from './cetico-58-lib.mjs';

const P = path.join(DIR_DADOS, 'parsed', 'auditoria');
const SAIDA = path.join(P, 'cetico-revisor', '58');
await mkdir(SAIDA, { recursive: true });
const tab = await csv(path.join(P, 'reservas-1t2t', 'secoes.csv'));
const dia = new Map();
for (const l of (await readFile(path.join(P, 'estatistico', 'h14-h19-final', 'diario-reservas-1t.jsonl'), 'utf8')).split('\n')) if (l) { const r = JSON.parse(l); dia.set(r.id, r); }

const FORA = new Set(['sem_bu', 'sistema_apuracao', 'so_um_turno']);
const S = [];
for (const o of tab) {
  if (FORA.has(o.classe)) continue;
  const res = o.tipo1 === 'reservaSecao';
  if (!(o.classe === 'controle' || res)) continue;
  const id = `${o.uf}/${o.municipio}/${o.zona}/${o.secao}`;
  const d = res ? dia.get(id) : null;
  const a1 = n(o.a1), c1 = n(o.c1);
  S.push({ id, uf: o.uf, res, classeDoc07: o.classe, herdada: o.classe === 'reserva_herdada', cls: res ? d?.classe ?? 'C4' : null, D: res ? (d?.Dmin ?? 0) / 60 : 0,
    IT: res && Number.isFinite(d?.intervaloTrocaMin) ? Math.max(0, d.intervaloTrocaMin) / 60 : 0, eng: res ? d?.contingenciaEngenheiro ?? 'sem' : null,
    contDia: res ? (d?.contingencias ?? []).filter((c) => c.dataHora.startsWith('04/10/2026') && c.urna === d.urnaBu).map((c) => c.dataHora.slice(11, 16)) : [],
    abertura: d?.aberturaLocal ?? null, votosDia: d?.votosDia ?? null, a1, c1, y: a1 > 0 ? (100 * c1) / a1 : NaN,
    loc: `${o.uf}/${o.municipio}/${o.zona}/${o.local1}`, zon: `${o.uf}/${o.municipio}/${o.zona}` });
}
const I = (s, c) => (s.res && s.cls === c ? 1 : 0);
const C12 = (s) => s.res && (s.cls === 'C1' || s.cls === 'C2');
const rodar = (lista, x, nomes, fe = (s) => s.loc) => {
  const r = mqp(lista.map((s) => ({ y: s.y, x: x(s), w: s.a1, fe: fe(s), cl: s.zon })));
  return { N: r.N, grupos: r.grupos, clusters: r.clusters, coef: Object.fromEntries(nomes.map((nm, j) => [nm, r.beta[j] === null ? null : { beta: +r.beta[j].toFixed(4), ep: +r.ep[j].toFixed(4), z: +r.z[j].toFixed(2), zAreg: +r.zAreg[j].toFixed(2) }])) };
};
const la = (s) => Math.log(Math.max(s.a1, 1));
const R = { geradoEm: new Date().toISOString(), corteB: zBonf(4) };
R.contagem = { reservas1t: S.filter((s) => s.res).length, porClasse: {} };
for (const c of ['C1', 'C2', 'C3', 'C4']) R.contagem.porClasse[c] = S.filter((s) => I(s, c)).length;
R.principal = rodar(S, (s) => [I(s, 'C1'), I(s, 'C2'), I(s, 'C3'), la(s)], ['C1', 'C2', 'C3', 'logA']);
R.dose = rodar(S, (s) => [I(s, 'C1'), I(s, 'C2'), I(s, 'C3'), C12(s) ? s.D : 0, la(s)], ['C1', 'C2', 'C3', 'D_h', 'logA']);
R.todas = rodar(S, (s) => [s.res ? 1 : 0, la(s)], ['reserva', 'logA']);
const somaA = (f) => S.filter(f).reduce((a, s) => a + s.a1, 0);
R.deficitEleitores = {
  total: (R.todas.coef.reserva.beta / 100) * somaA((s) => s.res),
  C1: (R.principal.coef.C1.beta / 100) * somaA((s) => I(s, 'C1')), C2: (R.principal.coef.C2.beta / 100) * somaA((s) => I(s, 'C2')), C3: (R.principal.coef.C3.beta / 100) * somaA((s) => I(s, 'C3')),
};
// ---------- adversariais
// (1) placebo mecânico: D também "prevê" o comparecimento onde não houve troca no dia? (C3 sem contingência no dia)
const C3limpa = (s) => I(s, 'C3') && s.eng !== 'no dia';
R.placeboD_C3 = rodar(S, (s) => [I(s, 'C1'), I(s, 'C2'), I(s, 'C3'), C12(s) ? s.D : 0, I(s, 'C3') ? s.D : 0, la(s)], ['C1', 'C2', 'C3', 'D_C1C2', 'D_C3', 'logA']);
R.placeboD_C3limpa = rodar(S.filter((s) => !s.res || C12(s) || C3limpa(s)), (s) => [I(s, 'C1'), I(s, 'C2'), C3limpa(s) ? 1 : 0, C12(s) ? s.D : 0, C3limpa(s) ? s.D : 0, la(s)], ['C1', 'C2', 'C3limpa', 'D_C1C2', 'D_C3limpa', 'logA']);
// (1b) medida menos endógena: intervalo da troca (último voto da original → 1º voto da reserva), e C1+C2 por faixa dele
R.doseIntervaloTroca = rodar(S, (s) => [I(s, 'C1'), I(s, 'C2'), I(s, 'C3'), C12(s) ? s.IT : 0, la(s)], ['C1', 'C2', 'C3', 'IT_h', 'logA']);
const fx = (s) => (!C12(s) ? null : s.IT < 0.25 ? 'IT<15min' : s.IT < 0.5 ? 'IT15-30' : s.IT < 1 ? 'IT30-60' : 'IT>=60');
const FX = ['IT<15min', 'IT15-30', 'IT30-60', 'IT>=60'];
R.porFaixaIntervalo = rodar(S, (s) => [...FX.map((f) => (fx(s) === f ? 1 : 0)), I(s, 'C3'), la(s)], [...FX, 'C3', 'logA']);
R.porFaixaIntervalo.secoes = Object.fromEntries(FX.map((f) => [f, S.filter((s) => fx(s) === f).length]));
// (2) sem as seções cujo diário não tem todos os votos do BU (D pode estar errado) e sem D > 4 h
R.semDiarioIncompleto = rodar(S.filter((s) => !s.res || s.votosDia === s.c1), (s) => [I(s, 'C1'), I(s, 'C2'), I(s, 'C3'), C12(s) ? s.D : 0, la(s)], ['C1', 'C2', 'C3', 'D_h', 'logA']);
R.Dtruncado4h = rodar(S, (s) => [I(s, 'C1'), I(s, 'C2'), I(s, 'C3'), C12(s) ? Math.min(s.D, 4) : 0, la(s)], ['C1', 'C2', 'C3', 'D_h', 'logA']);
// (3) C3 contaminada: contingência registrada no dia na urna do BU DEPOIS da abertura local (troca durante a votação)
const hm = (x) => (x ? Number(x.slice(0, 2)) * 60 + Number(x.slice(3, 5)) : null);
const c3dia = S.filter((s) => I(s, 'C3') && s.eng === 'no dia');
R.C3comContingenciaNoDia = { secoes: c3dia.length, depoisDaAbertura: c3dia.filter((s) => s.contDia.some((h) => hm(h) > hm(s.abertura))).length,
  antesDaAbertura: c3dia.filter((s) => s.contDia.every((h) => hm(h) <= hm(s.abertura))).length };
const C3pura = (s) => I(s, 'C3') && s.eng !== 'no dia';
const C3depois = (s) => I(s, 'C3') && s.eng === 'no dia' && s.contDia.some((h) => hm(h) > hm(s.abertura));
const C3antes = (s) => I(s, 'C3') && s.eng === 'no dia' && !C3depois(s);
R.C3dividida = rodar(S, (s) => [I(s, 'C1'), I(s, 'C2'), C3pura(s) ? 1 : 0, C3antes(s) ? 1 : 0, C3depois(s) ? 1 : 0, la(s)], ['C1', 'C2', 'C3_semContDia', 'C3_contDiaAntesAbertura', 'C3_contDiaDepoisAbertura', 'logA']);
// (4) poder do teste de C3 para um déficit do tamanho do total (−0,75 p.p. do doc 07): z esperado e IC
const e3 = R.principal.coef.C3;
R.poderC3 = { ep: e3.ep, zEsperadoSeDeficit075: -0.75 / e3.ep, ic95: [e3.beta - 1.96 * e3.ep, e3.beta + 1.96 * e3.ep], excluiDeficit075: e3.beta - 1.96 * e3.ep > -0.75 };
await writeFile(path.join(SAIDA, 'h14b.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
