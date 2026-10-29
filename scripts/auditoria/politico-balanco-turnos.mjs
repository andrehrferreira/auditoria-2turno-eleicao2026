// Cientista político: balanço de votos para presidente do 1º para o 2º turno (H10 / doc 07 B5)
// e geografia do resultado. Lê só os dados abertos do TSE, de dentro dos zips, sem rede.
//
// Uso: node scripts/auditoria/politico-balanco-turnos.mjs
// Entradas:
//   votacao_candidato_munzona_2026_BR.csv  votos de presidente por município e zona, nos dois turnos
//   detalhe_votacao_secao_2026_BR.csv      aptos, comparecimento, abstenção, brancos e nulos por seção (presidente)
//   votacao_secao_2026_BR.csv              votos de presidente por seção (para o nível de seção)
// Saídas em data/parsed/auditoria/cientista-politico/.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createReadStream } from 'node:fs';
import readline from 'node:readline';
import { createInflateRaw } from 'node:zlib';
import { ZIPS, entradasZip } from './contagem-zip.mjs';

const SAIDA = 'data/parsed/auditoria/cientista-politico';
mkdirSync(SAIDA, { recursive: true });

const FIN = ['13', '22'];
const GRANDES = ['70', '14', '55', '30']; // eliminados com mais de 300 mil votos no 1º turno (conferido abaixo)
const REGIAO = {
  ac: 'N', am: 'N', ap: 'N', pa: 'N', ro: 'N', rr: 'N', to: 'N',
  al: 'NE', ba: 'NE', ce: 'NE', ma: 'NE', pb: 'NE', pe: 'NE', pi: 'NE', rn: 'NE', se: 'NE',
  df: 'CO', go: 'CO', ms: 'CO', mt: 'CO', es: 'SE', mg: 'SE', rj: 'SE', sp: 'SE', pr: 'S', rs: 'S', sc: 'S', zz: 'EX',
};
const CAPITAL = {
  ac: 'RIO BRANCO', al: 'MACEIÓ', am: 'MANAUS', ap: 'MACAPÁ', ba: 'SALVADOR', ce: 'FORTALEZA', df: 'BRASÍLIA',
  es: 'VITÓRIA', go: 'GOIÂNIA', ma: 'SÃO LUÍS', mg: 'BELO HORIZONTE', ms: 'CAMPO GRANDE', mt: 'CUIABÁ', pa: 'BELÉM',
  pb: 'JOÃO PESSOA', pe: 'RECIFE', pi: 'TERESINA', pr: 'CURITIBA', rj: 'RIO DE JANEIRO', rn: 'NATAL', ro: 'PORTO VELHO',
  rr: 'BOA VISTA', rs: 'PORTO ALEGRE', sc: 'FLORIANÓPOLIS', se: 'ARACAJU', sp: 'SÃO PAULO', to: 'PALMAS',
};
// UFs com 2º turno para governador: Fato do banco (voto_bu, turno 2, cargo 3), 29/10/2026.
const GOV_2T = new Set(['ac', 'am', 'df', 'es', 'rn', 'to']);
// Tipo de local pelo nome (proxy grosseiro: o nome do local é o único dado disponível sem rede).
const TIPOS_LOCAL = [
  ['indigena', /ALDEIA|IND[IÍ]GENA|\bINDIG/],
  ['quilombola', /QUILOMB/],
  ['assentamento', /ASSENTAMENTO|\bP\.?\s?A\.?\s|PROJETO DE ASSENTAMENTO/],
  ['prisional', /PRISIONA|PENITENCI|PRES[IÍ]DIO|CADEIA|DETEN[CÇ][AÃ]O|SOCIOEDUCA|RESSOCIALIZA|CENTRO DE CUSTODIA|CUST[OÓ]DIA/],
];

/** Divide uma linha de CSV do TSE (';', aspas duplas, aspas escapadas como ""). */
function campos(l) {
  const out = [];
  const n = l.length;
  let i = 0;
  while (i <= n) {
    if (l.charCodeAt(i) === 34) {
      let j = i + 1;
      let s = '';
      for (;;) {
        const k = l.indexOf('"', j);
        if (k < 0) { s += l.slice(j); i = n + 1; break; }
        if (l.charCodeAt(k + 1) === 34) { s += l.slice(j, k + 1); j = k + 2; continue; }
        s += l.slice(j, k);
        i = k + 2;
        break;
      }
      out.push(s);
    } else {
      let k = l.indexOf(';', i);
      if (k < 0) k = n;
      out.push(l.slice(i, k));
      i = k + 1;
    }
  }
  return out;
}

