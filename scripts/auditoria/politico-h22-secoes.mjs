// Cientista político, H22: exterior (ZZ) seção a seção e país a país, nos dois turnos.
//
// Universo: todas as seções do exterior nos dois turnos (tabela secao, uf = 'zz'): com urna, do Sistema de Apuração
// (BU de cédula) e não instaladas. Mede:
//   - processo: comparecimento acima dos aptos e do cadastro; seções que existem ou mudam de tipo num turno só;
//     BU × diário da urna (votos computados no log); votos fora da janela e depois das 18 h locais; ritmo (pico por hora,
//     maior rajada em 10 min, intervalo entre votos e tempo da habilitação ao voto); aptos que mudam entre turnos;
//   - política: variação do comparecimento e do voto 1º → 2º por continente, país e cidade; para onde foi o
//     disponível (eliminados + queda de brancos/nulos + comparecimento novo); seções que destoam da própria cidade;
//     teste de neutralidade (o comparecimento novo cresceu mais onde um lado era mais forte?).
// No exterior só se vota para presidente, nos dois turnos: a cédula é a mesma, e o ritmo do 1º turno é a linha de base
// natural do 2º na mesma seção.
//
// Uso: node scripts/auditoria/politico-h22-secoes.mjs
// Saídas: data/parsed/auditoria/cientista-politico/h22-exterior.json (resumo), h22-secoes.jsonl (uma linha por seção),
//         h22-paises.csv (tabela por país).
// Não grava título de mesário nem de eleitor: do campo `dados` do perfil do log só saem contagens.
import { mkdirSync, writeFileSync } from 'node:fs';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_SAIDA, chave, lerLocaisZZ, lerCadastroZZ, quantil, mediana, mad, r, pp, pearson, inclinacao, aleatorio } from './politico-h22-lib.mjs';

const { db, fonte } = await abrirLeitura();
const { cidades, secoes: locais } = await lerLocaisZZ();
const cadastro = await lerCadastroZZ();
const FINALISTAS = ['13', '22'];

// ---------- leitura do banco ----------
const linhasSecao = db.prepare(`SELECT turno, municipio, zona, secao, situacao, status_aux, tipo_urna, tipo_arquivo, modelo_urna,
    numero_interno_urna, comparecimento, hash, abertura, encerramento, emissao FROM secao WHERE uf = 'zz'`).all();
const linhasEleicao = db.prepare(`SELECT turno, municipio, zona, secao, aptos, aptos_secao, aptos_tte, comparecimento_majoritario
    FROM secao_eleicao WHERE uf = 'zz'`).all();
const linhasVoto = db.prepare(`SELECT turno, municipio, zona, secao, tipo_voto, numero, SUM(quantidade) q FROM voto_bu
    WHERE uf = 'zz' AND cargo = 1 GROUP BY 1, 2, 3, 4, 5, 6`).all();
const linhasLog = db.prepare(`SELECT turno, municipio, zona, secao, hash, logs_no_pacote, votos_computados, votos_fora_da_janela,
    urna_pronta_s, inicio_encerramento_s, primeiro_voto_s, ultimo_voto_s, ja_votou, eleitor_nao_encontrado, impedidos,
    suspensos_pelo_mesario, reinicios_durante_votacao, habilitados_biometria, ano_nascimento_sem_biometria, dado_pessoal_confere,
    habilitados_pelo_mesario, maior_rajada_sem_biometria_10min, sem_biometria_ultima_hora, intervalo_minimo_entre_votos,
    tempo_minimo_habilitacao_voto, mesarios_registrados, dados FROM perfil_log WHERE uf = 'zz'`).all();
const linhasAgregada = db.prepare(`SELECT turno, municipio, zona, secao, secao_principal FROM secao_agregada WHERE uf = 'zz'`).all();
// Linha de base: aptos de presidente que mudam entre os turnos, Brasil × exterior.
const aptosMudamBase = db.prepare(`SELECT CASE WHEN a.uf = 'zz' THEN 'exterior' ELSE 'brasil' END grupo, COUNT(*) secoes,
    SUM(CASE WHEN a.aptos <> b.aptos THEN 1 ELSE 0 END) mudam, SUM(b.aptos - a.aptos) saldo, SUM(ABS(b.aptos - a.aptos)) absoluto
  FROM secao_eleicao a JOIN secao_eleicao b ON b.turno = 2 AND b.uf = a.uf AND b.municipio = a.municipio AND b.zona = a.zona
    AND b.secao = a.secao AND b.eleicao = 6258
  WHERE a.turno = 1 AND a.eleicao = 6257 GROUP BY 1`).all();
// Linha de base do Brasil para o intervalo mínimo entre votos (2º turno, só coluna numérica).
const intervaloBrasil = db.prepare(`SELECT intervalo_minimo_entre_votos v FROM perfil_log
    WHERE turno = 2 AND uf <> 'zz' AND intervalo_minimo_entre_votos IS NOT NULL`).all().map((x) => x.v);

