import { fork } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, open, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS, UFS } from './config.js';
import { acharArquivo, lerBu } from './lacres.js';
import { lerEntrada, listarEntradas } from './zip.js';

// Perfil de cada seção: uma linha JSON por pacote de urna com o que as análises do checklist (doc 07) precisam,
// tirado do BU e do log do dia da votação. Os arquivos são públicos (doc 05, regra 6a): o título de cada mesário
// é gravado (registro, liberações feitas, encerramento) para permitir rastrear o mesmo mesário entre seções e turnos.
// Horários ficam no relógio LOCAL da urna (doc 06); a conversão para Brasília é feita na análise.

export const DIA_VOTACAO = { 1: '04/10/2026', 2: '25/10/2026' };
const FAIXAS_INTERVALO = [5, 10, 15, 20, 30, 45, 60]; // limites superiores em segundos; última faixa = acima de 60

const segundos = (hhmmss) => {
  const [h, m, s] = hhmmss.split(':').map(Number);
  return h * 3600 + m * 60 + s;
};

function histograma(valores) {
  const faixas = new Array(FAIXAS_INTERVALO.length + 1).fill(0);
  for (const v of valores) {
    const i = FAIXAS_INTERVALO.findIndex((limite) => v < limite);
    faixas[i === -1 ? FAIXAS_INTERVALO.length : i]++;
  }
  return faixas;
}

