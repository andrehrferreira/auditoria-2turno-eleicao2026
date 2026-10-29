// Caminhos fora do fluxo normal (perfil engenheiro-seguranca-urna): urna de contingência/reserva (tipoUrna 3, 4, 6),
// RED (recuperação de dados, tipoArquivo 2) e Sistema de Apuração (SA, tipoArquivo 3..6). Quantas, onde, concentração.
// Lê o banco (somente leitura) e, para o SA, decodifica o BU (motivo de uso do SA). Se a varredura de logs do perfil
// já rodou (seguranca-varrer-logs.mjs), usa-a para saber o modelo da urna ORIGINAL nas seções com urna reserva e quantos
// votos ficaram em cada urna.
// Uso: node scripts/auditoria/seguranca-caminhos-fora-fluxo.mjs [--turno 2]
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { parseArgs } from 'node:util';
import { decodificarArquivo } from '../../src/asn1.js';
import { DIR_DADOS } from '../../src/config.js';
import { arquivoBu } from '../../src/esquemas.js';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' } } });
const turno = Number(values.turno);
const { db, fonte, ponteiro } = await abrirLeitura();
console.error(`banco: ${fonte}; cargas na cópia: ${JSON.stringify(ponteiro?.cargas ?? null)}`);
const q = (sql, ...p) => db.prepare(sql).all(...p);
const pct = (a, b) => (b ? (100 * a / b).toFixed(3) : '-');

// Cauda superior de Poisson P(X >= k | lambda)
function caudaPoisson(k, lambda) {
  if (k <= 0) return 1;
  let termo = Math.exp(-lambda);
  let acumulado = termo;
  for (let i = 1; i < k; i++) { termo *= lambda / i; acumulado += termo; }
  return Math.max(0, 1 - acumulado);
}

console.log(`# Caminhos fora do fluxo normal — ${turno}º turno\n`);
console.log('## Por tipo de urna e tipo de arquivo (BU)');
console.table(q('SELECT turno, tipo_urna, tipo_arquivo, situacao, COUNT(*) AS secoes FROM secao GROUP BY 1,2,3,4 ORDER BY 1,5 DESC'));

const total = q('SELECT COUNT(*) n FROM secao WHERE turno = ? AND situacao = \'completa\'', turno)[0].n;
const especiais = q(`SELECT uf, municipio, zona, secao, tipo_urna, tipo_arquivo, modelo_urna, comparecimento, status_aux, hash
  FROM secao WHERE turno = ? AND situacao = 'completa' AND (tipo_urna != 'secao' OR tipo_arquivo != 'votacaoUE')`, turno);
const reserva = especiais.filter((s) => s.tipo_urna === 'reservaSecao' || s.tipo_urna === 'reservaEncerrandoSecao');
const taxa = reserva.length / total;
console.log(`\nSeções completas: ${total}. Urna reserva (tipo 4 ou 6): ${reserva.length} (${pct(reserva.length, total)}%).`);

console.log('\n## Urna reserva por UF (taxa por 1.000 seções; z de Poisson contra a taxa nacional)');
const porUf = q(`SELECT uf, COUNT(*) AS secoes, SUM(tipo_urna IN ('reservaSecao','reservaEncerrandoSecao')) AS reserva,
  SUM(tipo_arquivo = 'votacaoRED') AS red, SUM(tipo_arquivo LIKE 'sa%') AS sa FROM secao WHERE turno = ? AND situacao = 'completa' GROUP BY uf`, turno)
  .map((r) => { const esp = r.secoes * taxa; return { ...r, por1000: (1000 * r.reserva / r.secoes).toFixed(2), esperado: esp.toFixed(1), z: ((r.reserva - esp) / Math.sqrt(esp)).toFixed(1) }; })
  .sort((a, b) => b.por1000 - a.por1000);
console.table(porUf);

console.log('\n## Zonas com mais urnas reserva (Poisson contra a taxa da própria UF; Bonferroni pelo nº de zonas)');
const taxaUf = Object.fromEntries(porUf.map((r) => [r.uf, r.reserva / r.secoes]));
const zonas = q(`SELECT uf, municipio, zona, COUNT(*) AS secoes, SUM(tipo_urna IN ('reservaSecao','reservaEncerrandoSecao')) AS reserva
  FROM secao WHERE turno = ? AND situacao = 'completa' GROUP BY uf, municipio, zona`, turno);
