// Matemático forense, H24: eleitores em trânsito e atributos especiais usados para inflar seções? Universo completo.
// Entradas: cópia de leitura do banco (secao, secao_eleicao, voto_bu, perfil_log), h24-atributos.jsonl
// (matematico-h24-dados.mjs) e o catálogo nacional de mensagens do 2º turno (engenheiro de segurança).
//
// Invariantes (devem valer em dado honesto; conta-se cada violação, por turno):
//  V1 aptos = aptos da seção + aptos em trânsito (TTE), em cada seção e eleição;
//  V2 comparecimento ≤ aptos, em cada seção e eleição;
//  V3 eleitor que só vota para Presidente (em trânsito vindo de outra UF): 0 ≤ comp(federal) − comp(estadual)
//     ≤ aptos(federal) − aptos(estadual). Quem compareceu e podia votar no estadual entra nos dois comparecimentos;
//  V4 cada eleitor é contado uma vez por turno: Σ aptos(1º) = Σ aptos(2º), e a soma do que saiu das seções de origem
//     (Δ aptos da seção) é igual à soma do que entrou no trânsito com sinal trocado;
//  V5 BU × dados abertos: aptos da seção e aptos da eleição federal do BU = eleitorado da seção nos dados abertos
//     (eleitorado_local_votacao), por turno; seção agregada soma na principal.
// Testes com a regra de conjunção (anomalia operacional, não só voto diferente), escritos antes de olhar os votos:
//  T1 mesmo local com e sem trânsito (trânsito ≥ 10 aptos): nível em cada turno do comparecimento, da parcela do 13, de brancos + nulos e da
//     parte do comparecimento sem digital (BU), seções com TTE × seções sem TTE do mesmo local (permutação no local);
//  T2 1º × 2º turno: seções que ganharam 10+ em trânsito no 2º turno: variação contra a zona;
//  T3 comparecimento acima do que até 100% de presença do trânsito explica: excesso = comp − aptos_seção × taxa das
//     seções SEM trânsito do mesmo local − aptos_TTE; marca excesso > 3 desvios binomiais. Compara a frequência nas
//     seções com e sem trânsito (as sem trânsito têm TTE = 0 na mesma fórmula);
//  T4 anomalia operacional (diário): rajada de 10+ liberações sem digital em 10 min, mais de 50% sem digital (com 50+
//     votos), comparecimento > aptos. Frequência com × sem trânsito, mesmo local; e em locais não convencionais;
//  T5 impedimentos registrados pela urna (preso provisório, militar, servidor da JE, acessibilidade, trânsito): o
//     catálogo nacional do 2º turno conta eventos e seções em todos os diários.
// Uso: node scripts/auditoria/matematico-h24-analise.mjs → data/parsed/auditoria/matematico-forense/h24-resultado.json
import { createReadStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { MEDIDAS, PESO, SAIDA, carregarSecoes, chave, testeZona } from './matematico-h23-lib.mjs';

const FED = { 1: 6257, 2: 6258 };
const EST = { 1: 6259, 2: 6260 };
const R = { invariantes: {}, testes: {} };
const conta = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };

const { db, fonte } = await abrirLeitura();
R.fonteBanco = fonte;
const S = carregarSecoes(db);
// Eleições por seção
const E = new Map();
for (const r of db.prepare('SELECT turno, uf, municipio, zona, secao, eleicao, aptos, aptos_secao, aptos_tte, comparecimento_majoritario comp FROM secao_eleicao').iterate()) {
  const k = chave(r);
  const o = E.get(k) ?? {};
  o[`${r.turno}:${r.eleicao}`] = r;
  E.set(k, o);
}
// Diário (perfil_log do pacote que gerou o BU)
const P = new Map();
for (const r of db.prepare(`SELECT p.turno, p.uf, p.municipio, p.zona, p.secao, p.votos_computados v, p.habilitados_biometria b, p.maior_rajada_sem_biometria_10min raj
  FROM perfil_log p JOIN secao s ON s.turno = p.turno AND s.uf = p.uf AND s.municipio = p.municipio AND s.zona = p.zona AND s.secao = p.secao AND s.hash = p.hash`).iterate()) {
  P.set(`${r.turno}|${chave(r)}`, r);
}
const agregadas = new Map(); // turno|principal → [agregadas]
for (const r of db.prepare('SELECT turno, uf, municipio, zona, secao, secao_principal FROM secao_agregada').iterate()) {
  const kp = `${r.turno}|${r.uf}/${r.municipio}/${r.zona}/${String(r.secao_principal).padStart(4, '0')}`;
  (agregadas.get(kp) ?? agregadas.set(kp, []).get(kp)).push(chave(r));
}
db.close();

