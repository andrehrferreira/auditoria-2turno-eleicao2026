// Matemático forense: invariantes que precisam dos arquivos brutos da urna (o banco não guarda hashes,
// quantidadeEscolhas nem o ciclo de cada eleitor no log). Uma passada por pacote (seção × diretório de hash):
//
//   BU   I-CADEIA  cadeia de hashes das tuplas recalculada (doc 06): cada tupla, ordemGeracaoHash = posição no cargo,
//                  último hash recalculado = ultimoHashVotosVotavel. (A assinatura fica com integridade-lacres.mjs.)
//        I-SOMA    Σ votos do cargo = quantidadeEscolhas × qtdComparecimento do tipo de cargo (majoritário/proporcional).
//   RDV  I-ESCOLHAS quantidadeEscolhas por cargo; I-RDV nº de registros do cargo = escolhas × comparecimento;
//        I-CARGOS  cargos do RDV = cargos do BU.
//   log  I-HAB     habilitações = votos computados + suspensos sem voto (+ habilitações interrompidas por reinício,
//                  contadas à parte); nenhum voto computado sem habilitação aberta.
//        I-CONF    por cargo: confirmações + nulos atribuídos por suspensão = escolhas × comparecimento do cargo.
//        I-SUSP    nulos por suspensão no log = votos "após suspensão" no RDV, por cargo.
//
// Saída: data/parsed/auditoria/matematico/<t>t/<uf>.jsonl (uma linha por pacote) e <uf>.resumo.json.
// Uso: node scripts/auditoria/matematico-brutos.mjs --turno 2 [--uf ac,es] [--procs 4] [--refazer]
import { fork } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdir, open, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { decodificarArquivo } from '../../src/asn1.js';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { CARGO_CONSTITUCIONAL, arquivoBu, arquivoRdv } from '../../src/esquemas.js';
import { emParalelo } from '../../src/http.js';
import { acharArquivo, lerBu } from '../../src/lacres.js';
import { DIA_VOTACAO } from '../../src/perfil-secoes.js';
import { hashDiretorio } from '../../src/vsc.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'matematico');
const CODIGO_CARGO = Object.fromEntries(Object.entries(CARGO_CONSTITUCIONAL).map(([n, nome]) => [nome, Number(n)]));
const codigoDoCargo = (c) => (c?.cargoConstitucional ? CODIGO_CARGO[c.cargoConstitucional] : c?.numeroCargoConsultaLivre) ?? null;
// Nome do cargo como aparece no log ("Voto confirmado para [Deputado Federal]") → código constitucional
export const CARGO_LOG = { Presidente: 1, Governador: 3, Senador: 5, 'Deputado Federal': 6, 'Deputado Estadual': 7, 'Deputado Distrital': 8, Prefeito: 11, Vereador: 13 };
// Tipos do RDV que a urna grava quando o mesário suspende o eleitor antes de ele confirmar o cargo (spec/rdv.asn1)
const TIPOS_SUSPENSAO = ['brancoAposSuspensao', 'nuloAposSuspensao', 'nuloAposSuspensaoCargoSemCandidato'];

