// Engenheiro de segurança, fechamento das hipóteses H04, H09 e H20 (docs/analysis/engenheiro-seguranca-urna/13).
// Segundo programa, escrito do zero, que lê TODOS os pacotes de urna de um turno (universo completo) numa só passada:
//
//   H04  inicializações (boots) e etapas de "Verificação de assinatura" em cada uma. A DEFINIÇÃO é a do primeiro
//        programa (seguranca-varrer-logs.mjs + seguranca-etapas-versao.mjs, doc 04); o código é outro:
//          - texto = cada entrada .dat do log.jez, inclusive dentro de .jez aninhado (até 3 níveis);
//          - boot novo em "Início das operações do logd"; em "Urna ligada em" se o boot corrente já iniciou aplicação;
//            e quando "Verificação de assinatura - Etapa [1] " reaparece num boot que já tem etapa;
//          - boot que "alcança o dia" = tem linha datada do dia da votação do turno ou de data posterior em 2026;
//          - boot de votação = no dia, "Urna pronta para receber votos" ou "O voto do eleitor foi computado";
//          - etapa = "Verificação de assinatura - Etapa [n] - [arquivo] - [resultado]"; não-sucesso = sem "[SUCESSO]".
//        Pacotes repetidos na mesma seção (mesmo .vsc) contam uma vez, como no primeiro programa.
//   H09a busca de número de título em formas codificadas. Sondas = os números com formato de título (12 dígitos com DV
//        válido, ou 10/11 dígitos completados com zeros) que o próprio diário do pacote publica em claro (mesário,
//        servidor, encerramento, suspensão). Cada sonda vira ~45 formas (texto invertido, pares trocados, hex, base64,
//        BCD, inteiro de 5 e 8 bytes, UTF-16, hex do ASCII, MD5/SHA-1/SHA-256/SHA-512 em bytes, hex e base64, inteiros e
//        truncados a 64 bits) procuradas em todos os bytes do pacote: BU, BU impresso, RDV, .vsc, o .jez bruto e cada
//        entrada descomprimida do .jez. No diário, as formas em claro (decimal) são o controle positivo, não achado.
//        Controle negativo: sondas-isca (título válido com a mesma UF e sequência sorteada, semente fixa por pacote).
//        Controle positivo sintético: as formas da 1ª sonda de cada zona coladas num buffer têm de ser todas achadas.
//   H09b estrutura da mensagem "Título N é válido / inválido para suspender a votação" no dia: papel do número no pacote,
//        sessão de eleitor em que aparece, tipo de identificação da sessão, da anterior e da seguinte, repetição do
//        número entre sessões, mesário eleitor da seção recusado × aceito, distância de digitação, código de UF.
//
// REGRA ABSOLUTA: nenhum número com formato de título ou de CPF sai deste programa. Os números ficam só na memória do
// worker. A saída tem contagens agregadas e endereço de seção; a trava final (`semNumeros`) aborta se achar 10 a 12
// dígitos seguidos no JSON.
//
// Uso: node scripts/auditoria/seguranca-fechamento-varredura.mjs --turno 2 [--uf ac,rr] [--workers 4] [--refazer]
// Saída: data/parsed/auditoria/engenheiro-seguranca-urna/fechamento/<t>t/<uf>.json e resumo-<t>t.json
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const DIA_YMD = { 1: 20261004, 2: 20261025 };
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'engenheiro-seguranca-urna', 'fechamento');
const COD_UF = { sp: 1, mg: 2, rj: 3, rs: 4, ba: 5, pr: 6, ce: 7, pe: 8, sc: 9, go: 10, ma: 11, pb: 12, pa: 13, es: 14, pi: 15, rn: 16, al: 17, mt: 18, ms: 19, df: 20, se: 21, am: 22, ro: 23, ac: 24, ap: 25, rr: 26, to: 27, zz: 28 };

// ---------------------------------------------------------------- utilidades comuns
const add = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };
function somar(dst, src) {
  for (const [k, v] of Object.entries(src)) {
    if (typeof v === 'number') dst[k] = (dst[k] ?? 0) + v;
    else if (Array.isArray(v)) (dst[k] ??= []).push(...v);
    else if (v && typeof v === 'object') somar((dst[k] ??= {}), v);
  }
  return dst;
}

/** DV de título (12 dígitos): sequência 1–8 com pesos 2..9; UF 01–28; DV2 sobre UF (7, 8) e DV1 (9); resto 10 → 0; SP/MG resto 0 → 1. */
function dvTitulo(s) {
  if (s.length !== 12) return false;
  let soma = 0;
  for (let i = 0; i < 8; i++) soma += (s.charCodeAt(i) - 48) * (i + 2);
  const u1 = s.charCodeAt(8) - 48, u2 = s.charCodeAt(9) - 48, uf = u1 * 10 + u2;
  if (uf < 1 || uf > 28) return false;
  const fix = (r) => (r === 10 ? 0 : (r === 0 && uf <= 2 ? 1 : r));
  const d1 = fix(soma % 11);
  if (d1 !== s.charCodeAt(10) - 48) return false;
  return fix((u1 * 7 + u2 * 8 + d1 * 9) % 11) === s.charCodeAt(11) - 48;
}

