// Engenheiro de segurança, H20 item 4 (limite externo do relógio), docs/analysis/engenheiro-seguranca-urna/11.
// Para cada seção e turno: folga = DT_RECEBIMENTO_BU_HOR_TSE (dados abertos, hora de Brasília, relógio do TSE) −
// emissão do BU em hora de Brasília (campo `emissao` da tabela `secao` do banco, relógio local da urna, menos a
// diferença do fuso do município, data/parsed/auditoria/tempo/2t/fuso-municipio.csv, ou a da própria seção quando ela
// está em relogio-fora-do-fuso.csv). Folga negativa = "recebido antes de emitido", impossível com relógios certos.
// Cada seção é contada duas vezes: com a régua do município (sem a correção das 81 seções) e com a correção.
// Exterior (ZZ): sem tabela país → fuso. Para cada seção sai o menor fuso compatível com a física
// (emissão local − recebimento), que é comparado com o fuso real da cidade só na leitura dos casos.
// Universo: todas as seções do banco nos dois turnos; toda falta é contada.
// Uso: node --max-old-space-size=8192 scripts/auditoria/seguranca-h20-recebimento.mjs
// Saída: data/parsed/auditoria/engenheiro-seguranca-urna/h20/recebimento.json e recebimento-negativos.csv
import { mkdir, open, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';
import { difRelogioPorSecao, difSecao } from './relogio-fora-do-fuso.mjs';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'engenheiro-seguranca-urna', 'h20');
const chave = (uf, m, z, s) => `${uf.toLowerCase()}/${Number(m)}/${Number(z)}/${Number(s)}`;
const msBr = (t) => {
  const m = /(\d\d)\/(\d\d)\/(\d{4}) (\d\d):(\d\d):(\d\d)/.exec(t ?? '');
  return m ? Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6]) : null;
};
const msIso = (t) => (t ? Date.parse(`${t.replace(' ', 'T')}Z`) : null);
const fmt = (ms) => (ms === null || ms === undefined || Number.isNaN(ms) ? '' : new Date(ms).toISOString().slice(0, 19).replace('T', ' '));

// 1. Dados abertos: arquivo _BR.csv, linhas de Presidente (cargo 1) dos dois turnos.
const dir = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'detalhe_votacao_secao');
const nomeZip = (await readdir(dir)).find((n) => /2026\.zip$/.test(n));
const h = await open(path.join(dir, nomeZip));
const det = { 1: new Map(), 2: new Map() };
const contDet = { arquivo: nomeZip, linhas: 0, presidente: { 1: 0, 2: 0 }, duplicadas: 0, semReceb: { 1: 0, 2: 0 } };
for (const e of (await listarEntradas(h)).filter((x) => /_BR\.csv$/i.test(x.nome))) {
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
      if (receb === null) contDet.semReceb[turno]++;
      det[turno].set(k, { receb, nomeMun: c[i.NM_MUNICIPIO] });
    }
    pos = fim;
  }
}
await h.close();

// 2. Fuso por município.
const fuso = new Map();
for (const l of (await readFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'tempo', '2t', 'fuso-municipio.csv'), 'utf8')).split(/\r?\n/).slice(1)) {
  if (!l) continue;
  const c = l.split(',');
  if (c[6] !== '') fuso.set(`${c[0]}/${Number(c[1])}`, Number(c[6]));
}
const relogio = { 1: difRelogioPorSecao(1), 2: difRelogioPorSecao(2) };

