import { createReadStream } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from './config.js';

// Análises do checklist (doc 07) sobre os perfis de seção (src/perfil-secoes.js).
// Dados públicos do TSE, sem máscara (doc 05, regra 6a): o título do mesário é usado para cruzar seções.
// Eleição de Presidente no 2º turno: 6258, cargo 1. Os dois finalistas são os dois números nominais mais votados no país.

const ELEICAO_PRESIDENTE = { 1: 6257, 2: 6258 };
const CARGO_PRESIDENTE = 1;

const moda = (valores) => {
  const c = new Map();
  for (const v of valores) c.set(v, (c.get(v) ?? 0) + 1);
  return [...c].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? null;
};

function ranks(valores) {
  const ordem = valores.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const r = new Array(valores.length);
  for (let i = 0; i < ordem.length; ) {
    let j = i;
    while (j + 1 < ordem.length && ordem[j + 1][0] === ordem[i][0]) j++;
    for (let k = i; k <= j; k++) r[ordem[k][1]] = (i + j) / 2;
    i = j + 1;
  }
  return r;
}

function pearson(a, b) {
  const n = a.length;
  if (n < 3) return null;
  const ma = a.reduce((s, x) => s + x, 0) / n;
  const mb = b.reduce((s, x) => s + x, 0) / n;
  let sab = 0;
  let saa = 0;
  let sbb = 0;
  for (let i = 0; i < n; i++) {
    sab += (a[i] - ma) * (b[i] - mb);
    saa += (a[i] - ma) ** 2;
    sbb += (b[i] - mb) ** 2;
  }
  return saa && sbb ? sab / Math.sqrt(saa * sbb) : null;
}

export const spearman = (a, b) => pearson(ranks(a), ranks(b));

function quantil(valores, p) {
  if (valores.length === 0) return null;
  const s = [...valores].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))];
}

const idSecao = (s) => `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`;
const somar = (alvo, origem) => {
  for (const [k, v] of Object.entries(origem)) alvo[k] = (alvo[k] ?? 0) + v;
  return alvo;
};

/** Reduz uma linha de perfil ao que as análises usam. */
export function resumirSecao(perfil) {
  const eleicao = perfil.bu.eleicoes.find((e) => e.idEleicao === ELEICAO_PRESIDENTE[perfil.turno]);
  const votos = eleicao?.cargos.find((c) => c.codigoCargo === CARGO_PRESIDENTE)?.votos ?? {};
  const det = perfil.bu.detalhamentoComparecimento ?? {};
  const log = perfil.log ?? {};
  return {
    uf: perfil.uf, municipio: perfil.municipio, zona: perfil.zona, secao: perfil.secao,
    tipoUrna: perfil.bu.urna.tipoUrna, versao: perfil.bu.urna.versao, modelo: log.modeloUrna ?? null,
    numeroInternoUrna: perfil.bu.urna.numeroInternoUrna, serialFV: perfil.bu.urna.numeroSerieFV, serialMR: log.serialMR ?? null,
    aptos: eleicao?.aptos ?? null, aptosTTE: eleicao?.aptosTTE ?? 0, comparecimento: perfil.bu.qtdEleitoresCompareceram,
    votos,
    semBiometriaCadastrada: det.semBiometriaCadastrada ?? 0,
    comBiometriaPorAnoNascimento: det.comBiometriaHabilitadosPorAnoNascimento ?? 0,
    porBiometria: det.porBiometria ?? 0,
    habilitadosPeloMesario: log.habilitadosPeloMesario ?? 0,
    maiorMesario: Math.max(0, ...Object.values(log.mesarios?.liberacoesPorMesario ?? {})),
    titulosMesarios: [...new Set((log.mesarios?.registros ?? []).map((r) => r.titulo))],
    jaVotou: log.jaVotou ?? 0,
    horaAberturaLocal: log.urnaPronta == null ? null : Math.floor(log.urnaPronta / 3600),
    votosPorHoraLocal: log.votosPorHoraLocal ?? null,
    votosForaDaJanela: log.votosForaDaJanela ?? 0,
    reinicios: log.reiniciosDuranteVotacao ?? 0,
    logsNoPacote: log.logsNoPacote ?? 0,
    maiorRajada: log.maiorRajadaSemBiometria10min ?? 0,
    habilitacaoAteVoto: log.tempoHabilitacaoAteVoto?.faixas ?? null, // faixas: <5,<10,<15,<20,<30,<45,<60,>=60 s
    intervaloMinimoEntreVotos: log.intervaloEntreVotos?.minimo ?? null,
  };
}

