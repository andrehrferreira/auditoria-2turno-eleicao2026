// Cético, b1a: poder do teste de comparecimento (seção com cadastro 100% biometria). Injeta votos falsos sobre os dados
// observados (null = dados reais) com o tamanho do grupo escondido observado, e mede quanto o beta de comparecimento ~ h sobe.
// Uso: node scripts/auditoria/cetico-b1a-poder.mjs   Saída: data/parsed/auditoria/cetico/b1a-poder.json
// (funções de carga copiadas de cetico-b1a-alternativas.mjs)
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
const S0 = [...t2.values()].filter((r) => r.S === 0 && r.folga === 0 && r.N >= 50 && r.aptos > 0);
const comp = (r) => r.comparecimento / r.aptos;
const pct = (a, b) => (b ? a / b : 0);
const xs = [(r) => r.B / r.comparecimento, (r) => pct(r.f1620, r.N), (r) => pct(r.f70, r.N)];
const obs = mqoFE(S0, comp, xs);
const tamanhos = S0.filter((r) => r.B > 0).map((r) => r.B);
const prev = S0.filter((r) => r.B > 0).length / S0.length;
const cenarios = [];
for (const escala of [0.25, 0.5, 1, 2]) {
  for (const q of [0.05, prev]) {
    const res = [];
    for (let rep = 0; rep < 10; rep++) {
      const sujo = S0.map((r) => { if (aleat() >= q) return r; const F = Math.max(1, Math.round(escala * tamanhos[Math.floor(aleat() * tamanhos.length)])); return { ...r, comparecimento: r.comparecimento + F, B: r.B + F }; });
      res.push(mqoFE(sujo, comp, xs));
    }
    const b = res.map((x) => x.beta[0]);
    cenarios.push({ escalaDoTamanho: escala, fracaoSecoesComFraude: +q.toFixed(3), votosFalsosMedios: null, betaMedio: +(b.reduce((s, x) => s + x, 0) / b.length).toFixed(4), tMedio: +(res.reduce((s, x) => s + x.t[0], 0) / res.length).toFixed(2), detectadoT3: res.filter((x) => x.beta[0] - obs.beta[0] > 3 * obs.ep[0]).length + '/10' });
  }
}
const saida = { secoes: S0.length, prevalenciaObservada: +prev.toFixed(3), tamanhoMedioGrupoEscondido: +(tamanhos.reduce((s, x) => s + x, 0) / tamanhos.length).toFixed(2), observado: obs, cenarios,
  leitura: 'detectadoT3 = repetições em que o beta com fraude injetada passa o observado em mais de 3 EP. Fraude do tamanho observado, na prevalência observada, deve ser detectada se o teste tem poder.' };
db.close();
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, 'b1a-poder.json'), `${JSON.stringify(saida, null, 1)}\n`);
console.log(JSON.stringify(saida, null, 1));
