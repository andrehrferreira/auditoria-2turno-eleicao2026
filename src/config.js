import path from 'node:path';

export const CICLO = 'ele2026';

// Códigos de pleito conferidos em https://resultados.tse.jus.br/oficial/comum/config/ele-c.json
// `eleicoes`: código da eleição → cargos (CargoConstitucional), também conferidos no ele-c.json
// (no 2º turno, as eleições são o campo `cdt2` das do 1º).
export const TURNOS = {
  1: { pleito: '3220', sufixo: '1t', eleicoes: { 6257: [1], 6259: [3, 5, 6, 7, 8] } },
  2: { pleito: '3221', sufixo: '2t', eleicoes: { 6258: [1], 6260: [3] } },
};

export const UFS = [
  'ac', 'al', 'am', 'ap', 'ba', 'ce', 'df', 'es', 'go', 'ma', 'mg', 'ms', 'mt', 'pa',
  'pb', 'pe', 'pi', 'pr', 'rj', 'rn', 'ro', 'rr', 'rs', 'sc', 'se', 'sp', 'to', 'zz',
];

export const URL_RESULTADOS = 'https://resultados.tse.jus.br/oficial';
export const URL_ZIPS = 'https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2026/arqurnatot';
export const DIR_DADOS = path.resolve(import.meta.dirname, '..', 'data');

const pleitoLongo = (pleito) => pleito.padStart(6, '0');

export const urlConfigUf = (pleito, uf) =>
  `${URL_RESULTADOS}/${CICLO}/arquivo-urna/${pleito}/config/${uf}/${uf}-p${pleitoLongo(pleito)}-cs.json`;

export const urlDirSecao = (pleito, s) =>
  `${URL_RESULTADOS}/${CICLO}/arquivo-urna/${pleito}/dados/${s.uf}/${s.municipio}/${s.zona}/${s.secao}`;

export const urlAux = (pleito, s) =>
  `${urlDirSecao(pleito, s)}/p${pleitoLongo(pleito)}-${s.uf}-m${s.municipio}-z${s.zona}-s${s.secao}-aux.json`;

export const urlArquivo = (pleito, s, hash, nome) => `${urlDirSecao(pleito, s)}/${hash}/${nome}`;

export const nomeZip = (sufixo, uf) => `bu_imgbu_logjez_rdv_vscmr_2026_${sufixo}_${uf.toUpperCase()}.zip`;

export const urlZip = (sufixo, uf) => `${URL_ZIPS}/${nomeZip(sufixo, uf)}`;

// Nome dos arquivos de urna: o03221sp6106902390162-bu.dat
// → pleito (5), uf (2), município (5), zona (4), seção (4), tipo
const PADRAO_NOME_URNA = /^o(\d{5})([a-z]{2})(\d{5})(\d{4})(\d{4})-([a-z]+\.[a-z]+)$/;

export function interpretarNomeUrna(nome) {
  const m = PADRAO_NOME_URNA.exec(nome);
  if (!m) return null;
  return { pleito: String(Number(m[1])), uf: m[2], municipio: m[3], zona: m[4], secao: m[5], tipo: m[6] };
}

export function caminhos(turno, dirDados = DIR_DADOS) {
  const raiz = path.join(dirDados, 'raw', `${turno}t`);
  return {
    config: path.join(raiz, 'config'),
    zips: path.join(raiz, 'zip'),
    extrasZip: path.join(raiz, 'zip-extras'),
    urnas: path.join(raiz, 'urnas'),
    manifesto: path.join(dirDados, 'manifest', `${turno}t`),
  };
}

export const dirSecao = (dirUrnas, s) => path.join(dirUrnas, s.uf, s.municipio, s.zona, s.secao);
