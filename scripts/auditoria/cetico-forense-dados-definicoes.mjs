// Revisão cética (lente: dados e definições) do achado "forense sem marca de fraude".
// Uso: node scripts/auditoria/cetico-forense-dados-definicoes.mjs
// Saída: data/parsed/auditoria/cetico/forense-dados-definicoes.json
//
// Mede, sobre as mesmas entradas do autor (forense/secoes-2t.csv + perfil + locais), o que muda com as definições:
//  1. Canto de Klimek (comp ≥ 95%, parcela ≥ 95%): nulo do autor (permutar comparecimento na zona) contra nulos
//     estratificados por tamanho da seção e por categoria. Quanto do 64 × 6,6 cada estrato explica.
//  2. TTE (eleitores com transferência temporária: mesários, policiais, presos, trânsito) entram em `aptos` e quase
//     sempre votam. Comparecimento mínimo sem eles: (comp − tte) / (aptos − tte). Quantas seções saem do canto.
//  3. Parcela do 22 = 1 − parcela do 13 no 2º turno (sem outros): as duas "caudas" e as duas correlações são a mesma
//     medida. Verifica e mede.
//  4. Cobertura dos controles: seções sem perfil, peso das categorias não comuns no voto (teto da circularidade).
//  5. 1º turno com as UFs carregadas agora (cópia de leitura, abrirLeitura): as 110 seções com 100% e as 64 do canto.
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { aleatorio, carregarSecoes, chaveSecao, pearson } from './forense-lib.mjs';
import { mkdir, writeFile } from 'node:fs/promises';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const SAIDA = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico');
const rnd = aleatorio(777);
const PERM = 20;

const secoes = (await carregarSecoes(2)).filter((s) => s.aptos > 0 && s.validos > 0);
const parc = (s) => s.v13 / s.validos;
const res = { secoes: secoes.length };

// ---------- 3. 22 = 1 − 13 ----------
res.complementar = {
  secoesComOutros: secoes.filter((s) => s.outros !== 0).length,
  nota: 'Sem "outros" no 2º turno, parcela22 = 1 − parcela13: z(22) = −z(13) e r(22) = −r(13) por construção.',
};

// ---------- 1. canto com nulos estratificados ----------
const faixaApt = (a) => (a < 50 ? 'a<50' : a < 100 ? 'a<100' : a < 200 ? 'a<200' : a < 300 ? 'a<300' : 'a300+');
const comum = (s) => (s.categoria === 'comum' ? 'c' : 'nc');
function cantoPerm(estrato, t = 0.95, v = 0.95, compDe = (s) => s.comp) {
  const grupos = new Map();
  for (const s of secoes) {
    const k = estrato(s);
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(s);
  }
  const obs = secoes.filter((s) => compDe(s) >= t && parc(s) >= v).length;
  const vals = [];
  for (let r = 0; r < PERM; r++) {
    let n = 0;
    for (const g of grupos.values()) {
      const cs = g.map(compDe);
      for (let i = cs.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [cs[i], cs[j]] = [cs[j], cs[i]]; }
      for (let i = 0; i < g.length; i++) if (cs[i] >= t && parc(g[i]) >= v) n++;
    }
    vals.push(n);
  }
  const m = vals.reduce((a, b) => a + b, 0) / PERM;
  const dp = Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / (PERM - 1));
  return { observado: obs, esperado: +m.toFixed(1), dp: +dp.toFixed(1), excesso: +(obs - m).toFixed(1) };
}
const z = (s) => `${s.uf}/${s.zona}`;
res.canto95 = {
  autor_zona: cantoPerm(z),
  zona_x_tamanho: cantoPerm((s) => `${z(s)}|${faixaApt(s.aptos)}`),
  zona_x_categoria: cantoPerm((s) => `${z(s)}|${s.categoria}`),
  zona_x_tamanho_x_comum: cantoPerm((s) => `${z(s)}|${faixaApt(s.aptos)}|${comum(s)}`),
  municipio_x_tamanho_x_comum: cantoPerm((s) => `${s.uf}/${s.municipio}|${faixaApt(s.aptos)}|${comum(s)}`),
};
// Mesmos nulos para o 22 (simetria do teste).
{
  const salva = secoes.map((s) => s.v13);
  // trocar 13 ↔ 22 temporariamente
  for (const s of secoes) [s.v13, s.v22] = [s.v22, s.v13];
  res.canto95.autor_zona_22 = cantoPerm(z);
  res.canto95.zona_x_tamanho_x_comum_22 = cantoPerm((s) => `${z(s)}|${faixaApt(s.aptos)}|${comum(s)}`);
  for (const s of secoes) [s.v13, s.v22] = [s.v22, s.v13];
  secoes.forEach((s, i) => { if (s.v13 !== salva[i]) throw new Error('troca 13/22 falhou'); });
}

