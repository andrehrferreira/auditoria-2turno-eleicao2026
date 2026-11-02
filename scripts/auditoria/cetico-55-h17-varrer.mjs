// Parecer cético 55, H17 (a): reprodução independente da contagem de atendimentos sem desfecho no 2º turno e do teto
// do doc 14 do matemático, mais as medidas de poder que o doc não fez. Código próprio; não importa os scripts do autor.
//
// Definições (as do doc 09 do estatístico e do doc 14, reescritas aqui):
//   - só linhas do dia 25/10/2026 do diário (logd.dat) do pacote que gerou o BU;
//   - atendimento abre em "Identificador do eleitor digitado pelo mesário" e fecha no próximo identificador, em
//     "Aguardando digitação do identificador do eleitor", em "Inicio do Encerramento", no voto computado, no "já votou"
//     ou no fim do dia;
//   - desfecho por prioridade: voto > já votou > suspenso sem voto > cancelada > recusa > sem desfecho;
//   - consulta: atendimentos que não são voto entre dois votos, quando há 3+ "já votou" entre eles (ficam fora).
// O que este script acrescenta (medidas de poder do desconto "seguido de voto em até 180 s"):
//   - taxa de base: fração de TODOS os atendimentos (por desfecho) cujo atendimento seguinte é voto que começa até
//     180 s depois do fim do atendimento — o mesmo critério do autor, aplicado a quem não é suspeito;
//   - duração do atendimento sem desfecho (do identificador ao fecho) e intervalo até o próximo identificador;
//   - recusas por tipo (ano de nascimento diferente, eleitor não encontrado, impedido, já justificou);
//   - "já votou" fora de consulta.
// Privacidade: só contagens agregadas; trava contra 10+ dígitos na saída.
// Uso: node scripts/auditoria/cetico-55-h17-varrer.mjs [--uf sp,mg] [--paralelo 3]
// Saída: data/parsed/auditoria/cetico-revisor/55/h17-2t/<uf>.json
import { fork } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerLogs } from '../../src/perfil-secoes.js';

const DIR = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '55', 'h17-2t');
const DIA = '25/10/2026';
const hms = (s) => +s.slice(0, 2) * 3600 + +s.slice(3, 5) * 60 + +s.slice(6, 8);
const RECUSAS = {
  'Eleitor não encontrado para o identificador informado': 'naoEncontrado',
  'Eleitor já justificou': 'jaJustificou',
  'Ano de nascimento digitado é diferente do cadastro': 'anoDiferente',
  'Ano de nascimento inválido': 'anoInvalido',
};

