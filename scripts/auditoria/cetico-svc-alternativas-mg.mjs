// Revisão cética do achado software-verificacao-caminhos (engenheiro-seguranca-urna), item 2 do foco:
// a varredura de MG foi refeita com uma regra de descarte de linhas inválidas que as outras 27 UFs não tiveram.
// Este script relê os logd.dat de UMA UF (padrão: MG, universo completo pelas seções com pacote no banco) e, para cada log,
//   1) conta as linhas que passam no filtro antigo ("dd/" e >= 20 caracteres) mas são descartadas pela regra nova
//      (nº de urna ausente, aplicação ausente ou data/hora fora do padrão), por motivo;
//   2) só nos logs com alguma dessas linhas, roda o analisarLog do autor com a regra NOVA (o módulo do autor) e com a
//      regra ANTIGA (o mesmo código-fonte sem a linha do descarte, carregado em memória) e compara o resumo de segurança
//      (boots, etapas, [SUCESSO], votos, versões, urnas, retrocessos) e o catálogo de mensagens.
// A regra antiga é inferida: as saídas das outras UFs não têm o campo linhasMalformadas e o varredura-2t.log mostra
// "mg: 52062 pacotes, 1 erro(s)" na primeira passada. Se a regra antiga lançar exceção, o pacote conta como ilegível.
// Uso: node scripts/auditoria/cetico-svc-alternativas-mg.mjs [--uf mg] [--turno 2]
// Saída: data/parsed/auditoria/cetico/svc-mg-regra-<uf>-<t>t.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { open, readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { analisarLog as analisarNovo, textosDeLog } from './seguranca-varrer-logs.mjs';

const { values } = parseArgs({ options: { uf: { type: 'string', default: 'mg' }, turno: { type: 'string', default: '2' } } });
const uf = values.uf;
const turno = values.turno;