async function* csv(zip, nomeEntrada) {
  const e = (await entradasZip(zip)).find((x) => x.nome === nomeEntrada);
  if (!e) throw new Error(`${nomeEntrada} não está em ${zip}`);
  let fluxo = createReadStream(zip, { start: e.inicioDados, end: e.inicioDados + e.tamanhoComprimido - 1 });
  if (e.metodo === 8) fluxo = fluxo.pipe(createInflateRaw());
  const rl = readline.createInterface({ input: fluxo.setEncoding('latin1'), crlfDelay: Infinity });
  let col = null;
  for await (const linha of rl) {
    if (!linha) continue;
    const c = campos(linha);
    if (!col) { col = Object.fromEntries(c.map((x, i) => [x, i])); continue; }
    yield [c, col];
  }
}

const novo = () => ({ aptos: 0, comp: 0, abst: 0, branco: 0, nulo: 0, v: {} });
const somaV = (a, k, q) => { a.v[k] = (a.v[k] ?? 0) + q; };

// ---------- 1. munzona: votos por município (soma das zonas), turnos 1 e 2 ----------
const mun = new Map(); // chave uf|mun → { uf, codigo, nome, t: [null, novo(), novo()], tDet: [...] }
const candidatos = {};
const pegaMun = (uf, cod, nome) => {
  const k = `${uf}|${cod}`;
  let m = mun.get(k);
  if (!m) { m = { uf, codigo: cod, nome, t: [null, novo(), novo()] }; mun.set(k, m); }
  return m;
};
let linhasMunzona = 0;
let geracaoMunzona = null;
for await (const [c, col] of csv(ZIPS.munzona, 'votacao_candidato_munzona_2026_BR.csv')) {
  if (c[col.CD_CARGO] !== '1') continue;
  linhasMunzona++;
  geracaoMunzona ??= `${c[col.DT_GERACAO]} ${c[col.HH_GERACAO]}`;
  const t = Number(c[col.NR_TURNO]);
  const nr = c[col.NR_CANDIDATO];
  candidatos[nr] ??= { nome: c[col.NM_URNA_CANDIDATO], partido: c[col.SG_PARTIDO] };
  const m = pegaMun(c[col.SG_UF].toLowerCase(), c[col.CD_MUNICIPIO], c[col.NM_MUNICIPIO]);
  somaV(m.t[t], nr, Number(c[col.QT_VOTOS_NOMINAIS]));
}
console.error(`munzona: ${linhasMunzona} linhas de presidente, ${mun.size} municípios`);

// ---------- 2. detalhe por seção: aptos, comparecimento, abstenção, brancos, nulos ----------
const secoes = new Map(); // uf|mun|zona|secao → { local, tipo, t: [null, {...}, {...}] }
const chaveSecao = (uf, m, z, s) => `${uf}|${Number(m)}|${Number(z)}|${Number(s)}`;
let geracaoDetalhe = null;
let linhasDetalhe = 0;
for await (const [c, col] of csv(ZIPS.detalheSecao, 'detalhe_votacao_secao_2026_BR.csv')) {
  if (c[col.CD_CARGO] !== '1') continue;
  linhasDetalhe++;
  geracaoDetalhe ??= `${c[col.DT_GERACAO]} ${c[col.HH_GERACAO]}`;
  const t = Number(c[col.NR_TURNO]);
  const uf = c[col.SG_UF].toLowerCase();
  const d = {
    aptos: Number(c[col.QT_APTOS]), comp: Number(c[col.QT_COMPARECIMENTO]), abst: Number(c[col.QT_ABSTENCOES]),
    branco: Number(c[col.QT_VOTOS_BRANCOS]), nulo: Number(c[col.QT_VOTOS_NULOS]), nominais: Number(c[col.QT_VOTOS_NOMINAIS]),
  };
  const m = pegaMun(uf, c[col.CD_MUNICIPIO], c[col.NM_MUNICIPIO]);
  const a = m.t[t];
  a.aptos += d.aptos; a.comp += d.comp; a.abst += d.abst; a.branco += d.branco; a.nulo += d.nulo;
  const k = chaveSecao(uf, c[col.CD_MUNICIPIO], c[col.NR_ZONA], c[col.NR_SECAO]);
  let s = secoes.get(k);
  if (!s) {
    const local = c[col.NM_LOCAL_VOTACAO] ?? '';
    const tipo = TIPOS_LOCAL.find(([, re]) => re.test(local.toUpperCase()))?.[0] ?? (uf === 'zz' ? 'exterior' : 'comum');
    s = { local, tipo, t: [null, null, null] };
    secoes.set(k, s);
  }
  s.t[t] = { ...d, v: {} };
}
console.error(`detalhe: ${linhasDetalhe} linhas, ${secoes.size} seções`);