// ---------- montagem por seção ----------
const S = new Map(); // chave → { cidade, t: {1: {...}, 2: {...}} }
const sec = (mun, zona, secao) => {
  const k = chave(mun, zona, secao);
  if (!S.has(k)) S.set(k, { k, mun, t: { 1: null, 2: null }, agregadas: { 1: [], 2: [] } });
  return S.get(k);
};
for (const l of linhasSecao) {
  sec(l.municipio, l.zona, l.secao).t[l.turno] = {
    situacao: l.situacao, statusAux: l.status_aux, tipoUrna: l.tipo_urna, tipoArquivo: l.tipo_arquivo, modelo: l.modelo_urna,
    urna: l.numero_interno_urna, compSecao: l.comparecimento, hash: l.hash, abertura: l.abertura, encerramento: l.encerramento,
    emissao: l.emissao, aptos: null, comp: null, votos: {}, branco: 0, nulo: 0, log: null,
  };
}
const semLinhaSecao = { eleicao: 0, voto: 0, log: 0, agregada: 0 };
for (const l of linhasEleicao) {
  const t = S.get(chave(l.municipio, l.zona, l.secao))?.t[l.turno];
  if (!t) { semLinhaSecao.eleicao++; continue; }
  t.aptos = l.aptos; t.aptosTTE = l.aptos_tte; t.comp = l.comparecimento_majoritario;
}
for (const l of linhasVoto) {
  const t = S.get(chave(l.municipio, l.zona, l.secao))?.t[l.turno];
  if (!t) { semLinhaSecao.voto++; continue; }
  if (l.tipo_voto === 'nominal') t.votos[String(l.numero)] = (t.votos[String(l.numero)] ?? 0) + l.q;
  else if (l.tipo_voto === 'branco') t.branco += l.q;
  else t.nulo += l.q;
}
for (const l of linhasLog) {
  const t = S.get(chave(l.municipio, l.zona, l.secao))?.t[l.turno];
  if (!t || t.hash !== l.hash) { semLinhaSecao.log++; continue; }
  const d = JSON.parse(l.dados)?.log ?? {};
  t.log = {
    logsNoPacote: l.logs_no_pacote, votos: l.votos_computados, foraJanela: l.votos_fora_da_janela, pronta: l.urna_pronta_s,
    encerramento: l.inicio_encerramento_s, primeiro: l.primeiro_voto_s, ultimo: l.ultimo_voto_s, jaVotou: l.ja_votou,
    naoEncontrado: l.eleitor_nao_encontrado, impedidos: l.impedidos, suspensos: l.suspensos_pelo_mesario, reinicios: l.reinicios_durante_votacao,
    biometria: l.habilitados_biometria, anoNascimento: l.ano_nascimento_sem_biometria, dadoPessoal: l.dado_pessoal_confere,
    manual: l.habilitados_pelo_mesario, rajada10: l.maior_rajada_sem_biometria_10min, ultimaHora: l.sem_biometria_ultima_hora,
    intervaloMin: l.intervalo_minimo_entre_votos, habMin: l.tempo_minimo_habilitacao_voto, mesarios: l.mesarios_registrados,
    porHora: d.votosPorHoraLocal ?? null, faixasIntervalo: d.intervaloEntreVotos?.faixas ?? null, faixasHab: d.tempoHabilitacaoAteVoto?.faixas ?? null,
  };
}
for (const l of linhasAgregada) {
  const s = S.get(chave(l.municipio, l.zona, l.secao_principal));
  if (!s) { semLinhaSecao.agregada++; continue; }
  s.agregadas[l.turno].push(chave(l.municipio, l.zona, l.secao));
}

const cidadeDe = (mun) => cidades.get(String(Number(mun))) ?? cidades.get(mun) ?? { nome: '?', pais: '?', continente: '?' };
const categoria = (t) => (!t ? 'ausente' : t.situacao === 'sem_arquivo' ? 'nao_instalada' : /^sa/.test(t.tipoArquivo ?? '') ? 'apuracao' : 'urna');
const soma = (o) => Object.values(o).reduce((a, b) => a + b, 0);

// ---------- 1. Universo e presença nos dois turnos (processo) ----------
const universo = { secoes: S.size, porTurno: {}, transicoes: {}, soNumTurno: [] };
for (const turno of [1, 2]) {
  const c = {};
  for (const s of S.values()) { const k = categoria(s.t[turno]); c[k] = (c[k] ?? 0) + 1; }
  universo.porTurno[turno] = c;
}
for (const s of S.values()) {
  const k = `${categoria(s.t[1])} → ${categoria(s.t[2])}${s.t[1] && s.t[2] && s.t[1].tipoArquivo !== s.t[2].tipoArquivo ? ` (${s.t[1].tipoArquivo} → ${s.t[2].tipoArquivo})` : ''}`;
  universo.transicoes[k] = (universo.transicoes[k] ?? 0) + 1;
  if (!s.t[1] || !s.t[2]) universo.soNumTurno.push(s.k);
}
universo.semLinhaSecao = semLinhaSecao;
// Locais (eleitorado_local_votacao): seções principais e agregadas por turno, e se batem com o banco.
const locaisPorTurno = { 1: { principal: 0, agregada: 0 }, 2: { principal: 0, agregada: 0 } };
const divergenciaLocais = [];
for (const [kk, v] of locais) {
  const [turno, k] = kk.split('|');
  locaisPorTurno[turno][v.tipo === 'Agregada' ? 'agregada' : 'principal']++;
  if (v.tipo === 'Principal' && !S.get(k)?.t[turno]) divergenciaLocais.push(`${turno}|${k} principal sem linha no banco`);
  if (v.tipo === 'Agregada' && !S.get(v.principal)?.agregadas[turno].includes(k)) divergenciaLocais.push(`${turno}|${k} agregada a ${v.principal} sem par no banco`);
}
for (const s of S.values()) for (const turno of [1, 2]) if (s.t[turno] && !locais.has(`${turno}|${s.k}`)) divergenciaLocais.push(`${turno}|${s.k} no banco e fora dos locais`);
universo.locais = { porTurno: locaisPorTurno, divergencias: divergenciaLocais.length, exemplos: divergenciaLocais.slice(0, 10) };

