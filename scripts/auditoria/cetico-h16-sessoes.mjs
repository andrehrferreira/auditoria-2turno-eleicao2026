// Cético, parecer 32 (H16): reconstrução independente da sessão do eleitor no log, código próprio.
//
// Objetivo: reproduzir os números do matemático (matematico-h16-sessoes.mjs) sem reaproveitar o código dele e medir
// o que a regra dele pode esconder:
//   1. a mesma máquina de estados (habilitado → computado / suspenso sem voto / interrupção / órfã), escrita de novo;
//   2. divergência ENTRE CÓPIAS do log (MI/ME): o matemático fica com o melhor desfecho e não conta quando as cópias
//      discordam. Aqui cada chave (linha da habilitação) guarda o desfecho de cada cópia;
//   3. linhas-chave com a data corrompida (que a regra "começa com a data do dia" descarta em silêncio);
//   4. nulo por suspensão fora de sessão (o matemático não conta);
//   5. seção da sessão: "Seção Eleitoral" vigente na habilitação (regra do script do matemático) × última da urna no
//      arquivo (regra escrita no doc 07). Conta quantas sessões mudam de seção;
//   6. causa da interrupção separada por lugar (30 linhas antes da habilitação × dentro da sessão) e por tipo
//      (erro/falha, bateria, desligamento pela chave), com o catálogo das mensagens que casaram com cada regex.
// Sistema de Apuração fica fora (não tem log de eleitor). Trechos gravados: números de 9+ dígitos viram "#".
//
// Uso: node scripts/auditoria/cetico-h16-sessoes.mjs --turno 2 --uf ba[,rs] [--procs 2]
//      node scripts/auditoria/cetico-h16-sessoes.mjs --turno 2 --consolidar
// Saída: data/parsed/auditoria/cetico/h16/<t>t/<uf>.json e resumo-<t>t.json
import { fork } from 'node:child_process';
import { mkdir, open, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const DATA = { 1: '04/10/2026', 2: '25/10/2026' };
const DESTINO = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'h16');
const MASCARA = (t) => t.replace(/\d{9,}/g, '#');
const forma = (m) => m.replace(/\d+/g, 'N').slice(0, 100);
const ORDEM_DESFECHO = ['O', 'I', 'S', 'V']; // pior → melhor

const FEDEST = new Set(['Presidente', 'Governador', 'Senador', 'Deputado Federal', 'Deputado Estadual', 'Deputado Distrital']);
const ELEICAO = { 1: { fed: 6257, est: 6259 }, 2: { fed: 6258, est: 6260 } };
const RE_ERRO = /erro|falha|error/i;
const RE_CHAVE = /desligad/i;
const RE_BATERIA = /bateria/i;

/** Lista de { caminho, texto } de todos os logd.dat do pacote, com .jez aninhados (até 5 níveis, conta a profundidade). */
async function copiasDoLog(arquivo) {
  const saida = [];
  const extras = [];
  const leitor = (buf) => ({ read: async (d, o, t, p) => ({ bytesRead: buf.copy(d, o, p, p + t) }), stat: async () => ({ size: buf.length }) });
  const descer = async (h, nivel, prefixo) => {
    for (const e of await listarEntradas(h)) {
      const dados = await lerEntrada(h, e);
      if (e.nome === 'logd.dat') saida.push({ caminho: `${prefixo}/${e.nome}`, nivel, texto: dados.toString('latin1') });
      else if (e.nome.endsWith('.jez')) { if (nivel < 5) await descer(leitor(dados), nivel + 1, `${prefixo}/${e.nome}`); else extras.push(`${prefixo}/${e.nome}`); }
      else extras.push(`${prefixo}/${e.nome}`);
    }
  };
  const h = await open(arquivo);
  try { await descer(h, 0, path.basename(arquivo)); } finally { await h.close(); }
  return { copias: saida, extras };
}

/** Evento de interrupção (mesma lista declarada pelo matemático) ou null. */
function interrupcao(msg) {
  if (msg.startsWith('Urna ligada em')) return 'reinicio';
  if (msg.startsWith('Iniciando aplicação')) return 'reinicio-app';
  if (msg === 'Votação suspensa') return 'votacao-suspensa';
  if (msg.startsWith('Inicio do Encerramento')) return 'encerramento';
  return null;
}

/**
 * Analisa as cópias de log de um pacote. `copias` = [{ texto }]. `secaoPacote` = 'NNNN'. Exportada para o teste de mutação.
 */
