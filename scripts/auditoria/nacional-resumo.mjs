// Números nacionais do 2º turno, calculados sobre o UNIVERSO COMPLETO (princípio 9): todas as seções do banco.
// 1) Votos após 17h/18h/19h de Brasília, com o fuso de cada município (moda da hora de "urna pronta",
//    que é 08:00 de Brasília). Exterior (zz): vota no horário local de cada país, então conta-se após 17h LOCAL.
// 2) Habilitação sem digital por UF e região: BU (sem biometria cadastrada; biometria falhou → dado pessoal)
//    e log (liberação com digital/registro do mesário), com a parcela do 13 entre os finalistas.
// Uso: node scripts/auditoria/nacional-resumo.mjs [saida.md]
import { writeFileSync } from 'node:fs';
import { abrirLeitura } from '../../src/banco-leitura.js';

const REGIAO = {
  ac: 'Norte', am: 'Norte', ap: 'Norte', pa: 'Norte', ro: 'Norte', rr: 'Norte', to: 'Norte',
  al: 'Nordeste', ba: 'Nordeste', ce: 'Nordeste', ma: 'Nordeste', pb: 'Nordeste', pe: 'Nordeste', pi: 'Nordeste', rn: 'Nordeste', se: 'Nordeste',
  df: 'Centro-Oeste', go: 'Centro-Oeste', ms: 'Centro-Oeste', mt: 'Centro-Oeste',
  es: 'Sudeste', mg: 'Sudeste', rj: 'Sudeste', sp: 'Sudeste', pr: 'Sul', rs: 'Sul', sc: 'Sul', zz: 'Exterior',
};
const fmt = (n) => (n ?? 0).toLocaleString('pt-BR');
const pct = (a, b) => (b ? ((100 * a) / b).toFixed(2).replace('.', ',') : '—');

const { db, ponteiro } = await abrirLeitura();

// --- 1) votos por hora: fuso por município pela moda de round(urnaPronta/3600 - 8)
const offsets = new Map();
const linhas = [];
for (const r of db.prepare('SELECT uf, municipio, zona, secao, urna_pronta_s AS pronta, dados FROM perfil_log WHERE turno = 2').iterate()) {
  const log = JSON.parse(r.dados).log ?? {};
  const horas = log.votosPorHoraLocal;
  if (!Array.isArray(horas)) continue;
  linhas.push({ uf: r.uf, municipio: r.municipio, horas });
  if (r.pronta !== null && r.pronta !== undefined) {
    const k = `${r.uf}/${r.municipio}`;
    const off = Math.round(r.pronta / 3600 - 8);
    const m = offsets.get(k) ?? new Map();
    m.set(off, (m.get(off) ?? 0) + 1);
    offsets.set(k, m);
  }
}
const moda = (m) => [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];
const porUf = new Map();
let semFuso = 0;
for (const l of linhas) {
  const m = offsets.get(`${l.uf}/${l.municipio}`);
  if (!m) { semFuso++; continue; }
  // exterior: horário local do país (fuso 0 em relação ao relógio local da urna)
  const off = l.uf === 'zz' ? 0 : moda(m);
  const acc = porUf.get(l.uf) ?? { secoes: 0, comVotoApos17: 0, apos17: 0, apos18: 0, apos19: 0, total: 0 };
  acc.secoes++;
  const desde = (h) => l.horas.slice(Math.max(0, h + off)).reduce((a, b) => a + b, 0);
  const a17 = desde(17);
  acc.apos17 += a17; acc.apos18 += desde(18); acc.apos19 += desde(19);
  acc.total += l.horas.reduce((a, b) => a + b, 0);
  if (a17 > 0) acc.comVotoApos17++;
  porUf.set(l.uf, acc);
}

// --- 2) habilitação: BU (secao) + log (perfil_log) + votos 13/22 (voto_bu, cargo = 1 literal)
const bu = new Map(db.prepare(`SELECT uf, COUNT(*) AS secoes, SUM(comparecimento) AS comp, SUM(sem_biometria) AS sem_bio,
  SUM(por_biografia) AS biografia, SUM(por_biometria) AS biometria FROM secao WHERE turno = 2 AND situacao = 'completa' GROUP BY uf`).all().map((r) => [r.uf, { ...r }]));
const logHab = new Map(db.prepare(`SELECT uf, SUM(habilitados_pelo_mesario) AS mesario, SUM(ano_nascimento_sem_biometria) AS ano,
  SUM(dado_pessoal_confere) AS dado FROM perfil_log WHERE turno = 2 GROUP BY uf`).all().map((r) => [r.uf, { ...r }]));
const votos = new Map(db.prepare(`SELECT uf, SUM(CASE WHEN numero = 13 THEN quantidade ELSE 0 END) AS v13,
  SUM(CASE WHEN numero = 22 THEN quantidade ELSE 0 END) AS v22 FROM voto_bu WHERE turno = 2 AND cargo = 1 GROUP BY uf`).all().map((r) => [r.uf, { ...r }]));
