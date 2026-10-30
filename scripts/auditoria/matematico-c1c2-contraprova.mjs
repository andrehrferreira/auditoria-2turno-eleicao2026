// Matemático forense: contraprova de C1 (boletim × registro dos votos) e C2 (diário × boletim) nos dois turnos.
//
// Contraprova = alterar um dado de propósito, só na memória (o banco e os arquivos não são tocados), e conferir que as
// contas acusam exatamente essa alteração: na seção alterada, nas contas previstas e em nenhuma outra seção.
// Modelo: o --contraprova de scripts/auditoria/matematico-c36-1t.mjs.
//
// As contas são as do tópico 2 da perícia, com as definições de scripts/auditoria/contagem-coerencia.mjs (2º turno) e
// scripts/auditoria/matematico-h16-rdv-bu.mjs (1º turno):
//   C1  BU × RDV por seção × eleição × cargo: nominal por número (RDV: digitação inteira); legenda por partido (RDV: 2
//       primeiros dígitos da digitação); branco = todo tipo do RDV que começa por "branco"; nulo = todo tipo do RDV que
//       começa por "nulo" (nulo, nuloAposSuspensao, nuloPorRepeticao…). Cargo presente de um lado só conta como 0 do
//       outro (diverge). Unidade: seção × cargo.
//   C2  comparecimento do BU = linhas "O voto do eleitor foi computado" do diário da PRÓPRIA seção, contadas pela
//       função contarPacote de scripts/auditoria/cetico-vsr25-universo.mjs (a que deu os números do tópico 2: cópias
//       idênticas do diário contam uma vez; voto de diário que declara outra seção fica de fora). O diário é lido do
//       pacote bruto (data/raw/<t>t/urnas/...). Sistema de Apuração fica fora (não tem diário de eleitor). Unidade: seção.
//   C2p a mesma conta com o contador que gerou perfil_log.votos_computados no banco (juntarLogs + perfilLog de
//       src/perfil-secoes.js), usado por contagem-coerencia.mjs e verifica-pericia-coerencia.mjs no C2 do 2º turno.
//       Na rodada normal, o valor recontado do bruto é comparado também com o perfil_log gravado no banco.
//   C3  Σ votos do BU no cargo = escolhas × comparecimento da eleição (majoritário; proporcional para 6, 7, 8);
//       escolhas = 2 para senador no 1º turno. Unidade: seção × cargo.
//   C4  aptos = aptos da seção + aptos em trânsito. Unidade: seção × eleição.
//   C5  sem biometria + por biometria + por biografia = comparecimento. Unidade: seção.
//   C6  comparecimento da seção = majoritário da eleição federal, e majoritário = proporcional em cada eleição. Unidade: seção.
// C3 a C6 entram para mostrar que cada alteração é acusada só onde deve.
//
// --contraprova: em cada turno, 9 seções de urna diferentes (a 1ª, em ordem de chave, que atende à condição de cada
// alteração) recebem uma alteração cada:
//   A1  RDV: 1 voto de Presidente trocado de candidato (sai de um número, entra em outro)    → esperado C1
//   A2  RDV: 1 voto a mais para um candidato a Presidente                                     → esperado C1
//   A3  BU: 1 voto a menos para um candidato a Presidente                                     → esperado C1 e C3
//   A3b BU: 1 voto de Presidente passa de nominal a nulo (soma do cargo mantida)              → esperado C1
//   A4  diário: 1 linha "O voto do eleitor foi computado" a mais (linha nova, logo após uma existente) → esperado C2, C2p
//   A4b diário: cópia idêntica de uma linha "computado" (controle: cópias contam uma vez)     → esperado nada
//   A5  diário: 1 linha "computado" a menos (tirada de todas as cópias do diário no pacote)   → esperado C2, C2p
//   A6  BU: comparecimento da seção +1, só esse campo                                          → esperado C2, C2p, C5, C6
//   A6b BU+RDV: 1 eleitor fabricado de forma coerente (comparecimento da seção e de cada eleição +1, por biometria +1,
//       +1 nulo em cada cargo no BU e no RDV, +2 no senador do 1º turno)                       → esperado só C2, C2p
// Sem --contraprova, a rodada normal deve dar 0 acusação.
//
// Uso: node scripts/auditoria/matematico-c1c2-contraprova.mjs [--uf ac] [--turnos 1,2] [--contraprova]
// Saídas: data/parsed/auditoria/matematico/c1c2-<ufs>[-contraprova]-{resumo.txt,acusacoes.csv}
import { mkdirSync, writeFileSync } from 'node:fs';
import { open, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS, UFS as TODAS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';
import { juntarLogs, perfilLog } from '../../src/perfil-secoes.js';
import { contarPacote } from './cetico-vsr25-universo.mjs';

const { values: args } = parseArgs({ options: { uf: { type: 'string', default: 'ac' }, turnos: { type: 'string', default: '1,2' }, contraprova: { type: 'boolean', default: false } } });
const UFS = args.uf.split(',').filter((u) => TODAS.includes(u));
const TURNOS = args.turnos.split(',').map(Number);
const SUF = `-${UFS.join('_')}${args.contraprova ? '-contraprova' : ''}`;
const DIA = { 1: '04/10/2026', 2: '25/10/2026' };
const FEDERAL = { 1: 6257, 2: 6258 };
const PROPORCIONAL = new Set([6, 7, 8]);
const COMPUTADO = 'O voto do eleitor foi computado';
const CONTAS = ['C1', 'C2', 'C2p', 'C3', 'C4', 'C5', 'C6'];
const OUT = path.join(DIR_DADOS, 'parsed', 'auditoria', 'matematico');
mkdirSync(OUT, { recursive: true });
const saida = [];
const p = (...a) => { const s = a.join(' '); saida.push(s); console.log(s); };
const inc = (m, k, n = 1) => m.set(k, (m.get(k) ?? 0) + n);
const inicio = Date.now();

const { db, fonte } = await abrirLeitura();
p(`Banco: ${fonte}`);
p(`UFs: ${UFS.join(',')}; turnos: ${TURNOS.join(',')}; ${args.contraprova ? 'CONTRAPROVA (alterações só na memória)' : 'rodada normal'}`);

const qSecao = db.prepare(`SELECT municipio, zona, secao, hash, situacao, tipo_arquivo, comparecimento, sem_biometria, por_biometria, por_biografia
  FROM secao WHERE turno = ? AND uf = ?`);
const qEle = db.prepare(`SELECT municipio, zona, secao, eleicao, aptos, aptos_secao, aptos_tte, comparecimento_majoritario AS maj,
  comparecimento_proporcional AS prop FROM secao_eleicao WHERE turno = ? AND uf = ?`);
const qBu = db.prepare('SELECT municipio, zona, secao, eleicao, cargo, tipo_voto, numero, quantidade FROM voto_bu WHERE turno = ? AND uf = ?');
const qPerfil = db.prepare('SELECT municipio, zona, secao, hash, votos_computados AS vc FROM perfil_log WHERE turno = ? AND uf = ?');
const qRdv = db.prepare('SELECT municipio, zona, secao, eleicao, cargo, tipo_voto, digitacao, quantidade FROM voto_rdv WHERE turno = ? AND uf = ?');
const chave = (r) => `${r.municipio}|${r.zona}|${r.secao}`;

// Leitura do diário: igual à de cetico-vsr25-universo.mjs (abre o *-log.jez e desce nos .jez aninhados até 3 níveis).
const memoria = (b) => ({ read: async (d, o, t, pos) => ({ bytesRead: b.copy(d, o, pos, pos + t) }), stat: async () => ({ size: b.length }) });
async function textos(handle, prof = 0, nome = 'log.jez', out = []) {
  for (const e of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, e);
    if (e.nome === 'logd.dat') out.push({ nome, texto: dados.toString('latin1') });
    else if (e.nome.endsWith('.jez') && prof < 3) await textos(memoria(dados), prof + 1, `${nome}/${e.nome}`, out);
  }
  return out;
}
async function lerDiario(turno, uf, s) {
  const dir = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', uf, s.municipio, s.zona, s.secao, s.hash);
  const jez = (await readdir(dir)).find((n) => n.endsWith('-log.jez'));
  if (!jez) return null;
  const h = await open(path.join(dir, jez));
  try { return await textos(h); } finally { await h.close(); }
}

