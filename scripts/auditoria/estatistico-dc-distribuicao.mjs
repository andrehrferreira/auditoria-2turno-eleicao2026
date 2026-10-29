// Estatístico eleitoral: forense do aumento de comparecimento entre os turnos (presidente), mesma seção.
// Perguntas 1 (distribuição e modelo nulo, Klimek aplicado à variação), 3 (concentração e lado favorecido) e 4 (assimetria).
//
// Uso: node --max-old-space-size=8192 scripts/auditoria/estatistico-dc-distribuicao.mjs [abertos|banco] [replicas]
//   abertos (padrão): 28 UFs, dados abertos do TSE (pares-abertos.csv, de estatistico-pares.mjs)
//   banco: só as UFs com o 1º turno na cópia de leitura (pares-banco.csv)
// Saídas: data/parsed/auditoria/estatistico-eleitoral/dc-<fonte>.json, dc-<fonte>-extremas.csv, dc-<fonte>-klimek.csv/.svg,
//         dc-<fonte>-zonas.csv
//
// Modelo nulo (estatistico-lib.mjs, modelar): esperado por transição na zona (c2 ≈ r·c1 + s·(a2 − c1)) com ajuste por idade
// (parcela 60+) e tamanho; variância binomial de transição calibrada pela mediana da zona (φ). O resíduo padronizado z
// é comparado com o nulo sorteado (Monte Carlo) e com a própria cauda esquerda.
import { aleatorio, paraCsv, quantil, sortearBeta, sortearBinomial } from './forense-lib.mjs';
import { REGIAO, bh, carregarIdade, diferenca, filtrar, lerPares, modelar, mqEfeitoFixo, pNormal2, pNormalSup, salvar, sortearNulo } from './estatistico-lib.mjs';

const fonte = process.argv[2] ?? 'abertos';
const REPLICAS = Number(process.argv[3] ?? 10);
const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const r3 = (x) => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : null);
const r1 = (x) => (Number.isFinite(x) ? Math.round(x * 10) / 10 : null);

// ---------- dados e modelo ----------
const todos = await lerPares(fonte);
const { P, filtro } = filtrar(todos);
log(`${P.length} seções (de ${todos.length})`);
const linhasPerfil = await carregarIdade(P);
log(`perfil: ${linhasPerfil} linhas`);
const { transicao, ajCov, disp } = modelar(P);
log(`modelo: ${transicao.proprias} zonas com transição própria, ${transicao.herdadas} herdadas`);

// ---------- P1: distribuição ----------
function momentos(v) {
  const n = v.length; const m = v.reduce((a, b) => a + b, 0) / n;
  let m2 = 0, m3 = 0, m4 = 0;
  for (const x of v) { const d = x - m; m2 += d * d; m3 += d ** 3; m4 += d ** 4; }
  m2 /= n; m3 /= n; m4 /= n;
  return { n, media: r3(m), dp: r3(Math.sqrt(m2)), assimetria: r3(m3 / m2 ** 1.5), curtoseExcesso: r3(m4 / m2 ** 2 - 3),
    p1: r3(quantil(v, 0.01)), p5: r3(quantil(v, 0.05)), p25: r3(quantil(v, 0.25)), p50: r3(quantil(v, 0.5)), p75: r3(quantil(v, 0.75)),
    p95: r3(quantil(v, 0.95)), p99: r3(quantil(v, 0.99)), p999: r3(quantil(v, 0.999)), min: r3(v.reduce((a, b) => Math.min(a, b), Infinity)), max: r3(v.reduce((a, b) => Math.max(a, b), -Infinity)) };
}
const LIM = [2, 3, 4, 5, 6, 8];
const caudas = (zs) => Object.fromEntries(LIM.map((k) => [k, { acima: zs.filter((z) => z >= k).length, abaixo: zs.filter((z) => z <= -k).length }]));
const histograma = (v, de, ate, passo) => {
  const n = Math.round((ate - de) / passo); const h = new Array(n + 2).fill(0);
  for (const x of v) h[x < de ? 0 : x >= ate ? n + 1 : 1 + Math.floor((x - de) / passo)]++;
  return { de, ate, passo, abaixo: h[0], acima: h[n + 1], contagens: h.slice(1, n + 1) };
};
// modas locais de um histograma suavizado (média móvel de 5 bins), só com contagem ≥ 20
const modas = (h) => {
  const c = h.contagens; const sm = c.map((_, i) => { let s = 0, k = 0; for (let j = i - 2; j <= i + 2; j++) if (c[j] != null) { s += c[j]; k++; } return s / k; });
  const out = [];
  for (let i = 1; i < sm.length - 1; i++) if (sm[i] > sm[i - 1] && sm[i] >= sm[i + 1] && sm[i] >= 20) out.push(r3(h.de + (i + 0.5) * h.passo));
  return out;
};

