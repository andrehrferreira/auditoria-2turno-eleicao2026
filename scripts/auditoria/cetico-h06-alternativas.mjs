// Revisor cético, achado h06-votos-apos-17h-sem-efeito: explicações alternativas e PODER do teste.
// Só lê: cópia de leitura do banco (abrirLeitura), fuso-municipio.csv e logs-tardios.jsonl do autor (tempo/2t).
//  A. Reproduz a comparação dentro da zona (sinal) e dá erro padrão por zona (bootstrap de zonas).
//  B. Inclinação % do 13 × parcela de votos depois das 17h, dentro da zona: δ = (13 entre tardios − 13 nos demais).
//  C. Placebo: a mesma inclinação contra o % do 13 do 1º turno da mesma seção (o 1º turno não tem os votos tardios do 2º).
//  D. Poder: injeta votos tardios a favor de um lado e mede o quanto o teste do autor se move (MDE).
//  E. Degrau das 19h: encerramento por 10 min no 1º × 2º turno nos municípios com 19h no 2º turno (1º turno parcial).
//  F. Biometria dos votos tardios contra a linha de base da PRÓPRIA seção (o autor usou a média nacional).
// Uso: node scripts/auditoria/cetico-h06-alternativas.mjs
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DIR_DADOS } from '../../src/config.js';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { difRelogioPorSecao, difSecao } from './relogio-fora-do-fuso.mjs';

const dirAutor = path.join(DIR_DADOS, 'parsed', 'auditoria', 'tempo', '2t');
const dirSaida = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');
await mkdir(dirSaida, { recursive: true });
const r2 = (x, n = 3) => (x === null || Number.isNaN(x) ? null : +x.toFixed(n));

// Fuso por município (local − Brasília)
const fuso = new Map();
const nomes = new Map();
for (const l of (await readFile(path.join(dirAutor, 'fuso-municipio.csv'), 'utf8')).trim().split('\n').slice(1)) {
  const c = l.split(',');
  fuso.set(`${c[0]}/${c[1]}`, c[6] === '' ? null : Number(c[6]));
  nomes.set(`${c[0]}/${c[1]}`, c[2]);
}

const { db, fonte } = await abrirLeitura();
console.error(`banco: ${fonte}`);
const seg = (dt) => Number(dt.slice(11, 13)) * 3600 + Number(dt.slice(14, 16)) * 60 + Number(dt.slice(17, 19));

