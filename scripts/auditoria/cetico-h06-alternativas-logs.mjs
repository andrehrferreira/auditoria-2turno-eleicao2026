// Revisor cético (lente: alternativas e poder), achado h06: relê no log bruto (1 processo, sequencial) as seções do
// logs-tardios.jsonl do autor com voto depois das 17h de Brasília e as de controle. Mede, voto a voto:
//  1. As seções com voto DEPOIS de "Todas as pessoas presentes já votaram? SIM": quantos votos, habilitação, atrasos
//     SIM → cancelamento → próximo identificador → voto, e se houve cancelamento registrado entre o SIM e o voto.
//  2. O único rastro técnico que separa "estava na urna antes das 17h" de "começou depois": a hora em que o
//     identificador do eleitor foi digitado, e a ociosidade da urna antes dele.
//  3. Parcela sem biometria por faixa de 15 min (15:00–17:00 e depois), para separar "fim de dia" de "depois das 17h".
// Uso: node scripts/auditoria/cetico-h06-alternativas-logs.mjs [--limite N] [--secao uf/mun/zona/secao] [--lista csv --saida nome]
// Saída: data/parsed/auditoria/cetico/h06-logs.json e h06-voto-depois-do-sim.csv (sem --secao).
import { createReadStream, readFileSync } from 'node:fs';
const fs_lista = (f) => readFileSync(f, 'utf8').trim().split(/\r?\n/).slice(1).map((l) => l.split(',')[0]);
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerLogs } from '../../src/perfil-secoes.js';

const { values } = parseArgs({ options: { limite: { type: 'string' }, secao: { type: 'string' }, lista: { type: 'string' }, saida: { type: 'string', default: 'h06-logs' } } });
const listaSet = values.lista ? new Set(fs_lista(values.lista)) : null;
const DIA = '25/10/2026';
const H17 = 17 * 3600;
const dirAutor = path.join(DIR_DADOS, 'parsed', 'auditoria', 'tempo', '2t');
const dirSaida = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');
await mkdir(dirSaida, { recursive: true });
const seg = (h) => Number(h.slice(0, 2)) * 3600 + Number(h.slice(3, 5)) * 60 + Number(h.slice(6, 8));
const hh = (s) => (s === null || s === undefined ? null : `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`);
const CANCEL = /^(Operador cancelou o encerramento da votação|Procedimento de encerramento abortado)/;

function analisar(texto, d) {
  const desloc = d * 3600;
  const votos = [], ev = [];
  let ciclo = { tipo: null, inicio: null };
  for (const linha of texto.split('\n')) {
    if (!linha.startsWith(DIA)) continue;
    const c = linha.split('\t');
    const t = seg(c[0].slice(11, 19)) - desloc;
    const m = c[4] ?? '';
    if (m === 'O voto do eleitor foi computado') { votos.push({ t, tipo: ciclo.tipo ?? 'outro', inicio: ciclo.inicio }); ciclo = { tipo: null, inicio: null }; }
    else if (m === 'Aguardando digitação do identificador do eleitor') ciclo = { tipo: null, inicio: null };
    else if (m === 'Identificador do eleitor digitado pelo mesário') ciclo.inicio ??= t;
    else if (m.includes('Tipo de habilitação do eleitor [biométrica]')) ciclo.tipo = 'biometria';
    else if (m.startsWith('Ano de nascimento digitado é igual ao do cadastro')) ciclo.tipo ??= 'ano_nascimento_sem_biometria';
    else if (m === 'Dado digitado confere') ciclo.tipo = 'liberacao_manual';
    else if (m === 'Operador selecionou: Encerrar votação') ev.push([t, 'encerrar']);
    else if (m.startsWith('Todas as pessoas presentes já votaram?')) ev.push([t, m.endsWith('SIM') ? 'SIM' : 'NAO']);
    else if (CANCEL.test(m)) ev.push([t, 'cancelou']);
    else if (m === 'Procedimento de encerramento confirmado') ev.push([t, 'confirmado']);
  }
  return { votos, ev };
}

