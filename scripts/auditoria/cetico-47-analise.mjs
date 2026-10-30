// Cético revisor, parecer 47 (H20). Consolida a varredura própria (cetico-47-varredura.mjs, os dois turnos) e mede,
// no universo completo:
//   A. cobertura: votos com linha no diário × comparecimento do BU, por seção;
//   B. ordem zerésima → urna pronta → votos → encerramento → BU, pela ordem física (F) e pelo relógio (R), na cópia
//      escolhida e em toda outra cópia que tem voto que a escolhida não tem;
//   C. retrocessos do relógio por classe e por janela (antes da zerésima, zerésima→pronta, votação, depois);
//   D. acertos de relógio (ou tentativas) depois da zerésima do dia;
//   E. relógio deslocado 1 h pelo local de votação: encerramento, zerésima e último voto de cada seção contra a mediana
//      das outras seções do mesmo local (mesmo turno, relógio da urna). Controle positivo: as seções adiantadas já
//      conhecidas. Poder: injeção de −1 h (e +1 h) em cada seção real, respeitando a trava de encerramento;
//   F. folga do recebimento no TSE (dados abertos) − emissão do BU: folga < 60 min exclui relógio 1 h atrasado.
// Uso: node --max-old-space-size=8192 scripts/auditoria/cetico-47-analise.mjs [--sem-receb (teste rápido)]
// Saída: data/parsed/auditoria/cetico-revisor/47/analise.json e candidatos.csv
import { open, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';
import { chaveSecao, difRelogioPorSecao, difSecao } from './relogio-fora-do-fuso.mjs';

const BASE = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '47');
const inc = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };
const hms = (t) => (t === null || t === undefined ? '' : `${t < 0 ? '-' : ''}${String(Math.floor(Math.abs(t) / 3600)).padStart(2, '0')}:${String(Math.floor((Math.abs(t) % 3600) / 60)).padStart(2, '0')}`);
const mediana = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const ADIANTADAS = new Set(['rj/60011/214/279', 'rj/60011/214/22', 'rj/60011/214/24', 'pr/74713/78/261', 'go/92274/119/49', 'sp/71072/280/913']);

// fuso por município (diferença relógio local − Brasília, horas)
const fuso = new Map();
for (const l of (await readFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'tempo', '2t', 'fuso-municipio.csv'), 'utf8')).split(/\r?\n/).slice(1)) {
  if (!l) continue;
  const c = l.split(',');
  if (c[6] !== '') fuso.set(`${c[0]}/${Number(c[1])}`, Number(c[6]));
}
const relogio = { 1: difRelogioPorSecao(1), 2: difRelogioPorSecao(2) };

