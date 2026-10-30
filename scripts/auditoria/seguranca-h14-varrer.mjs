import { fork } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

// H14 (engenheiro de segurança): rastro técnico das urnas reserva. Varredura dos logs brutos do 2º turno, universo
// completo (todas as seções, todos os logd.dat do pacote, inclusive os aninhados). Para cada logd.dat extrai:
//  - cada carga (SCUE): relógio interno na digitação, data/hora digitada pelo operador, seção informada (0000 = urna
//    de contingência), município/zona/local/seção gravados, mídia de carga (identificador, computador que gerou,
//    data da geração), código de carga e hora de "Urna carregada com sucesso";
//  - cada "Início do procedimento de contingência" (troca de urna) e "… de MV", com as MVs lidas;
//  - ajustes de relógio (ADH, "Data e hora atualizada") e retrocessos de relógio (linha com hora anterior à maior já
//    vista), separando os que vêm logo depois de um ajuste;
//  - no dia 25/10: linhas e votos por urna, primeira "Urna pronta", últimas mensagens ERRO/ALERTA.
// Não grava título de eleitor nem de servidor (o "usuário" que gerou a mídia de carga fica de fora).
//
// Uso: node scripts/auditoria/seguranca-h14-varrer.mjs [--uf ac,sp] [--procs 4]
// Saída: data/parsed/auditoria/reservas-rastro/varredura/<uf>.jsonl (uma linha por pacote) e varredura-resumo.json

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'reservas-rastro', 'varredura');
const BASE = path.join(DIR_DADOS, 'raw', '2t', 'urnas');
const DIA = '25/10/2026';
const subdirs = async (dir) => (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
const mem = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
async function textosDeLog(handle, profundidade = 0, nome = '') {
  const out = [];
  for (const e of await listarEntradas(handle)) {
    const d = await lerEntrada(handle, e);
    if (e.nome === 'logd.dat') out.push({ profundidade, nome: nome || 'logd.dat', texto: d.toString('latin1') });
    else if (e.nome.endsWith('.jez') && profundidade < 3) out.push(...(await textosDeLog(mem(d), profundidade + 1, e.nome)));
  }
  return out;
}
// "dd/mm/aaaa hh:mm:ss" → número comparável aaaammddhhmmss
const ordem = (dh) => Number(`${dh.slice(6, 10)}${dh.slice(3, 5)}${dh.slice(0, 2)}${dh.slice(11, 13)}${dh.slice(14, 16)}${dh.slice(17, 19)}`);
const emSeg = (dh) => Date.UTC(+dh.slice(6, 10), +dh.slice(3, 5) - 1, +dh.slice(0, 2), +dh.slice(11, 13), +dh.slice(14, 16), +dh.slice(17, 19)) / 1000;
const RE_DH = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/;
// Títulos (12 dígitos) aparecem em algumas mensagens; não são gravados.
const semTitulo = (msg) => msg.replace(/\d{10,}/g, '#');
const AJUSTE = /digitada pelo operador|Data e hora atualizada|Ajuste de Data e Hora|Início das operações do logd|Urna ligada em/;

/** Extrai o rastro de um logd.dat. Exportada para teste. */
export function analisarLog(texto) {
  const r = { linhas: 0, urnas: {}, modelo: null, primeira: null, ultima: null, cargas: [], contingencias: [], contingenciasMV: [], adh: 0, adhDia: 0,
    dataHoraAtualizada: 0, retrocessos: 0, retrocessosSemAjuste: 0, maiorRetrocessoSemAjusteSeg: 0, exemplosRetrocesso: [], modoContingencia: false,
    dia: { linhas: 0, urnas: {}, votos: {}, pronta: null, primeira: null, ultima: null, erros: 0, alertas: 0, ultimosErrosAlertas: [] } };
  let carga = null;
  let cont = null;
  let maxOrdem = 0;
  let maxDh = null;
  let ultimoAjuste = -1000;
  let i = -1;
  for (const bruta of texto.split('\n')) {
    const c = bruta.replace(/\r$/, '').split('\t');
    if (c.length < 5 || !RE_DH.test(c[0])) continue;
    i++;
    const [dh, nivel, urna, app, msg] = c;
    r.linhas++;
    r.urnas[urna] = (r.urnas[urna] ?? 0) + 1;
    r.primeira ??= dh;
    r.ultima = dh;
    const o = ordem(dh);
    if (AJUSTE.test(msg) || app === 'ADH') ultimoAjuste = i;
    if (maxOrdem && o < maxOrdem) {
      r.retrocessos++;
      if (i - ultimoAjuste > 30) {
        r.retrocessosSemAjuste++;
        const s = emSeg(maxDh) - emSeg(dh);
        if (s > r.maiorRetrocessoSemAjusteSeg) r.maiorRetrocessoSemAjusteSeg = s;
        if (r.exemplosRetrocesso.length < 3) r.exemplosRetrocesso.push({ dh, de: maxDh, seg: s, app, msg: semTitulo(msg).slice(0, 80) });
      }
    }
    if (o > maxOrdem) { maxOrdem = o; maxDh = dh; }
    if (msg.startsWith('Identificação do Modelo de Urna: ')) r.modelo ??= msg.slice(33).trim();
    if (msg === 'Data e hora atualizada') r.dataHoraAtualizada++;
    if (app === 'ADH' && /Iniciando aplicação/.test(msg)) {
      r.adh++;
      if (dh.startsWith(DIA)) r.adhDia++;
    }
    if (msg.startsWith('Modo de carga da UE - Urna de contingência')) r.modoContingencia = true;
    // Carga
    if (app === 'SCUE' && msg.startsWith('Iniciando aplicação')) {
      carga = { inicio: dh, app: msg.slice(22).trim(), relogio: null, digitada: null, secaoInformada: null, municipio: null, zona: null, local: null, secao: null,
        fc: null, fcComputador: null, fcGeracao: null, codigo: null, ok: null };
      r.cargas.push(carga);
    }
    if (carga && app === 'SCUE') {
      let m;
      if ((m = /^Data e hora que foi digitada pelo operador: (.+)$/.exec(msg))) { carga.relogio = dh; carga.digitada = m[1].trim(); }
      else if ((m = /^Seção informada pelo operador: (.+)$/.exec(msg))) carga.secaoInformada = m[1].trim();
      else if ((m = /^Município: (\d+)/.exec(msg))) carga.municipio = m[1];
      else if ((m = /^Zona Eleitoral: (\d+)/.exec(msg))) carga.zona = m[1];
      else if ((m = /^Local de Votação: (\d+)/.exec(msg))) carga.local = m[1];
      else if ((m = /^Seção Eleitoral: (\d+)/.exec(msg))) carga.secao = m[1];
      else if ((m = /^Identificador da mídia de carga: (\S+)/.exec(msg))) carga.fc = m[1];
      else if ((m = /^Mídia de carga gerada pelo computador \(nome - tpm - instalação\): (\S+)/.exec(msg))) carga.fcComputador = m[1];
      else if ((m = /^Data e hora da geração da mídia de carga: (.+)$/.exec(msg))) carga.fcGeracao = m[1].trim();
      else if ((m = /^Código de carga ([\d.]+) gravado/.exec(msg))) carga.codigo = m[1].replace(/\./g, '');
      else if (msg.startsWith('Urna carregada com sucesso')) carga.ok = dh;
    }
    // Contingência (troca de urna) e contingência de MV
    if (msg === 'Início do procedimento de contingência') {
      cont = { dh, fim: null, mvOriginal: null, mv: null, urna };
      r.contingencias.push(cont);
    } else if (msg.startsWith('Início do procedimento de contingência de MV')) r.contingenciasMV.push(dh);
    if (cont && !cont.fim) {
      let m;
      if ((m = /^Serial da MV original da urna que está registrada na MI: (\S+)/.exec(msg))) cont.mvOriginal = m[1];
      else if ((m = /^Serial da MV: (\S+)/.exec(msg))) cont.mv = m[1];
      else if (msg === 'Contingência executada com sucesso') cont.fim = dh;
    }
    // Dia da votação
    if (dh.startsWith(DIA)) {
      const d = r.dia;
      d.linhas++;
      d.urnas[urna] = (d.urnas[urna] ?? 0) + 1;
      d.primeira ??= dh;
      d.ultima = dh;
      if (msg === 'Urna pronta para receber votos') d.pronta ??= dh;
      if (msg === 'O voto do eleitor foi computado') d.votos[urna] = (d.votos[urna] ?? 0) + 1;
      if (nivel === 'ERRO' || nivel === 'ALERTA') {
        if (nivel === 'ERRO') d.erros++;
        else d.alertas++;
        d.ultimosErrosAlertas.push(`${dh.slice(11)} ${nivel} ${app} ${semTitulo(msg).slice(0, 100)}`);
        if (d.ultimosErrosAlertas.length > 4) d.ultimosErrosAlertas.shift();
      }
    }
  }
  // Urna principal do log: a de mais linhas
  r.urna = Object.entries(r.urnas).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return r;
}

async function pacotesDaSecao(dir) {
  try {
    const aux = JSON.parse(await readFile(path.join(dir, 'aux.json'), 'utf8'));
    return (aux.hashes ?? []).filter((h) => h.hash && h.hash !== '0' && (h.arq ?? []).some((a) => a.nm)).map((h) => h.hash);
  } catch {
    return [];
  }
}

async function filho() {
  process.on('message', async ({ uf, municipio, zona }) => {
    const linhas = [];
    let logs = 0;
    let falhas = 0;
    let secoes = 0;
    for (const secao of await subdirs(path.join(BASE, uf, municipio, zona))) {
      const dir = path.join(BASE, uf, municipio, zona, secao);
      secoes++;
      for (const h of await pacotesDaSecao(dir)) {
        try {
          const nomes = await readdir(path.join(dir, h));
          const nomeLog = acharArquivo(nomes, 'log');
          if (!nomeLog) continue;
          const ts = await textosDeLog(mem(await readFile(path.join(dir, h, nomeLog))));
          logs += ts.length;
          linhas.push(JSON.stringify({ k: `${uf}/${municipio}/${zona}/${secao}`, hash: h, logs: ts.map((t) => ({ prof: t.profundidade, nome: t.nome, ...analisarLog(t.texto) })) }));
        } catch (erro) {
          falhas++;
          linhas.push(JSON.stringify({ k: `${uf}/${municipio}/${zona}/${secao}`, hash: h, erro: erro.message }));
        }
      }
    }
    process.send({ uf, linhas, logs, falhas, secoes });
  });
  process.send({ pronto: true });
}

async function principal() {
  const { values } = parseArgs({ options: { uf: { type: 'string' }, procs: { type: 'string', default: '4' } } });
  const procs = Math.min(4, Math.max(1, Number(values.procs)));
  await mkdir(SAIDA, { recursive: true });
  const ufs = values.uf ? values.uf.split(',') : await subdirs(BASE);
  const resumo = { inicio: new Date().toISOString(), ufs: {}, logs: 0, falhas: 0, secoes: 0, pacotes: 0 };
  const inicio = Date.now();
  for (const uf of ufs) {
    const fila = [];
    for (const municipio of await subdirs(path.join(BASE, uf))) for (const zona of await subdirs(path.join(BASE, uf, municipio))) fila.push({ uf, municipio, zona });
    const saida = createWriteStream(path.join(SAIDA, `${uf}.jsonl`));
    const r = { logs: 0, falhas: 0, secoes: 0, pacotes: 0 };
    await new Promise((resolve) => {
      let ativos = 0;
      for (let i = 0; i < Math.min(procs, fila.length); i++) {
        ativos++;
        const f = fork(import.meta.filename, ['--filho']);
        const proximo = () => {
          const u = fila.shift();
          if (u) f.send(u);
          else f.disconnect();
        };
        f.on('message', (m) => {
          if (m.pronto) return proximo();
          for (const l of m.linhas) saida.write(`${l}\n`);
          r.logs += m.logs;
          r.falhas += m.falhas;
          r.secoes += m.secoes;
          r.pacotes += m.linhas.length;
          proximo();
        });
        f.on('exit', () => {
          if (--ativos === 0) resolve();
        });
      }
    });
    await new Promise((ok) => saida.end(ok));
    resumo.ufs[uf] = r;
    for (const c of ['logs', 'falhas', 'secoes', 'pacotes']) resumo[c] += r[c];
    console.log(`${uf}: ${r.secoes} seções, ${r.pacotes} pacotes, ${r.logs} logs, ${r.falhas} falhas (${((Date.now() - inicio) / 60000).toFixed(1)} min)`);
  }
  resumo.fim = new Date().toISOString();
  resumo.minutos = Number(((Date.now() - inicio) / 60000).toFixed(1));
  if (!values.uf) await writeFile(path.join(SAIDA, '..', 'varredura-resumo.json'), JSON.stringify(resumo, null, 1));
  console.log(`TOTAL: ${resumo.secoes} seções, ${resumo.pacotes} pacotes, ${resumo.logs} logs, ${resumo.falhas} falhas, ${resumo.minutos} min`);
}

if (process.argv.includes('--filho')) filho();
else await principal();
