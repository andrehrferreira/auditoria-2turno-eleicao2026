// Cético revisor, parecer 47 (H20). Hora de recebimento do BU no TSE (dados abertos, detalhe_votacao_secao_2026_<UF>.csv;
// o arquivo da UF traz os cargos estaduais, e a hora de recebimento é a do BU, igual em todos os cargos: fica a 1ª linha) para seções escolhidas, com a emissão do BU (banco, relógio da urna) e a folga em minutos para
// duas leituras do relógio: hora local do município (dif do município) e hora de Brasília (dif 0).
// Uso: node scripts/auditoria/cetico-47-receb-uf.mjs --uf am --secoes 02550/0068/0657,02550/0068/0789 [--local 02550/0068/1651]
//      --local: também todas as seções do mesmo local de votação (uf/município/zona/local), para comparação.
import { open, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';
import { chaveSecao } from './relogio-fora-do-fuso.mjs';

const { values } = parseArgs({ options: { uf: { type: 'string' }, secoes: { type: 'string', default: '' }, local: { type: 'string' } } });
const UF = values.uf.toLowerCase();
const { db } = await abrirLeitura();
const alvo = new Set(values.secoes ? values.secoes.split(',').map((s) => chaveSecao(UF, ...s.split('/'))) : []);
if (values.local) {
  const [m, z, l] = values.local.split('/');
  for (const r of db.prepare('SELECT DISTINCT municipio, zona, secao FROM secao WHERE uf = ? AND municipio = ? AND zona = ? AND local = ?').iterate(UF, m, z, Number(l))) alvo.add(chaveSecao(UF, r.municipio, r.zona, r.secao));
}
const fuso = new Map();
for (const l of (await readFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'tempo', '2t', 'fuso-municipio.csv'), 'utf8')).split(/\r?\n/).slice(1)) {
  const c = l.split(',');
  if (c[6] !== undefined && c[6] !== '') fuso.set(`${c[0]}/${Number(c[1])}`, Number(c[6]));
}
const dir = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'detalhe_votacao_secao');
const h = await open(path.join(dir, (await readdir(dir)).find((n) => /2026\.zip$/.test(n))));
const ent = (await listarEntradas(h)).find((e) => e.nome.toLowerCase() === `detalhe_votacao_secao_2026_${UF}.csv`);
const buf = await lerEntrada(h, ent);
await h.close();
const linhas = buf.toString('latin1').split(/\r?\n/);
const col = linhas[0].split(';').map((c) => c.replace(/"/g, ''));
const i = Object.fromEntries(col.map((c, k) => [c, k]));
const out = [];
const vistos = new Set();
for (const l of linhas.slice(1)) {
  if (!l) continue;
  const c = l.split(';').map((x) => x.replace(/"/g, ''));
  const k = chaveSecao(UF, c[i.CD_MUNICIPIO], c[i.NR_ZONA], c[i.NR_SECAO]);
  if (!alvo.has(k)) continue;
  const turno = Number(c[i.NR_TURNO]);
  if (vistos.has(`${turno}|${k}`)) continue;
  vistos.add(`${turno}|${k}`);
  const s = db.prepare('SELECT local, abertura, encerramento, emissao FROM secao WHERE turno = ? AND uf = ? AND CAST(municipio AS INT) = ? AND CAST(zona AS INT) = ? AND CAST(secao AS INT) = ?')
    .get(turno, UF, Number(c[i.CD_MUNICIPIO]), Number(c[i.NR_ZONA]), Number(c[i.NR_SECAO]));
  const m = /(\d\d)\/(\d\d)\/(\d{4}) (\d\d):(\d\d):(\d\d)/.exec(c[i.DT_RECEBIMENTO_BU_HOR_TSE]);
  const rec = m ? Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6]) / 1000 : null;
  const em = s?.emissao ? Date.parse(`${s.emissao.replace(' ', 'T')}Z`) / 1000 : null;
  const dif = fuso.get(`${UF}/${Number(c[i.CD_MUNICIPIO])}`) ?? 0;
  out.push({ turno, secao: `${c[i.CD_MUNICIPIO]}/${c[i.NR_ZONA]}/${c[i.NR_SECAO]}`, local: s?.local, abertura: s?.abertura?.slice(11), encerramento: s?.encerramento?.slice(11), emissao: s?.emissao?.slice(11),
    recebimentoBrasilia: c[i.DT_RECEBIMENTO_BU_HOR_TSE], difMunicipio: dif,
    folgaSeRelogioLocal: rec && em ? Math.round((rec - (em - dif * 3600)) / 60) : null, folgaSeRelogioBrasilia: rec && em ? Math.round((rec - em) / 60) : null });
}
db.close();
out.sort((a, b) => a.turno - b.turno || a.secao.localeCompare(b.secao));
for (const o of out) console.log(JSON.stringify(o));
