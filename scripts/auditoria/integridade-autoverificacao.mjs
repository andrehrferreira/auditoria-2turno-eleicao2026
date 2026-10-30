import { fork } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { hashDiretorio } from '../../src/vsc.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

// Auditor E (integridade nacional). Autoverificação do software registrada no log da própria urna.
// A cada inicialização a urna confere assinaturas dos pacotes do sistema ("Verificação de assinatura - Etapa [n] -
// [pacote] - [SUCESSO|ERRO]"). Em erro, o aplicativo grava "Erro na verificação de integridade do sistema. Desligue a
// urna e faça uma nova carga." e o detalhe ("Falha ao validar assinatura TSE | pacote: (...) | Erro SAVD: (n - arquivo)").
// Para cada log (inclusive o aninhado da contingência), cada erro vira um evento com: data, pacote, arquivo SAVD,
// se houve nova carga depois ("Urna carregada com sucesso" ou "Código de carga ... gravado"), se a mesma etapa
// passou na inicialização seguinte, e quantos votos foram computados depois do erro até a próxima carga.
// Também conta, por mensagem normalizada, as linhas de nível ERRO que mencionam assinatura/integridade: linhas, seções,
// seções com a mensagem na véspera ou no dia da votação (03, 04, 24 ou 25/10) e até 5 exemplos.
// Atenção: a carga parece reiniciar o log, então um erro seguido de nova carga pode não aparecer no log publicado.
//
// Uso: node scripts/auditoria/integridade-autoverificacao.mjs --turno 2 [--uf sp] [--procs 10]
// Saída: data/parsed/auditoria/integridade/<t>t/autoverificacao.jsonl (eventos) e autoverificacao-resumo.json

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'integridade');
const subdirs = async (dir) => (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
const handleEmMemoria = (buffer) => ({
  read: async (destino, deslocamento, tamanho, posicao) => ({ bytesRead: buffer.copy(destino, deslocamento, posicao, posicao + tamanho) }),
  stat: async () => ({ size: buffer.length }),
});
async function textosDeLog(handle, profundidade = 0) {
  const textos = [];
  for (const entrada of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, entrada);
    if (entrada.nome === 'logd.dat') textos.push({ profundidade, texto: dados.toString('latin1') });
    else if (entrada.nome.endsWith('.jez') && profundidade < 3) textos.push(...(await textosDeLog(handleEmMemoria(dados), profundidade + 1)));
  }
  return textos;
}

// Véspera e dia da votação dos dois turnos.
const VESPERA_OU_DIA = new Set(['03/10/2026', '04/10/2026', '24/10/2026', '25/10/2026']);
const RE_VERIF = /^Verificação de assinatura - Etapa \[(\d+)\] - \[([^\]]+)\] - \[([^\]]+)\]/;
const relevante = (msg) => /assinatura|integridade|SAVD|Assinatura|Integridade/.test(msg);
const normalizar = (msg) => msg.replace(/\d{2}\/\d{2}\/\d{4}/g, 'D').replace(/\[[\d.,:\-/ ]+\]/g, '[#]').replace(/\b[0-9A-F]{8,}\b/g, 'H').replace(/\d+/g, '#');

/** Eventos de autoverificação com erro em um logd.dat. */
export function analisarLog(texto) {
  const linhas = texto.split('\n').map((l) => l.replace(/\r$/, '').split('\t')).filter((c) => c.length >= 5);
  const eventos = [];
  const errosPorMensagem = {};
  for (let i = 0; i < linhas.length; i++) {
    const [dataHora, nivel, urna, app, msg] = linhas[i];
    if (nivel === 'ERRO' && relevante(msg)) {
      const e = (errosPorMensagem[`${app} ${normalizar(msg)}`] ??= { linhas: 0, dias: new Set() });
      e.linhas++;
      e.dias.add(dataHora.slice(0, 10));
    }
    const m = RE_VERIF.exec(msg);
    if (!m || m[3] === 'SUCESSO') continue;
    const [, etapa, pacote, resultado] = m;
    const ev = { dataHora, urna, etapa: Number(etapa), pacote, resultado, detalhe: null, savd: null, novaCarga: null, mesmaEtapaDepois: null, proximaInicializacao: null,
      votosDepoisSemNovaCarga: 0, votosDepoisPorDia: {}, urnaProntaDepoisSemNovaCarga: false };
    for (let j = i + 1; j < Math.min(linhas.length, i + 6); j++) {
      const d = linhas[j][4];
      const s = /pacote: \(([^)]*)\) \| Erro SAVD: \(([^)]*)\)/.exec(d);
      if (s) {
        ev.detalhe = d.slice(0, 300);
        ev.savd = s[2];
        break;
      }
    }
    let ligou = false;
    for (let j = i + 1; j < linhas.length; j++) {
      const [dh, , , , d] = linhas[j];
      if (d.startsWith('Urna ligada em')) {
        ligou = true;
        ev.proximaInicializacao ??= dh;
      }
      if (d.startsWith('Urna carregada com sucesso') || (d.startsWith('Código de carga ') && d.includes('gravado'))) {
        ev.novaCarga = dh;
        break;
      }
      const v = RE_VERIF.exec(d);
      if (ligou && v && v[2] === pacote && ev.mesmaEtapaDepois === null) ev.mesmaEtapaDepois = `${dh} ${v[3]}`;
      if (d === 'Urna pronta para receber votos') ev.urnaProntaDepoisSemNovaCarga = true;
      if (d === 'O voto do eleitor foi computado') {
        ev.votosDepoisSemNovaCarga++;
        ev.votosDepoisPorDia[dh.slice(0, 10)] = (ev.votosDepoisPorDia[dh.slice(0, 10)] ?? 0) + 1;
      }
    }
    eventos.push(ev);
  }
  return { eventos, errosPorMensagem };
}

