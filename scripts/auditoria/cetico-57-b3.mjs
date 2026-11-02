// Parecer cético 57: B3 do doc 30 (E2 em 2022 × 2026) refeito com código próprio para PR e SP, e o teste benigno do revisor
// para o PR: a diferença 2026 − 2022 resiste a controles de perfil do eleitorado (idade, escolaridade, biometria), medidos
// no perfil público de cada ano? Lê: secoes-<uf>-2022-diario.csv e sul2022/bu2022-<uf>.csv (frente H13), votacao_secao_2022_BR.zip
// (brancos, nulos e outros do 1º turno), perfil_eleitor_secao_<ano>_<UF>.zip e pares-banco.csv. Não importa scripts do autor.
// Uso: node --max-old-space-size=8192 scripts/auditoria/cetico-57-b3.mjs
// Saída: data/parsed/auditoria/cetico/57/b3.json
import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DIR_DADOS } from '../../src/config.js';
import { dividirCsv, linhasZip, pad } from './forense-lib.mjs';
import { ids, lerPares2026, mqfe, r2, r4 } from './cetico-57-lib.mjs';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', '57');
await mkdir(SAIDA, { recursive: true });
const H13 = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h13-v2');
const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const UFS = ['pr', 'sp'];
async function* csv(arq) { let cab = null; for await (const l of createInterface({ input: createReadStream(arq), crlfDelay: Infinity })) { if (!l) continue; const c = l.split(';'); if (!cab) { cab = c; continue; } yield Object.fromEntries(cab.map((k, i) => [k, c[i]])); } }