/** Calcula todas as métricas a partir das seções resumidas. */
export function analisar(secoes) {
  // finalistas = dois números nominais mais votados no total
  const totalNominal = {};
  for (const s of secoes) for (const [k, v] of Object.entries(s.votos)) if (/^\d+$/.test(k)) totalNominal[k] = (totalNominal[k] ?? 0) + v;
  const [A, B] = Object.entries(totalNominal).sort((a, b) => b[1] - a[1]).map(([k]) => k);

  // fuso: hora local de abertura mais comum no município (abertura = 08:00 de Brasília no país; ZZ usa o horário local)
  const aberturaMunicipio = new Map();
  for (const s of secoes) {
    if (s.horaAberturaLocal === null || s.tipoUrna !== 1) continue;
    const k = `${s.uf}/${s.municipio}`;
    if (!aberturaMunicipio.has(k)) aberturaMunicipio.set(k, []);
    aberturaMunicipio.get(k).push(s.horaAberturaLocal);
  }
  const horaAbertura = new Map([...aberturaMunicipio].map(([k, v]) => [k, moda(v)]));

  const porUf = {};
  const nac = { secoes: 0, aptos: 0, aptosTTE: 0, comparecimento: 0, votos: {}, semBiometriaCadastrada: 0, comBiometriaPorAnoNascimento: 0, habilitadosPeloMesario: 0, jaVotou: 0, votosApos17hBrasilia: 0, secoesComVotoApos17h: 0, votosForaDaJanela: 0 };
  const listas = { cem: [], noventa: [], comparecimentoMaiorIgualAptos: [], foraDaJanela: [], semAbertura: [] };
  const dist = { taxaSemBiometria: [], maiorMesario: [], maiorRajada: [], jaVotou: [] };
  const corr = { taxa: [], parcelaA: [], porUf: {} };
  const modelos = {};
  const versoes = {};
  const seriais = { urna: new Map(), fv: new Map(), mr: new Map(), mesario: new Map() };
  const rapidos = { habilitacaoAteVotoMenos5s: 0, habilitacaoAteVotoMenos10s: 0, secoes: [] };
  const contingencia = { tipoUrna4: 0, pacotesComMaisDeUmLog: 0, reinicioDuranteVotacao: 0 };

  for (const s of secoes) {
    const u = (porUf[s.uf] ??= { secoes: 0, aptos: 0, aptosTTE: 0, comparecimento: 0, votos: {}, semBiometria: 0, votosApos17hBrasilia: 0, cem: 0, noventa: 0 });
    const validosAB = (s.votos[A] ?? 0) + (s.votos[B] ?? 0);
    const semBio = s.semBiometriaCadastrada + s.comBiometriaPorAnoNascimento;
    u.secoes++; nac.secoes++;
    u.aptos += s.aptos ?? 0; nac.aptos += s.aptos ?? 0;
    u.aptosTTE += s.aptosTTE; nac.aptosTTE += s.aptosTTE;
    u.comparecimento += s.comparecimento; nac.comparecimento += s.comparecimento;
    somar(u.votos, s.votos); somar(nac.votos, s.votos);
    u.semBiometria += semBio;
    nac.semBiometriaCadastrada += s.semBiometriaCadastrada;
    nac.comBiometriaPorAnoNascimento += s.comBiometriaPorAnoNascimento;
    nac.habilitadosPeloMesario += s.habilitadosPeloMesario;
    nac.jaVotou += s.jaVotou;
    nac.votosForaDaJanela += s.votosForaDaJanela;

    // A2: votos após 17h de Brasília (= abertura local do município + 9 h)
    const h0 = horaAbertura.get(`${s.uf}/${s.municipio}`);
    if (h0 == null || !s.votosPorHoraLocal) listas.semAbertura.push(idSecao(s));
    else {
      const apos = s.votosPorHoraLocal.slice(h0 + 9).reduce((a, x) => a + x, 0);
      u.votosApos17hBrasilia += apos; nac.votosApos17hBrasilia += apos;
      if (apos) nac.secoesComVotoApos17h++;
    }
    // A3/A4
    if (validosAB > 0) {
      const maior = Math.max(s.votos[A] ?? 0, s.votos[B] ?? 0);
      const quem = (s.votos[A] ?? 0) >= (s.votos[B] ?? 0) ? A : B;
      if (maior === validosAB) { u.cem++; listas.cem.push({ secao: idSecao(s), para: quem, votos: validosAB }); }
      if (maior / validosAB >= 0.9) { u.noventa++; listas.noventa.push({ secao: idSecao(s), para: quem, votos: validosAB, parcela: +(maior / validosAB).toFixed(3) }); }
    }
    // A7
    if (s.aptos && s.comparecimento >= s.aptos) listas.comparecimentoMaiorIgualAptos.push({ secao: idSecao(s), aptos: s.aptos, comparecimento: s.comparecimento, aptosTTE: s.aptosTTE, tipoUrna: s.tipoUrna });
    if (s.votosForaDaJanela) listas.foraDaJanela.push({ secao: idSecao(s), votos: s.votosForaDaJanela });
    // A5/A9/B1b/A11
    if (s.comparecimento > 0) dist.taxaSemBiometria.push(semBio / s.comparecimento);
    dist.maiorMesario.push(s.maiorMesario);
    dist.maiorRajada.push(s.maiorRajada);
    dist.jaVotou.push(s.jaVotou);
    if (validosAB >= 20 && s.comparecimento > 0) {
      corr.taxa.push(semBio / s.comparecimento);
      corr.parcelaA.push((s.votos[A] ?? 0) / validosAB);
      const c = (corr.porUf[s.uf] ??= { taxa: [], parcelaA: [] });
      c.taxa.push(semBio / s.comparecimento);
      c.parcelaA.push((s.votos[A] ?? 0) / validosAB);
    }
    // A8
    const km = `${s.uf}|${s.modelo}`;
    modelos[km] = (modelos[km] ?? 0) + 1;
    versoes[s.versao] = (versoes[s.versao] ?? 0) + 1;
    // A12
    for (const [campo, valor] of [['urna', s.numeroInternoUrna], ['fv', s.serialFV], ['mr', s.serialMR], ...(s.titulosMesarios ?? []).map((t) => ['mesario', t])]) {
      if (valor == null) continue;
      if (!seriais[campo].has(valor)) seriais[campo].set(valor, []);
      seriais[campo].get(valor).push(idSecao(s));
    }
    // A10
    if (s.habilitacaoAteVoto) {
      rapidos.habilitacaoAteVotoMenos5s += s.habilitacaoAteVoto[0];
      rapidos.habilitacaoAteVotoMenos10s += s.habilitacaoAteVoto[0] + s.habilitacaoAteVoto[1];
      const n = s.habilitacaoAteVoto[0] + s.habilitacaoAteVoto[1];
      if (n) rapidos.secoes.push({ secao: idSecao(s), menos10s: n, menos5s: s.habilitacaoAteVoto[0], comparecimento: s.comparecimento });
    }
    // D3
    if (s.tipoUrna === 4) contingencia.tipoUrna4++;
    if (s.logsNoPacote > 1) contingencia.pacotesComMaisDeUmLog++;
    if (s.reinicios > 0) contingencia.reinicioDuranteVotacao++;
  }

  const repetidos = (m) => [...m].filter(([, v]) => new Set(v).size > 1).map(([serial, v]) => ({ serial, secoes: [...new Set(v)] }));
  const resumoDist = (v) => ({ mediana: quantil(v, 0.5), p90: quantil(v, 0.9), p99: quantil(v, 0.99), maximo: quantil(v, 1) });

  return {
    finalistas: [A, B],
    nacional: nac,
    porUf,
    a2: { votosApos17hBrasilia: nac.votosApos17hBrasilia, secoesComVotoApos17h: nac.secoesComVotoApos17h, secoesSemHorarioDeAbertura: listas.semAbertura.length },
    a3a4: { cem: listas.cem.length, noventa: listas.noventa.length, cemPorCandidato: somar({}, Object.fromEntries([A, B].map((c) => [c, listas.cem.filter((x) => x.para === c).length]))), noventaPorCandidato: Object.fromEntries([A, B].map((c) => [c, listas.noventa.filter((x) => x.para === c).length])), listaCem: listas.cem },
    a5: { semBiometriaCadastrada: nac.semBiometriaCadastrada, comBiometriaPorAnoNascimento: nac.comBiometriaPorAnoNascimento, habilitadosPeloMesario: nac.habilitadosPeloMesario, taxaPorSecao: resumoDist(dist.taxaSemBiometria) },
    a6: { aptosTTE: nac.aptosTTE },
    a7: { secoes: listas.comparecimentoMaiorIgualAptos.length, lista: listas.comparecimentoMaiorIgualAptos },
    a8: { modelos, versoes },
    a9: { spearmanNacional: spearman(corr.taxa, corr.parcelaA), candidatoReferencia: A, secoes: corr.taxa.length, porUf: Object.fromEntries(Object.entries(corr.porUf).map(([uf, c]) => [uf, spearman(c.taxa, c.parcelaA)])) },
    a10: { habilitacaoAteVotoMenos5s: rapidos.habilitacaoAteVotoMenos5s, habilitacaoAteVotoMenos10s: rapidos.habilitacaoAteVotoMenos10s, secoesMaisRapidas: rapidos.secoes.sort((a, b) => b.menos10s - a.menos10s).slice(0, 50) },
    a11: { jaVotou: nac.jaVotou, secoesComJaVotou: dist.jaVotou.filter((x) => x > 0).length, porSecao: resumoDist(dist.jaVotou) },
    a12: { urnaRepetida: repetidos(seriais.urna), fvRepetida: repetidos(seriais.fv), mrRepetida: repetidos(seriais.mr) },
    a13: { mesarioEmMaisDeUmaSecao: repetidos(seriais.mesario) },
    b1b: { maiorMesarioPorSecao: resumoDist(dist.maiorMesario), maiorRajada10min: resumoDist(dist.maiorRajada) },
    d2: { votosForaDaJanela: nac.votosForaDaJanela, lista: listas.foraDaJanela },
    d3: contingencia,
  };
}

