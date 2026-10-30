import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { carregarCorrespondencias as carregar, chave, DIR_H27, lerPacotes, linhasZip, nc, somar, ufZona } from './seguranca-h27-lib.mjs';

// H27, teste 1 (engenheiro de segurança, doc 09): a LISTA DE FORA DO PACOTE.
// O pacote de cada seção (assinado) diz: a urna que assinou (número do certificado = idHW do .vsc), a urna do BU e o
// código de carga do BU. Tudo isso vem do mesmo pacote; conferir um com o outro é circular (parecer 35).
// As correspondências do TSE (dados abertos) vêm de outro caminho: na carga, o cartório transmite o par urna × código
// de carga × seção. O TSE publica:
//   CESP (duas versões por turno: véspera e manhã do dia da votação): urna esperada de cada seção (csec_*) e urnas de
//        contingência de cada zona (ccont_*), com o código de carga;
//   CEFT (depois da votação): para cada seção, a urna esperada e a efetivada (a que gerou o BU), as cargas, a data em
//        que o TSE recebeu cada correspondência, a origem dos votos (U urna, R/B RED, C Sistema de Apuração) e o tipo de
//        divergência (C contingência, D divergência, O anulada/não apurada).
// Este script cruza, seção a seção, a urna e a carga de cada pacote com essas listas:
//   1. universo: seções com pacote × CEFT × CESP;
//   2. urna e carga do BU × efetivadas (CEFT);
//   3. esperada × efetivada (as trocas) e o tipo de divergência;
//   4. urna que ASSINOU × esperada/efetivada e onde ela aparece nas listas do TSE;
//   5. o par urna × carga do BU estava registrado na CESP da véspera? na CESP do dia? quando o TSE recebeu a
//      correspondência da urna efetivada (antes do dia da votação, no dia, depois)?
//   6. urnas esperadas sem pacote; contingências listadas e usadas;
//   7. urna que assinou × faixas públicas de número interno por modelo (modelourna_numerointerno, de 2022);
//   8. ordem no tempo: o TSE recebeu o BU (detalhe_votacao_secao, DT_RECEBIMENTO_BU_HOR_TSE, hora de Brasília) antes ou
//      depois de receber a correspondência da urna efetivada (CEFT, DT_RECBTO_URNA_EFETIVADA)? O CEFT grava esse campo
//      na hora LOCAL da UF (diferença medida contra DT_RECBTO_URNA_ESPERADA, que vem na hora de Brasília, nas seções sem
//      troca: AC 2 h; AM, MS, MT, RO, RR 1 h; demais 0). O exterior, com fusos variados, fica fora deste item.
// O código de carga do BU tem 24 dígitos; o CSV do TSE tira os zeros à esquerda. A comparação ignora esses zeros.
// Saída: data/parsed/auditoria/seguranca-h27/correspondencias-<t>t.json
// Uso: node scripts/auditoria/seguranca-h27-correspondencias.mjs --turno 2

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' } } });
const T = Number(values.turno);
const DIA = { 1: '2026-10-04', 2: '2026-10-25' }[T];
const FAIXAS = [[2009, 999500, 1220500], [2010, 1220501, 1345500], [2011, 1368501, 1370500], [2011, 1600000, 1650000],
  [2013, 1650001, 1701000], [2015, 1750000, 1950000], [2020, 2000000, 2250000]];
const modeloPelaFaixa = (n) => FAIXAS.find(([, a, b]) => n >= a && n <= b)?.[0] ?? null;
const nModelo = { ue2009: 2009, ue2010: 2010, ue2011: 2011, ue2013: 2013, ue2015: 2015, ue2020: 2020, ue2022: 2022 };

