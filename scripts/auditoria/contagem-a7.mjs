// Auditor A (contagem), teste 4 (doc 07, A7): seções com comparecimento ≥ aptos e com comparecimento acima de 95%.
// Para cada uma: aptos da seção e em trânsito (TTE), tipo de urna e de arquivo, seções agregadas, perfil do log
// (liberações sem biometria, "já votou") e o mesmo par no outro turno, se carregado.
// Modelo nulo de referência: se o comparecimento de cada seção fosse Binomial(aptos, taxa da zona sem a própria seção),
// quantas seções passariam de 95%? (Soma das probabilidades; ignora a variação real entre seções, então é um piso.)
// Princípio 8 (doc 01): procedimento humano não explica comparecimento alto. O controle técnico com rastro é a biometria:
// para cada seção ≥ limite, a parcela liberada sem biometria ((semBiometria + porBiografia) / comparecimento, do BU) é
// comparada com a da zona (p = cauda binomial). Comparecimento alto com liberação sem biometria acima da zona é o risco.
// Uso: node scripts/auditoria/contagem-a7.mjs --turno 2 [--limite 0.95] [--uf ac]
// Saída: resumo no terminal e lista em data/parsed/auditoria/contagem/a7-<t>t-secoes.csv
import { mkdirSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({ options: { turno: { type: 'string', default: '2' }, limite: { type: 'string', default: '0.95' }, uf: { type: 'string' } } });
const turno = Number(args.turno);
const outro = turno === 1 ? 2 : 1;
const limite = Number(args.limite);
const FEDERAL = { 1: 6257, 2: 6258 };
const db = new DatabaseSync('data/db/eleicao2026.sqlite', { readOnly: true });
const carregadas = db.prepare('SELECT uf FROM carga WHERE turno = ? ORDER BY uf').all(turno).map((r) => r.uf);
const ufs = args.uf ? args.uf.split(',').filter((u) => carregadas.includes(u)) : carregadas;
const outroCarregado = new Set(db.prepare('SELECT uf FROM carga WHERE turno = ?').all(outro).map((r) => r.uf));

const q = db.prepare(`SELECT s.uf, s.municipio, m.nome AS nome_municipio, s.zona, s.secao, s.situacao, s.tipo_urna, s.tipo_arquivo, s.modelo_urna, s.status_aux,
    e.aptos, e.aptos_secao, e.aptos_tte, e.comparecimento_majoritario AS comparecimento, s.sem_biometria, s.por_biografia,
    (SELECT COUNT(*) FROM secao_agregada a WHERE a.turno = s.turno AND a.uf = s.uf AND a.municipio = s.municipio AND a.zona = s.zona AND a.secao_principal = s.secao) AS agregadas,
    p.ja_votou, p.ano_nascimento_sem_biometria, p.habilitados_pelo_mesario, p.maior_rajada_sem_biometria_10min, p.sem_biometria_ultima_hora, p.votos_computados
  FROM secao s
  JOIN secao_eleicao e ON e.turno = s.turno AND e.uf = s.uf AND e.municipio = s.municipio AND e.zona = s.zona AND e.secao = s.secao AND e.eleicao = ?
  LEFT JOIN municipio m ON m.codigo = s.municipio
  LEFT JOIN perfil_log p ON p.turno = s.turno AND p.uf = s.uf AND p.municipio = s.municipio AND p.zona = s.zona AND p.secao = s.secao AND p.hash = s.hash
  WHERE s.turno = ? AND s.uf = ? AND s.situacao = 'completa'`);
const qOutro = db.prepare(`SELECT s.tipo_urna, e.aptos, e.comparecimento_majoritario AS comparecimento FROM secao s
  JOIN secao_eleicao e ON e.turno = s.turno AND e.uf = s.uf AND e.municipio = s.municipio AND e.zona = s.zona AND e.secao = s.secao AND e.eleicao = ?
  WHERE s.turno = ? AND s.uf = ? AND s.municipio = ? AND s.zona = ? AND s.secao = ?`);

// ln Γ e cauda superior da binomial, P(X ≥ k), por soma direta dos termos (seções têm no máximo alguns milhares de aptos)
function lnFat(n) { let s = 0; for (let i = 2; i <= n; i++) s += Math.log(i); return s; }
const cacheLnFat = [0];
const lf = (n) => { while (cacheLnFat.length <= n) cacheLnFat.push(cacheLnFat[cacheLnFat.length - 1] + Math.log(cacheLnFat.length)); return cacheLnFat[n]; };
function caudaBinomial(n, k, p) {
  if (k <= 0) return 1;
  if (k > n) return 0;
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  let soma = 0;
  for (let x = k; x <= n; x++) {
    const t = Math.exp(lf(n) - lf(x) - lf(n - x) + x * Math.log(p) + (n - x) * Math.log(1 - p));
    soma += t;
    if (t < 1e-16 * soma && x > n * p) break;
  }
  return Math.min(1, soma);
}
void lnFat;
// ln Γ (Lanczos, g = 7) e cauda superior da beta-binomial com média p e correlação intra-seção rho
const LANCZOS = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
function lnGama(z) {
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGama(1 - z);
  z -= 1;
  let x = LANCZOS[0];
  for (let i = 1; i < 9; i++) x += LANCZOS[i] / (z + i);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
function caudaBetaBinomial(n, k, p, rho) {
  if (k <= 0) return 1;
  if (k > n || p <= 0) return 0;
  if (p >= 1) return 1;
  const s = (1 - rho) / rho; const a = p * s; const b = (1 - p) * s;
  const base = lnGama(a + b) - lnGama(a) - lnGama(b) - lnGama(n + a + b) + lf(n);
  let soma = 0;
  for (let x = k; x <= n; x++) soma += Math.exp(base - lf(x) - lf(n - x) + lnGama(x + a) + lnGama(n - x + b));
  return Math.min(1, soma);
}

const todas = [];
for (const uf of ufs) for (const r of q.all(FEDERAL[turno], turno, uf)) todas.push(r);
// taxa por zona
const zonas = new Map();
for (const r of todas) {
  const k = `${r.uf}|${r.municipio}|${r.zona}`;
  const z = zonas.get(k) ?? { aptos: 0, comp: 0, semBio: 0, compBio: 0 };
  z.aptos += r.aptos; z.comp += r.comparecimento;
  if (r.sem_biometria !== null && r.por_biografia !== null) { z.semBio += r.sem_biometria + r.por_biografia; z.compBio += r.comparecimento; }
  zonas.set(k, z);
}
// Liberação sem biometria = eleitor sem biometria cadastrada (só ano de nascimento) + biometria que falhou (porBiografia)
const semBio = { todas: [0, 0], lista: [0, 0] };
let esperado = 0;
let esperadoPequenas = 0;
const faixas = new Map();
const lista = [];
const acima = [];
let aptosTot = 0;
let compTot = 0;
for (const r of todas) {
  aptosTot += r.aptos; compTot += r.comparecimento;
  const temBio = r.sem_biometria !== null && r.por_biografia !== null;
  const liberados = temBio ? r.sem_biometria + r.por_biografia : 0;
  if (temBio) { semBio.todas[0] += liberados; semBio.todas[1] += r.comparecimento; }
  const taxa = r.aptos ? r.comparecimento / r.aptos : null;
  const faixa = taxa === null ? 'sem aptos' : taxa > 1 ? '>100%' : taxa === 1 ? '=100%' : taxa >= 0.95 ? '95–99,9%' : taxa >= 0.9 ? '90–95%' : '<90%';
  faixas.set(faixa, (faixas.get(faixa) ?? 0) + 1);
  const z = zonas.get(`${r.uf}|${r.municipio}|${r.zona}`);
  const pz = z.aptos - r.aptos > 0 ? (z.comp - r.comparecimento) / (z.aptos - r.aptos) : null;
  const kmin = Math.ceil(limite * r.aptos - 1e-9);
  if (pz !== null && r.aptos > 0) { const pr = caudaBinomial(r.aptos, kmin, pz); esperado += pr; if (r.aptos < 50) esperadoPequenas += pr; }
  if (taxa !== null && taxa >= limite) {
    let o = null;
    if (outroCarregado.has(r.uf)) o = qOutro.get(FEDERAL[outro], outro, r.uf, r.municipio, r.zona, r.secao) ?? null;
    if (temBio) { semBio.lista[0] += liberados; semBio.lista[1] += r.comparecimento; }
    const compZ = z.compBio - (temBio ? r.comparecimento : 0);
    const semZ = temBio && compZ > 0 ? (z.semBio - liberados) / compZ : null;
    const item = { ...r,
      pct_sem_bio: temBio && r.comparecimento ? +(100 * liberados / r.comparecimento).toFixed(1) : '',
      pct_sem_bio_zona: semZ === null ? '' : +(100 * semZ).toFixed(1),
      p_sem_bio: semZ === null ? '' : caudaBinomial(r.comparecimento, liberados, semZ).toExponential(2),
      taxa: +(100 * taxa).toFixed(2), taxa_zona: pz === null ? '' : +(100 * pz).toFixed(2), p_binomial: pz === null ? '' : caudaBinomial(r.aptos, kmin, pz).toExponential(2),
      aptos_outro_turno: o?.aptos ?? '', comparecimento_outro_turno: o?.comparecimento ?? '', tipo_urna_outro_turno: o?.tipo_urna ?? '' };
    lista.push(item);
    if (taxa > 1) acima.push(item);
  }
}
lista.sort((a, b) => b.taxa - a.taxa || b.aptos - a.aptos);

// Sobredispersão: variância observada entre seções da mesma zona ÷ variância binomial. Se ≫ 1, o modelo binomial
// subestima as caudas. Estima rho da beta-binomial (Var = n p (1-p) [1 + (n-1) rho]) por momentos e recalcula o esperado.
let somaQ = 0; let somaN1 = 0; let nSec = 0; let somaRazao = 0;
for (const r of todas) {
  const z = zonas.get(`${r.uf}|${r.municipio}|${r.zona}`);
  if (r.aptos < 2 || z.aptos - r.aptos <= 0) continue;
  const pz = (z.comp - r.comparecimento) / (z.aptos - r.aptos);
  if (pz <= 0 || pz >= 1) continue;
  const v = r.aptos * pz * (1 - pz);
  const q = (r.comparecimento - r.aptos * pz) ** 2 / v;
  somaRazao += q; somaQ += q - 1; somaN1 += r.aptos - 1; nSec++;
}
const fatorDispersao = somaRazao / nSec;
const rho = Math.max(1e-6, somaQ / somaN1);
let esperadoBB = 0;
for (const r of todas) {
  const z = zonas.get(`${r.uf}|${r.municipio}|${r.zona}`);
  if (!r.aptos || z.aptos - r.aptos <= 0) continue;
  const pz = (z.comp - r.comparecimento) / (z.aptos - r.aptos);
  esperadoBB += caudaBetaBinomial(r.aptos, Math.ceil(limite * r.aptos - 1e-9), pz, rho);
}

const agrupa = (f) => [...lista.reduce((m, x) => m.set(f(x), (m.get(f(x)) ?? 0) + 1), new Map())].sort((a, b) => b[1] - a[1]);
console.log(`\nA7, ${turno}º turno, ${ufs.length} UFs (${ufs.join(',')}): ${todas.length} seções completas; comparecimento nacional ${(100 * compTot / aptosTot).toFixed(2)}%`);
console.log(`Faixas de comparecimento (seções): ${[...faixas].map(([k, v]) => `${k}: ${v}`).join(' · ')}`);
console.log(`Comparecimento > aptos: ${acima.length}`);
console.log(`Seções com comparecimento ≥ ${100 * limite}%: ${lista.length}; esperado pelo modelo binomial com a taxa da zona: ${esperado.toFixed(1)} (seções com < 50 aptos: ${esperadoPequenas.toFixed(1)})`);
console.log(`Sobredispersão do comparecimento entre seções da mesma zona: ${fatorDispersao.toFixed(2)}× a binomial (rho = ${rho.toExponential(2)}); esperado ≥ ${100 * limite}% pela beta-binomial: ${esperadoBB.toFixed(1)}`);
console.log('Por tamanho (aptos):', agrupa((x) => (x.aptos < 10 ? '<10' : x.aptos < 50 ? '10–49' : x.aptos < 100 ? '50–99' : x.aptos < 200 ? '100–199' : '200+')).map(([k, v]) => `${k}: ${v}`).join(' · '));
console.log('Por UF:', agrupa((x) => x.uf).map(([k, v]) => `${k}: ${v}`).join(' · '));
console.log('Por tipo de urna/arquivo:', agrupa((x) => `${x.tipo_urna}/${x.tipo_arquivo}`).map(([k, v]) => `${k}: ${v}`).join(' · '));
console.log('Com TTE > 0:', lista.filter((x) => x.aptos_tte > 0).length, '· com seção agregada:', lista.filter((x) => x.agregadas > 0).length,
  '· p binomial < 1e-6:', lista.filter((x) => x.p_binomial !== '' && Number(x.p_binomial) < 1e-6).length);
const pct = ([a, b]) => (b ? (100 * a / b).toFixed(2) : '-');
console.log(`Liberação sem biometria / comparecimento (seções com detalhamento): todas ${pct(semBio.todas)}%, seções ≥ ${100 * limite}%: ${pct(semBio.lista)}%`);
const risco = lista.filter((x) => x.p_sem_bio !== '' && Number(x.p_sem_bio) < 0.001);
console.log(`Seções ≥ ${100 * limite}% com liberação sem biometria acima da zona (p binomial < 0,001): ${risco.length}`);
for (const x of risco.slice(0, 40)) console.log(`  ${x.uf} ${x.municipio} ${x.nome_municipio ?? ''} z${x.zona} s${x.secao}: ${x.comparecimento}/${x.aptos} (${x.taxa}%), sem biometria ${x.pct_sem_bio}% × zona ${x.pct_sem_bio_zona}% (p=${x.p_sem_bio}) ${x.tipo_urna} | ${outro}º turno ${x.comparecimento_outro_turno}/${x.aptos_outro_turno}`);
console.log('\nSeções (até 60), ordenadas por taxa e tamanho:');
for (const x of lista.slice(0, 60)) {
  console.log(`  ${x.uf} ${x.municipio} ${x.nome_municipio ?? ''} z${x.zona} s${x.secao}: ${x.comparecimento}/${x.aptos} (${x.taxa}%; zona ${x.taxa_zona}%; p=${x.p_binomial}) TTE ${x.aptos_tte} agreg ${x.agregadas} ${x.tipo_urna}/${x.tipo_arquivo} ${x.modelo_urna ?? ''} sem-bio ${x.pct_sem_bio}% (zona ${x.pct_sem_bio_zona}%) jaVotou ${x.ja_votou ?? '-'} rajada ${x.maior_rajada_sem_biometria_10min ?? '-'} | ${outro}º turno ${x.comparecimento_outro_turno}/${x.aptos_outro_turno}`);
}

const dir = 'data/parsed/auditoria/contagem';
mkdirSync(dir, { recursive: true });
const sufixo = args.uf ? `-${ufs.join('_')}` : '';
const cols = ['uf', 'municipio', 'nome_municipio', 'zona', 'secao', 'aptos', 'aptos_secao', 'aptos_tte', 'comparecimento', 'taxa', 'taxa_zona', 'p_binomial', 'agregadas', 'tipo_urna', 'tipo_arquivo', 'modelo_urna', 'status_aux',
  'sem_biometria', 'por_biografia', 'pct_sem_bio', 'pct_sem_bio_zona', 'p_sem_bio', 'ano_nascimento_sem_biometria', 'habilitados_pelo_mesario', 'ja_votou', 'maior_rajada_sem_biometria_10min', 'sem_biometria_ultima_hora', 'aptos_outro_turno', 'comparecimento_outro_turno', 'tipo_urna_outro_turno'];
writeFileSync(`${dir}/a7-${turno}t${sufixo}-secoes.csv`, [cols.join(';'), ...lista.map((x) => cols.map((c) => x[c] ?? '').join(';'))].join('\n') + '\n');
console.log(`Arquivo: ${dir}/a7-${turno}t${sufixo}-secoes.csv`);