// Alterações do diário (sobre a lista de logd.dat do pacote, em memória).
const ehComputado = (l, dia) => l.startsWith(dia) && l.replace(/\r$/, '').split('\t')[4] === COMPUTADO;
function primeiroComputado(lista, dia) {
  for (const [i, t] of lista.entries()) {
    const linhas = t.texto.split('\n');
    const j = linhas.findIndex((l) => ehComputado(l, dia));
    if (j >= 0) return { i, j, linhas };
  }
  return null;
}
const DIARIO = {
  A4(lista, dia) { // linha nova: a mesma mensagem, com outro valor no último campo (encadeamento), logo após a original
    const a = primeiroComputado(lista, dia);
    const cr = a.linhas[a.j].endsWith('\r') ? '\r' : '';
    const c = a.linhas[a.j].replace(/\r$/, '').split('\t');
    a.linhas.splice(a.j + 1, 0, `${c.slice(0, 5).join('\t')}\tC0FFEE00C0FFEE00${cr}`);
    lista[a.i] = { ...lista[a.i], texto: a.linhas.join('\n') };
    return `linha "computado" nova inserida após a de ${c[0].slice(11)}`;
  },
  A4b(lista, dia) { // cópia idêntica da linha (o que acontece quando o pacote traz o mesmo diário duas vezes)
    const a = primeiroComputado(lista, dia);
    a.linhas.splice(a.j + 1, 0, a.linhas[a.j]);
    lista[a.i] = { ...lista[a.i], texto: a.linhas.join('\n') };
    return `linha "computado" de ${a.linhas[a.j].slice(11, 19)} repetida, idêntica`;
  },
  A5(lista, dia) { // remove a linha de todas as cópias do diário no pacote
    const a = primeiroComputado(lista, dia);
    const alvo = a.linhas[a.j].replace(/\r$/, '');
    let removidas = 0;
    for (const [i, t] of lista.entries()) {
      const linhas = t.texto.split('\n');
      const ficam = linhas.filter((l) => l.replace(/\r$/, '') !== alvo);
      removidas += linhas.length - ficam.length;
      lista[i] = { ...t, texto: ficam.join('\n') };
    }
    return `linha "computado" de ${alvo.slice(11, 19)} removida (${removidas} ocorrência(s))`;
  },
};