const zs = P.map((s) => s.z);
const res = {
  geradoEm: new Date().toISOString(), fonte, filtro, linhasPerfil,
  ufs: [...new Set(P.map((s) => s.uf))].sort(),
  modelo: { zonasProprias: transicao.proprias, zonasHerdadas: transicao.herdadas,
    covariaveis: { p60: r3(ajCov.b[0]), ep_p60: r3(ajCov.ep[0]), logAptos: r3(ajCov.b[1]), ep_logAptos: r3(ajCov.ep[1]), n: ajCov.n },
    zonasComPhiProprio: disp.zonasProprias, secoesForaDaBinomial: disp.secoesForaDaBinomial, secoesBetaBinomial: disp.secoesBetaBinomial, secoesNormal: disp.secoesNormal, dispersaoPorUf: disp.porUf },
};
res.p1 = {
  totais: { c1: P.reduce((a, s) => a + s.c1, 0), c2: P.reduce((a, s) => a + s.c2, 0), dc: P.reduce((a, s) => a + s.dc, 0),
    esperadoModelo: Math.round(P.reduce((a, s) => a + s.esp2 - s.c1, 0)) },
  dpp: momentos(P.map((s) => s.dpp)), dEleitores: momentos(P.map((s) => s.dc)), z: momentos(zs),
  histDpp: histograma(P.map((s) => s.dpp), -30, 30, 0.5), histZ: histograma(zs, -10, 10, 0.25),
  caudasObservadas: caudas(zs),
};
res.p1.modasDpp = modas(res.p1.histDpp); res.p1.modasZ = modas(res.p1.histZ);
// checagem do modelo por faixa de tamanho: mediana de z² deve ficar perto de 0,455 em todas
const faixas = [[20, 100], [100, 200], [200, 300], [300, 400], [400, 1e9]];
res.p1.calibracaoPorTamanho = faixas.map(([a, b]) => {
  const l = P.filter((s) => s.a2 >= a && s.a2 < b);
  return { aptos: `${a}-${b < 1e9 ? b : '+'}`, secoes: l.length, medianaZ2: r3(quantil(l.map((s) => s.z * s.z), 0.5)), mediaZ: r3(l.reduce((x, s) => x + s.z, 0) / (l.length || 1)) };
});
// simulação do nulo beta-binomial (mesmo r, s, ρ, mesma padronização)
const rnd = aleatorio(20261025);
const sims = [];
for (let rep = 0; rep < REPLICAS; rep++) {
  const zsim = P.map((s) => (sortearNulo(s, rnd, sortearBinomial, sortearBeta) - s.a2 * s.p) / Math.sqrt(s.V));
  sims.push(caudas(zsim));
  if (rep === 0) { res.p1.zSimulado = momentos(zsim); res.p1.histZSimulado = histograma(zsim, -10, 10, 0.25); }
}
res.p1.caudasSimuladas = Object.fromEntries(LIM.map((k) => [k, {
  acimaMedia: r1(sims.reduce((a, c) => a + c[k].acima, 0) / REPLICAS), acimaMax: Math.max(...sims.map((c) => c[k].acima)),
  abaixoMedia: r1(sims.reduce((a, c) => a + c[k].abaixo, 0) / REPLICAS), abaixoMax: Math.max(...sims.map((c) => c[k].abaixo)) }]));
res.p1.caudasNormal = Object.fromEntries(LIM.map((k) => [k, r1((P.length * pNormal2(k)) / 2)]));
// por UF: cauda direita × esquerda (teste binomial da simetria, unilateral para excesso à direita) e BH
const porUf = [...new Set(P.map((s) => s.uf))].sort();
const linhasUf = porUf.map((uf) => {
  const l = P.filter((s) => s.uf === uf);
  const R = l.filter((s) => s.z >= 4).length, L = l.filter((s) => s.z <= -4).length;
  // P(X ≥ R) com X ~ Bin(R+L, 1/2), aproximação normal com correção de continuidade
  const n = R + L;
  const pSup = n ? pNormalSup((R - 0.5 - n / 2) / Math.sqrt(n / 4)) : 1;
  return { uf, secoes: l.length, dc: l.reduce((a, s) => a + s.dc, 0), dppMediana: r3(quantil(l.map((s) => s.dpp), 0.5)),
    z4acima: R, z4abaixo: L, pExcessoDireita: pSup, phiUf: disp.porUf[uf].phiUf, permanencia: disp.porUf[uf].permanenciaMediana, retorno: disp.porUf[uf].retornoMediano };
});
const qUf = bh(linhasUf.map((l) => l.pExcessoDireita));
linhasUf.forEach((l, i) => { l.qBH = +qUf[i].toPrecision(3); l.pExcessoDireita = +l.pExcessoDireita.toPrecision(3); });
res.p1.porUf = linhasUf;
res.p1.testesPorUf = linhasUf.length;
log('P1 distribuição');