// ---------- 3. votos por seção (votacao_secao) ----------
let linhasSecao = 0;
let semDetalhe = 0;
let geracaoSecao = null;
const foraMunzona = {}; // votável com voto na seção mas sem linha de presidente no munzona
for await (const [c, col] of csv(ZIPS.votacaoSecao, 'votacao_secao_2026_BR.csv')) {
  if (c[col.CD_CARGO] !== '1') continue;
  linhasSecao++;
  geracaoSecao ??= `${c[col.DT_GERACAO]} ${c[col.HH_GERACAO]}`;
  const t = Number(c[col.NR_TURNO]);
  const s = secoes.get(chaveSecao(c[col.SG_UF].toLowerCase(), c[col.CD_MUNICIPIO], c[col.NR_ZONA], c[col.NR_SECAO]));
  if (!s?.t[t]) { semDetalhe++; continue; }
  const nr = c[col.NR_VOTAVEL];
  if (nr !== '95' && nr !== '96' && !candidatos[nr]) (foraMunzona[nr] ??= { nome: c[col.NM_VOTAVEL], votos: [0, 0, 0] }).votos[t] += Number(c[col.QT_VOTOS]);
  somaV(s.t[t], nr, Number(c[col.QT_VOTOS]));
}
console.error(`votacao_secao: ${linhasSecao} linhas, ${semDetalhe} sem detalhe`);

// ---------- conferências de consistência ----------
const confer = { munNominaisDiferente: 0, secaoSomaDiferente: 0, secaoBrancoNuloDiferente: 0, exemplos: [] };
const nominaisMun = new Map();
for (const [k, s] of secoes) {
  const mk = k.split('|').slice(0, 2).join('|');
  for (const t of [1, 2]) {
    const d = s.t[t];
    if (!d) continue;
    let nom = 0;
    for (const [nr, q] of Object.entries(d.v)) {
      if (nr === '95' || nr === '96') continue;
      nom += q;
      if (foraMunzona[nr]) somaV(mun.get(mk).t[t], nr, q); // entra no município pelo dado de seção
      const x = nominaisMun.get(`${mk}|${t}|${nr}`) ?? 0;
      nominaisMun.set(`${mk}|${t}|${nr}`, x + q);
    }
    if (nom !== d.nominais || nom + d.branco + d.nulo !== d.comp) confer.secaoSomaDiferente++;
    if ((d.v['95'] ?? 0) !== d.branco || (d.v['96'] ?? 0) !== d.nulo) confer.secaoBrancoNuloDiferente++;
  }
}
for (const [mk, m] of mun) {
  for (const t of [1, 2]) {
    for (const [nr, q] of Object.entries(m.t[t].v)) {
      if ((nominaisMun.get(`${mk}|${t}|${nr}`) ?? 0) !== q) {
        confer.munNominaisDiferente++;
        if (confer.exemplos.length < 5) confer.exemplos.push({ mk, t, nr, munzona: q, secoes: nominaisMun.get(`${mk}|${t}|${nr}`) ?? 0 });
      }
    }
  }
}
nominaisMun.clear();