const pacotes = await lerPacotes(T);
const pacotesOutro = await lerPacotes(3 - T);
const L = await carregar(`2026-${T}t`);
const LO = await carregar(`2026-${3 - T}t`);
if (L.versoes.length !== 2) throw new Error(`esperava 2 versões da CESP, achei ${L.versoes.length}`);
const [VESPERA, DODIA] = L.versoes;
const { ceft } = L;
const papeisEm = (V, u) => [...(V.papelDaUrna.get(u) ?? [])];
const assinanteOutro = new Map();
for (const [k, p] of pacotesOutro) assinanteOutro.set(p.assinante, k);
const contexto = (k, urna) => ({
  logTemCargaDoBU: pacotes.get(k)?.logCargas.some((x) => nc(x) === nc(pacotes.get(k).cargaBU)) ?? null,
  logPrimeira: pacotes.get(k)?.logPrimeira ?? null, urnaAssinouNoOutroTurno: assinanteOutro.get(urna) ?? null,
  dataCargaBU: pacotes.get(k)?.dataCargaBU ?? null, dataCargaEf: ceft.get(k)?.dataCargaEf ?? null,
  recbtoEsp: ceft.get(k)?.recbtoEsp ?? null, recbtoEf: ceft.get(k)?.recbtoEf ?? null,
  papeisVespera: papeisEm(VESPERA, urna), papeisDoDia: papeisEm(DODIA, urna),
  papeisOutroTurno: [...new Set(LO.versoes.flatMap((V) => papeisEm(V, urna)))],
  urnaBUOutroTurno: pacotesOutro.get(k)?.urnaBU ?? null, tipoUrnaOutroTurno: pacotesOutro.get(k)?.tipoUrna ?? null,
  esperadaOutroTurno: LO.ceft.get(k)?.urnaEsp ?? null,
});

const R = {
  turno: T, arquivos: L.nomes,
  geracaoCesp: { vespera: [VESPERA.geracao[0], VESPERA.geracao.at(-1)], doDia: [DODIA.geracao[0], DODIA.geracao.at(-1)] },
  universo: { pacotes: pacotes.size, ceft: ceft.size, csecVespera: VESPERA.csec.size, csecDoDia: DODIA.csec.size, contVespera: VESPERA.cont, contDoDia: DODIA.cont },
};
const casos = {};
const caso = (nome, item) => (casos[nome] ??= []).push(item);

// 1. Universo
casos.pacoteSemCeft = [...pacotes.keys()].filter((k) => !ceft.has(k));
casos.ceftSemPacote = [...ceft.keys()].filter((k) => !pacotes.has(k));
R.universo.pacoteSemCeft = casos.pacoteSemCeft.length;
R.universo.ceftSemPacote = casos.ceftSemPacote.length;
R.universo.pacoteSemCsecDoDia = {};
for (const k of pacotes.keys()) if (!DODIA.csec.has(k)) somar(R.universo.pacoteSemCsecDoDia, `tipo${pacotes.get(k).tipoUrna}|origem:${ceft.get(k)?.origem}`);

