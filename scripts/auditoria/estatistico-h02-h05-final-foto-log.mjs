// Estatístico eleitoral, doc 30 (plano 29, commit 45dc471), H02(a)–(b), parte do diário:
//  1. conferência independente da foto: relê, pelo caminho de cetico-b1a-log.mjs (lerLogs de src/perfil-secoes.js, ciclo
//     reiniciado em "Aguardando digitação do identificador do eleitor"), o diário de TODAS as seções com excesso nos dois
//     turnos e compara V2 e V2 com foto, seção a seção, com o arquivo do horário (foto-secoes-<t>t.jsonl) e com o sb do BU;
//  2. testes de forma do resíduo (seções com E′ > 0 nas zonas que passam no corte de Bonferroni, mais SP 65110/0211):
//     persistência entre turnos, ritmo dos V2 sem foto (sequência, rajada em 10 min, última hora) pelo leitor de
//     estatistico-h02-h05-final-diario.mjs, e desvio de comparecimento e de voto contra a própria zona (z por mediana e MAD).
// Uso: node --max-old-space-size=6144 scripts/auditoria/estatistico-h02-h05-final-foto-log.mjs
// Saída: data/parsed/auditoria/estatistico-eleitoral/h02-h05-final/foto-log.json
import { createReadStream } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DIR_DADOS } from '../../src/config.js';
import { DIA_VOTACAO, lerLogs } from '../../src/perfil-secoes.js';
import { lerCiclos } from './estatistico-h02-h05-final-diario.mjs';
import { filtrar, lerPares, zBilateral } from './estatistico-lib.mjs';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico-eleitoral', 'h02-h05-final');
const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const r4 = (x) => (Number.isFinite(x) ? Math.round(x * 10000) / 10000 : null);
const r2 = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : null);
async function* linhas(arq) { for await (const l of createInterface({ input: createReadStream(arq), crlfDelay: Infinity })) if (l) yield l; }
const sub = async (d) => (await readdir(d, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);

// caminho do cético 01: lerLogs por arquivo de log da seção, ciclo do cetico-b1a-log.mjs
async function v2Foto(turno, k) {
  const [uf, mun, zona, secao] = k.split('/');
  const dir = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', uf, mun, zona, secao);
  let V2 = 0, F = 0, pede = 0;
  const vistos = new Set();
  for (const h of await sub(dir)) {
    const log = (await readdir(path.join(dir, h))).find((n) => n.endsWith('-log.jez'));
    if (!log) continue;
    const { texto } = await lerLogs(path.join(dir, h, log), secao);
    if (vistos.has(texto)) continue; vistos.add(texto);
    let ciclo = [];
    for (const linha of texto.split('\n')) {
      const [dataHora, , , , msg = ''] = linha.split('\t');
      if (!dataHora?.startsWith(DIA_VOTACAO[turno])) continue;
      if (msg === 'Aguardando digitação do identificador do eleitor') { ciclo = []; continue; }
      ciclo.push(msg);
      if (msg !== 'O voto do eleitor foi computado') continue;
      const bio = ciclo.some((m) => m.includes('Tipo de habilitação do eleitor [biométrica]'));
      const ano = ciclo.some((m) => m.startsWith('Ano de nascimento digitado é igual ao do cadastro'));
      if (!bio && ano) { V2++; if (ciclo.includes('Foto do eleitor apresentada')) F++; if (ciclo.some((m) => m.startsWith('Solicita digital'))) pede++; }
      ciclo = [];
    }
  }
  return { V2, F, pede };
}

const res = { geradoEm: new Date().toISOString(), plano: '29 (45dc471)', conferencia: {}, forma: {} };
const porTurno = {};
for (const t of [1, 2]) {
  const sec = [];
  for await (const l of linhas(path.join(SAIDA, `foto-secoes-${t}t.jsonl`))) sec.push(JSON.parse(l));
  porTurno[t] = new Map(sec.map((x) => [x.k, x]));
  const C = { secoes: sec.length, V2igualHorario: 0, FigualHorario: 0, V2igualBU: 0, difere: [], erros: 0, somaV2: 0, somaF: 0, somaFhorario: 0, pedeDigital: 0, somaElinhaReleitura: 0 };
  let i = 0;
  for (const x of sec) {
    try {
      const r = await v2Foto(t, x.k);
      C.somaV2 += r.V2; C.somaF += r.F; C.somaFhorario += x.F ?? 0; C.pedeDigital += r.pede;
      if (r.V2 === x.V2) C.V2igualHorario++;
      if (r.F === x.F) C.FigualHorario++;
      if (r.V2 === x.sb) C.V2igualBU++;
      C.somaElinhaReleitura += Math.max(0, (x.sb - r.F) - x.S - x.folga);
      if (r.V2 !== x.V2 || r.F !== x.F) C.difere.push({ k: x.k, V2: r.V2, F: r.F, V2horario: x.V2, Fhorario: x.F, sb: x.sb });
    } catch (e) { C.erros++; C.difere.push({ k: x.k, erro: e.message }); }
    if (++i % 4000 === 0) log(`turno ${t}: ${i}/${sec.length}`);
  }
  C.parcelaDifere = r4(C.difere.length / sec.length);
  C.difere = C.difere.slice(0, 50);
  res.conferencia[`${t}t`] = C;
  log(`turno ${t}: V2 igual ${C.V2igualHorario}/${sec.length}, foto igual ${C.FigualHorario}; ΣE′ pela releitura ${C.somaElinhaReleitura}`);
}

// ---------- testes de forma ----------
const foto = JSON.parse(await (await import('node:fs/promises')).readFile(path.join(SAIDA, 'foto.json'), 'utf8'));
const alvo = [];
for await (const l of linhas(path.join(SAIDA, 'foto-residuo-alvo.jsonl'))) alvo.push(JSON.parse(l));
// zonas que passam (Poisson, Bonferroni) por turno
const passa = {};
for (const t of [1, 2]) {
  const csv = (await (await import('node:fs/promises')).readFile(path.join(SAIDA, `foto-zonas-${t}t.csv`), 'utf8')).split('\n').filter(Boolean);
  const cab = csv[0].split(';'); const iz = cab.indexOf('zona'), ip = cab.indexOf('p');
  passa[t] = new Set(csv.slice(1).map((l) => l.split(';')).filter((c) => Number(c[ip]) < foto.turnos[`${t}t`].concentracao.corteBonferroni).map((c) => c[iz]));
}
// pares para z robusto por zona (uf|zona): variação de comparecimento, parcela do 13 no 2º turno e sua variação
const todos = await lerPares('banco');
const { P } = filtrar(todos);
const porZona = new Map();
for (const s of P) {
  s.k = `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`;
  s.mDc = s.c2 / s.a2 - s.c1 / s.a1; s.mS2 = s.s2; s.mDs = s.s2 != null && s.s1 != null ? s.s2 - s.s1 : null;
  if (!porZona.has(s.zon)) porZona.set(s.zon, []); porZona.get(s.zon).push(s);
}
const pk = new Map(P.map((s) => [s.k, s]));
const medMad = (v) => { const o = v.filter(Number.isFinite).sort((a, b) => a - b); if (o.length < 5) return null; const m = o[Math.floor(o.length / 2)]; const d = o.map((x) => Math.abs(x - m)).sort((a, b) => a - b); return { m, mad: 1.4826 * d[Math.floor(d.length / 2)] }; };
const zRob = (s, campo) => { const outros = porZona.get(s.zon).filter((o) => o !== s).map((o) => o[campo]); const mm = medMad(outros); if (!mm || !mm.mad || !Number.isFinite(s[campo])) return null; return (s[campo] - mm.m) / mm.mad; };

const exam = alvo.filter((x) => passa[x.turno].has(x.zona) || x.zona === 'sp/65110/0211');
const nTestes = exam.length * 3;
const corte = zBilateral(0.05 / nTestes);
const linhasForma = [];
for (const x of exam) {
  const outro = porTurno[x.turno === 1 ? 2 : 1].get(x.k);
  const [uf, mun, zona, secao] = x.k.split('/');
  const d = await lerCiclos(x.turno, uf, mun, zona, secao);
  let seq = 0, maxSeq = 0; const tSemFoto = [];
  const porUrna = new Map();
  for (const c of d.ciclos) { if (!porUrna.has(c.urna)) porUrna.set(c.urna, []); porUrna.get(c.urna).push(c); }
  for (const cs of porUrna.values()) { seq = 0; for (const c of cs) { if (c.via === 'v2' && !c.foto) { seq++; maxSeq = Math.max(maxSeq, seq); tSemFoto.push(c.t); } else seq = 0; } }
  tSemFoto.sort((a, b) => a - b);
  let raj = 0; for (let i = 0, j = 0; i < tSemFoto.length; i++) { while (tSemFoto[i] - tSemFoto[j] > 600) j++; raj = Math.max(raj, i - j + 1); }
  const enc = Math.max(...Object.values(d.encerramento), -Infinity);
  const ultima = (f) => (Number.isFinite(enc) ? d.ciclos.filter((c) => f(c) && c.t >= enc - 3600 && c.t <= enc).length : null);
  const nV1 = d.ciclos.filter((c) => c.via === 'v1').length;
  const s = pk.get(x.k);
  const z = s ? { comparecimento: zRob(s, 'mDc'), parcela13_2t: zRob(s, 'mS2'), variacao13: zRob(s, 'mDs') } : null;
  const desvio = z ? Object.values(z).some((v) => v != null && Math.abs(v) >= corte) : false;
  linhasForma.push({ turno: x.turno, k: x.k, zona: x.zona, Elinha: x.Elinha, E: x.E, V2: x.V2, F: x.F, residuoNoOutroTurno: (outro?.Elinha ?? 0) > 0, excessoNoOutroTurno: (outro?.E ?? 0) > 0,
    v2SemFoto: tSemFoto.length, maiorSequenciaV2SemFoto: maxSeq, rajada10V2SemFoto: raj,
    ultimaHora: { v2SemFoto: ultima((c) => c.via === 'v2' && !c.foto), v1: ultima((c) => c.via === 'v1'), votos: ultima(() => true) }, votos: d.ciclos.length, v1: nV1,
    z: z && Object.fromEntries(Object.entries(z).map(([a, b]) => [a, r2(b)])), desvio, sequencia5: maxSeq >= 5 });
}
const persist = linhasForma.filter((l) => l.residuoNoOutroTurno).length;
const pede = linhasForma.filter((l) => l.sequencia5 && l.desvio);
const somaUlt = (f) => linhasForma.reduce((a, l) => a + (l.ultimaHora[f] ?? 0), 0);
res.forma = {
  zonasQuePassam: { '1t': [...passa[1]], '2t': [...passa[2]] }, secoesTurnoExaminadas: exam.length, testesDesvio: nTestes, corteZ: r2(corte),
  persistencia: { comResiduoNoOutroTurno: persist, parcela: r4(persist / exam.length), comExcessoNoOutroTurno: linhasForma.filter((l) => l.excessoNoOutroTurno).length },
  sequencia5ouMais: linhasForma.filter((l) => l.sequencia5).length, comDesvio: linhasForma.filter((l) => l.desvio).length, pedeExplicacao: pede.map((l) => `${l.turno}t ${l.k}`),
  maiorSequencia: Math.max(...linhasForma.map((l) => l.maiorSequenciaV2SemFoto)), maiorRajada10: Math.max(...linhasForma.map((l) => l.rajada10V2SemFoto)),
  ultimaHora: { v2SemFoto: somaUlt('v2SemFoto'), totalV2SemFoto: linhasForma.reduce((a, l) => a + l.v2SemFoto, 0), votos: somaUlt('votos'), totalVotos: linhasForma.reduce((a, l) => a + l.votos, 0) },
  leitura: null, secoes: linhasForma,
};
const f = res.forma;
f.leitura = f.persistencia.parcela >= 0.8 && pede.length === 0 ? 'propriedade do arquivo' : pede.length ? 'pede explicação' : 'indeterminado';
await writeFile(path.join(SAIDA, 'foto-log.json'), JSON.stringify(res, null, 1));
const { secoes, ...curto } = res.forma;
console.log(JSON.stringify({ conferencia: res.conferencia, forma: curto }, null, 1));
log('fim');
