// Cético, achado "invariantes sem violação" (matemático forense), itens (c) e (d), universo inteiro (27 UFs com
// cadastro por seção, os dois turnos; o exterior fica fora porque não tem cadastro aberto por seção).
//
// 1) PODER de T1 e T3 (o autor não mediu): folga de cada seção até violar.
//    T1: folga = N − aptos da seção (min. dos 2 turnos). k eleitores fictícios na carga da urna só violam T1 se k > folga.
//    T3: folga = N + TTE1 + TTE2 − max(comBio2 + sem1, comBio1 + sem2). k eleitores que "trocam de grupo" (ou k votos
//        a mais num grupo) só violam T3 se k > folga.
// 2) Alternativa NÃO testada pelo autor para T2 (QT_ELEITORES_BIOMETRIA < habilitados por biometria):
//    - benigna (classificação): a urna trata como "com biometria" eleitores que o dado aberto dá como sem. O total de
//      votantes não muda; muda só a divisão entre grupos. Prediz: comparecimento da seção sinalizada = o das vizinhas
//      da mesma zona; "sem biometria" do BU ÷ A do cadastro bem MENOR que nas vizinhas.
//    - maligna (votos a mais por digital de outra pessoa / modelo biométrico inserido na carga): prediz comparecimento
//      da seção sinalizada ACIMA das vizinhas, em ordem de grandeza do excesso.
//    Comparação dentro da mesma zona (município+zona), só zonas com seções sinalizadas e não sinalizadas.
// Uso: node scripts/auditoria/cetico-invariantes-alternativas.mjs [--uf mg,es]
// Saída: data/parsed/auditoria/cetico/invariantes/alternativas.json
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { carregarUf } from './biometria-cadastro.mjs';

const { db, ponteiro } = await abrirLeitura();
const { values } = parseArgs({ options: { uf: { type: 'string' } } });
const carregadas = db.prepare('SELECT uf FROM carga WHERE turno = 1 INTERSECT SELECT uf FROM carga WHERE turno = 2').all().map((r) => r.uf);
const ufs = values.uf ? values.uf.split(',') : carregadas.filter((u) => u !== 'zz');
const FEDERAL = { 1: 6257, 2: 6258 };
const q = db.prepare(`SELECT s.municipio, s.zona, s.secao, s.comparecimento, s.sem_biometria, s.por_biometria, s.por_biografia,
    e.aptos, e.aptos_secao, e.aptos_tte
  FROM secao s JOIN secao_eleicao e ON e.turno = s.turno AND e.uf = s.uf AND e.municipio = s.municipio AND e.zona = s.zona AND e.secao = s.secao AND e.eleicao = ?
  WHERE s.turno = ? AND s.uf = ? AND s.situacao = 'completa'`);
const qAgr = db.prepare('SELECT municipio, zona, secao, secao_principal FROM secao_agregada WHERE turno = ? AND uf = ?');
const k = (m, z, s) => `${m}/${z}/${s}`;
const LIMIARES = [1, 2, 5, 10, 20, 50];

const folgaT1 = new Map(); // folga → nº de seções
const folgaT3 = new Map();
const add = (m, v) => m.set(v, (m.get(v) ?? 0) + 1);
// T2: por turno, agregados das comparações dentro da zona
const t2 = { 1: null, 2: null };
for (const t of [1, 2]) t2[t] = { secoesSinalizadas: 0, excesso: 0, zonasComparadas: 0, sinalizadasComparadas: 0, somaDifComparecimentoPp: 0, somaDifComparecimentoEleitores: 0, somaExcessoComparadas: 0, somaDifRazaoSemBio: 0, nRazao: 0, porUf: {} };
let secoesTestadas = 0;
let excluidas = 0;

