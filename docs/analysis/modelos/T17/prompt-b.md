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


(Parte B de 2: scripts de autoverificação e de sobreposição de logs. Responda só sobre os scripts anexados.)

===== ARQUIVO: scripts/auditoria/integridade-sobreposicao-bruto.mjs =====
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { hashDiretorio } from '../../src/vsc.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

// Auditor E (integridade nacional), doc 03. Confere no log bruto cada urna que integridade-urnas-reaproveitadas.mjs marcou
// com sobreposição (períodos de log em duas seções que se cruzam). Aquele teste usa a primeira e a última linha de cada
// log, que falham em três situações: o log tem linhas de mais de uma urna (contingência), o mesmo log está copiado em
// dois pacotes (cartão de votação levado para a reserva), e o relógio da urna estava errado até o operador digitar a data.
// Aqui, para cada par de logs da urna em seções diferentes:
//   - descarta as linhas gravadas antes de "Data e hora atualizada" na mesma sessão (relógio ainda não acertado);
//   - na janela de tempo comum às linhas restantes, compara as linhas: se um lado não tem linha na janela, não há escrita
//     simultânea; se um lado não tem linha que o outro não tenha, é cópia; se a urna só aparece em linhas isoladas no meio
//     de outra urna, é corrupção do número; senão, sobreposição real.
// Entrada: <t>t/urnas-reaproveitadas.json (casos com sobrepoe) e os pacotes em data/raw/<t>t/urnas.
// Saída: <t>t/sobreposicao-bruto.json
//
// Uso: node scripts/auditoria/integridade-sobreposicao-bruto.mjs --turno 2 [--dir <pasta do urnas-reaproveitadas.json>]

const ordem = (d) => `${d.slice(6, 10)}${d.slice(3, 5)}${d.slice(0, 2)}${d.slice(11, 19)}`;
const handleEmMemoria = (buffer) => ({
  read: async (destino, deslocamento, tamanho, posicao) => ({ bytesRead: buffer.copy(destino, deslocamento, posicao, posicao + tamanho) }),
  stat: async () => ({ size: buffer.length }),
});
async function textosDeLog(handle, profundidade = 0) {
  const textos = [];
  for (const entrada of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, entrada);
    if (entrada.nome === 'logd.dat') textos.push({ profundidade, texto: dados.toString('latin1') });
    else if (entrada.nome.endsWith('.jez') && profundidade < 3) textos.push(...(await textosDeLog(handleEmMemoria(dados), profundidade + 1)));
  }
  return textos;
}
async function pacotesDaSecao(dir) {
  try {
    const aux = JSON.parse(await readFile(path.join(dir, 'aux.json'), 'utf8'));
    return (aux.hashes ?? []).filter((h) => h.hash && h.hash !== '0' && (h.arq ?? []).some((a) => a.nm)).map((h) => h.hash);
  } catch {
    const ok = [];
    for (const e of await readdir(dir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const v = acharArquivo(await readdir(path.join(dir, e.name)), 'vsc');
      if (v && hashDiretorio(await readFile(path.join(dir, e.name, v))) === e.name) ok.push(e.name);
    }
    return ok;
  }
}

// Linhas da urna num log, sem as gravadas antes do acerto do relógio na mesma sessão; e se elas são todas isoladas.
function linhasDaUrna(texto, urna) {
  const linhas = texto.split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.length > 20).map((l) => ({ l, c: l.split('\t') }));
  const antesDoAcerto = new Set();
  let sessao = [];
  for (let i = 0; i <= linhas.length; i++) {
    const msg = linhas[i]?.c[4];
    if (i === linhas.length || msg === 'Início das operações do logd') sessao = [];
    if (i === linhas.length) break;
    if (msg === 'Data e hora atualizada') for (const j of sessao) antesDoAcerto.add(j);
    sessao.push(i);
  }
  const minhas = [];
  let isoladas = true;
  for (let i = 0; i < linhas.length; i++) {
    if (linhas[i].c[2] !== urna) continue;
    if (linhas[i - 1]?.c[2] === urna || linhas[i + 1]?.c[2] === urna) isoladas = false;
    if (!antesDoAcerto.has(i)) minhas.push(linhas[i].l);
  }
  return { minhas, isoladas, descartadas: [...antesDoAcerto].filter((i) => linhas[i].c[2] === urna).length };
}

