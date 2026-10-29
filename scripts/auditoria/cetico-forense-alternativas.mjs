// Revisor cético, achado "forense-sem-marca-de-fraude": explicações alternativas NÃO testadas pelo autor para a cauda de
// comparecimento alto com voto forte no 13 (canto ≥95%/≥95%: 64 seções contra ~7 da permutação; cauda ≥94%: 1.214).
// Uso: node scripts/auditoria/cetico-forense-alternativas.mjs   → data/parsed/auditoria/cetico/forense-alternativas.json e -canto.csv
//
// (a) Maligna, princípio 8: o comparecimento a mais vem de eleitores habilitados SEM biometria (sem biometria cadastrada,
//     liberado só pelo ano de nascimento; ou "por biografia": tinha digital, ela falhou e o mesário liberou). Se fosse isso,
//     as seções da cauda teriam fração sem biometria acima das vizinhas da zona e acima do que o cadastro prevê.
// (b) Benigna, tamanho: seção pequena tem comparecimento mais disperso; a permutação do autor mistura tamanhos.
//     Esperança exata da permutação dentro de (zona × faixa de aptos).
// (c) Persistência: comparecimento e fração sem biometria no 1º turno nas mesmas seções (UFs já carregadas).
// Banco: só leitura, pela cópia de abrirLeitura(). Votos e aptos de forense/secoes-2t.csv (forense-base.mjs).
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_SAIDA, RAIZ, chaveSecao, lerTabela, mediana, paraCsv, pearson } from './forense-lib.mjs';

const DIR = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico');
const num = ['agregadas', 'aptos', 'comparecimento', 'v13', 'v22', 'outros', 'branco', 'nulo'];
const secoes = (await lerTabela(path.join(DIR_SAIDA, 'secoes-2t.csv'), num)).filter((s) => s.aptos > 0 && s.v13 + s.v22 + s.outros > 0);
const porChave = new Map(secoes.map((s) => [chaveSecao(s), s]));

