// Revisor cético, achado h01-comparecimento-oficial-100mais (demografo/07), lente "reprodução e código".
// Refaz de forma independente, a partir dos zips BRUTOS do TSE (não usa data/parsed/auditoria/demografo/perfil):
//   1. comparecimento oficial por faixa (perfil_comparecimento_abstencao_2026, CSVs por UF, sem o BRASIL), com e sem exterior (ZZ);
//   2. perfil_eleitor_secao_2026_<UF> (julho) somado por zona e por código fino de faixa: confere a referência da idade
//      (aptos do arquivo de comparecimento × eleitores do perfil, zona a zona, código a código);
//   3. limite inferior de votantes 100+ e 90–99 sem biometria, por zona (e variações: sem TTE, por município, por UF);
//   4. votantes 100+ × coorte 96+ do Censo 2022 por município; teste binomial com taxa da UF exata (sem arredondar).
// Uso: node --max-old-space-size=4096 scripts/auditoria/cetico-h01co-reproducao.mjs
// Saídas: data/parsed/auditoria/cetico/h01co-reproducao.json, h01co-zonas.tsv, h01co-secoes-100-casos.tsv
import { createReadStream, readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import readline from 'node:readline';
import { createInflateRaw } from 'node:zlib';
import path from 'node:path';
import { entradasZip } from './contagem-zip.mjs';
import { abrirLeitura } from '../../src/banco-leitura.js';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const DA = path.join(RAIZ, 'data/raw/dadosabertos');
const OUT = path.join(RAIZ, 'data/parsed/auditoria/cetico');
mkdirSync(OUT, { recursive: true });

async function* linhas(zip, e) {
  let s = createReadStream(zip, { start: e.inicioDados, end: Math.max(e.inicioDados + e.tamanhoComprimido - 1, e.inicioDados) });
  if (e.metodo === 8) s = s.pipe(createInflateRaw());
  const rl = readline.createInterface({ input: s.setEncoding('latin1'), crlfDelay: Infinity });
  for await (const l of rl) if (l) yield l.split(';');
}
const q = (x) => (x.charCodeAt(0) === 34 ? x.slice(1, -1) : x);
const grupo = (c) => (c === 9999 ? 'f100' : c >= 9000 && c <= 9599 ? 'f90_99' : c >= 8000 && c < 9000 ? 'f80_89' : c >= 7000 && c < 8000 ? 'f70_79'
  : c >= 1800 && c < 7000 ? 'f18_69' : c === 1600 || c === 1700 ? 'f16_17' : 'outro');

// ---------- 1. comparecimento oficial
const ZC = path.join(DA, 'perfil_comparecimento_abstencao/perfil_comparecimento_abstencao_2026.zip');
const comp = new Map(); // turno|uf|mun|zona → Map(cod → [aptos, comp, compTTE, abst])
const datas = new Set(); let linhasComp = 0, compMaiorAptos = 0, abstInconsistente = 0; const ufsVistos = new Set();
for (const e of (await entradasZip(ZC)).filter((x) => /_2026_[A-Z]{2}\.csv$/.test(x.nome) && !/BRASIL/.test(x.nome))) {
  let I = null;
  for await (const c0 of linhas(ZC, e)) {
    if (!I) { I = Object.fromEntries(c0.map((n, i) => [q(n), i])); continue; }
    const g = (n) => q(c0[I[n]]);
    linhasComp++; datas.add(`${g('NR_TURNO')}|${g('DT_GERACAO')}`);
    const uf = g('SG_UF').toLowerCase(); ufsVistos.add(uf);
    const k = `${g('NR_TURNO')}|${uf}|${g('CD_MUNICIPIO').padStart(5, '0')}|${g('NR_ZONA').padStart(4, '0')}`;
    const cod = Number(g('CD_FAIXA_ETARIA'));
    const ap = +g('QT_APTOS'), cp = +g('QT_COMPARECIMENTO'), tt = +g('QT_COMPARECIMENTO_TTE'), ab = +g('QT_ABSTENCAO');
    if (cp > ap) compMaiorAptos++; if (ap - cp !== ab) abstInconsistente++;
    let z = comp.get(k); if (!z) comp.set(k, (z = new Map()));
    const v = z.get(cod) ?? [0, 0, 0, 0]; v[0] += ap; v[1] += cp; v[2] += tt; v[3] += ab; z.set(cod, v);
  }
}
console.error('comparecimento lido', linhasComp, 'linhas');

// ---------- 2. perfil_eleitor_secao (julho), bruto
const perf = new Map(); // uf|mun|zona → Map(cod → [eleitores, biometria])
const sec100 = new Map(); // uf|mun|zona|secao → [eleitores100, bio100, total, biototal]
const datasPerfil = new Set(); let linhasPerfil = 0;
for (const f of readdirSync(path.join(DA, 'perfil_eleitor_secao')).filter((x) => x.endsWith('.zip'))) {
  const zip = path.join(DA, 'perfil_eleitor_secao', f);
  for (const e of (await entradasZip(zip)).filter((x) => x.nome.endsWith('.csv'))) {
    let I = null;
    for await (const c0 of linhas(zip, e)) {
      if (!I) { I = Object.fromEntries(c0.map((n, i) => [q(n), i])); continue; }
      const g = (n) => q(c0[I[n]]);
      linhasPerfil++; if (linhasPerfil % 5e6 === 0) console.error('perfil', linhasPerfil);
      datasPerfil.add(g('DT_GERACAO'));
      const uf = g('SG_UF').toLowerCase(); const mun = g('CD_MUNICIPIO').padStart(5, '0'); const zona = g('NR_ZONA').padStart(4, '0');
      const k = `${uf}|${mun}|${zona}`; const cod = Number(g('CD_FAIXA_ETARIA'));
      const el = +g('QT_ELEITORES'), bi = +g('QT_ELEITORES_BIOMETRIA');
      let z = perf.get(k); if (!z) perf.set(k, (z = new Map()));
      const v = z.get(cod) ?? [0, 0]; v[0] += el; v[1] += bi; z.set(cod, v);
      const ks = `${k}|${g('NR_SECAO').padStart(4, '0')}`; const s = sec100.get(ks) ?? [0, 0, 0, 0];
      s[2] += el; s[3] += bi; if (cod === 9999) { s[0] += el; s[1] += bi; } sec100.set(ks, s);
    }
  }
}
console.error('perfil lido', linhasPerfil, 'linhas');

const R = { fonte: { comparecimento: ZC, datas_comparecimento: [...datas], ufs_comparecimento: [...ufsVistos].sort(), linhas: linhasComp,
  linhas_comp_maior_aptos: compMaiorAptos, linhas_abstencao_inconsistente: abstInconsistente, datas_perfil: [...datasPerfil], linhas_perfil: linhasPerfil } };
const turnos = [...new Set([...comp.keys()].map((k) => k[0]))];
R.turnos = turnos;

// ---------- 3. taxas nacionais, com e sem exterior
const G = ['f16_17', 'f18_69', 'f70_79', 'f80_89', 'f90_99', 'f100', 'outro'];
const nac = (filtro) => {
  const o = Object.fromEntries(G.map((x) => [x, [0, 0]]));
  for (const [k, z] of comp) { if (!k.startsWith('1|') || !filtro(k.split('|')[1])) continue; for (const [cod, v] of z) { const gg = grupo(cod); o[gg][0] += v[0]; o[gg][1] += v[1]; } }
  return Object.fromEntries(G.map((x) => [x, { aptos: o[x][0], comp: o[x][1], taxa: o[x][0] ? o[x][1] / o[x][0] : null }]));
};
R.nacional_sem_exterior = nac((uf) => uf !== 'zz');
R.nacional_com_exterior = nac(() => true);
R.exterior = nac((uf) => uf === 'zz');
R.diferenca_100_menos_18_69_sem_exterior = R.nacional_sem_exterior.f100.taxa - R.nacional_sem_exterior.f18_69.taxa;
R.diferenca_100_menos_18_69_com_exterior = R.nacional_com_exterior.f100.taxa - R.nacional_com_exterior.f18_69.taxa;

// ---------- 4. referência da idade: aptos (comparecimento, 1º turno) × eleitores (perfil julho), zona a zona, código a código
const difCod = new Map(); let zonasSoComp = 0, zonasSoPerfil = 0;
for (const [k, z] of comp) {
  if (!k.startsWith('1|')) continue; const p = perf.get(k.slice(2)); if (!p) { zonasSoComp++; continue; }
  const cods = new Set([...z.keys(), ...p.keys()]);
  for (const cod of cods) { const d = (z.get(cod)?.[0] ?? 0) - (p.get(cod)?.[0] ?? 0); const a = difCod.get(cod) ?? [0, 0]; a[0] += Math.abs(d); a[1] += d; difCod.set(cod, a); }
}
for (const k of perf.keys()) if (!comp.has(`1|${k}`)) zonasSoPerfil++;
R.referencia_idade = { zonas_so_no_comparecimento: zonasSoComp, zonas_so_no_perfil: zonasSoPerfil,
  soma_dif_abs_por_codigo: Object.fromEntries([...difCod].sort((a, b) => a[0] - b[0]).map(([c, v]) => [c, { abs: v[0], liquida: v[1] }])) };

// ---------- 5. limite inferior "sem biometria" por zona
const zonasOut = [['uf', 'municipio', 'zona', 'aptos100', 'bio100_perfil', 'sembio100_perfil', 'comp100', 'compTTE100', 'lb100', 'lb100_sem_tte', 'aptos90_99', 'bio90_99', 'comp90_99', 'lb90_99']];
let lb100 = 0, lb100SemTte = 0, lb90 = 0, zLb100 = 0, zLb90 = 0; const lbUf = {}; const lbMun = new Map(); const ufAgg = new Map();
for (const [k, z] of comp) {
  if (!k.startsWith('1|')) continue; const [, uf, mun, zona] = k.split('|'); const p = perf.get(`${uf}|${mun}|${zona}`); if (!p) continue;
  const c100 = z.get(9999) ?? [0, 0, 0, 0]; const p100 = p.get(9999) ?? [0, 0];
  const c90 = [9094, 9599].reduce((a, c) => { const v = z.get(c) ?? [0, 0]; return [a[0] + v[0], a[1] + v[1]]; }, [0, 0]);
  const p90 = [9094, 9599].reduce((a, c) => { const v = p.get(c) ?? [0, 0]; return [a[0] + v[0], a[1] + v[1]]; }, [0, 0]);
  const l100 = Math.max(0, c100[1] - p100[1]); const l100t = Math.max(0, c100[1] - c100[2] - p100[1]); const l90 = Math.max(0, c90[1] - p90[1]);
  lb100 += l100; lb100SemTte += l100t; lb90 += l90; if (l100 > 0) zLb100++; if (l90 > 0) zLb90++;
  lbUf[uf] = (lbUf[uf] ?? 0) + l100;
  const m = lbMun.get(`${uf}|${mun}`) ?? [0, 0, 0, 0]; m[0] += c100[1]; m[1] += p100[1]; m[2] += c90[1]; m[3] += p90[1]; lbMun.set(`${uf}|${mun}`, m);
  const u = ufAgg.get(uf) ?? [0, 0]; u[0] += c100[1]; u[1] += p100[1]; ufAgg.set(uf, u);
  if (c100[1] > 0 || l90 > 0) zonasOut.push([uf, mun, zona, c100[0], p100[1], p100[0] - p100[1], c100[1], c100[2], l100, l100t, c90[0], p90[1], c90[1], l90]);
}
let lbMun100 = 0, lbMun90 = 0; for (const m of lbMun.values()) { lbMun100 += Math.max(0, m[0] - m[1]); lbMun90 += Math.max(0, m[2] - m[3]); }
let lbUf100 = 0; for (const u of ufAgg.values()) lbUf100 += Math.max(0, u[0] - u[1]);
R.limite_inferior_sem_biometria = { por_zona_100: lb100, zonas_100: zLb100, por_zona_100_sem_tte: lb100SemTte, por_zona_90_99: lb90, zonas_90_99: zLb90,
  por_uf_100_zona: Object.fromEntries(Object.entries(lbUf).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])),
  agregado_por_municipio_100: lbMun100, agregado_por_municipio_90_99: lbMun90, agregado_por_uf_100: lbUf100 };
