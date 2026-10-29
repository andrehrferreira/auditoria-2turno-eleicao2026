// Revisor cético: reprodução independente do balanço de presidente 1º → 2º turno (achado
// h10-crescimento-cabe-no-disponivel, docs/analysis/cientista-politico/01). Não usa o código do autor.
//
// Uso: node --max-old-space-size=4096 scripts/auditoria/cetico-h10-reproducao.mjs
// Lê (sem rede, sem extrair): munzona BR, detalhe_votacao_secao BR, votacao_secao BR (dados abertos do TSE)
// e o banco SQLite em somente leitura (voto_bu, carga, secao_agregada) para comparar com os BUs.
// Saída: data/parsed/auditoria/cetico/h10-reproducao.json
import { createReadStream, mkdirSync, writeFileSync } from 'node:fs';
import readline from 'node:readline';
import { createInflateRaw } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { ZIPS, entradasZip } from './contagem-zip.mjs';

const SAIDA = 'data/parsed/auditoria/cetico';
mkdirSync(SAIDA, { recursive: true });

// Parser próprio de CSV do TSE: campos entre aspas, separador ';', "" como aspas escapadas.
function parse(l) {
  const r = [];
  let i = 0;
  const n = l.length;
  while (i < n) {
    if (l[i] === '"') {
      let s = '';
      let j = i + 1;
      while (j < n) {
        if (l[j] === '"') {
          if (l[j + 1] === '"') { s += '"'; j += 2; continue; }
          break;
        }
        s += l[j++];
      }
      r.push(s);
      i = j + 2; // pula aspas de fechamento e ';'
    } else {
      let k = l.indexOf(';', i);
      if (k < 0) k = n;
      r.push(l.slice(i, k));
      i = k + 1;
    }
  }
  return r;
}

async function* ler(zip, nome) {
  const e = (await entradasZip(zip)).find((x) => x.nome === nome);
  if (!e) throw new Error(`sem ${nome}`);
  let f = createReadStream(zip, { start: e.inicioDados, end: e.inicioDados + e.tamanhoComprimido - 1 });
  if (e.metodo === 8) f = f.pipe(createInflateRaw());
  const rl = readline.createInterface({ input: f.setEncoding('latin1'), crlfDelay: Infinity });
  let h = null;
  for await (const l of rl) {
    if (!l) continue;
    const c = parse(l);
    if (!h) { h = Object.fromEntries(c.map((x, i) => [x, i])); continue; }
    if (c.length !== Object.keys(h).length) throw new Error(`linha com ${c.length} campos em ${nome}: ${l.slice(0, 200)}`);
    yield [c, h];
  }
}

const add = (o, k, q) => { o[k] = (o[k] ?? 0) + q; };
const T = () => ({ 1: {}, 2: {} });

// ---------- 1. munzona (presidente) ----------
const mz = T(); // t → uf → nr → votos (QT_VOTOS_NOMINAIS)
const mzValidos = T(); // t → nr → QT_VOTOS_NOMINAIS_VALIDOS
const mzMun = T(); // t → uf|mun → nr → votos
const situacao = {}; // nr → situações vistas
let mzLinhas = 0;
for await (const [c, h] of ler(ZIPS.munzona, 'votacao_candidato_munzona_2026_BR.csv')) {
  if (c[h.CD_CARGO] !== '1') continue;
  mzLinhas++;
  const t = c[h.NR_TURNO], uf = c[h.SG_UF].toLowerCase(), nr = c[h.NR_CANDIDATO], q = Number(c[h.QT_VOTOS_NOMINAIS]);
  add((mz[t][uf] ??= {}), nr, q);
  add(mzValidos[t], nr, Number(c[h.QT_VOTOS_NOMINAIS_VALIDOS]));
  add((mzMun[t][`${uf}|${Number(c[h.CD_MUNICIPIO])}`] ??= {}), nr, q);
  (situacao[nr] ??= new Set()).add(`${c[h.DS_SITUACAO_CANDIDATURA]}/${c[h.NM_TIPO_DESTINACAO_VOTOS]}`);
}
console.error(`munzona: ${mzLinhas} linhas`);

