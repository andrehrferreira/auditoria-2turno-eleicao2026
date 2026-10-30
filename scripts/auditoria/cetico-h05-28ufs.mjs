// Cético, parecer 27: revisão do doc 06 do estatístico (H05 com as 28 UFs).
// Reproduz o teste principal por um caminho próprio (testeE2 da lib, sem o script do autor) e testa o que o autor só
// supôs ou não mediu:
//   A. filtros: o que há nas 237 seções com aptos mudando, nas 33 + 34 de comparecimento baixo; o resultado muda com elas?
//   B. teste principal (efeito fixo de município) no Brasil e em SP, PR, MG; invariante sb + pb + pg = c.
//   C. jardim das bifurcações: um modelo ajustado alternativo, declarado aqui antes de rodar (efeito fixo de município +
//      perfil da seção só como nível, sem interações e sem a parcela do 13) para as 27 UFs e o Brasil, 13 e 22.
//   D. reclassificação: eleitor que muda de categoria entre os turnos (mesma pessoa, Δpb e Δsem com sinais opostos).
//   E. calibração d → votos: insere votos pela brecha e mede Δd direto, para saber se "d × aumentos positivos" é votos.
//   F. poder com 20 réplicas (semente diferente do autor) nos cenários sorteados mais perto do limiar.
//   G. urna trocada (exploratório do autor): MG e SP, dentro do município, só entre as trocadas.
//   H. seções para conferir no bruto (maiores Δ sem biometria no PR e uma de MG com urna trocada).
// Uso: node --max-old-space-size=6144 scripts/auditoria/cetico-h05-28ufs.mjs [réplicas do poder, padrão 20]
// Saída: data/parsed/auditoria/cetico/h05-28ufs-cetico.json
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { RAIZ, aleatorio, quantil } from './forense-lib.mjs';
import { carregarIdade, diferenca, filtrar, lerPares, mqEfeitoFixo, prepararBiometria, testeE2, zBilateral } from './estatistico-lib.mjs';

const REP = Number(process.argv[2] ?? 20);
const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const r4 = (x) => (Number.isFinite(x) ? Math.round(x * 10000) / 10000 : null);
const r2 = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : null);
const soma = (l, f) => l.reduce((a, s) => a + f(s), 0);
const res = { geradoEm: new Date().toISOString(), replicasPoder: REP };

const todos = await lerPares('banco');
prepararBiometria(todos);
for (const s of todos) { s.mun = `${s.uf}|${s.municipio}`; s.zon = `${s.uf}|${s.zona}`; }
const { P, filtro } = filtrar(todos);
const E = P.filter((s) => s.temBio && s.c1 >= 20);
const clu = (s) => (s.uf === 'df' ? s.zon : s.mun);
const FEmun = (s) => s.mun;
const CRIT = zBilateral(0.05 / 56);
res.filtro = filtro; res.secoesNoTeste = E.length; res.limiar = r2(CRIT);
log(`${todos.length} pares; ${E.length} no teste`);

