// Cético revisor, parecer 28 (docs/analysis/cetico-revisor/28-chegada-dos-bus.md): tenta derrubar, nos dois sentidos,
// o estudo da chegada dos BUs × divulgação (docs/analysis/linha-do-tempo/06, scripts/auditoria/estatistico-chegada-bu*.mjs).
// Lê só as saídas já montadas do autor (data/parsed/auditoria/chegada-bu/secoes.csv e aux-horarios.csv), que eu
// reproduzi rodando os três scripts dele. Universo: as 499.248 seções do 2º turno (iguais às do 1º).
// Blocos:
//   1. aux.json × DT_RECEBIMENTO_BU_HOR_TSE: o que são as seções em que diferem.
//   2. "recebimento" é chegada ou processamento? Fluxo por UF nos patamares; FIFO por emissão; o lote das 19:03.
//   3. Ordem das UFs × voto (2T e 1T) e × tamanho da UF.
//   4. Regressões extras: 1T dentro do local com controle do fim; 2T dentro da zona/município com fim, ordem do 1T e
//      a virada; atenuação 2T/1T de variáveis sem partido (aptos, comparecimento).
//   5. Embaralhamento de LUGARES INTEIROS: troca a hora (mediana) dos locais entre si dentro da zona, do município e
//      da UF, e a das zonas dentro da UF, mantendo o espalhamento interno; mede desvio da curva, maior salto e queda.
//   6. MT 90069 (1º turno, recebimento antes da emissão).
// Uso: node --max-old-space-size=8192 scripts/auditoria/cetico-chegada-bu.mjs [--replicas 200]
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';

const { values: opc } = parseArgs({ options: { replicas: { type: 'string', default: '200' } } });
const R = Number(opc.replicas);
const DIR = path.join(DIR_DADOS, 'parsed', 'auditoria', 'chegada-bu');
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor');
const out = { comando: 'node --max-old-space-size=8192 scripts/auditoria/cetico-chegada-bu.mjs', replicas: R };
const r4 = (x) => Math.round(x * 1e4) / 1e4;
const r2 = (x) => Math.round(x * 100) / 100;

// ---------- leitura ----------
const linhas = (await readFile(path.join(DIR, 'secoes.csv'), 'utf8')).split('\n');
const cab = linhas[0].split(',');
const ci = Object.fromEntries(cab.map((c, k) => [c, k]));
const N = linhas.length - 2 + (linhas.at(-1) === '' ? 0 : 1);
const DIA2 = Date.UTC(2026, 9, 25), DIA1 = Date.UTC(2026, 9, 4);
const seg = (s, dia) => (s ? (Date.parse(`${s.replace(' ', 'T')}Z`) - dia) / 1000 : NaN);
const uf = new Array(N), chMun = new Array(N), chZona = new Array(N), chLocal = new Array(N), id = new Array(N);
const nsec = new Float64Array(N), aptos = new Float64Array(N);
const fim = new Float64Array(N), rec = new Float64Array(N), tot = new Float64Array(N), auxP = new Float64Array(N), auxU = new Float64Array(N);
const fim1 = new Float64Array(N), rec1 = new Float64Array(N), tot1 = new Float64Array(N);
const comp = new Float64Array(N), v13 = new Float64Array(N), v22 = new Float64Array(N), comp1 = new Float64Array(N), v13a = new Float64Array(N), v22a = new Float64Array(N);
const auxN = new Int32Array(N), auxSt = new Array(N), tipo = new Array(N);
for (let i = 0; i < N; i++) {
  const c = linhas[i + 1].split(',');
  uf[i] = c[ci.uf];
  chMun[i] = `${c[ci.uf]}/${c[ci.municipio]}`;
  chZona[i] = `${chMun[i]}/${c[ci.zona]}`;
  chLocal[i] = `${chZona[i]}/${c[ci.local]}`;
  id[i] = `${chZona[i]}/${c[ci.secao]}`;
  nsec[i] = Number(c[ci.secao]); aptos[i] = +c[ci.aptos] || 0; tipo[i] = c[ci.tipo_urna];
  fim[i] = seg(c[ci.fim_br], DIA2); rec[i] = seg(c[ci.receb_br], DIA2); tot[i] = seg(c[ci.tot_br], DIA2);
  auxP[i] = seg(c[ci.aux_primeiro], DIA2); auxU[i] = seg(c[ci.aux_ultimo], DIA2); auxN[i] = +c[ci.aux_n_hashes] || 0; auxSt[i] = c[ci.aux_st];
  fim1[i] = seg(c[ci.fim1_br], DIA1); rec1[i] = seg(c[ci.receb1_br], DIA1); tot1[i] = seg(c[ci.tot1_br], DIA1);
  comp[i] = +c[ci.comparecimento] || 0; v13[i] = +c[ci.v13] || 0; v22[i] = +c[ci.v22] || 0;
  comp1[i] = +c[ci.comparecimento1] || 0; v13a[i] = +c[ci.v13_1] || 0; v22a[i] = +c[ci.v22_1] || 0;
}
linhas.length = 0;
const H = (h, m = 0, s = 0) => h * 3600 + m * 60 + s;
const hhmm = (s) => (Number.isNaN(s) ? '' : `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`);
const brasil = (i) => uf[i] !== 'zz';
const temVoto = (i) => v13[i] + v22[i] > 0;
const temVoto1 = (i) => v13a[i] + v22a[i] > 0;
const p22 = (i) => v22[i] / (v13[i] + v22[i]);
const p22a = (i) => v22a[i] / (v13a[i] + v22a[i]);
const mediana = (a) => { const b = Float64Array.from(a).sort(); return b.length ? (b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2) : NaN; };
const quant = (arr, ps) => { const a = Float64Array.from(arr).sort(); return Object.fromEntries(ps.map((p) => [`p${p * 100}`, a.length ? r2(a[Math.min(a.length - 1, Math.floor(p * (a.length - 1)))]) : null])); };
const conta = (arr) => { const m = {}; for (const x of arr) m[x] = (m[x] ?? 0) + 1; return Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1])); };

