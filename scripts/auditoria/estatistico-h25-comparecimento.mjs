// H25, exploratório: de onde vem o comparecimento a mais (1º → 2º turno) nas seções da AC URNA (UE2013/UE2015)?
// Achado de estatistico-h25.mjs: na variação ampla (efeito fixo de UF + perfil + composição do 1º turno), as seções A
// ganharam mais comparecimento que as B (+0,33 p.p.), sem mudar a parcela do 13. Este script decompõe esse ganho:
//   1. em eleitores habilitados POR BIOMETRIA e SEM biometria (sem biometria cadastrada + ano de nascimento), por apto;
//   2. por modelo (UE2013 × UE2015);
//   3. por tamanho da seção (tercis de aptos) — uma urna mais lenta gera fila, e fila pesa mais em seção grande;
//   4. nível do comparecimento no 1º e no 2º turno separados (o ganho vem de um 1º turno mais baixo?).
// Mesmo universo do teste 2 de estatistico-h25.mjs (mesma urna nos dois turnos, mesmo local, aptos estáveis, sem exterior).
// Saída: data/parsed/auditoria/h25/comparecimento.json. Uso: node --max-old-space-size=8192 scripts/auditoria/estatistico-h25-comparecimento.mjs
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { RAIZ } from './forense-lib.mjs';
import { carregarIdade, lerPares, mqEfeitoFixo, pNormal2 } from './estatistico-lib.mjs';

const DIR = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'h25');
const r3 = (x) => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : null);
const todos = await lerPares('banco');
const ac = new Map();
{
  const [cab, ...ls] = readFileSync(path.join(DIR, 'ac-2t.csv'), 'utf8').trim().split('\n');
  const k = cab.split(';');
  for (const l of ls) { const r = Object.fromEntries(l.split(';').map((v, i) => [k[i], v])); ac.set(`${r.uf}|${r.municipio}|${r.zona}|${r.secao}`, r); }
}
const P = [];
for (const s of todos) {
  const r = ac.get(`${s.uf}|${s.municipio}|${s.zona}|${s.secao}`);
  s.A = r.emissor === 'AC URNA' ? 1 : 0; s.ue2013 = r.modeloVsc === 'ue2013' ? 1 : 0;
  s.mun = `${s.uf}|${s.municipio}`; s.zon = `${s.uf}|${s.zona}`; s.cl = s.uf === 'df' ? s.zon : s.mun;
  s.n1 = s.v13_1 + s.v22_1; s.n2 = s.v13_2 + s.v22_2;
  if (s.uf === 'zz' || s.urna1 !== s.urna2 || s.local1 !== s.local2 || Math.abs(s.a2 - s.a1) > 10 || !(s.n1 > 0 && s.n2 > 0 && s.c1 > 0 && s.a1 > 0)) continue;
  P.push(s);
}
await carregarIdade(P);
const L = P.filter((s) => s.p60 != null && s.sb1 != null && s.sb2 != null);
for (const s of L) {
  s.logA = Math.log(s.a2);
  s.ctrl = [s.p60, s.p1624, s.pEscB, s.pBioCad, s.logA, (100 * s.v13_1) / s.n1, (100 * s.out1) / s.c1, (100 * s.bn1) / s.c1, (100 * s.c1) / s.a1];
}
const res = { geradoEm: new Date().toISOString(), secoes: L.length, A: L.filter((s) => s.A).length, foraSemDetalhamentoOuPerfil: P.length - L.length };
const fit = (lista, y, trat, grupo = (s) => s.uf, semComp1 = false) => {
  // semComp1: tira o comparecimento do 1º turno dos controles (quando ele é o próprio desfecho)
  const a = mqEfeitoFixo(lista, { y, x: (s) => [...trat(s), ...(semComp1 ? s.ctrl.slice(0, -1) : s.ctrl)], w: (s) => s.a2, grupo, cluster: (s) => s.cl });
  return trat(lista[0]).map((_, i) => ({ b: r3(a.b[i]), ep: r3(a.ep[i]), z: r3(a.b[i] / a.ep[i]), p: +pNormal2(a.b[i] / a.ep[i]).toPrecision(3) }));
};
const A = (s) => [s.A];
// 1. decomposição: Δcomp = Δpor biometria + Δsem biometria (cadastro + ano de nascimento), tudo / aptos, em p.p.
res.decomposicao = {};
for (const [g, grupo] of [['uf', (s) => s.uf], ['zona', (s) => s.zon]]) {
  res.decomposicao[g] = {
    comparecimento: fit(L, (s) => 100 * (s.c2 / s.a2 - s.c1 / s.a1), A, grupo)[0],
    porBiometria: fit(L, (s) => 100 * (s.pb2 / s.a2 - s.pb1 / s.a1), A, grupo)[0],
    semBiometria: fit(L, (s) => 100 * ((s.sb2 + s.pg2) / s.a2 - (s.sb1 + s.pg1) / s.a1), A, grupo)[0],
    nivel1t: fit(L, (s) => (100 * s.c1) / s.a1, A, grupo, true)[0],
    nivel2t: fit(L, (s) => (100 * s.c2) / s.a2, A, grupo, true)[0],
  };
}
// 2. por modelo
{
  const [u13, u15] = fit(L, (s) => 100 * (s.c2 / s.a2 - s.c1 / s.a1), (s) => [s.A && s.ue2013 ? 1 : 0, s.A && !s.ue2013 ? 1 : 0]);
  res.porModelo = { UE2013: u13, UE2015: u15 };
}
// 3. por tercil de aptos (cortes nas seções de todo o universo)
{
  const o = L.map((s) => s.a2).sort((a, b) => a - b);
  const c1 = o[Math.floor(o.length / 3)], c2 = o[Math.floor((2 * o.length) / 3)];
  const t = (s) => (s.a2 <= c1 ? 0 : s.a2 <= c2 ? 1 : 2);
  const ef = fit(L, (s) => 100 * (s.c2 / s.a2 - s.c1 / s.a1), (s) => [0, 1, 2].map((k) => (s.A && t(s) === k ? 1 : 0)));
  res.porTamanho = { cortesAptos: [c1, c2], pequenas: ef[0], medias: ef[1], grandes: ef[2] };
}
await writeFile(path.join(DIR, 'comparecimento.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
