// Revisor cético — consolidação do achado "virada-sem-digital-e-liberacao-em-massa".
// Confere os dois pontos em disputa entre as três lentes:
//  (1) a tabela do item 9 com a faixa decidida em aritmética inteira (sem 1 - pb/c em ponto flutuante);
//  (2) o sinal do gradiente "sem digital" dentro da zona, com e sem controles (parcela do 13 no 1º turno e
//      perfil etário do cadastro de 14/07/2026), separando o controle de idade do controle do 1º turno.
// Universo: todas as seções do Brasil (uf <> 'zz') com comparecimento > 0 no 2º turno e voto 13+22 > 0 nos dois turnos.
// Efeito fixo de UF+zona (desvio da média ponderada da zona), peso = votos 13+22 do 2º turno, EP agrupado por zona.
// Uso: node scripts/auditoria/cetico-vsd-consolidacao.mjs → data/parsed/auditoria/cetico/vsd-consolidacao.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { abrirLeitura } from '../../src/banco-leitura.js';

const { db, ponteiro } = await abrirLeitura();
const S = new Map();
for (const r of db.prepare(`SELECT turno, uf, municipio, zona, secao, comparecimento c, sem_biometria sb, por_biometria pb, por_biografia pg
    FROM secao WHERE uf <> 'zz'`).iterate()) {
  const k = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
  const s = S.get(k) ?? { k, uf: r.uf, zona: r.zona, t: [], v: [null, [0, 0], [0, 0]] };
  s.t[r.turno] = r; S.set(k, s);
}
for (const v of db.prepare("SELECT turno, uf, municipio, zona, secao, numero, quantidade q FROM voto_bu WHERE cargo = 1 AND numero IN (13, 22) AND uf <> 'zz'").iterate()) {
  const s = S.get(`${v.uf}/${v.municipio}/${v.zona}/${v.secao}`); if (!s) continue;
  s.v[v.turno][v.numero === 13 ? 0 : 1] += v.q;
}
db.close();

const todas2 = [...S.values()].filter((s) => s.t[2] && s.t[2].c > 0);
const exclusoes = {
  pbNulo2t: todas2.filter((s) => s.t[2].pb == null).length,
  semSecao1t: todas2.filter((s) => !s.t[1]).length,
  sem13e22numTurno: todas2.filter((s) => s.t[1] && (s.v[1][0] + s.v[1][1] === 0 || s.v[2][0] + s.v[2][1] === 0)).length,
};
const U = todas2.filter((s) => s.t[2].pb != null && s.t[1] && s.v[1][0] + s.v[1][1] > 0 && s.v[2][0] + s.v[2][1] > 0);

// (1) faixas em inteiros
function faixa(c, pb) {
  const sd = c - pb;
  if (pb === 0) return '100%';
  if (sd * 5 >= 4 * c) return '80-99,9%';
  if (sd * 2 >= c) return '50-79,9%';
  if (sd * 5 >= c) return '20-49,9%';
  return '<20%';
}
const F = {};
let exato20 = 0;
for (const s of U) {
  const { c, pb } = s.t[2];
  if ((c - pb) * 5 === c) exato20++;
  const f = faixa(c, pb);
  const a = (F[f] ??= { secoes: 0, comparecimento: 0, vir13: 0, vir22: 0, emp1t: 0, l1: 0, f1: 0, l2: 0, f2: 0 });
  const [l1, f1] = s.v[1], [l2, f2] = s.v[2];
  a.secoes++; a.comparecimento += c; a.l1 += l1; a.f1 += f1; a.l2 += l2; a.f2 += f2;
  if (f1 > l1 && l2 > f2) a.vir13++;
  if (l1 > f1 && f2 > l2) a.vir22++;
  if (l1 === f1) a.emp1t++;
}
for (const a of Object.values(F)) {
  a.p1 = +(100 * a.l1 / (a.l1 + a.f1)).toFixed(2); a.p2 = +(100 * a.l2 / (a.l2 + a.f2)).toFixed(2);
  a.ganho = +(100 * a.l2 / (a.l2 + a.f2) - 100 * a.l1 / (a.l1 + a.f1)).toFixed(2);
  a.pctVir13 = +(100 * a.vir13 / a.secoes).toFixed(2);
}

// (2) regressões dentro da zona
const idade = new Map();
for (const linha of readFileSync('data/parsed/auditoria/biometria/cadastro-secao.jsonl', 'utf8').split('\n')) {
  if (!linha) continue; const r = JSON.parse(linha);
  if (r.eleitores > 0) idade.set(r.k, ['16a17', '18a20', '60a69', '70a79', '80mais'].map((f) => (r.faixas[f] ?? 0) / r.eleitores));
}
const sh = ([l, f]) => l / (l + f);
const dy = (s) => 100 * (sh(s.v[2]) - sh(s.v[1]));
const xt = (s) => (s.t[2].c - s.t[2].pb) / s.t[2].c;
const comp = (s) => [s.t[2].sb / s.t[2].c, s.t[2].pg / s.t[2].c];