// 3. Banco e conta.
const { db, fonte } = await abrirLeitura();
const res = { geradoEm: new Date().toISOString(), banco: fonte, dadosAbertos: contDet, turnos: {} };
const negativos = [];
const histMin = (v) => (v < -60 ? '<-60' : v < -5 ? '-60..-5' : v < 0 ? '-5..0' : v < 10 ? '0..10' : v < 60 ? '10..60' : v < 180 ? '60..180' : '>=180');
for (const turno of [1, 2]) {
  const r = {
    secoes: 0, semEmissao: 0, semDetalhe: 0, semReceb: 0, semFuso: 0, exterior: 0, comparadas: 0,
    regraMunicipio: { negativas: 0, hist: {} }, comCorrecao: { negativas: 0, hist: {}, minimo: null, ondeMinimo: null },
    exteriorFusoMinimo: { secoes: 0, max: null, top: [] },
  };
  const ext = [];
  for (const s of db.prepare('SELECT uf, municipio, zona, secao, tipo_urna, emissao FROM secao WHERE turno = ?').iterate(turno)) {
    r.secoes++;
    const k = chave(s.uf, s.municipio, s.zona, s.secao);
    const d = det[turno].get(k);
    if (!s.emissao) { r.semEmissao++; continue; }
    if (!d) { r.semDetalhe++; continue; }
    if (d.receb === null) { r.semReceb++; continue; }
    const emLocal = msIso(s.emissao);
    if (s.uf === 'zz') {
      r.exterior++;
      // receb ≥ emLocal − dif  ⇒  dif ≥ (emLocal − receb)
      const difMin = (emLocal - d.receb) / 3600e3;
      ext.push({ k, difMin, nome: d.nomeMun, emissao: s.emissao, receb: fmt(d.receb), tipo: s.tipo_urna });
      continue;
    }
    const difMun = fuso.get(`${s.uf}/${Number(s.municipio)}`);
    if (difMun === undefined) { r.semFuso++; continue; }
    r.comparadas++;
    const difSec = difSecao(relogio[turno], s.uf, s.municipio, s.zona, s.secao, difMun);
    const folgaMun = (d.receb - (emLocal - difMun * 3600e3)) / 60e3;
    const folga = (d.receb - (emLocal - difSec * 3600e3)) / 60e3;
    const hm = histMin(folgaMun), hc = histMin(folga);
    r.regraMunicipio.hist[hm] = (r.regraMunicipio.hist[hm] ?? 0) + 1;
    r.comCorrecao.hist[hc] = (r.comCorrecao.hist[hc] ?? 0) + 1;
    if (folgaMun < 0) r.regraMunicipio.negativas++;
    if (folga < 0) r.comCorrecao.negativas++;
    if (r.comCorrecao.minimo === null || folga < r.comCorrecao.minimo) { r.comCorrecao.minimo = +folga.toFixed(2); r.comCorrecao.ondeMinimo = k; }
    if (folgaMun < 0 || folga < 0) {
      negativos.push([turno, s.uf, s.municipio, s.zona, s.secao, s.tipo_urna ?? '', s.emissao, difMun, difSec, fmt(emLocal - difSec * 3600e3), fmt(d.receb), folgaMun.toFixed(2), folga.toFixed(2)].join(','));
    }
  }
  ext.sort((a, b) => b.difMin - a.difMin);
  r.exteriorFusoMinimo.secoes = ext.length;
  r.exteriorFusoMinimo.max = ext.length ? +ext[0].difMin.toFixed(2) : null;
  r.exteriorFusoMinimo.top = ext.slice(0, 25).map((x) => ({ ...x, difMin: +x.difMin.toFixed(2) }));
  // por cidade do exterior: o maior fuso mínimo (a cidade tem de estar pelo menos tantas horas à frente de Brasília)
  const porCidade = new Map();
  for (const x of ext) {
    const c = porCidade.get(x.nome) ?? { cidade: x.nome, secoes: 0, difMinMax: -Infinity };
    c.secoes++;
    c.difMinMax = Math.max(c.difMinMax, x.difMin);
    porCidade.set(x.nome, c);
  }
  r.exteriorPorCidade = [...porCidade.values()].sort((a, b) => b.difMinMax - a.difMinMax).map((c) => ({ ...c, difMinMax: +c.difMinMax.toFixed(2) }));
  res.turnos[turno] = r;
}
db.close();
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, 'recebimento.json'), JSON.stringify(res, null, 1));
await writeFile(path.join(SAIDA, 'recebimento-negativos.csv'),
  `turno,uf,municipio,zona,secao,tipo_urna,emissao_local,dif_municipio_h,dif_secao_h,emissao_brasilia,receb_tse,folga_regra_municipio_min,folga_com_correcao_min\n${negativos.join('\n')}\n`);
for (const t of [1, 2]) {
  const r = res.turnos[t];
  console.log(`turno ${t}: ${r.secoes} seções; comparadas ${r.comparadas}; sem emissão ${r.semEmissao}, sem detalhe ${r.semDetalhe}, sem receb ${r.semReceb}, sem fuso ${r.semFuso}, exterior ${r.exterior}`);
  console.log(`  recebidas antes da emissão: régua do município ${r.regraMunicipio.negativas}; com a correção ${r.comCorrecao.negativas}; mínimo ${r.comCorrecao.minimo} min (${r.comCorrecao.ondeMinimo})`);
  console.log(`  exterior: maior fuso mínimo exigido ${r.exteriorFusoMinimo.max} h; 5 primeiras cidades: ${r.exteriorPorCidade.slice(0, 5).map((c) => `${c.cidade} ${c.difMinMax}`).join('; ')}`);
}
