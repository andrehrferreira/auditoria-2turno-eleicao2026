// Cientista político, H22: seções apuradas em cédula pelo Sistema de Apuração (SA) e origem do voto em 2022 × 2026.
//
// Mede:
//   1. as seções de SA de 2026 nos dois turnos (banco: tipo_arquivo saManual / saMista...): aptos, comparecimento (soma dos
//      votos de presidente, porque o BU do SA grava qtdEleitoresCompareceram = 0), voto, máquina que assinou, hora de emissão;
//   2. se a hora de emissão do BU de SA vem depois do fim da votação no posto (17 h locais convertidas para Brasília pelo
//      fuso IANA da cidade). Premissa declarada: o relógio da máquina do SA está na hora de Brasília (as duas máquinas
//      que assinam os 29 BUs são as mesmas para postos de fusos de UTC−4 a UTC+9);
//   3. a origem do voto nas correspondências efetivadas (CEFT) de 2022 (1º turno) e 2026 (1º e 2º turnos), por UF:
//      urna, Sistema de Apuração, RED; e quais seções do exterior foram SA em 2022 e em 2026;
//   4. o voto nas seções de SA contra o resto do mesmo país e continente (o SA é um caminho 100% humano: princípio 8).
//
// Uso: node scripts/auditoria/politico-h22-apuracao.mjs
// Saída: data/parsed/auditoria/cientista-politico/h22-apuracao.json
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { entradasZip, linhasCsv } from './contagem-zip.mjs';
import { DIR_SAIDA, DIR_CORRESP, chave, lerLocaisZZ, pp } from './politico-h22-lib.mjs';

const { db, fonte } = await abrirLeitura();
const { cidades } = await lerLocaisZZ();

// Fuso de cada cidade com SA (e MG, para as 2 seções de SA do 1º turno).
const FUSO = {
  29173: 'Asia/Kathmandu', 29254: 'Africa/Abidjan', 29270: 'Africa/Accra', 29297: 'Europe/Istanbul', 29300: 'Africa/Algiers',
  29394: 'Africa/Bissau', 29564: 'America/Caracas', 29580: 'America/Asuncion', 29645: 'Asia/Dili', 29750: 'Asia/Ho_Chi_Minh',
  29777: 'America/Havana', 29858: 'Europe/Kiev', 29912: 'Africa/Lagos', 30163: 'Europe/Moscow', 30171: 'Asia/Kolkata',
  30295: 'America/Argentina/Cordoba', 30325: 'America/Port_of_Spain', 30333: 'America/Port-au-Prince', 30430: 'America/Montevideo',
  30546: 'Europe/Sofia', 30597: 'Asia/Tehran', 30686: 'Africa/Tripoli', 30708: 'Africa/Tunis', 30821: 'Africa/Windhoek',
  38962: 'Africa/Dar_es_Salaam', 39102: 'Asia/Muscat', 99155: 'America/Argentina/Buenos_Aires', 99180: 'America/Nassau',
  99473: 'Asia/Bahrain',
};
/** Deslocamento do fuso (minutos em relação a UTC) num instante. */
function deslocamento(fuso, instante) {
  const nome = new Intl.DateTimeFormat('en-US', { timeZone: fuso, timeZoneName: 'longOffset' }).formatToParts(instante).find((p) => p.type === 'timeZoneName').value;
  const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(nome);
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0)) : 0;
}
/** 17:00 locais do dia da eleição, expressas em hora de Brasília (UTC−3), como 'HH:MM'. */
function fechamentoEmBrasilia(fuso, dia) {
  const aproximado = new Date(`${dia}T17:00:00Z`);
  const off = deslocamento(fuso, aproximado);
  const utc = new Date(Date.parse(`${dia}T17:00:00Z`) - off * 60000);
  const brt = new Date(utc.getTime() - 180 * 60000);
  return { brt: brt.toISOString().slice(11, 16), utcOffsetMin: off, brtIso: brt.toISOString().slice(0, 16).replace('T', ' ') };
}

// ---------- 1. Seções de SA no banco ----------
const linhas = db.prepare(`SELECT s.turno, s.uf, s.municipio, s.zona, s.secao, s.tipo_urna, s.tipo_arquivo, s.numero_interno_urna urna,
    s.data_hora_carga carga, s.codigo_carga, s.emissao,
    (SELECT MAX(e.aptos) FROM secao_eleicao e WHERE e.turno = s.turno AND e.uf = s.uf AND e.municipio = s.municipio AND e.zona = s.zona AND e.secao = s.secao) aptos
  FROM secao s WHERE s.tipo_arquivo LIKE 'sa%'`).all();
