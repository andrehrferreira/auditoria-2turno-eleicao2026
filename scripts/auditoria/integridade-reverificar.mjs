import { execFileSync, fork } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo, carregarAcs, lerCertificado, verificarDiretorio, verificarLacres } from '../../src/lacres.js';

// Auditor E (integridade nacional). Reverifica os diretórios em que src/lacres.js falhou na LEITURA
// ("DER: comprimento ausente"). Causa achada (29/10/2026): em parte das urnas UE2013/UE2015 (ECDSA), o campo [1]
// do bloco HW do .vsc guarda o certificado com bytes a mais depois do fim do DER (ex.: 945 bytes de DER num campo
// de 946, sobra 0x00). O parser de src/lacres.js lê o campo inteiro como uma lista de nós e falha no byte que sobra.
// Para cada caso:
//   1. reproduz a falha com verificarDiretorio (a mesma função de `node src/lacres.js <dir>`);
//   2. confere que os bytes a mais são só zeros;
//   3. remonta o .vsc em memória com o certificado cortado no fim do DER (só os comprimentos dos nós pais mudam;
//      a lista assinada e as assinaturas são copiadas byte a byte) e roda a verificação completa.
// Saída: data/parsed/auditoria/integridade/<t>t/reverificacao.jsonl e reverificacao-resumo.json. Com --cli N, roda
// também `node src/lacres.js <dir>` em N casos (um por UF primeiro). No máximo 10 processos.
//
// Uso: node scripts/auditoria/integridade-reverificar.mjs --turno 2 [--cli 30] [--procs 10]

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'integridade');
const DATA_ELEICAO = { 1: '2026-10-04', 2: '2026-10-25' };

function nos(b, inicio = 0, fim = b.length) {
  const lista = [];
  for (let p = inicio; p < fim;) {
    const tag = b[p];
    let q = p + 1;
    let n = b[q++];
    if (n & 0x80) {
      const k = n & 0x7f;
      n = 0;
      for (let j = 0; j < k; j++) n = n * 256 + b[q++];
    }
    lista.push({ tag, p, ini: q, fim: q + n });
    p = q + n;
  }
  return lista;
}
const comprimento = (n) => {
  if (n < 0x80) return Buffer.from([n]);
  const bytes = [];
  for (let x = n; x > 0; x = Math.floor(x / 256)) bytes.unshift(x & 0xff);
  return Buffer.from([0x80 | bytes.length, ...bytes]);
};
const tlv = (tag, valor) => Buffer.concat([Buffer.from([tag]), comprimento(valor.length), valor]);

/** Corta o certificado [1] do bloco HW no fim do DER. Retorna { vsc, sobra, ... } ou null se não houver sobra. */
export function cortarCertificado(vsc) {
  const [raiz] = nos(vsc);
  const blocos = nos(vsc, raiz.ini, raiz.fim);
  const iHw = blocos.findIndex((n) => n.tag === 0x30 && nos(vsc, n.ini, n.fim).some((x) => x.tag === 0x81));
  const hw = blocos[iHw];
  const filhosHw = nos(vsc, hw.ini, hw.fim);
  const iCert = filhosHw.findIndex((x) => x.tag === 0x81);
  const cert = vsc.subarray(filhosHw[iCert].ini, filhosHw[iCert].fim);
  const [dCert] = nos(cert, 0, cert.length).slice(0, 1);
  if (dCert.fim >= cert.length) return null;
  const sobra = cert.subarray(dCert.fim);
  const novoHw = tlv(0x30, Buffer.concat(filhosHw.map((x, i) => (i === iCert ? tlv(0x81, cert.subarray(0, dCert.fim)) : vsc.subarray(x.p, x.fim)))));
  const novaRaiz = tlv(raiz.tag, Buffer.concat(blocos.map((x, i) => (i === iHw ? novoHw : vsc.subarray(x.p, x.fim)))));
  return { vsc: novaRaiz, sobra, tamanhoCampo: cert.length, tamanhoDer: dCert.fim, cert: cert.subarray(0, dCert.fim) };
}

/** Reverifica um diretório: reproduz a falha de leitura e refaz a verificação com o certificado cortado. */
async function reverificarCaso(c, { base, acs, dataEleicao }) {
  const d = path.join(base, c.uf, c.municipio, c.zona, c.secao, c.hash);
  const out = { onde: `${c.uf}/${c.municipio}/${c.zona}/${c.secao}`, hash: c.hash, modelo: c.modelo, erroOriginal: c.erro };
  try {
    await verificarDiretorio(d, { acs, dataEleicao });
    out.reproduzido = false;
  } catch (erro) {
    out.reproduzido = true;
    out.erroReproduzido = erro.message;
  }
  const nomes = await readdir(d);
  const nomeVsc = acharArquivo(nomes, 'vsc');
  const vsc = await readFile(path.join(d, nomeVsc));
  const corte = cortarCertificado(vsc);
  out.sobra = corte ? corte.sobra.toString('hex') : null;
  if (!corte) return out;
  out.tamanhoCampo = corte.tamanhoCampo;
  out.tamanhoDer = corte.tamanhoDer;
  const arquivos = new Map();
  for (const n of nomes) if (n !== nomeVsc && /^o\d{5}[a-z]{2}\d{13}-[a-z]+\.[a-z]+$/.test(n)) arquivos.set(n, await readFile(path.join(d, n)));
  const v = verificarLacres({ vsc: corte.vsc, arquivos, acs, dataEleicao });
  const porCamada = {};
  for (const x of v.resultados) porCamada[x.camada] = (porCamada[x.camada] ?? 0) + 1;
  out.aposCorte = { urna: v.urna, conferencias: v.resultados.length, porCamada, falhas: v.resultados.filter((x) => !x.ok), observacoes: v.observacoes };
  const cert = lerCertificado(corte.cert);
  out.cert = { nome: cert.nome, emissor: cert.emissor, validoDe: cert.validoDe.toISOString().slice(0, 10), validoAte: cert.validoAte.toISOString().slice(0, 10) };
  return out;
}

