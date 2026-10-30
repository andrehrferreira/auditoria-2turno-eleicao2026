// H21, passo 2: teste do número nulo usado como "senha" (plano registrado antes: docs/analysis/estatistico-eleitoral/13-h21-plano.md).
// Entrada: data/parsed/auditoria/estatistico-eleitoral/h21/ (estatistico-h21-extrair.mjs) e números válidos dos dados abertos:
//   consulta_cand_2026 (só NR_TURNO, SG_UF, CD_CARGO, NR_CANDIDATO, NR_PARTIDO; nenhuma outra coluna é lida)
//   votacao_candidato_munzona 2018 e 2022 (arquivos por UF e BR; só CD_CARGO, SG_UF, NR_CANDIDATO, NR_PARTIDO).
// Sinais (cortes do plano):
//   C  concentração: zona de menor p = P(Bin(N, e_z/E) ≥ x_z), × nº de zonas do âmbito; BH sobre todos os testes (N ≥ 10);
//      q < 0,01, lift ≥ 10 e ≥ 10 ocorrências na zona.
//   R  as 3 zonas de maior contagem somam ≥ 50% das ocorrências do âmbito.
//   G  2º turno, presidente (país) e governador (AC, AM, DF, ES, RN, TO): na zona do C, x2 | x1 + x2 ~ Bin(x1 + x2, e2/(e1 + e2));
//      p < 0,01 e x2 ≥ 2 × esperado.
//   Famílias benignas F1–F6 (ver plano) saem da lista de candidatos a "senha", mas são relatadas.
// Só leitura. Uso: node --max-old-space-size=8192 scripts/auditoria/estatistico-h21-analise.mjs
// Saídas em data/parsed/auditoria/estatistico-eleitoral/h21/: testes.csv (todos os testes), sinalizados.csv (C ∧ R, com
// família), candidatos.csv (candidatos a senha), resumo.json.
import { createReadStream, readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { RAIZ, paraCsv, lnGama } from './forense-lib.mjs';
import { bh } from './estatistico-lib.mjs';
import { entradasZip, linhasBrutas } from './contagem-zip.mjs';

const DIR = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'estatistico-eleitoral', 'h21');
const CARGOS = [1, 3, 5, 6, 7, 8];
const NOME_CARGO = { 1: 'presidente', 3: 'governador', 5: 'senador', 6: 'deputado federal', 7: 'deputado estadual', 8: 'deputado distrital' };
const DIGITOS = { 1: 2, 3: 2, 5: 3, 6: 4, 7: 5, 8: 5 };
const UF_GOV_2T = new Set(['ac', 'am', 'df', 'es', 'rn', 'to']);
const N_MIN = 10, Q_MAX = 0.01, LIFT_MIN = 10, X_MIN = 10, TOP3_MIN = 0.5, PG_MAX = 0.01, G_FATOR = 2;
const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);

// ---------- distribuições ----------
const lnBeta = (a, b) => lnGama(a) + lnGama(b) - lnGama(a + b);
function betacf(a, b, x) {
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - (qab * x) / qap;
  if (Math.abs(d) < 1e-300) d = 1e-300;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 2000; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d; h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-14) break;
  }
  return h;
}
/** ln P(X ≥ k), X ~ Binomial(n, p) = ln I_p(k, n − k + 1). */
export function lnBinomSup(n, p, k) {
  if (k <= 0) return 0;
  if (k > n || p <= 0) return -Infinity;
  if (p >= 1) return 0;
  const a = k, b = n - k + 1;
  const lnFrente = a * Math.log(p) + b * Math.log1p(-p) - lnBeta(a, b);
  if (p < (a + 1) / (a + b + 2)) return lnFrente + Math.log(betacf(a, b, p)) - Math.log(a);
  const comp = Math.exp(lnFrente + Math.log(betacf(b, a, 1 - p)) - Math.log(b)); // I_{1−p}(b, a)
  return Math.log(Math.max(1e-300, 1 - comp));
}

