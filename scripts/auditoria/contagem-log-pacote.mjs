// Auditor A (contagem), teste 3 (C2), seções em que o log não fecha com o BU: lê CADA log do pacote em separado
// (logd.dat da urna que gerou o BU e os .jez aninhados das urnas anteriores, em contingência/RED) e reconta os votos.
//  - Cópias do mesmo log (ex.: "-01.jez" e "…ME.jez") não contam duas vezes: cada linha do log tem um hash de
//    encadeamento (última coluna), e o voto é identificado por (urna, data/hora, hash).
//  - Logs que declaram outra seção ("Seção Eleitoral: NNNN" ≠ a seção, e ≠ 0000 da carga de contingência) são separados:
//    a urna do RED leva o log da recuperação anterior.
//  - Ciclo de eleitor com "Voto confirmado" e sem "O voto do eleitor foi computado" (urna desligou ou log terminou) é
//    contado à parte: o voto pode ter sido gravado na mídia sem a última linha do log.
// Uso: node scripts/auditoria/contagem-log-pacote.mjs [--turno 2] [--csv data/parsed/auditoria/contagem/coerencia-2t-divergencias.csv]
//      node scripts/auditoria/contagem-log-pacote.mjs --turno 2 --secao es/57932/0009/0085 [--secao ...]
//      node scripts/auditoria/contagem-log-pacote.mjs --turno 2 --multiplos [--parte 1/3]  (todas as seções com 2+ logs)
import { readFileSync, writeFileSync } from 'node:fs';
import { open, readdir } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { parseArgs } from 'node:util';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { values: args } = parseArgs({ options: { turno: { type: 'string', default: '2' }, csv: { type: 'string' }, secao: { type: 'string', multiple: true }, multiplos: { type: 'boolean', default: false }, parte: { type: 'string' } } });
const turno = Number(args.turno);
const DIA = { 1: '04/10/2026', 2: '25/10/2026' }[turno];
const db = new DatabaseSync('data/db/eleicao2026.sqlite', { readOnly: true });
const qSecao = db.prepare('SELECT hash, comparecimento, tipo_urna, tipo_arquivo, numero_interno_urna FROM secao WHERE turno = ? AND uf = ? AND municipio = ? AND zona = ? AND secao = ?');

let alvos = (args.secao ?? []).map((s) => s.split('/'));
if (args.multiplos) {
  alvos = db.prepare(`SELECT p.uf, p.municipio, p.zona, p.secao FROM perfil_log p JOIN secao s USING (turno, uf, municipio, zona, secao, hash)
    WHERE p.turno = ? AND p.logs_no_pacote >= 2 ORDER BY 1, 2, 3, 4`).all(turno).map((r) => [r.uf, r.municipio, r.zona, r.secao]);
  if (args.parte) { const [i, n] = args.parte.split('/').map(Number); alvos = alvos.filter((_, j) => j % n === i - 1); }
  console.error(`${alvos.length} seções com 2 ou mais logs no pacote${args.parte ? ` (parte ${args.parte})` : ''}`);
} else if (args.csv || !alvos.length) {
  const csv = readFileSync(args.csv ?? `data/parsed/auditoria/contagem/coerencia-${turno}t-divergencias.csv`, 'utf8').trim().split('\n');
  const col = csv[0].split(';');
  alvos = [...new Set(csv.slice(1).map((l) => l.split(';')).filter((c) => c[col.indexOf('teste')].startsWith('C2'))
    .map((c) => [c[0], c[1], c[2], c[3]].join('/')))].map((s) => s.split('/'));
}

const emMemoria = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
async function logsDoPacote(handle, nome = 'log.jez', profundidade = 0) {
  const saida = [];
  for (const e of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, e);
    if (e.nome === 'logd.dat') saida.push({ nome, texto: dados.toString('latin1') });
    else if (e.nome.endsWith('.jez') && profundidade < 3) saida.push(...(await logsDoPacote(emMemoria(dados), `${nome}/${e.nome}`, profundidade + 1)));
  }
  return saida;
}

function analisarLog(texto, secao) {
  const linhas = texto.split('\n').filter((l) => l.startsWith(DIA)).map((l) => l.replace(/\r$/, '').split('\t'));
  const secoesDeclaradas = new Set(linhas.filter((c) => /^Seção Eleitoral: /.test(c[4] ?? '')).map((c) => c[4].slice(17)));
  const computados = []; const interrompidos = [];
  let ciclo = null;
  const fecha = (motivo) => { if (ciclo?.confirmados.length) interrompidos.push({ ...ciclo, motivo }); ciclo = null; };
  for (const c of linhas) {
    const m = c[4] ?? '';
    if (m.startsWith('Eleitor foi habilitado')) ciclo = { urna: c[2], habilitado: c[0], confirmados: [] };
    else if (m.startsWith('Voto confirmado para') && ciclo) ciclo.confirmados.push(m.slice(21));
    else if (m.startsWith('O voto do eleitor foi computado')) { computados.push(`${c[2]}|${c[0]}|${c[5]}`); ciclo = null; }
    else if (m.startsWith('Início das operações do logd') || m.startsWith('Urna ligada em')) fecha('reinício');
  }
  fecha('fim do log');
  const outraSecao = [...secoesDeclaradas].some((s) => s !== '0000' && s !== secao);
  return { linhas: linhas.length, urnas: [...new Set(linhas.map((c) => c[2]))], secoesDeclaradas: [...secoesDeclaradas], outraSecao, computados, interrompidos };
}

