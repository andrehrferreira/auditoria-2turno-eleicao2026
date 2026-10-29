// Cético, achado "votos sem rastro no log", lente de dados: interrupções que viraram voto × as que não viraram.
// Universo: TODOS os pacotes de urna com habilitação interrompida na saída do autor (matematico/<t>t/*.jsonl).
// Para cada pacote, relê o log bruto (mesma deduplicação do autor, linhasPorUrna) e, para cada ciclo interrompido,
// registra: cargos confirmados na ordem, se o ÚLTIMO cargo da cédula foi confirmado (ciclo completo), as mensagens
// entre a última confirmação e a interrupção, o evento que interrompeu, segundos entre a última confirmação e a
// interrupção e mensagens de erro no ciclo. Classe do pacote: k = BU − computados no log (k > 0: k ciclos viraram voto).
// Uso: node scripts/auditoria/cetico-vsr-dados-interrupcoes.mjs --turno 2
// Saída: data/parsed/auditoria/cetico/cetico-vsr-dados-interrupcoes-<t>t.{json,jsonl}
import { createReadStream } from 'node:fs';
import { mkdir, open, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { DIA_VOTACAO } from '../../src/perfil-secoes.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';
import { CARGO_LOG, linhasPorUrna } from './matematico-brutos.mjs';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' } } });
const turno = values.turno;
const dia = DIA_VOTACAO[turno];
const memoria = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
async function textos(handle, prof = 0) {
  const r = [];
  for (const e of await listarEntradas(handle)) {
    const d = await lerEntrada(handle, e);
    if (e.nome === 'logd.dat') r.push(d.toString('latin1'));
    else if (e.nome.endsWith('.jez') && prof < 3) r.push(...(await textos(memoria(d), prof + 1)));
  }
  return r;
}
const seg = (l) => {
  const [h, m, s] = l.slice(11, 19).split(':').map(Number);
  return h * 3600 + m * 60 + s;
};
const INTERROMPE = (m) => m.startsWith('Urna ligada em') || m.startsWith('Iniciando aplicação') || m.startsWith('Inicio do Encerramento') || m === 'Votação suspensa';

/** Ciclos interrompidos de uma urna, com o contexto (mesma máquina de estados de cicloLog do autor). */
function ciclosInterrompidos(texto) {
  const out = [];
  let ciclo = null;
  const linhas = texto.split('\n');
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    const m = l.split('\t')[4] ?? '';
    if (m === 'Eleitor foi habilitado') ciclo = { inicio: l.slice(11, 19), conf: [], ultimaConf: null, depois: [], erros: [] };
    else if (!ciclo) continue;
    else if (m === 'O voto do eleitor foi computado' || m === 'Eleitor foi suspenso e não confirmou nenhum voto' || m === 'Aguardando digitação do identificador do eleitor') ciclo = null;
    else if (INTERROMPE(m)) {
      ciclo.evento = m.startsWith('Urna ligada em') ? 'Urna ligada em' : m.slice(0, 40);
      // O que a urna diz ao voltar (até a próxima habilitação): procura sinal técnico de voto gravado ou descartado
      ciclo.aposVolta = [];
      for (let j = i + 1; j < linhas.length && ciclo.aposVolta.length < 400; j++) {
        const mj = linhas[j].split('\t')[4] ?? '';
        if (mj === 'Eleitor foi habilitado') break;
        if (!/Verificação de assinatura|Espaço (livre|utilizado)|Carga da \[|Tamanho da/.test(mj)) ciclo.aposVolta.push(mj.slice(0, 110));
      }
      ciclo.horaEvento = l.slice(11, 19);
      ciclo.segundosAposUltimaConf = ciclo.ultimaConf === null ? null : seg(l) - ciclo.ultimaConf;
      out.push(ciclo);
      ciclo = null;
    } else if (m.startsWith('Voto confirmado para [')) {
      ciclo.conf.push(CARGO_LOG[m.slice(22, -1)] ?? m.slice(22, -1));
      ciclo.ultimaConf = seg(l);
      ciclo.depois = [];
    } else {
      if (/erro|ERRO|NÃO foi registrado|falha|Falha/.test(m) || l.split('\t')[1] === 'ERRO') ciclo.erros.push(m.slice(0, 90));
      if (ciclo.ultimaConf !== null && ciclo.depois.length < 12) ciclo.depois.push(m.slice(0, 70));
    }
  }
  if (ciclo) out.push({ ...ciclo, evento: 'fim do log', horaEvento: null, segundosAposUltimaConf: null });
  return out;
}

const dirJ = path.join(DIR_DADOS, 'parsed', 'auditoria', 'matematico', `${turno}t`);
const alvos = [];
for (const f of (await readdir(dirJ)).filter((x) => x.endsWith('.jsonl')).sort()) {
  for await (const linha of createInterface({ input: createReadStream(path.join(dirJ, f)), crlfDelay: Infinity })) {
    if (!linha) continue;
    const p = JSON.parse(linha);
    if (p.origem !== 'urna' || !p.log?.interrompidas) continue;
    const ultimo = Math.max(...(p.bu ?? []).map((b) => b.c).filter((c) => c <= 13)); // presidente (1) é o último na urna? decide-se abaixo pelo log
    alvos.push({ uf: p.uf, municipio: p.municipio, zona: p.zona, secao: p.secao, hash: p.hash, tipoUrna: p.tipoUrna, bu: p.comparecimento,
      computados: p.log.computados, interrompidas: p.log.interrompidas, k: p.comparecimento - p.log.computados, cargosBu: (p.bu ?? []).map((b) => b.c), ultimo });
  }
}
// Ordem dos cargos na urna: lida do próprio log (ciclos computados completos), não suposta
const ordemVista = new Map();
const linhasSaida = [];
const agreg = {};
for (const a of alvos) {
  const dh = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', a.uf, a.municipio, a.zona, a.secao, a.hash);
  const nomeLog = acharArquivo(await readdir(dh), 'log');
  const h = await open(path.join(dh, nomeLog));
  let porUrna;
  try {
    porUrna = linhasPorUrna(await textos(h), dia);
  } finally {
    await h.close();
  }
  const ciclos = [];
  for (const t of porUrna) {
    // último cargo confirmado num ciclo computado típico desta urna
    const ls = t.split('\n');
    let ult = null;
    for (let i = 0; i < ls.length; i++) {
      if ((ls[i].split('\t')[4] ?? '') === 'O voto do eleitor foi computado') {
        for (let j = i - 1; j >= 0 && j > i - 40; j--) {
          const m = ls[j].split('\t')[4] ?? '';
          if (m.startsWith('Voto confirmado para [')) {
            ult = CARGO_LOG[m.slice(22, -1)] ?? m.slice(22, -1);
            break;
          }
        }
        if (ult !== null) {
          ordemVista.set(String(ult), (ordemVista.get(String(ult)) ?? 0) + 1);
          break;
        }
      }
    }
    for (const c of ciclosInterrompidos(t)) ciclos.push({ ...c, completo: c.conf.length > 0 && String(c.conf.at(-1)) === String(ult ?? 1), ultimoCargoUrna: ult });
  }
  const resumo = {
    secao: `${a.uf}/${a.municipio}/${a.zona}/${a.secao}`, tipoUrna: a.tipoUrna, bu: a.bu, computados: a.computados, k: a.k, interrompidas: ciclos.length,
    completos: ciclos.filter((c) => c.completo).length, comConfirmacao: ciclos.filter((c) => c.conf.length).length, ciclos,
  };
  linhasSaida.push(JSON.stringify(resumo));
  const classe = a.k > 0 ? 'virouVoto' : a.k === 0 ? 'naoVirou' : 'logMaiorQueBu';
  const g = (agreg[classe] ??= { pacotes: 0, ciclos: 0, ciclosComConfirmacao: 0, ciclosCompletos: 0, pacotesComCicloCompleto: 0, eventos: {}, comErroNoCiclo: 0,
    completosSegundosAposConf: [], depoisDaUltimaConfNosCompletos: {} });
  g.pacotes++;
  g.ciclos += ciclos.length;
  g.ciclosComConfirmacao += resumo.comConfirmacao;
  g.ciclosCompletos += resumo.completos;
  if (resumo.completos) g.pacotesComCicloCompleto++;
  for (const c of ciclos) {
    g.eventos[c.evento] = (g.eventos[c.evento] ?? 0) + 1;
    if (c.erros.length) g.comErroNoCiclo++;
    if (c.completo) {
      g.completosSegundosAposConf.push(c.segundosAposUltimaConf);
      const chave = c.depois.join(' > ') || '(nada)';
      g.depoisDaUltimaConfNosCompletos[chave] = (g.depoisDaUltimaConfNosCompletos[chave] ?? 0) + 1;
      g.ciclosCompletosVistos = (g.ciclosCompletosVistos ?? 0) + 1;
      g.msgAposVoltaNosCompletos ??= {};
      for (const msg of new Set((c.aposVolta ?? []).map((x) => x.replace(/\d+/g, '#')))) g.msgAposVoltaNosCompletos[msg] = (g.msgAposVoltaNosCompletos[msg] ?? 0) + 1;
    }
  }
}
const destino = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');
await mkdir(destino, { recursive: true });
await writeFile(path.join(destino, `cetico-vsr-dados-interrupcoes-${turno}t.jsonl`), `${linhasSaida.join('\n')}\n`);
await writeFile(path.join(destino, `cetico-vsr-dados-interrupcoes-${turno}t.json`), `${JSON.stringify({ turno: Number(turno), pacotes: alvos.length, ultimoCargoNosCiclosComputados: Object.fromEntries(ordemVista), classes: agreg }, null, 1)}\n`);
console.log(`${turno}t: ${alvos.length} pacotes com interrupção; último cargo nos ciclos computados ${JSON.stringify(Object.fromEntries(ordemVista))}`);
for (const [k, g] of Object.entries(agreg)) {
  console.log(`\n[${k}] pacotes ${g.pacotes}, ciclos ${g.ciclos}, com confirmação ${g.ciclosComConfirmacao}, completos ${g.ciclosCompletos} (em ${g.pacotesComCicloCompleto} pacotes), com erro no ciclo ${g.comErroNoCiclo}`);
  console.log(`   eventos ${JSON.stringify(g.eventos)}`);
  console.log(`   segundos entre última confirmação e interrupção (completos): ${JSON.stringify(g.completosSegundosAposConf.slice(0, 80))}`);
  for (const [c, n] of Object.entries(g.depoisDaUltimaConfNosCompletos).sort((x, y) => y[1] - x[1]).slice(0, 12)) console.log(`   ${n}× ${c}`);
}
for (const l of linhasSaida) {
  const r = JSON.parse(l);
  if (r.k !== 0) console.log(`\nk=${r.k} ${r.secao} tipoUrna ${r.tipoUrna} BU ${r.bu} log ${r.computados}: ${r.ciclos.map((c) => `[${c.inicio} conf ${c.conf.join(',')} ${c.completo ? 'COMPLETO' : ''} → ${c.evento} ${c.horaEvento} (+${c.segundosAposUltimaConf}s) depois: ${c.depois.join(' > ')} erros: ${c.erros.join(' | ')}]`).join(' ')}`);
}
