// H13, método descritivo: confere no arquivo bruto (src/exportar.js) as seções extremas de liberação sem biometria.
// Para cada seção e turno: comparecimento e detalhamento do BU, 13 × 22, integridade da assinatura, L1 do log,
// quantos mesários liberaram (só contagens, sem título), tentativas de digital e scores de batimento.
// Uso: node scripts/auditoria/liberacao-descritivo-conferencia.mjs <turno>:<uf>/<municipio>/<zona>/<secao> [...]
// Sem argumentos, confere as seções citadas no doc 01 de docs/analysis/hipotese-liberacao-mesario/.
// Saída: data/parsed/auditoria/liberacao/descritivo-conferencia.json
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';

const PADRAO = [
  '2:ma/08494/0093/0328', '1:ma/08494/0093/0328',
  '2:sp/71072/0408/0361', '1:sp/71072/0408/0361',
  '2:pa/05398/0036/0424', '1:pa/05398/0036/0424',
  '1:ba/38890/0128/0054', '2:ba/38890/0128/0054',
];
const alvos = process.argv.slice(2).length ? process.argv.slice(2) : PADRAO;
const DIR = path.join(DIR_DADOS, 'parsed', 'auditoria', 'liberacao');
const saida = [];

for (const alvo of alvos) {
  const [turno, resto] = alvo.split(':');
  const [uf, municipio, zona, secao] = resto.split('/');
  let json;
  let codigoSaida = 0;
  try {
    json = execFileSync(process.execPath, ['src/exportar.js', '--turno', turno, '--uf', uf, '--municipio', municipio, '--zona', zona, '--secao', secao, '--stdout'],
      { maxBuffer: 1 << 30, encoding: 'utf8' });
  } catch (erro) {
    // o exportar sai com 1 quando alguma conferência não passa, mas escreve o JSON completo
    if (!erro.stdout) throw erro;
    json = erro.stdout;
    codigoSaida = erro.status;
  }
  const j = JSON.parse(json);
  const p = j.pacotes.find((x) => x.statusTSE === 'Totalizado') ?? j.pacotes.at(-1);
  if (!p?.bu) {
    // 1º turno: sem aux.json na coleta local, o exportar não abre o pacote (fica só o perfil de data/parsed/1t)
    const r = { alvo, semPacote: true, avisos: j.avisos };
    saida.push(r);
    console.log(JSON.stringify(r));
    continue;
  }
  const c = p.bu.conteudo;
  const e = c.resultadosVotacaoPorEleicao.find((x) => x.idEleicao === (turno === '1' ? 6257 : 6258));
  const votos = {};
  for (const r of e.resultadosVotacao) for (const t of r.totaisVotosCargo) {
    if (t.codigoCargo?.cargoConstitucional !== 'presidente') continue;
    for (const v of t.votosVotaveis) votos[v.identificacaoVotavel?.codigo ?? v.tipoVoto] = v.quantidadeVotos;
  }
  const m = p.log.metricasDoDia;
  const freq = p.log.resumo.mensagensMaisFrequentes;
  const somar = (re) => Object.entries(freq).filter(([k]) => re.test(k)).reduce((a, [, v]) => a + v, 0);
  const scores = [];
  for (const [k, v] of Object.entries(freq)) {
    const s = /^Batimento de digitais retornou o score (\d+)$/.exec(k);
    if (s) for (let i = 0; i < v; i++) scores.push(+s[1]);
  }
  scores.sort((a, b) => a - b);
  const r = {
    alvo, municipio: j.secao.nomeMunicipio, statusTSE: j.statusTSE, pacotes: j.pacotes.length, codigoSaidaExportar: codigoSaida,
    tipoUrna: c.urna.tipoUrna,
    integridade: p.integridade?._erroVerificacao
      ? { erroVerificacao: p.integridade._erroVerificacao }
      : { conferencias: p.integridade.conferencias, falhas: p.integridade.falhas,
        itensComFalha: (p.integridade.resultados ?? []).filter((x) => !x.ok).map((x) => x.item) },
    bu: { aptos: e.qtdEleitoresAptos, comparecimento: c.qtdEleitoresCompareceram, detalhamento: c.detalhamentoComparecimento, presidente: votos },
    log: {
      modeloUrna: m.modeloUrna, votosComputados: m.votosComputados, habilitadosBiometria: m.habilitadosBiometria,
      anoNascimentoSemBiometria: m.anoNascimentoSemBiometria, dadoPessoalConfere: m.dadoPessoalConfere, habilitadosPeloMesario: m.habilitadosPeloMesario,
      liberacoesPorMesario: Object.values(m.mesarios?.liberacoesPorMesario ?? {}),
      solicitaDigitalTentativa1: somar(/^Solicita digital\. Tentativa \[1\]/), solicitaDigitalTentativa4: somar(/^Solicita digital\. Tentativa \[4\]/),
      batimentosDeDigital: scores.length, scoreMediano: scores.length ? scores[Math.floor(scores.length / 2)] : null,
      timeoutReconhecimento: somar(/^Timeout de reconhecimento do dedo/),
    },
  };
  saida.push(r);
  console.log(JSON.stringify(r));
}
await mkdir(DIR, { recursive: true });
await writeFile(path.join(DIR, 'descritivo-conferencia.json'), JSON.stringify(saida, null, 1));
