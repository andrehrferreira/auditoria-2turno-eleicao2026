Você é revisor independente de uma auditoria pública dos arquivos de urna do 2º turno das eleições brasileiras de 2026 (25/10/2026; 1º turno em 04/10/2026). Os arquivos (BU, RDV, log, assinaturas .vsc) são publicados pelo TSE. Seu trabalho é achar erros, riscos de interpretação e explicações alternativas, não confirmar o que já foi feito.

Regras:
- Responda em português do Brasil.
- Separe Fato (verificável no material abaixo ou em fonte primária citada), Hipótese e Recomendação.
- Não invente números, URLs, normas nem nomes de resolução. Se não souber, diga "não sei" e como verificar.
- Responda SOMENTE com um JSON neste formato:
{"resumo": "<3 a 6 frases>", "achados": [{"id": "A1", "tipo": "erro|risco|explicacao-alternativa|melhoria|fonte", "afirmacao": "<o que você afirma>", "evidencia": "<trecho, linha de código ou fonte que sustenta>", "confianca": 0.0, "como_verificar": "<teste ou consulta concreta>"}]}
- Lista vazia só com justificativa no resumo.

## Tarefa T07: revisar a verificação de assinaturas ("lacres") dos arquivos de urna

O código abaixo verifica: certificado da urna assinado pela AC emissora (Ed521 ou ECDSA), hash SHA-512 e assinatura de cada arquivo listado no .vsc, e a cadeia de hashes das tuplas do BU com a assinatura do último hash. Resultado já obtido: 0 falhas nas 2.270 seções do AC. A documentação de formato está no doc 06.

Perguntas:
1. Há caminho em que uma verificação "passa" sem verificar de fato (exceção engolida, comparação fraca, campo ausente tratado como ok, arquivo errado comparado, tamanho ou encoding)?
2. A implementação de Ed521 (curva Edwards de 521 bits) e de ECDSA está correta para o que o TSE descreve? Pontos de atenção em decodificação de chave, ordem de bytes, hash usado.
3. O que ficou sem verificar (bloco SW com algoritmo CEPESC não público, arquivos não publicados) e como descrever isso num relatório público sem exagerar nem minimizar.

### Arquivo `src/lacres.js`

```js
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

```

### Arquivo `src/ed521.js`

