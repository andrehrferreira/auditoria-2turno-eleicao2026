// Engenheiro de segurança, H20 (relógio e ordem temporal), docs/analysis/engenheiro-seguranca-urna/11.
// Lê a varredura própria dos diários (seguranca-h20-varredura.mjs, os dois turnos), o fuso por município
// (data/parsed/auditoria/tempo/2t/fuso-municipio.csv), as 81 seções com relógio fora do fuso (relogio-fora-do-fuso.mjs),
// o resultado do limite externo (seguranca-h20-recebimento.mjs) e os votos de Presidente do banco.
// Mede, no universo completo:
//   1. ordem zerésima → abertura → 1º voto → último voto → encerramento → BU, por fluxo de urna, pela ordem física
//      (F, a ordem em que as linhas foram gravadas) e pelo relógio (R);
//   2. retrocessos do relógio (linha com hora menor que a anterior), por classe (ajuste, religa, sem);
//      acertos de relógio no dia depois da zerésima;
//   3. janela deslocada: abertura antes das 08:00 e encerramento antes das 17:00 de Brasília, e seções com uma hora
//      cheia de diferença na abertura entre os turnos;
//   4. recebimento no TSE antes da emissão (lido de recebimento.json);
//   e o voto das seções com anomalia contra o resto da mesma zona.
// Uso: node --max-old-space-size=8192 scripts/auditoria/seguranca-h20-analise.mjs
// Saída: data/parsed/auditoria/engenheiro-seguranca-urna/h20/resultado.json e casos.csv
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { chaveSecao, difRelogioPorSecao, difSecao } from './relogio-fora-do-fuso.mjs';

