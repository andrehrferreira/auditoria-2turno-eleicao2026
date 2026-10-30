// Verificação independente dos números de docs/pericia/03-linha-do-tempo.md (regra "só dado 100% correto").
// Caminho próprio, sem ler as saídas de tempo-*.mjs:
//  - 2º turno: BU da tabela `secao` e perfil do log da tabela `perfil_log` (cópia de leitura, abrirLeitura());
//  - 1º turno: perfis completos em data/parsed/1t/perfil/<uf>.jsonl (28 UFs; o banco ainda não tem todas);
//  - fuso de cada município = moda da hora LOCAL da abertura do BU − 8 (conferido contra a moda do "Urna pronta"); as seções
//    com relógio fora da hora do município usam a diferença da própria seção (relogio-fora-do-fuso.mjs, linha-do-tempo/07).
// Só leitura. Uso: node scripts/auditoria/verifica-pericia-linha-do-tempo.mjs
// Saída: data/parsed/auditoria/verifica-pericia/linha-do-tempo.json
import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { difRelogioPorSecao, difSecao } from './relogio-fora-do-fuso.mjs';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'verifica-pericia');
await mkdir(SAIDA, { recursive: true });
const { db } = await abrirLeitura();
const R = {};
const seg = (dt) => (dt ? Number(dt.slice(11, 13)) * 3600 + Number(dt.slice(14, 16)) * 60 + Number(dt.slice(17, 19)) : null); // 'aaaa-mm-dd hh:mm:ss'
const segBu = (dt) => (dt ? Number(dt.slice(9, 11)) * 3600 + Number(dt.slice(11, 13)) * 60 + Number(dt.slice(13, 15)) : null); // 'aaaammddThhmmss'
const hms = (s) => (s === null ? null : `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`);
const qFloor = (o, q) => o[Math.min(o.length - 1, Math.floor(q * o.length))];
const mediana = (o) => (o.length % 2 ? o[(o.length - 1) / 2] : (o[o.length / 2 - 1] + o[o.length / 2]) / 2);
const inc = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };
const moda = (m) => [...m].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
const nomes = new Map(db.prepare('SELECT uf, codigo, nome FROM municipio').all().map((m) => [`${m.uf}/${m.codigo}`, m.nome]));

// ================= 2º turno =================
const secoes = db.prepare(`SELECT s.uf, s.municipio mun, s.zona, s.secao, s.local, s.tipo_urna, s.data_hora_carga carga, s.abertura, s.encerramento,
    s.emissao, s.comparecimento, p.logs_no_pacote logs, p.urna_pronta_s pronta, p.inicio_encerramento_s ini_enc, p.primeiro_voto_s primeiro,
    p.ultimo_voto_s ultimo, p.votos_computados votos, p.votos_fora_da_janela fora, p.reinicios_durante_votacao reinicios,
    p.intervalo_minimo_entre_votos min_int, p.tempo_minimo_habilitacao_voto min_hab,
    json_extract(p.dados, '$.log.votosPorHoraLocal') h, json_extract(p.dados, '$.log.intervaloEntreVotos.faixas') fi,
    (SELECT COUNT(*) FROM secao_eleicao e WHERE e.turno = 2 AND e.uf = s.uf AND e.municipio = s.municipio AND e.zona = s.zona AND e.secao = s.secao) cargos,
    (SELECT e.aptos FROM secao_eleicao e WHERE e.turno = 2 AND e.uf = s.uf AND e.municipio = s.municipio AND e.zona = s.zona AND e.secao = s.secao AND e.eleicao = 6258) aptos
  FROM secao s LEFT JOIN perfil_log p ON p.turno = 2 AND p.uf = s.uf AND p.municipio = s.municipio AND p.zona = s.zona AND p.secao = s.secao AND p.hash = s.hash
  WHERE s.turno = 2 AND s.situacao = 'completa'`).all();
for (const s of secoes) { s.h = s.h ? JSON.parse(s.h) : null; s.fi = s.fi ? JSON.parse(s.fi) : null; s.id = `${s.uf} ${s.mun}/${s.zona}/${s.secao}`; }
R.universo = { secoesComBu: secoes.length, exterior: secoes.filter((s) => s.uf === 'zz').length, semPerfilLog: secoes.filter((s) => s.votos === null).map((s) => s.id) };

