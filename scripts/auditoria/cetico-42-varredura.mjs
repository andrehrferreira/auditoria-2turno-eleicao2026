// Cético revisor, parecer 42 (H08 e H13). Leitura própria e independente de TODOS os diários de urna de um turno,
// para reproduzir docs/analysis/estatistico-eleitoral/17 e 18 sem usar estatistico-h08-varredura.mjs.
//
// Diferenças deliberadas em relação à leitura do estatístico (para servir de conferência):
// - a seção declarada ("Seção Eleitoral: NNNN") é seguida por urna dentro de cada texto, não pelo texto inteiro;
// - quando a mesma urna aparece em mais de um texto, fica a cópia com MAIS VOTOS COMPUTADOS (não a com mais linhas),
//   e se contam os "computado" das outras cópias que não estão na escolhida;
// - a via de liberação de cada voto é decidida pelas marcas desde o último "Identificador do eleitor digitado pelo
//   mesário" (não por reinício em "Aguardando digitação"); k = confirmações desde o último "Eleitor foi habilitado".
// Nada é reordenado; urnas diferentes nunca se intercalam; D só é medido dentro da mesma urna.
//
// Uso: node scripts/auditoria/cetico-42-varredura.mjs --turno 2 [--uf ac,df] [--secoes ba/39870/0133/0184,...]
// Saída: data/parsed/auditoria/cetico-revisor/42/<t>t/<uf>.jsonl (uma linha por seção) e hist.json (D por k).
// Nenhum título de eleitor ou de mesário é gravado.
import { existsSync } from 'node:fs';
import { mkdir, open, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, uf: { type: 'string' }, secoes: { type: 'string' }, saida: { type: 'string' } } });
const TURNO = values.turno;
const DIA = { 1: '04/10/2026', 2: '25/10/2026' }[TURNO];
const BASE = path.join(DIR_DADOS, 'raw', `${TURNO}t`, 'urnas');
const SAIDA = path.resolve(values.saida ?? path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '42', `${TURNO}t`));
const CAP = 3600;
const CURTO = 60; // D até este valor é guardado por seção (D|k|via)

