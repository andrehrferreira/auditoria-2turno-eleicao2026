// Estatístico eleitoral: H05 (mesários liberando outras pessoas sem biometria) no universo completo, 28 UFs.
// Refaz o teste E2 do parecer cético 06 (que usou 25 UFs) e do doc 03 (22 UFs): o eleitor a mais do 2º turno habilitado
// sem biometria (sem biometria cadastrada + liberado por ano de nascimento) dividiu o voto entre 13 e 22 como o eleitor
// a mais habilitado por biometria?
//
// Uso: node --max-old-space-size=6144 scripts/auditoria/estatistico-h05.mjs [réplicas]   (padrão 5; ~10 min)
// Entrada: data/parsed/auditoria/estatistico-eleitoral/pares-banco.csv (estatistico-pares.mjs banco, cópia de leitura
//          com 28 UFs nos dois turnos) e o perfil do eleitorado por seção (data/parsed/auditoria/forense/perfil/).
// Saída:   data/parsed/auditoria/estatistico-eleitoral/h05-28ufs.json e h05-28ufs-por-uf.csv
//
// Teste confirmatório declarado antes de rodar (doc 06 do estatístico):
//   modelo  ganho do finalista / c1 ~ Δpor biometria / c1 + Δsem biometria / c1 + eliminados do 1º / c1 + brancos e nulos do 1º / c1
//   principal: efeito fixo de MUNICÍPIO, peso c1, EP agrupado por município (no DF, que tem um município só, por zona);
//   H0: d = coef. sem biometria − coef. por biometria = 0, em cada UF (27) e no Brasil, para o 13 e para o 22 → 56 testes;
//   decisão: Bonferroni bilateral a 5% sobre os 56 (|t| ≥ 3,32); BH como leitura complementar.
//   Sensibilidade (não muda a decisão): efeito fixo de UF (o do cético 06) e de zona (o do doc 03).
// Exploratório: as duas brechas separadas, o exame das UFs sinalizadas (PR, SP, MG, RS), estratos e controles.
// Poder: inserção simulada pela brecha (liberação por ano de nascimento, todos os votos para o 13) nos dados reais.
import { aleatorio, paraCsv, pQuiQuadrado, quantil } from './forense-lib.mjs';
import { bh, carregarIdade, diferenca, filtrar, lerPares, mqEfeitoFixo, pNormal2, prepararBiometria, salvar, testeE2, zBilateral } from './estatistico-lib.mjs';

const REPLICAS = Number(process.argv[2] ?? 5);
const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const r3 = (x) => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : null);
const r4 = (x) => (Number.isFinite(x) ? Math.round(x * 10000) / 10000 : null);
const r2 = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : null);
const soma = (l, f) => l.reduce((a, s) => a + f(s), 0);

const res = { geradoEm: new Date().toISOString(), replicas: REPLICAS };

// ---------- universo e exclusões ----------
const todos = await lerPares('banco');
const ufsTodas = [...new Set(todos.map((s) => s.uf))].sort();
const { P, filtro } = filtrar(todos);
prepararBiometria(todos);
const E = P.filter((s) => s.temBio && s.c1 >= 20);
res.universo = {
  pares: todos.length, ufs: ufsTodas.length,
  filtroComum: filtro,
  semDetalhamentoBiometria: P.filter((s) => !s.temBio).length,
  semDetalhamentoPorUf: Object.fromEntries(ufsTodas.map((uf) => [uf, P.filter((s) => s.uf === uf && !s.temBio).length]).filter(([, n]) => n > 0)),
  c1Menor20: P.filter((s) => s.temBio && s.c1 < 20).length,
  usadas: E.length,
  ufsNoTeste: [...new Set(E.map((s) => s.uf))].sort(),
};
const ufs = res.universo.ufsNoTeste;
log(`${todos.length} pares, ${E.length} seções no teste (${ufs.length} UFs)`);
await carregarIdade(E);
// tamanho do município (eleitorado apto do 2º turno, todas as seções do município): aproximação de urbano × rural
const aptosMun = new Map();
for (const s of todos) { const k = `${s.uf}|${s.municipio}`; aptosMun.set(k, (aptosMun.get(k) ?? 0) + s.a2); }
for (const s of E) {
  s.logMun = Math.log(aptosMun.get(s.mun));
  const f = s.v13_1 + s.v22_1; s.s1 = f > 0 ? s.v13_1 / f : null;
  s.urnaTrocada = s.urna1 !== s.urna2 ? 1 : 0;
}