// ---------- A. filtros ----------
const resumoLista = (l) => ({
  secoes: l.length, ufs: Object.fromEntries([...new Set(l.map((s) => s.uf))].sort().map((uf) => [uf, l.filter((s) => s.uf === uf).length])),
  dAptos: soma(l, (s) => s.a2 - s.a1), dAptosAbs: soma(l, (s) => Math.abs(s.a2 - s.a1)),
  c1: soma(l, (s) => s.c1), c2: soma(l, (s) => s.c2), d13: soma(l, (s) => s.v13_2 - s.v13_1), d22: soma(l, (s) => s.v22_2 - s.v22_1),
  dSemBio: soma(l.filter((s) => s.temBio), (s) => s.dsb + s.dpg), dPorBio: soma(l.filter((s) => s.temBio), (s) => s.dpb),
  c1Zero: l.filter((s) => s.c1 === 0).length, c2Zero: l.filter((s) => s.c2 === 0).length,
});
const aptosMudam = todos.filter((s) => s.a2 >= 20 && s.c1 >= 10 && Math.abs(s.a2 - s.a1) > 10);
const c1Menor10 = todos.filter((s) => s.a2 >= 20 && s.c1 < 10);
const c1Menor20 = P.filter((s) => s.temBio && s.c1 < 20);
res.A = {
  aptosMudam: { ...resumoLista(aptosMudam), maioresMudancas: [...aptosMudam].sort((a, b) => Math.abs(b.a2 - b.a1) - Math.abs(a.a2 - a.a1)).slice(0, 8)
    .map((s) => ({ k: `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`, a1: s.a1, a2: s.a2, c1: s.c1, c2: s.c2, v13: `${s.v13_1}->${s.v13_2}`, v22: `${s.v22_1}->${s.v22_2}` })) },
  c1Menor10: { ...resumoLista(c1Menor10), lista: c1Menor10.filter((s) => s.c1 > 0).map((s) => ({ k: `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`, a2: s.a2, c1: s.c1, c2: s.c2 })) },
  c1Menor20: resumoLista(c1Menor20),
  // invariante: categorias somam o comparecimento nos dois turnos, em todas as seções do teste
  categoriasNaoSomam: E.filter((s) => s.sb1 + s.pb1 + s.pg1 !== s.c1 || s.sb2 + s.pb2 + s.pg2 !== s.c2).length,
  c2MenorQueMetadeDoC1: E.filter((s) => s.c2 < 0.5 * s.c1).length,
  // a parcela do Δ comparecimento que vai ao 13, nas excluídas por aptos e no teste
  parcela13DoAumento: { aptosMudam: r4(soma(aptosMudam, (s) => s.v13_2 - s.v13_1) / soma(aptosMudam, (s) => s.c2 - s.c1)), noTeste: r4(soma(E, (s) => s.v13_2 - s.v13_1) / soma(E, (s) => s.c2 - s.c1)) },
};
// sensibilidade: devolver ao teste as seções com aptos mudando (só as que têm detalhamento e c1 ≥ 20)
{
  const comAptos = todos.filter((s) => s.temBio && s.c1 >= 20 && s.a2 >= 20);
  const f = (l) => { const a = testeE2(l, { grupo: FEmun, cluster: clu }); return { secoes: a.secoes, d13: r4(a.ganho13.d), ep13: r4(a.ganho13.ep), t13: r2(a.ganho13.t), t22: r2(a.ganho22.t) }; };
  res.A.comAptosMudando = { brasil: f(comAptos), sp: f(comAptos.filter((s) => s.uf === 'sp')), pr: f(comAptos.filter((s) => s.uf === 'pr')), mg: f(comAptos.filter((s) => s.uf === 'mg')) };
}
log('A filtros');

// ---------- B. teste principal ----------
const UFS = [...new Set(E.map((s) => s.uf))].sort();
const linhaE2 = (l, grupo = FEmun) => {
  const a = testeE2(l, { grupo, cluster: clu });
  return { secoes: a.secoes, conglomerados: a.municipios, porBio13: r4(a.ganho13.porBiometria), semBio13: r4(a.ganho13.semBiometria), d13: r4(a.ganho13.d), ep13: r4(a.ganho13.ep), t13: r2(a.ganho13.t),
    d22: r4(a.ganho22.d), t22: r2(a.ganho22.t), dSemBioPositivo: a.totais.dSemBioPositivo, dSemBioLiquido: a.totais.dSemBiometria + a.totais.dAnoNascimento };
};
res.B = { brasil: linhaE2(E), porUf: Object.fromEntries(UFS.map((uf) => [uf, linhaE2(E.filter((s) => s.uf === uf))])) };
res.B.passam = Object.entries(res.B.porUf).flatMap(([uf, l]) => [[uf, 13, l.t13], [uf, 22, l.t22]]).filter(([, , t]) => Math.abs(t) >= CRIT);
log(`B principal: Brasil d13 ${res.B.brasil.d13} t ${res.B.brasil.t13}`);

// ---------- C. modelo ajustado alternativo, declarado aqui: perfil só como nível ----------
await carregarIdade(E);
{
  const XB = (s) => [s.dpb / s.c1, (s.dsb + s.dpg) / s.c1, s.out1 / s.c1, s.bn1 / s.c1];
  const ok = (s) => s.p60 != null && s.pEscB != null && s.pBioCad != null && s.p1624 != null;
  const x = (s) => [...XB(s), s.p60, s.pEscB, s.pBioCad, s.p1624];
  const um = (l, y) => { const a = mqEfeitoFixo(l.filter(ok), { y, x, w: (s) => s.c1, grupo: FEmun, cluster: clu }); if (!a) return null; const d = diferenca(a, 1, 0); return { secoes: a.n, d: r4(d.d), t: r2(d.t) }; };
  const y13 = (s) => (s.v13_2 - s.v13_1) / s.c1, y22 = (s) => (s.v22_2 - s.v22_1) / s.c1;
  const linha = (l) => ({ g13: um(l, y13), g22: um(l, y22) });
  res.C = { nota: 'efeito fixo de município + parcela 60+, escolaridade baixa, biometria cadastrada e 16-24 como nível; sem interações; sem parcela do 13',
    brasil: linha(E), porUf: Object.fromEntries(UFS.map((uf) => [uf, linha(E.filter((s) => s.uf === uf))])) };
  res.C.passam = Object.entries(res.C.porUf).flatMap(([uf, l]) => [[uf, 13, l.g13?.t], [uf, 22, l.g22?.t]]).filter(([, , t]) => Math.abs(t) >= CRIT);
}
log('C ajustado alternativo');

