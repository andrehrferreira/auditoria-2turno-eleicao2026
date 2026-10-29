// Cético, achado "invariantes sem violação", foco PODER: cada "0 violação" pegaria UMA linha alterada?
// Copia um pacote real (BU, RDV, log, vota.vsc) para data/parsed/auditoria/cetico/isv/poder/<mutação>/, aplica uma
// mutação por cópia e roda sobre ela (1) o verificador do AUTOR, exatamente o código de
// scripts/auditoria/matematico-brutos.mjs (analisarPacote, carregado sem alteração de lógica: só os imports relativos
// viram absolutos e as funções internas são exportadas), e (2) a verificação de lacres de src/lacres.js.
// Mutações:
//   M0 controle (cópia sem mudança)
//   M1 BU: +1 voto no 1º votável do presidente, sem refazer a cadeia
//   M2 BU: 1 voto passa do 1º para o 2º votável (soma igual), sem refazer a cadeia
//   M3 BU: como M2, com a cadeia inteira recalculada (adversário) e o último hash regravado
//   M4 BU: +1 voto e +1 comparecimento (cargo, BU e detalhamento), cadeia recalculada; RDV e log intactos
//   M5 RDV: 1 registro do presidente muda de candidato (digitação trocada), mesmo tamanho
//   M6 BU (M3) + RDV (M5) coerentes: o adversário altera os dois
//   M7 RDV: 1 registro do presidente apagado (comprimentos DER refeitos)
//   M8 BU: +1 apto e +1 apto da seção (coerentes), tuplas intactas
//   M9 BU: detalhamento, 1 eleitor de "por biometria" para "sem biometria" (soma igual)
// Uso: node scripts/auditoria/cetico-isv-poder.mjs [--dir <diretório do hash>] [--turno 2]
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { decodificarArquivo, filhos, lerTlv } from '../../src/asn1.js';
import { DIR_DADOS } from '../../src/config.js';
import { arquivoBu } from '../../src/esquemas.js';
import { carregarAcs, verificarLacres } from '../../src/lacres.js';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const { values } = parseArgs({
  options: {
    dir: { type: 'string', default: 'data/raw/2t/urnas/ac/01007/0009/0001/586f4f39774250616f5574624e487a3164396e593136596c6937327875694d6a6b396a455943414f5743733d' },
    turno: { type: 'string', default: '2' },
  },
});
const ORIGEM = path.resolve(RAIZ, values.dir);
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'isv', 'poder');
const DATA = { 1: '2026-10-04', 2: '2026-10-25' }[values.turno];

// ---- verificador do autor, sem mudança de lógica ----
const fonte = await readFile(path.join(RAIZ, 'scripts', 'auditoria', 'matematico-brutos.mjs'), 'utf8');
const urlSrc = pathToFileURL(path.join(RAIZ, 'src')).href;
const adaptado = `${fonte.replaceAll("'../../src/", `'${urlSrc}/`)}\nexport { analisarPacote, cargosBu, cargosRdv };\n`;
await mkdir(SAIDA, { recursive: true });
const modAutor = path.join(SAIDA, '_autor-matematico-brutos.mjs');
await writeFile(modAutor, adaptado);
const autor = await import(pathToFileURL(modAutor).href);

const sha = (b) => createHash('sha512').update(b).digest();
const z = (n, w) => String(n).padStart(w, '0');