// ---------- números válidos ----------
const qualquerNumero = new Set(); // F1
const partidos = new Set(); // F5
const validos = new Map(); // cargo|ambito -> Set (candidatos e partidos de 2026, no âmbito)
const addValido = (cargo, ambito, nr) => { const k = `${cargo}|${ambito}`; (validos.get(k) ?? validos.set(k, new Set()).get(k)).add(nr); };
const normal = (s) => String(Number(s));
const conf = { candidatos2026: 0, linhasHistorico: {} };

{
  const zip = path.join(RAIZ, 'data', 'raw', 'dadosabertos', 'consulta_cand', 'consulta_cand_2026.zip');
  for (const e of (await entradasZip(zip)).filter((x) => x.nome.endsWith('.csv'))) {
    let col = null;
    for await (const c of linhasBrutas(zip, e)) {
      if (!col) { col = Object.fromEntries(c.map((x, i) => [x, i])); continue; }
      const cargo = Number(c[col.CD_CARGO]);
      const nr = normal(c[col.NR_CANDIDATO]), pt = normal(c[col.NR_PARTIDO]);
      if (!Number.isFinite(Number(nr))) continue;
      conf.candidatos2026++;
      qualquerNumero.add(nr);
      if (Number(pt) > 0) { qualquerNumero.add(pt); partidos.add(pt); }
      const ambito = cargo === 1 ? 'br' : c[col.SG_UF].toLowerCase();
      if (CARGOS.includes(cargo)) {
        addValido(cargo, ambito, nr);
        if (Number(pt) > 0 && cargo >= 6) addValido(cargo, ambito, pt); // voto de legenda nos proporcionais
      }
    }
  }
  log(`consulta_cand 2026: ${conf.candidatos2026} linhas; ${partidos.size} partidos`);
}
for (const ano of [2018, 2022]) {
  const zip = path.join(RAIZ, 'data', 'raw', 'dadosabertos', 'votacao_candidato_munzona', `votacao_candidato_munzona_${ano}.zip`);
  let n = 0;
  for (const e of (await entradasZip(zip)).filter((x) => /_[A-Z]{2}\.csv$/.test(x.nome))) {
    let col = null;
    for await (const c of linhasBrutas(zip, e)) {
      if (!col) { col = Object.fromEntries(c.map((x, i) => [x, i])); continue; }
      n++;
      const nr = normal(c[col.NR_CANDIDATO]), pt = normal(c[col.NR_PARTIDO]);
      if (Number.isFinite(Number(nr))) qualquerNumero.add(nr);
      if (Number(pt) > 0) { qualquerNumero.add(pt); partidos.add(pt); }
    }
  }
  conf.linhasHistorico[ano] = n;
  log(`munzona ${ano}: ${n} linhas`);
}

// vizinhos (uma troca de dígito ou inversão de vizinhos) dos números válidos de cada cargo × âmbito
const vizinhos = new Map();
for (const [k, set] of validos) {
  const v = new Set();
  for (const nr of set) {
    for (let i = 0; i < nr.length; i++) {
      for (let dgt = 0; dgt <= 9; dgt++) v.add(nr.slice(0, i) + dgt + nr.slice(i + 1));
      if (i < nr.length - 1) v.add(nr.slice(0, i) + nr[i + 1] + nr[i] + nr.slice(i + 2));
    }
  }
  for (const nr of set) v.delete(nr);
  vizinhos.set(k, v);
}

function familias(cargo, ambito, d) {
  const f = [];
  if (qualquerNumero.has(normal(d)) && /^[1-9]/.test(d)) f.push('F1');
  if (/^(\d)\1*$/.test(d)) f.push('F2');
  if (vizinhos.get(`${cargo}|${ambito}`)?.has(d)) f.push('F3');
  if (d.length < DIGITOS[cargo]) f.push('F4');
  if (cargo >= 5 && d.length >= 2 && partidos.has(normal(d.slice(0, 2))) && d[0] !== '0') f.push('F5');
  if (d.length >= 2) {
    let sobe = true, desce = true;
    for (let i = 1; i < d.length; i++) { if (+d[i] !== +d[i - 1] + 1) sobe = false; if (+d[i] !== +d[i - 1] - 1) desce = false; }
    if (sobe || desce) f.push('F6');
  }
  return f;
}

