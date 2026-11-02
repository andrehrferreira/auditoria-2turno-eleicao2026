// Estatístico eleitoral, doc 30 (plano 29, commit 45dc471): H02(a), (b) e (c). Excesso de liberados "sem biometria cadastrada"
// (sb do BU) sobre o cadastro público (perfil_eleitor_secao de 14/07/2026, com as agregadas) e a parte que a marca da foto
// (`Foto do eleitor apresentada` nos atendimentos V2) explica, nos dois turnos e em todas as seções.
//   E  = sb − S − folga;  E′ = (sb − F) − S − folga;  S = eleitores − biometria do cadastro;  folga = TTE + max(0, aptosSeção − cadastro)
// Fonte da foto: horario-<t>t.jsonl da frente da H13 (só leitura; sha256 gravado). A releitura dos diários está em
// estatistico-h02-h05-final-foto-log.mjs. Só contagens; nenhum título é lido ou gravado.
// Uso: node --max-old-space-size=8192 scripts/auditoria/estatistico-h02-h05-final-foto.mjs
// Saída: data/parsed/auditoria/estatistico-eleitoral/h02-h05-final/foto.json, foto-secoes-<t>t.jsonl, foto-zonas-<t>t.csv
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { cadastroDaUrna, chave, lerAgregadas, lerCadastro } from './biometria-comum.mjs';
import { dividirCsv, gamaQ, linhasZip, lnGama, pad, paraCsv } from './forense-lib.mjs';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico-eleitoral', 'h02-h05-final');
const HORARIO = (t) => path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h13-v2', `horario-${t}t.jsonl`);
const ELEICAO = { 1: 6257, 2: 6258 };
const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const r4 = (x) => (Number.isFinite(x) ? Math.round(x * 10000) / 10000 : null);

async function sha256(arq) {
  const h = createHash('sha256');
  for await (const b of createReadStream(arq)) h.update(b);
  return h.digest('hex');
}
async function* linhas(arq) {
  for await (const l of createInterface({ input: createReadStream(arq), crlfDelay: Infinity })) if (l) yield l;
}

// Poisson: P(X ≥ k | λ) = P(Gama(k) ≤ λ) = P(k, λ), gama incompleta inferior regularizada. Na região x < a + 1 usa a série
// direto (precisão para valores-p muito pequenos); fora dela, 1 − Q pela fração contínua de gamaQ.
function gamaP(a, x) {
  if (x <= 0) return 0;
  if (x >= a + 1) return 1 - gamaQ(a, x);
  let ap = a, soma = 1 / a, del = soma;
  for (let n = 0; n < 5000; n++) { ap += 1; del *= x / ap; soma += del; if (Math.abs(del) < Math.abs(soma) * 1e-15) break; }
  return soma * Math.exp(-x + a * Math.log(x) - lnGama(a));
}
const poissonCaudaSup = (k, lam) => (k <= 0 ? 1 : gamaP(k, lam));

await mkdir(SAIDA, { recursive: true });
const res = { geradoEm: new Date().toISOString(), plano: 'docs/analysis/estatistico-eleitoral/29-h02-h05-plano-final.md (45dc471; adendo 1989f56)', fontes: {}, turnos: {} };
for (const t of [1, 2]) {
  const s = await stat(HORARIO(t));
  res.fontes[`horario${t}t`] = { arquivo: path.relative(DIR_DADOS, HORARIO(t)), sha256: await sha256(HORARIO(t)), bytes: s.size, modificado: s.mtime.toISOString() };
}
log('sha256 dos arquivos de horário gravado');

const cadastro = await lerCadastro();
log(`cadastro: ${cadastro.size} seções`);

// seções de 2022 (perfil_eleitor_secao 2022 por UF): para "seção nova"
const secoes2022 = new Set();
{
  const dir = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'perfil_eleitor_secao');
  const { readdir } = await import('node:fs/promises');
  for (const z of (await readdir(dir)).filter((n) => /^perfil_eleitor_secao_2022_[A-Z]{2}\.zip$/.test(n))) {
    let cab = null;
    for await (const [, l] of linhasZip(path.join(dir, z))) {
      const c = dividirCsv(l);
      if (!cab) { cab = Object.fromEntries(c.map((n, i) => [n, i])); continue; }
      secoes2022.add(`${c[cab.SG_UF].toLowerCase()}/${pad(c[cab.CD_MUNICIPIO], 5)}/${pad(c[cab.NR_ZONA], 4)}/${pad(c[cab.NR_SECAO], 4)}`);
    }
  }
  log(`seções no perfil de 2022: ${secoes2022.size}`);
}

