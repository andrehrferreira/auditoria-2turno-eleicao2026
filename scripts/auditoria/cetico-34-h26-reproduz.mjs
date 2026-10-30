// Parecer cético 34 (H26), passo 2: refaz a triagem por caminho próprio e testa escala, coeficientes, biometria e modelo.
// Entrada: 34-h26-secoes.csv (cetico-34-h26-secoes.mjs). Compara com data/parsed/auditoria/virada-zonas/zonas.csv e
// resumo.json do autor. Uso: node --max-old-space-size=8192 scripts/auditoria/cetico-34-h26-reproduz.mjs
// Saídas em data/parsed/auditoria/cetico-revisor/: 34-h26-reproduz.json, 34-h26-zonas.csv.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { RAIZ, SAIDA, NOMES_X, lerSecoes, normais, coeficientes, porZona, recalcular, triagem, zRobusto, mediana, pp, csv, r, p2, bh, QMAX, PPMIN } from './cetico-34-h26-lib.mjs';

const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const out = {};
const S = await lerSecoes();
log(`${S.length} seções`);
const N = normais(S);
const C = coeficientes(N);

// ---------- 1. coeficientes × autor ----------
const autor = JSON.parse(await readFile(path.join(RAIZ, 'data', 'parsed', 'auditoria', 'virada-zonas', 'resumo.json'), 'utf8'));
let maxDifCoef = 0;
const foraDeFaixa = [];
for (const [uf, { b13, b22 }] of C) {
  const a = autor.coeficientes[uf];
  NOMES_X.forEach((n, i) => {
    const na = n === 'v14_1' ? 'e14' : n === 'v30_1' ? 'e30' : n === 'v55_1' ? 'e55' : n === 'v70_1' ? 'e70' : n === 'dem_1' ? 'demais' : n === 'bn1' ? 'brancos_nulos_1' : n === 'abst1' ? 'abstencao_1' : n;
    maxDifCoef = Math.max(maxDifCoef, Math.abs(b13[i] - a[13][na]), Math.abs(b22[i] - a[22][na]));
    for (const [cand, b] of [[13, b13], [22, b22]]) if (b[i] < 0 || b[i] > 1) foraDeFaixa.push({ uf, cand, x: n, b: r(b[i], 3) });
    if (b13[i] + b22[i] > 1.05) foraDeFaixa.push({ uf, cand: '13+22', x: n, b: r(b13[i] + b22[i], 3) });
  });
}
out.coeficientes = { maxDiferencaContraAutor: maxDifCoef, foraDe0a1: foraDeFaixa.length, lista: foraDeFaixa };

// ---------- 2. zonas e corte ----------
const Z = porZona(S, C);
const esc = triagem(Z, (z) => z.reg);
out.escalaRegiao = Object.fromEntries(Object.entries(esc).map(([g, e]) => [g, { zonas: e.zonas, mediana: r(e.mediana, 4), mad: r(e.mad, 4) }]));
const lerCsv = (txt) => { const [c, ...l] = txt.trim().split('\n'); const cab = c.split(';'); return l.map((x) => Object.fromEntries(x.split(';').map((v, i) => [cab[i], v]))); };
const ZA = new Map(lerCsv(await readFile(path.join(RAIZ, 'data', 'parsed', 'auditoria', 'virada-zonas', 'zonas.csv'), 'utf8')).map((z) => [`${z.uf}|${z.zona}`, z]));
let dz = 0, da = 0, foraDifere = 0, semPar = 0;
for (const z of Z) {
  const a = ZA.get(z.k);
  if (!a) { semPar++; continue; }
  if (a.z !== '' && Number.isFinite(z.z)) dz = Math.max(dz, Math.abs(z.z - Number(a.z)));
  da = Math.max(da, Math.abs(z.alem - Number(a.alemEsperado)));
  if (Number(a.fora) !== z.fora) foraDifere++;
}
const lista = (f) => Z.filter(f).sort((a, b) => b.z - a.z).map((z) => ({ uf: z.uf, zona: z.zona, secoes: z.secoes, alem: r(z.alem), z: r(z.z), q: Number(z.q.toPrecision(3)) }));
out.corte = {
  zonas: Z.length, comZ: Z.filter((z) => Number.isFinite(z.z)).length, fora13: Z.filter((z) => z.fora === 13).length, fora22: Z.filter((z) => z.fora === 22).length,
  lista: lista((z) => z.fora), contraAutor: { zonasSemPar: semPar, maxDifZ: r(dz, 4), maxDifAlemPp: r(da, 4), foraDifere },
  caudas: { z3para13: Z.filter((z) => z.z >= 3).length, z3para22: Z.filter((z) => z.z <= -3).length,
    esperadoNormalCadaLado: r(Z.filter((z) => Number.isFinite(z.z)).length * p2(3) / 2, 1),
    z4para13: Z.filter((z) => z.z >= 4).length, z4para22: Z.filter((z) => z.z <= -4).length, esperadoNormal4CadaLado: r(Z.length * p2(4) / 2, 2) },
  qMinPara13: r(Math.min(...Z.filter((z) => z.z > 0).map((z) => z.q)), 4),
};
// limiar de |z| que o BH exigiu na prática (menor |z| entre os que passaram q < 0,01)
const passam = Z.filter((z) => z.q < QMAX);
out.corte.menorAbsZComQ001 = r(Math.min(...passam.map((z) => Math.abs(z.z))), 3);
out.corte.zonasComQ001 = passam.length;
log('corte refeito');