// ---------- 2. Contagem (processo): comparecimento × aptos × cadastro; BU × log ----------
const processo = {
  compAcimaAptos: [], compAcimaCadastro: [], aptosMudam: { secoes: 0, saldo: 0, lista: [] }, aptosDiferemCadastro: { 1: 0, 2: 0, exemplos: [] },
  buDifereLog: { 1: [], 2: [] }, compSecaoDifereEleicao: { 1: 0, 2: 0 }, votosDifereComp: { 1: [], 2: [] },
  foraJanela: { 1: 0, 2: 0 }, apos18hLocal: { 1: { secoes: 0, votos: 0 }, 2: { secoes: 0, votos: 0 } }, antes8hLocal: { 1: 0, 2: 0 },
  logSemVoto: { 1: 0, 2: 0 }, biometriaOuManual: { 1: 0, 2: 0 }, naoInstaladasComVoto: 0,
};
const cadastroSecao = (s) => {
  // cadastro da principal + agregadas (pelo turno 2; as agregadas são as mesmas nos dois turnos, conferido em `universo.locais`)
  let e = cadastro.get(s.k)?.eleitores ?? 0, b = cadastro.get(s.k)?.biometria ?? 0;
  for (const a of s.agregadas[2]) { e += cadastro.get(a)?.eleitores ?? 0; b += cadastro.get(a)?.biometria ?? 0; }
  return { eleitores: e, biometria: b };
};
for (const s of S.values()) {
  s.cadastro = cadastroSecao(s);
  for (const turno of [1, 2]) {
    const t = s.t[turno];
    if (!t) continue;
    if (t.situacao === 'sem_arquivo') { if (t.comp) processo.naoInstaladasComVoto++; continue; }
    const votosTot = soma(t.votos) + t.branco + t.nulo;
    if (votosTot !== t.comp) processo.votosDifereComp[turno].push(`${s.k} votos ${votosTot} comp ${t.comp}`);
    if (t.comp > t.aptos) processo.compAcimaAptos.push({ turno, secao: s.k, comp: t.comp, aptos: t.aptos });
    if (t.comp > s.cadastro.eleitores) processo.compAcimaCadastro.push({ turno, secao: s.k, comp: t.comp, cadastro: s.cadastro.eleitores });
    if (t.aptos !== s.cadastro.eleitores) { processo.aptosDiferemCadastro[turno]++; if (processo.aptosDiferemCadastro.exemplos.length < 8) processo.aptosDiferemCadastro.exemplos.push(`${turno}|${s.k} aptos ${t.aptos} cadastro ${s.cadastro.eleitores}`); }
    if (categoria(t) === 'urna') {
      if (t.compSecao !== t.comp) processo.compSecaoDifereEleicao[turno]++;
      const L = t.log;
      if (!L) { processo.logSemVoto[turno]++; continue; }
      if (L.votos !== t.comp) processo.buDifereLog[turno].push({ secao: s.k, bu: t.comp, log: L.votos, logsNoPacote: L.logsNoPacote, tipo: t.tipoUrna, arquivo: t.tipoArquivo });
      processo.foraJanela[turno] += L.foraJanela ?? 0;
      if (L.biometria || L.manual) processo.biometriaOuManual[turno]++;
      if (L.porHora) {
        const tarde = L.porHora.slice(18).reduce((a, b) => a + b, 0);
        if (tarde) { processo.apos18hLocal[turno].secoes++; processo.apos18hLocal[turno].votos += tarde; }
        processo.antes8hLocal[turno] += L.porHora.slice(0, 8).reduce((a, b) => a + b, 0);
      }
    }
  }
  if (s.t[1]?.aptos != null && s.t[2]?.aptos != null && s.t[1].aptos !== s.t[2].aptos) {
    processo.aptosMudam.secoes++; processo.aptosMudam.saldo += s.t[2].aptos - s.t[1].aptos;
    processo.aptosMudam.lista.push(`${s.k} ${s.t[1].aptos}→${s.t[2].aptos}`);
  }
}
for (const turno of [1, 2]) processo.buDifereLog[turno + 'Total'] = processo.buDifereLog[turno].length;