async function* lerPerfis(dir) {
  for (const arquivo of (await readdir(dir)).filter((n) => /^[a-z]{2}\.jsonl$/.test(n)).sort()) {
    const linhas = createInterface({ input: createReadStream(path.join(dir, arquivo)), crlfDelay: Infinity });
    for await (const linha of linhas) if (linha) yield JSON.parse(linha);
  }
}

async function principal() {
  const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, origem: { type: 'string' }, destino: { type: 'string' } } });
  const origem = path.resolve(values.origem ?? path.join(DIR_DADOS, 'parsed', `${values.turno}t`, 'perfil'));
  const destino = path.resolve(values.destino ?? path.join(DIR_DADOS, 'parsed', `${values.turno}t`, 'analises.json'));
  const secoes = [];
  for await (const p of lerPerfis(origem)) secoes.push(resumirSecao(p));
  const r = analisar(secoes);
  await mkdir(path.dirname(destino), { recursive: true });
  await writeFile(destino, `${JSON.stringify(r, null, 1)}\n`);
  const [A, B] = r.finalistas;
  const n = r.nacional;
  console.log(`seções ${n.secoes} | aptos ${n.aptos} | comparecimento ${n.comparecimento} | ${A}: ${n.votos[A]} | ${B}: ${n.votos[B]} | brancos ${n.votos.branco ?? 0} | nulos ${n.votos.nulo ?? 0}`);
  console.log(`A2 votos após 17h (Brasília): ${r.a2.votosApos17hBrasilia} em ${r.a2.secoesComVotoApos17h} seções (sem horário de abertura: ${r.a2.secoesSemHorarioDeAbertura})`);
  console.log(`A3 100% para um finalista: ${r.a3a4.cem} ${JSON.stringify(r.a3a4.cemPorCandidato)} | A4 ≥90%: ${r.a3a4.noventa} ${JSON.stringify(r.a3a4.noventaPorCandidato)}`);
  console.log(`A5 sem biometria cadastrada: ${r.a5.semBiometriaCadastrada} | com biometria liberados por ano de nascimento: ${r.a5.comBiometriaPorAnoNascimento} (com digital do mesário: ${r.a5.habilitadosPeloMesario}) | taxa por seção ${JSON.stringify(r.a5.taxaPorSecao)}`);
  console.log(`A6 aptos em trânsito (TTE): ${r.a6.aptosTTE} | A7 comparecimento ≥ aptos: ${r.a7.secoes} seções`);
  console.log(`A8 versões: ${JSON.stringify(r.a8.versoes)}`);
  console.log(`A9 Spearman(taxa sem biometria, parcela do ${A}) = ${r.a9.spearmanNacional?.toFixed(3)} em ${r.a9.secoes} seções (sem controles)`);
  console.log(`A10 habilitação→voto <5s: ${r.a10.habilitacaoAteVotoMenos5s} | <10s: ${r.a10.habilitacaoAteVotoMenos10s}`);
  console.log(`A11 "já votou": ${r.a11.jaVotou} em ${r.a11.secoesComJaVotou} seções`);
  console.log(`A12 repetições → urna: ${r.a12.urnaRepetida.length} | flash de votação: ${r.a12.fvRepetida.length} | mídia de resultado: ${r.a12.mrRepetida.length}`);
  console.log(`A13 mesário registrado em mais de uma seção: ${r.a13.mesarioEmMaisDeUmaSecao.length}`);
  console.log(`B1b maior nº de liberações por um mesário numa seção: ${JSON.stringify(r.b1b.maiorMesarioPorSecao)} | rajada 10 min: ${JSON.stringify(r.b1b.maiorRajada10min)}`);
  console.log(`D2 votos fora da janela: ${r.d2.votosForaDaJanela} | D3 contingência: ${JSON.stringify(r.d3)}`);
  console.log(`relatório completo: ${destino}`);
}

if (import.meta.filename === path.resolve(process.argv[1] ?? '')) await principal();
