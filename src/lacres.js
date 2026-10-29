import { X509Certificate, createHash, verify } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from './config.js';
import { verificarEd521 } from './ed521.js';

// Verifica os "lacres" (assinaturas digitais) de uma seção, seguindo os exemplos oficiais do TSE
// (formato-arquivos-bu-rdv-ass-digital-v2.zip: assinatura_hash.py, bu_assinatura_tuplas.py, lib/mr_util.py):
//   - certificado da urna assinado pela AC emissora (Ed521: mensagem = TBSCertificate; ECDSA: SHA-512 do TBS);
//   - no bloco HW do -vota.vsc, cada arquivo tem hash SHA-512 e assinatura sobre SHA-512(hash);
//   - no BU, cadeia de hashes das tuplas de votos e assinatura sobre SHA-512(último hash).
// O bloco SW do -vota.vsc usa o algoritmo CEPESC, que não é público, e por isso não é verificável.

export const DIR_ACS = path.join(DIR_DADOS, 'certificados', 'ac');

// Sufixos dos arquivos de um pacote: urna de seção e Sistema de Apuração (SA, exterior; doc 03, "Casos especiais").
export const SUFIXOS = {
  vsc: ['-vota.vsc', '-sa.vsc'],
  bu: ['-bu.dat', '-busa.dat'],
  rdv: ['-rdv.dat'],
  log: ['-log.jez', '-logsa.jez'],
  imgbu: ['-imgbu.dat', '-imgbusa.dat'],
};

/** Nome do arquivo do `tipo` (chave de SUFIXOS) dentro de `nomes`, ou undefined. */
export const acharArquivo = (nomes, tipo) => nomes.find((n) => SUFIXOS[tipo].some((s) => n.endsWith(s)));

const OID_ED521 = Buffer.from('2b0601040182dc2c0201', 'hex'); // 1.3.6.1.4.1.44588.2.1
const OID_EC_PUBLIC_KEY = Buffer.from('2a8648ce3d0201', 'hex'); // 1.2.840.10045.2.1

function der(buffer, inicio = 0, fim = buffer.length) {
  const nos = [];
  for (let p = inicio; p < fim; ) {
    const tag = buffer[p];
    let q = p + 1;
    if (q >= fim) throw new Error('DER: comprimento ausente');
    let comprimento = buffer[q++];
    if (comprimento & 0x80) {
      const bytes = comprimento & 0x7f;
      if (bytes === 0 || bytes > 4) throw new Error('DER: comprimento inválido');
      comprimento = 0;
      for (let i = 0; i < bytes; i++) {
        if (q >= fim) throw new Error('DER: comprimento truncado');
        comprimento = comprimento * 256 + buffer[q++];
      }
    }
    if (q + comprimento > fim) throw new Error('DER: conteúdo ultrapassa o limite');
    const no = { tag, valor: buffer.subarray(q, q + comprimento), bruto: buffer.subarray(p, q + comprimento) };
    if (tag & 0x20) no.filhos = der(buffer, q, q + comprimento);
    nos.push(no);
    p = q + comprimento;
  }
  return nos;
}

const raiz = (buffer) => der(buffer)[0];
const inteiro = (valor) => valor.reduce((a, x) => a * 256 + x, 0);
const sha512 = (buffer) => createHash('sha512').update(buffer).digest();
const nomeComum = (dn) => (dn.split('\n').find((linha) => linha.startsWith('CN=')) ?? '').slice(3);