// ---------- 3. Ritmo (processo): mesma cédula nos dois turnos ----------
const ritmo = { porTurno: {}, picoAcimaDoMaximo1T: [], intervaloMenor5s: { 1: [], 2: [] }, habMenor5s: { 1: 0, 2: 0 }, pareado: {} };
for (const turno of [1, 2]) {
  const urnas = [...S.values()].map((s) => s.t[turno]).filter((t) => categoria(t) === 'urna' && t.log && t.log.votos > 0);
  const pico = urnas.map((t) => Math.max(...(t.log.porHora ?? [0])));
  const faixas = new Array(8).fill(0), hab = new Array(8).fill(0);
  for (const t of urnas) { t.log.faixasIntervalo?.forEach((x, i) => (faixas[i] += x)); t.log.faixasHab?.forEach((x, i) => (hab[i] += x)); }
  const totalInt = faixas.reduce((a, b) => a + b, 0), totalHab = hab.reduce((a, b) => a + b, 0);
  const duracao = urnas.filter((t) => t.log.ultimo != null && t.log.primeiro != null).map((t) => (t.log.ultimo - t.log.primeiro) / 3600);
  const ultimaHora = urnas.reduce((a, t) => a + (t.log.porHora ? t.log.porHora.slice(16).reduce((x, y) => x + y, 0) : 0), 0);
  const votos = urnas.reduce((a, t) => a + t.log.votos, 0);
  ritmo.porTurno[turno] = {
    secoesComVoto: urnas.length, votos,
    picoPorHora: { p50: quantil(pico, 0.5), p90: quantil(pico, 0.9), p99: quantil(pico, 0.99), max: Math.max(...pico) },
    rajada10min: { p50: quantil(urnas.map((t) => t.log.rajada10), 0.5), p99: quantil(urnas.map((t) => t.log.rajada10), 0.99), max: Math.max(...urnas.map((t) => t.log.rajada10)) },
    intervaloMinimo: { p1: quantil(urnas.map((t) => t.log.intervaloMin), 0.01), p50: quantil(urnas.map((t) => t.log.intervaloMin), 0.5), min: Math.min(...urnas.map((t) => t.log.intervaloMin ?? Infinity)) },
    habilitacaoMinima: { p50: quantil(urnas.map((t) => t.log.habMin), 0.5), min: Math.min(...urnas.map((t) => t.log.habMin ?? Infinity)) },
    faixasIntervalo: { limites: '<5,<10,<15,<20,<30,<45,<60,>=60 s', contagens: faixas, abaixo10sPct: pp((faixas[0] + faixas[1]) / totalInt) },
    faixasHabilitacaoAteVoto: { contagens: hab, abaixo5sPct: pp(hab[0] / totalHab) },
    horasDeVotacao: { p50: r(quantil(duracao, 0.5), 2), p10: r(quantil(duracao, 0.1), 2) },
    votosDas16hEmDiantePct: pp(ultimaHora / votos),
    jaVotou: urnas.reduce((a, t) => a + t.log.jaVotou, 0), eleitorNaoEncontrado: urnas.reduce((a, t) => a + t.log.naoEncontrado, 0),
    suspensos: urnas.reduce((a, t) => a + t.log.suspensos, 0), reinicios: urnas.reduce((a, t) => a + t.log.reinicios, 0),
  };
  for (const t of urnas) {
    if (t.log.faixasIntervalo?.[0]) ritmo.intervaloMenor5s[turno].push(t.log.faixasIntervalo[0]);
    ritmo.habMenor5s[turno] += t.log.faixasHab?.[0] ?? 0;
  }
}
for (const turno of [1, 2]) ritmo.intervaloMenor5s[turno] = { secoes: ritmo.intervaloMenor5s[turno].length, intervalos: ritmo.intervaloMenor5s[turno].reduce((a, b) => a + b, 0) };
ritmo.brasil2TIntervaloMinimo = { secoes: intervaloBrasil.length, p1: quantil(intervaloBrasil, 0.01), p50: quantil(intervaloBrasil, 0.5), min: quantil(intervaloBrasil, 0) };
// Capacidade observada no 1º turno (maior pico por hora em qualquer seção do exterior) e quem passa dela no 2º.
const max1T = ritmo.porTurno[1].picoPorHora.max;
const pareadas = [...S.values()].filter((s) => categoria(s.t[1]) === 'urna' && categoria(s.t[2]) === 'urna' && s.t[1].log?.porHora && s.t[2].log?.porHora && s.t[1].comp > 0 && s.t[2].comp > 0);
const dPico = [];
for (const s of pareadas) {
  const p1 = Math.max(...s.t[1].log.porHora), p2 = Math.max(...s.t[2].log.porHora);
  s.pico = { 1: p1, 2: p2 };
  dPico.push(p2 - p1);
  if (p2 > max1T) ritmo.picoAcimaDoMaximo1T.push({ secao: s.k, pico1: p1, pico2: p2 });
}
ritmo.pareado = { secoes: pareadas.length, maxPico1T: max1T, deltaPicoPorHora: { p1: quantil(dPico, 0.01), p50: quantil(dPico, 0.5), p99: quantil(dPico, 0.99) } };

