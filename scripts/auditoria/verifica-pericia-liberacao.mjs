// Verificação independente dos números de docs/pericia/04-liberacao-dos-eleitores.md.
// Universo: todos os perfis de seção dos dois turnos (data/parsed/<t>t/perfil/*.jsonl, 28 unidades cada),
// mais o perfil do eleitorado do exterior (dados abertos). Não usa os scripts dos autores.
// Uso: node scripts/auditoria/verifica-pericia-liberacao.mjs
import { createReadStream } from 'node:fs';
import { open } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const PRES = { 1: 6257, 2: 6258 };
const NE = new Set(['al', 'ba', 'ce', 'ma', 'pb', 'pe', 'pi', 'rn', 'se']);
const pct = (n, d, c = 2) => (d ? +((100 * n) / d).toFixed(c) : null);
const mediana = (v) => { const s = [...v].sort((a, b) => a - b); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };

function resumo(p) {
  const el = p.bu.eleicoes.find((e) => e.idEleicao === PRES[p.turno]);
  const v = el?.cargos.find((c) => c.codigoCargo === 1)?.votos ?? {};
  const d = p.bu.detalhamentoComparecimento ?? null;
  const l = p.log ?? {};
  return {
    uf: p.uf, chave: `${p.municipio}/${p.zona}/${p.secao}`, municipio: p.municipio, zona: p.zona, secao: p.secao,
    tipoUrna: p.bu.urna.tipoUrna, modelo: l.modeloUrna ?? null, comp: p.bu.qtdEleitoresCompareceram ?? 0,
    temDet: d !== null, bio: d?.porBiometria ?? 0, ano: d?.semBiometriaCadastrada ?? 0, man: d?.comBiometriaHabilitadosPorAnoNascimento ?? 0,
    v13: v['13'] ?? 0, v22: v['22'] ?? 0,
    lBio: l.habilitadosBiometria ?? 0, lAno: l.anoNascimentoSemBiometria ?? 0, lMan: l.dadoPessoalConfere ?? 0, lMes: l.habilitadosPeloMesario ?? 0,
    maiorMes: Math.max(0, ...Object.values(l.mesarios?.liberacoesPorMesario ?? {})),
    votosLog: l.votosComputados ?? 0, jaVotou: l.jaVotou ?? 0,
  };
}

async function lerTurno(turno) {
  const linhas = [];
  for (const uf of UFS) {
    const rl = createInterface({ input: createReadStream(path.join(DIR_DADOS, 'parsed', `${turno}t`, 'perfil', `${uf}.jsonl`)) });
    for await (const l of rl) if (l.trim()) linhas.push(resumo(JSON.parse(l)));
  }
  return linhas;
}

const out = {};
const t = { 1: await lerTurno(1), 2: await lerTurno(2) };

// ---- Item 1: universo completo de cada turno (todas as linhas de perfil) ----
for (const turno of [1, 2]) {
  const L = t[turno];
  const soma = (f, filtro = () => true) => L.filter(filtro).reduce((a, s) => a + f(s), 0);
  const br = (s) => s.uf !== 'zz';
  const comp = soma((s) => s.comp), compBr = soma((s) => s.comp, br);
  const bio = soma((s) => s.bio), ano = soma((s) => s.ano), man = soma((s) => s.man);
  out[`t${turno}_universo`] = {
    linhasPerfil: L.length, secoesUnicas: new Set(L.map((s) => `${s.uf}/${s.chave}`)).size, ufs: new Set(L.map((s) => s.uf)).size,
    tipoUrna: L.reduce((a, s) => ((a[s.tipoUrna] = (a[s.tipoUrna] ?? 0) + 1), a), {}),
    comparecimento: comp, compBrasil: compBr, compExterior: comp - compBr,
    bio, ano, man, pctBio: pct(bio, comp, 2), pctAno: pct(ano, comp, 2), pctMan: pct(man, comp, 2), pctExterior: pct(comp - compBr, comp, 2),
    semDigitalBrasilPct: pct(ano + man, compBr, 2),
    manSemMesarioBU: soma((s) => Math.max(0, s.man - s.lMes)), manSemMesarioLog: soma((s) => s.lMan - s.lMes),
    logMan: soma((s) => s.lMan), logMes: soma((s) => s.lMes),
    secoesBuDifLog: L.filter((s) => s.temDet && (s.bio !== s.lBio || s.ano !== s.lAno || s.man !== s.lMan)).length,
  };
}

