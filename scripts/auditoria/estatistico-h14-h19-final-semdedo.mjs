// Estatístico eleitoral, H19(b) do plano 31 (commit 067d1a7): liberações à mão sem nenhum dedo lido (Z, 4 tempos
// esgotados), seção a seção, no universo. Fontes já contadas (não relê o diário para as contas):
//   estatistico/h19/captura/<t>t/<uf>.jsonl (cap[0] = Z, F, autorização) e cetico/45/captura/<uf>.jsonl (bio, F, Fcap,
//   bioTmo = reconhecidos com algum tempo esgotado, F0cap por autorização). Os dois são conferidos seção a seção de novo.
// Modelo de referência: beta-binomial Z ~ BB(B; μ_g, ρ_g), g = UF × modelo da urna × turno, momentos ponderados; cauda
// superior por seção; Bonferroni sobre seções × turno com B ≥ 20. Padrão "liberação sem tentar": Z ≥ 10, Z ≥ 50% de F e
// T_R = bioTmo ÷ bio ≤ p90 de T_R em g.
// Família Bz (12 testes, |z| ≥ 2,87): ΔY ~ Δ(Z ÷ B) + controles do M1 e Δcomparecimento ÷ aptos ~ Δ(Z ÷ B) + controles,
// efeito fixo local × modelo, peso 13 + 22, CR1 por local; Brasil e 5 regiões; placebo Y do 1º turno. MDE por injeção
// (fração φ das Z do 2º turno vira voto a mais no candidato, como liberação sem dedo lido).
// Saída: h14-h19-final/semdedo.json, semdedo-secoes.csv (seções marcadas)
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { REGIOES, UFS_BR, amostra, ctrlDe, regredir, todas } from './estatistico-h19-lib.mjs';
import { DIR_FINAL, bbCaudaSup, bh, lerCsv, linhasJsonl, momentosBB, num, pBi, zBonf } from './estatistico-h14-h19-final-lib.mjs';

