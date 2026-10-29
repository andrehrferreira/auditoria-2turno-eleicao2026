// Verificação independente dos números de docs/pericia/09-padroes-estatisticos.md (regra "só dados 100% corretos").
// Não usa forense-lib.mjs nem os CSVs/JSONs de data/parsed/auditoria/forense/: lê a cópia de leitura do banco
// (abrirLeitura) e os arquivos públicos brutos do TSE (perfil do eleitorado por seção e locais de votação).
// Recalcula só o que é determinístico (contagens, correlações, χ² contra referências fixas, beta-binomial por
// método dos momentos, z robusto sem perfil). Simulações com semente (permutação, Monte Carlo) e o z com perfil
// ficam de fora: não são reproduzidos aqui.
// Uso: node --max-old-space-size=6144 scripts/auditoria/verifica-pericia-09-padroes.mjs
// Saída: data/parsed/auditoria/verifica-pericia/09-padroes.json
import { createReadStream } from 'node:fs';
import { mkdir, open, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { createInflateRaw } from 'node:zlib';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { listarEntradas } from '../../src/zip.js';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const SAIDA = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'verifica-pericia');
const ABERTOS = path.join(RAIZ, 'data', 'raw', 'dadosabertos');
const UFS_1T_PARCIAL = ['ac', 'al', 'am', 'ap', 'ba', 'ce', 'df', 'es', 'go', 'ma', 'mg', 'ms', 'mt', 'pa', 'pb'];
const UFS_1T_CARGA1 = ['ac', 'al', 'am', 'ap', 'ba', 'ce', 'df', 'es', 'go', 'ma'];
const p4 = (v) => String(Number(v)).padStart(4, '0');
const p5 = (v) => String(Number(v)).padStart(5, '0');
const R = {};

