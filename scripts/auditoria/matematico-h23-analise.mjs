// Matemático forense, H23, passo 3: recargas, carga no dia da votação, carga fora do bloco da zona e junção com os votos.
// Entradas: h23-sessoes-<t>t.jsonl e h23-relidos.jsonl (passos 1 e 2) e a cópia de leitura do banco.
//
// Definições (escritas antes de olhar os votos):
//  - Sessão de carga: um logd.dat com uma carga SCUE (urna + código de carga).
//  - Recarga: dentro do mesmo pacote, a mesma urna com 2+ sessões. Ao ser recarregada, a urna arquiva o diário anterior
//    ("<urna><data><hora>-0N.jez", com a hora do arquivamento no nome) dentro do novo. Ordem: arquivados pela hora do
//    arquivamento, o diário vivo por último. Cada par consecutivo (anterior → nova) é uma recarga.
//    Período da recarga = data digitada da nova carga (antes do 1º turno: até 04/10; entre os turnos: 05/10 a 24/10;
//    dia do 2º turno: 25/10). No catálogo do 2º turno só contam as recargas com nova carga a partir de 05/10 (as
//    anteriores já estão no catálogo do 1º turno).
//  - Motivo visível, nesta ordem (o primeiro que valer):
//      falhou       a carga anterior não terminou com "Urna carregada com sucesso";
//      erro         a sessão anterior tem linha ERRO, exceto as duas de rotina (parecer cético 39): "GAP Problema ao
//                   desmontar a MR" (gravada a cada ligação, em 498.698 seções na preparação do 2º turno) e "Falha na
//                   captura da digital" (atendimento ao eleitor);
//      reserva      a carga anterior era de urna de contingência (seção 0000) e a nova é de seção (reuso da reserva:
//                   o motivo está na urna que ela substitui);
//      paraReserva  a nova carga é de contingência (seção 0000);
//      outraSecao   a carga anterior era para outra seção, zona ou município;
//      votou        a sessão anterior registrou votos (urna do 1º turno recarregada para o 2º);
//      novaMidia    a nova carga usou uma mídia de carga gerada DEPOIS da carga anterior (dados refeitos);
//      semMotivo    mesma seção, sem ERRO, carga anterior bem-sucedida, sem votos, mesma mídia de carga ou mídia
//                   gerada antes da carga anterior: nenhum motivo no diário  ← H23
//  - Carga no dia da votação: sessão com data digitada no dia da votação (04/10 ou 25/10), em qualquer diário, e BU com
//    data de carga no dia.
//  - Bloco da zona (1º turno, cerimônia original): dia de cerimônia = dia com 3 ou mais cargas no BU da zona. Carga fora
//    do bloco = carga do BU num dia com até 2 cargas da zona e a 2 dias ou mais do dia de cerimônia mais próximo
//    (sensibilidade: 1 e 3 dias). Madrugada = hora digitada de 00:00 a 05:59.
//  - Junção com os votos: diferença da variação 1º → 2º turno entre as seções marcadas e as demais da mesma zona
//    (comparecimento, parcela do 13 em 13 + 22, brancos + nulos), com permutação dentro da zona (2.000 sorteios);
//    para cargas que valem nos dois turnos, também o nível em cada turno contra as seções do mesmo local.
// Uso: node scripts/auditoria/matematico-h23-analise.mjs → data/parsed/auditoria/matematico-forense/h23-resultado.json, h23-casos.csv
import { createReadStream } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { SAIDA, carregarSecoes, somar, testeZona } from './matematico-h23-lib.mjs';

async function* jsonl(arq) {
  for await (const l of createInterface({ input: createReadStream(arq), crlfDelay: Infinity })) if (l) yield JSON.parse(l);
}
// "dd/mm/aaaa - hh:mm:ss" → "aaaa-mm-dd hh:mm:ss"
const iso = (s) => (s ? `${s.slice(6, 10)}-${s.slice(3, 5)}-${s.slice(0, 2)} ${s.replace(' - ', ' ').slice(11, 19)}` : null);
const periodo = (q) => (!q ? '?' : q < '2026-10-04' ? 'antes do 1º turno' : q < '2026-10-05' ? 'dia do 1º turno' : q < '2026-10-25' ? 'entre os turnos' : q < '2026-10-26' ? 'dia do 2º turno' : 'depois');
const mesmaSecao = (a, b) => a.secao === b.secao && a.zona === b.zona && a.municipio === b.municipio;
const conta = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };

const resultado = { definicoes: 'ver cabeçalho do script', recargas: {}, cargaNoDia: {}, foraDoBloco: {}, votos: {} };
const casos = [];

// ---------------------------------------------------------------- 1. Recargas
const ROTINA = /desmontar a MR|Falha na captura da digital/;
const ordemDiario = (g) => {
  const m = /^\d{8}(\d{2})(\d{2})(\d{4})(\d{2})(\d{2})(\d{2})-0\d\.jez$/.exec(g.nome);
  return m ? Number(`${m[3]}${m[2]}${m[1]}${m[4]}${m[5]}${m[6]}`) : 99999999999999;
};
const pares = { 1: new Map(), 2: new Map() };
const ordemConferida = { 1: {}, 2: {} };
// Códigos de carga que já existiam no 1º turno: uma "nova" carga do catálogo do 2º turno com código do 1º turno é de
// antes do 1º turno, ainda que a data digitada diga outra coisa (data digitada errada).
const codigos1t = new Set();
for await (const s of jsonl(path.join(SAIDA, 'h23-sessoes-1t.jsonl'))) codigos1t.add(`${s.urna}|${s.codigo}`);
const dataErrada2t = [];
const ultimaSessao = { 1: new Map(), 2: new Map() }; // urna|código → sessão (detalhe), para achar a carga do BU
for await (const p of jsonl(path.join(SAIDA, 'h23-relidos.jsonl'))) {
  if (!p.logs) continue;
  const porUrna = new Map();
  for (const g of p.logs) {
    if (!g.carga?.codigo) continue;
    ultimaSessao[p.turno].set(`${g.urna}|${g.carga.codigo}`, { ...g, k: p.k });
    (porUrna.get(g.urna) ?? porUrna.set(g.urna, []).get(g.urna)).push(g);
  }
  for (const [u, l] of porUrna) {
    if (l.length < 2) continue;
    // Ordem: os diários arquivados pela recarga ("<urna><ddmmaaaa><hhmmss>-0N.jez") vêm antes, pela hora do arquivamento
    // no nome; o diário vivo (logd.dat ou a cópia "...0NME.jez" feita pela reserva na contingência) vem por último. A data
    // digitada não serve para ordenar: há trocas de dia digitadas errado nos dois sentidos.
    l.sort((a, b) => ordemDiario(a) - ordemDiario(b));
    for (let i = 1; i < l.length; i++) {
      const a = l[i - 1]; const b = l[i];
      if (a.carga.codigo === b.carga.codigo) continue;
      const id = `${u}|${a.carga.codigo}|${b.carga.codigo}`;
      if (pares[p.turno].has(id)) continue;
      const quando = iso(b.carga.digitada);
      if (p.turno === 2 && quando && quando < '2026-10-05') continue;
      if (p.turno === 2 && codigos1t.has(`${u}|${b.carga.codigo}`)) { dataErrada2t.push({ k: p.k, urna: u, digitada: quando, relogio: iso(b.carga.relogio) }); continue; }
      const votosAnt = Object.values(a.votos).reduce((x, y) => x + y, 0);
      // Conferência da ordem: o arquivamento do diário anterior acontece quando a nova carga começa (mesmo relógio)
      const oa = ordemDiario(a);
      if (oa < 99999999999999 && b.carga.inicio) {
        const ini = Number(`${b.carga.inicio.slice(6, 10)}${b.carga.inicio.slice(3, 5)}${b.carga.inicio.slice(0, 2)}${b.carga.inicio.slice(11, 13)}${b.carga.inicio.slice(14, 16)}${b.carga.inicio.slice(17, 19)}`);
        const sec = (n) => Date.UTC(Math.floor(n / 1e10), Math.floor(n / 1e8) % 100 - 1, Math.floor(n / 1e6) % 100, Math.floor(n / 1e4) % 100, Math.floor(n / 100) % 100, n % 100) / 1000;
        conta(ordemConferida[p.turno], Math.abs(sec(oa) - sec(ini)) <= 600 ? 'arquivamentoAte10minDaNovaCarga' : 'arquivamentoLongeDaNovaCarga');
      } else conta(ordemConferida[p.turno], 'semHoraDeArquivamento');
      const errosRelevantes = Object.entries(a.errosMsg).filter(([m]) => !ROTINA.test(m)).reduce((x, [, n]) => x + n, 0);
      const motivo = !a.carga.ok ? 'falhou' : errosRelevantes > 0 ? 'erro' : a.carga.secao === '0000' && b.carga.secao !== '0000' ? 'reserva'
        : b.carga.secao === '0000' ? 'paraReserva' : !mesmaSecao(a.carga, b.carga) ? 'outraSecao' : votosAnt > 0 ? 'votou'
        : b.carga.fcGeracao && iso(b.carga.fcGeracao) > (iso(a.carga.relogio) ?? '') ? 'novaMidia' : 'semMotivo';
      pares[p.turno].set(id, { turno: p.turno, k: p.k, urna: u, anterior: { codigo: a.carga.codigo, quando: iso(a.carga.digitada), secao: a.carga.secao, zona: a.carga.zona,
        municipio: a.carga.municipio, ok: !!a.carga.ok, fc: a.carga.fc, fcGeracao: iso(a.carga.fcGeracao), erros: a.erros, errosMsg: a.errosMsg, apps: a.apps, votos: votosAnt, ultimas: a.ultimas, nome: a.nome },
        nova: { codigo: b.carga.codigo, quando, relogio: iso(b.carga.relogio), secao: b.carga.secao, zona: b.carga.zona, municipio: b.carga.municipio, ok: !!b.carga.ok,
          fc: b.carga.fc, fcGeracao: iso(b.carga.fcGeracao), mesmaMidia: a.carga.fc === b.carga.fc },
        periodo: periodo(quando), motivo });
    }
  }
}
for (const t of [1, 2]) {
  const tab = {};
  for (const r of pares[t].values()) { tab[r.periodo] ??= { total: 0 }; conta(tab[r.periodo], r.motivo); tab[r.periodo].total++; }
  const semM = [...pares[t].values()].filter((r) => r.motivo === 'semMotivo');
  const antesApps = {};
  for (const r of semM) conta(antesApps, Object.keys(r.anterior.apps).sort().join('+') || 'só carga');
  resultado.recargas[`${t}t`] = { pares: pares[t].size, ordemConferida: ordemConferida[t], porPeriodoEMotivo: tab, semMotivo: semM.length, semMotivoAplicacoesNaSessaoAnterior: antesApps,
    semMotivoMesmoDia: semM.filter((r) => r.anterior.quando?.slice(0, 10) === r.nova.quando?.slice(0, 10)).length };
}

