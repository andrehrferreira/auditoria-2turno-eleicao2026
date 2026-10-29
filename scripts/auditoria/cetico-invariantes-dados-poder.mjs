// Cético, achado "invariantes sem violação" (matemático forense), lente dados/poder.
// Pergunta: cada "0 violação" de I1–I5 (scripts/auditoria/matematico-brutos.mjs) seria detectado se UMA linha mudasse?
// Método: copia um pacote real (2º turno, AC 01007/0009/0001), aplica alterações controladas nos bytes (DER, mesmo
// comprimento) e passa cada cópia por:
//   (a) as funções do autor: conferirCadeia() e violacoes() importadas de matematico-brutos.mjs; cargosBu/cargosRdv/
//       perfilLog copiados sem mudança (não são exportados);
//   (b) BU × RDV por candidato (a conferência que o auditor A faz no banco, contagem-coerencia.mjs), refeita aqui;
//   (c) src/lacres.js verificarDiretorio() (hash do arquivo lacrado no .vsc e assinatura da urna).
// Saída: data/parsed/auditoria/cetico/invariantes-poder/<cenario>/ (cópias) e invariantes-poder.json.
// Uso: node scripts/auditoria/cetico-invariantes-dados-poder.mjs
import { createHash } from 'node:crypto';
import { copyFile, mkdir, open, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { decodificarArquivo } from '../../src/asn1.js';
import { DIR_DADOS } from '../../src/config.js';
import { CARGO_CONSTITUCIONAL, arquivoBu, arquivoRdv } from '../../src/esquemas.js';
import { acharArquivo, carregarAcs, lerBu, verificarDiretorio } from '../../src/lacres.js';
import { DIA_VOTACAO } from '../../src/perfil-secoes.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';
import { cicloLog, conferirCadeia, linhasPorUrna, violacoes } from './matematico-brutos.mjs';

const ORIGEM = path.join(DIR_DADOS, 'raw', '2t', 'urnas', 'ac', '01007', '0009', '0001');
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'invariantes-poder');
const TURNO = 2;

// ---- cópias literais de matematico-brutos.mjs (funções não exportadas) ----
const CODIGO_CARGO = Object.fromEntries(Object.entries(CARGO_CONSTITUCIONAL).map(([n, nome]) => [nome, Number(n)]));
const codigoDoCargo = (c) => (c?.cargoConstitucional ? CODIGO_CARGO[c.cargoConstitucional] : c?.numeroCargoConsultaLivre) ?? null;
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
const handleEmMemoria = (buffer) => ({
  read: async (destino, deslocamento, tamanho, posicao) => ({ bytesRead: buffer.copy(destino, deslocamento, posicao, posicao + tamanho) }),
  stat: async () => ({ size: buffer.length }),
});
async function textosDeLog(handle, profundidade = 0) {
  const textos = [];
  for (const entrada of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, entrada);
    if (entrada.nome === 'logd.dat') textos.push(dados.toString('latin1'));
    else if (entrada.nome.endsWith('.jez') && profundidade < 3) textos.push(...(await textosDeLog(handleEmMemoria(dados), profundidade + 1)));
  }
  return textos;
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
    for (const t of linhasPorUrna(textos, dia)) cicloLog(t, dia, c);
    return c;
  } finally {
    await handle.close();
  }
}

// ---- DER com subarrays (as alterações escrevem direto no buffer) ----
function der(buffer, inicio = 0, fim = buffer.length) {
  const nos = [];
  for (let p = inicio; p < fim; ) {
    const tag = buffer[p];
    let q = p + 1;
    let n = buffer[q++];
    if (n & 0x80) {
      const b = n & 0x7f;
      n = 0;
      for (let i = 0; i < b; i++) n = n * 256 + buffer[q++];
    }
    const no = { tag, valor: buffer.subarray(q, q + n) };
    if (tag & 0x20) no.filhos = der(buffer, q, q + n);
    nos.push(no);
    p = q + n;
  }
  return nos;
}
const inteiro = (v) => v.reduce((a, x) => a * 256 + x, 0);
function gravarInteiro(no, n) {
  const hex = n.toString(16).padStart(2 * no.valor.length, '0');
  const bytes = Buffer.from(hex, 'hex');
  if (bytes.length !== no.valor.length || (bytes[0] & 0x80)) throw new Error(`inteiro ${n} não cabe em ${no.valor.length} byte(s)`);
  bytes.copy(no.valor);
}
const sha512 = (b) => createHash('sha512').update(b).digest();
const zeros = (n, l) => String(n).padStart(l, '0');

