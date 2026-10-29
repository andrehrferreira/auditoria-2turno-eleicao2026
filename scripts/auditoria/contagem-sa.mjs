// Auditor A (contagem), risco R1 (princípio 8): seções do Sistema de Apuração (SA), com o motivo e o tipo de apuração
// lidos do BU (urna.motivoUtilizacaoSA) e o comparecimento por eleição. O SA não tem log de eleitor.
// Uso: node scripts/auditoria/contagem-sa.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { decodificarArquivo } from '../../src/asn1.js';
import { arquivoBu } from '../../src/esquemas.js';

const db = new DatabaseSync('data/db/eleicao2026.sqlite', { readOnly: true });
const secoes = db.prepare(`SELECT s.turno, s.uf, s.municipio, s.zona, s.secao, s.hash, s.tipo_arquivo, e.aptos, e.comparecimento_majoritario AS comparecimento
  FROM secao s JOIN secao_eleicao e USING (turno, uf, municipio, zona, secao)
  WHERE s.tipo_arquivo LIKE 'sa%' AND e.eleicao IN (6257, 6258) ORDER BY 1, 2, 3, 4, 5`).all();
const grupos = new Map();
for (const s of secoes) {
  const dir = `data/raw/${s.turno}t/urnas/${s.uf}/${s.municipio}/${s.zona}/${s.secao}/${s.hash}`;
  const nome = readdirSync(dir).find((n) => /-busa?\.dat$/.test(n));
  const bu = decodificarArquivo(arquivoBu, readFileSync(`${dir}/${nome}`)).conteudo;
  const chave = `${s.turno}º turno | ${s.uf} | ${s.tipo_arquivo} | ${JSON.stringify(bu.urna.motivoUtilizacaoSA)}`;
  const g = grupos.get(chave) ?? { secoes: 0, aptos: 0, comparecimento: 0, lista: [] };
  g.secoes++; g.aptos += s.aptos; g.comparecimento += s.comparecimento; g.lista.push(`${s.municipio}/${s.zona}/${s.secao}`);
  grupos.set(chave, g);
}
for (const [k, g] of grupos) console.log(`${k}\n  ${g.secoes} seções, ${g.comparecimento} votos de ${g.aptos} aptos: ${g.lista.join(', ')}`);