const { db, ponteiro } = await abrirLeitura();
res.copiaLeitura = ponteiro ?? null;
const porTurno = {};
for (const t of [1, 2]) {
  const agregadas = await lerAgregadas(t);
  const rows = db.prepare(`SELECT s.uf, s.municipio, s.zona, s.secao, s.comparecimento c, s.sem_biometria sb, s.por_biometria pb, s.por_biografia pg,
      s.numero_interno_urna urna, s.modelo_urna modelo, e.aptos, e.aptos_secao, e.aptos_tte
    FROM secao s JOIN secao_eleicao e ON e.turno = s.turno AND e.uf = s.uf AND e.municipio = s.municipio AND e.zona = s.zona AND e.secao = s.secao AND e.eleicao = ?
    WHERE s.turno = ? AND s.uf <> 'zz' ORDER BY s.uf, s.municipio, s.zona, s.secao`).all(ELEICAO[t], t);
  // foto do horário
  const hor = new Map();
  for await (const l of linhas(HORARIO(t))) {
    const h = JSON.parse(l);
    const v2 = (h.hora?.v2 ?? []).reduce((a, b) => a + b, 0);
    hor.set(h.id, { v2, F: h.v2Foto, P: h.v2PedeDigital, votos: h.votos });
  }
  log(`turno ${t}: ${rows.length} seções no banco, ${hor.size} no horário`);
  const T = { analisadas: 0, semComparecimento: 0, semDetalhamento: 0, semCadastro: 0, cadastroIncompleto: 0,
    comExcesso: 0, somaE: 0, semHorario: 0, logDiverge: { secoes: 0, somaE: 0 }, comExcessoBate: 0, somaEbate: 0, somaElinhaBate: 0, secoesElinha: 0,
    coberturaFgeE: 0, somaF_excesso: 0, somaV2_excesso: 0, somaP_excesso: 0,
    grupo10: { secoes: 0, somaE: 0, somaElinha: 0, somaF: 0, somaV2: 0 },
    pais: { V2: 0, F: 0, P: 0, secoesBate: 0, secoesTotal: 0 }, controlePorUf: {}, excessoPorUf: {} };
  const secoes = [];
  for (const r of rows) {
    const k = chave(r);
    const h = hor.get(k);
    if (h) { T.pais.secoesTotal++; if (h.v2 === r.sb) { T.pais.secoesBate++; T.pais.V2 += h.v2; T.pais.F += h.F; T.pais.P += h.P; } }
    if (!r.c) { T.semComparecimento++; continue; }
    if (r.sb == null) { T.semDetalhamento++; continue; }
    const c = cadastroDaUrna(cadastro, agregadas, k);
    if (!c) { T.semCadastro++; continue; }
    if (c.faltando) T.cadastroIncompleto++;
    T.analisadas++;
    const S = c.eleitores - c.biometria;
    const folga = (r.aptos_tte ?? 0) + Math.max(0, (r.aptos_secao ?? 0) - c.eleitores);
    const E = r.sb - S - folga;
    const bate = h != null && h.v2 === r.sb;
    if (E <= 0) {
      if (bate && h.v2 > 0) { const u = (T.controlePorUf[r.uf] ??= { secoes: 0, V2: 0, F: 0 }); u.secoes++; u.V2 += h.v2; u.F += h.F; }
      continue;
    }
    T.comExcesso++; T.somaE += E;
    const ue = (T.excessoPorUf[r.uf] ??= { secoes: 0, somaE: 0, somaElinha: 0, V2: 0, F: 0 }); ue.secoes++; ue.somaE += E;
    let Elinha = null;
    if (!h) T.semHorario++;
    else if (!bate) { T.logDiverge.secoes++; T.logDiverge.somaE += E; }
    else {
      Elinha = (r.sb - h.F) - S - folga;
      T.comExcessoBate++; T.somaEbate += E;
      if (Elinha > 0) { T.somaElinhaBate += Elinha; T.secoesElinha++; ue.somaElinha += Elinha; }
      if (h.F >= E) T.coberturaFgeE++;
      T.somaF_excesso += h.F; T.somaV2_excesso += h.v2; T.somaP_excesso += h.P; ue.V2 += h.v2; ue.F += h.F;
      if (E >= 10) { const g = T.grupo10; g.secoes++; g.somaE += E; g.somaElinha += Math.max(0, Elinha); g.somaF += h.F; g.somaV2 += h.v2; }
    }
    secoes.push({ k, uf: r.uf, zona: `${r.uf}/${r.municipio}/${r.zona}`, E, Elinha, sb: r.sb, S, folga, cadastro: c.eleitores, F: h?.F ?? null, V2: h?.v2 ?? null, P: h?.P ?? null,
      c: r.c, aptos: r.aptos, urna: r.urna, modelo: r.modelo, nova: !secoes2022.has(k), bate });
  }
  // grupo das 378 (E ≥ 10) inclui seções que não batem? conta separada
  T.grupo10.todas = secoes.filter((x) => x.E >= 10).length;
  T.grupo10.todasSomaE = secoes.filter((x) => x.E >= 10).reduce((a, x) => a + x.E, 0);
  T.parcelaExplicada = r4(1 - T.somaElinhaBate / T.somaEbate);
  T.fotoNoExcesso = r4(T.somaF_excesso / T.somaV2_excesso);
  const ctl = Object.values(T.controlePorUf).reduce((a, u) => ({ V2: a.V2 + u.V2, F: a.F + u.F, secoes: a.secoes + u.secoes }), { V2: 0, F: 0, secoes: 0 });
  T.fotoNoControle = { ...ctl, parcela: r4(ctl.F / ctl.V2) };
  T.pais.parcelaFoto = r4(T.pais.F / T.pais.V2);
  for (const u of Object.values(T.controlePorUf)) u.parcela = r4(u.F / u.V2);
  for (const u of Object.values(T.excessoPorUf)) { u.parcelaFoto = r4(u.F / u.V2); u.parcelaExplicada = u.somaE ? r4(1 - u.somaElinha / u.somaE) : null; }
  porTurno[t] = { T, secoes, rows };
  await writeFile(path.join(SAIDA, `foto-secoes-${t}t.jsonl`), `${secoes.map((x) => JSON.stringify(x)).join('\n')}\n`);
  log(`turno ${t}: ${T.comExcesso} seções com excesso, ΣE ${T.somaE}; ΣE′ ${T.somaElinhaBate}; parcela explicada ${T.parcelaExplicada}`);
}

