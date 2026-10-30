// Engenheiro de segurança, doc 10 (pendências H23, H27, H15): funções comuns.
//  - pastaDoPacote(turno, k, hash?): pasta do pacote oficial da seção em data/raw/<t>t/urnas/<k>/<hash>/ (lista só a
//    pasta da seção; não varre data/raw). Sem hash, usa o do BU (tabela secao da cópia de leitura, 40 primeiros
//    caracteres do nome da pasta).
//  - diarios(pasta): todos os logd.dat do pacote (o principal e os aninhados em .jez), com profundidade e nome.
//  - linhas(texto): linhas do diário já separadas (data/hora, nível, urna, aplicação, mensagem), com o título de
//    eleitor ou mesário (10+ dígitos) trocado por '#'.
// Nada aqui grava CPF nem número de título.
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

export const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'engenheiro-seguranca-urna', 'pendencias');
const mem = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
const RE_DH = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/;

export async function pastaDoPacote(turno, k, hash) {
  const dir = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', ...k.split('/'));
  const nomes = (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  const h = hash ? nomes.find((n) => n.startsWith(hash) || hash.startsWith(n)) : nomes.length === 1 ? nomes[0] : null;
  if (!h) throw new Error(`pacote não achado: ${turno}t ${k} (${nomes.length} pastas)`);
  return path.join(dir, h);
}

async function textos(h, prof = 0, nome = 'log.jez') {
  const out = [];
  for (const e of await listarEntradas(h)) {
    const d = await lerEntrada(h, e);
    if (e.nome === 'logd.dat') out.push({ prof, nome: `${nome}/${e.nome}`, texto: d.toString('latin1') });
    else if (e.nome.endsWith('.jez') && prof < 3) out.push(...(await textos(mem(d), prof + 1, `${nome}/${e.nome}`)));
  }
  return out;
}

export async function diarios(pasta) {
  const nl = acharArquivo(await readdir(pasta), 'log');
  return textos(mem(await readFile(path.join(pasta, nl))));
}

export const semTitulo = (m) => m.replace(/\d{10,}/g, '#');

export function linhas(texto) {
  const out = [];
  for (const bruta of texto.split('\n')) {
    const c = bruta.replace(/\r$/, '').split('\t');
    if (c.length < 5 || !RE_DH.test(c[0])) continue;
    out.push({ dh: c[0], nivel: c[1], urna: c[2], app: c[3], msg: semTitulo(c[4]) });
  }
  return out;
}

/** "dd/mm/aaaa hh:mm:ss" → segundos (UTC fictício, só para diferenças). */
export const seg = (dh) => Date.UTC(+dh.slice(6, 10), +dh.slice(3, 5) - 1, +dh.slice(0, 2), +dh.slice(11, 13), +dh.slice(14, 16), +dh.slice(17, 19)) / 1000;
/** "dd/mm/aaaa hh:mm:ss" → "aaaa-mm-dd hh:mm:ss". */
export const iso = (dh) => (dh ? `${dh.slice(6, 10)}-${dh.slice(3, 5)}-${dh.slice(0, 2)} ${dh.slice(11, 19)}` : null);
