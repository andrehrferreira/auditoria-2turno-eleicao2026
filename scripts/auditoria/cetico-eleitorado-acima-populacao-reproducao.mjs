// Cético (lente reprodução e código): refaz de forma independente o achado "eleitorado acima da população"
// (docs/analysis/demografo/02-eleitorado-x-populacao.md). Não usa o pipeline nem as saídas intermediárias do autor:
// lê o perfil do eleitorado direto dos ZIPs do TSE (leitor de ZIP próprio), o Censo 2022 direto do JSON do SIDRA e,
// como segunda fonte de eleitorado, os aptos do 2º turno no banco (detalhe_votacao_secao, eleição 6258).
// Só agregados por município. Banco em somente leitura. Sem rede.
// Uso: node scripts/auditoria/cetico-eleitorado-acima-populacao-reproducao.mjs
// Saídas: data/parsed/auditoria/cetico/eleitorado-acima-populacao-reproducao.{json,tsv}
import { createReadStream, openSync, readSync, fstatSync, closeSync, readFileSync, readdirSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import { createInflateRaw } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(RAIZ, 'data/parsed/auditoria/cetico');
const ZIPS = path.join(RAIZ, 'data/raw/dadosabertos/perfil_eleitor_secao');
const IBGE = path.join(RAIZ, 'data/raw/externos/ibge');
const db = new DatabaseSync(path.join(RAIZ, 'data/db/eleicao2026.sqlite'), { readOnly: true });

// ---------- Leitor de ZIP mínimo (EOCD → diretório central → cabeçalho local), com suporte a ZIP64
function entradaCsv(arquivo) {
  const fd = openSync(arquivo, 'r'); const tam = fstatSync(fd).size;
  const cauda = Buffer.alloc(Math.min(tam, 65557 + 20)); readSync(fd, cauda, 0, cauda.length, tam - cauda.length);
  let eocd = -1; for (let i = cauda.length - 22; i >= 0; i--) if (cauda.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error(`${arquivo}: sem EOCD`);
  let cdTam = cauda.readUInt32LE(eocd + 12); let cdOff = cauda.readUInt32LE(eocd + 16);
  if (cdOff === 0xffffffff && eocd >= 20 && cauda.readUInt32LE(eocd - 20) === 0x07064b50) {
    const z64 = Number(cauda.readBigUInt64LE(eocd - 20 + 8)); const b = Buffer.alloc(56); readSync(fd, b, 0, 56, z64);
    cdTam = Number(b.readBigUInt64LE(40)); cdOff = Number(b.readBigUInt64LE(48));
  }
  const cd = Buffer.alloc(cdTam); readSync(fd, cd, 0, cdTam, cdOff);
  const achadas = [];
  for (let p = 0; p < cd.length && cd.readUInt32LE(p) === 0x02014b50;) {
    const metodo = cd.readUInt16LE(p + 10); let comp = cd.readUInt32LE(p + 20); let desc = cd.readUInt32LE(p + 24);
    const nl = cd.readUInt16LE(p + 28), el = cd.readUInt16LE(p + 30), cl = cd.readUInt16LE(p + 32); let loc = cd.readUInt32LE(p + 42);
    const nome = cd.toString('latin1', p + 46, p + 46 + nl);
    for (let e = p + 46 + nl; e < p + 46 + nl + el;) { // extra ZIP64
      const id = cd.readUInt16LE(e), sz = cd.readUInt16LE(e + 2); let q = e + 4;
      if (id === 1) { if (desc === 0xffffffff) { desc = Number(cd.readBigUInt64LE(q)); q += 8; } if (comp === 0xffffffff) { comp = Number(cd.readBigUInt64LE(q)); q += 8; } if (loc === 0xffffffff) loc = Number(cd.readBigUInt64LE(q)); }
      e += 4 + sz;
    }
    achadas.push({ nome, metodo, comp, loc });
    p += 46 + nl + el + cl;
  }
  const e = achadas.find((x) => x.nome.toLowerCase().endsWith('.csv'));
  const lh = Buffer.alloc(30); readSync(fd, lh, 0, 30, e.loc); closeSync(fd);
  return { ...e, inicio: e.loc + 30 + lh.readUInt16LE(26) + lh.readUInt16LE(28), entradas: achadas.map((x) => x.nome) };
}

// ---------- Eleitorado A: perfil por seção (jul/2026), somado por município; 16-17 separado; faixas desconhecidas contadas
const eleit = new Map(); // mun TSE → { uf, total, f1617, faixasNaoNumericas }
const faixasVistas = new Map();
const porUf = {};
for (const f of readdirSync(ZIPS).filter((x) => x.endsWith('.zip')).sort()) {
  const uf = f.match(/_([A-Z]{2})\.zip$/)[1].toLowerCase();
  const e = entradaCsv(path.join(ZIPS, f));
  let s = createReadStream(path.join(ZIPS, f), { start: e.inicio, end: e.inicio + e.comp - 1, highWaterMark: 1 << 20 });
  if (e.metodo === 8) s = s.pipe(createInflateRaw({ chunkSize: 1 << 20 }));
  const rl = readline.createInterface({ input: s.setEncoding('latin1'), crlfDelay: Infinity });
  let cab = null; let n = 0; let somaUf = 0;
  for await (const linha of rl) {
    if (!linha) continue;
    const c = linha.split(';').map((x) => (x.startsWith('"') ? x.slice(1, -1) : x));
    if (!cab) { cab = Object.fromEntries(c.map((k, i) => [k, i])); continue; }
    n++;
    const mun = c[cab.CD_MUNICIPIO].padStart(5, '0'); const qt = Number(c[cab.QT_ELEITORES]); const fx = c[cab.CD_FAIXA_ETARIA];
    if (!Number.isFinite(qt)) throw new Error(`${uf}: QT_ELEITORES não numérico: ${c[cab.QT_ELEITORES]}`);
    faixasVistas.set(`${fx} ${c[cab.DS_FAIXA_ETARIA] ?? ''}`, (faixasVistas.get(`${fx} ${c[cab.DS_FAIXA_ETARIA] ?? ''}`) ?? 0) + qt);
    const m = eleit.get(mun) ?? { uf, total: 0, f1617: 0 }; m.total += qt; if (fx === '1600' || fx === '1700') m.f1617 += qt; eleit.set(mun, m);
    somaUf += qt;
  }
  porUf[uf] = { linhas: n, eleitores: somaUf, entradas_zip: e.entradas, ano: null };
  process.stderr.write(`${uf} ${n} linhas ${somaUf}\n`);
}

// ---------- Eleitorado B: aptos do 2º turno (presidente, 6258) no banco, por município
const aptos2t = new Map(db.prepare("SELECT municipio, uf, SUM(aptos) a FROM secao_eleicao WHERE turno = 2 AND eleicao = 6258 AND uf <> 'zz' GROUP BY municipio, uf").all().map((r) => [r.municipio, r.a]));

// ---------- Censo 2022 (tabela 9514): checar que a extração não tem várias linhas por (município, idade)
const censo = new Map(); const duplic = []; const outrasDims = new Set(); const naoNum = new Map();
for (const f of ['a', 'b', 'c']) {
  for (const l of JSON.parse(readFileSync(path.join(IBGE, `censo2022-9514-idade-${f}.json`), 'utf8')).slice(1)) {
    outrasDims.add(`D2C=${l.D2C} D3C=${l.D3C} D4C=${l.D4C} D6C=${l.D6C}`);
    const o = censo.get(l.D1C) ?? {}; if (l.D5C in o) duplic.push(`${l.D1C}/${l.D5C}`);
    const v = Number(l.V); if (!Number.isFinite(v)) naoNum.set(`${l.D5C}:${l.V}`, (naoNum.get(`${l.D5C}:${l.V}`) ?? 0) + 1);
    o[l.D5C] = Number.isFinite(v) ? v : NaN; censo.set(l.D1C, o);
  }
}
const nac = {}; for (const o of censo.values()) for (const [k, v] of Object.entries(o)) nac[k] = (nac[k] ?? 0) + (Number.isFinite(v) ? v : 0);
const est = new Map(); // estimativa 2025 (total, sem idade)
for (const l of JSON.parse(readFileSync(path.join(IBGE, 'estimativa-6579-2024-2025.json'), 'utf8')).slice(1)) if (l.D3C === '2025') est.set(l.D1C, Number(l.V));

// ---------- Junção TSE → IBGE e razões
const ibgeDe = new Map(db.prepare("SELECT codigo, codigo_ibge, nome FROM municipio WHERE uf <> 'zz'").all().map((r) => [r.codigo, r]));
const linhas = []; const semPar = [];
for (const [mun, e] of eleit) {
  if (e.uf === 'zz') continue;
  const info = ibgeDe.get(mun); const c = info && censo.get(info.codigo_ibge);
  if (!c) { semPar.push({ mun, uf: e.uf, nome: info?.nome, eleitores: e.total, aptos2t: aptos2t.get(mun) }); continue; }
  const tot = c['100362']; const p12 = tot - c['93070'] - c['93084'] - c['6567'] - c['6568'];
  if (!(p12 > 0)) { semPar.push({ mun, uf: e.uf, nome: info.nome, motivo: 'p12 inválido' }); continue; }
  const e25 = est.get(info.codigo_ibge);
  linhas.push({ uf: e.uf, mun, ibge: info.codigo_ibge, nome: info.nome, E: e.total, E18: e.total - e.f1617, A2: aptos2t.get(mun) ?? 0, tot, p12, p14: p12 - c['6569'] - c['6570'], e25,
    R: e.total / p12, RA: (aptos2t.get(mun) ?? 0) / p12, R18: (e.total - e.f1617) / (p12 - c['6569'] - c['6570']),
    // ajuste de crescimento: p12 × (estimativa 2025 ÷ Censo 2022) — supõe a mesma estrutura etária (é só uma sensibilidade)
    Rg: e25 ? e.total / (p12 * e25 / tot) : NaN });
}
const soma = (a, f) => a.reduce((s, x) => s + f(x), 0);
const resumoDe = (campo, numer) => {
  const acima = linhas.filter((x) => x[campo] > 1);
  return { municipios: linhas.length, acima_1: acima.length, pct: Math.round(1000 * acima.length / linhas.length) / 10,
    acima_1_25: linhas.filter((x) => x[campo] > 1.25).length, acima_1_5: linhas.filter((x) => x[campo] > 1.5).length, acima_2: linhas.filter((x) => x[campo] > 2).length,
    excesso_onde_acima_1: numer ? soma(acima, (x) => numer(x) - x.p12) : undefined };
};
const ord = [...linhas].sort((a, b) => b.R - a.R);
const sorted = linhas.map((x) => x.R).sort((a, b) => a - b);
// Razão nacional por porte: mostra se R > 1 em metade dos municípios é o espelho de R < 1 nas grandes cidades
const portes = [[0, 5000], [5000, 10000], [10000, 20000], [20000, 50000], [50000, 100000], [100000, 500000], [500000, 1e9]].map(([a, b]) => {
  const g = linhas.filter((x) => x.tot >= a && x.tot < b);
  return { porte: `${a}-${b}`, municipios: g.length, eleitores: soma(g, (x) => x.E), pop12: soma(g, (x) => x.p12), razao: Math.round(10000 * soma(g, (x) => x.E) / soma(g, (x) => x.p12)) / 10000, acima_1: g.filter((x) => x.R > 1).length };
});
const resultado = {
  fonte_eleitorado_perfil: { total_sem_zz: soma(linhas, (x) => x.E) + soma(semPar, (x) => x.eleitores ?? 0), zz: eleit.get ? [...eleit.values()].filter((m) => m.uf === 'zz').reduce((s, m) => s + m.total, 0) : 0, faixas: Object.fromEntries([...faixasVistas].sort()) },
  fonte_eleitorado_aptos2t_total_sem_zz: [...aptos2t.values()].reduce((s, v) => s + v, 0),
  censo_checagens: { dimensoes_fixas: [...outrasDims], duplicatas: duplic.length, valores_nao_numericos: Object.fromEntries(naoNum), nacional: { tot: nac['100362'], c93070: nac['93070'], c93084: nac['93084'], c6567: nac['6567'], c6568: nac['6568'], c6569: nac['6569'], c6570: nac['6570'] } },
  sem_par_ibge: semPar,
  E_total: soma(linhas, (x) => x.E), P12_total: soma(linhas, (x) => x.p12), razao_nacional: soma(linhas, (x) => x.E) / soma(linhas, (x) => x.p12),
  razao18_nacional: soma(linhas, (x) => x.E18) / soma(linhas, (x) => x.p14),
  mediana_R: sorted[Math.floor(sorted.length / 2)],
  perfil: resumoDe('R', (x) => x.E), aptos2t: resumoDe('RA', (x) => x.A2), r18: resumoDe('R18'), ajuste_crescimento_2025: resumoDe('Rg'),
  excesso_liquido_nacional: soma(linhas, (x) => x.E - x.p12),
  deficit_onde_R_menor_1: soma(linhas.filter((x) => x.R <= 1), (x) => x.E - x.p12),
  portes,
  top10: ord.slice(0, 10).map((x) => ({ uf: x.uf, mun: x.mun, nome: x.nome, E: x.E, aptos2t: x.A2, p12: x.p12, tot2022: x.tot, est2025: x.e25, R: +x.R.toFixed(3), Rg: +x.Rg.toFixed(3) })),
  por_uf_perfil: Object.fromEntries(Object.entries(porUf).map(([k, v]) => [k, v.eleitores])),
};
await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, 'eleitorado-acima-populacao-reproducao.json'), JSON.stringify(resultado, null, 1));
await writeFile(path.join(OUT, 'eleitorado-acima-populacao-reproducao.tsv'),
  ['uf\tmun_tse\tibge\tnome\teleitores_perfil\taptos_2t\tpop_tot_2022\tpop12_2022\test2025\tR\tR_aptos\tR_ajuste_2025', ...ord.map((x) => [x.uf, x.mun, x.ibge, x.nome, x.E, x.A2, x.tot, x.p12, x.e25 ?? '', x.R.toFixed(4), x.RA.toFixed(4), Number.isFinite(x.Rg) ? x.Rg.toFixed(4) : ''].join('\t'))].join('\n') + '\n');
console.log(JSON.stringify({ ...resultado, fonte_eleitorado_perfil: { ...resultado.fonte_eleitorado_perfil }, por_uf_perfil: undefined }, null, 1));
