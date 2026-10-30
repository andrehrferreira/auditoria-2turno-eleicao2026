// Matemático forense, H16 parte 3: vetor multicargo do BU repetido entre seções (1º turno; com --turno 2 serve de
// conferência com o boato 02, que fez só presidente).
//
// Vetor da seção = todos os votos do BU de todos os cargos e eleições (nominal por número, legenda por partido, branco,
// nulo), em forma canônica. Duas seções "colidem" se o vetor inteiro é igual.
//
// Modelo nulo declarado ANTES de rodar:
//   Estrato g = (UF, conjunto de cargos, comparecimento n = votos de presidente, que no SA substitui o comparecimento 0). Dentro do estrato as seções são sorteios independentes.
//   Para cada cargo c, q_c(g) = fração dos pares do estrato com o mesmo vetor do cargo c (medida nos próprios dados).
//   H0 (cargos independentes dado o estrato): pares multicargo esperados E(g) = pares(g) × Π_c q_c(g).
//   Teto determinístico: pares multicargo ≤ min_c pares do cargo c (não é modelo; é aritmética).
//   O modelo é generoso com o acaso quando n é pequeno (q_c grande) e não tem viés para baixo por espalhar demais
//   (usa as coincidências reais de cada cargo, não um sorteio multinomial; o boato 02 mostrou que o sorteio subestima).
// Violação (declarada antes): (a) par multicargo num estrato com E(g) < 0,01; ou (b) grupo de seções iguais que
//   compartilha urna (nº interno), código de carga, pacote (hash), cartão de votação (FV), flash de carga (FC) ou
//   mídia (MV/MR). Seções com comparecimento 0 ficam à parte (vetor vazio colide por definição).
// Saída: data/parsed/auditoria/h16/vetores-<t>t.json e vetores-<t>t-grupos.csv; por tamanho, vetores-<t>t-por-n.csv.
// Uso: node scripts/auditoria/matematico-h16-vetores.mjs --turno 1 [--uf ac,df]
import { createHash } from 'node:crypto';
import { createReadStream, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS, UFS } from '../../src/config.js';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '1' }, uf: { type: 'string' } } });
const turno = Number(values.turno);
const ufs = values.uf ? values.uf.split(',') : UFS;
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'h16');
mkdirSync(SAIDA, { recursive: true });
const { db } = await abrirLeitura();
const h = (s) => createHash('sha1').update(s).digest('base64').slice(0, 16);

const ordem = 'order by municipio, zona, secao';
const qSecao = db.prepare(`select municipio, zona, secao, situacao, hash, tipo_urna, tipo_arquivo, modelo_urna, numero_interno_urna urna, codigo_carga, comparecimento
  from secao where turno = ? and uf = ? ${ordem}`);
const qBu = db.prepare(`select municipio, zona, secao, eleicao, cargo, tipo_voto, numero, quantidade from voto_bu where turno = ? and uf = ? ${ordem}`);
const chave = (r) => `${r.municipio}|${r.zona}|${r.secao}`;

