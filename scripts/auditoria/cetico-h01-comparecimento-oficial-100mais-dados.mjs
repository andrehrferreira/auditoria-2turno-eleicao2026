// Revisor cético, achado h01-comparecimento-oficial-100mais (lente: dados e definições).
// Confere se o que o demógrafo compara é comparável: faixa etária e data de referência da idade no
// perfil_comparecimento_abstencao (out/2026) × perfil_eleitor_secao (jul/2026), universo de UF (ZZ/VT),
// definição de biometria no limite inferior de 157, TTE, teto do Censo (data de referência e residente × eleitor)
// e a linha de base do teste de concentração. Tudo agregado; nenhum dado individual.
// Uso (um modo por vez, cada um é um processo pesado):
//   node scripts/auditoria/cetico-h01-comparecimento-oficial-100mais-dados.mjs leiame
//   node scripts/auditoria/cetico-h01-comparecimento-oficial-100mais-dados.mjs comparecimento   (~5 min)
//   node scripts/auditoria/cetico-h01-comparecimento-oficial-100mais-dados.mjs perfil           (~15 min, 28 zips brutos)
//   node scripts/auditoria/cetico-h01-comparecimento-oficial-100mais-dados.mjs analise
// Saídas: data/parsed/auditoria/cetico/h01co-*.json|tsv e h01co-leiame/
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { pipeline } from 'node:stream/promises';
import { createInflateRaw } from 'node:zlib';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { entradasZip, linhasBrutas } from './contagem-zip.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(RAIZ, 'data/parsed/auditoria/cetico');
const ZIP_COMP = path.join(RAIZ, 'data/raw/dadosabertos/perfil_comparecimento_abstencao/perfil_comparecimento_abstencao_2026.zip');
const DIR_PERFIL = path.join(RAIZ, 'data/raw/dadosabertos/perfil_eleitor_secao');
const DEMO = path.join(RAIZ, 'data/parsed/auditoria/demografo');
const IBGE = path.join(RAIZ, 'data/raw/externos/ibge');
mkdirSync(OUT, { recursive: true });
const r4 = (x) => Math.round(x * 1e4) / 1e4;
const FX = ['f16_17', 'f18_69', 'f70_79', 'f80_89', 'f90_99', 'f100', 'invalida'];
const faixa = (c) => (c === 1600 || c === 1700 ? 'f16_17' : c === 7074 || c === 7579 ? 'f70_79' : c === 8084 || c === 8589 ? 'f80_89'
  : c === 9094 || c === 9599 ? 'f90_99' : c === 9999 ? 'f100' : c >= 1800 && c <= 6569 ? 'f18_69' : 'invalida');
const modo = process.argv[2];

// ---------------------------------------------------------------- leiame: extrai os PDFs de dentro dos zips
if (modo === 'leiame') {
  const zips = { perfil_comparecimento_abstencao: ZIP_COMP, perfil_eleitor_secao_AC: path.join(DIR_PERFIL, 'perfil_eleitor_secao_2026_AC.zip'), perfil_eleitor_secao_SP: path.join(DIR_PERFIL, 'perfil_eleitor_secao_2026_SP.zip') };
  for (const [nome, zip] of Object.entries(zips)) {
    const ents = await entradasZip(zip);
    console.log(nome, ents.map((e) => `${e.nome} (${e.tamanho})`).join(', '));
    const e = ents.find((x) => x.nome.toLowerCase().endsWith('.pdf'));
    const dir = path.join(OUT, 'h01co-leiame', nome); mkdirSync(dir, { recursive: true });
    const f = createReadStream(zip, { start: e.inicioDados, end: e.inicioDados + e.tamanhoComprimido - 1 });
    await pipeline(e.metodo === 8 ? f.pipe(createInflateRaw()) : f, createWriteStream(path.join(dir, 'leiame.pdf')));
    console.log(' ->', path.join(dir, 'leiame.pdf'), '(ler com pdftotext -layout)');
  }
}

