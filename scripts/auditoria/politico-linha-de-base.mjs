// Cientista político: linha de base histórica do balanço 1º → 2º turno de presidente (2018, 2022, 2026).
// Só votos nominais (votacao_candidato_munzona_<ano>_BR.csv): o arquivo não traz comparecimento,
// brancos nem nulos. Pela identidade ΔA + ΔB = disponível, a parte do disponível de cada finalista
// sai só dos votos: ΔA / (ΔA + ΔB). Comparecimento é aproximado pela variação dos votos nominais.
// Também extrai do consulta_cand_2026 a situação das candidaturas a presidente (sem CPF, título ou e-mail).
//
// Uso: node scripts/auditoria/politico-linha-de-base.mjs
// Saída: data/parsed/auditoria/cientista-politico/linha-de-base.json
import { createReadStream, writeFileSync } from 'node:fs';
import readline from 'node:readline';
import { createInflateRaw } from 'node:zlib';
import { entradasZip } from './contagem-zip.mjs';

const DIR = 'data/raw/dadosabertos';
const SAIDA = 'data/parsed/auditoria/cientista-politico/linha-de-base.json';
const ANOS = [2018, 2022, 2026];
const REGIAO = {
  ac: 'N', am: 'N', ap: 'N', pa: 'N', ro: 'N', rr: 'N', to: 'N',
  al: 'NE', ba: 'NE', ce: 'NE', ma: 'NE', pb: 'NE', pe: 'NE', pi: 'NE', rn: 'NE', se: 'NE',
  df: 'CO', go: 'CO', ms: 'CO', mt: 'CO', es: 'SE', mg: 'SE', rj: 'SE', sp: 'SE', pr: 'S', rs: 'S', sc: 'S', zz: 'EX',
};
const CAPITAL = {
  ac: 'RIO BRANCO', al: 'MACEIÓ', am: 'MANAUS', ap: 'MACAPÁ', ba: 'SALVADOR', ce: 'FORTALEZA', df: 'BRASÍLIA',
  es: 'VITÓRIA', go: 'GOIÂNIA', ma: 'SÃO LUÍS', mg: 'BELO HORIZONTE', ms: 'CAMPO GRANDE', mt: 'CUIABÁ', pa: 'BELÉM',
  pb: 'JOÃO PESSOA', pe: 'RECIFE', pi: 'TERESINA', pr: 'CURITIBA', rj: 'RIO DE JANEIRO', rn: 'NATAL', ro: 'PORTO VELHO',
  rr: 'BOA VISTA', rs: 'PORTO ALEGRE', sc: 'FLORIANÓPOLIS', se: 'ARACAJU', sp: 'SÃO PAULO', to: 'PALMAS',
};
// Municípios de maior virada em 2026 (doc 02)
const VIRADAS_2026 = ['rj|58190', 'rj|58998', 'rn|18554', 'ms|91847', 'al|27170', 'pi|11878', 'ba|34096'];

function campos(l) {
  const out = [];
  const n = l.length;
  let i = 0;
  while (i <= n) {
    if (l.charCodeAt(i) === 34) {
      let j = i + 1, s = '';
      for (;;) {
        const k = l.indexOf('"', j);
        if (k < 0) { s += l.slice(j); i = n + 1; break; }
        if (l.charCodeAt(k + 1) === 34) { s += l.slice(j, k + 1); j = k + 2; continue; }
        s += l.slice(j, k); i = k + 2; break;
      }
      out.push(s);
    } else {
      let k = l.indexOf(';', i);
      if (k < 0) k = n;
      out.push(l.slice(i, k)); i = k + 1;
    }
  }
  return out;
}
async function* csv(zip, nome) {
  const e = (await entradasZip(zip)).find((x) => x.nome === nome);
  if (!e) throw new Error(`${nome} não está em ${zip}`);
  let fluxo = createReadStream(zip, { start: e.inicioDados, end: e.inicioDados + e.tamanhoComprimido - 1 });
  if (e.metodo === 8) fluxo = fluxo.pipe(createInflateRaw());
  const rl = readline.createInterface({ input: fluxo.setEncoding('latin1'), crlfDelay: Infinity });
  let col = null;
  for await (const linha of rl) {
    if (!linha) continue;
    const c = campos(linha);
    if (!col) { col = Object.fromEntries(c.map((x, i) => [x, i])); continue; }
    yield [c, col];
  }
}

