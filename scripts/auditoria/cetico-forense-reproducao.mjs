// Revisor cético, achado forense-sem-marca-de-fraude (docs/analysis/forense-estatistica/01 e 07), lente reprodução.
// Reprodução INDEPENDENTE dos números centrais, sem usar forense-lib.mjs nem os CSVs do autor como entrada:
//   totais do 2º turno; seções com 100% e ≥ 90% dos válidos por candidato; canto de Klimek (≥95/≥95, ≥90/≥90);
//   cauda de comparecimento ≥ 94%; correlação comparecimento × parcela do 13 dentro da zona; estabilidade 1º → 2º
//   turno das seções com 100% (com as UFs do 1º turno que estão na cópia de leitura agora).
// Uso: node scripts/auditoria/cetico-forense-reproducao.mjs
// Banco: cópia de leitura imutável (abrirLeitura). Saídas em data/parsed/auditoria/cetico/:
//   forense-secoes-2t.csv, forense-secoes-1t.csv (tabela mínima por seção, para o teste de poder)
//   forense-reproducao.json (números) e forense-reproducao-canto.csv (as seções do canto ≥95/≥95).
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const SAIDA = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico');
mkdirSync(SAIDA, { recursive: true });
const { db, fonte, ponteiro } = await abrirLeitura();
console.log(`banco: ${fonte}`);

const ufsCarga = (t) => db.prepare('SELECT uf FROM carga WHERE turno = ? ORDER BY uf').all(t).map((r) => r.uf);

function secoesDoTurno(turno) {
  const eleicao = turno === 1 ? 6257 : 6258;
  // Votos de presidente agregados por seção já no SQL (sem depender de ordem nem de mapa em JS).
  const votos = new Map();
  for (const r of db.prepare(`SELECT uf, municipio, zona, secao,
      SUM(CASE WHEN tipo_voto = 'nominal' AND numero = 13 THEN quantidade ELSE 0 END) AS v13,
      SUM(CASE WHEN tipo_voto = 'nominal' AND numero = 22 THEN quantidade ELSE 0 END) AS v22,
      SUM(CASE WHEN tipo_voto = 'nominal' AND numero NOT IN (13, 22) THEN quantidade ELSE 0 END) AS outros,
      SUM(CASE WHEN tipo_voto = 'branco' THEN quantidade ELSE 0 END) AS branco,
      SUM(CASE WHEN tipo_voto = 'nulo' THEN quantidade ELSE 0 END) AS nulo,
      SUM(CASE WHEN tipo_voto NOT IN ('nominal', 'branco', 'nulo') THEN quantidade ELSE 0 END) AS outro_tipo
    FROM voto_bu WHERE turno = ? AND cargo = 1 AND eleicao = ? GROUP BY uf, municipio, zona, secao`).iterate(turno, eleicao)) {
    votos.set(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, r);
  }
  const lista = [];
  const situacoes = {};
  for (const s of db.prepare(`SELECT s.uf, s.municipio, s.zona, s.secao, s.situacao, s.tipo_urna, s.tipo_arquivo,
      e.aptos, e.comparecimento_majoritario AS comp_maj, s.comparecimento AS comp_secao
    FROM secao s LEFT JOIN secao_eleicao e ON e.turno = s.turno AND e.uf = s.uf AND e.municipio = s.municipio
      AND e.zona = s.zona AND e.secao = s.secao AND e.eleicao = ?
    WHERE s.turno = ?`).iterate(eleicao, turno)) {
    situacoes[s.situacao] = (situacoes[s.situacao] ?? 0) + 1;
    const v = votos.get(`${s.uf}/${s.municipio}/${s.zona}/${s.secao}`);
    if (!v) continue;
    votos.delete(`${s.uf}/${s.municipio}/${s.zona}/${s.secao}`);
    lista.push({ uf: s.uf, municipio: s.municipio, zona: s.zona, secao: s.secao, situacao: s.situacao, tipo_urna: s.tipo_urna,
      tipo_arquivo: s.tipo_arquivo, aptos: s.aptos, comp_maj: s.comp_maj, comp_secao: s.comp_secao,
      v13: v.v13, v22: v.v22, outros: v.outros, branco: v.branco, nulo: v.nulo, outro_tipo: v.outro_tipo });
  }
  return { lista, situacoes, votosSemSecao: votos.size };
}

