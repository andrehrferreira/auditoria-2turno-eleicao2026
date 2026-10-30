// Revisor cético, H06, lente "dados e definições": 1º × 2º turno com a MESMA definição (perfis de log, src/perfil-secoes.js).
// Para cada turno: fuso por município pelo próprio turno (hora modal de "Urna pronta" − 8), votos depois de 17h/18h de Brasília,
// encerramento do BU às 19h ou depois (e na janela 19:00–19:09), por UF e por município. O 1º turno tem mais cargos por eleitor
// (fila mais longa), então, se o voto tardio for só fila, o 1º turno deveria ter MAIS, não menos.
// Uso: node scripts/auditoria/cetico-h06-dados-turnos.mjs  → data/parsed/auditoria/cetico/h06-dados-turnos.json
import { createReadStream } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DIR_DADOS } from '../../src/config.js';
import { difRelogioPorSecao, difSecao } from './relogio-fora-do-fuso.mjs';

const destino = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');
const seg = (dt) => Number(dt.slice(9, 11)) * 3600 + Number(dt.slice(11, 13)) * 60 + Number(dt.slice(13, 15));
const R = { geradoEm: new Date().toISOString(), turnos: {} };
const porMunTurno = {};

for (const turno of [1, 2]) {
  const dir = path.join(DIR_DADOS, 'parsed', `${turno}t`, 'perfil');
  const secoes = [];
  for (const arq of (await readdir(dir)).filter((f) => f.endsWith('.jsonl') && !f.includes('erros')).sort()) {
    const uf = arq.slice(0, 2);
    if (uf === 'zz') continue;
    for await (const linha of createInterface({ input: createReadStream(path.join(dir, arq)), crlfDelay: Infinity })) {
      if (!linha) continue;
      const p = JSON.parse(linha);
      const cargos = p.bu.eleicoes.reduce((n, e) => n + e.cargos.length, 0);
      secoes.push({ uf, mun: p.municipio, zona: p.zona, secao: p.secao, enc: p.bu.dataHoraEncerramento, pronta: p.log?.urnaPronta ?? null, porHora: p.log?.votosPorHoraLocal ?? null, votos: p.log?.votosComputados ?? 0, comp: p.bu.qtdEleitoresCompareceram, cargos });
    }
    console.error(`${turno}t ${uf} ${secoes.length}`);
  }
  // Fuso do turno
  const horas = new Map();
  for (const s of secoes) { if (s.pronta === null) continue; const k = `${s.uf}/${s.mun}`; const h = horas.get(k) ?? new Map(); const x = Math.floor(s.pronta / 3600); h.set(x, (h.get(x) ?? 0) + 1); horas.set(k, h); }
  const fuso = new Map([...horas].map(([k, h]) => [k, [...h].sort((a, b) => b[1] - a[1])[0][0] - 8]));
  const T = { secoes: secoes.length, comLogEFuso: 0, votos: 0, votos17: 0, votos18: 0, secoes17: 0, enc19: 0, enc1900a1909: 0, enc1830a1859: 0, cargosMedio: 0, porUf: {}, histEnc10min_bsb: {}, fusoNaoZero: {} };
  for (const [k, d] of fuso) if (d !== 0) T.fusoNaoZero[d] = (T.fusoNaoZero[d] ?? 0) + 1;
  const pm = porMunTurno[turno] = {};
  const relogio = difRelogioPorSecao(turno); // seções com relógio fora da hora do município (linha-do-tempo/07)
  for (const s of secoes) {
    const d = difSecao(relogio, s.uf, s.mun, s.zona, s.secao, fuso.get(`${s.uf}/${s.mun}`));
    const u = T.porUf[s.uf] ??= { secoes: 0, votos: 0, votos17: 0, votos18: 0, enc19: 0, cargos: 0 };
    u.secoes++; u.cargos += s.cargos; T.cargosMedio += s.cargos;
    if (d === undefined || !s.porHora || s.pronta === null) continue;
    T.comLogEFuso++;
    const t17 = s.porHora.slice(17 + d).reduce((a, b) => a + b, 0), t18 = s.porHora.slice(18 + d).reduce((a, b) => a + b, 0);
    const e = seg(s.enc) - d * 3600;
    T.votos += s.votos; T.votos17 += t17; T.votos18 += t18; if (t17) T.secoes17++;
    u.votos += s.votos; u.votos17 += t17; u.votos18 += t18;
    if (e >= 19 * 3600) { T.enc19++; u.enc19++; }
    if (e >= 19 * 3600 && e < 19 * 3600 + 600) T.enc1900a1909++;
    if (e >= 18.5 * 3600 && e < 19 * 3600) T.enc1830a1859++;
    if (e >= 17.5 * 3600) { const b = Math.floor(e / 600) * 600; const kk = `${String(Math.floor(b / 3600)).padStart(2, '0')}:${String((b % 3600) / 60).padStart(2, '0')}`; T.histEnc10min_bsb[kk] = (T.histEnc10min_bsb[kk] ?? 0) + 1; }
    const m = pm[`${s.uf}/${s.mun}`] ??= { secoes: 0, votos: 0, votos17: 0, votos18: 0, enc19: 0 };
    m.secoes++; m.votos += s.votos; m.votos17 += t17; m.votos18 += t18; if (e >= 19 * 3600) m.enc19++;
  }
  T.cargosMedio = +(T.cargosMedio / secoes.length).toFixed(2);
  T.pctVotos17 = +(100 * T.votos17 / T.votos).toFixed(4);
  for (const u of Object.values(T.porUf)) { u.cargos = +(u.cargos / u.secoes).toFixed(2); u.pctVotos17 = u.votos ? +(100 * u.votos17 / u.votos).toFixed(4) : null; }
  T.histEnc10min_bsb = Object.fromEntries(Object.entries(T.histEnc10min_bsb).sort());
  R.turnos[turno] = T;
}
// Mesmos municípios: os que tiveram encerramento às 19h no 2º turno
R.municipios19hNo2t = Object.entries(porMunTurno[2]).filter(([, m]) => m.enc19 >= 20).sort((a, b) => b[1].enc19 - a[1].enc19).slice(0, 25)
  .map(([k, m]) => ({ municipio: k, t2: m, t1: porMunTurno[1][k] ?? 'sem 1º turno nos perfis' }));
await mkdir(destino, { recursive: true });
await writeFile(path.join(destino, 'h06-dados-turnos.json'), JSON.stringify(R, null, 2));
console.log(JSON.stringify(R, null, 1));