const contexto = async (turno) => ({ base: path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas'), acs: await carregarAcs(), dataEleicao: new Date(DATA_ELEICAO[turno]) });

async function filho() {
  const ctx = await contexto(Number(process.env.INTEGRIDADE_TURNO));
  process.on('message', async (lote) => {
    const saida = [];
    for (const c of lote) {
      try {
        saida.push(await reverificarCaso(c, ctx));
      } catch (erro) {
        saida.push({ onde: `${c.uf}/${c.municipio}/${c.zona}/${c.secao}`, hash: c.hash, erroReverificacao: erro.message });
      }
    }
    process.send({ saida });
  });
  process.send({ pronto: true });
}

async function principal() {
  const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, cli: { type: 'string', default: '0' }, procs: { type: 'string', default: '10' } } });
  const turno = Number(values.turno);
  const procs = Math.min(10, Math.max(1, Number(values.procs)));
  const dir = path.join(SAIDA, `${turno}t`);
  const raizRepo = path.resolve(DIR_DADOS, '..');
  const casos = [];
  for (const arq of (await readdir(dir)).filter((n) => /^[a-z]{2}\.jsonl$/.test(n)).sort()) {
    const rl = createInterface({ input: createReadStream(path.join(dir, arq)), crlfDelay: Infinity });
    for await (const l of rl) {
      if (!l.includes('"camada":"leitura"')) continue;
      const r = JSON.parse(l);
      if (r.papel !== 'oficial' || !r.falhas?.some((f) => f.camada === 'leitura')) continue;
      casos.push({ uf: r.uf, municipio: r.municipio, zona: r.zona, secao: r.secao, hash: r.hash, modelo: r.vscInfo?.modelo ?? null, erro: r.falhas[0].item });
    }
  }
  console.log(`${casos.length} diretórios com falha de leitura`);
  const saida = createWriteStream(path.join(dir, 'reverificacao.jsonl'));
  const cont = { casos: casos.length, reproduzidos: 0, comSobra: 0, sobraSoZeros: 0, aprovadosAposCorte: 0, falhasAposCorte: 0, semSobra: 0, erros: 0,
    porTamanho: {}, porModelo: {}, porEmissor: {}, porSobra: {}, porUf: {}, cli: [] };
  const inc = (o, k) => {
    o[k] = (o[k] ?? 0) + 1;
  };
  const registrar = (out) => {
    saida.write(`${JSON.stringify(out)}\n`);
    if (out.erroReverificacao) return cont.erros++;
    if (out.reproduzido) cont.reproduzidos++;
    if (out.sobra === null) return cont.semSobra++;
    cont.comSobra++;
    const zeros = /^(00)+$/.test(out.sobra);
    if (zeros) cont.sobraSoZeros++;
    inc(cont.porSobra, out.sobra);
    inc(cont.porTamanho, `${out.tamanhoDer}/${out.tamanhoCampo}`);
    inc(cont.porModelo, out.modelo);
    inc(cont.porUf, out.onde.slice(0, 2));
    inc(cont.porEmissor, out.aposCorte.urna.emissor);
    if (out.aposCorte.falhas.length === 0 && zeros) cont.aprovadosAposCorte++;
    else cont.falhasAposCorte++;
  };
  // Reprodução pela linha de comando (`node src/lacres.js <dir>`), um caso por UF primeiro.
  const n = Number(values.cli);
  const amostra = [];
  for (const c of casos) if (amostra.length < n && !amostra.some((a) => a.uf === c.uf)) amostra.push(c);
  for (const c of casos) if (amostra.length < n && !amostra.includes(c)) amostra.push(c);
  for (const c of amostra) {
    const d = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', c.uf, c.municipio, c.zona, c.secao, c.hash);
    const rel = path.relative(raizRepo, d);
    try {
      execFileSync(process.execPath, ['src/lacres.js', d], { cwd: raizRepo, encoding: 'utf8' });
      cont.cli.push({ dir: rel, codigo: 0 });
    } catch (erro) {
      cont.cli.push({ dir: rel, codigo: erro.status, saida: String(erro.stdout).trim().split('\n').filter((x) => x.startsWith('FALHA') || x.startsWith('RESUMO')) });
    }
  }
  const lotes = [];
  for (let i = 0; i < casos.length; i += 100) lotes.push(casos.slice(i, i + 100));
  await new Promise((resolve) => {
    if (lotes.length === 0) return resolve();
    let ativos = 0;
    for (let i = 0; i < Math.min(procs, lotes.length); i++) {
      ativos++;
      const f = fork(import.meta.filename, ['--filho'], { env: { ...process.env, INTEGRIDADE_TURNO: String(turno) } });
      const proximo = () => {
        const l = lotes.shift();
        if (l) f.send(l);
        else f.disconnect();
      };
      f.on('message', (m) => {
        if (!m.pronto) for (const out of m.saida) registrar(out);
        proximo();
      });
      f.on('exit', () => {
        if (--ativos === 0) resolve();
      });
    }
  });
  await new Promise((ok) => saida.end(ok));
  await writeFile(path.join(dir, 'reverificacao-resumo.json'), JSON.stringify(cont, null, 1));
  console.log(JSON.stringify(cont, null, 1));
}

if (process.argv.includes('--filho')) await filho();
else if (import.meta.filename === path.resolve(process.argv[1] ?? '')) await principal();
