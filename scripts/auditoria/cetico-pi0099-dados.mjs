// Revisor cético, achado caso-pi-11878-0028-0099 (lente: dados e definições).
// Pergunta: o que se compara entre o 1º e o 2º turno nesta seção é a mesma coisa (mesma urna, mesmo local,
// mesmos aptos, mesma agregação, mesma definição de "sem biometria")? Quanto da virada o canal
// "liberação sem biometria" consegue explicar, no máximo?
//
// Uso: node scripts/auditoria/cetico-pi0099-dados.mjs
// Lê: pacotes brutos dos dois turnos (data/raw/<t>t/urnas/pi/11878/0028/0099/<hash>, hash vindo do banco,
// porque o aux.json do 1º turno não está no disco e src/exportar.js devolve pacote vazio), cópia de leitura
// do banco (abrirLeitura), detalhe_votacao_secao_2026.zip (PI) e eleitorado_local_votacao_2026.zip (PI).
// Saída: data/parsed/auditoria/cetico/cetico-pi0099-dados.json (sem títulos de mesário: só contagens).
import { readFile, readdir } from 'node:fs/promises';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { decodificarArquivo } from '../../src/asn1.js';
import { arquivoBu, arquivoRdv } from '../../src/esquemas.js';
import { lerLogJez, eventosLog } from '../../src/exportar.js';
import { DIA_VOTACAO, perfilLog } from '../../src/perfil-secoes.js';
import { entradasZip, linhasCsv } from './contagem-zip.mjs';

const UF = 'pi', MUN = '11878', ZONA = '0028', SECAO = '0099', AGREGADA = '0212';
const SAIDA = 'data/parsed/auditoria/cetico/cetico-pi0099-dados.json';
const { db, fonte } = await abrirLeitura();
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const pct = (n, d) => (d ? r1((100 * n) / d) : null);
const mediana = (v) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// ---------- 1. Pacotes brutos dos dois turnos ----------
const pleito = { 1: '3220', 2: '3221' };
const brutos = {};
const textosLog = {};
for (const t of [1, 2]) {
  const { hash } = db.prepare('SELECT hash FROM secao WHERE turno=? AND uf=? AND municipio=? AND zona=? AND secao=?').get(t, UF, MUN, ZONA, SECAO);
  const base = `data/raw/${t}t/urnas/${UF}/${MUN}/${ZONA}/${SECAO}`;
  const dirHash = (await readdir(base)).find((d) => d.startsWith(hash));
  const pref = `o0${pleito[t]}${UF}${MUN}${ZONA}${SECAO}`;
  const bu = decodificarArquivo(arquivoBu, await readFile(path.join(base, dirHash, `${pref}-bu.dat`))).conteudo;
  const rdv = decodificarArquivo(arquivoRdv, await readFile(path.join(base, dirHash, `${pref}-rdv.dat`)));
  const texto = await lerLogJez(path.join(base, dirHash, `${pref}-log.jez`));
  textosLog[t] = texto;
  const pres = bu.resultadosVotacaoPorEleicao.find((e) => e.resultadosVotacao.some((r) => r.totaisVotosCargo.some((c) => c.codigoCargo?.cargoConstitucional === 'presidente')));
  const tvc = pres.resultadosVotacao.flatMap((r) => r.totaisVotosCargo).find((c) => c.codigoCargo?.cargoConstitucional === 'presidente');
  const votos = {};
  for (const v of tvc.votosVotaveis) votos[v.tipoVoto === 'nominal' ? String(v.identificacaoVotavel.codigo) : v.tipoVoto] = v.quantidadeVotos;
  const eleRdv = (rdv.rdv.eleicoes.eleicoesVota ?? []).find((e) => e.idEleicao === pres.idEleicao);
  const rdvPres = {};
  for (const vc of eleRdv?.votosCargos ?? []) {
    if (vc.idCargo?.cargoConstitucional !== 'presidente') continue;
    for (const v of vc.votos) { const k = v.tipoVoto === 'nominal' ? String(Number(v.digitacao)) : v.tipoVoto; rdvPres[k] = (rdvPres[k] ?? 0) + 1; }
  }
  const carga = bu.urna.correspondenciaResultado.carga;
  brutos[t] = {
    pacote: dirHash.slice(0, 16) + '…',
    identificacaoSecao: bu.identificacaoSecao, localNaCorrespondencia: bu.urna.correspondenciaResultado.identificacao?.identificacaoSecaoEleitoral?.local ?? null,
    tipoUrna: bu.urna.tipoUrna, tipoArquivo: bu.urna.tipoArquivo, versao: bu.urna.versaoVotacao,
    numeroInternoUrna: carga.numeroInternoUrna, numeroSerieFC: carga.numeroSerieFC, dataHoraCarga: carga.dataHoraCarga, codigoCarga: carga.codigoCarga,
    historicoCodigosCarga: bu.historicoCodigosCarga ?? null,
    abertura: bu.dadosSecaoSA?.dadosSecao?.dataHoraAbertura, encerramento: bu.dadosSecaoSA?.dadosSecao?.dataHoraEncerramento, emissao: bu.dataHoraEmissao,
    eleicoes: bu.resultadosVotacaoPorEleicao.map((e) => ({ idEleicao: e.idEleicao, aptos: e.qtdEleitoresAptos, aptosSecao: e.qtdEleitoresAptosSecao, aptosTTE: e.qtdEleitoresAptosTTE })),
    comparecimento: bu.qtdEleitoresCompareceram, detalhamento: bu.detalhamentoComparecimento,
    presidenteBU: votos, presidenteRDV: rdvPres,
  };
}

