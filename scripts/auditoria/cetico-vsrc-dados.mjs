// Revisor cético, lente "dados e definições" do achado votos-sem-log-reconciliacao (2º turno).
// Varre os pacotes BRUTOS de todas as seções do turno (log.jez com os .jez aninhados + BU) e mede, por seção:
//   A  "computado" bruto: linhas "O voto do eleitor foi computado" do dia somadas em todos os logd.dat do pacote,
//      sem tirar cópias (é o que o perfil_log antigo e o seguranca-log-x-bu.mjs comparam com o BU);
//   B  as mesmas linhas por urna (coluna 3), com cópias idênticas (MI/ME) contadas uma vez (método do matemático);
//   C  B só com as linhas da seção do pacote (última "Seção Eleitoral: NNNN" declarada no próprio logd.dat);
//   e o ciclo do eleitor em C e em B: habilitação → confirmações → computado (completo), habilitação → confirmação
//   sem computado (interrompido com confirmação), habilitação sem confirmação interrompida, atendimento
//   identificado e interrompido antes da habilitação, computado sem habilitação.
//   I11 (matemático): por cargo, confirmações dos ciclos computados + nulos por suspensão = comparecimento do cargo.
// Universo: todas as seções do turno na cópia de leitura (secao), conferidas contra a árvore data/raw/<t>t/urnas.
// Uso: node scripts/auditoria/cetico-vsrc-dados.mjs [--turno 2] [--uf ac,ma] [--refazer] [--paralelo 12]
// Saída: data/parsed/auditoria/cetico/vsrc/<t>t/<uf>.json (resumo + seções com qualquer divergência) e resumo.json.
import { existsSync } from 'node:fs';
import { mkdir, open, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { decodificarArquivo } from '../../src/asn1.js';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { arquivoBu } from '../../src/esquemas.js';
import { emParalelo } from '../../src/http.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { values } = parseArgs({
  options: { turno: { type: 'string', default: '2' }, uf: { type: 'string' }, refazer: { type: 'boolean' }, paralelo: { type: 'string', default: '12' }, secao: { type: 'string', multiple: true } },
});
const turno = Number(values.turno);
const DIA = { 1: '04/10/2026', 2: '25/10/2026' }[turno];
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'vsrc', `${turno}t`);
const RAIZ = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas');
const CARGO_LOG = { Presidente: 'presidente', Governador: 'governador', Prefeito: 'prefeito', Senador: 'senador' };

const emMemoria = (b) => ({
  read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }),
  stat: async () => ({ size: b.length }),
});
async function textos(handle, nome = '', prof = 0) {
  const r = [];
  for (const e of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, e);
    if (e.nome === 'logd.dat') r.push({ nome: `${nome}${e.nome}`, prof, texto: dados.toString('latin1') });
    else if (e.nome.endsWith('.jez') && prof < 3) r.push(...(await textos(emMemoria(dados), `${nome}${e.nome}/`, prof + 1)));
  }
  return r;
}

const SECAO = /^Seção Eleitoral: (\d+)$/;
const INTERRUPCAO = (m) => m.startsWith('Urna ligada em') || m.startsWith('Iniciando aplicação') || m.startsWith('Inicio do Encerramento')
  || m === 'Votação suspensa' || m.startsWith('Início das operações do logd');
const FIM_ATENDIMENTO = (m) => m === 'O eleitor identificado já votou' || m.startsWith('Eleitor não encontrado') || m.startsWith('Habilitação cancelada')
  || m.startsWith('Eleitor impedido') || m === 'Eleitor já justificou';

