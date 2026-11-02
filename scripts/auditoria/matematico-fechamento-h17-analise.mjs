// Matemático forense, fechamento da H17 (a): junta a varredura (matematico-fechamento-h17-varrer.mjs) dos dois turnos.
// Por turno: atendimentos, desfechos, atendimentos sem desfecho por classe, quantos são seguidos de voto em até 180 s
// (retomada provável), como o atendimento fechou, os padrões mais comuns e a conferência com o número já publicado
// pelo estatístico (8.683.417 no 2º turno; 8.681.853 no 1º, este lido do log do 2º turno).
// Também o teto do efeito: atendimentos sem desfecho que poderiam ser um eleitor da seção que não votou (classes com
// identificador aceito) e que não foram seguidos de voto em até 180 s.
// Uso: node scripts/auditoria/matematico-fechamento-h17-analise.mjs
// Saída: data/parsed/auditoria/matematico-forense/fechamento/h17-resumo.json
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { UFS } from '../../src/config.js';
import { CLASSES, DIR_F } from './matematico-fechamento-h17-varrer.mjs';

const soma = (alvo, o) => { for (const [k, v] of Object.entries(o)) alvo[k] = (alvo[k] ?? 0) + v; };
const R = {};
for (const turno of [2, 1]) {
  const dir = path.join(DIR_F, `h17-${turno}t`);
  const arquivos = (await readdir(dir)).filter((x) => x.endsWith('.json'));
  const faltam = UFS.filter((uf) => !arquivos.includes(`${uf}.json`));
  for (const nome of ['dia', 'dia1tNoLog2t']) {
    if (turno === 1 && nome === 'dia1tNoLog2t') continue;
    const A = { ufs: arquivos.length, faltam, pacotes: 0, erros: 0, secoesDia: 0, semVoto: 0, ses: 0, cons: 0, nada: 0, secoesComNada: 0, porDesfecho: {}, porClasse: {}, porClasseRetomada: {}, porClasseFecho: {}, padroes: {}, maxNadaSecao: null };
    for (const a of arquivos) {
      const u = JSON.parse(await readFile(path.join(dir, a), 'utf8'));
      const d = u[nome];
      if (!d) continue;
      A.pacotes += u.pacotes; A.erros += u.erros.length;
      for (const c of ['secoesDia', 'semVoto', 'ses', 'cons', 'nada', 'secoesComNada']) A[c] += d[c];
      for (const c of ['porDesfecho', 'porClasse', 'porClasseRetomada', 'porClasseFecho', 'padroes']) soma(A[c], d[c]);
      if (d.maxNadaSecao && (!A.maxNadaSecao || d.maxNadaSecao.nada > A.maxNadaSecao.nada)) A.maxNadaSecao = d.maxNadaSecao;
    }
    A.tabela = CLASSES.map((c) => ({ classe: c, atendimentos: A.porClasse[c] ?? 0, pctDosSemDesfecho: +((100 * (A.porClasse[c] ?? 0)) / A.nada).toFixed(2),
      seguidosDeVotoAte180s: A.porClasseRetomada[c] ?? 0, semRetomada: (A.porClasse[c] ?? 0) - (A.porClasseRetomada[c] ?? 0) }));
    // Teto: eleitor que pode ter ficado sem votar = identificador aceito (não é erro de digitação nem justificativa de
    // eleitor de outra seção) e nenhum voto em até 180 s.
    const aceitos = ['habilitadoComCargo', 'habilitadoSemCargo', 'digitalSemHabilitacao', 'fotoSemDigital', 'identificadorSemMais', 'outro'];
    A.tetoEleitorSemVoto = A.tabela.filter((x) => aceitos.includes(x.classe)).reduce((a, x) => a + x.semRetomada, 0);
    A.padroesMaisComuns = Object.entries(A.padroes).sort((x, y) => y[1] - x[1]).slice(0, 40).map(([p, n]) => ({ n, p }));
    A.padroesDistintos = Object.keys(A.padroes).length;
    delete A.padroes;
    R[`${turno}t ${nome === 'dia' ? 'pacotes do próprio turno' : 'dia 04/10 no log do 2º turno (conferência com o estatístico)'}`] = A;
  }
}
await writeFile(path.join(DIR_F, 'h17-resumo.json'), JSON.stringify(R, null, 1));
for (const [n, A] of Object.entries(R)) {
  console.log(`\n== ${n}: ${A.ufs} UFs (faltam ${A.faltam.join(',') || 'nenhuma'}), ${A.pacotes} pacotes, ${A.erros} erros; seções-dia ${A.secoesDia} (+${A.semVoto} sem voto); atendimentos ${A.ses}; consultas ${A.cons}; sem desfecho ${A.nada} em ${A.secoesComNada} seções; teto ${A.tetoEleitorSemVoto}`);
  console.log(JSON.stringify(A.porDesfecho));
  console.table(A.tabela);
  console.log('máximo numa seção', JSON.stringify(A.maxNadaSecao));
  console.log(A.padroesMaisComuns.slice(0, 12).map((x) => `${x.n}\t${x.p}`).join('\n'));
}
