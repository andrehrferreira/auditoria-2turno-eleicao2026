import { execFileSync } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo, carregarAcs, verificarLacres } from '../../src/lacres.js';
import { cortarCertificado } from './integridade-reverificar.mjs';

// Revisão cética nº 24 (H04). Duas conferências que a frente de integridade não fez:
//  1. Controle negativo em memória, um por emissor (AC UE2020 Ed521, AC UE2022 Ed521, AC URNA ECDSA UE2015 e UE2013, e um
//     dos 37.457 que precisam do corte): troca 1 bit (a) na assinatura da lista, (b) na assinatura do hash do BU dentro
//     da lista, (c) na assinatura da urna sobre o último hash do BU, (d) num byte do certificado da urna (TBS). Cada troca
//     tem que gerar falha na camada certa. Nada é gravado em disco.
//  2. Amostra de confirmação (não gera número): 30 diretórios sorteados (semente fixa) do 2º turno, `node src/lacres.js`
//     no diretório; o código de saída e o nº de conferências têm que bater com a linha do <uf>.jsonl.
// Uso: node scripts/auditoria/cetico-integridade-controle.mjs

const BASE = path.join(DIR_DADOS, 'raw', '2t', 'urnas');
const JSONL = path.join(DIR_DADOS, 'parsed', 'auditoria', 'integridade', '2t');
const acs = await carregarAcs();
const dataEleicao = new Date('2026-10-25');

