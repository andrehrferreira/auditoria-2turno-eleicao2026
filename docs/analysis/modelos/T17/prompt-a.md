# T17 — Revisão de código dos scripts de integridade (H04, H11)

Papel: revisor independente de código e da leitura dos formatos de arquivo da urna. Procure bugs que mudem números: contagem dupla, caso não tratado, comparação de datas errada (formato dd/mm/aaaa hh:mm:ss), log aninhado lido duas vezes ou não lido, retomada que duplica ou perde dados, filtro que exclui casos sem dizer, erro silenciado em try/catch, dependência de ordem, fuso horário, encoding (latin1).

Contexto: auditoria independente dos arquivos públicos das urnas das eleições brasileiras de 2026 (TSE; 1º turno 04/10/2026, 2º turno 25/10/2026; 499.207 seções com pacote). Cada pacote de seção tem BU (boletim), RDV, log da urna (log.jez → logd.dat, linhas com data/hora, nível, nº da urna, aplicação, mensagem, hash encadeado) e .vsc (lista lacrada com SHA-512 e assinatura). Os números vêm de scripts Node rodados sobre o universo completo. A auditoria rotula tudo como Fato (script do repo reproduz), Hipótese, Recomendação ou Pendente. Sua resposta é tratada como Hipótese até um script do repo reproduzi-la.

Formato obrigatório da resposta (em português):
- Uma lista numerada; um item por achado, cada um com: **Achado**, **Motivo**, **Trecho de referência** (arquivo + citação curta), **Gravidade** (alta/média/baixa) e **Confiança** (alta/média/baixa).
- Se não achar nada num ponto pedido, diga explicitamente "nada encontrado" e justifique.
- Não invente números: se precisar de um número que não está no texto, diga qual conta/consulta faria.
- Toda norma, resolução ou URL que citar deve vir marcada [a confirmar], com o número/artigo exato se souber.

Os scripts usam helpers do repo não anexados: src/zip.js (listarEntradas/lerEntrada: leem ZIP/.jez; para .jez aninhado usam um handle em memória), src/lacres.js (acharArquivo: acha o arquivo do tipo pedido na pasta do pacote; verificação de assinatura), src/vsc.js (hashDiretorio: nome da pasta do pacote = hash do .vsc), src/config.js (DIR_DADOS). Considere-os corretos, mas aponte se o uso deles parecer errado.

Pontos de atenção:
1. integridade-autoverificacao-depois.mjs: casamento de evento com pacote por "onde + hash"; fallback para o único log da mesma urna/profundidade quando a janela de datas falha; deduplicação de votos por seção×urna×dia (máximo).
2. integridade-sobreposicao-bruto.mjs: descarte das linhas antes de "Data e hora atualizada" por sessão; classificação semLinhaNaJanela / copia / linhaIsolada / sobreposicaoReal.
3. integridade-lacres.mjs: retomada (feitos.json gravado a cada 200 zonas; limpeza de linhas de zonas não concluídas).
4. integridade-urnas-reaproveitadas.mjs e integridade-entre-turnos.mjs: chaves de comparação entre seções e turnos.
5. integridade-resumo.mjs e integridade-casos-especiais.mjs: definição de "igual / diferente / sem dado".
Para cada bug: diga a linha/trecho, a entrada que o dispara e o efeito no número publicado (para mais, para menos, ou não muda).


(Parte A de 2: scripts de extração, resumo e comparação entre seções/turnos. Responda só sobre os scripts anexados.)

===== ARQUIVO: scripts/auditoria/integridade-lacres.mjs =====
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
  else {
    // Retomada: feitos.json só é gravado a cada 200 zonas, então zonas já escritas no .jsonl podem voltar à fila.
    // As linhas delas saem antes, para não ficarem duplicadas.
    for (const uf of ufs) {
      const arq = path.join(dirSaida, `${uf}.jsonl`);
      const linhas = ((await lerOuNulo(arq))?.toString() ?? '').split('\n').filter(Boolean);
      const ficam = linhas.filter((l) => {
        const r = JSON.parse(l);
        return feitos[`${r.uf}/${r.municipio}/${r.zona}`];
      });
      if (ficam.length < linhas.length) await writeFile(arq, ficam.map((l) => `${l}\n`).join(''));
    }
  }

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


===== ARQUIVO: scripts/auditoria/integridade-resumo.mjs =====
import { createReadStream, createWriteStream } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';

// Auditor E (integridade nacional): resume a saída de integridade-lacres.mjs de um turno.
//   Teste 1 (H04): conferências e falhas por tipo e UF, emissores, algoritmos, pacotes do SA, órfãos.
//   Teste 2 (H11/A12): seriais repetidos entre seções no turno (urna, FV, MR, FC, código de carga).
//   Teste 3: coerência urna BU = .vsc = certificado = log; FV = MV; modelo .vsc = log; FC e código de carga BU = log.
//   Teste 4: versão do software de votação (BU e log).
// Grava <t>t/resumo.json, <t>t/casos.jsonl (cada anomalia, com localização) e <t>t/secoes.jsonl (identificadores
// por seção, usado por integridade-entre-turnos.mjs).
//
// Uso: node scripts/auditoria/integridade-resumo.mjs --turno 2 [--dir <pasta com os <uf>.jsonl>]

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'integridade');
const DIA = { 1: '04/10/2026', 2: '25/10/2026' };
const VESPERA = { 1: '03/10/2026', 2: '24/10/2026' };
const TIPO = { 1: 'secao', 3: 'contingencia', 4: 'reservaSecao', 6: 'reservaEncerrandoSecao' };