async function principal() {
  const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, dir: { type: 'string' } } });
  const turno = Number(values.turno);
  const dir = values.dir ?? path.join(DIR_DADOS, 'parsed', 'auditoria', 'integridade', `${turno}t`);
  const base = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas');
  const reap = JSON.parse(await readFile(path.join(dir, 'urnas-reaproveitadas.json'), 'utf8'));
  const r = { turno, urnasMarcadas: 0, porUrna: {}, pares: {}, casos: [] };
  for (const caso of reap.casos.filter((c) => c.sobrepoe)) {
    r.urnasMarcadas++;
    const urna = String(caso.urna).padStart(8, '0');
    const logs = [];
    for (const s of caso.porSecao) {
      const dirSecao = path.join(base, ...s.k.split('/'));
      for (const h of await pacotesDaSecao(dirSecao)) {
        const nomeLog = acharArquivo(await readdir(path.join(dirSecao, h)), 'log');
        if (!nomeLog) continue;
        for (const t of await textosDeLog(handleEmMemoria(await readFile(path.join(dirSecao, h, nomeLog))))) {
          const x = linhasDaUrna(t.texto, urna);
          if (x.minhas.length || x.descartadas) logs.push({ k: s.k, profundidade: t.profundidade, ...x });
        }
      }
    }
    const pares = [];
    for (let i = 0; i < logs.length; i++) {
      for (let j = i + 1; j < logs.length; j++) {
        const [a, b] = [logs[i], logs[j]];
        if (a.k === b.k || !a.minhas.length || !b.minhas.length) continue;
        const da = a.minhas.map((l) => ordem(l)).sort();
        const db = b.minhas.map((l) => ordem(l)).sort();
        const ini = da[0] > db[0] ? da[0] : db[0];
        const fim = da.at(-1) < db.at(-1) ? da.at(-1) : db.at(-1);
        if (ini > fim) continue;
        const na = (xs) => xs.filter((l) => ordem(l) >= ini && ordem(l) <= fim);
        const [ja, jb] = [na(a.minhas), na(b.minhas)];
        const [sa, sb] = [new Set(ja), new Set(jb)];
        const soA = ja.filter((l) => !sb.has(l)).length;
        const soB = jb.filter((l) => !sa.has(l)).length;
        const tipo = !ja.length || !jb.length ? 'semLinhaNaJanela' : !soA || !soB ? 'copia' : a.isoladas || b.isoladas ? 'linhaIsolada' : 'sobreposicaoReal';
        pares.push({ a: `${a.k} p${a.profundidade}`, b: `${b.k} p${b.profundidade}`, janela: [ini, fim], soA, soB, comuns: ja.length - soA, tipo });
        r.pares[tipo] = (r.pares[tipo] ?? 0) + 1;
      }
    }
    const tem = (t) => pares.some((p) => p.tipo === t);
    const pior = ['sobreposicaoReal', 'linhaIsolada', 'copia', 'semLinhaNaJanela'].find(tem) ?? 'semCruzamento';
    r.porUrna[pior] = (r.porUrna[pior] ?? 0) + 1;
    r.casos.push({ urna, resultado: pior, descartadasAntesDoAcerto: logs.reduce((s, l) => s + l.descartadas, 0), pares });
  }
  await writeFile(path.join(dir, 'sobreposicao-bruto.json'), `${JSON.stringify(r, null, 1)}\n`);
  console.log(JSON.stringify({ ...r, casos: r.casos.filter((c) => c.resultado !== 'copia') }, null, 1));
}

await principal();


===== ARQUIVO: scripts/auditoria/integridade-autoverificacao.mjs =====
import { fork } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { hashDiretorio } from '../../src/vsc.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

// Auditor E (integridade nacional). Autoverificação do software registrada no log da própria urna.
// A cada inicialização a urna confere assinaturas dos pacotes do sistema ("Verificação de assinatura - Etapa [n] -
// [pacote] - [SUCESSO|ERRO]"). Em erro, o aplicativo grava "Erro na verificação de integridade do sistema. Desligue a
// urna e faça uma nova carga." e o detalhe ("Falha ao validar assinatura TSE | pacote: (...) | Erro SAVD: (n - arquivo)").
// Para cada log (inclusive o aninhado da contingência), cada erro vira um evento com: data, pacote, arquivo SAVD,
// se houve nova carga depois ("Urna carregada com sucesso" ou "Código de carga ... gravado"), se a mesma etapa
// passou na inicialização seguinte, e quantos votos foram computados depois do erro até a próxima carga.
// Também conta, por mensagem normalizada, as linhas de nível ERRO que mencionam assinatura/integridade: linhas, seções,
// seções com a mensagem na véspera ou no dia da votação (03, 04, 24 ou 25/10) e até 5 exemplos.
// Atenção: a carga parece reiniciar o log, então um erro seguido de nova carga pode não aparecer no log publicado.
//
// Uso: node scripts/auditoria/integridade-autoverificacao.mjs --turno 2 [--uf sp] [--procs 10]
// Saída: data/parsed/auditoria/integridade/<t>t/autoverificacao.jsonl (eventos) e autoverificacao-resumo.json

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'integridade');
const subdirs = async (dir) => (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
const handleEmMemoria = (buffer) => ({
  read: async (destino, deslocamento, tamanho, posicao) => ({ bytesRead: buffer.copy(destino, deslocamento, posicao, posicao + tamanho) }),
  stat: async () => ({ size: buffer.length }),
});
async function textosDeLog(handle, profundidade = 0) {
  const textos = [];
  for (const entrada of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, entrada);
    if (entrada.nome === 'logd.dat') textos.push({ profundidade, texto: dados.toString('latin1') });
    else if (entrada.nome.endsWith('.jez') && profundidade < 3) textos.push(...(await textosDeLog(handleEmMemoria(dados), profundidade + 1)));
  }
  return textos;
}

