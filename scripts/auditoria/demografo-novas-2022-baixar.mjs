// Demógrafo (H27/H01, seções novas 2022 × 2026): baixa o perfil do eleitorado por seção de 2022 (perfil_eleitor_secao_2022_<UF>.zip)
// das UFs pedidas, um pedido por vez, só do CDN do TSE. Grava ao lado de cada zip um .meta.json no mesmo formato dos que já
// estão no disco (URL, ETag, Last-Modified, tamanho, SHA-256, data) e imprime a linha para a lista do doc 11.
// O CDN não publica .sha512 ao lado desses arquivos; o hash é o calculado aqui.
// Uso: node scripts/auditoria/demografo-novas-2022-baixar.mjs [--head] UF [UF ...]
//   --head: só consulta tamanho, ETag e Last-Modified, sem baixar.
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { baixarArquivoGrande } from '../../src/http.js';

const args = process.argv.slice(2);
const soHead = args.includes('--head');
const ufs = args.filter((a) => a !== '--head').map((u) => u.toUpperCase());
if (!ufs.length || ufs.some((u) => !/^[A-Z]{2}$/.test(u))) throw new Error('uso: demografo-novas-2022-baixar.mjs [--head] UF [UF ...]');
const CDN = 'https://cdn.tse.jus.br/estatistica/sead/odsele/perfil_eleitor_secao';
const DIR = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'perfil_eleitor_secao');
const existe = (p) => stat(p).then(() => true, (e) => { if (e.code === 'ENOENT') return false; throw e; });

for (const uf of ufs) {
  const nome = `perfil_eleitor_secao_2022_${uf}.zip`;
  const url = `${CDN}/${nome}`;
  const head = await fetch(url, { method: 'HEAD' });
  if (!head.ok) { console.log(`${uf}\tHEAD ${head.status}`); continue; }
  const etag = head.headers.get('etag'); const lm = head.headers.get('last-modified'); const tam = Number(head.headers.get('content-length'));
  if (soHead) { console.log(`${uf}\t${tam}\t${etag}\t${lm}`); continue; }
  const destino = path.join(DIR, nome);
  if (await existe(destino)) { console.log(`${uf}\tjá no disco`); continue; }
  console.error(`baixando ${url} (${tam} bytes)`);
  await baixarArquivoGrande(url, destino);
  const h = createHash('sha256');
  for await (const p of createReadStream(destino)) h.update(p);
  const meta = { url, etag, ultimaModificacao: lm, total: (await stat(destino)).size, sha256: h.digest('hex'), baixadoEm: new Date().toISOString() };
  if (meta.total !== tam) throw new Error(`${uf}: tamanho ${meta.total} ≠ Content-Length ${tam}`);
  await writeFile(`${destino}.meta.json`, JSON.stringify(meta));
  console.log(`${nome};${url};${lm};${etag};${meta.total};${meta.sha256}`);
}