// seções extremas (para conferir no bruto), com valor-p normal unilateral e BH sobre todas as seções testadas
const pSec = P.map((s) => pNormalSup(s.z));
const qSec = bh(pSec);
P.forEach((s, i) => { s.q = qSec[i]; });
const extremas = [...P].sort((a, b) => b.z - a.z).slice(0, 60).map((s) => ({
  uf: s.uf, municipio: s.municipio, zona: s.zona, secao: s.secao, a1: s.a1, a2: s.a2, c1: s.c1, c2: s.c2, esperado: Math.round(s.a2 * s.p),
  excesso: Math.round(s.resAj), z: r1(s.z), q: +s.q.toPrecision(2), v13_1: s.v13_1, v13_2: s.v13_2, v22_1: s.v22_1, v22_2: s.v22_2,
  bn1: s.bn1, bn2: s.bn2, out1: s.out1, local1: s.local1, local2: s.local2, modelo1: s.modelo1, modelo2: s.modelo2 }));
await salvar(`dc-${fonte}-extremas.csv`, paraCsv(extremas, Object.keys(extremas[0])));
res.p1.secoesQBH = { q001: P.filter((s) => s.q < 0.01).length, q05: P.filter((s) => s.q < 0.05).length, testes: P.length };
res.p1.extremasExcessoTotal = extremas.slice(0, 20).reduce((a, s) => a + s.excesso, 0);

// ---------- Klimek aplicado à variação ----------
const K = P.filter((s) => s.s1 != null && s.s2 != null && s.f1 >= 10 && s.f2 >= 10);
{
  const mz = new Map();
  for (const s of K) { const m = mz.get(s.zon) ?? { w: 0, ds: 0 }; m.w += s.a2; m.ds += s.a2 * (s.s2 - s.s1); mz.set(s.zon, m); }
  for (const s of K) { const m = mz.get(s.zon); s.kx = (100 * s.resAj) / s.a2; s.ky = 100 * (s.s2 - s.s1 - m.ds / m.w); }
}
const kLim = 20, kPasso = 1, kn = (2 * kLim) / kPasso;
const matriz = Array.from({ length: kn }, () => new Array(kn).fill(0));
for (const s of K) {
  const i = Math.floor((s.kx + kLim) / kPasso), j = Math.floor((s.ky + kLim) / kPasso);
  if (i >= 0 && i < kn && j >= 0 && j < kn) matriz[i][j]++;
}
const cantos = (lx, ly) => ({
  maisMais: K.filter((s) => s.kx >= lx && s.ky >= ly).length, maisMenos: K.filter((s) => s.kx >= lx && s.ky <= -ly).length,
  menosMais: K.filter((s) => s.kx <= -lx && s.ky >= ly).length, menosMenos: K.filter((s) => s.kx <= -lx && s.ky <= -ly).length });
