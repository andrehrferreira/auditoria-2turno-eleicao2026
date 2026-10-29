// Revisor cético, achado h10-crescimento-cabe-no-disponivel (cientista político, doc 01), lente:
// explicações alternativas e poder do teste. Recalcula do zero, sem usar as saídas do autor.
//
// Uso: node --max-old-space-size=4096 scripts/auditoria/cetico-h10-crescimento-cabe-no-disponivel-alternativas.mjs
// Entradas: votacao_secao_2026_BR, detalhe_votacao_secao_2026, votacao_candidato_munzona_2026 (dados abertos),
//           consulta_cand_2026_BR e o banco data/db/eleicao2026.sqlite (somente leitura).
// Saída: data/parsed/auditoria/cetico/h10-alternativas.json
import { mkdirSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { ZIPS, entradasZip, linhasBrutas } from './contagem-zip.mjs';

const SAIDA = 'data/parsed/auditoria/cetico';
mkdirSync(SAIDA, { recursive: true });
const SEIS = ['ac', 'ap', 'rr', 'ma', 'am', 'to']; // UFs em que o ganho do 13 passa do disponível (autor)
const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);

/** Linhas como arrays + índice de colunas; conta linhas com nº de campos diferente do cabeçalho. */
async function* tabela(zip, nome, filtro) {
  const e = (await entradasZip(zip)).find((x) => x.nome === nome);
  if (!e) throw new Error(`${nome} não está em ${zip}`);
  let col = null;
  for await (const c of linhasBrutas(zip, e)) {
    if (!col) { col = Object.fromEntries(c.map((x, i) => [x, i])); col.__n = c.length; continue; }
    if (c.length !== col.__n) { tabela.malformadas = (tabela.malformadas ?? 0) + 1; continue; }
    if (filtro && !filtro(c, col)) continue;
    yield [c, col];
  }
}

// ---------------------------------------------------------------- 1. seções (compacto)
const idx = new Map(); // uf|mun|zona|secao → índice
const N = 700000;
const C = {}; // campos por turno: aptos, comp, abst, bn, L, F, E, nom, tem
for (const t of [1, 2]) for (const k of ['aptos', 'comp', 'abst', 'bn', 'L', 'F', 'E', 'nomDet', 'tem', 'brDet', 'nuDet', 'br', 'nu']) C[`${k}${t}`] = new Int32Array(N);
const ufDe = []; const munDe = [];
const chave = (uf, m, z, s) => `${uf}|${Number(m)}|${Number(z)}|${Number(s)}`;
const pega = (uf, m, z, s) => {
  const k = chave(uf, m, z, s);
  let i = idx.get(k);
  if (i === undefined) { i = idx.size; idx.set(k, i); ufDe[i] = uf; munDe[i] = `${uf}|${Number(m)}`; }
  return i;
};

log('detalhe_votacao_secao');
let geracao = {};
for await (const [c, col] of tabela(ZIPS.detalheSecao, 'detalhe_votacao_secao_2026_BR.csv', (c, col) => c[col.CD_CARGO] === '1')) {
  geracao.detalhe ??= `${c[col.DT_GERACAO]} ${c[col.HH_GERACAO]}`;
  const t = Number(c[col.NR_TURNO]);
  const i = pega(c[col.SG_UF].toLowerCase(), c[col.CD_MUNICIPIO], c[col.NR_ZONA], c[col.NR_SECAO]);
  C[`tem${t}`][i] = 1;
  C[`aptos${t}`][i] += Number(c[col.QT_APTOS]);
  C[`comp${t}`][i] += Number(c[col.QT_COMPARECIMENTO]);
  C[`abst${t}`][i] += Number(c[col.QT_ABSTENCOES]);
  C[`brDet${t}`][i] += Number(c[col.QT_VOTOS_BRANCOS]);
  C[`nuDet${t}`][i] += Number(c[col.QT_VOTOS_NULOS]);
  C[`nomDet${t}`][i] += Number(c[col.QT_VOTOS_NOMINAIS]);
}
log(`detalhe: ${idx.size} seções`);

