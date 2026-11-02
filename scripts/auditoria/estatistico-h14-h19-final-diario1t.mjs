// Estatístico eleitoral, H14(b) do plano 31 (commit 067d1a7): leitura do diário do dia da votação nas seções que votaram
// com urna reserva (BU do turno = reserva), para medir a interrupção causada pela troca.
//   --turno 1 (principal): as 3.033 seções com tipo1 = reservaSecao em reservas-1t2t/secoes.csv, dia 04/10/2026;
//   --turno 2 (comparação, exploratória): as contingências do dia 25/10 (classe contingencia_dia_*), 1.838 seções.
// Para cada seção: todos os pacotes no disco (pelo caminho da seção; data/raw não é varrido), logd.dat e .jez aninhados
// (estatistico-h08-varredura.mjs: textos, fluxosDoTexto, juntarCopias 'uniao'), só as linhas da seção declarada.
// Por urna: votos e horário de cada voto, primeira e última linha do dia, contagem do leitor (lib). Por seção:
//   classe: C1 contingência no dia com votos na original; C2 contingência no dia, original sem votos; C3 só a urna do BU
//           tem linhas no dia (reserva instalada antes); C4 sem linhas legíveis da urna do BU;
//   D: maior intervalo sem voto entre 08:00 e o último voto (união das urnas), em minutos;
//   intervalo da troca: último voto da original → 1º voto da urna do BU (C1) ou 08:00 → 1º voto (C2);
//   "Início do procedimento de contingência" (data e hora) no log da urna do BU, critério do engenheiro;
//   retrocessos de relógio no dia na urna do BU.
// Nenhum título é gravado.
//
// Uso: node --max-old-space-size=4096 scripts/auditoria/estatistico-h14-h19-final-diario1t.mjs --turno 1
// Saída: data/parsed/auditoria/estatistico/h14-h19-final/diario-reservas-<t>t.jsonl
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { fluxosDoTexto, juntarCopias, textos } from './estatistico-h08-varredura.mjs';
import { DIR_FINAL, contarFluxo, lerCsv, novaContagem } from './estatistico-h14-h19-final-lib.mjs';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '1' }, secoes: { type: 'string' } } });
const turno = values.turno;
const DIA = turno === '1' ? '04/10/2026' : '25/10/2026';
const memoria = (buf) => ({ read: async (d, o, n, p) => ({ bytesRead: buf.copy(d, o, p, p + n) }), stat: async () => ({ size: buf.length }) });
const seg = (l) => Number(l.slice(11, 13)) * 3600 + Number(l.slice(14, 16)) * 60 + Number(l.slice(17, 19));
const hhmm = (s) => (s == null ? null : `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`);

