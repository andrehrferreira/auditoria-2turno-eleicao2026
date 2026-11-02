// Matemático forense, fechamento da H23 (recarga e carga fora da cerimônia), só com dados públicos.
//
// (a) Comparecimento das seções cujo BU do 2º turno veio de recarga entre os turnos, sem as 2 seções de MG que votaram
//     em cédula no 1º turno (comparecimento 0 no BU do 1º turno). Conta determinística, sem teste novo:
//     efeito = Σ (taxa da seção − taxa da zona sem nenhuma recarga) × aptos / Σ aptos, em pontos, no 1º turno, no 2º e
//     na variação (mesma fórmula do parecer cético 39), e o mesmo em eleitores (efeito × aptos). Grupos pelo que o 1º
//     turno registrou: BU do 1º turno de reserva (troca no dia), reinício ou 2+ diários, nada disso.
// (b) Diários do 2º turno cuja carga gerou o BU e não têm a linha final "Urna carregada com sucesso" (catálogo do doc 08):
//     contagem, UF, cruzamento com as outras marcas da H23, e votos (variação da parcela do 13 e do comparecimento
//     contra a zona, ponderada; descrição, sem teste).
// (c) Recargas do 1º turno sem motivo escrito no diário (regra do doc 08): quantas, onde (UF, zona, mesmo dia, o que a
//     urna fez antes), quantas geraram o BU do 1º turno, se a mesma carga gerou também o BU do 2º turno, e os votos
//     (nível e variação contra a zona/local, descrição; os testes de permutação já feitos no doc 08 são citados).
// Entradas: h23-resultado.json (doc 08), 39-h23.json e 39-h23-comparecimento.json (parecer 39), cópia de leitura.
// Uso: node --max-old-space-size=6000 scripts/auditoria/matematico-fechamento-h23.mjs
// Saída: data/parsed/auditoria/matematico-forense/fechamento/h23.json
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { carregarSecoes } from './matematico-h23-lib.mjs';

const DIR = path.join(DIR_DADOS, 'parsed', 'auditoria');
const SAIDA = path.join(DIR, 'matematico-forense', 'fechamento');
const h23 = JSON.parse(await readFile(path.join(DIR, 'matematico-forense', 'h23-resultado.json'), 'utf8'));
const c39 = JSON.parse(await readFile(path.join(DIR, 'cetico-revisor', '39-h23.json'), 'utf8'));
const { db, fonte } = await abrirLeitura();
const S = carregarSecoes(db);
const perfil = new Map();
for (const r of db.prepare(`SELECT p.turno, p.uf, p.municipio, p.zona, p.secao, p.reinicios_durante_votacao rein, p.logs_no_pacote logs FROM perfil_log p
  JOIN secao s ON s.turno = p.turno AND s.uf = p.uf AND s.municipio = p.municipio AND s.zona = p.zona AND s.secao = p.secao AND s.hash = p.hash WHERE p.turno = 1`).iterate()) {
  perfil.set(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, r);
}
db.close();
const inc = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };
const R = { fonte: path.basename(fonte) };

