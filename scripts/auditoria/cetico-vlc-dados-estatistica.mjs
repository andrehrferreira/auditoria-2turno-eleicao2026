// Cético (lente: dados e definições), achado votos-sem-log-contingencia.
// 1) Classifica cada voto computado dos logs publicados (dia da votação) em biometria / biografia / sem biometria
//    cadastrada (sequências do doc 06) e subtrai do detalhamentoComparecimento do BU.
// 2) Recalcula a binomial da BA (12 de 13 por biografia) sob várias referências (hipótese nula).
// 3) Mede a sobredispersão: quantas seções do país têm fração por biografia muito alta (falha de leitor),
//    o que a binomial independente ignora.
// 4) Linha de base de ritmo: votos do 1º turno, na mesma seção, na mesma janela de horário dos votos sem log.
// 5) RS: ciclos de eleitor iniciados no log e sem "computado" (rastro parcial).
// Somente leitura. Uso: node scripts/auditoria/cetico-vlc-dados-estatistica.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { open } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const D = 'data/parsed/auditoria/cetico';
const db = new DatabaseSync('data/db/eleicao2026.sqlite', { readOnly: true });
const out = [];
const log = (...a) => { const s = a.join(' '); out.push(s); console.log(s); };

function ciclos(texto, dia) {
  const linhas = texto.split(/\r?\n/).filter((l) => l.startsWith(dia)).map((l) => l.split('\t'));
  const res = []; let c = null;
  for (const x of linhas) {
    const m = x[4] ?? '';
    if (m.startsWith('Aguardando digitação do identificador')) { if (c?.iniciado) res.push({ ...c, fim: 'sem computado' }); c = { inicio: x[0], iniciado: false, msgs: [] }; continue; }
    if (!c) continue;
    if (m.startsWith('Identificador do eleitor digitado')) c.iniciado = true;
    c.msgs.push(m);
    if (m.startsWith('O voto do eleitor foi computado')) {
      const t = c.msgs.join('\n');
      const classe = /\[biométrica\]/.test(t) ? 'biometria' : /Solicitação de dado pessoal|Solicita digital/.test(t) && !/Ano de nascimento digitado é igual ao do cadastro/.test(t.split('Solicitação de dado pessoal')[0] ?? '') ? 'biografia' : 'semBiometria';
      res.push({ inicio: c.inicio, computado: x[0], classe, fim: 'computado', urna: x[2] });
      c = null;
    } else if (m.startsWith('Início das operações do logd')) { if (c.iniciado) res.push({ ...c, fim: 'reinício' }); c = null; }
  }
  if (c?.iniciado) res.push({ ...c, fim: 'fim do log' });
  return res;
}
const conta = (cs) => cs.filter((c) => c.fim === 'computado').reduce((a, c) => ((a[c.classe] = (a[c.classe] ?? 0) + 1), a), {});

// 1) BU − log
const SECOES = { 'ma-0609': ['ma', '08893', '0047', '0609'], 'ba-0235': ['ba', '35653', '0173', '0235'], 'rs-0191': ['rs', '89060', '0017', '0191'] };
for (const [k, [uf, mun, zona, sec]] of Object.entries(SECOES)) {
  const bu = db.prepare('SELECT comparecimento, sem_biometria, por_biometria, por_biografia, abertura FROM secao WHERE turno=2 AND uf=? AND municipio=? AND zona=? AND secao=?').get(uf, mun, zona, sec);
  const arquivos = readdirSync(D).filter((n) => n.startsWith(`cetico-vlc-${k}-`) && n.endsWith('.txt'));
  const vistos = new Set(); const todos = [];
  for (const a of arquivos) {
    for (const c of ciclos(readFileSync(`${D}/${a}`, 'utf8'), '25/10/2026')) {
      const chave = `${c.urna}|${c.computado ?? c.inicio}`;
      if (c.fim === 'computado' && vistos.has(chave)) continue;
      vistos.add(chave); todos.push({ ...c, arquivo: a });
    }
  }
  const cl = conta(todos);
  log(`\n${k}: BU comp ${bu.comparecimento} (biometria ${bu.por_biometria}, biografia ${bu.por_biografia}, sem ${bu.sem_biometria}; abertura ${bu.abertura})`);
  log(`   log: ${JSON.stringify(cl)} → BU−log: biometria ${bu.por_biometria - (cl.biometria ?? 0)}, biografia ${bu.por_biografia - (cl.biografia ?? 0)}, sem ${bu.sem_biometria - (cl.semBiometria ?? 0)}`);
  const comp = todos.filter((c) => c.fim === 'computado').map((c) => c.computado).sort();
  log(`   1º e último voto com log: ${comp[0]} … ${comp.at(-1)}`);
  for (const c of todos.filter((c) => c.fim !== 'computado')) log(`   ciclo iniciado sem "computado": ${c.inicio} (${c.fim}) últimas msgs: ${c.msgs.slice(-3).join(' | ')}`);
  if (k === 'ba-0235') {
    const cont = todos.filter((c) => c.fim === 'computado');
    const primeiros = cont.sort((a, b) => a.computado.localeCompare(b.computado)).slice(0, 13);
    log(`   BA: os 13 primeiros votos com log da urna de contingência (${primeiros[0].computado}…${primeiros.at(-1).computado}): ${JSON.stringify(conta(primeiros))}`);
  }
}

