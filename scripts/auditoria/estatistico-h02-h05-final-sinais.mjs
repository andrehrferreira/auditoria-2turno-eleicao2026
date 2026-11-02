// Estatístico eleitoral, doc 30 (plano 29, commit 45dc471; adendo 1, commit 1989f56), H05(b) e detector N de H05(a).
//  B1  E2 (doc 06) com efeito fixo do LOCAL de votação do 2º turno (uf|município|zona|local), 27 UFs + Brasil, 13 e 22: 56 testes.
//  B2  vias separadas (Δpor biometria, Δsem biometria cadastrada, Δpor biografia), efeito fixo de município; d_sb e d_pg para
//      Brasil, SP e PR: 6 testes (|t| ≥ 2,64).
//  B3  o mesmo E2 em 2022 (diário de 2022: V1 = por biometria; V2 + V3m + V3s = sem digital; votos do .bu de 2022; brancos,
//      nulos e eliminados do votacao_secao_2022), e d2026 − d2022, em MG, PR, RS, SC e SP: 10 testes (|z| ≥ 2,81).
//  N   variação, entre os turnos, da parcela sem digital no comparecimento, 2026 − 2022, por UF (EP agrupado por município),
//      5 testes (|z| ≥ 2,58); calibração: inserção proporcional a c1 na UF inteira (P7 por UF).
// Uso: node --max-old-space-size=8192 scripts/auditoria/estatistico-h02-h05-final-sinais.mjs [--ufs2022 mg,pr,rs,sc,sp]
// Saída: data/parsed/auditoria/estatistico-eleitoral/h02-h05-final/sinais.json
import { createReadStream, existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { dividirCsv, linhasZip, pad } from './forense-lib.mjs';
import { diferenca, filtrar, lerPares, mqEfeitoFixo, prepararBiometria, zBilateral } from './estatistico-lib.mjs';

const { values } = parseArgs({ options: { ufs2022: { type: 'string', default: 'mg,pr,rs,sc,sp' } } });
const UFS22 = values.ufs2022.split(',');
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico-eleitoral', 'h02-h05-final');
const H13 = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h13-v2');
const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const r4 = (x) => (Number.isFinite(x) ? Math.round(x * 10000) / 10000 : null);
const r2 = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : null);
const clu = (s) => (s.uf === 'df' ? s.zon : s.mun);
const res = { geradoEm: new Date().toISOString(), plano: '29 (45dc471; adendo 1989f56)', ufs2022: UFS22 };

// ---------- 2026 ----------
const todos = await lerPares('banco');
const { P } = filtrar(todos);
prepararBiometria(todos);
const E = P.filter((s) => s.temBio && s.c1 >= 20);
const ufs = [...new Set(E.map((s) => s.uf))].sort();
const Y = { 13: (s) => (s.v13_2 - s.v13_1) / s.c1, 22: (s) => (s.v22_2 - s.v22_1) / s.c1 };
const XB = (s) => [s.dpb / s.c1, (s.dsb + s.dpg) / s.c1, s.out1 / s.c1, s.bn1 / s.c1];
const e2 = (lista, grupo, f = 13, x = XB) => mqEfeitoFixo(lista, { y: Y[f], x, w: (s) => s.c1, grupo, cluster: clu });
const dDe = (a, i = 1, j = 0) => { const d = diferenca(a, i, j); return { d: r4(d.d), ep: r4(d.ep), t: r2(d.t), n: a.n }; };

