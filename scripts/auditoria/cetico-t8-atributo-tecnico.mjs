// Revisão cética do tópico 8, item "modelo da urna / dia da carga". Reproduz scripts/virada-por-atributo-tecnico.mjs
// com o universo completo (28 UFs), troca o gerador aleatório do autor (LCG em ponto flutuante, que entra em ciclo de
// ~10 mil valores) por mulberry32, e acrescenta: (1) comparação dentro do LOCAL de votação, que controla a geografia
// abaixo do município; (2) permutação em bloco por local; (3) poder contra troca ligada a um modelo.
// Entrada: data/parsed/auditoria/cetico/t8-secoes.jsonl (cetico-t8-extrair.mjs) + tabela secao do banco (local, 2º turno).
// Uso: node --max-old-space-size=8192 scripts/auditoria/cetico-t8-atributo-tecnico.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { abrirLeitura } from '../../src/banco-leitura.js';

const ARQ = fileURLToPath(new URL('../../data/parsed/auditoria/cetico/t8-secoes.jsonl', import.meta.url));
const { db } = await abrirLeitura();
const local = new Map();
for (const r of db.prepare('select uf, municipio, zona, secao, local from secao where turno = 2').iterate()) local.set(`${r.uf}/${Number(r.municipio)}/${Number(r.zona)}/${Number(r.secao)}`, r.local);

function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261029);

const secoes = [];
let semLocal = 0;
for (const l of readFileSync(ARQ, 'utf8').split('\n')) {
  if (!l) continue;
  const s = JSON.parse(l);
  const { a, b } = s;
  // mesmos filtros do autor: sem Sistema de Apuração, sem urna de reserva no 2T, mesmo modelo nos dois turnos, ≥ 30 votantes
  if (a.tipo === 3 || b.tipo === 3 || b.tipo === 4 || a.modelo !== b.modelo || b.comp < 30) continue;
  const loc = local.get(`${s.uf}/${s.mun}/${s.zona}/${s.secao}`);
  if (loc == null) semLocal++;
  secoes.push({ mun: `${s.uf}/${s.mun}`, loc: `${s.uf}/${s.mun}/${s.zona}/${loc}`, modelo: b.modelo ?? '?', carga: (b.carga ?? '').slice(0, 8), x: (b.l - a.l - (b.f - a.f)) / b.comp, peso: b.comp, f2: b.f, comp: b.comp });
}
console.log(`${secoes.length} seções (filtros do autor); sem local no banco: ${semLocal}`);

function desvio(lista, attr, grupo) {
  const G = new Map();
  for (const s of lista) {
    if (!G.has(s[grupo])) G.set(s[grupo], []);
    G.get(s[grupo]).push(s);
  }
  const acc = {};
  for (const g of G.values()) {
    if (new Set(g.map((s) => s[attr])).size < 2) continue;
    const m = g.reduce((t, s) => t + s.x * s.peso, 0) / g.reduce((t, s) => t + s.peso, 0);
    for (const s of g) {
      const o = (acc[s[attr]] ??= { n: 0, peso: 0, soma: 0 });
      o.n++; o.peso += s.peso; o.soma += (s.x - m) * s.peso;
    }
  }
  return Object.fromEntries(Object.entries(acc).map(([k, o]) => [k, { n: o.n, pp: (100 * o.soma) / o.peso }]));
}
function permutar(lista, attr, grupo, bloco) {
  // embaralha o atributo dentro do grupo; se bloco != null, embaralha por blocos (todas as seções do bloco levam o mesmo rótulo sorteado)
  const G = new Map();
  for (const s of lista) {
    if (!G.has(s[grupo])) G.set(s[grupo], []);
    G.get(s[grupo]).push(s);
  }
  const out = [];
  for (const g of G.values()) {
    if (!bloco) {
      const v = g.map((s) => s[attr]);
      for (let i = v.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [v[i], v[j]] = [v[j], v[i]]; }
      g.forEach((s, i) => out.push({ ...s, [attr]: v[i] }));
    } else {
      const B = new Map();
      for (const s of g) { if (!B.has(s[bloco])) B.set(s[bloco], []); B.get(s[bloco]).push(s); }
      const blocos = [...B.values()];
      const rot = blocos.map((bl) => bl[Math.floor(rnd() * bl.length)][attr]);
      for (let i = rot.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [rot[i], rot[j]] = [rot[j], rot[i]]; }
      blocos.forEach((bl, i) => bl.forEach((s) => out.push({ ...s, [attr]: rot[i] })));
    }
  }
  return out;
}
const MIN = 200;
function rodar(attr, grupo, bloco, PERM, rotulo) {
  const real = desvio(secoes, attr, grupo);
  const nulo = {};
  const maxs = [];
  for (let p = 0; p < PERM; p++) {
    const d = desvio(permutar(secoes, attr, grupo, bloco), attr, grupo);
    let mx = 0;
    for (const [k, o] of Object.entries(d)) { if (o.n < MIN) continue; (nulo[k] ??= []).push(o.pp); mx = Math.max(mx, Math.abs(o.pp)); }
    maxs.push(mx);
  }
  maxs.sort((x, y) => x - y);
  console.log(`\n${rotulo} (valores com ≥ ${MIN} seções em grupos com mais de um valor; ${PERM} permutações)`);
  for (const [k, o] of Object.entries(real).filter(([, o]) => o.n >= MIN).sort()) {
    const v = (nulo[k] ?? []).map(Math.abs).sort((x, y) => x - y);
    const p = v.length ? v.filter((z) => z >= Math.abs(o.pp)).length / v.length : NaN;
    console.log(`  ${k.padEnd(9)} ${String(o.n).padStart(7)} seções  desvio ${(o.pp >= 0 ? '+' : '') + o.pp.toFixed(3)} pp   p (|nulo| ≥ |real|, por valor) = ${p.toFixed(3)}   p95 do valor ${v.length ? v[Math.floor(0.95 * (v.length - 1))].toFixed(3) : '-'}`);
  }
  console.log(`  nulo do maior |desvio| entre os valores: mediana ${maxs[maxs.length >> 1].toFixed(3)} pp, p95 ${maxs[Math.floor(0.95 * (maxs.length - 1))].toFixed(3)} pp`);
}
rodar('modelo', 'mun', null, 200, 'MODELO, dentro do município, permutação seção a seção (como o autor, gerador corrigido)');
rodar('modelo', 'mun', 'loc', 200, 'MODELO, dentro do município, permutação em bloco por local de votação');
rodar('modelo', 'loc', null, 200, 'MODELO, dentro do LOCAL de votação (controla geografia abaixo do município)');
rodar('carga', 'mun', null, 100, 'DIA DA CARGA, dentro do município, permutação seção a seção');
rodar('carga', 'loc', null, 100, 'DIA DA CARGA, dentro do local de votação');

// poder: troca de x% dos votos do 22 para o 13 só nas urnas de um modelo
console.log('\nPoder: troca de x% dos votos do 22 → 13 só nas urnas UE2020 (estimativa dentro do município)');
for (const x of [0.001, 0.005, 0.01, 0.037]) {
  const lista = secoes.map((s) => (s.modelo === 'UE2020' ? { ...s, x: s.x + (2 * Math.round(x * s.f2)) / s.comp } : s));
  const d = desvio(lista, 'modelo', 'mun');
  console.log(`  x = ${(100 * x).toFixed(1)}%: UE2020 ${d.UE2020.pp.toFixed(3)} pp (real ${desvio(secoes, 'modelo', 'mun').UE2020.pp.toFixed(3)})`);
}
