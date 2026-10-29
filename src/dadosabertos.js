import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { parseArgs } from 'node:util';
import { DIR_DADOS, UFS } from './config.js';
import { baixarArquivoGrande } from './http.js';
import { criarRegistro, formatarBytes } from './registro.js';

// Dados abertos do TSE (CDN, sem o limite de acesso do resultados.tse.jus.br). Conferidos em 29/10/2026 (HEAD 200).
const BASE = 'https://cdn.tse.jus.br/estatistica/sead/odsele';
const UFS_MAIUSCULAS = UFS.map((u) => u.toUpperCase());

export const CONJUNTOS = {
  votacao_secao: { descricao: 'votos por seção e candidato (os dois turnos)', arquivos: ['votacao_secao/votacao_secao_2026_BR.zip'] },
  detalhe_votacao_secao: { descricao: 'aptos, comparecimento e abstenção por seção', arquivos: ['detalhe_votacao_secao/detalhe_votacao_secao_2026.zip'] },
  votacao_candidato_munzona: { descricao: 'votos por candidato, município e zona', arquivos: ['votacao_candidato_munzona/votacao_candidato_munzona_2026.zip'] },
  consulta_cand: { descricao: 'candidaturas 2026 (situação, cancelamentos, números)', arquivos: ['consulta_cand/consulta_cand_2026.zip'] },
  historico_munzona: {
    descricao: 'linha de base: votos por candidato, município e zona em 2022 e 2018',
    arquivos: ['votacao_candidato_munzona/votacao_candidato_munzona_2022.zip', 'votacao_candidato_munzona/votacao_candidato_munzona_2018.zip'],
  },
  perfil_comparecimento_abstencao: { descricao: 'comparecimento e abstenção por faixa etária, gênero etc.', arquivos: ['perfil_comparecimento_abstencao/perfil_comparecimento_abstencao_2026.zip'] },
  eleitorado_local_votacao: { descricao: 'eleitorado por local de votação', arquivos: ['eleitorado_locais_votacao/eleitorado_local_votacao_2026.zip'] },
  perfil_eleitor_secao: {
    descricao: 'perfil do eleitorado por seção (idade, biometria...), um zip por UF',
    arquivos: UFS_MAIUSCULAS.map((uf) => `perfil_eleitor_secao/perfil_eleitor_secao_2026_${uf}.zip`),
  },
};

const DIR_DESTINO = path.join(DIR_DADOS, 'raw', 'dadosabertos');

async function sha256Arquivo(caminho) {
  const hash = createHash('sha256');
  await pipeline(createReadStream(caminho), hash);
  return hash.digest('hex');
}

async function existe(caminho) {
  try {
    return await stat(caminho);
  } catch (erro) {
    if (erro.code === 'ENOENT') return null;
    throw erro;
  }
}

/** Baixa os conjuntos pedidos para data/raw/dadosabertos/<pasta>/, com retomada e SHA-256 no manifesto. */
export async function baixarConjuntos(nomes, { destino = DIR_DESTINO } = {}) {
  const registro = criarRegistro(path.join(DIR_DADOS, 'manifest', 'dadosabertos'));
  let falhas = 0;
  try {
    for (const nome of nomes) {
      for (const relativo of CONJUNTOS[nome].arquivos) {
        const url = `${BASE}/${relativo}`;
        const arquivo = path.join(destino, relativo);
        if (await existe(arquivo)) {
          console.log(`[dadosabertos] já baixado: ${relativo}`);
          continue;
        }
        try {
          let ultimo = 0;
          let impressoEm = 0;
          const info = await baixarArquivoGrande(url, arquivo, {
            aoProgresso: ({ inicio, total, recebidos }) => {
              ultimo = recebidos === 0 ? inicio : ultimo + recebidos;
              // Uma linha a cada 2 s: sem o limite, o log chegou a 11,6 MB num download de 2,5 GB.
              if (Date.now() - impressoEm < 2000) return;
              impressoEm = Date.now();
              process.stdout.write(`\r[dadosabertos] ${relativo} ${formatarBytes(ultimo)}/${formatarBytes(total)}   `);
            },
          });
          process.stdout.write('\n');
          await registro.zip({ conjunto: nome, ...info, caminho: path.relative(DIR_DADOS, arquivo).split(path.sep).join('/'), sha256: await sha256Arquivo(arquivo) });
        } catch (erro) {
          falhas++;
          process.stdout.write('\n');
          console.log(`[dadosabertos] FALHA ${relativo}: ${erro.message}`);
          await registro.ocorrencia({ etapa: 'dadosabertos', gravidade: 'falha', conjunto: nome, url, erro: erro.message });
        }
      }
    }
  } finally {
    await registro.concluir();
  }
  return falhas;
}

async function principal() {
  const { values } = parseArgs({ options: { conjuntos: { type: 'string' }, ajuda: { type: 'boolean', short: 'h' } } });
  if (values.ajuda) {
    console.log(`Uso: node src/dadosabertos.js [--conjuntos ${Object.keys(CONJUNTOS).join(',')}]\n`);
    for (const [nome, c] of Object.entries(CONJUNTOS)) console.log(`  ${nome.padEnd(28)} ${c.descricao}`);
    return;
  }
  const nomes = values.conjuntos ? values.conjuntos.split(',').map((n) => n.trim()) : Object.keys(CONJUNTOS);
  const desconhecidos = nomes.filter((n) => !CONJUNTOS[n]);
  if (desconhecidos.length) throw new Error(`conjunto desconhecido: ${desconhecidos.join(', ')}`);
  process.exitCode = (await baixarConjuntos(nomes)) ? 1 : 0;
}

if (import.meta.filename === path.resolve(process.argv[1] ?? '')) await principal();
