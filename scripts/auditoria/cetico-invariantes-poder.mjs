// Cético, achado "invariantes sem violação" (matemático forense), foco 1: PODER dos invariantes I1–I5 e do ciclo do log.
// Copia 1 pacote real do 2º turno, aplica alterações controladas numa CÓPIA (nunca no bruto) e roda sobre ela
// exatamente a lógica do autor (conferirCadeia, violacoes, cicloLog e linhasPorUrna importados de
// matematico-brutos.mjs; cargosBu, cargosRdv e perfilLog copiados dele sem mudança, porque não são exportados) e,
// à parte, a verificação de assinatura (src/lacres.js) e uma comparação BU × RDV por candidato que o autor não faz.
//
// Cenários:
//   C0 controle: sem alteração
//   C1 BU: +1 voto para um candidato, cadeia NÃO recalculada (alteração ingênua)
//   C2 BU: 1 voto passa do candidato B para o A (soma igual), cadeia e último hash RECALCULADOS (adversário)
//   C3 BU: +1 voto e +1 comparecimento (topo, por eleição e detalhamento), cadeia recalculada; RDV e log intactos
//   C4 RDV: 1 registro trocado de B para A (nº de registros igual); BU intacto
//   C5 BU e RDV juntos: C2 + C4 (troca coerente nos dois arquivos)
//   C6 enchimento completo: C3 + 1 registro a mais no RDV por cargo (DER re-serializado) + 1 ciclo de eleitor
//      inserido no texto do log (em memória, com hash de linha inventado)
//
// Uso: node scripts/auditoria/cetico-invariantes-poder.mjs [--dir <diretório do hash do pacote>]
// Saída: data/parsed/auditoria/cetico/invariantes/poder.json e as cópias alteradas em .../invariantes/poder/<cenário>/
import { createHash } from 'node:crypto';
import { mkdir, open, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { decodificarArquivo } from '../../src/asn1.js';
import { DIR_DADOS } from '../../src/config.js';
import { CARGO_CONSTITUCIONAL, arquivoBu, arquivoRdv } from '../../src/esquemas.js';
import { acharArquivo, carregarAcs, lerBu, verificarLacres } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';
import { cicloLog, conferirCadeia, linhasPorUrna, violacoes } from './matematico-brutos.mjs';

const { values } = parseArgs({ options: {
  dir: { type: 'string', default: path.join(DIR_DADOS, 'raw', '2t', 'urnas', 'ac', '01007', '0009', '0001') },
} });
const DIA = '25/10/2026';
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'invariantes');

