// Forense estatística, teste 2: impressão digital comparecimento × votação (Klimek, Yegorov, Hanel e Thurner, PNAS 2012).
// Uso: node scripts/auditoria/forense-klimek.mjs [turno]
// Saída: forense/klimek-<t>t.json, forense/klimek-<t>t-matriz-<c>.csv (histograma 2D) e forense/klimek-<t>t-<c>.svg.
//
// Enchimento de urna deixa duas marcas: (1) aglomerado de seções com comparecimento ≈ 100% e votação ≈ 100% para
// um candidato; (2) correlação positiva forte, DENTRO da mesma zona, entre comparecimento e parcela do beneficiado.
// Nulo para (1) e (2): permutar o comparecimento entre as seções da mesma zona (mantém o perfil de cada zona e
// desfaz só a ligação seção a seção). Controles para (2): idade (60+), escolaridade baixa e superior do eleitorado.


import { aleatorio, carregarSecoes, fmt, mediana, mqo, paraCsv, pearson, quantil, salvar } from './forense-lib.mjs';

const turno = Number(process.argv[2] ?? 2);
const BINS = 50;
const PERMUTACOES = 20;
const MIN_ZONA = 20;

const todas = await carregarSecoes(turno);
const secoes = todas.filter((s) => s.aptos > 0 && s.validos > 0);
const parcela = (s, c) => s[`v${c}`] / s.validos;
const rnd = aleatorio(2026);

const zonas = new Map();
for (const s of secoes) {
  const k = `${s.uf}/${s.zona}`;
  if (!zonas.has(k)) zonas.set(k, []);
  zonas.get(k).push(s);
}

function histograma(c) {
  const h = Array.from({ length: BINS }, () => new Array(BINS).fill(0));
  for (const s of secoes) {
    const i = Math.min(BINS - 1, Math.floor(parcela(s, c) * BINS));
    const j = Math.min(BINS - 1, Math.floor(s.comp * BINS));
    h[i][j]++;
  }
  return h;
}

/** Contagem no canto (comparecimento ≥ t e parcela ≥ v), observada e sob permutação dentro da zona. */
function canto(c, t, v) {
  const obs = secoes.filter((s) => s.comp >= t && parcela(s, c) >= v).length;
  const perm = [];
  for (let r = 0; r < PERMUTACOES; r++) {
    let n = 0;
    for (const g of zonas.values()) {
      const comps = g.map((s) => s.comp);
      for (let i = comps.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [comps[i], comps[j]] = [comps[j], comps[i]];
      }
      g.forEach((s, i) => { if (comps[i] >= t && parcela(s, c) >= v) n++; });
    }
    perm.push(n);
  }
  const m = perm.reduce((a, b) => a + b, 0) / perm.length;
  const dp = Math.sqrt(perm.reduce((a, b) => a + (b - m) ** 2, 0) / (perm.length - 1));
  return { observado: obs, esperadoPermutacao: +m.toFixed(1), dpPermutacao: +dp.toFixed(1), z: dp > 0 ? +((obs - m) / dp).toFixed(1) : null };
}

/** Correlação dentro da zona: por zona (≥ MIN_ZONA seções) e agregada (variáveis centradas na média da zona). */
function correlacaoZona(c, filtro = () => true) {
  const porZona = [];
  const dx = [], dy = [], ctrl = [];
  for (const g0 of zonas.values()) {
    const g = g0.filter(filtro);
    if (g.length < 3) continue;
    const xs = g.map((s) => s.comp), ys = g.map((s) => parcela(s, c));
    if (g.length >= MIN_ZONA) porZona.push(pearson(xs, ys));
    const mx = xs.reduce((a, b) => a + b, 0) / g.length, my = ys.reduce((a, b) => a + b, 0) / g.length;
    const com = g.every((s) => s.p60 != null);
    const mc = com ? ['p60', 'pBaixa', 'pSup'].map((k) => g.reduce((a, s) => a + s[k], 0) / g.length) : null;
    g.forEach((s, i) => {
      dx.push(xs[i] - mx); dy.push(ys[i] - my);
      ctrl.push(com ? [s.p60 - mc[0], s.pBaixa - mc[1], s.pSup - mc[2]] : null);
    });
  }
  const rs = porZona.filter((r) => !Number.isNaN(r));
  // Correlação parcial: tira dos dois lados o efeito linear dos controles (só seções com perfil).
  const idx = ctrl.map((c0, i) => (c0 ? i : -1)).filter((i) => i >= 0);
  let parcial = null, coefComp = null;
  if (idx.length > 100) {
    const X = idx.map((i) => ctrl[i]);
    const bx = mqo(X, idx.map((i) => dx[i]));
    const by = mqo(X, idx.map((i) => dy[i]));
    const rx = idx.map((i, k) => dx[i] - X[k].reduce((a, v, j) => a + v * bx[j], 0));
    const ry = idx.map((i, k) => dy[i] - X[k].reduce((a, v, j) => a + v * by[j], 0));
    parcial = pearson(rx, ry);
    coefComp = mqo(X.map((x, k) => [rx[k], ...x]), idx.map((i) => dy[i]))[0];
  }
  return {
    zonas: rs.length,
    medianaPorZona: +mediana(rs).toFixed(3), p10: +quantil(rs, 0.1).toFixed(3), p90: +quantil(rs, 0.9).toFixed(3),
    zonasRmaior05: rs.filter((r) => r > 0.5).length, zonasRmenorM05: rs.filter((r) => r < -0.5).length,
    rDentroZona: +pearson(dx, dy).toFixed(3),
    rParcialControles: parcial == null ? null : +parcial.toFixed(3),
    inclinacaoParcial: coefComp == null ? null : +coefComp.toFixed(3),
    secoesComPerfil: idx.length,
  };
}

