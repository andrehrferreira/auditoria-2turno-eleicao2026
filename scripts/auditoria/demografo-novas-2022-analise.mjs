// Demógrafo (H27/H01): seções novas de 2022 e de 2026, pendências do doc 08 (excesso de seções novas com 95% ou mais).
// Tudo agregado por seção ou local; nenhum CPF, nenhum título, nada de data/private/.
//   A. trajetória: as seções novas em 2022 (ausentes do detalhe de 2018 ou, fora de DF e exterior, de 2020) em 2022 e em 2026
//      (mesma chave, mesmo turno): o comparecimento alto se mantém ou cai? Comparação com as antigas de 2022 que também
//      passaram de 95% (regressão à média) e excesso controlado pelo tamanho nos dois anos, para a mesma coorte.
//   B. por que o excesso de 2026 é maior que o de 2022: decomposição do excesso (observadas − esperadas pelo tamanho) por tipo
//      de seção nova, com a mesma regra nos dois anos: local novo (número de local ausente da eleição geral anterior),
//      zona nova, classe do local pelo nome (comunidade indígena, quilombola, assentamento; prisão/internação; hospital) e
//      região; em 2026, também com e sem eleitor em trânsito (TTE).
//   C. recência (perfil do eleitorado por seção de 2022 e de 2026, todas as UFs no disco): a seção nova de 2026 junta um
//      grupo diferente do resto do local (mais jovem, todo com biometria) ou é uma divisão do eleitorado que já estava lá?
//      O local cresceu de 2022 para 2026 (adultos de 25+ em 2026 ÷ adultos de 21+ em 2022, a mesma geração)?
//   D. o mesmo para as novas de 2022 (perfil de 2022) e a convergência delas até 2026 (perfil de 2026).
// Definições de "nova" iguais às do doc 08 (demografo-secoes-novas.mjs).
// Pré-requisitos: demografo-baixar-tse.mjs (detalhe 2018/2020/2022), seguranca-h27-baixar.mjs (CEFT 2022/2024),
// demografo-novas-2022-baixar.mjs (perfil 2022) e demografo-novas-2022-perfil.mjs --ano 2022 / --ano 2026.
// Saídas: data/parsed/auditoria/demografo/novas-2022-{resumo.json,trajetoria-ge95.tsv}
// Uso: node --max-old-space-size=8000 scripts/auditoria/demografo-novas-2022-analise.mjs [--ufs MG,PR,SC,RS]
//   --ufs: restringe as partes C e D às UFs listadas (as partes A e B usam sempre o universo completo).
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { entradasZip, linhasBrutas } from './contagem-zip.mjs';
import { BANDAS, DIR_FINO } from './demografo-novas-2022-perfil.mjs';
import { linhasZip } from './seguranca-h27-lib.mjs';

const { values: opt } = parseArgs({ options: { ufs: { type: 'string' } } });
const UFS_PERFIL = opt.ufs ? new Set(opt.ufs.toLowerCase().split(',')) : null;
const OUT = path.join(DIR_DADOS, 'parsed', 'auditoria', 'demografo');
const DA = path.join(DIR_DADOS, 'raw', 'dadosabertos');
const p4 = (x) => String(Number(x)).padStart(4, '0');
const p5 = (x) => String(Number(x)).padStart(5, '0');
const K = (uf, m, z, s) => `${uf.trim().toLowerCase()}/${p5(m)}/${p4(z)}/${p4(s)}`;
const zonaDe = (k) => k.split('/').slice(0, 3).join('/');
const pct = (a, b) => (b ? +(100 * a / b).toFixed(3) : null);
const r3 = (x) => (x === null || !Number.isFinite(x) ? null : +x.toFixed(3));
const log = (...a) => console.error(new Date().toISOString().slice(11, 19), ...a);
const NE = new Set(['al', 'ba', 'ce', 'ma', 'pb', 'pe', 'pi', 'rn', 'se']);
const classeNome = (n0) => { const n = n0.normalize('NFC').toUpperCase(); return /ALDEIA|IND[IÍ]GENA|\bTI\b|POVO /.test(n) ? 'comunidade' : /QUILOMB/.test(n) ? 'comunidade' : /ASSENTAMENTO|\bPA\b|AGROVILA/.test(n) ? 'comunidade' : /PRISIONAL|PENITENCI|PRES[IÍ]DIO|CADEIA|SOCIOEDUC|CDP|INTERNA[CÇ][AÃ]O|DETEN[CÇ]/.test(n) ? 'prisao/internacao' : /HOSPITAL/.test(n) ? 'hospital' : 'outro'; };
const ge = (x, lim = 0.95) => x.comp / x.aptos >= lim;