// ---------- exposição ----------
const expo = JSON.parse(readFileSync(path.join(DIR, 'exposicao.json'), 'utf8'));
const expZona = new Map(Object.entries(expo.expZona));
const expAmbito = new Map(Object.entries(expo.expAmbito));
const zonasAmbito = new Map(); // cargo|ambito|t -> nº de zonas com exposição
for (const [k, v] of expZona) {
  const [cargo, uf] = k.split('|');
  const ambito = cargo === '1' ? 'br' : uf;
  for (const t of [1, 2]) if (v[t - 1] > 0) { const ka = `${cargo}|${ambito}|${t}`; zonasAmbito.set(ka, (zonasAmbito.get(ka) ?? 0) + 1); }
}

// ---------- testes ----------
const testes = [];
const foraDoEscopo = {};
const rl = readline.createInterface({ input: createReadStream(path.join(DIR, 'zonas.jsonl')), crlfDelay: Infinity });
for await (const linha of rl) {
  const o = JSON.parse(linha);
  if (!CARGOS.includes(o.cargo)) { foraDoEscopo[o.cargo] = (foraDoEscopo[o.cargo] ?? 0) + 1; continue; }
  const fam = familias(o.cargo, o.ambito, o.d);
  for (const t of [1, 2]) {
    const N = o.n[t - 1];
    if (N < N_MIN) continue;
    const E = expAmbito.get(`${o.cargo}|${o.ambito}`)[t - 1];
    const Zs = zonasAmbito.get(`${o.cargo}|${o.ambito}|${t}`);
    let melhor = null;
    const contagens = [];
    for (const [zona, c1, c2] of o.z) {
      const x = t === 1 ? c1 : c2;
      if (!x) continue;
      contagens.push(x);
      const ez = expZona.get(`${o.cargo}|${zona}`);
      const e = ez[t - 1];
      const lp = lnBinomSup(N, e / E, x);
      if (!melhor || lp < melhor.lp) melhor = { zona, x, e, lp, x1: c1, x2: c2, e1: ez[0], e2: ez[1] };
    }
    contagens.sort((a, b) => b - a);
    const top3 = (contagens[0] + (contagens[1] ?? 0) + (contagens[2] ?? 0)) / N;
    const resto = N - melhor.x, eResto = E - melhor.e;
    const lift = resto > 0 ? (melhor.x / melhor.e) / (resto / eResto) : Infinity;
    const lnP = Math.min(0, melhor.lp + Math.log(Zs));
    const r = { turno: t, cargo: o.cargo, ambito: o.ambito, d: o.d, N, secoes: o.s[t - 1], zonas: contagens.length, zonasAmbito: Zs,
      zonaTop: melhor.zona, xTop: melhor.x, expoTop: melhor.e, parcelaExpoTop: melhor.e / E, lift, top3, lnP, p: Math.exp(lnP),
      maxSecao: o.max[t - 1]?.sec, maxSecaoQ: o.max[t - 1]?.q, familias: fam.join(','), n1: o.n[0], n2: o.n[1] };
    if (t === 2 && (o.cargo === 1 || (o.cargo === 3 && UF_GOV_2T.has(o.ambito)))) {
      const m = melhor.x1 + melhor.x2, pi = melhor.e2 / (melhor.e1 + melhor.e2);
      r.x1Zona = melhor.x1;
      r.esperado2 = m * pi;
      r.pG = Math.exp(lnBinomSup(m, pi, melhor.x2));
      r.G = r.pG < PG_MAX && melhor.x2 >= G_FATOR * r.esperado2;
    }
    testes.push(r);
  }
}
log(`${testes.length} testes`);
const qs = bh(testes.map((r) => r.p));
testes.forEach((r, i) => {
  r.q = qs[i];
  r.C = r.q < Q_MAX && r.lift >= LIFT_MIN && r.xTop >= X_MIN;
  r.R = r.top3 >= TOP3_MIN;
  r.gTestavel = r.G !== undefined;
  r.sinal = r.C && r.R && (!r.gTestavel || r.G);
  r.candidato = r.sinal && !r.familias;
});

