// Coleta dos arquivos de urna de MG, eleição de 2022 (1º turno, pleito 406; 2º turno, pleito 407), para o teste direto do
// sinal V2 da H13 (adendo 5 do plano 16; resultado no doc 24 do estatístico). Adapta src/coleta.js sem mexer nele.
//
// Diferenças em relação à coleta de 2026 (conferidas em 30/10/2026):
//   - índice: o ciclo ele2022 saiu do resultados.tse.jus.br (cs.json, ele-c.json e aux.json respondem 404 NoSuchKey). A lista
//     oficial das seções vem do detalhe_votacao_secao_2022 (dados abertos, só _BR.csv), e a URL do zip vem do catálogo
//     oficial dadosabertos.tse.jus.br (conjunto resultados-2022-arquivos-transmitidos-para-totalizacao).
//   - sem etapa aux (não existe mais para 2022) e sem baixar arquivo por seção: o zip por UF traz tudo.
//   - sem extração para o disco: a conferência e o leitor do diário leem as entradas direto do zip (CRC-32 conferido em cada
//     leitura). Evita ~250 mil arquivos em data/raw.
//
// Etapas:
//   catalogo  1 pedido ao catálogo de dados abertos; confere que a URL do zip de MG de cada turno está lá.
//   zips      baixa os zips um de cada vez, com retomada (.part + If-Range) e pausa entre arquivos; SHA-256 no manifesto.
//   conferir  sem rede: por seção do zip, SHA-512 de cada arquivo contra o .vsc da própria seção; seções do zip contra
//             as seções de MG com comparecimento no detalhe_votacao_secao_2022 (_BR.csv, presidente).
//
// Uso: node scripts/auditoria/coleta-2022-mg.mjs [--turno 1,2] [--etapas catalogo,zips,conferir] [--pausa-s 30]
// Saídas: data/raw/2022/<t>t/zip/<zip>; manifesto em data/manifest/2022/ (zips.jsonl, catalogo.json, conferencia-<t>t.json,
//         ocorrencias.jsonl). Só o TSE é acessado, e só MG.
import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, open, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { setTimeout as esperar } from 'node:timers/promises';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { baixarArquivoGrande, baixarBuffer } from '../../src/http.js';
import { criarRegistro, formatarBytes } from '../../src/registro.js';
import { lerResumosVsc, sha512Hex } from '../../src/vsc.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';
import { dividirCsv, linhasZip, pad } from './forense-lib.mjs';

export const TURNOS_2022 = { 1: { pleito: '406', data: '02/10/2022' }, 2: { pleito: '407', data: '30/10/2022' } };
const URL_ZIPS = 'https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2022/arqurnatot';
const URL_CATALOGO = 'https://dadosabertos.tse.jus.br/api/3/action/package_show?id=resultados-2022-arquivos-transmitidos-para-totalizacao';
export const nomeZip2022 = (t) => `bu_imgbu_logjez_rdv_vscmr_2022_${t}t_MG.zip`;
export const caminhoZip2022 = (t) => path.join(DIR_DADOS, 'raw', '2022', `${t}t`, 'zip', nomeZip2022(t));
const DIR_MANIFESTO = path.join(DIR_DADOS, 'manifest', '2022');
const DETALHE = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'detalhe_votacao_secao', 'detalhe_votacao_secao_2022.zip');

// Nome das entradas em 2022 (diferente de 2026, que é o03221mg4445801030221-log.jez): o00406-4051700130027.logjez
// → pleito (5), município (5), zona (4), seção (4) e o tipo na extensão (bu, imgbu, logjez, rdv, vscmr). Não há UF no nome:
// o zip é de uma UF só. O .logjez de 2022 é um 7z (leitor-7z.mjs), não um zip.
const NOME = /^o(\d{5})-(\d{5})(\d{4})(\d{4})\.([a-z]+)$/;
export function interpretarNome2022(nome) {
  const m = NOME.exec(path.posix.basename(nome));
  return m ? { pleito: String(Number(m[1])), municipio: m[2], zona: m[3], secao: m[4], tipo: m[5] } : null;
}

/** Agrupa as entradas do zip por seção (id mg/mun/zona/seção); o resto vai para `extras`. */
export async function secoesDoZip(handle, pleito) {
  const grupos = new Map();
  const extras = [];
  for (const e of await listarEntradas(handle)) {
    const info = interpretarNome2022(e.nome);
    if (!info || info.pleito !== pleito) { extras.push(e.nome); continue; }
    const id = `mg/${info.municipio}/${info.zona}/${info.secao}`;
    if (!grupos.has(id)) grupos.set(id, []);
    grupos.get(id).push({ entrada: e, info });
  }
  return { grupos, extras };
}