/** Uma linha do dia → {urna, msg, linha, secao declarada no próprio logd.dat}. Cópias idênticas por urna ficam de fora. */
function linhasDoPacote(lista, secaoPacote) {
  const brutos = { computados: 0 };
  const porTexto = [];
  const copias = [];
  for (const t of lista) {
    let declarada = null;
    const dia = [];
    const info = { nome: t.nome, prof: t.prof, urnas: {}, modelo: null, secoesDeclaradas: {}, computados: 0, primeira: null, ultima: null, linhasDia: 0 };
    for (const bruta of t.texto.split('\n')) {
      const l = bruta.replace(/\r$/, '');
      const c = l.split('\t');
      const msg = c[4] ?? '';
      const m = SECAO.exec(msg);
      if (m) declarada = m[1].padStart(4, '0');
      if (!l.startsWith(DIA)) continue;
      if (msg.startsWith('Identificação do Modelo de Urna: ')) info.modelo = msg.slice(33).trim();
      if (m) info.secoesDeclaradas[declarada] = (info.secoesDeclaradas[declarada] ?? 0) + 1;
      info.urnas[c[2]] = (info.urnas[c[2]] ?? 0) + 1;
      info.linhasDia++;
      info.primeira ??= c[0];
      info.ultima = c[0];
      if (msg === 'O voto do eleitor foi computado') {
        info.computados++;
        brutos.computados++;
      }
      dia.push({ l, urna: c[2], msg, sec: declarada });
    }
    porTexto.push(info);
    copias.push(dia);
  }
  // Por urna, a cópia mais longa é a base (ordem do arquivo); linhas só das outras cópias entram depois (como o matemático)
  copias.sort((a, b) => b.length - a.length);
  const porUrna = new Map();
  for (const dia of copias) {
    for (const x of dia) {
      let u = porUrna.get(x.urna);
      if (!u) porUrna.set(x.urna, (u = { vistas: new Set(), linhas: [] }));
      if (u.vistas.has(x.l)) continue;
      u.vistas.add(x.l);
      u.linhas.push(x);
    }
  }
  const dup = copias.reduce((s, d) => s + d.length, 0) - [...porUrna.values()].reduce((s, u) => s + u.linhas.length, 0);
  return { brutos, porTexto, porUrna, duplicadas: dup, secaoPacote };
}

const novoCiclo = () => ({
  computados: 0, completos: 0, computadoSemConfirmacao: 0, computadoSemHabilitacao: 0, habilitados: 0, desistencias: 0,
  interrompidosComConfirmacao: 0, interrompidosSemConfirmacao: 0, habSemDesfecho: 0, identificadoInterrompido: 0,
  confirmacaoForaDeCiclo: 0, confPorCargo: {}, nulosPorCargo: {}, interrompidos: [],
});

/** Ciclo do eleitor nas linhas de uma urna; `filtro(linha)` escolhe as linhas que contam. */
function ciclo(linhas, filtro, c = novoCiclo()) {
  let aberto = null; // { conf: {}, nul: {}, hora }
  let identificado = null;
  const somar = (d, o) => { for (const [k, n] of Object.entries(o)) d[k] = (d[k] ?? 0) + n; };
  const interromper = (hora, motivo) => {
    if (aberto) {
      const nConf = Object.values(aberto.conf).reduce((s, n) => s + n, 0);
      if (nConf > 0) c.interrompidosComConfirmacao++;
      else c.interrompidosSemConfirmacao++;
      if (c.interrompidos.length < 20) c.interrompidos.push({ hab: aberto.hora, ate: hora, motivo, confirmados: aberto.conf });
      aberto = null;
    } else if (identificado) {
      c.identificadoInterrompido++;
      if (c.interrompidos.length < 20) c.interrompidos.push({ identificado: identificado, ate: hora, motivo, semHabilitacao: true });
    }
    identificado = null;
  };
  for (const x of linhas) {
    if (!filtro(x)) continue;
    const m = x.msg;
    const hora = x.l.slice(11, 19);
    if (m === 'Aguardando digitação do identificador do eleitor') {
      if (aberto) { c.habSemDesfecho++; aberto = null; }
      identificado = null;
    } else if (m.startsWith('Identificador digitado pelo mesário')) identificado = hora;
    else if (FIM_ATENDIMENTO(m)) identificado = null;
    else if (m === 'Eleitor foi habilitado') {
      if (aberto) { c.habSemDesfecho++; }
      identificado = null;
      aberto = { conf: {}, nul: {}, hora };
      c.habilitados++;
    } else if (m.startsWith('Voto confirmado para [')) {
      const cargo = CARGO_LOG[m.slice(22, -1)] ?? m.slice(22, -1);
      if (aberto) aberto.conf[cargo] = (aberto.conf[cargo] ?? 0) + 1;
      else c.confirmacaoForaDeCiclo++;
    } else if (m.startsWith('Atribuido voto nulo por suspensão [')) {
      const cargo = CARGO_LOG[m.slice(35, -1)] ?? m.slice(35, -1);
      if (aberto) aberto.nul[cargo] = (aberto.nul[cargo] ?? 0) + 1;
    } else if (m === 'O voto do eleitor foi computado') {
      c.computados++;
      if (!aberto) c.computadoSemHabilitacao++;
      else {
        const nConf = Object.values(aberto.conf).reduce((s, n) => s + n, 0);
        if (nConf > 0) c.completos++;
        else c.computadoSemConfirmacao++;
        somar(c.confPorCargo, aberto.conf);
        somar(c.nulosPorCargo, aberto.nul);
      }
      aberto = null;
      identificado = null;
    } else if (m === 'Eleitor foi suspenso e não confirmou nenhum voto') {
      c.desistencias++;
      aberto = null;
      identificado = null;
    } else if (INTERRUPCAO(m)) interromper(hora, m.slice(0, 40));
  }
  interromper('fim', 'fim do log');
  return c;
}

