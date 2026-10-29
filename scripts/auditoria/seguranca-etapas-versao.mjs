// Versão do software e etapas de "Verificação de assinatura" no log (perfil engenheiro-seguranca-urna).
// Lê <uf>.secoes.jsonl e o dicionário de impressões digitais de etapas de seguranca-varrer-logs.mjs e confere, por pacote:
//   - versão da aplicação (todas as aplicações, todo o log) e versões de firmware/UEFI;
//   - em cada boot que alcança o dia da votação: nº de etapas de verificação do GAP, impressão digital da sequência
//     (comparada com a mais comum do mesmo modelo), etapa que não terminou em SUCESSO;
//   - boot em que a urna recebeu votos sem nenhuma etapa de verificação registrada;
//   - MV original registrada na MI × MV presente; resultado da verificação da mídia externa; turno, fase e modo de carga;
//   - modelo e nº interno da urna do log × banco (.vsc/BU); mais de um nº de urna no mesmo logd.dat; retrocessos do relógio.
// Uso: node scripts/auditoria/seguranca-etapas-versao.mjs [--turno 2]
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, dir: { type: 'string' } } });
const turno = Number(values.turno);
const base = path.join(DIR_DADOS, 'parsed', 'auditoria', 'engenheiro-seguranca-urna');
const dir = values.dir ?? path.join(base, `${turno}t`);
const VERSAO = '10.23.0.0 - Praia da Barra do Cahy';
const TURNO_UE = { 1: '1º turno', 2: '2º turno' }[turno];

