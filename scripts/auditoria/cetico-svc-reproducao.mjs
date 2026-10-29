// Revisor cético, achado software-verificacao-caminhos (svc), lente reprodução e código.
// Refaz de forma independente o número central do engenheiro-seguranca-urna (doc 04): em todo boot de votação do 2º turno,
// as etapas de "Verificação de assinatura" estão completas e com [SUCESSO]? Não usa o código nem as saídas do autor.
// Diferenças de método em relação ao autor (de propósito):
//   - o pacote de cada seção vem do banco (secao.hash, cópia de leitura), não da varredura de todos os diretórios;
//   - o trecho de execução ("corrida") começa em "Início das operações do logd" ou na etapa [1]; não usa "Urna ligada em";
//   - TODA linha é classificada: data/hora válida + 4 campos, linha que começa com "dd/" mas é inválida (a regra extra
//     que o autor aplicou só em MG), linha que não começa com "dd/" (descartada em silêncio pelo autor em todas as UFs);
//   - cada voto (linha "O voto do eleitor foi computado" de 25/10) é ligado à verificação ativa na hora em que ocorreu;
//   - logd.dat idênticos dentro do pacote são contados como cópia e entram uma vez só na contagem por voto.
// Uso: node scripts/auditoria/cetico-svc-reproducao.mjs [--uf ac,mg] [--saida data/parsed/auditoria/cetico/svc]
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, open, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { values } = parseArgs({ options: { uf: { type: 'string' }, saida: { type: 'string' }, refazer: { type: 'boolean' } } });
const saida = path.resolve(values.saida ?? path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'svc'));
const ufs = values.uf ? values.uf.split(',') : UFS;
const BASE = path.join(DIR_DADOS, 'raw', '2t', 'urnas');
const DIA = '25/10/2026';
const RE_DH = /^\d\d\/\d\d\/\d{4} \d\d:\d\d:\d\d$/;
const RE_ETAPA = /^Verificação de assinatura - Etapa \[(\d+)\] - \[([^\]]*)\] - \[([^\]]*)\]/;
const sha1 = (b) => createHash('sha1').update(b).digest('hex');
const norm = (s) => s.replace(/\d+/g, '#').replace(/o#[a-z]{2}(?=[-#.])/g, 'o#UF');

const memEntrada = (buf) => ({
  read: async (dst, off, len, pos) => ({ bytesRead: buf.copy(dst, off, pos, pos + len) }),
  stat: async () => ({ size: buf.length }),
});
async function logsDoJez(handle, prof = 0, saidaLista = []) {
  for (const e of await listarEntradas(handle)) {
    const d = await lerEntrada(handle, e);
    if (/\.dat$/i.test(e.nome)) saidaLista.push({ prof, nome: e.nome, buf: d });
    else if (/\.jez$/i.test(e.nome) && prof < 4) await logsDoJez(memEntrada(d), prof + 1, saidaLista);
    else saidaLista.push({ prof, nome: e.nome, outro: true });
  }
  return saidaLista;
}

function analisar(texto, contar) {
  const corridas = []; // corrida = trecho com uma sequência de verificação (ou sem nenhuma)
  let c = null;
  const nova = (dh, motivo) => { c = { dh, motivo, etapas: [], erro: 0, votos: 0, pronta: false, votosAntesEtapa: 0, contMV: false, cargaDigitadaDia: false, scue: false }; corridas.push(c); };
  const L = { total: 0, validas: 0, ddInvalida: 0, semDd: 0, vazias: 0 };
  const exInval = [];
  const versoes = {};
  const errosMsg = [];
  let ini = 0;
  while (ini < texto.length) {
    let fim = texto.indexOf('\n', ini);
    if (fim === -1) fim = texto.length;
    let linha = texto.slice(ini, fim);
    ini = fim + 1;
    if (linha.endsWith('\r')) linha = linha.slice(0, -1);
    L.total++;
    if (linha.length === 0) { L.vazias++; continue; }
    if (!(linha.length >= 20 && linha.charCodeAt(2) === 47)) { L.semDd++; if (exInval.length < 5) exInval.push(['semDd', linha.slice(0, 80)]); continue; }
    // campos por posição da tabulação (equivale a split: dh, nível, urna, aplicação, mensagem, hash)
    const t1 = linha.indexOf('\t');
    const t2 = t1 < 0 ? -1 : linha.indexOf('\t', t1 + 1);
    const t3 = t2 < 0 ? -1 : linha.indexOf('\t', t2 + 1);
    const dh = t1 < 0 ? linha : linha.slice(0, t1);
    if (t3 < 0 || !RE_DH.test(dh)) { L.ddInvalida++; if (exInval.length < 5) exInval.push(['ddInvalida', linha.slice(0, 80)]); continue; }
    L.validas++;
    const t4 = linha.indexOf('\t', t3 + 1);
    const t5 = t4 < 0 ? -1 : linha.indexOf('\t', t4 + 1);
    const nivel = linha.slice(t1 + 1, t2);
    const app = t4 < 0 ? linha.slice(t3 + 1) : linha.slice(t3 + 1, t4);
    const msg = t4 < 0 ? '' : (t5 < 0 ? linha.slice(t4 + 1) : linha.slice(t4 + 1, t5));
    const dia = dh.startsWith(DIA);
    if (app === 'LOGD' && msg.startsWith('Início das operações do logd')) nova(dh, 'logd');
    const m = msg.startsWith('Verificação de assinatura - Etapa') ? RE_ETAPA.exec(msg) : null;
    if (m && m[1] === '1' && c && c.etapas.length > 0) nova(dh, 'etapa1');
    if (!c) nova(dh, 'inicio');
    if (m) { c.etapas.push(`${m[1]}:${norm(m[2])}:${m[3]}`); if (m[3] !== 'SUCESSO') c.erro++; }
    if (msg.startsWith('Versão da aplicação')) { const k = `${app} | ${msg.slice(msg.indexOf(':') + 1).trim()}`; versoes[k] = (versoes[k] ?? 0) + 1; }
    if (dia && msg === 'O voto do eleitor foi computado') { c.votos++; if (c.etapas.length === 0) c.votosAntesEtapa++; }
    if (dia && msg.startsWith('Urna pronta para receber votos')) c.pronta = true;
    if (msg.startsWith('Início do procedimento de contingência de MV')) c.contMV = true;
    if (app === 'SCUE') c.scue = true;
    if ((nivel === 'ERRO' || nivel === 'WHAT' || msg.endsWith(' - [ERRO]')) && /assinatura|integridade/i.test(msg)) errosMsg.push([dh, nivel, app, msg.slice(0, 140)]);
    if (app === 'SCUE' && msg.includes('digitada pelo operador') && msg.includes(DIA)) c.cargaDigitadaDia = true;
  }
  if (contar) contar(L);
  return { corridas, L, exInval, versoes, errosMsg };
}

async function processarUf(db, uf) {
  const secoes = db.prepare("SELECT municipio, zona, secao, hash, comparecimento, tipo_urna, tipo_arquivo, modelo_urna FROM secao WHERE turno = 2 AND uf = ? AND hash IS NOT NULL").all(uf);
  const r = {
    uf, secoesComHash: secoes.length, pacotes: 0, semDiretorio: [], semLog: [], erroLeitura: [], logs: 0, logsCopiaIdentica: 0, outrosNoJez: 0,
    linhas: { total: 0, validas: 0, ddInvalida: 0, semDd: 0, vazias: 0 }, logsComInvalida: [], versoes: {},
    corridasVotacao: 0, corridasVotacaoUnicas: 0, votosLog: 0, votosLogUnicos: 0, votosAntesEtapa: 0,
    porAssinatura: {}, // `${modelo}|${sha1(etapas)}` -> {n, votos, nEtapas, erro, exemplos[]}
    dicionario: {}, cargaDigitadaDia: [], logVotosMenorQueBu: [], errosAssinatura: [],
  };
  for (const s of secoes) {
    const id = `${uf}/${s.municipio}/${s.zona}/${s.secao}`;
    const dirSecao = path.join(BASE, uf, s.municipio, s.zona, s.secao);
    let nomeHash;
    try { nomeHash = (await readdir(dirSecao)).find((n) => n.startsWith(s.hash)); } catch { nomeHash = undefined; }
    if (!nomeHash) { r.semDiretorio.push(id); continue; }
    const dir = path.join(dirSecao, nomeHash);
    const nomes = await readdir(dir);
    const nLog = nomes.find((n) => n.endsWith('-log.jez') || n.endsWith('-logsa.jez'));
    const nVsc = nomes.find((n) => n.endsWith('.vsc'));
    if (!nLog) { r.semLog.push(id); continue; }
    r.pacotes++;
    let modelo = null;
    let lista;
    try {
      const h = await open(path.join(dir, nLog));
      try { lista = await logsDoJez(h); } finally { await h.close(); }
    } catch (e) { r.erroLeitura.push({ id, erro: e.message }); continue; }
    if (nVsc) { /* modelo vem do log abaixo */ }
    const vistos = new Set();
    let votosUnicosPacote = 0;
    for (const lg of lista) {
      if (lg.outro) { r.outrosNoJez++; continue; }
      r.logs++;
      const hh = sha1(lg.buf);
      const copia = vistos.has(hh);
      if (copia) r.logsCopiaIdentica++;
      vistos.add(hh);
      const texto = lg.buf.toString('latin1');
      const mm = /Identificação do Modelo de Urna: (\S+)/.exec(texto);
      modelo = mm ? mm[1] : 'sem-modelo';
      const a = analisar(texto, (L) => { for (const k in L) r.linhas[k] += L[k]; });
      if (a.L.ddInvalida > 0) r.logsComInvalida.push({ id, prof: lg.prof, ddInvalida: a.L.ddInvalida, exemplos: a.exInval });
      for (const [k, n] of Object.entries(a.versoes)) r.versoes[k] = (r.versoes[k] ?? 0) + n;
      const iErro = a.corridas.findIndex((c) => c.erro > 0);
      if (iErro >= 0 || a.errosMsg.length) {
        r.errosAssinatura.push({
          id, prof: lg.prof, copia, nMsgs: a.errosMsg.length, msgs: a.errosMsg.slice(0, 8),
          corridas: a.corridas.slice(Math.max(0, iErro)).slice(0, 60)
            .map((c) => [c.dh, c.etapas.length, c.erro, c.votos, c.pronta ? 1 : 0, c.scue ? 1 : 0, c.etapas.length ? sha1(c.etapas.join('|')).slice(0, 12) : 'nenhuma']),
        });
      }
      for (const c of a.corridas) {
        if (c.cargaDigitadaDia) r.cargaDigitadaDia.push({ id, prof: lg.prof, dh: c.dh, votos: c.votos, tipo: s.tipo_urna });
        if (!(c.pronta || c.votos > 0)) continue;
        r.corridasVotacao++; r.votosLog += c.votos; r.votosAntesEtapa += c.votosAntesEtapa;
        if (!copia) { r.corridasVotacaoUnicas++; r.votosLogUnicos += c.votos; votosUnicosPacote += c.votos; }
        const seq = c.etapas.join('|');
        const hs = seq ? sha1(seq).slice(0, 12) : 'nenhuma';
        if (hs !== 'nenhuma') r.dicionario[hs] ??= c.etapas;
        const k = `${modelo}|${hs}`;
        const e = (r.porAssinatura[k] ??= { n: 0, nUnicas: 0, votos: 0, nEtapas: c.etapas.length, erro: c.erro, contMV: 0, exemplos: [] });
        e.n++; if (!copia) e.nUnicas++; e.votos += copia ? 0 : c.votos; if (c.contMV) e.contMV++;
        if (e.exemplos.length < 40) e.exemplos.push(`${id}@${c.dh}#${c.votos}${copia ? '(copia)' : ''}${c.contMV ? '(contMV)' : ''}`);
      }
    }
    if (s.comparecimento != null && votosUnicosPacote < s.comparecimento && s.tipo_arquivo !== 'saManual') r.logVotosMenorQueBu.push({ id, bu: s.comparecimento, log: votosUnicosPacote, tipo: s.tipo_urna });
  }
  return r;
}

const { db, fonte } = await abrirLeitura();
console.error(`banco: ${fonte}`);
await mkdir(saida, { recursive: true });
for (const uf of ufs) {
  const alvo = path.join(saida, `${uf}.json`);
  if (!values.refazer && existsSync(alvo)) { console.log(`${uf}: já feito`); continue; }
  const t0 = Date.now();
  const r = await processarUf(db, uf);
  await writeFile(alvo, JSON.stringify(r));
  console.log(`${uf}: ${r.pacotes} pacotes, ${r.logs} logs, ${r.corridasVotacao} corridas de votação, ddInvalida ${r.linhas.ddInvalida}, semDd ${r.linhas.semDd}, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
