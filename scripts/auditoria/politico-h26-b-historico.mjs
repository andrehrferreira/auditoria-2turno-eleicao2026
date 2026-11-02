// H26, fechamento, parte (b): linha de base de 2018 e 2022 (docs/analysis/cientista-politico/06-h26-plano-final.md, seção 4).
//   Nível A (decide): município × zona em 2018, 2022 e 2026; candidatos do munzona; brancos, nulos, aptos e comparecimento
//     do detalhe_votacao_secao somados por município × zona. Mesmo esperado nos três anos (MQ por UF sem intercepto;
//     AC, AP, RO, RR e DF em grupo, como no doc 03).
//   Nível B (robustez): seção a seção, 2022 (votacao_secao_2022 + detalhe_2022) e 2026 (caminho do plano 01).
//   12 estatísticas (B1…B7b), bootstrap de 5.000 reamostragens por conglomerado (município principal da zona, dentro da
//   UF), intervalos de 1 − 0,05/12 = 99,58%. "Fora do padrão": o intervalo de 2026 não toca a união dos de 2018 e 2022.
// Só leitura. Uso: node --max-old-space-size=12288 scripts/auditoria/politico-h26-b-historico.mjs [--reps 5000]
// Saídas em data/parsed/auditoria/cientista-politico/: h26-b-historico.json, h26-b-zonas-nivelA.csv, caches h26-nivelA-<ano>.json
// e h26-nivelB-2022.json.
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { aleatorio, paraCsv, pearson } from './forense-lib.mjs';
import { SAIDA, DA, ANOS, GRUPOS_PEQUENOS, FAMILIA, DIRECAO, REGIAO, r2, r4, pp, log, nivelA, lerDetalhe, tabelaZip, chaveSec,
  prepararMotor, amostraReal, amostraBootstrap, estatisticas, quantis, secoes2026, ufsGovernador2t } from './politico-h26-lib.mjs';

const { values } = parseArgs({ options: { reps: { type: 'string', default: '5000' } } });
const REPS = Number(values.reps);
const ALFA = 0.05 / FAMILIA.length;
await mkdir(SAIDA, { recursive: true });
const R = { geradoEm: new Date().toISOString(), plano: 'docs/analysis/cientista-politico/06-h26-plano-final.md', reps: REPS, confianca: 1 - ALFA, nivelA: {}, nivelB: {}, conferencias: {} };

// ---------- Nível A ----------
function unidadesA(dados) {
  const { ano } = dados;
  const cfg = ANOS[ano];
  const out = [];
  let fechamento = 0;
  for (const u of dados.unidades) {
    const nom1 = Object.values(u.v1).reduce((a, b) => a + b, 0);
    const nom2 = Object.values(u.v2).reduce((a, b) => a + b, 0);
    if (!(nom1 > 0) || !(nom2 > 0)) continue;
    const demais = Object.entries(u.v1).filter(([nr]) => !cfg.preditores.includes(nr)).reduce((a, [, q]) => a + q, 0);
    const [a1, c1, , , br1, nu1, an1] = u.d1;
    const [a2, c2, , n2d, br2, nu2, an2] = u.d2;
    for (const [d] of [[u.d1], [u.d2]]) if (d[1] !== d[3] + d[4] + d[5] + d[6]) fechamento++;
    out.push({ uf: u.uf, zona: u.zona, mun: u.mun, nome: u.nome,
      X: [...cfg.preditores.map((nr) => u.v1[nr] ?? 0), demais, br1 + nu1, a1 - c1],
      y13: u.v2['13'] ?? 0, yR: u.v2[cfg.rival] ?? 0, ajusta: true, nom1, a13_1: u.v1['13'] ?? 0, aR_1: u.v1[cfg.rival] ?? 0, a1, c1, a2, c2 });
  }
  return { out, fechamento };
}
const grupoA = (ano) => (uf) => GRUPOS_PEQUENOS[ano][uf] ?? uf;

function rodarBootstrap(motor, opcoes, semente) {
  const rnd = aleatorio(semente);
  const amostras = Object.fromEntries(FAMILIA.map((f) => [f, []]));
  for (let r = 0; r < REPS; r++) {
    const e = estatisticas(motor, amostraBootstrap(motor, rnd), opcoes);
    for (const f of FAMILIA) amostras[f].push(e[f]);
    if ((r + 1) % 1000 === 0) log(`  bootstrap ${r + 1}/${REPS}`);
  }
  return Object.fromEntries(FAMILIA.map((f) => [f, quantis(amostras[f], [ALFA / 2, 1 - ALFA / 2])]));
}