const nZonas = zonas.length;
const zonasAvaliadas = zonas.map((z) => {
  const lambda = z.secoes * taxaUf[z.uf];
  const p = caudaPoisson(z.reserva, lambda);
  return { ...z, esperado: lambda.toFixed(2), por1000: (1000 * z.reserva / z.secoes).toFixed(1), p, pBonferroni: Math.min(1, p * nZonas) };
}).sort((a, b) => a.p - b.p);
console.table(zonasAvaliadas.slice(0, 20).map((z) => ({ ...z, p: z.p.toExponential(2), pBonferroni: z.pBonferroni.toExponential(2) })));
console.log(`Zonas (município × zona) avaliadas: ${nZonas}; com p Bonferroni < 0,05: ${zonasAvaliadas.filter((z) => z.pBonferroni < 0.05).length}.`);
const maxSecao = q(`SELECT uf, municipio, zona, COUNT(*) n FROM secao WHERE turno = ? AND tipo_urna IN ('reservaSecao','reservaEncerrandoSecao') GROUP BY 1,2,3 ORDER BY n DESC LIMIT 5`, turno);
console.log('Maiores contagens absolutas por zona:', maxSecao.map((r) => `${r.uf} ${r.municipio}/${r.zona}: ${r.n}`).join('; '));

console.log('\n## Urna reserva por modelo da urna que ficou na seção (BU) — taxa sobre o total de seções do modelo');
console.table(q(`SELECT modelo_urna, COUNT(*) AS secoes, SUM(tipo_urna IN ('reservaSecao','reservaEncerrandoSecao')) AS reserva
  FROM secao WHERE turno = ? AND situacao = 'completa' GROUP BY 1`, turno).map((r) => ({ ...r, pct: pct(r.reserva, r.secoes) })));

// Urna reserva já em uso no turno anterior (mesmo nº interno) × troca nova. Só onde o outro turno já está no banco.
if (turno === 2) {
  console.log('\n## 2º turno × 1º turno na mesma seção (só seções com o 1º turno carregado)');
  const cruz = q(`SELECT s1.tipo_urna AS tipo_1t, s2.tipo_urna AS tipo_2t, s1.numero_interno_urna = s2.numero_interno_urna AS mesma_urna, COUNT(*) AS secoes
    FROM secao s2 JOIN secao s1 ON s1.turno = 1 AND s1.uf = s2.uf AND s1.municipio = s2.municipio AND s1.zona = s2.zona AND s1.secao = s2.secao
    WHERE s2.turno = 2 GROUP BY 1,2,3 ORDER BY 4 DESC`);
  console.table(cruz);
  const ufs1t = q('SELECT DISTINCT uf FROM secao WHERE turno = 1').map((r) => r.uf);
  console.log(`UFs com o 1º turno no banco: ${ufs1t.length} (${ufs1t.join(',')})`);
  console.log('Zonas com mais trocas NOVAS no 2º turno (reserva no 2º turno com nº de urna diferente do 1º turno; Poisson contra a taxa da UF, Bonferroni):');
  const novas = q(`SELECT s2.uf, s2.municipio, s2.zona, COUNT(*) AS secoes,
      SUM(s2.tipo_urna IN ('reservaSecao','reservaEncerrandoSecao') AND s1.numero_interno_urna != s2.numero_interno_urna) AS novas,
      SUM(s2.tipo_urna IN ('reservaSecao','reservaEncerrandoSecao') AND s1.numero_interno_urna = s2.numero_interno_urna) AS herdadas_1t
    FROM secao s2 JOIN secao s1 ON s1.turno = 1 AND s1.uf = s2.uf AND s1.municipio = s2.municipio AND s1.zona = s2.zona AND s1.secao = s2.secao
    WHERE s2.turno = 2 GROUP BY 1,2,3`);
  const porUfN = {};
  for (const z of novas) { const u = (porUfN[z.uf] ??= { s: 0, n: 0 }); u.s += z.secoes; u.n += z.novas; }
  const avaliadas = novas.map((z) => { const lambda = z.secoes * porUfN[z.uf].n / porUfN[z.uf].s; const p = caudaPoisson(z.novas, lambda); return { ...z, esperado: lambda.toFixed(2), p, pB: Math.min(1, p * novas.length) }; })
    .sort((a, b) => a.p - b.p);
  console.table(avaliadas.slice(0, 15).map((z) => ({ ...z, p: z.p.toExponential(2), pB: z.pB.toExponential(2) })));
  console.log(`Zonas avaliadas: ${novas.length}; com p Bonferroni < 0,05: ${avaliadas.filter((z) => z.pB < 0.05).length}.`);
}

