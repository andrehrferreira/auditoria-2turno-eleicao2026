// Revisor cético, parecer 25 (votos do BU sem rastro no log, H03/H08): contagem independente no universo completo.
//
// Por que existe: três agentes contaram "votos sem log" com definições diferentes (auditor A/cético 08, matemático,
// engenheiro). Este script reconta do zero, com código próprio, todas as seções completas dos dois turnos, e separa as
// três definições:
//   D1  BU − votos "O voto do eleitor foi computado" no log da PRÓPRIA seção (linhas idênticas contadas uma vez;
//       votos de log que declara outra "Seção Eleitoral" ficam à parte).
//   D2  dos votos de D1, quantos podem vir de um ciclo interrompido que já tinha "Eleitor foi habilitado" e
//       "Voto confirmado para [Presidente]" (o último cargo da urna nos dois turnos) e não chegou a "computado".
//   D3  D1 − D2: votos sem ciclo de habilitação nenhum no log publicado.
//
// Leitura: a lista de seções e o caminho do pacote vêm do banco (cópia de leitura): data/raw/<t>t/urnas/<uf>/<mun>/
// <zona>/<secao>/<hash>/. Abre o *-log.jez, desce nos .jez aninhados (até 3 níveis) e lê cada logd.dat na ordem do
// arquivo, sem reordenar por hora. Cópias do mesmo log (MI/ME) não dobram: "computado" e "habilitado" contam pela
// linha inteira (data, urna, mensagem e hash de encadeamento), e um ciclo só é interrompido se não terminou em
// "computado" em nenhuma cópia. Seção declarada = última "Seção Eleitoral: NNNN" diferente de 0000 da mesma urna no
// mesmo arquivo; sem declaração, o voto vai para "indefinida" (contado como da seção e listado à parte).
// Sistema de Apuração (tipo_arquivo sa*) não tem ciclo de eleitor e fica fora, com contagem.
//
// Saída: data/parsed/auditoria/cetico/vsr25/<t>t/<uf>.jsonl (só pacotes com divergência ou log de outra seção),
//        <uf>.resumo.json e, com --consolidar, resumo-<t>t.json.
// Uso: node scripts/auditoria/cetico-vsr25-universo.mjs --turno 1 [--procs 4] [--uf ba,sp] [--refazer]
//      node scripts/auditoria/cetico-vsr25-universo.mjs --turno 1 --consolidar
import { fork } from 'node:child_process';
import { access, mkdir, open, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const DIA = { 1: '04/10/2026', 2: '25/10/2026' };
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'vsr25');
const FECHA = (m) => m.startsWith('Urna ligada em') || m.startsWith('Iniciando aplicação') || m.startsWith('Inicio do Encerramento')
  || m === 'Votação suspensa' || m === 'Aguardando digitação do identificador do eleitor';

const memoria = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
async function textos(handle, prof = 0, nome = 'log.jez', out = []) {
  for (const e of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, e);
    if (e.nome === 'logd.dat') out.push({ nome, texto: dados.toString('latin1') });
    else if (e.nome.endsWith('.jez') && prof < 3) await textos(memoria(dados), prof + 1, `${nome}/${e.nome}`, out);
  }
  return out;
}

/** Contagem de um pacote. Exportada para teste e para conferência de casos. */
export function contarPacote(lista, dia, secaoPacote) {
  const computados = new Map(); // linha → seção
  const completos = new Set(); // linha de habilitação que terminou em computado
  const interrompidos = new Map(); // linha de habilitação → { urna, secao, confs, hora, fechadoPor }
  let linhasDia = 0;
  const unicas = new Set();
  for (const { texto } of lista) {
    const estado = new Map(); // urna → { secao, ciclo }
    for (const bruta of texto.split('\n')) {
      if (!bruta.startsWith(dia)) continue;
      const l = bruta.replace(/\r$/, '');
      linhasDia++;
      unicas.add(l);
      const c = l.split('\t');
      const urna = c[2];
      const m = c[4] ?? '';
      let st = estado.get(urna);
      if (!st) estado.set(urna, (st = { secao: null, ciclo: null }));
      const interromper = (motivo) => {
        if (st.ciclo && !interrompidos.has(st.ciclo.chave)) interrompidos.set(st.ciclo.chave, { urna, secao: st.ciclo.secao, confs: st.ciclo.confs, hora: st.ciclo.hora, fechadoPor: motivo });
        st.ciclo = null;
      };
      if (m.startsWith('Seção Eleitoral: ')) {
        const s = m.slice(17).trim();
        if (s !== '0000') st.secao = s;
      } else if (m === 'Eleitor foi habilitado') {
        interromper(`${c[0].slice(11)} nova habilitação`);
        st.ciclo = { chave: l, secao: st.secao ?? 'indefinida', confs: [], hora: c[0].slice(11) };
      } else if (m.startsWith('Voto confirmado para [')) {
        if (st.ciclo) st.ciclo.confs.push(m.slice(22, -1));
      } else if (m === 'O voto do eleitor foi computado') {
        if (!computados.has(l)) computados.set(l, st.secao ?? 'indefinida');
        if (st.ciclo) completos.add(st.ciclo.chave);
        st.ciclo = null;
      } else if (m === 'Eleitor foi suspenso e não confirmou nenhum voto') {
        if (st.ciclo) completos.add(st.ciclo.chave); // desfecho registrado (sem voto)
        st.ciclo = null;
      } else if (FECHA(m)) {
        interromper(`${c[0].slice(11)} ${m.slice(0, 30)}`);
      }
    }
    for (const [urna, st] of estado) {
      if (st.ciclo && !interrompidos.has(st.ciclo.chave)) interrompidos.set(st.ciclo.chave, { urna, secao: st.ciclo.secao, confs: st.ciclo.confs, hora: st.ciclo.hora, fechadoPor: 'fim do arquivo' });
    }
  }
  const porSecao = {};
  for (const s of computados.values()) porSecao[s] = (porSecao[s] ?? 0) + 1;
  const ints = [...interrompidos].filter(([k]) => !completos.has(k)).map(([, v]) => v);
  const propria = (porSecao[secaoPacote] ?? 0) + (porSecao.indefinida ?? 0);
  const outras = Object.fromEntries(Object.entries(porSecao).filter(([s]) => s !== secaoPacote && s !== 'indefinida'));
  const intPropria = ints.filter((i) => i.secao === secaoPacote || i.secao === 'indefinida');
  return {
    logs: lista.length, linhasDia, linhasDuplicadas: linhasDia - unicas.size, propria, indefinida: porSecao.indefinida ?? 0, outras,
    interrompidos: intPropria.length,
    interrompidosComPresidente: intPropria.filter((i) => i.confs.includes('Presidente')).length,
    ciclos: intPropria.map((i) => `${i.urna} ${i.hora} [${i.confs.join(',')}] fechado: ${i.fechadoPor}`),
  };
}

