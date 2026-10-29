import { createHash } from 'node:crypto';
import { open, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { lerTlv, filhos, decodificarArquivo } from './asn1.js';
import { DIR_DADOS, TURNOS, caminhos, dirSecao, urlArquivo } from './config.js';
import { CARGO_CONSTITUCIONAL, arquivoBu, arquivoRdv, arquivoVsc, envelope } from './esquemas.js';
import { carregarAcs, verificarLacres } from './lacres.js';
import { DIA_VOTACAO, perfilLog } from './perfil-secoes.js';
import { carregarReferencia, nomeCandidato } from './referencia.js';
import { lerEntrada, listarEntradas } from './zip.js';

// Converte os arquivos binários de uma seção (BU, RDV, BU impresso, pacote de assinaturas, log) em um JSON
// legível, para leitura humana e por LLM. Fonte da verdade continua sendo o binário: o JSON traz o SHA-256 de
// cada arquivo e o resultado da verificação das assinaturas.

const CODIGO_CARGO = Object.fromEntries(Object.entries(CARGO_CONSTITUCIONAL).map(([codigo, nome]) => [nome, Number(codigo)]));
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');
const DATA_ELEICAO = { 1: '2026-10-04', 2: '2026-10-25' };
const MIN_TRECHO_TEXTO = 20;

async function lerOuNulo(caminho) {
  try {
    return await readFile(caminho);
  } catch (erro) {
    if (erro.code === 'ENOENT') return null;
    throw erro;
  }
}

/** Texto do log de um `.jez` (ZIP com `logd.dat` em ISO-8859-1). */
export async function lerLogJez(caminho) {
  const handle = await open(caminho, 'r');
  try {
    const entrada = (await listarEntradas(handle)).find((e) => e.nome === 'logd.dat');
    if (!entrada) throw new Error(`${path.basename(caminho)} sem logd.dat`);
    return (await lerEntrada(handle, entrada)).toString('latin1');
  } finally {
    await handle.close();
  }
}

/** Linhas do log como eventos. `dia` (dd/mm/aaaa) filtra o dia da votação; null traz o log inteiro. */
export function eventosLog(texto, dia) {
  const eventos = [];
  const urnas = new Set();
  for (const linha of texto.split(/\r?\n/)) {
    if (!linha) continue;
    if (dia && !linha.startsWith(dia)) continue;
    const [dataHora, nivel, urna, aplicacao, mensagem, hash] = linha.split('\t');
    const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2}:\d{2})$/.exec(dataHora ?? '');
    urnas.add(urna);
    eventos.push({ dataHora: m ? `${m[3]}-${m[2]}-${m[1]} ${m[4]}` : dataHora, nivel, aplicacao, mensagem, hash });
  }
  return { eventos, urnas: [...urnas] };
}

function resumoEventos(eventos) {
  const contar = (chave) => {
    const mapa = {};
    for (const e of eventos) mapa[e[chave]] = (mapa[e[chave]] ?? 0) + 1;
    return mapa;
  };
  const mensagens = Object.entries(contar('mensagem')).sort((a, b) => b[1] - a[1]);
  return { linhas: eventos.length, porNivel: contar('nivel'), porAplicacao: contar('aplicacao'), mensagensMaisFrequentes: Object.fromEntries(mensagens.slice(0, 60)) };
}

/**
 * Texto do BU impresso (`-imgbu.dat`/`-imgbusa.dat`): o conteúdo alterna trechos de texto e blocos binários
 * (hipótese: QR codes e comandos de impressora; formato não documentado na especificação v2).
 */
export function textoBuImpresso(conteudo) {
  const imprimivel = (b) => b === 0x0a || (b >= 0x20 && b <= 0x7e) || b >= 0xa0;
  const trechos = [];
  const binarios = [];
  for (let i = 0; i < conteudo.length; ) {
    let j = i;
    const texto = imprimivel(conteudo[i]);
    while (j < conteudo.length && imprimivel(conteudo[j]) === texto) j++;
    if (texto && j - i >= MIN_TRECHO_TEXTO) trechos.push(conteudo.toString('latin1', i, j));
    else if (!texto && j - i >= MIN_TRECHO_TEXTO) binarios.push({ posicao: i, tamanho: j - i });
    i = j;
  }
  return { texto: trechos.join('\n'), blocosBinarios: binarios };
}