const motoresA = {};
const zonasA = {};
for (const ano of [2018, 2022, 2026]) {
  const dados = await nivelA(ano);
  const { out, fechamento } = unidadesA(dados);
  const cfg = ANOS[ano];
  const opcoes = { sinal: cfg.ganhou === '13' ? 1 : -1, iSelf13: cfg.preditores.indexOf('13'), iSelfR: cfg.preditores.indexOf(cfg.rival) };
  const motor = prepararMotor(out, { grupo: grupoA(ano), k: cfg.preditores.length + 3 });
  motoresA[ano] = { motor, opcoes, unidades: out };
  const real = estatisticas(motor, amostraReal(motor), { ...opcoes, detalhar: true });
  const partido = estatisticas(motor, amostraReal(motor), { ...opcoes, sinal: 1 }); // lado do 13 em todos os anos (secundário)
  zonasA[ano] = new Map(real.itens.map((z) => [z.zona.chave, z]));
  const tot = (t, nr) => dados.total[t][nr] ?? 0;
  const nomT = (t) => Object.values(dados.total[t]).reduce((a, b) => a + b, 0);
  // decomposição 1º → 2º turno (plano 4.5): comparecimento, brancos+nulos, nominais
  const s = (campo, t) => dados.unidades.reduce((a, u) => a + u[`d${t}`][campo], 0);
  R.nivelA[ano] = {
    conferencia: { ...dados.conf, porUf: undefined, unidadesUsadas: out.length, zonas: motor.zonas.length, fechamentoComparecimentoFalha: fechamento,
      viradaDo13NoPais: r2(pp(tot(2, '13') - tot(2, cfg.rival), nomT(2)) - pp(tot(1, '13') - tot(1, cfg.rival), nomT(1))),
      ufsComNominaisDiferentes: Object.entries(dados.conf.porUf).filter(([, v]) => v.munzona !== v.detalhe).map(([k, v]) => ({ uf: k, ...v })) },
    pontual: Object.fromEntries(FAMILIA.map((f) => [f, r4(real.est[f])])),
    ladoDo13: Object.fromEntries(FAMILIA.map((f) => [f, r4(partido[f])])),
    B6bPerdeu: real.B6bPerdeu,
    viradaNacionalQuemCresceu: r2(opcoes.sinal * real.viradaNac),
    coeficientes: Object.fromEntries([...real.grupos].map(([g, v]) => [g, { self13: r4(v.b13?.[opcoes.iSelf13]), selfRival: r4(v.bR?.[opcoes.iSelfR]) }])),
    ufsComPesoProprioAcimaDe1: {
      quemCresceu: [...real.grupos].filter(([, v]) => (opcoes.sinal > 0 ? v.b13?.[opcoes.iSelf13] : v.bR?.[opcoes.iSelfR]) > 1).map(([g]) => g).sort(),
      outro: [...real.grupos].filter(([, v]) => (opcoes.sinal > 0 ? v.bR?.[opcoes.iSelfR] : v.b13?.[opcoes.iSelf13]) > 1).map(([g]) => g).sort(),
      grupos: real.grupos.size },
    decomposicao: {
      comparecimento: [s(1, 1), s(1, 2)], nominais: [s(3, 1), s(3, 2)], brancosNulos: [s(4, 1) + s(5, 1), s(4, 2) + s(5, 2)], anulados: [s(6, 1), s(6, 2)], aptos: [s(0, 1), s(0, 2)],
    },
  };
  const d = R.nivelA[ano].decomposicao;
  d.variacaoNominaisPct = r2(pp(d.nominais[1] - d.nominais[0], d.nominais[0]));
  d.variacaoComparecimentoPct = r2(pp(d.comparecimento[1] - d.comparecimento[0], d.comparecimento[0]));
  d.comparecimentoSobreAptos = [r2(pp(d.comparecimento[0], d.aptos[0])), r2(pp(d.comparecimento[1], d.aptos[1]))];
  d.brancosNulosSobreComparecimento = [r2(pp(d.brancosNulos[0], d.comparecimento[0])), r2(pp(d.brancosNulos[1], d.comparecimento[1]))];
  d.partesDaVariacaoDosNominais = { comparecimento: d.comparecimento[1] - d.comparecimento[0], quedaBrancosNulos: d.brancosNulos[0] - d.brancosNulos[1], quedaAnulados: d.anulados[0] - d.anulados[1] };
  log(`nível A ${ano}: ${out.length} unidades, ${motor.zonas.length} zonas; pontual ${JSON.stringify(R.nivelA[ano].pontual)}`);
  R.nivelA[ano].intervalo = rodarBootstrap(motor, opcoes, 260600 + ano);
  await writeFile(path.join(SAIDA, 'h26-b-historico.json'), JSON.stringify(R, null, 1));
}

