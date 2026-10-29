import { fork } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { decodificarArquivo } from '../../src/asn1.js';
import { DIR_DADOS } from '../../src/config.js';
import { arquivoVsc } from '../../src/esquemas.js';
import { acharArquivo, carregarAcs, lerBu, lerCertificado, verificarLacres } from '../../src/lacres.js';
import { hashDiretorio } from '../../src/vsc.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

// Auditor E (integridade nacional), H04/H11. Para cada diretório de hash de cada seção de um turno:
//   - roda a verificação completa de src/lacres.js (certificado × AC, SHA-512 e assinatura de cada arquivo,
//     assinatura da lista, cadeia de hashes do BU) e confere o nome do diretório = hashDiretorio(.vsc);
//   - confere o que src/lacres.js não confere: tamanho de cada arquivo × tamanho lacrado, e lista SW × lista HW;
//   - extrai os identificadores do BU, do .vsc (modelo, usuário UEAO + nº) e do log (nº da urna em cada linha,
//     modelo, versão, seriais de MR, MV e mídia de carga, código de carga, verificações de assinatura).
// Uma linha JSON por diretório em data/parsed/auditoria/integridade/<t>t/<uf>.jsonl.
// Paralelismo: fila de (UF, município, zona) para no máximo --procs processos filhos (padrão 10).
//
// --sem-lacres: só os identificadores (BU, .vsc, certificado lido sem conferir assinatura, log), para a comparação
// entre turnos; grava em <t>t-identificadores/.
//
// Uso: node scripts/auditoria/integridade-lacres.mjs --turno 2 [--uf ac,es] [--procs 10] [--refazer] [--sem-lacres]

const PLEITO = { 1: 3220, 2: 3221 };
const DATA_ELEICAO = { 1: '2026-10-04', 2: '2026-10-25' };
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'integridade');

const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const subdirs = async (dir) => (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
const lerOuNulo = async (f) => {
  try {
    return await readFile(f);
  } catch (erro) {
    if (erro.code === 'ENOENT') return null;
    throw erro;
  }
};
// Nome antigo dos diretórios (base64 sem trocar '/'), visto nos órfãos do AC.
const hashDiretorioAntigo = (vsc) => Buffer.from(createHash('sha256').update(vsc).digest('base64'), 'latin1').toString('hex');

// ---- log ----
const handleEmMemoria = (buffer) => ({
  read: async (destino, deslocamento, tamanho, posicao) => ({ bytesRead: buffer.copy(destino, deslocamento, posicao, posicao + tamanho) }),
  stat: async () => ({ size: buffer.length }),
});

async function textosDeLog(handle, profundidade = 0) {
  const textos = [];
  for (const entrada of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, entrada);
    if (entrada.nome === 'logd.dat') textos.push({ nome: entrada.nome, profundidade, texto: dados.toString('latin1') });
    else if (entrada.nome.endsWith('.jez') && profundidade < 3) textos.push(...(await textosDeLog(handleEmMemoria(dados), profundidade + 1)));
  }
  return textos;
}

const PREFIXOS = [
  ['modelo', 'Identificação do Modelo de Urna: '],
  ['mr', 'Número de série da MR: '],
  ['mv', 'Serial da MV: '],
  ['fc', 'Identificador da mídia de carga: '],
  ['versao', 'Versão da aplicação: '],
];

/** Identificadores de um logd.dat: nº da urna (3ª coluna) com contagem, último valor de cada serial, versões.
 * `seriais` guarda, para MR, MV e mídia de carga, cada valor lido com a data da última leitura (o log é cumulativo). */
