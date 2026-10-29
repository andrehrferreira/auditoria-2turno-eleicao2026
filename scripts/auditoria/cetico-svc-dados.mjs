// Revisor cético, achado software-verificacao-caminhos (svc), lente dados e definições.
// Não refaz a varredura bruta (a lente reprodução faz isso): confere as DEFINIÇÕES e o UNIVERSO de cada número do
// engenheiro-seguranca-urna (docs/analysis/engenheiro-seguranca-urna/03 e 04) a partir das saídas dele
// (<uf>.secoes.jsonl, catálogos) e do banco (cópia de leitura), e mede o que muda com outra definição:
//   1. universo: pacotes por UF (varredura × banco), logs por pacote (varredura × perfil_log), pacotes com 2+ logs;
//   2. boots de votação: etapas, [SUCESSO], sequência × modal da UF (sem separar modelo) e da UF×modelo, MV trocada;
//   3. lista de retrocessos de relógio truncada em 20 por log (o "262, todos no exterior" depende disso);
//   4. amostra do catálogo (até 300 seções por UF e mensagem; 50 no nacional se > 2.000) usada como universo pelos
//      scripts de erro de assinatura e de carga no dia;
//   5. carga no dia pelo BU (data_hora_carga), nas 499.207 seções, 2º e 1º turno;
//   6. excesso de trocas por zona: nulo só pela UF (autor) × nulo pelo modelo da urna do 1º turno (UF×modelo e nacional).
// Uso: node scripts/auditoria/cetico-svc-dados.mjs   (saída: data/parsed/auditoria/cetico/svc-dados.json)
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

const BASE = path.join(DIR_DADOS, 'parsed', 'auditoria', 'engenheiro-seguranca-urna');
const DIR = path.join(BASE, '2t');
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');
mkdirSync(SAIDA, { recursive: true });
const { db, fonte } = await abrirLeitura();
console.log(`banco: ${fonte}`);
const q = (sql, ...p) => db.prepare(sql).all(...p);
const inc = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };
const out = {};