// Votação de presidente em seções com urna reserva × demais seções da mesma zona (pareado por zona)
console.log('\n## Voto de presidente: seções com urna reserva × demais seções da mesma zona');
const pres = q(`SELECT s.uf, s.municipio, s.zona, s.tipo_urna IN ('reservaSecao','reservaEncerrandoSecao') AS reserva,
  b.numero, SUM(b.quantidade) AS votos FROM secao s JOIN voto_bu b USING (turno, uf, municipio, zona, secao)
  WHERE s.turno = ? AND s.situacao = 'completa' AND b.cargo = 1 AND b.tipo_voto = 'nominal' GROUP BY 1,2,3,4,5`, turno);
const porZona = new Map();
for (const r of pres) {
  const k = `${r.uf}/${r.municipio}/${r.zona}`;
  const z = porZona.get(k) ?? { reserva: {}, normal: {} };
  const lado = r.reserva ? z.reserva : z.normal;
  lado[r.numero] = (lado[r.numero] ?? 0) + r.votos;
  porZona.set(k, z);
}
const numeros = [...new Set(pres.map((r) => r.numero))].sort();
let somaR = 0; let somaN = 0; let difPond = 0; let pesos = 0; let zonasComReserva = 0;
for (const z of porZona.values()) {
  const tr = Object.values(z.reserva).reduce((a, b) => a + b, 0);
  const tn = Object.values(z.normal).reduce((a, b) => a + b, 0);
  if (!tr || !tn) continue;
  zonasComReserva++;
  const a = numeros[0];
  const fr = (z.reserva[a] ?? 0) / tr;
  const fn = (z.normal[a] ?? 0) / tn;
  difPond += (fr - fn) * tr; pesos += tr; somaR += tr; somaN += tn;
}
console.log(`Candidato ${numeros[0]}: diferença média (reserva − demais da mesma zona), ponderada pelos votos nominais das seções com reserva: ${(100 * difPond / pesos).toFixed(2)} p.p. em ${zonasComReserva} zonas (${somaR} votos em seções com reserva).`);

console.log('\n## RED (votacaoRED) e Sistema de Apuração');
const red = especiais.filter((s) => s.tipo_arquivo === 'votacaoRED');
console.table(red.map(({ hash, ...r }) => r));

const sa = especiais.filter((s) => s.tipo_arquivo.startsWith('sa'));
const motivos = {};
const saLinhas = [];
for (const s of sa) {
  const dir = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', s.uf, s.municipio, s.zona, s.secao, s.hash);
  const nome = readdirSync(dir).find((n) => n.endsWith('-busa.dat') || n.endsWith('-bu.dat'));
  const bu = decodificarArquivo(arquivoBu, readFileSync(path.join(dir, nome))).conteudo;
  const motivo = JSON.stringify(bu.urna.motivoUtilizacaoSA);
  motivos[motivo] = (motivos[motivo] ?? 0) + 1;
  const e = bu.resultadosVotacaoPorEleicao[0];
  const comp = e.resultadosVotacao[0].qtdComparecimento;
  saLinhas.push({ uf: s.uf, municipio: s.municipio, zona: s.zona, secao: s.secao, aptos: e.qtdEleitoresAptos, comparecimentoCargo: comp, qtdEleitoresCompareceram: bu.qtdEleitoresCompareceram, gerado: bu.cabecalho.dataGeracao });
}
console.log(`SA: ${sa.length} seções. Motivos:`, motivos);
console.table(saLinhas);
console.log(`SA: soma de aptos ${saLinhas.reduce((a, r) => a + r.aptos, 0)}, soma do comparecimento por cargo ${saLinhas.reduce((a, r) => a + r.comparecimentoCargo, 0)}.`);

console.log('\n## Seções sem arquivo (aux: "Nao instalada")');
console.table(q(`SELECT uf, COUNT(*) AS secoes, GROUP_CONCAT(municipio || '/' || zona || '/' || secao, ' ') AS onde FROM secao WHERE turno = ? AND situacao = 'sem_arquivo' GROUP BY uf`, turno));