/** Extrai do texto do log (logd.dat) os indicadores do dia `dia` (dd/mm/aaaa). */
export function perfilLog(texto, dia) {
  const p = {
    modeloUrna: null, serialMR: null, serialMV: null,
    urnaPronta: null, inicioEncerramento: null, primeiroVoto: null, ultimoVoto: null,
    votosComputados: 0, votosForaDaJanela: 0, votosPorHoraLocal: new Array(24).fill(0),
    habilitadosBiometria: 0, anoNascimentoSemBiometria: 0, dadoPessoalConfere: 0, habilitadosPeloMesario: 0,
    jaVotou: 0, eleitorNaoEncontrado: 0, impedidos: 0, suspensosPeloMesario: 0,
    reiniciosDuranteVotacao: 0, erros: 0, alertas: 0,
    mesarios: { registros: [], liberacoesPorMesario: {}, tituloEncerramento: null },
    maiorRajadaSemBiometria10min: 0, semBiometriaUltimaHora: 0,
    intervaloEntreVotos: { minimo: null, faixas: null }, tempoHabilitacaoAteVoto: { minimo: null, faixas: null },
  };
  const porMesario = new Map();
  const semBiometria = [];
  const votos = [];
  const tempos = [];
  let ultimaHabilitacao = null;
  let votando = false;
  const novoCiclo = () => ({ biometria: false, anoNascimento: null, dadoPessoal: null, mesario: null });
  let ciclo = novoCiclo();
  let momentoRegistro = null;
  const eleitorDaSecao = new Map();

  for (const linha of texto.split('\n')) {
    const [dataHora, nivel, , , mensagem = ''] = linha.split('\t');
    if (!dataHora) continue;
    // Seriais e modelo valem da última inicialização até o dia (a urna pode ter sido ligada na véspera)
    if (mensagem.startsWith('Identificação do Modelo de Urna: ')) p.modeloUrna = mensagem.slice(33).trim();
    else if (mensagem.startsWith('Número de série da MR: ')) p.serialMR = mensagem.slice(23).trim();
    else if (mensagem.startsWith('Serial da MV: ')) p.serialMV = mensagem.slice(14).trim();
    if (!dataHora.startsWith(dia)) continue;
    const t = segundos(dataHora.slice(11, 19));
    if (nivel === 'ERRO') p.erros++;
    else if (nivel === 'ALERTA') p.alertas++;

    if (mensagem.startsWith('Urna pronta para receber votos')) {
      p.urnaPronta ??= t;
      votando = true;
    } else if (mensagem.startsWith('Inicio do Encerramento')) {
      p.inicioEncerramento = t;
      votando = false;
    } else if (mensagem.startsWith('Urna ligada em') && votando) {
      p.reiniciosDuranteVotacao++;
    } else if (mensagem === 'Aguardando digitação do identificador do eleitor') {
      ciclo = novoCiclo();
    } else if (mensagem === 'O voto do eleitor foi computado') {
      // Habilitação conta só quando termina em voto, como no detalhamento do BU
      p.votosComputados++;
      if (!votando) p.votosForaDaJanela++;
      p.votosPorHoraLocal[Math.floor(t / 3600)]++;
      votos.push(t);
      if (ultimaHabilitacao !== null) tempos.push(t - ultimaHabilitacao);
      ultimaHabilitacao = null;
      if (ciclo.biometria) p.habilitadosBiometria++;
      else if (ciclo.anoNascimento !== null) {
        p.anoNascimentoSemBiometria++;
        semBiometria.push(ciclo.anoNascimento);
      } else if (ciclo.dadoPessoal !== null) {
        p.dadoPessoalConfere++;
        semBiometria.push(ciclo.dadoPessoal);
        if (ciclo.mesario) {
          p.habilitadosPeloMesario++;
          porMesario.set(ciclo.mesario, (porMesario.get(ciclo.mesario) ?? 0) + 1);
        }
      }
      ciclo = novoCiclo();
    } else if (mensagem === 'Eleitor foi habilitado') {
      ultimaHabilitacao = t;
    } else if (mensagem.includes('Tipo de habilitação do eleitor [biométrica]')) {
      ciclo.biometria = true;
    } else if (mensagem.startsWith('Ano de nascimento digitado é igual ao do cadastro')) {
      ciclo.anoNascimento = t;
    } else if (mensagem === 'Dado digitado confere') {
      ciclo.dadoPessoal = t;
    } else if (mensagem === 'O eleitor identificado já votou') {
      p.jaVotou++;
    } else if (mensagem === 'Eleitor não encontrado para o identificador informado') {
      p.eleitorNaoEncontrado++;
    } else if (mensagem.startsWith('Eleitor impedido')) {
      p.impedidos++;
    } else if (mensagem === 'Eleitor foi suspenso pelo mesário') {
      p.suspensosPeloMesario++;
    } else if (mensagem.startsWith('Registrando mesários antes da votação')) {
      momentoRegistro = 'antes';
    } else if (mensagem.startsWith('Registrando mesários após a votação')) {
      momentoRegistro = 'depois';
    } else if (mensagem.startsWith('Título digitado para encerramento: ')) {
      p.mesarios.tituloEncerramento = mensagem.slice(35).trim();
    } else {
      let m = /^Mesário (\d+) habilitou o eleitor/.exec(mensagem);
      if (m) ciclo.mesario = m[1];
      else if ((m = /^Mesário (\d+) (não é|é) eleitor da seção/.exec(mensagem))) eleitorDaSecao.set(m[1], m[2] === 'é');
      else if ((m = /^Mesário (\d+) registrado/.exec(mensagem))) {
        p.mesarios.registros.push({ titulo: m[1], momento: momentoRegistro, hora: t, eleitorDaSecao: eleitorDaSecao.get(m[1]) ?? null });
      }
    }
  }

  p.primeiroVoto = votos[0] ?? null;
  p.ultimoVoto = votos.at(-1) ?? null;
  p.mesarios.liberacoesPorMesario = Object.fromEntries([...porMesario].sort((a, b) => b[1] - a[1]));
  for (let i = 0, j = 0; i < semBiometria.length; i++) {
    while (semBiometria[i] - semBiometria[j] > 600) j++;
    p.maiorRajadaSemBiometria10min = Math.max(p.maiorRajadaSemBiometria10min, i - j + 1);
  }
  if (p.inicioEncerramento !== null) p.semBiometriaUltimaHora = semBiometria.filter((t) => t >= p.inicioEncerramento - 3600).length;
  const intervalos = votos.slice(1).map((t, i) => t - votos[i]);
  p.intervaloEntreVotos = { minimo: intervalos.length ? Math.min(...intervalos) : null, faixas: histograma(intervalos) };
  p.tempoHabilitacaoAteVoto = { minimo: tempos.length ? Math.min(...tempos) : null, faixas: histograma(tempos) };
  return p;
}

