// Parecer cético 57: reprodução independente da H02(a)(c) do doc 30 (estatístico) e testes contra ela.
// Caminho próprio: o cadastro sai direto dos zips públicos perfil_eleitor_secao_2026_<UF>.zip (soma de QT_ELEITORES e
// QT_ELEITORES_BIOMETRIA por seção), não do cadastro-secao.jsonl; agregadas e BU do banco (cópia de leitura); a foto dos
// arquivos horario-<t>t.jsonl da frente H13 (mesma fonte do autor, conferida à parte em cetico-57-foto-log.mjs).
// Não importa nenhum script estatistico-h02-h05-final-*.
//   E  = sb − S − folga;  E′ = (sb − F) − S − folga;  folga = TTE + max(0, aptos_secao − cadastro)
// Sensibilidades (revisor):
//   S1 defeito do parecer 54: seções com perfil < metade dos aptos (perfil de julho fora de data) → quanto a folga esconde;
//   S2 folga "realista": o eleitor que entrou depois de julho tem a mesma parcela sem biometria que a zona (e não 100%);
//   S3 foto de base: parte de F é foto de eleitor que já está em S (controle da UF), não pode ser descontada do excesso.
// Uso: node --max-old-space-size=8192 scripts/auditoria/cetico-57-h02a.mjs
// Saída: data/parsed/auditoria/cetico/57/h02a.json
import { createReadStream } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { linhasZip, pad } from './forense-lib.mjs';
import { campoPerfil } from './cetico-57-lib.mjs';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', '57');
await mkdir(SAIDA, { recursive: true });
const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const r4 = (x) => (Number.isFinite(x) ? Math.round(x * 1e4) / 1e4 : null);
const ch = (r) => `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;

// 1. cadastro dos zips públicos de 2026
const cad = new Map();
{
  const dir = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'perfil_eleitor_secao');
  for (const z of (await readdir(dir)).filter((n) => /^perfil_eleitor_secao_2026_[A-Z]{2}\.zip$/.test(n) && !n.includes('_ZZ'))) {
    let cab = null;
    for await (const [, l] of linhasZip(path.join(dir, z))) {
      if (!cab) { const h = l.split(';').map((n) => n.replace(/"/g, '')); cab = Object.fromEntries(h.map((n, i) => [n, i])); cab.__n = h.length; continue; }
      const f = campoPerfil(l, cab.__n); const c = new Proxy({}, { get: (_, i) => f(Number(i)) });
      const k = `${c[cab.SG_UF].toLowerCase()}/${pad(c[cab.CD_MUNICIPIO], 5)}/${pad(c[cab.NR_ZONA], 4)}/${pad(c[cab.NR_SECAO], 4)}`;
      const g = cad.get(k) ?? { e: 0, b: 0 };
      g.e += Number(c[cab.QT_ELEITORES]); g.b += Number(c[cab.QT_ELEITORES_BIOMETRIA]);
      cad.set(k, g);
    }
  }
  log(`cadastro (zips 2026): ${cad.size} seções`);
}

const { db } = await abrirLeitura();
const out = { geradoEm: new Date().toISOString(), turnos: {} };
for (const t of [1, 2]) {
  const ag = new Map();
  for (const a of db.prepare('SELECT uf, municipio, zona, secao, secao_principal FROM secao_agregada WHERE turno = ?').all(t)) {
    const k = ch({ ...a, secao: a.secao_principal }); if (!ag.has(k)) ag.set(k, []); ag.get(k).push(ch(a));
  }
  const rows = db.prepare(`SELECT s.uf, s.municipio, s.zona, s.secao, s.comparecimento c, s.sem_biometria sb, e.aptos_secao ap, e.aptos_tte tte
    FROM secao s JOIN secao_eleicao e USING (turno, uf, municipio, zona, secao) WHERE s.turno = ? AND e.eleicao = ? AND s.uf <> 'zz'`).all(t, t === 1 ? 6257 : 6258);
  const hor = new Map();
  for await (const l of createInterface({ input: createReadStream(path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h13-v2', `horario-${t}t.jsonl`)), crlfDelay: Infinity })) {
    if (!l) continue; const h = JSON.parse(l);
    let v2 = 0; for (const x of h.hora?.v2 ?? []) v2 += x;
    hor.set(h.id, { v2, F: h.v2Foto });
  }
  // primeira passada: seções, cadastro somado com agregadas, taxa de S por zona (para S2) e foto de base por UF (para S3)
  const L = [];
  const zonaS = new Map(); const ufBase = new Map();
  for (const r of rows) {
    if (!r.c || r.sb == null) continue;
    const k = ch(r);
    if (!cad.has(k)) continue;
    let e = 0, b = 0; for (const kk of [k, ...(ag.get(k) ?? [])]) { const g = cad.get(kk); if (g) { e += g.e; b += g.b; } }
    const S = e - b, folga = (r.tte ?? 0) + Math.max(0, (r.ap ?? 0) - e);
    const E = r.sb - S - folga;
    const h = hor.get(k);
    const o = { k, uf: r.uf, zon: `${r.uf}|${r.zona}`, sb: r.sb, S, e, ap: r.ap ?? 0, tte: r.tte ?? 0, folga, E, F: h && h.v2 === r.sb ? h.F : null, bate: h ? h.v2 === r.sb : null };
    L.push(o);
    const z = zonaS.get(o.zon) ?? { S: 0, e: 0 }; z.S += S; z.e += e; zonaS.set(o.zon, z);
    if (E <= 0 && o.F != null && o.sb > 0) { const u = ufBase.get(r.uf) ?? { v2: 0, F: 0 }; u.v2 += o.sb; u.F += o.F; ufBase.set(r.uf, u); }
  }
  const T = { analisadas: L.length, comExcesso: 0, somaE: 0, comExcessoBate: 0, somaEbate: 0, somaElinha: 0, secoesElinha: 0, naoBate: 0,
    S1: {}, S2: { comExcesso: 0, somaE: 0, somaElinha: 0, secoesElinha: 0 }, S3: { somaElinha: 0, secoesElinha: 0 } };
  for (const o of L) {
    if (o.E > 0) {
      T.comExcesso++; T.somaE += o.E;
      if (o.F == null) T.naoBate++;
      else { T.comExcessoBate++; T.somaEbate += o.E; const El = o.E - o.F; if (El > 0) { T.somaElinha += El; T.secoesElinha++; }
        // S3: só a foto acima da base da UF explica excesso
        const base = ufBase.get(o.uf); const fb = base ? base.F / base.v2 : 0;
        const El3 = o.E - Math.max(0, o.F - fb * o.sb); if (El3 > 0) { T.S3.somaElinha += El3; T.S3.secoesElinha++; } }
    }
    // S2: folga com a parcela sem biometria da zona para os eleitores acima do cadastro
    const z = zonaS.get(o.zon); const pz = z.e ? z.S / z.e : 0;
    const folga2 = o.tte + Math.max(0, o.ap - o.e) * pz;
    const E2 = o.sb - o.S - folga2;
    if (E2 > 0) { T.S2.comExcesso++; T.S2.somaE += E2; if (o.F != null) { const El = E2 - o.F; if (El > 0) { T.S2.somaElinha += El; T.S2.secoesElinha++; } } }
  }
  T.parcelaExplicada = r4(1 - T.somaElinha / T.somaEbate);
  T.S2.somaE = Math.round(T.S2.somaE); T.S2.somaElinha = Math.round(T.S2.somaElinha);
  T.S2.parcelaExplicada = r4(1 - T.S2.somaElinha / T.S2.somaE);
  T.S3.somaElinha = Math.round(T.S3.somaElinha); T.S3.parcelaExplicada = r4(1 - T.S3.somaElinha / T.somaEbate);
  T.fotoBasePorUf = Object.fromEntries([...ufBase].sort().map(([u, x]) => [u, r4(x.F / x.v2)]));
  // S1: perfil de julho fora de data (parecer 54)
  const def = L.filter((o) => o.ap >= 100 && o.e < 0.5 * o.ap);
  const def25 = L.filter((o) => o.ap >= 100 && o.e <= 25);
  const soma = (l, f) => l.reduce((a, o) => a + (f(o) ?? 0), 0);
  T.S1 = {
    regra: 'aptos da seção ≥ 100 e perfil de julho < metade dos aptos',
    secoes: def.length, porUf: Object.fromEntries([...new Set(def.map((o) => o.uf))].sort().map((u) => [u, def.filter((o) => o.uf === u).length])),
    folgaPeloAptosMenosCadastro: soma(def, (o) => Math.max(0, o.ap - o.e)), sb: soma(def, (o) => o.sb), F: soma(def, (o) => o.F), comExcesso: def.filter((o) => o.E > 0).length,
    sbSemFoto: soma(def, (o) => (o.F == null ? null : o.sb - o.F)),
    // quanto excesso apareceria se o eleitor acima do cadastro tivesse a parcela sem biometria da zona (S2 só nessas seções)
    excessoS2: Math.round(soma(def, (o) => { const z = zonaS.get(o.zon); const pz = z.e ? z.S / z.e : 0; const e2 = o.sb - o.S - (o.tte + Math.max(0, o.ap - o.e) * pz); return e2 > 0 ? e2 : 0; })),
    residuoS2: Math.round(soma(def, (o) => { if (o.F == null) return 0; const z = zonaS.get(o.zon); const pz = z.e ? z.S / z.e : 0; const e2 = o.sb - o.F - o.S - (o.tte + Math.max(0, o.ap - o.e) * pz); return e2 > 0 ? e2 : 0; })),
    perfilAte25: def25.length,
  };
  // folga total do país
  T.folgaTotal = { tte: soma(L, (o) => o.tte), aptosAcimaDoCadastro: soma(L, (o) => Math.max(0, o.ap - o.e)) };
  out.turnos[`${t}t`] = T;
  log(`turno ${t}: ${JSON.stringify({ comExcesso: T.comExcesso, somaE: T.somaE, Elinha: T.somaElinha, secoesElinha: T.secoesElinha, explicada: T.parcelaExplicada, S2: T.S2, S3: T.S3, S1: { secoes: T.S1.secoes, excessoS2: T.S1.excessoS2, residuoS2: T.S1.residuoS2 } })}`);
}
db.close();
await writeFile(path.join(SAIDA, 'h02a.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
