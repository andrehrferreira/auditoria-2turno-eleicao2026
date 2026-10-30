// Engenheiro de segurança, doc 12 (H01, parecer 44 item 4): cruza as três saídas de Campinápolis.
//   logs.json   (seguranca-campinapolis-logs.mjs)   liberações por seção e turno, ritmo
//   perfil.json (seguranca-campinapolis-perfil.mjs) aptos 100+, sem biometria, indígenas por seção; comparecimento 100+
//   censo.json  (seguranca-campinapolis-censo.mjs)  população 90+ e idade presumida, Censo 2022
// Uso: node scripts/auditoria/seguranca-campinapolis-cruzamento.mjs
// Saída: data/parsed/auditoria/engenheiro-seguranca-urna/campinapolis/cruzamento.json (+ tabelas no terminal, em Markdown)
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

const DIR = path.join(DIR_DADOS, 'parsed', 'auditoria', 'engenheiro-seguranca-urna', 'campinapolis');
const ler = async (n) => JSON.parse(await readFile(path.join(DIR, n), 'utf8'));
const logs = await ler('logs.json');
const perfil = await ler('perfil.json');
const censo = await ler('censo.json');
const pct = (a, b, d = 1) => (b ? `${((100 * a) / b).toFixed(d)}%` : '-');
const out = {};

// 1. Totais por município e turno (log)
const tot = {};
for (const s of logs.secoes) {
  const k = `${s.municipio}|${s.turno}`;
  const t = (tot[k] ??= { secoes: 0, votos: 0, bio: 0, ano: 0, mesario: 0, semMesario: 0, anoDiferente: 0, jaVotou: 0, naoEncontrado: 0,
    maiorRajada10: 0, maiorRajadaSecao: null, maiorSequencia: 0, maiorSequenciaSecao: null, mesmoMesario: 0, mesmoMesarioSecao: null,
    semBioAte60s: 0, ultimaHoraSemBio: 0, ultimaHoraVotos: 0, porHora: {} });
  t.secoes++;
  for (const c of ['votos', 'bio', 'ano', 'mesario', 'semMesario', 'anoDiferente', 'jaVotou', 'naoEncontrado']) t[c] += s.log[c];
  const r = s.ritmo;
  if (r.rajada10min > t.maiorRajada10) { t.maiorRajada10 = r.rajada10min; t.maiorRajadaSecao = `${s.secao} ${r.rajadaDe}`; }
  if (r.maiorSequencia > t.maiorSequencia) { t.maiorSequencia = r.maiorSequencia; t.maiorSequenciaSecao = `${s.secao} ${r.sequenciaDeAte}`; }
  if (r.mesmoMesarioSeguidas > t.mesmoMesario) { t.mesmoMesario = r.mesmoMesarioSeguidas; t.mesmoMesarioSecao = s.secao; }
  t.semBioAte60s += r.semBioAte60sDoAnterior; t.ultimaHoraSemBio += r.ultimaHora.semBio; t.ultimaHoraVotos += r.ultimaHora.votos;
  for (const [h, x] of Object.entries(r.porHora)) { const p = (t.porHora[h] ??= { votos: 0, semBio: 0 }); p.votos += x.votos; p.semBio += x.semBio; }
}
out.totais = tot;
console.log('## Totais por município e turno (diário da urna, todas as seções da zona 0026)\n');
console.log('| Município | Turno | Seções | Votos | Digital | Ano de nascimento | Mesário identificado | Sem mesário identificado | Sem digital (%) | Ano recusado | Já votou | Maior rajada 10 min | Maior sequência | Mesmo mesário seguidas | Sem digital ≤60 s do voto anterior |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const [k, t] of Object.entries(tot)) {
  const [m, tu] = k.split('|');
  const sem = t.ano + t.mesario + t.semMesario;
  console.log(`| ${m} | ${tu}º | ${t.secoes} | ${t.votos} | ${t.bio} | ${t.ano} | ${t.mesario} | ${t.semMesario} | ${sem} (${pct(sem, t.votos)}) | ${t.anoDiferente} | ${t.jaVotou} | ${t.maiorRajada10} (seção ${t.maiorRajadaSecao}) | ${t.maiorSequencia} (seção ${t.maiorSequenciaSecao}) | ${t.mesmoMesario} (seção ${t.mesmoMesarioSecao}) | ${t.semBioAte60s} |`);
}
console.log('\n### Votos sem digital por hora (Campinápolis), % do total da hora\n');
for (const tu of [1, 2]) {
  const ph = tot[`CAMPINÁPOLIS|${tu}`].porHora;
  console.log(`${tu}º turno: ${Object.keys(ph).sort().map((h) => `${h}h ${ph[h].semBio}/${ph[h].votos} (${pct(ph[h].semBio, ph[h].votos, 0)})`).join(' · ')}`);
}