// ---------- 1 e 2: varredura do autor ----------
const perfil = new Map(q('SELECT uf, municipio, zona, secao, logs_no_pacote AS n FROM perfil_log WHERE turno = 2').map((r) => [`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, r.n]));
const bancoUf = Object.fromEntries(q('SELECT uf, COUNT(*) n FROM secao WHERE turno = 2 AND hash IS NOT NULL GROUP BY uf').map((r) => [r.uf, r.n]));
const dicionario = {};
const u = { pacotesPorUf: {}, logs: 0, pacotesCom2Logs: 0, logsDifPerfil: [], idsRepetidos: 0, linhasMalformadas: {}, logsComMalformada: [] };
const boots = []; // só boots de votação
const modalUf = {}; const modalUfModelo = {};
const ret = { logsComRetrocesso: 0, retrocessos: 0, listados: 0, logsTruncados: 0, logsTruncadosPorUf: {}, retrocessosNaoListados: 0, semAjusteNoTurnoListados: {}, logsTruncadosComListaSoPre: 0 };
const vistos = new Set();
for (const arq of readdirSync(DIR).filter((n) => n.endsWith('.secoes.jsonl')).sort()) {
  const uf = arq.split('.')[0];
  Object.assign(dicionario, JSON.parse(readFileSync(path.join(DIR, `${uf}.catalogo.json`), 'utf8')).dicionarioEtapas);
  for (const linha of readFileSync(path.join(DIR, arq), 'utf8').split('\n')) {
    if (!linha) continue;
    const r = JSON.parse(linha);
    const id = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
    if (vistos.has(id)) u.idsRepetidos++; else vistos.add(id);
    inc(u.pacotesPorUf, uf);
    u.logs += r.logs.length;
    if (r.logs.length > 1) u.pacotesCom2Logs++;
    const np = perfil.get(id);
    if (np !== r.logs.length) u.logsDifPerfil.push({ id, varredura: r.logs.length, perfil: np ?? null, nomes: r.logs.map((l) => `${l.nome}@${l.profundidade}`) });
    for (const l of r.logs) {
      if (l.linhasMalformadas !== undefined) { inc(u.linhasMalformadas, uf, l.linhasMalformadas); if (l.linhasMalformadas) u.logsComMalformada.push({ id, nome: l.nome, profundidade: l.profundidade, n: l.linhasMalformadas, votosNoLog: l.boots.reduce((a, b) => a + b.votos, 0) }); }
      if (l.retrocessos > 0) {
        ret.logsComRetrocesso++; ret.retrocessos += l.retrocessos; ret.listados += l.retrocessosLista.length;
        if (l.retrocessos > l.retrocessosLista.length) {
          ret.logsTruncados++; inc(ret.logsTruncadosPorUf, uf); ret.retrocessosNaoListados += l.retrocessos - l.retrocessosLista.length;
          if (l.retrocessosLista.every((x) => x.periodo === 'pre' || x.periodo === 'outroAno')) ret.logsTruncadosComListaSoPre++;
        }
        for (const x of l.retrocessosLista) if (x.periodo !== 'pre' && !x.aposAjuste) inc(ret.semAjusteNoTurnoListados, uf);
      }
      for (const b of l.boots) {
        const kU = uf; const kM = `${uf}:${b.modelo}`;
        (modalUf[kU] ??= {}); inc(modalUf[kU], b.impressao);
        (modalUfModelo[kM] ??= {}); inc(modalUfModelo[kM], b.impressao);
        if (!(b.pronta || b.votos > 0)) continue;
        boots.push({ id, uf, modelo: b.modelo, h: b.impressao, etapas: b.etapas, naoSucesso: b.etapasNaoSucesso, votos: b.votos, pronta: b.pronta, mvOriginal: b.mvOriginal, mv: b.mv, ligada: b.ligada, profundidade: l.profundidade, apps: b.apps });
      }
    }
  }
}
const moda = (m) => Object.entries(m).filter(([h]) => h !== 'null').sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
const hU = Object.fromEntries(Object.entries(modalUf).map(([k, m]) => [k, moda(m)]));
const hM = Object.fromEntries(Object.entries(modalUfModelo).map(([k, m]) => [k, moda(m)]));
const bv = {
  total: boots.length, votosNosBoots: boots.reduce((a, b) => a + b.votos, 0), semVotoSoPronta: boots.filter((b) => b.votos === 0).length,
  emLogAninhado: boots.filter((b) => b.profundidade > 0).length, votosEmLogAninhado: boots.filter((b) => b.profundidade > 0).reduce((a, b) => a + b.votos, 0),
  modeloNull: boots.filter((b) => !b.modelo).length, etapas: {}, comNaoSucesso: boots.filter((b) => b.naoSucesso > 0).length, semEtapas: boots.filter((b) => b.etapas === 0).length,
  difModalUfModelo: [], difModalUf: [], mvTrocada: [],
};
for (const b of boots) {
  inc(bv.etapas, `${b.uf === 'zz' ? 'zz' : b.uf === 'pe' ? 'pe' : 'demais'}:${b.etapas}`);
  const dM = b.h !== hM[`${b.uf}:${b.modelo}`]; const dU = b.h !== hU[b.uf];
  if (dM) bv.difModalUfModelo.push(b.id);
  if (dU) bv.difModalUf.push(b.id);
  if (b.mvOriginal && b.mv && b.mvOriginal !== b.mv) bv.mvTrocada.push(b.id);
}
// as 3 listas, com interseções
const sM = new Set(bv.difModalUfModelo); const sU = new Set(bv.difModalUf); const sMv = new Set(bv.mvTrocada);
bv.resumo = {
  difModalUfModelo: bv.difModalUfModelo.length, difModalUf: bv.difModalUf.length, mvTrocada: bv.mvTrocada.length,
  difModalUfNaoNaUfModelo: [...sU].filter((x) => !sM.has(x)), difUfModeloNaoNaUf: [...sM].filter((x) => !sU.has(x)),
  difSemMvTrocada: [...sM].filter((x) => !sMv.has(x)), mvTrocadaSemDif: [...sMv].filter((x) => !sM.has(x)),
  votosNosDif: boots.filter((b) => sM.has(b.id) && b.h !== hM[`${b.uf}:${b.modelo}`]).reduce((a, b) => a + b.votos, 0),
  boots33ForaZz: boots.filter((b) => b.etapas === 33 && b.uf !== 'zz').map((b) => b.id),
};
bv.resumo.boots33ForaZzNaListaDif = bv.resumo.boots33ForaZz.filter((x) => sM.has(x)).length;
// Etapa ausente nos boots diferentes: compara a lista de arquivos com a modal
const etapaFaltante = {};
for (const b of boots.filter((x) => x.h !== hM[`${x.uf}:${x.modelo}`])) {
  const ref = dicionario[hM[`${b.uf}:${b.modelo}`]]?.etapas.map((e) => e.split(':').slice(1).join(':')) ?? [];
  const at = dicionario[b.h]?.etapas.map((e) => e.split(':').slice(1).join(':')) ?? [];
  const falta = ref.filter((e) => { const i = at.indexOf(e); if (i >= 0) { at.splice(i, 1); return false; } return true; });
  inc(etapaFaltante, `${falta.join(',')} | sobra ${at.join(',')}`);
}
bv.etapaFaltanteNosDif = etapaFaltante;
delete bv.difModalUf; bv.difModalUfModelo = [...sM]; bv.mvTrocada = [...sMv];
out.universo = { ...u, logsDifPerfil: u.logsDifPerfil, bancoComHash: Object.values(bancoUf).reduce((a, b) => a + b, 0), pacotes: Object.values(u.pacotesPorUf).reduce((a, b) => a + b, 0), ufsDivergentes: Object.keys(bancoUf).filter((k) => bancoUf[k] !== u.pacotesPorUf[k]) };
out.bootsVotacao = bv;
out.retrocessos = ret;
console.log('universo:', JSON.stringify({ ...out.universo, pacotesPorUf: undefined }, null, 1));
console.log('boots de votação:', JSON.stringify({ ...bv, difModalUfModelo: bv.difModalUfModelo.length, mvTrocada: bv.mvTrocada.length }, null, 1));
console.log('retrocessos:', JSON.stringify(ret, null, 1));

// ---------- 4: amostra do catálogo usada como universo ----------
const nac = JSON.parse(readFileSync(path.join(BASE, 'catalogo-nacional-2t.json'), 'utf8')).mensagens;
const ehErro = (nivel, msg) => (nivel === 'ERRO' || nivel === 'WHAT' || /\[ERRO\]$/.test(msg)) && /assinatura|integridade/i.test(msg);
const amostra = { mensagensErroAssinatura: 0, truncadas: [], somaSecoesNoCatalogo: 0, idsNaAmostra: new Set() };
for (const [k, e] of Object.entries(nac)) {
  const [, nivel, , ...resto] = k.split('\t');
  if (!ehErro(nivel, resto.join('\t'))) continue;
  amostra.mensagensErroAssinatura++;
  amostra.somaSecoesNoCatalogo += e.secoes;
  for (const a of e.amostra) amostra.idsNaAmostra.add(a.split('*')[0]);
  if (e.amostraTruncada || e.amostra.length < e.secoes) amostra.truncadas.push({ k, secoes: e.secoes, amostra: e.amostra.length });
}
const scue = nac['dia\tINFO\tSCUE\tIniciando aplicação - #º turno'];
amostra.scueDia = { secoes: scue?.secoes, amostra: scue?.amostra.length, truncada: scue?.amostraTruncada };
amostra.idsNaAmostra = amostra.idsNaAmostra.size;
out.amostraCatalogo = amostra;
console.log('amostra do catálogo:', JSON.stringify(amostra, null, 1));

// ---------- 5: carga no dia pelo BU (universo: todas as seções com BU) ----------
out.cargaNoDiaBu = {
  t2: q(`SELECT s2.uf, s2.municipio, s2.zona, s2.secao, s2.tipo_urna, s2.modelo_urna m2, s2.numero_interno_urna u2, s1.numero_interno_urna u1, s1.modelo_urna m1, s2.data_hora_carga, s2.abertura, s2.comparecimento
    FROM secao s2 JOIN secao s1 ON s1.turno = 1 AND s1.uf = s2.uf AND s1.municipio = s2.municipio AND s1.zona = s2.zona AND s1.secao = s2.secao
    WHERE s2.turno = 2 AND s2.data_hora_carga LIKE '2026-10-25%'`),
  t1: q(`SELECT uf, municipio, zona, secao, tipo_urna, data_hora_carga, abertura FROM secao WHERE turno = 1 AND data_hora_carga LIKE '2026-10-04%'`),
  t2Vespera: q(`SELECT tipo_urna, COUNT(*) n FROM secao WHERE turno = 2 AND data_hora_carga LIKE '2026-10-24%' GROUP BY 1`),
  t1Vespera: q(`SELECT tipo_urna, COUNT(*) n FROM secao WHERE turno = 1 AND data_hora_carga LIKE '2026-10-03%' GROUP BY 1`),
};
console.log('carga no dia (BU):', JSON.stringify(out.cargaNoDiaBu, null, 1));

// ---------- 6: trocas novas por zona, nulo pela UF × pelo modelo ----------
function caudaPoisson(k, lambda) {
  if (k <= 0) return 1;
  let termo = Math.exp(-lambda); let acc = termo;
  for (let i = 1; i < k; i++) { termo *= lambda / i; acc += termo; }
  return Math.max(0, 1 - acc);
}
const sec = q(`SELECT s2.uf, s2.municipio, s2.zona, s1.tipo_urna t1, upper(s1.modelo_urna) m1, upper(s2.modelo_urna) m2,
    (s2.tipo_urna IN ('reservaSecao','reservaEncerrandoSecao') AND s1.numero_interno_urna != s2.numero_interno_urna) AS nova,
    (s2.tipo_urna IN ('reservaSecao','reservaEncerrandoSecao') AND s1.numero_interno_urna = s2.numero_interno_urna) AS herdada
  FROM secao s2 JOIN secao s1 ON s1.turno = 1 AND s1.uf = s2.uf AND s1.municipio = s2.municipio AND s1.zona = s2.zona AND s1.secao = s2.secao
  WHERE s2.turno = 2`);
const tot = { secoes: sec.length, novas: sec.reduce((a, s) => a + s.nova, 0), herdadas: sec.reduce((a, s) => a + s.herdada, 0) };
// taxa por modelo do 1º turno, só seções com urna de SEÇÃO no 1º turno (urna original conhecida pelo BU)
const porModelo = {};
for (const s of sec) { const k = s.t1 === 'secao' ? s.m1 : `(${s.t1 || 'sem BU'})`; const o = (porModelo[k] ??= { secoes: 0, novas: 0 }); o.secoes++; o.novas += s.nova; }
for (const o of Object.values(porModelo)) o.porMil = +(1000 * o.novas / o.secoes).toFixed(2);
const chaveM = (s) => (s.t1 === 'secao' ? s.m1 : `(${s.t1 || 'sem BU'})`);
const taxa = { uf: {}, ufModelo: {}, modelo: {} };
for (const s of sec) {
  for (const [nome, k] of [['uf', s.uf], ['ufModelo', `${s.uf}:${chaveM(s)}`], ['modelo', chaveM(s)]]) { const o = (taxa[nome][k] ??= { s: 0, n: 0 }); o.s++; o.n += s.nova; }
}
const zonas = new Map();
for (const s of sec) {
  const k = `${s.uf}/${s.municipio}/${s.zona}`;
  const z = zonas.get(k) ?? { k, uf: s.uf, secoes: 0, novas: 0, herdadas: 0, lUf: 0, lUfModelo: 0, lModeloUfAjust: 0, ue2013: 0 };
  z.secoes++; z.novas += s.nova; z.herdadas += s.herdada;
  z.lUf += taxa.uf[s.uf].n / taxa.uf[s.uf].s;
  const tum = taxa.ufModelo[`${s.uf}:${chaveM(s)}`]; z.lUfModelo += tum.n / tum.s;
  z.lModeloUfAjust += taxa.modelo[chaveM(s)].n / taxa.modelo[chaveM(s)].s;
  if (chaveM(s) === 'UE2013') z.ue2013++;
  zonas.set(k, z);
}
// nulo "modelo nacional × fator da UF": reescala a soma pelo total observado da UF
const somaModUf = {};
for (const z of zonas.values()) { const o = (somaModUf[z.uf] ??= { l: 0, n: 0 }); o.l += z.lModeloUfAjust; o.n += z.novas; }
for (const z of zonas.values()) z.lModeloUfAjust *= somaModUf[z.uf].n / somaModUf[z.uf].l || 0;
const nZ = zonas.size;
const avaliar = (campo) => [...zonas.values()].map((z) => ({ ...z, p: caudaPoisson(z.novas, z[campo]) })).map((z) => ({ ...z, pB: Math.min(1, z.p * nZ) })).filter((z) => z.pB < 0.05).sort((a, b) => a.p - b.p)
  .map((z) => ({ zona: z.k, secoes: z.secoes, novas: z.novas, herdadas: z.herdadas, ue2013_1t: z.ue2013, esperadoUf: +z.lUf.toFixed(2), esperadoUfModelo: +z.lUfModelo.toFixed(2), esperadoModeloXUf: +z.lModeloUfAjust.toFixed(2), pB: +z.pB.toExponential(2) }));
// parque UE2013 alocado por zona inteira? distribuição da fração UE2013 (1º turno, urna de seção) por zona
const fr = [...zonas.values()].map((z) => z.ue2013 / z.secoes);
const zonasCom2013 = fr.filter((x) => x > 0).length;
const secoes2013 = [...zonas.values()].reduce((a, z) => a + z.ue2013, 0);
const emZonas80 = [...zonas.values()].filter((z) => z.ue2013 / z.secoes >= 0.8).reduce((a, z) => a + z.ue2013, 0);
out.trocas = {
  tot, porModelo1t: porModelo, zonas: nZ,
  bonferroniNuloUf: avaliar('lUf'), bonferroniNuloUfModelo: avaliar('lUfModelo'), bonferroniNuloModeloXUf: avaliar('lModeloUfAjust'),
  parque2013: { zonasComAlguma: zonasCom2013, zonas100pct: fr.filter((x) => x === 1).length, zonas80pct: fr.filter((x) => x >= 0.8).length, secoesUE2013: secoes2013, secoesUE2013EmZonas80pct: emZonas80 },
};
console.log('trocas:', JSON.stringify({ ...out.trocas, bonferroniNuloUf: out.trocas.bonferroniNuloUf, bonferroniNuloUfModelo: out.trocas.bonferroniNuloUfModelo, bonferroniNuloModeloXUf: out.trocas.bonferroniNuloModeloXUf }, null, 1));

writeFileSync(path.join(SAIDA, 'svc-dados.json'), JSON.stringify(out, null, 1));
console.log(`\ngravado ${path.join(SAIDA, 'svc-dados.json')}`);
