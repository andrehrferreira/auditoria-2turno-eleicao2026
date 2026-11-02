// Cético 56: resumo das saídas de cetico-56-h09b.mjs (só contagens) em tabelas para o parecer 56.
//   - H09b: proporções por grupo (sessão atual, anterior, seguinte, vizinha habilitada), repetição na urna, UF,
//     unicidade nacional, mesário eleitor × não eleitor (classe corrigida), exceções em sessão por CPF;
//   - teste de regra (novo): a recusa depende do tipo de identificação da sessão? Compara o "válido" sem papel em
//     sessões por CPF com duas previsões: (R2) recusa pelo cadastro do eleitor em cabine; (R5) recusa só quando o
//     número é igual ao identificador digitado (título) da sessão;
//   - H04: votos do dia por nº de etapas desde o último marcador de ligação.
// Uso: node scripts/auditoria/cetico-56-resumo.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';

const dir = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '56');
const pct = (a, b) => (b ? +(100 * a / b).toFixed(2) : null);
const out = {};
for (const t of [1, 2]) {
  const j = JSON.parse(readFileSync(path.join(dir, `h09b-h04-${t}t.json`), 'utf8'));
  const h = j.h09;
  const tipo = (obj, g) => ['T', 'C', 'O', '?', '-'].reduce((o, x) => ((o[x] = obj[`${g}|${x}`] || 0), o), {});
  const grupos = {};
  for (const g of Object.keys(h.linhas)) {
    const at = tipo(h.atual, g), an = tipo(h.anterior, g), se = tipo(h.seguinte, g), ah = tipo(h.anteriorHab, g), sh = tipo(h.seguinteHab, g);
    const rep = {};
    for (const [k, n] of Object.entries(h.repeticaoNaUrna)) if (k.startsWith(`${g}|`)) rep[k.split('|')[1]] = n;
    const repTot = Object.values(rep).reduce((s, x) => s + x, 0);
    grupos[g] = {
      linhas: h.linhas[g], sessoes: h.sessoes[g],
      atualT: pct(at.T, at.T + at.C), atual: at,
      anteriorT: pct(an.T, an.T + an.C), seguinteT: pct(se.T, se.T + se.C),
      anteriorHabT: pct(ah.T, ah.T + ah.C), seguinteHabT: pct(sh.T, sh.T + sh.C),
      numerosNaUrna: repTot, numerosEmUmaSessao: rep['1'] || 0, pctUmaSessao: pct(rep['1'] || 0, repTot),
      ufMesma: pct(h.ufIgual[`${g}|mesma`] || 0, (h.ufIgual[`${g}|mesma`] || 0) + (h.ufIgual[`${g}|outra`] || 0)),
      desfecho: Object.fromEntries(Object.entries(h.desfecho).filter(([k]) => k.startsWith(`${g}|`)).map(([k, n]) => [k.slice(g.length + 1), n])),
    };
  }
  const bt = h.baseTipo, tr = h.transicao, bth = h.baseTipoHabilitada, trh = h.transicaoHabilitada;
  const base = {
    sessoes: Object.values(bt).reduce((s, x) => s + x, 0), tipos: bt, pctT: pct(bt.T, bt.T + bt.C),
    habilitadas: Object.values(bth).reduce((s, x) => s + x, 0), pctTHabilitadas: pct(bth.T, bth.T + bth.C),
    pctTSeAnteriorT: pct(tr['T>T'], (tr['T>T'] || 0) + (tr['T>C'] || 0)), pctTSeAnteriorC: pct(tr['C>T'], (tr['C>T'] || 0) + (tr['C>C'] || 0)),
    pctTSeAnteriorTHab: pct(trh['T>T'], (trh['T>T'] || 0) + (trh['T>C'] || 0)),
  };
  // teste de regra R2 × R5
  const S = h.sessoesComSuspensaoPorTipo, G = h.sessoesComSuspensaoPorTipoGrupos;
  const sT = S.T || 0, sC = S.C || 0;
  const vT = G['V:semPapel|T'] || 0, vC = G['V:semPapel|C'] || 0, iT = G['I:semPapel|T'] || 0, iC = G['I:semPapel|C'] || 0;
  const regra = {
    sessoesComSuspensao: { T: sT, C: sC, pctT: pct(sT, sT + sC) },
    recusadoSemPapel: { T: iT, C: iC, taxaPorSessaoT: pct(iT, sT), taxaPorSessaoC: pct(iC, sC) },
    aceitoSemPapel: { T: vT, C: vC, taxaPorSessaoT: pct(vT, sT), taxaPorSessaoC: pct(vC, sC) },
    previsaoR2_aceitoSemPapelEmCPF: Math.round(vT / sT * sC),
    previsaoR5_aceitoSemPapelEmCPF: Math.round((vT + iT) / sT * sC),
    observado_aceitoSemPapelEmCPF: vC,
  };
  out[`${t}t`] = {
    geral: j.geral, minutos: j.minutos, base, grupos, regra,
    mesario: { classes: h.mesariosPorClasse, conflito: h.conflitoClasseMesario, eleitorDaSecao: h.mesarioEleitor, naoEleitorDaSecao: h.mesarioNaoEleitor, semInformacao: h.mesarioSemInfo },
    tentativaSeguinteAoRecusadoSemPapel: h.tentativaSeguinte, distanciaAoMesarioMaisProximo: h.distanciaMesario,
    comprimentoDoNumero: h.comprimento, foraDeSessao: h.foraDeSessao, numeroNaoNumerico: h.numeroNaoNumerico,
    excecoesRecusadoSemPapelForaDeTitulo: h.excecoesCPF, nacional: j.nacional,
    h04: { votosDia: j.h04.votosDia, votosSemMarcador: j.h04.votosSemMarcador, votosSemEtapaDesdeLigar: j.h04.votosSemEtapaDesdeLigar, votosComFalhaDesdeLigar: j.h04.votosComFalhaDesdeLigar, votosPorEtapasDesdeLigar: j.h04.votosPorEtapasDesdeLigar, exemplos: j.h04.exemplosSuspeitos },
  };
}
const texto = JSON.stringify(out, null, 1);
if (/(?<!\d)\d{10,12}(?!\d)/.test(texto.replace(/: \d+/g, ': 0'))) throw new Error('trava: 10 a 12 dígitos seguidos num texto');
writeFileSync(path.join(dir, 'resumo.json'), texto);
console.log(texto);