function pearsonCentradoZona(secoes, x, y) {
  const zonas = new Map();
  for (const s of secoes) {
    const k = `${s.uf}/${s.zona}`;
    if (!zonas.has(k)) zonas.set(k, []);
    zonas.get(k).push(s);
  }
  let sxy = 0, sxx = 0, syy = 0, n = 0;
  for (const g of zonas.values()) {
    if (g.length < 3) continue;
    const mx = g.reduce((a, s) => a + x(s), 0) / g.length, my = g.reduce((a, s) => a + y(s), 0) / g.length;
    for (const s of g) { const dx = x(s) - mx, dy = y(s) - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; n++; }
  }
  return { r: sxy / Math.sqrt(sxx * syy), n };
}

const res = { banco: path.basename(fonte), copia: ponteiro?.criadoEm, ufs1t: ufsCarga(1), ufs2t: ufsCarga(2).length };
const csv = (lista) => ['uf;municipio;zona;secao;tipo_urna;tipo_arquivo;aptos;comparecimento;v13;v22;outros;branco;nulo',
  ...lista.map((s) => [s.uf, s.municipio, s.zona, s.secao, s.tipo_urna, s.tipo_arquivo, s.aptos, s.comp, s.v13, s.v22, s.outros, s.branco, s.nulo].join(';'))].join('\n') + '\n';

const turnos = {};
for (const t of [2, 1]) {
  const { lista, situacoes, votosSemSecao } = secoesDoTurno(t);
  for (const s of lista) { s.comp = s.comp_maj ?? s.comp_secao; s.validos = s.v13 + s.v22 + s.outros; }
  writeFileSync(path.join(SAIDA, `forense-secoes-${t}t.csv`), csv(lista));
  turnos[t] = lista;
  const tot = lista.reduce((a, s) => ({ v13: a.v13 + s.v13, v22: a.v22 + s.v22, comp: a.comp + s.comp, outros: a.outros + s.outros, outroTipo: a.outroTipo + s.outro_tipo }),
    { v13: 0, v22: 0, comp: 0, outros: 0, outroTipo: 0 });
  res[`t${t}`] = {
    situacoes, votosSemSecao, secoesComVoto: lista.length, comValidos: lista.filter((s) => s.validos > 0).length, ...tot,
    somaVotosDiferenteComparecimento: lista.filter((s) => s.v13 + s.v22 + s.outros + s.branco + s.nulo !== s.comp).length,
    compMajNulo: lista.filter((s) => s.comp_maj == null).length,
    compMajDiferenteSecao: lista.filter((s) => s.comp_maj != null && s.comp_maj !== s.comp_secao).length,
    porTipoArquivo: lista.reduce((a, s) => ((a[s.tipo_arquivo] = (a[s.tipo_arquivo] ?? 0) + 1), a), {}),
  };
}