/** Trava de saída: nenhum trecho de 10 a 12 dígitos seguidos pode sair (título ou CPF). */
function semNumeros(obj) {
  // Contagens numéricas passam (são números do JSON); chaves e textos não podem ter 10 a 12 dígitos seguidos.
  const re = /(?<!\d)\d{10,12}(?!\d)/;
  return JSON.stringify(obj, (k, v) => {
    if (re.test(k) || (typeof v === 'string' && re.test(v))) throw new Error('trava: sequência de 10 a 12 dígitos num texto da saída; nada foi gravado');
    return v;
  });
}

// ---------------------------------------------------------------- H04: boots e etapas (código próprio)
const RE_ETAPA_LINHA = /^Verificação de assinatura - Etapa \[(\d+)\] - \[([^\]]*)\] - \[([^\]]*)\]/;

/** Coluna `k` (0 = data-hora) de uma linha separada por tabulações, sem split. */
function colunas(linha) {
  const t1 = linha.indexOf('\t');
  if (t1 < 0) return null;
  const t2 = linha.indexOf('\t', t1 + 1);
  if (t2 < 0) return null;
  const t3 = linha.indexOf('\t', t2 + 1);
  if (t3 < 0) return null;
  const t4 = linha.indexOf('\t', t3 + 1);
  const dh = linha.slice(0, t1);
  const urna = linha.slice(t2 + 1, t3);
  const app = t4 < 0 ? linha.slice(t3 + 1) : linha.slice(t3 + 1, t4);
  let msg = '';
  if (t4 >= 0) {
    const t5 = linha.indexOf('\t', t4 + 1);
    msg = t5 < 0 ? linha.slice(t4 + 1) : linha.slice(t4 + 1, t5);
  }
  return { dh, urna, app, msg };
}

const DIG = (c) => c >= 48 && c <= 57;
/** "dd/mm/aaaa hh:mm:ss" exato → aaaammdd; senão -1. */
function ymdDe(dh) {
  if (dh.length !== 19) return -1;
  for (const i of [0, 1, 3, 4, 6, 7, 8, 9, 11, 12, 14, 15, 17, 18]) if (!DIG(dh.charCodeAt(i))) return -1;
  if (dh[2] !== '/' || dh[5] !== '/' || dh[10] !== ' ' || dh[13] !== ':' || dh[16] !== ':') return -1;
  return +dh.slice(6, 10) * 10000 + +dh.slice(3, 5) * 100 + +dh.slice(0, 2);
}

// ---------------------------------------------------------------- H09a: formas codificadas de um número
const ALGS = ['md5', 'sha1', 'sha256', 'sha512'];
const inverte = (s) => [...s].reverse().join('');
const trocaPares = (s) => s.replace(/(\d)(\d)/g, '$2$1');
function bcd(d, trocado) {
  const b = Buffer.alloc(d.length / 2);
  for (let i = 0; i < d.length; i += 2) {
    const a = d.charCodeAt(i) - 48, c = d.charCodeAt(i + 1) - 48;
    b[i / 2] = trocado ? (c << 4) | a : (a << 4) | c;
  }
  return b;
}

/** [nome, Buffer] de cada forma do número de 12 dígitos `d`. `claro` marca as formas decimais em claro (texto). */
function formas(d) {
  const s = d.replace(/^0+/, '') || '0';
  const n = BigInt(d);
  const be8 = Buffer.alloc(8); be8.writeBigUInt64BE(n);
  const le8 = Buffer.alloc(8); le8.writeBigUInt64LE(n);
  const be5 = be8.subarray(3), le5 = le8.subarray(0, 5);
  const minBe = be8.subarray(be8.findIndex((x) => x !== 0));
  const hex = n.toString(16);
  const L = [];
  const t = (nome, txt, claro = false) => L.push({ nome, buf: Buffer.from(txt, 'latin1'), claro });
  t('dec12', d, true); t('decSemZeros', s, true); t('decAgrupado', d.replace(/(\d{4})(?=\d)/g, '$1 '), true);
  t('decInvertido', inverte(d)); t('decSemZerosInvertido', inverte(s)); t('decParesTrocados', trocaPares(d));
  t('hexInt', hex); t('HEXInt', hex.toUpperCase()); t('hexInt10', hex.padStart(10, '0')); t('HEXInt10', hex.padStart(10, '0').toUpperCase());
  t('b64Ascii', Buffer.from(d).toString('base64')); t('b64AsciiSemZeros', Buffer.from(s).toString('base64'));
  t('b64Int5', be5.toString('base64')); t('b64Bcd', bcd(d).toString('base64'));
  t('hexAscii', Buffer.from(d).toString('hex')); t('HEXAscii', Buffer.from(d).toString('hex').toUpperCase());
  L.push({ nome: 'utf16le', buf: Buffer.from(d, 'utf16le') }, { nome: 'utf16be', buf: Buffer.from(d, 'utf16le').swap16() });
  L.push({ nome: 'utf16leSemZeros', buf: Buffer.from(s, 'utf16le') });
  L.push({ nome: 'bcd', buf: bcd(d) }, { nome: 'bcdTrocado', buf: bcd(d, true) });
  L.push({ nome: 'int5be', buf: be5 }, { nome: 'int5le', buf: le5 }, { nome: 'int8be', buf: be8 }, { nome: 'int8le', buf: le8 });
  if (minBe.length >= 4 && minBe.length < 5) L.push({ nome: 'intMinBe', buf: minBe });
  for (const [rot, txt] of [['12', d], ['sz', s]]) {
    for (const a of ALGS) {
      const h = createHash(a).update(txt).digest();
      const hx = h.toString('hex');
      L.push({ nome: `${a}(${rot}):bytes8`, buf: h.subarray(0, 8) });
      L.push({ nome: `${a}(${rot}):bytes8fim`, buf: h.subarray(h.length - 8) });
      t(`${a}(${rot}):hex16`, hx.slice(0, 16)); t(`${a}(${rot}):HEX16`, hx.slice(0, 16).toUpperCase());
      t(`${a}(${rot}):hex16fim`, hx.slice(-16)); t(`${a}(${rot}):HEX16fim`, hx.slice(-16).toUpperCase());
      t(`${a}(${rot}):b64`, h.toString('base64').slice(0, 12));
    }
  }
  return L;
}