async function pacotesDaSecao(dir) {
  let aux = null;
  try {
    aux = JSON.parse(await readFile(path.join(dir, 'aux.json'), 'utf8'));
  } catch {
    aux = null;
  }
  if (aux) return (aux.hashes ?? []).filter((h) => h.hash && h.hash !== '0' && (h.arq ?? []).some((a) => a.nm)).map((h) => h.hash);
  const ok = [];
  for (const h of await subdirs(dir)) {
    const nomes = await readdir(path.join(dir, h));
    const v = acharArquivo(nomes, 'vsc');
    if (v && hashDiretorio(await readFile(path.join(dir, h, v))) === h) ok.push(h);
  }
  return ok;
}

async function filho() {
  const turno = Number(process.env.INTEGRIDADE_TURNO);
  const base = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas');
  process.on('message', async ({ uf, municipio, zona }) => {
    const eventos = [];
    const erros = {}; // mensagem → { linhas, secoes, secoesVesperaOuDia, exemplos }
    let logs = 0;
    let falhasLeitura = 0;
    let secoesLidas = 0;
    let secoesSemPacote = 0;
    let pacotes = 0;
    for (const secao of await subdirs(path.join(base, uf, municipio, zona))) {
      const dir = path.join(base, uf, municipio, zona, secao);
      secoesLidas++;
      try {
        const hs = await pacotesDaSecao(dir);
        if (!hs.length) secoesSemPacote++;
        pacotes += hs.length;
        for (const h of hs) {
          const nomes = await readdir(path.join(dir, h));
          const nomeLog = acharArquivo(nomes, 'log');
          if (!nomeLog) continue;
          const textos = await textosDeLog(handleEmMemoria(await readFile(path.join(dir, h, nomeLog))));
          for (const t of textos) {
            logs++;
            const r = analisarLog(t.texto);
            for (const [k, e] of Object.entries(r.errosPorMensagem)) {
              const a = (erros[k] ??= { linhas: 0, secoes: 0, secoesVesperaOuDia: 0, exemplos: [], _vistas: new Set() });
              a.linhas += e.linhas;
              const onde = `${uf}/${municipio}/${zona}/${secao}`;
              if (!a._vistas.has(onde)) {
                a._vistas.add(onde);
                a.secoes++;
                if ([...e.dias].some((d) => VESPERA_OU_DIA.has(d))) a.secoesVesperaOuDia++;
                if (a.exemplos.length < 5) a.exemplos.push(`${onde} ${[...e.dias].sort().join(',')}`);
              }
            }
            for (const ev of r.eventos) eventos.push({ onde: `${uf}/${municipio}/${zona}/${secao}`, hash: h, profundidade: t.profundidade, ...ev });
          }
        }
      } catch (erro) {
        falhasLeitura++;
        eventos.push({ onde: `${uf}/${municipio}/${zona}/${secao}`, erroLeitura: erro.message });
      }
    }
    for (const e of Object.values(erros)) delete e._vistas;
    process.send({ uf, municipio, zona, eventos, erros, logs, falhasLeitura, secoesLidas, secoesSemPacote, pacotes });
  });
  process.send({ pronto: true });
}

