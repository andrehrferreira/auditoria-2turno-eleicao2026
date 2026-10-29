// Auditoria C (linha do tempo): urna religada durante a votação. Para cada "Urna ligada em" entre "Urna pronta" e
// "Procedimento de encerramento confirmado", classifica o que o log registra antes: desligamento pela chave, erro
// (com o código e a mensagem) ou nada (queda de energia/travamento sem registro), e mede o tempo parada.
// Seleção: seções com reiniciosDuranteVotacao > 0 no perfil (src/perfil-secoes.js).
// Uso: node scripts/auditoria/tempo-reinicios.mjs [--paralelo 4]
// Saída: data/parsed/auditoria/tempo/2t/reinicios.json
import { createReadStream } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerLogs } from '../../src/perfil-secoes.js';

const DIA = '25/10/2026';
const seg = (hms) => Number(hms.slice(0, 2)) * 3600 + Number(hms.slice(3, 5)) * 60 + Number(hms.slice(6, 8));

async function processar(itens) {
  const eventos = [];
  for (const it of itens) {
    const dirSecao = path.join(DIR_DADOS, 'raw', '2t', 'urnas', it.uf, it.municipio, it.zona, it.secao);
    for (const e of await readdir(dirSecao, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const nomes = await readdir(path.join(dirSecao, e.name));
      const log = acharArquivo(nomes, 'log');
      if (!log || !acharArquivo(nomes, 'bu')) continue;
      const { texto } = await lerLogs(path.join(dirSecao, e.name, log));
      const linhas = texto.split('\n').filter((l) => l.startsWith(DIA)).map((l) => l.split('\t'));
      let votando = false;
      for (let i = 0; i < linhas.length; i++) {
        const m = linhas[i][4] ?? '';
        if (m.startsWith('Urna pronta para receber votos')) votando = true;
        else if (m === 'Procedimento de encerramento confirmado') votando = false;
        else if (votando && m.startsWith('Urna ligada em')) {
          const ligou = /às (\d\d:\d\d:\d\d)/.exec(m)?.[1];
          // Últimas linhas antes do reinício, sem as do LOGD (abertura/fechamento do arquivo de log)
          const antes = [];
          for (let j = i - 1; j >= 0 && antes.length < 15; j--) if (linhas[j][3] !== 'LOGD') antes.push(linhas[j]);
          const chave = antes.slice(0, 4).some((l) => /Urna desligada pela chave|Mudança do estado da chave: URNA DESLIGADA|Desligando a urna/.test(l[4]));
          const erro = antes.find((l) => l[1] === 'ERRO');
          const ultima = antes[0];
          eventos.push({
            secao: `${it.uf}/${it.municipio}/${it.zona}/${it.secao}`, hora: linhas[i][0].slice(11),
            causa: chave ? (erro ? 'chave_apos_erro' : 'chave_sem_erro') : (erro ? 'sem_desligamento_apos_erro' : 'sem_desligamento_sem_erro'),
            erro: erro ? (erro[4].match(/\((\d{3,})\)/)?.[1] ?? erro[4].slice(0, 60)) : null,
            erroTexto: erro ? erro[4].slice(0, 110) : null,
            paradaSegundos: ultima && ligou ? seg(ligou) - seg(ultima[0].slice(11)) : null,
            ultimaLinha: ultima ? ultima[4].slice(0, 80) : null,
          });
        }
      }
      break;
    }
  }
  return eventos;
}

if (!isMainThread) parentPort.postMessage(await processar(workerData));
else {
  const { values } = parseArgs({ options: { paralelo: { type: 'string', default: '4' } } });
  const itens = [];
  for (const uf of UFS) {
    for await (const l of createInterface({ input: createReadStream(path.join(DIR_DADOS, 'parsed', '2t', 'perfil', `${uf}.jsonl`)) })) {
      if (!l) continue;
      const p = JSON.parse(l);
      if (p.log?.reiniciosDuranteVotacao > 0) itens.push({ uf, municipio: p.municipio, zona: p.zona, secao: p.secao });
    }
  }
  const k = Number(values.paralelo);
  const eventos = (await Promise.all(Array.from({ length: k }, (_, i) => new Promise((resolve, reject) => {
    const w = new Worker(import.meta.filename, { workerData: itens.filter((_, j) => j % k === i) });
    w.on('message', resolve); w.on('error', reject);
  })))).flat();
  const contar = (f) => Object.fromEntries(Object.entries(eventos.reduce((a, e) => { const c = f(e); a[c] = (a[c] ?? 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 25));
  const paradas = eventos.map((e) => e.paradaSegundos).filter((x) => x !== null).sort((a, b) => a - b);
  const q = (p) => paradas[Math.floor(p * (paradas.length - 1))];
  const resumo = {
    secoes: itens.length, reinicios: eventos.length, porCausa: contar((e) => e.causa), porErro: contar((e) => e.erroTexto ?? '(nenhum)'),
    paradaSegundos: { p50: q(0.5), p90: q(0.9), p99: q(0.99), max: paradas.at(-1) },
    maisLongas: [...eventos].sort((a, b) => (b.paradaSegundos ?? 0) - (a.paradaSegundos ?? 0)).slice(0, 20),
    semRegistroExemplos: eventos.filter((e) => e.causa === 'sem_desligamento_sem_erro').slice(0, 20),
  };
  await writeFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'tempo', '2t', 'reinicios.json'), JSON.stringify({ ...resumo, eventos }, null, 1));
  console.log(JSON.stringify(resumo, null, 1));
}
