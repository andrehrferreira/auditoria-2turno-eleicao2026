// Perfil do eleitorado por seção (dados abertos do TSE, perfil_eleitor_secao_2026_<UF>.zip), reduzido ao que os
// testes de biometria precisam: eleitores, eleitores com biometria cadastrada, faixas etárias e a faixa etária de quem
// não tem biometria. Só contagens agregadas por seção, sem dado pessoal.
// Uso: node scripts/auditoria/biometria-cadastro.mjs [--uf ac,al]
// Saída: data/parsed/auditoria/biometria/cadastro-secao.jsonl (uma linha por seção) e cadastro-resumo.json
import { createReadStream } from 'node:fs';
import { mkdir, open, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { createInflateRaw } from 'node:zlib';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { listarEntradas } from '../../src/zip.js';

export const DIR_SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'biometria');
const DIR_PERFIL = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'perfil_eleitor_secao');

const chave = (uf, municipio, zona, secao) => `${uf}/${municipio}/${zona}/${secao}`;

/** Linhas do primeiro CSV do zip, em streaming (o CSV de SP passa de 1 GB). */
async function* linhasCsv(arquivoZip) {
  const handle = await open(arquivoZip, 'r');
  let entrada;
  let inicio;
  try {
    entrada = (await listarEntradas(handle)).find((e) => e.nome.toLowerCase().endsWith('.csv'));
    if (!entrada) throw new Error(`${path.basename(arquivoZip)} sem CSV`);
    const cabecalho = Buffer.alloc(30);
    await handle.read(cabecalho, 0, 30, entrada.offsetLocal);
    inicio = entrada.offsetLocal + 30 + cabecalho.readUInt16LE(26) + cabecalho.readUInt16LE(28);
  } finally {
    await handle.close();
  }
  let fluxo = createReadStream(arquivoZip, { start: inicio, end: inicio + entrada.tamanhoComprimido - 1 });
  if (entrada.metodo === 8) fluxo = fluxo.pipe(createInflateRaw());
  yield* createInterface({ input: fluxo.setEncoding('latin1'), crlfDelay: Infinity });
}

// Campos numéricos e códigos não têm ';' dentro; os nomes de local podem ter, mas vêm entre aspas.
function separar(linha) {
  const campos = [];
  let atual = '';
  let aspas = false;
  for (const ch of linha) {
    if (ch === '"') aspas = !aspas;
    else if (ch === ';' && !aspas) { campos.push(atual); atual = ''; }
    else atual += ch;
  }
  campos.push(atual);
  return campos;
}

// Faixas etárias (CD_FAIXA_ETARIA): 1600, 1700, ..., 7074, 7579, ..., 9999; -3 = inválida
const faixa = (cod) => (cod < 0 ? 'invalida' : cod < 1800 ? '16a17' : cod < 2124 ? '18a20' : cod < 6064 ? '21a59' : cod < 7074 ? '60a69' : cod < 8084 ? '70a79' : '80mais');

export async function carregarUf(uf) {
  const secoes = new Map();
  let col = null;
  for await (const linha of linhasCsv(path.join(DIR_PERFIL, `perfil_eleitor_secao_2026_${uf.toUpperCase()}.zip`))) {
    const c = separar(linha);
    if (!col) {
      col = Object.fromEntries(c.map((n, i) => [n, i]));
      for (const n of ['SG_UF', 'CD_MUNICIPIO', 'NR_ZONA', 'NR_SECAO', 'CD_FAIXA_ETARIA', 'QT_ELEITORES', 'QT_ELEITORES_BIOMETRIA']) {
        if (!(n in col)) throw new Error(`${uf}: coluna ${n} ausente`);
      }
      continue;
    }
    const k = chave(uf, c[col.CD_MUNICIPIO].padStart(5, '0'), c[col.NR_ZONA].padStart(4, '0'), c[col.NR_SECAO].padStart(4, '0'));
    let s = secoes.get(k);
    if (!s) {
      s = { eleitores: 0, biometria: 0, faixas: {}, semBioFaixas: {}, localVotacao: Number(c[col.NR_LOCAL_VOTACAO]), dataGeracao: c[col.DT_GERACAO] };
      secoes.set(k, s);
    }
    const qt = Number(c[col.QT_ELEITORES]);
    const bio = Number(c[col.QT_ELEITORES_BIOMETRIA]);
    const f = faixa(Number(c[col.CD_FAIXA_ETARIA]));
    s.eleitores += qt;
    s.biometria += bio;
    s.faixas[f] = (s.faixas[f] ?? 0) + qt;
    if (qt - bio) s.semBioFaixas[f] = (s.semBioFaixas[f] ?? 0) + (qt - bio);
  }
  return secoes;
}

/** Lê a saída já gerada: Map chave → registro. */
export async function lerCadastro() {
  const mapa = new Map();
  const texto = await readFile(path.join(DIR_SAIDA, 'cadastro-secao.jsonl'), 'utf8');
  for (const linha of texto.split('\n')) {
    if (!linha) continue;
    const r = JSON.parse(linha);
    mapa.set(r.k, r);
  }
  return mapa;
}

async function principal() {
  const { values } = parseArgs({ options: { uf: { type: 'string' } } });
  const ufs = values.uf ? values.uf.split(',') : UFS;
  await mkdir(DIR_SAIDA, { recursive: true });
  const linhas = [];
  const resumo = {};
  for (const uf of ufs) {
    const inicio = Date.now();
    const secoes = await carregarUf(uf);
    let eleitores = 0;
    let biometria = 0;
    for (const [k, s] of secoes) {
      linhas.push(JSON.stringify({ k, ...s }));
      eleitores += s.eleitores;
      biometria += s.biometria;
    }
    resumo[uf] = { secoes: secoes.size, eleitores, biometria, semBiometria: eleitores - biometria, pctSemBiometria: +(100 * (1 - biometria / eleitores)).toFixed(2) };
    console.log(`${uf}: ${secoes.size} seções, ${eleitores} eleitores, ${eleitores - biometria} sem biometria (${resumo[uf].pctSemBiometria}%) · ${((Date.now() - inicio) / 1000).toFixed(0)} s`);
  }
  await writeFile(path.join(DIR_SAIDA, 'cadastro-secao.jsonl'), `${linhas.join('\n')}\n`);
  await writeFile(path.join(DIR_SAIDA, 'cadastro-resumo.json'), `${JSON.stringify(resumo, null, 1)}\n`);
}

if (import.meta.filename === path.resolve(process.argv[1] ?? '')) await principal();