// 2) Binomial
const lnC = (n, k) => { let s = 0; for (let i = 1; i <= k; i++) s += Math.log(n - k + i) - Math.log(i); return s; };
const caudaSup = (n, k, p) => { let s = 0; for (let j = k; j <= n; j++) s += Math.exp(lnC(n, j) + j * Math.log(p) + (n - j) * Math.log(1 - p)); return s; };
// cauda superior por recorrência (termos decrescem rápido acima da média): O(n)
const caudaRapida = (n, k, p) => { let t = Math.exp(lnC(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p)), s = 0; for (let j = k; j <= n && t > 1e-300; j++) { s += t; t *= ((n - j) / (j + 1)) * (p / (1 - p)); } return s; };
log('\nBinomial P(X ≥ 12 | n = 13, p):');
const refs = [
  ['p = 21/204 (autor: biografia ÷ todos os votos com log)', 21 / 204],
  ['p = 21/179 (biografia ÷ votos com biometria cadastrada; os 13 têm 0 "sem biometria")', 21 / 179],
  ['p = 33/192 (BU inteiro da seção, só com biometria cadastrada)', 33 / 192],
];
const t1 = db.prepare("SELECT por_biografia, por_biometria, sem_biometria FROM secao WHERE turno=1 AND uf='ba' AND municipio='35653' AND zona='0173' AND secao='0235'").get();
refs.push([`p = ${t1.por_biografia}/${t1.por_biografia + t1.por_biometria} (1º turno, mesma seção, BU)`, t1.por_biografia / (t1.por_biografia + t1.por_biometria)]);
const nac = db.prepare("SELECT SUM(por_biografia) b, SUM(por_biometria) m FROM secao WHERE turno=2").get();
refs.push([`p = ${nac.b}/${nac.b + nac.m} (país, 2º turno)`, nac.b / (nac.b + nac.m)]);
for (const [r, p] of refs) log(`   ${r}: p=${p.toFixed(4)} → ${caudaSup(13, 12, p).toExponential(2)}`);

// 3) Sobredispersão: seções com fração por biografia ≥ limiar, entre as com biometria cadastrada
log('\nSobredispersão (2º turno, seções com ≥ 13 eleitores com biometria cadastrada):');
const linhas = db.prepare("SELECT por_biografia b, por_biometria m, tipo_urna FROM secao WHERE turno=2 AND por_biometria IS NOT NULL AND por_biografia + por_biometria >= 13").all();
const pNac = nac.b / (nac.b + nac.m);
for (const lim of [0.5, 0.8, 0.9]) {
  const obs = linhas.filter((l) => l.b / (l.b + l.m) >= lim).length;
  // esperado sob binomial independente com p nacional
  let esp = 0;
  for (const l of linhas) { const n = l.b + l.m; esp += caudaRapida(n, Math.ceil(lim * n), pNac); }
  log(`   fração biografia ≥ ${lim}: observadas ${obs} de ${linhas.length}; esperadas sob binomial(p país) ${esp.toExponential(2)}`);
}
const cont = linhas.filter((l) => l.tipo_urna !== 'secao');
log(`   só seções com urna trocada (tipo_urna ≠ secao): ${cont.length}; com fração ≥ 0.5: ${cont.filter((l) => l.b / (l.b + l.m) >= 0.5).length}`);

// 4) Ritmo no 1º turno, mesma seção e janela
async function logPrincipal(turno, uf, mun, zona, sec) {
  const s = db.prepare('SELECT hash FROM secao WHERE turno=? AND uf=? AND municipio=? AND zona=? AND secao=?').get(turno, uf, mun, zona, sec);
  const dir = `data/raw/${turno}t/urnas/${uf}/${mun}/${zona}/${sec}`;
  const sub = readdirSync(dir).find((n) => s.hash.startsWith(n.slice(0, 20)) || n.startsWith(s.hash)) ?? readdirSync(dir).find((n) => !n.endsWith('.json'));
  const jez = readdirSync(`${dir}/${sub}`).find((n) => n.endsWith('-log.jez'));
  const h = await open(`${dir}/${sub}/${jez}`);
  try { const e = (await listarEntradas(h)).find((x) => x.nome === 'logd.dat'); return (await lerEntrada(h, e)).toString('latin1'); } finally { await h.close(); }
}
const janela = async (turno, uf, mun, zona, sec, ini, fim) => {
  const cs = ciclos(await logPrincipal(turno, uf, mun, zona, sec), '04/10/2026').filter((c) => c.fim === 'computado');
  const dentro = cs.filter((c) => c.computado.slice(11) >= ini && c.computado.slice(11) < fim);
  return { total: cs.length, dentro: dentro.length, classes: conta(dentro), todas: conta(cs) };
};
log('\nLinha de base de ritmo e habilitação no 1º turno (mesma seção, mesma janela de horário):');
const ma1 = await janela(1, 'ma', '08893', '0047', '0609', '08:00:00', '10:25:00');
log(`   MA 0609, 1º turno, votos 08:00–10:25: ${ma1.dentro} (de ${ma1.total}); classes ${JSON.stringify(ma1.classes)}  [2º turno: 36 sem log]`);
const ba1 = await janela(1, 'ba', '35653', '0173', '0235', '08:48:54', '09:02:00');
log(`   BA 0235, 1º turno, votos 08:48:54–09:02: ${ba1.dentro} (de ${ba1.total}); classes ${JSON.stringify(ba1.classes)}; dia todo ${JSON.stringify(ba1.todas)}  [2º turno: 13 sem log]`);
writeFileSync(`${D}/cetico-vlc-estatistica.txt`, out.join('\n') + '\n');
