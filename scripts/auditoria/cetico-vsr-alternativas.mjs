// Cético, achado "votos sem rastro no log" (matemático forense, doc 02), lente de explicações alternativas e poder.
//
//   --pacotes  abre o pacote bruto das seções pedidas (padrão: as 3 do 1º turno + a 0181 da BA) e lista cada logd.dat:
//              caminho dentro do log.jez, urna (coluna 3), "Seção Eleitoral"/município/zona declarados, 1ª e última
//              linha do dia, habilitados/computados; mais tipoUrna, urna e códigos de carga do BU e a lista do .vsc.
//   --reconciliar  soma comparecimento do BU × computados do log na saída do autor (matematico/<t>t/*.jsonl), seção a
//              seção, e compara com o universo do tópico 04 da perícia (499.176 seções, fora as 31 com SA num turno).
//   --estrangeiro  universo inteiro (pacotes com 2+ urnas no log, pela saída do autor): separa os votos de cada logd.dat
//              pela "Seção Eleitoral" declarada. Testa a alternativa "log de outra seção mascara voto sem rastro" e
//              a dupla contagem de votos de outra seção no total nacional.
//   --interrupcoes universo inteiro (pacotes com ciclo interrompido): descreve cada ciclo interrompido (cargos confirmados,
//              cargos do BU, se o ciclo estava completo, mensagens entre a última confirmação e a queda) e cruza com
//              "virou voto" (BU − computados do log).
//   --poder    injeta, numa cópia em memória dos dados do autor, votos sem rastro (BU + k) e log de outra seção, e mede
//              quantos o invariante do autor detecta.
// Saídas: data/parsed/auditoria/cetico/cetico-vsr-<modo>.json
// Uso: node scripts/auditoria/cetico-vsr-alternativas.mjs --pacotes | --reconciliar | --estrangeiro | --interrupcoes | --poder
import { createReadStream } from 'node:fs';
import { mkdir, open, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo, lerBu } from '../../src/lacres.js';
import { DIA_VOTACAO } from '../../src/perfil-secoes.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');
const AUTOR = path.join(DIR_DADOS, 'parsed', 'auditoria', 'matematico');
const { values } = parseArgs({
  options: {
    pacotes: { type: 'boolean' }, reconciliar: { type: 'boolean' }, estrangeiro: { type: 'boolean' }, interrupcoes: { type: 'boolean' },
    poder: { type: 'boolean' }, extrair: { type: 'boolean' }, intrusa: { type: 'boolean' }, secao: { type: 'string', multiple: true }, turno: { type: 'string', multiple: true },
  },
});

const handleEmMemoria = (buffer) => ({
  read: async (destino, deslocamento, tamanho, posicao) => ({ bytesRead: buffer.copy(destino, deslocamento, posicao, posicao + tamanho) }),
  stat: async () => ({ size: buffer.length }),
});

/** logd.dat do pacote com o caminho dentro do log.jez (contingência aninha o log de outra urna em .jez). */
async function logsComCaminho(handle, prefixo = '', prof = 0) {
  const r = [];
  for (const e of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, e);
    const nome = prefixo ? `${prefixo}/${e.nome}` : e.nome;
    if (e.nome === 'logd.dat') r.push({ caminho: nome, texto: dados.toString('latin1') });
    else if (e.nome.endsWith('.jez') && prof < 3) r.push(...(await logsComCaminho(handleEmMemoria(dados), nome, prof + 1)));
  }
  return r;
}

async function lerLogsPacote(caminhoJez) {
  const h = await open(caminhoJez);
  try {
    return await logsComCaminho(h);
  } finally {
    await h.close();
  }
}

/** Declarações do log (todas as linhas, não só as do dia): "Seção Eleitoral: 0181", "Município: …", "Zona Eleitoral: …". */
function declaracoes(texto) {
  const d = { secoes: new Set(), municipios: new Set(), zonas: new Set() };
  for (const l of texto.split('\n')) {
    const m = l.split('\t')[4] ?? '';
    let x;
    if ((x = /^Se[cç][aã]o Eleitoral:\s*(\d+)/.exec(m))) d.secoes.add(x[1].padStart(4, '0'));
    else if ((x = /^Munic[ií]pio:\s*(\d+)/.exec(m))) d.municipios.add(x[1].padStart(5, '0'));
    else if ((x = /^Zona Eleitoral:\s*(\d+)/.exec(m))) d.zonas.add(x[1].padStart(4, '0'));
  }
  return { secoes: [...d.secoes], municipios: [...d.municipios], zonas: [...d.zonas] };
}

