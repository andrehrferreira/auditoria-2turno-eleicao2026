// Cético, parecer 41, item 1(b): as 2 urnas da BA zona 71 e a coincidência com o certificado tardio.
// Caminho próprio:
//   1. listas do TSE (todas as UFs): CESP 2026 dos dois turnos (seção e contingência, véspera e dia) e CEFT de 2022,
//      2024 e 2026; conjunto de urnas por lista;
//   2. BU dos dois turnos (cópia de leitura), sem o Sistema de Apuração (tipo_urna = 'contingencia');
//   3. certificado da urna que assinou cada pacote do 2º turno (seguranca-h25/2t-certs.jsonl; os 4 da BA 71 foram
//      relidos no bruto com node:crypto à parte); "tardio" = AC URNA com início de validade depois de 18/07/2026;
//   4. varredura dos diários do 2º turno (reservas-rastro/varredura): data digitada da carga do BU, mídia de carga e
//      data de geração da mídia;
//   5. conjunto B = urnas de BU do 2º turno fora das 4 CESP de 2026; conjunto A = seções do 2º turno com certificado
//      tardio; chance de A ∩ B ≥ 1 por acaso (hipergeométrica) no universo todo e só nas urnas da AC URNA;
//      taxa de certificado tardio por grupo (urna trocada entre os turnos, carga entre os turnos, urna nova nas listas);
//   6. BA zona 71, todas as seções: urna 1º × 2º turno, CESP/CEFT, e do diário bruto do 2º turno a carga, a mídia de
//      carga, a mídia de votação (serial e geração) e a mídia de resultado.
// Uso: node --max-old-space-size=6000 scripts/auditoria/cetico-41-ba71.mjs
import { createReadStream } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { linhasZip } from './seguranca-h27-lib.mjs';
import { SAIDA, diariosDoPacote, pacote, parse } from './cetico-41-lib.mjs';

const A = path.join(DIR_DADOS, 'parsed', 'auditoria');
const DC = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'correspondencias');
const n8 = (x) => String(Number(x)).padStart(8, '0');
// A CESP/CEFT grava o código de carga sem os zeros à esquerda; o BU e o diário, com eles.
const semZeros = (c) => String(c ?? '').replace(/\D/g, '').replace(/^0+/, '');
const kDe = (uf, m, z, s) => `${uf.toLowerCase()}/${String(m).padStart(5, '0')}/${String(z).padStart(4, '0')}/${String(s).padStart(4, '0')}`;
async function* jsonl(arq) { for await (const l of createInterface({ input: createReadStream(arq), crlfDelay: Infinity })) if (l) yield JSON.parse(l); }
const t0 = Date.now();

// 1. Listas
const listas = {}; // nome -> Set(urna)
const cesp2Pares = new Set(); // urna|carga na CESP do 2º turno
const ceft2Zona71 = [];
for (const pasta of ['2022-1t', '2024-1t', '2026-1t', '2026-2t']) {
  for (const arq of (await readdir(path.join(DC, pasta))).filter((n) => n.endsWith('.zip'))) {
    const tipo = arq.split('_')[0]; const nome = `${pasta} ${tipo}`;
    const S = (listas[nome] ??= new Set());
    for await (const r of linhasZip(path.join(DC, pasta, arq))) {
      for (const c of ['NR_URNA_ESPERADA', 'NR_URNA_EFETIVADA']) if (r[c] && Number(r[c]) > 0) S.add(n8(r[c]));
      if (pasta === '2026-2t' && tipo === 'CESP' && r.NR_URNA_ESPERADA) cesp2Pares.add(`${n8(r.NR_URNA_ESPERADA)}|${semZeros(r.CD_CARGA_URNA_ESPERADA)}`);
      if (pasta === '2026-2t' && tipo === 'CEFT' && r.SG_UF === 'BA' && Number(r.NR_ZONA) === 71) ceft2Zona71.push({ k: kDe(r.SG_UF, r.CD_MUNICIPIO, r.NR_ZONA, r.NR_SECAO),
        esperada: n8(r.NR_URNA_ESPERADA), efetivada: n8(r.NR_URNA_EFETIVADA), fcEsp: r.CD_FLASHCARD_URNA_ESPERADA, fcEfe: r.CD_FLASHCARD_URNA_EFETIVADA,
        dtCargaEsp: r.DT_CARGA_URNA_ESPERADA, dtCargaEfe: r.DT_CARGA_URNA_EFETIVADA, recEsp: r.DT_RECBTO_URNA_ESPERADA, recEfe: r.DT_RECBTO_URNA_EFETIVADA,
        div: r.TP_DIVERGENCIA, maqGer: r.NM_MAQUINA_GERACAO_MIDIA, maqTx: r.NM_MAQUINA_TRANSM_CORRESP });
    }
  }
}
const cesp2026 = new Set([...listas['2026-1t CESP'], ...listas['2026-2t CESP']]);
const antes = new Set([...listas['2022-1t CEFT'], ...listas['2024-1t CEFT']]);