/** Título-isca determinístico com a mesma "forma" da sonda: mesma UF e o mesmo número de zeros à esquerda (as formas
 *  binárias e hexadecimais de um número pequeno têm menos entropia), sequência sorteada (LCG com semente), DV calculado. */
function isca(sonda, semente) {
  let x = semente >>> 0;
  const rnd = () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x >>> 8; };
  const zeros = Math.min(sonda.slice(0, 8).match(/^0*/)[0].length, 7);
  for (;;) {
    let seq = '0'.repeat(zeros) + String(1 + (rnd() % 9));
    while (seq.length < 8) seq += String(rnd() % 10);
    const uf = sonda.slice(8, 10);
    for (let d1 = 0; d1 < 10; d1++) for (let d2 = 0; d2 < 10; d2++) {
      const c = `${seq}${uf}${d1}${d2}`;
      if (dvTitulo(c)) return c;
    }
  }
}

/** Índice de agulhas por prefixo de 4 bytes + filtro de 24 bits. */
class Indice {
  constructor() { this.bits = new Uint8Array(1 << 21); this.mapa = new Map(); this.marcados = []; }
  limpar() { for (const k of this.marcados) this.bits[k >> 3] = 0; this.marcados = []; this.mapa.clear(); }
  por(agulha) {
    const b = agulha.buf;
    if (b.length < 4) return;
    const k24 = b[0] | (b[1] << 8) | (b[2] << 16);
    if (!(this.bits[k24 >> 3] & (1 << (k24 & 7)))) { this.bits[k24 >> 3] |= 1 << (k24 & 7); this.marcados.push(k24); }
    const k32 = (k24 | (b[3] << 24)) >>> 0;
    let l = this.mapa.get(k32);
    if (!l) this.mapa.set(k32, (l = []));
    l.push(agulha);
  }
  /** Chama f(agulha, posição) para cada ocorrência. */
  varrer(buf, f) {
    const n = buf.length - 3;
    const bits = this.bits;
    for (let i = 0; i < n; i++) {
      const k24 = buf[i] | (buf[i + 1] << 8) | (buf[i + 2] << 16);
      if (!(bits[k24 >> 3] & (1 << (k24 & 7)))) continue;
      const l = this.mapa.get((k24 | (buf[i + 3] << 24)) >>> 0);
      if (!l) continue;
      for (const a of l) {
        const b = a.buf;
        if (i + b.length > buf.length) continue;
        let ok = true;
        for (let j = 4; j < b.length; j++) if (buf[i + j] !== b[j]) { ok = false; break; }
        if (ok) f(a, i);
      }
    }
  }
}

// ---------------------------------------------------------------- leitura do pacote
const mem = (b) => ({ read: async (d, o, n, p) => ({ bytesRead: b.copy(d, o, p, p + n) }), stat: async () => ({ size: b.length }) });
/** Entradas do .jez, recursivo: [{ caminho, dados, prof, ehLog }]. */
async function entradas(buf, prof = 0, prefixo = '') {
  const out = [];
  for (const e of await listarEntradas(mem(buf))) {
    const d = await lerEntrada(mem(buf), e);
    const caminho = `${prefixo}${e.nome.replace(/\d{8,}/g, '#')}`;
    out.push({ caminho, dados: d, prof, ehLog: e.nome.endsWith('.dat') });
    if (e.nome.endsWith('.jez') && prof < 3) out.push(...(await entradas(d, prof + 1, `${caminho}/`)));
  }
  return out;
}

const TIPO_ARQ = (nome) => (nome.endsWith('-vota.vsc') || nome.endsWith('-sa.vsc') ? 'vsc'
  : nome.endsWith('-bu.dat') || nome.endsWith('-busa.dat') ? 'bu'
    : nome.endsWith('-imgbu.dat') || nome.endsWith('-imgbusa.dat') ? 'imgbu'
      : nome.endsWith('-rdv.dat') ? 'rdv'
        : nome.endsWith('-log.jez') || nome.endsWith('-logsa.jez') ? 'log' : 'outro');