function atendimentos(texto) {
  const lista = [];
  let a = null;
  let ultimo = 0;
  const fecha = (t, modo) => {
    if (!a) return;
    a.fim = t; a.modo = modo;
    a.desf = a.voto ? 'voto' : a.ja ? 'jaVotou' : a.susp ? 'suspensoSemVoto' : a.canc ? 'cancelada' : a.rec ? 'recusa' : 'semDesfecho';
    lista.push(a); a = null;
  };
  for (const linha of texto.split('\n')) {
    if (!linha.startsWith(DIA)) continue;
    const campos = linha.split('\t');
    const msg = campos[4] ?? '';
    const t = hms(linha.slice(11, 19));
    ultimo = t;
    if (msg === 'Identificador do eleitor digitado pelo mesário') {
      fecha(t, 'novo');
      a = { ini: t, voto: false, ja: false, susp: false, canc: false, rec: null, hab: false, cargo: false, inval: false, justif: false, aceito: false, digital: false, foto: false };
      continue;
    }
    if (msg === 'Aguardando digitação do identificador do eleitor') { fecha(t, 'aguardando'); continue; }
    if (msg.startsWith('Inicio do Encerramento')) { fecha(t, 'encerramento'); continue; }
    if (!a) continue;
    if (msg === 'Eleitor foi suspenso e não confirmou nenhum voto') a.susp = true;
    if (msg === 'O voto do eleitor foi computado') { a.voto = true; fecha(t, 'voto'); continue; }
    if (msg === 'O eleitor identificado já votou') { a.ja = true; fecha(t, 'jaVotou'); continue; }
    if (msg.startsWith('Habilitação cancelada') || msg === 'Mesário cancelou entrada dos dados') a.canc = true;
    else if (RECUSAS[msg]) a.rec ??= RECUSAS[msg];
    else if (msg.startsWith('Eleitor impedido')) a.rec ??= 'impedido';
    if (msg === 'Eleitor foi habilitado') a.hab = true;
    else if (msg.startsWith('Voto confirmado para [')) a.cargo = true;
    else if (msg === 'Identificador do eleitor digitado inválido') a.inval = true;
    else if (msg.startsWith('Justificativa recebida')) a.justif = true;
    else if (msg.startsWith('Identificador digitado pelo mesário foi')) a.aceito = true;
    else if (msg.startsWith('Solicita digital') || msg.startsWith('Capturada a digital')) a.digital = true;
    else if (msg === 'Foto do eleitor apresentada') a.foto = true;
  }
  fecha(ultimo, 'fimDoDia');
  // consultas
  let ini = 0, ja = 0;
  const marca = (fim) => { if (ja >= 3) for (let i = ini; i < fim; i++) if (lista[i].desf !== 'voto') lista[i].consulta = true; };
  for (let i = 0; i < lista.length; i++) {
    if (lista[i].desf === 'voto') { marca(i); ini = i + 1; ja = 0; } else if (lista[i].desf === 'jaVotou') ja++;
  }
  marca(lista.length);
  return { lista };
}

const grupo = (a) => {
  if (a.hab) return 'habilitado';
  if (a.inval) return 'identificadorInvalido';
  if (a.justif) return 'justificativa';
  return 'identificadorAceitoOuOutro'; // identificador aceito sem habilitação (com ou sem digital/foto) e o resto
};
const faixa = (s) => (s == null ? 'semProximo' : s <= 15 ? '00-15s' : s <= 30 ? '16-30s' : s <= 60 ? '31-60s' : s <= 180 ? '61-180s' : '181s+');
const inc = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };

function acumula(R, lista) {
  const validos = lista.filter((x) => !x.consulta);
  R.consultas += lista.length - validos.length;
  let nadaSec = 0;
  for (let i = 0; i < validos.length; i++) {
    const a = validos[i];
    const p = validos[i + 1];
    // o "seguinte" do autor é o seguinte na lista sem consultas? O autor usa a lista com consultas (índice i+1 da lista
    // completa). Aqui medimos os dois para ver se muda.
    R.atend++;
    inc(R.porDesfecho, a.desf);
    const retomada = !!(p && p.desf === 'voto' && p.ini >= a.fim && p.ini - a.fim <= 180);
    if (retomada) inc(R.seguidoDeVoto180PorDesfecho, a.desf);
    if (a.desf === 'recusa') inc(R.recusaPorTipo, a.rec);
    if (a.desf !== 'semDesfecho') continue;
    nadaSec++;
    const g = grupo(a);
    inc(R.semDesfechoPorGrupo, g);
    if (retomada) inc(R.semDesfechoSeguidoDeVoto180, g);
    inc(R.semDesfechoFecho, `${g}|${a.modo}`);
    // tempo do identificador do atendimento sem desfecho até o próximo identificador (redigitação rápida = correção)
    const ate = p ? p.ini - a.ini : null;
    inc(R.semDesfechoAteProximoIdent, `${g}|${faixa(ate)}|${p ? (p.desf === 'voto' ? 'voto' : 'outro') : '-'}`);
    if (g === 'identificadorAceitoOuOutro') {
      const sub = a.digital ? 'digital' : a.foto ? 'foto' : a.aceito ? 'aceitoSemMais' : 'outro';
      inc(R.aceitoSub, sub);
    }
  }
  // mesma conta do autor: seguinte na lista completa (com consultas)
  for (let i = 0; i < lista.length; i++) {
    const a = lista[i];
    if (a.consulta) continue;
    const p = lista[i + 1];
    const ret = !!(p && p.desf === 'voto' && p.ini >= a.fim && p.ini - a.fim <= 180);
    if (ret) inc(R.seguidoDeVoto180ListaCompleta, a.desf === 'semDesfecho' ? `semDesfecho|${grupo(a)}` : a.desf);
  }
  if (nadaSec) R.secoesComSemDesfecho++;
}