const dirs = async (d) => (await readdir(d, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
const emMemoria = (buf) => ({ read: async (dest, off, n, pos) => ({ bytesRead: buf.copy(dest, off, pos, pos + n) }), stat: async () => ({ size: buf.length }) });

async function logsDoPacote(handle, nivel, saida) {
  for (const e of await listarEntradas(handle)) {
    if (e.nome === 'logd.dat') saida.push((await lerEntrada(handle, e)).toString('latin1'));
    else if (e.nome.endsWith('.jez') && nivel < 5) await logsDoPacote(emMemoria(await lerEntrada(handle, e)), nivel + 1, saida);
  }
  return saida;
}

const segundos = (h) => (+h.slice(0, 2)) * 3600 + (+h.slice(3, 5)) * 60 + (+h.slice(6, 8));
const histD = {}; // k → array
const somaD = (k, d) => { const a = (histD[k] ??= new Array(CAP + 1).fill(0)); a[Math.min(d, CAP)]++; };

/** Uma urna (linhas do dia desta seção, na ordem gravada) → medidas. */
function medirUrna(linhas, sec) {
  let marcas = 0; // bits: 1 bio, 2 ano, 4 dado, 8 mesário, 16 foto
  let habilitado = false, k = 0, ultimoV = null;
  const vistas = new Set();
  for (const l of linhas) {
    if (vistas.has(l)) { sec.repetidas++; continue; }
    vistas.add(l);
    const campos = l.split('\t');
    const msg = campos[4] ?? '';
    if (msg === 'Identificador do eleitor digitado pelo mesário') marcas = 0;
    else if (msg === 'Tipo de habilitação do eleitor [biométrica]') marcas |= 1;
    else if (msg.startsWith('Ano de nascimento digitado é igual ao do cadastro')) marcas |= 2;
    else if (msg === 'Dado digitado confere') marcas |= 4;
    else if (msg.startsWith('Mesário ') && msg.endsWith(' habilitou o eleitor')) marcas |= 8;
    else if (msg === 'Foto do eleitor apresentada') marcas |= 16;
    else if (msg === 'Eleitor foi habilitado') { habilitado = true; k = 0; }
    else if (msg.startsWith('Voto confirmado para [')) k++;
    else if (msg === 'O voto do eleitor foi computado') {
      const t = segundos(campos[0].slice(11, 19));
      const hora = +campos[0].slice(11, 13);
      sec.votos++;
      if (!habilitado) sec.semHabilitacao++;
      const via = marcas & 1 ? 'v1' : marcas & 2 ? 'v2' : marcas & 4 ? (marcas & 8 ? 'v3m' : 'v3s') : 'o';
      sec.vias[via]++;
      sec.hora[hora] = (sec.hora[hora] ?? 0) + 1;
      if (via === 'v2') { sec.v2hora[hora] = (sec.v2hora[hora] ?? 0) + 1; if (marcas & 16) sec.v2foto++; }
      if (via === 'v3m' || via === 'v3s') sec.v3hora[hora] = (sec.v3hora[hora] ?? 0) + 1;
      const kk = habilitado ? Math.min(k, 9) : 'x';
      if (ultimoV !== null) {
        const d = t - ultimoV;
        if (d < 0) sec.dNeg++;
        else {
          somaD(kk, d);
          sec.nk[kk] = (sec.nk[kk] ?? 0) + 1;
          if (sec.dMin === null || d < sec.dMin) { sec.dMin = d; sec.dMinK = kk; }
          if (d <= CURTO) { const c = `${d}|${kk}|${via}`; sec.curtos[c] = (sec.curtos[c] ?? 0) + 1; }
        }
      }
      ultimoV = t;
      habilitado = false; k = 0; marcas = 0;
    }
  }
}

async function lerSecao(uf, m, z, s) {
  const dirSecao = path.join(BASE, uf, m, z, s);
  const sec = { uf, municipio: m, zona: z, secao: s, pacotes: 0, textos: 0, urnas: 0, votos: 0, vias: { v1: 0, v2: 0, v3m: 0, v3s: 0, o: 0 },
    semHabilitacao: 0, dNeg: 0, dMin: null, dMinK: null, nk: {}, curtos: {}, hora: {}, v2hora: {}, v3hora: {}, v2foto: 0,
    repetidas: 0, linhasOutraSecao: 0, computadosForaDaCopia: 0 };
  const porUrna = new Map(); // urna → [cópias]
  const vistosBytes = new Set();
  for (const pac of await dirs(dirSecao)) {
    sec.pacotes++;
    const nomes = await readdir(path.join(dirSecao, pac));
    const arq = acharArquivo(nomes, 'log');
    if (!arq) continue;
    const h = await open(path.join(dirSecao, pac, arq));
    let textos;
    try { textos = await logsDoPacote(h, 0, []); } finally { await h.close(); }
    for (const texto of textos) {
      if (vistosBytes.has(texto)) continue; // pacote repetido no disco
      vistosBytes.add(texto);
      sec.textos++;
      const declarada = new Map(); // urna → seção declarada por último neste texto
      const local = new Map();
      for (const bruta of texto.split('\n')) {
        const l = bruta.endsWith('\r') ? bruta.slice(0, -1) : bruta;
        const campos = l.split('\t');
        if (campos.length < 5) continue;
        const urna = campos[2];
        if (campos[4].startsWith('Seção Eleitoral: ')) declarada.set(urna, campos[4].slice(17).trim().padStart(4, '0'));
        if (!l.startsWith(DIA)) continue;
        const dec = declarada.get(urna);
        if (dec !== undefined && dec !== s) { sec.linhasOutraSecao++; continue; }
        if (!local.has(urna)) local.set(urna, []);
        local.get(urna).push(l);
      }
      for (const [urna, ls] of local) { if (!porUrna.has(urna)) porUrna.set(urna, []); porUrna.get(urna).push(ls); }
    }
  }
  const nComp = (ls) => ls.reduce((a, l) => a + (l.endsWith('\tO voto do eleitor foi computado') || l.includes('\tO voto do eleitor foi computado\t') ? 1 : 0), 0);
  for (const copias of porUrna.values()) {
    copias.sort((a, b) => nComp(b) - nComp(a) || b.length - a.length);
    const escolhida = copias[0];
    if (copias.length > 1) {
      const conj = new Set(escolhida);
      for (const outra of copias.slice(1)) for (const l of outra) if (!conj.has(l) && l.includes('\tO voto do eleitor foi computado')) sec.computadosForaDaCopia++;
    }
    sec.urnas++;
    medirUrna(escolhida, sec);
  }
  return sec;
}

await mkdir(SAIDA, { recursive: true });
const inicio = Date.now();
if (values.secoes) {
  const linhas = [];
  for (const id of values.secoes.split(',')) linhas.push(JSON.stringify(await lerSecao(...id.split('/'))));
  await writeFile(path.join(SAIDA, 'selecao.jsonl'), `${linhas.join('\n')}\n`);
  console.log(linhas.join('\n'));
} else {
  let total = 0;
  for (const uf of values.uf ? values.uf.split(',') : UFS) {
    const alvo = path.join(SAIDA, `${uf}.jsonl`);
    if (existsSync(alvo)) { console.log(`${uf}: já feito`); continue; }
    const linhas = [];
    let erros = 0;
    for (const m of await dirs(path.join(BASE, uf))) for (const z of await dirs(path.join(BASE, uf, m))) for (const s of await dirs(path.join(BASE, uf, m, z))) {
      try { linhas.push(JSON.stringify(await lerSecao(uf, m, z, s))); } catch (e) { erros++; linhas.push(JSON.stringify({ uf, municipio: m, zona: z, secao: s, erro: e.message })); }
    }
    await writeFile(`${alvo}.tmp`, `${linhas.join('\n')}\n`);
    const { rename } = await import('node:fs/promises');
    await rename(`${alvo}.tmp`, alvo);
    await writeFile(path.join(SAIDA, `hist-${uf}.json`), JSON.stringify(histD));
    for (const k of Object.keys(histD)) delete histD[k];
    total += linhas.length;
    console.log(`${uf}: ${linhas.length} seções, ${erros} erro(s) · ${((Date.now() - inicio) / 60000).toFixed(1)} min`);
  }
  console.log(`FIM turno ${TURNO}: ${total} seções novas, ${((Date.now() - inicio) / 60000).toFixed(1)} min`);
}
