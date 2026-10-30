import { createHash } from 'node:crypto';
import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { baixarBuffer, salvarAtomico } from '../../src/http.js';

// H27 (engenheiro de segurança, doc 09): baixa a LISTA DE FORA DO PACOTE, as correspondências esperadas (CESP) e efetivadas
// (CEFT) que o TSE publica nos dados abertos, um zip por UF (27 UFs + ZZ, exterior) e por turno.
//   CESP: correspondência urna × seção × código de carga gerada na carga (antes da eleição), transmitida pelo cartório.
//         Traz csec_* (urna esperada de cada seção) e ccont_* (urnas de contingência, reservas, por zona).
//   CEFT: para cada seção, a urna esperada e a urna efetivada (a que gerou os votos), com TP_DIVERGENCIA (D, C, O).
// Também baixa, para o teste das seções fantasmas, o CEFT do 1º turno de 2022 e de 2024 (lista de seções que existiam)
// e a tabela pública "número interno × modelo da urna".
// A lista de recursos sai da API do portal (CKAN, package_show), não de nomes adivinhados. Cada zip tem um .sha512 publicado
// pelo TSE ao lado; o script confere o SHA-512 e grava SHA-256, SHA-512, tamanho e URL em manifesto.json.
//
// Destino: data/raw/dadosabertos/correspondencias/<ano>-<t>t/ e data/raw/dadosabertos/modelo_urna/
// Uso: node scripts/auditoria/seguranca-h27-baixar.mjs [--so 2026]

const { values } = parseArgs({ options: { so: { type: 'string' } } });
const API = 'https://dadosabertos.tse.jus.br/api/3/action/package_show?id=';
const PACOTES = [
  { id: 'resultados-2026-correspondencias-esperadas-e-efetivadas-1-turno', pasta: '2026-1t', filtro: () => true },
  { id: 'resultados-2026-correspondencias-esperadas-e-efetivadas-2-turno', pasta: '2026-2t', filtro: () => true },
  { id: 'resultados-2022-correspondencias-esperadas-e-efetivadas-1-turno', pasta: '2022-1t', filtro: (u) => /\/CEFT_/i.test(u) },
  { id: 'resultados-2024-correspondencias-esperadas-e-efetivadas-1-turno', pasta: '2024-1t', filtro: (u) => /\/CEFT_/i.test(u) },
  { id: 'correspondencia-entre-numero-interno-e-modelo-da-urna-1', pasta: '../modelo_urna', filtro: () => true },
].filter((p) => !values.so || p.pasta.includes(values.so));

const RAIZ = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'correspondencias');
const MANIFESTO = path.join(RAIZ, 'manifesto.json');
const hash = (alg, b) => createHash(alg).update(b).digest('hex');
const existe = (p) => stat(p).then(() => true, (e) => { if (e.code === 'ENOENT') return false; throw e; });

let manifesto = {};
try { manifesto = JSON.parse(await readFile(MANIFESTO, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }

let falhas = 0;
for (const pac of PACOTES) {
  const urlApi = API + pac.id;
  const meta = JSON.parse((await baixarBuffer(urlApi)).toString('utf8'));
  if (!meta.success) throw new Error(`CKAN recusou ${pac.id}: ${JSON.stringify(meta.error)}`);
  const zips = meta.result.resources.map((r) => r.url).filter((u) => u.endsWith('.zip') && pac.filtro(u));
  console.log(`[h27] ${pac.id}: ${zips.length} zips (metadata_modified ${meta.result.metadata_modified})`);
  for (const url of zips) {
    const nome = path.basename(url);
    const destino = path.join(RAIZ, pac.pasta, nome);
    const chave = path.relative(path.join(DIR_DADOS, 'raw'), destino).split(path.sep).join('/');
    if (manifesto[chave] && (await existe(destino))) continue;
    try {
      const corpo = await baixarBuffer(url, { timeoutMs: 300_000 });
      let sha512Publicado = null;
      try {
        sha512Publicado = (await baixarBuffer(`${url}.sha512`)).toString('utf8').trim().split(/\s+/)[0].toLowerCase();
      } catch (e) { console.log(`[h27] sem .sha512 para ${nome}: ${e.message}`); }
      const sha512 = hash('sha512', corpo);
      if (sha512Publicado && sha512Publicado !== sha512) throw new Error(`SHA-512 divergente do publicado (${sha512Publicado})`);
      await salvarAtomico(destino, corpo);
      manifesto[chave] = {
        url, pacoteCkan: pac.id, bytes: corpo.length, sha256: hash('sha256', corpo), sha512,
        sha512Publicado, sha512Confere: sha512Publicado ? true : null, baixadoEm: new Date().toISOString(),
      };
      await writeFile(MANIFESTO, JSON.stringify(manifesto, null, 1));
      console.log(`[h27] ok ${chave} ${corpo.length} bytes`);
    } catch (e) {
      falhas++;
      manifesto[`FALHA:${chave}`] = { url, erro: e.message, em: new Date().toISOString() };
      await writeFile(MANIFESTO, JSON.stringify(manifesto, null, 1));
      console.log(`[h27] FALHA ${url}: ${e.message}`);
    }
  }
}
// Lista versionada (data/ fica fora do git): URL, tamanho, SHA-256 e conferência do SHA-512 publicado, um arquivo por linha.
const CSV = path.join(import.meta.dirname, '..', '..', 'docs', 'analysis', 'engenheiro-seguranca-urna', '09-h27-arquivos-baixados.csv');
const linhas = ['arquivo;url;bytes;sha256;sha512_publicado_confere'];
for (const [k, v] of Object.entries(manifesto).sort(([a], [b]) => a.localeCompare(b))) {
  linhas.push(k.startsWith('FALHA:') ? `${k};${v.url};;;falha: ${v.erro}` : `${k};${v.url};${v.bytes};${v.sha256};${v.sha512Confere === null ? 'sem .sha512 publicado' : 'sim'}`);
}
await writeFile(CSV, `${linhas.join('\n')}\n`);
console.log(`[h27] fim; falhas: ${falhas}; manifesto: ${MANIFESTO}; lista: ${CSV}`);
process.exitCode = falhas ? 1 : 0;
