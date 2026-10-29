// Auditoria C: confere no log bruto os casos extremos de horário apontados por tempo-perfil.mjs.
// Para cada seção, relê o log (inclusive o da urna original, na contingência), recalcula do zero e imprime o contexto:
//   intervalos entre votos computados < --min-intervalo s; habilitação → voto < --min-hab s (com os "Voto confirmado"
//   do ciclo); linhas duplicadas; cada "Urna ligada em" depois de "Urna pronta" (com o que veio antes); e a sequência
//   de abertura/encerramento.
// Uso: node scripts/auditoria/tempo-conferir.mjs [--turno 2] --secao uf/mun/zona/secao[,uf/mun/zona/secao...]
//      [--min-intervalo 15] [--min-hab 3] [--contexto 6] [--resumo]
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { DIA_VOTACAO, lerLogs } from '../../src/perfil-secoes.js';

const { values } = parseArgs({ options: {
  turno: { type: 'string', default: '2' }, secao: { type: 'string' }, 'min-intervalo': { type: 'string', default: '15' },
  'min-hab': { type: 'string', default: '3' }, contexto: { type: 'string', default: '6' }, resumo: { type: 'boolean' },
} });
const dia = DIA_VOTACAO[values.turno];
const minIntervalo = Number(values['min-intervalo']);
const minHab = Number(values['min-hab']);
const ctx = Number(values.contexto);
const RUIDO = /^(Verificação de assinatura|Urna ligada conectada|Espaço (livre|utilizado)|Quantidade de memória|Tecla indevida)/;
const seg = (l) => Number(l.slice(11, 13)) * 3600 + Number(l.slice(14, 16)) * 60 + Number(l.slice(17, 19));
const curta = (l) => { const c = l.split('\t'); return `${c[0].slice(11)} ${c[1].padEnd(6)} ${c[2]} ${c[3].padEnd(6)} ${c[4]}`; };

for (const alvo of (values.secao ?? '').split(',').filter(Boolean)) {
  const [uf, municipio, zona, secao] = alvo.split('/');
  const dirSecao = path.join(DIR_DADOS, 'raw', `${values.turno}t`, 'urnas', uf, municipio, zona, secao);
  for (const hash of (await readdir(dirSecao, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name)) {
    const nomes = await readdir(path.join(dirSecao, hash));
    const nomeLog = acharArquivo(nomes, 'log');
    if (!nomeLog) continue;
    const { texto, quantidade } = await lerLogs(path.join(dirSecao, hash, nomeLog));
    const todas = texto.split('\n').filter((l) => l.startsWith(dia));
    const urnas = new Set(todas.map((l) => l.split('\t')[2]));
    const linhas = todas.filter((l) => !RUIDO.test(l.split('\t')[4] ?? ''));
    // Linhas idênticas (mesma data/hora, urna, mensagem e hash de encadeamento) = mesmo registro lido duas vezes
    const vistas = new Map();
    let duplicadas = 0;
    for (const l of todas) { vistas.set(l, (vistas.get(l) ?? 0) + 1); if (vistas.get(l) === 2) duplicadas++; }
    const votos = [], habs = [];
    let ultimaHab = null;
    linhas.forEach((l, i) => {
      const m = l.split('\t')[4];
      if (m === 'Eleitor foi habilitado') ultimaHab = i;
      else if (m === 'O voto do eleitor foi computado') { votos.push(i); if (ultimaHab !== null) habs.push([ultimaHab, i]); ultimaHab = null; }
    });
    const curtos = votos.slice(1).map((v, k) => [votos[k], v]).filter(([a, b]) => seg(linhas[b]) - seg(linhas[a]) < minIntervalo);
    const habCurtas = habs.filter(([a, b]) => seg(linhas[b]) - seg(linhas[a]) < minHab);
    const pronta = linhas.findIndex((l) => l.includes('\tUrna pronta para receber votos'));
    const fimVotacao = linhas.findIndex((l) => l.includes('\tProcedimento de encerramento confirmado'));
    const ligadas = linhas.map((l, i) => [l, i]).filter(([l, i]) => l.includes('\tUrna ligada em') && pronta >= 0 && i > pronta && (fimVotacao < 0 || i < fimVotacao));
    console.log(`\n### ${alvo} pacote ${hash.slice(0, 16)}… logs=${quantidade} urnas no dia=${[...urnas].join(' ')} votos=${votos.length} linhas duplicadas=${duplicadas}`);
    console.log(`intervalos entre votos < ${minIntervalo}s: ${curtos.length} · habilitação→voto < ${minHab}s: ${habCurtas.length} · "Urna ligada em" durante a votação: ${ligadas.length}`);
    if (values.resumo) continue;
    const trecho = (de, ate) => linhas.slice(Math.max(0, de), ate + 1).map((l) => `  ${curta(l)}`).join('\n');
    for (const [a, b] of curtos) console.log(`-- intervalo ${seg(linhas[b]) - seg(linhas[a])}s\n${trecho(a - ctx, b + 1)}`);
    for (const [a, b] of habCurtas) console.log(`-- habilitação→voto ${seg(linhas[b]) - seg(linhas[a])}s\n${trecho(a - ctx, b + 1)}`);
    for (const [, i] of ligadas) {
      const antes = linhas.slice(0, i).filter((l) => !/\tLOGD\t/.test(l)).at(-1);
      console.log(`-- urna ligada; parada de ${antes ? seg(linhas[i]) - seg(antes) : '?'} s desde a última linha de aplicação\n${trecho(i - ctx, i + 3)}`);
    }
  }
}