/** Por urna (coluna 3) dentro de um logd.dat: linhas do dia, contagens e a seção declarada em cada trecho. */
function resumoPorUrna(texto, dia) {
  const porUrna = new Map();
  let secaoAtual = null;
  for (const bruta of texto.split('\n')) {
    const l = bruta.replace(/\r$/, '');
    const col = l.split('\t');
    const m = col[4] ?? '';
    const x = /^Se[cç][aã]o Eleitoral:\s*(\d+)/.exec(m);
    if (x) secaoAtual = x[1].padStart(4, '0');
    if (!l.startsWith(dia)) continue;
    const urna = col[2];
    let u = porUrna.get(urna);
    if (!u) porUrna.set(urna, (u = { urna, primeira: col[0], ultima: col[0], linhas: 0, habilitados: 0, computados: 0, computadosPorSecao: {}, primeiroComputado: null, ultimoComputado: null }));
    u.linhas++;
    u.ultima = col[0];
    if (m === 'Eleitor foi habilitado') u.habilitados++;
    else if (m === 'O voto do eleitor foi computado') {
      u.computados++;
      const s = secaoAtual ?? '?';
      u.computadosPorSecao[s] = (u.computadosPorSecao[s] ?? 0) + 1;
      u.primeiroComputado ??= col[0];
      u.ultimoComputado = col[0];
    }
  }
  return [...porUrna.values()];
}