// ---------- balanço ----------
function balanco(m) {
  const [, a, b] = m.t;
  const L1 = a.v['13'] ?? 0, F1 = a.v['22'] ?? 0, L2 = b.v['13'] ?? 0, F2 = b.v['22'] ?? 0;
  const elim = {};
  let E = 0;
  for (const [nr, q] of Object.entries(a.v)) {
    if (FIN.includes(nr)) continue;
    const g = GRANDES.includes(nr) ? nr : 'outros';
    elim[g] = (elim[g] ?? 0) + q;
    E += q;
  }
  const BN1 = a.branco + a.nulo, BN2 = b.branco + b.nulo;
  const dComp = b.comp - a.comp;
  const disponivel = E + (BN1 - BN2) + dComp; // identidade: ΔL + ΔF = disponível
  const dL = L2 - L1, dF = F2 - F1;
  return {
    aptos1: a.aptos, aptos2: b.aptos, comp1: a.comp, comp2: b.comp, BN1, BN2, L1, F1, L2, F2, E, elim,
    dL, dF, dComp, dBN: BN2 - BN1, disponivel, fecha: dL + dF === disponivel,
    // "não cabe" líquido: o ganho de um finalista passa do disponível ⇔ o outro perdeu votos
    excesso13: Math.max(0, dL - disponivel), excesso22: Math.max(0, dF - disponivel),
    // limite bruto (o mais folgado possível): ganho > eliminados + brancos/nulos + abstenção do 1º + novos aptos
    migracaoMinima13: Math.max(0, L2 - (L1 + E + BN1 + a.abst + Math.max(0, b.aptos - a.aptos))),
    migracaoMinima22: Math.max(0, F2 - (F1 + E + BN1 + a.abst + Math.max(0, b.aptos - a.aptos))),
  };
}
const soma = (lista) => {
  const r = { aptos1: 0, aptos2: 0, comp1: 0, comp2: 0, BN1: 0, BN2: 0, L1: 0, F1: 0, L2: 0, F2: 0, E: 0, elim: {}, n: 0 };
  for (const x of lista) {
    r.n++;
    for (const k of ['aptos1', 'aptos2', 'comp1', 'comp2', 'BN1', 'BN2', 'L1', 'F1', 'L2', 'F2', 'E']) r[k] += x[k];
    for (const [g, q] of Object.entries(x.elim)) r.elim[g] = (r.elim[g] ?? 0) + q;
  }
  r.dL = r.L2 - r.L1; r.dF = r.F2 - r.F1; r.dComp = r.comp2 - r.comp1; r.dBN = r.BN2 - r.BN1;
  r.disponivel = r.E - r.dBN + r.dComp;
  r.parte13 = r.dL / r.disponivel;
  r.pct13_1 = r.L1 / (r.L1 + r.F1 + r.E); r.pct22_1 = r.F1 / (r.L1 + r.F1 + r.E);
  r.pct13_2 = r.L2 / (r.L2 + r.F2); r.pct22_2 = r.F2 / (r.L2 + r.F2);
  r.compPct1 = r.comp1 / r.aptos1; r.compPct2 = r.comp2 / r.aptos2;
  r.perdeu13 = lista.filter((x) => x.dL < 0).length; r.perdeu22 = lista.filter((x) => x.dF < 0).length;
  r.excesso13 = lista.reduce((s, x) => s + x.excesso13, 0); r.excesso22 = lista.reduce((s, x) => s + x.excesso22, 0);
  r.migracaoMinima13 = lista.reduce((s, x) => s + x.migracaoMinima13, 0); r.migracaoMinima22 = lista.reduce((s, x) => s + x.migracaoMinima22, 0);
  return r;
};

const municipios = [];
for (const m of mun.values()) {
  if (!m.t[1].aptos || !m.t[2].aptos) continue;
  const b = balanco(m);
  municipios.push({
    uf: m.uf, regiao: REGIAO[m.uf], codigo: m.codigo, nome: m.nome, capital: CAPITAL[m.uf] === m.nome,
    gov2t: GOV_2T.has(m.uf), ...b,
  });
}
const ufs = {};
for (const uf of Object.keys(REGIAO)) ufs[uf] = soma(municipios.filter((x) => x.uf === uf));
const regioes = {};
for (const r of ['N', 'NE', 'CO', 'SE', 'S', 'EX']) regioes[r] = soma(municipios.filter((x) => x.regiao === r));
const brasil = soma(municipios);
const faixas = [[0, 10000], [10000, 50000], [50000, 200000], [200000, 1e9]];
const porPorte = faixas.map(([lo, hi]) => ({ faixa: `${lo}-${hi}`, ...soma(municipios.filter((x) => x.uf !== 'zz' && !x.capital && x.aptos2 >= lo && x.aptos2 < hi)) }));
porPorte.push({ faixa: 'capitais', ...soma(municipios.filter((x) => x.capital)) });
const porGov2t = { com: soma(municipios.filter((x) => x.gov2t)), sem: soma(municipios.filter((x) => !x.gov2t && x.uf !== 'zz')) };

