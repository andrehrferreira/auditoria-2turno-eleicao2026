// Engenheiro de segurança, H20 (relógio e ordem temporal adulterados), docs/analysis/engenheiro-seguranca-urna/11.
// Leitura própria de TODOS os diários de urna de um turno (universo completo), sem lerLogs/perfil-secoes.
//
// Fluxo (unidade de leitura), igual ao do estatístico H08 (estatistico-h08-varredura.mjs):
//   - cada logd.dat do pacote (inclusive os .jez aninhados da urna original, em contingência) é lido separado;
//   - dentro de cada texto as linhas são separadas pela urna (3ª coluna), na ordem física em que foram gravadas;
//   - a mesma urna em mais de um texto (cópias MI/ME) vira um fluxo só: fica a cópia com mais linhas no período do turno;
//   - linha idêntica repetida no fluxo conta uma vez; nada é reordenado por hora.
//
// Por fluxo, no dia da votação (só as linhas da seção que a urna declarou por último, "Seção Eleitoral: NNNN"):
//   ZER  = 1º "Imprimindo relatório [ZERÉSIMA]"         PRONTA = 1º "Urna pronta para receber votos"
//   V    = "O voto do eleitor foi computado" (1º e último)
//   ENC  = 1º "Procedimento de encerramento confirmado"  INI = 1º "Inicio do Encerramento"
//   BUI  = 1º "Gerando relatório [BU] [INÍCIO]"         BUT = 1º "Gerando relatório [BU] [TÉRMINO]"
//   Cada evento guarda [hora, posição física]: hora = segundos desde 00:00 do dia da votação no relógio da urna
//   (pode passar de 86.400 ou ficar negativa se a data da linha for outra); posição = índice da linha no fluxo.
//   Violações de ordem contadas pelas duas réguas: ordem física (F) e relógio (R).
// No período do turno (1º turno: o diário inteiro do pacote do 1º turno; 2º turno: tudo depois da última linha datada
// de 04/10/2026, na ordem física; sem ela, da 1ª linha com data ≥ 05/10/2026), toda linha cuja data-hora é menor que a da linha anterior do mesmo fluxo é um
// "retrocesso". Classe do retrocesso:
//   ajuste     = linha de acerto de relógio de 30 linhas antes até 2 depois ("Data e hora atualizada",
//                "Data e hora que foi digitada pelo operador", "Data e hora solicitadas", aplicação ADH ou
//                "Ajuste de Data e Hora");
//   religa     = sem ajuste, mas com "Urna ligada em" / "Início das operações do logd" nas 30 linhas antes;
//   sem        = nenhum dos dois.
// Nenhum título de eleitor ou mesário é gravado: sequências de 8 ou mais dígitos nas mensagens viram '#'.
//
// Uso: node scripts/auditoria/seguranca-h20-varredura.mjs --turno 2 [--uf ac,df] [--paralelo 2] [--refazer]
//      node scripts/auditoria/seguranca-h20-varredura.mjs --turno 2 --secoes ac/01007/0009/0001 --saida <dir>
// Saída (por parte de até 4.000 seções): data/parsed/auditoria/engenheiro-seguranca-urna/h20/<t>t/<uf>-<p>.jsonl
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