// ---- Fuso por município (BU) e conferência com o log ----
function fusos(lista, abertura, pronta) {
  const m = new Map(), mp = new Map();
  for (const s of lista) {
    if (s.uf === 'zz') continue;
    const k = `${s.uf}/${s.mun}`;
    const a = abertura(s); if (a !== null) { if (!m.has(k)) m.set(k, new Map()); inc2(m.get(k), Math.floor(a / 3600)); }
    const p = pronta(s); if (p !== null) { if (!mp.has(k)) mp.set(k, new Map()); inc2(mp.get(k), Math.floor(p / 3600)); }
  }
  const f = new Map(); let difere = 0;
  for (const [k, h] of m) { f.set(k, moda(h) - 8); if (mp.has(k) && moda(mp.get(k)) - 8 !== f.get(k)) difere++; }
  return { f, difere };
}
function inc2(map, k) { map.set(k, (map.get(k) ?? 0) + 1); }
const F2 = fusos(secoes, (s) => seg(s.abertura), (s) => s.pronta);
const fuso2 = F2.f;
const relogio2 = difRelogioPorSecao(2);
const dif = (s) => (s.uf === 'zz' ? null : difSecao(relogio2, s.uf, s.mun, s.zona, s.secao, fuso2.get(`${s.uf}/${s.mun}`)));
const fz = { municipiosBuDifereLog: F2.difere, porUfFuso: {} };
for (const [k, d] of fuso2) if (d !== 0) { const uf = k.slice(0, 2); inc(fz.porUfFuso, `${uf} ${d}`); }
const am2 = [...fuso2].filter(([k, d]) => k.startsWith('am/') && d === -2).map(([k]) => k);
fz.am_menos2 = { municipios: am2.map((k) => nomes.get(k)), secoes: secoes.filter((s) => am2.includes(`${s.uf}/${s.mun}`)).length };
const ac = secoes.filter((s) => s.uf === 'ac');
fz.ac = { secoes: ac.length, prontaHoraLocal: ac.reduce((o, s) => (inc(o, s.pronta === null ? 'sem' : Math.floor(s.pronta / 3600)), o), {}), fusos: [...new Set(ac.map(dif))] };
const pe1 = [...fuso2].filter(([k, d]) => d === 1).map(([k]) => k);
fz.mais1 = pe1.map((k) => ({ k, nome: nomes.get(k), secoes: secoes.filter((s) => `${s.uf}/${s.mun}` === k).length,
  prontaHoraLocal: secoes.filter((s) => `${s.uf}/${s.mun}` === k).reduce((o, s) => (inc(o, Math.floor(s.pronta / 3600)), o), {}) }));
fz.ufsComMenos1 = [...new Set([...fuso2].filter(([, d]) => d === -1).map(([k]) => k.slice(0, 2)))];
// municípios das UFs com -1 que não são -1
fz.excecoesUfsMenos1 = [...fuso2].filter(([k, d]) => ['am', 'ms', 'mt', 'ro', 'rr'].includes(k.slice(0, 2)) && d !== -1 && !(k.startsWith('am/') && d === -2)).map(([k, d]) => `${k} ${d}`);
fz.outrasUfsNaoZero = [...fuso2].filter(([k, d]) => !['am', 'ms', 'mt', 'ro', 'rr', 'ac'].includes(k.slice(0, 2)) && d !== 0).map(([k, d]) => `${k} ${nomes.get(k)} ${d}`);
R.fuso = fz;
const nac = secoes.filter((s) => s.uf !== 'zz' && s.votos !== null);
R.universo.consideradas = nac.length;
const lim = (s, hBsb) => (hBsb + dif(s)) * 3600;

// ---- Carga ----
const cg = { porFaixa: {}, diaDaEleicao: [] };
for (const s of secoes) {
  const d = s.carga?.slice(0, 10) ?? 'sem';
  const faixa = d >= '2026-09-15' && d <= '2026-10-04' ? '15/09-04/10' : d >= '2026-10-09' && d <= '2026-10-25' ? '09/10-25/10' : `outra ${d}`;
  inc(cg.porFaixa, faixa);
  if (faixa === '09/10-25/10') inc(cg.porFaixa, `09/10-25/10 ${s.tipo_urna}`);
  if (d === '2026-10-25') cg.diaDaEleicao.push({ id: s.id, carga: s.carga, abertura: s.abertura, pronta: hms(s.pronta), tipo: s.tipo_urna });
}
cg.min = secoes.reduce((m, s) => (s.carga < m ? s.carga : m), '9'); cg.max = secoes.reduce((m, s) => (s.carga > m ? s.carga : m), '0');
R.carga = cg;

