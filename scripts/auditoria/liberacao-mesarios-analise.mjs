// H13, método "mesarios" (passo 2): distribuição das liberações por mesário, cauda de mesários com volume extremo
// e parcela do 13 nas seções desses mesários comparada com a zona e com o 1º turno da mesma seção.
// Entrada: data/parsed/auditoria/liberacao/mesarios-secoes-<t>t.jsonl (liberacao-mesarios-dados.mjs).
// Definições (docs/analysis/hipotese-liberacao-mesario/05):
//   L1 = habilitadosPeloMesario do log ("Mesário … habilitou o eleitor"), por seção e por mesário (pseudônimo);
//   L2 = sem_biometria + por_biografia do BU (todo habilitado sem digital do eleitor).
//   par = (mesário, seção, dia) com ≥ 1 liberação L1. "Topo" = mesário que mais liberou na seção.
//   s13 = votos 13 ÷ (13 + 22). zLOO = s13 da zona sem a própria seção.
// Uso: node --max-old-space-size=8000 scripts/auditoria/liberacao-mesarios-analise.mjs
// Saída: data/parsed/auditoria/liberacao/mesarios-resumo.json, mesarios-cauda-2t.jsonl, mesarios-alvos-log.json
import { createReadStream } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DIR_DADOS } from '../../src/config.js';

const DIR_LIB = path.join(DIR_DADOS, 'parsed', 'auditoria', 'liberacao');
const REGIAO = {};
for (const [r, ufs] of Object.entries({
  Nordeste: 'al ba ce ma pb pe pi rn se', Norte: 'ac am ap pa ro rr to', 'Centro-Oeste': 'df go ms mt',
  Sudeste: 'es mg rj sp', Sul: 'pr rs sc', Exterior: 'zz',
})) for (const uf of ufs.split(' ')) REGIAO[uf] = r;
const NE = 'al ba ce ma pb pe pi rn se'.split(' ');
const ORDEM = ['Brasil', 'Nordeste', ...NE.map((u) => u.toUpperCase()), 'Norte', 'Centro-Oeste', 'Sudeste', 'Sul', 'Exterior'];
const grupos = (uf) => ['Brasil', REGIAO[uf], ...(NE.includes(uf) ? [uf.toUpperCase()] : [])];
const kz = (r) => `${r.uf}/${r.m}/${r.z}`;
const ks = (r) => `${r.uf}/${r.m}/${r.z}/${r.s}`;

async function carregar(turno) {
  const rows = [];
  for await (const linha of createInterface({ input: createReadStream(path.join(DIR_LIB, `mesarios-secoes-${turno}t.jsonl`)), crlfDelay: Infinity })) {
    if (!linha) continue;
    const r = JSON.parse(linha);
    const libs = Object.entries(r.log?.lib ?? {}).sort((a, b) => b[1] - a[1]);
    rows.push({
      k: ks(r), zk: kz(r), uf: r.uf, mun: `${r.uf}/${r.m}`, comp: r.comp, aptos: r.aptos, v13: r.v13, v22: r.v22, V: r.v13 + r.v22,
      L1: r.log?.hm ?? null, dp: r.log?.dp ?? null, ano: r.log?.ano ?? null, bio: r.log?.bio ?? null,
      L2: r.bu ? r.bu.semBio + r.bu.porBiog : null, libs, top: libs[0]?.[1] ?? 0, topPs: libs[0]?.[0] ?? null,
      modelo: r.log?.modelo ?? null, tu: r.tu, raj10: r.log?.raj10 ?? null, semBioUlt: r.log?.semBioUlt ?? null,
      reg: r.log?.reg ?? {}, encM: r.log?.enc_m ?? null, jaVotou: r.log?.jaVotou ?? 0, habVoto: r.log?.habVoto ?? null,
    });
  }
  return rows;
}

function quantis(v) {
  const s = Float64Array.from(v).sort();
  const q = (p) => (s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))] : null);
  return { n: s.length, p50: q(0.5), p90: q(0.9), p99: q(0.99), p999: q(0.999), max: s.length ? s[s.length - 1] : null };
}
const media = (v) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
const mediana = (v) => { if (!v.length) return null; const s = [...v].sort((a, b) => a - b); return s[Math.floor((s.length - 1) / 2)]; };
const r4 = (x) => (x == null || !Number.isFinite(x) ? null : +x.toFixed(4));

