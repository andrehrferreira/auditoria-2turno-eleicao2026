// Parecer cético 29 (H09, sigilo do voto): reprodução independente de scripts/auditoria/seguranca-h09-sigilo.mjs
// e testes das explicações alternativas para os títulos "sem papel" da suspensão de eleitor.
//
// Uma passada por todos os pacotes dos turnos pedidos (data/raw/<t>t/urnas/...), lendo RDV e log (inclusive o log
// da urna original dentro do pacote de contingência). Implementação própria (não importa o script do engenheiro).
//
// Parte 1 (RDV): ordem por (tipo, digitação como texto) com a ordem do enum escrita à mão; tipos fora do enum são
//   contados (um tipo desconhecido faria o comparador do engenheiro devolver NaN e aceitar a lista como ordenada).
//   Teste da âncora (posição do eleitor suspenso no log × posição do nuloAposSuspensao no RDV) com o número esperado
//   por acaso (soma de k/n), para dar tamanho ao "é acaso".
// Parte 2: seções com cargo de 1 eleitor e cargos unânimes (soma dos pacotes da seção), com mesário eleitor no dia.
// Parte 3 (suspensão): cada linha "Título <n> é válido / inválido para suspender a votação" do dia da eleição:
//   - papel na urna (mesário, operador, presidente que encerrou) e, no país, nos DOIS turnos (mesário, operador,
//     título de encerramento em qualquer urna);
//   - linha repetida no mesmo pacote (log aninhado da contingência);
//   - números distintos (na seção e no país) e em quantas seções o mesmo número aparece;
//   - distância de Hamming ao título de mesário mais próximo da urna (teste de "digitou errado o próprio título");
//   - sequência das tentativas na janela do eleitor (o que vem depois de um inválido);
//   - para o inválido que é título de mesário da própria urna: esse mesário "é eleitor da seção"?
//   - o mesmo número sem papel nos dois turnos, na mesma seção.
//
// Privacidade: os números ficam só na memória dos processos (e no canal entre eles). Nada com número é gravado:
// a saída são contagens, passadas por uma trava que remove qualquer sequência de 10 a 12 dígitos com DV de título
// ou de CPF.
//
// Uso: node scripts/auditoria/cetico-h09-sigilo.mjs [--turnos 1,2] [--uf ac,es] [--procs 4]
// Saída: data/parsed/auditoria/cetico-revisor/h09/resumo[-ufs].json e .txt
import { fork } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { decodificarArquivo } from '../../src/asn1.js';
import { DIR_DADOS } from '../../src/config.js';
import { arquivoRdv } from '../../src/esquemas.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', 'h09');
const DIA = { 1: '04/10/2026', 2: '25/10/2026' };
// Ordem do enum do RDV (especificação; src/esquemas.js TIPO_VOTO_RDV), escrita à mão para o teste ser independente.
const ORDEM_TIPO = ['legenda', 'nominal', 'branco', 'nulo', 'brancoAposSuspensao', 'nuloAposSuspensao', 'nuloPorRepeticao',
  'nuloCargoSemCandidato', 'nuloAposSuspensaoCargoSemCandidato'];
const POS_TIPO = new Map(ORDEM_TIPO.map((t, i) => [t, i]));
const CARGO_LOG = { Presidente: 'presidente', Governador: 'governador', Senador: 'senador', 'Deputado Federal': 'deputadoFederal',
  'Deputado Estadual': 'deputadoEstadual', 'Deputado Distrital': 'deputadoDistrital', Prefeito: 'prefeito', Vereador: 'vereador' };

// ---------- dígitos verificadores (implementação própria) ----------

