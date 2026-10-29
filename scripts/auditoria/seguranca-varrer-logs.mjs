// Varredura nacional dos logs de urna para o perfil engenheiro-seguranca-urna (docs/10, regra 4).
// Uma passada por log grava, por UF:
//   <uf>.catalogo.json  catálogo de mensagens normalizadas (período × nível × aplicação × texto), com nº de eventos,
//                       nº de seções e até AMOSTRA seções de exemplo por UF;
//   <uf>.secoes.jsonl   uma linha por pacote: versões vistas, falhas de verificação de assinatura, e, para cada boot que
//                       alcança 25/10, a impressão digital das etapas de "Verificação de assinatura" do GAP, MV original × MV,
//                       resultado da verificação da mídia externa;
//   <uf>.erros.jsonl    pacotes que não puderam ser lidos.
// Cada logd.dat é tratado em separado (urna de contingência traz o log da urna original dentro do log.jez; doc 06).
// Uso: node scripts/auditoria/seguranca-varrer-logs.mjs [--turno 2] [--uf ac,sp] [--paralelo 6] [--refazer]
// Retoma: UFs com <uf>.catalogo.json já gravado são puladas (salvo --refazer).
import { fork } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, open, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const AMOSTRA = 300; // seções de exemplo guardadas por mensagem e UF
const DIA = { 1: '04/10/2026', 2: '25/10/2026' };
const INICIO_PREP = { 1: '20260101', 2: '20261005' }; // 2º turno: tudo de 05/10 em diante é preparação/votação do 2º turno

const handleEmMemoria = (buffer) => ({
  read: async (destino, deslocamento, tamanho, posicao) => ({ bytesRead: buffer.copy(destino, deslocamento, posicao, posicao + tamanho) }),
  stat: async () => ({ size: buffer.length }),
});

/** Todos os logd.dat do pacote, com a profundidade (0 = urna que gerou o pacote; 1+ = urna original de contingência). */
export async function textosDeLog(handle, profundidade = 0) {
  const textos = [];
  for (const entrada of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, entrada);
    if (entrada.nome.endsWith('.dat')) textos.push({ profundidade, nome: entrada.nome, texto: dados.toString('latin1') });
    else if (entrada.nome.endsWith('.jez') && profundidade < 3) textos.push(...(await textosDeLog(handleEmMemoria(dados), profundidade + 1)));
  }
  return textos;
}

// Strings tiradas do log com slice/split podem manter vivo o texto inteiro do log (~570 KB) enquanto existirem.
// Tudo o que fica guardado além do log corrente (cache, chaves do catálogo, dicionário) passa por `copia`.
const copia = (s) => Buffer.from(s, 'utf8').toString('utf8');