// ---- Abertura ----
const ab = { prontaAntes8: 0, primeiroVotoAntes8: 0, aberturaBuAntes8: 0, ge0815: 0, ge0900: 0, ge1000: 0, semPronta: 0 };
const rel = [];
let maisTarde = null;
for (const s of nac) {
  if (seg(s.abertura) < lim(s, 8)) ab.aberturaBuAntes8++;
  if (s.pronta === null) { ab.semPronta++; continue; }
  const r = s.pronta - lim(s, 8); rel.push(r);
  if (r < 0) ab.prontaAntes8++;
  if (r >= 900) ab.ge0815++; if (r >= 3600) ab.ge0900++; if (r >= 7200) ab.ge1000++;
  if (s.primeiro !== null && s.primeiro < lim(s, 8)) ab.primeiroVotoAntes8++;
  if (!maisTarde || r > maisTarde.r) maisTarde = { r, id: s.id, pronta: hms(s.pronta), votos: s.votos, comparecimento: s.comparecimento, aptos: s.aptos, fuso: dif(s) };
}
rel.sort((a, b) => a - b);
ab.p50_floor = hms(8 * 3600 + qFloor(rel, 0.5)); ab.mediana = mediana(rel); ab.p99_floor = hms(8 * 3600 + qFloor(rel, 0.99)); ab.maisTarde = maisTarde;
ab.buAbertura080001_logDepois = nac.filter((s) => s.logs === 1 && s.pronta !== null && Math.abs(seg(s.abertura) - s.pronta) > 60)
  .map((s) => ({ id: s.id, abertura: s.abertura, pronta: hms(s.pronta), difMin: +((s.pronta - seg(s.abertura)) / 60).toFixed(1) }));
R.abertura = ab;

// ---- Reinícios ----
R.reinicios = { secoes: nac.filter((s) => s.reinicios > 0).length, total: nac.reduce((a, s) => a + s.reinicios, 0),
  secoesTodas: secoes.filter((s) => s.reinicios > 0).length, totalTodas: secoes.reduce((a, s) => a + (s.reinicios ?? 0), 0) };

// ---- Intervalos ----
const comVoto = secoes.filter((s) => s.votos > 0);
const it = { secoesComVoto: comVoto.length, abaixo15: 0, secoesAbaixo15: [], minPorSecao: {} };
for (const s of comVoto) {
  const n = (s.fi?.[0] ?? 0) + (s.fi?.[1] ?? 0) + (s.fi?.[2] ?? 0);
  if (n) { it.abaixo15 += n; it.secoesAbaixo15.push({ id: s.id, n, logs: s.logs, votosLog: s.votos, bu: s.comparecimento, tipo: s.tipo_urna }); }
  if (s.min_int !== null && s.min_int <= 20) inc(it.minPorSecao, s.min_int);
}
it.secoesMin16_17 = comVoto.filter((s) => s.min_int === 16 || s.min_int === 17).map((s) => `${s.id} ${s.min_int}`);
it.hab = { por_cargos: {} };
for (const s of comVoto) { if (s.min_hab === null) continue; const k = `${s.cargos}cargo`; it.hab.por_cargos[k] ??= {}; if (s.min_hab <= 8) inc(it.hab.por_cargos[k], s.min_hab); }
it.hab.min2cargos_secoes = comVoto.filter((s) => s.cargos === 2 && s.min_hab !== null && s.min_hab <= 4).map((s) => `${s.id} ${s.min_hab}`);
it.hab.secoes2cargos = secoes.filter((s) => s.cargos === 2).length;
it.hab.ufs2cargos = [...new Set(secoes.filter((s) => s.cargos === 2).map((s) => s.uf))];
it.hab.secoesUfsAcDfRnTo = secoes.filter((s) => ['ac', 'df', 'rn', 'to'].includes(s.uf)).length;
it.hab.min2_1cargo_porUf = comVoto.filter((s) => s.cargos === 1 && s.min_hab === 2).reduce((o, s) => (inc(o, s.uf), o), {});
R.intervalos = it;