// ---------- 2. Log: classificação de cada habilitação que terminou em voto, por hora ----------
function ciclos(texto, dia) {
  const { eventos, urnas } = eventosLog(texto, dia);
  const lista = [];
  let c = null;
  const raros = {};
  for (const e of eventos) {
    const msg = e.mensagem ?? '';
    // mensagem normalizada (sem números nem títulos) para comparar eventos entre turnos
    const norm = msg.replace(/\d+/g, '#');
    raros[norm] = (raros[norm] ?? 0) + 1;
    if (/^Aguardando digitação do identificador/.test(msg)) { c = { bio: false, biografia: false, anoSemBio: false, mesarioNominal: false, semAssociacao: false, cpf: false }; continue; }
    if (!c) continue;
    if (/^Tipo de habilitação do eleitor \[biométrica\]/.test(msg)) c.bio = true;
    if (/^Dado digitado confere/.test(msg)) c.biografia = true;
    if (/^Ano de nascimento digitado é igual/.test(msg)) c.anoSemBio = true;
    if (/^Mesário .* habilitou o eleitor/.test(msg)) c.mesarioNominal = true;
    if (/^Não encontrou digital coletada|^Digital coletada bate com uma digital gravada após/.test(msg)) c.semAssociacao = true;
    if (/\(CPF\)/.test(msg)) c.cpf = true;
    if (/^O voto do eleitor foi computado/.test(msg)) {
      const hora = Number(e.dataHora.slice(11, 13));
      const tipo = c.bio ? 'biometria' : c.biografia ? 'biografia' : c.anoSemBio ? 'semBiometriaCadastrada' : 'outro';
      lista.push({ hora, tipo, mesarioNominal: c.mesarioNominal, semAssociacao: c.semAssociacao, cpf: c.cpf });
      c = null;
    }
  }
  return { lista, urnas, raros, linhas: eventos.length, niveis: eventos.reduce((a, e) => ((a[e.nivel] = (a[e.nivel] ?? 0) + 1), a), {}) };
}
const logs = {};
for (const t of [1, 2]) {
  const cic = ciclos(textosLog[t], DIA_VOTACAO[t]);
  const p = perfilLog(textosLog[t], DIA_VOTACAO[t]);
  const porHora = {};
  for (const v of cic.lista) {
    const h = (porHora[v.hora] ??= { votos: 0, biometria: 0, biografia: 0, semBiometriaCadastrada: 0, outro: 0 });
    h.votos++; h[v.tipo]++;
  }
  const tot = (k) => cic.lista.filter((v) => v.tipo === k).length;
  const mesariosTitulos = new Set((p.mesarios?.registros ?? []).map((r) => r.titulo));
  logs[t] = {
    urnasNoLog: cic.urnas, linhasDoDia: cic.linhas, niveis: cic.niveis,
    votosComputados: cic.lista.length,
    habilitacao: { biometria: tot('biometria'), biografia: tot('biografia'), semBiometriaCadastrada: tot('semBiometriaCadastrada'), outro: tot('outro'),
      biografiaComMesarioNominal: cic.lista.filter((v) => v.tipo === 'biografia' && v.mesarioNominal).length,
      biografiaSemAssociacaoAMesario: cic.lista.filter((v) => v.tipo === 'biografia' && v.semAssociacao).length,
      identificadoPorCPF: cic.lista.filter((v) => v.cpf).length },
    porHora,
    primeiroVoto_s: p.primeiroVoto, ultimoVoto_s: p.ultimoVoto, votosPorHoraLocalPerfil: p.votosPorHoraLocal,
    jaVotou: p.jaVotou, impedidos: p.impedidos, suspensos: p.suspensosPeloMesario, reinicios: p.reiniciosDuranteVotacao, erros: p.erros, alertas: p.alertas,
    maiorRajadaSemBiometria10min: p.maiorRajadaSemBiometria10min, semBiometriaUltimaHora: p.semBiometriaUltimaHora,
    mesariosRegistrados: mesariosTitulos.size, mesariosQueLiberaram: Object.keys(p.mesarios?.liberacoesPorMesario ?? {}).length,
    liberacoesNominais: Object.values(p.mesarios?.liberacoesPorMesario ?? {}).reduce((a, b) => a + b, 0),
    _titulos: mesariosTitulos, _raros: cic.raros,
  };
}
const t1m = logs[1]._titulos, t2m = logs[2]._titulos;
const mesariosEmComum = [...t2m].filter((x) => t1m.has(x)).length;
// eventos que só aparecem num dos dias (mensagem normalizada)
const soNum = (a, b) => Object.entries(logs[a]._raros).filter(([k]) => !(k in logs[b]._raros)).map(([k, n]) => `${n}× ${k.slice(0, 120)}`);
const eventosExclusivos = { so1t: soNum(1, 2), so2t: soNum(2, 1) };
// log do 2º turno é cumulativo? As linhas de 04/10 dentro do log do 2º turno são as mesmas do log do 1º?
const linhasDia1 = (txt) => txt.split(/\r?\n/).filter((l) => l.startsWith(DIA_VOTACAO[1]));
const d1em1 = linhasDia1(textosLog[1]), d1em2 = linhasDia1(textosLog[2]);
const prefixo = d1em1.every((l, i) => l === d1em2[i]);
const logCumulativo = { linhas04_10_noLog1t: d1em1.length, linhas04_10_noLog2t: d1em2.length,
  identicas: d1em1.length === d1em2.length && prefixo,
  log1tEhPrefixoDo04_10NoLog2t: prefixo,
  linhasExtrasDe04_10NoLog2t: d1em2.slice(d1em1.length).map((l) => l.split('\t')).map((c) => `${c[0]} ${c[1]} ${c[3]} ${(c[4] ?? '').replace(/\d{12}/g, '<titulo>')}`).slice(0, 80) };
