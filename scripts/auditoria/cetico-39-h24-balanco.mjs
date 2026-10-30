// Cético, parecer 39 (H24): balanço do trânsito com leitura própria dos dados abertos, sem h24-atributos.jsonl.
// Lê o eleitorado_local_votacao_2026.zip duas vezes: os 28 CSV por UF e, separado, o CSV _BRASIL (outro arquivo do
// mesmo zip), e confere se os dois dão as mesmas somas. Não mapeia seções agregadas: soma TODAS as linhas do turno.
//   saídas   = Σ eleitorado da seção (todas as linhas) − Σ eleitorado das linhas principais sem BU − Σ aptos da seção (BU);
//   entradas = Σ aptos em trânsito (BU, eleição federal).
// Também conta chaves repetidas no CSV e as linhas sem BU por tipo e UF.
// Uso: node scripts/auditoria/cetico-39-h24-balanco.mjs → data/parsed/auditoria/cetico-revisor/39-h24-balanco.json
import { createReadStream } from 'node:fs';
import { mkdir, open, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { createInflateRaw } from 'node:zlib';
import { DIR_DADOS } from '../../src/config.js';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { listarEntradas } from '../../src/zip.js';

const ZIP = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'eleitorado_locais_votacao', 'eleitorado_local_votacao_2026.zip');
const OUT = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor');
const FED = { 1: 6257, 2: 6258 };

const h = await open(ZIP, 'r');
const entradas = (await listarEntradas(h)).filter((e) => e.nome.toLowerCase().endsWith('.csv'));
const inicios = new Map();
for (const e of entradas) {
  const cab = Buffer.alloc(30);
  await h.read(cab, 0, 30, e.offsetLocal);
  inicios.set(e.nome, e.offsetLocal + 30 + cab.readUInt16LE(26) + cab.readUInt16LE(28));
}
await h.close();
// Campo entre aspas pode ter ';' (endereço): divide fora das aspas; conta as linhas em que isso acontece.
let comPontoEVirgulaEntreAspas = 0;
const campos = (l) => {
  const re = /("([^"]|"")*"|[^;]*)(;|$)/g; const out = []; let m; let extra = false;
  while ((m = re.exec(l)) && m[0] !== '') { const v = m[1]; if (v.startsWith('"') && v.includes(';')) extra = true; out.push(v.replace(/^"|"$/g, '')); if (m[3] === '') break; }
  if (extra) comPontoEVirgulaEntreAspas++;
  return out;
};

const { db, fonte } = await abrirLeitura();
const bu = new Map();
for (const r of db.prepare("SELECT s.turno, s.uf, s.municipio, s.zona, s.secao, e.aptos, e.aptos_secao, e.aptos_tte FROM secao s JOIN secao_eleicao e ON e.turno = s.turno AND e.uf = s.uf AND e.municipio = s.municipio AND e.zona = s.zona AND e.secao = s.secao AND e.eleicao = CASE s.turno WHEN 1 THEN 6257 ELSE 6258 END WHERE s.situacao = 'completa'").iterate()) {
  bu.set(`${r.turno}|${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, r);
}
db.close();

const R = { fonte, arquivos: entradas.length };
const somas = { uf: { 1: null, 2: null }, brasil: { 1: null, 2: null } };
for (const fonteCsv of ['uf', 'brasil']) {
  const vistos = new Map();
  const o = { 1: { linhas: 0, repetidas: 0, eleitoradoSecao: 0, eleitoradoFederal: 0, semBuPrincipal: 0, eleitoradoSemBuPrincipal: 0, federalSemBuPrincipal: 0, semBuAgregada: 0, semBuPorUf: {} },
    2: { linhas: 0, repetidas: 0, eleitoradoSecao: 0, eleitoradoFederal: 0, semBuPrincipal: 0, eleitoradoSemBuPrincipal: 0, federalSemBuPrincipal: 0, semBuAgregada: 0, semBuPorUf: {} } };
  for (const e of entradas) {
    const ehBrasil = /_brasil\.csv$/i.test(e.nome);
    if ((fonteCsv === 'brasil') !== ehBrasil) continue;
    let fluxo = createReadStream(ZIP, { start: inicios.get(e.nome), end: inicios.get(e.nome) + e.tamanhoComprimido - 1 });
    if (e.metodo === 8) fluxo = fluxo.pipe(createInflateRaw());
    let col = null;
    for await (const l of createInterface({ input: fluxo.setEncoding('latin1'), crlfDelay: Infinity })) {
      if (!l) continue;
      const c = campos(l);
      if (!col) { col = Object.fromEntries(c.map((x, i) => [x, i])); continue; }
      const t = Number(c[col.NR_TURNO]);
      const k = `${c[col.SG_UF].toLowerCase()}/${c[col.CD_MUNICIPIO].padStart(5, '0')}/${c[col.NR_ZONA].padStart(4, '0')}/${c[col.NR_SECAO].padStart(4, '0')}`;
      const x = o[t];
      x.linhas++;
      if (vistos.has(`${t}|${k}`)) x.repetidas++; else vistos.set(`${t}|${k}`, 1);
      const qs = Number(c[col.QT_ELEITOR_SECAO]); const qf = Number(c[col.QT_ELEITOR_ELEICAO_FEDERAL]);
      x.eleitoradoSecao += qs; x.eleitoradoFederal += qf;
      if (!bu.has(`${t}|${k}`)) {
        if (c[col.DS_TIPO_SECAO_AGREGADA] === 'Principal') {
          x.semBuPrincipal++; x.eleitoradoSemBuPrincipal += qs; x.federalSemBuPrincipal += qf;
          x.semBuPorUf[k.slice(0, 2)] = (x.semBuPorUf[k.slice(0, 2)] ?? 0) + 1;
        } else x.semBuAgregada++;
      }
    }
  }
  R[fonteCsv] = o;
}
for (const t of [1, 2]) {
  let aptos = 0; let aptosSecao = 0; let tte = 0; let n = 0;
  for (const [id, r] of bu) if (id.startsWith(`${t}|`)) { n++; aptos += r.aptos; aptosSecao += r.aptos_secao; tte += r.aptos_tte; }
  const u = R.uf[t];
  R[`balanco${t}t`] = { secoesBu: n, aptos, aptosSecao, tte,
    saidasTodasAsLinhas: u.eleitoradoSecao - aptosSecao, saidasSoSecoesComBu: u.eleitoradoSecao - u.eleitoradoSemBuPrincipal - aptosSecao,
    faltamSaidas: tte - (u.eleitoradoSecao - u.eleitoradoSemBuPrincipal - aptosSecao),
    saidasDasPrincipaisSemBu: u.eleitoradoSemBuPrincipal - u.federalSemBuPrincipal,
    federalCsvMenosAptosBu: u.eleitoradoFederal - u.federalSemBuPrincipal - aptos,
    ufIgualBrasil: u.eleitoradoSecao === R.brasil[t].eleitoradoSecao && u.eleitoradoFederal === R.brasil[t].eleitoradoFederal && u.linhas === R.brasil[t].linhas };
}
R.linhasComPontoEVirgulaEntreAspas = comPontoEVirgulaEntreAspas;
await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, '39-h24-balanco.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