// ---------- 2. TTE ----------
const compSemTte = (s) => (s.aptos - s.aptos_tte > 0 ? Math.max(0, s.comparecimento - s.aptos_tte) / (s.aptos - s.aptos_tte) : 0);
const noCanto = secoes.filter((s) => s.comp >= 0.95 && parc(s) >= 0.95);
res.tte = {
  secoesComTte: secoes.filter((s) => s.aptos_tte > 0).length,
  cantoComTte: noCanto.filter((s) => s.aptos_tte > 0).length,
  cantoSaiSemTte: noCanto.filter((s) => compSemTte(s) < 0.95).length,
  canto95_semTte_autor: cantoPerm(z, 0.95, 0.95, compSemTte),
  comp95_total: secoes.filter((s) => s.comp >= 0.95).length,
  comp95_semTte: secoes.filter((s) => compSemTte(s) >= 0.95).length,
};

// Descrição das 64 do canto: tamanho, categoria, agregadas, perfil.
const desc = (lista) => {
  const cat = {}, tam = {};
  for (const s of lista) { cat[s.categoria] = (cat[s.categoria] ?? 0) + 1; tam[faixaApt(s.aptos)] = (tam[faixaApt(s.aptos)] ?? 0) + 1; }
  const ap = lista.map((s) => s.aptos).sort((a, b) => a - b);
  return { n: lista.length, categorias: cat, tamanho: tam, aptosMediana: ap[Math.floor(ap.length / 2)] ?? null,
    semPerfil: lista.filter((s) => s.p60 == null).length, comAgregada: lista.filter((s) => s.agregadas > 0).length,
    pIndMedio: +(lista.filter((s) => s.pInd != null).reduce((a, s) => a + s.pInd, 0) / Math.max(1, lista.filter((s) => s.pInd != null).length)).toFixed(3) };
};
res.cantoDescricao = { todos: desc(noCanto), comuns: desc(noCanto.filter((s) => s.categoria === 'comum')) };
res.cantoComunsLista = noCanto.filter((s) => s.categoria === 'comum').map((s) => ({ secao: chaveSecao(s), municipio: s.nome_municipio,
  local: s.nome_local, aptos: s.aptos, tte: s.aptos_tte, comp: s.comparecimento, v13: s.v13, v22: s.v22, pInd: s.pInd == null ? null : +s.pInd.toFixed(3),
  pBaixa: s.pBaixa == null ? null : +s.pBaixa.toFixed(3), tipo_urna: s.tipo_urna }));

// ---------- 4. cobertura dos controles e teto da circularidade ----------
const porCat = {};
for (const s of secoes) {
  const c = (porCat[s.categoria] ??= { secoes: 0, validos: 0, v13: 0, v22: 0, abstencao: 0, semPerfil: 0 });
  c.secoes++; c.validos += s.validos; c.v13 += s.v13; c.v22 += s.v22; c.abstencao += s.aptos - s.comparecimento;
  if (s.p60 == null) c.semPerfil++;
}
const tot = Object.values(porCat).reduce((a, c) => ({ v13: a.v13 + c.v13, v22: a.v22 + c.v22 }), { v13: 0, v22: 0 });
const naoComum = Object.entries(porCat).filter(([k]) => !['comum'].includes(k)).reduce((a, [, c]) => ({ v22: a.v22 + c.v22, abst: a.abst + c.abstencao, val: a.val + c.validos }), { v22: 0, abst: 0, val: 0 });
const indQuilPris = ['indigena', 'quilombola', 'prisional'].map((k) => porCat[k]).reduce((a, c) => ({ v22: a.v22 + c.v22, abst: a.abst + c.abstencao, val: a.val + c.validos }), { v22: 0, abst: 0, val: 0 });
res.categorias = porCat;
res.circularidade = {
  margem13: tot.v13 - tot.v22,
  validosNaoComuns: naoComum.val,
  fracaoValidosNaoComuns: +(naoComum.val / (tot.v13 + tot.v22)).toFixed(4),
  // Teto: quanto a margem mudaria se TODO voto do 22 e TODA abstenção dessas seções virassem 13 (fraude máxima escondida).
  tetoMargemIndQuilPris: indQuilPris.v22 * 2 + indQuilPris.abst,
  tetoMargemTodasNaoComuns: naoComum.v22 * 2 + naoComum.abst,
  secoesSemPerfil: secoes.filter((s) => s.p60 == null).length,
};

