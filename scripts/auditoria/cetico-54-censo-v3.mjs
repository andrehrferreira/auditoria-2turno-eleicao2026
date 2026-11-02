// Cético revisor, parecer 54 (H13, fechamento): censo próprio das marcas da liberação manual (V3) nos diários de MG 2026,
// nos dois turnos, para conferir se a V3m de 2026 ("Mesário # habilitou o eleitor") e a de 2022 ("Biometria do mesário #
// encontrada nos arquivos coletados" OU "… em eleitores") contam a mesma coisa.
//
// Leitura própria (não usa o leitor do estatístico nem a lib do fechamento): src/zip.js para o .jez e os .jez aninhados;
// linhas do dia, só da seção declarada por último; por urna, união das linhas distintas das cópias (textos em ordem da
// primeira hora do dia, empate pelo mais longo); ciclo do eleitor zerado em "Identificador do eleitor digitado pelo
// mesário" e em "Aguardando digitação do identificador do eleitor"; o voto ("O voto do eleitor foi computado") é
// classificado pelas marcas do ciclo.
//
// Marcas de cada ciclo: bio (habilitação biométrica), ano (ano de nascimento igual ao cadastro), dado (dado digitado
// confere), sol (solicitação de dado pessoal — a marca de V3 de 2022), arq (biometria do mesário encontrada nos arquivos
// coletados), ele (… encontrada em eleitores), hab (mesário habilitou o eleitor), bate (digital coletada bate com digital
// gravada após o registro: sem mesário), novo (vai salvar a digital em novo arquivo), npb (o eleitor não possui biometria).
//
// Por seção: votos e vias pela regra de 2026 (v1, v2, v3m = dado ∧ hab, v3s, outra) e pela regra de 2022 traduzida
// (v3_22 = sol sem bio/ano; v3m_22 = v3_22 ∧ (arq ∨ ele)). Por turno: histograma das combinações de marcas dos votos sem
// biometria. Nenhum número de título ou de mesário é gravado.
//
// Uso: node scripts/auditoria/cetico-54-censo-v3.mjs --turno 2 [--workers 3] [--secoes mg/40002/0025/0027,...]
// Saída: data/parsed/auditoria/cetico/54/censo-v3-<t>t.jsonl e censo-v3-<t>t.resumo.json
import { createHash } from 'node:crypto';
import { open, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { DIR_DADOS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const DIAS = { 1: '04/10/2026', 2: '25/10/2026' };
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', '54');
const sub = async (d) => (await readdir(d, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
const mem = (buf) => ({ read: async (d, o, n, p) => ({ bytesRead: buf.copy(d, o, p, p + n) }), stat: async () => ({ size: buf.length }) });

async function textosDe(handle, prof = 0) {
  const out = [];
  for (const e of await listarEntradas(handle)) {
    if (e.nome === 'logd.dat') out.push((await lerEntrada(handle, e)).toString('latin1'));
    else if (e.nome.endsWith('.jez') && prof < 4) out.push(...(await textosDe(mem(await lerEntrada(handle, e)), prof + 1)));
  }
  return out;
}

const RE_SEC = /\tSeção Eleitoral: (\d+)\t/;
function porUrna(texto, dia, secao) {
  const m = new Map();
  let decl = null;
  for (let l of texto.split('\n')) {
    if (l.length < 20) continue;
    if (l.includes('Seção Eleitoral: ')) { const x = RE_SEC.exec(l); if (x) decl = x[1].padStart(4, '0'); }
    if (!l.startsWith(dia)) continue;
    if (decl !== null && decl !== secao) continue;
    if (l.endsWith('\r')) l = l.slice(0, -1);
    const c = l.split('\t');
    const u = c[2];
    if (!m.has(u)) m.set(u, []);
    m.get(u).push(l);
  }
  return m;
}
function uniao(lista) {
  if (lista.length === 1) return lista[0];
  const ord = [...lista].sort((a, b) => (a[0]?.slice(11, 19) ?? '').localeCompare(b[0]?.slice(11, 19) ?? '') || b.length - a.length);
  const vistas = new Set(); const out = [];
  for (const t of ord) for (const l of t) if (!vistas.has(l)) { vistas.add(l); out.push(l); }
  return out;
}

const M = {
  bio: (m) => m.startsWith('Tipo de habilitação do eleitor [biométrica]'),
  ano: (m) => m.startsWith('Ano de nascimento digitado é igual ao do cadastro'),
  dado: (m) => m === 'Dado digitado confere',
  sol: (m) => m === 'Solicitação de dado pessoal do eleitor para habilitação manual',
  arq: (m) => /^Biometria do mesário \d+ encontrada nos arquivos coletados/.test(m),
  ele: (m) => /^Biometria do mesário \d+ encontrada em eleitores/.test(m),
  hab: (m) => /^Mesário \d+ habilitou o eleitor/.test(m),
  bate: (m) => m.startsWith('Digital coletada bate com uma digital gravada'),
  novo: (m) => m.includes('vai salvar a digital em novo arquivo'),
  npb: (m) => m === 'O eleitor não possui biometria',
};
const CHAVES = Object.keys(M);

function processar(linhas, sec, hist) {
  const vistas = new Set();
  let k = {};
  for (const l of linhas) {
    if (vistas.has(l)) continue; vistas.add(l);
    const m = l.split('\t')[4] ?? '';
    if (m === 'Identificador do eleitor digitado pelo mesário' || m === 'Aguardando digitação do identificador do eleitor') { k = {}; continue; }
    if (m === 'O voto do eleitor foi computado') {
      sec.votos++;
      if (k.bio) sec.v1++;
      else if (k.ano) sec.v2++;
      else if (k.dado) { if (k.hab) sec.v3m++; else sec.v3s++; } else sec.outra++;
      if (!k.bio && !k.ano && k.sol) { sec.v3_22++; if (k.arq || k.ele) sec.v3m_22++; }
      if (!k.bio && !k.ano && k.dado) { if (k.arq) sec.dArq++; if (k.ele) sec.dEle++; if (k.hab && !k.arq && !k.ele) sec.habSemEnc++; if (!k.hab && (k.arq || k.ele)) sec.encSemHab++; }
      if (!k.bio) { const ch = CHAVES.filter((c) => k[c]).join('+') || '(nenhuma)'; hist[ch] = (hist[ch] ?? 0) + 1; }
      k = {};
      continue;
    }
    for (const c of CHAVES) if (!k[c] && M[c](m)) k[c] = true;
  }
}

async function secao(base, id, turno, hist) {
  const [, municipio, zona, sec] = id.split('/');
  const o = { id, votos: 0, v1: 0, v2: 0, v3m: 0, v3s: 0, outra: 0, v3_22: 0, v3m_22: 0, dArq: 0, dEle: 0, habSemEnc: 0, encSemHab: 0, logs: 0 };
  const dir = path.join(base, municipio, zona, sec);
  const hashes = new Set();
  const copias = new Map();
  for (const p of await sub(dir)) {
    const nomes = await readdir(path.join(dir, p));
    const log = nomes.find((n) => n.endsWith('-log.jez') || n.endsWith('.logjez') || n.endsWith('-log.jez.bak'));
    if (!log) continue;
    const bytes = await readFile(path.join(dir, p, log));
    const h = createHash('sha256').update(bytes).digest('hex');
    if (hashes.has(h)) continue; hashes.add(h); o.logs++;
    for (const t of await textosDe(mem(bytes))) for (const [u, ls] of porUrna(t, DIAS[turno], sec)) { if (!copias.has(u)) copias.set(u, []); copias.get(u).push(ls); }
  }
  for (const lista of copias.values()) processar(uniao(lista), o, hist);
  return o;
}

if (!isMainThread) {
  const { ids, turno, base } = workerData;
  const hist = {}; const linhas = []; const erros = [];
  for (const id of ids) { try { linhas.push(await secao(base, id, turno, hist)); } catch (e) { erros.push({ id, erro: e.message }); } }
  parentPort.postMessage({ linhas, hist, erros });
} else {
  const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, workers: { type: 'string', default: '3' }, secoes: { type: 'string' } } });
  const turno = Number(values.turno);
  const base = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', 'mg');
  let ids = [];
  if (values.secoes) ids = values.secoes.split(',');
  else for (const m of await sub(base)) for (const z of await sub(path.join(base, m))) for (const s of await sub(path.join(base, m, z))) ids.push(`mg/${m}/${z}/${s}`);
  await mkdir(SAIDA, { recursive: true });
  const W = Math.max(1, Number(values.workers));
  const BLOCO = 500;
  const blocos = []; for (let i = 0; i < ids.length; i += BLOCO) blocos.push(ids.slice(i, i + BLOCO));
  const hist = {}; const todas = []; const erros = [];
  let prox = 0, feitos = 0;
  const t0 = Date.now();
  await Promise.all(Array.from({ length: W }, async () => {
    while (prox < blocos.length) {
      const b = blocos[prox++];
      const r = await new Promise((res, rej) => { const w = new Worker(new URL(import.meta.url), { workerData: { ids: b, turno, base } }); w.once('message', res); w.once('error', rej); });
      todas.push(...r.linhas); erros.push(...r.erros);
      for (const [k, v] of Object.entries(r.hist)) hist[k] = (hist[k] ?? 0) + v;
      feitos += b.length;
      if (feitos % 5000 < BLOCO) console.error(`${feitos}/${ids.length} seções, ${((Date.now() - t0) / 60000).toFixed(1)} min`);
    }
  }));
  todas.sort((a, b) => a.id.localeCompare(b.id));
  const nome = values.secoes ? `censo-v3-${turno}t-selecao` : `censo-v3-${turno}t`;
  await writeFile(path.join(SAIDA, `${nome}.jsonl`), todas.map((x) => JSON.stringify(x)).join('\n') + '\n');
  const soma = (k) => todas.reduce((s, x) => s + x[k], 0);
  const resumo = { turno, secoes: todas.length, erros, soma: Object.fromEntries(['votos', 'v1', 'v2', 'v3m', 'v3s', 'outra', 'v3_22', 'v3m_22', 'dArq', 'dEle', 'habSemEnc', 'encSemHab'].map((k) => [k, soma(k)])),
    combinacoesSemBiometria: Object.fromEntries(Object.entries(hist).sort((a, b) => b[1] - a[1])), minutos: +((Date.now() - t0) / 60000).toFixed(1) };
  await writeFile(path.join(SAIDA, `${nome}.resumo.json`), JSON.stringify(resumo, null, 1));
  console.log(JSON.stringify(resumo, null, 1));
}