// ---------- 4. Política: agregação por continente, país e cidade ----------
const nova = () => ({ secoes: 0, aptos1: 0, aptos2: 0, comp1: 0, comp2: 0, v13_1: 0, v22_1: 0, elim1: 0, bn1: 0, v13_2: 0, v22_2: 0, bn2: 0 });
const add = (a, s) => {
  const t1 = s.t[1], t2 = s.t[2];
  a.secoes++;
  a.aptos1 += t1?.aptos ?? 0; a.aptos2 += t2?.aptos ?? 0; a.comp1 += t1?.comp ?? 0; a.comp2 += t2?.comp ?? 0;
  if (t1) { a.v13_1 += t1.votos['13'] ?? 0; a.v22_1 += t1.votos['22'] ?? 0; a.elim1 += soma(t1.votos) - (t1.votos['13'] ?? 0) - (t1.votos['22'] ?? 0); a.bn1 += t1.branco + t1.nulo; }
  if (t2) { a.v13_2 += t2.votos['13'] ?? 0; a.v22_2 += t2.votos['22'] ?? 0; a.bn2 += t2.branco + t2.nulo; }
};
const fecha = (a) => {
  const d13 = a.v13_2 - a.v13_1, d22 = a.v22_2 - a.v22_1, dComp = a.comp2 - a.comp1;
  return {
    ...a,
    comparecimento1Pct: pp(a.comp1 / a.aptos1), comparecimento2Pct: pp(a.comp2 / a.aptos2), deltaComparecimentoPP: pp(a.comp2 / a.aptos2 - a.comp1 / a.aptos1),
    deltaComparecimentoRelPct: pp(dComp / a.comp1), d13, d22, dComp, quedaBrancoNulo: a.bn1 - a.bn2,
    disponivel: a.elim1 + (a.bn1 - a.bn2) + dComp,
    parteDisponivel13Pct: d13 + d22 ? pp(d13 / (d13 + d22)) : null,
    fatia13_1Pct: pp(a.v13_1 / (a.v13_1 + a.v22_1)), fatia13_2Pct: pp(a.v13_2 / (a.v13_2 + a.v22_2)),
    fatia13_2Votos: pp(a.v13_2 / (a.v13_2 + a.v22_2)), elim1Pct: pp(a.elim1 / a.comp1),
  };
};
const grupos = { total: new Map(), continente: new Map(), pais: new Map(), cidade: new Map() };
for (const s of S.values()) {
  const c = cidadeDe(s.mun);
  s.cidade = c;
  for (const [g, k] of [['total', 'exterior'], ['continente', c.continente], ['pais', c.pais], ['cidade', `${s.mun} ${c.nome} (${c.pais})`]]) {
    if (!grupos[g].has(k)) grupos[g].set(k, nova());
    add(grupos[g].get(k), s);
  }
}
const politica = {};
for (const [g, m] of Object.entries(grupos)) politica[g] = [...m].map(([k, a]) => ({ nome: k, ...fecha(a) })).sort((x, y) => y.comp2 - x.comp2);
// Concentração do comparecimento novo
const dTot = politica.total[0].dComp;
const ordemPaises = [...politica.pais].sort((a, b) => b.dComp - a.dComp);
politica.concentracao = {
  dCompTotal: dTot,
  top5Paises: ordemPaises.slice(0, 5).map((p) => ({ pais: p.nome, dComp: p.dComp, parte: pp(p.dComp / dTot) })),
  paisesComQueda: politica.pais.filter((p) => p.dComp < 0).map((p) => ({ pais: p.nome, dComp: p.dComp })),
  cidadesComQueda: politica.cidade.filter((p) => p.dComp < 0).length, cidades: politica.cidade.length,
};
// Cidades em que um finalista perdeu votos e o outro ganhou mais que o disponível
politica.cidadesGanhoAcimaDisponivel = politica.cidade.filter((c) => c.d13 > c.disponivel || c.d22 > c.disponivel)
  .map((c) => ({ cidade: c.nome, d13: c.d13, d22: c.d22, disponivel: c.disponivel, dComp: c.dComp }));

// ---------- 5. Seções que destoam da própria cidade (z robusto) ----------
const elegiveis = pareadas.filter((s) => s.t[2].aptos >= 50 && s.t[1].aptos >= 50);
const porCidade = new Map();
for (const s of elegiveis) {
  const t1 = s.t[1], t2 = s.t[2];
  const a1 = t1.votos['13'] ?? 0, b1 = t1.votos['22'] ?? 0, a2 = t2.votos['13'] ?? 0, b2 = t2.votos['22'] ?? 0;
  s.m = {
    dCompTaxa: t2.comp / t2.aptos - t1.comp / t1.aptos,
    fatia13_1: a1 + b1 ? a1 / (a1 + b1) : null, fatia13_2: a2 + b2 ? a2 / (a2 + b2) : null,
  };
  s.m.dFatia13 = s.m.fatia13_1 != null && s.m.fatia13_2 != null ? s.m.fatia13_2 - s.m.fatia13_1 : null;
  if (!porCidade.has(s.mun)) porCidade.set(s.mun, []);
  porCidade.get(s.mun).push(s);
}
const destoantes = { criterio: '|z robusto| >= 5 dentro da cidade (mediana e MAD×1,4826), seções com 50+ aptos nos dois turnos e cidade com 5+ seções', dComparecimento: [], dFatia13: [] };
let cidadesAvaliadas = 0, secoesAvaliadas = 0;
for (const [mun, lista] of porCidade) {
  if (lista.length < 5) continue;
  cidadesAvaliadas++; secoesAvaliadas += lista.length;
  for (const campo of ['dCompTaxa', 'dFatia13']) {
    const vals = lista.map((s) => s.m[campo]);
    const med = mediana(vals), escala = (mad(vals) ?? 0) * 1.4826;
    for (const s of lista) {
      if (s.m[campo] == null || !escala) continue;
      const z = (s.m[campo] - med) / escala;
      s.m[`z_${campo}`] = z;
      if (Math.abs(z) >= 5) destoantes[campo === 'dCompTaxa' ? 'dComparecimento' : 'dFatia13'].push({
        secao: s.k, cidade: s.cidade.nome, aptos2: s.t[2].aptos, comp1: s.t[1].comp, comp2: s.t[2].comp,
        valorPP: pp(s.m[campo]), medianaCidadePP: pp(med), z: r(z, 1),
        fatia13_1: pp(s.m.fatia13_1), fatia13_2: pp(s.m.fatia13_2), jaVotou1: s.t[1].log?.jaVotou, jaVotou2: s.t[2].log?.jaVotou,
        urnaTrocada: s.t[1].urna !== s.t[2].urna, tipo2: s.t[2].tipoUrna,
      });
    }
  }
}
destoantes.cidadesAvaliadas = cidadesAvaliadas; destoantes.secoesAvaliadas = secoesAvaliadas;
for (const c of ['dComparecimento', 'dFatia13']) {
  destoantes[c].sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
  const lado = { favorece13: destoantes[c].filter((x) => (c === 'dFatia13' ? x.z > 0 : null)).length, favorece22: destoantes[c].filter((x) => (c === 'dFatia13' ? x.z < 0 : null)).length };
  destoantes[`${c}Resumo`] = c === 'dFatia13' ? { total: destoantes[c].length, ...lado } : {
    total: destoantes[c].length, subiu: destoantes[c].filter((x) => x.z > 0).length, caiu: destoantes[c].filter((x) => x.z < 0).length,
    subiuEmSecaoMais13no1T: destoantes[c].filter((x) => x.z > 0 && x.fatia13_1 > 50).length, subiuEmSecaoMais22no1T: destoantes[c].filter((x) => x.z > 0 && x.fatia13_1 < 50).length,
  };
}

