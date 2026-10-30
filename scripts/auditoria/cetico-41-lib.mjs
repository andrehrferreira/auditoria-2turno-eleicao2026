// Cético, parecer 41: funções comuns (leitura própria dos diários brutos, sem passar pela lib do engenheiro).
//  - pacote(turno, k, hash?): pasta do pacote da seção (lista só a pasta da seção; não varre data/raw);
//  - diariosDoPacote(pasta): todos os logd.dat do log.jez, inclusive os aninhados em .jez, até 4 níveis;
//  - parse(texto): linhas {dh, nivel, urna, app, msg}; números de 10+ dígitos (título) trocados por '#'.
// Nada aqui grava CPF nem número de título.
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

export const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', 'p41');

const emMemoria = (b) => ({ read: async (dst, off, len, pos) => ({ bytesRead: b.copy(dst, off, pos, pos + len) }), stat: async () => ({ size: b.length }) });

export async function pacote(turno, k, hash) {
  const dir = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', ...k.split('/'));
  const subs = (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  let h = null;
  if (hash) h = subs.find((n) => n.startsWith(hash) || hash.startsWith(n)) ?? null;
  else if (subs.length === 1) h = subs[0];
  if (!h) throw new Error(`pacote ${turno}t ${k}: ${subs.length} pastas`);
  return path.join(dir, h);
}

async function abrirJez(buf, nome, prof, out) {
  const h = emMemoria(buf);
  for (const e of await listarEntradas(h)) {
    const d = await lerEntrada(h, e);
    if (e.nome === 'logd.dat') out.push({ nome: `${nome}/${e.nome}`, prof, texto: d.toString('latin1') });
    else if (/\.jez$/i.test(e.nome) && prof < 4) await abrirJez(d, `${nome}/${e.nome}`, prof + 1, out);
  }
}

export async function diariosDoPacote(pasta) {
  const nomes = await readdir(pasta);
  const log = nomes.find((n) => /\.logjez$/i.test(n)) ?? nomes.find((n) => /log\.jez$/i.test(n)) ?? nomes.find((n) => /\.jez$/i.test(n) && /log/i.test(n));
  if (!log) throw new Error(`sem log em ${pasta}: ${nomes.join(',')}`);
  const out = [];
  await abrirJez(await readFile(path.join(pasta, log)), log, 0, out);
  return out;
}

const RE = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/;
export function parse(texto) {
  const L = [];
  for (const raw of texto.split('\n')) {
    const c = raw.replace(/\r$/, '').split('\t');
    if (c.length < 5 || !RE.test(c[0])) continue;
    L.push({ dh: c[0], nivel: c[1], urna: c[2], app: c[3], msg: c[4].replace(/\d{10,}/g, '#') });
  }
  return L;
}
export const ts = (dh) => Date.UTC(+dh.slice(6, 10), +dh.slice(3, 5) - 1, +dh.slice(0, 2), +dh.slice(11, 13), +dh.slice(14, 16), +dh.slice(17, 19)) / 1000;