// Seleção: logs-tardios.jsonl do autor (voto depois das 17h, encerramento depois das 17h30, controle 1/50)
const itens = [];
for await (const linha of createInterface({ input: createReadStream(path.join(dirAutor, 'logs-tardios.jsonl')) })) {
  if (!linha) continue;
  const r = JSON.parse(linha);
  if (r.erro || !(r.tardios > 0 || r.motivo === 'controle')) continue;
  if (listaSet && !listaSet.has(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`)) continue;
  if (values.secao && `${r.uf}/${r.municipio}/${r.zona}/${r.secao}` !== values.secao) continue;
  itens.push({ uf: r.uf, municipio: r.municipio, zona: r.zona, secao: r.secao, d: r.d, encBsb: r.encBsb, hash: r.hash, motivo: r.motivo });
}
const alvo = values.limite ? itens.slice(0, Number(values.limite)) : itens;
console.error(`${alvo.length} seções a reler`);

const grupoDe = (e) => (e < 17.5 * 3600 ? '17h' : e < 19 * 3600 ? '17h30-18h59' : '19h+');
const novoBin = () => ({ votos: 0, biometria: 0, ano_nascimento_sem_biometria: 0, liberacao_manual: 0, outro: 0 });
const bins = {};
const tardio = {};
const sim = { secoes: 0, votosDepoisDoSim: 0, porTipo: {}, semCancelamentoEntreSimEVoto: 0, identificadorAntesDoSim: 0,
  atrasoSimAteProximoIdentificador_s: [], atrasoSimAteUltimoVoto_s: [], votosDepoisDoSimPorSecao: {}, horaDoSim: {}, porGrupo: {}, casos: [] };
let lidos = 0, erros = 0;
const inicio = Date.now();
for (const it of alvo) {
  const dir = path.join(DIR_DADOS, 'raw', '2t', 'urnas', it.uf, it.municipio, it.zona, it.secao, it.hash);
  let a;
  try {
    const log = acharArquivo(await readdir(dir), 'log');
    a = analisar((await lerLogs(path.join(dir, log))).texto, it.d);
  } catch { erros++; continue; }
  lidos++;
  if (lidos % 2000 === 0) console.error(`${lidos} lidos (${Math.round((Date.now() - inicio) / 1000)} s)`);
  if (values.secao) console.error(JSON.stringify({ eventos: a.ev.map(([t, e]) => `${hh(t)} ${e}`), votosApos17: a.votos.filter((v) => v.t >= H17).map((v) => ({ voto: hh(v.t), inicio: hh(v.inicio), tipo: v.tipo })) }, null, 1));
  const g = it.motivo === 'controle' ? 'controle' : grupoDe(it.encBsb);
  for (const v of a.votos) {
    if (v.t < 15 * 3600) continue;
    const f = v.t >= 18 * 3600 ? '18h+' : hh(Math.floor(v.t / 900) * 900).slice(0, 5);
    const b = ((bins[g] ??= {})[f] ??= novoBin());
    b.votos++; b[v.tipo]++;
  }
  const T = (tardio[g] ??= { votos: 0, identificadorAntes17: 0, identificadorAntes17_semBio: 0, ocioso: { '<2min': 0, '2-10min': 0, '10-30min': 0, '>=30min': 0, 'sem inicio': 0 }, semBioPorOcioso: { '<2min': 0, '2-10min': 0, '10-30min': 0, '>=30min': 0, 'sem inicio': 0 } });
  a.votos.forEach((v, i) => {
    if (v.t < H17) return;
    T.votos++;
    const semBio = v.tipo !== 'biometria';
    if (v.inicio !== null && v.inicio < H17) { T.identificadorAntes17++; if (semBio) T.identificadorAntes17_semBio++; }
    const ant = i > 0 ? a.votos[i - 1].t : null;
    const o = v.inicio === null || ant === null ? 'sem inicio' : v.inicio - ant < 120 ? '<2min' : v.inicio - ant < 600 ? '2-10min' : v.inicio - ant < 1800 ? '10-30min' : '>=30min';
    T.ocioso[o]++; if (semBio) T.semBioPorOcioso[o]++;
  });
  const s0 = a.ev.find(([, e]) => e === 'SIM');
  if (!s0) continue;
  const depois = a.votos.filter((v) => v.t > s0[0]);
  if (!depois.length) continue;
  sim.secoes++;
  sim.votosDepoisDoSim += depois.length;
  sim.porGrupo[g] = (sim.porGrupo[g] ?? 0) + 1;
  const n = depois.length >= 10 ? '10+' : depois.length >= 5 ? '5-9' : String(depois.length);
  sim.votosDepoisDoSimPorSecao[n] = (sim.votosDepoisDoSimPorSecao[n] ?? 0) + 1;
  const hs = s0[0] < 17.25 * 3600 ? '17:00-17:14' : s0[0] < 17.5 * 3600 ? '17:15-17:29' : s0[0] < 18 * 3600 ? '17:30-17:59' : s0[0] < 19 * 3600 ? '18h' : '19h+';
  sim.horaDoSim[hs] = (sim.horaDoSim[hs] ?? 0) + 1;
  for (const v of depois) {
    sim.porTipo[v.tipo] = (sim.porTipo[v.tipo] ?? 0) + 1;
    const ultimoSimAntes = a.ev.filter(([t, e]) => e === 'SIM' && t < v.t).at(-1);
    const cancel = a.ev.some(([t, e]) => e === 'cancelou' && t > ultimoSimAntes[0] && t < v.t);
    if (!cancel) sim.semCancelamentoEntreSimEVoto++;
    if (v.inicio !== null && v.inicio < s0[0]) sim.identificadorAntesDoSim++;
  }
  const prox = depois[0].inicio ?? depois[0].t;
  sim.atrasoSimAteProximoIdentificador_s.push(prox - s0[0]);
  sim.atrasoSimAteUltimoVoto_s.push(depois.at(-1).t - s0[0]);
  sim.casos.push({ secao: `${it.uf}/${it.municipio}/${it.zona}/${it.secao}`, grupo: g, sim: hh(s0[0]),
    cancelou: hh(a.ev.find(([t, e]) => e === 'cancelou' && t > s0[0])?.[0]), proximoIdentificador: hh(prox),
    votosDepois: depois.length, tipos: depois.map((v) => v.tipo[0]).join(''), ultimoVoto: hh(depois.at(-1).t),
    encerramento: hh(a.ev.filter(([, e]) => e === 'confirmado').at(-1)?.[0]) });
}
if (values.secao) process.exit(0);
const quantis = (arr) => { const o = [...arr].sort((x, y) => x - y); const q = (p) => o[Math.min(o.length - 1, Math.floor(p * o.length))]; return o.length ? { n: o.length, p10: q(0.1), p50: q(0.5), p90: q(0.9), max: o.at(-1) } : null; };
const semBioPct = (b) => +(100 * (b.votos - b.biometria) / Math.max(1, b.votos)).toFixed(1);
const resumo = {
  geradoEm: new Date().toISOString(), lidos, erros, segundos: Math.round((Date.now() - inicio) / 1000),
  votoDepoisDoSim: { ...sim, atrasoSimAteProximoIdentificador_s: quantis(sim.atrasoSimAteProximoIdentificador_s), atrasoSimAteUltimoVoto_s: quantis(sim.atrasoSimAteUltimoVoto_s),
    casosMaisLongos: [...sim.casos].sort((x, y) => (y.ultimoVoto > x.ultimoVoto ? 1 : -1)).slice(0, 15), casos: undefined },
  tardiosRastroDeInicio: tardio,
  semBiometriaPor15min: Object.fromEntries(Object.entries(bins).map(([g, b]) => [g, Object.fromEntries(Object.entries(b).sort().map(([f, x]) => [f, { votos: x.votos, semBio_pct: semBioPct(x), manual: x.liberacao_manual, ano: x.ano_nascimento_sem_biometria }]))])),
};
await writeFile(path.join(dirSaida, `${values.saida}.json`), JSON.stringify(resumo, null, 2));
await writeFile(path.join(dirSaida, `${values.saida}-voto-depois-do-sim.csv`), ['secao,grupo,sim,cancelou,proximo_identificador,votos_depois,tipos,ultimo_voto,encerramento',
  ...sim.casos.map((c) => [c.secao, c.grupo, c.sim, c.cancelou ?? '', c.proximoIdentificador, c.votosDepois, c.tipos, c.ultimoVoto, c.encerramento ?? ''].join(','))].join('\n') + '\n');
console.log(JSON.stringify(resumo, null, 1));
