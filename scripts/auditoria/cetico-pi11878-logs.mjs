// Cético (lente reprodução e código): abre os arquivos brutos (BU, RDV, assinaturas, log) da seção
// PI 11878/0028/0099 nos dois turnos e compara urna, aptos, horários, mesários e eventos raros.
//
// O 1º turno em data/raw/1t/ não tem aux.json, e por isso `node src/exportar.js --turno 1 ... --stdout`
// devolve "pacotes": [] sem erro. Este script monta um diretório temporário só com a cópia do pacote do
// 1º turno e um aux.json sintético (hash = nome do diretório) e chama exportarSecao() sobre ele. Nada em data/raw é alterado.
//
// Uso: node scripts/auditoria/cetico-pi11878-logs.mjs [--tmp <dir>]
// Saída: data/parsed/auditoria/cetico/pi11878-logs.json (sem títulos de mesário: só contagens)
import { cpSync, mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS, caminhos, dirSecao } from '../../src/config.js';
import { exportarSecao } from '../../src/exportar.js';
import { carregarAcs } from '../../src/lacres.js';
import { carregarReferencia } from '../../src/referencia.js';

const { values } = parseArgs({ options: { tmp: { type: 'string', default: os.tmpdir() } } });
const S = { uf: 'pi', municipio: '11878', zona: '0028', secao: '0099' };
const SAIDA = 'data/parsed/auditoria/cetico/pi11878-logs.json';
const acs = await carregarAcs();