// ---------- D. reclassificação entre categorias ----------
{
  const rec = (l) => {
    let reclass = 0, posSem = 0, absDc = 0, posDc = 0;
    for (const s of l) {
      const a = s.dpb, b = s.dsb + s.dpg;
      if (Math.sign(a) * Math.sign(b) < 0) reclass += Math.min(Math.abs(a), Math.abs(b));
      posSem += Math.max(b, 0); absDc += Math.abs(s.c2 - s.c1); posDc += Math.max(s.c2 - s.c1, 0);
    }
    return { secoes: l.length, reclassificadosMinimo: reclass, dSemBioPositivo: posSem, somaAbsDc: absDc, somaDcPositivo: posDc, reclassSobreSemBioPositivo: r4(reclass / posSem) };
  };
  res.D = { brasil: rec(E), pr: rec(E.filter((s) => s.uf === 'pr')), sp: rec(E.filter((s) => s.uf === 'sp')), mg: rec(E.filter((s) => s.uf === 'mg')) };
}
log('D reclassificação');

// ---------- E/F. inserção pela brecha (mesma mecânica do autor) ----------
const rnd = aleatorio(777);
const inserir = (lista, k) => {
  const feitos = []; let tot = 0;
  for (const s of lista) { const kk = Math.max(0, Math.min(typeof k === 'function' ? k(s) : k, s.a2 - s.c2)); if (!kk) continue; s.v13_2 += kk; s.pg2 += kk; s.dpg += kk; tot += kk; feitos.push([s, kk]); }
  return { tot, desfazer: () => { for (const [s, kk] of feitos) { s.v13_2 -= kk; s.pg2 -= kk; s.dpg -= kk; } } };
};
const sortear = (l, n) => { const sel = new Set(); n = Math.min(n, l.length); while (sel.size < n) sel.add(l[Math.floor(rnd() * l.length)]); return [...sel]; };
const dE2 = (l) => { const a = testeE2(l, { grupo: FEmun, cluster: clu }); return a.ganho13; };
// E. calibração: votos inseridos ÷ (Δd × aumentos positivos sem biometria)
{
  const cal = [];
  for (const [nome, lista, fr, k] of [['PR 1% +10', E.filter((s) => s.uf === 'pr'), 0.01, 10], ['PR 5% +5', E.filter((s) => s.uf === 'pr'), 0.05, 5],
    ['Brasil 1% +10', E, 0.01, 10], ['Brasil 5% +5', E, 0.05, 5]]) {
    const base = dE2(lista); const N0 = soma(lista, (s) => Math.max(s.dsb + s.dpg, 0));
    const reps = [];
    for (let r = 0; r < 5; r++) {
      const { tot, desfazer } = inserir(sortear(lista, Math.round(lista.length * fr)), k);
      const g = dE2(lista); desfazer();
      reps.push({ votos: tot, dd: g.d - base.d, t: g.t, fator: tot / ((g.d - base.d) * N0) });
    }
    cal.push({ cenario: nome, dBase: r4(base.d), N0, votosMediana: Math.round(quantil(reps.map((x) => x.votos), 0.5)), ddMediana: r4(quantil(reps.map((x) => x.dd), 0.5)),
      tMediana: r2(quantil(reps.map((x) => x.t), 0.5)), votosPorUnidadeDeDxN0: r2(quantil(reps.map((x) => x.fator), 0.5)) });
  }
  res.E = cal;
}
log('E calibração');
// F. poder com REP réplicas
{
  const idxUf = Object.fromEntries(UFS.map((uf) => [uf, E.filter((s) => s.uf === uf)]));
  const corte80 = Object.fromEntries(UFS.map((uf) => [uf, quantil(idxUf[uf].filter((s) => s.s1 != null).map((s) => s.s1), 0.8)]));
  const redutos = E.filter((s) => s.s1 != null && s.s1 >= corte80[s.uf]);
  const porMun = new Map(); for (const s of E) { if (!porMun.has(s.mun)) porMun.set(s.mun, []); porMun.get(s.mun).push(s); }
  const municipios = (fr) => { const ms = [...porMun.keys()]; for (let i = ms.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ms[i], ms[j]] = [ms[j], ms[i]]; } const alvo = Math.round(E.length * fr); const out = []; for (const m of ms) { if (out.length >= alvo) break; out.push(...porMun.get(m)); } return out; };
  const CEN = [
    ['aleatórias 1%, +10', () => sortear(E, Math.round(E.length * 0.01)), 10],
    ['aleatórias 5%, +5', () => sortear(E, Math.round(E.length * 0.05)), 5],
    ['redutos 1%, +10', () => sortear(redutos, Math.round(E.length * 0.01)), 10],
    ['municípios inteiros 5%, +5', () => municipios(0.05), 5],
    ['aleatórias 1%, +6 (entre o +5 e o +10)', () => sortear(E, Math.round(E.length * 0.01)), 6],
  ];
  res.F = [];
  for (const [nome, sel, k] of CEN) {
    const reps = [];
    for (let r = 0; r < REP; r++) {
      const { tot, desfazer } = inserir(sel(), k);
      const tBr = dE2(E).t; let tMax = -Infinity, ufMax = null;
      for (const uf of UFS) { const t = dE2(idxUf[uf]).t; if (t > tMax) { tMax = t; ufMax = uf; } }
      desfazer();
      reps.push({ votos: tot, tBr: r2(tBr), tUfMax: r2(tMax), ufMax, detecta: tBr >= CRIT || tMax >= CRIT });
    }
    const n = reps.filter((x) => x.detecta).length;
    res.F.push({ cenario: nome, votosMediana: Math.round(quantil(reps.map((x) => x.votos), 0.5)), detecta: n, replicas: REP,
      tBrMin: Math.min(...reps.map((x) => x.tBr)), tBrMediana: r2(quantil(reps.map((x) => x.tBr), 0.5)), tBrMax: Math.max(...reps.map((x) => x.tBr)),
      tUfMaxMediana: r2(quantil(reps.map((x) => x.tUfMax), 0.5)), ufsMax: [...new Set(reps.map((x) => x.ufMax))] });
    log(`F ${nome}: ${n}/${REP}`);
  }
}

