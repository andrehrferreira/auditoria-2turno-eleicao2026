// Verificação independente dos números do tópico docs/pericia/10-quadro-das-hipoteses.md (29/10/2026).
// Lê só a cópia imutável do banco (src/banco-leitura.js), nunca o primário. Universo: 2º turno completo.
// Uso: node --max-old-space-size=6144 scripts/auditoria/verifica-pericia-quadro.mjs
import { abrirLeitura } from '../../src/banco-leitura.js';

const { db, ponteiro } = await abrirLeitura();
console.log(`cópia ${ponteiro.criadoEm}; cargas ${JSON.stringify(ponteiro.cargas)}`);
const q = (sql, ...a) => db.prepare(sql).all(...a);

// 1. Seções do 2º turno
console.log('\n[1] Seções do 2º turno');
console.log(q(`SELECT situacao, COUNT(*) n, SUM(comparecimento > 0) votaram FROM secao WHERE turno = 2 GROUP BY 1`));

// 2. H03: Presidente, 2º turno, BU × oficial seção a seção (independente da view v_divergencia_bu_oficial)
console.log('\n[2] H03 Presidente 2º turno, BU × oficial por seção e número');
const numero = "CASE tipo_voto WHEN 'branco' THEN 95 WHEN 'nulo' THEN 96 ELSE numero END";
const bu = new Map();
for (const r of db.prepare(`SELECT uf, municipio, zona, secao, ${numero} AS n, SUM(quantidade) AS v FROM voto_bu WHERE turno = 2 AND cargo = 1 GROUP BY 1,2,3,4,5`).iterate()) {
  bu.set(`${r.uf}|${r.municipio}|${r.zona}|${r.secao}|${r.n}`, r.v);
}
const of = new Map();
for (const r of db.prepare(`SELECT uf, municipio, zona, secao, numero AS n, SUM(quantidade) AS v FROM voto_oficial WHERE turno = 2 AND cargo = 1 GROUP BY 1,2,3,4,5`).iterate()) {
  of.set(`${r.uf}|${r.municipio}|${r.zona}|${r.secao}|${r.n}`, r.v);
}
const secBu = new Set([...bu.keys()].map((k) => k.split('|').slice(0, 4).join('|')));
const secOf = new Set([...of.keys()].map((k) => k.split('|').slice(0, 4).join('|')));
const secDiv = new Set();
const totais = {};
for (const k of new Set([...bu.keys(), ...of.keys()])) {
  const a = bu.get(k) ?? 0; const b = of.get(k) ?? 0;
  const n = k.split('|')[4];
  totais[n] ??= { bu: 0, oficial: 0 }; totais[n].bu += a; totais[n].oficial += b;
  if (a !== b) secDiv.add(k.split('|').slice(0, 4).join('|'));
}
const soEmUm = [...secBu].filter((s) => !secOf.has(s)).length + [...secOf].filter((s) => !secBu.has(s)).length;
console.log({ secoesBU: secBu.size, secoesOficial: secOf.size, secoesSoNumLado: soEmUm, secoesDivergentes: secDiv.size });
console.log(Object.fromEntries(Object.entries(totais).filter(([, t]) => t.bu > 100000 || t.oficial > 100000)));

// 3. H07: liberação por digital por modelo de urna, 2º turno, sem o exterior
console.log('\n[3] H07 por modelo (sem exterior)');
console.log(q(`SELECT modelo_urna, COUNT(*) secoes, SUM(por_biometria > 0) secoes_com_digital, SUM(comparecimento) comp,
  ROUND(100.0 * SUM(por_biometria) / SUM(comparecimento), 2) pct_digital FROM secao WHERE turno = 2 AND situacao = 'completa' AND uf <> 'zz' GROUP BY 1`));
console.log('exterior:', q(`SELECT modelo_urna, COUNT(*) secoes, SUM(por_biometria) digital FROM secao WHERE turno = 2 AND situacao = 'completa' AND uf = 'zz' GROUP BY 1`));

// H07 dentro da zona: taxa (ano de nascimento sem biometria) e (manual: digital falhou) ~ dummies de modelo, efeito fixo de zona,
// sem pesos e sem controles (especificação mais simples que a do autor).
const linhas = q(`SELECT uf || municipio || zona AS z, modelo_urna m, comparecimento c, sem_biometria a, por_biografia b
  FROM secao WHERE turno = 2 AND situacao = 'completa' AND uf <> 'zz' AND comparecimento > 0`);