function contexto(referencia, uf) {
  const siglas = new Map();
  if (referencia) for (const c of referencia.candidatos.values()) siglas.set(c.partido, c.siglaPartido);
  const nome = (eleicao, cargo, numero) => nomeCandidato(referencia, { eleicao, cargo, uf, numero });
  return { siglas, nome };
}

const codigoDoCargo = (codigoCargo) =>
  codigoCargo?.cargoConstitucional ? CODIGO_CARGO[codigoCargo.cargoConstitucional] : codigoCargo?.numeroCargoConsultaLivre;

/** Acrescenta nome do candidato e sigla do partido em cada votável do BU (in-place). */
function enriquecerBu(bu, ctx) {
  for (const porEleicao of bu.conteudo.resultadosVotacaoPorEleicao) {
    for (const rv of porEleicao.resultadosVotacao) {
      for (const tvc of rv.totaisVotosCargo) {
        const cargo = codigoDoCargo(tvc.codigoCargo);
        for (const v of tvc.votosVotaveis) {
          const id = v.identificacaoVotavel;
          if (!id) continue;
          const candidato = v.tipoVoto === 'nominal' ? ctx.nome(porEleicao.idEleicao, cargo, id.codigo) : null;
          if (candidato) v.candidato = candidato.nome;
          const sigla = candidato?.siglaPartido ?? ctx.siglas.get(id.partido);
          if (sigla) v.siglaPartido = sigla;
        }
      }
    }
  }
  return bu;
}

/** RDV em forma compacta: cada voto como texto ("nominal 13") e o total por escolha, com o nome quando houver. */
function compactarRdv(rdv, ctx) {
  const eleicoesRdv = rdv.rdv.eleicoes.eleicoesVota ?? rdv.rdv.eleicoes.eleicoesSA ?? [];
  const eleicoes = eleicoesRdv.map((e) => ({
    ...e,
    votosCargos: e.votosCargos.map((vc) => {
      const cargo = codigoDoCargo(vc.idCargo);
      const votos = vc.votos.map((v) => (v.digitacao === undefined ? v.tipoVoto : `${v.tipoVoto} ${v.digitacao}`));
      const total = {};
      for (const [i, v] of vc.votos.entries()) {
        const candidato = v.tipoVoto === 'nominal' ? ctx.nome(e.idEleicao, cargo, Number(v.digitacao)) : null;
        const chave = candidato ? `${votos[i]} (${candidato.nome})` : votos[i];
        total[chave] = (total[chave] ?? 0) + 1;
      }
      return { idCargo: vc.idCargo, quantidadeEscolhas: vc.quantidadeEscolhas, quantidadeVotos: votos.length, totalPorEscolha: total, votos };
    }),
  }));
  const tipo = rdv.rdv.eleicoes.eleicoesVota ? 'eleicoesVota' : 'eleicoesSA';
  return { ...rdv, rdv: { ...rdv.rdv, eleicoes: { [tipo]: eleicoes } } };
}

function decodificarSeguro(fn) {
  try {
    return fn();
  } catch (erro) {
    return { _erroDecodificacao: erro.message };
  }
}