const ajK = mqEfeitoFixo(K, { y: (s) => s.ky, x: (s) => [s.kx], w: (s) => s.a2, grupo: (s) => s.zon, cluster: (s) => s.mun });
// só a cauda direita do excesso (kx ≥ 5 p.p.): inclinação separada
const ajKd = mqEfeitoFixo(K, { y: (s) => s.ky, x: (s) => [Math.min(s.kx, 0), Math.max(s.kx, 0)], w: (s) => s.a2, grupo: (s) => s.zon, cluster: (s) => s.mun });
res.klimek = {
  secoes: K.length, eixoX: 'excesso de comparecimento sobre o modelo da zona (p.p. dos aptos)', eixoY: 'Δ parcela do 13 entre os finalistas, menos a média da zona (p.p.)',
  correlacao: r3((() => { let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0; for (const s of K) { sx += s.kx; sy += s.ky; sxx += s.kx ** 2; syy += s.ky ** 2; sxy += s.kx * s.ky; } const n = K.length; return (sxy - sx * sy / n) / Math.sqrt((sxx - sx * sx / n) * (syy - sy * sy / n)); })()),
  inclinacao: { b: r3(ajK.b[0]), ep: r3(ajK.ep[0]), t: r1(ajK.b[0] / ajK.ep[0]) },
  inclinacaoNegativo: { b: r3(ajKd.b[0]), ep: r3(ajKd.ep[0]) }, inclinacaoPositivo: { b: r3(ajKd.b[1]), ep: r3(ajKd.ep[1]), t: r1(ajKd.b[1] / ajKd.ep[1]) },
  cantos5: cantos(5, 5), cantos10: cantos(10, 5), cantos10x10: cantos(10, 10),
};
await salvar(`dc-${fonte}-klimek.csv`, ['kx\\ky;' + Array.from({ length: kn }, (_, j) => -kLim + j * kPasso).join(';'),
  ...matriz.map((r, i) => `${-kLim + i * kPasso};${r.join(';')}`)].join('\n') + '\n');
{
  // mapa de calor simples (log10 da contagem), eixo x = excesso de comparecimento, eixo y = Δ parcela do 13
  const tam = 12, mar = 50, L = kn * tam;
  const max = Math.log10(Math.max(...matriz.flat()) + 1);
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${L + 2 * mar}" height="${L + 2 * mar}" font-family="sans-serif" font-size="11">`;
  svg += `<rect width="100%" height="100%" fill="#fff"/>`;
  for (let i = 0; i < kn; i++) for (let j = 0; j < kn; j++) {
    const v = matriz[i][j]; if (!v) continue;
    const a = Math.log10(v + 1) / max; const cor = Math.round(255 * (1 - a));
    svg += `<rect x="${mar + i * tam}" y="${mar + (kn - 1 - j) * tam}" width="${tam}" height="${tam}" fill="rgb(${cor},${cor},255)"/>`;
  }
  svg += `<line x1="${mar + L / 2}" y1="${mar}" x2="${mar + L / 2}" y2="${mar + L}" stroke="#999"/><line x1="${mar}" y1="${mar + L / 2}" x2="${mar + L}" y2="${mar + L / 2}" stroke="#999"/>`;
  svg += `<text x="${mar}" y="${mar + L + 30}">excesso de comparecimento (p.p.), −${kLim} a +${kLim}</text>`;
  svg += `<text x="12" y="${mar + L / 2}" transform="rotate(-90 12 ${mar + L / 2})">Δ parcela do 13 na zona (p.p.)</text>`;
  svg += `<text x="${mar}" y="${mar - 15}">Klimek na variação 1º→2º turno, ${K.length} seções (${fonte}); cor = log10(seções)</text></svg>`;
  await salvar(`dc-${fonte}-klimek.svg`, svg);
}
log('Klimek-Δ');

