// Engenheiro de segurança, fechamento da H04 (docs/analysis/engenheiro-seguranca-urna/13): compara a contagem de
// inicializações (boots) e etapas de "Verificação de assinatura" do SEGUNDO programa (seguranca-fechamento-varredura.mjs)
// com a do PRIMEIRO (seguranca-varrer-logs.mjs → <t>t/<uf>.secoes.jsonl; números publicados no doc 04 para o 2º turno).
//
// Compara: totais (boots que alcançam o dia, boots de votação, etapas por boot de votação, boot de votação sem etapa,
// com etapa sem SUCESSO), e seção a seção (nº de boots e multiconjunto de "etapas|votação|votos" por seção). Recalcula
// também, com o código novo, a sequência de etapas mais comum por UF e modelo e os boots de votação que fogem dela
// (o primeiro programa achou 26 no 2º turno).
// Uso: node --max-old-space-size=8192 scripts/auditoria/seguranca-fechamento-h04-comparar.mjs --turno 2
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS, UFS } from '../../src/config.js';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' } } });
const turno = Number(values.turno);
const base = path.join(DIR_DADOS, 'parsed', 'auditoria', 'engenheiro-seguranca-urna');
const add = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };

const novo = { pacotes: 0, bootsDia: 0, bootsVotacao: 0, semEtapa: 0, naoSucessoVot: 0, naoSucessoDia: 0, etapas: {}, votos: 0 };
const velho = { pacotes: 0, bootsDia: 0, bootsVotacao: 0, semEtapa: 0, naoSucessoVot: 0, naoSucessoDia: 0, etapas: {}, votos: 0 };
const porSecaoNovo = new Map(), porSecaoVelho = new Map();
const bootsNovo = [];
const dic = {};
const faltam = [];
for (const uf of UFS) {
  const fn = path.join(base, 'fechamento', `${turno}t`, `${uf}.json`);
  const fv = path.join(base, `${turno}t`, `${uf}.secoes.jsonl`);
  if (!existsSync(fn) || !existsSync(fv)) { faltam.push(uf); continue; }
  const j = JSON.parse(readFileSync(fn, 'utf8'));
  novo.pacotes += j.geral.pacotes ?? 0;
  Object.assign(dic, j.dicionarioEtapas);
  for (const [id, , key, assin, vot, votos, nEt, ruins] of j.h04boots) {
    novo.bootsDia++;
    if (ruins) novo.naoSucessoDia++;
    if (vot) { novo.bootsVotacao++; add(novo.etapas, nEt); if (!nEt) novo.semEtapa++; if (ruins) novo.naoSucessoVot++; novo.votos += votos; bootsNovo.push({ id, key, assin, votos }); }
    let m = porSecaoNovo.get(id); if (!m) porSecaoNovo.set(id, (m = {})); add(m, `${nEt}|${vot}|${votos}|${ruins}`);
  }
  for (const linha of readFileSync(fv, 'utf8').split('\n')) {
    if (!linha) continue;
    const r = JSON.parse(linha);
    velho.pacotes++;
    const id = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
    let m = porSecaoVelho.get(id); if (!m) porSecaoVelho.set(id, (m = {}));
    for (const l of r.logs) for (const b of l.boots) {
      const vot = b.pronta || b.votos > 0 ? 1 : 0;
      velho.bootsDia++;
      if (b.etapasNaoSucesso) velho.naoSucessoDia++;
      if (vot) { velho.bootsVotacao++; add(velho.etapas, b.etapas); if (!b.etapas) velho.semEtapa++; if (b.etapasNaoSucesso) velho.naoSucessoVot++; velho.votos += b.votos; }
      add(m, `${b.etapas}|${vot}|${b.votos}|${b.etapasNaoSucesso}`);
    }
  }
}

// seção a seção
const difs = [];
for (const id of new Set([...porSecaoNovo.keys(), ...porSecaoVelho.keys()])) {
  const a = porSecaoNovo.get(id) ?? {}, b = porSecaoVelho.get(id) ?? {};
  const ks = new Set([...Object.keys(a), ...Object.keys(b)]);
  if ([...ks].some((k) => (a[k] ?? 0) !== (b[k] ?? 0))) difs.push({ id, novo: a, primeiro: b });
}

// sequência modal por UF e modelo (código novo) e boots de votação fora dela
const cont = {};
for (const b of bootsNovo) add((cont[b.key] ??= {}), b.assin);
const modal = Object.fromEntries(Object.entries(cont).map(([k, m]) => [k, Object.entries(m).sort((x, y) => y[1] - x[1])[0][0]]));
const fora = bootsNovo.filter((b) => b.assin !== modal[b.key]);
const faltando = {};
for (const b of fora) {
  const ref = dic[modal[b.key]] ?? [], atual = dic[b.assin] ?? [];
  const c = (l) => l.reduce((o, e) => (add(o, e), o), {});
  const r = c(ref), a = c(atual);
  const falta = Object.keys(r).filter((e) => (a[e] ?? 0) < r[e]).map((e) => e.replace(/\d+/g, '#'));
  const sobra = Object.keys(a).filter((e) => (r[e] ?? 0) < a[e]).map((e) => e.replace(/\d+/g, '#'));
  add(faltando, `falta: ${falta.join(' + ') || '—'} | sobra: ${sobra.join(' + ') || '—'}`);
}

const resultado = {
  turno, ufsSemUmDosDois: faltam, segundoPrograma: novo, primeiroPrograma: velho,
  iguais: ['pacotes', 'bootsDia', 'bootsVotacao', 'semEtapa', 'naoSucessoVot', 'naoSucessoDia', 'votos'].every((k) => novo[k] === velho[k]) && JSON.stringify(Object.entries(novo.etapas).sort()) === JSON.stringify(Object.entries(velho.etapas).sort()),
  secoesComDiferenca: difs.length, exemplosDeDiferenca: difs.slice(0, 20),
  bootsVotacaoForaDaSequenciaModal: fora.length, votosNesses: fora.reduce((s, b) => s + b.votos, 0), comoFogem: faltando,
  secoesForaDaModal: [...new Set(fora.map((b) => b.id))].slice(0, 60),
};
const saida = path.join(base, 'fechamento', `h04-comparacao-${turno}t.json`);
writeFileSync(saida, JSON.stringify(resultado, null, 1));
console.log(JSON.stringify({ ...resultado, exemplosDeDiferenca: resultado.exemplosDeDiferenca.slice(0, 5), secoesForaDaModal: resultado.secoesForaDaModal.slice(0, 10) }, null, 1));