async function exportar(turno) {
  const dirOrig = dirSecao(caminhos(turno, DIR_DADOS).urnas, S);
  const temAux = readdirSync(dirOrig).includes('aux.json');
  if (temAux) return { origem: dirOrig, auxSintetico: false, json: await exportarSecao({ turno: String(turno), secao: S, referencia: await carregarReferencia(String(turno)), acs, modoLog: 'dia' }) };
  const hashes = readdirSync(dirOrig, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  const raiz = mkdtempSync(path.join(values.tmp, 'cetico-pi11878-'));
  const dst = dirSecao(caminhos(turno, raiz).urnas, S);
  mkdirSync(dst, { recursive: true });
  for (const h of hashes) cpSync(path.join(dirOrig, h), path.join(dst, h), { recursive: true });
  writeFileSync(path.join(dst, 'aux.json'), JSON.stringify({ st: 'sintetico', hashes: hashes.map((hash) => ({ hash, st: 'sintetico' })) }));
  try {
    return { origem: dirOrig, auxSintetico: true, pacotesNoDisco: hashes.length, json: await exportarSecao({ turno: String(turno), secao: S, referencia: await carregarReferencia(String(turno)), acs, modoLog: 'dia', dirDados: raiz }) };
  } finally { rmSync(raiz, { recursive: true, force: true }); }
}

const hm = (s) => (s == null ? null : `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`);
function resumir(e) {
  const p = e.json.pacotes;
  const out = { origem: e.origem, auxSintetico: e.auxSintetico, pacotes: p.length };
  if (!p.length) return out;
  const k = p[0];
  const bu = k.bu ?? {};
  const txt = JSON.stringify(bu);
  out.integridade = k.integridade ? { urna: k.integridade.urna, conferencias: k.integridade.conferencias, falhas: k.integridade.falhas } : null;
  out.arquivos = Object.fromEntries(Object.entries(k.arquivos).map(([n, a]) => [n, a.sha256]));
  // Campos do BU procurados por nome, para não depender da forma exata do JSON enriquecido.
  const achar = (re) => [...new Set([...txt.matchAll(re)].map((m) => m[1]))];
  out.buCampos = {
    numeroInternoUrna: achar(/"numeroInternoUrna":(\d+)/g), qtdEleitoresAptos: achar(/"qtdEleitoresAptos":(\d+)/g),
    qtdComparecimento: achar(/"qtdComparecimento":(\d+)/g), tipoUrna: achar(/"tipoUrna":"?([a-z0-9]+)"?/gi),
    secoesAgregadas: achar(/"(?:agregad[a-z]*|secoesAgregadas)":(\[[^\]]*\])/gi), local: achar(/"local":(\d+)/g),
  };
  // RDV: totais por escolha para presidente
  const rdv = k.rdv?.rdv?.eleicoes;
  const elei = rdv?.eleicoesVota ?? rdv?.eleicoesSA ?? [];
  out.rdvPresidente = elei.flatMap((x) => x.votosCargos).filter((vc) => JSON.stringify(vc.idCargo).includes('presidente') || JSON.stringify(vc.idCargo).includes('"1"') || vc.idCargo === 1).map((vc) => ({ idCargo: vc.idCargo, n: vc.quantidadeVotos, total: vc.totalPorEscolha }));
  const L = k.log;
  if (L && !L._erroLeitura) {
    const m = L.metricasDoDia;
    const tit = m.mesarios.registros.map((r) => r.titulo);
    out.log = {
      numeroInternoUrna: L.numeroInternoUrna, linhas: L.resumo.linhas, porNivel: L.resumo.porNivel,
      urnaPronta: hm(m.urnaPronta), primeiroVoto: hm(m.primeiroVoto), ultimoVoto: hm(m.ultimoVoto), inicioEncerramento: hm(m.inicioEncerramento),
      votosComputados: m.votosComputados, votosForaDaJanela: m.votosForaDaJanela, votosPorHoraLocal: m.votosPorHoraLocal.slice(7, 19),
      habilitadosBiometria: m.habilitadosBiometria, anoNascimentoSemBiometria: m.anoNascimentoSemBiometria, dadoPessoalConfere: m.dadoPessoalConfere,
      habilitadosPeloMesario: m.habilitadosPeloMesario, jaVotou: m.jaVotou, eleitorNaoEncontrado: m.eleitorNaoEncontrado, impedidos: m.impedidos,
      suspensosPeloMesario: m.suspensosPeloMesario, reiniciosDuranteVotacao: m.reiniciosDuranteVotacao, erros: m.erros, alertas: m.alertas,
      maiorRajadaSemBiometria10min: m.maiorRajadaSemBiometria10min, semBiometriaUltimaHora: m.semBiometriaUltimaHora,
      intervaloEntreVotos: m.intervaloEntreVotos, tempoHabilitacaoAteVoto: m.tempoHabilitacaoAteVoto,
      mesariosDistintos: new Set(tit).size, liberacoesPorMesario: Object.values(m.mesarios.liberacoesPorMesario ?? {}),
      _titulos: [...new Set(tit)], // usado só para contar mesários em comum; removido da saída
      erroEAlerta: L.eventos.filter((ev) => ev.nivel !== 'INFO').map((ev) => `${ev.dataHora.slice(11)} ${ev.nivel} ${ev.aplicacao} ${ev.mensagem.replace(/\d{12}/g, '<titulo>')}`),
      mensagens: L.resumo.mensagensMaisFrequentes,
      // Liberações sem biometria (dado pessoal confere / ano de nascimento) por hora local
      semBiometriaPorHora: (() => { const h = Array(24).fill(0); for (const ev of L.eventos) if (/Tipo de habilitação do eleitor \[(?!biométrica)/.test(ev.mensagem)) h[Number(ev.dataHora.slice(11, 13))]++; return h.slice(7, 19); })(),
      tiposHabilitacao: L.eventos.reduce((a, ev) => { const mm = ev.mensagem.match(/^Tipo de habilitação do eleitor \[(.+)\]$/); if (mm) a[mm[1]] = (a[mm[1]] ?? 0) + 1; return a; }, {}),
    };
  }
  return out;
}

const r1 = resumir(await exportar(1));
const r2 = resumir(await exportar(2));
const comparacao = {};
if (r1.log && r2.log) {
  const t1 = new Set(r1.log._titulos);
  comparacao.mesariosEmComum = r2.log._titulos.filter((t) => t1.has(t)).length;
  comparacao.mesarios = [r1.log.mesariosDistintos, r2.log.mesariosDistintos];
  comparacao.mesmaUrnaNoLog = JSON.stringify(r1.log.numeroInternoUrna) === JSON.stringify(r2.log.numeroInternoUrna);
  // Mensagens que aparecem só em um turno (ignorando números variáveis)
  const norm = (o) => { const m = {}; for (const [k, v] of Object.entries(o)) { const n = k.replace(/\d{12}/g, '<titulo>').replace(/\(\d+\)/g, '(n)').replace(/\[[\d.]+ ?[GM]B\]/g, '[x]'); m[n] = (m[n] ?? 0) + v; } return m; };
  const a = norm(r1.log.mensagens), b = norm(r2.log.mensagens);
  comparacao.soNo1T = Object.entries(a).filter(([k]) => !(k in b)).slice(0, 40);
  comparacao.soNo2T = Object.entries(b).filter(([k]) => !(k in a)).slice(0, 40);
}
for (const r of [r1, r2]) if (r.log) { delete r.log._titulos; delete r.log.mensagens; }
const res = { geradoEm: new Date().toISOString(), secao: `${S.uf}/${S.municipio}/${S.zona}/${S.secao}`, t1: r1, t2: r2, comparacao };
mkdirSync(path.dirname(SAIDA), { recursive: true });
writeFileSync(SAIDA, JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