/** Nós do BU: por eleição, os votáveis (nó de quantidade) e os nós de comparecimento. */
function nosBu(buf) {
  const envelope = der(buf)[0];
  const conteudo = envelope.filhos.find((n) => n.tag === 0x04);
  const bu = der(conteudo.valor)[0];
  const porEleicao = bu.filhos.find((n) => n.tag === 0x30 && n.filhos?.[0]?.filhos?.length === 7).filhos;
  return {
    compareceram: bu.filhos[6],
    eleicoes: porEleicao.map((e) => ({
      id: inteiro(e.filhos[0].valor),
      aptos: e.filhos[1],
      rvs: e.filhos[4].filhos.map((rv) => ({
        comp: rv.filhos[1],
        cargos: rv.filhos[2].filhos.map((tvc) => tvc.filhos[2].filhos.map((vv) => ({
          qtd: vv.filhos.find((n) => n.tag === 0x82),
          codigo: (() => { const i = vv.filhos.find((n) => n.tag === 0xa3); return i ? inteiro(i.filhos[1].valor) : null; })(),
        }))),
      })),
    })),
  };
}

/** Recalcula a cadeia de hashes (como faria um adversário) e grava cada hash e o último hash no buffer. */
function refazerCadeia(buf) {
  const bu = lerBu(buf); // hash e ultimoHash são subarrays de buf
  for (const e of bu.eleicoes) {
    const { pleito, municipio, zona, secao, codigoCarga } = bu.cabecalho;
    let h = sha512(Buffer.from(`${zeros(pleito, 5)}|${zeros(e.idEleicao, 5)}|${zeros(municipio, 5)}|${zeros(zona, 4)}|${zeros(secao, 4)}|${codigoCarga}`, 'latin1')).toString('hex').toUpperCase();
    for (const cargo of e.cargos) {
      cargo.votaveis.forEach((v, i) => {
        const base = `${h}|${i + 1}|${cargo.codigoCargo}|${v.tipoVoto}|${v.quantidade}`;
        h = sha512(Buffer.from(v.codigo === null ? base : `${base}|${v.codigo}|${v.partido}`, 'latin1')).toString('hex').toUpperCase();
        Buffer.from(h, 'hex').copy(v.hash);
      });
    }
    Buffer.from(h, 'hex').copy(e.ultimoHash);
  }
}

/** Votos do RDV (nós de digitação) do 1º cargo da 1ª eleição. */
function votosRdv(buf) {
  const eleicoes = der(buf)[0].filhos[2].filhos[4].filhos;
  return eleicoes[0].filhos[1].filhos[0].filhos[2].filhos.map((v) => ({ tipo: inteiro(v.filhos[0].valor), dig: v.filhos[1] ?? null }));
}

/** Atualiza no .vsc o hash lacrado dos arquivos alterados e o hash da lista (o adversário não tem a chave da urna). */
function refazerVsc(vsc, arquivos) {
  const pacote = der(vsc)[0];
  const hw = pacote.filhos.find((n) => n.filhos?.some((x) => x.tag === 0x81));
  const [, , auto, conteudo] = hw.filhos;
  for (const item of der(conteudo.valor)[0].filhos[0].filhos) {
    const nome = item.filhos[0].valor.toString('latin1');
    if (arquivos.has(nome)) sha512(arquivos.get(nome)).copy(item.filhos[1].filhos[1].valor);
  }
  sha512(conteudo.valor).copy(auto.filhos[3].filhos[1].valor);
}

