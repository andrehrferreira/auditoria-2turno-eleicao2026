// Revisor cético, parecer 25: confere as assinaturas (src/lacres.js) dos pacotes das seções com votos sem rastro no
// log. O 2º turno já foi conferido no parecer 08 (cetico-vsl-consolidacao.mjs); aqui entram as 3 seções do 1º turno
// e, para comparação, as 3 do 2º. Certificado com 1 byte 0x00 a mais (UE2013/UE2015): corte de
// integridade-reverificar.mjs, como no parecer 08. Somente leitura; caminho do pacote pelo hash do banco.
// Uso: node scripts/auditoria/cetico-vsr25-lacres.mjs
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { acharArquivo, carregarAcs, verificarLacres } from '../../src/lacres.js';
import { cortarCertificado } from './integridade-reverificar.mjs';

const CASOS = [
  [1, 'ba', '39934', '0183', '0175'], [1, 'sp', '71072', '0002', '0035'], [1, 'rs', '89036', '0083', '0044'],
  [2, 'ma', '08893', '0047', '0609'], [2, 'ba', '35653', '0173', '0235'], [2, 'rs', '89060', '0017', '0191'],
];
const DATA = { 1: '2026-10-04', 2: '2026-10-25' };
const { db } = await abrirLeitura();
const acs = await carregarAcs();
for (const [t, uf, mu, zo, se] of CASOS) {
  const { hash } = db.prepare('select hash from secao where turno=? and uf=? and municipio=? and zona=? and secao=?').get(t, uf, mu, zo, se);
  const dir = path.join('data', 'raw', `${t}t`, 'urnas', uf, mu, zo, se, hash);
  const nomes = await readdir(dir);
  const vsc = await readFile(path.join(dir, acharArquivo(nomes, 'vsc')));
  const arquivos = new Map();
  for (const n of nomes) if (/^o\d{5}[a-z]{2}\d{13}-[a-z]+\.[a-z]+$/.test(n) && !n.endsWith('.vsc')) arquivos.set(n, await readFile(path.join(dir, n)));
  let v;
  let metodo = 'direto';
  try {
    v = verificarLacres({ vsc, arquivos, acs, dataEleicao: new Date(DATA[t]) });
  } catch (e) {
    const c = cortarCertificado(vsc);
    metodo = `certificado cortado (sobra ${c.sobra.toString('hex')}) após "${e.message}"`;
    v = verificarLacres({ vsc: c.vsc, arquivos, acs, dataEleicao: new Date(DATA[t]) });
  }
  const falhas = v.resultados.filter((x) => !x.ok).map((x) => x.item);
  console.log(`${t}º turno ${uf}/${mu}/${zo}/${se}: urna ${v.urna.nome} (${v.urna.emissor}), ${v.resultados.length} conferências, ${falhas.length} falha(s)${falhas.length ? `: ${falhas.join('; ')}` : ''}; ${metodo}; arquivos ${[...arquivos.keys()].map((n) => n.split('-').pop()).join(', ')}`);
}