// B1: efeito fixo do local de votação
{
  const CRIT = zBilateral(0.05 / 56);
  const gLocal = (s) => `${s.uf}|${s.municipio}|${s.zona}|${s.local2}`;
  const nLoc = new Map(); for (const s of E) nLoc.set(gLocal(s), (nLoc.get(gLocal(s)) ?? 0) + 1);
  const L = E.filter((s) => nLoc.get(gLocal(s)) > 1);
  const linhas = [];
  for (const uf of ['brasil', ...ufs]) {
    const l = uf === 'brasil' ? L : L.filter((s) => s.uf === uf);
    const lm = uf === 'brasil' ? E : E.filter((s) => s.uf === uf);
    const o = { uf };
    for (const f of [13, 22]) { o[`local${f}`] = dDe(e2(l, gLocal, f)); o[`mun${f}`] = dDe(e2(lm, (s) => s.mun, f)); }
    linhas.push(o);
  }
  const passa = linhas.flatMap((o) => [13, 22].filter((f) => Math.abs(o[`local${f}`].t) >= CRIT).map((f) => `${o.uf} ${f}`));
  const regra = (o) => { const dl = o.local13, dm = o.mun13;
    if (Math.abs(dl.t) < 1.96 && Math.abs(dl.d) <= 0.5 * Math.abs(dm.d)) return 'explicado por perfil entre locais';
    if (Math.sign(dl.d) === Math.sign(dm.d) && Math.abs(dl.d) >= 0.5 * Math.abs(dm.d) && Math.abs(dl.t) >= CRIT) return 'persiste dentro do local';
    return 'inconclusivo'; };
  res.B1 = { secoes: L.length, locaisUnicosFora: E.length - L.length, locais: new Set(L.map(gLocal)).size, limiar: r2(CRIT), passam: passa,
    sp: { ...linhas.find((o) => o.uf === 'sp'), leitura: regra(linhas.find((o) => o.uf === 'sp')) },
    pr: { ...linhas.find((o) => o.uf === 'pr'), leitura: regra(linhas.find((o) => o.uf === 'pr')) },
    brasil: linhas.find((o) => o.uf === 'brasil'), porUf: linhas };
  log(`B1: SP local t ${res.B1.sp.local13.t} (mun ${res.B1.sp.mun13.t}) → ${res.B1.sp.leitura}; PR local t ${res.B1.pr.local13.t} (mun ${res.B1.pr.mun13.t}) → ${res.B1.pr.leitura}; passam ${passa.join(', ')}`);
}

// B2: vias separadas
{
  const CRIT = zBilateral(0.05 / 6);
  const X3 = (s) => [s.dpb / s.c1, s.dsb / s.c1, s.dpg / s.c1, s.out1 / s.c1, s.bn1 / s.c1];
  res.B2 = { limiar: r2(CRIT) };
  for (const uf of ['brasil', 'sp', 'pr']) {
    const l = uf === 'brasil' ? E : E.filter((s) => s.uf === uf);
    const a = e2(l, (s) => s.mun, 13, X3);
    const sb = dDe(a, 1, 0), pg = dDe(a, 2, 0);
    res.B2[uf] = { dSb: sb, dPg: pg, passaSb: Math.abs(sb.t) >= CRIT, passaPg: Math.abs(pg.t) >= CRIT,
      deltaSb: E.filter((s) => uf === 'brasil' || s.uf === uf).reduce((acc, s) => acc + s.dsb, 0), deltaPg: E.filter((s) => uf === 'brasil' || s.uf === uf).reduce((acc, s) => acc + s.dpg, 0) };
  }
  log(`B2: ${['brasil', 'sp', 'pr'].map((u) => `${u} sb ${res.B2[u].dSb.d} (t ${res.B2[u].dSb.t}) pg ${res.B2[u].dPg.d} (t ${res.B2[u].dPg.t})`).join('; ')}`);
}

