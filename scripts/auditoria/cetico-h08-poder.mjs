// Cético, achado h08: PODER do teste "menor intervalo entre votos" e uma alternativa que o autor não testou.
// Parte A (alternativa): os intervalos mais curtos do país (< 20 s, nas seções com mínimo de 16 a 19 s no perfil)
//   são de eleitores com biometria ou de liberações sem biometria (ano de nascimento / dado pessoal / mesário)?
//   Um mesário votando no lugar de faltosos precisa liberar sem a digital do eleitor; se os intervalos curtos
//   fossem isso, os dois ciclos do par seriam sem biometria bem mais que a taxa da própria seção. Controle: os
//   intervalos de 20 a 40 s das mesmas seções.
// Parte B (poder, simulação): numa amostra de seções reais de 1 log, injeta uma rajada de k votos sem biometria,
//   um a cada X s, no maior intervalo ocioso do dia, e mede quantas vezes cada regra acusa:
//   R1 (a do autor): algum intervalo < 15 s;
//   R2: maior série de votos seguidos com intervalo <= 25 s acima do percentil 99,9 da amostra real;
//   R3: maior série de votos SEM biometria seguidos com intervalo <= 30 s acima do percentil 99,9 da amostra real.
// Uso: node scripts/auditoria/cetico-h08-poder.mjs [--amostra 3000]
// Saída: data/parsed/auditoria/cetico/h08-poder.json
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerLogs } from '../../src/perfil-secoes.js';

const { values } = parseArgs({ options: { amostra: { type: 'string', default: '3000' } } });
const DIA = '25/10/2026';
const seg = (l) => Number(l.slice(11, 13)) * 3600 + Number(l.slice(14, 16)) * 60 + Number(l.slice(17, 19));

/** Votos da seção: [{ t, tipo: 'bio'|'ano'|'dado'|'outro' }] em ordem. */
async function votos(r) {
  const dir = path.join(DIR_DADOS, 'raw', '2t', 'urnas', r.uf, r.municipio, r.zona, r.secao, r.hash);
  const nomes = await readdir(dir);
  const { texto } = await lerLogs(path.join(dir, acharArquivo(nomes, 'log')), r.secao);
  const out = []; let tipo = 'outro';
  for (const l of texto.split('\n')) {
    if (!l.startsWith(DIA)) continue;
    const m = l.split('\t')[4] ?? '';
    if (m === 'Aguardando digitação do identificador do eleitor') tipo = 'outro';
    else if (m.includes('Tipo de habilitação do eleitor [biométrica]')) tipo = 'bio';
    else if (m.startsWith('Ano de nascimento digitado é igual ao do cadastro') && tipo !== 'bio') tipo = 'ano';
    else if (m === 'Dado digitado confere' && tipo !== 'bio') tipo = 'dado';
    else if (m === 'O voto do eleitor foi computado') { out.push({ t: seg(l), tipo }); tipo = 'outro'; }
  }
  return out;
}
const series = (vs) => {
  let s = vs.length ? 1 : 0, ms = s, sb = vs.length && vs[0].tipo !== 'bio' ? 1 : 0, msb = sb, minI = Infinity;
  for (let j = 1; j < vs.length; j++) {
    const d = vs[j].t - vs[j - 1].t; minI = Math.min(minI, d);
    s = d <= 25 ? s + 1 : 1; ms = Math.max(ms, s);
    if (vs[j].tipo === 'bio') sb = 0; else sb = vs[j - 1].tipo !== 'bio' && d <= 30 ? sb + 1 : 1;
    msb = Math.max(msb, sb);
  }
  return { maiorSerie: ms, maiorSerieSemBio: msb, minIntervalo: minI };
};
const pct = (arr, p) => { const a = [...arr].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };

const { db, fonte } = await abrirLeitura();
const rapidas = db.prepare(`SELECT uf, municipio, zona, secao, hash FROM perfil_log WHERE turno = 2 AND logs_no_pacote = 1 AND intervalo_minimo_entre_votos BETWEEN 16 AND 19`).all();
const amostra = db.prepare(`SELECT uf, municipio, zona, secao, hash FROM perfil_log WHERE turno = 2 AND logs_no_pacote = 1 AND votos_computados >= 50 ORDER BY random() LIMIT ?`).all(Number(values.amostra));
db.close();

