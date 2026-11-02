// Estatístico eleitoral, doc 30 (plano 29, commit 45dc471), H02(d): seções fora do normal na liberação manual (pg do BU:
// 4 capturas de digital sem reconhecimento e liberação pelo mesário), por turno, contra a própria zona.
// Referência: beta-binomial da zona (uf + zona), média e dispersão pelo método dos momentos nas OUTRAS seções da zona;
// zona com menos de 10 outras seções → município; município com menos de 10 → UF + modelo de urna.
// Valor-p unilateral superior; BH q < 0,01 (fora do normal) e Bonferroni 5% (confirmado), por turno.
// Explicação das fora do normal do 2º turno: (1) leitor: p1 (reconhecidos na 1ª tentativa ÷ reconhecidos, doc 08) abaixo do
// percentil 10 do mesmo modelo de urna no 2º turno, ou < 10 reconhecidos com ≥ 20 pedidos de digital; (2) crônico: também
// fora do normal no 1º turno com o mesmo número interno de urna; (3) sem explicação técnica. Grupo 3: desvio de comparecimento
// e de voto contra a zona (z por mediana e MAD), Bonferroni na família do grupo 3.
// Uso: node --max-old-space-size=8192 scripts/auditoria/estatistico-h02-h05-final-outliers.mjs
// Saída: data/parsed/auditoria/estatistico-eleitoral/h02-h05-final/outliers.json e outliers-2t.csv
import { createReadStream } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { lnGama, paraCsv } from './forense-lib.mjs';
import { filtrar, lerPares, zBilateral } from './estatistico-lib.mjs';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico-eleitoral', 'h02-h05-final');
const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const r4 = (x) => (Number.isFinite(x) ? Math.round(x * 10000) / 10000 : null);
const r2 = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : null);

// P(X ≥ k), X ~ BetaBinomial(n, a, b): termo inicial por log-gama e os seguintes pela razão entre termos consecutivos
function bbCauda(n, a, b, k) {
  if (k <= 0) return 1; if (k > n) return 0;
  const lnB = (p, q) => lnGama(p) + lnGama(q) - lnGama(p + q);
  let lt = lnGama(n + 1) - lnGama(k + 1) - lnGama(n - k + 1) + lnB(k + a, n - k + b) - lnB(a, b);
  let termo = Math.exp(lt), s = 0;
  for (let j = k; j <= n; j++) {
    s += termo;
    if (j < n) termo *= ((n - j) / (j + 1)) * ((j + a) / (n - j - 1 + b));
    if (termo < s * 1e-17) break;
  }
  return Math.min(1, s);
}

