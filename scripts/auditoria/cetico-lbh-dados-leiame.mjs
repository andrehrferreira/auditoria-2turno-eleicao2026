// Revisor cético, achado "linha-de-base-2018-2022" (lente: dados e definições).
// Extrai o leiame.pdf de dentro dos zips votacao_candidato_munzona 2018/2022/2026 para leitura.
// Uso: node scripts/auditoria/cetico-lbh-dados-leiame.mjs  (depois: pdftotext -layout <pdf>)
import { createReadStream, createWriteStream, mkdirSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { createInflateRaw } from 'node:zlib';
import { entradasZip } from './contagem-zip.mjs';
for (const ano of [2018, 2022, 2026]) {
  const zip = `data/raw/dadosabertos/votacao_candidato_munzona/votacao_candidato_munzona_${ano}.zip`;
  const e = (await entradasZip(zip)).find((x) => x.nome === 'leiame.pdf');
  const dir = `data/parsed/auditoria/cetico/leiame/votacao_candidato_munzona_${ano}`;
  mkdirSync(dir, { recursive: true });
  let f = createReadStream(zip, { start: e.inicioDados, end: e.inicioDados + e.tamanhoComprimido - 1 });
  await pipeline(e.metodo === 8 ? f.pipe(createInflateRaw()) : f, createWriteStream(`${dir}/leiame.pdf`));
  console.log(dir);
}
