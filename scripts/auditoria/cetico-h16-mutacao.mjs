// Cético, parecer 32 (H16): teste de sanidade por mutação. Pega o log real de uma seção, altera linhas numa cópia em
// memória (nada é gravado em data/raw) e confere se a regra do matemático (sessoesDoPacote, exportada por
// matematico-h16-sessoes.mjs) e a regra do cético (analisarPacote, cetico-h16-sessoes.mjs) acusam a alteração.
// "Acusa" = aparece órfã, computado sem sessão, confirmação fora de sessão, vetor fora do padrão da seção,
// divergência entre cópias, ou o número de votos computados deixa de bater com o BU (falta/extra).
// Uso: node scripts/auditoria/cetico-h16-mutacao.mjs [--turno 2] [--uf rr]
//      (usa a 1ª seção da UF com 2 cópias do log, para testar também a divergência entre cópias)
import { open, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';
import { sessoesDoPacote } from './matematico-h16-sessoes.mjs';
import { analisarPacote } from './cetico-h16-sessoes.mjs';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, uf: { type: 'string', default: 'rr' } } });
const turno = Number(values.turno);
const DIA = { 1: '04/10/2026', 2: '25/10/2026' }[turno];

async function copias(arquivo) {
  const out = [];
  const leitor = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
  const descer = async (h, n) => { for (const e of await listarEntradas(h)) { const d = await lerEntrada(h, e); if (e.nome === 'logd.dat') out.push(d.toString('latin1')); else if (e.nome.endsWith('.jez') && n < 3) await descer(leitor(d), n + 1); } };
  const h = await open(arquivo);
  try { await descer(h, 0); } finally { await h.close(); }
  return out;
}

const { db } = await abrirLeitura();
const secoes = db.prepare("select municipio, zona, secao, hash, comparecimento from secao where turno = ? and uf = ? and situacao = 'completa' and tipo_arquivo = 'votacaoUE' order by municipio, zona, secao").all(turno, values.uf);
let alvo = null;
let textos = null;
for (const s of secoes) {
  const dir = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', values.uf, s.municipio, s.zona, s.secao, s.hash);
  const nome = (await readdir(dir)).find((n) => n.endsWith('-log.jez'));
  const c = await copias(path.join(dir, nome));
  if (c.length !== 2) continue;
  // as duas cópias precisam ter o dia da votação em comum (há pacotes com 2 logs que não se sobrepõem)
  const comuns = (() => { const a = new Set(c[0].split('\n').filter((l) => l.startsWith(DIA) && l.includes('\tEleitor foi habilitado\t'))); return c[1].split('\n').filter((l) => a.has(l)).length; })();
  if (comuns >= 60) { alvo = s; textos = c; break; }
}
if (!alvo) {
  // sem pacote com duas cópias sobrepostas na UF: simula a cópia MI/ME duplicando o log da 1ª seção com 1 cópia
  for (const s of secoes) {
    const dir = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', values.uf, s.municipio, s.zona, s.secao, s.hash);
    const c = await copias(path.join(dir, (await readdir(dir)).find((n) => n.endsWith('-log.jez'))));
    if (c.length === 1) { alvo = s; textos = [c[0], c[0]]; console.log('nenhum pacote da UF com 2 cópias sobrepostas: a 2ª cópia é o mesmo log duplicado'); break; }
  }
}
console.log(`seção ${values.uf}/${alvo.municipio}/${alvo.zona}/${alvo.secao}, BU ${alvo.comparecimento}, ${textos.length} cópias do log`);

const msg = (l) => (l.split('\t')[4] ?? '').replace(/\r$/, '');
const linhas = textos.map((t) => t.split('\n'));
// sessão de referência: na cópia mais longa, a 1ª habilitação do dia (da 50ª em diante) que está em todas as cópias,
// com todo o ciclo até o computado
const ref = linhas.reduce((a, ls, i) => (ls.length > linhas[a].length ? i : a), 0);
const conjuntos = linhas.map((ls) => new Set(ls));
const idxHab = linhas[ref].map((l, i) => (l.startsWith(DIA) && msg(l) === 'Eleitor foi habilitado' && conjuntos.every((c) => c.has(l)) ? i : -1)).filter((i) => i >= 0);
console.log(`cópias com ${linhas.map((ls) => ls.length).join(' e ')} linhas; ${idxHab.length} habilitações do dia presentes em todas as cópias`);
const h0 = idxHab[Math.min(50, idxHab.length - 1)];
let c0 = h0;
while (msg(linhas[ref][c0]) !== 'O voto do eleitor foi computado') c0++;
const hab = linhas[ref][h0];
const comp = linhas[ref][c0];
const ciclo = linhas[ref].slice(h0, c0 + 1);
const pres = ciclo.find((l) => msg(l) === 'Voto confirmado para [Presidente]');
const novoHash = (l, sufixo) => l.replace(/\t[0-9A-F]{16}(\r?)$/, `\t${sufixo}$1`);
const trocaHora = (l, hhmmss) => l.replace(/^(\d\d\/\d\d\/\d{4}) \d\d:\d\d:\d\d/, `$1 ${hhmmss}`);