// Regra antiga: o mesmo código do autor sem a linha de descarte (carregado de data: URL, sem gravar arquivo de código).
const fonteAutor = readFileSync(path.join(import.meta.dirname, 'seguranca-varrer-logs.mjs'), 'utf8');
const RE_REGRA = /^\s*if \(urna === undefined \|\| app === undefined .*\{ r\.linhasMalformadas\+\+; continue; \}.*$/m;
if (!RE_REGRA.test(fonteAutor)) throw new Error('linha da regra de descarte não encontrada no script do autor');
const raizSrc = pathToFileURL(path.join(import.meta.dirname, '..', '..', 'src')).href;
const fonteAntiga = fonteAutor.replace(RE_REGRA, '').replaceAll("'../../src/", `'${raizSrc}/`)
  .replace(/^if \(import\.meta\.filename.*$/m, '');
const { analisarLog: analisarAntigo } = await import(`data:text/javascript;base64,${Buffer.from(fonteAntiga).toString('base64')}`);

const RE_DH = /^\d\d\/\d\d\/\d{4} \d\d:\d\d:\d\d$/;
const DIA = { 1: '04/10/2026', 2: '25/10/2026' }[turno];
// Também registra, na ordem do ARQUIVO (não pela data da linha), carga (SCUE "Iniciando aplicação") que aparece depois de
// uma linha "Urna pronta para receber votos" ou "O voto do eleitor foi computado" datada do dia da votação: carga feita
// depois de a urna ter aberto a votação no dia, qualquer que seja a hora digitada na carga.
// Teste de poder: duração (relógio da urna) de cada bloco de "Verificação de assinatura - Etapa" do GAP, da etapa [1] à última.
// Um software que só imprimisse [SUCESSO] sem verificar tenderia a fechar o bloco em ~0 s (a menos que imite o tempo também).
const segs = (dh) => Date.UTC(+dh.slice(6, 10), +dh.slice(3, 5) - 1, +dh.slice(0, 2), +dh.slice(11, 13), +dh.slice(14, 16), +dh.slice(17, 19)) / 1000;
const FAIXAS = [0, 1, 2, 3, 5, 10, 20, 60, 600];
const faixa = (d) => (d < 0 ? 'negativo' : String(FAIXAS.filter((x) => d >= x).at(-1)) + (d >= 600 ? '+' : ''));
function linhasDescartadas(texto) {
  const r = { semUrna: 0, semApp: 0, dataInvalida: 0, exemplos: [], cargasAposVotacaoNoDia: [], blocos: [] };
  let votouNoDia = null;
  let pendente = null;
  let modelo = null;
  let bloco = null;
  const fechar = () => { if (bloco) { r.blocos.push({ modelo, n: bloco.n, dur: segs(bloco.t1) - segs(bloco.t0), dia: bloco.t0.startsWith(DIA), t0: bloco.t0 }); bloco = null; } };
  let ini = 0;
  const L = texto.length;
  while (ini < L) {
    let fim = texto.indexOf('\n', ini);
    if (fim === -1) fim = L;
    const linha = texto.charCodeAt(fim - 1) === 13 ? texto.slice(ini, fim - 1) : texto.slice(ini, fim);
    ini = fim + 1;
    if (linha.length < 20 || linha.charCodeAt(2) !== 47) continue;
    const c = linha.split('\t');
    let motivo = null;
    if (c[2] === undefined) motivo = 'semUrna';
    else if (c[3] === undefined) motivo = 'semApp';
    else if (!RE_DH.test(c[0])) motivo = 'dataInvalida';
    if (!motivo) {
      const [dh, , urna, app, msg = ''] = c;
      if (msg.startsWith('Identificação do Modelo de Urna: ')) modelo = msg.slice(33).trim();
      if (app === 'GAP' && msg.startsWith('Verificação de assinatura - Etapa [')) {
        if (msg.startsWith('Verificação de assinatura - Etapa [1] ')) { fechar(); bloco = { t0: dh, t1: dh, n: 0 }; }
        if (bloco) { bloco.n++; bloco.t1 = dh; }
      } else if (bloco && app === 'GAP') fechar();
      if (!votouNoDia && dh.startsWith(DIA) && (msg.startsWith('Urna pronta para receber votos') || msg === 'O voto do eleitor foi computado')) votouNoDia = dh;
      if (votouNoDia && app === 'SCUE' && msg.startsWith('Iniciando aplicação')) {
        pendente = { urna, linhaCarga: dh, primeiraVotacaoNoDia: votouNoDia, digitada: null };
        if (r.cargasAposVotacaoNoDia.length < 10) r.cargasAposVotacaoNoDia.push(pendente);
      } else if (pendente && app === 'SCUE' && msg.startsWith('Data e hora que foi digitada pelo operador: ')) {
        pendente.digitada = msg.slice(44).trim();
        pendente = null;
      }
      continue;
    }
    r[motivo]++;
    if (r.exemplos.length < 3) r.exemplos.push({ motivo, inicio: JSON.stringify(linha.slice(0, 60)) });
  }
  fechar();
  return r;
}

const resumoBoot = (b) => `${b.etapas}|${b.impressao}|${b.etapasNaoSucesso}|${b.votos}|${b.pronta}|${b.versoes.join(',')}`;
function comparar(novo, antigo) {
  const d = {};
  if (novo.linhas !== antigo.linhas) d.linhas = [novo.linhas, antigo.linhas];
  if (novo.boots.length !== antigo.boots.length) d.boots = [novo.boots.length, antigo.boots.length];
  const vot = (r) => r.boots.filter((b) => b.pronta || b.votos > 0);
  if (vot(novo).length !== vot(antigo).length) d.bootsVotacao = [vot(novo).length, vot(antigo).length];
  const bn = novo.boots.map(resumoBoot).join(';'); const ba = antigo.boots.map(resumoBoot).join(';');
  if (bn !== ba) d.bootsDiferem = true;
  const votos = (r) => r.boots.reduce((s, b) => s + b.votos, 0);
  if (votos(novo) !== votos(antigo)) d.votos = [votos(novo), votos(antigo)];
  const etNs = (r) => r.boots.reduce((s, b) => s + b.etapasNaoSucesso, 0);
  if (etNs(novo) !== etNs(antigo)) d.etapasNaoSucesso = [etNs(novo), etNs(antigo)];
  if (JSON.stringify(novo.versoes) !== JSON.stringify(antigo.versoes)) d.versoes = true;
  if (novo.urnas.join() !== antigo.urnas.join()) d.urnas = [novo.urnas, antigo.urnas];
  if (novo.retrocessos !== antigo.retrocessos) d.retrocessos = [novo.retrocessos, antigo.retrocessos];
  if (novo.retrocessosAposAjuste !== antigo.retrocessosAposAjuste) d.retrocessosAposAjuste = [novo.retrocessosAposAjuste, antigo.retrocessosAposAjuste];
  if (novo.falhasVerificacao.length !== antigo.falhasVerificacao.length) d.falhasVerificacao = [novo.falhasVerificacao.length, antigo.falhasVerificacao.length];
  return d;
}

const { db, fonte } = await abrirLeitura();
console.error(`banco: ${fonte}`);
const secoes = db.prepare('SELECT municipio, zona, secao, hash FROM secao WHERE turno = ? AND uf = ? AND pacotes = 1 ORDER BY 1,2,3').all(Number(turno), uf);
const semPacote = db.prepare('SELECT COUNT(*) n FROM secao WHERE turno = ? AND uf = ? AND (pacotes IS NULL OR pacotes != 1)').get(Number(turno), uf).n;

const tot = { uf, turno: Number(turno), secoesComPacote: secoes.length, secoesSemPacote: semPacote, pacotesLidos: 0, semLogOuVsc: 0, erroLeitura: 0, logs: 0,
  logsComDescarte: 0, linhasDescartadas: { semUrna: 0, semApp: 0, dataInvalida: 0 }, antigaLancaExcecao: 0, logsComDiferenca: 0,
  catalogoChavesSoNaAntiga: 0, catalogoEventosSoNaAntiga: 0, cargasAposVotacaoNoDia: [],
  duracaoVerificacao: { blocosCompletos: 0, blocosCompletosNoDia: 0, porModeloFaixa: {}, porModeloFaixaNoDia: {}, completosEmAte1s: [] }, casos: [] };
const inicio = Date.now();
for (const s of secoes) {
  const id = `${uf}/${s.municipio}/${s.zona}/${s.secao}`;
  const dir = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', uf, s.municipio, s.zona, s.secao, s.hash);
  let textos;
  try {
    const nomes = await readdir(dir);
    const nLog = acharArquivo(nomes, 'log');
    if (!nLog || !acharArquivo(nomes, 'vsc')) { tot.semLogOuVsc++; continue; }
    const h = await open(path.join(dir, nLog));
    try { textos = await textosDeLog(h); } finally { await h.close(); }
  } catch (erro) { tot.erroLeitura++; tot.casos.push({ id, erroLeitura: erro.message }); continue; }
  tot.pacotesLidos++;
  for (const t of textos) {
    tot.logs++;
    const desc = linhasDescartadas(t.texto);
    for (const b of desc.blocos) {
      if (b.n < 33) continue; // bloco incompleto (parou em erro ou urna desligada)
      const dv = tot.duracaoVerificacao; const k = `${b.modelo} | ${faixa(b.dur)}`;
      dv.blocosCompletos++; dv.porModeloFaixa[k] = (dv.porModeloFaixa[k] ?? 0) + 1;
      if (b.dia) { dv.blocosCompletosNoDia++; dv.porModeloFaixaNoDia[k] = (dv.porModeloFaixaNoDia[k] ?? 0) + 1; }
      if (b.dur <= 1 && dv.completosEmAte1s.length < 200) dv.completosEmAte1s.push({ id, profundidade: t.profundidade, ...b });
    }
    if (desc.cargasAposVotacaoNoDia.length) tot.cargasAposVotacaoNoDia.push({ id, profundidade: t.profundidade, nome: t.nome, cargas: desc.cargasAposVotacaoNoDia });
    const n = desc.semUrna + desc.semApp + desc.dataInvalida;
    if (!n) continue;
    tot.logsComDescarte++;
    for (const k of ['semUrna', 'semApp', 'dataInvalida']) tot.linhasDescartadas[k] += desc[k];
    const cn = new Map(); const ca = new Map();
    const novo = analisarNovo(t.texto, turno, cn, null);
    const caso = { id, profundidade: t.profundidade, nome: t.nome, descartadas: desc, linhasMalformadasDoAutor: novo.linhasMalformadas };
    try {
      const antigo = analisarAntigo(t.texto, turno, ca, null);
      caso.diferencas = comparar(novo, antigo);
      if (Object.keys(caso.diferencas).length) tot.logsComDiferenca++;
      const soAntiga = [...ca].filter(([k]) => !cn.has(k));
      caso.catalogoSoNaAntiga = soAntiga.slice(0, 10).map(([k, v]) => `${v}× ${k.slice(0, 120)}`);
      tot.catalogoChavesSoNaAntiga += soAntiga.length;
      tot.catalogoEventosSoNaAntiga += soAntiga.reduce((a, [, v]) => a + v, 0);
    } catch (erro) {
      tot.antigaLancaExcecao++;
      caso.excecaoNaRegraAntiga = erro.message;
    }
    tot.casos.push(caso);
  }
}
tot.segundos = Math.round((Date.now() - inicio) / 1000);
mkdirSync(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico'), { recursive: true });
const saida = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', `svc-mg-regra-${uf}-${turno}t.json`);
writeFileSync(saida, JSON.stringify(tot, null, 1));
const { casos, cargasAposVotacaoNoDia, ...cabeca } = tot;
console.log(JSON.stringify(cabeca, null, 1));
for (const c of casos) console.log(JSON.stringify(c));
console.log(`\nCarga (SCUE) no arquivo depois de a urna ter aberto/votado no dia: ${cargasAposVotacaoNoDia.length} logs`);
for (const c of cargasAposVotacaoNoDia) console.log(JSON.stringify(c));
console.log(`saída: ${saida}`);