const { db, fonte, ponteiro } = await abrirLeitura();
console.error(`banco: ${fonte}; cargas na cópia: ${JSON.stringify(ponteiro?.cargas ?? null)}`);
const banco = new Map(db.prepare('SELECT uf, municipio, zona, secao, hash, modelo_urna, numero_interno_urna, tipo_urna, tipo_arquivo FROM secao WHERE turno = ?')
  .all(turno).map((r) => [`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, r]));

const dicionario = {};
const cont = {
  pacotes: 0, logs: 0, bootsDia: 0, bootsVotacao: 0, versaoApp: {}, outrasVersoes: {}, impressaoPorModelo: {}, etapasPorModelo: {},
  qtdEtapasBootsVotacao: {}, falhasVerificacao: 0, etapasNaoSucesso: 0, votacaoSemEtapas: 0, mvDiferente: 0, midiaNaoZero: 0,
  turnoFaseModo: 0, modeloDiverge: 0, urnaDiverge: 0, variasUrnasNoLog: 0, logsComRetrocesso: 0, retrocessos: 0, retrocessosSemAjusteNoTurno: 0, semBootNoDia: 0,
};
const achados = [];
const todosBoots = [];
const anotar = (tipo, id, detalhe) => achados.push({ tipo, id, ...detalhe });
const inc = (obj, k, n = 1) => { obj[k] = (obj[k] ?? 0) + n; };

const arquivos = readdirSync(dir).filter((n) => n.endsWith('.secoes.jsonl')).sort();
for (const arq of arquivos) {
  const uf = arq.split('.')[0];
  Object.assign(dicionario, JSON.parse(readFileSync(path.join(dir, `${uf}.catalogo.json`), 'utf8')).dicionarioEtapas);
  for (const linha of readFileSync(path.join(dir, arq), 'utf8').split('\n')) {
    if (!linha) continue;
    const r = JSON.parse(linha);
    const id = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
    const b = banco.get(id);
    cont.pacotes++;
    let votosPacote = 0;
    for (const l of r.logs) {
      cont.logs++;
      for (const [k, n] of Object.entries(l.versoes)) {
        const [app, msg] = k.split('\t');
        if (msg.startsWith('Versão da aplicação')) {
          const v = msg.slice(21).trim();
          inc(cont.versaoApp, `${app} | ${v}`, n);
          if (v !== VERSAO) anotar('versaoDiferente', id, { app, versao: v, profundidade: l.profundidade });
        } else inc(cont.outrasVersoes, `${l.modelo} | ${app} | ${msg}`);
      }
      if (l.falhasVerificacao.length) { cont.falhasVerificacao++; anotar('falhaVerificacao', id, { falhas: l.falhasVerificacao, profundidade: l.profundidade }); }
      if (l.urnas.length > 1) { cont.variasUrnasNoLog++; anotar('variasUrnasNoLog', id, { urnas: l.urnas, profundidade: l.profundidade }); }
      if (l.retrocessos > 0) {
        cont.logsComRetrocesso++; cont.retrocessos += l.retrocessos;
        // Relógio voltando no período do turno sem mensagem de ajuste de data/hora logo antes: vai para a lista
        for (const x of l.retrocessosLista.filter((x) => x.periodo !== 'pre' && !x.aposAjuste)) { cont.retrocessosSemAjusteNoTurno++; anotar('retrocessoSemAjusteNoTurno', id, { ...x, profundidade: l.profundidade }); }
      }
      if (r.tipoPacote === 'urna' && l.profundidade === 0 && l.boots.length === 0) { cont.semBootNoDia++; anotar('semBootNoDia', id, { modelo: l.modelo }); }
      for (const boot of l.boots) {
        cont.bootsDia++;
        const votacao = boot.pronta || boot.votos > 0;
        votosPacote += boot.votos;
        inc(cont.impressaoPorModelo, `${r.uf}:${boot.modelo} | ${boot.impressao}`); // a lista de arquivos depende da UF (nº de eleições no turno)
        todosBoots.push({ id, chave: `${r.uf}:${boot.modelo}`, modelo: boot.modelo, h: boot.impressao, etapas: boot.etapas, votacao: boot.pronta || boot.votos > 0, votos: boot.votos, ligada: boot.ligada, ultimaLinha: boot.ultimaLinha, apps: boot.apps, profundidade: l.profundidade });
        if (boot.etapasNaoSucesso > 0) { cont.etapasNaoSucesso++; anotar('etapaNaoSucesso', id, { boot: boot.ligada, n: boot.etapasNaoSucesso }); }
        if (!votacao) continue;
        cont.bootsVotacao++;
        inc(cont.qtdEtapasBootsVotacao, `${boot.modelo} | ${boot.etapas}`);
        if (boot.etapas === 0) { cont.votacaoSemEtapas++; anotar('votacaoSemEtapas', id, { boot: boot.ligada, modelo: boot.modelo, votos: boot.votos, apps: boot.apps, profundidade: l.profundidade }); }
        if (boot.mvOriginal && boot.mv && boot.mvOriginal !== boot.mv) { cont.mvDiferente++; anotar('mvDiferente', id, { boot: boot.ligada, profundidade: l.profundidade }); }
        if ((boot.midiaEstatica ?? '0') !== '0' || (boot.midiaDinamica ?? '0') !== '0') { cont.midiaNaoZero++; anotar('midiaNaoZero', id, { estatica: boot.midiaEstatica, dinamica: boot.midiaDinamica, boot: boot.ligada }); }
        if ((boot.turnoUe && boot.turnoUe !== TURNO_UE) || (boot.fase && boot.fase !== 'Oficial') || (boot.modoCarga && boot.modoCarga !== 'Votação')) {
          cont.turnoFaseModo++; anotar('turnoFaseModo', id, { turnoUe: boot.turnoUe, fase: boot.fase, modoCarga: boot.modoCarga, boot: boot.ligada });
        }
        for (const v of boot.versoes) if (v !== VERSAO) anotar('versaoBootVotacao', id, { versao: v, boot: boot.ligada });
      }
    }
    // Log da urna instalada × banco (.vsc e BU)
    const instalado = r.logs.find((l) => l.profundidade === 0);
    if (b && instalado && r.tipoPacote === 'urna') {
      if (instalado.modelo && b.modelo_urna && instalado.modelo.toLowerCase() !== b.modelo_urna) { cont.modeloDiverge++; anotar('modeloDiverge', id, { log: instalado.modelo, banco: b.modelo_urna }); }
      const numeros = instalado.urnas.map(Number);
      if (b.numero_interno_urna && !numeros.includes(b.numero_interno_urna)) { cont.urnaDiverge++; anotar('urnaDiverge', id, { log: instalado.urnas, banco: b.numero_interno_urna, tipoUrna: b.tipo_urna, arquivo: b.tipo_arquivo }); }
    }
  }
}

// Impressão digital mais comum por UF e modelo, e desvios (multiconjunto de arquivos: falta, sobra ou repete)
const modal = {};
for (const [k, n] of Object.entries(cont.impressaoPorModelo)) {
  const [modelo, h] = k.split(' | ');
  if (h !== 'null' && (!modal[modelo] || n > modal[modelo].n)) modal[modelo] = { h, n };
}
const diferencas = {};
for (const [k, n] of Object.entries(cont.impressaoPorModelo)) {
  const [modelo, h] = k.split(' | ');
  if (h === 'null' || !modal[modelo] || h === modal[modelo].h) continue;
  const contar = (etapas) => {
    const c = {};
    for (const e of etapas) { const p = e.split(':').slice(1).join(':'); c[p] = (c[p] ?? 0) + 1; }
    return c;
  };
  const ref = contar(dicionario[modal[modelo].h].etapas);
  const atual = contar(dicionario[h].etapas);
  const chaves = [...new Set([...Object.keys(ref), ...Object.keys(atual)])];
  diferencas[k] = {
    boots: n, etapas: dicionario[h].etapas.length, etapasModal: dicionario[modal[modelo].h].etapas.length,
    faltam: chaves.filter((e) => (atual[e] ?? 0) < (ref[e] ?? 0)).map((e) => `${e} ×${(ref[e] ?? 0) - (atual[e] ?? 0)}`),
    sobram: chaves.filter((e) => (atual[e] ?? 0) > (ref[e] ?? 0)).map((e) => `${e} ×${(atual[e] ?? 0) - (ref[e] ?? 0)}`),
  };
}

// Boots cuja sequência de etapas difere da modal do modelo (etapa faltando, a mais ou com ERRO)
for (const b of todosBoots) {
  if (!b.h || !modal[b.chave] || b.h === modal[b.chave].h) continue;
  anotar(b.votacao ? 'impressaoDiferenteEmBootDeVotacao' : 'impressaoDiferenteSemVotacao', b.id, b);
}

const porTipo = {};
for (const a of achados) (porTipo[a.tipo] ??= []).push(a);
writeFileSync(path.join(base, `etapas-versao-${turno}t.json`), JSON.stringify({ turno, ufs: arquivos.length, cont, modal, diferencas, dicionarioModal: Object.fromEntries(Object.entries(modal).map(([m, { h }]) => [m, dicionario[h]])), achados: porTipo }, null, 1));

console.log(`UFs ${arquivos.length}; pacotes ${cont.pacotes}; logs ${cont.logs}; boots que alcançam o dia ${cont.bootsDia}; boots com votação ${cont.bootsVotacao}`);
console.log('\nVersão da aplicação (eventos):', cont.versaoApp);
console.log('\nOutras versões (logs):', cont.outrasVersoes);
console.log('\nQuantidade de etapas nos boots com votação (modelo | etapas → boots):', cont.qtdEtapasBootsVotacao);
console.log('\nImpressão digital modal por modelo:', modal);
console.log('\nImpressões diferentes da modal:', JSON.stringify(diferencas, null, 1));
for (const k of ['falhasVerificacao', 'etapasNaoSucesso', 'votacaoSemEtapas', 'mvDiferente', 'midiaNaoZero', 'turnoFaseModo', 'modeloDiverge', 'urnaDiverge', 'variasUrnasNoLog', 'logsComRetrocesso', 'retrocessos', 'retrocessosSemAjusteNoTurno', 'semBootNoDia']) console.log(`${k}: ${cont[k]}`);
for (const [tipo, lista] of Object.entries(porTipo)) {
  console.log(`\n## ${tipo}: ${lista.length}`);
  for (const a of lista.slice(0, 15)) console.log(JSON.stringify(a));
}

// Mídia externa com resultado de verificação ≠ 0 × execução do aplicativo VERIFICAÇÃO DE ASSINATURAS no mesmo período
const arqCatalogo = path.join(base, `catalogo-nacional-${turno}t.json`);
try {
  const cat = JSON.parse(readFileSync(arqCatalogo, 'utf8')).mensagens;
  const comVerificacao = new Set();
  for (const per of ['dia', 'prep']) {
    for (const a of cat[`${per}\tINFO\tGAP\tIniciando aplicação VERIFICAÇÃO DE ASSINATURAS`]?.amostra ?? []) comVerificacao.add(a.split('*')[0]);
  }
  const midia = (porTipo.midiaNaoZero ?? []).map((a) => a.id);
  const juntos = midia.filter((id) => comVerificacao.has(id));
  console.log(`\nmídia externa ≠ 0: ${midia.length} boots; destes, em seções que rodaram VERIFICAÇÃO DE ASSINATURAS (prep/dia, amostra do catálogo): ${juntos.length}`);
} catch (erro) {
  if (erro.code !== 'ENOENT') throw erro;
}
