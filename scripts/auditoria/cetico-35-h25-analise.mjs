import { createReadStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DIR_DADOS } from '../../src/config.js';
import { certDoVsc, esqueleto, filhos, h, tlv } from './cetico-35-h25-lib.mjs';

// Parecer 35 do cético (H25, doc 08 do engenheiro): análise independente sobre as saídas de cetico-35-h25-extrair.mjs.
//   A. universo, erros, certificados distintos, esqueletos por AC, SKI = SHA-1 da chave;
//   B. CN no padrão, CN = número no .vsc (idHW) = número no BU = urna no log; carga do log = carga do BU;
//      urnas com mais de um certificado; certificado usado em mais de uma seção;
//   C. início da validade antes da carga do BU (conversão conservadora: hora do BU + 2 h = UTC, a mais cedo possível);
//   D. certificados com início entre o fim do 1º turno (04/10 17h Brasília) e a abertura do 2º (25/10 8h), com a seção
//      e a urna que a mesma seção usou no 1º turno; certificado com início depois da abertura do 1º turno usado no 1º turno;
//   E. regra da validade (5.000 dias ou teto 31/12/2037 23:00);
//   F. linhas de emissão (menor número de sequências crescentes de série em ordem de data);
//   G. séries consumidas perto da eleição (desde 01/09/2026) e quantas aparecem nos pacotes;
//   H. teste sintético: o que o esqueleto (e o molde do doc 08, que mascara os mesmos campos) vê e o que não vê.
// Saída: data/parsed/auditoria/cetico-35/analise.json
// Uso: node --max-old-space-size=6000 scripts/auditoria/cetico-35-h25-analise.mjs

const DIR = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-35');
const inc = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };
async function* ler(n) {
  const rl = createInterface({ input: createReadStream(path.join(DIR, n)), crlfDelay: Infinity });
  for await (const l of rl) if (l) yield JSON.parse(l);
}
const acDe = (issuer) => (issuer.match(/(?:^|\n)CN=([^\n]*)/) ?? [])[1] ?? '?';
const R = {};

// ---------- A. certificados ----------
const certs = new Map();
const esqPorAc = {};
for (const t of [2, 1]) {
  for await (const c of ler(`${t}t-certs.jsonl`)) {
    if (certs.has(c.cert)) continue;
    const ac = acDe(c.emissor);
    const cn = (c.sujeito.match(/(?:^|\n)CN=([^\n]*)/) ?? [])[1] ?? null;
    certs.set(c.cert, { ac, cn, serie: c.serie, nb: c.nb, na: c.na, esq: c.esqueleto, ski: c.skiSha1Chave });
    const e = ((esqPorAc[ac] ??= {})[c.esqueleto] ??= { n: 0, texto: c.esqTexto });
    e.n++;
  }
}
R.A = { certificadosDistintos: certs.size, porAc: {}, esqueletosPorAc: {}, skiNaoESha1: 0 };
for (const c of certs.values()) { inc(R.A.porAc, c.ac); if (!c.ski) R.A.skiNaoESha1++; }
for (const [ac, es] of Object.entries(esqPorAc)) R.A.esqueletosPorAc[ac] = Object.entries(es).map(([k, v]) => ({ esqueleto: k, n: v.n }));
R.A.textoEsqueleto = Object.fromEntries(Object.entries(esqPorAc).map(([ac, es]) => [ac, Object.values(es)[0].texto]));

// ---------- B, C, D (diretórios) ----------
const B = { diretorios: {}, erros: {}, cnPadrao: {}, acCaixa: {}, cnIgualIdHW: {}, cnIgualBu: {}, cnNoLog: {}, cargaLogIgualBu: {}, semLog: {},
  excecoesBu: {}, excecoesBuLista: [], sobra: {} };
