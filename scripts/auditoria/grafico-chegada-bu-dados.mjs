// Dados dos gráficos e da tabela do tópico 3 da perícia, item 12 (chegada dos BUs ao TSE × divulgação, 2º turno;
// H06; parecer cético 28). Não faz análise nova: reconta, a partir do arquivo por seção (secoes.csv), as contagens por
// minuto que o estatístico gravou em por-minuto.csv, confere minuto a minuto que as duas contas são iguais, confere os
// números da "afirmação revisada" do parecer 28 contra resumo.json e 28-chegada-bu.json, e grava CSVs em
// docs/pericia/graficos/dados/.
// Entradas (data/parsed/auditoria/):
//   chegada-bu/secoes.csv      (estatistico-chegada-bu-dados.mjs: uma linha por seção, horários dos dois turnos)
//   chegada-bu/por-minuto.csv  (estatistico-chegada-bu.mjs: contagens por minuto, 17:00 a 03:00)
//   chegada-bu/resumo.json     (idem: números do doc linha-do-tempo/06)
//   cetico-revisor/28-chegada-bu.json (cetico-chegada-bu.mjs: conferência do parecer 28)
// Uso: node scripts/auditoria/grafico-chegada-bu-dados.mjs   (depois: node scripts/auditoria/grafico-chegada-bu.mjs)
import { readFileSync, mkdirSync, writeFileSync, createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const AUD = path.join(RAIZ, 'data', 'parsed', 'auditoria');
const SAIDA = path.join(RAIZ, 'docs', 'pericia', 'graficos', 'dados');
mkdirSync(SAIDA, { recursive: true });

function confere(cond, msg) {
  if (!cond) { console.error(`FALHA: ${msg}`); process.exit(1); }
  console.log(`ok  ${msg}`);
}
function csv(nome, cab, linhas) {
  const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  writeFileSync(path.join(SAIDA, nome), [cab, ...linhas].map((l) => l.map(esc).join(',')).join('\n') + '\n');
  console.log(`gravado docs/pericia/graficos/dados/${nome} (${linhas.length} linhas)`);
}
const resumo = JSON.parse(readFileSync(path.join(AUD, 'chegada-bu', 'resumo.json'), 'utf8'));
const cet = JSON.parse(readFileSync(path.join(AUD, 'cetico-revisor', '28-chegada-bu.json'), 'utf8'));

// ---------- Leitura do arquivo por seção ----------
// Segundos desde as 17:00:00 de Brasília do dia da eleição (2T: 25/10; 1T: 04/10). Vazio -> null.
const base = { '2026-10-25': 0, '2026-10-26': 86400, '2026-10-04': 0, '2026-10-05': 86400 };
function seg(s) {
  if (!s) return null;
  const [d, h] = s.split(' ');
  const [hh, mm, ss] = h.split(':').map(Number);
  if (!(d in base)) throw new Error(`data inesperada: ${s}`);
  return base[d] + hh * 3600 + mm * 60 + ss - 17 * 3600;
}
const secoes = [];
const rl = createInterface({ input: createReadStream(path.join(AUD, 'chegada-bu', 'secoes.csv')), crlfDelay: Infinity });
let cab = null;
for await (const linha of rl) {
  const c = linha.split(',');
  if (!cab) { cab = Object.fromEntries(c.map((k, i) => [k, i])); continue; }
  const g = (k) => c[cab[k]];
  secoes.push({
    uf: g('uf'), fim: seg(g('fim_br')), rec: seg(g('receb_br')), tot: seg(g('tot_br')), rec1: seg(g('receb1_br')),
    comVoto: Number(g('comparecimento') || 0) > 0 || Number(g('v13') || 0) + Number(g('v22') || 0) > 0,
  });
}
const N = secoes.length;
const brasil = secoes.filter((s) => s.uf !== 'zz' && s.fim !== null);
confere(N === 499248, `secoes.csv: ${N.toLocaleString('pt-BR')} seções (todas as do 2º turno, iguais às do 1º)`);
confere(brasil.length === 497897 && N - brasil.length === 1351 && secoes.filter((s) => s.uf === 'zz').length === 1351,
  'hora de emissão conhecida em 497.897 seções do Brasil; as 1.351 do exterior ficam sem ela (sem fuso)');
confere(secoes.every((s) => s.rec !== null && s.tot !== null && s.rec1 !== null), 'todas as seções têm hora de registro e de totalização no 2º turno e hora de registro no 1º');

// ---------- Recontagem por minuto e conferência com por-minuto.csv ----------
const M = 601; // 17:00 até 03:00 do dia seguinte
const porMin = (lista, campo) => { const a = new Array(M).fill(0); for (const s of lista) { const v = s[campo]; if (v !== null && v >= 0 && v < M * 60) a[Math.floor(v / 60)]++; } return a; };
const acumAte = (lista, campo) => { const v = lista.map((s) => s[campo]).filter((x) => x !== null).sort((a, b) => a - b); let i = 0; return Array.from({ length: M }, (_, m) => { while (i < v.length && v[i] < (m + 1) * 60) i++; return i; }); };
const rec2 = porMin(secoes, 'rec'); const tot2 = porMin(secoes, 'tot'); const rec1 = porMin(secoes, 'rec1');
const emiAc = acumAte(brasil, 'fim'); const rec2Ac = acumAte(secoes, 'rec'); const rec1Ac = acumAte(secoes, 'rec1'); const tot2Ac = acumAte(secoes, 'tot');

const [cabPm, ...linhasPm] = readFileSync(path.join(AUD, 'chegada-bu', 'por-minuto.csv'), 'utf8').trim().split(/\r?\n/);
const kp = cabPm.split(',');
const pm = linhasPm.map((l) => Object.fromEntries(l.split(',').map((v, i) => [kp[i], v])));
confere(pm.length === M, 'por-minuto.csv: 601 minutos (17:00 a 03:00)');
const difs = [];
pm.forEach((r, m) => {
  const par = [['emitidas_acum', emiAc[m]], ['recebidas_no_minuto', rec2[m]], ['recebidas_acum', rec2Ac[m]], ['totalizadas_no_minuto', tot2[m]],
    ['totalizadas_acum', tot2Ac[m]], ['t1_recebidas_no_minuto', rec1[m]], ['t1_recebidas_acum', rec1Ac[m]]];
  for (const [k, v] of par) if (Number(r[k]) !== v) difs.push(`${r.hora} ${k}: autor ${r[k]}, recontagem ${v}`);
});
if (difs.length) console.error(difs.slice(0, 20).join('\n'));
confere(difs.length === 0, 'minuto a minuto, 7 colunas: a recontagem por seção é igual ao por-minuto.csv do autor (0 diferença)');

// ---------- Números da afirmação revisada (parecer 28) ----------
const H19 = 2 * 3600; // 19:00:00 em segundos desde 17:00
const emi19 = brasil.filter((s) => s.fim < H19);
confere(emi19.length === 491127 && resumo.b_represamento.emitidasAntes19h === 491127, '491.127 BUs emitidos antes das 19h (Brasil)');
const pctEmi19 = (100 * emi19.length) / brasil.length;
confere(pctEmi19.toFixed(2) === '98.64' && resumo.b_represamento.emitidasAntes19hPct === 98.64, `98,64% das 497.897 seções do Brasil (${pctEmi19.toFixed(4)}%)`);
const rec19 = secoes.filter((s) => s.rec < H19);
confere(rec19.length === 1909 && resumo.a_recebidasAntes19h.secoes === 1909, '1.909 seções registradas como recebidas antes das 19h');
confere(((100 * rec19.length) / N).toFixed(2) === '0.38', `0,38% das 499.248 seções (${((100 * rec19.length) / N).toFixed(4)}%)`);
const rec19Voto = rec19.filter((s) => s.comVoto);
const ultimoComVotoAntes = Math.max(...rec19Voto.map((s) => s.rec));
confere(ultimoComVotoAntes < 11 * 60 && rec19.filter((s) => !s.comVoto).every((s) => s.uf === 'zz'),
  `antes das 19h, todo BU com voto foi registrado até as 17:10 (o último às 17:${String(Math.floor(ultimoComVotoAntes / 60) % 60).padStart(2, '0')}:${String(ultimoComVotoAntes % 60).padStart(2, '0')}); os registros sem voto são todos do exterior`);
const ate1710 = rec19.filter((s) => s.tot < 11 * 60); const depois1710 = rec19.filter((s) => s.tot >= 11 * 60);
const T190254 = 2 * 3600 + 2 * 60 + 54;
confere(ate1710.length === 1870 && resumo.a_recebidasAntes19h.ate1710 === 1870 && depois1710.length === 39 && resumo.a_recebidasAntes19h.entre1710e19 === 39
  && depois1710.every((s) => s.uf === 'zz' && !s.comVoto && s.tot === T190254),
  'divisão do parecer 28: 1.870 registradas e totalizadas até as 17:10; 39 de seções do exterior sem voto, totalizadas às 19:02:54');
const L0 = 2 * 3600 + 3 * 60 + 37; const L1 = 2 * 3600 + 3 * 60 + 56; // 19:03:37 e 19:03:56
const primeiroComVotoDepois = secoes.reduce((m, s) => (s.comVoto && s.rec > ultimoComVotoAntes && s.rec < m ? s.rec : m), Infinity);
confere(primeiroComVotoDepois === L0, 'depois disso, o primeiro BU com voto registrado é das 19:03:37 (nenhum com voto entre 17:10 e 19:03:37)');
const lote = secoes.filter((s) => s.rec >= L0 && s.rec <= L1);
const minuto1903 = secoes.filter((s) => s.rec >= L0 - 37 && s.rec < L0 + 23);
confere(lote.length === 5651 && minuto1903.length === 5651 && lote.every((s) => s.comVoto) && resumo.d_lote1903.secoes === 5651 && cet.b2_lote1903.secoes === 5651,
  '5.651 BUs com voto registrados de 19:03:37 a 19:03:56 (19 segundos), e nenhum outro no minuto 19:03');
const emiDepois = emi19.filter((s) => s.rec >= H19).length;
confere(emiDepois === 490035 && ((100 * emiDepois) / emi19.length).toFixed(2) === '99.78', `dos 491.127 emitidos antes das 19h, 490.035 (${((100 * emiDepois) / emi19.length).toFixed(4)}%) registrados depois das 19h`);

// Paradas
const naJanela = (campo, de, ate) => secoes.filter((s) => s[campo] >= de && s[campo] < ate).length;
const hm = (h, m) => (h - 17) * 3600 + m * 60;
confere(naJanela('rec', hm(19, 48), hm(19, 50)) === 0 && naJanela('tot', hm(19, 48), hm(19, 51)) === 0 && naJanela('rec', hm(19, 50), hm(19, 51)) > 0,
  'parada do 2º turno: 0 registro de 19:48:00 a 19:49:59 e 0 totalização de 19:48:00 a 19:50:59');
confere(rec2[hm(21, 10) / 60] === 2058, '21:10: 2.058 registros no minuto (a fila esvazia)');
confere(naJanela('rec1', hm(18, 2), hm(18, 8)) === 0 && rec1[hm(18, 1) / 60] === 1 && rec1[hm(18, 8) / 60] > 0,
  '1º turno: 1 registro às 18:01 e nenhum de 18:02:00 a 18:07:59 (parada de 18:01 a 18:07)');

// Mesmo segundo em 15 UFs
const prim = new Map();
for (const s of secoes) if (!prim.has(s.uf) || s.rec < prim.get(s.uf)) prim.set(s.uf, s.rec);
const s170510 = 5 * 60 + 10;
const ufs170510 = [...prim].filter(([, v]) => v === s170510).map(([u]) => u).sort();
confere(ufs170510.length === 15, `primeiro registro às 17:05:10 em 15 UFs: ${ufs170510.join(', ').toUpperCase()}`);
const fusos = { ac: -2, am: -1, mt: -1, ro: -1, rr: -1, ms: -1 };
const comFusoDif = ufs170510.filter((u) => fusos[u]);
confere(comFusoDif.length >= 2 && comFusoDif.includes('ac'), `entre elas, UFs com fuso diferente do de Brasília: ${comFusoDif.join(', ').toUpperCase()}`);

// Lotes por segundo (19:30:00 a 19:39:59)
const porSeg = new Array(600).fill(0);
for (const s of secoes) if (s.rec >= hm(19, 30) && s.rec < hm(19, 40)) porSeg[s.rec - hm(19, 30)]++;
const vazios = porSeg.filter((x) => x === 0).length; const maior = Math.max(...porSeg);
confere(vazios === 292 && maior === 190 && cet.b2_porSegundo.t2_1930a1940.segundosVazios === 292 && cet.b2_porSegundo.t2_1930a1940.maior === 190,
  '19:30:00 a 19:39:59: 292 dos 600 segundos sem nenhum registro; o maior segundo teve 190 registros');

// Totalização depois do registro
const atrasos = secoes.map((s) => s.tot - s.rec).sort((a, b) => a - b);
const mediana = atrasos.length % 2 ? atrasos[(atrasos.length - 1) / 2] : (atrasos[atrasos.length / 2 - 1] + atrasos[atrasos.length / 2]) / 2;
confere(mediana === 24 && resumo.b_atrasos.totMenosReceb_s_2t.p50 === 24 && atrasos[0] >= 0, 'registro -> totalização: mediana de 24 s nas 499.248 seções; nenhuma totalizada antes de registrada');
const desde19 = secoes.filter((s) => s.rec >= H19).sort((a, b) => a.rec - b.rec);
function ultrapassadas(folga) {
  const sufMin = new Array(desde19.length + 1).fill(Infinity);
  for (let i = desde19.length - 1; i >= 0; i--) sufMin[i] = Math.min(sufMin[i + 1], desde19[i].tot);
  let j = 0; let n = 0;
  for (const s of desde19) { while (j < desde19.length && desde19[j].rec <= s.rec + folga) j++; if (sufMin[j] < s.tot) n++; }
  return n;
}
const u60 = ultrapassadas(60); const u300 = ultrapassadas(300);
confere(desde19.length === 497339 && u60 === 2721 && u300 === 0 && resumo.b_ordemTotalizacao.ultrapassadasPorRecebidaMaisDe300sDepois === 0,
  `das 497.339 registradas a partir das 19h, ${u300} ultrapassada por outra registrada mais de 5 min depois (${u60} por mais de 60 s)`);

// ---------- CSVs ----------
const hora = (m) => { const t = 17 * 60 + m; const d = t >= 1440; const h = Math.floor((t % 1440) / 60); return `${String(h).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}${d ? ' (dia seguinte)' : ''}`; };
const p = (a, b) => ((100 * a) / b).toFixed(4);
csv('chegada-bu-por-minuto.csv',
  ['hora_brasilia', 'bu_emitidos_2t_acumulado', 'bu_emitidos_2t_pct_das_497897_do_brasil', 'secoes_registradas_2t_no_minuto', 'secoes_registradas_2t_acumulado', 'secoes_registradas_2t_pct_das_499248',
    'secoes_totalizadas_2t_no_minuto', 'secoes_registradas_1t_no_minuto', 'secoes_registradas_1t_acumulado', 'secoes_registradas_1t_pct_das_499248'],
  pm.map((_, m) => [hora(m), emiAc[m], p(emiAc[m], brasil.length), rec2[m], rec2Ac[m], p(rec2Ac[m], N), tot2[m], rec1[m], rec1Ac[m], p(rec1Ac[m], N)]));

// Tabela "até HH:MM" (antes desse horário), igual à a_cobertura do autor
const horas = ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '22:00', '23:00'];
const linhasHora = horas.map((hh) => {
  const [h, mi] = hh.split(':').map(Number); const t = hm(h, mi);
  const e = brasil.filter((s) => s.fim < t).length; const r = secoes.filter((s) => s.rec < t).length; const r1 = secoes.filter((s) => s.rec1 < t).length;
  const a = resumo.a_cobertura.find((x) => x.hora === hh);
  confere(a && a.emitidas === e && a.recebidas === r && a.t1_recebidas === r1, `até ${hh}: emitidos ${e}, registrados 2T ${r}, registrados 1T ${r1} (iguais à a_cobertura do autor)`);
  return [hh, e, ((100 * e) / brasil.length).toFixed(2), r, ((100 * r) / N).toFixed(2), r1, ((100 * r1) / N).toFixed(2)];
});
csv('chegada-bu-por-hora.csv', ['ate_hora_brasilia', 'bu_emitidos_2t', 'bu_emitidos_2t_pct_brasil', 'secoes_registradas_2t', 'secoes_registradas_2t_pct', 'secoes_registradas_1t', 'secoes_registradas_1t_pct'], linhasHora);