/** Converte um pacote (diretório de hash) da seção. */
async function exportarPacote({ turno, pleito, secao, dirHash, hashAux, ctx, acs, modoLog }) {
  const nomes = (await readdir(dirHash)).filter((n) => /^o\d{5}[a-z]{2}\d{13}-[a-z]+\.[a-z]+$/.test(n)).sort();
  const buffers = new Map();
  for (const n of nomes) buffers.set(n, await readFile(path.join(dirHash, n)));
  const por = (sufixos) => nomes.find((n) => sufixos.some((s) => n.endsWith(s)));

  const pacote = {
    hash: hashAux.hash,
    statusTSE: hashAux.st ?? null,
    recebidoTSE: hashAux.dr ? `${hashAux.dr} ${hashAux.hr}` : null,
    arquivos: Object.fromEntries(nomes.map((n) => [n, { bytes: buffers.get(n).length, sha256: sha256(buffers.get(n)), url: urlArquivo(pleito, secao, hashAux.hash, n) }])),
  };

  const nomeBu = por(['-bu.dat', '-busa.dat']);
  if (nomeBu) pacote.bu = decodificarSeguro(() => enriquecerBu(decodificarArquivo(arquivoBu, buffers.get(nomeBu)), ctx));
  const nomeRdv = por(['-rdv.dat']);
  if (nomeRdv) pacote.rdv = decodificarSeguro(() => compactarRdv(decodificarArquivo(arquivoRdv, buffers.get(nomeRdv)), ctx));
  const nomeImg = por(['-imgbu.dat', '-imgbusa.dat']);
  if (nomeImg) {
    pacote.buImpresso = decodificarSeguro(() => {
      const env = decodificarArquivo(envelope({ k: 'oct' }), buffers.get(nomeImg));
      const conteudo = filhos(lerTlv(buffers.get(nomeImg), 0)).at(-1).valor;
      return { ...env, conteudo: textoBuImpresso(conteudo) };
    });
  }
  const nomeVsc = por(['-vota.vsc', '-sa.vsc']);
  if (nomeVsc) {
    pacote.assinaturas = decodificarSeguro(() => decodificarArquivo(arquivoVsc, buffers.get(nomeVsc)));
    try {
      const arquivos = new Map([...buffers].filter(([n]) => n !== nomeVsc));
      const { urna, resultados } = verificarLacres({ vsc: buffers.get(nomeVsc), arquivos, acs, dataEleicao: new Date(DATA_ELEICAO[turno]) });
      pacote.integridade = { urna, conferencias: resultados.length, falhas: resultados.filter((r) => !r.ok).length, resultados };
    } catch (erro) {
      pacote.integridade = { _erroVerificacao: erro.message };
    }
  }
  const nomeLog = por(['-log.jez', '-logsa.jez']);
  if (nomeLog && modoLog !== 'nao') {
    pacote.log = await (async () => {
      try {
        const texto = await lerLogJez(path.join(dirHash, nomeLog));
        const dia = DIA_VOTACAO[turno];
        const { eventos, urnas } = eventosLog(texto, modoLog === 'completo' ? null : dia);
        return {
          observacao: 'Horários no relógio local da urna (fuso da UF), não de Brasília. O log é cumulativo (carga, testes, 1º e 2º turno).',
          recorte: modoLog === 'completo' ? 'log inteiro' : `somente ${dia}`,
          numeroInternoUrna: urnas,
          metricasDoDia: perfilLog(texto, dia),
          resumo: resumoEventos(eventos),
          eventos,
        };
      } catch (erro) {
        return { _erroLeitura: erro.message };
      }
    })();
  }
  return pacote;
}

/** Converte uma seção inteira (todos os pacotes listados no aux.json oficial). */
export async function exportarSecao({ turno, secao, referencia = null, acs = [], modoLog = 'dia', dirDados = DIR_DADOS }) {
  const { pleito } = TURNOS[turno];
  const dir = dirSecao(caminhos(turno, dirDados).urnas, secao);
  const aux = JSON.parse((await lerOuNulo(path.join(dir, 'aux.json')))?.toString('utf8') ?? 'null');
  const municipio = referencia?.municipios.get(secao.municipio) ?? null;
  const ctx = contexto(referencia, secao.uf);
  const hashes = (aux?.hashes ?? []).filter((h) => h.hash && h.hash !== '0');
  const pacotes = [];
  for (const h of hashes) {
    const dirHash = path.join(dir, h.hash);
    try {
      await readdir(dirHash);
    } catch {
      pacotes.push({ hash: h.hash, statusTSE: h.st ?? null, _ausenteNoDisco: true });
      continue;
    }
    pacotes.push(await exportarPacote({ turno, pleito, secao, dirHash, hashAux: h, ctx, acs, modoLog }));
  }
  return {
    formato: 'auditoria-2026/secao-v1',
    geradoEm: new Date().toISOString(),
    turno: Number(turno),
    pleito: Number(pleito),
    secao: {
      uf: secao.uf, municipio: secao.municipio, nomeMunicipio: municipio?.nome ?? null, codigoIbge: municipio?.ibge ?? null,
      zona: secao.zona, secao: secao.secao,
    },
    statusTSE: aux?.st ?? null,
    avisos: [
      ...(referencia ? [] : ['Referência de candidatos/municípios ausente: rode `node src/referencia.js --turno N`.']),
      ...(aux ? [] : ['aux.json ausente: rode a etapa aux da coleta.']),
      ...(aux && hashes.length === 0 ? [`Seção sem arquivo oficial (status do TSE: ${aux.st}).`] : []),
    ],
    pacotes,
  };
}

