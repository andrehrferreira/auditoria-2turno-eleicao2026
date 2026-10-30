// Estatístico eleitoral (H08 e H13, planos em docs/analysis/estatistico-eleitoral/15 e 16): leitura própria de
// TODOS os diários de urna de um turno, ciclo a ciclo de eleitor, sem lerLogs/perfil-secoes.
//
// Fluxo: cada logd.dat do pacote (inclusive .jez aninhados de contingência) é lido separado; dentro dele as linhas do
// dia são separadas pela urna (3ª coluna) e só entram as da seção declarada por último ("Seção Eleitoral: NNNN").
// A mesma urna em mais de um texto (cópias MI/ME) vira um fluxo só: fica a cópia com mais linhas do dia, e as linhas
// das outras cópias que não estão nela são contadas. Linha idêntica repetida no fluxo conta uma vez. Nada é
// reordenado por hora e urnas diferentes nunca se intercalam.
//
// Ciclo: I = "Identificador do eleitor digitado pelo mesário" (último antes da habilitação), H = "Eleitor foi
// habilitado", C1..Ck = "Voto confirmado para [cargo]", V = "O voto do eleitor foi computado".
//   A = H − I, B = V − H, C = V − I (por k), D = V − V anterior do fluxo (estrato: k do segundo eleitor).
// Via de liberação de cada voto (mesma prioridade de perfilLog): digital > ano de nascimento > dado pessoal com
// mesário associado (V3m) > dado pessoal sem mesário (V3s) > outra.
//
// Uso: node scripts/auditoria/estatistico-h08-varredura.mjs --turno 2 [--uf ac,df] [--paralelo 3] [--refazer]
//      node scripts/auditoria/estatistico-h08-varredura.mjs --turno 2 --secoes ba/39870/0133/0184,es/... --saida <dir>
// Saída (por parte de até 4.000 seções): data/parsed/auditoria/estatistico/h08/<t>t/
//   <uf>-<p>.secoes.jsonl  uma linha por seção (vias, mínimos, fluxos com posição na sequência binária)
//   <uf>-<p>.seq.bin       por fluxo: n × uint16 D (65535 = negativo) seguido de n × uint8 k (255 = voto sem ciclo)
//   <uf>-<p>.hist.json     histogramas A, B, C, D por k e passos por cargo
// O diário traz o título do mesário: nenhum título é gravado na saída (só a contagem de liberações com mesário).
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const DIAS = { 1: '04/10/2026', 2: '25/10/2026' };
const TAM_PARTE = 4000;
const CAP_D = 3600;
const CAP_ABC = 1200;
const CAP_PASSO = 600;
const sub = async (d) => (await readdir(d, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
const memoria = (buf) => ({ read: async (d, o, n, p) => ({ bytesRead: buf.copy(d, o, p, p + n) }), stat: async () => ({ size: buf.length }) });

export async function textos(handle, prof = 0) {
  const out = [];
  for (const e of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, e);
    if (e.nome === 'logd.dat') out.push(dados.toString('latin1'));
    else if (e.nome.endsWith('.jez') && prof < 4) out.push(...(await textos(memoria(dados), prof + 1)));
  }
  return out;
}

const seg = (l) => Number(l.slice(11, 13)) * 3600 + Number(l.slice(14, 16)) * 60 + Number(l.slice(17, 19));
const SECAO = /\tSeção Eleitoral: (\d+)\t/;
const MESARIO_HABILITOU = /^Mesário \d+ habilitou o eleitor/;

function novoHist() {
  return { A: {}, B: {}, C: {}, D: {}, passos: {}, tiposHabilitacao: {}, confirmacoesPorCiclo: {} };
}
const somaHist = (h, nome, k, v, cap) => {
  const arr = (h[nome][k] ??= new Array(cap + 1).fill(0));
  arr[Math.max(0, Math.min(v, cap))]++;
};

/** Separa as linhas do dia de um texto por urna, só da seção `secao`. */
export function fluxosDoTexto(texto, dia, secao, outras) {
  const porUrna = new Map();
  let declarada = null;
  for (const linha of texto.split('\n')) {
    if (linha.length < 20) continue;
    if (linha.includes('Seção Eleitoral: ')) {
      const m = SECAO.exec(linha);
      if (m) declarada = m[1].padStart(4, '0');
    }
    if (!linha.startsWith(dia)) continue;
    if (declarada !== null && declarada !== secao) {
      outras.n++;
      continue;
    }
    const t1 = linha.indexOf('\t');
    const t2 = linha.indexOf('\t', t1 + 1);
    const t3 = linha.indexOf('\t', t2 + 1);
    const urna = linha.slice(t2 + 1, t3);
    let arr = porUrna.get(urna);
    if (!arr) porUrna.set(urna, (arr = []));
    arr.push(linha.endsWith('\r') ? linha.slice(0, -1) : linha);
  }
  return porUrna;
}

/** Processa um fluxo (linhas de uma urna, na ordem gravada). */
function processarFluxo(linhas, hist, sec) {
  const vistas = new Set();
  let I = null, Iciclo = null, H = null, confs = [], marcas = { bio: false, ano: false, dado: false, mes: false };
  let prevV = null, primeiroV = null;
  const Ds = [], Ks = [];
  const f = { votos: 0, duplicadas: 0, semCiclo: 0, dNeg: 0, dMin: null, abandonos: 0 };
  const zera = () => { marcas = { bio: false, ano: false, dado: false, mes: false }; };
  for (const l of linhas) {
    if (vistas.has(l)) { f.duplicadas++; continue; }
    vistas.add(l);
    const c = l.split('\t');
    const m = c[4] ?? '';
    const t = seg(l);
    if (m === 'Identificador do eleitor digitado pelo mesário') { I = t; zera(); }
    else if (m === 'Aguardando digitação do identificador do eleitor') {
      if (H !== null) f.abandonos++;
      H = null; I = null; confs = []; zera();
    } else if (m.startsWith('Tipo de habilitação do eleitor [')) {
      hist.tiposHabilitacao[m] = (hist.tiposHabilitacao[m] ?? 0) + 1;
      if (m.includes('[biométrica]')) marcas.bio = true;
    } else if (m.startsWith('Ano de nascimento digitado é igual ao do cadastro')) marcas.ano = true;
    else if (m === 'Dado digitado confere') marcas.dado = true;
    else if (MESARIO_HABILITOU.test(m)) marcas.mes = true;
    else if (m === 'Eleitor foi habilitado') { H = t; Iciclo = I; confs = []; }
    else if (m.startsWith('Voto confirmado para [')) { if (H !== null) confs.push([t, m.slice(22, -1)]); }
    else if (m === 'O voto do eleitor foi computado') {
      f.votos++;
      let k = 255;
      if (H !== null) {
        k = confs.length;
        const kk = Math.min(k, 9);
        hist.confirmacoesPorCiclo[k] = (hist.confirmacoesPorCiclo[k] ?? 0) + 1;
        const B = t - H;
        somaHist(hist, 'B', kk, B, CAP_ABC);
        sec.minB[kk] = Math.min(sec.minB[kk] ?? Infinity, B);
        if (Iciclo !== null) {
          const A = H - Iciclo, C = t - Iciclo;
          somaHist(hist, 'A', kk, A, CAP_ABC);
          somaHist(hist, 'C', kk, C, CAP_ABC);
          sec.minA = Math.min(sec.minA ?? Infinity, A);
          sec.minC[kk] = Math.min(sec.minC[kk] ?? Infinity, C);
        } else sec.semIdentificador++;
        let anterior = H;
        for (const [tc, cargo] of confs) {
          const p = (hist.passos[cargo] ??= new Array(CAP_PASSO + 1).fill(0));
          p[Math.max(0, Math.min(tc - anterior, CAP_PASSO))]++;
          anterior = tc;
        }
        const p = (hist.passos['→computado'] ??= new Array(CAP_PASSO + 1).fill(0));
        p[Math.max(0, Math.min(t - anterior, CAP_PASSO))]++;
      } else f.semCiclo++;
      if (marcas.bio) sec.vias.v1++;
      else if (marcas.ano) sec.vias.v2++;
      else if (marcas.dado) { if (marcas.mes) sec.vias.v3m++; else sec.vias.v3s++; }
      else sec.vias.outra++;
      if (prevV !== null) {
        const D = t - prevV;
        if (D < 0) { f.dNeg++; Ds.push(65535); }
        else {
          Ds.push(Math.min(D, 65534));
          somaHist(hist, 'D', k === 255 ? 'semCiclo' : Math.min(k, 9), D, CAP_D);
          f.dMin = f.dMin === null ? D : Math.min(f.dMin, D);
          if (D <= 1) sec.lf1.push({ hora: l.slice(11, 19), D, k });
        }
        Ks.push(k);
      } else primeiroV = t;
      prevV = t;
      H = null; I = null; Iciclo = null; confs = []; zera();
    }
  }
  return { f, Ds, Ks, primeiroV };
}

async function processarSecao(dirSecao, turno, id, hist, saidaBin) {
  const [uf, municipio, zona, secao] = id.split('/');
  const sec = {
    uf, municipio, zona, secao, pacotes: 0, textos: 0, linhasOutraSecao: 0, linhasForaDaCopia: 0, votos: 0,
    vias: { v1: 0, v2: 0, v3m: 0, v3s: 0, outra: 0 }, semIdentificador: 0, minA: null, minB: {}, minC: {}, lf1: [], fluxos: [],
  };
  // Pacotes repetidos no disco (mesmo pacote baixado em dois diretórios) e cópias MI/ME: a mesma urna vira um fluxo só.
  const pacotes = await sub(dirSecao);
  sec.pacotes = pacotes.length;
  const hashesLog = new Set();
  const outras = { n: 0 };
  const copias = new Map(); // urna → lista de cópias (linhas)
  for (const hash of pacotes) {
    const dir = path.join(dirSecao, hash);
    const nomes = await readdir(dir);
    const log = acharArquivo(nomes, 'log');
    if (!log) continue;
    const bytes = await readFile(path.join(dir, log));
    const h = createHash('sha256').update(bytes).digest('hex');
    if (hashesLog.has(h)) continue;
    hashesLog.add(h);
    const ts = await textos(memoria(bytes));
    sec.textos += ts.length;
    for (const t of ts) {
      for (const [urna, linhas] of fluxosDoTexto(t, DIAS[turno], secao, outras)) {
        if (!copias.has(urna)) copias.set(urna, []);
        copias.get(urna).push(linhas);
      }
    }
  }
  sec.logsDistintos = hashesLog.size;
  sec.linhasOutraSecao = outras.n;
  for (const [urna, lista] of copias) {
    lista.sort((a, b) => b.length - a.length);
    const escolhida = lista[0];
    if (lista.length > 1) {
      const conj = new Set(escolhida);
      for (const outra of lista.slice(1)) for (const l of outra) if (!conj.has(l)) sec.linhasForaDaCopia++;
    }
    const { f, Ds, Ks, primeiroV } = processarFluxo(escolhida, hist, sec);
    sec.votos += f.votos;
    const pos = saidaBin.bytes;
    if (Ds.length) {
      const b16 = Buffer.alloc(Ds.length * 2);
      for (let i = 0; i < Ds.length; i++) b16.writeUInt16LE(Ds[i], i * 2);
      saidaBin.partes.push(b16, Buffer.from(Ks));
      saidaBin.bytes += Ds.length * 3;
    }
    sec.fluxos.push({ urna, copias: lista.length, linhas: escolhida.length, ...f, primeiroV, n: Ds.length, pos });
  }
  for (const k of Object.keys(sec.minB)) if (sec.minB[k] === Infinity) delete sec.minB[k];
  return sec;
}

async function processarParte({ turno, ids, base, saida, nome }) {
  const hist = novoHist();
  const saidaBin = { partes: [], bytes: 0 };
  const linhas = [];
  const erros = [];
  for (const id of ids) {
    try {
      linhas.push(JSON.stringify(await processarSecao(path.join(base, ...id.split('/')), turno, id, hist, saidaBin)));
    } catch (e) {
      erros.push({ id, erro: e.message });
    }
  }
  // grava em nomes temporários e renomeia: parte só conta como feita com os três arquivos completos
  const alvo = (ext) => path.join(saida, `${nome}.${ext}`);
  await writeFile(`${alvo('seq.bin')}.tmp`, Buffer.concat(saidaBin.partes));
  await writeFile(`${alvo('hist.json')}.tmp`, JSON.stringify({ secoes: ids.length, erros, hist }));
  await writeFile(`${alvo('secoes.jsonl')}.tmp`, linhas.length ? `${linhas.join('\n')}\n` : '');
  for (const ext of ['seq.bin', 'hist.json', 'secoes.jsonl']) await rename(`${alvo(ext)}.tmp`, alvo(ext));
  return { nome, secoes: ids.length, erros: erros.length };
}

if (!isMainThread) {
  parentPort.on('message', async (tarefa) => {
    if (tarefa === null) process.exit(0);
    parentPort.postMessage(await processarParte(tarefa));
  });
} else if (import.meta.filename === path.resolve(process.argv[1] ?? '')) {
  const { values } = parseArgs({
    options: {
      turno: { type: 'string', default: '2' }, uf: { type: 'string' }, secoes: { type: 'string' }, saida: { type: 'string' },
      paralelo: { type: 'string', default: '3' }, refazer: { type: 'boolean' },
    },
  });
  const turno = values.turno;
  const base = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas');
  const saida = path.resolve(values.saida ?? path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h08', `${turno}t`));
  await mkdir(saida, { recursive: true });
  const tarefas = [];
  if (values.secoes) {
    tarefas.push({ turno, ids: values.secoes.split(','), base, saida, nome: 'selecao' });
  } else {
    for (const uf of values.uf ? values.uf.split(',') : UFS) {
      const ids = [];
      const bUf = path.join(base, uf);
      for (const m of await sub(bUf)) for (const z of await sub(path.join(bUf, m))) for (const s of await sub(path.join(bUf, m, z))) ids.push(`${uf}/${m}/${z}/${s}`);
      for (let i = 0, p = 0; i < ids.length; i += TAM_PARTE, p++) {
        const nome = `${uf}-${String(p).padStart(3, '0')}`;
        if (!values.refazer && existsSync(path.join(saida, `${nome}.secoes.jsonl`))) continue;
        tarefas.push({ turno, ids: ids.slice(i, i + TAM_PARTE), base, saida, nome });
      }
    }
  }
  console.log(`turno ${turno}: ${tarefas.length} parte(s) a processar, ${values.paralelo} worker(s)`);
  const inicio = Date.now();
  let feitas = 0, comErro = 0;
  await Promise.all(Array.from({ length: Math.min(Number(values.paralelo), tarefas.length) }, () => new Promise((resolve, reject) => {
    const w = new Worker(import.meta.filename);
    const proxima = () => {
      const t = tarefas.shift();
      w.postMessage(t ?? null);
      if (!t) resolve();
    };
    w.on('message', (r) => {
      feitas++;
      if (r.erros) comErro++;
      console.log(`${r.nome}: ${r.secoes} seções, ${r.erros} erro(s) · ${feitas} feitas · ${((Date.now() - inicio) / 60000).toFixed(1)} min`);
      proxima();
    });
    w.on('error', reject);
    proxima();
  })));
  console.log(`RESUMO turno ${turno}: ${feitas} parte(s), ${comErro} com erro, ${((Date.now() - inicio) / 60000).toFixed(1)} min`);
}