async function sha256Arquivo(caminho) {
  const h = createHash('sha256');
  await pipeline(createReadStream(caminho), h);
  return h.digest('hex');
}

async function etapaCatalogo(turnos, registro) {
  const buf = await baixarBuffer(URL_CATALOGO, { timeoutMs: 120_000, tentativas: 4, esperaBaseMs: 30_000 });
  const pkg = JSON.parse(buf.toString('utf8')).result;
  const achados = {};
  for (const t of turnos) {
    const url = `${URL_ZIPS}/${nomeZip2022(t)}`;
    const r = pkg.resources.find((x) => x.url === url);
    if (!r) throw new Error(`catálogo oficial não lista ${url}`);
    achados[`${t}t`] = { nome: r.name, url: r.url, criado: r.created, hashNoCatalogo: r.hash || null };
  }
  const saida = { conjunto: pkg.name, titulo: pkg.title, recursos: pkg.resources.length, modificado: pkg.metadata_modified, consultadoEm: new Date().toISOString(), urlConsulta: URL_CATALOGO, mg: achados };
  await writeFile(path.join(DIR_MANIFESTO, 'catalogo.json'), `${JSON.stringify(saida, null, 2)}\n`);
  await registro.ocorrencia({ etapa: 'catalogo', gravidade: 'info', mg: achados });
  console.log(`[catalogo] ${pkg.name}: ${pkg.resources.length} recursos; MG ${turnos.map((t) => `${t}t`).join(' e ')} listados`);
}

async function etapaZips(turnos, registro, pausaMs) {
  let primeiro = true;
  for (const t of turnos) {
    const destino = caminhoZip2022(t);
    if (existsSync(destino)) { console.log(`[zips ${t}t] já baixado (${formatarBytes((await stat(destino)).size)})`); continue; }
    if (!primeiro) await esperar(pausaMs);
    primeiro = false;
    const url = `${URL_ZIPS}/${nomeZip2022(t)}`;
    const inicio = Date.now();
    let total = 0, recebidos = 0, ultimo = 0;
    console.log(`[zips ${t}t] ${url}`);
    const info = await baixarArquivoGrande(url, destino, {
      aoProgresso: ({ inicio: ini, total: tt, recebidos: n }) => {
        if (n === 0) { recebidos = ini; total = tt; } else recebidos += n;
        const agora = Date.now();
        if (agora - ultimo > 15_000) {
          ultimo = agora;
          const mbps = (recebidos / 1048576) / Math.max(1, (agora - inicio) / 1000);
          console.log(`[zips ${t}t] ${formatarBytes(recebidos)}/${formatarBytes(total)} (${((recebidos / total) * 100).toFixed(1)}%) ${mbps.toFixed(1)} MB/s`);
        }
      },
    });
    const segundos = (Date.now() - inicio) / 1000;
    const sha256 = await sha256Arquivo(destino);
    const rel = path.relative(DIR_DADOS, destino).split(path.sep).join('/');
    await registro.zip({ turno: t, pleito: TURNOS_2022[t].pleito, uf: 'mg', ...info, caminho: rel, sha256, segundos: Math.round(segundos) });
    console.log(`[zips ${t}t] ok ${formatarBytes(info.bytes)} em ${(segundos / 60).toFixed(1)} min · sha256 ${sha256}`);
  }
}

/** Seções de MG com presidente no detalhe_votacao_secao_2022 (_BR.csv), por turno: id → {aptos, comp}. */
export async function secoesDetalhe2022() {
  const por = { 1: new Map(), 2: new Map() };
  let idx = null;
  for await (const [, linha] of linhasZip(DETALHE, (n) => /_BR\.csv$/i.test(n))) {
    if (!idx) { const cab = dividirCsv(linha).map((c) => c.replaceAll('"', '')); idx = Object.fromEntries(cab.map((c, i) => [c, i])); continue; }
    const c = linha.split(';').map((x) => x.replaceAll('"', '').trim());
    if (c[idx.SG_UF] !== 'MG' || c[idx.CD_CARGO] !== '1') continue;
    const id = `mg/${pad(c[idx.CD_MUNICIPIO], 5)}/${pad(c[idx.NR_ZONA], 4)}/${pad(c[idx.NR_SECAO], 4)}`;
    por[c[idx.NR_TURNO]]?.set(id, { aptos: Number(c[idx.QT_APTOS]), comp: Number(c[idx.QT_COMPARECIMENTO]) });
  }
  return por;
}