// ---------- 3. virada geral ----------
const soma = (l, c) => l.reduce((a, z) => a + z[c], 0);
const margem = (l, t) => pp(soma(l, `v13_${t}`) - soma(l, `v22_${t}`), soma(l, `nom${t}`));
for (const z of Z) {
  z.margem1 = pp(z.v13_1 - z.v22_1, z.nom1); z.margem2 = pp(z.v13_2 - z.v22_2, z.nom2); z.vb = z.margem2 - z.margem1;
  const c = { 13: 0, 22: 0, 14: 0, 30: 0, 55: 0, 70: 0 };
  for (const s of z.lista) { c[13] += s.v13_1; c[22] += s.v22_1; c[14] += s.v14_1; c[30] += s.v30_1; c[55] += s.v55_1; c[70] += s.v70_1; }
  z.venc1 = Number(Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]);
  z.venc2 = z.v13_2 > z.v22_2 ? 13 : z.v22_2 > z.v13_2 ? 22 : 0;
}
const vb = Z.map((z) => z.vb).sort((a, b) => a - b);
const q = (p) => vb[Math.floor(p * (vb.length - 1))];
const v2213 = Z.filter((z) => z.venc1 === 22 && z.venc2 === 13);
out.viradaGeral = {
  margem1: r(margem(Z, 1)), margem2: r(margem(Z, 2)), viradaBrasil: r(margem(Z, 2) - margem(Z, 1)),
  zonasQueMelhoraramPara13: Z.filter((z) => z.vb > 0).length, zonasPara22: Z.filter((z) => z.vb < 0).length,
  piorPara22: Z.filter((z) => z.vb < 0).sort((a, b) => a.vb - b.vb).slice(0, 3).map((z) => ({ uf: z.uf, zona: z.zona, vb: r(z.vb) })),
  p01: r(q(0.01)), mediana: r(mediana(vb)), p99: r(q(0.99)),
  viraram22para13: v2213.length, viraram13para22: Z.filter((z) => z.venc1 === 13 && z.venc2 === 22).length,
  outrasViradas: Z.filter((z) => z.venc1 !== z.venc2 && !(z.venc1 === 22 && z.venc2 === 13) && !(z.venc1 === 13 && z.venc2 === 22)).map((z) => `${z.uf} ${z.zona}: ${z.venc1}→${z.venc2}`),
  maiorDesvantagemDo13EntreAsQueViraram: r(Math.max(...v2213.map((z) => -z.margem1))),
  zonasCom22AFrenteMenosQueVirada: Z.filter((z) => z.margem1 < 0 && -z.margem1 < margem(Z, 2) - margem(Z, 1)).length,
  // as que viraram: virada bruta das que viraram × das que não viraram e tinham o 22 à frente por < 7,77 p.p.
};
{
  const lim = out.viradaGeral.maiorDesvantagemDo13EntreAsQueViraram;
  const cand = Z.filter((z) => z.margem1 < 0 && -z.margem1 <= lim);
  out.viradaGeral.zonasCom22AFrenteAteEsseLimite = cand.length;
  out.viradaGeral.dessasViraram = cand.filter((z) => z.venc2 === 13).length;
  // virou porque a virada da zona passou da desvantagem; as que não viraram tinham virada menor que a desvantagem?
  out.viradaGeral.naoViraramComViradaMaiorQueDesvantagem = cand.filter((z) => z.venc2 !== 13 && z.vb > -z.margem1).length;
}
log('virada geral');

