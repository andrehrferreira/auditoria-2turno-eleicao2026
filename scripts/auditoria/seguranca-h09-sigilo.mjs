// H09 (sigilo do voto): o que os arquivos públicos de urna permitem ligar entre voto, horário e pessoa.
// Uma passada por todos os pacotes de todas as seções de um turno (data/raw/<t>t/urnas/<uf>/<mun>/<zona>/<secao>/<hash>/),
// lendo o RDV (rdv.dat) e o log (log.jez, inclusive o log da urna original dentro do pacote de contingência).
//
// Parte 1, ordem do RDV × ordem de votação:
//   - cada lista de votos de um cargo no RDV está ordenada por (código do tipo de voto, digitação em ordem de texto)?
//     Se está, a ordem do arquivo é função só da quantidade de cada voto: qualquer ordem de chegada dos eleitores gera o
//     mesmo arquivo, e a posição no RDV não carrega informação sobre o horário.
//   - teste com a única pista de conteúdo que o log dá: "Atribuido voto nulo por suspensão [cargo]" marca, no horário, o
//     eleitor cujo voto naquele cargo é nuloAposSuspensao. Compara a posição desse voto no RDV com a posição do eleitor
//     na sequência de "O voto do eleitor foi computado" do dia. RDV na ordem de votação daria coincidência em 100%.
//   - conferência: nº de votos no RDV (cargo de 1 escolha) × nº de "O voto do eleitor foi computado" no dia.
// Parte 2, seções pequenas e votos distinguíveis (limite estrutural da publicação por seção, não falha): por seção e
//   cargo, eleitores, cargo unânime, voto único (comparecimento 1), votos que aparecem uma só vez (por tipo), voto
//   dissidente único, nulos com digitação única; e quantas dessas seções têm mesário que "é eleitor da seção" no dia.
// Parte 3, identificador de pessoa no log: toda sequência de 10 ou mais dígitos no texto das linhas, por mensagem
//   normalizada: tamanho, título com DV válido (12 dígitos), CPF com DV válido (11 dígitos), e se o título é de mesário
//   registrado na urna, de operador (gerou mídia) ou de ninguém com papel no log. Também o catálogo de mensagens dentro da
//   "janela do eleitor" (de "Identificador do eleitor digitado pelo mesário" a "O voto do eleitor foi computado" ou à volta
//   para "Aguardando digitação do identificador do eleitor"). Para os títulos sem papel, se o mesmo número volta em
//   outra janela da mesma urna (mesma pessoa digitando de novo) ou se cada janela traz um número diferente.
//   Controle positivo: os títulos de mesário ("Mesário <título> registrado").
//
// Nenhum número de título ou CPF é gravado: só contagens, mensagens normalizadas e o endereço da seção.
//
// Uso: node scripts/auditoria/seguranca-h09-sigilo.mjs --turno 2 [--uf ac,es] [--procs 6]
// Saída: data/parsed/auditoria/engenheiro-seguranca-urna/h09/<t>t/resumo.json, resumo.txt e notaveis.jsonl
//        (seções com cargo de até 9 eleitores ou unânime, e listas de RDV fora de ordem).
import { fork } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { decodificarArquivo } from '../../src/asn1.js';
import { DIR_DADOS } from '../../src/config.js';
import { TIPO_VOTO_RDV, arquivoRdv } from '../../src/esquemas.js';
import { acharArquivo } from '../../src/lacres.js';
import { hashDiretorio } from '../../src/vsc.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';
import { normalizar } from './seguranca-varrer-logs.mjs';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'engenheiro-seguranca-urna', 'h09');
const DIA = { 1: '04/10/2026', 2: '25/10/2026' };
const CODIGO_TIPO = Object.fromEntries(Object.entries(TIPO_VOTO_RDV).map(([k, v]) => [v, Number(k)]));
const CARGO_LOG = {
  Presidente: 'presidente', Governador: 'governador', Senador: 'senador', 'Deputado Federal': 'deputadoFederal',
  'Deputado Estadual': 'deputadoEstadual', 'Deputado Distrital': 'deputadoDistrital', Prefeito: 'prefeito', Vereador: 'vereador',
};
// Código da UF nos dígitos 9 e 10 do título (Res. TSE 21.538/2003); 28 = exterior.
const UF_TITULO = { sp: 1, mg: 2, rj: 3, rs: 4, ba: 5, pr: 6, ce: 7, pe: 8, sc: 9, go: 10, ma: 11, pb: 12, pa: 13, es: 14, pi: 15, rn: 16,
  al: 17, mt: 18, ms: 19, df: 20, se: 21, am: 22, ro: 23, ac: 24, ap: 25, rr: 26, to: 27, zz: 28 };

// ---------- dígitos verificadores ----------

/** Título de eleitor de 12 dígitos: 8 de sequência, 2 da UF (01–28) e 2 DVs (mód. 11; em SP e MG resto 0 vira 1). */
export function tituloValido(s) {
  if (!/^\d{12}$/.test(s)) return false;
  const d = [...s].map(Number);
  const uf = d[8] * 10 + d[9];
  if (uf < 1 || uf > 28) return false;
  const especial = uf === 1 || uf === 2;
  let soma = 0;
  for (let i = 0; i < 8; i++) soma += d[i] * (i + 2);
  const r1 = soma % 11;
  const dv1 = r1 === 10 ? 0 : r1 === 0 && especial ? 1 : r1;
  if (dv1 !== d[10]) return false;
  const r2 = (d[8] * 7 + d[9] * 8 + dv1 * 9) % 11;
  const dv2 = r2 === 10 ? 0 : r2 === 0 && especial ? 1 : r2;
  return dv2 === d[11];
}