const t0 = Date.now();
const log = (...m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)} s]`, ...m);
const H19 = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h19', 'captura');
const C45 = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', '45', 'captura');
const med = new Map(todas.map((s) => [`${s.uf}/${s.municipio}/${s.zona}/${s.secao}`, s]));
const aptos = new Map((await lerCsv(path.join(DIR_DADOS, 'parsed', 'auditoria', 'reservas-1t2t', 'secoes.csv'))).map((o) => [`${o.uf}/${o.municipio}/${o.zona}/${o.secao}`, [num(o.a1), num(o.a2)]]));

// ---------- carga e conferência das duas contagens
const sec = new Map();
const conf = { secoes: 0, iguais: 0, diferentes: [] };
for (const uf of UFS.filter((u) => u !== 'zz')) {
  const h = new Map();
  for (const t of [1, 2]) for await (const r of linhasJsonl(path.join(H19, `${t}t`, `${uf}.jsonl`))) { const e = h.get(r.id) ?? {}; e[t] = r; h.set(r.id, e); }
  for await (const r of linhasJsonl(path.join(C45, `${uf}.jsonl`))) {
    const e = h.get(r.id);
    const s = { id: r.id, uf, m: med.get(r.id), t: {} };
    for (const t of [1, 2]) {
      const d = r[`d${t}`];
      if (!d) continue;
      conf.secoes++;
      const x = e?.[t];
      if (x && x.F === d.F && x.cap[0] === d.Fcap[0]) conf.iguais++; else conf.diferentes.push({ id: r.id, t, nosso: x ? { F: x.F, Z: x.cap[0] } : null, c45: { F: d.F, Z: d.Fcap[0] } });
      s.t[t] = { Z: d.Fcap[0], F: d.F, R: d.bio, B: d.bio + d.F, bioTmo: d.bioTmo, votos: d.votos, aut0: d.F0cap, modelo: s.m?.[`modelo${t}`] ?? 'sem' };
    }
    sec.set(r.id, s);
  }
}
log('conferência', JSON.stringify({ ...conf, diferentes: conf.diferentes.length }));

// ---------- contagem no universo
const faixas = [[0, 0], [1, 1], [2, 4], [5, 9], [10, 19], [20, Infinity]];
const faixa = (z) => faixas.findIndex(([a, b]) => z >= a && z <= b);
const univ = {};
for (const t of [1, 2]) {
  const u = (univ[t] = { secoes: 0, Z: 0, F: 0, B: 0, porFaixa: faixas.map(() => 0), porRegiao: {}, porModelo: {}, porUf: {}, autorizacao: { mes: 0, nova: 0, gravada: 0, outra: 0 } });
  const zs = [];
  for (const s of sec.values()) {
    const x = s.t[t]; if (!x) continue;
    u.secoes++; u.Z += x.Z; u.F += x.F; u.B += x.B; u.porFaixa[faixa(x.Z)]++; zs.push(x.Z);
    for (const k of Object.keys(u.autorizacao)) u.autorizacao[k] += x.aut0[k];
    const rg = Object.keys(REGIOES).find((r) => REGIOES[r].includes(s.uf));
    for (const [obj, k] of [[u.porRegiao, rg], [u.porModelo, x.modelo], [u.porUf, s.uf]]) { const e = (obj[k] ??= { secoes: 0, Z: 0, F: 0, B: 0 }); e.secoes++; e.Z += x.Z; e.F += x.F; e.B += x.B; }
  }
  zs.sort((a, b) => b - a);
  const top = Math.ceil(zs.length / 100);
  u.concentracaoTop1pct = zs.slice(0, top).reduce((a, v) => a + v, 0) / u.Z;
  for (const obj of [u.porRegiao, u.porModelo, u.porUf]) for (const e of Object.values(obj)) { e.ZdeF = e.Z / e.F; e.ZdeB = e.Z / e.B; }
}
univ.ambosTurnosZ10 = [...sec.values()].filter((s) => s.t[1]?.Z >= 10 && s.t[2]?.Z >= 10).length;
log('universo', JSON.stringify({ 1: { Z: univ[1].Z, faixas: univ[1].porFaixa }, 2: { Z: univ[2].Z, faixas: univ[2].porFaixa }, ambos10: univ.ambosTurnosZ10 }));

// ---------- beta-binomial por UF × modelo × turno, cauda superior
const grupos = new Map();
for (const s of sec.values()) for (const t of [1, 2]) { const x = s.t[t]; if (!x || x.B < 20) continue; const g = `${s.uf}|${x.modelo}|${t}`; if (!grupos.has(g)) grupos.set(g, []); grupos.get(g).push({ s, t, x }); }
const par = {};
let nTestes = 0;
for (const [g, l] of grupos) {
  const m = momentosBB(l.map(({ x }) => ({ z: x.Z, n: x.B })));
  const mu = Math.max(m.mu, 1e-6), rho = Math.max(m.rho, 1e-6);
  const ab = (1 - rho) / rho;
  par[g] = { ...m, a: mu * ab, b: (1 - mu) * ab };
  const tr = l.map(({ x }) => (x.R > 0 ? x.bioTmo / x.R : 0)).sort((a, b) => a - b);
  par[g].p90TR = tr[Math.floor(0.9 * tr.length)];
  nTestes += l.length;
}
const ZB = zBonf(nTestes) ; const ALFA = 0.05 / nTestes;
const marcadas = [];
const todosP = [];
for (const [g, l] of grupos) {
  const { a, b, p90TR } = par[g];
  for (const { s, t, x } of l) {
    const p = x.Z > 0 ? bbCaudaSup(x.Z, x.B, a, b) : 1;
    todosP.push(p);
    const TR = x.R > 0 ? x.bioTmo / x.R : 0;
    const semTentar = x.Z >= 10 && x.Z >= 0.5 * x.F && TR <= p90TR;
    if (p < ALFA || semTentar || p < 1e-4) marcadas.push({ idx: todosP.length - 1, id: s.id, turno: t, modelo: x.modelo, Z: x.Z, F: x.F, B: x.B, R: x.R, TR, p90TR, p, bonf: p < ALFA, semTentar, aut0: x.aut0, esperado: x.B * par[g].mu });
  }
}
const qTodos = bh(todosP);
const q = marcadas.map((m) => qTodos[m.idx]);
const nBH = qTodos.filter((v) => v < 0.05).length;
const bonf = marcadas.filter((m) => m.bonf), semT = marcadas.filter((m) => m.semTentar);
const resumoMarcadas = (l) => ({ secoesTurno: l.length, secoes: new Set(l.map((m) => m.id)).size, porTurno: { 1: l.filter((m) => m.turno === 1).length, 2: l.filter((m) => m.turno === 2).length },
  Z: l.reduce((a, m) => a + m.Z, 0), ZEsperado: l.reduce((a, m) => a + m.esperado, 0), autorizacao: l.reduce((a, m) => { for (const k of Object.keys(m.aut0)) a[k] = (a[k] ?? 0) + m.aut0[k]; return a; }, {}) });
log('beta-binomial', JSON.stringify({ testes: nTestes, alfa: ALFA, bonf: resumoMarcadas(bonf), semTentar: resumoMarcadas(semT), ambos: marcadas.filter((m) => m.bonf && m.semTentar).length }));

// ---------- família Bz: voto e comparecimento (na amostra do doc 21, local × modelo)
const Z_BZ = zBonf(12), Z80 = 0.8416;
const zfr = (s, t) => { const x = sec.get(s.id)?.t[t]; return x && x.B > 0 ? x.Z / x.B : NaN; };
for (const s of amostra) { s.zb1 = zfr(s, 1); s.zb2 = zfr(s, 2); s.Z2 = sec.get(s.id)?.t[2]?.Z ?? 0; const ap = aptos.get(s.id); s.a1x = ap?.[0]; s.a2x = ap?.[1]; }
function linhas(lista, desf, inj = null) {
  const out = [];
  for (const s of lista) {
    if (!Number.isFinite(s.zb1) || !Number.isFinite(s.zb2)) continue;
    let k = 0, v13 = s.v13_2, v22 = s.v22_2, B2 = s.B2, Z2 = s.Z2, votos2 = s.votos2;
    if (inj) { k = inj.phi * s.Z2; Z2 += k; B2 += k; votos2 += k; if (inj.cand === 13) v13 += k; else v22 += k; }
    const dz = Z2 / B2 - s.zb1;
    const y = desf === 'comp' ? (s.a1x > 0 && s.a2x > 0 ? 100 * ((s.comp2 + k) / s.a2x - s.comp1 / s.a1x) : NaN) : desf === 'placebo' ? 100 * s.Y1 : 100 * (v13 / (v13 + v22) - s.Y1);
    if (!Number.isFinite(y)) continue;
    out.push({ g: s.g, cl: s.cl, w: s.v13_2 + s.v22_2, x: [dz], c: ctrlDe({ ...s, xanb2: s.anb2 / votos2 }), y });
  }
  return out;
}
const UNI = [['Brasil', UFS_BR], ...Object.entries(REGIOES)];
const familia = [];
const det = {};
for (const [u, ufs] of UNI) {
  const L = amostra.filter((s) => ufs.includes(s.uf));
  const ZS = L.reduce((a, s) => a + s.Z2, 0);
  det[u] = { secoes: L.length, Z2: ZS };
  for (const desf of ['voto', 'comp']) {
    const r = regredir(linhas(L, desf));
    const z = r.beta[0] / r.se[0];
    const e = { unidade: u, desfecho: desf, beta: r.beta[0], se: r.se[0], z, p: pBi(z), passa: Math.abs(z) >= Z_BZ, mdeBeta: (Z_BZ + Z80) * r.se[0], N: r.N };
    if (desf === 'voto') {
      const pl = regredir(linhas(L, 'placebo'));
      e.placeboZ = pl.beta[0] / pl.se[0];
      e.injecao = {};
      for (const cand of [13, 22]) {
        const ri = regredir(linhas(L, 'voto', { phi: 0.01, cand }));
        const dz = Math.abs(ri.beta[0] / ri.se[0] - z);
        const phi = dz > 0 ? (0.01 * (Z_BZ + Z80)) / dz : null;
        e.injecao[cand] = { deslocamentoZ: dz, phiMDE: phi, votosMDE: phi !== null ? phi * ZS : null };
      }
    }
    familia.push(e);
    log(u, desf, z.toFixed(2));
  }
}
const qf = bh(familia.map((f) => f.p));
familia.forEach((f, i) => { f.qBH = qf[i]; });
for (const u of UNI.map(([n]) => n)) {
  const v = familia.find((f) => f.unidade === u && f.desfecho === 'voto'), c = familia.find((f) => f.unidade === u && f.desfecho === 'comp');
  v.compativelH19 = v.passa && (Math.abs(v.placeboZ) < 2 || Math.sign(v.placeboZ) !== Math.sign(v.z)) && Math.sign(c.z) === Math.sign(v.z) && Math.abs(c.z) >= 2;
}
const R = { geradoEm: new Date().toISOString(), plano: '31 (commit 067d1a7)', conferencia: { ...conf, diferentes: conf.diferentes.slice(0, 50), nDiferentes: conf.diferentes.length },
  universo: univ, betaBinomial: { testes: nTestes, alfaBonferroni: ALFA, zEquivalente: ZB, parametros: par, bonferroni: resumoMarcadas(bonf), semTentar: resumoMarcadas(semT), ambos: marcadas.filter((m) => m.bonf && m.semTentar).length, bh5pct: nBH },
  familiaBz: { testes: familia.length, corte: Z_BZ, passam: familia.filter((f) => f.passa).length, compativeisH19: familia.filter((f) => f.compativelH19).length, lista: familia }, unidades: det };
await writeFile(path.join(DIR_FINAL, 'semdedo.json'), JSON.stringify(R, null, 1));
marcadas.forEach((m, i) => { m.q = q[i]; });
marcadas.sort((a, b) => a.p - b.p);
await writeFile(path.join(DIR_FINAL, 'semdedo-secoes.csv'), ['id;turno;modelo;Z;F;B;R;TR;p90TR;p;q;bonferroni;semTentar;aut0_mes;aut0_nova;aut0_gravada;aut0_outra', ...marcadas.map((m) => [m.id, m.turno, m.modelo, m.Z, m.F, m.B, m.R, m.TR.toFixed(4), m.p90TR.toFixed(4), m.p.toExponential(3), m.q.toExponential(3), m.bonf ? 1 : 0, m.semTentar ? 1 : 0, m.aut0.mes, m.aut0.nova, m.aut0.gravada, m.aut0.outra].join(';'))].join('\n') + '\n');
log('fim');