const inc = (o, k, n = 1) => {
  o[k] = (o[k] ?? 0) + n;
};
const normalizar = (s) => s.replace(/o\d{5}[a-z]{2}\d{13}-/g, '').replace(/\d+ tuplas/, 'N tuplas').replace(/eleição \d+/, 'eleição N')
  .replace(/certificado \S+ assinado/, 'certificado da urna assinado').replace(/tamanho \d+ ≠ lacrado \d+/, 'tamanho ≠ lacrado');

async function* linhas(arquivo) {
  const rl = createInterface({ input: createReadStream(arquivo), crlfDelay: Infinity });
  for await (const l of rl) if (l) yield JSON.parse(l);
}

/** Identificadores compactos de um pacote oficial. */
function compactar(r, turno) {
  const bu = r.bu && !r.bu.erro ? r.bu : null;
  const logs = Array.isArray(r.logs) ? r.logs : [];
  const principal = logs.find((l) => l.profundidade === 0) ?? null;
  const urnasLog = principal ? Object.keys(principal.urnas) : [];
  // MR do turno: a lida por último na véspera ou no dia (urna ligada na véspera não lê de novo).
  const mrs = principal ? Object.entries(principal.seriais?.mr ?? {}) : [];
  const mrTurno = mrs.filter(([, d]) => d.startsWith(DIA[turno]) || d.startsWith(VESPERA[turno])).sort((a, b) => ordem(a[1]) - ordem(b[1])).at(-1);
  const certNum = r.urna?.nome && /^ueao\d+$/i.test(r.urna.nome) ? Number(r.urna.nome.slice(4)) : null;
  return {
    k: `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`,
    sa: r.vsc?.endsWith('-sa.vsc') ?? false,
    tipo: bu?.tipoUrna ?? null,
    urnaBU: bu?.numeroInternoUrna ?? null,
    urnaVsc: r.vscInfo?.idHW ?? null,
    urnaCert: certNum,
    certNome: r.urna?.nome ?? null,
    urnasLog: urnasLog.map(Number),
    urnasLogAninhado: logs.filter((l) => l.profundidade > 0).flatMap((l) => Object.keys(l.urnas)).map(Number),
    logs: logs.length,
    fv: bu?.numeroSerieFV ?? null,
    mv: principal?.mv ?? null,
    mr: mrTurno?.[0] ?? null,
    mrData: mrTurno?.[1] ?? null,
    mrUltima: principal?.mr ?? null,
    fc: bu?.numeroSerieFC ?? null,
    fcLog: principal?.fc ?? null,
    carga: bu?.codigoCarga ?? null,
    cargaLog: principal?.codigoCarga ?? null,
    dataCarga: bu?.dataHoraCarga ?? null,
    modeloVsc: r.vscInfo?.modelo ?? null,
    modeloLog: principal?.modelo ?? null,
    versaoBU: bu?.versao ?? null,
    versoesLog: principal ? Object.keys(principal.versoes) : [],
    versoesLogAninhado: logs.filter((l) => l.profundidade > 0).flatMap((l) => Object.keys(l.versoes)),
    emissor: r.urna?.emissor ?? null,
    alg: r.urna?.algoritmo ?? null,
    buLocal: bu ? [bu.pleito, bu.municipio, bu.zona, bu.secao] : null,
  };
}
const ordem = (d) => Number(`${d.slice(6, 10)}${d.slice(3, 5)}${d.slice(0, 2)}${d.slice(11, 13)}${d.slice(14, 16)}${d.slice(17, 19)}`);

