// Demógrafo (H27/H01, seções novas 2022 × 2026): resume o perfil do eleitorado por seção (perfil_eleitor_secao_<ano>_<UF>.zip,
// dados abertos do TSE) em todas as faixas de idade do TSE (16, 17, 18, 19, 20, 21–24, 25–29, ..., 95–99, 100+), com o total
// de eleitores com e sem biometria por faixa e o número do local de votação da seção. Só contagens agregadas por seção.
// Saída: data/parsed/auditoria/demografo/perfil-fino/<ano>/<uf>.tsv (uma linha por seção).
// Uso: node scripts/auditoria/demografo-novas-2022-perfil.mjs --ano 2022|2026 [UF ...]   (sem UF: todas as que estão no disco)
import { createReadStream, readdirSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import { parseArgs } from 'node:util';
import { createInflateRaw } from 'node:zlib';
import { DIR_DADOS } from '../../src/config.js';
import { entradasZip } from './contagem-zip.mjs';

// Códigos CD_FAIXA_ETARIA do TSE, na ordem; o que não estiver aqui vai para "inv" (idade inválida ou não informada).
export const CODIGOS = [1600, 1700, 1800, 1900, 2000, 2124, 2529, 3034, 3539, 4044, 4549, 5054, 5559, 6064, 6569, 7074, 7579, 8084, 8589, 9094, 9599, 9999];
export const BANDAS = [...CODIGOS.map(String), 'inv'];
export const COLUNAS = ['uf', 'municipio', 'zona', 'secao', 'local', 'total', 'biometria', ...BANDAS.map((b) => `f${b}`), ...BANDAS.map((b) => `sb${b}`)];
const IDX = new Map(CODIGOS.map((c, i) => [c, i]));
const NB = BANDAS.length;
const DIR_ZIP = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'perfil_eleitor_secao');
export const DIR_FINO = path.join(DIR_DADOS, 'parsed', 'auditoria', 'demografo', 'perfil-fino');

async function processar(ano, uf) {
  const zip = path.join(DIR_ZIP, `perfil_eleitor_secao_${ano}_${uf}.zip`);
  const entrada = (await entradasZip(zip)).find((e) => e.nome.toLowerCase().endsWith('.csv'));
  let fluxo = createReadStream(zip, { start: entrada.inicioDados, end: entrada.inicioDados + entrada.tamanhoComprimido - 1, highWaterMark: 1 << 20 });
  if (entrada.metodo === 8) fluxo = fluxo.pipe(createInflateRaw({ chunkSize: 1 << 20 }));
  const rl = readline.createInterface({ input: fluxo.setEncoding('latin1'), crlfDelay: Infinity });
  const cel = (s) => s.trim().replace(/^"|"$/g, '').trim();
  const secoes = new Map();
  let idx = null; let linhas = 0; let ufOutra = 0;
  for await (const linha of rl) {
    if (!linha) continue;
    const c = linha.split(';');
    if (!idx) {
      const cab = c.map(cel);
      const qt = cab.includes('QT_ELEITORES') ? 'QT_ELEITORES' : 'QT_ELEITORES_PERFIL';
      idx = Object.fromEntries(['SG_UF', 'CD_MUNICIPIO', 'NR_ZONA', 'NR_SECAO', 'NR_LOCAL_VOTACAO', 'CD_FAIXA_ETARIA', 'QT_ELEITORES_BIOMETRIA'].map((k) => [k, cab.indexOf(k)]));
      idx.QT = cab.indexOf(qt);
      if (Object.values(idx).some((i) => i < 0)) throw new Error(`${ano} ${uf}: cabeçalho inesperado: ${cab.join('|')}`);
      continue;
    }
    linhas++;
    if (cel(c[idx.SG_UF]) !== uf) ufOutra++;
    const chave = `${cel(c[idx.CD_MUNICIPIO]).padStart(5, '0')}\t${String(Number(cel(c[idx.NR_ZONA]))).padStart(4, '0')}\t${String(Number(cel(c[idx.NR_SECAO]))).padStart(4, '0')}`;
    let v = secoes.get(chave);
    if (!v) secoes.set(chave, (v = { local: Number(cel(c[idx.NR_LOCAL_VOTACAO])), n: new Array(2 + 2 * NB).fill(0) }));
    const qt = Number(cel(c[idx.QT])); const bio = Number(cel(c[idx.QT_ELEITORES_BIOMETRIA]));
    if (!Number.isFinite(qt) || !Number.isFinite(bio)) throw new Error(`${ano} ${uf}: número inválido na linha ${linhas}`);
    const f = IDX.get(Number(cel(c[idx.CD_FAIXA_ETARIA]))) ?? NB - 1;
    v.n[0] += qt; v.n[1] += bio; v.n[2 + f] += qt; v.n[2 + NB + f] += qt - bio;
  }
  if (ufOutra) throw new Error(`${ano} ${uf}: ${ufOutra} linhas de outra UF`);
  const saida = [COLUNAS.join('\t')];
  for (const [chave, v] of [...secoes].sort((a, b) => (a[0] < b[0] ? -1 : 1))) saida.push(`${uf.toLowerCase()}\t${chave}\t${v.local}\t${v.n.join('\t')}`);
  await mkdir(path.join(DIR_FINO, String(ano)), { recursive: true });
  await writeFile(path.join(DIR_FINO, String(ano), `${uf.toLowerCase()}.tsv`), `${saida.join('\n')}\n`);
  const total = [...secoes.values()].reduce((s, v) => s + v.n[0], 0);
  console.log(`${ano} ${uf}: ${linhas} linhas, ${secoes.size} seções, ${total} eleitores`);
}

if (process.argv[1]?.endsWith('demografo-novas-2022-perfil.mjs')) {
  const { values, positionals } = parseArgs({ options: { ano: { type: 'string' } }, allowPositionals: true });
  const ano = Number(values.ano);
  if (ano !== 2022 && ano !== 2026) throw new Error('--ano 2022 ou 2026');
  const noDisco = readdirSync(DIR_ZIP).map((n) => new RegExp(`^perfil_eleitor_secao_${ano}_([A-Z]{2})\\.zip$`).exec(n)?.[1]).filter(Boolean).sort();
  const ufs = positionals.length ? positionals.map((u) => u.toUpperCase()) : noDisco;
  for (const uf of ufs) await processar(ano, uf);
}