// ---- Item 1: pareamento dos dois turnos (mesma regra do texto: par único nos dois turnos, sem tipoUrna 3) ----
function mapa(L) {
  const m = new Map();
  for (const s of L) { const k = `${s.uf}/${s.chave}`; m.set(k, m.has(k) ? null : s); }
  return m;
}
const m1 = mapa(t[1]), m2 = mapa(t[2]);
const par = { secoes: 0, 1: { comp: 0, bio: 0, ano: 0, man: 0, semMes: 0 }, 2: { comp: 0, bio: 0, ano: 0, man: 0, semMes: 0 } };
let duplicadas2 = 0, semPar2 = 0, tipo3 = 0;
for (const [k, s2] of m2) {
  const s1 = m1.get(k);
  if (s2 === null) { duplicadas2++; continue; }
  if (!s1) { semPar2++; continue; }
  if (s1.tipoUrna === 3 || s2.tipoUrna === 3) { tipo3++; continue; }
  par.secoes++;
  for (const [n, s] of [[1, s1], [2, s2]]) {
    par[n].comp += s.comp; par[n].bio += s.bio; par[n].ano += s.ano; par[n].man += s.man; par[n].semMes += Math.max(0, s.man - s.lMes);
  }
}
for (const n of [1, 2]) Object.assign(par[n], { pBio: pct(par[n].bio, par[n].comp, 1), pAno: pct(par[n].ano, par[n].comp, 1), pMan: pct(par[n].man, par[n].comp, 1) });
par.delta = { comp: par[2].comp - par[1].comp, bio: par[2].bio - par[1].bio, ano: par[2].ano - par[1].ano, man: par[2].man - par[1].man };
par.delta.pctBio = pct(par.delta.bio, par.delta.comp, 1);
par.excluidas2T = { duplicadas: duplicadas2, semParNo1T: semPar2, tipoUrna3: tipo3 };
out.pareado = par;

// ---- Item 1/2: Acre, 2º turno ----
{
  const A = t[2].filter((s) => s.uf === 'ac');
  const semMes = A.map((s) => s.lMan - s.lMes);
  out.acre2t = {
    linhas: A.length, secoesUnicas: new Set(A.map((s) => s.chave)).size,
    bio: A.reduce((a, s) => a + s.bio, 0), ano: A.reduce((a, s) => a + s.ano, 0), man: A.reduce((a, s) => a + s.man, 0),
    lBio: A.reduce((a, s) => a + s.lBio, 0), lAno: A.reduce((a, s) => a + s.lAno, 0), lMan: A.reduce((a, s) => a + s.lMan, 0),
    secoesBuDifLog: A.filter((s) => s.bio !== s.lBio || s.ano !== s.lAno || s.man !== s.lMan).length,
    manSemMesario: semMes.reduce((a, b) => a + b, 0), secoesComManSemMesario: semMes.filter((x) => x > 0).length,
  };
  out.acre2t.pctSemMesario = pct(out.acre2t.manSemMesario, out.acre2t.lMan, 1);
}

// ---- Item 2: RN, concentração da liberação manual por mesário (2º turno) ----
{
  const R = t[2].filter((s) => s.uf === 'rn' && s.lMan >= 20);
  out.rn2t = {
    secoesManual20: R.length,
    medianaMaiorSobreManual: +(100 * mediana(R.map((s) => s.maiorMes / s.lMan))).toFixed(1),
    medianaMaiorSobreAssociadas: +(100 * mediana(R.filter((s) => s.lMes > 0).map((s) => s.maiorMes / s.lMes))).toFixed(1),
  };
  const R2 = t[2].filter((s) => s.uf === 'rn' && s.lMes >= 20);
  out.rn2t.secoesAssociadas20 = R2.length;
  out.rn2t.medianaMaiorSobreAssociadas20 = +(100 * mediana(R2.map((s) => s.maiorMes / s.lMes))).toFixed(1);
}