const sha512 = (b) => createHash('sha512').update(b).digest();
const zeros = (n, largura) => String(n).padStart(largura, '0');
const subdirs = async (dir) => {
  try {
    return (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  } catch (erro) {
    if (erro.code === 'ENOENT') return [];
    throw erro;
  }
};
const lerOuNulo = async (f) => {
  try {
    return await readFile(f);
  } catch (erro) {
    if (erro.code === 'ENOENT') return null;
    throw erro;
  }
};

/** Cadeia de hashes das tuplas do BU, como src/lacres.js (README do pacote do TSE), com a contagem por tipo de falha. */
export function conferirCadeia(bu) {
  const { pleito, municipio, zona, secao, codigoCarga } = bu.cabecalho;
  const r = { eleicoes: 0, tuplas: 0, hashDivergente: 0, ordemDivergente: 0, ultimoDivergente: 0, primeiraFalha: null };
  for (const e of bu.eleicoes) {
    r.eleicoes++;
    let h = sha512(Buffer.from(`${zeros(pleito, 5)}|${zeros(e.idEleicao, 5)}|${zeros(municipio, 5)}|${zeros(zona, 4)}|${zeros(secao, 4)}|${codigoCarga}`, 'latin1'))
      .toString('hex').toUpperCase();
    for (const cargo of e.cargos) {
      cargo.votaveis.forEach((v, i) => {
        const base = `${h}|${i + 1}|${cargo.codigoCargo}|${v.tipoVoto}|${v.quantidade}`;
        h = sha512(Buffer.from(v.codigo === null ? base : `${base}|${v.codigo}|${v.partido}`, 'latin1')).toString('hex').toUpperCase();
        r.tuplas++;
        if (h !== v.hash.toString('hex').toUpperCase()) {
          r.hashDivergente++;
          r.primeiraFalha ??= { eleicao: e.idEleicao, cargo: cargo.codigoCargo, posicao: i + 1 };
        }
        if (v.ordemGeracaoHash !== i + 1) r.ordemDivergente++;
      });
    }
    if (!Buffer.from(h, 'hex').equals(e.ultimoHash)) r.ultimoDivergente++;
  }
  return r;
}

/** Comparecimento por (eleição, cargo) e soma dos votos do BU, a partir do BU decodificado pelo esquema. */
function cargosBu(buDec) {
  const cargos = [];
  for (const e of buDec.resultadosVotacaoPorEleicao) {
    for (const rv of e.resultadosVotacao) {
      for (const tvc of rv.totaisVotosCargo) {
        cargos.push({
          e: e.idEleicao, c: codigoDoCargo(tvc.codigoCargo), tipo: rv.tipoCargo, comp: rv.qtdComparecimento,
          soma: tvc.votosVotaveis.reduce((s, v) => s + v.quantidadeVotos, 0),
        });
      }
    }
  }
  return cargos;
}

function cargosRdv(rdvDec) {
  const cargos = [];
  for (const e of rdvDec.rdv.eleicoes.eleicoesVota ?? rdvDec.rdv.eleicoes.eleicoesSA ?? []) {
    for (const vc of e.votosCargos) {
      const tipos = {};
      for (const v of vc.votos) tipos[v.tipoVoto] = (tipos[v.tipoVoto] ?? 0) + 1;
      cargos.push({ e: e.idEleicao, c: codigoDoCargo(vc.idCargo), escolhas: vc.quantidadeEscolhas, registros: vc.votos.length, tipos });
    }
  }
  return cargos;
}

// ---- log ----
const handleEmMemoria = (buffer) => ({
  read: async (destino, deslocamento, tamanho, posicao) => ({ bytesRead: buffer.copy(destino, deslocamento, posicao, posicao + tamanho) }),
  stat: async () => ({ size: buffer.length }),
});

/** Textos dos logd.dat do pacote, um por urna (contingência traz o log da urna original como .jez aninhado). */
async function textosDeLog(handle, profundidade = 0) {
  const textos = [];
  for (const entrada of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, entrada);
    if (entrada.nome === 'logd.dat') textos.push(dados.toString('latin1'));
    else if (entrada.nome.endsWith('.jez') && profundidade < 3) textos.push(...(await textosDeLog(handleEmMemoria(dados), profundidade + 1)));
  }
  return textos;
}

/**
 * Ciclo do eleitor no log do dia (cada urna separadamente; os contadores somam). Uma habilitação abre o ciclo; fecham
 * "O voto do eleitor foi computado" e "Eleitor foi suspenso e não confirmou nenhum voto". Reinício da urna, nova
 * aplicação ou encerramento com ciclo aberto = habilitação interrompida.
 */
