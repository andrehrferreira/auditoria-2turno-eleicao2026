// Revisor cético, achado software-verificacao-caminhos (svc): o excesso de trocas novas de urna em 7 zonas (doc 03 do
// engenheiro-seguranca-urna) sobrevive quando o nulo leva em conta o parque de urnas da zona?
// Troca nova = 2º turno com urna reserva (tipo 4 ou 6) e nº interno diferente do 1º turno (mesma definição do autor).
// Nulos comparados (Poisson, cauda superior, Bonferroni pelo nº de zonas):
//   A) taxa da UF (o do autor);
//   B) taxa do modelo da urna da seção no 1º turno (proxy do parque; nacional);
//   C) taxa UF × modelo do 1º turno;
//   D) C + taxa de troca do 1º turno da zona (zona que falhou no 1º turno tende a falhar no 2º) — razão observada/esperada
//      do 1º turno da zona como fator, com encolhimento (k1+1)/(e1+1).
// Uso: node scripts/auditoria/cetico-svc-trocas-parque.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

const { db, fonte } = await abrirLeitura();
console.error(`banco: ${fonte}`);
const linhas = db.prepare(`SELECT s2.uf, s2.municipio, s2.zona, s1.modelo_urna AS m1, s1.tipo_urna AS t1, s2.modelo_urna AS m2,
    (s2.tipo_urna IN ('reservaSecao','reservaEncerrandoSecao') AND s1.numero_interno_urna != s2.numero_interno_urna) AS nova,
    (s1.tipo_urna IN ('reservaSecao','reservaEncerrandoSecao')) AS reserva1t
  FROM secao s2 JOIN secao s1 ON s1.turno = 1 AND s1.uf = s2.uf AND s1.municipio = s2.municipio AND s1.zona = s2.zona AND s1.secao = s2.secao
  WHERE s2.turno = 2`).all();
const total2t = db.prepare("SELECT COUNT(*) n FROM secao WHERE turno = 2").get().n;
console.log(`seções do 2º turno: ${total2t}; com par no 1º turno: ${linhas.length}; fora da junção: ${total2t - linhas.length}`);
const nulas = linhas.filter((l) => l.nova === null).length;
console.log(`trocas novas: ${linhas.filter((l) => l.nova === 1).length}; nova = NULL (nº interno ausente num dos turnos): ${nulas}`);

function cauda(k, lam) {
  if (k <= 0) return 1;
  // soma direta da cauda superior para evitar cancelamento
  let termo = Math.exp(-lam); let acum = termo;
  for (let i = 1; i < k; i++) { termo *= lam / i; acum += termo; }
  return Math.max(0, 1 - acum);
}
const taxa = (chave) => {
  const t = {};
  for (const l of linhas) { const k = chave(l); const e = (t[k] ??= { s: 0, n: 0 }); e.s++; e.n += l.nova === 1 ? 1 : 0; }
  return (l) => { const e = t[chave(l)]; return e.n / e.s; };
};
const tUf = taxa((l) => l.uf);
const tMod = taxa((l) => l.m1 ?? 'nulo');
const tUfMod = taxa((l) => `${l.uf}|${l.m1 ?? 'nulo'}`);
const tUfMod1 = taxa((l) => `${l.uf}|${l.m1 ?? 'nulo'}|${l.reserva1t}`);

console.log('\nTaxa de troca nova por modelo da urna da seção no 1º turno:');
const porMod = {};
for (const l of linhas) { const e = (porMod[l.m1 ?? 'nulo'] ??= { secoes: 0, novas: 0 }); e.secoes++; e.novas += l.nova === 1 ? 1 : 0; }
for (const [m, e] of Object.entries(porMod)) console.log(`  ${m}: ${e.novas}/${e.secoes} = ${(1000 * e.novas / e.secoes).toFixed(2)}‰`);

// taxa de reserva no 1º turno por zona (para o nulo D)
const zonas = new Map();
for (const l of linhas) {
  const k = `${l.uf}/${l.municipio}/${l.zona}`;
  const z = zonas.get(k) ?? { k, secoes: 0, novas: 0, eA: 0, eB: 0, eC: 0, eC2: 0, r1: 0, er1: 0, ue2013: 0 };
  z.secoes++; z.novas += l.nova === 1 ? 1 : 0;
  z.eA += tUf(l); z.eB += tMod(l); z.eC += tUfMod(l); z.eC2 += tUfMod1(l);
  z.r1 += l.reserva1t; z.ue2013 += l.m1 === 'ue2013' ? 1 : 0;
  zonas.set(k, z);
}
// taxa de reserva 1º turno esperada pela UF × modelo
const r1Uf = {};
for (const l of linhas) { const e = (r1Uf[`${l.uf}|${l.m1}`] ??= { s: 0, n: 0 }); e.s++; e.n += l.reserva1t; }
for (const l of linhas) zonas.get(`${l.uf}/${l.municipio}/${l.zona}`).er1 += r1Uf[`${l.uf}|${l.m1}`].n / r1Uf[`${l.uf}|${l.m1}`].s;
const Z = [...zonas.values()];
const nZ = Z.length;
for (const z of Z) {
  z.eD = z.eC * (z.r1 + 1) / (z.er1 + 1);
  for (const n of ['A', 'B', 'C', 'C2', 'D']) { z[`p${n}`] = cauda(z.novas, z[`e${n}`]); z[`b${n}`] = Math.min(1, z[`p${n}`] * nZ); }
}
// renormaliza D para o total observado (o fator do 1º turno não pode inflar o total esperado)
const somaD = Z.reduce((a, z) => a + z.eD, 0); const somaObs = Z.reduce((a, z) => a + z.novas, 0);
for (const z of Z) { z.eD *= somaObs / somaD; z.pD = cauda(z.novas, z.eD); z.bD = Math.min(1, z.pD * nZ); }
console.log(`\nzonas: ${nZ}`);
for (const n of ['A', 'B', 'C', 'C2', 'D']) console.log(`nulo ${n}: zonas com p Bonferroni < 0,05: ${Z.filter((z) => z[`b${n}`] < 0.05).length}`);
const sig = Z.filter((z) => ['A', 'B', 'C', 'C2', 'D'].some((n) => z[`b${n}`] < 0.05)).sort((a, b) => a.pA - b.pA);
console.log('\nzona | seções | UE2013 no 1T | reserva no 1T (esp.) | novas | esperado A / B / C / D | Bonferroni A / B / C / C2 / D');
for (const z of sig) console.log(`${z.k} | ${z.secoes} | ${z.ue2013} | ${z.r1} (${z.er1.toFixed(1)}) | ${z.novas} | ${z.eA.toFixed(2)} / ${z.eB.toFixed(2)} / ${z.eC.toFixed(2)} / ${z.eD.toFixed(2)} | ${[z.bA, z.bB, z.bC, z.bC2, z.bD].map((x) => x.toExponential(1)).join(' / ')}`);
const dir = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');
mkdirSync(dir, { recursive: true });
writeFileSync(path.join(dir, 'svc-trocas-parque.json'), JSON.stringify({ zonas: nZ, porModelo: porMod, significativas: sig }, null, 1));