// 2. Por seção de Campinápolis: perfil 100+ × liberações nos dois turnos
const porSecao = {};
for (const s of logs.secoes) {
  if (s.municipio !== 'CAMPINÁPOLIS') continue;
  const x = (porSecao[s.secao] ??= { secao: s.secao, local: s.local });
  x[`t${s.turno}`] = { aptos: s.aptos, votos: s.log.votos, ano: s.log.ano, mesario: s.log.mesario, semMesario: s.log.semMesario,
    rajada: s.ritmo.rajada10min, seq: s.ritmo.maiorSequencia, mesmo: s.ritmo.mesmoMesarioSeguidas, anoDif: s.log.anoDiferente, jaVotou: s.log.jaVotou };
}
// Seções agregadas (votam na urna da seção principal): o perfil delas soma no da principal.
const { db } = await abrirLeitura();
const agregada = new Map(db.prepare(`SELECT secao, secao_principal FROM secao_agregada WHERE turno = 1 AND uf = 'mt' AND municipio = '98655' AND zona = '0026'`)
  .all().map((r) => [r.secao, r.secao_principal]));
db.close();
out.agregadas = Object.fromEntries(agregada);
for (const [k, p] of Object.entries(perfil.secoes)) {
  const [mun, , sec0] = k.split('/');
  if (mun !== '98655') continue;
  const sec = agregada.get(sec0) ?? sec0;
  const x = (porSecao[sec] ??= { secao: sec });
  if (!x.perfil) x.perfil = { ...p, secoesPerfil: [sec0] };
  else {
    x.perfil.secoesPerfil.push(sec0);
    for (const [c, v] of Object.entries(p)) if (typeof v === 'number' && c !== 'local') x.perfil[c] += v;
  }
}
const semLog = Object.values(porSecao).filter((x) => !x.t1 || !x.t2).map((x) => x.secao);
if (semLog.length) throw new Error(`seções do perfil sem diário nos dois turnos: ${semLog.join(', ')}`);
const linhasSecao = Object.values(porSecao).sort((a, b) => (b.perfil?.aptos100 ?? 0) - (a.perfil?.aptos100 ?? 0));
out.secoesCampinapolis = linhasSecao;
console.log('\n## Campinápolis por seção: aptos de 100+ (perfil por seção) e liberações sem digital (diário), 1º / 2º turno\n');
console.log('| Seção | Local | Nome do local | Aptos | Indígenas | Sem digital no cadastro | Aptos 100+ | 100+ sem digital | 100+ indígenas | Ano nasc. 1º/2º | Mesário 1º/2º | Sem mesário 1º/2º | Rajada 10 min 1º/2º | Sequência 1º/2º |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
const sums = { aptos: 0, sem: 0, a100: 0, s100: 0, i100: 0, i100s: 0, ind: 0 };
for (const x of linhasSecao) {
  const p = x.perfil; const a = x.t1; const b = x.t2;
  sums.aptos += p.aptos; sums.sem += p.aptos - p.biometria; sums.a100 += p.aptos100; sums.s100 += p.aptos100 - p.biometria100;
  sums.i100 += p.indigenas100; sums.i100s += p.indigenas100 - p.indigenas100Biometria; sums.ind += p.indigenas;
  const ag = p.secoesPerfil.filter((y) => y !== x.secao);
  console.log(`| ${x.secao}${ag.length ? ` (+${ag.join(', ')} agregada)` : ''} | ${p.local} | ${p.nomeLocal} | ${p.aptos} | ${pct(p.indigenas, p.aptos, 0)} | ${p.aptos - p.biometria} | ${p.aptos100} | ${p.aptos100 - p.biometria100} | ${p.indigenas100} | ${a.ano}/${b.ano} | ${a.mesario}/${b.mesario} | ${a.semMesario}/${b.semMesario} | ${a.rajada}/${b.rajada} | ${a.seq}/${b.seq} |`);
}
console.log(`\nTotal Campinápolis (perfil por seção): aptos ${sums.aptos}, indígenas ${sums.ind} (${pct(sums.ind, sums.aptos)}), sem digital ${sums.sem}, 100+ ${sums.a100}, 100+ sem digital ${sums.s100}, 100+ indígenas ${sums.i100} (sem digital ${sums.i100s})`);
out.somaPerfil = sums;

// Concentração: seções que somam 80% dos 100+ sem digital
const ord = linhasSecao.map((x) => ({ s: x.secao, local: x.perfil.nomeLocal, n: x.perfil.aptos100 - x.perfil.biometria100 })).sort((a, b) => b.n - a.n);
let acc = 0; const top = [];
for (const o of ord) { if (acc >= 0.8 * sums.s100) break; acc += o.n; top.push(o); }
console.log(`Concentração: ${top.length} de ${ord.length} seções têm ${acc} dos ${sums.s100} aptos 100+ sem digital (${pct(acc, sums.s100)}): ${top.map((o) => `${o.s} (${o.n}, ${o.local})`).join('; ')}`);
// Por local de votação
const porLocal = {};
for (const x of linhasSecao) {
  const l = (porLocal[x.perfil.nomeLocal] ??= { secoes: 0, aptos: 0, indigenas: 0, a100: 0, s100: 0, i100: 0, ano1: 0, ano2: 0, votos1: 0, votos2: 0 });
  l.secoes++; l.aptos += x.perfil.aptos; l.indigenas += x.perfil.indigenas; l.a100 += x.perfil.aptos100; l.s100 += x.perfil.aptos100 - x.perfil.biometria100; l.i100 += x.perfil.indigenas100;
  l.ano1 += x.t1.ano; l.ano2 += x.t2.ano; l.votos1 += x.t1.votos; l.votos2 += x.t2.votos;
}
out.porLocal = porLocal;
console.log('\n| Local de votação | Seções | Aptos | Indígenas | Aptos 100+ | 100+ sem digital | 100+ indígenas | Ano nasc. 1º (de votos) | Ano nasc. 2º (de votos) |');
console.log('|---|---|---|---|---|---|---|---|---|');
for (const [n, l] of Object.entries(porLocal).sort((a, b) => b[1].a100 - a[1].a100)) {
  console.log(`| ${n} | ${l.secoes} | ${l.aptos} | ${pct(l.indigenas, l.aptos, 0)} | ${l.a100} | ${l.s100} | ${l.i100} | ${l.ano1} (${pct(l.ano1, l.votos1, 0)} de ${l.votos1}) | ${l.ano2} (${pct(l.ano2, l.votos2, 0)} de ${l.votos2}) |`);
}

// Correlação simples entre o estoque 100+ sem digital da seção e as liberações por ano de nascimento (Spearman)
const rank = (v) => { const o = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]); const r = Array(v.length); for (let i = 0; i < o.length;) { let j = i; while (j + 1 < o.length && o[j + 1][0] === o[i][0]) j++; for (let k = i; k <= j; k++) r[o[k][1]] = (i + j) / 2 + 1; i = j + 1; } return r; };
const pearson = (a, b) => { const n = a.length; const ma = a.reduce((s, x) => s + x, 0) / n; const mb = b.reduce((s, x) => s + x, 0) / n; let sab = 0; let sa = 0; let sb = 0; for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2; } return sab / Math.sqrt(sa * sb); };
const s100 = linhasSecao.map((x) => x.perfil.aptos100 - x.perfil.biometria100);
const semCad = linhasSecao.map((x) => x.perfil.aptos - x.perfil.biometria);
const resid = linhasSecao.map((x) => x.perfil.aptos - x.perfil.biometria - (x.perfil.aptos100 - x.perfil.biometria100));
const ano1 = linhasSecao.map((x) => x.t1.ano); const ano2 = linhasSecao.map((x) => x.t2.ano);
const taxa1 = linhasSecao.map((x, i) => (resid[i] ? x.t1.ano / resid[i] : 0));
out.correlacoes = {
  spearman_100semDigital_ano1: pearson(rank(s100), rank(ano1)), spearman_100semDigital_ano2: pearson(rank(s100), rank(ano2)),
  spearman_semDigitalAbaixo100_ano1: pearson(rank(resid), rank(ano1)), spearman_semDigitalTotal_ano1: pearson(rank(semCad), rank(ano1)),
  spearman_100semDigital_taxaAno1PorSemDigitalAbaixo100: pearson(rank(s100), rank(taxa1)),
};
console.log('\nCorrelações de Spearman entre seções de Campinápolis (n = 38):', JSON.stringify(out.correlacoes, (k, v) => (typeof v === 'number' ? Number(v.toFixed(3)) : v)));

