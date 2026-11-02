// Estatístico eleitoral, plano 31 (commit 067d1a7): contas EXPLORATÓRIAS feitas depois de ver os resultados confirmatórios.
//  (1) H19(b), família Bz: o teste do Norte (voto) que passou o corte sem o rastro do comparecimento. Tamanho em votos
//      implicado pelo β, o mesmo modelo por UF do Norte, sem as 10 seções de maior |Δ(Z ÷ B)| e com Y do 1º turno de placebo.
//  (2) H14(c): fração de urnas em que TODA comparação do dedo de quem autoriza com os mesários registrados deu escore 0,
//      G1 × G2 (Fisher), e o par de modelos (original → reserva) dessas urnas; e a taxa sem digital das reservas por par de
//      modelos em todas as contingências do dia (biometria-por-urna.json do engenheiro).
// Saída: h14-h19-final/exploratorio.json
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { REGIOES, amostra, ctrlDe, regredir } from './estatistico-h19-lib.mjs';
import { DIR_FINAL, lerCsv, linhasJsonl, num, pBi } from './estatistico-h14-h19-final-lib.mjs';

const A = path.join(DIR_DADOS, 'parsed', 'auditoria');
const R = { geradoEm: new Date().toISOString(), aviso: 'exploratório: feito depois de ver os resultados do plano 31' };

// ---------- (1) Norte
const Z = new Map();
for (const uf of REGIOES.Norte) for await (const r of linhasJsonl(path.join(A, 'cetico', '45', 'captura', `${uf}.jsonl`))) Z.set(r.id, r);
const L = amostra.filter((s) => REGIOES.Norte.includes(s.uf)).map((s) => {
  const r = Z.get(s.id);
  const zb = (t) => { const d = r?.[`d${t}`]; return d && d.bio + d.F > 0 ? d.Fcap[0] / (d.bio + d.F) : NaN; };
  return { s, dz: zb(2) - zb(1) };
}).filter((o) => Number.isFinite(o.dz));
const linhas = (lista, placebo = false) => lista.map(({ s, dz }) => ({ g: s.g, cl: s.cl, w: s.v13_2 + s.v22_2, x: [dz], c: ctrlDe(s), y: placebo ? 100 * s.Y1 : 100 * (s.Y2 - s.Y1) }));
const ajusta = (lista, placebo) => { const r = regredir(linhas(lista, placebo)); return r ? { beta: r.beta[0], se: r.se[0], z: r.beta[0] / r.se[0], N: r.N } : null; };
const base = ajusta(L);
// votos implicados: β/100 × Σ (Δz − média ponderada do grupo) × (13 + 22); com efeito fixo, só a variação dentro do grupo conta
const gm = new Map();
for (const o of L) { const e = gm.get(o.s.g) ?? { w: 0, wz: 0 }; e.w += o.s.v13_2 + o.s.v22_2; e.wz += (o.s.v13_2 + o.s.v22_2) * o.dz; gm.set(o.s.g, e); }
let pos = 0, neg = 0;
for (const o of L) { const e = gm.get(o.s.g); const d = o.dz - e.wz / e.w; const v = (base.beta / 100) * d * (o.s.v13_2 + o.s.v22_2); if (v > 0) pos += v; else neg += v; }
const top = [...L].sort((a, b) => Math.abs(b.dz) - Math.abs(a.dz));
R.norte = {
  secoes: L.length, modelo: base, placebo: ajusta(L, true), votosImplicados: { positivos: pos, negativos: neg },
  semTop10: ajusta(top.slice(10)), semTop50: ajusta(top.slice(50)),
  top10: top.slice(0, 10).map(({ s, dz }) => ({ id: s.id, dzPontos: 100 * dz, Z1: Z.get(s.id)?.d1?.Fcap[0], Z2: Z.get(s.id)?.d2?.Fcap[0], dY: 100 * (s.Y2 - s.Y1) })),
  porUf: Object.fromEntries(REGIOES.Norte.map((uf) => [uf, ajusta(L.filter((o) => o.s.uf === uf))])),
};
console.log('Norte', JSON.stringify({ base, semTop10: R.norte.semTop10, placebo: R.norte.placebo, votos: R.norte.votosImplicados }));