function zonas(rows) {
  const z = new Map();
  for (const r of rows) {
    const a = z.get(r.zk) ?? { v13: 0, v22: 0, n: 0, comp: 0, aptos: 0 };
    a.v13 += r.v13; a.v22 += r.v22; a.n++;
    if (r.aptos) { a.comp += r.comp; a.aptos += r.aptos; }
    z.set(r.zk, a);
  }
  return z;
}
// Comparecimento da zona sem a própria seção
const looComp = (z, r) => { const a = z.get(r.zk); const ap = a.aptos - (r.aptos ?? 0); return ap > 0 && r.aptos ? (a.comp - r.comp) / ap : null; };
const loo = (z, r) => { const a = z.get(r.zk); const v13 = a.v13 - r.v13; const V = a.v13 + a.v22 - r.V; return V > 0 ? v13 / V : null; };

// Regressão univariada dentro da zona (média subtraída por zona), erro-padrão agrupado por município
function regZona(itens) {
  const porZ = new Map();
  for (const it of itens) { const a = porZ.get(it.z) ?? { sx: 0, sy: 0, n: 0 }; a.sx += it.x; a.sy += it.y; a.n++; porZ.set(it.z, a); }
  let sxx = 0; let sxy = 0;
  const dm = itens.map((it) => { const a = porZ.get(it.z); const x = it.x - a.sx / a.n; const y = it.y - a.sy / a.n; sxx += x * x; sxy += x * y; return { x, y, g: it.g }; });
  if (!sxx) return null;
  const b = sxy / sxx;
  const porG = new Map();
  for (const d of dm) porG.set(d.g, (porG.get(d.g) ?? 0) + d.x * (d.y - b * d.x));
  let v = 0; for (const s of porG.values()) v += s * s;
  const ep = Math.sqrt(v) / sxx;
  return { b: r4(b), ep: r4(ep), t: +(b / ep).toFixed(1), n: itens.length };
}

const t0 = Date.now();
const d2 = await carregar(2);
const d1 = await carregar(1);
const z2 = zonas(d2);
const z1 = zonas(d1);
const por1 = new Map(d1.map((r) => [r.k, r]));
console.log(`carregado: ${d2.length} + ${d1.length} seções (${((Date.now() - t0) / 1000).toFixed(0)} s)`);

// ---------- 1. Distribuição das liberações (por região, NE por UF, os dois turnos) ----------
function distribuicao(rows) {
  const g = {};
  const novo = () => ({ secoes: 0, comp: 0, L1: 0, L2: 0, compL2: 0, dp: 0, pares: [], top: [], parcelaTop: [], c40: 0, c100: 0, metade: 0, v13: 0, v22: 0, semLog: 0 });
  for (const r of rows) {
    for (const nome of grupos(r.uf)) {
      const a = (g[nome] ??= novo());
      a.secoes++; a.comp += r.comp; a.v13 += r.v13; a.v22 += r.v22;
      if (r.L1 == null) { a.semLog++; continue; }
      a.L1 += r.L1; a.dp += r.dp ?? 0;
      if (r.L2 != null) { a.L2 += r.L2; a.compL2 += r.comp; }
      for (const [, n] of r.libs) a.pares.push(n);
      a.top.push(r.top);
      if (r.L1 >= 10) a.parcelaTop.push(r.top / r.L1);
      if (r.top >= 40) a.c40++;
      if (r.top >= 100) a.c100++;
      if (r.comp >= 100 && r.top / r.comp >= 0.5) a.metade++;
    }
  }
  const out = {};
  for (const nome of ORDEM) {
    const a = g[nome];
    if (!a) continue;
    const pares = quantis(a.pares);
    out[nome] = {
      secoes: a.secoes, semLog: a.semLog, comparecimento: a.comp,
      L1: a.L1, taxaL1: r4(a.L1 / a.comp), L2: a.L2, taxaL2: r4(a.compL2 ? a.L2 / a.compL2 : null),
      manualTotal: a.dp, parcelaL1NoManual: r4(a.dp ? a.L1 / a.dp : null),
      s13: r4(a.v13 / (a.v13 + a.v22)),
      paresMesarioSecao: pares.n, liberacoesPorPar: pares, topoPorSecao: quantis(a.top),
      parcelaDoTopo_secoesL1ge10: { n: a.parcelaTop.length, mediana: r4(mediana(a.parcelaTop)) },
      secoesTopoGe40: a.c40, secoesTopoGe100: a.c100, secoesTopoMetadeDoComparecimento: a.metade,
      porMilSecoesTopoGe40: r4((a.c40 / (a.secoes - a.semLog)) * 1000), porMilSecoesTopoGe100: r4((a.c100 / (a.secoes - a.semLog)) * 1000),
    };
  }
  return out;
}
const dist2 = distribuicao(d2);
const dist1 = distribuicao(d1);

