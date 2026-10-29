// T15, tópico 03-linha-do-tempo: no 1º turno, lista as seções do Brasil em que o log lido tem MAIS votos que o BU
// e quantos dos seus votos ficaram depois das 17h/18h de Brasília (fuso = moda da hora local da abertura do BU − 8,
// a mesma régua de verifica-pericia-linha-do-tempo.mjs). Só leitura dos perfis em data/parsed/1t/perfil/.
// Uso: node scripts/auditoria/t15-linha-do-tempo-1t-excesso.mjs
// Saída: data/parsed/auditoria/t15/03-linha-do-tempo-1t-excesso.json
import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DIR_DADOS, UFS } from '../../src/config.js';

const segBu = (dt) => (dt ? Number(dt.slice(9, 11)) * 3600 + Number(dt.slice(11, 13)) * 60 + Number(dt.slice(13, 15)) : null);
const horas = new Map(); const excesso = [];
let secoes = 0;
for (const uf of UFS) {
  if (uf === 'zz') continue;
  const rl = createInterface({ input: createReadStream(path.join(DIR_DADOS, 'parsed', '1t', 'perfil', `${uf}.jsonl`)), crlfDelay: Infinity });
  for await (const linha of rl) {
    if (!linha) continue;
    const p = JSON.parse(linha); secoes++;
    const k = `${uf}/${p.municipio}`; const a = segBu(p.bu.dataHoraAbertura);
    if (a !== null) { const m = horas.get(k) ?? new Map(); const hh = Math.floor(a / 3600); m.set(hh, (m.get(hh) ?? 0) + 1); horas.set(k, m); }
    const v = p.log?.votosComputados ?? null;
    if (v !== null && v > p.bu.qtdEleitoresCompareceram) excesso.push({ id: `${uf} ${p.municipio}/${p.zona}/${p.secao}`, k, votosLog: v, bu: p.bu.qtdEleitoresCompareceram, logs: p.log?.logsNoPacote ?? null, h: p.log?.votosPorHoraLocal ?? null });
  }
}
const fuso = (k) => [...horas.get(k)].sort((a, b) => b[1] - a[1])[0][0] - 8;
const R = { secoesBrasil: secoes, secoes: [], somaExcesso: 0, somaV17: 0, somaV18: 0, somaMinExcessoV17: 0 };
for (const s of excesso) {
  const f = fuso(s.k); const v17 = s.h.slice(17 + f).reduce((x, y) => x + y, 0), v18 = s.h.slice(18 + f).reduce((x, y) => x + y, 0);
  const ex = s.votosLog - s.bu;
  R.secoes.push({ id: s.id, fuso: f, logs: s.logs, votosLog: s.votosLog, bu: s.bu, excesso: ex, v17, v18 });
  R.somaExcesso += ex; R.somaV17 += v17; R.somaV18 += v18; R.somaMinExcessoV17 += Math.min(ex, v17);
}
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 't15');
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, '03-linha-do-tempo-1t-excesso.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
