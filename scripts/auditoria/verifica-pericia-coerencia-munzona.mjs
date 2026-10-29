// Verificação independente (docs/pericia/02): votos nominais do BU (banco, cópia de leitura) × votacao_candidato_munzona,
// por UF, município, zona, cargo e número; números com voto no BU e sem linha no oficial, agrupados por UF × cargo × número;
// presença desses números na tabela `candidato` (lista do site de resultados); e, no 1º turno, o nº 28 (Presidente) no
// votacao_secao e o total de nominais do detalhe_votacao_secao × BU por UF e cargo.
// Uso: node scripts/auditoria/verifica-pericia-coerencia-munzona.mjs --turno 1 --uf ac,al,...   |   --turno 2
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { ZIPS, entradasZip, linhasCsv } from './contagem-zip.mjs';

const { values: a } = parseArgs({ options: { turno: { type: 'string', default: '2' }, uf: { type: 'string' } } });
const turno = Number(a.turno);
const { db } = await abrirLeitura();
const ufs = a.uf ? a.uf.split(',') : db.prepare('SELECT DISTINCT uf FROM secao WHERE turno = ? ORDER BY uf').all(turno).map((r) => r.uf);
const n = (x) => Number(String(x).trim());
const k5 = (x) => String(n(x)).padStart(5, '0');
const k4 = (x) => String(n(x)).padStart(4, '0');

const bu = new Map();
const buUfCargo = new Map();
for (const uf of ufs) {
  for (const r of db.prepare(`SELECT municipio, zona, cargo, numero, SUM(quantidade) q FROM voto_bu
      WHERE turno = ? AND uf = ? AND tipo_voto = 'nominal' AND cargo IN (1,3,5,6,7,8) GROUP BY municipio, zona, cargo, numero`).iterate(turno, uf)) {
    bu.set(`${uf}|${r.municipio}|${r.zona}|${r.cargo}|${r.numero}`, r.q);
    buUfCargo.set(`${uf}|${r.cargo}`, (buUfCargo.get(`${uf}|${r.cargo}`) ?? 0) + r.q);
  }
}
const of = new Map();
const ent = await entradasZip(ZIPS.munzona);
for (const e of ent.filter((x) => x.nome.endsWith('.csv') && (x.nome.endsWith('_BR.csv') || ufs.some((u) => x.nome.endsWith(`_${u.toUpperCase()}.csv`))))) {
  for await (const o of linhasCsv(ZIPS.munzona, e)) {
    if (n(o.NR_TURNO) !== turno) continue;
    const uf = o.SG_UF.trim().toLowerCase();
    if (!ufs.includes(uf)) continue;
    const k = `${uf}|${k5(o.CD_MUNICIPIO)}|${k4(o.NR_ZONA)}|${n(o.CD_CARGO)}|${n(o.NR_CANDIDATO)}`;
    of.set(k, (of.get(k) ?? 0) + n(o.QT_VOTOS_NOMINAIS));
  }
}
const porCargo = {};
const ausentes = new Map(); // uf|cargo|numero → votos
let iguais = 0, diferentes = 0, soOficial = 0;
const pares = {};
for (const k of new Set([...bu.keys(), ...of.keys()])) {
  const [uf, , , cargo, numero] = k.split('|');
  pares[cargo] = (pares[cargo] ?? 0) + 1;
  const b = bu.get(k), o = of.get(k);
  if (o === undefined) { const kk = `${uf}|${cargo}|${numero}`; ausentes.set(kk, (ausentes.get(kk) ?? 0) + b); continue; }
  if (b === undefined) { if (o !== 0) soOficial++; continue; }
  if (b === o) iguais++; else diferentes++;
}
const naListaDeCandidatos = db.prepare('SELECT COUNT(*) c FROM candidato WHERE turno = ? AND cargo = ? AND numero = ?');
let presentesNaLista = 0;
for (const [kk, v] of ausentes) {
  const [, cargo, numero] = kk.split('|');
  if (v === 0) continue;
  const c = (porCargo[cargo] ??= { numeros: 0, votos: 0 });
  c.numeros++; c.votos += v;
  if (naListaDeCandidatos.get(turno, Number(cargo), Number(numero)).c > 0) presentesNaLista++;
}
const total = Object.values(porCargo).reduce((t, c) => ({ numeros: t.numeros + c.numeros, votos: t.votos + c.votos }), { numeros: 0, votos: 0 });
const saida = { turno, ufs: ufs.join(','), paresPorCargo: pares, iguais, diferentes, soNoOficialComVoto: soOficial, ausentesPorCargo: porCargo, total, ausentesPresentesNaListaDeCandidatos: presentesNaLista,
  ausentes: [...ausentes].filter(([, v]) => v > 0).map(([k, v]) => `${k}=${v}`) };

