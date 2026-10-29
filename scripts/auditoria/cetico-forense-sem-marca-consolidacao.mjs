// Consolidação do parecer 13 (forense sem marca de fraude): confere os pontos em que as três lentes divergiram.
// Lê só CSVs já gerados (sem banco, sem rede):
//   data/parsed/auditoria/forense/secoes-2t.csv + locais.csv + perfil/  (via carregarSecoes do autor, para usar a MESMA categoria)
//   data/parsed/auditoria/cetico/forense-secoes-1t.csv                   (1º turno extraído pela lente de reprodução, 22 UFs)
// Saída: data/parsed/auditoria/cetico/forense-sem-marca-consolidacao.json
// Uso: node scripts/auditoria/cetico-forense-sem-marca-consolidacao.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { carregarSecoes } from './forense-lib.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const DIR = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico');
const chave = (s) => `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`;
const r1 = (x) => Math.round(x * 1000) / 10;

const secoes = (await carregarSecoes(2)).filter((s) => s.validos > 0 && s.aptos > 0);

// 1º turno (parcial)
const linhas1 = readFileSync(path.join(DIR, 'forense-secoes-1t.csv'), 'utf8').trim().split(/\r?\n/);
const cab = linhas1[0].split(';');
const t1 = new Map();
const ufs1 = new Set();
for (const l of linhas1.slice(1)) {
  const c = l.split(';');
  const o = Object.fromEntries(cab.map((k, i) => [k, c[i]]));
  for (const k of ['aptos', 'comparecimento', 'v13', 'v22', 'outros']) o[k] = Number(o[k]);
  o.validos = o.v13 + o.v22 + o.outros;
  ufs1.add(o.uf);
  t1.set(chave(o), o);
}

const conta = (arr, f) => arr.reduce((m, x) => ((m[f(x)] = (m[f(x)] ?? 0) + 1), m), {});
const especial = (s) => ['indigena', 'quilombola', 'prisional'].includes(s.categoria);

// A. Canto >= 95/>= 95 do 13: categoria pelo valor exato e pelo arredondado a 1 casa (como forense-klimek.mjs)
const canto13 = secoes.filter((s) => s.comp >= 0.95 && s.v13 / s.validos >= 0.95);
const cantoArred = secoes.filter((s) => Math.round(s.comp * 1000) / 10 >= 95 && Math.round((s.v13 / s.validos) * 1000) / 10 >= 95);
const canto = {
  exato_total: canto13.length,
  exato_por_categoria: conta(canto13, (s) => s.categoria),
  arredondado_total: cantoArred.length,
  arredondado_por_categoria: conta(cantoArred, (s) => s.categoria),
  com_1t: canto13.filter((s) => t1.has(chave(s))).length,
  com_1t_parcela13_ge90: canto13.filter((s) => { const o = t1.get(chave(s)); return o && o.v13 / o.validos >= 0.9; }).length,
  com_1t_canto95_no_1t: canto13.filter((s) => { const o = t1.get(chave(s)); return o && o.comparecimento / o.aptos >= 0.95 && o.v13 / o.validos >= 0.95; }).length,
};

// B. 110 seções com 100% dos válidos para um finalista
const cem = secoes.filter((s) => s.v13 === s.validos || s.v22 === s.validos).map((s) => ({ s, c: s.v13 === s.validos ? 13 : 22 }));
const cemCom1t = cem.filter(({ s }) => t1.has(chave(s)));
const parc1t = cemCom1t.map(({ s, c }) => { const o = t1.get(chave(s)); return (c === 13 ? o.v13 : o.v22) / o.validos; });
const cemRes = {
  total: cem.length,
  por_candidato: conta(cem, (x) => x.c),
  por_categoria: conta(cem, (x) => `${x.c}:${x.s.categoria}`),
  comuns: cem.filter((x) => x.s.categoria === 'comum').length,
  com_1t: cemCom1t.length,
  com_1t_ge90_mesmo_candidato: parc1t.filter((p) => p >= 0.9).length,
  min_parcela_1t: r1(Math.min(...parc1t)),
  sem_1t_por_uf: conta(cem.filter(({ s }) => !t1.has(chave(s))), (x) => x.s.uf),
};

// C. >= 90% (A4) do 13 por categoria
const a4 = secoes.filter((s) => s.v13 / s.validos >= 0.9);
const a4Res = { total13: a4.length, por_categoria: conta(a4, (s) => s.categoria) };

// D. Teto da circularidade por categoria: quanto de margem uma fraude restrita a aldeia+quilombo+presídio poderia mover
const esp = secoes.filter(especial);
const soma = (arr, f) => arr.reduce((t, x) => t + f(x), 0);
const tot = { v13: soma(secoes, (s) => s.v13), v22: soma(secoes, (s) => s.v22), validos: soma(secoes, (s) => s.validos) };
const teto = {
  secoes: esp.length,
  validos: soma(esp, (s) => s.validos),
  pct_validos_pais: +((100 * soma(esp, (s) => s.validos)) / tot.validos).toFixed(2),
  v22: soma(esp, (s) => s.v22),
  abstencoes: soma(esp, (s) => s.aptos - s.comparecimento),
  margem_max_troca_total: 2 * soma(esp, (s) => s.v22),
  margem_real: tot.v13 - tot.v22,
  sem_perfil: esp.filter((s) => s.pInd == null).length,
  sem_perfil_por_categoria: conta(esp.filter((s) => s.pInd == null), (s) => s.categoria),
};

// E. Cauda de comparecimento >= 94%
const cauda = secoes.filter((s) => s.comp >= 0.94);
const caudaRes = {
  total: cauda.length,
  vencidas_13: cauda.filter((s) => s.v13 > s.v22).length,
  por_categoria: conta(cauda, (s) => s.categoria),
  comuns_vencidas_13: cauda.filter((s) => s.categoria === 'comum' && s.v13 > s.v22).length,
  comuns: cauda.filter((s) => s.categoria === 'comum').length,
};

const saida = {
  gerado_em: new Date().toISOString(),
  universo_2t: secoes.length,
  t1_parcial: { ufs: [...ufs1].sort(), n_ufs: ufs1.size, secoes: t1.size },
  margem: { v13: tot.v13, v22: tot.v22, margem: tot.v13 - tot.v22 },
  canto, cem: cemRes, a4: a4Res, teto_categorias: teto, cauda94: caudaRes,
};
writeFileSync(path.join(DIR, 'forense-sem-marca-consolidacao.json'), JSON.stringify(saida, null, 2));
console.log(JSON.stringify(saida, null, 2));
