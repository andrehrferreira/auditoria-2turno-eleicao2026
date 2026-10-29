// Cético (H08, dados): no perfil nacional do 2º turno (data/parsed/2t/perfil, gerado ANTES da correção de lerLogs),
// compara votos computados no log com (a) votos com habilitação no mesmo ciclo (soma das faixas de
// tempoHabilitacaoAteVoto) e (b) comparecimento do BU. Votos sem habilitação = votos − (a).
// Uso: node scripts/auditoria/cetico-h08-dados-perfil.mjs   → data/parsed/auditoria/cetico/h08-dados-perfil.json
import { createReadStream } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DIR_DADOS, UFS } from '../../src/config.js';

const r = { pacotes: 0, comLog: 0, votos: 0, votosComHab: 0, secoesVotoSemHab: 0, votosSemHab: 0, porLogs: {}, listaSemHab: [], logDiferenteBu: [], minIntervaloHist: {}, minIntervaloPorLogs: {} };
for (const uf of UFS) {
  const rl = createInterface({ input: createReadStream(path.join(DIR_DADOS, 'parsed', '2t', 'perfil', `${uf}.jsonl`)), crlfDelay: Infinity });
  for await (const linha of rl) {
    if (!linha) continue;
    const p = JSON.parse(linha); r.pacotes++;
    const l = p.log; if (!l) continue; r.comLog++;
    const comHab = (l.tempoHabilitacaoAteVoto.faixas ?? []).reduce((a, b) => a + b, 0);
    r.votos += l.votosComputados; r.votosComHab += comHab;
    const q = l.logsNoPacote > 1 ? '2+' : '1';
    const g = (r.porLogs[q] ??= { pacotes: 0, votos: 0, semHab: 0, secoesSemHab: 0 }); g.pacotes++; g.votos += l.votosComputados;
    const sem = l.votosComputados - comHab;
    if (sem > 0) { r.secoesVotoSemHab++; r.votosSemHab += sem; g.semHab += sem; g.secoesSemHab++; r.listaSemHab.push([`${uf}/${p.municipio}/${p.zona}/${p.secao}`, l.logsNoPacote, l.votosComputados, sem, p.bu.qtdEleitoresCompareceram]); }
    if (l.votosComputados !== p.bu.qtdEleitoresCompareceram) r.logDiferenteBu.push([`${uf}/${p.municipio}/${p.zona}/${p.secao}`, l.logsNoPacote, l.votosComputados, p.bu.qtdEleitoresCompareceram]);
    const m = l.intervaloEntreVotos.minimo;
    if (m !== null) { const k = Math.min(m, 30); r.minIntervaloHist[k] = (r.minIntervaloHist[k] ?? 0) + 1; const h = (r.minIntervaloPorLogs[q] ??= {}); h[k] = (h[k] ?? 0) + 1; }
  }
}
r.listaSemHab.sort((a, b) => b[3] - a[3]);
await writeFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'h08-dados-perfil.json'), JSON.stringify(r, null, 1));
console.log(JSON.stringify({ ...r, listaSemHab: r.listaSemHab.slice(0, 25), nListaSemHab: r.listaSemHab.length, logDiferenteBu: r.logDiferenteBu }, null, 1));