const { db, fonte } = await abrirLeitura();
console.log(`banco (leitura): ${fonte}`);
const carga1 = db.prepare('SELECT uf FROM carga WHERE turno = 1').all().map((r) => r.uf);
for (const t of [1, 2]) {
  for (const r of db.prepare('SELECT uf, municipio, zona, secao, comparecimento, sem_biometria, por_biometria, por_biografia FROM secao WHERE turno = ?').iterate(t)) {
    const s = porChave.get(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`);
    if (!s) continue;
    s[`bu${t}`] = { comp: r.comparecimento, sem: r.sem_biometria, bio: r.por_biometria, biog: r.por_biografia };
  }
}
// aptos do 1º turno (presidente) para o comparecimento do 1º turno
for (const r of db.prepare('SELECT uf, municipio, zona, secao, aptos FROM secao_eleicao WHERE turno = 1 AND eleicao = 6257').iterate()) {
  const s = porChave.get(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`);
  if (s && s.bu1) s.bu1.aptos = r.aptos;
}
db.close();

// Cadastro: fração de eleitores com biometria (perfil 17/07/2026), agregadas somadas na principal quando existir a chave.
for (const f of await readdir(path.join(DIR_SAIDA, 'perfil'))) {
  for (const p of await lerTabela(path.join(DIR_SAIDA, 'perfil', f), ['eleitores', 'biometria'])) {
    const s = porChave.get(chaveSecao(p));
    if (!s) continue;
    s.cad = s.cad ?? { e: 0, b: 0 };
    s.cad.e += p.eleitores; s.cad.b += p.biometria;
  }
}
const categoria = new Map((await lerTabela(path.join(DIR_SAIDA, 'klimek-2t-canto.csv'))).map((l) => [chaveSecao(l), l]));

for (const s of secoes) {
  s.val = s.v13 + s.v22 + s.outros;
  s.tc = s.comparecimento / s.aptos;
  s.sh = s.v13 / s.val;
  const b = s.bu2;
  if (b && b.comp > 0) {
    s.semBio = (b.sem + b.biog) / b.comp; // fração dos votantes habilitados sem digital
    s.semCad = b.sem / b.comp; // sem biometria cadastrada (só ano de nascimento)
    s.biog = b.biog / b.comp; // tinha digital, falhou, liberado pelo mesário / digital nova
  }
  s.cadSemBio = s.cad && s.cad.e > 0 ? 1 - s.cad.b / s.cad.e : null;
  if (s.bu1 && s.bu1.aptos > 0) { s.tc1 = s.bu1.comp / s.bu1.aptos; s.semBio1 = s.bu1.comp > 0 ? (s.bu1.sem + s.bu1.biog) / s.bu1.comp : null; }
}
const checagem = secoes.filter((s) => s.bu2 && s.bu2.comp !== s.comparecimento).length;

const zonas = new Map();
for (const s of secoes) { const k = `${s.uf}/${s.zona}`; if (!zonas.has(k)) zonas.set(k, []); zonas.get(k).push(s); }

// Diferença de cada seção para a média das OUTRAS seções da zona.
for (const g of zonas.values()) {
  for (const campo of ['semBio', 'semCad', 'biog', 'cadSemBio', 'tc']) {
    const vals = g.filter((s) => s[campo] != null);
    const soma = vals.reduce((a, s) => a + s[campo], 0);
    for (const s of vals) s[`d_${campo}`] = vals.length > 1 ? s[campo] - (soma - s[campo]) / (vals.length - 1) : null;
  }
}

const grupos = {
  canto95_13: (s) => s.tc >= 0.95 && s.sh >= 0.95,
  canto95_13_comuns: (s) => s.tc >= 0.95 && s.sh >= 0.95 && categoria.get(chaveSecao(s))?.categoria === 'comum',
  canto95_13_aldeia_quilombo_presidio: (s) => s.tc >= 0.95 && s.sh >= 0.95 && ['indigena', 'quilombola', 'prisional'].includes(categoria.get(chaveSecao(s))?.categoria),
  cauda94: (s) => s.tc >= 0.94,
  cauda94_13_ge60: (s) => s.tc >= 0.94 && s.sh >= 0.6,
  cauda94_13_lt60: (s) => s.tc >= 0.94 && s.sh < 0.6,
  todas: () => true,
};
const media = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const r4 = (x) => (x == null ? null : +x.toFixed(4));
const resumo = {};
for (const [nome, f] of Object.entries(grupos)) {
  const g = secoes.filter(f);
  const com = (c) => g.filter((s) => s[c] != null);
  // Votos "a mais" de comparecimento (acima da média da zona) contra votos "a mais" sem biometria (acima da taxa da zona).
  let excessoComp = 0, excessoSemBio = 0;
  for (const s of g) {
    if (s.d_tc == null || s.d_semBio == null) continue;
    excessoComp += s.d_tc * s.aptos;
    excessoSemBio += s.d_semBio * s.comparecimento;
  }
  resumo[nome] = {
    secoes: g.length, aptosMediana: mediana(g.map((s) => s.aptos)),
    semBio: r4(media(com('semBio').map((s) => s.semBio))), d_semBio_zona: r4(media(com('d_semBio').map((s) => s.d_semBio))),
    fracaoAcimaDaZona_semBio: r4(com('d_semBio').filter((s) => s.d_semBio > 0).length / Math.max(1, com('d_semBio').length)),
    semCad: r4(media(com('semCad').map((s) => s.semCad))), biog: r4(media(com('biog').map((s) => s.biog))),
    d_biog_zona: r4(media(com('d_biog').map((s) => s.d_biog))),
    cadastroSemBio: r4(media(com('cadSemBio').map((s) => s.cadSemBio))), d_cadastroSemBio_zona: r4(media(com('d_cadSemBio').map((s) => s.d_cadSemBio))),
    excessoComparecimentoVotos: Math.round(excessoComp), excessoSemBiometriaVotos: Math.round(excessoSemBio),
    com1t: com('tc1').length, comp1tMedia: r4(media(com('tc1').map((s) => s.tc1))), fracao1tGe90: r4(com('tc1').filter((s) => s.tc1 >= 0.9).length / Math.max(1, com('tc1').length)),
    semBio1t: r4(media(com('semBio1').map((s) => s.semBio1))),
  };
}

// Correlações dentro da zona (variáveis centradas na zona): comparecimento × fração sem biometria, e parcela do 13 × idem.
function rZona(fx, fy, filtro = () => true) {
  const dx = [], dy = [];
  for (const g0 of zonas.values()) {
    const g = g0.filter((s) => filtro(s) && fx(s) != null && fy(s) != null);
    if (g.length < 3) continue;
    const mx = media(g.map(fx)), my = media(g.map(fy));
    for (const s of g) { dx.push(fx(s) - mx); dy.push(fy(s) - my); }
  }
  return { n: dx.length, r: r4(pearson(dx, dy)) };
}
const correlacoes = {
  comparecimento_x_semBio: rZona((s) => s.tc, (s) => s.semBio),
  comparecimento_x_biog: rZona((s) => s.tc, (s) => s.biog),
  comparecimento_x_semCad: rZona((s) => s.tc, (s) => s.semCad),
  parcela13_x_semBio: rZona((s) => s.sh, (s) => s.semBio),
  parcela13_x_biog: rZona((s) => s.sh, (s) => s.biog),
  // o comparecimento sem biometria "a mais" que o cadastro prevê (sem biometria cadastrada observada − cadastro)
  comparecimento_x_semCadMenosCadastro: rZona((s) => s.tc, (s) => (s.semCad != null && s.cadSemBio != null ? s.semCad - s.cadSemBio : null)),
};

// (b) Tamanho: esperança exata da permutação do comparecimento dentro de (zona × faixa de aptos).
const faixa = (a) => (a < 50 ? 0 : a < 100 ? 1 : a < 200 ? 2 : a < 300 ? 3 : 4);
function esperancaPermutacao(chave, t = 0.95, v = 0.95) {
  const g = new Map();
  for (const s of secoes) { const k = chave(s); if (!g.has(k)) g.set(k, { n: 0, c: 0, p: 0 }); const o = g.get(k); o.n++; if (s.tc >= t) o.c++; if (s.sh >= v) o.p++; }
  let e = 0; for (const o of g.values()) e += (o.c * o.p) / o.n; return +e.toFixed(1);
}
const tamanho = {
  observado: secoes.filter(grupos.canto95_13).length,
  permutacaoZona: esperancaPermutacao((s) => `${s.uf}/${s.zona}`),
  permutacaoZonaFaixaAptos: esperancaPermutacao((s) => `${s.uf}/${s.zona}/${faixa(s.aptos)}`),
  permutacaoMunicipioFaixaAptos: esperancaPermutacao((s) => `${s.uf}/${s.municipio}/${faixa(s.aptos)}`),
  permutacaoLocal: esperancaPermutacao((s) => `${s.uf}/${s.municipio}/${s.zona}/${s.local}`),
  canto95_22: secoes.filter((s) => s.tc >= 0.95 && s.v22 / s.val >= 0.95).length,
  permutacaoZona_22: (() => { let e = 0; const g = new Map(); for (const s of secoes) { const k = `${s.uf}/${s.zona}`; if (!g.has(k)) g.set(k, { n: 0, c: 0, p: 0 }); const o = g.get(k); o.n++; if (s.tc >= 0.95) o.c++; if (s.v22 / s.val >= 0.95) o.p++; } for (const o of g.values()) e += (o.c * o.p) / o.n; return +e.toFixed(1); })(),
};
// seções do canto que são a única do seu local de votação (a permutação por local fica degenerada nelas)
const porLocal = new Map();
for (const s of secoes) { const k = `${s.uf}/${s.municipio}/${s.zona}/${s.local}`; porLocal.set(k, (porLocal.get(k) ?? 0) + 1); }
tamanho.cantoUnicaDoLocal = secoes.filter((s) => grupos.canto95_13(s) && porLocal.get(`${s.uf}/${s.municipio}/${s.zona}/${s.local}`) === 1).length;

const canto = secoes.filter(grupos.canto95_13).map((s) => ({
  uf: s.uf, municipio: s.municipio, nome_municipio: s.nome_municipio, zona: s.zona, secao: s.secao,
  categoria: categoria.get(chaveSecao(s))?.categoria ?? '', nome_local: categoria.get(chaveSecao(s))?.nome_local ?? '',
  aptos: s.aptos, comparecimento: s.comparecimento, pct_comp: +(100 * s.tc).toFixed(1), pct13: +(100 * s.sh).toFixed(1),
  sem_biometria_cadastrada: s.bu2?.sem, por_biografia: s.bu2?.biog, por_biometria: s.bu2?.bio,
  pct_sem_digital: s.semBio == null ? '' : +(100 * s.semBio).toFixed(1), dif_zona_pp: s.d_semBio == null ? '' : +(100 * s.d_semBio).toFixed(1),
  cadastro_sem_bio_pct: s.cadSemBio == null ? '' : +(100 * s.cadSemBio).toFixed(1),
  pct_comp_1t: s.tc1 == null ? '' : +(100 * s.tc1).toFixed(1), pct_sem_digital_1t: s.semBio1 == null ? '' : +(100 * s.semBio1).toFixed(1),
})).sort((a, b) => (b.dif_zona_pp || 0) - (a.dif_zona_pp || 0));

const saida = { fonte, ufsPrimeiroTurnoNoBanco: carga1.length, secoes: secoes.length, comparecimentoBuDiferenteDoCsv: checagem, resumo, correlacoes, tamanho };
await mkdir(DIR, { recursive: true });
await writeFile(path.join(DIR, 'forense-alternativas.json'), JSON.stringify(saida, null, 1));
await writeFile(path.join(DIR, 'forense-alternativas-canto.csv'), paraCsv(canto, Object.keys(canto[0])));
console.log(JSON.stringify(saida, null, 1));