async function processarUf(turno, uf, destino) {
  const { db } = await abrirLeitura();
  const secoes = db.prepare(`select uf, municipio, zona, secao, hash, tipo_arquivo, tipo_urna, comparecimento, situacao from secao
    where turno = ? and uf = ? order by municipio, zona, secao`).all(turno, uf);
  const r = { turno, uf, secoes: secoes.length, semArquivo: 0, sa: 0, pacotes: 0, semLog: 0, erros: [], computadosPropria: 0, bu: 0,
    buMaior: { secoes: 0, votos: 0 }, logMaior: { secoes: 0, votos: 0 }, comOutraSecao: 0, comIndefinida: 0, comCopias: 0 };
  const linhas = [];
  for (const s of secoes) {
    if (s.situacao !== 'completa' || !s.hash) { r.semArquivo++; continue; }
    if (s.tipo_arquivo?.startsWith('sa')) { r.sa++; continue; }
    const dir = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', uf, s.municipio, s.zona, s.secao, s.hash);
    let jez;
    try {
      jez = (await readdir(dir)).find((n) => n.endsWith('-log.jez'));
    } catch (e) {
      r.erros.push(`${s.municipio}/${s.zona}/${s.secao}: ${e.code}`);
      continue;
    }
    if (!jez) { r.semLog++; continue; }
    let c;
    try {
      const h = await open(path.join(dir, jez));
      try {
        c = contarPacote(await textos(h), DIA[turno], s.secao);
      } finally {
        await h.close();
      }
    } catch (e) {
      r.erros.push(`${s.municipio}/${s.zona}/${s.secao}: ${e.message}`);
      continue;
    }
    r.pacotes++;
    r.bu += s.comparecimento;
    r.computadosPropria += c.propria;
    const dif = s.comparecimento - c.propria;
    if (dif > 0) { r.buMaior.secoes++; r.buMaior.votos += dif; }
    if (dif < 0) { r.logMaior.secoes++; r.logMaior.votos -= dif; }
    if (Object.keys(c.outras).length) r.comOutraSecao++;
    if (c.indefinida) r.comIndefinida++;
    if (c.linhasDuplicadas) r.comCopias++;
    if (dif !== 0 || Object.keys(c.outras).length || c.indefinida) {
      linhas.push(JSON.stringify({ turno, uf, municipio: s.municipio, zona: s.zona, secao: s.secao, tipo: s.tipo_urna, bu: s.comparecimento, ...c, d1: dif,
        d2: Math.min(Math.max(dif, 0), c.interrompidosComPresidente), d3: Math.max(dif, 0) - Math.min(Math.max(dif, 0), c.interrompidosComPresidente) }));
    }
  }
  await mkdir(destino, { recursive: true });
  await writeFile(path.join(destino, `${uf}.jsonl`), linhas.length ? `${linhas.join('\n')}\n` : '');
  await writeFile(path.join(destino, `${uf}.resumo.json`), `${JSON.stringify(r, null, 1)}\n`);
  return r;
}