// ---------------------------------------------------------------- BU e votos
const { db, fonte } = await abrirLeitura();
resultado.fonteBanco = fonte;
const S = carregarSecoes(db);
const bu = { 1: new Map(), 2: new Map() };
for (const r of db.prepare("SELECT turno, uf, municipio, zona, secao, tipo_urna, numero_interno_urna, data_hora_carga, codigo_carga, abertura, comparecimento FROM secao WHERE situacao = 'completa'").iterate()) {
  bu[r.turno].set(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, { uf: r.uf, zona: r.zona, tipo: r.tipo_urna, urna: r.numero_interno_urna === null ? null : String(r.numero_interno_urna).padStart(8, '0'),
    carga: r.data_hora_carga, codigo: r.codigo_carga, abertura: r.abertura, comp: r.comparecimento });
}
db.close();
resultado.universo = { secoesComBuNosDoisTurnos: S.size, bu1t: bu[1].size, bu2t: bu[2].size };

// Seções cujo BU saiu de uma carga que é a "nova" de um par sem motivo
const novaPorCodigo = { 1: new Map(), 2: new Map() };
for (const t of [1, 2]) for (const r of pares[t].values()) novaPorCodigo[t].set(`${r.urna}|${r.nova.codigo}`, r);
const marcadas = { semMotivo1t: new Set(), semMotivo2t: new Set(), recarga2t: new Set() };
const recarga2tPorPeriodo = {};
const buPorMotivo = { 1: {}, 2: {} };
for (const t of [1, 2]) {
  for (const [k, b] of bu[t]) {
    const r = novaPorCodigo[t].get(`${b.urna}|${b.codigo}`);
    if (!r) continue;
    conta(buPorMotivo[t], `${r.periodo} · ${r.motivo}`);
    if (r.motivo === 'semMotivo') marcadas[`semMotivo${t}t`].add(k);
    if (t === 2) { marcadas.recarga2t.add(k); conta(recarga2tPorPeriodo, r.periodo); }
  }
}
resultado.recargas.buGeradoPorCargaRecarregada = buPorMotivo;
resultado.recargas.catalogo2tComCodigoDo1t = dataErrada2t;

