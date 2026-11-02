// Parecer cético 55, H23 (a): reprodução independente do efeito no comparecimento das seções cujo BU do 2º turno saiu
// de recarga entre os turnos (doc 14: +0,228 ponto com todas; +0,101 sem as 2 seções de cédula de MG).
// Lista das seções: h23-bu-recarga-entre-turnos.json (cetico-55-h23-recargas.mjs --turno 2, lido do bruto).
// Efeito = Σ (taxa da seção − taxa da zona sem nenhuma seção da lista) × peso ÷ Σ peso, em pontos; em eleitores, a soma
// sem dividir. Taxa = comparecimento ÷ aptos de Presidente; variação = taxa 2º − taxa 1º, peso min(aptos 1º, aptos 2º).
// Sensibilidade (acrescentada): (i) todas as seções com BU do 2º turno de carga feita entre 05/10 e 24/10 (recarga ou
// carga nova); (ii) referência = mesmo local de votação em vez da zona.
// Uso: node scripts/auditoria/cetico-55-h23-comparecimento.mjs
// Saída: data/parsed/auditoria/cetico-revisor/55/h23-comparecimento.json
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

const DIR = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '55');
const lista = new Set(JSON.parse(await readFile(path.join(DIR, 'h23-bu-recarga-entre-turnos.json'), 'utf8')));
const { db } = await abrirLeitura();
const S = new Map();
for (const r of db.prepare(`SELECT a.uf, a.municipio, a.zona, a.secao, a.aptos a1, a.comparecimento_majoritario c1, b.aptos a2, b.comparecimento_majoritario c2,
    s1.tipo_urna tipo1, s2.local local2, s2.data_hora_carga carga2
  FROM secao_eleicao a JOIN secao_eleicao b ON b.turno = 2 AND b.eleicao = 6258 AND b.uf = a.uf AND b.municipio = a.municipio AND b.zona = a.zona AND b.secao = a.secao
  JOIN secao s1 ON s1.turno = 1 AND s1.uf = a.uf AND s1.municipio = a.municipio AND s1.zona = a.zona AND s1.secao = a.secao
  JOIN secao s2 ON s2.turno = 2 AND s2.uf = a.uf AND s2.municipio = a.municipio AND s2.zona = a.zona AND s2.secao = a.secao
  WHERE a.turno = 1 AND a.eleicao = 6257`).iterate()) {
  S.set(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, r);
}
db.close();
const k = (r) => `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
const medidas = {
  t1: [(s) => s.c1 / s.a1, (s) => s.a1],
  t2: [(s) => s.c2 / s.a2, (s) => s.a2],
  variacao: [(s) => s.c2 / s.a2 - s.c1 / s.a1, (s) => Math.min(s.a1, s.a2)],
};
function efeito(marc, excluir, grupoDe) {
  const G = new Map();
  for (const s of S.values()) if (s.a1 && s.a2) (G.get(grupoDe(s)) ?? G.set(grupoDe(s), []).get(grupoDe(s))).push(s);
  const out = {};
  for (const [nome, [f, w]] of Object.entries(medidas)) {
    let num = 0, den = 0, n = 0;
    for (const l of G.values()) {
      const m = l.filter((s) => marc.has(k(s)));
      const o = l.filter((s) => !excluir.has(k(s)));
      if (!m.length || !o.length) continue;
      const ref = o.reduce((a, s) => a + f(s) * w(s), 0) / o.reduce((a, s) => a + w(s), 0);
      for (const s of m) { num += (f(s) - ref) * w(s); den += w(s); n++; }
    }
    out[nome] = { secoes: n, pontos: +(100 * num / den).toFixed(3), eleitores: Math.round(num) };
  }
  return out;
}
const zona = (s) => `${s.uf}/${s.zona}`;
const local = (s) => `${s.uf}/${s.municipio}/${s.local2}`;
const todas = new Set([...lista].filter((x) => S.has(x)));
const cedula = new Set([...todas].filter((x) => S.get(x).c1 === 0));
const sem = new Set([...todas].filter((x) => !cedula.has(x)));
const semReserva = new Set([...sem].filter((x) => S.get(x).tipo1 === 'secao'));
const reserva = new Set([...sem].filter((x) => S.get(x).tipo1 !== 'secao'));
const cargaEntre = new Set([...S.values()].filter((s) => s.carga2 >= '2026-10-05' && s.carga2 < '2026-10-25' && s.c1 > 0).map(k));
const R = {
  listaRecargaEntreTurnos: lista.size, comBuNosDoisTurnos: todas.size, cedula: [...cedula],
  todas: efeito(todas, todas, zona), semCedula: efeito(sem, todas, zona), semCedulaReserva1t: efeito(reserva, todas, zona), semCedulaSemReserva1t: efeito(semReserva, todas, zona),
  sensibilidade: {
    semCedulaRefLocal: efeito(sem, todas, local),
    cargaEntreTurnosQualquer: { secoes: cargaEntre.size, ...efeito(cargaEntre, new Set([...cargaEntre, ...todas]), zona) },
  },
};
await writeFile(path.join(DIR, 'h23-comparecimento.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
