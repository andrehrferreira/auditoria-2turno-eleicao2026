import { createReadStream } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';

// Auditor E (integridade nacional), teste 2 (H11/A12). Mesma urna física em mais de uma seção no mesmo turno,
// contando também o log aninhado (urna original substituída por contingência). Para cada urna que aparece em mais
// de uma seção: em que papel (urna do BU ou log aninhado), de quando a quando ela escreveu log em cada seção,
// quantas linhas escreveu no dia da eleição, e se os intervalos se sobrepõem (sobreposição = a mesma urna
// escrevendo log em duas seções ao mesmo tempo, o que uma urna física não faz). A sobreposição real só conta entre logs de
// cargas diferentes: o MESMO log (mesmo código de carga) aparece em dois pacotes quando a urna falha, o cartão de votação
// leva a cópia do log para a reserva, e a urna é recarregada e vai para outra seção com o log antigo arquivado.
// Entrada: data/parsed/auditoria/integridade/<t>t/<uf>.jsonl (integridade-lacres.mjs; ou <t>t-identificadores).
// Saída: <dir>/urnas-reaproveitadas.json
//
// Uso: node scripts/auditoria/integridade-urnas-reaproveitadas.mjs --turno 2 [--dir <pasta>]

const DIA = { 1: '04/10/2026', 2: '25/10/2026' };
const ordem = (d) => `${d.slice(6, 10)}${d.slice(3, 5)}${d.slice(0, 2)}${d.slice(11, 19)}`;

async function principal() {
  const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, dir: { type: 'string' } } });
  const turno = Number(values.turno);
  const dir = values.dir ?? path.join(DIR_DADOS, 'parsed', 'auditoria', 'integridade', `${turno}t`);
  const usos = new Map(); // urna → [{ k, papel, tipo, ini, fim, linhasNoDia }]
  for (const arq of (await readdir(dir)).filter((n) => /^[a-z]{2}\.jsonl$/.test(n)).sort()) {
    for await (const l of createInterface({ input: createReadStream(path.join(dir, arq)), crlfDelay: Infinity })) {
      if (!l.includes('"papel":"oficial"')) continue;
      const r = JSON.parse(l);
      if (r.vsc?.endsWith('-sa.vsc') || !Array.isArray(r.logs)) continue;
      const k = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
      for (const log of r.logs) {
        for (const [u, n] of Object.entries(log.urnas)) {
          const urna = Number(u);
          const papel = log.profundidade === 0 ? 'principal' : 'aninhado';
          const item = { k, papel, tipo: r.bu?.tipoUrna ?? null, urnaDoBu: r.bu?.numeroInternoUrna === urna, ini: log.primeiraData, fim: log.ultimaData,
            carga: log.codigoCarga ?? null, linhas: n, linhasNoDia: log.urnasNoDia[u] ?? 0 };
          const lista = usos.get(urna);
          if (lista) lista.push(item);
          else usos.set(urna, [item]);
        }
      }
    }
  }
  const r = { turno, urnas: usos.size, emMaisDeUmaSecao: 0, comSobreposicao: 0, mesmoLogEmDuasSecoes: 0, comSobreposicaoReal: 0, ativasNoDiaEmDuasSecoes: 0, padroes: {}, casos: [] };
  for (const [urna, lista] of usos) {
    const secoes = new Set(lista.map((x) => x.k));
    if (secoes.size < 2) continue;
    r.emMaisDeUmaSecao++;
    // Junta por seção (um log por seção e urna)
    const porSecao = [...secoes].map((k) => {
      const xs = lista.filter((x) => x.k === k);
      return { k, papeis: [...new Set(xs.map((x) => (x.urnaDoBu ? 'BU' : x.papel)))].join('+'), tipo: xs[0].tipo, cargas: [...new Set(xs.map((x) => x.carga))],
        ini: xs.map((x) => x.ini).sort((a, b) => ordem(a).localeCompare(ordem(b)))[0], fim: xs.map((x) => x.fim).sort((a, b) => ordem(b).localeCompare(ordem(a)))[0],
        linhasNoDia: xs.reduce((a, x) => a + x.linhasNoDia, 0) };
    }).sort((a, b) => ordem(a.ini).localeCompare(ordem(b.ini)));
    let sobrepoe = false;
    for (let i = 1; i < porSecao.length; i++) if (ordem(porSecao[i].ini) < ordem(porSecao[i - 1].fim)) sobrepoe = true;
    let sobrepoeReal = false;
    for (const a of lista) {
      for (const b of lista) {
        if (a.k < b.k && (a.carga === null || a.carga !== b.carga) && ordem(a.ini) < ordem(b.fim) && ordem(b.ini) < ordem(a.fim)) sobrepoeReal = true;
      }
    }
    const mesmoLog = lista.some((a) => a.carga && lista.some((b) => b.k !== a.k && b.carga === a.carga));
    const ativasNoDia = porSecao.filter((s) => s.linhasNoDia > 0).length;
    if (sobrepoe) r.comSobreposicao++;
    if (mesmoLog) r.mesmoLogEmDuasSecoes++;
    if (sobrepoeReal) r.comSobreposicaoReal++;
    if (ativasNoDia > 1) r.ativasNoDiaEmDuasSecoes++;
    const padrao = porSecao.map((s) => `${s.papeis}${s.linhasNoDia ? '(dia)' : ''}`).join(' → ');
    r.padroes[padrao] = (r.padroes[padrao] ?? 0) + 1;
    if (sobrepoe || ativasNoDia > 1 || r.casos.length < 30) r.casos.push({ urna, sobrepoe, mesmoLog, sobrepoeReal, ativasNoDia, porSecao });
  }
  await writeFile(path.join(dir, 'urnas-reaproveitadas.json'), JSON.stringify(r, null, 1));
  console.log(JSON.stringify({ ...r, casos: r.casos.filter((c) => c.sobrepoeReal || c.ativasNoDia > 1) }, null, 1));
  console.log(`dia da eleição: ${DIA[turno]}`);
}

await principal();