// ---- cópias verbatim de matematico-brutos.mjs (não exportadas lá) ----
const CODIGO_CARGO = Object.fromEntries(Object.entries(CARGO_CONSTITUCIONAL).map(([n, nome]) => [nome, Number(n)]));
const codigoDoCargo = (c) => (c?.cargoConstitucional ? CODIGO_CARGO[c.cargoConstitucional] : c?.numeroCargoConsultaLivre) ?? null;
function cargosBu(buDec) {
  const cargos = [];
  for (const e of buDec.resultadosVotacaoPorEleicao) {
    for (const rv of e.resultadosVotacao) {
      for (const tvc of rv.totaisVotosCargo) {
        cargos.push({ e: e.idEleicao, c: codigoDoCargo(tvc.codigoCargo), tipo: rv.tipoCargo, comp: rv.qtdComparecimento, soma: tvc.votosVotaveis.reduce((s, v) => s + v.quantidadeVotos, 0) });
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
function perfilLogDeTextos(textos, dia) {
  const c = {
    logs: textos.length, habilitados: 0, computados: 0, suspensoSemVoto: 0, interrompidas: 0, habilitacaoSemDesfecho: 0,
    computadoSemHabilitacao: 0, suspensoSemHabilitacao: 0, confirmacaoForaDeCiclo: 0, parcialSuspenso: 0, votacaoSuspensa: 0,
    confirmados: {}, nulosSuspensao: {}, confirmadosDescartados: {},
  };
  const porUrna = linhasPorUrna(textos, dia);
  c.urnas = porUrna.length;
  for (const t of porUrna) cicloLog(t, dia, c);
  return c;
}

// ---- DER com deslocamentos, para alterar a cópia no lugar ou re-serializar ----
function der(b, ini = 0, fim = b.length) {
  const nos = [];
  for (let p = ini; p < fim;) {
    const tag = b[p];
    let q = p + 1;
    let L = b[q++];
    if (L & 0x80) { const n = L & 0x7f; L = 0; for (let k = 0; k < n; k++) L = L * 256 + b[q++]; }
    const no = { tag, valor: b.subarray(q, q + L) };
    if (tag & 0x20) no.filhos = der(b, q, q + L);
    nos.push(no);
    p = q + L;
  }
  return nos;
}
const comprimento = (n) => (n < 0x80 ? Buffer.from([n]) : n < 0x100 ? Buffer.from([0x81, n]) : n < 0x10000 ? Buffer.from([0x82, n >> 8, n & 0xff]) : Buffer.from([0x83, n >> 16, (n >> 8) & 0xff, n & 0xff]));
function serializar(no) {
  const conteudo = no.filhos ? Buffer.concat(no.filhos.map(serializar)) : Buffer.from(no.valor);
  return Buffer.concat([Buffer.from([no.tag]), comprimento(conteudo.length), conteudo]);
}
const inteiro = (v) => v.reduce((a, x) => a * 256 + x, 0);
function gravarInteiro(view, n) {
  const bytes = [];
  for (let x = n; ; x = Math.floor(x / 256)) { bytes.unshift(x & 0xff); if (x < 256) break; }
  if (bytes[0] & 0x80) bytes.unshift(0);
  if (bytes.length !== view.length) throw new Error(`inteiro ${n} muda de tamanho (${view.length} → ${bytes.length}); escolha outro valor`);
  Buffer.from(bytes).copy(view);
}
const sha512 = (b) => createHash('sha512').update(b).digest();
const zeros = (n, w) => String(n).padStart(w, '0');

/** Nós do BU (views sobre `buf`): por eleição, os votáveis com quantidade/hash e o comparecimento por resultado. */
function nosBu(buf) {
  const envelope = der(buf)[0];
  const conteudo = envelope.filhos.find((n) => n.tag === 0x04);
  const bu = der(conteudo.valor)[0];
  const porEleicao = bu.filhos.find((n) => n.tag === 0x30 && n.filhos?.[0]?.filhos?.length === 7).filhos;
  return {
    comparecimento: bu.filhos[6],
    detalhamento: bu.filhos[7]?.tag === 0xa1 ? bu.filhos[7] : null,
    eleicoes: porEleicao.map((e) => ({
      id: inteiro(e.filhos[0].valor),
      ultimoHash: e.filhos[5],
      resultados: e.filhos[4].filhos.map((rv) => ({
        comp: rv.filhos[1],
        cargos: rv.filhos[2].filhos.map((tvc) => ({
          codigo: inteiro(tvc.filhos[0].valor),
          votaveis: tvc.filhos[2].filhos.map((vv) => {
            const ident = vv.filhos.find((n) => n.tag === 0xa3);
            return { tipo: inteiro(vv.filhos.find((n) => n.tag === 0x81).valor), qtd: vv.filhos.find((n) => n.tag === 0x82), partido: ident ? inteiro(ident.filhos[0].valor) : null, numero: ident ? inteiro(ident.filhos[1].valor) : null, hash: vv.filhos.at(-1) };
          }),
        })),
      })),
    })),
  };
}
/** Recalcula, como um adversário, a cadeia de hashes e o último hash de todas as eleições (escreve na cópia). */
function recalcularCadeia(buf) {
  const cab = lerBu(buf).cabecalho;
  for (const e of nosBu(buf).eleicoes) {
    let h = sha512(Buffer.from(`${zeros(cab.pleito, 5)}|${zeros(e.id, 5)}|${zeros(cab.municipio, 5)}|${zeros(cab.zona, 4)}|${zeros(cab.secao, 4)}|${cab.codigoCarga}`, 'latin1')).toString('hex').toUpperCase();
    for (const rv of e.resultados) {
      for (const cargo of rv.cargos) {
        cargo.votaveis.forEach((v, i) => {
          const base = `${h}|${i + 1}|${cargo.codigo}|${v.tipo}|${inteiro(v.qtd.valor)}`;
          h = sha512(Buffer.from(v.numero === null ? base : `${base}|${v.numero}|${v.partido}`, 'latin1')).toString('hex').toUpperCase();
          Buffer.from(h, 'hex').copy(v.hash.valor);
        });
      }
    }
    Buffer.from(h, 'hex').copy(e.ultimoHash.valor);
  }
}
const votavel = (buf, cargo, numero) => {
  for (const e of nosBu(buf).eleicoes) for (const rv of e.resultados) for (const c of rv.cargos) if (c.codigo === cargo) {
    const v = c.votaveis.find((x) => x.numero === numero);
    if (v) return v;
  }
  throw new Error(`votável ${cargo}/${numero} não achado`);
};
const somar = (view, d) => gravarInteiro(view.valor, inteiro(view.valor) + d);

// RDV: lista de votos (nós) de cada cargo
function votosRdv(raiz) {
  const eleicoes = raiz.filhos[2].filhos[4].filhos; // [1] eleicoesVota → SEQUENCE OF eleição
  const out = [];
  for (const e of eleicoes) for (const vc of e.filhos[1].filhos) out.push({ eleicao: inteiro(e.filhos[0].valor), cargo: inteiro(vc.filhos[0].valor), lista: vc.filhos[2] });
  return out;
}
function trocarRegistroRdv(buf, cargo, de, para) {
  const raiz = der(buf)[0];
  for (const vc of votosRdv(raiz)) if (vc.cargo === cargo) {
    const v = vc.lista.filhos.find((x) => x.filhos[1]?.valor.toString('latin1') === de);
    if (!v) break;
    if (de.length !== para.length) throw new Error('digitação de tamanho diferente');
    Buffer.from(para, 'latin1').copy(v.filhos[1].valor);
    return;
  }
  throw new Error(`registro ${de} do cargo ${cargo} não achado no RDV`);
}
/** Acrescenta a cada cargo um registro igual ao primeiro existente com a digitação `porCargo[cargo]` (ou o 1º registro). */
function acrescentarRegistrosRdv(buf, porCargo) {
  const raiz = der(buf)[0];
  for (const vc of votosRdv(raiz)) {
    const alvo = porCargo[vc.cargo];
    const modelo = vc.lista.filhos.find((x) => (alvo ? x.filhos[1]?.valor.toString('latin1') === alvo : true));
    vc.lista.filhos.push({ ...modelo, filhos: modelo.filhos.map((f) => ({ ...f, valor: Buffer.from(f.valor) })) });
  }
  return serializar(raiz);
}
/** BU × RDV por (cargo, número): o que o autor NÃO compara (I5 só compara o conjunto de cargos). */
function buXrdv(buBytes, rdvBytes) {
  const difs = [];
  const bu = decodificarArquivo(arquivoBu, buBytes).conteudo;
  const rdv = decodificarArquivo(arquivoRdv, rdvBytes);
  const contBu = new Map();
  for (const e of bu.resultadosVotacaoPorEleicao) for (const rv of e.resultadosVotacao) for (const tvc of rv.totaisVotosCargo) {
    for (const v of tvc.votosVotaveis) {
      const num = v.identificacaoVotavel ? String(v.identificacaoVotavel.codigo) : v.tipoVoto;
      contBu.set(`${e.idEleicao}|${codigoDoCargo(tvc.codigoCargo)}|${num}`, v.quantidadeVotos);
    }
  }
  const contRdv = new Map();
  for (const e of rdv.rdv.eleicoes.eleicoesVota ?? []) for (const vc of e.votosCargos) for (const v of vc.votos) {
    const num = v.tipoVoto === 'nominal' || v.tipoVoto === 'legenda' ? String(Number(v.digitacao)) : v.tipoVoto;
    const k = `${e.idEleicao}|${codigoDoCargo(vc.idCargo)}|${num}`;
    contRdv.set(k, (contRdv.get(k) ?? 0) + 1);
  }
  for (const k of new Set([...contBu.keys(), ...contRdv.keys()])) if ((contBu.get(k) ?? 0) !== (contRdv.get(k) ?? 0)) difs.push(`${k}: BU ${contBu.get(k) ?? 0} RDV ${contRdv.get(k) ?? 0}`);
  return difs;
}

// ---- leitura do pacote real ----
let dirHash = values.dir;
const subs = (await readdir(dirHash, { withFileTypes: true })).filter((d) => d.isDirectory());
if (subs.length) dirHash = path.join(dirHash, subs[0].name);
const nomes = await readdir(dirHash);
const nome = (t) => acharArquivo(nomes, t);
const original = {
  bu: await readFile(path.join(dirHash, nome('bu'))), rdv: await readFile(path.join(dirHash, nome('rdv'))),
  log: await readFile(path.join(dirHash, nome('log'))), vsc: await readFile(path.join(dirHash, nome('vsc'))),
  imgbu: await readFile(path.join(dirHash, nome('imgbu'))),
};
const memoria = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
async function textosDeLog(handle, prof = 0) {
  const textos = [];
  for (const entrada of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, entrada);
    if (entrada.nome === 'logd.dat') textos.push(dados.toString('latin1'));
    else if (entrada.nome.endsWith('.jez') && prof < 3) textos.push(...(await textosDeLog(memoria(dados), prof + 1)));
  }
  return textos;
}
const textosOriginais = await textosDeLog(memoria(original.log));
const acs = await carregarAcs();

// Candidatos: no BU real, o mais e o menos votado do 1º cargo com 2 nominais
const buDec0 = decodificarArquivo(arquivoBu, original.bu).conteudo;
const rv0 = buDec0.resultadosVotacaoPorEleicao[0].resultadosVotacao[0].totaisVotosCargo[0];
const cargoAlvo = codigoDoCargo(rv0.codigoCargo);
const nominais = rv0.votosVotaveis.filter((v) => v.identificacaoVotavel).sort((a, b) => a.quantidadeVotos - b.quantidadeVotos);
const A = nominais[0].identificacaoVotavel.codigo; // recebe o voto
const B = nominais.at(-1).identificacaoVotavel.codigo; // perde o voto

function injetarCicloNoLog(textos) {
  // um ciclo de eleitor inteiro antes do início do encerramento, com hash de linha inventado
  return textos.map((t, i) => {
    if (i !== 0) return t;
    const linhas = t.split('\n');
    const k = linhas.findIndex((l) => l.startsWith(DIA) && (l.split('\t')[4] ?? '').startsWith('Inicio do Encerramento'));
    const [dh, , urna] = linhas[k].split('\t');
    const cargos = [...new Set(buDec0.resultadosVotacaoPorEleicao.flatMap((e) => e.resultadosVotacao.flatMap((r) => r.totaisVotosCargo.map((c) => c.codigoCargo.cargoConstitucional))))];
    const nomeLog = { presidente: 'Presidente', governador: 'Governador', senador: 'Senador', deputadoFederal: 'Deputado Federal', deputadoEstadual: 'Deputado Estadual' };
    const novas = ['Eleitor foi habilitado', ...cargos.map((c) => `Voto confirmado para [${nomeLog[c] ?? c}]`), 'O voto do eleitor foi computado']
      .map((m) => `${dh}\tINFO\t${urna}\tVOTA\t${m}\t0123456789ABCDEF`);
    linhas.splice(k, 0, ...novas);
    return linhas.join('\n');
  });
}

const cenarios = {
  C0: { descricao: 'controle, sem alteração', f: (x) => x },
  C1: { descricao: `BU: +1 voto para ${A} no cargo ${cargoAlvo}, cadeia não recalculada`, f: (x) => { somar(votavel(x.bu, cargoAlvo, A).qtd, 1); return x; } },
  C2: { descricao: `BU: 1 voto de ${B} para ${A} (soma igual), cadeia e último hash recalculados`, f: (x) => { somar(votavel(x.bu, cargoAlvo, A).qtd, 1); somar(votavel(x.bu, cargoAlvo, B).qtd, -1); recalcularCadeia(x.bu); return x; } },
  C3: { descricao: `BU: +1 voto para ${A} e +1 comparecimento (topo, todas as eleições, detalhamento por biometria; nos outros cargos +1 branco), cadeia recalculada; RDV e log intactos`, f: (x) => {
    const n = nosBu(x.bu);
    somar(n.comparecimento, 1);
    if (n.detalhamento) somar(n.detalhamento.filhos[1], 1);
    for (const e of n.eleicoes) for (const rv of e.resultados) {
      somar(rv.comp, 1);
      for (const c of rv.cargos) {
        const v = c.codigo === cargoAlvo ? c.votaveis.find((y) => y.numero === A) : c.votaveis.find((y) => y.tipo === 2);
        somar(v.qtd, 1);
      }
    }
    recalcularCadeia(x.bu);
    return x;
  } },
  C4: { descricao: `RDV: 1 registro trocado de ${B} para ${A}; BU intacto`, f: (x) => { trocarRegistroRdv(x.rdv, cargoAlvo, String(B), String(A)); return x; } },
  C5: { descricao: 'BU (C2) e RDV (C4) alterados de forma coerente', f: (x) => { cenarios.C2.f(x); cenarios.C4.f(x); return x; } },
  C6: { descricao: 'enchimento completo: C3 + 1 registro a mais no RDV por cargo + 1 ciclo de eleitor inserido no log (hash de linha inventado)', f: (x) => {
    cenarios.C3.f(x);
    x.rdv = acrescentarRegistrosRdv(x.rdv, { [cargoAlvo]: String(A) });
    // nos outros cargos o voto a mais no BU foi branco: troca o registro acrescentado (cópia do 1º) por branco
    const raiz = der(x.rdv)[0];
    for (const vc of votosRdv(raiz)) if (vc.cargo !== cargoAlvo) {
      const ultimo = vc.lista.filhos.at(-1);
      ultimo.filhos = [{ tag: 0x0a, valor: Buffer.from([3]) }]; // tipoVoto branco (RDV: 3), sem digitação
    }
    x.rdv = serializar(raiz);
    x.textos = injetarCicloNoLog(x.textos);
    return x;
  } },
};

const resultado = { pacote: dirHash, dia: DIA, cargoAlvo, candidatoA: A, candidatoB: B, cenarios: {} };
for (const [id, cen] of Object.entries(cenarios)) {
  const x = cen.f({ bu: Buffer.from(original.bu), rdv: Buffer.from(original.rdv), textos: [...textosOriginais] });
  // pacote no formato que analisarPacote monta, com a lógica do autor
  const bu = lerBu(x.bu);
  const p = {
    origem: bu.origem, comparecimento: bu.qtdEleitoresCompareceram, cadeia: conferirCadeia(bu),
    bu: cargosBu(decodificarArquivo(arquivoBu, x.bu).conteudo), rdv: cargosRdv(decodificarArquivo(arquivoRdv, x.rdv)),
    log: perfilLogDeTextos(x.textos, DIA),
  };
  const vAutor = violacoes(p);
  const d = bu.detalhamentoComparecimento;
  const i6 = d ? d.semBiometriaCadastrada + d.porBiometria + d.comBiometriaHabilitadosPorAnoNascimento === bu.qtdEleitoresCompareceram : null;
  const arquivos = new Map([[nome('bu'), x.bu], [nome('rdv'), x.rdv], [nome('log'), original.log], [nome('imgbu'), original.imgbu]]);
  const lacres = verificarLacres({ vsc: original.vsc, arquivos, acs, dataEleicao: new Date('2026-10-25') });
  const falhasLacre = lacres.resultados.filter((r) => !r.ok).map((r) => r.item);
  const difBuRdv = buXrdv(x.bu, x.rdv);
  const destino = path.join(SAIDA, 'poder', id);
  await mkdir(destino, { recursive: true });
  await writeFile(path.join(destino, nome('bu')), x.bu);
  await writeFile(path.join(destino, nome('rdv')), x.rdv);
  resultado.cenarios[id] = {
    descricao: cen.descricao,
    autor: { violacoes: vAutor, cadeia: { tuplas: p.cadeia.tuplas, hashDivergente: p.cadeia.hashDivergente, ultimoDivergente: p.cadeia.ultimoDivergente, ordemDivergente: p.cadeia.ordemDivergente }, logComputados: p.log.computados, comparecimentoBu: p.comparecimento },
    i6DetalhamentoFecha: i6,
    buXrdvPorCandidato: difBuRdv,
    assinatura: { falhas: falhasLacre },
  };
  console.log(`${id} ${cen.descricao}\n   autor: ${vAutor.length ? vAutor.join(', ') : 'NENHUMA violação'}`
    + ` | cadeia: ${p.cadeia.hashDivergente} tupla(s) e ${p.cadeia.ultimoDivergente} último(s) divergente(s)`
    + `\n   BU×RDV por candidato (não feito pelo autor): ${difBuRdv.length ? difBuRdv.join('; ') : 'igual'}`
    + `\n   assinatura/lacre: ${falhasLacre.length ? falhasLacre.join(' | ') : 'tudo OK'}`);
}
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, 'poder.json'), `${JSON.stringify(resultado, null, 1)}\n`);
