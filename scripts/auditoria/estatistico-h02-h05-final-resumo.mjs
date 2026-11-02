// Estatístico eleitoral, doc 30 (plano 29): números derivados das saídas dos scripts estatistico-h02-h05-final-*.mjs, para o
// texto do doc 30 (nenhum dado novo: só leitura das saídas em data/parsed/auditoria/estatistico-eleitoral/h02-h05-final/).
// Uso: node scripts/auditoria/estatistico-h02-h05-final-resumo.mjs
// Saída: .../h02-h05-final/resumo.json
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';

const D = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico-eleitoral', 'h02-h05-final');
const ler = async (n) => JSON.parse(await readFile(path.join(D, n), 'utf8'));
const jsonl = async (n) => (await readFile(path.join(D, n), 'utf8')).split('\n').filter(Boolean).map((l) => JSON.parse(l));
const res = { geradoEm: new Date().toISOString() };

// H02: excesso nos dois turnos, por UF, Indaiatuba
{
  const s1 = new Map((await jsonl('foto-secoes-1t.jsonl')).map((x) => [x.k, x]));
  const s2 = await jsonl('foto-secoes-2t.jsonl');
  const ambos = s2.filter((x) => s1.has(x.k));
  res.h02 = {
    excessoNosDoisTurnos: ambos.length, excessoNosDoisTurnosSomaE2t: ambos.reduce((a, x) => a + x.E, 0),
    secoesComExcesso2tSemFotoNoExcesso: s2.filter((x) => x.F === 0).length,
    porUf2t: Object.fromEntries([...new Set(s2.map((x) => x.uf))].sort().map((uf) => { const l = s2.filter((x) => x.uf === uf); return [uf, { secoes: l.length, E: l.reduce((a, x) => a + x.E, 0), Elinha: l.reduce((a, x) => a + Math.max(0, x.Elinha ?? 0), 0) }]; })),
    indaiatuba: Object.fromEntries([1, 2].map((t) => { const l = (t === 1 ? [...s1.values()] : s2).filter((x) => x.zona === 'sp/65110/0211'); return [`${t}t`, { secoes: l.length, E: l.reduce((a, x) => a + x.E, 0), F: l.reduce((a, x) => a + x.F, 0), V2: l.reduce((a, x) => a + x.V2, 0), Elinha: l.reduce((a, x) => a + Math.max(0, x.Elinha ?? 0), 0), secoesComResiduo: l.filter((x) => x.Elinha > 0).length, cadastroSemBiometriaZero: l.filter((x) => x.S === 0).length }]; })),
  };
  const fl = await ler('foto-log.json');
  const sec = fl.forma.secoes;
  res.h02.formaPorTurno = Object.fromEntries([1, 2].map((t) => { const l = sec.filter((x) => x.turno === t); return [`${t}t`, { secoes: l.length, residuo: l.reduce((a, x) => a + x.Elinha, 0), persistem: l.filter((x) => x.residuoNoOutroTurno).length }]; }));
}
// H05(c): seletivas cuja hora marcada contém a quebra significativa do dia (hora de transição)
{
  const m = await ler('massa.json');
  res.h05c = { seletivas: m.secoes.filter((l) => l.classe === 'seletivo').map((l) => {
    const q = l.d2.M2; const horas = l.d2.M3.horas.filter((h) => h.seletiva).map((h) => h.h);
    const transicao = !!(q && q.p < m.corteM2 && horas.includes(Math.floor(q.hora)));
    return { k: l.k, horas, quebra: q ? { hora: q.hora, p: q.p, taxaAntes: q.taxaAntes, taxaDepois: q.taxaDepois, p1Antes: q.p1Antes, p1Depois: q.p1Depois } : null, horaDeTransicao: transicao,
      mesarioRegistrado: l.d2.M4.v3MesarioRegistrado, semAssociacao: l.d2.M4.v3SemAssociacao, jaVotou: l.d2.M5.jaVotou, mesmaUrna: l.urnaMesma, manual1t: l.manual1, comparecimento1t: l.comparecimento1, manual2t: l.manual2, comparecimento2t: l.comparecimento2, desvio: l.desvio };
  }) };
  res.h05c.seletivasEmHoraDeTransicao = res.h05c.seletivas.filter((s) => s.horaDeTransicao).length;
  res.h05c.indeterminadasComQuebra = m.secoes.filter((l) => l.classe === 'indeterminado' && l.quebraSignificativa).length;
  res.h05c.indeterminadasQuebraMelhora = m.secoes.filter((l) => l.classe === 'indeterminado' && l.quebraSignificativa && l.d2.M2.taxaDepois < l.d2.M2.taxaAntes).length;
  res.h05c.mesmaUrnaNosDoisTurnos = m.secoes.filter((l) => l.urnaMesma).length;
  res.h05c.jaVotou = m.totais2t;
}
// H05(a): tabela de tamanhos mínimos
{
  const p = await ler('poder.json');
  res.h05a = p.padroes.map((x) => ({ id: x.id, via: x.via, nome: x.nome, deterministico: x.deterministico, D1: x.minimo.D1?.votos ?? null, D2: x.minimo.D2?.votos ?? null, D3: x.minimo.D3?.votos ?? null,
    maiorNaoVistoD2: Math.max(0, ...x.celulas.filter((c) => c.D2 < Math.ceil(0.8 * c.replicas)).map((c) => c.votosMediana)) }));
}
// N: soma do tamanho em eleitores
{
  const arq = existsSync(path.join(D, 'sinais.json')) ? 'sinais.json' : 'sinais-sem-sp.json';
  const s = await ler(arq);
  res.N = { arquivo: arq, eleitoresAMaisSemDigitalContraPadrao2022: Object.fromEntries(Object.entries(s.N.porUf).map(([u, x]) => [u, x.exploratorio.eleitoresAMaisSemDigitalContraPadrao2022])) };
  res.N.soma = Object.values(res.N.eleitoresAMaisSemDigitalContraPadrao2022).reduce((a, b) => a + b, 0);
}
await writeFile(path.join(D, 'resumo.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, (k, v) => (k === 'porUf2t' ? undefined : v), 1));