const linhasErro2t = textosLog[2].split(/\r?\n/).filter((l) => l.startsWith(DIA_VOTACAO[2]) && /\t(ERRO|ALERTA)\t/.test(l))
  .map((l) => l.split('\t')).map((c) => `${c[0]} ${c[1]} ${(c[4] ?? '').replace(/\d{12}/g, '<titulo>')}`);
for (const t of [1, 2]) { delete logs[t]._titulos; delete logs[t]._raros; }

// ---------- 3. Banco: seção, agregada e município ----------
const agregadas = db.prepare('SELECT turno, secao, secao_principal FROM secao_agregada WHERE uf=? AND municipio=? AND (secao_principal=? OR secao=?) ORDER BY turno').all(UF, MUN, SECAO, SECAO);
const agregacoesMunicipio = db.prepare('SELECT turno, COUNT(*) n FROM secao_agregada WHERE uf=? AND municipio=? GROUP BY turno').all(UF, MUN);
// agregações que mudaram entre turnos no município (mesma chave, principal diferente ou presente só num turno)
const agMud = db.prepare(`SELECT a.zona, a.secao, a.secao_principal p1, b.secao_principal p2 FROM secao_agregada a
  LEFT JOIN secao_agregada b ON b.turno=2 AND b.uf=a.uf AND b.municipio=a.municipio AND b.zona=a.zona AND b.secao=a.secao
  WHERE a.turno=1 AND a.uf=? AND a.municipio=? AND (b.secao IS NULL OR b.secao_principal<>a.secao_principal)`).all(UF, MUN);