// ---------- 2. detalhe por seção (presidente) ----------
const det = T(); // t → uf → {aptos, comp, abst, br, nu, nom, leg, anul, secoes}
const detMun = T(); // t → uf|mun → {aptos, comp, br, nu}
const secAptos = new Map(); // uf|mun|zona|sec → [aptos1, aptos2]
const origem = {}; // DS_ORIGEM_VOTO|ST_SECAO_ANULADA|t → seções
for await (const [c, h] of ler(ZIPS.detalheSecao, 'detalhe_votacao_secao_2026_BR.csv')) {
  if (c[h.CD_CARGO] !== '1') continue;
  const t = c[h.NR_TURNO], uf = c[h.SG_UF].toLowerCase();
  const a = (det[t][uf] ??= { aptos: 0, comp: 0, abst: 0, br: 0, nu: 0, nom: 0, leg: 0, anul: 0, secoes: 0 });
  const v = {
    aptos: +c[h.QT_APTOS], comp: +c[h.QT_COMPARECIMENTO], abst: +c[h.QT_ABSTENCOES], br: +c[h.QT_VOTOS_BRANCOS],
    nu: +c[h.QT_VOTOS_NULOS], nom: +c[h.QT_VOTOS_NOMINAIS], leg: +c[h.QT_VOTOS_LEGENDA], anul: +c[h.QT_VOTOS_ANULADOS_APU_SEP],
  };
  for (const k of Object.keys(v)) a[k] += v[k];
  a.secoes++;
  const mk = `${uf}|${Number(c[h.CD_MUNICIPIO])}`;
  const m = (detMun[t][mk] ??= { aptos: 0, comp: 0, br: 0, nu: 0 });
  m.aptos += v.aptos; m.comp += v.comp; m.br += v.br; m.nu += v.nu;
  const sk = `${mk}|${Number(c[h.NR_ZONA])}|${Number(c[h.NR_SECAO])}`;
  let s = secAptos.get(sk);
  if (!s) { s = [null, null]; secAptos.set(sk, s); }
  s[t - 1] = v.aptos;
  add(origem, `${t}|${c[h.DS_ORIGEM_VOTO]}|anulada=${c[h.ST_SECAO_ANULADA]}|instalada=${c[h.ST_SECAO_INSTALADA]}`, 1);
}
console.error(`detalhe: ${secAptos.size} seções`);

// ---------- 3. votacao_secao (presidente), por UF e por seção (para comparar com o BU) ----------
const vs = T(); // t → uf → nr → votos
const idx = new Map(); // nr → índice no vetor por seção
const NI = 24;
const porSecao = [new Map(), new Map()]; // t-1 → uf|mun|zona|sec → Int32Array(NI)
const ix = (nr) => { let i = idx.get(nr); if (i === undefined) { i = idx.size; idx.set(nr, i); if (i >= NI) throw new Error('NI pequeno'); } return i; };
let vsLinhas = 0;
for await (const [c, h] of ler(ZIPS.votacaoSecao, 'votacao_secao_2026_BR.csv')) {
  if (c[h.CD_CARGO] !== '1') continue;
  vsLinhas++;
  const t = Number(c[h.NR_TURNO]), uf = c[h.SG_UF].toLowerCase(), nr = c[h.NR_VOTAVEL], q = Number(c[h.QT_VOTOS]);
  add((vs[t][uf] ??= {}), nr, q);
  const sk = `${uf}|${Number(c[h.CD_MUNICIPIO])}|${Number(c[h.NR_ZONA])}|${Number(c[h.NR_SECAO])}`;
  let a = porSecao[t - 1].get(sk);
  if (!a) { a = new Int32Array(NI); porSecao[t - 1].set(sk, a); }
  a[ix(nr)] += q;
}
console.error(`votacao_secao: ${vsLinhas} linhas`);

