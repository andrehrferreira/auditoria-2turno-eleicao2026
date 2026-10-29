// Revisão cética (dados e definições): o canto de Klimek (comp ≥ 95%, parcela do 13 ≥ 95%) entre os turnos.
// Uso: node scripts/auditoria/cetico-forense-dados-canto.mjs   → data/parsed/auditoria/cetico/forense-dados-canto.json
// (a) Tamanho dos estratos do nulo estratificado (estrato minúsculo reproduz o observado por construção).
// (b) Comparecimento do 1º turno nas seções com comp ≥ 95% no 2º: canto do 13 × demais (regressão à média).
// 1º turno lido da cópia de leitura (abrirLeitura); as UFs do 1º turno ainda carregando são tratadas como ausentes.
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { carregarSecoes, chaveSecao } from './forense-lib.mjs';

const SAIDA = path.join(path.resolve(import.meta.dirname, '..', '..'), 'data', 'parsed', 'auditoria', 'cetico');
const secoes = (await carregarSecoes(2)).filter((s) => s.aptos > 0 && s.validos > 0);
const parc = (s) => s.v13 / s.validos;
const faixaApt = (a) => (a < 50 ? 'a<50' : a < 100 ? 'a<100' : a < 200 ? 'a<200' : a < 300 ? 'a<300' : 'a300+');
const est = (s) => `${s.uf}/${s.zona}|${faixaApt(s.aptos)}|${s.categoria === 'comum' ? 'c' : 'nc'}`;
const tam = new Map();
for (const s of secoes) tam.set(est(s), (tam.get(est(s)) ?? 0) + 1);
const canto = secoes.filter((s) => s.comp >= 0.95 && parc(s) >= 0.95);
const hist = {};
for (const s of canto) { const n = tam.get(est(s)); const f = n === 1 ? '1' : n <= 3 ? '2-3' : n <= 10 ? '4-10' : '11+'; hist[f] = (hist[f] ?? 0) + 1; }

const { db, fonte } = await abrirLeitura();
const ufs1 = new Set(db.prepare('SELECT uf FROM carga WHERE turno = 1').all().map((r) => r.uf));
const comp1 = new Map();
for (const r of db.prepare(`SELECT uf, municipio, zona, secao, aptos, comparecimento_majoritario c FROM secao_eleicao
  WHERE turno = 1 AND eleicao = 6257`).iterate()) if (r.aptos > 0 && r.c != null) comp1.set(chaveSecao(r), r.c / r.aptos);
db.close();

function resumo(lista) {
  const com = lista.filter((s) => ufs1.has(s.uf) && comp1.has(chaveSecao(s)));
  const d = com.map((s) => s.comp - comp1.get(chaveSecao(s))).sort((a, b) => a - b);
  return { n: lista.length, com1t: com.length, comp95_1t: com.filter((s) => comp1.get(chaveSecao(s)) >= 0.95).length,
    fracao95_1t: com.length ? +(com.filter((s) => comp1.get(chaveSecao(s)) >= 0.95).length / com.length).toFixed(3) : null,
    deltaCompMediana_pp: d.length ? +(100 * d[Math.floor(d.length / 2)]).toFixed(1) : null };
}
const alto = secoes.filter((s) => s.comp >= 0.95);
const todos = resumo(secoes);
const res = {
  fonte1t: path.basename(fonte), ufs1t: [...ufs1].sort().join(','),
  estratoDoCanto: hist,
  comp95_2t: {
    canto13: resumo(canto),
    comp95_parc13menor95: resumo(alto.filter((s) => parc(s) < 0.95)),
    comp95_parc22maior50: resumo(alto.filter((s) => parc(s) < 0.5)),
    canto13_indigena: resumo(canto.filter((s) => s.categoria === 'indigena')),
    canto13_comum: resumo(canto.filter((s) => s.categoria === 'comum')),
  },
  todasSecoes_deltaCompMediana_pp: todos.deltaCompMediana_pp,
};
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, 'forense-dados-canto.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