// ---- DER: localizar tuplas do BU (dentro do OCTET STRING do envelope) ----
function conteudoBu(buf) {
  const env = lerTlv(buf, 0);
  return filhos(env).find((n) => n.tag === 0x04); // conteúdo = DER da entidadeBoletimUrna
}
/** Em ordem de documento: cada totalVotosVotavel (offset do valor de quantidade e do hash) e cada ultimoHash. */
function mapaBu(buf) {
  const oct = conteudoBu(buf);
  const ent = lerTlv(buf, oct.inicio, oct.fim);
  const tuplas = [];
  const ultimos = [];
  const andar = (no) => {
    const f = filhos(no);
    if (no.tag === 0x30 && f.some((x) => x.tag === 0x81) && f.some((x) => x.tag === 0x82)) {
      const q = f.find((x) => x.tag === 0x82);
      tuplas.push({ q, hash: f.at(-1) });
      return;
    }
    // resultadoVotacaoPorEleicao: [int, int, int, int, seqOf, oct(64) ultimoHash, oct assinatura]
    if (no.tag === 0x30 && f.length === 7 && f[0].tag === 0x02 && f[4].tag === 0x30 && f[5].tag === 0x04 && f[5].valor.length === 64) ultimos.push(f[5]);
    for (const x of f) if (x.construido) andar(x);
  };
  andar(ent);
  return { tuplas, ultimos, ent };
}
const intDe = (no) => no.valor.reduce((a, b) => a * 256 + b, 0);
function gravarInt(buf, no, valor) {
  const bytes = [];
  for (let v = valor, i = 0; i < no.valor.length; i++, v = Math.floor(v / 256)) bytes.unshift(v % 256);
  if (bytes[0] & 0x80 || Math.floor(valor / 256 ** no.valor.length) > 0) throw new Error('valor não cabe no mesmo tamanho');
  Buffer.from(bytes).copy(buf, no.inicio);
}
/** Recalcula a cadeia inteira do BU (como faria um adversário) e regrava hashes e últimos hashes no lugar. */
function refazerCadeia(buf) {
  const bu = decodificarArquivo(arquivoBu, buf).conteudo;
  const { tuplas, ultimos } = mapaBu(buf);
  const pleito = bu.cabecalho.idEleitoral.idPleito;
  const { municipio, zona } = bu.identificacaoSecao.municipioZona;
  const codigoCarga = bu.urna.correspondenciaResultado.carga.codigoCarga;
  const CARGO = { presidente: 1, governador: 3, senador: 5, deputadoFederal: 6, deputadoEstadual: 7, deputadoDistrital: 8, prefeito: 11 };
  const TIPO = { nominal: 1, branco: 2, nulo: 3, legenda: 4, cargoSemCandidato: 5 };
  let t = 0;
  bu.resultadosVotacaoPorEleicao.forEach((e, ie) => {
    let h = sha(Buffer.from(`${z(pleito, 5)}|${z(e.idEleicao, 5)}|${z(municipio, 5)}|${z(zona, 4)}|${z(bu.identificacaoSecao.secao, 4)}|${codigoCarga}`, 'latin1')).toString('hex').toUpperCase();
    for (const rv of e.resultadosVotacao) {
      for (const tvc of rv.totaisVotosCargo) {
        const cod = tvc.codigoCargo.cargoConstitucional ? CARGO[tvc.codigoCargo.cargoConstitucional] : tvc.codigoCargo.numeroCargoConsultaLivre;
        tvc.votosVotaveis.forEach((v, i) => {
          const base = `${h}|${i + 1}|${cod}|${TIPO[v.tipoVoto]}|${v.quantidadeVotos}`;
          const d = sha(Buffer.from(v.identificacaoVotavel ? `${base}|${v.identificacaoVotavel.codigo}|${v.identificacaoVotavel.partido}` : base, 'latin1'));
          d.copy(buf, tuplas[t++].hash.inicio);
          h = d.toString('hex').toUpperCase();
        });
      }
    }
    Buffer.from(h, 'hex').copy(buf, ultimos[ie].inicio);
  });
}
/** Comparecimento: qtdComparecimento do resultado da 1ª eleição, qtdEleitoresCompareceram e porBiometria. */
function somarComparecimento(buf, delta) {
  const { ent } = mapaBu(buf);
  const f = filhos(ent);
  const comp = f[6];
  gravarInt(buf, comp, intDe(comp) + delta);
  const det = f[7];
  if (det?.tag === 0xa1) {
    const d = filhos(det)[1];
    gravarInt(buf, d, intDe(d) + delta);
  }
  const porEleicao = f.find((n) => n.tag === 0x30 && filhos(n)[0]?.tag === 0x30 && filhos(filhos(n)[0]).length === 7);
  const e1 = filhos(filhos(porEleicao)[0]);
  const rv = filhos(filhos(e1[4])[0])[1];
  gravarInt(buf, rv, intDe(rv) + delta);
}

