// Revisor cético — achado "virada-sem-digital-e-liberacao-em-massa": os dois componentes do "sem digital".
// "Sem digital" = sem biometria cadastrada (ano de nascimento) + liberação manual (dado pessoal). O autor somou os dois.
// Aqui, dentro da zona (efeito fixo UF+zona; EP agrupado por zona), separa-os, testa a variação entre turnos de cada
// um e o nível do voto em cada turno. Universo: as mesmas 497.897 seções do Brasil de cetico-vsdl-alternativas.mjs.
// Uso: node scripts/auditoria/cetico-vsdl-componentes.mjs → data/parsed/auditoria/cetico/vsdl-componentes.json
import { writeFileSync } from 'node:fs';
import { abrirLeitura } from '../../src/banco-leitura.js';

const { db, ponteiro } = await abrirLeitura();
const S = new Map();
for (const r of db.prepare(`SELECT turno, uf, municipio, zona, secao, comparecimento c, sem_biometria sb, por_biometria pb, por_biografia pg
    FROM secao WHERE uf <> 'zz' AND situacao = 'completa'`).iterate()) {
  const k = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
  const s = S.get(k) ?? { k, uf: r.uf, mun: r.municipio, zona: r.zona, t: [], v: [null, { l: 0, f: 0 }, { l: 0, f: 0 }] };
  s.t[r.turno] = r; S.set(k, s);
}
for (const v of db.prepare("SELECT turno, uf, municipio, zona, secao, numero, quantidade q FROM voto_bu WHERE cargo = 1 AND numero IN (13, 22) AND uf <> 'zz'").iterate()) {
  const s = S.get(`${v.uf}/${v.municipio}/${v.zona}/${v.secao}`); if (!s) continue;
  if (v.numero === 13) s.v[v.turno].l += v.q; else s.v[v.turno].f += v.q;
}
db.close();
const U = [...S.values()].filter((s) => s.t[2] && s.t[2].c > 0 && s.t[2].pb != null && s.t[1]);
const ok1 = (s) => s.t[1].c > 0 && s.t[1].pb != null;
const n = U.length;