log('votacao_secao');
const oficialUf = {}; // turno|uf → { numero → votos }
let secaoSemDetalhe = 0;
const nomes = {};
for await (const [c, col] of tabela(ZIPS.votacaoSecao, 'votacao_secao_2026_BR.csv', (c, col) => c[col.CD_CARGO] === '1')) {
  geracao.votacaoSecao ??= `${c[col.DT_GERACAO]} ${c[col.HH_GERACAO]}`;
  const t = Number(c[col.NR_TURNO]);
  const uf = c[col.SG_UF].toLowerCase();
  const k = chave(uf, c[col.CD_MUNICIPIO], c[col.NR_ZONA], c[col.NR_SECAO]);
  const i = idx.get(k);
  if (i === undefined) { secaoSemDetalhe++; continue; }
  const nr = c[col.NR_VOTAVEL];
  const q = Number(c[col.QT_VOTOS]);
  nomes[nr] ??= c[col.NM_VOTAVEL];
  const o = (oficialUf[`${t}|${uf}`] ??= {});
  o[nr] = (o[nr] ?? 0) + q;
  if (nr === '13') C[`L${t}`][i] += q;
  else if (nr === '22') C[`F${t}`][i] += q;
  else if (nr === '95') C[`br${t}`][i] += q;
  else if (nr === '96') C[`nu${t}`][i] += q;
  else C[`E${t}`][i] += q;
}
const NS = idx.size;
for (let i = 0; i < NS; i++) for (const t of [1, 2]) C[`bn${t}`][i] = C[`br${t}`][i] + C[`nu${t}`][i];
log(`votacao_secao lida; ${secaoSemDetalhe} linhas sem detalhe`);

// consistência interna seção a seção
const consist = { secoes: NS, so1t: 0, so2t: 0, nominalDifDetalhe: 0, bnDifDetalhe: 0, somaDifComp: 0, eleitoresSo1t: 0, eleitoresSo2t: 0 };
for (let i = 0; i < NS; i++) {
  if (C.tem1[i] && !C.tem2[i]) { consist.so1t++; consist.eleitoresSo1t += C.aptos1[i]; }
  if (!C.tem1[i] && C.tem2[i]) { consist.so2t++; consist.eleitoresSo2t += C.aptos2[i]; }
  for (const t of [1, 2]) {
    if (!C[`tem${t}`][i]) continue;
    const nom = C[`L${t}`][i] + C[`F${t}`][i] + C[`E${t}`][i];
    if (nom !== C[`nomDet${t}`][i]) consist.nominalDifDetalhe++;
    if (C[`br${t}`][i] !== C[`brDet${t}`][i] || C[`nu${t}`][i] !== C[`nuDet${t}`][i]) consist.bnDifDetalhe++;
    if (nom + C[`bn${t}`][i] !== C[`comp${t}`][i]) consist.somaDifComp++;
  }
}