// ---------- exterior: fora do teste, só nível ----------
{
  const zz = todos.filter((s) => s.uf === 'zz');
  const comVoto = zz.filter((s) => s.c1 > 0 && s.c2 > 0);
  res.exterior = {
    secoes: zz.length, comComparecimentoNosDoisTurnos: comVoto.length, semDetalhamentoNoBU: zz.filter((s) => s.sb1 == null).length,
    c1: soma(comVoto, (s) => s.c1), c2: soma(comVoto, (s) => s.c2), d13: soma(comVoto, (s) => s.v13_2 - s.v13_1), d22: soma(comVoto, (s) => s.v22_2 - s.v22_1),
    liberadosPorAnoNoLog2t: soma(comVoto, (s) => s.anb2 ?? 0),
  };
}

// ---------- 1. teste E2 por UF e Brasil, três níveis de efeito fixo ----------
const clu = (s) => (s.uf === 'df' ? s.zon : s.mun);
const FE = { mun: (s) => s.mun, uf: (s) => s.uf, zona: (s) => s.zon };
const NIVEIS = ['mun', 'uf', 'zona'];
const M_PRINCIPAL = 2 * ufs.length + 2;
const CRIT = zBilateral(0.05 / M_PRINCIPAL);
const CRIT_TODOS = zBilateral(0.05 / (3 * M_PRINCIPAL));
res.decisao = { testesPrincipais: M_PRINCIPAL, limiarBonferroni: r3(CRIT), testesTresNiveis: 3 * M_PRINCIPAL, limiarBonferroniTresNiveis: r3(CRIT_TODOS) };
log(`Bonferroni: ${M_PRINCIPAL} testes, |t| ≥ ${CRIT.toFixed(3)}`);

const resumo = (a, nome, tot) => {
  const g = a[nome];
  if (!g || !Number.isFinite(g.ep)) return g ? { porBiometria: r3(g.porBiometria), semBiometria: r3(g.semBiometria), d: r4(g.d), ep: null, t: null } : null;
  return { porBiometria: r4(g.porBiometria), semBiometria: r4(g.semBiometria), d: r4(g.d), ep: r4(g.ep), t: r2(g.t),
    ic95: [r4(g.d - 1.96 * g.ep), r4(g.d + 1.96 * g.ep)], icBonferroni: [r4(g.d - CRIT * g.ep), r4(g.d + CRIT * g.ep)], p: +pNormal2(g.t).toPrecision(3),
    votosOrdemGrandeza: Math.round(g.d * tot.dSemBioPositivo) };
};
const linhaE2 = (lista, fe) => {
  const a = testeE2(lista, { grupo: FE[fe], cluster: clu });
  return { secoes: a.secoes, conglomerados: a.municipios, totais: a.totais, ganho13: resumo(a, 'ganho13', a.totais), ganho22: resumo(a, 'ganho22', a.totais) };
};
res.e2 = {};
for (const fe of NIVEIS) {
  const brasil = linhaE2(E, fe);
  const porUf = ufs.map((uf) => ({ uf, ...linhaE2(E.filter((s) => s.uf === uf), fe) }));
  const refs = [brasil.ganho13, brasil.ganho22, ...porUf.flatMap((l) => [l.ganho13, l.ganho22])].filter((g) => g && Number.isFinite(g.t));
  bh(refs.map((g) => g.p)).forEach((q, i) => { refs[i].q = +q.toPrecision(3); refs[i].passaBonferroni = Math.abs(refs[i].t) >= CRIT; });
  res.e2[fe] = { brasil, porUf, testes: refs.length, passamBonferroni: refs.filter((g) => g.passaBonferroni).length, qMenor005: refs.filter((g) => g.q < 0.05).length };
  log(`E2 efeito fixo ${fe}: Brasil 13 d = ${brasil.ganho13.d} (t ${brasil.ganho13.t}); ${res.e2[fe].passamBonferroni} passam Bonferroni`);
}

