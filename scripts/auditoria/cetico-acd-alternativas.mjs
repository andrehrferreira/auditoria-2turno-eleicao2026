// Cético, achado "aumento de comparecimento difuso" (estatístico eleitoral 01–05): explicações alternativas e poder.
// Lê só os pares dos dados abertos (28 UFs) gerados por estatistico-pares.mjs e o mesmo modelo de estatistico-lib.mjs.
//
// Uso: node --max-old-space-size=4096 scripts/auditoria/cetico-acd-alternativas.mjs [replicas=10] [--sem-poder]
// Saída: data/parsed/auditoria/cetico/acd-alternativas.json
//
// Partes:
//  A. Linha de base do teste de simetria por UF: o nulo sorteado já é assimétrico (mais cauda esquerda). Compara a
//     participação da cauda direita observada com a do nulo, por UF (binomial exata, BH), e não com 1/2.
//  B. Nulo superdisperso: mistura de escala z·√λ, λ ~ Gama(k, 1/k), recalibrada pela mediana; k escolhido para o nulo
//     ter o mesmo número de seções com |z| ≥ 4 que o observado. Caudas e participação da direita sob esse nulo.
//  C. Resíduo pró-13 (decil 10 da parcela do 13): sobrevive a controle por faixa etária (16–24, 60+), escolaridade,
//     indígena, voto do 1º turno (eliminados, brancos/nulos, abstenção em decis) e modelo de urna?
//  D. Poder do teste de simetria por UF: inserção concentrada numa UF só (+k em 1% das seções da UF), modelo refeito.
// Gerador: mulberry32 (aleatorio de forense-lib.mjs).
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { RAIZ, aleatorio, binomialCauda, quantil, sortearBeta, sortearBinomial, sortearGama } from './forense-lib.mjs';
import { REGIAO, bh, filtrar, lerPares, modelar, mqEfeitoFixo, sortearNulo } from './estatistico-lib.mjs';

const REPLICAS = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a)) ?? 10);
const SEM_PODER = process.argv.includes('--sem-poder');
const SAIDA = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico');
const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const r3 = (x) => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : null);
const r1 = (x) => (Number.isFinite(x) ? Math.round(x * 10) / 10 : null);

// ---------- dados (igual ao autor) ----------
const todos = await lerPares('abertos');
const { P, filtro } = filtrar(todos);
log(`${P.length} seções de ${todos.length}`);

// perfil do eleitorado: mesma junção de carregarIdade (agregadas somadas à principal), com mais colunas
async function carregarPerfil() {
  const forense = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'forense');
  const dir = path.join(forense, 'perfil'), arqLocais = path.join(forense, 'locais.csv');
  if (!existsSync(dir) || !existsSync(arqLocais)) throw new Error('falta o perfil do eleitorado');
  const principal = new Map();
  for await (const l of createInterface({ input: createReadStream(arqLocais, 'utf8'), crlfDelay: Infinity })) {
    const c = l.split(';');
    if (c[0] !== '2' || c[5] !== 'Agregada') continue;
    principal.set(`${c[1]}|${c[2]}|${c[3]}|${c[4]}`, `${c[1]}|${c[2]}|${c[3]}|${String(Number(c[6])).padStart(4, '0')}`);
  }
  const porChave = new Map(P.map((s) => [`${s.uf}|${s.municipio}|${s.zona}|${s.secao}`, s]));
  let n = 0;
  for (const f of await readdir(dir)) {
    let cab = true;
    for await (const l of createInterface({ input: createReadStream(path.join(dir, f), 'utf8'), crlfDelay: Infinity })) {
      if (cab) { cab = false; continue; }
      const c = l.split(';');
      const k = `${c[0]}|${c[1]}|${c[2]}|${c[3]}`;
      const s = porChave.get(principal.get(k) ?? k);
      if (!s) continue;
      s.eleit = (s.eleit ?? 0) + Number(c[4]); s.i60 = (s.i60 ?? 0) + Number(c[6]); s.i1624 = (s.i1624 ?? 0) + Number(c[7]);
      s.eb = (s.eb ?? 0) + Number(c[8]); s.sup = (s.sup ?? 0) + Number(c[9]); s.ind = (s.ind ?? 0) + Number(c[10]);
      n++;
    }
  }
  for (const s of P) {
    const ok = s.eleit > 0;
    s.p60 = ok ? s.i60 / s.eleit : null; s.p1624 = ok ? s.i1624 / s.eleit : null; s.pEb = ok ? s.eb / s.eleit : null;
    s.pSup = ok ? s.sup / s.eleit : null; s.pInd = ok ? s.ind / s.eleit : null;
  }
  return n;
}
const linhasPerfil = await carregarPerfil();
log(`perfil: ${linhasPerfil} linhas; seções sem perfil: ${P.filter((s) => s.p60 == null).length}`);