// ---------- 4. escala: tamanho da zona, UF, região × tamanho, p.p. ----------
const comZ = Z.filter((z) => Number.isFinite(z.z));
const quint = (l, c) => { const v = l.map((z) => z[c]).sort((a, b) => a - b); return [0.2, 0.4, 0.6, 0.8].map((p) => v[Math.floor(p * (v.length - 1))]); };
const cortesN = quint(comZ, 'n2');
const faixaN = (z) => cortesN.filter((c) => z.n2 > c).length;
out.escalaPorTamanho = [];
for (const reg of ['N', 'NE', 'CO', 'SE', 'S']) {
  for (let f = 0; f < 5; f++) {
    const l = comZ.filter((z) => z.reg === reg && faixaN(z) === f);
    if (l.length < 5) continue;
    const m = mediana(l.map((z) => z.t));
    const mad = 1.4826 * mediana(l.map((z) => Math.abs(z.t - m)));
    out.escalaPorTamanho.push({ regiao: reg, quintilNominais2: f + 1, zonas: l.length, nominais2Mediano: Math.round(mediana(l.map((z) => z.n2))), madT: r(mad, 3),
      madAlemPp: r(1.4826 * mediana(l.map((z) => Math.abs(z.alem - mediana(l.map((y) => y.alem))))), 3),
      z3: l.filter((z) => Math.abs(z.z) >= 3).length });
  }
}
// regressão de log|t − mediana| em log(nominais): inclinação 0 = escala √n correta; 0,5 = variância ∝ n² (efeito de zona)
{
  const pts = comZ.map((z) => [Math.log(z.n2), Math.log(Math.abs(z.t - esc[z.reg].mediana) + 1e-9)]).filter((p) => Number.isFinite(p[1]) && p[1] > -10);
  const mx = pts.reduce((a, p) => a + p[0], 0) / pts.length, my = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  out.escalaInclinacaoLogLog = r(pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0), 3);
}
const guardar = (nome) => { for (const z of Z) { z[`z_${nome}`] = z.z; z[`q_${nome}`] = z.q; z[`fora_${nome}`] = z.fora; } };
guardar('regiao');
const alternativas = {};
const resumirAlt = (nome) => ({ fora13: Z.filter((z) => z.fora === 13).length, fora22: Z.filter((z) => z.fora === 22).length,
  lista: Z.filter((z) => z.fora).map((z) => `${z.uf} ${z.zona} (${r(z.alem)} p.p., z ${r(z.z)})`),
  z3para13: Z.filter((z) => z.z >= 3).length, z3para22: Z.filter((z) => z.z <= -3).length,
  top5para13: [...Z].filter((z) => Number.isFinite(z.z)).sort((a, b) => b.z - a.z).slice(0, 5).map((z) => `${z.uf} ${z.zona} (z ${r(z.z)})`) });