// as duas brechas separadas (efeito fixo de município): exploratório, 27 × 2 × 2 testes
{
  const porUf = ufs.map((uf) => {
    const a = testeE2(E.filter((s) => s.uf === uf), { separar: true, grupo: FE.mun, cluster: clu });
    const f = (g) => (g && Number.isFinite(g.ep) ? { d: r4(g.d), ep: r4(g.ep), t: r2(g.t), p: +pNormal2(g.t).toPrecision(3) } : null);
    return { uf, secoes: a.secoes, dCadastro: a.totais.dSemBiometria, dAno: a.totais.dAnoNascimento,
      ganho13: a.ganho13 && { cadastroMenosBio: f(a.ganho13.cadastroMenosBio), anoMenosBio: f(a.ganho13.anoMenosBio) },
      ganho22: a.ganho22 && { cadastroMenosBio: f(a.ganho22.cadastroMenosBio), anoMenosBio: f(a.ganho22.anoMenosBio) } };
  });
  const refs = porUf.flatMap((l) => ['ganho13', 'ganho22'].flatMap((k) => ['cadastroMenosBio', 'anoMenosBio'].map((d) => l[k]?.[d]))).filter((g) => g && Number.isFinite(g.t));
  const crit = zBilateral(0.05 / refs.length);
  bh(refs.map((g) => g.p)).forEach((q, i) => { refs[i].q = +q.toPrecision(3); refs[i].passaBonferroni = Math.abs(refs[i].t) >= crit; });
  const br = testeE2(E, { separar: true, grupo: FE.mun, cluster: clu });
  const f = (g) => ({ d: r4(g.d), ep: r4(g.ep), t: r2(g.t) });
  res.separado = { testes: refs.length, limiarBonferroni: r3(crit), brasil: { ganho13: { cadastroMenosBio: f(br.ganho13.cadastroMenosBio), anoMenosBio: f(br.ganho13.anoMenosBio) }, ganho22: { cadastroMenosBio: f(br.ganho22.cadastroMenosBio), anoMenosBio: f(br.ganho22.anoMenosBio) } },
    porUf, passamBonferroni: refs.filter((g) => g.passaBonferroni).length };
}
log('brechas separadas');

// ---------- 2. o que muda com 22, 25 e 28 UFs (agregado nacional) ----------
{
  const UFS22 = ['ac', 'al', 'am', 'ap', 'ba', 'ce', 'df', 'es', 'go', 'ma', 'mg', 'ms', 'mt', 'pa', 'pb', 'pe', 'pi', 'pr', 'rj', 'rn', 'ro', 'rr'];
  const UFS25 = [...UFS22, 'rs', 'sc', 'se'];
  // filtro do cético 06 (só c1 ≥ 20 e detalhamento; sem o corte de aptos que mudam), para reproduzir os números dele
  for (const s of todos) { s.mun ??= `${s.uf}|${s.municipio}`; s.zon ??= `${s.uf}|${s.zona}`; }
  const como06 = todos.filter((s) => s.temBio && s.c1 >= 20);
  const conj = { uf22: (l) => l.filter((s) => UFS22.includes(s.uf)), uf25: (l) => l.filter((s) => UFS25.includes(s.uf)), uf27: (l) => l };
  res.composicao = {};
  for (const [nome, f] of Object.entries(conj)) {
    res.composicao[nome] = {};
    for (const fe of NIVEIS) res.composicao[nome][fe] = linhaE2(f(E), fe);
    res.composicao[nome].semEfeitoFixo_filtro06 = (() => {
      const a = testeE2(f(como06), { grupo: () => 0, cluster: clu }); // um grupo só = constante (modelo do autor)
      return { secoes: a.secoes, ganho13: resumo(a, 'ganho13', a.totais), ganho22: resumo(a, 'ganho22', a.totais) };
    })();
    res.composicao[nome].uf_filtro06 = (() => {
      const a = testeE2(f(como06), { grupo: FE.uf, cluster: clu });
      return { secoes: a.secoes, ganho13: resumo(a, 'ganho13', a.totais), ganho22: resumo(a, 'ganho22', a.totais) };
    })();
  }
}
log('composição 22/25/28');

// ---------- urna trocada entre os turnos (número interno diferente) ----------
res.urnaTrocada = { secoes: E.filter((s) => s.urnaTrocada).length, porUf: Object.fromEntries(ufs.map((uf) => {
  const l = E.filter((s) => s.uf === uf && s.urnaTrocada);
  return [uf, { secoes: l.length, dComparecimento: soma(l, (s) => s.c2 - s.c1), dSemBio: soma(l, (s) => s.dsb + s.dpg), dPorBiometria: soma(l, (s) => s.dpb) }];
})) };