// Onde estava o voto de cada eliminado: participação por região e as 3 UFs mais fortes
const reduto = {};
for (const nr of Object.keys(candidatos)) {
  if (FIN.includes(nr)) continue;
  const g = GRANDES.includes(nr) ? nr : null;
  if (!g) continue;
  const porUf = Object.entries(ufs).map(([uf, r]) => ({ uf, pct: r.elim[nr] / r.comp1, votos: r.elim[nr] })).sort((a, b) => b.pct - a.pct);
  reduto[nr] = { nacionalPct: brasil.elim[nr] / brasil.comp1, top: porUf.slice(0, 5) };
}

// ---------- regressão ecológica (Goodman) por seção ----------
// Categorias do 1º turno (fração dos aptos): 13, 22, 70, 14, 55, 30, outros, brancos/nulos, abstenção.
// Desfechos do 2º turno (fração dos aptos): 13, 22, brancos/nulos, abstenção. Sem intercepto, peso = aptos.
const CAT = ['13', '22', '70', '14', '55', '30', 'outros', 'BN', 'abst'];
const OUT = ['13', '22', 'BN', 'abst'];
const acc = {}; // grupo → { XtX, XtY }
const pegaAcc = (g) => (acc[g] ??= { n: 0, XtX: CAT.map(() => CAT.map(() => 0)), XtY: CAT.map(() => OUT.map(() => 0)) });
const secaoLista = [];
let comparaveis = 0, excluidas = 0;
for (const [k, s] of secoes) {
  const [a, b] = [s.t[1], s.t[2]];
  if (!a || !b || a.aptos < 20 || Math.abs(b.aptos - a.aptos) > 5) { excluidas++; continue; }
  comparaveis++;
  const uf = k.split('|')[0];
  const x1 = { BN: a.branco + a.nulo, abst: a.abst };
  let outros = 0;
  for (const [nr, q] of Object.entries(a.v)) {
    if (nr === '95' || nr === '96') continue;
    if (FIN.includes(nr) || GRANDES.includes(nr)) x1[nr] = q; else outros += q;
  }
  x1.outros = outros;
  const x = CAT.map((c) => (x1[c] ?? 0) / a.aptos);
  const y = [(b.v['13'] ?? 0) / b.aptos, (b.v['22'] ?? 0) / b.aptos, (b.branco + b.nulo) / b.aptos, b.abst / b.aptos];
  for (const g of ['BR', REGIAO[uf], uf]) {
    const A = pegaAcc(g);
    A.n++;
    for (let i = 0; i < CAT.length; i++) {
      if (!x[i]) continue;
      for (let j = 0; j < CAT.length; j++) A.XtX[i][j] += a.aptos * x[i] * x[j];
      for (let j = 0; j < OUT.length; j++) A.XtY[i][j] += a.aptos * x[i] * y[j];
    }
  }
  const L1 = a.v['13'] ?? 0, F1 = a.v['22'] ?? 0, L2 = b.v['13'] ?? 0, F2 = b.v['22'] ?? 0;
  const val2 = L2 + F2;
  secaoLista.push({
    k, uf, local: s.local, tipo: s.tipo, aptos: b.aptos, comp1: a.comp, comp2: b.comp, L1, F1, L2, F2,
    E: a.comp - L1 - F1 - a.branco - a.nulo, BN1: a.branco + a.nulo, BN2: b.branco + b.nulo,
    pct13: val2 ? L2 / val2 : null, dL: L2 - L1, dF: F2 - F1,
  });
}
function resolver(M, v) {
  const n = M.length;
  const A = M.map((r, i) => [...r, v[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    if (Math.abs(A[c][c]) < 1e-12) return null;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let j = c; j <= n; j++) A[r][j] -= f * A[c][j];
    }
  }
  return A.map((r, i) => r[n] / r[i]);
}
const transicao = {};
for (const [g, A] of Object.entries(acc)) {
  const t = { secoes: A.n };
  for (let j = 0; j < OUT.length; j++) {
    const beta = resolver(A.XtX, A.XtY.map((r) => r[j]));
    if (!beta) { t.erro = 'matriz singular'; break; }
    CAT.forEach((c, i) => { (t[c] ??= {})[OUT[j]] = Math.round(beta[i] * 1000) / 1000; });
  }
  transicao[g] = t;
}

