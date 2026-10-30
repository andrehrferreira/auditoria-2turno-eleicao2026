// H26, linha de base: a triagem por zona de virada-zonas.mjs refeita em 2018, 2022 e 2026 com o mesmo método, para saber
// se as zonas que se destacam em 2026 já se destacavam antes (docs/analysis/virada-zonas/03-linha-de-base.md).
//   - Fonte: votacao_candidato_munzona_<ano>_BR.csv (só votos nominais; sem brancos, nulos nem abstenção).
//   - Lado medido: o 13 (PT nos três anos) contra o outro finalista (17 em 2018, 22 em 2022 e 2026).
//   - Unidade de ajuste: município × zona. Esperado por UF (região, se a UF tiver menos de 10 unidades por preditor),
//     MQ sem intercepto dos votos do 13 e do rival no 2º turno sobre os votos do 1º turno de cada candidato com ≥ 2% no
//     país, os demais somados. Resíduo líquido somado por zona; z robusto por região como em virada-zonas.mjs.
//   - Comparação: z e virada bruta da mesma zona (UF + número) entre os anos; as zonas da cauda de 2026 (zonas.csv).
// Só leitura. Uso: node --max-old-space-size=8192 scripts/auditoria/virada-zonas-historico.mjs
// Saídas em data/parsed/auditoria/virada-zonas/: historico-zonas.csv e historico.json.
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { RAIZ, paraCsv, mqo, medianaMad, pearson } from './forense-lib.mjs';
import { REGIAO } from './estatistico-lib.mjs';
import { entradasZip, linhasBrutas } from './contagem-zip.mjs';

const SAIDA = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'virada-zonas');
const ANOS = { 2018: '17', 2022: '22', 2026: '22' };
const r2 = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : null);
const r3 = (x) => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : null);
const pp = (a, b) => (b > 0 ? (100 * a) / b : NaN);
const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const resumo = { geradoEm: new Date().toISOString(), anos: {} };

async function lerAno(ano) {
  const zip = path.join(RAIZ, 'data', 'raw', 'dadosabertos', 'votacao_candidato_munzona', `votacao_candidato_munzona_${ano}.zip`);
  const e = (await entradasZip(zip)).find((x) => x.nome === `votacao_candidato_munzona_${ano}_BR.csv`);
  const unidades = new Map();
  const total = [null, {}, {}];
  let col = null, colunasErradas = 0;
  for await (const c of linhasBrutas(zip, e)) {
    if (!col) { col = Object.fromEntries(c.map((x, i) => [x, i])); continue; }
    if (c.length !== Object.keys(col).length) { colunasErradas++; continue; }
    if (c[col.CD_CARGO] !== '1') continue;
    const t = Number(c[col.NR_TURNO]);
    const uf = c[col.SG_UF].toLowerCase();
    const zona = c[col.NR_ZONA].padStart(4, '0');
    const k = `${uf}|${c[col.CD_MUNICIPIO]}|${zona}`;
    let u = unidades.get(k);
    if (!u) { u = { uf, zona, municipio: c[col.CD_MUNICIPIO], nome: c[col.NM_MUNICIPIO], v: [null, {}, {}] }; unidades.set(k, u); }
    const nr = c[col.NR_CANDIDATO], q = Number(c[col.QT_VOTOS_NOMINAIS]);
    u.v[t][nr] = (u.v[t][nr] ?? 0) + q;
    total[t][nr] = (total[t][nr] ?? 0) + q;
  }
  return { unidades: [...unidades.values()].filter((u) => Object.keys(u.v[1]).length && Object.keys(u.v[2]).length), total, colunasErradas };
}