async function varrerUf(uf) {
  const { db } = await abrirLeitura();
  const secoes = db.prepare(`SELECT municipio, zona, secao, hash FROM secao WHERE turno = 2 AND uf = ? AND situacao = 'completa'`).all(uf);
  db.close();
  const base = path.join(DIR_DADOS, 'raw', '2t', 'urnas', uf);
  const R = { uf, pacotes: secoes.length, erros: 0, semLog: 0, semVotoNoDia: 0, secoesDia: 0, consultas: 0, atend: 0, secoesComSemDesfecho: 0,
    porDesfecho: {}, seguidoDeVoto180PorDesfecho: {}, seguidoDeVoto180ListaCompleta: {}, recusaPorTipo: {}, semDesfechoPorGrupo: {}, semDesfechoSeguidoDeVoto180: {},
    semDesfechoFecho: {}, semDesfechoAteProximoIdent: {}, aceitoSub: {} };
  for (const s of secoes) {
    try {
      const dirSecao = path.join(base, s.municipio, s.zona, s.secao);
      let dir = path.join(dirSecao, s.hash);
      if (!existsSync(dir)) {
        const subs = (await readdir(dirSecao, { withFileTypes: true })).filter((e) => e.isDirectory());
        if (subs.length !== 1) throw new Error('pacote ambíguo');
        dir = path.join(dirSecao, subs[0].name);
      }
      const nome = acharArquivo(await readdir(dir), 'log');
      if (!nome) { R.semLog++; continue; }
      const { texto } = await lerLogs(path.join(dir, nome), s.secao);
      const { lista } = atendimentos(texto);
      if (!lista.some((x) => x.desf === 'voto')) { R.semVotoNoDia++; continue; }
      R.secoesDia++;
      acumula(R, lista);
    } catch {
      R.erros++;
    }
  }
  const json = JSON.stringify(R);
  if (/\d{10,}/.test(json)) throw new Error('trava de dígitos');
  await mkdir(DIR, { recursive: true });
  await writeFile(path.join(DIR, `${uf}.json`), json);
  return { uf, pacotes: R.pacotes, erros: R.erros };
}

const { values } = parseArgs({ options: { uf: { type: 'string' }, paralelo: { type: 'string', default: '3' }, filho: { type: 'boolean' } } });
if (values.filho) {
  process.send(await varrerUf(values.uf));
} else {
  const ordem = ['sp', 'mg', 'rj', 'ba', 'rs', 'pr', 'pe', 'ce', 'pa', 'ma', 'sc', 'go', 'pb', 'es', 'pi', 'am', 'rn', 'al', 'mt', 'ms', 'df', 'se', 'ro', 'to', 'ac', 'ap', 'rr', 'zz'];
  const fila = (values.uf ? values.uf.split(',') : [...UFS]).sort((a, b) => ordem.indexOf(a) - ordem.indexOf(b)).filter((u) => values.uf || !existsSync(path.join(DIR, `${u}.json`)));
  const trabalhador = async () => {
    for (let uf = fila.shift(); uf; uf = fila.shift()) {
      const t = Date.now();
      const r = await new Promise((ok) => {
        const f = fork(import.meta.filename, ['--filho', '--uf', uf], { execArgv: ['--max-old-space-size=4096'] });
        let m = null;
        f.on('message', (x) => { m = x; });
        f.on('exit', (c) => ok(m ?? { uf, erro: `saída ${c}` }));
      });
      console.log(`${uf}: ${r.erro ?? `${r.pacotes} pacotes, ${r.erros} erros`} (${Math.round((Date.now() - t) / 1000)} s)`);
    }
  };
  await Promise.all(Array.from({ length: +values.paralelo }, trabalhador));
}