/** CPF de 11 dígitos com os dois DVs válidos (sequências de um dígito só são recusadas). */
export function cpfValido(s) {
  if (!/^\d{11}$/.test(s) || /^(\d)\1{10}$/.test(s)) return false;
  const d = [...s].map(Number);
  const dv = (n) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += d[i] * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === d[9] && dv(10) === d[10];
}

// ---------- RDV ----------

const chaveVoto = (v) => `${v.tipoVoto}:${v.digitacao ?? ''}`;
const categoria = (tipo) => (tipo === 'nulo' || tipo === 'nuloPorRepeticao' ? 'nulo' : tipo);

/** Compara dois votos pela ordem descrita para o RDV publicado: código do tipo, depois digitação como texto. */
export function compararVotos(a, b) {
  const ta = CODIGO_TIPO[a.tipoVoto];
  const tb = CODIGO_TIPO[b.tipoVoto];
  if (ta !== tb) return ta - tb;
  const da = a.digitacao ?? '';
  const db = b.digitacao ?? '';
  return da < db ? -1 : da > db ? 1 : 0;
}

/** Listas de votos do RDV com o resultado do teste de ordem e a contagem por voto. */
export function analisarRdv(rdv) {
  const ele = rdv.rdv.eleicoes;
  const listas = [];
  for (const e of ele.eleicoesVota ?? ele.eleicoesSA ?? []) {
    const origem = ele.eleicoesVota ? 'urna' : `sa:${e.origemVotosSA}`;
    for (const c of e.votosCargos) {
      const cargo = c.idCargo.cargoConstitucional ?? `consulta:${c.idCargo.numeroCargoConsultaLivre}`;
      const votos = c.votos;
      let ordenada = true;
      let primeiraQuebra = null;
      let blocos = 0;
      const contagem = {};
      const posNuloSusp = [];
      for (let i = 0; i < votos.length; i++) {
        const k = chaveVoto(votos[i]);
        contagem[k] = (contagem[k] ?? 0) + 1;
        if (votos[i].tipoVoto === 'nuloAposSuspensao') posNuloSusp.push(i);
        if (i === 0 || k !== chaveVoto(votos[i - 1])) blocos++;
        if (i > 0 && ordenada && compararVotos(votos[i - 1], votos[i]) > 0) {
          ordenada = false;
          primeiraQuebra = { i, antes: chaveVoto(votos[i - 1]), depois: k };
        }
      }
      const distintos = Object.keys(contagem).length;
      listas.push({ eleicao: e.idEleicao, origem, cargo, escolhas: c.quantidadeEscolhas, n: votos.length, ordenada, agrupada: blocos === distintos,
        blocos, distintos, primeiraQuebra, contagem, posNuloSusp });
    }
  }
  return { tipoUrna: rdv.urna.tipoUrna, tipoArquivo: rdv.urna.tipoArquivo, listas };
}

// ---------- log ----------

const RE_MESARIO = /^(?:Mesário (\d+) (?:registrado|já registrado|é eleitor da seção|não é eleitor da seção)|Pedido de leitura da biometria do mesário (\d+))$/;
const RE_MESARIO_ELEITOR = /^Mesário (\d+) é eleitor da seção$/;
const RE_OPERADOR = /gerada? pelo usuário: (\d+)/;
const RE_LONGO = /\d{10,}/g;
const RE_AGRUPADO = /\b\d{4}[ .-]\d{4}[ .-]\d{4}\b/;
const RE_ID_TIPO = /^Identificador digitado pelo mesário foi: \((.+)\)$/;
const RE_NULO_SUSP = /^Atribuido voto nulo por suspensão \[(.+)\]$/;
// Janela do eleitor: do identificador digitado até o voto computado (ou até a urna voltar a aguardar identificador).
const INICIO_JANELA = 'Identificador do eleitor digitado pelo mesário';
const AGUARDANDO = 'Aguardando digitação do identificador do eleitor';
const FIM_JANELA = 'O voto do eleitor foi computado';

/** Quebra a linha do log em data/hora, nível, urna, aplicação e mensagem (sem a coluna final de 16 hex). */
function campos(linha) {
  const c = linha.split('\t');
  if (c.length >= 6 && /^[0-9A-F]{16}$/.test(c.at(-1))) return { ok: true, dh: c[0], nivel: c[1], app: c[3], msg: c.slice(4, -1).join('\t') };
  if (c.length >= 5) return { ok: true, dh: c[0], nivel: c[1], app: c[3], msg: c.slice(4).join('\t') };
  return { ok: false, dh: '', nivel: '?', app: '?', msg: linha };
}

const handleEmMemoria = (buffer) => ({
  read: async (destino, deslocamento, tamanho, posicao) => ({ bytesRead: buffer.copy(destino, deslocamento, posicao, posicao + tamanho) }),
  stat: async () => ({ size: buffer.length }),
});

/** Textos .dat do log.jez (e dos .jez aninhados, que são o log da urna original numa contingência). */
async function textosDeLog(handle, profundidade = 0) {
  const textos = [];
  for (const entrada of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, entrada);
    if (entrada.nome.endsWith('.dat')) textos.push({ profundidade, nome: entrada.nome, texto: dados.toString('latin1') });
    else if (entrada.nome.endsWith('.jez') && profundidade < 3) textos.push(...(await textosDeLog(handleEmMemoria(dados), profundidade + 1)));
  }
  return textos;
}

