// Parecer cético 53 (H26, fechamento), pergunta 5: conferência no arquivo bruto das seções extremas do lado do 22 em
// Santo Antônio de Lisboa (PI 0028) e em São Paulo (SP 0002), via src/exportar.js, nos dois turnos.
// Para cada seção e turno: aptos, comparecimento, votos 13/22/branco/nulo para presidente no BU, os mesmos no RDV,
// local de votação, tipo de arquivo, número interno da urna, horário de encerramento e o estado da verificação de
// assinaturas (se rodou ou deu erro).
// Só leitura. Uso: node scripts/auditoria/cetico-53-bruto.mjs
// Saída: data/parsed/auditoria/cetico-revisor/53-bruto.json
import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SAIDA = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico-revisor');
const SECOES = [
  ...['0083', '0086', '0087', '0090', '0091', '0093', '0094', '0095', '0099'].map((s) => ['pi', '11878', '0028', s]),
  ...['0491', '0501', '0506', '0519', '0532', '0539'].map((s) => ['sp', '71072', '0002', s]),
];

function exportar(uf, mun, zona, secao, turno) {
  // exportar.js sai com código 1 quando algum campo _erro* aparece (por exemplo, a verificação de assinaturas que não
  // rodou); o JSON continua válido e o erro fica registrado no resumo.
  const r = spawnSync(process.execPath, [path.join(RAIZ, 'src', 'exportar.js'), '--uf', uf, '--municipio', mun, '--zona', zona, '--secao', secao,
    '--turno', String(turno), '--log', 'nao', '--stdout'], { cwd: RAIZ, maxBuffer: 1 << 28, encoding: 'utf8' });
  if (r.status !== 0 && r.status !== 1) throw new Error(`exportar.js saiu com ${r.status}: ${r.stderr}`);
  return JSON.parse(r.stdout);
}

function resumo(j) {
  const p = j.pacotes?.[0];
  if (!p) return { semPacote: true };
  const c = p.bu?.conteudo;
  const ele = c?.resultadosVotacaoPorEleicao?.[0];
  const pres = ele?.resultadosVotacao?.flatMap((r) => r.totaisVotosCargo).find((t) => t.codigoCargo?.cargoConstitucional === 'presidente');
  const bu = { 13: 0, 22: 0, branco: 0, nulo: 0, outros: 0 };
  for (const v of pres?.votosVotaveis ?? []) {
    if (v.tipoVoto === 'nominal') { const n = v.identificacaoVotavel?.codigo; if (n === 13 || n === 22) bu[n] += v.quantidadeVotos; else bu.outros += v.quantidadeVotos; }
    else if (v.tipoVoto === 'branco') bu.branco += v.quantidadeVotos;
    else bu.nulo += v.quantidadeVotos;
  }
  const rv = p.rdv?.rdv?.eleicoes?.eleicoesVota?.flatMap((e) => e.votosCargos).find((x) => x.idCargo?.cargoConstitucional === 'presidente');
  const rdv = { 13: 0, 22: 0, branco: 0, nulo: 0, outros: 0, total: rv?.quantidadeVotos ?? null };
  for (const [k, q] of Object.entries(rv?.totalPorEscolha ?? {})) {
    if (k.startsWith('nominal 13 ')) rdv[13] += q; else if (k.startsWith('nominal 22 ')) rdv[22] += q;
    else if (k.startsWith('nominal')) rdv.outros += q; else if (k.startsWith('branco')) rdv.branco += q; else rdv.nulo += q;
  }
  const integ = p.integridade ?? {};
  return {
    pacotes: j.pacotes.length, statusTSE: p.statusTSE, local: c?.identificacaoSecao?.local, tipoArquivo: c?.urna?.tipoArquivo,
    urna: p.rdv?.urna?.correspondenciaResultado?.carga?.numeroInternoUrna ?? null,
    encerramento: c?.dadosSecaoSA?.dadosSecao?.dataHoraEncerramento ?? null,
    aptos: ele?.qtdEleitoresAptos, comparecimento: c?.qtdEleitoresCompareceram, habilitacao: c?.detalhamentoComparecimento,
    bu, rdv, buIgualRdv: ['13', '22', 'branco', 'nulo', 'outros'].every((k) => bu[k] === rdv[k]),
    verificacaoAssinaturas: integ._erroVerificacao ? `não rodou: ${integ._erroVerificacao}` : integ.resultados ? `rodou: ${integ.conferencias} conferências, ${integ.falhas} falhas (${(integ.resultados ?? []).filter((r) => !r.ok).map((r) => r.obs ?? r.item).join(' | ')})` : 'sem .vsc',
  };
}

const R = { geradoEm: new Date().toISOString(), secoes: [] };
for (const [uf, mun, zona, secao] of SECOES) {
  const l = { secao: `${uf}/${mun}/${zona}/${secao}` };
  for (const t of [1, 2]) {
    try { l[`t${t}`] = resumo(exportar(uf, mun, zona, secao, t)); } catch (e) { l[`t${t}`] = { erro: String(e.message).slice(0, 300) }; }
  }
  R.secoes.push(l);
  console.error(JSON.stringify(l));
}
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, '53-bruto.json'), JSON.stringify(R, null, 1));
