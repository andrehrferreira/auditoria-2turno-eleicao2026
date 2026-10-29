// Revisor cético, "votos sem rastro no log", foco 4: por que algumas habilitações interrompidas viram voto no BU
// e outras não. Lista de pacotes: todos com ciclo interrompido segundo a saída do autor
// (data/parsed/auditoria/matematico/<t>t/*.jsonl, campo log.interrompidas > 0). Cada log é relido aqui, ciclo a ciclo:
// cargos já confirmados, última mensagem antes da interrupção, mensagem que interrompeu e erro técnico no ciclo.
// O BU vem do banco (cópia de leitura). Pacote "virou voto" = comparecimento do BU − computados da própria seção.
// Uso: node scripts/auditoria/cetico-vsr-interrupcoes.mjs --turno 2
import { createReadStream } from 'node:fs';
import { open, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' } } });
const turno = Number(values.turno);
const DIA = { 1: '04/10/2026', 2: '25/10/2026' }[turno];
const { db, ponteiro } = await abrirLeitura({ aoAvisar: () => {} });
if (!ponteiro) throw new Error('sem cópia de leitura');
const comp = db.prepare('select comparecimento, hash from secao where turno=? and uf=? and municipio=? and zona=? and secao=?');

const dirAutor = path.join(DIR_DADOS, 'parsed', 'auditoria', 'matematico', `${turno}t`);
const lista = [];
for (const f of (await readdir(dirAutor)).filter((x) => x.endsWith('.jsonl'))) {
  for await (const linha of createInterface({ input: createReadStream(path.join(dirAutor, f)), crlfDelay: Infinity })) {
    if (!linha.includes('"interrompidas":') || linha.includes('"interrompidas":0,')) continue;
    const p = JSON.parse(linha);
    if (p.log?.interrompidas > 0) lista.push({ uf: p.uf, municipio: p.municipio, zona: p.zona, secao: p.secao, hash: p.hash, interrompidasAutor: p.log.interrompidas });
  }
}

const mem = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
async function logds(handle, out, prof = 0) {
  for (const e of await listarEntradas(handle)) {
    if (e.nome === 'logd.dat') out.push((await lerEntrada(handle, e)).toString('latin1'));
    else if (e.nome.endsWith('.jez') && prof < 4) await logds(mem(await lerEntrada(handle, e)), out, prof + 1);
  }
  return out;
}
const INTERROMPE = (m) => m.startsWith('Urna ligada em') || m.startsWith('Iniciando aplicação') || m === 'Votação suspensa' || m.startsWith('Inicio do Encerramento');
const ERRO = /Erro inesperado|NÃO foi registrado|ERROR|erro \d+/i;

const pacotes = [];
for (const s of lista) {
  const dir = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', s.uf, s.municipio, s.zona, s.secao, s.hash);
  const nomeLog = (await readdir(dir)).find((n) => n.endsWith('-log.jez'));
  const h = await open(path.join(dir, nomeLog));
  let textos;
  try { textos = await logds(h, []); } finally { await h.close(); }
  const porUrna = new Map();
  for (const t of textos.sort((a, b) => b.length - a.length)) {
    for (const l0 of t.split('\n')) {
      const l = l0.replace(/\r$/, '');
      const c = l.split('\t');
      if (!c[4]) continue;
      let u = porUrna.get(c[2]);
      if (!u) porUrna.set(c[2], (u = { vistas: new Set(), linhas: [] }));
      if (u.vistas.has(l)) continue;
      u.vistas.add(l);
      u.linhas.push(c);
    }
  }
  let propria = 0;
  const ciclos = [];
  for (const [urna, u] of porUrna) {
    let sec = null;
    let ciclo = null;
    let ultimo = null;
    for (const c of u.linhas) {
      const m = c[4];
      const ms = /^Seção Eleitoral: (\d+)$/.exec(m);
      if (ms) sec = ms[1];
      if (!c[0].startsWith(DIA)) continue;
      if (m === 'Eleitor foi habilitado') ciclo = { urna, inicio: c[0], conf: [], erro: null };
      else if (ciclo && m.startsWith('Voto confirmado para [')) ciclo.conf.push(m.slice(22, -1));
      else if (ciclo && (ERRO.test(m) || c[1] === 'ERRO')) ciclo.erro ??= m.slice(0, 120);
      else if (m === 'O voto do eleitor foi computado') { if (Number(sec) === Number(s.secao)) propria++; ciclo = null; }
      else if (m === 'Eleitor foi suspenso e não confirmou nenhum voto') ciclo = null;
      else if (ciclo && INTERROMPE(m)) {
        ciclos.push({ ...ciclo, fim: c[0], interrompeu: m.slice(0, 60), ultimaAntes: ultimo?.slice(0, 90) ?? null, secao: sec });
        ciclo = null;
      }
      if (ciclo) ultimo = m;
    }
    if (ciclo) ciclos.push({ ...ciclo, fim: null, interrompeu: 'fim do log', ultimaAntes: ultimo?.slice(0, 90) ?? null, secao: sec });
  }
  const r = comp.get(turno, s.uf, s.municipio, s.zona, s.secao);
  const viraram = (r?.comparecimento ?? 0) - propria;
  pacotes.push({ chave: `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`, bu: r?.comparecimento, propria, viraram, interrompidas: ciclos.length, interrompidasAutor: s.interrompidasAutor, ciclos });
}

const classe = (c) => (c.conf.includes('Presidente') ? 'comPresidente' : c.conf.length ? 'parcial' : 'semConfirmacao');
const resumo = { turno, pacotes: pacotes.length, ciclos: 0, porClasse: {}, porClasseComErro: {}, porInterrupcao: {}, pacotesViraram: [], pacotesComPresidenteQueNaoViraram: [] };
for (const p of pacotes) {
  for (const c of p.ciclos) {
    resumo.ciclos++;
    const k = classe(c);
    resumo.porClasse[k] = (resumo.porClasse[k] ?? 0) + 1;
    if (c.erro) resumo.porClasseComErro[k] = (resumo.porClasseComErro[k] ?? 0) + 1;
    const i = `${k} | ${c.interrompeu.replace(/\d.*$/, '')}`;
    resumo.porInterrupcao[i] = (resumo.porInterrupcao[i] ?? 0) + 1;
  }
  const comP = p.ciclos.filter((c) => classe(c) === 'comPresidente').length;
  if (p.viraram !== 0) resumo.pacotesViraram.push({ chave: p.chave, bu: p.bu, propria: p.propria, viraram: p.viraram, comPresidente: comP, ciclos: p.ciclos.map((c) => ({ inicio: c.inicio, fim: c.fim, conf: c.conf.join(','), interrompeu: c.interrompeu, ultimaAntes: c.ultimaAntes, erro: c.erro })) });
  else if (comP) resumo.pacotesComPresidenteQueNaoViraram.push({ chave: p.chave, comPresidente: comP, ciclos: p.ciclos.filter((c) => classe(c) === 'comPresidente').map((c) => ({ inicio: c.inicio, fim: c.fim, conf: c.conf.join(','), interrompeu: c.interrompeu, ultimaAntes: c.ultimaAntes, erro: c.erro })) });
}
const arq = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', `cetico-vsr-interrupcoes-${turno}t.json`);
await writeFile(arq, `${JSON.stringify(resumo, null, 1)}\n`);
console.log(JSON.stringify({ turno, pacotes: resumo.pacotes, ciclos: resumo.ciclos, porClasse: resumo.porClasse, porClasseComErro: resumo.porClasseComErro, viraram: resumo.pacotesViraram.length, comPresidenteNaoViraram: resumo.pacotesComPresidenteQueNaoViraram.length }));
console.log(JSON.stringify(resumo.porInterrupcao, null, 1));
for (const p of resumo.pacotesViraram) console.log('VIROU', JSON.stringify(p));
for (const p of resumo.pacotesComPresidenteQueNaoViraram) console.log('NAO', JSON.stringify(p));
console.log(`gravado ${arq}`);
