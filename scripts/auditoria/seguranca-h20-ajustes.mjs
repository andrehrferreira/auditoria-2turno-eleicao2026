// Engenheiro de segurança, H20 item 3 (janela deslocada), docs/analysis/engenheiro-seguranca-urna/11.
// Varredura nacional dos ACERTOS DE RELÓGIO digitados por gente, em todos os diários (fecha o pendente do doc
// linha-do-tempo/07: "varredura nacional de ajustes de hora digitados").
//   - SCUE (carga): "Data e hora que foi digitada pelo operador: dd/mm/aaaa - hh:mm"
//   - ADH (aplicativo de ajuste): "Ajuste de Data e Hora dd/mm/aaaa - hh:mm foi digitada pelo operador"
//   Δ = hora digitada − relógio da urna na mesma linha, em minutos (o relógio da linha é o de antes do acerto).
//   - exterior: "Horário da urna alterado devido a horário de verão" (o aplicativo soma a hora de verão do país).
// Período: o mesmo de seguranca-h20-varredura.mjs (1º turno: o diário inteiro do pacote do 1º turno; 2º turno: depois
// da última linha datada de 04/10/2026). Fluxo = urna dentro de cada logd.dat; cópias da mesma urna contam uma vez
// (fica a com mais linhas no período).
// Também: no dia, as recusas da trava de horário ("... só pode ser ..."), por texto e com a 1ª hora.
// Por urna com algum acerto de 30 min ou mais (em módulo), ou com recusa da trava, sai a lista dos acertos e os horários do dia da votação
// (zerésima, "Urna pronta", 1º e último voto, encerramento, BU), para ler a assinatura de relógio deslocado.
// Uso: node scripts/auditoria/seguranca-h20-ajustes.mjs --turno 1 [--uf ac] [--paralelo 2] [--refazer]
// Saída: data/parsed/auditoria/engenheiro-seguranca-urna/h20/ajustes-<t>t/<uf>-<p>.jsonl (seções com acerto ≥ 30 min)
//        e <uf>-<p>.hist.json (histograma de Δ de todos os acertos, por aplicação; contagens).
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const DIA = { 1: '04/10/2026', 2: '25/10/2026' };
const TAM_PARTE = 4000;
const LIMIAR = 30;
const sub = async (d) => (await readdir(d, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
const memoria = (buf) => ({ read: async (d, o, n, p) => ({ bytesRead: buf.copy(d, o, p, p + n) }), stat: async () => ({ size: buf.length }) });
async function textos(handle, prof = 0) {
  const out = [];
  for (const e of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, e);
    if (e.nome === 'logd.dat') out.push({ prof, texto: dados.toString('latin1') });
    else if (e.nome.endsWith('.jez') && prof < 4) out.push(...(await textos(memoria(dados), prof + 1)));
  }
  return out;
}
const abs = (s) => Date.UTC(+s.slice(6, 10), +s.slice(3, 5) - 1, +s.slice(0, 2), +s.slice(11, 13), +s.slice(14, 16), +(s.slice(17, 19) || 0)) / 60000;
const DIGITADA = /(\d\d\/\d\d\/\d{4}) - (\d\d:\d\d)/;

function porUrna(texto, turno) {
  const m = new Map();
  for (let linha of texto.split('\n')) {
    if (linha.length < 20 || linha[2] !== '/') continue;
    if (linha.endsWith('\r')) linha = linha.slice(0, -1);
    const t1 = linha.indexOf('\t'), t2 = linha.indexOf('\t', t1 + 1), t3 = linha.indexOf('\t', t2 + 1);
    if (t3 < 0) continue;
    const urna = linha.slice(t2 + 1, t3);
    if (!m.has(urna)) m.set(urna, []);
    m.get(urna).push(linha);
  }
  if (turno === '2') {
    for (const [u, L] of m) {
      let ult = -1;
      for (let i = 0; i < L.length; i++) if (L[i].startsWith('04/10/2026')) ult = i;
      if (ult >= 0) m.set(u, L.slice(ult + 1));
      else {
        const i0 = L.findIndex((l) => +(l.slice(6, 10) + l.slice(3, 5) + l.slice(0, 2)) >= 20261005);
        m.set(u, i0 < 0 ? [] : L.slice(i0));
      }
    }
  }
  return m;
}

function processarFluxo(L, turno, hist) {
  const dia = DIA[turno];
  const f = { ajustes: [], verao: 0, travas: {}, zer: null, pronta: null, v1: null, vN: null, nV: 0, enc: null, buI: null, contingencia: false };
  let grande = false, grandeTrava = false;
  for (const l of L) {
    const c = l.split('\t');
    const msg = c[4] ?? '';
    if (msg.includes('foi digitada pelo operador')) {
      const mm = DIGITADA.exec(msg);
      if (mm) {
        const delta = Math.round(abs(`${mm[1]} ${mm[2]}`) - abs(c[0]));
        const app = c[3];
        const faixa = Math.max(-1500, Math.min(1500, delta));
        const h = (hist.delta[app] ??= {});
        h[faixa] = (h[faixa] ?? 0) + 1;
        hist.ajustes++;
        if (Math.abs(delta) >= LIMIAR) grande = true;
        f.ajustes.push({ quando: c[0], app, delta, noDia: c[0].startsWith(dia) });
      }
    } else if (msg === 'Horário da urna alterado devido a horário de verão') f.verao++;
    if (!c[0].startsWith(dia)) continue;
    const hh = c[0].slice(11, 19);
    // trava de horário recusando um pedido da mesa (ex.: "Encerramento só pode ser solicitado após as 17:00:00 horas")
    if (msg.includes('só pode ser')) {
      const k = msg; // o texto traz a hora da trava (ex.: 16:00:00 em RR), que é a informação útil
      const t = (f.travas[k] ??= { n: 0, primeira: hh });
      t.n++;
      hist.travas[k] = (hist.travas[k] ?? 0) + 1;
      grandeTrava = true;
    }
    if (msg === 'Modo de carga da UE - Urna de contingência') f.contingencia = true;
    else if (msg.startsWith('Imprimindo relatório [ZERÉSIMA]')) f.zer ??= hh;
    else if (msg === 'Urna pronta para receber votos') f.pronta ??= hh;
    else if (msg === 'O voto do eleitor foi computado') { f.nV++; f.v1 ??= hh; f.vN = hh; }
    else if (msg === 'Procedimento de encerramento confirmado') f.enc ??= hh;
    else if (msg === 'Gerando relatório [BU] [INÍCIO]') f.buI ??= hh;
  }
  if (f.verao) hist.fluxosComVerao++;
  // só guarda os acertos de 30 min ou mais (o histograma guarda todos)
  f.ajustesTotal = f.ajustes.length;
  f.ajustes = f.ajustes.filter((a) => Math.abs(a.delta) >= LIMIAR);
  return grande || grandeTrava ? f : null;
}

async function processarSecao(dirSecao, turno, id, hist) {
  const [uf, municipio, zona, secao] = id.split('/');
  const hashes = new Set();
  const copias = new Map();
  for (const hp of await sub(dirSecao)) {
    const dir = path.join(dirSecao, hp);
    const log = acharArquivo(await readdir(dir), 'log');
    if (!log) continue;
    const bytes = await readFile(path.join(dir, log));
    const h = createHash('sha256').update(bytes).digest('hex');
    if (hashes.has(h)) continue;
    hashes.add(h);
    for (const { prof, texto } of await textos(memoria(bytes))) {
      for (const [urna, L] of porUrna(texto, turno)) {
        if (!copias.has(urna)) copias.set(urna, []);
        copias.get(urna).push({ prof, L });
      }
    }
  }
  const fluxos = [];
  for (const [urna, lista] of copias) {
    lista.sort((a, b) => b.L.length - a.L.length);
    hist.fluxos++;
    const f = processarFluxo(lista[0].L, turno, hist);
    if (f) fluxos.push({ urna, prof: lista[0].prof, ...f });
  }
  return fluxos.length ? { uf, municipio, zona, secao, fluxos } : null;
}

async function processarParte({ turno, ids, base, saida, nome }) {
  const hist = { secoes: ids.length, erros: [], fluxos: 0, ajustes: 0, fluxosComVerao: 0, delta: {}, travas: {} };
  const linhas = [];
  for (const id of ids) {
    try {
      const r = await processarSecao(path.join(base, ...id.split('/')), turno, id, hist);
      if (r) linhas.push(JSON.stringify(r));
    } catch (e) { hist.erros.push({ id, erro: e.message }); }
  }
  const alvo = (ext) => path.join(saida, `${nome}.${ext}`);
  await writeFile(`${alvo('hist.json')}.tmp`, JSON.stringify(hist));
  await writeFile(`${alvo('jsonl')}.tmp`, linhas.length ? `${linhas.join('\n')}\n` : '');
  for (const ext of ['hist.json', 'jsonl']) await rename(`${alvo(ext)}.tmp`, alvo(ext));
  return { nome, secoes: ids.length, erros: hist.erros.length };
}

if (!isMainThread) {
  parentPort.on('message', async (t) => {
    if (t === null) process.exit(0);
    parentPort.postMessage(await processarParte(t));
  });
} else if (import.meta.filename === path.resolve(process.argv[1] ?? '')) {
  const { values } = parseArgs({ options: { turno: { type: 'string', default: '1' }, uf: { type: 'string' }, paralelo: { type: 'string', default: '2' }, refazer: { type: 'boolean' } } });
  const turno = values.turno;
  const base = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas');
  const saida = path.join(DIR_DADOS, 'parsed', 'auditoria', 'engenheiro-seguranca-urna', 'h20', `ajustes-${turno}t`);
  await mkdir(saida, { recursive: true });
  const tarefas = [];
  for (const uf of values.uf ? values.uf.split(',') : UFS) {
    const ids = [];
    const bUf = path.join(base, uf);
    for (const m of await sub(bUf)) for (const z of await sub(path.join(bUf, m))) for (const s of await sub(path.join(bUf, m, z))) ids.push(`${uf}/${m}/${z}/${s}`);
    for (let i = 0, p = 0; i < ids.length; i += TAM_PARTE, p++) {
      const nome = `${uf}-${String(p).padStart(3, '0')}`;
      if (!values.refazer && existsSync(path.join(saida, `${nome}.hist.json`))) continue;
      tarefas.push({ turno, ids: ids.slice(i, i + TAM_PARTE), base, saida, nome });
    }
  }
  console.log(`turno ${turno}: ${tarefas.length} parte(s), ${values.paralelo} worker(s)`);
  const inicio = Date.now();
  let feitas = 0, comErro = 0;
  await Promise.all(Array.from({ length: Math.min(Number(values.paralelo), tarefas.length) }, () => new Promise((resolve, reject) => {
    const w = new Worker(import.meta.filename);
    const proxima = () => { const t = tarefas.shift(); w.postMessage(t ?? null); if (!t) resolve(); };
    w.on('message', (r) => {
      feitas++;
      if (r.erros) comErro++;
      console.log(`${r.nome}: ${r.secoes} seções, ${r.erros} erro(s) · ${feitas} feitas · ${((Date.now() - inicio) / 60000).toFixed(1)} min`);
      proxima();
    });
    w.on('error', reject);
    proxima();
  })));
  console.log(`RESUMO turno ${turno}: ${feitas} parte(s), ${comErro} com erro, ${((Date.now() - inicio) / 60000).toFixed(1)} min`);
}
