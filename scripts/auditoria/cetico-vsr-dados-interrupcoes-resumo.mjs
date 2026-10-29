// Cético, achado "votos sem rastro no log": resume cetico-vsr-dados-interrupcoes-<t>t.jsonl (todos os ciclos
// interrompidos dos dois turnos) em sinais técnicos do log, por classe de pacote (k = BU − computados no log):
//   abrupto   = o log salta da última linha do ciclo para "Início das operações do logd", sem "Urna desligada pela
//               chave" nem "Fechando o arquivo de Log" (queda de energia/travamento: a cauda do log pode se perder);
//   completo  = o último cargo da cédula (presidente) foi confirmado;
//   syncMI    = ao voltar, "Origem da sincronização dos arquivos dinâmicos na MI";
//   jaVotou   = ao voltar, antes da próxima habilitação, "O eleitor identificado já votou".
// Uso: node scripts/auditoria/cetico-vsr-dados-interrupcoes-resumo.mjs
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';

const dir = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');
const saida = {};
for (const turno of [1, 2]) {
  const linhas = (await readFile(path.join(dir, `cetico-vsr-dados-interrupcoes-${turno}t.jsonl`), 'utf8')).split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const t = {};
  const casos = [];
  for (const r of linhas) {
    const classe = r.k > 0 ? 'virouVoto' : r.k === 0 ? 'naoVirou' : 'logMaiorQueBu';
    const g = (t[classe] ??= { pacotes: 0, ciclos: 0, comConfirmacao: 0, completos: 0, abruptos: 0, abruptosComConfirmacao: 0, abruptosCompletos: 0, syncMI: 0, jaVotou: 0,
      completosSyncMI: 0, completosJaVotou: 0, pacotesComAbruptoComConfirmacao: 0, pacotesComCompleto: 0, pacotesComCompletoAbrupto: 0 });
    g.pacotes++;
    let pacAbr = false;
    let pacComp = false;
    let pacCompAbr = false;
    for (const c of r.ciclos) {
      g.ciclos++;
      const abrupto = c.evento === 'Urna ligada em' && !c.depois.some((m) => m.startsWith('Urna desligada pela chave') || m.startsWith('Fechando o arquivo de Log'));
      const sync = (c.aposVolta ?? []).some((m) => m.startsWith('Origem da sincronização dos arquivos dinâmicos na MI'));
      const ja = (c.aposVolta ?? []).some((m) => m.startsWith('O eleitor identificado já votou'));
      if (c.conf.length) g.comConfirmacao++;
      if (c.completo) g.completos++;
      if (abrupto) g.abruptos++;
      if (abrupto && c.conf.length) {
        g.abruptosComConfirmacao++;
        pacAbr = true;
      }
      if (abrupto && c.completo) {
        g.abruptosCompletos++;
        pacCompAbr = true;
      }
      if (c.completo) pacComp = true;
      if (sync) g.syncMI++;
      if (ja) g.jaVotou++;
      if (c.completo && sync) g.completosSyncMI++;
      if (c.completo && ja) g.completosJaVotou++;
      if (classe !== 'naoVirou' || sync || ja) casos.push({ classe, secao: r.secao, k: r.k, inicio: c.inicio, conf: c.conf.join(','), completo: c.completo, abrupto, syncMI: sync, jaVotou: ja });
    }
    if (pacAbr) g.pacotesComAbruptoComConfirmacao++;
    if (pacComp) g.pacotesComCompleto++;
    if (pacCompAbr) g.pacotesComCompletoAbrupto++;
  }
  saida[turno] = { classes: t, casos };
  console.log(`\n=== ${turno}º turno: ${linhas.length} pacotes com ciclo interrompido`);
  for (const [k, g] of Object.entries(t)) console.log(`[${k}] ${JSON.stringify(g)}`);
  for (const c of casos) console.log(`   ${c.classe} ${c.secao} k=${c.k} ${c.inicio} conf[${c.conf}] completo=${c.completo} abrupto=${c.abrupto} syncMI=${c.syncMI} jaVotou=${c.jaVotou}`);
}
await writeFile(path.join(dir, 'cetico-vsr-dados-interrupcoes-resumo.json'), `${JSON.stringify(saida, null, 1)}\n`);