// ---------------------------------------------------------------- comparecimento: todos os CSVs por UF (inclui ZZ e linhas VT) e o BRASIL
if (modo === 'comparecimento') {
  const ents = (await entradasZip(ZIP_COMP)).filter((x) => x.nome.endsWith('.csv'));
  const zonas = {}; // turno|sg_uf|mun|zona -> faixa -> [aptos, comp, compTTE, abstTTE]
  const porArquivo = {}; // arquivo -> sg_uf -> faixa -> [aptos, comp]
  const fino = {}; // origem(UF|BRASIL)|codigo -> [aptos, comp, descricao]
  const meta = { geracao: new Set(), turnos: new Set(), sg_uf_por_arquivo: {} };
  for (const e of ents) {
    const arq = e.nome.replace(/^.*_2026_/, '').replace('.csv', '');
    const ehBr = arq === 'BRASIL';
    let col = null; const sgs = new Set(); const pa = (porArquivo[arq] = {});
    for await (const c of linhasBrutas(ZIP_COMP, e)) {
      if (!col) { col = Object.fromEntries(c.map((n, i) => [n.trim(), i])); continue; }
      const t = c[col.NR_TURNO].trim(); const sg = c[col.SG_UF].trim(); sgs.add(sg); meta.turnos.add(t);
      meta.geracao.add(c[col.DT_GERACAO].trim());
      const cod = Number(c[col.CD_FAIXA_ETARIA]); const f = faixa(cod);
      const ap = Number(c[col.QT_APTOS]), cp = Number(c[col.QT_COMPARECIMENTO]);
      const ct = Number(c[col.QT_COMPARECIMENTO_TTE]), at = Number(c[col.QT_ABSTENCAO_TTE]);
      const u = (pa[sg] ??= Object.fromEntries(FX.map((x) => [x, [0, 0]]))); u[f][0] += ap; u[f][1] += cp;
      const kf = `${ehBr ? 'BRASIL' : 'UF'}|${cod}`; const v = (fino[kf] ??= [0, 0, c[col.DS_FAIXA_ETARIA].trim()]); v[0] += ap; v[1] += cp;
      if (ehBr) continue;
      const k = `${t}|${sg.toLowerCase()}|${c[col.CD_MUNICIPIO].trim().padStart(5, '0')}|${c[col.NR_ZONA].trim().padStart(4, '0')}`;
      const z = (zonas[k] ??= Object.fromEntries(FX.map((x) => [x, [0, 0, 0, 0]])));
      z[f][0] += ap; z[f][1] += cp; z[f][2] += ct; z[f][3] += at;
    }
    meta.sg_uf_por_arquivo[arq] = [...sgs];
    console.log(arq, [...sgs].join(','));
  }
  writeFileSync(path.join(OUT, 'h01co-comparecimento.json'), JSON.stringify({ geracao: [...meta.geracao], turnos: [...meta.turnos], sg_uf_por_arquivo: meta.sg_uf_por_arquivo, por_arquivo: porArquivo, fino, zonas }));
  console.log('ok', Object.keys(zonas).length, 'zonas');
}

