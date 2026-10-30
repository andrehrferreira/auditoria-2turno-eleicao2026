// H15 e H17 (estatístico eleitoral, docs/analysis/estatistico-eleitoral/09-h15-h17-mesa.md).
// Uma passada pelos logs de todos os pacotes do 2º turno. De cada log, o dia do 2º turno (25/10) e o do 1º turno
// (04/10, mesmo log cumulativo, só quando a urna declarou a mesma seção naquele dia).
// Por seção-dia, reconstrói cada atendimento (máquina de estados do pré-registro) e grava só contagens:
//   - H15: maior sequência de votos consecutivos liberados manualmente pelo mesmo mesário (RunM) e sem digital por
//     qualquer via (RunA), com p da corrida, ritmo (CV dos intervalos contra todas as janelas do dia), tentativas de
//     digital, última hora, e o mesmo mesário no outro dia; votos e votos sem digital por hora;
//   - poder: o mesmo teste com blocos artificiais de 5, 10 e 20 votos inseridos no fim do dia (regular e disfarçado);
//   - H17: atendimento seguinte a cada voto termina em "já votou" (até 60 s e até 600 s), por classe do voto e por
//     mesário; suspensões (quem suspendeu: índice do mesário, título válido sem papel ou inválido), cancelamentos,
//     atendimentos perdidos e retomada provável; consultas (rajadas de 3+ "já votou") à parte.
// Privacidade: o título do mesário vira HMAC-SHA256 com chave aleatória que só existe na memória do processo e, na
// saída, um índice inteiro por seção. Nenhum título ou CPF é gravado; a saída passa por uma trava que recusa
// qualquer sequência de 10 ou mais dígitos.
// Uso: node scripts/auditoria/estatistico-h15-h17-varrer.mjs [--uf ac,al] [--paralelo 3] [--refazer]
// Saída: data/parsed/auditoria/h15-h17/varredura/<uf>.jsonl (+ <uf>.ok, <uf>.erros.jsonl)
import { fork } from 'node:child_process';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerLogs } from '../../src/perfil-secoes.js';

export const DIR_H = path.join(DIR_DADOS, 'parsed', 'auditoria', 'h15-h17');
const DIR_VARREDURA = path.join(DIR_H, 'varredura');
const DOC = path.resolve(import.meta.dirname, '..', '..', 'docs', 'analysis', 'estatistico-eleitoral', '09-h15-h17-mesa.md');
const DIAS = { 2: '25/10/2026', 1: '04/10/2026' };
export const ALFA_B = 2.5e-8;
const K_MIN = 5;
const H0 = 5; // primeira hora do vetor horário
const NH = 16; // horas 05..20

// Classes do voto
const BIO = 0, ANO = 1, MM = 2, MS = 3, OUTRA = 4;
// Desfechos do atendimento
const D = { voto: 'voto', ja: 'jaVotou', susp: 'suspensoSemVoto', canc: 'cancelada', rec: 'recusa', nada: 'semDesfecho' };

