// Forense estatística, passo 1: tabela por seção (presidente) a partir do banco SQLite, só leitura.
// Uso: node scripts/auditoria/forense-base.mjs [turno]   → data/parsed/auditoria/forense/secoes-<t>t.csv
// Uma linha por seção com urna e BU legível: aptos, comparecimento, votos do 13, do 22, dos demais, brancos e nulos.
import { DatabaseSync } from 'node:sqlite';
import { BANCO, chaveSecao, paraCsv, salvar } from './forense-lib.mjs';

const turno = Number(process.argv[2] ?? 2);
const eleicao = turno === 1 ? 6257 : 6258;
const db = new DatabaseSync(BANCO, { readOnly: true });

const ufs = db.prepare('SELECT uf FROM carga WHERE turno = ? ORDER BY uf').all(turno).map((r) => r.uf);
const nomes = new Map(db.prepare('SELECT codigo, nome FROM municipio').all().map((m) => [m.codigo, m.nome]));
const agregadas = new Map(db.prepare(`SELECT uf, municipio, zona, secao_principal AS secao, COUNT(*) AS n
  FROM secao_agregada WHERE turno = ? GROUP BY 1, 2, 3, 4`).all(turno).map((a) => [chaveSecao(a), a.n]));

const secoes = new Map();
for (const s of db.prepare(`SELECT s.uf, s.municipio, s.zona, s.secao, s.local, s.tipo_urna, s.modelo_urna,
    e.aptos, e.aptos_tte, COALESCE(e.comparecimento_majoritario, s.comparecimento) AS comparecimento
  FROM secao s JOIN secao_eleicao e ON e.turno = s.turno AND e.uf = s.uf AND e.municipio = s.municipio
    AND e.zona = s.zona AND e.secao = s.secao AND e.eleicao = ?
  WHERE s.turno = ? AND s.situacao = 'completa'`).iterate(eleicao, turno)) {
  const k = chaveSecao(s);
  secoes.set(k, { ...s, nome_municipio: nomes.get(s.municipio) ?? '', agregadas: agregadas.get(k) ?? 0,
    v13: 0, v22: 0, outros: 0, branco: 0, nulo: 0 });
}

let semSecao = 0;
for (const v of db.prepare(`SELECT uf, municipio, zona, secao, tipo_voto, numero, quantidade
  FROM voto_bu WHERE turno = ? AND cargo = 1 AND eleicao = ?`).iterate(turno, eleicao)) {
  const s = secoes.get(chaveSecao(v));
  if (!s) { semSecao++; continue; }
  if (v.tipo_voto === 'nominal') {
    if (v.numero === 13) s.v13 += v.quantidade;
    else if (v.numero === 22) s.v22 += v.quantidade;
    else s.outros += v.quantidade;
  } else if (v.tipo_voto === 'branco') s.branco += v.quantidade;
  else if (v.tipo_voto === 'nulo') s.nulo += v.quantidade;
}

const linhas = [...secoes.values()];
const colunas = ['uf', 'municipio', 'nome_municipio', 'zona', 'secao', 'local', 'tipo_urna', 'modelo_urna', 'agregadas',
  'aptos', 'aptos_tte', 'comparecimento', 'v13', 'v22', 'outros', 'branco', 'nulo'];
const arquivo = await salvar(`secoes-${turno}t.csv`, paraCsv(linhas, colunas));
const tot = linhas.reduce((a, s) => ({ v13: a.v13 + s.v13, v22: a.v22 + s.v22, comp: a.comp + s.comparecimento }), { v13: 0, v22: 0, comp: 0 });
const incoerentes = linhas.filter((s) => s.v13 + s.v22 + s.outros + s.branco + s.nulo !== s.comparecimento).length;
console.log(`${turno}º turno: ${linhas.length} seções em ${ufs.length} UFs (${ufs.join(',')}) → ${arquivo}`);
console.log(`  13: ${tot.v13} · 22: ${tot.v22} · comparecimento: ${tot.comp} · votos sem seção: ${semSecao} · votos ≠ comparecimento: ${incoerentes}`);