const cacheNorm = new Map();
/** Normaliza a mensagem: números → #, seriais hex → #, UF em nome de arquivo/computador → UF. */
export function normalizar(msg) {
  let n = cacheNorm.get(msg);
  if (n !== undefined) return n;
  n = copia(msg.replace(/\d+/g, '#')
    .replace(/(?<![0-9A-Za-z#])[0-9A-F#]*#[0-9A-F#]*(?![0-9A-Za-z#])/g, '#')
    .replace(/o#[a-z]{2}(?=[-#.])/g, 'o#UF')
    .replace(/\bZ[A-Z]{2}#/g, 'ZUF#'));
  if (cacheNorm.size > 200_000) cacheNorm.clear();
  cacheNorm.set(copia(msg), n);
  return n;
}

const segundosDesde = (dh) => Date.UTC(+dh.slice(6, 10), +dh.slice(3, 5) - 1, +dh.slice(0, 2), +dh.slice(11, 13), +dh.slice(14, 16), +dh.slice(17, 19)) / 1000;

/** Período da linha pela data dd/mm/aaaa. */
function periodo(data, turno) {
  if (data === DIA[turno]) return 'dia';
  if (data.slice(6, 10) !== '2026') return 'outroAno';
  const chave = data.slice(6, 10) + data.slice(3, 5) + data.slice(0, 2);
  const diaChave = DIA[turno].slice(6, 10) + DIA[turno].slice(3, 5) + DIA[turno].slice(0, 2);
  if (chave > diaChave) return 'pos';
  if (chave >= INICIO_PREP[turno]) return 'prep';
  return 'pre';
}

const sha1 = (s) => createHash('sha1').update(s).digest('hex').slice(0, 12);
const RE_ETAPA = /^Verificação de assinatura - Etapa \[(\d+)\] - \[([^\]]*)\] - \[([^\]]*)\]/;

/** Analisa um logd.dat: atualiza `contagem` (chave → eventos) e devolve o resumo de segurança do log. */
export function analisarLog(texto, turno, contagem, dicionario) {
  // retrocessos: linha com data/hora anterior à maior já vista no log (ajuste de relógio ou escrita fora de ordem).
  const r = { urnas: new Set(), modelo: null, versoes: {}, falhasVerificacao: [], boots: [], linhas: 0, linhasMalformadas: 0, retrocessos: 0, retrocessosAposAjuste: 0, retrocessosLista: [] };
  let boot = null;
  let ultimaChaveTempo = '';
  let ultimaDh = '';
  let atras = false;
  const recentes = ['', '', ''];
  const fecharBoot = () => {
    if (!boot) return;
    if (boot.alcancaDia) {
      const seq = boot.etapas.join('|');
      const h = seq ? sha1(seq) : null;
      if (h && dicionario) dicionario[h] ??= { modelo: boot.modelo, etapas: boot.etapas.map(copia) };
      r.boots.push({
        ligada: boot.ligada, ultimaLinha: boot.ultimaLinha, modelo: boot.modelo, etapas: boot.etapas.length, impressao: h,
        etapasNaoSucesso: boot.naoSucesso, mvOriginal: boot.mvOriginal, mv: boot.mv, midiaEstatica: boot.midiaEstatica,
        midiaDinamica: boot.midiaDinamica, apps: [...boot.apps], pronta: boot.pronta, votos: boot.votos, versoes: [...boot.versoes],
        turnoUe: boot.turnoUe, fase: boot.fase, modoCarga: boot.modoCarga,
      });
    }
    boot = null;
  };
  const novoBoot = (dh) => {
    fecharBoot();
    boot = {
      ligada: dh, ultimaLinha: dh, alcancaDia: false, modelo: null, etapas: [], naoSucesso: 0, mvOriginal: null, mv: null,
      midiaEstatica: null, midiaDinamica: null, apps: new Set(), pronta: false, votos: 0, versoes: new Set(), turnoUe: null, fase: null, modoCarga: null,
    };
  };

  let ini = 0;
  const L = texto.length;
  while (ini < L) {
    let fim = texto.indexOf('\n', ini);
    if (fim === -1) fim = L;
    const linha = texto.charCodeAt(fim - 1) === 13 ? texto.slice(ini, fim - 1) : texto.slice(ini, fim);
    ini = fim + 1;
    if (linha.length < 20 || linha.charCodeAt(2) !== 47) continue; // "dd/"
    const c = linha.split('\t');
    const [dh, nivel, urna, app, msg = ''] = c;
    if (urna === undefined || app === undefined || !/^\d\d\/\d\d\/\d{4} \d\d:\d\d:\d\d$/.test(dh)) { r.linhasMalformadas++; continue; } // linha corrompida (bytes binários no log)
    r.linhas++;
    const data = dh.slice(0, 10);
    const per = periodo(data, turno);
    const chaveTempo = data.slice(6, 10) + data.slice(3, 5) + data.slice(0, 2) + dh.slice(11, 19);
    if (chaveTempo < ultimaChaveTempo) {
      // Conta o evento (primeira linha que volta no tempo), não cada linha seguinte.
      if (!atras) {
        r.retrocessos++;
        const aposAjuste = [...recentes, msg].some((m) => /[Dd]ata e hora|[Hh]or[áa]rio|relógio/.test(m));
        if (aposAjuste) r.retrocessosAposAjuste++;
        if (r.retrocessosLista.length < 20) {
          r.retrocessosLista.push({ dh: copia(dh), de: copia(ultimaDh), segundos: segundosDesde(ultimaDh) - segundosDesde(dh), periodo: per, aposAjuste, anterior: normalizar(recentes[2]) });
        }
        atras = true;
      }
    } else {
      ultimaChaveTempo = chaveTempo;
      ultimaDh = dh;
      atras = false;
    }
    recentes.shift(); recentes.push(msg);
    if (!r.urnas.has(urna)) r.urnas.add(copia(urna));

    // Catálogo: tudo a partir da preparação do turno; antes disso, só ERRO e ALERTA.
    if (per !== 'pre' || nivel !== 'INFO') {
      const k = `${per}\t${nivel}\t${app}\t${normalizar(msg)}`;
      const n = contagem.get(k);
      if (n === undefined) contagem.set(copia(k), 1);
      else contagem.set(k, n + 1);
    }

    // Boot novo em "Início das operações do logd" ("Urna ligada em" sem esse marcador só abre boot se o atual já rodou
    // aplicação) e quando a etapa [1] de verificação reaparece no mesmo boot (reinício sem novo "Início das operações").
    if (app === 'LOGD' && (msg.startsWith('Início das operações do logd') || (msg.startsWith('Urna ligada em') && boot?.apps.size > 0))) novoBoot(dh);
    else if (boot && app === 'GAP' && boot.etapas.length > 0 && msg.startsWith('Verificação de assinatura - Etapa [1] ')) novoBoot(dh);
    if (!boot) novoBoot(dh);
    boot.ultimaLinha = dh;
    if (per === 'dia' || per === 'pos') boot.alcancaDia = true;
    if (msg.startsWith('Iniciando aplicação')) boot.apps.add(app);

    const v0 = msg.charCodeAt(0);
    if (v0 === 86) { // 'V'
      if (msg.startsWith('Versão')) {
        const k = `${app}\t${msg}`;
        r.versoes[k] = (r.versoes[k] ?? 0) + 1;
        if (msg.startsWith('Versão da aplicação')) boot.versoes.add(msg.slice(21).trim());
      } else if (msg.startsWith('Verificação de assinatura')) {
        const sucesso = msg.endsWith('[SUCESSO]');
        if (!sucesso && r.falhasVerificacao.length < 50) r.falhasVerificacao.push({ dh, app, msg: normalizar(msg) });
        const m = RE_ETAPA.exec(msg);
        if (m) {
          boot.etapas.push(`${m[1]}:${normalizar(m[2])}:${m[3]}`);
          if (!sucesso) boot.naoSucesso++;
        }
      }
    } else if (v0 === 73) { // 'I'
      if (msg.startsWith('Identificação do Modelo de Urna: ')) { boot.modelo = msg.slice(33).trim(); r.modelo = boot.modelo; }
      else if (msg.startsWith('Identificação de assinatura') && !/OK|SUCESSO|^Identificação de assinatura do arquivo /.test(msg) && r.falhasVerificacao.length < 50) {
        r.falhasVerificacao.push({ dh, app, msg: normalizar(msg) });
      }
    } else if (msg.startsWith('Serial da MV original da urna que está registrada na MI: ')) boot.mvOriginal = msg.slice(57).trim();
    else if (msg.startsWith('Serial da MV: ')) boot.mv = msg.slice(14).trim();
    else if (msg.startsWith('Resultado da verificação da mídia externa estática : ')) boot.midiaEstatica = msg.slice(53).trim();
    else if (msg.startsWith('Resultado da verificação da mídia externa dinâmica : ')) boot.midiaDinamica = msg.slice(53).trim();
    else if (msg.startsWith('Urna pronta para receber votos') && per === 'dia') boot.pronta = true;
    else if (msg === 'O voto do eleitor foi computado' && per === 'dia') boot.votos++;
    else if (msg.startsWith('Turno da UE: ')) boot.turnoUe = msg.slice(13).trim();
    else if (msg.startsWith('Fase da UE: ')) boot.fase = msg.slice(12).trim();
    else if (msg.startsWith('Modo de carga da UE')) boot.modoCarga = msg.slice(22).trim();
  }
  fecharBoot();
  r.urnas = [...r.urnas];
  return r;
}

const subdiretorios = async (dir) => (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();

async function processarUf(turno, uf, base, destino) {
  const catalogo = new Map(); // chave → { eventos, secoes, amostra[] }
  const dicionario = {};
  const linhas = [];
  const erros = [];
  let pacotes = 0;
  const baseUf = path.join(base, uf);
  for (const municipio of await subdiretorios(baseUf)) {
    for (const zona of await subdiretorios(path.join(baseUf, municipio))) {
      for (const secao of await subdiretorios(path.join(baseUf, municipio, zona))) {
        const dirSecao = path.join(baseUf, municipio, zona, secao);
        const vistos = new Set();
        for (const hash of await subdiretorios(dirSecao)) {
          const dir = path.join(dirSecao, hash);
          try {
            const nomes = await readdir(dir);
            const nVsc = acharArquivo(nomes, 'vsc');
            const nLog = acharArquivo(nomes, 'log');
            if (!nVsc || !nLog) continue;
            const sha256Vsc = createHash('sha256').update(await readFile(path.join(dir, nVsc))).digest('hex');
            if (vistos.has(sha256Vsc)) continue;
            vistos.add(sha256Vsc);
            pacotes++;
            const handle = await open(path.join(dir, nLog));
            let textos;
            try { textos = await textosDeLog(handle); } finally { await handle.close(); }
            const contagem = new Map();
            const logs = textos.map((t) => ({ profundidade: t.profundidade, nome: t.nome, ...analisarLog(t.texto, turno, contagem, dicionario) }));
            const id = `${uf}/${municipio}/${zona}/${secao}`;
            for (const [k, n] of contagem) {
              let e = catalogo.get(k);
              if (!e) catalogo.set(k, (e = { eventos: 0, secoes: 0, amostra: [] }));
              e.eventos += n;
              e.secoes++;
              if (e.amostra.length < AMOSTRA) e.amostra.push(n > 1 ? `${id}*${n}` : id);
            }
            linhas.push(JSON.stringify({ uf, municipio, zona, secao, hash, sha256Vsc, tipoPacote: nLog.endsWith('-logsa.jez') ? 'sa' : 'urna', logs }));
          } catch (erro) {
            erros.push({ uf, municipio, zona, secao, hash, erro: erro.message });
          }
        }
      }
    }
  }
  await mkdir(destino, { recursive: true });
  const gravar = async (nome, conteudo) => {
    const alvo = path.join(destino, nome);
    await writeFile(`${alvo}.tmp`, conteudo);
    await rename(`${alvo}.tmp`, alvo);
  };
  await gravar(`${uf}.secoes.jsonl`, linhas.length ? `${linhas.join('\n')}\n` : '');
  await gravar(`${uf}.erros.jsonl`, erros.map((e) => JSON.stringify(e)).join('\n') + (erros.length ? '\n' : ''));
  // O catálogo por último: a presença dele marca a UF como concluída.
  await gravar(`${uf}.catalogo.json`, JSON.stringify({ turno: Number(turno), uf, pacotes, erros: erros.length, geradoEm: new Date().toISOString(), dicionarioEtapas: dicionario, mensagens: Object.fromEntries(catalogo) }));
  return { uf, pacotes, erros: erros.length };
}

async function principal() {
  const { values } = parseArgs({
    options: {
      turno: { type: 'string', default: '2' }, uf: { type: 'string' }, paralelo: { type: 'string', default: '6' },
      refazer: { type: 'boolean' }, filho: { type: 'boolean' }, base: { type: 'string' }, destino: { type: 'string' },
    },
  });
  const turno = values.turno;
  const base = path.resolve(values.base ?? path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas'));
  const destino = path.resolve(values.destino ?? path.join(DIR_DADOS, 'parsed', 'auditoria', 'engenheiro-seguranca-urna', `${turno}t`));
  const ufs = values.uf ? values.uf.split(',') : UFS;
  if (values.filho) {
    process.send(await processarUf(turno, ufs[0], base, destino));
    return;
  }
  const fila = ufs.filter((uf) => values.refazer || !existsSync(path.join(destino, `${uf}.catalogo.json`)));
  console.log(`UFs a processar: ${fila.join(',') || '(nenhuma)'}`);
  const paralelo = Math.min(Number(values.paralelo), 6);
  const rodar = async () => {
    for (let uf = fila.shift(); uf; uf = fila.shift()) {
      const inicio = Date.now();
      const r = await new Promise((resolve, reject) => {
        const filho = fork(import.meta.filename, ['--filho', '--turno', turno, '--uf', uf, '--base', base, '--destino', destino], { execArgv: ['--max-old-space-size=6144'] });
        let resultado = null;
        filho.on('message', (m) => { resultado = m; });
        filho.on('error', reject);
        filho.on('exit', (codigo) => (codigo === 0 && resultado ? resolve(resultado) : reject(new Error(`${uf}: código ${codigo}`))));
      }).catch((erro) => ({ uf, erro: erro.message }));
      console.log(`${uf}: ${r.erro ?? `${r.pacotes} pacotes, ${r.erros} erro(s)`} (${((Date.now() - inicio) / 1000).toFixed(0)} s)`);
    }
  };
  await Promise.all(Array.from({ length: paralelo }, rodar));
}

if (import.meta.filename === path.resolve(process.argv[1] ?? '')) await principal();