const tab = await lerCsv(path.join(DIR_DADOS, 'parsed', 'auditoria', 'reservas-1t2t', 'secoes.csv'));
let alvo = turno === '1' ? tab.filter((o) => o.tipo1 === 'reservaSecao') : tab.filter((o) => o.classe.startsWith('contingencia_dia'));
if (values.secoes) { const q = new Set(values.secoes.split(',')); alvo = alvo.filter((o) => q.has(`${o.uf}/${o.municipio}/${o.zona}/${o.secao}`)); }
await mkdir(DIR_FINAL, { recursive: true });
const out = createWriteStream(path.join(DIR_FINAL, values.secoes ? `diario-reservas-${turno}t-teste.jsonl` : `diario-reservas-${turno}t.jsonl`));
const t0 = Date.now();
let n = 0, erros = 0;
for (const o of alvo) {
  const id = `${o.uf}/${o.municipio}/${o.zona}/${o.secao}`;
  const urnaBu = Number(turno === '1' ? o.urna1 : o.urna2);
  const reg = { id, classeDoc07: o.classe, urnaBu, urnas: {}, contingencias: [], erro: null };
  try {
    const dirSec = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', o.uf, o.municipio, o.zona, o.secao);
    const hashes = new Set(), copias = new Map(), outras = { n: 0 }, contVistas = new Set();
    let pacotes = 0;
    for (const h of (await readdir(dirSec, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name)) {
      const dir = path.join(dirSec, h);
      const log = acharArquivo(await readdir(dir), 'log');
      if (!log) continue;
      pacotes++;
      const bytes = await readFile(path.join(dir, log));
      const sh = createHash('sha256').update(bytes).digest('hex');
      if (hashes.has(sh)) continue;
      hashes.add(sh);
      for (const tx of await textos(memoria(bytes))) {
        for (const linha of tx.split('\n')) {
          if (!linha.includes('Início do procedimento de contingência')) continue;
          const c = linha.replace(/\r$/, '').split('\t');
          const k = `${c[0]}|${c[2]}`;
          if (contVistas.has(k)) continue;
          contVistas.add(k);
          reg.contingencias.push({ dataHora: c[0], urna: Number(c[2]) });
        }
        for (const [urna, linhas] of fluxosDoTexto(tx, DIA, o.secao, outras)) {
          if (!copias.has(urna)) copias.set(urna, []);
          copias.get(urna).push(linhas);
        }
      }
    }
    reg.pacotes = pacotes;
    const todosVotos = [];
    for (const [urna, lista] of copias) {
      const linhas = juntarCopias(lista, 'uniao').linhas;
      const s = novaContagem();
      contarFluxo(linhas, s);
      const votos = [];
      let retro = 0, ant = -1;
      for (const l of linhas) {
        const t = seg(l);
        if (t < ant) retro++;
        ant = Math.max(ant, t);
        if (l.split('	')[4] === 'O voto do eleitor foi computado') votos.push(t);
      }
      votos.sort((a, b) => a - b);
      todosVotos.push(...votos);
      reg.urnas[Number(urna)] = { linhas: linhas.length, primeira: linhas[0]?.slice(11, 19), ultima: linhas.at(-1)?.slice(11, 19), votos: votos.length,
        primeiroVoto: hhmm(votos[0]), ultimoVoto: hhmm(votos.at(-1)), pV: votos[0] ?? null, uV: votos.at(-1) ?? null, retrocessos: retro,
        R: s.R, F: s.F, ano: s.ano, tent: s.tentEleitor, F0: s.cap[0] };
    }
    todosVotos.sort((a, b) => a - b);
    // Abertura às 8 h de Brasília, no relógio local da urna (horário único desde 2022): AC −2 h; AM, RO, RR, MT e MS −1 h.
    // (Desvio do plano declarado no doc 32: o plano dizia 08:00 sem fuso. O oeste do AM, −2 h, fica com −1 h.)
    const ab = (8 + ({ ac: -2, am: -1, ro: -1, rr: -1, mt: -1, ms: -1 }[o.uf] ?? 0)) * 3600;
    reg.aberturaLocal = hhmm(ab);
    let D = 0;
    if (todosVotos.length) {
      let prev = ab;
      for (const t of todosVotos) { if (t >= ab) { D = Math.max(D, t - prev); prev = t; } }
    }
    reg.Dmin = D / 60;
    reg.votosDia = todosVotos.length;
    reg.ultimoVotoDia = hhmm(todosVotos.at(-1));
    const bu = reg.urnas[urnaBu];
    const outrasU = Object.entries(reg.urnas).filter(([u]) => Number(u) !== urnaBu);
    const votosOrig = outrasU.reduce((a, [, x]) => a + x.votos, 0);
    if (!bu || !bu.linhas) reg.classe = 'C4';
    else if (outrasU.some(([, x]) => x.votos > 0)) reg.classe = 'C1';
    else if (outrasU.some(([, x]) => x.linhas > 0)) reg.classe = 'C2';
    else reg.classe = 'C3';
    reg.votosOriginal = votosOrig;
    if (reg.classe === 'C1') {
      const uOrig = Math.max(...outrasU.map(([, x]) => x.uV ?? -1));
      reg.intervaloTrocaMin = bu.pV != null && uOrig >= 0 ? (bu.pV - uOrig) / 60 : null;
    } else if (reg.classe === 'C2') reg.intervaloTrocaMin = bu.pV != null ? (bu.pV - ab) / 60 : null;
    else reg.intervaloTrocaMin = null;
    const contDia = reg.contingencias.filter((c) => c.dataHora.startsWith(DIA) && c.urna === urnaBu);
    const contBu = reg.contingencias.filter((c) => c.urna === urnaBu);
    reg.contingenciaEngenheiro = contDia.length ? 'no dia' : contBu.length ? 'antes do dia' : 'sem registro';
    for (const x of Object.values(reg.urnas)) { delete x.pV; delete x.uV; }
  } catch (e) { reg.erro = e.message; erros++; }
  out.write(`${JSON.stringify(reg)}\n`);
  if (++n % 500 === 0) console.log(`${n}/${alvo.length} · ${erros} erro(s) · ${((Date.now() - t0) / 60000).toFixed(1)} min`);
}
await new Promise((r) => out.end(r));
console.log(`RESUMO turno ${turno}: ${n} seções, ${erros} erro(s), ${((Date.now() - t0) / 60000).toFixed(1)} min`);