const { db } = await abrirLeitura();
const res = { geradoEm: new Date().toISOString(), plano: '29 (45dc471)', turnos: {} };
const secoes = {};
for (const t of [1, 2]) {
  const rows = db.prepare(`SELECT uf, municipio, zona, secao, comparecimento n, por_biografia x, numero_interno_urna urna, modelo_urna modelo FROM secao
    WHERE turno = ? AND uf <> 'zz' AND comparecimento > 0 AND por_biografia IS NOT NULL ORDER BY uf, municipio, zona, secao`).all(t).map((r) => ({ ...r }));
  // somas por grupo, para o deixa-um-de-fora
  const somas = (chave) => { const m = new Map(); for (const r of rows) { const k = chave(r); const g = m.get(k) ?? { m: 0, X: 0, N: 0, X2: 0, XN: 0, N2: 0, NN1: 0 }; g.m++; g.X += r.x; g.N += r.n; g.X2 += r.x * r.x; g.XN += r.x * r.n; g.N2 += r.n * r.n; g.NN1 += r.n * (r.n - 1); m.set(k, g); } return m; };
  const nivel = [['zona', (r) => `${r.uf}|${r.zona}`], ['municipio', (r) => `${r.uf}|${r.municipio}`], ['ufModelo', (r) => `${r.uf}|${r.modelo}`]];
  const S = nivel.map(([nome, f]) => [nome, f, somas(f)]);
  const usoNivel = { zona: 0, municipio: 0, ufModelo: 0, semReferencia: 0 };
  let calculados = 0;
  for (const r of rows) {
    let ref = null;
    for (const [nome, f, m] of S) {
      const g = m.get(f(r)); const mm = g.m - 1; if (mm < 10) continue;
      const X = g.X - r.x, N = g.N - r.n, X2 = g.X2 - r.x * r.x, XN = g.XN - r.x * r.n, N2 = g.N2 - r.n * r.n, NN1 = g.NN1 - r.n * (r.n - 1);
      const mu = X / N;
      if (!(mu > 0 && mu < 1)) { ref = { nome, mu, rho: 0 }; break; }
      const num = X2 - 2 * mu * XN + mu * mu * N2 - mu * (1 - mu) * N;
      let rho = num / (mu * (1 - mu) * NN1); rho = Math.min(Math.max(rho, 1e-6), 0.99);
      ref = { nome, mu, rho }; break;
    }
    if (!ref) { usoNivel.semReferencia++; r.p = null; continue; }
    usoNivel[ref.nome]++; r.mu = ref.mu; r.rho = ref.rho;
    if (r.x <= r.n * ref.mu) { r.p = 1; continue; } // abaixo da média: p ≥ ~0,5; não muda a triagem (cauda superior)
    if (ref.mu <= 0) { r.p = r.x > 0 ? 0 : 1; continue; }
    const a = ref.mu * (1 - ref.rho) / ref.rho, b = (1 - ref.mu) * (1 - ref.rho) / ref.rho;
    r.p = bbCauda(r.n, a, b, r.x); calculados++;
  }
  const com = rows.filter((r) => r.p != null);
  const ord = [...com].sort((a, b) => a.p - b.p); let qmin = 1;
  for (let i = ord.length - 1; i >= 0; i--) { qmin = Math.min(qmin, (ord[i].p * ord.length) / (i + 1)); ord[i].q = qmin; }
  const bonf = 0.05 / com.length;
  const fora = com.filter((r) => r.q < 0.01), conf = com.filter((r) => r.p < bonf);
  res.turnos[`${t}t`] = { secoes: rows.length, comReferencia: com.length, usoNivel, caudaCalculada: calculados, corteBonferroni: bonf,
    foraDoNormal: fora.length, foraDoNormalVotos: fora.reduce((a, r) => a + r.n, 0), foraDoNormalManual: fora.reduce((a, r) => a + r.x, 0),
    confirmadas: conf.length, confirmadasManual: conf.reduce((a, r) => a + r.x, 0), manualTotal: rows.reduce((a, r) => a + r.x, 0),
    porModelo: Object.fromEntries([...new Set(fora.map((r) => r.modelo))].map((m) => [m, fora.filter((r) => r.modelo === m).length])) };
  secoes[t] = new Map(rows.map((r) => [`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, r]));
  log(`turno ${t}: ${com.length} seções, fora do normal ${fora.length} (BH), confirmadas ${conf.length} (Bonferroni)`);
}
db.close();

// leitor (doc 08): p1 do 2º turno, reconhecidos e pedidos
const leitor = new Map();
for (const f of (await readdir(path.join(SAIDA, '..', 'leitor'))).filter((n) => /^[a-z]{2}\.jsonl$/.test(n))) {
  for await (const l of createInterface({ input: createReadStream(path.join(SAIDA, '..', 'leitor', f)), crlfDelay: Infinity })) {
    if (!l) continue; const r = JSON.parse(l); const k = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
    const um = (d) => { if (!d) return null; const rec = d.suc.reduce((a, b) => a + b, 0) + d.sucMais; return { rec, B: d.bio + d.man, p1: rec ? d.suc[1] / rec : null }; };
    leitor.set(k, { d1: um(r.d1), d2: um(r.d2), urna1: r.urna1, urna2: r.urna2 });
  }
}
// percentil 10 de p1 por modelo de urna, 2º turno (seções com ≥ 10 reconhecidos)
const p10 = {};
{
  const porM = new Map();
  for (const [k, l] of leitor) { const s = secoes[2].get(k); if (!s || !l.d2 || l.d2.rec < 10) continue; if (!porM.has(s.modelo)) porM.set(s.modelo, []); porM.get(s.modelo).push(l.d2.p1); }
  for (const [m, v] of porM) { v.sort((a, b) => a - b); p10[m] = v[Math.floor(0.1 * (v.length - 1))]; }
}
res.p1Percentil10PorModelo = Object.fromEntries(Object.entries(p10).map(([m, v]) => [m, r4(v)]));

// classes das fora do normal do 2º turno
const fora1 = new Set([...secoes[1]].filter(([, r]) => r.q < 0.01).map(([k]) => k));
const lista = [];
for (const [k, r] of secoes[2]) {
  if (!(r.q < 0.01)) continue;
  const l = leitor.get(k); const r1 = secoes[1].get(k);
  const leitorRuim = l?.d2 ? (l.d2.rec < 10 && l.d2.B >= 20) || (l.d2.rec >= 10 && l.d2.p1 < p10[r.modelo]) : false;
  const cronico = fora1.has(k) && r1 && r1.urna === r.urna;
  lista.push({ k, uf: r.uf, modelo: r.modelo, comparecimento: r.n, manual: r.x, taxa: r4(r.x / r.n), mediaZona: r4(r.mu), q: r.q, confirmada: r.p < res.turnos['2t'].corteBonferroni,
    p1: r4(l?.d2?.p1), reconhecidos: l?.d2?.rec ?? null, manual1t: r1?.x ?? null, comparecimento1t: r1?.n ?? null, foraNo1t: fora1.has(k), mesmaUrna: r1 ? r1.urna === r.urna : null,
    classe: leitorRuim ? 'leitor' : cronico ? 'cronico' : 'semExplicacaoTecnica' });
}
// z robusto do grupo 3 (variação de comparecimento, parcela do 13 no 2º turno e sua variação), dentro da zona (uf|zona)
const todos = await lerPares('banco');
const { P } = filtrar(todos);
const porZona = new Map(); const pk = new Map();
for (const s of P) { s.mDc = s.c2 / s.a2 - s.c1 / s.a1; s.mS2 = s.s2; s.mDs = s.s2 != null && s.s1 != null ? s.s2 - s.s1 : null; if (!porZona.has(s.zon)) porZona.set(s.zon, []); porZona.get(s.zon).push(s); pk.set(`${s.uf}/${s.municipio}/${s.zona}/${s.secao}`, s); }
const medMad = (v) => { const o = v.filter(Number.isFinite).sort((a, b) => a - b); if (o.length < 5) return null; const m = o[Math.floor(o.length / 2)]; const d = o.map((x) => Math.abs(x - m)).sort((a, b) => a - b); return { m, mad: 1.4826 * d[Math.floor(d.length / 2)] }; };
const zRob = (s, c) => { const mm = medMad(porZona.get(s.zon).filter((o) => o !== s).map((o) => o[c])); return mm && mm.mad && Number.isFinite(s[c]) ? (s[c] - mm.m) / mm.mad : null; };
const g3 = lista.filter((x) => x.classe === 'semExplicacaoTecnica');
const corte = zBilateral(0.05 / Math.max(1, 3 * g3.length));
for (const x of g3) {
  const s = pk.get(x.k);
  x.z = s ? { comparecimento: r2(zRob(s, 'mDc')), parcela13_2t: r2(zRob(s, 'mS2')), variacao13: r2(zRob(s, 'mDs')) } : null;
  x.desvio = x.z ? Object.values(x.z).some((v) => v != null && Math.abs(v) >= corte) : false;
}
const somaM = (l) => l.reduce((a, x) => a + x.manual, 0);
const totM = somaM(lista);
res.classes2t = {
  foraDoNormal: lista.length, manual: totM,
  leitor: { secoes: lista.filter((x) => x.classe === 'leitor').length, manual: somaM(lista.filter((x) => x.classe === 'leitor')) },
  cronico: { secoes: lista.filter((x) => x.classe === 'cronico').length, manual: somaM(lista.filter((x) => x.classe === 'cronico')) },
  semExplicacaoTecnica: { secoes: g3.length, manual: somaM(g3), parcelaDoManual: r4(somaM(g3) / totM), testes: 3 * g3.length, corteZ: r2(corte),
    comDesvio: g3.filter((x) => x.desvio).length, comDesvioManual: somaM(g3.filter((x) => x.desvio)), comDesvioComparecimento: g3.filter((x) => x.desvio).reduce((a, x) => a + x.comparecimento, 0) },
};
const c = res.classes2t;
c.regra = 'equipamento: ≥ 95% do manual nas classes leitor ou crônico; pede explicação: grupo 3 > 5% do manual, ou alguma seção do grupo 3 com desvio acima do corte';
c.leitura = (c.semExplicacaoTecnica.parcelaDoManual > 0.05 || c.semExplicacaoTecnica.comDesvio > 0) ? 'pede explicação' : 'equipamento';
res.grupo3ComDesvio = g3.filter((x) => x.desvio).sort((a, b) => a.q - b.q).map((x) => ({ ...x, q: x.q.toExponential(2) }));
await writeFile(path.join(SAIDA, 'outliers.json'), JSON.stringify(res, null, 1));
await writeFile(path.join(SAIDA, 'outliers-2t.csv'), paraCsv(lista.map((x) => ({ ...x, z: x.z ? JSON.stringify(x.z) : '' })), Object.keys(lista[0])));
console.log(JSON.stringify({ turnos: res.turnos, p10: res.p1Percentil10PorModelo, classes2t: res.classes2t, grupo3ComDesvio: res.grupo3ComDesvio.slice(0, 30) }, null, 1));
log('fim');
