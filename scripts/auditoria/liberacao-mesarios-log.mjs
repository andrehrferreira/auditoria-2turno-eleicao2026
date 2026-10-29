// H13, método "mesarios" (passo 3): rastro no log bruto das seções em que um único mesário liberou ≥ 100 eleitores
// (cauda) e de uma seção-controle da mesma zona (mesário-topo < 10 liberações, comparecimento parecido).
// Para cada voto computado reconstrói o ciclo identificação → tentativas de digital → dado pessoal → digital do
// mesário → "Eleitor foi habilitado" → "Voto confirmado para [Presidente]" → "O voto do eleitor foi computado" e mede:
//   - classe de habilitação (biometria, ano de nascimento, manual com mesário, manual sem associação nominal);
//   - tempo habilitação → confirmação (eleitor na cabine) e duração do ciclo, por classe;
//   - horário das liberações do mesário-topo (última hora, maior número em 10 min, menor intervalo);
//   - maior sequência de votos seguidos liberados pelo mesário-topo e teste de permutação (a ordem é aleatória?);
//   - anomalias de sequência: voto sem habilitação, habilitação sem voto, liberação sem "Biometria do mesário …
//     encontrada", liberação manual com menos de 4 tentativas de digital do eleitor.
// O título do mesário vira pseudônimo (mesma chave do Auditor B). Dias: 25/10 (2º turno) e 04/10 (1º turno, do
// mesmo log cumulativo, só se o dia for da mesma seção).
// Uso: node scripts/auditoria/liberacao-mesarios-log.mjs   (lê data/parsed/auditoria/liberacao/mesarios-alvos-log.json)
// Saída: data/parsed/auditoria/liberacao/mesarios-log.jsonl e mesarios-log-resumo.json
import { createHmac } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerLogs } from '../../src/perfil-secoes.js';

const DIR_LIB = path.join(DIR_DADOS, 'parsed', 'auditoria', 'liberacao');
const chave = (await readFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'biometria', '.chave-pseudonimo'), 'utf8')).trim();
const pseudo = (t) => `M${createHmac('sha256', chave).update(t).digest('hex').slice(0, 10)}`;
const DIAS = { d2: '25/10/2026', d1: '04/10/2026' };
const seg = (h) => { const [a, b, c] = h.split(':').map(Number); return a * 3600 + b * 60 + c; };
const med = (v) => { if (!v.length) return null; const s = [...v].sort((a, b) => a - b); return s[Math.floor((s.length - 1) / 2)]; };
const qt = (v, p) => { if (!v.length) return null; const s = [...v].sort((a, b) => a - b); return s[Math.floor(p * (s.length - 1))]; };

// Gerador determinístico para o teste de permutação
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const maiorSequencia = (seq) => { let m = 0; let c = 0; for (const x of seq) { c = x ? c + 1 : 0; if (c > m) m = c; } return m; };
function testePermutacao(seq, reps = 2000, semente = 13) {
  const obs = maiorSequencia(seq);
  const rnd = mulberry(semente);
  const a = [...seq];
  let maiorOuIgual = 0;
  for (let r = 0; r < reps; r++) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    if (maiorSequencia(a) >= obs) maiorOuIgual++;
  }
  return { observada: obs, p: +((maiorOuIgual + 1) / (reps + 1)).toFixed(4) };
}

