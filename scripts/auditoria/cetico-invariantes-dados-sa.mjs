// Cético, achado "invariantes sem violação", item (b): origem das partes do RDV nas 2 seções de apuração mista de MG (1º turno)
// que deram as 20 violações de I3 na 1ª passada do autor. Uso: node scripts/auditoria/cetico-invariantes-dados-sa.mjs
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { decodificarArquivo } from '../../src/asn1.js';
import { arquivoRdv } from '../../src/esquemas.js';
for (const s of ['41238/0039/0168', '50075/0047/0041']) {
  const base = path.join(DIR_DADOS, 'raw', '1t', 'urnas', 'mg', ...s.split('/'));
  for (const h of (await readdir(base, { withFileTypes: true })).filter((e) => e.isDirectory())) {
    const d = path.join(base, h.name);
    const n = (await readdir(d)).find((x) => x.endsWith('-rdv.dat'));
    if (!n) continue;
    const r = decodificarArquivo(arquivoRdv, await readFile(path.join(d, n)));
    console.log(s, (r.rdv.eleicoes.eleicoesSA ?? []).map((e) => `${e.idEleicao}/${e.tipoCedulaSA}/${e.origemVotosSA}:${e.votosCargos.map((v) => v.votos.length).join(',')}`).join(' | '), 'motivo', JSON.stringify(r.urna.motivoUtilizacaoSA));
  }
}