export function cicloLog(texto, dia, c) {
  let aberto = false;
  let conf = {};
  let nul = {};
  const somar = (destino, origem) => {
    for (const [k, n] of Object.entries(origem)) destino[k] = (destino[k] ?? 0) + n;
  };
  // Confirmações e nulos por suspensão só contam em ciclo que terminou em voto computado; os de ciclo interrompido
  // (urna desligada com o eleitor na cabine) são descartados pela urna e ficam em confirmadosDescartados.
  const fechar = (computado) => {
    if (computado) {
      somar(c.confirmados, conf);
      somar(c.nulosSuspensao, nul);
    } else {
      somar(c.confirmadosDescartados, conf);
      somar(c.confirmadosDescartados, nul);
    }
    conf = {};
    nul = {};
    aberto = false;
  };
  for (const linha of texto.split('\n')) {
    if (!linha.startsWith(dia)) continue;
    const m = linha.split('\t')[4] ?? '';
    if (m === 'Eleitor foi habilitado') {
      if (aberto) {
        c.habilitacaoSemDesfecho++;
        fechar(false);
      }
      aberto = true;
      c.habilitados++;
    } else if (m === 'O voto do eleitor foi computado') {
      c.computados++;
      if (!aberto) c.computadoSemHabilitacao++;
      fechar(true);
    } else if (m === 'Eleitor foi suspenso e não confirmou nenhum voto') {
      c.suspensoSemVoto++;
      if (!aberto) c.suspensoSemHabilitacao++;
      fechar(false);
    } else if (m === 'Aguardando digitação do identificador do eleitor') {
      if (aberto) {
        c.habilitacaoSemDesfecho++;
        fechar(false);
      }
    } else if (m.startsWith('Urna ligada em') || m.startsWith('Iniciando aplicação') || m.startsWith('Inicio do Encerramento') || m === 'Votação suspensa') {
      if (m === 'Votação suspensa') c.votacaoSuspensa++;
      if (aberto) {
        c.interrompidas++;
        fechar(false);
      }
    } else if (m.startsWith('Voto confirmado para [')) {
      const cargo = CARGO_LOG[m.slice(22, -1)] ?? m.slice(22, -1);
      conf[cargo] = (conf[cargo] ?? 0) + 1;
      if (!aberto) c.confirmacaoForaDeCiclo++;
    } else if (m.startsWith('Atribuido voto nulo por suspensão [')) {
      const cargo = CARGO_LOG[m.slice(35, -1)] ?? m.slice(35, -1);
      nul[cargo] = (nul[cargo] ?? 0) + 1;
    } else if (m === 'Eleitor votou parcialmente e em seguida foi suspenso') c.parcialSuspenso++;
  }
  if (aberto) {
    c.interrompidas++;
    fechar(false);
  }
}

/**
 * Linhas do dia agrupadas por urna (coluna 3), sem cópias: o pacote de contingência pode trazer o mesmo log da urna
 * original duas vezes (cópia da memória interna "MI" e da mídia externa "ME"), e contar as duas dobra os votos.
 * Linhas idênticas (inclui o hash de encadeamento da última coluna) são a mesma linha. Por urna: a cópia mais longa
 * é a base, na ordem do arquivo; linhas que só estão nas outras cópias entram depois, também na ordem do arquivo.
 * Não se reordena por data/hora: o operador pode ajustar o relógio no dia (aplicação ADH, "Ajuste de Data e Hora"),
 * e a hora deixa de ser monotônica (PI 12190/0063/0345, 2º turno: o relógio volta de 08:15 para 07:36).
 */