const somarCiclo = (d, o) => {
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === 'number') d[k] += v;
    else if (Array.isArray(v)) d[k].push(...v.slice(0, Math.max(0, 20 - d[k].length)));
    else for (const [kk, n] of Object.entries(v)) d[k][kk] = (d[k][kk] ?? 0) + n;
  }
};

function lerBuDec(bytes) {
  const b = decodificarArquivo(arquivoBu, bytes).conteudo;
  const cargos = {};
  for (const e of b.resultadosVotacaoPorEleicao ?? []) {
    for (const rv of e.resultadosVotacao) {
      for (const t of rv.totaisVotosCargo) {
        const nome = t.codigoCargo.cargoConstitucional ?? `consulta${t.codigoCargo.numeroCargoConsultaLivre}`;
        cargos[`${e.idEleicao}:${nome}`] = rv.qtdComparecimento;
      }
    }
  }
  const carga = b.urna?.correspondenciaResultado?.carga;
  return {
    comparecimento: b.qtdEleitoresCompareceram, tipoUrna: b.urna?.tipoUrna ?? null, tipoArquivo: b.urna?.tipoArquivo ?? null,
    numeroInterno: carga?.numeroInternoUrna ?? null, dataHoraCarga: carga?.dataHoraCarga ?? null, codigoCarga: carga?.codigoCarga ?? null,
    abertura: b.dadosSecaoSA?.dadosSecao?.dataHoraAbertura ?? null, encerramento: b.dadosSecaoSA?.dadosSecao?.dataHoraEncerramento ?? null,
    detalhamento: b.detalhamentoComparecimento ?? null, historicoCodigosCarga: b.historicoCodigosCarga ?? [], cargos,
  };
}

/** I11 por cargo: confirmações dos ciclos computados + nulos por suspensão = comparecimento do cargo no BU. */
function violacoesI11(bu, c) {
  const v = [];
  const porNome = {};
  for (const [k, comp] of Object.entries(bu.cargos)) {
    const nome = k.split(':')[1];
    porNome[nome] = (porNome[nome] ?? 0) + comp;
  }
  for (const [nome, comp] of Object.entries(porNome)) {
    if (nome.startsWith('consulta')) continue;
    const log = (c.confPorCargo[nome] ?? 0) + (c.nulosPorCargo[nome] ?? 0);
    if (log !== comp) v.push(`${nome}: BU ${comp}, log ${log}`);
  }
  return v;
}