// Véspera e dia da votação dos dois turnos.
const VESPERA_OU_DIA = new Set(['03/10/2026', '04/10/2026', '24/10/2026', '25/10/2026']);
const RE_VERIF = /^Verificação de assinatura - Etapa \[(\d+)\] - \[([^\]]+)\] - \[([^\]]+)\]/;
const relevante = (msg) => /assinatura|integridade|SAVD|Assinatura|Integridade/.test(msg);
const normalizar = (msg) => msg.replace(/\d{2}\/\d{2}\/\d{4}/g, 'D').replace(/\[[\d.,:\-/ ]+\]/g, '[#]').replace(/\b[0-9A-F]{8,}\b/g, 'H').replace(/\d+/g, '#');

/** Eventos de autoverificação com erro em um logd.dat. */
export function analisarLog(texto) {
  const linhas = texto.split('\n').map((l) => l.replace(/\r$/, '').split('\t')).filter((c) => c.length >= 5);
  const eventos = [];
  const errosPorMensagem = {};
  for (let i = 0; i < linhas.length; i++) {
    const [dataHora, nivel, urna, app, msg] = linhas[i];
    if (nivel === 'ERRO' && relevante(msg)) {
      const e = (errosPorMensagem[`${app} ${normalizar(msg)}`] ??= { linhas: 0, dias: new Set() });
      e.linhas++;
      e.dias.add(dataHora.slice(0, 10));
    }
    const m = RE_VERIF.exec(msg);
    if (!m || m[3] === 'SUCESSO') continue;
    const [, etapa, pacote, resultado] = m;
    const ev = { dataHora, urna, etapa: Number(etapa), pacote, resultado, detalhe: null, savd: null, novaCarga: null, mesmaEtapaDepois: null, proximaInicializacao: null,
      votosDepoisSemNovaCarga: 0, votosDepoisPorDia: {}, urnaProntaDepoisSemNovaCarga: false };
    for (let j = i + 1; j < Math.min(linhas.length, i + 6); j++) {
      const d = linhas[j][4];
      const s = /pacote: \(([^)]*)\) \| Erro SAVD: \(([^)]*)\)/.exec(d);
      if (s) {
        ev.detalhe = d.slice(0, 300);
        ev.savd = s[2];
        break;
      }
    }
    let ligou = false;
    for (let j = i + 1; j < linhas.length; j++) {
      const [dh, , , , d] = linhas[j];
      if (d.startsWith('Urna ligada em')) {
        ligou = true;
        ev.proximaInicializacao ??= dh;
      }
      if (d.startsWith('Urna carregada com sucesso') || (d.startsWith('Código de carga ') && d.includes('gravado'))) {
        ev.novaCarga = dh;
        break;
      }
      const v = RE_VERIF.exec(d);
      if (ligou && v && v[2] === pacote && ev.mesmaEtapaDepois === null) ev.mesmaEtapaDepois = `${dh} ${v[3]}`;
      if (d === 'Urna pronta para receber votos') ev.urnaProntaDepoisSemNovaCarga = true;
      if (d === 'O voto do eleitor foi computado') {
        ev.votosDepoisSemNovaCarga++;
        ev.votosDepoisPorDia[dh.slice(0, 10)] = (ev.votosDepoisPorDia[dh.slice(0, 10)] ?? 0) + 1;
      }
    }
    eventos.push(ev);
  }
  return { eventos, errosPorMensagem };
}

async function pacotesDaSecao(dir) {
  let aux = null;
  try {
    aux = JSON.parse(await readFile(path.join(dir, 'aux.json'), 'utf8'));
  } catch {
    aux = null;
  }
  if (aux) return (aux.hashes ?? []).filter((h) => h.hash && h.hash !== '0' && (h.arq ?? []).some((a) => a.nm)).map((h) => h.hash);
  const ok = [];
  for (const h of await subdirs(dir)) {
    const nomes = await readdir(path.join(dir, h));
    const v = acharArquivo(nomes, 'vsc');
    if (v && hashDiretorio(await readFile(path.join(dir, h, v))) === h) ok.push(h);
  }
  return ok;
}

