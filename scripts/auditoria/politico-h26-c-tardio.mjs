// H26, fechamento, parte (c): voto do fim do dia (docs/analysis/cientista-politico/06-h26-plano-final.md, seção 5).
//   Voto tardio = votos às 17h de Brasília ou depois no 2º turno, pelo votosPorHoraLocal do log e o fuso do plano 01.
//   Tipo de liberação de cada voto tardio: data/parsed/auditoria/cetico/h06-reproducao-logs.jsonl quando a contagem de
//   tardios bate com a do perfil; senão, releitura do diário bruto com o mesmo parser (analisar() de
//   cetico-h06-reproducao-logs.mjs) e o fuso do plano 01.
//   Grupos (H06): G1 = Salvador, Feira de Santana e Lauro de Freitas; G2 = demais seções que encerraram às 19:00 de
//   Brasília ou depois; G3 = demais seções com voto tardio; G0 = sem voto tardio.
//   Modelo: resíduo líquido da seção (votos, plano 01) sobre votos tardios por tipo de liberação, efeito fixo de zona,
//   controles, EP agrupado por zona. Testes C1, C2 e C3 com |z| ≥ 3.
// Só leitura, um processo. Uso: node --max-old-space-size=12288 scripts/auditoria/politico-h26-c-tardio.mjs
// Saída: data/parsed/auditoria/cientista-politico/h26-c-tardio.json
import { readFileSync } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerLogs } from '../../src/perfil-secoes.js';
import { RAIZ } from './forense-lib.mjs';
import { mqEfeitoFixo, diferenca } from './estatistico-lib.mjs';
import { analisar } from './cetico-h06-reproducao-logs.mjs';
import { SAIDA, REGIAO, r2, r4, pp, log, secoes2026 } from './politico-h26-lib.mjs';

const R = { geradoEm: new Date().toISOString(), plano: 'docs/analysis/cientista-politico/06-h26-plano-final.md', secao: 5 };
const { P, conf } = await secoes2026();
R.banco = conf.fonte;
const soma = (h, h0) => (h ? h.slice(h0).reduce((a, b) => a + b, 0) : 0);
const chave = (s) => `${s.uf}|${s.municipio}|${s.zona}|${s.secao}`;