void workerData;
const DIA = { 1: [2026, 10, 4], 2: [2026, 10, 25] };
const INICIO_PERIODO = { 1: 0, 2: 20261005 }; // aaaammdd; 1º turno: o diário inteiro
const TAM_PARTE = 4000;
const JANELA_AJUSTE = 30;
const MAX_EXEMPLOS = 8;
const sub = async (d) => (await readdir(d, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
const memoria = (buf) => ({ read: async (d, o, n, p) => ({ bytesRead: buf.copy(d, o, p, p + n) }), stat: async () => ({ size: buf.length }) });
const copia = (s) => Buffer.from(s, 'utf8').toString('utf8');
const limpa = (m) => copia(m.replace(/\d{8,}/g, '#')).slice(0, 160);

/** Todos os logd.dat do pacote, com a profundidade (0 = urna que gerou o pacote; 1+ = urna original de contingência). */
async function textos(handle, prof = 0) {
  const out = [];
  for (const e of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, e);
    if (e.nome === 'logd.dat') out.push({ prof, texto: dados.toString('latin1') });
    else if (e.nome.endsWith('.jez') && prof < 4) out.push(...(await textos(memoria(dados), prof + 1)));
  }
  return out;
}

/** "dd/mm/aaaa hh:mm:ss..." → { ymd, abs (segundos UTC fictícios do relógio da urna) } ou null. */
function hora(l) {
  if (l.length < 19 || l[2] !== '/' || l[5] !== '/' || l[10] !== ' ') return null;
  const d = +l.slice(0, 2), mo = +l.slice(3, 5), a = +l.slice(6, 10), h = +l.slice(11, 13), mi = +l.slice(14, 16), s = +l.slice(17, 19);
  if ([d, mo, a, h, mi, s].some(Number.isNaN)) return null;
  return { ymd: a * 10000 + mo * 100 + d, abs: Date.UTC(a, mo - 1, d, h, mi, s) / 1000 };
}

const SECAO = /^Seção Eleitoral: (\d+)$/;
const AJUSTE = (app, m) => app === 'ADH' || m === 'Data e hora atualizada' || m.startsWith('Data e hora que foi digitada pelo operador')
  || m === 'Data e hora solicitadas' || m.includes('Ajuste de Data e Hora');
const AJUSTE_MSG = (m) => m === 'Data e hora atualizada' || m.includes('foi digitada pelo operador');
const RELIGA = (m) => m.startsWith('Urna ligada em') || m === 'Início das operações do logd';

/** Separa um texto em fluxos por urna: Map urna → linhas (ordem física, sem '\r'). */
function porUrna(texto) {
  const m = new Map();
  for (let linha of texto.split('\n')) {
    if (linha.length < 20) continue;
    if (linha.endsWith('\r')) linha = linha.slice(0, -1);
    const t1 = linha.indexOf('\t'), t2 = linha.indexOf('\t', t1 + 1), t3 = linha.indexOf('\t', t2 + 1);
    if (t3 < 0) continue;
    const urna = linha.slice(t2 + 1, t3);
    let arr = m.get(urna);
    if (!arr) m.set(urna, (arr = []));
    arr.push(linha);
  }
  return m;
}

/** Linhas do período do turno (ordem física). 2º turno: tudo depois da última linha datada de 04/10/2026 (dia do
 *  1º turno); sem nenhuma, da 1ª linha com data ≥ 05/10 em diante. A data sozinha não basta: na carga, antes de o
 *  operador digitar a hora, o relógio interno pode marcar uma data de outubro (ex.: AC 01023/0001/0584, 06/10). */
function doPeriodo(linhas, turno) {
  if (!INICIO_PERIODO[turno]) return linhas;
  let ultimoDia1 = -1;
  for (let i = 0; i < linhas.length; i++) if (linhas[i].startsWith('04/10/2026')) ultimoDia1 = i;
  if (ultimoDia1 >= 0) return linhas.slice(ultimoDia1 + 1);
  for (let i = 0; i < linhas.length; i++) {
    const h = hora(linhas[i]);
    if (h && h.ymd >= INICIO_PERIODO[turno]) return linhas.slice(i);
  }
  return [];
}

function processarFluxo(linhasTodas, turno, secao, base0) {
  const [ya, ym, yd] = DIA[turno];
  const ymdDia = ya * 10000 + ym * 100 + yd;
  const base = base0; // segundos absolutos de 00:00 do dia
  const vistas = new Set();
  const L = [];
  let duplicadas = 0;
  for (const l of linhasTodas) {
    if (vistas.has(l)) { duplicadas++; continue; }
    vistas.add(l);
    const h = hora(l);
    if (!h) continue;
    const c = l.split('\t');
    L.push({ h, app: c[3] ?? '', m: c[4] ?? '', nivel: c[1] ?? '' });
  }
  const f = {
    linhas: L.length, duplicadas, outraSecaoDia: 0, contingencia: false, nZer: 0, nPronta: 0, nV: 0, nVoutroDia: 0,
    zer: null, pronta: null, v1: null, vN: null, enc: null, ini: null, buI: null, buT: null, encerrada: null,
    ajustesDia: [], saltos: { periodo: { ajuste: 0, religa: 0, sem: 0 }, dia: { ajuste: 0, religa: 0, sem: 0 } },
    saltosSemMag: { s1: 0, s2a59: 0, m1a59: 0, h1a23: 0, d1: 0 }, exSaltos: [], lacunas60: 0, lacunas60SemReliga: 0,
    secoesDeclaradas: [],
  };
  // marcadores de ajuste e religamento (índices) para classificar retrocessos
  const ajuste = [], religa = [];
  for (let i = 0; i < L.length; i++) {
    if (AJUSTE(L[i].app, L[i].m)) ajuste.push(i);
    if (RELIGA(L[i].m)) religa.push(i);
  }
  const existe = (arr, de, ate) => {
    let lo = 0, hi = arr.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid] < de) lo = mid + 1; else hi = mid; }
    return lo < arr.length && arr[lo] <= ate;
  };
  // 1. retrocessos no período (todas as seções da urna)
  for (let i = 1; i < L.length; i++) {
    const dt = L[i].h.abs - L[i - 1].h.abs;
    if (dt >= 0) continue;
    const classe = existe(ajuste, i - JANELA_AJUSTE, i + 2) ? 'ajuste' : existe(religa, i - JANELA_AJUSTE, i) ? 'religa' : 'sem';
    f.saltos.periodo[classe]++;
    const noDia = L[i - 1].h.ymd === ymdDia || L[i].h.ymd === ymdDia;
    if (noDia) f.saltos.dia[classe]++;
    if (classe === 'sem') {
      const a = -dt;
      if (a <= 1) f.saltosSemMag.s1++; else if (a < 60) f.saltosSemMag.s2a59++; else if (a < 3600) f.saltosSemMag.m1a59++;
      else if (a < 86400) f.saltosSemMag.h1a23++; else f.saltosSemMag.d1++;
    }
    if (classe !== 'ajuste' && f.exSaltos.length < MAX_EXEMPLOS) {
      f.exSaltos.push({ classe, dt, noDia, pos: i, antes: `${fmt(L[i - 1].h.abs)} ${L[i - 1].app} ${limpa(L[i - 1].m)}`, depois: `${fmt(L[i].h.abs)} ${L[i].app} ${limpa(L[i].m)}` });
    }
  }
  // 2. eventos do dia (só linhas da seção declarada por último pela urna). O trecho do dia começa depois da última linha
  // (ordem física) com data anterior ao dia: linha datada do dia gravada antes disso (relógio posto no dia durante a
  // preparação, ex. ADH) fica fora e é contada à parte (diaForaDoTrecho, votos em vForaDoTrecho).
  let inicioDia = 0;
  for (let i = 0; i < L.length; i++) if (L[i].h.ymd < ymdDia) inicioDia = i + 1;
  f.inicioDia = inicioDia;
  f.diaForaDoTrecho = 0;
  f.vForaDoTrecho = 0;
  for (let i = 0; i < inicioDia; i++) {
    if (L[i].h.ymd === ymdDia) { f.diaForaDoTrecho++; if (L[i].m === 'O voto do eleitor foi computado') f.vForaDoTrecho++; }
  }
  let declarada = null;
  const ev = (h, i) => [h.abs - base, i];
  const votos = [];
  for (let i = 0; i < L.length; i++) {
    const { h, m, app } = L[i];
    const sm = SECAO.exec(m);
    if (sm) {
      declarada = sm[1].padStart(4, '0');
      if (!f.secoesDeclaradas.includes(declarada) && f.secoesDeclaradas.length < 5) f.secoesDeclaradas.push(declarada);
    }
    const ehDia = h.ymd === ymdDia && i >= inicioDia;
    if (m === 'O voto do eleitor foi computado' && !ehDia) {
      if ((declarada === null || declarada === secao) && h.ymd !== ymdDia) f.nVoutroDia++;
      continue;
    }
    if (!ehDia) continue;
    // a contingência é registrada antes de a urna assumir a seção (Seção Eleitoral: 0000), então vale para o fluxo inteiro
    if (m === 'Modo de carga da UE - Urna de contingência' || m === 'Início do procedimento de contingência') f.contingencia = true;
    if (declarada !== null && declarada !== secao) { f.outraSecaoDia++; continue; }
    if (m.startsWith('Imprimindo relatório [ZERÉSIMA]')) { f.nZer++; f.zer ??= ev(h, i); }
    else if (m === 'Urna pronta para receber votos') { f.nPronta++; f.pronta ??= ev(h, i); }
    else if (m === 'O voto do eleitor foi computado') { f.nV++; votos.push(ev(h, i)); }
    else if (m === 'Procedimento de encerramento confirmado') f.enc ??= ev(h, i);
    else if (m === 'Inicio do Encerramento') f.ini ??= ev(h, i);
    else if (m === 'Gerando relatório [BU] [INÍCIO]') f.buI ??= ev(h, i);
    else if (m === 'Gerando relatório [BU] [TÉRMINO]') f.buT ??= ev(h, i);
    else if (m === 'Votação encerrada') f.encerrada ??= ev(h, i);
    if (AJUSTE_MSG(m)) {
      if (f.ajustesDia.length < MAX_EXEMPLOS) f.ajustesDia.push({ t: h.abs - base, pos: i, app, m: limpa(m) });
    }
  }
  if (votos.length) { f.v1 = votos[0]; f.vN = votos[votos.length - 1]; }
  // 3. violações de ordem, pelas duas réguas
  const conta = (pred) => votos.reduce((n, v) => n + (pred(v) ? 1 : 0), 0);
  f.ord = {
    vAntesZerF: f.zer ? conta((v) => v[1] < f.zer[1]) : null,
    vAntesZerR: f.zer ? conta((v) => v[0] < f.zer[0]) : null,
    vAntesProntaF: f.pronta ? conta((v) => v[1] < f.pronta[1]) : null,
    vAntesProntaR: f.pronta ? conta((v) => v[0] < f.pronta[0]) : null,
    vDepoisEncF: f.enc ? conta((v) => v[1] > f.enc[1]) : null,
    vDepoisEncR: f.enc ? conta((v) => v[0] > f.enc[0]) : null,
    vDepoisBuF: f.buI ? conta((v) => v[1] > f.buI[1]) : null,
    vDepoisBuR: f.buI ? conta((v) => v[0] > f.buI[0]) : null,
    zerDepoisProntaF: f.zer && f.pronta ? f.zer[1] > f.pronta[1] : null,
    zerDepoisProntaR: f.zer && f.pronta ? f.zer[0] > f.pronta[0] : null,
    buAntesEncF: f.buI && f.enc ? f.buI[1] < f.enc[1] : null,
    buAntesEncR: f.buI && f.enc ? f.buI[0] < f.enc[0] : null,
  };
  // 4. lacunas de 60 min ou mais entre linhas seguidas, de PRONTA a ENC
  if (f.pronta) {
    const fim = f.enc ? f.enc[1] : L.length - 1;
    for (let i = f.pronta[1] + 1; i <= fim && i < L.length; i++) {
      if (L[i].h.abs - L[i - 1].h.abs >= 3600) {
        f.lacunas60++;
        if (!RELIGA(L[i].m) && !(i + 1 < L.length && RELIGA(L[i + 1].m))) f.lacunas60SemReliga++;
      }
    }
  }
  return f;
}

