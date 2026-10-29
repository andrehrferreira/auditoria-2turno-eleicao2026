// Revisor cético, h06 (lente reprodução e código): resume data/parsed/auditoria/cetico/h06-reproducao-logs.jsonl
// (cetico-h06-reproducao-logs.mjs) e compara com logs-tardios-resumo.json do autor.
// Uso: node scripts/auditoria/cetico-h06-reproducao-logs-resumo.mjs → h06-reproducao-logs-resumo.json
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');
const L = (await readFile(path.join(SAIDA, 'h06-reproducao-logs.jsonl'), 'utf8')).trim().split('\n').map((l) => JSON.parse(l));
const hh = (s) => (s === null || s === undefined ? null : `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`);
const grupo = (r) => (r.encBsb < 17.5 * 3600 ? '17h' : r.encBsb < 19 * 3600 ? '17h30-18h59' : '19h+');
const soma = (o, k, v = 1) => { o[k] = (o[k] ?? 0) + v; };
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; };
const G = {};
const sim = { secoes: 0, votos: 0, hab: {}, porGrupo: {}, votosPorSecao: {}, inicioAntesDoSim: 0, semCancelamentoEntreSimEVoto: 0,
  votosDepoisDoUltimoSim_secoes: 0, minSimAteAtendimento: [], minSimAteUltimoVoto: [], horaDoSim: {}, horaDoVoto: {}, semBiometria: [], maisLongos: [] };
let erros = 0, votosAposConfirmado = 0, simAntes17 = 0, recusa17 = 0;
for (const r of L) {
  if (r.erro) { erros++; continue; }
  const g = G[grupo(r)] ??= { secoes: 0, secoesComTardio: 0, tardios: 0, apos18: 0, hab: {}, primeiroAtendimentoApos1705Ocioso10min: 0 };
  g.secoes++; g.tardios += r.tardios; g.apos18 += r.apos18; if (r.tardios) g.secoesComTardio++;
  for (const [k, v] of Object.entries(r.habTardios)) soma(g.hab, k, v);
  if (r.ultimoAntes17 !== null && r.primeiroTardioInicio !== null && r.primeiroTardioInicio >= 17 * 3600 + 300 && r.primeiroTardioInicio - r.ultimoAntes17 >= 600) g.primeiroAtendimentoApos1705Ocioso10min++;
  votosAposConfirmado += r.votosAposConfirmado; simAntes17 += r.simAntes17; if (r.recusa17) recusa17++;
  const a = r.aposSim;
  if (!a) continue;
  sim.secoes++; sim.votos += a.votos; soma(sim.porGrupo, grupo(r)); soma(sim.votosPorSecao, a.votos >= 5 ? '5+' : a.votos);
  for (const [k, v] of Object.entries(a.hab)) soma(sim.hab, k, v);
  if (a.inicioAntesDoSim) sim.inicioAntesDoSim++;
  if (!a.cancelamentoEntreSimEVoto) sim.semCancelamentoEntreSimEVoto++;
  if (a.votosDepoisDoUltimoSim) sim.votosDepoisDoUltimoSim_secoes++;
  if (a.minutosSimAtePrimeiroAtendimento !== null) sim.minSimAteAtendimento.push(a.minutosSimAtePrimeiroAtendimento);
  sim.minSimAteUltimoVoto.push((a.ultimo - a.sim) / 60);
  soma(sim.horaDoSim, hh(Math.floor(a.sim / 1800) * 1800).slice(0, 5));
  soma(sim.horaDoVoto, hh(Math.floor(a.ultimo / 1800) * 1800).slice(0, 5));
  const k = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
  const sb = Object.entries(a.hab).filter(([h]) => h !== 'biometria').reduce((x, [, v]) => x + v, 0);
  if (sb) sim.semBiometria.push(`${k} SIM ${hh(a.sim)}; ${a.votos} voto(s) depois (${JSON.stringify(a.hab)}); último ${hh(a.ultimo)}; grupo ${grupo(r)}`);
  sim.maisLongos.push({ k, min: (a.ultimo - a.sim) / 60, txt: `${k} SIM ${hh(a.sim)}; ${a.votos} voto(s) até ${hh(a.ultimo)} (${JSON.stringify(a.hab)}); nºSIM ${r.sims.length}; encerramento ${hh(r.confirmado)}` });
}
const resumoQ = (a) => ({ n: a.length, p10: q(a, 0.1), p50: q(a, 0.5), p90: q(a, 0.9), max: a.length ? Math.max(...a) : null });
sim.minSimAteAtendimento = resumoQ(sim.minSimAteAtendimento);
sim.minSimAteUltimoVoto = resumoQ(sim.minSimAteUltimoVoto);
sim.maisLongos = sim.maisLongos.sort((x, y) => y.min - x.min).slice(0, 15).map((x) => x.txt);
const autor = JSON.parse(await readFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'tempo', '2t', 'logs-tardios-resumo.json'), 'utf8'));
const comp = {};
for (const g of ['17h', '17h30-18h59', '19h+']) comp[g] = { meu: G[g] && { secoes: G[g].secoes, tardios: G[g].tardios, apos18: G[g].apos18, hab: G[g].hab, ocioso: G[g].primeiroAtendimentoApos1705Ocioso10min, simDepois: sim.porGrupo[g] ?? 0 },
  autor: { secoes: autor.grupos[g].secoes, tardios: autor.grupos[g].tardios, apos18: autor.grupos[g].apos18, hab: autor.grupos[g].tardiosPorTipo, ocioso: autor.grupos[g].secoesPrimeiroTardioAtendidoApos1705ComUrnaOciosa10min, simDepois: autor.grupos[g].secoesComVotoDepoisDeResponderSim } };
const out = { geradoEm: new Date().toISOString(), lidos: L.length, erros, votosAposEncerramentoConfirmado: votosAposConfirmado, respostasSimAntesDas17: simAntes17, secoesComRecusaAntes17: recusa17, grupos: G, votoDepoisDoSim: sim, comparacaoComAutor: comp };
await writeFile(path.join(SAIDA, 'h06-reproducao-logs-resumo.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 1));