async function analisar(s) {
  const dir = path.join(RAIZ, s.uf, s.municipio, s.zona, s.secao);
  const dirHash = path.join(dir, s.hash);
  let nomes;
  try {
    nomes = await readdir(dirHash);
  } catch (erro) {
    return { erro: `pacote ausente: ${erro.code}` };
  }
  const outrosDirs = (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory() && e.name !== s.hash).length;
  const nBu = acharArquivo(nomes, 'bu');
  const nLog = acharArquivo(nomes, 'log');
  if (!nBu) return { erro: 'sem bu', outrosDirs };
  const bu = lerBuDec(await readFile(path.join(dirHash, nBu)));
  if (!nLog) return { bu, erro: 'sem log', outrosDirs };
  const h = await open(path.join(dirHash, nLog));
  let lista;
  try {
    lista = await textos(h);
  } finally {
    await h.close();
  }
  const p = linhasDoPacote(lista, s.secao);
  const daSecao = (x) => x.sec === null || x.sec === s.secao;
  const B = novoCiclo();
  const C = novoCiclo();
  const urnas = [];
  for (const [urna, u] of p.porUrna) {
    const cb = ciclo(u.linhas, () => true);
    const cc = ciclo(u.linhas, daSecao);
    somarCiclo(B, cb);
    somarCiclo(C, cc);
    const secs = {};
    for (const x of u.linhas) secs[x.sec ?? '-'] = (secs[x.sec ?? '-'] ?? 0) + 1;
    urnas.push({ urna, linhas: u.linhas.length, secoes: secs, primeira: u.linhas[0]?.l.slice(11, 19), ultima: u.linhas.at(-1)?.l.slice(11, 19), B: cb, C: cc });
  }
  return { bu, outrosDirs, logs: lista.length, A: p.brutos.computados, duplicadas: p.duplicadas, porTexto: p.porTexto, urnas, B, C };
}

async function processarUf(db, uf) {
  const secoes = db.prepare(`SELECT uf, municipio, zona, secao, situacao, hash, tipo_urna, tipo_arquivo, comparecimento FROM secao WHERE turno = ? AND uf = ?`).all(turno, uf);
  // Árvore bruta: seções presentes no disco
  const noDisco = new Set();
  const base = path.join(RAIZ, uf);
  for (const mun of existsSync(base) ? await readdir(base) : []) {
    for (const zona of await readdir(path.join(base, mun))) {
      for (const sec of await readdir(path.join(base, mun, zona))) noDisco.add(`${mun}/${zona}/${sec}`);
    }
  }
  const r = {
    uf, secoesBanco: secoes.length, secoesDisco: noDisco.size, soNoDisco: 0, semArquivo: 0, semArquivoComPacoteNoDisco: 0, sa: 0, urna: 0, comErro: 0,
    outrosDirsHash: 0, logsPorPacote: {}, buDiferenteDoBanco: 0,
    totais: { bu: 0, A: 0, B: 0, C: 0, duplicadas: 0 }, divergeA: 0, divergeB: 0, divergeC: 0, I11B: 0, I11C: 0,
    comInterrompidoConfirmado: 0, interrompidoConfirmadoViraVoto: 0, detalhe: [], erros: [], sa_lista: [],
  };
  for (const s of secoes) noDisco.delete(`${s.municipio}/${s.zona}/${s.secao}`);
  r.soNoDisco = noDisco.size;
  r.soNoDiscoLista = [...noDisco];
  await emParalelo(secoes, Number(values.paralelo), async (s) => {
    if (s.situacao !== 'completa') {
      r.semArquivo++;
      const dir = path.join(RAIZ, s.uf, s.municipio, s.zona, s.secao);
      if (existsSync(dir) && (await readdir(dir, { withFileTypes: true })).some((e) => e.isDirectory())) r.semArquivoComPacoteNoDisco++;
      return;
    }
    if (String(s.tipo_arquivo).startsWith('sa')) {
      r.sa++;
      r.sa_lista.push(`${s.municipio}/${s.zona}/${s.secao}`);
      return;
    }
    r.urna++;
    let a;
    try {
      a = await analisar(s);
    } catch (erro) {
      a = { erro: erro.message };
    }
    if (a.erro) {
      r.comErro++;
      r.erros.push({ secao: `${s.municipio}/${s.zona}/${s.secao}`, erro: a.erro });
      return;
    }
    if (a.outrosDirs) r.outrosDirsHash++;
    r.logsPorPacote[a.logs] = (r.logsPorPacote[a.logs] ?? 0) + 1;
    const bu = a.bu.comparecimento;
    if (bu !== s.comparecimento) r.buDiferenteDoBanco++;
    r.totais.bu += bu;
    r.totais.A += a.A;
    r.totais.B += a.B.computados;
    r.totais.C += a.C.computados;
    r.totais.duplicadas += a.duplicadas;
    const vB = violacoesI11(a.bu, a.B);
    const vC = violacoesI11(a.bu, a.C);
    const dA = a.A !== bu;
    const dB = a.B.computados !== bu;
    const dC = a.C.computados !== bu;
    if (dA) r.divergeA++;
    if (dB) r.divergeB++;
    if (dC) r.divergeC++;
    if (vB.length) r.I11B++;
    if (vC.length) r.I11C++;
    if (a.C.interrompidosComConfirmacao) {
      r.comInterrompidoConfirmado++;
      if (bu > a.C.computados) r.interrompidoConfirmadoViraVoto++;
    }
    const interessa = dA || dB || dC || vB.length || vC.length || a.C.computadoSemHabilitacao || a.B.computadoSemHabilitacao || a.C.confirmacaoForaDeCiclo;
    const resumo = {
      secao: `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`, tipoUrna: a.bu.tipoUrna, tipoArquivo: a.bu.tipoArquivo, bu, A: a.A, B: a.B.computados, C: a.C.computados,
      interrompidosComConfirmacaoC: a.C.interrompidosComConfirmacao, interrompidosSemConfirmacaoC: a.C.interrompidosSemConfirmacao,
      identificadoInterrompidoC: a.C.identificadoInterrompido, I11B: vB, I11C: vC,
    };
    if (interessa) r.detalhe.push({ ...resumo, completo: a });
    else if (a.C.interrompidosComConfirmacao) (r.interrompidosConfirmados ??= []).push(resumo);
  });
  r.detalhe.sort((x, y) => (x.secao < y.secao ? -1 : 1));
  return r;
}