async function filho() {
  const turno = Number(process.env.INTEGRIDADE_TURNO);
  const base = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas');
  process.on('message', async ({ uf, municipio, zona }) => {
    const eventos = [];
    const erros = {}; // mensagem → { linhas, secoes, secoesVesperaOuDia, exemplos }
    let logs = 0;
    let falhasLeitura = 0;
    let secoesLidas = 0;
    let secoesSemPacote = 0;
    let pacotes = 0;
    for (const secao of await subdirs(path.join(base, uf, municipio, zona))) {
      const dir = path.join(base, uf, municipio, zona, secao);
      secoesLidas++;
      try {
        const hs = await pacotesDaSecao(dir);
        if (!hs.length) secoesSemPacote++;
        pacotes += hs.length;
        for (const h of hs) {
          const nomes = await readdir(path.join(dir, h));
          const nomeLog = acharArquivo(nomes, 'log');
          if (!nomeLog) continue;
          const textos = await textosDeLog(handleEmMemoria(await readFile(path.join(dir, h, nomeLog))));
          for (const t of textos) {
            logs++;
            const r = analisarLog(t.texto);
            for (const [k, e] of Object.entries(r.errosPorMensagem)) {
              const a = (erros[k] ??= { linhas: 0, secoes: 0, secoesVesperaOuDia: 0, exemplos: [], _vistas: new Set() });
              a.linhas += e.linhas;
              const onde = `${uf}/${municipio}/${zona}/${secao}`;
              if (!a._vistas.has(onde)) {
                a._vistas.add(onde);
                a.secoes++;
                if ([...e.dias].some((d) => VESPERA_OU_DIA.has(d))) a.secoesVesperaOuDia++;
                if (a.exemplos.length < 5) a.exemplos.push(`${onde} ${[...e.dias].sort().join(',')}`);
              }
            }
            for (const ev of r.eventos) eventos.push({ onde: `${uf}/${municipio}/${zona}/${secao}`, hash: h, profundidade: t.profundidade, ...ev });
          }
        }
      } catch (erro) {
        falhasLeitura++;
        eventos.push({ onde: `${uf}/${municipio}/${zona}/${secao}`, erroLeitura: erro.message });
      }
    }
    for (const e of Object.values(erros)) delete e._vistas;
    process.send({ uf, municipio, zona, eventos, erros, logs, falhasLeitura, secoesLidas, secoesSemPacote, pacotes });
  });
  process.send({ pronto: true });
}

async function principal() {
  const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, uf: { type: 'string' }, procs: { type: 'string', default: '10' } } });
  const turno = Number(values.turno);
  const procs = Math.min(10, Math.max(1, Number(values.procs)));
  const base = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas');
  const dirSaida = path.join(SAIDA, `${turno}t`);
  await mkdir(dirSaida, { recursive: true });
  const ufs = values.uf ? values.uf.split(',') : await subdirs(base);
  const fila = [];
  for (const uf of ufs) for (const municipio of await subdirs(path.join(base, uf))) for (const zona of await subdirs(path.join(base, uf, municipio))) fila.push({ uf, municipio, zona });
  const saida = createWriteStream(path.join(dirSaida, 'autoverificacao.jsonl'));
  const resumo = { turno, secoesLidas: 0, secoesSemPacote: 0, pacotes: 0, logs: 0, falhasLeitura: 0, eventos: 0, secoes: new Set(), porPacote: {}, porSavd: {}, porResultado: {}, novaCarga: { sim: 0, nao: 0 },
    mesmaEtapaDepois: {}, comVotosSemNovaCarga: 0, votosSemNovaCarga: 0, votosDepoisNoDia: { '04/10/2026': 0, '25/10/2026': 0 }, eventosVesperaOuDia: 0, porUf: {}, porData: {}, errosPorMensagem: {} };
  const inc = (o, k, n = 1) => {
    o[k] = (o[k] ?? 0) + n;
  };
  const inicio = Date.now();
  await new Promise((resolve) => {
    let ativos = 0;
    for (let i = 0; i < Math.min(procs, fila.length); i++) {
      ativos++;
      const f = fork(import.meta.filename, ['--filho'], { env: { ...process.env, INTEGRIDADE_TURNO: String(turno) } });
      const proximo = () => {
        const u = fila.shift();
        if (u) f.send(u);
        else f.disconnect();
      };
      f.on('message', (m) => {
        if (m.pronto) return proximo();
        resumo.logs += m.logs;
        resumo.secoesLidas += m.secoesLidas;
        resumo.secoesSemPacote += m.secoesSemPacote;
        resumo.pacotes += m.pacotes;
        resumo.falhasLeitura += m.falhasLeitura;
        for (const [k, e] of Object.entries(m.erros)) {
          const a = (resumo.errosPorMensagem[k] ??= { linhas: 0, secoes: 0, secoesVesperaOuDia: 0, exemplos: [] });
          a.linhas += e.linhas;
          a.secoes += e.secoes;
          a.secoesVesperaOuDia += e.secoesVesperaOuDia;
          for (const x of e.exemplos) if (a.exemplos.length < 5) a.exemplos.push(x);
        }
        for (const ev of m.eventos) {
          saida.write(`${JSON.stringify(ev)}\n`);
          if (ev.erroLeitura) continue;
          resumo.eventos++;
          resumo.secoes.add(ev.onde);
          inc(resumo.porPacote, ev.pacote);
          inc(resumo.porSavd, (ev.savd ?? 'sem detalhe').replace(/^\d+ - /, ''));
          inc(resumo.porResultado, ev.resultado);
          resumo.novaCarga[ev.novaCarga ? 'sim' : 'nao']++;
          inc(resumo.mesmaEtapaDepois, ev.mesmaEtapaDepois ? ev.mesmaEtapaDepois.split(' ').at(-1) : 'sem nova verificação');
          if (ev.votosDepoisSemNovaCarga > 0) {
            resumo.comVotosSemNovaCarga++;
            resumo.votosSemNovaCarga += ev.votosDepoisSemNovaCarga;
          }
          for (const d of Object.keys(resumo.votosDepoisNoDia)) resumo.votosDepoisNoDia[d] += ev.votosDepoisPorDia[d] ?? 0;
          if (VESPERA_OU_DIA.has(ev.dataHora.slice(0, 10))) resumo.eventosVesperaOuDia++;
          inc(resumo.porUf, ev.onde.slice(0, 2));
          inc(resumo.porData, ev.dataHora.slice(0, 10));
        }
        proximo();
      });
      f.on('exit', () => {
        if (--ativos === 0) resolve();
      });
    }
  });
  await new Promise((ok) => saida.end(ok));
  const final = { ...resumo, secoes: resumo.secoes.size, segundos: Math.round((Date.now() - inicio) / 1000) };
  await writeFile(path.join(dirSaida, 'autoverificacao-resumo.json'), JSON.stringify(final, null, 1));
  console.log(JSON.stringify({ ...final, errosPorMensagem: Object.keys(final.errosPorMensagem).length }, null, 1));
}

