// Revisor cético, achado A7 (coerencia-contagem/04): conferência própria dos pontos em que as três lentes divergiram.
// 1) p beta-binomial do caso RN 17132/0010/0145 e se ele sobrevive à correção por múltiplos testes, conforme o rho;
// 2) decomposição do "9,37% contra 12,42%" em sem biometria cadastrada × digital que falhou, contra a própria zona,
//    por faixa de comparecimento; 3) quantas das 639 passam no filtro do autor com a beta-binomial;
// 4) local de votação 1414 (0145 + 0183) nos dois turnos e variação entre turnos na zona.
// Somente leitura (cópia de leitura do banco). Uso: node scripts/auditoria/cetico-a7-consolidacao.mjs
// Saída: resumo no terminal e data/parsed/auditoria/cetico/a7-consolidacao.json
import { mkdirSync, writeFileSync } from 'node:fs';
import { abrirLeitura } from '../../src/banco-leitura.js';

const { db, fonte } = await abrirLeitura();
const FED = { 1: 6257, 2: 6258 };
const q = db.prepare(`SELECT s.uf, s.municipio, s.zona, s.secao, s.local, s.numero_interno_urna AS urna, e.aptos, e.aptos_tte,
    e.comparecimento_majoritario AS comp, s.sem_biometria AS sem, s.por_biografia AS falha, s.por_biometria AS bio
  FROM secao s JOIN secao_eleicao e ON e.turno = s.turno AND e.uf = s.uf AND e.municipio = s.municipio AND e.zona = s.zona AND e.secao = s.secao AND e.eleicao = ?
  WHERE s.turno = ? AND s.situacao = 'completa'`);

const lfc = [0];
const lf = (n) => { while (lfc.length <= n) lfc.push(lfc[lfc.length - 1] + Math.log(lfc.length)); return lfc[n]; };
const L = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
function lnG(z) { if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnG(1 - z); z -= 1; let x = L[0]; for (let i = 1; i < 9; i++) x += L[i] / (z + i); const t = z + 7.5; return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x); }
function caudaBin(n, k, p) { if (k <= 0) return 1; if (k > n || p <= 0) return 0; let s = 0; for (let x = k; x <= n; x++) s += Math.exp(lf(n) - lf(x) - lf(n - x) + x * Math.log(p) + (n - x) * Math.log(1 - p)); return Math.min(1, s); }
function caudaBB(n, k, p, rho) { if (k <= 0) return 1; if (k > n || p <= 0) return 0; const s = (1 - rho) / rho; const a = p * s; const b = (1 - p) * s; const base = lnG(a + b) - lnG(a) - lnG(b) - lnG(n + a + b) + lf(n); let t = 0; for (let x = k; x <= n; x++) t += Math.exp(base - lf(x) - lf(n - x) + lnG(x + a) + lnG(n - x + b)); return Math.min(1, t); }

const chave = (r) => `${r.uf}|${r.municipio}|${r.zona}`;
function zonasDe(linhas) {
  const z = new Map();
  for (const r of linhas) {
    const o = z.get(chave(r)) ?? { aptos: 0, comp: 0, compD: 0, sem: 0, falha: 0 };
    o.aptos += r.aptos; o.comp += r.comp;
    if (r.sem !== null && r.falha !== null) { o.compD += r.comp; o.sem += r.sem; o.falha += r.falha; }
    z.set(chave(r), o);
  }
  return z;
}
// taxa da zona sem a própria seção: semDigital/comp, sem/comp, falha/(comp - sem)
function taxasZona(z, r) {
  const comp = z.compD - r.comp; const sem = z.sem - r.sem; const falha = z.falha - r.falha;
  if (comp <= 0 || comp - sem <= 0) return null;
  return { semDig: (sem + falha) / comp, sem: sem / comp, falhaCad: falha / (comp - sem) };
}
// rho por momentos (mesmo estimador do autor), para a proporção x/n contra a taxa p da zona sem a seção
function rhoMomentos(itens) { let sq = 0; let sn = 0; let sr = 0; let k = 0; for (const { x, n, p } of itens) { if (n < 2 || p <= 0 || p >= 1) continue; const qq = (x - n * p) ** 2 / (n * p * (1 - p)); sq += qq - 1; sn += n - 1; sr += qq; k++; } return { rho: Math.max(1e-6, sq / sn), dispersao: sr / k, n: k }; }

