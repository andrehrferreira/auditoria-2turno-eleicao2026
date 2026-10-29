// Auditoria C (linha do tempo): fuso por município, votos depois das 17h de Brasília, intervalos mínimos e
// eventos fora do esperado, a partir dos perfis de log (src/perfil-secoes.js). Só lê o disco.
// Uso: node scripts/auditoria/tempo-perfil.mjs [--turno 2] [--uf ac,am]
// Saída: data/parsed/auditoria/tempo/<t>t/ (resumo.json + CSVs). Horários do perfil = relógio local da urna.
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { DIR_DADOS, UFS } from '../../src/config.js';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, uf: { type: 'string' } } });
const turno = values.turno;
const ufs = values.uf ? values.uf.split(',') : UFS;
const destino = path.join(DIR_DADOS, 'parsed', 'auditoria', 'tempo', `${turno}t`);
const FAIXAS = ['<5s', '5-9s', '10-14s', '15-19s', '20-29s', '30-44s', '45-59s', '>=60s'];
const ELEICAO_PRESIDENTE = { 1: 6257, 2: 6258 }[turno];

// Nomes dos municípios (referência do turno), para os relatórios
const ref = JSON.parse(await readFile(path.join(DIR_DADOS, 'raw', `${turno}t`, 'referencia', `mun-e00${ELEICAO_PRESIDENTE}-cm.json`), 'utf8'));
const nomeMun = new Map(ref.abr.flatMap((a) => a.mu.map((m) => [`${a.cd}/${m.cd}`, m.nm])));

