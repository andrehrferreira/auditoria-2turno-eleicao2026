// Matemático forense, fechamento da H17 (a): atendimentos sem nenhum desfecho anotado no diário (logd.dat), no país
// inteiro e nos dois turnos, com o padrão de mensagens de cada um.
//
// Atendimento e desfecho seguem exatamente a máquina de estados do pré-registro do estatístico
// (docs/analysis/estatistico-eleitoral/09-h15-h17-mesa.md; função lerDia de estatistico-h15-h17-varrer.mjs):
//   - abre em "Identificador do eleitor digitado pelo mesário"; fecha no próximo identificador, em "Aguardando digitação
//     do identificador do eleitor", em "Inicio do Encerramento", no voto computado ou no "já votou";
//   - desfecho (prioridade): voto > jaVotou > suspensoSemVoto > cancelada > recusa > semDesfecho;
//   - consultas (atendimentos entre dois votos com 3+ "já votou") ficam fora, como lá.
// O que este script acrescenta: para cada atendimento "semDesfecho", a classe do que aconteceu dentro dele (regras
// fixas abaixo, escritas antes da contagem) e o padrão de mensagens (dígitos longos trocados por #), e se o
// atendimento seguinte é um voto em até 180 s (retomada provável, mesmo critério dos "perdidos" do estatístico).
//
// Classes do atendimento sem desfecho (a primeira que valer):
//   habilitadoComCargo   "Eleitor foi habilitado" e ao menos um "Voto confirmado para [...]", sem voto computado
//   habilitadoSemCargo   "Eleitor foi habilitado", nenhum cargo confirmado
//   identificadorInvalido "Identificador do eleitor digitado inválido" (erro de digitação do título)
//   justificativa        "Justificativa recebida" (eleitor de outra seção justificou a ausência; não vota ali)
//   digitalSemHabilitacao identificador aceito, digital pedida ou capturada, sem habilitação nem cancelamento
//   fotoSemDigital       identificador aceito, foto apresentada, sem pedido de digital
//   identificadorSemMais identificador aceito ("Identificador digitado pelo mesário foi: ..."), nada depois
//   outro                o resto (padrões listados na saída)
// Fecho do atendimento: novoIdentificador | aguardando | encerramento | fimDoDia.
//
// Universo:
//   --turno 2: todos os pacotes do 2º turno com BU (situacao completa), dia 25/10. O mesmo log traz o dia 04/10 quando a
//              urna é a mesma; ele é processado com as regras do estatístico (só se a urna declarou a mesma seção) para
//              reproduzir o número já publicado (8.681.853).
//   --turno 1: todos os pacotes do 1º turno com BU, dia 04/10 (universo completo do 1º turno, com as urnas trocadas).
// Privacidade: nenhuma sequência de 5+ dígitos sai (títulos viram #); a saída passa por uma trava de 10+ dígitos.
// Uso: node scripts/auditoria/matematico-fechamento-h17-varrer.mjs --turno 2 [--uf ac,al] [--paralelo 2]
// Saída: data/parsed/auditoria/matematico-forense/fechamento/h17-<t>t/<uf>.json
import { fork } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerLogs } from '../../src/perfil-secoes.js';

export const DIR_F = path.join(DIR_DADOS, 'parsed', 'auditoria', 'matematico-forense', 'fechamento');
const DIAS = { 2: '25/10/2026', 1: '04/10/2026' };
const D = { voto: 'voto', ja: 'jaVotou', susp: 'suspensoSemVoto', canc: 'cancelada', rec: 'recusa', nada: 'semDesfecho' };
const seg = (s) => Number(s.slice(0, 2)) * 3600 + Number(s.slice(3, 5)) * 60 + Number(s.slice(6, 8));
const TRAVA = /\d{10,}/;
// mensagens que entram no padrão (atendimento); linhas de inicialização da urna viram um só "[reinício]"
const RELEVANTE = /Identificador|Foto do eleitor|digital|habilita|Habilita|[Ee]leitor|Voto confirmado|chave|Votação suspensa|Ano de nascimento|Dado digitado|justific|Justific|cancel|suspen|Tecla|Mesário|Inicio do Encerramento/;
const REINICIO = /^Urna ligada em|^Iniciando aplicação/;

export const CLASSES = ['habilitadoComCargo', 'habilitadoSemCargo', 'identificadorInvalido', 'justificativa', 'digitalSemHabilitacao', 'fotoSemDigital', 'identificadorSemMais', 'outro'];