const BASE = path.join(DIR_DADOS, 'parsed', 'auditoria', 'engenheiro-seguranca-urna', 'h20');
const H8 = 8 * 3600, H17 = 17 * 3600;
const hms = (t) => {
  if (t === null || t === undefined) return '';
  const s = ((t % 86400) + 86400) % 86400, d = Math.floor(t / 86400);
  return `${d ? `${d > 0 ? '+' : ''}${d}d ` : ''}${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
const inc = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };

// fuso por município (modal do 2º turno)
const fuso = new Map();
for (const l of (await readFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'tempo', '2t', 'fuso-municipio.csv'), 'utf8')).split(/\r?\n/).slice(1)) {
  if (!l) continue;
  const c = l.split(',');
  if (c[6] !== '') fuso.set(`${c[0]}/${Number(c[1])}`, Number(c[6]));
}
const relogio = { 1: difRelogioPorSecao(1), 2: difRelogioPorSecao(2) };

async function* secoesDoTurno(turno) {
  const dir = path.join(BASE, `${turno}t`);
  for (const n of (await readdir(dir)).filter((x) => x.endsWith('.jsonl')).sort()) {
    for (const l of (await readFile(path.join(dir, n), 'utf8')).split('\n')) if (l) yield JSON.parse(l);
  }
}

const casos = [];
const caso = (turno, s, tipo, detalhe) => casos.push({ turno, id: `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`, uf: s.uf, municipio: s.municipio, zona: s.zona, secao: s.secao, tipo, detalhe });
const resultado = { geradoEm: new Date().toISOString(), turnos: {} };
const aberturaLocal = { 1: new Map(), 2: new Map() };

for (const turno of [1, 2]) {
  const r = {
    secoes: 0, errosLeitura: 0, semLog: 0, semFluxo: 0, fluxos: 0, fluxosComVoto: 0, fluxosOriginaisContingencia: 0,
    votos: 0, votosOutroDia: 0, votosForaDoTrecho: 0, linhasDiaForaDoTrecho: { fluxos: 0, linhas: 0 },
    ordem: {
      fluxosComVotoEZer: 0, fluxosComVotoSemZer: 0, fluxosComVotoSemZerContingencia: 0, fluxosComVotoSemZerOriginal: 0,
      votosAntesZerF: 0, votosAntesZerR: 0, fluxosVotoAntesZerF: 0, fluxosVotoAntesZerR: 0,
      votosAntesProntaF: 0, votosAntesProntaR: 0, fluxosVotoAntesProntaF: 0, fluxosVotoAntesProntaR: 0, fluxosComVotoSemPronta: 0,
      votosDepoisEncF: 0, votosDepoisEncR: 0, fluxosVotoDepoisEncF: 0, fluxosVotoDepoisEncR: 0,
      votosDepoisBuF: 0, votosDepoisBuR: 0, fluxosBuAntesUltimoVotoF: 0, fluxosBuAntesUltimoVotoR: 0,
      zerDepoisProntaF: 0, zerDepoisProntaR: 0, buAntesEncF: 0, buAntesEncR: 0,
      secaoBuAntesUltimoVotoDeOutraUrna: 0, secoesComVotoEmMaisDeUmaUrna: 0, secoesComUrnasVotandoAoMesmoTempo: 0,
      // intervalo entre o último voto de uma urna e o 1º da seguinte (min): um relógio 1 h adiantado na primeira só
      // aparece como sobreposição quando esse intervalo real é menor que 60 min (cobertura do teste)
      intervaloEntreUrnas: { negativo: 0, '0-59': 0, '60+': 0 },
      fluxosComBu: 0, fluxosComBuSemEnc: 0,
    },
    relogio: {
      retrocessosPeriodo: { ajuste: 0, religa: 0, sem: 0 }, retrocessosDia: { ajuste: 0, religa: 0, sem: 0 },
      fluxosComRetrocessoSemAjustePeriodo: 0, fluxosComRetrocessoSemAjusteDia: 0, semMagnitude: {}, semPorUf: {}, religaPorUf: {},
      ajustesNoDia: { fluxos: 0, linhas: 0, depoisDaZeresima: 0, depoisDaAbertura: 0, fluxosDepoisDaZeresima: 0 },
      lacunas60: 0, lacunas60SemReliga: 0,
    },
    janela: {
      secoesComFuso: 0, secoesSemFuso: 0, exterior: 0, semAbertura: 0,
      aberturaAntes8: 0, aberturaAntes8SemCorrecao: 0, votoAntes8: 0, secoesVotoAntes8: 0, encAntes17: 0,
      aberturaDepois9: 0, aberturaDepois10: 0,
      exteriorAberturaAntes8Local: 0, exteriorEncAntes17Local: 0,
    },
  };
  for await (const s of secoesDoTurno(turno)) {
    if (s.erro) { r.errosLeitura++; continue; }
    r.secoes++;
    if (s.semLog === s.pacotes || !s.logsDistintos) r.semLog++;
    const F = s.fluxos ?? [];
    if (!F.length) { r.semFluxo++; continue; }
    let abertura = null, primeiroV = null, ultimoV = null, enc = null, buDe = null, votosSec = 0;
    for (const f of F) {
      r.fluxos++;
      if (f.prof > 0) r.fluxosOriginaisContingencia++;
      r.votos += f.nV;
      r.votosOutroDia += f.nVoutroDia;
      r.votosForaDoTrecho += f.vForaDoTrecho;
      if (f.diaForaDoTrecho) { r.linhasDiaForaDoTrecho.fluxos++; r.linhasDiaForaDoTrecho.linhas += f.diaForaDoTrecho; }
      if (f.vForaDoTrecho) caso(turno, s, 'voto datado do dia gravado antes do trecho do dia', `${f.urna}: ${f.vForaDoTrecho} votos`);
      if (f.nVoutroDia) caso(turno, s, 'voto com data diferente do dia', `${f.urna}: ${f.nVoutroDia} votos`);
      const o = f.ord, q = r.ordem;
      if (f.nV) {
        r.fluxosComVoto++;
        votosSec += f.nV;
        if (f.zer) {
          q.fluxosComVotoEZer++;
          q.votosAntesZerF += o.vAntesZerF; q.votosAntesZerR += o.vAntesZerR;
          if (o.vAntesZerF) { q.fluxosVotoAntesZerF++; caso(turno, s, 'voto antes da zerésima (ordem física)', `${f.urna}: ${o.vAntesZerF} votos; zerésima ${hms(f.zer[0])}, 1º voto ${hms(f.v1[0])}`); }
          if (o.vAntesZerR) { q.fluxosVotoAntesZerR++; if (!o.vAntesZerF) caso(turno, s, 'voto antes da zerésima (só pelo relógio)', `${f.urna}: ${o.vAntesZerR} votos; zerésima ${hms(f.zer[0])}, 1º voto ${hms(f.v1[0])}`); }
        } else {
          q.fluxosComVotoSemZer++;
          if (f.contingencia) q.fluxosComVotoSemZerContingencia++;
          else if (f.prof > 0) q.fluxosComVotoSemZerOriginal++;
          else caso(turno, s, 'urna com voto, sem zerésima no dia e sem contingência', `${f.urna} prof ${f.prof}: ${f.nV} votos; pronta ${hms(f.pronta?.[0])}; 1º voto ${hms(f.v1[0])}`);
        }
        if (f.pronta) {
          q.votosAntesProntaF += o.vAntesProntaF; q.votosAntesProntaR += o.vAntesProntaR;
          if (o.vAntesProntaF) { q.fluxosVotoAntesProntaF++; caso(turno, s, 'voto antes de "Urna pronta" (ordem física)', `${f.urna}: ${o.vAntesProntaF}`); }
          if (o.vAntesProntaR) { q.fluxosVotoAntesProntaR++; if (!o.vAntesProntaF) caso(turno, s, 'voto antes de "Urna pronta" (só relógio)', `${f.urna}: ${o.vAntesProntaR}`); }
        } else { q.fluxosComVotoSemPronta++; caso(turno, s, 'urna com voto e sem "Urna pronta" no dia', `${f.urna} prof ${f.prof}: ${f.nV} votos`); }
        if (f.enc) {
          q.votosDepoisEncF += o.vDepoisEncF; q.votosDepoisEncR += o.vDepoisEncR;
          if (o.vDepoisEncF) { q.fluxosVotoDepoisEncF++; caso(turno, s, 'voto depois do encerramento (ordem física)', `${f.urna}: ${o.vDepoisEncF}; encerramento ${hms(f.enc[0])}, último voto ${hms(f.vN[0])}`); }
          if (o.vDepoisEncR) { q.fluxosVotoDepoisEncR++; if (!o.vDepoisEncF) caso(turno, s, 'voto depois do encerramento (só relógio)', `${f.urna}: ${o.vDepoisEncR}; encerramento ${hms(f.enc[0])}, último voto ${hms(f.vN[0])}`); }
        }
        if (f.buI) {
          q.votosDepoisBuF += o.vDepoisBuF; q.votosDepoisBuR += o.vDepoisBuR;
          if (o.vDepoisBuF) { q.fluxosBuAntesUltimoVotoF++; caso(turno, s, 'BU gerado antes do último voto (ordem física)', `${f.urna}: ${o.vDepoisBuF} votos depois; BU ${hms(f.buI[0])}, último voto ${hms(f.vN[0])}`); }
          if (o.vDepoisBuR) { q.fluxosBuAntesUltimoVotoR++; if (!o.vDepoisBuF) caso(turno, s, 'BU gerado antes do último voto (só relógio)', `${f.urna}: BU ${hms(f.buI[0])}, último voto ${hms(f.vN[0])}`); }
        }
      }
      if (o.zerDepoisProntaF) { q.zerDepoisProntaF++; caso(turno, s, 'zerésima depois de "Urna pronta" (ordem física)', `${f.urna}: zerésima ${hms(f.zer[0])}, pronta ${hms(f.pronta[0])}, ${f.nZer} zerésimas, ${f.nPronta} prontas`); }
      if (o.zerDepoisProntaR) q.zerDepoisProntaR++;
      if (f.buI) { q.fluxosComBu++; if (!f.enc) q.fluxosComBuSemEnc++; }
      if (o.buAntesEncF) { q.buAntesEncF++; caso(turno, s, 'BU gerado antes da confirmação do encerramento (ordem física)', `${f.urna}: BU ${hms(f.buI[0])}, encerramento ${hms(f.enc[0])}`); }
      if (o.buAntesEncR) q.buAntesEncR++;
      // relógio
      const g = r.relogio;
      for (const c of ['ajuste', 'religa', 'sem']) { g.retrocessosPeriodo[c] += f.saltos.periodo[c]; g.retrocessosDia[c] += f.saltos.dia[c]; }
      if (f.saltos.periodo.sem) { g.fluxosComRetrocessoSemAjustePeriodo++; inc(g.semPorUf, s.uf, f.saltos.periodo.sem); }
      if (f.saltos.periodo.religa) inc(g.religaPorUf, s.uf, f.saltos.periodo.religa);
      if (f.saltos.dia.sem) g.fluxosComRetrocessoSemAjusteDia++;
      for (const [k, v] of Object.entries(f.saltosSemMag)) inc(g.semMagnitude, k, v);
      for (const x of f.exSaltos) if (x.classe === 'sem' || x.noDia) caso(turno, s, `retrocesso do relógio (${x.classe}${x.noDia ? ', no dia' : ''})`, `${f.urna}: ${x.dt} s; antes: ${x.antes} | depois: ${x.depois}`);
      if (f.ajustesDia.length) {
        g.ajustesNoDia.fluxos++; g.ajustesNoDia.linhas += f.ajustesDia.length;
        let depZ = false;
        for (const a of f.ajustesDia) {
          if (f.zer && a.pos > f.zer[1]) { g.ajustesNoDia.depoisDaZeresima++; depZ = true; }
          if (f.pronta && a.pos > f.pronta[1]) g.ajustesNoDia.depoisDaAbertura++;
        }
        if (depZ) { g.ajustesNoDia.fluxosDepoisDaZeresima++; caso(turno, s, 'acerto de relógio no dia depois da zerésima', `${f.urna}: ${f.ajustesDia.map((a) => `${hms(a.t)} ${a.app} ${a.m}`).join(' | ')}`); }
      }
      g.lacunas60 += f.lacunas60; g.lacunas60SemReliga += f.lacunas60SemReliga;
      // seção
      if (f.pronta && (abertura === null || f.pronta[0] < abertura)) abertura = f.pronta[0];
      if (f.v1 && (primeiroV === null || f.v1[0] < primeiroV)) primeiroV = f.v1[0];
      if (f.vN && (ultimoV === null || f.vN[0] > ultimoV)) ultimoV = f.vN[0];
      if (f.buI && (buDe === null || f.buI[0] > buDe.t)) buDe = { t: f.buI[0], urna: f.urna };
      if (f.enc && (enc === null || f.enc[0] > enc)) enc = f.enc[0];
    }
    // duas urnas da mesma seção não podem receber votos ao mesmo tempo: os intervalos [1º voto, último voto] das urnas
    // com voto, ordenados pelo 1º voto, não podem se sobrepor
    const comVoto = F.filter((f) => f.nV && f.v1).sort((a, b) => a.v1[0] - b.v1[0]);
    if (comVoto.length > 1) {
      r.ordem.secoesComVotoEmMaisDeUmaUrna++;
      for (let i = 1; i < comVoto.length; i++) {
        const gap = (comVoto[i].v1[0] - comVoto[i - 1].vN[0]) / 60;
        r.ordem.intervaloEntreUrnas[gap < 0 ? 'negativo' : gap < 60 ? '0-59' : '60+']++;
      }
      for (let i = 1; i < comVoto.length; i++) {
        if (comVoto[i].v1[0] < comVoto[i - 1].vN[0]) {
          r.ordem.secoesComUrnasVotandoAoMesmoTempo++;
          caso(turno, s, 'duas urnas da seção com votos no mesmo intervalo (relógio)', `${comVoto[i - 1].urna} ${hms(comVoto[i - 1].v1[0])}–${hms(comVoto[i - 1].vN[0])} × ${comVoto[i].urna} ${hms(comVoto[i].v1[0])}–${hms(comVoto[i].vN[0])}`);
          break;
        }
      }
    }
    if (buDe && ultimoV !== null && ultimoV > buDe.t) {
      const outra = F.some((f) => f.urna !== buDe.urna && f.vN && f.vN[0] > buDe.t);
      if (outra) { r.ordem.secaoBuAntesUltimoVotoDeOutraUrna++; caso(turno, s, 'voto em outra urna da seção depois do BU (relógio)', `BU ${hms(buDe.t)} (${buDe.urna}), último voto ${hms(ultimoV)}`); }
    }
    // janela (3)
    const j = r.janela;
    if (abertura !== null) aberturaLocal[turno].set(chaveSecao(s.uf, s.municipio, s.zona, s.secao), { a: abertura, enc, v1: primeiroV });
    if (s.uf === 'zz') {
      j.exterior++;
      if (abertura !== null && abertura < H8) j.exteriorAberturaAntes8Local++;
      if (enc !== null && enc < H17) j.exteriorEncAntes17Local++;
      continue;
    }
    const difMun = fuso.get(`${s.uf}/${Number(s.municipio)}`);
    if (difMun === undefined) { j.secoesSemFuso++; continue; }
    j.secoesComFuso++;
    const dif = difSecao(relogio[turno], s.uf, s.municipio, s.zona, s.secao, difMun) * 3600;
    if (abertura === null) { j.semAbertura++; continue; }
    const ab = abertura - dif;
    if (ab < H8) { j.aberturaAntes8++; caso(turno, s, 'abertura antes das 08:00 de Brasília', `pronta ${hms(abertura)} no relógio, ${hms(ab)} Brasília (dif ${dif / 3600} h)`); }
    if (abertura - difMun * 3600 < H8) j.aberturaAntes8SemCorrecao++;
    if (ab >= 9 * 3600) j.aberturaDepois9++;
    if (ab >= 10 * 3600) j.aberturaDepois10++;
    if (primeiroV !== null && primeiroV - dif < H8) { j.secoesVotoAntes8++; caso(turno, s, '1º voto antes das 08:00 de Brasília', `1º voto ${hms(primeiroV - dif)} Brasília`); }
    if (enc !== null && enc - dif < H17) { j.encAntes17++; caso(turno, s, 'encerramento antes das 17:00 de Brasília', `encerramento ${hms(enc - dif)} Brasília`); }
  }
  resultado.turnos[turno] = r;
}

// 3b. Abertura com hora cheia de diferença entre os turnos (mesma seção, relógio da urna)
{
  const difs = {};
  const lista = [];
  for (const [k, x2] of aberturaLocal[2]) {
    const x1 = aberturaLocal[1].get(k);
    if (x1 === undefined) continue;
    const a1 = x1.a, a2 = x2.a;
    const d = Math.round((a2 - a1) / 60);
    const faixa = Math.abs(d) < 15 ? '<15min' : Math.abs(d) < 45 ? '15-44min' : Math.abs(d) <= 75 ? '45-75min' : '>75min';
    inc(difs, faixa);
    // candidato a relógio com 1 h de diferença: um turno abre na trava (até 5 min depois da hora cheia) e o outro abre
    // de 55 a 65 min antes ou depois, também até 5 min depois de uma hora cheia
    const naTrava = (t) => t % 3600 < 300;
    // leitura: no turno que abriu 1 h mais tarde, encerramento também 1 h mais tarde (≥ 18:00 no relógio, na hora do
    // município) aponta relógio 1 h adiantado; encerramento perto das 17:00 aponta só abertura atrasada
    if (Math.abs(Math.abs(d) - 60) <= 5 && naTrava(a1) && naTrava(a2)) {
      const tarde = d > 0 ? x2 : x1, cedo = d > 0 ? x1 : x2;
      const dEnc = tarde.enc !== null && cedo.enc !== null ? Math.round((tarde.enc - cedo.enc) / 60) : null;
      lista.push({ k, a1: hms(a1), a2: hms(a2), enc1: hms(x1.enc), enc2: hms(x2.enc), v1_1: hms(x1.v1), v1_2: hms(x2.v1), difMin: d,
        difEncMin: dEnc, leitura: dEnc === null ? 'sem encerramento' : dEnc >= 45 ? 'encerramento também 1 h depois: relógio adiantado?' : 'só a abertura atrasou' });
    }
  }
  const leituras = {};
  for (const x of lista) inc(leituras, x.leitura);
  resultado.aberturaEntreTurnos = { secoesNosDois: Object.values(difs).reduce((a, b) => a + b, 0), faixas: difs, horaCheiaNasDuasTravas: lista.length, leituras, lista };
  for (const x of lista) {
    const [uf, municipio, zona, secao] = x.k.split('/');
    casos.push({ turno: 0, id: x.k, uf, municipio, zona, secao, tipo: 'abertura com 1 h de diferença entre os turnos, as duas na trava', detalhe: `abertura 1º turno ${x.a1}, 2º turno ${x.a2}; encerramento ${x.enc1} × ${x.enc2}; ${x.leitura}` });
  }
}

// 4. limite externo
try { resultado.recebimento = JSON.parse(await readFile(path.join(BASE, 'recebimento.json'), 'utf8')).turnos; } catch { resultado.recebimento = 'rode seguranca-h20-recebimento.mjs'; }

// 5. voto das seções com anomalia × resto da zona (Presidente, % do 13 sobre 13 + 22), por turno do caso
const { db } = await abrirLeitura();
const voto = { 1: new Map(), 2: new Map() };
const zona = { 1: new Map(), 2: new Map() };
for (const row of db.prepare('SELECT turno, uf, municipio, zona, secao, numero, quantidade FROM voto_oficial WHERE turno IN (1, 2) AND cargo = 1 AND numero IN (13, 22)').iterate()) {
  const k = chaveSecao(row.uf, row.municipio, row.zona, row.secao);
  const v = voto[row.turno].get(k) ?? { v13: 0, v22: 0 };
  if (row.numero === 13) v.v13 += row.quantidade; else v.v22 += row.quantidade;
  voto[row.turno].set(k, v);
  const kz = `${row.uf}/${Number(row.zona)}`;
  const z = zona[row.turno].get(kz) ?? { v13: 0, v22: 0 };
  if (row.numero === 13) z.v13 += row.quantidade; else z.v22 += row.quantidade;
  zona[row.turno].set(kz, z);
}
db.close();
const porTipo = {};
for (const c of casos) {
  const t = c.turno || 2;
  const k = chaveSecao(c.uf, c.municipio, c.zona, c.secao);
  const v = voto[t].get(k), z = zona[t].get(`${c.uf}/${Number(c.zona)}`);
  if (!v || !z) { c.p13 = ''; c.p13zonaSemSecao = ''; continue; }
  const n = v.v13 + v.v22, nz = z.v13 + z.v22 - n;
  c.p13 = n ? +(100 * v.v13 / n).toFixed(2) : '';
  c.p13zonaSemSecao = nz ? +(100 * (z.v13 - v.v13) / nz).toFixed(2) : '';
  const tp = (porTipo[`${t}|${c.tipo}`] ??= { secoes: new Set(), v13: 0, n: 0, esperado13: 0 });
  if (tp.secoes.has(k) || !n || !nz) continue;
  tp.secoes.add(k);
  tp.v13 += v.v13; tp.n += n; tp.esperado13 += n * (z.v13 - v.v13) / nz;
}
resultado.votoDasSecoesComCaso = Object.fromEntries(Object.entries(porTipo).map(([k, x]) => [k, {
  secoes: x.secoes.size, votos13e22: x.n, pct13: x.n ? +(100 * x.v13 / x.n).toFixed(2) : null,
  pct13EsperadoPelaZona: x.n ? +(100 * x.esperado13 / x.n).toFixed(2) : null, excesso13Votos: Math.round(x.v13 - x.esperado13),
}]));
const contaTipos = {};
for (const c of casos) inc(contaTipos, `${c.turno}|${c.tipo}`);
resultado.casosPorTipo = contaTipos;
await writeFile(path.join(BASE, 'resultado.json'), JSON.stringify(resultado, null, 1));
const esc = (x) => `"${String(x ?? '').replace(/"/g, '""')}"`;
await writeFile(path.join(BASE, 'casos.csv'), `turno,uf,municipio,zona,secao,tipo,detalhe,pct13_secao,pct13_zona_sem_secao\n${casos.map((c) => [c.turno, c.uf, c.municipio, c.zona, c.secao, esc(c.tipo), esc(c.detalhe), c.p13, c.p13zonaSemSecao].join(',')).join('\n')}\n`);
console.log(JSON.stringify({ turnos: resultado.turnos, aberturaEntreTurnos: { ...resultado.aberturaEntreTurnos, lista: resultado.aberturaEntreTurnos.lista.slice(0, 20) }, casosPorTipo: contaTipos, votoDasSecoesComCaso: resultado.votoDasSecoesComCaso }, null, 1));
