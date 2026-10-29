// Forense estatística, teste 4: seções fora do padrão da própria zona (z-score robusto).
// Uso: node scripts/auditoria/forense-zscore.mjs [turno]   → forense/zscore-<t>t.json e forense/zscore-<t>t-cauda.csv
//
// Para cada seção: z = (valor − mediana da zona) / (1,4826 × MAD da zona), zona = (UF, zona eleitoral) com ≥ 10 seções.
// Variáveis: parcela do 13 e do 22 nos votos válidos, e comparecimento (comparecimento / aptos).
// Controle: z do RESÍDUO depois de tirar o efeito linear do perfil do eleitorado da seção (60+, escolaridade baixa,
// superior, indígena, quilombola), todos centrados na zona. Cauda extrema: |z| ≥ 5.
import { carregarSecoes, faixaTamanho, medianaMad, mqo, paraCsv, salvar } from './forense-lib.mjs';

const turno = Number(process.argv[2] ?? 2);
const LIMITE = 5;
const MIN_ZONA = 10;
const CONTROLES = ['p60', 'pBaixa', 'pSup', 'pInd', 'pQuil'];

const secoes = (await carregarSecoes(turno)).filter((s) => s.validos > 0 && s.aptos > 0);
const variaveis = {
  parcela13: (s) => s.v13 / s.validos,
  parcela22: (s) => s.v22 / s.validos,
  comparecimento: (s) => s.comp,
};

const zonas = new Map();
for (const s of secoes) {
  const k = `${s.uf}/${s.zona}`;
  if (!zonas.has(k)) zonas.set(k, []);
  zonas.get(k).push(s);
}
const grandes = [...zonas.values()].filter((g) => g.length >= MIN_ZONA);

function zRobusto(nome, valor) {
  let semMad = 0;
  for (const g of grandes) {
    const vs = g.map(valor);
    const { mediana, mad } = medianaMad(vs);
    g.forEach((s, i) => { s[`z_${nome}`] = mad > 0 ? (vs[i] - mediana) / mad : null; });
    if (!(mad > 0)) semMad++;
  }
  return semMad;
}

// Resíduo depois dos controles (regressão única, variáveis centradas na média da zona).
function residuo(nome, valor) {
  const linhas = [], y = [], quem = [];
  for (const g of grandes) {
    const com = g.filter((s) => CONTROLES.every((c) => s[c] != null));
    if (com.length < MIN_ZONA) continue;
    const mC = CONTROLES.map((c) => com.reduce((a, s) => a + s[c], 0) / com.length);
    const mY = com.reduce((a, s) => a + valor(s), 0) / com.length;
    for (const s of com) {
      linhas.push(CONTROLES.map((c, j) => s[c] - mC[j]));
      y.push(valor(s) - mY);
      quem.push(s);
    }
  }
  const b = mqo(linhas, y);
  quem.forEach((s, i) => { s[`r_${nome}`] = y[i] - linhas[i].reduce((a, v, j) => a + v * b[j], 0); });
  zRobusto(`ctrl_${nome}`, (s) => s[`r_${nome}`] ?? NaN);
  for (const g of grandes) for (const s of g) if (s[`r_${nome}`] == null) s[`z_ctrl_${nome}`] = null;
  return Object.fromEntries(CONTROLES.map((c, j) => [c, +b[j].toFixed(4)]));
}