// ---------- P3b: o excesso favorece um lado mais do que a proporção da seção prevê? ----------
// Δv13 = κ13·excesso·s1 + κ×13·excesso·(1 − s1) + controles (esperado·s1, esperado·(1−s1), eliminados, queda de BN), efeito fixo de zona.
// Nulo: excesso que se divide como os finalistas do 1º turno na seção → κ13 ≈ κ22 ≈ fração do excesso que vai aos finalistas e
// os termos cruzados (13 ganhando onde é fraco) ≈ 0.
function proporcao(lista) {
  const X = (s) => { const e = s.resAj, esp = s.esp2 - s.c1; return [e * s.s1, e * (1 - s.s1), esp * s.s1, esp * (1 - s.s1), s.out1, s.bn1 - s.bn2]; };
  const a13 = mqEfeitoFixo(lista, { y: (s) => s.v13_2 - s.v13_1, x: X, grupo: (s) => s.zon, cluster: (s) => s.mun });
  const a22 = mqEfeitoFixo(lista, { y: (s) => s.v22_2 - s.v22_1, x: X, grupo: (s) => s.zon, cluster: (s) => s.mun });
  if (!a13 || !a22) return null;
  const f = (a, i) => ({ b: r3(a.b[i]), ep: r3(a.ep[i]) });
  return { secoes: a13.n, municipios: a13.G,
    excessoOnde13Forte: { para13: f(a13, 0), para22: f(a22, 0) }, excessoOnde22Forte: { para13: f(a13, 1), para22: f(a22, 1) },
    eliminados: { para13: f(a13, 4), para22: f(a22, 4) }, quedaBN: { para13: f(a13, 5), para22: f(a22, 5) },
    esperadoOnde13Forte: { para13: f(a13, 2), para22: f(a22, 2) }, esperadoOnde22Forte: { para13: f(a13, 3), para22: f(a22, 3) },
    // termo cruzado (13 ganhando onde é fraco; 22 ganhando onde é fraco) contra 0 (nulo ingênuo: excesso vota como a seção)
    cruzado13: { b: r3(a13.b[1]), t: r1(a13.b[1] / a13.ep[1]) }, cruzado22: { b: r3(a22.b[0]), t: r1(a22.b[0] / a22.ep[0]) },
    // nulo usado no teste: o excesso se divide como o aumento esperado (eleitor que volta) na mesma seção
    excessoMenosEsperado13: (() => { const d = diferenca(a13, 1, 3); return { d: r3(d.d), ep: r3(d.ep), t: r1(d.t) }; })(),
    excessoMenosEsperado22: (() => { const d = diferenca(a22, 0, 2); return { d: r3(d.d), ep: r3(d.ep), t: r1(d.t) }; })() };
}
const KP = K.filter((s) => s.s1 != null);
res.p3proporcao = { nacional: proporcao(KP) };
// por decil de s1: parte do excesso que vai ao 13 entre os finalistas, contra a parcela do 13 no decil
const ordS1 = [...KP].sort((a, b) => a.s1 - b.s1);
res.p3proporcao.porDecil = Array.from({ length: 10 }, (_, d) => {
  const l = ordS1.slice(Math.floor((d * ordS1.length) / 10), Math.floor(((d + 1) * ordS1.length) / 10));
  const X = (s) => [s.resAj, s.esp2 - s.c1, s.out1, s.bn1 - s.bn2];
  const a13 = mqEfeitoFixo(l, { y: (s) => s.v13_2 - s.v13_1, x: X, grupo: (s) => s.zon, cluster: (s) => s.mun });
  const a22 = mqEfeitoFixo(l, { y: (s) => s.v22_2 - s.v22_1, x: X, grupo: (s) => s.zon, cluster: (s) => s.mun });
  const s1m = l.reduce((a, s) => a + s.s1 * s.f1, 0) / l.reduce((a, s) => a + s.f1, 0);
  return { decil: d + 1, secoes: l.length, parcela13_1t: r3(s1m), excessoPara13: a13 ? r3(a13.b[0]) : null, ep13: a13 ? r3(a13.ep[0]) : null,
    excessoPara22: a22 ? r3(a22.b[0]) : null, ep22: a22 ? r3(a22.ep[0]) : null,
    parte13DoExcesso: a13 && a22 ? r3(a13.b[0] / (a13.b[0] + a22.b[0])) : null };
});
const propUf = porUf.map((uf) => ({ uf, ...proporcao(KP.filter((s) => s.uf === uf)) }));
const tCr = propUf.flatMap((l) => (l.excessoMenosEsperado13 && Number.isFinite(l.excessoMenosEsperado13.t) ? [l.excessoMenosEsperado13.t, l.excessoMenosEsperado22.t] : []));
const qCr = bh(tCr.map((t) => pNormal2(t)));
let iq = 0;
for (const l of propUf) if (l.excessoMenosEsperado13 && Number.isFinite(l.excessoMenosEsperado13.t)) { l.excessoMenosEsperado13.q = +qCr[iq++].toPrecision(3); l.excessoMenosEsperado22.q = +qCr[iq++].toPrecision(3); }
res.p3proporcao.porUf = propUf; res.p3proporcao.testesPorUf = tCr.length;
const faixaZ = (nome, f) => {
  const l = KP.filter(f); const t = (g) => l.reduce((a, s) => a + g(s), 0);
  const d13 = t((s) => s.v13_2 - s.v13_1), d22 = t((s) => s.v22_2 - s.v22_1);
  return { faixa: nome, secoes: l.length, excesso: Math.round(t((s) => s.resAj)), dc: t((s) => s.dc), d13, d22, dBN: t((s) => s.bn2 - s.bn1), eliminados1t: t((s) => s.out1),
    parcela13_1t: r3(t((s) => s.v13_1) / t((s) => s.f1)), parte13DoGanho: r3(d13 / (d13 + d22)) };
};
res.p3proporcao.porFaixaZ = [faixaZ('z <= -4', (s) => s.z <= -4), faixaZ('-4 < z <= -2', (s) => s.z > -4 && s.z <= -2), faixaZ('-1 < z < 1', (s) => s.z > -1 && s.z < 1),
  faixaZ('2 <= z < 4', (s) => s.z >= 2 && s.z < 4), faixaZ('z >= 4', (s) => s.z >= 4)];
log('P3 proporção');