// ---------------------------------------------------------------- Invariantes
for (const t of [1, 2]) {
  const v = { secoesEleicoes: 0, V1: 0, V2: 0, V3comparacoes: 0, V3abaixo: 0, V3acima: 0, soPresidenteAptos: 0, soPresidenteComp: 0, exemplos: [] };
  for (const [k, o] of E) {
    for (const [id, r] of Object.entries(o)) {
      if (!id.startsWith(`${t}:`)) continue;
      v.secoesEleicoes++;
      if (r.aptos !== r.aptos_secao + r.aptos_tte) { v.V1++; if (v.exemplos.length < 10) v.exemplos.push({ k, id, ...r }); }
      if (r.comp !== null && r.comp > r.aptos) { v.V2++; if (v.exemplos.length < 10) v.exemplos.push({ k, id, ...r }); }
    }
    const f = o[`${t}:${FED[t]}`]; const e = o[`${t}:${EST[t]}`];
    if (f && e && f.comp !== null && e.comp !== null) {
      v.V3comparacoes++;
      const dc = f.comp - e.comp; const da = f.aptos - e.aptos;
      if (dc < 0) v.V3abaixo++;
      if (dc > da) { v.V3acima++; if (v.exemplos.length < 10) v.exemplos.push({ k, f, e }); }
      v.soPresidenteAptos += da; v.soPresidenteComp += dc;
    }
  }
  v.presencaSoPresidente = +(100 * v.soPresidenteComp / v.soPresidenteAptos).toFixed(2);
  R.invariantes[`${t}t`] = v;
}
const soma = (t, c) => { let x = 0; for (const o of E.values()) { const f = o[`${t}:${FED[t]}`]; if (f) x += f[c]; } return x; };
R.invariantes.V4 = { aptos1t: soma(1, 'aptos'), aptos2t: soma(2, 'aptos'), aptosSecao1t: soma(1, 'aptos_secao'), aptosSecao2t: soma(2, 'aptos_secao'), tte1t: soma(1, 'aptos_tte'), tte2t: soma(2, 'aptos_tte') };
const v4 = R.invariantes.V4;
v4.vale = v4.aptos1t === v4.aptos2t && v4.aptosSecao2t - v4.aptosSecao1t === v4.tte1t - v4.tte2t;
// presença geral (para comparar com a do trânsito de outra UF)
for (const t of [1, 2]) R.invariantes[`${t}t`].presencaGeralFederal = +(100 * soma(t, 'comp') / soma(t, 'aptos')).toFixed(2);

// Atributos dos dados abertos
const A = new Map();
for await (const l of createInterface({ input: createReadStream(path.join(SAIDA, 'h24-atributos.jsonl')), crlfDelay: Infinity })) if (l) { const o = JSON.parse(l); A.set(o.k, o); }
for (const t of [1, 2]) {
  const v = { comparadas: 0, aptosSecaoDifere: 0, aptosFederalDifere: 0, semLinhaNosDadosAbertos: 0, exemplos: [] };
  for (const [k, o] of E) {
    const f = o[`${t}:${FED[t]}`];
    if (!f) continue;
    const ks = [k, ...(agregadas.get(`${t}|${k}`) ?? [])];
    const linhas = ks.map((x) => A.get(x)?.[`t${t}`]).filter(Boolean);
    if (!linhas.length) { v.semLinhaNosDadosAbertos++; continue; }
    v.comparadas++;
    const qs = linhas.reduce((a, x) => a + x.qtSecao, 0); const qf = linhas.reduce((a, x) => a + x.qtFederal, 0);
    if (qs !== f.aptos_secao) v.aptosSecaoDifere++;
    if (qf !== f.aptos) v.aptosFederalDifere++;
    if ((qs !== f.aptos_secao || qf !== f.aptos) && v.exemplos.length < 15) v.exemplos.push({ k, agregadas: ks.length - 1, bu: { aptos: f.aptos, aptosSecao: f.aptos_secao, tte: f.aptos_tte }, abertos: { qtSecao: qs, qtFederal: qf } });
  }
  R.invariantes[`V5 ${t}t`] = v;
}

