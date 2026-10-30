import { createReadStream } from 'node:fs';
import { open, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { createInflateRaw } from 'node:zlib';
import { DIR_DADOS } from '../../src/config.js';
import { listarEntradas } from '../../src/zip.js';

// Funções comuns da H27 (engenheiro de segurança, doc 09).
export const DIR_CORRESP = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'correspondencias');
export const DIR_H25 = path.join(DIR_DADOS, 'parsed', 'auditoria', 'seguranca-h25');
export const DIR_H27 = path.join(DIR_DADOS, 'parsed', 'auditoria', 'seguranca-h27');
export const DIR_INTEGRIDADE = path.join(DIR_DADOS, 'parsed', 'auditoria', 'integridade');

/** Chave de seção no formato dos pacotes: uf minúscula / município 5 dígitos / zona 4 / seção 4. */
export const chave = (uf, mun, zona, secao) =>
  `${String(uf).toLowerCase()}/${String(mun).padStart(5, '0')}/${String(zona).padStart(4, '0')}/${String(secao).padStart(4, '0')}`;
export const zonaDe = (k) => k.split('/').slice(0, 3).join('/');
export const ufDe = (k) => k.split('/')[0];

// Os campos do TSE vêm entre aspas e separados por ';'; nomes de município podem ter ';' dentro das aspas.
export function separar(linha) {
  const campos = [];
  let atual = '';
  let aspas = false;
  for (const ch of linha) {
    if (ch === '"') aspas = !aspas;
    else if (ch === ';' && !aspas) { campos.push(atual); atual = ''; }
    else atual += ch;
  }
  campos.push(atual);
  return campos;
}

/** Linhas (objetos coluna→valor) de cada CSV do zip cujo nome casa com `re`, em streaming (Latin-1). */
export async function* linhasZip(arquivoZip, re = /\.csv$/i) {
  const handle = await open(arquivoZip, 'r');
  let entradas;
  const inicios = new Map();
  try {
    entradas = (await listarEntradas(handle)).filter((e) => re.test(e.nome));
    for (const e of entradas) {
      const cab = Buffer.alloc(30);
      await handle.read(cab, 0, 30, e.offsetLocal);
      inicios.set(e.nome, e.offsetLocal + 30 + cab.readUInt16LE(26) + cab.readUInt16LE(28));
    }
  } finally {
    await handle.close();
  }
  for (const e of entradas) {
    const ini = inicios.get(e.nome);
    let fluxo = createReadStream(arquivoZip, { start: ini, end: ini + e.tamanhoComprimido - 1 });
    if (e.metodo === 8) fluxo = fluxo.pipe(createInflateRaw());
    let col = null;
    for await (const linha of createInterface({ input: fluxo.setEncoding('latin1'), crlfDelay: Infinity })) {
      if (!linha) continue;
      const c = separar(linha);
      if (!col) { col = c; continue; }
      const o = { _arquivo: e.nome };
      for (let i = 0; i < col.length; i++) o[col[i]] = c[i];
      yield o;
    }
  }
}

/** Arquivos de correspondência de uma pasta (ex.: '2026-2t'), agrupados por tipo e UF; CESP mais recente por UF. */
export async function arquivosCorresp(pasta) {
  const nomes = (await readdir(path.join(DIR_CORRESP, pasta))).filter((n) => n.endsWith('.zip'));
  const porUf = {};
  for (const n of nomes) {
    const m = /^(CESP|CEFT)_\dt_([A-Z]{2})_(\d{2})(\d{2})(\d{4})(\d{4})\.zip$/.exec(n);
    if (!m) throw new Error(`nome inesperado: ${n}`);
    const [, tipo, uf, d, mes, a, hm] = m;
    const quando = `${a}${mes}${d}${hm}`;
    (porUf[uf] ??= { CESP: [], CEFT: [] })[tipo].push({ nome: n, quando, caminho: path.join(DIR_CORRESP, pasta, n) });
  }
  for (const uf of Object.keys(porUf)) for (const t of ['CESP', 'CEFT']) porUf[uf][t].sort((x, y) => x.quando.localeCompare(y.quando));
  return porUf;
}

/** Lê um jsonl inteiro em memória (uma linha = um objeto). */
export async function lerJsonl(arquivo, fn) {
  const saida = [];
  for await (const l of createInterface({ input: createReadStream(arquivo), crlfDelay: Infinity })) {
    if (!l) continue;
    const o = JSON.parse(l);
    saida.push(fn ? fn(o) : o);
  }
  return saida;
}