// ---------- 2º turno: concentração e Klimek ----------
const s2 = turnos[2].filter((s) => s.validos > 0 && s.aptos > 0);
const conc = {};
for (const c of [13, 22]) {
  const v = `v${c}`;
  const ge90 = s2.filter((s) => 10 * s[v] >= 9 * s.validos); // inteiro: x/n ≥ 0,9 ⇔ 10x ≥ 9n
  conc[c] = {
    cem: s2.filter((s) => s[v] === s.validos).length,
    ge90: ge90.length,
    ge90PorTipoArquivo: ge90.reduce((a, s) => ((a[s.tipo_arquivo] = (a[s.tipo_arquivo] ?? 0) + 1), a), {}),
    cemMedianaValidos: (() => { const xs = s2.filter((s) => s[v] === s.validos).map((s) => s.validos).sort((a, b) => a - b); return xs[Math.floor(xs.length / 2)]; })(),
    cemMenos50: s2.filter((s) => s[v] === s.validos && s.validos < 50).length,
  };
  // canto de Klimek, com inteiros: comp/aptos ≥ 0,95 ⇔ 100·comp ≥ 95·aptos
  conc[c].canto95 = s2.filter((s) => 100 * s.comp >= 95 * s.aptos && 100 * s[v] >= 95 * s.validos).length;
  conc[c].canto90 = s2.filter((s) => 10 * s.comp >= 9 * s.aptos && 10 * s[v] >= 9 * s.validos).length;
}
res.concentracao2t = conc;
res.comparecimento2t = {
  acima100: s2.filter((s) => s.comp > s.aptos).length, igual100: s2.filter((s) => s.comp === s.aptos).length,
  ge95: s2.filter((s) => 100 * s.comp >= 95 * s.aptos).length, ge94: s2.filter((s) => 100 * s.comp >= 94 * s.aptos).length,
  ge94_13vence: s2.filter((s) => 100 * s.comp >= 94 * s.aptos && s.v13 > s.v22).length,
};
res.correlacaoDentroZona2t = pearsonCentradoZona(s2, (s) => s.comp / s.aptos, (s) => s.v13 / s.validos);
// Faixas de comparecimento: parcela média do 13 (como no doc 03)
res.faixasComp2t = [];
for (let lo = 80; lo < 100; lo += 2) {
  const g = s2.filter((s) => 100 * s.comp >= lo * s.aptos && (lo === 98 ? true : 100 * s.comp < (lo + 2) * s.aptos));
  res.faixasComp2t.push({ faixa: `${lo}-${lo + 2}`, secoes: g.length, parcela13Media: +(100 * g.reduce((a, s) => a + s.v13 / s.validos, 0) / g.length).toFixed(1) });
}

// ---------- estabilidade 1º → 2º turno ----------
const p1 = new Map(turnos[1].filter((s) => s.validos > 0).map((s) => [`${s.uf}/${s.municipio}/${s.zona}/${s.secao}`, s]));
const estab = {};
for (const c of [13, 22]) {
  const v = `v${c}`;
  const cem = s2.filter((s) => s[v] === s.validos);
  const com1 = cem.map((s) => ({ s, o: p1.get(`${s.uf}/${s.municipio}/${s.zona}/${s.secao}`) })).filter((x) => x.o);
  const pct1 = com1.map((x) => x.o[v] / x.o.validos).sort((a, b) => a - b);
  estab[c] = { cem2t: cem.length, com1t: com1.length, ge90no1t: pct1.filter((p) => p >= 0.9).length, ge95no1t: pct1.filter((p) => p >= 0.95).length, minimo1t: pct1.length ? +(100 * pct1[0]).toFixed(1) : null };
}
res.estabilidade100 = estab;

// canto ≥95/≥95 do 13: lista e 1º turno
const canto = s2.filter((s) => 100 * s.comp >= 95 * s.aptos && 100 * s.v13 >= 95 * s.validos).map((s) => {
  const o = p1.get(`${s.uf}/${s.municipio}/${s.zona}/${s.secao}`);
  return { ...s, pct13: +(100 * s.v13 / s.validos).toFixed(1), pctComp: +(100 * s.comp / s.aptos).toFixed(1),
    pct13_1t: o ? +(100 * o.v13 / o.validos).toFixed(1) : '', pctComp_1t: o && o.aptos ? +(100 * o.comp / o.aptos).toFixed(1) : '' };
});
res.canto95_13 = { n: canto.length, com1t: canto.filter((c) => c.pct13_1t !== '').length,
  noCanto1t: canto.filter((c) => c.pct13_1t !== '' && c.pct13_1t >= 95 && c.pctComp_1t >= 95).length,
  parcela1tGe90: canto.filter((c) => c.pct13_1t !== '' && c.pct13_1t >= 90).length,
  comp1tGe90: canto.filter((c) => c.pctComp_1t !== '' && c.pctComp_1t >= 90).length };
writeFileSync(path.join(SAIDA, 'forense-reproducao-canto.csv'),
  ['uf;municipio;zona;secao;tipo_urna;aptos;comparecimento;v13;v22;validos;pct13;pctComp;pct13_1t;pctComp_1t',
    ...canto.map((c) => [c.uf, c.municipio, c.zona, c.secao, c.tipo_urna, c.aptos, c.comp, c.v13, c.v22, c.validos, c.pct13, c.pctComp, c.pct13_1t, c.pctComp_1t].join(';'))].join('\n') + '\n');

writeFileSync(path.join(SAIDA, 'forense-reproducao.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
db.close();