function inverter(A) {
  const k = A.length, M = A.map((r, i) => [...r, ...Array.from({ length: k }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < k; c++) { let p = c; for (let r = c + 1; r < k; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; const d = M[c][c]; for (let j = 0; j < 2 * k; j++) M[c][j] /= d; for (let r = 0; r < k; r++) if (r !== c) { const f = M[r][c]; for (let j = 0; j < 2 * k; j++) M[r][j] -= f * M[c][j]; } }
  return M.map((r) => r.slice(k));
}
function within(rows, k) { // rows: {g, cl, w, y, x[]}
  const gm = new Map();
  for (const r of rows) { const m = gm.get(r.g) ?? { w: 0, y: 0, x: new Float64Array(k) }; m.w += r.w; m.y += r.w * r.y; for (let j = 0; j < k; j++) m.x[j] += r.w * r.x[j]; gm.set(r.g, m); }
  const XX = Array.from({ length: k }, () => new Float64Array(k)), XY = new Float64Array(k);
  for (const r of rows) { const m = gm.get(r.g); r.yt = r.y - m.y / m.w; r.xt = r.x.map((x, j) => x - m.x[j] / m.w); for (let a = 0; a < k; a++) { XY[a] += r.w * r.xt[a] * r.yt; for (let b = 0; b < k; b++) XX[a][b] += r.w * r.xt[a] * r.xt[b]; } }
  const inv = inverter(XX); const beta = inv.map((row) => row.reduce((s, v, b) => s + v * XY[b], 0));
  const sc = new Map();
  for (const r of rows) { const u = r.yt - r.xt.reduce((s, x, j) => s + beta[j] * x, 0); const v = sc.get(r.cl) ?? new Float64Array(k); for (let j = 0; j < k; j++) v[j] += r.w * r.xt[j] * u; sc.set(r.cl, v); }
  const G = sc.size, M = Array.from({ length: k }, () => new Float64Array(k));
  for (const v of sc.values()) for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) M[a][b] += v[a] * v[b];
  const ep = beta.map((_, a) => { let s = 0; for (let p = 0; p < k; p++) for (let q = 0; q < k; q++) s += inv[a][p] * M[p][q] * inv[q][a]; return Math.sqrt((G / (G - 1)) * s); });
  return { N: rows.length, G, beta: beta.map((b) => +b.toFixed(3)), ep: ep.map((e) => +e.toFixed(3)), t: beta.map((b, j) => +(b / ep[j]).toFixed(2)) };
}
const sh = (v) => v.l / (v.l + v.f);
const base = U.filter((s) => s.v[1].l + s.v[1].f > 0 && s.v[2].l + s.v[2].f > 0);
const fe = (s, nivel) => (nivel === 'zona' ? `${s.uf}/${s.zona}` : `${s.uf}/${s.mun}`);
const comp = (s, t) => [s.t[t].sb / s.t[t].c, s.t[t].pg / s.t[t].c];
const res = { copia: ponteiro?.criadoEm, universo: n, comVotos13e22nosDoisTurnos: base.length };
const mk = (lista, y, x, nivel = 'zona', peso = true) => lista.map((s) => ({ g: fe(s, nivel), cl: `${s.uf}/${s.zona}`, w: peso ? (s.v[1].l + s.v[1].f + s.v[2].l + s.v[2].f) / 2 : 1, y: y(s), x: x(s) }));
const dy = (s) => 100 * (sh(s.v[2]) - sh(s.v[1]));
const b1 = base.filter(ok1);
res.exclusaoSemDetalhamento1t = base.length - b1.length;
res.delta_sobre_semBio2_manual2 = { zona: within(mk(base, dy, (s) => comp(s, 2)), 2), municipio: within(mk(base, dy, (s) => comp(s, 2), 'mun'), 2), zonaSemPeso: within(mk(base, dy, (s) => comp(s, 2), 'zona', false), 2) };
res.delta_sobre_componentes_1t_e_2t = within(mk(b1, dy, (s) => [...comp(s, 2), ...comp(s, 1)]), 4); // [sb2, pg2, sb1, pg1]
res.delta_sobre_variacao_dos_componentes = within(mk(b1, dy, (s) => { const [a, b] = comp(s, 2), [c, d] = comp(s, 1); return [a - c, b - d]; }), 2);
// nível do voto em cada turno (parcela do 13), contra os componentes do próprio turno
res.nivel_1t = within(mk(b1, (s) => 100 * sh(s.v[1]), (s) => comp(s, 1)), 2);
res.nivel_2t = within(mk(b1, (s) => 100 * sh(s.v[2]), (s) => comp(s, 2)), 2);
// comparecimento: variação relativa entre turnos contra os componentes (mecanismo alternativo)
res.deltaComparecimentoPct_sobre_componentes2 = within(mk(b1, (s) => 100 * (s.t[2].c / s.t[1].c - 1), (s) => comp(s, 2)), 2);
// em votos: componente × votos 13+22
let vSb = 0, vPg = 0; for (const s of base) { const V = s.v[2].l + s.v[2].f; vSb += (s.t[2].sb / s.t[2].c) * V; vPg += (s.t[2].pg / s.t[2].c) * V; }
const z = res.delta_sobre_semBio2_manual2.zona;
res.emVotos = { votos13e22_semBioCadastrada: Math.round(vSb), votos13e22_manual: Math.round(vPg),
  semBio: { central: Math.round(z.beta[0] / 100 * vSb), ic95: [Math.round((z.beta[0] - 1.96 * z.ep[0]) / 100 * vSb), Math.round((z.beta[0] + 1.96 * z.ep[0]) / 100 * vSb)] },
  manual: { central: Math.round(z.beta[1] / 100 * vPg), ic95: [Math.round((z.beta[1] - 1.96 * z.ep[1]) / 100 * vPg), Math.round((z.beta[1] + 1.96 * z.ep[1]) / 100 * vPg)] } };
// sensibilidade: sem ES (domina a faixa 50–79,9%) e por região
const REG = { ac: 'N', am: 'N', ap: 'N', pa: 'N', ro: 'N', rr: 'N', to: 'N', al: 'NE', ba: 'NE', ce: 'NE', ma: 'NE', pb: 'NE', pe: 'NE', pi: 'NE', rn: 'NE', se: 'NE', df: 'CO', go: 'CO', ms: 'CO', mt: 'CO', es: 'SE', mg: 'SE', rj: 'SE', sp: 'SE', pr: 'S', rs: 'S', sc: 'S' };
res.semES = within(mk(base.filter((s) => s.uf !== 'es'), dy, (s) => comp(s, 2)), 2);
res.porRegiao = Object.fromEntries(['N', 'NE', 'CO', 'SE', 'S'].map((r) => [r, within(mk(base.filter((s) => REG[s.uf] === r), dy, (s) => comp(s, 2)), 2)]));
// controles: nível do 13 no 1º turno (teto / regressão à média) e perfil etário do cadastro (14/07/2026,
// data/parsed/auditoria/biometria/cadastro-secao.jsonl de biometria-cadastro.mjs). Faixa de base: 21 a 59 anos.
const { readFileSync } = await import('node:fs');
const idade = new Map();
for (const l of readFileSync('data/parsed/auditoria/biometria/cadastro-secao.jsonl', 'utf8').split('\n')) {
  if (!l.trim()) continue; const r = JSON.parse(l);
  if (r.eleitores > 0) idade.set(r.k, ['16a17', '18a20', '60a69', '70a79', '80mais'].map((f) => (r.faixas[f] ?? 0) / r.eleitores));
}
const comIdade = b1.filter((s) => idade.has(s.k));
res.exclusaoSemPerfilEtario = b1.length - comIdade.length;
res.delta_controle_nivel1 = within(mk(b1, dy, (s) => [...comp(s, 2), sh(s.v[1])]), 3); // [sb2, pg2, parcela13_1t]
res.delta_controle_nivel1_idade = within(mk(comIdade, dy, (s) => [...comp(s, 2), sh(s.v[1]), ...idade.get(s.k)]), 8);
res.delta_controle_nivel1_idade_municipio = within(mk(comIdade, dy, (s) => [...comp(s, 2), sh(s.v[1]), ...idade.get(s.k)], 'mun'), 8);
res.delta_x2_controle_nivel1_idade = within(mk(comIdade, dy, (s) => [1 - s.t[2].pb / s.t[2].c, sh(s.v[1]), ...idade.get(s.k)]), 7);
res.porRegiaoComControles = Object.fromEntries(['N', 'NE', 'CO', 'SE', 'S'].map((r) => [r, within(mk(comIdade.filter((s) => REG[s.uf] === r), dy, (s) => [...comp(s, 2), sh(s.v[1]), ...idade.get(s.k)]), 8)]));
res.semESComControles = within(mk(comIdade.filter((s) => s.uf !== 'es'), dy, (s) => [...comp(s, 2), sh(s.v[1]), ...idade.get(s.k)]), 8);
// placebo: o 1º turno não pode depender do sem digital do 2º se o efeito for só do 2º turno — nível do 1º turno controlado por idade
res.placebo_nivel1t_sobre_comp2_idade = within(mk(comIdade, (s) => 100 * sh(s.v[1]), (s) => [...comp(s, 2), ...idade.get(s.k)]), 7);
const zc = res.delta_controle_nivel1_idade;
res.emVotosComControles = { semBio: { central: Math.round(zc.beta[0] / 100 * vSb), ic95: [Math.round((zc.beta[0] - 1.96 * zc.ep[0]) / 100 * vSb), Math.round((zc.beta[0] + 1.96 * zc.ep[0]) / 100 * vSb)] },
  manual: { central: Math.round(zc.beta[1] / 100 * vPg), ic95: [Math.round((zc.beta[1] - 1.96 * zc.ep[1]) / 100 * vPg), Math.round((zc.beta[1] + 1.96 * zc.ep[1]) / 100 * vPg)] } };
writeFileSync('data/parsed/auditoria/cetico/vsdl-componentes.json', JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
