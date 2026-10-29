// Cético, achado b1a-sem-biometria-acima-do-cadastro, lente "explicações alternativas e poder do teste".
// Reproduz o excesso direto do banco (não usa os .jsonl do autor) e testa alternativas que o autor não testou:
//  A. reprodução: seções com BU sem biometria > cadastro sem biometria + folga (TTE + aptos acima do cadastro)
//  B. tamanho real do grupo "com biometria no cadastro, sem digital na urna": seções com cadastro 100% biometria
//  C. idade: o grupo escondido se explica por eleitores novos (coleta pendente) ou idosos (digital ruim)?
//  D. comparecimento: se o grupo escondido fosse voto de ausente, o comparecimento subiria com ele (com simulação de poder)
//  E. horário: as liberações sem biometria das seções com excesso se concentram na última hora?
//  F. vizinhança: o grupo escondido cobre a zona inteira, ou só algumas seções/locais?
//  G. repetição 1º × 2º turno (UFs do 1º turno já no banco)
// Banco somente leitura; cadastro do perfil_eleitor_secao via cadastro-secao.jsonl (biometria-cadastro.mjs).
// Uso: node scripts/auditoria/cetico-b1a-alternativas.mjs   Saída: data/parsed/auditoria/cetico/b1a-alternativas.json
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { DIR_DADOS } from '../../src/config.js';
import { lerCadastro, resumoDist, spearman } from './biometria-comum.mjs';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');
const db = new DatabaseSync(path.join(DIR_DADOS, 'db', 'eleicao2026.sqlite'), { readOnly: true });
const cadastro = await lerCadastro();
const k = (r, sec = r.secao) => `${r.uf}/${r.municipio}/${r.zona}/${sec}`;

function agregadas(turno) {
  const m = new Map();
  for (const a of db.prepare('SELECT uf, municipio, zona, secao, secao_principal FROM secao_agregada WHERE turno = ?').all(turno)) {
    const kk = k(a, a.secao_principal);
    if (!m.has(kk)) m.set(kk, []);
    m.get(kk).push(k(a));
  }
  return m;
}
function cadUrna(kk, agr) {
  if (!cadastro.has(kk)) return null;
  const s = { N: 0, C: 0, f1620: 0, f70: 0, local: cadastro.get(kk).localVotacao };
  for (const x of [kk, ...(agr.get(kk) ?? [])]) {
    const c = cadastro.get(x);
    if (!c) continue;
    s.N += c.eleitores; s.C += c.biometria;
    s.f1620 += (c.faixas['16a17'] ?? 0) + (c.faixas['18a20'] ?? 0);
    s.f70 += (c.faixas['70a79'] ?? 0) + (c.faixas['80mais'] ?? 0);
  }
  s.S = s.N - s.C;
  return s;
}

function carregar(turno) {
  const eleicao = turno === 2 ? 6258 : 6257;
  const agr = agregadas(turno);
  const sql = `SELECT s.uf, s.municipio, s.zona, s.secao, s.comparecimento, s.sem_biometria B, s.por_biometria, s.por_biografia,
      e.aptos, e.aptos_secao, e.aptos_tte, p.ano_nascimento_sem_biometria logSem, p.sem_biometria_ultima_hora ultHora,
      p.maior_rajada_sem_biometria_10min rajada, p.votos_computados votosLog, p.inicio_encerramento_s ini,
      json_extract(p.dados, '$.log.votosPorHoraLocal[16]') h16
    FROM secao s JOIN secao_eleicao e ON e.turno = s.turno AND e.uf = s.uf AND e.municipio = s.municipio AND e.zona = s.zona AND e.secao = s.secao AND e.eleicao = ?
    LEFT JOIN perfil_log p ON p.turno = s.turno AND p.uf = s.uf AND p.municipio = s.municipio AND p.zona = s.zona AND p.secao = s.secao
    WHERE s.turno = ? AND s.uf <> 'zz' AND s.sem_biometria IS NOT NULL AND s.comparecimento > 0`;
  const m = new Map();
  for (const r of db.prepare(sql).iterate(eleicao, turno)) {
    const kk = k(r);
    if (m.has(kk)) continue;
    const c = cadUrna(kk, agr);
    if (!c) continue;
    const folga = (r.aptos_tte ?? 0) + Math.max(0, (r.aptos_secao ?? 0) - c.N);
    m.set(kk, { k: kk, z: `${r.uf}/${r.municipio}/${r.zona}`, uf: r.uf, ...r, ...c, folga, exc: Math.max(0, r.B - c.S - folga), inv: Math.max(0, r.comparecimento - r.B - c.C - folga) });
  }
  return m;
}