// ---------- 1. aux × detalhe ----------
{
  const st = (await readFile(path.join(DIR, 'aux-horarios.csv'), 'utf8')).split('\n');
  const stH = new Map(); // chave → st_hashes e hr_totalizado
  for (let k = 1; k < st.length; k++) { if (!st[k]) continue; const c = st[k].split(','); stH.set(`${c[0]}/${c[1]}/${c[2]}/${c[3]}`, { sth: c[11], hrTot: c[10], ger: c[6] }); }
  const dif = [], mais = [], menos = [];
  for (let i = 0; i < N; i++) { if (Number.isNaN(auxP[i])) continue; if (auxP[i] !== rec[i]) { dif.push(i); (auxP[i] > rec[i] ? mais : menos).push(i); } }
  const info = (i) => stH.get(id[i]) ?? {};
  const delta = (l) => quant(l.map((i) => (auxP[i] - rec[i]) / 60), [0, 0.01, 0.1, 0.5, 0.9, 0.99, 1]);
  const igualTot = (l) => l.filter((i) => auxP[i] === tot[i]).length;
  const ultIgualRec = (l) => l.filter((i) => auxU[i] === rec[i]).length;
  out.b1_aux = {
    comAux: N - Array.from(auxP).filter(Number.isNaN).length, iguais: N - dif.length - Array.from(auxP).filter(Number.isNaN).length, diferentes: dif.length,
    nHashes: conta(Array.from(auxN)), nHashesNosDiferentes: conta(dif.map((i) => auxN[i])),
    stAuxNosDiferentes: conta(dif.map((i) => auxSt[i])), stAuxNosIguais: conta(Array.from({ length: N }, (_, i) => i).filter((i) => !Number.isNaN(auxP[i]) && auxP[i] === rec[i]).map((i) => auxSt[i])),
    stHashesNosDiferentes: conta(dif.map((i) => info(i).sth)),
    auxMaisTarde: { n: mais.length, deltaMin: delta(mais), auxIgualHoraDeTotalizacao: igualTot(mais), porUf: conta(mais.map((i) => uf[i])), comVotos: mais.filter(temVoto).length },
    auxMaisCedo: { n: menos.length, deltaMin: delta(menos), porUf: conta(menos.map((i) => uf[i])), comVotos: menos.filter(temVoto).length },
    ultimoHashIgualRecebimento_nosDiferentes: ultIgualRec(dif),
    // faixas de diferença × status do hash no aux
    faixas: (() => {
      const f = {};
      for (const i of dif) {
        const d = auxP[i] - rec[i];
        const fx = Math.abs(d) <= 2 ? 'ate2s' : Math.abs(d) <= 3600 ? '2s_a_1h' : d > 0 ? 'mais_de_1h_depois' : 'mais_de_1h_antes';
        const k = `${fx}|${info(i).sth}`;
        f[k] ??= { n: 0, recebDetalheAntes19h: 0, auxDepoisDe26_10: 0 };
        f[k].n++; if (rec[i] < H(19)) f[k].recebDetalheAntes19h++; if (auxP[i] >= 86400) f[k].auxDepoisDe26_10++;
      }
      return f;
    })(),
    // a hora do aux no lugar da oficial muda a fração recebida antes das 19h?
    recebidasAntes19h_detalhe: Array.from(rec).filter((x) => x < H(19)).length,
    recebidasAntes19h_aux: Array.from({ length: N }, (_, i) => (Number.isNaN(auxP[i]) ? rec[i] : auxP[i])).filter((x) => x < H(19)).length,
    geracaoAuxNosDiferentes: quant(dif.map((i) => seg(info(i).ger, DIA2) / 3600), [0, 0.5, 1]),
    geracaoAuxNosIguais: quant(Array.from({ length: N }, (_, i) => i).filter((i) => !Number.isNaN(auxP[i]) && auxP[i] === rec[i]).map((i) => seg(info(i).ger, DIA2) / 3600), [0, 0.5, 1]),
    exemplos: mais.slice(0, 3).concat(menos.slice(0, 3)).map((i) => ({ secao: id[i], receb: hhmm(rec[i]), tot: hhmm(tot[i]), auxPrimeiro: hhmm(auxP[i]), auxUltimo: hhmm(auxU[i]), n: auxN[i], st: auxSt[i], sth: info(i).sth, ger: info(i).ger })),
  };
  // os diferentes mudam alguma curva? hora de recebimento trocada pela do aux
  console.log('[1] aux:', JSON.stringify(out.b1_aux).slice(0, 1500));
}

