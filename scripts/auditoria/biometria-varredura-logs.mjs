// Varredura dos logs de urna do 2º turno para os testes do Auditor B (biometria e mesários, H05/B1/B1b/A11/A13).
// Por seção, para o dia do 2º turno (25/10) e, do mesmo log cumulativo, para o dia do 1º turno (04/10):
//   - rajadas de "O eleitor identificado já votou" sem voto computado entre elas (caso ES 57037/0055/0364):
//     tamanho, identificador digitado, outras recusas dentro da rajada e como foi habilitado o eleitor seguinte;
//   - classe de habilitação de cada voto (biometria, ano de nascimento sem biometria cadastrada, liberação manual
//     com mesário identificado, liberação manual sem associação nominal), como no doc 06;
//   - liberações manuais por mesário (pseudônimo), na última hora e em janelas de 10 min;
//   - registro de mesários (pseudônimo) para cruzar seções (A13).
// O título do mesário nunca é gravado: vira pseudônimo HMAC-SHA256 com chave local aleatória (fora do git).
// Uso: node scripts/auditoria/biometria-varredura-logs.mjs [--uf ac,al] [--paralelo 4] [--refazer]
// Saída: data/parsed/auditoria/biometria/varredura/<uf>.jsonl (+ <uf>.ok, <uf>.erros.jsonl)
import { fork } from 'node:child_process';
import { createHmac, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { parseArgs } from 'node:util';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerLogs } from '../../src/perfil-secoes.js';

const DIR_SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'biometria');
const DIR_VARREDURA = path.join(DIR_SAIDA, 'varredura');
const ARQ_CHAVE = path.join(DIR_SAIDA, '.chave-pseudonimo');
const DIAS = { d2: '25/10/2026', d1: '04/10/2026' };
const FAIXAS_RAJADA = [[1, '1'], [2, '2'], [3, '3'], [4, '4'], [9, '5-9'], [19, '10-19'], [49, '20-49'], [Infinity, '50+']];
const faixaRajada = (n) => FAIXAS_RAJADA.find(([max]) => n <= max)[1];