// Parte A
const A = { secoes: rapidas.length, curtos: { pares: 0, ambosSemBio: 0, algumSemBio: 0 }, controle: { pares: 0, ambosSemBio: 0, algumSemBio: 0 }, esperadoAmbosSemBio: 0, porTipo: {} };
for (const r of rapidas) {
  let vs; try { vs = await votos(r); } catch { continue; }
  const taxa = vs.filter((v) => v.tipo !== 'bio').length / Math.max(1, vs.length);
  for (let j = 1; j < vs.length; j++) {
    const d = vs[j].t - vs[j - 1].t;
    const g = d < 20 ? A.curtos : d >= 20 && d <= 40 ? A.controle : null;
    if (!g) continue;
    g.pares++;
    const a = vs[j - 1].tipo !== 'bio', b = vs[j].tipo !== 'bio';
    if (a && b) g.ambosSemBio++; if (a || b) g.algumSemBio++;
    if (d < 20) { A.esperadoAmbosSemBio += taxa * taxa; const k = `${vs[j - 1].tipo}>${vs[j].tipo}`; A.porTipo[k] = (A.porTipo[k] ?? 0) + 1; }
  }
}
A.esperadoAmbosSemBio = Math.round(A.esperadoAmbosSemBio * 10) / 10;
console.log('A', JSON.stringify(A));

// Parte B
const reais = [];
for (const r of amostra) { try { const vs = await votos(r); if (vs.length >= 50) reais.push(vs); } catch { /* sem log legível */ } }
const base = reais.map(series);
const lim = { serie: pct(base.map((b) => b.maiorSerie), 0.999), serieSemBio: pct(base.map((b) => b.maiorSerieSemBio), 0.999) };
const falsoPositivo = { R1: base.filter((b) => b.minIntervalo < 15).length / base.length, R2: base.filter((b) => b.maiorSerie > lim.serie).length / base.length, R3: base.filter((b) => b.maiorSerieSemBio > lim.serieSemBio).length / base.length };
console.log('B linha de base', JSON.stringify({ secoes: reais.length, lim, falsoPositivo, distSerieSemBio: { p50: pct(base.map((b) => b.maiorSerieSemBio), 0.5), p99: pct(base.map((b) => b.maiorSerieSemBio), 0.99) }, distSerie: { p50: pct(base.map((b) => b.maiorSerie), 0.5), p99: pct(base.map((b) => b.maiorSerie), 0.99) } }));
const B = [];
for (const k of [5, 10, 20, 40]) for (const X of [8, 12, 15, 16, 18, 20, 25, 30]) {
  let r1 = 0, r2 = 0, r3 = 0, n = 0;
  for (const vs of reais) {
    // maior intervalo ocioso
    let gi = 1; for (let j = 2; j < vs.length; j++) if (vs[j].t - vs[j - 1].t > vs[gi].t - vs[gi - 1].t) gi = j;
    const ini = vs[gi - 1].t, fim = vs[gi].t;
    if (fim - ini < (k + 1) * X) continue; // a rajada não cabe: não conta
    n++;
    const rajada = Array.from({ length: k }, (_, i) => ({ t: ini + (i + 1) * X, tipo: 'ano' }));
    const s = series([...vs.slice(0, gi), ...rajada, ...vs.slice(gi)]);
    if (s.minIntervalo < 15) r1++; if (s.maiorSerie > lim.serie) r2++; if (s.maiorSerieSemBio > lim.serieSemBio) r3++;
  }
  B.push({ k, X, secoesOndeCabe: n, R1: +(r1 / n).toFixed(3), R2: +(r2 / n).toFixed(3), R3: +(r3 / n).toFixed(3) });
}
console.table(B);
await mkdir(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico'), { recursive: true });
await writeFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'h08-poder.json'), JSON.stringify({ fonte, A, linhaDeBase: { secoes: reais.length, lim, falsoPositivo }, simulacao: B }, null, 1));
