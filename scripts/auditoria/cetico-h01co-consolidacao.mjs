// Revisor cético, consolidação do achado h01-comparecimento-oficial-100mais.
// Ponto em disputa entre as lentes: o mínimo de 157 votos 100+ "sem biometria" resiste ao log do 1º turno?
// A lente "alternativas" conferiu só 20 UFs (log do 1º turno em carga) e achou 14 zonas com "excesso inverso"
// (mais habilitações com biometria na urna do que eleitores com biometria no perfil de julho, todas as idades).
// Aqui o teste é refeito com o log do 1º turno completo (28 UFs na cópia de leitura) e com duas correções:
//   - variante estrita: só habilitações pela digital (b), sem as liberações pelo mesário (m);
//   - variante sem TTE: desconta os aptos em trânsito da zona (votam na urna de destino, mas o perfil os conta na origem).
// Entradas: data/parsed/auditoria/cetico/h01-oficial-zonas-lb.tsv (as 133 zonas do mínimo, saída da lente "alternativas",
// cujos números de comparecimento foram reproduzidos pelas três lentes), o perfil por seção do demógrafo e o banco (somente leitura).
// Uso: node scripts/auditoria/cetico-h01co-consolidacao.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(RAIZ, 'data/parsed/auditoria/cetico');
const PERFIL = path.join(RAIZ, 'data/parsed/auditoria/demografo/perfil');

// 1. zonas do mínimo (lb > 0)
const lb = new Map();
const tsv = readFileSync(path.join(OUT, 'h01-oficial-zonas-lb.tsv'), 'utf8').trimEnd().split('\n');
const cabLb = tsv[0].split('\t');
const iLb = cabLb.indexOf('lb_100_sem_bio'), iVot = cabLb.indexOf('votantes_100'), iSem = cabLb.indexOf('sem_bio_100_perfil'), iAp = cabLb.indexOf('aptos_100');
for (const l of tsv.slice(1)) { const c = l.split('\t'); lb.set(c[0], { lb: Number(c[iLb]), vot: Number(c[iVot]), sem100: Number(c[iSem]), ap100: Number(c[iAp]) }); }
const ufsAlvo = new Set([...lb.keys()].map((k) => k.split('|')[0]));

// 2. perfil de julho por seção (só as zonas do mínimo)
const perfilSec = new Map(); const perfilZona = new Map();
for (const f of readdirSync(PERFIL)) {
  if (!ufsAlvo.has(f.replace('.tsv', ''))) continue;
  const ls = readFileSync(path.join(PERFIL, f), 'utf8').trimEnd().split('\n'); const cab = ls[0].split('\t');
  const I = Object.fromEntries(cab.map((n, i) => [n, i]));
  for (const l of ls.slice(1)) {
    const c = l.split('\t'); const kz = `${c[0]}|${c[1]}|${c[2]}`; if (!lb.has(kz)) continue;
    const v = { total: +c[I.total], bio: +c[I.biometria], sem100: +c[I.sembio_f100] };
    perfilSec.set(`${kz}|${c[3]}`, v);
    const z = perfilZona.get(kz) ?? { total: 0, bio: 0, sem100: 0 }; z.total += v.total; z.bio += v.bio; z.sem100 += v.sem100; perfilZona.set(kz, z);
  }
}

// 3. banco: log do 1º turno, seções agregadas, aptos e TTE do BU (eleição 6257, a de todas as seções)
const { db, fonte } = await abrirLeitura();
const cargas = db.prepare("SELECT turno, COUNT(DISTINCT uf) ufs FROM perfil_log GROUP BY turno").all();
const agreg = new Map(db.prepare('SELECT uf, municipio, zona, secao, secao_principal FROM secao_agregada WHERE turno = 1').all()
  .map((a) => [`${a.uf}|${a.municipio}|${a.zona}|${a.secao}`, a.secao_principal]));
const logZona = new Map(); const logSec = new Map();
for (const s of db.prepare('SELECT uf, municipio, zona, secao, votos_computados v, habilitados_biometria b, ano_nascimento_sem_biometria a, dado_pessoal_confere d, habilitados_pelo_mesario m FROM perfil_log WHERE turno = 1').iterate()) {
  const kz = `${s.uf}|${s.municipio}|${s.zona}`; if (!lb.has(kz)) continue;
  const z = logZona.get(kz) ?? { v: 0, b: 0, a: 0, d: 0, m: 0, secoes: 0 };
  z.v += s.v; z.b += s.b; z.a += s.a; z.d += s.d; z.m += s.m; z.secoes++; logZona.set(kz, z);
  const ks = `${kz}|${s.secao}`; const o = logSec.get(ks) ?? { a: 0, d: 0 }; o.a += s.a; o.d += s.d; logSec.set(ks, o);
}
const buZona = new Map();
for (const s of db.prepare('SELECT uf, municipio, zona, aptos, aptos_secao, aptos_tte, comparecimento_majoritario c FROM secao_eleicao WHERE turno = 1 AND eleicao = 6257').iterate()) {
  const kz = `${s.uf}|${s.municipio}|${s.zona}`; if (!lb.has(kz)) continue;
  const z = buZona.get(kz) ?? { aptos: 0, aptos_secao: 0, tte: 0, comp: 0 };
  z.aptos += s.aptos ?? 0; z.aptos_secao += s.aptos_secao ?? 0; z.tte += s.aptos_tte ?? 0; z.comp += s.c ?? 0; buZona.set(kz, z);
}
db.close?.();