// ---------- (2) H14(c): escore 0 contra os mesários registrados
const SD = JSON.parse(readFileSync(path.join(DIR_FINAL, 'semdigital.json'), 'utf8'));
const tab = new Map((await lerCsv(path.join(A, 'reservas-1t2t', 'secoes.csv'))).map((o) => [`${o.uf}/${o.municipio}/${o.zona}/${o.secao}`, o]));
const todasZero = (x) => x.mesCmp.n > 0 && x.mesCmp.zero === x.mesCmp.n;
const g1 = SD.casos.filter((x) => x.grupo === 'G1'), g2 = SD.casos.filter((x) => x.grupo === 'G2' && x.mesCmp.n > 0);
const lf = (n) => { let s = 0; for (let i = 2; i <= n; i++) s += Math.log(i); return s; };
const fisher = (a, b, c, d) => { const r1 = a + b, r2 = c + d, c1 = a + c, n = r1 + r2; const pr = (x) => Math.exp(lf(r1) + lf(r2) + lf(c1) + lf(n - c1) - lf(n) - lf(x) - lf(r1 - x) - lf(c1 - x) - lf(r2 - c1 + x)); const p0 = pr(a); let p = 0; for (let x = Math.max(0, c1 - r2); x <= Math.min(r1, c1); x++) { const q = pr(x); if (q <= p0 * (1 + 1e-9)) p += q; } return Math.min(1, p); };
const a = g1.filter(todasZero).length, c = g2.filter(todasZero).length;
R.escoreZero = { G1: { urnas: g1.length, todasZero: a }, G2: { urnas: g2.length, todasZero: c }, fisherP: fisher(a, g1.length - a, c, g2.length - c),
  casosG1: g1.map((x) => ({ id: x.k, todasZero: todasZero(x), comparacoes: x.mesCmp.n, modelo1: tab.get(x.k)?.modelo1, modelo2: tab.get(x.k)?.modelo2, modeloOriginal: tab.get(x.k)?.modeloOrig, classe: x.classeDoc07, aut: x.aut })) };
// taxa sem digital da reserva por par de modelos, em todas as contingências do dia com ≥ 30 votos na reserva
const bio = new Map(JSON.parse(readFileSync(path.join(A, 'reservas-rastro', 'biometria-por-urna.json'), 'utf8')).secoes.map((o) => [o.k, o]));
const pares = {};
for (const [k, o] of tab) {
  if (!o.classe.startsWith('contingencia_dia')) continue;
  const b = bio.get(k);
  if (!b?.reserva || b.reserva.votos < 30) continue;
  const par = `${(o.modeloOrig || '?').toLowerCase()} → ${o.modelo2}`;
  const e = (pares[par] ??= { secoes: 0, votosReserva: 0, semDigitalReserva: 0, votosOriginal: 0, semDigitalOriginal: 0, reservasAcima50: 0 });
  e.secoes++; e.votosReserva += b.reserva.votos; e.semDigitalReserva += b.reserva.votos - b.reserva.bio;
  if (b.outras) { e.votosOriginal += b.outras.votos; e.semDigitalOriginal += b.outras.votos - b.outras.bio; }
  if ((b.reserva.votos - b.reserva.bio) / b.reserva.votos > 0.5) e.reservasAcima50++;
}
for (const e of Object.values(pares)) { e.pctReserva = (100 * e.semDigitalReserva) / e.votosReserva; e.pctOriginal = e.votosOriginal ? (100 * e.semDigitalOriginal) / e.votosOriginal : null; }
R.paresDeModelo = pares;
console.log('escore 0', JSON.stringify({ G1: R.escoreZero.G1, G2: R.escoreZero.G2, p: R.escoreZero.fisherP }));
await writeFile(path.join(DIR_FINAL, 'exploratorio.json'), JSON.stringify(R, null, 1));
