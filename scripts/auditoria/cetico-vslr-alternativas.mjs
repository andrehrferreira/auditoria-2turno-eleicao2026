// Cético, achado "votos sem log — reconciliação" (engenheiro de segurança doc 03/04, pareceres 08 e 12, matemático doc 02),
// lente de explicações alternativas e poder. Lê SEMPRE os pacotes BRUTOS (log.jez), nunca o perfil.
//
//   --universo  todas as seções do 2º turno da cópia de leitura. Para cada pacote de urna (fora SA e não instaladas) abre o
//               log.jez, todos os logd.dat (inclusive .jez aninhados), junta as linhas do dia por urna (coluna 3) sem
//               cópias idênticas, na ordem do arquivo, e conta por urna e pela seção declarada ("Seção Eleitoral: NNNN"):
//               computados, habilitações, ciclos completos (habilitação → computado), ciclos parciais interrompidos
//               (habilitado + "Voto confirmado" sem "computado"; habilitado sem confirmação; identificado sem habilitação),
//               e, a cada religamento durante a votação, o estado do ciclo e a origem da sincronização dos arquivos
//               dinâmicos (ME/MI). Compara com o comparecimento do BU (banco) sob 4 critérios. Saída:
//               cetico-vslr-universo.json (resumo + divergentes + religamentos) e cetico-vslr-universo.txt.
//   --casos     para as seções divergentes do --universo: decodifica o BU bruto (tipoUrna, urna, historicoCodigosCarga,
//               detalhamento) e descreve cada logd.dat (caminho, urna, modelo, seção declarada, ciclos). Saída:
//               cetico-vslr-casos.json/.txt
// Uso: node scripts/auditoria/cetico-vslr-alternativas.mjs --universo | --casos
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { decodificarArquivo } from '../../src/asn1.js';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { arquivoBu } from '../../src/esquemas.js';
import { emParalelo } from '../../src/http.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const DIA = '25/10/2026';
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');
const { values } = parseArgs({ options: { universo: { type: 'boolean' }, casos: { type: 'boolean' }, interrupcoes: { type: 'boolean' }, limite: { type: 'string' }, conc: { type: 'string', default: '16' }, secao: { type: 'string', multiple: true } } });

const handleEmMemoria = (buffer) => ({
  read: async (destino, deslocamento, tamanho, posicao) => ({ bytesRead: buffer.copy(destino, deslocamento, posicao, posicao + tamanho) }),
  stat: async () => ({ size: buffer.length }),
});

/** logd.dat do pacote, com o caminho dentro do log.jez (a contingência aninha o log da urna anterior como .jez). */
async function logsDoJez(buffer, prefixo = '', prof = 0) {
  const r = [];
  const h = handleEmMemoria(buffer);
  for (const e of await listarEntradas(h)) {
    const nome = prefixo ? `${prefixo}/${e.nome}` : e.nome;
    if (e.nome === 'logd.dat') r.push({ caminho: nome, texto: (await lerEntrada(h, e)).toString('latin1') });
    else if (e.nome.endsWith('.jez') && prof < 3) r.push(...(await logsDoJez(await lerEntrada(h, e), nome, prof + 1)));
  }
  return r;
}

/**
 * Linhas do dia de cada logd.dat com a seção declarada vigente (a última "Seção Eleitoral" antes da linha, em qualquer data)
 * e o modelo declarado. Depois junta por urna sem repetir linha idêntica (a linha inclui o hash de encadeamento).
 * Base = cópia mais longa, na ordem do arquivo; linhas só das outras cópias entram depois (mesma regra do matemático).
 */
function linhasPorUrna(logs) {
  const copias = logs.map((lg) => {
    let secao = null;
    let modelo = null;
    const dia = [];
    for (const bruta of lg.texto.split('\n')) {
      const l = bruta.endsWith('\r') ? bruta.slice(0, -1) : bruta;
      const t1 = l.indexOf('\t');
      if (t1 < 0) continue;
      // colunas: data hora | nível | urna | aplicação | mensagem | hash
      const col = l.split('\t');
      const m = col[4] ?? '';
      if (m.startsWith('Seção Eleitoral: ') || m.startsWith('Seçao Eleitoral: ')) secao = m.slice(17).trim().padStart(4, '0');
      else if (m.startsWith('Identificação do Modelo de Urna: ')) modelo = m.slice(33).trim();
      if (l.startsWith(DIA)) dia.push({ l, urna: col[2], m, hora: col[0].slice(11), secao, modelo });
    }
    return { caminho: lg.caminho, dia };
  });
  copias.sort((a, b) => b.dia.length - a.dia.length);
  const porUrna = new Map();
  let repetidas = 0;
  for (const c of copias) {
    for (const x of c.dia) {
      let u = porUrna.get(x.urna);
      if (!u) porUrna.set(x.urna, (u = { urna: x.urna, vistas: new Set(), linhas: [], caminhos: new Set() }));
      u.caminhos.add(c.caminho);
      if (u.vistas.has(x.l)) { repetidas++; continue; }
      u.vistas.add(x.l);
      u.linhas.push(x);
    }
  }
  return { urnas: [...porUrna.values()], repetidas, brutoComputados: copias.reduce((s, c) => s + c.dia.filter((x) => x.m === 'O voto do eleitor foi computado').length, 0) };
}