const C = { antesDaCarga: {}, menorFolga: null, cargaForaDe2026: 0 };
const usoPorCert = new Map(); // cert → [t|uf|mun|zona|secao]
const certPorSecao = { 1: new Map(), 2: new Map() };
const urnasNoTurno = { 1: new Set(), 2: new Set() };
const cnsPorNumero = new Map();
for (const t of [2, 1]) {
  for await (const d of ler(`${t}t-dirs.jsonl`)) {
    inc(B.diretorios, `${t}t`);
    if (d.erro) { inc(B.erros, `${t}t ${d.erro}`); continue; }
    const c = certs.get(d.cert);
    const num = Number(c.cn?.slice(4));
    inc(B.cnPadrao, `${/^(UEAO|ueao)\d{8}$/.test(c.cn ?? '') ? 'sim' : 'não'}`);
    inc(B.acCaixa, `${c.ac} | ${c.cn?.slice(0, 4)} | ${d.modeloVsc}`);
    inc(B.sobra, `${c.ac} sobra ${d.sobra} zeros ${d.sobraZero}`);
    inc(B.cnIgualIdHW, `${t}t ${num === d.idHW}`);
    const tipo = `tipoUrna ${d.tipoUrna} origem ${d.origem}`;
    const igualBu = num === d.buUrna;
    inc(B.cnIgualBu, `${t}t ${igualBu} | ${tipo}`);
    if (!igualBu) { inc(B.excecoesBu, `${t}t ${tipo}`); if (B.excecoesBuLista.length < 50) B.excecoesBuLista.push({ t, secao: `${d.uf}/${d.mun}/${d.zona}/${d.secao}`, tipo, cn: c.cn, buUrna: d.buUrna, logUrnas: d.logUrnas }); }
    if (!d.nLogs) inc(B.semLog, `${t}t ${tipo}`);
    inc(B.cnNoLog, `${t}t ${d.logUrnas.includes(num)}`);
    inc(B.cargaLogIgualBu, `${t}t ${d.logCargas.includes(d.buCarga)}`);
    const k = `${t}|${d.uf}|${d.mun}|${d.zona}|${d.secao}`;
    let u = usoPorCert.get(d.cert);
    if (!u) usoPorCert.set(d.cert, (u = []));
    u.push(k);
    certPorSecao[t].set(`${d.uf}|${d.mun}|${d.zona}|${d.secao}`, c.cn);
    urnasNoTurno[t].add(num);
    let s = cnsPorNumero.get(num);
    if (!s) cnsPorNumero.set(num, (s = new Set()));
    s.add(d.cert);
    // C. carga
    const m = d.buDataCarga?.match(/^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)$/);
    if (!m) { inc(C.antesDaCarga, `${t}t sem data`); continue; }
    if (m[1] !== '2026') C.cargaForaDe2026++;
    const cargaUtcCedo = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] + 2, +m[5], +m[6]); // UTC−2 (Noronha): o instante mais cedo
    const folga = (cargaUtcCedo - Date.parse(c.nb)) / 3600e3;
    inc(C.antesDaCarga, `${t}t ${folga > 0}`);
    if (!C.menorFolga || folga < C.menorFolga.horas) C.menorFolga = { t, secao: `${d.uf}/${d.mun}/${d.zona}/${d.secao}`, cn: c.cn, nb: c.nb, carga: d.buDataCarga, horas: Math.round(folga * 10) / 10 };
  }
}
B.numerosDistintos = cnsPorNumero.size;
B.numerosComMaisDeUmCertificado = [...cnsPorNumero.values()].filter((s) => s.size > 1).length;
B.certificadosEmMaisDeUmaSecaoNoMesmoTurno = [...usoPorCert.values()].filter((l) => {
  const porT = {};
  for (const k of l) inc(porT, k[0]);
  return Object.values(porT).some((n) => n > 1);
}).length;
R.B = B;
R.C = C;

