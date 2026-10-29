// Revisor cético, achado "votos sem rastro no log" (matemático forense, doc 02), lente de reprodução.
// Contagem INDEPENDENTE do script do autor (matematico-brutos.mjs): não usa cicloLog nem linhasPorUrna dele.
//
// Para cada pacote de urna (diretório de hash que o banco registra para a seção), lê o log.jez com todos os logd.dat
// aninhados (.jez dentro de .jez, cópias MI/ME), tira linhas idênticas por urna, e atribui cada
// "O voto do eleitor foi computado" do dia da votação à seção que AQUELA urna declarou por último
// ("Seção Eleitoral: NNNN", em qualquer data, na ordem do arquivo). Compara com o comparecimento do BU no banco.
// Também conta os ciclos sem "computado" que já tinham "Voto confirmado" (por cargo) antes do fechamento.
//
// Uso: node scripts/auditoria/cetico-vsr-reproducao.mjs --turno 1 [--uf ba] [--secao ba/39934/0183/0175] [--conc 6]
// Saída: data/parsed/auditoria/cetico/cetico-vsr-reproducao-<t>t.json (totais + pacotes que divergem)
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, promisify } from 'node:util';
import { crc32, inflateRaw } from 'node:zlib';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, uf: { type: 'string' }, secao: { type: 'string', multiple: true }, conc: { type: 'string', default: '6' }, saida: { type: 'string' } } });
const turno = Number(values.turno);
const DIA = { 1: '04/10/2026', 2: '25/10/2026' }[turno];
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');

const { db, ponteiro } = await abrirLeitura({ aoAvisar: () => {} });
if (!ponteiro) throw new Error('sem cópia de leitura publicada: não abro o primário');
let sql = 'select uf,municipio,zona,secao,hash,tipo_urna,tipo_arquivo,comparecimento from secao where turno=?';
const args = [turno];
if (values.uf) { sql += ' and uf=?'; args.push(values.uf); }
let secoes = db.prepare(sql).all(...args);
if (values.secao) {
  const alvo = new Set(values.secao);
  secoes = secoes.filter((s) => alvo.has(`${s.uf}/${s.municipio}/${s.zona}/${s.secao}`));
}

const mem = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
const inflar = promisify(inflateRaw);
// ZIP mínimo em memória com descompressão assíncrona (pool de threads do libuv); ZIP64 ou formato fora disso cai
// no leitor do repositório (src/zip.js), que confere CRC.
async function entradasRapidas(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) return null;
  const n = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  if (n === 0xffff || p === 0xffffffff) return null;
  const lista = [];
  for (let k = 0; k < n; k++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) return null;
    const metodo = buf.readUInt16LE(p + 10);
    const crc = buf.readUInt32LE(p + 16);
    const comp = buf.readUInt32LE(p + 20);
    const tam = buf.readUInt32LE(p + 24);
    const ln = buf.readUInt16LE(p + 28);
    const le = buf.readUInt16LE(p + 30);
    const lc = buf.readUInt16LE(p + 32);
    const off = buf.readUInt32LE(p + 42);
    if (comp === 0xffffffff || tam === 0xffffffff || off === 0xffffffff) return null;
    const nome = buf.toString('latin1', p + 46, p + 46 + ln);
    lista.push({ nome, metodo, crc, comp, tam, off });
    p += 46 + ln + le + lc;
  }
  return lista.map((e) => ({ ...e, ler: async () => {
    if (buf.readUInt32LE(e.off) !== 0x04034b50) throw new Error(`cabeçalho local inválido: ${e.nome}`);
    const ini = e.off + 30 + buf.readUInt16LE(e.off + 26) + buf.readUInt16LE(e.off + 28);
    const bruto = buf.subarray(ini, ini + e.comp);
    const dados = e.metodo === 0 ? bruto : e.metodo === 8 ? await inflar(bruto) : null;
    if (!dados) throw new Error(`método ${e.metodo}: ${e.nome}`);
    if (dados.length !== e.tam || crc32(dados) !== e.crc) throw new Error(`tamanho/CRC divergente em ${e.nome}`);
    return dados;
  } }));
}
async function logds(buf, nome, out, prof = 0) {
  let ents = await entradasRapidas(buf);
  if (!ents) {
    const h = mem(buf);
    ents = (await listarEntradas(h)).map((e) => ({ nome: e.nome, ler: () => lerEntrada(h, e) }));
  }
  for (const e of ents) {
    if (e.nome === 'logd.dat') out.push({ nome: `${nome}/logd.dat`, texto: (await e.ler()).toString('latin1') });
    else if (e.nome.endsWith('.jez') && prof < 4) await logds(await e.ler(), `${nome}/${e.nome}`, out, prof + 1);
  }
  return out;
}

