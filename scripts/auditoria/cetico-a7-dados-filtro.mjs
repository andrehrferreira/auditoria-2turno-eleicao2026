// Revisor cético, achado A7, lente "dados e definições": refaz o filtro de risco das seções ≥ 95% (639 no 2º turno).
// O autor soma dois campos de natureza diferente do BU e compara com a zona por binomial:
//   semBiometriaCadastrada (composição do CADASTRO: eleitor sem digital coletada) +
//   comBiometriaHabilitadosPorAnoNascimento (FALHA da digital no dia, liberação manual).
// Aqui: (a) p binomial do autor; (b) p beta-binomial com a variação real entre seções da zona; (c) cada componente
// separado — sem biometria cadastrada ÷ comparecimento e falha ÷ (quem tinha biometria e votou); (d) a parcela sem
// biometria esperada pelo cadastro da seção (perfil_eleitor_secao, 14/07/2026), só onde a seção não mudou de tamanho
// depois do cadastro (eleitorado_local_votacao: QT_ELEITOR_SECAO = QT_ELEITOR_ELEICAO_FEDERAL); (e) a média 9,37% × 12,42%
// refeita contra a taxa da própria zona de cada seção.
// Somente leitura. Uso: node scripts/auditoria/cetico-a7-dados-filtro.mjs --elv <eleitorado_local_votacao_2026_BRASIL.csv extraído>
// Saída: data/parsed/auditoria/cetico/a7-dados-filtro.csv e resumo no terminal
import { createReadStream, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DatabaseSync } from 'node:sqlite';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({ options: { elv: { type: 'string' } } });
const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const k4 = (uf, m, z, s) => `${uf}/${m}/${z}/${s}`;

// lista do autor
const csv = readFileSync(path.join(RAIZ, 'data/parsed/auditoria/contagem/a7-2t-secoes.csv'), 'utf8').trim().split('\n');
const cab = csv[0].split(';');
const lista = csv.slice(1).map((l) => Object.fromEntries(l.split(';').map((v, i) => [cab[i], v])));
const chaves = new Set(lista.map((r) => k4(r.uf, r.municipio, r.zona, r.secao)));

// zonas do banco (2º turno, eleição federal)
const db = new DatabaseSync(path.join(RAIZ, 'data/db/eleicao2026.sqlite'), { readOnly: true });
const linhas = db.prepare(`SELECT s.uf, s.municipio, s.zona, s.secao, e.aptos, s.comparecimento AS comp, s.sem_biometria AS sb, s.por_biometria AS bio, s.por_biografia AS pb
  FROM secao s JOIN secao_eleicao e USING (turno, uf, municipio, zona, secao) WHERE s.turno = 2 AND e.eleicao = 6258 AND s.situacao = 'completa' AND s.sem_biometria IS NOT NULL`).all();
const zonas = new Map();
for (const r of linhas) { const k = `${r.uf}|${r.municipio}|${r.zona}`; if (!zonas.has(k)) zonas.set(k, []); zonas.get(k).push(r); }
const porChave = new Map(linhas.map((r) => [k4(r.uf, r.municipio, r.zona, r.secao), r]));

const lf = [0]; const lnF = (n) => { for (let i = lf.length; i <= n; i++) lf[i] = lf[i - 1] + Math.log(i); return lf[n]; };
const cauda = (n, k, p) => { if (k <= 0) return 1; if (p <= 0) return 0; let s = 0; for (let x = k; x <= n; x++) s += Math.exp(lnF(n) - lnF(x) - lnF(n - x) + x * Math.log(p) + (n - x) * Math.log(1 - p)); return Math.min(1, s); };
const LZ = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
const lnG = (z) => { if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnG(1 - z); z -= 1; let x = LZ[0]; for (let i = 1; i < 9; i++) x += LZ[i] / (z + i); const t = z + 7.5; return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x); };
const caudaBB = (n, k, p, rho) => { if (k <= 0) return 1; if (p <= 0) return 0; const s = (1 - rho) / rho; const a = p * s; const b = (1 - p) * s; const base = lnG(a + b) - lnG(a) - lnG(b) - lnG(n + a + b) + lnF(n); let t = 0; for (let x = k; x <= n; x++) t += Math.exp(base - lnF(x) - lnF(n - x) + lnG(x + a) + lnG(n - x + b)); return Math.min(1, t); };
function ref(rows, alvo, num, den) {
  const R = rows.filter((r) => r !== alvo && den(r) > 1);
  const N = R.reduce((s, r) => s + den(r), 0); const K = R.reduce((s, r) => s + num(r), 0);
  if (!N || !R.length) return null;
  const p = K / N; if (p <= 0 || p >= 1) return { p, rho: 1e-6 };
  let q = 0; let n1 = 0; for (const r of R) { const n = den(r); q += (num(r) - n * p) ** 2 / (n * p * (1 - p)) - 1; n1 += n - 1; }
  return { p, rho: Math.min(0.5, Math.max(1e-6, n1 > 0 ? q / n1 : 1e-6)) };
}

