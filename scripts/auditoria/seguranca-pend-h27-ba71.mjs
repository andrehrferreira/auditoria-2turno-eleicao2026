// Engenheiro de segurança, doc 10, item 2: as 2 urnas da BA zona 71 que votaram no 2º turno e não aparecem em nenhuma
// CESP (grupo D do doc 09 e do parecer 38): BA 33774/0071/0150 (urna 01843885) e BA 39144/0071/0170 (urna 01844077).
// Rastreia essas urnas e as urnas do 1º turno das mesmas seções (01780000 e 01771106):
//   1. em TODAS as listas de correspondência baixadas (data/raw/dadosabertos/correspondencias/: 2022-1t e 2024-1t só
//      CEFT; 2026-1t e 2026-2t, CESP da véspera, CESP do dia e CEFT), todas as UFs, colunas de urna esperada e
//      efetivada; a busca é por texto na linha inteira e depois conferida coluna a coluna;
//   2. nos BUs dos dois turnos (cópia de leitura);
//   3. nos pacotes dos dois turnos: assinante (certificado) e urnas que aparecem nos diários
//      (seguranca-h25/<t>t-padrao-dirs.jsonl, <t>t-certs.jsonl) e no catálogo de cargas
//      (matematico-forense/h23-sessoes-<t>t.jsonl, que inclui os diários aninhados);
//   4. na faixa pública de número interno por modelo (modelo_urna/modelourna_numerointerno.zip);
//   5. no diário bruto das 2 seções, nos dois turnos: histórico de cargas e de ligações, preparação, votação e
//      encerramento, com a hora de cada evento (sem título de eleitor ou servidor).
// Uso: node scripts/auditoria/seguranca-pend-h27-ba71.mjs
// Saída: data/parsed/auditoria/engenheiro-seguranca-urna/pendencias/h27-ba71.json
import { createReadStream } from 'node:fs';
import { mkdir, open, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { createInflateRaw } from 'node:zlib';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { listarEntradas } from '../../src/zip.js';
import { separar } from './seguranca-h27-lib.mjs';
import { SAIDA, diarios, linhas, pastaDoPacote } from './seguranca-pend-lib.mjs';

const SECOES = { 'ba/33774/0071/0150': { urna2t: 1843885, urna1t: 1780000 }, 'ba/39144/0071/0170': { urna2t: 1844077, urna1t: 1771106 } };
const URNAS = [1843885, 1844077, 1780000, 1771106];
const RE_URNAS = new RegExp(URNAS.map(String).join('|'));
const DIR_CORRESP = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'correspondencias');
const A = path.join(DIR_DADOS, 'parsed', 'auditoria');

/** Linhas de cada CSV do zip que contêm algum dos números (filtro por texto antes de separar as colunas). */
async function* linhasComUrna(arquivoZip) {
  const h = await open(arquivoZip, 'r');
  let entradas; const inicios = new Map();
  try {
    entradas = (await listarEntradas(h)).filter((e) => /\.csv$/i.test(e.nome));
    for (const e of entradas) {
      const cab = Buffer.alloc(30);
      await h.read(cab, 0, 30, e.offsetLocal);
      inicios.set(e.nome, e.offsetLocal + 30 + cab.readUInt16LE(26) + cab.readUInt16LE(28));
    }
  } finally { await h.close(); }
  for (const e of entradas) {
    const ini = inicios.get(e.nome);
    let f = createReadStream(arquivoZip, { start: ini, end: ini + e.tamanhoComprimido - 1 });
    if (e.metodo === 8) f = f.pipe(createInflateRaw());
    let col = null; let n = 0;
    for await (const l of createInterface({ input: f.setEncoding('latin1'), crlfDelay: Infinity })) {
      if (!l) continue;
      if (!col) { col = separar(l); continue; }
      n++;
      if (!RE_URNAS.test(l)) continue;
      const c = separar(l); const o = { _arquivo: e.nome };
      for (let i = 0; i < col.length; i++) o[col[i]] = c[i];
      yield o;
    }
    yield { _fimArquivo: e.nome, linhas: n };
  }
}

async function* jsonl(arq) {
  for await (const l of createInterface({ input: createReadStream(arq), crlfDelay: Infinity })) if (l) yield JSON.parse(l);
}

const res = { urnas: URNAS, listas: { arquivos: 0, linhasLidas: 0, porPasta: {}, achados: [] }, bu: [], pacotes: [], certificados: [], cargas: [], faixaModelo: [], diarios: {} };