// ---------- 2. Mesmo mesário liberando em mais de uma seção no mesmo dia ----------
function multiSecao(rows) {
  const m = new Map();
  for (const r of rows) for (const [ps, n] of r.libs) { const a = m.get(ps) ?? []; a.push({ k: r.k, n }); m.set(ps, a); }
  const multi = [...m].filter(([, v]) => v.length > 1);
  const porRegiao = {};
  for (const [, v] of multi) {
    const regs = new Set(v.map((x) => REGIAO[x.k.slice(0, 2)]));
    const chave = regs.size === 1 ? [...regs][0] : 'várias';
    porRegiao[chave] = (porRegiao[chave] ?? 0) + 1;
  }
  const mesmaZona = multi.filter(([, v]) => new Set(v.map((x) => x.k.split('/').slice(0, 3).join('/'))).size === 1).length;
  return {
    mesariosQueLiberaram: m.size, emMaisDeUmaSecao: multi.length, todasNaMesmaZona: mesmaZona, porRegiao,
    maiores: multi.map(([ps, v]) => ({ mesario: ps, secoes: v.length, liberacoes: v.reduce((a, x) => a + x.n, 0), lista: v.map((x) => `${x.k}:${x.n}`) }))
      .sort((a, b) => b.liberacoes - a.liberacoes).slice(0, 15),
  };
}
const multi2 = multiSecao(d2);
const multi1 = multiSecao(d1);