const segundos = (hhmmss) => {
  const [h, m, s] = hhmmss.split(':').map(Number);
  return h * 3600 + m * 60 + s;
};
const hhmm = (t) => (t == null ? null : `${String(Math.floor(t / 3600)).padStart(2, '0')}:${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);

/** Maior número de eventos (tempos em ordem) dentro de qualquer janela de `janela` segundos. */
function maiorJanela(tempos, janela = 600) {
  let maior = 0;
  for (let i = 0, j = 0; i < tempos.length; i++) {
    while (tempos[i] - tempos[j] > janela) j++;
    maior = Math.max(maior, i - j + 1);
  }
  return maior;
}

/** Métricas de um dia do log. `pseudo` converte título de mesário em pseudônimo. */
export function analisarDia(texto, dia, pseudo) {
  const r = {
    votos: 0, classes: { biometria: 0, anoNascimento: 0, manualMesario: 0, manualSemMesario: 0, outra: 0 },
    jaVotou: 0, jaVotouLogoAposVoto: 0, rajadas: {}, proximoPorFaixa: {}, maiorRajada: 0, maiorRajadaDetalhe: null, rajadasGrandes: [],
    urnaPronta: null, inicioEncerramento: null, ultimoVoto: null, identificacao: {},
    solicitaDigital: 0, fotoApresentada: 0, habilitacaoCancelada: 0,
    mesarios: { registrados: [], liberacoes: {}, liberacaoPorNaoRegistrado: 0 },
    manualUltimaHora: 0, anoNascimentoUltimaHora: 0, votosUltimaHora: 0, maiorRajadaManual10min: 0, maiorRajadaSemBiometria10min: 0,
  };
  const novoCiclo = () => ({ biometria: false, anoNascimento: false, dadoPessoal: false, mesario: null, digitalAvulsa: false, inicio: null });
  let ciclo = novoCiclo();
  let ultimoTipoId = null;
  let ultimoVotoT = null;
  let rajada = null;
  const registrados = new Set();
  const manuais = []; // { t, mesario }
  const semBio = []; // tempos de anoNascimento + manuais
  const votosT = [];
  const anoNascT = [];

  const fecharRajada = (proximo, t) => {
    if (!rajada) return;
    const f = faixaRajada(rajada.n);
    r.rajadas[f] = (r.rajadas[f] ?? 0) + 1;
    const pf = (r.proximoPorFaixa[f] ??= {});
    pf[proximo] = (pf[proximo] ?? 0) + 1;
    const det = { n: rajada.n, inicio: hhmm(rajada.inicio), fim: hhmm(rajada.fim), titulo: rajada.titulo, cpf: rajada.cpf, outrasRecusas: rajada.outras, proximo, segundosAteProximoVoto: t == null ? null : t - rajada.fim };
    if (rajada.n > r.maiorRajada) { r.maiorRajada = rajada.n; r.maiorRajadaDetalhe = det; }
    if (rajada.n >= 5) r.rajadasGrandes.push(det);
    rajada = null;
  };

  for (const linha of texto.split('\n')) {
    if (!linha.startsWith(dia)) continue;
    const partes = linha.split('\t');
    const mensagem = partes[4] ?? '';
    const t = segundos(partes[0].slice(11, 19));

    if (mensagem === 'Aguardando digitação do identificador do eleitor') {
      ciclo = novoCiclo();
    } else if (mensagem.startsWith('Identificador digitado pelo mesário foi: ')) {
      ultimoTipoId = mensagem.includes('CPF') ? 'cpf' : mensagem.includes('Título') ? 'titulo' : 'outro';
      ciclo.inicio ??= t;
    } else if (mensagem === 'O voto do eleitor foi computado') {
      r.votos++;
      votosT.push(t);
      ultimoVotoT = t;
      let classe;
      if (ciclo.biometria) classe = 'biometria';
      else if (ciclo.anoNascimento) classe = 'anoNascimento';
      else if (ciclo.dadoPessoal) classe = ciclo.mesario ? 'manualMesario' : 'manualSemMesario';
      else classe = 'outra';
      r.classes[classe]++;
      if (classe === 'anoNascimento') { anoNascT.push(t); semBio.push(t); }
      if (classe === 'manualMesario' || classe === 'manualSemMesario') {
        manuais.push({ t, mesario: ciclo.mesario });
        semBio.push(t);
      }
      fecharRajada(classe, t);
      ciclo = novoCiclo();
    } else if (mensagem === 'O eleitor identificado já votou') {
      r.jaVotou++;
      if (!rajada && ultimoVotoT !== null && t - ultimoVotoT <= 60) r.jaVotouLogoAposVoto++;
      rajada ??= { n: 0, inicio: t, fim: t, titulo: 0, cpf: 0, outras: 0 };
      rajada.n++;
      rajada.fim = t;
      if (ultimoTipoId === 'titulo') rajada.titulo++;
      else if (ultimoTipoId === 'cpf') rajada.cpf++;
    } else if (mensagem === 'Eleitor não encontrado para o identificador informado' || mensagem.startsWith('Eleitor impedido')
      || mensagem === 'Ano de nascimento digitado é diferente do cadastro' || mensagem === 'Eleitor já justificou') {
      if (rajada) rajada.outras++;
    } else if (mensagem.startsWith('Habilitação cancelada')) {
      r.habilitacaoCancelada++;
      if (rajada) rajada.outras++;
    } else if (mensagem.includes('Tipo de habilitação do eleitor [biométrica]')) {
      ciclo.biometria = true;
    } else if (mensagem.startsWith('Ano de nascimento digitado é igual ao do cadastro')) {
      ciclo.anoNascimento = true;
    } else if (mensagem === 'Dado digitado confere') {
      ciclo.dadoPessoal = true;
    } else if (mensagem.startsWith('Solicita digital. Tentativa')) {
      r.solicitaDigital++;
    } else if (mensagem === 'Foto do eleitor apresentada') {
      r.fotoApresentada++;
    } else if (mensagem.startsWith('Urna pronta para receber votos')) {
      r.urnaPronta ??= t;
    } else if (mensagem.startsWith('Inicio do Encerramento')) {
      r.inicioEncerramento = t;
    } else if (mensagem.startsWith('Município: ') || mensagem.startsWith('Zona Eleitoral: ') || mensagem.startsWith('Seção Eleitoral: ')) {
      // Identificação gravada na inicialização do dia: confere se o log daquele dia é da mesma seção
      const [campo, valor] = mensagem.split(': ');
      r.identificacao[{ 'Município': 'municipio', 'Zona Eleitoral': 'zona', 'Seção Eleitoral': 'secao' }[campo]] ??= valor.trim();
    } else {
      let m = /^Mesário (\d+) habilitou o eleitor/.exec(mensagem);
      if (m) ciclo.mesario = pseudo(m[1]);
      else if ((m = /^Mesário (\d+) registrado/.exec(mensagem))) registrados.add(pseudo(m[1]));
    }
  }
  fecharRajada('semVotoDepois', null);

  r.ultimoVoto = ultimoVotoT;
  r.mesarios.registrados = [...registrados];
  const fim = r.inicioEncerramento ?? r.ultimoVoto;
  const porMesario = new Map();
  for (const { t, mesario } of manuais) {
    if (fim !== null && t >= fim - 3600) r.manualUltimaHora++;
    if (!mesario) continue;
    if (!porMesario.has(mesario)) porMesario.set(mesario, []);
    porMesario.get(mesario).push(t);
    if (!registrados.has(mesario)) r.mesarios.liberacaoPorNaoRegistrado++;
  }
  for (const [mesario, tempos] of porMesario) {
    r.mesarios.liberacoes[mesario] = {
      total: tempos.length,
      ultimaHora: fim === null ? 0 : tempos.filter((t) => t >= fim - 3600).length,
      maior10min: maiorJanela(tempos),
    };
  }
  if (fim !== null) {
    r.anoNascimentoUltimaHora = anoNascT.filter((t) => t >= fim - 3600).length;
    r.votosUltimaHora = votosT.filter((t) => t >= fim - 3600).length;
  }
  r.maiorRajadaManual10min = maiorJanela(manuais.map((x) => x.t));
  r.maiorRajadaSemBiometria10min = maiorJanela(semBio);
  r.urnaPronta = hhmm(r.urnaPronta);
  r.inicioEncerramento = hhmm(r.inicioEncerramento);
  r.ultimoVoto = hhmm(r.ultimoVoto);
  return r;
}

async function chavePseudonimo() {
  await mkdir(DIR_SAIDA, { recursive: true });
  if (!existsSync(ARQ_CHAVE)) await writeFile(ARQ_CHAVE, randomBytes(32).toString('hex'));
  const chave = (await readFile(ARQ_CHAVE, 'utf8')).trim();
  const cache = new Map();
  return (titulo) => {
    let p = cache.get(titulo);
    if (!p) {
      p = `M${createHmac('sha256', chave).update(titulo).digest('hex').slice(0, 10)}`;
      cache.set(titulo, p);
    }
    return p;
  };
}

async function varrerUf(uf) {
  const pseudo = await chavePseudonimo();
  const { db } = await abrirLeitura();
  const secoes = db.prepare(`SELECT municipio, zona, secao, hash, modelo_urna, tipo_urna FROM secao
    WHERE turno = 2 AND uf = ? AND situacao = 'completa' ORDER BY municipio, zona, secao`).all(uf);
  db.close();
  const linhas = [];
  const erros = [];
  const base = path.join(DIR_DADOS, 'raw', '2t', 'urnas', uf);
  for (const s of secoes) {
    try {
      const dirSecao = path.join(base, s.municipio, s.zona, s.secao);
      let dir = path.join(dirSecao, s.hash);
      if (!existsSync(dir)) {
        const subs = (await readdir(dirSecao, { withFileTypes: true })).filter((e) => e.isDirectory());
        if (subs.length !== 1) throw new Error(`diretório do hash ausente (${subs.length} pacotes)`);
        dir = path.join(dirSecao, subs[0].name);
      }
      const nomeLog = acharArquivo(await readdir(dir), 'log');
      if (!nomeLog) throw new Error('pacote sem log');
      const { texto, quantidade } = await lerLogs(path.join(dir, nomeLog));
      const modeloLog = /Identificação do Modelo de Urna: (\S+)/.exec(texto)?.[1] ?? null;
      const d2 = analisarDia(texto, DIAS.d2, pseudo);
      const d1 = texto.includes(`\n${DIAS.d1}`) || texto.startsWith(DIAS.d1) ? analisarDia(texto, DIAS.d1, pseudo) : null;
      for (const d of [d1, d2]) {
        if (!d) continue;
        const id = d.identificacao;
        d.mesmaSecao = id.municipio == null || id.zona == null || id.secao == null ? null
          : Number(id.municipio) === Number(s.municipio) && Number(id.zona) === Number(s.zona) && Number(id.secao) === Number(s.secao);
      }
      linhas.push(JSON.stringify({ uf, municipio: s.municipio, zona: s.zona, secao: s.secao, modelo: s.modelo_urna, modeloLog, tipoUrna: s.tipo_urna, logs: quantidade, d2, d1: d1?.votos ? d1 : null }));
    } catch (erro) {
      erros.push(JSON.stringify({ uf, municipio: s.municipio, zona: s.zona, secao: s.secao, erro: erro.message }));
    }
  }
  await mkdir(DIR_VARREDURA, { recursive: true });
  await writeFile(path.join(DIR_VARREDURA, `${uf}.jsonl`), linhas.length ? `${linhas.join('\n')}\n` : '');
  await writeFile(path.join(DIR_VARREDURA, `${uf}.erros.jsonl`), erros.length ? `${erros.join('\n')}\n` : '');
  await writeFile(path.join(DIR_VARREDURA, `${uf}.ok`), new Date().toISOString());
  return { uf, secoes: linhas.length, erros: erros.length };
}

async function principal() {
  const { values } = parseArgs({ options: { uf: { type: 'string' }, paralelo: { type: 'string', default: '4' }, refazer: { type: 'boolean' }, filho: { type: 'boolean' } } });
  const ufs = values.uf ? values.uf.split(',') : UFS;
  if (values.filho) {
    // Outra instância pode ter terminado esta UF enquanto esta esperava na fila
    if (!values.refazer && existsSync(path.join(DIR_VARREDURA, `${ufs[0]}.ok`))) { process.send({ uf: ufs[0], secoes: 0, erros: 0, jaFeita: true }); return; }
    process.send(await varrerUf(ufs[0]));
    return;
  }
  await chavePseudonimo(); // cria a chave antes dos filhos, para não haver corrida
  // Maiores primeiro, para equilibrar os processos
  const ordem = ['sp', 'mg', 'rj', 'ba', 'rs', 'pr', 'pe', 'ce', 'pa', 'ma', 'sc', 'go', 'pb', 'es', 'pi', 'am', 'rn', 'al', 'mt', 'ms', 'df', 'se', 'ro', 'to', 'ac', 'ap', 'rr', 'zz'];
  const fila = ufs.sort((a, b) => ordem.indexOf(a) - ordem.indexOf(b)).filter((uf) => values.refazer || !existsSync(path.join(DIR_VARREDURA, `${uf}.ok`)));
  const rodar = async () => {
    for (let uf = fila.shift(); uf; uf = fila.shift()) {
      const inicio = Date.now();
      const r = await new Promise((resolve) => {
        const filho = fork(import.meta.filename, ['--filho', '--uf', uf], { execArgv: ['--max-old-space-size=4096'] });
        let resultado = null;
        filho.on('message', (m) => { resultado = m; });
        filho.on('exit', (codigo) => resolve(resultado ?? { uf, erro: `código ${codigo}` }));
      });
      console.log(`${uf}: ${r.erro ?? `${r.secoes} seções, ${r.erros} erro(s)`} (${((Date.now() - inicio) / 1000).toFixed(0)} s)`);
    }
  };
  await Promise.all(Array.from({ length: Number(values.paralelo) }, rodar));
}

if (import.meta.filename === path.resolve(process.argv[1] ?? '')) await principal();