function identificadoresLog(texto, dia) {
  const r = { linhas: 0, urnas: {}, urnasNoDia: {}, modelo: null, mr: null, mv: null, fc: null, versoes: {}, codigoCarga: null,
    primeiraData: null, ultimaData: null, verificacoesAssinatura: 0, verificacoesSemSucesso: [], seriais: { mr: {}, mv: {}, fc: {} } };
  let p = 0;
  while (p < texto.length) {
    let fim = texto.indexOf('\n', p);
    if (fim === -1) fim = texto.length;
    const linha = texto.charCodeAt(fim - 1) === 13 ? texto.slice(p, fim - 1) : texto.slice(p, fim);
    p = fim + 1;
    if (linha.length < 20) continue;
    const t1 = linha.indexOf('\t');
    const t2 = linha.indexOf('\t', t1 + 1);
    const t3 = linha.indexOf('\t', t2 + 1);
    const t4 = linha.indexOf('\t', t3 + 1);
    if (t4 < 0) continue;
    r.linhas++;
    const dataHora = linha.slice(0, t1);
    r.primeiraData ??= dataHora;
    r.ultimaData = dataHora;
    const urna = linha.slice(t2 + 1, t3);
    r.urnas[urna] = (r.urnas[urna] ?? 0) + 1;
    if (dataHora.startsWith(dia)) r.urnasNoDia[urna] = (r.urnasNoDia[urna] ?? 0) + 1;
    const t5 = linha.indexOf('\t', t4 + 1);
    const msg = linha.slice(t4 + 1, t5 < 0 ? undefined : t5);
    for (const [campo, prefixo] of PREFIXOS) {
      if (msg.startsWith(prefixo)) {
        const v = msg.slice(prefixo.length).trim();
        if (campo === 'versao') r.versoes[v] = (r.versoes[v] ?? 0) + 1;
        else {
          r[campo] = v;
          if (r.seriais[campo]) r.seriais[campo][v] = dataHora;
        }
      }
    }
    if (msg.startsWith('Código de carga ')) r.codigoCarga = msg.slice(16).split(' ')[0].replaceAll('.', '');
    if (msg.startsWith('Verificação de assinatura')) {
      r.verificacoesAssinatura++;
      if (!msg.endsWith('[SUCESSO]') && r.verificacoesSemSucesso.length < 20) r.verificacoesSemSucesso.push(`${dataHora} ${msg}`);
    }
  }
  return r;
}

/** Certificado da urna (campo [1] do bloco HW), cortado no fim do DER (parte das UE2013/UE2015 traz bytes a mais). */
function certificadoDoVsc(vsc) {
  const nos = (b, i, f) => {
    const l = [];
    for (let p = i; p < f;) {
      const tag = b[p];
      let q = p + 1;
      let n = b[q++];
      if (n & 0x80) {
        const k = n & 0x7f;
        n = 0;
        for (let j = 0; j < k; j++) n = n * 256 + b[q++];
      }
      l.push({ tag, ini: q, fim: q + n });
      p = q + n;
    }
    return l;
  };
  const [raiz] = nos(vsc, 0, vsc.length);
  for (const bloco of nos(vsc, raiz.ini, raiz.fim)) {
    if (bloco.tag !== 0x30) continue;
    const c = nos(vsc, bloco.ini, bloco.fim).find((x) => x.tag === 0x81);
    if (!c) continue;
    const cert = vsc.subarray(c.ini, c.fim);
    if (cert.subarray(0, 10).toString('latin1') === '-----BEGIN') return { bytes: cert, sobra: 0 }; // PEM (UE2020/UE2022)
    const [d] = nos(cert, 0, Math.min(cert.length, 4 + 65536)).slice(0, 1);
    return { bytes: cert.subarray(0, d.fim), sobra: cert.length - d.fim };
  }
  return null;
}