// ---------- 3. Cauda: seções cujo mesário-topo liberou ≥ 40 / ≥ 100 ----------
const linhasCauda = [];
function cauda(limiar) {
  const g = {};
  for (const r of d2) {
    if (r.L1 == null || r.V < 20) continue;
    const s = r.v13 / r.V;
    const zl = loo(z2, r);
    if (zl == null) continue;
    const ehCauda = r.top >= limiar;
    const p1 = por1.get(r.k);
    let did = null; let s1 = null; let persistente = null; let top1 = null;
    if (p1 && p1.V >= 20) {
      const zl1 = loo(z1, p1);
      s1 = p1.v13 / p1.V;
      if (zl1 != null) did = (s - zl) - (s1 - zl1);
      top1 = p1.top;
      persistente = p1.libs.some(([ps, n]) => ps === r.topPs && n >= Math.min(40, limiar));
    }
    // Parcela implícita dos liberados L1 se os não liberados votassem como a zona (estimativa ecológica crua)
    const Xv = r.comp ? r.L1 * (r.V / r.comp) : 0;
    const impl = Xv >= 20 ? (r.v13 - zl * (r.V - Xv)) / Xv : null;
    // Limites determinísticos para os L1 da seção: 13 entre os liberados ∈ [lo, hi]
    const lo = Math.max(0, r.v13 - (r.comp - r.L1));
    const hi = Math.min(r.L1, r.v13);
    const lo22 = Math.max(0, r.v22 - (r.comp - r.L1));
    for (const nome of grupos(r.uf)) {
      const a = (g[nome] ??= { cauda: { d: [], did: [], impl: [], pos: 0, persist: 0, comPersist: 0, ue2013: 0, lo: 0, hi: 0, X: 0, lo22: 0, forca13: 0, forca22: 0 }, controle: { d: [], did: [] } });
      const alvo = ehCauda ? a.cauda : (r.top < 10 ? a.controle : null);
      if (!alvo) continue;
      alvo.d.push(s - zl);
      if (did != null) alvo.did.push(did);
      // Rastro esperado de voto inserido em nome de ausente: comparecimento acima da zona (e acima do 1º turno)
      // e "já votou" quando o eleitor verdadeiro aparece depois
      const cz = looComp(z2, r);
      if (cz != null) {
        (alvo.comp ??= []).push(r.comp / r.aptos - cz);
        if (p1 && p1.aptos) { const cz1 = looComp(z1, p1); if (cz1 != null) (alvo.compDiD ??= []).push((r.comp / r.aptos - cz) - (p1.comp / p1.aptos - cz1)); }
      }
      alvo.jaVotou = (alvo.jaVotou ?? 0) + r.jaVotou; alvo.votosLog = (alvo.votosLog ?? 0) + r.comp;
      if (ehCauda) {
        if (s - zl > 0) alvo.pos++;
        if (impl != null) alvo.impl.push(impl);
        if (persistente != null) { alvo.comPersist++; if (persistente) alvo.persist++; }
        if ((r.modelo ?? '').toUpperCase() === 'UE2013') alvo.ue2013++;
        alvo.lo += lo; alvo.hi += hi; alvo.X += r.L1; alvo.lo22 += lo22;
        if (lo > r.L1 / 2) alvo.forca13++;
        if (lo22 > r.L1 / 2) alvo.forca22++;
      }
    }
    if (ehCauda && limiar === 40) {
      linhasCauda.push({
        secao: r.k, regiao: REGIAO[r.uf], modelo: r.modelo, tipoUrna: r.tu, comp: r.comp, aptos: r.aptos, L1: r.L1, L2: r.L2, bio: r.bio,
        topo: r.top, mesarioTopo: r.topPs, topoEleitorDaSecao: r.reg[r.topPs]?.eleitorDaSecao ?? null, topoRegistrado: !!r.reg[r.topPs], topoEncerrou: r.encM === r.topPs,
        v13: r.v13, v22: r.v22, s13: r4(s), zonaLOO: r4(zl), dif: r4(s - zl), s13_1t: r4(s1), DiD: r4(did), topo1t: top1, mesmoMesarioNo1t: persistente,
        implicitaL1: r4(impl), limitesL1: [lo, hi], raj10: r.raj10, semBioUltimaHora: r.semBioUlt,
      });
    }
  }
  const out = {};
  for (const nome of ORDEM) {
    const a = g[nome];
    if (!a) continue;
    const c = a.cauda;
    out[nome] = {
      secoesCauda: c.d.length, difMedia: r4(media(c.d)), difMediana: r4(mediana(c.d)), fracDifPositiva: r4(c.d.length ? c.pos / c.d.length : null),
      DiDmedia: r4(media(c.did)), DiDmediana: r4(mediana(c.did)), nDiD: c.did.length,
      implicitaMediana: r4(mediana(c.impl)), nImplicita: c.impl.length,
      mesmoMesarioNo1t: r4(c.comPersist ? c.persist / c.comPersist : null), fracUE2013: r4(c.d.length ? c.ue2013 / c.d.length : null),
      limites13EntreL1: [r4(c.X ? c.lo / c.X : null), r4(c.X ? c.hi / c.X : null)], minimo22EntreL1: r4(c.X ? c.lo22 / c.X : null),
      secoesQueForcamMaioria13: c.forca13, secoesQueForcamMaioria22: c.forca22,
      comparecimentoMenosZona: r4(media(c.comp ?? [])), comparecimentoDiD: r4(media(c.compDiD ?? [])), jaVotouPorMilVotos: r4(c.votosLog ? (c.jaVotou / c.votosLog) * 1000 : null),
      controle_topoMenor10: {
        secoes: a.controle.d.length, difMedia: r4(media(a.controle.d)), DiDmedia: r4(media(a.controle.did)),
        comparecimentoMenosZona: r4(media(a.controle.comp ?? [])), comparecimentoDiD: r4(media(a.controle.compDiD ?? [])),
        jaVotouPorMilVotos: r4(a.controle.votosLog ? (a.controle.jaVotou / a.controle.votosLog) * 1000 : null),
      },
    };
  }
  return out;
}
const cauda40 = cauda(40);
const cauda100 = cauda(100);

