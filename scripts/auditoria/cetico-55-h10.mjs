// Parecer cético 55, H10 (b): reprodução independente das perdas do 22 (Emín e Emáx) do doc 14 do matemático, com
// código próprio (agregação no SQL, sem importar os scripts do autor), e o teto de troca que as contagens permitem.
//
// Por seção com urna nos dois turnos (Presidente, eleições 6257 e 6258), fora as seções com comparecimento 0 num
// turno e > 0 no outro (cédula) e as com comparecimento 0 no 1º turno:
//   L      = 22(1º) − 22(2º), quando positivo
//   sMin   = max(0, comp1 − comp2)
//   U      = max(aptos_secao1, aptos_secao2) + tte1 + tte2
//   sMax   = min(comp1, U − comp2)
//   Emín   = max(0, L − sMin);  Emáx = max(0, L − sMax)
// Acrescenta: teto de troca 22→13 compatível com as contagens da seção = min(22 no 1º turno, 13 no 2º turno), que é
// o máximo de eleitores do 22 que podem ter votado no 13 sem contradizer nenhum número publicado.
// Acrescenta também, por UF, o ganho do 13 contra o disponível LÍQUIDO (eliminados do 1º turno + aumento do
// comparecimento + queda de brancos e nulos), sem contar a perda do 22: a leitura estreita do texto da H10.
// Uso: node scripts/auditoria/cetico-55-h10.mjs
// Saída: data/parsed/auditoria/cetico-revisor/55/h10.json
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '55');
const { db, fonte } = await abrirLeitura();
const sql = `
WITH v AS (
  SELECT turno, uf, municipio, zona, secao,
         SUM(CASE WHEN tipo_voto = 'nominal' AND numero = 13 THEN quantidade ELSE 0 END) v13,
         SUM(CASE WHEN tipo_voto = 'nominal' AND numero = 22 THEN quantidade ELSE 0 END) v22,
         SUM(CASE WHEN tipo_voto IN ('branco', 'nulo') THEN quantidade ELSE 0 END) bn,
         SUM(CASE WHEN tipo_voto = 'nominal' AND numero NOT IN (13, 22) THEN quantidade ELSE 0 END) elim
  FROM voto_bu WHERE cargo = 1 AND ((turno = 1 AND eleicao = 6257) OR (turno = 2 AND eleicao = 6258))
  GROUP BY turno, uf, municipio, zona, secao)
SELECT a.uf, a.aptos_secao as1, b.aptos_secao as2, a.aptos_tte t1, b.aptos_tte t2,
       a.comparecimento_majoritario c1, b.comparecimento_majoritario c2,
       COALESCE(va.v13, 0) a13, COALESCE(va.v22, 0) a22, COALESCE(vb.v13, 0) b13, COALESCE(vb.v22, 0) b22, COALESCE(vb.bn, 0) bbn, COALESCE(va.bn, 0) abn, COALESCE(va.elim, 0) aelim
FROM secao_eleicao a
JOIN secao_eleicao b ON b.turno = 2 AND b.eleicao = 6258 AND b.uf = a.uf AND b.municipio = a.municipio AND b.zona = a.zona AND b.secao = a.secao
LEFT JOIN v va ON va.turno = 1 AND va.uf = a.uf AND va.municipio = a.municipio AND va.zona = a.zona AND va.secao = a.secao
LEFT JOIN v vb ON vb.turno = 2 AND vb.uf = b.uf AND vb.municipio = b.municipio AND vb.zona = b.zona AND vb.secao = b.secao
WHERE a.turno = 1 AND a.eleicao = 6257`;
const R = {};
// disponível líquido por UF (leitura estreita da H10): eliminados do 1º turno + aumento do comparecimento + queda de brancos e nulos
const D = {};
const tot = { secoes: 0, fora: 0, m13: 0, m22: 0 };
for (const r of db.prepare(sql).iterate()) {
  tot.m13 += r.b13; tot.m22 += r.b22;
  const d = (D[r.uf] ??= { d13: 0, d22: 0, elim1: 0, dComp: 0, quedaBN: 0 });
  d.d13 += r.b13 - r.a13; d.d22 += r.b22 - r.a22; d.elim1 += r.aelim; d.dComp += r.c2 - r.c1; d.quedaBN += r.abn - r.bbn;
  if ((r.c1 === 0) !== (r.c2 === 0) || r.c1 === 0) { tot.fora++; continue; }
  tot.secoes++;
  const o = (R[r.uf] ??= { secoes: 0, saldo22: 0, perdaBruta: 0, secoesPerda: 0, explicadaQueda: 0, emin: 0, secoesEmin: 0, emax: 0, secoesEmax: 0, piso13: 0, tetoTroca: 0, tetoTrocaSoSecoesComPerda: 0 });
  o.secoes++;
  o.saldo22 += r.b22 - r.a22;
  o.tetoTroca += Math.min(r.a22, r.b13);
  const L = r.a22 - r.b22;
  if (L <= 0) continue;
  o.secoesPerda++; o.perdaBruta += L;
  o.tetoTrocaSoSecoesComPerda += Math.min(r.a22, r.b13);
  const sMin = Math.max(0, r.c1 - r.c2);
  const U = Math.max(r.as1, r.as2) + r.t1 + r.t2;
  const sMax = Math.min(r.c1, U - r.c2);
  const emin = Math.max(0, L - sMin);
  const emax = Math.max(0, L - sMax);
  o.explicadaQueda += Math.min(L, sMin);
  o.emin += emin; if (emin) o.secoesEmin++;
  o.emax += emax; if (emax) o.secoesEmax++;
  o.piso13 += Math.max(0, emax - r.bbn);
}
db.close();
const BR = {};
for (const o of Object.values(R)) for (const [k, v] of Object.entries(o)) BR[k] = (BR[k] ?? 0) + v;
const margem = tot.m13 - tot.m22;
for (const d of Object.values(D)) { d.disponivelLiquido = d.elim1 + d.dComp + d.quedaBN; d.ganho13AlemDoDisponivel = d.d13 - d.disponivelLiquido; }
const ufsAlem = Object.entries(D).filter(([, d]) => d.ganho13AlemDoDisponivel > 0).map(([u, d]) => ({ uf: u, ...d }));
const res = { fonte: path.basename(fonte), totais: { ...tot, margem }, brasil: BR, porUf: R, disponivelLiquidoPorUf: D, ufsComGanho13AlemDoDisponivelLiquido: ufsAlem };
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, 'h10.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res.totais));
console.table(Object.fromEntries(['ma', 'am', 'to', 'ac', 'ap', 'rr'].map((u) => [u, R[u]])));
console.table({ brasil: BR });
console.table(ufsAlem);
console.log(`2 × Emín = ${2 * BR.emin} (${(100 * 2 * BR.emin / margem).toFixed(1)}% da margem); teto de troca compatível com as contagens = ${BR.tetoTroca} (2× = ${(100 * 2 * BR.tetoTroca / margem).toFixed(0)}% da margem)`);