// ---------- resumo ----------
const { db, fonte } = await abrirLeitura();
const margem = Object.fromEntries(db.prepare(`SELECT numero, SUM(quantidade) q FROM voto_bu WHERE turno = 2 AND cargo = 1 AND tipo_voto = 'nominal'
  AND numero IN (13, 22) GROUP BY numero`).all().map((r) => [r.numero, r.q]));
db.close();
const munPrincipal = expo.munPrincipal;
const resumo = { geradoEm: new Date().toISOString(), fonte: path.basename(fonte), plano: 'docs/analysis/estatistico-eleitoral/13-h21-plano.md',
  conferencias: { ...conf, nulos: expo.totais.nulo.slice(1), foraDoTeste: expo.totais.foraDoTeste, numerosDistintos: expo.numerosDistintos,
    numerosComNmin: expo.testaveis, foraDoEscopoCargo: foraDoEscopo, partidos: partidos.size, numerosValidosQualquer: qualquerNumero.size },
  cortes: { N_MIN, Q_MAX, LIFT_MIN, X_MIN, TOP3_MIN, PG_MAX, G_FATOR }, testes: testes.length, porCargoTurno: {} };
for (const t of [1, 2]) for (const cargo of CARGOS) {
  const l = testes.filter((r) => r.turno === t && r.cargo === cargo);
  if (!l.length) continue;
  const sinal = l.filter((r) => r.sinal);
  const porFam = {};
  for (const r of sinal) for (const f of (r.familias || 'nenhuma').split(',')) porFam[f] = (porFam[f] ?? 0) + 1;
  resumo.porCargoTurno[`${t}|${NOME_CARGO[cargo]}`] = { testes: l.length, C: l.filter((r) => r.C).length, R: l.filter((r) => r.R).length,
    CeR: l.filter((r) => r.C && r.R).length, gTestavel: l.filter((r) => r.gTestavel).length, G: l.filter((r) => r.G).length,
    sinal: sinal.length, sinalPorFamilia: porFam, candidatos: l.filter((r) => r.candidato).length,
    ocorrenciasCandidatos: l.filter((r) => r.candidato).reduce((a, r) => a + r.N, 0), ocorrenciasCandidatosZonaTop: l.filter((r) => r.candidato).reduce((a, r) => a + r.xTop, 0) };
}
const cands = testes.filter((r) => r.candidato);
resumo.teto = { candidatos: cands.length, ocorrencias: cands.reduce((a, r) => a + r.N, 0), naZonaTop: cands.reduce((a, r) => a + r.xTop, 0),
  presidente2t: cands.filter((r) => r.turno === 2 && r.cargo === 1).reduce((a, r) => a + r.N, 0), margem2t: margem[13] - margem[22], votos2t: margem };