// ---------- H02(b): concentração do resíduo por zona (Poisson; binomial negativa na sensibilidade) ----------
for (const t of [1, 2]) {
  const { T, secoes, rows } = porTurno[t];
  const aptosZona = new Map();
  for (const r of rows) { if (!r.c || r.sb == null) continue; const z = `${r.uf}/${r.municipio}/${r.zona}`; aptosZona.set(z, (aptosZona.get(z) ?? 0) + (r.aptos ?? 0)); }
  const resZona = new Map();
  for (const x of secoes) if (x.Elinha > 0) { const z = resZona.get(x.zona) ?? { R: 0, secoes: 0 }; z.R += x.Elinha; z.secoes++; resZona.set(x.zona, z); }
  const aptosTot = [...aptosZona.values()].reduce((a, b) => a + b, 0);
  const R = T.somaElinhaBate;
  const taxa = R / aptosTot;
  const nZonas = aptosZona.size;
  const corte = 0.05 / nZonas;
  // binomial negativa: dispersão por momentos entre zonas (var = μ + μ²/θ)
  let num = 0, den = 0;
  for (const [z, a] of aptosZona) { const mu = taxa * a; const y = resZona.get(z)?.R ?? 0; num += (y - mu) ** 2 - mu; den += mu * mu; }
  const invTheta = Math.max(0, num / den);
  const nbCauda = (k, mu) => { // P(Y ≥ k), binomial negativa com 1/θ; soma direta
    if (k <= 0) return 1; if (invTheta === 0) return poissonCaudaSup(k, mu);
    const th = 1 / invTheta; const p = th / (th + mu); let pk = p ** th, cdf = 0;
    for (let y = 0; y < k; y++) { cdf += pk; pk *= ((y + th) / (y + 1)) * (1 - p); }
    return Math.max(0, 1 - cdf);
  };
  const zonas = [...aptosZona.entries()].map(([z, a]) => {
    const y = resZona.get(z)?.R ?? 0; const mu = taxa * a;
    return { zona: z, aptos: a, residuo: y, secoesComResiduo: resZona.get(z)?.secoes ?? 0, esperado: r4(mu), p: y ? poissonCaudaSup(y, mu) : 1, pNB: y ? nbCauda(y, mu) : 1 };
  });
  // BH
  const ord = [...zonas].sort((a, b) => a.p - b.p); let qmin = 1;
  for (let i = ord.length - 1; i >= 0; i--) { qmin = Math.min(qmin, (ord[i].p * ord.length) / (i + 1)); ord[i].q = qmin; }
  const passam = zonas.filter((z) => z.p < corte).sort((a, b) => a.p - b.p);
  const passamNB = zonas.filter((z) => z.pNB < corte);
  T.concentracao = { zonas: nZonas, residuoTotal: R, aptos: aptosTot, taxaPorEleitor: taxa, corteBonferroni: corte, dispersaoInvTheta: r4(invTheta),
    passamPoisson: passam.length, residuoNasQuePassam: passam.reduce((a, z) => a + z.residuo, 0), passamBinomialNegativa: passamNB.length,
    residuoNasQuePassamNB: passamNB.reduce((a, z) => a + z.residuo, 0), bhQ05: zonas.filter((z) => z.q < 0.05).length,
    zonasComResiduo: resZona.size, topo: passam.slice(0, 40).map((z) => ({ ...z, p: z.p.toExponential(2), pNB: z.pNB.toExponential(2), q: z.q.toExponential(2) })) };
  T.zonasQuePassamNB = passamNB.map((z) => z.zona);
  T.zonasQuePassam = passam.map((z) => z.zona);
  await writeFile(path.join(SAIDA, `foto-zonas-${t}t.csv`), paraCsv(zonas.filter((z) => z.residuo > 0).sort((a, b) => a.p - b.p), ['zona', 'aptos', 'residuo', 'secoesComResiduo', 'esperado', 'p', 'pNB', 'q']));
}

