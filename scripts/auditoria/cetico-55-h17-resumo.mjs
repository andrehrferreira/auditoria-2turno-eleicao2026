// Parecer cético 55, H17: junta a varredura própria (cetico-55-h17-varrer.mjs) do 2º turno e calcula:
//   - a reprodução das contagens do doc 14 (atendimentos, desfechos, sem desfecho por grupo, teto em 3 níveis);
//   - o poder do desconto "seguido de voto em até 180 s": a mesma taxa medida nos atendimentos que terminaram em voto
//     (taxa de base) e o intervalo até o próximo identificador digitado;
//   - tetos alternativos (outras leituras razoáveis) contra a margem do 13 (4.430.191).
// Uso: node scripts/auditoria/cetico-55-h17-resumo.mjs
// Saída: data/parsed/auditoria/cetico-revisor/55/h17-resumo.json
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS, UFS } from '../../src/config.js';

const DIR = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '55');
const MARGEM = 4430191;
const arquivos = (await readdir(path.join(DIR, 'h17-2t'))).filter((x) => x.endsWith('.json'));
const faltam = UFS.filter((u) => !arquivos.includes(`${u}.json`));
const T = {};
const somaObj = (a, b) => { for (const [k, v] of Object.entries(b)) { if (typeof v === 'number') a[k] = (a[k] ?? 0) + v; else if (v && typeof v === 'object') somaObj(a[k] ??= {}, v); } };
for (const a of arquivos) { const u = JSON.parse(await readFile(path.join(DIR, 'h17-2t', a), 'utf8')); delete u.uf; somaObj(T, u); }
const D = T.porDesfecho, G = T.semDesfechoPorGrupo, Rg = T.semDesfechoSeguidoDeVoto180, Rd = T.seguidoDeVoto180PorDesfecho;
const semRet = (g) => (G[g] ?? 0) - (Rg[g] ?? 0);
const aceitos = (G.identificadorAceitoOuOutro ?? 0) + (G.habilitado ?? 0);
const aceitosSemRet = semRet('identificadorAceitoOuOutro') + semRet('habilitado');
const perdidos = (D.cancelada ?? 0) + (D.suspensoSemVoto ?? 0);
const perdidosSemRet = perdidos - (Rd.cancelada ?? 0) - (Rd.suspensoSemVoto ?? 0);
// intervalo até o próximo identificador, para os títulos digitados errado
const ate = {};
for (const [k, n] of Object.entries(T.semDesfechoAteProximoIdent)) { const [g, f, prox] = k.split('|'); ((ate[g] ??= {})[`${f}|${prox}`] = n); }
const inval = ate.identificadorInvalido ?? {};
const invalAte30 = Object.entries(inval).filter(([k]) => k.startsWith('00-15s') || k.startsWith('16-30s')).reduce((a, [, n]) => a + n, 0);
const pct = (x) => +(100 * x / MARGEM).toFixed(1);
const tetos = {
  'doc 14 nível 1 (perdidos e aceitos, sem os seguidos de voto)': perdidosSemRet + aceitosSemRet,
  'doc 14 nível 2 (perdidos e aceitos, sem descontar)': perdidos + aceitos,
  'doc 14 nível 3 (nível 2 + títulos errados sem voto em 180 s)': perdidos + aceitos + semRet('identificadorInvalido'),
  'A: nível 3 + recusas + "já votou" fora de consulta': perdidos + aceitos + semRet('identificadorInvalido') + (D.recusa ?? 0) + (D.jaVotou ?? 0),
  'B: nível 2 + recusas + "já votou" + títulos errados sem nova digitação em até 30 s': perdidos + aceitos + (D.recusa ?? 0) + (D.jaVotou ?? 0) + ((G.identificadorInvalido ?? 0) - invalAte30),
  'C: nível 2 + todos os títulos errados (sem desconto nenhum)': perdidos + aceitos + (G.identificadorInvalido ?? 0),
  'D: todo atendimento que não terminou em voto, fora justificativas': T.atend - (D.voto ?? 0) - (G.justificativa ?? 0),
};
const R = {
  ufs: arquivos.length, faltam, pacotes: T.pacotes, erros: T.erros, semLog: T.semLog, semVotoNoDia: T.semVotoNoDia, secoesDia: T.secoesDia,
  atendimentos: T.atend, consultas: T.consultas, porDesfecho: D, secoesComSemDesfecho: T.secoesComSemDesfecho,
  semDesfechoPorGrupo: G, semDesfechoSeguidoDeVoto180: Rg, aceitoSub: T.aceitoSub, recusaPorTipo: T.recusaPorTipo,
  taxaDeBaseSeguidoDeVoto180: Object.fromEntries(Object.entries(D).map(([d, n]) => [d, +(100 * (Rd[d] ?? 0) / n).toFixed(1)])),
  taxaSeguidoDeVoto180SemDesfechoPorGrupo: Object.fromEntries(Object.entries(G).map(([g, n]) => [g, +(100 * (Rg[g] ?? 0) / n).toFixed(1)])),
  fechoDoSemDesfecho: T.semDesfechoFecho,
  intervaloAteProximoIdentificador: ate, titulosErradosRedigitadosAte30s: invalAte30,
  tetos: Object.fromEntries(Object.entries(tetos).map(([k, v]) => [k, { eleitores: v, pctDaMargem: pct(v) }])),
};
await writeFile(path.join(DIR, 'h17-resumo.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