if (process.argv.includes('--filho')) await filho();
else if (import.meta.filename === path.resolve(process.argv[1] ?? '')) await principal();


===== ARQUIVO: scripts/auditoria/integridade-autoverificacao-depois.mjs =====
import { createReadStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';

// Auditor E (integridade nacional), doc 07. O que aconteceu depois de cada "Verificação de assinatura … [ERRO]".
// A carga abre um logd.dat novo e o anterior fica arquivado dentro do pacote (log aninhado), então a nova carga não
// aparece no mesmo log do erro: aparece como um log posterior da MESMA urna, com outro código de carga. Por evento:
//   novaCarga  — há no pacote um log da mesma urna que começa depois do erro, com código de carga diferente;
//   trocaUrna  — o erro está num log aninhado de outra urna que não a do BU, e não houve nova carga dela (contingência);
//   semNovaCarga — o erro está no log da urna do BU e nenhuma carga veio depois.
// Controle: em evento no log principal (profundidade 0), a data da carga do BU não pode ser posterior ao erro.
// Entrada: <t>t/autoverificacao.jsonl (integridade-autoverificacao.mjs) e <uf>.jsonl de integridade-lacres.mjs (<t>t, ou --dir;
// no 1º turno, 1t-identificadores). O evento é casado com o pacote pelo hash do diretório.
// Saída: <t>t/autoverificacao-depois.json
//
// Uso: node scripts/auditoria/integridade-autoverificacao-depois.mjs --turno 2 [--dir <pasta dos <uf>.jsonl>]

const ordem = (d) => `${d.slice(6, 10)}${d.slice(3, 5)}${d.slice(0, 2)}${d.slice(11, 19)}`;
const dataCargaBu = (s) => `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)} ${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}`;
const minutos = (a, b) => {
  const t = (d) => Date.UTC(+d.slice(6, 10), +d.slice(3, 5) - 1, +d.slice(0, 2), +d.slice(11, 13), +d.slice(14, 16), +d.slice(17, 19));
  return Math.round((t(b) - t(a)) / 60000);
};
const interno = (pacote) => !pacote.startsWith('/dsk/fe/');

async function principal() {
  const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, dir: { type: 'string' } } });
  const dir = path.join(DIR_DADOS, 'parsed', 'auditoria', 'integridade', `${values.turno}t`);
  const dirPacotes = values.dir ?? dir;
  const eventos = (await readFile(path.join(dir, 'autoverificacao.jsonl'), 'utf8')).trim().split('\n').map((l) => JSON.parse(l)).filter((e) => !e.erroLeitura);
  const alvo = new Set(eventos.map((e) => `${e.onde} ${e.hash}`));
  const pacotes = new Map();
  for (const uf of [...new Set(eventos.map((e) => e.onde.slice(0, 2)))].sort()) {
    for await (const l of createInterface({ input: createReadStream(path.join(dirPacotes, `${uf}.jsonl`)), crlfDelay: Infinity })) {
      if (!l.includes('"papel":"oficial"')) continue;
      const r = JSON.parse(l);
      const k = `${r.uf}/${r.municipio}/${r.zona}/${r.secao} ${r.hash}`;
      if (alvo.has(k)) pacotes.set(k, r);
    }
  }

  const r = { turno: Number(values.turno), eventos: eventos.length, secoes: new Set(eventos.map((e) => e.onde)).size, semPacote: 0, semLog: 0, casadoSemData: [], controleCargaDepoisDoErroNoMesmoLog: [],
    porDestino: {}, porDestinoEOrigem: {}, porDestinoEVerificacaoSeguinte: {}, novaCargaMinutos: [], semNovaCarga: { eventos: 0, secoes: new Set(), votosPorDia: {} },
    casos: [] };
  const inc = (o, k) => {
    o[k] = (o[k] ?? 0) + 1;
  };
  for (const e of eventos) {
    const p = pacotes.get(`${e.onde} ${e.hash}`);
    if (!p) {
      r.semPacote++;
      continue;
    }
    // O relógio da urna é acertado à mão: um log pode começar numa data e voltar para a anterior (PR 77453/0005/0182).
    // Sem log que cubra a data, vale o único log da mesma urna e profundidade.
    const candidatos = p.logs.filter((l) => l.profundidade === e.profundidade && l.urnas[e.urna]);
    let dono = candidatos.find((l) => ordem(l.primeiraData) <= ordem(e.dataHora) && ordem(e.dataHora) <= ordem(l.ultimaData));
    if (!dono && candidatos.length === 1) {
      dono = candidatos[0];
      r.casadoSemData.push(e.onde);
    }
    if (!dono) {
      r.semLog++;
      continue;
    }
    const urnaDoBu = Number(e.urna) === p.bu?.numeroInternoUrna;
    const recarga = p.logs.filter((l) => l !== dono && l.urnas[e.urna] && l.codigoCarga !== dono.codigoCarga && ordem(l.primeiraData) > ordem(e.dataHora))
      .sort((a, b) => ordem(a.primeiraData).localeCompare(ordem(b.primeiraData)))[0];
    const destino = recarga ? 'novaCarga' : !urnaDoBu && e.profundidade > 0 ? 'trocaUrna' : 'semNovaCarga';
    if (e.profundidade === 0 && urnaDoBu && p.bu?.dataHoraCarga && ordem(dataCargaBu(p.bu.dataHoraCarga)) > ordem(e.dataHora)) r.controleCargaDepoisDoErroNoMesmoLog.push(e.onde);
    const origem = interno(e.pacote) ? 'sistemaInterno' : 'midiaExterna';
    const seguinte = e.mesmaEtapaDepois ? e.mesmaEtapaDepois.split(' ')[2] : 'semNovaVerificacao';
    inc(r.porDestino, destino);
    inc(r.porDestinoEOrigem, `${destino} ${origem}`);
    inc(r.porDestinoEVerificacaoSeguinte, `${destino} ${seguinte}`);
    if (recarga) r.novaCargaMinutos.push(minutos(e.dataHora, recarga.primeiraData));
    if (destino === 'semNovaCarga') {
      r.semNovaCarga.eventos++;
      r.semNovaCarga.secoes.add(e.onde);
    }
    r.casos.push({ onde: e.onde, dataHora: e.dataHora, urna: e.urna, urnaDoBu, tipoUrnaBu: p.bu?.tipoUrna ?? null, profundidade: e.profundidade, pacote: e.pacote, origem,
      savd: e.savd, destino, verificacaoSeguinte: seguinte, novaCargaEm: recarga?.primeiraData ?? null, codigoCargaNovo: recarga?.codigoCarga ?? null,
      votosDepoisPorDia: e.votosDepoisPorDia });
  }
  // Votos no mesmo log depois do erro: uma vez por seção × urna × dia (dois erros no mesmo log contam os mesmos votos).
  const votosPorDia = (casos) => {
    const vistos = new Map();
    for (const c of casos) {
      for (const [dia, n] of Object.entries(c.votosDepoisPorDia)) {
        const k = `${c.onde} ${c.urna} ${dia}`;
        vistos.set(k, Math.max(vistos.get(k) ?? 0, n));
      }
    }
    const porDia = {};
    for (const [k, n] of vistos) {
      const d = (porDia[k.split(' ')[2]] ??= { votos: 0, secoes: new Set() });
      d.votos += n;
      d.secoes.add(k.split(' ')[0]);
    }
    for (const d of Object.values(porDia)) d.secoes = d.secoes.size;
    return porDia;
  };
  const comVoto = r.casos.filter((c) => Object.values(c.votosDepoisPorDia).some((n) => n > 0));
  r.comVotoDepois = { eventos: comVoto.length, secoes: new Set(comVoto.map((c) => c.onde)).size, porDestino: {}, votosPorDia: votosPorDia(comVoto) };
  for (const c of comVoto) inc(r.comVotoDepois.porDestino, c.destino);
  r.semNovaCarga.votosPorDia = votosPorDia(r.casos.filter((x) => x.destino === 'semNovaCarga'));
  r.semNovaCarga.secoes = r.semNovaCarga.secoes.size;
  r.novaCargaMinutos.sort((a, b) => a - b);
  await writeFile(path.join(dir, 'autoverificacao-depois.json'), `${JSON.stringify(r, null, 1)}\n`);
  const { casos, ...resumo } = r;
  console.log(JSON.stringify(resumo, null, 1));
}

