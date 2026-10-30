// Estatístico eleitoral, chegada dos BUs × divulgação (docs/analysis/linha-do-tempo/06). Monta uma linha por seção
// (Presidente) com os três horários de cada turno, todos em hora de Brasília:
//   fim   = emissão do BU (relógio local da urna, tabela `secao` do banco) − diferença do fuso do município
//           (data/parsed/auditoria/tempo/2t/fuso-municipio.csv; sem horário de verão nos dois turnos). Exterior: sem
//           fuso conhecido → vazio. Seções com relógio fora da hora do município usam a diferença da própria seção
//           (relogio-fora-do-fuso.mjs, docs/analysis/linha-do-tempo/07; 81 seções no 1º turno).
//   receb = DT_RECEBIMENTO_BU_HOR_TSE do detalhe_votacao_secao (dados abertos do TSE; "HOR_TSE" = Brasília).
//   tot   = DT_PRIM_TOT_PARCIAL_HOR_TSE do mesmo arquivo (primeira entrada da seção na totalização).
//   aux_* = dr/hr dos hashes do aux.json do 2º turno (estatistico-chegada-bu-aux.mjs), só para conferência.
// Votos 13 e 22 por seção e turno: tabela voto_oficial do banco (igual a scripts/curva-totalizacao.mjs).
// Saída: data/parsed/auditoria/chegada-bu/secoes.csv e dados-resumo.json
// Uso: node --max-old-space-size=8192 scripts/auditoria/estatistico-chegada-bu-dados.mjs
// (antes: node scripts/auditoria/estatistico-chegada-bu-aux.mjs)
import { mkdir, open, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';
import { difRelogioPorSecao, difSecao } from './relogio-fora-do-fuso.mjs';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'chegada-bu');
const chave = (uf, m, z, s) => `${uf.toLowerCase()}/${Number(m)}/${Number(z)}/${Number(s)}`;
/** "25/10/2026 19:42:13" → ms (relógio tratado como UTC só para fazer contas; o valor é hora de Brasília). */
const msBr = (t) => {
  const m = /(\d\d)\/(\d\d)\/(\d{4}) (\d\d):(\d\d):(\d\d)/.exec(t ?? '');
  return m ? Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6]) : null;
};
const msIso = (t) => (t ? Date.parse(`${t.replace(' ', 'T')}Z`) : null);
const fmt = (ms) => (ms === null || ms === undefined || Number.isNaN(ms) ? '' : new Date(ms).toISOString().slice(0, 19).replace('T', ' '));