const pct = (x) => (Number.isFinite(x) ? +(100 * x).toFixed(1) : null);
const resultado = { geradoEm: new Date().toISOString(), anos: {} };
const viradaPorAno = {}; // ano → Map(uf|mun → {fatia13_1, fatia13_2, peso})

for (const ano of ANOS) {
  const zip = `${DIR}/votacao_candidato_munzona/votacao_candidato_munzona_${ano}.zip`;
  const mun = new Map();
  const destinacao = {};
  const nomes = {};
  let geracao = null;
  for await (const [c, col] of csv(zip, `votacao_candidato_munzona_${ano}_BR.csv`)) {
    if (c[col.CD_CARGO] !== '1') continue;
    geracao ??= `${c[col.DT_GERACAO]} ${c[col.HH_GERACAO]}`;
    const t = Number(c[col.NR_TURNO]);
    const uf = c[col.SG_UF].toLowerCase();
    const k = `${uf}|${c[col.CD_MUNICIPIO]}`;
    let m = mun.get(k);
    if (!m) { m = { uf, nome: c[col.NM_MUNICIPIO], v: [null, {}, {}] }; mun.set(k, m); }
    const nr = c[col.NR_CANDIDATO];
    const q = Number(c[col.QT_VOTOS_NOMINAIS]);
    m.v[t][nr] = (m.v[t][nr] ?? 0) + q;
    nomes[nr] ??= `${c[col.NM_URNA_CANDIDATO]} (${c[col.SG_PARTIDO]})`;
    const d = `${t}|${c[col.NM_TIPO_DESTINACAO_VOTOS]}|${c[col.ST_VOTO_EM_TRANSITO]}`;
    destinacao[d] = (destinacao[d] ?? 0) + q;
  }
  // finalistas = números com voto no 2º turno; A = o que mais cresceu no país
  const tot = [null, {}, {}];
  for (const m of mun.values()) for (const t of [1, 2]) for (const [nr, q] of Object.entries(m.v[t])) tot[t][nr] = (tot[t][nr] ?? 0) + q;
  const fin = Object.keys(tot[2]);
  const [A, B] = fin.sort((x, y) => (tot[2][y] - tot[1][y]) - (tot[2][x] - tot[1][x]));

  const bal = (m) => {
    const [, v1, v2] = m.v;
    const a1 = v1[A] ?? 0, b1 = v1[B] ?? 0, a2 = v2[A] ?? 0, b2 = v2[B] ?? 0;
    const val1 = Object.values(v1).reduce((s, q) => s + q, 0), val2 = a2 + b2;
    return { a1, b1, a2, b2, E: val1 - a1 - b1, val1, val2, dA: a2 - a1, dB: b2 - b1 };
  };
  const soma = (lista) => {
    const r = { n: 0, a1: 0, b1: 0, a2: 0, b2: 0, E: 0, val1: 0, val2: 0, perdeuA: 0, perdeuB: 0 };
    for (const m of lista) {
      const b = bal(m);
      r.n++;
      for (const x of ['a1', 'b1', 'a2', 'b2', 'E', 'val1', 'val2']) r[x] += b[x];
      if (b.dA < 0) r.perdeuA++;
      if (b.dB < 0) r.perdeuB++;
    }
    r.dA = r.a2 - r.a1; r.dB = r.b2 - r.b1;
    r.parteA = pct(r.dA / (r.dA + r.dB));
    r.dAsobreEliminados = pct(r.dA / r.E);
    r.dNominaisPct = pct((r.val2 - r.val1) / r.val1);
    r.fatiaA_1 = pct(r.a1 / r.val1); r.fatiaA_2 = pct(r.a2 / r.val2);
    return r;
  };
  const ms = [...mun.values()].filter((m) => Object.keys(m.v[1]).length && Object.keys(m.v[2]).length);
  const ufs = {};
  for (const uf of Object.keys(REGIAO)) ufs[uf] = soma(ms.filter((m) => m.uf === uf));
  const regioes = {};
  for (const r of ['N', 'NE', 'CO', 'SE', 'S', 'EX']) regioes[r] = soma(ms.filter((m) => REGIAO[m.uf] === r));
  const partesUf = Object.entries(ufs).filter(([uf]) => uf !== 'zz').map(([, r]) => r.parteA).sort((a, b) => a - b);

  // Norte: variação dos votos nominais, capital × interior
  const norte = {};
  for (const uf of ['ac', 'ap', 'rr', 'am', 'pa', 'ro', 'to']) {
    const cap = soma(ms.filter((m) => m.uf === uf && m.nome === CAPITAL[uf]));
    const int = soma(ms.filter((m) => m.uf === uf && m.nome !== CAPITAL[uf]));
    norte[uf] = { capital: cap.dNominaisPct, interior: int.dNominaisPct, uf: ufs[uf].dNominaisPct };
  }

  // virada do 13 (PT nos três anos) no confronto entre os finalistas
  const vir = new Map();
  for (const [k, m] of mun) {
    const [, v1, v2] = m.v;
    const h1 = (v1[A] ?? 0) + (v1[B] ?? 0), h2 = (v2[A] ?? 0) + (v2[B] ?? 0);
    if (h1 < 100 || h2 < 100 || !fin.includes('13')) continue;
    vir.set(k, { nome: m.nome, f1: (v1['13'] ?? 0) / h1, f2: (v2['13'] ?? 0) / h2, peso: h2 });
  }
  viradaPorAno[ano] = vir;

  resultado.anos[ano] = {
    geracao, finalistas: { A: `${A} ${nomes[A]}`, B: `${B} ${nomes[B]}` }, destinacao,
    brasil: soma(ms), regioes, ufs,
    partesUfResumo: { min: partesUf[0], mediana: partesUf[Math.floor(partesUf.length / 2)], max: partesUf.at(-1) },
    ufsOndeBPerdeu: Object.entries(ufs).filter(([, r]) => r.dB < 0).map(([uf, r]) => `${uf} ${r.dB}`),
    ufsOndeAPerdeu: Object.entries(ufs).filter(([, r]) => r.dA < 0).map(([uf, r]) => `${uf} ${r.dA}`),
    norte,
  };
}