```js
import { createHash } from 'node:crypto';

// Verificação Ed521 (EdDSA sobre a curva E-521), usada pelas urnas UE2020 e posteriores.
// O OpenSSL e o node:crypto não têm essa curva; os exemplos oficiais do TSE usam a biblioteca ECPy.
// Parâmetros copiados de ECPy (src/ecpy/curve_defs.py, 'Ed521'); a verificação segue ECPy (src/ecpy/eddsa.py):
//   H = SHAKE256("SigEd521" || 0x00 || 0x00 || R || A || M, 132 bytes), aceita se S·B = R + H·A.
// Pontos em 66 bytes little-endian: 527 bits de y e, no bit 527, a paridade de x.
// Só há verificação (dados públicos), então não há segredo a proteger contra ataques de tempo.

const P = (1n << 521n) - 1n;
const D = P - 376014n;
const L = 0x7ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffd15b6c64746fc85f736b8af5e7ec53f04fbd8c4569a8f1f4540ea2435f5180d6bn;
const GX = 0x752cb45c48648b189df90cb2296b2878a3bfd9f42fc6c818ec8bf3c9c0c6203913f6ecc5ccc72434b1ae949d568fc99c6059d0fb13364838aa302a940a2f19ba6cn;
const GY = 0x0cn;
const DOMINIO = Buffer.from('SigEd521\x00\x00', 'latin1');

export const TAMANHO_CHAVE = 66;
export const TAMANHO_ASSINATURA = 132;

const mod = (a) => {
  const r = a % P;
  return r < 0n ? r + P : r;
};

function potencia(base, expoente) {
  let r = 1n;
  let b = mod(base);
  for (let e = expoente; e > 0n; e >>= 1n) {
    if (e & 1n) r = (r * b) % P;
    b = (b * b) % P;
  }
  return r;
}

// Coordenadas estendidas (X, Y, Z, T) com a = 1 (add-2008-hwcd).
function soma([x1, y1, z1, t1], [x2, y2, z2, t2]) {
  const a = (x1 * x2) % P;
  const b = (y1 * y2) % P;
  const c = (((D * t1) % P) * t2) % P;
  const d = (z1 * z2) % P;
  const e = mod((x1 + y1) * (x2 + y2) - a - b);
  const f = mod(d - c);
  const g = mod(d + c);
  const h = mod(b - a);
  return [(e * f) % P, (g * h) % P, (f * g) % P, (e * h) % P];
}

function multiplica(k, ponto) {
  let r = [0n, 1n, 1n, 0n];
  let q = ponto;
  for (let n = k; n > 0n; n >>= 1n) {
    if (n & 1n) r = soma(r, q);
    q = soma(q, q);
  }
  return r;
}

const estendido = ([x, y]) => [x, y, 1n, (x * y) % P];
const iguais = ([x1, y1, z1], [x2, y2, z2]) => mod(x1 * z2 - x2 * z1) === 0n && mod(y1 * z2 - y2 * z1) === 0n;
const littleEndian = (bytes) => BigInt(`0x${Buffer.from(bytes).reverse().toString('hex') || '0'}`);

/** Decodifica um ponto de 66 bytes; null se não for um ponto válido da curva. */
export function decodificarPonto(bytes) {
  if (bytes.length !== TAMANHO_CHAVE) return null;
  const v = littleEndian(bytes);
  const sinal = v >> 527n;
  const y = v & ((1n << 527n) - 1n);
  if (y >= P) return null;
  const xx = mod((1n - y * y) * potencia(mod(1n - D * y * y), P - 2n));
  let x = potencia(xx, (P + 1n) / 4n); // p ≡ 3 (mod 4)
  if ((x * x) % P !== xx) return null;
  if (x === 0n && sinal) return null;
  if ((x & 1n) !== sinal) x = P - x;
  return [x, y];
}

/** Codifica (x, y) em 66 bytes (usado para montar chaves de vetores de teste). */
export function codificarPonto(x, y) {
  const v = y | ((x & 1n) << 527n);
  return Buffer.from(v.toString(16).padStart(2 * TAMANHO_CHAVE, '0'), 'hex').reverse();
}

/** Verifica uma assinatura Ed521 pura. Retorna true/false, nunca lança por dado inválido. */
export function verificarEd521(chavePublica, mensagem, assinatura) {
  if (chavePublica.length !== TAMANHO_CHAVE || assinatura.length !== TAMANHO_ASSINATURA) return false;
  const a = decodificarPonto(chavePublica);
  const bytesR = assinatura.subarray(0, TAMANHO_CHAVE);
  const r = decodificarPonto(bytesR);
  if (!a || !r) return false;
  const s = littleEndian(assinatura.subarray(TAMANHO_CHAVE));
  if (s >= L) return false;
  const h = createHash('shake256', { outputLength: 132 }).update(Buffer.concat([DOMINIO, bytesR, chavePublica, mensagem])).digest();
  const k = littleEndian(h) % L;
  return iguais(multiplica(s, estendido([GX, GY])), soma(estendido(r), multiplica(k, estendido(a))));
}

```

### Arquivo `src/vsc.js`