const t2 = q.all(FED[2], 2).filter((r) => r.aptos > 0);
const z2 = zonasDe(t2);
const comD = t2.filter((r) => r.sem !== null && r.falha !== null);

// rho nacional (dentro das zonas) da taxa sem digital e da falha entre cadastrados
const itSemDig = []; const itFalha = [];
for (const r of comD) { const tz = taxasZona(z2.get(chave(r)), r); if (!tz) continue; r.tz = tz; itSemDig.push({ x: r.sem + r.falha, n: r.comp, p: tz.semDig }); itFalha.push({ x: r.falha, n: r.comp - r.sem, p: tz.falhaCad }); }
const rhoNac = rhoMomentos(itSemDig); const rhoNacFalha = rhoMomentos(itFalha);

// decomposição por faixa de comparecimento: observado / esperado pela própria zona
const faixas = [['<80%', 0, 0.8], ['80–85%', 0.8, 0.85], ['85–90%', 0.85, 0.9], ['90–95%', 0.9, 0.95], ['≥95%', 0.95, 1.0001]];
const decomp = faixas.map(([nome, a, b]) => {
  const s = { faixa: nome, secoes: 0, comp: 0, semDig: 0, semDigEsp: 0, sem: 0, semEsp: 0, cad: 0, falha: 0, falhaEsp: 0 };
  for (const r of comD) { if (!r.tz) continue; const t = r.comp / r.aptos; if (t < a || t >= b) continue; s.secoes++; s.comp += r.comp; s.semDig += r.sem + r.falha; s.semDigEsp += r.comp * r.tz.semDig; s.sem += r.sem; s.semEsp += r.comp * r.tz.sem; s.cad += r.comp - r.sem; s.falha += r.falha; s.falhaEsp += (r.comp - r.sem) * r.tz.falhaCad; }
  return { ...s, pctSemDig: 100 * s.semDig / s.comp, pctSemDigEsp: 100 * s.semDigEsp / s.comp, razaoSemDig: s.semDig / s.semDigEsp, pctSem: 100 * s.sem / s.comp, pctSemEsp: 100 * s.semEsp / s.comp, razaoSem: s.sem / s.semEsp, pctFalhaCad: 100 * s.falha / s.cad, pctFalhaCadEsp: 100 * s.falhaEsp / s.cad, razaoFalha: s.falha / s.falhaEsp };
});

// poder no agregado, só pelo caminho "digital que falhou" (o único para votar por ausente com biometria):
// variância beta-binomial (rho nacional da falha) somada nas seções ≥ 95%; limite superior de 95% do excesso,
// contra a zona (razão 1) e contra a tendência da faixa 90–95% (razão observada nessa faixa)
let varFalha = 0;
for (const r of comD) { if (!r.tz || r.comp / r.aptos < 0.95) continue; const n = r.comp - r.sem; const p = r.tz.falhaCad; varFalha += n * p * (1 - p) * (1 + (n - 1) * rhoNacFalha.rho); }
const g95 = decomp[4]; const g90 = decomp[3];
const poderAgregado = { obs: g95.falha, esp: g95.falhaEsp, dp: Math.sqrt(varFalha), excessoVsZona: g95.falha - g95.falhaEsp, limSupVsZona: g95.falha - g95.falhaEsp + 1.96 * Math.sqrt(varFalha),
  espTendencia: g95.falhaEsp * g90.razaoFalha, limSupVsTendencia: g95.falha - g95.falhaEsp * g90.razaoFalha + 1.96 * Math.sqrt(varFalha) };

