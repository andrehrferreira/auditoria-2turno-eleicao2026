import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { hashDiretorio } from '../../src/vsc.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';
import { DIR_H27, somar } from './seguranca-h27-lib.mjs';

// H27, teste 3 (engenheiro de segurança, doc 09): estrutura do pacote RED. Pergunta: o diário da urna original, que vem
// dentro do pacote assinado pela urna que fez o RED, traz alguma assinatura PRÓPRIA da urna original (um .vsc ou outro
// arquivo de assinatura aninhado)? Se não traz, a conferência "votos do diário = BU" é coerência interna de um pacote
// assinado por uma só chave (a do RED), não prova independente de que o diário veio da urna original.
// Lê, para cada seção RED dos dois turnos (tipo_arquivo 'votacaoRED' na cópia de leitura do banco), o diretório oficial
// (último hash do aux.json; sem varrer data/raw) e lista, de forma recursiva, os nomes dentro do log.jez.
// Saída: data/parsed/auditoria/seguranca-h27/red-estrutura.json
// Uso: node scripts/auditoria/seguranca-h27-red-estrutura.mjs

const mem = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
async function nomes(handle, prefixo = '', prof = 0) {
  const lista = [];
  for (const e of await listarEntradas(handle)) {
    lista.push(prefixo + e.nome);
    if (/\.(jez|zip)$/i.test(e.nome) && prof < 4) lista.push(...(await nomes(mem(await lerEntrada(handle, e)), `${prefixo}${e.nome}/`, prof + 1)));
  }
  return lista;
}
async function diretorio(t, k) {
  const dir = path.join(DIR_DADOS, 'raw', `${t}t`, 'urnas', ...k.split('/'));
  // 2º turno: o aux.json diz qual é o diretório oficial. 1º turno: sem aux.json, vale o subdiretório cujo nome é o hash
  // do próprio .vsc (mesma regra de integridade-casos-especiais.mjs).
  let hashes;
  try {
    const aux = JSON.parse(await readFile(path.join(dir, 'aux.json'), 'utf8'));
    hashes = (aux.hashes ?? []).filter((h) => h.hash && h.hash !== '0' && (h.arq ?? []).some((a) => a.nm)).map((h) => h.hash);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    hashes = [];
    for (const sub of (await readdir(dir, { withFileTypes: true })).filter((x) => x.isDirectory()).map((x) => x.name)) {
      const v = acharArquivo(await readdir(path.join(dir, sub)), 'vsc');
      if (v && hashDiretorio(await readFile(path.join(dir, sub, v))) === sub) hashes.push(sub);
    }
  }
  if (!hashes.length) throw new Error(`sem diretório oficial: ${k}`);
  const h = hashes.at(-1);
  const arquivos = await readdir(path.join(dir, h));
  const vsc = acharArquivo(arquivos, 'vsc');
  if (hashDiretorio(await readFile(path.join(dir, h, vsc))) !== h) throw new Error(`hash do diretório não confere: ${k}`);
  return { dir: path.join(dir, h), arquivos };
}

const { db } = await abrirLeitura();
const red = db.prepare("SELECT turno, uf, municipio, zona, secao FROM secao WHERE tipo_arquivo = 'votacaoRED' ORDER BY 1, 2, 3, 4, 5").all();
const R = { secoes: red.length, porTurno: {}, extensoesAninhadas: {}, comAssinaturaAninhada: 0, lista: [] };
for (const r of red) {
  const k = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
  const { dir, arquivos } = await diretorio(r.turno, k);
  const log = acharArquivo(arquivos, 'log');
  const dentro = await nomes(mem(await readFile(path.join(dir, log))));
  const assinaturas = dentro.filter((n) => /\.(vsc|sig|p7s|p7m|cer|crt|der)$/i.test(n));
  for (const n of dentro) somar(R.extensoesAninhadas, path.extname(n).toLowerCase() || '(sem extensão)');
  if (assinaturas.length) R.comAssinaturaAninhada++;
  somar(R.porTurno, `${r.turno}t`);
  R.lista.push({ turno: r.turno, k, arquivosDoPacote: arquivos.map((a) => a.replace(/^o0322\d[a-z]{2}\d+-/, '')), dentroDoLog: dentro, assinaturasAninhadas: assinaturas });
}
await mkdir(DIR_H27, { recursive: true });
const saida = path.join(DIR_H27, 'red-estrutura.json');
await writeFile(saida, JSON.stringify(R, null, 1));
console.log(JSON.stringify({ secoes: R.secoes, porTurno: R.porTurno, extensoesAninhadas: R.extensoesAninhadas, comAssinaturaAninhada: R.comAssinaturaAninhada }, null, 1));
console.log(`[h27] ${saida}`);
