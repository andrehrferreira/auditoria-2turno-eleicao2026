// Estatístico eleitoral, doc 08: desempenho do leitor de digital por seção e turno (H05, falha do leitor × reclassificação).
// Por seção, para o dia de votação de cada turno, conta os atendimentos que terminam em voto:
//   - classe: biometria ([biométrica]), manual (Dado digitado confere: digital pedida e não reconhecida; "por biografia" no BU),
//     ano de nascimento (eleitor sem biometria na urna; "sem biometria" no BU), outra;
//   - tentativas de digital (maior n de "Solicita digital. Tentativa [n] de [m]") dos reconhecidos, por n = 1..4, e dos manuais.
// Fonte: o pacote do 2º turno (o log é cumulativo e traz o dia do 1º turno quando a urna é a mesma). Se o dia do 1º turno
// lido ali não bate com o BU do 1º turno (votos e as três categorias), lê o pacote do 1º turno. Linhas de outra seção
// declarada no log (urna reserva que serviu outra seção) saem pelo filtro de lerLogs.
// Exterior (zz) fica de fora: o BU de lá não traz as categorias e o teste do H05 não o usa (doc 06).
// Títulos de mesário e de eleitor não são lidos nem gravados: só contagens.
//
// Uso: node scripts/auditoria/estatistico-h05-leitor-varrer.mjs [--uf pr,sp] [--paralelo 3] [--refazer]
// Saída: data/parsed/auditoria/estatistico-eleitoral/leitor/<uf>.jsonl (+ <uf>.ok, <uf>.erros.jsonl). Retomável por UF.
import { fork } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerLogs } from '../../src/perfil-secoes.js';

const DIR = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico-eleitoral', 'leitor');
const DIA = { 1: '04/10/2026', 2: '25/10/2026' };
const RE_TENT = /^Solicita digital\. Tentativa \[(\d+)\] de \[(\d+)\]/;

const novoDia = () => ({ votos: 0, bio: 0, man: 0, anb: 0, outra: 0, suc: [0, 0, 0, 0, 0], sucMais: 0, bioSemPedido: 0, manTent: [0, 0, 0, 0, 0], manMais: 0, deM: 0 });
const novoCiclo = () => ({ bio: false, anb: false, dp: false, tent: 0 });

/** Medidas dos dois dias de votação num texto de log já juntado. Devolve { 1: dia, 2: dia } (null se o dia não aparece). */
export function medirDias(texto) {
  const out = { 1: null, 2: null };
  const ciclos = { 1: novoCiclo(), 2: novoCiclo() };
  for (const linha of texto.split('\n')) {
    const t = linha.startsWith(DIA[2]) ? 2 : linha.startsWith(DIA[1]) ? 1 : 0;
    if (!t) continue;
    const p = linha.split('\t');
    const msg = p[4] ?? '';
    const d = (out[t] ??= novoDia());
    let c = ciclos[t];
    if (msg === 'Aguardando digitação do identificador do eleitor') ciclos[t] = novoCiclo();
    else if (msg.startsWith('Solicita digital. Tentativa')) {
      const m = RE_TENT.exec(msg);
      if (m) { c.tent = Math.max(c.tent, Number(m[1])); d.deM = Math.max(d.deM, Number(m[2])); }
    } else if (msg.includes('Tipo de habilitação do eleitor [biométrica]')) c.bio = true;
    else if (msg.startsWith('Ano de nascimento digitado é igual ao do cadastro')) c.anb = true;
    else if (msg === 'Dado digitado confere') c.dp = true;
    else if (msg === 'O voto do eleitor foi computado') {
      d.votos++;
      if (c.bio) {
        d.bio++;
        if (c.tent === 0) d.bioSemPedido++;
        else if (c.tent <= 4) d.suc[c.tent]++;
        else d.sucMais++;
      } else if (c.anb) d.anb++;
      else if (c.dp) {
        d.man++;
        if (c.tent <= 4) d.manTent[c.tent]++; else d.manMais++;
      } else d.outra++;
      ciclos[t] = novoCiclo();
    }
  }
  return out;
}