await principal();


===== ARQUIVO: docs/analysis/integridade-nacional/07-autoverificacao-no-log.md =====
# Autoverificação do software registrada no log da urna

A cada inicialização, a urna confere as assinaturas dos pacotes do próprio sistema e grava o resultado no log: `Verificação de assinatura - Etapa [n] - [pacote] - [SUCESSO|ERRO]`. É o único rastro público de que o software em execução é o lacrado (risco R5 do [doc 06](06-riscos-fora-da-criptografia.md)). O log é gravado pelo mesmo software que ele descreve. Ainda assim, ele está assinado pela urna, e o lacre foi conferido no [doc 02](02-lacres-h04-2turno.md).

Comandos:

- `node scripts/auditoria/integridade-autoverificacao.mjs --turno 2 --procs 8` (17 min, 512.173 logs) → `data/parsed/auditoria/integridade/2t/autoverificacao.jsonl` (um evento por erro) e `autoverificacao-resumo.json`.
- `node scripts/auditoria/integridade-autoverificacao-depois.mjs --turno 2` (5 s; lê também os `<uf>.jsonl` do doc 02) → `autoverificacao-depois.json`: o que veio depois de cada erro (nova carga, troca de urna ou votação sem nova carga).

**Universo:** todos os logs dos pacotes oficiais do 2º turno. São 499.207 seções; com os logs aninhados, 512.173 logs, e 0 ilegível. O log é cumulativo desde a carga, então os eventos do 1º turno e da preparação aparecem se a urna não foi recarregada.

