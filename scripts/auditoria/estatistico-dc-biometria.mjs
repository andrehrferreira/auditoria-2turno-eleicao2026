// Estatístico eleitoral: quem é o eleitor a mais do 2º turno (pergunta 2) e concentração por mesário e urna (pergunta 3).
// Usa a cópia de leitura do banco (pares-banco.csv, de estatistico-pares.mjs): só as UFs com o 1º turno carregado.
//
// Uso: node --max-old-space-size=8192 scripts/auditoria/estatistico-dc-biometria.mjs
// Saída: data/parsed/auditoria/estatistico-eleitoral/biometria.json
//
// 1. Conferência: o 1º turno do banco (BU) é igual ao dos dados abertos (detalhe + votacao_secao), seção a seção?
// 2. Composição do acréscimo por faixa de excesso (z): Δ sem biometria cadastrada, Δ por biometria, Δ liberado por ano de nascimento.
// 3. Parte do excesso (resíduo do modelo) e do aumento esperado que entra em cada categoria (efeito fixo de zona).
// 4. Teste E2 do cientista político, por UF, com efeito fixo de zona e EP agrupado por município; BH nos 2 × UFs testes.
// 5. Mesários e urna: excesso × mesa trocada, presidente trocado, mesário em mais de uma seção, Δ liberações manuais, urna trocada.
import { paraCsv, quantil } from './forense-lib.mjs';
import { bh, carregarIdade, diferenca, filtrar, lerPares, modelar, mqEfeitoFixo, pNormal2, prepararBiometria, salvar, testeE2 } from './estatistico-lib.mjs';

const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const r3 = (x) => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : null);
const r1 = (x) => (Number.isFinite(x) ? Math.round(x * 10) / 10 : null);

const banco = await lerPares('banco');
const res = { geradoEm: new Date().toISOString(), ufs: [...new Set(banco.map((s) => s.uf))].sort() };

// ---------- 1. conferência banco × dados abertos no 1º turno ----------
try {
  const abertos = new Map((await lerPares('abertos')).map((s) => [`${s.uf}|${s.municipio}|${s.zona}|${s.secao}`, s]));
  const conf = { comparadas: 0, semParNosAbertos: 0, difere: { a1: 0, c1: 0, v13_1: 0, v22_1: 0, out1: 0, bn1: 0, c2: 0, v13_2: 0, v22_2: 0 }, exemplos: [] };
  for (const s of banco) {
    const o = abertos.get(`${s.uf}|${s.municipio}|${s.zona}|${s.secao}`);
    if (!o) { conf.semParNosAbertos++; continue; }
    conf.comparadas++;
    let ruim = false;
    for (const c of Object.keys(conf.difere)) if (s[c] !== o[c]) { conf.difere[c]++; ruim = true; }
    if (ruim && conf.exemplos.length < 10) conf.exemplos.push({ secao: `${s.uf} ${s.municipio}/${s.zona}/${s.secao}`, banco: [s.a1, s.c1, s.v13_1, s.v22_1, s.bn1], abertos: [o.a1, o.c1, o.v13_1, o.v22_1, o.bn1] });
  }
  res.conferenciaAbertos = conf;
  log(`conferência: ${conf.comparadas} seções comparadas`);
} catch (e) {
  res.conferenciaAbertos = { erro: String(e.message) };
}

// ---------- modelo (mesmo de estatistico-dc-distribuicao.mjs) ----------
const { P, filtro } = filtrar(banco);
res.filtro = filtro;
await carregarIdade(P);
const { disp } = modelar(P);
res.modelo = { zonasComPhiProprio: disp.zonasProprias, secoesNormal: disp.secoesNormal, secoesBetaBinomial: disp.secoesBetaBinomial };
for (const s of P) s.esp = s.c2 - s.resAj - s.c1; // aumento esperado pelo modelo
// categorias de habilitação: o modelo do comparecimento usa todas as seções; as partes 2 a 5 só as que têm o
// detalhamento do BU nos dois turnos (sai o exterior, urna sem detalhamento; antes null − null virava 0)
prepararBiometria(P);
const PB = P.filter((s) => s.temBio);
res.semDetalhamentoBiometria = { secoes: P.length - PB.length, porUf: {} };
for (const s of P) if (!s.temBio) res.semDetalhamentoBiometria.porUf[s.uf] = (res.semDetalhamentoBiometria.porUf[s.uf] ?? 0) + 1;
log(`modelo: ${P.length} seções; com detalhamento de biometria: ${PB.length}`);