/**
 * Analisa os textos de log de um pacote. `acc` acumula o catálogo (mensagens com número longo e mensagens na janela do
 * eleitor). Devolve, para o pacote: votos computados no dia por texto, suspensões com nulo no dia (posição do eleitor),
 * mesários que são eleitores da seção, e os conjuntos de mensagens vistas (para contar seções).
 */
export function analisarLogs(textos, dia, acc) {
  const mesarios = new Set();
  const registrarMesario = (t) => {
    mesarios.add(t);
    acc._mesarios.add(t);
  };
  const operadores = new Set();
  const mesariosEleitoresDia = new Set();
  const linhasPorTexto = textos.map((t) => t.texto.split('\n').map((l) => campos(l.replace(/\r$/, ''))));
  for (const linhas of linhasPorTexto) {
    for (const l of linhas) {
      const m = RE_MESARIO.exec(l.msg);
      if (m) registrarMesario(m[1] ?? m[2]);
      const o = RE_OPERADOR.exec(l.msg);
      if (o) operadores.add(o[1]);
      const me = RE_MESARIO_ELEITOR.exec(l.msg);
      if (me && l.dh.startsWith(dia)) mesariosEleitoresDia.add(me[1]);
    }
  }
  const vistas = new Set();
  const computadosPorTexto = [];
  const suspensoes = [];
  const semPapelNumeros = new Map(); // número → { janelas, mensagens } (só neste pacote; nada sai do processo)
  const porPapelNaJanela = {}; // mensagem → { mesario|semPapel: Map(número → Set(janela)) }
  const marcarJanela = (k, papel, numero, janela) => {
    if (!janela) return;
    janela.titulos.add(`${k}\t${papel}`);
    const m = ((porPapelNaJanela[k] ??= {})[papel] ??= new Map());
    if (!m.has(numero)) m.set(numero, new Set());
    m.get(numero).add(janela.id);
  };
  let idJanela = 0;
  const fecharJanela = (janela) => {
    const tipo = janela.idTipo ?? 'sem tipo';
    acc.janelaIdTipo[tipo] = (acc.janelaIdTipo[tipo] ?? 0) + 1;
    for (const oc of janela.ocorrencias) {
      oc.idTipo = tipo;
      oc.nuloSusp = janela.nuloSusp;
      acc._semPapel.push(oc);
    }
    for (const c of janela.titulos) {
      const o = (acc.idTipoPorTitulo[c] ??= {});
      o[tipo] = (o[tipo] ?? 0) + 1;
    }
    if (janela.semPapel) acc.janelasComTituloSemPapel++;
    if (janela.semPapel && janela.nuloSusp) {
      acc.janelasTituloSemPapelComNuloSusp++;
      for (const k of janela.mensagensSemPapel) acc.porMensagem[k].semPapelComNuloSusp++;
    }
  };
  for (let t = 0; t < linhasPorTexto.length; t++) {
    let computados = 0;
    let janela = null; // { id, semPapel, nuloSusp, mensagensSemPapel }
    for (const l of linhasPorTexto[t]) {
      acc.linhas++;
      if (!l.ok) acc.linhasForaFormato++;
      const noDia = l.dh.startsWith(dia);
      if (janela && l.msg === AGUARDANDO) {
        fecharJanela(janela);
        janela = null;
      }
      if (l.msg === INICIO_JANELA) {
        if (janela) fecharJanela(janela);
        janela = { id: ++idJanela, semPapel: false, nuloSusp: false, mensagensSemPapel: new Set(), titulos: new Set(), idTipo: null, ocorrencias: [] };
        acc.janelas++;
      }
      if (janela && RE_ID_TIPO.test(l.msg)) janela.idTipo = RE_ID_TIPO.exec(l.msg)[1];
      if (janela) {
        const k = /\d/.test(l.msg) ? `${l.nivel}\t${l.app}\t${normalizar(l.msg)}` : `${l.nivel}\t${l.app}\t${l.msg}`;
        acc.janelaMensagens[k] = (acc.janelaMensagens[k] ?? 0) + 1;
      }
      const s = RE_NULO_SUSP.exec(l.msg);
      if (s && noDia) suspensoes.push({ texto: t, cargo: CARGO_LOG[s[1]] ?? `consulta:${s[1]}`, posicao: computados, janelaRef: janela });
      if (s && janela) janela.nuloSusp = true;
      const longos = l.msg.match(RE_LONGO);
      const agrupado = RE_AGRUPADO.test(l.msg);
      if (longos || agrupado) {
        const k = `${l.nivel}\t${l.app}\t${normalizar(l.msg)}`;
        const e = (acc.porMensagem[k] ??= { ocorrencias: 0, noDia: 0, tamanhos: {}, titulo12Valido: 0, tituloCurtoValido: 0, cpf11Valido: 0,
          agrupado12: 0, titulo12DvInvalido: 0, mesario: 0, operador: 0, semPapel: 0, semPapelNoDia: 0, semPapelMesmaUf: 0, semPapelNaJanela: 0,
          semPapelComNuloSusp: 0, semPapelNumeros: 0, semPapelNumerosVariasJanelas: 0, semPapelNumerosOutraMensagem: 0, secoes: 0, exemplosSemPapel: [] });
        vistas.add(k);
        if (agrupado) e.agrupado12++;
        for (const d of longos ?? []) {
          e.ocorrencias++;
          if (noDia) e.noDia++;
          e.tamanhos[d.length] = (e.tamanhos[d.length] ?? 0) + 1;
          if (d.length === 11 && cpfValido(d)) e.cpf11Valido++;
          // Título com 12 dígitos, ou digitado sem os zeros à esquerda (10 ou 11 dígitos).
          if (d.length < 10 || d.length > 12) continue;
          const t12 = d.padStart(12, '0');
          if (!tituloValido(t12)) {
            if (d.length === 12) e.titulo12DvInvalido++;
            continue;
          }
          if (d.length === 12) e.titulo12Valido++;
          else e.tituloCurtoValido++;
          if (mesarios.has(t12)) {
            e.mesario++;
            marcarJanela(k, 'mesario', t12, janela);
          } else if (operadores.has(t12)) e.operador++;
          else {
            e.semPapel++;
            if (noDia) e.semPapelNoDia++;
            if (Number(t12.slice(8, 10)) === acc.codigoUf) e.semPapelMesmaUf++;
            if (e.exemplosSemPapel.length < 20 && !e.exemplosSemPapel.includes(acc.onde)) e.exemplosSemPapel.push(acc.onde);
            const oc = { titulo: t12, mensagem: k, onde: acc.onde, noDia, idTipo: null, nuloSusp: false };
            if (janela) janela.ocorrencias.push(oc);
            else acc._semPapel.push(oc);
            const u = semPapelNumeros.get(t12) ?? { janelas: new Set(), mensagens: new Set() };
            semPapelNumeros.set(t12, u);
            u.mensagens.add(k);
            u.janelas.add(janela ? janela.id : 0);
            marcarJanela(k, 'semPapel', t12, janela);
            if (janela) {
              e.semPapelNaJanela++;
              janela.semPapel = true;
              janela.mensagensSemPapel.add(k);
            }
          }
        }
      }
      if (l.msg === FIM_JANELA) {
        if (noDia) computados++;
        if (janela) fecharJanela(janela);
        janela = null;
      }
    }
    if (janela) fecharJanela(janela);
    computadosPorTexto.push(computados);
  }
  for (const s of suspensoes) {
    s.comTituloSemPapel = Boolean(s.janelaRef?.semPapel);
    delete s.janelaRef;
  }
  // Urnas com 2+ janelas com título (por papel): um número só (mesma pessoa) ou um número diferente por janela.
  for (const [k, porPapel] of Object.entries(porPapelNaJanela)) {
    for (const [papel, m] of Object.entries(porPapel)) {
      const janelas = new Set();
      for (const js of m.values()) for (const j of js) janelas.add(j);
      if (janelas.size < 2) continue;
      const r = (acc.porMensagem[k].repeticao ??= {});
      const g = (r[papel] ??= { urnas2Janelas: 0, umNumero: 0, numeroDiferentePorJanela: 0, janelas: 0, numeros: 0 });
      g.urnas2Janelas++;
      g.janelas += janelas.size;
      g.numeros += m.size;
      if (m.size === 1) g.umNumero++;
      if (m.size === janelas.size && [...m.values()].every((js) => js.size === 1)) g.numeroDiferentePorJanela++;
    }
  }
  // Mesmo número sem papel em mais de uma janela (mesma pessoa digitando várias vezes) ou em outra mensagem do log.
  for (const u of semPapelNumeros.values()) {
    for (const k of u.mensagens) {
      const e = acc.porMensagem[k];
      e.semPapelNumeros++;
      if (u.janelas.size >= 2) e.semPapelNumerosVariasJanelas++;
      if (u.mensagens.size >= 2) e.semPapelNumerosOutraMensagem++;
    }
  }
  return { computadosPorTexto, suspensoes, mesariosEleitoresDia: mesariosEleitoresDia.size, vistas };
}

