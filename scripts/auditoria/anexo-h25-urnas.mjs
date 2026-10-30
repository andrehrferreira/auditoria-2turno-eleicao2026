#!/usr/bin/env node
// Anexo do relatório temático do certificado da AC URNA (H25): a lista completa das seções
// cujo pacote foi assinado por urna com carteira digital da AC URNA, uma planilha por turno.
//
//   node scripts/auditoria/anexo-h25-urnas.mjs
//
// Entrada: data/parsed/auditoria/seguranca-h25/{1t,2t}-certs.jsonl (um certificado por seção),
//          data/parsed/auditoria/cetico-revisor/33-h25-certificados.json (validade da AC e certificados tardios),
//          nome do município da cópia de leitura do banco.
// Saída:   docs/pericia/temas/certificado-ac-urna/anexos/urnas-ac-urna-{1,2}turno.csv
//          (UTF-8 com BOM, separador ";", abre direto no Excel em português).
// Para com FALHA se alguma conferência não bater.

import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { salvarAtomico } from '../../src/http.js';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const ENTRADA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'seguranca-h25');
const REVISAO = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '33-h25-certificados.json');
const SAIDA = path.join(RAIZ, 'docs', 'pericia', 'temas', 'certificado-ac-urna', 'anexos');

// valores conferidos no parecer da revisão (universo completo dos dois turnos)
export const ESPERADO = { 1: { secoes: 99985, tardias: 45 }, 2: { secoes: 99957, tardias: 53 } };

export const CABECALHO = [
  'UF',
  'Código do município (TSE)',
  'Município',
  'Zona',
  'Seção',
  'Modelo da urna',
  'Número da urna',
  'Número de série do certificado (hexadecimal)',
  'Certificado válido a partir de',
  'Certificado válido até',
  'Emitido depois do vencimento da AC URNA',
];

/** Data dd/mm/aaaa no horário de Brasília. */
export function dataBr(iso) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short' }).format(new Date(iso));
}

/** Série em bytes hexadecimais separados por espaço ("2C FA 0B"): o Excel mantém como texto. */
export function serieHex(serie) {
  const h = serie.toUpperCase();
  const par = h.length % 2 ? `0${h}` : h;
  return par.match(/../g).join(' ');
}