// ---------- seções extremas (2º turno) e maiores perdas líquidas de um finalista ----------
const porTipo = {};
for (const s of secaoLista) {
  const val = s.L2 + s.F2;
  const p = (porTipo[s.tipo] ??= { secoes: 0, votos13: 0, votos22: 0, ext13: 0, ext22: 0 });
  p.secoes++; p.votos13 += s.L2; p.votos22 += s.F2;
  if (val >= 50 && s.L2 / val >= 0.95) p.ext13++;
  if (val >= 50 && s.F2 / val >= 0.95) p.ext22++;
}
for (const p of Object.values(porTipo)) p.pct13 = p.votos13 / (p.votos13 + p.votos22);
const ext = (nr) => secaoLista.filter((s) => s.L2 + s.F2 >= 50 && (nr === '13' ? s.L2 : s.F2) / (s.L2 + s.F2) >= 0.95);
const extremas13 = ext('13'), extremas22 = ext('22');
const resumoExt = (l) => {
  const t = {};
  for (const s of l) t[s.tipo] = (t[s.tipo] ?? 0) + 1;
  const u = {};
  for (const s of l) u[s.uf] = (u[s.uf] ?? 0) + 1;
  return { total: l.length, porTipo: t, porUf: Object.entries(u).sort((a, b) => b[1] - a[1]).slice(0, 10) };
};
// perda líquida: o outro finalista perdeu votos na seção (ganho além do disponível)
const perdas13 = secaoLista.filter((s) => s.dL < 0).sort((a, b) => a.dL / a.aptos - b.dL / b.aptos);
const perdas22 = secaoLista.filter((s) => s.dF < 0).sort((a, b) => a.dF / a.aptos - b.dF / b.aptos);
const distPerda = (l, campo) => {
  const v = l.map((s) => -s[campo]).sort((a, b) => a - b);
  const q = (p) => v[Math.min(v.length - 1, Math.floor(p * v.length))];
  return { secoes: v.length, votos: v.reduce((a, b) => a + b, 0), mediana: q(0.5), p99: q(0.99), max: v.at(-1), acima20: v.filter((x) => x >= 20).length };
};

