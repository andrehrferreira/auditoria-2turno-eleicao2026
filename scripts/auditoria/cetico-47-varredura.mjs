// Cético revisor, parecer 47 (H20, relógio e ordem temporal). Leitura própria e independente de TODOS os diários
// de urna de um turno, para reproduzir docs/analysis/engenheiro-seguranca-urna/11 sem usar seguranca-h20-varredura.mjs.
//
// Diferenças deliberadas em relação à leitura do engenheiro (para servir de conferência):
// - o dia da votação é decidido só pela DATA da linha ("04/10/2026" / "25/10/2026"), não pelo "trecho depois da última
//   linha de data anterior"; votos de outra data no meio do dia são contados à parte;
// - a seção declarada ("Seção Eleitoral: NNNN") é seguida por urna dentro de cada texto;
// - a mesma urna em mais de um texto (MI/ME, .jez aninhado) vira um fluxo: fica a cópia com MAIS VOTOS do dia
//   (empate: mais linhas); linha idêntica repetida conta uma vez; nada é reordenado;
// - retrocesso do relógio = linha com data-hora menor que a da linha anterior do mesmo fluxo. Classe por janela
//   CURTA (3 linhas antes e depois): 'acerto3' (mensagem de data e hora, ADH, horário de verão), 'religa3' (urna
//   ligada, início do logd, registro do log, fechamento do log); se não, pela janela LARGA do engenheiro (30 linhas
//   antes, 2 depois): 'acerto30', 'religa30'; se não, 'sem'. Todo retrocesso não 'acerto3' e todo retrocesso depois da
//   1ª zerésima do dia ficam com as linhas vizinhas;
// - acerto de relógio depois da zerésima: QUALQUER linha de data e hora (qualquer data, qualquer seção declarada)
//   fisicamente depois da 1ª zerésima do dia no fluxo.
// Período do turno: 1º turno, o diário inteiro; 2º turno, depois da última linha datada de 04/10/2026 do fluxo.
//
// Uso: node scripts/auditoria/cetico-47-varredura.mjs --turno 2 [--uf ac,df] [--secoes ba/39934/0183/0175,...]
// Saída: data/parsed/auditoria/cetico-revisor/47/<t>t/<uf>.jsonl (uma linha por seção).
// Nenhum título de eleitor ou de mesário é gravado: sequências de 8 ou mais dígitos viram '#'.
import { existsSync } from 'node:fs';
import { mkdir, open, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, uf: { type: 'string' }, secoes: { type: 'string' }, saida: { type: 'string' } } });
const TURNO = values.turno;
const DIA = { 1: '04/10/2026', 2: '25/10/2026' }[TURNO];
const BASE = path.join(DIR_DADOS, 'raw', `${TURNO}t`, 'urnas');
const SAIDA = path.resolve(values.saida ?? path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '47', `${TURNO}t`));
const MAX_EX = 12;