async function principal() {
  const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, dir: { type: 'string' } } });
  const turno = Number(values.turno);
  const pleito = turno === 1 ? 3220 : 3221;
  const dir = values.dir ?? path.join(SAIDA, `${turno}t`);
  const ufs = (await readdir(dir)).filter((n) => /^[a-z]{2}\.jsonl$/.test(n)).map((n) => n.slice(0, 2)).sort();
  const casos = createWriteStream(path.join(dir, 'casos.jsonl'));
  const secoesOut = createWriteStream(path.join(dir, 'secoes.jsonl'));
  // Reverificação (integridade-reverificar.mjs): certificado com bytes a mais no fim do campo [1] do .vsc.
  const reverif = new Map();
  try {
    for await (const x of linhas(path.join(dir, 'reverificacao.jsonl'))) reverif.set(`${x.onde}|${x.hash}`, x);
  } catch (erro) {
    if (erro.code !== 'ENOENT') throw erro;
  }
  const caso = (teste, tipo, onde, detalhe) => casos.write(`${JSON.stringify({ teste, tipo, onde, ...detalhe })}\n`);

  const r1 = { porUf: {}, total: { secoes: 0, diretoriosOficiais: 0, conferencias: 0, porCamada: {}, diretoriosComFalha: 0 },
    falhasPorTipo: {}, falhasExtrasPorTipo: {}, nomeNaoConfere: 0, emissor: {}, algoritmo: {}, emissorModelo: {}, observacoes: {},
    papeis: {}, orfaos: {}, ausentes: 0, semPacote: {}, erros: 0, sa: { pacotes: 0, conferencias: 0, comFalha: 0, lista: [] },
    secoesComMaisDeUmPacote: 0, parserCertificado: { casos: 0, reverificados: 0, sobraSoZeros: 0, aprovadosAposCorte: 0, porTamanho: {}, porModelo: {}, porUf: {} }, arquivosEstranhos: {}, auxListaFaltando: 0, validadeCert: {}, logsVerificacaoSemSucesso: 0 };
  const grupos = { urna: new Map(), fv: new Map(), mr: new Map(), fc: new Map(), carga: new Map() };
  const r3 = { secoes: 0, contagens: {}, divergencias: {} };
  const r4 = { versaoBU: {}, versaoLog: {}, versaoLogAninhado: {}, porModelo: {} };
  const verif = (nome, ok, onde, detalhe) => {
    inc(r3.contagens, `${nome}:${ok === null ? 'sem_dado' : ok ? 'igual' : 'diferente'}`);
    if (ok === false) {
      inc(r3.divergencias, nome);
      caso(3, nome, onde, detalhe);
    }
  };

  for (const uf of ufs) {
    const u = (r1.porUf[uf] = { secoes: 0, diretorios: 0, conferencias: 0, falhas: 0, diretoriosComFalha: 0, orfaos: 0, emissor: {}, alg: {} });
    const porSecao = new Map();
    for await (const r of linhas(path.join(dir, `${uf}.jsonl`))) {
      inc(r1.papeis, r.papel);
      const onde = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
      if (r.papel === 'orfao') {
        u.orfaos++;
        inc(r1.orfaos, `copia=${r.copiaDeOficial} nomeAntigo=${r.nomeAntigoConfere} nomeNovo=${r.nomeNovoConfere}`);
        if (!r.copiaDeOficial) caso(1, 'orfao_nao_copia', onde, { hash: r.hash, nomeAntigoConfere: r.nomeAntigoConfere });
        continue;
      }
      if (r.papel === 'ausente') {
        r1.ausentes++;
        caso(1, 'pacote_do_aux_ausente_no_disco', onde, { hash: r.hash });
        continue;
      }
      if (r.papel === 'sem_pacote') {
        inc(r1.semPacote, r.auxSt ?? 'sem aux');
        continue;
      }
      if (r.papel === 'erro') {
        r1.erros++;
        caso(1, 'erro_leitura_secao', onde, { erro: r.erro });
        continue;
      }
      // oficial
      if (r.falhas?.some((f) => f.camada === 'leitura')) {
        const pc = r1.parserCertificado;
        pc.casos++;
        const x = reverif.get(`${onde}|${r.hash}`);
        if (x?.aposCorte) {
          pc.reverificados++;
          if (/^0+$/.test(x.sobra)) pc.sobraSoZeros++;
          if (x.aposCorte.falhas.length === 0) pc.aprovadosAposCorte++;
          inc(pc.porTamanho, `${x.tamanhoDer}/${x.tamanhoCampo}`);
          inc(pc.porModelo, r.vscInfo?.modelo ?? '?');
          inc(pc.porUf, r.uf);
          r.falhasLeitor = r.falhas;
          r.falhas = x.aposCorte.falhas;
          r.urna = x.aposCorte.urna;
          r.conferencias = x.aposCorte.conferencias;
          r.porCamada = x.aposCorte.porCamada;
          r.observacoes = x.aposCorte.observacoes;
          r.validadeCert = `${x.cert.validoDe} a ${x.cert.validoAte}`;
        }
      }
      u.diretorios++;
      r1.total.diretoriosOficiais++;
      const falhas = r.falhas ?? [];
      const extras = r.falhasExtras ?? [];
      u.conferencias += r.conferencias ?? 0;
      r1.total.conferencias += r.conferencias ?? 0;
      for (const [c, n] of Object.entries(r.porCamada ?? {})) inc(r1.total.porCamada, c, n);
      u.falhas += falhas.length;
      for (const f of falhas) inc(r1.falhasPorTipo, `[${f.camada}] ${normalizar(f.item)}`);
      for (const e of extras) inc(r1.falhasExtrasPorTipo, normalizar(e));
      if (r.nomeConfere === false) r1.nomeNaoConfere++;
      if (r.estranhos?.length) for (const e of r.estranhos) inc(r1.arquivosEstranhos, e.replace(/^o\d{5}[a-z]{2}\d{13}/, ''));
      if (r.auxListaFaltando?.length) {
        r1.auxListaFaltando++;
        caso(1, 'arquivo_do_aux_ausente', onde, { hash: r.hash, faltando: r.auxListaFaltando });
      }
      for (const o of r.observacoes ?? []) inc(r1.observacoes, o);
      inc(r1.validadeCert, r.validadeCert ?? 'sem');
      const comFalha = falhas.length > 0 || extras.length > 0 || r.nomeConfere === false;
      if (comFalha) {
        u.diretoriosComFalha++;
        r1.total.diretoriosComFalha++;
        caso(1, 'falha_lacre', onde, { hash: r.hash, nomeConfere: r.nomeConfere, falhas, extras });
      }
      const emissor = r.urna?.emissor ?? 'sem certificado';
      inc(r1.emissor, emissor);
      inc(u.emissor, emissor);
      inc(r1.algoritmo, r.urna?.algoritmo ?? '?');
      inc(u.alg, r.urna?.algoritmo ?? '?');
      inc(r1.emissorModelo, `${emissor} × ${r.vscInfo?.modelo ?? '?'} × ${r.urna?.algoritmo ?? '?'}`);
      if (Array.isArray(r.logs)) {
        for (const l of r.logs) {
          if (l.verificacoesSemSucesso?.length) {
            r1.logsVerificacaoSemSucesso++;
            caso(1, 'log_verificacao_assinatura_sem_sucesso', onde, { hash: r.hash, linhas: l.verificacoesSemSucesso });
          }
        }
      } else if (r.logs?.erro) caso(1, 'log_ilegivel', onde, { hash: r.hash, erro: r.logs.erro });
      if (r.vsc?.endsWith('-sa.vsc')) {
        r1.sa.pacotes++;
        r1.sa.conferencias += r.conferencias ?? 0;
        if (comFalha) r1.sa.comFalha++;
        r1.sa.lista.push({ onde, conferencias: r.conferencias, falhas: falhas.length + extras.length, emissor, alg: r.urna?.algoritmo, cert: r.urna?.nome, modelo: r.vscInfo?.modelo });
      }
      const atual = porSecao.get(onde);
      if (atual) {
        r1.secoesComMaisDeUmPacote++;
        caso(1, 'secao_com_mais_de_um_pacote', onde, { hashes: [atual.hash, r.hash] });
        if (r.pacoteSt !== 'Totalizado' && atual.pacoteSt === 'Totalizado') continue;
      }
      porSecao.set(onde, { hash: r.hash, pacoteSt: r.pacoteSt, c: compactar(r, turno) });
    }

    for (const [onde, { c }] of porSecao) {
      u.secoes++;
      r1.total.secoes++;
      secoesOut.write(`${JSON.stringify(c)}\n`);
      // Teste 2: grupos por serial (SA fica de fora: o SA não é urna de seção)
      if (!c.sa) {
        const add = (g, v) => {
          if (v === null || v === undefined) return;
          const l = grupos[g].get(v);
          const item = `${onde}|${c.tipo}`;
          if (l) l.push(item);
          else grupos[g].set(v, [item]);
        };
        add('urna', c.urnaBU);
        add('fv', c.fv);
        add('mr', c.mr);
        add('fc', c.fc);
        add('carga', c.carga);
      }
      // Teste 3
      r3.secoes++;
      const [m, z, s] = onde.split('/').slice(1).map(Number);
      const tem = (...v) => v.every((x) => x !== null && x !== undefined);
      verif('bu_local_=_diretorio', c.buLocal ? c.buLocal[0] === pleito && c.buLocal[1] === m && c.buLocal[2] === z && c.buLocal[3] === s : null, onde, { bu: c.buLocal });
      verif('urna_bu_=_vsc', tem(c.urnaBU, c.urnaVsc) ? c.urnaBU === c.urnaVsc : null, onde, { bu: c.urnaBU, vsc: c.urnaVsc, tipoUrna: c.tipo });
      verif('urna_bu_=_certificado', tem(c.urnaBU, c.urnaCert) ? c.urnaBU === c.urnaCert : null, onde, { bu: c.urnaBU, cert: c.certNome, tipoUrna: c.tipo });
      verif('urna_log_unica', c.logs ? c.urnasLog.length === 1 : null, onde, { log: c.urnasLog, tipoUrna: c.tipo });
      verif('urna_bu_=_log', tem(c.urnaBU) && c.urnasLog.length ? c.urnasLog.includes(c.urnaBU) : null, onde, { bu: c.urnaBU, log: c.urnasLog, tipoUrna: c.tipo });
      verif('fv_bu_=_mv_log', tem(c.fv, c.mv) ? c.fv === c.mv : null, onde, { fv: c.fv, mv: c.mv, tipoUrna: c.tipo });
      verif('modelo_vsc_=_log', tem(c.modeloVsc, c.modeloLog) ? c.modeloVsc.toUpperCase() === c.modeloLog.toUpperCase() : null, onde, { vsc: c.modeloVsc, log: c.modeloLog });
      verif('fc_bu_=_log', tem(c.fc, c.fcLog) ? c.fc === c.fcLog : null, onde, { bu: c.fc, log: c.fcLog, tipoUrna: c.tipo });
      verif('carga_bu_=_log', tem(c.carga, c.cargaLog) ? c.carga === c.cargaLog : null, onde, { bu: c.carga, log: c.cargaLog, tipoUrna: c.tipo });
      // O log do 1º turno não grava o serial da MR (só "Tamanho da MR"); no 2º turno grava a cada leitura.
      verif('mr_lida_no_turno', turno === 2 && c.logs && !c.sa ? c.mr !== null : null, onde, { ultimaMr: c.mrUltima, tipoUrna: c.tipo });
      // Teste 4
      inc(r4.versaoBU, c.versaoBU ?? 'sem BU');
      inc(r4.porModelo, `${c.modeloVsc} | ${c.versaoBU}`);
      for (const v of c.versoesLog) inc(r4.versaoLog, v);
      for (const v of c.versoesLogAninhado) inc(r4.versaoLogAninhado, v);
      if (c.versaoBU && c.versoesLog.length && (c.versoesLog.length > 1 || c.versoesLog[0] !== c.versaoBU)) caso(4, 'versao_log_≠_bu', onde, { bu: c.versaoBU, log: c.versoesLog });
    }
    process.stdout.write(`${uf} `);
  }

  // Teste 4: versões fora da moda
  const moda = Object.entries(r4.versaoBU).sort((a, b) => b[1] - a[1])[0]?.[0];
  r4.moda = moda;

  // Teste 2: repetições
  const r2 = {};
  for (const [g, mapa] of Object.entries(grupos)) {
    const rep = [...mapa.entries()].filter(([, l]) => l.length > 1);
    const tamanhos = {};
    for (const [, l] of rep) inc(tamanhos, l.length);
    const padroes = {};
    const mesmaZona = { sim: 0, nao: 0 };
    const mesmoMunicipio = { sim: 0, nao: 0 };
    for (const [v, l] of rep) {
      const tipos = l.map((x) => TIPO[x.split('|')[1]] ?? x.split('|')[1]).sort();
      const padrao = tipos.join('+');
      if (g === 'fc') inc(padroes, `${tipos.filter((x) => x !== 'secao').length} não-seção em ${tipos.length}`);
      else inc(padroes, padrao);
      const zonas = new Set(l.map((x) => x.split('/').slice(0, 3).join('/')));
      const muns = new Set(l.map((x) => x.split('/').slice(0, 2).join('/')));
      mesmaZona[zonas.size === 1 ? 'sim' : 'nao']++;
      mesmoMunicipio[muns.size === 1 ? 'sim' : 'nao']++;
      if (g !== 'fc') caso(2, `repeticao_${g}`, l.map((x) => x.split('|')[0]).join('; '), { valor: v, tipos });
    }
    const distribuicao = {};
    if (g === 'fc') for (const [, l] of mapa) inc(distribuicao, l.length);
    r2[g] = { distintos: mapa.size, secoesComValor: [...mapa.values()].reduce((a, l) => a + l.length, 0), repetidos: rep.length, tamanhos, padroes, mesmaZona, mesmoMunicipio,
      ...(g === 'fc' ? { secoesPorMidia: distribuicao } : {}) };
  }

  const resumo = { turno, geradoEm: new Date().toISOString(), teste1: r1, teste2: r2, teste3: r3, teste4: r4 };
  await writeFile(path.join(dir, 'resumo.json'), JSON.stringify(resumo, null, 1));
  await Promise.all([casos, secoesOut].map((s) => new Promise((ok) => s.end(ok))));
  console.log(`\n${r1.total.secoes} seções, ${r1.total.diretoriosOficiais} diretórios oficiais, ${r1.total.conferencias} conferências, ${r1.total.diretoriosComFalha} com falha`);
}

