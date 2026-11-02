// Cético 56 (docs/analysis/cetico-revisor/56-fechamento-h04-h09-h12-h20.md): reimplementação própria, universo completo,
// de duas medidas do doc 13 do engenheiro de segurança.
//
//   H09b  Quem é o número da mensagem "Título N é válido / inválido para suspender a votação" no dia da eleição.
//         Código escrito do zero (não importa nada dos scripts do engenheiro). Diferenças de método deliberadas:
//           - papel de mesário lido por expressão EXATA da mensagem ("Mesário N é eleitor da seção" e
//             "Mesário N não é eleitor da seção" são classes separadas);
//           - além da vizinha imediata, a vizinha HABILITADA (sessão com "Eleitor foi habilitado");
//           - teste novo de regra: a recusa depende do tipo de identificação da sessão (título × CPF)?
//             Mede todas as sessões com tentativa de suspensão por tipo, para comparar com o "válido" sem papel;
//           - exceções (recusado sem papel em sessão identificada por CPF) descritas pela sequência de mensagens,
//             sem números;
//           - unicidade nacional do número (em quantas seções do país ele aparece), por hash com sal aleatório
//             gerado a cada execução e nunca gravado.
//   H04   Definição independente de "votou sem verificação completa": em vez de segmentar boots, cada voto do dia é
//         atribuído ao último marcador de ligação ("Início das operações do logd" ou "Urna ligada em") do mesmo texto
//         e da mesma urna; conta as etapas de "Verificação de assinatura" e as falhas desde esse marcador.
//
// REGRA ABSOLUTA: nenhum número de pessoa sai deste programa. Números ficam só na memória; o que vai ao processo
// mestre é hash com sal; a saída tem só contagens e endereços de seção; a trava aborta se houver 10 a 12 dígitos
// seguidos em qualquer texto da saída.
//
// Uso: node scripts/auditoria/cetico-56-h09b.mjs --turno 2 [--uf ac,rr] [--workers 6]
// Saída: data/parsed/auditoria/cetico-revisor/56/h09b-h04-<t>t.json
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const DIA = { 1: '04/10/2026', 2: '25/10/2026' };
const UF_COD = ['sp', 'mg', 'rj', 'rs', 'ba', 'pr', 'ce', 'pe', 'sc', 'go', 'ma', 'pb', 'pa', 'es', 'pi', 'rn', 'al', 'mt', 'ms', 'df', 'se', 'am', 'ro', 'ac', 'ap', 'rr', 'to', 'zz'];
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '56');

const inc = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };
function juntar(a, b) {
  for (const k of Object.keys(b)) {
    const v = b[k];
    if (typeof v === 'number') a[k] = (a[k] || 0) + v;
    else if (Array.isArray(v)) { a[k] = a[k] || []; for (const x of v) if (a[k].length < 60) a[k].push(x); }
    else if (v && typeof v === 'object') { a[k] = a[k] || {}; juntar(a[k], v); }
  }
  return a;
}

/** DV do título (12 dígitos). Escrito à parte: pesos 2..9 na sequência; 7, 8 na UF e 9 no 1º DV; resto 10 vira 0;
 *  em SP (01) e MG (02) resto 0 vira 1. */
function tituloValido(t) {
  if (!/^\d{12}$/.test(t)) return false;
  const d = [...t].map(Number);
  const uf = d[8] * 10 + d[9];
  if (uf < 1 || uf > 28) return false;
  const ajusta = (r) => { if (r === 10) return 0; if (r === 0 && (uf === 1 || uf === 2)) return 1; return r; };
  let s = 0;
  for (let i = 0; i < 8; i++) s += d[i] * (i + 2);
  const dv1 = ajusta(s % 11);
  const dv2 = ajusta((d[8] * 7 + d[9] * 8 + dv1 * 9) % 11);
  return dv1 === d[10] && dv2 === d[11];
}
const distancia = (a, b) => { let n = 0; for (let i = 0; i < 12; i++) if (a[i] !== b[i]) n++; return n; };

