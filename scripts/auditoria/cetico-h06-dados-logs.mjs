// Revisor cético, H06 (votos depois das 17h), lente "dados e definições".
// Relê o log bruto de toda seção com voto depois das 17h de Brasília (seleção = logs-tardios.jsonl do Auditor C) e mede,
// voto a voto, o que a definição "voto computado depois das 17h" mistura:
//   - hora em que o atendimento começou ("Identificador do eleitor digitado pelo mesário") × hora em que o voto foi computado;
//   - forma de habilitação (biometria = digital do eleitor conferida pela urna; o resto não tem rastro técnico de presença);
//   - votos depois de "Todas as pessoas presentes já votaram? SIM": o que veio entre o SIM e o voto (cancelamento, aborto).
// Um processo, sem workers (regra da revisão). Só lê o disco.
// Uso: node scripts/auditoria/cetico-h06-dados-logs.mjs [--limite N]
// Saída: data/parsed/auditoria/cetico/h06-dados-logs.jsonl (1 linha por seção) e h06-dados-logs-resumo.json
import { createReadStream } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerLogs } from '../../src/perfil-secoes.js';

const { values } = parseArgs({ options: { limite: { type: 'string' } } });
const DIA = '25/10/2026';
const H17 = 17 * 3600;
const seg = (s) => Number(s.slice(0, 2)) * 3600 + Number(s.slice(3, 5)) * 60 + Number(s.slice(6, 8));
const destino = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');

/** Eventos do dia, em segundos de Brasília. */
function analisar(texto, d) {
  const desloc = d * 3600;
  const votos = [];
  const dialogo = []; // [t, tipo] para sim/nao/cancelou/abortado/confirmado/selecionou
  let ciclo = { tipo: null, inicio: null, digital: false };
  for (const linha of texto.split('\n')) {
    if (!linha.startsWith(DIA)) continue;
    const c = linha.split('\t');
    const t = seg(c[0].slice(11, 19)) - desloc;
    const m = c[4] ?? '';
    if (m === 'O voto do eleitor foi computado') { votos.push({ t, tipo: ciclo.tipo ?? 'outro', inicio: ciclo.inicio, digital: ciclo.digital }); ciclo = { tipo: null, inicio: null, digital: false }; }
    else if (m === 'Aguardando digitação do identificador do eleitor') ciclo = { tipo: null, inicio: null, digital: false };
    else if (m === 'Identificador do eleitor digitado pelo mesário') ciclo.inicio ??= t;
    else if (m.startsWith('Capturada a digital')) ciclo.digital = true;
    else if (m.includes('Tipo de habilitação do eleitor [biométrica]')) ciclo.tipo = 'biometria';
    else if (m.startsWith('Ano de nascimento digitado é igual ao do cadastro')) ciclo.tipo ??= 'sem_biometria_cadastrada';
    else if (m === 'Dado digitado confere') ciclo.tipo = 'liberacao_manual';
    else if (m === 'Operador selecionou: Encerrar votação') dialogo.push([t, 'selecionou']);
    else if (m.startsWith('Todas as pessoas presentes já votaram?')) dialogo.push([t, m.slice(38).trim() === 'SIM' ? 'sim' : 'nao']);
    else if (m === 'Operador cancelou o encerramento da votação') dialogo.push([t, 'cancelou']);
    else if (m.startsWith('Procedimento de encerramento abortado')) dialogo.push([t, 'abortado']);
    else if (m === 'Procedimento de encerramento confirmado') dialogo.push([t, 'confirmado']);
    else if (m.startsWith('Encerramento só pode ser solicitado')) dialogo.push([t, 'bloqueado_17h']);
  }
  const tardios = votos.filter((v) => v.t >= H17);
  const sims = dialogo.filter(([, k]) => k === 'sim').map(([t]) => t);
  const r = {
    votos: votos.length, tardios: tardios.length,
    tardiosInicioAntes17: tardios.filter((v) => v.inicio !== null && v.inicio < H17).length,
    tardiosInicioDepois17: tardios.filter((v) => v.inicio !== null && v.inicio >= H17).length,
    tardiosSemInicio: tardios.filter((v) => v.inicio === null).length,
    tardiosPorTipo: {}, tardiosInicioDepois17PorTipo: {},
    diurnosPorTipo: {},
  };
  for (const v of tardios) {
    r.tardiosPorTipo[v.tipo] = (r.tardiosPorTipo[v.tipo] ?? 0) + 1;
    if (v.inicio !== null && v.inicio >= H17) r.tardiosInicioDepois17PorTipo[v.tipo] = (r.tardiosInicioDepois17PorTipo[v.tipo] ?? 0) + 1;
  }
  for (const v of votos) if (v.t < H17) r.diurnosPorTipo[v.tipo] = (r.diurnosPorTipo[v.tipo] ?? 0) + 1;
  if (sims.length) {
    const primeiroSim = sims[0];
    const ultimoSim = sims.at(-1);
    const aposSim = votos.filter((v) => v.t > primeiroSim);
    r.sim = {
      sims: sims.length, primeiroSim, ultimoSim, ultimoVoto: votos.at(-1)?.t ?? null,
      votosAposPrimeiroSim: aposSim.length, votosAposUltimoSim: votos.filter((v) => v.t > ultimoSim).length,
      tiposAposPrimeiroSim: aposSim.reduce((o, v) => ((o[v.tipo] = (o[v.tipo] ?? 0) + 1), o), {}),
      atendimentoIniciadoAntesDoSim: aposSim.filter((v) => v.inicio !== null && v.inicio < primeiroSim).length,
      minutosSimAteProximoVoto: aposSim.length ? Math.round((aposSim[0].t - primeiroSim) / 6) / 10 : null,
      minutosSimAteUltimoVoto: aposSim.length ? Math.round((aposSim.at(-1).t - primeiroSim) / 6) / 10 : null,
      // Para cada voto depois de um SIM: o último evento do diálogo antes dele (o SIM foi desfeito por um evento técnico?)
      eventoAntesDoVoto: aposSim.reduce((o, v) => { const ant = dialogo.filter(([t]) => t <= v.t).at(-1)?.[1] ?? 'nenhum'; o[ant] = (o[ant] ?? 0) + 1; return o; }, {}),
      // Votos depois de um SIM sem cancelamento/aborto entre o SIM e o voto (o diálogo não foi desfeito)
      votosSemCancelamentoEntreSimEVoto: aposSim.filter((v) => {
        const simAnt = sims.filter((t) => t < v.t).at(-1);
        return !dialogo.some(([t, k]) => t >= simAnt && t <= v.t && (k === 'cancelou' || k === 'abortado'));
      }).length,
      dialogo: dialogo.filter(([t]) => t >= primeiroSim - 60).map(([t, k]) => `${t}:${k}`).slice(0, 30),
    };
  }
  return r;
}