// 3. Comparecimento 100+ por raça (perfil de comparecimento) e Censo
const cz = perfil.comparecimentoZona;
const c100 = {};
for (const [k, x] of Object.entries(cz)) {
  const [turno, mun, faixa, raca, grupo] = k.split('|');
  if (faixa !== '100 anos ou mais') continue;
  const kk = `${turno}|${mun}|${raca}${grupo && grupo !== 'Não informado' ? `:${grupo}` : ''}`;
  const a = (c100[kk] ??= { aptos: 0, comparecimento: 0 }); a.aptos += x.aptos; a.comparecimento += x.comparecimento;
}
out.comparecimento100 = c100;
console.log('\n## Comparecimento de 100+ por raça/cor declarada (perfil de comparecimento, zona 0026)\n');
for (const [k, x] of Object.entries(c100).sort()) console.log(`${k}: aptos ${x.aptos}, compareceram ${x.comparecimento} (${pct(x.comparecimento, x.aptos)})`);
const br = {};
for (const [k, x] of Object.entries(perfil.brasil100)) {
  const [turno, uf, raca] = k.split('|');
  for (const kk of [`${turno}|BR|${raca}`, `${turno}|BR|todos`]) { const a = (br[kk] ??= { aptos: 0, comparecimento: 0 }); a.aptos += x.aptos; a.comparecimento += x.comparecimento; }
}
out.brasil100 = br;
console.log('\nBrasil (com exterior), 100+:');
for (const [k, x] of Object.entries(br).sort()) console.log(`${k}: aptos ${x.aptos}, compareceram ${x.comparecimento} (${pct(x.comparecimento, x.aptos, 2)})`);

const cc = censo.territorios;
console.log('\n## Censo 2022 (IBGE 9514): população 90+ e idade presumida\n');
console.log('| Território | 90 a 94 | 95 a 99 | 100 ou mais | 100+ ÷ 95–99 | 100+ por 10 mil habitantes | Idade presumida no total |');
console.log('|---|---|---|---|---|---|---|');
for (const [n, f] of Object.entries(cc)) {
  const a = f['95 a 99'].total; const b = f['100 ou mais'].total;
  console.log(`| ${n} | ${f['90 a 94'].total} | ${a} | ${b} (presumida ${f['100 ou mais'].presumida}) | ${a ? (b / a).toFixed(2) : '-'} | ${((1e4 * b) / f.Total.total).toFixed(2)} | ${pct(f.Total.presumida, f.Total.total)} |`);
}
await writeFile(path.join(DIR, 'cruzamento.json'), JSON.stringify(out, null, 1));