modelar(P);
const zObs = Float64Array.from(P, (s) => s.z);
const ufs = [...new Set(P.map((s) => s.uf))].sort();
const idxUf = new Map(ufs.map((u) => [u, []]));
P.forEach((s, i) => idxUf.get(s.uf).push(i));
const res = { geradoEm: new Date().toISOString(), fonte: 'pares-abertos.csv (28 UFs)', filtro, secoes: P.length, ufs: ufs.length, replicas: REPLICAS };

// cauda superior exata da binomial: P(X ≥ k), X ~ Bin(n, p)
const caudaSup = (n, p, k) => (k <= 0 ? 1 : binomialCauda(n, p, k));
const LIM = [3, 4, 5];
const contar = (zs, idx, k) => { let a = 0, b = 0; for (const i of idx) { if (zs[i] >= k) a++; else if (zs[i] <= -k) b++; } return [a, b]; };
const todosIdx = P.map((_, i) => i);

// ---------- A. nulo sorteado (mesma semente do autor) e simetria por UF contra a participação do nulo ----------
const rnd = aleatorio(20261025);
const zSims = [];
for (let rep = 0; rep < REPLICAS; rep++) {
  zSims.push(Float64Array.from(P, (s) => (sortearNulo(s, rnd, sortearBinomial, sortearBeta) - s.a2 * s.p) / Math.sqrt(s.V)));
}
log('nulo sorteado');
function tabelaSimetria(zsNulo, rotulo) {
  const nacional = Object.fromEntries(LIM.map((k) => {
    const [ro, lo] = contar(zObs, todosIdx, k);
    let rn = 0, ln = 0; for (const z of zsNulo) { const [a, b] = contar(z, todosIdx, k); rn += a; ln += b; }
    rn /= zsNulo.length; ln /= zsNulo.length;
    return [k, { obsDireita: ro, obsEsquerda: lo, partObs: r3(ro / (ro + lo)), nuloDireita: r1(rn), nuloEsquerda: r1(ln), partNulo: r3(rn / (rn + ln)),
      razaoObsNuloDireita: r1(ro / rn), razaoObsNuloEsquerda: r1(lo / ln) }];
  }));
  const porUf = [];
  for (const k of [3, 4]) {
    const linhas = ufs.map((uf) => {
      const idx = idxUf.get(uf);
      const [R, L] = contar(zObs, idx, k);
      let rn = 0, ln = 0; for (const z of zsNulo) { const [a, b] = contar(z, idx, k); rn += a; ln += b; }
      // participação do nulo na UF (com 0,5 de suavização); se a UF tem pouca cauda no nulo, usa a nacional
      const piUf = (rn + 0.5) / (rn + ln + 1);
      const piNac = nacional[k].partNulo;
      const pi = rn + ln >= 20 ? piUf : piNac;
      const n = R + L;
      return { uf, limiar: k, R, L, nuloR: r1(rn / zsNulo.length), nuloL: r1(ln / zsNulo.length), partNulo: r3(pi),
        pMetade: n ? caudaSup(n, 0.5, R) : 1, pContraNulo: n ? caudaSup(n, pi, R) : 1 };
    });
    const qM = bh(linhas.map((l) => l.pMetade)), qN = bh(linhas.map((l) => l.pContraNulo));
    linhas.forEach((l, i) => { l.qMetade = +qM[i].toPrecision(3); l.qContraNulo = +qN[i].toPrecision(3); l.pMetade = +l.pMetade.toPrecision(3); l.pContraNulo = +l.pContraNulo.toPrecision(3); });
    porUf.push(...linhas);
  }
  return { rotulo, nacional, porUf, ufsQ05ContraNulo: porUf.filter((l) => l.qContraNulo < 0.05).map((l) => `${l.uf}@${l.limiar}`),
    ufsQ05Metade: porUf.filter((l) => l.qMetade < 0.05).map((l) => `${l.uf}@${l.limiar}`) };
}
res.A = tabelaSimetria(zSims, 'nulo do autor (binomial de transição calibrada; beta-binomial onde φ > 1)');
log(`A: UFs com q < 0,05 contra o nulo: ${res.A.ufsQ05ContraNulo.join(', ') || 'nenhuma'}`);

