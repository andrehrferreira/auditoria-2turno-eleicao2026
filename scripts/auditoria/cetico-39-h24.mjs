// Cético, parecer 39 (H24): reprodução própria, só com a cópia de leitura do banco (sem os arquivos do matemático).
//  1. Invariantes do BU: aptos = aptos da seção + aptos em trânsito; comparecimento ≤ aptos; só-Presidente
//     (0 ≤ comp federal − comp estadual ≤ aptos federal − aptos estadual); Σ aptos 1º = Σ aptos 2º; Δ seção = −Δ trânsito.
//  2. Liberação sem digital (BU: comparecimento − habilitados por biometria) nas seções com 10+ em trânsito contra as
//     demais seções do mesmo local, por soma direta (sem permutação): média ponderada local a local e contagem de locais
//     em que a seção com 10+ fica abaixo das vizinhas.
//  3. Anomalia operacional (diário do pacote do BU: >50% sem digital com 50+ votos; rajada de 10+ em 10 min) com os
//     grupos separados de verdade: 10+ em trânsito, 1 a 9, e SEM trânsito no mesmo local de uma seção com trânsito.
// Uso: node scripts/auditoria/cetico-39-h24.mjs → data/parsed/auditoria/cetico-revisor/39-h24.json
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { abrirLeitura } from '../../src/banco-leitura.js';

const FED = { 1: 6257, 2: 6258 }; const EST = { 1: 6259, 2: 6260 };
const OUT = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor');
const { db, fonte } = await abrirLeitura();
const R = { fonte };
const k = (r) => `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;

// 1. Invariantes
for (const t of [1, 2]) {
  const v = { pares: 0, v1: 0, v2: 0, soPres: 0, soPresAbaixo: 0, soPresAcima: 0, aptos: 0, aptosSecao: 0, tte: 0, soPresAptos: 0, soPresComp: 0 };
  const est = new Map();
  for (const r of db.prepare('SELECT * FROM secao_eleicao WHERE turno = ?').iterate(t)) {
    v.pares++;
    if (r.aptos !== r.aptos_secao + r.aptos_tte) v.v1++;
    if (r.comparecimento_majoritario !== null && r.comparecimento_majoritario > r.aptos) v.v2++;
    if (r.eleicao === FED[t]) { v.aptos += r.aptos; v.aptosSecao += r.aptos_secao; v.tte += r.aptos_tte; }
    if (r.eleicao === EST[t]) est.set(k(r), r);
  }
  for (const f of db.prepare('SELECT * FROM secao_eleicao WHERE turno = ? AND eleicao = ?').iterate(t, FED[t])) {
    const e = est.get(k(f));
    if (!e || f.comparecimento_majoritario === null || e.comparecimento_majoritario === null) continue;
    v.soPres++;
    const dc = f.comparecimento_majoritario - e.comparecimento_majoritario; const da = f.aptos - e.aptos;
    if (dc < 0) v.soPresAbaixo++;
    if (dc > da) v.soPresAcima++;
    v.soPresAptos += da; v.soPresComp += dc;
  }
  R[`invariantes${t}t`] = v;
}
R.v4 = { aptosIguais: R.invariantes1t.aptos === R.invariantes2t.aptos, deltaSecao: R.invariantes2t.aptosSecao - R.invariantes1t.aptosSecao, deltaTte: R.invariantes2t.tte - R.invariantes1t.tte };

// 2 e 3. Por seção e turno
for (const t of [1, 2]) {
  const S = db.prepare(`SELECT s.uf, s.municipio, s.zona, s.secao, s.local, s.comparecimento comp, s.por_biometria bio, e.aptos_tte tte,
      p.votos_computados lv, p.habilitados_biometria lb, p.maior_rajada_sem_biometria_10min raj
    FROM secao s JOIN secao_eleicao e ON e.turno = s.turno AND e.uf = s.uf AND e.municipio = s.municipio AND e.zona = s.zona AND e.secao = s.secao AND e.eleicao = ?
    LEFT JOIN perfil_log p ON p.turno = s.turno AND p.uf = s.uf AND p.municipio = s.municipio AND p.zona = s.zona AND p.secao = s.secao AND p.hash = s.hash
    WHERE s.turno = ? AND s.situacao = 'completa'`).all(FED[t], t);
  const L = new Map();
  for (const s of S) { const g = `${s.uf}/${s.municipio}/${s.zona}/${s.local}`; (L.get(g) ?? L.set(g, []).get(g)).push(s); }
  // 2. sem digital, 10+ × demais do mesmo local
  let num = 0; let den = 0; let locais = 0; let abaixo = 0; let acima = 0; let iguais = 0; let secoes = 0;
  for (const l of L.values()) {
    const m = l.filter((s) => s.tte >= 10 && s.comp > 0); const o = l.filter((s) => s.tte < 10 && s.comp > 0);
    if (!m.length || !o.length) continue;
    locais++; secoes += m.length;
    const ref = o.reduce((a, s) => a + (s.comp - s.bio), 0) / o.reduce((a, s) => a + s.comp, 0);
    const mm = m.reduce((a, s) => a + (s.comp - s.bio), 0) / m.reduce((a, s) => a + s.comp, 0);
    for (const s of m) { num += (s.comp - s.bio) - ref * s.comp; den += s.comp; }
    if (mm < ref) abaixo++; else if (mm > ref) acima++; else iguais++;
  }
  R[`semDigital10mais${t}t`] = { secoes, locais, efeitoPp: +(100 * num / den).toFixed(3), locaisAbaixo: abaixo, locaisAcima: acima, locaisIguais: iguais };
  // 3. anomalia operacional por grupo
  const gr = { com10: {}, com1a9: {}, semTransitoMesmoLocal: {}, semTransitoMesmoLocalForaZZ: {}, comQualquer: {} };
  const marca = (o, s) => {
    o.secoes = (o.secoes ?? 0) + 1;
    const a50 = s.lv >= 50 && (s.lv - s.lb) / s.lv > 0.5; const r10 = s.raj >= 10;
    if (a50) o.acima50 = (o.acima50 ?? 0) + 1;
    if (r10) o.rajada10 = (o.rajada10 ?? 0) + 1;
    if (a50 && r10) o.ambas = (o.ambas ?? 0) + 1;
    if (s.lv === null || s.lv === undefined) o.semPerfil = (o.semPerfil ?? 0) + 1;
  };
  for (const l of L.values()) {
    const temTransito = l.some((s) => s.tte > 0);
    for (const s of l) {
      if (s.tte > 0) marca(gr.comQualquer, s);
      if (s.tte >= 10) marca(gr.com10, s);
      else if (s.tte > 0) marca(gr.com1a9, s);
      else if (temTransito) { marca(gr.semTransitoMesmoLocal, s); if (s.uf !== 'zz') marca(gr.semTransitoMesmoLocalForaZZ, s); }
    }
  }
  for (const o of Object.values(gr)) { o.pctAcima50 = +(100 * (o.acima50 ?? 0) / o.secoes).toFixed(3); o.pctRajada = +(100 * (o.rajada10 ?? 0) / o.secoes).toFixed(3); }
  R[`anomalia${t}t`] = gr;
}
db.close();
await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, '39-h24.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