csv('chegada-bu-marcos.csv', ['medida', 'valor', 'conferido_em'], [
  ['seções do 2º turno (todas)', N, 'secoes.csv'],
  ['seções do Brasil com hora de emissão do BU', brasil.length, 'secoes.csv'],
  ['BUs emitidos antes das 19h (Brasil)', emi19.length, 'secoes.csv; resumo.json b_represamento'],
  ['BUs emitidos antes das 19h, % do Brasil', pctEmi19.toFixed(2), 'secoes.csv'],
  ['seções registradas como recebidas antes das 19h', rec19.length, 'secoes.csv; resumo.json a_recebidasAntes19h'],
  ['  das quais registradas e totalizadas até as 17:10', ate1710.length, 'secoes.csv; resumo.json a_recebidasAntes19h'],
  ['  das quais do exterior sem voto, totalizadas às 19:02:54', depois1710.length, 'secoes.csv; resumo.json a_recebidasAntes19h'],
  ['primeiro BU com voto registrado depois das 17:10', '19:03:37', 'secoes.csv'],
  ['BUs registrados de 19:03:37 a 19:03:56', lote.length, 'secoes.csv; resumo.json d_lote1903; 28-chegada-bu.json'],
  ['emitidos antes das 19h e registrados depois das 19h', emiDepois, 'secoes.csv; resumo.json b_represamento'],
  ['  % dos emitidos antes das 19h', ((100 * emiDepois) / emi19.length).toFixed(2), 'secoes.csv'],
  ['parada do registro (2º turno)', '19:48 a 19:50', 'secoes.csv'],
  ['registros no minuto 21:10 (a fila esvazia)', 2058, 'secoes.csv'],
  ['parada do registro (1º turno)', '18:01 a 18:07', 'secoes.csv'],
  ['UFs com o primeiro registro às 17:05:10', ufs170510.length, 'secoes.csv'],
  ['segundos sem registro de 19:30:00 a 19:39:59 (de 600)', vazios, 'secoes.csv; 28-chegada-bu.json'],
  ['maior número de registros num segundo, 19:30 a 19:40', maior, 'secoes.csv; 28-chegada-bu.json'],
  ['registro -> totalização, mediana (segundos)', mediana, 'secoes.csv; resumo.json b_atrasos'],
  ['seções ultrapassadas por outra registrada mais de 5 min depois', u300, 'secoes.csv; resumo.json b_ordemTotalizacao'],
]);