/** Pacotes de um turno (saída do doc 08): só os campos que a H27 usa. */
export async function lerPacotes(t) {
  const m = new Map();
  await lerJsonl(path.join(DIR_H25, `${t}t-padrao-dirs.jsonl`), (o) => {
    const k = chave(o.uf, o.mun, o.zona, o.secao);
    if (m.has(k)) throw new Error(`seção repetida em ${t}t: ${k}`);
    m.set(k, {
      k, cert: o.certSha, assinante: o.idHW, urnaBU: o.numeroInternoUrna, tipoUrna: o.tipoUrna, origem: o.origem,
      cargaBU: o.buCarga, dataCargaBU: o.buDataCarga, comparecimento: o.comparecimento, modelo: o.modelo,
      logUrnas: (o.logUrnas ?? []).map(Number), logCargas: o.logCargas ?? [], logs: o.logs, pacoteSt: o.pacoteSt,
    });
  });
  return m;
}

/** Contador simples: soma 1 (ou n) na chave. */
export const somar = (obj, k, n = 1) => { obj[k] = (obj[k] ?? 0) + n; return obj; };

/** O BU grava o código de carga com 24 dígitos; o CSV do TSE tira os zeros à esquerda. Compara sem esses zeros. */
export const nc = (s) => String(s ?? '').replace(/^0+/, '');
/** Zona eleitoral = UF + número da zona (uma zona pode ter vários municípios; a contingência é da zona). */
export const ufZona = (k) => { const [uf, , zona] = k.split('/'); return `${uf}/${zona}`; };

/**
 * Correspondências de um turno (pasta '2026-1t' | '2026-2t'): CEFT (mais recente) em `ceft` (seção -> esperada/efetivada)
 * e as versões da CESP em ordem de geração (`versoes[i]`: csec, cargaDaUrna, papelDaUrna, cont, geracao).
 */
export async function carregarCorrespondencias(pasta) {
  const arqs = await arquivosCorresp(pasta);
  const L = { nomes: [], geracao: {}, ceft: new Map(), versoes: [] };
  for (const uf of Object.keys(arqs).sort()) {
    const { CESP, CEFT } = arqs[uf];
    L.nomes.push(CEFT.at(-1).nome, ...CESP.map((c) => c.nome));
    for await (const r of linhasZip(CEFT.at(-1).caminho)) {
      const k = chave(r.SG_UF, r.CD_MUNICIPIO, r.NR_ZONA, r.NR_SECAO);
      if (L.ceft.has(k)) throw new Error(`CEFT repetido: ${k}`);
      L.ceft.set(k, {
        urnaEsp: Number(r.NR_URNA_ESPERADA), cargaEsp: nc(r.CD_CARGA_URNA_ESPERADA), recbtoEsp: r.DT_RECBTO_URNA_ESPERADA,
        urnaEf: Number(r.NR_URNA_EFETIVADA), cargaEf: nc(r.CD_CARGA_URNA_EFETIVADA), recbtoEf: r.DT_RECBTO_URNA_EFETIVADA,
        dataCargaEf: r.DT_CARGA_URNA_EFETIVADA, origem: r.CD_ORIGEM_VOTO, dsOrigem: r.DS_ORIGEM_VOTO, div: r.TP_DIVERGENCIA,
      });
    }
    for (const [i, versao] of CESP.entries()) {
      const V = (L.versoes[i] ??= { csec: new Map(), cargaDaUrna: new Map(), papelDaUrna: new Map(), cont: 0, geracao: new Set() });
      const marcar = (urna, carga, papel) => {
        (V.cargaDaUrna.get(urna) ?? V.cargaDaUrna.set(urna, new Set()).get(urna)).add(carga);
        (V.papelDaUrna.get(urna) ?? V.papelDaUrna.set(urna, new Set()).get(urna)).add(papel);
      };
      for await (const r of linhasZip(versao.caminho)) {
        V.geracao.add(`${r.DT_GERACAO} ${r.HH_GERACAO}`);
        const urna = Number(r.NR_URNA_ESPERADA);
        const carga = nc(r.CD_CARGA_URNA_ESPERADA);
        if (r._arquivo.startsWith('csec')) {
          const k = chave(r.SG_UF, r.CD_MUNICIPIO, r.NR_ZONA, r.NR_SECAO);
          V.csec.set(k, { urna, carga, alterada: r.ST_CORRESP_ALTERADA });
          marcar(urna, carga, `secao:${k}`);
        } else {
          V.cont++;
          marcar(urna, carga, `cont:${ufZona(chave(r.SG_UF, r.CD_MUNICIPIO, r.NR_ZONA, 0))}`);
        }
      }
    }
  }
  for (const V of L.versoes) V.geracao = [...V.geracao].sort();
  return L;
}