// ------------------------------------------------------------------------------------------------ worker
const RE_DH = /^\d\d\/\d\d\/\d{4} \d\d:\d\d:\d\d$/;
const RE_MES = /^Mesário (\d+) (registrado|já registrado|é eleitor da seção|não é eleitor da seção)$/;
const RE_MES_HAB = /^Mesário (\d+) habilitou o eleitor$/;
const RE_MES_BIO = /^Pedido de leitura da biometria do mesário (\d+)$/;
const RE_ENC = /^Título digitado para encerramento: (\d+)/;
const RE_OPER = /gerada pelo usuário: (\d+)/;
const RE_SUSP = /^Título (\S*) é (válido|inválido) para suspender a votação/;
const RE_ETAPA = /^Verificação de assinatura - Etapa \[\d+\]/;

const mem = (b) => ({ read: async (d, o, n, p) => ({ bytesRead: b.copy(d, o, p, p + n) }), stat: async () => ({ size: b.length }) });
async function lerTextos(buf, prof = 0) {
  const out = [];
  for (const e of await listarEntradas(mem(buf))) {
    const d = await lerEntrada(mem(buf), e);
    if (e.nome.endsWith('.dat')) out.push({ prof, t: d.toString('latin1') });
    else if (e.nome.endsWith('.jez') && prof < 4) out.push(...(await lerTextos(d, prof + 1)));
  }
  return out;
}

/** Assinatura de uma sessão: mensagens sem números, comprimidas (sem repetição seguida). */
function assinaturaSessao(msgs) {
  const out = [];
  for (const m of msgs) {
    const s = m.replace(/\d+/g, '#').slice(0, 70);
    if (out[out.length - 1] !== s) out.push(s);
  }
  return out.slice(0, 40).join(' > ');
}

function novoAcc() {
  return {
    geral: {}, h04: { votosPorEtapasDesdeLigar: {}, votosComFalhaDesdeLigar: 0, votosSemEtapaDesdeLigar: 0, votosSemMarcador: 0, votosDia: 0, exemplosSuspeitos: [] },
    h09: {
      baseTipo: {}, baseTipoHabilitada: {}, transicao: {}, transicaoHabilitada: {},
      sessoesComSuspensaoPorTipo: {}, sessoesComSuspensaoPorTipoGrupos: {},
      linhas: {}, sessoes: {}, atual: {}, anterior: {}, seguinte: {}, anteriorHab: {}, seguinteHab: {},
      repeticaoNaUrna: {}, ufIgual: {}, desfecho: {}, tentativaSeguinte: {}, distanciaMesario: {},
      mesarioEleitor: {}, mesarioNaoEleitor: {}, mesarioSemInfo: {}, conflitoClasseMesario: 0, mesariosPorClasse: {},
      foraDeSessao: 0, excecoesCPF: [], numeroNaoNumerico: 0, comprimento: {},
    },
  };
}

