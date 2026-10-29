// Auditoria C (A2/B3/H06): resume data/parsed/auditoria/tempo/2t/logs-tardios.jsonl (tempo-logs-tardios.mjs).
// Grupos pelo encerramento do BU em Brasília: 17h (< 17h30), 17h30-18h59, 19h+; controle = amostra 1/50 sem voto tardio.
// Uso: node scripts/auditoria/tempo-tardios-resumo.mjs
import { createReadStream } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DIR_DADOS } from '../../src/config.js';

const dir = path.join(DIR_DADOS, 'parsed', 'auditoria', 'tempo', '2t');
const hh = (s) => (s === null || s === undefined ? null : `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`);
const grupo = (r) => (r.encBsb < 17.5 * 3600 ? '17h' : r.encBsb < 19 * 3600 ? '17h30-18h59' : '19h+');
const G = {};
const casos = { votoDepoisDeSim: [], chegadaAposPausa30min: [], encerrarAntesDas17: [], encerrar19hSelecionadoAntes19: [], respostaNao: [] };
for await (const linha of createInterface({ input: createReadStream(path.join(dir, 'logs-tardios.jsonl')) })) {
  if (!linha) continue;
  const r = JSON.parse(linha);
  if (r.erro) continue;
  const g = G[`${r.motivo === 'controle' ? 'controle ' : ''}${grupo(r)}`] ??= {
    secoes: 0, votos: 0, secoesComTardio: 0, tardios: 0, apos1730: 0, apos18: 0, apos19: 0, tardiosPorTipo: {},
    tardiosAposPausa10min: 0, tardiosAposPausa30min: 0, secoesPrimeiroTardioAtendidoApos1705ComUrnaOciosa10min: 0,
    secoesComEncerrarSelecionadoMaisDeUmaVez: 0, primeiraSelecaoEncerrar: {}, respostasTodasVotaram: {}, secoesComRespostaNao: 0,
    secoesComVotoDepoisDeResponderSim: 0, ligadaDuranteVotacao: 0, secoesComLigadaDuranteVotacao: 0, ultimoVotoBsb: {},
  };
  g.secoes++; g.votos += r.votos; g.tardios += r.tardios; g.apos1730 += r.apos1730; g.apos18 += r.apos18; g.apos19 += r.apos19;
  if (r.tardios) g.secoesComTardio++;
  for (const [k, v] of Object.entries(r.tardiosPorTipo)) g.tardiosPorTipo[k] = (g.tardiosPorTipo[k] ?? 0) + v;
  g.tardiosAposPausa10min += r.tardiosAposPausa10min; g.tardiosAposPausa30min += r.tardiosAposPausa30min;
  const ocioso = r.ultimoAntes17 !== null && r.primeiroTardioInicioAtendimento !== null && r.primeiroTardioInicioAtendimento >= 17 * 3600 + 300
    && r.primeiroTardioInicioAtendimento - r.ultimoAntes17 >= 600;
  if (ocioso) g.secoesPrimeiroTardioAtendidoApos1705ComUrnaOciosa10min++;
  if (r.tardiosAposPausa30min) casos.chegadaAposPausa30min.push(`${r.uf}/${r.municipio}/${r.zona}/${r.secao} último antes das 17h ${hh(r.ultimoAntes17)}; 1º tardio atendido ${hh(r.primeiroTardioInicioAtendimento)}, votou ${hh(r.primeiroTardio)}; tardios ${r.tardios} (${JSON.stringify(r.tardiosPorTipo)}); maior pausa ${Math.round(r.maiorPausaEntreTardios / 60)} min; encerramento ${hh(r.encBsb)}`);
  if (r.encerrarSelecionado.length > 1) g.secoesComEncerrarSelecionadoMaisDeUmaVez++;
  const sel = r.encerrarSelecionado[0];
  if (sel !== undefined) {
    const faixa = sel < 17 * 3600 ? 'antes das 17h' : sel < 17.5 * 3600 ? '17:00-17:29' : sel < 18 * 3600 ? '17:30-17:59' : sel < 19 * 3600 ? '18:00-18:59' : '19h+';
    g.primeiraSelecaoEncerrar[faixa] = (g.primeiraSelecaoEncerrar[faixa] ?? 0) + 1;
    if (sel < 17 * 3600) casos.encerrarAntesDas17.push(`${r.uf}/${r.municipio}/${r.zona}/${r.secao} ${hh(sel)}`);
    if (grupo(r) === '19h+' && sel < 19 * 3600) casos.encerrar19hSelecionadoAntes19.push(`${r.uf}/${r.municipio}/${r.zona}/${r.secao} selecionou ${hh(sel)}, confirmou ${hh(r.encerramentoConfirmado)}`);
  }
  for (const [, resp] of r.todasVotaram) g.respostasTodasVotaram[resp] = (g.respostasTodasVotaram[resp] ?? 0) + 1;
  // O mesário respondeu "todos já votaram? SIM", cancelou o encerramento e depois ainda houve voto
  const sim = r.todasVotaram.find(([, resp]) => resp === "SIM");
  if (sim && r.ultimoVoto !== null && r.ultimoVoto > sim[0]) { g.secoesComVotoDepoisDeResponderSim++; casos.votoDepoisDeSim.push(`${r.uf}/${r.municipio}/${r.zona}/${r.secao} SIM às ${hh(sim[0])}; último voto ${hh(r.ultimoVoto)}; encerramento ${hh(r.encerramentoConfirmado)}`); }
  const naos = r.todasVotaram.filter(([, resp]) => resp !== 'SIM');
  if (naos.length) {
    g.secoesComRespostaNao++;
    casos.respostaNao.push(`${r.uf}/${r.municipio}/${r.zona}/${r.secao} NÃO às ${naos.map(([t]) => hh(t)).join(' ')}; último voto ${hh(r.ultimoVoto)}; encerramento ${hh(r.encerramentoConfirmado)}`);
  }
  g.ligadaDuranteVotacao += r.ligadaDuranteVotacao; if (r.ligadaDuranteVotacao) g.secoesComLigadaDuranteVotacao++;
  const u = r.ultimoVoto === null ? 'sem voto' : r.ultimoVoto < 17 * 3600 ? 'antes das 17h' : r.ultimoVoto < 17.5 * 3600 ? '17:00-17:29' : r.ultimoVoto < 18 * 3600 ? '17:30-17:59' : r.ultimoVoto < 19 * 3600 ? '18:00-18:59' : '19h+';
  g.ultimoVotoBsb[u] = (g.ultimoVotoBsb[u] ?? 0) + 1;
}
const resumo = { geradoEm: new Date().toISOString(), grupos: G, casos: Object.fromEntries(Object.entries(casos).map(([k, v]) => [k, { total: v.length, exemplos: v.slice(0, 40) }])) };
await writeFile(path.join(dir, 'logs-tardios-resumo.json'), JSON.stringify(resumo, null, 2));
console.log(JSON.stringify(resumo, null, 1));