```js
import { createHash } from 'node:crypto';

// O `-vota.vsc` de cada seção é DER (ASN.1) e lista os arquivos da urna como
// SEQUENCE { GeneralString nome, SEQUENCE { INTEGER, OCTET STRING sha512 (64 bytes), ... } }.
// Essas listas ficam dentro de OCTET STRINGs que contêm DER aninhado.

const TAG_INTEGER = 0x02;
const TAG_OCTET_STRING = 0x04;
const TAG_SEQUENCE = 0x30;
const TAG_GENERAL_STRING = 0x1b;
const PROFUNDIDADE_MAXIMA = 32;

function lerTlv(buffer, posicao, limite) {
  if (posicao >= limite) throw new Error('DER: fim inesperado');
  const tag = buffer[posicao];
  let p = posicao + 1;
  if ((tag & 0x1f) === 0x1f) {
    while (p < limite && buffer[p] & 0x80) p++;
    p++;
  }
  if (p >= limite) throw new Error('DER: comprimento ausente');
  let comprimento = buffer[p++];
  if (comprimento & 0x80) {
    const bytes = comprimento & 0x7f;
    if (bytes === 0 || bytes > 4) throw new Error('DER: comprimento inválido');
    comprimento = 0;
    for (let i = 0; i < bytes; i++) {
      if (p >= limite) throw new Error('DER: comprimento truncado');
      comprimento = comprimento * 256 + buffer[p++];
    }
  }
  const fim = p + comprimento;
  if (fim > limite) throw new Error('DER: conteúdo ultrapassa o limite');
  return { tag, construido: (tag & 0x20) !== 0, inicio: p, fim };
}

function filhos(buffer, inicio, fim) {
  const lista = [];
  for (let p = inicio; p < fim; ) {
    const tlv = lerTlv(buffer, p, fim);
    lista.push(tlv);
    p = tlv.fim;
  }
  return lista;
}

function tentarFilhos(buffer, inicio, fim) {
  try {
    return filhos(buffer, inicio, fim);
  } catch {
    return null;
  }
}

function comoEntradaDeArquivo(buffer, tlv) {
  if (tlv.tag !== TAG_SEQUENCE) return null;
  const partes = tentarFilhos(buffer, tlv.inicio, tlv.fim);
  if (!partes || partes.length !== 2) return null;
  const [nome, dados] = partes;
  if (nome.tag !== TAG_GENERAL_STRING || dados.tag !== TAG_SEQUENCE) return null;
  const campos = tentarFilhos(buffer, dados.inicio, dados.fim);
  if (!campos || campos.length < 2) return null;
  const [inteiro, resumo] = campos;
  if (inteiro.tag !== TAG_INTEGER || resumo.tag !== TAG_OCTET_STRING || resumo.fim - resumo.inicio !== 64) return null;
  return {
    nome: buffer.toString('latin1', nome.inicio, nome.fim),
    sha512: buffer.toString('hex', resumo.inicio, resumo.fim),
  };
}

function percorrer(buffer, inicio, fim, profundidade, encontrados) {
  if (profundidade > PROFUNDIDADE_MAXIMA) return;
  const lista = tentarFilhos(buffer, inicio, fim);
  if (!lista) return;
  for (const tlv of lista) {
    const entrada = comoEntradaDeArquivo(buffer, tlv);
    if (entrada) {
      encontrados.push(entrada);
    } else if (tlv.construido) {
      percorrer(buffer, tlv.inicio, tlv.fim, profundidade + 1, encontrados);
    } else if (tlv.tag === TAG_OCTET_STRING && tlv.fim - tlv.inicio > 2 && buffer[tlv.inicio] === TAG_SEQUENCE) {
      percorrer(buffer, tlv.inicio, tlv.fim, profundidade + 1, encontrados);
    }
  }
}

/**
 * Extrai do `-vota.vsc` o mapa nome do arquivo → SHA-512 (hex).
 * Um mesmo arquivo pode aparecer em mais de um bloco; valores divergentes são erro.
 */
export function lerResumosVsc(buffer) {
  const raiz = lerTlv(buffer, 0, buffer.length);
  if (raiz.tag !== TAG_SEQUENCE) throw new Error('vota.vsc: raiz não é SEQUENCE');
  const encontrados = [];
  percorrer(buffer, raiz.inicio, raiz.fim, 0, encontrados);
  if (encontrados.length === 0) throw new Error('vota.vsc: nenhuma entrada de arquivo encontrada');

  const mapa = new Map();
  for (const { nome, sha512 } of encontrados) {
    const anterior = mapa.get(nome);
    if (anterior && anterior !== sha512) throw new Error(`vota.vsc: resumos divergentes para ${nome}`);
    mapa.set(nome, sha512);
  }
  return mapa;
}

/**
 * Nome do diretório de hash publicado pelo TSE: hex(base64(SHA-256(vota.vsc))),
 * com '/' trocado por '-' no base64 ('+' e '=' são mantidos), conforme os aux.json de 2026.
 */
export function hashDiretorio(vota) {
  const base64 = createHash('sha256').update(vota).digest('base64').replaceAll('/', '-');
  return Buffer.from(base64, 'latin1').toString('hex');
}

export const sha512Hex = (buffer) => createHash('sha512').update(buffer).digest('hex');

```

### Arquivo `docs/06-leitura-bu-rdv-log.md`