// 2. BU
const { db, fonte } = await abrirLeitura();
const bu = { 1: new Map(), 2: new Map() };
for (const r of db.prepare(`SELECT turno, uf, municipio, zona, secao, tipo_urna, modelo_urna, numero_interno_urna u, codigo_carga c, data_hora_carga dc FROM secao
  WHERE situacao='completa' AND numero_interno_urna IS NOT NULL AND tipo_urna <> 'contingencia'`).iterate()) {
  bu[r.turno].set(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, { urna: n8(r.u), tipo: r.tipo_urna, modelo: r.modelo_urna, codigo: String(r.c ?? '').replace(/\D/g, ''), dc: r.dc });
}
db.close();

// 3. Certificados do 2º turno
const cert = new Map();
for await (const o of jsonl(path.join(A, 'seguranca-h25', '2t-certs.jsonl'))) {
  if (o.origem === 'sa') continue;
  cert.set(`${o.uf}/${o.mun}/${o.zona}/${o.secao}`, { emissor: o.emissor, nb: o.nb?.iso, idHW: o.idHW });
}
const tardio = (c) => c && c.emissor === 'AC URNA' && c.nb > '2026-07-19';

// 4. Varredura do 2º turno: carga do BU
const carga = new Map();
for (const arq of (await readdir(path.join(A, 'reservas-rastro', 'varredura'))).filter((n) => /^[a-z]{2}\.jsonl$/.test(n))) {
  for await (const p of jsonl(path.join(A, 'reservas-rastro', 'varredura', arq))) {
    for (const g of p.logs ?? []) for (const c of g.cargas ?? []) if (c.codigo) {
      const id = `${g.urna}|${c.codigo}`;
      if (!carga.has(id)) carga.set(id, { dig: c.digitada, fc: c.fc, fcGer: c.fcGeracao, fcPc: c.fcComputador });
    }
  }
}
const dataBR = (s) => (s ? `${s.slice(6, 10)}-${s.slice(3, 5)}-${s.slice(0, 2)}` : null);

// 5. Conjuntos e grupos
const linhas2 = [];
for (const [k, b] of bu[2]) {
  const c = cert.get(k); const cg = carga.get(`${b.urna}|${b.codigo}`);
  const u1 = bu[1].get(k)?.urna ?? null;
  const dCarga = dataBR(cg?.dig);
  linhas2.push({ k, urna: b.urna, modelo: b.modelo, tipo: b.tipo, acUrna: c?.emissor === 'AC URNA', tardio: tardio(c), semCert: !c,
    foraCesp2026: !cesp2026.has(b.urna), foraCesp2t: !listas['2026-2t CESP'].has(b.urna), parNaCesp2t: cesp2Pares.has(`${b.urna}|${semZeros(b.codigo)}`),
    trocada: u1 !== null && u1 !== b.urna, semBu1t: u1 === null, cargaEntreTurnos: dCarga !== null && dCarga >= '2026-10-05', fcDo1t: cg ? dataBR(cg.fcGer) < '2026-10-04' : null,
    novaNasListas: !antes.has(b.urna) });
}
const N = linhas2.length;
const conta = (f) => linhas2.filter(f).length;
const Aset = linhas2.filter((x) => x.tardio); const Bset = linhas2.filter((x) => x.foraCesp2026);
function hiperMin1(N, a, b) { // P(X >= 1), X ~ Hiper(N, a, b)
  let lp0 = 0; for (let i = 0; i < b; i++) lp0 += Math.log((N - a - i) / (N - i));
  return 1 - Math.exp(lp0);
}
const res = { fonte, listas: Object.fromEntries(Object.entries(listas).map(([k, v]) => [k, v.size])), N, A: Aset.length, B: Bset.length,
  AB: linhas2.filter((x) => x.tardio && x.foraCesp2026).map((x) => x.k), B_lista: Bset.map((x) => `${x.k} ${x.urna} ${x.modelo} ${x.acUrna ? 'AC URNA' : ''}`) };
