// Cético (H08, lente dados e definições): relê os log.jez BRUTOS (sem lerLogs/juntarLogs), texto por texto, para
// 1) medir o que a deduplicação de src/perfil-secoes.js (chave = data/hora + nº da urna + hash) descarta e se algo
//    descartado é registro real (mesma chave com linha diferente, chave repetida dentro do MESMO logd.dat);
// 2) medir o que o filtro de seção declarada ("Seção Eleitoral: NNNN") descarta, em votos computados;
// 3) refazer os ciclos de eleitor (identificador → habilitação → "Voto confirmado para [...]" → computado) com
//    deduplicação por linha inteira, contando votos sem habilitação, sem confirmação e com 3+ confirmações, e
//    guardando o contexto bruto desses casos.
// Uso: node scripts/auditoria/cetico-h08-dados-varredura.mjs --uf am,es [--paralelo 2] [--saida nome]
//      node scripts/auditoria/cetico-h08-dados-varredura.mjs --multilog [--paralelo 2]   (só pacotes com 2+ logs, país)
//      node scripts/auditoria/cetico-h08-dados-varredura.mjs --secao ba/39870/0133/0184,...
// Saída: data/parsed/auditoria/cetico/h08-dados-<nome>.json
import { createReadStream } from 'node:fs';
import { mkdir, open, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const DIA = '25/10/2026';
const BASE = path.join(DIR_DADOS, 'raw', '2t', 'urnas');
const seg = (l) => Number(l.slice(11, 13)) * 3600 + Number(l.slice(14, 16)) * 60 + Number(l.slice(17, 19));
const sub = async (d) => (await readdir(d, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
const RUIDO = /^(Verificação de assinatura|Urna ligada conectada|Espaço (livre|utilizado)|Quantidade de memória)/;
const LIMITE_EXEMPLOS = 40;

const emMemoria = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
async function textosBrutos(handle, prefixo = '', prof = 0) {
  const out = [];
  for (const e of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, e);
    if (e.nome === 'logd.dat') out.push({ nome: `${prefixo}logd.dat`, linhas: dados.toString('latin1').split('\n').filter((l) => /^\d\d\/\d\d\/\d{4} /.test(l)) });
    else if (e.nome.endsWith('.jez') && prof < 3) out.push(...(await textosBrutos(emMemoria(dados), `${prefixo}${e.nome}/`, prof + 1)));
  }
  return out;
}
const chave = (l) => { const c = l.split('\t'); return `${c[0]}\t${c[2]}\t${c[c.length - 1]}`; };
const msg = (l) => l.split('\t')[4] ?? '';

function novoAcum() {
  return {
    pacotes: 0, pacotesMultilog: 0, secoes: 0, erros: [],
    dedup: { chaveRepetidaMesmoTexto: 0, linhaRepetidaMesmoTexto: 0, mesmoSegundoMsgHashDiferente: 0, computadoMesmoSegundoMesmaUrna: 0, chaveIgualLinhaDiferente: 0, computadoDescartadoPorChave: 0, computadoDescartadoLinhaDiferente: 0, linhasEntreTextosIdenticas: 0, pacotesComCopia: 0, exemplos: [] },
    filtroSecao: { pacotesComOutraSecao: 0, computadoOutraSecao: 0, computadoOutraSecaoNoDia: 0, exemplos: [] },
    ciclos: { porConfirmacoes: {}, hist: {}, semHabilitacao: 0, semIdentificador: 0, duasHabilitacoes: 0, padroes3: {}, secoes3: {}, exemplos3: [], exemplosSemHab: [], menores: [] },
    intervalos: { hist: {}, histPorUrna: {}, curtos: [] }, urnasSimultaneas: [],
    contagem: [],
  };
}

async function processarPacote(acum, rel, dir, nomes, secao) {
  const nomeLog = acharArquivo(nomes, 'log');
  if (!nomeLog) return;
  const h = await open(path.join(dir, nomeLog));
  let textos;
  try { textos = await textosBrutos(h); } finally { await h.close(); }
  acum.pacotes++;
  if (textos.length > 1) acum.pacotesMultilog++;
  // --- 1. deduplicação
  const porChave = new Map(); // chave -> Set de linhas
  const linhaTextos = new Map(); // linha -> nº de textos
  for (const [i, t] of textos.entries()) {
    const kLocal = new Map(), lLocal = new Set(), tmLocal = new Set();
    for (const l of t.linhas) {
      const k = chave(l);
      if (kLocal.has(k)) {
        acum.dedup.chaveRepetidaMesmoTexto++;
        if (lLocal.has(l)) acum.dedup.linhaRepetidaMesmoTexto++;
        if (acum.dedup.exemplos.length < LIMITE_EXEMPLOS) acum.dedup.exemplos.push({ rel, tipo: 'chave repetida no mesmo texto', texto: t.nome, linha: l, anterior: kLocal.get(k) });
      }
      const c = l.split('\t'), tm = `${c[0]}\t${c[2]}\t${c[4]}`;
      // poder do teste: mesma hora, urna e mensagem no mesmo texto, mas hash diferente (registros reais distintos que
      // uma chave sem o hash fundiria). Se o hash não fosse único por registro, estes casos virariam chave repetida.
      if (tmLocal.has(tm) && !kLocal.has(k)) { acum.dedup.mesmoSegundoMsgHashDiferente++; if (c[4] === 'O voto do eleitor foi computado') acum.dedup.computadoMesmoSegundoMesmaUrna++; }
      tmLocal.add(tm);
      kLocal.set(k, l); lLocal.add(l);
      if (!porChave.has(k)) porChave.set(k, new Set());
      porChave.get(k).add(l);
    }
    for (const l of lLocal) linhaTextos.set(l, (linhaTextos.get(l) ?? 0) + 1);
    void i;
  }
  let copia = false;
  for (const [l, n] of linhaTextos) if (n > 1) { acum.dedup.linhasEntreTextosIdenticas += n - 1; copia = true; if (msg(l) === 'O voto do eleitor foi computado') acum.dedup.computadoDescartadoPorChave += n - 1; }
  if (copia) acum.dedup.pacotesComCopia++;
  for (const [k, ls] of porChave) if (ls.size > 1) {
    acum.dedup.chaveIgualLinhaDiferente += ls.size - 1;
    if ([...ls].some((l) => msg(l) === 'O voto do eleitor foi computado')) acum.dedup.computadoDescartadoLinhaDiferente++;
    if (acum.dedup.exemplos.length < LIMITE_EXEMPLOS) acum.dedup.exemplos.push({ rel, tipo: 'mesma chave, linha diferente', chave: k, linhas: [...ls] });
  }
  // --- 2. filtro de seção declarada (como juntarLogs)
  let outra = 0, outraDia = 0;
  for (const t of textos) {
    let decl = null;
    for (const l of t.linhas) {
      const m = /\tSeção Eleitoral: (\d+)\t/.exec(l);
      if (m) decl = m[1].padStart(4, '0');
      if (decl !== null && decl !== secao && msg(l) === 'O voto do eleitor foi computado') { outra++; if (l.startsWith(DIA)) outraDia++; }
    }
  }
  if (outra) { acum.filtroSecao.pacotesComOutraSecao++; acum.filtroSecao.computadoOutraSecao += outra; acum.filtroSecao.computadoOutraSecaoNoDia += outraDia; if (acum.filtroSecao.exemplos.length < LIMITE_EXEMPLOS) acum.filtroSecao.exemplos.push({ rel, computadoOutraSecao: outra, noDia: outraDia }); }
  // --- 3. ciclos, com deduplicação por LINHA INTEIRA (mais conservadora que a chave) e ordem por data/hora
  const vistas = new Set(), todas = [];
  for (const t of textos) for (const l of t.linhas) { if (!l.startsWith(DIA) || vistas.has(l)) continue; vistas.add(l); todas.push(l); }
  if (textos.length > 1) todas.sort((a, b) => (a.slice(11, 19) < b.slice(11, 19) ? -1 : a.slice(11, 19) > b.slice(11, 19) ? 1 : 0));
  const linhas = todas.filter((l) => !RUIDO.test(msg(l)));
  // Estado do ciclo POR URNA (coluna 3): no pacote de contingência ou com log de outra seção, duas urnas podem ter
  // linhas no mesmo horário, e um ciclo nunca atravessa urnas. O intervalo entre votos é medido no pacote inteiro
  // (como no perfil) e também por urna.
  const estados = new Map();
  const est = (u) => { if (!estados.has(u)) estados.set(u, { ident: null, hab: null, habs: 0, confs: [], inicio: 0, ultimoVoto: null, primeiro: null, n: 0 }); return estados.get(u); };
  const urnaDe = (l) => l.split('	')[2];
  const ctxUrna = (u, de, ate) => linhas.slice(de, ate + 1).filter((x) => urnaDe(x) === u).map((x) => x.split('	').slice(0, 5).join(' | '));
  let ultimoVoto = null, computados = 0;
  const C = acum.ciclos;
  for (const [i, l] of linhas.entries()) {
    const m = msg(l), t = seg(l), u = urnaDe(l), s = est(u);
    if (m === 'Aguardando digitação do identificador do eleitor') { s.ident = t; s.hab = null; s.habs = 0; s.confs = []; s.inicio = i; }
    else if (m === 'Eleitor foi habilitado') { s.hab = t; s.habs++; s.confs = []; }
    else if (m.startsWith('Voto confirmado para [')) s.confs.push(m.slice(22, -1));
    else if (m === 'O voto do eleitor foi computado') {
      computados++; s.n++; s.primeiro ??= t;
      if (ultimoVoto !== null) {
        const d = t - ultimoVoto;
        acum.intervalos.hist[Math.min(d, 30)] = (acum.intervalos.hist[Math.min(d, 30)] ?? 0) + 1;
        if (d <= 17) acum.intervalos.curtos.push({ rel, segundos: d, hora: l.slice(11, 19), mesmaUrna: s.ultimoVoto === ultimoVoto, contexto: linhas.slice(Math.max(0, i - 14), i + 1).map((x) => x.split('	').slice(0, 5).join(' | ')) });
      }
      if (s.ultimoVoto !== null) { const d = t - s.ultimoVoto; acum.intervalos.histPorUrna[Math.min(d, 30)] = (acum.intervalos.histPorUrna[Math.min(d, 30)] ?? 0) + 1; }
      ultimoVoto = t; s.ultimoVoto = t;
      if (s.ident === null) C.semIdentificador++;
      if (s.hab === null) {
        C.semHabilitacao++;
        if (C.exemplosSemHab.length < LIMITE_EXEMPLOS) C.exemplosSemHab.push({ rel, urna: u, hora: l.slice(11, 19), contexto: ctxUrna(u, Math.max(0, i - 40), i).slice(-14) });
      } else {
        const n = s.confs.length, d = t - s.hab;
        C.porConfirmacoes[n] = (C.porConfirmacoes[n] ?? 0) + 1;
        const hh = (C.hist[n] ??= {}); hh[Math.min(d, 60)] = (hh[Math.min(d, 60)] ?? 0) + 1;
        if (s.habs > 1) C.duasHabilitacoes++;
        if ((n >= 2 && d <= 5) || (n === 1 && d <= 2)) C.menores.push({ rel, cargos: s.confs.join('+'), segundos: d, cicloCompletoSegundos: s.ident === null ? null : t - s.ident, hora: l.slice(11, 19), contexto: ctxUrna(u, Math.max(0, s.inicio - 1), i) });
        if (n >= 3) {
          const p = s.confs.join(' > ');
          C.padroes3[p] = (C.padroes3[p] ?? 0) + 1;
          C.secoes3[rel] = (C.secoes3[rel] ?? 0) + 1;
          if (C.exemplos3.length < LIMITE_EXEMPLOS) C.exemplos3.push({ rel, urna: u, hora: l.slice(11, 19), segundos: d, logs: textos.length, contexto: ctxUrna(u, Math.max(0, s.inicio - 1), i) });
        }
      }
      s.ident = null; s.hab = null; s.habs = 0; s.confs = [];
    }
  }
  const comVoto = [...estados].filter(([, s]) => s.n);
  for (let a = 0; a < comVoto.length; a++) for (let b = a + 1; b < comVoto.length; b++) {
    const [ua, sa] = comVoto[a], [ub, sb] = comVoto[b];
    if (sa.primeiro <= sb.ultimoVoto && sb.primeiro <= sa.ultimoVoto) acum.urnasSimultaneas.push({ rel, urnas: [[ua, sa.n, sa.primeiro, sa.ultimoVoto], [ub, sb.n, sb.primeiro, sb.ultimoVoto]] });
  }
  acum.contagem.push([rel, textos.length, computados]);
}

async function processar(secoes) {
  const acum = novoAcum();
  for (const rel of secoes) {
    const dir = path.join(BASE, ...rel.split('/'));
    acum.secoes++;
    try {
      for (const hash of await sub(dir)) {
        const nomes = await readdir(path.join(dir, hash));
        if (!acharArquivo(nomes, 'bu')) continue;
        await processarPacote(acum, `${rel}#${hash.slice(0, 12)}`, path.join(dir, hash), nomes, rel.split('/')[3]);
      }
    } catch (e) { acum.erros.push({ rel, erro: e.message }); }
  }
  return acum;
}

function juntar(partes) {
  const r = novoAcum();
  const somaObj = (a, b) => { for (const [k, v] of Object.entries(b)) a[k] = typeof v === 'object' ? somaObj(a[k] ?? {}, v) : (a[k] ?? 0) + v; return a; };
  for (const p of partes) {
    r.pacotes += p.pacotes; r.pacotesMultilog += p.pacotesMultilog; r.secoes += p.secoes; r.erros.push(...p.erros);
    for (const k of Object.keys(r.dedup)) if (k !== 'exemplos') r.dedup[k] += p.dedup[k];
    r.dedup.exemplos.push(...p.dedup.exemplos);
    for (const k of ['pacotesComOutraSecao', 'computadoOutraSecao', 'computadoOutraSecaoNoDia']) r.filtroSecao[k] += p.filtroSecao[k];
    r.filtroSecao.exemplos.push(...p.filtroSecao.exemplos);
    for (const k of ['semHabilitacao', 'semIdentificador', 'duasHabilitacoes']) r.ciclos[k] += p.ciclos[k];
    somaObj(r.ciclos.porConfirmacoes, p.ciclos.porConfirmacoes); somaObj(r.ciclos.hist, p.ciclos.hist); somaObj(r.ciclos.padroes3, p.ciclos.padroes3); somaObj(r.ciclos.secoes3, p.ciclos.secoes3);
    r.ciclos.exemplos3.push(...p.ciclos.exemplos3); r.ciclos.exemplosSemHab.push(...p.ciclos.exemplosSemHab); r.ciclos.menores.push(...p.ciclos.menores);
    somaObj(r.intervalos.hist, p.intervalos.hist); somaObj(r.intervalos.histPorUrna, p.intervalos.histPorUrna); r.urnasSimultaneas.push(...p.urnasSimultaneas); r.intervalos.curtos.push(...p.intervalos.curtos);
    r.contagem.push(...p.contagem);
  }
  r.ciclos.menores.sort((a, b) => a.segundos - b.segundos);
  r.intervalos.curtos.sort((a, b) => a.segundos - b.segundos);
  return r;
}

if (!isMainThread) parentPort.postMessage(await processar(workerData));
else {
  const { values } = parseArgs({ options: { uf: { type: 'string' }, multilog: { type: 'boolean' }, secao: { type: 'string' }, paralelo: { type: 'string', default: '2' }, saida: { type: 'string' } } });
  let secoes = [];
  if (values.secao) secoes = values.secao.split(',');
  else if (values.multilog) {
    const vistas = new Set();
    for (const uf of UFS) {
      const rl = createInterface({ input: createReadStream(path.join(DIR_DADOS, 'parsed', '2t', 'perfil', `${uf}.jsonl`)), crlfDelay: Infinity });
      for await (const l of rl) { if (!l) continue; const p = JSON.parse(l); if ((p.log?.logsNoPacote ?? 0) > 1) vistas.add(`${uf}/${p.municipio}/${p.zona}/${p.secao}`); }
    }
    secoes = [...vistas];
  } else {
    for (const uf of values.uf.split(',')) for (const mun of await sub(path.join(BASE, uf))) for (const z of await sub(path.join(BASE, uf, mun))) for (const s of await sub(path.join(BASE, uf, mun, z))) secoes.push(`${uf}/${mun}/${z}/${s}`);
  }
  const k = Math.min(Number(values.paralelo), secoes.length);
  const partes = await Promise.all(Array.from({ length: k }, (_, i) => new Promise((resolve, reject) => {
    const w = new Worker(import.meta.filename, { workerData: secoes.filter((_, j) => j % k === i) });
    w.on('message', resolve); w.on('error', reject);
  })));
  const r = juntar(partes);
  const nome = values.saida ?? (values.multilog ? 'multilog' : values.secao ? 'secoes' : values.uf.replaceAll(',', '-'));
  const destino = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');
  await mkdir(destino, { recursive: true });
  await writeFile(path.join(destino, `h08-dados-${nome}.json`), JSON.stringify(r, null, 1));
  const { contagem, ...resto } = r;
  console.log(JSON.stringify({ ...resto, dedup: { ...r.dedup, exemplos: r.dedup.exemplos.slice(0, 4) }, filtroSecao: { ...r.filtroSecao, exemplos: r.filtroSecao.exemplos.slice(0, 5) },
    ciclos: { ...r.ciclos, secoes3: undefined, hist: Object.fromEntries(Object.entries(r.ciclos.hist).map(([c, h]) => [c, Object.fromEntries(Object.entries(h).slice(0, 8))])), exemplos3: r.ciclos.exemplos3.slice(0, 3), exemplosSemHab: r.ciclos.exemplosSemHab.slice(0, 3), menores: r.ciclos.menores.slice(0, 3) },
    intervalos: { hist: r.intervalos.hist, histPorUrna: r.intervalos.histPorUrna, curtos: r.intervalos.curtos.slice(0, 3) }, urnasSimultaneas: r.urnasSimultaneas.slice(0, 10), secoes3: Object.keys(r.ciclos.secoes3).length, contagemPacotes: contagem.length }, null, 1));
}
