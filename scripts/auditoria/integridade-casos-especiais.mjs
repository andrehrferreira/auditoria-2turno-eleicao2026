import { createReadStream } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { hashDiretorio } from '../../src/vsc.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

// Auditor E (integridade nacional). Casos que o resumo separa e que pedem leitura do log:
//   1. Pacotes do Recuperador de Dados (tipo_arquivo 'votacaoRED' no banco): BU de uma urna, .vsc/certificado/log de
//      outra. Confere se a urna do BU é a do log aninhado, se o log da urna original tem o mesmo número de votos do BU
//      e quando a recuperação aconteceu ("Iniciando aplicação RECUPERADOR DE DADOS"). Compara a FV do BU com os cartões de
//      votação lidos nos logs ("Serial da MV:") e registra se o RED informou "Detectado Urna de Votação sem MV".
//   2. Grupos de MR repetida no turno (casos.jsonl, repeticao_mr): para cada seção do grupo, computador, usuário e
//      data/hora de geração da MR lidos no log. Mesma geração em todas = cópia de uma MR só.
// Entrada: secoes.jsonl e casos.jsonl de integridade-resumo.mjs (<t>t, ou --dir; no 1º turno, 1t-identificadores).
// Saída: <dir>/casos-especiais.json
//
// Uso: node scripts/auditoria/integridade-casos-especiais.mjs --turno 2 [--dir <pasta>]

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'integridade');
const DIA = { 1: '04/10/2026', 2: '25/10/2026' };
const handleEmMemoria = (buffer) => ({
  read: async (destino, deslocamento, tamanho, posicao) => ({ bytesRead: buffer.copy(destino, deslocamento, posicao, posicao + tamanho) }),
  stat: async () => ({ size: buffer.length }),
});
async function textosDeLog(handle, profundidade = 0) {
  const textos = [];
  for (const entrada of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, entrada);
    if (entrada.nome === 'logd.dat') textos.push({ profundidade, nome: entrada.nome, texto: dados.toString('latin1') });
    else if (entrada.nome.endsWith('.jez') && profundidade < 3) textos.push(...(await textosDeLog(handleEmMemoria(dados), profundidade + 1)));
  }
  return textos;
}

async function logsDaSecao(base, k) {
  const dir = path.join(base, ...k.split('/'));
  let hashes;
  try {
    const aux = JSON.parse(await readFile(path.join(dir, 'aux.json'), 'utf8'));
    hashes = (aux.hashes ?? []).filter((h) => h.hash && h.hash !== '0' && (h.arq ?? []).some((a) => a.nm)).map((h) => h.hash);
  } catch {
    hashes = [];
    for (const h of (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name)) {
      const nomes = await readdir(path.join(dir, h));
      const v = acharArquivo(nomes, 'vsc');
      if (v && hashDiretorio(await readFile(path.join(dir, h, v))) === h) hashes.push(h);
    }
  }
  const h = hashes.at(-1);
  const nomes = await readdir(path.join(dir, h));
  return textosDeLog(handleEmMemoria(await readFile(path.join(dir, h, acharArquivo(nomes, 'log')))));
}

const colunas = (texto) => texto.split('\n').map((l) => l.replace(/\r$/, '').split('\t')).filter((c) => c.length >= 5);