if (turno === 1) {
  // votacao_secao (Presidente por seção): nº 28 por seção × BU
  const bu28 = new Map();
  for (const uf of ufs) for (const r of db.prepare("SELECT municipio, zona, secao, SUM(quantidade) q FROM voto_bu WHERE turno = 1 AND uf = ? AND cargo = 1 AND tipo_voto = 'nominal' AND numero = 28 GROUP BY 1,2,3").iterate(uf)) bu28.set(`${uf}|${r.municipio}|${r.zona}|${r.secao}`, r.q);
  const of28 = new Map();
  const [vs] = (await entradasZip(ZIPS.votacaoSecao)).filter((x) => x.nome.endsWith('.csv'));
  for await (const o of linhasCsv(ZIPS.votacaoSecao, vs)) {
    if (n(o.NR_TURNO) !== 1 || n(o.CD_CARGO) !== 1 || n(o.NR_VOTAVEL) !== 28) continue;
    const uf = o.SG_UF.trim().toLowerCase();
    if (!ufs.includes(uf)) continue;
    const k = `${uf}|${k5(o.CD_MUNICIPIO)}|${k4(o.NR_ZONA)}|${k4(o.NR_SECAO)}`;
    of28.set(k, (of28.get(k) ?? 0) + n(o.QT_VOTOS));
  }
  let dif28 = 0;
  for (const k of new Set([...bu28.keys(), ...of28.keys()])) if ((bu28.get(k) ?? 0) !== (of28.get(k) ?? 0)) dif28++;
  saida.numero28 = { bu: [...bu28.values()].reduce((t, x) => t + x, 0), votacaoSecao: [...of28.values()].reduce((t, x) => t + x, 0), secoesComDiferenca: dif28 };
  // detalhe_votacao_secao: nominais por UF × cargo, somados separadamente por arquivo (_UF, _BR, _BRASIL)
  const det = { uf: new Map(), br: new Map(), brasil: new Map() };
  const entD = await entradasZip(ZIPS.detalheSecao);
  for (const e of entD.filter((x) => x.nome.endsWith('.csv'))) {
    const tipo = e.nome.endsWith('_BRASIL.csv') ? 'brasil' : e.nome.endsWith('_BR.csv') ? 'br' : 'uf';
    if (tipo === 'uf' && !ufs.some((u) => e.nome.endsWith('_' + u.toUpperCase() + '.csv'))) continue;
    for await (const o of linhasCsv(ZIPS.detalheSecao, e)) {
      if (n(o.NR_TURNO) !== 1) continue;
      const uf = o.SG_UF.trim().toLowerCase();
      if (!ufs.includes(uf)) continue;
      const k = uf + '|' + n(o.CD_CARGO);
      det[tipo].set(k, (det[tipo].get(k) ?? 0) + n(o.QT_VOTOS_NOMINAIS));
    }
  }
  const cmp = { uf: [], br: [], ufMaisBr: [], brasil: [] };
  for (const [k, v] of buUfCargo) {
    const u = det.uf.get(k) ?? 0, b = det.br.get(k) ?? 0, t = det.brasil.get(k) ?? 0;
    if (u !== v) cmp.uf.push(k); if (b !== v) cmp.br.push(k); if (u + b !== v) cmp.ufMaisBr.push(k); if (t !== v) cmp.brasil.push(k + ': BU ' + v + ' detalhe ' + t);
  }
  saida.detalheNominais = { ufCargo: buUfCargo.size, divergentes: { uf: cmp.uf.length, br: cmp.br.length, ufMaisBr: cmp.ufMaisBr.length, brasil: cmp.brasil } };
}
console.log(JSON.stringify(saida, null, 1));