// ---------- 6. Neutralidade: o comparecimento novo cresceu mais onde um lado era mais forte? ----------
// Dentro da cidade (efeito fixo de cidade): Δ comparecimento (pp dos aptos) contra a fatia do 13 no 1º turno (entre 13 e 22).
// Previsão "mobilização simétrica": inclinação ≈ 0. Mobilização de um lado: inclinação com o sinal desse lado.
// Significância por permutação da fatia dentro de cada cidade (2.000 sorteios, semente fixa).
// Controle: a taxa de comparecimento do 1º turno (onde se votou pouco no 1º há mais espaço para crescer).
const xs = [], ys = [], cid = [], x2 = [], g13 = [], g22 = [], dcs = [];
const centra = (lista, f) => { const m = lista.reduce((a, s) => a + f(s), 0) / lista.length; return (s) => f(s) - m; };
for (const lista of porCidade.values()) {
  const ok = lista.filter((s) => s.m.fatia13_1 != null);
  if (ok.length < 2) continue;
  const fx = centra(ok, (s) => s.m.fatia13_1), fy = centra(ok, (s) => s.m.dCompTaxa), fc = centra(ok, (s) => s.t[1].comp / s.t[1].aptos);
  const fdc = centra(ok, (s) => (s.t[2].comp - s.t[1].comp) / s.t[2].aptos);
  const f13 = centra(ok, (s) => ((s.t[2].votos['13'] ?? 0) - (s.t[1].votos['13'] ?? 0)) / s.t[2].aptos);
  const f22 = centra(ok, (s) => ((s.t[2].votos['22'] ?? 0) - (s.t[1].votos['22'] ?? 0)) / s.t[2].aptos);
  for (const s of ok) {
    xs.push(fx(s)); ys.push(fy(s)); x2.push(fc(s)); cid.push(s.mun);
    dcs.push(fdc(s)); g13.push(f13(s)); g22.push(f22(s));
  }
}
const b = inclinacao(xs, ys);
// Regressão com dois regressores (já centrados por cidade): y = b1·fatia13_1 + b2·comparecimento1.
const parcial = (() => {
  let s11 = 0, s12 = 0, s22 = 0, s1y = 0, s2y = 0;
  for (let i = 0; i < xs.length; i++) { s11 += xs[i] ** 2; s12 += xs[i] * x2[i]; s22 += x2[i] ** 2; s1y += xs[i] * ys[i]; s2y += x2[i] * ys[i]; }
  const det = s11 * s22 - s12 ** 2;
  return { fatia13_1: (s22 * s1y - s12 * s2y) / det, comparecimento1: (s11 * s2y - s12 * s1y) / det };
})();
const rnd = aleatorio();
const idx = new Map();
cid.forEach((c, i) => { if (!idx.has(c)) idx.set(c, []); idx.get(c).push(i); });
let extremos = 0;
const N_PERM = 2000;
for (let p = 0; p < N_PERM; p++) {
  const xp = xs.slice();
  for (const lst of idx.values()) {
    const vals = lst.map((i) => xs[i]);
    for (let i = vals.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [vals[i], vals[j]] = [vals[j], vals[i]]; }
    lst.forEach((i, j) => (xp[i] = vals[j]));
  }
  if (Math.abs(inclinacao(xp, ys)) >= Math.abs(b)) extremos++;
}
const neutralidade = {
  secoes: xs.length,
  inclinacaoDCompPorFatia13: r(b, 5), leitura: 'pp de comparecimento a mais por 1 pp a mais de fatia do 13 no 1º turno, dentro da mesma cidade',
  correlacao: r(pearson(xs, ys), 4), pPermutacao: r((extremos + 1) / (N_PERM + 1), 4), permutacoes: N_PERM,
  comControleComparecimento1T: { fatia13_1: r(parcial.fatia13_1, 5), comparecimento1: r(parcial.comparecimento1, 5) },
};
// Ganho de cada finalista (por apto) contra o comparecimento novo (por apto), dentro da cidade: partilha marginal do eleitor a mais.
neutralidade.partilhaMarginal = { ganho13PorEleitorNovo: r(inclinacao(dcs, g13), 3), ganho22PorEleitorNovo: r(inclinacao(dcs, g22), 3), leitura: 'dentro da cidade; soma ≈ 1 menos a parte que foi para brancos/nulos; compara com a fatia de 13 e 22 no comparecimento do 1º turno' };