// ---------- 3. nível da parcela sem biometria por UF ----------
res.nivelPorUf = ufs.map((uf) => {
  const l = E.filter((s) => s.uf === uf);
  const c1 = soma(l, (s) => s.c1), c2 = soma(l, (s) => s.c2), n1 = soma(l, (s) => s.sb1 + s.pg1), n2 = soma(l, (s) => s.sb2 + s.pg2);
  return { uf, secoes: l.length, pctSemBio1: r2(100 * n1 / c1), pctSemBio2: r2(100 * n2 / c2), dSemBio: n2 - n1, dComparecimento: c2 - c1,
    pctDoAumentoSemBio: c2 > c1 ? r2(100 * (n2 - n1) / (c2 - c1)) : null, d13: soma(l, (s) => s.v13_2 - s.v13_1), d22: soma(l, (s) => s.v22_2 - s.v22_1) };
});
{
  const c1 = soma(E, (s) => s.c1), c2 = soma(E, (s) => s.c2), n1 = soma(E, (s) => s.sb1 + s.pg1), n2 = soma(E, (s) => s.sb2 + s.pg2);
  res.nivelBrasil = { secoes: E.length, pctSemBio1: r2(100 * n1 / c1), pctSemBio2: r2(100 * n2 / c2), dSemBio: n2 - n1, dComparecimento: c2 - c1, pctDoAumentoSemBio: r2(100 * (n2 - n1) / (c2 - c1)) };
}

// ---------- 4. exame das UFs sinalizadas ----------
const XB = (s) => [s.dpb / s.c1, (s.dsb + s.dpg) / s.c1, s.out1 / s.c1, s.bn1 / s.c1];
const Y13 = (s) => (s.v13_2 - s.v13_1) / s.c1;
const ajuste = (lista, { fe = 'uf', x = XB, cluster = clu, scores = false } = {}) =>
  mqEfeitoFixo(lista.filter((s) => s.temBio && s.c1 >= 20), { y: Y13, x, w: (s) => s.c1, grupo: FE[fe], cluster, scores });