const mods = ['ue2013', 'ue2015', 'ue2020'];
const porZona = new Map();
for (const r of linhas) {
  const x = mods.map((m) => (r.m === m ? 1 : 0));
  const g = porZona.get(r.z) ?? { n: 0, sx: [0, 0, 0], sa: 0, sb: 0, rows: [] };
  g.n++; x.forEach((v, i) => (g.sx[i] += v)); g.sa += r.a / r.c; g.sb += r.b / r.c; g.rows.push({ x, a: r.a / r.c, b: r.b / r.c });
  porZona.set(r.z, g);
}
const XtX = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; const Xta = [0, 0, 0]; const Xtb = [0, 0, 0];
for (const g of porZona.values()) {
  const mx = g.sx.map((s) => s / g.n); const ma = g.sa / g.n; const mb = g.sb / g.n;
  for (const r of g.rows) {
    const dx = r.x.map((v, i) => v - mx[i]); const da = r.a - ma; const dbb = r.b - mb;
    for (let i = 0; i < 3; i++) { Xta[i] += dx[i] * da; Xtb[i] += dx[i] * dbb; for (let j = 0; j < 3; j++) XtX[i][j] += dx[i] * dx[j]; }
  }
}
const resolver = (A, y) => { // Gauss 3×3
  const M = A.map((l, i) => [...l, y[i]]);
  for (let i = 0; i < 3; i++) { let p = i; for (let k = i + 1; k < 3; k++) if (Math.abs(M[k][i]) > Math.abs(M[p][i])) p = k; [M[i], M[p]] = [M[p], M[i]];
    for (let k = 0; k < 3; k++) if (k !== i) { const f = M[k][i] / M[i][i]; for (let j = i; j < 4; j++) M[k][j] -= f * M[i][j]; } }
  return M.map((l, i) => l[3] / l[i]);
};
const ba = resolver(XtX, Xta); const bb = resolver(XtX, Xtb);
console.log('dentro da zona, pontos vs UE2022 (ano de nascimento):', Object.fromEntries(mods.map((m, i) => [m, +(100 * ba[i]).toFixed(2)])));
console.log('dentro da zona, pontos vs UE2022 (manual, digital falhou):', Object.fromEntries(mods.map((m, i) => [m, +(100 * bb[i]).toFixed(2)])));

// 4. H08: intervalo mínimo entre votos (perfil do diário), 2º turno
console.log('\n[4] H08');
console.log(q(`SELECT COUNT(*) secoes_com_perfil, SUM(votos_computados > 0) com_voto FROM perfil_log WHERE turno = 2`));
console.log(q(`SELECT uf, municipio, zona, secao, logs_no_pacote, intervalo_minimo_entre_votos i FROM perfil_log
  WHERE turno = 2 AND votos_computados > 1 AND intervalo_minimo_entre_votos <= 16 ORDER BY i`));

// 5. H11: números de série no Acre, 2º turno
console.log('\n[5] H11 Acre');
const ac = q(`SELECT secao, zona, json_extract(dados, '$.bu.urna.numeroSerieFV') fv, json_extract(dados, '$.bu.urna.numeroSerieFC') fc,
  json_extract(dados, '$.bu.urna.numeroInternoUrna') urna, json_extract(dados, '$.log.serialMR') mr, json_extract(dados, '$.log.serialMV') mv
  FROM perfil_log WHERE turno = 2 AND uf = 'ac'`);
const rep = (campo) => { const c = new Map(); for (const r of ac) if (r[campo] != null) c.set(r[campo], (c.get(r[campo]) ?? 0) + 1); return { distintos: c.size, repetidos: [...c.values()].filter((v) => v > 1).length, nulos: ac.filter((r) => r[campo] == null).length }; };
console.log({ secoes: ac.length, fv: rep('fv'), mr: rep('mr'), urna: rep('urna'), fc: rep('fc'), fvIgualMv: ac.filter((r) => r.fv && r.fv === r.mv).length });
const fcZonas = new Map(); for (const r of ac) { const s = fcZonas.get(r.fc) ?? new Set(); s.add(r.zona); fcZonas.set(r.fc, s); }
console.log('mídias de carga em mais de uma zona:', [...fcZonas.values()].filter((s) => s.size > 1).length);
db.close();

// 6. H06: votos depois das 17h e das 18h de Brasília, pelo histograma de votos por hora local do diário (perfil_log),
// com o fuso de cada município tirado da hora de abertura mais comum (abertura = 8h de Brasília). Exterior: hora local.
{
  const { db: d2 } = await abrirLeitura();
  const rows = d2.prepare(`SELECT uf, municipio, substr(json_extract(dados, '$.bu.dataHoraAbertura'), 10, 2) h,
    json_extract(dados, '$.log.votosPorHoraLocal') vph, votos_computados v FROM perfil_log WHERE turno = 2`).all();
  const moda = new Map();
  for (const r of rows) { const k = `${r.uf}|${r.municipio}`; const m = moda.get(k) ?? {}; m[r.h] = (m[r.h] ?? 0) + 1; moda.set(k, m); }
  const fuso = new Map([...moda].map(([k, m]) => [k, 8 - Number(Object.entries(m).filter(([h]) => h !== '' && h !== 'null').sort((a, b) => b[1] - a[1])[0]?.[0] ?? 8)]));
  const t = { br: { total: 0, apos17: 0, apos18: 0, apos19: 0, secoes17: 0 }, zz: { total: 0, apos17local: 0 } };
  for (const r of rows) {
    const vph = JSON.parse(r.vph ?? '[]');
    if (r.uf === 'zz') { t.zz.total += r.v; t.zz.apos17local += vph.slice(17).reduce((a, b) => a + b, 0); continue; }
    const off = fuso.get(`${r.uf}|${r.municipio}`);
    const soma = (hb) => vph.slice(Math.max(0, hb - off)).reduce((a, b) => a + b, 0);
    const a17 = soma(17);
    t.br.total += r.v; t.br.apos17 += a17; t.br.apos18 += soma(18); t.br.apos19 += soma(19); if (a17) t.br.secoes17++;
  }
  console.log('\n[6] H06', t, 'fusos:', [...new Set(fuso.values())]);
  d2.close();
}