export function linhasPorUrna(textos, dia) {
  const porUrna = new Map();
  const copias = textos.map((t) => t.split('\n').filter((l) => l.startsWith(dia)).map((l) => l.replace(/\r$/, '')));
  copias.sort((a, b) => b.length - a.length);
  for (const linhas of copias) {
    for (const l of linhas) {
      const urna = l.split('\t')[2];
      let u = porUrna.get(urna);
      if (!u) porUrna.set(urna, (u = { vistas: new Set(), linhas: [] }));
      if (u.vistas.has(l)) continue;
      u.vistas.add(l);
      u.linhas.push(l);
    }
  }
  return [...porUrna.values()].map((u) => u.linhas.join('\n'));
}

async function perfilLog(caminho, dia) {
  const handle = await open(caminho);
  try {
    const textos = await textosDeLog(handle);
    const c = {
      logs: textos.length, habilitados: 0, computados: 0, suspensoSemVoto: 0, interrompidas: 0, habilitacaoSemDesfecho: 0,
      computadoSemHabilitacao: 0, suspensoSemHabilitacao: 0, confirmacaoForaDeCiclo: 0, parcialSuspenso: 0, votacaoSuspensa: 0,
      confirmados: {}, nulosSuspensao: {}, confirmadosDescartados: {},
    };
    const porUrna = linhasPorUrna(textos, dia);
    c.urnas = porUrna.length;
    c.linhasDuplicadas = textos.reduce((s, t) => s + t.split('\n').filter((l) => l.startsWith(dia)).length, 0) - porUrna.reduce((s, t) => s + t.split('\n').length, 0);
    c.votosPorUrna = [];
    for (const t of porUrna) {
      const antes = c.computados;
      cicloLog(t, dia, c);
      c.votosPorUrna.push(c.computados - antes);
    }
    return c;
  } finally {
    await handle.close();
  }
}

// ---- violações de um pacote ----
export function violacoes(pacote) {
  // RDV do Sistema de Apuração: a mesma eleição aparece uma vez por origem dos votos (cédula, RDV, BU; spec/rdv.asn1,
  // eleicoesSA). Para os invariantes, os registros do mesmo (eleição, cargo) se somam.
  const somados = new Map();
  for (const r of pacote.rdv ?? []) {
    const chave = `${r.e}|${r.c}`;
    const s = somados.get(chave) ?? { ...r, registros: 0, tipos: {} };
    s.registros += r.registros;
    for (const [t, n] of Object.entries(r.tipos)) s.tipos[t] = (s.tipos[t] ?? 0) + n;
    somados.set(chave, s);
  }
  const p = { ...pacote, rdv: pacote.rdv ? [...somados.values()] : null };
  const v = [];
  const k = p.cadeia;
  if (k && (k.hashDivergente || k.ultimoDivergente)) v.push('cadeia');
  if (k?.ordemDivergente) v.push('ordem');
  const escolhas = new Map((p.rdv ?? []).map((r) => [`${r.e}|${r.c}`, r.escolhas]));
  for (const b of p.bu ?? []) {
    const esc = escolhas.get(`${b.e}|${b.c}`);
    if (esc === undefined) {
      if (p.rdv) v.push(`cargoSemRdv:${b.e}/${b.c}`);
      if (b.soma !== b.comp) v.push(`soma:${b.e}/${b.c}`);
    } else if (b.soma !== esc * b.comp) v.push(`soma:${b.e}/${b.c}`);
  }
  const buPorCargo = new Map((p.bu ?? []).map((b) => [`${b.e}|${b.c}`, b]));
  for (const r of p.rdv ?? []) {
    const b = buPorCargo.get(`${r.e}|${r.c}`);
    if (!b) {
      if (r.registros > 0) v.push(`cargoSemBu:${r.e}/${r.c}`);
      continue;
    }
    if (r.registros !== r.escolhas * b.comp) v.push(`rdvRegistros:${r.e}/${r.c}`);
  }
  const l = p.log;
  if (l && p.origem === 'urna') {
    if (l.habilitados !== l.computados + l.suspensoSemVoto + l.interrompidas + l.habilitacaoSemDesfecho) v.push('habContabil');
    if (l.interrompidas) v.push('habInterrompida');
    if (l.habilitacaoSemDesfecho) v.push('habSemDesfecho');
    if (l.computadoSemHabilitacao) v.push('computadoSemHabilitacao');
    if (l.suspensoSemHabilitacao) v.push('suspensoSemHabilitacao');
    if (l.confirmacaoForaDeCiclo) v.push('confirmacaoForaDeCiclo');
    if (p.comparecimento !== null && l.computados !== p.comparecimento) v.push('computadosXcomparecimento');
    // por cargo (só cargos constitucionais com nome no log)
    for (const b of p.bu ?? []) {
      const esc = escolhas.get(`${b.e}|${b.c}`) ?? 1;
      const conf = l.confirmados[b.c] ?? 0;
      const nul = l.nulosSuspensao[b.c] ?? 0;
      if (conf + nul !== esc * b.comp) v.push(`conf:${b.c}`);
      const r = (p.rdv ?? []).find((x) => x.e === b.e && x.c === b.c);
      if (r) {
        const suspRdv = TIPOS_SUSPENSAO.reduce((s, t) => s + (r.tipos[t] ?? 0), 0);
        if (suspRdv !== nul) v.push(`susp:${b.c}`);
      }
    }
  }
  return v;
}

