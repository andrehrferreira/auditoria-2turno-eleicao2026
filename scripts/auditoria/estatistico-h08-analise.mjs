// Estatístico eleitoral, H08 (plano: docs/analysis/estatistico-eleitoral/15-h08-plano.md). Lê a saída de
// estatistico-h08-varredura.mjs dos dois turnos e aplica os limites fixados no plano:
//   LF  limite físico a priori: M(k) = 1,6 + 0,2·k s por ciclo D; LF-1: D ≤ 1 s; LF-n: soma S de n ≥ 2 D seguidos
//       com S + 1 ≤ Σ M(k_i) (procura a sequência de maior déficit em cada fluxo);
//   LE  limite estatístico: maior s com F(s) ≤ 0,1% no estrato (turno, k), estrato < 100.000 ciclos usa o turno;
//       sequência = 3 ou mais D seguidos ≤ LE; esperado sob independência = Σ p_i·p_{i+1}·p_{i+2};
//       por seção: P(Binomial(n, p̄) ≥ c), Bonferroni sobre as seções testadas nos dois turnos, BH a 5%;
//   C3  fração de seções significativas, 2º × 1º turno (duas proporções, unilateral).
// Também confere votos e vias da leitura própria contra o BU (cópia de leitura do banco).
// Uso: node scripts/auditoria/estatistico-h08-analise.mjs
// Saída: data/parsed/auditoria/estatistico/h08/resultado.json, secoes-excesso.csv, sequencias-le.csv, divergencias-bu.csv
import { readdirSync, readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

const BASE = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h08');
const M = (k) => 1.6 + 0.2 * (k === 255 ? 1 : Math.max(k, 1));
const QUANTIS = [0.001, 0.01, 0.05, 0.5, 0.99];

function somar(dest, orig) {
  for (const [k, arr] of Object.entries(orig)) {
    if (!dest[k]) dest[k] = arr.slice();
    else for (let i = 0; i < arr.length; i++) dest[k][i] += arr[i];
  }
}
const total = (arr) => arr.reduce((a, b) => a + b, 0);
function quantil(arr, q) {
  const n = total(arr);
  let c = 0;
  for (let i = 0; i < arr.length; i++) { c += arr[i]; if (c >= q * n) return i; }
  return arr.length - 1;
}
function resumo(arr) {
  const n = total(arr);
  const min = arr.findIndex((x) => x > 0);
  return { n, min, ...Object.fromEntries(QUANTIS.map((q) => [`p${q * 100}`, quantil(arr, q)])), contagemNoMinimo: arr[min] };
}
/** LE: maior s com F(s) ≤ 0,001 (−1 se nem o 0 cabe). */
function limiteLE(arr) {
  const n = total(arr);
  let c = 0, s = -1;
  for (let i = 0; i < arr.length; i++) { c += arr[i]; if (c / n <= 0.001) s = i; else break; }
  let cAte = 0;
  for (let i = 0; i <= s; i++) cAte += arr[i];
  return { LE: s, p: cAte / n, abaixo: cAte, n };
}
const lgamma = (x) => {
  const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
};
/** log P(X ≥ c), X ~ Binomial(n, p). */
function logCaudaBinomial(c, n, p) {
  if (c <= 0) return 0;
  if (p <= 0) return -Infinity;
  const lc = (j) => lgamma(n + 1) - lgamma(j + 1) - lgamma(n - j + 1) + j * Math.log(p) + (n - j) * Math.log1p(-p);
  let soma = 0;
  const l0 = lc(c);
  for (let j = c; j <= n; j++) {
    const r = Math.exp(lc(j) - l0);
    soma += r;
    if (r < 1e-16 * soma) break;
  }
  return l0 + Math.log(soma);
}

const turnos = {};
for (const turno of [1, 2]) {
  const dir = path.join(BASE, `${turno}t`);
  const partes = readdirSync(dir).filter((f) => f.endsWith('.hist.json')).map((f) => f.slice(0, -10)).sort();
  const hist = { A: {}, B: {}, C: {}, D: {}, passos: {} };
  const tipos = {}, confs = {};
  let erros = [];
  let secoesLidas = 0;
  for (const p of partes) {
    const h = JSON.parse(readFileSync(path.join(dir, `${p}.hist.json`), 'utf8'));
    secoesLidas += h.secoes;
    erros = erros.concat(h.erros);
    for (const m of ['A', 'B', 'C', 'D', 'passos']) somar(hist[m], h.hist[m]);
    for (const [k, v] of Object.entries(h.hist.tiposHabilitacao)) tipos[k] = (tipos[k] ?? 0) + v;
    for (const [k, v] of Object.entries(h.hist.confirmacoesPorCiclo)) confs[k] = (confs[k] ?? 0) + v;
  }
  const pooledD = new Array(3601).fill(0);
  for (const arr of Object.values(hist.D)) for (let i = 0; i < arr.length; i++) pooledD[i] += arr[i];
  const LEturno = limiteLE(pooledD);
  const LE = {};
  for (const [k, arr] of Object.entries(hist.D)) LE[k] = total(arr) >= 100000 ? { ...limiteLE(arr), estrato: 'próprio' } : { ...LEturno, estrato: 'turno inteiro' };
  turnos[turno] = { partes, hist, tipos, confs, erros, secoesLidas, pooledD, LEturno, LE };
}

// ---------- varredura das sequências ----------
const secoesTeste = []; // {turno, id, n, c, pbar, logp}
const sequenciasLE = [];
const casosLF = [];
const resultado = { turnos: {} };
for (const turno of [1, 2]) {
  const T = turnos[turno];
  const dir = path.join(BASE, `${turno}t`);
  const pk = (k) => (T.LE[k === 255 ? 'semCiclo' : String(Math.min(k, 9))] ?? T.LEturno);
  let ciclosD = 0, negativos = 0, lf1 = 0, esperadoRuns = 0, runs3 = 0, runs5 = 0, maiorRun = 0, secoes = 0, votos = 0, fluxos = 0;
  const vias = { v1: 0, v2: 0, v3m: 0, v3s: 0, outra: 0 };
  let semCiclo = 0, duplicadas = 0, foraCopia = 0, outraSecao = 0, abandonos = 0, multiFluxo = 0, semIdent = 0;
  let menorDeficit = { valor: Infinity };
  const minD = { valor: Infinity, onde: [] };
  const porSecao = new Map();
  for (const p of T.partes) {
    const bin = readFileSync(path.join(dir, `${p}.seq.bin`));
    for (const linha of readFileSync(path.join(dir, `${p}.secoes.jsonl`), 'utf8').split('\n')) {
      if (!linha) continue;
      const s = JSON.parse(linha);
      const id = `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`;
      secoes++;
      votos += s.votos;
      for (const k in vias) vias[k] += s.vias[k];
      foraCopia += s.linhasForaDaCopia;
      outraSecao += s.linhasOutraSecao;
      semIdent += s.semIdentificador;
      if (s.fluxos.filter((f) => f.votos > 0).length > 1) multiFluxo++;
      porSecao.set(id, s);
      let n = 0, c = 0, somaP = 0;
      const todosD = [];
      for (const f of s.fluxos) {
        fluxos++;
        semCiclo += f.semCiclo;
        duplicadas += f.duplicadas;
        abandonos += f.abandonos;
        if (!f.n) continue;
        const Ds = [], Ks = [];
        for (let i = 0; i < f.n; i++) { Ds.push(bin.readUInt16LE(f.pos + 2 * i)); Ks.push(bin[f.pos + 2 * f.n + i]); }
        // tempo de cada voto (para localizar sequências), reiniciando após D negativo
        let tempo = f.primeiroV;
        let run = 0, runIni = -1, runIniT = null;
        let defMin = 0, defCur = 0, defLen = 0, defIni = 0, defIniCur = 0; // Kadane (mínimo) com comprimento ≥ 2
        let p1 = 0, p2 = 0;
        const fecharRun = () => {
          if (run >= 3) {
            runs3++;
            if (run >= 5) runs5++;
            maiorRun = Math.max(maiorRun, run);
            sequenciasLE.push({ turno, id, urna: f.urna, inicio: hms(runIniT), tamanho: run, Ds: Ds.slice(runIni, runIni + run).join('+') });
          }
          run = 0;
        };
        for (let i = 0; i < f.n; i++) {
          const D = Ds[i], k = Ks[i];
          if (D === 65535) { negativos++; fecharRun(); p1 = p2 = 0; defCur = 0; defLen = 0; tempo = null; continue; }
          ciclosD++;
          const tAnt = tempo;
          if (tempo !== null) tempo += D;
          if (D < minD.valor) { minD.valor = D; minD.onde = []; }
          if (D === minD.valor && minD.onde.length < 20) minD.onde.push(`${id} ${f.urna} ${hms(tempo)}`);
          const L = pk(k);
          const pi = L.p;
          n++; somaP += pi; todosD.push(D);
          esperadoRuns += pi * p1 * p2;
          p2 = p1; p1 = pi;
          if (D <= L.LE) { c++; if (run === 0) { runIni = i; runIniT = tAnt; } run++; } else fecharRun();
          if (D <= 1) { lf1++; casosLF.push({ tipo: 'LF-1', turno, id, urna: f.urna, hora: hms(tempo), D, k }); }
          // LF-n: menor soma de (D − M) em janela com 2 ou mais ciclos
          const x = D - M(k);
          if (defLen === 0 || defCur > 0) { defCur = x; defLen = 1; defIniCur = tAnt; }
          else { defCur += x; defLen++; }
          if (defLen >= 2 && defCur < menorDeficit.valor) menorDeficit = { valor: defCur, turno, id, urna: f.urna, ciclos: defLen, fim: hms(tempo) };
          if (defLen >= 2 && defCur <= -1) casosLF.push({ tipo: 'LF-n', turno, id, urna: f.urna, ciclos: defLen, deficit: defCur, inicio: hms(defIniCur), fim: hms(tempo) });
        }
        fecharRun();
      }
      if (n > 0) { todosD.sort((a, b) => a - b); secoesTeste.push({ turno, id, n, c, pbar: somaP / n, votos: s.votos, vias: s.vias, medianaD: todosD[Math.floor((n - 1) / 2)], p10D: todosD[Math.floor(0.1 * (n - 1))] }); }
    }
  }
  T.porSecao = porSecao;
  resultado.turnos[turno] = {
    partes: T.partes.length, secoesLidas: T.secoesLidas, errosLeitura: T.erros.length, exemplosErros: T.erros.slice(0, 10), secoes, fluxos, secoesComMaisDeUmFluxoComVoto: multiFluxo, votos, vias,
    votosSemCiclo: semCiclo, votosSemIdentificador: semIdent, linhasDuplicadasNoFluxo: duplicadas, linhasDeOutraCopiaForaDaEscolhida: foraCopia, linhasDeOutraSecao: outraSecao, habilitadosSemVoto: abandonos,
    tiposHabilitacao: T.tipos, confirmacoesPorCiclo: T.confs,
    D: { ciclos: ciclosD, negativos, minimo: minD, porK: Object.fromEntries(Object.entries(T.hist.D).map(([k, arr]) => [k, resumo(arr)])), turnoInteiro: resumo(T.pooledD) },
    A: Object.fromEntries(Object.entries(T.hist.A).map(([k, arr]) => [k, resumo(arr)])),
    B: Object.fromEntries(Object.entries(T.hist.B).map(([k, arr]) => [k, resumo(arr)])),
    C: Object.fromEntries(Object.entries(T.hist.C).map(([k, arr]) => [k, resumo(arr)])),
    passos: Object.fromEntries(Object.entries(T.hist.passos).map(([k, arr]) => [k, resumo(arr)])),
    LE: T.LE, LEturno: T.LEturno,
    LF: { lf1, lfn: casosLF.filter((x) => x.turno === turno && x.tipo === 'LF-n').length, menorDeficitDaJanela: menorDeficit },
    sequenciasLE: { observadas3ouMais: runs3, observadas5ouMais: runs5, maior: maiorRun, esperadas3ouMaisSobIndependencia: esperadoRuns },
  };
}
function hms(t) {
  if (t === null || t === undefined) return null;
  return `${String(Math.floor(t / 3600)).padStart(2, '0')}:${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

// ---------- teste por seção (Bonferroni e BH sobre os dois turnos) ----------
const N = secoesTeste.length;
for (const s of secoesTeste) s.logp = logCaudaBinomial(s.c, s.n, s.pbar);
const ordem = secoesTeste.map((s, i) => [s.logp, i]).sort((a, b) => a[0] - b[0]);
const logAlfaB = Math.log(0.05 / N);
let kBH = 0;
ordem.forEach(([lp], r) => { if (lp <= Math.log(0.05 * (r + 1) / N)) kBH = r + 1; });
const sig = secoesTeste.filter((s) => s.logp <= logAlfaB);
const bh = new Set(ordem.slice(0, kBH).map(([, i]) => i));
const porTurno = (t) => ({ testadas: secoesTeste.filter((s) => s.turno === t).length, bonferroni: sig.filter((s) => s.turno === t).length, bh: [...bh].filter((i) => secoesTeste[i].turno === t).length });
const pt1 = porTurno(1), pt2 = porTurno(2);
// C3: proporção do 2º turno maior que a do 1º? (z unilateral)
const p1 = pt1.bonferroni / pt1.testadas, p2 = pt2.bonferroni / pt2.testadas, pp = (pt1.bonferroni + pt2.bonferroni) / (pt1.testadas + pt2.testadas);
const zC3 = pp > 0 ? (p2 - p1) / Math.sqrt(pp * (1 - pp) * (1 / pt1.testadas + 1 / pt2.testadas)) : 0;
// Exploratório (acrescentado depois de ver C3): beta-binomial com ρ (sobredispersão entre seções) por momentos, por turno.
const lbeta = (a, b) => lgamma(a) + lgamma(b) - lgamma(a + b);
function logCaudaBB(c, n, a, b) {
  if (c <= 0) return 0;
  const lc = (j) => lgamma(n + 1) - lgamma(j + 1) - lgamma(n - j + 1) + lbeta(j + a, n - j + b) - lbeta(a, b);
  const l0 = lc(c);
  let soma = 0;
  for (let j = c; j <= n; j++) { const r = Math.exp(lc(j) - l0); soma += r; if (r < 1e-16 * soma) break; }
  return l0 + Math.log(soma);
}
const bb = {};
for (const t of [1, 2]) {
  const ss = secoesTeste.filter((s) => s.turno === t);
  let num = 0, sn = 0, snn = 0;
  for (const s of ss) { const p = s.pbar; num += (s.c - s.n * p) ** 2 / (p * (1 - p)); sn += s.n; snn += s.n * (s.n - 1); }
  const rho = Math.max(1e-9, (num - sn) / snn);
  for (const s of ss) { const a = s.pbar * (1 / rho - 1), b = (1 - s.pbar) * (1 / rho - 1); s.logpBB = logCaudaBB(s.c, s.n, a, b); }
  const sigBB = ss.filter((s) => s.logpBB <= logAlfaB);
  const medNac = (arr) => { const v = arr.map((s) => s.medianaD).sort((a, b) => a - b); return v[Math.floor((v.length - 1) / 2)]; };
  bb[t] = { rho, secoesBonferroniBB: sigBB.length, medianaDasMedianasD: medNac(ss), medianaDasMedianasD_sigBinomial: medNac(ss.filter((s) => s.logp <= logAlfaB)), medianaDasMedianasD_sigBB: sigBB.length ? medNac(sigBB) : null };
}
resultado.betaBinomialExploratorio = bb;
resultado.testePorSecao = {
  testes: N, alfaBonferroni: 0.05 / N, turno1: pt1, turno2: pt2,
  C3: { fracao1: p1, fracao2: p2, z: zC3, pUnilateral: 0.5 * erfc(zC3 / Math.SQRT2) },
};
function erfc(x) {
  const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}

// ---------- conferência com o BU ----------
const { db } = await abrirLeitura();
const div = [];
const conf = {};
for (const turno of [1, 2]) {
  const T = turnos[turno];
  let semLog = 0, iguais = 0, difVotos = 0, difVias = 0, somaAbsVotos = 0;
  const vistas = new Set();
  for (const r of db.prepare('SELECT uf, municipio, zona, secao, comparecimento, sem_biometria, por_biometria, por_biografia, tipo_arquivo FROM secao WHERE turno = ?').iterate(turno)) {
    const id = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
    const s = T.porSecao.get(id);
    if (!s) { if (r.comparecimento) semLog++; continue; }
    vistas.add(id);
    const dv = s.votos - (r.comparecimento ?? 0);
    const temDet = r.por_biometria !== null && r.uf !== 'zz';
    const dVias = temDet ? Math.abs(s.vias.v1 - r.por_biometria) + Math.abs(s.vias.v2 - r.sem_biometria) + Math.abs(s.vias.v3m + s.vias.v3s - r.por_biografia) : 0;
    if (dv !== 0) { difVotos++; somaAbsVotos += Math.abs(dv); }
    if (dVias !== 0) difVias++;
    if (dv === 0 && dVias === 0) iguais++;
    if (dv !== 0 || dVias !== 0) div.push({ turno, id, votosLog: s.votos, comparecimentoBu: r.comparecimento, ...s.vias, buBio: r.por_biometria, buSemBio: r.sem_biometria, buBiografia: r.por_biografia, tipoArquivo: r.tipo_arquivo });
  }
  const soLog = [...T.porSecao.keys()].filter((id) => !vistas.has(id));
  conf[turno] = { secoesIguais: iguais, secoesVotosDiferentes: difVotos, somaAbsDiferencaVotos: somaAbsVotos, secoesViasDiferentes: difVias, secoesComComparecimentoSemLeitura: semLog, secoesLidasForaDoBanco: soLog.length };
}
db.close();
resultado.conferenciaBu = conf;

// ---------- as 3 seções da perícia ----------
resultado.tresSecoes = ['ba/39870/0133/0184', 'es/57932/0009/0085', 'mg/40690/0016/0264'].map((id) => {
  const s = turnos[2].porSecao.get(id);
  if (!s) return { id, ausente: true };
  return { id, votos: s.votos, linhasOutraSecao: s.linhasOutraSecao, linhasForaDaCopia: s.linhasForaDaCopia, fluxos: s.fluxos.map((f) => ({ urna: f.urna, copias: f.copias, votos: f.votos, dMin: f.dMin, duplicadas: f.duplicadas })) };
});

// ---------- saídas ----------
const topo = secoesTeste.map((s, i) => ({ ...s, i })).sort((a, b) => a.logp - b.logp).slice(0, 200);
const csv = (linhas, cols) => [cols.join(';'), ...linhas.map((l) => cols.map((c) => l[c]).join(';'))].join('\n') + '\n';
resultado.secoesMaisExtremas = topo.slice(0, 30).map((s) => ({ turno: s.turno, id: s.id, n: s.n, curtos: s.c, medianaD: s.medianaD, log10pBB: +(s.logpBB / Math.LN10).toFixed(2), esperado: +(s.n * s.pbar).toFixed(3), razao: +(s.c / (s.n * s.pbar)).toFixed(1), log10p: +(s.logp / Math.LN10).toFixed(2), bonferroni: s.logp <= logAlfaB, bh: bh.has(s.i), vias: s.vias }));
resultado.casosLF = casosLF.slice(0, 200);
resultado.casosLFTotal = casosLF.length;
await writeFile(path.join(BASE, 'resultado.json'), JSON.stringify(resultado, null, 1));
await writeFile(path.join(BASE, 'secoes-bonferroni.csv'), csv(secoesTeste.filter((s) => s.logp <= logAlfaB).map((s) => ({ ...s, log10p: (s.logp / Math.LN10).toFixed(3), log10pBB: (s.logpBB / Math.LN10).toFixed(3), bbBonferroni: s.logpBB <= logAlfaB, v1: s.vias.v1, v2: s.vias.v2, v3m: s.vias.v3m, v3s: s.vias.v3s })), ['turno', 'id', 'votos', 'n', 'c', 'medianaD', 'p10D', 'log10p', 'log10pBB', 'bbBonferroni', 'v1', 'v2', 'v3m', 'v3s']));
await writeFile(path.join(BASE, 'secoes-excesso.csv'), csv(topo.map((s) => ({ ...s, esperado: (s.n * s.pbar).toFixed(4), log10p: (s.logp / Math.LN10).toFixed(3), bonferroni: s.logp <= logAlfaB, bh: bh.has(s.i), v1: s.vias.v1, v2: s.vias.v2, v3m: s.vias.v3m, v3s: s.vias.v3s })), ['turno', 'id', 'votos', 'n', 'c', 'esperado', 'log10p', 'bonferroni', 'bh', 'v1', 'v2', 'v3m', 'v3s']));
await writeFile(path.join(BASE, 'sequencias-le.csv'), csv(sequenciasLE, ['turno', 'id', 'urna', 'inicio', 'tamanho', 'Ds']));
await writeFile(path.join(BASE, 'divergencias-bu.csv'), csv(div, ['turno', 'id', 'votosLog', 'comparecimentoBu', 'v1', 'v2', 'v3m', 'v3s', 'outra', 'buBio', 'buSemBio', 'buBiografia', 'tipoArquivo']));
const r = structuredClone(resultado);
for (const t of [1, 2]) { delete r.turnos[t].A; delete r.turnos[t].C; delete r.turnos[t].passos; }
r.casosLF = r.casosLF.slice(0, 10);
console.log(JSON.stringify(r, null, 1));