// Persistência das viradas: a virada de 2026 já aparecia em 2022 (e em 2018)?
const corr = (x, y, w) => {
  const sw = w.reduce((a, b) => a + b, 0);
  const mx = x.reduce((a, v, i) => a + w[i] * v, 0) / sw, my = y.reduce((a, v, i) => a + w[i] * v, 0) / sw;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < x.length; i++) { sxy += w[i] * (x[i] - mx) * (y[i] - my); sxx += w[i] * (x[i] - mx) ** 2; syy += w[i] * (y[i] - my) ** 2; }
  return +(sxy / Math.sqrt(sxx * syy)).toFixed(3);
};
resultado.persistenciaViradas = {};
for (const ano of [2022, 2018]) {
  const x = [], y = [], w = [];
  for (const [k, v] of viradaPorAno[2026]) {
    const o = viradaPorAno[ano].get(k);
    if (!o) continue;
    x.push(v.f2 - v.f1); y.push(o.f2 - o.f1); w.push(v.peso);
  }
  resultado.persistenciaViradas[`2026x${ano}`] = { municipios: x.length, correlacaoPonderada: corr(x, y, w) };
}
resultado.viradas2026 = VIRADAS_2026.map((k) => {
  const r = { municipio: k };
  for (const ano of ANOS) {
    const v = viradaPorAno[ano].get(k);
    r.nome ??= v?.nome;
    r[ano] = v ? { fatia13_1t: pct(v.f1), fatia13_2t: pct(v.f2), viradaPp: +(100 * (v.f2 - v.f1)).toFixed(1) } : null;
  }
  return r;
});
// Para comparar: virada nacional mediana dos municípios em cada ano
for (const ano of ANOS) {
  const d = [...viradaPorAno[ano].values()].map((v) => v.f2 - v.f1).sort((a, b) => a - b);
  resultado.anos[ano].viradaMunicipios = { mediana: +(100 * d[Math.floor(d.length / 2)]).toFixed(1), p01: +(100 * d[Math.floor(d.length * 0.01)]).toFixed(1), p99: +(100 * d[Math.floor(d.length * 0.99)]).toFixed(1) };
}

// Candidaturas a presidente em 2026 (só campos não pessoais)
resultado.candidaturas2026 = [];
for await (const [c, col] of csv(`${DIR}/consulta_cand/consulta_cand_2026.zip`, 'consulta_cand_2026_BR.csv')) {
  if (c[col.CD_CARGO] !== '1') continue;
  resultado.candidaturas2026.push({
    turno: c[col.NR_TURNO], numero: c[col.NR_CANDIDATO], urna: c[col.NM_URNA_CANDIDATO], partido: c[col.SG_PARTIDO],
    situacao: c[col.DS_SITUACAO_CANDIDATURA], totalizacao: c[col.DS_SIT_TOT_TURNO],
  });
}
writeFileSync(SAIDA, JSON.stringify(resultado, null, 1));
console.log('ok');