const Nold = conta((x) => x.acUrna); const Bold = conta((x) => x.acUrna && x.foraCesp2026);
res.acaso = {
  universoTodo: { N, a: Aset.length, b: Bset.length, esperado: (Aset.length * Bset.length) / N, pAoMenos1: hiperMin1(N, Aset.length, Bset.length) },
  soAcUrna: { N: Nold, a: Aset.length, b: Bold, esperado: (Aset.length * Bold) / Nold, pAoMenos1: hiperMin1(Nold, Aset.length, Bold) },
};
// Taxa de tardio por grupo (só urnas da AC URNA, que são as únicas que podem ter certificado tardio)
const grupos = {
  'todas AC URNA': (x) => x.acUrna,
  'urna trocada entre turnos': (x) => x.acUrna && x.trocada,
  'mesma urna nos 2 turnos': (x) => x.acUrna && !x.trocada && !x.semBu1t,
  'carga entre os turnos (>= 05/10)': (x) => x.acUrna && x.cargaEntreTurnos,
  'carga entre os turnos com mídia do 1º turno': (x) => x.acUrna && x.cargaEntreTurnos && x.fcDo1t,
  'carga em setembro/até 04/10': (x) => x.acUrna && !x.cargaEntreTurnos,
  'urna fora das CEFT 2022 e 2024': (x) => x.acUrna && x.novaNasListas,
  'urna presente nas CEFT 2022 ou 2024': (x) => x.acUrna && !x.novaNasListas,
  'fora da CESP do 2º turno': (x) => x.acUrna && x.foraCesp2t,
  'fora das 4 CESP de 2026': (x) => x.acUrna && x.foraCesp2026,
  'reservaSecao': (x) => x.acUrna && x.tipo !== 'secao',
};
res.taxaTardio = Object.fromEntries(Object.entries(grupos).map(([g, f]) => { const n = conta(f); const t = conta((x) => f(x) && x.tardio); return [g, { n, tardios: t, taxa: n ? +(t / n).toFixed(5) : null }]; }));
// Carga entre os turnos com mídia do 1º turno: quantas estão na CESP do 2º turno (par urna|carga)
const cet = linhas2.filter((x) => x.cargaEntreTurnos && x.fcDo1t);
res.cargaEntreTurnosMidia1t = { n: cet.length, parNaCesp2t: cet.filter((x) => x.parNaCesp2t).length, urnaForaCesp2026: cet.filter((x) => x.foraCesp2026).length,
  urnaForaCesp2t: cet.filter((x) => x.foraCesp2t).length, trocadas: cet.filter((x) => x.trocada).length, porUf: cet.reduce((o, x) => ({ ...o, [x.k.slice(0, 2)]: (o[x.k.slice(0, 2)] ?? 0) + 1 }), {}),
  foraDaCesp2t: cet.filter((x) => !x.parNaCesp2t).map((x) => `${x.k} ${x.urna} ${x.tipo} tardio=${x.tardio} foraCesp2026=${x.foraCesp2026}`) };
res.tardios2t = Aset.map((x) => `${x.k} ${x.urna} ${x.modelo} ${x.tipo} trocada=${x.trocada} cargaEntreTurnos=${x.cargaEntreTurnos} novaNasListas=${x.novaNasListas} foraCesp2t=${x.foraCesp2t}`);

