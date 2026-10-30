// Cético, parecer 39 (H23): passada própria no bruto, universo completo, um turno por processo.
// Para cada seção com BU completo (cópia de leitura), abre o log.jez da pasta de hash do BU (sem varrer data/raw: o
// caminho sai do banco), lê todos os logd.dat aninhados e grava uma linha por logd.dat com a carga SCUE que ele traz.
// Independente das varreduras do engenheiro e da integridade e da releitura do matemático: parser próprio, mínimo.
// Confere no ato a invariante "código de carga do BU numa carga gravada num diário DO MESMO PACOTE, da MESMA urna".
// Uso: node scripts/auditoria/cetico-39-cargas.mjs --turno 1|2
//   → data/parsed/auditoria/cetico-revisor/39-cargas-<t>t.jsonl (uma linha por pacote) e 39-cargas-<t>t-resumo.json
import { createWriteStream } from 'node:fs';
import { mkdir, open, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS, caminhos, dirSecao } from '../../src/config.js';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { values } = parseArgs({ options: { turno: { type: 'string' } } });
const turno = Number(values.turno);
const DIA = { 1: '04/10/2026', 2: '25/10/2026' }[turno];
const OUT = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor');
await mkdir(OUT, { recursive: true });

const mem = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
async function diarios(h, prof = 0, nome = 'logd.dat') {
  const out = [];
  for (const e of await listarEntradas(h)) {
    const d = await lerEntrada(h, e);
    if (e.nome.endsWith('.dat')) out.push({ prof, nome, texto: d.toString('latin1') });
    else if (e.nome.endsWith('.jez') && prof < 4) out.push(...(await diarios(mem(d), prof + 1, e.nome)));
  }
  return out;
}

function resumir(texto) {
  const r = { cargas: [], erros: 0, votos: 0, votosDia: 0 };
  let c = null;
  for (const bruta of texto.split('\n')) {
    const f = bruta.replace(/\r$/, '').split('\t');
    if (f.length < 5) continue;
    const [dh, nivel, urna, app, msg] = f;
    if (nivel === 'ERRO') r.erros++;
    if (msg === 'O voto do eleitor foi computado') { r.votos++; if (dh.startsWith(DIA)) r.votosDia++; }
    if (app !== 'SCUE') continue;
    if (msg.startsWith('Iniciando aplicação')) { c = { ini: dh, urna, dig: null, rel: null, mun: null, zona: null, sec: null, fc: null, fcGer: null, cod: null, ok: null }; r.cargas.push(c); continue; }
    if (!c) continue;
    let m;
    if ((m = /^Data e hora que foi digitada pelo operador: (.+)$/.exec(msg))) { c.dig = m[1].trim(); c.rel = dh; }
    else if ((m = /^Município: (\d+)/.exec(msg))) c.mun = m[1];
    else if ((m = /^Zona Eleitoral: (\d+)/.exec(msg))) c.zona = m[1];
    else if ((m = /^Seção Eleitoral: (\d+)/.exec(msg))) c.sec ??= m[1];
    else if ((m = /^Identificador da mídia de carga: (\S+)/.exec(msg))) c.fc = m[1];
    else if ((m = /^Data e hora da geração da mídia de carga: (.+)$/.exec(msg))) c.fcGer = m[1].trim();
    else if ((m = /^Código de carga ([\d.]+) gravado/.exec(msg))) { c.cod = m[1].replace(/\./g, ''); c.urnaCod = urna; }
    else if (msg.startsWith('Urna carregada com sucesso')) c.ok = dh;
  }
  return r;
}

const { db, fonte } = await abrirLeitura();
const linhas = db.prepare("SELECT uf, municipio, zona, secao, hash, numero_interno_urna u, codigo_carga cod, data_hora_carga carga, tipo_urna tipo FROM secao WHERE turno = ? AND situacao = 'completa'").all(turno);
db.close();
const dirUrnas = caminhos(turno).urnas;
const out = createWriteStream(path.join(OUT, `39-cargas-${turno}t.jsonl`));
const res = { fonte, turno, pacotes: linhas.length, lidos: 0, falhas: [], diarios: 0, diariosSemCarga: 0, diariosComMaisDeUmaCarga: 0,
  buSemCodigo: 0, buCodigoNoPacoteMesmaUrna: 0, buCodigoNoPacoteOutraUrna: 0, buCodigoAusenteDoPacote: 0, ausentes: [] };
const t0 = Date.now();
for (const [i, s] of linhas.entries()) {
  const k = `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`;
  const urnaBu = s.u === null ? null : String(s.u).padStart(8, '0');
  let ds;
  try {
    const dir = path.join(dirSecao(dirUrnas, s), s.hash);
    const h = await open(path.join(dir, acharArquivo(await readdir(dir), 'log')), 'r');
    try { ds = await diarios(h); } finally { await h.close(); }
  } catch (e) { res.falhas.push({ k, erro: e.message }); continue; }
  res.lidos++;
  const logs = ds.map((d) => ({ prof: d.prof, nome: d.nome, ...resumir(d.texto) }));
  for (const l of logs) { res.diarios++; if (!l.cargas.length) res.diariosSemCarga++; if (l.cargas.length > 1) res.diariosComMaisDeUmaCarga++; }
  if (!s.cod || !urnaBu) res.buSemCodigo++;
  else {
    const todas = logs.flatMap((l) => l.cargas);
    if (todas.some((c) => c.cod === s.cod && c.urnaCod === urnaBu)) res.buCodigoNoPacoteMesmaUrna++;
    else if (todas.some((c) => c.cod === s.cod)) res.buCodigoNoPacoteOutraUrna++;
    else { res.buCodigoAusenteDoPacote++; if (res.ausentes.length < 100) res.ausentes.push({ k, tipo: s.tipo, carga: s.carga }); }
  }
  out.write(`${JSON.stringify({ k, hash: s.hash, urnaBu, codBu: s.cod, cargaBu: s.carga, tipo: s.tipo, logs })}\n`);
  if (i % 20000 === 0) console.log(`${turno}t ${i}/${linhas.length} ${((Date.now() - t0) / 60000).toFixed(1)} min`);
}
await new Promise((r) => out.end(r));
res.minutos = +((Date.now() - t0) / 60000).toFixed(1);
await writeFile(path.join(OUT, `39-cargas-${turno}t-resumo.json`), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, (c, v) => (c === 'ausentes' || c === 'falhas' ? v.length : v), 1));
