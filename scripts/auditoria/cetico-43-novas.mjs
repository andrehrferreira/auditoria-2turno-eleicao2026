// Cético, parecer 43: seções novas de 2026 com comparecimento ≥ 95% — reprodução do controle por tamanho e por
// juventude do demógrafo (doc 08, item 5b) por caminho próprio, e sensibilidade da escolha dos estratos e do limiar.
//  "nova" = chave fora do CEFT 1º turno 2022 ou (fora de DF e exterior) fora do CEFT 2024 (mesma regra do doc 08).
//  BU 2026 (situação completa, sem Sistema de Apuração), aptos do BU de Presidente (secao_eleicao 6257/6258).
//  Juventude = (16–17 + 18–20) ÷ eleitores do perfil por seção (biometria/cadastro-secao.jsonl, outra leitura do bruto
//  que a do demógrafo), somando as seções agregadas na principal.
//  Padronização indireta: em cada estrato, a taxa de ≥ limiar das ANTIGAS; esperado = Σ dessa taxa nas novas.
// Agregado por seção; nada de CPF.
// Uso: node --max-old-space-size=6000 scripts/auditoria/cetico-43-novas.mjs
// Saída: data/parsed/auditoria/cetico-revisor/p43/novas.json
import { readFileSync, readdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { linhasZip } from './seguranca-h27-lib.mjs';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', 'p43');
const DA = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'correspondencias');
const K = (uf, m, z, s) => `${String(uf).toLowerCase()}/${String(Number(m)).padStart(5, '0')}/${String(Number(z)).padStart(4, '0')}/${String(Number(s)).padStart(4, '0')}`;
async function chavesCeft(pasta) { const s = new Set(); for (const n of readdirSync(path.join(DA, pasta)).filter((x) => x.startsWith('CEFT_'))) for await (const r of linhasZip(path.join(DA, pasta, n))) s.add(K(r.SG_UF, r.CD_MUNICIPIO, r.NR_ZONA, r.NR_SECAO)); return s; }
const c22 = await chavesCeft('2022-1t'); const c24 = await chavesCeft('2024-1t');
const fora = (k) => k.startsWith('zz/') || k.startsWith('df/');
const nova = (k) => !c22.has(k) || (!fora(k) && !c24.has(k));

const cad = new Map();
for (const l of readFileSync(path.join(DIR_DADOS, 'parsed', 'auditoria', 'biometria', 'cadastro-secao.jsonl'), 'utf8').split('\n')) { if (!l) continue; const o = JSON.parse(l); cad.set(o.k, [o.eleitores, (o.faixas['16a17'] ?? 0) + (o.faixas['18a20'] ?? 0), o.biometria]); }