triagem(Z, (z) => z.uf); alternativas.porUF = resumirAlt(); guardar('uf');
triagem(Z, (z) => `${z.reg}|${faixaN(z)}`); alternativas.porRegiaoETamanho = resumirAlt(); guardar('regtam');
// escala em p.p. (sem dividir por √n): a mesma régua para zona grande e pequena
for (const z of Z) z.tpp = z.alem;
{
  const e = zRobusto(Z, (z) => z.reg, 'tpp');
  const c = Z.filter((z) => Number.isFinite(z.z));
  const qq = bh(c.map((z) => p2(z.z)));
  c.forEach((z, i) => { z.q = qq[i]; });
  for (const z of Z) z.fora = Number.isFinite(z.z) && z.q < QMAX && Math.abs(z.alem) >= PPMIN ? (z.alem > 0 ? 13 : 22) : 0;
  alternativas.escalaEmPp = resumirAlt(); guardar('pp');
  alternativas.escalaEmPp.madPorRegiao = Object.fromEntries(Object.entries(e).map(([g, x]) => [g, r(x.mad, 3)]));
}
// modelo de variância: Var(t) = σ²(1 + n2/n0): estimado por região com os quintis; z = (t − med)/(σ√(1+n2/n0))
{
  for (const reg of ['N', 'NE', 'CO', 'SE', 'S']) {
    const l = comZ.filter((z) => z.reg === reg);
    const m = esc[reg].mediana;
    // ajuste por MQ de (t − m)² ≈ a + b·n2 em mediana robusta: usar quintis do MAD²
    const pts = out.escalaPorTamanho.filter((e) => e.regiao === reg).map((e) => [e.nominais2Mediano, e.madT ** 2]);
    const mx = pts.reduce((a, p) => a + p[0], 0) / pts.length, my = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    let b = pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0);
    let a = my - b * mx;
    if (a <= 0) { a = Math.min(...pts.map((p) => p[1])); b = Math.max(0, b); }
    for (const z of l) z.zvar = (z.t - m) / Math.sqrt(Math.max(1e-6, a + b * z.n2));
  }
  for (const z of Z) z.z = z.zvar ?? NaN;
  const c = Z.filter((z) => Number.isFinite(z.z));
  const qq = bh(c.map((z) => p2(z.z)));
  c.forEach((z, i) => { z.q = qq[i]; });
  for (const z of Z) z.fora = Number.isFinite(z.z) && z.q < QMAX && Math.abs(z.alem) >= PPMIN ? (z.alem > 0 ? 13 : 22) : 0;
  alternativas.varianciaCresceComTamanho = resumirAlt(); guardar('var');
}
out.escalasAlternativas = alternativas;
// volta à triagem do plano
for (const z of Z) { z.z = z.z_regiao; z.q = z.q_regiao; z.fora = z.fora_regiao; }

// ---------- 5. dependência espacial: zonas do mesmo município ----------
{
  const porMun = new Map();
  for (const z of comZ) {
    const [mun] = [...z.mun].sort((a, b) => b[1] - a[1])[0];
    z.munPrinc = `${z.uf}|${mun}`;
    (porMun.get(z.munPrinc) ?? porMun.set(z.munPrinc, []).get(z.munPrinc)).push(z);
  }
  const grupos = [...porMun.values()].filter((l) => l.length >= 2);
  // ICC por ANOVA de um fator
  const todos = grupos.flat();
  const gm = todos.reduce((a, z) => a + z.z, 0) / todos.length;
  let ssb = 0, ssw = 0;
  for (const l of grupos) { const m = l.reduce((a, z) => a + z.z, 0) / l.length; ssb += l.length * (m - gm) ** 2; for (const z of l) ssw += (z.z - m) ** 2; }
  const k = grupos.length, n = todos.length, n0 = (n - grupos.reduce((a, l) => a + l.length ** 2, 0) / n) / (k - 1);
  const msb = ssb / (k - 1), msw = ssw / (n - k);
  out.espacial = { municipiosComMaisDeUmaZona: k, zonas: n, icc: r((msb - msw) / (msb + (n0 - 1) * msw), 3),
    maiores: grupos.sort((a, b) => b.length - a.length).slice(0, 8).map((l) => ({ mun: l[0].munPrinc, zonas: l.length, zMediano: r(mediana(l.map((z) => z.z))), z3: l.filter((z) => z.z >= 3).length })) };
}
log('escala e espaço');

