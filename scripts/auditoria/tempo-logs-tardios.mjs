// Auditoria C (A2/B3/H06): releitura do log bruto das seções com voto depois das 17h de Brasília, das que encerraram
// depois das 17h30 e de uma amostra de controle (1 em 50, determinística). Mede no relógio da urna, ao segundo:
// votos depois das 17h, forma de habilitação desses votos, pausas antes deles (chegada depois das 17h),
// tentativas de "Encerrar votação", respostas a "Todas as pessoas presentes já votaram?" e ligações da urna no dia.
// Requer: node scripts/auditoria/tempo-perfil.mjs --turno 2 (fuso por município).
// Uso: node scripts/auditoria/tempo-logs-tardios.mjs [--paralelo 4] [--uf rj,sp]
import { createReadStream } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerLogs } from '../../src/perfil-secoes.js';

const DIA = '25/10/2026';
const seg = (hhmmss) => Number(hhmmss.slice(0, 2)) * 3600 + Number(hhmmss.slice(3, 5)) * 60 + Number(hhmmss.slice(6, 8));

/** Analisa o texto do log do dia. `d` = hora local − hora de Brasília. Todos os tempos devolvidos em Brasília (s). */
export function analisarTardios(texto, d) {
  const desloc = d * 3600;
  const r = { votos: [], encerrarSelecionado: [], todasVotaram: [], ligada: [], urnaPronta: null, encerramentoConfirmado: null };
  let ciclo = { tipo: null, inicio: null };
  for (const linha of texto.split('\n')) {
    if (!linha.startsWith(DIA)) continue;
    const c = linha.split('\t');
    const t = seg(c[0].slice(11, 19)) - desloc;
    const m = c[4] ?? '';
    if (m === 'O voto do eleitor foi computado') {
      r.votos.push({ t, tipo: ciclo.tipo ?? 'outro', inicio: ciclo.inicio });
      ciclo = { tipo: null, inicio: null };
    } else if (m === 'Aguardando digitação do identificador do eleitor') ciclo = { tipo: null, inicio: null };
    else if (m === 'Identificador do eleitor digitado pelo mesário') ciclo.inicio ??= t;
    else if (m.includes('Tipo de habilitação do eleitor [biométrica]')) ciclo.tipo = 'biometria';
    else if (m.startsWith('Ano de nascimento digitado é igual ao do cadastro')) ciclo.tipo ??= 'ano_nascimento_sem_biometria';
    else if (m === 'Dado digitado confere') ciclo.tipo = 'liberacao_manual';
    else if (m === 'Operador selecionou: Encerrar votação') r.encerrarSelecionado.push(t);
    else if (m.startsWith('Todas as pessoas presentes já votaram?')) r.todasVotaram.push([t, m.slice(38).trim()]);
    else if (m.startsWith('Urna ligada em')) r.ligada.push(t);
    else if (m.startsWith('Urna pronta para receber votos')) r.urnaPronta ??= t;
    else if (m === 'Procedimento de encerramento confirmado') r.encerramentoConfirmado = t;
  }
  const H17 = 17 * 3600;
  const tardios = r.votos.filter((v) => v.t >= H17);
  const antes = r.votos.filter((v) => v.t < H17);
  const ultimoAntes = antes.at(-1)?.t ?? null;
  // Pausa antes de cada voto tardio: tempo desde o voto anterior (que pode ter sido antes das 17h)
  let anterior = ultimoAntes;
  const pausas = tardios.map((v) => { const p = anterior === null ? null : v.t - anterior; anterior = v.t; return p; });
  const porTipo = {};
  for (const v of tardios) porTipo[v.tipo] = (porTipo[v.tipo] ?? 0) + 1;
  const bins = {};
  for (const v of r.votos) if (v.t >= 16 * 3600) { const b = Math.floor(v.t / 1800) * 1800; bins[b] = (bins[b] ?? 0) + 1; }
  return {
    votos: r.votos.length, tardios: tardios.length, apos1730: tardios.filter((v) => v.t >= 17.5 * 3600).length,
    apos18: tardios.filter((v) => v.t >= 18 * 3600).length, apos19: tardios.filter((v) => v.t >= 19 * 3600).length,
    tardiosPorTipo: porTipo, ultimoAntes17: ultimoAntes, primeiroTardio: tardios[0]?.t ?? null, ultimoVoto: r.votos.at(-1)?.t ?? null,
    // Voto tardio depois de pausa longa = eleitor que começou a ser atendido depois de uma fila vazia
    tardiosAposPausa10min: pausas.filter((p) => p !== null && p >= 600).length,
    tardiosAposPausa30min: pausas.filter((p) => p !== null && p >= 1800).length,
    // Hora em que o mesário digitou o identificador do 1º eleitor tardio (Brasília)
    primeiroTardioInicioAtendimento: tardios[0]?.inicio ?? null,
    maiorPausaEntreTardios: pausas.length ? Math.max(...pausas.filter((p) => p !== null)) : null,
    encerrarSelecionado: r.encerrarSelecionado, todasVotaram: r.todasVotaram, encerramentoConfirmado: r.encerramentoConfirmado,
    ligadaNoDia: r.ligada.length, ligadaDuranteVotacao: r.ligada.filter((t) => r.urnaPronta !== null && t > r.urnaPronta && (r.encerramentoConfirmado === null || t < r.encerramentoConfirmado)).length,
    votosPor30minBsb: bins,
  };
}

