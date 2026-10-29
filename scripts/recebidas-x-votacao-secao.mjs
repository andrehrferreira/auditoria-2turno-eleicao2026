// Temporário (regra do rulebook: scripts temporários só em /scripts, apagados após o uso).
import { createReadStream, readFileSync, readdirSync } from 'node:fs';
import { open } from 'node:fs/promises';
import { createInflateRaw } from 'node:zlib';
import readline from 'node:readline';
import { listarEntradas } from '../src/zip.js';
import { decodificarArquivo } from '../src/asn1.js';
import { arquivoBu } from '../src/esquemas.js';

const rec = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const chave = (uf, m, z, s) => `${uf}|${Number(m)}|${Number(z)}|${Number(s)}`;
const alvo = new Map(rec.map((r) => [chave(r.uf, r.municipio, r.zona, r.secao), r]));

const zip = 'data/raw/dadosabertos/votacao_secao/votacao_secao_2026_BR.zip';
const h = await open(zip, 'r');
const e = (await listarEntradas(h)).find((x) => x.nome.endsWith('.csv'));
const cab = Buffer.alloc(30); await h.read(cab, 0, 30, e.offsetLocal);
const inicio = e.offsetLocal + 30 + cab.readUInt16LE(26) + cab.readUInt16LE(28);
await h.close();
const rl = readline.createInterface({ input: createReadStream(zip, { start: inicio, end: inicio + e.tamanhoComprimido - 1 }).pipe(createInflateRaw()).setEncoding('latin1') });
let col = null; const oficial = new Map(); let linhas = 0; let dataGeracao = null;
for await (const linha of rl) {
  const c = linha.split(';').map((x) => x.replace(/^"|"$/g, ''));
  if (!col) { col = Object.fromEntries(c.map((n, i) => [n, i])); console.log('colunas:', c.join(' ')); continue; }
  linhas++;
  if (c[col.NR_TURNO] !== '2') continue;
  dataGeracao ??= `${c[col.DT_GERACAO]} ${c[col.HH_GERACAO]}`;
  const k = chave(c[col.SG_UF].toLowerCase(), c[col.CD_MUNICIPIO], c[col.NR_ZONA], c[col.NR_SECAO]);
  if (!alvo.has(k) || c[col.CD_CARGO] !== '1') continue;
  const o = oficial.get(k) ?? {}; o[c[col.NR_VOTAVEL]] = (o[c[col.NR_VOTAVEL]] ?? 0) + Number(c[col.QT_VOTOS]); oficial.set(k, o);
}
let presentes = 0; let ausentes = 0; let iguais = 0; let diferentes = 0; const exDif = [];
for (const [k, r] of alvo) {
  const of = oficial.get(k);
  if (!of) { ausentes++; continue; }
  presentes++;
  const ds = `data/raw/2t/urnas/${r.uf}/${r.municipio}/${r.zona}/${r.secao}/${r.hashes[0].hash}`;
  const nomeBu = readdirSync(ds).find((n) => n.endsWith('-bu.dat') || n.endsWith('-busa.dat'));
  const bu = decodificarArquivo(arquivoBu, readFileSync(`${ds}/${nomeBu}`)).conteudo;
  const pres = bu.resultadosVotacaoPorEleicao.find((x) => x.idEleicao === 6258).resultadosVotacao[0].totaisVotosCargo[0].votosVotaveis;
  const doBu = {}; for (const v of pres) { const n = v.tipoVoto === 'branco' ? '95' : v.tipoVoto === 'nulo' ? '96' : String(v.identificacaoVotavel.codigo); doBu[n] = v.quantidadeVotos; }
  const a = JSON.stringify(Object.entries(doBu).sort()); const b = JSON.stringify(Object.entries(of).sort());
  if (a === b) iguais++; else { diferentes++; if (exDif.length < 5) exDif.push({ k, bu: doBu, oficial: of }); }
}
console.log({ linhasCsv: linhas, dataGeracaoCsv: dataGeracao, recebidas: alvo.size, presentesNoOficial: presentes, ausentesNoOficial: ausentes, presidenteIgualAoBu: iguais, diferente: diferentes });
console.log(JSON.stringify(exDif, null, 1));