async function principal() {
  const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, dir: { type: 'string' } } });
  const turno = Number(values.turno);
  const dir = values.dir ?? path.join(SAIDA, `${turno}t`);
  const base = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas');
  const secoes = new Map();
  for await (const l of createInterface({ input: createReadStream(path.join(dir, 'secoes.jsonl')), crlfDelay: Infinity })) {
    if (l) {
      const c = JSON.parse(l);
      secoes.set(c.k, c);
    }
  }
  const { db } = await abrirLeitura(); // cópia imutável do banco (doc 09, "Leitura sem concorrência")
  const red = db.prepare("SELECT uf, municipio, zona, secao, tipo_urna, comparecimento FROM secao WHERE turno = ? AND tipo_arquivo = 'votacaoRED' ORDER BY 1, 2, 3, 4").all(turno);
  const saida = { turno, red: [], mr: [] };
  for (const s of red) {
    const k = `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`;
    const c = secoes.get(k) ?? null;
    const logs = await logsDaSecao(base, k);
    const porLog = logs.map((l) => {
      const cs = colunas(l.texto);
      const urnas = [...new Set(cs.map((x) => Number(x[2])))];
      const votosNoDia = cs.filter((x) => x[0].startsWith(DIA[turno]) && x[4] === 'O voto do eleitor foi computado').length;
      const red1 = cs.find((x) => x[4].startsWith('Iniciando aplicação RECUPERADOR DE DADOS'));
      const contingencia = cs.find((x) => x[4].startsWith('Modo de carga da UE - Urna de contingência'));
      const mvs = [...new Set(cs.filter((x) => x[4].startsWith('Serial da MV: ')).map((x) => x[4].slice(14).trim()))];
      const semMv = cs.some((x) => x[3] === 'RED' && x[4] === 'Detectado Urna de Votação sem MV');
      return { profundidade: l.profundidade, urnas, votosNoDia, recuperacao: red1?.[0] ?? null, cargaContingencia: contingencia?.[0] ?? null, mvs, semMv,
        mensagensRed: [...new Set(cs.filter((x) => x[3] === 'RED').map((x) => x[4].replace(/\d+/g, '#')))].slice(0, 40) };
    });
    const votosLogs = porLog.reduce((a, l) => a + l.votosNoDia, 0);
    saida.red.push({ onde: k, tipoUrna: s.tipo_urna, comparecimentoBU: s.comparecimento, urnaBU: c?.urnaBU ?? null, urnaVsc: c?.urnaVsc ?? null, certificado: c?.certNome ?? null,
      emissor: c?.emissor ?? null, modelo: c?.modeloVsc ?? null, buUrnaNoLogAninhado: c ? porLog.some((l) => l.profundidade > 0 && l.urnas.includes(c.urnaBU)) : null,
      buUrnaIgualVsc: c ? c.urnaBU === c.urnaVsc : null, votosNosLogs: votosLogs, votosConferem: votosLogs === s.comparecimento,
      fvBU: c?.fv ?? null, fvBuEntreMvsLidas: c ? porLog.some((l) => l.mvs.includes(c.fv)) : null, redSemMv: porLog.some((l) => l.semMv), logs: porLog });
  }
  // Grupos de MR repetida
  const casos = createInterface({ input: createReadStream(path.join(dir, 'casos.jsonl')), crlfDelay: Infinity });
  for await (const l of casos) {
    if (!l.includes('"repeticao_mr"')) continue;
    const g = JSON.parse(l);
    const lista = g.onde.split('; ');
    const geracoes = {};
    for (const k of lista) {
      const logs = await logsDaSecao(base, k);
      const cs = colunas(logs.find((x) => x.profundidade === 0)?.texto ?? '');
      let ger = null;
      let i = cs.findLastIndex((x) => x[4] === `Número de série da MR: ${g.valor}`);
      if (i >= 0) {
        const bloco = cs.slice(i, i + 6).map((x) => x[4]);
        const pc = bloco.find((m) => m.startsWith('MR gerada pelo computador: '))?.slice(27) ?? '?';
        const quando = bloco.find((m) => m.startsWith('Data e hora da geração da MR: '))?.slice(30) ?? '?';
        const usuario = bloco.find((m) => m.startsWith('MR gerada pelo usuário: ')) ? 'informado' : '?';
        ger = `${pc} | ${quando} | usuário ${usuario}`;
      }
      geracoes[ger ?? 'sem bloco de geração'] = (geracoes[ger ?? 'sem bloco de geração'] ?? 0) + 1;
    }
    const zonas = [...new Set(lista.map((x) => x.split('/').slice(0, 3).join('/')))];
    saida.mr.push({ valor: g.valor, secoes: lista.length, zonas, tipos: g.tipos.reduce((o, t) => ((o[t] = (o[t] ?? 0) + 1), o), {}), geracoes,
      umaGeracaoSo: Object.keys(geracoes).length === 1, exemplo: lista.slice(0, 3) });
  }
  await writeFile(path.join(dir, 'casos-especiais.json'), JSON.stringify(saida, null, 1));
  console.log(JSON.stringify({ red: saida.red.map(({ logs, ...r }) => r), mr: saida.mr.map(({ exemplo, ...r }) => ({ ...r, zonas: r.zonas.length })) }, null, 1));
}

await principal();