for (const uf of ufs) {
  const inicio = Date.now();
  const cad = await carregarUf(uf);
  const dados = {};
  const membros = {};
  for (const t of [1, 2]) {
    dados[t] = new Map(q.all(FEDERAL[t], t, uf).map((r) => [k(r.municipio, r.zona, r.secao), r]));
    membros[t] = new Map();
    for (const a of qAgr.all(t, uf)) {
      const p = k(a.municipio, a.zona, a.secao_principal);
      membros[t].set(p, [...(membros[t].get(p) ?? []), k(a.municipio, a.zona, a.secao)]);
    }
  }
  const cadastro = (t, chave) => {
    let n = 0; let b = 0; let falta = 0;
    for (const c of [chave, ...(membros[t].get(chave) ?? [])]) {
      const r = cad.get(`${uf}/${c}`);
      if (!r) falta++; else { n += r.eleitores; b += r.biometria; }
    }
    return { n, b, falta };
  };
  const porZona = { 1: new Map(), 2: new Map() };
  for (const [chave, s2] of dados[2]) {
    const s1 = dados[1].get(chave);
    if (!s1) continue;
    const c1 = cadastro(1, chave);
    const c2 = cadastro(2, chave);
    if (c1.falta || c2.falta || s1.sem_biometria === null || s2.sem_biometria === null) { excluidas++; continue; }
    secoesTestadas++;
    add(folgaT1, Math.min(c1.n - s1.aptos_secao, c2.n - s2.aptos_secao));
    const lim = c1.n + s1.aptos_tte + s2.aptos_tte;
    const a = s2.por_biometria + s2.por_biografia + s1.sem_biometria;
    const b = s1.por_biometria + s1.por_biografia + s2.sem_biometria;
    add(folgaT3, lim - Math.max(a, b));
    const zona = chave.split('/').slice(0, 2).join('/');
    for (const [t, s, c] of [[1, s1, c1], [2, s2, c2]]) {
      const comBio = s.por_biometria + s.por_biografia;
      const excesso = comBio - (c.b + s.aptos_tte);
      const A = c.n - c.b;
      const reg = { sinal: excesso > 0, excesso, comp: s.comparecimento / s.aptos, aptos: s.aptos, razaoSem: A >= 10 ? s.sem_biometria / A : null };
      const z = porZona[t].get(zona) ?? [];
      z.push(reg);
      porZona[t].set(zona, z);
    }
  }
  for (const t of [1, 2]) {
    const r = t2[t];
    const u = (r.porUf[uf] ??= { sinalizadas: 0, excesso: 0, zonas: 0, difComparecimentoPpMedia: null, difRazaoSemBioMedia: null, _pp: 0, _n: 0, _rz: 0, _nrz: 0 });
    for (const lista of porZona[t].values()) {
      const sin = lista.filter((x) => x.sinal);
      const nao = lista.filter((x) => !x.sinal);
      r.secoesSinalizadas += sin.length; u.sinalizadas += sin.length;
      const ex = sin.reduce((s, x) => s + x.excesso, 0);
      r.excesso += ex; u.excesso += ex;
      if (!sin.length || nao.length < 3) continue;
      const media = (xs, f) => xs.reduce((s, x) => s + f(x), 0) / xs.length;
      const compNao = media(nao, (x) => x.comp);
      r.zonasComparadas++; u.zonas++;
      for (const x of sin) {
        r.sinalizadasComparadas++;
        r.somaDifComparecimentoPp += 100 * (x.comp - compNao);
        r.somaDifComparecimentoEleitores += (x.comp - compNao) * x.aptos;
        r.somaExcessoComparadas += x.excesso;
        u._pp += 100 * (x.comp - compNao); u._n++;
      }
      const naoRz = nao.filter((x) => x.razaoSem !== null);
      if (naoRz.length) {
        const rzNao = media(naoRz, (x) => x.razaoSem);
        for (const x of sin) if (x.razaoSem !== null) { r.somaDifRazaoSemBio += x.razaoSem - rzNao; r.nRazao++; u._rz += x.razaoSem - rzNao; u._nrz++; }
      }
    }
  }
  console.log(`${uf}: ${((Date.now() - inicio) / 1000).toFixed(0)} s`);
}

const curva = (m) => {
  const total = [...m.values()].reduce((a, b) => a + b, 0);
  const detecta = Object.fromEntries(LIMIARES.map((L) => [L, +([...m].filter(([f]) => f < L).reduce((s, [, n]) => s + n, 0) / total).toFixed(4)]));
  const ord = [...m].sort((a, b) => a[0] - b[0]);
  const pct = (p) => { let acc = 0; for (const [f, n] of ord) { acc += n; if (acc >= p * total) return f; } return null; };
  return { secoes: total, folgaMin: ord[0]?.[0], p01: pct(0.01), p10: pct(0.1), mediana: pct(0.5), p90: pct(0.9), max: ord.at(-1)?.[0], fracaoQueDetectaKAlteracoes: detecta };
};
const fim = (r) => {
  for (const u of Object.values(r.porUf)) {
    u.difComparecimentoPpMedia = u._n ? +(u._pp / u._n).toFixed(3) : null;
    u.difRazaoSemBioMedia = u._nrz ? +(u._rz / u._nrz).toFixed(4) : null;
    delete u._pp; delete u._n; delete u._rz; delete u._nrz;
  }
  return {
    ...r,
    difComparecimentoPpMedia: +(r.somaDifComparecimentoPp / r.sinalizadasComparadas).toFixed(3),
    eleitoresAMaisPeloComparecimento: Math.round(r.somaDifComparecimentoEleitores),
    excessoNasComparadas: r.somaExcessoComparadas,
    difRazaoSemBioMedia: +(r.somaDifRazaoSemBio / r.nRazao).toFixed(4),
  };
};
const resultado = {
  geradoEm: new Date().toISOString(), copiaLeitura: ponteiro.arquivo, ufs, secoesTestadas, excluidas,
  T1: curva(folgaT1), T3: curva(folgaT3), T2alternativas: { 1: fim(t2[1]), 2: fim(t2[2]) },
};
const destino = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'invariantes');
await mkdir(destino, { recursive: true });
await writeFile(path.join(destino, 'alternativas.json'), `${JSON.stringify(resultado, null, 1)}\n`);
const { porUf: _a, ...t2r1 } = resultado.T2alternativas[1];
const { porUf: _b, ...t2r2 } = resultado.T2alternativas[2];
console.log(JSON.stringify({ secoesTestadas, excluidas, T1: resultado.T1, T3: resultado.T3, T2_1t: t2r1, T2_2t: t2r2 }, null, 1));