const votos = db.prepare(`SELECT tipo_voto, numero, SUM(quantidade) q FROM voto_bu WHERE turno = ? AND uf = ? AND municipio = ? AND zona = ? AND secao = ? AND cargo = 1 GROUP BY 1, 2`);
const nomeMun = db.prepare('SELECT nome FROM municipio WHERE codigo = ?');
const sa = [];
for (const l of linhas) {
  const v = { '13': 0, '22': 0, outros: 0, branco: 0, nulo: 0 };
  for (const x of votos.all(l.turno, l.uf, l.municipio, l.zona, l.secao)) {
    if (x.tipo_voto === 'nominal') v[x.numero === 13 ? '13' : x.numero === 22 ? '22' : 'outros'] += x.q;
    else v[x.tipo_voto === 'branco' ? 'branco' : 'nulo'] += x.q;
  }
  const comp = Object.values(v).reduce((a, b) => a + b, 0);
  const fuso = l.uf === 'zz' ? FUSO[l.municipio] : 'America/Sao_Paulo';
  const dia = l.turno === 1 ? '2026-10-04' : '2026-10-25';
  const fecha = fuso ? fechamentoEmBrasilia(fuso, dia) : null;
  const emissaoHM = l.emissao?.slice(11, 16);
  sa.push({
    turno: l.turno, uf: l.uf, secao: chave(l.municipio, l.zona, l.secao), cidade: nomeMun.get(l.municipio)?.nome,
    pais: l.uf === 'zz' ? cidades.get(l.municipio)?.pais : 'BRASIL', continente: l.uf === 'zz' ? cidades.get(l.municipio)?.continente : 'Brasil',
    arquivo: l.tipo_arquivo, urna: l.urna, carga: l.carga, aptos: l.aptos, comp, votos: v,
    emissao: l.emissao, fuso, fechamentoLocalEmBrasilia: fecha?.brt, utcOffsetMin: fecha?.utcOffsetMin,
    emitidoAntesDoFechamento: fecha ? l.emissao < `${dia} ${fecha.brt}` : null,
    minutosAposFechamento: fecha ? Math.round((Date.parse(`${l.emissao.replace(' ', 'T')}Z`) - Date.parse(`${fecha.brtIso.replace(' ', 'T')}:00Z`)) / 60000) : null,
    emissaoHM,
  });
}
sa.sort((a, b) => a.secao.localeCompare(b.secao) || a.turno - b.turno);

const porTurno = {};
for (const t of [1, 2]) {
  const l = sa.filter((x) => x.turno === t);
  const zz = l.filter((x) => x.uf === 'zz');
  const maquinas = {};
  for (const x of l) maquinas[`${x.uf}:${x.urna} (carga ${x.carga})`] = (maquinas[`${x.uf}:${x.urna} (carga ${x.carga})`] ?? 0) + 1;
  porTurno[t] = {
    secoes: l.length, exterior: zz.length, brasil: l.length - zz.length, maquinas,
    aptosExterior: zz.reduce((a, x) => a + x.aptos, 0), compExterior: zz.reduce((a, x) => a + x.comp, 0),
    comparecimentoExteriorPct: pp(zz.reduce((a, x) => a + x.comp, 0) / zz.reduce((a, x) => a + x.aptos, 0)),
    votosExterior: ['13', '22', 'outros', 'branco', 'nulo'].reduce((o, k) => ({ ...o, [k]: zz.reduce((a, x) => a + x.votos[k], 0) }), {}),
    compAcimaAptos: l.filter((x) => x.comp > x.aptos).length, comparecimentoZero: l.filter((x) => x.comp === 0).map((x) => x.secao),
    emitidosAntesDoFechamento: l.filter((x) => x.emitidoAntesDoFechamento).map((x) => x.secao),
    menorFolgaMinutos: Math.min(...l.map((x) => x.minutosAposFechamento)),
    emissao: { primeira: l.map((x) => x.emissao).sort()[0], ultima: l.map((x) => x.emissao).sort().at(-1) },
  };
}
const secoesZZ = (t) => new Set(sa.filter((x) => x.turno === t && x.uf === 'zz').map((x) => x.secao));
const so1 = [...secoesZZ(1)].filter((k) => !secoesZZ(2).has(k)), so2 = [...secoesZZ(2)].filter((k) => !secoesZZ(1).has(k));

