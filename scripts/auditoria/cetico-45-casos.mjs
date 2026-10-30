// Cético, parecer 45 (H19): os 10 casos de maior peso do sinal do Sudeste (S↑), lidos no diário bruto da urna dos dois turnos.
// Lista: as 10 primeiras linhas de data/parsed/auditoria/estatistico/h19/sudeste-sup.csv (ordenadas pela diferença de ΔY
// contra os pares do prédio, a mesma ordem do "sem as 10 de maior peso").
// Para cada seção e turno (dia da votação), ciclo a ciclo de eleitor que termina em voto:
//   - classe: biometria, ano de nascimento (sem biometria cadastrada), falha liberada por mesário identificado,
//     falha liberada por digital nova (não associada; "vai salvar a digital em novo arquivo"),
//     falha liberada por digital já gravada (não associada; "bate com uma digital gravada");
//   - hora do voto, tentativas, timeouts de captura, duração das 4 tentativas, urna (número interno) da linha;
//   - mesário que liberou: rótulo M1, M2… por ordem de aparição (o título não é gravado nem impresso).
// Medidas: falhas por hora; maior sequência de falhas seguidas; teste de sequências (runs) biometria × falha (z < −3 = falhas em
// blocos); fração das falhas com o eleitor anterior e o seguinte reconhecidos na 1ª tentativa; tentativas médias dos
// reconhecidos por hora; distribuição das liberações por mesário; quantas urnas gravaram votos no dia.
// Fonte: pacote do 2º turno (o log é cumulativo e traz o 1º turno quando a urna é a mesma); se o 1º turno não aparece
// nele ou não bate com o BU, lê o pacote do 1º turno. Mesmo leitor de .jez da auditoria (src/perfil-secoes.js, lerLogs).
// Uso: node scripts/auditoria/cetico-45-casos.mjs [--n 10] [--ids uf/mun/zona/secao,... --saida outros.json]
// Saída: data/parsed/auditoria/cetico/45/casos.json
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerLogs } from '../../src/perfil-secoes.js';

const { values } = parseArgs({ options: { n: { type: 'string', default: '10' }, ids: { type: 'string' }, saida: { type: 'string', default: 'casos.json' } } });
const DIR_H19 = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h19');
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', '45');
const DIA = { 1: '04/10/2026', 2: '25/10/2026' };
const RE_TENT = /^Solicita digital\. Tentativa \[(\d+)\] de \[(\d+)\]/;
const RE_MES = /^Mesário (\d+) habilitou o eleitor/;

const csv = (await readFile(path.join(DIR_H19, 'sudeste-sup.csv'), 'utf8')).trim().split('\n');
const cab = csv[0].split(';');
const casos = values.ids ? values.ids.split(',').map((id) => ({ id, saltoFpp: NaN, zOd: NaN, dyContraPares: NaN, padraoA: NaN }))
  : csv.slice(1, 1 + Number(values.n)).map((l) => Object.fromEntries(l.split(';').map((v, i) => [cab[i], v])));

const { db } = await abrirLeitura();
const qSec = db.prepare(`SELECT hash, numero_interno_urna urna, modelo_urna modelo, tipo_urna tipo, comparecimento c, por_biometria pb,
  por_biografia pg, sem_biometria sb, local FROM secao WHERE turno = ? AND uf = ? AND municipio = ? AND zona = ? AND secao = ?`);
const qVot = db.prepare('SELECT numero, quantidade FROM voto_bu WHERE turno = ? AND cargo = 1 AND uf = ? AND municipio = ? AND zona = ? AND secao = ? AND numero IN (13, 22)');

async function caminhoLog(turno, uf, municipio, zona, secao, hash) {
  const dirSecao = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', uf, municipio, zona, secao);
  let dir = path.join(dirSecao, hash);
  if (!existsSync(dir)) {
    const subs = (await readdir(dirSecao, { withFileTypes: true })).filter((e) => e.isDirectory());
    if (subs.length !== 1) throw new Error(`${turno}º turno: ${subs.length} pacotes`);
    dir = path.join(dirSecao, subs[0].name);
  }
  return path.join(dir, acharArquivo(await readdir(dir), 'log'));
}