// capacidade por grupo de votação (seção principal + agregadas): min(100+ sem biometria no perfil, liberações sem digital no log)
const grupos = new Map();
for (const [ks, v] of perfilSec) {
  const [uf, mun, zona, sec] = ks.split('|'); const kg = `${uf}|${mun}|${zona}|${agreg.get(ks) ?? sec}`;
  grupos.set(kg, (grupos.get(kg) ?? 0) + v.sem100);
}
const capZona = new Map();
for (const [kg, sem100] of grupos) {
  const kz = kg.split('|').slice(0, 3).join('|'); const l = logSec.get(kg); const semDigital = l ? l.a + l.d : 0;
  capZona.set(kz, (capZona.get(kz) ?? 0) + Math.min(sem100, semDigital));
}

// 4. teste
const R = { fonte_banco: fonte, cargas_perfil_log: cargas, zonas: lb.size, lb_total: 0, zonas_sem_log: 0, lb_sem_log: 0, zonas_sem_perfil: 0,
  variantes: {}, capacidade: { zonas_lb_acima: 0, lb_acima: 0, folga_minima: null }, por_uf: {}, zonas_afetadas: [] };
const V = { bm: 'b + m - com_bio (lente alternativas)', b: 'b - com_bio (só digital)', b_tte: 'b - com_bio - aptos_tte (só digital, sem trânsito)', bm_tte: 'b + m - com_bio - aptos_tte' };
for (const n of Object.keys(V)) R.variantes[n] = { regra: V[n], zonas: 0, lb_afetado: 0, lb_robusto: 0 };
const linhas = [['zona', 'lb_100', 'aptos_100', 'sem_bio_100', 'com_bio_perfil', 'total_perfil', 'aptos_secao_bu', 'aptos_tte_bu', 'log_votos', 'log_b', 'log_m', 'log_ano_nasc', 'log_dado_pessoal', 'inv_bm', 'inv_b', 'inv_b_tte', 'inv_bm_tte', 'capacidade']];
for (const [kz, z] of lb) {
  R.lb_total += z.lb; const uf = kz.split('|')[0]; R.por_uf[uf] ??= { lb: 0, lb_robusto_b_tte: 0 }; R.por_uf[uf].lb += z.lb;
  const p = perfilZona.get(kz); const l = logZona.get(kz); const bu = buZona.get(kz) ?? { aptos_secao: 0, tte: 0 };
  if (!p) { R.zonas_sem_perfil++; continue; }
  if (!l) { R.zonas_sem_log++; R.lb_sem_log += z.lb; continue; }
  const inv = { bm: l.b + l.m - p.bio, b: l.b - p.bio, b_tte: l.b - p.bio - bu.tte, bm_tte: l.b + l.m - p.bio - bu.tte };
  for (const n of Object.keys(V)) { const r = R.variantes[n]; if (inv[n] > 0) { r.zonas++; r.lb_afetado += z.lb; } else r.lb_robusto += z.lb; }
  if (inv.b_tte <= 0) R.por_uf[uf].lb_robusto_b_tte += z.lb;
  const cap = capZona.get(kz) ?? 0; const folga = cap - z.lb;
  if (folga < 0) { R.capacidade.zonas_lb_acima++; R.capacidade.lb_acima += -folga; }
  if (R.capacidade.folga_minima === null || folga < R.capacidade.folga_minima) R.capacidade.folga_minima = folga;
  if (inv.bm > 0 || inv.b > 0) R.zonas_afetadas.push({ zona: kz, lb: z.lb, ...inv, tte: bu.tte, aptos_secao_bu: bu.aptos_secao, total_perfil: p.total });
  linhas.push([kz, z.lb, z.ap100, z.sem100, p.bio, p.total, bu.aptos_secao, bu.tte, l.v, l.b, l.m, l.a, l.d, inv.bm, inv.b, inv.b_tte, inv.bm_tte, cap]);
}
await writeFile(path.join(OUT, 'h01co-consolidacao.json'), JSON.stringify(R, null, 1));
await writeFile(path.join(OUT, 'h01co-consolidacao-zonas.tsv'), linhas.map((x) => x.join('\t')).join('\n') + '\n');
console.log(JSON.stringify(R, null, 1));