// ---------- 2. Voto no SA contra o resto do país e do continente (exterior) ----------
const resto = db.prepare(`SELECT s.municipio, SUM(CASE WHEN b.tipo_voto = 'nominal' AND b.numero = 13 THEN b.quantidade ELSE 0 END) v13,
    SUM(CASE WHEN b.tipo_voto = 'nominal' AND b.numero = 22 THEN b.quantidade ELSE 0 END) v22, SUM(b.quantidade) comp
  FROM secao s JOIN voto_bu b ON b.turno = s.turno AND b.uf = s.uf AND b.municipio = s.municipio AND b.zona = s.zona AND b.secao = s.secao AND b.cargo = 1
  WHERE s.turno = ? AND s.uf = 'zz' AND s.tipo_arquivo NOT LIKE 'sa%' GROUP BY s.municipio`);
const comparacao = {};
for (const t of [1, 2]) {
  const porPais = new Map(), porCont = new Map();
  for (const x of resto.all(t)) {
    const c = cidades.get(x.municipio);
    for (const [m, k] of [[porPais, c?.pais], [porCont, c?.continente]]) {
      const a = m.get(k) ?? { v13: 0, v22: 0, comp: 0 };
      a.v13 += x.v13; a.v22 += x.v22; a.comp += x.comp; m.set(k, a);
    }
  }
  const l = sa.filter((x) => x.turno === t && x.uf === 'zz');
  const s13 = l.reduce((a, x) => a + x.votos['13'], 0), s22 = l.reduce((a, x) => a + x.votos['22'], 0);
  // Esperado: cada seção de SA com a fatia do 13 do resto do seu país (se houver seção com urna lá) ou do continente.
  let esperado13 = 0, base = { pais: 0, continente: 0 };
  for (const x of l) {
    const n = x.votos['13'] + x.votos['22'];
    const p = porPais.get(x.pais);
    const ref = p && p.v13 + p.v22 >= 100 ? (base.pais++, p) : (base.continente++, porCont.get(x.continente));
    esperado13 += n * (ref.v13 / (ref.v13 + ref.v22));
  }
  comparacao[t] = { fatia13SA: pp(s13 / (s13 + s22)), votos13: s13, votos22: s22, esperado13: Math.round(esperado13), diferenca13: Math.round(s13 - esperado13), referencia: base };
}