const bate = (d, s) => d != null && s != null && d.votos === s.c && d.bio === s.pb && d.man === s.pg && d.anb === s.sb;

async function dirPacote(turno, uf, s) {
  const dirSecao = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', uf, s.municipio, s.zona, s.secao);
  let dir = path.join(dirSecao, s.hash);
  if (!existsSync(dir)) {
    const subs = (await readdir(dirSecao, { withFileTypes: true })).filter((e) => e.isDirectory());
    if (subs.length !== 1) throw new Error(`${turno}º turno: diretório do hash ausente (${subs.length} pacotes)`);
    dir = path.join(dirSecao, subs[0].name);
  }
  const nome = acharArquivo(await readdir(dir), 'log');
  if (!nome) throw new Error(`${turno}º turno: pacote sem log`);
  return path.join(dir, nome);
}

async function varrerUf(uf) {
  const { db } = await abrirLeitura();
  const q = db.prepare(`SELECT municipio, zona, secao, hash, comparecimento c, sem_biometria sb, por_biometria pb, por_biografia pg,
      numero_interno_urna urna, tipo_urna tipo FROM secao WHERE turno = ? AND uf = ? AND situacao = 'completa' ORDER BY municipio, zona, secao`);
  const s2 = q.all(2, uf);
  const s1 = new Map(q.all(1, uf).map((r) => [`${r.municipio}|${r.zona}|${r.secao}`, r]));
  db.close();
  const linhas = [];
  const erros = [];
  for (const s of s2) {
    const k = `${s.municipio}|${s.zona}|${s.secao}`;
    try {
      const um = s1.get(k);
      const { texto } = await lerLogs(await dirPacote(2, uf, s), s.secao);
      const dias = medirDias(texto);
      let d1 = dias[1], fonte1 = '2t';
      if (um && !bate(d1, um)) {
        const { texto: t1 } = await lerLogs(await dirPacote(1, uf, um), um.secao);
        d1 = medirDias(t1)[1];
        fonte1 = '1t';
      }
      linhas.push(JSON.stringify({ uf, municipio: s.municipio, zona: s.zona, secao: s.secao, urna1: um?.urna ?? null, urna2: s.urna,
        tipo1: um?.tipo ?? null, tipo2: s.tipo, fonte1, bate1: bate(d1, um), bate2: bate(dias[2], s), d1, d2: dias[2] }));
    } catch (erro) {
      erros.push(JSON.stringify({ uf, municipio: s.municipio, zona: s.zona, secao: s.secao, erro: erro.message }));
    }
  }
  await mkdir(DIR, { recursive: true });
  await writeFile(path.join(DIR, `${uf}.jsonl`), linhas.length ? `${linhas.join('\n')}\n` : '');
  await writeFile(path.join(DIR, `${uf}.erros.jsonl`), erros.length ? `${erros.join('\n')}\n` : '');
  await writeFile(path.join(DIR, `${uf}.ok`), new Date().toISOString());
  return { uf, secoes: linhas.length, erros: erros.length };
}

async function principal() {
  const { values } = parseArgs({ options: { uf: { type: 'string' }, paralelo: { type: 'string', default: '3' }, refazer: { type: 'boolean' }, filho: { type: 'boolean' } } });
  const ufs = (values.uf ? values.uf.split(',') : UFS).filter((uf) => uf !== 'zz');
  if (values.filho) { process.send(await varrerUf(ufs[0])); return; }
  const ordem = ['sp', 'mg', 'rj', 'ba', 'rs', 'pr', 'pe', 'ce', 'pa', 'ma', 'sc', 'go', 'pb', 'es', 'pi', 'am', 'rn', 'al', 'mt', 'ms', 'df', 'se', 'ro', 'to', 'ac', 'ap', 'rr'];
  const fila = ufs.sort((a, b) => ordem.indexOf(a) - ordem.indexOf(b)).filter((uf) => values.refazer || !existsSync(path.join(DIR, `${uf}.ok`)));
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