// ---- Seções do 2º turno com log ----
const S = new Map();
for (const r of db.prepare(`SELECT s.uf, s.municipio, s.zona, s.secao, s.local, s.encerramento, s.comparecimento,
    json_extract(p.dados, '$.log.votosPorHoraLocal') AS ph, p.votos_computados AS votos,
    p.habilitados_biometria AS bio, p.ano_nascimento_sem_biometria AS anb, p.dado_pessoal_confere AS man
  FROM secao s JOIN perfil_log p USING (turno, uf, municipio, zona, secao)
  WHERE s.turno = 2 AND s.uf <> 'zz'`).iterate()) {
  const d = fuso.get(`${r.uf}/${r.municipio}`);
  if (d === null || d === undefined || !r.ph) continue;
  const ph = JSON.parse(r.ph);
  const t17 = ph.slice(17 + d).reduce((a, b) => a + b, 0);
  const t18 = ph.slice(18 + d).reduce((a, b) => a + b, 0);
  S.set(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, { uf: r.uf, mun: r.municipio, zona: r.zona, local: r.local, d,
    encBsb: seg(r.encerramento) - d * 3600, votos: r.votos, t17, t18, bio: r.bio, anb: r.anb, man: r.man });
}
const votos = (turno) => {
  for (const r of db.prepare(`SELECT uf, municipio, zona, secao,
      SUM(CASE WHEN tipo_voto = 'nominal' AND numero = 13 THEN quantidade ELSE 0 END) AS v13,
      SUM(CASE WHEN tipo_voto = 'nominal' AND numero = 22 THEN quantidade ELSE 0 END) AS v22,
      SUM(CASE WHEN tipo_voto = 'nominal' THEN quantidade ELSE 0 END) AS nom
    FROM voto_bu WHERE turno = ? AND cargo = 1 GROUP BY uf, municipio, zona, secao`).iterate(turno)) {
    const s = S.get(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`);
    if (s) s[`t${turno}`] = { v13: r.v13, v22: r.v22, nom: r.nom };
  }
};
votos(2); votos(1);
const ufs1t = db.prepare('SELECT DISTINCT uf FROM secao WHERE turno = 1').all().map((r) => r.uf).sort();
const lista = [...S.values()].filter((s) => s.t2 && s.t2.v13 + s.t2.v22 >= 20);
const soma = lista.reduce((a, s) => a + s.t17, 0);
console.error(`seções 2º turno: ${S.size}; com ≥20 votos 13+22: ${lista.length}; votos depois das 17h: ${soma}`);

const p2 = (s) => s.t2.v13 / (s.t2.v13 + s.t2.v22);
const p1 = (s) => (s.t1 && s.t1.v13 + s.t1.v22 > 0 ? s.t1.v13 / (s.t1.v13 + s.t1.v22) : null); // 1º turno no MESMO denominador 13+22
const p1nom = (s) => (s.t1 && s.t1.nom > 0 ? s.t1.v13 / s.t1.nom : null); // métrica do autor no 1º turno

const zonasDe = (l) => {
  const z = new Map();
  for (const s of l) { const k = `${s.uf}/${s.mun}/${s.zona}`; if (!z.has(k)) z.set(k, []); z.get(k).push(s); }
  return [...z.values()];
};
let semente = 20261025;
const aleat = () => { semente = (semente + 0x6d2b79f5) | 0; let t = Math.imul(semente ^ (semente >>> 15), 1 | semente); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; // mulberry32

// A. Método do autor (média por seção, peso min(n_sim, n_nao)) com bootstrap de zonas
function difZona(l, crit, y) {
  const zs = [];
  for (const z of zonasDe(l)) {
    const a = z.filter((s) => crit(s) && y(s) !== null), b = z.filter((s) => !crit(s) && y(s) !== null);
    if (!a.length || !b.length) continue;
    const m = (x) => x.reduce((t, s) => t + y(s), 0) / x.length;
    zs.push([Math.min(a.length, b.length), m(a) - m(b)]);
  }
  const est = (arr) => arr.reduce((t, [w, d]) => t + w * d, 0) / arr.reduce((t, [w]) => t + w, 0);
  const e = est(zs);
  const boot = [];
  for (let i = 0; i < 300; i++) boot.push(est(Array.from({ length: zs.length }, () => zs[Math.floor(aleat() * zs.length)])));
  const mb = boot.reduce((a, b) => a + b, 0) / boot.length;
  const ep = Math.sqrt(boot.reduce((a, b) => a + (b - mb) ** 2, 0) / (boot.length - 1));
  return { zonas: zs.length, dif_pp: r2(100 * e), ep_pp: r2(100 * ep), z: r2(e / ep, 2), ic95_pp: [r2(100 * (e - 1.96 * ep)), r2(100 * (e + 1.96 * ep))] };
}
// B. Inclinação dentro da zona (x e y centrados na zona), EP robusto por zona (sanduíche)
function inclinacao(l, x, y) {
  const grupos = [];
  for (const z of zonasDe(l)) {
    const v = z.filter((s) => y(s) !== null);
    if (v.length < 2) continue;
    const mx = v.reduce((t, s) => t + x(s), 0) / v.length, my = v.reduce((t, s) => t + y(s), 0) / v.length;
    grupos.push(v.map((s) => [x(s) - mx, y(s) - my]));
  }
  let sxx = 0, sxy = 0, syy = 0, n = 0;
  for (const g of grupos) for (const [a, b] of g) { sxx += a * a; sxy += a * b; syy += b * b; n++; }
  const beta = sxy / sxx;
  let meat = 0;
  for (const g of grupos) { const u = g.reduce((t, [a, b]) => t + a * (b - beta * a), 0); meat += u * u; }
  const ep = Math.sqrt(meat) / sxx;
  return { secoes: n, zonas: grupos.length, pearson: r2(sxy / Math.sqrt(sxx * syy), 4), beta: r2(beta), ep: r2(ep), z: r2(beta / ep, 2), ic95: [r2(beta - 1.96 * ep), r2(beta + 1.96 * ep)] };
}
const share = (s) => s.t17 / Math.max(1, s.votos);
const tem17 = (s) => s.t17 > 0;
const res = { fonte: path.basename(fonte), geradoEm: new Date().toISOString(), ufs1t, secoes: lista.length, votosApos17: soma };

res.A_reproducao_difDentroDaZona = {
  algumVotoApos17_2t: difZona(lista, tem17, p2),
  votoApos18_2t: difZona(lista, (s) => s.t18 > 0, p2),
  nota: 'dif = média(seções com voto tardio) − média(sem), % do 13 em 13+22. Sinal positivo = seções com voto tardio MAIS favoráveis ao 13.',
};
res.B_inclinacao_2t = inclinacao(lista, share, p2);

// C. Placebo com o 1º turno (só UFs do 1º turno no banco)
const l1 = lista.filter((s) => p1(s) !== null);
res.C_placebo_1t = {
  secoes: l1.length,
  dif_2t_mesmasSecoes: difZona(l1, tem17, p2),
  dif_1t_placebo: difZona(l1, tem17, p1),
  dif_2tMenos1t: difZona(l1, tem17, (s) => p2(s) - p1(s)),
  dif_2tMenos1t_metricaDoAutor: difZona(l1, tem17, (s) => p2(s) - p1nom(s)),
  inclinacao_2t: inclinacao(l1, share, p2),
  inclinacao_1t_placebo: inclinacao(l1, share, p1),
  inclinacao_2tMenos1t: inclinacao(l1, share, (s) => p2(s) - p1(s)),
};

// D. Poder: em cada seção com voto tardio, uma fração f dos votos tardios passa de 22 para 13 (ou é acrescentada ao 13)
function injetar(f, modo) {
  return (s) => {
    const k = Math.round(f * s.t17);
    if (modo === 'troca') { const m = Math.min(k, s.t2.v22); return (s.t2.v13 + m) / (s.t2.v13 + s.t2.v22); }
    return (s.t2.v13 + k) / (s.t2.v13 + s.t2.v22 + k);
  };
}
const base = difZona(lista, tem17, p2);
const poder = [];
for (const f of [0.1, 0.25, 0.5, 1]) {
  const d = difZona(lista, tem17, injetar(f, 'troca'));
  poder.push({ fracaoDosTardiosTrocada22para13: f, votosMovidos: lista.reduce((a, s) => a + Math.min(Math.round(f * s.t17), s.t2.v22), 0), dif_pp: d.dif_pp, deslocamento_pp: r2(d.dif_pp - base.dif_pp), z_doDeslocamento: r2((d.dif_pp - base.dif_pp) / base.ep_pp, 2) });
}
const d1 = difZona(lista, tem17, injetar(1, 'troca'));
res.D_poder = {
  base, injecoes: poder,
  mde_80pct_em_fracao: r2((2.8 * base.ep_pp) / (d1.dif_pp - base.dif_pp), 2),
  nota: 'MDE = 2,8 × EP / deslocamento com f = 1. Se > 1, o teste do autor NÃO detectaria nem 100% dos votos tardios trocados.',
};
// Maior efeito compatível (inclinação 2º turno, IC 95%): δ × votos tardios ≈ votos líquidos a mais para o 13 entre os tardios
const b = res.B_inclinacao_2t;
const margem = lista.reduce((a, s) => a + s.t2.v13 - s.t2.v22, 0);
res.D_maiorEfeitoCompativel = {
  margem13menos22_secoesUsadas: margem,
  delta_ic95: b.ic95,
  efeitoMargem_ic95_votos: [Math.round(2 * b.ic95[0] * soma), Math.round(2 * b.ic95[1] * soma)],
  limiteDuroSeTodosOsTardiosFossemDeUmLado: soma,
  limiteDuroComoParcelaDaMargem_pct: r2(100 * soma / Math.abs(margem), 2),
  nota: 'efeito na margem 13−22 = 2·δ·(votos tardios) se δ fosse a diferença de preferência causada; δ fica entre −p e 1−p.',
};

// E. Degrau das 19h no 1º turno
const mun19 = new Map();
for (const s of S.values()) if (s.encBsb >= 19 * 3600) mun19.set(`${s.uf}/${s.mun}`, (mun19.get(`${s.uf}/${s.mun}`) ?? 0) + 1);
const enc1 = new Map();
const relogio1 = difRelogioPorSecao(1); // seções com relógio fora da hora do município (linha-do-tempo/07)
for (const r of db.prepare(`SELECT uf, municipio, zona, secao, encerramento FROM secao WHERE turno = 1 AND uf <> 'zz' AND situacao = 'completa'`).iterate()) {
  const k = `${r.uf}/${r.municipio}`;
  const d = difSecao(relogio1, r.uf, r.municipio, r.zona, r.secao, fuso.get(k));
  if (d === null || d === undefined || !r.encerramento) continue;
  const e = seg(r.encerramento) - d * 3600;
  const m = enc1.get(k) ?? { secoes: 0, h1900_1909: 0, h19mais: 0, h18_1859: 0, h1730_1759: 0 };
  m.secoes++;
  if (e >= 19 * 3600) m.h19mais++;
  if (e >= 19 * 3600 && e < 19 * 3600 + 600) m.h1900_1909++;
  else if (e >= 18 * 3600 && e < 19 * 3600) m.h18_1859++;
  else if (e >= 17.5 * 3600 && e < 18 * 3600) m.h1730_1759++;
  enc1.set(k, m);
}
// Distribuição nacional do encerramento por 10 min a partir das 18h, nos dois turnos (UFs do 1º turno no banco)
const hist = (it) => { const h = {}; for (const e of it) if (e >= 18 * 3600) { const b10 = Math.floor(e / 600) * 10; const k = `${String(Math.floor(b10 / 60)).padStart(2, '0')}:${String(b10 % 60).padStart(2, '0')}`; h[k] = (h[k] ?? 0) + 1; } return Object.fromEntries(Object.entries(h).sort()); };
const enc1lista = db.prepare(`SELECT uf, municipio, zona, secao, encerramento FROM secao WHERE turno = 1 AND uf <> 'zz' AND situacao = 'completa'`).all()
  .map((r) => { const d = difSecao(relogio1, r.uf, r.municipio, r.zona, r.secao, fuso.get(`${r.uf}/${r.municipio}`)); return d === null || d === undefined || !r.encerramento ? null : seg(r.encerramento) - d * 3600; }).filter((e) => e !== null);
const set1 = new Set(ufs1t);
res.E_degrau19h = {
  ufs1t,
  encerramentoApos18h_por10min_1t: hist(enc1lista),
  encerramentoApos18h_por10min_2t_mesmasUfs: hist([...S.values()].filter((s) => set1.has(s.uf)).map((s) => s.encBsb)),
  municipiosCom19hNo2t: [...mun19].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, n]) => ({ municipio: `${k} ${nomes.get(k) ?? ''}`, secoes19h_2t: n, no1tCarregado: enc1.has(k), ...(enc1.get(k) ?? {}) })),
};

// F. Biometria dos votos tardios × linha de base da própria seção (logs-tardios.jsonl do autor; tipos do dia = perfil − tardios)
const F = {};
for await (const linha of createInterface({ input: createReadStream(path.join(dirAutor, 'logs-tardios.jsonl')) })) {
  if (!linha) continue;
  const r = JSON.parse(linha);
  if (r.erro || !r.tardios) continue;
  const s = S.get(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`);
  if (!s) continue;
  const g = r.encBsb < 17.5 * 3600 ? '17h' : r.encBsb < 19 * 3600 ? '17h30-18h59' : '19h+';
  const tb = r.tardiosPorTipo.biometria ?? 0, ta = r.tardiosPorTipo.ano_nascimento_sem_biometria ?? 0, tm = r.tardiosPorTipo.liberacao_manual ?? 0;
  const db_ = s.bio - tb, da = s.anb - ta, dm = s.man - tm, dn = db_ + da + dm;
  if (dn <= 0) continue;
  for (const chave of [g, 'todos', ...(r.tardiosAposPausa30min ? [`${g} com pausa≥30min`] : [])]) {
    const f = F[chave] ??= { secoes: 0, tardios: 0, obsSemBio: 0, espSemBio: 0, varEsp: 0, obsManual: 0, espManual: 0, obsAno: 0, espAno: 0 };
    const n = tb + ta + tm;
    const pNb = (da + dm) / dn;
    f.secoes++; f.tardios += n; f.obsSemBio += ta + tm; f.espSemBio += n * pNb; f.varEsp += n * pNb * (1 - pNb);
    f.obsManual += tm; f.espManual += n * dm / dn; f.obsAno += ta; f.espAno += n * da / dn;
  }
}
for (const f of Object.values(F)) {
  f.z_semBio = r2((f.obsSemBio - f.espSemBio) / Math.sqrt(f.varEsp), 2);
  f.excessoSemBio = Math.round(f.obsSemBio - f.espSemBio);
  for (const k of ['espSemBio', 'varEsp', 'espManual', 'espAno']) f[k] = Math.round(f[k]);
}
res.F_biometriaTardiosXPropriaSecao = { grupos: F, nota: 'esperado = votos tardios × taxa sem biometria (ano + manual) da mesma seção ANTES das 17h; z binomial aproximado (sem correlação intra-seção).' };

await writeFile(path.join(dirSaida, 'h06-alternativas.json'), JSON.stringify(res, null, 2));
console.log(JSON.stringify(res, null, 1));
db.close();