function inverter(A) {
  const k = A.length, M = A.map((r, i) => [...r, ...A.map((_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < k; c++) {
    let p = c; for (let r = c + 1; r < k; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]]; const d = M[c][c];
    for (let j = 0; j < 2 * k; j++) M[c][j] /= d;
    for (let r = 0; r < k; r++) if (r !== c) { const f = M[r][c]; for (let j = 0; j < 2 * k; j++) M[r][j] -= f * M[c][j]; }
  }
  return M.map((r) => r.slice(k));
}
function dentroDaZona(lista, X, nomes) {
  const G = new Map();
  for (const s of lista) {
    const g = `${s.uf}/${s.zona}`, w = s.v[2][0] + s.v[2][1], x = X(s), y = dy(s);
    const z = G.get(g) ?? { w: 0, y: 0, x: x.map(() => 0), itens: [] };
    z.w += w; z.y += w * y; x.forEach((v, i) => (z.x[i] += w * v)); z.itens.push([w, y, x]); G.set(g, z);
  }
  const k = nomes.length, XtX = nomes.map(() => Array(k).fill(0)), Xty = Array(k).fill(0);
  for (const z of G.values()) {
    const my = z.y / z.w, mx = z.x.map((v) => v / z.w);
    z.dm = z.itens.map(([w, y, x]) => [w, y - my, x.map((v, i) => v - mx[i])]);
    for (const [w, y, x] of z.dm) for (let i = 0; i < k; i++) { Xty[i] += w * x[i] * y; for (let j = 0; j < k; j++) XtX[i][j] += w * x[i] * x[j]; }
  }
  const Inv = inverter(XtX), b = Inv.map((r) => r.reduce((a, v, j) => a + v * Xty[j], 0));
  const Meio = nomes.map(() => Array(k).fill(0));
  for (const z of G.values()) {
    const u = Array(k).fill(0);
    for (const [w, y, x] of z.dm) { const e = y - x.reduce((a, v, i) => a + v * b[i], 0); for (let i = 0; i < k; i++) u[i] += w * x[i] * e; }
    for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) Meio[i][j] += u[i] * u[j];
  }
  const V = Inv.map((r) => nomes.map((_, j) => r.reduce((a, v, m) => a + v * Meio[m].reduce((aa, vv, n) => aa + vv * Inv[n][j], 0), 0)));
  return { N: lista.length, zonas: G.size, coef: Object.fromEntries(nomes.map((n, i) => [n, { beta: +b[i].toFixed(3), ep: +Math.sqrt(V[i][i]).toFixed(3), t: +(b[i] / Math.sqrt(V[i][i])).toFixed(2) }])) };
}
const comIdade = U.filter((s) => idade.has(s.k));
const ID = ['id16a17', 'id18a20', 'id60a69', 'id70a79', 'id80mais'];
const R = {
  A_total: dentroDaZona(U, (s) => [xt(s)], ['semDigital']),
  B_componentes: dentroDaZona(U, comp, ['semBio', 'manual']),
  A_total_mesmasSecoesComIdade: dentroDaZona(comIdade, (s) => [xt(s)], ['semDigital']),
  E_total_idade: dentroDaZona(comIdade, (s) => [xt(s), ...idade.get(s.k)], ['semDigital', ...ID]),
  F_componentes_idade: dentroDaZona(comIdade, (s) => [...comp(s), ...idade.get(s.k)], ['semBio', 'manual', ...ID]),
  G_total_nivel1t: dentroDaZona(U, (s) => [xt(s), sh(s.v[1])], ['semDigital', 'parcela13_1t']),
  C_total_nivel1t_idade: dentroDaZona(comIdade, (s) => [xt(s), sh(s.v[1]), ...idade.get(s.k)], ['semDigital', 'parcela13_1t', ...ID]),
  D_componentes_nivel1t_idade: dentroDaZona(comIdade, (s) => [...comp(s), sh(s.v[1]), ...idade.get(s.k)], ['semBio', 'manual', 'parcela13_1t', ...ID]),
};
const res = { copia: ponteiro?.copia ?? ponteiro, universo: U.length, exclusoes, exclusaoSemPerfilEtario: U.length - comIdade.length, exato20, faixas: F, regressoes: R };
mkdirSync('data/parsed/auditoria/cetico', { recursive: true });
writeFileSync('data/parsed/auditoria/cetico/vsd-consolidacao.json', JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