// persistência entre turnos (todas as seções com resíduo) e seção nova
{
  const m1 = new Map(porTurno[1].secoes.map((x) => [x.k, x]));
  const m2 = new Map(porTurno[2].secoes.map((x) => [x.k, x]));
  const pers = {};
  for (const [t, a, b] of [[2, m2, m1], [1, m1, m2]]) {
    const com = [...a.values()].filter((x) => x.Elinha > 0);
    const outro = com.filter((x) => (b.get(x.k)?.Elinha ?? 0) > 0);
    const outroExc = com.filter((x) => (b.get(x.k)?.E ?? 0) > 0);
    pers[`${t}t`] = { secoesComResiduo: com.length, residuoNoOutroTurno: outro.length, parcela: r4(outro.length / com.length), excessoNoOutroTurno: outroExc.length };
  }
  // correlação de E′ entre turnos nas seções com resíduo em algum turno
  const ks = new Set([...m1.values(), ...m2.values()].filter((x) => x.Elinha > 0).map((x) => x.k));
  const xs = [], ys = [];
  for (const k of ks) { xs.push(Math.max(0, m1.get(k)?.Elinha ?? 0)); ys.push(Math.max(0, m2.get(k)?.Elinha ?? 0)); }
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < xs.length; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
  pers.correlacaoElinha = r4(sxy / Math.sqrt(sxx * syy)); pers.secoes = ks.size;
  res.persistencia = pers;
  // seção nova × antiga: taxa de resíduo por eleitor apto (2º turno), todas as seções analisadas
  for (const t of [1, 2]) {
    const { rows, secoes } = porTurno[t];
    const resk = new Map(secoes.filter((x) => x.Elinha > 0).map((x) => [x.k, x.Elinha]));
    const g = { nova: { secoes: 0, aptos: 0, R: 0, comResiduo: 0 }, antiga: { secoes: 0, aptos: 0, R: 0, comResiduo: 0 } };
    for (const r of rows) {
      if (!r.c || r.sb == null) continue; const k = chave(r); const gg = secoes2022.has(k) ? g.antiga : g.nova;
      gg.secoes++; gg.aptos += r.aptos ?? 0; const y = resk.get(k) ?? 0; gg.R += y; if (y) gg.comResiduo++;
    }
    const rr = (g.nova.R / g.nova.aptos) / (g.antiga.R / g.antiga.aptos);
    const ep = Math.sqrt(1 / g.nova.R + 1 / g.antiga.R); // Poisson; ver sensibilidade por seção abaixo
    const pr = (g.nova.comResiduo / g.nova.secoes) / (g.antiga.comResiduo / g.antiga.secoes);
    const epS = Math.sqrt(1 / g.nova.comResiduo - 1 / g.nova.secoes + 1 / g.antiga.comResiduo - 1 / g.antiga.secoes);
    porTurno[t].T.secaoNova = { ...g, razaoTaxaEleitor: r4(rr), ic95Eleitor: [r4(rr * Math.exp(-1.96 * ep)), r4(rr * Math.exp(1.96 * ep))],
      razaoSecoesComResiduo: r4(pr), ic95Secoes: [r4(pr * Math.exp(-1.96 * epS)), r4(pr * Math.exp(1.96 * epS))] };
  }
}