// Relógio interno no momento da digitação da hora (diário), por urna|código: 2º turno (varredura) e relidos.
const relogio = new Map();
for await (const s of jsonl(path.join(SAIDA, 'h23-sessoes-2t.jsonl'))) if (s.relogio) relogio.set(`${s.urna}|${s.codigo}`, s.relogio);
for (const t of [1, 2]) for (const [id, d] of ultimaSessao[t]) if (d.carga.relogio && !relogio.has(id)) relogio.set(id, iso(d.carga.relogio));
const difDias = (a, b) => Math.abs(Date.parse(a.replace(' ', 'T')) - Date.parse(b.replace(' ', 'T'))) / 864e5;
const conferirRelogio = (ks, t) => {
  const o = { comRelogio: 0, semRelogio: 0, relogioAteUmaHora: 0, relogioDifereMaisDeUmDia: 0, casosDiferentes: [] };
  for (const k of ks) {
    const b = bu[t].get(k);
    const r = relogio.get(`${b.urna}|${b.codigo}`);
    if (!r) { o.semRelogio++; continue; }
    o.comRelogio++;
    const d = difDias(b.carga, r);
    if (d <= 1 / 24) o.relogioAteUmaHora++;
    if (d > 1) { o.relogioDifereMaisDeUmDia++; o.casosDiferentes.push({ k, cargaBu: b.carga, relogio: r }); }
  }
  return o;
};

// ---------------------------------------------------------------- 2. Carga no dia da votação
const DIAS = { 1: '2026-10-04', 2: '2026-10-25' };
for (const t of [1, 2]) {
  const doBu = [...bu[t]].filter(([, b]) => b.carga?.startsWith(DIAS[t])).map(([k, b]) => ({ k, tipo: b.tipo, urna: b.urna, carga: b.carga, abertura: b.abertura, comp: b.comp }));
  const sess = [];
  for await (const s of jsonl(path.join(SAIDA, `h23-sessoes-${t}t.jsonl`))) if (s.quando?.startsWith(DIAS[t])) sess.push(s);
  const det = sess.map((s) => {
    const d = ultimaSessao[t].get(`${s.urna}|${s.codigo}`);
    const noBu = [...bu[t]].find(([, b]) => b.urna === s.urna && b.codigo === s.codigo)?.[0] ?? null;
    return { urna: s.urna, quando: s.quando, pacotes: s.pacotes.map((p) => `${p.k} (prof ${p.prof})`), secaoGravada: d ? `${d.carga.municipio}/${d.carga.zona}/${d.carga.secao}` : null,
      relogio: d ? iso(d.carga.relogio) : null, ok: d ? !!d.carga.ok : null, votos: d ? d.votos : null, errosNaSessao: d?.erros ?? null, geraBuDe: noBu };
  });
  resultado.cargaNoDia[`${t}t`] = { buComCargaNoDia: doBu.length, relogio: conferirRelogio(doBu.map((x) => x.k), t), bu: doBu, sessoesNoDia: det.length, sessoes: det };
  for (const x of doBu) casos.push({ teste: `carga no dia ${t}t`, k: x.k, detalhe: `${x.tipo} carga ${x.carga} abertura ${x.abertura} comparecimento ${x.comp}` });
}

