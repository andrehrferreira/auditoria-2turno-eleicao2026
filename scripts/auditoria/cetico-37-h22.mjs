// Parecer cético 37, H22 (exterior e fluxo especial): reprodução por caminho próprio e teste das premissas de relógio.
// Não usa politico-h22-*.mjs para medir. Lê da cópia de leitura: secao, secao_eleicao, voto_bu (cargo 1), perfil_log (uf = 'zz').
// Só usa politico-h22-lib.mjs para o país de cada cidade (metadado do eleitorado_local_votacao), nada mais.
//   1. zeros de processo: comparecimento > aptos; BU ≠ votos computados no log; votos fora da janela; intervalo mínimo < 15 s;
//      seção presente num turno só; seções de SA iguais nos dois turnos; SA de 2022 (CEFT) × 2026.
//   2. perfil horário do comparecimento a mais (2º − 1º turno, seções com urna nos dois turnos), total e por grupo de fuso.
//   3. relógio das urnas comuns do exterior: a Europa saiu do horário de verão na madrugada do 2º turno. Se o relógio da
//      urna não acompanhou, a hora de registro dos mesários (antes da abertura, relógio da urna) sobe 1 h no 2º turno na
//      Europa e não nos países sem mudança. Diferença-em-diferenças das medianas, universo completo.
//   4. SA: hora de emissão do BU × fim da votação no posto (17 h locais), com tabela de fusos própria (deslocamentos
//      escritos à mão para 04/10 e 25/10/2026), sob várias premissas de relógio da máquina do SA (Brasília, +1 h, UTC...);
//      e a âncora sem premissa: recebido_tse (relógio do servidor, hora de Brasília) no 2º turno.
// Não grava título de mesário nem de eleitor: de `registros` só sai a hora.
// Uso: node scripts/auditoria/cetico-37-h22.mjs     Saída: data/parsed/auditoria/cetico-revisor/37-h22.json
import { writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { lerLocaisZZ } from './politico-h22-lib.mjs';
import { entradasZip, linhasCsv } from './contagem-zip.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const SAIDA = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico-revisor');
await mkdir(SAIDA, { recursive: true });
const { db, fonte } = await abrirLeitura();
const { cidades } = await lerLocaisZZ();
const med = (v) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
const K = (m, z, s) => `${Number(m)}|${Number(z)}|${Number(s)}`;
const res = { fonte: path.basename(fonte) };

// ---------- leitura ----------
const sec = new Map();
for (const r of db.prepare(`SELECT turno, municipio, zona, secao, situacao, tipo_arquivo, comparecimento, emissao, recebido_tse, hash, numero_interno_urna urna
  FROM secao WHERE uf = 'zz'`).iterate()) {
  const k = K(r.municipio, r.zona, r.secao);
  if (!sec.has(k)) sec.set(k, { mun: Number(r.municipio), t: {} });
  sec.get(k).t[r.turno] = { ...r, votos: 0, v13: 0, v22: 0, aptos: null, log: null };
}
for (const r of db.prepare(`SELECT turno, municipio, zona, secao, aptos FROM secao_eleicao WHERE uf = 'zz' AND eleicao IN (6257, 6258)`).iterate()) {
  const t = sec.get(K(r.municipio, r.zona, r.secao))?.t[r.turno]; if (t) t.aptos = r.aptos;
}
for (const r of db.prepare(`SELECT turno, municipio, zona, secao, tipo_voto, numero, SUM(quantidade) q FROM voto_bu WHERE uf = 'zz' AND cargo = 1 GROUP BY 1,2,3,4,5,6`).iterate()) {
  const t = sec.get(K(r.municipio, r.zona, r.secao))?.t[r.turno]; if (!t) continue;
  t.votos += r.q; if (r.tipo_voto === 'nominal' && r.numero === 13) t.v13 += r.q; if (r.tipo_voto === 'nominal' && r.numero === 22) t.v22 += r.q;
}
for (const r of db.prepare(`SELECT turno, municipio, zona, secao, hash, votos_computados, votos_fora_da_janela, intervalo_minimo_entre_votos, dados
  FROM perfil_log WHERE uf = 'zz'`).iterate()) {
  const t = sec.get(K(r.municipio, r.zona, r.secao))?.t[r.turno]; if (!t || t.hash !== r.hash) continue;
  const d = JSON.parse(r.dados)?.log ?? {};
  const horasMesario = (d.mesarios?.registros ?? []).filter((x) => x.momento === 'antes' && Number.isFinite(x.hora)).map((x) => x.hora);
  t.log = { votos: r.votos_computados, fora: r.votos_fora_da_janela, intMin: r.intervalo_minimo_entre_votos, porHora: d.votosPorHoraLocal ?? null,
    primeiroMesario: horasMesario.length ? Math.min(...horasMesario) : null, pronta: d.urnaPronta ?? null };
}
const cat = (t) => (!t ? 'ausente' : t.situacao === 'sem_arquivo' ? 'nao_instalada' : /^sa/.test(t.tipo_arquivo ?? '') ? 'sa' : 'urna');