function analisarLogs(textos, secaoPacote) {
  // por urna, linhas únicas na ordem: primeiro a cópia mais longa, depois linhas extras das outras
  // Só as mensagens que o ciclo usa (o resto do log não muda a contagem); a deduplicação vale entre cópias.
  const RELEVANTE = /^(Seção Eleitoral: |Eleitor foi habilitado$|Voto confirmado para \[|Eleitor foi suspenso e não confirmou nenhum voto$|Urna ligada em|Iniciando aplicação|Votação suspensa$|Inicio do Encerramento|O voto do eleitor foi computado$)/;
  const copias = textos.map((t) => {
    const out = [];
    for (const bruta of t.texto.split('\n')) {
      const l = bruta.endsWith('\r') ? bruta.slice(0, -1) : bruta;
      const t1 = l.indexOf('\t'); const t2 = l.indexOf('\t', t1 + 1); const t3 = l.indexOf('\t', t2 + 1); const t4 = l.indexOf('\t', t3 + 1);
      if (t4 < 0) continue;
      const t5 = l.indexOf('\t', t4 + 1);
      const msg = l.slice(t4 + 1, t5 < 0 ? undefined : t5);
      if (!RELEVANTE.test(msg)) continue;
      out.push(l);
    }
    return out;
  });
  copias.sort((a, b) => b.length - a.length);
  const urnas = new Map();
  let dup = 0;
  const dedup = copias.length > 1;
  for (const c of copias) {
    for (const l of c) {
      const t1 = l.indexOf('\t'); const t2 = l.indexOf('\t', t1 + 1);
      const u = l.slice(t2 + 1, l.indexOf('\t', t2 + 1));
      let r = urnas.get(u);
      if (!r) urnas.set(u, (r = { vistas: new Set(), linhas: [] }));
      if (dedup) {
        if (r.vistas.has(l)) { dup++; continue; }
        r.vistas.add(l);
      }
      r.linhas.push(l);
    }
  }
  const res = { linhasDuplicadas: dup, porUrna: {}, propria: 0, outra: 0, semSecao: 0, ciclosSemComputadoComConfirmacao: 0, confirmacoesDescartadas: {} };
  for (const [u, r] of urnas) {
    let sec = null;
    let ciclo = null;
    const pu = { computados: 0, secoes: {}, inicio: null, fim: null };
    const fecharSem = () => {
      if (ciclo && Object.keys(ciclo).length) {
        res.ciclosSemComputadoComConfirmacao++;
        for (const [k, n] of Object.entries(ciclo)) res.confirmacoesDescartadas[k] = (res.confirmacoesDescartadas[k] ?? 0) + n;
      }
      ciclo = null;
    };
    for (const l of r.linhas) {
      const col = l.split('\t');
      const msg = col[4] ?? '';
      const m = /^Seção Eleitoral: (\d+)$/.exec(msg);
      if (m) { sec = m[1]; continue; }
      if (!l.startsWith(DIA)) continue;
      pu.inicio ??= col[0];
      pu.fim = col[0];
      if (msg === 'Eleitor foi habilitado') { fecharSem(); ciclo = {}; }
      else if (msg.startsWith('Voto confirmado para [')) { if (ciclo) ciclo[msg.slice(22, -1)] = (ciclo[msg.slice(22, -1)] ?? 0) + 1; }
      else if (msg === 'Eleitor foi suspenso e não confirmou nenhum voto') ciclo = null;
      else if (msg.startsWith('Urna ligada em') || msg.startsWith('Iniciando aplicação') || msg === 'Votação suspensa' || msg.startsWith('Inicio do Encerramento')) fecharSem();
      else if (msg === 'O voto do eleitor foi computado') {
        ciclo = null;
        pu.computados++;
        pu.secoes[sec ?? '?'] = (pu.secoes[sec ?? '?'] ?? 0) + 1;
        if (sec === null) res.semSecao++;
        else if (Number(sec) === Number(secaoPacote)) res.propria++;
        else res.outra++;
      }
    }
    fecharSem();
    res.porUrna[u] = pu;
  }
  return res;
}

const tot = { turno, secoesNoBanco: secoes.length, semHash: 0, semDiretorio: 0, semLog: 0, erros: 0, pacotes: 0, pacotesUrna: 0, pacotesSA: 0,
  comparecimentoUrna: 0, computadosBrutos: 0, computadosPropria: 0, computadosOutraSecao: 0, computadosSemSecao: 0, linhasDuplicadas: 0,
  pacotesComCopias: 0, pacotesComOutraSecao: 0, ciclosSemComputadoComConfirmacao: 0, pacotesComCicloDescartado: 0, confirmacoesDescartadas: {},
  dirsHashExtras: 0 };
const divergentes = [];
const excluidos = [];
let feitos = 0;
const inicio = Date.now();

async function processar(s) {
  const chave = `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`;
  if (!s.hash) { tot.semHash++; excluidos.push({ chave, motivo: 'sem hash no banco (sem pacote)', tipo_arquivo: s.tipo_arquivo }); return; }
  const dirSec = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', s.uf, s.municipio, s.zona, s.secao);
  let nomes;
  try {
    const dirs = await readdir(dirSec);
    if (dirs.filter((d) => d !== 'aux.json').length > 1) tot.dirsHashExtras++;
    nomes = await readdir(path.join(dirSec, s.hash));
  } catch {
    tot.semDiretorio++; excluidos.push({ chave, motivo: 'diretório do hash ausente' }); return;
  }
  tot.pacotes++;
  const sa = (s.tipo_arquivo ?? '').startsWith('sa');
  if (sa) { tot.pacotesSA++; return; }
  tot.pacotesUrna++;
  tot.comparecimentoUrna += s.comparecimento ?? 0;
  const nomeLog = nomes.find((n) => n.endsWith('-log.jez') || n.endsWith('.logjez'));
  if (!nomeLog) { tot.semLog++; excluidos.push({ chave, motivo: 'pacote de urna sem log.jez', comparecimento: s.comparecimento }); return; }
  let r;
  try {
    r = analisarLogs(await logds(await readFile(path.join(dirSec, s.hash, nomeLog)), nomeLog, []), s.secao);
  } catch (e) {
    tot.erros++; excluidos.push({ chave, motivo: `erro de leitura: ${e.message}` }); return;
  }
  const brutos = Object.values(r.porUrna).reduce((a, u) => a + u.computados, 0);
  tot.computadosBrutos += brutos;
  tot.computadosPropria += r.propria;
  tot.computadosOutraSecao += r.outra;
  tot.computadosSemSecao += r.semSecao;
  tot.linhasDuplicadas += r.linhasDuplicadas;
  if (r.linhasDuplicadas) tot.pacotesComCopias++;
  if (r.outra) tot.pacotesComOutraSecao++;
  tot.ciclosSemComputadoComConfirmacao += r.ciclosSemComputadoComConfirmacao;
  if (r.ciclosSemComputadoComConfirmacao) tot.pacotesComCicloDescartado++;
  for (const [k, n] of Object.entries(r.confirmacoesDescartadas)) tot.confirmacoesDescartadas[k] = (tot.confirmacoesDescartadas[k] ?? 0) + n;
  if (r.propria !== s.comparecimento || r.outra || r.semSecao || brutos !== s.comparecimento || values.secao) {
    divergentes.push({ chave, tipo_urna: s.tipo_urna, comparecimento: s.comparecimento, brutos, propria: r.propria, outraSecao: r.outra, semSecao: r.semSecao,
      faltamNoLog: s.comparecimento - r.propria, linhasDuplicadas: r.linhasDuplicadas, ciclosDescartados: r.ciclosSemComputadoComConfirmacao, porUrna: r.porUrna });
  }
}

const fila = [...secoes];
await Promise.all(Array.from({ length: Number(values.conc) }, async () => {
  for (let s = fila.shift(); s; s = fila.shift()) {
    await processar(s);
    if (++feitos % 20000 === 0) console.error(`${turno}t ${feitos}/${secoes.length} (${((Date.now() - inicio) / 1000).toFixed(0)} s)`);
  }
}));
divergentes.sort((a, b) => a.chave.localeCompare(b.chave));
tot.segundos = Math.round((Date.now() - inicio) / 1000);
tot.secoesDivergentes = divergentes.length;
tot.semRastro = divergentes.filter((d) => d.faltamNoLog > 0).reduce((a, d) => a + d.faltamNoLog, 0);
await mkdir(SAIDA, { recursive: true });
const arq = values.saida ?? path.join(SAIDA, `cetico-vsr-reproducao-${turno}t${values.uf ? `-${values.uf}` : ''}${values.secao ? '-secoes' : ''}.json`);
await writeFile(arq, `${JSON.stringify({ totais: tot, excluidos, divergentes }, null, 1)}\n`);
console.log(JSON.stringify(tot));
for (const d of divergentes) console.log(d.chave, d.tipo_urna, 'BU', d.comparecimento, 'log bruto', d.brutos, 'própria', d.propria, 'outra', d.outraSecao, 'faltam', d.faltamNoLog, 'descartados', d.ciclosDescartados, JSON.stringify(Object.fromEntries(Object.entries(d.porUrna).map(([u, p]) => [u, `${p.computados} ${JSON.stringify(p.secoes)} ${p.inicio}-${p.fim}`]))));
console.log(`gravado ${arq}`);