// Mensagens com número de pessoa (papéis)
const RE_NUM = /(?<!\d)\d{10,12}(?!\d)/g;
function papelDe(msg) {
  if (msg.startsWith('Título digitado para encerramento')) return 'enc';
  if (msg.includes('gerada pelo usuário') || msg.includes('gerada pelo usuario') || msg.startsWith('MR gerada pelo usuário')) return 'oper';
  if (msg.startsWith('Título ') && msg.includes('para suspender a votação')) return msg.includes('inválido') ? 'suspI' : 'suspV';
  if (msg.includes('esário')) return 'mes';
  return null;
}

/** Processa um pacote. Devolve contagens. */
async function processarPacote(dir, id, uf, turno, idx, acc, ctx) {
  const nomes = await readdir(dir);
  const arqs = [];
  for (const nome of nomes) {
    const tipo = TIPO_ARQ(nome);
    if (tipo === 'outro') continue;
    arqs.push({ nome, tipo, dados: await readFile(path.join(dir, nome)) });
  }
  const vsc = arqs.find((a) => a.tipo === 'vsc');
  const log = arqs.find((a) => a.tipo === 'log');
  if (!vsc || !log) { add(acc.geral, 'pastasSemVscOuLog'); return; }
  const hv = createHash('sha256').update(vsc.dados).digest('hex');
  if (ctx.vscVistos.has(hv)) { add(acc.geral, 'pacotesRepetidos'); return; }
  ctx.vscVistos.add(hv);
  add(acc.geral, 'pacotes');
  if (log.nome.endsWith('-logsa.jez')) add(acc.geral, 'pacotesSA');

  let ents;
  try { ents = await entradas(log.dados); } catch (erro) { add(acc.geral, 'jezIlegivel'); return; }
  const textos = ents.filter((e) => e.ehLog);
  add(acc.geral, 'textosDeLog', textos.length);

  const dia = DIA_YMD[turno];
  // ---- passada única nas linhas de cada texto
  const sondas = new Map(); // número → Set(papel)
  const mesarios = new Set(), mesEleitor = new Set(), encerr = new Set(), oper = new Set();
  const porTextoUrna = []; // { urna, sessoes[] } por (texto, urna)
  for (const tx of textos) {
    const txt = tx.dados.toString('latin1');
    // H04
    let boot = null;
    const fechar = () => {
      if (boot && boot.chega) {
        const vot = boot.pronta || boot.votos > 0;
        add(acc.h04, 'bootsDia');
        if (boot.ruins > 0) add(acc.h04, 'bootsDiaComEtapaNaoSucesso');
        if (vot) {
          add(acc.h04, 'bootsVotacao');
          add(acc.h04.etapasPorBootVotacao, String(boot.et.length));
          add(acc.h04.etapasPorBootVotacaoModelo, `${boot.modelo ?? '?'}|${boot.et.length}`);
          if (boot.et.length === 0) add(acc.h04, 'bootsVotacaoSemEtapa');
          if (boot.ruins > 0) add(acc.h04, 'bootsVotacaoComEtapaNaoSucesso');
          add(acc.h04, 'votosEmBootsVotacao', boot.votos);
        }
        // assinatura da sequência de etapas em letras (a–p), para não gerar texto só de dígitos na saída
        const assin = boot.et.length ? createHash('sha1').update(boot.et.join('|')).digest('hex').slice(0, 12).replace(/[0-9a-f]/g, (x) => String.fromCharCode(97 + parseInt(x, 16))) : '-';
        acc.h04boots.push([id, tx.prof, `${uf}:${boot.modelo ?? '?'}`, assin, vot ? 1 : 0, boot.votos, boot.et.length, boot.ruins]);
        if (assin !== '-' && !ctx.dicEtapas.has(assin)) ctx.dicEtapas.set(assin, boot.et.map((e) => e.split(':').slice(1).join(':')));
      }
      boot = null;
    };
    const abrir = () => { fechar(); boot = { chega: false, apps: 0, et: [], ruins: 0, pronta: false, votos: 0, modelo: null }; };
    // H09b, por urna
    const estado = new Map(); // urna → { sessoes, cur }
    let p = 0;
    const N = txt.length;
    while (p < N) {
      let q = txt.indexOf('\n', p);
      if (q < 0) q = N;
      const linha = txt.charCodeAt(q - 1) === 13 ? txt.slice(p, q - 1) : txt.slice(p, q);
      p = q + 1;
      if (linha.length < 20 || linha.charCodeAt(2) !== 47) continue;
      const c = colunas(linha);
      if (!c) { add(acc.geral, 'linhasMalformadas'); continue; }
      const ymd = ymdDe(c.dh);
      if (ymd < 0) { add(acc.geral, 'linhasMalformadas'); continue; }
      add(acc.geral, 'linhas');
      const { app, msg } = c;
      // ---- H04
      if (app === 'LOGD' && (msg.startsWith('Início das operações do logd') || (msg.startsWith('Urna ligada em') && boot && boot.apps > 0))) abrir();
      else if (boot && app === 'GAP' && boot.et.length > 0 && msg.startsWith('Verificação de assinatura - Etapa [1] ')) abrir();
      if (!boot) abrir();
      if (ymd === dia || (ymd > dia && ymd < 20270000)) boot.chega = true;
      if (msg.startsWith('Iniciando aplicação')) boot.apps++;
      else if (msg.startsWith('Verificação de assinatura')) {
        const m = RE_ETAPA_LINHA.exec(msg);
        if (m) {
          boot.et.push(`${m[1]}:${m[2].replace(/\d+/g, '#')}:${m[3]}`);
          if (!msg.endsWith('[SUCESSO]')) boot.ruins++;
        }
      } else if (msg.startsWith('Identificação do Modelo de Urna: ')) boot.modelo = msg.slice(33).trim();
      else if (ymd === dia && msg.startsWith('Urna pronta para receber votos')) boot.pronta = true;
      else if (ymd === dia && msg === 'O voto do eleitor foi computado') boot.votos++;

      // ---- números de pessoa (todas as datas): sondas e papéis
      const papel = papelDe(msg);
      if (papel) {
        RE_NUM.lastIndex = 0;
        for (let m; (m = RE_NUM.exec(msg));) {
          const d12 = m[0].padStart(12, '0');
          const dv = dvTitulo(d12);
          if (dv) {
            let s = sondas.get(d12);
            if (!s) sondas.set(d12, (s = new Set()));
            s.add(papel);
            if (papel === 'mes') {
              mesarios.add(d12);
              if (msg.includes('é eleitor da seção')) mesEleitor.add(d12);
            } else if (papel === 'enc') encerr.add(d12);
            else if (papel === 'oper') oper.add(d12);
          }
          if (ymd === dia && (papel === 'suspV' || papel === 'suspI')) {
            let st = estado.get(c.urna);
            if (!st) estado.set(c.urna, (st = { sessoes: [], cur: null }));
            const e = { n: d12, v: papel === 'suspV', dv, len: m[0].length };
            if (st.cur) st.cur.susp.push(e); else add(acc.h09b, 'suspensaoForaDeSessao');
          }
        }
      }
      // ---- H09b: sessões de eleitor no dia
      if (ymd === dia && app === 'VOTA') {
        if (msg === 'Identificador do eleitor digitado pelo mesário') {
          let st = estado.get(c.urna);
          if (!st) estado.set(c.urna, (st = { sessoes: [], cur: null }));
          st.cur = { tipo: '?', susp: [], comp: false, suspenso: false, nulo: false, hab: false };
          st.sessoes.push(st.cur);
        } else if (msg.startsWith('Identificador digitado pelo mesário foi: ')) {
          const st = estado.get(c.urna);
          if (st?.cur) st.cur.tipo = msg.includes('(CPF)') ? 'C' : msg.includes('Título') ? 'T' : 'O';
        } else if (msg === 'O voto do eleitor foi computado') { const st = estado.get(c.urna); if (st?.cur) { st.cur.comp = true; st.cur = null; } }
        else if (msg === 'Eleitor foi suspenso pelo mesário') { const st = estado.get(c.urna); if (st?.cur) st.cur.suspenso = true; }
        else if (msg.startsWith('Atribuido voto nulo por suspensão')) { const st = estado.get(c.urna); if (st?.cur) st.cur.nulo = true; }
        else if (msg === 'Eleitor foi habilitado') { const st = estado.get(c.urna); if (st?.cur) st.cur.hab = true; }
        else if (msg === 'Aguardando digitação do identificador do eleitor') { const st = estado.get(c.urna); if (st && st.cur && st.cur.susp.length === 0 && !st.cur.hab) st.cur.fechadaSemVoto = true; }
      }
    }
    fechar();
    for (const [urna, st] of estado) porTextoUrna.push({ urna, sessoes: st.sessoes });
  }

  // ---- H09b: uma cópia por urna (a com mais sessões), classificação ao fim do pacote
  const melhor = new Map();
  for (const r of porTextoUrna) if (!melhor.has(r.urna) || r.sessoes.length > melhor.get(r.urna).sessoes.length) melhor.set(r.urna, r);
  const codUf = COD_UF[uf];
  for (const { sessoes } of melhor.values()) analisarSessoes(sessoes, { mesarios, mesEleitor, encerr, oper, codUf }, acc.h09b);
  for (const d of mesarios) add(acc.h09b.ufDoTitulo, (+d.slice(8, 10) === codUf) ? 'mesario:mesmaUF' : 'mesario:outraUF');

  // ---- H09a: busca das formas codificadas
  const ix = ctx.ix;
  ix.limpar();
  let k = 0;
  // Classe de comprimento da agulha: a chance de coincidência depende do comprimento (e do alfabeto), não do dono.
  const cl = (n) => (n <= 5 ? `L${n}` : n <= 7 ? 'L6-7' : n <= 11 ? 'L8-11' : 'L12+');
  const zc = (x) => { const z = x.match(/^0*/)[0].length; return z <= 2 ? 'z0-2' : z <= 4 ? 'z3-4' : 'z5+'; };
  // Formas decimais que coincidem com (ou estão dentro de) um número publicado em claro no mesmo pacote (ex.: título
  // palíndromo, cujo "invertido" é ele mesmo) não distinguem nada: vão para "ambíguos", não para achados.
  const claros = [];
  for (const d of sondas.keys()) claros.push(d, d.replace(/^0+/, ''));
  const soDigitos = /^\d+$/;
  for (const [d, papeis] of sondas) {
    const rot = [...papeis].sort().join('+');
    add(acc.h09a.sondasPorClasse, `${zc(d)}|${rot}`);
    for (const f of formas(d)) {
      const c = cl(f.buf.length);
      const txt = f.buf.toString('latin1');
      const ambiguo = !f.claro && soDigitos.test(txt) && claros.some((x) => x.includes(txt));
      add(acc.h09a.agulhas, `real|${f.nome}|${c}`);
      ix.por({ ...f, papel: rot, isca: false, sonda: d, zc: c, ambiguo });
    }
    const falso = isca(d, (idx * 7919 + k++ * 104729) >>> 0);
    for (const f of formas(falso)) { const c = cl(f.buf.length); add(acc.h09a.agulhas, `isca|${f.nome}|${c}`); ix.por({ ...f, papel: rot, isca: true, sonda: falso, zc: c }); }
  }
  add(acc.h09a, 'sondas', sondas.size);
  if (sondas.size === 0) { add(acc.h09a, 'pacotesSemSonda'); return; }
  const alvos = [
    ...arqs.map((a) => ({ tipo: a.tipo === 'log' ? 'jezBruto' : a.tipo, dados: a.dados, ehLog: false })),
    ...ents.map((e) => ({ tipo: e.ehLog ? 'diario' : 'entradaJez', dados: e.dados, ehLog: e.ehLog })),
  ];
  const vistasClaro = new Set();
  for (const a of alvos) {
    add(acc.h09a.bytes, a.tipo, a.dados.length);
    ix.varrer(a.dados, (ag, pos) => {
      // No diário: o achado está no texto da linha ou na última coluna (16 hexadecimais do encadeamento)?
      let lugar = a.tipo;
      if (a.ehLog) {
        const ini = a.dados.lastIndexOf(0x0a, pos) + 1;
        let tabs = 0;
        for (let i = ini; i < pos; i++) if (a.dados[i] === 0x09) tabs++;
        lugar = tabs >= 5 ? 'diario:colunaHash' : 'diario:texto';
      }
      if (ag.isca) {
        const t = ag.buf.toString('latin1');
        const D = (x) => x >= 48 && x <= 57;
        const pedaco = /^\d+$/.test(t) && ((pos > 0 && D(a.dados[pos - 1])) || D(a.dados[pos + ag.buf.length] ?? 0));
        add(pedaco ? acc.h09a.iscaDentroDeOutroNumero : acc.h09a.isca, `${lugar}|${ag.nome}|${ag.zc}`);
        return;
      }
      if (a.ehLog && ag.claro) { vistasClaro.add(ag.sonda); return; } // controle positivo: o número em claro no diário
      if (ag.ambiguo) { add(acc.h09a.ambiguos, `${lugar}|${ag.nome}|${ag.zc}`); return; }
      // forma só de dígitos no meio de uma sequência maior de dígitos: anotada à parte (pedaço de outro número)
      if (soDigitos.test(ag.buf.toString('latin1'))) {
        const D = (x) => x >= 48 && x <= 57;
        if ((pos > 0 && D(a.dados[pos - 1])) || D(a.dados[pos + ag.buf.length] ?? 0)) { add(acc.h09a.dentroDeOutroNumero, `${lugar}|${ag.nome}|${ag.zc}`); return; }
      }
      add(acc.h09a.achados, `${lugar}|${ag.nome}|${ag.zc}|${ag.papel}`);
      if (acc.h09a.exemplos.length < 400 || (!/^L[45]$/.test(ag.zc) && acc.h09a.exemplos.length < 5000)) {
        const limpo = (b) => b.toString('latin1').replace(/[^\x20-\x7e]/g, '.').replace(/\d/g, '#');
        const ctxTxt = `${limpo(a.dados.subarray(Math.max(0, pos - 40), pos))}[${'*'.repeat(ag.buf.length)}]${limpo(a.dados.subarray(pos + ag.buf.length, pos + ag.buf.length + 40))}`;
        acc.h09a.exemplos.push({ id, arquivo: lugar, forma: ag.nome, papel: ag.papel, posicao: pos, contexto: ctxTxt });
      }
    });
  }
  // Controle positivo natural: toda sonda tem de aparecer em claro em algum diário do pacote
  add(acc.h09a, 'sondasVistasEmClaroNoDiario', vistasClaro.size);
  // Controle positivo sintético: 1ª sonda de cada zona, todas as formas coladas num buffer
  if (!ctx.sinteticoFeito) {
    ctx.sinteticoFeito = true;
    const d = sondas.keys().next().value;
    const fs = formas(d);
    const buf = Buffer.concat([Buffer.from('lixo-'), ...fs.flatMap((f) => [f.buf, Buffer.from('|')])]);
    const achou = new Set();
    ix.varrer(buf, (ag) => { if (!ag.isca && ag.sonda === d) achou.add(ag.nome); });
    const nomesFormas = fs.filter((f) => f.buf.length >= 4).map((f) => f.nome);
    add(acc.h09a.controleSintetico, 'formasTestadas', nomesFormas.length);
    add(acc.h09a.controleSintetico, 'formasAchadas', nomesFormas.filter((n) => achou.has(n)).length);
  }
}