await principal();


===== ARQUIVO: scripts/auditoria/integridade-casos-especiais.mjs =====
import { createReadStream } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { hashDiretorio } from '../../src/vsc.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

// Auditor E (integridade nacional). Casos que o resumo separa e que pedem leitura do log:
//   1. Pacotes do Recuperador de Dados (tipo_arquivo 'votacaoRED' no banco): BU de uma urna, .vsc/certificado/log de
//      outra. Confere se a urna do BU é a do log aninhado, se o log da urna original tem o mesmo número de votos do BU
//      e quando a recuperação aconteceu ("Iniciando aplicação RECUPERADOR DE DADOS"). Compara a FV do BU com os cartões de
//      votação lidos nos logs ("Serial da MV:") e registra se o RED informou "Detectado Urna de Votação sem MV".
//   2. Grupos de MR repetida no turno (casos.jsonl, repeticao_mr): para cada seção do grupo, computador, usuário e
//      data/hora de geração da MR lidos no log. Mesma geração em todas = cópia de uma MR só.
// Entrada: secoes.jsonl e casos.jsonl de integridade-resumo.mjs (<t>t, ou --dir; no 1º turno, 1t-identificadores).
// Saída: <dir>/casos-especiais.json
//
// Uso: node scripts/auditoria/integridade-casos-especiais.mjs --turno 2 [--dir <pasta>]

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'integridade');
const DIA = { 1: '04/10/2026', 2: '25/10/2026' };
const handleEmMemoria = (buffer) => ({
  read: async (destino, deslocamento, tamanho, posicao) => ({ bytesRead: buffer.copy(destino, deslocamento, posicao, posicao + tamanho) }),
  stat: async () => ({ size: buffer.length }),
});
async function textosDeLog(handle, profundidade = 0) {
  const textos = [];
  for (const entrada of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, entrada);
    if (entrada.nome === 'logd.dat') textos.push({ profundidade, nome: entrada.nome, texto: dados.toString('latin1') });
    else if (entrada.nome.endsWith('.jez') && profundidade < 3) textos.push(...(await textosDeLog(handleEmMemoria(dados), profundidade + 1)));
  }
  return textos;
}