let semente = 24;
const aleatorio = () => ((semente = (semente * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);

// Escolhe registros: um por emissor×modelo (+1 com corte), e 30 ao acaso.
const porTipo = new Map();
const sorteio = [];
let vistos = 0;
for (const arq of (await readdir(JSONL)).filter((n) => /^[a-z]{2}\.jsonl$/.test(n)).sort()) {
  for await (const l of createInterface({ input: createReadStream(path.join(JSONL, arq)), crlfDelay: Infinity })) {
    if (!l.includes('"papel":"oficial"')) continue;
    vistos++;
    const r = JSON.parse(l);
    const leitura = r.falhas?.some((f) => f.camada === 'leitura');
    const tipo = leitura ? 'corte' : `${r.urna?.emissor} ${r.vscInfo?.modelo}`;
    const item = { k: `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, hash: r.hash, conferencias: r.conferencias, falhas: r.falhas?.length ?? 0, tipo };
    if (!porTipo.has(tipo) && !r.vsc.endsWith('-sa.vsc')) porTipo.set(tipo, item);
    // amostragem por reservatório
    if (sorteio.length < 30) sorteio.push(item);
    else {
      const j = Math.floor(aleatorio() * vistos);
      if (j < 30) sorteio[j] = item;
    }
  }
}

function flip(buf, valor) {
  const i = buf.indexOf(valor);
  if (i < 0) throw new Error('valor não achado no buffer');
  const b = Buffer.from(buf);
  b[i + Math.floor(valor.length / 2)] ^= 0x01;
  return b;
}
// Lê os nós DER simples (tag, ini, fim) — só para achar os campos a adulterar.
function nos(b, i = 0, f = b.length) {
  const l = [];
  for (let p = i; p < f;) {
    const tag = b[p];
    let q = p + 1;
    let n = b[q++];
    if (n & 0x80) { const k = n & 0x7f; n = 0; for (let j = 0; j < k; j++) n = n * 256 + b[q++]; }
    l.push({ tag, p, ini: q, fim: q + n });
    p = q + n;
  }
  return l;
}

console.log('1. Controle negativo (em memória)');
for (const [tipo, c] of porTipo) {
  const dir = path.join(BASE, ...c.k.split('/'), c.hash);
  const nomes = await readdir(dir);
  const nomeVsc = acharArquivo(nomes, 'vsc');
  let vsc = await readFile(path.join(dir, nomeVsc));
  if (tipo === 'corte') vsc = cortarCertificado(vsc).vsc;
  const arquivos = new Map();
  for (const n of nomes) if (n !== nomeVsc && /^o\d{5}[a-z]{2}\d{13}-[a-z]+\.[a-z]+$/.test(n)) arquivos.set(n, await readFile(path.join(dir, n)));
  const base = verificarLacres({ vsc, arquivos, acs, dataEleicao });
  const falhasDe = (r) => r.resultados.filter((x) => !x.ok).map((x) => `${x.camada}: ${x.item.replace(/o\d{5}[a-z]{2}\d{13}-/, '')}`);
  // Campos: bloco HW = filho com [1] (certificado); [2] = autoAssinado (… [hash, assinatura] da lista); [3] = conteúdo.
  const [raiz] = nos(vsc);
  const hw = nos(vsc, raiz.ini, raiz.fim).find((n) => n.tag === 0x30 && nos(vsc, n.ini, n.fim).some((x) => x.tag === 0x81));
  const fh = nos(vsc, hw.ini, hw.fim);
  const auto = fh[2];
  const ultimoAuto = nos(vsc, auto.ini, auto.fim)[3];
  const [, , assinLista] = nos(vsc, ultimoAuto.ini, ultimoAuto.fim);
  const cert = fh.find((x) => x.tag === 0x81);
  const testes = [];
  // (a) assinatura da lista
  testes.push(['assinatura da lista', vsc.subarray(assinLista.ini, assinLista.fim), vsc, arquivos]);
  // (d) último byte do TBS do certificado (dentro de uma extensão: não quebra a estrutura DER). PEM: troca no DER e
  // recodifica o base64 no mesmo lugar (mesmo tamanho).
  {
    const campo = vsc.subarray(cert.ini, cert.fim);
    const pem = campo.subarray(0, 10).toString('latin1') === '-----BEGIN';
    const texto = campo.toString('latin1');
    const der = pem ? Buffer.from(texto.replace(/-----[^-]+-----|\s/g, ''), 'base64') : Buffer.from(campo);
    const { lerCertificado } = await import('../../src/lacres.js');
    const tbs = lerCertificado(der).tbs;
    const fimTbs = der.indexOf(tbs) + tbs.length - 1;
    der[fimTbs] ^= 0x01;
    let novoCampo;
    if (pem) {
      const b64 = der.toString('base64');
      let j = 0;
      const corpo = texto.replace(/(-----[^-]+-----)|([A-Za-z0-9+/=])/g, (m, cab) => (cab ? cab : b64[j++]));
      novoCampo = Buffer.from(corpo, 'latin1');
    } else novoCampo = der;
    const vscCert = Buffer.concat([vsc.subarray(0, cert.ini), novoCampo, vsc.subarray(cert.fim)]);
    testes.push(['certificado (TBS)', null, vscCert, arquivos]);
  }
  // (c) assinatura do último hash no BU
  const nomeBu = acharArquivo([...arquivos.keys()], 'bu');
  const linha = [];
  for (const [rotulo, valor, alvo, arqs] of testes) {
    try {
      const r = verificarLacres({ vsc: valor ? flip(alvo, valor) : alvo, arquivos: arqs, acs, dataEleicao });
      const f = falhasDe(r);
      linha.push(`${rotulo}: ${f.length} falha(s) [${f.join(' ; ')}]`);
    } catch (e) {
      linha.push(`${rotulo}: EXCEÇÃO de leitura (${e.message}) — conta como falha`);
    }
  }
  {
    const bu = arquivos.get(nomeBu);
    // última assinatura do BU: maior OCTET STRING/BIT STRING perto do fim — usa o lerBu de src/lacres.js indiretamente:
    const { lerBu } = await import('../../src/lacres.js');
    const e = lerBu(bu).eleicoes.at(-1);
    const bu2 = flip(bu, e.assinatura);
    const r = verificarLacres({ vsc, arquivos: new Map([...arquivos, [nomeBu, bu2]]), acs, dataEleicao });
    const f = falhasDe(r);
    linha.push(`assinatura do BU: ${f.length} falha(s) [${f.map((x) => x.replace(/eleição \d+: /, '')).join(' ; ')}]`);
  }
  console.log(`${tipo} (${c.k}, ${base.urna.algoritmo}; sem adulterar: ${falhasDe(base).length} falha(s), ${base.resultados.length} conferências)\n  ${linha.join('\n  ')}`);
}

console.log('\n2. Amostra de confirmação (30 sorteados, semente 24): node src/lacres.js <dir>');
let batem = 0;
for (const c of sorteio) {
  const dir = path.join(BASE, ...c.k.split('/'), c.hash);
  let codigo = 0;
  let out = '';
  try {
    out = execFileSync(process.execPath, ['src/lacres.js', dir], { cwd: path.resolve(DIR_DADOS, '..'), encoding: 'utf8' });
  } catch (e) {
    codigo = e.status;
    out = String(e.stdout);
  }
  const n = Number(/(\d+) conferências/.exec(out)?.[1] ?? 0);
  const leitura = /FALHA \[leitura\]/.test(out);
  const ok = c.tipo === 'corte' ? leitura && codigo === 1 : codigo === 0 && n === c.conferencias && c.falhas === 0;
  if (ok) batem++;
  console.log(`${ok ? 'bate ' : 'NÃO  '} ${c.k} ${c.tipo} cli=${codigo}/${leitura ? 'leitura' : n} jsonl=${c.conferencias}/${c.falhas}`);
}
console.log(`${batem}/${sorteio.length} batem`);
