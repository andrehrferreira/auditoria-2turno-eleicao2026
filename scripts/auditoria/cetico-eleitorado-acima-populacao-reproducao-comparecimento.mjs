// Cético (complemento da reprodução): nos municípios com R > 1, o excesso de títulos foi USADO no 2º turno?
// Compara o comparecimento do 2º turno (tabela secao, BU) com a população 12+ e a população total do Censo 2022,
// e mostra a parcela habilitada por biometria nesses municípios.
// Pré-requisito: cetico-eleitorado-acima-populacao-reproducao.mjs (lê o TSV dele). Banco somente leitura.
// Uso: node scripts/auditoria/cetico-eleitorado-acima-populacao-reproducao-comparecimento.mjs
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(RAIZ, 'data/parsed/auditoria/cetico');
const db = new DatabaseSync(path.join(RAIZ, 'data/db/eleicao2026.sqlite'), { readOnly: true });
const [cab, ...ls] = readFileSync(path.join(OUT, 'eleitorado-acima-populacao-reproducao.tsv'), 'utf8').trimEnd().split('\n').map((l) => l.split('\t'));
const ix = Object.fromEntries(cab.map((k, i) => [k, i]));
const comp = new Map(db.prepare(`SELECT municipio, SUM(comparecimento) c, SUM(por_biometria) b, SUM(sem_biometria) sb, COUNT(*) n,
  SUM(CASE WHEN situacao = 'completa' THEN 1 ELSE 0 END) completas FROM secao WHERE turno = 2 AND uf <> 'zz' GROUP BY municipio`).all().map((r) => [r.municipio, r]));
const linhas = ls.map((l) => {
  const c = comp.get(l[ix.mun_tse]) ?? {};
  return { uf: l[ix.uf], mun: l[ix.mun_tse], nome: l[ix.nome], E: +l[ix.eleitores_perfil], tot: +l[ix.pop_tot_2022], p12: +l[ix.pop12_2022], e25: +l[ix.est2025] || null, R: +l[ix.R],
    comp: c.c ?? 0, bio: c.b ?? 0, semBio: c.sb ?? 0, secoes: c.n ?? 0, completas: c.completas ?? 0 };
});
const f = (x) => ({ uf: x.uf, mun: x.mun, nome: x.nome, eleitores: x.E, comp2t: x.comp, pop12_2022: x.p12, pop_tot_2022: x.tot, est2025: x.e25, R: x.R,
  comp_sobre_pop12: +(x.comp / x.p12).toFixed(3), pct_bio: x.comp ? +(100 * x.bio / x.comp).toFixed(1) : null, secoes: x.secoes, completas: x.completas });
const compAcimaP12 = linhas.filter((x) => x.comp > x.p12);
const compAcimaTot = linhas.filter((x) => x.comp > x.tot);
const compAcimaE25 = linhas.filter((x) => x.e25 && x.comp > x.e25);
const tx = (g) => { const c = g.reduce((s, x) => s + x.comp, 0); const e = g.reduce((s, x) => s + x.E, 0); const b = g.reduce((s, x) => s + x.bio, 0); return { municipios: g.length, comparecimento: c, eleitores: e, taxa: +(c / e).toFixed(4), pct_biometria: +(100 * b / c).toFixed(2) }; };
const res = {
  secoes_2t_incompletas_nos_municipios: linhas.reduce((s, x) => s + (x.secoes - x.completas), 0),
  municipios_comp2t_acima_pop12_2022: compAcimaP12.length,
  municipios_comp2t_acima_pop_total_2022: compAcimaTot.length,
  municipios_comp2t_acima_estimativa_2025: compAcimaE25.length,
  votantes_2t_acima_pop12_somados: compAcimaP12.reduce((s, x) => s + x.comp - x.p12, 0),
  por_faixa_R: [[0, 1], [1, 1.25], [1.25, 1.5], [1.5, 2], [2, 99]].map(([a, b]) => ({ faixa: `${a}-${b}`, ...tx(linhas.filter((x) => x.R > a && x.R <= b)) })),
  lista_comp_acima_pop_total: compAcimaTot.sort((a, b) => b.comp / b.tot - a.comp / a.tot).map(f),
};
await writeFile(path.join(OUT, 'eleitorado-acima-populacao-comparecimento.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify({ ...res, lista_comp_acima_pop_total: res.lista_comp_acima_pop_total.slice(0, 15) }, null, 1));