// ---------- 4. BU no banco (somente leitura) ----------
const db = new DatabaseSync('data/db/eleicao2026.sqlite', { readOnly: true });
const carregadas = { 1: [], 2: [] };
for (const r of db.prepare('select turno, uf from carga order by turno, uf').all()) carregadas[r.turno].push(r.uf);
const agregadas = { 1: 0, 2: 0 };
for (const r of db.prepare('select turno, count(*) n from secao_agregada group by turno').all()) agregadas[r.turno] = r.n;
const bu = { 1: {}, 2: {} }; // t → uf → nr → votos (só UFs carregadas)
const cmpSecao = { 1: { iguais: 0, diferentes: 0, soNoBu: 0, exemplos: [] }, 2: { iguais: 0, diferentes: 0, soNoBu: 0, exemplos: [] } };
const vistas = [new Set(), new Set()];
for (const t of [1, 2]) {
  const q = db.prepare(`select uf, municipio, zona, secao, tipo_voto, numero, quantidade from voto_bu
    where turno = ? and cargo = 1 and uf = ? order by municipio, zona, secao`);
  for (const uf of carregadas[t]) {
    let atual = null, vet = null;
    const fecha = () => {
      if (!atual) return;
      vistas[t - 1].add(atual);
      const o = porSecao[t - 1].get(atual);
      const C = cmpSecao[t];
      if (!o) { C.soNoBu++; if (C.exemplos.length < 5) C.exemplos.push({ sk: atual, motivo: 'só no BU' }); return; }
      let ok = true;
      for (let i = 0; i < NI; i++) if (o[i] !== vet[i]) ok = false;
      if (ok) C.iguais++; else { C.diferentes++; if (C.exemplos.length < 5) C.exemplos.push({ sk: atual, bu: Array.from(vet), oficial: Array.from(o) }); }
    };
    for (const r of q.iterate(t, uf)) {
      const sk = `${uf}|${Number(r.municipio)}|${Number(r.zona)}|${Number(r.secao)}`;
      if (sk !== atual) { fecha(); atual = sk; vet = new Int32Array(NI); }
      const nr = r.tipo_voto === 'branco' ? '95' : r.tipo_voto === 'nulo' ? '96' : String(r.numero);
      vet[ix(nr)] += r.quantidade;
      add((bu[t][uf] ??= {}), nr, r.quantidade);
    }
    fecha();
  }
  // seções oficiais (votacao_secao) das UFs carregadas que não aparecem no BU
  let soOficial = 0, votosSoOficial = 0;
  const set = new Set(carregadas[t]);
  for (const [sk, a] of porSecao[t - 1]) {
    if (!set.has(sk.split('|')[0]) || vistas[t - 1].has(sk)) continue;
    soOficial++; votosSoOficial += a.reduce((x, y) => x + y, 0);
  }
  cmpSecao[t].soNoOficial = soOficial; cmpSecao[t].votosSoNoOficial = votosSoOficial;
}
db.close();

// ---------- 5. balanço ----------
const somaUF = (o, ufs) => { const r = {}; for (const uf of ufs) for (const [nr, q] of Object.entries(o[uf] ?? {})) add(r, nr, q); return r; };
const UFS = [...new Set([...Object.keys(det[1]), ...Object.keys(det[2])])].sort();
function balanco(ufs, fonte1) {
  const v1 = somaUF(fonte1, ufs), v2 = somaUF(vs[2], ufs);
  const d1 = { aptos: 0, comp: 0, br: 0, nu: 0 }, d2 = { aptos: 0, comp: 0, br: 0, nu: 0 };
  for (const uf of ufs) for (const k of Object.keys(d1)) { d1[k] += det[1][uf]?.[k] ?? 0; d2[k] += det[2][uf]?.[k] ?? 0; }
  const L1 = v1['13'] ?? 0, F1 = v1['22'] ?? 0, L2 = v2['13'] ?? 0, F2 = v2['22'] ?? 0;
  let E = 0;
  for (const [nr, q] of Object.entries(v1)) if (!['13', '22', '95', '96'].includes(nr)) E += q;
  const BN1 = d1.br + d1.nu, BN2 = d2.br + d2.nu;
  const disp = E + (BN1 - BN2) + (d2.comp - d1.comp);
  return {
    L1, F1, L2, F2, dL: L2 - L1, dF: F2 - F1, E, BN1, BN2, comp1: d1.comp, comp2: d2.comp, aptos1: d1.aptos, aptos2: d2.aptos,
    dComp: d2.comp - d1.comp, quedaBN: BN1 - BN2, disponivel: disp, fecha: L2 - L1 + F2 - F1 === disp,
    parte13: +((L2 - L1) / disp).toFixed(4), excede13: L2 - L1 > disp, excede22: F2 - F1 > disp,
  };
}
// 1º turno com o votacao_secao (oficial por seção) e, para conferir, com o munzona + 28 do votacao_secao
const nacional = balanco(UFS, vs[1]);
const porUF = Object.fromEntries(UFS.map((uf) => [uf, balanco([uf], vs[1])]));
const excede = Object.entries(porUF).filter(([, b]) => b.excede13 || b.excede22).map(([uf, b]) => ({ uf, dL: b.dL, dF: b.dF, disponivel: b.disponivel, dCompPct: +(100 * (b.comp2 / b.aptos2 - b.comp1 / b.aptos1)).toFixed(2) }));