**Fato:** a carga abre um log novo, e o log anterior fica arquivado no pacote como log aninhado, com o código de carga antigo. Por isso a nova carga nunca aparece no mesmo log do erro (`novaCarga` = 0 no resumo do primeiro script). Ela aparece como um log posterior da mesma urna, com outro código de carga. Log aninhado, portanto, é de dois tipos: a mesma urna antes de uma recarga, ou a urna original trocada numa contingência. Controle: em nenhum evento do log principal a carga registrada no BU é posterior ao erro.

## Resultado

- **Fato:** 181 eventos `Verificação de assinatura … [ERRO]` em 162 seções, entre 18/09 e 25/10/2026. Nenhum outro resultado além de SUCESSO e ERRO. 41 eventos são da véspera ou do dia de votação (03, 04, 24 ou 25/10).
- **Fato, por onde está o pacote:**

  | Pacote | Eventos | Depois do erro, na inicialização seguinte |
  |---|---|---|
  | Mídia externa (`/dsk/fe/…`: `infomidia.vsc`, `<seção>-lo.vsc`) | 129 | mesma etapa com SUCESSO em 98; ERRO de novo em 9 (todos na preparação, 20 a 29/09); sem nova verificação em 22 |
  | Sistema interno (`/boot`, `/lib`, `/bin`, `/uenux`, `/share`, `/etc`, `/dsk/fi`) | 52, em 46 seções | SUCESSO em 40; ERRO de novo em 1 (PI 10529/0021/0070, SUCESSO na terceira tentativa, 04/10 10:19); sem nova verificação em 11 |

- **Fato, o que veio depois do erro** (`autoverificacao-depois.json`):

  | Depois do erro | Eventos | Mídia externa | Sistema interno | Votos no mesmo log depois do erro |
  |---|---|---|---|---|
  | Nova carga da mesma urna (log arquivado, código de carga novo) | 36 | 31 | 5 | nenhum |
  | Troca de urna (erro no log aninhado de outra urna, urna reserva no BU) | 17 | 2 | 15 | em 10 eventos, antes da troca |
  | Sem nova carga (erro no log da urna do BU) | 128, em 125 seções | 96 | 32 | em todos os 128 |

  - As 36 novas cargas foram todas na preparação, entre 20 e 30/09, de 1 a 111 minutos depois do erro (mediana: 8). Em 27 delas a urna nem chegou a refazer a verificação antes de ser recarregada.
  - Correção: uma versão anterior deste doc dizia que os 33 eventos sem nova verificação eram todos urnas trocadas por contingência. São 27 recargas da mesma urna e 6 trocas.
  - Duas seções (GO 92215/0141/0178 e PR 77453/0005/0182) têm o erro datado antes da primeira linha do log. O relógio foi acertado à mão: o log do PR começa em 23/09 e volta para 22/09. O evento foi atribuído ao único log daquela urna no pacote.
- **Fato:** 138 eventos (134 seções) têm votos no mesmo log depois do erro: os 128 sem nova carga e 10 de urnas que votaram e só depois foram trocadas.
  - Contando uma vez cada seção × urna × dia: 24.422 votos em 103 seções no 1º turno (04/10) e 31.892 votos em 127 seções no 2º turno (25/10).
  - Correção: a versão anterior deste doc trazia 23.627 (100 seções) e 31.075 (124 seções), números que nenhum script do repo reproduz.
  - Esses votos estão nos BUs assinados dessas seções, que passam em todas as conferências do doc 02.
- **Fato:** a mensagem que acompanha o erro do sistema interno manda "Desligue a urna e faça uma nova carga" (155 linhas, 138 seções). No log publicado, o que se vê depois é: urna desligada pela chave, religada (nos 16 eventos internos da véspera ou do dia, de 2 a 14 minutos depois), mesma etapa com SUCESSO e votação normal.
  - Exemplo: SP 71072/0353/0853, `/lib/avlib.vst`, erro SAVD `5 - /lib/libQt6Gui.so.6`, às 07:35:08 de 04/10. SUCESSO às 07:39:15, urna pronta às 08:00:02.
  - Exemplo: SP 71072/0246/0151, `/boot/boot/avboot.vst`, `5 - /boot/boot/uenux`, às 10:25:46 de 24/10. SUCESSO às 10:29:21.