const res = { turno, secoes: secoes.length, zonas: grandes.length, secoesEmZonasGrandes: grandes.reduce((a, g) => a + g.length, 0), variaveis: {} };
for (const [nome, valor] of Object.entries(variaveis)) {
  const semMad = zRobusto(nome, valor);
  const coef = residuo(nome, valor);
  const todos = grandes.flat();
  const cont = (campo, f) => todos.filter((s) => s[campo] != null && f(s[campo])).length;
  const porCat = {}, porTam = {}, porUf = {};
  for (const s of todos) {
    if (s[`z_${nome}`] == null || Math.abs(s[`z_${nome}`]) < LIMITE) continue;
    const lado = s[`z_${nome}`] > 0 ? 'alto' : 'baixo';
    (porCat[s.categoria] ??= { alto: 0, baixo: 0 })[lado]++;
    (porTam[faixaTamanho(s.validos)] ??= { alto: 0, baixo: 0 })[lado]++;
    (porUf[s.uf] ??= { alto: 0, baixo: 0 })[lado]++;
  }
  res.variaveis[nome] = {
    zonasSemMad: semMad, coeficientesControle: coef,
    bruto: { alto: cont(`z_${nome}`, (z) => z >= LIMITE), baixo: cont(`z_${nome}`, (z) => z <= -LIMITE) },
    comControles: { alto: cont(`z_ctrl_${nome}`, (z) => z >= LIMITE), baixo: cont(`z_ctrl_${nome}`, (z) => z <= -LIMITE) },
    // Referência: na normal, |z| ≥ 5 tem probabilidade 5,7e-7 (≈ 0,3 seção em 500 mil). Dados reais têm caudas grossas.
    esperadoNormal: +(todos.length * 5.73e-7).toFixed(2),
    porCategoria: porCat, porTamanho: porTam, porUf,
  };
}

const cauda = grandes.flat().filter((s) => Object.keys(variaveis).some((n) => Math.abs(s[`z_${n}`] ?? 0) >= LIMITE));
const r2 = (x) => (x == null ? '' : +x.toFixed(2));
const r3 = (x) => (x == null ? '' : +x.toFixed(3));
const linhas = cauda.map((s) => ({
  uf: s.uf, municipio: s.municipio, nome_municipio: s.nome_municipio, zona: s.zona, secao: s.secao, categoria: s.categoria,
  nome_local: s.nome_local ?? '', tipo_urna: s.tipo_urna, agregadas: s.agregadas, aptos: s.aptos, comparecimento: s.comparecimento,
  validos: s.validos, v13: s.v13, v22: s.v22, pct13: +(100 * s.v13 / s.validos).toFixed(1), pct22: +(100 * s.v22 / s.validos).toFixed(1),
  pct_comp: +(100 * s.comp).toFixed(1),
  z_parcela13: r2(s.z_parcela13), z_ctrl_parcela13: r2(s.z_ctrl_parcela13), z_parcela22: r2(s.z_parcela22), z_ctrl_parcela22: r2(s.z_ctrl_parcela22),
  z_comparecimento: r2(s.z_comparecimento), z_ctrl_comparecimento: r2(s.z_ctrl_comparecimento),
  p60: r3(s.p60), escol_baixa: r3(s.pBaixa), superior: r3(s.pSup), indigena: r3(s.pInd), quilombola: r3(s.pQuil),
}));
linhas.sort((a, b) => Math.max(Math.abs(b.z_parcela13 || 0), Math.abs(b.z_comparecimento || 0)) - Math.max(Math.abs(a.z_parcela13 || 0), Math.abs(a.z_comparecimento || 0)));
await salvar(`zscore-${turno}t.json`, res);
await salvar(`zscore-${turno}t-cauda.csv`, paraCsv(linhas, Object.keys(linhas[0] ?? { uf: 0 })));

console.log(`z robusto, ${turno}º turno: ${res.secoesEmZonasGrandes} seções em ${res.zonas} zonas com ≥ ${MIN_ZONA} seções`);
for (const [nome, v] of Object.entries(res.variaveis)) {
  console.log(`\n${nome}: |z| ≥ ${LIMITE} bruto ${JSON.stringify(v.bruto)} · com controles ${JSON.stringify(v.comControles)} · normal esperaria ${v.esperadoNormal}`);
  console.log(`  coeficientes: ${JSON.stringify(v.coeficientesControle)} · zonas sem MAD: ${v.zonasSemMad}`);
  console.log(`  por categoria: ${JSON.stringify(v.porCategoria)}`);
  console.log(`  por tamanho: ${JSON.stringify(v.porTamanho)}`);
}
console.log(`\nCauda (qualquer variável): ${linhas.length} seções → zscore-${turno}t-cauda.csv`);