function fmt(abs) {
  return new Date(abs * 1000).toISOString().slice(0, 19).replace('T', ' ');
}

async function processarSecao(dirSecao, turno, id) {
  const [uf, municipio, zona, secao] = id.split('/');
  const [ya, ym, yd] = DIA[turno];
  const base = Date.UTC(ya, ym - 1, yd) / 1000;
  const sec = { uf, municipio, zona, secao, pacotes: 0, logsDistintos: 0, textos: 0, semLog: 0, arquivoLog: null, fluxos: [] };
  const pacotes = await sub(dirSecao);
  sec.pacotes = pacotes.length;
  const hashes = new Set();
  const copias = new Map(); // urna → [{prof, linhas}]
  for (const hp of pacotes) {
    const dir = path.join(dirSecao, hp);
    const nomes = await readdir(dir);
    const log = acharArquivo(nomes, 'log');
    if (!log) { sec.semLog++; continue; }
    sec.arquivoLog = log.endsWith('-logsa.jez') ? 'logsa' : 'log';
    const bytes = await readFile(path.join(dir, log));
    const h = createHash('sha256').update(bytes).digest('hex');
    if (hashes.has(h)) continue;
    hashes.add(h);
    const ts = await textos(memoria(bytes));
    sec.textos += ts.length;
    for (const { prof, texto } of ts) {
      for (const [urna, linhas] of porUrna(texto)) {
        const per = doPeriodo(linhas, turno);
        if (!copias.has(urna)) copias.set(urna, []);
        copias.get(urna).push({ prof, linhas: per });
      }
    }
  }
  sec.logsDistintos = hashes.size;
  for (const [urna, lista] of copias) {
    lista.sort((a, b) => b.linhas.length - a.linhas.length);
    const esc = lista[0];
    if (!esc.linhas.length) continue;
    const f = processarFluxo(esc.linhas, turno, secao, base);
    sec.fluxos.push({ urna, prof: esc.prof, copias: lista.length, ...f });
  }
  return sec;
}