const secoes = []; // { loc, uf, n, cargos, total, porCargo:{c:hash}, urna, carga, hash, tipo }
const t0 = Date.now();
for (const uf of ufs) {
  const it = qBu.iterate(turno, uf);
  let atual = it.next();
  for (const s of qSecao.iterate(turno, uf)) {
    const k = chave(s);
    const linhas = [];
    while (!atual.done && chave(atual.value) < k) atual = it.next();
    while (!atual.done && chave(atual.value) === k) { linhas.push(atual.value); atual = it.next(); }
    if (s.situacao !== 'completa') continue;
    const porCargo = new Map();
    for (const v of linhas) {
      const c = `${v.eleicao}.${v.cargo}`;
      if (!porCargo.has(c)) porCargo.set(c, []);
      porCargo.get(c).push(`${v.tipo_voto[0]}${v.tipo_voto === 'nominal' || v.tipo_voto === 'legenda' ? v.numero : ''}=${v.quantidade}`);
    }
    const cargos = [...porCargo.keys()].sort();
    const hc = {};
    for (const c of cargos) hc[c] = h(porCargo.get(c).sort().join(','));
    const nPres = linhas.filter((v) => v.cargo === 1).reduce((a, v) => a + v.quantidade, 0); // SA: comparecimento da seção vem 0 no BU
    secoes.push({ loc: `${uf}/${s.municipio}/${s.zona}/${s.secao}`, uf, n: nPres || (s.comparecimento ?? 0), cargos: cargos.join(' '), total: h(cargos.map((c) => `${c}:${hc[c]}`).join('|')),
      hc, urna: s.urna, carga: s.codigo_carga, hash: s.hash, tipo: `${s.tipo_urna}/${s.tipo_arquivo}`, modelo: s.modelo_urna });
  }
  console.log(`${turno}t ${uf}: ${secoes.length} seções acumuladas (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}

// estratos
const estratos = new Map();
for (const s of secoes) {
  const g = `${s.uf}|${s.cargos}|${s.n}`;
  if (!estratos.has(g)) estratos.set(g, []);
  estratos.get(g).push(s);
}
const pares = (k) => (k * (k - 1)) / 2;
const porN = new Map(); // faixa de n → { secoes, pares, esperado, observado, gruposObs, teto }
const faixa = (n) => (n === 0 ? '0' : n <= 5 ? String(n) : n <= 10 ? '6-10' : n <= 20 ? '11-20' : n <= 50 ? '21-50' : n <= 100 ? '51-100' : '101+');
const grupos = [];
let esperadoTotal = 0;
let observadoTotal = 0;
const contarIguais = (lista, f) => { const m = new Map(); for (const s of lista) m.set(f(s), (m.get(f(s)) ?? 0) + 1); let p = 0; for (const k of m.values()) p += pares(k); return [p, m]; };
for (const [g, lista] of estratos) {
  const n = lista[0].n;
  const fx = faixa(n);
  const st = porN.get(fx) ?? { secoes: 0, pares: 0, esperado: 0, observado: 0, gruposObs: 0, teto: 0, paresIguaisPorCargo: {} };
  porN.set(fx, st);
  st.secoes += lista.length;
  const np = pares(lista.length);
  st.pares += np;
  if (np === 0) continue;
  const cargos = lista[0].cargos.split(' ').filter(Boolean);
  let prod = 1;
  let teto = Infinity;
  for (const c of cargos) {
    const [p] = contarIguais(lista, (s) => s.hc[c]);
    st.paresIguaisPorCargo[c] = (st.paresIguaisPorCargo[c] ?? 0) + p;
    prod *= p / np;
    teto = Math.min(teto, p);
  }
  const esperado = np * prod;
  const [obs, m] = contarIguais(lista, (s) => s.total);
  st.observado += obs;
  st.teto += teto === Infinity ? np : teto;
  if (n > 0) { st.esperado += esperado; esperadoTotal += esperado; observadoTotal += obs; }
  if (obs > 0) {
    for (const [tot, k] of m) {
      if (k < 2) continue;
      st.gruposObs++;
      const membros = lista.filter((s) => s.total === tot);
      grupos.push({ estrato: g, n, esperadoEstrato: esperado, paresEstrato: np, membros });
    }
  }
}

// cartões e mídias (perfil) só das seções em grupo
const emGrupo = new Map();
for (const gr of grupos) for (const s of gr.membros) emGrupo.set(s.loc, s);
const ufsGrupo = new Set([...emGrupo.values()].map((s) => s.uf));
for (const uf of ufsGrupo) {
  const rl = createInterface({ input: createReadStream(path.join(DIR_DADOS, 'parsed', `${turno}t`, 'perfil', `${uf}.jsonl`)) });
  for await (const l of rl) {
    if (!l.trim()) continue;
    const p = JSON.parse(l);
    const s = emGrupo.get(`${uf}/${p.municipio}/${p.zona}/${p.secao}`);
    if (!s) continue;
    s.fv = p.bu?.urna?.numeroSerieFV ?? null;
    s.fc = p.bu?.urna?.numeroSerieFC ?? null;
    s.mv = p.log?.serialMV ?? null;
    s.mr = p.log?.serialMR ?? null;
    s.vsc = p.sha256Vsc ?? null;
  }
}
const CAMPOS = ['urna', 'carga', 'hash', 'fv', 'fc', 'mv', 'mr', 'vsc'];
let compartilham = 0;
let improvaveis = 0;
const linhasCsv = [];
for (const gr of grupos) {
  const comum = CAMPOS.filter((c) => { const v = gr.membros.map((s) => s[c]).filter((x) => x != null && x !== '' && x !== '00000000'); return new Set(v).size < v.length; });
  gr.comum = comum;
  if (gr.n > 0 && comum.length) compartilham++;
  gr.improvavel = gr.n > 0 && gr.esperadoEstrato < 0.01;
  if (gr.improvavel) improvaveis++;
  linhasCsv.push([gr.n, gr.membros.length, gr.esperadoEstrato.toExponential(2), gr.improvavel ? 'sim' : 'não', comum.join('+') || '-',
    gr.membros.map((s) => `${s.loc}[${s.tipo};urna ${s.urna};${s.modelo}]`).join(' = ')].join(';'));
}
// sem estrato: vetor igual entre quaisquer duas seções do país (inclui UFs diferentes, onde números de candidato podem coincidir)
const global = new Map();
for (const s of secoes) if (s.n > 0) global.set(s.total, (global.get(s.total) ?? 0) + 1);
const paresGlobais = [...global.values()].reduce((a, k) => a + pares(k), 0);
const res = { turno, ufs, secoes: secoes.length, estratos: estratos.size, observadoParesComVoto: observadoTotal, esperadoParesComVotoH0: esperadoTotal, paresIguaisNoPaisSemEstrato: paresGlobais,
  grupos: grupos.length, gruposComVoto: grupos.filter((g) => g.n > 0).length, secoesEmGrupoComVoto: grupos.filter((g) => g.n > 0).reduce((a, g) => a + g.membros.length, 0),
  gruposQueCompartilham: compartilham, gruposImprovaveis: improvaveis, maiorNColidindo: Math.max(0, ...grupos.map((g) => g.n)),
  porN: Object.fromEntries([...porN].sort((a, b) => (a[0] === '101+' ? 1 : b[0] === '101+' ? -1 : parseInt(a[0]) - parseInt(b[0])))), segundos: Math.round((Date.now() - t0) / 1000) };
writeFileSync(path.join(SAIDA, `vetores-${turno}t.json`), `${JSON.stringify(res, null, 1)}\n`);
writeFileSync(path.join(SAIDA, `vetores-${turno}t-grupos.csv`), `n;secoes;esperado_pares_estrato_H0;improvavel;compartilham;membros\n${linhasCsv.join('\n')}\n`);
const cargosTodos = [...new Set(Object.values(res.porN).flatMap((v) => Object.keys(v.paresIguaisPorCargo)))].sort();
writeFileSync(path.join(SAIDA, `vetores-${turno}t-por-n.csv`), `faixa_n;secoes;pares_no_estrato;pares_iguais_observados;pares_esperados_H0;teto_min_cargo;grupos;${cargosTodos.map((c) => `iguais_cargo_${c}`).join(';')}\n${
  Object.entries(res.porN).map(([k, v]) => [k, v.secoes, v.pares, v.observado, v.esperado.toFixed(4), v.teto, v.gruposObs, ...cargosTodos.map((c) => v.paresIguaisPorCargo[c] ?? 0)].join(';')).join('\n')}\n`);
console.log(JSON.stringify(res, null, 1));
for (const gr of grupos.filter((g) => g.n > 0).sort((a, b) => b.n - a.n).slice(0, 25)) {
  console.log(`n ${gr.n} E ${gr.esperadoEstrato.toExponential(2)} comum [${gr.comum.join(',')}]: ${gr.membros.map((s) => `${s.loc} (${s.tipo}, urna ${s.urna})`).join(' = ')}`);
}
