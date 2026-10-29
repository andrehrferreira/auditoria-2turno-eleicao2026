// Revisor cético, achado software-verificacao-caminhos (svc), lente dados e definições: conferência no log BRUTO.
// Só confirma casos já medidos no universo (princípio 9); não gera número da auditoria.
//   --caso mg      MG 44458/0103/0221: as linhas que a regra extra (só aplicada a MG) descartou e o que a regra das
//                  outras UFs faria com elas;
//   --caso carga   as 5 seções com carga no dia 25/10 (BU): linha do tempo de 24/10 18:00 até a abertura, por log;
//   --caso <uf/mun/zona/secao> [--de dd/mm/aaaa] [--ate dd/mm/aaaa]  linha do tempo resumida de uma seção.
// Linha do tempo resumida: omite VOTA de habilitação/voto, agrupa as etapas de verificação de cada boot e mascara
// sequências de 12 dígitos (título de mesário), regra 6 do doc 10.
// Uso: node scripts/auditoria/cetico-svc-dados-bruto.mjs --caso carga
import { open, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { textosDeLog } from './seguranca-varrer-logs.mjs';

const { values } = parseArgs({ options: { caso: { type: 'string' }, de: { type: 'string' }, ate: { type: 'string' }, turno: { type: 'string', default: '2' } } });
const turno = Number(values.turno);
const { db } = await abrirLeitura();
const sec = db.prepare('SELECT hash, abertura, numero_interno_urna FROM secao WHERE turno = ? AND uf = ? AND municipio = ? AND zona = ? AND secao = ?');
const chave = (dh) => dh.slice(6, 10) + dh.slice(3, 5) + dh.slice(0, 2) + dh.slice(11, 19).replace(/:/g, '');
const mascarar = (s) => s.replace(/\d{12}/g, '[título]');

async function logs(id) {
  const [uf, municipio, zona, secao] = id.split('/');
  const s = sec.get(turno, uf, municipio, zona, secao);
  const dir = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', uf, municipio, zona, secao, s.hash);
  const h = await open(path.join(dir, acharArquivo(await readdir(dir), 'log')));
  try { return { s, textos: await textosDeLog(h) }; } finally { await h.close(); }
}

const RELEVANTE = /contingência|Contingência|Serial da MV|MV nova|mídia|Mídia|Código de carga|Iniciando aplicação|Data e hora|Turno da UE|Fase da UE|Modo de carga|erro|Erro|ERRO|Urna ligada|Desligamento|desligad|Início das operações|zerésima|Zerésima|pronta para receber|Identificação do Modelo|Número de série da MR|Identificador da mídia de carga|Sincronismo|sincronização|Log interno|Carga|carga|Encerramento|encerrad|ajuste|Ajuste|Etapa \[1\] /;

async function linhaDoTempo(id, de, ate) {
  const { s, textos } = await logs(id);
  console.log(`\n=== ${id}  BU: urna ${s.numero_interno_urna}, abertura ${s.abertura}; ${textos.length} logd.dat`);
  for (const t of textos) {
    const linhas = t.texto.split('\n').map((l) => l.replace(/\r$/, '').split('\t')).filter((c) => /^\d\d\/\d\d\/\d{4} /.test(c[0] ?? ''));
    const urnas = {};
    for (const c of linhas) urnas[c[2]] = (urnas[c[2]] ?? 0) + 1;
    const primeiro = linhas[0]?.[0]; const ultimo = linhas.at(-1)?.[0];
    console.log(`--- ${t.nome} profundidade ${t.profundidade}; ${linhas.length} linhas; urnas ${JSON.stringify(urnas)}; ${primeiro} → ${ultimo}`);
    let etapas = null;
    for (const [dh, nivel, urna, app, msg = ''] of linhas) {
      const k = chave(dh);
      if ((de && k < de) || (ate && k > ate)) continue;
      if (msg.startsWith('Verificação de assinatura - Etapa')) {
        etapas ??= { ini: dh, n: 0, ruins: [] };
        etapas.n++;
        if (!msg.endsWith('[SUCESSO]')) etapas.ruins.push(msg);
        continue;
      }
      if (etapas) { console.log(`   ${etapas.ini}  [${etapas.n} etapas de verificação${etapas.ruins.length ? `; NÃO SUCESSO: ${etapas.ruins.join(' | ')}` : ', todas SUCESSO'}]`); etapas = null; }
      if (nivel === 'INFO' && !RELEVANTE.test(msg)) continue;
      console.log(`   ${dh} ${nivel} ${urna} ${app} ${mascarar(msg).slice(0, 170)}`);
    }
    if (etapas) console.log(`   ${etapas.ini}  [${etapas.n} etapas de verificação${etapas.ruins.length ? `; NÃO SUCESSO: ${etapas.ruins.join(' | ')}` : ', todas SUCESSO'}]`);
  }
}

if (values.caso === 'mg') {
  const id = 'mg/44458/0103/0221';
  const { textos } = await logs(id);
  for (const t of textos) {
    let ini = 0; let i = 0;
    const L = t.texto.length;
    while (ini < L) {
      let fim = t.texto.indexOf('\n', ini); if (fim === -1) fim = L;
      const linha = t.texto.charCodeAt(fim - 1) === 13 ? t.texto.slice(ini, fim - 1) : t.texto.slice(ini, fim);
      ini = fim + 1; i++;
      if (linha.length < 20 || linha.charCodeAt(2) !== 47) continue; // mesmo 1º filtro de todas as UFs
      const c = linha.split('\t');
      const [dh, , urna, app] = c;
      const falhaNova = urna === undefined || app === undefined || !/^\d\d\/\d\d\/\d{4} \d\d:\d\d:\d\d$/.test(dh);
      if (!falhaNova) continue;
      console.log(JSON.stringify({ id, log: t.nome, profundidade: t.profundidade, linha: i, campos: c.length, urnaIndefinida: urna === undefined, appIndefinido: app === undefined,
        dhValida: /^\d\d\/\d\d\/\d{4} \d\d:\d\d:\d\d$/.test(dh), inicio: JSON.stringify(linha.slice(0, 60)) }));
      // Regra das outras UFs (sem o descarte): o código seguinte faz copia(urna) = Buffer.from(undefined) quando falta a 3ª coluna.
      try { Buffer.from(urna, 'utf8'); console.log('   regra antiga: a linha seria processada'); } catch (erro) { console.log(`   regra antiga: exceção "${erro.message.slice(0, 90)}" → pacote inteiro vai para <uf>.erros.jsonl`); }
    }
  }
} else if (values.caso === 'carga') {
  for (const id of ['ms/90514/0008/0486', 'ms/91650/0051/0044', 'pr/74918/0056/0037', 'pr/75833/0043/0397', 'sp/61816/0016/0436']) {
    const [uf, municipio, zona, secao] = id.split('/');
    const s = sec.get(turno, uf, municipio, zona, secao);
    const ab = s.abertura.replace(/\D/g, '').slice(0, 14);
    await linhaDoTempo(id, '20261024180000', String(Number(ab) + 500));
  }
} else if (values.caso) {
  const conv = (d, h) => (d ? d.slice(6, 10) + d.slice(3, 5) + d.slice(0, 2) + h : null);
  await linhaDoTempo(values.caso, conv(values.de, '000000'), conv(values.ate, '235959'));
}