- **Fato:** o erro informa o arquivo que falhou (`Erro SAVD: (código - arquivo)`).
  - Códigos vistos: 0, 2 e 5.
  - Arquivos: `/boot/boot/uenux` 8, `libQt6Gui.so.6` 7, `/uenux/bin/atue` 4, `/uenux/bin/red` 2, `libapiio_resources.so` 2, `libecourna.so` 2, `/etc/avetc.vst` 2, e outros com 1. Na mídia externa, `infomidia.vsc` 107. Lista completa em `porSavd`.

### Outras mensagens de erro de assinatura (nível ERRO), por seção

| Mensagem (resumida) | Seções | Na véspera ou no dia |
|---|---|---|
| `Erro verificando assinatura do arquivo turno#.jez em /dsk/mr/turno#.vsc. … insira uma nova mídia de resultado` | 207 | 6 |
| `Validando assinaturas … Erro na verificação de integridade do sistema. Desligue a urna e faça uma nova carga` | 138 | 21 |
| `ATUE MSD com problema ao assinar` | 58 | 1 |
| `Validando assinaturas da MV … substitua a mídia de votação` | 30 | 4 |
| `Validando assinaturas … Se o erro persistir, substitua a urna` | 25 | 20 |
| `Erro na verificação de assinatura do arquivo - vota.vsu` | 25 | 24 |
| `VOTA … Erro ao inicializar assinatura` | 18 | 17 |
| `… eg.vsu` / `uenux.vsu` / `rdv.vsu` / `ze.vsu` / `bu.vsu` | 13 / 8 / 4 / 2 / 1 | 2 / 6 / 4 / 2 / 1 |
| `Falha na validação de assinatura do aplicativo de verificação da entidade fiscalizadora` | 7 | 0 |
| `Erro verificando assinatura do arquivo /uenux/bin/vota.of` (nova carga / substituição) | 5 / 2 | 5 / 2 |
| `Erro na validação de assinatura dos dados de fotos de candidatos` (nova carga / substituição) | 5 / 3 | 2 / 3 |
| Outras 9 mensagens | 1 a 3 cada | — |

A lista completa, com contagem de linhas e 5 exemplos de seção por mensagem, está em `autoverificacao-resumo.json` → `errosPorMensagem`.

## 1º turno

Comandos: `node scripts/auditoria/integridade-autoverificacao.mjs --turno 1 --procs 8` (7 min) e `node scripts/auditoria/integridade-autoverificacao-depois.mjs --turno 1 --dir data/parsed/auditoria/integridade/1t-identificadores` → `data/parsed/auditoria/integridade/1t/`.

**Universo:** 499.248 seções lidas; 41 sem pacote (exterior, não instaladas); 499.207 pacotes, 507.327 logs, 0 ilegível.

- **Fato:** 146 eventos `Verificação de assinatura … [ERRO]` em 128 seções, 22 deles na véspera ou no dia (03 e 04/10). Nenhum outro resultado além de SUCESSO e ERRO.
- **Fato, o que veio depois do erro:**

  | Depois do erro | Eventos | Mídia externa | Sistema interno |
  |---|---|---|---|
  | Nova carga da mesma urna | 36 | 31 | 5 |
  | Troca de urna | 11 | 1 | 10 |
  | Sem nova carga | 99, em 97 seções | 80 | 19 |

  - As 36 novas cargas são as mesmas do 2º turno: preparação, 20 a 30/09, de 1 a 111 minutos depois do erro (mediana: 8).
- **Fato:** 106 eventos (103 seções) têm votos depois do erro: 24.422 votos em 04/10. É o mesmo número medido pelos pacotes do 2º turno, que guardam o histórico do 1º. As duas varreduras conferem entre si.

## Leitura (premissa 8)

- A autoverificação é controle técnico com rastro. Ela acusou o erro, e em 53 eventos a urna foi recarregada (36) ou trocada (17).
- **Risco:** em 138 eventos, a urna votou depois de acusar falha de assinatura, sem a nova carga que a própria mensagem pede. Em 32 deles o erro foi no sistema interno, justamente o caso em que a mensagem manda "faça uma nova carga". O único controle depois do erro é a verificação seguinte, feita pelo mesmo software.
  - **Hipótese benigna, não testável com os arquivos públicos:** erro de leitura passageiro da memória (o código SAVD 5 aponta um arquivo).
  - Os arquivos não distinguem isso de um arquivo que mudou e voltou ao original.
- **Não é prova de fraude** (princípio 4). Os BUs dessas seções estão assinados e conferidos, e os totais conferem com o oficial (H03, outra frente).
- **Recomendação:** pedir ao TSE o significado dos códigos SAVD (0, 2, 5) e a regra de procedimento para esse erro. Comparar os resultados dessas seções com as vizinhas (estatístico).

## Pendente

- Nenhum item de varredura. Falta só a resposta do TSE sobre os códigos SAVD (Recomendação acima).

