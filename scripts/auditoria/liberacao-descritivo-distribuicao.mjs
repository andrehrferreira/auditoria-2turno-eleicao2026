// H13, método descritivo: distribuição das liberações sem biometria (sem inferir voto).
// Duas definições, nos dois turnos:
//   L1 = habilitadosPeloMesario do log (dado pessoal conferido + "Mesário … habilitou o eleitor", terminou em voto);
//   L2 = todo habilitado sem digital do eleitor, do BU = semBiometriaCadastrada + comBiometriaHabilitadosPorAnoNascimento
//        (= sem_biometria + por_biografia no banco).
// Fonte: perfis por seção data/parsed/<t>t/perfil/<uf>.jsonl (src/perfil-secoes.js), completos nos dois turnos (28 UFs),
// e cadastro por seção (scripts/auditoria/biometria-cadastro.mjs) para idade e % sem biometria cadastrada.
// Uso: node --max-old-space-size=8000 scripts/auditoria/liberacao-descritivo-distribuicao.mjs [--uf ac,se --saida <dir>] (teste)
// Saídas: data/parsed/auditoria/liberacao/descritivo-resumo.json, descritivo-extremas.json, descritivo-zonas.jsonl
import { mkdir, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { cadastroDaUrna, chave, lerAgregadas, lerCadastro, perfis, spearman } from './biometria-comum.mjs';

const { values: OPC } = parseArgs({ options: { uf: { type: 'string' }, saida: { type: 'string' } } });
const UFS_TESTE = OPC.uf ? OPC.uf.split(',') : null; // só para teste rápido; a rodada oficial usa todas
const DIR = OPC.saida ?? path.join(DIR_DADOS, 'parsed', 'auditoria', 'liberacao');
const REGIAO = {};
for (const [r, ufs] of Object.entries({
  NE: 'al ba ce ma pb pe pi rn se', N: 'ac am ap pa ro rr to', CO: 'df go ms mt', SE: 'es mg rj sp', S: 'pr rs sc', ZZ: 'zz',
})) for (const uf of ufs.split(' ')) REGIAO[uf] = r;
const NOME_REGIAO = { NE: 'Nordeste', N: 'Norte', CO: 'Centro-Oeste', SE: 'Sudeste', S: 'Sul', ZZ: 'Exterior' };
const r4 = (x) => (x == null || !Number.isFinite(x) ? null : +x.toFixed(4));
const pct = (a, b) => (b > 0 ? +(100 * a / b).toFixed(3) : null);

// ---------- leitura ----------
const cadastro = await lerCadastro();
const agregadas = await lerAgregadas(2); // cadastro único (14/07/2026); arranjo de urnas do 2º turno usado nos dois turnos
const MID = { '16a17': 16.5, '18a20': 19, '21a59': 40, '60a69': 64.5, '70a79': 74.5, '80mais': 85 };
const covar = new Map();
function covariaveis(k) {
  if (covar.has(k)) return covar.get(k);
  const c = cadastroDaUrna(cadastro, agregadas, k);
  let v = null;
  if (c && c.eleitores >= 20) {
    let soma = 0, n = 0;
    for (const [f, q] of Object.entries(c.faixas)) if (MID[f] != null) { soma += MID[f] * q; n += q; }
    const f = c.faixas;
    v = {
      p60: ((f['60a69'] ?? 0) + (f['70a79'] ?? 0) + (f['80mais'] ?? 0)) / c.eleitores,
      p70: ((f['70a79'] ?? 0) + (f['80mais'] ?? 0)) / c.eleitores,
      idade: n ? soma / n : null,
      semBioCad: 1 - c.biometria / c.eleitores,
    };
  }
  covar.set(k, v);
  return v;
}

async function lerTurno(turno) {
  const secoes = [];
  for await (const p of perfis(turno, UFS_TESTE)) {
    const e = p.bu.eleicoes.find((x) => x.idEleicao === (turno === 1 ? 6257 : 6258));
    const votos = e?.cargos.find((c) => c.codigoCargo === 1)?.votos ?? {};
    const d = p.bu.detalhamentoComparecimento;
    const log = p.log;
    const lib = log?.mesarios?.liberacoesPorMesario ?? {};
    const registrados = new Set((log?.mesarios?.registros ?? []).map((m) => m.titulo));
    for (const t of Object.keys(lib)) registrados.add(t);
    // contagem por mesário (com zeros dos registrados que não liberaram); o título não sai deste script
    const porMesario = [...registrados].map((t) => lib[t] ?? 0);
    secoes.push({
      k: chave(p), uf: p.uf, reg: REGIAO[p.uf], zona: `${p.uf}/${p.zona}`, municipio: p.municipio, zonaCod: p.zona, secao: p.secao,
      comp: p.bu.qtdEleitoresCompareceram ?? 0,
      temDet: d != null,
      semBio: d?.semBiometriaCadastrada ?? 0, porBio: d?.porBiometria ?? 0, manual: d?.comBiometriaHabilitadosPorAnoNascimento ?? 0,
      temLog: log != null,
      l1: log?.habilitadosPeloMesario ?? 0, dp: log?.dadoPessoalConfere ?? 0, anoLog: log?.anoNascimentoSemBiometria ?? 0,
      v13: votos['13'] ?? 0, v22: votos['22'] ?? 0,
      porMesario, modelo: log?.modeloUrna ?? null,
    });
  }
  for (const s of secoes) s.l2 = s.temDet ? s.semBio + s.manual : null;
  return secoes;
}

// ---------- estatística ----------
function gini(valores) {
  const v = Float64Array.from(valores).sort();
  const n = v.length;
  let soma = 0, ponderada = 0;
  for (let i = 0; i < n; i++) { soma += v[i]; ponderada += (i + 1) * v[i]; }
  return soma > 0 ? (2 * ponderada) / (n * soma) - (n + 1) / n : null;
}
function concentracao(valores) {
  const v = Float64Array.from(valores).sort().reverse();
  const total = v.reduce((a, b) => a + b, 0);
  let acum = 0, metade = null;
  const topo = {};
  const marcos = { p01: 0.01, p10: 0.1 };
  for (let i = 0; i < v.length; i++) {
    acum += v[i];
    if (metade == null && acum >= total / 2) metade = i + 1;
  }
  for (const [nome, f] of Object.entries(marcos)) {
    const m = Math.max(1, Math.round(f * v.length));
    let s = 0;
    for (let i = 0; i < m; i++) s += v[i];
    topo[nome] = pct(s, total);
  }
  const zeros = v.filter((x) => x === 0).length;
  // Lorenz em decis (fração acumulada do total pelos x% menores)
  const asc = Float64Array.from(v).reverse();
  const lorenz = [];
  let a = 0, j = 0;
  for (let d = 1; d <= 9; d++) {
    const ate = Math.round((d / 10) * asc.length);
    for (; j < ate; j++) a += asc[j];
    lorenz.push(pct(a, total));
  }
  return { unidades: v.length, total, gini: r4(gini(v)), unidadesComMetade: metade, pctUnidadesComMetade: pct(metade, v.length), pctTotalNoTopo1: topo.p01, pctTotalNoTopo10: topo.p10, zeros, pctZeros: pct(zeros, v.length), lorenzDecis: lorenz };
}
function quantis(valores, casas = 4) {
  const s = Float64Array.from(valores).sort();
  const q = (p) => (s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))] : null);
  const m = s.length ? s.reduce((a, b) => a + b, 0) / s.length : null;
  return { n: s.length, media: r4(m), p10: r4(q(0.1)), mediana: r4(q(0.5)), p90: r4(q(0.9)), p99: r4(q(0.99)), p999: r4(q(0.999)), maximo: r4(s.at(-1)) };
}
// gerador determinístico (mulberry32), para a simulação ser reprodutível
function rng(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function normal(u) {
  let x = u(), y = u();
  while (x === 0) x = u();
  return Math.sqrt(-2 * Math.log(x)) * Math.cos(2 * Math.PI * y);
}
function binomial(n, p, u) {
  if (n <= 0 || p <= 0) return 0;
  if (p >= 1) return n;
  const v = n * p * (1 - p);
  if (v > 25) return Math.min(n, Math.max(0, Math.round(n * p + Math.sqrt(v) * normal(u))));
  const r = p / (1 - p);
  let pk = Math.pow(1 - p, n), cum = pk, k = 0;
  const x = u();
  while (x > cum && k < n) { pk *= ((n - k) / (k + 1)) * r; k++; cum += pk; }
  return k;
}
function lgamma(x) {
  const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
const lbeta = (a, b) => lgamma(a) + lgamma(b) - lgamma(a + b);
const lcomb = (n, k) => lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);
/** P(X ≥ x), X ~ Beta-binomial(n, α, β); com ρ = 0, binomial(n, p). Soma a cauda até o termo ficar desprezível. */
function caudaBB(x, n, p, rho) {
  if (x <= 0) return 1;
  if (x > n) return 0;
  let lp;
  let razao;
  if (rho <= 1e-9) {
    lp = lcomb(n, x) + x * Math.log(p) + (n - x) * Math.log1p(-p);
    razao = (k) => ((n - k) / (k + 1)) * (p / (1 - p));
  } else {
    const al = (p * (1 - rho)) / rho, be = ((1 - p) * (1 - rho)) / rho;
    lp = lcomb(n, x) + lbeta(x + al, n - x + be) - lbeta(al, be);
    razao = (k) => ((n - k) / (k + 1)) * ((k + al) / (n - k - 1 + be));
  }
  let termo = 1, soma = 1;
  for (let k = x; k < n; k++) {
    termo *= razao(k);
    soma += termo;
    if (termo < 1e-12 * soma) break;
  }
  return Math.min(1, Math.exp(lp) * soma);
}
function bh(pvals, q = 0.05) {
  const ordem = pvals.map((p, i) => [p, i]).sort((a, b) => a[0] - b[0]);
  const m = ordem.length;
  const qv = new Float64Array(m);
  let min = 1;
  for (let j = m - 1; j >= 0; j--) {
    min = Math.min(min, (ordem[j][0] * m) / (j + 1));
    qv[ordem[j][1]] = min;
  }
  return { qv, rejeitadas: [...qv].filter((x) => x <= q).length, m };
}

// ---------- análises ----------
const DEF = {
  L1: { val: (s) => s.l1, ok: (s) => s.temLog },
  L2: { val: (s) => s.l2, ok: (s) => s.temDet },
  semBio: { val: (s) => s.semBio, ok: (s) => s.temDet },
  manual: { val: (s) => s.manual, ok: (s) => s.temDet },
  semAssociacao: { val: (s) => s.dp - s.l1, ok: (s) => s.temLog },
};

function totais(secoes, grupo) {
  const g = new Map();
  for (const s of secoes) {
    const k = grupo(s);
    if (!g.has(k)) g.set(k, { secoes: 0, comp: 0, compDet: 0, compLog: 0, L1: 0, L2: 0, semBio: 0, manual: 0, semAssociacao: 0, v13: 0, v22: 0 });
    const t = g.get(k);
    t.secoes++; t.comp += s.comp; t.v13 += s.v13; t.v22 += s.v22;
    if (s.temDet) { t.compDet += s.comp; t.L2 += s.l2; t.semBio += s.semBio; t.manual += s.manual; }
    if (s.temLog) { t.compLog += s.comp; t.L1 += s.l1; t.semAssociacao += s.dp - s.l1; }
  }
  const out = {};
  for (const [k, t] of [...g].sort()) {
    out[k] = {
      ...t,
      taxaL1: pct(t.L1, t.compLog), taxaL2: pct(t.L2, t.compDet), taxaSemBio: pct(t.semBio, t.compDet), taxaManual: pct(t.manual, t.compDet),
      taxaSemAssociacao: pct(t.semAssociacao, t.compLog), parcela13: pct(t.v13, t.v13 + t.v22),
    };
  }
  return out;
}

function distribuicaoSecoes(secoes) {
  const out = {};
  for (const reg of ['BR', 'NE', 'N', 'CO', 'SE', 'S']) {
    const sub = secoes.filter((s) => s.reg !== 'ZZ' && (reg === 'BR' || s.reg === reg));
    out[reg] = {};
    for (const nome of ['L1', 'L2', 'manual', 'semBio']) {
      const d = DEF[nome];
      const ok = sub.filter(d.ok);
      out[reg][nome] = {
        contagem: quantis(ok.map(d.val), 1),
        taxaPctComp50: quantis(ok.filter((s) => s.comp >= 50).map((s) => (100 * d.val(s)) / s.comp), 2),
        secoesComZero: pct(ok.filter((s) => d.val(s) === 0).length, ok.length),
      };
    }
  }
  return out;
}

function concentracaoTudo(secoes, turno) {
  const u = rng(1300 + turno);
  const out = {};
  const base = secoes.filter((s) => s.reg !== 'ZZ');
  for (const nome of ['L1', 'L2']) {
    const d = DEF[nome];
    const ok = base.filter(d.ok);
    const obs = concentracao(ok.map(d.val));
    // nulos: cada seção recebe Binomial(comparecimento, taxa) com a taxa do país, da UF ou da zona
    const taxa = (chaveGrupo) => {
      const m = new Map();
      for (const s of ok) {
        const k = chaveGrupo(s);
        const t = m.get(k) ?? [0, 0];
        t[0] += d.val(s); t[1] += s.comp;
        m.set(k, t);
      }
      return (s) => { const t = m.get(chaveGrupo(s)); return t[1] ? t[0] / t[1] : 0; };
    };
    const nulos = {};
    for (const [rotulo, cg] of [['pais', () => 'br'], ['uf', (s) => s.uf], ['zona', (s) => s.zona]]) {
      const tx = taxa(cg);
      const ginis = [];
      for (let rep = 0; rep < 3; rep++) ginis.push(gini(ok.map((s) => binomial(s.comp, tx(s), u))));
      nulos[rotulo] = r4(ginis.reduce((a, b) => a + b, 0) / ginis.length);
    }
    // taxa por seção (comparecimento ≥ 50): Gini da taxa, que neutraliza o tamanho
    const taxas = ok.filter((s) => s.comp >= 50).map((s) => d.val(s) / s.comp);
    out[nome] = { ...obs, giniDaTaxaComp50: r4(gini(taxas)), giniNuloBinomial: nulos, porRegiao: {} };
    for (const reg of ['NE', 'N', 'CO', 'SE', 'S']) {
      const c = concentracao(ok.filter((s) => s.reg === reg).map(d.val));
      out[nome].porRegiao[reg] = { gini: c.gini, pctUnidadesComMetade: c.pctUnidadesComMetade, unidadesComMetade: c.unidadesComMetade, pctTotalNoTopo1: c.pctTotalNoTopo1 };
    }
  }
  // mesários: unidade = (seção, mesário registrado ou que liberou)
  const mes = [];
  const mesNE = [];
  let secoesComL1Alto = 0, secoesUmMesario90 = 0;
  for (const s of base) {
    if (!s.temLog) continue;
    for (const c of s.porMesario) { mes.push(c); if (s.reg === 'NE') mesNE.push(c); }
    if (s.l1 >= 10) {
      secoesComL1Alto++;
      if (Math.max(...s.porMesario) >= 0.9 * s.l1) secoesUmMesario90++;
    }
  }
  const lib = mes.filter((c) => c > 0);
  out.mesarios = {
    todosRegistrados: concentracao(mes),
    soQuemLiberou: concentracao(lib),
    distribuicaoQuemLiberou: quantis(lib, 1),
    nordesteTodosRegistrados: concentracao(mesNE),
    secoesComL1ao_menos10: secoesComL1Alto,
    pctDessasComUmMesarioFazendo90pct: pct(secoesUmMesario90, secoesComL1Alto),
  };
  return out;
}

/** Zonas: taxa agregada, sobredispersão entre seções (φ de Pearson) e ρ do beta-binomial (método dos momentos). */
function zonas(secoes, nome) {
  const d = DEF[nome];
  const g = new Map();
  for (const s of secoes) {
    if (s.reg === 'ZZ' || !d.ok(s) || s.comp < 20) continue;
    if (!g.has(s.zona)) g.set(s.zona, []);
    g.get(s.zona).push(s);
  }
  const lista = [];
  for (const [z, ss] of g) {
    const x = ss.reduce((a, s) => a + d.val(s), 0), n = ss.reduce((a, s) => a + s.comp, 0);
    const p = x / n;
    let phi = null, rho = 0;
    if (ss.length >= 5 && p > 0 && p < 1) {
      let x2 = 0;
      for (const s of ss) x2 += (d.val(s) - s.comp * p) ** 2 / (s.comp * p * (1 - p));
      phi = x2 / (ss.length - 1);
      const nbar = n / ss.length;
      rho = Math.max(0, Math.min(0.5, (phi - 1) / (nbar - 1)));
    }
    const z13 = ss.reduce((a, s) => a + s.v13, 0), z22 = ss.reduce((a, s) => a + s.v22, 0);
    lista.push({ zona: z, uf: ss[0].uf, reg: ss[0].reg, secoes: ss.length, comp: n, lib: x, taxa: p, phi, rho, ss, parcela13: z13 + z22 ? z13 / (z13 + z22) : null });
  }
  return lista;
}

function resumoZonas(lista) {
  const ok = lista.filter((z) => z.secoes >= 5);
  const phis = ok.filter((z) => z.phi != null).map((z) => z.phi);
  const porReg = {};
  for (const reg of ['BR', 'NE', 'N', 'CO', 'SE', 'S']) {
    const sub = ok.filter((z) => reg === 'BR' || z.reg === reg);
    porReg[reg] = { zonas: sub.length, taxaPct: quantis(sub.map((z) => 100 * z.taxa), 2), phi: quantis(sub.filter((z) => z.phi != null).map((z) => z.phi), 2) };
  }
  return {
    zonasCom5Secoes: ok.length,
    pctZonasPhiAcima2: pct(phis.filter((x) => x > 2).length, phis.length),
    porRegiao: porReg,
    topo10Taxa: [...ok].sort((a, b) => b.taxa - a.taxa).slice(0, 10).map((z) => ({ zona: z.zona, secoes: z.secoes, comp: z.comp, lib: z.lib, taxaPct: pct(z.lib, z.comp), phi: r4(z.phi) })),
    topo10TaxaNordeste: [...ok].filter((z) => z.reg === 'NE').sort((a, b) => b.taxa - a.taxa).slice(0, 10).map((z) => ({ zona: z.zona, secoes: z.secoes, comp: z.comp, lib: z.lib, taxaPct: pct(z.lib, z.comp), phi: r4(z.phi) })),
  };
}

/** Seções acima do esperado na própria zona: beta-binomial com ρ da zona e BH (q = 0,05); binomial para comparação. */
function extremas(lista, nome) {
  const d = DEF[nome];
  const testes = [];
  for (const z of lista) {
    if (z.secoes < 5 || z.taxa <= 0) continue;
    for (const s of z.ss) {
      const x = d.val(s);
      const esperado = s.comp * z.taxa;
      const pBin = x <= esperado ? 1 : caudaBB(x, s.comp, z.taxa, 0);
      const pBB = x <= esperado ? 1 : caudaBB(x, s.comp, z.taxa, z.rho);
      testes.push({ s, x, esperado, pBin, pBB, z });
    }
  }
  const bBin = bh(testes.map((t) => t.pBin));
  const bBB = bh(testes.map((t) => t.pBB));
  testes.forEach((t, i) => { t.qBin = bBin.qv[i]; t.qBB = bBB.qv[i]; });
  const sig = testes.filter((t) => t.qBB <= 0.05);
  const porReg = {};
  for (const t of sig) porReg[t.s.reg] = (porReg[t.s.reg] ?? 0) + 1;
  const contarModelo = (ts) => { const m = {}; for (const t of ts) m[t.s.modelo ?? '?'] = (m[t.s.modelo ?? '?'] ?? 0) + 1; return m; };
  // parcela do 13 que as rejeitadas teriam se votassem como a própria zona (pondera pelos votos 13 + 22 de cada uma)
  const esperadaZona = (ts) => { let num = 0, den = 0; for (const t of ts) { const v = t.s.v13 + t.s.v22; if (t.z.parcela13 == null) continue; num += t.z.parcela13 * v; den += v; } return den ? +(100 * num / den).toFixed(3) : null; };
  const testadosReg = {};
  for (const t of testes) testadosReg[t.s.reg] = (testadosReg[t.s.reg] ?? 0) + 1;
  const fmt = (t) => ({
    uf: t.s.uf, municipio: t.s.municipio, zona: t.s.zonaCod, secao: t.s.secao, comparecimento: t.s.comp, liberados: t.x,
    taxaPct: pct(t.x, t.s.comp), taxaZonaPct: pct(t.z.lib, t.z.comp), esperado: +t.esperado.toFixed(1), excesso: +(t.x - t.esperado).toFixed(1),
    rhoZona: r4(t.z.rho), pBetaBin: t.pBB, qBetaBin: t.qBB, v13: t.s.v13, v22: t.s.v22,
  });
  return {
    testes: testes.length,
    rejeitadasBinomialBH: bBin.rejeitadas,
    rejeitadasBetaBinomialBH: bBB.rejeitadas,
    excessoSomadoNasRejeitadas: +sig.reduce((a, t) => a + (t.x - t.esperado), 0).toFixed(0),
    rejeitadasPorRegiao: porReg,
    testadasPorRegiao: testadosReg,
    parcela13NasRejeitadas: pct(sig.reduce((a, t) => a + t.s.v13, 0), sig.reduce((a, t) => a + t.s.v13 + t.s.v22, 0)),
    parcela13EsperadaPelaZonaNasRejeitadas: esperadaZona(sig),
    modeloNasRejeitadas: contarModelo(sig), modeloNasTestadas: contarModelo(testes),
    parcela13NasTestadas: pct(testes.reduce((a, t) => a + t.s.v13, 0), testes.reduce((a, t) => a + t.s.v13 + t.s.v22, 0)),
    topo: [...sig].sort((a, b) => a.pBB - b.pBB || b.x - b.esperado - (a.x - a.esperado)).slice(0, 15).map(fmt),
    maiorTaxa: [...testes].filter((t) => t.s.comp >= 50).sort((a, b) => b.x / b.s.comp - a.x / a.s.comp).slice(0, 5).map(fmt),
  };
}

/** Taxa de liberação por decil de uma covariável da seção e Spearman (seções com comparecimento ≥ 50). */
function porCovariavel(secoes, nomeCov, reg = null) {
  const out = { spearman: {}, decis: [] };
  const ok = secoes.filter((s) => s.reg !== 'ZZ' && s.temDet && s.temLog && s.comp >= 50 && (reg == null || s.reg === reg) && covariaveis(s.k)?.[nomeCov] != null);
  const cv = ok.map((s) => covariaveis(s.k)[nomeCov]);
  for (const nome of ['L1', 'L2', 'manual', 'semBio']) out.spearman[nome] = r4(spearman(cv, ok.map((s) => DEF[nome].val(s) / s.comp)));
  const ordem = ok.map((s, i) => [cv[i], s]).sort((a, b) => a[0] - b[0]);
  for (let dcl = 0; dcl < 10; dcl++) {
    const fatia = ordem.slice(Math.floor((dcl * ordem.length) / 10), Math.floor(((dcl + 1) * ordem.length) / 10));
    const comp = fatia.reduce((a, [, s]) => a + s.comp, 0);
    const soma = (nome) => fatia.reduce((a, [, s]) => a + DEF[nome].val(s), 0);
    out.decis.push({
      decil: dcl + 1, de: r4(fatia[0][0]), ate: r4(fatia.at(-1)[0]), secoes: fatia.length,
      taxaL1: pct(soma('L1'), comp), taxaL2: pct(soma('L2'), comp), taxaManual: pct(soma('manual'), comp), taxaSemBio: pct(soma('semBio'), comp),
      parcela13: pct(fatia.reduce((a, [, s]) => a + s.v13, 0), fatia.reduce((a, [, s]) => a + s.v13 + s.v22, 0)),
    });
  }
  out.secoes = ok.length;
  return out;
}

/** Liberação em seções pró-13 × pró-22 do 1º turno (parcela do 13 entre 13 e 22; ≥ 20 votos nos dois). */
function proLado(secoes, parcela1t) {
  const res = {};
  const grupoDe = (s) => {
    const p = parcela1t.get(s.k);
    if (p == null) return null;
    return p > 0.5 ? 'pro13' : p < 0.5 ? 'pro22' : null;
  };
  const faixaDe = (s) => {
    const p = parcela1t.get(s.k);
    return p == null ? null : Math.min(9, Math.floor(p * 10));
  };
  for (const reg of ['BR', 'NE', 'N', 'CO', 'SE', 'S']) {
    const sub = secoes.filter((s) => s.reg !== 'ZZ' && s.temDet && s.temLog && (reg === 'BR' || s.reg === reg));
    const agg = (filtro) => {
      const f = sub.filter(filtro);
      const comp = f.reduce((a, s) => a + s.comp, 0);
      const soma = (nome) => f.reduce((a, s) => a + DEF[nome].val(s), 0);
      return { secoes: f.length, comp, taxaL1: pct(soma('L1'), comp), taxaL2: pct(soma('L2'), comp), taxaManual: pct(soma('manual'), comp), taxaSemBio: pct(soma('semBio'), comp),
        medianaTaxaL1: quantis(f.filter((s) => s.comp >= 50).map((s) => (100 * s.l1) / s.comp), 2).mediana,
        medianaTaxaL2: quantis(f.filter((s) => s.comp >= 50).map((s) => (100 * s.l2) / s.comp), 2).mediana };
    };
    const r = { pro13: agg((s) => grupoDe(s) === 'pro13'), pro22: agg((s) => grupoDe(s) === 'pro22'), faixas: [] };
    for (let f = 0; f < 10; f++) r.faixas.push({ parcela13_1t: `${f * 10}-${f * 10 + 10}%`, ...agg((s) => faixaDe(s) === f) });
    // dentro da mesma zona: diferença de taxa pró-13 − pró-22 nas zonas com ≥ 3 seções em cada grupo
    const z = new Map();
    for (const s of sub) {
      const gr = grupoDe(s);
      if (!gr) continue;
      if (!z.has(s.zona)) z.set(s.zona, { pro13: [0, 0, 0, 0], pro22: [0, 0, 0, 0] });
      const t = z.get(s.zona)[gr];
      t[0] += s.l1; t[1] += s.l2; t[2] += s.comp; t[3]++;
    }
    let pesoT = 0, d1 = 0, d2 = 0, pos1 = 0, pos2 = 0, nz = 0;
    for (const { pro13: a, pro22: b } of z.values()) {
      if (a[3] < 3 || b[3] < 3) continue;
      const w = a[2] + b[2];
      const x1 = a[0] / a[2] - b[0] / b[2], x2 = a[1] / a[2] - b[1] / b[2];
      d1 += w * x1; d2 += w * x2; pesoT += w; nz++;
      if (x1 > 0) pos1++;
      if (x2 > 0) pos2++;
    }
    r.dentroDaZona = { zonas: nz, difMediaPpL1: pesoT ? +((100 * d1) / pesoT).toFixed(3) : null, difMediaPpL2: pesoT ? +((100 * d2) / pesoT).toFixed(3) : null,
      pctZonasPro13MaiorL1: pct(pos1, nz), pctZonasPro13MaiorL2: pct(pos2, nz) };
    res[reg] = r;
  }
  return res;
}

/** Quantas seções têm liberações ≥ margem 13 × 22 (descritivo; não diz para que lado foram). */
function liberacaoVersusMargem(secoes) {
  const out = {};
  for (const reg of ['BR', 'NE', 'N', 'CO', 'SE', 'S']) {
    const sub = secoes.filter((s) => s.reg !== 'ZZ' && s.temDet && s.temLog && (reg === 'BR' || s.reg === reg));
    const m = (s) => Math.abs(s.v13 - s.v22);
    out[reg] = { secoes: sub.length, L1maiorIgualMargem: sub.filter((s) => s.l1 >= m(s)).length, L2maiorIgualMargem: sub.filter((s) => s.l2 >= m(s)).length };
  }
  return out;
}

// ---------- execução ----------
await mkdir(DIR, { recursive: true });
const t0 = Date.now();
const resumo = { geradoEm: new Date().toISOString(), fonte: 'data/parsed/<t>t/perfil (28 UFs nos dois turnos) + cadastro-secao.jsonl (14/07/2026)', turnos: {} };
const extremasSaida = {};
const linhasZonas = [];
const parcela1t = new Map();
for (const turno of [1, 2]) {
  const secoes = await lerTurno(turno);
  console.error(`turno ${turno}: ${secoes.length} seções lidas (${Math.round((Date.now() - t0) / 1000)} s)`);
  if (turno === 1) for (const s of secoes) if (s.v13 + s.v22 >= 20) parcela1t.set(s.k, s.v13 / (s.v13 + s.v22));
  const zL1 = zonas(secoes, 'L1'), zL2 = zonas(secoes, 'L2');
  const R = {
    secoes: secoes.length, semLog: secoes.filter((s) => !s.temLog).length, semDetalhamento: secoes.filter((s) => !s.temDet).length,
    porRegiao: totais(secoes, (s) => s.reg), porUf: totais(secoes, (s) => s.uf), brasilSemExterior: totais(secoes.filter((s) => s.reg !== 'ZZ'), () => 'BR').BR,
    distribuicaoPorSecao: distribuicaoSecoes(secoes),
    concentracao: concentracaoTudo(secoes, turno),
    zonas: { L1: resumoZonas(zL1), L2: resumoZonas(zL2) },
    covariaveis: {
      p70: porCovariavel(secoes, 'p70'), semBioCad: porCovariavel(secoes, 'semBioCad'), idade: { spearman: porCovariavel(secoes, 'idade').spearman },
      p70NE: porCovariavel(secoes, 'p70', 'NE'), semBioCadNE: porCovariavel(secoes, 'semBioCad', 'NE'),
    },
    proLado1t: proLado(secoes, parcela1t),
    liberacaoVersusMargem: liberacaoVersusMargem(secoes),
  };
  extremasSaida[turno] = { L1: extremas(zL1, 'L1'), L2: extremas(zL2, 'L2') };
  R.extremas = Object.fromEntries(Object.entries(extremasSaida[turno]).map(([k, v]) => [k, { ...v, topo: undefined, maiorTaxa: undefined }]));
  for (const z of [...zL1]) linhasZonas.push(JSON.stringify({ turno, def: 'L1', zona: z.zona, secoes: z.secoes, comp: z.comp, lib: z.lib, taxaPct: pct(z.lib, z.comp), phi: r4(z.phi), rho: r4(z.rho) }));
  for (const z of [...zL2]) linhasZonas.push(JSON.stringify({ turno, def: 'L2', zona: z.zona, secoes: z.secoes, comp: z.comp, lib: z.lib, taxaPct: pct(z.lib, z.comp), phi: r4(z.phi), rho: r4(z.rho) }));
  resumo.turnos[turno] = R;
  const br = R.brasilSemExterior;
  console.error(`turno ${turno}: L1 ${br.L1} (${br.taxaL1}%), L2 ${br.L2} (${br.taxaL2}%) (${Math.round((Date.now() - t0) / 1000)} s)`);
}
resumo.regioes = NOME_REGIAO;
await writeFile(path.join(DIR, 'descritivo-resumo.json'), JSON.stringify(resumo, null, 1));
await writeFile(path.join(DIR, 'descritivo-extremas.json'), JSON.stringify(extremasSaida, null, 1));
await writeFile(path.join(DIR, 'descritivo-zonas.jsonl'), linhasZonas.join('\n') + '\n');
console.error(`pronto em ${Math.round((Date.now() - t0) / 1000)} s → ${DIR}`);