const entrada = path.join(DIR_DADOS, 'parsed', 'auditoria', 'tempo', '2t', 'logs-tardios.jsonl');
const itens = [];
for await (const linha of createInterface({ input: createReadStream(entrada) })) {
  if (!linha) continue;
  const r = JSON.parse(linha);
  if (r.erro || !r.tardios) continue;
  itens.push({ uf: r.uf, municipio: r.municipio, zona: r.zona, secao: r.secao, d: r.d, encBsb: r.encBsb, hash: r.hash, logsAutor: r.logs, tardiosAutor: r.tardios });
}
const lista = values.limite ? itens.slice(0, Number(values.limite)) : itens;
console.error(`${lista.length} seções com voto depois das 17h`);
await mkdir(destino, { recursive: true });
const saida = [];
const inicio = Date.now();
for (const [i, it] of lista.entries()) {
  try {
    const dirPacote = path.join(DIR_DADOS, 'raw', '2t', 'urnas', it.uf, it.municipio, it.zona, it.secao, it.hash);
    const log = acharArquivo(await readdir(dirPacote), 'log');
    const { texto, quantidade } = await lerLogs(path.join(dirPacote, log));
    saida.push({ ...it, logs: quantidade, ...analisar(texto, it.d) });
  } catch (erro) { saida.push({ ...it, erro: erro.message }); }
  if (i % 2000 === 0) console.error(`${i} (${Math.round((Date.now() - inicio) / 1000)} s)`);
}
await writeFile(path.join(destino, 'h06-dados-logs.jsonl'), saida.map((r) => JSON.stringify(r)).join('\n') + '\n');

