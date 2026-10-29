// Revisor cético, H06, consolidação: contagens do diálogo de encerramento no grupo 19h+ e pausas de 30 min,
// a partir de logs-tardios.jsonl do Auditor C (todas as 43.358 seções lidas; horários em segundos de Brasília).
// Uso: node scripts/auditoria/cetico-h06-consolidacao-dialogo.mjs
// Saída: data/parsed/auditoria/cetico/h06-consolidacao-dialogo.json
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';

const H = (h) => h * 3600;
const texto = await readFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'tempo', '2t', 'logs-tardios.jsonl'), 'utf8');
const L = texto.split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => !r.erro);
const g19 = L.filter((r) => r.encBsb >= H(19));
const selAntes19 = g19.filter((r) => r.encerrarSelecionado.some((t) => t < H(19)));
const grupo = (e) => (e < H(17.5) ? '17h' : e < H(19) ? '17h30-18h59' : '19h+');
const pausa30 = {};
for (const r of L) pausa30[grupo(r.encBsb)] = (pausa30[grupo(r.encBsb)] ?? 0) + (r.tardiosAposPausa30min ?? 0);
const saida = {
  secoesLidas: L.length,
  secoes19hOuDepois: g19.length,
  secoes19hSemVotoTardio: g19.filter((r) => !r.tardios).length,
  selecionaramEncerrarAntes19: selAntes19.length,
  selecionaramEntre17e19: g19.filter((r) => r.encerrarSelecionado.some((t) => t >= H(17) && t < H(19))).length,
  responderamSimAntes19: g19.filter((r) => r.todasVotaram.some(([t, a]) => a === 'SIM' && t < H(19))).length,
  primeiraSelecaoEntre17h00e17h29: selAntes19.filter((r) => r.encerrarSelecionado[0] >= H(17) && r.encerrarSelecionado[0] < H(17.5)).length,
  confirmadoAs190000: g19.filter((r) => r.encerramentoConfirmado === H(19)).length,
  votosAposPausa30minPorGrupo: pausa30,
  votosAposPausa30minTotal: Object.values(pausa30).reduce((a, b) => a + b, 0),
};
saida.soTentaramAntes17 = saida.selecionaramEncerrarAntes19 - saida.selecionaramEntre17e19;
await writeFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'h06-consolidacao-dialogo.json'), JSON.stringify(saida, null, 2));
console.log(JSON.stringify(saida, null, 1));