// ---------- B. nulo superdisperso (mistura de escala) ----------
{
  const med = (v) => quantil(Array.from(v), 0.5);
  const escalas = [];
  for (const k of [50, 20, 10, 6, 4, 3, 2, 1.5, 1]) {
    const rg = aleatorio(31 + Math.round(k * 10));
    const mist = zSims.map((z) => {
      const m = new Float64Array(z.length);
      for (let i = 0; i < z.length; i++) m[i] = z[i] * Math.sqrt(sortearGama(k, rg) / k);
      const c = Math.sqrt(med(m.map((x) => x * x)) / 0.4549);
      for (let i = 0; i < m.length; i++) m[i] /= c;
      return m;
    });
    let n4 = 0; for (const m of mist) { const [a, b] = contar(m, todosIdx, 4); n4 += a + b; }
    escalas.push({ k, mist, n4: n4 / mist.length });
  }
  const [ro4, lo4] = contar(zObs, todosIdx, 4);
  const alvo = ro4 + lo4;
  const melhor = escalas.reduce((a, b) => (Math.abs(b.n4 - alvo) < Math.abs(a.n4 - alvo) ? b : a));
  res.B = { alvoAbs4: alvo, escalas: escalas.map((e) => ({ formaGama: e.k, nuloAbs4: r1(e.n4) })), formaEscolhida: melhor.k,
    ...tabelaSimetria(melhor.mist, `mistura de escala, λ ~ Gama(${melhor.k}, 1/${melhor.k}), recalibrada pela mediana`) };
  for (const e of escalas) if (e !== melhor) e.mist = null;
  log(`B: forma ${melhor.k}, |z|≥4 no nulo ${r1(melhor.n4)} (observado ${alvo})`);
}

