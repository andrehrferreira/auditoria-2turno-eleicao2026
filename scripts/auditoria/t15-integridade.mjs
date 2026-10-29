// T15, tópico 01 (integridade e estrutura dos arquivos): confere os números citados em
// docs/pericia/01-integridade-e-estrutura-dos-arquivos.md contra os arquivos brutos.
// Uso: node scripts/auditoria/t15-integridade.mjs
// Saída: data/parsed/auditoria/t15/01-integridade.json
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { lerBu } from '../../src/lacres.js';
import { lerLogJez } from '../../src/exportar.js';
import { hashDiretorio, lerResumosVsc } from '../../src/vsc.js';
import { decodificarArquivo, filhos, lerTlv } from '../../src/asn1.js';
import { arquivoVsc } from '../../src/esquemas.js';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const SAIDA = path.join(RAIZ, 'data', 'parsed', 'auditoria', 't15', '01-integridade.json');

async function dirHashUnico(dirSecao) {
  const itens = (await readdir(dirSecao, { withFileTypes: true })).filter((i) => i.isDirectory());
  return itens.map((i) => path.join(dirSecao, i.name));
}

async function secao(turno, sec) {
  const [dir] = await dirHashUnico(path.join(RAIZ, 'data', 'raw', turno, 'urnas', 'es', '57037', '0055', sec));
  const nomes = await readdir(dir);
  const tamanhos = {};
  for (const n of nomes) tamanhos[n] = (await stat(path.join(dir, n))).size;
  const nome = (suf) => nomes.find((n) => n.endsWith(suf));
  const bu = lerBu(await readFile(path.join(dir, nome('-bu.dat'))));
  const log = await lerLogJez(path.join(dir, nome('-log.jez')));
  const linhas = log.split(/\r?\n/);
  const linhasNaoVazias = linhas.filter(Boolean);
  const urnasLog = [...new Set(linhasNaoVazias.map((l) => l.split('\t')[2]))];
  const vsc = await readFile(path.join(dir, nome('-vota.vsc')));
  const resumos = lerResumosVsc(vsc);
  // As duas listas (SW = software/CEPESC, HW = urna/Ed521): tamanho e SHA-512 de cada arquivo presente
  // e SHA-512 da lista inteira contra o valor do cabeçalho da própria lista.
  const decod = decodificarArquivo(arquivoVsc, vsc);
  const brutos = filhos(lerTlv(vsc, 0));
  const listas = {};
  for (const [i, chave] of [[0, 'assinaturaSW'], [1, 'assinaturaHW']]) {
    const [, , , conteudo] = filhos(brutos[i]);
    const ent = decod[chave];
    const porArquivo = {};
    for (const a of ent.conteudoAutoAssinado.arquivosAssinados) {
      const caminho = path.join(dir, a.nomeArquivo);
      const existe = nomes.includes(a.nomeArquivo);
      if (!existe) continue;
      const b = await readFile(caminho);
      porArquivo[a.nomeArquivo] = {
        tamanhoConfere: a.assinatura.tamanho === b.length,
        sha512Confere: createHash('sha512').update(b).digest('hex').toUpperCase() === a.assinatura.hash.toUpperCase(),
      };
    }
    listas[chave] = {
      algoritmo: ent.autoAssinado.algoritmoAssinatura.algoritmo,
      arquivosNaLista: ent.conteudoAutoAssinado.arquivosAssinados.length,
      hashListaConfere: createHash('sha512').update(conteudo.valor).digest('hex').toUpperCase() === ent.autoAssinado.assinatura.hash.toUpperCase(),
      porArquivo,
    };
  }
  return {
    dir: path.relative(RAIZ, dir),
    tamanhosBytes: tamanhos,
    logAbertoBytes: Buffer.byteLength(log, 'latin1'),
    logLinhasNaoVazias: linhasNaoVazias.length,
    urnasNoLog: urnasLog,
    urnaNoBu: bu.urna.numeroInternoUrna,
    arquivosNoVsc: [...resumos.keys()],
    qtdArquivosNoVsc: resumos.size,
    listas,
    nomeDirConfere: hashDiretorio(vsc) === path.basename(dir),
    eleicoes: bu.eleicoes.map((e) => ({
      idEleicao: e.idEleicao,
      cargos: e.cargos.map((c) => ({ codigoCargo: c.codigoCargo, votaveis: c.votaveis.map((v) => ({ tipoVoto: v.tipoVoto, codigo: v.codigo, quantidade: v.quantidade })) })),
    })),
  };
}

// AC, 2º turno: quantos diretórios de hash por seção e se as cópias duplas são o mesmo pacote.
async function acDuplicados() {
  const base = path.join(RAIZ, 'data', 'raw', '2t', 'urnas', 'ac');
  let secoes = 0;
  let dirs = 0;
  const porQtd = {};
  const duplas = { total: 0, vscIgual: 0, vscDiferente: 0, nomeDirConfereSoUm: 0, nomesDir: [] };
  for (const mun of (await readdir(base)).sort()) {
    const dMun = path.join(base, mun);
    if (!(await stat(dMun)).isDirectory()) continue;
    for (const zona of (await readdir(dMun)).sort()) {
      for (const sec of (await readdir(path.join(dMun, zona))).sort()) {
        const dSec = path.join(dMun, zona, sec);
        const hs = [];
        for (const d of await dirHashUnico(dSec)) if ((await readdir(d)).some((n) => n.endsWith('.vsc'))) hs.push(d);
        if (!hs.length) continue;
        secoes++;
        dirs += hs.length;
        porQtd[hs.length] = (porQtd[hs.length] ?? 0) + 1;
        if (hs.length === 2) {
          duplas.total++;
          const shas = [];
          let confere = 0;
          for (const d of hs) {
            const n = (await readdir(d)).find((x) => x.endsWith('.vsc'));
            const b = await readFile(path.join(d, n));
            shas.push(createHash('sha256').update(b).digest('hex'));
            if (hashDiretorio(b) === path.basename(d)) confere++;
          }
          if (shas[0] === shas[1]) duplas.vscIgual++; else duplas.vscDiferente++;
          if (confere === 1) duplas.nomeDirConfereSoUm++;
          if (duplas.nomesDir.length < 3) duplas.nomesDir.push(hs.map((d) => path.relative(RAIZ, d)));
        }
      }
    }
  }
  return { secoes, dirs, porQtd, duplas };
}

const resultado = {
  geradoEm: new Date().toISOString(),
  es372_2t: await secao('2t', '0372'),
  es372_1t: await secao('1t', '0372'),
  ac2t: await acDuplicados(),
};
await mkdir(path.dirname(SAIDA), { recursive: true });
await writeFile(SAIDA, JSON.stringify(resultado, null, 2));
console.log(JSON.stringify(resultado, null, 2));
