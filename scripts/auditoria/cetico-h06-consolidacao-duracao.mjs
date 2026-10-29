// Revisor cético, H06, consolidação. Ponto em disputa entre as lentes "definições" e "alternativas":
// o excesso de votos sem biometria logo depois das 17h (16,4% contra ~12% de dia) é viés de duração
// (atendimento sem digital demora mais e por isso tende a estar em curso às 17:00) ou um salto real às 17h?
// Teste placebo: nas mesmas seções (todas as 29.854 com voto depois das 17h), mede a parcela sem biometria
// dos atendimentos "em curso" num corte do dia (identificador digitado antes do corte, voto computado depois),
// para vários cortes (10h ... 16h30) e para o corte das 17h. Mede também a duração do atendimento por tipo.
// Se o placebo diurno der parcela parecida com a das 17h, o excesso é viés de duração (artefato da definição).
// Um processo, sem workers. Só lê o disco. Horários em Brasília (fuso d do Auditor C, validado pelos revisores).
// Uso: node scripts/auditoria/cetico-h06-consolidacao-duracao.mjs [--limite N]
// Saída: data/parsed/auditoria/cetico/h06-consolidacao-duracao.json
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
const seg = (s) => Number(s.slice(0, 2)) * 3600 + Number(s.slice(3, 5)) * 60 + Number(s.slice(6, 8));
const CORTES = { '10:00': 10, '12:00': 12, '14:00': 14, '15:00': 15, '16:00': 16, '16:30': 16.5, '17:00': 17 };
const H17 = 17 * 3600;
const destino = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');
const TIPOS = ['biometria', 'sem_biometria_cadastrada', 'liberacao_manual', 'outro'];

/** Votos do dia: t (computado), inicio (1º identificador do ciclo), tipo. Mesmo parser da lente "definições". */
function votosDoLog(texto, d) {
  const desloc = d * 3600;
  const votos = [];
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
    else if (m.startsWith('Ano de nascimento digitado é igual ao do cadastro')) ciclo.tipo ??= 'sem_biometria_cadastrada';
    else if (m === 'Dado digitado confere') ciclo.tipo = 'liberacao_manual';
  }
  return votos;
}

const vazio = () => Object.fromEntries(TIPOS.map((k) => [k, 0]));
const grupo = (enc) => (enc < 17.5 * 3600 ? '17h' : enc < 19 * 3600 ? '17h30-18h59' : '19h+');
const R = {};
const novoGrupo = () => ({
  secoes: 0,
  emCursoNoCorte: Object.fromEntries(Object.keys(CORTES).map((k) => [k, vazio()])),
  iniciadosNos30minDepoisDoCorte: Object.fromEntries(Object.keys(CORTES).map((k) => [k, vazio()])),
  duracaoDiurnaSomaS: vazio(), duracaoDiurnaN: vazio(),
});

const entrada = path.join(DIR_DADOS, 'parsed', 'auditoria', 'tempo', '2t', 'logs-tardios.jsonl');
const itens = [];
for await (const linha of createInterface({ input: createReadStream(entrada) })) {
  if (!linha) continue;
  const r = JSON.parse(linha);
  if (r.erro || !r.tardios) continue;
  itens.push(r);
}
const lista = values.limite ? itens.slice(0, Number(values.limite)) : itens;
console.error(`${lista.length} seções`);
let erros = 0;
const inicio = Date.now();
for (const [i, it] of lista.entries()) {
  try {
    const dirPacote = path.join(DIR_DADOS, 'raw', '2t', 'urnas', it.uf, it.municipio, it.zona, it.secao, it.hash);
    const log = acharArquivo(await readdir(dirPacote), 'log');
    const { texto } = await lerLogs(path.join(dirPacote, log));
    const votos = votosDoLog(texto, it.d);
    const g = (R[grupo(it.encBsb)] ??= novoGrupo());
    g.secoes++;
    for (const v of votos) {
      if (v.inicio === null) continue;
      for (const [k, h] of Object.entries(CORTES)) {
        const c = h * 3600;
        if (v.inicio < c && v.t >= c) g.emCursoNoCorte[k][v.tipo]++;
        if (v.inicio >= c && v.inicio < c + 1800) g.iniciadosNos30minDepoisDoCorte[k][v.tipo]++;
      }
      if (v.t < H17 && v.inicio >= 8 * 3600) { g.duracaoDiurnaSomaS[v.tipo] += v.t - v.inicio; g.duracaoDiurnaN[v.tipo]++; }
    }
  } catch (erro) { erros++; if (erros < 5) console.error(it.uf, it.municipio, it.zona, it.secao, erro.message); }
  if (i % 2000 === 0) console.error(`${i} (${Math.round((Date.now() - inicio) / 1000)} s)`);
}

const pct = (o) => { const n = TIPOS.reduce((s, k) => s + o[k], 0); const sb = o.sem_biometria_cadastrada + o.liberacao_manual; return { n, semBiometria: sb, pctSemBiometria: n ? Math.round((1e4 * sb) / n) / 100 : null }; };
const saida = { geradoEm: new Date().toISOString(), secoes: lista.length, erros, grupos: {} };
for (const [nome, g] of Object.entries(R)) {
  saida.grupos[nome] = {
    secoes: g.secoes,
    emCursoNoCorte: Object.fromEntries(Object.entries(g.emCursoNoCorte).map(([k, o]) => [k, { ...o, ...pct(o) }])),
    iniciadosNos30minDepoisDoCorte: Object.fromEntries(Object.entries(g.iniciadosNos30minDepoisDoCorte).map(([k, o]) => [k, { ...o, ...pct(o) }])),
    duracaoDiurnaMediaS: Object.fromEntries(TIPOS.map((k) => [k, g.duracaoDiurnaN[k] ? Math.round(g.duracaoDiurnaSomaS[k] / g.duracaoDiurnaN[k]) : null])),
    duracaoDiurnaN: g.duracaoDiurnaN,
  };
}
await mkdir(destino, { recursive: true });
await writeFile(path.join(destino, 'h06-consolidacao-duracao.json'), JSON.stringify(saida, null, 2));
console.log(JSON.stringify(saida, null, 1));
