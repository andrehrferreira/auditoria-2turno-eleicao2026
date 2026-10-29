// Revisor cético, H13: a explicação "perfil" para o excesso de seções que obrigam votos no 13 foi TESTADA ou só suposta?
// (a) Nulo de permutação estratificado: a taxa de liberação é embaralhada só entre seções da mesma zona E do mesmo
//     quintil de taxa prevista pelo perfil do eleitorado (regressão de L/n no perfil, Nordeste, por turno).
//     Se o excesso (obs/esp > 1) some no nulo estratificado, ele é explicado pelo perfil; se fica, não é.
// (b) M2 (zona + perfil) por UF do Nordeste, L1 (grupo M) e L2, ponto, para conferir a tabela por UF da síntese.
// Uso: node --max-old-space-size=8000 scripts/auditoria/cetico-liberacao-estratos.mjs [--reps 100]
// Saída: data/parsed/auditoria/cetico-revisor/liberacao-estratos.json
import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

const { values } = parseArgs({ options: { reps: { type: 'string', default: '100' } } });
const REPS = Number(values.reps);
const NE = 'al ba ce ma pb pe pi rn se'.split(' ');
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor');
function xorshift(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function resolver(A, b) {
  const k = A.length, m = b[0].length; const M = A.map((r, i) => [...r, ...b[i]]);
  for (let c = 0; c < k; c++) { let p = c; for (let i = c + 1; i < k; i++) if (Math.abs(M[i][c]) > Math.abs(M[p][c])) p = i; [M[c], M[p]] = [M[p], M[c]];
    for (let i = 0; i < k; i++) if (i !== c) { const f = M[i][c] / M[c][c]; for (let j = c; j < k + m; j++) M[i][j] -= f * M[c][j]; } }
  return M.map((r, i) => r.slice(k).map((v) => v / M[i][i]));
}
const lim = (L, T, V13, V22) => ({ min13: Math.max(0, L - (T - V13)), min22: Math.max(0, L - (T - V22)) });

// OLS ponderado com efeito fixo (chave fe) de y (k colunas) em x; devolve beta e, se pedido, níveis por grupo.
function fe(secs, feKey, ng) {
  const porZ = new Map(); for (const s of secs) { const z = s[feKey]; if (!porZ.has(z)) porZ.set(z, []); porZ.get(z).push(s); }
  const k = secs[0].x.length; const A = Array.from({ length: k }, () => Array(k).fill(0)), b = Array.from({ length: k }, () => [0, 0]);
  const zst = [];
  for (const lista of porZ.values()) {
    let W = 0; const mx = Array(k).fill(0), my = [0, 0];
    for (const s of lista) { W += s.w; for (let i = 0; i < k; i++) mx[i] += s.w * s.x[i]; my[0] += s.w * s.y[0]; my[1] += s.w * s.y[1]; }
    for (let i = 0; i < k; i++) mx[i] /= W; my[0] /= W; my[1] /= W;
    for (const s of lista) for (let i = 0; i < k; i++) { const di = s.x[i] - mx[i]; for (let j = 0; j < k; j++) A[i][j] += s.w * di * (s.x[j] - mx[j]); b[i][0] += s.w * di * (s.y[0] - my[0]); b[i][1] += s.w * di * (s.y[1] - my[1]); }
    zst.push({ lista, mx, my });
  }
  const at = []; for (let i = 0; i < k; i++) if (A[i][i] > 1e-12) at.push(i);
  const sol = resolver(at.map((i) => at.map((j) => A[i][j])), at.map((i) => b[i]));
  const beta = Array.from({ length: k }, () => [0, 0]); at.forEach((i, a) => { beta[i] = sol[a]; });
  if (!ng) return { beta };
  // níveis: grupo 0 (liberados de interesse) contra biométricos
  let g13 = 0, g22 = 0, c13 = 0, c22 = 0, b13 = 0, b22 = 0;
  for (const { lista, mx, my } of zst) for (const s of lista) {
    const base = [0, 1].map((c) => { let v = my[c]; for (let i = 0; i < k; i++) v += beta[i][c] * ((i < ng ? 0 : s.x[i]) - mx[i]); return v; });
    const G = s.G0, B = s.B;
    c13 += G * base[0]; c22 += G * base[1]; g13 += G * (base[0] + beta[0][0]); g22 += G * (base[1] + beta[0][1]); b13 += B * base[0]; b22 += B * base[1];
  }
  const tp = g13 / (g13 + g22), tp0 = c13 / (c13 + c22), tb = b13 / (b13 + b22);
  return { beta, tp: 100 * tp, tp0: 100 * tp0, bio: 100 * tb, difCond: 100 * (tp - tp0), difTotal: 100 * (tp - tb) };
}

async function main() {
  await mkdir(SAIDA, { recursive: true });
  const { db } = await abrirLeitura();
  const perf = new Map();
  for (const uf of NE) { let cab = null;
    for await (const l of createInterface({ input: createReadStream(path.join(DIR_DADOS, 'parsed', 'auditoria', 'forense', 'perfil', `${uf}.csv`)), crlfDelay: Infinity })) {
      const c = l.split(';'); if (!cab) { cab = c; continue; } const o = Object.fromEntries(cab.map((h, i) => [h, i < 4 ? c[i] : Number(c[i])])); perf.set(`${o.uf}/${o.municipio}/${o.zona}/${o.secao}`, o); } }
  const out = { geradoEm: new Date().toISOString(), reps: REPS, turnos: {} };
  for (const t of [2, 1]) {
    const principal = new Map(); for (const a of db.prepare('SELECT uf, municipio, zona, secao, secao_principal FROM secao_agregada WHERE turno = ?').all(t)) principal.set(`${a.uf}/${a.municipio}/${a.zona}/${a.secao}`, `${a.uf}/${a.municipio}/${a.zona}/${a.secao_principal}`);
    const pf = new Map(); for (const [k, p] of perf) { const kp = principal.get(k) ?? k; const s = pf.get(kp) ?? { eleitores: 0, biometria: 0, idade60: 0, idade16a24: 0, escol_baixa: 0, superior: 0, indigena: 0, quilombola: 0 }; for (const c of Object.keys(s)) s[c] += p[c]; pf.set(kp, s); }
    const secs = [];
    for (const uf of NE) {
      for await (const linha of createInterface({ input: createReadStream(path.join(DIR_DADOS, 'parsed', `${t}t`, 'perfil', `${uf}.jsonl`)), crlfDelay: Infinity })) {
        if (!linha) continue; const p = JSON.parse(linha); const k = `${p.uf}/${p.municipio}/${p.zona}/${p.secao}`;
        let votos = null; for (const e of p.bu?.eleicoes ?? []) for (const c of e.cargos ?? []) if (c.codigoCargo === 1) votos = c.votos;
        let T = 0; for (const q of Object.values(votos ?? {})) T += q; if (T < 20) continue;
        const d = p.bu.detalhamentoComparecimento; const l = p.log; const q = pf.get(k); if (!d || !q || q.eleitores < 20) continue;
        if (d.semBiometriaCadastrada + d.porBiometria + d.comBiometriaHabilitadosPorAnoNascimento !== T) continue;
        const L2 = d.semBiometriaCadastrada + d.comBiometriaHabilitadosPorAnoNascimento;
        const L1 = l && l.votosComputados === T && l.habilitadosPeloMesario <= L2 ? l.habilitadosPeloMesario : null;
        const e = q.eleitores;
        secs.push({ uf: p.uf, zona: `${p.uf}/${p.zona}`, zonaMun: `${p.uf}/${p.municipio}/${p.zona}`, T, V13: votos['13'] ?? 0, V22: votos['22'] ?? 0, L1, L2, B: d.porBiometria,
          X: [1 - q.biometria / e, q.idade60 / e, q.idade16a24 / e, q.escol_baixa / e, q.superior / e, q.indigena / e, q.quilombola / e, Math.log(e)] });
      }
    }
    const o = { secoes: secs.length, permutacao: {}, ufM2: {} };
    for (const def of ['L1', 'L2']) {
      const ss = secs.filter((s) => s[def] !== null);
      // taxa prevista pelo perfil (com efeito fixo de zona) -> quintil dentro da zona
      const r = fe(ss.map((s) => ({ ...s, w: s.T, x: s.X, y: [s[def] / s.T, 0] })), 'zona', 0);
      for (const s of ss) { s.prev = 0; for (let i = 0; i < 8; i++) s.prev += r.beta[i][0] * s.X[i]; }
      const porZ = new Map(); for (const s of ss) { if (!porZ.has(s.zona)) porZ.set(s.zona, []); porZ.get(s.zona).push(s); }
      for (const lista of porZ.values()) { lista.sort((a, b) => a.prev - b.prev); lista.forEach((s, i) => { s.q = Math.floor((5 * i) / lista.length); }); }
      const estr = (modo) => { const m = new Map(); for (const s of ss) { const key = modo === 'zona' ? s.zona : `${s.zona}|${s.q}`; if (!m.has(key)) m.set(key, []); m.get(key).push(s); } return [...m.values()]; };
      const conta = (grupos, embaralhar, rnd) => { let f13 = 0, f22 = 0; for (const g of grupos) { const tx = g.map((s) => s[def] / s.T); if (embaralhar) for (let i = tx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [tx[i], tx[j]] = [tx[j], tx[i]]; }
        g.forEach((s, i) => { const b = lim(Math.min(s.T, Math.round(tx[i] * s.T)), s.T, s.V13, s.V22); if (b.min13 >= 1) f13++; if (b.min22 >= 1) f22++; }); } return { f13, f22 }; };
      o.permutacao[def] = {};
      for (const modo of ['zona', 'zona+quintilPerfil']) {
        const grupos = estr(modo); const obs = conta(grupos, false); const rnd = xorshift(31 + t + def.length + modo.length); let s13 = 0, s22 = 0, ge = 0;
        for (let k = 0; k < REPS; k++) { const e = conta(grupos, true, rnd); s13 += e.f13; s22 += e.f22; if (e.f13 >= obs.f13) ge++; }
        o.permutacao[def][modo] = { secoes: ss.length, obs13: obs.f13, esp13: +(s13 / REPS).toFixed(1), razao13: +(obs.f13 / (s13 / REPS)).toFixed(3), fracMaiorIgual13: ge / REPS, obs22: obs.f22, esp22: +(s22 / REPS).toFixed(1) };
      }
    }
    for (const uf of NE) {
      const su = secs.filter((s) => s.uf === uf); o.ufM2[uf] = {};
      const l1 = su.filter((s) => s.L1 !== null).map((s) => ({ ...s, w: s.T, y: [s.V13 / s.T, s.V22 / s.T], x: [s.L1 / s.T, (s.L2 - s.L1) / s.T, ...s.X], G0: s.L1 }));
      const l2 = su.map((s) => ({ ...s, w: s.T, y: [s.V13 / s.T, s.V22 / s.T], x: [s.L2 / s.T, ...s.X], G0: s.L2 }));
      const l1m1 = su.filter((s) => s.L1 !== null).map((s) => ({ ...s, w: s.T, y: [s.V13 / s.T, s.V22 / s.T], x: [s.L1 / s.T, (s.L2 - s.L1) / s.T], G0: s.L1 }));
      const a = fe(l1, 'zonaMun', 2), b = fe(l2, 'zonaMun', 1), c = fe(l1m1, 'zonaMun', 2);
      o.ufM2[uf] = { M1_L1_difCond: +c.difCond.toFixed(2), M2_L1_difCond: +a.difCond.toFixed(2), M2_L2_difCond: +b.difCond.toFixed(2) };
    }
    out.turnos[t] = o;
    console.error(`turno ${t}: ${secs.length} seções`);
  }
  await writeFile(path.join(SAIDA, 'liberacao-estratos.json'), JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1));
}
await main();