const INTERRUPCAO = (m) => m.startsWith('Urna ligada em') || m.startsWith('Iniciando aplicação') || m.startsWith('Inicio do Encerramento') || m === 'Votação suspensa';

/** Ciclos do eleitor numa urna, na ordem do arquivo. */
function ciclos(u) {
  const c = {
    urna: u.urna, modelo: null, secoes: {}, computados: 0, computadosPorSecao: {}, habilitados: 0, completos: 0, completosSemConfirmacao: 0,
    computadoSemHabilitacao: 0, completosPorSecao: {}, desistencias: 0, parcialConfirmado: 0, parcialHabilitado: 0, identificadoInterrompido: 0, habSemDesfecho: 0,
    primeira: null, ultima: null, interrompidos: [], religamentos: [],
  };
  let estado = 'livre'; // livre | ident | hab
  let conf = [];
  let inicioCiclo = null;
  let votacaoAberta = false;
  let ultimaLinha = null;
  let religPendente = null;
  const fecharInterrompido = (motivo, x) => {
    if (estado === 'hab') {
      if (conf.length) c.parcialConfirmado++; else c.parcialHabilitado++;
      c.interrompidos.push({ tipo: conf.length ? 'habilitado+confirmado' : 'habilitado', inicio: inicioCiclo, confirmados: conf, ultimaMsg: ultimaLinha?.m, ultimaHora: ultimaLinha?.hora, motivo, horaInterrupcao: x?.hora ?? null, secao: ultimaLinha?.secao });
    } else if (estado === 'ident') {
      c.identificadoInterrompido++;
      c.interrompidos.push({ tipo: 'identificado', inicio: inicioCiclo, confirmados: [], ultimaMsg: ultimaLinha?.m, ultimaHora: ultimaLinha?.hora, motivo, horaInterrupcao: x?.hora ?? null, secao: ultimaLinha?.secao });
    }
    estado = 'livre'; conf = []; inicioCiclo = null;
  };
  for (const x of u.linhas) {
    const m = x.m;
    c.primeira ??= x.hora;
    c.ultima = x.hora;
    if (x.modelo) c.modelo = x.modelo;
    if (x.secao) c.secoes[x.secao] = (c.secoes[x.secao] ?? 0) + 1;
    if (religPendente && /^Origem da sincroniza[cç][aã]o dos arquivos din[aâ]micos na (ME|MI)/.test(m)) religPendente.sincronizacao = m.endsWith('ME') ? 'ME' : 'MI';
    if (m === 'Urna pronta para receber votos') votacaoAberta = true;
    if (m === 'Identificador do eleitor digitado pelo mesário') {
      if (estado === 'hab') { c.habSemDesfecho++; fecharInterrompido('nova identificação', x); }
      estado = 'ident'; inicioCiclo = x.hora; conf = [];
    } else if (m === 'Eleitor foi habilitado') {
      if (estado === 'hab') { c.habSemDesfecho++; fecharInterrompido('nova habilitação', x); }
      c.habilitados++; estado = 'hab'; conf = []; inicioCiclo ??= x.hora;
    } else if (m.startsWith('Voto confirmado para [')) {
      conf.push(m.slice(22, -1));
    } else if (m === 'O voto do eleitor foi computado') {
      c.computados++;
      const s = x.secao ?? '?';
      c.computadosPorSecao[s] = (c.computadosPorSecao[s] ?? 0) + 1;
      if (estado === 'hab') { if (conf.length) c.completos++; else c.completosSemConfirmacao++; c.completosPorSecao[s] = (c.completosPorSecao[s] ?? 0) + 1; } else c.computadoSemHabilitacao++;
      estado = 'livre'; conf = []; inicioCiclo = null;
    } else if (m === 'Eleitor foi suspenso e não confirmou nenhum voto') {
      c.desistencias++; estado = 'livre'; conf = []; inicioCiclo = null;
    } else if (m === 'Aguardando digitação do identificador do eleitor') {
      if (estado === 'hab') { c.habSemDesfecho++; fecharInterrompido('aguardando identificador', x); }
      estado = 'livre'; conf = []; inicioCiclo = null;
    } else if (INTERRUPCAO(m)) {
      if (m.startsWith('Urna ligada em') && votacaoAberta) {
        religPendente = { hora: x.hora, estadoAntes: estado === 'hab' ? (conf.length ? 'habilitado+confirmado' : 'habilitado') : estado, ultimaAntes: ultimaLinha?.hora ?? null, sincronizacao: null };
        c.religamentos.push(religPendente);
      }
      fecharInterrompido(m.slice(0, 22), x);
    }
    ultimaLinha = x;
  }
  if (estado !== 'livre') fecharInterrompido('fim do log', null);
  return c;
}

