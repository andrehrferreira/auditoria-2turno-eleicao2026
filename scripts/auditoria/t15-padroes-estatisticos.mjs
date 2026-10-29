// T15, tópico 09: refaz no 1º turno COMPLETO (28 UFs) os números que docs/pericia/09-padroes-estatisticos.md
// ainda traz como "parciais" (15 UFs), e confere a mediana do comparecimento e a forma da distribuição de brancos.
// Mesma lógica de scripts/auditoria/verifica-pericia-09-padroes.mjs (beta-binomial por método dos momentos, redondos
// por média dos vizinhos), sem categorias de local (não são usadas aqui).
// Uso: node --max-old-space-size=4096 scripts/auditoria/t15-padroes-estatisticos.mjs
// Saída: data/parsed/auditoria/t15/09-padroes-estatisticos.json
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const SAIDA = path.join(RAIZ, 'data', 'parsed', 'auditoria', 't15');
const UFS_15 = ['ac', 'al', 'am', 'ap', 'ba', 'ce', 'df', 'es', 'go', 'ma', 'mg', 'ms', 'mt', 'pa', 'pb'];
const UFS_10 = ['ac', 'al', 'am', 'ap', 'ba', 'ce', 'df', 'es', 'go', 'ma'];
const R = {};
const { db, fonte, ponteiro } = await abrirLeitura();
R.banco = fonte; R.cargas = ponteiro?.cargas ?? null;

function secoesDoTurno(turno) {
  const eleicao = turno === 1 ? 6257 : 6258;
  const m = new Map();
  for (const s of db.prepare(`SELECT s.uf, s.municipio, s.zona, s.secao, e.aptos,
      COALESCE(e.comparecimento_majoritario, s.comparecimento) AS comp
    FROM secao s JOIN secao_eleicao e ON e.turno = s.turno AND e.uf = s.uf AND e.municipio = s.municipio AND e.zona = s.zona
      AND e.secao = s.secao AND e.eleicao = ? WHERE s.turno = ? AND s.situacao = 'completa'`).iterate(eleicao, turno)) {
    m.set(`${s.uf}/${s.municipio}/${s.zona}/${s.secao}`, { ...s, v13: 0, v22: 0, outros: 0, branco: 0, nulo: 0 });
  }
  for (const v of db.prepare(`SELECT uf, municipio, zona, secao,
      SUM(CASE WHEN tipo_voto='nominal' AND numero=13 THEN quantidade ELSE 0 END) v13,
      SUM(CASE WHEN tipo_voto='nominal' AND numero=22 THEN quantidade ELSE 0 END) v22,
      SUM(CASE WHEN tipo_voto='nominal' AND numero NOT IN (13,22) THEN quantidade ELSE 0 END) outros,
      SUM(CASE WHEN tipo_voto='branco' THEN quantidade ELSE 0 END) branco,
      SUM(CASE WHEN tipo_voto='nulo' THEN quantidade ELSE 0 END) nulo
    FROM voto_bu WHERE turno = ? AND cargo = 1 AND eleicao = ? GROUP BY uf, municipio, zona, secao`).iterate(turno, eleicao)) {
    const s = m.get(`${v.uf}/${v.municipio}/${v.zona}/${v.secao}`);
    if (s) Object.assign(s, { v13: v.v13, v22: v.v22, outros: v.outros, branco: v.branco, nulo: v.nulo });
  }
  const lista = [...m.values()];
  for (const s of lista) { s.k = `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`; s.val = s.v13 + s.v22 + s.outros; s.cp = s.aptos > 0 ? s.comp / s.aptos : null; }
  return lista;
}
const T2 = secoesDoTurno(2), T1 = secoesDoTurno(1);
R.secoes = { t2: T2.length, t2ComVoto: T2.filter((s) => s.val > 0).length, t1: T1.length, t1ComVoto: T1.filter((s) => s.val > 0).length,
  ufsT1: new Set(T1.map((s) => s.uf)).size, t1_15ufs: T1.filter((s) => UFS_15.includes(s.uf)).length };
console.log(R.secoes);

