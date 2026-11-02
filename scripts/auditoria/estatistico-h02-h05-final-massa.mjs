// Estatístico eleitoral, doc 30 (plano 29, commit 45dc471), H05(c): as 97 seções do 2º turno com liberação manual (pg do BU)
// de 50% ou mais do comparecimento, uma a uma pelo diário, nos dois turnos. Medidas M1–M8 e classe fixadas no plano.
// Só contagens, horários e vias; nenhum título. Inspeção física da urna não é possível com dados públicos.
// Uso: node --max-old-space-size=6144 scripts/auditoria/estatistico-h02-h05-final-massa.mjs
// Saída: data/parsed/auditoria/estatistico-eleitoral/h02-h05-final/massa.json e massa.csv
import { createReadStream } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { aleatorio, paraCsv } from './forense-lib.mjs';
import { lerCiclos } from './estatistico-h02-h05-final-diario.mjs';
import { filtrar, lerPares, pNormal2, zBilateral } from './estatistico-lib.mjs';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico-eleitoral', 'h02-h05-final');
const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const r4 = (x) => (Number.isFinite(x) ? Math.round(x * 10000) / 10000 : null);
const r2 = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : null);
const rnd = aleatorio(20261102);
const PERM = 2000;

const { db } = await abrirLeitura();
const massa = db.prepare(`SELECT uf, municipio, zona, secao, comparecimento c2, por_biografia p2, numero_interno_urna urna2, modelo_urna modelo2 FROM secao
  WHERE turno = 2 AND situacao = 'completa' AND uf <> 'zz' AND comparecimento > 0 AND por_biografia * 2 >= comparecimento ORDER BY uf, municipio, zona, secao`).all().map((r) => ({ ...r }));
const q1 = db.prepare('SELECT comparecimento c1, por_biografia p1, numero_interno_urna urna1, modelo_urna modelo1 FROM secao WHERE turno = 1 AND uf = ? AND municipio = ? AND zona = ? AND secao = ?');
for (const m of massa) Object.assign(m, { ...(q1.get(m.uf, m.municipio, m.zona, m.secao) ?? {}) });
const conf = { secoes: massa.length, zonas: new Set(massa.map((m) => `${m.uf}/${m.municipio}/${m.zona}`)).size, votantes: massa.reduce((a, m) => a + m.c2, 0), manual: massa.reduce((a, m) => a + m.p2, 0),
  cinquentaVotosOuMais: massa.filter((m) => m.c2 >= 50).length };
db.close();
log(`97 seções: ${JSON.stringify(conf)}`);

// distribuição de p1 por modelo e turno (doc 08), seções com ≥ 10 reconhecidos
const dist = { 1: new Map(), 2: new Map() };
{
  const { db: d2 } = await abrirLeitura();
  const modelo = new Map(d2.prepare("SELECT turno, uf || '/' || municipio || '/' || zona || '/' || secao k, modelo_urna m FROM secao WHERE uf <> 'zz'").all().map((r) => [`${r.turno}|${r.k}`, r.m]));
  d2.close();
  const dir = path.join(SAIDA, '..', 'leitor');
  for (const f of (await readdir(dir)).filter((n) => /^[a-z]{2}\.jsonl$/.test(n))) {
    for await (const l of createInterface({ input: createReadStream(path.join(dir, f)), crlfDelay: Infinity })) {
      if (!l) continue; const r = JSON.parse(l); const k = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
      for (const t of [1, 2]) { const d = r[`d${t}`]; if (!d) continue; const rec = d.suc.reduce((a, b) => a + b, 0) + d.sucMais; if (rec < 10) continue;
        const m = modelo.get(`${t}|${k}`); if (!dist[t].has(m)) dist[t].set(m, []); dist[t].get(m).push(d.suc[1] / rec); }
    }
  }
  for (const t of [1, 2]) for (const v of dist[t].values()) v.sort((a, b) => a - b);
}
const percentil = (t, m, p) => { const v = dist[t].get(m); if (!v || p == null) return null; let lo = 0, hi = v.length; while (lo < hi) { const md = (lo + hi) >> 1; if (v[md] < p) lo = md + 1; else hi = md; } return lo / v.length; };
const quant = (t, m, q) => { const v = dist[t].get(m); return v ? v[Math.floor(q * (v.length - 1))] : null; };