// MDE: zona de exposição mediana, Bonferroni sobre todos os testes (limite conservador do BH com poucas descobertas)
const alfa = Q_MAX / testes.length;
resumo.mde = { alfaBonferroni: alfa, porCargoTurno: {} };
for (const t of [1, 2]) for (const cargo of CARGOS) {
  const ambitos = [...expAmbito.keys()].filter((k) => k.startsWith(`${cargo}|`));
  const partes = [];
  let Zs = 0;
  for (const ka of ambitos) {
    const E = expAmbito.get(ka)[t - 1];
    if (!E) continue;
    const [, amb] = ka.split('|');
    Zs = zonasAmbito.get(`${cargo}|${amb}|${t}`) ?? 0;
    for (const [kz, v] of expZona) {
      const [c, uf] = kz.split('|');
      if (Number(c) !== cargo || (cargo !== 1 && uf !== amb)) continue;
      if (v[t - 1] > 0) partes.push({ pi: v[t - 1] / E, Zs });
    }
  }
  if (!partes.length) continue;
  partes.sort((a, b) => a.pi - b.pi);
  const { pi, Zs: zs } = partes[Math.floor(partes.length / 2)];
  const linha = {};
  for (const B of [0, 10, 100, 1000, 10000]) {
    let x = 1;
    for (; x < 1e6; x++) {
      const N = B + x, naZona = Math.round(B * pi) + x;
      const p = Math.exp(lnBinomSup(N, pi, naZona) + Math.log(zs));
      const lift = (naZona / pi) / Math.max(1e-9, (N - naZona) / (1 - pi));
      if (p < alfa && lift >= LIFT_MIN && naZona >= X_MIN && naZona / N >= TOP3_MIN) break;
    }
    linha[`fundo${B}`] = x;
  }
  resumo.mde.porCargoTurno[`${t}|${NOME_CARGO[cargo]}`] = { parcelaZonaMediana: pi, zonasAmbito: zs, ocorrenciasExtrasNaZona: linha };
}

// crescimento nacional de cada número de presidente (exploratório, não entra no corte)
const pres = testes.filter((r) => r.cargo === 1 && r.turno === 2);
const E1 = expAmbito.get('1|br')[0], E2 = expAmbito.get('1|br')[1];
resumo.presidenteCrescimentoNacional = pres.map((r) => ({ d: r.d, n1: r.n1, n2: r.n2, razao: r.n1 ? (r.n2 / E2) / (r.n1 / E1) : null, familias: r.familias }))
  .sort((a, b) => (b.razao ?? Infinity) - (a.razao ?? Infinity)).slice(0, 25);
resumo.nulosPresidente = { 1: E1, 2: E2 };

const fmtLinha = (r) => ({ ...r, nomeZona: munPrincipal[r.zonaTop]?.nome, lnP: Math.round(r.lnP * 100) / 100, p: Number(r.p.toPrecision(3)), q: Number(r.q.toPrecision(3)),
  lift: Number.isFinite(r.lift) ? Math.round(r.lift * 10) / 10 : 'inf', top3: Math.round(r.top3 * 1000) / 1000, parcelaExpoTop: Number(r.parcelaExpoTop.toPrecision(3)),
  esperado2: r.esperado2 != null ? Math.round(r.esperado2 * 10) / 10 : null, pG: r.pG != null ? Number(r.pG.toPrecision(3)) : null });
const COLS = ['turno', 'cargo', 'ambito', 'd', 'familias', 'N', 'n1', 'n2', 'secoes', 'zonas', 'zonasAmbito', 'zonaTop', 'nomeZona', 'xTop', 'expoTop', 'parcelaExpoTop',
  'lift', 'top3', 'lnP', 'p', 'q', 'C', 'R', 'gTestavel', 'x1Zona', 'esperado2', 'pG', 'G', 'sinal', 'candidato', 'maxSecao', 'maxSecaoQ'];
await writeFile(path.join(DIR, 'testes.csv'), paraCsv(testes.map(fmtLinha), COLS));
const sinalizados = testes.filter((r) => r.C && r.R).sort((a, b) => a.lnP - b.lnP);
await writeFile(path.join(DIR, 'sinalizados.csv'), paraCsv(sinalizados.map(fmtLinha), COLS));
await writeFile(path.join(DIR, 'candidatos.csv'), paraCsv(cands.sort((a, b) => a.lnP - b.lnP).map(fmtLinha), COLS));
await writeFile(path.join(DIR, 'resumo.json'), JSON.stringify(resumo, null, 1));
log(`fim: ${testes.length} testes; C∧R ${sinalizados.length}; candidatos a senha ${cands.length}`);
console.log(JSON.stringify(resumo.porCargoTurno, null, 1));
console.log(JSON.stringify(resumo.teto));