/** Seções do disco que casam com o filtro (uf obrigatória; município, zona e seção opcionais). */
export async function listarSecoes(turno, { uf, municipio, zona, secao }, dirDados = DIR_DADOS) {
  const base = path.join(caminhos(turno, dirDados).urnas, uf);
  const sub = async (dir) => (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  const lista = [];
  for (const m of municipio ? [municipio] : await sub(base)) {
    for (const z of zona ? [zona] : await sub(path.join(base, m))) {
      for (const s of secao ? [secao] : await sub(path.join(base, m, z))) lista.push({ uf, municipio: m, zona: z, secao: s });
    }
  }
  return lista;
}

async function principal() {
  const { values } = parseArgs({
    options: {
      turno: { type: 'string', default: '2' }, uf: { type: 'string' }, municipio: { type: 'string' }, zona: { type: 'string' },
      secao: { type: 'string' }, log: { type: 'string', default: 'dia' }, saida: { type: 'string' }, stdout: { type: 'boolean' },
      ajuda: { type: 'boolean', short: 'h' },
    },
  });
  if (values.ajuda || !values.uf) {
    console.log(`Converte arquivos de urna em JSON legível (um arquivo por seção).

Uso: node src/exportar.js --uf ac [--municipio 01007] [--zona 0009] [--secao 0003] [opções]

  --turno <1|2>               turno (padrão: 2)
  --log <dia|completo|nao>    eventos do log: só o dia da votação (padrão), o log inteiro, ou nenhum
  --saida <dir>               destino (padrão: data/parsed/<t>t/json/<uf>/<municipio>/<zona>-<secao>.json)
  --stdout                    imprime o JSON (uma seção) em vez de gravar arquivo`);
    process.exitCode = values.ajuda ? 0 : 2;
    return;
  }
  if (!TURNOS[values.turno]) throw new Error(`--turno inválido: ${values.turno}`);
  if (!['dia', 'completo', 'nao'].includes(values.log)) throw new Error(`--log inválido: ${values.log}`);
  const { salvarAtomico } = await import('./http.js');
  const pad = (v, n) => (v ? v.padStart(n, '0') : v);
  const filtro = { uf: values.uf.toLowerCase(), municipio: pad(values.municipio, 5), zona: pad(values.zona, 4), secao: pad(values.secao, 4) };
  const secoes = await listarSecoes(values.turno, filtro);
  const referencia = await carregarReferencia(values.turno);
  const acs = await carregarAcs();
  const saida = path.resolve(values.saida ?? path.join(DIR_DADOS, 'parsed', `${values.turno}t`, 'json'));
  let comErro = 0;
  for (const s of secoes) {
    const json = await exportarSecao({ turno: values.turno, secao: s, referencia, acs, modoLog: values.log });
    const texto = JSON.stringify(json, null, 2);
    if (/_erro/.test(texto)) comErro++;
    if (values.stdout) {
      process.stdout.write(`${texto}\n`);
    } else {
      await salvarAtomico(path.join(saida, s.uf, s.municipio, `${s.zona}-${s.secao}.json`), texto);
    }
  }
  if (!values.stdout) console.log(`${secoes.length} seção(ões) exportada(s) para ${saida}${comErro ? ` · ${comErro} com erro de leitura (campo _erro*)` : ''}`);
  process.exitCode = comErro ? 1 : 0;
}

if (import.meta.filename === path.resolve(process.argv[1] ?? '')) await principal();
