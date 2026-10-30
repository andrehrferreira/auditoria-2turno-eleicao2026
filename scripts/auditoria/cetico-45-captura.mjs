// Cético, parecer 45 (H19): a "falha" de digital (4 tentativas sem reconhecimento) teve captura de verdade?
// O leitor (estatistico-h05-leitor-varrer.mjs) conta só o maior n de "Solicita digital. Tentativa [n] de [m]". Uma tentativa
// pode terminar em "Capturada a digital" (o dedo foi lido e não bateu) ou em "Timeout de reconhecimento do dedo" (nenhum dedo
// foi posto no tempo). Uma falha com 4 timeouts é uma liberação manual sem nenhuma digital capturada.
// Por seção e turno (dia da votação), ciclo de eleitor que termina em voto:
//   - biometria, ano de nascimento, falha (Dado digitado confere);
//   - nas falhas: capturas reais (0 a 4), timeouts (0 a 4), e quem autorizou: mesário identificado ("Mesário … habilitou"),
//     digital nova não associada ("vai salvar a digital em novo arquivo"), digital já gravada não associada ("bate com uma digital
//     gravada"), outra;
//   - nos reconhecidos: quantos tiveram algum timeout (linha de base).
// Fonte: igual ao leitor: pacote do 2º turno (log cumulativo); se o 1º turno lido ali não bate com o BU do 1º turno, pacote do 1º.
// Exterior fora. Só contagens: nenhum título é lido ou gravado.
// Uso: node scripts/auditoria/cetico-45-captura.mjs [--uf sp,mg] [--paralelo 2] [--refazer]
// Saída: data/parsed/auditoria/cetico/45/captura/<uf>.jsonl (+ .ok, .erros.jsonl). Retomável por UF.
import { fork } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerLogs } from '../../src/perfil-secoes.js';

const DIR = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', '45', 'captura');
const DIA = { 1: '04/10/2026', 2: '25/10/2026' };

const novoDia = () => ({ votos: 0, bio: 0, anb: 0, F: 0, outra: 0, Fcap: [0, 0, 0, 0, 0, 0], Ftmo: [0, 0, 0, 0, 0, 0], Fmes: 0, Fnova: 0, Fgravada: 0, Foutra: 0, bioTmo: 0, F0cap: { mes: 0, nova: 0, gravada: 0, outra: 0 } });
const novoCiclo = () => ({ bio: false, anb: false, dado: false, cap: 0, tmo: 0, mes: false, nova: false, gravada: false });

/** Medidas dos dois dias de votação num texto de log já juntado. */
export function medirDias(texto) {
  const out = { 1: null, 2: null };
  const cic = { 1: novoCiclo(), 2: novoCiclo() };
  for (const linha of texto.split('\n')) {
    const t = linha.startsWith(DIA[2]) ? 2 : linha.startsWith(DIA[1]) ? 1 : 0;
    if (!t) continue;
    const p = linha.split('\t');
    const msg = (p[4] ?? '').replace(/\r$/, '');
    const d = (out[t] ??= novoDia());
    const c = cic[t];
    if (msg === 'Aguardando digitação do identificador do eleitor') cic[t] = novoCiclo();
    else if (msg.startsWith('Capturada a digital. Tentativa')) c.cap++;
    else if (msg.startsWith('Timeout de reconhecimento do dedo')) c.tmo++;
    else if (msg.includes('Tipo de habilitação do eleitor [biométrica]')) c.bio = true;
    else if (msg.startsWith('Ano de nascimento digitado é igual ao do cadastro')) c.anb = true;
    else if (msg === 'Dado digitado confere') c.dado = true;
    else if (/^Mesário \d+ habilitou o eleitor/.test(msg)) c.mes = true;
    else if (msg.startsWith('Não encontrou digital coletada')) c.nova = true;
    else if (msg.startsWith('Digital coletada bate com uma digital gravada')) c.gravada = true;
    else if (msg === 'O voto do eleitor foi computado') {
      d.votos++;
      if (c.bio) { d.bio++; if (c.tmo) d.bioTmo++; }
      else if (c.anb) d.anb++;
      else if (c.dado) {
        d.F++;
        d.Fcap[Math.min(c.cap, 5)]++;
        d.Ftmo[Math.min(c.tmo, 5)]++;
        const via = c.mes ? 'mes' : c.gravada ? 'gravada' : c.nova ? 'nova' : 'outra';
        d[`F${via}`]++;
        if (c.cap === 0) d.F0cap[via]++;
      } else d.outra++;
      cic[t] = novoCiclo();
    }
  }
  return out;
}

const bate = (d, s) => d != null && s != null && d.votos === s.c && d.bio === s.pb && d.F === s.pg && d.anb === s.sb;

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
  const q = db.prepare(`SELECT municipio, zona, secao, hash, comparecimento c, sem_biometria sb, por_biometria pb, por_biografia pg
      FROM secao WHERE turno = ? AND uf = ? AND situacao = 'completa' ORDER BY municipio, zona, secao`);
  const s2 = q.all(2, uf);
  const s1 = new Map(q.all(1, uf).map((r) => [`${r.municipio}|${r.zona}|${r.secao}`, r]));
  db.close();
  const linhas = [], erros = [];
  for (const s of s2) {
    try {
      const um = s1.get(`${s.municipio}|${s.zona}|${s.secao}`);
      const { texto } = await lerLogs(await dirPacote(2, uf, s), s.secao);
      const dias = medirDias(texto);
      let d1 = dias[1];
      if (um && !bate(d1, um)) d1 = medirDias((await lerLogs(await dirPacote(1, uf, um), um.secao)).texto)[1];
      linhas.push(JSON.stringify({ id: `${uf}/${s.municipio}/${s.zona}/${s.secao}`, bate1: bate(d1, um), bate2: bate(dias[2], s), d1, d2: dias[2] }));
    } catch (erro) {
      erros.push(JSON.stringify({ id: `${uf}/${s.municipio}/${s.zona}/${s.secao}`, erro: erro.message }));
    }
  }
  await mkdir(DIR, { recursive: true });
  await writeFile(path.join(DIR, `${uf}.jsonl`), linhas.length ? `${linhas.join('\n')}\n` : '');
  await writeFile(path.join(DIR, `${uf}.erros.jsonl`), erros.length ? `${erros.join('\n')}\n` : '');
  await writeFile(path.join(DIR, `${uf}.ok`), new Date().toISOString());
  return { uf, secoes: linhas.length, erros: erros.length };
}

async function principal() {
  const { values } = parseArgs({ options: { uf: { type: 'string' }, paralelo: { type: 'string', default: '2' }, refazer: { type: 'boolean' }, filho: { type: 'boolean' } } });
  const ufs = (values.uf ? values.uf.split(',') : UFS).filter((uf) => uf !== 'zz');
  if (values.filho) { process.send(await varrerUf(ufs[0])); return; }
  const ordem = ['sp', 'mg', 'rj', 'es', 'ba', 'rs', 'pr', 'pe', 'ce', 'pa', 'ma', 'sc', 'go', 'pb', 'pi', 'am', 'rn', 'al', 'mt', 'ms', 'df', 'se', 'ro', 'to', 'ac', 'ap', 'rr'];
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
