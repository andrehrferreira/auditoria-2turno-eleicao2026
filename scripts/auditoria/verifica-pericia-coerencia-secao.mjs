// Verificação independente (docs/pericia/02): votacao_secao (Presidente, por seção, todos os votáveis, inclusive
// branco 95 e nulo 96) × BU do banco (cópia de leitura), 1º turno, nas UFs dadas.
// Uso: node scripts/auditoria/verifica-pericia-coerencia-secao.mjs --uf ac,al,...
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { ZIPS, entradasZip, linhasCsv } from './contagem-zip.mjs';

const { values: a } = parseArgs({ options: { uf: { type: 'string' } } });
const ufs = a.uf.split(',');
const { db } = await abrirLeitura();
const n = (x) => Number(String(x).trim());
const p = (x, w) => String(n(x)).padStart(w, '0');
const bu = new Map();
const secoesBu = new Set();
for (const uf of ufs) {
  for (const r of db.prepare(`SELECT municipio, zona, secao, CASE tipo_voto WHEN 'nominal' THEN numero WHEN 'branco' THEN 95 WHEN 'nulo' THEN 96 ELSE -1 END nr, SUM(quantidade) q
      FROM voto_bu WHERE turno = 1 AND uf = ? AND cargo = 1 GROUP BY 1, 2, 3, 4`).iterate(uf)) {
    const s = `${uf}|${r.municipio}|${r.zona}|${r.secao}`;
    secoesBu.add(s);
    bu.set(`${s}|${r.nr}`, r.q);
  }
}
const of = new Map();
const secoesOf = new Set();
const [e] = (await entradasZip(ZIPS.votacaoSecao)).filter((x) => x.nome.endsWith('.csv'));
for await (const o of linhasCsv(ZIPS.votacaoSecao, e)) {
  if (n(o.NR_TURNO) !== 1 || n(o.CD_CARGO) !== 1) continue;
  const uf = o.SG_UF.trim().toLowerCase();
  if (!ufs.includes(uf)) continue;
  const s = `${uf}|${p(o.CD_MUNICIPIO, 5)}|${p(o.NR_ZONA, 4)}|${p(o.NR_SECAO, 4)}`;
  secoesOf.add(s);
  const k = `${s}|${n(o.NR_VOTAVEL)}`;
  of.set(k, (of.get(k) ?? 0) + n(o.QT_VOTOS));
}
const ruins = new Set();
for (const k of new Set([...bu.keys(), ...of.keys()])) if ((bu.get(k) ?? 0) !== (of.get(k) ?? 0)) ruins.add(k.split('|').slice(0, 4).join('|'));
console.log(JSON.stringify({ ufs: ufs.join(','), secoesBu: secoesBu.size, secoesOficial: secoesOf.size, soNoBu: [...secoesBu].filter((s) => !secoesOf.has(s)).length,
  soNoOficial: [...secoesOf].filter((s) => !secoesBu.has(s)).length, secoesComDiferenca: ruins.size, exemplos: [...ruins].slice(0, 10) }, null, 1));