// cada mutação recebe a lista de linhas de uma cópia e o índice da cópia, e devolve a nova lista
const MUT = {
  'M0 sem alteração': (ls) => ls,
  'M1 apaga o "computado" de um eleitor': (ls) => ls.filter((l) => l !== comp),
  'M2 apaga a "habilitação" de um eleitor': (ls) => ls.filter((l) => l !== hab),
  'M3 apaga o ciclo inteiro de um eleitor': (ls) => ls.filter((l) => !ciclo.includes(l)),
  'M4 insere um ciclo inteiro falso (cópia de um ciclo, outro hash)': (ls) => { const i = ls.indexOf(comp); return [...ls.slice(0, i + 1), ...ciclo.map((l, k) => novoHash(l, `FA${String(k).padStart(14, '0')}`)), ...ls.slice(i + 1)]; },
  'M5 insere um "computado" solto (outro hash)': (ls) => { const i = ls.indexOf(comp); return [...ls.slice(0, i + 1), novoHash(comp, 'FB'.padEnd(16, 'A')), ...ls.slice(i + 1)]; },
  'M6 repete a linha do "computado" idêntica (mesmo hash)': (ls) => { const i = ls.indexOf(comp); return [...ls.slice(0, i + 1), comp, ...ls.slice(i + 1)]; },
  'M7 troca o "computado" por um reinício ("Urna ligada em")': (ls) => ls.map((l) => (l === comp ? l.replace('O voto do eleitor foi computado', 'Urna ligada em 25/10/2026 às 10:00:00') : l)),
  'M8 apaga o "computado" só numa das cópias': (ls, ic) => (ic === ref ? ls.filter((l) => l !== comp) : ls),
  'M9 apaga a confirmação de Presidente de um eleitor': (ls) => ls.filter((l) => l !== pres),
  'M10 insere uma habilitação sem desfecho antes de outra': (ls) => { const i = ls.indexOf(hab); return [...ls.slice(0, i), novoHash(hab, 'FC'.padEnd(16, 'A')), ...ls.slice(i)]; },
  'M11 corrompe a data da linha do "computado"': (ls) => ls.map((l) => (l === comp ? l.replace(/^25\/10/, '25/1O').replace(/^04\/10/, '04/1O') : l)),
  'M12 ciclo falso numa urna inventada, sem "Seção Eleitoral"': (ls) => [...ls, ...ciclo.map((l, k) => novoHash(l.replace(/\t\d{8}\t/, '\t99999999\t'), `FD${String(k).padStart(14, '0')}`))],
  'M13 ciclo falso com "computado" fora de ordem (antes das confirmações)': (ls) => { const i = ls.indexOf(comp); const f = ciclo.map((l, k) => novoHash(l, `FE${String(k).padStart(14, '0')}`)); const cc = f.pop(); return [...ls.slice(0, i + 1), f[0], cc, ...f.slice(1), ...ls.slice(i + 1)]; },
  'M14 ciclo falso com hora repetida (mesmo segundo do original)': (ls) => { const i = ls.indexOf(comp); return [...ls.slice(0, i + 1), ...ciclo.map((l, k) => novoHash(trocaHora(l, comp.slice(11, 19)), `F0${String(k).padStart(14, '0')}`)), ...ls.slice(i + 1)]; },
};

const modal = (vet) => { const o = Object.entries(vet).sort((a, b) => b[1] - a[1]); return o.slice(1).reduce((a, [, n]) => a + n, 0); };
const linhasTabela = [];
for (const [nome, f] of Object.entries(MUT)) {
  const mut = linhas.map((ls, ic) => ({ texto: f(ls, ic).join('\n') }));
  const m = sessoesDoPacote(mut, DIA, alvo.secao);
  const c = analisarPacote(mut, DIA, alvo.secao);
  const difM = alvo.comparecimento - m.computadosPropria;
  const difC = alvo.comparecimento - c.computados;
  const acusaM = [m.O && `órfã ${m.O}`, m.computadoSemSessao && `computado sem sessão ${m.computadoSemSessao}`, m.confForaDeCiclo && `conf. fora ${m.confForaDeCiclo}`,
    modal(m.vetores) && `vetor fora ${modal(m.vetores)}`, difM > 0 && `falta ${difM}`, difM < 0 && `extra ${-difM}`, m.I && `interrupção ${m.I}`].filter(Boolean).join(', ') || 'nada';
  const acusaC = [c.O && `órfã ${c.O}`, c.computadoSemSessao && `computado sem sessão ${c.computadoSemSessao}`, c.confFora && `conf. fora ${c.confFora}`,
    modal(c.vetores) && `vetor fora ${modal(c.vetores)}`, difC > 0 && `falta ${difC}`, difC < 0 && `extra ${-difC}`, c.I && `interrupção ${c.I}`,
    c.divergenciaEntreCopias && `cópias divergem ${c.divergenciaEntreCopias}`, c.computadoDuplicadoMesmaCopia && `computado repetido ${c.computadoDuplicadoMesmaCopia}`].filter(Boolean).join(', ') || 'nada';
  linhasTabela.push(`| ${nome} | ${acusaM} | ${acusaC} |`);
}
console.log('| Mutação | Regra do matemático acusa | Regra do cético acusa |\n|---|---|---|');
console.log(linhasTabela.join('\n'));