// ---------------------------------------------------------------- Marcas por seção
MEDIDAS.semDigital = (t) => (t.comp ? (100 * (t.comp - t.porBio)) / t.comp : null);
PESO.semDigital = (t) => t.comp;
const tte = (k, t) => E.get(k)?.[`${t}:${FED[t]}`]?.aptos_tte ?? 0;
// Trânsito "relevante" para os testes de permutação: 10 ou mais aptos em trânsito (a maioria das seções com trânsito tem
// 1 ou 2, em geral mesários e servidores convocados).
const LIM = 10;
const comTTE = { 1: new Set(), 2: new Set() };
const comTTE10 = { 1: new Set(), 2: new Set() };
const ganhou = new Set(); const perdeu = new Set(); const ganhou10 = new Set();
const tipoLocal = { 1: new Map(), 2: new Map() };
for (const [k] of S) {
  for (const t of [1, 2]) {
    if (tte(k, t) > 0) comTTE[t].add(k);
    if (tte(k, t) >= LIM) comTTE10[t].add(k);
    tipoLocal[t].set(k, A.get(k)?.[`t${t}`]?.tipoLocal ?? '?');
  }
  if (tte(k, 2) > tte(k, 1)) ganhou.add(k);
  if (tte(k, 2) < tte(k, 1)) perdeu.add(k);
  if (tte(k, 2) - tte(k, 1) >= LIM) ganhou10.add(k);
}
const distTTE = {};
for (const t of [1, 2]) distTTE[`${t}t`] = { secoesComTTE: comTTE[t].size, eleitoresTTE: [...comTTE[t]].reduce((a, k) => a + tte(k, t), 0) };
for (const t of [1, 2]) distTTE[`${t}t`].secoesComTTE10 = comTTE10[t].size;
distTTE.ganharamNo2t = ganhou.size; distTTE.perderamNo2t = perdeu.size; distTTE.ganharam10No2t = ganhou10.size;
distTTE.tipoLocalMudou = [...S.keys()].filter((k) => tipoLocal[1].get(k) !== tipoLocal[2].get(k)).length;
distTTE.localMudou = [...S.values()].filter((s) => s.t1.local !== s.t2.local).length;
const porTipo = {};
for (const t of [1, 2]) for (const [k, tl] of tipoLocal[t]) { porTipo[`${t}t ${tl}`] ??= { secoes: 0, comTTE: 0, tte: 0 }; porTipo[`${t}t ${tl}`].secoes++; if (comTTE[t].has(k)) { porTipo[`${t}t ${tl}`].comTTE++; porTipo[`${t}t ${tl}`].tte += tte(k, t); } }
R.atributos = { ...distTTE, porTipoDeLocal: porTipo };

// T1 mesmo local
const roda = (nome, set, modos, medidas = ['comparecimento', 'parcela13', 'brancosNulos', 'semDigital']) => {
  const o = { secoes: set.size, testes: {} };
  for (const [modo, grupo] of modos) for (const m of medidas) {
    const r = testeZona(S, set, m, { modo, grupo });
    o.testes[`${modo}/${grupo}/${m}`] = { n: r.n, grupos: r.grupos, efeitoPp: +r.efeito.toFixed(3), p: +r.p.toFixed(4), faixaDoAcaso95: r.nulo95.map((x) => +x.toFixed(3)) };
  }
  R.testes[nome] = o;
  console.log(`\n${nome}: ${set.size}`); console.table(o.testes);
};
console.log(JSON.stringify({ invariantes: R.invariantes, atributos: R.atributos }, (c, v) => (c === 'exemplos' ? v.slice(0, 3) : v), 1));
roda('T1 trânsito ≥ 10 × demais seções do mesmo local, 1º turno', comTTE10[1], [['t1', 'local']]);
roda('T1 trânsito ≥ 10 × demais seções do mesmo local, 2º turno', comTTE10[2], [['t2', 'local']]);
roda('T2 seções que ganharam 10+ em trânsito no 2º turno (variação × zona)', ganhou10, [['variacao', 'zona']]);
const naoConv = new Set([...tipoLocal[2]].filter(([, tl]) => tl !== 'Convencional' && tl !== '?').map(([k]) => k));
roda('locais não convencionais, 2º turno (nível × zona)', naoConv, [['t2', 'zona'], ['variacao', 'zona']]);