// ---------- seção ----------

async function pacotesDaSecao(dir) {
  let aux = null;
  try {
    aux = JSON.parse(await readFile(path.join(dir, 'aux.json'), 'utf8'));
  } catch {
    aux = null;
  }
  if (aux) return (aux.hashes ?? []).filter((h) => h.hash && h.hash !== '0' && (h.arq ?? []).some((a) => a.nm)).map((h) => h.hash);
  const ok = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const nomes = await readdir(path.join(dir, e.name));
    const v = acharArquivo(nomes, 'vsc');
    if (v && hashDiretorio(await readFile(path.join(dir, e.name, v))) === e.name) ok.push(e.name);
  }
  return ok;
}

const FAIXAS = [[1, '1'], [4, '2-4'], [9, '5-9'], [19, '10-19'], [49, '20-49'], [99, '50-99'], [Infinity, '100+']];
const faixa = (n) => FAIXAS.find(([lim]) => n <= lim)[1];
const inc = (o, k, n = 1) => {
  o[k] = (o[k] ?? 0) + n;
};

function novoAcumulador() {
  return {
    secoes: 0, secoesSemPacote: 0, secoesVariosPacotes: 0, pacotes: 0, pacotesSemRdv: 0, pacotesSemLog: 0, falhas: [],
    rdv: { listas: 0, ordenadas: 0, agrupadas: 0, vazias: 0, porOrigem: {}, porTipoUrna: {}, foraDeOrdem: [] },
    susp: { eventosDia: 0, comparaveis: 0, coincidencias: 0, excluidos: {}, comTituloSemPapel: 0 },
    contagem: { comparados: 0, iguais: 0, diferentes: 0, semVotoNoDiaNoLog: 0, exemplosDiferentes: [] },
    cargos: {}, porUf: {},
    linhas: 0, linhasForaFormato: 0, textos: 0, janelas: 0, janelasComTituloSemPapel: 0, janelasTituloSemPapelComNuloSusp: 0,
    porMensagem: {}, janelaMensagens: {}, janelaIdTipo: {}, idTipoPorTitulo: {}, _semPapel: [], _mesarios: new Set(),
  };
}

