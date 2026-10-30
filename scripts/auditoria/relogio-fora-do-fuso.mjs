// Seções com o relógio da urna fora da hora do município (docs/analysis/linha-do-tempo/07). A regra de fuso da linha do
// tempo vale por município; estas seções têm o relógio 1 h adiantado e usam a diferença da própria seção.
// Tabela gerada por scripts/auditoria/tempo-relogio-fuso.mjs. Uso nos scripts:
//   const relogio = difRelogioPorSecao(1);
//   const d = difSecao(relogio, uf, municipio, zona, secao, difDoMunicipio);   // horas: relógio da urna − Brasília
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';

export const ARQUIVO_RELOGIO = path.join(DIR_DADOS, 'parsed', 'auditoria', 'tempo', 'relogio-fora-do-fuso.csv');

/** Chave normalizada (UF minúscula, números sem zeros à esquerda), igual com códigos '0053' ou 53. */
export const chaveSecao = (uf, municipio, zona, secao) => `${String(uf).toLowerCase()}/${Number(municipio)}/${Number(zona)}/${Number(secao)}`;

/** Map chaveSecao → diferença relógio da urna − Brasília (horas), só das seções da tabela, no turno pedido. */
export function difRelogioPorSecao(turno) {
  let texto;
  try { texto = readFileSync(ARQUIVO_RELOGIO, 'utf8'); } catch (e) {
    if (e.code === 'ENOENT') throw new Error(`${ARQUIVO_RELOGIO} não existe: rode node scripts/auditoria/tempo-relogio-fuso.mjs`);
    throw e;
  }
  const linhas = texto.split(/\r?\n/);
  const c0 = linhas[0].split(',');
  const i = Object.fromEntries(c0.map((c, k) => [c, k]));
  const m = new Map();
  for (const l of linhas.slice(1)) {
    if (!l) continue;
    const c = l.split(',');
    if (Number(c[i.turno]) !== Number(turno)) continue;
    m.set(chaveSecao(c[i.uf], c[i.municipio], c[i.zona], c[i.secao]), Number(c[i.hora_relogio_das_8h_brasilia]) - 8);
  }
  return m;
}

/** Diferença relógio − Brasília da seção: a da tabela, se a seção estiver nela; senão a do município. */
export const difSecao = (mapa, uf, municipio, zona, secao, difMunicipio) => mapa.get(chaveSecao(uf, municipio, zona, secao)) ?? difMunicipio;