const c = {
  buIgualEfetivada: 0, buDifEfetivada: 0, cargaBuIgualEfetivada: 0, cargaBuDifEfetivada: 0,
  trocas: {}, buDifEsperadaSemDivergencia: 0,
  assinanteIgualBU: 0, assinanteDifBU: 0, assinanteDifBUPorOrigem: {}, assinanteForaEspEf: {}, assinanteEmNenhumaLista: 0, assinanteSoContraCesp: {}, parBUEstrito: {},
  parBU: {}, recbtoEfetivada: {}, recbtoEsperadaNoDiaOuDepois: 0,
  assinanteForaDasFaixas: 0, assinanteUE2022: 0, assinanteModeloDifFaixa: 0,
  csecMudouEntreVersoes: {},
};
for (const [k, p] of pacotes) {
  const f = ceft.get(k);
  const sa = p.origem === 'sa';
  // 2. BU × efetivada
  if (p.urnaBU === f.urnaEf) c.buIgualEfetivada++; else { c.buDifEfetivada++; caso('buDifEfetivada', { k, urnaBU: p.urnaBU, urnaEf: f.urnaEf, origem: f.origem }); }
  if (nc(p.cargaBU) === f.cargaEf) c.cargaBuIgualEfetivada++; else { c.cargaBuDifEfetivada++; caso('cargaBuDifEfetivada', { k, tipoUrna: p.tipoUrna, cargaBU: p.cargaBU, cargaEf: f.cargaEf, origem: f.origem }); }
  // 3. trocas
  somar(c.trocas, `${f.urnaEsp === f.urnaEf ? 'mesmaUrna' : 'outraUrna'}|div:${f.div || '-'}|origem:${f.origem}|tipoUrna${p.tipoUrna}`);
  if (f.urnaEsp !== f.urnaEf && !f.div) { c.buDifEsperadaSemDivergencia++; caso('trocaSemDivergencia', { k, urnaEsp: f.urnaEsp, urnaBU: p.urnaBU, tipoUrna: p.tipoUrna, ...contexto(k, p.urnaBU) }); }
  if (f.recbtoEsp && f.recbtoEsp.slice(0, 10) >= DIA) c.recbtoEsperadaNoDiaOuDepois++;
  // 4. quem assinou
  if (p.assinante === p.urnaBU) c.assinanteIgualBU++;
  else { c.assinanteDifBU++; somar(c.assinanteDifBUPorOrigem, `${f.origem}|${f.dsOrigem}`); }
  const papeisAss = [...new Set([...papeisEm(VESPERA, p.assinante), ...papeisEm(DODIA, p.assinante)])];
  const emCeft = p.assinante === f.urnaEf || p.assinante === f.urnaEsp;
  if (!sa && !papeisAss.length && !emCeft) { c.assinanteEmNenhumaLista++; caso('assinanteEmNenhumaLista', { k, assinante: p.assinante }); }
  // Parecer 38: o CEFT copia a urna do BU, então "nas listas" contando o CEFT é circular. Contra a CESP (lista anterior),
  // o assinante pode estar fora de todas as CESP do turno, e até fora das 4 CESP dos dois turnos.
  if (!sa) {
    const papeisOutro = LO.versoes.flatMap((V) => papeisEm(V, p.assinante));
    const z = ufZona(k);
    const papelCesp = !papeisAss.length ? (papeisOutro.length ? 'soNaCespDoOutroTurno' : 'emNenhumaCespDosDoisTurnos')
      : papeisAss.includes(`secao:${k}`) ? 'esperadaDaPropriaSecao' : papeisAss.includes(`cont:${z}`) ? 'contingenciaDaPropriaZona'
        : papeisAss.some((x) => x.startsWith('cont:')) ? 'contingenciaDeOutraZona' : 'esperadaDeOutraSecao';
    somar(c.assinanteSoContraCesp, `${p.assinante === p.urnaBU ? 'assinante=urnaBU' : 'assinante≠urnaBU'}|${papelCesp}`);
    if (!papeisAss.length) caso('assinanteForaDaCespDoTurno', { k, assinante: p.assinante, urnaBU: p.urnaBU, papelCesp, tipoUrna: p.tipoUrna });
  }
  if (!emCeft) {
    const z = ufZona(k);
    const onde = !papeisAss.length ? 'emNenhumaCesp' : papeisAss.includes(`cont:${z}`) ? 'contingenciaDaMesmaZona'
      : papeisAss.some((x) => x.startsWith('cont:')) ? 'contingenciaDeOutraZona' : 'esperadaDeOutraSecao';
    somar(c.assinanteForaEspEf, `${onde}|origem:${f.origem}`);
    caso('assinanteForaEspEf', { k, assinante: p.assinante, urnaBU: p.urnaBU, origem: f.origem, ds: f.dsOrigem, onde, papeis: papeisAss, ...contexto(k, p.urnaBU) });
  }
  // 5. o par urna × carga do BU nas listas do TSE e a data de recebimento da correspondência efetivada
  if (!sa) {
    const naVespera = VESPERA.cargaDaUrna.get(p.urnaBU)?.has(nc(p.cargaBU)) ?? false;
    const noDia = DODIA.cargaDaUrna.get(p.urnaBU)?.has(nc(p.cargaBU)) ?? false;
    const quando = !f.recbtoEf ? 'semData' : f.recbtoEf.slice(0, 10) < DIA ? 'antesDoDia' : f.recbtoEf.slice(0, 10) === DIA ? 'noDia' : 'depoisDoDia';
    const classe = naVespera ? 'cespVespera' : noDia ? 'soCespDoDia' : `soCeft:${quando}`;
    somar(c.parBU, `${classe}|tipoUrna${p.tipoUrna}|div:${f.div || '-'}|origem:${f.origem}`);
    somar(c.recbtoEfetivada, `${quando}|origem:${f.origem}`);
    // Casamento estrito (parecer 38): o par tem de estar na linha da PRÓPRIA seção ou como contingência da PRÓPRIA zona.
    const estrito = (V) => (V.cargaDaUrna.get(p.urnaBU)?.has(nc(p.cargaBU)) ?? false)
      && papeisEm(V, p.urnaBU).some((x) => x === `secao:${k}` || x === `cont:${ufZona(k)}`);
    const classeEstrita = estrito(VESPERA) ? 'vesperaEstrito' : estrito(DODIA) ? 'soDiaEstrito'
      : naVespera ? 'vesperaOutraZonaOuSecao' : noDia ? 'soDiaOutraZonaOuSecao' : `soCeft:${quando}`;
    somar(c.parBUEstrito, classeEstrita);
    if (!naVespera) caso('parForaDaCespVespera', { k, classe, urnaBU: p.urnaBU, urnaEsp: f.urnaEsp, tipoUrna: p.tipoUrna, div: f.div, origem: f.origem, ...contexto(k, p.urnaBU) });
  }
  // 7. faixas públicas por modelo
  if (!sa) {
    const mf = modeloPelaFaixa(p.assinante);
    const mv = nModelo[p.modelo];
    if (mv === 2022) { c.assinanteUE2022++; if (p.assinante <= 2250000) { c.assinanteModeloDifFaixa++; caso('assinanteModeloDifFaixa', { k, assinante: p.assinante, modelo: p.modelo }); } }
    else if (mf === null) { c.assinanteForaDasFaixas++; caso('assinanteForaDasFaixas', { k, assinante: p.assinante, modelo: p.modelo }); }
    else if (mf !== mv) { c.assinanteModeloDifFaixa++; caso('assinanteModeloDifFaixa', { k, assinante: p.assinante, modelo: p.modelo, modeloDaFaixa: mf }); }
  }
  // CESP: o que mudou entre a véspera e o dia
  const e0 = VESPERA.csec.get(k);
  const e1 = DODIA.csec.get(k);
  if (e0 && e1 && (e0.urna !== e1.urna || e0.carga !== e1.carga)) {
    somar(c.csecMudouEntreVersoes, `tipo${p.tipoUrna}|BU=urnaDoDia:${p.urnaBU === e1.urna}|BU=urnaDaVespera:${p.urnaBU === e0.urna}`);
    caso('csecMudouEntreVersoes', { k, vespera: e0.urna, doDia: e1.urna, urnaBU: p.urnaBU, tipoUrna: p.tipoUrna });
  }
}
R.contagens = c;