async function logsDaSecao(base, k) {
  const dir = path.join(base, ...k.split('/'));
  let hashes;
  try {
    const aux = JSON.parse(await readFile(path.join(dir, 'aux.json'), 'utf8'));
    hashes = (aux.hashes ?? []).filter((h) => h.hash && h.hash !== '0' && (h.arq ?? []).some((a) => a.nm)).map((h) => h.hash);
  } catch {
    hashes = [];
    for (const h of (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name)) {
      const nomes = await readdir(path.join(dir, h));
      const v = acharArquivo(nomes, 'vsc');
      if (v && hashDiretorio(await readFile(path.join(dir, h, v))) === h) hashes.push(h);
    }
  }
  const h = hashes.at(-1);
  const nomes = await readdir(path.join(dir, h));
  return textosDeLog(handleEmMemoria(await readFile(path.join(dir, h, acharArquivo(nomes, 'log')))));
}

const colunas = (texto) => texto.split('\n').map((l) => l.replace(/\r$/, '').split('\t')).filter((c) => c.length >= 5);

async function principal() {
  const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, dir: { type: 'string' } } });
  const turno = Number(values.turno);
  const dir = values.dir ?? path.join(SAIDA, `${turno}t`);
  const base = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas');
  const secoes = new Map();
  for await (const l of createInterface({ input: createReadStream(path.join(dir, 'secoes.jsonl')), crlfDelay: Infinity })) {
    if (l) {
      const c = JSON.parse(l);
      secoes.set(c.k, c);
    }
  }
  const { db } = await abrirLeitura(); // cópia imutável do banco (doc 09, "Leitura sem concorrência")
  const red = db.prepare("SELECT uf, municipio, zona, secao, tipo_urna, comparecimento FROM secao WHERE turno = ? AND tipo_arquivo = 'votacaoRED' ORDER BY 1, 2, 3, 4").all(turno);
  const saida = { turno, red: [], mr: [] };
  for (const s of red) {
    const k = `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`;
    const c = secoes.get(k) ?? null;
    const logs = await logsDaSecao(base, k);
    const porLog = logs.map((l) => {
      const cs = colunas(l.texto);
      const urnas = [...new Set(cs.map((x) => Number(x[2])))];
      const votosNoDia = cs.filter((x) => x[0].startsWith(DIA[turno]) && x[4] === 'O voto do eleitor foi computado').length;
      const red1 = cs.find((x) => x[4].startsWith('Iniciando aplicação RECUPERADOR DE DADOS'));
      const contingencia = cs.find((x) => x[4].startsWith('Modo de carga da UE - Urna de contingência'));
      const mvs = [...new Set(cs.filter((x) => x[4].startsWith('Serial da MV: ')).map((x) => x[4].slice(14).trim()))];
      const semMv = cs.some((x) => x[3] === 'RED' && x[4] === 'Detectado Urna de Votação sem MV');
      return { profundidade: l.profundidade, urnas, votosNoDia, recuperacao: red1?.[0] ?? null, cargaContingencia: contingencia?.[0] ?? null, mvs, semMv,
        mensagensRed: [...new Set(cs.filter((x) => x[3] === 'RED').map((x) => x[4].replace(/\d+/g, '#')))].slice(0, 40) };
    });
    const votosLogs = porLog.reduce((a, l) => a + l.votosNoDia, 0);
    saida.red.push({ onde: k, tipoUrna: s.tipo_urna, comparecimentoBU: s.comparecimento, urnaBU: c?.urnaBU ?? null, urnaVsc: c?.urnaVsc ?? null, certificado: c?.certNome ?? null,
      emissor: c?.emissor ?? null, modelo: c?.modeloVsc ?? null, buUrnaNoLogAninhado: c ? porLog.some((l) => l.profundidade > 0 && l.urnas.includes(c.urnaBU)) : null,
      buUrnaIgualVsc: c ? c.urnaBU === c.urnaVsc : null, votosNosLogs: votosLogs, votosConferem: votosLogs === s.comparecimento,
      fvBU: c?.fv ?? null, fvBuEntreMvsLidas: c ? porLog.some((l) => l.mvs.includes(c.fv)) : null, redSemMv: porLog.some((l) => l.semMv), logs: porLog });
  }
  // Grupos de MR repetida
  const casos = createInterface({ input: createReadStream(path.join(dir, 'casos.jsonl')), crlfDelay: Infinity });
  for await (const l of casos) {
    if (!l.includes('"repeticao_mr"')) continue;
    const g = JSON.parse(l);
    const lista = g.onde.split('; ');
    const geracoes = {};
    for (const k of lista) {
      const logs = await logsDaSecao(base, k);
      const cs = colunas(logs.find((x) => x.profundidade === 0)?.texto ?? '');
      let ger = null;
      let i = cs.findLastIndex((x) => x[4] === `Número de série da MR: ${g.valor}`);
      if (i >= 0) {
        const bloco = cs.slice(i, i + 6).map((x) => x[4]);
        const pc = bloco.find((m) => m.startsWith('MR gerada pelo computador: '))?.slice(27) ?? '?';
        const quando = bloco.find((m) => m.startsWith('Data e hora da geração da MR: '))?.slice(30) ?? '?';
        const usuario = bloco.find((m) => m.startsWith('MR gerada pelo usuário: ')) ? 'informado' : '?';
        ger = `${pc} | ${quando} | usuário ${usuario}`;
      }
      geracoes[ger ?? 'sem bloco de geração'] = (geracoes[ger ?? 'sem bloco de geração'] ?? 0) + 1;
    }
    const zonas = [...new Set(lista.map((x) => x.split('/').slice(0, 3).join('/')))];
    saida.mr.push({ valor: g.valor, secoes: lista.length, zonas, tipos: g.tipos.reduce((o, t) => ((o[t] = (o[t] ?? 0) + 1), o), {}), geracoes,
      umaGeracaoSo: Object.keys(geracoes).length === 1, exemplo: lista.slice(0, 3) });
  }
  await writeFile(path.join(dir, 'casos-especiais.json'), JSON.stringify(saida, null, 1));
  console.log(JSON.stringify({ red: saida.red.map(({ logs, ...r }) => r), mr: saida.mr.map(({ exemplo, ...r }) => ({ ...r, zonas: r.zonas.length })) }, null, 1));
}