// ---- DER: RDV ----
const votosPresidenteRdv = (buf) => {
  const rdv = filhos(lerTlv(buf, 0))[2];
  const el = filhos(filhos(rdv).at(-1))[0];
  const vc = filhos(filhos(el).at(-1))[0];
  return filhos(vc)[2]; // seqOf voto
};
/** Troca a digitação de um registro nominal `de` → `para` (mesmo tamanho). Devolve o índice alterado. */
function trocarRegistro(buf, de, para) {
  const votos = votosPresidenteRdv(buf);
  const lista = filhos(votos);
  for (let i = 0; i < lista.length; i++) {
    const dig = filhos(lista[i]).find((x) => x.tag === 0x12);
    if (dig && dig.valor.toString('latin1') === de) {
      Buffer.from(para, 'latin1').copy(buf, dig.inicio);
      return i;
    }
  }
  throw new Error(`registro ${de} não achado`);
}
const comprimento = (n) => {
  if (n < 0x80) return Buffer.from([n]);
  const b = [];
  for (let v = n; v > 0; v = Math.floor(v / 256)) b.unshift(v % 256);
  return Buffer.from([0x80 | b.length, ...b]);
};
/** Reescreve o DER apagando o TLV que ocupa [alvoIni, alvoFim) e refazendo os comprimentos dos ancestrais. */
function apagarTlv(buf, alvoIni, alvoFim) {
  const refazer = (no, ini) => {
    if (no.fim <= alvoIni || ini >= alvoFim) return buf.subarray(ini, no.fim);
    if (ini === alvoIni && no.fim === alvoFim) return Buffer.alloc(0);
    if (!no.construido) throw new Error('alvo corta um TLV primitivo');
    const partes = [];
    let p = no.inicio;
    for (const x of filhos(no)) {
      partes.push(refazer(x, p));
      p = x.fim;
    }
    const corpo = Buffer.concat(partes);
    return Buffer.concat([Buffer.from([no.tag]), comprimento(corpo.length), corpo]);
  };
  return refazer(lerTlv(buf, 0), 0);
}

async function copiar(nome) {
  const d = path.join(SAIDA, nome);
  await rm(d, { recursive: true, force: true });
  await cp(ORIGEM, d, { recursive: true });
  const nomes = await readdir(d);
  const arq = (suf) => path.join(d, nomes.find((n) => n.endsWith(suf)));
  return { d, nomes, bu: arq('-bu.dat'), rdv: arq('-rdv.dat') };
}

async function rodar(nome, descricao, mutar) {
  const c = await copiar(nome);
  const bu = await readFile(c.bu);
  const rdv = await readFile(c.rdv);
  const extra = (await mutar?.({ bu, rdv })) ?? {};
  await writeFile(c.bu, extra.bu ?? bu);
  await writeFile(c.rdv, extra.rdv ?? rdv);
  const partes = c.d.split(path.sep);
  const s = { uf: partes.at(-5), municipio: partes.at(-4), zona: partes.at(-3), secao: partes.at(-2) };
  const p = await autor.analisarPacote(values.turno, { uf: 'xx', municipio: '0', zona: '0', secao: '0', ...s }, { hash: nome, st: null, dirHash: c.d, nomes: c.nomes });
  const vsc = await readFile(path.join(c.d, c.nomes.find((n) => n.endsWith('-vota.vsc'))));
  const arquivos = new Map();
  for (const n of c.nomes) if (!n.endsWith('.vsc')) arquivos.set(n, await readFile(path.join(c.d, n)));
  const lac = verificarLacres({ vsc, arquivos, acs, dataEleicao: new Date(DATA) });
  const falhasLacre = lac.resultados.filter((r) => !r.ok).map((r) => r.item);
  const linha = {
    mutacao: nome, descricao, detalhe: extra.detalhe ?? null,
    autor: { violacoes: p.violacoes, cadeia: p.cadeia, erros: p.erros ?? [] },
    lacres: { conferencias: lac.resultados.length, falhas: falhasLacre },
  };
  console.log(`${nome}: autor ${p.violacoes.length ? p.violacoes.join(',') : 'NENHUMA violação'} | cadeia ${JSON.stringify(p.cadeia)} | lacres ${falhasLacre.length ? `FALHA: ${falhasLacre.join(' ; ')}` : 'ok'}`);
  return linha;
}