export function analisarPacote(copias, dia, secaoPacote) {
  const sessoes = new Map(); // chave (linha da habilitação) → { porCopia: [desfecho], melhor, ... }
  const computados = new Map(); // linha → { secaoHab, comSessaoAlgumaCopia, urna }
  const confFora = new Set();
  const nuloFora = new Set();
  const corrompidas = { total: 0, chave: 0, exemplos: [] };
  const ultimaSecaoUrna = new Map(); // urna → última "Seção Eleitoral" (≠ 0000) no arquivo, em qualquer cópia
  let habDuplicadaMesmaCopia = 0;
  let computadoDuplicadoMesmaCopia = 0;
  copias.forEach(({ texto }, ic) => {
    const urnas = new Map();
    const vistasHab = new Set();
    const vistasComp = new Set();
    const linhas = texto.split('\n');
    for (let bruta of linhas) {
      if (bruta.endsWith('\r')) bruta = bruta.slice(0, -1);
      if (!bruta.startsWith(dia)) {
        // fora do dia: data válida de outro dia (preparação, carga) é normal; o que interessa é linha-chave de eleitor
        // com data de outro dia ou com a data ilegível, que a regra "começa com a data do dia" descarta.
        // o log do 2º turno traz também o dia do 1º turno (a urna acumula o log): esse dia não é corrupção
        if (bruta.length && !bruta.startsWith('04/10/2026') && !bruta.startsWith('25/10/2026')) {
          const dataValida = /^\d\d\/\d\d\/\d{4} \d\d:\d\d:\d\d\t/.test(bruta);
          if (!dataValida) corrompidas.total++;
          const chave = dataValida
            ? /\tO voto do eleitor foi computado|\tEleitor foi habilitado|\tVoto confirmado para \[|\tAtribuido voto nulo por suspens|\tEleitor foi suspenso e n/.test(bruta)
            : /computado\b|habilitado|Voto confirmado|nulo por suspens|suspenso e n/.test(bruta);
          if (chave) {
            corrompidas.chave++;
            if (corrompidas.exemplos.length < 5) corrompidas.exemplos.push(`${dataValida ? 'outro dia' : 'data ilegível'}: ${MASCARA(bruta)}`);
          }
        }
        continue;
      }
      const col = bruta.split('\t');
      const urna = col[2];
      const msg = col[4] ?? '';
      let u = urnas.get(urna);
      if (!u) urnas.set(urna, (u = { secao: null, aberta: null, janela: [] }));
      u.janela.push(bruta);
      if (u.janela.length > 30) u.janela.shift();
      if (u.aberta) u.aberta.linhas.push(bruta);
      const encerrar = (desfecho, motivo) => {
        const a = u.aberta;
        u.aberta = null;
        registrar(a, desfecho, motivo, ic);
      };
      if (msg.startsWith('Seção Eleitoral: ')) {
        const s = msg.slice('Seção Eleitoral: '.length).trim();
        if (s !== '0000') { u.secao = s; ultimaSecaoUrna.set(urna, s); }
        continue;
      }
      if (msg === 'Eleitor foi habilitado') {
        if (vistasHab.has(bruta)) habDuplicadaMesmaCopia++;
        vistasHab.add(bruta);
        if (u.aberta) encerrar('O', 'nova habilitação');
        u.aberta = { chave: bruta, urna, secaoHab: u.secao, antes: u.janela.slice(0, -1), linhas: [], cargos: [], nulos: [], confAposNulo: false };
        continue;
      }
      if (msg.startsWith('Voto confirmado para [')) {
        if (u.aberta) { u.aberta.cargos.push(msg.slice(22, -1)); if (u.aberta.nulos.length) u.aberta.confAposNulo = true; }
        else confFora.add(bruta);
        continue;
      }
      if (msg.startsWith('Atribuido voto nulo por suspensão [')) {
        if (u.aberta) u.aberta.nulos.push(msg.slice(35, -1));
        else nuloFora.add(bruta);
        continue;
      }
      if (msg === 'O voto do eleitor foi computado') {
        if (vistasComp.has(bruta)) computadoDuplicadoMesmaCopia++;
        vistasComp.add(bruta);
        const x = computados.get(bruta) ?? { secaoHab: u.aberta?.secaoHab ?? u.secao, comSessao: false, urna };
        if (u.aberta) x.comSessao = true;
        computados.set(bruta, x);
        if (u.aberta) encerrar('V', 'computado');
        continue;
      }
      if (msg === 'Eleitor foi suspenso e não confirmou nenhum voto') {
        if (u.aberta) encerrar('S', 'desistência');
        continue;
      }
      if (msg === 'Aguardando digitação do identificador do eleitor') {
        if (u.aberta) encerrar('O', 'aguardando identificador');
        continue;
      }
      const ev = interrupcao(msg);
      if (ev && u.aberta) encerrar('I', ev);
    }
    for (const u of urnas.values()) if (u.aberta) { const a = u.aberta; u.aberta = null; registrar(a, 'I', 'fim-do-log', ic); }
  });

  function registrar(a, desfecho, motivo, ic) {
    let s = sessoes.get(a.chave);
    if (!s) sessoes.set(a.chave, (s = { porCopia: new Map(), melhor: null }));
    s.porCopia.set(ic, desfecho);
    const atual = s.melhor;
    if (!atual || ORDEM_DESFECHO.indexOf(desfecho) > ORDEM_DESFECHO.indexOf(atual.desfecho)) s.melhor = { ...a, desfecho, motivo };
  }

  const ehPropria = (s) => s == null || s === secaoPacote;
  const r = {
    copias: copias.length, habDuplicadaMesmaCopia, computadoDuplicadoMesmaCopia, corrompidas,
    hab: 0, V: 0, S: 0, I: 0, O: 0, habOutra: 0, habSemSecaoDeclarada: 0, secaoMudaComUltima: 0,
    computados: 0, computadosOutra: 0, computadoSemSessao: 0, confFora: 0, nuloFora: 0,
    sComCargo: 0, vVazio: 0, confAposNulo: 0,
    divergenciaEntreCopias: 0, divergencias: {}, chaveSoEmParteDasCopias: 0,
    motivosI: {}, motivosO: {}, iComPresidente: 0, iComCargo: 0,
    causa: { dentro: {}, antesSo: {}, nenhuma: 0 }, catalogoCausa: {},
    vetores: {}, exemplos: [], interrompidas: [], comG: 0, comOutro: 0,
  };
  const nCopias = copias.length;
  for (const [chave, s] of sessoes) {
    const a = s.melhor;
    const urna = a.urna;
    if (!ehPropria(a.secaoHab)) { r.habOutra++; continue; }
    if (a.secaoHab == null) r.habSemSecaoDeclarada++;
    const ult = ultimaSecaoUrna.get(urna);
    if ((a.secaoHab ?? null) !== (ult ?? null)) r.secaoMudaComUltima++;
    r.hab++;
    r[a.desfecho]++;
    // cópias: a chave aparece em quantas? os desfechos discordam?
    const desf = new Set(s.porCopia.values());
    if (desf.size > 1) { r.divergenciaEntreCopias++; const k = [...desf].sort().join('/'); r.divergencias[k] = (r.divergencias[k] ?? 0) + 1; }
    if (nCopias > 1 && s.porCopia.size < nCopias) r.chaveSoEmParteDasCopias++;
    if (a.desfecho === 'V') {
      const v = a.cargos.join(',') + (a.nulos.length ? `|nulo:${a.nulos.join(',')}` : '');
      r.vetores[v] = (r.vetores[v] ?? 0) + 1;
      if (a.cargos.includes('Governador') || a.nulos.includes('Governador')) r.comG++;
      if ([...a.cargos, ...a.nulos].some((c) => !FEDEST.has(c))) r.comOutro++;
      if (!a.cargos.length && !a.nulos.length) r.vVazio++;
      if (a.confAposNulo) r.confAposNulo++;
    } else if (a.desfecho === 'S') {
      if (a.cargos.length) r.sComCargo++;
    } else if (a.desfecho === 'I') {
      r.motivosI[a.motivo] = (r.motivosI[a.motivo] ?? 0) + 1;
      if (a.cargos.length) r.iComCargo++;
      if (a.cargos.includes('Presidente')) r.iComPresidente++;
      // causa, por lugar e por tipo
      const tipos = (linhas) => {
        const t = new Set();
        for (const l of linhas) {
          const m = l.split('\t')[4] ?? '';
          let hit = null;
          if (RE_ERRO.test(m)) { t.add('erro'); hit = 'erro'; }
          if (RE_CHAVE.test(m)) { t.add('chave'); hit = 'chave'; }
          if (RE_BATERIA.test(m) && !m.startsWith('Urna ligada conectada')) { t.add('bateria'); hit = 'bateria'; }
          if (hit) r.catalogoCausa[`${hit}: ${forma(m)}`] = (r.catalogoCausa[`${hit}: ${forma(m)}`] ?? 0) + 1;
        }
        return [...t].sort().join('+');
      };
      const dentro = tipos(a.linhas);
      const antes = tipos(a.antes);
      if (dentro) r.causa.dentro[dentro] = (r.causa.dentro[dentro] ?? 0) + 1;
      else if (antes) r.causa.antesSo[antes] = (r.causa.antesSo[antes] ?? 0) + 1;
      else r.causa.nenhuma++;
      r.interrompidas.push({ hora: chave.slice(11, 19), urna, motivo: a.motivo, cargos: a.cargos.join(','), dentro, antes,
        trecho: a.linhas.slice(-12).map((l) => { const c = l.split('\t'); return MASCARA(`${c[0]} ${c[2]} ${c[4] ?? ''}`); }) });
    } else {
      r.motivosO[a.motivo] = (r.motivosO[a.motivo] ?? 0) + 1;
      r.exemplos.push({ tipo: `órfã ${a.motivo}`, trecho: a.linhas.slice(-20).map(MASCARA) });
    }
  }
  for (const [l, x] of computados) {
    if (!ehPropria(x.secaoHab)) { r.computadosOutra++; continue; }
    r.computados++;
    if (!x.comSessao) { r.computadoSemSessao++; if (r.exemplos.length < 20) r.exemplos.push({ tipo: 'computado sem sessão', linha: MASCARA(l) }); }
  }
  r.confFora = confFora.size;
  r.nuloFora = nuloFora.size;
  return r;
}

const CHAVES_SOMA = ['hab', 'V', 'S', 'I', 'O', 'habOutra', 'habSemSecaoDeclarada', 'secaoMudaComUltima', 'computados', 'computadosOutra', 'computadoSemSessao',
  'confFora', 'nuloFora', 'sComCargo', 'vVazio', 'confAposNulo', 'divergenciaEntreCopias', 'chaveSoEmParteDasCopias', 'iComPresidente', 'iComCargo',
  'habDuplicadaMesmaCopia', 'computadoDuplicadoMesmaCopia'];
const somar = (a, b) => { for (const [k, n] of Object.entries(b)) a[k] = (a[k] ?? 0) + n; };

async function rodarUf(turno, uf) {
  const { db } = await abrirLeitura();
  const secoes = db.prepare('select municipio, zona, secao, hash, tipo_arquivo, tipo_urna, comparecimento, situacao from secao where turno = ? and uf = ?').all(turno, uf);
  // T1 (multicargo): comparecimento de cada eleição além da federal, por seção
  const compEle = new Map();
  for (const e of db.prepare('select municipio, zona, secao, eleicao, comparecimento_majoritario c from secao_eleicao where turno = ? and uf = ? and eleicao <> ?').iterate(turno, uf, ELEICAO[turno].fed)) {
    const k = `${e.municipio}/${e.zona}/${e.secao}`;
    if (!compEle.has(k)) compEle.set(k, []);
    compEle.get(k).push(e);
  }
  const t = { turno, uf, secoes: secoes.length, semArquivo: 0, sa: 0, pacotes: 0, semLog: 0, erros: [], bu: 0, copiasPorPacote: {}, extrasNoJez: 0,
    falta: { secoes: 0, votos: 0, lista: [] }, extra: { secoes: 0, votos: 0, lista: [] },
    linhasCorrompidas: 0, linhasChaveCorrompidas: 0, exemplosCorrompidas: [],
    motivosI: {}, motivosO: {}, divergencias: {}, causaDentro: {}, causaAntesSo: {}, causaNenhuma: 0, catalogoCausa: {},
    vetorForaDoModal: 0, vetoresForaDoModal: {}, porTipoUrna: {}, casos: [] };
  for (const k of CHAVES_SOMA) t[k] = 0;
  for (const s of secoes) {
    if (s.situacao !== 'completa' || !s.hash) { t.semArquivo++; continue; }
    if (String(s.tipo_arquivo).startsWith('sa')) { t.sa++; continue; }
    const dir = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', uf, s.municipio, s.zona, s.secao, s.hash);
    let r;
    try {
      const nome = (await readdir(dir)).find((n) => n.endsWith('-log.jez'));
      if (!nome) { t.semLog++; continue; }
      const { copias, extras } = await copiasDoLog(path.join(dir, nome));
      t.extrasNoJez += extras.length;
      t.copiasPorPacote[copias.length] = (t.copiasPorPacote[copias.length] ?? 0) + 1;
      r = analisarPacote(copias, DATA[turno], s.secao);
    } catch (e) {
      t.erros.push(`${s.municipio}/${s.zona}/${s.secao}: ${e.message}`);
      continue;
    }
    t.pacotes++;
    t.t1 ??= { pares: 0, iguais: 0, semComparecimento: 0, divergentes: [] };
    for (const e of compEle.get(`${s.municipio}/${s.zona}/${s.secao}`) ?? []) {
      if (e.c == null) { t.t1.semComparecimento++; continue; }
      const obs = e.eleicao === ELEICAO[turno].est ? r.comG : r.comOutro;
      t.t1.pares++;
      if (obs === e.c) t.t1.iguais++; else t.t1.divergentes.push(`${uf}/${s.municipio}/${s.zona}/${s.secao} eleição ${e.eleicao}: sessões ${obs} × comparecimento ${e.c}`);
    }
    t.bu += s.comparecimento;
    for (const k of CHAVES_SOMA) t[k] += r[k];
    t.linhasCorrompidas += r.corrompidas.total;
    t.linhasChaveCorrompidas += r.corrompidas.chave;
    for (const e of r.corrompidas.exemplos) if (t.exemplosCorrompidas.length < 10) t.exemplosCorrompidas.push(`${s.municipio}/${s.zona}/${s.secao}: ${e}`);
    somar(t.motivosI, r.motivosI);
    somar(t.motivosO, r.motivosO);
    somar(t.divergencias, r.divergencias);
    somar(t.causaDentro, r.causa.dentro);
    somar(t.causaAntesSo, r.causa.antesSo);
    t.causaNenhuma += r.causa.nenhuma;
    somar(t.catalogoCausa, r.catalogoCausa);
    const ord = Object.entries(r.vetores).sort((a, b) => b[1] - a[1]);
    for (const [v, n] of ord.slice(1)) { t.vetorForaDoModal += n; const k = `${ord[0][0]} → ${v}`; t.vetoresForaDoModal[k] = (t.vetoresForaDoModal[k] ?? 0) + n; }
    const tu = (t.porTipoUrna[s.tipo_urna] ??= { pacotes: 0, hab: 0, I: 0, O: 0, falta: 0 });
    tu.pacotes++; tu.hab += r.hab; tu.I += r.I; tu.O += r.O;
    const loc = `${uf}/${s.municipio}/${s.zona}/${s.secao}`;
    const dif = s.comparecimento - r.computados;
    if (dif > 0) { t.falta.secoes++; t.falta.votos += dif; t.falta.lista.push(`${loc} BU ${s.comparecimento} log ${r.computados} (I com P ${r.iComPresidente}, I com cargo ${r.iComCargo})`); tu.falta += dif; }
    if (dif < 0) { t.extra.secoes++; t.extra.votos -= dif; t.extra.lista.push(`${loc} BU ${s.comparecimento} log ${r.computados}`); }
    if (r.O || r.computadoSemSessao || r.confFora || r.nuloFora || r.sComCargo || r.vVazio || r.confAposNulo || r.divergenciaEntreCopias || r.I || dif || r.habDuplicadaMesmaCopia || r.computadoDuplicadoMesmaCopia) {
      t.casos.push({ loc, tipo: s.tipo_urna, bu: s.comparecimento, dif, copias: r.copias, hab: r.hab, V: r.V, S: r.S, I: r.I, O: r.O, computadoSemSessao: r.computadoSemSessao,
        confFora: r.confFora, nuloFora: r.nuloFora, divergenciaEntreCopias: r.divergenciaEntreCopias, divergencias: r.divergencias, interrompidas: r.interrompidas, exemplos: r.exemplos });
    }
  }
  await mkdir(path.join(DESTINO, `${turno}t`), { recursive: true });
  await writeFile(path.join(DESTINO, `${turno}t`, `${uf}.json`), `${JSON.stringify(t)}\n`);
  return t;
}

async function consolidar(turno) {
  const dir = path.join(DESTINO, `${turno}t`);
  const nomes = (await readdir(dir)).filter((n) => /^[a-z]{2}\.json$/.test(n)).sort();
  const z = { turno, ufs: [], secoes: 0, semArquivo: 0, sa: 0, pacotes: 0, semLog: 0, erros: 0, bu: 0, copiasPorPacote: {}, extrasNoJez: 0,
    falta: { secoes: 0, votos: 0, lista: [] }, extra: { secoes: 0, votos: 0, lista: [] }, linhasCorrompidas: 0, linhasChaveCorrompidas: 0, exemplosCorrompidas: [],
    motivosI: {}, motivosO: {}, divergencias: {}, causaDentro: {}, causaAntesSo: {}, causaNenhuma: 0, catalogoCausa: {}, vetorForaDoModal: 0, vetoresForaDoModal: {}, porTipoUrna: {} };
  for (const k of CHAVES_SOMA) z[k] = 0;
  for (const n of nomes) {
    const t = JSON.parse(await readFile(path.join(dir, n), 'utf8'));
    z.ufs.push(t.uf);
    for (const k of ['secoes', 'semArquivo', 'sa', 'pacotes', 'semLog', 'bu', 'extrasNoJez', 'linhasCorrompidas', 'linhasChaveCorrompidas', 'causaNenhuma', 'vetorForaDoModal', ...CHAVES_SOMA]) z[k] += t[k];
    z.erros += t.erros.length;
    if (t.t1) { z.t1 ??= { pares: 0, iguais: 0, semComparecimento: 0, divergentes: [] }; z.t1.pares += t.t1.pares; z.t1.iguais += t.t1.iguais; z.t1.semComparecimento += t.t1.semComparecimento; z.t1.divergentes.push(...t.t1.divergentes); }
    for (const k of ['copiasPorPacote', 'motivosI', 'motivosO', 'divergencias', 'causaDentro', 'causaAntesSo', 'catalogoCausa', 'vetoresForaDoModal']) somar(z[k], t[k]);
    for (const k of ['falta', 'extra']) { z[k].secoes += t[k].secoes; z[k].votos += t[k].votos; z[k].lista.push(...t[k].lista); }
    z.exemplosCorrompidas.push(...t.exemplosCorrompidas.slice(0, 2));
    for (const [tipo, v] of Object.entries(t.porTipoUrna)) somar((z.porTipoUrna[tipo] ??= {}), v);
  }
  z.catalogoCausa = Object.fromEntries(Object.entries(z.catalogoCausa).sort((a, b) => b[1] - a[1]));
  await writeFile(path.join(DESTINO, `resumo-${turno}t.json`), `${JSON.stringify(z, null, 1)}\n`);
  const { catalogoCausa, ...curto } = z;
  console.log(JSON.stringify(curto, null, 1));
  console.log('catálogo de causas (top 40):');
  for (const [k, n] of Object.entries(catalogoCausa).slice(0, 40)) console.log(`  ${n}\t${k}`);
}

async function principal() {
  const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, uf: { type: 'string' }, procs: { type: 'string', default: '1' },
    filho: { type: 'boolean' }, consolidar: { type: 'boolean' } } });
  const turno = Number(values.turno);
  if (values.consolidar) return consolidar(turno);
  const ufs = values.uf ? values.uf.split(',') : UFS;
  if (values.filho) { const t = await rodarUf(turno, ufs[0]); process.send({ uf: t.uf, hab: t.hab, V: t.V, S: t.S, I: t.I, O: t.O, falta: t.falta.votos, extra: t.extra.votos, erros: t.erros.length }); return; }
  const fila = [...ufs];
  const t0 = Date.now();
  const trabalhador = async () => {
    for (let uf = fila.shift(); uf; uf = fila.shift()) {
      const ini = Date.now();
      const res = await new Promise((resolve) => {
        const f = fork(import.meta.filename, ['--filho', '--turno', String(turno), '--uf', uf]);
        let m = null;
        f.on('message', (x) => { m = x; });
        f.on('exit', (c) => resolve(c === 0 && m ? m : { uf, erro: `saída ${c}` }));
      });
      console.log(`${turno}t ${uf}: ${JSON.stringify(res)} (${((Date.now() - ini) / 1000).toFixed(0)} s)`);
    }
  };
  await Promise.all(Array.from({ length: Number(values.procs) }, trabalhador));
  console.log(`tempo ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  await consolidar(turno);
}

if (import.meta.filename === path.resolve(process.argv[1] ?? '')) await principal();