// ---------- 1. zeros de processo ----------
const p = { secoes: sec.size, porTurno: {}, soNumTurno: 0, compAcimaAptos: 0, buDifereLog: { 1: 0, 2: 0 }, urnaSemLog: { 1: 0, 2: 0 },
  foraJanela: { 1: 0, 2: 0 }, intervaloMinimo: { 1: Infinity, 2: Infinity }, abaixo15s: { 1: 0, 2: 0 }, votosBuDiferemSecao: { 1: 0, 2: 0 } };
for (const s of sec.values()) {
  if (!s.t[1] || !s.t[2]) p.soNumTurno++;
  for (const t of [1, 2]) {
    const x = s.t[t]; const c = cat(x);
    p.porTurno[t] ??= {}; p.porTurno[t][c] = (p.porTurno[t][c] ?? 0) + 1;
    if (!x || c === 'nao_instalada') continue;
    if (x.votos > x.aptos) p.compAcimaAptos++;
    if (c !== 'urna') continue;
    if (x.comparecimento !== x.votos) p.votosBuDiferemSecao[t]++;
    if (!x.log) { p.urnaSemLog[t]++; continue; }
    if (x.log.votos !== x.votos) p.buDifereLog[t]++;
    p.foraJanela[t] += x.log.fora ?? 0;
    if (x.log.intMin != null) { p.intervaloMinimo[t] = Math.min(p.intervaloMinimo[t], x.log.intMin); if (x.log.intMin < 15) p.abaixo15s[t]++; }
  }
}
const sa = (t) => new Set([...sec].filter(([, s]) => cat(s.t[t]) === 'sa').map(([k]) => k));
p.sa = { 1: sa(1).size, 2: sa(2).size, iguais: [...sa(1)].filter((k) => sa(2).has(k)).length };
p.comparecimento = { 1: [...sec.values()].reduce((a, s) => a + (s.t[1]?.votos ?? 0), 0), 2: [...sec.values()].reduce((a, s) => a + (s.t[2]?.votos ?? 0), 0) };
p.aptos = { 1: [...sec.values()].reduce((a, s) => a + (s.t[1]?.aptos ?? 0), 0), 2: [...sec.values()].reduce((a, s) => a + (s.t[2]?.aptos ?? 0), 0) };
// SA de 2022 (CEFT 1º turno, exterior)
{
  const dir = path.join(RAIZ, 'data', 'raw', 'dadosabertos', 'correspondencias', '2022-1t');
  const arq = (await readdir(dir)).find((n) => /^CEFT_.*ZZ.*\.zip$/i.test(n));
  const set = new Set();
  if (arq) {
    const zip = path.join(dir, arq);
    const e = (await entradasZip(zip)).find((x) => x.nome.toLowerCase().endsWith('.csv'));
    for await (const l of linhasCsv(zip, e)) {
      const o = Object.fromEntries(Object.entries(l).map(([a, b]) => [a.trim(), (b ?? '').trim()]));
      if (/apura/i.test(o.DS_ORIGEM_VOTO)) set.add(K(o.CD_MUNICIPIO, o.NR_ZONA, o.NR_SECAO));
    }
  }
  p.sa2022 = { arquivo: arq ?? null, secoes: set.size, tambemSa2026: [...sa(2)].filter((k) => set.has(k)).length };
}
res.processo = p;