function triagem(ano, { unidades, total, colunasErradas }) {
  const rival = ANOS[ano];
  const nominais1 = Object.values(total[1]).reduce((a, b) => a + b, 0);
  const proprios = Object.entries(total[1]).filter(([nr, q]) => q / nominais1 >= 0.02).map(([nr]) => nr)
    .sort((a, b) => (a === '13' ? -1 : b === '13' ? 1 : a === rival ? -1 : b === rival ? 1 : total[1][b] - total[1][a]));
  const X = (u) => [...proprios.map((nr) => u.v[1][nr] ?? 0), Object.entries(u.v[1]).filter(([nr]) => !proprios.includes(nr)).reduce((a, [, q]) => a + q, 0)];
  const k = proprios.length + 1;
  const info = { rival, preditores: [...proprios, 'demais'], unidades: unidades.length, colunasErradas,
    total: { 1: { 13: total[1]['13'], [rival]: total[1][rival] }, 2: { 13: total[2]['13'], [rival]: total[2][rival] } }, ajuste: {} };
  // ajuste por UF; UF pequena usa a região
  const grupoAjuste = new Map();
  for (const uf of new Set(unidades.map((u) => u.uf))) {
    const n = unidades.filter((u) => u.uf === uf).length;
    grupoAjuste.set(uf, n >= 10 * k ? uf : `regiao:${REGIAO[uf]}`);
  }
  for (const g of new Set(grupoAjuste.values())) {
    const lista = unidades.filter((u) => grupoAjuste.get(u.uf) === g);
    const Xs = lista.map(X);
    const b13 = mqo(Xs, lista.map((u) => u.v[2]['13'] ?? 0));
    const bR = mqo(Xs, lista.map((u) => u.v[2][rival] ?? 0));
    info.ajuste[g] = { unidades: lista.length, ufs: [...new Set(lista.map((u) => u.uf))].join(',') };
    for (const u of lista) {
      const x = X(u);
      u.rl = ((u.v[2]['13'] ?? 0) - x.reduce((a, v, i) => a + v * b13[i], 0)) - ((u.v[2][rival] ?? 0) - x.reduce((a, v, i) => a + v * bR[i], 0));
    }
  }
  const Z = new Map();
  for (const u of unidades) {
    const kz = `${u.uf}|${u.zona}`;
    const z = Z.get(kz) ?? Z.set(kz, { uf: u.uf, zona: u.zona, regiao: REGIAO[u.uf], a1: 0, b1: 0, n1: 0, a2: 0, b2: 0, rl: 0, mun: new Map() }).get(kz);
    z.a1 += u.v[1]['13'] ?? 0; z.b1 += u.v[1][rival] ?? 0; z.n1 += Object.values(u.v[1]).reduce((a, b) => a + b, 0);
    z.a2 += u.v[2]['13'] ?? 0; z.b2 += u.v[2][rival] ?? 0; z.rl += u.rl;
    z.mun.set(u.nome, (z.mun.get(u.nome) ?? 0) + (u.v[2]['13'] ?? 0) + (u.v[2][rival] ?? 0));
  }
  const zonas = [...Z.values()];
  const ufVirada = {};
  for (const uf of new Set(zonas.map((z) => z.uf))) {
    const l = zonas.filter((z) => z.uf === uf);
    const s = (c) => l.reduce((a, z) => a + z[c], 0);
    ufVirada[uf] = pp(s('a2') - s('b2'), s('a2') + s('b2')) - pp(s('a1') - s('b1'), s('n1'));
  }
  for (const z of zonas) {
    z.n2 = z.a2 + z.b2;
    z.virada = pp(z.a2 - z.b2, z.n2) - pp(z.a1 - z.b1, z.n1);
    z.desvioUf = z.virada - ufVirada[z.uf];
    z.alem = pp(z.rl, z.n2);
    z.t = z.n2 > 0 ? z.rl / Math.sqrt(z.n2) : NaN;
    z.municipio = [...z.mun].sort((a, b) => b[1] - a[1])[0][0];
  }
  for (const reg of new Set(zonas.map((z) => z.regiao))) {
    const l = zonas.filter((z) => z.regiao === reg && Number.isFinite(z.t));
    const { mediana, mad } = medianaMad(l.map((z) => z.t));
    for (const z of l) z.z = mad > 0 ? (z.t - mediana) / mad : NaN;
  }
  info.zonas = zonas.length;
  info.viradaBrasil = r2(pp(zonas.reduce((a, z) => a + z.a2 - z.b2, 0), zonas.reduce((a, z) => a + z.n2, 0)) - pp(zonas.reduce((a, z) => a + z.a1 - z.b1, 0), zonas.reduce((a, z) => a + z.n1, 0)));
  info.zAbs3 = zonas.filter((z) => Math.abs(z.z) >= 3).length;
  return { info, zonas: new Map(zonas.map((z) => [`${z.uf}|${z.zona}`, z])) };
}

const R = {};
for (const ano of Object.keys(ANOS)) {
  const dados = await lerAno(ano);
  R[ano] = triagem(ano, dados);
  resumo.anos[ano] = R[ano].info;
  log(`${ano}: ${R[ano].info.zonas} zonas, ${R[ano].info.unidades} unidades`);
}

// Conferência do 2026: zonas.csv (método por seção) × método munzona
const linhasZ = readFileSync(path.join(SAIDA, 'zonas.csv'), 'utf8').trim().split('\n');
const cab = linhasZ[0].split(';');
const secao = new Map(linhasZ.slice(1).map((l) => { const c = l.split(';'); const o = Object.fromEntries(cab.map((n, i) => [n, c[i]])); return [`${o.uf}|${o.zona}`, o]; }));
const pares = [...secao].map(([k, o]) => [Number(o.z), R[2026].zonas.get(k)?.z]).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
resumo.conferencia2026 = { zonasSecao: secao.size, zonasMunzona: R[2026].zonas.size, emComum: pares.length,
  correlacaoZSecaoMunzona: r3(pearson(pares.map((p) => p[0]), pares.map((p) => p[1]))) };

