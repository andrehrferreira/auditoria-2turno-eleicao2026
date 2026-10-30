// Demógrafo (H01, parecer cético 41 item 2b): os votantes de 85 a 99 anos quase dobraram do 1º turno de 2022 para o de 2026,
// com os aptos estáveis ou em queda. Este script confere e testa o salto, em agregado e sem CPF:
//   (a) série oficial do comparecimento por faixa de idade (perfil_comparecimento_abstencao do TSE, 2014, 2018, 2022, 2026),
//       aptos, votantes e taxa, Brasil sem exterior, 1º e 2º turno;
//   (b) população: Censo 2022 (IBGE, tabela 9514, idade simples por UF) e projeção da coorte para 2026: teto sem mortes
//       (a população de 4 anos a menos no Censo) e estimativa com a mortalidade do Registro Civil (tabela 2654, 2023–2024);
//   (c) onde o salto se concentra: UF (com e sem limpeza do cadastro), município (contra o teto do Censo) e zona;
//   (d) o perfil do salto por idade (60–64 até 100+), para separar efeito de idade (conjuntura) de efeito de cadastro;
//   (e) biometria: votantes de 80–89 e 90–99 que, zona a zona, só podem ter votado com título sem biometria (limite inferior,
//       perfil do eleitorado por seção, jul/2026) e o comparecimento dos idosos por faixa de "sem biometria" da zona.
// Pré-requisitos: demografo-baixar-tse.mjs (pca 2014/2018/2022), demografo-baixar-ibge.mjs, demografo-perfil.mjs.
// Uso: node --max-old-space-size=6000 scripts/auditoria/demografo-85-99-salto.mjs
// Saídas: data/parsed/auditoria/demografo/salto-85-99-{resumo.json,uf.tsv,municipios.tsv}
import { readFileSync, readdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { entradasZip, linhasBrutas } from './contagem-zip.mjs';

const OUT = path.join(DIR_DADOS, 'parsed', 'auditoria', 'demografo');
const IBGE = path.join(DIR_DADOS, 'raw', 'externos', 'ibge');
const PCA = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'perfil_comparecimento_abstencao');
const pct = (a, b) => (b ? +(100 * a / b).toFixed(3) : null);
const p4 = (x) => String(Number(x)).padStart(4, '0');
const p5 = (x) => String(Number(x)).padStart(5, '0');
const log = (...a) => console.error(new Date().toISOString().slice(11, 19), ...a);

// faixas usadas no documento (códigos CD_FAIXA_ETARIA do TSE)
function banda(c) {
  if (c === 1600 || c === 1700) return '16-17';
  if (c >= 1800 && c <= 2124) return '18-24';
  if (c >= 2529 && c <= 5559) return '25-59';
  const m = { 6064: '60-64', 6569: '65-69', 7074: '70-74', 7579: '75-79', 8084: '80-84', 8589: '85-89', 9094: '90-94', 9599: '95-99', 9999: '100+' };
  return m[c] ?? 'invalida';
}
const BANDAS = ['16-17', '18-24', '25-59', '60-64', '65-69', '70-74', '75-79', '80-84', '85-89', '90-94', '95-99', '100+', 'invalida'];
const ALVO = ['75-79', '80-84', '85-89', '90-94', '95-99', '100+'];