// T3 excesso de comparecimento
for (const t of [1, 2]) {
  const tl = `t${t}`;
  const loc = new Map();
  for (const s of S.values()) {
    if (comTTE[t].has(s.k)) continue;
    const g = `${s.uf}/${s.municipio}/${s.zona}/${s[tl].local}`;
    const o = loc.get(g) ?? { comp: 0, aptos: 0 };
    o.comp += s[tl].comp; o.aptos += s[tl].aptos;
    loc.set(g, o);
  }
  const o = { com: { secoes: 0, excesso3dp: 0 }, sem: { secoes: 0, excesso3dp: 0 }, casos: [] };
  for (const s of S.values()) {
    const g = `${s.uf}/${s.municipio}/${s.zona}/${s[tl].local}`;
    const ref = loc.get(g);
    const f = E.get(s.k)?.[`${t}:${FED[t]}`];
    if (!ref || !f) continue;
    const isCom = comTTE[t].has(s.k);
    const refC = isCom ? ref.comp : ref.comp - s[tl].comp; const refA = isCom ? ref.aptos : ref.aptos - s[tl].aptos;
    if (refA < 100) continue;
    const taxa = refC / refA;
    const esperado = f.aptos_secao * taxa + f.aptos_tte;
    const dp = Math.sqrt(f.aptos_secao * taxa * (1 - taxa));
    const excesso = s[tl].comp - esperado;
    const grupo = isCom ? o.com : o.sem;
    grupo.secoes++;
    if (dp > 0 && excesso > 3 * dp) { grupo.excesso3dp++; if (isCom) o.casos.push({ k: s.k, comp: s[tl].comp, aptosSecao: f.aptos_secao, tte: f.aptos_tte, taxaLocal: +taxa.toFixed(4), excesso: +excesso.toFixed(1), dp: +dp.toFixed(1) }); }
  }
  o.com.pct = +(100 * o.com.excesso3dp / o.com.secoes).toFixed(3); o.sem.pct = +(100 * o.sem.excesso3dp / o.sem.secoes).toFixed(3);
  R.testes[`T3 excesso de comparecimento ${t}t`] = o;
  console.log(`T3 ${t}t`, JSON.stringify({ com: o.com, sem: o.sem, casos: o.casos.length }));
}

// T4 anomalia operacional (diário + BU)
for (const t of [1, 2]) {
  const tl = `t${t}`;
  const loc = new Map(); // locais com as duas espécies
  for (const s of S.values()) { const g = `${s.uf}/${s.municipio}/${s.zona}/${s[tl].local}`; const o = loc.get(g) ?? { com: 0, sem: 0 }; comTTE[t].has(s.k) ? o.com++ : o.sem++; loc.set(g, o); }
  const o = { com: {}, com10: {}, com1a9: {}, semMesmoLocal: {}, naoConvencional: {} };
  const marca = (g, s, p) => {
    conta(g, 'secoes');
    if (p?.raj >= 10) conta(g, 'rajada10');
    if (p && p.v >= 50 && (p.v - p.b) / p.v > 0.5) conta(g, 'semDigitalAcima50');
    if (s[tl].comp > s[tl].aptos) conta(g, 'compAcimaDosAptos');
    if (p?.raj >= 10 && p.v >= 50 && (p.v - p.b) / p.v > 0.5) conta(g, 'rajadaE50');
  };
  for (const s of S.values()) {
    const p = P.get(`${t}|${s.k}`);
    const g = loc.get(`${s.uf}/${s.municipio}/${s.zona}/${s[tl].local}`);
    // Grupos disjuntos (correção do parecer cético 39: o "sem trânsito" incluía as seções com 1 a 9 em trânsito)
    if (comTTE[t].has(s.k)) marca(o.com, s, p);
    if (comTTE10[t].has(s.k)) marca(o.com10, s, p);
    else if (comTTE[t].has(s.k)) marca(o.com1a9, s, p);
    else if (g.com > 0) marca(o.semMesmoLocal, s, p);
    if (naoConv.has(s.k) && t === 2) marca(o.naoConvencional, s, p);
  }
  R.testes[`T4 anomalia operacional ${t}t`] = o;
  console.log(`T4 ${t}t`, JSON.stringify(o));
}

// T5 impedimentos (catálogo nacional, 2º turno, todos os diários)
try {
  const cat = JSON.parse(await readFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'engenheiro-seguranca-urna', 'catalogo-nacional-2t.json'), 'utf8')).mensagens;
  R.testes['T5 impedimentos no diário, 2º turno'] = Object.fromEntries(Object.entries(cat).filter(([m]) => m.startsWith('dia\tINFO\tVOTA\tEleitor impedido')).map(([m, x]) => [m.split('\t')[3], { eventos: x.eventos, secoes: x.secoes }]));
} catch (erro) { R.testes['T5 impedimentos no diário, 2º turno'] = { erro: erro.message }; }

const nT = Object.values(R.testes).reduce((a, o) => a + Object.keys(o.testes ?? {}).length, 0);
R.correcao = { testes: nT, limiar: 0.05 / nT, abaixo: Object.entries(R.testes).flatMap(([n, o]) => Object.entries(o.testes ?? {}).filter(([, r]) => r.p < 0.05 / nT).map(([c, r]) => ({ conjunto: n, teste: c, ...r }))) };
await writeFile(path.join(SAIDA, 'h24-resultado.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify({ invariantes: R.invariantes, atributos: R.atributos, T5: R.testes['T5 impedimentos no diário, 2º turno'], correcao: R.correcao }, (c, v) => (c === 'exemplos' ? v.slice(0, 5) : v), 1));