// 8. BU recebido × correspondência efetivada recebida (hora de Brasília)
// Diferença entre a hora de Brasília e a hora local, medida por MUNICÍPIO: nas seções sem troca, a correspondência
// esperada e a efetivada são o mesmo registro; a esperada vem na hora de Brasília e a efetivada na local. Vale a
// diferença mais comum do município (em horas inteiras); município sem seção sem troca usa a da UF.
const FUSO_UF = { ac: 2, am: 1, ms: 1, mt: 1, ro: 1, rr: 1 };
const contagemFuso = new Map();
for (const [k, f] of ceft) {
  if (f.urnaEsp !== f.urnaEf || f.cargaEsp !== f.cargaEf || !f.recbtoEsp || !f.recbtoEf) continue;
  const mun = k.split('/').slice(0, 2).join('/');
  const h = Math.round((Date.parse(`${f.recbtoEsp.replace(' ', 'T')}Z`) - Date.parse(`${f.recbtoEf.replace(' ', 'T')}Z`)) / 36e5);
  const m = contagemFuso.get(mun) ?? contagemFuso.set(mun, {}).get(mun);
  m[h] = (m[h] ?? 0) + 1;
}
const FUSO_MUN = new Map([...contagemFuso].map(([mun, m]) => [mun, Number(Object.entries(m).sort((a, b) => b[1] - a[1])[0][0])]));
const fusoDe = (k) => FUSO_MUN.get(k.split('/').slice(0, 2).join('/')) ?? FUSO_UF[k.split('/')[0]] ?? 0;
R.fusoPorMunicipio = { municipios: FUSO_MUN.size, diferencas: [...FUSO_MUN.values()].reduce((o, h) => somar(o, `${h} h`), {}),
  divergeDaUf: [...FUSO_MUN].filter(([mun, h]) => !mun.startsWith('zz/') && h !== (FUSO_UF[mun.split('/')[0]] ?? 0)).map(([mun, h]) => `${mun}: ${h} h`) };