// ---- Item 4: exterior ----
for (const turno of [1, 2]) {
  const Z = t[turno].filter((s) => s.uf === 'zz');
  const comVoto = Z.filter((s) => s.comp > 0);
  out[`zz${turno}t`] = {
    linhas: Z.length, linhasComVoto: comVoto.length, secoesUnicasComVoto: new Set(comVoto.map((s) => s.chave)).size,
    comp: Z.reduce((a, s) => a + s.comp, 0), comDetalhamentoBU: Z.filter((s) => s.temDet).length,
    lBio: Z.reduce((a, s) => a + s.lBio, 0), lAno: Z.reduce((a, s) => a + s.lAno, 0), lMan: Z.reduce((a, s) => a + s.lMan, 0),
    votosLog: Z.reduce((a, s) => a + s.votosLog, 0),
  };
}
{
  const h = await open(path.join(DIR_DADOS, 'raw', 'dadosabertos', 'perfil_eleitor_secao', 'perfil_eleitor_secao_2026_ZZ.zip'));
  try {
    const e = (await listarEntradas(h)).find((x) => x.nome.endsWith('.csv'));
    const linhas = (await lerEntrada(h, e)).toString('latin1').split('\n');
    const cab = linhas[0].replaceAll('"', '').trim().split(';');
    const [iQ, iB] = [cab.indexOf('QT_ELEITORES'), cab.indexOf('QT_ELEITORES_BIOMETRIA')];
    let q = 0, b = 0;
    for (const l of linhas.slice(1)) { if (!l.trim()) continue; const c = l.split(';'); q += +c[iQ]; b += +c[iB]; }
    out.cadastroZZ = { eleitores: q, comBiometria: b, pct: pct(b, q, 1), dataGeracao: linhas[1].split(';')[0] };
  } finally { await h.close(); }
}

// ---- Item 5: modelo de urna (2º turno, sem exterior; modelo do log) ----
{
  const B = t[2].filter((s) => s.uf !== 'zz' && s.temDet);
  const pm = {};
  for (const s of B) {
    const m = (pm[s.modelo ?? 'sem'] ??= { linhas: 0, comp: 0, bio: 0, ano: 0, man: 0, comBio: 0 });
    m.linhas++; m.comp += s.comp; m.bio += s.bio; m.ano += s.ano; m.man += s.man; if (s.bio > 0) m.comBio++;
  }
  for (const m of Object.values(pm)) Object.assign(m, { pBio: pct(m.bio, m.comp, 1), pAno: pct(m.ano, m.comp, 1), pMan: pct(m.man, m.comp, 1) });
  out.modelo2t = pm;
  out.modelo2t_semDetalhamento_semZZ = t[2].filter((s) => s.uf !== 'zz' && !s.temDet).length;
  // Nordeste × demais, UE2013 e UE2022
  const reg = {};
  for (const s of B) {
    const r = NE.has(s.uf) ? 'NE' : 'outras';
    const x = (reg[r] ??= { secoes: 0, ue2013: 0, m: {} });
    x.secoes++; if (s.modelo === 'UE2013') x.ue2013++;
    const y = (x.m[s.modelo] ??= { comp: 0, man: 0 }); y.comp += s.comp; y.man += s.man;
  }
  out.regiao2t = Object.fromEntries(Object.entries(reg).map(([r, x]) => [r, {
    secoes: x.secoes, ue2013: x.ue2013, pctUe2013: pct(x.ue2013, x.secoes, 1),
    manUe2013: pct(x.m.UE2013?.man ?? 0, x.m.UE2013?.comp ?? 0, 1), manUe2022: pct(x.m.UE2022?.man ?? 0, x.m.UE2022?.comp ?? 0, 1),
  }]));
}