// D. entre os turnos
const FIM_1T = '2026-10-04T20:00:00.000Z'; // 17h Brasília
const ABRE_1T = '2026-10-04T11:00:00.000Z'; // 8h Brasília
const ABRE_2T = '2026-10-25T11:00:00.000Z';
R.D = { entreTurnos: [], inicioDepoisDaAbertura1tUsadoNo1t: 0, depoisDaAbertura2t: 0 };
for (const [sha, c] of certs) {
  const usos = usoPorCert.get(sha) ?? [];
  if (c.nb > ABRE_1T && usos.some((k) => k.startsWith('1|'))) R.D.inicioDepoisDaAbertura1tUsadoNo1t++;
  if (c.nb > ABRE_2T) R.D.depoisDaAbertura2t++;
  if (c.nb > FIM_1T && c.nb < ABRE_2T) {
    R.D.entreTurnos.push({ ac: c.ac, cn: c.cn, serie: c.serie, nb: c.nb, esqueleto: c.esq, usos,
      urnaDaSecaoNo1t: usos.map((k) => certPorSecao[1].get(k.slice(2)) ?? null),
      votouNo1t: urnasNoTurno[1].has(Number(c.cn.slice(4))) });
  }
}
R.D.entreTurnos.sort((a, b) => (a.nb < b.nb ? -1 : 1));
R.D.porAc = {};
for (const x of R.D.entreTurnos) inc(R.D.porAc, x.ac);

// ---------- E. validade ----------
R.E = {};
for (const c of certs.values()) {
  const dias = (Date.parse(c.na) - Date.parse(c.nb)) / 864e5;
  const cat = c.na === '2037-12-31T23:00:00.000Z' ? 'teto' : Math.abs(dias - 5000) < 1e-6 ? '5000 dias' : 'outra';
  const r = ((R.E[c.ac] ??= {})[cat] ??= { n: 0, nbMin: c.nb, nbMax: c.nb });
  r.n++;
  if (c.nb < r.nbMin) r.nbMin = c.nb;
  if (c.nb > r.nbMax) r.nbMax = c.nb;
}

// E2. certificados fora das duas regras: diferença em segundos para 5.000 dias e distância ao certificado mais próximo (qualquer AC)
{
  const tempos = [...certs.values()].map((c) => Date.parse(c.nb)).sort((a, b) => a - b);
  const perto = (t) => {
    let lo = 0, hi = tempos.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (tempos[m] < t) lo = m + 1; else hi = m; }
    // lo = primeira posição com tempo ≥ t (o próprio); o vizinho é lo−1 ou lo+1 (ou outro no mesmo segundo)
    const cands = [tempos[lo - 1], tempos[lo + 1]].filter((x) => x !== undefined).map((x) => Math.abs(x - t));
    return Math.min(...cands) / 1000;
  };
  R.E.foraDasRegras = [];
  for (const c of certs.values()) {
    if (c.na === '2037-12-31T23:00:00.000Z') continue;
    const dif = (Date.parse(c.na) - Date.parse(c.nb)) / 1000 - 5000 * 86400;
    if (dif !== 0) R.E.foraDasRegras.push({ ac: c.ac, cn: c.cn, serie: c.serie, nb: c.nb, na: c.na, segundosAlemDe5000Dias: dif, vizinhoMaisProximoSegundos: perto(Date.parse(c.nb)) });
  }
}

// ---------- F. linhas de emissão ----------
// Menor número de sequências estritamente crescentes (em série) que cobrem os certificados em ordem de data =
// comprimento da maior subsequência não crescente. Calculado com busca binária (paciência).
R.F = {};
const porAc = {};
for (const [sha, c] of certs) (porAc[c.ac] ??= []).push({ sha, ...c, s: BigInt(`0x${c.serie}`) });
for (const [ac, l] of Object.entries(porAc)) {
  l.sort((a, b) => (a.nb < b.nb ? -1 : a.nb > b.nb ? 1 : a.s < b.s ? -1 : 1));
  // maior subsequência não crescente de s = maior subsequência não decrescente de −s (caudas + busca do primeiro > x)
  const caudas = [];
  for (const y of l) {
    const x = -y.s;
    let lo = 0, hi = caudas.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (caudas[m] <= x) lo = m + 1; else hi = m; }
    caudas[lo] = x;
  }
  R.F[ac] = { linhas: caudas.length, serieMin: l.reduce((m, x) => (x.s < m ? x.s : m), l[0].s).toString(16), serieMax: l.reduce((m, x) => (x.s > m ? x.s : m), l[0].s).toString(16) };
}