const resultado = [];
for (const [uf, municipio, zona, secao] of alvos) {
  const s = qSecao.get(turno, uf, municipio, zona, secao);
  const dir = `data/raw/${turno}t/urnas/${uf}/${municipio}/${zona}/${secao}/${s.hash}`;
  const jez = (await readdir(dir)).find((n) => n.endsWith('-log.jez') || n.endsWith('-logsa.jez'));
  const h = await open(`${dir}/${jez}`);
  let logs;
  try { logs = await logsDoPacote(h); } finally { await h.close(); }
  const daSecao = new Set(); const deOutra = new Set(); const confirmadosSemComputar = new Map();
  const detalhes = [];
  for (const l of logs) {
    const a = analisarLog(l.texto, secao);
    for (const v of a.computados) (a.outraSecao ? deOutra : daSecao).add(v);
    if (!a.outraSecao) for (const i of a.interrompidos) confirmadosSemComputar.set(`${i.urna}|${i.habilitado}`, i);
    detalhes.push(`${l.nome}: urnas ${a.urnas.join(',')}, seção declarada ${a.secoesDeclaradas.join(',') || '-'}${a.outraSecao ? ' (OUTRA SEÇÃO)' : ''}, ${a.computados.length} computados, ${a.interrompidos.length} confirmados sem "computado"`);
  }
  const comRastro = daSecao.size + confirmadosSemComputar.size;
  const item = { uf, municipio, zona, secao, tipo_urna: s.tipo_urna, tipo_arquivo: s.tipo_arquivo, bu: s.comparecimento, logs: logs.length,
    computados_distintos: daSecao.size, confirmados_sem_computar: confirmadosSemComputar.size, computados_de_outra_secao: deOutra.size,
    sem_rastro_no_log: s.comparecimento - comRastro,
    interrompidos: [...confirmadosSemComputar.values()].map((i) => `${i.habilitado.slice(11)} [${i.confirmados.join('+')}] ${i.motivo}`).join(' / ') };
  resultado.push(item);
  if (args.multiplos && item.sem_rastro_no_log === 0 && !deOutra.size) continue;
  console.log(`\n${uf} ${municipio}/${zona}/${secao} [${s.tipo_urna}/${s.tipo_arquivo}] BU ${s.comparecimento} · computados distintos ${daSecao.size} · confirmados sem "computado" ${confirmadosSemComputar.size} · de outra seção ${deOutra.size} · SEM RASTRO NO LOG: ${item.sem_rastro_no_log}`);
  for (const d of detalhes) console.log(`   ${d}`);
  if (item.interrompidos) console.log(`   interrompidos: ${item.interrompidos}`);
}
const porSituacao = new Map();
for (const r of resultado) {
  const k = `${r.tipo_urna}/${r.tipo_arquivo}: ${r.sem_rastro_no_log > 0 ? 'BU > log' : r.sem_rastro_no_log < 0 ? 'log > BU' : 'BU = log'}`;
  porSituacao.set(k, (porSituacao.get(k) ?? 0) + 1);
}
console.log(`\nPor situação: ${[...porSituacao].map(([k, v]) => `${k} = ${v}`).join(' · ')}`);
console.log(`Seções com log de outra seção no pacote: ${resultado.filter((r) => r.computados_de_outra_secao > 0).length}; confirmados sem "computado" (contados como rastro): ${resultado.reduce((t, r) => t + r.confirmados_sem_computar, 0)}`);
const tot = resultado.reduce((t, r) => t + Math.max(0, r.sem_rastro_no_log), 0);
console.log(`\n${resultado.length} seções; votos do BU sem nenhum rastro nos logs do pacote: ${tot} em ${resultado.filter((r) => r.sem_rastro_no_log > 0).length} seções`);
const cols = Object.keys(resultado[0] ?? {});
const sufixo = args.multiplos ? `-multiplos${args.parte ? `-${args.parte.replace('/', 'de')}` : ''}` : '';
writeFileSync(`data/parsed/auditoria/contagem/log-pacote-${turno}t${sufixo}.csv`, [cols.join(';'), ...resultado.map((r) => cols.map((c) => r[c]).join(';'))].join('\n') + '\n');