// ---- verificação de um diretório de hash ----
async function verificarHash(dirHash, hash, ctx) {
  const { acs, dataEleicao, dia } = ctx;
  const nomes = await readdir(dirHash);
  const nomeVsc = acharArquivo(nomes, 'vsc');
  const reg = { hash };
  if (!nomeVsc) return { ...reg, erro: 'sem -vota.vsc nem -sa.vsc', arquivos: nomes };
  const vsc = await readFile(path.join(dirHash, nomeVsc));
  reg.vsc = nomeVsc;
  reg.sha256Vsc = sha256(vsc);
  reg.nomeConfere = hashDiretorio(vsc) === hash;
  const arquivos = new Map();
  for (const n of nomes) if (n !== nomeVsc && /^o\d{5}[a-z]{2}\d{13}-[a-z]+\.[a-z]+$/.test(n)) arquivos.set(n, await readFile(path.join(dirHash, n)));
  reg.arquivos = [...arquivos.keys()].map((n) => n.slice(n.indexOf('-') + 1));
  reg.estranhos = nomes.filter((n) => n !== nomeVsc && !arquivos.has(n));

  if (ctx.semLacres) {
    try {
      const c = certificadoDoVsc(vsc);
      const cert = lerCertificado(c.bytes);
      reg.urna = { nome: cert.nome, emissor: cert.emissor, algoritmo: cert.algoritmo };
      reg.sobraCert = c.sobra;
      reg.validadeCert = `${cert.validoDe.toISOString().slice(0, 10)} a ${cert.validoAte.toISOString().slice(0, 10)}`;
    } catch (erro) {
      reg.erroCert = erro.message;
    }
  } else try {
    const { urna, resultados, observacoes } = verificarLacres({ vsc, arquivos, acs, dataEleicao });
    reg.urna = urna;
    reg.conferencias = resultados.length;
    reg.porCamada = {};
    for (const r of resultados) reg.porCamada[r.camada] = (reg.porCamada[r.camada] ?? 0) + 1;
    reg.falhas = resultados.filter((r) => !r.ok);
    reg.observacoes = observacoes;
    const validade = resultados.find((r) => r.item === 'certificado da urna válido na data da eleição');
    reg.validadeCert = validade?.obs ?? null;
  } catch (erro) {
    reg.falhas = [{ camada: 'leitura', item: erro.message, ok: false }];
    reg.conferencias = 0;
  }

  // Conferências extras: lista SW × HW, tamanho lacrado × tamanho real, nome do arquivo × seção.
  try {
    const v = decodificarArquivo(arquivoVsc, vsc);
    const hw = v.assinaturaHW;
    const sw = v.assinaturaSW;
    reg.vscInfo = {
      modelo: v.equipamento?.modeloEquipamento ?? null, enum2: v.equipamento?.naoDocumentado ?? null,
      usuarioHW: hw.autoAssinado.usuario.nomeUsuario, idHW: hw.autoAssinado.usuario.serial, algHW: hw.autoAssinado.algoritmoAssinatura.algoritmo,
      usuarioSW: sw.autoAssinado.usuario.nomeUsuario, idSW: sw.autoAssinado.usuario.serial, algSW: sw.autoAssinado.algoritmoAssinatura.algoritmo,
      criacaoHW: hw.dataHoraCriacao, criacaoSW: sw.dataHoraCriacao,
    };
    const lista = (e) => new Map(e.conteudoAutoAssinado.arquivosAssinados.map((a) => [a.nomeArquivo, a.assinatura]));
    const lhw = lista(hw);
    const lsw = lista(sw);
    reg.listaHW = lhw.size;
    const extras = [];
    for (const [n, a] of lhw) {
      const s = lsw.get(n);
      if (!s) extras.push(`${n}: ausente na lista SW`);
      else if (s.hash !== a.hash || s.tamanho !== a.tamanho) extras.push(`${n}: hash/tamanho SW ≠ HW`);
      const bytes = arquivos.get(n);
      if (bytes && bytes.length !== a.tamanho) extras.push(`${n}: tamanho ${bytes.length} ≠ lacrado ${a.tamanho}`);
    }
    for (const n of lsw.keys()) if (!lhw.has(n)) extras.push(`${n}: ausente na lista HW`);
    for (const n of arquivos.keys()) if (!lhw.has(n)) extras.push(`${n}: publicado mas fora da lista lacrada`);
    reg.falhasExtras = extras;
  } catch (erro) {
    reg.falhasExtras = [`vsc: ${erro.message}`];
  }

  const nomeBu = acharArquivo([...arquivos.keys()], 'bu');
  if (nomeBu) {
    try {
      const bu = lerBu(arquivos.get(nomeBu));
      reg.bu = { ...bu.cabecalho, ...bu.urna, origem: bu.origem, abertura: bu.dataHoraAbertura, encerramento: bu.dataHoraEncerramento, comparecimento: bu.qtdEleitoresCompareceram };
    } catch (erro) {
      reg.bu = { erro: erro.message };
    }
  }
  const nomeLog = acharArquivo([...arquivos.keys()], 'log');
  if (nomeLog) {
    try {
      reg.logs = (await textosDeLog(handleEmMemoria(arquivos.get(nomeLog)))).map((l) => ({ profundidade: l.profundidade, ...identificadoresLog(l.texto, dia) }));
    } catch (erro) {
      reg.logs = { erro: erro.message };
    }
  }
  return reg;
}