// ---- pacotes de uma seção (mesma regra de src/banco.js: aux.json manda; sem aux, nome do diretório = hash do .vsc) ----
async function pacotesDaSecao(dir) {
  const textoAux = await lerOuNulo(path.join(dir, 'aux.json'));
  let aux = null;
  try {
    aux = textoAux ? JSON.parse(textoAux.toString('utf8')) : null;
  } catch {
    aux = null;
  }
  const candidatos = aux
    ? (aux.hashes ?? []).filter((h) => h.hash && h.hash !== '0' && (h.arq ?? []).some((a) => a.nm)).map((h) => ({ hash: h.hash, st: h.st ?? null }))
    : (await subdirs(dir)).map((hash) => ({ hash, st: null }));
  const pacotes = [];
  for (const h of candidatos) {
    const dirHash = path.join(dir, h.hash);
    let nomes;
    try {
      nomes = await readdir(dirHash);
    } catch (erro) {
      if (erro.code === 'ENOENT') continue;
      throw erro;
    }
    if (!aux) {
      const nomeVsc = acharArquivo(nomes, 'vsc');
      if (!nomeVsc || hashDiretorio(await readFile(path.join(dirHash, nomeVsc))) !== h.hash) continue;
    }
    pacotes.push({ ...h, dirHash, nomes });
  }
  return pacotes;
}

async function analisarPacote(turno, s, pac) {
  const p = { ...s, hash: pac.hash, st: pac.st, origem: null, tipoUrna: null, comparecimento: null, cadeia: null, bu: null, rdv: null, log: null, erros: [] };
  const arq = (tipo) => acharArquivo(pac.nomes, tipo);
  const tentar = async (etapa, fn) => {
    try {
      return await fn();
    } catch (erro) {
      p.erros.push(`${etapa}: ${erro.message}`);
      return null;
    }
  };
  const buBytes = arq('bu') ? await readFile(path.join(pac.dirHash, arq('bu'))) : null;
  if (buBytes) {
    const bu = await tentar('bu', () => lerBu(buBytes));
    if (bu) {
      p.origem = bu.origem;
      p.tipoUrna = bu.urna.tipoUrna;
      p.comparecimento = bu.qtdEleitoresCompareceram;
      p.cadeia = await tentar('cadeia', () => conferirCadeia(bu));
    }
    p.bu = await tentar('buEsquema', () => cargosBu(decodificarArquivo(arquivoBu, buBytes).conteudo));
  }
  if (arq('rdv')) p.rdv = await tentar('rdv', async () => cargosRdv(decodificarArquivo(arquivoRdv, await readFile(path.join(pac.dirHash, arq('rdv'))))));
  if (arq('log')) p.log = await tentar('log', () => perfilLog(path.join(pac.dirHash, arq('log')), DIA_VOTACAO[turno]));
  p.violacoes = violacoes(p);
  if (!p.cadeia?.primeiraFalha) delete p.cadeia?.primeiraFalha;
  if (p.erros.length === 0) delete p.erros;
  return p;
}

