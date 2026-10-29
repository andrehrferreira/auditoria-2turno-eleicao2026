// Revisão cética do achado software-verificacao-caminhos, item 4 do foco: as 7 zonas com excesso de trocas NOVAS de urna
// no 2º turno (Poisson contra a taxa da UF, Bonferroni) continuam com excesso quando o nulo considera o MODELO da urna?
// Modelo da urna no início do 2º turno, por seção (todas as seções com os dois turnos no banco):
//   - troca nova (reserva no 2º turno com nº interno diferente do 1º): modelo do BU do 1º turno (a urna que terminou o
//     1º turno é a que começou o 2º, salvo troca entre turnos sem contingência);
//   - demais seções: modelo do BU do 2º turno.
// Nulos: (A) taxa da UF (o do autor, reproduzido); (B) taxa nacional por modelo; (C) taxa por UF × modelo;
//        (D) = C com superdispersão (quase-Poisson, aproximação normal: inválida com esperado pequeno; só referência);
//        (E) = C deixando a própria zona de fora da taxa (evita circularidade quando a zona concentra o modelo na UF);
//            se a célula UF × modelo não tem outras seções, usa a taxa nacional do modelo sem a zona.
// Também refaz a taxa de troca por modelo com denominador correto (modelo no início do 2º turno, não o do BU final).
// Uso: node scripts/auditoria/cetico-svc-alternativas-zonas.mjs
// Saída: data/parsed/auditoria/cetico/svc-zonas-2t.json
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

const { db, fonte } = await abrirLeitura();
console.error(`banco: ${fonte}`);
const linhas = db.prepare(`SELECT s2.uf, s2.municipio, s2.zona, s2.tipo_urna IN ('reservaSecao','reservaEncerrandoSecao') AS reserva,
    s1.numero_interno_urna = s2.numero_interno_urna AS mesma, s1.modelo_urna AS m1, s2.modelo_urna AS m2, s1.tipo_urna AS t1
  FROM secao s2 JOIN secao s1 ON s1.turno = 1 AND s1.uf = s2.uf AND s1.municipio = s2.municipio AND s1.zona = s2.zona AND s1.secao = s2.secao
  WHERE s2.turno = 2`).all();
const semPar = db.prepare(`SELECT COUNT(*) n FROM secao s2 WHERE s2.turno = 2 AND NOT EXISTS (SELECT 1 FROM secao s1 WHERE s1.turno = 1
  AND s1.uf = s2.uf AND s1.municipio = s2.municipio AND s1.zona = s2.zona AND s1.secao = s2.secao)`).get().n;

function caudaPoisson(k, lambda) {
  if (k <= 0) return 1;
  let termo = Math.exp(-lambda); let acumulado = termo;
  for (let i = 1; i < k; i++) { termo *= lambda / i; acumulado += termo; }
  return Math.max(0, 1 - acumulado);
}
// cauda normal superior (Abramowitz-Stegun 26.2.17)
function caudaNormal(z) {
  if (z < 0) return 1 - caudaNormal(-z);
  const t = 1 / (1 + 0.2316419 * z);
  const d = 0.3989422804014327 * Math.exp(-z * z / 2);
  return d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
}

const secoes = linhas.map((r) => {
  const nova = r.reserva && !r.mesma ? 1 : 0;
  return { ...r, nova, modelo: (nova ? r.m1 : r.m2) ?? 'sem' };
});
const acum = (chave) => { const m = {}; for (const s of secoes) { const k = chave(s); const e = (m[k] ??= { secoes: 0, novas: 0 }); e.secoes++; e.novas += s.nova; } return m; };
const porUf = acum((s) => s.uf);
const porModelo = acum((s) => s.modelo);
const porUfModelo = acum((s) => `${s.uf}|${s.modelo}`);