/** Resumo do BU: identificação, urna, comparecimento, detalhamento e votos por eleição/cargo/votável. */
export function perfilBu(buBytes) {
  const bu = lerBu(buBytes);
  const nomeVoto = { 1: null, 2: 'branco', 3: 'nulo', 4: 'legenda', 5: 'semCandidato' };
  return {
    urna: bu.urna,
    dataHoraAbertura: bu.dataHoraAbertura,
    dataHoraEncerramento: bu.dataHoraEncerramento,
    qtdEleitoresCompareceram: bu.qtdEleitoresCompareceram,
    detalhamentoComparecimento: bu.detalhamentoComparecimento,
    eleicoes: bu.eleicoes.map((e) => ({
      idEleicao: e.idEleicao,
      aptos: e.qtdEleitoresAptos, aptosSecao: e.qtdEleitoresAptosSecao, aptosTTE: e.qtdEleitoresAptosTTE,
      cargos: e.cargos.map((c) => ({
        codigoCargo: c.codigoCargo,
        votos: Object.fromEntries(c.votaveis.map((v) => [nomeVoto[v.tipoVoto] ?? String(v.codigo), v.quantidade])),
      })),
    })),
  };
}

// ZIP aninhado lido da memória: o leitor de src/zip.js só usa read() e stat().
const handleEmMemoria = (buffer) => ({
  read: async (destino, deslocamento, tamanho, posicao) => ({ bytesRead: buffer.copy(destino, deslocamento, posicao, posicao + tamanho) }),
  stat: async () => ({ size: buffer.length }),
});

async function textosDeLog(handle, profundidade = 0) {
  const textos = [];
  for (const entrada of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, entrada);
    if (entrada.nome === 'logd.dat') textos.push(dados.toString('latin1'));
    // Urna de contingência: o log da urna original que quebrou vem dentro, como outro .jez (ex.: 0227604025102026133917-01.jez)
    else if (entrada.nome.endsWith('.jez') && profundidade < 3) textos.push(...(await textosDeLog(handleEmMemoria(dados), profundidade + 1)));
  }
  return textos;
}

const chaveTempo = (linha) => `${linha.slice(6, 10)}${linha.slice(3, 5)}${linha.slice(0, 2)}${linha.slice(11, 19)}`;

/** Lê todos os logs do pacote e junta as linhas em ordem de data/hora (ordem estável dentro do mesmo segundo). */
export async function lerLogs(caminho) {
  const handle = await open(caminho);
  try {
    const textos = await textosDeLog(handle);
    if (textos.length === 0) throw new Error('log.jez sem logd.dat');
    // Um log só já está em ordem; com mais de um (contingência), ordena pela data/hora calculada uma vez por linha.
    if (textos.length === 1) return { texto: textos[0], quantidade: 1 };
    const linhas = textos.flatMap((t) => t.split('\n').filter((l) => /^\d\d\/\d\d\/\d{4} /.test(l)))
      .map((l, i) => [chaveTempo(l), i, l])
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]))
      .map(([, , l]) => l);
    return { texto: linhas.join('\n'), quantidade: textos.length };
  } finally {
    await handle.close();
  }
}