const qMun = db.prepare(`SELECT s.zona, s.secao, s.local, s.numero_interno_urna urna, s.comparecimento c, s.sem_biometria sb, s.por_biometria pb, s.por_biografia pg,
   (SELECT e.aptos FROM secao_eleicao e WHERE e.turno=s.turno AND e.uf=s.uf AND e.municipio=s.municipio AND e.zona=s.zona AND e.secao=s.secao AND e.eleicao IN (6257,6258)) aptos,
   SUM(CASE WHEN b.numero=13 AND b.tipo_voto='nominal' THEN b.quantidade ELSE 0 END) L,
   SUM(CASE WHEN b.numero=22 AND b.tipo_voto='nominal' THEN b.quantidade ELSE 0 END) F
  FROM secao s JOIN voto_bu b ON b.turno=s.turno AND b.uf=s.uf AND b.municipio=s.municipio AND b.zona=s.zona AND b.secao=s.secao AND b.cargo=1
  WHERE s.turno=? AND s.uf=? AND s.municipio=? AND s.situacao='completa' GROUP BY s.zona, s.secao`);
const mun = {};
for (const t of [1, 2]) for (const r of qMun.all(t, UF, MUN)) (mun[`${r.zona}/${r.secao}`] ??= {})[t] = r;
const linhas = [];
for (const [k, v] of Object.entries(mun)) {
  if (!v[1] || !v[2]) continue;
  const f = (r) => (r.L + r.F ? (100 * r.L) / (r.L + r.F) : null);
  const nb = (r) => (100 * (r.sb + r.pg)) / r.c;
  linhas.push({ secao: k, mesmaUrna: v[1].urna === v[2].urna, mesmoLocal: v[1].local === v[2].local, aptos: [v[1].aptos, v[2].aptos],
    validos30: v[1].L + v[1].F >= 30 && v[2].L + v[2].F >= 30,
    fatia13: [r1(f(v[1])), r1(f(v[2]))], delta: r1(f(v[2]) - f(v[1])),
    naoBio: [r1(nb(v[1])), r1(nb(v[2]))], biografia: [pct(v[1].pg, v[1].c), pct(v[2].pg, v[2].c)], semCadastro: [v[1].sb, v[2].sb] });
}
linhas.sort((a, b) => a.delta - b.delta);
const val = linhas.filter((l) => l.validos30);
const alvo = linhas.find((l) => l.secao === `${ZONA}/${SECAO}`);
// correlação simples (Pearson) entre Δ não-biometria e Δ fatia do 13 nas seções do município
const pear = (xs, ys) => { const n = xs.length, mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; } return sxy / Math.sqrt(sxx * syy); };
const municipio = {
  secoesNosDoisTurnos: linhas.length, com30validos: val.length,
  medianaDelta30: r1(mediana(val.map((l) => l.delta))), medianaDeltaTodas: r1(mediana(linhas.map((l) => l.delta))),
  alvoPosicao: linhas.indexOf(alvo) + 1, segundaPior: linhas[1],
  todasMesmaUrna: linhas.every((l) => l.mesmaUrna), todasMesmoLocal: linhas.every((l) => l.mesmoLocal), todasMesmosAptos: linhas.every((l) => l.aptos[0] === l.aptos[1]),
  naoBio2tFaixa: [Math.min(...val.map((l) => l.naoBio[1])), Math.max(...val.map((l) => l.naoBio[1]))],
  naoBio2tPosicaoAlvo: [...val].sort((a, b) => a.naoBio[1] - b.naoBio[1]).findIndex((l) => l === alvo) + 1,
  naoBio1tFaixa: [Math.min(...val.map((l) => l.naoBio[0])), Math.max(...val.map((l) => l.naoBio[0]))],
  pearson_dNaoBio_dFatia13: r1(100 * pear(val.map((l) => l.naoBio[1] - l.naoBio[0]), val.map((l) => l.delta))) / 100,
  pearson_naoBio2t_fatia13_2t: r1(100 * pear(val.map((l) => l.naoBio[1]), val.map((l) => l.fatia13[1]))) / 100,
  agregacoesPorTurno: agregacoesMunicipio, agregacoesQueMudaram: agMud,
  linhas,
};
// ritmo: fração dos votos antes das 10h (hora local) em cada seção do município, nos dois turnos (perfil_log)
const qPerfil = db.prepare(`SELECT zona, secao, json_extract(dados, '$.log.votosPorHoraLocal') h FROM perfil_log WHERE turno=? AND uf=? AND municipio=?`);
const manha = {};
for (const t of [1, 2]) for (const r of qPerfil.all(t, UF, MUN)) {
  const h = JSON.parse(r.h ?? '[]'); const tot = h.reduce((a, b) => a + b, 0);
  if (tot) (manha[`${r.zona}/${r.secao}`] ??= {})[t] = r1((100 * (h[8] + h[9])) / tot);
}
const manhaLista = Object.entries(manha).filter(([, v]) => v[1] != null && v[2] != null).map(([k, v]) => ({ secao: k, ate10h1t: v[1], ate10h2t: v[2], delta: r1(v[2] - v[1]) })).sort((a, b) => b.delta - a.delta);
const ritmo = { secoes: manhaLista.length, medianaAte10h1t: mediana(manhaLista.map((x) => x.ate10h1t)), medianaAte10h2t: mediana(manhaLista.map((x) => x.ate10h2t)),
  medianaDelta: mediana(manhaLista.map((x) => x.delta)), alvo: manhaLista.find((x) => x.secao === `${ZONA}/${SECAO}`),
  posicaoAlvoNoDelta: manhaLista.findIndex((x) => x.secao === `${ZONA}/${SECAO}`) + 1, top5: manhaLista.slice(0, 5) };