async function verificarSecao(base, uf, municipio, zona, secao, ctx) {
  const dir = path.join(base, uf, municipio, zona, secao);
  const textoAux = await lerOuNulo(path.join(dir, 'aux.json'));
  let aux = null;
  let erroAux = null;
  if (textoAux) {
    try {
      aux = JSON.parse(textoAux.toString('utf8'));
    } catch (erro) {
      erroAux = erro.message;
    }
  }
  const noDisco = await subdirs(dir);
  const saida = [];
  const chave = { t: ctx.turno, uf, municipio, zona, secao };
  const oficiais = aux
    ? (aux.hashes ?? []).filter((h) => h.hash && h.hash !== '0' && (h.arq ?? []).some((a) => a.nm))
    : [];
  const listados = new Set(oficiais.map((h) => h.hash));
  if (aux) {
    for (const h of oficiais) {
      if (!noDisco.includes(h.hash)) {
        saida.push({ ...chave, papel: 'ausente', hash: h.hash, auxSt: h.st ?? null });
        continue;
      }
      const reg = await verificarHash(path.join(dir, h.hash), h.hash, ctx);
      const naoNoDisco = (h.arq ?? []).map((a) => a.nm).filter((n) => !(reg.arquivos ?? []).some((x) => n.endsWith(x)) && !n.endsWith(reg.vsc));
      saida.push({ ...chave, papel: 'oficial', origem: 'aux', auxSt: aux.st ?? null, pacoteSt: h.st ?? null, recebido: h.dr ? `${h.dr} ${h.hr}` : null,
        pacotesAux: oficiais.length, auxListaFaltando: naoNoDisco, ...reg });
    }
  }
  const vscsOficiais = new Set(saida.filter((r) => r.sha256Vsc).map((r) => r.sha256Vsc));
  for (const h of noDisco) {
    if (listados.has(h)) continue;
    const dirHash = path.join(dir, h);
    const nomes = await readdir(dirHash);
    const nomeVsc = acharArquivo(nomes, 'vsc');
    const vsc = nomeVsc ? await readFile(path.join(dirHash, nomeVsc)) : null;
    if (!aux && vsc && hashDiretorio(vsc) === h) {
      const reg = await verificarHash(dirHash, h, ctx);
      saida.push({ ...chave, papel: 'oficial', origem: 'disco', erroAux, ...reg });
      continue;
    }
    // Órfão: diretório fora do aux (ou, sem aux, com nome ≠ hashDiretorio). Registra se é cópia de um pacote oficial.
    saida.push({ ...chave, papel: 'orfao', hash: h, temVsc: Boolean(vsc), sha256Vsc: vsc ? sha256(vsc) : null,
      nomeAntigoConfere: vsc ? hashDiretorioAntigo(vsc) === h : null, nomeNovoConfere: vsc ? hashDiretorio(vsc) === h : null,
      copiaDeOficial: vsc ? vscsOficiais.has(sha256(vsc)) : null });
  }
  if (saida.length === 0) saida.push({ ...chave, papel: 'sem_pacote', auxSt: aux?.st ?? null, erroAux });
  return saida;
}

// ---- processo filho ----
async function filho() {
  const turno = Number(process.env.INTEGRIDADE_TURNO);
  const base = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas');
  const ctx = { turno, semLacres: process.env.INTEGRIDADE_SEM_LACRES === '1', acs: await carregarAcs(), dataEleicao: new Date(DATA_ELEICAO[turno]), dia: DATA_ELEICAO[turno].split('-').reverse().join('/') };
  process.on('message', async ({ uf, municipio, zona }) => {
    const inicio = Date.now();
    const registros = [];
    try {
      for (const secao of await subdirs(path.join(base, uf, municipio, zona))) {
        try {
          registros.push(...(await verificarSecao(base, uf, municipio, zona, secao, ctx)));
        } catch (erro) {
          registros.push({ t: turno, uf, municipio, zona, secao, papel: 'erro', erro: erro.message });
        }
      }
      process.send({ uf, municipio, zona, registros, ms: Date.now() - inicio });
    } catch (erro) {
      process.send({ uf, municipio, zona, registros, ms: Date.now() - inicio, erro: erro.message });
    }
  });
  process.send({ pronto: true });
}

