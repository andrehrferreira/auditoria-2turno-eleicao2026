// Engenheiro de segurança, fechamento da H20 (docs/analysis/engenheiro-seguranca-urna/13), item (a): relógio errado
// confirmado ou não SÓ PELOS DIÁRIOS, por causalidade física entre urnas que usaram a MESMA mídia.
//
// Princípio: uma mídia física (cartão de carga, mídia de votação MV, mídia de resultado MR) só está numa urna de cada
// vez. Se a urna-alvo T e outra urna O registram a mesma mídia (pelo identificador/serial gravado no diário), os
// intervalos em que cada uma a usou não podem se sobrepor em hora real. Com o relógio de O como referência, procura-se
// o deslocamento δ (hora real = relógio de T + δ) que deixa todos os usos de T sem sobreposição com os de O.
// Se δ = 0 é impossível e só δ perto de ±60 min é possível, o relógio errado de T é Fato pelo próprio diário.
//
// Intervalo de uso (conservador):
//   - cartão de carga ("Identificador da mídia de carga: X"): o boot inteiro da carga (a urna parte dele);
//   - MV ("Serial da MV: X"): o boot inteiro (a urna roda o aplicativo da MV e grava nela);
//   - MR ("Número de série da MR: X"): da 1ª à última linha do boot que cita a mídia.
// Conflito só conta se resiste a um erro de até --tolerancia minutos (padrão 5) em qualquer das duas urnas.
// Acerto de relógio dentro de um boot ("Data e hora atualizada", "Ajuste de Data e Hora") leva o que veio antes no
// mesmo boot para o referencial novo. Acertos em boots posteriores da urna-alvo são listados: o δ medido vale para o
// referencial do boot em que a mídia foi usada.
// Restrição extra: quando T arquiva o diário da ME ("… referente ao log da ME"), a última linha de outra urna nesse
// diário arquivado tem de ser anterior ao arquivamento (δ ≥ última linha de O − arquivamento).
// A referência O é conferida: zerésima e "Urna pronta" de O no dia de votação contra a mediana das urnas da zona.
//
// Lê todos os pacotes da zona da seção-alvo nos dois turnos (data/raw/1t e 2t). Sequências de 9+ dígitos viram '#'.
// Uso: node scripts/auditoria/seguranca-fechamento-h20-midia.mjs --secao ba/34134/0171/0166 [--turno 2] [--urna 01658717]
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { values } = parseArgs({ options: { secao: { type: 'string' }, turno: { type: 'string' }, urna: { type: 'string' }, tolerancia: { type: 'string', default: '5' } } });
const TOL = Number(values.tolerancia) * 60; // sobreposição até TOL segundos é tolerada (hora digitada em minutos, deriva)
const [UF, MUN, ZONA, SEC] = values.secao.split('/');
const DIAS = { 1: '04/10/2026', 2: '25/10/2026' };
const NL = String.fromCharCode(10), CR = String.fromCharCode(13), TAB = String.fromCharCode(9);
const mem = (b) => ({ read: async (d, o, n, p) => ({ bytesRead: b.copy(d, o, p, p + n) }), stat: async () => ({ size: b.length }) });
const seg = (dh) => Date.UTC(+dh.slice(6, 10), +dh.slice(3, 5) - 1, +dh.slice(0, 2), +dh.slice(11, 13), +dh.slice(14, 16), +dh.slice(17, 19)) / 1000;
const hm = (s) => new Date(s * 1000).toISOString().slice(0, 19).replace('T', ' ');
const sub = async (d) => { try { return (await readdir(d, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort(); } catch { return []; } };

async function textos(buf, prof = 0) {
  const out = [];
  for (const e of await listarEntradas(mem(buf))) {
    const d = await lerEntrada(mem(buf), e);
    if (e.nome === 'logd.dat') out.push({ prof, t: d.toString('latin1') });
    else if (e.nome.endsWith('.jez') && prof < 4) out.push(...(await textos(d, prof + 1)));
  }
  return out;
}
function linhas(t) {
  const out = [];
  for (let l of t.split(NL)) {
    if (l.endsWith(CR)) l = l.slice(0, -1);
    const c = l.split(TAB);
    if (c.length < 5 || c[0].length !== 19 || c[0][2] !== '/') continue;
    out.push(c);
  }
  return out;
}

// ---- leitura da zona
const boots = new Map(); // `${urna}|${início}` → boot (a cópia com mais linhas)
const arquivamentos = []; // { urna, quando, ultimas: [Map(urna → seg)] }
const diaUrna = new Map(); // `${turno}|${urna}` → { secao, zer, pronta, votos }
let pacotesLidos = 0;
for (const turno of [1, 2]) {
  const zdir = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', UF, MUN, ZONA);
  for (const sec of await sub(zdir)) {
    for (const h of await sub(path.join(zdir, sec))) {
      const nomes = await readdir(path.join(zdir, sec, h));
      const log = acharArquivo(nomes, 'log');
      if (!log) continue;
      pacotesLidos++;
      const txs = (await textos(await readFile(path.join(zdir, sec, h, log)))).map((tx) => ({ ...tx, L: linhas(tx.t) }));
      const ultimaPorTexto = txs.map((tx) => {
        const m = new Map();
        for (const c of tx.L) { const s = seg(c[0]); if (!m.has(c[2]) || s > m.get(c[2])) m.set(c[2], s); }
        return { prof: tx.prof, m };
      });
      for (const tx of txs) {
        const cur = new Map();
        const secDecl = new Map();
        const ant = new Map();
        const porTexto = [];
        for (const [dh, , urna, app, msg] of tx.L) {
          const s = seg(dh);
          let b = cur.get(urna);
          if (!b || (app === 'LOGD' && msg.startsWith('Início das operações do logd'))) {
            b = { urna, inicio: s, inicioTxt: dh, fim: s, midias: new Map(), linhas: 0, ajustes: [] };
            porTexto.push(b);
            cur.set(urna, b);
          }
          b.linhas++;
          if ((msg === 'Data e hora atualizada' || msg.startsWith('Ajuste de Data e Hora')) && ant.has(urna)) {
            const off = s - ant.get(urna);
            if (Math.abs(off) > 120) {
              b.inicio += off; b.fim += off;
              for (const u of b.midias.values()) { u.primeiro += off; u.ultimo += off; }
              b.ajustes.push(Math.round(off / 60));
            }
          }
          ant.set(urna, s);
          if (s > b.fim) b.fim = s;
          let id = null, tipo = null;
          if (msg.startsWith('Identificador da mídia de carga: ')) { tipo = 'carga'; id = msg.slice(33).trim(); }
          else if (msg.startsWith('Serial da MV: ')) { tipo = 'MV'; id = msg.slice(14).trim(); }
          else if (msg.startsWith('Número de série da MR: ')) { tipo = 'MR'; id = msg.slice(23).trim(); }
          if (id) {
            const k = `${tipo}:${id}`;
            const u = b.midias.get(k) ?? { primeiro: s, ultimo: s };
            u.primeiro = Math.min(u.primeiro, s); u.ultimo = Math.max(u.ultimo, s);
            b.midias.set(k, u);
          }
          const sd = /^Seção Eleitoral: (\d+)/.exec(msg);
          if (sd) secDecl.set(urna, sd[1]);
          for (const t of [1, 2]) {
            if (dh.slice(0, 10) !== DIAS[t]) continue;
            const kk = `${t}|${urna}`;
            const d = diaUrna.get(kk) ?? { secao: null, zer: null, pronta: null, votos: 0, ligada: s };
            if (s < d.ligada) d.ligada = s;
            if (secDecl.has(urna)) d.secao = secDecl.get(urna);
            if (msg.startsWith('Imprimindo relatório [ZERÉSIMA]') && d.zer === null) d.zer = s;
            if (msg.startsWith('Urna pronta para receber votos') && d.pronta === null) d.pronta = s;
            if (msg === 'O voto do eleitor foi computado') d.votos++; // só para achar a urna que votou
            diaUrna.set(kk, d);
          }
          if (app === 'LOGD' && msg.includes('referente ao log da ME')) {
            arquivamentos.push({ urna, quando: s, ultimas: ultimaPorTexto.filter((x) => x.prof === tx.prof + 1).map((x) => x.m) });
          }
        }
        for (const b of porTexto) {
          const k = `${b.urna}|${b.inicioTxt}`;
          if (!boots.has(k) || boots.get(k).linhas < b.linhas) boots.set(k, b);
        }
      }
    }
  }
}

// ---- urnas-alvo: as que votaram no dia na seção-alvo
const turnos = values.turno ? [Number(values.turno)] : [1, 2];
const alvos = [];
for (const [k, d] of diaUrna) {
  const [t, urna] = k.split('|');
  if (turnos.includes(+t) && d.secao === SEC && d.votos > 0 && (!values.urna || values.urna === urna)) alvos.push({ turno: +t, urna, ...d });
}
const minDia = (s) => (((s % 86400) + 86400) % 86400) / 60;
const med = (a) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : null; };
const mediana = {};
for (const t of [1, 2]) {
  const ds = [...diaUrna.entries()].filter(([k, d]) => k.startsWith(`${t}|`) && d.votos > 0).map(([, d]) => d);
  const r = (x) => (x === null ? null : Math.round(x));
  mediana[t] = { ligada: r(med(ds.map((d) => minDia(d.ligada)))), zer: r(med(ds.filter((d) => d.zer !== null).map((d) => minDia(d.zer)))), pronta: r(med(ds.filter((d) => d.pronta !== null).map((d) => minDia(d.pronta)))), urnasComVoto: ds.length };
}
const desvioRef = (urna) => {
  const out = {};
  for (const t of [1, 2]) {
    const d = diaUrna.get(`${t}|${urna}`);
    if (d && d.votos > 0) out[`${t}t`] = { ligada: Math.round(minDia(d.ligada) - mediana[t].ligada), pronta: d.pronta !== null ? Math.round(minDia(d.pronta) - mediana[t].pronta) : null, zer: d.zer !== null ? Math.round(minDia(d.zer) - mediana[t].zer) : null };
  }
  return out;
};

/** Conflito robusto: [a,b] e [c,d] se cruzam mesmo que um deles ande até TOL para qualquer lado. */
const sobrepoe = (a, b, c, d) => c + TOL <= b && a <= d - TOL;

// ---- controle: entre pares de OUTRAS urnas da zona que usaram a mesma mídia, quantos se sobrepõem (identificador
// que não é de uma mídia física única, ou relógio errado nelas)?
const controle = {};
{
  const porMidia = new Map();
  for (const b of boots.values()) for (const [mk, u] of b.midias) {
    const iv = mk.startsWith('MR:') ? [u.primeiro, u.ultimo] : [b.inicio, b.fim];
    if (!porMidia.has(mk)) porMidia.set(mk, []);
    porMidia.get(mk).push({ urna: b.urna, iv });
  }
  for (const [mk, L] of porMidia) {
    const tipo = mk.split(':')[0];
    const c = (controle[tipo] ??= { pares: 0, sobrepostos: 0 });
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      if (L[i].urna === L[j].urna) continue;
      c.pares++;
      if (sobrepoe(L[i].iv[0], L[i].iv[1], L[j].iv[0], L[j].iv[1])) c.sobrepostos++;
    }
  }
}
const fmtMin = (x) => `${x >= 0 ? '+' : ''}${x} min`;
const resultado = { secao: values.secao, toleranciaMin: TOL / 60, pacotesLidosDaZona: pacotesLidos, medianaZonaMinutosDoDia: mediana, controleParesDeOutrasUrnas: controle, alvos: [] };
for (const A of alvos) {
  const meus = [...boots.values()].filter((b) => b.urna === A.urna).sort((a, b) => a.inicio - b.inicio);
  const restricoes = [];
  for (const b of meus) {
    for (const [mk, u] of b.midias) {
      const ti = mk.startsWith('MR:') ? [u.primeiro, u.ultimo] : [b.inicio, b.fim];
      for (const o of boots.values()) {
        if (o.urna === A.urna) continue;
        const uo = o.midias.get(mk);
        if (!uo) continue;
        const oi = mk.startsWith('MR:') ? [uo.primeiro, uo.ultimo] : [o.inicio, o.fim];
        restricoes.push({ midia: mk, outra: o.urna, Ti: ti, Oi: oi, bootAlvo: b.inicioTxt });
      }
    }
  }
  const limites = [];
  for (const ar of arquivamentos.filter((x) => x.urna === A.urna)) {
    for (const m of ar.ultimas) for (const [o, ult] of m) if (o !== A.urna) limites.push({ outra: o, deltaMin: +((ult - ar.quando) / 60).toFixed(1), arquivamento: hm(ar.quando), ultimaLinhaDaOutra: hm(ult) });
  }
  const viaveis = [];
  for (let dmin = -240; dmin <= 240; dmin++) {
    const d = dmin * 60;
    let ok = true;
    for (const r of restricoes) if (sobrepoe(r.Ti[0] + d, r.Ti[1] + d, r.Oi[0], r.Oi[1])) { ok = false; break; }
    if (ok) for (const l of limites) if (dmin < l.deltaMin) { ok = false; break; }
    if (ok) viaveis.push(dmin);
  }
  const faixas = [];
  for (const v of viaveis) { const f = faixas.at(-1); if (f && v === f[1] + 1) f[1] = v; else faixas.push([v, v]); }
  const contraZero = restricoes.filter((r) => sobrepoe(r.Ti[0], r.Ti[1], r.Oi[0], r.Oi[1])).map((r) => ({ midia: r.midia, outra: r.outra, usoAlvo: `${hm(r.Ti[0])} a ${hm(r.Ti[1])}`, usoOutra: `${hm(r.Oi[0])} a ${hm(r.Oi[1])}`, referenciaDaOutra: desvioRef(r.outra), acertosDaOutra: [...boots.values()].filter((b) => b.urna === r.outra && b.ajustes.length).map((b) => `${b.inicioTxt}: ${b.ajustes.join(',')} min`) }));
  const outras = [...new Set(restricoes.map((r) => r.outra))];
  resultado.alvos.push({
    turno: A.turno, urna: A.urna, votosNoDia: A.votos, zeresimaAlvo: A.zer !== null ? hm(A.zer) : null, prontaAlvo: A.pronta !== null ? hm(A.pronta) : null,
    desvioDoAlvoContraAMedianaDaZona: desvioRef(A.urna),
    acertosDeRelogioDoAlvo: meus.filter((b) => b.ajustes.length).map((b) => ({ boot: b.inicioTxt, minutos: b.ajustes })),
    restricoes: restricoes.length, midiasUsadas: [...new Set(restricoes.map((r) => r.midia.split(':')[0]))], outrasUrnas: outras.length,
    arquivamentos: limites.slice(0, 12),
    deltaZeroPossivel: viaveis.includes(0), faixasPossiveisDeDelta: faixas.map(([a, b]) => `${fmtMin(a)} a ${fmtMin(b)}`),
    restricoesQueImpedemDeltaZero: contraZero.slice(0, 25),
  });
}
console.log(JSON.stringify(resultado, null, 1).replace(/\d{9,}/g, '#'));