// recebimento no TSE (dados abertos, _BR.csv, Presidente)
const receb = { 1: new Map(), 2: new Map() };
if (!process.argv.includes('--sem-receb')) {
  const dir = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'detalhe_votacao_secao');
  const nome = (await readdir(dir)).find((n) => /2026\.zip$/.test(n));
  const h = await open(path.join(dir, nome));
  for (const e of (await listarEntradas(h)).filter((x) => /_BR\.csv$/i.test(x.nome))) {
    const buf = await lerEntrada(h, e);
    const fimCab = buf.indexOf(10);
    const col = buf.toString('latin1', 0, fimCab).trim().split(';').map((c) => c.replace(/"/g, ''));
    const i = Object.fromEntries(col.map((c, k) => [c, k]));
    for (let pos = fimCab + 1; pos < buf.length;) {
      let fim = Math.min(buf.length, pos + 64 * 1024 * 1024);
      if (fim < buf.length) fim = buf.indexOf(10, fim) + 1 || buf.length;
      for (const l of buf.toString('latin1', pos, fim).split(/\r?\n/)) {
        if (!l) continue;
        const c = l.split(';').map((x) => x.replace(/"/g, ''));
        if (c[i.CD_CARGO] !== '1') continue;
        const t = Number(c[i.NR_TURNO]);
        if (!receb[t]) continue;
        const m = /(\d\d)\/(\d\d)\/(\d{4}) (\d\d):(\d\d):(\d\d)/.exec(c[i.DT_RECEBIMENTO_BU_HOR_TSE] ?? '');
        if (m) receb[t].set(chaveSecao(c[i.SG_UF], c[i.CD_MUNICIPIO], c[i.NR_ZONA], c[i.NR_SECAO]), Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6]) / 1000);
      }
      pos = fim;
    }
  }
  await h.close();
}

const { db } = await abrirLeitura();
const resultado = { geradoEm: new Date().toISOString(), turnos: {} };
const candidatos = [];

for (const turno of [1, 2]) {
  const dia = turno === 1 ? Date.UTC(2026, 9, 4) / 1000 : Date.UTC(2026, 9, 25) / 1000;
  const bu = new Map();
  for (const s of db.prepare('SELECT uf, municipio, zona, secao, local, comparecimento, encerramento, emissao, tipo_urna FROM secao WHERE turno = ?').iterate(turno)) {
    bu.set(chaveSecao(s.uf, s.municipio, s.zona, s.secao), s);
  }
  const r = {
    secoes: 0, erros: 0, semFluxo: 0, fluxos: 0, fluxosComVoto: 0, votos: 0, votosSoEmOutraCopia: 0, secoesComOutraCopia: 0,
    vOutraData: 0, vOutraDataNoMeio: 0, vOutraSecao: 0,
    cobertura: { comparecimentoBu: 0, votosComLinhaAte: 0, semLinha: 0, secoesComFalta: 0, secoesComExcesso: 0, faltaPorSecao: [] },
    ordem: { vAntesZerF: 0, vAntesZerR: 0, vAntesProntaF: 0, vAntesProntaR: 0, vDepoisEncF: 0, vDepoisEncR: 0, vDepoisBuF: 0, vDepoisBuR: 0,
      zerDepoisProntaF: 0, zerDepoisProntaR: 0, buAntesEncF: 0, vVoltaR: 0,
      fluxosComVotoSemZer: 0, semZerContingencia: 0, semZerSemContingencia: [], fluxosComVotoSemPronta: 0, semPronta: [],
      outrasCopias: { copias: 0, votosNovos: 0, violacoes: 0, semZerNaCopia: 0, votoAntesDaZerDaEscolhidaR: 0 },
      secoesUrnasAoMesmoTempo: [], secoesVotoDepoisDoBuDeOutra: 0,
      semZerCruzado: { fluxos: 0, antesDaZerDaSecaoR: 0, secoesSemNenhumaZer: [], votosEmSecoesSemZer: 0 } },
    retrocessos: { total: 0, classe: {}, dia: {}, janela: {}, votacao: [], zerPronta: [], sem: [] },
    acertos: { fluxosDepoisZer: 0, linhasDepoisZer: 0, mensagens: {}, recusasAdhDepoisZer: { fluxos: 0, secoes: [] }, horaOutra: {} },
    local: {},
  };
  const porLocal = new Map(); // uf/mun/zona/local → [{k, zer, enc, vN, v1, pronta, trava}]
  const dir = path.join(BASE, `${turno}t`);
  for (const nome of (await readdir(dir)).filter((n) => n.endsWith('.jsonl') && n !== 'selecao.jsonl').sort()) {
    for (const linha of (await readFile(path.join(dir, nome), 'utf8')).split('\n')) {
      if (!linha) continue;
      const s = JSON.parse(linha);
      if (s.erro) { r.erros++; continue; }
      r.secoes++;
      const k = chaveSecao(s.uf, s.municipio, s.zona, s.secao);
      const id = `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`;
      if (!s.fluxos.length) r.semFluxo++;
      let votosSec = 0, zer = null, pronta = null, v1 = null, vN = null, enc = null, recusas = 0, contingencia = false, ligada = null;
      const intervalos = [];
      let buSec = null;
      for (const f of s.fluxos) {
        r.fluxos++;
        r.vOutraData += f.vOutraData; r.vOutraDataNoMeio += f.vOutraDataNoMeio; r.vOutraSecao += f.vOutraSecao;
        const o = f.ord, q = r.ordem;
        for (const c of ['vAntesZerF', 'vAntesZerR', 'vAntesProntaF', 'vAntesProntaR', 'vDepoisEncF', 'vDepoisEncR', 'vDepoisBuF', 'vDepoisBuR', 'zerDepoisProntaF', 'zerDepoisProntaR', 'buAntesEncF', 'vVoltaR']) q[c] += o[c];
        if (f.nV) {
          r.fluxosComVoto++; r.votos += f.nV; votosSec += f.nV;
          intervalos.push({ urna: f.urna, a: f.v1[0], b: f.vN[0] });
          if (!f.zer) {
            q.fluxosComVotoSemZer++;
            if (f.contingencia) q.semZerContingencia++;
            else q.semZerSemContingencia.push(`${id} urna ${f.urna} nível ${f.nivel}: ${f.nV} votos ${hms(f.v1[0])}–${hms(f.vN[0])}, pronta ${hms(f.pronta?.[0])}, declaradas ${f.declaradas.join('/')}`);
          }
          if (!f.pronta) { q.fluxosComVotoSemPronta++; q.semPronta.push(`${id} urna ${f.urna}: ${f.nV} votos`); }
        }
        // outras cópias
        for (const g of f.outrasCopias ?? []) {
          q.outrasCopias.copias++; q.outrasCopias.votosNovos += g.novos; r.votosSoEmOutraCopia += g.novos;
          const viol = Object.values(g.ord).reduce((a, b) => a + b, 0);
          q.outrasCopias.violacoes += viol;
          if (!g.zer) q.outrasCopias.semZerNaCopia++;
          if (f.zer && g.v1 && g.v1[0] < f.zer[0]) q.outrasCopias.votoAntesDaZerDaEscolhidaR++;
          if (g.v1) intervalos.push({ urna: `${f.urna}(cópia)`, a: g.v1[0], b: g.vN[0], copia: true });
          votosSec += g.novos;
        }
        if (f.outrasCopias?.length) r.secoesComOutraCopia++;
        // retrocessos
        const R = r.retrocessos;
        for (const [c, n] of Object.entries(f.ret)) { R.total += n; inc(R.classe, c, n); }
        for (const [c, n] of Object.entries(f.retDia)) inc(R.dia, c, n);
        for (const [c, n] of Object.entries(f.retJanela)) inc(R.janela, c, n);
        for (const x of f.exRet) {
          const reg = { id, urna: f.urna, classe: x.classe, dt: x.dt, noDia: x.noDia, viz: x.viz };
          if (x.jan === 'votacao') R.votacao.push(reg);
          else if (x.jan === 'zerPronta') R.zerPronta.push(reg);
          if (x.classe === 'sem') R.sem.push(reg);
        }
        // acertos depois da zerésima
        if (f.acertosDepoisZer) {
          const A = r.acertos;
          let real = 0, recusa = 0;
          for (const e of f.exAcerto) {
            const msg = e.split(' ').slice(3).join(' ');
            const tipo = /não pode ser executado após a impressão da zerésima/.test(msg) ? 'recusa do ADH depois da zerésima (GAP erro 20)' : msg.replace(/\d{2}\/\d{2}\/\d{4}.*$/, '').trim();
            inc(A.mensagens, tipo);
            if (tipo.startsWith('recusa')) recusa++; else real++;
          }
          if (recusa) { A.recusasAdhDepoisZer.fluxos++; if (A.recusasAdhDepoisZer.secoes.length < 400) A.recusasAdhDepoisZer.secoes.push(id); }
          if (real) { A.fluxosDepoisZer++; A.linhasDepoisZer += real; candidatos.push({ turno, id, tipo: 'acerto de relógio depois da zerésima', detalhe: f.exAcerto.join(' | ') }); }
        }
        for (const e of f.exHoraOutra ?? []) inc(r.acertos.horaOutra, e.split(' ').slice(3).join(' ').replace(/\d+/g, 'N').slice(0, 90));
        // seção (cópia escolhida; zerésima também das outras cópias)
        const zs = [f.zer, ...(f.outrasCopias ?? []).map((g) => g.zer)].filter(Boolean).map((x) => x[0]);
        for (const z of zs) if (zer === null || z < zer) zer = z;
        if (f.pronta && (pronta === null || f.pronta[0] < pronta)) pronta = f.pronta[0];
        if (f.v1 && (v1 === null || f.v1[0] < v1)) v1 = f.v1[0];
        if (f.vN && (vN === null || f.vN[0] > vN)) vN = f.vN[0];
        if (f.enc && (enc === null || f.enc[0] > enc)) enc = f.enc[0];
        if (f.bu && (buSec === null || f.bu[0] > buSec.t)) buSec = { t: f.bu[0], urna: f.urna };
        recusas += f.recusas;
        if (f.ligada && (ligada === null || f.ligada[0] < ligada)) ligada = f.ligada[0];
        if (f.contingencia || f.nivel > 0) contingencia = true;
      }
      // urna com voto e sem zerésima própria (contingência): 1º voto contra a zerésima mais cedo da seção (relógio)
      for (const f of s.fluxos) {
        if (!f.nV || f.zer) continue;
        const Z = r.ordem.semZerCruzado;
        Z.fluxos++;
        if (zer === null) continue;
        if (f.v1[0] < zer) Z.antesDaZerDaSecaoR++;
      }
      if (zer === null && votosSec > 0) { r.ordem.semZerCruzado.secoesSemNenhumaZer.push(`${id}: ${votosSec} votos no diário`); r.ordem.semZerCruzado.votosEmSecoesSemZer += votosSec; }
      // duas urnas da seção com votos no mesmo intervalo (relógio); cópias da mesma urna não contam entre si
      const iv = intervalos.filter((x) => !x.copia).sort((a, b) => a.a - b.a);
      for (let i = 1; i < iv.length; i++) if (iv[i].a < iv[i - 1].b) { r.ordem.secoesUrnasAoMesmoTempo.push(`${id}: ${iv[i - 1].urna} ${hms(iv[i - 1].a)}–${hms(iv[i - 1].b)} × ${iv[i].urna} ${hms(iv[i].a)}–${hms(iv[i].b)}`); break; }
      if (buSec && intervalos.some((x) => !x.copia && x.urna !== buSec.urna && x.b > buSec.t)) r.ordem.secoesVotoDepoisDoBuDeOutra++;
      // cobertura × BU
      const b = bu.get(k);
      if (b && b.comparecimento !== null) {
        const C = r.cobertura;
        C.comparecimentoBu += b.comparecimento;
        C.votosComLinhaAte += Math.min(b.comparecimento, votosSec);
        if (b.comparecimento > votosSec) { C.semLinha += b.comparecimento - votosSec; C.secoesComFalta++; C.faltaPorSecao.push(`${id}: BU ${b.comparecimento}, diário ${votosSec}`); }
        if (votosSec > b.comparecimento) { C.secoesComExcesso++; candidatos.push({ turno, id, tipo: 'mais votos no diário que no BU', detalhe: `BU ${b.comparecimento}, diário ${votosSec}` }); }
      }
      // E. por local de votação
      if (b && b.local !== null && b.local !== undefined) {
        const difMun = s.uf === 'zz' ? 0 : fuso.get(`${s.uf}/${Number(s.municipio)}`);
        const kl = `${s.uf}/${Number(s.municipio)}/${Number(s.zona)}/${b.local}`;
        if (!porLocal.has(kl)) porLocal.set(kl, []);
        const rec = receb[turno].get(k);
        const emis = b.emissao ? Date.parse(`${b.emissao.replace(' ', 'T')}Z`) / 1000 : null;
        const difSec = s.uf === 'zz' || difMun === undefined ? null : difSecao(relogio[turno], s.uf, s.municipio, s.zona, s.secao, difMun);
        const dm = difMun ?? 0;
        porLocal.get(kl).push({ k, id, ligada, zer, pronta, v1, vN, enc, recusas, contingencia, travaZer: (7 + dm) * 3600, travaPronta: (8 + dm) * 3600, travaEnc: (17 + dm) * 3600, folga: rec && emis && difSec !== null ? (rec - (emis - difSec * 3600)) / 60 : null, conhecida: relogio[turno].has(k) });
      }
      void dia;
    }
  }
  r.cobertura.faltaPorSecao.sort();
  // E. teste pelo local de votação (relógio da urna; travas da própria urna: zerésima só a partir das 07:00, "urna pronta"
  // a partir das 08:00 e encerramento a partir das 17:00, somada a diferença do fuso do município)
  const L = { secoesComLocal: 0, avaliadas: 0, semDado: 0, localPequeno: 0, limiar: 45 * 60,
    encMais45: 0, encMenos45: 0, zerMais45: 0, zerMenos45: 0, vNMenos45: 0, ligadaMenos45: 0,
    atrasadoFim: 0, atrasadoInicio: 0, atrasadoAmbos: 0, adiantadoCombinado: 0, adiantadoComEspera: 0,
    controlePositivo: {},
    poderAtrasadoMesaPeloRelogioDeFora: { n: 0, enc: 0, fim: 0, inicio: 0, algum: 0, ambos: 0 },
    poderAdiantado: { n: 0, zer: 0, enc: 0, combinado: 0 },
    folgaMenor60: 0, folgaConhecida: 0, folgaNegativa: [], listaAtrasados: [], listaAdiantados: [] };
  const H = L.limiar;
  for (const arr of porLocal.values()) {
    for (const x of arr) {
      L.secoesComLocal++;
      if (x.folga !== null) { L.folgaConhecida++; if (x.folga < 60) L.folgaMenor60++; if (x.folga < 0) L.folgaNegativa.push(`${x.id} ${x.folga.toFixed(2)} min`); }
      if (x.zer === null || x.enc === null || x.vN === null || x.pronta === null) { L.semDado++; continue; }
      const outros = arr.filter((y) => y !== x && y.zer !== null && y.enc !== null && y.vN !== null && y.pronta !== null && !y.conhecida && !ADIANTADAS.has(y.k));
      if (outros.length < 3) { L.localPequeno++; continue; }
      L.avaliadas++;
      const mZ = mediana(outros.map((y) => y.zer)), mE = mediana(outros.map((y) => y.enc)), mV = mediana(outros.map((y) => y.vN));
      const ligs = outros.map((y) => y.ligada).filter((v) => v !== null);
      const mL = ligs.length >= 3 ? mediana(ligs) : null;
      const dZ = x.zer - mZ, dE = x.enc - mE, dV = x.vN - mV, dL = x.ligada !== null && mL !== null ? x.ligada - mL : null;
      if (dE >= H) L.encMais45++;
      if (dE <= -H) L.encMenos45++;
      if (dZ >= H) L.zerMais45++;
      if (dZ <= -H) L.zerMenos45++;
      if (dV <= -H) L.vNMenos45++;
      if (dL !== null && dL <= -H) L.ligadaMenos45++;
      // relógio 1 h atrasado, mesa seguindo um relógio de fora: no fim, último voto ≥ 45 min antes do local e a mesa
      // esperou ≥ 45 min a trava do encerramento (encerrou até 15 min depois dela); no início, urna ligada ≥ 45 min antes
      // do local, zerésima até 10 min depois da trava e "urna pronta" na trava
      const fim = dV <= -H && x.enc - x.vN >= H && x.enc - x.travaEnc < 900;
      const inicio = dL !== null && dL <= -H && x.zer - x.travaZer < 600 && x.pronta - x.travaPronta < 300;
      // relógio 1 h adiantado: zerésima, último voto e encerramento ≥ 45 min depois do local
      const adiantado = dZ >= H && dE >= H && dV >= H;
      // "espera pela hora cheia": urna pronta 8 min ou mais antes de uma hora cheia e 1º voto nos 6 min seguintes a ela
      const horaCheia = Math.ceil(x.pronta / 3600) * 3600;
      const espera = x.v1 !== null && horaCheia - x.pronta >= 8 * 60 && x.v1 >= horaCheia && x.v1 - horaCheia <= 6 * 60;
      const reg = { id: x.id, ligada: hms(x.ligada), medLigada: hms(mL), zer: hms(x.zer), medZer: hms(mZ), pronta: hms(x.pronta), v1: hms(x.v1), vN: hms(x.vN), medVN: hms(mV),
        enc: hms(x.enc), medEnc: hms(mE), espera, recusas: x.recusas, contingencia: x.contingencia, folgaMin: x.folga === null ? null : Math.round(x.folga), outros: outros.length };
      if (fim) L.atrasadoFim++;
      if (inicio) L.atrasadoInicio++;
      if (fim && inicio) L.atrasadoAmbos++;
      if (fim || inicio) { L.listaAtrasados.push({ ...reg, fim, inicio }); candidatos.push({ turno, id: x.id, tipo: `relógio 1 h atrasado? (local; ${fim ? 'fim' : ''}${fim && inicio ? '+' : ''}${inicio ? 'início' : ''})`, detalhe: JSON.stringify(reg) }); }
      if (adiantado) {
        L.adiantadoCombinado++;
        if (espera) L.adiantadoComEspera++;
        L.listaAdiantados.push({ ...reg, conhecida: ADIANTADAS.has(x.k) || x.conhecida });
        candidatos.push({ turno, id: x.id, tipo: `relógio 1 h adiantado? (local${espera ? '; espera pela hora cheia' : ''})`, detalhe: JSON.stringify(reg) });
      }
      if (ADIANTADAS.has(x.k) || x.conhecida) L.controlePositivo[x.id] = { ...reg, dZmin: Math.round(dZ / 60), dEmin: Math.round(dE / 60), dVmin: Math.round(dV / 60), detectada: adiantado };
      // poder por injeção, na própria seção: −1 h com a mesa seguindo um relógio de fora (as travas seguram zerésima,
      // abertura e encerramento) e +1 h
      const P = L.poderAtrasadoMesaPeloRelogioDeFora;
      P.n++;
      const lA = x.ligada !== null ? x.ligada - 3600 : null, zA = Math.max(x.zer - 3600, x.travaZer), prA = Math.max(x.pronta - 3600, x.travaPronta);
      const vA = x.vN - 3600, eA = Math.max(x.enc - 3600, x.travaEnc);
      const pE = eA - mE <= -H;
      const pF = vA - mV <= -H && eA - vA >= H && eA - x.travaEnc < 900;
      const pI = lA !== null && mL !== null && lA - mL <= -H && zA - x.travaZer < 600 && prA - x.travaPronta < 300;
      if (pE) P.enc++;
      if (pF) P.fim++;
      if (pI) P.inicio++;
      if (pF || pI) P.algum++;
      if (pF && pI) P.ambos++;
      const D = L.poderAdiantado;
      D.n++;
      if (x.zer + 3600 - mZ >= H) D.zer++;
      if (x.enc + 3600 - mE >= H) D.enc++;
      if (x.zer + 3600 - mZ >= H && x.enc + 3600 - mE >= H && x.vN + 3600 - mV >= H) D.combinado++;
    }
  }
  L.listaAtrasados.sort((a, b) => a.id.localeCompare(b.id));
  r.local = L;
  resultado.turnos[turno] = r;
}
db.close();
await writeFile(path.join(BASE, 'analise.json'), JSON.stringify(resultado, null, 1));
const esc = (x) => `"${String(x ?? '').replace(/"/g, '""')}"`;
await writeFile(path.join(BASE, 'candidatos.csv'), `turno,secao,tipo,detalhe\n${candidatos.map((c) => [c.turno, c.id, esc(c.tipo), esc(c.detalhe)].join(',')).join('\n')}\n`);
for (const t of [1, 2]) {
  const r = resultado.turnos[t];
  const { retrocessos: R, local: L, ...resto } = r;
  console.log(`\n===== TURNO ${t}`);
  console.log(JSON.stringify({ ...resto, cobertura: { ...r.cobertura, faltaPorSecao: r.cobertura.faltaPorSecao.slice(0, 20) }, acertos: { ...r.acertos, recusasAdhDepoisZer: { fluxos: r.acertos.recusasAdhDepoisZer.fluxos, secoes: r.acertos.recusasAdhDepoisZer.secoes.slice(0, 30) } } }, null, 1));
  console.log('RETROCESSOS', JSON.stringify({ total: R.total, classe: R.classe, dia: R.dia, janela: R.janela, nVotacao: R.votacao.length, nZerPronta: R.zerPronta.length, nSem: R.sem.length }));
  for (const x of [...R.votacao, ...R.zerPronta, ...R.sem].slice(0, 60)) console.log(` ${x.classe} ${x.id} ${x.urna} dt=${x.dt} dia=${x.noDia}\n    ${x.viz.join('\n    ')}`);
  console.log('LOCAL', JSON.stringify({ ...L, listaAtrasados: L.listaAtrasados.slice(0, 40), listaAdiantados: L.listaAdiantados.slice(0, 40) }, null, 1));
}