// ---------- 2022 ----------
async function* linhasCsv(arq) { let cab = null; for await (const l of createInterface({ input: createReadStream(arq), crlfDelay: Infinity })) { if (!l) continue; const c = l.split(';'); if (!cab) { cab = c; continue; } yield Object.fromEntries(cab.map((k, i) => [k, c[i]])); } }
const ufs22 = UFS22.filter((uf) => existsSync(path.join(H13, `secoes-${uf}-2022-diario.csv`)) && existsSync(path.join(H13, 'sul2022', `bu2022-${uf}.csv`)));
res.ufs2022Usadas = ufs22;
const sec22 = new Map();
for (const uf of ufs22) {
  for await (const r of linhasCsv(path.join(H13, `secoes-${uf}-2022-diario.csv`))) {
    const g = (t) => ({ votos: Number(r[`votos_${t}`]), v1: Number(r[`v1_${t}`]), v2: Number(r[`v2_${t}`]), v3: Number(r[`v3m_${t}`]) + Number(r[`v3s_${t}`]), sem: Number(r[`v2_${t}`]) + Number(r[`v3m_${t}`]) + Number(r[`v3s_${t}`]), erro: r[`erro_${t}`] && r[`erro_${t}`] !== '0' && r[`erro_${t}`] !== '' });
    sec22.set(r.id, { id: r.id, uf, d1: g(1), d2: g(2) });
  }
  for await (const r of linhasCsv(path.join(H13, 'sul2022', `bu2022-${uf}.csv`))) {
    const s = sec22.get(r.id); if (!s) continue;
    s[`bu${r.turno}`] = { aptos: Number(r.aptos), comp: Number(r.comp), compBio: Number(r.compBio), lib: Number(r.lib), v13: Number(r.v13), v22: Number(r.v22), local: r.local };
  }
}
log(`2022: ${sec22.size} seções (${ufs22.join(', ')})`);
// brancos, nulos e eliminados do 1º turno de 2022 (Presidente)
{
  const zip = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'votacao_secao', 'votacao_secao_2022_BR.zip');
  const U = new Set(ufs22.map((u) => u.toUpperCase()));
  let cab = null;
  for await (const [, l] of linhasZip(zip)) {
    const c = dividirCsv(l);
    if (!cab) { cab = Object.fromEntries(c.map((n, i) => [n, i])); continue; }
    if (c[cab.NR_TURNO] !== '1' || c[cab.CD_CARGO] !== '1' || !U.has(c[cab.SG_UF])) continue;
    const id = `${c[cab.SG_UF].toLowerCase()}/${pad(c[cab.CD_MUNICIPIO], 5)}/${pad(c[cab.NR_ZONA], 4)}/${pad(c[cab.NR_SECAO], 4)}`;
    const s = sec22.get(id); if (!s) continue;
    const nr = c[cab.NR_VOTAVEL], q = Number(c[cab.QT_VOTOS]);
    s.out1 ??= 0; s.bn1 ??= 0; s.vs13 ??= 0; s.vs22 ??= 0;
    if (nr === '95' || nr === '96') s.bn1 += q; else if (nr === '13') s.vs13 += q; else if (nr === '22') s.vs22 += q; else s.out1 += q;
  }
  log('votacao_secao_2022 lido');
}
// pares de 2022 com os filtros do doc 06 e o diário igual ao boletim nos dois turnos
const P22 = []; const excl = { semBu: 0, semVotacao: 0, aptos: 0, comp1: 0, aptosMudam: 0, diarioDiverge: 0, c1Menor20: 0 };
for (const s of sec22.values()) {
  if (!s.bu1 || !s.bu2) { excl.semBu++; continue; }
  if (s.out1 == null) { excl.semVotacao++; continue; }
  if (s.bu2.aptos < 20) { excl.aptos++; continue; }
  if (s.bu1.comp < 10) { excl.comp1++; continue; }
  if (Math.abs(s.bu2.aptos - s.bu1.aptos) > 10) { excl.aptosMudam++; continue; }
  if (s.d1.votos !== s.bu1.comp || s.d2.votos !== s.bu2.comp) { excl.diarioDiverge++; continue; }
  if (s.bu1.comp < 20) { excl.c1Menor20++; continue; }
  const [uf, municipio, zona] = s.id.split('/');
  P22.push({ uf, municipio, zona, mun: `${uf}|${municipio}`, zon: `${uf}|${zona}`, loc: `${uf}|${municipio}|${zona}|${s.bu2.local}`, c1: s.bu1.comp, c2: s.bu2.comp, v13_1: s.bu1.v13, v13_2: s.bu2.v13, v22_1: s.bu1.v22, v22_2: s.bu2.v22,
    dpb: s.d2.v1 - s.d1.v1, dsem: s.d2.sem - s.d1.sem, out1: s.out1, bn1: s.bn1, sem1: s.d1.sem, sem2: s.d2.sem, v2_1: s.d1.v2, v2_2: s.d2.v2, v3_1: s.d1.v3, v3_2: s.d2.v3,
    // boletim de 2022: compBio = com biometria cadastrada (V1 + V3), lib = liberado por código (V3) → por biometria = compBio − lib
    dpbBu: (s.bu2.compBio - s.bu2.lib) - (s.bu1.compBio - s.bu1.lib), dsemBu: (s.bu2.comp - s.bu2.compBio + s.bu2.lib) - (s.bu1.comp - s.bu1.compBio + s.bu1.lib), conferV13: s.vs13 === s.bu1.v13 });
}
res.universo2022 = { secoes: sec22.size, exclusoes: excl, noTeste: P22.length, v13VotacaoIgualBu1t: P22.filter((s) => s.conferV13).length };
const XB22 = (s) => [s.dpb / s.c1, s.dsem / s.c1, s.out1 / s.c1, s.bn1 / s.c1];
const XB22bu = (s) => [s.dpbBu / s.c1, s.dsemBu / s.c1, s.out1 / s.c1, s.bn1 / s.c1];
{
  const CRIT = zBilateral(0.05 / (2 * ufs22.length));
  res.B3 = { limiar: r2(CRIT), testes: 2 * ufs22.length, porUf: {} };
  for (const uf of ufs22) {
    const l22 = P22.filter((s) => s.uf === uf), l26 = E.filter((s) => s.uf === uf);
    const a22 = dDe(mqEfeitoFixo(l22, { y: Y[13], x: XB22, w: (s) => s.c1, grupo: (s) => s.mun, cluster: (s) => s.mun }));
    const a22bu = dDe(mqEfeitoFixo(l22, { y: Y[13], x: XB22bu, w: (s) => s.c1, grupo: (s) => s.mun, cluster: (s) => s.mun }));
    const a26 = dDe(e2(l26, (s) => s.mun));
    const dif = a26.d - a22.d, epd = Math.sqrt(a26.ep ** 2 + a22.ep ** 2), zd = dif / epd;
    let leitura;
    const sinal = Math.sign(a26.d);
    if (Math.sign(a22.d) === sinal && Math.abs(a22.d) >= 0.5 * Math.abs(a26.d) && Math.abs(zd) < CRIT) leitura = 'já existia em 2022';
    else if (Math.abs(zd) >= CRIT && Math.sign(zd) === sinal) leitura = 'novo em 2026';
    else leitura = 'inconclusivo';
    res.B3.porUf[uf] = { secoes2022: l22.length, secoes2026: l26.length, d2022: a22, d2022PeloBoletim: a22bu, d2026: a26, diferenca: { d: r4(dif), ep: r4(epd), z: r2(zd) },
      passa2022: Math.abs(a22.t) >= CRIT, passaDiferenca: Math.abs(zd) >= CRIT, leitura };
    // exploratório (depois de ver SP "explicado" em B1 e "novo em 2026" em B3): o mesmo contraste dentro do local, nos dois anos
    {
      const loc26 = (q) => `${q.uf}|${q.municipio}|${q.zona}|${q.local2}`;
      const so = (l, f) => { const n = new Map(); for (const q of l) n.set(f(q), (n.get(f(q)) ?? 0) + 1); return l.filter((q) => n.get(f(q)) > 1); };
      const b22 = dDe(mqEfeitoFixo(so(l22, (q) => q.loc), { y: Y[13], x: XB22, w: (q) => q.c1, grupo: (q) => q.loc, cluster: (q) => q.mun }));
      const b26 = dDe(e2(so(l26, loc26), loc26));
      const dd = b26.d - b22.d, ee = Math.sqrt(b26.ep ** 2 + b22.ep ** 2);
      res.B3.porUf[uf].exploratorioDentroDoLocal = { d2022: b22, d2026: b26, diferenca: { d: r4(dd), ep: r4(ee), z: r2(dd / ee) } };
    }
    log(`B3 ${uf}: 2022 ${a22.d} (t ${a22.t}); boletim ${a22bu.d} (t ${a22bu.t}); 2026 ${a26.d} (t ${a26.t}); dif z ${r2(zd)} → ${leitura}; dentro do local ${JSON.stringify(res.B3.porUf[uf].exploratorioDentroDoLocal)}`);
  }
}
// N: nível
{
  const CRIT = zBilateral(0.05 / ufs22.length);
  const delta = (lista, sem1, sem2) => {
    const C1 = lista.reduce((a, s) => a + s.c1, 0), C2 = lista.reduce((a, s) => a + s.c2, 0);
    const S1 = lista.reduce((a, s) => a + sem1(s), 0), S2 = lista.reduce((a, s) => a + sem2(s), 0);
    const R1 = S1 / C1, R2 = S2 / C2; const g = new Map();
    for (const s of lista) g.set(s.mun, (g.get(s.mun) ?? 0) + (sem2(s) - R2 * s.c2) / C2 - (sem1(s) - R1 * s.c1) / C1);
    const G = g.size; let v = 0; for (const x of g.values()) v += x * x; v *= G / (G - 1);
    return { d: R2 - R1, ep: Math.sqrt(v), R1, R2, C2 };
  };
  res.N = { limiar: r2(CRIT), porUf: {} };
  for (const uf of ufs22) {
    const l26 = E.filter((s) => s.uf === uf), l22 = P22.filter((s) => s.uf === uf);
    const a = delta(l26, (s) => s.sb1 + s.pg1, (s) => s.sb2 + s.pg2), b = delta(l22, (s) => s.sem1, (s) => s.sem2);
    const z = (a.d - b.d) / Math.sqrt(a.ep ** 2 + b.ep ** 2);
    // calibração: inserção V proporcional a c1 na UF inteira → soma V ao sem digital e ao comparecimento do 2º turno de 2026
    const zDeV = (V) => { const S2 = a.R2 * a.C2 + V, C2 = a.C2 + V; const d = S2 / C2 - a.R1; return (d - b.d) / Math.sqrt(a.ep ** 2 + b.ep ** 2); };
    let vMin = null; for (let V = 1000; V <= 5e6; V = Math.ceil(V * 1.05)) if (zDeV(V) >= CRIT) { vMin = V; break; }
    res.N.porUf[uf] = { delta2026: r4(a.d), ep2026: r4(a.ep), delta2022: r4(b.d), ep2022: r4(b.ep), z: r2(z), passa: Math.abs(z) >= CRIT, menorInsercaoVisivel: vMin, comparecimento2t2026: a.C2,
      parcela2022: { t1: r4(b.R1), t2: r4(b.R2) }, parcela2026: { t1: r4(a.R1), t2: r4(a.R2) } };
    // exploratório (depois de ver que N dispara sem inserção): a diferença por via e o tamanho em eleitores
    const via = (l, f1, f2) => { const C1 = l.reduce((x, q) => x + q.c1, 0), C2 = l.reduce((x, q) => x + q.c2, 0); return r4(l.reduce((x, q) => x + f2(q), 0) / C2 - l.reduce((x, q) => x + f1(q), 0) / C1); };
    const C1_26 = l26.reduce((x, q) => x + q.c1, 0), C1_22 = l22.reduce((x, q) => x + q.c1, 0), C2_22 = l22.reduce((x, q) => x + q.c2, 0);
    res.N.porUf[uf].exploratorio = {
      viaSemBiometriaNoArquivo: { delta2026: via(l26, (q) => q.sb1, (q) => q.sb2), delta2022: via(l22, (q) => q.v2_1, (q) => q.v2_2) },
      viaManual: { delta2026: via(l26, (q) => q.pg1, (q) => q.pg2), delta2022: via(l22, (q) => q.v3_1, (q) => q.v3_2) },
      variacaoComparecimento: { r2026: r4(a.C2 / C1_26 - 1), r2022: r4(C2_22 / C1_22 - 1) },
      eleitoresAMaisSemDigitalContraPadrao2022: Math.round((a.d - b.d) * a.C2),
    };
    log(`N ${uf}: Δ2026 ${r4(a.d)} Δ2022 ${r4(b.d)} z ${r2(z)}; menor inserção visível ${vMin}`);
  }
}
await writeFile(path.join(SAIDA, `sinais${ufs22.includes('sp') ? '' : '-sem-sp'}.json`), JSON.stringify(res, null, 1));
const { porUf, ...b1 } = res.B1;
console.log(JSON.stringify({ B1: b1, B2: res.B2, universo2022: res.universo2022, B3: res.B3, N: res.N }, null, 1));
log('fim');
