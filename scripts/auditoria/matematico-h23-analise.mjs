// Matemático forense, H23, passo 3: recargas, carga no dia da votação, carga fora do bloco da zona e junção com os votos.
// Entradas: h23-sessoes-<t>t.jsonl e h23-relidos.jsonl (passos 1 e 2) e a cópia de leitura do banco.
//
// Definições (escritas antes de olhar os votos):
//  - Sessão de carga: um logd.dat com uma carga SCUE (urna + código de carga).
//  - Recarga: dentro do mesmo pacote, a mesma urna com 2+ sessões. A sessão mais funda (diário aninhado) é a mais antiga:
//    ao ser recarregada, a urna guarda o diário anterior dentro do novo. Cada par (anterior → nova) é uma recarga.
//    Período da recarga = data digitada da nova carga (antes do 1º turno: até 04/10; entre os turnos: 05/10 a 24/10;
//    dia do 2º turno: 25/10). No catálogo do 2º turno só contam as recargas com nova carga a partir de 05/10 (as
//    anteriores já estão no catálogo do 1º turno).
//  - Motivo visível, nesta ordem (o primeiro que valer):
//      falhou       a carga anterior não terminou com "Urna carregada com sucesso";
//      erro         a sessão anterior tem linha ERRO;
//      reserva      a carga anterior era de urna de contingência (seção 0000) e a nova é de seção (reuso da reserva:
//                   o motivo está na urna que ela substitui);
//      paraReserva  a nova carga é de contingência (seção 0000);
//      outraSecao   a carga anterior era para outra seção, zona ou município;
//      votou        a sessão anterior registrou votos (urna do 1º turno recarregada para o 2º);
//      semMotivo    mesma seção, sem ERRO, carga anterior bem-sucedida, sem votos: nenhum motivo no diário  ← H23
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
const pares = { 1: new Map(), 2: new Map() };
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
    l.sort((a, b) => b.prof - a.prof); // mais fundo = mais antigo
    for (let i = 1; i < l.length; i++) {
      const a = l[i - 1]; const b = l[i];
      if (a.carga.codigo === b.carga.codigo) continue;
      const id = `${u}|${a.carga.codigo}|${b.carga.codigo}`;
      if (pares[p.turno].has(id)) continue;
      const quando = iso(b.carga.digitada);
      if (p.turno === 2 && quando && quando < '2026-10-05') continue;
      const votosAnt = Object.values(a.votos).reduce((x, y) => x + y, 0);
      const motivo = !a.carga.ok ? 'falhou' : a.erros > 0 ? 'erro' : a.carga.secao === '0000' && b.carga.secao !== '0000' ? 'reserva'
        : b.carga.secao === '0000' ? 'paraReserva' : !mesmaSecao(a.carga, b.carga) ? 'outraSecao' : votosAnt > 0 ? 'votou' : 'semMotivo';
      pares[p.turno].set(id, { turno: p.turno, k: p.k, urna: u, anterior: { codigo: a.carga.codigo, quando: iso(a.carga.digitada), secao: a.carga.secao, zona: a.carga.zona,
        municipio: a.carga.municipio, ok: !!a.carga.ok, erros: a.erros, errosMsg: a.errosMsg, apps: a.apps, votos: votosAnt, ultimas: a.ultimas, nome: a.nome },
        nova: { codigo: b.carga.codigo, quando, relogio: iso(b.carga.relogio), secao: b.carga.secao, zona: b.carga.zona, municipio: b.carga.municipio, ok: !!b.carga.ok },
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
  resultado.recargas[`${t}t`] = { pares: pares[t].size, porPeriodoEMotivo: tab, semMotivo: semM.length, semMotivoAplicacoesNaSessaoAnterior: antesApps,
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
const buPorMotivo = { 1: {}, 2: {} };
for (const t of [1, 2]) {
  for (const [k, b] of bu[t]) {
    const r = novaPorCodigo[t].get(`${b.urna}|${b.codigo}`);
    if (!r) continue;
    conta(buPorMotivo[t], `${r.periodo} · ${r.motivo}`);
    if (r.motivo === 'semMotivo') marcadas[`semMotivo${t}t`].add(k);
    if (t === 2) marcadas.recarga2t.add(k);
  }
}
resultado.recargas.buGeradoPorCargaRecarregada = buPorMotivo;

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
  resultado.cargaNoDia[`${t}t`] = { buComCargaNoDia: doBu.length, bu: doBu, sessoesNoDia: det.length, sessoes: det };
  for (const x of doBu) casos.push({ teste: `carga no dia ${t}t`, k: x.k, detalhe: `${x.tipo} carga ${x.carga} abertura ${x.abertura} comparecimento ${x.comp}` });
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
  zonas: Z.size, zonasSemDiaDeCerimonia: [...Z.values()].filter((o) => ![...o.dias.values()].some((n) => n >= 3)).length,
  fora1dia: fora[1].size, fora2dias: fora[2].size, fora3dias: fora[3].size, fora2diasPorTipo: tipoDe(fora[2]),
  madrugada: madrugada.size, madrugadaPorTipo: tipoDe(madrugada), foraEMadrugada: [...fora[2]].filter((k) => madrugada.has(k)).length,
  // a mesma carga do 1º turno gerou o BU do 2º turno?
  fora2diasMesmaCargaNo2t: [...fora[2]].filter((k) => bu[2].get(k)?.codigo === bu[1].get(k).codigo).length,
};

// ---------------------------------------------------------------- 4. Conjunção e votos
const conj = {
  semMotivo1t_e_fora: [...marcadas.semMotivo1t].filter((k) => fora[2].has(k)).length,
  semMotivo1t_e_madrugada: [...marcadas.semMotivo1t].filter((k) => madrugada.has(k)).length,
  semMotivo2t_e_cargaNoDia: [...marcadas.semMotivo2t].filter((k) => bu[2].get(k).carga?.startsWith(DIAS[2])).length,
};
resultado.conjuncao = conj;
const testes = {
  'recarga sem motivo entre os turnos (BU do 2º turno)': { set: marcadas.semMotivo2t, modos: [['variacao', 'zona'], ['t2', 'local']] },
  'qualquer recarga entre os turnos (BU do 2º turno)': { set: marcadas.recarga2t, modos: [['variacao', 'zona']] },
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

await writeFile(path.join(SAIDA, 'h23-resultado.json'), JSON.stringify({ ...resultado, paresSemMotivo: Object.fromEntries([1, 2].map((t) => [`${t}t`, [...pares[t].values()].filter((r) => r.motivo === 'semMotivo')])) }, null, 1));
await writeFile(path.join(SAIDA, 'h23-casos.csv'), `teste;secao;detalhe\n${casos.map((c) => `${c.teste};${c.k};${c.detalhe}`).join('\n')}\n`);
console.log(JSON.stringify({ recargas: resultado.recargas, cargaNoDia: Object.fromEntries(Object.entries(resultado.cargaNoDia).map(([t, v]) => [t, { bu: v.bu, sessoes: v.sessoes }])), foraDoBloco: resultado.foraDoBloco, conjuncao: conj }, null, 1));