async function processarPacote(dir, secaoId, uf, turno, acc, ctx, hashes) {
  const nomes = await readdir(dir);
  const log = nomes.find((x) => /-log(sa)?\.jez$/.test(x));
  if (!log) { inc(acc.geral, 'pastaSemLog'); return; }
  const buf = await readFile(path.join(dir, log));
  const h = createHash('sha256').update(buf).digest('hex');
  if (ctx.vistos.has(h)) { inc(acc.geral, 'pacoteRepetido'); return; }
  ctx.vistos.add(h);
  inc(acc.geral, 'pacotes');
  let textos;
  try { textos = await lerTextos(buf); } catch { inc(acc.geral, 'logIlegivel'); return; }
  inc(acc.geral, 'textos', textos.length);
  const dia = DIA[turno];
  const mes = new Map(); // número → Set(classe)
  const enc = new Set(), oper = new Set();
  const porUrna = new Map(); // urna → { sessoes, linhasDia } da melhor cópia
  for (const { t } of textos) {
    const urnas = new Map(); // urna → estado neste texto
    const marc = new Map(); // H04: urna → { etapas, falhas } desde o último marcador de ligação
    let ini = 0;
    const N = t.length;
    while (ini < N) {
      let fim = t.indexOf('\n', ini);
      if (fim < 0) fim = N;
      let l = t.slice(ini, fim);
      ini = fim + 1;
      if (l.endsWith('\r')) l = l.slice(0, -1);
      if (l.length < 25 || l[2] !== '/') continue;
      const c = l.split('\t');
      if (c.length < 5 || !RE_DH.test(c[0])) { inc(acc.geral, 'linhaMalformada'); continue; }
      const [dh, , urna, app, msg] = c;
      // papéis (qualquer data)
      let m;
      if (msg.startsWith('Mesário ') && (m = RE_MES.exec(msg) || RE_MES_HAB.exec(msg))) {
        const n = m[1].padStart(12, '0');
        const cl = m[2] === 'é eleitor da seção' ? 'eleitor' : m[2] === 'não é eleitor da seção' ? 'naoEleitor' : 'reg';
        if (!mes.has(n)) mes.set(n, new Set());
        mes.get(n).add(cl);
      } else if ((m = RE_MES_BIO.exec(msg))) {
        const n = m[1].padStart(12, '0');
        if (!mes.has(n)) mes.set(n, new Set());
        mes.get(n).add('reg');
      } else if ((m = RE_ENC.exec(msg))) enc.add(m[1].padStart(12, '0'));
      else if ((m = RE_OPER.exec(msg))) oper.add(m[1].padStart(12, '0'));
      const doDia = dh.startsWith(dia);
      // H04 independente
      if (app === 'LOGD' && (msg.startsWith('Início das operações do logd') || msg.startsWith('Urna ligada em'))) marc.set(urna, { etapas: 0, falhas: 0 });
      else if (RE_ETAPA.test(msg)) {
        let s = marc.get(urna);
        if (!s) marc.set(urna, (s = { etapas: 0, falhas: 0, semMarcador: true }));
        s.etapas++;
        if (!msg.endsWith('[SUCESSO]')) s.falhas++;
      }
      if (doDia && msg === 'O voto do eleitor foi computado') {
        const s = marc.get(urna);
        acc.h04.votosDia++;
        if (!s) acc.h04.votosSemMarcador++;
        else {
          inc(acc.h04.votosPorEtapasDesdeLigar, String(s.etapas));
          if (s.falhas) acc.h04.votosComFalhaDesdeLigar++;
          if (!s.etapas) acc.h04.votosSemEtapaDesdeLigar++;
          if ((s.falhas || s.etapas < 33) && acc.h04.exemplosSuspeitos.length < 40) acc.h04.exemplosSuspeitos.push(`${secaoId} ${dh.slice(11)} etapas ${s.etapas} falhas ${s.falhas}`);
        }
      }
      // H09: sessões de eleitor no dia
      if (!doDia || app !== 'VOTA') continue;
      let u = urnas.get(urna);
      if (!u) urnas.set(urna, (u = { sessoes: [], cur: null, linhas: 0 }));
      u.linhas++;
      if (msg === 'Identificador do eleitor digitado pelo mesário') {
        u.cur = { tipo: '?', hab: false, comp: false, susp: false, nulo: false, tent: [], msgs: [msg] };
        u.sessoes.push(u.cur);
        continue;
      }
      if (u.cur && u.cur.msgs.length < 60) u.cur.msgs.push(msg);
      if (msg.startsWith('Identificador digitado pelo mesário foi: ')) { if (u.cur) u.cur.tipo = msg.includes('(CPF)') ? 'C' : msg.includes('(Título') ? 'T' : 'O'; }
      else if (msg === 'Eleitor foi habilitado') { if (u.cur) u.cur.hab = true; }
      else if (msg === 'O voto do eleitor foi computado') { if (u.cur) u.cur.comp = true; }
      else if (msg === 'Eleitor foi suspenso pelo mesário') { if (u.cur) u.cur.susp = true; }
      else if (msg.startsWith('Atribuido voto nulo por suspensão')) { if (u.cur) u.cur.nulo = true; }
      else if ((m = RE_SUSP.exec(msg))) {
        if (!u.cur) { acc.h09.foraDeSessao++; continue; }
        const bruto = m[1];
        if (!/^\d+$/.test(bruto)) { acc.h09.numeroNaoNumerico++; continue; }
        inc(acc.h09.comprimento, String(bruto.length));
        const n = bruto.length <= 12 ? bruto.padStart(12, '0') : bruto;
        u.cur.tent.push({ n, valido: m[2] === 'válido', dv: tituloValido(n) });
      }
    }
    for (const [urna, u] of urnas) {
      const atual = porUrna.get(urna);
      if (!atual || u.linhas > atual.linhas) porUrna.set(urna, u);
    }
  }
  // classes de mesário
  const classe = new Map();
  for (const [n, s] of mes) {
    let c = 'semInfo';
    if (s.has('eleitor') && s.has('naoEleitor')) { acc.h09.conflitoClasseMesario++; c = 'eleitor'; }
    else if (s.has('eleitor')) c = 'eleitor';
    else if (s.has('naoEleitor')) c = 'naoEleitor';
    classe.set(n, c);
    inc(acc.h09.mesariosPorClasse, c);
  }
  for (const n of classe.keys()) hashes.mes.push(ctx.hash(n));
  const codUf = UF_COD.indexOf(uf) + 1;
  const papel = (n) => {
    if (classe.has(n)) return `mes_${classe.get(n)}`;
    if (enc.has(n)) return 'encerramento';
    if (oper.has(n)) return 'operador';
    return 'semPapel';
  };
  for (const u of porUrna.values()) analisar(u.sessoes, papel, classe, codUf, secaoId, acc.h09, ctx, hashes);
}