async function principal() {
  const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, uf: { type: 'string' }, procs: { type: 'string', default: '10' } } });
  const turno = Number(values.turno);
  const procs = Math.min(10, Math.max(1, Number(values.procs)));
  const base = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas');
  const dirSaida = path.join(SAIDA, `${turno}t`);
  await mkdir(dirSaida, { recursive: true });
  const ufs = values.uf ? values.uf.split(',') : await subdirs(base);
  const fila = [];
  for (const uf of ufs) for (const municipio of await subdirs(path.join(base, uf))) for (const zona of await subdirs(path.join(base, uf, municipio))) fila.push({ uf, municipio, zona });
  const saida = createWriteStream(path.join(dirSaida, 'autoverificacao.jsonl'));
  const resumo = { turno, secoesLidas: 0, secoesSemPacote: 0, pacotes: 0, logs: 0, falhasLeitura: 0, eventos: 0, secoes: new Set(), porPacote: {}, porSavd: {}, porResultado: {}, novaCarga: { sim: 0, nao: 0 },
    mesmaEtapaDepois: {}, comVotosSemNovaCarga: 0, votosSemNovaCarga: 0, votosDepoisNoDia: { '04/10/2026': 0, '25/10/2026': 0 }, eventosVesperaOuDia: 0, porUf: {}, porData: {}, errosPorMensagem: {} };
  const inc = (o, k, n = 1) => {
    o[k] = (o[k] ?? 0) + n;
  };
  const inicio = Date.now();
  await new Promise((resolve) => {
    let ativos = 0;
    for (let i = 0; i < Math.min(procs, fila.length); i++) {
      ativos++;
      const f = fork(import.meta.filename, ['--filho'], { env: { ...process.env, INTEGRIDADE_TURNO: String(turno) } });
      const proximo = () => {
        const u = fila.shift();
        if (u) f.send(u);
        else f.disconnect();
      };
      f.on('message', (m) => {
        if (m.pronto) return proximo();
        resumo.logs += m.logs;
        resumo.secoesLidas += m.secoesLidas;
        resumo.secoesSemPacote += m.secoesSemPacote;
        resumo.pacotes += m.pacotes;
        resumo.falhasLeitura += m.falhasLeitura;
        for (const [k, e] of Object.entries(m.erros)) {
          const a = (resumo.errosPorMensagem[k] ??= { linhas: 0, secoes: 0, secoesVesperaOuDia: 0, exemplos: [] });
          a.linhas += e.linhas;
          a.secoes += e.secoes;
          a.secoesVesperaOuDia += e.secoesVesperaOuDia;
          for (const x of e.exemplos) if (a.exemplos.length < 5) a.exemplos.push(x);
        }
        for (const ev of m.eventos) {
          saida.write(`${JSON.stringify(ev)}\n`);
          if (ev.erroLeitura) continue;
          resumo.eventos++;
          resumo.secoes.add(ev.onde);
          inc(resumo.porPacote, ev.pacote);
          inc(resumo.porSavd, (ev.savd ?? 'sem detalhe').replace(/^\d+ - /, ''));
          inc(resumo.porResultado, ev.resultado);
          resumo.novaCarga[ev.novaCarga ? 'sim' : 'nao']++;
          inc(resumo.mesmaEtapaDepois, ev.mesmaEtapaDepois ? ev.mesmaEtapaDepois.split(' ').at(-1) : 'sem nova verificação');
          if (ev.votosDepoisSemNovaCarga > 0) {
            resumo.comVotosSemNovaCarga++;
            resumo.votosSemNovaCarga += ev.votosDepoisSemNovaCarga;
          }
          for (const d of Object.keys(resumo.votosDepoisNoDia)) resumo.votosDepoisNoDia[d] += ev.votosDepoisPorDia[d] ?? 0;
          if (VESPERA_OU_DIA.has(ev.dataHora.slice(0, 10))) resumo.eventosVesperaOuDia++;
          inc(resumo.porUf, ev.onde.slice(0, 2));
          inc(resumo.porData, ev.dataHora.slice(0, 10));
        }
        proximo();
      });
      f.on('exit', () => {
        if (--ativos === 0) resolve();
      });
    }
  });
  await new Promise((ok) => saida.end(ok));
  const final = { ...resumo, secoes: resumo.secoes.size, segundos: Math.round((Date.now() - inicio) / 1000) };
  await writeFile(path.join(dirSaida, 'autoverificacao-resumo.json'), JSON.stringify(final, null, 1));
  console.log(JSON.stringify({ ...final, errosPorMensagem: Object.keys(final.errosPorMensagem).length }, null, 1));
}

if (process.argv.includes('--filho')) await filho();
else if (import.meta.filename === path.resolve(process.argv[1] ?? '')) await principal();