/** H09b: métricas da estrutura das sessões de uma urna no dia. */
function analisarSessoes(S, papeis, acc) {
  const { mesarios, mesEleitor, encerr, oper, codUf } = papeis;
  const grupo = (e) => {
    if (!e.dv) return `${e.v ? 'V' : 'I'}:semDV`;
    let p = 'semPapel';
    if (mesarios.has(e.n)) p = mesEleitor.has(e.n) ? 'mesarioEleitorSecao' : 'mesarioOutraSecao';
    else if (encerr.has(e.n)) p = 'encerramento';
    else if (oper.has(e.n)) p = 'operador';
    return `${e.v ? 'V' : 'I'}:${p}`;
  };
  // base: tipo da sessão e transições entre sessões vizinhas (só sessões com tipo)
  for (let i = 0; i < S.length; i++) {
    add(acc.baseTipo, S[i].tipo);
    if (i + 1 < S.length) add(acc.baseTransicao, `${S[i].tipo}>${S[i + 1].tipo}`);
  }
  const ocorr = new Map(); // grupo|número → Set(índice da sessão)
  for (let i = 0; i < S.length; i++) {
    const s = S[i];
    if (!s.susp.length) continue;
    const gs = new Set();
    for (const e of s.susp) {
      const g = grupo(e);
      gs.add(g);
      add(acc.linhas, g);
      if (e.len !== 12) add(acc.linhasSemZerosEsquerda, g);
      if (e.dv) {
        const k = `${g}|${e.n}`;
        if (!ocorr.has(k)) ocorr.set(k, new Set());
        ocorr.get(k).add(i);
        add(acc.ufDoTitulo, `${g}:${+e.n.slice(8, 10) === codUf ? 'mesmaUF' : 'outraUF'}`);
      }
    }
    for (const g of gs) {
      add(acc.sessoes, g);
      add(acc.tipoAtual, `${g}|${s.tipo}`);
      add(acc.tipoAnterior, `${g}|${i > 0 ? S[i - 1].tipo : 'nenhuma'}`);
      add(acc.tipoSeguinte, `${g}|${i + 1 < S.length ? S[i + 1].tipo : 'nenhuma'}`);
      add(acc.desfecho, `${g}|${s.comp ? 'computado' : 'semComputado'}|${s.suspenso ? 'suspenso' : 'naoSuspenso'}|${s.nulo ? 'nulo' : 'semNulo'}`);
    }
    // distância de digitação: número sem DV × número com DV recusado na mesma sessão, e × mesários da urna
    const semDv = s.susp.filter((e) => !e.dv && e.n.length === 12);
    const recusados = s.susp.filter((e) => e.dv && !e.v && grupo(e) === 'I:semPapel');
    for (const e of semDv) {
      let dRec = 99, dMes = 99;
      for (const r of recusados) dRec = Math.min(dRec, ham(e.n, r.n));
      for (const m of mesarios) dMes = Math.min(dMes, ham(e.n, m));
      add(acc.distanciaSemDV, `recusadoNaSessao:${recusados.length ? Math.min(dRec, 4) : 'nenhum'}|mesario:${mesarios.size ? Math.min(dMes, 4) : 'nenhum'}`);
    }
    // sequência das tentativas dentro da sessão
    for (let j = 0; j + 1 < s.susp.length; j++) {
      const a = s.susp[j], b = s.susp[j + 1];
      if (grupo(a) !== 'I:semPapel') continue;
      add(acc.tentativaSeguinte, b.n === a.n ? `mesmoNumero:${b.v ? 'aceito' : 'recusado'}` : `outro:${grupo(b)}`);
    }
  }
  // repetição do número entre sessões da mesma urna (uma pessoa vota uma vez)
  for (const [k, set] of ocorr) add(acc.sessoesPorNumero, `${k.split('|')[0]}|${Math.min(set.size, 5)}`);
  // mesário eleitor da seção: recusado em quantas sessões; aceito antes/depois da recusa
  const mesE = new Map();
  for (let i = 0; i < S.length; i++) for (const e of S[i].susp) {
    if (!e.dv || !mesEleitor.has(e.n)) continue;
    let r = mesE.get(e.n);
    if (!r) mesE.set(e.n, (r = { rec: new Set(), ace: new Set() }));
    (e.v ? r.ace : r.rec).add(i);
  }
  for (const r of mesE.values()) {
    if (!r.rec.size) { add(acc.mesarioEleitor, 'soAceito'); continue; }
    add(acc.mesarioEleitor, `recusadoEm:${Math.min(r.rec.size, 3)}sessoes`);
    const iRec = Math.min(...r.rec);
    const antes = [...r.ace].filter((i) => i < iRec).length, depois = [...r.ace].filter((i) => i > Math.max(...r.rec)).length;
    const mesma = [...r.ace].filter((i) => r.rec.has(i)).length;
    add(acc.mesarioEleitor, `aceitoAntes:${antes ? 'sim' : 'nao'}|aceitoDepois:${depois ? 'sim' : 'nao'}|aceitoNaMesmaSessao:${mesma ? 'sim' : 'nao'}`);
  }
  // mesário que NÃO é eleitor da seção: alguma recusa?
  for (const s of S) for (const e of s.susp) if (e.dv && mesarios.has(e.n) && !mesEleitor.has(e.n)) add(acc.mesarioOutraSecao, e.v ? 'aceito' : 'recusado');
}
function ham(a, b) { let n = 0; for (let i = 0; i < 12; i++) if (a.charCodeAt(i) !== b.charCodeAt(i)) n++; return n; }