// ---------- 2. composição do acréscimo por faixa de z ----------
const faixas = [['z <= -4', (z) => z <= -4], ['-4 < z <= -2', (z) => z > -4 && z <= -2], ['-2 < z < 2', (z) => z > -2 && z < 2],
  ['2 <= z < 3', (z) => z >= 2 && z < 3], ['3 <= z < 4', (z) => z >= 3 && z < 4], ['z >= 4', (z) => z >= 4]];
const comp = (l) => {
  const t = (f) => l.reduce((a, s) => a + f(s), 0);
  const c1 = t((s) => s.c1), dc = t((s) => s.dc);
  return { secoes: l.length, dc, excesso: Math.round(t((s) => s.resAj)), dSemBiometria: t((s) => s.dsb), dPorBiometria: t((s) => s.dpb), dAnoNascimento: t((s) => s.dpg),
    parcela1t: { semBiometria: r3(t((s) => s.sb1) / c1), porBiometria: r3(t((s) => s.pb1) / c1), anoNascimento: r3(t((s) => s.pg1) / c1) },
    parcela2t: { semBiometria: r3(t((s) => s.sb2) / t((s) => s.c2)), porBiometria: r3(t((s) => s.pb2) / t((s) => s.c2)), anoNascimento: r3(t((s) => s.pg2) / t((s) => s.c2)) } };
};
res.composicaoPorFaixaZ = faixas.map(([nome, f]) => ({ faixa: nome, ...comp(PB.filter((s) => f(s.z))) }));
// as seções com maior aumento absoluto (Δ em eleitores), sem modelo
const ordDc = [...PB].sort((a, b) => b.dc - a.dc);
res.composicaoMaioresAumentos = [['1% maiores Δ', 0.01], ['5% maiores Δ', 0.05], ['10% maiores Δ', 0.1]].map(([nome, f]) => ({ grupo: nome, ...comp(ordDc.slice(0, Math.ceil(PB.length * f))) }));
res.composicaoTodas = comp(PB);

// ---------- 3. em que categoria entra o excesso e o aumento esperado ----------
const categorias = [['semBiometria', (s) => s.dsb], ['porBiometria', (s) => s.dpb], ['anoNascimento', (s) => s.dpg]];
function partes(lista) {
  const out = {};
  for (const [nome, y] of categorias) {
    const a = mqEfeitoFixo(lista, { y, x: (s) => [s.resAj, s.esp], grupo: (s) => s.zon, cluster: (s) => s.mun });
    if (!a) continue;
    const d = diferenca(a, 0, 1);
    out[nome] = { doExcesso: r3(a.b[0]), ep: r3(a.ep[0]), doEsperado: r3(a.b[1]), epEsperado: r3(a.ep[1]), diferenca: r3(d.d), t: r1(d.t) };
  }
  return out;
}
res.partesNacional = partes(PB);
const ufs = res.ufs;
res.partesPorUf = ufs.filter((uf) => PB.some((s) => s.uf === uf)).map((uf) => ({ uf, ...partes(PB.filter((s) => s.uf === uf)) }));
{
  const ps = []; const refs = [];
  for (const l of res.partesPorUf) for (const [nome] of categorias) if (l[nome] && Number.isFinite(l[nome].t)) { ps.push(pNormal2(l[nome].t)); refs.push(l[nome]); }
  bh(ps).forEach((q, i) => { refs[i].q = +q.toPrecision(3); });
  res.partesTestes = ps.length;
}
log('partes do excesso');