// Carga do BU sem a linha final "Urna carregada com sucesso" no diário (2º turno: varredura de todos os diários)
{
  const o = { sessoesQueGeramBu: 0, semLinhaDeSucesso: 0, porUf: {}, casos: [] };
  const buPorCodigo = new Map([...bu[2]].map(([k, b]) => [`${b.urna}|${b.codigo}`, k]));
  for await (const s of jsonl(path.join(SAIDA, 'h23-sessoes-2t.jsonl'))) {
    const k = buPorCodigo.get(`${s.urna}|${s.codigo}`);
    if (!k) continue;
    o.sessoesQueGeramBu++;
    if (!s.ok) { o.semLinhaDeSucesso++; conta(o.porUf, k.slice(0, 2)); if (o.casos.length < 70) o.casos.push({ k, urna: s.urna, quando: s.quando }); }
  }
  resultado.cargaSemLinhaDeSucesso2t = o;
}

// Carga feita no dia da votação do 1º turno que só gerou BU no 2º turno (reserva carregada durante a votação de 04/10,
// guardada e usada no 2º turno; parecer cético 39)
{
  const cod1t = new Set([...bu[1].values()].map((b) => `${b.urna}|${b.codigo}`));
  resultado.cargaNoDia.cargaDe0410SoNoBuDo2t = [...bu[2]].filter(([, b]) => b.carga?.startsWith(DIAS[1]) && !cod1t.has(`${b.urna}|${b.codigo}`))
    .map(([k, b]) => ({ k, tipo: b.tipo, urna: b.urna, carga: b.carga, relogio: relogio.get(`${b.urna}|${b.codigo}`) ?? null }));
}

// ---------------------------------------------------------------- 3. Fora do bloco da zona (1º turno)
const Z = new Map();
for (const [k, b] of bu[1]) {
  if (!b.carga) continue;
  const z = `${b.uf}/${b.zona}`;
  const o = Z.get(z) ?? { dias: new Map(), ks: [] };
  const d = b.carga.slice(0, 10);
  o.dias.set(d, (o.dias.get(d) ?? 0) + 1);
  o.ks.push([k, b]);
  Z.set(z, o);
}
const fora = { 1: new Set(), 2: new Set(), 3: new Set() };
const madrugada = new Set();
for (const o of Z.values()) {
  const cer = [...o.dias].filter(([, n]) => n >= 3).map(([d]) => Date.parse(d));
  for (const [k, b] of o.ks) {
    const d = b.carga.slice(0, 10);
    const h = Number(b.carga.slice(11, 13));
    if (h < 6) madrugada.add(k);
    if (o.dias.get(d) > 2) continue;
    const dist = cer.length ? Math.min(...cer.map((c) => Math.abs(c - Date.parse(d)) / 864e5)) : Infinity;
    for (const lim of [1, 2, 3]) if (dist >= lim) fora[lim].add(k);
  }
}
const tipoDe = (ks) => { const o = {}; for (const k of ks) conta(o, bu[1].get(k).tipo); return o; };
resultado.foraDoBloco = {
  porMotivoDaRecarga: (() => { const o = {}; for (const k of fora[2]) { const b = bu[1].get(k); const r = novaPorCodigo[1].get(`${b.urna}|${b.codigo}`); conta(o, r ? r.motivo : 'primeira carga da urna'); } return o; })(),
  madrugadaPorZona: (() => { const o = {}; for (const k of madrugada) { const b = bu[1].get(k); conta(o, `${b.uf}/${b.zona} ${b.carga.slice(0, 10)}`); } return o; })(),
  zonas: Z.size, zonasSemDiaDeCerimonia: [...Z.values()].filter((o) => ![...o.dias.values()].some((n) => n >= 3)).length,
  fora1dia: fora[1].size, fora2dias: fora[2].size, fora3dias: fora[3].size, fora2diasPorTipo: tipoDe(fora[2]),
  madrugada: madrugada.size, madrugadaPorTipo: tipoDe(madrugada), foraEMadrugada: [...fora[2]].filter((k) => madrugada.has(k)).length,
  // a mesma carga do 1º turno gerou o BU do 2º turno?
  relogioFora2dias: conferirRelogio(fora[2], 1),
  relogioMadrugada: conferirRelogio(madrugada, 1),
  fora2diasMesmaCargaNo2t: [...fora[2]].filter((k) => bu[2].get(k)?.codigo === bu[1].get(k).codigo).length,
};