/** Lê um certificado X.509 (DER ou PEM) mantendo os bytes do TBS e a chave pública crua. */
export function lerCertificado(bytes) {
  const texto = bytes.toString('latin1');
  const derBytes = texto.startsWith('-----BEGIN') ? Buffer.from(texto.replace(/-----[^-]+-----|\s/g, ''), 'base64') : bytes;
  const [tbs, , valorAssinatura] = raiz(derBytes).filhos;
  const campos = tbs.filhos[0].tag === 0xa0 ? tbs.filhos.slice(1) : tbs.filhos;
  const [algoritmoChave, chave] = campos[5].filhos;
  const oid = algoritmoChave.filhos[0].valor;
  const x509 = new X509Certificate(derBytes);
  const algoritmo = oid.equals(OID_ED521) ? 'ed521' : oid.equals(OID_EC_PUBLIC_KEY) ? 'ecdsa' : 'desconhecido';
  return {
    algoritmo,
    nome: nomeComum(x509.subject),
    emissor: nomeComum(x509.issuer),
    validoDe: new Date(x509.validFrom),
    validoAte: new Date(x509.validTo),
    tbs: tbs.bruto,
    assinatura: valorAssinatura.valor.subarray(1),
    chaveCrua: chave.valor.subarray(1),
    chave: algoritmo === 'ecdsa' ? x509.publicKey : null,
  };
}

/**
 * Verifica `assinatura` sobre `resumo` como nos exemplos do TSE (ECPy): Ed521 assina a mensagem como
 * está; ECDSA recebe o resumo já calculado, o que no node:crypto equivale a verificar com SHA-512 os
 * dados que geraram esse resumo (`dadosDoResumo`).
 */
function verificarComChave(cert, dadosDoResumo, assinatura) {
  if (cert.algoritmo === 'ed521') return verificarEd521(cert.chaveCrua, sha512(dadosDoResumo), assinatura);
  if (cert.algoritmo === 'ecdsa') {
    return ['der', 'ieee-p1363'].some((dsaEncoding) => {
      try {
        return verify('sha512', dadosDoResumo, { key: cert.chave, dsaEncoding }, assinatura);
      } catch {
        return false;
      }
    });
  }
  return false;
}

function verificarCertificado(certUrna, ac) {
  if (ac.algoritmo === 'ed521') return verificarEd521(ac.chaveCrua, certUrna.tbs, certUrna.assinatura);
  if (ac.algoritmo === 'ecdsa') return verify('sha512', certUrna.tbs, ac.chave, certUrna.assinatura);
  return false;
}

/** Carrega os certificados das ACs (arquivos .der/.pem/.cer/.crt de `dir`). */
export async function carregarAcs(dir = DIR_ACS) {
  const nomes = (await readdir(dir)).filter((n) => /\.(der|pem|cer|crt)$/i.test(n)).sort();
  return Promise.all(nomes.map(async (n) => ({ arquivo: n, ...lerCertificado(await readFile(path.join(dir, n))) })));
}

const texto = (no) => no?.valor.toString('latin1') ?? null;