const paraMs = (s) => Date.parse(`${s.replace(' ', 'T')}Z`);
const brMs = (s) => { const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2}:\d{2})$/.exec(s ?? ''); return m ? paraMs(`${m[3]}-${m[2]}-${m[1]} ${m[4]}`) : null; };
const ordem = { buDepoisDaCorrespondencia: 0, buAntesDaCorrespondencia: 0, semHora: 0, foraDoTeste: 0 };
const casosOrdem = [];
for await (const r of linhasZip(path.join(DIR_DADOS, 'raw', 'dadosabertos', 'detalhe_votacao_secao', 'detalhe_votacao_secao_2026.zip'), /_BR\.csv$/)) {
  if (r.DS_CARGO !== 'Presidente' || Number(r.NR_TURNO) !== T) continue;
  const k = chave(r.SG_UF, r.CD_MUNICIPIO, r.NR_ZONA, r.NR_SECAO);
  const p = pacotes.get(k);
  const f = ceft.get(k);
  if (!p || !f || p.origem === 'sa' || k.startsWith('zz/')) { ordem.foraDoTeste++; continue; }
  const bu = brMs(r.DT_RECEBIMENTO_BU_HOR_TSE);
  const tot = brMs(r.DT_PRIM_TOT_PARCIAL_HOR_TSE);
  const corr = f.recbtoEf ? paraMs(f.recbtoEf) + fusoDe(k) * 36e5 : null;
  if (bu === null || corr === null) { ordem.semHora++; continue; }
  const gap = Math.round((bu - corr) / 6e4);
  somar(ordem.intervaloCorrespAteBU ??= {}, gap < 0 ? 'negativo' : gap < 60 ? 'menos de 1 h' : gap < 24 * 60 ? '1 h a 1 dia' : 'mais de 1 dia');
  const caso8 = (casos.parForaDaCespVespera ?? []).find((x) => x.k === k);
  if (caso8) Object.assign(caso8, { buRecebidoTSE: r.DT_RECEBIMENTO_BU_HOR_TSE, primeiraTotalizacao: r.DT_PRIM_TOT_PARCIAL_HOR_TSE, minutosCorrespAteBU: gap });
  if (bu >= corr) ordem.buDepoisDaCorrespondencia++;
  if (gap >= 0) ordem.menorIntervaloMin = Math.min(ordem.menorIntervaloMin ?? Infinity, gap);
  else {
    ordem.buAntesDaCorrespondencia++;
    casosOrdem.push({ k, buRecebido: r.DT_RECEBIMENTO_BU_HOR_TSE, primeiraTotalizacao: r.DT_PRIM_TOT_PARCIAL_HOR_TSE,
      correspEfetivadaBrasilia: new Date(corr).toISOString().slice(0, 19).replace('T', ' '), minutosBuAntes: Math.round((corr - bu) / 6e4),
      totalizadaAntesDaCorrespondencia: tot !== null ? tot < corr : null, tipoUrna: p.tipoUrna, div: f.div, urnaEsp: f.urnaEsp, urnaEf: f.urnaEf });
  }
}
ordem.totalizadaAntesDaCorrespondencia = casosOrdem.filter((x) => x.totalizadaAntesDaCorrespondencia).length;
R.ordemBuCorrespondencia = ordem;
casos.buAntesDaCorrespondencia = casosOrdem.sort((a, b) => b.minutosBuAntes - a.minutosBuAntes);

// 6. urnas esperadas sem pacote e contingências usadas
const urnasComPacote = new Set();
for (const p of pacotes.values()) { urnasComPacote.add(p.urnaBU); urnasComPacote.add(p.assinante); }
R.urnasEsperadasSemPacote = {};
for (const f of ceft.values()) if (!urnasComPacote.has(f.urnaEsp)) somar(R.urnasEsperadasSemPacote, `div:${f.div || '-'}|origem:${f.origem}`);
R.contingenciasDoDia = { listadas: 0, comPacote: 0 };
for (const [u, papeis] of DODIA.papelDaUrna) {
  if (![...papeis].some((x) => x.startsWith('cont:'))) continue;
  R.contingenciasDoDia.listadas++;
  if (urnasComPacote.has(u)) R.contingenciasDoDia.comPacote++;
}
R.cespDoDia = { urnasDistintas: DODIA.cargaDaUrna.size, urnaComVariasCargas: 0, urnaEsperadaEmVariasSecoes: 0 };
for (const [u, cs] of DODIA.cargaDaUrna) {
  if (cs.size > 1) { R.cespDoDia.urnaComVariasCargas++; caso('urnaComVariasCargasNaCesp', { urna: u, cargas: [...cs], papeis: papeisEm(DODIA, u) }); }
  if (papeisEm(DODIA, u).filter((x) => x.startsWith('secao:')).length > 1) R.cespDoDia.urnaEsperadaEmVariasSecoes++;
}

R.casos = Object.fromEntries(Object.entries(casos).map(([n, l]) => [n, { n: l.length, itens: l }]));
await mkdir(DIR_H27, { recursive: true });
const saida = path.join(DIR_H27, `correspondencias-${T}t.json`);
await writeFile(saida, JSON.stringify(R, null, 1));
const { casos: _c, arquivos: _a, ...resumo } = R;
console.log(JSON.stringify({ ...resumo, casosN: Object.fromEntries(Object.entries(R.casos).map(([n, v]) => [n, v.n])) }, null, 1));
console.log(`[h27] ${saida}`);