async function lerPacote(r) {
  const dir = path.join(DIR_DADOS, 'raw', '2t', 'urnas', r.uf, r.municipio, r.zona, r.secao);
  const subdirs = (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  const hash = subdirs.length === 1 ? subdirs[0] : subdirs.find((d) => d === r.hash || d.startsWith(r.hash));
  if (!hash) return { erro: `diretório de hash não achado (${subdirs.length} subdiretórios)`, subdirs: subdirs.length };
  const dirHash = path.join(dir, hash);
  const nomes = await readdir(dirHash);
  const nomeLog = acharArquivo(nomes, 'log');
  if (!nomeLog) return { erro: 'sem log.jez', subdirs: subdirs.length, dirHash, nomes };
  const logs = await logsDoJez(await readFile(path.join(dirHash, nomeLog)));
  return { subdirs: subdirs.length, dirHash, nomes, logs };
}

function resumoSecao(r, pac) {
  const { urnas, repetidas, brutoComputados } = linhasPorUrna(pac.logs);
  const cs = urnas.map(ciclos);
  const soma = (k) => cs.reduce((s, c) => s + c[k], 0);
  const propria = cs.reduce((s, c) => s + (c.computadosPorSecao[r.secao] ?? 0), 0);
  return {
    logd: pac.logs.length, urnas: cs.length, repetidas, brutoComputados, computados: soma('computados'), computadosPropria: propria,
    completos: soma('completos'), completosSemConfirmacao: soma('completosSemConfirmacao'), parcialConfirmado: soma('parcialConfirmado'),
    parcialHabilitado: soma('parcialHabilitado'), identificadoInterrompido: soma('identificadoInterrompido'), computadoSemHabilitacao: soma('computadoSemHabilitacao'),
    habilitados: soma('habilitados'), desistencias: soma('desistencias'), cs,
  };
}

async function modoUniverso() {
  const { db, fonte } = await abrirLeitura();
  const todas = db.prepare(`SELECT uf, municipio, zona, secao, situacao, status_aux, hash, tipo_urna, tipo_arquivo, comparecimento, modelo_urna, numero_interno_urna
    FROM secao WHERE turno = 2 ORDER BY uf, municipio, zona, secao`).all();
  const u = {
    fonte, secoesNoBanco: todas.length, excluidas: {}, comparadas: 0, erros: [], subdirsMultiplos: 0,
    totais: { bu: 0, brutoComputados: 0, computados: 0, computadosPropria: 0, completos: 0, completosSemConfirmacao: 0, parcialConfirmado: 0, parcialHabilitado: 0, identificadoInterrompido: 0, computadoSemHabilitacao: 0, habilitados: 0, desistencias: 0, repetidas: 0 },
    criterios: {}, divergentes: [], religamentos: { total: 0, porEstadoESinc: {} }, interrompidosPorTipo: {}, secoesComInterrupcao: [],
  };
  const alvo = [];
  for (const r of todas) {
    if (r.situacao !== 'completa') { const k = `${r.situacao} (${r.status_aux ?? '-'})`; u.excluidas[k] = (u.excluidas[k] ?? 0) + 1; continue; }
    if (r.tipo_arquivo?.startsWith('sa')) { const k = `Sistema de Apuração (${r.tipo_arquivo}/${r.tipo_urna})`; u.excluidas[k] = (u.excluidas[k] ?? 0) + 1; continue; }
    alvo.push(r);
  }
  const lista = values.limite ? alvo.slice(0, Number(values.limite)) : alvo;
  const crit = { A_bruto: [], B_dedupUrna: [], C_propriaSecao: [], D_ciclosCompletos: [] };
  let feitos = 0;
  const t0 = Date.now();
  await emParalelo(lista, Number(values.conc), async (r) => {
    let pac;
    try { pac = await lerPacote(r); } catch (e) { u.erros.push({ s: `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, erro: e.message }); return; }
    if (pac.erro) { u.erros.push({ s: `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, erro: pac.erro }); return; }
    if (pac.subdirs > 1) u.subdirsMultiplos++;
    const x = resumoSecao(r, pac);
    u.comparadas++;
    const t = u.totais;
    t.bu += r.comparecimento;
    for (const k of Object.keys(t)) if (k !== 'bu') t[k] += x[k];
    const id = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
    const ciclosComVoto = x.completos + x.completosSemConfirmacao;
    if (x.brutoComputados !== r.comparecimento) crit.A_bruto.push(id);
    if (x.computados !== r.comparecimento) crit.B_dedupUrna.push(id);
    if (x.computadosPropria !== r.comparecimento) crit.C_propriaSecao.push(id);
    const ciclosPropria = x.cs.reduce((s, c) => s + (c.completosPorSecao[r.secao] ?? 0), 0);
    if (ciclosPropria !== r.comparecimento) crit.D_ciclosCompletos.push(id);
    const interromp = x.cs.flatMap((c) => c.interrompidos.map((i) => ({ urna: c.urna, ...i })));
    for (const i of interromp) u.interrompidosPorTipo[i.tipo] = (u.interrompidosPorTipo[i.tipo] ?? 0) + 1;
    for (const c of x.cs) for (const g of c.religamentos) {
      u.religamentos.total++;
      const k = `${g.estadoAntes}|sinc=${g.sincronizacao ?? 'nenhuma'}`;
      u.religamentos.porEstadoESinc[k] = (u.religamentos.porEstadoESinc[k] ?? 0) + 1;
    }
    const delta = r.comparecimento - x.computadosPropria;
    const divergente = x.brutoComputados !== r.comparecimento || x.computados !== r.comparecimento || x.computadosPropria !== r.comparecimento || ciclosPropria !== r.comparecimento;
    const temReligSincME = x.cs.some((c) => c.religamentos.some((g) => g.sincronizacao === 'ME' && g.estadoAntes !== 'livre'));
    if (interromp.length || divergente || x.cs.some((c) => c.religamentos.length)) {
      u.secoesComInterrupcao.push({
        id, tipo: `${r.tipo_urna}/${r.tipo_arquivo}`, modelo: r.modelo_urna, bu: r.comparecimento, delta, logd: x.logd, urnas: x.urnas,
        interrompidos: interromp.map((i) => ({ urna: i.urna, tipo: i.tipo, conf: i.confirmados.length, ultimaMsg: i.ultimaMsg, ultimaHora: i.ultimaHora, motivo: i.motivo, horaInterrupcao: i.horaInterrupcao })),
        religamentos: x.cs.flatMap((c) => c.religamentos.map((g) => ({ urna: c.urna, ...g }))), temReligSincME,
      });
    }
    if (divergente) {
      u.divergentes.push({
        id, tipo_urna: r.tipo_urna, tipo_arquivo: r.tipo_arquivo, modelo: r.modelo_urna, urnaBU: r.numero_interno_urna, bu: r.comparecimento,
        logd: x.logd, urnas: x.urnas, repetidas: x.repetidas, brutoComputados: x.brutoComputados, computados: x.computados, computadosPropria: x.computadosPropria,
        completos: x.completos, completosSemConfirmacao: x.completosSemConfirmacao, parcialConfirmado: x.parcialConfirmado, parcialHabilitado: x.parcialHabilitado,
        identificadoInterrompido: x.identificadoInterrompido, computadoSemHabilitacao: x.computadoSemHabilitacao,
        porUrna: x.cs.map((c) => ({ urna: c.urna, modelo: c.modelo, secoes: c.secoes, computadosPorSecao: c.computadosPorSecao, completos: c.completos, parcialConfirmado: c.parcialConfirmado, parcialHabilitado: c.parcialHabilitado, identificadoInterrompido: c.identificadoInterrompido, primeira: c.primeira, ultima: c.ultima, interrompidos: c.interrompidos, religamentos: c.religamentos })),
      });
    }
    if (++feitos % 20000 === 0) console.error(`${feitos}/${lista.length} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  });
  for (const [k, v] of Object.entries(crit)) u.criterios[k] = { secoes: v.length, lista: v.sort() };
  u.divergentes.sort((a, b) => a.id.localeCompare(b.id));
  u.secoesComInterrupcao.sort((a, b) => a.id.localeCompare(b.id));
  u.alvo = alvo.length;
  u.segundos = Math.round((Date.now() - t0) / 1000);
  await mkdir(SAIDA, { recursive: true });
  await writeFile(path.join(SAIDA, 'cetico-vslr-universo.json'), JSON.stringify(u, null, 1));
  const txt = [
    `fonte ${fonte}; seções do 2º turno no banco: ${u.secoesNoBanco}; excluídas: ${JSON.stringify(u.excluidas)}`,
    `pacotes de urna a comparar: ${alvo.length}; comparados: ${u.comparadas}; erros: ${u.erros.length}; seções com 2+ diretórios de hash: ${u.subdirsMultiplos}`,
    `totais: ${JSON.stringify(u.totais)}`,
    ...Object.entries(u.criterios).map(([k, v]) => `critério ${k}: ${v.secoes} seções ≠ BU: ${v.lista.join(', ')}`),
    `interrompidos por tipo: ${JSON.stringify(u.interrompidosPorTipo)}`,
    `religamentos durante a votação: ${u.religamentos.total}; por estado do ciclo e sincronização: ${JSON.stringify(u.religamentos.porEstadoESinc)}`,
    '', ...u.divergentes.map((d) => `${d.id} ${d.tipo_urna}/${d.tipo_arquivo} BU ${d.bu} | bruto ${d.brutoComputados} dedup ${d.computados} própria ${d.computadosPropria} | completos ${d.completos}+${d.completosSemConfirmacao} parcialConf ${d.parcialConfirmado} parcialHab ${d.parcialHabilitado} identInterr ${d.identificadoInterrompido} semHab ${d.computadoSemHabilitacao} | logd ${d.logd} urnas ${d.urnas} repetidas ${d.repetidas}`),
  ];
  await writeFile(path.join(SAIDA, 'cetico-vslr-universo.txt'), `${txt.join('\n')}\n`);
  console.log(txt.join('\n'));
}

const achar = (o, k) => { if (!o || typeof o !== 'object') return undefined; if (k in o) return o[k]; for (const x of Object.values(o)) { const y = achar(x, k); if (y !== undefined) return y; } return undefined; };

async function modoCasos() {
  const uni = values.secao ? { divergentes: values.secao.map((id) => ({ id })) } : JSON.parse(await readFile(path.join(SAIDA, 'cetico-vslr-universo.json'), 'utf8'));
  const { db } = await abrirLeitura();
  const saida = [];
  const linhas = [];
  for (const d of uni.divergentes) {
    const [uf, municipio, zona, secao] = d.id.split('/');
    const r = db.prepare('SELECT * FROM secao WHERE turno = 2 AND uf = ? AND municipio = ? AND zona = ? AND secao = ?').get(uf, municipio, zona, secao);
    const pac = await lerPacote(r);
    const bu = decodificarArquivo(arquivoBu, await readFile(path.join(pac.dirHash, acharArquivo(pac.nomes, 'bu'))));
    const c = bu.conteudo ?? bu;
    const caso = {
      id: d.id, bu: { tipoUrna: achar(c, 'tipoUrna'), numeroInternoUrna: achar(c, 'numeroInternoUrna'), historicoCodigosCarga: achar(c, 'historicoCodigosCarga'), qtdEleitoresCompareceram: achar(c, 'qtdEleitoresCompareceram'), detalhamento: achar(c, 'detalhamentoComparecimento'), abertura: achar(c, 'dataHoraAbertura'), encerramento: achar(c, 'dataHoraEncerramento'), modelo: r.modelo_urna, codigoCargaBanco: r.codigo_carga },
      t1: db.prepare('SELECT numero_interno_urna, tipo_urna, codigo_carga, comparecimento FROM secao WHERE turno = 1 AND uf = ? AND municipio = ? AND zona = ? AND secao = ?').get(uf, municipio, zona, secao) ?? null,
      logs: [],
    };
    for (const lg of pac.logs) {
      const { urnas } = linhasPorUrna([lg]);
      // carga declarada no log: "Código de carga" / "Código de identificação da carga"
      const cargas = [...new Set(lg.texto.split('\n').map((l) => l.split('\t')[4] ?? '').filter((m) => /c[oó]digo.*carga/i.test(m)).map((m) => m.trim()))].slice(0, 6);
      caso.logs.push({ caminho: lg.caminho, cargas, urnas: urnas.map(ciclos).map((x) => ({ urna: x.urna, modelo: x.modelo, secoes: x.secoes, primeira: x.primeira, ultima: x.ultima, computados: x.computados, computadosPorSecao: x.computadosPorSecao, habilitados: x.habilitados, completos: x.completos, parcialConfirmado: x.parcialConfirmado, parcialHabilitado: x.parcialHabilitado, identificadoInterrompido: x.identificadoInterrompido, desistencias: x.desistencias, interrompidos: x.interrompidos.map((i) => `${i.tipo} ${i.inicio}→${i.ultimaHora} (${i.ultimaMsg}) / ${i.motivo} ${i.horaInterrupcao ?? ''}`), religamentos: x.religamentos })) });
    }
    saida.push(caso);
    linhas.push(`\n${d.id} BU ${caso.bu.qtdEleitoresCompareceram} tipoUrna ${caso.bu.tipoUrna} urna ${caso.bu.numeroInternoUrna} ${caso.bu.modelo} abertura ${caso.bu.abertura} historico ${JSON.stringify(caso.bu.historicoCodigosCarga)} 1ºt ${JSON.stringify(caso.t1)}`);
    for (const lg of caso.logs) for (const x of lg.urnas) linhas.push(`  ${lg.caminho} urna ${x.urna} ${x.modelo} seções ${JSON.stringify(x.secoes)} ${x.primeira}–${x.ultima} computados ${x.computados} ${JSON.stringify(x.computadosPorSecao)} hab ${x.habilitados} completos ${x.completos} parcConf ${x.parcialConfirmado} parcHab ${x.parcialHabilitado} identInt ${x.identificadoInterrompido}\n    ${x.interrompidos.join('\n    ')}\n    religamentos ${JSON.stringify(x.religamentos)}`);
  }
  await writeFile(path.join(SAIDA, 'cetico-vslr-casos.json'), JSON.stringify(saida, null, 1));
  await writeFile(path.join(SAIDA, 'cetico-vslr-casos.txt'), `${linhas.join('\n')}\n`);
  console.log(linhas.join('\n'));
}

// ---- --interrupcoes: alternativa "o voto do ciclo interrompido foi gravado antes da queda" (benigna) × "voto inserido
// disfarçado de queda" (maligna). Para cada pacote com ciclo interrompido ou BU ≠ log: tipo de habilitação de cada
// ciclo (biometria / biografia / sem biometria), contadores do BU (detalhamentoComparecimento), e o que aconteceu no
// 1º atendimento depois do religamento ("já votou" × nova habilitação). Calibração: nas seções sem divergência, os
// tipos dos ciclos completos têm de bater com o BU.
function classeCiclo(msgs) {
  if (msgs.some((m) => m === 'Tipo de habilitação do eleitor [biométrica]')) return 'bio';
  if (msgs.some((m) => m === 'Dado digitado confere')) return 'biog';
  if (msgs.some((m) => m === 'Ano de nascimento digitado é igual ao do cadastro')) return 'sem';
  return '?';
}

function ciclosDetalhe(u) {
  const lista = [];
  let cur = null;
  let interrompidoPendente = null;
  const fechar = (desfecho, x) => {
    if (!cur) return;
    cur.desfecho = desfecho; cur.fim = x?.hora ?? null; cur.classe = classeCiclo(cur.msgs);
    cur.jaVotou = cur.msgs.includes('O eleitor identificado já votou');
    cur.ultimaMsg = cur.msgs.at(-1) ?? null;
    delete cur.msgs;
    lista.push(cur);
    if (desfecho === 'interrompido' && cur.hab) interrompidoPendente = cur;
    cur = null;
  };
  for (const x of u.linhas) {
    const m = x.m;
    if (interrompidoPendente && !interrompidoPendente.sinc && /^Origem da sincroniza[cç][aã]o dos arquivos din[aâ]micos na (ME|MI)/.test(m)) interrompidoPendente.sinc = m.endsWith('ME') ? 'ME' : 'MI';
    if (m === 'Identificador do eleitor digitado pelo mesário') {
      if (cur) fechar(cur.hab ? 'interrompido' : 'sem desfecho', x);
      cur = { inicio: x.hora, secao: x.secao, hab: false, conf: [], msgs: [], depoisDe: interrompidoPendente ? interrompidoPendente.inicio : null };
      if (interrompidoPendente) { interrompidoPendente.proximo = cur; interrompidoPendente = null; }
      continue;
    }
    if (INTERRUPCAO(m)) { if (cur) fechar('interrompido', x); else if (lista.length && lista.at(-1).desfecho === 'interrompido') { /* já fechado */ } continue; }
    if (!cur) continue;
    cur.msgs.push(m);
    cur.horaUltimaLinha = x.hora;
    if (m === 'Eleitor foi habilitado') cur.hab = true;
    else if (m.startsWith('Voto confirmado para [')) { cur.conf.push(m.slice(22, -1)); cur.horaUltimaConf = x.hora; }
    else if (m === 'O voto do eleitor foi computado') fechar('computado', x);
    else if (m === 'Eleitor foi suspenso e não confirmou nenhum voto') fechar('desistencia', x);
    else if (m === 'Aguardando digitação do identificador do eleitor') fechar(cur.hab ? 'interrompido' : 'sem voto', x);
  }
  if (cur) fechar(cur.hab ? 'interrompido' : 'sem desfecho (fim do log)', null);
  return lista;
}

async function modoInterrupcoes() {
  const { db } = await abrirLeitura();
  // lista independente do meu --universo: a saída bruta do matemático (log.interrompidas > 0 ou BU ≠ computados)
  const AUT = path.join(DIR_DADOS, 'parsed', 'auditoria', 'matematico', '2t');
  const alvo = new Map();
  for (const f of (await readdir(AUT)).filter((x) => x.endsWith('.jsonl'))) {
    for (const l of (await readFile(path.join(AUT, f), 'utf8')).split('\n')) {
      if (!l) continue;
      const p = JSON.parse(l);
      if (p.origem !== 'urna' || !p.log) continue;
      if (p.log.interrompidas > 0 || p.log.computados !== p.comparecimento) alvo.set(`${p.uf}/${p.municipio}/${p.zona}/${p.secao}`, 'matematico');
    }
  }
  try {
    const uni = JSON.parse(await readFile(path.join(SAIDA, 'cetico-vslr-universo.json'), 'utf8'));
    for (const s of uni.secoesComInterrupcao) if (s.interrompidos.some((i) => i.tipo !== 'identificado') || s.delta !== 0) alvo.set(s.id, alvo.has(s.id) ? 'ambos' : 'universo');
  } catch { /* universo ainda não rodou */ }
  const r = { secoes: alvo.size, origemLista: {}, calibracao: { secoes: 0, batem: 0, naoBatem: [] }, interrompidosComHab: [], porGrupo: {}, porGrupoConfirmados: {}, divergentes: [] };
  for (const v of alvo.values()) r.origemLista[v] = (r.origemLista[v] ?? 0) + 1;
  const q = db.prepare('SELECT * FROM secao WHERE turno = 2 AND uf = ? AND municipio = ? AND zona = ? AND secao = ?');
  const { lerBu } = await import('../../src/lacres.js');
  await emParalelo([...alvo.keys()], 8, async (id) => {
    const [uf, municipio, zona, secao] = id.split('/');
    const s = q.get(uf, municipio, zona, secao);
    const pac = await lerPacote(s);
    const bu = lerBu(await readFile(path.join(pac.dirHash, acharArquivo(pac.nomes, 'bu'))));
    const det = bu.detalhamentoComparecimento;
    const vBu = { sem: det?.semBiometriaCadastrada ?? null, bio: det?.porBiometria ?? null, biog: det?.comBiometriaHabilitadosPorAnoNascimento ?? null };
    const { urnas } = linhasPorUrna(pac.logs);
    const vLog = { sem: 0, bio: 0, biog: 0, '?': 0 };
    const interr = [];
    for (const u of urnas) {
      for (const c of ciclosDetalhe(u)) {
        if (c.secao !== secao) continue;
        if (c.desfecho === 'computado' && c.hab) vLog[c.classe]++;
        if (c.desfecho === 'interrompido' && c.hab) interr.push({ urna: u.urna, inicio: c.inicio, fim: c.fim, classe: c.classe, conf: c.conf, ultimaMsg: c.ultimaMsg, horaUltimaConf: c.horaUltimaConf ?? null, horaUltimaLinha: c.horaUltimaLinha ?? null, sinc: c.sinc ?? null, proximo: c.proximo ? { inicio: c.proximo.inicio, jaVotou: c.proximo.jaVotou, hab: c.proximo.hab, desfecho: c.proximo.desfecho } : null });
      }
    }
    const completos = vLog.sem + vLog.bio + vLog.biog + vLog['?'];
    const delta = bu.qtdEleitoresCompareceram - completos;
    const dif = { sem: vBu.sem - vLog.sem, bio: vBu.bio - vLog.bio, biog: vBu.biog - vLog.biog };
    if (delta === 0 && det) {
      r.calibracao.secoes++;
      if (dif.sem === 0 && dif.bio === 0 && dif.biog === 0) r.calibracao.batem++; else r.calibracao.naoBatem.push({ id, vBu, vLog });
    }
    // Para cada ciclo interrompido com habilitação: o vetor de diferença do BU aponta para a classe dele?
    const nCargos = bu.eleicoes.reduce((t, e) => t + e.cargos.length, 0);
    for (const i of interr) {
      const virou = delta > 0;
      if (i.conf.length) {
        const k2 = `${i.conf.length >= nCargos ? 'todos os cargos confirmados' : 'confirmação parcial'} | ${virou ? 'virou voto' : 'descartado'} | sincronização depois: ${i.sinc ?? 'nenhuma'} | última linha do ciclo: ${i.ultimaMsg?.startsWith('Voto confirmado') ? 'a confirmação' : i.ultimaMsg}`;
        r.porGrupoConfirmados[k2] = (r.porGrupoConfirmados[k2] ?? 0) + 1;
      }
      const g = `${i.conf.length ? 'confirmado' : 'só habilitado'} | ${virou ? 'BU > log (virou voto)' : 'BU = log (descartado)'} | próximo atendimento: ${i.proximo ? (i.proximo.jaVotou ? 'já votou' : i.proximo.hab ? 'habilitado' : 'outro') : 'nenhum'}`;
      r.porGrupo[g] = (r.porGrupo[g] ?? 0) + 1;
      r.interrompidosComHab.push({ id, tipo: `${s.tipo_urna}/${s.tipo_arquivo}`, delta, dif, ...i });
    }
    if (delta !== 0) r.divergentes.push({ id, bu: bu.qtdEleitoresCompareceram, completos, delta, vBu, vLog, dif, interrompidos: interr });
  });
  r.divergentes.sort((a, b) => a.id.localeCompare(b.id));
  r.interrompidosComHab.sort((a, b) => a.id.localeCompare(b.id));
  r.calibracao.naoBatem.sort((a, b) => a.id.localeCompare(b.id));
  await writeFile(path.join(SAIDA, 'cetico-vslr-interrupcoes.json'), JSON.stringify(r, null, 1));
  const txt = [
    `seções lidas no bruto: ${r.secoes} (${JSON.stringify(r.origemLista)})`,
    `calibração (BU = ciclos completos): ${r.calibracao.batem}/${r.calibracao.secoes} com os 3 contadores do BU iguais aos tipos dos ciclos do log; não batem: ${r.calibracao.naoBatem.length}`,
    `ciclos interrompidos com habilitação: ${r.interrompidosComHab.length}`,
    ...Object.entries(r.porGrupo).sort().map(([k, v]) => `  ${v}\t${k}`),
    '', 'seções com BU ≠ ciclos completos da própria seção:',
    ...r.divergentes.map((d) => `  ${d.id} BU ${d.bu} completos ${d.completos} delta ${d.delta} | BU sem/bio/biog ${d.vBu.sem}/${d.vBu.bio}/${d.vBu.biog} log ${d.vLog.sem}/${d.vLog.bio}/${d.vLog.biog}/?${d.vLog['?']} dif ${d.dif.sem}/${d.dif.bio}/${d.dif.biog} | interrompidos: ${d.interrompidos.map((i) => `${i.urna} ${i.inicio}-${i.fim} ${i.classe} conf[${i.conf}] próximo ${JSON.stringify(i.proximo)}`).join('; ')}`),
  ];
  await writeFile(path.join(SAIDA, 'cetico-vslr-interrupcoes.txt'), `${txt.join('\n')}\n`);
  console.log(txt.join('\n'));
}

if (values.universo) await modoUniverso();
else if (values.casos) await modoCasos();
else if (values.interrupcoes) await modoInterrupcoes();
else console.error('use --universo, --casos ou --interrupcoes');