/** Lê o BU (spec v2, bu.asn1) sem depender de posição fixa demais (2026 ≠ spec v2 em alguns pontos). */
export function lerBu(buBytes) {
  const envelope = raiz(buBytes);
  const conteudo = envelope.filhos.find((n) => n.tag === 0x04);
  const bu = raiz(conteudo.valor);
  const pleito = inteiro(bu.filhos[0].filhos[1].valor);
  // A cadeia começa pela seção onde a urna foi instalada (identificacaoSecao). Em urna de contingência
  // (tipoUrna 4), a identificação da carga ([1]) traz só o município/zona de origem da urna reserva.
  const correspondencia = bu.filhos[2].filhos.find((n) => n.tag === 0x30 && (n.filhos?.[0]?.tag === 0xa0 || n.filhos?.[0]?.tag === 0xa1));
  const carga = correspondencia.filhos[1];
  const [municipioZona, , secao] = bu.filhos[3].filhos;
  const codigoCarga = carga.filhos.at(-1).valor.toString('latin1');
  const porEleicao = bu.filhos.find((n) => n.tag === 0x30 && n.filhos?.[0]?.filhos?.length === 7).filhos;
  const urna = bu.filhos[2];
  // Ordem da spec: cabecalho, fase, urna, identificacaoSecao, dataHoraEmissao, dadosSecaoSA ([0] seção | [1] SA),
  // qtdEleitoresCompareceram, [1] detalhamentoComparecimento (opcional). Por posição, porque [1] aparece nos dois papéis.
  const dadosSecaoSA = bu.filhos[5];
  const iDados = dadosSecaoSA?.tag === 0xa0 ? 5 : -1; // só BU de seção tem abertura/encerramento
  const detalhamento = bu.filhos[7]?.tag === 0xa1 ? bu.filhos[7] : null;
  return {
    cabecalho: { pleito, municipio: inteiro(municipioZona.filhos[0].valor), zona: inteiro(municipioZona.filhos[1].valor), secao: inteiro(secao.valor), codigoCarga },
    urna: {
      tipoUrna: inteiro(urna.filhos[0].valor),
      versao: texto(urna.filhos[1]),
      numeroSerieFV: urna.filhos.find((n, i) => i > 2 && n.tag === 0x04)?.valor.toString('hex').toUpperCase() ?? null,
      numeroInternoUrna: inteiro(carga.filhos[0].valor),
      numeroSerieFC: carga.filhos[1].valor.toString('hex').toUpperCase(),
      dataHoraCarga: texto(carga.filhos[3]),
    },
    dataHoraAbertura: iDados >= 0 ? texto(bu.filhos[iDados].filhos[0]) : null,
    dataHoraEncerramento: iDados >= 0 ? texto(bu.filhos[iDados].filhos[1]) : null,
    origem: dadosSecaoSA?.tag === 0xa1 ? 'sa' : 'urna',
    qtdEleitoresCompareceram: bu.filhos[6]?.tag === 0x02 ? inteiro(bu.filhos[6].valor) : null,
    detalhamentoComparecimento: detalhamento
      ? {
        semBiometriaCadastrada: inteiro(detalhamento.filhos[0].valor),
        porBiometria: inteiro(detalhamento.filhos[1].valor),
        comBiometriaHabilitadosPorAnoNascimento: inteiro(detalhamento.filhos[2].valor),
      }
      : null,
    eleicoes: porEleicao.map((e) => {
      const [idEleicao, aptos, aptosSecao, aptosTTE, resultados, ultimoHash, assinatura] = e.filhos;
      const cargos = resultados.filhos.flatMap((rv) => rv.filhos[2].filhos).map((tvc) => ({
        codigoCargo: inteiro(tvc.filhos[0].valor),
        votaveis: tvc.filhos[2].filhos.map((vv) => {
          const ident = vv.filhos.find((n) => n.tag === 0xa3);
          return {
            tipoVoto: inteiro(vv.filhos.find((n) => n.tag === 0x81).valor),
            quantidade: inteiro(vv.filhos.find((n) => n.tag === 0x82).valor),
            partido: ident ? inteiro(ident.filhos[0].valor) : null,
            codigo: ident ? inteiro(ident.filhos[1].valor) : null,
            ordemGeracaoHash: inteiro(vv.filhos.at(-2).valor),
            hash: vv.filhos.at(-1).valor,
          };
        }),
      }));
      return {
        idEleicao: inteiro(idEleicao.valor),
        qtdEleitoresAptos: inteiro(aptos.valor),
        qtdEleitoresAptosSecao: inteiro(aptosSecao.valor),
        qtdEleitoresAptosTTE: inteiro(aptosTTE.valor),
        cargos,
        ultimoHash: ultimoHash.valor,
        assinatura: assinatura.valor,
      };
    }),
  };
}

const zeros = (n, largura) => String(n).padStart(largura, '0');