// ---- Votos depois das 17h / 18h / 19h ----
const soma = (s, hBsb) => (s.h ? s.h.slice(hBsb + dif(s)).reduce((a, b) => a + b, 0) : 0);
const v = { secoes: nac.length, votosLog: 0, comparecimentoBu: 0, v17: 0, s17: 0, v18: 0, s18: 0, v19: 0, s19: 0, porUf: {} };
const ultimoApos = [];
for (const s of nac) {
  s.t17 = soma(s, 17); s.t18 = soma(s, 18); s.t19 = soma(s, 19);
  v.votosLog += s.votos; v.comparecimentoBu += s.comparecimento;
  v.v17 += s.t17; v.v18 += s.t18; v.v19 += s.t19; if (s.t17) v.s17++; if (s.t18) v.s18++; if (s.t19) v.s19++;
  const u = v.porUf[s.uf] ??= { votos: 0, v17: 0, v18: 0 }; u.votos += s.votos; u.v17 += s.t17; u.v18 += s.t18;
  if (s.t17) ultimoApos.push((s.ultimo - lim(s, 17)) / 60);
}
for (const u of Object.values(v.porUf)) u.pct17 = +(100 * u.v17 / u.votos).toFixed(3);
v.pct17 = +(100 * v.v17 / v.votosLog).toFixed(4); v.pctSecoes17 = +(100 * v.s17 / v.secoes).toFixed(2);
const ord = Object.entries(v.porUf).sort((a, b) => a[1].pct17 - b[1].pct17);
v.ufMenor = `${ord[0][0]} ${ord[0][1].pct17}`; v.ufMaior = `${ord.at(-1)[0]} ${ord.at(-1)[1].pct17}`;
v.top18 = Object.entries(v.porUf).sort((a, b) => b[1].v18 - a[1].v18).slice(0, 6).map(([uf, u]) => `${uf} ${u.v18}`);
ultimoApos.sort((a, b) => a - b);
v.ultimoMinApos17 = { n: ultimoApos.length, p50_floor: qFloor(ultimoApos, 0.5), mediana: mediana(ultimoApos), p99_floor: qFloor(ultimoApos, 0.99), max: ultimoApos.at(-1) };
v.secoesLogDifereBu = secoes.filter((s) => s.votos !== null && s.votos !== s.comparecimento).map((s) => `${s.id} ${s.votos - s.comparecimento}`);
v.votosForaDaJanela = secoes.reduce((a, s) => a + (s.fora ?? 0), 0);
// Só urna da própria seção (tipo 'secao'), para conciliar com a contagem que exclui urnas de reserva/contingência
v.soUrnaDaSecao = nac.filter((s) => s.tipo_urna === 'secao').reduce((o, s) => { o.v17 += s.t17; o.v18 += s.t18; if (s.t18) o.s18++; return o; }, { v17: 0, v18: 0, s18: 0 });
v.ultimoVotoDepoisDoEncerramentoBu = secoes.filter((s) => s.ultimo !== null && s.encerramento && s.ultimo > seg(s.encerramento)).map((s) => s.id);
R.votosTardios = v;