// ---------- fontes
async function ceft(pasta) {
  const s = new Set();
  for (const n of readdirSync(path.join(DA, 'correspondencias', pasta)).filter((x) => x.startsWith('CEFT_'))) {
    for await (const r of linhasZip(path.join(DA, 'correspondencias', pasta, n))) s.add(K(r.SG_UF, r.CD_MUNICIPIO, r.NR_ZONA, r.NR_SECAO));
  }
  return s;
}
// detalhe_votacao_secao: chaves, locais (uf/mun/zona/local), zonas; com comparecimento: Presidente por turno, número e nome do local
async function detalhe(ano, { comVotos = false } = {}) {
  const zip = path.join(DA, 'detalhe_votacao_secao', `detalhe_votacao_secao_${ano}.zip`);
  const ents = (await entradasZip(zip)).filter((e) => e.nome.toLowerCase().endsWith('.csv'));
  const br = ents.filter((e) => /_BR\.csv$/i.test(e.nome));
  const usar = br.length ? br : ents.filter((e) => !/BRASIL/i.test(e.nome));
  const chaves = new Set(); const locais = new Set(); const zonas = new Set(); const t = { 1: new Map(), 2: new Map() };
  for (const e of usar) {
    let col = null;
    for await (const c of linhasBrutas(zip, e)) {
      if (!col) { col = Object.fromEntries(c.map((n, i) => [n.trim(), i])); continue; }
      const k = K(c[col.SG_UF], c[col.CD_MUNICIPIO], c[col.NR_ZONA], c[col.NR_SECAO]);
      const lk = `${zonaDe(k)}/${Number(c[col.NR_LOCAL_VOTACAO])}`;
      chaves.add(k); locais.add(lk); zonas.add(zonaDe(k));
      if (!comVotos || c[col.CD_CARGO].trim() !== '1') continue;
      const m = t[c[col.NR_TURNO].trim()]; if (!m) continue;
      const v = m.get(k) ?? m.set(k, { aptos: 0, comp: 0, local: lk, nome: c[col.NM_LOCAL_VOTACAO].trim() }).get(k);
      v.aptos += Number(c[col.QT_APTOS]); v.comp += Number(c[col.QT_COMPARECIMENTO]);
    }
  }
  return { chaves, locais, zonas, t };
}
log('CEFT 2022/2024');
const c22 = await ceft('2022-1t'); const c24 = await ceft('2024-1t');
log('detalhe 2018, 2020, 2022, 2026');
const d18 = await detalhe(2018); const d20 = await detalhe(2020);
const d22 = await detalhe(2022, { comVotos: true }); const d26 = await detalhe(2026, { comVotos: true });
const fora = (k) => k.startsWith('zz/') || k.startsWith('df/');
const nova26 = (k) => !c22.has(k) || (!fora(k) && !c24.has(k));
const nova22 = (k) => !d18.chaves.has(k) || (!fora(k) && !d20.chaves.has(k));