```markdown
# 06. Leitura do BU, do RDV e do log (formato observado em 2026)

Mapa construído em 29/10/2026 a partir da seção ES 57037/0055/0372 ([casos/es-57037-z0055-s0372.md](casos/es-57037-z0055-s0372.md)), cruzando campo a campo com o log da urna. Depois foi conferido contra a especificação oficial v2 do TSE (doc 02): os enums de tipo de voto do BU e do RDV e a ordem dos campos do BU batem com ela.

## Ferramentas

- **Conversor para JSON legível** (para pessoas e LLMs): `node src/exportar.js --uf ac --municipio 01007 [--zona 0009] [--secao 0003] [--log dia|completo|nao]`. Gera um arquivo por seção em `data/parsed/<t>t/json/<uf>/<município>/<zona>-<seção>.json`, com:
  - BU, RDV, BU impresso (`imgbu`, como texto) e pacote de assinaturas, decodificados pela **especificação oficial v2** (`src/esquemas.js` transcreve `bu.asn1`, `rdv.asn1` e `assinatura.asn1`; `src/asn1.js` é o decodificador). Os campos têm os nomes da especificação e os enums vêm por nome;
  - nome do candidato e do partido em cada votável (`node src/referencia.js --turno N` baixa os candidatos e municípios do TSE);
  - eventos do log (do dia da votação, por padrão), com resumo e métricas (`perfilLog`);
  - SHA-256 e URL de cada arquivo, e o resultado da verificação das assinaturas (`verificarLacres`).
  - O log ocupa ~99% do tamanho (~570 KB por seção); com `--log nao`, fica em ~40 KB.
- **Fato (29/10/2026).** Os arquivos reais de 2026 decodificam pela especificação v2 sem nenhum campo fora do previsto no BU, no RDV e no envelope do `imgbu`, inclusive nas urnas de contingência e no Sistema de Apuração. Desvios só no `.vsc`: `conjuntoChave [0]` e `certificadoDigital [1]` com tag de contexto, e o modelo do equipamento no fim, numa SEQUENCE com um segundo ENUMERATED não documentado (valor 4 nas amostras).
- **`imgbu.dat`** = envelope com o **BU impresso em texto** (latin1), intercalado com blocos binários. **Hipótese:** os blocos são QR codes e comandos de impressora; o formato deles não está na especificação v2.
- `openssl asn1parse -inform DER -in arquivo.dat -i` mostra a estrutura, mas **não mostra o valor das tags de contexto** (`[1]`, `[2]`...), onde ficam os votos. Use um leitor DER genérico (≈20 linhas de Node) que imprima inteiros e strings de qualquer tag.
- `7z x arquivo-log.jez` extrai o `logd.dat`. Converter com `iconv -f ISO-8859-1 -t UTF-8`.

## BU (`-bu.dat`)

Envelope externo: `SEQUENCE { cabeçalho {dataGeração, [2] pleito}, fase ENUM, [0] identificação {município, zona, local, seção}, tipo ENUM, OCTET STRING (conteúdo DER) }`.

Conteúdo (o OCTET STRING é outro DER):

| Campo observado | Exemplo (caso ES) | Conferido com o log |
|---|---|---|
| cabeçalho: data de geração, pleito | `20261025T170332`, `3221` | sim (geração do bu.dat 17:03:32–33) |
| fase | `2` (oficial) | "Fase da UE: Oficial" |
| urna → versão | `10.23.0.0 - Praia da Barra do Cahy` | sim |
| urna → correspondência → município/zona/seção | 57037 / 55 / 372 | sim |
| urna → carga → número interno da urna | `2199150` | coluna 3 do log (`02199150`) |
| urna → carga → computador da mídia | `ZES055STD01`, TPM `76FBD81B`, instalação `72791717` | sim |
| urna → carga → data/hora da carga | `20260922T182300` | log de 22/09 |
| urna → carga → código de carga | string de 24 dígitos | — |
| urna → serial da MV (inteiro) | `720251443` = `0x2AEE2A33` | "Serial da MV: 2AEE2A33" |
| identificação da seção → **local** | `1430` | — |
| data/hora de emissão | `20261025T170317` | "Inicio do Encerramento 17:03:16" |
| `[0]` abertura / encerramento | `T080001` / `T170139` | "Urna pronta" 08:00:01 / encerramento confirmado 17:01:39 |
| inteiro após `[0]` | `263` = comparecimento | 263 "voto computado" |
| `[1] detalhamentoComparecimento` | `38, 213, 12` | Nomes oficiais (spec v2): `qtdEleitoresCompareceramSemBiometria` (sem biometria cadastrada), `qtdEleitoresHabilitadosPorBiometria`, `qtdEleitoresHabilitadosPorBiografia` (tinham biometria e foram liberados por ano de nascimento). **Fato:** no AC inteiro os três batem com o log em 2.270/2.270 seções, contando só habilitações que terminaram em voto |
| resultados por eleição | `6258` (federal), `6260` (estadual) | — |
| → aptos: total, originais da seção, temporários (TTE) | `363`, `363`, `0` | — |
| → tipo de cargo ENUM, comparecimento | `1`, `263` | — |
| → cargo `[1]` | `1` Presidente, `3` Governador | — |
| → votável `{[1] tipo, [2] qtd, [3] {partido, número}, ordem, assinatura 64 B}` | ver caso | soma = comparecimento |

**Enum de tipo de voto no BU:** `1` nominal, `2` branco, `3` nulo.

## RDV (`-rdv.dat`)

Estrutura observada: `SEQUENCE { cabeçalho, urna (igual ao BU), SEQUENCE { pleito, fase, identificação, código de carga, [1] eleições } }`. Cada eleição: `{ id, SEQUENCE OF { [1] cargo, qtd. escolhas, SEQUENCE OF voto } }`; cada voto: `{ tipo ENUM, digitação NumericString opcional }`. Os votos vêm **ordenados**, não na ordem de votação (preserva o sigilo).

**Atenção: o enum do RDV é diferente do BU.** No RDV: `2` nominal, `3` branco (sem digitação), `4` nulo (com a digitação feita, ex. `00`, `66`).

O nulo no RDV guarda o número digitado. Exemplo do caso: 5 nulos para Governador com digitação `13`, que é o número de um candidato a Presidente. Isso ajuda a separar "nulo intencional" de "eleitor confundiu o cargo".

## Pacote de assinaturas (`-vota.vsc`)

Especificação: `spec/assinatura.asn1` do pacote oficial (doc 02). Verificador: `node src/lacres.js <diretório-do-hash>`.

**Estrutura observada em 2026** (difere da spec v2 de 2024, que põe `modeloEquipamento` primeiro):

```
SEQUENCE {
  assinaturaSW  EntidadeAssinatura   -- usuário "SEVIN", algoritmo 3 = CEPESC (não publicado), [0] conjunto de chaves
  assinaturaHW  EntidadeAssinatura   -- usuário "UEAO", id = nº interno da urna, algoritmo 4 = EdDSA (ou 2 = ECDSA), [1] certificado
  SEQUENCE { modelo ENUM (20 = UE2020), ENUM }
}
EntidadeAssinatura = { data, versão, autoAssinado {usuário, hash, algoritmo, {tamanho, hash, assinatura}}, OCTET STRING (lista), [0]|[1] extra }
item da lista      = { nome do arquivo, { tamanho, hash SHA-512 (64 B), assinatura } }
```

**Como verificar (Fato, conferido em 29/10/2026 contra os exemplos `assinatura_hash.py`, `bu_assinatura_tuplas.py` e `lib/mr_util.py` do TSE):**

| Conferência | Mensagem assinada | Chave |
|---|---|---|
| Certificado da urna | `TBSCertificate` (bytes DER). Em ECDSA, com SHA-512 | AC emissora (`data/certificados/ac/`) |
| Cada arquivo do bloco HW | **`SHA-512(hash do arquivo)`**, não o arquivo | certificado da urna |
| Lista do bloco HW (`autoAssinado`) | `SHA-512(hash da lista)` (o exemplo do TSE só confere o hash; a assinatura também confere) | certificado da urna |
| Último hash das tuplas do BU, por eleição | `SHA-512(ultimoHashVotosVotavel)` | certificado da urna |

- **Ed521**: OID `1.3.6.1.4.1.44588.2.1` (arco da Kryptus, registro IANA nº 44588). EdDSA sobre E-521: `p = 2^521 − 1`, `d = −376014`, SHAKE256 com saída de 132 bytes e prefixo `"SigEd521" 00 00`; chave de 66 bytes, assinatura de 132 bytes (R‖S, little-endian). Parâmetros da ECPy (`curve_defs.py`), a biblioteca usada pelos exemplos do TSE. Implementação em `src/ed521.js`, validada com os vetores de teste da ECPy (`test/ed521.test.js`).
- **ECDSA P-521** (urnas UE2013/UE2015, AC URNA): **Fato (29/10/2026)**, conferido em seção real: ZZ 29173/0001/0494 (Sistema de Apuração, urna UE2015, certificado DER `ueao01808076` emitido pela AC URNA). 17/17 conferências, inclusive a cadeia de hashes do BU. Amostra em `test/fixtures/lacres/zz-29173-0001-0494-sa-ue2015`.
- **Observação: AC URNA vencida.** O certificado publicado da AC URNA vale de 22/07/2011 a **18/07/2026**, antes da eleição, mas continua validando certificados de urna emitidos depois disso. **Hipótese:** a AC foi renovada com a mesma chave e o certificado novo não foi publicado. `src/lacres.js` registra isso em `observacoes` (não conta como falha). Esclarecer com o TSE.
- **Sistema de Apuração (SA):** pacote com `-sa.vsc`, `-busa.dat`, `-logsa.jez`, `-imgbusa.dat` (doc 03). No BU do SA, `dadosSecaoSA` vem como `[1] dadosSA` (sem abertura/encerramento) na mesma posição em que o BU de seção tem `[0]`; o detalhamento do comparecimento também é `[1]`, mas na posição seguinte. Ler por posição, não pela tag.
- **Fato (29/10/2026).** AC completo, 2º turno: 2.270 seções (3.310 diretórios de hash, contando as cópias zip + por seção), 0 falhas. Emissores: AC UE2022 em 1.884 diretórios, AC UE2020 em 1.426. Tempo: ~0,14 s por diretório (Ed521 em BigInt, sem paralelismo); projeção nacional de ~500 mil seções ≈ 20 h em um núcleo, e pode ser paralelizada.
- O **bloco SW (CEPESC)** usa algoritmo de criptografia não publicado: o hash confere, a assinatura não é verificável por terceiros.
- A lista tem 11 arquivos; o portal publica `bu.dat`, `rdv.dat`, `log.jez` e, no zip por UF, `imgbu.dat`. Os demais (`jufa.dat`, `imgze.dat`, `hash.dat`, `wsqbio.jez`, `wsqman.jez`, `wsqmes.jez`, `mr.ver`) só têm o lacre do hash conferível. `wsq*` são imagens de digitais (dado pessoal sensível).
- O `hash` do aux.json é o SHA-256 do arquivo `.vsc` inteiro, em base64 com `/` → `-`, codificado em hex (doc 02).

### Cadeia de hashes das tuplas do BU

Cada linha de votos do BU ("tupla") tem um hash que depende da anterior; o último é assinado pela urna.

```
h0 = SHA-512("pppp5|eeee5|mmmm5|zzz4|sss4|<codigoCarga 24>")         -- latin1; h em hex MAIÚSCULO
hN = SHA-512("<hN-1>|<ordem>|<codigoCargo>|<tipoVoto>|<qtd>|<codigo>|<partido>")   -- branco/nulo: sem os dois últimos
```

- `ordem` reinicia em 1 a cada cargo; `h0` é recalculado a cada eleição.
- **Urna de contingência** (`tipoUrna = 4`, "reservaSecao"): `correspondenciaResultado.identificacao` vem como `[1]` e traz só o município/zona de **origem** da urna reserva. O `h0` usa município/zona/seção de **`identificacaoSecao`** (onde a urna foi instalada) e o `codigoCarga` da própria urna. O exemplo do TSE (`bu_assinatura_tuplas.py`) assume `[0]` e falharia nesses casos. Conferido em AC 01007/0009/0002.
- `ResultadoVotacaoPorEleicao` traz três contagens de aptos: total, originais da seção e temporários (TTE).

## Log (`logd.dat`)

- **Horário local da UF**, não de Brasília (Fato: seção do AC abre às 06:00:01 e encerra às 15:03:35 = 08:00 e 17:03 de Brasília). O BU segue o mesmo relógio.
- Colunas separadas por TAB: `data hora`, `nível` (INFO/ALERTA/ERRO), `nº interno da urna`, `aplicação` (LOGD, GAP, SCUE, VOTA, ATUE, INITJE), `mensagem`, `hash de encadeamento` (16 hex).
- **Urna de contingência: dois logs no mesmo pacote.** O `log.jez` traz o `logd.dat` da urna reserva **e**, dentro dele, outro `.jez` com o log da urna original que quebrou (nome `{nº urna}{ddmmaaaa}{hhmmss}-01.jez`, ex.: `0227604025102026133917-01.jez`). Os votos dados antes da quebra estão no log da urna original. Para contar, juntar as linhas dos dois em ordem de horário (`src/perfil-secoes.js`, `lerLogs`). **Fato:** no AC, 39 pacotes com 2 ou mais logs; lendo só o `logd.dat`, 3 seções pareciam ter 10 vezes menos votos que o BU.
- **Leitura do `.jez`:** alguns ZIPs gravam o tamanho comprimido só no diretório central (bit 3 das flags), com zeros no cabeçalho local. Ler sempre pelo diretório central, como faz `src/zip.js` (que também confere o CRC-32). Um leitor que usa só o cabeçalho local falha em silêncio: no AC, 50 de 2.270 logs.
- **Seriais das mídias no log:** `Número de série da MR` (mídia de resultado, o cartão levado ao cartório) e `Serial da MV` (= `numeroSerieFV` do BU) aparecem a cada inicialização. Urna ligada na véspera (24/10) e não religada no dia lê a MR só em 24/10 (11 seções no AC).
- O log é **cumulativo**: o arquivo do 2º turno traz a carga, os testes, o 1º turno inteiro e o 2º turno. Para analisar um turno, filtrar pela data.
- Ciclo de um eleitor: `Aguardando digitação do identificador` → `Identificador digitado pelo mesário foi: (CPF | Título de eleitor)` → forma de habilitação → `Eleitor foi habilitado` → `Voto confirmado para [cargo]` (1 por cargo) → `O voto do eleitor foi computado`.

Formas de habilitação no log e campo correspondente no BU `[1]` (contar por ciclo de eleitor: de `Aguardando digitação do identificador do eleitor` até `O voto do eleitor foi computado`; habilitação cancelada não entra):

| Sequência no log | Classe | BU |
|---|---|---|
| `Tipo de habilitação do eleitor [biométrica]` | biometria | porBiometria |
| `Ano de nascimento digitado é igual ao do cadastro`, sem tentativa de digital | eleitor **sem biometria cadastrada** (confirmado pela spec) | semBiometria |
| `Solicitação de dado pessoal…` → `Dado digitado confere` → `Mesário … habilitou o eleitor` | tinha biometria, a digital falhou, liberado por ano de nascimento com a digital do mesário | porBiografia |
| `Solicitação de dado pessoal…` → `Dado digitado confere`, sem linha do mesário | tinha biometria, a digital falhou, liberado por ano de nascimento sem digital do mesário | porBiografia |

**Mensagens de situação do eleitor (catálogo do AC, 25/10/2026, 2.270 seções).** Úteis para os testes de H05: `O eleitor identificado já votou` (680), `Eleitor já justificou` (174), `Eleitor não encontrado para o identificador informado` (4.175), `Ano de nascimento digitado é diferente do cadastro` (245), `Habilitação cancelada durante confirmação de dado do eleitor` (1.776), `Eleitor foi suspenso pelo mesário` (103), `Eleitor impedido - título suspenso | título cancelado | vota na seção original | não tem idade mínima | convocado pela Justiça Eleitoral | solicitou voto em trânsito | é militar em serviço`. O log grava o **tipo** de identificador digitado, nunca o número do eleitor.

**Títulos de mesários no log.** O log traz o número do título dos mesários (registro, habilitação, encerramento). É dado de arquivo público do TSE e pode ser usado sem máscara (doc 05, regra 6a).

## Mensagens recorrentes, sem indício de problema até aqui

- `ERRO GAP Problema ao desmontar a MR`: aparece em toda inicialização da mídia de resultado no caso estudado (14/10, 19/10, 24/10, 25/10), logo antes de passar o controle ao VOTA, e a votação segue normal. **Hipótese:** mensagem benigna do aplicativo. Medir a frequência em outras urnas antes de concluir.
- `ALERTA GAP Urna não testada`: na carga e na preparação do 2º turno.
- `ALERTA VOTA Identificador do eleitor digitado inválido`: erro de digitação do mesário.
- Urna ligada em 24/10 e mantida ligada até a abertura de 25/10, sem nova inicialização: 11 seções no AC. **Hipótese:** preparação na véspera; conferir se é procedimento previsto.
- Duas linhas "Urna ligada" com 1–2 min de intervalo, sem aplicação iniciada na primeira: reinício logo após ligar. **Hipótese:** manuseio da chave/energia; o log não registra o motivo.

```