function analisar(S, papel, classe, codUf, secaoId, a, ctx, hashes) {
  const habIdx = [];
  for (let i = 0; i < S.length; i++) {
    inc(a.baseTipo, S[i].tipo);
    if (i + 1 < S.length) inc(a.transicao, `${S[i].tipo}>${S[i + 1].tipo}`);
    if (S[i].hab) { inc(a.baseTipoHabilitada, S[i].tipo); habIdx.push(i); }
  }
  for (let j = 0; j + 1 < habIdx.length; j++) inc(a.transicaoHabilitada, `${S[habIdx[j]].tipo}>${S[habIdx[j + 1]].tipo}`);
  // vizinha habilitada mais próxima, antes e depois
  const habAntes = new Array(S.length).fill(-1), habDepois = new Array(S.length).fill(-1);
  for (let i = 0, ult = -1; i < S.length; i++) { habAntes[i] = ult; if (S[i].hab) ult = i; }
  for (let i = S.length - 1, ult = -1; i >= 0; i--) { habDepois[i] = ult; if (S[i].hab) ult = i; }
  const grupo = (e) => (e.dv ? `${e.valido ? 'V' : 'I'}:${papel(e.n)}` : `${e.valido ? 'V' : 'I'}:semDV`);
  const ocorr = new Map();
  const mesE = new Map();
  const mesarios = [...classe.keys()];
  for (let i = 0; i < S.length; i++) {
    const s = S[i];
    if (!s.tent.length) continue;
    inc(a.sessoesComSuspensaoPorTipo, s.tipo);
    const gs = new Set();
    for (let k = 0; k < s.tent.length; k++) {
      const e = s.tent[k];
      const g = grupo(e);
      gs.add(g);
      inc(a.linhas, g);
      if (e.dv) {
        const chave = `${g}|${e.n}`;
        if (!ocorr.has(chave)) ocorr.set(chave, new Set());
        ocorr.get(chave).add(i);
        inc(a.ufIgual, `${g}|${+e.n.slice(8, 10) === codUf ? 'mesma' : 'outra'}`);
        if (g === 'I:semPapel' || g === 'V:semPapel') hashes.susp.push([ctx.hash(e.n), g[0], secaoId]);
        if (g === 'I:semPapel') {
          let dm = 99;
          for (const x of mesarios) { const d = distancia(e.n, x); if (d < dm) dm = d; }
          inc(a.distanciaMesario, mesarios.length ? String(Math.min(dm, 6)) : 'semMesario');
        }
        const c = classe.get(e.n);
        if (c) {
          const r = mesE.get(e.n) ?? { classe: c, rec: new Set(), ace: new Set() };
          (e.valido ? r.ace : r.rec).add(i);
          mesE.set(e.n, r);
        }
      }
      if (g === 'I:semPapel' && k + 1 < s.tent.length) {
        const b = s.tent[k + 1];
        inc(a.tentativaSeguinte, b.n === e.n ? `mesmo:${b.valido ? 'aceito' : 'recusado'}` : `outro:${grupo(b)}`);
      }
    }
    for (const g of gs) {
      inc(a.sessoes, g);
      inc(a.atual, `${g}|${s.tipo}`);
      inc(a.anterior, `${g}|${i > 0 ? S[i - 1].tipo : '-'}`);
      inc(a.seguinte, `${g}|${i + 1 < S.length ? S[i + 1].tipo : '-'}`);
      inc(a.anteriorHab, `${g}|${habAntes[i] >= 0 ? S[habAntes[i]].tipo : '-'}`);
      inc(a.seguinteHab, `${g}|${habDepois[i] >= 0 ? S[habDepois[i]].tipo : '-'}`);
      inc(a.desfecho, `${g}|${s.hab ? 'hab' : 'naoHab'}|${s.comp ? 'computado' : 'semVoto'}|${s.susp ? 'suspenso' : 'naoSuspenso'}|${s.nulo ? 'nulo' : 'semNulo'}`);
      inc(a.sessoesComSuspensaoPorTipoGrupos, `${g}|${s.tipo}`);
    }
    if (gs.has('I:semPapel') && s.tipo !== 'T' && a.excecoesCPF.length < 60) a.excecoesCPF.push(`${secaoId} tipo ${s.tipo}: ${assinaturaSessao(s.msgs)}`);
  }
  for (const [chave, set] of ocorr) inc(a.repeticaoNaUrna, `${chave.slice(0, chave.indexOf('|'))}|${Math.min(set.size, 5)}`);
  for (const r of mesE.values()) {
    const alvo = r.classe === 'eleitor' ? a.mesarioEleitor : r.classe === 'naoEleitor' ? a.mesarioNaoEleitor : a.mesarioSemInfo;
    inc(alvo, 'pares');
    inc(alvo, 'linhasSessoesAceitas', r.ace.size);
    inc(alvo, 'sessoesRecusadas', r.rec.size);
    if (!r.rec.size) { inc(alvo, 'soAceito'); continue; }
    inc(alvo, `recusadoEm${Math.min(r.rec.size, 3)}Sessoes`);
    const iMin = Math.min(...r.rec), iMax = Math.max(...r.rec);
    const antes = [...r.ace].some((i) => i < iMin), depois = [...r.ace].some((i) => i > iMax), mesma = [...r.ace].some((i) => r.rec.has(i));
    inc(alvo, `aceitoAntes:${antes ? 's' : 'n'}|depois:${depois ? 's' : 'n'}|mesmaSessao:${mesma ? 's' : 'n'}`);
    for (const i of r.rec) inc(alvo, `tipoDaSessaoRecusada:${S[i].tipo}`);
  }
}