/** Título de 12 dígitos: 8 de sequência, UF 01–28, DV1 (pesos 2..9) e DV2 (UF com pesos 7, 8 e DV1 com peso 9). */
export function titulo(s) {
  if (s.length !== 12) return false;
  const d = [];
  for (let i = 0; i < 12; i++) d.push(s.charCodeAt(i) - 48);
  const uf = d[8] * 10 + d[9];
  if (uf < 1 || uf > 28) return false;
  const spmg = uf === 1 || uf === 2;
  const ajusta = (r) => (r === 10 ? 0 : r === 0 && spmg ? 1 : r);
  let s1 = 0;
  for (let i = 0; i < 8; i++) s1 += d[i] * (i + 2);
  const dv1 = ajusta(s1 % 11);
  return dv1 === d[10] && ajusta((d[8] * 7 + d[9] * 8 + dv1 * 9) % 11) === d[11];
}

export function cpf(s) {
  if (!/^\d{11}$/.test(s) || /^(\d)\1+$/.test(s)) return false;
  const d = [...s].map(Number);
  for (const n of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += d[i] * (n + 1 - i);
    const r = (soma * 10) % 11;
    if ((r === 10 ? 0 : r) !== d[n]) return false;
  }
  return true;
}

const hamming = (a, b) => {
  let n = 0;
  for (let i = 0; i < 12; i++) if (a.charCodeAt(i) !== b.charCodeAt(i)) n++;
  return n;
};

const inc = (o, k, n = 1) => {
  o[k] = (o[k] ?? 0) + n;
};

// ---------- leitura ----------

const memoria = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });

async function textosLog(handle, prof = 0) {
  const out = [];
  for (const e of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, e);
    if (e.nome.endsWith('.dat')) out.push(dados.toString('latin1'));
    else if (e.nome.endsWith('.jez') && prof < 3) out.push(...(await textosLog(memoria(dados), prof + 1)));
  }
  return out;
}