// ---------- 4. E2 por UF, efeito fixo de zona ----------
// y = ganho do finalista / c1; x = Δ por biometria / c1, Δ sem biometria (cadastro + ano de nascimento) / c1,
// eliminados do 1º / c1, brancos e nulos do 1º / c1 (a especificação do autor e do cético, mais efeito fixo de zona).
function e2(lista, separar = false) {
  const a = testeE2(lista, { separar, grupo: (s) => s.zon, cluster: (s) => s.mun });
  const dd = (d) => ({ d: r3(d.d), ep: r3(d.ep), t: r1(d.t) });
  for (const [nome] of [['ganho13'], ['ganho22']]) {
    const g = a[nome];
    if (!g) continue;
    a[nome] = separar
      ? { porBiometria: r3(g.porBiometria), semBiometriaCadastrada: r3(g.semBiometriaCadastrada), anoNascimento: r3(g.anoNascimento), cadastroMenosBio: dd(g.cadastroMenosBio), anoMenosBio: dd(g.anoMenosBio) }
      : { porBiometria: r3(g.porBiometria), semBiometria: r3(g.semBiometria), ...dd(g) };
  }
  return a;
}
const ufsBio = ufs.filter((uf) => PB.some((s) => s.uf === uf));
res.e2Nacional = e2(PB);
res.e2NacionalSeparado = e2(PB, true);
res.e2PorUf = ufsBio.map((uf) => ({ uf, ...e2(PB.filter((s) => s.uf === uf)) }));
{
  const ps = []; const refs = [];
  for (const l of res.e2PorUf) for (const k of ['ganho13', 'ganho22']) if (l[k] && Number.isFinite(l[k].t)) { ps.push(pNormal2(l[k].t)); refs.push(l[k]); }
  bh(ps).forEach((q, i) => { refs[i].q = +q.toPrecision(3); });
  res.e2Testes = ps.length;
}
res.e2PorUfSeparado = ufsBio.map((uf) => ({ uf, ...e2(PB.filter((s) => s.uf === uf), true) }));
// robustez: sem as seções com 5% ou mais de eleitores indígenas no perfil do eleitorado
res.e2PorUfSeparadoSemIndigenas = ufsBio.map((uf) => ({ uf, ...e2(PB.filter((s) => s.uf === uf && (s.pInd ?? 0) < 0.05), true) }));
res.secoesIndigenas5pct = PB.filter((s) => (s.pInd ?? 0) >= 0.05).length;
{
  const ps = []; const refs = [];
  for (const l of res.e2PorUfSeparado) for (const k of ['ganho13', 'ganho22']) for (const d of ['cadastroMenosBio', 'anoMenosBio'])
    if (l[k]?.[d] && Number.isFinite(l[k][d].t)) { ps.push(pNormal2(l[k][d].t)); refs.push(l[k][d]); }
  bh(ps).forEach((q, i) => { refs[i].q = +q.toPrecision(3); });
  res.e2SeparadoTestes = ps.length;
}
log('E2 por UF');