const acs = await carregarAcs();
const resultados = [];
const tupla = (buf, i) => mapaBu(buf).tuplas[i].q;
resultados.push(await rodar('M0', 'controle, cópia sem mudança'));
resultados.push(await rodar('M1', '+1 voto no 1º votável do presidente, sem refazer a cadeia', ({ bu }) => {
  const q = tupla(bu, 0);
  gravarInt(bu, q, intDe(q) + 1);
  return { detalhe: `tupla 1: ${intDe(q) - 1} → ${intDe(q)}` };
}));
resultados.push(await rodar('M2', '1 voto do 1º para o 2º votável do presidente, sem refazer a cadeia', ({ bu }) => {
  const [a, b] = [tupla(bu, 0), tupla(bu, 1)];
  gravarInt(bu, a, intDe(a) - 1);
  gravarInt(bu, b, intDe(b) + 1);
}));
resultados.push(await rodar('M3', 'M2 com a cadeia recalculada pelo adversário', ({ bu }) => {
  const [a, b] = [tupla(bu, 0), tupla(bu, 1)];
  gravarInt(bu, a, intDe(a) - 1);
  gravarInt(bu, b, intDe(b) + 1);
  refazerCadeia(bu);
}));
resultados.push(await rodar('M4', '+1 voto e +1 comparecimento no BU, cadeia recalculada; RDV e log intactos', ({ bu }) => {
  const b = tupla(bu, 1);
  gravarInt(bu, b, intDe(b) + 1);
  somarComparecimento(bu, 1);
  refazerCadeia(bu);
}));
resultados.push(await rodar('M5', 'RDV: 1 registro do presidente 13 → 22 (BU intacto)', ({ rdv }) => ({ detalhe: `registro ${trocarRegistro(rdv, '13', '22')}` })));
resultados.push(await rodar('M6', 'BU (M3) e RDV (M5) alterados de forma coerente', ({ bu, rdv }) => {
  const [a, b] = [tupla(bu, 0), tupla(bu, 1)];
  gravarInt(bu, a, intDe(a) - 1);
  gravarInt(bu, b, intDe(b) + 1);
  refazerCadeia(bu);
  return { detalhe: `registro ${trocarRegistro(rdv, '13', '22')}` };
}));
resultados.push(await rodar('M7', 'RDV: 1 registro do presidente apagado', ({ rdv }) => {
  const votos = votosPresidenteRdv(rdv);
  const primeiro = lerTlv(rdv, votos.inicio, votos.fim);
  const ini = votos.inicio;
  const novo = apagarTlv(rdv, ini, primeiro.fim);
  return { rdv: novo, detalhe: `${rdv.length} → ${novo.length} bytes` };
}));
resultados.push(await rodar('M8', 'BU: +1 apto e +1 apto da seção na 1ª eleição (coerentes), sem tocar nas tuplas', ({ bu }) => {
  const { ent } = mapaBu(bu);
  const porEleicao = filhos(ent).find((n) => n.tag === 0x30 && filhos(n)[0]?.tag === 0x30 && filhos(filhos(n)[0]).length === 7);
  const [, aptos, aptosSecao] = filhos(filhos(porEleicao)[0]);
  gravarInt(bu, aptos, intDe(aptos) + 1);
  gravarInt(bu, aptosSecao, intDe(aptosSecao) + 1);
}));
resultados.push(await rodar('M9', 'BU: detalhamento, 1 eleitor passa de "por biometria" para "sem biometria" (soma igual)', ({ bu }) => {
  const det = filhos(mapaBu(bu).ent)[7];
  const [sem, bio] = filhos(det);
  gravarInt(bu, sem, intDe(sem) + 1);
  gravarInt(bu, bio, intDe(bio) - 1);
}));
await writeFile(path.join(SAIDA, 'poder.json'), `${JSON.stringify({ origem: path.relative(RAIZ, ORIGEM), resultados }, null, 1)}\n`);