/** Ciclos de eleitor que terminam em voto, no dia do turno t. */
function ciclos(texto, t) {
  const out = [];
  let c = null;
  const novo = () => ({ tent: 0, timeouts: 0, t0: null, t4: null, bio: false, anb: false, dado: false, mes: null, nova: false, gravada: false });
  for (const linha of texto.split('\n')) {
    if (!linha.startsWith(DIA[t])) continue;
    const p = linha.split('\t');
    const hora = p[0].slice(11, 19);
    const urna = p[2];
    const msg = (p[4] ?? '').replace(/\r$/, '');
    if (msg === 'Aguardando digitação do identificador do eleitor') { c = novo(); continue; }
    if (!c) c = novo();
    let m;
    if ((m = RE_TENT.exec(msg))) { c.tent = Math.max(c.tent, Number(m[1])); if (c.t0 === null) c.t0 = hora; }
    else if (msg.startsWith('Timeout de reconhecimento do dedo')) c.timeouts++;
    else if (msg.startsWith('Número de tentativas de reconhecimento do dedo. Tentativa [4]')) c.t4 = hora;
    else if (msg.includes('Tipo de habilitação do eleitor [biométrica]')) c.bio = true;
    else if (msg.startsWith('Ano de nascimento digitado é igual ao do cadastro')) c.anb = true;
    else if (msg === 'Dado digitado confere') c.dado = true;
    else if ((m = RE_MES.exec(msg))) c.mes = m[1];
    else if (msg.startsWith('Não encontrou digital coletada')) c.nova = true;
    else if (msg.startsWith('Digital coletada bate com uma digital gravada')) c.gravada = true;
    else if (msg === 'O voto do eleitor foi computado') {
      const classe = c.bio ? 'bio' : c.anb ? 'anb' : c.dado ? (c.mes ? 'falhaMes' : c.gravada ? 'falhaGravada' : c.nova ? 'falhaNova' : 'falhaOutra') : 'outra';
      out.push({ hora, urna, classe, tent: c.tent, timeouts: c.timeouts, mes: c.mes, dur4: c.t0 && c.t4 ? seg(c.t4) - seg(c.t0) : null });
      c = novo();
    }
  }
  return out;
}
const seg = (h) => Number(h.slice(0, 2)) * 3600 + Number(h.slice(3, 5)) * 60 + Number(h.slice(6, 8));
const mediana = (v) => { if (!v.length) return null; const s = [...v].sort((a, b) => a - b); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

// Linha do tempo por meia hora: 1–4 = reconhecido na tentativa n; x = falha (mesário identificado); n = falha com digital nova;
// g = falha com digital já gravada; . = ano de nascimento (sem biometria cadastrada).
function linhaDoTempo(cs) {
  const cod = (x) => (x.classe === 'bio' ? String(Math.min(x.tent, 4)) : x.classe === 'anb' ? '.' : x.classe === 'falhaMes' ? 'x' : x.classe === 'falhaNova' ? 'n' : x.classe === 'falhaGravada' ? 'g' : '?');
  const o = {};
  for (const x of cs) { const h = x.hora.slice(0, 2) + ':' + (Number(x.hora.slice(3, 5)) < 30 ? '00' : '30'); o[h] = (o[h] ?? '') + cod(x); }
  return Object.fromEntries(Object.entries(o).sort());
}

function medir(cs) {
  const ehF = (x) => x.classe.startsWith('falha');
  const n = { bio: 0, anb: 0, falhaMes: 0, falhaNova: 0, falhaGravada: 0, falhaOutra: 0, outra: 0 };
  for (const x of cs) n[x.classe]++;
  const F = n.falhaMes + n.falhaNova + n.falhaGravada + n.falhaOutra;
  // por hora
  const porHora = {};
  for (const x of cs) {
    const h = x.hora.slice(0, 2);
    const o = (porHora[h] ??= { votos: 0, bio: 0, falhas: 0, tentBio: 0 });
    o.votos++;
    if (x.classe === 'bio') { o.bio++; o.tentBio += x.tent; }
    if (ehF(x)) o.falhas++;
  }
  for (const o of Object.values(porHora)) { o.tentPorBio = o.bio ? +(o.tentBio / o.bio).toFixed(2) : null; delete o.tentBio; }
  // sequência só dos pedidos de digital (bio × falha), na ordem do dia
  const seq = cs.filter((x) => x.classe === 'bio' || ehF(x)).map((x) => (ehF(x) ? 1 : 0));
  let maior = 0, run = 0, runs = 0;
  for (let i = 0; i < seq.length; i++) {
    run = seq[i] ? run + 1 : 0; maior = Math.max(maior, run);
    if (i === 0 || seq[i] !== seq[i - 1]) runs++;
  }
  const n1 = seq.filter(Boolean).length, n0 = seq.length - n1, N = seq.length;
  const mu = 1 + (2 * n1 * n0) / N;
  const v = (2 * n1 * n0 * (2 * n1 * n0 - N)) / (N * N * (N - 1));
  const zRuns = v > 0 ? (runs - mu) / Math.sqrt(v) : null;
  // falha cercada de reconhecimento na 1ª tentativa (vizinhos na sequência de pedidos de digital)
  const pedidos = cs.filter((x) => x.classe === 'bio' || ehF(x));
  let cercadas = 0;
  pedidos.forEach((x, i) => { if (ehF(x) && pedidos[i - 1]?.classe === 'bio' && pedidos[i - 1].tent === 1 && pedidos[i + 1]?.classe === 'bio' && pedidos[i + 1].tent === 1) cercadas++; });
  const bios = cs.filter((x) => x.classe === 'bio');
  const p1 = bios.length ? bios.filter((x) => x.tent === 1).length / bios.length : null;
  // esperado de "cercadas" se a falha fosse independente da posição: F × p(bio na 1ª)² aproximado
  const pb1 = pedidos.length ? bios.filter((x) => x.tent === 1).length / pedidos.length : 0;
  // mesários (rótulos)
  const rot = new Map();
  for (const x of cs) if (x.mes && !rot.has(x.mes)) rot.set(x.mes, `M${rot.size + 1}`);
  const porMes = {};
  for (const x of cs) if (x.classe === 'falhaMes') { const r = rot.get(x.mes); porMes[r] = (porMes[r] ?? 0) + 1; }
  // blocos de falhas por mesário: maior sequência de falhas seguidas liberadas pelo mesmo mesário
  let maiorMes = 0, rm = 0, ult = null;
  for (const x of pedidos) { if (x.classe === 'falhaMes') { rm = x.mes === ult ? rm + 1 : 1; ult = x.mes; maiorMes = Math.max(maiorMes, rm); } else if (x.classe === 'bio') { rm = 0; ult = null; } }
  const urnas = {};
  for (const x of cs) urnas[x.urna] = (urnas[x.urna] ?? 0) + 1;
  const falhas = cs.filter(ehF);
  return {
    votos: cs.length, ...n, F, f: +(F / (n.bio + F)).toFixed(4), p1: p1 === null ? null : +p1.toFixed(3),
    primeiraFalha: falhas[0]?.hora ?? null, ultimaFalha: falhas.at(-1)?.hora ?? null,
    maiorSequenciaFalhas: maior, runs, runsEsperado: +mu.toFixed(1), zRuns: zRuns === null ? null : +zRuns.toFixed(2),
    falhasCercadasDe1aTentativa: cercadas, cercadasEsperado: +(F * pb1 * pb1).toFixed(1),
    timeoutsNasFalhas: falhas.reduce((a, x) => a + x.timeouts, 0), dur4Mediana: mediana(falhas.map((x) => x.dur4).filter((d) => d !== null)),
    tentativasFalhas: falhas.reduce((o, x) => ((o[x.tent] = (o[x.tent] ?? 0) + 1), o), {}),
    liberacoesPorMesario: porMes, mesariosDistintos: rot.size, maiorSequenciaMesmoMesario: maiorMes,
    urnasNoDia: Object.keys(urnas).length, votosPorUrna: Object.values(urnas), porHora, linhaDoTempo: linhaDoTempo(cs),
  };
}

const resultado = [];
for (const caso of casos) {
  const [uf, municipio, zona, secao] = caso.id.split('/');
  const s1 = qSec.get(1, uf, municipio, zona, secao), s2 = qSec.get(2, uf, municipio, zona, secao);
  const votos = (t) => Object.fromEntries(qVot.all(t, uf, municipio, zona, secao).map((r) => [r.numero, r.quantidade]));
  const { texto: t2 } = await lerLogs(await caminhoLog(2, uf, municipio, zona, secao, s2.hash), secao);
  let c1 = ciclos(t2, 1), fonte1 = 'pacote do 2º turno';
  const bate1 = (cs) => cs.length === s1.c && cs.filter((x) => x.classe === 'bio').length === s1.pb && cs.filter((x) => x.classe.startsWith('falha')).length === s1.pg;
  if (!bate1(c1)) { const { texto: t1 } = await lerLogs(await caminhoLog(1, uf, municipio, zona, secao, s1.hash), secao); c1 = ciclos(t1, 1); fonte1 = 'pacote do 1º turno'; }
  const c2 = ciclos(t2, 2);
  const m1 = medir(c1), m2 = medir(c2);
  resultado.push({
    id: caso.id, modelo1: s1.modelo, modelo2: s2.modelo, urnaTrocada: s1.urna !== s2.urna, tipoUrna2: s2.tipo, fonte1,
    BU: { 1: { c: s1.c, porBiometria: s1.pb, porBiografia: s1.pg, semBiometria: s1.sb, ...votos(1) }, 2: { c: s2.c, porBiometria: s2.pb, porBiografia: s2.pg, semBiometria: s2.sb, ...votos(2) } },
    confereBU: { 1: m1.votos === s1.c && m1.bio === s1.pb && m1.F === s1.pg && m1.anb === s1.sb, 2: m2.votos === s2.c && m2.bio === s2.pb && m2.F === s2.pg && m2.anb === s2.sb },
    h19: { saltoFpp: +caso.saltoFpp, zOd: +caso.zOd, dyContraPares: +caso.dyContraPares, padraoA: +caso.padraoA },
    turno1: m1, turno2: m2,
  });
}
db.close();
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, values.saida), JSON.stringify(resultado, null, 1));
for (const r of resultado) {
  const L = (m) => `votos ${m.votos} bio ${m.bio} anb ${m.anb} falhas ${m.F} (mes ${m.falhaMes}, nova ${m.falhaNova}, gravada ${m.falhaGravada}, outra ${m.falhaOutra}) f ${m.f} p1 ${m.p1} | ${m.primeiraFalha}–${m.ultimaFalha} maiorSeq ${m.maiorSequenciaFalhas} zRuns ${m.zRuns} cercadas ${m.falhasCercadasDe1aTentativa}/${m.cercadasEsperado} timeouts ${m.timeoutsNasFalhas} dur4 ${m.dur4Mediana} | mesários ${JSON.stringify(m.liberacoesPorMesario)} seqMesmo ${m.maiorSequenciaMesmoMesario} | urnas ${m.urnasNoDia} ${JSON.stringify(m.votosPorUrna)}`;
  console.log(`\n${r.id} ${r.modelo1}→${r.modelo2} trocada=${r.urnaTrocada} fonte1=${r.fonte1} confere=${JSON.stringify(r.confereBU)} 13/22: ${r.BU[1][13]}/${r.BU[1][22]} → ${r.BU[2][13]}/${r.BU[2][22]}`);
  console.log(`  1T ${L(r.turno1)}`);
  console.log(`  2T ${L(r.turno2)}`);
  console.log(`  2T por hora: ${Object.entries(r.turno2.porHora).map(([h, o]) => `${h}h ${o.falhas}/${o.votos} t${o.tentPorBio}`).join(' · ')}`);
  console.log(`  1T por hora: ${Object.entries(r.turno1.porHora).map(([h, o]) => `${h}h ${o.falhas}/${o.votos} t${o.tentPorBio}`).join(' · ')}`);
}
