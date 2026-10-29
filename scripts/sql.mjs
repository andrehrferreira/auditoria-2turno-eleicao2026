// Consulta o banco SQLite da auditoria (doc 09), sempre em modo somente leitura.
// Uso:
//   node scripts/sql.mjs "select uf, count(*) from secao where turno=2 group by uf"
//   node scripts/sql.mjs --arquivo consulta.sql --formato csv > saida.csv
//   node scripts/sql.mjs --tabelas            lista tabelas e views
//   node scripts/sql.mjs --esquema secao      colunas de uma tabela ou view
// Opções: --formato tabela|json|csv (padrão tabela), --limite N (só na tabela; padrão 50), --banco <caminho> (padrão: cópia de leitura).
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../src/banco-leitura.js';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    arquivo: { type: 'string' }, formato: { type: 'string', default: 'tabela' }, limite: { type: 'string', default: '50' },
    banco: { type: 'string' }, tabelas: { type: 'boolean' }, esquema: { type: 'string' }, ajuda: { type: 'boolean', short: 'h' },
  },
});
if (values.ajuda || (!positionals.length && !values.arquivo && !values.tabelas && !values.esquema)) {
  console.log('uso: node scripts/sql.mjs "<sql>" | --arquivo q.sql | --tabelas | --esquema <tabela>  [--formato tabela|json|csv] [--limite N]');
  process.exit(values.ajuda ? 0 : 2);
}

// Padrão: a cópia de leitura publicada (imutável, não concorre com a carga; src/banco-leitura.js, doc 09).
const { db, ponteiro } = values.banco ? { db: new DatabaseSync(values.banco, { readOnly: true }), ponteiro: null } : await abrirLeitura();
const origem = ponteiro
  ? `cópia de ${ponteiro.criadoEm} (cargas: ${(ponteiro.cargas ?? []).map((c) => `${c.turno}º turno ${c.ufs} UFs`).join(', ') || 'sem registro'})`
  : values.banco ?? 'primário';
let sql;
if (values.tabelas) sql = "select type as tipo, name as nome from sqlite_master where type in ('table','view') and name not like 'sqlite_%' order by type, name";
else if (values.esquema) sql = `select name as coluna, type as tipo, pk from pragma_table_info('${values.esquema.replace(/'/g, "''")}')`;
else sql = values.arquivo ? await readFile(values.arquivo, 'utf8') : positionals.join(' ');

const inicio = performance.now();
const linhas = db.prepare(sql).all();
const ms = Math.round(performance.now() - inicio);

if (values.formato === 'json') {
  console.log(JSON.stringify(linhas, null, 1));
} else if (values.formato === 'csv') {
  const colunas = Object.keys(linhas[0] ?? {});
  const campo = (v) => (v == null ? '' : /[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  console.log([colunas.join(';'), ...linhas.map((l) => colunas.map((c) => campo(l[c])).join(';'))].join('\n'));
} else {
  const limite = Number(values.limite);
  const mostrar = linhas.slice(0, limite);
  const colunas = Object.keys(linhas[0] ?? {});
  const texto = (v) => (v == null ? '' : typeof v === 'number' ? v.toLocaleString('pt-BR') : String(v));
  const larguras = colunas.map((c) => Math.min(40, Math.max(c.length, ...mostrar.map((l) => texto(l[c]).length))));
  const linha = (vals) => vals.map((v, i) => (typeof mostrar[0]?.[colunas[i]] === 'number' ? v.padStart(larguras[i]) : v.padEnd(larguras[i])).slice(0, 40)).join('  ');
  if (colunas.length) {
    console.log(linha(colunas));
    console.log(larguras.map((w) => '-'.repeat(w)).join('  '));
    for (const l of mostrar) console.log(linha(colunas.map((c) => texto(l[c]))));
  }
  console.error(`${linhas.length} linha(s)${linhas.length > limite ? `, mostrando ${limite} (use --limite ou --formato csv)` : ''} · ${ms} ms · ${origem}`);
}
