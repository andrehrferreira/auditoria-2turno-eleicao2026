// Demógrafo: aptos e comparecimento de Presidente por seção nos dois turnos (dados abertos do TSE, detalhe_votacao_secao),
// com a composição de cada seção principal (agregadas de cada turno, eleitorado_local_votacao).
// Saída: data/parsed/auditoria/demografo/secao-turnos.tsv, uma linha por (turno, seção principal):
//   turno uf municipio zona secao aptos comparecimento instalada origem eleitores_secoes membros
// (eleitores_secoes = soma de QT_ELEITOR_SECAO da principal e das agregadas; membros = seções separadas por vírgula).
// Uso: node scripts/auditoria/demografo-turnos.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { entradasZip, linhasBrutas } from './contagem-zip.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const ZIP_LOCAIS = path.join(RAIZ, 'data/raw/dadosabertos/eleitorado_locais_votacao/eleitorado_local_votacao_2026.zip');
const ZIP_DETALHE = path.join(RAIZ, 'data/raw/dadosabertos/detalhe_votacao_secao/detalhe_votacao_secao_2026.zip');
const SAIDA = path.join(RAIZ, 'data/parsed/auditoria/demografo/secao-turnos.tsv');
const p4 = (x) => String(Number(x)).padStart(4, '0');
const p5 = (x) => String(Number(x)).padStart(5, '0');

async function* csv(zip, nome) {
  const e = (await entradasZip(zip)).find((x) => x.nome === nome);
  if (!e) throw new Error(`${nome} não está em ${zip}`);
  let col = null;
  for await (const c of linhasBrutas(zip, e)) {
    if (!col) { col = Object.fromEntries(c.map((n, i) => [n, i])); continue; }
    yield (k) => c[col[k]];
  }
}

// 1. Composição: (turno, uf, mun, zona, principal) → { eleitores, membros }
const unidades = new Map();
for await (const g of csv(ZIP_LOCAIS, 'eleitorado_local_votacao_2026_BRASIL.csv')) {
  const principal = g('CD_TIPO_SECAO_AGREGADA') === '2' ? g('NR_SECAO_PRINCIPAL') : g('NR_SECAO');
  const chave = [g('NR_TURNO'), g('SG_UF').toLowerCase(), p5(g('CD_MUNICIPIO')), p4(g('NR_ZONA')), p4(principal)].join('\t');
  let u = unidades.get(chave);
  if (!u) unidades.set(chave, (u = { eleitores: 0, membros: [] }));
  u.eleitores += Number(g('QT_ELEITOR_SECAO'));
  u.membros.push(p4(g('NR_SECAO')));
}

// 2. Votação de Presidente por seção (uma ou mais linhas por seção, conforme a origem do voto)
const votos = new Map();
for await (const g of csv(ZIP_DETALHE, 'detalhe_votacao_secao_2026_BR.csv')) {
  if (g('CD_CARGO') !== '1') continue;
  const chave = [g('NR_TURNO'), g('SG_UF').toLowerCase(), p5(g('CD_MUNICIPIO')), p4(g('NR_ZONA')), p4(g('NR_SECAO'))].join('\t');
  const v = votos.get(chave) ?? { aptos: 0, comp: 0, instalada: g('ST_SECAO_INSTALADA'), origem: new Set() };
  v.aptos += Number(g('QT_APTOS'));
  v.comp += Number(g('QT_COMPARECIMENTO'));
  v.origem.add(g('DS_ORIGEM_VOTO'));
  votos.set(chave, v);
}

const linhas = ['turno\tuf\tmunicipio\tzona\tsecao\taptos\tcomparecimento\tinstalada\torigem\teleitores_secoes\tmembros'];
let semComposicao = 0;
for (const [chave, v] of votos) {
  const u = unidades.get(chave);
  if (!u) semComposicao++;
  linhas.push([chave, v.aptos, v.comp, v.instalada, [...v.origem].join('|'), u?.eleitores ?? '', u?.membros.sort().join(',') ?? ''].join('\t'));
}
await mkdir(path.dirname(SAIDA), { recursive: true });
await writeFile(SAIDA, linhas.join('\n') + '\n');
console.log(`unidades (locais): ${unidades.size}; seções com votação: ${votos.size}; sem composição: ${semComposicao}`);