// ---------- Nível B ----------
async function nivelB2022() {
  const cache = path.join(SAIDA, 'h26-nivelB-2022.json');
  if (existsSync(cache)) return JSON.parse(readFileSync(cache, 'utf8'));
  const det = await lerDetalhe(2022);
  log(`2022: detalhe por seção (${det.secoes.size})`);
  const vs = new Map();
  const conf = { linhas: 0, malformadas: 0, porMunzona: new Map() };
  for await (const [c, col, ok] of tabelaZip(path.join(DA, 'votacao_secao', 'votacao_secao_2022_BR.zip'), /votacao_secao_2022_BR\.csv$/i)) {
    conf.linhas++;
    if (!ok) { conf.malformadas++; continue; }
    if (c[col.CD_CARGO] !== '1') continue;
    const t = Number(c[col.NR_TURNO]);
    const uf = c[col.SG_UF].toLowerCase();
    const k = chaveSec(uf, c[col.CD_MUNICIPIO], c[col.NR_ZONA], c[col.NR_SECAO]);
    let s = vs.get(k);
    if (!s) { s = { local: c[col.NR_LOCAL_VOTACAO], v: [null, {}, {}] }; vs.set(k, s); }
    const nr = c[col.NR_VOTAVEL];
    s.v[t][nr] = (s.v[t][nr] ?? 0) + Number(c[col.QT_VOTOS]);
  }
  log(`2022: votacao_secao lido (${vs.size} seções)`);
  const secoes = [];
  let semDetalhe = 0, semPar = 0;
  const somaMunzona = {};
  for (const [k, s] of vs) {
    const d = det.secoes.get(k);
    for (const t of [1, 2]) for (const [nr, q] of Object.entries(s.v[t])) {
      if (nr === '95' || nr === '96') continue;
      const [uf, mun, zona] = k.split('|');
      const km = `${uf}|${mun}|${zona}|${t}|${nr}`;
      somaMunzona[km] = (somaMunzona[km] ?? 0) + q;
    }
    if (!d) { semDetalhe++; continue; }
    if (!d.t[1] || !d.t[2] || !Object.keys(s.v[1]).length || !Object.keys(s.v[2]).length) { semPar++; continue; }
    const [uf, mun, zona, secao] = k.split('|');
    secoes.push([uf, Number(mun), Number(zona), Number(secao), s.local, s.v[1], s.v[2], d.t[1], d.t[2]]);
  }
  const saida = { conf: { linhas: conf.linhas, malformadas: conf.malformadas, secoesVotacao: vs.size, secoesDetalhe: det.secoes.size, semDetalhe, semPar, pares: secoes.length, detalhe: det.conf }, somaMunzona, secoes };
  await writeFile(cache, JSON.stringify(saida));
  return saida;
}