// ---------------------------------------------------------------- 2. munzona por UF e o candidato 28
log('munzona');
const munzonaUf = {};
for await (const [c, col] of tabela(ZIPS.munzona, 'votacao_candidato_munzona_2026_BR.csv', (c, col) => c[col.CD_CARGO] === '1')) {
  geracao.munzona ??= `${c[col.DT_GERACAO]} ${c[col.HH_GERACAO]}`;
  const k = `${c[col.NR_TURNO]}|${c[col.SG_UF].toLowerCase()}`;
  const o = (munzonaUf[k] ??= {});
  o[c[col.NR_CANDIDATO]] = (o[c[col.NR_CANDIDATO]] ?? 0) + Number(c[col.QT_VOTOS_NOMINAIS]);
  (munzonaUf.__destinacao ??= {})[`${c[col.NR_CANDIDATO]}|${c[col.NM_TIPO_DESTINACAO_VOTOS]}`] = 1;
}
const munzonaXsecao = { diferencas: [], so28: {} };
for (const [k, o] of Object.entries(oficialUf)) {
  const m = munzonaUf[k] ?? {};
  for (const [nr, q] of Object.entries(o)) {
    if (nr === '95' || nr === '96') continue;
    if ((m[nr] ?? 0) !== q) {
      if (nr === '28') munzonaXsecao.so28[k] = q;
      else munzonaXsecao.diferencas.push({ k, nr, secao: q, munzona: m[nr] ?? 0 });
    }
  }
  for (const [nr, q] of Object.entries(m)) if (!(nr in o)) munzonaXsecao.diferencas.push({ k, nr, secao: 0, munzona: q });
}
const cand28 = [];
{
  const z = 'data/raw/dadosabertos/consulta_cand/consulta_cand_2026.zip';
  for await (const [c, col] of tabela(z, 'consulta_cand_2026_BR.csv', (c, col) => c[col.CD_CARGO] === '1' && c[col.NR_CANDIDATO] === '28')) {
    cand28.push({ turno: c[col.NR_TURNO], urna: c[col.NM_URNA_CANDIDATO], partido: c[col.SG_PARTIDO], sitCand: c[col.DS_SITUACAO_CANDIDATURA], sitTot: c[col.DS_SIT_TOT_TURNO] });
  }
}

// ---------------------------------------------------------------- 3. BU × votacao_secao por UF (banco)
log('banco: BU por UF');
const db = new DatabaseSync('data/db/eleicao2026.sqlite', { readOnly: true });
const carga = db.prepare('select turno, uf, secoes, completas, incompletas, sem_arquivo from carga').all();
const qBu = db.prepare(`select case tipo_voto when 'branco' then '95' when 'nulo' then '96' else cast(numero as text) end nr, sum(quantidade) q
  from voto_bu where turno = ? and uf = ? and cargo = 1 group by 1`);
const buXoficial = [];
for (const cg of carga) {
  const bu = Object.fromEntries(qBu.all(cg.turno, cg.uf).map((r) => [r.nr, Number(r.q)]));
  const of = oficialUf[`${cg.turno}|${cg.uf}`] ?? {};
  const difs = [];
  for (const nr of new Set([...Object.keys(bu), ...Object.keys(of)])) if ((bu[nr] ?? 0) !== (of[nr] ?? 0)) difs.push({ nr, bu: bu[nr] ?? 0, oficial: of[nr] ?? 0 });
  buXoficial.push({ turno: cg.turno, uf: cg.uf, secoesCarga: cg.secoes, completas: cg.completas, semArquivo: cg.sem_arquivo,
    votosBu: Object.values(bu).reduce((a, b) => a + b, 0), votosOficial: Object.values(of).reduce((a, b) => a + b, 0), difs });
}
db.close();
const ufs1tNoBanco = carga.filter((x) => x.turno === 1).map((x) => x.uf);
log(`BU conferido: ${buXoficial.length} turno×UF`);