// ---------- banco (cópia de leitura): 2026, como no doc 08
log('banco');
const { db } = await abrirLeitura();
const S = { 1: new Map(), 2: new Map() };
for (const r of db.prepare('SELECT turno, uf, municipio, zona, secao, local, situacao, tipo_arquivo, comparecimento FROM secao').iterate()) {
  if (r.situacao !== 'completa' || /^sa/.test(r.tipo_arquivo)) continue;
  S[r.turno].set(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, { local: `${r.uf}/${r.municipio}/${r.zona}/${r.local}`, comp: r.comparecimento, aptos: 0, tte: 0 });
}
for (const r of db.prepare('SELECT turno, uf, municipio, zona, secao, aptos, aptos_tte FROM secao_eleicao WHERE eleicao IN (6257, 6258)').iterate()) {
  const x = S[r.turno].get(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`);
  if (x) { x.aptos = r.aptos; x.tte = r.aptos_tte ?? 0; }
}
const membros = { 1: new Map(), 2: new Map() }; const principalDe = new Map();
for (const r of db.prepare('SELECT turno, uf, municipio, zona, secao, secao_principal FROM secao_agregada').iterate()) {
  const p = `${r.uf}/${r.municipio}/${r.zona}/${r.secao_principal}`; const a = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
  (membros[r.turno].get(p) ?? membros[r.turno].set(p, []).get(p)).push(a);
  if (r.turno === 2) principalDe.set(a, p);
}
// lista por ano e turno: { k, aptos, comp, nova, local, localNovo, zonaNova, classe, regiao, tte }
function lista26(t) {
  const L = [];
  for (const [k, x] of S[t]) {
    if (!(x.aptos > 0)) continue;
    const d = d26.t[t].get(k) ?? d26.t[1].get(k);
    L.push({ k, aptos: x.aptos, comp: x.comp, tte: x.tte, nova: nova26(k), local: x.local, localNovo: !d22.locais.has(x.local), zonaNova: !d22.zonas.has(zonaDe(k)), classe: d ? classeNome(d.nome) : 'sem nome', ne: NE.has(k.slice(0, 2)) });
  }
  return L;
}
function lista22(t) {
  const L = [];
  for (const [k, v] of d22.t[t]) {
    if (!(v.aptos > 0)) continue;
    L.push({ k, aptos: v.aptos, comp: v.comp, tte: null, nova: nova22(k), local: v.local, localNovo: !d18.locais.has(v.local), zonaNova: !d18.zonas.has(zonaDe(k)), classe: classeNome(v.nome), ne: NE.has(k.slice(0, 2)) });
  }
  return L;
}

// ---------- padronização indireta (doc 08): estrato de tamanho em faixas de 25 aptos, taxa de 95%+ das ANTIGAS do estrato.
// Com `cat`, o excesso é aberto por categoria da seção nova (a soma das categorias é o total).
const tam25 = (x) => Math.floor(x.aptos / 25);
function padroniza(novas, antigas, { estrato = tam25, lim = 0.95, cat = null } = {}) {
  const T = new Map();
  for (const x of antigas) { const e = estrato(x); const v = T.get(e) ?? T.set(e, [0, 0]).get(e); v[0]++; if (ge(x, lim)) v[1]++; }
  const tot = { novas: 0, observadas: 0, esperadas: 0, semBase: 0, semBaseGe: 0 }; const C = {};
  for (const x of novas) {
    const c = cat ? cat(x) : null; const o = c !== null ? (C[c] ??= { novas: 0, observadas: 0, esperadas: 0, semBase: 0, semBaseGe: 0 }) : null;
    for (const a of o ? [tot, o] : [tot]) {
      a.novas++; const g = ge(x, lim); const v = T.get(estrato(x));
      if (!v) { a.semBase++; if (g) a.semBaseGe++; continue; }
      if (g) a.observadas++; a.esperadas += v[1] / v[0];
    }
  }
  const fim = (a) => ({ novas: a.novas, observadas: a.observadas, esperadas: +a.esperadas.toFixed(1), excesso: +(a.observadas - a.esperadas).toFixed(1), razao: a.esperadas ? +(a.observadas / a.esperadas).toFixed(2) : null, pctGe: pct(a.observadas + a.semBaseGe, a.novas), ...(a.semBase ? { semBase: a.semBase, semBaseGe: a.semBaseGe } : {}) });
  const r = fim(tot);
  if (cat) r.porCategoria = Object.fromEntries(Object.entries(C).sort((a, b) => b[1].observadas - a[1].observadas).map(([c, a]) => [c, fim(a)]));
  return r;
}
const ag = (a) => ({ secoes: a.length, aptosMedios: a.length ? +(a.reduce((s, x) => s + x.aptos, 0) / a.length).toFixed(1) : null, taxa: pct(a.reduce((s, x) => s + x.comp, 0), a.reduce((s, x) => s + x.aptos, 0)), ge95: a.filter((x) => ge(x)).length, pctGe95: pct(a.filter((x) => ge(x)).length, a.length) });
const R = { fontes: { ceft2022: c22.size, ceft2024: c24.size, detalhe2018: d18.chaves.size, detalhe2020: d20.chaves.size, detalhe2022: d22.chaves.size, detalhe2026: d26.chaves.size, locais2018: d18.locais.size, locais2022: d22.locais.size } };

// ---------- A. trajetória das seções novas de 2022
const trajTsv = ['turno\tsecao\tnova2022\taptos2022\tcomp2022\ttaxa2022\taptos2026\tcomp2026\ttaxa2026\tmesmo_local\tclasse\tlocal_novo_2022'];
const faixaTx = (x) => (!x ? 'ausente em 2026' : x.aptos <= 0 ? 'ausente em 2026' : x.comp / x.aptos >= 0.95 ? '95+' : x.comp / x.aptos >= 0.9 ? '90-95' : x.comp / x.aptos >= 0.85 ? '85-90' : x.comp / x.aptos >= 0.8 ? '80-85' : '<80');
const L22 = { 1: lista22(1), 2: lista22(2) }; const L26 = { 1: lista26(1), 2: lista26(2) };
for (const t of [1, 2]) {
  const L = L22[t]; const N = L.filter((x) => x.nova); const A = L.filter((x) => !x.nova);
  const em26 = (x) => { const y = S[t].get(x.k); return y && y.aptos > 0 ? y : null; };
  const par = (a) => a.map((x) => ({ x, y: em26(x) })).filter((o) => o.y);
  const resumoPar = (a) => { const p = par(a); return { secoes: a.length, comPar2026: p.length, taxa2022: pct(p.reduce((s, o) => s + o.x.comp, 0), p.reduce((s, o) => s + o.x.aptos, 0)), taxa2026: pct(p.reduce((s, o) => s + o.y.comp, 0), p.reduce((s, o) => s + o.y.aptos, 0)), mediaSimples2022: r3(100 * p.reduce((s, o) => s + o.x.comp / o.x.aptos, 0) / p.length), mediaSimples2026: r3(100 * p.reduce((s, o) => s + o.y.comp / o.y.aptos, 0) / p.length), aptos2022Medios: +(p.reduce((s, o) => s + o.x.aptos, 0) / p.length).toFixed(1), aptos2026Medios: +(p.reduce((s, o) => s + o.y.aptos, 0) / p.length).toFixed(1), mesmoLocal: p.filter((o) => o.y.local === o.x.local).length, variacaoPontos: (() => { const d = p.map((o) => 100 * (o.y.comp / o.y.aptos - o.x.comp / o.x.aptos)); const m = d.reduce((q, v) => q + v, 0) / d.length; const dp = Math.sqrt(d.reduce((q, v) => q + (v - m) ** 2, 0) / (d.length - 1)); return { media: r3(m), dp: r3(dp), ep: r3(dp / Math.sqrt(d.length)) }; })(), faixa2026: a.reduce((m, x) => { const f = faixaTx(em26(x)); m[f] = (m[f] ?? 0) + 1; return m; }, {}) }; };
  const g95 = (a) => a.filter((x) => ge(x));
  // excesso pelo tamanho, mesma coorte: em 2022 (base: antigas de 2022) e em 2026 (base: as antigas de 2022 que existem em 2026)
  const N26 = par(N).map((o) => ({ ...o.y, k: o.x.k })); const A26 = par(A).map((o) => ({ ...o.y, k: o.x.k }));
  // das novas de 2022 com 95%+ em 2022, quantas também passaram de 95% no outro turno de 2022 (estabilidade dentro da eleição)
  const outro = d22.t[3 - t];
  const estavel = (a) => a.filter((x) => { const y = outro.get(x.k); return y && y.aptos > 0 && y.comp / y.aptos >= 0.95; }).length;
  R[`A_trajetoria_${t}t`] = {
    novas2022: resumoPar(N), antigas2022: resumoPar(A),
    novas2022Ge95em2022: resumoPar(g95(N)), antigas2022Ge95em2022: resumoPar(g95(A)),
    ge95NoOutroTurno2022: { novas: estavel(g95(N)), antigas: estavel(g95(A)) },
    excessoPeloTamanho: { em2022: padroniza(N, A), em2026MesmasSecoes: padroniza(N26, A26), em2026NovasDe2026: padroniza(L26[t].filter((x) => x.nova), L26[t].filter((x) => !x.nova)) },
    ge95em2026: { novas2022: g95(N26).length, dasQuaisGe95em2022: g95(N26).filter((y) => ge(d22.t[t].get(y.k))).length, antigas2022: g95(A26).length, dasQuaisGe95em2022Antigas: g95(A26).filter((y) => ge(d22.t[t].get(y.k))).length },
  };
  for (const x of L.filter((z) => ge(z))) { const y = em26(x); trajTsv.push([t, x.k, x.nova ? 1 : 0, x.aptos, x.comp, pct(x.comp, x.aptos), y?.aptos ?? '', y?.comp ?? '', y ? pct(y.comp, y.aptos) : '', y ? (y.local === x.local ? 1 : 0) : '', x.classe, x.localNovo ? 1 : 0].join('\t')); }
  log(`A turno ${t} ok`);
}

// ---------- B. decomposição do excesso, mesma regra nos dois anos
const catLocal = (x) => (x.zonaNova ? 'zona nova' : x.localNovo ? 'local novo' : 'local existente');
const catClasse = (x) => (x.classe === 'comunidade' || x.classe === 'prisao/internacao' || x.classe === 'hospital' ? x.classe : 'outro');
for (const t of [1, 2]) {
  for (const [ano, L] of [[2022, L22[t]], [2026, L26[t]]]) {
    const N = L.filter((x) => x.nova); const A = L.filter((x) => !x.nova);
    const r = {
      novas: ag(N), antigas: ag(A),
      porLocal: padroniza(N, A, { cat: catLocal }),
      porClasse: padroniza(N, A, { cat: catClasse }),
      porLocalEClasse: padroniza(N, A, { cat: (x) => `${catLocal(x)} | ${catClasse(x)}` }),
      porRegiao: padroniza(N, A, { cat: (x) => (x.ne ? 'Nordeste' : 'demais') }),
      porRegiaoELocal: padroniza(N, A, { cat: (x) => `${x.ne ? 'Nordeste' : 'demais'} | ${catLocal(x)}` }),
      porUF: padroniza(N, A, { cat: (x) => x.k.slice(0, 2) }),
      // controle adicional: tamanho × "local novo" (base: antigas que mudaram para um local novo)
      tamanhoELocalNovo: padroniza(N, A, { estrato: (x) => `${tam25(x)}|${x.localNovo || x.zonaNova ? 1 : 0}` }),
      antigasPorLocal: { localNovo: ag(A.filter((x) => x.localNovo && !x.zonaNova)), zonaNova: ag(A.filter((x) => x.zonaNova)), localExistente: ag(A.filter((x) => !x.localNovo && !x.zonaNova)) },
      limiar98: padroniza(N, A, { lim: 0.98, cat: catLocal }),
    };
    if (ano === 2026) {
      const sT = (a) => a.filter((x) => x.tte === 0);
      r.semTTE = padroniza(sT(N), sT(A), { cat: catLocal });
      r.semTTEporClasse = padroniza(sT(N), sT(A), { cat: catClasse });
      r.porTTE = padroniza(N, A, { cat: (x) => (x.tte === 0 ? 'sem TTE' : x.tte / x.aptos > 0.5 ? 'TTE maioria' : 'TTE minoria') });
    }
    R[`B_decomposicao_${ano}_${t}t`] = r;
  }
  log(`B turno ${t} ok`);
}

// ---------- C/D. perfil do eleitorado por seção (2022 e 2026)
const NB = BANDAS.length; const iB = (b) => BANDAS.indexOf(b);
function lerPerfil(ano) {
  const dir = path.join(DIR_FINO, String(ano)); const P = new Map();
  if (!existsSync(dir)) return { P, ufs: [] };
  const ufs = readdirSync(dir).filter((f) => f.endsWith('.tsv')).map((f) => f.slice(0, 2)).filter((u) => !UFS_PERFIL || UFS_PERFIL.has(u)).sort();
  for (const u of ufs) {
    const L = readFileSync(path.join(dir, `${u}.tsv`), 'utf8').trimEnd().split('\n');
    for (const l of L.slice(1)) {
      const c = l.split('\t'); const v = new Int32Array(2 + 2 * NB);
      for (let i = 0; i < v.length; i++) v[i] = Number(c[5 + i]);
      P.set(K(c[0], c[1], c[2], c[3]), { local: `${c[0]}/${c[1]}/${c[2]}/${Number(c[4])}`, v });
    }
  }
  return { P, ufs };
}
const soma = (a, b) => { for (let i = 0; i < a.length; i++) a[i] += b[i]; return a; };
const nova = () => new Int32Array(2 + 2 * NB);
const fx = (v, de, ate) => { let s = 0; for (let i = iB(de); i <= iB(ate); i++) s += v[2 + i]; return s; };
const sb = (v, de, ate) => { let s = 0; for (let i = iB(de); i <= iB(ate); i++) s += v[2 + NB + i]; return s; };
const valido = (v) => v[0] - v[2 + NB - 1];
// faixas largas para o índice de dissimilaridade (Duncan: metade da soma das diferenças absolutas de parcela)
const LARGAS = [['1600', '2000'], ['2124', '2124'], ['2529', '2529'], ['3034', '3539'], ['4044', '4549'], ['5054', '5559'], ['6064', '6569'], ['7074', '7579'], ['8084', '9999']];
const parcelas = (v) => { const T = valido(v); return LARGAS.map(([a, b]) => (T ? fx(v, a, b) / T : 0)); };
const duncan = (u, w) => { const p = parcelas(u); const q = parcelas(w); return 0.5 * p.reduce((s, x, i) => s + Math.abs(x - q[i]), 0); };
const jov = (v) => (v[0] ? fx(v, '1600', '2000') / v[0] : null);
const semBio = (v) => (v[0] ? (v[0] - v[1]) / v[0] : null);
const idoso = (v) => (v[0] ? fx(v, '7074', '9999') / v[0] : null);
const perfilGrupo = (vs) => { const t = vs.reduce((a, v) => soma(a, v), nova()); const T = valido(t); return { eleitores: t[0], pctSemBio: pct(t[0] - t[1], t[0]), pct16a20: pct(fx(t, '1600', '2000'), T), pct21a24: pct(fx(t, '2124', '2124'), T), pct25a39: pct(fx(t, '2529', '3539'), T), pct40a59: pct(fx(t, '4044', '5559'), T), pct60a69: pct(fx(t, '6064', '6569'), T), pct70mais: pct(fx(t, '7074', '9999'), T), pct90mais: pct(fx(t, '9094', '9999'), T), pctSemBio18a69: pct(sb(t, '1800', '6569'), fx(t, '1800', '6569')) }; };
// soma do campo `c` das seções do grupo `g`, sem `x` (total em cache por grupo)
const cacheRef = new WeakMap();
const refSem = (g, x, c) => { let m = cacheRef.get(g); if (!m) cacheRef.set(g, (m = {})); if (!m[c]) m[c] = { tot: g.reduce((s, y) => soma(s, y[c]), nova()), n: g.length }; const dentro = g.includes(x); if (m[c].n - (dentro ? 1 : 0) <= 0) return null; const r = m[c].tot.slice(); if (dentro) for (let i = 0; i < r.length; i++) r[i] -= x[c][i]; return r; };
const quant = (a, qs = [0.25, 0.5, 0.75]) => { const s = [...a].sort((x, y) => x - y); return s.length ? Object.fromEntries(qs.map((q) => [`p${Math.round(100 * q)}`, r3(s[Math.min(s.length - 1, Math.floor(q * s.length))])])) : null; };
const tamCl = (n) => (n < 100 ? '<100' : n < 200 ? '100-199' : n < 300 ? '200-299' : '300+');

log('perfil 2022 e 2026');
const P22 = lerPerfil(2022); const P26 = lerPerfil(2026);
R.perfil = { ufs2022: P22.ufs, ufs2026: P26.ufs, secoes2022: P22.P.size, secoes2026: P26.P.size };
const ufsAmbos = new Set(P22.ufs.filter((u) => P26.ufs.includes(u)));
R.perfil.ufsAmbos = [...ufsAmbos];
if (ufsAmbos.size) {
  // perfil de 2026 por seção do BU (principal + agregadas do 2º turno)
  const perfil26 = (k, t) => { const ks = [k, ...(membros[t].get(k) ?? [])]; let v = null; for (const m of ks) { const q = P26.P.get(m); if (q) v = soma(v ?? nova(), q.v); } return v; };
  // locais em cada ano, pelo perfil (todas as seções do perfil, inclusive agregadas): total do local
  const locais = (P) => { const M = new Map(); for (const [, q] of P) soma(M.get(q.local) ?? M.set(q.local, nova()).get(q.local), q.v); return M; };
  const Loc22 = locais(P22.P); const Loc26 = locais(P26.P);
  // crescimento da geração adulta do local: 25+ em 2026 ÷ 21+ em 2022 (as mesmas pessoas, 4 anos depois, se ninguém entrasse nem saísse)
  const cresc = (lk) => { const a = Loc26.get(lk); const b = Loc22.get(lk); if (!a || !b) return null; const d = fx(b, '2124', '9999'); return d ? fx(a, '2529', '9999') / d : null; };
  const gCl = (g) => (g === null ? 'local sem 2022' : g < 0.9 ? '<0,90' : g < 1 ? '0,90-1,00' : g < 1.1 ? '1,00-1,10' : g < 1.3 ? '1,10-1,30' : '1,30+');
  for (const t of [2, 1]) {
    // 2026: seções do BU com perfil, nas UFs com perfil nos dois anos
    const L = L26[t].filter((x) => ufsAmbos.has(x.k.slice(0, 2))).map((x) => ({ ...x, v: perfil26(x.k, t) })).filter((x) => x.v && x.v[0] > 0);
    const porLocal = new Map(); for (const x of L) (porLocal.get(x.local) ?? porLocal.set(x.local, { n: [], a: [] }).get(x.local))[x.nova ? 'n' : 'a'].push(x);
    for (const x of L) {
      x.ref = refSem(porLocal.get(x.local).a, x, 'v'); // antigas do mesmo local (sem a própria)
      x.D = x.ref && valido(x.ref) >= 100 ? duncan(x.v, x.ref) : null;
      x.dJov = x.ref && valido(x.ref) >= 100 ? jov(x.v) - jov(x.ref) : null;
      x.dSemBio = x.ref && valido(x.ref) >= 100 ? semBio(x.v) - semBio(x.ref) : null;
      x.g = cresc(x.local); x.local22 = Loc22.has(x.local);
      const l22 = Loc22.get(x.local); x.D22 = l22 && valido(l22) >= 100 ? duncan(x.v, l22) : null; x.dSemBio22 = l22 ? semBio(x.v) - semBio(l22) : null;
      x.jov = jov(x.v); x.semBio = semBio(x.v);
    }
    const N = L.filter((x) => x.nova); const A = L.filter((x) => !x.nova);
    const catL = (x) => (!x.local22 ? 'local ausente do perfil de 2022' : porLocal.get(x.local).a.length ? 'local existente, com antigas em 2026' : 'local existente, só seções novas em 2026');
    const jovCl = (x) => (x.jov < 0.05 ? '<5%' : x.jov < 0.1 ? '5-10%' : x.jov < 0.2 ? '10-20%' : '20%+');
    const sbCl = (x) => (x.semBio === 0 ? '0%' : x.semBio < 0.05 ? '0-5%' : '5%+');
    const dCl = (x) => (x.D === null ? 'sem base no local' : x.D < 0.1 ? '<0,10' : x.D < 0.2 ? '0,10-0,20' : x.D < 0.3 ? '0,20-0,30' : '0,30+');
    const dist = (a, f) => Object.fromEntries(['<100', '100-199', '200-299', '300+'].map((c) => [c, quant(a.filter((x) => tamCl(x.aptos) === c && f(x) !== null).map(f))]));
    const r = {
      secoes: { novas: N.length, antigas: A.length, novasGe95: N.filter((x) => ge(x)).length, antigasGe95: A.filter((x) => ge(x)).length },
      excessoNestasUFs: padroniza(N, A),
      porLocal: padroniza(N, A, { cat: catL }),
      porCrescimentoDoLocal: padroniza(N, A, { cat: (x) => gCl(x.g) }),
      antigasPorCrescimentoDoLocal: Object.fromEntries(['<0,90', '0,90-1,00', '1,00-1,10', '1,10-1,30', '1,30+', 'local sem 2022'].map((c) => [c, ag(A.filter((x) => gCl(x.g) === c))])),
      porJovens: padroniza(N, A, { cat: jovCl }),
      porSemBio: padroniza(N, A, { cat: sbCl }),
      porDissimilaridade: padroniza(N, A, { cat: dCl }),
      // controle: tamanho × jovens × sem biometria × crescimento do local (base: antigas do mesmo estrato)
      tamanhoJovensSemBio: padroniza(N, A, { estrato: (x) => `${tam25(x)}|${jovCl(x)}|${sbCl(x)}` }),
      tamanhoJovensSemBioCrescimento: padroniza(N, A, { estrato: (x) => `${tam25(x)}|${jovCl(x)}|${sbCl(x)}|${gCl(x.g)}` }),
      perfil: { novas: perfilGrupo(N.map((x) => x.v)), novasGe95: perfilGrupo(N.filter((x) => ge(x)).map((x) => x.v)), antigas: perfilGrupo(A.map((x) => x.v)), antigasGe95: perfilGrupo(A.filter((x) => ge(x)).map((x) => x.v)),
        antigasDosLocaisDasNovasGe95: perfilGrupo([...new Set(N.filter((x) => ge(x)).map((x) => x.local))].flatMap((lk) => porLocal.get(lk).a.map((y) => y.v))),
        locaisDasNovasGe95em2022: perfilGrupo([...new Set(N.filter((x) => ge(x)).map((x) => x.local))].map((lk) => Loc22.get(lk)).filter(Boolean)),
        locaisDasNovasGe95em2026: perfilGrupo([...new Set(N.filter((x) => ge(x)).map((x) => x.local))].map((lk) => Loc26.get(lk)).filter(Boolean)) },
      dissimilaridade: { novas: dist(N, (x) => x.D), antigas: dist(A, (x) => x.D), novasGe95: quant(N.filter((x) => ge(x) && x.D !== null).map((x) => x.D)), antigasGe95: quant(A.filter((x) => ge(x) && x.D !== null).map((x) => x.D)) },
      difJovensFrenteAoLocal: { novas: dist(N, (x) => x.dJov), antigas: dist(A, (x) => x.dJov) },
      difSemBioFrenteAoLocal: { novas: dist(N, (x) => x.dSemBio), antigas: dist(A, (x) => x.dSemBio) },
      // frente ao mesmo local em 2022 (perfil de 2022, todas as seções do local): o desvio de idade de 4 anos é comum a novas e antigas
      dissimilaridadeFrenteAoLocal2022: { novas: dist(N, (x) => x.D22), antigas: dist(A, (x) => x.D22), novasGe95: quant(N.filter((x) => ge(x) && x.D22 !== null).map((x) => x.D22)), antigasGe95: quant(A.filter((x) => ge(x) && x.D22 !== null).map((x) => x.D22)) },
      difSemBioFrenteAoLocal2022: { novas: dist(N, (x) => x.dSemBio22), antigas: dist(A, (x) => x.dSemBio22) },
      crescimentoDoLocal: { novas: quant(N.filter((x) => x.g !== null).map((x) => x.g)), novasGe95: quant(N.filter((x) => ge(x) && x.g !== null).map((x) => x.g)), antigas: quant(A.filter((x) => x.g !== null).map((x) => x.g)), antigasGe95: quant(A.filter((x) => ge(x) && x.g !== null).map((x) => x.g)), novasSemLocal2022: N.filter((x) => x.g === null).length, novasGe95SemLocal2022: N.filter((x) => ge(x) && x.g === null).length },
      porUF: padroniza(N, A, { cat: (x) => x.k.slice(0, 2) }),
    };
    R[`C_recencia_2026_${t}t`] = r;
    log(`C turno ${t} ok`);
  }

  // D. novas de 2022 no perfil de 2022 (só seções do detalhe de 2022, sem as agregadas, cujo principal não é conhecido em 2022)
  for (const t of [2, 1]) {
    const L = L22[t].filter((x) => ufsAmbos.has(x.k.slice(0, 2))).map((x) => ({ ...x, v: P22.P.get(x.k)?.v ?? null })).filter((x) => x.v && x.v[0] > 0);
    const porLocal = new Map(); for (const x of L) (porLocal.get(x.local) ?? porLocal.set(x.local, { n: [], a: [] }).get(x.local))[x.nova ? 'n' : 'a'].push(x);
    for (const x of L) {
      x.ref = refSem(porLocal.get(x.local).a, x, 'v');
      x.D = x.ref && valido(x.ref) >= 100 ? duncan(x.v, x.ref) : null;
      x.jov = jov(x.v); x.semBio = semBio(x.v);
      // 2026, mesma chave: perfil e comparecimento; referência = antigas de 2022 do mesmo local que existem em 2026
      x.v26 = perfil26(x.k, t); x.y26 = S[t].get(x.k);
    }
    const N = L.filter((x) => x.nova); const A = L.filter((x) => !x.nova);
    // convergência: D frente às antigas de 2022 do mesmo local de 2026 (todas as chaves antigas de 2022, perfil de 2026)
    const ref26 = new Map();
    for (const x of A) { if (!x.v26 || !x.y26) continue; const lk = x.y26.local; (ref26.get(lk) ?? ref26.set(lk, []).get(lk)).push(x); }
    for (const x of L) {
      if (!x.v26 || !x.y26 || !x.v26[0]) { x.D26 = null; continue; }
      const ref = refSem(ref26.get(x.y26.local) ?? [], x, 'v26');
      x.D26 = ref && valido(ref) >= 100 ? duncan(x.v26, ref) : null;
    }
    const jovCl = (x) => (x.jov < 0.05 ? '<5%' : x.jov < 0.1 ? '5-10%' : x.jov < 0.2 ? '10-20%' : '20%+');
    const sbCl = (x) => (x.semBio === 0 ? '0%' : x.semBio < 0.05 ? '0-5%' : '5%+');
    const dCl = (x) => (x.D === null ? 'sem base no local' : x.D < 0.1 ? '<0,10' : x.D < 0.2 ? '0,10-0,20' : x.D < 0.3 ? '0,20-0,30' : '0,30+');
    const dist = (a, f) => Object.fromEntries(['<100', '100-199', '200-299', '300+'].map((c) => [c, quant(a.filter((x) => tamCl(x.aptos) === c && f(x) !== null).map(f))]));
    const com26 = (a) => a.filter((x) => x.v26 && x.v26[0] > 0 && x.y26 && x.y26.aptos > 0);
    R[`D_novas2022_${t}t`] = {
      secoes: { novas: N.length, antigas: A.length, novasGe95: N.filter((x) => ge(x)).length, antigasGe95: A.filter((x) => ge(x)).length },
      semPerfil2022: L22[t].filter((x) => ufsAmbos.has(x.k.slice(0, 2)) && !P22.P.has(x.k)).length,
      excessoNestasUFs: padroniza(N, A),
      porLocal: padroniza(N, A, { cat: (x) => (x.zonaNova ? 'zona nova' : x.localNovo ? 'local novo' : porLocal.get(x.local).a.length ? 'local existente, com antigas' : 'local existente, só novas') }),
      porJovens: padroniza(N, A, { cat: jovCl }), porSemBio: padroniza(N, A, { cat: sbCl }), porDissimilaridade: padroniza(N, A, { cat: dCl }),
      tamanhoJovensSemBio: padroniza(N, A, { estrato: (x) => `${tam25(x)}|${jovCl(x)}|${sbCl(x)}` }),
      perfil2022: { novas: perfilGrupo(N.map((x) => x.v)), novasGe95: perfilGrupo(N.filter((x) => ge(x)).map((x) => x.v)), antigas: perfilGrupo(A.map((x) => x.v)), antigasGe95: perfilGrupo(A.filter((x) => ge(x)).map((x) => x.v)) },
      perfil2026MesmasSecoes: { novas: perfilGrupo(com26(N).map((x) => x.v26)), novasGe95em2022: perfilGrupo(com26(N.filter((x) => ge(x))).map((x) => x.v26)), antigas: perfilGrupo(com26(A).map((x) => x.v26)) },
      dissimilaridade2022: { novas: dist(N, (x) => x.D), antigas: dist(A, (x) => x.D), novasGe95: quant(N.filter((x) => ge(x) && x.D !== null).map((x) => x.D)) },
      dissimilaridade2026MesmasSecoes: { novas: dist(com26(N), (x) => x.D26), antigas: dist(com26(A), (x) => x.D26), novasGe95em2022: quant(com26(N.filter((x) => ge(x))).filter((x) => x.D26 !== null).map((x) => x.D26)) },
      porUF: padroniza(N, A, { cat: (x) => x.k.slice(0, 2) }),
    };
    log(`D turno ${t} ok`);
  }

  // E1. revisão do cadastro no município: parcela sem biometria em 2022 e em 2026 (perfil, todas as seções do município).
  // Uma queda grande indica revisão biométrica com cancelamento de quem não compareceu (o cadastro passa a ter só quem se
  // apresentou há pouco). Base da padronização: antigas de municípios da mesma classe.
  const munDe = (k) => k.split('/').slice(0, 2).join('/');
  const mun = (P) => { const M = new Map(); for (const [k, q] of P) { const m = munDe(k); const v = M.get(m) ?? M.set(m, [0, 0]).get(m); v[0] += q.v[0]; v[1] += q.v[0] - q.v[1]; } return M; };
  const M22 = mun(P22.P); const M26 = mun(P26.P);
  const dSemBioMun = (k) => { const a = M22.get(munDe(k)); const b = M26.get(munDe(k)); return a && b && a[0] && b[0] ? 100 * (b[1] / b[0] - a[1] / a[0]) : null; };
  const revCl = (x) => { const d = dSemBioMun(x.k); return d === null ? 'sem 2022' : d <= -20 ? 'queda de 20+ pontos' : d <= -10 ? 'queda de 10-20' : d <= -3 ? 'queda de 3-10' : d < 3 ? 'estável (±3)' : 'alta de 3+'; };
  const sbSec = (x) => { const v = perfil26(x.k, 2); return !v || !v[0] ? 's' : v[0] === v[1] ? '0%' : (v[0] - v[1]) / v[0] < 0.05 ? '0-5%' : '5%+'; };
  for (const t of [2, 1]) {
    const L = L26[t].filter((x) => ufsAmbos.has(x.k.slice(0, 2)));
    const N = L.filter((x) => x.nova); const A = L.filter((x) => !x.nova);
    const mClasse = Object.fromEntries(['queda de 20+ pontos', 'queda de 10-20', 'queda de 3-10', 'estável (±3)', 'alta de 3+', 'sem 2022'].map((c) => [c, { municipios: [...new Set(L.filter((x) => revCl(x) === c).map((x) => munDe(x.k)))].length, novas: ag(N.filter((x) => revCl(x) === c)), antigas: ag(A.filter((x) => revCl(x) === c)) }]));
    R[`E_revisao_municipio_${t}t`] = {
      classes: mClasse,
      porRevisao: padroniza(N, A, { cat: revCl }),
      tamanhoERevisao: padroniza(N, A, { estrato: (x) => `${tam25(x)}|${revCl(x)}`, cat: revCl }),
      tamanhoRevisaoSemBioDaSecao: padroniza(N, A, { estrato: (x) => `${tam25(x)}|${revCl(x)}|${sbSec(x)}`, cat: revCl }),
      porRevisaoESemBioDaSecao: padroniza(N, A, { cat: (x) => `${revCl(x)} | ${sbSec(x)}` }),
    };
  }
  // E2. TTE estimado = aptos do BU − eleitores do cadastro da seção (perfil). Validado em 2026 contra aptos_tte do BU; em 2022
  // só nos locais sem seção "órfã" do perfil (seção do perfil ausente do detalhe, em geral agregada, cujo principal não se conhece).
  {
    const val = { secoes: 0, igual: 0, tte0est0: 0, tte0: 0, tteMaior0: 0, tteMaior0estMaior0: 0 };
    for (const x of L26[2].filter((y) => ufsAmbos.has(y.k.slice(0, 2)))) {
      const v = perfil26(x.k, 2); if (!v) continue; const est = x.aptos - v[0];
      val.secoes++; if (est === x.tte) val.igual++; if (x.tte === 0) { val.tte0++; if (est <= 0) val.tte0est0++; } else { val.tteMaior0++; if (est > 0) val.tteMaior0estMaior0++; }
      x.tteEst = est;
    }
    const orfaLocal = new Set(); for (const [k, q] of P22.P) if (!d22.chaves.has(k)) orfaLocal.add(q.local);
    for (const t of [2, 1]) {
      const L = L22[t].filter((x) => ufsAmbos.has(x.k.slice(0, 2)) && P22.P.has(x.k) && !orfaLocal.has(x.local));
      for (const x of L) x.tteEst = x.aptos - P22.P.get(x.k).v[0];
      const s0 = (a) => a.filter((x) => x.tteEst <= 0);
      const N = L.filter((x) => x.nova); const A = L.filter((x) => !x.nova);
      const cl = (x) => (x.tteEst <= 0 ? 'sem TTE estimado' : x.tteEst <= 3 ? 'TTE est. 1-3' : 'TTE est. 4+');
      R[`E_tteEstimado_2022_${t}t`] = { secoesUsadas: L.length, foraPorLocalComOrfa: L22[t].filter((x) => ufsAmbos.has(x.k.slice(0, 2)) && P22.P.has(x.k) && orfaLocal.has(x.local)).length, distribuicao: { novas: N.reduce((m, x) => { m[cl(x)] = (m[cl(x)] ?? 0) + 1; return m; }, {}), antigas: A.reduce((m, x) => { m[cl(x)] = (m[cl(x)] ?? 0) + 1; return m; }, {}) }, porTTE: padroniza(N, A, { cat: cl }), semTTEporLocal: padroniza(s0(N), s0(A), { cat: catLocal }) };
      const L6 = L26[t].filter((x) => ufsAmbos.has(x.k.slice(0, 2))).map((x) => { const v = perfil26(x.k, t); return v ? { ...x, tteEst: x.aptos - v[0] } : null; }).filter(Boolean);
      const N6 = L6.filter((x) => x.nova); const A6 = L6.filter((x) => !x.nova);
      R[`E_tteEstimado_2026_${t}t`] = { secoesUsadas: L6.length, distribuicao: { novas: N6.reduce((m, x) => { m[cl(x)] = (m[cl(x)] ?? 0) + 1; return m; }, {}), antigas: A6.reduce((m, x) => { m[cl(x)] = (m[cl(x)] ?? 0) + 1; return m; }, {}) }, porTTE: padroniza(N6, A6, { cat: cl }), semTTEporLocal: padroniza(s0(N6), s0(A6), { cat: catLocal }) };
    }
    R.E_tteEstimado_validacao2026_2t = val;
  }
  // E3. estabilidade entre turnos: das seções novas com 95%+ num turno, quantas também passaram de 95% no outro
  {
    const ge26 = (k, t) => { const y = S[t].get(k); return y && y.aptos > 0 && y.comp / y.aptos >= 0.95; };
    R.E_estabilidade = {};
    for (const t of [1, 2]) {
      const N = L26[t].filter((x) => x.nova && ge(x)); const A = L26[t].filter((x) => !x.nova && ge(x));
      const N2 = L22[t].filter((x) => x.nova && ge(x)); const A2 = L22[t].filter((x) => !x.nova && ge(x));
      const g22 = (k, tt) => { const y = d22.t[tt].get(k); return y && y.aptos > 0 && y.comp / y.aptos >= 0.95; };
      R.E_estabilidade[`${t}t`] = { novas2026: [N.length, N.filter((x) => ge26(x.k, 3 - t)).length], antigas2026: [A.length, A.filter((x) => ge26(x.k, 3 - t)).length], novas2022: [N2.length, N2.filter((x) => g22(x.k, 3 - t)).length], antigas2022: [A2.length, A2.filter((x) => g22(x.k, 3 - t)).length], leitura: '[seções com 95%+ neste turno, das quais também 95%+ no outro turno]' };
    }
  }
  log('E ok');
}
const sufixo = opt.ufs ? `-${[...UFS_PERFIL].join('')}` : '';
await writeFile(path.join(OUT, `novas-2022-resumo${sufixo}.json`), JSON.stringify(R, null, 1));
if (!opt.ufs) await writeFile(path.join(OUT, 'novas-2022-trajetoria-ge95.tsv'), `${trajTsv.join('\n')}\n`);
console.log(JSON.stringify(R, null, 1));