const secaoBanco = db.prepare('SELECT turno, local, numero_interno_urna, codigo_carga, comparecimento, sem_biometria, por_biometria, por_biografia FROM secao WHERE uf=? AND municipio=? AND zona=? AND secao=? ORDER BY turno').all(UF, MUN, ZONA, SECAO);
// carga única para os dois turnos é regra nacional ou exceção desta urna?
const cargaIgual = db.prepare(`SELECT SUM(a.codigo_carga = b.codigo_carga) iguais, COUNT(*) n FROM secao a JOIN secao b ON b.turno=2 AND b.uf=a.uf AND b.municipio=a.municipio AND b.zona=a.zona AND b.secao=a.secao
  WHERE a.turno=1 AND a.uf=?`).get(UF);

// ---------- 4. Dados abertos: detalhe_votacao_secao (aptos/comparecimento por turno) e eleitorado_local ----------
async function filtrarZip(zip, sufixo, filtro) {
  const e = (await entradasZip(zip)).find((x) => x.nome.endsWith(sufixo));
  const out = [];
  for await (const l of linhasCsv(zip, e)) if (filtro(l)) out.push(l);
  return out;
}
// presidente (abrangência federal) fica no _BR.csv, não no _PI.csv (que só traz cargos estaduais do 1º turno)
const det = await filtrarZip('data/raw/dadosabertos/detalhe_votacao_secao/detalhe_votacao_secao_2026.zip', '_BR.csv',
  (l) => l.SG_UF === 'PI' && l.CD_MUNICIPIO === MUN && Number(l.NR_ZONA) === Number(ZONA) && [Number(SECAO), Number(AGREGADA)].includes(Number(l.NR_SECAO)) && l.CD_CARGO === '1');
const detalhe = det.map((l) => ({ turno: l.NR_TURNO, secao: l.NR_SECAO, geracao: `${l.DT_GERACAO} ${l.HH_GERACAO}`, aptos: l.QT_APTOS, comparecimento: l.QT_COMPARECIMENTO, abstencoes: l.QT_ABSTENCOES,
  nominais: l.QT_VOTOS_NOMINAIS, brancos: l.QT_VOTOS_BRANCOS, nulos: l.QT_VOTOS_NULOS, local: l.NR_LOCAL_VOTACAO, nomeLocal: l.NM_LOCAL_VOTACAO, origem: l.DS_ORIGEM_VOTO, instalada: l.ST_SECAO_INSTALADA, anulada: l.ST_SECAO_ANULADA, modelo: l.DS_MODELO_URNA }));
const ele = await filtrarZip('data/raw/dadosabertos/eleitorado_locais_votacao/eleitorado_local_votacao_2026.zip', '_PI.csv',
  (l) => l.CD_MUNICIPIO === MUN && Number(l.NR_ZONA) === Number(ZONA) && [Number(SECAO), Number(AGREGADA)].includes(Number(l.NR_SECAO)));