// ---- Resumo ----
const grupo = (r) => (r.encBsb < 17.5 * 3600 ? '17h' : r.encBsb < 19 * 3600 ? '17h30-18h59' : '19h+');
const soma = (o, k, v) => { o[k] = (o[k] ?? 0) + v; };
const R = { geradoEm: new Date().toISOString(), secoes: saida.length, erros: saida.filter((r) => r.erro).length, conferenciaComAutor: { tardiosAutor: 0, tardiosAqui: 0, secoesDivergentes: 0 }, grupos: {}, sim: null };
const S = { secoesComVotoAposSim: 0, votosAposPrimeiroSim: 0, votosAposUltimoSim: 0, secoesComVotoAposUltimoSim: 0, tipos: {}, eventoAntesDoVoto: {}, votosSemCancelamento: 0, secoesSemCancelamento: 0, atendimentoIniciadoAntesDoSim: 0, minutosAteProximo: [], minutosAteUltimo: [], porGrupo: {}, exemplosSemCancelamento: [], exemplosMaisLongos: [] };
for (const r of saida) {
  if (r.erro) continue;
  R.conferenciaComAutor.tardiosAutor += r.tardiosAutor; R.conferenciaComAutor.tardiosAqui += r.tardios;
  if (r.tardiosAutor !== r.tardios) R.conferenciaComAutor.secoesDivergentes++;
  const g = R.grupos[grupo(r)] ??= { secoes: 0, tardios: 0, inicioAntes17: 0, inicioDepois17: 0, semInicio: 0, tardiosPorTipo: {}, inicioDepois17PorTipo: {}, diurnosMesmasSecoesPorTipo: {} };
  g.secoes++; g.tardios += r.tardios; g.inicioAntes17 += r.tardiosInicioAntes17; g.inicioDepois17 += r.tardiosInicioDepois17; g.semInicio += r.tardiosSemInicio;
  for (const [k, v] of Object.entries(r.tardiosPorTipo)) soma(g.tardiosPorTipo, k, v);
  for (const [k, v] of Object.entries(r.tardiosInicioDepois17PorTipo)) soma(g.inicioDepois17PorTipo, k, v);
  for (const [k, v] of Object.entries(r.diurnosPorTipo)) soma(g.diurnosMesmasSecoesPorTipo, k, v);
  const s = r.sim;
  if (s && s.ultimoVoto !== null && s.ultimoVoto > s.primeiroSim) {
    S.secoesComVotoAposSim++; S.votosAposPrimeiroSim += s.votosAposPrimeiroSim; S.votosAposUltimoSim += s.votosAposUltimoSim;
    if (s.votosAposUltimoSim) S.secoesComVotoAposUltimoSim++;
    soma(S.porGrupo, grupo(r), 1);
    for (const [k, v] of Object.entries(s.tiposAposPrimeiroSim)) soma(S.tipos, k, v);
    for (const [k, v] of Object.entries(s.eventoAntesDoVoto)) soma(S.eventoAntesDoVoto, k, v);
    S.votosSemCancelamento += s.votosSemCancelamentoEntreSimEVoto; if (s.votosSemCancelamentoEntreSimEVoto) { S.secoesSemCancelamento++; S.exemplosSemCancelamento.push(`${r.uf}/${r.municipio}/${r.zona}/${r.secao} logs=${r.logs} ${s.dialogo.join(' ')}`); }
    S.atendimentoIniciadoAntesDoSim += s.atendimentoIniciadoAntesDoSim;
    S.minutosAteProximo.push(s.minutosSimAteProximoVoto); S.minutosAteUltimo.push([s.minutosSimAteUltimoVoto, `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, s.votosAposPrimeiroSim, JSON.stringify(s.tiposAposPrimeiroSim)]);
  }
}
const q = (a, p) => { const o = [...a].sort((x, y) => x - y); return o[Math.min(o.length - 1, Math.floor(p * o.length))]; };
S.minutosSimAteProximoVoto = { p50: q(S.minutosAteProximo, 0.5), p90: q(S.minutosAteProximo, 0.9), max: q(S.minutosAteProximo, 1) };
S.minutosSimAteUltimoVoto = { p50: q(S.minutosAteUltimo.map((x) => x[0]), 0.5), p90: q(S.minutosAteUltimo.map((x) => x[0]), 0.9), max: q(S.minutosAteUltimo.map((x) => x[0]), 1) };
S.exemplosMaisLongos = S.minutosAteUltimo.sort((a, b) => b[0] - a[0]).slice(0, 15).map(([m, k, n, t]) => `${k}: ${n} votos, ${m} min do 1º SIM ao último voto, ${t}`);
S.exemplosSemCancelamento = S.exemplosSemCancelamento.slice(0, 20);
delete S.minutosAteProximo; delete S.minutosAteUltimo;
R.sim = S;
await writeFile(path.join(destino, 'h06-dados-logs-resumo.json'), JSON.stringify(R, null, 2));
console.log(JSON.stringify(R, null, 1));