async function processarUf(turno, uf, destino) {
  const base = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', uf);
  const secoes = [];
  for (const municipio of await subdirs(base)) {
    for (const zona of await subdirs(path.join(base, municipio))) {
      for (const secao of await subdirs(path.join(base, municipio, zona))) secoes.push({ uf, municipio, zona, secao });
    }
  }
  const linhas = [];
  const resumo = { turno: Number(turno), uf, secoes: secoes.length, pacotes: 0, comErro: 0, violacoes: {} };
  await emParalelo(secoes, 8, async (s) => {
    const dir = path.join(base, s.municipio, s.zona, s.secao);
    for (const pac of await pacotesDaSecao(dir)) {
      const p = await analisarPacote(turno, s, pac);
      resumo.pacotes++;
      if (p.erros) resumo.comErro++;
      for (const v of p.violacoes) {
        const tipo = v.split(':')[0];
        resumo.violacoes[tipo] = (resumo.violacoes[tipo] ?? 0) + 1;
      }
      linhas.push(JSON.stringify(p));
    }
  });
  linhas.sort();
  await mkdir(destino, { recursive: true });
  await writeFile(path.join(destino, `${uf}.jsonl`), `${linhas.join('\n')}\n`);
  await writeFile(path.join(destino, `${uf}.resumo.json`), `${JSON.stringify(resumo, null, 1)}\n`);
  return resumo;
}

async function principal() {
  const { values } = parseArgs({
    options: { turno: { type: 'string', default: '2' }, uf: { type: 'string' }, procs: { type: 'string', default: '4' }, refazer: { type: 'boolean' }, filho: { type: 'boolean' } },
  });
  const turno = values.turno;
  const destino = path.join(SAIDA, `${turno}t`);
  const ufs = values.uf ? values.uf.split(',') : UFS;
  if (values.filho) {
    process.send(await processarUf(turno, ufs[0], destino));
    return;
  }
  // Maiores primeiro, para equilibrar os processos
  const ORDEM = ['sp', 'mg', 'rj', 'ba', 'rs', 'pr', 'ce', 'pe', 'pa', 'ma', 'sc', 'go'];
  const fila = [];
  for (const uf of [...ufs].sort((a, b) => ((ORDEM.indexOf(a) + 1 || 99) - (ORDEM.indexOf(b) + 1 || 99)))) {
    const feito = await access(path.join(destino, `${uf}.resumo.json`)).then(() => true, () => false);
    if (feito && !values.refazer) console.log(`${uf}: já feito`);
    else fila.push(uf);
  }
  const rodar = async () => {
    for (let uf = fila.shift(); uf; uf = fila.shift()) {
      const inicio = Date.now();
      const r = await new Promise((resolve) => {
        const filho = fork(import.meta.filename, ['--filho', '--turno', turno, '--uf', uf]);
        let resultado = null;
        filho.on('message', (m) => { resultado = m; });
        filho.on('exit', (codigo) => resolve(codigo === 0 && resultado ? resultado : { uf, erro: `código ${codigo}` }));
      });
      console.log(`${turno}t ${uf}: ${r.erro ?? `${r.pacotes} pacotes, ${r.comErro} com erro, violações ${JSON.stringify(r.violacoes)}`} (${((Date.now() - inicio) / 1000).toFixed(0)} s)`);
    }
  };
  await Promise.all(Array.from({ length: Number(values.procs) }, rodar));
}

if (import.meta.filename === path.resolve(process.argv[1] ?? '')) await principal();
