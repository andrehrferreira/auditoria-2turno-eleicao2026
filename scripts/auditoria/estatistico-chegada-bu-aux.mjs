// Estatístico eleitoral, chegada dos BUs (docs/analysis/linha-do-tempo/06): lê o aux.json de TODAS as seções do
// 2º turno e extrai a data/hora de cada hash (`dr`/`hr`), o status de cada hash e a hora de geração do aux (`dg`/`hg`).
// O banco só tem `recebido_tse` de 156.979 seções (as UFs carregadas com aux); aqui vale o universo.
// Não varre data/raw: as chaves vêm da tabela `secao` do banco e cada aux é aberto pelo caminho exato.
// Saída: data/parsed/auditoria/chegada-bu/aux-horarios.csv
// Uso: node scripts/auditoria/estatistico-chegada-bu-aux.mjs [--paralelo 48]
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

const { values } = parseArgs({ options: { paralelo: { type: 'string', default: '48' } } });
const PARALELO = Number(values.paralelo);
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'chegada-bu');

const { db } = await abrirLeitura();
const chaves = db.prepare('SELECT uf, municipio, zona, secao FROM secao WHERE turno = 2 ORDER BY uf, municipio, zona, secao').all()
  .map((r) => ({ ...r }));
db.close();

/** "25/10/2026" + "19:57:33" → "2026-10-25 19:57:33" (o aux não diz o fuso; ver doc 06 da linha do tempo). */
const iso = (d, h) => (d && h ? `${d.slice(6, 10)}-${d.slice(3, 5)}-${d.slice(0, 2)} ${h}` : '');

const linhas = new Array(chaves.length);
const contagem = { lidos: 0, ausentes: 0, invalidos: 0 };
let proximo = 0;
const inicio = Date.now();
async function trabalhador() {
  while (proximo < chaves.length) {
    const i = proximo++;
    const s = chaves[i];
    const arquivo = path.join(DIR_DADOS, 'raw', '2t', 'urnas', s.uf, s.municipio, s.zona, s.secao, 'aux.json');
    let aux = null;
    try {
      aux = JSON.parse(await readFile(arquivo, 'utf8'));
      contagem.lidos++;
    } catch (erro) {
      if (erro.code === 'ENOENT') contagem.ausentes++;
      else contagem.invalidos++;
    }
    const hashes = (aux?.hashes ?? []).map((h) => ({ t: iso(h.dr, h.hr), st: h.st ?? '' }));
    const tempos = hashes.map((h) => h.t).filter(Boolean).sort();
    const tot = hashes.filter((h) => /^Totalizad/i.test(h.st)).map((h) => h.t).sort();
    linhas[i] = [s.uf, s.municipio, s.zona, s.secao, aux ? 1 : 0, aux?.st ?? '', iso(aux?.dg, aux?.hg), hashes.length,
      tempos[0] ?? '', tempos.at(-1) ?? '', tot[0] ?? '', hashes.map((h) => h.st).join('|')].join(',');
    if ((contagem.lidos + contagem.ausentes + contagem.invalidos) % 50000 === 0) {
      console.error(`[aux] ${contagem.lidos + contagem.ausentes + contagem.invalidos}/${chaves.length} (${((Date.now() - inicio) / 1000).toFixed(0)} s)`);
    }
  }
}
await Promise.all(Array.from({ length: PARALELO }, trabalhador));

await mkdir(SAIDA, { recursive: true });
const cab = 'uf,municipio,zona,secao,tem_aux,st_aux,gerado_aux,n_hashes,hr_primeiro,hr_ultimo,hr_totalizado,st_hashes';
await writeFile(path.join(SAIDA, 'aux-horarios.csv'), `${cab}\n${linhas.join('\n')}\n`);
const resumo = { secoes: chaves.length, ...contagem, segundos: Math.round((Date.now() - inicio) / 1000) };
await writeFile(path.join(SAIDA, 'aux-resumo.json'), JSON.stringify(resumo, null, 1));
console.log(JSON.stringify(resumo));
