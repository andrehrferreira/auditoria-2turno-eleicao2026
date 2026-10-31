// Estatístico eleitoral, H13 sinal V2: vias de liberação por seção nos diários de urna de 2022, 1º e 2º turno, lidos direto
// do zip por UF (coleta-2022-mg.mjs). MG: adendo 5 de 30/10/2026 ao plano 16 (doc 24); PR, SC e RS: adendo 6 (doc 26).
//
// Leitura igual à de estatistico-h08-varredura.mjs (mesmas funções: fluxosDoTexto, juntarCopias com união das cópias,
// processarFluxo). O que muda em 2022:
//   - o .logjez é um 7z (leitor-7z.mjs), com logd.dat e cópias aninhadas (.jez, também 7z);
//   - o texto de algumas marcas. Antes do ciclo, cada linha de 2022 tem a mensagem traduzida para o texto de 2026
//     (TRADUCAO abaixo; a tabela e a justificativa estão no doc 24). As outras linhas ficam como estão.
// Também conta todas as mensagens do dia (números trocados por N; números com 8 dígitos ou mais por #), para documentar
// as diferenças de formato. Nenhum título é gravado: só contagens.
//
// Uso: node scripts/auditoria/estatistico-h13-v2-diario2022.mjs [--uf mg|pr|sc|rs] --turno 1|2 [--limite n]
// Saída: data/parsed/auditoria/estatistico/h13-v2/diario2022/<t>t.jsonl (MG) ou <uf>-<t>t.jsonl (uma linha por seção) e
//        o .mensagens.json correspondente; com os dois turnos prontos, --juntar grava h13-v2/secoes-<uf>-2022-diario.csv
import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, open, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';
import { TURNOS_2022, UFS_2022, caminhoZip2022, secoesDoZip } from './coleta-2022-mg.mjs';
import { fluxosDoTexto, juntarCopias, processarFluxo } from './estatistico-h08-varredura.mjs';
import { eh7z, lerArquivos7z } from './leitor-7z.mjs';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h13-v2');
const DIR = path.join(SAIDA, 'diario2022');
/** Nome dos arquivos de saída por UF e turno: MG mantém os do doc 24. */
export const baseDiario2022 = (uf, t) => path.join(DIR, uf === 'mg' ? `${t}t` : `${uf}-${t}t`);

// Mensagem de 2022 → mensagem de 2026 com o mesmo papel no ciclo do eleitor (doc 24, seção 2).
export const TRADUCAO = [
  [/^Título digitado pelo mesário$/, 'Identificador do eleitor digitado pelo mesário'],
  [/^Aguardando digitação do título$/, 'Aguardando digitação do identificador do eleitor'],
  [/^O eleitor não possui biometria$/, 'Ano de nascimento digitado é igual ao do cadastro'],
  [/^Solicitação de dado pessoal do eleitor para habilitação manual$/, 'Dado digitado confere'],
  [/^Biometria do mesário (\d+) encontrada (em eleitores|nos arquivos coletados)/, 'Mesário $1 habilitou o eleitor'],
];
export function traduzir(linha) {
  const c = linha.split('\t');
  const m = c[4];
  if (m === undefined) return linha;
  for (const [re, novo] of TRADUCAO) if (re.test(m)) { c[4] = m.replace(re, novo); return c.join('\t'); }
  return linha;
}
const normalizar = (m) => m.replace(/\d{8,}/g, '#').replace(/\d+/g, 'N');

/** Textos (logd.dat) de um .logjez de 2022 e das cópias aninhadas; aceita zip aninhado também. */
export async function textos7z(buf, prof = 0) {
  const out = [];
  if (eh7z(buf)) {
    for (const { nome, dados } of lerArquivos7z(buf)) {
      if (nome === 'logd.dat') out.push(dados.toString('latin1'));
      else if (nome.endsWith('.jez') && prof < 4) out.push(...(await textos7z(dados, prof + 1)));
    }
  } else if (buf.readUInt32LE(0) === 0x04034b50) {
    const mem = { read: async (d, o, n, p) => ({ bytesRead: buf.copy(d, o, p, p + n) }), stat: async () => ({ size: buf.length }) };
    for (const e of await listarEntradas(mem)) {
      const dados = await lerEntrada(mem, e);
      if (e.nome === 'logd.dat') out.push(dados.toString('latin1'));
      else if (e.nome.endsWith('.jez') && prof < 4) out.push(...(await textos7z(dados, prof + 1)));
    }
  } else throw new Error('logjez em formato desconhecido');
  return out;
}

const novoHist = () => ({ A: {}, B: {}, C: {}, D: {}, passos: {}, tiposHabilitacao: {}, confirmacoesPorCiclo: {} });