db.close();

const ufs = [...bu.keys()].sort();
const somar = (lista, f) => lista.reduce((a, u) => a + (f(u) ?? 0), 0);
const blocoHorario = (titulo, lista) => {
  const g = (u, k) => porUf.get(u)?.[k] ?? 0;
  return `| ${titulo} | ${fmt(somar(lista, (u) => g(u, 'secoes')))} | ${fmt(somar(lista, (u) => g(u, 'comVotoApos17')))} | ${fmt(somar(lista, (u) => g(u, 'apos17')))} | ${fmt(somar(lista, (u) => g(u, 'apos18')))} | ${fmt(somar(lista, (u) => g(u, 'apos19')))} | ${pct(somar(lista, (u) => g(u, 'apos17')), somar(lista, (u) => g(u, 'total')))} |`;
};
const blocoBio = (titulo, lista) => {
  const b = (u, k) => bu.get(u)?.[k] ?? 0;
  const lg = (u, k) => logHab.get(u)?.[k] ?? 0;
  const v = (u, k) => votos.get(u)?.[k] ?? 0;
  const comp = somar(lista, (u) => b(u, 'comp'));
  const semDigital = somar(lista, (u) => b(u, 'sem_bio') + b(u, 'biografia'));
  return `| ${titulo} | ${fmt(comp)} | ${fmt(somar(lista, (u) => b(u, 'sem_bio')))} | ${fmt(somar(lista, (u) => b(u, 'biografia')))} | ${fmt(semDigital)} | ${pct(semDigital, comp)} | ${fmt(somar(lista, (u) => lg(u, 'mesario')))} | ${pct(somar(lista, (u) => v(u, 'v13')), somar(lista, (u) => v(u, 'v13') + v(u, 'v22')))} |`;
};
const regioes = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul', 'Exterior'];
const ufsDe = (r) => ufs.filter((u) => REGIAO[u] === r);

const md = `# Números nacionais do 2º turno (universo completo)

Gerado por \`node scripts/auditoria/nacional-resumo.mjs\` sobre a cópia de leitura do banco (${ponteiro?.criadoEm ?? 'primário'}). Todas as seções do 2º turno; nenhuma amostra (princípio 9).

## 1. Votos depois das 17h de Brasília

Fonte: diário (log) de cada urna, contagem de "O voto do eleitor foi computado" por hora local, convertida para Brasília pelo fuso de cada município (moda da hora de "urna pronta", que é 08:00 de Brasília). **Exterior:** vota no horário local de cada país, então ali se conta após 17h **locais**. Seções sem horário de "urna pronta" para estimar o fuso: ${fmt(semFuso)}.

| Região | Seções com log | Seções com voto após 17h | Votos após 17h | Após 18h | Após 19h | % dos votos do log |
|---|---|---|---|---|---|---|
${regioes.map((r) => blocoHorario(r, ufsDe(r))).join('\n')}
${blocoHorario('**Brasil (sem exterior)**', ufs.filter((u) => u !== 'zz'))}
${blocoHorario('**Total com exterior**', ufs)}

Por UF:

| UF | Seções com log | Seções com voto após 17h | Votos após 17h | Após 18h | Após 19h | % dos votos do log |
|---|---|---|---|---|---|---|
${ufs.map((u) => blocoHorario(u.toUpperCase(), [u])).join('\n')}

## 2. Habilitação sem digital e parcela do 13

Fontes: BU de cada urna (detalhamento do comparecimento, especificação oficial) e log (liberações com registro do mesário). A "% 13" é a parcela do 13 entre os votos 13 + 22 de **todas** as seções do recorte. Ela mostra onde os votos sem digital aconteceram, não como esses eleitores votaram, porque o voto é secreto (ver H13).

| Recorte | Comparecimento (BU) | Sem biometria cadastrada (ano de nascimento) | Biometria falhou → dado pessoal | Total sem digital | % do comparecimento | Liberações com registro do mesário (log) | % 13 entre 13+22 |
|---|---|---|---|---|---|---|---|
${regioes.map((r) => blocoBio(r, ufsDe(r))).join('\n')}
${blocoBio('**Brasil**', ufs)}

Por UF:

| UF | Comparecimento (BU) | Sem biometria cadastrada | Biometria falhou → dado pessoal | Total sem digital | % do comparecimento | Liberações com registro do mesário (log) | % 13 entre 13+22 |
|---|---|---|---|---|---|---|---|
${ufs.map((u) => blocoBio(u.toUpperCase(), [u])).join('\n')}
`;
const saida = process.argv[2];
if (saida) writeFileSync(saida, md);
process.stdout.write(md);