// ponto de mudança único na sequência 0/1 (V1 = 0, V3 = 1) dos atendimentos com pedido de digital
const llb = (k, n) => (k === 0 || k === n ? 0 : k * Math.log(k / n) + (n - k) * Math.log(1 - k / n));
function quebra(seq) {
  const n = seq.length; if (n < 20) return null;
  const tot = seq.reduce((a, b) => a + b, 0); const l0 = llb(tot, n);
  const melhor = (s) => { let acc = 0, best = -Infinity, pos = null; for (let i = 0; i < n - 1; i++) { acc += s[i]; if (i + 1 < 5 || n - i - 1 < 5) continue; const lr = llb(acc, i + 1) + llb(tot - acc, n - i - 1) - l0; if (lr > best) { best = lr; pos = i + 1; } } return { lr: best, pos }; };
  const obs = melhor(seq); if (obs.pos == null) return null;
  const s = [...seq]; let maior = 0;
  for (let p = 0; p < PERM; p++) { for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; } if (melhor(s).lr >= obs.lr) maior++; }
  const antes = seq.slice(0, obs.pos), depois = seq.slice(obs.pos);
  return { pos: obs.pos, n, lr: r2(2 * obs.lr), p: (maior + 1) / (PERM + 1), taxaAntes: r4(antes.reduce((a, b) => a + b, 0) / antes.length), taxaDepois: r4(depois.reduce((a, b) => a + b, 0) / depois.length) };
}
const p1De = (cs) => { const v1 = cs.filter((c) => c.via === 'v1'); return v1.length ? v1.filter((c) => c.tent === 1).length / v1.length : null; };

function medir(d, turno, modelo) {
  const cs = d.ciclos; const pede = cs.filter((c) => c.via === 'v1' || c.via === 'v3');
  const v1 = cs.filter((c) => c.via === 'v1'), v3 = cs.filter((c) => c.via === 'v3');
  const prim10 = pede.slice(0, 10).filter((c) => c.via === 'v3').length;
  const iPrimV3 = cs.findIndex((c) => c.via === 'v3');
  const qb = quebra(pede.map((c) => (c.via === 'v3' ? 1 : 0)));
  if (qb) { const a = pede.slice(0, qb.pos), b = pede.slice(qb.pos); qb.p1Antes = r4(p1De(a)); qb.p1Depois = r4(p1De(b)); qb.v1Antes = a.filter((c) => c.via === 'v1').length; qb.v1Depois = b.filter((c) => c.via === 'v1').length; qb.hora = r2(pede[qb.pos].t / 3600); }
  const p1 = p1De(cs); const med = quant(turno, modelo, 0.5);
  const horas = [];
  for (let h = 0; h < 24; h++) {
    const ph = pede.filter((c) => Math.floor(c.t / 3600) === h); if (!ph.length) continue;
    const n3 = ph.filter((c) => c.via === 'v3').length, n1 = ph.length - n3, p1h = p1De(ph);
    horas.push({ h, pedidos: ph.length, v3: n3, v1: n1, p1: r4(p1h), seletiva: n3 / ph.length >= 0.5 && n1 >= 10 && p1h != null && med != null && p1h >= med });
  }
  // ritmo: intervalos na mesma urna
  const intervalos = (lista) => { const out = []; const por = new Map(); for (const c of lista) { if (!por.has(c.urna)) por.set(c.urna, []); por.get(c.urna).push(c.t); } for (const ts of por.values()) for (let i = 1; i < ts.length; i++) out.push(ts[i] - ts[i - 1]); return out.sort((a, b) => a - b); };
  const mediana = (v) => (v.length ? v[Math.floor(v.length / 2)] : null);
  const tV3 = v3.map((c) => c.t).sort((a, b) => a - b); let raj = 0; for (let i = 0, j = 0; i < tV3.length; i++) { while (tV3[i] - tV3[j] > 600) j++; raj = Math.max(raj, i - j + 1); }
  const enc = Math.max(...Object.values(d.encerramento), -Infinity);
  // "já votou" depois de V3: o voto computado mais recente antes do aviso foi V3
  let jvDepoisV3 = 0; for (const tj of d.jaVotou) { let ult = null; for (const c of cs) { if (c.t <= tj) ult = c; else break; } if (ult?.via === 'v3') jvDepoisV3++; }
  const scores = v3.map((c) => c.scoreMesario).filter((s) => s != null).sort((a, b) => a - b);
  return {
    votos: cs.length, v1: v1.length, v2: cs.filter((c) => c.via === 'v2').length, v3: v3.length, urnasNoDiario: d.urnas,
    M1: { v3NosPrimeiros10Pedidos: prim10, posicaoPrimeiroV3: iPrimV3 >= 0 ? iPrimV3 + 1 : null, horaPrimeiroVoto: cs.length ? r2(cs[0].t / 3600) : null },
    M2: qb,
    M3: { reconhecidos: v1.length, p1: r4(p1), percentilNoModelo: r4(percentil(turno, modelo, p1)), p10Modelo: r4(quant(turno, modelo, 0.1)), medianaModelo: r4(med), horas },
    M4: { v3MesarioRegistrado: v3.filter((c) => c.mesario === 'registrado').length, v3SemAssociacao: v3.filter((c) => c.mesario === 'semAssociacao').length, v3SemMarca: v3.filter((c) => c.mesario == null).length,
      scoreMesarioMediana: mediana(scores), scoreMesarioMin: scores[0] ?? null },
    M5: { jaVotou: d.jaVotou.length, jaVotouDepoisDeV3: jvDepoisV3 },
    M6: { medianaIntervaloV3: mediana(intervalos(v3)), medianaIntervaloVotos: mediana(intervalos(cs)), rajadaV3_10min: raj, v3UltimaHora: Number.isFinite(enc) ? v3.filter((c) => c.t >= enc - 3600 && c.t <= enc).length : null },
    erros: d.erros, alertas: d.alertas,
  };
}

