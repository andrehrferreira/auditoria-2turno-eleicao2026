// H26, fechamento, parte (a): zonas perto do corte, seção a seção (docs/analysis/cientista-politico/06-h26-plano-final.md, seção 3).
//   Zonas: |z| ≥ 2,5 no plano 01 (virada-zonas/zonas.csv) ∪ zonas que passam do corte em alguma variante do parecer 34
//   (34-h26-reproduz.json: escalasAlternativas e coeficientesCaixa), dos dois lados.
//   t da seção = resíduo líquido / √nominais do 2º turno (esperado do plano 01); t centrado = t − mediana da zona.
//   Estrato = região × quintil de aptos da seção (quintis dentro da região). Régua = seções fora das zonas examinadas.
//   A1: seções além dos percentis 0,01% e 99,99% do estrato; Poisson unilateral por lado; corte p < 0,005.
//   A2: parte do resíduo da zona nas 10% seções mais extremas (doc 04); nulo por 10.000 simulações (deslocamento da
//       zona + ruído sorteado da régua do estrato); BH por lado, q < 0,01.
//   Conferência no bruto (seção 3.5) das seções listadas: banco, dados abertos de 2022 e src/exportar.js.
// Só leitura. Uso: node --max-old-space-size=12288 scripts/auditoria/politico-h26-a-secoes.mjs
// Saídas: data/parsed/auditoria/cientista-politico/h26-a-secoes.json e h26-a-zonas.csv.
import { existsSync, readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { exportarSecao } from '../../src/exportar.js';
import { RAIZ, aleatorio, paraCsv, quantil, mediana } from './forense-lib.mjs';
import { SAIDA, REGIAO, bh, r2, r4, pp, log, secoes2026, chaveSec } from './politico-h26-lib.mjs';

const SIMS = 10000;
const R = { geradoEm: new Date().toISOString(), plano: 'docs/analysis/cientista-politico/06-h26-plano-final.md', secao: 3 };

// ---------- 3.1 Zonas examinadas ----------
const dirVZ = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'virada-zonas');
const linhasZ = readFileSync(path.join(dirVZ, 'zonas.csv'), 'utf8').trim().split('\n');
const cab = linhasZ[0].split(';');
const zonas01 = linhasZ.slice(1).map((l) => { const c = l.split(';'); return Object.fromEntries(cab.map((n, i) => [n, c[i]])); });
const z1 = zonas01.filter((z) => z.z !== '' && Math.abs(Number(z.z)) >= 2.5).map((z) => `${z.uf}|${z.zona}`);
const c34 = JSON.parse(readFileSync(path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico-revisor', '34-h26-reproduz.json'), 'utf8'));
const listasZ2 = [...Object.values(c34.escalasAlternativas).map((v) => v.lista), c34.coeficientesCaixa.lista].flat();
const z2 = listasZ2.map((s) => { const [uf, zona] = s.split(' '); return `${uf}|${zona}`; });
const examinadas = new Set([...z1, ...z2]);
R.zonasExaminadas = { z1: z1.length, z2: new Set(z2).size, uniao: examinadas.size, soZ2: [...new Set(z2)].filter((k) => !z1.includes(k)).sort() };
log(`zonas examinadas: ${examinadas.size} (Z1 ${z1.length}, Z2 ${new Set(z2).size})`);

// ---------- 3.2 Seções ----------
const { P, conf } = await secoes2026();
R.conferenciaBanco = { fonte: conf.fonte, secoes: conf.secoes, oficial: conf.oficial };
const secoes = P.filter((s) => s.uf !== 'zz' && s.nom2 > 0);
R.exclusoes = { exterior: P.filter((s) => s.uf === 'zz').length, semNominais2t: P.filter((s) => s.uf !== 'zz' && !(s.nom2 > 0)).length };
const porZona = new Map();
for (const s of secoes) {
  s.t = s.rl / Math.sqrt(s.nom2);
  s.kz = `${s.uf}|${s.zona}`;
  (porZona.get(s.kz) ?? porZona.set(s.kz, []).get(s.kz)).push(s);
}
for (const l of porZona.values()) { const m = mediana(l.map((s) => s.t)); for (const s of l) s.tc = s.t - m; }
// quintis de aptos dentro da região
for (const reg of ['N', 'NE', 'CO', 'SE', 'S']) {
  const l = secoes.filter((s) => s.regiao === reg);
  const cortes = [0.2, 0.4, 0.6, 0.8].map((q) => quantil(l.map((s) => s.a2), q));
  for (const s of l) s.estrato = `${reg}|${cortes.filter((c) => s.a2 > c).length + 1}`;
}
const ref = new Map();
for (const s of secoes) if (!examinadas.has(s.kz)) (ref.get(s.estrato) ?? ref.set(s.estrato, []).get(s.estrato)).push(s.tc);
const limites = new Map([...ref].map(([e, v]) => [e, { n: v.length, baixo: quantil(v, 0.0001), alto: quantil(v, 0.9999), pool: Float64Array.from(v) }]));
R.regua = Object.fromEntries([...limites].map(([e, v]) => [e, { secoesReferencia: v.n, p0_01: r4(v.baixo), p99_99: r4(v.alto) }]));

// ---------- 3.3 A1 ----------
const naExaminadas = secoes.filter((s) => examinadas.has(s.kz));
const extremas13 = naExaminadas.filter((s) => s.tc > limites.get(s.estrato).alto);
const extremas22 = naExaminadas.filter((s) => s.tc < limites.get(s.estrato).baixo);
const poissonCauda = (k, lam) => { // P(X ≥ k)
  let termo = Math.exp(-lam), acum = 0;
  for (let i = 0; i < k; i++) { acum += termo; termo *= lam / (i + 1); }
  return Math.max(0, 1 - acum);
};
const esperado = 0.0001 * naExaminadas.length;
R.A1 = { secoesExaminadas: naExaminadas.length, esperadoPorLado: r4(esperado),
  lado13: { observadas: extremas13.length, p: poissonCauda(extremas13.length, esperado) },
  lado22: { observadas: extremas22.length, p: poissonCauda(extremas22.length, esperado) } };
// comparação dos lados (descritiva): binomial pela parte das seções examinadas em zonas de cada lado
const ladoZona = new Map();
for (const [kz, l] of porZona) if (examinadas.has(kz)) ladoZona.set(kz, Math.sign(l.reduce((a, s) => a + s.rl, 0)));
log(`A1: 13 = ${extremas13.length}, 22 = ${extremas22.length}, esperado ${esperado.toFixed(2)} por lado`);

// ---------- 3.4 A2 ----------
const rnd = aleatorio(260602);
function concentracao(rls, dec, lado) {
  const tot = rls.reduce((a, b) => a + b, 0);
  if (!(lado * tot > 0)) return Infinity;
  const o = Float64Array.from(rls, (v) => lado * v).sort().reverse();
  let top = 0;
  for (let i = 0; i < dec; i++) top += o[i];
  return top / (lado * tot);
}
const linhasA2 = [];
for (const kz of examinadas) {
  const l = porZona.get(kz);
  if (!l) continue;
  const tot = l.reduce((a, s) => a + s.rl, 0), nom = l.reduce((a, s) => a + s.nom2, 0);
  const lado = Math.sign(tot), dec = Math.max(1, Math.round(l.length / 10));
  const obs = concentracao(l.map((s) => s.rl), dec, lado);
  const mu = tot / nom;
  const sims = new Float64Array(l.length);
  let maiores = 0;
  for (let k = 0; k < SIMS; k++) {
    for (let i = 0; i < l.length; i++) {
      const pool = limites.get(l[i].estrato).pool;
      sims[i] = mu * l[i].nom2 + pool[Math.floor(rnd() * pool.length)] * Math.sqrt(l[i].nom2);
    }
    if (concentracao(sims, dec, lado) >= obs) maiores++;
  }
  const z01 = zonas01.find((z) => `${z.uf}|${z.zona}` === kz);
  linhasA2.push({ zona: kz, municipio: z01?.municipioPrincipal ?? '', lado: lado > 0 ? 13 : 22, secoes: l.length, residuoLiquido: Math.round(tot), alemPp: r2(pp(tot, nom)),
    z: r2(Number(z01?.z)), parcela10pct: r2(100 * obs), p: (maiores + 1) / (SIMS + 1),
    extremasA1: l.filter((s) => extremas13.includes(s) || extremas22.includes(s)).length });
}
for (const lado of [13, 22]) {
  const l = linhasA2.filter((x) => x.lado === lado);
  const qs = bh(l.map((x) => x.p));
  l.forEach((x, i) => { x.q = qs[i]; });
}
linhasA2.sort((a, b) => a.q - b.q || a.p - b.p);
const conc13 = linhasA2.filter((x) => x.lado === 13 && x.q < 0.01), conc22 = linhasA2.filter((x) => x.lado === 22 && x.q < 0.01);
R.A2 = { simulacoes: SIMS, zonas: linhasA2.length, zonasLado13: linhasA2.filter((x) => x.lado === 13).length, zonasLado22: linhasA2.filter((x) => x.lado === 22).length,
  concentradas13: conc13.map((x) => x.zona), concentradas22: conc22.map((x) => x.zona) };
await writeFile(path.join(SAIDA, 'h26-a-zonas.csv'), paraCsv(linhasA2.map((x) => ({ ...x, p: Number(x.p.toPrecision(3)), q: Number(x.q.toPrecision(3)) })), Object.keys(linhasA2[0])));
log(`A2: concentradas 13 = ${conc13.length}, 22 = ${conc22.length}`);
// binomial descritiva dos lados (A1)
{
  const n13 = naExaminadas.filter((s) => ladoZona.get(s.kz) > 0).length;
  const frac = n13 / naExaminadas.length, n = extremas13.length + extremas22.length, k = extremas13.length;
  let p = 0; const lc = (a, b) => { let r = 0; for (let i = 0; i < b; i++) r += Math.log(a - i) - Math.log(i + 1); return r; };
  for (let i = k; i <= n; i++) p += Math.exp(lc(n, i) + i * Math.log(frac) + (n - i) * Math.log(1 - frac));
  R.A1.comparacaoDosLados = { secoesEmZonasDoLado13: n13, fracao13: r4(frac), extremasTotal: n, extremas13: k, pBinomialMaisDo13: n ? r4(p) : null };
}

// ---------- 3.5 Conferência no bruto ----------
const listadas = new Map();
for (const s of [...extremas13, ...extremas22]) listadas.set(s, 'A1');
for (const z of [...conc13, ...conc22]) {
  const l = porZona.get(z.zona);
  const lado = z.lado === 13 ? 1 : -1;
  for (const s of [...l].sort((a, b) => lado * (b.rl - a.rl)).slice(0, 3)) if (!listadas.has(s)) listadas.set(s, 'A2');
}
const cache22 = path.join(SAIDA, 'h26-nivelB-2022.json');
const s22 = new Map();
if (existsSync(cache22)) for (const x of JSON.parse(readFileSync(cache22, 'utf8')).secoes) s22.set(chaveSec(x[0], x[1], x[2], x[3]), x);
const { db } = await abrirLeitura();
const qOf = db.prepare(`SELECT turno, numero, quantidade FROM voto_oficial WHERE cargo = 1 AND uf = ? AND municipio = ? AND zona = ? AND secao = ? AND numero IN (13, 22)`);
const qPl = db.prepare(`SELECT maior_rajada_sem_biometria_10min r, habilitados_pelo_mesario hm, ano_nascimento_sem_biometria anb, dado_pessoal_confere dpc FROM perfil_log
  WHERE turno = 2 AND uf = ? AND municipio = ? AND zona = ? AND secao = ?`);
const porLocal = new Map();
for (const s of secoes) { const k = `${s.uf}|${s.municipio}|${s.local2}`; (porLocal.get(k) ?? porLocal.set(k, []).get(k)).push(s); }
const casos = [];
for (const [s, origem] of listadas) {
  const of = Object.fromEntries(qOf.all(s.uf, s.municipio, s.zona, s.secao).map((o) => [`${o.turno}|${o.numero}`, o.quantidade]));
  const pl = qPl.get(s.uf, s.municipio, s.zona, s.secao) ?? {};
  const loc = porLocal.get(`${s.uf}|${s.municipio}|${s.local2}`) ?? [];
  const locTot = loc.reduce((a, x) => a + x.rl, 0), locNom = loc.reduce((a, x) => a + x.nom2, 0);
  const x22 = s22.get(chaveSec(s.uf, s.municipio, s.zona, s.secao));
  const mg = (v, nomeR) => { const n = Object.entries(v).filter(([nr]) => nr !== '95' && nr !== '96').reduce((a, [, q]) => a + q, 0); return pp((v['13'] ?? 0) - (v[nomeR] ?? 0), n); };
  let bruto = null;
  try {
    const j = await exportarSecao({ turno: '2', secao: { uf: s.uf, municipio: s.municipio, zona: s.zona, secao: s.secao }, modoLog: 'dia' });
    const p = j.pacotes.find((x) => x.bu) ?? j.pacotes[0];
    const tot = p.bu.conteudo.resultadosVotacaoPorEleicao.flatMap((e) => e.resultadosVotacao).flatMap((r) => r.totaisVotosCargo).find((c) => c.codigoCargo?.cargoConstitucional === 'presidente');
    const voto = (n) => tot.votosVotaveis.find((v) => v.identificacaoVotavel?.codigo === n)?.quantidadeVotos ?? 0;
    const ev = j.pacotes.flatMap((x) => x.log?.eventos ?? []);
    const falhas = (p.integridade?.resultados ?? []).filter((r) => !r.ok && !/AC emissora não disponível/.test(r.obs ?? ''));
    bruto = { pacotes: j.pacotes.length, bu13: voto(13), bu22: voto(22), comparecimentoBU: p.bu.conteudo.qtdEleitoresCompareceram,
      votosNoLog: ev.filter((e) => e.mensagem === 'O voto do eleitor foi computado').length, tipoArquivo: p.bu.conteudo.urna?.tipoArquivo,
      falhasDeIntegridade: falhas.map((f) => f.item), confereComBanco: voto(13) === s.v13_2 && voto(22) === s.v22_2 && p.bu.conteudo.qtdEleitoresCompareceram === s.c2 };
  } catch (e) { bruto = { erro: e.message }; }
  const rastro = [];
  if (Math.abs(s.a2 - s.a1) > 0.05 * Math.max(s.a1, 1)) rastro.push(`aptos ${s.a1}→${s.a2}`);
  if (s22.size && !x22) rastro.push('seção sem par em 2022');
  if (s.urna1 !== s.urna2) rastro.push('urna trocada entre turnos');
  if (s.tipoArquivo2 && s.tipoArquivo2 !== 'votacaoUE') rastro.push(`arquivo ${s.tipoArquivo2}`);
  casos.push({ origem, lado: s.tc > 0 ? 13 : 22, secao: `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`, municipio: conf.nomeMun[`${s.uf}|${s.municipio}`] ?? s.municipio,
    estrato: s.estrato, tCentrado: r2(s.tc), residuoLiquido: r2(s.rl), alemPp: r2(pp(s.rl, s.nom2)),
    votos: { aptos: [s.a1, s.a2], comparecimento: [s.c1, s.c2], v13: [s.v13_1, s.v13_2], v22: [s.v22_1, s.v22_2], eliminados1: s.e14 + s.e30 + s.e55 + s.e70 + s.dem, brancosNulos: [s.bn1, s.bn2], esperado13: r2(s.p13), esperado22: r2(s.p22) },
    oficialIgualAoBu: of['1|13'] === s.v13_1 && of['1|22'] === s.v22_1 && of['2|13'] === s.v13_2 && of['2|22'] === s.v22_2,
    habilitacao: { semDigital: [s.sb1, s.sb2], digital: [s.pb1, s.pb2], anoNascimento: [s.pg1, s.pg2], pelosMesario2t: pl.hm, rajadaSemBiometria10min: pl.r },
    urna: { modelo: [s.modelo1, s.modelo2], trocou: s.urna1 !== s.urna2, tipoArquivo2: s.tipoArquivo2 },
    tardios2t: s.h2 ? s.h2.slice(17).reduce((a, b) => a + b, 0) : null, encerramentoBrasilia2t: s.encBsb2 == null ? null : `${String(Math.floor(s.encBsb2 / 3600)).padStart(2, '0')}:${String(Math.floor((s.encBsb2 % 3600) / 60)).padStart(2, '0')}`,
    local: { codigo: s.local2, secoes: loc.length, mesmoLado: loc.filter((x) => Math.sign(x.rl) === Math.sign(s.rl)).length, alemPp: r2(pp(locTot, locNom)), semEstaSecaoPp: r2(pp(locTot - s.rl, locNom - s.nom2)) },
    em2022: x22 ? { margem1: r2(mg(x22[5], '22')), margem2: r2(mg(x22[6], '22')), virada: r2(mg(x22[6], '22') - mg(x22[5], '22')) } : null,
    rastroTecnico: rastro, bruto });
}
db.close();
R.casos = casos;
const semRastro = (lista) => lista.filter((c) => !c.rastroTecnico.length);
const votosResid = (lista) => lista.reduce((a, c) => a + Math.abs(c.residuoLiquido), 0);

// ---------- 3.6 Decisão ----------
const a1Lado = (lado) => casos.filter((c) => c.origem === 'A1' && c.lado === lado);
const a1Sinal = (lado, p) => p < 0.005 && votosResid(semRastro(a1Lado(lado))) > 0.5 * votosResid(a1Lado(lado));
// A2: zona concentrada cujas 3 seções de maior peso não têm rastro técnico
const a2Sinal = (lista) => lista.some((z) => {
  const lado = z.lado === 13 ? 1 : -1;
  const tres = [...porZona.get(z.zona)].sort((a, b) => lado * (b.rl - a.rl)).slice(0, 3).map((s) => `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`);
  return tres.every((k) => !casos.find((c) => c.secao === k)?.rastroTecnico.length);
});
R.decisao = {
  A1: { lado13: a1Sinal(13, R.A1.lado13.p), lado22: a1Sinal(22, R.A1.lado22.p),
    semRastro13: semRastro(a1Lado(13)).length, semRastro22: semRastro(a1Lado(22)).length },
  A2: { lado13: a2Sinal(conc13), lado22: a2Sinal(conc22) },
};
R.parteA = R.decisao.A1.lado13 || R.decisao.A2.lado13 ? 'S' : 'L';
R.fatoLado22 = R.decisao.A1.lado22 || R.decisao.A2.lado22;
await writeFile(path.join(SAIDA, 'h26-a-secoes.json'), JSON.stringify(R, null, 1));
log('fim');
console.log(JSON.stringify({ parteA: R.parteA, fatoLado22: R.fatoLado22, zonas: R.zonasExaminadas, exclusoes: R.exclusoes, A1: R.A1, A2: R.A2, decisao: R.decisao,
  casos: casos.map((c) => ({ origem: c.origem, lado: c.lado, secao: c.secao, municipio: c.municipio, t: c.tCentrado, alem: c.alemPp, rastro: c.rastroTecnico, of: c.oficialIgualAoBu, bruto: c.bruto?.confereComBanco, local: c.local, em2022: c.em2022 })) }, null, 1));