const { db, fonte } = await abrirLeitura();
console.error(`banco: ${fonte}`);
await mkdir(SAIDA, { recursive: true });
if (values.secao) {
  // Conferência de casos (não gera número do universo): só as seções pedidas, saída em casos.json
  const r = [];
  for (const alvo of values.secao) {
    const [uf, municipio, zona, secao] = alvo.split('/');
    const s = db.prepare(`SELECT uf, municipio, zona, secao, situacao, hash, tipo_urna, tipo_arquivo, comparecimento FROM secao WHERE turno = ? AND uf = ? AND municipio = ? AND zona = ? AND secao = ?`).get(turno, uf, municipio, zona, secao);
    r.push({ alvo, ...(await analisar(s)) });
  }
  await writeFile(path.join(SAIDA, 'casos.json'), JSON.stringify(r, null, 1));
  for (const x of r) console.log(x.alvo, 'BU', x.bu?.comparecimento, 'A', x.A, 'B', x.B?.computados, 'C', x.C?.computados, 'intConf', x.C?.interrompidosComConfirmacao, 'intSem', x.C?.interrompidosSemConfirmacao, 'ident', x.C?.identificadoInterrompido, 'I11', JSON.stringify(violacoesI11(x.bu, x.B)), JSON.stringify(violacoesI11(x.bu, x.C)));
  process.exit(0);
}
const ufs = values.uf ? values.uf.split(',') : UFS;
for (const uf of ufs) {
  const arq = path.join(SAIDA, `${uf}.json`);
  if (existsSync(arq) && !values.refazer) {
    console.log(`${uf}: já feito`);
    continue;
  }
  const t0 = Date.now();
  const r = await processarUf(db, uf);
  r.fonte = fonte;
  await writeFile(arq, JSON.stringify(r, null, 1));
  console.log(`${uf}: banco ${r.secoesBanco}, disco ${r.secoesDisco}, urna ${r.urna}, SA ${r.sa}, sem arquivo ${r.semArquivo}, erro ${r.comErro}; `
    + `BU≠A ${r.divergeA}, BU≠B ${r.divergeB}, BU≠C ${r.divergeC}, I11 B ${r.I11B} C ${r.I11C}; ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