// 6. BA zona 71
const z71 = [];
for (const [k, b] of bu[2]) {
  if (!k.startsWith('ba/') || k.split('/')[2] !== '0071') continue;
  const u1 = bu[1].get(k)?.urna ?? null;
  const o = { k, urna1t: u1, urna2t: b.urna, trocada: u1 !== b.urna, tardio: tardio(cert.get(k)), naCesp2t: listas['2026-2t CESP'].has(b.urna), parNaCesp2t: cesp2Pares.has(`${b.urna}|${semZeros(b.codigo)}`) };
  const p = await pacote(2, k);
  const ds = await diariosDoPacote(p);
  const L = parse(ds[0].texto);
  o.primeiraLinha = L[0]?.dh ?? null;
  const cargas = L.filter((l) => /^Identificador da mídia de carga/.test(l.msg)).map((l) => l.dh.slice(0, 10) + ' ' + l.msg.split(':')[1].trim());
  o.cargas = [...new Set(cargas)];
  o.fcGeracao = [...new Set(L.filter((l) => /^Data e hora da geração da mídia de carga/.test(l.msg)).map((l) => l.msg.split(': ')[1]))];
  o.mv = [...new Set(L.filter((l) => /^Serial da MV: /.test(l.msg)).map((l) => l.msg.slice(14)))];
  o.mvGeracao = [...new Set(L.filter((l) => /^Data e hora da geração da mídia de votação/.test(l.msg)).map((l) => l.msg.split(': ')[1]))];
  o.mrGeracao = [...new Set(L.filter((l) => /^Data e hora da geração da MR/.test(l.msg)).map((l) => l.msg.split(': ')[1]))];
  o.transitada = L.filter((l) => /Urna transitada para 2/.test(l.msg)).map((l) => l.dh);
  o.mvPrimeiraVez = L.filter((l) => /Mídia de votação sendo utilizada pela primeira vez/.test(l.msg)).map((l) => l.dh.slice(0, 10));
  o.diarios = ds.length;
  o.ceft = ceft2Zona71.find((r) => r.k === k) ?? null;
  z71.push(o);
}
res.zona71 = {
  secoes: z71.length,
  trocadas: z71.filter((o) => o.trocada).map((o) => ({ k: o.k, urna1t: o.urna1t, urna2t: o.urna2t, naCesp2t: o.naCesp2t, parNaCesp2t: o.parNaCesp2t, tardio: o.tardio, primeiraLinha: o.primeiraLinha,
    cargas: o.cargas, mv: o.mv, mvGeracao: o.mvGeracao, mrGeracao: o.mrGeracao, transitada: o.transitada, mvPrimeiraVez: o.mvPrimeiraVez, ceft: o.ceft })),
  mvPrimeiraVezEmOutubro: z71.filter((o) => o.mvPrimeiraVez.some((d) => d.slice(3, 5) === '10')).map((o) => o.k),
  mvGeradas18_09_08h: z71.filter((o) => o.mvGeracao.some((g) => g.startsWith('18/09/2026 08:4'))).map((o) => `${o.k} ${o.mvGeracao.join(',')}`),
  mrGeracao: z71.reduce((m, o) => { for (const g of o.mrGeracao) m[g.slice(0, 10)] = (m[g.slice(0, 10)] ?? 0) + 1; return m; }, {}),
  transitadaPorDia: z71.reduce((m, o) => { for (const g of o.transitada) m[g.slice(0, 10)] = (m[g.slice(0, 10)] ?? 0) + 1; return m; }, {}),
  primeiraLinhaEmOutubro: z71.filter((o) => o.primeiraLinha?.slice(3, 5) === '10').map((o) => o.k),
  recebimentoCeft: z71.filter((o) => o.ceft && o.ceft.recEfe && o.ceft.recEfe >= '2026-10-25').map((o) => `${o.k} ${o.ceft.recEfe} esp=${o.ceft.esperada} efe=${o.ceft.efetivada} maqTx=${o.ceft.maqTx}`),
};
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, 'ba71.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify({ ...res, tardios2t: res.tardios2t.length }, null, 1));
console.log(`${((Date.now() - t0) / 1000).toFixed(0)} s`);