// 7. H06: seções (Brasil, sem exterior) cujo BU encerrou às 19h de Brasília ou depois, com o mesmo fuso por município.
{
  const { db: d3 } = await abrirLeitura();
  const rows = d3.prepare(`SELECT uf, municipio, abertura, encerramento FROM secao WHERE turno = 2 AND situacao = 'completa' AND uf <> 'zz'`).all();
  const moda = new Map();
  for (const r of rows) { const k = `${r.uf}|${r.municipio}`; const h = r.abertura?.slice(11, 13); const m = moda.get(k) ?? {}; m[h] = (m[h] ?? 0) + 1; moda.set(k, m); }
  const fuso = new Map([...moda].map(([k, m]) => [k, 8 - Number(Object.entries(m).sort((a, b) => b[1] - a[1])[0][0])]));
  let s19 = 0; let s18 = 0; let total = 0;
  for (const r of rows) {
    if (!r.encerramento) continue; total++;
    const [h, mi, se] = r.encerramento.slice(11).split(':').map(Number);
    const brasilia = h + fuso.get(`${r.uf}|${r.municipio}`) + mi / 60 + se / 3600;
    if (r.encerramento.slice(0, 10) !== '2026-10-25' || brasilia >= 19) s19++;
    if (r.encerramento.slice(0, 10) !== '2026-10-25' || brasilia >= 18) s18++;
  }
  console.log('\n[7] H06 encerramento', { secoes: total, encerrou19hOuDepois: s19, encerrou18hOuDepois: s18 });
  d3.close();
}

// 8. H05: por onde entrou o aumento de comparecimento do 2º turno (perfis por seção dos dois turnos, 27 UFs, sem exterior
// e sem Sistema de Apuração), lidos direto dos JSONL completos (499.207 seções em cada turno).
{
  const { readFileSync, readdirSync } = await import('node:fs');
  const ler = (t) => {
    const m = new Map();
    for (const f of readdirSync(`data/parsed/${t}t/perfil`).filter((x) => /^[a-z]{2}\.jsonl$/.test(x) && x !== 'zz.jsonl')) {
      for (const l of readFileSync(`data/parsed/${t}t/perfil/${f}`, 'utf8').split('\n')) {
        if (!l.trim()) continue;
        const s = JSON.parse(l); const k = `${s.uf}|${s.municipio}|${s.zona}|${s.secao}`;
        if (m.has(k)) { m.set(k, null); continue; }
        const d = s.bu?.detalhamentoComparecimento ?? {};
        m.set(k, { sa: s.bu?.urna?.tipoUrna === 3, comp: s.bu?.qtdEleitoresCompareceram ?? 0, bio: d.porBiometria ?? 0, sem: d.semBiometriaCadastrada ?? 0, man: d.comBiometriaHabilitadosPorAnoNascimento ?? 0 });
      }
    }
    return m;
  };
  const p1 = ler(1); const p2 = ler(2);
  const t = { n: 0, ufs: new Set(), c1: 0, c2: 0, b1: 0, b2: 0, n1: 0, n2: 0 };
  for (const [k, b] of p2) {
    const a = p1.get(k); if (!a || !b || a.sa || b.sa) continue;
    t.n++; t.ufs.add(k.slice(0, 2)); t.c1 += a.comp; t.c2 += b.comp; t.b1 += a.bio; t.b2 += b.bio; t.n1 += a.sem + a.man; t.n2 += b.sem + b.man;
  }
  const dc = t.c2 - t.c1; const dn = t.n2 - t.n1;
  console.log('\n[8] H05', { secoes: t.n, ufs: t.ufs.size, comp1: t.c1, comp2: t.c2, deltaComp: dc, deltaSemDigital: dn, deltaBio: t.b2 - t.b1,
    pctAumentoSemDigital: +(100 * dn / dc).toFixed(2), pctBase1T: +(100 * t.n1 / t.c1).toFixed(2), pctBase2T: +(100 * t.n2 / t.c2).toFixed(2) });
}