const dDe = (a) => { if (!a) return null; const d = diferenca(a, 1, 0); return { d: r4(d.d), ep: r4(d.ep), t: r2(d.t), secoes: a.n }; };
// influência de cada conglomerado em d: d sem g ≈ d − c'·inv·score_g, com c = (−1, +1, 0, ...)
function influencia(a) {
  const k = a.k; const out = [];
  for (const [g, sc] of a.scoresPorCluster) {
    let db = 0;
    for (let j = 0; j < k; j++) db += (a.inv[1][j] - a.inv[0][j]) * sc[j];
    out.push({ g, delta: db }); // d diminui em `delta` se o conglomerado sair
  }
  return out.sort((x, y) => y.delta - x.delta);
}
const tercil = (lista, f) => {
  const v = lista.map(f).filter(Number.isFinite);
  const q1 = quantil(v, 1 / 3), q2 = quantil(v, 2 / 3);
  return (s) => { const x = f(s); return !Number.isFinite(x) ? null : x <= q1 ? 'T1' : x <= q2 ? 'T2' : 'T3'; };
};
function estratos(lista, nome, classe) {
  const grupos = new Map();
  for (const s of lista) { const c = classe(s); if (c == null) continue; if (!grupos.has(c)) grupos.set(c, []); grupos.get(c).push(s); }
  const linhas = [];
  for (const [c, l] of [...grupos.entries()].sort()) {
    if (l.length < 200) continue;
    const a = ajuste(l, { fe: 'mun' });
    if (!a || !Number.isFinite(a.ep[0])) continue;
    linhas.push({ estrato: c, ...dDe(a), dSemBio: soma(l, (s) => s.dsb + s.dpg) });
  }
  // heterogeneidade: Σ (d_i − d̄)²/ep_i², gl = k − 1 (estratos tratados como independentes)
  const w = linhas.map((l) => 1 / l.ep ** 2); const dm = linhas.reduce((a, l, i) => a + w[i] * l.d, 0) / w.reduce((a, b) => a + b, 0);
  const q = linhas.reduce((a, l, i) => a + w[i] * (l.d - dm) ** 2, 0);
  return { variavel: nome, linhas, qHeterogeneidade: r2(q), gl: linhas.length - 1, p: linhas.length > 1 ? +pQuiQuadrado(q, linhas.length - 1).toPrecision(3) : null };
}
const MODELOS = ['ue2013', 'ue2015', 'ue2020', 'ue2022'];
const comPerfil = (L) => L.filter((s) => s.p60 != null && s.pEscB != null && s.pBioCad != null && s.p1624 != null && s.s1 != null);
// x do E2 + perfil da seção (centrado em Lc) + interações das inclinações Δbio e Δsem biometria com o perfil e com a parcela
// do 13 no 1º turno. Colunas sem variação própria dentro do efeito fixo (tamanho do município com efeito fixo de município,
// indígena numa UF sem seção indígena, modelos de urna que somam 1 dentro do município) saem por podarColunas.
function xAjustado(Lc, fe, { interacoes = true, s1 = true } = {}) {
  const med = (f) => soma(Lc, (s) => s.c1 * f(s)) / soma(Lc, (s) => s.c1);
  const m60 = med((s) => s.p60), mEsc = med((s) => s.pEscB), mBio = med((s) => s.pBioCad), mMun = med((s) => s.logMun), m1624 = med((s) => s.p1624), mS1 = med((s) => s.s1);
  const cov = (s) => [s.p60 - m60, s.pEscB - mEsc, s.pBioCad - mBio, s.logMun - mMun, s.p1624 - m1624, s.pInd ?? 0,
    ...(s1 ? [s.s1 - mS1] : []), ...MODELOS.slice(1).map((m) => (s.modelo2 === m ? 1 : 0))];
  const cheio = (s) => {
    const b = XB(s);
    if (!interacoes) return [...b, ...cov(s)];
    const c = [s.p60 - m60, s.pEscB - mEsc, s.logMun - mMun, s.pBioCad - mBio, ...(s1 ? [s.s1 - mS1] : [])];
    return [...b, ...cov(s), ...c.map((v) => b[0] * v), ...c.map((v) => b[1] * v)];
  };
  const manter = podarColunas(Lc, cheio, FE[fe]);
  return (s) => { const v = cheio(s); return manter.map((j) => v[j]); };
}
// Escolhe, em ordem, as colunas que acrescentam variação própria depois do efeito fixo (resíduo da projeção nas já
// escolhidas > 1e-8 da variação da coluna). As 4 primeiras (o modelo do E2) ficam sempre.
function podarColunas(Lc, x, grupo) {
  const linhas = Lc.map((s) => ({ g: grupo(s), w: s.c1, x: x(s) }));
  const k = linhas[0].x.length;
  const acc = new Map();
  for (const l of linhas) { let a = acc.get(l.g); if (!a) { a = { w: 0, x: new Float64Array(k) }; acc.set(l.g, a); } a.w += l.w; for (let j = 0; j < k; j++) a.x[j] += l.w * l.x[j]; }
  const A = Array.from({ length: k }, () => new Float64Array(k));
  for (const l of linhas) {
    const a = acc.get(l.g); const z = l.x.map((v, j) => v - a.x[j] / a.w);
    for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) A[i][j] += l.w * z[i] * z[j];
  }
  const K = [];
  const resolver = (M, b) => { // eliminação gaussiana com pivô parcial
    const n = b.length; const R = M.map((r, i) => [...r, b[i]]);
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(R[r][c]) > Math.abs(R[p][c])) p = r;
      [R[c], R[p]] = [R[p], R[c]];
      for (let r = 0; r < n; r++) if (r !== c) { const f = R[r][c] / R[c][c]; for (let j = c; j <= n; j++) R[r][j] -= f * R[c][j]; }
    }
    return R.map((r, i) => r[n] / r[i]);
  };
  for (let j = 0; j < k; j++) {
    if (j < 4) { K.push(j); continue; }
    if (!(A[j][j] > 1e-12)) continue;
    const AKK = K.map((a) => K.map((b) => A[a][b])); const AKj = K.map((a) => A[a][j]);
    const beta = resolver(AKK, AKj);
    const resid = A[j][j] - AKj.reduce((s, v, i) => s + v * beta[i], 0);
    if (resid > 1e-8 * A[j][j]) K.push(j);
  }
  return K;
}
function exame(uf) {
  const L = E.filter((s) => s.uf === uf);
  const out = { uf, secoes: L.length, municipios: new Set(L.map((s) => s.mun)).size };
  out.niveis = Object.fromEntries(NIVEIS.map((fe) => [fe, dDe(ajuste(L, { fe }))]));
  // influência por município (efeito fixo de UF, onde o sinal do cético 06 aparece, e de município)
  for (const fe of ['uf', 'mun']) {
    const a = ajuste(L, { fe, scores: true });
    const inf = influencia(a);
    const dTot = a.b[1] - a.b[0];
    const nomeMun = (g) => g;
    const top = inf.slice(0, 10).map((x) => {
      const l = L.filter((s) => clu(s) === x.g);
      return { conglomerado: nomeMun(x.g), secoes: l.length, aptos: soma(l, (s) => s.a2), dSemBio: soma(l, (s) => s.dsb + s.dpg), d13: soma(l, (s) => s.v13_2 - s.v13_1), dSaiAprox: r4(x.delta) };
    });
    // reajuste exato sem os 1, 3, 10 e 20 de maior influência positiva
    const sem = [1, 3, 10, 20].map((n) => {
      const fora = new Set(inf.slice(0, n).map((x) => x.g));
      return { semOsPrimeiros: n, ...dDe(ajuste(L.filter((s) => !fora.has(clu(s))), { fe })) };
    });
    const pos = inf.filter((x) => x.delta > 0);
    out[`influencia_${fe}`] = { d: r4(dTot), conglomerados: inf.length, comInfluenciaPositiva: pos.length,
      parteDos10Maiores: r2(inf.slice(0, 10).reduce((acc, x) => acc + x.delta, 0) / dTot), top, sem };
  }
  // influência por zona (efeito fixo de UF, conglomerado = zona)
  {
    const a = ajuste(L, { fe: 'uf', cluster: (s) => s.zon, scores: true });
    const inf = influencia(a);
    out.influenciaZona_uf = { zonas: inf.length, top: inf.slice(0, 10).map((x) => ({ zona: x.g, secoes: L.filter((s) => s.zon === x.g).length, dSaiAprox: r4(x.delta) })),
      semOs10: dDe(ajuste(L.filter((s) => !new Set(inf.slice(0, 10).map((x) => x.g)).has(s.zon)), { fe: 'uf' })) };
  }
  // estratos (efeito fixo de município)
  out.estratos = [
    estratos(L, 'parcela 60+ (tercil na UF)', tercil(L, (s) => s.p60)),
    estratos(L, 'escolaridade baixa (tercil)', tercil(L, (s) => s.pEscB)),
    estratos(L, 'tamanho do município (tercil, eleitorado)', tercil(L, (s) => s.logMun)),
    estratos(L, 'biometria cadastrada (tercil)', tercil(L, (s) => s.pBioCad)),
    estratos(L, 'modelo de urna (2º turno)', (s) => (MODELOS.includes(s.modelo2) ? s.modelo2 : null)),
    estratos(L, 'urna trocada entre turnos', (s) => (s.urnaTrocada ? 'trocada' : 'mesma')),
  ];
  // controles: covariáveis da seção como regressores e como moduladoras das duas inclinações (centradas na UF)
  const Lc = comPerfil(L);
  out.controles = {
    secoes: Lc.length,
    semControles: dDe(ajuste(Lc, { fe: 'uf' })),
    comControles_uf: dDe(ajuste(Lc, { fe: 'uf', x: xAjustado(Lc, 'uf', { interacoes: false, s1: false }) })),
    comInteracoes_uf: dDe(ajuste(Lc, { fe: 'uf', x: xAjustado(Lc, 'uf', { s1: false }) })),
    comInteracoes_mun: dDe(ajuste(Lc, { fe: 'mun', x: xAjustado(Lc, 'mun', { s1: false }) })),
    comInteracoesEParcela13_uf: dDe(ajuste(Lc, { fe: 'uf', x: xAjustado(Lc, 'uf') })),
    comInteracoesEParcela13_mun: dDe(ajuste(Lc, { fe: 'mun', x: xAjustado(Lc, 'mun') })),
  };
  // uma interação por vez (efeito fixo de município): só as duas inclinações variando com uma característica da seção;
  // nb1 = parcela sem biometria no comparecimento do 1º turno (mudança mecânica de composição entre turnos)
  const UMA = { p60: (s) => s.p60, escolaridadeBaixa: (s) => s.pEscB, tamanhoMunicipio: (s) => s.logMun, biometriaCadastrada: (s) => s.pBioCad,
    parcela13_1t: (s) => s.s1, semBiometria1t: (s) => (s.sb1 + s.pg1) / s.c1 };
  out.umaInteracao_mun = Object.fromEntries(Object.entries(UMA).map(([n, g]) => {
    const m = soma(Lc, (s) => s.c1 * g(s)) / soma(Lc, (s) => s.c1);
    return [n, dDe(ajuste(Lc, { fe: 'mun', x: (s) => { const b = XB(s); const c = g(s) - m; return [...b, b[0] * c, b[1] * c]; } }))];
  }));
  return out;
}
const SINALIZADAS = ['pr', 'sp', 'mg', 'rs'];
// sensibilidade para todas as UFs e o Brasil: efeito fixo de município + perfil da seção + interações das duas inclinações
// com o perfil e com a parcela do 13 no 1º turno (o eleitor a mais "vota como a seção"); d avaliado no perfil médio
{
  const linha = (lista) => { const Lc = comPerfil(lista); return dDe(ajuste(Lc, { fe: 'mun', x: xAjustado(Lc, 'mun') })); };
  const brasil = linha(E);
  const porUf = ufs.map((uf) => ({ uf, ...linha(E.filter((s) => s.uf === uf)) }));
  const refs = [brasil, ...porUf].filter((g) => g && Number.isFinite(g.t));
  bh(refs.map((g) => pNormal2(g.t))).forEach((q, i) => { refs[i].q = +q.toPrecision(3); refs[i].passaBonferroni = Math.abs(refs[i].t) >= CRIT; });
  res.e2Ajustado = { nota: 'só ganho do 13; o 22 é quase espelho', brasil, porUf, passamBonferroni: refs.filter((g) => g.passaBonferroni).length };
  log(`E2 ajustado: Brasil d = ${brasil.d} (t ${brasil.t})`);
}
for (const uf of ufs) {
  const g = res.e2.mun.porUf.find((l) => l.uf === uf);
  if ((g.ganho13?.passaBonferroni || g.ganho22?.passaBonferroni) && !SINALIZADAS.includes(uf)) SINALIZADAS.push(uf);
}
res.exame = SINALIZADAS.map((uf) => { const e = exame(uf); log(`exame ${uf}`); return e; });