/** Lê um dia: mesma máquina de estados de lerDia (estatístico), guardando as mensagens de cada atendimento. */
export function lerDiaPadroes(texto, dia) {
  const sessoes = [];
  let votos = 0;
  const ident = {};
  let s = null;
  let tAnt = -1;
  const fechar = (t, como) => {
    if (!s) return;
    s.tf = t;
    s.fecho = como;
    s.d = s.voto ? D.voto : s.ja ? D.ja : s.suspSem ? D.susp : s.canc ? D.canc : s.rec ? D.rec : D.nada;
    if (s.d !== D.nada) s.msgs = null;
    sessoes.push(s);
    s = null;
  };
  for (const linha of texto.split('\n')) {
    if (!linha.startsWith(dia)) continue;
    const msg = linha.split('\t')[4] ?? '';
    const t = seg(linha.slice(11, 19));
    tAnt = t;
    if (msg === 'Identificador do eleitor digitado pelo mesário') {
      fechar(t, 'novoIdentificador');
      s = { t0: t, tf: t, voto: false, ja: false, suspSem: false, canc: false, rec: false, cons: false, msgs: [] };
      continue;
    }
    if (msg === 'Aguardando digitação do identificador do eleitor') { fechar(t, 'aguardando'); continue; }
    if (msg.startsWith('Inicio do Encerramento')) { fechar(t, 'encerramento'); continue; }
    if (msg.startsWith('Município: ') || msg.startsWith('Zona Eleitoral: ') || msg.startsWith('Seção Eleitoral: ')) {
      const [campo, valor] = msg.split(': ');
      ident[{ 'Município': 'municipio', 'Zona Eleitoral': 'zona', 'Seção Eleitoral': 'secao' }[campo]] ??= valor.trim();
    }
    if (msg === 'Eleitor foi suspenso e não confirmou nenhum voto') { if (s) s.suspSem = true; }
    if (!s) { if (msg === 'O voto do eleitor foi computado') votos++; continue; }
    if (s.msgs) {
      if (REINICIO.test(msg)) { if (s.msgs.at(-1) !== '[reinício]') s.msgs.push('[reinício]'); }
      else if (RELEVANTE.test(msg)) {
        const m = msg.replace(/\d{5,}/g, '#');
        if (s.msgs.at(-1) !== m) s.msgs.push(m);
      }
    }
    if (msg === 'O voto do eleitor foi computado') { s.voto = true; votos++; fechar(t, 'voto'); }
    else if (msg === 'O eleitor identificado já votou') { s.ja = true; fechar(t, 'jaVotou'); }
    else if (msg.startsWith('Habilitação cancelada') || msg === 'Mesário cancelou entrada dos dados') s.canc = true;
    else if (msg === 'Eleitor não encontrado para o identificador informado' || msg.startsWith('Eleitor impedido')
      || msg === 'Eleitor já justificou' || msg === 'Ano de nascimento digitado é diferente do cadastro' || msg === 'Ano de nascimento inválido') s.rec = true;
  }
  fechar(tAnt, 'fimDoDia');
  return { sessoes, votos, ident };
}

/** Consultas: atendimentos entre dois votos quando há 3 ou mais "já votou" entre eles (igual ao estatístico). */
function marcarConsultas(sessoes) {
  let ini = 0;
  let ja = 0;
  const fecharBloco = (fim) => { if (ja >= 3) for (let i = ini; i < fim; i++) if (sessoes[i].d !== D.voto) sessoes[i].cons = true; };
  for (let i = 0; i < sessoes.length; i++) {
    if (sessoes[i].d === D.voto) { fecharBloco(i); ini = i + 1; ja = 0; } else if (sessoes[i].d === D.ja) ja++;
  }
  fecharBloco(sessoes.length);
}

export function classe(msgs) {
  const tem = (re) => msgs.some((m) => re.test(m));
  const hab = tem(/^Eleitor foi habilitado$/);
  if (hab) return tem(/^Voto confirmado para \[/) ? 'habilitadoComCargo' : 'habilitadoSemCargo';
  if (tem(/^Identificador do eleitor digitado inválido$/)) return 'identificadorInvalido';
  if (tem(/^Justificativa recebida/)) return 'justificativa';
  const ok = tem(/^Identificador digitado pelo mesário foi/);
  if (ok && tem(/^Solicita digital|^Capturada a digital/)) return 'digitalSemHabilitacao';
  if (ok && tem(/^Foto do eleitor apresentada$/)) return 'fotoSemDigital';
  if (ok && msgs.every((m) => /^Identificador/.test(m))) return 'identificadorSemMais';
  return 'outro';
}

const novo = () => ({ secoesDia: 0, semVoto: 0, ses: 0, cons: 0, nada: 0, porDesfecho: {}, porClasse: {}, porClasseFecho: {}, porClasseRetomada: {}, padroes: {}, secoesComNada: 0, maxNadaSecao: null });
const inc = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };

function acumular(A, sessoes, k) {
  marcarConsultas(sessoes);
  A.secoesDia++;
  let nadaSec = 0, sesSec = 0;
  for (let i = 0; i < sessoes.length; i++) {
    const x = sessoes[i];
    if (x.cons) { A.cons++; continue; }
    A.ses++; sesSec++;
    inc(A.porDesfecho, x.d);
    if (x.d !== D.nada) continue;
    A.nada++; nadaSec++;
    const c = classe(x.msgs);
    inc(A.porClasse, c);
    inc(A.porClasseFecho, `${c}|${x.fecho}`);
    const prox = sessoes[i + 1];
    if (prox && prox.d === D.voto && prox.t0 >= x.tf && prox.t0 - x.tf <= 180) inc(A.porClasseRetomada, c);
    const p = `${c} :: ${x.msgs.join(' > ')}`.slice(0, 300);
    inc(A.padroes, p);
  }
  if (nadaSec) A.secoesComNada++;
  if (!A.maxNadaSecao || nadaSec > A.maxNadaSecao.nada) A.maxNadaSecao = { k, nada: nadaSec, ses: sesSec };
}

async function varrerUf(uf, turno) {
  const { db } = await abrirLeitura();
  const secoes = db.prepare(`SELECT municipio, zona, secao, hash FROM secao WHERE turno = ? AND uf = ? AND situacao = 'completa' ORDER BY municipio, zona, secao`).all(turno, uf);
  db.close();
  const base = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', uf);
  const R = { uf, turno, pacotes: secoes.length, erros: [], dia: novo(), dia1tNoLog2t: turno === 2 ? novo() : undefined };
  for (const s of secoes) {
    const k = `${uf}/${s.municipio}/${s.zona}/${s.secao}`;
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
      const { texto } = await lerLogs(path.join(dir, nomeLog), s.secao);
      const d = lerDiaPadroes(texto, DIAS[turno]);
      if (!d.votos) R.dia.semVoto++; else acumular(R.dia, d.sessoes, k);
      if (turno === 2 && (texto.includes(`\n${DIAS[1]}`) || texto.startsWith(DIAS[1]))) {
        const d1 = lerDiaPadroes(texto, DIAS[1]);
        const id = d1.ident;
        const mesma = id.municipio == null || id.zona == null || id.secao == null ? null
          : Number(id.municipio) === Number(s.municipio) && Number(id.zona) === Number(s.zona) && Number(id.secao) === Number(s.secao);
        if (d1.votos && mesma !== false) acumular(R.dia1tNoLog2t, d1.sessoes, k);
      }
    } catch (erro) {
      R.erros.push({ k, erro: erro.message.replace(/\d{10,}/g, '#') });
    }
  }
  const json = JSON.stringify(R);
  if (TRAVA.test(json)) throw new Error('trava: sequência de 10+ dígitos na saída');
  const dir = path.join(DIR_F, `h17-${turno}t`);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${uf}.json`), json);
  return { uf, pacotes: secoes.length, erros: R.erros.length };
}

async function principal() {
  const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, uf: { type: 'string' }, paralelo: { type: 'string', default: '2' }, refazer: { type: 'boolean' }, filho: { type: 'boolean' } } });
  const turno = Number(values.turno);
  const ufs = values.uf ? values.uf.split(',') : UFS;
  const pronto = (uf) => existsSync(path.join(DIR_F, `h17-${turno}t`, `${uf}.json`));
  if (values.filho) { process.send(await varrerUf(ufs[0], turno)); return; }
  const ordem = ['sp', 'mg', 'rj', 'ba', 'rs', 'pr', 'pe', 'ce', 'pa', 'ma', 'sc', 'go', 'pb', 'es', 'pi', 'am', 'rn', 'al', 'mt', 'ms', 'df', 'se', 'ro', 'to', 'ac', 'ap', 'rr', 'zz'];
  const fila = ufs.sort((a, b) => ordem.indexOf(a) - ordem.indexOf(b)).filter((uf) => values.refazer || !pronto(uf));
  const rodar = async () => {
    for (let uf = fila.shift(); uf; uf = fila.shift()) {
      const ini = Date.now();
      const r = await new Promise((resolve) => {
        const filho = fork(import.meta.filename, ['--filho', '--uf', uf, '--turno', String(turno)], { execArgv: ['--max-old-space-size=4096'] });
        let res = null;
        filho.on('message', (m) => { res = m; });
        filho.on('exit', (c) => resolve(res ?? { uf, erro: `código ${c}` }));
      });
      console.log(`${turno}t ${uf}: ${r.erro ?? `${r.pacotes} pacotes, ${r.erros} erro(s)`} (${((Date.now() - ini) / 1000).toFixed(0)} s)`);
    }
  };
  await Promise.all(Array.from({ length: Number(values.paralelo) }, rodar));
}

if (import.meta.filename === path.resolve(process.argv[1] ?? '')) await principal();