{
  const b22 = await nivelB2022();
  // conferência: votacao_secao 2022 somado por município × zona × turno × candidato = munzona 2022
  const mz = await nivelA(2022);
  let iguais = 0, diferentes = 0, difAbs = 0;
  for (const u of mz.unidades) for (const t of [1, 2]) for (const [nr, q] of Object.entries(u[`v${t}`])) {
    const s = b22.somaMunzona[`${u.uf}|${u.mun}|${u.zona}|${t}|${nr}`] ?? 0;
    if (s === q) iguais++; else { diferentes++; difAbs += Math.abs(s - q); }
  }
  R.conferencias.votacaoSecao2022xMunzona = { celulasIguais: iguais, celulasDiferentes: diferentes, diferencaAbsoluta: difAbs };
  const cfg = ANOS[2022];
  const pred = ['13', '22', '15', '12'];
  const out = [];
  for (const [uf, mun, zona, , , v1, v2, d1, d2] of b22.secoes) {
    const bn = (v) => (v['95'] ?? 0) + (v['96'] ?? 0);
    const nom = (v) => Object.entries(v).filter(([nr]) => nr !== '95' && nr !== '96').reduce((a, [, q]) => a + q, 0);
    const demais = Object.entries(v1).filter(([nr]) => nr !== '95' && nr !== '96' && !pred.includes(nr)).reduce((a, [, q]) => a + q, 0);
    const [a1, c1] = d1, [a2, c2] = d2;
    out.push({ uf, zona, mun, X: [...pred.map((nr) => v1[nr] ?? 0), demais, bn(v1), a1 - c1], y13: v2['13'] ?? 0, yR: v2['22'] ?? 0,
      ajusta: c1 >= 10 && a2 >= 20 && Math.abs(a2 - a1) <= 10, nom1: nom(v1), a13_1: v1['13'] ?? 0, aR_1: v1['22'] ?? 0, a1, c1, a2, c2 });
  }
  const motor = prepararMotor(out, { grupo: (uf) => uf, k: 7 });
  const opcoes = { sinal: -1, iSelf13: 0, iSelfR: 1 };
  const real = estatisticas(motor, amostraReal(motor), opcoes);
  R.nivelB[2022] = { conferencia: b22.conf, secoes: out.length, zonas: motor.zonas.length, pontual: Object.fromEntries(FAMILIA.map((f) => [f, r4(real[f])])) };
  log(`nível B 2022: ${out.length} seções; ${JSON.stringify(R.nivelB[2022].pontual)}`);
  R.nivelB[2022].intervalo = rodarBootstrap(motor, opcoes, 2606022);
  await writeFile(path.join(SAIDA, 'h26-b-historico.json'), JSON.stringify(R, null, 1));
}
{
  const { P, conf } = await secoes2026();
  const out = P.map((s) => ({ uf: s.uf, zona: Number(s.zona), mun: Number(s.municipio), X: [s.v13_1, s.v22_1, s.e14, s.e30, s.e55, s.e70, s.dem, s.bn1, s.a1 - s.c1],
    y13: s.v13_2, yR: s.v22_2, ajusta: s.c1 >= 10 && s.a2 >= 20 && Math.abs(s.a2 - s.a1) <= 10, nom1: s.v13_1 + s.v22_1 + s.out1, a13_1: s.v13_1, aR_1: s.v22_1, a1: s.a1, c1: s.c1, a2: s.a2, c2: s.c2 }));
  const motor = prepararMotor(out, { grupo: (uf) => uf, k: 9 });
  const opcoes = { sinal: 1, iSelf13: 0, iSelfR: 1 };
  const real = estatisticas(motor, amostraReal(motor), { ...opcoes, detalhar: true });
  // conferência: reproduz o plano 01 (0 zonas para o 13; MA 0032, SP 0002, CE 0020, BA 0105 para o 22)
  const zonasCsv = readFileSync(path.join(SAIDA, '..', 'virada-zonas', 'zonas.csv'), 'utf8').trim().split('\n');
  const cab = zonasCsv[0].split(';');
  const z01 = new Map(zonasCsv.slice(1).map((l) => { const c = l.split(';'); const o = Object.fromEntries(cab.map((n, i) => [n, c[i]])); return [`${o.uf}|${Number(o.zona)}`, o]; }));
  let maxDifZ = 0;
  for (const it of real.itens) { const o = z01.get(it.zona.chave); if (o && Number.isFinite(it.z)) maxDifZ = Math.max(maxDifZ, Math.abs(Number(o.z) - it.z)); }
  const fora = real.itens.filter((z) => Number.isFinite(z.q) && z.q < 0.01 && Math.abs(z.alem) >= 2);
  R.conferencias.nivelB2026ReproduzPlano01 = { banco: conf.fonte, secoes: out.length, oficial: conf.oficial, fora13: fora.filter((z) => z.alem > 0).map((z) => z.zona.chave),
    fora22: fora.filter((z) => z.alem < 0).map((z) => z.zona.chave), maiorDiferencaZ: r4(maxDifZ) };
  R.nivelB[2026] = { secoes: out.length, zonas: motor.zonas.length, pontual: Object.fromEntries(FAMILIA.map((f) => [f, r4(real.est[f])])) };
  log(`nível B 2026: ${JSON.stringify(R.nivelB[2026].pontual)}; conferência ${JSON.stringify(R.conferencias.nivelB2026ReproduzPlano01)}`);
  R.nivelB[2026].intervalo = rodarBootstrap(motor, opcoes, 2606026);
}