await principal();


===== ARQUIVO: scripts/auditoria/integridade-urnas-reaproveitadas.mjs =====
import { createReadStream } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';

// Auditor E (integridade nacional), teste 2 (H11/A12). Mesma urna física em mais de uma seção no mesmo turno,
// contando também o log aninhado (urna original substituída por contingência). Para cada urna que aparece em mais
// de uma seção: em que papel (urna do BU ou log aninhado), de quando a quando ela escreveu log em cada seção,
// quantas linhas escreveu no dia da eleição, e se os intervalos se sobrepõem (sobreposição = a mesma urna
// escrevendo log em duas seções ao mesmo tempo, o que uma urna física não faz). A sobreposição real só conta entre logs de
// cargas diferentes: o MESMO log (mesmo código de carga) aparece em dois pacotes quando a urna falha, o cartão de votação
// leva a cópia do log para a reserva, e a urna é recarregada e vai para outra seção com o log antigo arquivado.
// Entrada: data/parsed/auditoria/integridade/<t>t/<uf>.jsonl (integridade-lacres.mjs; ou <t>t-identificadores).
// Saída: <dir>/urnas-reaproveitadas.json
//
// Uso: node scripts/auditoria/integridade-urnas-reaproveitadas.mjs --turno 2 [--dir <pasta>]

const DIA = { 1: '04/10/2026', 2: '25/10/2026' };
const ordem = (d) => `${d.slice(6, 10)}${d.slice(3, 5)}${d.slice(0, 2)}${d.slice(11, 19)}`;