// ---------------------------------------------------------------- 4. balanço por UF e município (reprodução)
const novoB = () => ({ aptos1: 0, aptos2: 0, comp1: 0, comp2: 0, bn1: 0, bn2: 0, L1: 0, F1: 0, L2: 0, F2: 0, E1: 0, E2: 0, secoes: 0 });
const add = (b, i) => {
  b.secoes++;
  for (const t of [1, 2]) for (const k of ['aptos', 'comp', 'bn', 'L', 'F', 'E']) b[`${k}${t}`] += C[`${k}${t}`][i];
};
const fecha = (b) => {
  b.dL = b.L2 - b.L1; b.dF = b.F2 - b.F1; b.dComp = b.comp2 - b.comp1; b.dBN = b.bn2 - b.bn1; b.dAptos = b.aptos2 - b.aptos1;
  b.disponivel = b.E1 - b.E2 - b.dBN + b.dComp;
  b.identidade = b.dL + b.dF === b.disponivel;
  b.parte13 = b.disponivel ? +(b.dL / b.disponivel).toFixed(4) : null;
  b.excesso13 = Math.max(0, b.dL - b.disponivel); b.excesso22 = Math.max(0, b.dF - b.disponivel);
  return b;
};
const br = novoB(); const porUf = {}; const porMun = {};
for (let i = 0; i < NS; i++) {
  add(br, i); add(porUf[ufDe[i]] ??= novoB(), i); add(porMun[munDe[i]] ??= novoB(), i);
}
fecha(br); for (const b of Object.values(porUf)) fecha(b); for (const b of Object.values(porMun)) fecha(b);
const ufsExcesso13 = Object.entries(porUf).filter(([, b]) => b.excesso13 > 0).map(([u, b]) => ({ uf: u, excesso13: b.excesso13, dF: b.dF, dComp: b.dComp, compPct1: +(b.comp1 / b.aptos1 * 100).toFixed(2), compPct2: +(b.comp2 / b.aptos2 * 100).toFixed(2), dAptos: b.dAptos }));
const ufsExcesso22 = Object.entries(porUf).filter(([, b]) => b.excesso22 > 0).map(([u]) => u);
const muns = Object.values(porMun);

// Aptos: o eleitorado é o mesmo nos dois turnos? (seção, município, UF)
const aptos = { brasil: { aptos1: br.aptos1, aptos2: br.aptos2 }, secoesComDelta: 0, somaAbsDeltaSecao: 0, maiorDeltaSecao: 0,
  municipiosComDelta: 0, somaAbsDeltaMun: 0, ufs: Object.fromEntries(Object.entries(porUf).map(([u, b]) => [u, b.dAptos])) };
for (let i = 0; i < NS; i++) {
  const d = C.aptos2[i] - C.aptos1[i];
  if (d) { aptos.secoesComDelta++; aptos.somaAbsDeltaSecao += Math.abs(d); aptos.maiorDeltaSecao = Math.max(aptos.maiorDeltaSecao, Math.abs(d)); }
}
for (const b of muns) if (b.dAptos) { aptos.municipiosComDelta++; aptos.somaAbsDeltaMun += Math.abs(b.dAptos); }

// ---------------------------------------------------------------- 5. alternativa não testada: perda do finalista
// onde o comparecimento NÃO caiu (a queda de comparecimento não pode explicar), por seção, simétrica.
const perdaSemQueda = {};
for (const g of ['BR', ...SEIS]) perdaSemQueda[g] = { secoes: 0, s22: { perdeu: 0, perdeuSemQueda: 0, votosSemQueda: 0, alemDaQueda: 0, secoesAlemDaQueda: 0 }, s13: { perdeu: 0, perdeuSemQueda: 0, votosSemQueda: 0, alemDaQueda: 0, secoesAlemDaQueda: 0 } };
const alemLista = { s22: [], s13: [] };
for (let i = 0; i < NS; i++) {
  if (!C.tem1[i] || !C.tem2[i] || C.aptos1[i] < 20 || Math.abs(C.aptos2[i] - C.aptos1[i]) > 5) continue;
  const dComp = C.comp2[i] - C.comp1[i];
  const queda = Math.max(0, -dComp);
  for (const [s, d] of [['s22', C.F2[i] - C.F1[i]], ['s13', C.L2[i] - C.L1[i]]]) {
    for (const g of ['BR', ufDe[i]]) {
      const p = perdaSemQueda[g];
      if (!p) continue;
      if (s === 's22') p.secoes++;
      if (d >= 0) continue;
      p[s].perdeu++;
      if (dComp >= 0) { p[s].perdeuSemQueda++; p[s].votosSemQueda += -d; }
      const alem = -d - queda;
      if (alem > 0) { p[s].alemDaQueda += alem; p[s].secoesAlemDaQueda++; if (g === 'BR') alemLista[s].push(alem); }
    }
  }
}
// concentração do "além da queda": os 1% maiores levam quanto?
const concentra = (l) => { const v = [...l].sort((a, b) => b - a); const tot = v.reduce((a, b) => a + b, 0); const k = Math.max(1, Math.ceil(v.length / 100)); return { secoes: v.length, votos: tot, top1pct: v.slice(0, k).reduce((a, b) => a + b, 0), max: v[0] ?? 0 }; };
const concentracao = { s22: concentra(alemLista.s22), s13: concentra(alemLista.s13) };

