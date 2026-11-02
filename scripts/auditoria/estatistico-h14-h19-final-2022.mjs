// Estatístico eleitoral, H19(c) do plano 31 (commit 067d1a7): falha alta e igual nos dois turnos de 2026, vista contra a
// linha de base de 2022 (MG, PR, SC, RS; diários lidos por estatistico-h14-h19-final-2022-captura.mjs).
//   Conferência: liberações à mão = V3m + V3s e reconhecidos = V1 de secoes-<uf>-2022-diario.csv (docs 24 e 26); UF sai se
//   as divergências passarem de 0,5% das seções.
//   Ligação 2022 ↔ 2026 pela chave UF/município/zona/seção; aptos de 2026 entre 0,75 e 1,33 vezes os de 2022; em 2026 a
//   seção não recebe agregada (agreg2 = 0). Robustez: mesmo código de local nos dois anos.
//   f₂₂, f₂₆ (dois turnos somados); E_s = [logit f₂₆ − logit f₂₆ de g] − [logit f₂₂ − logit f₂₂ de g], g = local × modelo
//   de 2026 sem a seção; τ² pelo MAD por UF. (c1) persistência; (c2) falha alta nos dois turnos de 2026 e normal em 2022.
//   Família C22 (12 testes, |z| ≥ 2,87): ΔY (parcela do 13, 2º turno 2026 − 2022) e ΔC (comparecimento, idem) ~ E_s +
//   controles (perfil 2026, mudança de modelo, mesma urna física quando identificável, log aptos, logit f₂₂), efeito fixo g,
//   peso 13 + 22 de 2026, CR1 por local; MG, PR, SC, RS, Sul, as 4. MDE por injeção.
// Saída: h14-h19-final/linha2022.json e linha2022-topo.csv
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { regredir, todas } from './estatistico-h19-lib.mjs';
import { DIR_FINAL, bh, lerCsv, linhasJsonl, mediana, num, pBi, zBonf } from './estatistico-h14-h19-final-lib.mjs';

