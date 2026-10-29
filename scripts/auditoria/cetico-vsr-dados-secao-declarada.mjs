// Cético, achado "votos sem rastro no log", lente de dados: o "Σ computados no log" do autor soma votos de logs de
// OUTRAS seções que vêm dentro do pacote (ES 57932/0009/0085 no 2º turno, BA 39934/0183/0175 no 1º). Um pacote com
// log de outra seção (+N) e N votos próprios sem log (−N) passaria como "BU = log". Este script mede isso no universo
// inteiro em que pode acontecer: todo pacote de urna com mais de uma urna no log (só aí cabe log alheio), nos dois
// turnos. Para cada urna do pacote (mesma deduplicação do autor), lê a "Seção Eleitoral" declarada no dia da eleição
// (0000 = urna de contingência, ignorada) e os votos computados. Marca urna com votos cuja seção declarada ≠ a do pacote.
// Uso: node scripts/auditoria/cetico-vsr-dados-secao-declarada.mjs --turno 2
// Saída: data/parsed/auditoria/cetico/cetico-vsr-dados-secao-declarada-<t>t.json
import { createReadStream } from 'node:fs';
import { mkdir, open, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { emParalelo } from '../../src/http.js';
import { acharArquivo } from '../../src/lacres.js';
import { DIA_VOTACAO } from '../../src/perfil-secoes.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';
import { linhasPorUrna } from './matematico-brutos.mjs';

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

const dirJ = path.join(DIR_DADOS, 'parsed', 'auditoria', 'matematico', `${turno}t`);
const alvos = [];
let pacotesUrna = 0;
for (const f of (await readdir(dirJ)).filter((x) => x.endsWith('.jsonl')).sort()) {
  for await (const linha of createInterface({ input: createReadStream(path.join(dirJ, f)), crlfDelay: Infinity })) {
    if (!linha) continue;
    const p = JSON.parse(linha);
    if (p.origem !== 'urna' || !p.log) continue;
    pacotesUrna++;
    if (p.log.urnas > 1) alvos.push({ uf: p.uf, municipio: p.municipio, zona: p.zona, secao: p.secao, hash: p.hash, bu: p.comparecimento, computados: p.log.computados });
  }
}
const r = { turno: Number(turno), pacotesUrna, pacotesComMaisDeUmaUrna: alvos.length, lidos: 0, erros: [], urnasComVotoSemSecaoDeclarada: 0, alheios: [] };
await emParalelo(alvos, 6, async (a) => {
  try {
    const dh = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', a.uf, a.municipio, a.zona, a.secao, a.hash);
    const h = await open(path.join(dh, acharArquivo(await readdir(dh), 'log')));
    let porUrna;
    try {
      porUrna = linhasPorUrna(await textos(h), dia);
    } finally {
      await h.close();
    }
    r.lidos++;
    for (const t of porUrna) {
      const ls = t.split('\n');
      const urna = ls[0]?.split('\t')[2];
      const votos = ls.filter((l) => l.split('\t')[4] === 'O voto do eleitor foi computado').length;
      const secoes = new Set(ls.map((l) => (l.split('\t')[4] ?? '').match(/^Seção Eleitoral: (\d{4})$/)?.[1]).filter((s) => s && s !== '0000'));
      if (votos > 0 && secoes.size === 0) {
        r.urnasComVotoSemSecaoDeclarada++;
        (r.semSecaoDeclarada ??= []).push({ secao: `${a.uf}/${a.municipio}/${a.zona}/${a.secao}`, bu: a.bu, computadosNoPacote: a.computados, urna, votos });
      }
      if (votos > 0 && secoes.size > 0 && !secoes.has(a.secao)) {
        r.alheios.push({ secao: `${a.uf}/${a.municipio}/${a.zona}/${a.secao}`, bu: a.bu, computadosNoPacote: a.computados, urna, votos, secaoDeclarada: [...secoes].join(',') });
      }
    }
  } catch (e) {
    r.erros.push({ secao: `${a.uf}/${a.municipio}/${a.zona}/${a.secao}`, erro: e.message });
  }
});
const destino = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');
await mkdir(destino, { recursive: true });
await writeFile(path.join(destino, `cetico-vsr-dados-secao-declarada-${turno}t.json`), `${JSON.stringify(r, null, 1)}\n`);
console.log(`${turno}t: ${pacotesUrna} pacotes de urna; ${alvos.length} com mais de uma urna no log; lidos ${r.lidos}; erros ${r.erros.length}; urnas com voto sem seção declarada no dia ${r.urnasComVotoSemSecaoDeclarada}`);
for (const x of r.semSecaoDeclarada ?? []) console.log(`   sem seção declarada: ${x.secao} BU ${x.bu} log ${x.computadosNoPacote}: urna ${x.urna} com ${x.votos} votos`);
for (const x of r.alheios) console.log(`   ${x.secao} BU ${x.bu} log ${x.computadosNoPacote}: urna ${x.urna} com ${x.votos} votos declara seção ${x.secaoDeclarada}`);