// ---- Encerramento ----
const en = { semEncerramentoBu: secoes.filter((s) => !s.encerramento).map((s) => `${s.id} ${s.tipo_urna} ab=${s.abertura} em=${s.emissao}`), outroDia: secoes.filter((s) => s.encerramento && s.encerramento.slice(0, 10) !== '2026-10-25').length, antes17: 0, minRel17: Infinity, classes: {}, exatamente190000: 0 };
for (const s of nac) {
  s.encBsb = seg(s.encerramento) - dif(s) * 3600;
  if (s.encBsb < 17 * 3600) en.antes17++;
  en.minRel17 = Math.min(en.minRel17, s.encBsb);
  s.classe = s.encBsb < 17.5 * 3600 ? '17h' : s.encBsb < 19 * 3600 ? '17h30-18h59' : '19h+';
  if (s.encBsb === 19 * 3600) en.exatamente190000++;
  const c = en.classes[s.classe] ??= { secoes: 0, comTardio: 0, v17: 0, v18: 0, v19: 0, semTardio: 0 };
  c.secoes++; c.v17 += s.t17; c.v18 += s.t18; c.v19 += s.t19; if (s.t17) c.comTardio++; else c.semTardio++;
}
en.minRel17 = hms(en.minRel17);
const s19 = nac.filter((s) => s.classe === '19h+');
en.de1900a1909 = s19.filter((s) => s.encBsb < 19 * 3600 + 600).length;
const porMun = {}; for (const s of s19) inc(porMun, `${s.uf} ${nomes.get(`${s.uf}/${s.mun}`)}`);
en.municipios19 = Object.keys(porMun).length; en.topMun = Object.entries(porMun).sort((a, b) => b[1] - a[1]).slice(0, 8);
const locais = new Map();
for (const s of nac) { const k = `${s.uf}/${s.mun}/${s.zona}/${s.local}`; if (!locais.has(k)) locais.set(k, []); locais.get(k).push(s); }
let lt19 = 0, ltMisto = 0;
for (const l of locais.values()) { const n = l.filter((s) => s.classe === '19h+').length; const t = n === 0 ? 'normal' : n === l.length ? 'todas_19h' : 'misto'; if (t === 'todas_19h') lt19++; else if (t === 'misto') ltMisto++; for (const s of l) s.tipoLocal = t; }
en.locaisTodas19 = lt19; en.locaisMistos = ltMisto;
// emissão − encerramento (BU) e Inicio do Encerramento (log) − encerramento (BU)
const fx = (g) => (g < 0 ? '<0' : g < 5 ? '0-4min' : g < 15 ? '5-14min' : g < 60 ? '15-59min' : g < 120 ? '1-2h' : '>=2h');
en.emissaoMenosEnc = {}; en.iniEncLogMenosEncBu = {}; let maxEm = null;
for (const s of secoes) {
  if (!s.encerramento) continue;
  if (s.emissao) { const g = (seg(s.emissao) - seg(s.encerramento)) / 60; inc(en.emissaoMenosEnc, fx(g)); if (!maxEm || g > maxEm.g) maxEm = { g, id: s.id }; }
  if (s.ini_enc !== null && s.ini_enc !== undefined) inc(en.iniEncLogMenosEncBu, fx((s.ini_enc - seg(s.encerramento)) / 60));
}
en.maxEmissao = maxEm;
en.semInicioEncerramentoLog = secoes.filter((s) => s.votos !== null && s.ini_enc === null).map((s) => s.id);
en.reservaSecao = secoes.filter((s) => s.tipo_urna === 'reservaSecao').length;
en.tiposUrna = secoes.reduce((o, s) => (inc(o, s.tipo_urna), o), {});
en.pacotesMaisDeUmLog = secoes.filter((s) => s.logs > 1).length;
R.encerramento = en;

// ---- Resultado × votos tardios (dentro da zona) ----
const pres = new Map();
for (const r of db.prepare(`SELECT uf, municipio, zona, secao, SUM(CASE WHEN numero = 13 THEN quantidade ELSE 0 END) v13,
    SUM(CASE WHEN numero = 22 THEN quantidade ELSE 0 END) v22 FROM voto_bu WHERE turno = 2 AND cargo = 1 AND tipo_voto = 'nominal' GROUP BY 1,2,3,4`).iterate())
  pres.set(`${r.uf} ${r.municipio}/${r.zona}/${r.secao}`, r);