const celula = (v) => {
  const s = String(v);
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Linha da planilha para um certificado da AC URNA. */
export function linhaCsv(o, nomeMunicipio, fimAc) {
  return [
    o.uf.toUpperCase(),
    o.mun,
    nomeMunicipio,
    o.zona,
    o.secao,
    o.modelo.replace(/^ue/i, ''),
    o.numeroInternoUrna,
    serieHex(o.serie),
    dataBr(o.nb.iso),
    dataBr(o.na.iso),
    Date.parse(o.nb.iso) > fimAc ? 'sim' : 'não',
  ]
    .map(celula)
    .join(';');
}

/** Número de 10 a 12 dígitos seguidos (formato de título de eleitor ou CPF). */
export const RE_DOCUMENTO = /(?<!\d)\d{10,12}(?!\d)|(?<!\d)\d{3}\.\d{3}\.\d{3}-\d{2}(?!\d)/;

/** Confere uma planilha montada; devolve a lista de falhas (vazia se tudo bate). */
export function conferirPlanilha({ linhas, esperado, tardiasRevisao, chavesTardias }) {
  const falhas = [];
  if (linhas.length !== esperado.secoes) falhas.push(`${linhas.length} seções na planilha; o esperado é ${esperado.secoes}`);
  const sim = linhas.filter((l) => l.endsWith(';sim'));
  if (sim.length !== esperado.tardias) falhas.push(`${sim.length} seções com "sim"; o esperado é ${esperado.tardias}`);
  if (tardiasRevisao.size !== esperado.tardias) falhas.push(`${tardiasRevisao.size} seções tardias no parecer; o esperado é ${esperado.tardias}`);
  const faltam = [...tardiasRevisao].filter((k) => !chavesTardias.has(k));
  const sobram = [...chavesTardias].filter((k) => !tardiasRevisao.has(k));
  if (faltam.length || sobram.length) falhas.push(`seções tardias diferentes do parecer: faltam [${faltam.join(' ')}] sobram [${sobram.join(' ')}]`);
  const doc = linhas.find((l) => RE_DOCUMENTO.test(l));
  if (doc) falhas.push(`número com formato de título de eleitor ou CPF: ${doc}`);
  return falhas;
}

async function lerTurno(turno, nomes, fimAc) {
  const arquivo = path.join(ENTRADA, `${turno}t-certs.jsonl`);
  const registros = [];
  const chaves = new Set();
  const falhas = [];
  const rl = createInterface({ input: createReadStream(arquivo, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const l of rl) {
    if (!l.includes('"AC URNA"')) continue;
    const o = JSON.parse(l);
    if (o.emissor !== 'AC URNA') continue;
    const chave = `${o.uf}/${o.mun}/${o.zona}/${o.secao}`;
    if (chaves.has(chave)) falhas.push(`seção repetida: ${chave}`);
    chaves.add(chave);
    const nome = nomes.get(`${o.uf}/${o.mun}`);
    if (!nome) falhas.push(`município sem nome no banco: ${o.uf}/${o.mun}`);
    if (!/^\d{7,8}$/.test(String(o.numeroInternoUrna))) falhas.push(`número da urna fora do formato (7 a 8 dígitos): ${chave}`);
    if (!/^[0-9a-f]+$/i.test(o.serie)) falhas.push(`série do certificado não é hexadecimal: ${chave}`);
    registros.push({ o, nome: nome ?? '', chave });
  }
  registros.sort((a, b) => (a.chave < b.chave ? -1 : a.chave > b.chave ? 1 : 0));
  return { registros, falhas };
}

async function principal() {
  const revisao = JSON.parse(await readFile(REVISAO, 'utf8'));
  const fimAc = Date.parse(revisao.acUrna.validade[1]);
  const { db } = await abrirLeitura();
  const nomes = new Map(db.prepare('SELECT uf, codigo, nome FROM municipio').all().map((m) => [`${m.uf}/${m.codigo}`, m.nome]));
  db.close();
  const falhas = [];
  const resumo = [];
  const saidas = [];
  for (const turno of [2, 1]) {
    const { registros, falhas: f } = await lerTurno(turno, nomes, fimAc);
    falhas.push(...f.map((x) => `${turno}º turno: ${x}`));
    const linhas = registros.map((r) => linhaCsv(r.o, r.nome, fimAc));
    const chavesTardias = new Set(registros.filter((r) => Date.parse(r.o.nb.iso) > fimAc).map((r) => r.chave));
    const tardiasRevisao = new Set(revisao.turnos[`${turno}t`].tardios.map((x) => x.secao));
    const esperado = ESPERADO[turno];
    if (revisao.turnos[`${turno}t`].porEmissor['AC URNA'].diretorios !== esperado.secoes) {
      falhas.push(`${turno}º turno: o parecer traz ${revisao.turnos[`${turno}t`].porEmissor['AC URNA'].diretorios} seções; o esperado é ${esperado.secoes}`);
    }
    falhas.push(...conferirPlanilha({ linhas, esperado, tardiasRevisao, chavesTardias }).map((x) => `${turno}º turno: ${x}`));
    const destino = path.join(SAIDA, `urnas-ac-urna-${turno}turno.csv`);
    saidas.push({ destino, conteudo: `﻿${[CABECALHO.join(';'), ...linhas].join('\r\n')}\r\n` });
    resumo.push(`${turno}º turno: ${linhas.length} seções, ${chavesTardias.size} com certificado emitido depois do vencimento da AC URNA`);
  }
  if (falhas.length) {
    console.error(`FALHA: a planilha não foi gravada.\n- ${falhas.slice(0, 30).join('\n- ')}`);
    process.exitCode = 1;
    return;
  }
  for (const s of saidas) {
    await salvarAtomico(s.destino, s.conteudo);
    console.log(`gravado: ${path.relative(RAIZ, s.destino).split(path.sep).join('/')} (${(Buffer.byteLength(s.conteudo) / 1048576).toFixed(1)} MB)`);
  }
  for (const r of resumo) console.log(`OK ${r}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  await principal();
}