// Mesma zona entre os anos
const corr = (a, b, c) => {
  const p = [...R[a].zonas].map(([k, z]) => [z[c], R[b].zonas.get(k)?.[c]]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  return { zonas: p.length, r: r3(pearson(p.map((x) => x[0]), p.map((x) => x[1]))) };
};
resumo.mesmaZona = {
  z: { '2026x2022': corr(2026, 2022, 'z'), '2026x2018': corr(2026, 2018, 'z'), '2022x2018': corr(2022, 2018, 'z') },
  desvioDaUf: { '2026x2022': corr(2026, 2022, 'desvioUf'), '2026x2018': corr(2026, 2018, 'desvioUf'), '2022x2018': corr(2022, 2018, 'desvioUf') },
  municipioPrincipalIgual: Object.fromEntries([2022, 2018].map((a) => [a, [...R[2026].zonas].filter(([k, z]) => R[a].zonas.get(k)?.municipio === z.municipio).length])),
};

// Percentil de cada zona no ano (pelo z, 0 = mais para o rival, 100 = mais para o 13)
const percentil = {};
for (const ano of Object.keys(ANOS)) {
  const v = [...R[ano].zonas.values()].filter((z) => Number.isFinite(z.z)).sort((a, b) => a.z - b.z);
  v.forEach((z, i) => { z.pct = (100 * i) / (v.length - 1); });
  percentil[ano] = v.length;
}
const linhas = [];
for (const [k, o] of secao) {
  const l = { uf: o.uf, zona: o.zona, municipio: o.municipioPrincipal, z2026Secao: Number(o.z), fora2026: Number(o.fora) };
  for (const ano of Object.keys(ANOS)) {
    const z = R[ano].zonas.get(k);
    Object.assign(l, { [`virada${ano}`]: r2(z?.virada), [`desvioUf${ano}`]: r2(z?.desvioUf), [`alem${ano}`]: r2(z?.alem), [`z${ano}`]: r2(z?.z), [`pct${ano}`]: r2(z?.pct), [`mun${ano}`]: z?.municipio ?? '' });
  }
  linhas.push(l);
}
linhas.sort((a, b) => (b.z2026Secao || 0) - (a.z2026Secao || 0));
await writeFile(path.join(SAIDA, 'historico-zonas.csv'), paraCsv(linhas, Object.keys(linhas[0])));

// Caudas de 2026 (método por seção): onde estavam em 2018 e 2022
const cauda = (f) => {
  const l = linhas.filter(f);
  const med = (c) => r2(medianaMad(l.map((x) => x[c]).filter(Number.isFinite)).mediana);
  return { zonas: l.length, comHistorico2022: l.filter((x) => Number.isFinite(x.z2022)).length, comHistorico2018: l.filter((x) => Number.isFinite(x.z2018)).length,
    pctMediano2022: med('pct2022'), pctMediano2018: med('pct2018'), zMediano2022: med('z2022'), zMediano2018: med('z2018'),
    acimaDe90_2022: l.filter((x) => x.pct2022 >= 90).length, acimaDe90_2018: l.filter((x) => x.pct2018 >= 90).length,
    abaixoDe10_2022: l.filter((x) => x.pct2022 <= 10).length, abaixoDe10_2018: l.filter((x) => x.pct2018 <= 10).length,
    lista: l.map((x) => ({ uf: x.uf, zona: x.zona, municipio: x.municipio, z2026: r2(x.z2026Secao), z2022: x.z2022, pct2022: x.pct2022, z2018: x.z2018, pct2018: x.pct2018, mesmoMunicipio2018: x.mun2018 === x.mun2026 })) };
};
resumo.caudas = {
  'z>=3 para o 13': cauda((x) => x.z2026Secao >= 3),
  'z<=-3 para o 22': cauda((x) => x.z2026Secao <= -3),
  'fora da curva para o 22': cauda((x) => x.fora2026 === 22),
};
await writeFile(path.join(SAIDA, 'historico.json'), JSON.stringify(resumo, null, 1));
log('fim');
console.log(JSON.stringify({ anos: resumo.anos, conferencia2026: resumo.conferencia2026, mesmaZona: resumo.mesmaZona,
  caudas: Object.fromEntries(Object.entries(resumo.caudas).map(([k, v]) => [k, { ...v, lista: undefined }])) }, null, 1));