async function analisarSecao(turno, base, uf, municipio, zona, secao, acc, notaveis) {
  const dir = path.join(base, uf, municipio, zona, secao);
  const onde = `${uf}/${municipio}/${zona}/${secao}`;
  acc.secoes++;
  acc.onde = onde;
  acc.codigoUf = UF_TITULO[uf];
  const hs = await pacotesDaSecao(dir);
  if (!hs.length) acc.secoesSemPacote++;
  if (hs.length > 1) acc.secoesVariosPacotes++;
  const somaCargo = {}; // cargo → { escolhas, contagem }
  const vistasSecao = new Set();
  let mesariosEleitores = 0;
  for (const h of hs) {
    acc.pacotes++;
    const nomes = await readdir(path.join(dir, h));
    let r = null;
    let lg = null;
    try {
      const nRdv = acharArquivo(nomes, 'rdv');
      if (nRdv) r = analisarRdv(decodificarArquivo(arquivoRdv, await readFile(path.join(dir, h, nRdv))));
      else acc.pacotesSemRdv++;
      const nLog = acharArquivo(nomes, 'log');
      if (nLog) {
        const textos = await textosDeLog(handleEmMemoria(await readFile(path.join(dir, h, nLog))));
        acc.textos += textos.length;
        lg = analisarLogs(textos, DIA[turno], acc);
        for (const k of lg.vistas) vistasSecao.add(k);
        mesariosEleitores = Math.max(mesariosEleitores, lg.mesariosEleitoresDia);
      } else acc.pacotesSemLog++;
    } catch (erro) {
      acc.falhas.push(`${onde}/${h}: ${erro.message}`);
      continue;
    }
    if (r) {
      for (const L of r.listas) {
        acc.rdv.listas++;
        if (L.n === 0) acc.rdv.vazias++;
        if (L.ordenada) acc.rdv.ordenadas++;
        if (L.agrupada) acc.rdv.agrupadas++;
        const o = (acc.rdv.porOrigem[L.origem] ??= { listas: 0, ordenadas: 0, agrupadas: 0 });
        o.listas++;
        if (L.ordenada) o.ordenadas++;
        if (L.agrupada) o.agrupadas++;
        const tu = (acc.rdv.porTipoUrna[`${r.tipoUrna}/${r.tipoArquivo}`] ??= { listas: 0, ordenadas: 0 });
        tu.listas++;
        if (L.ordenada) tu.ordenadas++;
        if (!L.ordenada || !L.agrupada) {
          const reg = { tipo: 'rdvForaDeOrdem', onde, hash: h.slice(0, 16), tipoUrna: r.tipoUrna, tipoArquivo: r.tipoArquivo, origem: L.origem, cargo: L.cargo,
            n: L.n, ordenada: L.ordenada, agrupada: L.agrupada, blocos: L.blocos, distintos: L.distintos, primeiraQuebra: L.primeiraQuebra };
          notaveis.push(reg);
          if (acc.rdv.foraDeOrdem.length < 200) acc.rdv.foraDeOrdem.push(reg);
        }
        const s = (somaCargo[`${L.eleicao}|${L.cargo}`] ??= { cargo: L.cargo, escolhas: L.escolhas, contagem: {} });
        for (const [k, n] of Object.entries(L.contagem)) inc(s.contagem, k, n);
      }
    }
    // Conferência de contagem e teste da suspensão: só pacote da urna (não SA) com um único texto com votos no dia.
    if (r && lg && !r.listas.some((L) => L.origem.startsWith('sa:'))) {
      const comVotos = lg.computadosPorTexto.filter((n) => n > 0).length;
      const umaEscolha = r.listas.find((L) => L.escolhas === 1 && !L.cargo.startsWith('consulta:'));
      const totalLog = lg.computadosPorTexto.reduce((a, b) => a + b, 0);
      if (umaEscolha) {
        acc.contagem.comparados++;
        if (totalLog === umaEscolha.n) acc.contagem.iguais++;
        else {
          acc.contagem.diferentes++;
          if (totalLog === 0) acc.contagem.semVotoNoDiaNoLog++;
          if (acc.contagem.exemplosDiferentes.length < 100) acc.contagem.exemplosDiferentes.push(`${onde}/${h.slice(0, 12)} rdv=${umaEscolha.n} log=${totalLog} textos=${lg.computadosPorTexto.join('+')}`);
        }
      }
      for (const s of lg.suspensoes) {
        acc.susp.eventosDia++;
        if (s.comTituloSemPapel) acc.susp.comTituloSemPapel++;
        const L = r.listas.find((x) => x.cargo === s.cargo && x.escolhas === 1);
        if (!L) inc(acc.susp.excluidos, s.cargo.startsWith('consulta:') ? 'consulta (plebiscito)' : 'cargo sem lista de 1 escolha no RDV');
        else if (comVotos > 1) inc(acc.susp.excluidos, 'votos em mais de um log no pacote (contingência)');
        else if (totalLog !== L.n) inc(acc.susp.excluidos, 'nº de votos do log difere do RDV');
        else {
          acc.susp.comparaveis++;
          if (L.posNuloSusp.includes(s.posicao)) acc.susp.coincidencias++;
        }
      }
    }
  }
  for (const k of vistasSecao) acc.porMensagem[k].secoes++;

  // Parte 2: votos distinguíveis por seção e cargo (soma dos pacotes da seção).
  const pequenos = [];
  for (const s of Object.values(somaCargo)) {
    const valores = Object.entries(s.contagem);
    const n = valores.reduce((a, [, c]) => a + c, 0);
    if (n === 0) continue;
    const eleitores = Math.round(n / s.escolhas);
    const g = (acc.cargos[s.cargo] ??= { secoes: 0, faixas: {}, eleitores: 0, n1: 0, n1ComMesarioEleitor: 0, unanimes: 0, eleitoresUnanimes: 0,
      unanimesComMesarioEleitor: 0, unanimesPorFaixa: {}, dissidenteUnico: 0, secoesComSingleton: 0, singletons: {}, votosNulo: 0,
      nulosComDigitacao: 0, nulosDigitacaoSingleton: 0, secoesComNuloSingleton: 0, nuloAposSuspensao: 0, secoesComNuloAposSuspensao: 0 });
    g.secoes++;
    g.eleitores += eleitores;
    inc(g.faixas, faixa(eleitores));
    if (eleitores === 1) {
      g.n1++;
      if (mesariosEleitores) g.n1ComMesarioEleitor++;
    }
    const unanime = valores.length === 1;
    if (unanime) {
      g.unanimes++;
      g.eleitoresUnanimes += eleitores;
      inc(g.unanimesPorFaixa, faixa(eleitores));
      if (mesariosEleitores) g.unanimesComMesarioEleitor++;
      const u = (acc.porUf[uf] ??= {});
      const uc = (u[s.cargo] ??= { unanimes: 0, eleitoresUnanimes: 0, n1: 0 });
      uc.unanimes++;
      uc.eleitoresUnanimes += eleitores;
      if (eleitores === 1) uc.n1++;
    }
    if (valores.length === 2 && Math.min(valores[0][1], valores[1][1]) === 1 && n >= 3) g.dissidenteUnico++;
    let temSingleton = false;
    let temNuloSingleton = false;
    for (const [k, c] of valores) {
      const tipo = k.slice(0, k.indexOf(':'));
      const dig = k.slice(k.indexOf(':') + 1);
      if (categoria(tipo) === 'nulo') {
        g.votosNulo += c;
        if (dig) g.nulosComDigitacao += c;
        if (dig && c === 1 && n >= 2) {
          g.nulosDigitacaoSingleton++;
          temNuloSingleton = true;
        }
      }
      if (tipo === 'nuloAposSuspensao') g.nuloAposSuspensao += c;
      if (c === 1 && n >= 2) {
        inc(g.singletons, categoria(tipo));
        temSingleton = true;
      }
    }
    if (temSingleton) g.secoesComSingleton++;
    if (temNuloSingleton) g.secoesComNuloSingleton++;
    if (s.contagem['nuloAposSuspensao:']) g.secoesComNuloAposSuspensao++;
    if (eleitores <= 9 || unanime) pequenos.push({ cargo: s.cargo, eleitores, distintos: valores.length, unanime });
  }
  if (pequenos.length) notaveis.push({ tipo: 'secaoPequenaOuUnanime', onde, pacotes: hs.length, mesariosEleitoresDia: mesariosEleitores, cargos: pequenos });
}