// ---------------------------------------------------------------- 6. alternativa: troca direta uniforme (intercepto)
// Regressão do autor por UF (ΔF/comp1 em 1, Δcomp/comp1, E/comp1, BN/comp1) com o INTERCEPTO, que o autor não
// reportou: com Δcomp=0, sem eliminados e sem BN, quanto cada finalista ganha/perde (troca líquida direta).
function mqo(rows, nx) {
  const A = Array.from({ length: nx }, () => Array(nx + 1).fill(0));
  for (const { x, y, w } of rows) for (let a = 0; a < nx; a++) { A[a][nx] += w * x[a] * y; for (let b = 0; b < nx; b++) A[a][b] += w * x[a] * x[b]; }
  for (let c = 0; c < nx; c++) {
    let p = c; for (let r = c + 1; r < nx; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    if (Math.abs(A[c][c]) < 1e-12) return null;
    for (let r = 0; r < nx; r++) { if (r === c) continue; const f = A[r][c] / A[c][c]; for (let j = c; j <= nx; j++) A[r][j] -= f * A[c][j]; }
  }
  return A.map((r, i) => r[nx] / r[i]);
}
const troca = {};
const linhas = {};
for (let i = 0; i < NS; i++) {
  if (!C.tem1[i] || !C.tem2[i] || C.comp1[i] < 20 || Math.abs(C.aptos2[i] - C.aptos1[i]) > 5) continue;
  (linhas[ufDe[i]] ??= []).push(i);
}
for (const [uf, l] of Object.entries(linhas)) {
  const X = (i) => [1, (C.comp2[i] - C.comp1[i]) / C.comp1[i], C.E1[i] / C.comp1[i], C.bn1[i] / C.comp1[i]];
  const bL = mqo(l.map((i) => ({ w: C.comp1[i], x: X(i), y: (C.L2[i] - C.L1[i]) / C.comp1[i] })), 4);
  const bF = mqo(l.map((i) => ({ w: C.comp1[i], x: X(i), y: (C.F2[i] - C.F1[i]) / C.comp1[i] })), 4);
  const comp1 = l.reduce((a, i) => a + C.comp1[i], 0);
  const F1 = l.reduce((a, i) => a + C.F1[i], 0);
  troca[uf] = { secoes: l.length, intercepto13: +bL[0].toFixed(4), intercepto22: +bF[0].toFixed(4), coefComp13: +bL[1].toFixed(3), coefComp22: +bF[1].toFixed(3),
    coefE13: +bL[2].toFixed(3), coefE22: +bF[2].toFixed(3), votosTrocaImplicita22: Math.round(bF[0] * comp1), pctDos22: +(100 * bF[0] * comp1 / F1).toFixed(2) };
}

// ---------------------------------------------------------------- 7. PODER: injeção de troca 22 → 13
// Pega os dados observados como "limpos" e injeta uma troca de p% dos votos do 22 no 2º turno para o 13.
// O teste do autor só acusa onde o 22 passa a ter ΔF < 0 (ganho do 13 > disponível).
const margem = br.L2 - br.F2;
const poder = { margem, trocaQueViraResultado: Math.ceil(margem / 2) + 1, pctDos22QueViraResultado: +(100 * (margem / 2) / br.F2).toFixed(2),
  limiarNacionalVotos: br.dF, limiarNacionalPct: +(100 * br.dF / br.F2).toFixed(2), uniforme: [], concentrada: [] };
const ufList = Object.entries(porUf).filter(([u]) => u !== 'zz');
for (const p of [0.005, 0.01, 0.02, 0.03, 0.037, 0.05, 0.0622, 0.08]) {
  const ufsAcusa = ufList.filter(([, b]) => b.dF - p * b.F2 < 0).map(([u]) => u);
  const munAcusa = muns.filter((b) => b.dF - p * b.F2 < 0).length;
  poder.uniforme.push({ pct: +(p * 100).toFixed(2), votosTrocados: Math.round(p * br.F2), nacionalAcusa: br.dF - p * br.F2 < 0, ufsAcusa: ufsAcusa.length, ufsNovas: ufsAcusa.filter((u) => !SEIS.includes(u)).length, municipiosAcusa: munAcusa, municipiosObservados: muns.filter((b) => b.dF < 0).length });
}
// Troca concentrada: o mesmo volume (o suficiente para virar o resultado) só nas seções onde o 22 tem ≥ 60% no 2º turno.
{
  const V = poder.trocaQueViraResultado;
  const alvo = [];
  for (let i = 0; i < NS; i++) if (C.tem2[i] && C.L2[i] + C.F2[i] > 0 && C.F2[i] / (C.L2[i] + C.F2[i]) >= 0.6) alvo.push(i);
  const tot = alvo.reduce((a, i) => a + C.F2[i], 0);
  const q = V / tot; // fração dos votos do 22 trocada em cada seção-alvo
  const injUf = {}; const injMun = {};
  for (const i of alvo) { const x = q * C.F2[i]; injUf[ufDe[i]] = (injUf[ufDe[i]] ?? 0) + x; injMun[munDe[i]] = (injMun[munDe[i]] ?? 0) + x; }
  const ufsAcusa = ufList.filter(([u, b]) => b.dF - (injUf[u] ?? 0) < 0).map(([u]) => u);
  const munAcusa = Object.entries(porMun).filter(([m, b]) => b.dF - (injMun[m] ?? 0) < 0).length;
  poder.concentrada.push({ regra: 'seções com 22 >= 60% no 2º turno', secoesAlvo: alvo.length, fracaoTrocadaNaSecao: +q.toFixed(4), votosTrocados: V,
    nacionalAcusa: br.dF - V < 0, ufsAcusa, municipiosAcusa: munAcusa, municipiosObservados: muns.filter((b) => b.dF < 0).length });
}
// Detecção pelo teste de seção "perda além da queda" (sem rotatividade) com troca uniforme pequena
for (const p of [0.01, 0.037]) {
  let s = 0, v = 0;
  for (let i = 0; i < NS; i++) {
    if (!C.tem1[i] || !C.tem2[i] || C.aptos1[i] < 20 || Math.abs(C.aptos2[i] - C.aptos1[i]) > 5) continue;
    const d = C.F2[i] - Math.round(p * C.F2[i]) - C.F1[i];
    const alem = -d - Math.max(0, C.comp1[i] - C.comp2[i]);
    if (d < 0 && alem > 0) { s++; v += alem; }
  }
  poder[`secaoAlemDaQueda_${p * 100}pct`] = { secoes: s, votos: v, observado: { secoes: perdaSemQueda.BR.s22.secoesAlemDaQueda, votos: perdaSemQueda.BR.s22.alemDaQueda } };
}

const resumo = {
  geradoEm: new Date().toISOString(), geracao, linhasMalformadas: tabela.malformadas ?? 0,
  reproducao: { brasil: br, ufsExcesso13, ufsExcesso22 },
  consistencia: consist, munzonaXsecao, destinacaoMunzona: Object.keys(munzonaUf.__destinacao ?? {}), cand28, nome28: nomes['28'],
  buXoficial: buXoficial.map((x) => ({ ...x, difs: x.difs.slice(0, 20), nDifs: x.difs.length })), ufs1tNoBanco,
  aptos, perdaSemQueda, concentracao, troca, poder,
};
writeFileSync(`${SAIDA}/h10-alternativas.json`, JSON.stringify(resumo, null, 1));
log('ok');