// ---------- 2. recebimento = chegada ou processamento? ----------
const ufs = [...new Set(uf)].sort();
{
  // 2a. fluxo por UF por minuto nos patamares (2T 19:30–19:40, 19:18–19:24; 1T 17:14–17:27, 17:40–17:47)
  const janela = (arr, de, ate) => {
    const m = new Map();
    for (let i = 0; i < N; i++) if (arr[i] >= de && arr[i] < ate) { const k = `${uf[i]}|${Math.floor(arr[i] / 60)}`; m.set(k, (m.get(k) ?? 0) + 1); }
    const minutos = (ate - de) / 60;
    return ufs.map((u) => {
      const v = []; for (let q = de / 60; q < ate / 60; q++) v.push(m.get(`${u}|${q}`) ?? 0);
      const med = v.reduce((a, b) => a + b, 0) / minutos;
      const s2 = v.reduce((a, b) => a + (b - med) ** 2, 0) / (minutos - 1);
      return { uf: u, porMinuto: r2(med), indiceDispersao: med > 0 ? r2(s2 / med) : null, serie: v };
    });
  };
  out.b2_fluxoPorUf = {
    t2_1930a1940: janela(rec, H(19, 30), H(19, 40)), t2_1918a1924: janela(rec, H(19, 18), H(19, 24)), t2_1905a1912: janela(rec, H(19, 5), H(19, 12)),
    t1_1714a1727: janela(rec1, H(17, 14), H(17, 27)), t1_1740a1747: janela(rec1, H(17, 40), H(17, 47)),
  };
  for (const [k, v] of Object.entries(out.b2_fluxoPorUf)) console.log(`[2a] ${k}: ` + v.map((x) => `${x.uf}=${x.porMinuto}`).join(' '));
  // 2b. por segundo, nos patamares: o recebimento é contínuo ou sai em rajadas (lotes)?
  const porSegundo = (arr, de, ate) => {
    const f = new Int32Array(ate - de); for (let i = 0; i < N; i++) if (arr[i] >= de && arr[i] < ate) f[arr[i] - de]++;
    const m = f.reduce((a, b) => a + b, 0) / f.length; const s2 = f.reduce((a, b) => a + (b - m) ** 2, 0) / (f.length - 1);
    return { segundos: f.length, media: r2(m), indiceDispersao: r2(s2 / m), segundosVazios: f.filter((x) => x === 0).length, maior: Math.max(...f) };
  };
  out.b2_porSegundo = { t2_1930a1940: porSegundo(rec, H(19, 30), H(19, 40)), t2_1905a1912: porSegundo(rec, H(19, 5), H(19, 12)), t2_lote_190337a190400: porSegundo(rec, H(19, 3, 37), H(19, 4)), t1_1714a1727: porSegundo(rec1, H(17, 14), H(17, 27)), t1_2000a2010: porSegundo(rec1, H(20, 0), H(20, 10)) };
  console.log('[2b] por segundo:', JSON.stringify(out.b2_porSegundo));
  // 2c. FIFO: dentro da UF, a ordem de recebimento segue a ordem de emissão (fim)? Spearman por UF, 2T e 1T
  const spear = (a, b) => {
    const rk = (v) => { const o = v.map((x, k) => [x, k]).sort((p, q) => p[0] - q[0]); const r = new Float64Array(v.length); for (let k = 0, j; k < o.length; k = j) { j = k; while (j < o.length && o[j][0] === o[k][0]) j++; for (let q = k; q < j; q++) r[o[q][1]] = (k + j - 1) / 2; } return r; };
    const ra = rk(a), rb = rk(b), n = a.length; let ma = 0, mb = 0; for (let k = 0; k < n; k++) { ma += ra[k]; mb += rb[k]; } ma /= n; mb /= n;
    let sab = 0, saa = 0, sbb = 0; for (let k = 0; k < n; k++) { sab += (ra[k] - ma) * (rb[k] - mb); saa += (ra[k] - ma) ** 2; sbb += (rb[k] - mb) ** 2; }
    return sab / Math.sqrt(saa * sbb);
  };
  out.spearman = spear;
  const fifo = ufs.filter((u) => u !== 'zz').map((u) => {
    const a = [], b = [], a1 = [], b1 = [];
    for (let i = 0; i < N; i++) if (uf[i] === u && !Number.isNaN(fim[i])) { a.push(fim[i]); b.push(rec[i]); if (!Number.isNaN(fim1[i]) && !Number.isNaN(rec1[i])) { a1.push(fim1[i]); b1.push(rec1[i]); } }
    return { uf: u, t2: r4(spear(a, b)), t1: r4(spear(a1, b1)) };
  });
  out.b2_fifoFimRecebimentoPorUf = { mediana2T: r4(mediana(fifo.map((x) => x.t2))), mediana1T: r4(mediana(fifo.map((x) => x.t1))), porUf: fifo };
  console.log('[2c] FIFO (Spearman fim × receb dentro da UF): 2T mediana', out.b2_fifoFimRecebimentoPorUf.mediana2T, '1T mediana', out.b2_fifoFimRecebimentoPorUf.mediana1T);
  // 2d. lote 19:03:37–19:03:56: por UF, e se as seções do lote foram as primeiras emitidas da UF
  const lote = []; for (let i = 0; i < N; i++) if (rec[i] >= H(19, 3) && rec[i] < H(19, 4)) lote.push(i);
  const porUfL = ufs.map((u) => {
    const doUf = []; for (let i = 0; i < N; i++) if (uf[i] === u && !Number.isNaN(fim[i])) doUf.push(i);
    const noLote = new Set(lote.filter((i) => uf[i] === u));
    if (!noLote.size) return null;
    // posto percentual de emissão das seções do lote dentro da UF (0 = primeira emitida)
    const ord = doUf.slice().sort((a, b) => fim[a] - fim[b]);
    const postos = []; ord.forEach((i, k) => { if (noLote.has(i)) postos.push(k / (ord.length - 1)); });
    return { uf: u, noLote: noLote.size, secoesUf: doUf.length, pctDaUf: r2((100 * noLote.size) / doUf.length), postoEmissaoMediano: r4(mediana(postos)), fimMediano: hhmm(mediana([...noLote].map((i) => fim[i]).filter((x) => !Number.isNaN(x)))), fimMedianoUf: hhmm(mediana(doUf.map((i) => fim[i]))) };
  }).filter(Boolean);
  out.b2_lote1903 = { secoes: lote.length, comVotos: lote.filter(temVoto).length, recebidoDe: hhmm(Math.min(...lote.map((i) => rec[i]))), ate: hhmm(Math.max(...lote.map((i) => rec[i]))), porUf: porUfL,
    p22Lote: r4(100 * lote.reduce((a, i) => a + v22[i], 0) / lote.reduce((a, i) => a + v13[i] + v22[i], 0)) };
  console.log('[2d] lote 19:03:', JSON.stringify({ ...out.b2_lote1903, porUf: out.b2_lote1903.porUf.map((x) => `${x.uf}:${x.noLote}(${x.pctDaUf}%,posto ${x.postoEmissaoMediano})`).join(' ') }));
  // 2e. 1º turno: quando a fila "destravou" às 18:08 (depois da pausa 18:01–18:07), houve lote também?
  out.b2_t1_1807a1810_porSegundo = porSegundo(rec1, H(18, 7), H(18, 10));
}