// ---------- (a) perfil de comparecimento, 4 eleições
const br = new Map(); const uf = new Map(); const mun = new Map(); const zona = new Map(); const meta = {};
const soma = (m, k, ap, cp) => { const v = m.get(k) ?? m.set(k, [0, 0]).get(k); v[0] += ap; v[1] += cp; };
for (const ano of [2014, 2018, 2022, 2026]) {
  const zip = path.join(PCA, `perfil_comparecimento_abstencao_${ano}.zip`);
  const todos = (await entradasZip(zip)).filter((e) => /\.csv$/i.test(e.nome));
  const porUf = todos.filter((e) => !/BRASIL/i.test(e.nome));
  const ents = porUf.length >= 28 ? porUf : todos.filter((e) => /BRASIL/i.test(e.nome)); // 2018 e 2022 não trazem DF e ZZ por UF
  const geracao = new Set(); const codigos = new Set(); let linhas = 0; let colunaAMais = 0;
  for (const e of ents) {
    let col = null; let nc = 0;
    for await (const c of linhasBrutas(zip, e)) {
      if (!col) { col = Object.fromEntries(c.map((n, i) => [n, i])); nc = c.length; continue; }
      linhas++; if (c.length !== nc) colunaAMais++;
      const t = c[col.NR_TURNO]; const u = c[col.SG_UF];
      geracao.add(`${t}:${c[col.DT_GERACAO]}`);
      if (u === 'ZZ' || u === 'VT') continue;
      const cod = Number(c[col.CD_FAIXA_ETARIA]); codigos.add(`${cod}:${c[col.DS_FAIXA_ETARIA]}`);
      const b = banda(cod); const ap = Number(c[col.QT_APTOS]); const cp = Number(c[col.QT_COMPARECIMENTO]);
      soma(br, `${ano}|${t}|${b}`, ap, cp);
      soma(uf, `${ano}|${t}|${u}|${b}`, ap, cp);
      if (t !== '1' || (ano !== 2022 && ano !== 2026) || !ALVO.includes(b)) continue;
      soma(mun, `${ano}|${u}|${p5(c[col.CD_MUNICIPIO])}|${b}`, ap, cp);
      soma(zona, `${ano}|${u.toLowerCase()}|${p5(c[col.CD_MUNICIPIO])}|${p4(c[col.NR_ZONA])}|${b}`, ap, cp);
    }
  }
  meta[ano] = { arquivos: ents.map((e) => e.nome), linhas, linhasComColunasDiferentes: colunaAMais, geracao: [...geracao].sort(), codigos: [...codigos].sort() };
  log(`pca ${ano} ok (${linhas} linhas)`);
}
const R = { fontes: meta };
const g = (m, k) => m.get(k) ?? [0, 0];
R.serie = {};
for (const ano of [2014, 2018, 2022, 2026]) for (const t of ['1', '2']) for (const b of BANDAS) {
  const [ap, cp] = g(br, `${ano}|${t}|${b}`); if (!ap) continue;
  ((R.serie[b] ??= {})[`${ano}-${t}t`] = { aptos: ap, votantes: cp, taxa: pct(cp, ap) });
}

