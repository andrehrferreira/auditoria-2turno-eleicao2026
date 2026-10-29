// Revisor cético, achado a7 (comparecimento alto sem digital), lente reprodução e código.
// Refaz de forma independente os números centrais de docs/analysis/coerencia-contagem/04-a7-comparecimento-alto.md
// a partir do banco (somente leitura), sem usar o código de contagem-a7.mjs, e testa a sensibilidade das escolhas:
//  1. contagens: seções completas, > aptos, ≥ 95%, = 100%; checagem cruzada do comparecimento (BU geral × eleição federal);
//  2. sobredispersão (Pearson com a média da zona) e esperado ≥ 95% pela beta-binomial com rho nacional e por UF;
//  3. liberação sem digital (sem biometria cadastrada + biometria que falhou) no país e nas seções ≥ 95%;
//  4. filtro de risco (≥ 95% e sem digital acima da zona, p binomial < 0,001) e o mesmo filtro com p beta-binomial
//     (rho da taxa sem digital estimado entre seções da mesma zona) e com posto empírico na zona;
//  5. caso RN 17132/0010/0145: zona, componentes, posto, p binomial × beta-binomial; 1º turno da zona lido dos BUs brutos.
// Uso: node scripts/auditoria/cetico-a7-reproducao.mjs
// Saída: resumo no terminal e data/parsed/auditoria/cetico/a7-reproducao.json
import { mkdirSync, writeFileSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { perfilBu } from '../../src/perfil-secoes.js';

const db = new DatabaseSync('data/db/eleicao2026.sqlite', { readOnly: true });
const rows = db.prepare(`SELECT s.uf, s.municipio, s.zona, s.secao, s.tipo_urna, s.tipo_arquivo, s.comparecimento AS comp_bu,
    s.sem_biometria AS sb, s.por_biografia AS pb, s.por_biometria AS pbio, e.aptos, e.comparecimento_majoritario AS comp
  FROM secao s JOIN secao_eleicao e USING (turno, uf, municipio, zona, secao)
  WHERE s.turno = 2 AND e.eleicao = 6258 AND s.situacao = 'completa'`).all();
const situacoes = db.prepare(`SELECT situacao, COUNT(*) n FROM secao WHERE turno = 2 GROUP BY situacao`).all();

// ---------- funções numéricas (implementação própria) ----------
const LF = [0];
const lf = (n) => { for (let i = LF.length; i <= n; i++) LF[i] = LF[i - 1] + Math.log(i); return LF[n]; };
// ln Γ por Stirling com deslocamento (precisão ~1e-12 para z > 0)
function lgamma(z) {
  let s = 0; while (z < 8) { s -= Math.log(z); z += 1; }
  const z2 = 1 / (z * z);
  return s + (z - 0.5) * Math.log(z) - z + 0.5 * Math.log(2 * Math.PI) + (1 / z) * (1 / 12 - z2 * (1 / 360 - z2 * (1 / 1260 - z2 / 1680)));
}
// log-soma de termos para cauda superior P(X ≥ k)
function caudaLog(n, k, logTermo) {
  if (k <= 0) return 0; if (k > n) return -Infinity;
  let mx = -Infinity; const ts = [];
  for (let x = k; x <= n; x++) { const t = logTermo(x); ts.push(t); if (t > mx) mx = t; }
  return mx + Math.log(ts.reduce((s, t) => s + Math.exp(t - mx), 0));
}
const binomLog = (n, k, p) => (p <= 0 ? (k <= 0 ? 0 : -Infinity) : p >= 1 ? 0 : caudaLog(n, k, (x) => lf(n) - lf(x) - lf(n - x) + x * Math.log(p) + (n - x) * Math.log(1 - p)));
function betaBinomLog(n, k, p, rho) {
  if (rho <= 1e-9) return binomLog(n, k, p);
  if (p <= 0) return k <= 0 ? 0 : -Infinity; if (p >= 1) return 0;
  const s = 1 / rho - 1; const a = p * s; const b = (1 - p) * s;
  const c = lgamma(a + b) - lgamma(a) - lgamma(b) - lgamma(n + a + b) + lf(n);
  return caudaLog(n, k, (x) => c - lf(x) - lf(n - x) + lgamma(x + a) + lgamma(n - x + b));
}
const p10 = (l) => (l === -Infinity ? 0 : Math.exp(l));
const fmtP = (l) => (l === -Infinity ? '0' : l < -700 ? `1e${(l / Math.LN10).toFixed(0)}` : Math.exp(l).toExponential(2));

// ---------- 1. contagens ----------
const r = {};
r.situacoes2t = situacoes;
r.secoesCompletas = rows.length;
r.compDiferenteBuXFederal = rows.filter((x) => x.comp_bu !== x.comp).length;
r.semAptos = rows.filter((x) => !x.aptos).length;
r.acimaAptos = rows.filter((x) => x.comp > x.aptos).length;
const taxa = (x) => x.comp / x.aptos;
const alto = rows.filter((x) => x.aptos && taxa(x) >= 0.95);
r.ge95 = alto.length;
r.eq100 = rows.filter((x) => x.aptos && x.comp === x.aptos).length;
r.faixa90a95 = rows.filter((x) => x.aptos && taxa(x) >= 0.9 && taxa(x) < 0.95).length;
r.comparecimentoNacional = rows.reduce((s, x) => s + x.comp, 0) / rows.reduce((s, x) => s + x.aptos, 0);
r.ge95PorTipoArquivo = Object.entries(alto.reduce((m, x) => ((m[`${x.tipo_urna}/${x.tipo_arquivo}`] = (m[`${x.tipo_urna}/${x.tipo_arquivo}`] ?? 0) + 1), m), {}));
r.ge95SemDetalhamento = alto.filter((x) => x.sb === null || x.pb === null).length;
r.ge95Exterior = alto.filter((x) => x.uf === 'zz').length;
r.detalhamentoNaoFecha = rows.filter((x) => x.sb !== null && x.sb + x.pb + x.pbio !== x.comp_bu).length;

// ---------- zonas ----------
const chave = (x) => `${x.uf}|${x.municipio}|${x.zona}`;
const Z = new Map();
for (const x of rows) {
  const z = Z.get(chave(x)) ?? { aptos: 0, comp: 0, sd: 0, compD: 0, secs: [] };
  z.aptos += x.aptos; z.comp += x.comp; z.secs.push(x);
  if (x.sb !== null && x.pb !== null) { z.sd += x.sb + x.pb; z.compD += x.comp; }
  Z.set(chave(x), z);
}

// ---------- 2. sobredispersão do comparecimento (média da zona incluindo a seção; graus de liberdade N − zonas) ----------
let chi = 0; let nUsadas = 0; const zonasUsadas = new Set();
const porUf = new Map();
for (const x of rows) {
  const z = Z.get(chave(x)); if (x.aptos < 2 || z.secs.length < 2) continue;
  const p = z.comp / z.aptos; if (p <= 0 || p >= 1) continue;
  const q = (x.comp - x.aptos * p) ** 2 / (x.aptos * p * (1 - p));
  chi += q; nUsadas++; zonasUsadas.add(chave(x));
  const u = porUf.get(x.uf) ?? { q: 0, n1: 0, k: 0 }; u.q += q - 1; u.n1 += x.aptos - 1; u.k++; porUf.set(x.uf, u);
}
r.dispersaoPearson = chi / (nUsadas - zonasUsadas.size);
// rho por momentos (mesma forma do autor, mas com a média da zona incluindo a seção, para checar sensibilidade)
let sQ = 0; let sN1 = 0;
for (const x of rows) { const z = Z.get(chave(x)); if (x.aptos < 2 || z.secs.length < 2) continue; const p = z.comp / z.aptos; if (p <= 0 || p >= 1) continue; sQ += (x.comp - x.aptos * p) ** 2 / (x.aptos * p * (1 - p)) - 1; sN1 += x.aptos - 1; }
const rhoNac = Math.max(1e-6, sQ / sN1);
r.rhoNacional = rhoNac;
const rhoUf = new Map([...porUf].map(([u, v]) => [u, Math.max(1e-6, v.q / v.n1)]));
r.rhoPorUf = Object.fromEntries([...rhoUf].map(([u, v]) => [u, +v.toExponential(2)]));
// esperado ≥ 95% (taxa da zona sem a própria seção, como o autor) com rho nacional, por UF, e por faixa de tamanho
let eBin = 0; let eBB = 0; let eBBuf = 0;
const porFaixa = { '<100': { obs: 0, bb: 0 }, '100-199': { obs: 0, bb: 0 }, '200+': { obs: 0, bb: 0 } };
const faixaN = (n) => (n < 100 ? '<100' : n < 200 ? '100-199' : '200+');
const esperadoUf = {};
for (const x of rows) {
  const z = Z.get(chave(x)); if (!x.aptos || z.aptos - x.aptos <= 0) continue;
  const p = (z.comp - x.comp) / (z.aptos - x.aptos); const k = Math.ceil(0.95 * x.aptos - 1e-9);
  eBin += p10(binomLog(x.aptos, k, p));
  const bb = p10(betaBinomLog(x.aptos, k, p, rhoNac)); eBB += bb;
  const bu = p10(betaBinomLog(x.aptos, k, p, rhoUf.get(x.uf) ?? rhoNac)); eBBuf += bu;
  porFaixa[faixaN(x.aptos)].bb += bb; if (taxa(x) >= 0.95) porFaixa[faixaN(x.aptos)].obs++;
  const eu = esperadoUf[x.uf] ?? { obs: 0, bbNac: 0, bbUf: 0 }; eu.bbNac += bb; eu.bbUf += bu; if (taxa(x) >= 0.95) eu.obs++; esperadoUf[x.uf] = eu;
}
r.esperadoBinomial = eBin; r.esperadoBetaBinomialRhoNacional = eBB; r.esperadoBetaBinomialRhoPorUf = eBBuf;
r.porFaixaTamanho = porFaixa;
r.esperadoPorUf = Object.fromEntries(Object.entries(esperadoUf).map(([u, v]) => [u, { obs: v.obs, bbNac: +v.bbNac.toFixed(1), bbUf: +v.bbUf.toFixed(1) }]).sort((a, b) => b[1].obs - a[1].obs));

// ---------- 3. liberação sem digital ----------
const comD = rows.filter((x) => x.sb !== null && x.pb !== null);
const tx = (arr) => arr.reduce((s, x) => s + x.sb + x.pb, 0) / arr.reduce((s, x) => s + x.comp, 0);
r.semDigitalPais = tx(comD);
r.semDigitalGe95 = tx(alto.filter((x) => x.sb !== null && x.pb !== null));
r.semBioCadastradaPais = comD.reduce((s, x) => s + x.sb, 0) / comD.reduce((s, x) => s + x.comp, 0);
r.semBioCadastradaGe95 = alto.filter((x) => x.sb !== null).reduce((s, x) => s + x.sb, 0) / alto.filter((x) => x.sb !== null).reduce((s, x) => s + x.comp, 0);
// comparação justa: taxa sem digital esperada nas seções ≥ 95% se cada uma tivesse a taxa da própria zona
let espZ = 0; let compZ = 0;
for (const x of alto) { if (x.sb === null) continue; const z = Z.get(chave(x)); const zc = z.compD - x.comp; if (zc <= 0) continue; espZ += x.comp * (z.sd - x.sb - x.pb) / zc; compZ += x.comp; }
r.semDigitalGe95EsperadoPelaZona = espZ / compZ;
// por componente: biometria que falhou (liberação manual) e sem biometria cadastrada, observado × esperado pela zona
{
  let oPb = 0; let ePb = 0; let oSb = 0; let eSb = 0; let c = 0;
  const zc = new Map(); for (const [k, z] of Z) zc.set(k, { sb: z.secs.reduce((s, y) => s + (y.sb ?? 0), 0), pb: z.secs.reduce((s, y) => s + (y.pb ?? 0), 0) });
  for (const x of alto) { if (x.sb === null) continue; const z = Z.get(chave(x)); const d = z.compD - x.comp; if (d <= 0) continue; const t = zc.get(chave(x));
    oPb += x.pb; ePb += x.comp * (t.pb - x.pb) / d; oSb += x.sb; eSb += x.comp * (t.sb - x.sb) / d; c += x.comp; }
  r.ge95Componentes = { falhouObs: oPb / c, falhouEsperadoZona: ePb / c, semCadastradaObs: oSb / c, semCadastradaEsperadoZona: eSb / c,
    falhouPais: comD.reduce((s, x) => s + x.pb, 0) / comD.reduce((s, x) => s + x.comp, 0) };
}

// ---------- 4. filtro de risco ----------
// rho da taxa sem digital por zona (momentos, média da zona incluindo a seção); zonas com < 5 seções usam o rho nacional
const rhoSD = new Map(); let gQ = 0; let gN = 0;
for (const [k, z] of Z) {
  if (z.compD <= 0) continue; const p = z.sd / z.compD; if (p <= 0 || p >= 1) continue;
  let q = 0; let n1 = 0; let m = 0;
  for (const x of z.secs) { if (x.sb === null || x.comp < 2) continue; q += (x.sb + x.pb - x.comp * p) ** 2 / (x.comp * p * (1 - p)) - 1; n1 += x.comp - 1; m++; }
  gQ += q; gN += n1; if (m >= 5) rhoSD.set(k, Math.max(1e-6, q / n1));
}
const rhoSDnac = gQ / gN; r.rhoSemDigitalNacional = rhoSDnac;
const risco = [];
for (const x of alto) {
  if (x.sb === null || x.pb === null) continue;
  const z = Z.get(chave(x)); const zc = z.compD - x.comp; if (zc <= 0) continue;
  const k = x.sb + x.pb; const pz = (z.sd - k) / zc;
  const lb = binomLog(x.comp, k, pz);
  const rz = rhoSD.get(chave(x)) ?? rhoSDnac;
  const lbb = betaBinomLog(x.comp, k, pz, rz);
  const outras = z.secs.filter((y) => y !== x && y.sb !== null && y.comp > 0);
  const posto = 1 + outras.filter((y) => (y.sb + y.pb) / y.comp >= k / x.comp).length;
  // componentes separados contra a zona
  const sbZ = (z.secs.reduce((s, y) => s + (y.sb ?? 0), 0) - x.sb) / zc; const pbZ = (z.secs.reduce((s, y) => s + (y.pb ?? 0), 0) - x.pb) / zc;
  risco.push({ id: `${x.uf.toUpperCase()} ${x.municipio}/${x.zona}/${x.secao}`, comp: x.comp, aptos: x.aptos, sd: k, pct: +(100 * k / x.comp).toFixed(1), pctZona: +(100 * pz).toFixed(1),
    sbPct: +(100 * x.sb / x.comp).toFixed(1), sbZona: +(100 * sbZ).toFixed(1), pbPct: +(100 * x.pb / x.comp).toFixed(1), pbZona: +(100 * pbZ).toFixed(1),
    pBinom: fmtP(lb), rhoZona: +rz.toExponential(2), pBetaBinom: fmtP(lbb), postoNaZona: `${posto}/${outras.length + 1}`, lb, lbb });
}
const r23 = risco.filter((x) => x.lb < Math.log(0.001)).sort((a, b) => a.lb - b.lb);
r.riscoBinomialP001 = r23.length;
r.riscoBetaBinomialP001 = risco.filter((x) => x.lbb < Math.log(0.001)).length;
r.riscoBetaBinomialBonferroni = risco.filter((x) => x.lbb < Math.log(0.05 / risco.length)).length;
r.riscoPostoPrimeiroNaZona = risco.filter((x) => x.postoNaZona.startsWith('1/') && x.lb < Math.log(0.001)).length;
r.risco = r23.map(({ lb, lbb, ...y }) => y);

// ---------- 5. caso RN 17132/0010/0145: zona no 1º turno lida dos BUs brutos ----------
async function zonaBruta(turno, uf, mun, zona) {
  const base = path.join('data/raw', `${turno}t`, 'urnas', uf, mun, zona);
  const out = [];
  for (const sec of (await readdir(base)).sort()) {
    for (const h of await readdir(path.join(base, sec))) {
      const nomes = await readdir(path.join(base, sec, h)).catch(() => null); if (!nomes) continue;
      const nb = nomes.find((n) => /-bu(sa)?\.dat$/.test(n)); if (!nb) continue;
      const bu = perfilBu(await readFile(path.join(base, sec, h, nb)));
      const pres = bu.eleicoes.find((e) => e.cargos.some((c) => c.codigoCargo === 1));
      const d = bu.detalhamentoComparecimento ?? {};
      out.push({ secao: sec, aptos: pres?.aptos, comp: bu.qtdEleitoresCompareceram, sb: d.semBiometriaCadastrada, pb: d.comBiometriaHabilitadosPorAnoNascimento, pbio: d.porBiometria });
    }
  }
  return out;
}
const z1 = await zonaBruta(1, 'rn', '17132', '0010');
const z2 = await zonaBruta(2, 'rn', '17132', '0010');
const m1 = new Map(z1.map((x) => [x.secao, x]));
const pares = z2.map((b) => ({ secao: b.secao, t2: b, t1: m1.get(b.secao) })).filter((x) => x.t1 && x.t1.sb !== undefined && x.t2.sb !== undefined);
const caso = pares.find((x) => x.secao === '0145');
const soma = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
const outrosPares = pares.filter((x) => x.secao !== '0145');
const dComp = outrosPares.map((x) => x.t2.comp - x.t1.comp);
const dSD = outrosPares.map((x) => x.t2.sb + x.t2.pb - x.t1.sb - x.t1.pb);
// fração do aumento de comparecimento 1º→2º turno que entrou sem digital, zona (sem a seção) × seção
const fracZona = soma(outrosPares, (x) => x.t2.sb + x.t2.pb - x.t1.sb - x.t1.pb) / soma(outrosPares, (x) => x.t2.comp - x.t1.comp);
r.casoRN = {
  zona2tDoBanco: (() => { const z = Z.get('rn|17132|0010'); return { secoes: z.secs.length, compD: z.compD, sd: z.sd, pctSemDigitalComSecao: +(100 * z.sd / z.compD).toFixed(2) }; })(),
  linhaRisco: risco.find((x) => x.id === 'RN 17132/0010/0145'),
  bruto1t: caso?.t1, bruto2t: caso?.t2,
  zonaPares1t2t: pares.length,
  zonaSemDigital1t: +(100 * soma(outrosPares, (x) => x.t1.sb + x.t1.pb) / soma(outrosPares, (x) => x.t1.comp)).toFixed(2),
  zonaSemDigital2t: +(100 * soma(outrosPares, (x) => x.t2.sb + x.t2.pb) / soma(outrosPares, (x) => x.t2.comp)).toFixed(2),
  zonaComparecimento1t: +(100 * soma(outrosPares, (x) => x.t1.comp) / soma(outrosPares, (x) => x.t1.aptos)).toFixed(2),
  zonaComparecimento2t: +(100 * soma(outrosPares, (x) => x.t2.comp) / soma(outrosPares, (x) => x.t2.aptos)).toFixed(2),
  zonaFracaoDoAumentoSemDigital: +fracZona.toFixed(3),
  secaoAumentoComp: caso.t2.comp - caso.t1.comp, secaoAumentoSemDigital: caso.t2.sb + caso.t2.pb - caso.t1.sb - caso.t1.pb,
  // posto da seção no aumento de comparecimento e no aumento sem digital
  postoAumentoComp: `${1 + dComp.filter((v) => v >= caso.t2.comp - caso.t1.comp).length}/${pares.length}`,
  postoAumentoSemDigital: `${1 + dSD.filter((v) => v >= caso.t2.sb + caso.t2.pb - caso.t1.sb - caso.t1.pb).length}/${pares.length}`,
  // p de 15 ou mais dos 19 novos votantes sem digital, se a fração fosse a da zona
  pAumentoSemDigitalBinom: fmtP(binomLog(caso.t2.comp - caso.t1.comp, caso.t2.sb + caso.t2.pb - caso.t1.sb - caso.t1.pb, Math.min(0.999, Math.max(0.001, fracZona)))),
  posto1tSemDigital: `${1 + z1.filter((x) => x.secao !== '0145' && x.sb !== undefined && (x.sb + x.pb) / x.comp >= (caso.t1.sb + caso.t1.pb) / caso.t1.comp).length}/${z1.filter((x) => x.sb !== undefined).length}`,
  top5SemDigital2t: z2.filter((x) => x.sb !== undefined).map((x) => ({ secao: x.secao, pct: +(100 * (x.sb + x.pb) / x.comp).toFixed(1), comp: x.comp, aptos: x.aptos })).sort((a, b) => b.pct - a.pct).slice(0, 6),
  top5SemDigital1t: z1.filter((x) => x.sb !== undefined).map((x) => ({ secao: x.secao, pct: +(100 * (x.sb + x.pb) / x.comp).toFixed(1), comp: x.comp, aptos: x.aptos })).sort((a, b) => b.pct - a.pct).slice(0, 6),
  // aumento 1º→2º turno por componente em cada seção da zona (posto de 0145 e 0183, mesmo local de votação)
  deltasZona: (() => {
    const d = pares.map((x) => ({ secao: x.secao, dComp: x.t2.comp - x.t1.comp, dSb: x.t2.sb - x.t1.sb, dPb: x.t2.pb - x.t1.pb, dBio: x.t2.pbio - x.t1.pbio }));
    const posto = (s, k) => 1 + d.filter((y) => y.secao !== s && y[k] >= d.find((z) => z.secao === s)[k]).length;
    const ord = [...d].sort((a, b) => b.dPb - a.dPb).slice(0, 6);
    return { top6AumentoFalhou: ord, posto0145dPb: posto('0145', 'dPb'), posto0183dPb: posto('0183', 'dPb'), mediaDPb: +(soma(d, (y) => y.dPb) / d.length).toFixed(2), mediaDComp: +(soma(d, (y) => y.dComp) / d.length).toFixed(2), mediaDBio: +(soma(d, (y) => y.dBio) / d.length).toFixed(2) };
  })(),
  local1414: { t1: ['0145', '0183'].map((s) => m1.get(s)), t2: ['0145', '0183'].map((s) => z2.find((x) => x.secao === s)) },
};

// concentração das liberações manuais no mesário que mais liberou, RN 2º turno (linha de base para o caso)
const conc = db.prepare(`SELECT secao, municipio, zona, json_extract(dados, '$.log.mesarios.liberacoesPorMesario') l FROM perfil_log WHERE turno = 2 AND uf = 'rn'`).all();
const fr = [];
for (const c of conc) { const v = Object.values(JSON.parse(c.l ?? '{}')); const t = v.reduce((s, y) => s + y, 0); if (t >= 20) fr.push(Math.max(...v) / t); }
fr.sort((a, b) => a - b);
r.rnConcentracaoMesario = { secoesCom20ouMaisLiberacoes: fr.length, medianaFracaoTop: +fr[Math.floor(fr.length / 2)].toFixed(3), fracaoSecoesTop100pct: +(fr.filter((v) => v === 1).length / fr.length).toFixed(3) };

mkdirSync('data/parsed/auditoria/cetico', { recursive: true });
writeFileSync('data/parsed/auditoria/cetico/a7-reproducao.json', JSON.stringify(r, null, 2));
const { risco: lista, rhoPorUf, esperadoPorUf, ...resumo } = r;
console.log(JSON.stringify(resumo, null, 1));
console.log('\nFiltro de risco (binomial p < 0,001), com p beta-binomial e posto na zona:');
for (const x of lista) console.log(`  ${x.id} ${x.comp}/${x.aptos} sd ${x.pct}% × ${x.pctZona}% [sem cad ${x.sbPct}×${x.sbZona}; falhou ${x.pbPct}×${x.pbZona}] pBin ${x.pBinom} pBB ${x.pBetaBinom} (rho ${x.rhoZona}) posto ${x.postoNaZona}`);
console.log('\nEsperado por UF (obs, bb rho nacional, bb rho UF):', JSON.stringify(esperadoPorUf));
console.log('Arquivo: data/parsed/auditoria/cetico/a7-reproducao.json');