// z robusto dentro da zona (pares)
const todos = await lerPares('banco');
const { P } = filtrar(todos);
const porZona = new Map(); const pk = new Map();
for (const s of P) { s.mDc = s.c2 / s.a2 - s.c1 / s.a1; s.mS2 = s.s2; s.mDs = s.s2 != null && s.s1 != null ? s.s2 - s.s1 : null; if (!porZona.has(s.zon)) porZona.set(s.zon, []); porZona.get(s.zon).push(s); pk.set(`${s.uf}/${s.municipio}/${s.zona}/${s.secao}`, s); }
const medMad = (v) => { const o = v.filter(Number.isFinite).sort((a, b) => a - b); if (o.length < 5) return null; const m = o[Math.floor(o.length / 2)]; const dd = o.map((x) => Math.abs(x - m)).sort((a, b) => a - b); return { m, mad: 1.4826 * dd[Math.floor(dd.length / 2)] }; };
const zRob = (s, c) => { const mm = medMad(porZona.get(s.zon).filter((o) => o !== s).map((o) => o[c])); return mm && mm.mad && Number.isFinite(s[c]) ? (s[c] - mm.m) / mm.mad : null; };

const CORTE_M2 = 0.05 / massa.length;
const CORTE_Z = zBilateral(0.05 / (3 * massa.length));
const linhas = [];
for (const m of massa) {
  const k = `${m.uf}/${m.municipio}/${m.zona}/${m.secao}`;
  const d2 = medir(await lerCiclos(2, m.uf, m.municipio, m.zona, m.secao), 2, m.modelo2);
  let d1 = null; try { d1 = medir(await lerCiclos(1, m.uf, m.municipio, m.zona, m.secao), 1, m.modelo1); } catch { d1 = null; }
  const s = pk.get(k);
  const z = s ? { comparecimento: zRob(s, 'mDc'), parcela13_2t: zRob(s, 'mS2'), variacao13: zRob(s, 'mDs') } : null;
  const pz = z ? Object.fromEntries(Object.entries(z).map(([a, b]) => [a, b == null ? null : pNormal2(Math.abs(b))])) : null;
  const desvio = z ? Object.values(z).some((v) => v != null && Math.abs(v) >= CORTE_Z) : false;
  const quebraSig = d2.M2 && d2.M2.p < CORTE_M2;
  const leitor = d2.M1.v3NosPrimeiros10Pedidos >= 8 && !quebraSig && (d2.M3.reconhecidos < 10 || (d2.M3.p1 != null && d2.M3.p10Modelo != null && d2.M3.p1 < d2.M3.p10Modelo));
  const mesmaUrna = m.urna1 != null && m.urna1 === m.urna2;
  const falhaNova = leitor && mesmaUrna && m.c1 > 0 && m.p1 / m.c1 < 0.2;
  const seletivaHora = d2.M3.horas.some((h) => h.seletiva);
  const seletivaQuebra = quebraSig && d2.M2.taxaDepois > d2.M2.taxaAntes && d2.M2.pos > 0.1 * d2.M2.n && d2.M2.v1Antes >= 5 && d2.M2.v1Depois >= 5 && d2.M2.p1Depois >= d2.M2.p1Antes;
  const classe = seletivaHora || seletivaQuebra ? 'seletivo' : falhaNova ? 'falha nova no 2º turno' : leitor ? 'padrão de leitor' : 'indeterminado';
  linhas.push({ k, uf: m.uf, modelo2: m.modelo2, modelo1: m.modelo1, urnaMesma: mesmaUrna, comparecimento2: m.c2, manual2: m.p2, comparecimento1: m.c1 ?? null, manual1: m.p1 ?? null,
    classe, seletivaHora, seletivaQuebra, quebraSignificativa: !!quebraSig, z: z && Object.fromEntries(Object.entries(z).map(([a, b]) => [a, r2(b)])), pz, desvio, d2, d1 });
  log(`${k}: ${classe}${desvio ? ' (desvio)' : ''}`);
}
// BH secundário nos 291 testes de z
{
  const ps = []; for (const l of linhas) if (l.pz) for (const [c, p] of Object.entries(l.pz)) if (p != null) ps.push({ l, c, p });
  ps.sort((a, b) => a.p - b.p); let qmin = 1; for (let i = ps.length - 1; i >= 0; i--) { qmin = Math.min(qmin, (ps[i].p * ps.length) / (i + 1)); ps[i].q = qmin; }
  for (const x of ps) { x.l.qz ??= {}; x.l.qz[x.c] = x.q; }
}
const cont = (f) => linhas.filter(f).length;
const somaV = (f, c) => linhas.filter(f).reduce((a, l) => a + l[c], 0);
const res = {
  geradoEm: new Date().toISOString(), plano: '29 (45dc471)', conferencia: conf, permutacoes: PERM, corteM2: CORTE_M2, corteZ: r2(CORTE_Z), testes: { M2: massa.length, M8: 3 * massa.length },
  classes: Object.fromEntries(['padrão de leitor', 'falha nova no 2º turno', 'seletivo', 'indeterminado'].map((c) => [c, { secoes: cont((l) => l.classe === c), votantes: somaV((l) => l.classe === c, 'comparecimento2'), manual: somaV((l) => l.classe === c, 'manual2') }])),
  comDesvio: linhas.filter((l) => l.desvio).map((l) => ({ k: l.k, classe: l.classe, z: l.z })),
  comDesvioBH: linhas.filter((l) => l.qz && Object.values(l.qz).some((q) => q < 0.05)).map((l) => ({ k: l.k, classe: l.classe, z: l.z })),
  seletivas: linhas.filter((l) => l.classe === 'seletivo').map((l) => ({ k: l.k, porHora: l.seletivaHora, porQuebra: l.seletivaQuebra, z: l.z, desvio: l.desvio })),
  quebrasSignificativas: cont((l) => l.quebraSignificativa),
  totais2t: { votos: linhas.reduce((a, l) => a + l.d2.votos, 0), v3: linhas.reduce((a, l) => a + l.d2.v3, 0), jaVotou: linhas.reduce((a, l) => a + l.d2.M5.jaVotou, 0), jaVotouDepoisDeV3: linhas.reduce((a, l) => a + l.d2.M5.jaVotouDepoisDeV3, 0),
    v3MesarioRegistrado: linhas.reduce((a, l) => a + l.d2.M4.v3MesarioRegistrado, 0), v3SemAssociacao: linhas.reduce((a, l) => a + l.d2.M4.v3SemAssociacao, 0) },
  secoes: linhas,
};
await writeFile(path.join(SAIDA, 'massa.json'), JSON.stringify(res, null, 1));
await writeFile(path.join(SAIDA, 'massa.csv'), paraCsv(linhas.map((l) => ({ secao: l.k, classe: l.classe, modelo: l.modelo2, mesmaUrna: l.urnaMesma, comparecimento2: l.comparecimento2, manual2: l.manual2, comparecimento1: l.comparecimento1, manual1: l.manual1,
  v3Primeiros10: l.d2.M1.v3NosPrimeiros10Pedidos, quebraP: l.d2.M2?.p ?? '', quebraHora: l.d2.M2?.hora ?? '', reconhecidos: l.d2.M3.reconhecidos, p1: l.d2.M3.p1, p1Percentil: l.d2.M3.percentilNoModelo,
  v3MesarioRegistrado: l.d2.M4.v3MesarioRegistrado, v3SemAssociacao: l.d2.M4.v3SemAssociacao, scoreMesario: l.d2.M4.scoreMesarioMediana, jaVotou: l.d2.M5.jaVotou, rajadaV3: l.d2.M6.rajadaV3_10min,
  zComparecimento: l.z?.comparecimento ?? '', zParcela13: l.z?.parcela13_2t ?? '', zVariacao13: l.z?.variacao13 ?? '', desvio: l.desvio }))
, ['secao', 'classe', 'modelo', 'mesmaUrna', 'comparecimento2', 'manual2', 'comparecimento1', 'manual1', 'v3Primeiros10', 'quebraP', 'quebraHora', 'reconhecidos', 'p1', 'p1Percentil', 'v3MesarioRegistrado', 'v3SemAssociacao', 'scoreMesario', 'jaVotou', 'rajadaV3', 'zComparecimento', 'zParcela13', 'zVariacao13', 'desvio']));
const { secoes, ...curto } = res;
console.log(JSON.stringify(curto, null, 1));
log('fim');