// cadastro por seção (biometria-cadastro.mjs, perfil_eleitor_secao de 14/07/2026)
const cad = new Map();
for await (const l of createInterface({ input: createReadStream(path.join(RAIZ, 'data/parsed/auditoria/biometria/cadastro-secao.jsonl')), crlfDelay: Infinity })) {
  if (!l) continue; const i = l.indexOf('"', 6); const k = l.slice(6, i); if (!chaves.has(k)) continue; const r = JSON.parse(l); cad.set(k, r);
}
// eleitorado por local de votação (dados abertos de 25/10/2026): tamanho original da seção × aptos após distribuições/TTE
const elv = new Map();
if (args.elv) {
  for await (const l of createInterface({ input: createReadStream(args.elv, { encoding: 'latin1' }), crlfDelay: Infinity })) {
    const c = l.split(';').map((x) => x.replace(/^"|"$/g, ''));
    if (c[5] !== '2') continue;
    const k = k4(c[6].toLowerCase(), c[7].padStart(5, '0'), c[9].padStart(4, '0'), c[10].padStart(4, '0'));
    if (chaves.has(k)) elv.set(k, { original: Number(c[34]), federal: Number(c[35]), tipo: c[12] });
  }
}

const out = [];
let obsAgr = 0; let espAgr = 0; let compAgr = 0;
for (const x of lista) {
  const k = k4(x.uf, x.municipio, x.zona, x.secao); const r = porChave.get(k); if (!r) continue;
  const rows = zonas.get(`${r.uf}|${r.municipio}|${r.zona}`);
  const comb = ref(rows, r, (y) => y.sb + y.pb, (y) => y.comp);
  const sbR = ref(rows, r, (y) => y.sb, (y) => y.comp);
  const fa = ref(rows, r, (y) => y.pb, (y) => y.pb + y.bio);
  if (comb) { obsAgr += r.sb + r.pb; espAgr += r.comp * comb.p; compAgr += r.comp; }
  const c = cad.get(k); const e = elv.get(k);
  const estavel = e ? e.original === e.federal : null;
  const semBioCad = c ? c.eleitores - c.biometria : null;
  out.push({ k, aptos: r.aptos, comp: r.comp, sb: r.sb, pb: r.pb, bio: r.bio,
    pAutor: comb ? cauda(r.comp, r.sb + r.pb, comb.p) : null, pBB: comb ? caudaBB(r.comp, r.sb + r.pb, comb.p, comb.rho) : null,
    taxaZona: comb?.p, pSbBB: sbR ? caudaBB(r.comp, r.sb, sbR.p, sbR.rho) : null, pFalhaBB: fa ? caudaBB(r.pb + r.bio, r.pb, fa.p, fa.rho) : null,
    falha: r.pb / Math.max(1, r.pb + r.bio), falhaZona: fa?.p,
    eleitoresCadastro: c?.eleitores ?? null, semBioCadastro: semBioCad, qtOriginal: e?.original ?? null, qtFederal: e?.federal ?? null, estavel,
    sbSobreCadastro: semBioCad ? r.sb / semBioCad : null });
}
const risco = out.filter((o) => o.pAutor !== null && o.pAutor < 0.001);
const nAut = risco.length;
const bb = out.filter((o) => o.pBB !== null && o.pBB < 0.001);
const bonf = 0.05 / out.length;
const falha = out.filter((o) => o.pFalhaBB !== null && o.pFalhaBB < 0.001);
const sbSo = out.filter((o) => o.pSbBB !== null && o.pSbBB < 0.001);
const instaveis = out.filter((o) => o.estavel === false);
// decomposição do excesso nas 23 do autor: quanto vem de "sem biometria cadastrada" e quanto de "falha"
let exSb = 0; let exPb = 0; let exSbCad = 0; let nCad = 0;
for (const o of risco) {
  const rows = zonas.get(o.k.split('/').slice(0, 3).join('|'));
  const r = porChave.get(o.k);
  const sbR = ref(rows, r, (y) => y.sb, (y) => y.comp); const pbR = ref(rows, r, (y) => y.pb, (y) => y.comp);
  exSb += o.sb - o.comp * sbR.p; exPb += o.pb - o.comp * pbR.p;
  // parte do excesso sem biometria que o cadastro da seção já prevê (só seções estáveis): comp × (semBioCad/eleitores) − comp × taxa da zona
  if (o.estavel && o.eleitoresCadastro) { exSbCad += Math.min(o.sb - o.comp * sbR.p, o.comp * (o.semBioCadastro / o.eleitoresCadastro) - o.comp * sbR.p); nCad++; }
}
const fmt = (v) => (v === null || v === undefined ? '' : typeof v === 'number' ? (Math.abs(v) < 1e-3 && v !== 0 ? v.toExponential(2) : +v.toFixed(4)) : v);
const cols = ['k', 'aptos', 'comp', 'sb', 'pb', 'bio', 'taxaZona', 'pAutor', 'pBB', 'pSbBB', 'falha', 'falhaZona', 'pFalhaBB', 'eleitoresCadastro', 'semBioCadastro', 'qtOriginal', 'qtFederal', 'estavel', 'sbSobreCadastro'];
mkdirSync(path.join(RAIZ, 'data/parsed/auditoria/cetico'), { recursive: true });
writeFileSync(path.join(RAIZ, 'data/parsed/auditoria/cetico/a7-dados-filtro.csv'), [cols.join(';'), ...out.map((o) => cols.map((c) => fmt(o[c])).join(';'))].join('\n') + '\n');
console.log(`Seções ≥ 95%: ${out.length}`);
console.log(`Liberação sem digital (sb+pb)/comp nas seções ≥ 95%: ${(100 * obsAgr / compAgr).toFixed(2)}%; esperado pela taxa da própria zona: ${(100 * espAgr / compAgr).toFixed(2)}%`);
console.log(`Filtro do autor (binomial, p < 0,001): ${nAut}`);
console.log(`Mesmo teste com beta-binomial (variação real entre seções da zona), p < 0,001: ${bb.length}; p < Bonferroni (${bonf.toExponential(1)}): ${out.filter((o) => o.pBB < bonf).length}`);
console.log(`Só "sem biometria cadastrada" (beta-binomial) p < 0,001: ${sbSo.length} · só "falha da digital" (beta-binomial) p < 0,001: ${falha.length}; p < Bonferroni: ${out.filter((o) => o.pFalhaBB < bonf).length}`);
console.log(`Seções ≥ 95% cujo tamanho mudou depois do cadastro (QT_ELEITOR_SECAO ≠ aptos federal): ${instaveis.length} de ${out.filter((o) => o.estavel !== null).length}; nas 23 do autor: ${risco.filter((o) => o.estavel === false).length}`);
console.log(`Excesso nas 23 do autor (contra a zona): sem biometria cadastrada ${exSb.toFixed(0)} eleitores, falha da digital ${exPb.toFixed(0)}; parte do excesso sem biometria já prevista pelo cadastro (${nCad} seções estáveis): ${exSbCad.toFixed(0)}`);
console.log('\n23 do autor:');
for (const o of risco.sort((a, b) => a.pAutor - b.pAutor)) console.log(`  ${o.k}: comp ${o.comp}/${o.aptos} sb ${o.sb} pb ${o.pb} | pAutor ${fmt(o.pAutor)} pBB ${fmt(o.pBB)} | sb p ${fmt(o.pSbBB)} | falha ${(100 * o.falha).toFixed(1)}% × zona ${(100 * o.falhaZona).toFixed(1)}% p ${fmt(o.pFalhaBB)} | cadastro ${o.eleitoresCadastro} (sem bio ${o.semBioCadastro}) original ${o.qtOriginal} federal ${o.qtFederal} sb/semBioCad ${fmt(o.sbSobreCadastro)}`);
