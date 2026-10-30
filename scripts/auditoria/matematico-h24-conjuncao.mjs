// Matemático forense, H24: conjunção. Das seções com trânsito e comparecimento acima do que 100% de presença do
// trânsito explica (T3 de matematico-h24-analise.mjs, excesso > 3 desvios), quantas têm também anomalia operacional no
// diário (mais de 50% dos votos sem digital, com 50+ votos; ou rajada de 10+ liberações sem digital em 10 minutos)?
// Compara com a mesma conjunção nas seções sem trânsito (recalculada aqui com a mesma regra do T3).
// Uso: node scripts/auditoria/matematico-h24-conjuncao.mjs → data/parsed/auditoria/matematico-forense/h24-conjuncao.json
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { SAIDA, carregarSecoes, chave } from './matematico-h23-lib.mjs';

const R = JSON.parse(await readFile(path.join(SAIDA, 'h24-resultado.json'), 'utf8'));
const { db, fonte } = await abrirLeitura();
const S = carregarSecoes(db);
const FED = { 1: 6257, 2: 6258 };
const E = new Map();
for (const r of db.prepare('SELECT turno, uf, municipio, zona, secao, aptos_secao, aptos_tte FROM secao_eleicao WHERE eleicao IN (6257, 6258)').iterate()) E.set(`${r.turno}|${chave(r)}`, r);
const P = new Map();
for (const r of db.prepare(`SELECT p.turno, p.uf, p.municipio, p.zona, p.secao, p.votos_computados v, p.habilitados_biometria b, p.maior_rajada_sem_biometria_10min raj
  FROM perfil_log p JOIN secao s ON s.turno = p.turno AND s.uf = p.uf AND s.municipio = p.municipio AND s.zona = p.zona AND s.secao = p.secao AND s.hash = p.hash`).iterate()) P.set(`${r.turno}|${chave(r)}`, r);
db.close();
const anom = (p) => !!p && ((p.v >= 50 && (p.v - p.b) / p.v > 0.5) || p.raj >= 10);
const out = { fonte };
for (const t of [1, 2]) {
  const tl = `t${t}`;
  const loc = new Map();
  for (const s of S.values()) {
    if ((E.get(`${t}|${s.k}`)?.aptos_tte ?? 0) > 0) continue;
    const g = `${s.uf}/${s.municipio}/${s.zona}/${s[tl].local}`;
    const o = loc.get(g) ?? { comp: 0, aptos: 0 };
    o.comp += s[tl].comp; o.aptos += s[tl].aptos;
    loc.set(g, o);
  }
  const o = { com: { excesso: 0, excessoEAnomalia: 0 }, sem: { excesso: 0, excessoEAnomalia: 0 }, casosComTransito: [] };
  for (const s of S.values()) {
    const f = E.get(`${t}|${s.k}`);
    const ref = loc.get(`${s.uf}/${s.municipio}/${s.zona}/${s[tl].local}`);
    if (!f || !ref) continue;
    const com = f.aptos_tte > 0;
    const refC = com ? ref.comp : ref.comp - s[tl].comp; const refA = com ? ref.aptos : ref.aptos - s[tl].aptos;
    if (refA < 100) continue;
    const taxa = refC / refA;
    const dp = Math.sqrt(f.aptos_secao * taxa * (1 - taxa));
    const excesso = s[tl].comp - f.aptos_secao * taxa - f.aptos_tte;
    if (!(dp > 0 && excesso > 3 * dp)) continue;
    const g = com ? o.com : o.sem;
    g.excesso++;
    const p = P.get(`${t}|${s.k}`);
    if (anom(p)) {
      g.excessoEAnomalia++;
      if (com) o.casosComTransito.push({ k: s.k, tte: f.aptos_tte, comp: s[tl].comp, aptosSecao: f.aptos_secao, excesso: +excesso.toFixed(1), votosDiario: p.v, semDigital: p.v - p.b, rajada: p.raj });
    }
  }
  const ref = R.testes[`T3 excesso de comparecimento ${t}t`];
  o.confereT3 = o.com.excesso === ref.com.excesso3dp && o.sem.excesso === ref.sem.excesso3dp;
  o.com.pctComAnomalia = +(100 * o.com.excessoEAnomalia / o.com.excesso).toFixed(2);
  o.sem.pctComAnomalia = +(100 * o.sem.excessoEAnomalia / o.sem.excesso).toFixed(2);
  out[`${t}t`] = o;
}
await writeFile(path.join(SAIDA, 'h24-conjuncao.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, (c, v) => (c === 'casosComTransito' ? v.slice(0, 15) : v), 1));