// ---------- 5.1 Voto tardio e liberação ----------
const jsonl = new Map();
for (const l of readFileSync(path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico', 'h06-reproducao-logs.jsonl'), 'utf8').split('\n')) {
  if (!l) continue;
  const o = JSON.parse(l);
  jsonl.set(`${o.uf}|${o.municipio}|${o.zona}|${o.secao}`, o);
}
const comTardio = P.filter((s) => soma(s.h2, 17) > 0);
const cob = { secoesComTardio: comTardio.length, votosTardios: comTardio.reduce((a, s) => a + soma(s.h2, 17), 0), noJsonl: 0, contagemIgual: 0, relidas: 0, relidasIguais: 0,
  relidasDiferentes: [], semLog: [], jsonlComTardioForaDoPerfil: 0 };
const porChave = new Map(P.map((s) => [chave(s), s]));
for (const [k, o] of jsonl) { const s = porChave.get(k); if (o.tardios > 0 && (!s || soma(s.h2, 17) === 0)) cob.jsonlComTardioForaDoPerfil++; }
async function reler(s) {
  const dir = path.join(DIR_DADOS, 'raw', '2t', 'urnas', s.uf, s.municipio, s.zona, s.secao);
  const pacotes = (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  for (const h of pacotes) {
    const nomes = await readdir(path.join(dir, h));
    const lg = acharArquivo(nomes, 'log');
    if (!lg || !acharArquivo(nomes, 'bu')) continue;
    const { texto } = await lerLogs(path.join(dir, h, lg), s.secao);
    return analisar(texto, s.d2);
  }
  return null;
}
for (const s of comTardio) {
  const L = soma(s.h2, 17);
  const o = jsonl.get(chave(s));
  if (o) cob.noJsonl++;
  if (o && o.tardios === L) { cob.contagemIgual++; s.hab = o.habTardios ?? {}; s.aposSim = o.aposSim?.votos ?? 0; continue; }
  cob.relidas++;
  try {
    const r = await reler(s);
    if (!r) { cob.semLog.push(chave(s)); s.hab = { nao_identificada: L }; s.aposSim = 0; continue; }
    s.hab = r.habTardios ?? {}; s.aposSim = r.aposSim?.votos ?? 0;
    if (r.tardios === L) cob.relidasIguais++; else cob.relidasDiferentes.push({ secao: chave(s), perfil: L, diario: r.tardios });
  } catch (e) { cob.semLog.push(`${chave(s)} (${e.message})`); s.hab = { nao_identificada: L }; s.aposSim = 0; }
}
// votos depois do SIM também nas seções do jsonl sem voto tardio pelo perfil (o SIM só existe no encerramento, depois das 17h)
for (const s of P) if (!(soma(s.h2, 17) > 0)) { s.hab = {}; s.aposSim = jsonl.get(chave(s))?.aposSim?.votos ?? 0; }
R.cobertura = { ...cob, relidasDiferentes: cob.relidasDiferentes.length, listaRelidasDiferentes: cob.relidasDiferentes.slice(0, 50), semLog: cob.semLog };
log(`cobertura: ${JSON.stringify({ ...cob, relidasDiferentes: cob.relidasDiferentes.length, semLog: cob.semLog.length })}`);

// habilitação: tardios por tipo (o diário dá o tipo; a contagem é a do diário quando difere do perfil)
for (const s of P) {
  const h = s.hab;
  s.Lbio = h.biometria ?? 0; s.Lsd = (h.ano_nascimento ?? 0) + (h.dado_pessoal_manual ?? 0); s.Lnid = h.nao_identificada ?? 0;
  s.L = s.Lbio + s.Lsd + s.Lnid; s.Lperfil = soma(s.h2, 17);
}
const tot = (f, l = P) => l.reduce((a, s) => a + f(s), 0);
R.liberacao = { tardiosPerfil: tot((s) => s.Lperfil), tardiosDiario: tot((s) => s.L), biometria: tot((s) => s.Lbio), semDigital: tot((s) => s.Lsd),
  anoNascimento: tot((s) => s.hab.ano_nascimento ?? 0), dadoPessoal: tot((s) => s.hab.dado_pessoal_manual ?? 0), naoIdentificada: tot((s) => s.Lnid) };
R.liberacao.naoIdentificadaPct = r2(pp(R.liberacao.naoIdentificada, R.liberacao.tardiosDiario));
R.liberacao.semDigitalPct = r2(pp(R.liberacao.semDigital, R.liberacao.tardiosDiario));
R.liberacao.biometriaPct = r2(pp(R.liberacao.biometria, R.liberacao.tardiosDiario));
R.liberacao.biometriaNoTotalDo2tPct = r2(pp(tot((s) => s.pb2), tot((s) => s.c2)));
R.liberacao.votosDepoisDoSim = tot((s) => s.aposSim); R.liberacao.secoesComVotoDepoisDoSim = P.filter((s) => s.aposSim > 0).length;

// ---------- grupos H06 ----------
const nomes = conf.nomeMun;
const G1 = new Set(Object.entries(nomes).filter(([k, n]) => k.startsWith('ba|') && /^(SALVADOR|FEIRA DE SANTANA|LAURO DE FREITAS)$/i.test(n)).map(([k]) => k));
R.grupos = { G1municipios: [...G1].map((k) => `${k} ${nomes[k]}`) };
for (const s of P) {
  s.grupo = G1.has(`${s.uf}|${s.municipio}`) ? 'G1' : s.encBsb2 != null && s.encBsb2 >= 19 * 3600 ? 'G2' : s.L > 0 || s.Lperfil > 0 ? 'G3' : 'G0';
}
R.grupos.contagem = Object.fromEntries(['G0', 'G1', 'G2', 'G3'].map((g) => { const l = P.filter((s) => s.grupo === g); return [g, { secoes: l.length, tardios: tot((s) => s.L, l), semDigital: tot((s) => s.Lsd, l), biometria: tot((s) => s.Lbio, l), comTardio: l.filter((s) => s.L > 0).length }]; }));
R.grupos.encerraram19hOuDepois = P.filter((s) => s.encBsb2 != null && s.encBsb2 >= 19 * 3600).length;

// ---------- 5.2 Modelo ----------
const comHora = P.filter((s) => s.h1 && s.h2 && s.nom2 > 0 && s.c1 > 0 && s.a1 > 0 && s.uf !== 'zz');
R.universoRegressao = { secoes: comHora.length, excluidas: P.length - comHora.length };
const parcela = (h, h0) => { const t = h.reduce((a, b) => a + b, 0); return t > 0 ? pp(soma(h, h0), t) : NaN; };
const zonaDe = (s) => `${s.uf}|${s.zona}`;
const controles = (s) => [parcela(s.h1, 17), parcela(s.h1, 15), parcela(s.h2, 15), Math.log(s.a2), s.c2 - s.c1, pp(s.v13_1, s.v13_1 + s.v22_1 + s.out1), pp(s.a1 - s.c1, s.a1)];
const coef = (aj, i) => ({ b: r4(aj.b[i]), ep: r4(aj.ep[i]), z: r2(aj.b[i] / aj.ep[i]) });
// sanidade: especificação do parecer 34 em p.p. (parcela tardia de cada turno desde 17h)
{
  const aj = mqEfeitoFixo(comHora, { y: (s) => pp(s.rl, s.nom2), x: (s) => [parcela(s.h2, 17), parcela(s.h1, 17), Math.log(s.a2), pp(s.c2 - s.c1, s.a2), pp(s.v13_1, s.v13_1 + s.v22_1 + s.out1), pp(s.a1 - s.c1, s.a1)],
    w: (s) => s.nom2, grupo: zonaDe, cluster: zonaDe });
  R.sanidade = { parcela2t: coef(aj, 0), parcela1t: coef(aj, 1), referenciaDoc02: 0.392, ok: Math.abs(aj.b[0] - 0.392) <= 0.01 };
  log(`sanidade: ${JSON.stringify(R.sanidade)}`);
}
// associação total em votos (com os controles do plano)
const ajTot = mqEfeitoFixo(comHora, { y: (s) => s.rl, x: (s) => [s.L, s.aposSim, ...controles(s)], grupo: zonaDe, cluster: zonaDe });
// a coluna dos não identificados só entra se houver algum (coluna toda zero deixa a matriz singular)
const comNid = comHora.some((s) => s.Lnid > 0);
const nid = (s) => (comNid ? [s.Lnid] : []);
const ajTipo = mqEfeitoFixo(comHora, { y: (s) => s.rl, x: (s) => [s.Lbio, s.Lsd, ...nid(s), s.aposSim, ...controles(s)], grupo: zonaDe, cluster: zonaDe });
const ajGrupo = mqEfeitoFixo(comHora, { y: (s) => s.rl, x: (s) => [s.grupo === 'G1' ? s.L : 0, s.grupo === 'G2' ? s.L : 0, s.grupo === 'G3' ? s.L : 0, s.aposSim, ...controles(s)], grupo: zonaDe, cluster: zonaDe });
const ajTipoGrupo = mqEfeitoFixo(comHora, { y: (s) => s.rl, x: (s) => ['G1', 'G2', 'G3'].flatMap((g) => (s.grupo === g ? [s.Lbio, s.Lsd] : [0, 0])).concat([...nid(s), s.aposSim, ...controles(s)]), grupo: zonaDe, cluster: zonaDe });
const Ltot = tot((s) => s.L, comHora), Lsd = tot((s) => s.Lsd, comHora), Lbio = tot((s) => s.Lbio, comHora);
const assocTotal = ajTot.b[0] * Ltot;
// C1: liberação sem digital carrega a associação?
const d = diferenca(ajTipo, 1, 0);
const parteSd = ajTipo.b[1] * Lsd;
R.C1 = { porVotoBiometria: coef(ajTipo, 0), porVotoSemDigital: coef(ajTipo, 1), porVotoNaoIdentificado: comNid ? coef(ajTipo, 2) : null,
  diferencaSemDigitalMenosBiometria: { b: r4(d.d), ep: r4(d.ep), z: r2(d.t) }, associacaoTotalVotos: Math.round(assocTotal), parteSemDigitalVotos: Math.round(parteSd),
  parteBiometriaVotos: Math.round(ajTipo.b[0] * Lbio), votosTardiosNaRegressao: Ltot, semDigitalNaRegressao: Lsd };
const zC1 = d.t;
R.C1.sinal = zC1 >= 3 && parteSd >= 0.5 * assocTotal;
// C2: votos depois do SIM
R.C2 = { porVotoDepoisDoSim: coef(ajTot, 1), secoes: comHora.filter((s) => s.aposSim > 0).length, votos: tot((s) => s.aposSim, comHora) };
R.C2.sinal = ajTot.b[1] / ajTot.ep[1] >= 3; R.C2.fatoLado22 = ajTot.b[1] / ajTot.ep[1] <= -3;
// C3: associação dentro e fora da prorrogação
R.C3 = { G1: coef(ajGrupo, 0), G2: coef(ajGrupo, 1), G3: coef(ajGrupo, 2), porTipoEGrupo: {
  G1: { biometria: coef(ajTipoGrupo, 0), semDigital: coef(ajTipoGrupo, 1) }, G2: { biometria: coef(ajTipoGrupo, 2), semDigital: coef(ajTipoGrupo, 3) }, G3: { biometria: coef(ajTipoGrupo, 4), semDigital: coef(ajTipoGrupo, 5) } } };
R.C3.explicacao = Math.abs(ajGrupo.b[2] / ajGrupo.ep[2]) < 3 ? 'E2 (concentrada na prorrogação)' : 'E3 (também fora da prorrogação)';
R.associacao = { porVotoTardio: coef(ajTot, 0), associacaoTotalVotos: Math.round(assocTotal), secoes: ajTot.n, zonas: ajTot.G };
// por região (descritivo)
R.porRegiao = Object.fromEntries(['N', 'NE', 'CO', 'SE', 'S'].map((reg) => {
  const l = comHora.filter((s) => REGIAO[s.uf] === reg);
  const a = mqEfeitoFixo(l, { y: (s) => s.rl, x: (s) => [s.Lbio, s.Lsd, s.aposSim, ...controles(s)], grupo: zonaDe, cluster: zonaDe });
  return [reg, { biometria: coef(a, 0), semDigital: coef(a, 1), tardios: tot((s) => s.L, l) }];
}));
// limite aritmético
R.limite = { votosTardios: R.liberacao.tardiosDiario, semDigital: R.liberacao.semDigital, margem: 64256232 - 59826041,
  maximoSeTodosFossemDo13Pct: r2(pp(R.liberacao.tardiosPerfil, 64256232 - 59826041)),
  associacaoMaiorQueSemDigital: assocTotal > R.liberacao.semDigital };
// ---------- 5.4 Decisão ----------
R.parteC = (R.liberacao.naoIdentificadaPct > 5 || cob.semLog.length) ? 'N' : (R.C1.sinal || R.C2.sinal) ? 'S' : 'L';
await writeFile(path.join(SAIDA, 'h26-c-tardio.json'), JSON.stringify(R, null, 1));
log('fim');
console.log(JSON.stringify(R, null, 1));