// Perfil (cadastro de julho) × aptos do BU (dia da eleição, sem TTE): a unidade casa?
{
  const razoes = [];
  let fora10 = 0, n = 0;
  for (const s of secoes) {
    if (!s.perfil?.eleitores) continue;
    const base = s.aptos - s.aptos_tte;
    if (base <= 0) continue;
    const r = s.perfil.eleitores / base;
    razoes.push(r); n++;
    if (Math.abs(r - 1) > 0.1) fora10++;
  }
  razoes.sort((a, b) => a - b);
  res.perfilVsAptos = { secoes: n, mediana: +razoes[Math.floor(n / 2)].toFixed(4), p01: +razoes[Math.floor(n * 0.01)].toFixed(3),
    p99: +razoes[Math.floor(n * 0.99)].toFixed(3), foraDe10pct: fora10 };
}

// Correlação dentro da zona do autor reproduzida (13 e 22) e por tamanho.
{
  const zonas = new Map();
  for (const s of secoes) { const k = z(s); if (!zonas.has(k)) zonas.set(k, []); zonas.get(k).push(s); }
  const dx = [], dy13 = [], dy22 = [];
  for (const g of zonas.values()) {
    if (g.length < 3) continue;
    const mx = g.reduce((a, s) => a + s.comp, 0) / g.length;
    const m13 = g.reduce((a, s) => a + parc(s), 0) / g.length;
    const m22 = g.reduce((a, s) => a + s.v22 / s.validos, 0) / g.length;
    for (const s of g) { dx.push(s.comp - mx); dy13.push(parc(s) - m13); dy22.push(s.v22 / s.validos - m22); }
  }
  res.correlacaoZona = { r13: +pearson(dx, dy13).toFixed(4), r22: +pearson(dx, dy22).toFixed(4) };
}

// ---------- 5. 1º turno com as UFs carregadas agora ----------
{
  const { db, fonte } = await abrirLeitura();
  const ufs1 = db.prepare('SELECT uf FROM carga WHERE turno = 1 ORDER BY uf').all().map((r) => r.uf);
  const qVotos = db.prepare(`SELECT tipo_voto, numero, SUM(quantidade) q FROM voto_bu
    WHERE turno = 1 AND cargo = 1 AND uf = ? AND municipio = ? AND zona = ? AND secao = ? GROUP BY 1, 2`);
  const qEl = db.prepare(`SELECT aptos, comparecimento_majoritario c FROM secao_eleicao WHERE turno = 1 AND eleicao = 6257
    AND uf = ? AND municipio = ? AND zona = ? AND secao = ?`);
  const primeiro = (s) => {
    if (!ufs1.includes(s.uf)) return null;
    let v13 = 0, v22 = 0, val = 0;
    for (const r of qVotos.all(s.uf, s.municipio, s.zona, s.secao)) {
      if (r.tipo_voto !== 'nominal') continue;
      val += r.q; if (r.numero === 13) v13 = r.q; if (r.numero === 22) v22 = r.q;
    }
    const e = qEl.get(s.uf, s.municipio, s.zona, s.secao);
    if (!val || !e) return { semDado: true };
    return { p13: v13 / val, p22: v22 / val, comp: e.aptos ? e.c / e.aptos : null };
  };
  const cem = secoes.filter((s) => s.v13 === s.validos || s.v22 === s.validos);
  const r100 = { total: cem.length, com1t: 0, ja90: 0, ja95: 0, semDado: 0, min: 1, ufsSem1t: [] };
  for (const s of cem) {
    const p = primeiro(s);
    if (!p) { r100.ufsSem1t.push(s.uf); continue; }
    if (p.semDado) { r100.semDado++; continue; }
    r100.com1t++;
    const pc = s.v13 === s.validos ? p.p13 : p.p22;
    if (pc >= 0.9) r100.ja90++;
    if (pc >= 0.95) r100.ja95++;
    r100.min = Math.min(r100.min, pc);
  }
  r100.ufsSem1t = [...new Set(r100.ufsSem1t)];
  const rc = { total: noCanto.length, com1t: 0, cantoTambem1t: 0, comp95_1t: 0, parc95_1t: 0, semDado: 0 };
  for (const s of noCanto) {
    const p = primeiro(s);
    if (!p) continue;
    if (p.semDado) { rc.semDado++; continue; }
    rc.com1t++;
    if (p.comp >= 0.95) rc.comp95_1t++;
    if (p.p13 >= 0.95) rc.parc95_1t++;
    if (p.comp >= 0.95 && p.p13 >= 0.95) rc.cantoTambem1t++;
  }
  res.primeiroTurno = { fonte: path.basename(fonte), ufsCarregadas: ufs1.length, ufs: ufs1.join(','), secoes100pct: r100, canto95: rc };
  db.close();
}

await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, 'forense-dados-definicoes.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify({ ...res, cantoComunsLista: `${res.cantoComunsLista.length} linhas (ver JSON)` }, null, 1));