// ---------- G. séries perto da eleição ----------
R.G = {};
for (const [ac, l] of Object.entries(porAc)) {
  const perto = l.filter((x) => x.nb >= '2026-09-01').sort((a, b) => (a.s < b.s ? -1 : 1));
  if (!perto.length) continue;
  const passos = perto.slice(1).map((x, i) => Number(x.s - perto[i].s));
  R.G[ac] = { visiveis: perto.length, serieDe: perto[0].serie, serieAte: perto.at(-1).serie, faixa: Number(perto.at(-1).s - perto[0].s),
    entreTurnos: perto.filter((x) => x.nb > FIM_1T).map((x) => `${x.serie} ${x.nb}`),
    passosEntreTurnos: (() => { const e = perto.filter((x) => x.nb > FIM_1T); return e.slice(1).map((x, i) => Number(x.s - e[i].s)); })(),
    passosDistintos: Object.fromEntries(Object.entries(passos.reduce((o, p) => (inc(o, p), o), {})).sort((a, b) => b[1] - a[1]).slice(0, 12)) };
  // série anterior ao 1º entre turnos (último antes do fim do 1º turno)
  const antes = l.filter((x) => x.nb <= FIM_1T).sort((a, b) => (a.s < b.s ? -1 : 1)).at(-1);
  R.G[ac].ultimoAntesDoFim1t = antes ? `${antes.serie} ${antes.nb}` : null;
}