// ---------------------------------------------------------------- 4. Conjunção e votos
const conj = {
  semMotivo1t_e_fora: [...marcadas.semMotivo1t].filter((k) => fora[2].has(k)).length,
  semMotivo1t_e_madrugada: [...marcadas.semMotivo1t].filter((k) => madrugada.has(k)).length,
  semMotivo2t_e_cargaNoDia: [...marcadas.semMotivo2t].filter((k) => bu[2].get(k).carga?.startsWith(DIAS[2])).length,
};
resultado.conjuncao = conj;
// Seções que votaram em cédula no 1º turno (BU do 1º turno com comparecimento 0 e do 2º > 0): saem dos testes de voto
// (parecer cético 39; o tópico 11 já as deixa fora do universo).
const cedula1t = [...S.values()].filter((s) => s.t1.comp === 0 && s.t2.comp > 0).map((s) => s.k);
for (const k of cedula1t) for (const set of Object.values(marcadas)) set.delete(k);
resultado.recargas.recarga2tPorPeriodo = recarga2tPorPeriodo;
resultado.excluidasDosTestesDeVoto = cedula1t;
for (const k of cedula1t) S.delete(k);
const testes = {
  'recarga sem motivo entre os turnos (BU do 2º turno)': { set: marcadas.semMotivo2t, modos: [['variacao', 'zona'], ['t2', 'local']] },
  'qualquer recarga entre os turnos (BU do 2º turno)': { set: marcadas.recarga2t, modos: [['variacao', 'zona'], ['t1', 'local'], ['t2', 'local']] },
  'recarga sem motivo antes do 1º turno (BU do 1º turno)': { set: marcadas.semMotivo1t, modos: [['t1', 'local'], ['t2', 'local']] },
  'carga fora do bloco da zona, 1º turno (≥ 2 dias)': { set: fora[2], modos: [['t1', 'local'], ['t2', 'local'], ['variacao', 'zona']] },
  'carga de madrugada, 1º turno': { set: madrugada, modos: [['t1', 'local'], ['variacao', 'zona']] },
};
for (const [nome, { set, modos }] of Object.entries(testes)) {
  const o = { secoes: set.size, somas: somar(S, [...set]), testes: {} };
  for (const [modo, grupo] of modos) {
    for (const medida of ['comparecimento', 'parcela13', 'brancosNulos']) {
      const r = testeZona(S, set, medida, { modo, grupo });
      o.testes[`${modo}/${grupo}/${medida}`] = { n: r.n, grupos: r.grupos, efeitoPp: +r.efeito.toFixed(3), p: +r.p.toFixed(4), faixaDoAcaso95: r.nulo95.map((x) => +x.toFixed(3)) };
    }
  }
  resultado.votos[nome] = o;
  console.log(`\n${nome}: ${set.size} seções`);
  console.table(o.testes);
}
for (const t of [1, 2]) for (const k of marcadas[`semMotivo${t}t`]) {
  const r = novaPorCodigo[t].get(`${bu[t].get(k).urna}|${bu[t].get(k).codigo}`);
  casos.push({ teste: `recarga sem motivo ${t}t`, k, detalhe: `urna ${r.urna} anterior ${r.anterior.quando} → nova ${r.nova.quando} (${r.periodo}); apps antes: ${Object.keys(r.anterior.apps).join('+') || 'só carga'}` });
}
for (const k of fora[2]) casos.push({ teste: 'fora do bloco 1t (≥2 dias)', k, detalhe: `${bu[1].get(k).tipo} carga ${bu[1].get(k).carga}` });