// Plano da contraprova: alteração → condição, efeito e acusações esperadas na seção alterada.
const nominais = (lin, cargo) => lin.filter((v) => v.cargo === cargo && v.tipo_voto === 'nominal');
const PLANO = [
  { id: 'A1', o: 'RDV: 1 voto de Presidente trocado de candidato', esperado: { C1: 1 },
    cond: (s) => new Set(nominais(s.rdv, 1).map((v) => Number(v.digitacao))).size >= 2 && nominais(s.rdv, 1).some((v) => v.quantidade > 0),
    faz: (s) => { const n = nominais(s.rdv, 1); const de = n.find((v) => v.quantidade > 0); const para = n.find((v) => Number(v.digitacao) !== Number(de.digitacao)); de.quantidade--; para.quantidade++; return `Presidente: ${Number(de.digitacao)} −1, ${Number(para.digitacao)} +1 no RDV`; } },
  { id: 'A2', o: 'RDV: 1 voto a mais', esperado: { C1: 1 },
    cond: (s) => nominais(s.rdv, 1).length > 0,
    faz: (s) => { const v = nominais(s.rdv, 1)[0]; v.quantidade++; return `Presidente ${Number(v.digitacao)} +1 no RDV`; } },
  { id: 'A3', o: 'BU: 1 voto a menos', esperado: { C1: 1, C3: 1 },
    cond: (s) => nominais(s.bu, 1).some((v) => v.quantidade > 0),
    faz: (s) => { const v = nominais(s.bu, 1).find((x) => x.quantidade > 0); v.quantidade--; return `Presidente ${v.numero} −1 no BU`; } },
  { id: 'A3b', o: 'BU: 1 voto de Presidente passa de nominal a nulo (soma mantida)', esperado: { C1: 1 },
    cond: (s) => nominais(s.bu, 1).some((v) => v.quantidade > 0),
    faz: (s) => {
      const v = nominais(s.bu, 1).find((x) => x.quantidade > 0); v.quantidade--;
      const nulo = s.bu.find((x) => x.cargo === 1 && x.tipo_voto === 'nulo');
      if (nulo) nulo.quantidade++; else s.bu.push({ eleicao: v.eleicao, cargo: 1, tipo_voto: 'nulo', numero: null, quantidade: 1 });
      return `Presidente ${v.numero} −1 e nulo +1 no BU`;
    } },
  { id: 'A4', o: 'diário: 1 linha "computado" a mais', esperado: { C2: 1, C2p: 1 }, diario: 'A4' },
  { id: 'A4b', o: 'diário: cópia idêntica de uma linha "computado" (controle)', esperado: {}, diario: 'A4b' },
  { id: 'A5', o: 'diário: 1 linha "computado" a menos', esperado: { C2: 1, C2p: 1 }, diario: 'A5' },
  { id: 'A6', o: 'BU: comparecimento da seção +1 (só esse campo)', esperado: { C2: 1, C2p: 1, C5: 1, C6: 1 },
    faz: (s) => { s.comparecimento++; return `comparecimento ${s.comparecimento - 1} → ${s.comparecimento}`; } },
  { id: 'A6b', o: 'BU+RDV: 1 eleitor fabricado de forma coerente (comparecimento +1 em todo o boletim e +1 nulo em cada cargo)', esperado: { C2: 1, C2p: 1 },
    cond: (s) => s.por_biometria !== null && [...s.ele.values()].every((e) => e.maj !== null && e.maj < e.aptos && (e.prop === null || e.prop < e.aptos)),
    faz: (s, turno) => {
      s.comparecimento++; s.por_biometria++;
      for (const e of s.ele.values()) { e.maj++; if (e.prop !== null) e.prop++; }
      const cargos = new Map();
      for (const v of s.bu) cargos.set(`${v.eleicao}|${v.cargo}`, v);
      for (const { eleicao, cargo } of cargos.values()) {
        const esc = cargo === 5 && turno === 1 ? 2 : 1;
        for (const [lin, campo] of [[s.bu, 'numero'], [s.rdv, 'digitacao']]) {
          const nulo = lin.find((x) => x.eleicao === eleicao && x.cargo === cargo && x.tipo_voto === 'nulo');
          if (nulo) nulo.quantidade += esc; else lin.push({ eleicao, cargo, tipo_voto: 'nulo', [campo]: null, quantidade: esc });
        }
      }
      return `comparecimento ${s.comparecimento - 1} → ${s.comparecimento}; ${cargos.size} cargos com +1 nulo${turno === 1 ? ' (senador +2)' : ''} no BU e no RDV`;
    } },
];