// ---------- 6. coeficientes com caixa [0, 1] ----------
{
  const Cb = coeficientes(N, [0, 1]);
  const Zb = porZona(S, Cb);
  triagem(Zb, (z) => z.reg);
  const m = new Map(Zb.map((z) => [z.k, z]));
  let maxD = 0, soma2 = 0;
  const xs = [], ys = [];
  for (const z of comZ) { const b = m.get(z.k); const d = b.alem - z.alem; maxD = Math.max(maxD, Math.abs(d)); soma2 += d * d; xs.push(z.z); ys.push(b.z); }
  const rank = (v) => { const o = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]); const rk = new Array(v.length); o.forEach(([, i], j) => { rk[i] = j; }); return rk; };
  const rx = rank(xs), ry = rank(ys), nn = xs.length;
  const spear = 1 - 6 * rx.reduce((a, v, i) => a + (v - ry[i]) ** 2, 0) / (nn * (nn * nn - 1));
  for (const z of Z) { const b = m.get(z.k); z.alem_caixa = b.alem; z.z_caixa = b.z; z.fora_caixa = b.fora; }
  out.coeficientesCaixa = {
    fora13: Zb.filter((z) => z.fora === 13).length, fora22: Zb.filter((z) => z.fora === 22).length,
    lista: Zb.filter((z) => z.fora).map((z) => `${z.uf} ${z.zona} (${r(z.alem)} p.p., z ${r(z.z)})`),
    z3para13: Zb.filter((z) => z.z >= 3).length, z3para22: Zb.filter((z) => z.z <= -3).length,
    maxMudancaAlemPp: r(maxD, 3), rmsMudancaAlemPp: r(Math.sqrt(soma2 / comZ.length), 3), spearmanZ: r(spear, 4),
    exemplos: Object.fromEntries(['ce', 'df', 'rj', 'ac', 'am'].map((uf) => [uf, { b13: [...Cb.get(uf).b13].map((v) => r(v, 3)), b22: [...Cb.get(uf).b22].map((v) => r(v, 3)) }])),
  };
}
log('coeficientes com caixa');

// ---------- 7. cauda do 13: comparecimento e biometria ----------
{
  for (const z of Z) { z.dComp = pp(z.c2, z.a2) - pp(z.c1, z.a1); }
  const medUF = new Map();
  for (const uf of new Set(Z.map((z) => z.uf))) medUF.set(uf, mediana(Z.filter((z) => z.uf === uf).map((z) => z.dComp)));
  const cauda13 = Z.filter((z) => z.z >= 3), cauda22 = Z.filter((z) => z.z <= -3), demais = Z.filter((z) => !(Math.abs(z.z) >= 3));
  const ufsCauda = new Set(cauda13.map((z) => z.uf));
  const demaisMesmasUF = demais.filter((z) => ufsCauda.has(z.uf));
  const bio = (l) => {
    const d = (c) => l.reduce((a, z) => a + z[`${c}2`] - z[`${c}1`], 0);
    const dc = l.reduce((a, z) => a + z.c2 - z.c1, 0);
    const nivel = (c, t) => pp(l.reduce((a, z) => a + z[`${c}${t}`], 0), l.reduce((a, z) => a + z[`c${t}`], 0));
    return { zonas: l.length, deltaComparecimento: dc, deltaAptos: l.reduce((a, z) => a + z.a2 - z.a1, 0),
      parcelaDoAumento: { porBiometria: r(pp(d('pb'), dc)), semBiometriaCadastrada: r(pp(d('sb'), dc)), anoNascimento: r(pp(d('pg'), dc)) },
      nivel1: { pb: r(nivel('pb', 1)), sb: r(nivel('sb', 1)), pg: r(nivel('pg', 1)) }, nivel2: { pb: r(nivel('pb', 2)), sb: r(nivel('sb', 2)), pg: r(nivel('pg', 2)) },
      dCompMediano: r(mediana(l.map((z) => z.dComp))), dCompMenosUFMediano: r(mediana(l.map((z) => z.dComp - medUF.get(z.uf)))) };
  };
  // conferência das definições: sb + pb + pg = comparecimento por seção
  const difere = [1, 2].map((t) => S.filter((s) => s[`sb${t}`] + s[`pb${t}`] + s[`pg${t}`] !== s[`c${t}`]).length);
  // zonas em que a parte sem digital (sb + pg) do aumento passou de 50% (onde voto liberado manualmente explicaria a virada)
  out.cauda = { cauda13: bio(cauda13), cauda22: bio(cauda22), demais: bio(demais), demaisNasMesmasUFs: bio(demaisMesmasUF), somaHabilitacaoDifereComparecimento: difere,
    lista13: cauda13.sort((a, b) => b.z - a.z).map((z) => ({ uf: z.uf, zona: z.zona, z: r(z.z), alem: r(z.alem), dComp: r(z.dComp), dCompMenosUF: r(z.dComp - medUF.get(z.uf)),
      dAptos: z.a2 - z.a1, dComparecimento: z.c2 - z.c1, partePb: r(pp(z.pb2 - z.pb1, z.c2 - z.c1)), parteSemDigital: r(pp(z.sb2 - z.sb1 + z.pg2 - z.pg1, z.c2 - z.c1)) })) };
  // correlação, entre as zonas, do z com a variação de comparecimento acima da UF (o esperado não usa Δcomparecimento)
  const l = comZ.map((z) => [z.dComp - medUF.get(z.uf), z.z]);
  const mx = l.reduce((a, p) => a + p[0], 0) / l.length, my = l.reduce((a, p) => a + p[1], 0) / l.length;
  const sxy = l.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0), sxx = l.reduce((a, p) => a + (p[0] - mx) ** 2, 0), syy = l.reduce((a, p) => a + (p[1] - my) ** 2, 0);
  out.cauda.correlacaoZComDCompAcimaDaUF = r(sxy / Math.sqrt(sxx * syy), 3);
}
log('cauda');

