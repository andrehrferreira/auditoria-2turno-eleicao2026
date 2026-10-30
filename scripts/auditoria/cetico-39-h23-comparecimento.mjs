// Cético, parecer 39 (H23): o comparecimento a mais nas seções com BU do 2º turno vindo de recarga entre os turnos é
// mesmo a queda do 1º turno por falha da urna? Testa a explicação em vez de supor:
//  - nível do comparecimento em cada turno contra a própria zona (sem as marcadas), e a variação;
//  - o mesmo, separado pelo que o 1º turno registrou: BU do 1º turno vindo de reserva (troca no dia 04/10), ou
//    reinício durante a votação / mais de um diário no pacote do 1º turno (falha no dia), ou nada disso;
//  - e separado pelo motivo da recarga (cetico-39-h23.mjs).
// Efeito = Σ (taxa da seção − taxa da zona sem marcadas) × aptos / Σ aptos, em pontos; faixa do acaso por sorteio
// dentro da zona (1.000 sorteios), mesma estatística.
// Uso: node scripts/auditoria/cetico-39-h23-comparecimento.mjs → data/parsed/auditoria/cetico-revisor/39-h23-comparecimento.json
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { abrirLeitura } from '../../src/banco-leitura.js';

const DIR = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor');
const h23 = JSON.parse(await readFile(path.join(DIR, '39-h23.json'), 'utf8'));
const M = new Map(h23['2t'].buRecargaEntreTurnosLista.map((x) => [x.k, x.motivo]));
const { db, fonte } = await abrirLeitura();
const S = new Map();
const FED = { 1: 6257, 2: 6258 };
for (const t of [1, 2]) {
  for (const r of db.prepare(`SELECT s.uf, s.municipio, s.zona, s.secao, s.comparecimento comp, s.tipo_urna tipo, e.aptos, p.reinicios_durante_votacao rein, p.logs_no_pacote logs
    FROM secao s JOIN secao_eleicao e ON e.turno = s.turno AND e.uf = s.uf AND e.municipio = s.municipio AND e.zona = s.zona AND e.secao = s.secao AND e.eleicao = ?
    LEFT JOIN perfil_log p ON p.turno = s.turno AND p.uf = s.uf AND p.municipio = s.municipio AND p.zona = s.zona AND p.secao = s.secao AND p.hash = s.hash
    WHERE s.turno = ? AND s.situacao = 'completa'`).iterate(FED[t], t)) {
    const k = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
    const o = S.get(k) ?? { k, z: `${r.uf}/${r.zona}` };
    o[`t${t}`] = r;
    S.set(k, o);
  }
}
db.close();
for (const [k, s] of S) if (!s.t1 || !s.t2 || !s.t1.aptos || !s.t2.aptos) S.delete(k);
const falha1t = (s) => (s.t1.tipo !== 'secao' ? 'reserva no 1º turno' : (s.t1.rein > 0 || s.t1.logs > 1) ? 'reinício ou 2+ diários no 1º turno' : 'sem falha registrada no 1º turno');
const Z = new Map();
for (const s of S.values()) (Z.get(s.z) ?? Z.set(s.z, []).get(s.z)).push(s);
const val = { t1: (s) => s.t1.comp / s.t1.aptos, t2: (s) => s.t2.comp / s.t2.aptos, variacao: (s) => s.t2.comp / s.t2.aptos - s.t1.comp / s.t1.aptos };
const peso = { t1: (s) => s.t1.aptos, t2: (s) => s.t2.aptos, variacao: (s) => Math.min(s.t1.aptos, s.t2.aptos) };
function efeito(marc, medida) {
  let num = 0; let den = 0; let n = 0;
  const grupos = [];
  for (const l of Z.values()) {
    const m = l.filter((s) => marc.has(s.k)); const o = l.filter((s) => !M.has(s.k)); // referência: zona sem NENHUMA recarga
    if (!m.length || !o.length) continue;
    const ref = o.reduce((a, s) => a + val[medida](s) * peso[medida](s), 0) / o.reduce((a, s) => a + peso[medida](s), 0);
    for (const s of m) { num += (val[medida](s) - ref) * peso[medida](s); den += peso[medida](s); n++; }
    const l2 = [...m, ...o]; const v = l2.map((s) => val[medida](s)); const w = l2.map((s) => peso[medida](s));
    grupos.push({ v, w, k: m.length, svw: v.reduce((a, x, i) => a + x * w[i], 0), sw: w.reduce((a, x) => a + x, 0) });
  }
  const obs = (100 * num) / den;
  // sorteio dentro da zona entre marcadas + referência
  let x = 20261030; const rnd = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  const sims = [];
  for (let b = 0; b < 1000; b++) {
    let nu = 0; let de = 0;
    for (const g of grupos) {
      const idx = new Set(); while (idx.size < g.k) idx.add(Math.floor(rnd() * g.v.length));
      let mvw = 0; let mw = 0; for (const i of idx) { mvw += g.v[i] * g.w[i]; mw += g.w[i]; }
      const ref = (g.svw - mvw) / (g.sw - mw);
      nu += mvw - ref * mw; de += mw;
    }
    sims.push((100 * nu) / de);
  }
  sims.sort((a, b) => a - b);
  const p = (sims.filter((v) => Math.abs(v) >= Math.abs(obs)).length + 1) / 1001;
  return { n, efeitoPp: +obs.toFixed(3), faixa95: [+sims[25].toFixed(3), +sims[974].toFixed(3)], p: +p.toFixed(4) };
}
const R = { fonte, marcadas: M.size, comBuNosDoisTurnos: [...M.keys()].filter((k) => S.has(k)).length, grupos: {} };
const sub = (f) => new Set([...M.keys()].filter((k) => S.has(k) && f(S.get(k), M.get(k))));
const conjuntos = {
  todas: sub(() => true),
  // as 2 seções de MG que votaram em cédula no 1º turno têm comparecimento 0 no BU do 1º turno
  'todas sem as 2 com 1º turno em cédula (comparecimento 0 no BU)': sub((s) => s.t1.comp > 0),
  '1º turno: reserva no 1º turno, sem as 2 em cédula': sub((s) => s.t1.comp > 0 && falha1t(s) === 'reserva no 1º turno'),
  ...Object.fromEntries(['reserva no 1º turno', 'reinício ou 2+ diários no 1º turno', 'sem falha registrada no 1º turno'].map((f) => [`1º turno: ${f}`, sub((s) => falha1t(s) === f)])),
  ...Object.fromEntries(['reserva', 'erro', 'paraReserva', 'votou', 'outraSecao', 'semMotivo', 'novaMidia'].map((m) => [`motivo: ${m}`, sub((s, mm) => mm === m)])),
};
for (const [nome, set] of Object.entries(conjuntos)) {
  if (!set.size) continue;
  R.grupos[nome] = { secoes: set.size, t1: efeito(set, 't1'), t2: efeito(set, 't2'), variacao: efeito(set, 'variacao') };
  console.log(nome, JSON.stringify(R.grupos[nome]));
}
await writeFile(path.join(DIR, '39-h23-comparecimento.json'), JSON.stringify(R, null, 1));