// MQO com efeito fixo (média do grupo subtraída) e erro-padrão agrupado por zona
function mqoFE(linhas, y, xs, grupo = (r) => r.z) {
  const g = new Map();
  for (const r of linhas) { const kk = grupo(r); const a = g.get(kk) ?? { n: 0, s: new Float64Array(xs.length + 1) }; a.n++; a.s[0] += y(r); xs.forEach((f, j) => { a.s[j + 1] += f(r); }); g.set(kk, a); }
  const Y = []; const X = []; const G = [];
  for (const r of linhas) { const a = g.get(grupo(r)); if (a.n < 2) continue; Y.push(y(r) - a.s[0] / a.n); X.push(xs.map((f, j) => f(r) - a.s[j + 1] / a.n)); G.push(grupo(r)); }
  const p = xs.length;
  const XtX = Array.from({ length: p }, () => new Float64Array(p)); const Xty = new Float64Array(p);
  for (let i = 0; i < Y.length; i++) for (let a = 0; a < p; a++) { Xty[a] += X[i][a] * Y[i]; for (let b = 0; b < p; b++) XtX[a][b] += X[i][a] * X[i][b]; }
  const inv = inverter(XtX);
  const beta = inv.map((l) => l.reduce((s, v, j) => s + v * Xty[j], 0));
  const meio = Array.from({ length: p }, () => new Float64Array(p)); const sc = new Map();
  for (let i = 0; i < Y.length; i++) { const u = Y[i] - X[i].reduce((s, v, j) => s + v * beta[j], 0); const v = sc.get(G[i]) ?? new Float64Array(p); for (let a = 0; a < p; a++) v[a] += X[i][a] * u; sc.set(G[i], v); }
  for (const v of sc.values()) for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) meio[a][b] += v[a] * v[b];
  const V = mult(mult(inv, meio), inv);
  return { n: Y.length, grupos: sc.size, beta: beta.map((b) => +b.toFixed(5)), ep: V.map((l, i) => +Math.sqrt(l[i]).toFixed(5)), t: beta.map((b, i) => +(b / Math.sqrt(V[i][i])).toFixed(2)) };
}
function mult(a, b) { return a.map((l) => Array.from(b[0], (_, j) => l.reduce((s, v, i) => s + v * b[i][j], 0))); }
function inverter(m) {
  const n = m.length; const a = m.map((l, i) => [...l, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let i = 0; i < n; i++) { let q = i; for (let r = i + 1; r < n; r++) if (Math.abs(a[r][i]) > Math.abs(a[q][i])) q = r; [a[i], a[q]] = [a[q], a[i]]; const d = a[i][i]; for (let j = 0; j < 2 * n; j++) a[i][j] /= d; for (let r = 0; r < n; r++) { if (r === i) continue; const f = a[r][i]; for (let j = 0; j < 2 * n; j++) a[r][j] -= f * a[i][j]; } }
  return a.map((l) => l.slice(n));
}
// gerador determinístico para a simulação
let semente = 20261029;
// mulberry32 (Math.imul, inteiros de 32 bits). O LCG anterior (semente * 1103515245 + 12345) % 2 ** 31 estourava o double
// (ciclo de 10.466 valores, 99,6% dos estados pares). Errata em docs/analysis/cetico-revisor/01, 29/10/2026.
const aleat = () => { semente = (semente + 0x6d2b79f5) | 0; let t = Math.imul(semente ^ (semente >>> 15), 1 | semente); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const t2 = carregar(2);
const L = [...t2.values()];
const saida = {};

// A. reprodução
const comExc = L.filter((r) => r.exc > 0);
const porZona = new Map();
for (const r of L) { const z = porZona.get(r.z) ?? { secoes: 0, comExc: 0, exc: 0, S0: 0, S0comB: 0, B_S0: 0, comp_S0: 0, inv: 0, comInv: 0 }; z.secoes++; if (r.exc > 0) { z.comExc++; z.exc += r.exc; } if (r.inv > 0) { z.comInv++; z.inv += r.inv; } if (r.S === 0) { z.S0++; z.B_S0 += r.B; z.comp_S0 += r.comparecimento; if (r.B > 0) z.S0comB++; } porZona.set(r.z, z); }
saida.A_reproducao = {
  secoesAnalisadas: L.length, secoesComExcesso: comExc.length, excessoTotal: comExc.reduce((s, r) => s + r.exc, 0),
  comExcessoECadastroSemBioZero: comExc.filter((r) => r.S === 0).length,
  logIgualBUnasSecoesComExcesso: comExc.filter((r) => r.logSem === r.B).length, comExcessoComLog: comExc.filter((r) => r.logSem != null).length,
  excessoInverso: { secoes: L.filter((r) => r.inv > 0).length, eleitores: L.reduce((s, r) => s + r.inv, 0) },
  caso_sp_65110_0211_0438: (({ B, S, C, N, comparecimento, aptos, folga, exc, logSem }) => ({ B, S, C, N, comparecimento, aptos, folga, exc, logSem }))(t2.get('sp/65110/0211/0438')),
};

// B. grupo escondido: em seções com cadastro 100% biometria e sem folga, todo "sem biometria" do BU é eleitor que o cadastro dá como com biometria
const S0 = L.filter((r) => r.S === 0 && r.folga === 0 && r.N >= 50);
const somaB = S0.reduce((s, r) => s + r.B, 0); const somaComp = S0.reduce((s, r) => s + r.comparecimento, 0);
const hS0 = S0.map((r) => r.B / r.comparecimento);
saida.B_grupoEscondido = {
  nota: 'Seções com cadastro 100% com biometria, sem TTE e sem aptos acima do cadastro, >= 50 eleitores. Todo sem biometria do BU nelas viola a definição; o teste do autor só conta o que passa de S + folga.',
  secoes: S0.length, comAlgumSemBio: S0.filter((r) => r.B > 0).length, eleitoresSemBioNoBU: somaB,
  parcelaDoComparecimento: +(somaB / somaComp).toFixed(4), distribuicaoH: resumoDist(hS0),
  porUfParcela: Object.fromEntries([...new Set(S0.map((r) => r.uf))].sort().map((u) => { const x = S0.filter((r) => r.uf === u); return [u, { secoes: x.length, comB: x.filter((r) => r.B > 0).length, parcela: +(x.reduce((s, r) => s + r.B, 0) / x.reduce((s, r) => s + r.comparecimento, 0)).toFixed(4) }]; })),
};

// C. idade (só seções S=0: h = B/comparecimento mede só o grupo escondido)
const pct = (a, b) => (b ? a / b : 0);
saida.C_idade = {
  nota: 'h = sem biometria (BU) / comparecimento, seções com cadastro 100% biometria. Efeito fixo de zona, EP agrupado por zona. Coleta pendente de eleitor novo => beta(16-20) > 0; digital ruim de idoso => beta(70+) > 0.',
  mqo: mqoFE(S0, (r) => r.B / r.comparecimento, [(r) => pct(r.f1620, r.N), (r) => pct(r.f70, r.N)]),
  variaveis: ['parcela16a20', 'parcela70mais'],
};

// D. comparecimento × grupo escondido, com simulação de poder
const comp = (r) => r.comparecimento / r.aptos;
const xsD = [(r) => r.B / r.comparecimento, (r) => pct(r.f1620, r.N), (r) => pct(r.f70, r.N)];
const D0 = S0.filter((r) => r.aptos > 0);
const obs = mqoFE(D0, comp, xsD);
// Alternativa maligna: uma fração dos "sem biometria" é voto inserido em nome de ausente. Simula retirando esses votos
// (dado "limpo") e reinserindo-os como fraude; mede quanto o beta sobe. Fraude de f*B votos, B observado.
const sim = [];
for (const f of [0.1, 0.25, 0.5, 1]) {
  // dado limpo: remove f*B votos de cada seção (supõe que os observados são fraude), depois recoloca em sorteio de metade das seções
  const limpo = D0.map((r) => { const fake = Math.round(f * r.B); return { ...r, comparecimento: r.comparecimento - fake, B: r.B - fake, fake }; }).filter((r) => r.comparecimento > 0);
  const base = mqoFE(limpo, comp, xsD).beta[0];
  const res = [];
  for (let rep = 0; rep < 5; rep++) {
    const sujo = limpo.map((r) => (aleat() < 0.5 ? { ...r, comparecimento: r.comparecimento + r.fake, B: r.B + r.fake } : r));
    res.push(mqoFE(sujo, comp, xsD));
  }
  sim.push({ fracaoFraude: f, betaSemFraude: base, betaComFraudeEmMetade: +(res.reduce((s, x) => s + x.beta[0], 0) / res.length).toFixed(4), tMedio: +(res.reduce((s, x) => s + x.t[0], 0) / res.length).toFixed(2) });
}
// Teste direto nas seções com excesso (qualquer S), comparando com as demais da mesma zona: comparecimento e Δ 1º→2º turno
saida.D_comparecimento = {
  nota: 'comparecimento/aptos ~ h + idade, efeito fixo de zona, seções S=0. Se o grupo escondido fosse voto de ausente, beta(h) ~ +1. Real: beta(h) ~ 0.',
  observado: obs,
  simulacaoPoder: sim,
};

// E. horário: parcela das liberações sem biometria na última hora × parcela de todos os votos na hora 16 (encerramento 17:00-17:10)
const E = L.filter((r) => r.ini >= 61200 && r.ini <= 61800 && r.logSem >= 5 && r.votosLog > 0 && r.h16 != null);
const dif = (r) => r.ultHora / r.logSem - r.h16 / r.votosLog;
const media = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
const eExc = E.filter((r) => r.exc > 0); const eOut = E.filter((r) => r.exc === 0);
saida.E_horario = {
  nota: 'dif = (sem biometria na última hora / sem biometria) − (votos 16h-17h / votos). Uso no fim do dia => dif maior nas seções com excesso. Efeito fixo de zona com dummy de excesso.',
  secoes: E.length, comExcesso: eExc.length,
  difMediaComExcesso: +media(eExc.map(dif)).toFixed(4), difMediaSemExcesso: +media(eOut.map(dif)).toFixed(4),
  mqoDummyExcesso: mqoFE(E, dif, [(r) => (r.exc > 0 ? 1 : 0)]),
  rajadaRelativaComExc: +media(eExc.map((r) => r.rajada / r.logSem)).toFixed(4), rajadaRelativaSemExc: +media(eOut.map((r) => r.rajada / r.logSem)).toFixed(4),
  mqoRajada: mqoFE(E, (r) => r.rajada / r.logSem, [(r) => (r.exc > 0 ? 1 : 0), (r) => 1 / r.logSem]),
};

// F. vizinhança: nas zonas do topo, todas as seções S=0 têm grupo escondido? E entre locais da mesma zona?
const topo = ['es/57053/0052', 'sp/65110/0211', 'pa/04324/0084', 'pr/75698/0092', 'sc/83917/0001', 'sp/67490/0016', 'es/57053/0001', 'ce/14958/0057'];
const nac = { parcelaS0: saida.B_grupoEscondido.parcelaDoComparecimento };
saida.F_vizinhanca = {
  nacional: nac,
  zonas: topo.map((z) => {
    const x = L.filter((r) => r.z === z);
    const s0 = x.filter((r) => r.S <= 2);
    const locais = new Map();
    for (const r of x) { const l = locais.get(r.local) ?? { secoes: 0, comExc: 0 }; l.secoes++; if (r.exc > 0) l.comExc++; locais.set(r.local, l); }
    const ls = [...locais.values()].filter((l) => l.secoes >= 3);
    return { z, ...porZona.get(z), secoesS0a2: s0.length, parcelaSemBioS0a2: +pct(s0.reduce((s, r) => s + r.B, 0), s0.reduce((s, r) => s + r.comparecimento, 0)).toFixed(4),
      hS0a2: resumoDist(s0.map((r) => r.B / r.comparecimento), 3), locais: ls.length, locaisSemNenhumExcesso: ls.filter((l) => l.comExc === 0).length, locaisTodasComExcesso: ls.filter((l) => l.comExc === l.secoes).length };
  }),
  // zonas com excesso também têm excesso inverso? (divergência nos dois sentidos = bandeira do cadastro ruidosa na zona)
  spearmanZonaExcessoXInverso: +spearman(Float64Array.from([...porZona.values()], (z) => z.exc / z.secoes), Float64Array.from([...porZona.values()], (z) => z.inv / z.secoes)).toFixed(3),
};

// G. 1º turno (parcial): reprodução e repetição
const t1 = carregar(1);
const L1 = [...t1.values()];
const pares = L1.filter((r) => t2.has(r.k)).map((r) => [r, t2.get(r.k)]);
const s0p = pares.filter(([a]) => a.S === 0 && a.folga === 0 && a.N >= 50);
saida.G_primeiroTurno = {
  ufs: [...new Set(L1.map((r) => r.uf))].sort(), secoes: L1.length,
  secoesComExcesso: L1.filter((r) => r.exc > 0).length, excessoTotal: L1.reduce((s, r) => s + r.exc, 0),
  pares: pares.length, comExcessoNosDois: pares.filter(([a, b]) => a.exc > 0 && b.exc > 0).length,
  S0_razaoB2sobreB1: +(s0p.reduce((s, [, b]) => s + b.B, 0) / s0p.reduce((s, [a]) => s + a.B, 0)).toFixed(4),
  S0_razaoComp2sobreComp1: +(s0p.reduce((s, [, b]) => s + b.comparecimento, 0) / s0p.reduce((s, [a]) => s + a.comparecimento, 0)).toFixed(4),
  S0_spearmanH1xH2: +spearman(Float64Array.from(s0p, ([a]) => a.B / a.comparecimento), Float64Array.from(s0p, ([, b]) => b.B / b.comparecimento)).toFixed(3),
};
db.close();
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, 'b1a-alternativas.json'), `${JSON.stringify(saida, null, 1)}\n`);
console.log(JSON.stringify(saida, null, 1));