const hhmmss = (s) => (s === null || s === undefined ? '' : `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`);
const segBu = (dt) => (dt && dt.length >= 15 ? Number(dt.slice(9, 11)) * 3600 + Number(dt.slice(11, 13)) * 60 + Number(dt.slice(13, 15)) : null);
const diaBu = (dt) => (dt ? dt.slice(0, 8) : null);
const quantil = (ordenado, q) => (ordenado.length ? ordenado[Math.min(ordenado.length - 1, Math.floor(q * ordenado.length))] : null);
const csv = (linhas) => linhas.map((l) => l.map((v) => (v === null || v === undefined ? '' : /[",;\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(',')).join('\n') + '\n';

// ---- 1. Leitura compacta de todas as seções ----
const secoes = [];
for (const uf of ufs) {
  const arquivo = path.join(DIR_DADOS, 'parsed', `${turno}t`, 'perfil', `${uf}.jsonl`);
  const rl = createInterface({ input: createReadStream(arquivo), crlfDelay: Infinity });
  for await (const linha of rl) {
    if (!linha) continue;
    const p = JSON.parse(linha);
    const l = p.log;
    const pres = p.bu.eleicoes.find((e) => e.idEleicao === ELEICAO_PRESIDENTE)?.cargos.find((c) => c.codigoCargo === 1)?.votos ?? {};
    const cargos = p.bu.eleicoes.reduce((n, e) => n + e.cargos.length, 0);
    secoes.push({
      uf, mun: p.municipio, zona: p.zona, secao: p.secao, tipoUrna: p.bu.urna.tipoUrna, carga: p.bu.urna.dataHoraCarga,
      abertura: p.bu.dataHoraAbertura, encerramento: p.bu.dataHoraEncerramento, comparecimento: p.bu.qtdEleitoresCompareceram,
      aptos: p.bu.eleicoes.find((e) => e.idEleicao === ELEICAO_PRESIDENTE)?.aptos ?? null, cargos,
      v13: pres['13'] ?? 0, v22: pres['22'] ?? 0, branco: pres.branco ?? 0, nulo: pres.nulo ?? 0,
      temLog: !!l, logs: l?.logsNoPacote ?? 0, modelo: l?.modeloUrna ?? null,
      pronta: l?.urnaPronta ?? null, inicioEnc: l?.inicioEncerramento ?? null, primeiro: l?.primeiroVoto ?? null, ultimo: l?.ultimoVoto ?? null,
      votos: l?.votosComputados ?? 0, foraJanela: l?.votosForaDaJanela ?? 0, porHora: l?.votosPorHoraLocal ?? null,
      reinicios: l?.reiniciosDuranteVotacao ?? 0,
      minIntervalo: l?.intervaloEntreVotos.minimo ?? null, faixasIntervalo: l?.intervaloEntreVotos.faixas ?? null,
      minHab: l?.tempoHabilitacaoAteVoto.minimo ?? null, faixasHab: l?.tempoHabilitacaoAteVoto.faixas ?? null,
    });
  }
}

// ---- 2. Fuso por município: hora local modal de "Urna pronta" (deve ser 08:00 de Brasília) ----
const porMun = new Map();
for (const s of secoes) {
  const k = `${s.uf}/${s.mun}`;
  if (!porMun.has(k)) porMun.set(k, { uf: s.uf, mun: s.mun, horas: new Map(), n: 0 });
  const m = porMun.get(k);
  m.n++;
  if (s.pronta !== null) m.horas.set(Math.floor(s.pronta / 3600), (m.horas.get(Math.floor(s.pronta / 3600)) ?? 0) + 1);
}
const fusoMun = new Map();
const linhasFuso = [['uf', 'municipio', 'nome', 'secoes', 'hora_local_modal_urna_pronta', 'secoes_na_hora_modal', 'diferenca_para_brasilia_h', 'outras_horas']];
for (const [k, m] of porMun) {
  const ordem = [...m.horas].sort((a, b) => b[1] - a[1]);
  const modal = ordem[0]?.[0] ?? null;
  const dif = modal === null ? null : modal - 8; // local − Brasília
  fusoMun.set(k, m.uf === 'zz' ? null : dif);
  linhasFuso.push([m.uf, m.mun, nomeMun.get(k) ?? '', m.n, modal, ordem[0]?.[1] ?? 0, m.uf === 'zz' ? '' : dif, ordem.slice(1).map(([h, n]) => `${h}h:${n}`).join(' ')]);
}
// Por UF: diferença modal e municípios fora dela
const resumoFuso = {};
for (const uf of ufs) {
  const muns = [...porMun.values()].filter((m) => m.uf === uf);
  const difs = new Map();
  for (const m of muns) { const d = fusoMun.get(`${uf}/${m.mun}`); difs.set(d, (difs.get(d) ?? 0) + 1); }
  const modal = [...difs].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const secUf = secoes.filter((s) => s.uf === uf);
  resumoFuso[uf] = {
    municipios: muns.length, secoes: secUf.length, secoesSemUrnaPronta: secUf.filter((s) => s.pronta === null).length,
    diferencaModal: uf === 'zz' ? 'fusos variados (horário local de cada país)' : modal,
    municipiosForaDoModal: uf === 'zz' ? null : muns.filter((m) => fusoMun.get(`${uf}/${m.mun}`) !== modal).map((m) => `${m.mun} ${nomeMun.get(`${uf}/${m.mun}`) ?? ''} (${fusoMun.get(`${uf}/${m.mun}`)})`),
    horasLocaisUrnaPronta: Object.fromEntries([...secUf.reduce((h, s) => (s.pronta !== null && h.set(Math.floor(s.pronta / 3600), (h.get(Math.floor(s.pronta / 3600)) ?? 0) + 1), h), new Map())].sort((a, b) => a[0] - b[0])),
  };
}

// ---- 3. Votos depois das 17h de Brasília ----
const dif = (s) => fusoMun.get(`${s.uf}/${s.mun}`);
const limite = (s, horaBrasilia) => (horaBrasilia + dif(s)) * 3600; // em segundos no relógio local
const nac = { secoes: 0, comLog: 0, votos: 0, votos17: 0, votos18: 0, votos19: 0, votos20: 0, secoes17: 0, secoes18: 0, secoes19: 0, votosAntes8: 0, secoesAntes8: 0 };
const ultimoAposMin = [];
const porUfTarde = {};
const linhasTarde = [['uf', 'municipio', 'nome', 'zona', 'secao', 'dif_brasilia_h', 'comparecimento', 'votos_log', 'votos_apos_17h_bsb', 'votos_apos_18h_bsb', 'votos_apos_19h_bsb', 'ultimo_voto_local', 'ultimo_voto_bsb', 'encerramento_bu_local', 'inicio_encerramento_local', 'v13', 'v22', 'pct13']];
const bucketsUltimo = { 'sem voto após 17h': 0, '0-14 min': 0, '15-29 min': 0, '30-59 min': 0, '1h-1h59': 0, '2h-2h59': 0, '>=3h': 0 };
const bucketsEnc = { 'antes das 17h': 0, '17:00-17:14': 0, '17:15-17:29': 0, '17:30-17:59': 0, '18h-18h59': 0, '19h-19h59': 0, '>=20h': 0, 'sem encerramento': 0 };
for (const s of secoes) {
  nac.secoes++;
  if (!s.temLog || s.pronta === null || dif(s) === null || dif(s) === undefined) continue;
  nac.comLog++;
  nac.votos += s.votos;
  const soma = (h0) => s.porHora.slice(h0 + dif(s)).reduce((a, b) => a + b, 0);
  const t17 = soma(17), t18 = soma(18), t19 = soma(19), t20 = soma(20);
  const antes8 = s.porHora.slice(0, 8 + dif(s)).reduce((a, b) => a + b, 0);
  nac.votos17 += t17; nac.votos18 += t18; nac.votos19 += t19; nac.votos20 += t20;
  nac.votosAntes8 += antes8; if (antes8) nac.secoesAntes8++;
  if (t17) nac.secoes17++; if (t18) nac.secoes18++; if (t19) nac.secoes19++;
  const u = porUfTarde[s.uf] ??= { secoes: 0, votos: 0, votos17: 0, secoes17: 0, votos18: 0, secoes18: 0 };
  u.secoes++; u.votos += s.votos; u.votos17 += t17; u.votos18 += t18; if (t17) u.secoes17++; if (t18) u.secoes18++;
  const apos = s.ultimo === null ? null : (s.ultimo - limite(s, 17)) / 60;
  if (apos === null || apos < 0) bucketsUltimo['sem voto após 17h']++;
  else if (apos < 15) bucketsUltimo['0-14 min']++; else if (apos < 30) bucketsUltimo['15-29 min']++;
  else if (apos < 60) bucketsUltimo['30-59 min']++; else if (apos < 120) bucketsUltimo['1h-1h59']++;
  else if (apos < 180) bucketsUltimo['2h-2h59']++; else bucketsUltimo['>=3h']++;
  if (apos !== null && apos >= 0) ultimoAposMin.push(apos);
  const enc = segBu(s.encerramento);
  if (enc === null) bucketsEnc['sem encerramento']++;
  else {
    const m = (enc - limite(s, 17)) / 60;
    if (m < 0) bucketsEnc['antes das 17h']++; else if (m < 15) bucketsEnc['17:00-17:14']++; else if (m < 30) bucketsEnc['17:15-17:29']++;
    else if (m < 60) bucketsEnc['17:30-17:59']++; else if (m < 120) bucketsEnc['18h-18h59']++; else if (m < 180) bucketsEnc['19h-19h59']++; else bucketsEnc['>=20h']++;
  }
  s.t17 = t17; s.t18 = t18; s.t19 = t19;
  if (t17) {
    linhasTarde.push([s.uf, s.mun, nomeMun.get(`${s.uf}/${s.mun}`) ?? '', s.zona, s.secao, dif(s), s.comparecimento, s.votos, t17, t18, t19,
      hhmmss(s.ultimo), hhmmss(s.ultimo - dif(s) * 3600), s.encerramento?.slice(9), hhmmss(s.inicioEnc), s.v13, s.v22,
      s.v13 + s.v22 ? (100 * s.v13 / (s.v13 + s.v22)).toFixed(1) : '']);
  }
}
ultimoAposMin.sort((a, b) => a - b);

// ---- 3b. Votos tardios × resultado (comparação entre seções da mesma zona; não dá para saber em quem o eleitor tardio votou) ----
const pct = (s) => s.v13 / (s.v13 + s.v22);
const zonas = new Map();
for (const s of secoes) {
  if (s.t17 === undefined || s.v13 + s.v22 < 20) continue;
  const k = `${s.uf}/${s.mun}/${s.zona}`;
  if (!zonas.has(k)) zonas.set(k, []);
  zonas.get(k).push(s);
}
function compararGrupo(criterio, rotulo) {
  let zonasMistas = 0, somaDif = 0, pesoTotal = 0, a = [0, 0], b = [0, 0];
  for (const lista of zonas.values()) {
    const sim = lista.filter(criterio), nao = lista.filter((s) => !criterio(s));
    const media = (l) => l.reduce((x, s) => x + pct(s), 0) / l.length;
    if (sim.length && nao.length) {
      zonasMistas++;
      const peso = Math.min(sim.length, nao.length);
      somaDif += peso * (media(sim) - media(nao)); pesoTotal += peso;
    }
    for (const s of sim) { a[0] += s.v13; a[1] += s.v22; }
    for (const s of nao) { b[0] += s.v13; b[1] += s.v22; }
  }
  return {
    criterio: rotulo, secoesNoGrupo: secoes.filter((s) => s.t17 !== undefined && s.v13 + s.v22 >= 20 && criterio(s)).length,
    pct13_grupo_bruto: +(100 * a[0] / (a[0] + a[1])).toFixed(2), pct13_restante_bruto: +(100 * b[0] / (b[0] + b[1])).toFixed(2),
    zonasComOsDoisTipos: zonasMistas, diferencaMediaDentroDaZona_pp: +(100 * somaDif / pesoTotal).toFixed(2),
  };
}
// Correlação dentro da zona: parcela de votos após 17h × % do 13, ambos centrados na média da zona
function correlacaoDentroDaZona() {
  const xs = [], ys = [];
  for (const lista of zonas.values()) {
    if (lista.length < 2) continue;
    const mx = lista.reduce((x, s) => x + s.t17 / Math.max(1, s.votos), 0) / lista.length;
    const my = lista.reduce((x, s) => x + pct(s), 0) / lista.length;
    for (const s of lista) { xs.push(s.t17 / Math.max(1, s.votos) - mx); ys.push(pct(s) - my); }
  }
  const sxy = xs.reduce((x, v, i) => x + v * ys[i], 0), sxx = xs.reduce((x, v) => x + v * v, 0), syy = ys.reduce((x, v) => x + v * v, 0);
  return { secoes: xs.length, pearson: +(sxy / Math.sqrt(sxx * syy)).toFixed(4) };
}
const tardioXResultado = [
  compararGrupo((s) => s.t17 > 0, 'seção com algum voto após 17h de Brasília'),
  compararGrupo((s) => s.t17 >= 10, 'seção com 10+ votos após 17h'),
  compararGrupo((s) => s.t17 / Math.max(1, s.votos) >= 0.05, 'seção com 5%+ dos votos após 17h'),
  compararGrupo((s) => s.t18 > 0, 'seção com algum voto após 18h'),
];

// ---- 4. Intervalos mínimos (resolução de 1 s) ----
const somaFaixas = (campo, filtro = () => true) => {
  const f = new Array(8).fill(0);
  for (const s of secoes) if (s[campo] && filtro(s)) s[campo].forEach((v, i) => { f[i] += v; });
  return Object.fromEntries(FAIXAS.map((n, i) => [n, f[i]]));
};
const distMin = (campo, filtro = () => true) => {
  const h = {};
  for (const s of secoes) if (s[campo] !== null && filtro(s)) h[Math.min(s[campo], 60)] = (h[Math.min(s[campo], 60)] ?? 0) + 1;
  return h;
};
const intervalos = {
  intervaloEntreVotos: { faixasNacionais: somaFaixas('faixasIntervalo'), minimoPorSecao: distMin('minIntervalo') },
  habilitacaoAteVoto: {
    faixasNacionais: somaFaixas('faixasHab'), minimoPorSecao: distMin('minHab'),
    minimoPorSecao_1cargo: distMin('minHab', (s) => s.cargos === 1), minimoPorSecao_2cargos: distMin('minHab', (s) => s.cargos === 2),
    faixas_1cargo: somaFaixas('faixasHab', (s) => s.cargos === 1), faixas_2cargos: somaFaixas('faixasHab', (s) => s.cargos === 2),
  },
  contingencia: { secoesComMaisDeUmLog: secoes.filter((s) => s.logs > 1).length, minIntervaloAbaixo5s_entreElas: secoes.filter((s) => s.logs > 1 && s.minIntervalo !== null && s.minIntervalo < 5).length },
};
const linhasIntervalo = [['uf', 'municipio', 'nome', 'zona', 'secao', 'cargos', 'logs_no_pacote', 'tipo_urna', 'modelo', 'votos', 'min_intervalo_votos_s', 'intervalos_<5s', 'intervalos_5-9s', 'min_hab_ate_voto_s', 'hab_<5s', 'hab_5-9s']];
for (const s of secoes) {
  if ((s.minIntervalo !== null && s.minIntervalo < 10) || (s.minHab !== null && s.minHab < 5)) {
    linhasIntervalo.push([s.uf, s.mun, nomeMun.get(`${s.uf}/${s.mun}`) ?? '', s.zona, s.secao, s.cargos, s.logs, s.tipoUrna, s.modelo, s.votos,
      s.minIntervalo, s.faixasIntervalo?.[0], s.faixasIntervalo?.[1], s.minHab, s.faixasHab?.[0], s.faixasHab?.[1]]);
  }
}

// ---- 5. Linha do tempo: abertura, reinícios, votos fora da janela, encerramento, carga ----
const dia = { 1: '20261004', 2: '20261025' }[turno];
const prontaRel = [];
const lt = {
  secoesComLog: 0, semUrnaPronta: 0, urnaProntaAntesDas8_bsb: 0, urnaProntaDepois_0815: 0, urnaProntaDepois_0900: 0, urnaProntaDepois_1000: 0, urnaProntaDepois_1200: 0,
  primeiroVotoAntesDas8_bsb: 0, votosForaDaJanela: 0, secoesComVotosForaDaJanela: 0, secoesComReinicio: 0, reinicios: 0,
  aberturaBuDiferenteUrnaPronta_mais60s: 0, encerramentoBuAntes17_bsb: 0, encerramentoBuOutroDia: 0, semInicioEncerramento: 0,
  inicioEncerramentoMenosEncerramentoBu: { '<0': 0, '0-4min': 0, '5-14min': 0, '15-59min': 0, '>=1h': 0 },
  contingencia_tipoUrna4: 0, pacotesComMaisDeUmLog: 0, cargaPorData: {},
};
const linhasLt = [['uf', 'municipio', 'nome', 'zona', 'secao', 'anomalia', 'detalhe', 'dif_brasilia_h', 'tipo_urna', 'logs_no_pacote', 'urna_pronta_local', 'primeiro_voto_local', 'ultimo_voto_local', 'abertura_bu', 'encerramento_bu', 'inicio_encerramento_local', 'reinicios', 'votos_fora_janela', 'comparecimento', 'aptos']];
const anomalia = (s, tipo, detalhe) => linhasLt.push([s.uf, s.mun, nomeMun.get(`${s.uf}/${s.mun}`) ?? '', s.zona, s.secao, tipo, detalhe, dif(s), s.tipoUrna, s.logs,
  hhmmss(s.pronta), hhmmss(s.primeiro), hhmmss(s.ultimo), s.abertura, s.encerramento, hhmmss(s.inicioEnc), s.reinicios, s.foraJanela, s.comparecimento, s.aptos]);
for (const s of secoes) {
  const dataCarga = s.carga?.slice(0, 8) ?? 'sem';
  lt.cargaPorData[dataCarga] = (lt.cargaPorData[dataCarga] ?? 0) + 1;
  if (s.tipoUrna === 4) lt.contingencia_tipoUrna4++;
  if (s.logs > 1) lt.pacotesComMaisDeUmLog++;
  if (!s.temLog) continue;
  lt.secoesComLog++;
  if (s.pronta === null) { lt.semUrnaPronta++; anomalia(s, 'sem_urna_pronta_no_dia', ''); continue; }
  const d = dif(s);
  if (d === null || d === undefined) continue; // exterior: fuso desconhecido
  const rel = s.pronta - limite(s, 8);
  prontaRel.push(rel);
  if (rel < 0) { lt.urnaProntaAntesDas8_bsb++; anomalia(s, 'urna_pronta_antes_8h_bsb', `${rel} s`); }
  if (rel >= 900) lt.urnaProntaDepois_0815++;
  if (rel >= 3600) { lt.urnaProntaDepois_0900++; }
  if (rel >= 7200) { lt.urnaProntaDepois_1000++; anomalia(s, 'urna_pronta_apos_10h_bsb', `${Math.round(rel / 60)} min após 8h`); }
  if (rel >= 4 * 3600) lt.urnaProntaDepois_1200++;
  if (s.primeiro !== null && s.primeiro < limite(s, 8)) { lt.primeiroVotoAntesDas8_bsb++; anomalia(s, 'voto_antes_8h_bsb', hhmmss(s.primeiro)); }
  if (s.foraJanela) { lt.votosForaDaJanela += s.foraJanela; lt.secoesComVotosForaDaJanela++; anomalia(s, 'votos_fora_da_janela', `${s.foraJanela}`); }
  if (s.reinicios) { lt.secoesComReinicio++; lt.reinicios += s.reinicios; if (s.reinicios >= 3) anomalia(s, 'reinicios_durante_votacao_3+', `${s.reinicios}`); }
  const ab = segBu(s.abertura);
  if (ab !== null && Math.abs(ab - s.pronta) > 60 && s.logs === 1) { lt.aberturaBuDiferenteUrnaPronta_mais60s++; anomalia(s, 'abertura_bu_difere_urna_pronta', `${ab - s.pronta} s`); }
  const enc = segBu(s.encerramento);
  if (diaBu(s.encerramento) !== dia) { lt.encerramentoBuOutroDia++; anomalia(s, 'encerramento_bu_outro_dia', s.encerramento); }
  else if (enc !== null && enc < limite(s, 17)) { lt.encerramentoBuAntes17_bsb++; anomalia(s, 'encerramento_antes_17h_bsb', `${Math.round((limite(s, 17) - enc) / 60)} min antes; comparecimento ${s.comparecimento}/${s.aptos}`); }
  if (s.inicioEnc === null) { lt.semInicioEncerramento++; anomalia(s, 'sem_inicio_encerramento_no_dia', ''); }
  else if (enc !== null && diaBu(s.encerramento) === dia) {
    const g = (s.inicioEnc - enc) / 60;
    const b = lt.inicioEncerramentoMenosEncerramentoBu;
    if (g < 0) b['<0']++; else if (g < 5) b['0-4min']++; else if (g < 15) b['5-14min']++; else if (g < 60) b['15-59min']++; else { b['>=1h']++; anomalia(s, 'bu_emitido_1h+_apos_encerramento', `${Math.round(g)} min`); }
  }
}
prontaRel.sort((a, b) => a - b);
lt.urnaProntaRelativaAs8_bsb_s = { p01: quantil(prontaRel, 0.01), p50: quantil(prontaRel, 0.5), p90: quantil(prontaRel, 0.9), p99: quantil(prontaRel, 0.99), max: prontaRel.at(-1) };

// ---- Gravação ----
await mkdir(destino, { recursive: true });
const resumo = {
  turno: Number(turno), geradoEm: new Date().toISOString(), secoes: secoes.length,
  fuso: resumoFuso,
  votosApos17: {
    ...nac, ultimoVotoAposAs17_bsb: bucketsUltimo, ultimoVotoMinAposAs17: { p50: quantil(ultimoAposMin, 0.5), p90: quantil(ultimoAposMin, 0.9), p99: quantil(ultimoAposMin, 0.99), max: ultimoAposMin.at(-1) },
    encerramentoBu: bucketsEnc, porUf: porUfTarde, tardioXResultado, correlacaoDentroDaZona_parcelaTardia_x_pct13: correlacaoDentroDaZona(),
  },
  intervalos, linhaDoTempo: lt,
};
await writeFile(path.join(destino, 'resumo.json'), JSON.stringify(resumo, null, 2));
await writeFile(path.join(destino, 'fuso-municipio.csv'), csv(linhasFuso));
await writeFile(path.join(destino, 'votos-apos-17h.csv'), csv(linhasTarde));
await writeFile(path.join(destino, 'intervalos-curtos.csv'), csv(linhasIntervalo));
await writeFile(path.join(destino, 'linha-do-tempo-anomalias.csv'), csv(linhasLt));
console.log(JSON.stringify({ secoes: secoes.length, votosApos17: { votos: nac.votos, votos17: nac.votos17, secoes17: nac.secoes17 }, linhasTarde: linhasTarde.length - 1, linhasIntervalo: linhasIntervalo.length - 1, anomalias: linhasLt.length - 1 }));