// ---------- 5. poder: inserção pela brecha, todos os votos para o 13 ----------
// em cada seção sorteada: +k votos do 13 e +k liberações por ano de nascimento, sem passar dos aptos (a2 − c2).
const rnd = aleatorio(20261029);
const corte80 = Object.fromEntries(ufs.map((uf) => [uf, quantil(E.filter((s) => s.uf === uf && s.s1 != null).map((s) => s.s1), 0.8)]));
function inserir(idx, k) {
  let tot = 0; const feitos = [];
  for (const i of idx) {
    const s = E[i];
    const kk = Math.max(0, Math.min(typeof k === 'function' ? k(s) : k, s.a2 - s.c2));
    if (!kk) continue;
    s.v13_2 += kk; s.pg2 += kk; s.dpg += kk; tot += kk; feitos.push([s, kk]);
  }
  return { tot, desfazer: () => { for (const [s, kk] of feitos) { s.v13_2 -= kk; s.pg2 -= kk; s.dpg -= kk; } } };
}
const tPrincipal = (lista) => { const a = ajuste(lista, { fe: 'mun' }); const d = diferenca(a, 1, 0); return d.t; };
const indicesUf = Object.fromEntries(ufs.map((uf) => [uf, E.map((s, i) => (s.uf === uf ? i : -1)).filter((i) => i >= 0)]));
const sortearDe = (lista, n) => { const sel = new Set(); n = Math.min(n, lista.length); while (sel.size < n) sel.add(lista[Math.floor(rnd() * lista.length)]); return [...sel]; };
const municipiosAte = (fracao, filtroUf = null) => {
  const porMun = new Map();
  E.forEach((s, i) => { if (filtroUf && s.uf !== filtroUf) return; if (!porMun.has(s.mun)) porMun.set(s.mun, []); porMun.get(s.mun).push(i); });
  const ms = [...porMun.keys()]; for (let i = ms.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ms[i], ms[j]] = [ms[j], ms[i]]; }
  const alvo = Math.round((filtroUf ? indicesUf[filtroUf].length : E.length) * fracao); const out = [];
  for (const m of ms) { if (out.length >= alvo) break; out.push(...porMun.get(m)); }
  return out;
};
const todosIdx = E.map((_, i) => i);
const redutos = todosIdx.filter((i) => E[i].s1 != null && E[i].s1 >= corte80[E[i].uf]);
const CENARIOS = [
  ['aleatórias 0,25% das seções, +40', () => sortearDe(todosIdx, Math.round(E.length * 0.0025)), 40],
  ['aleatórias 1%, +10', () => sortearDe(todosIdx, Math.round(E.length * 0.01)), 10],
  ['aleatórias 5%, +5', () => sortearDe(todosIdx, Math.round(E.length * 0.05)), 5],
  ['redutos do 13 (quintil de cima na UF) 1%, +10', () => sortearDe(redutos, Math.round(E.length * 0.01)), 10],
  ['redutos 5%, +5', () => sortearDe(redutos, Math.round(E.length * 0.05)), 5],
  ['redutos 20%, +3', () => sortearDe(redutos, Math.round(E.length * 0.2)), 3],
  ['municípios inteiros (5% das seções), +5 em cada seção', () => municipiosAte(0.05), 5],
  ['municípios inteiros (20% das seções), 3% do comparecimento do 1º turno', () => municipiosAte(0.2), (s) => Math.round(0.03 * s.c1)],
  ['BA inteira, +5 em cada seção', () => indicesUf.ba, 5],
  ['BA inteira, 3% do comparecimento do 1º turno', () => indicesUf.ba, (s) => Math.round(0.03 * s.c1)],
  ['SP inteira, +5 em cada seção', () => indicesUf.sp, 5],
  ['uma zona inteira por UF (a maior), +10', () => ufs.flatMap((uf) => {
    const z = new Map(); for (const i of indicesUf[uf]) z.set(E[i].zon, (z.get(E[i].zon) ?? 0) + 1);
    const maior = [...z.entries()].sort((a, b) => b[1] - a[1])[0][0]; return indicesUf[uf].filter((i) => E[i].zon === maior);
  }), 10],
];
res.poder = { limiar: r3(CRIT), cenarios: [] };
for (const [nome, sel, k] of CENARIOS) {
  const reps = [];
  for (let r = 0; r < REPLICAS; r++) {
    const { tot, desfazer } = inserir(sel(), k);
    const tBr = tPrincipal(E);
    let tUfMax = -Infinity, ufMax = null;
    for (const uf of ufs) { const t = tPrincipal(indicesUf[uf].map((i) => E[i])); if (t > tUfMax) { tUfMax = t; ufMax = uf; } }
    desfazer();
    reps.push({ votos: tot, tBrasil: r2(tBr), tUfMax: r2(tUfMax), ufMax, detecta: tBr >= CRIT || tUfMax >= CRIT });
  }
  const med = (f) => quantil(reps.map(f), 0.5);
  res.poder.cenarios.push({ cenario: nome, votosMediana: Math.round(med((r) => r.votos)), tBrasilMediana: r2(med((r) => r.tBrasil)), tUfMaxMediana: r2(med((r) => r.tUfMax)),
    detectaEm: reps.filter((r) => r.detecta).length, replicas: REPLICAS, reps });
  log(`poder: ${nome}`);
}
// limite de detecção por UF: menor k com t mediano ≥ limiar (1% e 5% das seções da UF, sorteadas)
const KS = [1, 2, 3, 5, 8, 12, 20, 30, 50, 80];
res.poder.limitePorUf = [];
for (const uf of ufs) {
  const lista = indicesUf[uf].map((i) => E[i]);
  const linha = { uf, secoes: lista.length };
  for (const fr of [0.01, 0.05]) {
    let achou = null;
    for (const k of KS) {
      const reps = [];
      for (let r = 0; r < REPLICAS; r++) {
        const { tot, desfazer } = inserir(sortearDe(indicesUf[uf], Math.max(1, Math.round(lista.length * fr))), k);
        reps.push({ t: tPrincipal(lista), votos: tot }); desfazer();
      }
      if (quantil(reps.map((x) => x.t), 0.5) >= CRIT) { achou = { k, votos: Math.round(quantil(reps.map((x) => x.votos), 0.5)) }; break; }
    }
    linha[`fr${fr * 100}`] = achou ?? { k: `> ${KS.at(-1)}`, votos: null };
  }
  res.poder.limitePorUf.push(linha);
}
log('limite por UF');