const zonas = new Map();
for (const s of secoes) {
  const k = `${s.uf}/${s.municipio}/${s.zona}`;
  const z = zonas.get(k) ?? { id: k, uf: s.uf, secoes: 0, novas: 0, lA: 0, lB: 0, lC: 0, lE: 0, modelos: {}, cont: {} };
  z.secoes++; z.novas += s.nova;
  z.lA += porUf[s.uf].novas / porUf[s.uf].secoes;
  z.lB += porModelo[s.modelo].novas / porModelo[s.modelo].secoes;
  const um = porUfModelo[`${s.uf}|${s.modelo}`]; z.lC += um.novas / um.secoes;
  z.modelos[s.modelo] = (z.modelos[s.modelo] ?? 0) + 1;
  const c = (z.cont[s.modelo] ??= { secoes: 0, novas: 0 }); c.secoes++; c.novas += s.nova;
  zonas.set(k, z);
}
for (const z of zonas.values()) {
  for (const [m, c] of Object.entries(z.cont)) {
    const um = porUfModelo[`${z.uf}|${m}`]; const nm = porModelo[m];
    const resto = um.secoes - c.secoes;
    const taxa = resto > 0 ? (um.novas - c.novas) / resto : (nm.secoes - c.secoes > 0 ? (nm.novas - c.novas) / (nm.secoes - c.secoes) : 0);
    z.lE += c.secoes * taxa;
  }
}
const lista = [...zonas.values()];
const n = lista.length;
// superdispersão de Pearson sob o nulo C
const pearson = lista.reduce((a, z) => a + (z.lC > 0 ? (z.novas - z.lC) ** 2 / z.lC : 0), 0);
const phi = pearson / (n - 1);
for (const z of lista) {
  z.pA = caudaPoisson(z.novas, z.lA); z.pB = caudaPoisson(z.novas, z.lB); z.pC = caudaPoisson(z.novas, z.lC);
  z.pE = caudaPoisson(z.novas, z.lE);
  z.pD = z.lC > 0 ? caudaNormal((z.novas - 0.5 - z.lC) / Math.sqrt(phi * z.lC)) : 1;
}
const sobrevive = (campo) => lista.filter((z) => z[campo] * n < 0.05).sort((a, b) => a[campo] - b[campo]);
const fmt = (z) => ({ zona: z.id, secoes: z.secoes, novas: z.novas, espA_uf: +z.lA.toFixed(2), espB_modelo: +z.lB.toFixed(2), espC_ufModelo: +z.lC.toFixed(2), espE_ufModeloSemZona: +z.lE.toFixed(2),
  pBonfA: +(z.pA * n).toExponential(2), pBonfB: +(z.pB * n).toExponential(2), pBonfC: +(z.pC * n).toExponential(2), pBonfD: +(z.pD * n).toExponential(2), pBonfE: +(z.pE * n).toExponential(2),
  ue2013: +((z.modelos.ue2013 ?? 0) / z.secoes).toFixed(3), modelos: z.modelos });

const r = {
  fonte, secoesComDoisTurnos: secoes.length, secoesSemPar1t: semPar, zonas: n, novas: secoes.reduce((a, s) => a + s.nova, 0),
  novasCom1tReserva: secoes.filter((s) => s.nova && /reserva/.test(s.t1 ?? '')).length,
  taxaPorModeloInicio2t: Object.fromEntries(Object.entries(porModelo).map(([k, v]) => [k, { ...v, pct: +(100 * v.novas / v.secoes).toFixed(3) }])),
  phi: +phi.toFixed(3),
  sobreviventes: { A_uf: sobrevive('pA').map(fmt), B_modelo: sobrevive('pB').map(fmt), C_ufModelo: sobrevive('pC').map(fmt), D_ufModeloSuperdisp: sobrevive('pD').map(fmt), E_ufModeloSemZona: sobrevive('pE').map(fmt) },
  seteDoAutorNoNuloE: sobrevive('pA').map((z) => ({ zona: z.id, novas: z.novas, espE: +z.lE.toFixed(2), pBonfE: +(z.pE * n).toExponential(2) })),
};
const dir = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');
mkdirSync(dir, { recursive: true });
writeFileSync(path.join(dir, 'svc-zonas-2t.json'), JSON.stringify(r, null, 1));
console.log(`seções com os dois turnos: ${r.secoesComDoisTurnos} (sem par no 1º turno: ${semPar}); zonas: ${n}; trocas novas: ${r.novas} (com urna reserva também no 1º turno: ${r.novasCom1tReserva})`);
console.log('taxa de troca nova por modelo no início do 2º turno:', r.taxaPorModeloInicio2t);
console.log(`superdispersão de Pearson (nulo UF × modelo): phi = ${r.phi}`);
for (const [k, v] of Object.entries(r.sobreviventes)) {
  console.log(`\n## Nulo ${k}: ${v.length} zonas com p Bonferroni < 0,05`);
  for (const z of v) console.log(JSON.stringify(z));
}