const acusacoes = [];
const quadro = []; // por turno × alteração
const totalGeral = { normalAcusacoes: 0 };

for (const turno of TURNOS) {
  const dia = DIA[turno];
  const est = Object.fromEntries(CONTAS.map((c) => [c, { comparacoes: 0, acusacoes: 0 }]));
  const extra = { secoes: 0, completas: 0, sa: 0, semLog: 0, erros: [], buComparecimento: 0, computadosPropria: 0, computadosPerfil: 0, perfilBanco: 0, perfilDifereBanco: [] };
  const alvos = new Map(); // chave da seção → alteração
  for (const uf of UFS) {
    const t0 = Date.now();
    const secoes = new Map();
    for (const s of qSecao.iterate(turno, uf)) {
      extra.secoes++;
      if (s.situacao !== 'completa' || !s.hash) continue;
      secoes.set(chave(s), { ...s, uf, ele: new Map(), bu: [], rdv: [] });
    }
    for (const e of qEle.iterate(turno, uf)) secoes.get(chave(e))?.ele.set(e.eleicao, { ...e });
    for (const v of qBu.iterate(turno, uf)) secoes.get(chave(v))?.bu.push({ ...v });
    for (const v of qRdv.iterate(turno, uf)) secoes.get(chave(v))?.rdv.push({ ...v });
    const perfilBanco = new Map(qPerfil.all(turno, uf).map((x) => [`${chave(x)}|${x.hash}`, x.vc]));

    // Contraprova: escolhe as seções e aplica as alterações de BU/RDV (as de diário são aplicadas na leitura do log).
    if (args.contraprova && uf === UFS[0]) {
      const ordem = [...secoes.keys()].sort().map((k) => secoes.get(k)).filter((s) => !String(s.tipo_arquivo).startsWith('sa'));
      for (const a of PLANO) {
        let alvo = null;
        for (const s of ordem) {
          if (alvos.has(chave(s))) continue;
          if (a.diario) {
            const lista = await lerDiario(turno, uf, s);
            if (!lista || !primeiroComputado(lista, dia)) continue;
          } else if (a.cond && !a.cond(s)) continue;
          alvo = s; break;
        }
        if (!alvo) throw new Error(`${turno}º turno: nenhuma seção atende à condição de ${a.id}`);
        const reg = { turno, ...a, uf, secao: `${alvo.municipio}/${alvo.zona}/${alvo.secao}`, efeito: a.faz ? a.faz(alvo, turno) : null, obtido: {} };
        alvos.set(chave(alvo), reg);
      }
    }

    for (const s of secoes.values()) {
      extra.completas++;
      const k = chave(s);
      const loc = `${s.municipio}/${s.zona}/${s.secao}`;
      const acusa = (conta, detalhe) => { est[conta].acusacoes++; acusacoes.push({ turno, uf, secao: loc, tipo_arquivo: s.tipo_arquivo, conta, alteracao: alvos.get(k)?.id ?? '', detalhe }); const a = alvos.get(k); if (a) inc2(a.obtido, conta); };
      const sa = String(s.tipo_arquivo).startsWith('sa');

      // C1 e C3
      const g = new Map();
      const pega = (e, c) => { const kk = `${e}|${c}`; if (!g.has(kk)) g.set(kk, { e, c, bu: new Map(), rdv: new Map(), totalBu: 0 }); return g.get(kk); };
      for (const v of s.bu) {
        const x = pega(v.eleicao, v.cargo);
        x.totalBu += v.quantidade;
        inc(x.bu, v.tipo_voto === 'nominal' || v.tipo_voto === 'legenda' ? `${v.tipo_voto}|${v.numero}` : v.tipo_voto, v.quantidade);
      }
      for (const v of s.rdv) {
        const x = pega(v.eleicao, v.cargo);
        let kk;
        if (v.tipo_voto === 'nominal') kk = `nominal|${Number(v.digitacao)}`;
        else if (v.tipo_voto === 'legenda') kk = `legenda|${Number(String(v.digitacao).slice(0, 2))}`;
        else if (v.tipo_voto.startsWith('nulo')) kk = 'nulo';
        else if (v.tipo_voto.startsWith('branco')) kk = 'branco';
        else kk = v.tipo_voto;
        inc(x.rdv, kk, v.quantidade);
      }
      for (const x of g.values()) {
        est.C1.comparacoes++;
        const difs = [];
        for (const kk of new Set([...x.bu.keys(), ...x.rdv.keys()])) if ((x.bu.get(kk) ?? 0) !== (x.rdv.get(kk) ?? 0)) difs.push(`${kk}: BU ${x.bu.get(kk) ?? 0} RDV ${x.rdv.get(kk) ?? 0}`);
        if (difs.length) acusa('C1', `eleição ${x.e} cargo ${x.c}: ${difs.join(', ')}`);
        const e = s.ele.get(x.e);
        const comp = e ? (PROPORCIONAL.has(x.c) ? e.prop : e.maj) : null;
        if (comp === null || comp === undefined) continue;
        est.C3.comparacoes++;
        const esc = x.c === 5 && turno === 1 ? 2 : 1;
        if (x.totalBu !== esc * comp) acusa('C3', `eleição ${x.e} cargo ${x.c}: soma ${x.totalBu} ≠ ${esc} × ${comp}`);
      }

      // C4
      for (const e of s.ele.values()) {
        est.C4.comparacoes++;
        if (e.aptos !== (e.aptos_secao ?? 0) + (e.aptos_tte ?? 0)) acusa('C4', `eleição ${e.eleicao}: ${e.aptos} ≠ ${e.aptos_secao} + ${e.aptos_tte}`);
      }
      // C5
      if (s.sem_biometria !== null && s.por_biometria !== null && s.por_biografia !== null) {
        est.C5.comparacoes++;
        if (s.sem_biometria + s.por_biometria + s.por_biografia !== s.comparecimento) acusa('C5', `${s.sem_biometria} + ${s.por_biometria} + ${s.por_biografia} ≠ ${s.comparecimento}`);
      }
      // C6
      const fed = s.ele.get(FEDERAL[turno]);
      if (sa) extra.sa++;
      else {
        est.C6.comparacoes++;
        const prob = [];
        if (fed && fed.maj !== s.comparecimento) prob.push(`federal ${fed.maj} ≠ seção ${s.comparecimento}`);
        for (const e of s.ele.values()) if (e.maj !== null && e.prop !== null && e.maj !== e.prop) prob.push(`eleição ${e.eleicao} maj ${e.maj} ≠ prop ${e.prop}`);
        if (prob.length) acusa('C6', prob.join('; '));
      }
      // C2: diário bruto × comparecimento
      if (!sa) {
        let lista;
        try { lista = await lerDiario(turno, uf, s); } catch (e) { extra.erros.push(`${loc}: ${e.message}`); continue; }
        if (!lista) { extra.semLog++; continue; }
        const a = alvos.get(k);
        if (a?.diario) a.efeito = DIARIO[a.diario](lista, dia);
        const c = contarPacote(lista, dia, s.secao);
        est.C2.comparacoes++;
        extra.buComparecimento += s.comparecimento;
        extra.computadosPropria += c.propria;
        if (c.propria !== s.comparecimento) acusa('C2', `computados no diário da seção ${c.propria}, comparecimento do BU ${s.comparecimento}`);
        const vc = perfilLog(juntarLogs(lista.map((x) => x.texto), s.secao).texto, dia).votosComputados;
        est.C2p.comparacoes++;
        extra.computadosPerfil += vc;
        const pb = perfilBanco.get(`${k}|${s.hash}`);
        extra.perfilBanco += pb ?? 0;
        if (!alvos.has(k) && pb !== vc) extra.perfilDifereBanco.push(`${loc}: recontado ${vc}, banco ${pb}`);
        if (vc !== s.comparecimento) acusa('C2p', `computados pelo contador do perfil ${vc}, comparecimento do BU ${s.comparecimento}`);
      }
    }
    console.error(`  ${turno}t ${uf}: ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }

  p(`\n${turno}º turno, ${UFS.join(',')}: ${extra.secoes} seções, ${extra.completas} completas, ${extra.sa} do Sistema de Apuração, ${extra.semLog} sem diário, ${extra.erros.length} erros de leitura`);
  for (const c of CONTAS) p(`  ${c}: ${est[c].comparacoes} comparações, ${est[c].acusacoes} acusações`);
  p(`  C2 em votos: comparecimento do BU ${extra.buComparecimento} × computados da própria seção ${extra.computadosPropria}`);
  p(`  C2p em votos: computados pelo contador do perfil ${extra.computadosPerfil}; perfil_log gravado no banco ${extra.perfilBanco}; seções não alteradas em que o recontado difere do banco: ${extra.perfilDifereBanco.length}`);
  for (const x of extra.perfilDifereBanco.slice(0, 20)) p(`    ${x}`);
  for (const e of extra.erros) p(`  erro: ${e}`);
  const doTurno = acusacoes.filter((x) => x.turno === turno);
  if (!args.contraprova) { totalGeral.normalAcusacoes += doTurno.length; continue; }

  const fora = doTurno.filter((x) => !x.alteracao);
  p(`  Contraprova: ${alvos.size} seções alteradas; acusações em seção não alterada: ${fora.length}`);
  for (const a of alvos.values()) {
    const ok = CONTAS.every((c) => (a.esperado[c] ?? 0) === (a.obtido[c] ?? 0));
    quadro.push({ ...a, ok });
    const fmt = (m) => CONTAS.filter((c) => m[c]).map((c) => `${c} ${m[c]}`).join(', ') || 'nada';
    p(`  ${a.id.padEnd(4)} ${a.secao} | ${a.o} | ${a.efeito} | esperado: ${fmt(a.esperado)} | acusado: ${fmt(a.obtido)} | ${ok ? 'OK' : 'FALHOU'}`);
    for (const x of doTurno.filter((y) => y.alteracao === a.id)) p(`        ${x.conta}: ${x.detalhe}`);
  }
  for (const x of fora) p(`  INESPERADA: ${x.uf} ${x.secao} ${x.conta}: ${x.detalhe}`);
}
function inc2(o, k) { o[k] = (o[k] ?? 0) + 1; }

if (args.contraprova) {
  const falhas = quadro.filter((a) => !a.ok).length + acusacoes.filter((x) => !x.alteracao).length;
  p(`\nResultado da contraprova: ${quadro.length} alterações, ${quadro.length - quadro.filter((a) => !a.ok).length} acusadas exatamente como previsto; ${acusacoes.filter((x) => !x.alteracao).length} acusações fora das seções alteradas. ${falhas ? 'FALHOU' : 'PASSOU'}`);
  if (falhas) process.exitCode = 1;
} else p(`\nRodada normal: ${totalGeral.normalAcusacoes} acusações no total.`);

const cols = ['turno', 'uf', 'secao', 'tipo_arquivo', 'conta', 'alteracao', 'detalhe'];
writeFileSync(path.join(OUT, `c1c2${SUF}-acusacoes.csv`), [cols.join(';'), ...acusacoes.map((r) => cols.map((c) => String(r[c] ?? '')).join(';'))].join('\n') + '\n');
p(`Tempo: ${((Date.now() - inicio) / 1000).toFixed(0)} s. Saídas: ${path.relative(process.cwd(), OUT)}/c1c2${SUF}-{resumo.txt,acusacoes.csv}`);
writeFileSync(path.join(OUT, `c1c2${SUF}-resumo.txt`), saida.join('\n') + '\n');
