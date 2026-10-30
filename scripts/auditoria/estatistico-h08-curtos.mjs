// Estatístico eleitoral, H08 (exploratório, acrescentado depois do resultado C3 — doc 17): nas seções com excesso
// Bonferroni-significativo de ciclos curtos (D ≤ LE) no teste binomial, relê o diário e classifica cada ciclo curto pela
// via de liberação do segundo eleitor e pela hora. Pergunta: os ciclos curtos são eleitores pela própria digital
// (o mesário não consegue simular a digital de um ausente) ou concentram-se em liberação sem digital?
// Uso: node scripts/auditoria/estatistico-h08-curtos.mjs
// Entrada: data/parsed/auditoria/estatistico/h08/{resultado.json, secoes-bonferroni.csv}
// Saída: data/parsed/auditoria/estatistico/h08/curtos.json
import { readFileSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { fluxosDoTexto, textos } from './estatistico-h08-varredura.mjs';

const BASE = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h08');
const DIAS = { 1: '04/10/2026', 2: '25/10/2026' };
const r = JSON.parse(readFileSync(path.join(BASE, 'resultado.json'), 'utf8'));
const memoria = (buf) => ({ read: async (d, o, n, p) => ({ bytesRead: buf.copy(d, o, p, p + n) }), stat: async () => ({ size: buf.length }) });
const seg = (l) => Number(l.slice(11, 13)) * 3600 + Number(l.slice(14, 16)) * 60 + Number(l.slice(17, 19));
const sub = async (d) => (await readdir(d, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();

const linhas = readFileSync(path.join(BASE, 'secoes-bonferroni.csv'), 'utf8').trim().split('\n');
const cab = linhas[0].split(';');
const alvos = linhas.slice(1).map((l) => Object.fromEntries(l.split(';').map((v, i) => [cab[i], v])));

const saida = {};
for (const turno of [1, 2]) {
  const LE = r.turnos[turno].LE;
  const limite = (k) => (LE[String(k)] ?? r.turnos[turno].LEturno).LE;
  const acc = { secoes: 0, ciclos: { total: 0, v1: 0, semDigital: 0 }, curtos: { total: 0, v1: 0, semDigital: 0 }, curtosPorHora: {}, todosPorHora: {}, secoesComCurtoSemDigitalMaioria: 0 };
  for (const a of alvos.filter((x) => Number(x.turno) === turno)) {
    acc.secoes++;
    const [uf, m, z, s] = a.id.split('/');
    const dirS = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', uf, m, z, s);
    const copias = new Map();
    const vistos = new Set();
    for (const hash of await sub(dirS)) {
      const nomes = await readdir(path.join(dirS, hash));
      const log = acharArquivo(nomes, 'log');
      if (!log) continue;
      const bytes = await readFile(path.join(dirS, hash, log));
      const chave = bytes.length + ':' + bytes.subarray(0, 64).toString('hex');
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      for (const t of await textos(memoria(bytes))) for (const [urna, ls] of fluxosDoTexto(t, DIAS[turno], s, { n: 0 })) { if (!copias.has(urna)) copias.set(urna, []); copias.get(urna).push(ls); }
    }
    let curtosSec = 0, curtosSemDig = 0;
    for (const lista of copias.values()) {
      lista.sort((x, y) => y.length - x.length);
      const vistas = new Set();
      let H = null, k = 0, bio = false, prevV = null;
      for (const l of lista[0]) {
        if (vistas.has(l)) continue;
        vistas.add(l);
        const msg = l.split('\t')[4] ?? '';
        if (msg === 'Identificador do eleitor digitado pelo mesário' || msg === 'Aguardando digitação do identificador do eleitor') { bio = false; if (msg !== 'Identificador do eleitor digitado pelo mesário') H = null; }
        else if (msg.includes('[biométrica]')) bio = true;
        else if (msg === 'Eleitor foi habilitado') { H = seg(l); k = 0; }
        else if (msg.startsWith('Voto confirmado para [')) { if (H !== null) k++; }
        else if (msg === 'O voto do eleitor foi computado') {
          const t = seg(l);
          const hora = l.slice(11, 13);
          if (prevV !== null && t >= prevV) {
            const D = t - prevV;
            acc.ciclos.total++; if (bio) acc.ciclos.v1++; else acc.ciclos.semDigital++;
            acc.todosPorHora[hora] = (acc.todosPorHora[hora] ?? 0) + 1;
            if (D <= limite(H === null ? 'semCiclo' : Math.min(k, 9))) {
              acc.curtos.total++; curtosSec++;
              if (bio) acc.curtos.v1++; else { acc.curtos.semDigital++; curtosSemDig++; }
              acc.curtosPorHora[hora] = (acc.curtosPorHora[hora] ?? 0) + 1;
            }
          }
          prevV = t; H = null; bio = false;
        }
      }
    }
    if (curtosSemDig * 2 > curtosSec) { acc.secoesComCurtoSemDigitalMaioria++; (acc.listaSemDigitalMaioria ??= []).push({ id: a.id, curtos: curtosSec, curtosSemDigital: curtosSemDig, v2: Number(a.v2), v3m: Number(a.v3m), v3s: Number(a.v3s), votos: Number(a.votos), log10pBB: Number(a.log10pBB) }); }
  }
  acc.parcelaV1 = { todos: acc.ciclos.v1 / acc.ciclos.total, curtos: acc.curtos.v1 / acc.curtos.total };
  saida[turno] = acc;
}
await writeFile(path.join(BASE, 'curtos.json'), JSON.stringify(saida, null, 1));
console.log(JSON.stringify(saida, null, 1));