async function principal() {
  const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, dir: { type: 'string' } } });
  const turno = Number(values.turno);
  const dir = values.dir ?? path.join(DIR_DADOS, 'parsed', 'auditoria', 'integridade', `${turno}t`);
  const usos = new Map(); // urna → [{ k, papel, tipo, ini, fim, linhasNoDia }]
  for (const arq of (await readdir(dir)).filter((n) => /^[a-z]{2}\.jsonl$/.test(n)).sort()) {
    for await (const l of createInterface({ input: createReadStream(path.join(dir, arq)), crlfDelay: Infinity })) {
      if (!l.includes('"papel":"oficial"')) continue;
      const r = JSON.parse(l);
      if (r.vsc?.endsWith('-sa.vsc') || !Array.isArray(r.logs)) continue;
      const k = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
      for (const log of r.logs) {
        for (const [u, n] of Object.entries(log.urnas)) {
          const urna = Number(u);
          const papel = log.profundidade === 0 ? 'principal' : 'aninhado';
          const item = { k, papel, tipo: r.bu?.tipoUrna ?? null, urnaDoBu: r.bu?.numeroInternoUrna === urna, ini: log.primeiraData, fim: log.ultimaData,
            carga: log.codigoCarga ?? null, linhas: n, linhasNoDia: log.urnasNoDia[u] ?? 0 };
          const lista = usos.get(urna);
          if (lista) lista.push(item);
          else usos.set(urna, [item]);
        }
      }
    }
  }
  const r = { turno, urnas: usos.size, emMaisDeUmaSecao: 0, comSobreposicao: 0, mesmoLogEmDuasSecoes: 0, comSobreposicaoReal: 0, ativasNoDiaEmDuasSecoes: 0, padroes: {}, casos: [] };
  for (const [urna, lista] of usos) {
    const secoes = new Set(lista.map((x) => x.k));
    if (secoes.size < 2) continue;
    r.emMaisDeUmaSecao++;
    // Junta por seção (um log por seção e urna)
    const porSecao = [...secoes].map((k) => {
      const xs = lista.filter((x) => x.k === k);
      return { k, papeis: [...new Set(xs.map((x) => (x.urnaDoBu ? 'BU' : x.papel)))].join('+'), tipo: xs[0].tipo, cargas: [...new Set(xs.map((x) => x.carga))],
        ini: xs.map((x) => x.ini).sort((a, b) => ordem(a).localeCompare(ordem(b)))[0], fim: xs.map((x) => x.fim).sort((a, b) => ordem(b).localeCompare(ordem(a)))[0],
        linhasNoDia: xs.reduce((a, x) => a + x.linhasNoDia, 0) };
    }).sort((a, b) => ordem(a.ini).localeCompare(ordem(b.ini)));
    let sobrepoe = false;
    for (let i = 1; i < porSecao.length; i++) if (ordem(porSecao[i].ini) < ordem(porSecao[i - 1].fim)) sobrepoe = true;
    let sobrepoeReal = false;
    for (const a of lista) {
      for (const b of lista) {
        if (a.k < b.k && (a.carga === null || a.carga !== b.carga) && ordem(a.ini) < ordem(b.fim) && ordem(b.ini) < ordem(a.fim)) sobrepoeReal = true;
      }
    }
    const mesmoLog = lista.some((a) => a.carga && lista.some((b) => b.k !== a.k && b.carga === a.carga));
    const ativasNoDia = porSecao.filter((s) => s.linhasNoDia > 0).length;
    if (sobrepoe) r.comSobreposicao++;
    if (mesmoLog) r.mesmoLogEmDuasSecoes++;
    if (sobrepoeReal) r.comSobreposicaoReal++;
    if (ativasNoDia > 1) r.ativasNoDiaEmDuasSecoes++;
    const padrao = porSecao.map((s) => `${s.papeis}${s.linhasNoDia ? '(dia)' : ''}`).join(' → ');
    r.padroes[padrao] = (r.padroes[padrao] ?? 0) + 1;
    if (sobrepoe || ativasNoDia > 1 || r.casos.length < 30) r.casos.push({ urna, sobrepoe, mesmoLog, sobrepoeReal, ativasNoDia, porSecao });
  }
  await writeFile(path.join(dir, 'urnas-reaproveitadas.json'), JSON.stringify(r, null, 1));
  console.log(JSON.stringify({ ...r, casos: r.casos.filter((c) => c.sobrepoeReal || c.ativasNoDia > 1) }, null, 1));
  console.log(`dia da eleição: ${DIA[turno]}`);
}

await principal();


===== ARQUIVO: scripts/auditoria/integridade-entre-turnos.mjs =====
import { createReadStream, createWriteStream, existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';

// Auditor E (integridade nacional), teste 2 entre turnos (H11/A12): compara, seção a seção, os identificadores
// do 1º e do 2º turno gravados por integridade-resumo.mjs (<t>t/secoes.jsonl): nº da urna, FV, MR, FC, código de
// carga e modelo. Mede quantas seções trocaram de urna e se a troca coincide com contingência; procura urna, FV e
// MR que aparecem em seções diferentes nos dois turnos.
// Grava entre-turnos.json e entre-turnos-casos.jsonl em data/parsed/auditoria/integridade/.
//
// Uso: node scripts/auditoria/integridade-entre-turnos.mjs [--dir1 <pasta do 1º turno>] [--dir2 <pasta do 2º turno>]
//   (padrão: <saída>/1t, se tiver secoes.jsonl, senão <saída>/1t-identificadores; e <saída>/2t)

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'integridade');
const inc = (o, k, n = 1) => {
  o[k] = (o[k] ?? 0) + n;
};
const TIPO = { 1: 'secao', 3: 'contingencia', 4: 'reservaSecao', 6: 'reservaEncerrandoSecao' };

async function carregar(dir) {
  const mapa = new Map();
  const rl = createInterface({ input: createReadStream(path.join(dir, 'secoes.jsonl')), crlfDelay: Infinity });
  for await (const l of rl) {
    if (!l) continue;
    const c = JSON.parse(l);
    if (!c.sa) mapa.set(c.k, c);
  }
  return mapa;
}