// filtro do autor (≥ 95%, semDigital acima da zona) com binomial e com beta-binomial (rho nacional)
const altas = comD.filter((r) => r.tz && r.comp / r.aptos >= 0.95);
const filtro = altas.map((r) => ({ id: `${r.uf} ${r.municipio}/${r.zona}/${r.secao}`, x: r.sem + r.falha, n: r.comp, p: r.tz.semDig, pBin: caudaBin(r.comp, r.sem + r.falha, r.tz.semDig), pBB: caudaBB(r.comp, r.sem + r.falha, r.tz.semDig, rhoNac.rho) }));
const bonf639 = 0.05 / altas.length; const bonfTodas = 0.05 / comD.length;
const resumoFiltro = { secoes: altas.length, binP001: filtro.filter((f) => f.pBin < 1e-3).length, bbP001: filtro.filter((f) => f.pBB < 1e-3).length, bbBonf639: filtro.filter((f) => f.pBB < bonf639).length, bbMenores: filtro.sort((a, b) => a.pBB - b.pBB).slice(0, 5).map((f) => ({ ...f, pBin: f.pBin.toExponential(2), pBB: f.pBB.toExponential(2) })) };

// caso RN 0145: rho da zona com dois estimadores e p sob cada rho
const zonaRN = comD.filter((r) => r.uf === 'rn' && r.municipio === '17132' && r.zona === '0010');
const zRN = z2.get('rn|17132|0010');
const pZonaIncl = (zRN.sem + zRN.falha) / zRN.compD;
const rhoZonaExcl = rhoMomentos(zonaRN.map((r) => ({ x: r.sem + r.falha, n: r.comp, p: r.tz.semDig })));
const rhoZonaIncl = rhoMomentos(zonaRN.map((r) => ({ x: r.sem + r.falha, n: r.comp, p: pZonaIncl })));
const rhoZonaFalha = rhoMomentos(zonaRN.map((r) => ({ x: r.falha, n: r.comp - r.sem, p: r.tz.falhaCad })));
const rnUF = comD.filter((r) => r.uf === 'rn' && r.tz); const rhoUF = rhoMomentos(rnUF.map((r) => ({ x: r.sem + r.falha, n: r.comp, p: r.tz.semDig })));
const c = zonaRN.find((r) => r.secao === '0145');
const x = c.sem + c.falha;
// rho da zona sem a própria 0145 (a seção testada não entra na estimativa da variação que a "defende")
const semCaso = zonaRN.filter((r) => r.secao !== '0145');
const rhoZonaLOO = rhoMomentos(semCaso.map((r) => ({ x: r.sem + r.falha, n: r.comp, p: r.tz.semDig })));
const rhoZonaLOOFalha = rhoMomentos(semCaso.map((r) => ({ x: r.falha, n: r.comp - r.sem, p: r.tz.falhaCad })));
const caso = {
  secao: '0145', aptos: c.aptos, comp: c.comp, sem: c.sem, falha: c.falha, bio: c.bio, pctSemDig: 100 * x / c.comp, pctZona: 100 * c.tz.semDig, pctFalhaCad: 100 * c.falha / (c.comp - c.sem), pctFalhaCadZona: 100 * c.tz.falhaCad,
  pBin: caudaBin(c.comp, x, c.tz.semDig),
  rho: { zonaExcl: rhoZonaExcl, zonaIncl: rhoZonaIncl, zonaSem0145: rhoZonaLOO, uf: rhoUF, nacional: rhoNac },
  pBB: { zonaExcl: caudaBB(c.comp, x, c.tz.semDig, rhoZonaExcl.rho), zonaIncl: caudaBB(c.comp, x, c.tz.semDig, rhoZonaIncl.rho), zonaSem0145: caudaBB(c.comp, x, c.tz.semDig, rhoZonaLOO.rho), uf: caudaBB(c.comp, x, c.tz.semDig, rhoUF.rho), nacional: caudaBB(c.comp, x, c.tz.semDig, rhoNac.rho) },
  falhaSo: { rhoZona: rhoZonaFalha.rho, rhoZonaSem0145: rhoZonaLOOFalha.rho, rhoNac: rhoNacFalha.rho, pBin: caudaBin(c.comp - c.sem, c.falha, c.tz.falhaCad), pBBZona: caudaBB(c.comp - c.sem, c.falha, c.tz.falhaCad, rhoZonaFalha.rho), pBBZonaSem0145: caudaBB(c.comp - c.sem, c.falha, c.tz.falhaCad, rhoZonaLOOFalha.rho), pBBNac: caudaBB(c.comp - c.sem, c.falha, c.tz.falhaCad, rhoNacFalha.rho) },
  bonf639, bonfTodas,
};