// BU × RDV por candidato (presidente), como o auditor A no banco
function buXrdv(buBuf, rdvBuf) {
  const bu = decodificarArquivo(arquivoBu, buBuf).conteudo;
  const rdv = decodificarArquivo(arquivoRdv, rdvBuf);
  const difs = [];
  const eRdv = rdv.rdv.eleicoes.eleicoesVota ?? [];
  for (const e of bu.resultadosVotacaoPorEleicao) {
    const r = eRdv.find((x) => x.idEleicao === e.idEleicao);
    for (const rv of e.resultadosVotacao) {
      for (const tvc of rv.totaisVotosCargo) {
        const c = codigoDoCargo(tvc.codigoCargo);
        const vc = r?.votosCargos.find((x) => codigoDoCargo(x.idCargo) === c);
        const contaRdv = {};
        for (const v of vc?.votos ?? []) {
          const k = v.tipoVoto === 'nominal' ? `n${Number(v.digitacao)}` : v.tipoVoto;
          contaRdv[k] = (contaRdv[k] ?? 0) + 1;
        }
        const contaBu = {};
        for (const v of tvc.votosVotaveis) {
          const k = v.tipoVoto === 'nominal' ? `n${v.identificacaoVotavel?.codigo}` : v.tipoVoto;
          contaBu[k] = (contaBu[k] ?? 0) + v.quantidadeVotos;
        }
        for (const k of new Set([...Object.keys(contaBu), ...Object.keys(contaRdv)])) {
          if ((contaBu[k] ?? 0) !== (contaRdv[k] ?? 0)) difs.push(`${e.idEleicao}/${c}/${k}: BU ${contaBu[k] ?? 0} RDV ${contaRdv[k] ?? 0}`);
        }
      }
    }
  }
  return difs;
}

async function avaliar(dir, acs) {
  const nomes = await readdir(dir);
  const buBuf = await readFile(path.join(dir, acharArquivo(nomes, 'bu')));
  const rdvBuf = await readFile(path.join(dir, acharArquivo(nomes, 'rdv')));
  const bu = lerBu(buBuf);
  const p = {
    origem: bu.origem, comparecimento: bu.qtdEleitoresCompareceram, cadeia: conferirCadeia(bu),
    bu: cargosBu(decodificarArquivo(arquivoBu, buBuf).conteudo), rdv: cargosRdv(decodificarArquivo(arquivoRdv, rdvBuf)),
    log: await perfilLog(path.join(dir, acharArquivo(nomes, 'log')), DIA_VOTACAO[TURNO]),
  };
  const autor = violacoes(p).filter((v) => v !== 'habInterrompida');
  const lacres = await verificarDiretorio(dir, { acs, dataEleicao: new Date('2026-10-25') });
  return {
    autor_I1_I5_e_log: autor,
    cadeia: { tuplas: p.cadeia.tuplas, hashDivergente: p.cadeia.hashDivergente, ultimoDivergente: p.cadeia.ultimoDivergente },
    buXrdv_auditorA: buXrdv(buBuf, rdvBuf),
    lacres_falhas: lacres.resultados.filter((r) => !r.ok).map((r) => `[${r.camada}] ${r.item}`),
  };
}