// ---------------------------------------------------------------- perfil: recontagem bruta por zona e faixa (todas as faixas), com biometria
if (modo === 'perfil') {
  const zonas = {}; const geracao = {}; let linhas = 0;
  for (const f of readdirSync(DIR_PERFIL).filter((x) => x.endsWith('.zip')).sort()) {
    const uf = f.match(/_([A-Z]{2})\.zip$/)[1].toLowerCase();
    const e = (await entradasZip(path.join(DIR_PERFIL, f))).find((x) => x.nome.endsWith('.csv'));
    let fl = createReadStream(path.join(DIR_PERFIL, f), { start: e.inicioDados, end: e.inicioDados + e.tamanhoComprimido - 1, highWaterMark: 1 << 20 });
    if (e.metodo === 8) fl = fl.pipe(createInflateRaw({ chunkSize: 1 << 20 }));
    const rl = readline.createInterface({ input: fl.setEncoding('latin1'), crlfDelay: Infinity });
    let idx = null; const g = new Set();
    for await (const l of rl) {
      if (!l) continue;
      const c = l.split(';').map((x) => x.trim().replace(/^"|"$/g, ''));
      if (!idx) { idx = Object.fromEntries(c.map((n, i) => [n, i])); continue; }
      linhas++; g.add(c[idx.DT_GERACAO]);
      const k = `${uf}|${c[idx.CD_MUNICIPIO].padStart(5, '0')}|${c[idx.NR_ZONA].padStart(4, '0')}`;
      const fx = faixa(Number(c[idx.CD_FAIXA_ETARIA]));
      const z = (zonas[k] ??= Object.fromEntries(FX.map((x) => [x, [0, 0]])));
      z[fx][0] += Number(c[idx.QT_ELEITORES]); z[fx][1] += Number(c[idx.QT_ELEITORES_BIOMETRIA]);
    }
    geracao[uf] = [...g];
    console.log(uf, linhas);
  }
  writeFileSync(path.join(OUT, 'h01co-perfil-zonas.json'), JSON.stringify({ geracao, linhas, zonas }));
}