// ---------- G. urna trocada ----------
{
  const g = (l) => { const a = mqEfeitoFixo(l, { y: (s) => (s.v13_2 - s.v13_1) / s.c1, x: (s) => [s.dpb / s.c1, (s.dsb + s.dpg) / s.c1, s.out1 / s.c1, s.bn1 / s.c1], w: (s) => s.c1, grupo: FEmun, cluster: clu });
    if (!a) return null; const d = diferenca(a, 1, 0); return { secoesNoAjuste: a.n, municipios: a.G, d: r4(d.d), ep: r4(d.ep), t: r2(d.t) }; };
  res.G = {};
  for (const uf of ['mg', 'sp', 'pr']) {
    const L = E.filter((s) => s.uf === uf);
    const tr = L.filter((s) => s.urna1 !== s.urna2), me = L.filter((s) => s.urna1 === s.urna2);
    res.G[uf] = { trocadas: tr.length, dSemBioTrocadas: soma(tr, (s) => s.dsb + s.dpg), dPorBioTrocadas: soma(tr, (s) => s.dpb), dComparecimentoTrocadas: soma(tr, (s) => s.c2 - s.c1),
      trocada: g(tr), mesma: g(me) };
  }
  res.G.brasilTrocadas = E.filter((s) => s.urna1 !== s.urna2).length;
}
log('G urna trocada');

// ---------- H. seções para o bruto ----------
{
  const k = (s) => ({ k: `${s.uf} ${s.municipio} ${s.zona} ${s.secao}`, c1: s.c1, c2: s.c2, sb: `${s.sb1}->${s.sb2}`, pb: `${s.pb1}->${s.pb2}`, pg: `${s.pg1}->${s.pg2}`, v13: `${s.v13_1}->${s.v13_2}`, v22: `${s.v22_1}->${s.v22_2}`, urna: `${s.urna1}->${s.urna2}` });
  res.H = { prMaiorDSemBio: [...E.filter((s) => s.uf === 'pr')].sort((a, b) => (b.dsb + b.dpg) - (a.dsb + a.dpg)).slice(0, 3).map(k),
    prMaiorQuedaSemBio: [...E.filter((s) => s.uf === 'pr')].sort((a, b) => (a.dsb + a.dpg) - (b.dsb + b.dpg)).slice(0, 3).map(k),
    mgTrocadaMaiorDSemBio: [...E.filter((s) => s.uf === 'mg' && s.urna1 !== s.urna2)].sort((a, b) => (b.dsb + b.dpg) - (a.dsb + a.dpg)).slice(0, 3).map(k) };
}

const dir = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico');
await mkdir(dir, { recursive: true });
const arq = path.join(dir, 'h05-28ufs-cetico.json');
await writeFile(arq, JSON.stringify(res, null, 1));
log(`→ ${arq}`);
console.log(JSON.stringify({ filtro: res.filtro, A: { ...res.A, aptosMudam: { ...res.A.aptosMudam, ufs: undefined } }, B: { brasil: res.B.brasil, sp: res.B.porUf.sp, pr: res.B.porUf.pr, mg: res.B.porUf.mg, passam: res.B.passam },
  C: { brasil: res.C.brasil, sp: res.C.porUf.sp, pr: res.C.porUf.pr, mg: res.C.porUf.mg, passam: res.C.passam }, D: res.D, E: res.E, F: res.F, G: res.G, H: res.H }, null, 1));