function analisarDia(texto, dia) {
  const votos = [];
  const anomalias = { votoSemHabilitacao: 0, habilitacaoSemVoto: 0, liberacaoSemDigitalDoMesarioEncontrada: 0, manualComMenosDe4Tentativas: 0, liberacaoPorNaoRegistrado: 0 };
  const registrados = new Set();
  const eleitorDaSecao = {};
  const id = {};
  let enc = null; let pronta = null;
  const novo = () => ({ tId: null, tent: 0, bio: false, ano: false, dp: false, mes: null, tLib: null, encontrado: new Set(), tHab: null, tConf: null });
  let c = novo();
  for (const linha of texto.split('\n')) {
    if (!linha.startsWith(dia)) continue;
    const p = linha.split('\t');
    const msg = p[4] ?? '';
    const t = seg(p[0].slice(11, 19));
    if (msg === 'Aguardando digitação do identificador do eleitor') {
      if (c.tHab !== null) anomalias.habilitacaoSemVoto++;
      c = novo();
    } else if (msg === 'Identificador do eleitor digitado pelo mesário') c.tId ??= t;
    else if (msg.startsWith('Solicita digital. Tentativa')) c.tent++;
    else if (msg.includes('Tipo de habilitação do eleitor [biométrica]')) c.bio = true;
    else if (msg.startsWith('Ano de nascimento digitado é igual ao do cadastro')) c.ano = true;
    else if (msg === 'Dado digitado confere') c.dp = true;
    else if (msg === 'Eleitor foi habilitado') c.tHab = t;
    else if (msg === 'Voto confirmado para [Presidente]') c.tConf ??= t;
    else if (msg === 'O voto do eleitor foi computado') {
      if (c.tHab === null) anomalias.votoSemHabilitacao++;
      const classe = c.bio ? 'bio' : c.ano ? 'ano' : c.dp ? (c.mes ? 'manualMesario' : 'manualSem') : 'outra';
      if (classe === 'manualMesario' && !c.encontrado.has(c.mes)) anomalias.liberacaoSemDigitalDoMesarioEncontrada++;
      if ((classe === 'manualMesario' || classe === 'manualSem') && c.tent < 4) anomalias.manualComMenosDe4Tentativas++;
      if (classe === 'manualMesario' && !registrados.has(c.mes)) anomalias.liberacaoPorNaoRegistrado++;
      votos.push({ classe, mes: c.mes, tId: c.tId, tLib: c.tLib, tHab: c.tHab, tConf: c.tConf, t, tent: c.tent });
      c = novo();
    } else if (msg.startsWith('Urna pronta para receber votos')) pronta ??= t;
    else if (msg.startsWith('Inicio do Encerramento')) enc = t;
    else if (/^(Município|Zona Eleitoral|Seção Eleitoral): /.test(msg)) {
      const [campo, valor] = msg.split(': ');
      id[campo] ??= Number(valor);
    } else {
      let m = /^Mesário (\d+) habilitou o eleitor/.exec(msg);
      if (m) { c.mes = pseudo(m[1]); c.tLib = t; }
      else if ((m = /^Biometria do mesário (\d+) encontrada/.exec(msg))) c.encontrado.add(pseudo(m[1]));
      else if ((m = /^Mesário (\d+) registrado/.exec(msg))) registrados.add(pseudo(m[1]));
      else if ((m = /^Mesário (\d+) (não é|é) eleitor da seção/.exec(msg))) eleitorDaSecao[pseudo(m[1])] = m[2] === 'é';
    }
  }
  return { votos, anomalias, registrados, eleitorDaSecao, id, enc, pronta };
}

function metricas(d, mesTopo) {
  const { votos } = d;
  if (!votos.length) return null;
  const porClasse = {};
  for (const v of votos) {
    const a = (porClasse[v.classe] ??= { n: 0, cabine: [], ciclo: [], tent: [], lag: [] });
    a.n++;
    if (v.tHab != null && v.tConf != null) a.cabine.push(v.tConf - v.tHab);
    if (v.tId != null) a.ciclo.push(v.t - v.tId);
    a.tent.push(v.tent);
    if (v.tLib != null && v.tHab != null) a.lag.push(v.tHab - v.tLib);
  }
  const classes = {};
  for (const [k, a] of Object.entries(porClasse)) {
    classes[k] = {
      n: a.n, cabineMediana: med(a.cabine), cabineP10: qt(a.cabine, 0.1), cabineMenor5s: a.cabine.filter((x) => x < 5).length, nCabine: a.cabine.length,
      cabine0a9s: Array.from({ length: 10 }, (_, s) => a.cabine.filter((x) => x === s).length),
      cicloMediano: med(a.ciclo), tentativasMediana: med(a.tent), liberacaoAteHabilitadoMediana: med(a.lag),
    };
  }
  // mesário-topo do dia (o mais frequente, ou o indicado)
  const cont = {};
  for (const v of votos) if (v.classe === 'manualMesario') cont[v.mes] = (cont[v.mes] ?? 0) + 1;
  const topo = mesTopo && cont[mesTopo] ? mesTopo : Object.entries(cont).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const tTopo = votos.filter((v) => v.classe === 'manualMesario' && v.mes === topo).map((v) => v.t);
  const fim = d.enc ?? votos.at(-1).t;
  const ultHoraTopo = tTopo.filter((t) => t >= fim - 3600).length;
  const ultHoraTodos = votos.filter((v) => v.t >= fim - 3600).length;
  let maior10 = 0;
  for (let i = 0, j = 0; i < tTopo.length; i++) { while (tTopo[i] - tTopo[j] > 600) j++; maior10 = Math.max(maior10, i - j + 1); }
  const gaps = tTopo.slice(1).map((t, i) => t - tTopo[i]);
  const porHora = new Array(24).fill(0);
  const porHoraTodos = new Array(24).fill(0);
  for (const t of tTopo) porHora[Math.floor(t / 3600)]++;
  for (const v of votos) porHoraTodos[Math.floor(v.t / 3600)]++;
  const seq = votos.map((v) => v.classe === 'manualMesario' && v.mes === topo);
  const cabTopo = votos.filter((v) => v.classe === 'manualMesario' && v.mes === topo && v.tHab != null && v.tConf != null).map((v) => v.tConf - v.tHab);
  const cabBio = votos.filter((v) => v.classe === 'bio' && v.tHab != null && v.tConf != null).map((v) => v.tConf - v.tHab);
  return {
    votos: votos.length, classes, mesarioTopo: topo, liberacoesTopo: tTopo.length,
    topoRegistrado: topo ? d.registrados.has(topo) : null, topoEleitorDaSecao: topo ? d.eleitorDaSecao[topo] ?? null : null,
    fracTopoUltimaHora: tTopo.length ? +(ultHoraTopo / tTopo.length).toFixed(3) : null, fracVotosUltimaHora: +(ultHoraTodos / votos.length).toFixed(3),
    topoMaior10min: maior10, topoMenorIntervalo: gaps.length ? Math.min(...gaps) : null, topoIntervaloMediano: med(gaps),
    topoPorHora: porHora, votosPorHora: porHoraTodos,
    sequenciaTopo: tTopo.length >= 5 ? testePermutacao(seq) : null,
    // Mesmo teste para qualquer liberação manual (com ou sem mesário): separa a troca de mesário no terminal do
    // agrupamento das próprias liberações
    sequenciaManual: votos.filter((v) => v.classe.startsWith('manual')).length >= 5 ? testePermutacao(votos.map((v) => v.classe.startsWith('manual')), 2000, 29) : null,
    cabineTopoMediana: med(cabTopo), cabineTopoP10: qt(cabTopo, 0.1), cabineTopoMenor5s: cabTopo.filter((x) => x < 5).length,
    cabineBioMediana: med(cabBio), cabineBioP10: qt(cabBio, 0.1), cabineBioMenor5s: cabBio.filter((x) => x < 5).length, nCabineBio: cabBio.length,
    anomalias: d.anomalias,
  };
}