async function trabalhar() {
  const sal = workerData.sal;
  const ctx = { hash: (n) => createHash('sha256').update(sal).update(n).digest('base64').slice(0, 16) };
  parentPort.on('message', async (tarefa) => {
    if (!tarefa) { parentPort.close(); return; }
    const { turno, uf, base, zonaDir } = tarefa;
    const acc = novoAcc();
    const hashes = { mes: [], susp: [] };
    try {
      for (const sec of (await readdir(zonaDir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort()) {
        const dirSec = path.join(zonaDir, sec);
        const secaoId = path.relative(base, dirSec).split(path.sep).join('/');
        ctx.vistos = new Set();
        inc(acc.geral, 'secoes');
        const pacs = (await readdir(dirSec, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
        if (!pacs.length) inc(acc.geral, 'secoesSemPacote');
        if (pacs.length > 1) inc(acc.geral, 'secoesComMaisDeUmaPasta');
        for (const p of pacs) {
          try { await processarPacote(path.join(dirSec, p), secaoId, uf, turno, acc, ctx, hashes); }
          catch (erro) { inc(acc.geral, 'pacotesComErro'); }
        }
      }
    } catch { inc(acc.geral, 'zonasComErro'); }
    parentPort.postMessage({ acc, hashes });
  });
}

// ------------------------------------------------------------------------------------------------ mestre
function trava(obj) {
  const re = /(?<!\d)\d{10,12}(?!\d)/;
  return JSON.stringify(obj, (k, v) => {
    if (re.test(k) || (typeof v === 'string' && re.test(v))) throw new Error('trava: 10 a 12 dígitos seguidos num texto; nada gravado');
    return v;
  }, 1);
}

async function principal() {
  const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, uf: { type: 'string' }, workers: { type: 'string', default: '6' } } });
  const turno = Number(values.turno);
  const base = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas');
  const ufs = values.uf ? values.uf.split(',') : UFS;
  const sub = async (d) => (await readdir(d, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  const fila = [];
  for (const uf of ufs) for (const m of await sub(path.join(base, uf))) for (const z of await sub(path.join(base, uf, m))) fila.push({ turno, uf, base, zonaDir: path.join(base, uf, m, z) });
  const total = fila.length;
  console.log(`turno ${turno}: ${ufs.length} UFs, ${total} zonas`);
  const sal = randomBytes(32).toString('hex'); // só na memória desta execução
  const acc = novoAcc();
  const mesPais = new Set();
  const suspPais = new Map(); // hash → { V: Set(seção), I: Set(seção) }
  let feitas = 0;
  const t0 = Date.now();
  await new Promise((resolve, reject) => {
    let vivos = 0;
    for (let w = 0; w < Number(values.workers); w++) {
      const wk = new Worker(new URL(import.meta.url), { workerData: { trabalhador: true, sal }, resourceLimits: { maxOldGenerationSizeMb: 3072 } });
      vivos++;
      const prox = () => wk.postMessage(fila.shift() ?? null);
      wk.on('message', ({ acc: a, hashes }) => {
        juntar(acc, a);
        for (const h of hashes.mes) mesPais.add(h);
        for (const [h, vi, sec] of hashes.susp) {
          let r = suspPais.get(h);
          if (!r) suspPais.set(h, (r = { secoes: new Set(), vi: new Set() }));
          r.secoes.add(sec); r.vi.add(vi);
        }
        if (++feitas % 300 === 0) console.log(`  ${feitas}/${total} zonas, ${((Date.now() - t0) / 60000).toFixed(1)} min`);
        prox();
      });
      wk.on('error', reject);
      wk.on('exit', () => { if (--vivos === 0) resolve(); });
      prox();
    }
  });
  // unicidade nacional
  const nac = { numerosDistintos: suspPais.size, porQuantidadeDeSecoes: {}, tambemMesarioEmAlgumaUrnaDoTurno: 0, valido: { distintos: 0, umaSecao: 0 }, invalido: { distintos: 0, umaSecao: 0 }, apareceComoValidoEInvalido: 0 };
  for (const [h, r] of suspPais) {
    inc(nac.porQuantidadeDeSecoes, String(Math.min(r.secoes.size, 5)));
    if (mesPais.has(h)) nac.tambemMesarioEmAlgumaUrnaDoTurno++;
    if (r.vi.has('V')) { nac.valido.distintos++; if (r.secoes.size === 1) nac.valido.umaSecao++; }
    if (r.vi.has('I')) { nac.invalido.distintos++; if (r.secoes.size === 1) nac.invalido.umaSecao++; }
    if (r.vi.size === 2) nac.apareceComoValidoEInvalido++;
  }
  const saida = { turno, geradoEm: new Date().toISOString(), zonas: total, minutos: +((Date.now() - t0) / 60000).toFixed(1), ...acc, nacional: nac };
  await mkdir(SAIDA, { recursive: true });
  const nome = path.join(SAIDA, `h09b-h04-${turno}t${values.uf ? `-${values.uf.replace(/,/g, '-')}` : ''}.json`);
  await writeFile(nome, trava(saida));
  console.log(`gravado ${nome} em ${saida.minutos} min`);
}

if (isMainThread) await principal();
else if (workerData?.trabalhador) await trabalhar();