const seg = (s) => Number(s.slice(0, 2)) * 3600 + Number(s.slice(3, 5)) * 60 + Number(s.slice(6, 8));
const hhmmss = (t) => (t == null ? null : `${String(Math.floor(t / 3600)).padStart(2, '0')}:${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);

/** Gerador pseudoaleatório determinístico (mulberry32). */
export function rng(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** P(maior corrida ≥ k) em n ensaios de Bernoulli(p), aproximação de Poisson. */
export function pCorrida(n, p, k) {
  if (k <= 0) return 1;
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  const lambda = p ** k * (1 + Math.max(0, n - k) * (1 - p));
  return -Math.expm1(-lambda);
}

/** CV dos intervalos entre os tempos t[i..i+k-1] (intervalos negativos, por ajuste de relógio, ficam fora). */
function cvJanela(t, i, k) {
  let s = 0, s2 = 0, m = 0;
  for (let j = i + 1; j < i + k; j++) {
    const d = t[j] - t[j - 1];
    if (d < 0) continue;
    s += d; s2 += d * d; m++;
  }
  if (m < 2 || s === 0) return null;
  const media = s / m;
  const dp = Math.sqrt(Math.max(0, s2 / m - media * media));
  return dp / media;
}

/** p do ritmo: fração das janelas de k votos do dia com CV ≤ o CV da sequência. */
function pRitmo(t, ini, k) {
  const cv = cvJanela(t, ini, k);
  if (cv == null) return { cv: null, p: 1 };
  let menores = 0, total = 0;
  for (let i = 0; i + k <= t.length; i++) {
    const c = cvJanela(t, i, k);
    if (c == null) continue;
    total++;
    if (c <= cv + 1e-12) menores++;
  }
  return { cv, p: total ? menores / total : 1 };
}

/** RunM: maior sequência de votos consecutivos liberados manualmente pelo mesmo mesário; fica o menor p ajustado. */
export function avaliarRunM(votos) {
  const n = votos.length;
  const porMes = new Map();
  for (const v of votos) if (v.c === MM) porMes.set(v.m, (porMes.get(v.m) ?? 0) + 1);
  if (!porMes.size) return null;
  const maior = new Map(); // m -> [k, ini]
  for (let i = 0; i < n;) {
    if (votos[i].c !== MM) { i++; continue; }
    let j = i;
    while (j + 1 < n && votos[j + 1].c === MM && votos[j + 1].m === votos[i].m) j++;
    const k = j - i + 1;
    if (!maior.has(votos[i].m) || maior.get(votos[i].m)[0] < k) maior.set(votos[i].m, [k, i]);
    i = j + 1;
  }
  let melhor = null;
  for (const [m, [k, ini]] of maior) {
    const p = Math.min(1, pCorrida(n, porMes.get(m) / n, k) * porMes.size);
    if (!melhor || p < melhor.p || (p === melhor.p && k > melhor.k)) melhor = { m, k, ini, p, libs: porMes.get(m) };
  }
  return melhor;
}

/** RunA: maior sequência de votos consecutivos sem digital (qualquer via). */
function avaliarRunA(votos) {
  const n = votos.length;
  const sem = votos.filter((v) => v.c >= ANO && v.c <= MS).length;
  if (!sem) return null;
  let melhor = { k: 0, ini: 0 };
  let runs5 = 0;
  for (let i = 0; i < n;) {
    if (!(votos[i].c >= ANO && votos[i].c <= MS)) { i++; continue; }
    let j = i;
    while (j + 1 < n && votos[j + 1].c >= ANO && votos[j + 1].c <= MS) j++;
    const k = j - i + 1;
    if (k >= K_MIN) runs5++;
    if (k > melhor.k) melhor = { k, ini: i };
    i = j + 1;
  }
  return { ...melhor, p: pCorrida(n, sem / n, melhor.k), runs5 };
}

/** Detalhe de uma sequência: ritmo, horário, tentativas, última hora, composição. */
function detalharRun(votos, run, fim) {
  const t = votos.map((v) => v.t);
  const { cv, p: pr } = run.k >= 3 ? pRitmo(t, run.ini, run.k) : { cv: null, p: 1 };
  const seq = votos.slice(run.ini, run.ini + run.k);
  const ivs = [];
  for (let j = 1; j < seq.length; j++) ivs.push(seq[j].t - seq[j - 1].t);
  ivs.sort((a, b) => a - b);
  const comp = [0, 0, 0, 0, 0];
  const mes = new Set();
  for (const v of seq) { comp[v.c]++; if (v.c === MM) mes.add(v.m); }
  return {
    k: run.k, p: Number(run.p.toPrecision(3)), cv: cv == null ? null : Number(cv.toFixed(4)), pr: Number(pr.toFixed(4)),
    ini: hhmmss(seq[0].t), fim: hhmmss(seq.at(-1).t), uh: fim != null && seq.at(-1).t >= fim - 3600 ? 1 : 0,
    tent: Number((seq.reduce((s, v) => s + v.tent, 0) / seq.length).toFixed(2)),
    iv: ivs.length ? ivs[Math.floor(ivs.length / 2)] : null, comp, nMes: mes.size,
  };
}

/** Bandeira H15 (S1 ∧ S2 ∧ S3; S4 se `excesso` dado). */
function bandeiraH15(r, excesso) {
  if (!r || r.k < K_MIN || !(r.p < ALFA_B) || !(r.pr <= 0.05)) return false;
  return excesso == null ? true : excesso >= r.k / 2;
}

/** Lê os atendimentos e votos de um dia. `idx` converte título de mesário em índice da seção. */
export function lerDia(texto, dia, idx) {
  const sessoes = [];
  const votos = [];
  const registrados = new Set();
  const ident = {};
  const r = { errCap: 0, inicios: 0, pronta: null, encerr: null, linhas: 0, voltas: 0, susp: { tot: 0, parc: 0, semVoto: 0, abort: 0, val: 0, inv: 0, porMes: {} } };
  let s = null;
  let tAnt = -1;
  let tituloSusp = null;
  const fechar = (t) => {
    if (!s) return;
    s.tf = t;
    s.d = s.voto ? D.voto : s.ja ? D.ja : s.suspSem ? D.susp : s.canc ? D.canc : s.rec ? D.rec : D.nada;
    sessoes.push(s);
    s = null;
  };
  for (const linha of texto.split('\n')) {
    if (!linha.startsWith(dia)) continue;
    const partes = linha.split('\t');
    const msg = partes[4] ?? '';
    const t = seg(linha.slice(11, 19));
    r.linhas++;
    if (t < tAnt) r.voltas++;
    tAnt = t;
    if (msg === 'Identificador do eleitor digitado pelo mesário') {
      fechar(t);
      s = { t0: t, tf: t, foto: false, tent: 0, bio: false, ano: false, dado: false, m: 0, voto: false, ja: false, suspSem: false, canc: false, rec: false, cons: false };
      continue;
    }
    if (msg === 'Aguardando digitação do identificador do eleitor') { fechar(t); continue; }
    if (msg.startsWith('Inicio do Encerramento')) { fechar(t); r.encerr = t; continue; }
    if (msg.startsWith('Urna pronta para receber votos')) { r.pronta ??= t; continue; }
    if (msg.startsWith('Iniciando aplicação')) { r.inicios++; continue; }
    if (msg.startsWith('Captura da digital do eleitor') || msg.includes('Falha na captura da digital')) { r.errCap++; continue; }
    if (msg.startsWith('Município: ') || msg.startsWith('Zona Eleitoral: ') || msg.startsWith('Seção Eleitoral: ')) {
      const [campo, valor] = msg.split(': ');
      ident[{ 'Município': 'municipio', 'Zona Eleitoral': 'zona', 'Seção Eleitoral': 'secao' }[campo]] ??= valor.trim();
      continue;
    }
    let m = /^Mesário (\d+) (?:registrado|já registrado)$/.exec(msg);
    if (m) { registrados.add(idx(m[1])); continue; }
    // suspensão (pode ocorrer com a sessão aberta)
    if ((m = /^Título (\d+) é (válido|inválido) para suspender a votação$/.exec(msg))) {
      const i = idx(m[1]);
      tituloSusp = m[2] === 'válido' ? (registrados.has(i) ? i : 'v') : 'i';
      if (m[2] === 'inválido') r.susp.inv++;
      continue;
    }
    if (msg === 'Eleitor foi suspenso pelo mesário') {
      r.susp.tot++;
      const quem = tituloSusp ?? '?';
      if (quem === 'v') r.susp.val++;
      else if (typeof quem === 'number') r.susp.porMes[quem] = (r.susp.porMes[quem] ?? 0) + 1;
      tituloSusp = null;
      if (s) s.suspensa = quem;
      continue;
    }
    if (msg === 'Mesário abortou processo de suspensão') { r.susp.abort++; tituloSusp = null; continue; }
    if (msg === 'Eleitor votou parcialmente e em seguida foi suspenso') { r.susp.parc++; continue; }
    if (msg === 'Eleitor foi suspenso e não confirmou nenhum voto') { r.susp.semVoto++; if (s) s.suspSem = true; continue; }
    if (!s) {
      if (msg === 'O voto do eleitor foi computado') {
        // voto sem atendimento aberto (não deveria ocorrer): conta como classe "outra"
        votos.push({ t, c: OUTRA, m: 0, tent: 0, ts: t, si: -1 });
      }
      continue;
    }
    if (msg === 'O voto do eleitor foi computado') {
      s.voto = true;
      const c = s.bio ? BIO : s.ano ? ANO : s.dado ? (s.m ? MM : MS) : OUTRA;
      votos.push({ t, c, m: s.m, tent: s.tent, ts: s.t0, si: sessoes.length });
      fechar(t);
    } else if (msg === 'O eleitor identificado já votou') { s.ja = true; fechar(t); }
    else if (msg === 'Foto do eleitor apresentada') s.foto = true;
    else if (msg.startsWith('Capturada a digital. Tentativa')) s.tent++;
    else if (msg === 'Tipo de habilitação do eleitor [biométrica]') s.bio = true;
    else if (msg === 'Ano de nascimento digitado é igual ao do cadastro') s.ano = true;
    else if (msg === 'Dado digitado confere') s.dado = true;
    else if ((m = /^Mesário (\d+) habilitou o eleitor$/.exec(msg))) s.m = idx(m[1]);
    else if (msg.startsWith('Habilitação cancelada') || msg === 'Mesário cancelou entrada dos dados') s.canc = true;
    else if (msg === 'Eleitor não encontrado para o identificador informado' || msg.startsWith('Eleitor impedido')
      || msg === 'Eleitor já justificou' || msg === 'Ano de nascimento digitado é diferente do cadastro' || msg === 'Ano de nascimento inválido') s.rec = true;
  }
  fechar(tAnt);
  return { sessoes, votos, ident, ...r };
}

/** Marca consultas: atendimentos entre dois votos quando há 3 ou mais "já votou" entre eles. */
function marcarConsultas(sessoes) {
  let ini = 0;
  let ja = 0;
  const fecharBloco = (fim) => {
    if (ja >= 3) for (let i = ini; i < fim; i++) if (sessoes[i].d !== D.voto) sessoes[i].cons = true;
  };
  for (let i = 0; i < sessoes.length; i++) {
    if (sessoes[i].d === D.voto) { fecharBloco(i); ini = i + 1; ja = 0; } else if (sessoes[i].d === D.ja) ja++;
  }
  fecharBloco(sessoes.length);
}

/** Estatísticas de um dia (sem o "outro dia"). */
export function resumirDia(dia) {
  const { sessoes, votos } = dia;
  marcarConsultas(sessoes);
  const fim = dia.encerr ?? (votos.length ? votos.at(-1).t : null);
  const cl = [0, 0, 0, 0, 0];
  const hv = new Array(NH).fill(0);
  const hs = new Array(NH).fill(0);
  for (const v of votos) {
    cl[v.c]++;
    const h = Math.floor(v.t / 3600) - H0;
    if (h >= 0 && h < NH) { hv[h]++; if (v.c >= ANO && v.c <= MS) hs[h]++; }
  }
  // H17-roubo: atendimento seguinte a cada voto
  const n = [0, 0, 0, 0], y600 = [0, 0, 0, 0], y60 = [0, 0, 0, 0];
  const porMes = new Map(); // m -> [libs, y600]
  for (const v of votos) {
    if (v.c === OUTRA || v.si < 0) continue;
    n[v.c]++;
    const prox = sessoes[v.si + 1];
    const ev = prox && prox.d === D.ja && !prox.cons && prox.t0 - v.t <= 600 && prox.t0 >= v.t;
    if (ev) { y600[v.c]++; if (prox.t0 - v.t <= 60) y60[v.c]++; }
    if (v.c === MM) {
      const a = porMes.get(v.m) ?? [0, 0];
      a[0]++; if (ev) a[1]++;
      porMes.set(v.m, a);
    }
  }
  // H17-supressão
  let ses = 0, cons = 0, jv = 0, jvc = 0, perd = 0, perdRet = 0, perdUH = 0, susp = 0, canc = 0, rec = 0, nada = 0;
  for (let i = 0; i < sessoes.length; i++) {
    const x = sessoes[i];
    if (x.cons) { cons++; if (x.d === D.ja) jvc++; continue; }
    ses++;
    if (x.d === D.ja) jv++;
    else if (x.d === D.rec) rec++;
    else if (x.d === D.nada) nada++;
    else if (x.d === D.susp || x.d === D.canc) {
      perd++;
      if (x.d === D.susp) susp++; else canc++;
      const prox = sessoes[i + 1];
      if (prox && prox.d === D.voto && prox.t0 - x.tf <= 180 && prox.t0 >= x.tf) perdRet++;
      if (fim != null && x.t0 >= fim - 3600) perdUH++;
    }
  }
  const runM = avaliarRunM(votos);
  const runA = avaliarRunA(votos);
  const out = {
    v: votos.length, cl, ses, cons, jv, jvc, perd, perdRet, perdUH, suspSV: susp, canc, rec, nada,
    h17: { n, y600, y60 }, mesY: [...porMes].filter(([, a]) => a[1] > 0).map(([m, a]) => [m, a[0], a[1]]), nMesLib: porMes.size,
    susp: dia.susp, errCap: dia.errCap, inicios: dia.inicios, voltas: dia.voltas,
    pronta: hhmmss(dia.pronta), encerr: hhmmss(dia.encerr), ultimo: votos.length ? hhmmss(votos.at(-1).t) : null,
    hv, hs,
    runM: runM ? { m: runM.m, libs: runM.libs, ...detalharRun(votos, runM, fim) } : null,
    runA: runA ? { runs5: runA.runs5, ...detalharRun(votos, runA, fim) } : null,
  };
  return out;
}

/** Poder: blocos artificiais de k votos depois do último voto do dia. */
function injetar(votos, fim, excesso, semente) {
  const out = {};
  if (votos.length < 2) return out;
  const libs = new Map();
  for (const v of votos) if (v.c === MM) libs.set(v.m, (libs.get(v.m) ?? 0) + 1);
  const mes = libs.size ? [...libs].sort((a, b) => b[1] - a[1])[0][0] : 9999;
  // intervalos reais da última hora (para o bloco disfarçado)
  const ivs = [];
  for (let i = 1; i < votos.length; i++) {
    const d = votos[i].t - votos[i - 1].t;
    if (d > 0 && (fim == null || votos[i].t >= fim - 3600)) ivs.push(d);
  }
  if (ivs.length < 3) for (let i = 1; i < votos.length; i++) { const d = votos[i].t - votos[i - 1].t; if (d > 0) ivs.push(d); }
  for (const k of [5, 10, 20]) {
    for (const forma of ['reg', 'dis']) {
      const r = rng(semente + k * 7 + (forma === 'reg' ? 1 : 2));
      const novos = votos.slice();
      let t = votos.at(-1).t;
      for (let j = 0; j < k; j++) {
        t += forma === 'reg' ? Math.round(60 * (0.9 + 0.2 * r())) : (ivs.length ? ivs[Math.floor(r() * ivs.length)] : 60);
        novos.push({ t, c: MM, m: mes, tent: 4, ts: t - 30, si: -1 });
      }
      const run = avaliarRunM(novos);
      const det = run ? detalharRun(novos, run, t) : null;
      // [S1, S1∧S2, S1∧S2∧S4, S1∧S4]
      const s1 = det && det.k >= K_MIN && det.p < ALFA_B;
      const s4 = excesso == null || excesso + k >= det.k / 2;
      out[`${forma}${k}`] = [s1 ? 1 : 0, bandeiraH15(det, null) ? 1 : 0, bandeiraH15(det, excesso == null ? null : excesso + k) ? 1 : 0, s1 && s4 ? 1 : 0];
    }
  }
  return out;
}

const TRAVA = /\d{10,}/;

async function varrerUf(uf) {
  const chave = randomBytes(32);
  const { db } = await abrirLeitura();
  const secoes = db.prepare(`SELECT municipio, zona, secao, hash, modelo_urna, tipo_urna FROM secao
    WHERE turno = 2 AND uf = ? AND situacao = 'completa' ORDER BY municipio, zona, secao`).all(uf);
  const comp = new Map();
  for (const x of db.prepare(`SELECT s.turno, s.municipio, s.zona, s.secao, s.comparecimento c, e.aptos a FROM secao s
      LEFT JOIN secao_eleicao e ON e.turno = s.turno AND e.uf = s.uf AND e.municipio = s.municipio AND e.zona = s.zona AND e.secao = s.secao
        AND e.eleicao = CASE s.turno WHEN 1 THEN 6257 ELSE 6258 END
      WHERE s.uf = ?`).all(uf)) {
    const k = `${x.municipio}/${x.zona}/${x.secao}`;
    const o = comp.get(k) ?? {};
    o[`c${x.turno}`] = x.c; o.a ??= x.a;
    comp.set(k, o);
  }
  db.close();
  // excesso de comparecimento: (c2 − c1) − aptos × mediana da zona de (c2 − c1)/aptos
  const porZona = new Map();
  for (const [k, o] of comp) {
    if (o.c1 == null || o.c2 == null || !o.a) continue;
    const z = k.split('/')[1];
    if (!porZona.has(z)) porZona.set(z, []);
    porZona.get(z).push((o.c2 - o.c1) / o.a);
  }
  const medZona = new Map([...porZona].map(([z, xs]) => { xs.sort((a, b) => a - b); const h = xs.length >> 1; return [z, xs.length % 2 ? xs[h] : (xs[h - 1] + xs[h]) / 2]; }));

  const linhas = [];
  const erros = [];
  const base = path.join(DIR_DADOS, 'raw', '2t', 'urnas', uf);
  for (const s of secoes) {
    try {
      const dirSecao = path.join(base, s.municipio, s.zona, s.secao);
      let dir = path.join(dirSecao, s.hash);
      if (!existsSync(dir)) {
        const subs = (await readdir(dirSecao, { withFileTypes: true })).filter((e) => e.isDirectory());
        if (subs.length !== 1) throw new Error(`diretório do hash ausente (${subs.length} pacotes)`);
        dir = path.join(dirSecao, subs[0].name);
      }
      const nomeLog = acharArquivo(await readdir(dir), 'log');
      if (!nomeLog) throw new Error('pacote sem log');
      const { texto } = await lerLogs(path.join(dir, nomeLog), s.secao);
      const indice = new Map();
      const idx = (titulo) => {
        const h = createHmac('sha256', chave).update(titulo).digest('hex');
        if (!indice.has(h)) indice.set(h, indice.size + 1);
        return indice.get(h);
      };
      const k = `${s.municipio}/${s.zona}/${s.secao}`;
      const o = comp.get(k) ?? {};
      const excesso = o.c1 != null && o.c2 != null && o.a && medZona.has(s.zona) ? Number(((o.c2 - o.c1) - o.a * medZona.get(s.zona)).toFixed(2)) : null;
      const dias = {};
      const brutos = {};
      for (const turno of [2, 1]) {
        if (!texto.includes(`\n${DIAS[turno]}`) && !texto.startsWith(DIAS[turno])) continue;
        const d = lerDia(texto, DIAS[turno], idx);
        const id = d.ident;
        const mesma = id.municipio == null || id.zona == null || id.secao == null ? null
          : Number(id.municipio) === Number(s.municipio) && Number(id.zona) === Number(s.zona) && Number(id.secao) === Number(s.secao);
        if (!d.votos.length) continue;
        if (turno === 1 && mesma === false) { dias.d1x = 'outraSecao'; continue; }
        brutos[turno] = d;
        dias[`d${turno}`] = { mesma, ...resumirDia(d) };
      }
      // mesmo mesário no outro dia
      for (const [a, b] of [[2, 1], [1, 2]]) {
        const r = dias[`d${a}`]?.runM;
        if (!r) continue;
        const outro = brutos[b];
        if (!outro) { r.outro = null; continue; }
        const vs = outro.votos;
        let libs = 0, kmax = 0, cur = 0;
        for (const v of vs) {
          if (v.c === MM && v.m === r.m) { libs++; cur++; kmax = Math.max(kmax, cur); } else cur = 0;
        }
        r.outro = { libs, kmax, v: vs.length };
      }
      let inj = null;
      if (brutos[2]) {
        const d2 = brutos[2];
        const fim = d2.encerr ?? d2.votos.at(-1).t;
        const semente = Number.parseInt(createHash('sha256').update(`${uf}/${k}`).digest('hex').slice(0, 8), 16);
        inj = injetar(d2.votos, fim, excesso, semente);
      }
      const linha = JSON.stringify({ uf, mun: s.municipio, zona: s.zona, secao: s.secao, modelo: s.modelo_urna, tipo: s.tipo_urna, c1: o.c1 ?? null, c2: o.c2 ?? null, aptos: o.a ?? null, excesso, ...dias, inj });
      if (TRAVA.test(linha)) throw new Error('trava: sequência de 10+ dígitos na saída');
      linhas.push(linha);
    } catch (erro) {
      erros.push(JSON.stringify({ uf, mun: s.municipio, zona: s.zona, secao: s.secao, erro: erro.message.replace(/\d{10,}/g, '#') }));
    }
  }
  await mkdir(DIR_VARREDURA, { recursive: true });
  await writeFile(path.join(DIR_VARREDURA, `${uf}.jsonl`), linhas.length ? `${linhas.join('\n')}\n` : '');
  await writeFile(path.join(DIR_VARREDURA, `${uf}.erros.jsonl`), erros.length ? `${erros.join('\n')}\n` : '');
  await writeFile(path.join(DIR_VARREDURA, `${uf}.ok`), new Date().toISOString());
  return { uf, secoes: linhas.length, erros: erros.length };
}

/** SHA-256 do bloco de pré-registro do documento. */
export async function hashPreRegistro() {
  const doc = await readFile(DOC, 'utf8');
  const m = /<!-- PRE-REGISTRO-INICIO -->([\s\S]*?)<!-- PRE-REGISTRO-FIM -->/.exec(doc);
  return m ? createHash('sha256').update(m[1].replace(/\r\n/g, '\n')).digest('hex') : null;
}

async function principal() {
  const { values } = parseArgs({ options: { uf: { type: 'string' }, paralelo: { type: 'string', default: '3' }, refazer: { type: 'boolean' }, filho: { type: 'boolean' } } });
  const ufs = values.uf ? values.uf.split(',') : UFS;
  if (values.filho) {
    if (!values.refazer && existsSync(path.join(DIR_VARREDURA, `${ufs[0]}.ok`))) { process.send({ uf: ufs[0], secoes: 0, erros: 0, jaFeita: true }); return; }
    process.send(await varrerUf(ufs[0]));
    return;
  }
  await mkdir(DIR_VARREDURA, { recursive: true });
  const pre = await hashPreRegistro();
  await writeFile(path.join(DIR_H, 'pre-registro.sha256'), `${pre}\n`);
  console.log(`pré-registro sha256 ${pre}`);
  const ordem = ['sp', 'mg', 'rj', 'ba', 'rs', 'pr', 'pe', 'ce', 'pa', 'ma', 'sc', 'go', 'pb', 'es', 'pi', 'am', 'rn', 'al', 'mt', 'ms', 'df', 'se', 'ro', 'to', 'ac', 'ap', 'rr', 'zz'];
  const fila = ufs.sort((a, b) => ordem.indexOf(a) - ordem.indexOf(b)).filter((uf) => values.refazer || !existsSync(path.join(DIR_VARREDURA, `${uf}.ok`)));
  const rodar = async () => {
    for (let uf = fila.shift(); uf; uf = fila.shift()) {
      const inicio = Date.now();
      const extra = values.refazer ? ['--refazer'] : [];
      const r = await new Promise((resolve) => {
        const filho = fork(import.meta.filename, ['--filho', '--uf', uf, ...extra], { execArgv: ['--max-old-space-size=4096'] });
        let resultado = null;
        filho.on('message', (m) => { resultado = m; });
        filho.on('exit', (codigo) => resolve(resultado ?? { uf, erro: `código ${codigo}` }));
      });
      console.log(`${uf}: ${r.erro ?? `${r.secoes} seções, ${r.erros} erro(s)`} (${((Date.now() - inicio) / 1000).toFixed(0)} s)`);
    }
  };
  await Promise.all(Array.from({ length: Number(values.paralelo) }, rodar));
}

if (import.meta.filename === path.resolve(process.argv[1] ?? '')) await principal();