// ---------- 3. Origem do voto nas correspondências efetivadas: 2022 × 2026 ----------
async function lerCeft(dir) {
  const arquivos = readdirSync(`${DIR_CORRESP}/${dir}`).filter((n) => /^CEFT_.*\.zip$/.test(n));
  const porUf = {}, saZZ = [], urnasSA = {};
  for (const arq of arquivos) {
    const zip = `${DIR_CORRESP}/${dir}/${arq}`;
    const e = (await entradasZip(zip)).find((x) => x.nome.toLowerCase().endsWith('.csv'));
    for await (const bruto of linhasCsv(zip, e)) {
      const l = Object.fromEntries(Object.entries(bruto).map(([k, v]) => [k.trim(), (v ?? '').trim()]));
      const uf = l.SG_UF, origem = l.DS_ORIGEM_VOTO;
      porUf[uf] ??= {};
      porUf[uf][origem] = (porUf[uf][origem] ?? 0) + 1;
      if (/apura/i.test(origem)) {
        urnasSA[`${uf}:${l.NR_URNA_EFETIVADA}`] = (urnasSA[`${uf}:${l.NR_URNA_EFETIVADA}`] ?? 0) + 1;
        if (uf === 'ZZ') saZZ.push({ secao: chave(l.CD_MUNICIPIO, l.NR_ZONA, l.NR_SECAO), nomeNoArquivo: l.NM_MUNICIPIO, urna: l.NR_URNA_EFETIVADA, maquina: l.NM_MAQUINA_TRANSM_CORRESP ?? null });
      }
    }
  }
  const total = {};
  for (const o of Object.values(porUf)) for (const [k, v] of Object.entries(o)) total[k] = (total[k] ?? 0) + v;
  return { arquivos: arquivos.length, total, porUf, urnasSA, saZZ };
}
const ceft = { '2022-1t': await lerCeft('2022-1t'), '2026-1t': await lerCeft('2026-1t'), '2026-2t': await lerCeft('2026-2t') };
const sa2022 = new Set(ceft['2022-1t'].saZZ.map((x) => x.secao));
const sa2026 = secoesZZ(2);
const nomeErrado = {};
for (const k of ['2026-1t', '2026-2t']) {
  nomeErrado[k] = { total: ceft[k].saZZ.length, nomesNoArquivo: {} };
  for (const x of ceft[k].saZZ) nomeErrado[k].nomesNoArquivo[x.nomeNoArquivo] = (nomeErrado[k].nomesNoArquivo[x.nomeNoArquivo] ?? 0) + 1;
}
// Conferência: as seções de SA no CEFT de 2026 batem com as do banco?
const confere = { '2026-1t': null, '2026-2t': null };
for (const [k, t] of [['2026-1t', 1], ['2026-2t', 2]]) {
  const a = new Set(ceft[k].saZZ.map((x) => x.secao)), b = secoesZZ(t);
  confere[k] = { ceft: a.size, banco: b.size, soNoCeft: [...a].filter((x) => !b.has(x)), soNoBanco: [...b].filter((x) => !a.has(x)) };
}
const historico = {
  sa2022Exterior: sa2022.size, sa2026Exterior: sa2026.size,
  emAmbos: [...sa2026].filter((k) => sa2022.has(k)).length,
  so2026: [...sa2026].filter((k) => !sa2022.has(k)).map((k) => `${k} ${sa.find((x) => x.secao === k)?.cidade}`),
  so2022: sa2022.size - [...sa2026].filter((k) => sa2022.has(k)).length,
  maquinas2022: Object.entries(ceft['2022-1t'].urnasSA).length, maquinas2022Lista: ceft['2022-1t'].urnasSA,
  aptos2026DosSa2022QueViraramUrna: null,
};
// As seções que foram SA em 2022 e votaram em urna em 2026: quanto pesam?
const aptosSecao = db.prepare(`SELECT s.tipo_arquivo, (SELECT MAX(aptos) FROM secao_eleicao e WHERE e.turno = s.turno AND e.uf = s.uf AND e.municipio = s.municipio AND e.zona = s.zona AND e.secao = s.secao) aptos
  FROM secao s WHERE s.turno = 2 AND s.uf = 'zz' AND s.municipio = ? AND s.zona = ? AND s.secao = ?`);
let n = 0, ap = 0, ausentes = 0;
for (const k of sa2022) {
  if (sa2026.has(k)) continue;
  const [m, z, s] = k.split('/');
  const x = aptosSecao.get(m, z, s);
  if (!x) { ausentes++; continue; }
  n++; ap += x.aptos ?? 0;
}
historico.aptos2026DosSa2022QueViraramUrna = { secoes: n, aptos: ap, semLinhaEm2026: ausentes };

mkdirSync(DIR_SAIDA, { recursive: true });
const resultado = {
  geradoEm: new Date().toISOString(), fonteBanco: fonte,
  premissaRelogio: 'emissão do BU do SA lida como hora de Brasília (UTC−3)',
  porTurno, so1, so2, comparacao, historico, confereCeftBanco: confere, nomeMunicipioNoCeft: nomeErrado,
  origemDoVoto: Object.fromEntries(Object.entries(ceft).map(([k, v]) => [k, { arquivos: v.arquivos, total: v.total, exterior: v.porUf.ZZ, urnasSA: v.urnasSA }])),
  secoes: sa,
};
writeFileSync(`${DIR_SAIDA}/h22-apuracao.json`, JSON.stringify(resultado, null, 1));

console.log(`Banco: ${fonte}`);
for (const t of [1, 2]) console.log(`SA ${t}º turno:`, JSON.stringify(porTurno[t]));
console.log('Só num turno (exterior):', so1, so2);
console.log('Voto SA × resto do país/continente:', JSON.stringify(comparacao));
console.log('Histórico 2022 × 2026:', JSON.stringify({ ...historico, maquinas2022Lista: undefined }));
console.log('CEFT × banco:', JSON.stringify(confere));
console.log('Nome do município no CEFT (linhas de SA):', JSON.stringify(nomeErrado));
for (const [k, v] of Object.entries(ceft)) console.log(`Origem do voto ${k}:`, JSON.stringify(v.total), '| exterior:', JSON.stringify(v.porUf.ZZ));