// perfil por seção: parcela 60+, 16–24, escolaridade baixa, biometria
async function perfil(ano, uf) {
  const m = new Map();
  const arq = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'perfil_eleitor_secao', `perfil_eleitor_secao_${ano}_${uf.toUpperCase()}.zip`);
  let cab = null;
  for await (const [, l] of linhasZip(arq)) {
    const c = dividirCsv(l);
    if (!cab) { cab = Object.fromEntries(c.map((x, i) => [x.replace(/"/g, ''), i])); continue; }
    const k = `${uf}/${pad(c[cab.CD_MUNICIPIO], 5)}/${pad(c[cab.NR_ZONA], 4)}/${pad(c[cab.NR_SECAO], 4)}`;
    const q = Number(c[cab.QT_ELEITORES ?? cab.QT_ELEITORES_PERFIL]), b = Number(c[cab.QT_ELEITORES_BIOMETRIA]);
    const ida = Number(String(c[cab.DS_FAIXA_ETARIA]).match(/\d+/)?.[0] ?? 0);
    const esc = String(c[cab.DS_GRAU_ESCOLARIDADE]);
    const g = m.get(k) ?? { e: 0, b: 0, i60: 0, i1624: 0, eb: 0 };
    g.e += q; g.b += b; if (ida >= 60) g.i60 += q; if (ida >= 16 && ida <= 21) g.i1624 += q; if (/ANALFABETO|ESCREVE|FUNDAMENTAL INCOMPLETO/i.test(esc)) g.eb += q;
    m.set(k, g);
  }
  return m;
}

// ---- 2022 ----
const s22 = new Map();
for (const uf of UFS) {
  for await (const r of csv(path.join(H13, `secoes-${uf}-2022-diario.csv`))) {
    const g = (t) => ({ votos: +r[`votos_${t}`], v1: +r[`v1_${t}`], sem: +r[`v2_${t}`] + +r[`v3m_${t}`] + +r[`v3s_${t}`] });
    s22.set(r.id, { id: r.id, uf, d1: g(1), d2: g(2) });
  }
  for await (const r of csv(path.join(H13, 'sul2022', `bu2022-${uf}.csv`))) { const s = s22.get(r.id); if (s) s[`b${r.turno}`] = { aptos: +r.aptos, comp: +r.comp, v13: +r.v13, v22: +r.v22, local: r.local }; }
}
log(`2022: ${s22.size} seções`);
{
  const zip = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'votacao_secao', 'votacao_secao_2022_BR.zip');
  let cab = null; const U = new Set(UFS.map((u) => u.toUpperCase()));
  for await (const [, l] of linhasZip(zip)) {
    const c = dividirCsv(l);
    if (!cab) { cab = Object.fromEntries(c.map((x, i) => [x.replace(/"/g, ''), i])); continue; }
    if (c[cab.NR_TURNO] !== '1' || c[cab.CD_CARGO] !== '1' || !U.has(c[cab.SG_UF])) continue;
    const s = s22.get(`${c[cab.SG_UF].toLowerCase()}/${pad(c[cab.CD_MUNICIPIO], 5)}/${pad(c[cab.NR_ZONA], 4)}/${pad(c[cab.NR_SECAO], 4)}`); if (!s) continue;
    const nr = c[cab.NR_VOTAVEL], q = +c[cab.QT_VOTOS];
    s.bn1 ??= 0; s.out1 ??= 0;
    if (nr === '95' || nr === '96') s.bn1 += q; else if (nr !== '13' && nr !== '22') s.out1 += q;
  }
  log('votacao_secao_2022 lido');
}
const excl = { semBu: 0, semVot: 0, aptos: 0, mudam: 0, diario: 0, c1: 0 };
const P22 = [];
for (const s of s22.values()) {
  if (!s.b1 || !s.b2) { excl.semBu++; continue; } if (s.out1 == null) { excl.semVot++; continue; }
  if (s.b2.aptos < 20) { excl.aptos++; continue; } if (Math.abs(s.b2.aptos - s.b1.aptos) > 10) { excl.mudam++; continue; }
  if (s.d1.votos !== s.b1.comp || s.d2.votos !== s.b2.comp) { excl.diario++; continue; } if (s.b1.comp < 20) { excl.c1++; continue; }
  const [uf, mu, zo] = s.id.split('/');
  P22.push({ k: s.id, uf, mun: `${uf}|${mu}`, loc: `${uf}|${mu}|${zo}|${s.b2.local}`, c1: s.b1.comp, y: (s.b2.v13 - s.b1.v13) / s.b1.comp,
    c2: s.b2.comp, sem1: s.d1.sem, sem2: s.d2.sem, pb: (s.d2.v1 - s.d1.v1) / s.b1.comp, sem: (s.d2.sem - s.d1.sem) / s.b1.comp, out: s.out1 / s.b1.comp, bn: s.bn1 / s.b1.comp });
}
const { L: P26all } = await lerPares2026();
const P26 = P26all.filter((s) => UFS.includes(s.uf)).map((s) => ({ c2: s.c2, sem1: s.sb1 + s.pg1, sem2: s.sb2 + s.pg2, k: s.k, uf: s.uf, mun: s.mun, loc: s.loc, c1: s.c1, y: (s.v13_2 - s.v13_1) / s.c1,
  pb: (s.pb2 - s.pb1) / s.c1, sem: (s.sb2 - s.sb1 + s.pg2 - s.pg1) / s.c1, out: s.out1 / s.c1, bn: s.bn1 / s.c1 }));

function e2(lista, grupo, extras = []) {
  const idx = Int32Array.from({ length: lista.length }, (_, i) => i);
  const col = (f) => Float64Array.from(lista, f);
  const X = [col((s) => s.pb), col((s) => s.sem), col((s) => s.out), col((s) => s.bn), ...extras.map((c) => col((s) => s[c]))];
  const a = mqfe(idx, col((s) => s.y), X, col((s) => s.c1), ids(lista, grupo), ids(lista, (s) => s.mun));
  return { d: a.d, ep: a.ep, t: a.t, n: a.n };
}
const so = (l, f) => { const m = new Map(); for (const s of l) m.set(f(s), (m.get(f(s)) ?? 0) + 1); return l.filter((s) => m.get(f(s)) > 1); };
const dif = (a, b) => { const d = a.d - b.d, ep = Math.hypot(a.ep, b.ep); return { d: r4(d), z: r2(d / ep) }; };
const f = (a) => ({ d: r4(a.d), ep: r4(a.ep), t: r2(a.t), n: a.n });
const out = { geradoEm: new Date().toISOString(), exclusoes2022: excl, porUf: {} };
for (const uf of UFS) {
  const l22 = P22.filter((s) => s.uf === uf), l26 = P26.filter((s) => s.uf === uf);
  const a22 = e2(l22, (s) => s.mun), a26 = e2(l26, (s) => s.mun);
  const b22 = e2(so(l22, (s) => s.loc), (s) => s.loc), b26 = e2(so(l26, (s) => s.loc), (s) => s.loc);
  out.porUf[uf] = { secoes2022: l22.length, secoes2026: l26.length, d2022: f(a22), d2026: f(a26), diferenca: dif(a26, a22),
    dentroDoLocal: { d2022: f(b22), d2026: f(b26), diferenca: dif(b26, b22) } };
  log(`${uf}: ${JSON.stringify(out.porUf[uf])}`);
}
// detector N (exploratório do autor): variação entre turnos da parcela sem digital, 2026 − 2022, em eleitores do 2º turno de 2026
out.N = {};
for (const uf of UFS) {
  const dl = (l) => { const C1 = l.reduce((a, s) => a + s.c1, 0), C2 = l.reduce((a, s) => a + s.c2, 0); return { d: l.reduce((a, s) => a + s.sem2, 0) / C2 - l.reduce((a, s) => a + s.sem1, 0) / C1, C2 }; };
  const a = dl(P26.filter((s) => s.uf === uf)), b = dl(P22.filter((s) => s.uf === uf));
  out.N[uf] = { delta2026: r4(a.d), delta2022: r4(b.d), eleitores: Math.round((a.d - b.d) * a.C2) };
  log(`N ${uf}: ${JSON.stringify(out.N[uf])}`);
}
// teste benigno do PR: controles de perfil de cada ano
{
  const pf = { 2022: await perfil(2022, 'pr'), 2026: await perfil(2026, 'pr') };
  log('perfis do PR lidos');
  const ligar = (l, m) => l.map((s) => { const g = m.get(s.k); return g && g.e >= 50 ? { ...s, p60: g.i60 / g.e, p1624: g.i1624 / g.e, escB: g.eb / g.e, bio: g.b / g.e, perfilOk: g.e >= 0.5 * s.c1 / 0.9 } : null; }).filter(Boolean);
  const l22 = ligar(P22.filter((s) => s.uf === 'pr'), pf[2022]), l26 = ligar(P26.filter((s) => s.uf === 'pr'), pf[2026]);
  const ESP = { nenhuma: [], p60: ['p60'], escolaridadeBaixa: ['escB'], biometria: ['bio'], p1624: ['p1624'], quatro: ['p60', 'escB', 'bio', 'p1624'] };
  out.prCovariaveis = { secoes2022: l22.length, secoes2026: l26.length, especificacoes: {} };
  for (const [nome, ex] of Object.entries(ESP)) {
    const a22 = e2(l22, (s) => s.mun, ex), a26 = e2(l26, (s) => s.mun, ex);
    out.prCovariaveis.especificacoes[nome] = { d2022: f(a22), d2026: f(a26), diferenca: dif(a26, a22) };
    log(`PR ${nome}: ${JSON.stringify(out.prCovariaveis.especificacoes[nome])}`);
  }
}
await writeFile(path.join(SAIDA, 'b3.json'), JSON.stringify(out, null, 1));
log('fim');