async function dirPacote(uf, m, z, s) {
  const base = path.join(DIR_DADOS, 'raw', '2t', 'urnas', uf, m, z, s);
  const subs = (await readdir(base, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  if (!subs.length) throw new Error('sem pacote');
  return path.join(base, subs[0]);
}

const alvos = JSON.parse(await readFile(path.join(DIR_LIB, 'mesarios-alvos-log.json'), 'utf8'));
const linhas = [];
for (const a of alvos) {
  const [uf, m, z, s] = a.secao.split('/');
  try {
    const dir = await dirPacote(uf, m, z, s);
    const nomeLog = acharArquivo(await readdir(dir), 'log');
    const { texto } = await lerLogs(path.join(dir, nomeLog), s);
    const r = { secao: a.secao, papel: a.papel, parDe: a.parDe ?? null };
    for (const [k, dia] of Object.entries(DIAS)) {
      const d = analisarDia(texto, dia);
      const mesma = d.id['Seção Eleitoral'] == null || (d.id['Seção Eleitoral'] === Number(s) && d.id['Zona Eleitoral'] === Number(z));
      r[k] = mesma ? metricas(d, k === 'd2' ? a.mesarioTopo : null) : { outraSecao: true };
    }
    linhas.push(r);
  } catch (erro) {
    linhas.push({ secao: a.secao, papel: a.papel, erro: erro.message });
  }
}
await writeFile(path.join(DIR_LIB, 'mesarios-log.jsonl'), linhas.map((x) => JSON.stringify(x)).join('\n') + '\n');

// Resumo cauda × controle
const resumo = {};
for (const papel of ['cauda', 'controle']) {
  for (const dia of ['d2', 'd1']) {
    const xs = linhas.filter((l) => l.papel === papel && l[dia] && !l[dia].outraSecao).map((l) => l[dia]);
    const soma = (f) => xs.reduce((acc, x) => acc + (f(x) ?? 0), 0);
    const comTopo = xs.filter((x) => x.liberacoesTopo >= 5);
    resumo[`${papel}_${dia}`] = {
      secoes: xs.length, votos: soma((x) => x.votos),
      liberacoesTopo: soma((x) => x.liberacoesTopo),
      fracTopoUltimaHora_mediana: med(comTopo.map((x) => x.fracTopoUltimaHora)), fracVotosUltimaHora_mediana: med(xs.map((x) => x.fracVotosUltimaHora)),
      topoMaior10min_max: Math.max(0, ...xs.map((x) => x.topoMaior10min)), topoMenorIntervalo_min: Math.min(...comTopo.map((x) => x.topoMenorIntervalo ?? Infinity)),
      sequenciaSignificativa_p001: comTopo.filter((x) => x.sequenciaTopo && x.sequenciaTopo.p < 0.001).length, comTesteSequencia: comTopo.filter((x) => x.sequenciaTopo).length,
      sequenciaManualSignificativa_p001: xs.filter((x) => x.sequenciaManual && x.sequenciaManual.p < 0.001).length, comTesteSequenciaManual: xs.filter((x) => x.sequenciaManual).length,
      cabinePorClasse: Object.fromEntries(['bio', 'ano', 'manualMesario', 'manualSem'].map((c) => [c, {
        menor5s: soma((x) => x.classes[c]?.cabineMenor5s), n: soma((x) => x.classes[c]?.nCabine),
        cabine0a9s: Array.from({ length: 10 }, (_, s) => soma((x) => x.classes[c]?.cabine0a9s[s])),
        medianaDasMedianas: med(xs.map((x) => x.classes[c]?.cabineMediana).filter((v) => v != null)),
      }])),
      liberacaoAteHabilitado_medianaDasMedianas: med(xs.map((x) => x.classes.manualMesario?.liberacaoAteHabilitadoMediana).filter((v) => v != null)),
      cabineTopoMediana_mediana: med(comTopo.map((x) => x.cabineTopoMediana).filter((x) => x != null)),
      cabineBioMediana_mediana: med(xs.map((x) => x.cabineBioMediana).filter((x) => x != null)),
      cabineTopoMenor5s: soma((x) => x.cabineTopoMenor5s), cabineBioMenor5s: soma((x) => x.cabineBioMenor5s), nCabineBio: soma((x) => x.nCabineBio),
      cicloManualMesarioMediano_mediana: med(xs.map((x) => x.classes.manualMesario?.cicloMediano).filter((x) => x != null)),
      cicloBioMediano_mediana: med(xs.map((x) => x.classes.bio?.cicloMediano).filter((x) => x != null)),
      tentativasManualMediana: med(xs.map((x) => x.classes.manualMesario?.tentativasMediana).filter((x) => x != null)),
      topoRegistrado: comTopo.filter((x) => x.topoRegistrado).length, topoEleitorDaSecao: comTopo.filter((x) => x.topoEleitorDaSecao).length, comTopo: comTopo.length,
      anomalias: Object.fromEntries(Object.keys(xs[0]?.anomalias ?? {}).map((k) => [k, soma((x) => x.anomalias[k])])),
    };
  }
}
resumo.erros = linhas.filter((l) => l.erro).length;

// Cabine rápida (< 5 s) do mesário-topo × parcela do 13 da seção menos a da zona (cauda, 2º turno)
const cauda = new Map((await readFile(path.join(DIR_LIB, 'mesarios-cauda-2t.jsonl'), 'utf8')).trim().split('\n').map((l) => JSON.parse(l)).map((x) => [x.secao, x]));
const pares = linhas.filter((l) => l.papel === 'cauda' && l.d2?.liberacoesTopo && cauda.has(l.secao))
  .map((l) => ({ secao: l.secao, rapida: l.d2.cabineTopoMenor5s / l.d2.liberacoesTopo, dif: cauda.get(l.secao).dif, DiD: cauda.get(l.secao).DiD }));
const postos = (v) => { const o = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]); const r = new Array(v.length); for (let i = 0; i < o.length;) { let j = i; while (j + 1 < o.length && o[j + 1][0] === o[i][0]) j++; for (let k = i; k <= j; k++) r[o[k][1]] = (i + j) / 2; i = j + 1; } return r; };
const spearman = (a, b) => { const ra = postos(a); const rb = postos(b); const n = a.length; const ma = (n - 1) / 2; let sab = 0; let saa = 0; let sbb = 0; for (let i = 0; i < n; i++) { sab += (ra[i] - ma) * (rb[i] - ma); saa += (ra[i] - ma) ** 2; sbb += (rb[i] - ma) ** 2; } return +(sab / Math.sqrt(saa * sbb)).toFixed(3); };
resumo.cabineRapidaTopo_x_parcela13 = {
  secoes: pares.length,
  spearmanComDifZona: spearman(pares.map((p) => p.rapida), pares.map((p) => p.dif)),
  spearmanComDiD: spearman(pares.filter((p) => p.DiD != null).map((p) => p.rapida), pares.filter((p) => p.DiD != null).map((p) => p.DiD)),
  maisRapidas: pares.sort((a, b) => b.rapida - a.rapida).slice(0, 8).map((p) => ({ ...p, rapida: +p.rapida.toFixed(3) })),
};
await writeFile(path.join(DIR_LIB, 'mesarios-log-resumo.json'), `${JSON.stringify(resumo, null, 1)}\n`);
for (const [k, v] of Object.entries(resumo)) console.log(k, JSON.stringify(v));