// ---------- 2 e 3. grupos de fuso ----------
// Mudaram de horário entre 04/10 e 25/10/2026 (fim do horário de verão europeu, de Israel e do Líbano em 25/10; Palestina em 24/10).
// Não mudaram: Américas (EUA e Canadá só em 01/11; Cuba 01/11; Chile, Paraguai, México sem mudança no período), Ásia, África,
// Rússia, Turquia, Cáucaso; Austrália e Nova Zelândia já estavam no horário de verão no 1º turno (início em 04/10 às 2 h e 27/09).
const NAO_MUDA_EUROPA = new Set(['RÚSSIA', 'TURQUIA', 'GEÓRGIA', 'ARMÊNIA', 'AZERBAIJÃO']);
const MUDA_ASIA = new Set(['ISRAEL', 'LÍBANO', 'TERRITÓRIOS PALESTINOS']);
const grupo = (mun) => {
  const c = cidades.get(String(mun)) ?? cidades.get(String(mun).padStart(5, '0'));
  if (!c) return 'sem_pais';
  if ((c.continente === 'Europa' && !NAO_MUDA_EUROPA.has(c.pais)) || MUDA_ASIA.has(c.pais)) return 'mudou';
  return 'nao_mudou';
};
const horas = { total: { 1: Array(24).fill(0), 2: Array(24).fill(0) }, mudou: { 1: Array(24).fill(0), 2: Array(24).fill(0) }, nao_mudou: { 1: Array(24).fill(0), 2: Array(24).fill(0) } };
const mesario = { mudou: { 1: [], 2: [] }, nao_mudou: { 1: [], 2: [] } };
let pareadas = 0, semPais = 0;
for (const s of sec.values()) {
  const a = s.t[1], b = s.t[2];
  if (cat(a) !== 'urna' || cat(b) !== 'urna' || !a.log?.porHora || !b.log?.porHora || !a.votos || !b.votos) continue;
  pareadas++;
  const g = grupo(s.mun); if (g === 'sem_pais') { semPais++; continue; }
  for (const t of [1, 2]) s.t[t].log.porHora.forEach((v, h) => { horas.total[t][h] += v; horas[g][t][h] += v; });
  if (a.log.primeiroMesario != null && b.log.primeiroMesario != null) { mesario[g][1].push(a.log.primeiroMesario / 3600); mesario[g][2].push(b.log.primeiroMesario / 3600); }
}
const delta = (o) => o[2].map((v, h) => v - o[1][h]);
res.perfilHorario = { pareadas, semPais, deltaTotal: delta(horas.total).slice(6, 20), deltaMudou: delta(horas.mudou).slice(6, 20), deltaNaoMudou: delta(horas.nao_mudou).slice(6, 20),
  horas: '06 a 19 h (relógio da urna)',
  manhaAte12: { total: delta(horas.total).slice(0, 13).reduce((a, v) => a + v, 0), mudou: delta(horas.mudou).slice(0, 13).reduce((a, v) => a + v, 0), naoMudou: delta(horas.nao_mudou).slice(0, 13).reduce((a, v) => a + v, 0) },
  tardeDe14: { total: delta(horas.total).slice(14).reduce((a, v) => a + v, 0), mudou: delta(horas.mudou).slice(14).reduce((a, v) => a + v, 0), naoMudou: delta(horas.nao_mudou).slice(14).reduce((a, v) => a + v, 0) } };
const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
res.relogioUrnas = {
  medida: 'mediana da hora do primeiro registro de mesário antes da abertura (relógio da urna, horas decimais)',
  mudou: { secoes: mesario.mudou[1].length, t1: r2(med(mesario.mudou[1])), t2: r2(med(mesario.mudou[2])), dif: r2(med(mesario.mudou[2].map((v, i) => v - mesario.mudou[1][i]))) },
  naoMudou: { secoes: mesario.nao_mudou[1].length, t1: r2(med(mesario.nao_mudou[1])), t2: r2(med(mesario.nao_mudou[2])), dif: r2(med(mesario.nao_mudou[2].map((v, i) => v - mesario.nao_mudou[1][i]))) },
  mudouComAtraso45min: mesario.mudou[2].filter((v, i) => v - mesario.mudou[1][i] >= 0.75).length,
  naoMudouComAtraso45min: mesario.nao_mudou[2].filter((v, i) => v - mesario.nao_mudou[1][i] >= 0.75).length,
};

// ---------- 4. SA: emissão × fechamento ----------
// deslocamento em horas em relação a UTC em 04/10 e 25/10/2026 (tabela própria)
const OFF = { 29173: [5.75, 5.75], 29254: [0, 0], 29270: [0, 0], 29297: [3, 3], 29300: [1, 1], 29394: [0, 0], 29564: [-4, -4], 29580: [-3, -3],
  29645: [9, 9], 29750: [7, 7], 29777: [-4, -4], 29858: [3, 2], 29912: [1, 1], 30163: [3, 3], 30171: [5.5, 5.5], 30295: [-3, -3], 30325: [-4, -4],
  30333: [-4, -4], 30430: [-3, -3], 30546: [3, 2], 30597: [3.5, 3.5], 30686: [2, 2], 30708: [1, 1], 30821: [2, 2], 38962: [3, 3], 39102: [4, 4],
  99155: [-3, -3], 99180: [-4, -4], 99473: [3, 3] };