async function processarParte({ turno, ids, base, saida, nome }) {
  const linhas = [];
  const erros = [];
  for (const id of ids) {
    try {
      linhas.push(JSON.stringify(await processarSecao(path.join(base, ...id.split('/')), turno, id)));
    } catch (e) {
      erros.push({ id, erro: e.message });
      linhas.push(JSON.stringify({ id, erro: e.message }));
    }
  }
  const alvo = path.join(saida, `${nome}.jsonl`);
  await writeFile(`${alvo}.tmp`, linhas.length ? `${linhas.join('\n')}\n` : '');
  await rename(`${alvo}.tmp`, alvo);
  return { nome, secoes: ids.length, erros: erros.length };
}

if (!isMainThread) {
  parentPort.on('message', async (tarefa) => {
    if (tarefa === null) process.exit(0);
    parentPort.postMessage(await processarParte(tarefa));
  });
} else if (import.meta.filename === path.resolve(process.argv[1] ?? '')) {
  const { values } = parseArgs({
    options: {
      turno: { type: 'string', default: '2' }, uf: { type: 'string' }, secoes: { type: 'string' }, saida: { type: 'string' },
      paralelo: { type: 'string', default: '2' }, refazer: { type: 'boolean' },
    },
  });
  const turno = values.turno;
  const base = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas');
  const saida = path.resolve(values.saida ?? path.join(DIR_DADOS, 'parsed', 'auditoria', 'engenheiro-seguranca-urna', 'h20', `${turno}t`));
  await mkdir(saida, { recursive: true });
  const tarefas = [];
  if (values.secoes) {
    tarefas.push({ turno, ids: values.secoes.split(','), base, saida, nome: 'selecao' });
  } else {
    for (const uf of values.uf ? values.uf.split(',') : UFS) {
      const ids = [];
      const bUf = path.join(base, uf);
      for (const m of await sub(bUf)) for (const z of await sub(path.join(bUf, m))) for (const s of await sub(path.join(bUf, m, z))) ids.push(`${uf}/${m}/${z}/${s}`);
      for (let i = 0, p = 0; i < ids.length; i += TAM_PARTE, p++) {
        const nome = `${uf}-${String(p).padStart(3, '0')}`;
        if (!values.refazer && existsSync(path.join(saida, `${nome}.jsonl`))) continue;
        tarefas.push({ turno, ids: ids.slice(i, i + TAM_PARTE), base, saida, nome });
      }
    }
  }
  console.log(`turno ${turno}: ${tarefas.length} parte(s) a processar, ${values.paralelo} worker(s)`);
  const inicio = Date.now();
  let feitas = 0, comErro = 0;
  await Promise.all(Array.from({ length: Math.min(Number(values.paralelo), tarefas.length) }, () => new Promise((resolve, reject) => {
    const w = new Worker(import.meta.filename);
    const proxima = () => {
      const t = tarefas.shift();
      w.postMessage(t ?? null);
      if (!t) resolve();
    };
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
