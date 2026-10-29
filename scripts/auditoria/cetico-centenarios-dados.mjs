// Cético (lente: dados e definições) — achado centenarios-excesso-cadastro (docs/analysis/demografo/03).
// Confere, nos arquivos do TSE e do IBGE já no disco, se "eleitor 100+" (perfil jul/2026) e "residente 96+" (Censo 2022)
// são comparáveis: códigos/rótulos de faixa etária, exterior (ZZ), gênero e estado civil não informados (marca de registro antigo),
// concentração por zona, idade de referência (perfil jul/2026 × aptos no dia da eleição), comparecimento oficial do grupo 100+
// e a conta de sobrevivência com mortalidade por idade (IBGE 2654). Só contagens agregadas; nenhum dado individual.
// Uso: node scripts/auditoria/cetico-centenarios-dados.mjs   (≈ 10–20 min, 1 processo)
// Saída: data/parsed/auditoria/cetico/centenarios-dados.json
import { createReadStream, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import { createInflateRaw } from 'node:zlib';
import { entradasZip } from './contagem-zip.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(RAIZ, 'data/parsed/auditoria/cetico');
const DIR_PERFIL = path.join(RAIZ, 'data/raw/dadosabertos/perfil_eleitor_secao');
const ZIP_COMP = path.join(RAIZ, 'data/raw/dadosabertos/perfil_comparecimento_abstencao/perfil_comparecimento_abstencao_2026.zip');
const IBGE = path.join(RAIZ, 'data/raw/externos/ibge');
const UFS = 'AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO ZZ'.split(' ');
const SO_COMP = process.argv.includes('--so-comparecimento');
const SO_PERFIL = process.argv.includes('--so-perfil');

const r4 = (x) => Math.round(x * 10000) / 10000;
const add = (m, k, vals) => { let a = m.get(k); if (!a) m.set(k, (a = new Array(vals.length).fill(0))); for (let i = 0; i < vals.length; i++) a[i] += vals[i]; };
const grupo = (cod) => (cod === 9999 ? 'g100' : cod === 9599 ? 'g95_99' : cod === 9094 ? 'g90_94' : cod >= 7000 && cod < 9000 ? 'g70_89' : cod >= 1800 && cod <= 6569 ? 'g18_69' : cod === 1600 || cod === 1700 ? 'g16_17' : `outro_${cod}`);

async function* linhasZip(zip, entrada) {
  let fluxo = createReadStream(zip, { start: entrada.inicioDados, end: entrada.inicioDados + entrada.tamanhoComprimido - 1, highWaterMark: 1 << 20 });
  if (entrada.metodo === 8) fluxo = fluxo.pipe(createInflateRaw({ chunkSize: 1 << 20 }));
  const rl = readline.createInterface({ input: fluxo.setEncoding('latin1'), crlfDelay: Infinity });
  for await (const l of rl) if (l) yield l.split(';').map((x) => (x.charCodeAt(0) === 34 ? x.slice(1, -1) : x));
}

const res = { gerado_em: new Date().toISOString() };

// ---------------- 1. Perfil do eleitorado por seção (jul/2026)
if (!SO_COMP) {
  const faixas = new Map(); // cd|ds → [qt, bio]
  const porUf = new Map(); // uf|grupo → [qt, bio]
  const genero = new Map(); // grupo|cd_genero → [qt]
  const civil = new Map(); // grupo|cd_estado_civil → [qt]
  const escol = new Map(); // grupo|cd_escolaridade → [qt]
  const zona = new Map(); // uf|mun|zona → [total, g100, g100_bio, g95_99]
  const mun = new Map(); // uf|mun → [total, g100, g95_99, g90_94]
  const dtGer = new Map();
  for (const uf of UFS) {
    const zip = path.join(DIR_PERFIL, `perfil_eleitor_secao_2026_${uf}.zip`);
    const ent = (await entradasZip(zip)).find((e) => e.nome.endsWith('.csv'));
    let idx = null; let n = 0;
    for await (const c of linhasZip(zip, ent)) {
      if (!idx) { idx = Object.fromEntries(c.map((k, i) => [k, i])); continue; }
      n++;
      const cod = Number(c[idx.CD_FAIXA_ETARIA]); const g = grupo(cod);
      const qt = Number(c[idx.QT_ELEITORES]); const bio = Number(c[idx.QT_ELEITORES_BIOMETRIA]);
      add(faixas, `${cod}|${c[idx.DS_FAIXA_ETARIA]}`, [qt, bio]);
      add(porUf, `${uf}|${g}`, [qt, bio]);
      add(genero, `${g}|${c[idx.CD_GENERO]}`, [qt]);
      add(civil, `${g}|${c[idx.CD_ESTADO_CIVIL]}`, [qt]);
      add(escol, `${g}|${c[idx.CD_GRAU_ESCOLARIDADE]}`, [qt]);
      const m = c[idx.CD_MUNICIPIO].padStart(5, '0');
      add(zona, `${uf}|${m}|${c[idx.NR_ZONA]}`, [qt, g === 'g100' ? qt : 0, g === 'g100' ? bio : 0, g === 'g95_99' ? qt : 0]);
      add(mun, `${uf}|${m}`, [qt, g === 'g100' ? qt : 0, g === 'g95_99' ? qt : 0, g === 'g90_94' ? qt : 0]);
      add(dtGer, c[idx.DT_GERACAO], [qt]);
    }
    console.log(`perfil ${uf}: ${n} linhas`);
  }
  const obj = (m) => Object.fromEntries([...m].sort().map(([k, v]) => [k, v.length === 1 ? v[0] : v]));
  const zonas = [...zona].map(([k, v]) => ({ zona: k, total: v[0], e100: v[1], e100_bio: v[2], e95_99: v[3] }));
  const tot100 = zonas.reduce((s, z) => s + z.e100, 0);
  const tot100br = zonas.filter((z) => !z.zona.startsWith('ZZ')).reduce((s, z) => s + z.e100, 0);
  const ordenadas = [...zonas].sort((a, b) => b.e100 - a.e100);
  let acc = 0; const conc = {};
  ordenadas.forEach((z, i) => { acc += z.e100; for (const p of [0.25, 0.5, 0.75]) if (!conc[p] && acc >= p * tot100) conc[p] = i + 1; });
  res.perfil = {
    dt_geracao: obj(dtGer), faixas: obj(faixas), por_uf: obj(porUf), genero: obj(genero), estado_civil: obj(civil), escolaridade: obj(escol),
    total_100_com_zz: tot100, total_100_sem_zz: tot100br, zonas: zonas.length,
    zonas_para_25_50_75pct_dos_100: conc,
    razao_100_sobre_95_99_nacional: r4(tot100br / zonas.filter((z) => !z.zona.startsWith('ZZ')).reduce((s, z) => s + z.e95_99, 0)),
    top_zonas_parcela_100: [...zonas].filter((z) => z.total >= 1000).sort((a, b) => b.e100 / b.total - a.e100 / a.total).slice(0, 30)
      .map((z) => ({ ...z, parcela_100: r4(z.e100 / z.total), razao_100_95_99: z.e95_99 ? r4(z.e100 / z.e95_99) : null })),
    municipios_exemplo: Object.fromEntries(['MG|53813', 'MG|48755', 'MG|51837', 'MG|42471', 'RS|88412'].map((k) => [k, mun.get(k)])),
  };
  // distribuição da razão 100+/95–99 por município (registro velho acumula no 100+, que é faixa aberta)
  const razoes = [...mun].filter(([k, v]) => !k.startsWith('ZZ') && v[2] >= 20).map(([, v]) => v[1] / v[2]).sort((a, b) => a - b);
  res.perfil.razao_100_95_99_municipios = { n: razoes.length, p10: r4(razoes[Math.floor(0.1 * razoes.length)]), p50: r4(razoes[Math.floor(0.5 * razoes.length)]), p90: r4(razoes[Math.floor(0.9 * razoes.length)]), max: r4(razoes.at(-1)) };
}

// ---------------- 2. Perfil de comparecimento e abstenção (dia da eleição, por turno)
if (!SO_PERFIL) {
  const ents = (await entradasZip(ZIP_COMP)).filter((e) => e.nome.endsWith('.csv') && !e.nome.includes('BRASIL'));
  const faixa = new Map(); // turno|cd|ds → [aptos, comp]
  const uf100 = new Map(); // turno|uf|grupo → [aptos, comp]
  const gen = new Map(); // turno|grupo|genero → [aptos, comp]
  const mun100 = new Map(); // turno|uf|mun → [aptos100, comp100]
  for (const e of ents) {
    let idx = null; const uf = e.nome.match(/_([A-Z]{2})\.csv$/)[1];
    for await (const c of linhasZip(ZIP_COMP, e)) {
      if (!idx) { idx = Object.fromEntries(c.map((k, i) => [k, i])); continue; }
      const t = c[idx.NR_TURNO]; const cod = Number(c[idx.CD_FAIXA_ETARIA]); const g = grupo(cod);
      const v = [Number(c[idx.QT_APTOS]), Number(c[idx.QT_COMPARECIMENTO])];
      add(faixa, `${t}|${cod}|${c[idx.DS_FAIXA_ETARIA]}`, v);
      add(uf100, `${t}|${uf}|${g}`, v);
      add(gen, `${t}|${g}|${c[idx.CD_GENERO]}`, v);
      if (g === 'g100') add(mun100, `${t}|${uf}|${c[idx.CD_MUNICIPIO].padStart(5, '0')}`, v);
    }
    console.log(`comparecimento ${uf}`);
  }
  const obj = (m) => Object.fromEntries([...m].sort().map(([k, v]) => [k, v]));
  res.comparecimento = {
    faixas: obj(faixa), por_uf: obj(uf100), genero: obj(gen),
    municipios_exemplo_100: Object.fromEntries([...mun100].filter(([k]) => /\|(MG\|53813|MG\|48755|MG\|51837|MG\|42471)$/.test(k))),
    municipios_100_com_comparecimento: Object.fromEntries(['1', '2'].map((t) => {
      const l = [...mun100].filter(([k]) => k.startsWith(`${t}|`));
      return [t, { municipios: l.length, com_algum_comparecimento: l.filter(([, v]) => v[1] > 0).length, aptos: l.reduce((s, [, v]) => s + v[0], 0), comp: l.reduce((s, [, v]) => s + v[1], 0) }];
    })),
  };
}

// ---------------- 3. IBGE: coorte 96+ e sobrevivência com mortalidade por idade
{
  const sidra = (arq, cat) => {
    const m = new Map();
    for (const l of JSON.parse(readFileSync(path.join(IBGE, arq), 'utf8')).slice(1)) {
      const v = Number(l.V); const o = m.get(l.D1C) ?? {}; o[l[cat]] = Number.isFinite(v) ? v : 0; m.set(l.D1C, o);
    }
    return m;
  };
  const c = sidra('censo2022-9514-idade-c.json', 'D5C');
  const s = { p90_94: 0, p95_99: 0, p95: 0, p100: 0 };
  for (const o of c.values()) { s.p90_94 += o['60040']; s.p95_99 += o['60041']; s.p95 += o['6648']; s.p100 += o['6653']; }
  const d = { d90_94: 0, d95_99: 0, d100: 0 };
  for (const ano of ['2023', '2024']) for (const o of sidra(`obitos-2654-${ano}.json`, 'D7C').values()) { d.d90_94 += o['106182'] / 2; d.d95_99 += o['106183'] / 2; d.d100 += o['5996'] / 2; }
  const q90 = (d.d90_94 + d.d95_99 + d.d100) / (s.p90_94 + s.p95_99 + s.p100);
  const q95 = d.d95_99 / s.p95_99; const q100 = d.d100 / s.p100;
  const p96_99 = s.p95_99 - s.p95; const p96 = p96_99 + s.p100;
  // Censo 01/08/2022 → perfil 14/07/2026 ≈ 3,95 anos; → eleição 04/10/2026 ≈ 4,18 anos.
  const anos = { perfil: 3.95, eleicao: 4.18 };
  const proj = (T) => ({
    sem_mortes: p96,
    q90_autor: Math.round(p96 * (1 - q90) ** 4),
    q90_T: Math.round(p96 * (1 - q90) ** T),
    // 96–99 passam ~2 anos na faixa 95–99 e o resto em 100+; 100+ ficam o tempo todo em 100+
    por_idade: Math.round(p96_99 * (1 - q95) ** 2 * (1 - q100) ** (T - 2) + s.p100 * (1 - q100) ** T),
  });
  res.ibge = { censo: { ...s, p96_99, p96 }, obitos_ano: d, q90: r4(q90), q95_99: r4(q95), q100: r4(q100), projecao_perfil: proj(anos.perfil), projecao_eleicao: proj(anos.eleicao) };
}

await mkdir(OUT, { recursive: true });
const arq = path.join(OUT, SO_COMP ? 'centenarios-dados-comp.json' : SO_PERFIL ? 'centenarios-dados-perfil.json' : 'centenarios-dados.json');
await writeFile(arq, JSON.stringify(res, null, 1));
console.log(`gravado ${path.relative(RAIZ, arq)}`);