async function processar(itens) {
  const saida = [];
  for (const it of itens) {
    const dirSecao = path.join(DIR_DADOS, 'raw', '2t', 'urnas', it.uf, it.municipio, it.zona, it.secao);
    try {
      const pacotes = (await readdir(dirSecao, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
      let feito = false;
      for (const hash of pacotes) {
        const nomes = await readdir(path.join(dirSecao, hash));
        const log = acharArquivo(nomes, 'log');
        if (!log || !acharArquivo(nomes, 'bu')) continue;
        const { texto, quantidade } = await lerLogs(path.join(dirSecao, hash, log));
        saida.push({ ...it, hash, logs: quantidade, ...analisarTardios(texto, it.d) });
        feito = true;
        break;
      }
      if (!feito) saida.push({ ...it, erro: 'sem log' });
    } catch (erro) {
      saida.push({ ...it, erro: erro.message });
    }
  }
  return saida;
}

if (!isMainThread) {
  parentPort.postMessage(await processar(workerData));
} else if (import.meta.filename === path.resolve(process.argv[1] ?? '')) {
  const { values } = parseArgs({ options: { paralelo: { type: 'string', default: '4' }, uf: { type: 'string' } } });
  const dir = path.join(DIR_DADOS, 'parsed', 'auditoria', 'tempo', '2t');
  const fuso = new Map((await readFile(path.join(dir, 'fuso-municipio.csv'), 'utf8')).trim().split('\n').slice(1)
    .map((l) => l.split(',')).map((c) => [`${c[0]}/${c[1]}`, c[6] === '' ? null : Number(c[6])]));
  // Seleção a partir do perfil: voto depois das 17h, encerramento do BU depois das 17h30 (Brasília), ou controle 1/50
  const itens = [];
  let n = 0;
  for (const uf of (values.uf ? values.uf.split(',') : UFS).filter((u) => u !== 'zz')) {
    for await (const linha of createInterface({ input: createReadStream(path.join(DIR_DADOS, 'parsed', '2t', 'perfil', `${uf}.jsonl`)) })) {
      if (!linha) continue;
      const p = JSON.parse(linha);
      const d = fuso.get(`${uf}/${p.municipio}`);
      if (d === null || d === undefined || !p.log) continue;
      n++;
      const tarde = p.log.votosPorHoraLocal.slice(17 + d).reduce((a, b) => a + b, 0);
      const e = p.bu.dataHoraEncerramento;
      const encBsb = Number(e.slice(9, 11)) * 3600 + Number(e.slice(11, 13)) * 60 + Number(e.slice(13, 15)) - d * 3600;
      const motivo = tarde > 0 ? 'voto_apos_17h' : encBsb >= 17.5 * 3600 ? 'encerrou_apos_17h30' : n % 50 === 0 ? 'controle' : null;
      if (motivo) itens.push({ uf, municipio: p.municipio, zona: p.zona, secao: p.secao, d, motivo, encBsb });
    }
  }
  console.log(`${itens.length} seções selecionadas de ${n}`);
  const k = Number(values.paralelo);
  const partes = Array.from({ length: k }, (_, i) => itens.filter((_, j) => j % k === i));
  const inicio = Date.now();
  const resultados = (await Promise.all(partes.map((parte) => new Promise((resolve, reject) => {
    const w = new Worker(import.meta.filename, { workerData: parte });
    w.on('message', resolve); w.on('error', reject);
  })))).flat();
  await writeFile(path.join(dir, 'logs-tardios.jsonl'), resultados.map((r) => JSON.stringify(r)).join('\n') + '\n');
  console.log(`${resultados.length} logs lidos em ${((Date.now() - inicio) / 1000).toFixed(0)} s; erros: ${resultados.filter((r) => r.erro).length}`);
}