// Desvio da fatia do 13 com o ruído de amostra: z = (Δfatia − mediana da cidade) / √(p(1−p)(1/n1 + 1/n2)).
// Sem efeito de lado, os desvios grandes se dividem igualmente entre os dois sentidos.
const zBin = { 3: { favorece13: 0, favorece22: 0 }, 4: { favorece13: 0, favorece22: 0 }, lista: [] };
for (const lista of porCidade.values()) {
  if (lista.length < 5) continue;
  const med = mediana(lista.map((s) => s.m.dFatia13));
  for (const s of lista) {
    if (s.m.dFatia13 == null) continue;
    const n1 = (s.t[1].votos['13'] ?? 0) + (s.t[1].votos['22'] ?? 0), n2 = (s.t[2].votos['13'] ?? 0) + (s.t[2].votos['22'] ?? 0);
    const p = Math.min(0.99, Math.max(0.01, s.m.fatia13_1));
    const z = (s.m.dFatia13 - med) / Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
    for (const lim of [3, 4]) if (Math.abs(z) >= lim) zBin[lim][z > 0 ? 'favorece13' : 'favorece22']++;
    if (Math.abs(z) >= 4) zBin.lista.push({ secao: s.k, cidade: s.cidade.nome, z: r(z, 1), comp1: s.t[1].comp, comp2: s.t[2].comp, fatia13_1: pp(s.m.fatia13_1), fatia13_2: pp(s.m.fatia13_2), dCompPP: pp(s.m.dCompTaxa) });
  }
}
destoantes.dFatia13Binomial = zBin;

// Perfil horário do eleitor a mais: o comparecimento novo do 2º turno veio no fim do dia (rajada) ou espalhado como no 1º?
const horas = { 1: new Array(24).fill(0), 2: new Array(24).fill(0) };
for (const s of pareadas) for (const t of [1, 2]) s.t[t].log.porHora.forEach((v, h) => (horas[t][h] += v));
const tot1 = horas[1].reduce((a, v) => a + v, 0), tot2 = horas[2].reduce((a, v) => a + v, 0);
ritmo.perfilHorario = {
  nota: 'hora local da urna; seções com urna nos dois turnos',
  votos1: horas[1], votos2: horas[2], delta: horas[2].map((v, h) => v - horas[1][h]),
  parte1Pct: horas[1].map((v) => pp(v / tot1)), parte2Pct: horas[2].map((v) => pp(v / tot2)),
  parteDoDeltaPct: horas[2].map((v, h) => pp((v - horas[1][h]) / (tot2 - tot1))),
};
ritmo.apos18h1T = [...S.values()].filter((s) => s.t[1]?.log?.porHora?.slice(18).some((v) => v > 0))
  .map((s) => ({ secao: s.k, cidade: s.cidade.nome, depoisDas18h: s.t[1].log.porHora.slice(18).reduce((a, v) => a + v, 0), ultimoVoto: s.t[1].log.ultimo, encerramento: s.t[1].log.encerramento }));
const T = politica.total[0];
neutralidade.fatiasNoComparecimento1T = { '13': pp(T.v13_1 / T.comp1), '22': pp(T.v22_1 / T.comp1), eliminados: pp(T.elim1 / T.comp1), brancoNulo: pp(T.bn1 / T.comp1) };

