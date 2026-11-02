// Estatístico eleitoral, fechamento da H13: junta os 192 testes do plano (doc 27, commit 89ede09; seção 7) e aplica a regra
// de decisão da seção 8, sem nenhuma escolha nova. Entradas: h13-final/modelo.json (180 testes), nominal.json (12 testes),
// diario-vazio.json (rastro). Saídas: h13-final/testes.csv e decisao.json.
// Uso: node scripts/auditoria/estatistico-h13-final-decisao.mjs
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { paraCsv } from './forense-lib.mjs';
import { SAIDA, P_BONF, N_TESTES, NE, bh } from './estatistico-h13-final-lib.mjs';

const ler = async (n) => JSON.parse(await readFile(path.join(SAIDA, n), 'utf8'));
const modelo = await ler('modelo.json'), nominal = await ler('nominal.json'), vazio = await ler('diario-vazio.json');

// UFs e vias com teste direto de 2022 que já mostrava a associação no painel (docs 24 e 26; pareceres 48 e 51)
const ESTAVEL_2022 = new Set(['MG/v2', 'RS/v2']);

const testes = [
  ...modelo.testes.map((t) => ({ ...t, unilateral: false })),
  ...nominal.testes.map((t) => ({ ...t, beta: t.razaoCauda, se: null, ne: true })),
];
if (testes.length !== N_TESTES) throw new Error(`esperava ${N_TESTES} testes, há ${testes.length}`);
const passaBH = bh(testes.map((t) => t.p));
testes.forEach((t, i) => {
  t.bonferroni = t.p <= P_BONF;
  t.bh5 = passaBH[i];
  const positivo = t.bloco === 'nominal' ? true : t.beta > 0;
  t.sinalPositivo = t.bonferroni && positivo;
  t.sinalContra = t.bonferroni && !positivo;
});

// classe de cada sinal positivo
const pesoEstavel = (d, via) => { const p = modelo.est2[d][via].BR.pesos; const tot = Object.values(p).reduce((a, b) => a + b, 0); return ((p.mg ?? 0) + (p.rs ?? 0)) / tot; };
for (const t of testes.filter((x) => x.sinalPositivo)) {
  if (t.bloco === 'nominal') t.classe = 'novo';
  else if (t.desfecho === 'P') {
    if (t.bloco === 'UF') t.classe = ESTAVEL_2022.has(`${t.unidade}/${t.via}`) ? 'estável' : 'novo';
    else t.classe = t.unidade === 'μ_BR' && pesoEstavel('P', t.via) > 0.5 && ESTAVEL_2022.has(`MG/${t.via}`) ? 'estável' : 'novo';
  } else t.classe = t.base1 > 0 && t.z1 >= 2 ? 'estável' : 'novo';
}

// Nordeste
const neUnidade = (t) => (t.bloco === 'UF' && NE.has(t.unidade.toLowerCase())) || t.unidade === 'μ_NE' || t.bloco === 'nominal';
const sinaisNE = testes.filter((t) => t.sinalPositivo && neUnidade(t));
const deltaPos = testes.filter((t) => t.unidade === 'δ_NE' && t.bonferroni && t.beta > 0);
const eqLiteral = Object.values(modelo.equivalencia).every((e) => e.vale);
// sensibilidade (desvio declarado no doc 28): limite superior convertido em votos pela calibração da injeção
const eqInjecao = {};
for (const [k, e] of Object.entries(modelo.equivalencia)) {
  const [d, via] = k.split('/');
  const m = modelo.est2[d][via].mde[13].NE;
  const tc = modelo.cortes.tCrit25;
  const votos = (e.limiteSuperior * m.votos) / ((tc + 0.84) * e.se);
  eqInjecao[k] = { limiteSuperior: e.limiteSuperior, votos, vale: votos <= e.margem };
}
const eqInj = Object.values(eqInjecao).every((e) => e.vale);
const statusNE = sinaisNE.length ? 'fato' : eqLiteral && !deltaPos.length ? 'refutada' : 'sem sinal';

// fora do Nordeste
const sinaisFora = testes.filter((t) => t.sinalPositivo && !neUnidade(t) && t.unidade !== 'δ_NE');
const statusFora = !sinaisFora.length ? 'sem sinal' : sinaisFora.some((t) => t.classe === 'novo') ? 'há sinal novo' : 'só sinal estável';

// rastro
const comoRS = (vazio.turnos[1].comoRS0322 ?? 0) + (vazio.turnos[2].comoRS0322 ?? 0);
const pesa = vazio.turnos[1].peso.pesa || vazio.turnos[2].peso.pesa;
const statusRastro = comoRS === 0 ? 'ausente' : pesa ? 'presente com peso' : 'presente sem peso';

let forma;
if (statusNE === 'fato' || statusFora === 'há sinal novo' || statusRastro === 'presente com peso') forma = 'fato que pede explicação';
else if (statusFora === 'só sinal estável') forma = 'não decidível com dados públicos';
else if (statusNE === 'refutada' && statusRastro !== 'presente com peso') forma = 'refutada';
else forma = 'sem sinal nos dados públicos';

const decisao = {
  plano: '89ede09', nTestes: testes.length, pBonferroni: P_BONF,
  passamBonferroni: testes.filter((t) => t.bonferroni).map((t) => ({ unidade: t.unidade, desfecho: t.desfecho, via: t.via, beta: t.beta, estat: t.estat, p: t.p, classe: t.classe ?? 'contra o 13' })),
  passamBH: testes.filter((t) => t.bh5).length,
  statusNE, sinaisNE: sinaisNE.length, deltaNEpositivoSignificativo: deltaPos.length, equivalenciaLiteral: eqLiteral, equivalenciaInjecao: { vale: eqInj, porCombinacao: eqInjecao },
  statusFora, sinaisFora: sinaisFora.map((t) => `${t.unidade} ${t.desfecho} ${t.via} (${t.classe})`),
  statusRastro, casosComoRS0322: comoRS, pesoRastro: { 1: vazio.turnos[1].peso, 2: vazio.turnos[2].peso },
  pesoEstavelMGRS: { P_v2: pesoEstavel('P', 'v2'), P_v3m: pesoEstavel('P', 'v3m') },
  forma,
};
await writeFile(path.join(SAIDA, 'testes.csv'), paraCsv(testes, ['bloco', 'unidade', 'desfecho', 'via', 'beta', 'se', 'estat', 'gl', 'p', 'unilateral', 'bonferroni', 'bh5', 'sinalPositivo', 'classe', 'base1', 'z1', 'N', 'fMDE13', 'votosMDE13', 'fMDE22', 'votosMDE22']));
await writeFile(path.join(SAIDA, 'decisao.json'), JSON.stringify(decisao, null, 1));
console.log(JSON.stringify(decisao, null, 1));