const eleitoradoLocal = ele.map((l) => Object.fromEntries(Object.entries(l).filter(([k]) => /^(DT_GERACAO|NR_TURNO|NR_SECAO|NR_LOCAL|NM_LOCAL|CD_TIPO_SECAO|DS_TIPO_SECAO|NR_SECAO_PRINCIPAL|QT_ELEITOR|NM_LOCAL_VOTACAO_ORIG|NR_LOCAL_VOTACAO_ORIG|DT_ELEICAO|DS_SITU)/.test(k))));

// ---------- 5. Quanto o canal "sem biometria" consegue explicar (limite superior) ----------
const b1 = brutos[1], b2 = brutos[2];
const v1 = b1.presidenteBU, v2 = b2.presidenteBU;
const outros1 = Object.entries(v1).filter(([k]) => /^\d+$/.test(k) && k !== '13' && k !== '22').reduce((a, [, n]) => a + n, 0);
const bn1 = (v1.branco ?? 0) + (v1.nulo ?? 0);
const aptos1 = b1.eleicoes.find((e) => e.idEleicao === 6257).aptos, aptos2 = b2.eleicoes[0].aptos;
const migracaoMinima22 = v2['22'] - (v1['22'] + outros1 + bn1 + (aptos1 - b1.comparecimento) + Math.max(0, aptos2 - aptos1));
const naoBio = (b) => b.detalhamento.qtdEleitoresCompareceramSemBiometria + b.detalhamento.qtdEleitoresHabilitadosPorBiografia;
const limite = {
  definicao: 'naoBio = qtdEleitoresCompareceramSemBiometria (sem digital cadastrada) + qtdEleitoresHabilitadosPorBiografia (tinha digital, liberado por ano de nascimento: a "liberação do mesário")',
  naoBio1t: naoBio(b1), naoBio2t: naoBio(b2), pctNaoBio1t: pct(naoBio(b1), b1.comparecimento), pctNaoBio2t: pct(naoBio(b2), b2.comparecimento),
  biografia1t: b1.detalhamento.qtdEleitoresHabilitadosPorBiografia, biografia2t: b2.detalhamento.qtdEleitoresHabilitadosPorBiografia,
  perda13: v1['13'] - v2['13'], ganho22: v2['22'] - v1['22'], migracaoMinima22,
  maxFracaoDoGanho22ExplicavelPorNaoBio2t: pct(naoBio(b2), v2['22'] - v1['22']),
  maxFracaoDaMigracaoMinimaExplicavelPorNaoBio2t: pct(Math.min(naoBio(b2), migracaoMinima22), migracaoMinima22),
  migrantesMinimosComBiometria: Math.max(0, migracaoMinima22 - naoBio(b2)),
};
// p.p. da queda que sobra no pior caso: todos os não-biométricos do 1º turno eram votos do 13 e/ou todos os do 2º eram do 22
const f13 = (a, b) => (100 * a) / (a + b);
const obs = f13(v2['13'], v2['22']) - f13(v1['13'], v1['22']);
limite.quedaFatia13Observada_pp = r1(obs);
limite.quedaSeTirarNaoBio1tDo13_pp = r1(f13(v2['13'], v2['22']) - f13(v1['13'] - naoBio(b1), v1['22']));
limite.quedaSeTirarNaoBio2tDo22_pp = r1(f13(v2['13'], v2['22'] - naoBio(b2)) - f13(v1['13'], v1['22']));
limite.quedaNoPiorCasoDosDois_pp = r1(f13(v2['13'], v2['22'] - naoBio(b2)) - f13(v1['13'] - naoBio(b1), v1['22']));
limite.medianaMunicipio_pp = municipio.medianaDelta30;

const resultado = { geradoEm: new Date().toISOString(), fonteBanco: fonte, brutos, logs, mesariosEmComum, eventosExclusivos, logCumulativo, linhasErro2t, ritmo,
  secaoBanco, agregadas, cargaIgualNaUF: cargaIgual, municipio, detalhe, eleitoradoLocal, limite };
mkdirSync(path.dirname(SAIDA), { recursive: true });
writeFileSync(SAIDA, JSON.stringify(resultado, null, 1));
const { linhas: _l, ...munResumo } = municipio;
console.log(JSON.stringify({ ...resultado, municipio: munResumo }, null, 1));