// munzona × votacao_secao por candidato, turno
const difMzVs = [];
for (const t of [1, 2]) {
  const a = somaUF(mz[t], UFS), b = somaUF(vs[t], UFS);
  for (const nr of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (nr === '95' || nr === '96') continue;
    if ((a[nr] ?? 0) !== (b[nr] ?? 0)) difMzVs.push({ t, nr, munzona: a[nr] ?? 0, votacaoSecao: b[nr] ?? 0 });
  }
}
// municípios onde o 22 perdeu votos (munzona + 28 do votacao_secao não muda dF)
let mun22perdeu = 0, mun13perdeu = 0;
for (const mk of Object.keys(mzMun[2])) {
  const a = mzMun[1][mk] ?? {}, b = mzMun[2][mk] ?? {};
  if ((b['22'] ?? 0) < (a['22'] ?? 0)) mun22perdeu++;
  if ((b['13'] ?? 0) < (a['13'] ?? 0)) mun13perdeu++;
}
// aptos por seção: iguais entre turnos?
let aptIguais = 0, aptDif = 0, so1 = 0, so2 = 0, somaDifAbs = 0;
for (const [, [a, b]] of secAptos) {
  if (a === null) so2++; else if (b === null) so1++; else if (a === b) aptIguais++; else { aptDif++; somaDifAbs += Math.abs(a - b); }
}
// BU × oficial por UF e candidato (UFs carregadas)
const buXoficial = {};
for (const t of [1, 2]) {
  const l = [];
  for (const uf of carregadas[t]) {
    const a = bu[t][uf] ?? {}, b = vs[t][uf] ?? {};
    for (const nr of new Set([...Object.keys(a), ...Object.keys(b)])) if ((a[nr] ?? 0) !== (b[nr] ?? 0)) l.push({ uf, nr, bu: a[nr] ?? 0, oficial: b[nr] ?? 0 });
  }
  const tot = (o) => Object.values(o).reduce((x, y) => x + y, 0);
  buXoficial[t] = { ufs: carregadas[t].length, diferencas: l, totalBU: carregadas[t].reduce((s, uf) => s + tot(bu[t][uf] ?? {}), 0), totalOficial: carregadas[t].reduce((s, uf) => s + tot(vs[t][uf] ?? {}), 0) };
}
// detalhe × votacao_secao (nominais + brancos + nulos = comparecimento) por turno
const fechaDetalhe = {};
for (const t of [1, 2]) {
  const d = { comp: 0, br: 0, nu: 0, nom: 0, leg: 0, anul: 0, aptos: 0, abst: 0 };
  for (const uf of UFS) for (const k of Object.keys(d)) d[k] += det[t][uf]?.[k] ?? 0;
  const v = somaUF(vs[t], UFS);
  let nom = 0;
  for (const [nr, q] of Object.entries(v)) if (nr !== '95' && nr !== '96') nom += q;
  fechaDetalhe[t] = { ...d, nominaisVotacaoSecao: nom, brancosVS: v['95'] ?? 0, nulosVS: v['96'] ?? 0, aptosMenosCompMenosAbst: d.aptos - d.comp - d.abst };
}

const r = {
  geradoEm: new Date().toISOString(),
  nacional, excede, mun22perdeu, mun13perdeu,
  candidato28: { munzonaT1: somaUF(mz[1], UFS)['28'] ?? 0, votacaoSecaoT1: somaUF(vs[1], UFS)['28'] ?? 0, situacoesMunzona: Object.fromEntries(Object.entries(situacao).map(([k, s]) => [k, [...s]])) },
  validosMunzona: mzValidos,
  difMunzonaVotacaoSecao: difMzVs,
  aptosSecao: { iguais: aptIguais, diferentes: aptDif, somaDifAbs, so1t: so1, so2t: so2 },
  fechaDetalhe, origem,
  buXoficial, cmpSecao, agregadas, carregadas,
  porUF,
};
writeFileSync(`${SAIDA}/h10-reproducao.json`, JSON.stringify(r, null, 1));
console.log(JSON.stringify({ nacional, excede, mun22perdeu, mun13perdeu, candidato28: r.candidato28.votacaoSecaoT1, difMzVs, aptosSecao: r.aptosSecao, fechaDetalhe, buXoficial: { 1: { ...buXoficial[1], diferencas: buXoficial[1].diferencas.slice(0, 20), n: buXoficial[1].diferencas.length }, 2: { ...buXoficial[2], diferencas: buXoficial[2].diferencas.slice(0, 20), n: buXoficial[2].diferencas.length } }, cmpSecao }, null, 1));