const tot = [...pres.values()].reduce((a, r) => [a[0] + r.v13, a[1] + r.v22], [0, 0]);
R.resultado = { v13: tot[0], v22: tot[1], margem: tot[0] - tot[1], v17SobreMargemPct: +(100 * v.v17 / (tot[0] - tot[1])).toFixed(3) };
for (const s of secoes) { const p = pres.get(s.id); s.v13 = p?.v13 ?? 0; s.v22 = p?.v22 ?? 0; }
const pct = (s) => s.v13 / (s.v13 + s.v22);
const zonas = new Map();
for (const s of nac) { if (s.v13 + s.v22 < 20) continue; const k = `${s.uf}/${s.mun}/${s.zona}`; if (!zonas.has(k)) zonas.set(k, []); zonas.get(k).push(s); }
const media = (l, f) => l.reduce((x, s) => x + f(s), 0) / l.length;
function grupo(crit) {
  let zm = 0, sd = 0, pw = 0; const a = [0, 0], b = [0, 0];
  for (const l of zonas.values()) {
    const si = l.filter(crit), na = l.filter((s) => !crit(s));
    for (const s of si) { a[0] += s.v13; a[1] += s.v22; } for (const s of na) { b[0] += s.v13; b[1] += s.v22; }
    if (si.length && na.length) { zm++; const w = Math.min(si.length, na.length); sd += w * (media(si, pct) - media(na, pct)); pw += w; }
  }
  return { zonas: zm, difPP: +(100 * sd / pw).toFixed(2), brutoGrupo: +(100 * a[0] / (a[0] + a[1])).toFixed(2), brutoResto: +(100 * b[0] / (b[0] + b[1])).toFixed(2) };
}
R.resultado.tardio17 = grupo((s) => s.t17 > 0);
{ const xs = [], ys = [];
  for (const l of zonas.values()) { if (l.length < 2) continue; const mx = media(l, (s) => s.t17 / Math.max(1, s.votos)), my = media(l, pct); for (const s of l) { xs.push(s.t17 / Math.max(1, s.votos) - mx); ys.push(pct(s) - my); } }
  const sxy = xs.reduce((x, q, i) => x + q * ys[i], 0), sxx = xs.reduce((x, q) => x + q * q, 0), syy = ys.reduce((x, q) => x + q * q, 0);
  R.resultado.correlacao = { secoes: xs.length, r: +(sxy / Math.sqrt(sxx * syy)).toFixed(4) }; }

// ================= 1º turno (perfis completos em disco) =================
const s1 = [];
for (const uf of UFS) {
  const rl = createInterface({ input: createReadStream(path.join(DIR_DADOS, 'parsed', '1t', 'perfil', `${uf}.jsonl`)), crlfDelay: Infinity });
  for await (const linha of rl) {
    if (!linha) continue;
    const p = JSON.parse(linha);
    const pr = p.bu.eleicoes.find((e) => e.idEleicao === 6257)?.cargos.find((c) => c.codigoCargo === 1)?.votos ?? {};
    const nominais = Object.entries(pr).filter(([k]) => /^\d+$/.test(k)).reduce((a, [, n]) => a + n, 0);
    s1.push({ uf, mun: p.municipio, zona: p.zona, secao: p.secao, id: `${uf} ${p.municipio}/${p.zona}/${p.secao}`, abertura: segBu(p.bu.dataHoraAbertura), encerramento: segBu(p.bu.dataHoraEncerramento),
      pronta: p.log?.urnaPronta ?? null, h: p.log?.votosPorHoraLocal ?? null, votos: p.log?.votosComputados ?? null, v13: pr['13'] ?? 0, nominais,
      tipo: p.bu.urna.tipoUrna, ultimo: p.log?.ultimoVoto ?? null, primeiro: p.log?.primeiroVoto ?? null, comparecimento: p.bu.qtdEleitoresCompareceram,
      semBio: p.log?.anoNascimentoSemBiometria ?? null, dadoPessoal: p.log?.dadoPessoalConfere ?? null, manual: p.log?.habilitadosPeloMesario ?? null, logs: p.log?.logsNoPacote ?? null,
      minInt: p.log?.intervaloEntreVotos?.minimo ?? null, bu: p.bu.detalhamentoComparecimento });
  }
}
const F1 = fusos(s1, (s) => s.abertura, (s) => s.pronta);
const relogio1 = difRelogioPorSecao(1);
const dif1 = (s) => (s.uf === 'zz' ? null : difSecao(relogio1, s.uf, s.mun, s.zona, s.secao, F1.f.get(`${s.uf}/${s.mun}`)));
const t1 = { secoes: s1.length, ufs: [...new Set(s1.map((s) => s.uf))].length, fusoDifere2t: [...F1.f].filter(([k, d]) => fuso2.has(k) && fuso2.get(k) !== d).length, v17: 0, v18: 0, s17: 0, votos: 0, enc10min: {} };
const nac1 = s1.filter((s) => s.uf !== 'zz' && s.h);
for (const s of nac1) {
  const a = s.h.slice(17 + dif1(s)).reduce((x, y) => x + y, 0), b = s.h.slice(18 + dif1(s)).reduce((x, y) => x + y, 0);
  t1.v17 += a; t1.v18 += b; if (a) t1.s17++; t1.votos += s.votos;
  if (s.tipo === 1) { t1.v17_soUrnaDaSecao = (t1.v17_soUrnaDaSecao ?? 0) + a; t1.v18_soUrnaDaSecao = (t1.v18_soUrnaDaSecao ?? 0) + b; }
  const e = s.encerramento - dif1(s) * 3600;
  if (e >= 17.5 * 3600 && e < 23 * 3600) { const m = Math.floor(e / 600) * 10; inc(t1.enc10min, `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`); }
}
t1.consideradas = nac1.length;
// degrau no 2º turno, mesma régua
const enc10_2t = {};
for (const s of nac) { const e = s.encBsb; if (e >= 17.5 * 3600 && e < 23 * 3600) { const m = Math.floor(e / 600) * 10; inc(enc10_2t, `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`); } }
t1.enc10min_2t = enc10_2t;
R.turno1 = t1;

