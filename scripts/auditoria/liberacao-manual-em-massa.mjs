// Seções com liberação manual em massa, pelo BU (universo completo dos dois turnos, princípio 9):
// 2º turno, fora do exterior, por_biografia ≥ 50% do comparecimento (digital do eleitor não reconhecida → dado pessoal).
// Compara o voto (13 × 22) dessas seções com o restante das mesmas zonas, nos dois turnos.
// Uso: node scripts/auditoria/liberacao-manual-em-massa.mjs [saida.md]
import { writeFileSync } from 'node:fs';
import { abrirLeitura } from '../../src/banco-leitura.js';

const fmt = (n) => (n ?? 0).toLocaleString('pt-BR');
const pct = (a, b) => (b ? ((100 * a) / b).toFixed(2).replace('.', ',') : '—');
const { db, ponteiro } = await abrirLeitura();

const MASSA = `SELECT uf, municipio, zona, secao FROM secao WHERE turno = 2 AND situacao = 'completa' AND uf <> 'zz'
  AND comparecimento > 0 AND por_biografia * 2 >= comparecimento`;
const resumo = { ...db.prepare(`WITH m AS (SELECT uf, municipio, zona, secao, comparecimento c2, por_biografia p2 FROM secao
  WHERE turno = 2 AND situacao = 'completa' AND uf <> 'zz' AND comparecimento > 0 AND por_biografia * 2 >= comparecimento)
  SELECT COUNT(*) secoes, COUNT(DISTINCT m.uf || '/' || m.municipio || '/' || m.zona) zonas, SUM(m.p2) manual2, SUM(m.c2) comp2,
    SUM(m.p2 = m.c2) cem, SUM(s1.por_biografia * 2 >= s1.comparecimento) tambem1t, SUM(s1.secao IS NULL) sem1t,
    SUM(p.modelo_urna_log IN ('UE2013', 'UE2015')) antigas
  FROM m LEFT JOIN secao s1 ON s1.turno = 1 AND s1.uf = m.uf AND s1.municipio = m.municipio AND s1.zona = m.zona AND s1.secao = m.secao
  LEFT JOIN perfil_log p ON p.turno = 2 AND p.uf = m.uf AND p.municipio = m.municipio AND p.zona = m.zona AND p.secao = m.secao`).get() };
const voto = db.prepare(`WITH m AS (${MASSA}), z AS (SELECT DISTINCT uf, municipio, zona FROM m),
  v AS (SELECT v.turno, v.uf, v.municipio, v.zona, v.secao, SUM(CASE WHEN numero = 13 THEN quantidade ELSE 0 END) l,
    SUM(CASE WHEN numero = 22 THEN quantidade ELSE 0 END) f FROM voto_bu v JOIN z USING (uf, municipio, zona) WHERE v.cargo = 1 GROUP BY 1, 2, 3, 4, 5)
  SELECT v.turno, (m.secao IS NOT NULL) massa, COUNT(*) secoes, SUM(l) l, SUM(f) f FROM v LEFT JOIN m USING (uf, municipio, zona, secao)
  GROUP BY 1, 2 ORDER BY 1, 2`).all().map((r) => ({ ...r }));
const lista = db.prepare(`WITH m AS (${MASSA}) SELECT m.uf, m.municipio, m.zona, m.secao, s2.comparecimento c2, s2.por_biografia p2,
    s1.comparecimento c1, s1.por_biografia p1, p.modelo_urna_log modelo
  FROM m JOIN secao s2 ON s2.turno = 2 AND s2.uf = m.uf AND s2.municipio = m.municipio AND s2.zona = m.zona AND s2.secao = m.secao
  LEFT JOIN secao s1 ON s1.turno = 1 AND s1.uf = m.uf AND s1.municipio = m.municipio AND s1.zona = m.zona AND s1.secao = m.secao
  LEFT JOIN perfil_log p ON p.turno = 2 AND p.uf = m.uf AND p.municipio = m.municipio AND p.zona = m.zona AND p.secao = m.secao
  ORDER BY m.uf, m.municipio, m.zona, m.secao`).all().map((r) => ({ ...r }));
db.close();

const g = (t, massa) => voto.find((r) => r.turno === t && r.massa === massa) ?? { secoes: 0, l: 0, f: 0 };
const linhaVoto = (titulo, massa) => {
  const a = g(1, massa), b = g(2, massa);
  const d = (100 * (b.l / (b.l + b.f) - a.l / (a.l + a.f))).toFixed(2).replace('.', ',');
  return `| ${titulo} | ${fmt(b.secoes)} | ${pct(a.l, a.l + a.f)} | ${pct(b.l, b.l + b.f)} | ${d} |`;
};

const md = `# Seções com liberação manual em massa (BU, universo completo)

Gerado por \`node scripts/auditoria/liberacao-manual-em-massa.mjs\` sobre a cópia de leitura (${ponteiro?.criadoEm ?? 'primário'}; 1º e 2º turno com 28 UFs).

Critério: 2º turno, fora do exterior, seções em que **50% ou mais** dos votantes foram habilitados por dado pessoal depois de a digital do eleitor não ser reconhecida (\`por_biografia\` do BU).

- Seções: **${fmt(resumo.secoes)}**, em ${fmt(resumo.zonas)} zonas; ${fmt(resumo.comp2)} votantes, dos quais ${fmt(resumo.manual2)} liberados à mão. Com 100%: ${fmt(resumo.cem)}.
- Modelo (log): ${fmt(resumo.antigas)} de ${fmt(resumo.secoes)} são UE2013 ou UE2015.
- 1º turno da mesma seção: ${fmt(resumo.tambem1t)} também passaram de 50%; ${fmt(resumo.secoes - resumo.tambem1t - resumo.sem1t)} não; ${fmt(resumo.sem1t)} sem a seção no 1º turno.

## Voto (Presidente, % do 13 entre 13 + 22)

| Grupo | Seções | 1º turno | 2º turno | Variação (p.p.) |
|---|---|---|---|---|
${linhaVoto('Seções com liberação manual em massa', 1)}
${linhaVoto('Restante das mesmas zonas', 0)}

## Lista

| UF | Município | Zona | Seção | Modelo | Liberação manual 2º turno | Liberação manual 1º turno |
|---|---|---|---|---|---|---|
${lista.map((r) => `| ${r.uf.toUpperCase()} | ${r.municipio} | ${r.zona} | ${r.secao} | ${r.modelo ?? '—'} | ${fmt(r.p2)} de ${fmt(r.c2)} (${pct(r.p2, r.c2)}%) | ${r.c1 == null ? '—' : `${fmt(r.p1)} de ${fmt(r.c1)} (${pct(r.p1, r.c1)}%)`} |`).join('\n')}
`;
const saida = process.argv[2];
if (saida) writeFileSync(saida, md);
process.stdout.write(md);
