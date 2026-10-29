// H13, método "limites": imprime em Markdown as tabelas do documento
// docs/analysis/hipotese-liberacao-mesario/02-limites-deterministicos.md a partir da saída de
// liberacao-limites-deterministicos.mjs. Uso: node scripts/auditoria/liberacao-limites-tabela.mjs

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const j = JSON.parse(await readFile(path.join(RAIZ, 'data', 'parsed', 'auditoria', 'liberacao', 'limites-deterministicos.json'), 'utf8'));

const GRUPOS = [
  ['br', 'Brasil'], ['regiao:nordeste', '**Nordeste**'], ['uf:al', '  AL'], ['uf:ba', '  BA'], ['uf:ce', '  CE'], ['uf:ma', '  MA'],
  ['uf:pb', '  PB'], ['uf:pe', '  PE'], ['uf:pi', '  PI'], ['uf:rn', '  RN'], ['uf:se', '  SE'],
  ['regiao:norte', 'Norte'], ['regiao:centro-oeste', 'Centro-Oeste'], ['regiao:sudeste', 'Sudeste'], ['regiao:sul', 'Sul'], ['regiao:exterior', 'Exterior'],
];
const pct = (x) => (x === null || x === undefined ? '–' : (100 * x).toFixed(1));
const faixa = ([a, b]) => `${pct(a)}–${pct(b)}`;
const mil = (x) => Math.round(x).toLocaleString('pt-BR');

for (const turno of Object.keys(j.turnos).sort().reverse()) {
  for (const def of ['L1', 'L2']) {
    const d = j.turnos[turno].definicoes[def];
    console.log(`\n### ${turno}º turno, ${def}\n`);
    console.log('| Grupo | Seções | L (liberados) | L/T % | 13 na seção % (13+22) | Liberados que votaram 13: faixa % de L | se iguais à seção % de L | 13 entre liberados (13+22): faixa % | idem, se iguais à seção % | Forçam 13 (≥1) obs / esp | Forçam 22 (≥1) obs / esp | Forçam ≥10: 13 / 22 | Margem 13−22 dos não liberados: pior–melhor |');
    console.log('|---|---:|---:|---:|---:|---|---:|---|---:|---|---|---|---|');
    for (const [k, nome] of GRUPOS) {
      const a = d.agregados[k];
      if (!a) continue;
      const p = d.permutacaoZona?.[k];
      const oe = (c) => (p ? `${mil(p[c].observado)} / ${mil(p[c].esperado)}${p[c].esperado ? ' (' + (p[c].observado / p[c].esperado).toFixed(2) + ')' : ''}` : `${mil(a[c])} / –`);
      console.log(`| ${nome} | ${mil(a.secoes)} | ${mil(a.L)} | ${pct(a.taxaLiberacao)} | ${pct(a.parcela13DoisPartidosSecao)} | ${faixa(a.lib13)} | ${pct(a.lib13Homogeneo)} | ${faixa(a.lib13DoisPartidos)} | ${pct(a.lib13DoisPartidosHomogeneo)} | ${oe('forca13_1')} | ${oe('forca22_1')} | ${mil(a.forca13_10)} / ${mil(a.forca22_10)} | ${mil(a.margemNaoLiberados[0])} a ${mil(a.margemNaoLiberados[1])} |`);
    }
    if (d.permutacaoZona) {
      console.log('\nVotos forçados (Σ min) observados × esperados com a taxa de liberação embaralhada na zona, e fração das repetições ≥ observado:\n');
      console.log('| Grupo | Σmin13 obs | Σmin13 esp | frac ≥ | Σmin22 obs | Σmin22 esp | frac ≥ | Forçam 13 (≥1) frac ≥ | Forçam 22 (≥1) frac ≥ |');
      console.log('|---|---:|---:|---:|---:|---:|---:|---:|---:|');
      for (const [k, nome] of GRUPOS) {
        const p = d.permutacaoZona[k];
        if (!p) continue;
        console.log(`| ${nome} | ${mil(p.min13.observado)} | ${mil(p.min13.esperado)} | ${p.min13.fracaoRepsMaiorOuIgual} | ${mil(p.min22.observado)} | ${mil(p.min22.esperado)} | ${p.min22.fracaoRepsMaiorOuIgual} | ${p.forca13_1.fracaoRepsMaiorOuIgual} | ${p.forca22_1.fracaoRepsMaiorOuIgual} |`);
      }
    }
    for (const lado of ['13', '22']) {
      console.log(`\nMaiores mínimos forçados para o ${lado} (${turno}º turno, ${def}):\n`);
      console.log('| UF | Município | Zona | Seção | Tipo urna | T | 13 | 22 | Br | Nu | L | min13 | min22 |');
      console.log('|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
      for (const s of d[`topo${lado}`].slice(0, 8)) {
        console.log(`| ${s.uf} | ${s.municipio} | ${s.zona} | ${s.secao} | ${s.tipoUrna} | ${s.T} | ${s.V13} | ${s.V22} | ${s.B} | ${s.N} | ${s.L} | ${s.min13} | ${s.min22} |`);
      }
    }
  }
}