// ---------- processos ----------

function juntar(a, b) {
  for (const [k, v] of Object.entries(b)) {
    if (k === 'onde' || k === 'codigoUf' || k.startsWith('_')) continue;
    if (typeof v === 'number') a[k] = (a[k] ?? 0) + v;
    else if (Array.isArray(v)) {
      a[k] ??= [];
      for (const x of v) if (a[k].length < (k === 'falhas' ? 1e6 : 200)) a[k].push(x);
    } else if (v && typeof v === 'object') juntar((a[k] ??= {}), v);
  }
  return a;
}

async function filho() {
  const turno = Number(process.env.H09_TURNO);
  const base = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas');
  process.on('message', async ({ uf, municipio, zona }) => {
    const acc = novoAcumulador();
    const notaveis = [];
    let secoes = [];
    try {
      secoes = (await readdir(path.join(base, uf, municipio, zona), { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
    } catch (erro) {
      acc.falhas.push(`${uf}/${municipio}/${zona}: ${erro.message}`);
    }
    for (const secao of secoes) {
      try {
        await analisarSecao(turno, base, uf, municipio, zona, secao, acc, notaveis);
      } catch (erro) {
        acc.falhas.push(`${uf}/${municipio}/${zona}/${secao}: ${erro.message}`);
      }
    }
    delete acc.onde;
    delete acc.codigoUf;
    const semPapel = acc._semPapel;
    const mesarios = [...acc._mesarios];
    delete acc._semPapel;
    delete acc._mesarios;
    process.send({ acc, notaveis, semPapel, mesarios, zona: `${uf}/${municipio}/${zona}` });
  });
  process.send({ pronto: true });
}

/**
 * Trava de saída: número de 10 a 12 dígitos com DV de título ou de CPF válido é trocado por "[removido]" antes de
 * gravar (a varredura não deve produzir nenhum; o aviso diz onde apareceu).
 */
export function conferirSemIdentificador(texto, onde) {
  let n = 0;
  const limpo = texto.replace(/(?<![0-9A-Fa-f])\d{10,12}(?![0-9A-Fa-f])/g, (d) => (tituloValido(d.padStart(12, '0')) || cpfValido(d) ? (n++, '[removido]') : d));
  if (n) console.error(`aviso: ${n} número(s) com cara de título ou CPF removido(s) de ${onde}`);
  return limpo;
}

const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(3)}%` : '—');
const milhar = (n) => n.toLocaleString('pt-BR');

function relatorio(turno, r) {
  const L = [];
  L.push(`H09 sigilo, ${turno}º turno: ${milhar(r.secoes)} seções, ${milhar(r.pacotes)} pacotes, ${milhar(r.textos)} textos de log, ${milhar(r.linhas)} linhas, ${r.falhas.length} falhas de leitura, ${r.segundos} s`);
  L.push(`Seções sem pacote: ${r.secoesSemPacote}; com mais de um pacote: ${r.secoesVariosPacotes}; pacotes sem RDV: ${r.pacotesSemRdv}; sem log: ${r.pacotesSemLog}`);
  L.push('');
  L.push('PARTE 1. Ordem do RDV');
  L.push(`Listas (cargo × pacote): ${milhar(r.rdv.listas)}; ordenadas (tipo, digitação): ${milhar(r.rdv.ordenadas)} (${pct(r.rdv.ordenadas, r.rdv.listas)}); agrupadas: ${milhar(r.rdv.agrupadas)}; vazias: ${r.rdv.vazias}`);
  for (const [k, o] of Object.entries(r.rdv.porOrigem)) L.push(`  origem ${k}: ${milhar(o.listas)} listas, ${milhar(o.ordenadas)} ordenadas, ${milhar(o.agrupadas)} agrupadas`);
  for (const [k, o] of Object.entries(r.rdv.porTipoUrna)) L.push(`  urna ${k}: ${milhar(o.listas)} listas, ${milhar(o.ordenadas)} ordenadas`);
  for (const f of r.rdv.foraDeOrdem.slice(0, 30)) L.push(`  fora de ordem: ${JSON.stringify(f)}`);
  L.push(`Suspensão com nulo no dia: ${r.susp.eventosDia} eventos; comparáveis ${r.susp.comparaveis}; posição no RDV = posição no log: ${r.susp.coincidencias}; com título sem papel na mesma janela: ${r.susp.comTituloSemPapel}`);
  for (const [k, n] of Object.entries(r.susp.excluidos)) L.push(`  excluídos (${k}): ${n}`);
  L.push(`Votos no RDV (cargo de 1 escolha) × "voto computado" no dia: ${milhar(r.contagem.comparados)} pacotes, iguais ${milhar(r.contagem.iguais)}, diferentes ${r.contagem.diferentes} (log sem voto no dia: ${r.contagem.semVotoNoDiaNoLog})`);
  for (const e of r.contagem.exemplosDiferentes.slice(0, 20)) L.push(`  ${e}`);
  L.push('');
  L.push('PARTE 2. Votos distinguíveis por seção e cargo');
  for (const [c, g] of Object.entries(r.cargos)) {
    L.push(`${c}: ${milhar(g.secoes)} seções, ${milhar(g.eleitores)} eleitores; faixas ${JSON.stringify(g.faixas)}`);
    L.push(`  comparecimento 1: ${g.n1} (com mesário eleitor da seção: ${g.n1ComMesarioEleitor}); unânimes: ${g.unanimes} seções, ${milhar(g.eleitoresUnanimes)} eleitores, por faixa ${JSON.stringify(g.unanimesPorFaixa)}; com mesário eleitor da seção: ${g.unanimesComMesarioEleitor}`);
    L.push(`  dissidente único (2 valores, um com 1 voto, n>=3): ${milhar(g.dissidenteUnico)}; seções com algum voto que aparece 1 vez: ${milhar(g.secoesComSingleton)}; por tipo ${JSON.stringify(g.singletons)}`);
    L.push(`  nulos: ${milhar(g.votosNulo)}, com digitação ${milhar(g.nulosComDigitacao)}, digitação de nulo única na seção ${milhar(g.nulosDigitacaoSingleton)} em ${milhar(g.secoesComNuloSingleton)} seções; nuloAposSuspensao ${g.nuloAposSuspensao} em ${g.secoesComNuloAposSuspensao} seções`);
  }
  L.push('');
  L.push('PARTE 3. Números de 10+ dígitos no log, por mensagem (sem os números)');
  L.push(`Janelas do eleitor: ${milhar(r.janelas)}; com título sem papel dentro: ${r.janelasComTituloSemPapel}; dessas, com nulo por suspensão: ${r.janelasTituloSemPapelComNuloSusp}; linhas fora do formato: ${r.linhasForaFormato}`);
  const msgs = Object.entries(r.porMensagem).sort((a, b) => b[1].ocorrencias - a[1].ocorrencias);
  for (const [k, e] of msgs) {
    const { exemplosSemPapel, ...resto } = e;
    L.push(`${k.replace(/\t/g, ' | ')} :: ${JSON.stringify(resto)}${e.semPapel ? ` ex: ${exemplosSemPapel.slice(0, 5).join(' ')}` : ''}`);
  }
  L.push('');
  L.push(`Títulos sem papel × mesários registrados em todo o país (${milhar(r.mesariosNoPais)} títulos de mesário):`);
  for (const [k, c] of Object.entries(r.cruzamentoSemPapel ?? {})) L.push(`  ${k.replace(/\t/g, ' | ')} :: ${JSON.stringify(c)}`);
  L.push(`Tipo de identificador do eleitor, todas as janelas: ${JSON.stringify(r.janelaIdTipo)}`);
  L.push('Tipo de identificador do eleitor nas janelas com título, por mensagem e papel:');
  for (const [k, o] of Object.entries(r.idTipoPorTitulo)) L.push(`  ${k.replace(/\t/g, ' | ')} :: ${JSON.stringify(o)}`);
  L.push('');
  L.push('Mensagens na janela do eleitor (nível | aplicação | mensagem normalizada): eventos');
  for (const [k, n] of Object.entries(r.janelaMensagens).sort((a, b) => b[1] - a[1])) L.push(`${n}\t${k.replace(/\t/g, ' | ')}`);
  return L.join('\n');
}

async function principal() {
  const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, uf: { type: 'string' }, procs: { type: 'string', default: '6' } } });
  const turno = Number(values.turno);
  const procs = Math.min(8, Math.max(1, Number(values.procs)));
  const base = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas');
  const dirSaida = path.join(SAIDA, `${turno}t`);
  await mkdir(dirSaida, { recursive: true });
  const subdirs = async (d) => (await readdir(d, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  const ufs = values.uf ? values.uf.split(',') : await subdirs(base);
  const fila = [];
  for (const uf of ufs) for (const municipio of await subdirs(path.join(base, uf))) for (const zona of await subdirs(path.join(base, uf, municipio))) fila.push({ uf, municipio, zona });
  const total = fila.length;
  const sufixo = values.uf ? `-${ufs.join('-')}` : '';
  const saida = createWriteStream(path.join(dirSaida, `notaveis${sufixo}.jsonl`));
  const resumo = novoAcumulador();
  delete resumo.onde;
  delete resumo.codigoUf;
  const mesarioZonas = new Map(); // título → zonas onde é mesário registrado (só em memória)
  const semPapelPais = [];
  const inicio = Date.now();
  let feitas = 0;
  await new Promise((resolve) => {
    let ativos = 0;
    for (let i = 0; i < Math.min(procs, fila.length); i++) {
      ativos++;
      const f = fork(import.meta.filename, ['--filho'], { env: { ...process.env, H09_TURNO: String(turno) } });
      const proximo = () => {
        const u = fila.shift();
        if (u) f.send(u);
        else f.disconnect();
      };
      f.on('message', (m) => {
        if (m.pronto) return proximo();
        juntar(resumo, m.acc);
        for (const t of m.mesarios) {
          if (!mesarioZonas.has(t)) mesarioZonas.set(t, new Set());
          mesarioZonas.get(t).add(m.zona);
        }
        for (const oc of m.semPapel) semPapelPais.push(oc);
        for (const n of m.notaveis) saida.write(conferirSemIdentificador(`${JSON.stringify(n)}\n`, 'notaveis'));
        if (++feitas % 200 === 0) console.error(`${feitas}/${total} zonas, ${Math.round((Date.now() - inicio) / 1000)} s`);
        proximo();
      });
      f.on('exit', () => {
        if (--ativos === 0) resolve();
      });
    }
  });
  await new Promise((ok) => saida.end(ok));
  // Cruzamento nacional: o título sem papel na urna é mesário registrado em alguma urna do país (do mesmo turno)?
  const cruz = {};
  for (const oc of semPapelPais) {
    const zonaOc = oc.onde.split('/').slice(0, 3).join('/');
    const zonas = mesarioZonas.get(oc.titulo);
    const classe = !zonas ? 'naoMesarioNoPais' : zonas.has(zonaOc) ? 'mesarioMesmaZona' : 'mesarioOutraZona';
    const c = (cruz[oc.mensagem] ??= { ocorrencias: 0, naoMesarioNoPais: 0, mesarioMesmaZona: 0, mesarioOutraZona: 0, porIdTipo: {}, comNuloSusp: {}, noDia: {} });
    c.ocorrencias++;
    c[classe]++;
    const t = (c.porIdTipo[oc.idTipo ?? 'fora da janela'] ??= {});
    t[classe] = (t[classe] ?? 0) + 1;
    if (oc.nuloSusp) c.comNuloSusp[classe] = (c.comNuloSusp[classe] ?? 0) + 1;
    if (oc.noDia) c.noDia[classe] = (c.noDia[classe] ?? 0) + 1;
  }
  resumo.cruzamentoSemPapel = cruz;
  resumo.mesariosNoPais = mesarioZonas.size;
  resumo.segundos = Math.round((Date.now() - inicio) / 1000);
  resumo.zonas = total;
  resumo.ufs = ufs;
  await writeFile(path.join(dirSaida, `resumo${sufixo}.json`), conferirSemIdentificador(JSON.stringify(resumo, null, 1), 'resumo.json'));
  const txt = relatorio(turno, resumo);
  await writeFile(path.join(dirSaida, `resumo${sufixo}.txt`), conferirSemIdentificador(txt, 'resumo.txt'));
  console.log(txt.split('\n').slice(0, 60).join('\n'));
}

if (process.argv.includes('--filho')) await filho();
else if (import.meta.filename === path.resolve(process.argv[1] ?? '')) await principal();
