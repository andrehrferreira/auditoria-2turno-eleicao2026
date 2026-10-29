// H13, conta independente pelo banco (cópia de leitura), universo completo do 2º turno, Presidente.
// Limites determinísticos (Duncan–Davis) do voto dos liberados sem digital e teto de impacto, sem nenhuma suposição:
// numa seção com T votos (13 + 22 + brancos + nulos + outros), V13, V22, O = T − V13 − V22 e L liberados,
//   mínimo no 13 = max(0, L − V22 − O)    máximo no 13 = min(L, V13)
// Teto: no pior caso para o 13, os liberados deram min(L, V13) ao 13; o resto vai primeiro para O e só depois para o 22,
// ou seja, max(0, L − V13 − O) ao 22. Anular esses votos tira (máximo no 13 − esse resto no 22) da margem 13 − 22.
// L2 = sem_biometria + por_biografia do BU (sem digital, todo o país menos o exterior, cujo BU não traz a divisão).
// Uso: node scripts/auditoria/h13-limites-banco.mjs [saida.md]
import { writeFileSync } from 'node:fs';
import { abrirLeitura } from '../../src/banco-leitura.js';

const REGIAO = {
  ac: 'Norte', am: 'Norte', ap: 'Norte', pa: 'Norte', ro: 'Norte', rr: 'Norte', to: 'Norte',
  al: 'Nordeste', ba: 'Nordeste', ce: 'Nordeste', ma: 'Nordeste', pb: 'Nordeste', pe: 'Nordeste', pi: 'Nordeste', rn: 'Nordeste', se: 'Nordeste',
  df: 'Centro-Oeste', go: 'Centro-Oeste', ms: 'Centro-Oeste', mt: 'Centro-Oeste',
  es: 'Sudeste', mg: 'Sudeste', rj: 'Sudeste', sp: 'Sudeste', pr: 'Sul', rs: 'Sul', sc: 'Sul', zz: 'Exterior',
};
const fmt = (n) => n.toLocaleString('pt-BR');
const pct = (a, b) => (b ? ((100 * a) / b).toFixed(2).replace('.', ',') : '—');

const { db, ponteiro } = await abrirLeitura();
const votos = new Map();
let margemNacional = 0;
for (const v of db.prepare('SELECT uf, municipio, zona, secao, numero, quantidade FROM voto_bu WHERE turno = 2 AND cargo = 1').iterate()) {
  const k = `${v.uf}/${v.municipio}/${v.zona}/${v.secao}`;
  const s = votos.get(k) ?? { t: 0, l: 0, f: 0 };
  s.t += v.quantidade;
  if (v.numero === 13) { s.l += v.quantidade; margemNacional += v.quantidade; }
  if (v.numero === 22) { s.f += v.quantidade; margemNacional -= v.quantidade; }
  votos.set(k, s);
}
const novo = () => ({ secoes: 0, L: 0, min13: 0, max13: 0, min22: 0, max22: 0, reducao: 0, v13: 0, v22: 0, semDetalhe: 0 });
const grupos = new Map();
const exclusoes = { exterior: 0, semVotoPresidente: 0, semDetalhamento: 0, liberadosAcimaDosVotos: 0 };
for (const s of db.prepare(`SELECT uf, municipio, zona, secao, sem_biometria, por_biografia FROM secao WHERE turno = 2 AND situacao = 'completa'`).iterate()) {
  if (s.uf === 'zz') { exclusoes.exterior++; continue; }
  const v = votos.get(`${s.uf}/${s.municipio}/${s.zona}/${s.secao}`);
  if (!v || v.t === 0) { exclusoes.semVotoPresidente++; continue; }
  if (s.sem_biometria == null || s.por_biografia == null) { exclusoes.semDetalhamento++; continue; }
  const L = s.sem_biometria + s.por_biografia;
  if (L > v.t) exclusoes.liberadosAcimaDosVotos++;
  const O = v.t - v.l - v.f;
  const max13 = Math.min(L, v.l), min13 = Math.max(0, L - v.f - O);
  const max22 = Math.min(L, v.f), min22 = Math.max(0, L - v.l - O);
  const resto22 = Math.max(0, L - v.l - O);
  for (const k of [REGIAO[s.uf], s.uf, 'Brasil (sem exterior)']) {
    const g = grupos.get(k) ?? novo();
    g.secoes++; g.L += L; g.min13 += min13; g.max13 += max13; g.min22 += min22; g.max22 += max22;
    g.reducao += max13 - resto22; g.v13 += v.l; g.v22 += v.f;
    grupos.set(k, g);
  }
}
db.close();

const linha = (t, k) => {
  const g = grupos.get(k) ?? novo();
  return `| ${t} | ${fmt(g.secoes)} | ${fmt(g.L)} | ${pct(g.min13, g.L)}% a ${pct(g.max13, g.L)}% | ${pct(g.min22, g.L)}% a ${pct(g.max22, g.L)}% | ${fmt(g.reducao)} | ${fmt(margemNacional - g.reducao)} |`;
};
const regioes = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];
const ufs = [...grupos.keys()].filter((k) => k.length === 2).sort();
const cab = `| Recorte | Seções | Liberados sem digital (L2) | Parte dos liberados que pode ter votado no 13 | … no 22 | Maior redução possível da margem 13 − 22 | Margem nacional que sobra no pior caso |
|---|---|---|---|---|---|---|`;
const md = `# H13: limites determinísticos do voto dos liberados sem digital (banco, universo completo)

Gerado por \`node scripts/auditoria/h13-limites-banco.mjs\` sobre a cópia de leitura (${ponteiro?.criadoEm ?? 'primário'}). 2º turno, Presidente. Nenhuma suposição estatística: só a aritmética de cada seção.

- Margem nacional 13 − 22 (BU, com exterior): **${fmt(margemNacional)}**.
- Liberados sem digital (L2) = sem biometria cadastrada (ano de nascimento) + biometria não reconhecida (dado pessoal), pelo BU.
- Exclusões: ${fmt(exclusoes.exterior)} seções do exterior (BU sem a divisão; ali todos votam sem digital, ver perícia 04 item 4); ${fmt(exclusoes.semVotoPresidente)} sem voto para presidente; ${fmt(exclusoes.semDetalhamento)} sem o detalhamento no BU. Seções com mais liberados que votos: ${fmt(exclusoes.liberadosAcimaDosVotos)}.
- As faixas estão em % de **todos** os liberados (inclusive os que votaram branco, nulo ou em outro candidato).
- "Maior redução possível": se, em cada seção, os liberados tivessem dado ao 13 o máximo possível e ao 22 o mínimo, e esses votos fossem anulados.

${cab}
${regioes.map((r) => linha(r, r)).join('\n')}
${linha('**Brasil (sem exterior)**', 'Brasil (sem exterior)')}

Por UF:

${cab}
${ufs.map((u) => linha(u.toUpperCase(), u)).join('\n')}
`;
const saida = process.argv[2];
if (saida) writeFileSync(saida, md);
process.stdout.write(md);