// zona → seções (para a referência "mesma zona")
const Z = new Map();
for (const s of S.values()) (Z.get(`${s.uf}/${s.zona}`) ?? Z.set(`${s.uf}/${s.zona}`, []).get(`${s.uf}/${s.zona}`)).push(s);
const taxa = { t1: (s) => s.t1.comp / s.t1.aptos, t2: (s) => s.t2.comp / s.t2.aptos, variacao: (s) => s.t2.comp / s.t2.aptos - s.t1.comp / s.t1.aptos };
const pesoC = { t1: (s) => s.t1.aptos, t2: (s) => s.t2.aptos, variacao: (s) => Math.min(s.t1.aptos, s.t2.aptos) };
const p13 = (t) => (t.v13 + t.v22 ? t.v13 / (t.v13 + t.v22) : null);
/** Efeito no comparecimento (pontos e eleitores) das marcadas contra a zona sem nenhuma seção de `excluir`. */
function efeitoComp(marc, excluir, medida) {
  let num = 0; let den = 0; let n = 0;
  for (const l of Z.values()) {
    const m = l.filter((s) => marc.has(s.k) && s.t1.aptos && s.t2.aptos);
    const o = l.filter((s) => !excluir.has(s.k) && s.t1.aptos && s.t2.aptos);
    if (!m.length || !o.length) continue;
    const ref = o.reduce((a, s) => a + taxa[medida](s) * pesoC[medida](s), 0) / o.reduce((a, s) => a + pesoC[medida](s), 0);
    for (const s of m) { num += (taxa[medida](s) - ref) * pesoC[medida](s); den += pesoC[medida](s); n++; }
  }
  return { secoes: n, efeitoPp: +((100 * num) / den).toFixed(3), eleitores: Math.round(num) };
}
/** Variação da parcela do 13 (13 ÷ 13+22) e do comparecimento, menos a da zona sem as marcadas; ponderada. */
function efeitoVotos(marc) {
  let n13 = 0; let d13 = 0; let nc = 0; let dc = 0; let n = 0;
  for (const l of Z.values()) {
    const m = l.filter((s) => marc.has(s.k));
    const o = l.filter((s) => !marc.has(s.k));
    if (!m.length || !o.length) continue;
    const z = (f) => o.reduce((a, s) => a + f(s), 0);
    const ref13 = z((s) => s.t2.v13) / z((s) => s.t2.v13 + s.t2.v22) - z((s) => s.t1.v13) / z((s) => s.t1.v13 + s.t1.v22);
    const refC = z((s) => s.t2.comp) / z((s) => s.t2.aptos) - z((s) => s.t1.comp) / z((s) => s.t1.aptos);
    for (const s of m) {
      n++;
      const a = p13(s.t1); const b = p13(s.t2);
      if (a !== null && b !== null) { const w = Math.min(s.t1.v13 + s.t1.v22, s.t2.v13 + s.t2.v22); n13 += (b - a - ref13) * w; d13 += w; }
      if (s.t1.aptos && s.t2.aptos) { const w = Math.min(s.t1.aptos, s.t2.aptos); nc += (s.t2.comp / s.t2.aptos - s.t1.comp / s.t1.aptos - refC) * w; dc += w; }
    }
  }
  return { secoes: n, dParcela13MenosZonaPp: +((100 * n13) / d13).toFixed(3), dComparecimentoMenosZonaPp: +((100 * nc) / dc).toFixed(3) };
}
const somas = (ks) => {
  const o = { secoes: 0, t1: { aptos: 0, comp: 0, v13: 0, v22: 0, bn: 0 }, t2: { aptos: 0, comp: 0, v13: 0, v22: 0, bn: 0 } };
  for (const k of ks) { const s = S.get(k); if (!s) continue; o.secoes++; for (const t of ['t1', 't2']) { o[t].aptos += s[t].aptos; o[t].comp += s[t].comp; o[t].v13 += s[t].v13; o[t].v22 += s[t].v22; o[t].bn += s[t].branco + s[t].nulo; } }
  return o;
};

// ------------------------------------------------------------------ (a)
const lista = c39['2t'].buRecargaEntreTurnosLista.map((x) => x.k);
const todas = new Set(lista.filter((k) => S.has(k)));
const cedula = new Set([...todas].filter((k) => S.get(k).t1.comp === 0));
const falha1t = (s) => {
  const p = perfil.get(s.k);
  return s.t1.tipo !== 'secao' ? 'reserva' : p && (p.rein > 0 || p.logs > 1) ? 'reinicio' : 'semFalha';
};
const sub = (f) => new Set([...todas].filter((k) => !cedula.has(k) && f(S.get(k))));
const grupos = {
  todas: todas,
  semCedula: sub(() => true),
  semCedulaReserva1t: sub((s) => falha1t(s) === 'reserva'),
  semCedulaReinicio1t: sub((s) => falha1t(s) === 'reinicio'),
  semCedulaSemFalha1t: sub((s) => falha1t(s) === 'semFalha'),
  semCedulaSemReserva1t: sub((s) => falha1t(s) !== 'reserva'),
};
R.a = { buRecargaEntreTurnos: lista.length, comBuNosDoisTurnos: todas.size, cedula1t: [...cedula], grupos: {} };
for (const [n, g] of Object.entries(grupos)) {
  R.a.grupos[n] = { secoes: g.size, t1: efeitoComp(g, todas, 't1'), t2: efeitoComp(g, todas, 't2'), variacao: efeitoComp(g, todas, 'variacao'), somas: somas(g) };
}