// ---------- saída ----------
mkdirSync(DIR_SAIDA, { recursive: true });
const resumo = {
  geradoEm: new Date().toISOString(), fonteBanco: fonte, finalistas: FINALISTAS,
  universo, processo: {
    ...processo,
    compAcimaAptos: { total: processo.compAcimaAptos.length, lista: processo.compAcimaAptos },
    compAcimaCadastro: { total: processo.compAcimaCadastro.length, lista: processo.compAcimaCadastro },
    aptosMudam: { ...processo.aptosMudam, lista: processo.aptosMudam.lista.slice(0, 50), linhaDeBase: aptosMudamBase },
    votosDifereComp: { 1: processo.votosDifereComp[1].length, 2: processo.votosDifereComp[2].length, exemplos: [...processo.votosDifereComp[1], ...processo.votosDifereComp[2]].slice(0, 10) },
  },
  ritmo, politica: {
    total: politica.total[0], continente: politica.continente, pais: politica.pais, concentracao: politica.concentracao,
    cidadesGanhoAcimaDisponivel: politica.cidadesGanhoAcimaDisponivel,
    cidadesMaiorAlta: [...politica.cidade].filter((c) => c.aptos2 >= 1000).sort((a, b) => b.deltaComparecimentoPP - a.deltaComparecimentoPP).slice(0, 15),
    cidadesMaiorQueda: [...politica.cidade].filter((c) => c.aptos2 >= 1000).sort((a, b) => a.deltaComparecimentoPP - b.deltaComparecimentoPP).slice(0, 10),
  },
  destoantes, neutralidade,
};
writeFileSync(`${DIR_SAIDA}/h22-exterior.json`, JSON.stringify(resumo, null, 1));
writeFileSync(`${DIR_SAIDA}/h22-secoes.jsonl`, [...S.values()].map((s) => JSON.stringify({
  secao: s.k, cidade: s.cidade.nome, pais: s.cidade.pais, continente: s.cidade.continente, agregadas: s.agregadas[2].length, cadastro: s.cadastro,
  t1: s.t[1] && { cat: categoria(s.t[1]), tipo: s.t[1].tipoUrna, arquivo: s.t[1].tipoArquivo, modelo: s.t[1].modelo, aptos: s.t[1].aptos, comp: s.t[1].comp, votos: s.t[1].votos, branco: s.t[1].branco, nulo: s.t[1].nulo, log: s.t[1].log && { votos: s.t[1].log.votos, porHora: s.t[1].log.porHora, rajada10: s.t[1].log.rajada10, intervaloMin: s.t[1].log.intervaloMin, jaVotou: s.t[1].log.jaVotou, naoEncontrado: s.t[1].log.naoEncontrado, suspensos: s.t[1].log.suspensos } },
  t2: s.t[2] && { cat: categoria(s.t[2]), tipo: s.t[2].tipoUrna, arquivo: s.t[2].tipoArquivo, modelo: s.t[2].modelo, aptos: s.t[2].aptos, comp: s.t[2].comp, votos: s.t[2].votos, branco: s.t[2].branco, nulo: s.t[2].nulo, log: s.t[2].log && { votos: s.t[2].log.votos, porHora: s.t[2].log.porHora, rajada10: s.t[2].log.rajada10, intervaloMin: s.t[2].log.intervaloMin, jaVotou: s.t[2].log.jaVotou, naoEncontrado: s.t[2].log.naoEncontrado, suspensos: s.t[2].log.suspensos } },
  z: s.m ? { dComp: r(s.m.z_dCompTaxa, 2), dFatia13: r(s.m.z_dFatia13, 2) } : null,
})).join('\n') + '\n');
const col = ['nome', 'secoes', 'aptos2', 'comp1', 'comp2', 'comparecimento1Pct', 'comparecimento2Pct', 'deltaComparecimentoPP', 'deltaComparecimentoRelPct', 'v13_1', 'v22_1', 'elim1', 'bn1', 'v13_2', 'v22_2', 'bn2', 'd13', 'd22', 'disponivel', 'parteDisponivel13Pct', 'fatia13_1Pct', 'fatia13_2Pct'];
writeFileSync(`${DIR_SAIDA}/h22-paises.csv`, [col.join(';'), ...politica.pais.map((p) => col.map((c) => p[c]).join(';'))].join('\n') + '\n');

// ---------- console ----------
console.log(`Banco: ${fonte}`);
console.log('Universo:', JSON.stringify(universo.porTurno), '| transições:', JSON.stringify(universo.transicoes), '| locais:', JSON.stringify(universo.locais));
console.log('Comparecimento > aptos:', processo.compAcimaAptos.length, '| > cadastro:', processo.compAcimaCadastro.length, '| aptos mudam entre turnos:', processo.aptosMudam.secoes, 'saldo', processo.aptosMudam.saldo);
console.log('BU ≠ log: 1T', processo.buDifereLog[1].length, '2T', processo.buDifereLog[2].length, '| fora da janela:', JSON.stringify(processo.foraJanela), '| após 18h:', JSON.stringify(processo.apos18hLocal), '| biometria/manual:', JSON.stringify(processo.biometriaOuManual));
console.log('Ritmo 1T:', JSON.stringify(ritmo.porTurno[1]));
console.log('Ritmo 2T:', JSON.stringify(ritmo.porTurno[2]));
console.log('Pareado:', JSON.stringify(ritmo.pareado), 'acima do máximo 1T:', ritmo.picoAcimaDoMaximo1T.length, '| Brasil 2T intervalo mínimo:', JSON.stringify(ritmo.brasil2TIntervaloMinimo));
console.log('Total:', JSON.stringify(politica.total[0]));
for (const c of politica.continente) console.log(`  ${c.nome}: comp ${c.comparecimento1Pct}→${c.comparecimento2Pct} (${c.deltaComparecimentoRelPct}% rel), fatia13 ${c.fatia13_1Pct}→${c.fatia13_2Pct}, parte disp. 13 ${c.parteDisponivel13Pct}%`);
console.log('Concentração:', JSON.stringify(politica.concentracao));
console.log('Destoantes:', JSON.stringify(destoantes.dComparecimentoResumo), JSON.stringify(destoantes.dFatia13Resumo), 'cidades', cidadesAvaliadas, 'seções', secoesAvaliadas);
console.log('Neutralidade:', JSON.stringify(neutralidade));