// ---------- I. emissões isoladas (nenhum certificado de nenhuma AC a 60 min ou menos) em horário incomum ----------
{
  const todos = [...certs.values()].map((c) => ({ t: Date.parse(c.nb), c })).sort((a, b) => a.t - b.t);
  const fixos = new Set(['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '12-25']);
  // Horário de verão de Brasília (UTC−2) até 2019: início 00h local (03h UTC), fim 00h do horário de verão (02h UTC).
  const VERAO = [['2012-10-21', '2013-02-17'], ['2013-10-20', '2014-02-16'], ['2014-10-19', '2015-02-22'], ['2015-10-18', '2016-02-21'],
    ['2016-10-16', '2017-02-19'], ['2017-10-15', '2018-02-18'], ['2018-11-04', '2019-02-17']].map(([a, b]) => [Date.parse(`${a}T03:00:00Z`), Date.parse(`${b}T02:00:00Z`)]);
  const offset = (t) => (VERAO.some(([a, b]) => t >= a && t < b) ? 2 : 3);
  R.I = { isolados: {}, isoladosIncomuns: [], emVerao: {}, madrugadaFabricacaoAcUrna: { utc3: 0, comVerao: 0 } };
  for (const x of todos) {
    if (offset(x.t) === 2) inc(R.I.emVerao, x.c.ac);
    if (x.c.ac === 'AC URNA') {
      const ano3 = new Date(x.t - 3 * 3600e3);
      if (['2013', '2016'].includes(ano3.toISOString().slice(0, 4))) {
        if (ano3.getUTCHours() < 6) R.I.madrugadaFabricacaoAcUrna.utc3++;
        if (new Date(x.t - offset(x.t) * 3600e3).getUTCHours() < 6) R.I.madrugadaFabricacaoAcUrna.comVerao++;
      }
    }
  }
  todos.forEach((x, i) => {
    const d = Math.min(i ? x.t - todos[i - 1].t : Infinity, i < todos.length - 1 ? todos[i + 1].t - x.t : Infinity);
    if (d <= 3600e3) return;
    inc(R.I.isolados, x.c.ac);
    const l = new Date(x.t - offset(x.t) * 3600e3);
    const hh = l.getUTCHours();
    const dow = l.getUTCDay();
    const md = l.toISOString().slice(5, 10);
    if (hh < 6 || dow === 0 || dow === 6 || fixos.has(md) || (md === '11-20' && l.getUTCFullYear() >= 2024)) {
      R.I.isoladosIncomuns.push({ ac: x.c.ac, cn: x.c.cn, serie: x.c.serie, brasilia: l.toISOString().slice(0, 16), utc: x.c.nb, fuso: `UTC-${offset(x.t)}`, dow, vizinhoMin: Math.round(d / 60e3) });
    }
  });
}

// ---------- H. teste sintético ----------
{
  // um certificado AC URNA e um AC UE2020 reais, tirados de um diretório oficial do 2º turno
  const ex = {};
  for await (const d of ler('2t-dirs.jsonl')) {
    const c = certs.get(d.cert);
    if (!c || ex[c.ac]) continue;
    ex[c.ac] = d;
    if (Object.keys(ex).length === 3) break;
  }
  const linhaInt = async (d) => {
    const rl = createInterface({ input: createReadStream(path.join(DIR_DADOS, 'parsed', 'auditoria', 'integridade', '2t', `${d.uf}.jsonl`)), crlfDelay: Infinity });
    for await (const s of rl) if (s.includes(`"municipio":"${d.mun}","zona":"${d.zona}","secao":"${d.secao}","papel":"oficial"`)) { rl.close(); return JSON.parse(s); }
    return null;
  };
  R.H = {};
  for (const [ac, d] of Object.entries(ex)) {
    const l = await linhaInt(d);
    const vsc = await readFile(path.join(DIR_DADOS, 'raw', '2t', 'urnas', l.uf, l.municipio, l.zona, l.secao, l.hash, l.vsc));
    const { der } = certDoVsc(vsc);
    const base = h('sha256', esqueleto(der).texto).slice(0, 16);
    const cnAtual = certs.get(d.cert).cn;
    const troca = (de, para) => { const b = Buffer.from(der); const i = b.indexOf(Buffer.from(de, 'latin1')); Buffer.from(para, 'latin1').copy(b, i); return b; };
    const prefixo = cnAtual.slice(0, 4);
    const casos = {
      'CN com outro número de 8 dígitos (urna inexistente 00000001)': troca(cnAtual, `${prefixo}00000001`),
      'CN com letras no lugar de dígitos (mesmo tamanho)': troca(cnAtual, `${prefixo}TESTE001`),
      'CN em outra caixa (UEAO ↔ ueao)': troca(cnAtual, (prefixo === 'UEAO' ? 'ueao' : 'UEAO') + cnAtual.slice(4)),
      'validade de 1 ano (só datas)': (() => {
        const b = Buffer.from(der);
        const c = tlv(b, 0); const [tbs] = filhos(b, c.ini, c.fim); const f = filhos(b, tbs.ini, tbs.fim);
        const val = f[f[0].tag === 0xa0 ? 4 : 3]; const [nb, na] = filhos(b, val.ini, val.fim);
        const s = b.subarray(nb.ini, nb.fim).toString('latin1');
        Buffer.from(String(Number(s.slice(0, 2)) + 1).padStart(2, '0') + s.slice(2), 'latin1').copy(b, na.ini);
        return b;
      })(),
      'keyUsage só assinatura (04b0 → 0480)': (() => { const b = Buffer.from(der); const i = b.indexOf(Buffer.from('030204b0', 'hex')); b[i + 3] = 0x80; return b; })(),
      'política com outro OID (0.0.0.0 → 0.0.0.1)': (() => { const b = Buffer.from(der); const i = b.indexOf(Buffer.from('060300000030', 'hex')); b[i + 4] = 0x01; return b; })(),
    };
    R.H[ac] = {};
    for (const [nome, b] of Object.entries(casos)) {
      let r;
      try { r = h('sha256', esqueleto(b).texto).slice(0, 16) === base ? 'esqueleto IGUAL (passa)' : 'esqueleto DIFERENTE (detectado)'; } catch (e) { r = `erro: ${e.message}`; }
      R.H[ac][nome] = r;
    }
  }
}

await writeFile(path.join(DIR, 'analise.json'), JSON.stringify(R, null, 1));
const curto = { ...R, A: { ...R.A, textoEsqueleto: undefined }, B: { ...R.B, excecoesBuLista: R.B.excecoesBuLista.slice(0, 10) } };
console.log(JSON.stringify(curto, null, 1));