/** Recalcula a cadeia de hashes das tuplas de uma eleição (README do pacote do TSE, "Formação do hash"). */
function cadeiaBu(cabecalho, eleicao) {
  const { pleito, municipio, zona, secao, codigoCarga } = cabecalho;
  let h = sha512(Buffer.from(`${zeros(pleito, 5)}|${zeros(eleicao.idEleicao, 5)}|${zeros(municipio, 5)}|${zeros(zona, 4)}|${zeros(secao, 4)}|${codigoCarga}`, 'latin1'))
    .toString('hex').toUpperCase();
  let tuplas = 0;
  let divergentes = 0;
  for (const cargo of eleicao.cargos) {
    cargo.votaveis.forEach((v, i) => {
      const ordem = i + 1;
      const base = `${h}|${ordem}|${cargo.codigoCargo}|${v.tipoVoto}|${v.quantidade}`;
      const texto = v.codigo === null ? base : `${base}|${v.codigo}|${v.partido}`;
      h = sha512(Buffer.from(texto, 'latin1')).toString('hex').toUpperCase();
      tuplas++;
      if (h !== v.hash.toString('hex').toUpperCase() || ordem !== v.ordemGeracaoHash) divergentes++;
    });
  }
  return { ultimo: Buffer.from(h, 'hex'), tuplas, divergentes };
}

/**
 * Verifica os lacres de uma seção. `arquivos` mapeia nome → Buffer (arquivos ausentes: só o lacre do hash
 * é conferido). Retorna { urna, resultados: [{ camada, item, ok, obs }] }.
 */
export function verificarLacres({ vsc, arquivos, acs, dataEleicao }) {
  const resultados = [];
  const registrar = (camada, item, ok, obs = '') => resultados.push({ camada, item, ok, obs });
  const observacoes = [];

  const pacote = raiz(vsc);
  const hw = pacote.filhos.find((n) => n.filhos?.some((x) => x.tag === 0x81));
  if (!hw) throw new Error('vota.vsc: bloco de assinatura da urna (com certificado) não encontrado');
  const [, , auto, conteudo] = hw.filhos;
  const urna = lerCertificado(hw.filhos.find((x) => x.tag === 0x81).valor);

  const ac = acs.find((a) => a.nome === urna.emissor);
  registrar('certificado', `certificado ${urna.nome} assinado pela ${urna.emissor}`, Boolean(ac) && verificarCertificado(urna, ac),
    ac ? `chave de ${ac.arquivo}` : 'certificado da AC emissora não disponível');
  if (dataEleicao) {
    registrar('certificado', 'certificado da urna válido na data da eleição', urna.validoDe <= dataEleicao && dataEleicao <= urna.validoAte,
      `${urna.validoDe.toISOString().slice(0, 10)} a ${urna.validoAte.toISOString().slice(0, 10)}`);
    // Observação, não falha: o certificado publicado da AC URNA venceu em 18/07/2026 e ainda assim valida urnas
    // UE2013/UE2015 (provável renovação com a mesma chave, não publicada; doc 06).
    if (ac && !(ac.validoDe <= dataEleicao && dataEleicao <= ac.validoAte)) {
      observacoes.push(`certificado publicado da ${ac.nome} fora da validade na data da eleição (${ac.validoDe.toISOString().slice(0, 10)} a ${ac.validoAte.toISOString().slice(0, 10)})`);
    }
  }

  const [, hashLista, assinaturaLista] = auto.filhos[3].filhos;
  registrar('lista', 'SHA-512 da lista de arquivos confere', sha512(conteudo.valor).equals(hashLista.valor));
  registrar('lista', 'assinatura da urna sobre a lista de arquivos', verificarComChave(urna, hashLista.valor, assinaturaLista.valor));

  for (const item of raiz(conteudo.valor).filhos[0].filhos) {
    const nome = item.filhos[0].valor.toString('latin1');
    const [, hash, assinatura] = item.filhos[1].filhos;
    const bytes = arquivos.get(nome);
    if (bytes) registrar('arquivo', `${nome}: SHA-512 do arquivo = hash lacrado`, sha512(bytes).equals(hash.valor));
    registrar('arquivo', `${nome}: assinatura da urna sobre o hash`, verificarComChave(urna, hash.valor, assinatura.valor),
      bytes ? '' : 'arquivo não disponível; conferido só o lacre do hash');
  }

  const buNome = acharArquivo([...arquivos.keys()], 'bu');
  if (buNome) {
    const bu = lerBu(arquivos.get(buNome));
    for (const eleicao of bu.eleicoes) {
      const { ultimo, tuplas, divergentes } = cadeiaBu(bu.cabecalho, eleicao);
      registrar('bu', `eleição ${eleicao.idEleicao}: ${tuplas} tuplas com hash recalculado igual ao gravado`, divergentes === 0,
        divergentes ? `${divergentes} divergente(s)` : '');
      registrar('bu', `eleição ${eleicao.idEleicao}: último hash recalculado = gravado`, ultimo.equals(eleicao.ultimoHash));
      registrar('bu', `eleição ${eleicao.idEleicao}: assinatura da urna sobre o último hash`, verificarComChave(urna, eleicao.ultimoHash, eleicao.assinatura));
    }
  }

  return { urna: { nome: urna.nome, emissor: urna.emissor, algoritmo: urna.algoritmo }, resultados, observacoes };
}