// local 1414 e variação 1º → 2º turno na zona (1º turno do RN carregado nesta cópia)
const t1 = q.all(FED[1], 1).filter((r) => r.uf === 'rn' && r.municipio === '17132' && r.zona === '0010');
const m1 = new Map(t1.map((r) => [r.secao, r]));
const deltas = [];
for (const r of zonaRN) { const o = m1.get(r.secao); if (!o || o.sem === null || o.aptos !== r.aptos) continue; deltas.push({ secao: r.secao, local: r.local, dComp: r.comp - o.comp, dSem: r.sem - o.sem, dFalha: r.falha - o.falha, dBio: r.bio - o.bio }); }
const media = (a) => a.reduce((s, v) => s + v, 0) / a.length; const dp = (a) => { const m = media(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); };
const dF = deltas.map((d) => d.dFalha); const dS = deltas.map((d) => d.dSem + d.dFalha);
const local = deltas.filter((d) => d.local === 1414);
const somaLocal = local.reduce((s, d) => ({ dComp: s.dComp + d.dComp, dSemDig: s.dSemDig + d.dSem + d.dFalha, dFalha: s.dFalha + d.dFalha, dBio: s.dBio + d.dBio }), { dComp: 0, dSemDig: 0, dFalha: 0, dBio: 0 });
// pares de seções do mesmo local, para ver se +23 sem digital em +26 é extremo entre locais com 2+ seções
const porLocal = new Map(); for (const d of deltas) { const o = porLocal.get(d.local) ?? { n: 0, dComp: 0, dSemDig: 0 }; o.n++; o.dComp += d.dComp; o.dSemDig += d.dSem + d.dFalha; porLocal.set(d.local, o); }
const locais = [...porLocal].map(([k, v]) => ({ local: k, ...v }));
const rankLocalSemDig = 1 + locais.filter((l) => l.dSemDig > somaLocal.dSemDig).length;
const turnoRN = {
  secoesPareadas: deltas.length, dFalha: { media: media(dF), dp: dp(dF), z0145: (local.find((d) => d.secao === '0145').dFalha - media(dF)) / dp(dF) },
  dSemDig: { media: media(dS), dp: dp(dS) }, local1414: { secoes: local, soma: somaLocal, zSemDigSoma: (somaLocal.dSemDig - 2 * media(dS)) / (Math.SQRT2 * dp(dS)), rankEntreLocais: `${rankLocalSemDig} de ${locais.length}` },
  comparecimentoZona: { t1: 100 * t1.reduce((s, r) => s + r.comp, 0) / t1.reduce((s, r) => s + r.aptos, 0), t2: 100 * zRN.comp / zRN.aptos },
};

const saida = { fonte, secoes2t: t2.length, comDetalhamento: comD.length, rhoNacSemDig: rhoNac, rhoNacFalha, decomp, poderAgregado, filtro: resumoFiltro, caso, turnoRN };
const f = (v) => (typeof v === 'number' ? (Math.abs(v) < 1e-3 && v !== 0 ? v.toExponential(2) : +v.toFixed(4)) : v);
console.log(JSON.stringify(saida, (k, v) => f(v), 1));
mkdirSync('data/parsed/auditoria/cetico', { recursive: true });
writeFileSync('data/parsed/auditoria/cetico/a7-consolidacao.json', JSON.stringify(saida, (k, v) => f(v), 1) + '\n');