// ---------- saída ----------
const arq = await salvar('h05-28ufs.json', res);
const tab = ufs.map((uf) => {
  const g = (fe, k) => res.e2[fe].porUf.find((l) => l.uf === uf)[k] ?? {};
  const n = res.nivelPorUf.find((l) => l.uf === uf); const lim = res.poder.limitePorUf.find((l) => l.uf === uf);
  return { uf, secoes: n.secoes, pctSemBio1: n.pctSemBio1, pctSemBio2: n.pctSemBio2, dSemBio: n.dSemBio,
    d13_mun: g('mun', 'ganho13').d, ep13_mun: g('mun', 'ganho13').ep, t13_mun: g('mun', 'ganho13').t, q13_mun: g('mun', 'ganho13').q,
    t22_mun: g('mun', 'ganho22').t, d13_uf: g('uf', 'ganho13').d, t13_uf: g('uf', 'ganho13').t, d13_zona: g('zona', 'ganho13').d, t13_zona: g('zona', 'ganho13').t,
    limite1pct_votos: lim.fr1.votos, limite5pct_votos: lim.fr5.votos };
});
await salvar('h05-28ufs-por-uf.csv', paraCsv(tab, Object.keys(tab[0])));
log(`→ ${arq}`);
console.log(JSON.stringify({ universo: res.universo, decisao: res.decisao, brasil: Object.fromEntries(NIVEIS.map((fe) => [fe, res.e2[fe].brasil])), passam: Object.fromEntries(NIVEIS.map((fe) => [fe, res.e2[fe].passamBonferroni])) }, null, 1));