// ---- coordenador ----
async function principal() {
  const { values } = parseArgs({ options: {
    turno: { type: 'string', default: '2' }, uf: { type: 'string' }, procs: { type: 'string', default: '10' }, refazer: { type: 'boolean', default: false }, 'sem-lacres': { type: 'boolean', default: false },
  } });
  const turno = Number(values.turno);
  const procs = Math.min(10, Math.max(1, Number(values.procs)));
  const base = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas');
  const dirSaida = path.join(SAIDA, values['sem-lacres'] ? `${turno}t-identificadores` : `${turno}t`);
  await mkdir(dirSaida, { recursive: true });
  const ufs = values.uf ? values.uf.split(',') : await subdirs(base);
  const arquivoFeito = path.join(dirSaida, 'feitos.json');
  const feitos = values.refazer ? {} : JSON.parse((await lerOuNulo(arquivoFeito))?.toString() ?? '{}');
  const fila = [];
  const tamanho = new Map();
  for (const uf of ufs) {
    for (const municipio of await subdirs(path.join(base, uf))) {
      for (const zona of await subdirs(path.join(base, uf, municipio))) {
        if (feitos[`${uf}/${municipio}/${zona}`]) continue;
        const u = { uf, municipio, zona };
        fila.push(u);
        tamanho.set(u, (await subdirs(path.join(base, uf, municipio, zona))).length);
      }
    }
  }
  // Zonas grandes primeiro, para o fim do lote não ficar preso num só processo.
  fila.sort((a, b) => tamanho.get(b) - tamanho.get(a));
  const total = fila.length;
  console.log(`turno ${turno}: ${total} zonas na fila (${Object.keys(feitos).length} já feitos), ${procs} processos`);
  if (values.refazer) for (const uf of ufs) await writeFile(path.join(dirSaida, `${uf}.jsonl`), '');

  const streams = new Map();
  const stream = (uf) => {
    if (!streams.has(uf)) streams.set(uf, createWriteStream(path.join(dirSaida, `${uf}.jsonl`), { flags: 'a' }));
    return streams.get(uf);
  };
  const inicio = Date.now();
  let concluidos = 0;
  let diretorios = 0;
  let falhas = 0;
  let salvando = Promise.resolve();
  await new Promise((resolve) => {
    let ativos = 0;
    for (let i = 0; i < Math.min(procs, fila.length); i++) {
      ativos++;
      const f = fork(import.meta.filename, ['--filho'], { env: { ...process.env, INTEGRIDADE_TURNO: String(turno), INTEGRIDADE_SEM_LACRES: values['sem-lacres'] ? '1' : '0' } });
      const proximo = () => {
        const u = fila.shift();
        if (u) f.send(u);
        else f.disconnect();
      };
      f.on('message', (m) => {
        if (m.pronto) return proximo();
        const s = stream(m.uf);
        for (const r of m.registros) {
          s.write(`${JSON.stringify(r)}\n`);
          if (r.papel === 'oficial') diretorios++;
          if (r.falhas?.length || r.falhasExtras?.length || r.nomeConfere === false || r.papel === 'erro') falhas++;
        }
        if (!m.erro) feitos[`${m.uf}/${m.municipio}/${m.zona}`] = { secoes: new Set(m.registros.map((r) => r.secao)).size, ms: m.ms };
        concluidos++;
        if (concluidos % 200 === 0 || fila.length === 0) {
          const s2 = (Date.now() - inicio) / 1000;
          console.log(`${concluidos}/${total} zonas, ${diretorios} diretórios oficiais, ${falhas} com falha/anomalia, ${s2.toFixed(0)} s`);
          salvando = salvando.then(() => writeFile(arquivoFeito, JSON.stringify(feitos)));
        }
        proximo();
      });
      f.on('exit', () => {
        if (--ativos === 0) resolve();
      });
    }
    if (fila.length === 0 && ativos === 0) resolve();
  });
  await salvando;
  await writeFile(arquivoFeito, JSON.stringify(feitos));
  await Promise.all([...streams.values()].map((s) => new Promise((r) => s.end(r))));
  console.log(`FIM turno ${turno}: ${concluidos} zonas, ${diretorios} diretórios oficiais, ${falhas} com falha/anomalia, ${((Date.now() - inicio) / 1000).toFixed(0)} s`);
}

if (process.argv.includes('--filho')) await filho();
else if (import.meta.filename === path.resolve(process.argv[1] ?? '')) await principal();