async function main() {
  const [hash] = (await readdir(ORIGEM, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  const fonte = path.join(ORIGEM, hash);
  const nomes = await readdir(fonte);
  const nBu = acharArquivo(nomes, 'bu');
  const nRdv = acharArquivo(nomes, 'rdv');
  const nVsc = acharArquivo(nomes, 'vsc');
  const acs = await carregarAcs();

  // presidente (1ª eleição, 1º cargo): dois candidatos nominais
  const base = nosBu(await readFile(path.join(fonte, nBu)));
  const pres = base.eleicoes[0].rvs[0].cargos[0];
  const nominais = pres.filter((v) => v.codigo !== null);
  const [A, B] = nominais;
  const cand = { A: A.codigo, B: B.codigo, qtdA: inteiro(A.qtd.valor), qtdB: inteiro(B.qtd.valor) };

  const cenarios = {
    S0_original: {},
    S1_bu_move_1_voto_sem_refazer_cadeia: { bu: (n) => { gravarInteiro(n.eleicoes[0].rvs[0].cargos[0].find((v) => v.codigo === cand.A).qtd, cand.qtdA - 1); gravarInteiro(n.eleicoes[0].rvs[0].cargos[0].find((v) => v.codigo === cand.B).qtd, cand.qtdB + 1); } },
    S2_bu_move_1_voto_cadeia_refeita: { bu: 'S1', refazer: true },
    S3_bu_mais_1_voto_cadeia_refeita: { bu: (n) => gravarInteiro(n.eleicoes[0].rvs[0].cargos[0].find((v) => v.codigo === cand.A).qtd, cand.qtdA + 1), refazer: true },
    S4_bu_mais_1_voto_e_comparecimento_cadeia_refeita: {
      bu: (n) => {
        gravarInteiro(n.eleicoes[0].rvs[0].cargos[0].find((v) => v.codigo === cand.A).qtd, cand.qtdA + 1);
        gravarInteiro(n.compareceram, inteiro(n.compareceram.valor) + 1);
        gravarInteiro(n.eleicoes[0].rvs[0].comp, inteiro(n.eleicoes[0].rvs[0].comp.valor) + 1);
      },
      refazer: true,
    },
    S5_bu_aptos_mais_1: { bu: (n) => gravarInteiro(n.eleicoes[0].aptos, inteiro(n.eleicoes[0].aptos.valor) + 1) },
    S6_rdv_troca_1_voto_A_para_B: { rdv: true },
    S7_bu_e_rdv_coerentes_cadeia_refeita: { bu: 'S1', refazer: true, rdv: true },
    S8_bu_e_rdv_coerentes_cadeia_e_vsc_refeitos: { bu: 'S1', refazer: true, rdv: true, vsc: true },
  };
  const resultado = { fonte: path.relative(DIR_DADOS, fonte), turno: TURNO, candidatos: cand, cenarios: {} };
  await rm(SAIDA, { recursive: true, force: true });
  for (const [nome, c] of Object.entries(cenarios)) {
    const dir = path.join(SAIDA, nome);
    await mkdir(dir, { recursive: true });
    for (const n of nomes) await copyFile(path.join(fonte, n), path.join(dir, n));
    const alterados = new Map();
    if (c.bu) {
      const buf = await readFile(path.join(dir, nBu));
      (c.bu === 'S1' ? cenarios.S1_bu_move_1_voto_sem_refazer_cadeia.bu : c.bu)(nosBu(buf));
      if (c.refazer) refazerCadeia(buf);
      await writeFile(path.join(dir, nBu), buf);
      alterados.set(nBu, buf);
    }
    if (c.rdv) {
      const buf = await readFile(path.join(dir, nRdv));
      const alvo = votosRdv(buf).find((v) => v.dig && Number(v.dig.valor.toString('latin1')) === cand.A);
      const novo = String(cand.B);
      if (novo.length !== alvo.dig.valor.length) throw new Error('digitação de tamanho diferente');
      Buffer.from(novo, 'latin1').copy(alvo.dig.valor);
      await writeFile(path.join(dir, nRdv), buf);
      alterados.set(nRdv, buf);
    }
    if (c.vsc) {
      const vsc = await readFile(path.join(dir, nVsc));
      refazerVsc(vsc, alterados);
      await writeFile(path.join(dir, nVsc), vsc);
    }
    resultado.cenarios[nome] = await avaliar(dir, acs);
    const r = resultado.cenarios[nome];
    console.log(`${nome}\n  autor: ${JSON.stringify(r.autor_I1_I5_e_log)}  cadeia ${JSON.stringify(r.cadeia)}\n  BU×RDV: ${JSON.stringify(r.buXrdv_auditorA)}\n  lacres: ${JSON.stringify(r.lacres_falhas)}`);
  }
  await writeFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'invariantes-poder.json'), `${JSON.stringify(resultado, null, 1)}\n`);
}

await main();
