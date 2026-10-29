// Cientista político: o crescimento de cada finalista entre os turnos veio de eleitores habilitados
// por biometria (controle técnico com rastro) ou de habilitações sem biometria (dependem do mesário)?
// Teste da explicação "mobilização entre turnos" contra a brecha humana (princípio 8, doc 01).
//
// Uso: node scripts/auditoria/politico-biometria-crescimento.mjs
// Lê o banco (BU de cada seção nos dois turnos): só as UFs com o 1º turno carregado (tabela carga).
// Saída: data/parsed/auditoria/cientista-politico/biometria-crescimento.json
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, writeFileSync } from 'node:fs';

const SAIDA = 'data/parsed/auditoria/cientista-politico';
mkdirSync(SAIDA, { recursive: true });
const db = new DatabaseSync('data/db/eleicao2026.sqlite', { readOnly: true });
const ufs = db.prepare('SELECT uf FROM carga WHERE turno = 1 AND uf IN (SELECT uf FROM carga WHERE turno = 2) ORDER BY uf').all().map((r) => r.uf);

const qSecao = db.prepare(`SELECT municipio, zona, secao, comparecimento c, sem_biometria sb, por_biometria pb, por_biografia pg
  FROM secao WHERE turno = ? AND uf = ? AND situacao = 'completa'`);
const qVotos = db.prepare(`SELECT municipio, zona, secao, tipo_voto, numero, SUM(quantidade) q FROM voto_bu
  WHERE turno = ? AND uf = ? AND cargo = 1 GROUP BY municipio, zona, secao, tipo_voto, numero`);

// mínimos quadrados ponderados: y = X·b (X já inclui a constante)
function mqo(linhas, nx) {
  const XtX = Array.from({ length: nx }, () => Array(nx).fill(0));
  const Xty = Array(nx).fill(0);
  for (const { x, y, w } of linhas) {
    for (let i = 0; i < nx; i++) { Xty[i] += w * x[i] * y; for (let j = 0; j < nx; j++) XtX[i][j] += w * x[i] * x[j]; }
  }
  const A = XtX.map((r, i) => [...r, Xty[i]]);
  for (let c = 0; c < nx; c++) {
    let p = c;
    for (let r = c + 1; r < nx; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < nx; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let j = c; j <= nx; j++) A[r][j] -= f * A[c][j]; }
  }
  return A.map((r, i) => Math.round((r[nx] / r[i]) * 1000) / 1000);
}

const resultado = { geradoEm: new Date().toISOString(), ufs: {}, regressoes: {} };
const todas = [];
for (const uf of ufs) {
  const sec = [new Map(), new Map()];
  for (const t of [1, 2]) {
    for (const r of qSecao.all(t, uf)) sec[t - 1].set(`${r.municipio}|${r.zona}|${r.secao}`, { ...r, L: 0, F: 0, E: 0, BN: 0 });
    for (const r of qVotos.all(t, uf)) {
      const s = sec[t - 1].get(`${r.municipio}|${r.zona}|${r.secao}`);
      if (!s) continue;
      if (r.tipo_voto === 'branco' || r.tipo_voto === 'nulo') s.BN += r.q;
      else if (r.numero === 13) s.L += r.q;
      else if (r.numero === 22) s.F += r.q;
      else s.E += r.q;
    }
  }
  const tot = { secoes: 0, c1: 0, c2: 0, bio1: 0, bio2: 0, nb1: 0, nb2: 0, L1: 0, L2: 0, F1: 0, F2: 0 };
  for (const [k, a] of sec[0]) {
    const b = sec[1].get(k);
    if (!b || a.c < 20 || a.sb == null || b.sb == null) continue;
    const s = {
      uf, k, c1: a.c, c2: b.c, bio1: a.pb, bio2: b.pb, nb1: a.sb + a.pg, nb2: b.sb + b.pg,
      L1: a.L, L2: b.L, F1: a.F, F2: b.F, E1: a.E, BN1: a.BN, BN2: b.BN,
    };
    tot.secoes++;
    for (const x of ['c1', 'c2', 'bio1', 'bio2', 'nb1', 'nb2', 'L1', 'L2', 'F1', 'F2']) tot[x] += s[x];
    todas.push(s);
  }
  tot.dComp = tot.c2 - tot.c1; tot.dBio = tot.bio2 - tot.bio1; tot.dNaoBio = tot.nb2 - tot.nb1;
  tot.pctNaoBio1 = +(100 * tot.nb1 / tot.c1).toFixed(2); tot.pctNaoBio2 = +(100 * tot.nb2 / tot.c2).toFixed(2);
  tot.dL = tot.L2 - tot.L1; tot.dF = tot.F2 - tot.F1;
  resultado.ufs[uf] = tot;
}

// Regressão por seção: ΔL/c1 e ΔF/c1 em função de Δbio/c1, ΔnãoBio/c1, eliminados/c1 e brancos-nulos/c1 do 1º turno.
// Sob "mobilização sem fraude", o coeficiente de ΔnãoBio para cada finalista fica perto do de Δbio
// (o eleitor a mais se divide igual, seja qual for a forma de habilitação). Assinatura de voto
// inserido via liberação sem biometria: coeficiente de ΔnãoBio muito maior para um finalista só.
const regs = (lista) => {
  const linhas = (campo) => lista.map((s) => ({
    w: s.c1,
    x: [1, (s.bio2 - s.bio1) / s.c1, (s.nb2 - s.nb1) / s.c1, s.E1 / s.c1, s.BN1 / s.c1],
    y: (campo === 'L' ? s.L2 - s.L1 : s.F2 - s.F1) / s.c1,
  }));
  const nomes = ['constante', 'dBio', 'dNaoBio', 'eliminados1t', 'brancosNulos1t'];
  const z = (b) => Object.fromEntries(nomes.map((n, i) => [n, b[i]]));
  return { secoes: lista.length, ganho13: z(mqo(linhas('L'), 5)), ganho22: z(mqo(linhas('F'), 5)) };
};
resultado.regressoes.todas = regs(todas);
for (const uf of ufs) resultado.regressoes[uf] = regs(todas.filter((s) => s.uf === uf));

// Cauda: seções com o maior aumento de habilitações sem biometria (≥ 20 a mais que no 1º turno)
const cauda = todas.filter((s) => s.nb2 - s.nb1 >= 20);
resultado.cauda = {
  criterio: 'ΔnãoBio ≥ 20', secoes: cauda.length,
  dL: cauda.reduce((a, s) => a + s.L2 - s.L1, 0), dF: cauda.reduce((a, s) => a + s.F2 - s.F1, 0),
  dComp: cauda.reduce((a, s) => a + s.c2 - s.c1, 0), dNaoBio: cauda.reduce((a, s) => a + s.nb2 - s.nb1, 0),
  eliminados1t: cauda.reduce((a, s) => a + s.E1, 0), L1: cauda.reduce((a, s) => a + s.L1, 0), F1: cauda.reduce((a, s) => a + s.F1, 0),
};
writeFileSync(`${SAIDA}/biometria-crescimento.json`, JSON.stringify(resultado, null, 1));
console.log(JSON.stringify(resultado, null, 0).slice(0, 200));