// lista das seções com resíduo nas zonas que passam (para a leitura dirigida do diário) e Indaiatuba
{
  const alvo = [];
  for (const t of [1, 2]) {
    const zs = new Set([...porTurno[t].T.zonasQuePassam, 'sp/65110/0211']);
    for (const x of porTurno[t].secoes) if (x.Elinha > 0 && zs.has(x.zona)) alvo.push({ turno: t, ...x });
  }
  await writeFile(path.join(SAIDA, 'foto-residuo-alvo.jsonl'), `${alvo.map((x) => JSON.stringify(x)).join('\n')}\n`);
  res.residuoAlvo = { secoesTurno: alvo.length, porTurno: { 1: alvo.filter((x) => x.turno === 1).length, 2: alvo.filter((x) => x.turno === 2).length } };
  const ind = (t) => porTurno[t].secoes.filter((x) => x.zona === 'sp/65110/0211').sort((a, b) => a.k.localeCompare(b.k))
    .map(({ k, E, Elinha, sb, S, folga, F, V2, P, cadastro: cad, c, nova }) => ({ k, E, Elinha, sb, S, folga, F, V2, P, cadastro: cad, c, nova }));
  res.indaiatuba = { '1t': ind(1), '2t': ind(2) };
}
db.close();
for (const t of [1, 2]) { const { T } = porTurno[t]; delete T.zonasQuePassam; res.turnos[`${t}t`] = T; }
await writeFile(path.join(SAIDA, 'foto.json'), JSON.stringify(res, null, 1));
const curto = (T) => ({ analisadas: T.analisadas, comExcesso: T.comExcesso, somaE: T.somaE, logDiverge: T.logDiverge, semHorario: T.semHorario, somaEbate: T.somaEbate,
  somaElinha: T.somaElinhaBate, secoesElinha: T.secoesElinha, parcelaExplicada: T.parcelaExplicada, cobertura: T.coberturaFgeE, fotoNoExcesso: T.fotoNoExcesso,
  fotoNoControle: T.fotoNoControle, pais: T.pais, grupo10: T.grupo10, concentracao: { ...T.concentracao, topo: T.concentracao.topo.slice(0, 12) }, secaoNova: T.secaoNova });
console.log(JSON.stringify({ fontes: res.fontes, '1t': curto(res.turnos['1t']), '2t': curto(res.turnos['2t']), persistencia: res.persistencia, residuoAlvo: res.residuoAlvo }, null, 1));
log('fim');