const subdiretorios = async (dir) => (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();

/** Perfis de todas as seções de uma UF (base/{mun}/{zona}/{secao}/{hash}/). Cópias idênticas do pacote contam uma vez. */
export async function perfisUf(baseUf, { turno, uf }) {
  const linhas = [];
  const erros = [];
  for (const municipio of await subdiretorios(baseUf)) {
    for (const zona of await subdiretorios(path.join(baseUf, municipio))) {
      for (const secao of await subdiretorios(path.join(baseUf, municipio, zona))) {
        const dirSecao = path.join(baseUf, municipio, zona, secao);
        const vistos = new Set();
        const pacotes = await subdiretorios(dirSecao);
        for (const hash of pacotes) {
          const dir = path.join(dirSecao, hash);
          try {
            const nomes = await readdir(dir);
            const nome = (tipo) => acharArquivo(nomes, tipo);
            if (!nome('vsc') || !nome('bu')) continue;
            const vsc = await readFile(path.join(dir, nome('vsc')));
            const sha256Vsc = createHash('sha256').update(vsc).digest('hex');
            if (vistos.has(sha256Vsc)) continue;
            vistos.add(sha256Vsc);
            let log = null;
            if (nome('log')) {
              const { texto, quantidade } = await lerLogs(path.join(dir, nome('log')));
              log = { logsNoPacote: quantidade, ...perfilLog(texto, DIA_VOTACAO[turno]) };
            }
            linhas.push(JSON.stringify({ turno: Number(turno), uf, municipio, zona, secao, sha256Vsc, pacotesNaSecao: pacotes.length, bu: perfilBu(await readFile(path.join(dir, nome('bu')))), log }));
          } catch (erro) {
            erros.push({ uf, municipio, zona, secao, hash, erro: erro.message });
          }
        }
      }
    }
  }
  return { linhas, erros };
}

async function processarUf(turno, uf, base, destino) {
  const { linhas, erros } = await perfisUf(path.join(base, uf), { turno, uf });
  await mkdir(destino, { recursive: true });
  await writeFile(path.join(destino, `${uf}.jsonl`), linhas.length ? `${linhas.join('\n')}\n` : '');
  await writeFile(path.join(destino, `${uf}.erros.jsonl`), erros.map((e) => JSON.stringify(e)).join('\n') + (erros.length ? '\n' : ''));
  return { uf, secoes: linhas.length, erros: erros.length };
}

async function principal() {
  const { values } = parseArgs({
    options: {
      turno: { type: 'string', default: '2' }, uf: { type: 'string' }, base: { type: 'string' }, destino: { type: 'string' },
      paralelo: { type: 'string', default: '8' }, filho: { type: 'boolean' }, ajuda: { type: 'boolean', short: 'h' },
    },
  });
  if (values.ajuda) {
    console.log('Uso: node src/perfil-secoes.js [--turno 2] [--uf ac,sp] [--paralelo 8]\nGrava data/parsed/<t>t/perfil/<uf>.jsonl (uma linha por pacote de seção) e <uf>.erros.jsonl.');
    return;
  }
  const turno = values.turno;
  const base = path.resolve(values.base ?? path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas'));
  const destino = path.resolve(values.destino ?? path.join(DIR_DADOS, 'parsed', `${turno}t`, 'perfil'));
  const ufs = values.uf ? values.uf.split(',') : UFS;

  if (values.filho) {
    process.send(await processarUf(turno, ufs[0], base, destino));
    return;
  }
  // Uma UF por processo, até --paralelo processos ao mesmo tempo (as maiores primeiro).
  const fila = [...ufs];
  let falhou = false;
  const rodar = async () => {
    for (let uf = fila.shift(); uf; uf = fila.shift()) {
      const inicio = Date.now();
      const r = await new Promise((resolve, reject) => {
        const filho = fork(import.meta.filename, ['--filho', '--turno', turno, '--uf', uf, '--base', base, '--destino', destino]);
        let resultado = null;
        filho.on('message', (m) => { resultado = m; });
        filho.on('error', reject);
        filho.on('exit', (codigo) => (codigo === 0 && resultado ? resolve(resultado) : reject(new Error(`${uf}: processo terminou com código ${codigo}`))));
      }).catch((erro) => ({ uf, erro: erro.message }));
      if (r.erro || r.erros) falhou = true;
      console.log(`${uf}: ${r.erro ?? `${r.secoes} seções, ${r.erros} erro(s)`} (${((Date.now() - inicio) / 1000).toFixed(0)} s)`);
    }
  };
  await Promise.all(Array.from({ length: Number(values.paralelo) }, rodar));
  console.log(falhou ? 'RESUMO: houve erros (ver <uf>.erros.jsonl)' : 'RESUMO: todas as UFs sem erro');
  process.exitCode = falhou ? 1 : 0;
}

if (import.meta.filename === path.resolve(process.argv[1] ?? '')) await principal();