// ---------- 3. ordem das UFs × voto e × tamanho ----------
{
  const s = out.spearman;
  const linhasUf = ufs.filter((u) => u !== 'zz').map((u) => {
    const ix = []; for (let i = 0; i < N; i++) if (uf[i] === u) ix.push(i);
    const s13 = ix.reduce((a, i) => a + v13[i], 0), s22 = ix.reduce((a, i) => a + v22[i], 0), s13a = ix.reduce((a, i) => a + v13a[i], 0), s22a = ix.reduce((a, i) => a + v22a[i], 0);
    return { uf: u, n: ix.length, rec2: mediana(ix.map((i) => rec[i])), rec1: mediana(ix.map((i) => rec1[i]).filter((x) => !Number.isNaN(x))), p22_2: s22 / (s13 + s22), p22_1: s22a / (s13a + s22a) };
  });
  const perm = (x, y, P = 20000) => { const r0 = s(x, y); let c = 0; let st = 99; const rnd = () => { st = (st + 0x6d2b79f5) | 0; let t = Math.imul(st ^ (st >>> 15), 1 | st); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; const yy = y.slice(); for (let r = 0; r < P; r++) { for (let a = yy.length - 1; a > 0; a--) { const j = Math.floor(rnd() * (a + 1)); [yy[a], yy[j]] = [yy[j], yy[a]]; } if (Math.abs(s(x, yy)) >= Math.abs(r0)) c++; } return { rho: r4(r0), p: r4((c + 1) / (P + 1)) }; };
  out.b3_ordemUf = {
    rec2_x_p22_2: perm(linhasUf.map((x) => x.rec2), linhasUf.map((x) => x.p22_2)),
    rec1_x_p22_1: perm(linhasUf.map((x) => x.rec1), linhasUf.map((x) => x.p22_1)),
    rec2_x_tamanho: perm(linhasUf.map((x) => x.rec2), linhasUf.map((x) => x.n)),
    rec1_x_tamanho: perm(linhasUf.map((x) => x.rec1), linhasUf.map((x) => x.n)),
    rec2_x_rec1: perm(linhasUf.map((x) => x.rec2), linhasUf.map((x) => x.rec1)),
    porUf: linhasUf.sort((a, b) => a.rec2 - b.rec2).map((x) => ({ uf: x.uf, n: x.n, rec2: hhmm(x.rec2), rec1: hhmm(x.rec1), p22_2: r4(100 * x.p22_2), p22_1: r4(100 * x.p22_1) })),
  };
  console.log('[3] UF:', JSON.stringify({ ...out.b3_ordemUf, porUf: undefined }));
}

// ---------- 4. regressões extras ----------
function regressao(sel, y, Xs, estrato, cluster) {
  const n = sel.length, k = Xs.length;
  const grupos = new Map();
  for (const i of sel) { const g = estrato(i); if (!grupos.has(g)) grupos.set(g, []); grupos.get(g).push(i); }
  const Y = new Float64Array(n), X = Xs.map(() => new Float64Array(n)), cl = new Array(n);
  let p = 0;
  for (const l of grupos.values()) {
    const my = l.reduce((a, i) => a + y(i), 0) / l.length;
    const mx = Xs.map((x) => l.reduce((a, i) => a + x(i), 0) / l.length);
    for (const i of l) { Y[p] = y(i) - my; Xs.forEach((x, j) => { X[j][p] = x(i) - mx[j]; }); cl[p] = cluster(i); p++; }
  }
  const XtX = Array.from({ length: k }, (_, a) => Array.from({ length: k }, (_, b) => { let s = 0; for (let q = 0; q < n; q++) s += X[a][q] * X[b][q]; return s; }));
  const XtY = Array.from({ length: k }, (_, a) => { let s = 0; for (let q = 0; q < n; q++) s += X[a][q] * Y[q]; return s; });
  const inv = inverter(XtX);
  const b = inv.map((row) => row.reduce((s, v, j) => s + v * XtY[j], 0));
  const meat = Array.from({ length: k }, () => new Float64Array(k));
  const somaCl = new Map();
  for (let q = 0; q < n; q++) {
    const u = Y[q] - b.reduce((s, bj, j) => s + bj * X[j][q], 0);
    const v = somaCl.get(cl[q]) ?? new Float64Array(k);
    for (let j = 0; j < k; j++) v[j] += X[j][q] * u;
    somaCl.set(cl[q], v);
  }
  for (const v of somaCl.values()) for (let a = 0; a < k; a++) for (let c = 0; c < k; c++) meat[a][c] += v[a] * v[c];
  const G = somaCl.size, aj = G / (G - 1);
  const V = inv.map((row, a) => inv.map((_, c) => aj * row.reduce((s, ra, j) => s + ra * meat[j].reduce((t, mjl, l) => t + mjl * inv[l][c], 0), 0)));
  return { n, b: b.map(r4), z: b.map((bj, j) => r2(bj / Math.sqrt(V[j][j]))) };
}
function inverter(M) {
  const n = M.length, A = M.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    const d = A[c][c]; for (let j = 0; j < 2 * n; j++) A[c][j] /= d;
    for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c]; for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[c][j]; }
  }
  return A.map((r) => r.slice(n));
}
// posto percentual dentro do grupo (empates: posto médio)
const postoNoGrupo = (chaves, val, filtro) => {
  const g = new Map();
  for (let i = 0; i < N; i++) if (filtro(i) && !Number.isNaN(val[i])) { const k = chaves[i]; if (!g.has(k)) g.set(k, []); g.get(k).push(i); }
  const p = new Float64Array(N).fill(NaN);
  for (const l of g.values()) {
    if (l.length < 2) continue;
    l.sort((a, b) => val[a] - val[b]);
    for (let k = 0, j; k < l.length; k = j) { j = k; while (j < l.length && val[l[j]] === val[l[k]]) j++; const m = (k + j - 1) / 2 / (l.length - 1); for (let q = k; q < j; q++) p[l[q]] = m; }
  }
  return p;
};
const pearson = (a, b) => { let n = 0, sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0; for (let i = 0; i < a.length; i++) { if (Number.isNaN(a[i]) || Number.isNaN(b[i])) continue; n++; sa += a[i]; sb += b[i]; saa += a[i] * a[i]; sbb += b[i] * b[i]; sab += a[i] * b[i]; } return r4((sab - (sa * sb) / n) / Math.sqrt((saa - (sa * sa) / n) * (sbb - (sb * sb) / n))); };
{
  const selRep = []; for (let i = 0; i < N; i++) if (temVoto(i) && fim[i] < H(19) && brasil(i)) selRep.push(i);
  const selRep1 = selRep.filter((i) => !Number.isNaN(fim1[i]) && !Number.isNaN(rec1[i]) && temVoto1(i));
  const selT1 = []; for (let i = 0; i < N; i++) if (brasil(i) && temVoto1(i) && !Number.isNaN(tot1[i]) && !Number.isNaN(fim1[i])) selT1.push(i);
  const yMin = (i) => (tot[i] - H(19)) / 60, y1 = (i) => (tot1[i] - H(17)) / 60;
  const L = (i) => chLocal[i], Z = (i) => chZona[i], M = (i) => chMun[i];
  const r = {};
  // 1T dentro do local: o efeito (z = −9) some com o fim da votação e o número da seção?
  r.t1_local_p22 = regressao(selT1, y1, [p22a], L, M);
  r.t1_local_p22_fim = regressao(selT1, y1, [p22a, (i) => fim1[i] / 60], L, M);
  r.t1_local_p22_fim_secao_aptos = regressao(selT1, y1, [p22a, (i) => fim1[i] / 60, (i) => nsec[i], (i) => aptos[i]], L, M);
  // 2T dentro da zona e do município, com fim e recebimento do 1T (proxy da geografia de transmissão)
  r.t2_zona_p22 = regressao(selRep1, yMin, [p22], Z, M);
  r.t2_zona_p22_fim_rec1 = regressao(selRep1, yMin, [p22, (i) => fim[i] / 60, (i) => rec1[i] / 60], Z, M);
  r.t2_mun_p22_fim_rec1 = regressao(selRep1, yMin, [p22, (i) => fim[i] / 60, (i) => rec1[i] / 60], M, M);
  // virada (p22 2T − p22 1T): um represamento moldado pelo resultado do 2T deveria aparecer aqui
  r.t2_zona_virada = regressao(selRep1, yMin, [(i) => p22(i) - p22a(i)], Z, M);
  r.t2_mun_virada = regressao(selRep1, yMin, [(i) => p22(i) - p22a(i)], M, M);
  r.t2_uf_virada = regressao(selRep1, yMin, [(i) => p22(i) - p22a(i)], (i) => uf[i], M);
  // 2T com a parcela do 22 do 1T no lugar da do 2T (o que a geografia prevê sem o voto do dia)
  r.t2_zona_p22do1T = regressao(selRep1, yMin, [p22a], Z, M);
  r.t2_zona_p22_e_p22do1T = regressao(selRep1, yMin, [p22, p22a], Z, M);
  out.b4_regressoes = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, { n: v.n, b: v.b, z: v.z, minPor10pp: r2(v.b[0] / 10) }]));
  for (const [k, v] of Object.entries(out.b4_regressoes)) console.log(`[4] ${k}: b=${v.b.join(', ')} z=${v.z.join(', ')} n=${v.n}`);
  // atenuação 2T/1T (correlação de postos dentro da zona) para variáveis com e sem partido
  const sel2 = new Set(selRep1);
  const f2 = (i) => sel2.has(i);
  const atn = {};
  const varz = { p22: [(i) => p22(i), (i) => p22a(i)], aptos: [(i) => aptos[i], (i) => aptos[i]], comparecimentoPct: [(i) => comp[i] / aptos[i], (i) => comp1[i] / aptos[i]], numeroSecao: [(i) => nsec[i], (i) => nsec[i]], fim: [(i) => fim[i], (i) => fim1[i]] };
  for (const [g, ch] of [['zona', chZona], ['municipio', chMun], ['local', chLocal]]) {
    const pt2 = postoNoGrupo(ch, tot, f2), pt1 = postoNoGrupo(ch, tot1, f2);
    atn[g] = {};
    for (const [nome, [a2, a1]] of Object.entries(varz)) {
      const x2 = postoNoGrupo(ch, Float64Array.from({ length: N }, (_, i) => (f2(i) ? a2(i) : NaN)), f2);
      const x1 = postoNoGrupo(ch, Float64Array.from({ length: N }, (_, i) => (f2(i) ? a1(i) : NaN)), f2);
      const c2 = pearson(pt2, x2), c1 = pearson(pt1, x1);
      atn[g][nome] = { t2: c2, t1: c1, razao: r2(c2 / c1) };
    }
  }
  out.b4_atenuacao = atn;
  console.log('[4] atenuação:', JSON.stringify(atn));
}