// ---- Diferença de diferenças (locais 19h × locais normais da mesma zona), 1º turno completo ----
const p1 = new Map(s1.map((s) => [s.id, s.nominais ? s.v13 / s.nominais : null]));
function comparar(filtro = () => true) {
  const zz = new Map();
  for (const s of nac) { if (s.tipoLocal === 'misto' || !filtro(s)) continue; const k = `${s.uf}/${s.mun}/${s.zona}`; if (!zz.has(k)) zz.set(k, []); zz.get(k).push(s); }
  let zm = 0, peso = 0, d2 = 0, pd = 0, did = 0, zd = 0;
  for (const l of zz.values()) {
    const a = l.filter((s) => s.tipoLocal === 'todas_19h' && s.v13 + s.v22 > 0), b = l.filter((s) => s.tipoLocal === 'normal' && s.v13 + s.v22 > 0);
    if (!a.length || !b.length) continue;
    zm++; const w = Math.min(a.length, b.length); d2 += w * (media(a, pct) - media(b, pct)); peso += w;
    const a1 = a.filter((s) => p1.get(s.id) != null), b1 = b.filter((s) => p1.get(s.id) != null);
    if (a1.length && b1.length) { zd++; const w1 = Math.min(a1.length, b1.length); const dl = (x) => media(x, (s) => pct(s) - p1.get(s.id)); did += w1 * (dl(a1) - dl(b1)); pd += w1; }
  }
  return { zonas: zm, difPP: +(100 * d2 / peso).toFixed(2), zonasDid: zd, didPP: pd ? +(100 * did / pd).toFixed(2) : null };
}
R.locais19 = { todas: comparar() };
for (const uf of ['rj', 'sp', 'ba', 'pe', 'pb']) R.locais19[uf] = comparar((s) => s.uf === uf);

// ---- Exterior (relógio local) ----
const ext = secoes.filter((s) => s.uf === 'zz' && s.h);
R.exterior = { secoes: secoes.filter((s) => s.uf === 'zz').length, v17local: ext.reduce((a, s) => a + s.h.slice(17).reduce((x, y) => x + y, 0), 0), s17local: ext.filter((s) => s.h.slice(17).some((x) => x)).length };

// ---- Caso AM Ipixuna 0045/0063 (confirmação, não gera número) ----
const caso2 = secoes.find((s) => s.uf === 'am' && s.zona === '0045' && s.secao === '0063' && nomes.get(`am/${s.mun}`)?.startsWith('IPIXUNA'));
const caso1 = caso2 && s1.find((s) => s.uf === 'am' && s.mun === caso2.mun && s.zona === '0045' && s.secao === '0063');
R.casoIpixuna = { t2: caso2 && { id: caso2.id, fuso: dif(caso2), abertura: caso2.abertura, encerramento: caso2.encerramento, pronta: hms(caso2.pronta), ultimo: hms(caso2.ultimo), votos: caso2.votos, bu: caso2.comparecimento, h: caso2.h, tipo: caso2.tipo_urna, minInt: caso2.min_int, t17: caso2.t17, v13: caso2.v13, v22: caso2.v22, reinicios: caso2.reinicios },
  t1: caso1 && { ...caso1, fuso: dif1(caso1), abertura: hms(caso1.abertura), encerramento: hms(caso1.encerramento), pronta: hms(caso1.pronta), ultimo: hms(caso1.ultimo), t17: caso1.h.slice(17 + dif1(caso1)).reduce((x, y) => x + y, 0) } };

await writeFile(path.join(SAIDA, 'linha-do-tempo.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
