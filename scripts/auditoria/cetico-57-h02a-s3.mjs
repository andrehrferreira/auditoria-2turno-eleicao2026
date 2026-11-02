// Parecer cético 57, sensibilidade S3 da H02(a): a foto que já aparece entre os V2 "legítimos" (eleitores sem biometria no
// cadastro, seções sem excesso) não pode ser descontada do excesso. Estima a foto do excesso como F − r_UF · (sb − E), em que
// r_UF é a parcela de foto entre os V2 das seções sem excesso da UF (h02a.json, cálculo próprio) e sb − E é a parte do sb que
// o cadastro e a folga já cobrem. Lê as seções com excesso de foto-secoes-<t>t.jsonl (saída do autor; os totais E, F e E′
// dessas seções foram reproduzidos exatamente por cetico-57-h02a.mjs e as fotos de 30 seções conferidas no diário bruto).
// Uso: node scripts/auditoria/cetico-57-h02a-s3.mjs
// Saída: data/parsed/auditoria/cetico/57/h02a-s3.json
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';

const D = path.join(DIR_DADOS, 'parsed', 'auditoria');
const base = JSON.parse(await readFile(path.join(D, 'cetico', '57', 'h02a.json'), 'utf8'));
const out = {};
for (const t of [1, 2]) {
  const r = base.turnos[`${t}t`].fotoBasePorUf;
  const L = (await readFile(path.join(D, 'estatistico-eleitoral', 'h02-h05-final', `foto-secoes-${t}t.jsonl`), 'utf8')).trim().split('\n').map(JSON.parse).filter((x) => x.E > 0 && x.bate);
  let somaE = 0, res = 0, resAutor = 0, sec = 0; const uf = {};
  for (const x of L) {
    const fEx = Math.max(0, x.F - (r[x.uf] ?? 0) * Math.max(0, x.sb - x.E));
    const e3 = Math.max(0, x.E - fEx);
    somaE += x.E; res += e3; resAutor += Math.max(0, x.Elinha); if (e3 > 0.5) sec++;
    const u = (uf[x.uf] ??= { E: 0, res: 0, resAutor: 0 }); u.E += x.E; u.res += e3; u.resAutor += Math.max(0, x.Elinha);
  }
  out[`${t}t`] = { secoes: L.length, somaE, residuoAutor: resAutor, residuoS3: Math.round(res), secoesComResiduoS3: sec, parcelaExplicadaS3: Math.round((1 - res / somaE) * 1e4) / 1e4,
    porUf: Object.fromEntries(Object.entries(uf).sort((a, b) => b[1].res - a[1].res).slice(0, 8).map(([k, v]) => [k, { E: v.E, residuoAutor: v.resAutor, residuoS3: Math.round(v.res), explicadaS3: Math.round((1 - v.res / v.E) * 1e3) / 1e3 }])) };
}
await writeFile(path.join(D, 'cetico', '57', 'h02a-s3.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
