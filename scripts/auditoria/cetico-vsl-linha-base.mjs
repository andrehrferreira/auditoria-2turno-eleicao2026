// Revisor cético, achado "votos-sem-log-contingencia": linha de base empírica para "12 de 13 votos por biografia",
// a partir das sessões de urna gravadas por cetico-vsl-contingencias.mjs (pacotes de contingência do 2º turno).
// Compara sessões curtas (5 a 30 votos) e a taxa global. Uso: node scripts/auditoria/cetico-vsl-linha-base.mjs
import { readFileSync } from 'node:fs';
const { sessoes } = JSON.parse(readFileSync('data/parsed/auditoria/cetico/cetico-vsl-contingencias-2t.json', 'utf8'));
const faixa = (f, nome) => {
  const s = sessoes.filter(f);
  const alta = s.filter((x) => x.G / x.n >= 12 / 13);
  const totN = s.reduce((t, x) => t + x.n, 0), totG = s.reduce((t, x) => t + x.G, 0);
  console.log(`${nome}: ${s.length} sessões, taxa biografia ${(totG / totN).toFixed(4)}; com fração >= 12/13: ${alta.length} (${(100 * alta.length / s.length).toFixed(2)}%)`);
  return alta;
};
faixa(() => true, 'todas as sessões com voto');
faixa((x) => x.n >= 5 && x.n <= 30, 'sessões de 5 a 30 votos');
const subst = faixa((x) => x.log.includes('.jez/') && x.n >= 5 && x.n <= 30, 'sessões de 5 a 30 votos de urna substituída (log aninhado)');
faixa((x) => x.log.includes('.jez/'), 'todas as sessões de urna substituída');
for (const x of subst) console.log(`  ${x.secao} urna ${x.urnas} n=${x.n} G=${x.G}`);