const lgam = (() => { const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  const f = (x) => { if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - f(1 - x); x -= 1; let a = c[0]; const t = x + g + 0.5; for (let i = 1; i < 9; i++) a += c[i] / (x + i); return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a); }; return f; })();
const agrupar = (l, f) => { const m = new Map(); for (const s of l) { const k = f(s); if (!m.has(k)) m.set(k, []); m.get(k).push(s); } return m; };

// Klimek (só as contagens citadas no texto para o 1º turno)
function klimek(lista) {
  const S = lista.filter((s) => s.aptos > 0 && s.val > 0);
  const igual = S.filter((s) => s.comp === s.aptos);
  return { secoes: S.length, acima100: S.filter((s) => s.comp > s.aptos).length, igual100: igual.length,
    aptosIgual100: igual.length ? [Math.min(...igual.map((s) => s.aptos)), Math.max(...igual.map((s) => s.aptos))] : null };
}
R.klimek1tCompleto = klimek(T1);
R.klimek1t15 = klimek(T1.filter((s) => UFS_15.includes(s.uf)));

// mediana do comparecimento do 2º turno, exata, e quantas ficam abaixo de 81,5%
{
  const S = T2.filter((s) => s.aptos > 0 && s.val > 0); const a = Float64Array.from(S.map((s) => s.cp)).sort(); const n = a.length;
  R.medianaComparecimento2t = { n, mediana: n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2,
    abaixo815: S.filter((s) => s.cp < 0.815).length, metade: n / 2 };
}

// concentração (cópia da lógica do verifica-pericia-09-padroes.mjs, só o 13 e totais)
function concentracao(lista, c = 13) {
  const S = lista.filter((s) => s.val > 0);
  const kMin = (n, t) => Math.floor((t * n + 99) / 100);
  const MAXN = S.reduce((a, s) => Math.max(a, s.val), 0) + 1;
  const lf = new Float64Array(MAXN + 1); for (let i = 1; i <= MAXN; i++) lf[i] = lf[i - 1] + Math.log(i);
  const lc = (n, k) => lf[n] - lf[k] - lf[n - k];
  const lb = (a, b) => lgam(a) + lgam(b) - lgam(a + b);
  const zonas = agrupar(S, (s) => `${s.uf}/${s.zona}`), muns = agrupar(S, (s) => `${s.uf}/${s.municipio}`);
  const v = `v${c}`; const Z = new Map(), M = new Map();
  for (const [k, g] of zonas) {
    let X = 0, N = 0; for (const s of g) { X += s[v]; N += s.val; }
    const p = X / N; let rho = 0;
    if (g.length >= 3 && p > 0 && p < 1) { let Sx = 0, n2 = 0; for (const s of g) { Sx += s.val * (s[v] / s.val - p) ** 2; n2 += s.val * s.val; }
      const den = N - n2 / N - (g.length - 1); rho = den > 0 ? (Sx / (p * (1 - p)) - (g.length - 1)) / den : 0; rho = Math.min(Math.max(rho, 0), 0.99); }
    Z.set(k, { X, N, rho });
  }
  for (const [k, g] of muns) { let X = 0, N = 0; for (const s of g) { X += s[v]; N += s.val; } M.set(k, { X, N }); }
  let obs = 0, esp = 0;
  for (const s of S) {
    const n = s.val, x = s[v]; const z = Z.get(`${s.uf}/${s.zona}`), m = M.get(`${s.uf}/${s.municipio}`);
    const pz = z.N - n > 0 ? (z.X - x) / (z.N - n) : m.N - n > 0 ? (m.X - x) / (m.N - n) : z.X / z.N;
    const k90 = kMin(n, 90); const pc = Math.min(Math.max(pz, 1e-6), 1 - 1e-6);
    let termo;
    if (z.rho > 0) { const sc = (1 - z.rho) / z.rho, a = pc * sc, b = (1 - pc) * sc, base = lb(a, b); termo = (j) => Math.exp(lc(n, j) + lb(j + a, n - j + b) - base); }
    else if (pz <= 0) termo = () => 0; else if (pz >= 1) termo = (j) => (j === n ? 1 : 0);
    else termo = (j) => Math.exp(lc(n, j) + j * Math.log(pz) + (n - j) * Math.log1p(-pz));
    let acc = 0; for (let j = n; j >= k90; j--) acc += termo(j);
    esp += Math.min(1, acc); if (x >= k90) obs++;
  }
  return { obs, esp: +esp.toFixed(1), razao: +(obs / esp).toFixed(2) };
}
R.concentracao13 = {
  t1Completo: concentracao(T1), t2Completo: concentracao(T2),
  t1_10ufs: concentracao(T1.filter((s) => UFS_10.includes(s.uf))), t2_10ufs: concentracao(T2.filter((s) => UFS_10.includes(s.uf))),
};
console.log(R.concentracao13);