// ---------- 5. mesários e urna ----------
const M = PB.filter((s) => s.perfil1 === 1 && s.perfil2 === 1);
for (const s of M) {
  s.mesaTrocada = s.mesa_comum === 0 ? 1 : 0;
  s.mesaIgual = s.mesa_comum != null && s.mesa_comum === s.nmes1 && s.nmes1 === s.nmes2 ? 1 : 0;
  s.presTrocado = s.pres_igual === 0 ? 1 : 0;
  s.mesarioMultiplo = (s.secoes_mesario2 ?? 1) > 1 ? 1 : 0;
  s.urnaTrocada = s.urna1 !== s.urna2 ? 1 : 0;
  s.dhpm = (s.hpm2 ?? 0) - (s.hpm1 ?? 0);
  s.dmanual = s.dsb + s.dpg; // sem biometria cadastrada + liberado por ano de nascimento (anb = sb e dpc = pg no perfil)
}
const media = (l, f) => r3(l.reduce((a, s) => a + f(s), 0) / (l.length || 1));
const grupo = (nome, f) => {
  const l = M.filter(f);
  return { grupo: nome, secoes: l.length, mediaZ: media(l, (s) => s.z), z3acima: l.filter((s) => s.z >= 3).length, z3abaixo: l.filter((s) => s.z <= -3).length,
    excessoMedio: media(l, (s) => s.resAj), parte13Excesso: null };
};
res.mesarios = {
  secoesComPerfilNosDoisTurnos: M.length,
  grupos: [grupo('todas', () => true), grupo('mesa toda trocada', (s) => s.mesaTrocada), grupo('mesa igual', (s) => s.mesaIgual),
    grupo('presidente que encerrou trocado', (s) => s.presTrocado), grupo('mesário registrado em 2+ seções (2º turno)', (s) => s.mesarioMultiplo),
    grupo('urna trocada (nº interno)', (s) => s.urnaTrocada)],
};
{
  const x = (s) => [s.mesaTrocada, s.presTrocado, s.mesarioMultiplo, s.urnaTrocada];
  const a = mqEfeitoFixo(M, { y: (s) => s.z, x, grupo: (s) => s.zon, cluster: (s) => s.mun });
  const nomes = ['mesaTrocada', 'presidenteTrocado', 'mesarioEmMaisDeUmaSecao', 'urnaTrocada'];
  res.mesarios.zDentroDaZona = Object.fromEntries(nomes.map((n, i) => [n, { b: r3(a.b[i]), ep: r3(a.ep[i]), t: r1(a.b[i] / a.ep[i]) }]));
  // excesso × aumento de liberações sem biometria (princípio 8) e das liberações com a digital de mesário registrado (hpm, parte do ano de nascimento)
  const b = mqEfeitoFixo(M, { y: (s) => s.dmanual, x: (s) => [s.resAj, s.esp], grupo: (s) => s.zon, cluster: (s) => s.mun });
  const bh2 = mqEfeitoFixo(M, { y: (s) => s.dhpm, x: (s) => [s.resAj, s.esp], grupo: (s) => s.zon, cluster: (s) => s.mun });
  const dd = diferenca(b, 0, 1), dh = diferenca(bh2, 0, 1);
  res.mesarios.liberacoesSemBiometriaPorEleitorAMais = { doExcesso: r3(b.b[0]), ep: r3(b.ep[0]), doEsperado: r3(b.b[1]), epEsperado: r3(b.ep[1]), t: r1(dd.t) };
  res.mesarios.liberacoesPeloMesarioPorEleitorAMais = { doExcesso: r3(bh2.b[0]), ep: r3(bh2.ep[0]), doEsperado: r3(bh2.b[1]), epEsperado: r3(bh2.ep[1]), t: r1(dh.t) };
  const tt = (f) => M.reduce((a, s) => a + (f(s) ?? 0), 0);
  res.mesarios.totaisPerfil = { hpm1: tt((s) => s.hpm1), hpm2: tt((s) => s.hpm2), pg1: tt((s) => s.pg1), pg2: tt((s) => s.pg2), sb1: tt((s) => s.sb1), sb2: tt((s) => s.sb2), anb1: tt((s) => s.anb1), anb2: tt((s) => s.anb2) };
  // cauda direita: quanto do excesso veio com liberação manual
  const cauda = M.filter((s) => s.z >= 3);
  res.mesarios.caudaDireitaZ3 = { secoes: cauda.length, excesso: Math.round(cauda.reduce((a, s) => a + s.resAj, 0)), dLiberacoesSemBiometria: cauda.reduce((a, s) => a + s.dmanual, 0), dLiberacoesPeloMesario: cauda.reduce((a, s) => a + s.dhpm, 0),
    dc: cauda.reduce((a, s) => a + s.dc, 0), mesaTrocada: cauda.filter((s) => s.mesaTrocada).length, mesarioMultiplo: cauda.filter((s) => s.mesarioMultiplo).length };
  res.mesarios.todas = { dLiberacoesSemBiometria: M.reduce((a, s) => a + s.dmanual, 0), dLiberacoesPeloMesario: M.reduce((a, s) => a + s.dhpm, 0), dc: M.reduce((a, s) => a + s.dc, 0) };
  // concentração por "presidente de mesa" (um título hash no perfil): seções da cauda z ≥ 3 por município e por zona
  const porZona = new Map();
  for (const s of cauda) porZona.set(s.zon, (porZona.get(s.zon) ?? 0) + 1);
  const totZona = new Map();
  for (const s of M) totZona.set(s.zon, (totZona.get(s.zon) ?? 0) + 1);
  const pBase = cauda.length / M.length;
  res.mesarios.zonasComMaisCaudaDireita = [...porZona.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([z, n]) => ({ zona: z, secoesZ3: n, secoes: totZona.get(z), esperado: r1(pBase * totZona.get(z)) }));
}
log('mesários');

// lista para conferência no bruto: maiores z com biometria
const extremas = [...PB].sort((a, b) => b.z - a.z).slice(0, 40).map((s) => ({
  uf: s.uf, municipio: s.municipio, zona: s.zona, secao: s.secao, z: r1(s.z), excesso: Math.round(s.resAj), c1: s.c1, c2: s.c2,
  sb1: s.sb1, pb1: s.pb1, pg1: s.pg1, sb2: s.sb2, pb2: s.pb2, pg2: s.pg2, v13_1: s.v13_1, v13_2: s.v13_2, v22_1: s.v22_1, v22_2: s.v22_2,
  hpm1: s.hpm1, hpm2: s.hpm2, anb1: s.anb1, anb2: s.anb2, mesa_comum: s.mesa_comum, nmes1: s.nmes1, nmes2: s.nmes2, urna_trocada: s.urna1 !== s.urna2 ? 1 : 0 }));
await salvar('biometria-extremas.csv', paraCsv(extremas, Object.keys(extremas[0])));
res.quantisZ = { p001: r3(quantil(P.map((s) => s.z), 0.001)), p999: r3(quantil(P.map((s) => s.z), 0.999)) };
const arq = await salvar('biometria.json', res);
log(`→ ${arq}`);
console.log(JSON.stringify({ conferencia: res.conferenciaAbertos, composicao: res.composicaoPorFaixaZ, maiores: res.composicaoMaioresAumentos, partes: res.partesNacional, e2: res.e2Nacional, e2sep: res.e2NacionalSeparado, mesarios: res.mesarios }, null, 1));
