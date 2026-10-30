// Demógrafo (H01/H27, seções novas): baixa arquivos públicos dos dados abertos do TSE que ainda não estão no disco.
//   det2022 / det2020 / det2018: comparecimento oficial por seção (detalhe_votacao_secao) de 2022, 2020 e 2018.
//     2022 é a linha de base das seções antigas; 2018 e 2020 servem para definir "seção nova em 2022" (o análogo
//     histórico das seções novas de 2026, que o parecer 38 define pela ausência no CEFT de 2022 ou de 2024).
//   pca2022, pca2018, pca2014: perfil de comparecimento e abstenção (comparecimento oficial por faixa etária, os dois turnos);
//     2018 e 2014 são a série histórica do comparecimento dos idosos (doc 09).
//   pca2026: perfil de comparecimento e abstenção de 2026. Só baixa se o ETag mudou em relação à cópia do disco
//     (a cópia de 21/10/2026 tem só o 1º turno). A versão nova vai para uma subpasta datada; a antiga fica intacta.
// Os arquivos de odsele não têm .sha512 publicado ao lado. O script grava URL, ETag, Last-Modified, tamanho, SHA-256 e
// SHA-512 em data/raw/dadosabertos/demografo-manifesto.json e a lista versionada em docs/analysis/demografo/08-arquivos-baixados.csv.
// Uso: node scripts/auditoria/demografo-baixar-tse.mjs [--so det2022,pca2022]
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { baixarArquivoGrande } from '../../src/http.js';

const { values } = parseArgs({ options: { so: { type: 'string' } } });
const CDN = 'https://cdn.tse.jus.br/estatistica/sead/odsele';
const DA = path.join(DIR_DADOS, 'raw', 'dadosabertos');
const ALVOS = [
  { id: 'det2022', url: `${CDN}/detalhe_votacao_secao/detalhe_votacao_secao_2022.zip`, dir: 'detalhe_votacao_secao' },
  { id: 'det2020', url: `${CDN}/detalhe_votacao_secao/detalhe_votacao_secao_2020.zip`, dir: 'detalhe_votacao_secao' },
  { id: 'det2018', url: `${CDN}/detalhe_votacao_secao/detalhe_votacao_secao_2018.zip`, dir: 'detalhe_votacao_secao' },
  { id: 'pca2022', url: `${CDN}/perfil_comparecimento_abstencao/perfil_comparecimento_abstencao_2022.zip`, dir: 'perfil_comparecimento_abstencao' },
  { id: 'pca2018', url: `${CDN}/perfil_comparecimento_abstencao/perfil_comparecimento_abstencao_2018.zip`, dir: 'perfil_comparecimento_abstencao' },
  { id: 'pca2014', url: `${CDN}/perfil_comparecimento_abstencao/perfil_comparecimento_abstencao_2014.zip`, dir: 'perfil_comparecimento_abstencao' },
  { id: 'pca2026', url: `${CDN}/perfil_comparecimento_abstencao/perfil_comparecimento_abstencao_2026.zip`, dir: 'perfil_comparecimento_abstencao', versionar: true },
].filter((a) => !values.so || values.so.split(',').includes(a.id));

const MANIFESTO = path.join(DA, 'demografo-manifesto.json');
const existe = (p) => stat(p).then(() => true, (e) => { if (e.code === 'ENOENT') return false; throw e; });
async function hashes(arq) {
  const a = createHash('sha256'); const b = createHash('sha512');
  for await (const p of createReadStream(arq)) { a.update(p); b.update(p); }
  return { sha256: a.digest('hex'), sha512: b.digest('hex') };
}
let manifesto = {};
try { manifesto = JSON.parse(await readFile(MANIFESTO, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }

for (const a of ALVOS) {
  const nome = path.basename(a.url);
  const head = await fetch(a.url, { method: 'HEAD' });
  if (!head.ok) { console.log(`[demografo] ${a.id}: HEAD ${head.status}`); continue; }
  const etag = head.headers.get('etag'); const lm = head.headers.get('last-modified');
  let destino = path.join(DA, a.dir, nome);
  if (a.versionar) {
    const atual = JSON.parse(await readFile(`${destino}.meta.json`, 'utf8'));
    if (atual.etag === etag) {
      console.log(`[demografo] ${a.id}: ETag igual ao do disco (${etag}, ${lm}); nada novo para baixar`);
      manifesto[`verificado:${a.id}`] = { url: a.url, etag, ultimaModificacao: lm, igualAoDisco: true, verificadoEm: new Date().toISOString() };
      continue;
    }
    destino = path.join(DA, a.dir, `v${new Date(lm).toISOString().slice(0, 10).replaceAll('-', '')}`, nome);
  }
  const chave = path.relative(path.join(DIR_DADOS, 'raw'), destino).split(path.sep).join('/');
  if (!(await existe(destino))) {
    console.log(`[demografo] baixando ${a.url}`);
    await baixarArquivoGrande(a.url, destino);
  }
  const h = await hashes(destino);
  const bytes = (await stat(destino)).size;
  manifesto[chave] = { url: a.url, etag, ultimaModificacao: lm, bytes, ...h, baixadoEm: manifesto[chave]?.baixadoEm ?? new Date().toISOString() };
  await writeFile(MANIFESTO, JSON.stringify(manifesto, null, 1));
  console.log(`[demografo] ok ${chave} ${bytes} bytes sha256 ${h.sha256}`);
}
await writeFile(MANIFESTO, JSON.stringify(manifesto, null, 1));
const CSV = path.join(import.meta.dirname, '..', '..', 'docs', 'analysis', 'demografo', '08-arquivos-baixados.csv');
const linhas = ['arquivo;url;last_modified;etag;bytes;sha256'];
for (const [k, v] of Object.entries(manifesto).sort(([x], [y]) => x.localeCompare(y))) {
  linhas.push(k.startsWith('verificado:') ? `${k} (ETag igual ao do disco, não rebaixado);${v.url};${v.ultimaModificacao};${v.etag};;` : `${k};${v.url};${v.ultimaModificacao};${v.etag};${v.bytes};${v.sha256}`);
}
await writeFile(CSV, `${linhas.join('\n')}\n`);