await writeFile(path.join(OUT, 'h01co-zonas.tsv'), zonasOut.map((x) => x.join('\t')).join('\n') + '\n');

// ---------- 6. municípios × coorte 96+ e binomial
const censo = new Map();
for (const l of JSON.parse(readFileSync(path.join(RAIZ, 'data/raw/externos/ibge/censo2022-9514-idade-c.json'), 'utf8')).slice(1)) {
  const o = censo.get(l.D1C) ?? {}; const v = Number(l.V); o[l.D5C] = Number.isFinite(v) ? v : 0; censo.set(l.D1C, o);
}
const { db, fonte } = await abrirLeitura(); R.fonte.banco = fonte;
const mun = new Map(db.prepare('SELECT codigo, uf, nome, codigo_ibge FROM municipio').all().map((m) => [`${m.uf}|${m.codigo}`, m]));
function caudaSup(n, k, p) { // P(X ≥ k), Bin(n,p), recorrência em log
  if (k <= 0) return 1; if (k > n) return 0;
  let lp = n * Math.log1p(-p); const r = Math.log(p) - Math.log1p(-p); let mx = -Infinity; const termos = [];
  for (let j = 0; j <= n; j++) { if (j >= k) { termos.push(lp); if (lp > mx) mx = lp; } if (j < n) lp += Math.log(n - j) - Math.log(j + 1) + r; }
  return Math.min(1, Math.exp(mx) * termos.reduce((s, t) => s + Math.exp(t - mx), 0));
}
const munAgg = new Map(); const ufTaxa = new Map();
for (const [k, z] of comp) {
  if (!k.startsWith('1|')) continue; const [, uf, m] = k.split('|'); if (uf === 'zz') continue;
  const c = z.get(9999) ?? [0, 0]; const a = munAgg.get(`${uf}|${m}`) ?? [0, 0]; a[0] += c[0]; a[1] += c[1]; munAgg.set(`${uf}|${m}`, a);
  const u = ufTaxa.get(uf) ?? [0, 0]; u[0] += c[0]; u[1] += c[1]; ufTaxa.set(uf, u);
}
let semIbge = 0, semIbgeAptos = 0; const acimaTeto = [], acimaTeto95 = []; const testes = [];
for (const [km, [a, v]] of munAgg) {
  const m = mun.get(km); const c = m && censo.get(m.codigo_ibge);
  const [uf] = km.split('|'); const [ua, uc] = ufTaxa.get(uf); const p = uc / ua;
  if (!c) { semIbge++; semIbgeAptos += a; }
  if (a > 0) testes.push({ km, nome: m?.nome, a, v, p, pval: caudaSup(a, v, p), p_arred: caudaSup(a, v, Math.round(p * 1e4) / 1e4) });
  if (!c) continue;
  const p96 = c['60041'] - c['6648'] + c['6653'];
  if (v > p96) acimaTeto.push({ km, nome: m.nome, aptos100: a, votantes100: v, coorte96: p96, idade95_2022: c['6648'], idade90_94: c['60040'] });
  if (v > p96 + c['6648']) acimaTeto95.push({ km, nome: m.nome, votantes100: v, coorte95: p96 + c['6648'] });
}
const bonf = 0.05 / testes.length;
R.municipios = { com_aptos100_testados: testes.length, sem_par_ibge: semIbge, aptos100_sem_par_ibge: semIbgeAptos, limiar_bonferroni: bonf,
  significativos_taxa_exata: testes.filter((t) => t.pval < bonf).length, significativos_taxa_arredondada_4c: testes.filter((t) => t.p_arred < bonf).length,
  p_abaixo_0_01: testes.filter((t) => t.pval < 0.01).length,
  lista_significativos: testes.filter((t) => t.pval < bonf || t.p_arred < bonf).sort((x, y) => x.pval - y.pval)
    .map((t) => ({ mun: t.km, nome: t.nome, aptos: t.a, votantes: t.v, taxa_uf: t.p, p: Number(t.pval.toPrecision(3)), p_arred: Number(t.p_arred.toPrecision(3)) })),
  acima_coorte96: acimaTeto, acima_coorte95_inclusive: acimaTeto95 };