const indice = (mapa, campo) => {
  const ix = new Map();
  for (const [k, c] of mapa) {
    const v = c[campo];
    if (v === null || v === undefined) continue;
    const l = ix.get(v);
    if (l) l.push(k);
    else ix.set(v, [k]);
  }
  return ix;
};

async function principal() {
  const { values } = parseArgs({ options: { dir1: { type: 'string' }, dir2: { type: 'string' } } });
  const padrao1 = existsSync(path.join(SAIDA, '1t', 'secoes.jsonl')) ? path.join(SAIDA, '1t') : path.join(SAIDA, '1t-identificadores');
  const [t1, t2] = [await carregar(values.dir1 ?? padrao1), await carregar(values.dir2 ?? path.join(SAIDA, '2t'))];
  const casos = createWriteStream(path.join(SAIDA, 'entre-turnos-casos.jsonl'));
  const caso = (tipo, onde, d) => casos.write(`${JSON.stringify({ tipo, onde, ...d })}\n`);
  const r = { secoes1t: t1.size, secoes2t: t2.size, emAmbos: 0, so1t: 0, so2t: 0, campos: {}, trocaUrna: { total: 0, porTipos: {}, porUf: {}, modelo: {} },
    urnaEmOutraSecao: { total: 0, porTipos: {} }, fvEmOutraSecao: 0, mrEmOutraSecao: 0, mrMesmaSecao: 0, fcEmOutraZona: 0 };
  for (const k of t1.keys()) if (!t2.has(k)) r.so1t++;
  const ix1 = { urna: indice(t1, 'urnaBU'), fv: indice(t1, 'fv'), mr: indice(t1, 'mr') };

  for (const [k, b] of t2) {
    const a = t1.get(k);
    if (!a) {
      r.so2t++;
      continue;
    }
    r.emAmbos++;
    for (const campo of ['urnaBU', 'fv', 'mr', 'fc', 'carga', 'dataCarga', 'modeloVsc', 'versaoBU', 'emissor']) {
      const va = a[campo];
      const vb = b[campo];
      inc((r.campos[campo] ??= {}), va === null || vb === null ? 'sem_dado' : va === vb ? 'igual' : 'diferente');
    }
    if (a.urnaBU !== null && b.urnaBU !== null && a.urnaBU !== b.urnaBU) {
      r.trocaUrna.total++;
      const tipos = `${TIPO[a.tipo] ?? a.tipo} → ${TIPO[b.tipo] ?? b.tipo}`;
      inc(r.trocaUrna.porTipos, tipos);
      inc(r.trocaUrna.porUf, k.slice(0, 2));
      inc(r.trocaUrna.modelo, `${a.modeloVsc} → ${b.modeloVsc}`);
      // A urna do 1º turno estava, no 1º turno, em contingência (urna original no log aninhado)?
      const originalNo1t = a.urnasLogAninhado ?? [];
      const urna2tNoLog1t = originalNo1t.includes(b.urnaBU);
      caso('troca_de_urna', k, { urna1t: a.urnaBU, urna2t: b.urnaBU, tipos, modelos: `${a.modeloVsc} → ${b.modeloVsc}`, carga1t: a.dataCarga, carga2t: b.dataCarga,
        urnaOriginal1t: originalNo1t, urna2tEraOriginal1t: urna2tNoLog1t, mesmaCarga: a.carga === b.carga });
    }
    if (a.mr !== null && a.mr === b.mr) {
      r.mrMesmaSecao++;
      caso('mr_igual_nos_dois_turnos', k, { mr: a.mr, data1t: a.mrData, data2t: b.mrData, urna1t: a.urnaBU, urna2t: b.urnaBU });
    }
    if (a.fc !== b.fc && a.fc && b.fc) inc(r.campos, 'fcDiferente_carga_igual', a.carga === b.carga ? 1 : 0);
  }

  // Mesmo identificador em seções diferentes entre turnos
  for (const [k, b] of t2) {
    const outra = (campo, valor) => (ix1[campo].get(valor) ?? []).filter((x) => x !== k);
    if (b.urnaBU !== null) {
      const l = outra('urna', b.urnaBU);
      if (l.length) {
        r.urnaEmOutraSecao.total++;
        const tipos = `${l.map((x) => TIPO[t1.get(x).tipo] ?? t1.get(x).tipo).join('+')} → ${TIPO[b.tipo] ?? b.tipo}`;
        inc(r.urnaEmOutraSecao.porTipos, tipos);
        caso('urna_em_outra_secao_entre_turnos', k, { urna: b.urnaBU, secoes1t: l, tipos, mesmaZona: l.every((x) => x.split('/').slice(0, 3).join('/') === k.split('/').slice(0, 3).join('/')) });
      }
    }
    if (b.fv !== null && outra('fv', b.fv).length) {
      r.fvEmOutraSecao++;
      caso('fv_em_outra_secao_entre_turnos', k, { fv: b.fv, secoes1t: outra('fv', b.fv), urna2t: b.urnaBU, urnas1t: outra('fv', b.fv).map((x) => t1.get(x).urnaBU) });
    }
    if (b.mr !== null && outra('mr', b.mr).length) {
      r.mrEmOutraSecao++;
      caso('mr_em_outra_secao_entre_turnos', k, { mr: b.mr, secoes1t: outra('mr', b.mr), urna2t: b.urnaBU, urnas1t: outra('mr', b.mr).map((x) => t1.get(x).urnaBU) });
    }
  }
  await writeFile(path.join(SAIDA, 'entre-turnos.json'), JSON.stringify(r, null, 1));
  await new Promise((ok) => casos.end(ok));
  console.log(JSON.stringify(r, null, 1));
}

await principal();