// ---------------------------------------------------------------- análise
if (modo === 'analise') {
  const C = JSON.parse(readFileSync(path.join(OUT, 'h01co-comparecimento.json'), 'utf8'));
  const P = JSON.parse(readFileSync(path.join(OUT, 'h01co-perfil-zonas.json'), 'utf8'));
  const R = { fonte: { comparecimento_geracao: C.geracao, turnos: C.turnos, sg_uf_por_arquivo: C.sg_uf_por_arquivo, perfil_geracao: P.geracao, perfil_linhas: P.linhas } };

  // 1. Universo: 18–69 e 100+ por recorte (UFs sem ZZ/VT = autor; com ZZ; BRASIL = parecer 03)
  const soma = (filtro) => { const o = Object.fromEntries(FX.map((f) => [f, [0, 0]])); for (const [arq, por] of Object.entries(C.por_arquivo)) for (const [sg, u] of Object.entries(por)) if (filtro(arq, sg)) for (const f of FX) { o[f][0] += u[f][0]; o[f][1] += u[f][1]; } return o; };
  const fmt = (o) => Object.fromEntries(FX.map((f) => [f, { aptos: o[f][0], comp: o[f][1], taxa: r4(o[f][1] / o[f][0]) }]));
  const ufs = soma((a, sg) => a !== 'BRASIL' && sg !== 'ZZ' && sg !== 'VT');
  const zz = soma((a, sg) => a !== 'BRASIL' && sg === 'ZZ'); const vt = soma((a, sg) => a !== 'BRASIL' && sg === 'VT');
  const br = soma((a) => a === 'BRASIL');
  R.universo = { ufs_sem_zz_vt_autor: fmt(ufs), zz_exterior: fmt(zz), vt: fmt(vt), arquivo_brasil_parecer03: fmt(br),
    brasil_menos_ufs_menos_zz: Object.fromEntries(FX.map((f) => [f, [br[f][0] - ufs[f][0] - zz[f][0] - vt[f][0], br[f][1] - ufs[f][1] - zz[f][1] - vt[f][1]]])) };
  R.universo.dif_100_18_69 = { autor: r4(ufs.f100[1] / ufs.f100[0] - ufs.f18_69[1] / ufs.f18_69[0]), brasil: r4(br.f100[1] / br.f100[0] - br.f18_69[1] / br.f18_69[0]), se_100_nao_votasse_autor: r4(-ufs.f18_69[1] / ufs.f18_69[0]) };
  R.codigos_faixa = Object.fromEntries(Object.entries(C.fino).filter(([k]) => k.startsWith('UF|')).map(([k, v]) => [k.slice(3), { desc: v[2], aptos: v[0], comp: v[1] }]));

  // 2. Faixa e data de referência: aptos por zona e faixa, comparecimento (out) × perfil bruto (jul), todas as faixas
  const t1 = Object.entries(C.zonas).filter(([k]) => k.startsWith('1|') && !/\|(zz|vt)\|/.test(k)).map(([k, z]) => [k.slice(2), z]);
  const mapaC = new Map(t1); const chavesP = Object.keys(P.zonas).filter((k) => !k.startsWith('zz|'));
  const dif = Object.fromEntries(FX.map((f) => [f, { soma_abs: 0, zonas_diferentes: 0, liquida: 0 }]));
  for (const k of new Set([...mapaC.keys(), ...chavesP])) {
    const c = mapaC.get(k); const p = P.zonas[k];
    for (const f of FX) { const d = (c?.[f][0] ?? 0) - (p?.[f][0] ?? 0); dif[f].soma_abs += Math.abs(d); dif[f].liquida += d; if (d) dif[f].zonas_diferentes++; }
  }
  R.aptos_comparecimento_x_perfil_por_faixa = { zonas_comparecimento: mapaC.size, zonas_perfil: chavesP.length, so_no_comparecimento: [...mapaC.keys()].filter((k) => !P.zonas[k]).length, so_no_perfil: chavesP.filter((k) => !mapaC.has(k)).length, dif };
  // ZZ também
  const difZZ = Object.fromEntries(FX.map((f) => [f, 0]));
  for (const [k, z] of Object.entries(C.zonas).filter(([k]) => k.startsWith('1|zz|'))) { const p = P.zonas[k.slice(2)]; for (const f of FX) difZZ[f] += Math.abs(z[f][0] - (p?.[f][0] ?? 0)); }
  R.aptos_comparecimento_x_perfil_por_faixa.zz_soma_abs = difZZ;

  // 3. Conferência do perfil do autor (data/parsed/auditoria/demografo/perfil) contra a recontagem bruta
  const autor = new Map();
  for (const f of readdirSync(path.join(DEMO, 'perfil'))) {
    const ls = readFileSync(path.join(DEMO, 'perfil', f), 'utf8').trimEnd().split('\n'); const cab = ls[0].split('\t');
    for (const l of ls.slice(1)) { const c = l.split('\t'); const k = `${c[0]}|${c[1]}|${c[2]}`; const v = c.slice(4).map(Number); const a = autor.get(k); if (!a) autor.set(k, v); else for (let i = 0; i < v.length; i++) a[i] += v[i]; }
    R._cab = cab;
  }
  const I = Object.fromEntries(R._cab.slice(4).map((n, i) => [n, i])); delete R._cab;
  let difAutor100 = 0, difAutorSem100 = 0, difAutorSem90 = 0;
  for (const [k, p] of Object.entries(P.zonas)) { const a = autor.get(k); difAutor100 += Math.abs((a?.[I.f100] ?? 0) - p.f100[0]); difAutorSem100 += Math.abs((a?.[I.sembio_f100] ?? 0) - (p.f100[0] - p.f100[1])); difAutorSem90 += Math.abs((a?.[I.sembio_f90_99] ?? 0) - (p.f90_99[0] - p.f90_99[1])); }
  R.perfil_autor_x_bruto = { soma_abs_100: difAutor100, soma_abs_sembio_100: difAutorSem100, soma_abs_sembio_90_99: difAutorSem90, zonas_autor: autor.size, zonas_bruto: Object.keys(P.zonas).length };

  // 4. Limite inferior "sem biometria" (100+ e 90–99), com sensibilidades
  const { db, fonte } = await abrirLeitura(); R.fonte.banco = fonte;
  const carga1 = db.prepare('SELECT uf FROM carga WHERE turno = 1 ORDER BY uf').all().map((r) => r.uf);
  const bu = new Map(db.prepare('SELECT uf, municipio, zona, SUM(sem_biometria) sem, SUM(comparecimento) comp, COUNT(*) n FROM secao WHERE turno = 1 GROUP BY uf, municipio, zona').all().map((r) => [`${r.uf}|${r.municipio}|${r.zona}`, r]));
  const municipios = new Map(db.prepare('SELECT codigo, uf, nome, codigo_ibge FROM municipio').all().map((m) => [m.codigo, m]));
  const lb = { f100: { total: 0, zonas: 0, com_zero_bio: 0, tte_comp_nas_zonas: 0, por_uf: {} }, f90_99: { total: 0, zonas: 0 } };
  const linhasLb = [['uf', 'municipio', 'nome', 'zona', 'aptos_100', 'com_bio_100', 'votantes_100', 'comp_tte_100', 'lb_100', 'lb_100_sem_tte', 'bu_sem_biometria_zona_todas_idades', 'bu_carregado']];
  let lbSemTTE = 0, buViola = 0, buZonasChecadas = 0, buLbChecado = 0;
  for (const [k, z] of mapaC) {
    const p = P.zonas[k]; if (!p) continue; const [uf, mun, zona] = k.split('|');
    const com = p.f100[1]; const l = Math.max(0, z.f100[1] - com); const lt = Math.max(0, z.f100[1] - z.f100[2] - com);
    const l90 = Math.max(0, z.f90_99[1] - p.f90_99[1]); lb.f90_99.total += l90; if (l90) lb.f90_99.zonas++;
    if (!l) continue;
    lb.f100.total += l; lb.f100.zonas++; lbSemTTE += lt; lb.f100.tte_comp_nas_zonas += z.f100[2]; if (com === 0) lb.f100.com_zero_bio += l;
    lb.f100.por_uf[uf] = (lb.f100.por_uf[uf] ?? 0) + l;
    const b = bu.get(k); const carregado = carga1.includes(uf);
    if (b && carregado) { buZonasChecadas++; buLbChecado += l; if (b.sem < l) buViola++; }
    linhasLb.push([uf, mun, municipios.get(mun)?.nome ?? '', zona, z.f100[0], com, z.f100[1], z.f100[2], l, lt, b?.sem ?? '', carregado ? 1 : 0]);
  }
  lb.f100.sem_contar_votantes_tte = lbSemTTE;
  lb.f100.checagem_bu = { ufs_1t_no_banco: carga1, zonas_checadas: buZonasChecadas, lb_coberto: buLbChecado, zonas_bu_sem_biometria_menor_que_lb: buViola };
  // sensibilidade: quanto o "com biometria" do perfil teria de estar subestimado para zerar o limite (definição de biometria do parecer 01 vai no sentido oposto)
  let precisaria = 0; for (const [k, z] of mapaC) { const p = P.zonas[k]; if (!p) continue; precisaria += Math.max(0, z.f100[1] - p.f100[1]); }
  lb.f100.biometria_a_mais_para_zerar = precisaria;
  R.limite_inferior = lb;
  writeFileSync(path.join(OUT, 'h01co-zonas-lb100.tsv'), linhasLb.map((x) => x.join('\t')).join('\n') + '\n');

  // 5. Teto do Censo: data de referência (quem tem 95 anos em 31/07/2022 pode ter 100 em 04/10/2026) e municípios sem par
  const censo = new Map();
  for (const l of JSON.parse(readFileSync(path.join(IBGE, 'censo2022-9514-idade-c.json'), 'utf8')).slice(1)) { const o = censo.get(l.D1C) ?? {}; o[l.D5C] = Number(l.V) || 0; censo.set(l.D1C, o); }
  const mun = new Map();
  for (const [k, z] of mapaC) { const [uf, m] = k.split('|'); const p = P.zonas[k]; const a = mun.get(m) ?? { uf, m, a100: 0, c100: 0, com100: 0 }; a.a100 += z.f100[0]; a.c100 += z.f100[1]; a.com100 += p?.f100[1] ?? 0; mun.set(m, a); }
  let semPar = 0, semParVot = 0, semParAptos = 0; const teto = { coorte96: 0, coorte96_mais_95x65_365: 0, coorte95_inteira: 0 }; const acima = [];
  for (const a of mun.values()) {
    const c = censo.get(municipios.get(a.m)?.codigo_ibge); if (!c) { semPar++; semParVot += a.c100; semParAptos += a.a100; continue; }
    const p96 = c['60041'] - c['6648'] + c['6653']; const p95 = c['6648'];
    if (a.c100 > p96) teto.coorte96++; if (a.c100 > p96 + p95 * 65 / 365) teto.coorte96_mais_95x65_365++; if (a.c100 > p96 + p95) teto.coorte95_inteira++;
    if (a.c100 > p96) acima.push({ uf: a.uf, mun: a.m, nome: municipios.get(a.m)?.nome, votantes_100: a.c100, aptos_100: a.a100, com_bio_100: a.com100, p96, p95, p90_94: c['60040'] });
  }
  R.teto_censo = { municipios_acima: teto, sem_par_ibge: { municipios: semPar, aptos_100: semParAptos, votantes_100: semParVot }, acima_coorte96: acima };

  // 6. Concentração: linha de base da UF (autor) × linha de base pela composição de biometria do município
  const RES = JSON.parse(readFileSync(path.join(DEMO, 'oficial-resumo.json'), 'utf8')).turno1;
  const g = RES.goodman_nacional.f100; const taxaUf = Object.fromEntries(Object.entries(RES.taxa_100_por_uf).map(([u, v]) => [u, v.taxa]));
  function lgamma(x) { const cf = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502971239, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]; if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x); x -= 1; let a = cf[0]; const t = x + 7.5; for (let i = 1; i < 9; i++) a += cf[i] / (x + i); return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a); }
  const cauda = (n, k, p) => { if (k <= 0) return 1; let s = 0; for (let j = k; j <= n; j++) s += Math.exp(lgamma(n + 1) - lgamma(j + 1) - lgamma(n - j + 1) + j * Math.log(p) + (n - j) * Math.log(1 - p)); return Math.min(1, s); };
  const test = [];
  for (const a of mun.values()) {
    if (!a.a100) continue;
    const pUf = taxaUf[a.uf]; const pBio = Math.min(0.999, Math.max(1e-6, (a.com100 * g.r_com + (a.a100 - a.com100) * g.r_sem) / a.a100));
    test.push({ uf: a.uf, mun: a.m, nome: municipios.get(a.m)?.nome, aptos_100: a.a100, votantes_100: a.c100, com_bio_100: a.com100, p_uf: cauda(a.a100, a.c100, pUf), p_bio: cauda(a.a100, a.c100, pBio), esperado_bio: r4(a.a100 * pBio) });
  }
  const bonf = 0.05 / test.length;
  const sigUf = test.filter((x) => x.p_uf < bonf); const sigBio = test.filter((x) => x.p_bio < bonf);
  R.concentracao = { testados: test.length, bonferroni: bonf, r_com: g.r_com, r_sem: g.r_sem,
    sig_linha_base_uf: sigUf.length, sig_linha_base_biometria: sigBio.length, abaixo_0_01_uf: test.filter((x) => x.p_uf < 0.01).length, abaixo_0_01_bio: test.filter((x) => x.p_bio < 0.01).length,
    dos_15_continuam: sigUf.filter((x) => x.p_bio < bonf).map((x) => x.nome), lista_bio: sigBio.sort((a, b) => a.p_bio - b.p_bio).map((x) => ({ ...x, p_uf: Number(x.p_uf.toPrecision(3)), p_bio: Number(x.p_bio.toPrecision(3)) })),
    os_15_autor: sigUf.sort((a, b) => a.p_uf - b.p_uf).map((x) => ({ nome: x.nome, uf: x.uf, aptos_100: x.aptos_100, votantes_100: x.votantes_100, com_bio_100: x.com_bio_100, esperado_bio: x.esperado_bio, p_uf: Number(x.p_uf.toPrecision(3)), p_bio: Number(x.p_bio.toPrecision(3)) })) };
  writeFileSync(path.join(OUT, 'h01co-analise.json'), JSON.stringify(R, null, 1));
  console.log(JSON.stringify(R, null, 1));
}
if (!['leiame', 'comparecimento', 'perfil', 'analise'].includes(modo)) console.error('modo: leiame | comparecimento | perfil | analise');
if (modo && !existsSync(OUT)) console.error('saída ausente');