// Controle do viés de seleção: a cauda é escolhida pelo volume do 2º turno, que cresce com o comparecimento do 2º
// turno. Escolhendo a cauda pelo 1º turno (topo do 1º turno ≥ 40), o mesmo efeito deve aparecer com sinal trocado.
function caudaPelo1t(limiar = 40) {
  const g = {};
  for (const r of d2) {
    const p1 = por1.get(r.k);
    if (!p1 || p1.top < limiar || r.V < 20 || p1.V < 20 || !r.aptos || !p1.aptos) continue;
    const cz = looComp(z2, r); const cz1 = looComp(z1, p1); const zl = loo(z2, r); const zl1 = loo(z1, p1);
    if (cz == null || cz1 == null || zl == null || zl1 == null) continue;
    for (const nome of grupos(r.uf)) {
      const a = (g[nome] ??= { n: 0, compDiD: 0, did: 0 });
      a.n++;
      a.compDiD += (r.comp / r.aptos - cz) - (p1.comp / p1.aptos - cz1);
      a.did += (r.v13 / r.V - zl) - (p1.v13 / p1.V - zl1);
    }
  }
  return Object.fromEntries(ORDEM.filter((n) => g[n]).map((n) => [n, { secoes: g[n].n, comparecimentoDiD: r4(g[n].compDiD / g[n].n), DiD13: r4(g[n].did / g[n].n) }]));
}
const caudaSelecionadaNo1t = caudaPelo1t(40);

// ---------- 4. Dose-resposta: faixa da taxa do mesário-topo × (s13 − zona) e DiD ----------
const FAIXAS = [[0, 0.02], [0.02, 0.05], [0.05, 0.1], [0.1, 0.2], [0.2, 0.4], [0.4, 1.01]];
function doseResposta(campo) {
  const g = {};
  for (const r of d2) {
    if (r.L1 == null || r.V < 20 || !r.comp) continue;
    const zl = loo(z2, r);
    if (zl == null) continue;
    const x = (campo === 'topo' ? r.top : campo === 'L1' ? r.L1 : r.L2) / r.comp;
    if (!Number.isFinite(x)) continue;
    const i = FAIXAS.findIndex(([a, b]) => x >= a && x < b);
    if (i < 0) continue;
    const p1 = por1.get(r.k);
    let did = null;
    if (p1 && p1.V >= 20) { const zl1 = loo(z1, p1); if (zl1 != null) did = (r.v13 / r.V - zl) - (p1.v13 / p1.V - zl1); }
    for (const nome of grupos(r.uf)) {
      const a = (g[nome] ??= FAIXAS.map(() => ({ n: 0, sd: 0, sdid: 0, ndid: 0 })));
      a[i].n++; a[i].sd += r.v13 / r.V - zl;
      if (did != null) { a[i].sdid += did; a[i].ndid++; }
    }
  }
  const out = {};
  for (const nome of ORDEM) {
    if (!g[nome]) continue;
    out[nome] = g[nome].map((a, i) => ({ faixa: `${FAIXAS[i][0]}-${Math.min(1, FAIXAS[i][1])}`, n: a.n, difMedia: r4(a.n ? a.sd / a.n : null), DiDmedia: r4(a.ndid ? a.sdid / a.ndid : null) }));
  }
  return out;
}
const dose = { topo: doseResposta('topo'), L1: doseResposta('L1'), L2: doseResposta('L2') };

// ---------- 5. Regressão dentro da zona (Goodman com efeito fixo de zona), por região ----------
function regressoes() {
  const out = {};
  const itens = {};
  for (const r of d2) {
    if (r.L1 == null || r.V < 20 || !r.comp) continue;
    const p1 = por1.get(r.k);
    const reg = {
      L1_2t: { x: r.L1 / r.comp, y: r.v13 / r.V }, topo_2t: { x: r.top / r.comp, y: r.v13 / r.V },
      ...(r.L2 != null ? { L2_2t: { x: r.L2 / r.comp, y: r.v13 / r.V } } : {}),
    };
    if (p1 && p1.V >= 20 && p1.comp && p1.L1 != null) {
      reg.L1_1t = { x: p1.L1 / p1.comp, y: p1.v13 / p1.V };
      reg.deltaL1 = { x: r.L1 / r.comp - p1.L1 / p1.comp, y: r.v13 / r.V - p1.v13 / p1.V };
      if (r.L2 != null && p1.L2 != null) reg.deltaL2 = { x: r.L2 / r.comp - p1.L2 / p1.comp, y: r.v13 / r.V - p1.v13 / p1.V };
    }
    for (const nome of grupos(r.uf)) for (const [m, v] of Object.entries(reg)) ((itens[nome] ??= {})[m] ??= []).push({ ...v, z: r.zk, g: r.mun });
  }
  for (const nome of ORDEM) {
    if (!itens[nome]) continue;
    out[nome] = {};
    for (const [m, v] of Object.entries(itens[nome])) out[nome][m] = regZona(v);
  }
  return out;
}
const reg = regressoes();