// ---------- 8. modelo da urna dentro da zona ----------
{
  const linhas = [];
  for (const reg of ['BR', 'N', 'NE', 'CO', 'SE', 'S']) {
    const acc = new Map();
    for (const z of Z) {
      if ((reg !== 'BR' && z.reg !== reg) || z.n2 <= 0) continue;
      const taxa = z.rl / z.n2;
      for (const s of z.lista) {
        const g = s.modelo1 === s.modelo2 ? s.modelo2 : `trocou ${s.modelo1}→${s.modelo2}`;
        const rl = (s.v13_2 - s.x.reduce((a, v, i) => a + v * C.get(s.uf).b13[i], 0)) - (s.v22_2 - s.x.reduce((a, v, i) => a + v * C.get(s.uf).b22[i], 0));
        const d = rl - s.nom2 * taxa;
        const a = acc.get(g) ?? acc.set(g, { n: 0, D: 0, W: 0, Z: new Map() }).get(g);
        a.n++; a.D += d; a.W += s.nom2;
        const pz = a.Z.get(z.k) ?? a.Z.set(z.k, [0, 0]).get(z.k); pz[0] += d; pz[1] += s.nom2;
      }
    }
    for (const [g, a] of acc) {
      const m = a.D / a.W, G = a.Z.size;
      let v = 0; for (const [d, n] of a.Z.values()) v += (d - m * n) ** 2;
      const ep = G > 1 ? Math.sqrt(G / (G - 1) * v) / a.W : NaN;
      linhas.push({ regiao: reg, grupo: g, secoes: a.n, desvioPp: r(100 * m, 4), epPp: r(100 * ep, 4), z: r(m / ep) });
    }
  }
  out.modelo = { linhas: linhas.length, maxAbsZ: r(Math.max(...linhas.filter((l) => Number.isFinite(l.z)).map((l) => Math.abs(l.z)))),
    brasil: linhas.filter((l) => l.regiao === 'BR'), maioresAbsZ: [...linhas].filter((l) => Number.isFinite(l.z)).sort((a, b) => Math.abs(b.z) - Math.abs(a.z)).slice(0, 5) };
}
log('modelo');

const cols = ['uf', 'zona', 'reg', 'secoes', 'n2', 'vb', 'alem', 't', 'z_regiao', 'q_regiao', 'fora_regiao', 'z_uf', 'z_regtam', 'z_pp', 'z_var', 'alem_caixa', 'z_caixa', 'fora_caixa', 'dComp'];
await writeFile(path.join(SAIDA, '34-h26-zonas.csv'), csv(Z.map((z) => Object.fromEntries(cols.map((c) => [c, z[c]]))), cols));
await writeFile(path.join(SAIDA, '34-h26-reproduz.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