/** Distribuição nula de r por zona sob permutação (para comparar a fração de zonas com |r| > 0,5). */
function nuloPorZona(c) {
  let mais = 0, menos = 0, total = 0;
  for (let r = 0; r < 5; r++) {
    for (const g of zonas.values()) {
      if (g.length < MIN_ZONA) continue;
      const xs = g.map((s) => s.comp);
      for (let i = xs.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [xs[i], xs[j]] = [xs[j], xs[i]]; }
      const v = pearson(xs, g.map((s) => parcela(s, c)));
      if (Number.isNaN(v)) continue;
      total++; if (v > 0.5) mais++; if (v < -0.5) menos++;
    }
  }
  return { fracaoRmaior05: +(mais / total).toFixed(4), fracaoRmenorM05: +(menos / total).toFixed(4) };
}

function svg(h, c, titulo) {
  const L = 560, M = { e: 70, d: 110, t: 50, b: 60 };
  const cel = L / BINS;
  const max = h.flat().reduce((a, b) => Math.max(a, b), 0);
  const cor = (v) => {
    if (!v) return '#ffffff';
    const t = Math.log1p(v) / Math.log1p(max);
    // sequencial de um tom (azul): claro → escuro
    const a = [222, 235, 247], b = [8, 48, 107];
    return `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * t)).join(',')})`;
  };
  const r = [];
  r.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${L + M.e + M.d}" height="${L + M.t + M.b}" font-family="sans-serif" font-size="12">`);
  r.push(`<rect width="100%" height="100%" fill="#fff"/>`);
  r.push(`<text x="${M.e}" y="22" font-size="14" font-weight="bold">${titulo}</text>`);
  r.push(`<text x="${M.e}" y="40" fill="#555">Cada célula: seções (escala log). ${secoes.length.toLocaleString('pt-BR')} seções.</text>`);
  for (let i = 0; i < BINS; i++) for (let j = 0; j < BINS; j++) {
    if (!h[i][j]) continue;
    r.push(`<rect x="${(M.e + j * cel).toFixed(1)}" y="${(M.t + (BINS - 1 - i) * cel).toFixed(1)}" width="${cel.toFixed(2)}" height="${cel.toFixed(2)}" fill="${cor(h[i][j])}"><title>comp ${j * 2}-${j * 2 + 2}%, parcela ${i * 2}-${i * 2 + 2}%: ${h[i][j]}</title></rect>`);
  }
  r.push(`<rect x="${M.e}" y="${M.t}" width="${L}" height="${L}" fill="none" stroke="#999"/>`);
  for (let p = 0; p <= 100; p += 20) {
    const x = M.e + (p / 100) * L, y = M.t + L - (p / 100) * L;
    r.push(`<text x="${x}" y="${M.t + L + 16}" text-anchor="middle">${p}%</text>`);
    r.push(`<text x="${M.e - 6}" y="${y + 4}" text-anchor="end">${p}%</text>`);
  }
  r.push(`<text x="${M.e + L / 2}" y="${M.t + L + 40}" text-anchor="middle">Comparecimento (comparecimento / aptos)</text>`);
  r.push(`<text transform="translate(18 ${M.t + L / 2}) rotate(-90)" text-anchor="middle">Parcela do ${c} nos votos válidos</text>`);
  r.push(`<rect x="${M.e + L - 0.1 * L}" y="${M.t}" width="${0.1 * L}" height="${0.1 * L}" fill="none" stroke="#c00" stroke-dasharray="4 3"/>`);
  r.push(`<text x="${M.e + L + 8}" y="${M.t + 12}" fill="#c00">canto de</text><text x="${M.e + L + 8}" y="${M.t + 26}" fill="#c00">enchimento</text><text x="${M.e + L + 8}" y="${M.t + 40}" fill="#c00">(≥ 90%, ≥ 90%)</text>`);
  for (let k = 0; k <= 4; k++) {
    const v = Math.round(Math.expm1((k / 4) * Math.log1p(max)));
    const y = M.t + 80 + k * 22;
    r.push(`<rect x="${M.e + L + 10}" y="${y}" width="16" height="16" fill="${cor(Math.max(v, 1))}" stroke="#ccc"/><text x="${M.e + L + 32}" y="${y + 12}">${v.toLocaleString('pt-BR')}</text>`);
  }
  r.push('</svg>');
  return r.join('\n');
}