// 1. Correspondências
for (const pasta of (await readdir(DIR_CORRESP, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
  const P = (res.listas.porPasta[pasta] = { arquivos: 0, linhas: 0, achados: 0 });
  for (const nome of (await readdir(path.join(DIR_CORRESP, pasta))).filter((n) => n.endsWith('.zip')).sort()) {
    P.arquivos++; res.listas.arquivos++;
    for await (const r of linhasComUrna(path.join(DIR_CORRESP, pasta, nome))) {
      if (r._fimArquivo) { P.linhas += r.linhas; res.listas.linhasLidas += r.linhas; continue; }
      const papeis = [];
      for (const [c, papel] of [['NR_URNA_ESPERADA', 'esperada'], ['NR_URNA_EFETIVADA', 'efetivada']]) if (URNAS.includes(Number(r[c]))) papeis.push(`${papel} ${Number(r[c])}`);
      if (!papeis.length) continue; // o número apareceu em outra coluna (código de carga, por exemplo)
      P.achados++;
      res.listas.achados.push({ pasta, zip: nome, csv: r._arquivo, papeis, uf: r.SG_UF, municipio: r.CD_MUNICIPIO, zona: r.NR_ZONA, secao: r.NR_SECAO ?? null,
        cargaEsperada: r.CD_CARGA_URNA_ESPERADA, dataCargaEsperada: r.DT_CARGA_URNA_ESPERADA, recbtoEsperada: r.DT_RECBTO_URNA_ESPERADA ?? r.DT_RECO_URNA_ESPERADA ?? null,
        urnaEsperada: r.NR_URNA_ESPERADA, urnaEfetivada: r.NR_URNA_EFETIVADA ?? null, cargaEfetivada: r.CD_CARGA_URNA_EFETIVADA ?? null,
        dataCargaEfetivada: r.DT_CARGA_URNA_EFETIVADA ?? null, recbtoEfetivada: r.DT_RECBTO_URNA_EFETIVADA ?? r.DT_RECO_URNA_EFETIVADA ?? null,
        origem: r.CD_ORIGEM_VOTO ?? null, divergencia: r.TP_DIVERGENCIA ?? r.DS_DIVERGENCIA ?? null, geracao: `${r.DT_GERACAO} ${r.HH_GERACAO}`, ano: r.ANO_ELEICAO ?? null });
    }
  }
}
// 2. BUs
const { db, fonte } = await abrirLeitura();
res.fonte = fonte;
for (const r of db.prepare(`SELECT turno, uf, municipio, zona, secao, local, tipo_urna, modelo_urna, numero_interno_urna, versao_software, data_hora_carga,
  codigo_carga, abertura, encerramento, emissao, comparecimento, recebido_tse FROM secao WHERE numero_interno_urna IN (${URNAS.join(',')})`).iterate()) res.bu.push(r);
db.close();

// 3. Pacotes, certificados, cargas
for (const t of [1, 2]) {
  for await (const o of jsonl(path.join(A, 'seguranca-h25', `${t}t-padrao-dirs.jsonl`))) {
    const lu = (o.logUrnas ?? []).map(Number);
    if (URNAS.includes(o.idHW) || URNAS.includes(o.numeroInternoUrna) || lu.some((u) => URNAS.includes(u))) {
      res.pacotes.push({ turno: t, k: `${o.uf}/${o.mun}/${o.zona}/${o.secao}`, assinante: o.idHW, urnaBU: o.numeroInternoUrna, modelo: o.modelo, logUrnas: o.logUrnas,
        logModelo: o.logModelo, logCargas: o.logCargas, logPrimeira: o.logPrimeira, falhas: o.falhas, certSha: o.certSha, molde: o.molde });
    }
  }
  for await (const o of jsonl(path.join(A, 'seguranca-h25', `${t}t-certs.jsonl`))) {
    if (URNAS.includes(o.idHW)) {
      res.certificados.push({ turno: t, k: `${o.uf}/${o.mun}/${o.zona}/${o.secao}`, sujeito: o.sujeito, emissor: o.emissor, serie: o.serie, emitidoEm: o.nb?.iso, venceEm: o.na?.iso,
        akiSerie: o.akiSerie, akiEmissor: o.akiEmissor, curva: o.curva, assinaturaAc: o.assinaturaAc, sobra: o.sobra, certSha: o.certSha });
    }
  }
  for await (const s of jsonl(path.join(A, 'matematico-forense', `h23-sessoes-${t}t.jsonl`))) {
    if (URNAS.includes(Number(s.urna))) res.cargas.push({ turno: t, urna: s.urna, codigo: s.codigo, quando: s.quando, relogio: s.relogio ?? null, ok: s.ok ?? null, fc: s.fc, fcGeracao: s.fcGeracao ?? null,
      secaoGravada: s.zona ? `${s.municipio}/${s.zona}/${s.secao}` : null, secaoInformada: s.secaoInformada ?? null, pacotes: s.pacotes.map((p) => `${p.k} (prof ${p.prof})`), primeiraLinha: s.primeiraLinha ?? null, ultimaLinha: s.ultimaLinha });
  }
}

// 4. Faixa por modelo
{
  const arq = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'modelo_urna', 'modelourna_numerointerno.zip');
  const h = await open(arq, 'r');
  const ent = (await listarEntradas(h)).filter((e) => /\.csv$/i.test(e.nome));
  const cab = Buffer.alloc(30); await h.read(cab, 0, 30, ent[0].offsetLocal); await h.close();
  const ini = ent[0].offsetLocal + 30 + cab.readUInt16LE(26) + cab.readUInt16LE(28);
  let f = createReadStream(arq, { start: ini, end: ini + ent[0].tamanhoComprimido - 1 });
  if (ent[0].metodo === 8) f = f.pipe(createInflateRaw());
  let col = null; const faixas = [];
  for await (const l of createInterface({ input: f.setEncoding('latin1'), crlfDelay: Infinity })) {
    if (!l) continue;
    const c = separar(l);
    if (!col) { col = c; res.faixaModeloColunas = col; continue; }
    const o = {}; for (let i = 0; i < col.length; i++) o[col[i]] = c[i];
    faixas.push(o);
  }
  res.faixaModeloLinhas = faixas.length;
  const ini_ = col.find((x) => /INI/i.test(x)); const fim_ = col.find((x) => /FIM|FINAL/i.test(x));
  for (const u of URNAS) {
    const hit = ini_ && fim_ ? faixas.filter((o) => Number(o[ini_]) <= u && u <= Number(o[fim_])) : faixas.filter((o) => Object.values(o).some((v) => Number(v) === u));
    res.faixaModelo.push({ urna: u, linhas: hit });
  }
}

// 5. Diários das 2 seções, nos dois turnos
const RE_EVT = /^(Urna ligada em|Iniciando aplicação|Versão da aplicação|Identificação do Modelo de Urna|Data e hora que foi digitada|Seção informada pelo operador|Identificador da mídia de carga|Mídia de carga gerada pelo computador|Data e hora da geração da mídia de carga|Município:|Zona Eleitoral:|Local de Votação:|Seção Eleitoral:|Código de carga|Urna carregada com sucesso|Modo de carga da UE|Turno da UE|Fase da UE|Serial da MV|Número de série da MR|Mídia de votação gerada pelo computador|Data e hora da geração da mídia de votação|Urna pronta para receber votos|Inicio do Encerramento|Início do procedimento de contingência|Término do processo de contingência|Urna desligada pela chave|Fechando o arquivo de Log|Iniciando aplicação|Gerando arquivo de resultado|Arquivo de resultado|Imprimindo boletim|Início de impressão de BU|Gravando|Resultado da verificação|Urna de contingência pronta|Data e hora atualizada|Ajuste de Data e Hora)/;
for (const k of Object.keys(SECOES)) {
  res.diarios[k] = {};
  for (const t of [1, 2]) {
    const pasta = await pastaDoPacote(t, k);
    const out = [];
    for (const d of await diarios(pasta)) {
      const L = linhas(d.texto);
      const votosPorDia = {};
      let primeiroVoto = null; let ultimoVoto = null;
      const ev = [];
      for (const l of L) {
        if (l.msg === 'O voto do eleitor foi computado') {
          const dia = l.dh.slice(0, 10); votosPorDia[dia] = (votosPorDia[dia] ?? 0) + 1;
          primeiroVoto ??= l.dh; ultimoVoto = l.dh;
          continue;
        }
        if (l.nivel === 'ERRO' || l.nivel === 'ALERTA' || RE_EVT.test(l.msg)) ev.push(`${l.dh} ${l.nivel} ${l.urna} ${l.app} ${l.msg.slice(0, 160)}`);
      }
      out.push({ diario: `${d.nome} (prof ${d.prof})`, linhas: L.length, primeira: L[0]?.dh, ultima: L.at(-1)?.dh, urnas: [...new Set(L.map((l) => l.urna))], votosPorDia,
        primeiroVoto, ultimoVoto, eventos: ev });
    }
    res.diarios[k][`${t}t`] = out;
  }
}

await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, 'h27-ba71.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify({ listas: { ...res.listas, achados: res.listas.achados }, bu: res.bu, pacotes: res.pacotes, certificados: res.certificados, cargas: res.cargas,
  faixaModeloColunas: res.faixaModeloColunas, faixaModelo: res.faixaModelo }, null, 1));
for (const [k, T] of Object.entries(res.diarios)) for (const [t, ds] of Object.entries(T)) for (const d of ds) console.log(`\n== ${k} ${t} ${d.diario} linhas ${d.linhas} ${d.primeira} → ${d.ultima} urnas ${d.urnas} votos ${JSON.stringify(d.votosPorDia)} 1º ${d.primeiroVoto} último ${d.ultimoVoto} eventos ${d.eventos.length}`);