// Com a varredura de logs: modelo da urna original e votos antes/depois da troca
const dirVarredura = path.join(DIR_DADOS, 'parsed', 'auditoria', 'engenheiro-seguranca-urna', `${turno}t`);
if (existsSync(dirVarredura)) {
  const alvo = new Set(reserva.map((s) => `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`));
  const modeloOriginal = {};
  const parcelaReserva = [];
  const divergeBu = [];
  const urnasPorId = new Map();
  const compPorId = new Map(reserva.map((s) => [`${s.uf}/${s.municipio}/${s.zona}/${s.secao}`, s.comparecimento]));
  let semLogOriginal = 0; let lidas = 0;
  for (const arq of readdirSync(dirVarredura).filter((n) => n.endsWith('.secoes.jsonl'))) {
    for (const linha of readFileSync(path.join(dirVarredura, arq), 'utf8').split('\n')) {
      if (!linha) continue;
      const r = JSON.parse(linha);
      if (!alvo.has(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`)) continue;
      lidas++;
      urnasPorId.set(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, new Set(r.logs.flatMap((l) => l.urnas)).size);
      const original = r.logs.filter((l) => l.profundidade > 0);
      const instalada = r.logs.filter((l) => l.profundidade === 0);
      if (!original.length) { semLogOriginal++; continue; }
      for (const l of original) modeloOriginal[l.modelo] = (modeloOriginal[l.modelo] ?? 0) + 1;
      const v = (ls) => ls.flatMap((l) => l.boots).reduce((a, b) => a + b.votos, 0);
      const vo = v(original); const vi = v(instalada);
      if (vo + vi) parcelaReserva.push(vi / (vo + vi));
      const bu = compPorId.get(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`);
      if (bu !== vo + vi) divergeBu.push(`${r.uf}/${r.municipio}/${r.zona}/${r.secao} BU=${bu} original=${vo} reserva=${vi}`);
    }
  }
  if (lidas) {
    parcelaReserva.sort((a, b) => a - b);
    const qt = (p) => parcelaReserva[Math.floor(p * (parcelaReserva.length - 1))]?.toFixed(3);
    console.log(`\n## Urna reserva, pelos logs (${lidas} de ${reserva.length} seções já varridas)`);
    console.log(`Sem log da urna original dentro do pacote: ${semLogOriginal}.`);
    console.log(`Votos no log da original + no log da reserva ≠ comparecimento do BU: ${divergeBu.length}`, divergeBu.slice(0, 20));
    console.log('Modelo da urna ORIGINAL (que foi substituída):', modeloOriginal);
    // Histórico de códigos de carga no BU (uma entrada por urna que gravou a MV) × nº de urnas com log no pacote.
    // Mais urnas no histórico do que logs no pacote = votos dados numa urna cujo log não foi publicado.
    const hist = {}; const faltaLog = [];
    for (const s of reserva) {
      const dir = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', s.uf, s.municipio, s.zona, s.secao, s.hash);
      const nome = readdirSync(dir).find((n) => n.endsWith('-bu.dat'));
      const n = decodificarArquivo(arquivoBu, readFileSync(path.join(dir, nome))).conteudo.historicoCodigosCarga?.length ?? 0;
      hist[n] = (hist[n] ?? 0) + 1;
      const urnas = urnasPorId.get(`${s.uf}/${s.municipio}/${s.zona}/${s.secao}`);
      if (urnas && n > urnas) faltaLog.push(`${s.uf}/${s.municipio}/${s.zona}/${s.secao} histórico=${n} urnas com log=${urnas}`);
    }
    console.log('Entradas em historicoCodigosCarga do BU (seções com urna reserva):', hist);
    console.log(`Seções com mais urnas no histórico de carga do que urnas com log no pacote: ${faltaLog.length}`, faltaLog.slice(0, 40));
    console.log(`Parcela dos votos dados na urna reserva: p10 ${qt(0.1)}, mediana ${qt(0.5)}, p90 ${qt(0.9)}; 0 votos na original: ${parcelaReserva.filter((x) => x === 1).length}.`);
    console.log('Taxa de substituição por modelo original (denominador: seções do modelo no BU, aproximação):');
    const porModelo = Object.fromEntries(q('SELECT modelo_urna, COUNT(*) n FROM secao WHERE turno = ? AND situacao = \'completa\' GROUP BY 1', turno).map((r) => [String(r.modelo_urna).toUpperCase(), r.n]));
    for (const [m, n] of Object.entries(modeloOriginal)) console.log(`  ${m}: ${n} de ${porModelo[m] ?? '?'} (${pct(n, porModelo[m])}%)`);
  }
}