function novoAcc() {
  return {
    geral: {},
    h04: { etapasPorBootVotacao: {}, etapasPorBootVotacaoModelo: {} },
    h04boots: [],
    h09a: { bytes: {}, achados: {}, isca: {}, exemplos: [], controleSintetico: {}, sondasPorClasse: {}, agulhas: {}, ambiguos: {}, dentroDeOutroNumero: {}, iscaDentroDeOutroNumero: {} },
    h09b: { linhas: {}, linhasSemZerosEsquerda: {}, sessoes: {}, baseTipo: {}, baseTransicao: {}, tipoAtual: {}, tipoAnterior: {}, tipoSeguinte: {}, desfecho: {}, sessoesPorNumero: {}, mesarioEleitor: {}, mesarioOutraSecao: {}, distanciaSemDV: {}, tentativaSeguinte: {}, ufDoTitulo: {} },
  };
}

// ---------------------------------------------------------------- worker
async function trabalhar() {
  const ctx = { ix: new Indice(), dicEtapas: new Map() };
  parentPort.on('message', async (tarefa) => {
    if (tarefa === null) { parentPort.close(); return; }
    const { turno, uf, base, zonaDir, idx } = tarefa;
    const acc = novoAcc();
    ctx.sinteticoFeito = false;
    try {
      for (const secao of (await readdir(zonaDir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort()) {
        const dirSecao = path.join(zonaDir, secao);
        ctx.vscVistos = new Set();
        const rel = path.relative(base, dirSecao).split(path.sep).join('/');
        add(acc.geral, 'secoes');
        const hashes = (await readdir(dirSecao, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
        if (!hashes.length) add(acc.geral, 'secoesSemPacote');
        for (const h of hashes) {
          try { await processarPacote(path.join(dirSecao, h), rel, uf, turno, idx, acc, ctx); }
          catch (erro) { add(acc.geral, 'pacotesComErro'); (acc.geral.errosLista ??= []).push(`${rel}: ${erro.message.slice(0, 120)}`); }
        }
      }
    } catch (erro) { add(acc.geral, 'zonasComErro'); }
    const dic = Object.fromEntries(ctx.dicEtapas);
    ctx.dicEtapas.clear();
    parentPort.postMessage({ uf, acc, dic });
  });
}

// ---------------------------------------------------------------- mestre
async function principal() {
  const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, uf: { type: 'string' }, workers: { type: 'string', default: '4' }, refazer: { type: 'boolean' } } });
  const turno = Number(values.turno);
  const base = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas');
  const destino = path.join(SAIDA, `${turno}t`);
  await mkdir(destino, { recursive: true });
  const ufs = (values.uf ? values.uf.split(',') : UFS).filter((u) => values.refazer || !existsSync(path.join(destino, `${u}.json`)));
  const sub = async (d) => (await readdir(d, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  const fila = [];
  const pendentes = {};
  for (const uf of ufs) {
    pendentes[uf] = 0;
    for (const m of await sub(path.join(base, uf))) for (const z of await sub(path.join(base, uf, m))) { fila.push({ turno, uf, base, zonaDir: path.join(base, uf, m, z), idx: fila.length }); pendentes[uf]++; }
  }
  // as zonas maiores primeiro não importa; mistura UFs para equilibrar
  console.log(`turno ${turno}: ${ufs.length} UFs, ${fila.length} zonas, ${values.workers} workers`);
  const accUf = Object.fromEntries(ufs.map((u) => [u, novoAcc()]));
  const dicUf = Object.fromEntries(ufs.map((u) => [u, {}]));
  const inicio = Date.now();
  let feitas = 0;
  const gravarUf = async (uf) => {
    const a = accUf[uf];
    const alvo = path.join(destino, `${uf}.json`);
    const texto = semNumeros({ turno, uf, geradoEm: new Date().toISOString(), ...a, dicionarioEtapas: dicUf[uf] });
    await writeFile(`${alvo}.tmp`, texto);
    await rename(`${alvo}.tmp`, alvo);
    console.log(`${uf}: gravado (${a.geral.pacotes ?? 0} pacotes, ${((Date.now() - inicio) / 1000).toFixed(0)} s)`);
    accUf[uf] = null;
  };
  await new Promise((resolve, reject) => {
    let ativos = 0;
    const nW = Math.max(1, Math.min(Number(values.workers), 8));
    for (let w = 0; w < nW; w++) {
      const worker = new Worker(new URL(import.meta.url), { workerData: { worker: true }, resourceLimits: { maxOldGenerationSizeMb: 4096 } });
      ativos++;
      const proxima = () => worker.postMessage(fila.length ? fila.shift() : null);
      worker.on('message', async ({ uf, acc, dic }) => {
        somar(accUf[uf], acc);
        Object.assign(dicUf[uf], dic);
        feitas++;
        if (--pendentes[uf] === 0) await gravarUf(uf);
        if (feitas % 200 === 0) console.log(`  ${feitas} zonas (${((Date.now() - inicio) / 1000).toFixed(0)} s)`);
        proxima();
      });
      worker.on('error', reject);
      worker.on('exit', () => { if (--ativos === 0) resolve(); });
      proxima();
    }
  });
  console.log(`fim: ${((Date.now() - inicio) / 1000).toFixed(0)} s`);
}

if (isMainThread) await principal();
else if (workerData?.worker) await trabalhar();