/** Lê do diretório de hash de uma seção o pacote de assinaturas (-vota.vsc ou -sa.vsc) e os arquivos que ele lista. */
export async function verificarDiretorio(dir, { acs, dataEleicao } = {}) {
  const nomes = await readdir(dir);
  const nomeVsc = acharArquivo(nomes, 'vsc');
  if (!nomeVsc) throw new Error(`${dir}: sem -vota.vsc nem -sa.vsc`);
  const arquivos = new Map();
  for (const n of nomes) if (n !== nomeVsc && /^o\d{5}[a-z]{2}\d{13}-[a-z]+\.[a-z]+$/.test(n)) arquivos.set(n, await readFile(path.join(dir, n)));
  return verificarLacres({ vsc: await readFile(path.join(dir, nomeVsc)), arquivos, acs: acs ?? (await carregarAcs()), dataEleicao });
}

/** Diretórios (em ordem) que contêm um pacote de assinaturas (-vota.vsc ou -sa.vsc), procurando a partir de `dir`. */
export async function diretoriosComVsc(dir) {
  const entradas = (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
  if (entradas.some((e) => e.isFile() && acharArquivo([e.name], 'vsc'))) return [dir];
  const achados = [];
  for (const e of entradas) if (e.isDirectory()) achados.push(...(await diretoriosComVsc(path.join(dir, e.name))));
  return achados;
}

async function principal() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { acs: { type: 'string', default: DIR_ACS }, data: { type: 'string', default: '2026-10-25' }, ajuda: { type: 'boolean', short: 'h' } },
  });
  if (values.ajuda || positionals.length === 0) {
    console.log('Uso: node src/lacres.js <diretório> [...] [--acs <dir>] [--data AAAA-MM-DD]\n'
      + 'Cada diretório pode ser o do hash de uma seção ou uma pasta acima (UF, município...): as seções são procuradas dentro.\n'
      + 'Saída 0 só se todas as conferências passarem.');
    process.exit(values.ajuda ? 0 : 2);
  }
  const acs = await carregarAcs(values.acs);
  const dirs = [];
  for (const p of positionals) dirs.push(...(await diretoriosComVsc(p)));
  let falhas = 0;
  let comFalha = 0;
  for (const dir of dirs) {
    const { urna, resultados, observacoes } = await verificarDiretorio(dir, { acs, dataEleicao: new Date(values.data) });
    console.log(`\n${dir}\nurna ${urna.nome} (${urna.algoritmo}), emitida pela ${urna.emissor}`);
    for (const r of resultados) console.log(`${r.ok ? 'OK   ' : 'FALHA'} [${r.camada}] ${r.item}${r.obs ? ` (${r.obs})` : ''}`);
    for (const o of observacoes) console.log(`OBS   ${o}`);
    const f = resultados.filter((r) => !r.ok).length;
    console.log(`${resultados.length} conferências, ${f} falha(s)`);
    falhas += f;
    if (f) comFalha++;
  }
  console.log(`\nRESUMO: ${dirs.length} diretório(s) de seção, ${comFalha} com falha, ${falhas} falha(s) no total`);
  process.exit(falhas ? 1 : 0);
}

if (import.meta.filename === path.resolve(process.argv[1] ?? '')) await principal();