const dirs = async (d) => (await readdir(d, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
const emMemoria = (buf) => ({ read: async (dest, off, n, pos) => ({ bytesRead: buf.copy(dest, off, pos, pos + n) }), stat: async () => ({ size: buf.length }) });
const limpa = (s) => s.replace(/\d{8,}/g, '#').slice(0, 140);

async function logsDoPacote(handle, nivel, saida) {
  for (const e of await listarEntradas(handle)) {
    if (e.nome === 'logd.dat') saida.push({ nivel, texto: (await lerEntrada(handle, e)).toString('latin1') });
    else if (e.nome.endsWith('.jez') && nivel < 5) await logsDoPacote(emMemoria(await lerEntrada(handle, e)), nivel + 1, saida);
  }
  return saida;
}

/** Segundos absolutos do relógio da urna (UTC fictício) ou NaN. */
const abs = (l) => Date.UTC(+l.slice(6, 10), +l.slice(3, 5) - 1, +l.slice(0, 2), +l.slice(11, 13), +l.slice(14, 16), +l.slice(17, 19)) / 1000;
const datado = (l) => l.length >= 19 && l[2] === '/' && l[5] === '/' && l[10] === ' ' && l[13] === ':';
const [dd, mm, aa] = DIA.split('/');
const BASE_DIA = Date.UTC(+aa, +mm - 1, +dd) / 1000;

const ACERTO = (app, m) => app === 'ADH' || /^data e hora (atualizada|que foi digitada|solicitadas)|ajuste de data e hora|hor[aá]rio da urna alterado/i.test(m);
// qualquer outra mensagem que fale de hora (para não depender só da lista acima); a data de geração da mídia é só informativa
const HORA_OUTRA = (m) => /data e hora|hor[aá]rio|rel[oó]gio/i.test(m) && !m.startsWith('Data e hora da geração da mídia');
const RELIGA = (m) => m.startsWith('Urna ligada em') || m === 'Início das operações do logd' || m.startsWith('Iniciando registro do log') || m === 'Fechando o arquivo de Log';
const COMPUTADO = 'O voto do eleitor foi computado';

function medirFluxo(linhas) {
  // linhas: strings já sem '\r', só deste fluxo, deduplicadas, do período do turno
  const L = [];
  for (const l of linhas) {
    if (!datado(l)) continue;
    const c = l.split('\t');
    L.push({ t: abs(l), dia: l.startsWith(DIA), data: l.slice(0, 10), app: c[3] ?? '', m: c[4] ?? '' });
  }
  const f = {
    n: L.length, contingencia: false, primeiraDoDia: null,
    zer: null, nZer: 0, pronta: null, nPronta: 0, v1: null, vN: null, nV: 0, enc: null, bu: null, ligada: null,
    vOutraData: 0, vOutraDataNoMeio: 0, vOutraSecao: 0, linhasOutraSecao: 0,
    hora: new Array(24).fill(0), recusas: 0, recusa1: null,
    ord: { vAntesZerF: 0, vAntesZerR: 0, vAntesProntaF: 0, vAntesProntaR: 0, vDepoisEncF: 0, vDepoisEncR: 0, vDepoisBuF: 0, vDepoisBuR: 0,
      zerDepoisProntaF: 0, zerDepoisProntaR: 0, buAntesEncF: 0, vVoltaR: 0 },
    ret: { acerto3: 0, religa3: 0, acerto30: 0, religa30: 0, sem: 0 }, retDia: { acerto3: 0, religa3: 0, acerto30: 0, religa30: 0, sem: 0 },
    retJanela: { antesZer: 0, zerPronta: 0, votacao: 0, depoisEnc: 0 }, exRet: [],
    acertosDepoisZer: 0, exAcerto: [], horaOutraDepoisZer: 0, exHoraOutra: [], declaradas: [],
  };
  let declarada = null;
  const votos = []; // [t, i]
  let iPrimDia = -1, iUltDia = -1;
  for (let i = 0; i < L.length; i++) {
    const x = L[i];
    if (x.m.startsWith('Seção Eleitoral: ')) {
      declarada = x.m.slice(17).trim().padStart(4, '0');
      if (x.dia && !f.declaradas.includes(declarada) && f.declaradas.length < 6) f.declaradas.push(declarada);
    }
    if (x.dia) { if (iPrimDia < 0) iPrimDia = i; iUltDia = i; }
    x.decl = declarada;
  }
  f.primeiraDoDia = iPrimDia;
  return { L, f, votos, iPrimDia, iUltDia };
}

function eventos(ctx, secao) {
  const { L, f, votos, iPrimDia, iUltDia } = ctx;
  const ev = (i) => [L[i].t - BASE_DIA, i];
  for (let i = 0; i < L.length; i++) {
    const x = L[i];
    const daSecao = x.decl === null || x.decl === secao;
    if (x.m === COMPUTADO) {
      if (!daSecao) { f.vOutraSecao++; continue; }
      if (!x.dia) { f.vOutraData++; if (i > iPrimDia && i < iUltDia) f.vOutraDataNoMeio++; continue; }
      f.nV++; votos.push(ev(i));
      const h = Math.floor((x.t - BASE_DIA) / 3600);
      if (h >= 0 && h < 24) f.hora[h]++;
      continue;
    }
    if (!x.dia) continue;
    if (/contingência/.test(x.m)) f.contingencia = true;
    if (!daSecao) { f.linhasOutraSecao++; continue; }
    if (x.m.startsWith('Imprimindo relatório [ZERÉSIMA]')) { f.nZer++; f.zer ??= ev(i); }
    else if (x.m === 'Urna pronta para receber votos') { f.nPronta++; f.pronta ??= ev(i); }
    else if (x.m === 'Procedimento de encerramento confirmado') f.enc ??= ev(i);
    else if (x.m === 'Gerando relatório [BU] [INÍCIO]') f.bu ??= ev(i);
    else if (x.m.startsWith('Urna ligada em')) f.ligada ??= ev(i);
    else if (x.m.startsWith('Encerramento só pode ser solicitado')) { f.recusas++; f.recusa1 ??= ev(i); }
  }
  if (votos.length) { f.v1 = votos[0]; f.vN = votos[votos.length - 1]; }
  const o = f.ord;
  let ant = null;
  for (const v of votos) {
    if (f.zer) { if (v[1] < f.zer[1]) o.vAntesZerF++; if (v[0] < f.zer[0]) o.vAntesZerR++; }
    if (f.pronta) { if (v[1] < f.pronta[1]) o.vAntesProntaF++; if (v[0] < f.pronta[0]) o.vAntesProntaR++; }
    if (f.enc) { if (v[1] > f.enc[1]) o.vDepoisEncF++; if (v[0] > f.enc[0]) o.vDepoisEncR++; }
    if (f.bu) { if (v[1] > f.bu[1]) o.vDepoisBuF++; if (v[0] > f.bu[0]) o.vDepoisBuR++; }
    if (ant && v[0] < ant[0]) o.vVoltaR++;
    ant = v;
  }
  if (f.zer && f.pronta) { o.zerDepoisProntaF = +(f.zer[1] > f.pronta[1]); o.zerDepoisProntaR = +(f.zer[0] > f.pronta[0]); }
  if (f.bu && f.enc) o.buAntesEncF = +(f.bu[1] < f.enc[1]);
  // retrocessos
  const temAcerto = (de, ate) => { for (let j = Math.max(0, de); j <= Math.min(L.length - 1, ate); j++) if (ACERTO(L[j].app, L[j].m)) return true; return false; };
  const temReliga = (de, ate) => { for (let j = Math.max(0, de); j <= Math.min(L.length - 1, ate); j++) if (RELIGA(L[j].m)) return true; return false; };
  const zerI = f.zer ? f.zer[1] : Infinity, proI = f.pronta ? f.pronta[1] : Infinity, encI = f.enc ? f.enc[1] : (f.vN ? f.vN[1] : Infinity);
  for (let i = 1; i < L.length; i++) {
    const dt = L[i].t - L[i - 1].t;
    if (!(dt < 0)) continue;
    const classe = temAcerto(i - 3, i + 3) ? 'acerto3' : temReliga(i - 3, i) ? 'religa3' : temAcerto(i - 30, i + 2) ? 'acerto30' : temReliga(i - 30, i) ? 'religa30' : 'sem';
    f.ret[classe]++;
    const noDia = L[i].dia || L[i - 1].dia;
    if (noDia) f.retDia[classe]++;
    const jan = i <= zerI ? 'antesZer' : i <= proI ? 'zerPronta' : i <= encI ? 'votacao' : 'depoisEnc';
    if (Number.isFinite(zerI) || Number.isFinite(proI)) f.retJanela[jan]++;
    if ((classe !== 'acerto3' || (jan !== 'antesZer' && noDia)) && f.exRet.length < MAX_EX) {
      const viz = [];
      for (let j = Math.max(0, i - 3); j <= Math.min(L.length - 1, i + 2); j++) viz.push(`${new Date(L[j].t * 1000).toISOString().slice(0, 19)} ${L[j].app} ${limpa(L[j].m)}`);
      f.exRet.push({ classe, dt, noDia, jan, i, viz });
    }
  }
  // acertos de relógio depois da 1ª zerésima do dia (qualquer data, qualquer seção)
  if (f.zer) {
    for (let i = f.zer[1] + 1; i < L.length; i++) {
      if (ACERTO(L[i].app, L[i].m)) {
        f.acertosDepoisZer++;
        if (f.exAcerto.length < MAX_EX) f.exAcerto.push(`${i} ${new Date(L[i].t * 1000).toISOString().slice(0, 19)} ${L[i].app} ${limpa(L[i].m)}`);
      } else if (HORA_OUTRA(L[i].m)) {
        f.horaOutraDepoisZer++;
        if (f.exHoraOutra.length < 4) f.exHoraOutra.push(`${i} ${new Date(L[i].t * 1000).toISOString().slice(0, 19)} ${L[i].app} ${limpa(L[i].m)}`);
      }
    }
  }
  delete f.primeiraDoDia;
  return f;
}

async function lerSecao(uf, m, z, s) {
  const dirSecao = path.join(BASE, uf, m, z, s);
  const sec = { uf, municipio: m, zona: z, secao: s, pacotes: 0, textos: 0, semLog: 0, fluxos: [] };
  const porUrna = new Map(); // urna → [{nivel, linhas}]
  const vistos = new Set();
  for (const pac of await dirs(dirSecao)) {
    sec.pacotes++;
    const nomes = await readdir(path.join(dirSecao, pac));
    const arq = acharArquivo(nomes, 'log');
    if (!arq) { sec.semLog++; continue; }
    const h = await open(path.join(dirSecao, pac, arq));
    let textos;
    try { textos = await logsDoPacote(h, 0, []); } finally { await h.close(); }
    for (const { nivel, texto } of textos) {
      if (vistos.has(texto)) continue;
      vistos.add(texto);
      sec.textos++;
      const local = new Map();
      for (const bruta of texto.split('\n')) {
        const l = bruta.endsWith('\r') ? bruta.slice(0, -1) : bruta;
        const t1 = l.indexOf('\t'), t2 = t1 < 0 ? -1 : l.indexOf('\t', t1 + 1), t3 = t2 < 0 ? -1 : l.indexOf('\t', t2 + 1);
        if (t3 < 0) continue;
        const urna = l.slice(t2 + 1, t3);
        if (!local.has(urna)) local.set(urna, []);
        local.get(urna).push(l);
      }
      for (const [urna, ls] of local) {
        // período do turno
        let ini = 0;
        if (TURNO === '2') for (let i = 0; i < ls.length; i++) if (ls[i].startsWith('04/10/2026')) ini = i + 1;
        const per = ini ? ls.slice(ini) : ls;
        if (!porUrna.has(urna)) porUrna.set(urna, []);
        porUrna.get(urna).push({ nivel, linhas: per });
      }
    }
  }
  const votosDia = (ls) => { let n = 0; for (const l of ls) if (l.startsWith(DIA) && l.includes(`\t${COMPUTADO}`)) n++; return n; };
  for (const [urna, copias] of porUrna) {
    for (const c of copias) c.v = votosDia(c.linhas);
    copias.sort((a, b) => b.v - a.v || b.linhas.length - a.linhas.length);
    const esc = copias[0];
    if (!esc.linhas.length) continue;
    const vistas = new Set();
    const ded = [];
    for (const l of esc.linhas) { if (vistas.has(l)) continue; vistas.add(l); ded.push(l); }
    const ctx = medirFluxo(ded);
    const f = eventos(ctx, s);
    // votos do dia em outras cópias que não estão na escolhida
    // cada outra cópia com voto do dia que a escolhida não tem é testada na própria ordem física (as cópias não se
    // misturam: cada uma é um arquivo gravado em ordem)
    let fora = 0;
    const outras = [];
    for (const c of copias.slice(1)) {
      let novos = 0;
      for (const l of c.linhas) if (l.startsWith(DIA) && l.includes(`\t${COMPUTADO}`) && !vistas.has(l)) novos++;
      if (!novos) continue;
      fora += novos;
      const v2 = new Set();
      const d2 = [];
      for (const l of c.linhas) { if (v2.has(l)) continue; v2.add(l); d2.push(l); }
      const g = eventos(medirFluxo(d2), s);
      outras.push({ nivel: c.nivel, novos, nV: g.nV, zer: g.zer, pronta: g.pronta, enc: g.enc, bu: g.bu, v1: g.v1, vN: g.vN, contingencia: g.contingencia,
        ord: g.ord, retJanela: g.retJanela, acertosDepoisZer: g.acertosDepoisZer, declaradas: g.declaradas, vOutraSecao: g.vOutraSecao });
    }
    sec.fluxos.push({ urna, nivel: esc.nivel, copias: copias.length, vForaDaCopia: fora, outrasCopias: outras, ...f });
  }
  return sec;
}

await mkdir(SAIDA, { recursive: true });
const inicio = Date.now();
if (values.secoes) {
  const linhas = [];
  for (const id of values.secoes.split(',')) linhas.push(JSON.stringify(await lerSecao(...id.split('/'))));
  await writeFile(path.join(SAIDA, 'selecao.jsonl'), `${linhas.join('\n')}\n`);
  console.log(linhas.join('\n'));
} else {
  let total = 0;
  for (const uf of values.uf ? values.uf.split(',') : UFS) {
    const alvo = path.join(SAIDA, `${uf}.jsonl`);
    if (existsSync(alvo)) { console.log(`${uf}: já feito`); continue; }
    const linhas = [];
    let erros = 0;
    for (const m of await dirs(path.join(BASE, uf))) for (const z of await dirs(path.join(BASE, uf, m))) for (const s of await dirs(path.join(BASE, uf, m, z))) {
      try { linhas.push(JSON.stringify(await lerSecao(uf, m, z, s))); } catch (e) { erros++; linhas.push(JSON.stringify({ uf, municipio: m, zona: z, secao: s, erro: e.message })); }
    }
    await writeFile(`${alvo}.tmp`, `${linhas.join('\n')}\n`);
    await rename(`${alvo}.tmp`, alvo);
    total += linhas.length;
    console.log(`${uf}: ${linhas.length} seções, ${erros} erro(s) · ${((Date.now() - inicio) / 60000).toFixed(1)} min`);
  }
  console.log(`FIM turno ${TURNO}: ${total} seções novas, ${((Date.now() - inicio) / 60000).toFixed(1)} min`);
}