// ------------------------------------------------------------------ (b)
const semLinha = h23.cargaSemLinhaDeSucesso2t;
const kb = new Set(semLinha.casos.map((c) => c.k));
const marcas = {
  recargaEntreTurnos: todas, semMotivo2t: new Set(h23.casoACaso.semMotivo2t.map((x) => x.k)),
  cargaNoDia2t: new Set(h23.cargaNoDia['2t'].bu.map((x) => x.k)),
};
R.b = {
  sessoesQueGeramBu: semLinha.sessoesQueGeramBu, semLinhaFinal: semLinha.semLinhaDeSucesso, listadas: kb.size, porUf: semLinha.porUf,
  porMesDaCarga: semLinha.casos.reduce((o, c) => { inc(o, c.quando.slice(0, 7)); return o; }, {}),
  cruzamento: Object.fromEntries(Object.entries(marcas).map(([n, m]) => [n, [...kb].filter((k) => m.has(k))])),
  votos: efeitoVotos(new Set([...kb].filter((k) => S.has(k)))), somas: somas(kb),
};

// ------------------------------------------------------------------ (c)
const pares = h23.paresSemMotivo['1t'];
const porUf = {}; const porZona = {}; const porPeriodo = {}; const mesmoDia = { sim: 0, nao: 0 }; const antes = {};
for (const p of pares) {
  inc(porUf, p.k.slice(0, 2)); inc(porZona, `${p.k.split('/')[0]}/${p.anterior.zona}`); inc(porPeriodo, p.periodo);
  if (p.anterior.quando?.slice(0, 10) === p.nova.quando?.slice(0, 10)) mesmoDia.sim++; else mesmoDia.nao++;
  inc(antes, Object.keys(p.anterior.apps).sort().join('+') || 'só carga');
}
// BU do 1º turno gerado pela nova carga do par; a mesma carga (urna + código) gerou o BU do 2º turno?
const nova = new Set(pares.map((p) => `${p.urna}|${p.nova.codigo}`));
const bu1 = []; let mesmaCargaNo2t = 0; let mesmaUrnaNo2t = 0;
for (const s of S.values()) {
  const u = s.t1.urna === null ? null : String(s.t1.urna).padStart(8, '0');
  if (!nova.has(`${u}|${s.t1.codigo}`)) continue;
  bu1.push(s.k);
  if (s.t2.codigo === s.t1.codigo) mesmaCargaNo2t++;
  if (s.t2.urna === s.t1.urna) mesmaUrnaNo2t++;
}
const zonasOrdenadas = Object.entries(porZona).sort((a, b) => b[1] - a[1]);
// quantas seções com BU tem cada uma dessas zonas (para ver se a zona inteira foi recarregada)
const secoesZona = (z) => (Z.get(z) ?? []).length;
const marc1 = new Set(bu1.filter((k) => S.get(k).t1.comp > 0));
R.c = {
  pares: pares.length, porPeriodo, porUf: Object.fromEntries(Object.entries(porUf).sort((a, b) => b[1] - a[1])), mesmoDia, aplicacoesNaSessaoAnterior: antes,
  zonas: zonasOrdenadas.length, zonasCom5ouMais: zonasOrdenadas.filter(([, n]) => n >= 5).map(([z, n]) => ({ zona: z, recargasSemMotivo: n, secoesComBuNaZona: secoesZona(z) })),
  buDo1tGerado: bu1.length, mesmaCargaGerouBuDo2t: mesmaCargaNo2t, mesmaUrnaNo2t,
  votos: efeitoVotos(marc1), somas: somas(bu1),
  testesJaFeitosDoc08: h23.votos['recarga sem motivo antes do 1º turno (BU do 1º turno)'].testes,
};
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, 'h23.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify({ a: R.a, b: { ...R.b }, c: { ...R.c, zonasCom5ouMais: R.c.zonasCom5ouMais.slice(0, 15) } }, null, 1));