// ---------- CSV em ZIP (streaming) ----------
function campos(linha) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i];
    if (q) { if (ch === '"') { if (linha[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true; else if (ch === ';') { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur); return out;
}
async function* linhasDoZip(arquivo, aceitar) {
  const h = await open(arquivo, 'r'); const ents = [];
  try {
    for (const e of await listarEntradas(h)) {
      if (!aceitar(e.nome)) continue;
      const b = Buffer.alloc(30); await h.read(b, 0, 30, e.offsetLocal);
      ents.push({ ...e, ini: e.offsetLocal + 30 + b.readUInt16LE(26) + b.readUInt16LE(28) });
    }
  } finally { await h.close(); }
  for (const e of ents) {
    let s = createReadStream(arquivo, { start: e.ini, end: e.ini + e.tamanhoComprimido - 1, highWaterMark: 1 << 20 });
    if (e.metodo === 8) s = s.pipe(createInflateRaw());
    yield* createInterface({ input: s.setEncoding('latin1'), crlfDelay: Infinity });
  }
}

// ---------- seções do banco ----------
const { db, fonte } = await abrirLeitura();
R.banco = fonte;
const nomeMun = new Map(db.prepare('SELECT codigo, nome FROM municipio').all().map((m) => [m.codigo, m.nome]));
function secoesDoTurno(turno) {
  const eleicao = turno === 1 ? 6257 : 6258;
  const m = new Map();
  for (const s of db.prepare(`SELECT s.uf, s.municipio, s.zona, s.secao, s.tipo_urna, e.aptos,
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
const T2 = secoesDoTurno(2);
const T1 = secoesDoTurno(1);
console.log('seções', T2.length, T1.length);

// ---------- locais e perfil (arquivos públicos brutos) ----------
// Cache da categoria por seção (a leitura dos ZIPs leva ~25 min); apagar o arquivo refaz do bruto.
const CACHE = path.join(SAIDA, '09-categorias-cache.json');
let cache = null;
try { cache = JSON.parse(await readFile(CACHE, 'utf8')); } catch { cache = null; }
if (cache) {
  for (const [lista, t] of [[T2, 't2'], [T1, 't1']]) for (const s of lista) s.cat = cache[t][s.k] ?? 'comum';
  R.secoesComPerfil2t = cache.comPerfil2t;
} else {
const local = new Map(); // `${turno}:${chave}` → {nome, tipo}
const principal = new Map(); // `${turno}:${agregada}` → chave principal
{
  let idx = null;
  for await (const l of linhasDoZip(path.join(ABERTOS, 'eleitorado_locais_votacao', 'eleitorado_local_votacao_2026.zip'),
    (n) => n.toLowerCase().endsWith('.csv') && !/brasil/i.test(n))) {
    const c = campos(l);
    if (c[0] === 'DT_GERACAO') { idx = Object.fromEntries(c.map((x, i) => [x, i])); continue; }
    if (!idx || c.length < 10) continue;
    const t = c[idx.NR_TURNO];
    const k = `${c[idx.SG_UF].toLowerCase()}/${p5(c[idx.CD_MUNICIPIO])}/${p4(c[idx.NR_ZONA])}/${p4(c[idx.NR_SECAO])}`;
    local.set(`${t}:${k}`, { nome: c[idx.NM_LOCAL_VOTACAO], tipo: c[idx.DS_TIPO_LOCAL] });
    if (c[idx.DS_TIPO_SECAO_AGREGADA] === 'Agregada') {
      const [uf, mu, zo] = k.split('/');
      principal.set(`${t}:${k}`, `${uf}/${mu}/${zo}/${p4(c[idx.NR_SECAO_PRINCIPAL])}`);
    }
  }
}
console.log('locais', local.size);
const perfilBruto = new Map(); // chave → {e, ind, quil}
{
  const dir = path.join(ABERTOS, 'perfil_eleitor_secao');
  for (const f of (await readdir(dir)).filter((x) => x.endsWith('.zip'))) {
    const uf = f.match(/_([A-Z]{2})\.zip$/)[1].toLowerCase();
    let idx = null;
    for await (const l of linhasDoZip(path.join(dir, f), (n) => n.toLowerCase().endsWith('.csv'))) {
      let c = l.split(';').map((x) => (x.length > 1 && x[0] === '"' && x.at(-1) === '"' ? x.slice(1, -1) : x));
      if (!idx) { c = campos(l); idx = Object.fromEntries(c.map((x, i) => [x, i])); idx.n = c.length; continue; }
      if (c.length !== idx.n || l.includes('""')) c = campos(l);
      const k = `${uf}/${p5(c[idx.CD_MUNICIPIO])}/${p4(c[idx.NR_ZONA])}/${p4(c[idx.NR_SECAO])}`;
      let s = perfilBruto.get(k); if (!s) perfilBruto.set(k, (s = { e: 0, ind: 0, quil: 0 }));
      const q = Number(c[idx.QT_ELEITORES]);
      s.e += q; if (c[idx.CD_RACA_COR] === '4') s.ind += q; if (c[idx.CD_QUILOMBOLA] === '1') s.quil += q;
    }
    console.log('perfil', uf);
  }
}
function categorizar(lista, turno) {
  const porK = new Map(lista.map((s) => [s.k, s]));
  for (const [k, p] of perfilBruto) {
    const s = porK.get(principal.get(`${turno}:${k}`) ?? k);
    if (!s) continue;
    s.pf ??= { e: 0, ind: 0, quil: 0 }; s.pf.e += p.e; s.pf.ind += p.ind; s.pf.quil += p.quil;
  }
  for (const s of lista) {
    const l = local.get(`${turno}:${s.k}`) ?? {};
    const pInd = s.pf?.e ? s.pf.ind / s.pf.e : 0, pQuil = s.pf?.e ? s.pf.quil / s.pf.e : 0;
    s.cat = s.uf === 'zz' ? 'exterior' : l.tipo === 'Preso provisório' ? 'prisional' : l.tipo === 'Voto em trânsito' ? 'transito'
      : /ALDEIA|IND[IÍ]GENA|TERRA IND/i.test(l.nome ?? '') || pInd >= 0.5 ? 'indigena'
        : /QUILOMBO/i.test(l.nome ?? '') || pQuil >= 0.5 ? 'quilombola' : l.tipo === 'Temporário' ? 'temporario' : 'comum';
  }
  return lista.filter((s) => s.pf?.e > 0).length;
}
R.secoesComPerfil2t = categorizar(T2, 2);
categorizar(T1, 1);
await mkdir(SAIDA, { recursive: true });
await writeFile(CACHE, JSON.stringify({ comPerfil2t: R.secoesComPerfil2t, t2: Object.fromEntries(T2.map((s) => [s.k, s.cat])), t1: Object.fromEntries(T1.map((s) => [s.k, s.cat])) }));
}

// ---------- funções estatísticas próprias ----------
const lgam = (() => { const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  const f = (x) => { if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - f(1 - x); x -= 1; let a = c[0]; const t = x + g + 0.5; for (let i = 1; i < 9; i++) a += c[i] / (x + i); return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a); }; return f; })();
function qGama(a, x) { // gama incompleta superior regularizada
  if (x <= 0) return 1; const gl = lgam(a);
  if (x < a + 1) { let s = 1 / a, d = s, ap = a; for (let n = 0; n < 2000; n++) { ap++; d *= x / ap; s += d; if (Math.abs(d) < Math.abs(s) * 1e-16) break; } return 1 - s * Math.exp(-x + a * Math.log(x) - gl); }
  let b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
  for (let i = 1; i < 2000; i++) { const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300; c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const de = d * c; h *= de; if (Math.abs(de - 1) < 1e-16) break; }
  return Math.exp(-x + a * Math.log(x) - gl) * h;
}
const chi2 = (obs, prop) => { const n = obs.reduce((a, b) => a + b, 0); let x = 0; obs.forEach((o, i) => { x += (o - n * prop[i]) ** 2 / (n * prop[i]); }); return { n, x2: x, p: qGama((obs.length - 1) / 2, x / 2) }; };
const holm = (ps) => { const o = ps.map((p, i) => [p, i]).sort((a, b) => a[0] - b[0]); const r = []; let mx = 0; o.forEach(([p, i], k) => { mx = Math.max(mx, Math.min(1, (ps.length - k) * p)); r[i] = mx; }); return r; };
const med = (v) => { const a = Float64Array.from(v).sort(); const n = a.length; return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2; };
const corr = (x, y) => { const n = x.length; if (n < 3) return NaN; const mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { const a = x[i] - mx, b = y[i] - my; sxy += a * b; sxx += a * a; syy += b * b; } return sxx && syy ? sxy / Math.sqrt(sxx * syy) : NaN; };
const agrupar = (l, f) => { const m = new Map(); for (const s of l) { const k = f(s); if (!m.has(k)) m.set(k, []); m.get(k).push(s); } return m; };
const r3 = (x) => Math.round(x * 1000) / 1000;

// ---------- totais ----------
const comVoto = T2.filter((s) => s.val > 0);
R.t2 = { secoesComVoto: comVoto.length, v13: comVoto.reduce((a, s) => a + s.v13, 0), v22: comVoto.reduce((a, s) => a + s.v22, 0), outros: comVoto.reduce((a, s) => a + s.outros, 0) };
const t1p = T1.filter((s) => UFS_1T_PARCIAL.includes(s.uf));
R.t1parcial = { ufs: UFS_1T_PARCIAL.length, secoes: t1p.length, secoesComVoto: t1p.filter((s) => s.val > 0).length, ufsNoBanco1t: [...new Set(T1.map((s) => s.uf))].sort() };

// ---------- comparecimento e Klimek (determinístico) ----------
function klimek(lista) {
  const S = lista.filter((s) => s.aptos > 0 && s.val > 0);
  const cps = S.map((s) => s.cp);
  const igual100 = S.filter((s) => s.comp === s.aptos);
  const out = { secoes: S.length, mediana: r3(med(cps)), acima100: S.filter((s) => s.comp > s.aptos).length, igual100: igual100.length,
    aptosIgual100: [Math.min(...igual100.map((s) => s.aptos)), Math.max(...igual100.map((s) => s.aptos))],
    igual100Lista: igual100.map((s) => `${s.k} aptos ${s.aptos} 13=${s.v13} 22=${s.v22}`),
    ge95: cps.filter((x) => x >= 0.95).length, ge94: cps.filter((x) => x >= 0.94).length, faixa80a84: cps.filter((x) => x >= 0.8 && x < 0.84).length };
  out.ge94pct = +(100 * out.ge94 / S.length).toFixed(2);
  const media = (f) => { const g = S.filter(f); return { n: g.length, parcela13Media: +(100 * g.reduce((a, s) => a + s.v13 / s.val, 0) / g.length).toFixed(1) }; };
  out.faixa98a100 = media((s) => s.cp >= 0.98 && s.cp <= 1);
  out.faixa50a60 = media((s) => s.cp >= 0.5 && s.cp < 0.6);
  for (const c of [13, 22]) {
    const par = (s) => s[`v${c}`] / s.val;
    const canto = S.filter((s) => s.cp >= 0.95 && par(s) >= 0.95);
    out[`canto95_${c}`] = canto.length;
    out[`canto95_${c}_categorias`] = canto.reduce((a, s) => ((a[s.cat] = (a[s.cat] ?? 0) + 1), a), {});
    const zonas = agrupar(S, (s) => `${s.uf}/${s.zona}`);
    const corrDentro = (filtro) => { const dx = [], dy = []; const porZona = [];
      for (const g0 of zonas.values()) { const g = g0.filter(filtro); if (g.length < 3) continue; const xs = g.map((s) => s.cp), ys = g.map(par);
        if (g.length >= 20) porZona.push(corr(xs, ys));
        const mx = xs.reduce((a, b) => a + b, 0) / g.length, my = ys.reduce((a, b) => a + b, 0) / g.length;
        xs.forEach((x, i) => { dx.push(x - mx); dy.push(ys[i] - my); }); }
      const rs = porZona.filter((r) => !Number.isNaN(r));
      return { rDentroZona: r3(corr(dx, dy)), secoesNoCalculo: dx.length, zonas20: rs.length, zonasRmaior05: rs.filter((r) => r > 0.5).length };
    };
    out[`correlacao_${c}`] = corrDentro(() => true);
    out[`correlacaoPorUf_${c}`] = Object.fromEntries([...new Set(S.map((s) => s.uf))].sort().map((uf) => [uf, corrDentro((s) => s.uf === uf).rDentroZona]));
  }
  return out;
}
R.klimek2t = klimek(T2);
R.klimek1tParcial = (({ acima100, igual100, aptosIgual100 }) => ({ acima100, igual100, aptosIgual100 }))(klimek(t1p));
console.log('klimek ok');

// ---------- concentração (beta-binomial, método dos momentos, deixa a seção de fora da taxa) ----------
function concentracao(lista) {
  const S = lista.filter((s) => s.val > 0);
  const kMin = (n, t) => Math.floor((t * n + 99) / 100);
  const MAXN = S.reduce((a, s) => Math.max(a, s.val), 0) + 1;
  const lf = new Float64Array(MAXN + 1); for (let i = 1; i <= MAXN; i++) lf[i] = lf[i - 1] + Math.log(i);
  const lc = (n, k) => lf[n] - lf[k] - lf[n - k];
  const lb = (a, b) => lgam(a) + lgam(b) - lgam(a + b);
  const zonas = agrupar(S, (s) => `${s.uf}/${s.zona}`), muns = agrupar(S, (s) => `${s.uf}/${s.municipio}`);
  const limite = 0.05 / (S.length * 2);
  const out = { secoes: S.length, limite };
  for (const c of [13, 22]) {
    const v = `v${c}`;
    const Z = new Map(), M = new Map();
    for (const [k, g] of zonas) {
      let X = 0, N = 0; for (const s of g) { X += s[v]; N += s.val; }
      const p = X / N; let rho = 0;
      if (g.length >= 3 && p > 0 && p < 1) { let Sx = 0, n2 = 0; for (const s of g) { Sx += s.val * (s[v] / s.val - p) ** 2; n2 += s.val * s.val; }
        const den = N - n2 / N - (g.length - 1); rho = den > 0 ? (Sx / (p * (1 - p)) - (g.length - 1)) / den : 0; rho = Math.min(Math.max(rho, 0), 0.99); }
      Z.set(k, { X, N, rho });
    }
    for (const [k, g] of muns) { let X = 0, N = 0; for (const s of g) { X += s[v]; N += s.val; } M.set(k, { X, N }); }
    const obs = { '90-95': 0, '95-99': 0, '99-100': 0, 100: 0 }, esp = { '90-95': 0, '95-99': 0, '99-100': 0, 100: 0 };
    const porCat = {}; const lista100 = []; let surpreendentes = 0; const sur = [];
    for (const s of S) {
      const n = s.val, x = s[v]; const z = Z.get(`${s.uf}/${s.zona}`), m = M.get(`${s.uf}/${s.municipio}`);
      const pz = z.N - n > 0 ? (z.X - x) / (z.N - n) : m.N - n > 0 ? (m.X - x) / (m.N - n) : z.X / z.N;
      const k90 = kMin(n, 90), k95 = kMin(n, 95), k99 = kMin(n, 99);
      let termo;
      const pc = Math.min(Math.max(pz, 1e-6), 1 - 1e-6);
      if (z.rho > 0) { const sc = (1 - z.rho) / z.rho, a = pc * sc, b = (1 - pc) * sc, base = lb(a, b); termo = (j) => Math.exp(lc(n, j) + lb(j + a, n - j + b) - base); }
      else if (pz <= 0) termo = () => 0; else if (pz >= 1) termo = (j) => (j === n ? 1 : 0);
      else termo = (j) => Math.exp(lc(n, j) + j * Math.log(pz) + (n - j) * Math.log1p(-pz));
      const lo = Math.min(k90, x); const cauda = new Map(); let acc = 0;
      for (let j = n; j >= lo; j--) { acc += termo(j); cauda.set(j, Math.min(1, acc)); }
      const T = (k) => cauda.get(k) ?? Math.min(1, acc);
      const pr = { '90-95': T(k90) - T(k95), '95-99': T(k95) - T(k99), '99-100': T(k99) - T(n), 100: T(n) };
      porCat[s.cat] ??= { obs: 0, esp: 0 };
      for (const f in pr) { esp[f] += pr[f]; porCat[s.cat].esp += pr[f]; }
      if (x >= k90) {
        const f = x === n ? 100 : x >= k99 ? '99-100' : x >= k95 ? '95-99' : '90-95';
        obs[f]++; porCat[s.cat].obs++;
        if (x === n) lista100.push(s);
        if (T(x) < limite) { surpreendentes++; sur.push(s); }
      }
    }
    const r1 = (o) => Object.fromEntries(Object.entries(o).map(([k, x]) => [k, Math.round(x * 10) / 10]));
    out[c] = { obs, esp: r1(esp), obsTotal: Object.values(obs).reduce((a, b) => a + b, 0), espTotal: +Object.values(esp).reduce((a, b) => a + b, 0).toFixed(1),
      porCategoria: Object.fromEntries(Object.entries(porCat).map(([k, x]) => [k, { obs: x.obs, esp: +x.esp.toFixed(1) }])),
      cem: lista100.length, cemPorCategoria: lista100.reduce((a, s) => ((a[s.cat] = (a[s.cat] ?? 0) + 1), a), {}),
      cemValidos: lista100.map((s) => s.val), cemMunicipios: lista100.map((s) => `${nomeMun.get(s.municipio)}-${s.uf}`),
      surpreendentes, surpreendentesComunsMunicipios: [...new Set(sur.filter((s) => s.cat === 'comum').map((s) => `${nomeMun.get(s.municipio)}-${s.uf}`))] };
  }
  const cem = [...out[13].cemValidos, ...out[22].cemValidos];
  out.cemJuntos = { n: cem.length, mediana: med(cem), menos50: cem.filter((x) => x < 50).length, maior: cem.reduce((a, b) => Math.max(a, b), 0) };
  return out;
}
R.concentracao2t = concentracao(T2);
for (const c of [13, 22]) { delete R.concentracao2t[c].cemValidos; }
{
  const c2 = concentracao(T2.filter((s) => UFS_1T_CARGA1.includes(s.uf)));
  const c1 = concentracao(T1.filter((s) => UFS_1T_CARGA1.includes(s.uf)));
  R.razaoCarga1 = { t1: { obs: c1[13].obsTotal, esp: c1[13].espTotal, razao: +(c1[13].obsTotal / c1[13].espTotal).toFixed(2) },
    t2: { obs: c2[13].obsTotal, esp: c2[13].espTotal, razao: +(c2[13].obsTotal / c2[13].espTotal).toFixed(2) } };
}
console.log('concentracao ok');

// ---------- estabilidade 1º → 2º turno (15 UFs) ----------
{
  const um = new Map(t1p.map((s) => [s.k, s]));
  const est = {};
  for (const c of [13, 22]) {
    const v = `v${c}`;
    const ge90 = comVoto.filter((s) => s[v] * 100 >= 90 * s.val && UFS_1T_PARCIAL.includes(s.uf));
    const com1 = ge90.filter((s) => um.get(s.k)?.val > 0);
    const p1 = (s) => { const o = um.get(s.k); return o[v] / o.val; };
    const cem = com1.filter((s) => s[v] === s.val);
    est[c] = { ge90com1t: com1.length, ge80no1t: com1.filter((s) => p1(s) >= 0.8).length, salto20: com1.filter((s) => s[v] / s.val - p1(s) >= 0.2).length,
      cemCom1t: cem.length, cemGe90no1t: cem.filter((s) => p1(s) >= 0.9).length };
  }
  R.estabilidade15ufs = est;
}

// ---------- dígitos (referências fixas: uniforme e Benford) ----------
{
  const S = T2.filter((s) => s.val > 0);
  const B1 = Array.from({ length: 9 }, (_, d) => Math.log10(1 + 1 / (d + 1)));
  const B2 = Array.from({ length: 10 }, (_, d) => { let p = 0; for (let k = 1; k <= 9; k++) p += Math.log10(1 + 1 / (10 * k + d)); return p; });
  const U = new Array(10).fill(0.1);
  const cont = {};
  for (const s of S) for (const c of [13, 22]) for (const uf of [s.uf, 'BR']) {
    const o = (cont[`${uf}/${c}`] ??= { u: new Array(10).fill(0), d2: new Array(10).fill(0), d1: new Array(9).fill(0) });
    const x = s[`v${c}`];
    if (x >= 100) o.u[x % 10]++;
    if (x >= 10) { const t = String(x); o.d2[Number(t[1])]++; }
    if (x >= 1) o.d1[Number(String(x)[0]) - 1]++;
  }
  const fam = Object.entries(cont).filter(([k, o]) => !k.startsWith('BR/') && o.u.reduce((a, b) => a + b, 0) >= 50);
  const sig = (f) => { const ps = fam.map(([, o]) => f(o).p); return holm(ps).filter((p) => p < 0.05).length; };
  const br13 = cont['BR/13'];
  const nU = br13.u.reduce((a, b) => a + b, 0);
  R.digitos2t = { testes: fam.length, ultimoXuniforme: sig((o) => chi2(o.u, U)), segundoXbenford: sig((o) => chi2(o.d2, B2)),
    br13ultimo0pct: +(100 * br13.u[0] / nU).toFixed(1), br13ultimo9pct: +(100 * br13.u[9] / nU).toFixed(1),
    br13primeiroXbenfordChi2: Math.round(chi2(br13.d1, B1).x2) };
}
console.log('digitos ok');

// ---------- números redondos (esperado = média dos vizinhos v±1, v±2) ----------
function redondos(lista) {
  const S = lista.filter((s) => s.val > 0 && s.aptos > 0);
  const out = {};
  for (const [nome, f] of Object.entries({ v13: (s) => s.v13, v22: (s) => s.v22, branco: (s) => s.branco, nulo: (s) => s.nulo, comparecimento: (s) => s.comp })) {
    const h = new Map(); let max = 0; for (const s of S) { const v = f(s); h.set(v, (h.get(v) ?? 0) + 1); if (v > max) max = v; }
    const H = (v) => h.get(v) ?? 0; out[nome] = {};
    for (const m of [10, 50, 100]) { let o = 0, e = 0; for (let v = m; v <= max; v += m) { o += H(v); e += (H(v - 2) + H(v - 1) + H(v + 1) + H(v + 2)) / 4; }
      out[nome][m] = { obs: o, esp: Math.round(e), z: +((o - e) / Math.sqrt(e)).toFixed(1) }; }
  }
  return out;
}
R.redondos2t = redondos(T2);
R.redondos1tParcial_v22 = redondos(t1p).v22;
R.redondos2tMesmas15_v22 = redondos(T2.filter((s) => UFS_1T_PARCIAL.includes(s.uf))).v22;
R.redondos1tParcialPorUf_v22x10 = Object.fromEntries(UFS_1T_PARCIAL.map((uf) => { const r = redondos(t1p.filter((s) => s.uf === uf)).v22[10]; return [uf, r.obs > r.esp ? 'acima' : 'abaixo/igual']; }));

// ---------- z robusto sem perfil (zonas com ≥ 10 seções) ----------
{
  const S = T2.filter((s) => s.val > 0 && s.aptos > 0);
  const grandes = [...agrupar(S, (s) => `${s.uf}/${s.zona}`).values()].filter((g) => g.length >= 10);
  const z = (g, f) => { const vs = g.map(f); const m = med(vs); const mad = 1.4826 * med(vs.map((x) => Math.abs(x - m))); return vs.map((x) => (mad > 0 ? (x - m) / mad : null)); };
  const out = {};
  for (const [nome, f] of Object.entries({ p13: (s) => s.v13 / s.val, p22: (s) => s.v22 / s.val, comp: (s) => s.cp })) {
    const alto = [], baixo = [];
    for (const g of grandes) z(g, f).forEach((v, i) => { if (v == null) return; if (v >= 5) alto.push(g[i]); if (v <= -5) baixo.push(g[i]); });
    out[nome] = { alto: alto.length, baixo: baixo.length, altoCategorias: alto.reduce((a, s) => ((a[s.cat] = (a[s.cat] ?? 0) + 1), a), {}) };
    if (nome === 'comp') {
      const vence = new Map(); for (const s of S) { if (s.v13 === s.v22) continue; const k = `${s.uf}/${s.zona}`; const v = vence.get(k) ?? { a: 0, n: 0 }; v.n++; if (s.v13 > s.v22) v.a++; vence.set(k, v); }
      const al = alto.filter((s) => s.v13 !== s.v22);
      const e13 = al.reduce((a, s) => { const v = vence.get(`${s.uf}/${s.zona}`); return a + v.a / v.n; }, 0);
      Object.assign(out[nome], { aptos: [Math.min(...alto.map((s) => s.aptos)), Math.max(...alto.map((s) => s.aptos))],
        vence13: al.filter((s) => s.v13 > s.v22).length, vence22: al.filter((s) => s.v22 > s.v13).length, esp13: +e13.toFixed(1), esp22: +(al.length - e13).toFixed(1) });
    }
  }
  R.zscore2t = out;
}

// ---------- casos citados ----------
{
  const um = new Map(T1.map((s) => [s.k, s])), dois = new Map(T2.map((s) => [s.k, s]));
  const caso = (k) => ({ t1: um.get(k) && (({ aptos, comp, v13, v22, tipo_urna }) => ({ aptos, comp, v13, v22, tipo_urna }))(um.get(k)),
    t2: dois.get(k) && (({ aptos, comp, v13, v22, branco, nulo, tipo_urna }) => ({ aptos, comp, v13, v22, branco, nulo, tipo_urna }))(dois.get(k)), municipio: nomeMun.get(k.split('/')[1]) });
  R.casos = Object.fromEntries(['am/02399/0045/0063', 'mt/90280/0028/0200', 'rs/89028/0034/0433', 'rn/16454/0036/0069', 'ce/15989/0055/0160'].map((k) => [k, caso(k)]));
}

await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, '09-padroes.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
