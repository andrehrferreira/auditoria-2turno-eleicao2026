import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { CICLO, DIR_DADOS, TURNOS, UFS, URL_RESULTADOS } from './config.js';
import { ErroHttp, baixarBuffer, salvarAtomico } from './http.js';

// Dados de referência do TSE para dar nome aos códigos dos arquivos de urna:
//   candidatos: {ciclo}/{eleicao}/dados/{abr}/{abr}-c{cargo}-e{eleicao}-u.json  (abr = br para Presidente, UF para os demais)
//   municípios: {ciclo}/{eleicao}/config/mun-e{eleicao}-cm.json                  (código TSE → nome e código IBGE)
// Conferido em 29/10/2026: 6258/br/c0001 (200); 6260/c0003 só existe nas UFs com 2º turno de governador.

const pad = (n, largura) => String(n).padStart(largura, '0');
export const dirReferencia = (turno, dirDados = DIR_DADOS) => path.join(dirDados, 'raw', `${turno}t`, 'referencia');
const urlCandidatos = (eleicao, abr, cargo) =>
  `${URL_RESULTADOS}/${CICLO}/${eleicao}/dados/${abr}/${abr}-c${pad(cargo, 4)}-e${pad(eleicao, 6)}-u.json`;
const urlMunicipios = (eleicao) => `${URL_RESULTADOS}/${CICLO}/${eleicao}/config/mun-e${pad(eleicao, 6)}-cm.json`;

/** Baixa candidatos e municípios do turno. Ausência (404) é normal: nem toda UF tem todo cargo. */
export async function baixarReferencia(turno, { dirDados = DIR_DADOS } = {}) {
  const destino = dirReferencia(turno, dirDados);
  const { eleicoes } = TURNOS[turno];
  const pedidos = [];
  for (const [eleicao, cargos] of Object.entries(eleicoes)) {
    pedidos.push({ url: urlMunicipios(eleicao), arquivo: `mun-e${pad(eleicao, 6)}-cm.json` });
    for (const cargo of cargos) {
      const abrangencias = cargo === 1 ? ['br'] : UFS.filter((uf) => uf !== 'zz');
      for (const abr of abrangencias) pedidos.push({ url: urlCandidatos(eleicao, abr, cargo), arquivo: path.basename(urlCandidatos(eleicao, abr, cargo)) });
    }
  }
  let baixados = 0;
  let ausentes = 0;
  for (const { url, arquivo } of pedidos) {
    try {
      const buffer = await baixarBuffer(url);
      JSON.parse(buffer.toString('utf8'));
      await salvarAtomico(path.join(destino, arquivo), buffer);
      baixados++;
    } catch (erro) {
      if (erro instanceof ErroHttp && erro.status === 404) ausentes++;
      else throw erro;
    }
  }
  return { destino, baixados, ausentes };
}

/**
 * Carrega a referência baixada. Candidatos por chave `eleicao|cargo|abr|numero` (abr em minúsculas)
 * → { nome, partido, siglaPartido, situacao }; municípios por código TSE (5 dígitos) → { nome, uf, ibge }.
 */
export async function carregarReferencia(turno, { dirDados = DIR_DADOS } = {}) {
  const dir = dirReferencia(turno, dirDados);
  let nomes;
  try {
    nomes = await readdir(dir);
  } catch (erro) {
    if (erro.code === 'ENOENT') return null;
    throw erro;
  }
  const candidatos = new Map();
  const municipios = new Map();
  for (const nome of nomes) {
    const j = JSON.parse(await readFile(path.join(dir, nome), 'utf8'));
    if (nome.startsWith('mun-')) {
      for (const abr of j.abr ?? []) {
        for (const mu of abr.mu ?? []) municipios.set(mu.cd, { nome: mu.nm, uf: abr.cd, ibge: mu.cdi ?? null });
      }
      continue;
    }
    for (const carg of j.carg ?? []) {
      for (const agr of carg.agr ?? []) {
        for (const par of agr.par ?? []) {
          for (const cand of par.cand ?? []) {
            candidatos.set(`${j.ele}|${carg.cd}|${j.cdabr}|${cand.n}`, {
              nome: cand.nmu, partido: Number(par.n), siglaPartido: par.sg, situacao: cand.st ?? null,
            });
          }
        }
      }
    }
  }
  return { candidatos, municipios };
}

/** Procura o candidato na UF da seção e, se não houver (ex.: Presidente), na abrangência nacional. */
export function nomeCandidato(referencia, { eleicao, cargo, uf, numero }) {
  if (!referencia) return null;
  return referencia.candidatos.get(`${eleicao}|${cargo}|${uf}|${numero}`)
    ?? referencia.candidatos.get(`${eleicao}|${cargo}|br|${numero}`)
    ?? null;
}

async function principal() {
  const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, ajuda: { type: 'boolean', short: 'h' } } });
  if (values.ajuda) {
    console.log('Uso: node src/referencia.js [--turno 2]\nBaixa candidatos e municípios do TSE para data/raw/<t>t/referencia/.');
    return;
  }
  if (!TURNOS[values.turno]) throw new Error(`--turno inválido: ${values.turno}`);
  const r = await baixarReferencia(values.turno);
  console.log(`[referencia ${values.turno}t] ${r.baixados} arquivos baixados, ${r.ausentes} inexistentes (404) → ${r.destino}`);
}

if (import.meta.filename === path.resolve(process.argv[1] ?? '')) await principal();