const min = (hhmmss) => { const [h, m, s] = hhmmss.split(':').map(Number); return h * 60 + m + (s ?? 0) / 60; };
const linhasSA = [];
for (const r of db.prepare(`SELECT turno, uf, municipio, zona, secao, emissao, recebido_tse FROM secao WHERE tipo_arquivo LIKE 'sa%'`).iterate()) {
  const off = r.uf === 'zz' ? OFF[Number(r.municipio)]?.[r.turno - 1] : -3;
  if (off == null) { linhasSA.push({ ...r, semFuso: true }); continue; }
  const fechaBrt = 17 * 60 - (off + 3) * 60; // 17 h locais em minutos do relógio de Brasília (pode ser < 0 no Oriente)
  const emi = min(r.emissao.slice(11));
  const rec = r.recebido_tse ? min(r.recebido_tse.slice(11)) : null;
  linhasSA.push({ turno: r.turno, uf: r.uf, municipio: r.municipio, emissaoMenosFechamentoMin: Math.round(emi - fechaBrt), recebidoMenosFechamentoMin: rec == null ? null : Math.round(rec - fechaBrt),
    recebidoMenosEmissaoMin: rec == null ? null : Math.round(rec - emi) });
}
const premissas = {};
for (const [nome, delta] of [['relogio_Brasilia', 0], ['adiantado_30min', 30], ['adiantado_1h', 60], ['UTC (adiantado 3 h)', 180], ['atrasado_1h', -60]]) {
  // relógio do SA adiantado δ minutos em relação a Brasília: hora real = registrada − δ
  premissas[nome] = { 1: linhasSA.filter((x) => x.turno === 1 && x.emissaoMenosFechamentoMin - delta < 0).length, 2: linhasSA.filter((x) => x.turno === 2 && x.emissaoMenosFechamentoMin - delta < 0).length };
}
res.sa = { bus: linhasSA.length, semFuso: linhasSA.filter((x) => x.semFuso).length, folgaMinimaMin: { 1: Math.min(...linhasSA.filter((x) => x.turno === 1).map((x) => x.emissaoMenosFechamentoMin)), 2: Math.min(...linhasSA.filter((x) => x.turno === 2).map((x) => x.emissaoMenosFechamentoMin)) },
  emitidosAntesDoFechamentoPorPremissa: premissas,
  ancoraServidor2T: { comRecebido: linhasSA.filter((x) => x.recebidoMenosFechamentoMin != null).length, recebidosAntesDoFechamento: linhasSA.filter((x) => x.recebidoMenosFechamentoMin != null && x.recebidoMenosFechamentoMin < 0).length,
    menorFolgaRecebidoMin: Math.min(...linhasSA.filter((x) => x.recebidoMenosFechamentoMin != null).map((x) => x.recebidoMenosFechamentoMin)),
    recebidoMenosEmissaoMin: { min: Math.min(...linhasSA.filter((x) => x.recebidoMenosEmissaoMin != null).map((x) => x.recebidoMenosEmissaoMin)), max: Math.max(...linhasSA.filter((x) => x.recebidoMenosEmissaoMin != null).map((x) => x.recebidoMenosEmissaoMin)) },
    recebidoTse1T: linhasSA.filter((x) => x.turno === 1 && x.recebidoMenosFechamentoMin != null).length } };
// calibração do relógio do servidor: DF (urna em Brasília) e AC/AM (urna na hora local, −2 h e −1 h)
res.calibracaoRecebido = db.prepare(`SELECT uf, COUNT(*) n, MIN((julianday(substr(recebido_tse,7,4)||'-'||substr(recebido_tse,4,2)||'-'||substr(recebido_tse,1,2)||' '||substr(recebido_tse,12)) - julianday(emissao))*1440) minLagMin
  FROM secao WHERE turno = 2 AND uf IN ('df','ac','am') AND recebido_tse <> '' GROUP BY uf`).all().map((r) => ({ ...r, minLagMin: Math.round(r.minLagMin) }));
db.close();
await writeFile(path.join(SAIDA, '37-h22.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