async function etapaConferir(turnos, registro) {
  const detalhe = await secoesDetalhe2022();
  let tudoOk = true;
  for (const t of turnos) {
    const { pleito } = TURNOS_2022[t];
    const handle = await open(caminhoZip2022(t), 'r');
    const r = { turno: t, pleito, situacoes: {}, tiposPorSecao: {}, manifestos: {}, falhas: [] };
    try {
      const { grupos, extras } = await secoesDoZip(handle, pleito);
      r.secoesNoZip = grupos.size;
      r.extras = extras.length;
      let n = 0;
      for (const [id, itens] of grupos) {
        const chaveTipos = itens.map((i) => i.info.tipo).sort().join(',');
        r.tiposPorSecao[chaveTipos] = (r.tiposPorSecao[chaveTipos] ?? 0) + 1;
        // manifesto da urna (.vscmr) ou do Sistema de Apuração (.vscsa: seção apurada fora da urna, com busa e logsajez)
        const vscs = itens.filter((i) => ['vscmr', 'vscsa', 'vsc'].includes(i.info.tipo));
        let situacao;
        try {
          if (vscs.length !== 1) throw new Error(`${vscs.length} manifestos .vsc`);
          const vsc = await lerEntrada(handle, vscs[0].entrada);
          const resumos = lerResumosVsc(vsc);
          r.manifestos[vscs[0].info.tipo] = (r.manifestos[vscs[0].info.tipo] ?? 0) + 1;
          const erros = [];
          for (const it of itens) {
            if (it === vscs[0]) continue;
            const base = path.posix.basename(it.entrada.nome);
            const esperado = resumos.get(base);
            if (!esperado) { erros.push(`${it.info.tipo} fora do vsc`); continue; }
            if (sha512Hex(await lerEntrada(handle, it.entrada)) !== esperado) erros.push(`${it.info.tipo} SHA-512 divergente`);
          }
          const sa = vscs[0].info.tipo === 'vscsa';
          for (const tipo of sa ? ['busa', 'logsajez'] : ['bu', 'logjez']) if (!itens.some((i) => i.info.tipo === tipo)) erros.push(`sem ${tipo}`);
          situacao = erros.length ? 'incompleta' : 'completa';
          if (erros.length) r.falhas.push({ id, erros });
        } catch (e) {
          situacao = 'erro';
          r.falhas.push({ id, erros: [e.message] });
        }
        r.situacoes[situacao] = (r.situacoes[situacao] ?? 0) + 1;
        if (++n % 5000 === 0) console.log(`[conferir ${t}t] ${n}/${grupos.size}`);
      }
      const det = detalhe[t];
      const comComp = [...det].filter(([, v]) => v.comp > 0).map(([k]) => k);
      r.detalhe = { secoes: det.size, comComparecimento: comComp.length };
      r.detalheSemZip = comComp.filter((k) => !grupos.has(k));
      r.zipSemDetalhe = [...grupos.keys()].filter((k) => !det.has(k));
      r.ok = (r.situacoes.completa ?? 0) === grupos.size && r.detalheSemZip.length === 0;
    } finally {
      await handle.close();
    }
    r.conferidoEm = new Date().toISOString();
    await writeFile(path.join(DIR_MANIFESTO, `conferencia-${t}t.json`), `${JSON.stringify(r, null, 1)}\n`);
    for (const f of r.falhas) await registro.ocorrencia({ etapa: 'conferir', turno: t, gravidade: 'falha', ...f });
    console.log(`[conferir ${t}t] zip ${r.secoesNoZip} seções (${JSON.stringify(r.situacoes)}), ${r.extras} entradas extras · detalhe ${r.detalhe.secoes} seções, ${r.detalhe.comComparecimento} com comparecimento · com comparecimento sem zip ${r.detalheSemZip.length} · zip sem detalhe ${r.zipSemDetalhe.length} · tipos ${JSON.stringify(r.tiposPorSecao)}`);
    tudoOk &&= r.ok;
  }
  return tudoOk;
}

if (import.meta.filename === path.resolve(process.argv[1] ?? '')) {
  const { values } = parseArgs({ options: { turno: { type: 'string', default: '1,2' }, etapas: { type: 'string', default: 'catalogo,zips,conferir' }, 'pausa-s': { type: 'string', default: '30' } } });
  const turnos = values.turno.split(',').map(Number);
  if (turnos.some((t) => !TURNOS_2022[t])) throw new Error(`--turno inválido: ${values.turno}`);
  const etapas = values.etapas.split(',');
  await mkdir(DIR_MANIFESTO, { recursive: true });
  const registro = criarRegistro(DIR_MANIFESTO);
  let codigo = 0;
  try {
    if (etapas.includes('catalogo')) await etapaCatalogo(turnos, registro);
    if (etapas.includes('zips')) await etapaZips(turnos, registro, Number(values['pausa-s']) * 1000);
    if (etapas.includes('conferir') && !(await etapaConferir(turnos, registro))) codigo = 1;
  } finally {
    await registro.concluir();
  }
  process.exitCode = codigo;
}