const candidatos = [13, 22];
const res = { turno, secoes: secoes.length, semAptos: todas.length - secoes.length, comparecimento: {}, candidatos: {} };
const comps = secoes.map((s) => s.comp);
res.comparecimento = {
  mediana: +mediana(comps).toFixed(3), p01: +quantil(comps, 0.01).toFixed(3), p99: +quantil(comps, 0.99).toFixed(3),
  ge95: comps.filter((x) => x >= 0.95).length, ge100: comps.filter((x) => x >= 1).length, acima100: comps.filter((x) => x > 1).length,
};

for (const c of candidatos) {
  const h = histograma(c);
  const csv = [['parcela\\comparecimento', ...Array.from({ length: BINS }, (_, j) => `${j * 2}-${j * 2 + 2}`)].join(';'),
    ...h.map((linha, i) => [`${i * 2}-${i * 2 + 2}`, ...linha].join(';')).reverse()].join('\n') + '\n';
  await salvar(`klimek-${turno}t-matriz-${c}.csv`, csv);
  await salvar(`klimek-${turno}t-${c}.svg`, svg(h, c, `Comparecimento × parcela do ${c}, presidente, ${turno}º turno (por seção)`));
  const porUf = {};
  for (const uf of [...new Set(secoes.map((s) => s.uf))].sort()) porUf[uf] = correlacaoZona(c, (s) => s.uf === uf);
  res.candidatos[c] = {
    canto95: canto(c, 0.95, 0.95), canto90: canto(c, 0.9, 0.9), canto100: canto(c, 1, 0.95),
    correlacao: correlacaoZona(c), nuloPorZona: nuloPorZona(c),
    correlacaoSoComuns: correlacaoZona(c, (s) => s.categoria === 'comum' && s.agregadas === 0),
    porUf,
  };
}

// Seções no canto (comparecimento ≥ 90% e parcela ≥ 90% de um finalista), com categoria e perfil, para conferência.
const noCanto = [];
for (const s of secoes) {
  for (const c of candidatos) {
    if (s.comp >= 0.9 && parcela(s, c) >= 0.9) {
      noCanto.push({ uf: s.uf, municipio: s.municipio, nome_municipio: s.nome_municipio, zona: s.zona, secao: s.secao,
        categoria: s.categoria, nome_local: s.nome_local ?? '', candidato: c, aptos: s.aptos, comparecimento: s.comparecimento,
        pct_comparecimento: +(100 * s.comp).toFixed(1), votos: s[`v${c}`], validos: s.validos, pct: +(100 * parcela(s, c)).toFixed(1),
        p60: s.p60 == null ? '' : +s.p60.toFixed(3), indigena: s.pInd == null ? '' : +s.pInd.toFixed(3) });
    }
  }
}
noCanto.sort((a, b) => b.pct_comparecimento + b.pct - a.pct_comparecimento - a.pct);
await salvar(`klimek-${turno}t-canto.csv`, paraCsv(noCanto, Object.keys(noCanto[0] ?? { uf: 0 })));
for (const c of candidatos) {
  const porCat = {};
  for (const l of noCanto.filter((l) => l.candidato === c)) {
    porCat[l.categoria] ??= { ge90: 0, ge95: 0 };
    porCat[l.categoria].ge90++;
    if (l.pct_comparecimento >= 95 && l.pct >= 95) porCat[l.categoria].ge95++;
  }
  res.candidatos[c].cantoPorCategoria = porCat;
}
await salvar(`klimek-${turno}t.json`, res);

console.log(`Klimek, ${turno}º turno: ${secoes.length} seções · comparecimento mediano ${fmt(100 * res.comparecimento.mediana, 1)}%`);
console.log('  comparecimento:', JSON.stringify(res.comparecimento));
for (const c of candidatos) {
  const r = res.candidatos[c];
  console.log(`\n${c}: canto (≥95%, ≥95%) ${JSON.stringify(r.canto95)}`);
  console.log(`    canto (≥90%, ≥90%) ${JSON.stringify(r.canto90)}`);
  console.log(`    canto (≥100%, ≥95%) ${JSON.stringify(r.canto100)}`);
  console.log(`    correlação dentro da zona: ${JSON.stringify(r.correlacao)}`);
  console.log(`    nulo por zona (permutação): ${JSON.stringify(r.nuloPorZona)}`);
  console.log(`    só seções comuns sem agregada: ${JSON.stringify(r.correlacaoSoComuns)}`);
  console.log('    por UF (r dentro da zona | parcial com controles):');
  console.log('     ', Object.entries(r.porUf).map(([uf, x]) => `${uf} ${x.rDentroZona}|${x.rParcialControles}`).join('  '));
}
