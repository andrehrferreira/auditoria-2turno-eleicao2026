// Demógrafo (H01 no 2º turno): comparecimento OFICIAL por faixa de idade, por turno, a partir do perfil_comparecimento_abstencao
// do TSE (município × zona × perfil). Diz quais turnos o arquivo traz e, para cada turno: taxa por faixa no país, taxa 100+
// por UF e nos municípios citados no tópico 6 da perícia e no doc 07 do demógrafo. Quando o arquivo tem os dois turnos,
// compara a mesma zona entre turnos (votantes 100+ do 2º − do 1º).
// Serve para 2026 (quando o TSE publicar o 2º turno) e para 2022 (linha de base: como o comparecimento 100+ variou entre
// os turnos numa eleição anterior). Tudo agregado; nenhum dado individual.
// Uso: node --max-old-space-size=4000 scripts/auditoria/demografo-h01-turnos-idade.mjs --ano 2026|2022 [--zip <caminho>]
// Saída: data/parsed/auditoria/demografo/turnos-idade-<ano>.json
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { entradasZip, linhasBrutas } from './contagem-zip.mjs';

const { values } = parseArgs({ options: { ano: { type: 'string', default: '2026' }, zip: { type: 'string' } } });
const ANO = values.ano;
const ZIP = values.zip ?? path.join(DIR_DADOS, 'raw', 'dadosabertos', 'perfil_comparecimento_abstencao', `perfil_comparecimento_abstencao_${ANO}.zip`);
const pct = (a, b) => (b ? +(100 * a / b).toFixed(3) : null);
function faixa(c) {
  if (c === 1600 || c === 1700) return 'f16_17';
  if (c === 7074 || c === 7579) return 'f70_79';
  if (c === 8084 || c === 8589) return 'f80_89';
  if (c === 9094 || c === 9599) return 'f90_99';
  if (c === 9999) return 'f100';
  if (c >= 1800 && c <= 6569) return 'f18_69';
  return 'invalida';
}
// municípios citados (código TSE): tópico 6 da perícia (Icatu, Redentora, Florianópolis, Pirapemas, Pilão Arcado, Arame)
// e doc 07 (2 acima do teto e 15 que passam no Bonferroni). Nomes conferidos no próprio arquivo.
const ALVO = new Set(['Icatu/MA', 'Redentora/RS', 'Florianópolis/SC', 'Pirapemas/MA', 'Pilão Arcado/BA', 'Arame/MA',
  'Santo Antônio do Leste/MT', 'Guaribas/PI', 'Montes Claros/MG', 'Alto Boa Vista/MT', 'Recife/PE', 'Vitória/ES', 'Campinápolis/MT',
  'Mococa/SP', 'Uberlândia/MG', 'São Fidélis/RJ', 'Niterói/RJ', 'Curralinho/PA', 'Benjamin Constant do Sul/RS', 'Vargem Grande do Rio Pardo/MG', 'Uberaba/MG']);
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
const ALVO_N = new Map([...ALVO].map((a) => [norm(a), a]));