// ---------- C. resíduo pró-13: controles ----------
{
  const K = P.filter((s) => s.s1 != null && s.s2 != null && s.f1 >= 10 && s.f2 >= 10);
  const ord = [...K].sort((a, b) => a.s1 - b.s1);
  const corte = ord[Math.floor((9 * ord.length) / 10)].s1;
  // decil 10 como o autor: as 10% de seções com maior s1 (pela ordem; empates no corte vão para o decil pela posição)
  const d10 = new Set(ord.slice(Math.floor((9 * ord.length) / 10)));
  for (const s of K) {
    s.d10 = d10.has(s) ? 1 : 0; s.y = (100 * s.resAj) / s.a2; s.abst1 = 1 - s.c1 / s.a1;
    s.elim1 = s.out1 / s.c1; s.bnp1 = s.bn1 / s.c1;
  }
  // decis de abstenção do 1º turno (nacionais), como dummies
  const cortesAbst = Array.from({ length: 9 }, (_, j) => quantil(K.map((s) => s.abst1), (j + 1) / 10));
  for (const s of K) s.dAbst = cortesAbst.map((c) => (s.abst1 > c ? 1 : 0));
  const comPerfil = K.filter((s) => s.p60 != null);
  const sumA2d10 = (l) => l.filter((s) => s.d10).reduce((a, s) => a + s.a2, 0);
  const sumResd10 = (l) => l.filter((s) => s.d10).reduce((a, s) => a + s.resAj, 0);
  const especs = {
    C0_so_zona: () => [],
    C1_idade: (s) => [s.p60, s.p60 * s.p60, s.p1624],
    C2_idade_escolaridade_indigena: (s) => [s.p60, s.p60 * s.p60, s.p1624, s.pEb, s.pSup, s.pInd],
    C3_voto_1t: (s) => [s.elim1, s.bnp1, ...s.dAbst],
    C4_tudo: (s) => [s.p60, s.p60 * s.p60, s.p1624, s.pEb, s.pSup, s.pInd, s.elim1, s.bnp1, ...s.dAbst, Math.log(s.a2),
      s.modelo2 === '2013' ? 1 : 0, s.modelo2 === '2015' ? 1 : 0],
  };
  const rodar = (lista) => {
    const out = {};
    const A2 = sumA2d10(lista);
    for (const [nome, f] of Object.entries(especs)) {
      const ctrl = (s) => (nome === 'C0_so_zona' ? [] : f(s));
      const aD = mqEfeitoFixo(lista, { y: (s) => s.y, x: (s) => [s.d10, ...ctrl(s)], w: (s) => s.a2, grupo: (s) => s.zon, cluster: (s) => s.mun });
      const aS = mqEfeitoFixo(lista, { y: (s) => s.y, x: (s) => [s.s1, ...ctrl(s)], w: (s) => s.a2, grupo: (s) => s.zon, cluster: (s) => s.mun });
      const aDS = mqEfeitoFixo(lista, { y: (s) => s.y, x: (s) => [s.d10, s.s1, ...ctrl(s)], w: (s) => s.a2, grupo: (s) => s.zon, cluster: (s) => s.mun });
      out[nome] = {
        n: aD?.n,
        d10_pp: aD ? { b: r3(aD.b[0]), ep: r3(aD.ep[0]), t: r1(aD.b[0] / aD.ep[0]), eleitores: Math.round((aD.b[0] / 100) * A2) } : null,
        s1_por10pp: aS ? { b: r3(aS.b[0] / 10), ep: r3(aS.ep[0] / 10), t: r1(aS.b[0] / aS.ep[0]) } : null,
        d10_alemDoLinear: aDS ? { b: r3(aDS.b[0]), t: r1(aDS.b[0] / aDS.ep[0]), s1_por10pp: r3(aDS.b[1] / 10), tS1: r1(aDS.b[1] / aDS.ep[1]) } : null,
      };
    }
    return out;
  };
  const media = (l) => r3((100 * l.reduce((a, s) => a + s.resAj, 0)) / l.reduce((a, s) => a + s.a2, 0));
  res.C = {
    secoesK: K.length, secoesSemPerfil: K.length - comPerfil.length, corteDecil10: r3(corte),
    decil10: { secoes: d10.size, aptos: sumA2d10(K), excessoAbsoluto: Math.round(sumResd10(K)), excessoMedioPp: media([...d10]),
      excessoMedioPpOutros: media(K.filter((s) => !s.d10)), excessoMedioPpTodos: media(K),
      eleitoresRelativoAMediaNacional: Math.round(sumResd10(K) - (sumA2d10(K) * media(K)) / 100) },
    nacional: rodar(comPerfil),
    porRegiao: Object.fromEntries(['N', 'NE', 'CO', 'SE', 'S', 'EX'].map((r) => {
      const l = comPerfil.filter((s) => REGIAO[s.uf] === r);
      return [r, { secoes: l.length, secoesD10: l.filter((s) => s.d10).length, excessoD10: Math.round(sumResd10(l)), ...rodar(l) }];
    })),
  };
  // onde estão os 17,6 mil: região do decil 10
  res.C.decil10PorRegiao = Object.fromEntries(['N', 'NE', 'CO', 'SE', 'S', 'EX'].map((r) => {
    const l = K.filter((s) => s.d10 && REGIAO[s.uf] === r);
    return [r, { secoes: l.length, excesso: Math.round(l.reduce((a, s) => a + s.resAj, 0)), excessoPp: l.length ? media(l) : null }];
  }));
  log('C resíduo pró-13');
}