// ---------- 6. Alvos para a leitura do log bruto: cauda ≥ 100 + 1 controle por seção (mesma zona, topo < 10) ----------
const porZona = new Map();
for (const r of d2) { if (r.L1 != null && r.top < 10 && r.comp >= 100) { const a = porZona.get(r.zk) ?? []; a.push(r); porZona.set(r.zk, a); } }
const alvos = [];
const usados = new Set();
for (const c of linhasCauda.filter((x) => x.topo >= 100).sort((a, b) => b.topo - a.topo)) {
  alvos.push({ secao: c.secao, papel: 'cauda', mesarioTopo: c.mesarioTopo });
  const zk = c.secao.split('/').slice(0, 3).join('/');
  const cand = (porZona.get(zk) ?? []).filter((r) => !usados.has(r.k)).sort((a, b) => Math.abs(a.comp - c.comp) - Math.abs(b.comp - c.comp))[0];
  if (cand) { usados.add(cand.k); alvos.push({ secao: cand.k, papel: 'controle', parDe: c.secao }); }
}

const resumo = {
  geradoEm: new Date().toISOString(), entradas: ['mesarios-secoes-2t.jsonl', 'mesarios-secoes-1t.jsonl'],
  distribuicao: { '2t': dist2, '1t': dist1 }, multiSecao: { '2t': multi2, '1t': multi1 },
  cauda: { 'topo>=40': cauda40, 'topo>=100': cauda100 }, caudaSelecionadaNo1t, doseResposta: dose, regressaoZona: reg,
  alvosLog: { cauda: alvos.filter((a) => a.papel === 'cauda').length, controle: alvos.filter((a) => a.papel === 'controle').length },
};
await writeFile(path.join(DIR_LIB, 'mesarios-resumo.json'), `${JSON.stringify(resumo, null, 1)}\n`);
await writeFile(path.join(DIR_LIB, 'mesarios-cauda-2t.jsonl'), linhasCauda.sort((a, b) => b.topo - a.topo).map((x) => JSON.stringify(x)).join('\n') + '\n');
await writeFile(path.join(DIR_LIB, 'mesarios-alvos-log.json'), `${JSON.stringify(alvos, null, 1)}\n`);

// ---------- saída de console ----------
console.log('\nDistribuição 2º turno (1º turno entre parênteses)');
for (const nome of ORDEM) {
  const a = dist2[nome]; const b = dist1[nome];
  if (!a) continue;
  console.log(`${nome.padEnd(13)} secoes ${a.secoes} L1 ${a.L1} (${b?.L1}) taxaL1 ${a.taxaL1} (${b?.taxaL1}) taxaL2 ${a.taxaL2} (${b?.taxaL2}) s13 ${a.s13} pares ${a.paresMesarioSecao} q ${JSON.stringify(a.liberacoesPorPar)} topo≥40 ${a.secoesTopoGe40} (${b?.secoesTopoGe40}) ≥100 ${a.secoesTopoGe100} (${b?.secoesTopoGe100}) ‰40 ${a.porMilSecoesTopoGe40}`);
}
console.log('\nMulti-seção 2t:', JSON.stringify({ ...multi2, maiores: multi2.maiores.slice(0, 5) }));
console.log('Multi-seção 1t:', JSON.stringify({ ...multi1, maiores: multi1.maiores.slice(0, 3) }));
for (const [nomeC, c] of [['topo>=40', cauda40], ['topo>=100', cauda100]]) {
  console.log(`\nCauda ${nomeC}`);
  for (const nome of ORDEM) if (c[nome]) console.log(nome.padEnd(13), JSON.stringify(c[nome]));
}
console.log('\nDose-resposta (topo/comp)');
for (const nome of ['Brasil', 'Nordeste', 'Sudeste', 'Sul']) console.log(nome, JSON.stringify(dose.topo[nome]));
console.log('\nRegressão dentro da zona');
for (const nome of ORDEM) if (reg[nome]) console.log(nome.padEnd(13), JSON.stringify(reg[nome]));
console.log(`\nalvos para o log: ${JSON.stringify(resumo.alvosLog)} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