async function arquivosDoPacote(turno, s) {
  const base = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', s.uf, s.municipio, s.zona, s.secao);
  const dirs = (await readdir(base, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  const r = [];
  for (const d of dirs) {
    const dirHash = path.join(base, d);
    const nomes = await readdir(dirHash);
    r.push({ hash: d, dirHash, nomes });
  }
  return r;
}

// ---- --pacotes ----
async function modoPacotes() {
  const pedidos = values.secao ?? ['1:ba/39934/0183/0175', '1:ba/39934/0183/0181', '1:sp/71072/0002/0035', '1:rs/89036/0083/0044'];
  const saida = [];
  for (const p of pedidos) {
    const [turno, resto] = p.split(':');
    const [uf, municipio, zona, secao] = resto.split('/');
    const s = { uf, municipio, zona, secao };
    for (const pac of await arquivosDoPacote(turno, s)) {
      const reg = { turno: Number(turno), ...s, hash: pac.hash.slice(0, 16), arquivos: pac.nomes, bu: null, vscLista: null, logs: [] };
      const nomeBu = acharArquivo(pac.nomes, 'bu');
      if (nomeBu) {
        const bu = lerBu(await readFile(path.join(pac.dirHash, nomeBu)));
        reg.bu = { tipoUrna: bu.urna.tipoUrna, numeroInternoUrna: bu.urna.numeroInternoUrna, dataHoraCarga: bu.urna.dataHoraCarga, codigoCarga: bu.cabecalho.codigoCarga,
          comparecimento: bu.qtdEleitoresCompareceram, abertura: bu.dataHoraAbertura, encerramento: bu.dataHoraEncerramento, origem: bu.origem,
          detalhamento: bu.detalhamento ?? null };
      }
      // Lista assinada do .vsc: nomes de arquivo em texto (latin1) dentro do envelope
      const nomeVsc = acharArquivo(pac.nomes, 'vsc');
      if (nomeVsc) {
        const t = (await readFile(path.join(pac.dirHash, nomeVsc))).toString('latin1');
        reg.vscLista = [...new Set(t.match(/[A-Za-z0-9_.-]+\.(?:jez|dat|vsc|json|bin|txt)/g) ?? [])];
      }
      const nomeLog = acharArquivo(pac.nomes, 'log');
      if (nomeLog) {
        for (const lg of await lerLogsPacote(path.join(pac.dirHash, nomeLog))) {
          reg.logs.push({ caminho: lg.caminho, bytes: lg.texto.length, declarado: declaracoes(lg.texto), porUrna: resumoPorUrna(lg.texto, DIA_VOTACAO[turno]) });
        }
      }
      saida.push(reg);
    }
  }
  return saida;
}

// ---- leitura da saída do autor ----
async function* linhasAutor(turno) {
  const dir = path.join(AUTOR, `${turno}t`);
  for (const f of (await readdir(dir)).filter((x) => x.endsWith('.jsonl')).sort()) {
    for await (const linha of createInterface({ input: createReadStream(path.join(dir, f)), crlfDelay: Infinity })) if (linha) yield JSON.parse(linha);
  }
}

// ---- --reconciliar ----
async function modoReconciliar() {
  const { db } = await abrirLeitura();
  const r = {};
  // seções com BU do Sistema de Apuração em algum turno (universo do tópico 04: fora essas)
  const sa = { 1: new Set(), 2: new Set() };
  const porTurno = { 1: new Map(), 2: new Map() };
  for (const t of [1, 2]) {
    for await (const p of linhasAutor(t)) {
      const k = `${p.uf}/${p.municipio}/${p.zona}/${p.secao}`;
      if (p.origem === 'sa') sa[t].add(k);
      const prev = porTurno[t].get(k);
      if (prev) prev.pacotes++;
      porTurno[t].set(k, { pacotes: (prev?.pacotes ?? 0) + 1, origem: p.origem, comp: p.comparecimento, log: p.log?.computados ?? null, urnas: p.log?.urnas ?? null, votosPorUrna: p.log?.votosPorUrna ?? null, interrompidas: p.log?.interrompidas ?? 0, tipoUrna: p.tipoUrna });
    }
  }
  const saUniao = new Set([...sa[1], ...sa[2]]);
  for (const t of [1, 2]) {
    const m = porTurno[t];
    const x = { pacotes: 0, secoes: m.size, secoesComMaisDeUmPacote: 0, urna: 0, sa: 0, compUrna: 0, logUrna: 0, compUniverso04: 0, logUniverso04: 0, secoesUniverso04: 0,
      compUrnaForaUniverso04: [], divergentes: [] };
    for (const [k, v] of m) {
      x.pacotes += v.pacotes;
      if (v.pacotes > 1) x.secoesComMaisDeUmPacote++;
      if (v.origem === 'sa') { x.sa++; continue; }
      x.urna++;
      x.compUrna += v.comp;
      x.logUrna += v.log;
      if (saUniao.has(k)) x.compUrnaForaUniverso04.push({ secao: k, comp: v.comp, log: v.log, saNoOutroTurno: true });
      else { x.compUniverso04 += v.comp; x.logUniverso04 += v.log; x.secoesUniverso04++; }
      if (v.comp !== v.log) x.divergentes.push({ secao: k, tipoUrna: v.tipoUrna, comp: v.comp, log: v.log, logMenosBu: v.log - v.comp, votosPorUrna: v.votosPorUrna, interrompidas: v.interrompidas });
    }
    x.somaDivergencias = x.divergentes.reduce((s, d) => s + d.logMenosBu, 0);
    // banco: comparecimento por turno no universo do tópico 04
    const linhas = db.prepare(`select uf, municipio, zona, secao, comparecimento from secao where turno = ?`).all(t);
    let compBanco = 0, compBanco04 = 0, nBanco = 0, nBanco04 = 0, semComp = 0;
    for (const l of linhas) {
      const k = `${l.uf}/${l.municipio}/${l.zona}/${l.secao}`;
      if (l.comparecimento === null) { semComp++; continue; }
      nBanco++;
      compBanco += l.comparecimento;
      if (!saUniao.has(k) && m.has(k)) { compBanco04 += l.comparecimento; nBanco04++; }
    }
    x.banco = { secoes: linhas.length, semComparecimento: semComp, comComparecimento: nBanco, compTotal: compBanco, secoesUniverso04: nBanco04, compUniverso04: compBanco04 };
    r[t] = x;
  }
  r.saUniao = [...saUniao].sort();
  r.saPorTurno = { 1: [...sa[1]].sort(), 2: [...sa[2]].sort() };
  return r;
}

// ---- --estrangeiro ----
async function pacotesCandidatos(turno, filtro) {
  const lista = [];
  for await (const p of linhasAutor(turno)) if (p.origem === 'urna' && filtro(p)) lista.push(p);
  return lista;
}

async function modoEstrangeiro() {
  const r = {};
  const turnos = (values.turno ?? ['1', '2']).map(Number);
  for (const t of turnos) {
    const lista = await pacotesCandidatos(t, (p) => (p.log?.logs ?? 0) > 1);
    const x = { pacotesLidos: 0, erros: [], comVotoDeOutraSecao: [], semDeclaracao: 0 };
    for (const p of lista) {
      try {
        const pacs = (await arquivosDoPacote(t, p)).filter((q) => q.hash.startsWith(p.hash.slice(0, 16)) || true);
        const pac = pacs.find((q) => q.hash === p.hash) ?? pacs[0];
        const nomeLog = acharArquivo(pac.nomes, 'log');
        const logs = await lerLogsPacote(path.join(pac.dirHash, nomeLog));
        x.pacotesLidos++;
        // votos por seção declarada, sem cópias (mesma linha em MI e ME): chave = linha inteira
        const vistos = new Set();
        const porSecao = {};
        for (const lg of logs) {
          let secaoAtual = null;
          for (const bruta of lg.texto.split('\n')) {
            const l = bruta.replace(/\r$/, '');
            const m = l.split('\t')[4] ?? '';
            const y = /^Se[cç][aã]o Eleitoral:\s*(\d+)/.exec(m);
            if (y) secaoAtual = y[1].padStart(4, '0');
            if (!l.startsWith(DIA_VOTACAO[t]) || m !== 'O voto do eleitor foi computado') continue;
            if (vistos.has(l)) continue;
            vistos.add(l);
            const s = secaoAtual ?? '?';
            porSecao[s] = (porSecao[s] ?? 0) + 1;
            if (!secaoAtual) x.semDeclaracao++;
          }
        }
        const proprios = (porSecao[p.secao] ?? 0) + (porSecao['?'] ?? 0);
        const outros = Object.entries(porSecao).filter(([s]) => s !== p.secao && s !== '?');
        if (outros.length) {
          x.comVotoDeOutraSecao.push({ secao: `${p.uf}/${p.municipio}/${p.zona}/${p.secao}`, tipoUrna: p.tipoUrna, comp: p.comparecimento, logAutor: p.log.computados,
            proprios, semDeclaracao: porSecao['?'] ?? 0, outros: Object.fromEntries(outros), buMenosProprios: p.comparecimento - proprios });
        }
      } catch (erro) {
        x.erros.push({ secao: `${p.uf}/${p.municipio}/${p.zona}/${p.secao}`, erro: erro.message });
      }
    }
    x.candidatos = lista.length;
    x.votosDeOutraSecao = x.comVotoDeOutraSecao.reduce((s, c) => s + Object.values(c.outros).reduce((a, b) => a + b, 0), 0);
    x.mascarados = x.comVotoDeOutraSecao.filter((c) => c.buMenosProprios !== 0 && c.comp === c.logAutor);
    r[t] = x;
    console.log(`${t}t: ${lista.length} pacotes com 2+ logs, ${x.pacotesLidos} lidos, ${x.erros.length} erros, ${x.comVotoDeOutraSecao.length} com votos de outra seção (${x.votosDeOutraSecao} votos), ${x.mascarados.length} mascarados`);
  }
  return r;
}

// ---- --interrupcoes ----
const CARGO_LOG = { Presidente: 1, Governador: 3, Senador: 5, 'Deputado Federal': 6, 'Deputado Estadual': 7, 'Deputado Distrital': 8, Prefeito: 11, Vereador: 13 };
function ciclosInterrompidos(texto, dia) {
  // percorre as linhas do dia (já sem cópias, por urna) e devolve cada ciclo interrompido com contexto
  const linhas = texto.split('\n');
  const r = [];
  let ciclo = null;
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    if (!l.startsWith(dia)) continue;
    const col = l.split('\t');
    const m = col[4] ?? '';
    if (m === 'Eleitor foi habilitado') ciclo = { inicio: col[0], conf: [], msgs: [], msgsT: [] };
    else if (!ciclo) continue;
    else if (m === 'O voto do eleitor foi computado' || m === 'Eleitor foi suspenso e não confirmou nenhum voto' || m === 'Aguardando digitação do identificador do eleitor') ciclo = null;
    else if (m.startsWith('Urna ligada em') || m.startsWith('Iniciando aplicação') || m.startsWith('Inicio do Encerramento') || m === 'Votação suspensa') {
      ciclo.queda = { hora: col[0], msg: m };
      // mensagens logo depois do religamento que falam de voto/recuperação
      ciclo.depois = [];
      for (let j = i + 1; j < linhas.length && ciclo.depois.length < 400; j++) {
        const mm = linhas[j].split('\t')[4] ?? '';
        if (mm === 'Eleitor foi habilitado') break;
        if (/voto|Voto|recupera|Recupera|MV|Sincroniza|RDV|BU/.test(mm)) ciclo.depois.push(mm);
        if (mm === 'O eleitor identificado já votou') ciclo.jaVotouDepois = true;
      }
      r.push(ciclo);
      ciclo = null;
    } else {
      if (m.startsWith('Voto confirmado para [')) ciclo.conf.push(CARGO_LOG[m.slice(22, -1)] ?? m.slice(22, -1));
      ciclo.msgs.push(m);
      ciclo.msgsT.push([col[0].slice(11), m]);
      if (m.startsWith('Voto confirmado para [')) ciclo.ultimaConf = col[0];
      ciclo.ultima = col[0];
    }
  }
  if (ciclo) { ciclo.queda = { hora: null, msg: 'fim do log' }; ciclo.depois = []; r.push(ciclo); }
  return r;
}

async function modoInterrupcoes() {
  const { linhasPorUrna } = await import('./matematico-brutos.mjs');
  const r = {};
  const turnos = (values.turno ?? ['1', '2']).map(Number);
  for (const t of turnos) {
    const lista = await pacotesCandidatos(t, (p) => (p.log?.interrompidas ?? 0) > 0);
    const x = { pacotes: lista.length, erros: [], ciclos: [] };
    for (const p of lista) {
      try {
        const pacs = await arquivosDoPacote(t, p);
        const pac = pacs.find((q) => q.hash === p.hash) ?? pacs[0];
        const textos = (await lerLogsPacote(path.join(pac.dirHash, acharArquivo(pac.nomes, 'log')))).map((q) => q.texto);
        const cargosBu = [...new Set((p.bu ?? []).map((b) => b.c))];
        const escolhas = Object.fromEntries((p.rdv ?? []).map((q) => [q.c, q.escolhas]));
        const viraram = p.comparecimento - p.log.computados; // > 0: interrupções que viraram voto (se não houver outra causa)
        for (const texto of linhasPorUrna(textos, DIA_VOTACAO[t])) {
          for (const c of ciclosInterrompidos(texto, DIA_VOTACAO[t])) {
            const contagem = {};
            for (const k of c.conf) contagem[k] = (contagem[k] ?? 0) + 1;
            const completo = cargosBu.length > 0 && cargosBu.every((k) => (contagem[k] ?? 0) >= (escolhas[k] ?? 1));
            const temNulo = c.msgs.some((m) => m.startsWith('Atribuido voto nulo'));
            x.ciclos.push({ secao: `${p.uf}/${p.municipio}/${p.zona}/${p.secao}`, tipoUrna: p.tipoUrna, buMenosLog: viraram, interrompidasNoPacote: p.log.interrompidas,
              inicio: c.inicio, ultima: c.ultima ?? null, queda: c.queda, conf: contagem, cargosBu, completo, temNulo,
              ultimasMsgs: c.msgs.slice(-4), msgsT: c.msgsT.slice(-8), ultimaConf: c.ultimaConf ?? null, jaVotouDepois: !!c.jaVotouDepois,
              chave: c.msgs.includes('Urna desligada pela chave'), erroNoCiclo: c.msgs.filter((m) => /erro|Erro|ERRO/.test(m)).slice(0, 3), depois: [...new Set(c.depois)].slice(0, 12) });
          }
        }
      } catch (erro) {
        x.erros.push({ secao: `${p.uf}/${p.municipio}/${p.zona}/${p.secao}`, erro: erro.message });
      }
    }
    // cruzamento: ciclo completo × pacote em que BU > log
    const tab = {};
    for (const c of x.ciclos) {
      const chave = `${c.completo ? 'completo' : c.conf && Object.keys(c.conf).length ? 'parcial' : 'sem confirmação'}|${c.buMenosLog > 0 ? 'pacote com BU>log' : 'pacote com BU=log'}`;
      tab[chave] = (tab[chave] ?? 0) + 1;
    }
    x.tabela = tab;
    r[t] = x;
    console.log(`${t}t: ${lista.length} pacotes com interrupção, ${x.ciclos.length} ciclos, ${x.erros.length} erros; ${JSON.stringify(tab)}`);
  }
  return r;
}

// ---- --poder ----
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
async function modoPoder() {
  const { violacoes } = await import('./matematico-brutos.mjs');
  const rnd = mulberry32(20261029);
  const r = {};
  for (const t of [2]) {
    const urnas = [];
    // Base da simulação de poder (não é número da auditoria): reservatório de 20.000 pacotes sem violação, para caber na memória
    let vistos = 0;
    for await (const p of linhasAutor(t)) {
      if (!(p.origem === 'urna' && p.log && p.violacoes.length === 0)) continue;
      vistos++;
      if (urnas.length < 20000) urnas.push(p);
      else { const j = Math.floor(rnd() * vistos); if (j < 20000) urnas[j] = p; }
    }
    const N = 2000;
    const cenario = { semRastro: { 1: 0, 5: 0, 20: 0 }, mascaradoPorLogDeOutraSecao: 0 };
    for (const k of [1, 5, 20]) {
      let detectados = 0;
      for (let i = 0; i < N; i++) {
        const p = structuredClone(urnas[Math.floor(rnd() * urnas.length)]);
        // k votos a mais no BU e no RDV, sem linha no log (o que uma urna sem log publicado faria)
        p.comparecimento += k;
        for (const b of p.bu) { const e = (p.rdv.find((q) => q.c === b.c)?.escolhas) ?? 1; b.comp += k; b.soma += e * k; }
        for (const q of p.rdv) q.registros += q.escolhas * k;
        if (violacoes(p).some((v) => v === 'computadosXcomparecimento' || v.startsWith('conf:'))) detectados++;
      }
      cenario.semRastro[k] = detectados / N;
    }
    // mesmo + um log de outra seção com k votos no pacote, contado sem separar por "Seção Eleitoral" (regra do autor)
    let det = 0;
    for (let i = 0; i < N; i++) {
      const p = structuredClone(urnas[Math.floor(rnd() * urnas.length)]);
      const k = 1 + Math.floor(rnd() * 50);
      p.comparecimento += k;
      for (const b of p.bu) { const e = (p.rdv.find((q) => q.c === b.c)?.escolhas) ?? 1; b.comp += k; b.soma += e * k; }
      for (const q of p.rdv) q.registros += q.escolhas * k;
      p.log.computados += k; p.log.habilitados += k;
      for (const c of Object.keys(p.log.confirmados)) p.log.confirmados[c] += k * ((p.rdv.find((q) => String(q.c) === c)?.escolhas) ?? 1);
      if (violacoes(p).some((v) => v === 'computadosXcomparecimento' || v.startsWith('conf:'))) det++;
    }
    cenario.mascaradoPorLogDeOutraSecao = det / N;
    r[t] = { base: urnas.length, simulacoes: N, deteccao: cenario };
    console.log(`${t}t poder: ${JSON.stringify(r[t])}`);
  }
  return r;
}

// ---- --intrusa: controle do mecanismo. Em todo pacote com 2+ logs, procura no dia uma urna que ligou com uma MV
// diferente da registrada na sua MI ("Serial da MV original … registrada na MI: X" seguido de "Serial da MV: Y", X ≠ Y)
// fora do procedimento de contingência, e cruza com BU − votos do log. ----
async function modoIntrusa() {
  const r = {};
  for (const t of (values.turno ?? ['1', '2']).map(Number)) {
    const lista = await pacotesCandidatos(t, (p) => (p.log?.logs ?? 0) > 1);
    const x = { candidatos: lista.length, erros: [], comIntrusa: [] };
    for (const p of lista) {
      try {
        const pacs = await arquivosDoPacote(t, p);
        const pac = pacs.find((q) => q.hash === p.hash) ?? pacs[0];
        const logs = await lerLogsPacote(path.join(pac.dirHash, acharArquivo(pac.nomes, 'log')));
        const eventos = new Map();
        for (const lg of logs) {
          let original = null;
          let contingencia = false;
          for (const bruta of lg.texto.split('\n')) {
            const col = bruta.replace(/\r$/, '').split('\t');
            if (!col[0]?.startsWith(DIA_VOTACAO[t])) continue;
            const m = col[4] ?? '';
            if (m.startsWith('Urna ligada em')) { original = null; contingencia = false; }
            if (m === 'Início do procedimento de contingência') contingencia = true;
            let y;
            if ((y = /^Serial da MV original da urna que está registrada na MI: (\S+)/.exec(m))) original = y[1];
            else if ((y = /^Serial da MV: (\S+)/.exec(m)) && original && y[1] !== original && !contingencia) {
              eventos.set(`${col[2]}|${col[0]}`, { urna: col[2], hora: col[0].slice(11), mvMI: original, mv: y[1], log: lg.caminho });
            }
            if ((y = /^GAP erro (\d+)/.exec(m))) for (const e of eventos.values()) if (e.urna === col[2] && !e.gap) e.gap = y[1];
          }
        }
        if (eventos.size) x.comIntrusa.push({ secao: `${p.uf}/${p.municipio}/${p.zona}/${p.secao}`, tipoUrna: p.tipoUrna, comp: p.comparecimento, log: p.log.computados, buMenosLog: p.comparecimento - p.log.computados, eventos: [...eventos.values()] });
      } catch (erro) {
        x.erros.push({ secao: `${p.uf}/${p.municipio}/${p.zona}/${p.secao}`, erro: erro.message });
      }
    }
    x.resumo = { pacotes: x.comIntrusa.length, comBUmaiorQueLog: x.comIntrusa.filter((c) => c.buMenosLog > 0).length, comBUigualLog: x.comIntrusa.filter((c) => c.buMenosLog === 0).length };
    r[t] = x;
    console.log(`${t}t: ${lista.length} pacotes com 2+ logs, ${x.erros.length} erros; urna com MV de outra MI em ${JSON.stringify(x.resumo)}`);
  }
  return r;
}

// ---- --extrair: grava cada logd.dat das seções pedidas em texto, para conferência linha a linha ----
async function modoExtrair() {
  const pedidos = values.secao ?? ['1:ba/39934/0183/0175', '1:ba/39934/0183/0181', '1:sp/71072/0002/0035', '1:rs/89036/0083/0044'];
  const dir = path.join(SAIDA, 'vsr');
  await mkdir(dir, { recursive: true });
  const r = [];
  for (const p of pedidos) {
    const [turno, resto] = p.split(':');
    const [uf, municipio, zona, secao] = resto.split('/');
    for (const pac of await arquivosDoPacote(turno, { uf, municipio, zona, secao })) {
      for (const lg of await lerLogsPacote(path.join(pac.dirHash, acharArquivo(pac.nomes, 'log')))) {
        const arq = path.join(dir, `${turno}t-${uf}-${municipio}-${zona}-${secao}-${lg.caminho.replace(/[/\\]/g, '__')}.txt`);
        await writeFile(arq, lg.texto);
        r.push(arq);
      }
    }
  }
  return r;
}

await mkdir(SAIDA, { recursive: true });
const modos = { intrusa: modoIntrusa, extrair: modoExtrair, pacotes: modoPacotes, reconciliar: modoReconciliar, estrangeiro: modoEstrangeiro, interrupcoes: modoInterrupcoes, poder: modoPoder };
for (const [nome, fn] of Object.entries(modos)) {
  if (!values[nome]) continue;
  const res = await fn();
  const arq = path.join(SAIDA, `cetico-vsr-${nome}.json`);
  await writeFile(arq, `${JSON.stringify(res, (k, v) => (v instanceof Set ? [...v] : v), 1)}\n`);
  console.log(`${nome}: ${arq}`);
}