// ---------- 5. embaralhar lugares inteiros (troca de horários entre locais/zonas) ----------
let semente = 2828;
const aleatorio = () => { semente = (semente + 0x6d2b79f5) | 0; let t = Math.imul(semente ^ (semente >>> 15), 1 | semente); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const PASSOS = 200;
function curva(ordem, a13v, a22v) {
  const pts = new Float64Array(PASSOS); let a13 = 0, a22 = 0, k = 0; const n = ordem.length;
  for (let q = 0; q < n; q++) { const i = ordem[q]; a13 += a13v[i]; a22 += a22v[i]; while (k < PASSOS && q + 1 >= Math.round(((k + 1) * n) / PASSOS)) { pts[k] = a22 / (a13 + a22); k++; } }
  return pts;
}
function saltos(ordem, t, a13v, a22v) {
  // parcela acumulada ao fim de cada minuto; saltos depois de 1% apurado
  const lim = Math.round(0.01 * ordem.length);
  let a13 = 0, a22 = 0, prev = NaN, prevQ = 0, maxAbs = 0, queda = 0, subida = 0, soma2 = 0;
  let q = 0;
  while (q < ordem.length) {
    const m = Math.floor(t[ordem[q]] / 60);
    while (q < ordem.length && Math.floor(t[ordem[q]] / 60) === m) { const i = ordem[q++]; a13 += a13v[i]; a22 += a22v[i]; }
    const p = a22 / (a13 + a22);
    if (!Number.isNaN(prev) && prevQ >= lim) { const d = p - prev; maxAbs = Math.max(maxAbs, Math.abs(d)); queda = Math.min(queda, d); subida = Math.max(subida, d); soma2 += d * d; }
    prev = p; prevQ = q;
  }
  return { maxAbs, queda, subida, soma2 };
}
function testeBlocos(sel, t, a13v, a22v, rotulo) {
  // blocos: chave do bloco (local ou zona) e chave do estrato onde os blocos trocam de horário entre si
  // ordena por chave numérica (2·hora em s · 2^20 + posição no arquivo; o arquivo já vem em ordem de UF/município/zona/seção)
  const ordenarPor = (tt, selA) => { const kz = new Float64Array(selA.length); for (let q = 0; q < selA.length; q++) kz[q] = Math.round(2 * tt[selA[q]]) * 1048576 + q; kz.sort(); return Int32Array.from(kz, (x) => selA[x % 1048576]); };
  const ordReal = ordenarPor(t, Int32Array.from(sel));
  const cReal = curva(ordReal, a13v, a22v), sReal = saltos(ordReal, t, a13v, a22v);
  const res = { rotulo, secoes: sel.length, final22: r4(100 * cReal.at(-1)), testes: {} };
  for (const [nome, chBloco, chEstr] of [['locais dentro da zona', chLocal, chZona], ['locais dentro do município', chLocal, chMun], ['locais dentro da UF', chLocal, uf], ['zonas dentro da UF', chZona, uf], ['municípios dentro da UF', chMun, uf]]) {
    // mediana do horário de cada bloco e deslocamento de cada seção em relação a ela
    const membros = new Map();
    for (const i of sel) { const b = chBloco[i]; if (!membros.has(b)) membros.set(b, []); membros.get(b).push(i); }
    const blocos = [...membros.keys()];
    const bIdx = new Map(blocos.map((b, k) => [b, k]));
    const medB = Float64Array.from(blocos, (b) => mediana(membros.get(b).map((i) => t[i])));
    const porEstr = new Map();
    blocos.forEach((b, k) => { const e = chEstr[membros.get(b)[0]]; if (!porEstr.has(e)) porEstr.set(e, []); porEstr.get(e).push(k); });
    const estr = [...porEstr.values()].filter((l) => l.length > 1);
    const blocoDe = Int32Array.from(sel, (i) => bIdx.get(chBloco[i]));
    const selA = Int32Array.from(sel);
    const tNovo = new Float64Array(N);
    const novoMed = new Float64Array(blocos.length);
    const reps = [], sal = [];
    for (let r = 0; r < R; r++) {
      novoMed.set(medB);
      for (const l of estr) {
        const v = l.map((k) => medB[k]);
        for (let a = v.length - 1; a > 0; a--) { const j = Math.floor(aleatorio() * (a + 1)); const x = v[a]; v[a] = v[j]; v[j] = x; }
        l.forEach((k, q) => { novoMed[k] = v[q]; });
      }
      for (let q = 0; q < selA.length; q++) { const i = selA[q], k = blocoDe[q]; tNovo[i] = t[i] - medB[k] + novoMed[k]; }
      const o = ordenarPor(tNovo, selA);
      reps.push(curva(o, a13v, a22v)); sal.push(saltos(o, tNovo, a13v, a22v));
    }
    const media = new Float64Array(PASSOS), sd = new Float64Array(PASSOS), lo = new Float64Array(PASSOS), hi = new Float64Array(PASSOS);
    for (let k = 0; k < PASSOS; k++) { const v = reps.map((c) => c[k]).sort((a, b) => a - b); media[k] = v.reduce((a, b) => a + b, 0) / R; sd[k] = Math.sqrt(v.reduce((a, b) => a + (b - media[k]) ** 2, 0) / (R - 1)); lo[k] = v[Math.floor(0.025 * (R - 1))]; hi[k] = v[Math.ceil(0.975 * (R - 1))]; }
    const T = (c, de = 0) => { let m = 0; for (let k = de; k < PASSOS; k++) if (sd[k] > 0) m = Math.max(m, Math.abs(c[k] - media[k]) / sd[k]); return m; };
    const tR = T(cReal), tR3 = T(cReal, 2);
    let maxDev = 0, onde = 0; for (let k = 0; k < PASSOS; k++) { const d = cReal[k] - media[k]; if (Math.abs(d) > Math.abs(maxDev)) { maxDev = d; onde = k; } }
    const pv = (f) => r4((1 + f) / (R + 1));
    res.testes[nome] = {
      blocos: blocos.length, estratosComTroca: estr.length,
      maiorDesvioDaMedia_pp: r4(100 * maxDev), emPct: (onde + 1) / 2,
      pontosForaDoLeque95: Array.from({ length: PASSOS }, (_, k) => k).filter((k) => cReal[k] < lo[k] || cReal[k] > hi[k]).length,
      estatisticaMaxZ: r2(tR), pMaxZ: pv(reps.filter((c) => T(c) >= tR).length), pMaxZ_aPartirDe1_5pct: pv(reps.filter((c) => T(c, 2) >= tR3).length),
      maiorSaltoReal_pp: r4(100 * sReal.maxAbs), maiorSaltoEmbaralhado_mediana_pp: r4(100 * mediana(sal.map((s) => s.maxAbs))), pMaiorSalto: pv(sal.filter((s) => s.maxAbs >= sReal.maxAbs).length),
      maiorQuedaReal_pp: r4(100 * sReal.queda), maiorQuedaEmbaralhada_mediana_pp: r4(100 * mediana(sal.map((s) => s.queda))), pMaiorQueda: pv(sal.filter((s) => s.queda <= sReal.queda).length),
      maiorSubidaReal_pp: r4(100 * sReal.subida), pMaiorSubida: pv(sal.filter((s) => s.subida >= sReal.subida).length),
      pSomaQuadrados: pv(sal.filter((s) => s.soma2 >= sReal.soma2).length),
    };
    console.log(`[5] ${rotulo} | ${nome}: ${JSON.stringify(res.testes[nome])}`);
  }
  return res;
}
{
  const sel2 = []; for (let i = 0; i < N; i++) if (brasil(i) && temVoto(i) && !Number.isNaN(fim[i])) sel2.push(i);
  const sel1 = []; for (let i = 0; i < N; i++) if (brasil(i) && temVoto1(i) && !Number.isNaN(tot1[i])) sel1.push(i);
  out.b5_blocos = { t2: testeBlocos(sel2, tot, v13, v22, '2T'), t1: testeBlocos(sel1, tot1, v13a, v22a, '1T') };
}

// ---------- 6. MT 90069, 1º turno ----------
{
  const ix = []; for (let i = 0; i < N; i++) if (chMun[i] === 'mt/90069' || chMun[i] === 'mt/9006') ix.push(i);
  const neg1 = []; for (let i = 0; i < N; i++) if (!Number.isNaN(fim1[i]) && rec1[i] < fim1[i]) neg1.push(i);
  out.b6_mt = { secoesMun: ix.length, recebAntesEmissao1T_total: neg1.length, porMun: conta(neg1.map((i) => chMun[i])),
    mt90069: ix.length ? { fim1: quant(ix.map((i) => fim1[i] / 3600), [0, 0.5, 1]), rec1: quant(ix.map((i) => rec1[i] / 3600), [0, 0.5, 1]), fim2: quant(ix.map((i) => fim[i] / 3600), [0, 0.5, 1]), rec2: quant(ix.map((i) => rec[i] / 3600), [0, 0.5, 1]),
      exemplos: ix.slice(0, 4).map((i) => ({ secao: id[i], fim1: hhmm(fim1[i]), rec1: hhmm(rec1[i]), fim2: hhmm(fim[i]), rec2: hhmm(rec[i]) })) } : null };
  console.log('[6]', JSON.stringify(out.b6_mt));
}

await mkdir(SAIDA, { recursive: true });
delete out.spearman;
await writeFile(path.join(SAIDA, '28-chegada-bu.json'), JSON.stringify(out, null, 1));
console.log(`[ok] ${path.join(SAIDA, '28-chegada-bu.json')}`);