// estabilidade 1º → 2º turno, 28 UFs
{
  const um = new Map(T1.map((s) => [s.k, s])); const comVoto = T2.filter((s) => s.val > 0); const est = {};
  for (const c of [13, 22]) {
    const v = `v${c}`;
    const ge90 = comVoto.filter((s) => s[v] * 100 >= 90 * s.val);
    const com1 = ge90.filter((s) => um.get(s.k)?.val > 0);
    const p1 = (s) => { const o = um.get(s.k); return o[v] / o.val; };
    const cem = com1.filter((s) => s[v] === s.val);
    est[c] = { ge90: ge90.length, ge90com1t: com1.length, ge80no1t: com1.filter((s) => p1(s) >= 0.8).length, ge90no1t: com1.filter((s) => p1(s) >= 0.9).length,
      salto20: com1.filter((s) => s[v] / s.val - p1(s) >= 0.2).length, cem: ge90.filter((s) => s[v] === s.val).length,
      cemCom1t: cem.length, cemGe90no1t: cem.filter((s) => p1(s) >= 0.9).length };
  }
  R.estabilidade28ufs = est;
}

// redondos (média dos vizinhos v±1, v±2)
function redondos(lista, f) {
  const S = lista.filter((s) => s.val > 0 && s.aptos > 0);
  const h = new Map(); let max = 0; for (const s of S) { const v = f(s); h.set(v, (h.get(v) ?? 0) + 1); if (v > max) max = v; }
  const H = (v) => h.get(v) ?? 0; const out = {};
  for (const m of [10, 50, 100]) { let o = 0, e = 0; for (let v = m; v <= max; v += m) { o += H(v); e += (H(v - 2) + H(v - 1) + H(v + 1) + H(v + 2)) / 4; }
    out[m] = { obs: o, esp: Math.round(e), z: +((o - e) / Math.sqrt(e)).toFixed(1) }; }
  return { out, H };
}
R.redondos1tCompleto_v22 = redondos(T1, (s) => s.v22).out;
R.redondos1tCompleto_v13 = redondos(T1, (s) => s.v13).out;
R.redondos2tCompleto_v22 = redondos(T2, (s) => s.v22).out;
const ufs1 = [...new Set(T1.map((s) => s.uf))].sort();
R.redondos1tPorUf_v22x10 = Object.fromEntries(ufs1.map((uf) => { const r = redondos(T1.filter((s) => s.uf === uf), (s) => s.v22).out[10]; return [uf, { obs: r.obs, esp: r.esp, acima: r.obs > r.esp }]; }));
R.redondos1tPorUf_v22x10_acima = Object.values(R.redondos1tPorUf_v22x10).filter((x) => x.acima).length;

// forma da distribuição de brancos e nulos no 2º turno perto dos múltiplos de 10 (convexidade)
{
  const forma = (f) => { const { H } = redondos(T2, f); const o = {};
    for (const m of [10, 20, 30, 40]) o[m] = { 'v-2': H(m - 2), 'v-1': H(m - 1), v: H(m), 'v+1': H(m + 1), 'v+2': H(m + 2), mediaVizinhos: (H(m - 2) + H(m - 1) + H(m + 1) + H(m + 2)) / 4 };
    return o; };
  R.formaBranco2t = forma((s) => s.branco);
  R.formaNulo2t = forma((s) => s.nulo);
}

await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, '09-padroes-estatisticos.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