// ---------- D. poder do teste de simetria por UF: inserção numa UF só ----------
if (!SEM_PODER) {
  const piNulo4 = new Map(res.A.porUf.filter((l) => l.limiar === 4).map((l) => [l.uf, l.partNulo]));
  const orig = P.map((s) => [s.c2, s.v13_2]);
  const cenarios = [];
  for (const uf of ['ba', 'mg', 'sp', 'rs']) for (const [frac, k] of [[0.01, 10], [0.01, 20], [0.05, 10]]) cenarios.push({ uf, frac, k });
  const REP_PODER = 2;
  const rp = aleatorio(4242);
  res.D = [];
  for (const c of cenarios) {
    const idx = idxUf.get(c.uf);
    const reps = [];
    for (let rep = 0; rep < REP_PODER; rep++) {
      const esc = [...idx];
      for (let i = esc.length - 1; i > 0; i--) { const j = Math.floor(rp() * (i + 1)); [esc[i], esc[j]] = [esc[j], esc[i]]; }
      const alvo = esc.slice(0, Math.max(1, Math.round(idx.length * c.frac)));
      let inseridos = 0;
      for (const i of alvo) { const s = P[i]; const d = Math.min(c.k, s.a2 - s.c2); s.c2 += d; s.v13_2 += d; inseridos += d; }
      modelar(P);
      const z = Float64Array.from(P, (s) => s.z);
      const [R, L] = contar(z, idx, 4);
      const [R3, L3] = contar(z, idx, 3);
      const [Rn, Ln] = contar(z, todosIdx, 3);
      const pM = caudaSup(R + L, 0.5, R), pN = caudaSup(R + L, piNulo4.get(c.uf), R);
      reps.push({ inseridos, R, L, R3, L3, pMetade: +pM.toPrecision(3), pContraNulo: +pN.toPrecision(3),
        // limiar BH conservador para 28 testes: p < 0,05/28 garante q < 0,05 para a UF sozinha
        disparaMetade: pM < 0.05 / 28, disparaContraNulo: pN < 0.05 / 28,
        nacionalR1: { R3: Rn, L3: Ln, dispara: caudaSup(Rn + Ln, 0.5, Rn) < 0.001 } });
      for (const i of alvo) { P[i].c2 = orig[i][0]; P[i].v13_2 = orig[i][1]; }
    }
    res.D.push({ ...c, secoesUf: idx.length, reps });
    log(`D ${c.uf} ${c.frac} +${c.k}: ${reps.map((r) => `${r.R}/${r.L} pM=${r.pMetade} pN=${r.pContraNulo}`).join(' | ')}`);
  }
  modelar(P);
}

await mkdir(SAIDA, { recursive: true });
const arq = path.join(SAIDA, 'acd-alternativas.json');
await writeFile(arq, JSON.stringify(res, null, 1));
log(`→ ${arq}`);
console.log(JSON.stringify({ A: { nacional: res.A.nacional, q05ContraNulo: res.A.ufsQ05ContraNulo, q05Metade: res.A.ufsQ05Metade },
  B: { forma: res.B.formaEscolhida, escalas: res.B.escalas, nacional: res.B.nacional, q05ContraNulo: res.B.ufsQ05ContraNulo },
  C: { decil10: res.C.decil10, nacional: res.C.nacional, NE: res.C.porRegiao.NE, decil10PorRegiao: res.C.decil10PorRegiao } }, null, 1));