async function consolidar(turno, destino) {
  const nomes = (await readdir(destino)).filter((n) => n.endsWith('.resumo.json')).sort();
  const t = { turno, ufs: nomes.map((n) => n.slice(0, 2)), secoes: 0, semArquivo: 0, sa: 0, pacotes: 0, semLog: 0, erros: 0, bu: 0, computadosPropria: 0,
    buMaior: { secoes: 0, votos: 0 }, logMaior: { secoes: 0, votos: 0 }, comOutraSecao: 0, comIndefinida: 0, comCopias: 0, d1: 0, d2: 0, d3: 0, casos: [] };
  for (const n of nomes) {
    const r = JSON.parse(await readFile(path.join(destino, n), 'utf8'));
    for (const k of ['secoes', 'semArquivo', 'sa', 'pacotes', 'semLog', 'bu', 'computadosPropria', 'comOutraSecao', 'comIndefinida', 'comCopias']) t[k] += r[k];
    t.erros += r.erros.length;
    for (const k of ['buMaior', 'logMaior']) for (const j of ['secoes', 'votos']) t[k][j] += r[k][j];
    const txt = await readFile(path.join(destino, `${r.uf}.jsonl`), 'utf8');
    for (const l of txt.split('\n').filter(Boolean)) {
      const p = JSON.parse(l);
      t.casos.push(p);
      if (p.d1 > 0) { t.d1 += p.d1; t.d2 += p.d2; t.d3 += p.d3; }
    }
  }
  await writeFile(path.join(SAIDA, `resumo-${turno}t.json`), `${JSON.stringify(t, null, 1)}\n`);
  console.log(`${turno}º turno: ${t.ufs.length} UFs, ${t.secoes} seções (${t.semArquivo} sem arquivo, ${t.sa} do Sistema de Apuração), ${t.pacotes} pacotes lidos, ${t.semLog} sem log, ${t.erros} erros`);
  console.log(`  BU ${t.bu} × computados da própria seção ${t.computadosPropria}; BU maior em ${t.buMaior.secoes} seções (${t.buMaior.votos} votos); log maior em ${t.logMaior.secoes} (${t.logMaior.votos})`);
  console.log(`  pacotes com log de outra seção com voto: ${t.comOutraSecao}; com voto sem seção declarada: ${t.comIndefinida}; com cópias do mesmo log: ${t.comCopias}`);
  console.log(`  D1 (BU − computados) ${t.d1}; D2 (ciclo interrompido com Presidente confirmado) ${t.d2}; D3 (sem ciclo no log) ${t.d3}`);
  for (const p of t.casos) {
    console.log(`  ${p.uf}/${p.municipio}/${p.zona}/${p.secao} [${p.tipo}] BU ${p.bu} própria ${p.propria}${p.indefinida ? ` (indefinida ${p.indefinida})` : ''} outras ${JSON.stringify(p.outras)} logs ${p.logs} cópias ${p.linhasDuplicadas} | D1 ${p.d1} D2 ${p.d2} D3 ${p.d3}`);
    for (const c of p.ciclos) console.log(`      ciclo interrompido: ${c}`);
  }
}

async function principal() {
  const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, uf: { type: 'string' }, procs: { type: 'string', default: '4' },
    refazer: { type: 'boolean' }, filho: { type: 'boolean' }, consolidar: { type: 'boolean' } } });
  const turno = Number(values.turno);
  const destino = path.join(SAIDA, `${turno}t`);
  if (values.consolidar) return consolidar(turno, destino);
  const ufs = values.uf ? values.uf.split(',') : UFS;
  if (values.filho) {
    process.send(await processarUf(turno, ufs[0], destino));
    return;
  }
  const ORDEM = ['sp', 'mg', 'rj', 'ba', 'rs', 'pr', 'ce', 'pe', 'pa', 'ma', 'sc', 'go'];
  const fila = [];
  for (const uf of [...ufs].sort((a, b) => ((ORDEM.indexOf(a) + 1 || 99) - (ORDEM.indexOf(b) + 1 || 99)))) {
    const feito = await access(path.join(destino, `${uf}.resumo.json`)).then(() => true, () => false);
    if (feito && !values.refazer) console.log(`${uf}: já feito`);
    else fila.push(uf);
  }
  const rodar = async () => {
    for (let uf = fila.shift(); uf; uf = fila.shift()) {
      const inicio = Date.now();
      const r = await new Promise((resolve) => {
        const filho = fork(import.meta.filename, ['--filho', '--turno', String(turno), '--uf', uf]);
        let res = null;
        filho.on('message', (m) => { res = m; });
        filho.on('exit', (codigo) => resolve(codigo === 0 && res ? res : { uf, erro: `código ${codigo}` }));
      });
      console.log(`${turno}t ${uf}: ${r.erro ?? `${r.pacotes} pacotes, BU>log ${r.buMaior.secoes}/${r.buMaior.votos}, log>BU ${r.logMaior.secoes}, outra seção ${r.comOutraSecao}, erros ${r.erros.length}`} (${((Date.now() - inicio) / 1000).toFixed(0)} s)`);
    }
  };
  await Promise.all(Array.from({ length: Number(values.procs) }, rodar));
  await consolidar(turno, destino);
}

if (import.meta.filename === path.resolve(process.argv[1] ?? '')) await principal();