// ---- Item 5: comparação dentro da zona (efeito fixo de UF×zona, sem outros controles, OLS por seção) ----
function feModelo(L, y) {
  const mods = ['UE2013', 'UE2015', 'UE2020'];
  const S = L.filter((s) => s.uf !== 'zz' && s.temDet && s.comp > 0 && ['UE2013', 'UE2015', 'UE2020', 'UE2022'].includes(s.modelo) && y(s) !== null);
  const g = new Map();
  for (const s of S) { const k = `${s.uf}/${s.zona}`; if (!g.has(k)) g.set(k, []); g.get(k).push(s); }
  const XtX = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], Xty = [0, 0, 0];
  for (const grupo of g.values()) {
    const n = grupo.length;
    const my = grupo.reduce((a, s) => a + y(s), 0) / n;
    const mx = mods.map((m) => grupo.filter((s) => s.modelo === m).length / n);
    for (const s of grupo) {
      const x = mods.map((m, i) => (s.modelo === m ? 1 : 0) - mx[i]);
      const yy = y(s) - my;
      for (let i = 0; i < 3; i++) { Xty[i] += x[i] * yy; for (let j = 0; j < 3; j++) XtX[i][j] += x[i] * x[j]; }
    }
  }
  // resolve 3x3 (Gauss)
  const A = XtX.map((r, i) => [...r, Xty[i]]);
  for (let i = 0; i < 3; i++) {
    const p = A[i][i];
    for (let j = i; j < 4; j++) A[i][j] /= p;
    for (let k = 0; k < 3; k++) if (k !== i) { const f = A[k][i]; for (let j = i; j < 4; j++) A[k][j] -= f * A[i][j]; }
  }
  return { secoes: S.length, UE2013: +A[0][3].toFixed(3), UE2015: +A[1][3].toFixed(3), UE2020: +A[2][3].toFixed(3) };
}
for (const turno of [1, 2]) {
  const L = t[turno];
  out[`fe_t${turno}`] = {
    anoNascimento: feModelo(L, (s) => (100 * s.ano) / s.comp),
    manual: feModelo(L, (s) => (100 * s.man) / s.comp),
    parcela13: feModelo(L, (s) => (s.v13 + s.v22 ? (100 * s.v13) / (s.v13 + s.v22) : null)),
  };
}

// ---- Item 6.4/6.1: parcela sem digital por UF, 1º → 2º turno (BA, PE, PR) ----
out.semDigitalUF = {};
for (const uf of ['ba', 'pe', 'pr']) {
  out.semDigitalUF[uf] = [1, 2].map((turno) => {
    const U = t[turno].filter((s) => s.uf === uf);
    const c = U.reduce((a, s) => a + s.comp, 0), x = U.reduce((a, s) => a + s.ano + s.man, 0);
    return pct(x, c, 2);
  });
}

// ---- Item 7: "O eleitor identificado já votou" (2º turno) ----
{
  const V = t[2].filter((s) => s.votosLog > 0);
  const r = (s) => s.jaVotou / s.votosLog;
  out.jaVotou2t = {
    pctRazaoMenor005EntreSecoesComAviso: pct(V.filter((s) => s.jaVotou > 0 && r(s) < 0.05).length, V.filter((s) => s.jaVotou > 0).length, 2),
    linhasComVoto: V.length, eventos: V.reduce((a, s) => a + s.jaVotou, 0), secoesComEvento: V.filter((s) => s.jaVotou > 0).length,
    pctRazaoMenor005: pct(V.filter((s) => r(s) < 0.05).length, V.length, 1),
    razao09a11_votos30: V.filter((s) => r(s) >= 0.9 && r(s) <= 1.1 && s.votosLog >= 30).map((s) => `${s.uf}/${s.chave}: ${s.jaVotou}/${s.votosLog}`),
    maisAvisosQueVotos: V.filter((s) => s.jaVotou > s.votosLog).map((s) => `${s.uf}/${s.chave}: ${s.jaVotou}/${s.votosLog}`),
  };
}

console.log(JSON.stringify(out, null, 1));