// ---------- (b) população: Censo 2022 por idade simples (Brasil e UF) e mortalidade do Registro Civil 2023–2024
const UFCOD = { 11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO', 21: 'MA', 22: 'PI', 23: 'CE', 24: 'RN', 25: 'PB', 26: 'PE', 27: 'AL', 28: 'SE', 29: 'BA', 31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP', 41: 'PR', 42: 'SC', 43: 'RS', 50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF' };
const idadeCod = (c) => (c >= 6618 && c <= 6652 ? c - 6618 + 65 : c === 6653 ? 100 : null);
const pop = new Map(); // 'BR' ou UF → idade (65..100) → pessoas
for (const r of JSON.parse(readFileSync(path.join(IBGE, 'censo2022-9514-br-uf-idade-simples.json'), 'utf8')).slice(1)) {
  const a = idadeCod(Number(r.D5C)); if (a === null) continue;
  const lugar = r.NC === '1' ? 'BR' : UFCOD[Number(r.D1C)];
  const m = pop.get(lugar) ?? pop.set(lugar, new Map()).get(lugar); m.set(a, Number(r.V) || 0);
}
const popFaixa = (lugar, a0, a1) => { let s = 0; for (let a = a0; a <= a1; a++) s += pop.get(lugar)?.get(a) ?? 0; return s; };
// óbitos por grupo, média de 2023 e 2024, Brasil e UF (somando municípios); 85–89 = 85+ − 90–94 − 95–99 − 100+
const ob = new Map();
for (const f of ['obitos-2654-2023.json', 'obitos-2654-2024.json']) {
  for (const r of JSON.parse(readFileSync(path.join(IBGE, f), 'utf8')).slice(1)) {
    const u = UFCOD[Number(String(r.D1C).slice(0, 2))]; const v = Number(r.V) || 0;
    for (const lugar of [u, 'BR']) { const m = ob.get(lugar) ?? ob.set(lugar, new Map()).get(lugar); m.set(r.D7C, (m.get(r.D7C) ?? 0) + v / 2); }
  }
}
function taxas(lugar) {
  const o = ob.get(lugar); const q = (c) => o?.get(c) ?? 0;
  const d = { '80-84': q('5979'), '85-89': q('5980') - q('106182') - q('106183') - q('5996'), '90-94': q('106182'), '95-99': q('106183'), '100+': q('5996') };
  const p = { '80-84': popFaixa(lugar, 80, 84), '85-89': popFaixa(lugar, 85, 89), '90-94': popFaixa(lugar, 90, 94), '95-99': popFaixa(lugar, 95, 99), '100+': popFaixa(lugar, 100, 100) };
  return Object.fromEntries(Object.keys(d).map((k) => [k, Math.min(0.9, d[k] / p[k])]));
}
const grupoDe = (a) => (a < 80 ? '80-84' : a < 85 ? '80-84' : a < 90 ? '85-89' : a < 95 ? '90-94' : a < 100 ? '95-99' : '100+');
// 2026, faixa [a0,a1]: teto = Censo nas idades a−4 (sem mortes); vivos = Σ pop(a−4) × Π_{k=0..3} (1 − m(grupo(a−4+k)))
function projeta(lugar, a0, a1) {
  const m = taxas(lugar); let teto = 0; let vivos = 0;
  for (let a = a0; a <= a1; a++) {
    const base = pop.get(lugar)?.get(a - 4) ?? 0; teto += base;
    let s = 1; for (let k = 0; k < 4; k++) s *= 1 - (m[grupoDe(a - 4 + k)] ?? 0); vivos += base * s;
  }
  return { teto, vivos: Math.round(vivos) };
}
const FX = { '75-79': [75, 79], '80-84': [80, 84], '85-89': [85, 89], '90-94': [90, 94], '95-99': [95, 99] };
R.mortalidadeAnualBrasil = Object.fromEntries(Object.entries(taxas('BR')).map(([k, v]) => [k, +(100 * v).toFixed(2)]));
R.populacaoBrasil = {};
for (const [b, [a0, a1]] of Object.entries(FX)) {
  const p22 = popFaixa('BR', a0, a1); const pr = projeta('BR', a0, a1);
  const v22 = g(br, `2022|1|${b}`)[1]; const v26 = g(br, `2026|1|${b}`)[1];
  R.populacaoBrasil[b] = { censo2022: p22, teto2026SemMortes: pr.teto, vivos2026Estimados: pr.vivos, votantes2022_1t: v22, votantes2026_1t: v26, votantesSobrePop2022: pct(v22, p22), votantesSobreVivos2026: pct(v26, pr.vivos), votantesSobreTeto2026: pct(v26, pr.teto), aptos2022: g(br, `2022|1|${b}`)[0], aptos2026: g(br, `2026|1|${b}`)[0] };
}

// ---------- perfil do eleitorado 2026 por seção → zona e UF: aptos e sem biometria de 70–79, 80–89, 90–99
const perfZona = new Map(); const perfUf = new Map();
for (const f of readdirSync(path.join(OUT, 'perfil'))) {
  const L = readFileSync(path.join(OUT, 'perfil', f), 'utf8').trimEnd().split('\n'); const col = L[0].split('\t');
  const ix = Object.fromEntries(col.map((n, i) => [n, i]));
  for (const l of L.slice(1)) {
    const c = l.split('\t'); if (c[0] === 'zz') continue;
    const v = ['f70_79', 'sembio_f70_79', 'f80_89', 'sembio_f80_89', 'f90_99', 'sembio_f90_99', 'f100', 'sembio_f100'].map((n) => Number(c[ix[n]]));
    for (const [m, k] of [[perfZona, `${c[0]}|${c[1]}|${c[2]}`], [perfUf, c[0].toUpperCase()]]) { const a = m.get(k) ?? m.set(k, Array(8).fill(0)).get(k); v.forEach((x, i) => { a[i] += x; }); }
  }
}

// ---------- (c) UF
const UFS = Object.values(UFCOD).sort();
const somaB = (m, pre, bs) => bs.reduce((s, b) => { const v = g(m, `${pre}|${b}`); return [s[0] + v[0], s[1] + v[1]]; }, [0, 0]);
const ufTsv = ['uf\tlimpou_100mais\taptos85_99_2022\tvotantes85_99_2022\taptos85_99_2026\tvotantes85_99_2026\tdelta_votantes_pct\tdelta_aptos_pct\tpop85_99_censo2022\tvivos85_99_2026_est\tteto85_99_2026\tvotantes_sobre_pop2022\tvotantes_sobre_vivos2026\tsembio_90_99_2026_pct\tsembio_80_89_2026_pct\tdelta_votantes_75_84_pct\ttaxa70_74_2022\ttaxa70_74_2026'];
R.uf = {};
const grupos = { limpou: { v22: 0, v26: 0, a22: 0, a26: 0, p22: 0, vivos: 0, v7584_22: 0, v7584_26: 0 }, naoLimpou: { v22: 0, v26: 0, a22: 0, a26: 0, p22: 0, vivos: 0, v7584_22: 0, v7584_26: 0 } };
for (const u of UFS) {
  const [a22, v22] = somaB(uf, `2022|1|${u}`, ['85-89', '90-94', '95-99']); const [a26, v26] = somaB(uf, `2026|1|${u}`, ['85-89', '90-94', '95-99']);
  const c100_22 = g(uf, `2022|1|${u}|100+`)[0]; const c100_26 = g(uf, `2026|1|${u}|100+`)[0];
  const limpou = c100_26 < c100_22;
  const p22 = popFaixa(u, 85, 99); const pr = projeta(u, 85, 99);
  const [, w22] = somaB(uf, `2022|1|${u}`, ['75-79', '80-84']); const [, w26] = somaB(uf, `2026|1|${u}`, ['75-79', '80-84']);
  const pf = perfUf.get(u) ?? Array(8).fill(0);
  const t7022 = g(uf, `2022|1|${u}|70-74`); const t7026 = g(uf, `2026|1|${u}|70-74`);
  const o = { limpou100mais: limpou, aptos100_2022: c100_22, aptos100_2026: c100_26, aptos2022: a22, votantes2022: v22, aptos2026: a26, votantes2026: v26, deltaVotantesPct: pct(v26 - v22, v22), deltaAptosPct: pct(a26 - a22, a22), pop2022: p22, vivos2026Est: pr.vivos, teto2026: pr.teto, votantesSobrePop2022: pct(v22, p22), votantesSobreVivos2026: pct(v26, pr.vivos), semBio90_99: pct(pf[5], pf[4]), semBio80_89: pct(pf[3], pf[2]), deltaVotantes75_84Pct: pct(w26 - w22, w22), taxa70_74_2022: pct(t7022[1], t7022[0]), taxa70_74_2026: pct(t7026[1], t7026[0]) };
  R.uf[u] = o;
  const G = grupos[limpou ? 'limpou' : 'naoLimpou']; G.v22 += v22; G.v26 += v26; G.a22 += a22; G.a26 += a26; G.p22 += p22; G.vivos += pr.vivos; G.v7584_22 += w22; G.v7584_26 += w26;
  ufTsv.push([u, limpou ? 1 : 0, a22, v22, a26, v26, o.deltaVotantesPct, o.deltaAptosPct, p22, pr.vivos, pr.teto, o.votantesSobrePop2022, o.votantesSobreVivos2026, o.semBio90_99, o.semBio80_89, o.deltaVotantes75_84Pct, o.taxa70_74_2022, o.taxa70_74_2026].join('\t'));
}
for (const G of Object.values(grupos)) Object.assign(G, { deltaVotantesPct: pct(G.v26 - G.v22, G.v22), deltaAptosPct: pct(G.a26 - G.a22, G.a22), votantesSobrePop2022: pct(G.v22, G.p22), votantesSobreVivos2026: pct(G.v26, G.vivos), deltaVotantes75_84Pct: pct(G.v7584_26 - G.v7584_22, G.v7584_22) });
R.ufPorLimpeza = grupos;
// Δ% por UF × sem biometria 90–99 (correlação de Pearson, ponderada pelos votantes de 2022)
{
  const xs = UFS.map((u) => [R.uf[u].semBio90_99, R.uf[u].deltaVotantesPct, R.uf[u].votantes2022]);
  const W = xs.reduce((s, x) => s + x[2], 0); const mx = xs.reduce((s, x) => s + x[2] * x[0], 0) / W; const my = xs.reduce((s, x) => s + x[2] * x[1], 0) / W;
  const cov = xs.reduce((s, x) => s + x[2] * (x[0] - mx) * (x[1] - my), 0); const vx = xs.reduce((s, x) => s + x[2] * (x[0] - mx) ** 2, 0); const vy = xs.reduce((s, x) => s + x[2] * (x[1] - my) ** 2, 0);
  R.correlacaoUfSemBioXDelta = +(cov / Math.sqrt(vx * vy)).toFixed(3);
}

// ---------- (c) município: teto do Censo (80–95 em 2022, sem mortes) contra votantes de 85–99 em 2026
const { db } = await abrirLeitura();
const ibgeDe = new Map(db.prepare('SELECT codigo, uf, codigo_ibge, nome FROM municipio').all().map((r) => [`${r.uf.toUpperCase()}|${p5(r.codigo)}`, r]));
const censoMun = new Map(); // ibge → {g80_84, g85_89, g90_94, s95, g95_99}
for (const f of ['censo2022-9514-idade-b.json', 'censo2022-9514-idade-c.json']) {
  for (const r of JSON.parse(readFileSync(path.join(IBGE, f), 'utf8')).slice(1)) {
    const m = censoMun.get(r.D1C) ?? censoMun.set(r.D1C, {}).get(r.D1C);
    const nome = { 49108: 'g80_84', 49109: 'g85_89', 60040: 'g90_94', 6648: 's95', 60041: 'g95_99' }[r.D5C]; if (nome) m[nome] = Number(r.V) || 0;
  }
}
const munTsv = ['uf\tmunicipio_tse\tibge\tnome\tvotantes85_99_2022\tvotantes85_99_2026\taptos85_99_2022\taptos85_99_2026\tteto_censo_80_95\tsembio_90_99_2026_pct'];
const chavesMun = new Set([...mun.keys()].map((k) => k.split('|').slice(1, 3).join('|')));
let acimaTeto = 0; let excessoTeto = 0; const casosTeto = []; const deltas = []; let semIbge = 0;
const perfMun = new Map(); for (const [k, v] of perfZona) { const [u, m] = k.split('|'); const kk = `${u.toUpperCase()}|${m}`; const a = perfMun.get(kk) ?? perfMun.set(kk, Array(8).fill(0)).get(kk); v.forEach((x, i) => { a[i] += x; }); }
for (const km of chavesMun) {
  const [a22, v22] = somaB(mun, `2022|${km}`, ['85-89', '90-94', '95-99']); const [a26, v26] = somaB(mun, `2026|${km}`, ['85-89', '90-94', '95-99']);
  const info = ibgeDe.get(km); const c = info ? censoMun.get(info.codigo_ibge) : null;
  if (!c) semIbge++;
  const teto = c ? (c.g80_84 ?? 0) + (c.g85_89 ?? 0) + (c.g90_94 ?? 0) + (c.s95 ?? 0) : null;
  const pf = perfMun.get(km) ?? Array(8).fill(0);
  if (teto !== null && v26 > teto) { acimaTeto++; excessoTeto += v26 - teto; casosTeto.push({ municipio: `${info.nome}/${km.split('|')[0]}`, votantes2026: v26, teto }); }
  deltas.push({ km, d: v26 - v22, v22, v26, semBio: pct(pf[5], pf[4]) });
  munTsv.push([...km.split('|'), info?.codigo_ibge ?? '', info?.nome ?? '', v22, v26, a22, a26, teto ?? '', pct(pf[5], pf[4])].join('\t'));
}
deltas.sort((x, y) => y.d - x.d);
const totalDelta = deltas.reduce((s, x) => s + x.d, 0);
const acum = (n) => deltas.slice(0, n).reduce((s, x) => s + x.d, 0);
// quantis de sem biometria 90–99 do município (ponderados pelo nº de municípios)
const comSb = deltas.filter((x) => x.semBio !== null).sort((x, y) => x.semBio - y.semBio);
const quintis = [0, 1, 2, 3, 4].map((q) => { const a = comSb.slice(Math.floor(q * comSb.length / 5), Math.floor((q + 1) * comSb.length / 5)); const v22 = a.reduce((s, x) => s + x.v22, 0); const v26 = a.reduce((s, x) => s + x.v26, 0); return { municipios: a.length, semBio90_99De: a[0]?.semBio, semBio90_99Ate: a.at(-1)?.semBio, votantes2022: v22, votantes2026: v26, deltaPct: pct(v26 - v22, v22) }; });
R.municipios = { municipios: chavesMun.size, semCodigoIbge: semIbge, votantes2026AcimaDoTetoCenso: acimaTeto, excessoSomado: excessoTeto, casosAcimaDoTeto: casosTeto.sort((a, b) => (b.votantes2026 - b.teto) - (a.votantes2026 - a.teto)).slice(0, 30),
  deltaTotal: totalDelta, municipiosQueSubiram: deltas.filter((x) => x.d > 0).length, municipiosQueCairam: deltas.filter((x) => x.d < 0).length,
  parcelaDoAumentoNos10Maiores: pct(acum(10), totalDelta), parcelaNos100Maiores: pct(acum(100), totalDelta), parcelaNos1000Maiores: pct(acum(1000), totalDelta),
  maioresAumentos: deltas.slice(0, 15).map((x) => ({ municipio: `${ibgeDe.get(x.km)?.nome}/${x.km.split('|')[0]}`, votantes2022: x.v22, votantes2026: x.v26, semBio90_99: x.semBio })),
  quintisSemBio90_99: quintis };

// ---------- (c, e) zona: mesma chave em 2022 e 2026; limite inferior de votantes sem biometria (2026)
const zonas26 = new Set([...zona.keys()].filter((k) => k.startsWith('2026|')).map((k) => k.split('|').slice(1, 4).join('|')));
const zonas22 = new Set([...zona.keys()].filter((k) => k.startsWith('2022|')).map((k) => k.split('|').slice(1, 4).join('|')));
let pares = 0; let pv22 = 0; let pv26 = 0; let minSem8089 = 0; let zonasSem8089 = 0; let minSem9099 = 0; let zonasSem9099 = 0; let semPerfil = 0;
const binsZona = new Map();
for (const z of zonas26) {
  const [v26] = [somaB(zona, `2026|${z}`, ['85-89', '90-94', '95-99'])[1]];
  if (zonas22.has(z)) { pares++; pv22 += somaB(zona, `2022|${z}`, ['85-89', '90-94', '95-99'])[1]; pv26 += v26; }
  const pf = perfZona.get(z); if (!pf) { semPerfil++; continue; }
  const v8089 = somaB(zona, `2026|${z}`, ['80-84', '85-89'])[1]; const v9099 = somaB(zona, `2026|${z}`, ['90-94', '95-99'])[1];
  const com8089 = pf[2] - pf[3]; const com9099 = pf[4] - pf[5];
  if (v8089 > com8089) { minSem8089 += v8089 - com8089; zonasSem8089++; }
  if (v9099 > com9099) { minSem9099 += v9099 - com9099; zonasSem9099++; }
  const sb = pf[4] ? pf[5] / pf[4] : null; if (sb === null) continue;
  const bin = sb < 0.1 ? '0-10%' : sb < 0.3 ? '10-30%' : sb < 0.5 ? '30-50%' : sb < 0.7 ? '50-70%' : sb < 0.9 ? '70-90%' : '90-100%';
  const a9099 = somaB(zona, `2026|${z}`, ['90-94', '95-99']); const b = binsZona.get(bin) ?? binsZona.set(bin, { zonas: 0, aptos: 0, votantes: 0, aptos22: 0, votantes22: 0, zonasPar: 0 }).get(bin);
  b.zonas++; b.aptos += a9099[0]; b.votantes += a9099[1];
  if (zonas22.has(z)) { const x = somaB(zona, `2022|${z}`, ['90-94', '95-99']); b.aptos22 += x[0]; b.votantes22 += x[1]; b.zonasPar++; }
}
R.zonas = { zonas2026: zonas26.size, zonas2022: zonas22.size, mesmaChaveNosDois: pares, votantes85_99NasZonasPar2022: pv22, votantes85_99NasZonasPar2026: pv26, deltaPctZonasPar: pct(pv26 - pv22, pv22), zonasSemPerfil: semPerfil,
  limiteInferiorSemBiometria2026: { '80-89': { votantes: minSem8089, zonas: zonasSem8089 }, '90-99': { votantes: minSem9099, zonas: zonasSem9099 }, nota: 'max(0, votantes oficiais da faixa − aptos COM biometria da faixa no perfil por seção), zona a zona, 1º turno de 2026' },
  comparecimento90_99PorSemBioDaZona: Object.fromEntries(['0-10%', '10-30%', '30-50%', '50-70%', '70-90%', '90-100%'].map((k) => { const b = binsZona.get(k); return [k, b ? { ...b, taxa2026: pct(b.votantes, b.aptos), taxa2022MesmasZonas: pct(b.votantes22, b.aptos22) } : null]; })) };

await writeFile(path.join(OUT, 'salto-85-99-resumo.json'), JSON.stringify(R, null, 1));
await writeFile(path.join(OUT, 'salto-85-99-uf.tsv'), `${ufTsv.join('\n')}\n`);
await writeFile(path.join(OUT, 'salto-85-99-municipios.tsv'), `${munTsv.join('\n')}\n`);
console.log(JSON.stringify({ ...R, fontes: Object.fromEntries(Object.entries(R.fontes).map(([k, v]) => [k, { ...v, codigos: v.codigos.length }])) }, null, 1));