const pais = new Map(); const fino = new Map(); const uf = new Map(); const mun = new Map(); const zona = new Map(); const geracao = new Set(); const codigos = new Map();
const soma = (m, k, ap, cp) => { const v = m.get(k) ?? m.set(k, [0, 0]).get(k); v[0] += ap; v[1] += cp; };
// Usa os CSV por UF quando cobrem as 27 UFs e o exterior (28 arquivos); senão usa o BRASIL (o zip de 2022 não traz DF nem ZZ por UF).
const todosCsv = (await entradasZip(ZIP)).filter((e) => /\.csv$/i.test(e.nome));
const porUf = todosCsv.filter((e) => !/BRASIL/i.test(e.nome));
const ents = porUf.length >= 28 ? porUf : todosCsv.filter((e) => /BRASIL/i.test(e.nome));
for (const e of ents) {
  let col = null;
  for await (const c of linhasBrutas(ZIP, e)) {
    if (!col) { col = Object.fromEntries(c.map((n, i) => [n, i])); continue; }
    const t = c[col.NR_TURNO]; const u = c[col.SG_UF];
    geracao.add(`${t}:${c[col.DT_GERACAO]}`);
    const cod = Number(c[col.CD_FAIXA_ETARIA]); const f = faixa(cod);
    codigos.set(`${cod}:${c[col.DS_FAIXA_ETARIA]}`, f);
    const ap = Number(c[col.QT_APTOS]); const cp = Number(c[col.QT_COMPARECIMENTO]);
    soma(pais, `${t}|${f}|total`, ap, cp);
    if (u === 'ZZ' || u === 'VT') { soma(pais, `${t}|${f}|${u === 'ZZ' ? 'exterior' : 'VT'}`, ap, cp); continue; }
    soma(pais, `${t}|${f}|brasil`, ap, cp);
    soma(fino, `${t}|${cod}`, ap, cp);
    if (f !== 'f100' && f !== 'f90_99') continue;
    soma(uf, `${t}|${u}|${f}`, ap, cp);
    const nm = `${c[col.NM_MUNICIPIO]}/${u}`;
    if (ALVO_N.has(norm(nm))) soma(mun, `${t}|${ALVO_N.get(norm(nm))}|${c[col.CD_MUNICIPIO]}|${f}`, ap, cp);
    if (f === 'f100') soma(zona, `${t}|${u}|${c[col.CD_MUNICIPIO]}|${c[col.NR_ZONA]}`, ap, cp);
  }
}
const turnos = [...new Set([...geracao].map((g) => g.split(':')[0]))].sort();
const R = { arquivo: path.relative(path.join(DIR_DADOS, '..'), ZIP).split(path.sep).join('/'), entradas: ents.map((e) => e.nome), csvPorUfNoZip: porUf.length, turnosNoArquivo: turnos, geracao: [...geracao].sort(), codigosFaixa: Object.fromEntries([...codigos].sort()) };
R.pais = {};
for (const [k, [ap, cp]] of [...pais].sort()) R.pais[k] = { aptos: ap, comparecimento: cp, taxa: pct(cp, ap) };
R.faixaFinaBrasil = {};
for (const [k, [ap, cp]] of [...fino].sort()) R.faixaFinaBrasil[k] = { aptos: ap, comparecimento: cp, taxa: pct(cp, ap) };
R.uf100 = {};
for (const [k, [ap, cp]] of [...uf].sort()) { const [t, u, f] = k.split('|'); if (f !== 'f100') continue; (R.uf100[u] ??= {})[`${t}t`] = { aptos: ap, comparecimento: cp, taxa: pct(cp, ap) }; }
R.municipiosCitados = {};
for (const [k, [ap, cp]] of [...mun].sort()) { const [t, nm, cod, f] = k.split('|'); ((R.municipiosCitados[`${nm} (${cod})`] ??= {})[f] ??= {})[`${t}t`] = { aptos: ap, comparecimento: cp, taxa: pct(cp, ap) }; }
if (turnos.includes('1') && turnos.includes('2')) {
  // mesma zona, 100+: votantes no 2º turno − no 1º
  const zs = new Set([...zona.keys()].map((k) => k.split('|').slice(1).join('|')));
  let subiu = 0; let caiu = 0; let igual = 0; let somaSubida = 0; const maiores = [];
  for (const z of zs) {
    const a = zona.get(`1|${z}`) ?? [0, 0]; const b = zona.get(`2|${z}`) ?? [0, 0];
    const d = b[1] - a[1];
    if (d > 0) { subiu++; somaSubida += d; } else if (d < 0) caiu++; else igual++;
    if (d > 0) maiores.push({ zona: z, aptos1t: a[0], votantes1t: a[1], aptos2t: b[0], votantes2t: b[1], diferenca: d });
  }
  maiores.sort((x, y) => y.diferenca - x.diferenca);
  R.zonas100EntreTurnos = { zonas: zs.size, subiu, caiu, igual, somaDasSubidas: somaSubida, maioresSubidas: maiores.slice(0, 20) };
}
const OUT = path.join(DIR_DADOS, 'parsed', 'auditoria', 'demografo', `turnos-idade-${ANO}.json`);
await writeFile(OUT, JSON.stringify(R, null, 1));
console.log(JSON.stringify({ ...R, municipiosCitados: undefined }, null, 1));
console.log('municípios citados:', JSON.stringify(R.municipiosCitados));
