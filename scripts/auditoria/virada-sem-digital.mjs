// Virada para o 13 nas seções em que NINGUÉM votou com digital no 2º turno (universo completo, princípio 9).
// "Sem digital" = BU do 2º turno com porBiometria = 0 e comparecimento > 0 (todos habilitados por ano de nascimento
// ou por dado pessoal). "Virada para o 13" = 22 > 13 no 1º turno e 13 > 22 no 2º turno, Presidente.
// Entrada: data/parsed/auditoria/cetico/t8-secoes.jsonl (seções pareadas 1º × 2º turno das 28 UFs, lidas dos BUs por
// scripts/auditoria/cetico-t8-extrair.mjs). Uso: node scripts/auditoria/virada-sem-digital.mjs [saida.md]
import { createReadStream, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { abrirLeitura } from '../../src/banco-leitura.js';

const ENTRADA = 'data/parsed/auditoria/cetico/t8-secoes.jsonl';
const REGIAO = {
  ac: 'Norte', am: 'Norte', ap: 'Norte', pa: 'Norte', ro: 'Norte', rr: 'Norte', to: 'Norte',
  al: 'Nordeste', ba: 'Nordeste', ce: 'Nordeste', ma: 'Nordeste', pb: 'Nordeste', pe: 'Nordeste', pi: 'Nordeste', rn: 'Nordeste', se: 'Nordeste',
  df: 'Centro-Oeste', go: 'Centro-Oeste', ms: 'Centro-Oeste', mt: 'Centro-Oeste',
  es: 'Sudeste', mg: 'Sudeste', rj: 'Sudeste', sp: 'Sudeste', pr: 'Sul', rs: 'Sul', sc: 'Sul', zz: 'Exterior',
};
const fmt = (n) => n.toLocaleString('pt-BR');
const pct = (a, b) => (b ? ((100 * a) / b).toFixed(2).replace('.', ',') : '—');

const novo = () => ({ secoes: 0, vira13: 0, vira22: 0, l1: 0, f1: 0, l2: 0, f2: 0, comp2: 0, semDig1: 0 });
const grupos = { sem: new Map(), com: new Map() };
// faixas de % sem digital no 2º turno (fora do exterior, que é 100% por norma)
const FAIXAS = [['100%', 1, 1], ['80% a 99,9%', 0.8, 1], ['50% a 79,9%', 0.5, 0.8], ['20% a 49,9%', 0.2, 0.5], ['menos de 20%', 0, 0.2]];
const faixa = new Map(FAIXAS.map(([n]) => [n, novo()]));
const exclusoes = { duplicada: 0, semComparecimento2t: 0 };
const casos = [];
let total = 0, conferSemBio = 0, conferAno = 0;

for await (const linha of createInterface({ input: createReadStream(ENTRADA) })) {
  if (!linha.trim()) continue;
  const r = JSON.parse(linha);
  total++;
  conferSemBio += r.b.semBio; conferAno += r.b.ano;
  if (r.dup) { exclusoes.duplicada++; continue; }
  if (!(r.b.comp > 0)) { exclusoes.semComparecimento2t++; continue; }
  const semDigital = r.b.bio === 0;
  const chaves = r.uf === 'zz' ? [r.uf, 'Exterior', 'Total'] : [r.uf, REGIAO[r.uf], 'Brasil (sem exterior)', 'Total'];
  const vira13 = r.a.f > r.a.l && r.b.l > r.b.f;
  const vira22 = r.a.l > r.a.f && r.b.f > r.b.l;
  for (const k of chaves) {
    const m = grupos[semDigital ? 'sem' : 'com'];
    const g = m.get(k) ?? novo();
    g.secoes++; g.vira13 += vira13; g.vira22 += vira22;
    g.l1 += r.a.l; g.f1 += r.a.f; g.l2 += r.b.l; g.f2 += r.b.f; g.comp2 += r.b.comp;
    g.semDig1 += r.a.bio === 0 && r.a.comp > 0;
    m.set(k, g);
  }
  if (semDigital && vira13 && r.uf !== 'zz') casos.push(r);
  if (r.uf !== 'zz') {
    const p = 1 - r.b.bio / r.b.comp;
    const [n] = FAIXAS.find(([, a, b]) => (b === 1 && a === 1 ? p === 1 : p >= a && p < b));
    const g = faixa.get(n);
    g.secoes++; g.vira13 += vira13; g.vira22 += vira22; g.l1 += r.a.l; g.f1 += r.a.f; g.l2 += r.b.l; g.f2 += r.b.f; g.comp2 += r.b.comp;
  }
}

// Segunda conta, independente dos perfis: as mesmas faixas a partir do banco (tabelas secao e voto_bu, cópia de leitura).
const { db, ponteiro } = await abrirLeitura();
const votos = new Map();
for (const v of db.prepare('SELECT turno, uf, municipio, zona, secao, numero, quantidade FROM voto_bu WHERE cargo = 1 AND numero IN (13, 22)').iterate()) {
  const k = `${v.turno}/${v.uf}/${v.municipio}/${v.zona}/${v.secao}`;
  const s = votos.get(k) ?? { l: 0, f: 0 };
  if (v.numero === 13) s.l += v.quantidade; else s.f += v.quantidade;
  votos.set(k, s);
}
const faixaBanco = new Map(FAIXAS.map(([n]) => [n, novo()]));
for (const s of db.prepare(`SELECT uf, municipio, zona, secao, comparecimento, por_biometria FROM secao
  WHERE turno = 2 AND situacao = 'completa' AND uf <> 'zz' AND comparecimento > 0`).iterate()) {
  const k = `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`;
  const a = votos.get(`1/${k}`) ?? { l: 0, f: 0 }, b = votos.get(`2/${k}`) ?? { l: 0, f: 0 };
  const p = 1 - s.por_biometria / s.comparecimento;
  const [n] = FAIXAS.find(([, x, y]) => (y === 1 && x === 1 ? p === 1 : p >= x && p < y));
  const g = faixaBanco.get(n);
  g.secoes++; g.vira13 += a.f > a.l && b.l > b.f; g.vira22 += a.l > a.f && b.f > b.l;
  g.l1 += a.l; g.f1 += a.f; g.l2 += b.l; g.f2 += b.f; g.comp2 += s.comparecimento;
}
db.close();
const CAMPOS = ['secoes', 'comp2', 'vira13', 'vira22', 'l1', 'f1', 'l2', 'f2'];
const diferencas = FAIXAS.flatMap(([n]) => CAMPOS.filter((c) => faixa.get(n)[c] !== faixaBanco.get(n)[c]).map((c) => `${n}.${c}: perfis ${faixa.get(n)[c]} × banco ${faixaBanco.get(n)[c]}`));

const linhaTab = (titulo, k) => {
  const s = grupos.sem.get(k) ?? novo(), c = grupos.com.get(k) ?? novo();
  return `| ${titulo} | ${fmt(s.secoes)} | ${fmt(s.comp2)} | ${fmt(s.vira13)} | ${pct(s.vira13, s.secoes)} | ${fmt(s.vira22)} | ${pct(s.f1 + s.l1 ? s.l1 : 0, s.l1 + s.f1)} → ${pct(s.l2, s.l2 + s.f2)} | ${fmt(c.secoes)} | ${pct(c.vira13, c.secoes)} | ${pct(c.vira22, c.secoes)} | ${pct(c.l1, c.l1 + c.f1)} → ${pct(c.l2, c.l2 + c.f2)} |`;
};
const regioes = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul', 'Exterior'];
const ufs = [...new Set([...grupos.sem.keys(), ...grupos.com.keys()])].filter((k) => REGIAO[k]).sort();
const cab = `| Recorte | Seções 100% sem digital | Comparecimento nelas (2º t.) | Viraram para o 13 | % | Viraram para o 22 | % 13 (1º → 2º t.) | Seções com alguma digital | % viraram 13 | % viraram 22 | % 13 (1º → 2º t.) |
|---|---|---|---|---|---|---|---|---|---|---|`;
const sTot = grupos.sem.get('Brasil (sem exterior)') ?? novo();

const md = `# Virada para o 13 nas seções 100% sem digital (2º turno, universo completo)

Gerado por \`node scripts/auditoria/virada-sem-digital.mjs\` a partir de \`${ENTRADA}\` (BUs dos dois turnos, 28 UFs, seções pareadas pela mesma chave UF/município/zona/seção).

- **Seção 100% sem digital:** no BU do 2º turno, \`porBiometria = 0\` e comparecimento > 0. Todos os votantes foram habilitados por ano de nascimento (sem biometria cadastrada) ou por dado pessoal (digital não reconhecida).
- **Virada para o 13:** 22 > 13 no 1º turno e 13 > 22 no 2º turno, Presidente. **Virada para o 22:** o contrário.
- Seções pareadas lidas: ${fmt(total)}. Excluídas: ${fmt(exclusoes.duplicada)} com chave duplicada; ${fmt(exclusoes.semComparecimento2t)} sem comparecimento no BU do 2º turno.
- Conferência da entrada: soma de "sem biometria cadastrada" no 2º turno = ${fmt(conferSemBio)}; soma de "biometria falhou → dado pessoal" = ${fmt(conferAno)}.
- **Segunda conta** (banco, cópia de ${ponteiro?.criadoEm ?? 'primário'}, tabelas \`secao\` e \`voto_bu\`), para a tabela por faixa: ${diferencas.length ? `**diverge**: ${diferencas.join('; ')}` : 'igual em todas as faixas e todos os campos (seções, comparecimento, viradas, votos 13 e 22 nos dois turnos)'}.
- **Exterior:** o BU de lá não traz a divisão por forma de liberação; o log mostra que todos os 380.612 votos do 2º turno foram liberados por ano de nascimento (tópico 4 da perícia). Ele aparece à parte e fica fora das faixas.

## Resposta

No Brasil (sem exterior), ${fmt(sTot.secoes)} seções votaram 100% sem digital no 2º turno; ${fmt(sTot.semDig1)} delas também foram 100% sem digital no 1º turno. Delas, **${fmt(sTot.vira13)} viraram para o 13** (${pct(sTot.vira13, sTot.secoes)}%) e ${fmt(sTot.vira22)} viraram para o 22. Nas seções com alguma digital, ${pct(grupos.com.get('Brasil (sem exterior)')?.vira13 ?? 0, grupos.com.get('Brasil (sem exterior)')?.secoes ?? 0)}% viraram para o 13.

## Por faixa de % sem digital no 2º turno (Brasil, sem exterior)

| Faixa | Seções | Comparecimento (2º t.) | Viraram para o 13 | % | Viraram para o 22 | % | % 13 (1º → 2º t.) | Ganho do 13 em p.p. |
|---|---|---|---|---|---|---|---|---|
${FAIXAS.map(([n]) => { const g = faixa.get(n); const a = g.l1 / (g.l1 + g.f1), b = g.l2 / (g.l2 + g.f2); return `| ${n} | ${fmt(g.secoes)} | ${fmt(g.comp2)} | ${fmt(g.vira13)} | ${pct(g.vira13, g.secoes)} | ${fmt(g.vira22)} | ${pct(g.vira22, g.secoes)} | ${pct(g.l1, g.l1 + g.f1)} → ${pct(g.l2, g.l2 + g.f2)} | ${g.secoes ? (100 * (b - a)).toFixed(2).replace('.', ',') : '—'} |`; }).join('\n')}

## Seções 100% sem digital, por região e UF

${cab}
${regioes.map((r) => linhaTab(r, r)).join('\n')}
${linhaTab('**Brasil (sem exterior)**', 'Brasil (sem exterior)')}
${linhaTab('**Total**', 'Total')}

Por UF:

${cab}
${ufs.map((u) => linhaTab(u.toUpperCase(), u)).join('\n')}

## Seções 100% sem digital que viraram para o 13 (fora do exterior)

| UF | Município | Zona | Seção | Tipo de urna (2º t.) | Modelo | Compareceram 1º / 2º | 13 / 22 no 1º turno | 13 / 22 no 2º turno | Sem biometria cadastrada / dado pessoal (2º t.) |
|---|---|---|---|---|---|---|---|---|---|
${casos.sort((a, b) => a.uf.localeCompare(b.uf) || a.mun - b.mun || a.zona - b.zona || a.secao - b.secao)
    .map((r) => `| ${r.uf.toUpperCase()} | ${r.mun} | ${r.zona} | ${r.secao} | ${r.b.tipo} | ${r.b.modelo ?? '—'} | ${r.a.comp} / ${r.b.comp} | ${r.a.l} / ${r.a.f} | ${r.b.l} / ${r.b.f} | ${r.b.semBio} / ${r.b.ano} |`).join('\n')}
`;
const saida = process.argv[2];
if (saida) writeFileSync(saida, md);
process.stdout.write(md);