// Caso a caso: seções com carga no dia e seções com recarga sem motivo no 2º turno, contra a própria zona
const zonaMedia = new Map();
for (const s of S.values()) {
  const z = zonaMedia.get(`${s.uf}/${s.zona}`) ?? { t1: { aptos: 0, comp: 0, v13: 0, v22: 0 }, t2: { aptos: 0, comp: 0, v13: 0, v22: 0 } };
  for (const t of ['t1', 't2']) for (const c of ['aptos', 'comp', 'v13', 'v22']) z[t][c] += s[t][c];
  zonaMedia.set(`${s.uf}/${s.zona}`, z);
}
const pct = (a, b) => (b ? +((100 * a) / b).toFixed(2) : null);
const linhaCaso = (k) => {
  const s = S.get(k); if (!s) return { k, semBuNosDoisTurnos: true };
  const z = zonaMedia.get(`${s.uf}/${s.zona}`);
  const o = { k };
  for (const t of ['t1', 't2']) {
    o[`comp${t}`] = pct(s[t].comp, s[t].aptos); o[`zonaComp${t}`] = pct(z[t].comp, z[t].aptos);
    o[`p13${t}`] = pct(s[t].v13, s[t].v13 + s[t].v22); o[`zonaP13${t}`] = pct(z[t].v13, z[t].v13 + z[t].v22);
  }
  o.dP13MenosZona = +((o.p13t2 - o.p13t1) - (o.zonaP13t2 - o.zonaP13t1)).toFixed(2);
  o.dCompMenosZona = +((o.compt2 - o.compt1) - (o.zonaCompt2 - o.zonaCompt1)).toFixed(2);
  return o;
};
resultado.casoACaso = {
  cargaNoDia1t: resultado.cargaNoDia['1t'].bu.map((x) => linhaCaso(x.k)),
  cargaNoDia2t: resultado.cargaNoDia['2t'].bu.map((x) => linhaCaso(x.k)),
  semMotivo2t: [...marcadas.semMotivo2t].map(linhaCaso),
};
console.log('caso a caso'); for (const [n, l] of Object.entries(resultado.casoACaso)) { console.log(n); console.table(l); }

const nTestes = Object.values(resultado.votos).reduce((a, o) => a + Object.keys(o.testes).length, 0);
resultado.correcao = { testes: nTestes, limiarBonferroni: 0.05 / nTestes, abaixoDoLimiar: Object.entries(resultado.votos).flatMap(([n, o]) => Object.entries(o.testes).filter(([, r]) => r.p < 0.05 / nTestes).map(([c, r]) => ({ conjunto: n, teste: c, ...r }))) };
console.log('correção para', nTestes, 'testes:', resultado.correcao);
await writeFile(path.join(SAIDA, 'h23-resultado.json'), JSON.stringify({ ...resultado, paresSemMotivo: Object.fromEntries([1, 2].map((t) => [`${t}t`, [...pares[t].values()].filter((r) => r.motivo === 'semMotivo')])) }, null, 1));
await writeFile(path.join(SAIDA, 'h23-casos.csv'), `teste;secao;detalhe\n${casos.map((c) => `${c.teste};${c.k};${c.detalhe}`).join('\n')}\n`);
console.log(JSON.stringify({ recargas: resultado.recargas, cargaNoDia: Object.fromEntries(Object.entries(resultado.cargaNoDia).map(([t, v]) => [t, { bu: v.bu, sessoes: v.sessoes }])), foraDoBloco: resultado.foraDoBloco, conjuncao: conj }, null, 1));
