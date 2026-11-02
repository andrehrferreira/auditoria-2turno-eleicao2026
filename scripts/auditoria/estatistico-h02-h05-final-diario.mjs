// Estatístico eleitoral, doc 30 (plano 29): leitura do diário de uma seção num turno, atendimento a atendimento, para a
// H02(b) (ritmo do resíduo) e a H05(c) (as 97 seções de liberação em massa). Mesmo caminho de leitura da varredura do
// horário (estatistico-h08-varredura.mjs: entradas do .jez, fluxo por urna, só a seção declarada, união das cópias).
// Devolve só contagens, horários e vias. Nenhum título de mesário ou de eleitor sai daqui.
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { fluxosDoTexto, juntarCopias, textos } from './estatistico-h08-varredura.mjs';

export const DIA = { 1: '04/10/2026', 2: '25/10/2026' };
const memoria = (buf) => ({ read: async (d, o, n, p) => ({ bytesRead: buf.copy(d, o, p, p + n) }), stat: async () => ({ size: buf.length }) });
const sub = async (d) => (await readdir(d, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
export const seg = (l) => Number(l.slice(11, 13)) * 3600 + Number(l.slice(14, 16)) * 60 + Number(l.slice(17, 19));
const RE_TENT = /^Solicita digital\. Tentativa \[(\d+)\] de \[(\d+)\]/;
const RE_SCORE = /^Batimento de digitais retornou o score (\d+)/;

/**
 * Atendimentos que terminam em voto, em ordem, por urna: { t, urna, via: 'v1'|'v2'|'v3'|'outra', foto, pede, tent,
 * mesario: 'registrado'|'semAssociacao'|null, scoreMesario }. Mais: jaVotou (horários), encerramento por urna, erros e alertas.
 */
export async function lerCiclos(turno, uf, mun, zona, sec) {
  const dirS = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', uf, mun, zona, sec);
  const copias = new Map();
  const hashes = new Set();
  for (const hash of await sub(dirS)) {
    const nomes = await readdir(path.join(dirS, hash));
    const log = acharArquivo(nomes, 'log');
    if (!log) continue;
    const bytes = await readFile(path.join(dirS, hash, log));
    const h = createHash('sha256').update(bytes).digest('hex');
    if (hashes.has(h)) continue;
    hashes.add(h);
    for (const t of await textos(memoria(bytes))) {
      for (const [urna, ls] of fluxosDoTexto(t, DIA[turno], sec, { n: 0 })) { if (!copias.has(urna)) copias.set(urna, []); copias.get(urna).push(ls); }
    }
  }
  const ciclos = [], jaVotou = [], encerramento = {};
  let erros = 0, alertas = 0;
  for (const [urna, lista] of copias) {
    const vistas = new Set();
    let m = null;
    const zera = () => { m = { foto: false, pede: false, tent: 0, bio: false, ano: false, dado: false, mesario: null, score: null, ultimoScore: null }; };
    zera();
    for (const l of juntarCopias(lista).linhas) {
      if (vistas.has(l)) continue;
      vistas.add(l);
      const c = l.split('\t');
      const msg = c[4] ?? '';
      if (c[1] === 'ERRO') erros++; else if (c[1] === 'ALERTA') alertas++;
      if (msg === 'Identificador do eleitor digitado pelo mesário' || msg === 'Aguardando digitação do identificador do eleitor') zera();
      else if (msg.startsWith('Inicio do Encerramento')) encerramento[urna] = seg(l);
      else if (msg.includes('já votou')) jaVotou.push(seg(l));
      else if (msg.includes('Tipo de habilitação do eleitor [biométrica]')) m.bio = true;
      else if (msg.startsWith('Ano de nascimento digitado é igual ao do cadastro')) m.ano = true;
      else if (msg === 'Dado digitado confere') m.dado = true;
      else if (msg === 'Foto do eleitor apresentada') m.foto = true;
      else if (msg.startsWith('Solicita digital. Tentativa')) { m.pede = true; const r = RE_TENT.exec(msg); if (r) m.tent = Math.max(m.tent, Number(r[1])); }
      else if (RE_SCORE.test(msg)) m.ultimoScore = Number(RE_SCORE.exec(msg)[1]);
      else if (/^Mesário \d+ habilitou o eleitor/.test(msg)) { m.mesario = 'registrado'; m.score = m.ultimoScore; }
      else if (msg.startsWith('Digital coletada bate com uma digital gravada') || msg.startsWith('Não encontrou digital coletada')) { if (m.mesario !== 'registrado') m.mesario = 'semAssociacao'; m.score = m.ultimoScore; }
      else if (msg === 'O voto do eleitor foi computado') {
        const via = m.bio ? 'v1' : m.ano ? 'v2' : m.dado ? 'v3' : 'outra';
        ciclos.push({ t: seg(l), urna, via, foto: m.foto, pede: m.pede, tent: m.tent, mesario: via === 'v3' ? m.mesario : null, scoreMesario: via === 'v3' ? m.score : null });
        zera();
      }
    }
  }
  ciclos.sort((a, b) => a.t - b.t);
  jaVotou.sort((a, b) => a - b);
  return { ciclos, jaVotou, encerramento, erros, alertas, urnas: copias.size };
}