// ---------- 7. casos: seções 100+ dos municípios citados (perfil julho) + BU 1º turno do banco (habilitação)
const casos = [['uf', 'municipio', 'zona', 'secao', 'eleitores100', 'bio100', 'eleitores_secao', 'bio_secao', 'bu1t_comparecimento', 'bu1t_sem_biometria', 'bu1t_por_biometria', 'bu1t_por_biografia']];
const alvo = new Set(['mt|89843|0040', 'pi|10804|0079', 'mt|90042|0015']);
const stBu = db.prepare('SELECT comparecimento, sem_biometria, por_biometria, por_biografia FROM secao WHERE turno = 1 AND uf = ? AND municipio = ? AND zona = ? AND secao = ?');
for (const [ks, s] of sec100) {
  const [uf, m, z, sc] = ks.split('|'); if (!alvo.has(`${uf}|${m}|${z}`) || s[0] === 0) continue;
  const b = stBu.get(uf, m, z, sc) ?? {};
  casos.push([uf, m, z, sc, s[0], s[1], s[2], s[3], b.comparecimento ?? '', b.sem_biometria ?? '', b.por_biometria ?? '', b.por_biografia ?? '']);
}
await writeFile(path.join(OUT, 'h01co-secoes-100-casos.tsv'), casos.map((x) => x.join('\t')).join('\n') + '\n');
R.gerado_em = new Date().toISOString();
await writeFile(path.join(OUT, 'h01co-reproducao.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
