// Estatístico eleitoral, H13 sinal V2, adendo 6 de 31/10/2026 ao plano 16 (doc 26): compara a contagem das mensagens do
// diário de 2022 de uma UF com a de MG (doc 24), antes do modelo. Decisão só pelo texto e pela contagem, nunca pelo voto.
// Lê os <t>t.mensagens.json de estatistico-h13-v2-diario2022.mjs (já normalizados: números → N, 8 dígitos ou mais → #).
// Relata: as marcas de via (as da tabela TRADUCAO e a V1) e as mensagens com pelo menos 1 por 1.000 votos numa UF e
// ausentes na outra.
// Uso: node scripts/auditoria/estatistico-h13-v2-mensagens2022.mjs --uf pr|sc|rs
// Saída: data/parsed/auditoria/estatistico/h13-v2/sul2022/mensagens-<uf>.json
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { baseDiario2022 } from './estatistico-h13-v2-diario2022.mjs';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h13-v2', 'sul2022');
const MARCAS = [
  'Título digitado pelo mesário',
  'Aguardando digitação do título',
  'Tipo de habilitação do eleitor [biométrica]',
  'O eleitor não possui biometria',
  'Solicitação de dado pessoal do eleitor para habilitação manual',
  'Biometria do mesário # encontrada nos arquivos coletados (N)',
  'Biometria do mesário # encontrada em eleitores (N)',
  'Digital coletada bate com uma digital gravada após o registro inicial de mesário. Não é possível associar a habilitação a um mesário.',
  'Não encontrou digital coletada em nenhum dos arquivos, vai salvar a digital em novo arquivo.',
  'Ano de nascimento inválido',
  'O voto do eleitor foi computado',
  // marcas de 2026 (devem ser 0 em 2022)
  'Identificador do eleitor digitado pelo mesário',
  'Ano de nascimento digitado é igual ao do cadastro',
  'Dado digitado confere',
  'Foto do eleitor apresentada',
];
const { values } = parseArgs({ options: { uf: { type: 'string' } } });
const uf = values.uf?.toLowerCase();
if (!['pr', 'sc', 'rs'].includes(uf)) throw new Error('--uf pr|sc|rs');
await mkdir(SAIDA, { recursive: true });
const ler = async (u, t) => JSON.parse(await readFile(`${baseDiario2022(u, t)}.mensagens.json`, 'utf8'));
const res = { uf, comparadoCom: 'mg', turnos: {} };
for (const t of [1, 2]) {
  const a = await ler(uf, t), m = await ler('mg', t);
  const va = a.mensagens['O voto do eleitor foi computado'] ?? 0, vm = m.mensagens['O voto do eleitor foi computado'] ?? 0;
  const marcas = Object.fromEntries(MARCAS.map((k) => [k, { [uf]: a.mensagens[k] ?? 0, mg: m.mensagens[k] ?? 0, [`${uf}PorVoto`]: (a.mensagens[k] ?? 0) / va, mgPorVoto: (m.mensagens[k] ?? 0) / vm }]));
  const soNaUf = Object.entries(a.mensagens).filter(([k, v]) => v >= va / 1000 && !m.mensagens[k]).map(([k, v]) => ({ mensagem: k, n: v }));
  const soEmMg = Object.entries(m.mensagens).filter(([k, v]) => v >= vm / 1000 && !a.mensagens[k]).map(([k, v]) => ({ mensagem: k, n: v }));
  res.turnos[t] = { secoes: a.secoes, erros: a.erros, tiposHabilitacao: a.tiposHabilitacao, confirmacoesPorCiclo: a.confirmacoesPorCiclo, mensagensDistintas: Object.keys(a.mensagens).length, marcas, soNaUf, soEmMg };
}
await writeFile(path.join(SAIDA, `mensagens-${uf}.json`), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