// ---------- P4: assimetria pró-13 × pró-22 ----------
function assimetria(lista) {
  const x = (s) => [s.s1];
  const bruto = mqEfeitoFixo(lista, { y: (s) => s.dpp, x, w: (s) => s.a2, grupo: (s) => s.zon, cluster: (s) => s.mun });
  const modelo = mqEfeitoFixo(lista, { y: (s) => (100 * s.resAj) / s.a2, x, w: (s) => s.a2, grupo: (s) => s.zon, cluster: (s) => s.mun });
  const abst = mqEfeitoFixo(lista, { y: (s) => 100 * (1 - s.c1 / s.a1), x, w: (s) => s.a2, grupo: (s) => s.zon, cluster: (s) => s.mun });
  const bn = mqEfeitoFixo(lista, { y: (s) => (100 * (s.bn1 - s.bn2)) / s.c1, x, w: (s) => s.a2, grupo: (s) => s.zon, cluster: (s) => s.mun });
  const f = (a) => (a ? { b: r3(a.b[0] / 10), ep: r3(a.ep[0] / 10), t: r1(a.b[0] / a.ep[0]) } : null); // por 10 p.p. de parcela do 13
  return { secoes: bruto?.n, dppBruto: f(bruto), dppDepoisDoModelo: f(modelo), abstencao1t: f(abst), quedaBN: f(bn) };
}
res.p4 = { unidade: 'p.p. por +10 p.p. de parcela do 13 no 1º turno, dentro da zona', nacional: assimetria(KP) };
res.p4.porDecil = Array.from({ length: 10 }, (_, d) => {
  const l = ordS1.slice(Math.floor((d * ordS1.length) / 10), Math.floor(((d + 1) * ordS1.length) / 10));
  const w = l.reduce((a, s) => a + s.a2, 0);
  const media = (f) => r3(l.reduce((a, s) => a + s.a2 * f(s), 0) / w);
  return { decil: d + 1, parcela13: media((s) => s.s1), abstencao1t: media((s) => 100 * (1 - s.c1 / s.a1)), dpp: media((s) => s.dpp),
    esperadoModelo: media((s) => (100 * (s.esp2 - s.c1)) / s.a2), excesso: media((s) => (100 * s.resAj) / s.a2), quedaBNpp: media((s) => (100 * (s.bn1 - s.bn2)) / s.a2) };
});
const assUf = porUf.map((uf) => ({ uf, ...assimetria(KP.filter((s) => s.uf === uf)) }));
const pA = assUf.flatMap((l) => (l.dppDepoisDoModelo ? [pNormal2(l.dppDepoisDoModelo.t)] : []));
const qA = bh(pA); iq = 0;
for (const l of assUf) if (l.dppDepoisDoModelo) l.dppDepoisDoModelo.q = +qA[iq++].toPrecision(3);
res.p4.porUf = assUf; res.p4.testesPorUf = pA.length;
res.p4.porRegiao = Object.fromEntries([...new Set(Object.values(REGIAO))].map((r) => [r, assimetria(KP.filter((s) => REGIAO[s.uf] === r))]));
log('P4 assimetria');