// ---------- abstenção diferencial: quem deixou de votar (ou passou a votar) entre os turnos? ----------
// Por UF, regressão por seção: ΔL/comp1 e ΔF/comp1 em [1, Δcomp/comp1, eliminados/comp1, brancosNulos/comp1].
// Previsão da hipótese "abstenção diferencial": o coeficiente de Δcomp para cada finalista fica perto
// da fatia dele no comparecimento do 1º turno. Também: inclinação de Δcomp% sobre a fatia do 22 no 1º turno.
function mqo(linhas, nx) {
  const XtX = Array.from({ length: nx }, () => Array(nx).fill(0));
  const Xty = Array(nx).fill(0);
  for (const { x, y, w } of linhas) {
    for (let i = 0; i < nx; i++) { Xty[i] += w * x[i] * y; for (let j = 0; j < nx; j++) XtX[i][j] += w * x[i] * x[j]; }
  }
  const b = resolver(XtX, Xty);
  return b && b.map((v) => Math.round(v * 1000) / 1000);
}
const abstencao = {};
for (const uf of Object.keys(REGIAO)) {
  const l = secaoLista.filter((s) => s.uf === uf && s.comp1 >= 20);
  const lin = (campo) => l.map((s) => ({ w: s.comp1, x: [1, (s.comp2 - s.comp1) / s.comp1, s.E / s.comp1, s.BN1 / s.comp1], y: s[campo] / s.comp1 }));
  const [, cL] = mqo(lin('dL'), 4) ?? [];
  const [, cF] = mqo(lin('dF'), 4) ?? [];
  const gr = mqo(l.map((s) => ({ w: s.aptos, x: [1, s.F1 / Math.max(1, s.L1 + s.F1)], y: (s.comp2 - s.comp1) / s.aptos })), 2);
  const c1 = l.reduce((a, s) => a + s.comp1, 0);
  abstencao[uf] = {
    secoes: l.length, coefComp13: cL, coefComp22: cF,
    fatia13_1t: +(l.reduce((a, s) => a + s.L1, 0) / c1).toFixed(3), fatia22_1t: +(l.reduce((a, s) => a + s.F1, 0) / c1).toFixed(3),
    inclinacaoDCompPorFatia22: gr?.[1],
  };
}
// Seções em local indígena no Norte: o comparecimento caiu mais?
const indigenaNorte = {};
for (const s of secaoLista.filter((x) => REGIAO[x.uf] === 'N')) {
  const g = (indigenaNorte[`${s.uf}:${s.tipo === 'indigena' ? 'indigena' : 'outras'}`] ??= { secoes: 0, aptos: 0, comp1: 0, comp2: 0 });
  g.secoes++; g.aptos += s.aptos; g.comp1 += s.comp1; g.comp2 += s.comp2;
}
// Extremos no 1º turno (fatia no confronto 13 × 22) e persistência dos extremos do 2º turno
const fatia1 = (s, nr) => (s.L1 + s.F1 >= 50 ? (nr === '13' ? s.L1 : s.F1) / (s.L1 + s.F1) : null);
const extremos1t = { '13': secaoLista.filter((s) => fatia1(s, '13') >= 0.95).length, '22': secaoLista.filter((s) => fatia1(s, '22') >= 0.95).length };
const persistencia = {
  '13': extremas13.filter((s) => fatia1(s, '13') >= 0.9).length / extremas13.length,
  '22': extremas22.filter((s) => fatia1(s, '22') >= 0.9).length / extremas22.length,
};
// Municípios com a maior virada de fatia: a virada é geral nas seções ou concentrada em poucas?
const SWING = process.env.SWING_MUN?.split(',') ?? ['al|27170', 'pi|11878', 'ba|34096', 'rj|58190', 'rj|58998', 'ms|91847', 'rn|18554', 'rs|87610'];
const homogeneidade = {};
for (const mk of SWING) {
  const l = secaoLista.filter((s) => s.k.startsWith(`${mk}|`) && s.L1 + s.F1 >= 30 && s.L2 + s.F2 >= 30);
  const d = l.map((s) => s.L2 / (s.L2 + s.F2) - s.L1 / (s.L1 + s.F1)).sort((a, b) => a - b);
  if (!d.length) continue;
  homogeneidade[mk] = {
    nome: mun.get(mk)?.nome, secoes: d.length, mediana: +d[Math.floor(d.length / 2)].toFixed(3),
    p10: +d[Math.floor(d.length * 0.1)].toFixed(3), p90: +d[Math.floor(d.length * 0.9)].toFixed(3),
    mesmoSinal: +(d.filter((x) => Math.sign(x) === Math.sign(d[Math.floor(d.length / 2)])).length / d.length).toFixed(3),
  };
}

const resumo = {
  geradoEm: new Date().toISOString(),
  fontes: { munzona: geracaoMunzona, detalheSecao: geracaoDetalhe, votacaoSecao: geracaoSecao },
  linhas: { munzona: linhasMunzona, detalhe: linhasDetalhe, votacaoSecao: linhasSecao, votacaoSecaoSemDetalhe: semDetalhe },
  conferencias: { ...confer, foraMunzona, identidadeFechaMunicipios: municipios.filter((x) => x.fecha).length, municipios: municipios.length },
  candidatos,
  brasil, regioes, ufs, porPorte, porGov2t, reduto,
  secoes: { comparaveis, excluidas, porTipo, extremas13: resumoExt(extremas13), extremas22: resumoExt(extremas22),
    perdaLiquida13: distPerda(perdas13, 'dL'), perdaLiquida22: distPerda(perdas22, 'dF') },
  transicao,
  abstencao, indigenaNorte, extremos1t, persistencia, homogeneidade,
};
writeFileSync(`${SAIDA}/balanco-resumo.json`, JSON.stringify(resumo, null, 1));
writeFileSync(`${SAIDA}/balanco-municipios.jsonl`, municipios.sort((a, b) => b.excesso13 + b.excesso22 - a.excesso13 - a.excesso22).map((x) => JSON.stringify(x)).join('\n') + '\n');
const fmtSec = (s) => JSON.stringify(s);
writeFileSync(`${SAIDA}/secoes-extremas.jsonl`, [...extremas13.map((s) => ({ favorece: '13', ...s })), ...extremas22.map((s) => ({ favorece: '22', ...s }))].map(fmtSec).join('\n') + '\n');
writeFileSync(`${SAIDA}/secoes-perda-liquida.jsonl`, [...perdas13.slice(0, 500).map((s) => ({ perdeu: '13', ...s })), ...perdas22.slice(0, 500).map((s) => ({ perdeu: '22', ...s }))].map(fmtSec).join('\n') + '\n');
console.error('ok');