const t0 = Date.now();
const log = (...m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)} s]`, ...m);
// --ufs só para teste parcial; o resultado do doc 32 usa as 4
const UFS4 = (parseArgs({ options: { ufs: { type: 'string', default: 'mg,pr,sc,rs' } } }).values.ufs).split(',');
const H13 = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h13-v2');
const logit = (x, y) => Math.log((x + 0.5) / (y + 0.5));
const expit = (v) => 1 / (1 + Math.exp(-v));

// ---------- 2022: contagem nova × vias já gravadas
const c22 = new Map();
const conf = {};
for (const uf of UFS4) {
  const vias = new Map((await lerCsv(path.join(H13, `secoes-${uf}-2022-diario.csv`))).map((o) => [o.id, o]));
  const c = (conf[uf] = { secoes: 0, iguais: 0, diferentes: 0, exemplos: [] });
  for (const t of [1, 2]) {
    for await (const r of linhasJsonl(path.join(DIR_FINAL, 'captura2022', `${uf}-${t}t.jsonl`))) {
      const v = vias.get(r.id);
      c.secoes++;
      const ok = v && num(v[`v3m_${t}`]) + num(v[`v3s_${t}`]) === r.F && num(v[`v1_${t}`]) === r.R && !r.erro;
      if (ok) c.iguais++; else { c.diferentes++; if (c.exemplos.length < 10) c.exemplos.push({ id: r.id, t, nosso: { F: r.F, R: r.R, erro: r.erro }, vias: v ? { v1: v[`v1_${t}`], v3m: v[`v3m_${t}`], v3s: v[`v3s_${t}`] } : null }); }
      const e = c22.get(r.id) ?? { urnas: new Set() };
      e[t] = r; for (const u of Object.keys(r.urnas ?? {})) e.urnas.add(Number(u));
      c22.set(r.id, e);
    }
  }
  c.fracDiferentes = c.diferentes / c.secoes;
  c.sai = c.fracDiferentes > 0.005;
}
log('conferência 2022', JSON.stringify(conf));
const UFS = UFS4.filter((u) => !conf[u].sai);

// ---------- ligação
const s22 = new Map((await lerCsv(path.join(H13, 'secoes-2022.csv'))).map((o) => [o.id, o]));
const s26 = new Map((await lerCsv(path.join(DIR_DADOS, 'parsed', 'auditoria', 'reservas-1t2t', 'secoes.csv'))).map((o) => [`${o.uf}/${o.municipio}/${o.zona}/${o.secao}`, o]));
const lig = { candidatas2026: 0, sem2022: 0, semDiario2022: 0, aptosFora: 0, agregada: 0, semMedidas: 0, poucos: 0, ligadas: 0 };
const L = [];
for (const m of todas) {
  if (!UFS.includes(m.uf)) continue;
  const id = `${m.uf}/${m.municipio}/${m.zona}/${m.secao}`;
  lig.candidatas2026++;
  const a = s22.get(id), d = c22.get(id), b = s26.get(id);
  if (!a) { lig.sem2022++; continue; }
  if (!d || !d[1] || !d[2]) { lig.semDiario2022++; continue; }
  if (!b) { lig.semMedidas++; continue; }
  const ap26 = num(b.a2), ap22 = num(a.aptos_2);
  if (!(ap22 > 0) || ap26 / ap22 < 0.75 || ap26 / ap22 > 1.33) { lig.aptosFora++; continue; }
  if (num(b.agreg2) !== 0) { lig.agregada++; continue; }
  const R22 = d[1].R + d[2].R, F22 = d[1].F + d[2].F, R26 = m.R1 + m.R2, F26 = m.F1 + m.F2;
  if (R22 < 20 || R26 < 20 || m.v13_2 + m.v22_2 < 20 || !(num(a.v13_2) + num(a.v22_2) >= 20) || !(num(a.comp_2) > 0) || !m.eleitores || m.local2 === null) { lig.poucos++; continue; }
  lig.ligadas++;
  L.push({ id, uf: m.uf, m, R22, F22, R26, F26, Ra: m.R1, Fa: m.F1, Rb: m.R2, Fb: m.F2,
    Z22: d[1].cap[0] + d[2].cap[0], B22: R22 + F22, g: `${m.uf}/${m.municipio}/${m.zona}/${m.local2}/${m.modelo2}`, cl: `${m.uf}/${m.municipio}/${m.zona}/${m.local2}`,
    mesmoLocal: String(Number(a.local_2)) === String(m.local2), mudouModelo: String(a.modelo_2).toLowerCase() !== m.modelo2 ? 1 : 0,
    urnas22: d.urnas, urna26: m.urna2, ap26, ap22,
    Y26: m.v13_2 / (m.v13_2 + m.v22_2), Y22: num(a.v13_2) / (num(a.v13_2) + num(a.v22_2)), C26: num(b.c2) / ap26, C22: num(a.comp_2) / ap22 });
}
// urna física: o número do diário de 2026 é o do BU com zeros à esquerda; vale se algum casar
let casam = 0;
for (const s of L) { s.mesmaUrna = s.urnas22.has(Number(s.urna26)) ? 1 : 0; casam += s.mesmaUrna; }
lig.mesmaUrnaIdentificavel = casam;
log('ligação', JSON.stringify(lig));

// ---------- medidas por grupo (local × modelo de 2026, sem a seção)
function medir(lista, inj = null) {
  const tot = new Map();
  for (const s of lista) {
    const k = inj?.get(s.id) ?? 0;
    s._F26 = s.F26 + k; s._R26 = s.R26;
    const t = tot.get(s.g) ?? { F22: 0, R22: 0, F26: 0, R26: 0, Fa: 0, Ra: 0, Fb: 0, Rb: 0, n: 0 };
    t.F22 += s.F22; t.R22 += s.R22; t.F26 += s._F26; t.R26 += s.R26; t.Fa += s.Fa + k / 2; t.Ra += s.Ra; t.Fb += s.Fb + k / 2; t.Rb += s.Rb; t.n++;
    tot.set(s.g, t);
  }
  for (const s of lista) {
    const t = tot.get(s.g), k = inj?.get(s.id) ?? 0;
    s.nG = t.n;
    if (t.n < 2) { s.E = null; continue; }
    const P = { F22: t.F22 - s.F22, R22: t.R22 - s.R22, F26: t.F26 - s._F26, R26: t.R26 - s.R26 };
    const l26 = logit(s._F26, s.R26) - logit(P.F26, P.R26), l22 = logit(s.F22, s.R22) - logit(P.F22, P.R22);
    s.E = l26 - l22;
    s.V = [s._F26, s.R26, P.F26, P.R26, s.F22, s.R22, P.F22, P.R22].reduce((a, x) => a + 1 / (x + 0.5), 0);
    s.l22 = l22;
    s.V22 = [s.F22, s.R22, P.F22, P.R22].reduce((a, x) => a + 1 / (x + 0.5), 0);
    const Pa = { F: t.Fa - s.Fa - k / 2, R: t.Ra - s.Ra }, Pb = { F: t.Fb - s.Fb - k / 2, R: t.Rb - s.Rb };
    s.la = logit(s.Fa + k / 2, s.Ra) - logit(Pa.F, Pa.R); s.Va = [s.Fa, s.Ra, Pa.F, Pa.R].reduce((a, x) => a + 1 / (x + 0.5), 0);
    s.lb = logit(s.Fb + k / 2, s.Rb) - logit(Pb.F, Pb.R); s.Vb = [s.Fb, s.Rb, Pb.F, Pb.R].reduce((a, x) => a + 1 / (x + 0.5), 0);
    s.Emais = Math.max(0, s._F26 - (s._F26 + s.R26) * expit(logit(s.F22, s.R22) + (logit(P.F26, P.R26) - logit(P.F22, P.R22))));
  }
}
function zUF(lista, campo, campoV, saida) {
  for (const uf of UFS) {
    const v = lista.filter((s) => s.uf === uf && s[campo] !== null && s[campo] !== undefined);
    const x = v.map((s) => s[campo]), med = mediana(x), mad = 1.4826 * mediana(x.map((y) => Math.abs(y - med)));
    const tau2 = Math.max(0, mad * mad - mediana(v.map((s) => s[campoV])));
    for (const s of v) s[saida] = (s[campo] - med) / Math.sqrt(s[campoV] + tau2);
  }
}
medir(L);
const G = L.filter((s) => s.E !== null);
zUF(G, 'E', 'V', 'zE'); zUF(G, 'l22', 'V22', 'z22'); zUF(G, 'la', 'Va', 'za'); zUF(G, 'lb', 'Vb', 'zb');
log(`com vizinha no local × modelo: ${G.length}`);

// ---------- (c1) persistência e (c2) topo novo
const corr = (xs, ys) => { const n = xs.length, mx = xs.reduce((a, v) => a + v, 0) / n, my = ys.reduce((a, v) => a + v, 0) / n; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; } return sxy / Math.sqrt(sxx * syy); };
const persist = {};
for (const [u, ufs] of [['MG', ['mg']], ['PR', ['pr']], ['SC', ['sc']], ['RS', ['rs']], ['Sul', ['pr', 'sc', 'rs']], ['4 UFs', UFS]]) {
  const v = G.filter((s) => ufs.includes(s.uf));
  const alto26 = v.filter((s) => s.za >= 3 && s.zb >= 3);
  const alto22 = v.filter((s) => s.z22 >= 3);
  const ambos = alto26.filter((s) => s.z22 >= 3);
  const novo = alto26.filter((s) => s.z22 < 1);
  persist[u] = { secoes: v.length, correlacaoNivel: corr(v.map((s) => s.la + s.lb), v.map((s) => s.l22)), alto2026DoisTurnos: alto26.length, alto2022: alto22.length,
    alto26JaAlto22: ambos.length, fracJaAlto22: alto26.length ? ambos.length / alto26.length : null, fracEsperadaIndependencia: alto22.length / v.length,
    alto26Normal22: novo.length, alto26MesmaUrna: alto26.filter((s) => s.mesmaUrna).length };
}
log('persistência', JSON.stringify(persist));

// ---------- família C22
const Z_C = zBonf(12), Z80 = 0.8416;
const ctrl = (s) => { const m = s.m, e = m.eleitores; return [1 - m.biometria / e, m.idade60 / e, m.idade70 / e, m.idade16a24 / e, m.escolBaixa / e, m.superior / e, Math.log(s.ap26), s.mudouModelo, s.mesmaUrna, s.l22]; };
function linhas(lista, desf, inj = null, cand = 13) {
  return lista.filter((s) => s.E !== null).map((s) => {
    const k = (inj?.get(s.id) ?? 0) / 2;
    let v13 = s.m.v13_2, v22 = s.m.v22_2;
    if (cand === 13) v13 += k; else v22 += k;
    const y = desf === 'comp' ? 100 * ((s.C26 * s.ap26 + k) / s.ap26 - s.C22) : 100 * (v13 / (v13 + v22) - s.Y22);
    return { g: s.g, cl: s.cl, w: s.m.v13_2 + s.m.v22_2, x: [s.E], c: ctrl(s), y };
  });
}
const UNI = [['MG', ['mg']], ['PR', ['pr']], ['SC', ['sc']], ['RS', ['rs']], ['Sul', ['pr', 'sc', 'rs']], ['4 UFs', UFS]];
const familia = [];
for (const [u, ufs] of UNI) {
  const v = L.filter((s) => ufs.includes(s.uf));
  if (!v.length) continue;
  for (const desf of ['voto', 'comp']) {
    const r = regredir(linhas(v, desf));
    if (!r) { familia.push({ unidade: u, desfecho: desf, erro: 'regressão singular' }); continue; }
    const z = r.beta[0] / r.se[0];
    const e = { unidade: u, desfecho: desf, beta: r.beta[0], se: r.se[0], z, p: pBi(z), passa: Math.abs(z) >= Z_C, mdeBeta: (Z_C + Z80) * r.se[0], N: r.N, grupos: r.grupos };
    const rl = regredir(linhas(v.filter((s) => s.mesmoLocal), desf));
    e.mesmoLocalZ = rl ? rl.beta[0] / rl.se[0] : null;
    if (desf === 'voto') {
      e.injecao = {};
      const Esoma = v.filter((s) => s.E !== null).reduce((a, s) => a + s.Emais, 0);
      for (const cand of [13, 22]) {
        const inj = new Map(v.filter((s) => s.E !== null).map((s) => [s.id, 0.01 * s.Emais]));
        const copia = v.map((s) => ({ ...s }));
        medir(copia, inj);
        const ri = regredir(linhas(copia, 'voto', inj, cand));
        medir(v);
        const dz = Math.abs(ri.beta[0] / ri.se[0] - z);
        const phi = dz > 0 ? (0.01 * (Z_C + Z80)) / dz : null;
        e.injecao[cand] = { Emais: Esoma, deslocamentoZ: dz, phiMDE: phi, votos2tMDE: phi !== null ? (phi * Esoma) / 2 : null };
      }
    }
    familia.push(e);
    log(u, desf, z.toFixed(2));
  }
}
const qf = bh(familia.filter((f) => f.p !== undefined).map((f) => f.p));
familia.filter((f) => f.p !== undefined).forEach((f, i) => { f.qBH = qf[i]; });
for (const [u] of UNI) {
  const v = familia.find((f) => f.unidade === u && f.desfecho === 'voto'), c = familia.find((f) => f.unidade === u && f.desfecho === 'comp');
  if (v && c && v.z !== undefined) v.compativelH19 = v.passa && Math.sign(c.z) === Math.sign(v.z) && Math.abs(c.z) >= 2 && v.mesmoLocalZ !== null && Math.sign(v.mesmoLocalZ) === Math.sign(v.z);
}
const topo = G.filter((s) => s.za >= 3 && s.zb >= 3 && s.z22 < 1).sort((a, b) => b.E - a.E).slice(0, 20);
const R = { geradoEm: new Date().toISOString(), plano: '31 (commit 067d1a7)', conferencia2022: conf, ufs: UFS, ligacao: lig, comVizinha: G.length, persistencia: persist,
  familiaC22: { testes: familia.length, corte: Z_C, passam: familia.filter((f) => f.passa).length, compativeisH19: familia.filter((f) => f.compativelH19).length, lista: familia },
  topoNovo: topo.map((s) => ({ id: s.id, E: s.E, zE: s.zE, za: s.za, zb: s.zb, z22: s.z22, f26: s.F26 / (s.F26 + s.R26), f22: s.F22 / (s.F22 + s.R22), Z22: s.Z22, mudouModelo: s.mudouModelo, mesmaUrna: s.mesmaUrna, mesmoLocal: s.mesmoLocal, Y22: s.Y22, Y26: s.Y26, C22: s.C22, C26: s.C26 })) };
await writeFile(path.join(DIR_FINAL, 'linha2022.json'), JSON.stringify(R, null, 1));
await writeFile(path.join(DIR_FINAL, 'linha2022-topo.csv'), ['id;E;zE;za;zb;z22;f26;f22;Y22;Y26;C22;C26;mudouModelo;mesmaUrna', ...R.topoNovo.map((t) => [t.id, t.E.toFixed(3), t.zE.toFixed(2), t.za.toFixed(2), t.zb.toFixed(2), t.z22.toFixed(2), t.f26.toFixed(4), t.f22.toFixed(4), t.Y22.toFixed(4), t.Y26.toFixed(4), t.C22.toFixed(4), t.C26.toFixed(4), t.mudouModelo, t.mesmaUrna].join(';'))].join('\n') + '\n');
log('fim', JSON.stringify({ passam: R.familiaC22.passam, compat: R.familiaC22.compativeisH19 }));