// ---------- P3a: concentração ----------
// (a) parte da massa positiva do excesso nas seções do topo, observado × nulo
const massa = (vals) => {
  const pos = vals.filter((v) => v > 0).sort((a, b) => b - a); const tot = pos.reduce((a, b) => a + b, 0);
  const topo = (f) => r3(pos.slice(0, Math.ceil(vals.length * f)).reduce((a, b) => a + b, 0) / tot);
  return { massaPositiva: Math.round(tot), topo1pct: topo(0.01), topo5pct: topo(0.05) };
};
res.p3concentracao = { secoes: massa(P.map((s) => s.resAj)) };
{
  const rnd2 = aleatorio(7);
  res.p3concentracao.secoesNulo = massa(P.map((s) => sortearNulo(s, rnd2, sortearBinomial, sortearBeta) - s.a2 * s.p));
}
// (b) zonas e municípios: Δcomparecimento do grupo contra os outros grupos da UF (mediana/MAD), com o esperado pela abstenção do 1º turno
function porGrupo(chave, minSec) {
  const g = new Map();
  for (const s of P) { const k = chave(s); const a = g.get(k) ?? { uf: s.uf, k, secoes: 0, a2: 0, dc: 0, esp: 0, c1: 0, a1: 0 }; a.secoes++; a.a2 += s.a2; a.a1 += s.a1; a.c1 += s.c1; a.dc += s.dc; a.esp += s.esp2 - s.c1; g.set(k, a); }
  const lista = [...g.values()].filter((a) => a.secoes >= minSec);
  for (const a of lista) { a.dpp = (100 * a.dc) / a.a2; a.abst1 = 100 * (1 - a.c1 / a.a1); }
  const out = [];
  for (const uf of porUf) {
    const l = lista.filter((a) => a.uf === uf);
    if (l.length < 5) continue;
    // Δpp do grupo ~ abstenção do 1º turno (regressão simples na UF), resíduo robusto
    const mx = l.reduce((a, b) => a + b.abst1, 0) / l.length, my = l.reduce((a, b) => a + b.dpp, 0) / l.length;
    const bxy = l.reduce((a, b) => a + (b.abst1 - mx) * (b.dpp - my), 0) / l.reduce((a, b) => a + (b.abst1 - mx) ** 2, 0);
    for (const a of l) a.e = a.dpp - my - bxy * (a.abst1 - mx);
    const med = quantil(l.map((a) => a.e), 0.5); const mad = 1.4826 * quantil(l.map((a) => Math.abs(a.e - med)), 0.5);
    for (const a of l) { a.zr = (a.e - med) / mad; out.push(a); }
  }
  const zz = out.map((a) => a.zr);
  return { grupos: out.length, acima3: zz.filter((z) => z >= 3).length, abaixo3: zz.filter((z) => z <= -3).length,
    acima5: zz.filter((z) => z >= 5).length, abaixo5: zz.filter((z) => z <= -5).length, esperadoNormal3: r1(out.length * pNormal2(3) / 2),
    topo: out.sort((a, b) => b.zr - a.zr).slice(0, 15).map((a) => ({ grupo: a.k, secoes: a.secoes, dpp: r1(a.dpp), abst1: r1(a.abst1), zRobusto: r1(a.zr), dc: a.dc })),
    lista: out };
}
const gZ = porGrupo((s) => s.zon, 10);
const gM = porGrupo((s) => s.mun, 5);
await salvar(`dc-${fonte}-zonas.csv`, paraCsv(gZ.lista.map((a) => ({ zona: a.k, secoes: a.secoes, dpp: r3(a.dpp), abst1: r3(a.abst1), z: r3(a.zr), dc: a.dc })), ['zona', 'secoes', 'dpp', 'abst1', 'z', 'dc']));
delete gZ.lista; delete gM.lista;
res.p3concentracao.zonas = gZ; res.p3concentracao.municipios = gM;
// (c) local de votação dentro da zona: variância entre locais de z (seções que não mudaram de local) × permutação dentro da zona
{
  const L = P.filter((s) => s.local1 === s.local2 && s.local2 != null);
  const fRazao = (vals) => {
    const pz = new Map(), pl = new Map();
    L.forEach((s, i) => { const kz = s.zon, kl = `${s.zon}|${s.municipio}|${s.local2}`; const v = vals[i];
      const a = pz.get(kz) ?? { n: 0, s: 0 }; a.n++; a.s += v; pz.set(kz, a); const b = pl.get(kl) ?? { n: 0, s: 0, kz }; b.n++; b.s += v; pl.set(kl, b); });
    let entre = 0;
    for (const b of pl.values()) { const a = pz.get(b.kz); entre += b.n * (b.s / b.n - a.s / a.n) ** 2; }
    return entre;
  };
  const obs = fRazao(L.map((s) => s.z));
  const rnd3 = aleatorio(99); const perm = [];
  const porZona = new Map(); L.forEach((s, i) => { if (!porZona.has(s.zon)) porZona.set(s.zon, []); porZona.get(s.zon).push(i); });
  for (let rep = 0; rep < 20; rep++) {
    const v = new Float64Array(L.length);
    for (const idx of porZona.values()) { const zsh = idx.map((i) => L[i].z); for (let i = zsh.length - 1; i > 0; i--) { const j = Math.floor(rnd3() * (i + 1)); [zsh[i], zsh[j]] = [zsh[j], zsh[i]]; } idx.forEach((i, k) => { v[i] = zsh[k]; }); }
    perm.push(fRazao([...v]));
  }
  const m = perm.reduce((a, b) => a + b, 0) / perm.length, sd = Math.sqrt(perm.reduce((a, b) => a + (b - m) ** 2, 0) / (perm.length - 1));
  res.p3concentracao.locais = { secoes: L.length, somaQuadradosEntreLocais: Math.round(obs), permutacaoMedia: Math.round(m), permutacaoDp: Math.round(sd),
    razao: r3(obs / m), zPermutacao: r1((obs - m) / sd) };
  // locais com média de z alta ou baixa (z do local = soma dos z / √n), observado × uma permutação dentro da zona
  const extremos = (vals) => { const pl = new Map(); L.forEach((s, i) => { const k = `${s.zon}|${s.municipio}|${s.local2}`; const b = pl.get(k) ?? { n: 0, s: 0 }; b.n++; b.s += vals[i]; pl.set(k, b); });
    const zl = [...pl.values()].filter((b) => b.n >= 3).map((b) => b.s / Math.sqrt(b.n));
    return { locais: zl.length, acima4: zl.filter((z) => z >= 4).length, abaixo4: zl.filter((z) => z <= -4).length }; };
  const vperm = new Float64Array(L.length);
  for (const idx of porZona.values()) { const zsh = idx.map((i) => L[i].z); for (let i = zsh.length - 1; i > 0; i--) { const j = Math.floor(rnd3() * (i + 1)); [zsh[i], zsh[j]] = [zsh[j], zsh[i]]; } idx.forEach((i, k) => { vperm[i] = zsh[k]; }); }
  res.p3concentracao.locais.extremosObservados = extremos(L.map((s) => s.z));
  {
    // os locais de votação com maior z do local (soma dos z / √n, n ≥ 3), para a frente de biometria e a conferência no bruto
    const pl = new Map();
    for (const s of L) {
      const k = `${s.uf}|${s.municipio}|${s.zona}|${s.local2}`;
      const b = pl.get(k) ?? { local: k, secoes: 0, somaZ: 0, excesso: 0, dc: 0, d13: 0, d22: 0, c1: 0, f1: 0, v13_1: 0 };
      b.secoes++; b.somaZ += s.z; b.excesso += s.resAj; b.dc += s.dc; b.d13 += s.v13_2 - s.v13_1; b.d22 += s.v22_2 - s.v22_1; b.f1 += s.f1; b.v13_1 += s.v13_1;
      pl.set(k, b);
    }
    const lista = [...pl.values()].filter((b) => b.secoes >= 3).map((b) => ({ ...b, zLocal: b.somaZ / Math.sqrt(b.secoes) }));
    const fmtL = (b) => ({ local: b.local, secoes: b.secoes, zLocal: r1(b.zLocal), excesso: Math.round(b.excesso), dc: b.dc, d13: b.d13, d22: b.d22, parcela13_1t: r3(b.v13_1 / b.f1) });
    res.p3concentracao.locais.topoAcima = lista.sort((a, b) => b.zLocal - a.zLocal).slice(0, 20).map(fmtL);
    res.p3concentracao.locais.topoAbaixo = lista.sort((a, b) => a.zLocal - b.zLocal).slice(0, 10).map(fmtL);
    const acima4 = lista.filter((b) => b.zLocal >= 4);
    const t = (f) => acima4.reduce((a, b) => a + f(b), 0);
    res.p3concentracao.locais.acima4Resumo = { locais: acima4.length, secoes: t((b) => b.secoes), excesso: Math.round(t((b) => b.excesso)), dc: t((b) => b.dc),
      d13: t((b) => b.d13), d22: t((b) => b.d22), parcela13_1t: r3(t((b) => b.v13_1) / t((b) => b.f1)) };
  }
  res.p3concentracao.locais.extremosPermutacao = extremos([...vperm]);
}
// (d) modelo de urna: z médio por modelo do 2º turno, dentro da zona
{
  const modelos = [...new Set(P.map((s) => s.modelo2))].filter(Boolean).sort();
  const base = modelos.includes('2020') ? '2020' : modelos[0];
  const outros = modelos.filter((m) => m !== base);
  const aj = mqEfeitoFixo(P.filter((s) => s.modelo2), { y: (s) => s.z, x: (s) => outros.map((m) => Number(s.modelo2 === m)), grupo: (s) => s.zon, cluster: (s) => s.mun });
  const cont = Object.fromEntries(modelos.map((m) => [m, P.filter((s) => s.modelo2 === m).length]));
  res.p3concentracao.modeloUrna = { base, secoesPorModelo: cont, mediaZPorModelo: Object.fromEntries(modelos.map((m) => { const l = P.filter((s) => s.modelo2 === m); return [m, r3(l.reduce((a, s) => a + s.z, 0) / l.length)]; })),
    difDentroDaZona: aj ? Object.fromEntries(outros.map((m, i) => [m, { b: r3(aj.b[i]), ep: r3(aj.ep[i]), t: r1(aj.b[i] / aj.ep[i]) }])) : null,
    cauda4PorModelo: Object.fromEntries(modelos.map((m) => { const l = P.filter((s) => s.modelo2 === m); return [m, { acima: l.filter((s) => s.z >= 4).length, abaixo: l.filter((s) => s.z <= -4).length }]; })),
    trocaDeModelo: { secoes: P.filter((s) => s.modelo1 !== s.modelo2).length, mediaZ: r3((() => { const l = P.filter((s) => s.modelo1 !== s.modelo2); return l.reduce((a, s) => a + s.z, 0) / (l.length || 1); })()) } };
}
log('P3 concentração');

const arq = await salvar(`dc-${fonte}.json`, res);
log(`→ ${arq}`);
console.log(JSON.stringify({ filtro, p1: { totais: res.p1.totais, dpp: res.p1.dpp, z: res.p1.z, zSim: res.p1.zSimulado, caudas: res.p1.caudasObservadas, caudasSim: res.p1.caudasSimuladas, normal: res.p1.caudasNormal, modasDpp: res.p1.modasDpp, modasZ: res.p1.modasZ, calib: res.p1.calibracaoPorTamanho, qbh: res.p1.secoesQBH }, modelo: res.modelo, klimek: res.klimek }, null, 1));
