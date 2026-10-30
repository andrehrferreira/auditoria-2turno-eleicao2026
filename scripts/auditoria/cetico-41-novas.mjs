// Cético, parecer 41, item 2(a): seções novas com comparecimento ≥ 95% (reprodução por caminho próprio e testes de
// método). Agregado por seção; nada de CPF.
//  1. "nova" em 2026 = chave UF/município/zona/seção fora do CEFT 1º turno 2022 ou (fora de DF/ZZ) fora do CEFT 2024;
//     BU 2026 (situação completa, sem Sistema de Apuração), aptos do BU de Presidente; contagem novas/antigas e ≥ 95%.
//  2. Renumeração: zonas e municípios em que quase todas as seções são "novas" (sinal de zona/seção renumerada,
//     e não de seção criada); contagem de ≥ 95% fora dessas zonas.
//  3. Tamanho: taxa de ≥ 95% por faixa de aptos, novas × antigas (a seção pequena oscila mais).
//  4. Mesmo local (2026): comparecimento agregado das novas e das antigas; as mesmas antigas em 2022 (detalhe 2022,
//     Presidente, mesmo turno, mesma chave). Também casando pelo LOCAL de 2022 (CEFT 2022 traz o local): o local de 2026
//     existia em 2022 com o mesmo número?
//  5. Efeito fixo de local, só "nova" (sem perfil), seções sem TTE, ponderado por aptos.
//  6. Linha de base 2022: "nova em 2022" = fora do detalhe 2018 ou (fora de DF/ZZ) do detalhe 2020; ≥ 95% por turno.
// Linhas do CSV com número de colunas diferente do cabeçalho são contadas (separador ';' dentro de aspas).
// Uso: node --max-old-space-size=8000 scripts/auditoria/cetico-41-novas.mjs
import { readdirSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { entradasZip, linhasBrutas } from './contagem-zip.mjs';
import { linhasZip } from './seguranca-h27-lib.mjs';
import { SAIDA } from './cetico-41-lib.mjs';

const DA = path.join(DIR_DADOS, 'raw', 'dadosabertos');
const K = (uf, m, z, s) => `${String(uf).toLowerCase()}/${String(Number(m)).padStart(5, '0')}/${String(Number(z)).padStart(4, '0')}/${String(Number(s)).padStart(4, '0')}`;
const fora = (k) => k.startsWith('zz/') || k.startsWith('df/');
const pct = (a, b) => (b ? +(100 * a / b).toFixed(3) : null);
// Padronização direta por tamanho (faixas de 25 aptos): quantas novas teriam ≥ 95% se, em cada faixa, tivessem a taxa
// das antigas. Faixa sem antiga: usa a taxa das antigas da faixa vizinha de baixo (conservador para cima não se aplica).
function padroniza(L) {
  const b = new Map();
  for (const x of L) { const f = Math.min(Math.floor(x.a / 25), 24); const o = b.get(f) ?? b.set(f, { n: 0, nGe: 0, a: 0, aGe: 0 }).get(f); if (x.nova) { o.n++; if (x.ge) o.nGe++; } else { o.a++; if (x.ge) o.aGe++; } }
  let obs = 0; let esp = 0; let semBase = 0;
  for (const o of b.values()) { obs += o.nGe; if (o.a >= 50) esp += o.n * o.aGe / o.a; else semBase += o.n; }
  return { observadas: obs, esperadasComTaxaDasAntigas: +esp.toFixed(1), razao: esp ? +(obs / esp).toFixed(1) : null, novasEmFaixaSemBase: semBase };
}
const t0 = Date.now(); const log = (...a) => console.error(((Date.now() - t0) / 1000).toFixed(0) + 's', ...a);

async function ceft(pasta) {
  const s = new Set(); const loc = new Map();
  for (const n of readdirSync(path.join(DA, 'correspondencias', pasta)).filter((x) => x.startsWith('CEFT_'))) {
    for await (const r of linhasZip(path.join(DA, 'correspondencias', pasta, n))) {
      const k = K(r.SG_UF, r.CD_MUNICIPIO, r.NR_ZONA, r.NR_SECAO); s.add(k);
      if (r.NR_LOCAL_VOTACAO) loc.set(k, Number(r.NR_LOCAL_VOTACAO));
    }
  }
  return { s, loc };
}
async function detalhe(ano, soChaves) {
  const zip = path.join(DA, 'detalhe_votacao_secao', `detalhe_votacao_secao_${ano}.zip`);
  const ents = (await entradasZip(zip)).filter((e) => /\.csv$/i.test(e.nome));
  const usar = ents.some((e) => /BRASIL/i.test(e.nome)) ? ents.filter((e) => /BRASIL/i.test(e.nome)) : ents;
  const chaves = new Set(); const t = { 1: new Map(), 2: new Map() }; let tortas = 0; let n = 0;
  for (const e of usar) {
    let col = null; let nc = 0;
    for await (const c of linhasBrutas(zip, e)) {
      if (!col) { col = Object.fromEntries(c.map((x, i) => [x, i])); nc = c.length; continue; }
      n++;
      if (c.length !== nc) { tortas++; continue; }
      if (c[col.SG_UF] === 'ZZ' && ano === 2020) continue;
      const k = K(c[col.SG_UF], c[col.CD_MUNICIPIO], c[col.NR_ZONA], c[col.NR_SECAO]);
      chaves.add(k);
      if (soChaves || c[col.CD_CARGO] !== '1') continue;
      const m = t[c[col.NR_TURNO]]; if (!m) continue;
      const v = m.get(k) ?? m.set(k, { a: 0, c: 0 }).get(k);
      v.a += Number(c[col.QT_APTOS]); v.c += Number(c[col.QT_COMPARECIMENTO]);
    }
  }
  return { chaves, t, tortas, linhas: n, entradas: usar.map((e) => e.nome) };
}

log('CEFT'); const c22 = await ceft('2022-1t'); const c24 = await ceft('2024-1t');
log('detalhe 2022'); const d22 = await detalhe(2022, false);
log('detalhe 2020/2018'); const d20 = await detalhe(2020, true); const d18 = await detalhe(2018, true);
const nova26 = (k) => !c22.s.has(k) || (!fora(k) && !c24.s.has(k));
const nova22 = (k) => !d18.chaves.has(k) || (!fora(k) && !d20.chaves.has(k));

log('banco');
const { db, fonte } = await abrirLeitura();
const S = { 1: new Map(), 2: new Map() };
for (const r of db.prepare(`SELECT s.turno, s.uf, s.municipio, s.zona, s.secao, s.local, s.comparecimento c, e.aptos a, e.aptos_tte tte
  FROM secao s JOIN secao_eleicao e USING (turno, uf, municipio, zona, secao)
  WHERE s.situacao = 'completa' AND s.tipo_arquivo NOT LIKE 'sa%' AND e.eleicao IN (6257, 6258)`).iterate()) {
  if (!r.a) continue;
  const k = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
  S[r.turno].set(k, { k, loc: `${r.uf}/${r.municipio}/${r.zona}/${r.local}`, c: r.c, a: r.a, tte: r.tte ?? 0, nova: nova26(k) });
}
db.close();

const R = { fonte, fontes: { ceft2022: c22.s.size, ceft2024: c24.s.size, detalhe2022: d22.chaves.size, detalhe2020: d20.chaves.size, detalhe2018: d18.chaves.size,
  linhasTortas: { 2022: d22.tortas, 2020: d20.tortas, 2018: d18.tortas } } };
const ge = (x) => x.c / x.a >= 0.95;
const tx = (a) => pct(a.reduce((s, x) => s + x.c, 0), a.reduce((s, x) => s + x.a, 0));
for (const t of [1, 2]) {
  const r = {}; const L = [...S[t].values()];
  const N = L.filter((x) => x.nova); const A = L.filter((x) => !x.nova);
  r.base = { novas: N.length, antigas: A.length, txNovas: tx(N), txAntigas: tx(A), ge95Novas: N.filter(ge).length, ge95Antigas: A.filter(ge).length };
  // 2. renumeração por zona
  const z = new Map();
  for (const x of L) { const id = x.k.split('/').slice(0, 1).concat(x.k.split('/')[2]).join('/'); const o = z.get(id) ?? z.set(id, { n: 0, nov: 0, ge: 0 }).get(id); o.n++; if (x.nova) o.nov++; if (x.nova && ge(x)) o.ge++; }
  const zonasQuaseTodasNovas = [...z.entries()].filter(([, o]) => o.n >= 20 && o.nov / o.n >= 0.9);
  r.renumeracao = { zonas: z.size, zonasComNovas90: zonasQuaseTodasNovas.length, secoesNelas: zonasQuaseTodasNovas.reduce((s, [, o]) => s + o.n, 0),
    novasNelas: zonasQuaseTodasNovas.reduce((s, [, o]) => s + o.nov, 0), ge95NovasNelas: zonasQuaseTodasNovas.reduce((s, [, o]) => s + o.ge, 0),
    lista: zonasQuaseTodasNovas.slice(0, 40).map(([id, o]) => `${id} ${o.nov}/${o.n}`) };
  const zset = new Set(zonasQuaseTodasNovas.map(([id]) => id));
  const zid = (x) => `${x.k.split('/')[0]}/${x.k.split('/')[2]}`;
  const N2 = N.filter((x) => !zset.has(zid(x))); const A2 = A.filter((x) => !zset.has(zid(x)));
  r.semZonasRenumeradas = { novas: N2.length, ge95Novas: N2.filter(ge).length, pctNovas: pct(N2.filter(ge).length, N2.length), antigas: A2.length, ge95Antigas: A2.filter(ge).length, pctAntigas: pct(A2.filter(ge).length, A2.length) };
  // 3. tamanho
  const fx = (a) => (a < 50 ? '<50' : a < 100 ? '50-99' : a < 150 ? '100-149' : a < 200 ? '150-199' : a < 300 ? '200-299' : a < 400 ? '300-399' : '400+');
  const tam = {};
  for (const x of L) { const o = (tam[fx(x.a)] ??= { novas: 0, novasGe: 0, antigas: 0, antigasGe: 0 }); if (x.nova) { o.novas++; if (ge(x)) o.novasGe++; } else { o.antigas++; if (ge(x)) o.antigasGe++; } }
  for (const o of Object.values(tam)) { o.pctNovas = pct(o.novasGe, o.novas); o.pctAntigas = pct(o.antigasGe, o.antigas); o.razao = o.antigasGe ? +((o.novasGe / o.novas) / (o.antigasGe / o.antigas)).toFixed(1) : null; }
  // padronização direta: ≥95% esperado nas novas se tivessem, em cada faixa de tamanho, a taxa das antigas
  r.tamanho = tam;
  r.novasEsperadasPelaTaxaDasAntigasPorTamanho = +Object.values(tam).reduce((s, o) => s + (o.antigas ? o.novas * o.antigasGe / o.antigas : 0), 0).toFixed(1);
  r.padronizadoTamanho25 = padroniza(L.map((x) => ({ a: x.a, nova: x.nova, ge: ge(x) })));
  r.padronizadoTamanho25SemTTE = padroniza(L.filter((x) => x.tte === 0).map((x) => ({ a: x.a, nova: x.nova, ge: ge(x) })));
  // 4. mesmo local
  const pl = new Map();
  for (const x of L) (pl.get(x.loc) ?? pl.set(x.loc, { n: [], a: [] }).get(x.loc))[x.nova ? 'n' : 'a'].push(x);
  const mis = [...pl.entries()].filter(([, v]) => v.n.length && v.a.length);
  const Nm = mis.flatMap(([, v]) => v.n); const Am = mis.flatMap(([, v]) => v.a);
  const A22 = Am.map((x) => ({ x, v: d22.t[t].get(x.k) })).filter((o) => o.v && o.v.a > 0);
  // o local de 2026 tinha o mesmo número em 2022? (antigas: local do CEFT 2022 da mesma chave)
  let mesmoLocal = 0; let outroLocal = 0; let semLocal = 0;
  for (const x of Am) { const l22 = c22.loc.get(x.k); if (l22 === undefined) semLocal++; else if (l22 === Number(x.loc.split('/')[3])) mesmoLocal++; else outroLocal++; }
  r.locaisMistos = { locais: mis.length, novas: Nm.length, antigas: Am.length, txNovas: tx(Nm), txAntigas: tx(Am), ge95Novas: Nm.filter(ge).length, ge95Antigas: Am.filter(ge).length,
    antigasCom2022: A22.length, tx2022: pct(A22.reduce((s, o) => s + o.v.c, 0), A22.reduce((s, o) => s + o.v.a, 0)), ge95Em2022: A22.filter((o) => o.v.c / o.v.a >= 0.95).length,
    antigasLocal2022: { mesmoNumero: mesmoLocal, outroNumero: outroLocal, semLocal } };
  // locais mistos, só nas antigas que estavam no MESMO local em 2022
  const AmMesmo = Am.filter((x) => c22.loc.get(x.k) === Number(x.loc.split('/')[3]));
  const A22m = AmMesmo.map((x) => ({ x, v: d22.t[t].get(x.k) })).filter((o) => o.v && o.v.a > 0);
  r.locaisMistos.soAntigasNoMesmoLocal = { secoes: A22m.length, tx2022: pct(A22m.reduce((s, o) => s + o.v.c, 0), A22m.reduce((s, o) => s + o.v.a, 0)), tx2026: tx(A22m.map((o) => o.x)), ge95Em2022: A22m.filter((o) => o.v.c / o.v.a >= 0.95).length, ge95Em2026: A22m.filter((o) => ge(o.x)).length };
  // 5. efeito fixo de local, só "nova", sem TTE
  let sxy = 0; let sxx = 0; let nObs = 0;
  for (const [, v] of pl) {
    const g = [...v.n, ...v.a].filter((x) => x.tte === 0); if (g.length < 2) continue;
    const W = g.reduce((s, x) => s + x.a, 0); const mx = g.reduce((s, x) => s + x.a * (x.nova ? 1 : 0), 0) / W; const my = g.reduce((s, x) => s + x.c, 0) / W;
    for (const x of g) { const dx = (x.nova ? 1 : 0) - mx; const dy = x.c / x.a - my; sxy += x.a * dx * dy; sxx += x.a * dx * dx; nObs++; }
  }
  r.efeitoFixoSoNova = { observacoes: nObs, coefPontos: +(100 * sxy / sxx).toFixed(2) };
  R[`${t}t`] = r;
}
// 6. 2022
for (const t of [1, 2]) {
  const L = [...d22.t[t].entries()].filter(([, v]) => v.a > 0).map(([k, v]) => ({ k, ...v, nova: nova22(k) }));
  const N = L.filter((x) => x.nova); const A = L.filter((x) => !x.nova);
  const g = (a) => a.filter((x) => x.c / x.a >= 0.95).length;
  const em26N = N.map((x) => S[t].get(x.k)).filter(Boolean); const em26A = A.map((x) => S[t].get(x.k)).filter(Boolean);
  R[`h2022_${t}t`] = { novas: N.length, antigas: A.length, ge95Novas: g(N), ge95Antigas: g(A), razao: +((g(N) / N.length) / (g(A) / A.length)).toFixed(1),
    padronizadoTamanho25: padroniza(L.map((x) => ({ a: x.a, nova: x.nova, ge: x.c / x.a >= 0.95 }))),
    aptosMedios: { novas: +(N.reduce((s, x) => s + x.a, 0) / N.length).toFixed(1), antigas: +(A.reduce((s, x) => s + x.a, 0) / A.length).toFixed(1) },
    em2026: { novas: em26N.length, ge95Novas: em26N.filter(ge).length, antigas: em26A.length, ge95Antigas: em26A.filter(ge).length } };
}
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, 'novas.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
log('fim');