const { db, fonte } = await abrirLeitura();
const S = { 1: new Map(), 2: new Map() }; const excl = { 1: { semArquivo: 0, sa: 0, semAptos: 0 }, 2: { semArquivo: 0, sa: 0, semAptos: 0 } };
for (const r of db.prepare(`SELECT s.turno, s.uf, s.municipio, s.zona, s.secao, s.situacao, s.tipo_arquivo, s.comparecimento c, e.aptos a, e.aptos_tte tte
  FROM secao s LEFT JOIN secao_eleicao e ON e.turno = s.turno AND e.uf = s.uf AND e.municipio = s.municipio AND e.zona = s.zona AND e.secao = s.secao AND e.eleicao IN (6257, 6258)`).iterate()) {
  if (r.situacao !== 'completa') { excl[r.turno].semArquivo++; continue; }
  if (/^sa/.test(r.tipo_arquivo ?? '')) { excl[r.turno].sa++; continue; }
  if (!r.a) { excl[r.turno].semAptos++; continue; }
  const k = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
  S[r.turno].set(k, { k, c: r.c, a: r.a, tte: r.tte ?? 0, nova: nova(k), p: null });
}
const membros = { 1: new Map(), 2: new Map() };
for (const r of db.prepare('SELECT turno, uf, municipio, zona, secao, secao_principal FROM secao_agregada').iterate()) { const p = `${r.uf}/${r.municipio}/${r.zona}/${r.secao_principal}`; (membros[r.turno].get(p) ?? membros[r.turno].set(p, []).get(p)).push(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`); }
db.close();
for (const t of [1, 2]) for (const [k, x] of S[t]) { let p = null; for (const m of [k, ...(membros[t].get(k) ?? [])]) { const q = cad.get(m); if (q) { p ??= [0, 0, 0]; q.forEach((y, i) => { p[i] += y; }); } } x.p = p; }

function padroniza(L, estrato, lim = 0.95, minAntigas = 1) {
  const T = new Map(); for (const x of L) if (!x.nova) { const e = estrato(x); const v = T.get(e) ?? T.set(e, [0, 0]).get(e); v[0]++; if (x.c / x.a >= lim) v[1]++; }
  let obs = 0; let esp = 0; let semBase = 0; let semBaseGe = 0; let novas = 0;
  for (const x of L) { if (!x.nova) continue; novas++; const ge = x.c / x.a >= lim; if (ge) obs++; const v = T.get(estrato(x)); if (!v || v[0] < minAntigas) { semBase++; if (ge) semBaseGe++; continue; } esp += v[1] / v[0]; }
  return { novas, observadas: obs, esperadas: +esp.toFixed(1), razao: esp ? +((obs - semBaseGe) / esp).toFixed(2) : null, excesso: +(obs - semBaseGe - esp).toFixed(1), novasSemBase: semBase, geSemBase: semBaseGe, antigasGe: [...T.values()].reduce((s, v) => s + v[1], 0) };
}
const tam25 = (x) => Math.floor(x.a / 25); const tam25c = (x) => Math.min(24, Math.floor(x.a / 25)); const tam10 = (x) => Math.min(60, Math.floor(x.a / 10));
const jov = (x) => { if (!x.p || !x.p[0]) return 's'; const q = x.p[1] / x.p[0]; return q < 0.05 ? '<5' : q < 0.1 ? '5-10' : q < 0.2 ? '10-20' : '20+'; };
const jov10 = (x) => (!x.p || !x.p[0] ? 's' : Math.min(9, Math.floor(20 * x.p[1] / x.p[0])));
const R = { fonte, exclusoes: excl, ceft: { 2022: c22.size, 2024: c24.size } };
for (const t of [1, 2]) {
  const L = [...S[t].values()]; const sT = L.filter((x) => x.tte === 0);
  const N = L.filter((x) => x.nova); const A = L.filter((x) => !x.nova); const g = (a, lim = 0.95) => a.filter((x) => x.c / x.a >= lim).length;
  R[`${t}t`] = {
    base: { novas: N.length, antigas: A.length, ge95Novas: g(N), ge95Antigas: g(A), novasSemPerfil: N.filter((x) => !x.p).length },
    tamanho25ComoDemografo: padroniza(L, tam25), tamanho25ComTetoComoParecer41: padroniza(L, tam25c, 0.95, 50), tamanho10: padroniza(L, tam10),
    tamanho25SemTTE: padroniza(sT, tam25),
    tamanho25EJuventude4: padroniza(L, (x) => `${tam25(x)}|${jov(x)}`), tamanho25EJuventude4SemTTE: padroniza(sT, (x) => `${tam25(x)}|${jov(x)}`),
    tamanho25EJuventude10: padroniza(L, (x) => `${tam25(x)}|${jov10(x)}`), tamanho10EJuventude10: padroniza(L, (x) => `${tam10(x)}|${jov10(x)}`),
    limiar90: padroniza(L, (x) => `${tam25(x)}|${jov(x)}`, 0.9), limiar98: padroniza(L, (x) => `${tam25(x)}|${jov(x)}`, 0.98),
    ge98: (() => { const a = N.filter((x) => x.c / x.a >= 0.98); const b = A.filter((x) => x.c / x.a >= 0.98); const d = (z) => ({ secoes: z.length, comTTE: z.filter((x) => x.tte > 0).length, aptosMediana: z.map((x) => x.a).sort((p, q) => p - q)[Math.floor(z.length / 2)] ?? null, ate50Aptos: z.filter((x) => x.a <= 50).length, porUF: Object.entries(z.reduce((m, x) => { m[x.k.slice(0, 2)] = (m[x.k.slice(0, 2)] ?? 0) + 1; return m; }, {})).sort((p, q) => q[1] - p[1]).slice(0, 8).map(([u, n]) => `${u} ${n}`).join(', ') }); return { novas: d(a), antigas: d(b) }; })(),
    porJuventude: Object.fromEntries(['<5', '5-10', '10-20', '20+', 's'].map((b) => { const n = N.filter((x) => jov(x) === b); const a = A.filter((x) => jov(x) === b); return [b, { novas: n.length, novasGe95: g(n), antigas: a.length, antigasGe95: g(a) }]; })),
  };
}
await writeFile(path.join(SAIDA, 'novas.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
