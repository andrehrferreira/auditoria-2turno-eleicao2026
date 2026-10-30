// Estatístico eleitoral, H19: análises EXPLORATÓRIAS, escritas depois de ver o resultado confirmatório
// (estatistico-h19-analise.mjs; plano docs/analysis/estatistico-eleitoral/20-h19-plano.md). Nada aqui entra na família de 105 testes.
// 1. Placebo do 1º turno para o M2 (o plano definiu o placebo só para o M1; o critério 2 fala do placebo "da unidade").
// 2. M2 por UF do Sudeste.
// 3. Dependência de poucas seções: tira cada seção S↑ do Sudeste, uma de cada vez, e cada município com S↑.
// 4. Padrão do salto: A (parece sensor: o leitor piorou ou a digital do mesário também passou a falhar) × B (o resto).
// 5. Tamanho em votos: β × (13 + 22) das seções S↑ ÷ 100; lista das seções S↑ do Sudeste com maior diferença de ΔY para os pares.
// Uso: node --max-old-space-size=8192 scripts/auditoria/estatistico-h19-exploratorio.mjs
// Saída: data/parsed/auditoria/estatistico/h19/exploratorio.json e sudeste-sup.csv
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { REGIOES, DIR, amostra, porGrupo, regredir, linhasModelo, unidades } from './estatistico-h19-lib.mjs';

const zDe = (r, i) => r.beta[i] / r.se[i];
const secsDe = (ufs, filtro = () => true) => { const set = new Set(ufs); return amostra.filter((s) => set.has(s.uf) && filtro(s)); };
const resumo = (r, i = 0) => (r ? { beta: r.beta[i], se: r.se[i], z: zDe(r, i), N: r.N } : null);
const out = {};

// padrão do salto
for (const s of amostra) {
  const hf1 = s.F1 ? s.H1 / s.F1 : 0, hf2 = s.F2 ? s.H2 / s.F2 : 0;
  s.dHF = hf2 - hf1;
  s.saltoFpp = 100 * s.saltoF;
  s.padraoA = s.Sup && (s.saltoA >= 0.3 || s.dHF >= 0.3) ? 1 : 0;
  s.padraoB = s.Sup && !s.padraoA ? 1 : 0;
}

// 1. placebo do M2
out.placeboM2 = {};
for (const [u, ufs] of unidades.slice(0, 6)) out.placeboM2[u] = resumo(regredir(linhasModelo(secsDe(ufs), 'M2', { desfecho: 'placebo' })));

// 2. M2 por UF do Sudeste (e das outras regiões, para comparação)
out.M2porUF = {};
for (const [u, ufs] of unidades.slice(6)) {
  const secs = secsDe(ufs);
  const r = regredir(linhasModelo(secs, 'M2'));
  out.M2porUF[u] = { ...resumo(r), secoesSup: secs.filter((s) => s.Sup).length };
}

// 3. dependência de poucas seções (Sudeste)
const SE = secsDe(REGIOES.Sudeste);
const base = regredir(linhasModelo(SE, 'M2'));
const supSE = SE.filter((s) => s.Sup);
const semCada = supSE.map((x) => ({ id: x.id, ...resumo(regredir(linhasModelo(SE.filter((s) => s !== x), 'M2'))) }));
semCada.sort((a, b) => a.z - b.z);
const munis = [...new Set(supSE.map((s) => `${s.uf}/${s.municipio}`))];
const semMuni = munis.map((m) => ({ municipio: m, secoesSup: supSE.filter((s) => `${s.uf}/${s.municipio}` === m).length, ...resumo(regredir(linhasModelo(SE.filter((s) => `${s.uf}/${s.municipio}` !== m), 'M2'))) }));
semMuni.sort((a, b) => a.z - b.z);
out.dependencia = { base: resumo(base), secoesSup: supSE.length, municipiosComSup: munis.length, menorZSemUmaSecao: semCada.slice(0, 5), menorZSemUmMunicipio: semMuni.slice(0, 5) };
// sem as k seções de maior contribuição (ΔY da seção − ΔY ponderado dos pares do grupo)
for (const s of supSE) {
  const pares = porGrupo.get(s.g).filter((p) => p !== s);
  const w = pares.reduce((a, p) => a + p.v13_2 + p.v22_2, 0);
  const dyP = pares.reduce((a, p) => a + (p.v13_2 + p.v22_2) * (p.Y2 - p.Y1), 0) / w;
  s.dyContraPares = 100 * ((s.Y2 - s.Y1) - dyP);
}
const ordenadas = [...supSE].sort((a, b) => b.dyContraPares - a.dyContraPares);
out.dependencia.semAsMaiores = [1, 3, 5, 10].map((k) => { const fora = new Set(ordenadas.slice(0, k)); return { k, ...resumo(regredir(linhasModelo(SE.filter((s) => !fora.has(s)), 'M2'))) }; });

// 4. padrão A × B (Brasil e regiões): ΔY ~ S↑A + S↑B + S↓ + controles
out.padrao = {};
for (const [u, ufs] of unidades.slice(0, 6)) {
  const secs = secsDe(ufs);
  const linhas = linhasModelo(secs, 'M2').map((l, i) => ({ ...l, x: [secs[i].padraoA, secs[i].padraoB, secs[i].Sdown] }));
  const r = regredir(linhas);
  out.padrao[u] = { secoesA: secs.filter((s) => s.padraoA).length, secoesB: secs.filter((s) => s.padraoB).length, A: resumo(r, 0), B: resumo(r, 1) };
}

// 5. tamanho em votos e lista do Sudeste
const wSup = supSE.reduce((a, s) => a + s.v13_2 + s.v22_2, 0);
out.tamanho = { votos13mais22NasSup: wSup, votosImplicitos: (base.beta[0] * wSup) / 100, mediaVotosPorSecao: wSup / supSE.length,
  porUF: Object.fromEntries(REGIOES.Sudeste.map((uf) => [uf, supSE.filter((s) => s.uf === uf).length])),
  trocadas: supSE.filter((s) => s.trocada).length, padraoA: supSE.filter((s) => s.padraoA).length, padraoB: supSE.filter((s) => s.padraoB).length,
  dyContraPares: { media: supSE.reduce((a, s) => a + s.dyContraPares, 0) / supSE.length, positivas: supSE.filter((s) => s.dyContraPares > 0).length, negativas: supSE.filter((s) => s.dyContraPares < 0).length } };

await writeFile(path.join(DIR, 'exploratorio.json'), JSON.stringify(out, null, 1));
const cols = ['id', 'modelo2', 'trocada', 'padraoA', 'B1', 'F1', 'H1', 'B2', 'F2', 'H2', 'saltoFpp', 'saltoA', 'dHF', 'zOd', 'E', 'v13_1', 'v22_1', 'v13_2', 'v22_2', 'dyContraPares'];
await writeFile(path.join(DIR, 'sudeste-sup.csv'), [cols.join(';'), ...ordenadas.map((s) => cols.map((c) => (typeof s[c] === 'number' ? +s[c].toPrecision(6) : s[c])).join(';'))].join('\n') + '\n');
console.log(JSON.stringify(out, null, 1));