async function turno(uf, t, limite) {
  const { pleito, data: dia } = TURNOS_2022[t];
  await mkdir(DIR, { recursive: true });
  const handle = await open(caminhoZip2022(t, uf), 'r');
  const mensagens = new Map();
  const hist = novoHist();
  let n = 0, erros = 0;
  const arq = `${baseDiario2022(uf, t)}.jsonl`;
  const saida = createWriteStream(`${arq}.tmp`);
  const inicio = Date.now();
  try {
    const { grupos } = await secoesDoZip(handle, pleito, uf);
    const ids = [...grupos.keys()].sort().slice(0, limite ?? undefined);
    for (const id of ids) {
      const [, municipio, zona, secao] = id.split('/');
      const sec = { uf, municipio, zona, secao, textos: 0, linhasOutraSecao: 0, linhasForaDaCopia: 0, linhasTraduzidas: 0, votos: 0,
        vias: { v1: 0, v2: 0, v3m: 0, v3s: 0, outra: 0 }, semIdentificador: 0, minA: null, minB: {}, minC: {}, lf1: [], fluxos: 0, semCiclo: 0, duplicadas: 0 };
      try {
        const copias = new Map();
        const outras = { n: 0 };
        for (const it of grupos.get(id).filter((i) => i.info.tipo === 'logjez')) {
          const ts = await textos7z(await lerEntrada(handle, it.entrada));
          sec.textos += ts.length;
          for (const tx of ts) {
            for (const [urna, linhas] of fluxosDoTexto(tx, dia, secao, outras)) {
              if (!copias.has(urna)) copias.set(urna, []);
              copias.get(urna).push(linhas);
            }
          }
        }
        sec.linhasOutraSecao = outras.n;
        for (const lista of copias.values()) {
          const { linhas, foraDaMaior } = juntarCopias(lista, 'uniao');
          sec.linhasForaDaCopia += foraDaMaior;
          const traduzidas = linhas.map((l) => {
            const m = l.split('\t')[4];
            if (m !== undefined) { const k = normalizar(m); mensagens.set(k, (mensagens.get(k) ?? 0) + 1); }
            const x = traduzir(l);
            if (x !== l) sec.linhasTraduzidas++;
            return x;
          });
          const { f } = processarFluxo(traduzidas, hist, sec);
          sec.votos += f.votos;
          sec.semCiclo += f.semCiclo;
          sec.duplicadas += f.duplicadas;
          sec.fluxos++;
        }
        delete sec.lf1; delete sec.minB; delete sec.minC; delete sec.minA;
      } catch (e) {
        sec.erro = e.message;
        erros++;
      }
      saida.write(`${JSON.stringify(sec)}\n`);
      if (++n % 2000 === 0) console.log(`[${uf} ${t}t] ${n}/${ids.length} seções · ${erros} erro(s) · ${((Date.now() - inicio) / 60000).toFixed(1)} min`);
    }
  } finally {
    await handle.close();
    await new Promise((r) => saida.end(r));
  }
  await rename(`${arq}.tmp`, arq);
  const ordenadas = Object.fromEntries([...mensagens].sort((a, b) => b[1] - a[1]));
  await writeFile(`${baseDiario2022(uf, t)}.mensagens.json`, `${JSON.stringify({ uf, turno: t, dia, secoes: n, erros, tiposHabilitacao: hist.tiposHabilitacao, confirmacoesPorCiclo: hist.confirmacoesPorCiclo, mensagens: ordenadas }, null, 1)}\n`);
  console.log(`RESUMO ${uf} ${t}t: ${n} seções, ${erros} erro(s), ${((Date.now() - inicio) / 60000).toFixed(1)} min`);
}

async function juntar(uf) {
  const por = new Map();
  for (const t of [1, 2]) {
    for (const l of (await readFile(`${baseDiario2022(uf, t)}.jsonl`, 'utf8')).split('\n')) {
      if (!l) continue;
      const x = JSON.parse(l);
      const id = `${uf}/${x.municipio}/${x.zona}/${x.secao}`;
      const o = por.get(id) ?? {};
      o[t] = x;
      por.set(id, o);
    }
  }
  const C = ['votos', 'v1', 'v2', 'v3m', 'v3s', 'outra', 'textos', 'fluxos', 'linhasForaDaCopia', 'linhasOutraSecao', 'semCiclo', 'erro'];
  const cab = ['id', ...[1, 2].flatMap((t) => C.map((c) => `${c}_${t}`))];
  const val = (x, c) => (!x ? '' : c in x.vias ? x.vias[c] : c === 'erro' ? (x.erro ? 1 : 0) : x[c]);
  const linhas = [...por].sort(([a], [b]) => a.localeCompare(b)).map(([id, o]) => [id, ...[1, 2].flatMap((t) => C.map((c) => val(o[t], c)))].join(';'));
  await writeFile(path.join(SAIDA, `secoes-${uf}-2022-diario.csv`), `${[cab.join(';'), ...linhas].join('\n')}\n`);
  console.log(`secoes-${uf}-2022-diario.csv: ${linhas.length} seções`);
}

if (import.meta.filename === path.resolve(process.argv[1] ?? '')) {
  const { values } = parseArgs({ options: { uf: { type: 'string', default: 'mg' }, turno: { type: 'string' }, limite: { type: 'string' }, juntar: { type: 'boolean' } } });
  const uf = values.uf.toLowerCase();
  if (!UFS_2022.includes(uf)) throw new Error(`--uf fora das autorizadas (${UFS_2022.join(', ')})`);
  if (values.juntar) await juntar(uf);
  else {
    const t = Number(values.turno);
    if (!TURNOS_2022[t]) throw new Error('--turno 1 ou 2');
    if (!existsSync(caminhoZip2022(t, uf))) throw new Error(`zip ausente: ${caminhoZip2022(t, uf)}`);
    await turno(uf, t, values.limite ? Number(values.limite) : null);
  }
}