async function pacotes(dir) {
  try {
    const aux = JSON.parse(await readFile(path.join(dir, 'aux.json'), 'utf8'));
    return (aux.hashes ?? []).filter((h) => h.hash && h.hash !== '0' && (h.arq ?? []).some((a) => a.nm)).map((h) => h.hash);
  } catch {
    return (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  }
}

// ---------- RDV ----------

function rdvListas(rdv, P1) {
  const ele = rdv.rdv.eleicoes;
  const listas = [];
  for (const e of ele.eleicoesVota ?? ele.eleicoesSA ?? []) {
    const origem = ele.eleicoesVota ? 'urna' : `sa:${e.origemVotosSA}`;
    for (const c of e.votosCargos) {
      const cargo = c.idCargo.cargoConstitucional ?? `consulta:${c.idCargo.numeroCargoConsultaLivre}`;
      const v = c.votos;
      let ordenada = true;
      let desconhecido = 0;
      const contagem = new Map();
      const posNS = [];
      for (let i = 0; i < v.length; i++) {
        const p = POS_TIPO.get(v[i].tipoVoto);
        if (p === undefined) desconhecido++;
        const k = `${v[i].tipoVoto}:${v[i].digitacao ?? ''}`;
        contagem.set(k, (contagem.get(k) ?? 0) + 1);
        if (v[i].tipoVoto === 'nuloAposSuspensao') posNS.push(i);
        if (i > 0 && ordenada) {
          const pa = POS_TIPO.get(v[i - 1].tipoVoto) ?? 99;
          const pb = p ?? 99;
          const da = v[i - 1].digitacao ?? '';
          const db = v[i].digitacao ?? '';
          if (pa > pb || (pa === pb && da > db)) ordenada = false;
        }
        // Campos além de tipoVoto e digitacao (a ordem dos empates só carregaria informação se houvesse algum).
        for (const campo of Object.keys(v[i])) if (campo !== 'tipoVoto' && campo !== 'digitacao') inc(P1.camposExtras, campo);
      }
      const chave = origem === 'urna' ? `urna:${rdv.urna.tipoUrna}/${rdv.urna.tipoArquivo}` : `${origem}:${rdv.urna.tipoArquivo}`;
      const g = (P1.porOrigem[chave] ??= { listas: 0, ordenadas: 0, comDoisOuMaisValores: 0, ordenadasComDoisOuMaisValores: 0 });
      g.listas++;
      if (ordenada) g.ordenadas++;
      if (contagem.size >= 2) {
        g.comDoisOuMaisValores++;
        if (ordenada) g.ordenadasComDoisOuMaisValores++;
      }
      P1.tiposDesconhecidos += desconhecido;
      listas.push({ origem, cargo, escolhas: c.quantidadeEscolhas, n: v.length, posNS, contagem });
    }
  }
  return listas;
}

// ---------- log ----------

const RE_MES = /^(?:Mesário (\d{12}) (registrado|já registrado|é eleitor da seção|não é eleitor da seção)|Pedido de leitura da biometria do mesário (\d{12}))$/;
const RE_OPER = /gerada? pelo usuário: (\d+)$/;
const RE_ENC = /^Título digitado para encerramento: (\d+)$/;
const RE_SUSP = /^Título (\d+) é (válido|inválido) para suspender a votação$/;
const RE_IDTIPO = /^Identificador digitado pelo mesário foi: \((.+)\)$/;
const RE_NULO = /^Atribuido voto nulo por suspensão \[(.+)\]$/;
const INICIO = 'Identificador do eleitor digitado pelo mesário';
const AGUARDA = 'Aguardando digitação do identificador do eleitor';
const FIM = 'O voto do eleitor foi computado';

/** Percorre as linhas de um texto sem montar array: chama f(dh, msg). */
function linhas(texto, f) {
  let i = 0;
  const n = texto.length;
  while (i < n) {
    let j = texto.indexOf('\n', i);
    if (j < 0) j = n;
    let fim = j;
    if (fim > i && texto.charCodeAt(fim - 1) === 13) fim--;
    // data/hora \t nível \t urna \t aplicação \t mensagem [\t 16 hex]
    const t1 = texto.indexOf('\t', i);
    if (t1 > 0 && t1 < fim) {
      let t = t1;
      for (let k = 0; k < 3 && t >= 0 && t < fim; k++) t = texto.indexOf('\t', t + 1);
      if (t > 0 && t < fim) {
        let fimMsg = fim;
        const u = texto.lastIndexOf('\t', fim - 1);
        if (u > t && fim - u === 17) fimMsg = u;
        f(texto.slice(i, t1), texto.slice(t + 1, fimMsg));
      }
    }
    i = j + 1;
  }
}

function analisarPacote(textos, turno, onde, R, nac) {
  const dia = DIA[turno];
  const mesarios = new Set();
  const mesEleitor = new Set();
  const operadores = new Set();
  const encerramento = new Set();
  // Passada 1: papéis do pacote (todas as datas, todos os textos).
  for (const tx of textos) {
    linhas(tx, (dh, msg) => {
      const c = msg.charCodeAt(0);
      if (c === 77 || c === 80) { // M, P
        const m = RE_MES.exec(msg);
        if (m) {
          const t = m[1] ?? m[3];
          mesarios.add(t);
          if (m[2] === 'é eleitor da seção') mesEleitor.add(t);
        }
      } else if (c === 84) { // T
        const e = RE_ENC.exec(msg);
        if (e) encerramento.add(e[1].padStart(12, '0'));
      }
      if (msg.includes('pelo usuário: ')) {
        const o = RE_OPER.exec(msg);
        if (o) operadores.add(o[1].padStart(12, '0'));
      }
    });
  }
  for (const t of mesarios) nac.mesarios.push(t);
  for (const t of operadores) nac.operadores.push(t);
  for (const t of encerramento) nac.encerramento.push(t);

  // Passada 2: janelas, suspensões, computados, âncora.
  const vistos = new Set(); // dedupe de linha de suspensão entre textos do pacote
  const computadosPorTexto = [];
  const ancoras = [];
  let idJ = 0;
  for (let ti = 0; ti < textos.length; ti++) {
    let comp = 0;
    let jan = null;
    const fechar = (j, motivo) => {
      R.janelas.total++;
      inc(R.janelas.idTipo, j.idTipo ?? 'sem tipo');
      if (!j.tent.length) return;
      // Assinatura da sequência de tentativas.
      const sig = j.tent.map((a) => `${a.valido ? 'V' : 'I'}:${a.classe}`).join(' > ') + ` | ${j.nulo ? 'nulo por suspensão' : motivo}`;
      inc(R.seqAssinaturas, sig);
      for (let k = 0; k < j.tent.length; k++) {
        const a = j.tent[k];
        if (!a.valido && a.classe === 'semPapel') {
          const b = j.tent[k + 1];
          const prox = !b ? `nada (${j.nulo ? 'nulo' : motivo})` : b.num === a.num ? `mesmo número de novo (${b.valido ? 'aceito' : 'recusado'})`
            : `${b.valido ? 'V' : 'I'}:${b.classe}`;
          inc(R.depoisDoInvalidoSemPapel, prox);
        }
      }
      for (const a of j.tent) {
        a.idTipo = j.idTipo ?? 'sem tipo';
        a.nulo = j.nulo;
        a.fim = j.nulo ? 'nulo' : motivo;
        a.nTent = j.tent.length;
        a.nDistintos = new Set(j.tent.map((x) => x.num)).size;
        a.jan = j.id;
      }
    };
    linhas(textos[ti], (dh, msg) => {
      const noDia = dh.startsWith(dia);
      if (jan && msg === AGUARDA) {
        fechar(jan, 'voltou a aguardar');
        jan = null;
      }
      if (msg === INICIO) {
        if (jan) fechar(jan, 'nova janela');
        jan = { id: ++idJ, idTipo: null, nulo: false, tent: [] };
        return;
      }
      if (jan && msg.startsWith('Identificador digitado pelo mesário foi')) jan.idTipo = RE_IDTIPO.exec(msg)?.[1] ?? 'outro';
      if (msg.startsWith('Atribuido voto nulo por suspensão')) {
        if (jan) jan.nulo = true;
        if (noDia) ancoras.push({ texto: ti, cargo: CARGO_LOG[RE_NULO.exec(msg)?.[1]] ?? 'outro', pos: comp });
      }
      if (msg.startsWith('Título ') && msg.endsWith('para suspender a votação')) {
        const m = RE_SUSP.exec(msg);
        if (!m) {
          inc(R.susp.foraDoPadrao, 'sem número');
          return;
        }
        R.susp.linhasTodas++;
        if (!noDia) return;
        const valido = m[2] === 'válido';
        const bruto = m[1];
        const num = bruto.padStart(12, '0');
        const g = R.susp[valido ? 'valido' : 'invalido'];
        g.linhas++;
        inc(g.tamanho, bruto.length);
        const chaveDup = `${dh}\t${msg}`;
        if (vistos.has(chaveDup)) {
          g.linhasRepetidasNoPacote++;
          return; // conta uma vez
        }
        vistos.add(chaveDup);
        g.linhasUnicas++;
        const dvOk = bruto.length >= 10 && bruto.length <= 12 && titulo(num);
        if (!dvOk) g.dvInvalido++;
        let classe = 'dvInvalido';
        if (dvOk) classe = mesarios.has(num) ? 'mesarioUrna' : operadores.has(num) ? 'operadorUrna' : encerramento.has(num) ? 'encerramentoUrna' : 'semPapel';
        inc(g.classeUrna, classe);
        if (!jan) g.foraDaJanela++;
        // Distância ao título de mesário mais próximo da urna (dígitos trocados).
        let dmin = 99;
        for (const t of mesarios) dmin = Math.min(dmin, hamming(num, t));
        if (classe === 'semPapel' || classe === 'dvInvalido') inc(g[`hamming_${classe}`], mesarios.size ? Math.min(dmin, 9) : 'urna sem mesário');
        if (classe === 'mesarioUrna') {
          inc(g.mesarioUrnaEleitorDaSecao, mesEleitor.has(num) ? 'mesário é eleitor da seção' : 'mesário não é eleitor da seção');
        }
        if (classe === 'semPapel' && num.slice(8, 10) === nac.codUf) g.semPapelMesmaUf++;
        const a = { num, valido, classe, onde, turno };
        if (jan) jan.tent.push(a);
        if (classe === 'semPapel') nac.semPapel.push(a);
        // Controle do cruzamento entre turnos: mesário da urna que suspendeu com sucesso.
        if (classe === 'mesarioUrna' && valido) nac.mesarioSusp.push({ num, onde });
        else if (jan) a.local = true; // só para a assinatura
      }
      if (msg === FIM) {
        if (noDia) comp++;
        if (jan) fechar(jan, 'voto computado sem nulo');
        jan = null;
      }
    });
    if (jan) fechar(jan, 'fim do texto');
    computadosPorTexto.push(comp);
  }
  return { computadosPorTexto, ancoras, mesEleitorDia: mesEleitor.size };
}

// ---------- seção ----------

async function analisarSecao(turno, base, uf, mun, zona, secao, R, nac) {
  const dir = path.join(base, uf, mun, zona, secao);
  const onde = `${uf}/${mun}/${zona}/${secao}`;
  R.secoes++;
  const hs = await pacotes(dir);
  if (!hs.length) R.secoesSemPacote++;
  const soma = new Map();
  let mesEleitor = 0;
  for (const h of hs) {
    R.pacotes++;
    const nomes = await readdir(path.join(dir, h));
    let listas = null;
    let lg = null;
    const nRdv = acharArquivo(nomes, 'rdv');
    if (nRdv) listas = rdvListas(decodificarArquivo(arquivoRdv, await readFile(path.join(dir, h, nRdv))), R.P1);
    const nLog = acharArquivo(nomes, 'log');
    if (nLog) {
      const textos = await textosLog(memoria(await readFile(path.join(dir, h, nLog))));
      lg = analisarPacote(textos, turno, onde, R, nac);
      mesEleitor = Math.max(mesEleitor, lg.mesEleitorDia);
    }
    if (listas) {
      for (const L of listas) {
        const s = soma.get(L.cargo) ?? { escolhas: L.escolhas, cont: new Map() };
        soma.set(L.cargo, s);
        for (const [k, n] of L.contagem) s.cont.set(k, (s.cont.get(k) ?? 0) + n);
      }
    }
    // Âncora: pacote de urna, um só texto com votos no dia, cargo de 1 escolha, contagem igual.
    if (listas && lg && listas.every((L) => L.origem === 'urna')) {
      const comVotos = lg.computadosPorTexto.filter((n) => n > 0).length;
      const total = lg.computadosPorTexto.reduce((a, b) => a + b, 0);
      for (const a of lg.ancoras) {
        R.ancora.eventos++;
        const L = listas.find((x) => x.cargo === a.cargo && x.escolhas === 1);
        if (!L) inc(R.ancora.excluidos, 'cargo sem lista de 1 escolha');
        else if (comVotos > 1) inc(R.ancora.excluidos, 'votos em mais de um texto (contingência)');
        else if (total !== L.n) inc(R.ancora.excluidos, 'contagem log ≠ RDV');
        else {
          R.ancora.comparaveis++;
          if (L.posNS.includes(a.pos)) R.ancora.coincidencias++;
          R.ancora.esperadoAcaso += L.posNS.length / L.n;
          if (L.posNS.length === 1) R.ancora.comUmSoNuloAposSuspensao++;
        }
      }
    }
  }
  for (const [cargo, s] of soma) {
    const n = [...s.cont.values()].reduce((a, b) => a + b, 0);
    if (!n) continue;
    const eleitores = Math.round(n / s.escolhas);
    const g = (R.P2[cargo] ??= { secoes: 0, eleitores1: 0, ate9: 0, unanimes: 0, eleitoresUnanimes: 0, unanimesComMesarioEleitor: 0 });
    g.secoes++;
    if (eleitores === 1) g.eleitores1++;
    if (eleitores <= 9) g.ate9++;
    if (s.cont.size === 1) {
      g.unanimes++;
      g.eleitoresUnanimes += eleitores;
      if (mesEleitor) g.unanimesComMesarioEleitor++;
    }
  }
}

function novoR() {
  const grupo = () => ({ linhas: 0, linhasRepetidasNoPacote: 0, linhasUnicas: 0, tamanho: {}, dvInvalido: 0, classeUrna: {}, foraDaJanela: 0,
    hamming_semPapel: {}, hamming_dvInvalido: {}, mesarioUrnaEleitorDaSecao: {}, semPapelMesmaUf: 0 });
  return {
    secoes: 0, secoesSemPacote: 0, pacotes: 0, falhas: [],
    P1: { porOrigem: {}, tiposDesconhecidos: 0, camposExtras: {} },
    ancora: { eventos: 0, comparaveis: 0, coincidencias: 0, esperadoAcaso: 0, comUmSoNuloAposSuspensao: 0, excluidos: {} },
    P2: {},
    janelas: { total: 0, idTipo: {} },
    susp: { linhasTodas: 0, foraDoPadrao: {}, valido: grupo(), invalido: grupo() },
    seqAssinaturas: {}, depoisDoInvalidoSemPapel: {},
  };
}

function juntar(a, b) {
  for (const [k, v] of Object.entries(b)) {
    if (typeof v === 'number') a[k] = (a[k] ?? 0) + v;
    else if (Array.isArray(v)) (a[k] ??= []).push(...v.slice(0, 1000));
    else if (v && typeof v === 'object') juntar((a[k] ??= {}), v);
  }
  return a;
}

const COD_UF = { sp: 1, mg: 2, rj: 3, rs: 4, ba: 5, pr: 6, ce: 7, pe: 8, sc: 9, go: 10, ma: 11, pb: 12, pa: 13, es: 14, pi: 15, rn: 16,
  al: 17, mt: 18, ms: 19, df: 20, se: 21, am: 22, ro: 23, ac: 24, ap: 25, rr: 26, to: 27, zz: 28 };

async function filho() {
  process.on('message', async ({ turno, uf, mun, zona }) => {
    const base = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas');
    const R = novoR();
    const nac = { mesarios: [], operadores: [], encerramento: [], semPapel: [], mesarioSusp: [], codUf: String(COD_UF[uf]).padStart(2, '0') };
    let secoes = [];
    try {
      secoes = (await readdir(path.join(base, uf, mun, zona), { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
    } catch (erro) {
      R.falhas.push(`${uf}/${mun}/${zona}: ${erro.message}`);
    }
    for (const s of secoes) {
      try {
        await analisarSecao(turno, base, uf, mun, zona, s, R, nac);
      } catch (erro) {
        R.falhas.push(`${uf}/${mun}/${zona}/${s}: ${erro.message}`);
      }
    }
    delete nac.codUf;
    process.send({ turno, R, nac });
  });
  process.send({ pronto: true });
}

/** Trava: troca por [removido] qualquer 10–12 dígitos com DV de título ou de CPF. */
function trava(texto) {
  let n = 0;
  const limpo = texto.replace(/(?<!\d)\d{10,12}(?!\d)/g, (d) => (titulo(d.padStart(12, '0')) || cpf(d) ? (n++, '[removido]') : d));
  if (n) console.error(`aviso: ${n} número(s) com DV de título/CPF removido(s) da saída`);
  return limpo;
}

async function principal() {
  const { values } = parseArgs({ options: { turnos: { type: 'string', default: '1,2' }, uf: { type: 'string' }, procs: { type: 'string', default: '4' } } });
  const turnos = values.turnos.split(',').map(Number);
  const procs = Math.min(4, Math.max(1, Number(values.procs)));
  const sub = async (d) => (await readdir(d, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  const fila = [];
  const ufsPorTurno = {};
  for (const turno of turnos) {
    const base = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas');
    const ufs = values.uf ? values.uf.split(',') : await sub(base);
    ufsPorTurno[turno] = ufs;
    for (const uf of ufs) for (const mun of await sub(path.join(base, uf))) for (const zona of await sub(path.join(base, uf, mun))) fila.push({ turno, uf, mun, zona });
  }
  const total = fila.length;
  const R = Object.fromEntries(turnos.map((t) => [t, novoR()]));
  // Só em memória:
  const mesariosPais = Object.fromEntries(turnos.map((t) => [t, new Set()]));
  const operadoresPais = new Set();
  const encerramentoPais = new Set();
  const semPapel = Object.fromEntries(turnos.map((t) => [t, []]));
  const mesarioSusp = Object.fromEntries(turnos.map((t) => [t, new Set()])); // "número|seção"
  const inicio = Date.now();
  let feitas = 0;
  await new Promise((resolve) => {
    let ativos = 0;
    for (let i = 0; i < Math.min(procs, fila.length); i++) {
      ativos++;
      const f = fork(import.meta.filename, ['--filho'], { execArgv: ['--max-old-space-size=4096'] });
      const prox = () => {
        const u = fila.shift();
        if (u) f.send(u);
        else f.disconnect();
      };
      f.on('message', (m) => {
        if (m.pronto) return prox();
        juntar(R[m.turno], m.R);
        for (const t of m.nac.mesarios) mesariosPais[m.turno].add(t);
        for (const t of m.nac.operadores) operadoresPais.add(t);
        for (const t of m.nac.encerramento) encerramentoPais.add(t);
        for (const a of m.nac.semPapel) semPapel[m.turno].push(a);
        for (const a of m.nac.mesarioSusp) mesarioSusp[m.turno].add(`${a.num}|${a.onde}`);
        if (++feitas % 250 === 0) console.error(`${feitas}/${total} zonas, ${Math.round((Date.now() - inicio) / 1000)} s`);
        prox();
      });
      f.on('exit', () => {
        if (--ativos === 0) resolve();
      });
    }
  });

  // Cruzamento nacional dos números sem papel na urna.
  const nacional = {};
  for (const t of turnos) {
    const outro = turnos.find((x) => x !== t);
    const porNumero = new Map(); // número → { secoes:Set, valido:bool, invalido:bool }
    const c = { valido: {}, invalido: {} };
    // Só os números sem papel nenhum no país: linhas por tipo de identificador do eleitor e por fim da janela;
    // janelas distintas (seção + janela) e as que terminam em nulo por suspensão.
    const semNada = { valido: { linhas: 0, idTipoLinhas: {}, fimLinhas: {}, janelas: new Set(), janelasNulo: new Set(), idTipoJanelas: {} },
      invalido: { linhas: 0, idTipoLinhas: {}, fimLinhas: {}, janelas: new Set(), janelasNulo: new Set(), idTipoJanelas: {} },
      qualquer: { janelas: new Set(), janelasNulo: new Set() } };
    for (const a of semPapel[t]) {
      const k = a.valido ? 'valido' : 'invalido';
      const classe = mesariosPais[t].has(a.num) ? 'mesário em outra urna (mesmo turno)'
        : outro && mesariosPais[outro].has(a.num) ? `mesário só no outro turno`
          : operadoresPais.has(a.num) ? 'operador (gerou mídia) em alguma urna'
            : encerramentoPais.has(a.num) ? 'título de encerramento em outra urna' : 'nenhum papel no país (2 turnos)';
      inc(c[k], classe);
      if (classe === 'nenhum papel no país (2 turnos)') {
        const g = semNada[k];
        g.linhas++;
        inc(g.idTipoLinhas, a.idTipo ?? 'fora da janela');
        inc(g.fimLinhas, a.fim ?? 'fora da janela');
        const jk = `${a.onde}#${a.jan}`;
        if (!g.janelas.has(jk)) inc(g.idTipoJanelas, a.idTipo ?? 'fora da janela');
        g.janelas.add(jk);
        semNada.qualquer.janelas.add(jk);
        if (a.nulo) {
          g.janelasNulo.add(jk);
          semNada.qualquer.janelasNulo.add(jk);
        }
      }
      const u = porNumero.get(a.num) ?? { secoes: new Set(), valido: 0, invalido: 0, classe };
      porNumero.set(a.num, u);
      u.secoes.add(a.onde);
      u[k]++;
    }
    const dist = { valido: {}, invalido: {}, ambos: 0 };
    const distintos = { valido: 0, invalido: 0, total: porNumero.size, nenhumPapel: 0 };
    for (const u of porNumero.values()) {
      const s = u.secoes.size;
      const faixa = s === 1 ? '1 seção' : s === 2 ? '2 seções' : s <= 5 ? '3-5 seções' : '6+ seções';
      if (u.valido) {
        distintos.valido++;
        inc(dist.valido, faixa);
      }
      if (u.invalido) {
        distintos.invalido++;
        inc(dist.invalido, faixa);
      }
      if (u.valido && u.invalido) dist.ambos++;
      if (u.classe === 'nenhum papel no país (2 turnos)') distintos.nenhumPapel++;
    }
    // Mesmo número sem papel nos dois turnos.
    let cruzTurno = null;
    if (outro && t === turnos[0]) {
      const outros = new Map();
      for (const a of semPapel[outro]) {
        if (!outros.has(a.num)) outros.set(a.num, new Set());
        outros.get(a.num).add(a.onde);
      }
      cruzTurno = { numeros: porNumero.size, tambemNoOutroTurno: 0, mesmaSecao: 0 };
      for (const [num, u] of porNumero) {
        const o = outros.get(num);
        if (!o) continue;
        cruzTurno.tambemNoOutroTurno++;
        if ([...u.secoes].some((s) => o.has(s))) cruzTurno.mesmaSecao++;
      }
    }
    // Controle: mesário (registrado na urna) que suspendeu com sucesso no 1º turno volta a suspender no 2º, na mesma seção?
    let controleMesario = null;
    if (outro && t === turnos[0]) {
      controleMesario = { paresNumeroSecao: mesarioSusp[t].size, tambemNoOutroTurno: 0 };
      for (const p of mesarioSusp[t]) if (mesarioSusp[outro].has(p)) controleMesario.tambemNoOutroTurno++;
    }
    const resumoSemNada = {};
    for (const [k, g] of Object.entries(semNada)) {
      resumoSemNada[k] = { ...g, janelas: g.janelas.size, janelasNulo: g.janelasNulo.size };
    }
    nacional[t] = { mesariosNoPais: mesariosPais[t].size, linhasSemPapel: semPapel[t].length, classe: c, distintos, secoesPorNumero: dist, cruzTurno,
      controleMesario, semPapelNenhumPapel: resumoSemNada };
  }
  // Modelo: chance de um erro de 1 dígito num título de mesário passar no DV (todos os títulos de mesário do país).
  const modelo = { titulos: 0, trocas: 0, passam: 0 };
  for (const t of turnos) {
    for (const tit of mesariosPais[t]) {
      modelo.titulos++;
      for (let i = 0; i < 12; i++) {
        for (let dgt = 0; dgt < 10; dgt++) {
          if (tit.charCodeAt(i) - 48 === dgt) continue;
          modelo.trocas++;
          if (titulo(tit.slice(0, i) + dgt + tit.slice(i + 1))) modelo.passam++;
        }
      }
    }
    break; // um turno basta para o modelo
  }
  for (const t of turnos) {
    R[t].falhas = R[t].falhas.slice(0, 50);
    R[t].ancora.esperadoAcaso = Number(R[t].ancora.esperadoAcaso.toFixed(2));
    R[t].seqAssinaturas = Object.fromEntries(Object.entries(R[t].seqAssinaturas).sort((a, b) => b[1] - a[1]).slice(0, 40));
  }
  const saida = { ufs: ufsPorTurno, zonas: total, segundos: Math.round((Date.now() - inicio) / 1000), porTurno: R, nacional, modeloErroDeUmDigito: modelo };
  await mkdir(SAIDA, { recursive: true });
  const sufixo = `${turnos.join(',') === '1,2' ? '' : `-t${turnos.join('-')}`}${values.uf ? `-${values.uf.split(',').join('-')}` : ''}`;
  const json = trava(JSON.stringify(saida, null, 1));
  await writeFile(path.join(SAIDA, `resumo${sufixo}.json`), json);
  console.log(json.length > 20000 ? `${json.slice(0, 20000)}\n…` : json);
}

if (process.argv.includes('--filho')) await filho();
else if (import.meta.filename === path.resolve(process.argv[1] ?? '')) await principal();