// 1. Detalhe por seção (dados abertos): o arquivo _BR.csv tem as linhas de Presidente dos dois turnos.
const dir = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'detalhe_votacao_secao');
const h = await open(path.join(dir, (await readdir(dir)).find((n) => n.endsWith('.zip'))));
const entradas = await listarEntradas(h);
const det = { 1: new Map(), 2: new Map() };
const contDet = { linhas: 0, presidente: { 1: 0, 2: 0 }, duplicadas: 0, semReceb: 0, semTot: 0, arquivos: [] };
for (const e of entradas.filter((x) => /_BR\.csv$/i.test(x.nome))) {
  contDet.arquivos.push(e.nome);
  const buf = await lerEntrada(h, e);
  const fimCab = buf.indexOf(10);
  const col = buf.toString('latin1', 0, fimCab).trim().split(';').map((c) => c.replace(/"/g, ''));
  const i = Object.fromEntries(col.map((c, k) => [c, k]));
  for (let pos = fimCab + 1; pos < buf.length;) {
    let fim = Math.min(buf.length, pos + 64 * 1024 * 1024);
    if (fim < buf.length) fim = buf.indexOf(10, fim) + 1 || buf.length;
    for (const l of buf.toString('latin1', pos, fim).split(/\r?\n/)) {
      if (!l) continue;
      contDet.linhas++;
      const c = l.split(';').map((x) => x.replace(/"/g, ''));
      const turno = c[i.NR_TURNO];
      if (c[i.CD_CARGO] !== '1' || !det[turno]) continue;
      contDet.presidente[turno]++;
      const k = chave(c[i.SG_UF], c[i.CD_MUNICIPIO], c[i.NR_ZONA], c[i.NR_SECAO]);
      if (det[turno].has(k)) { contDet.duplicadas++; continue; }
      const receb = msBr(c[i.DT_RECEBIMENTO_BU_HOR_TSE]);
      const tot = msBr(c[i.DT_PRIM_TOT_PARCIAL_HOR_TSE]);
      if (receb === null) contDet.semReceb++;
      if (tot === null) contDet.semTot++;
      det[turno].set(k, { receb, tot, aptos: +c[i.QT_APTOS], comp: +c[i.QT_COMPARECIMENTO], origem: c[i.DS_ORIGEM_VOTO], local: c[i.NR_LOCAL_VOTACAO] });
    }
    pos = fim;
  }
}
await h.close();

// 2. Banco: emissão do BU e votos 13/22 dos dois turnos.
const { db, fonte } = await abrirLeitura();
const votos = { 1: new Map(), 2: new Map() };
for (const r of db.prepare('SELECT turno, uf, municipio, zona, secao, numero, quantidade FROM voto_oficial WHERE turno IN (1, 2) AND cargo = 1 AND numero IN (13, 22)').iterate()) {
  const k = chave(r.uf, r.municipio, r.zona, r.secao);
  const v = votos[r.turno].get(k) ?? { v13: 0, v22: 0 };
  if (r.numero === 13) v.v13 += r.quantidade; else v.v22 += r.quantidade;
  votos[r.turno].set(k, v);
}
const emissao1 = new Map();
for (const r of db.prepare('SELECT uf, municipio, zona, secao, emissao FROM secao WHERE turno = 1').iterate()) emissao1.set(chave(r.uf, r.municipio, r.zona, r.secao), r.emissao);
const secoes = db.prepare('SELECT uf, municipio, zona, secao, tipo_urna, emissao FROM secao WHERE turno = 2').all().map((r) => ({ ...r }));
db.close();

// 3. Fuso por município e horários do aux.
const fuso = new Map();
for (const l of (await readFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'tempo', '2t', 'fuso-municipio.csv'), 'utf8')).split(/\r?\n/).slice(1)) {
  if (!l) continue;
  const c = l.split(',');
  if (c[6] !== '') fuso.set(`${c[0]}/${Number(c[1])}`, Number(c[6]));
}
const aux = new Map();
for (const l of (await readFile(path.join(SAIDA, 'aux-horarios.csv'), 'utf8')).split(/\r?\n/).slice(1)) {
  if (!l) continue;
  const c = l.split(',');
  aux.set(chave(c[0], c[1], c[2], c[3]), { n: +c[7], st: c[5], primeiro: msIso(c[8]), ultimo: msIso(c[9]) });
}

// 4. Junta. Universo = seções do banco no 2º turno (499.248). Cada falta é contada.
const relogio = { 1: difRelogioPorSecao(1), 2: difRelogioPorSecao(2) };
const cont = { secoesBanco: secoes.length, semDetalhe2t: 0, semDetalhe1t: 0, semVoto2t: 0, semVoto1t: 0, semFuso: 0, semEmissao2t: 0, semEmissao1t: 0, detalheSemBanco: 0 };
const linhas = [];
const vistas = new Set();
for (const s of secoes) {
  const k = chave(s.uf, s.municipio, s.zona, s.secao);
  vistas.add(k);
  const d2 = det[2].get(k), d1 = det[1].get(k), v2 = votos[2].get(k), v1 = votos[1].get(k), a = aux.get(k);
  if (!d2) cont.semDetalhe2t++;
  if (!d1) cont.semDetalhe1t++;
  if (!v2) cont.semVoto2t++;
  if (!v1) cont.semVoto1t++;
  const dif = fuso.get(`${s.uf}/${Number(s.municipio)}`);
  if (dif === undefined) cont.semFuso++;
  const e1 = emissao1.get(k);
  if (!s.emissao) cont.semEmissao2t++;
  if (!e1) cont.semEmissao1t++;
  const dif2 = difSecao(relogio[2], s.uf, s.municipio, s.zona, s.secao, dif), dif1 = difSecao(relogio[1], s.uf, s.municipio, s.zona, s.secao, dif);
  const fim2 = s.emissao && dif2 !== undefined ? msIso(s.emissao) - dif2 * 3600e3 : null;
  const fim1 = e1 && dif1 !== undefined ? msIso(e1) - dif1 * 3600e3 : null;
  linhas.push([s.uf, s.municipio, s.zona, s.secao, s.tipo_urna ?? '', fmt(fim2), fmt(d2?.receb), fmt(d2?.tot),
    fmt(a?.primeiro), fmt(a?.ultimo), a?.n ?? '', a?.st ?? '', d2?.aptos ?? '', d2?.comp ?? '', v2?.v13 ?? '', v2?.v22 ?? '',
    d2?.local ?? '', d2?.origem ?? '', fmt(fim1), fmt(d1?.receb), fmt(d1?.tot), d1?.comp ?? '', v1?.v13 ?? '', v1?.v22 ?? ''].join(','));
}
for (const k of det[2].keys()) if (!vistas.has(k)) cont.detalheSemBanco++;

await mkdir(SAIDA, { recursive: true });
const cab = 'uf,municipio,zona,secao,tipo_urna,fim_br,receb_br,tot_br,aux_primeiro,aux_ultimo,aux_n_hashes,aux_st,aptos,comparecimento,v13,v22,local,origem,'
  + 'fim1_br,receb1_br,tot1_br,comparecimento1,v13_1,v22_1';
await writeFile(path.join(SAIDA, 'secoes.csv'), `${cab}\n${linhas.join('\n')}\n`);
const resumo = { banco: fonte, detalhe: contDet, juncao: cont, fusoMunicipios: fuso.size };
await writeFile(path.join(SAIDA, 'dados-resumo.json'), JSON.stringify(resumo, null, 1));
console.log(JSON.stringify(resumo, null, 1));
