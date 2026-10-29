// Consolidação do parecer caso-pi-11878-0028-0099: confere os pontos em que as lentes divergiram.
// Lê só data/parsed/comparacao-turnos/*.jsonl (saída do pipeline, 28 UFs). Sem banco, sem rede.
// Uso: node scripts/auditoria/cetico-pi0099-consolidacao.mjs
import { readdirSync, createReadStream, writeFileSync, mkdirSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';

const DIR = 'data/parsed/comparacao-turnos';
const OUT = 'data/parsed/auditoria/cetico';
const ufs = readdirSync(DIR).filter((f) => /^[a-z]{2}.jsonl$/.test(f)).sort();
const fat = (v) => { const a = v['13'] ?? 0, b = v['22'] ?? 0; return a + b > 0 ? a / (a + b) : null; };

let n = 0;
const mig13 = [], mig22 = [];
const munPI = [];
const resid = []; // [chave, residuo13 em p.p. contra a mediana do município, validos2]
const porMun = new Map();
for (const f of ufs) {
  const rl = createInterface({ input: createReadStream(join(DIR, f)), crlfDelay: Infinity });
  for await (const l of rl) {
    if (!l.trim()) continue;
    const r = JSON.parse(l); n++;
    const k = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
    const m = r.migracaoMinima || {};
    if ((m['13'] ?? 0) > 0) mig13.push([k, m['13']]);
    if ((m['22'] ?? 0) > 0) mig22.push([k, m['22']]);
    const f1 = fat(r.votos1), f2 = fat(r.votos2);
    if (f1 == null || f2 == null) continue;
    const v2 = (r.votos2['13'] ?? 0) + (r.votos2['22'] ?? 0);
    const mk = `${r.uf}/${r.municipio}`;
    if (!porMun.has(mk)) porMun.set(mk, []);
    porMun.get(mk).push({ k, d: (f2 - f1) * 100, v2, f1 });
  }
}
const med = (a) => { const s = [...a].sort((x, y) => x - y); const h = s.length >> 1; return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };
const medSup = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
for (const [mk, arr] of porMun) {
  const md = med(arr.map((x) => x.d));
  for (const x of arr) resid.push({ k: x.k, r: x.d - md, v2: x.v2, f1: x.f1, d: x.d });
}
const pi = porMun.get('pi/11878');
const dPI = pi.map((x) => x.d);
const alvo = resid.find((x) => x.k === 'pi/11878/0028/0099');
const v100 = resid.filter((x) => x.v2 >= 100);
const cauda = (lim) => ({ contra13: v100.filter((x) => x.r <= -lim).length, aFavor13: v100.filter((x) => x.r >= lim).length });
const topo = (s) => [...v100].sort((a, b) => s * (a.r - b.r)).slice(0, 6).map((x) => ({ secao: x.k, residuo_pp: +x.r.toFixed(2), variacao_pp: +x.d.toFixed(2), votos2: x.v2 }));
const res = {
  comparadas: n, ufs: ufs.length,
  migracaoMinima: {
    para22_maior0: mig22.length, para22: mig22.sort((a, b) => b[1] - a[1]),
    para13_maior0: mig13.length, para13: mig13.sort((a, b) => b[1] - a[1]),
  },
  municipio_pi_11878: { secoes: pi.length, mediana: +med(dPI).toFixed(3), medianaSuperior: +medSup(dPI).toFixed(3), min: +Math.min(...dPI).toFixed(2), max: +Math.max(...dPI).toFixed(2) },
  secao: { variacao_pp: +alvo.d.toFixed(2), residuo_pp: +alvo.r.toFixed(2) },
  residuo_votos2_100mais: { secoes: v100.length, limiar_igual_secao: cauda(Math.abs(alvo.r)), limiar_15pp: cauda(15), limiar_20pp: cauda(20) },
  maisNegativos: topo(1), maisPositivos: topo(-1),
};
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'cetico-pi0099-consolidacao.json'), JSON.stringify(res, null, 2));
console.log(JSON.stringify(res, null, 2));
