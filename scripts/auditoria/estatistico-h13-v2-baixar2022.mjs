// Estatístico eleitoral, H13 sinal V2 (adendo 4 de 30/10/2026 ao plano 16): baixa os arquivos públicos de 2022 que faltam
// para o painel por seção (votos de presidente por seção e perfil do eleitorado por seção do Sul e de MG).
// Grava, ao lado de cada arquivo, <arquivo>.meta.json e, no fim, docs/analysis/estatistico-eleitoral/23-arquivos-baixados.csv
// (URL, ETag, Last-Modified, bytes, SHA-256). Arquivo já presente com o mesmo tamanho não é baixado de novo (só o hash).
// Uso: node scripts/auditoria/estatistico-h13-v2-baixar2022.mjs
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { baixarArquivoGrande } from '../../src/http.js';

const CDN = 'https://cdn.tse.jus.br/estatistica/sead/odsele';
const DA = path.join(DIR_DADOS, 'raw', 'dadosabertos');
const ALVOS = [
  { url: `${CDN}/votacao_secao/votacao_secao_2022_BR.zip`, dir: 'votacao_secao' },
  ...['MG', 'PR', 'RS', 'SC'].map((uf) => ({ url: `${CDN}/perfil_eleitor_secao/perfil_eleitor_secao_2022_${uf}.zip`, dir: 'perfil_eleitor_secao' })),
  { url: `${CDN}/detalhe_votacao_secao/detalhe_votacao_secao_2022.zip`, dir: 'detalhe_votacao_secao', soConferir: true },
];
const tamanho = (p) => stat(p).then((s) => s.size, () => null);
async function sha256(arq) { const h = createHash('sha256'); for await (const p of createReadStream(arq)) h.update(p); return h.digest('hex'); }

const linhas = ['arquivo;url;etag;last_modified;bytes;sha256;baixado_em;observacao'];
for (const a of ALVOS) {
  const nome = path.basename(a.url);
  const destino = path.join(DA, a.dir, nome);
  const head = await fetch(a.url, { method: 'HEAD' });
  if (!head.ok) throw new Error(`HEAD ${head.status} ${a.url}`);
  const etag = head.headers.get('etag'), lm = head.headers.get('last-modified'), total = Number(head.headers.get('content-length'));
  const atual = await tamanho(destino);
  let obs = '';
  if (atual === total) obs = a.soConferir ? 'já no disco (baixado pelo demógrafo); só conferido o tamanho' : 'já no disco';
  else if (a.soConferir) obs = `ATENÇÃO: tamanho no disco ${atual} difere do publicado ${total}; não baixado de novo`;
  else {
    console.log(`baixando ${a.url} (${total} bytes)`);
    await baixarArquivoGrande(a.url, destino);
  }
  const bytes = await tamanho(destino);
  const h = await sha256(destino);
  const quando = new Date().toISOString();
  if (!a.soConferir) await writeFile(`${destino}.meta.json`, JSON.stringify({ url: a.url, etag, ultimaModificacao: lm, total: bytes, sha256: h, baixadoEm: quando }));
  linhas.push([path.relative(path.join(DIR_DADOS, 'raw'), destino).split(path.sep).join('/'), a.url, etag, lm, bytes, h, quando, obs].join(';'));
  console.log(`${nome}: ${bytes} bytes, sha256 ${h.slice(0, 16)}… ${obs}`);
}
await writeFile(path.join(import.meta.dirname, '..', '..', 'docs', 'analysis', 'estatistico-eleitoral', '23-arquivos-baixados.csv'), `${linhas.join('\n')}\n`);
