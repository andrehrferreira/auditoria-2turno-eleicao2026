// Cético, parecer 58: reprodução própria da H19(a) (família A, 24 testes nas seções isoladas) e da família Bz da H19(b)
// (liberação sem dedo lido × voto), com o sinal do Norte, e testes adversariais. Não importa a lib do autor nem a do doc 21:
// a carga, a elegibilidade, o salto J', as regressões e a contagem Z vêm daqui e de cetico-58-lib.mjs.
// Entradas: estatistico/h19/medidas.csv.gz (medidas por seção do doc 21), reservas-1t2t/secoes.csv (aptos do BU),
//   cetico/45/captura/<uf>.jsonl (Z = liberações à mão com 0 dedo lido, contador do parecer 45),
//   cetico-revisor/58/javotou.csv (perfil_log do banco: "O eleitor identificado já votou" por seção e turno).
// Saída: data/parsed/auditoria/cetico-revisor/58/h19.json
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { csv, mqp, n, p2, zBonf } from './cetico-58-lib.mjs';

const P = path.join(DIR_DADOS, 'parsed', 'auditoria');
const SAIDA = path.join(P, 'cetico-revisor', '58');
await mkdir(SAIDA, { recursive: true });
const t0 = Date.now();
const log = (...m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)} s]`, ...m);
const REG = { Nordeste: ['al', 'ba', 'ce', 'ma', 'pb', 'pe', 'pi', 'rn', 'se'], Norte: ['ac', 'am', 'ap', 'pa', 'ro', 'rr', 'to'], 'Centro-Oeste': ['df', 'go', 'ms', 'mt'], Sudeste: ['es', 'mg', 'rj', 'sp'], Sul: ['pr', 'rs', 'sc'] };
const UFS = Object.values(REG).flat();

// ---------- carga
const med = await csv(path.join(P, 'estatistico', 'h19', 'medidas.csv.gz'));
const TXT = new Set(['uf', 'municipio', 'zona', 'secao', 'modelo1', 'modelo2']);
const todas = med.map((o) => { const s = {}; for (const [k, v] of Object.entries(o)) s[k] = TXT.has(k) ? v : v === '' ? null : Number(v); return s; });
const apt = new Map((await csv(path.join(P, 'reservas-1t2t', 'secoes.csv'))).map((o) => [`${o.uf}/${o.municipio}/${o.zona}/${o.secao}`, { a1: n(o.a1), a2: n(o.a2), agreg2: n(o.agreg2) }]));
const cap = new Map();
for (const uf of UFS) {
  for (const l of (await readFile(path.join(P, 'cetico', '45', 'captura', `${uf}.jsonl`), 'utf8')).split('\n')) {
    if (!l) continue;
    const r = JSON.parse(l);
    cap.set(r.id, { Z1: r.d1?.Fcap?.[0], B1: r.d1 ? r.d1.bio + r.d1.F : null, Z2: r.d2?.Fcap?.[0], B2: r.d2 ? r.d2.bio + r.d2.F : null });
  }
}
const jv = new Map();
for (const o of await csv(path.join(SAIDA, 'javotou.csv'))) { const id = `${o.uf}/${o.municipio}/${o.zona}/${o.secao}`; const e = jv.get(id) ?? {}; e[o.turno] = { jv: n(o.jv), vc: n(o.vc) }; jv.set(id, e); }
log('carga', todas.length, cap.size, jv.size);

// ---------- elegibilidade (plano 20, sem a regra "sozinha no grupo")
const exc = {};
const fora = (m) => { exc[m] = (exc[m] ?? 0) + 1; };
const E = [];
for (const s of todas) {
  if (!s.bate1 || !s.bate2) { fora('diário ≠ BU'); continue; }
  if (s.M1 + s.H1 !== s.F1 || s.M2 + s.H2 !== s.F2) { fora('V3m+V3s ≠ F'); continue; }
  if (s.R1 + s.F1 < 20 || s.R2 + s.F2 < 20 || s.R1 < 10 || s.R2 < 10) { fora('B<20 ou R<10'); continue; }
  if (s.v13_1 + s.v22_1 < 20 || s.v13_2 + s.v22_2 < 20) { fora('13+22<20'); continue; }
  if (!s.eleitores || s.idade70 === null) { fora('sem perfil'); continue; }
  if (s.local2 === null || !s.modelo2) { fora('sem local/modelo'); continue; }
  s.id = `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`;
  s.gLoc = `${s.id.split('/').slice(0, 3).join('/')}/${s.local2}/${s.modelo2}`;
  s.loc = `${s.id.split('/').slice(0, 3).join('/')}/${s.local2}`;
  s.gZon = `${s.uf}/${s.municipio}/${s.zona}/${s.modelo2}`;
  s.mun = `${s.uf}/${s.municipio}`;
  s.B1 = s.R1 + s.F1; s.B2 = s.R2 + s.F2;
  s.f1 = s.F1 / s.B1; s.f2 = s.F2 / s.B2; s.a1 = s.tentR1 / s.R1; s.a2 = s.tentR2 / s.R2; s.h1 = s.H1 / s.B1; s.h2 = s.H2 / s.B2;
  s.Y1 = s.v13_1 / (s.v13_1 + s.v22_1); s.Y2 = s.v13_2 / (s.v13_2 + s.v22_2);
  s.dAnb = s.anb2 / s.votos2 - s.anb1 / s.votos1;
  s.troc = s.urna1 !== s.urna2 ? 1 : 0;
  const a = apt.get(s.id); s.ap1 = a?.a1; s.ap2 = a?.a2; s.agreg2 = a?.agreg2;
  s.Q = s.ap2 > 0 && s.eleitores < 0.5 * s.ap2 ? 1 : 0; // perfil "quebrado" (parecer 54): perfil abaixo da metade dos aptos
  const c = cap.get(s.id); s.zb1 = c && c.B1 > 0 ? c.Z1 / c.B1 : NaN; s.zb2 = c && c.B2 > 0 ? c.Z2 / c.B2 : NaN; s.Z2 = c?.Z2 ?? 0;
  const j = jv.get(s.id); s.djv = j?.[1] && j?.[2] && j[1].vc > 0 && j[2].vc > 0 ? 100 * (j[2].jv / j[2].vc - j[1].jv / j[1].vc) : NaN;
  E.push(s);
}
const cnt = (k) => { const m = new Map(); for (const s of E) m.set(s[k], (m.get(s[k]) ?? 0) + 1); return m; };
const nL = cnt('gLoc'), nZ = cnt('gZon');
for (const s of E) s.iso = nL.get(s.gLoc) === 1 ? 1 : 0;
const R = { geradoEm: new Date().toISOString(), exclusoes: exc, elegiveis: E.length, isoladas: E.filter((s) => s.iso).length,
  isoladasSozinhasZonaModelo: E.filter((s) => s.iso && nZ.get(s.gZon) === 1).length };
R.perfilQuebrado = { elegiveis: E.filter((s) => s.Q).length, isoladas: E.filter((s) => s.iso && s.Q).length, naoIsoladas: E.filter((s) => !s.iso && s.Q).length,
  norteNaoIsoladas: E.filter((s) => !s.iso && s.Q && REG.Norte.includes(s.uf)).length, paNaoIsoladas: E.filter((s) => !s.iso && s.Q && s.uf === 'pa').length,
  semAptos: E.filter((s) => !(s.ap2 > 0)).length };
log('elegíveis', R.elegiveis, 'isoladas', R.isoladas, 'Q', JSON.stringify(R.perfilQuebrado));

// ---------- Parte 1-iso: J' contra a zona × modelo sem a seção
const lg = (x, y) => Math.log((x + 0.5) / (y + 0.5));
const T = new Map();
for (const s of E) { const t = T.get(s.gZon) ?? { F1: 0, R1: 0, F2: 0, R2: 0, n: 0 }; t.F1 += s.F1; t.R1 += s.R1; t.F2 += s.F2; t.R2 += s.R2; t.n++; T.set(s.gZon, t); }
for (const s of E) {
  const t = T.get(s.gZon);
  if (t.n < 2) { s.J = null; continue; }
  const o = { F1: t.F1 - s.F1, R1: t.R1 - s.R1, F2: t.F2 - s.F2, R2: t.R2 - s.R2 };
  s.J = lg(s.F2, s.R2) - lg(s.F1, s.R1) - (lg(o.F2, o.R2) - lg(o.F1, o.R1));
  s.V = [s.F1, s.R1, s.F2, s.R2, o.F1, o.R1, o.F2, o.R2].reduce((a, v) => a + 1 / (v + 0.5), 0);
  s.dF = s.f2 - s.f1 - (o.F2 / (o.F2 + o.R2) - o.F1 / (o.F1 + o.R1));
}
const medn = (v) => { const a = Float64Array.from(v).sort(); const k = a.length; return k % 2 ? a[(k - 1) / 2] : (a[k / 2 - 1] + a[k / 2]) / 2; };
for (const grupo of [1, 0]) for (const uf of UFS) {
  const v = E.filter((s) => s.iso === grupo && s.uf === uf && s.J !== null);
  if (!v.length) continue;
  const m = medn(v.map((s) => s.J)), mad = 1.4826 * medn(v.map((s) => Math.abs(s.J - m)));
  const tau2 = Math.max(0, mad * mad - medn(v.map((s) => s.V)));
  for (const s of v) s.zo = (s.J - m) / Math.sqrt(s.V + tau2);
}
for (const s of E) { s.Sup = s.J !== null && s.zo >= 3 && s.dF >= 0.05 ? 1 : 0; s.Sdn = s.J !== null && s.zo <= -3 && s.dF <= -0.05 ? 1 : 0; }
const testadas = E.filter((s) => s.iso && s.J !== null);
const zb = zBonf(testadas.length);
R.parte1 = { testadas: testadas.length, corte: zb, sobe: testadas.filter((s) => s.zo >= zb).length, desce: testadas.filter((s) => s.zo <= -zb).length,
  Ssobe: testadas.filter((s) => s.Sup).length, Sdesce: testadas.filter((s) => s.Sdn).length,
  top5: [...testadas].sort((a, b) => b.zo - a.zo).slice(0, 5).map((s) => ({ id: s.id, z: +s.zo.toFixed(2) })) };
log('parte 1', JSON.stringify(R.parte1));

// ---------- controles do M1 (os do plano 20)
const ctrl = (s) => { const e = s.eleitores; return [1 - s.biometria / e, s.idade60 / e, s.idade70 / e, s.idade16a24 / e, s.escolBaixa / e, s.superior / e, Math.log(e), s.troc, s.f1, s.a1, s.dAnb]; };
const ctrlSemPerfil = (s) => [Math.log(s.ap2 > 0 ? s.ap2 : s.eleitores), s.troc, s.f1, s.a1, s.dAnb];
const Yv = { voto: (s) => 100 * (s.Y2 - s.Y1), placebo: (s) => 100 * s.Y1, comp: (s) => (s.ap1 > 0 && s.ap2 > 0 ? 100 * (s.comp2 / s.ap2 - s.comp1 / s.ap1) : NaN), jv: (s) => s.djv };

// ---------- família A (M1-iso e M2-iso, 6 unidades)
const ZA = zBonf(24);
const UNI = [['Brasil', UFS], ...Object.entries(REG)];
R.familiaA = []; R.familiaAsemQ = [];
for (const semQ of [false, true]) for (const [u, ufs] of UNI) {
  const L = E.filter((s) => ufs.includes(s.uf) && (!semQ || !s.Q));
  const destino = semQ ? R.familiaAsemQ : R.familiaA;
  for (const mod of ['M1', 'M2']) {
    const linha = (s, d = 'voto') => {
      const dx = [s.a2 - s.a1, s.f2 - s.f1, s.h2 - s.h1];
      const x = mod === 'M1' ? [...dx.map((v) => v * s.iso), ...dx.map((v) => v * (1 - s.iso))] : [s.Sup * s.iso, s.Sdn * s.iso, s.Sup * (1 - s.iso), s.Sdn * (1 - s.iso)];
      return { y: Yv[d](s), x: [...x, ...ctrl(s), s.iso], w: s.v13_2 + s.v22_2, fe: s.gZon, cl: s.mun };
    };
    const r = mqp(L.map((s) => linha(s)));
    const rc = mqp(L.map((s) => linha(s, 'comp')));
    const nomes = mod === 'M1' ? ['Δa', 'Δf', 'Δh'] : ['S↑'];
    nomes.forEach((nm, j) => destino.push({ unidade: u, modelo: mod, coef: nm, beta: +r.beta[j].toFixed(3), z: +r.z[j].toFixed(2), compZ: +rc.z[j].toFixed(2), passa: Math.abs(r.z[j]) >= ZA }));
  }
}
R.familiaAresumo = { corte: ZA, passam: R.familiaA.filter((f) => f.passa).length, maiorAbsZ: Math.max(...R.familiaA.map((f) => Math.abs(f.z))),
  semPerfilQuebrado: { passam: R.familiaAsemQ.filter((f) => f.passa).length, maiorAbsZ: Math.max(...R.familiaAsemQ.map((f) => Math.abs(f.z))) } };
log('família A', JSON.stringify(R.familiaAresumo));

// ---------- família Bz (amostra do doc 21: elegíveis com vizinha no local × modelo)
const A = E.filter((s) => !s.iso && Number.isFinite(s.zb1) && Number.isFinite(s.zb2));
const ZBz = zBonf(12);
const bz = (lista, d, { semPerfil = false, fe = (s) => s.gLoc } = {}) => {
  const r = mqp(lista.map((s) => ({ y: Yv[d](s), x: [s.zb2 - s.zb1, ...(semPerfil ? ctrlSemPerfil(s) : ctrl(s))], w: s.v13_2 + s.v22_2, fe: fe(s), cl: s.loc })));
  return { beta: +r.beta[0].toFixed(3), ep: +r.ep[0].toFixed(3), z: +r.z[0].toFixed(2), N: r.N };
};
R.familiaBz = [];
for (const [u, ufs] of UNI) {
  const L = A.filter((s) => ufs.includes(s.uf));
  const v = bz(L, 'voto'), c = bz(L, 'comp'), p = bz(L, 'placebo');
  const vq = bz(L.filter((s) => !s.Q), 'voto');
  R.familiaBz.push({ unidade: u, voto: v, comp: c, placebo: p, passa: Math.abs(v.z) >= ZBz, votoSemPerfilQuebrado: vq });
  log('Bz', u, v.z, c.z, p.z);
}
// ---------- Norte, adversarial
const N_ = A.filter((s) => REG.Norte.includes(s.uf));
const norte = (R.norte = { secoes: N_.length, corte: ZBz });
norte.porUF = Object.fromEntries(REG.Norte.map((uf) => { const L = N_.filter((s) => s.uf === uf); return [uf, L.length > 50 ? { n: L.length, voto: bz(L, 'voto'), comp: bz(L, 'comp') } : { n: L.length }]; }));
norte.semPA = { voto: bz(N_.filter((s) => s.uf !== 'pa'), 'voto') };
norte.semPerfilQuebrado = { excluidas: N_.filter((s) => s.Q).length, voto: bz(N_.filter((s) => !s.Q), 'voto') };
norte.semAgregadas = { excluidas: N_.filter((s) => s.agreg2 > 0).length, voto: bz(N_.filter((s) => !(s.agreg2 > 0)), 'voto') };
norte.controlesSemPerfil = { voto: bz(N_, 'voto', { semPerfil: true }) };
norte.semTrocadas = { voto: bz(N_.filter((s) => !s.troc), 'voto'), comp: bz(N_.filter((s) => !s.troc), 'comp') };
norte.jaVotou = { comDado: N_.filter((s) => Number.isFinite(s.djv)).length, desfechoDeltaJaVotouPor100Votos: bz(N_.filter((s) => Number.isFinite(s.djv)), 'jv') };
norte.brasilJaVotou = bz(A.filter((s) => Number.isFinite(s.djv)), 'jv');
// tamanho: votos do 13 implicados = β/100 × ΔZ/B × (13+22) somados onde o termo é positivo
const bN = R.familiaBz.find((f) => f.unidade === 'Norte').voto.beta;
norte.votosImplicadosPositivos = N_.reduce((a, s) => { const v = (bN / 100) * (s.zb2 - s.zb1) * (s.v13_2 + s.v22_2); return a + Math.max(0, v); }, 0);
norte.deltaZBdistribuicao = (() => { const d = N_.map((s) => s.zb2 - s.zb1).sort((a, b) => a - b); const q = (p) => d[Math.floor(p * (d.length - 1))]; return { p1: q(0.01), p50: q(0.5), p99: q(0.99), max: d.at(-1) }; })();
// Poder do rastro: se o ganho do 13 viesse de voto inserido (k votos no 13 onde Z subiu), ΔY ≈ 100·k·(1 − Y₂)/n e
// Δcomparecimento ≈ 100·k/aptos. Logo o coeficiente esperado no comparecimento é β_voto × n/(aptos·(1 − Y₂)).
{
  const L = N_.filter((s) => s.ap2 > 0 && s.Y2 < 0.99);
  const W = L.reduce((a, s) => a + s.v13_2 + s.v22_2, 0);
  const razao = L.reduce((a, s) => a + (s.v13_2 + s.v22_2) * ((s.v13_2 + s.v22_2) / (s.ap2 * (1 - s.Y2))), 0) / W;
  const fb = R.familiaBz.find((f) => f.unidade === 'Norte');
  const esperado = fb.voto.beta * razao;
  norte.rastroInsercao = { razaoComparecimentoPorVoto: razao, betaCompEsperado: esperado, betaCompObservado: fb.comp.beta, epComp: fb.comp.ep,
    zContraEsperado: (fb.comp.beta - esperado) / fb.comp.ep, ic95Comp: [fb.comp.beta - 1.96 * fb.comp.ep, fb.comp.beta + 1.96 * fb.comp.ep] };
}
R.familiaBzResumo ={ corte: ZBz, passam: R.familiaBz.filter((f) => f.passa).length };
await writeFile(path.join(SAIDA, 'h19.json'), JSON.stringify(R, null, 1));
log('fim', JSON.stringify({ A: R.familiaAresumo, Bz: R.familiaBzResumo }));