// ---------- Decisão (plano 4.3) ----------
const toca = (a, b) => a[0] <= b[1] && b[0] <= a[1];
R.decisao = {};
for (const f of FAMILIA) {
  const I = Object.fromEntries([2018, 2022, 2026].map((a) => [a, R.nivelA[a].intervalo[f]]));
  const P = Object.fromEntries([2018, 2022, 2026].map((a) => [a, R.nivelA[a].pontual[f]]));
  const fora = !toca(I[2026], I[2018]) && !toca(I[2026], I[2022]);
  let lado = 'dentro';
  if (fora) lado = I[2026][0] > Math.max(I[2018][1], I[2022][1]) ? 'acima' : I[2026][1] < Math.min(I[2018][0], I[2022][0]) ? 'abaixo' : 'entre';
  const naDirecao = (DIRECAO[f] > 0 && lado === 'acima') || (DIRECAO[f] < 0 && lado === 'abaixo');
  const b22 = R.nivelB[2022].pontual[f], b26 = R.nivelB[2026].pontual[f];
  const bContradiz = naDirecao && Number.isFinite(b22) && Number.isFinite(b26) && (DIRECAO[f] > 0 ? b26 < b22 : b26 > b22);
  // B2p, B3p e B4p medem o lado de quem perdeu: fora na direção da tabela favorece o 22 em 2026 (Fato à parte, plano 4.3)
  const doOutroLado = ['B2p', 'B3p', 'B4p'].includes(f);
  R.decisao[f] = { pontual: P, intervalo: Object.fromEntries(Object.entries(I).map(([a, v]) => [a, v.map(r4)])), fora, lado,
    sinalAFavorDeQuemCresceu: naDirecao && !bContradiz && !doOutroLado, foraAFavorDoOutroLado: naDirecao && !bContradiz && doOutroLado, nivelB: { 2022: b22, 2026: b26, intervalo2022: R.nivelB[2022].intervalo[f].map(r4), intervalo2026: R.nivelB[2026].intervalo[f].map(r4) }, nivelBContradiz: bContradiz };
}
R.parteB = Object.values(R.decisao).some((d) => d.sinalAFavorDeQuemCresceu) ? 'S' : 'L';

// ---------- Leitura política (plano 4.5) ----------
R.leitura = { governador2t: {}, porGrupoGovernador: {}, correlacaoZ: {} };
for (const ano of [2018, 2022, 2026]) {
  const ufs = await ufsGovernador2t(ano);
  R.leitura.governador2t[ano] = ufs;
  const itens = [...zonasA[ano].values()];
  const s = motoresA[ano].opcoes.sinal;
  for (const [g, f] of [['com', (z) => ufs.includes(z.uf)], ['sem', (z) => !ufs.includes(z.uf)]]) {
    const l = itens.filter(f);
    const porUf = new Map();
    for (const z of l) (porUf.get(z.uf) ?? porUf.set(z.uf, []).get(z.uf)).push(z);
    let sxy = 0, sxx = 0;
    for (const lu of porUf.values()) {
      const w = lu.reduce((a, z) => a + z.nom2, 0);
      const mx = lu.reduce((a, z) => a + z.nom2 * z.dComp, 0) / w, my = lu.reduce((a, z) => a + z.nom2 * s * z.alem, 0) / w;
      for (const z of lu) { sxy += z.nom2 * (z.dComp - mx) * (s * z.alem - my); sxx += z.nom2 * (z.dComp - mx) ** 2; }
    }
    const vir = l.map((z) => s * z.virada).filter(Number.isFinite);
    R.leitura.porGrupoGovernador[`${ano}|${g}`] = { zonas: l.length, B5: r4(sxy / sxx), B7a: r2((100 * vir.filter((v) => v > 0).length) / vir.length) };
  }
}
for (const [a, b] of [[2026, 2018], [2026, 2022], [2022, 2018]]) {
  const p = [...zonasA[a]].map(([k, z]) => [z.z, zonasA[b].get(k)?.z]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  R.leitura.correlacaoZ[`${a}x${b}`] = { zonas: p.length, r: r4(pearson(p.map((x) => x[0]), p.map((x) => x[1]))) };
}
// zonas do nível A nos três anos (z orientado ao 13 e ao lado de quem cresceu)
const linhas = [...zonasA[2026]].map(([k, z]) => {
  const l = { zona: k, z2026: r2(z.z), alem2026: r2(z.alem) };
  for (const a of [2018, 2022]) { const o = zonasA[a].get(k); l[`z${a}`] = r2(o?.z); l[`alem${a}`] = r2(o?.alem); }
  return l;
});
await writeFile(path.join(SAIDA, 'h26-b-zonas-nivelA.csv'), paraCsv(linhas, Object.keys(linhas[0])));
await writeFile(path.join(SAIDA, 'h26-b-historico.json'), JSON.stringify(R, null, 1));
log('fim');
console.log(JSON.stringify({ parteB: R.parteB, decisao: R.decisao, conferencias: R.conferencias, leitura: R.leitura,
  nivelA: Object.fromEntries(Object.entries(R.nivelA).map(([a, v]) => [a, { conferencia: v.conferencia, viradaNacional: v.viradaNacionalQuemCresceu, ladoDo13: v.ladoDo13, ufsPeso1: v.ufsComPesoProprioAcimaDe1, decomposicao: v.decomposicao, B6bPerdeu: v.B6bPerdeu }])) }, null, 1));
