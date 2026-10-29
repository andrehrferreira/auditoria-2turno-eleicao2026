// Matemático forense: invariantes medidos só com o banco (cópia de leitura de data/db, src/banco-leitura.js), por turno, no que estiver
// carregado. Cada invariante: nome, de onde vem a garantia (ver docs/analysis/matematico-forense/01-catalogo.md),
// total de seções testadas, violações e até 20 exemplos.
//
//   D1  detalhamento do comparecimento (sem biometria + biometria + biografia) = comparecimento do BU
//   D2  aptos = aptos da seção + aptos em trânsito (TTE), por eleição
//   D3  aptos da seção iguais nas eleições federal e estadual da mesma seção
//   D4  comparecimento da eleição federal (presidente) = comparecimento do BU; estadual ≤ federal;
//       federal − estadual ≤ aptos federal − aptos estadual (só o eleitor em trânsito de outra UF vota só em presidente)
//   D4b comparecimento majoritário = proporcional na mesma eleição (1º turno, eleição estadual)
//   D5  Σ votos do BU por cargo = escolhas × comparecimento do tipo de cargo (senador 1º turno: 2 escolhas)
//   D6  log: biometria + ano de nascimento sem biometria + dado pessoal = votos computados (cada voto tem um caminho)
//   D7  log = detalhamento do BU, classe a classe
//   D8  votos fora da janela de votação (antes de "Urna pronta" ou depois do início do encerramento) = 0
//
// Uso: node scripts/auditoria/matematico-banco.mjs   → data/parsed/auditoria/matematico/banco-invariantes.json
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'matematico');
// Cópia de leitura imutável (doc 09, "Leitura sem concorrência"); as UFs do 1º turno nela estão em `ponteiro.cargas`.
const { db, ponteiro } = await abrirLeitura();
const FEDERAL = { 1: 6257, 2: 6258 };
const ESTADUAL = { 1: 6259, 2: 6260 };
const CHAVE = 's.uf, s.municipio, s.zona, s.secao';

function medir(nome, garantia, sqlTotal, sqlViolacoes, params) {
  const total = db.prepare(sqlTotal).get(...params).n;
  const violacoes = db.prepare(sqlViolacoes).all(...params);
  return { nome, garantia, testadas: total, violacoes: violacoes.length, exemplos: violacoes.slice(0, 20).map((r) => ({ ...r })) };
}

const resultado = { geradoEm: new Date().toISOString(), copiaLeitura: ponteiro, cargas: db.prepare('SELECT turno, uf, carregado_em FROM carga ORDER BY turno, uf').all().map((r) => ({ ...r })), turnos: {} };

for (const turno of [1, 2]) {
  const f = FEDERAL[turno];
  const e = ESTADUAL[turno];
  const inv = [];
  const completa = `FROM secao s WHERE s.turno = ? AND s.situacao = 'completa'`;

  inv.push(medir('D1 detalhamento = comparecimento', 'software da urna (BU assinado)',
    `SELECT COUNT(*) n ${completa} AND s.sem_biometria IS NOT NULL`,
    `SELECT ${CHAVE}, s.tipo_urna, s.comparecimento, s.sem_biometria, s.por_biometria, s.por_biografia ${completa}
       AND s.sem_biometria IS NOT NULL AND s.sem_biometria + s.por_biometria + s.por_biografia <> s.comparecimento`, [turno]));
  inv.push({ nome: 'D1n seções completas sem detalhamento', garantia: 'informativo',
    porUfTipo: db.prepare(`SELECT s.uf, s.tipo_urna, s.tipo_arquivo, COUNT(*) n ${completa} AND s.sem_biometria IS NULL GROUP BY 1, 2, 3`).all(turno).map((r) => ({ ...r })) });

  inv.push(medir('D2 aptos = aptos da seção + TTE', 'software da urna (BU assinado)',
    'SELECT COUNT(*) n FROM secao_eleicao s WHERE s.turno = ?',
    `SELECT ${CHAVE}, s.eleicao, s.aptos, s.aptos_secao, s.aptos_tte FROM secao_eleicao s WHERE s.turno = ? AND s.aptos <> s.aptos_secao + s.aptos_tte`, [turno]));

  const par = `FROM secao_eleicao s JOIN secao_eleicao t ON t.turno = s.turno AND t.uf = s.uf AND t.municipio = s.municipio
      AND t.zona = s.zona AND t.secao = s.secao AND t.eleicao = ${e} WHERE s.turno = ? AND s.eleicao = ${f}`;
  inv.push(medir('D3 aptos da seção iguais nas eleições federal e estadual', 'cadastro carregado na urna',
    `SELECT COUNT(*) n ${par}`,
    `SELECT ${CHAVE}, s.aptos_secao AS aptos_secao_federal, t.aptos_secao AS aptos_secao_estadual ${par} AND s.aptos_secao <> t.aptos_secao`, [turno]));

  const fed = `FROM secao s JOIN secao_eleicao fe ON fe.turno = s.turno AND fe.uf = s.uf AND fe.municipio = s.municipio AND fe.zona = s.zona
      AND fe.secao = s.secao AND fe.eleicao = ${f} WHERE s.turno = ? AND s.situacao = 'completa'`;
  inv.push(medir('D4a comparecimento federal = comparecimento do BU', 'software da urna',
    `SELECT COUNT(*) n ${fed}`,
    `SELECT ${CHAVE}, s.tipo_urna, s.comparecimento, fe.comparecimento_majoritario AS comp_federal ${fed} AND fe.comparecimento_majoritario <> s.comparecimento`, [turno]));
  inv.push(medir('D4b 0 ≤ comp. federal − estadual ≤ aptos federal − aptos estadual', 'software da urna + regra do voto em trânsito',
    `SELECT COUNT(*) n ${par}`,
    `SELECT ${CHAVE}, s.aptos AS aptos_fed, t.aptos AS aptos_est, s.comparecimento_majoritario AS comp_fed, t.comparecimento_majoritario AS comp_est ${par}
       AND (s.comparecimento_majoritario < t.comparecimento_majoritario
         OR s.comparecimento_majoritario - t.comparecimento_majoritario > s.aptos - t.aptos)`, [turno]));
  inv.push(medir('D4c comparecimento majoritário = proporcional na mesma eleição', 'software da urna',
    'SELECT COUNT(*) n FROM secao_eleicao s WHERE s.turno = ? AND s.comparecimento_proporcional IS NOT NULL AND s.comparecimento_majoritario IS NOT NULL',
    `SELECT ${CHAVE}, s.eleicao, s.comparecimento_majoritario, s.comparecimento_proporcional FROM secao_eleicao s WHERE s.turno = ?
       AND s.comparecimento_proporcional IS NOT NULL AND s.comparecimento_majoritario IS NOT NULL AND s.comparecimento_majoritario <> s.comparecimento_proporcional`, [turno]));

  // D5: proporcional = cargos 6, 7, 8; senador no 1º turno de 2026 tem 2 escolhas (conferido no RDV por matematico-brutos.mjs)
  const somas = `WITH v AS (SELECT turno, uf, municipio, zona, secao, eleicao, cargo, SUM(quantidade) soma FROM voto_bu WHERE turno = ? GROUP BY 1, 2, 3, 4, 5, 6, 7)
    SELECT v.uf, v.municipio, v.zona, v.secao, v.eleicao, v.cargo, v.soma,
      CASE WHEN v.cargo IN (6, 7, 8) THEN s.comparecimento_proporcional ELSE s.comparecimento_majoritario END AS comp,
      CASE WHEN v.cargo = 5 AND v.turno = 1 THEN 2 ELSE 1 END AS escolhas
    FROM v JOIN secao_eleicao s USING (turno, uf, municipio, zona, secao, eleicao)`;
  const linhasSoma = db.prepare(somas).all(turno);
  const violSoma = linhasSoma.filter((r) => r.comp !== null && r.soma !== r.escolhas * r.comp);
  inv.push({ nome: 'D5 Σ votos do cargo = escolhas × comparecimento', garantia: 'software da urna (BU assinado)', testadas: linhasSoma.length,
    semComparecimento: linhasSoma.filter((r) => r.comp === null).length, violacoes: violSoma.length, exemplos: violSoma.slice(0, 20).map((r) => ({ ...r })) });

  const log = `FROM secao s JOIN perfil_log p ON p.turno = s.turno AND p.uf = s.uf AND p.municipio = s.municipio AND p.zona = s.zona
      AND p.secao = s.secao AND p.hash = s.hash WHERE s.turno = ? AND s.situacao = 'completa'`;
  inv.push(medir('D6 log: biometria + ano nasc. + dado pessoal = votos computados', 'software da urna (log encadeado)',
    `SELECT COUNT(*) n ${log}`,
    `SELECT ${CHAVE}, s.tipo_urna, p.votos_computados, p.habilitados_biometria, p.ano_nascimento_sem_biometria, p.dado_pessoal_confere ${log}
       AND p.habilitados_biometria + p.ano_nascimento_sem_biometria + p.dado_pessoal_confere <> p.votos_computados`, [turno]));
  inv.push(medir('D7 log = detalhamento do BU, classe a classe', 'software da urna',
    `SELECT COUNT(*) n ${log} AND s.sem_biometria IS NOT NULL`,
    `SELECT ${CHAVE}, s.tipo_urna, s.sem_biometria, p.ano_nascimento_sem_biometria, s.por_biometria, p.habilitados_biometria, s.por_biografia, p.dado_pessoal_confere ${log}
       AND s.sem_biometria IS NOT NULL AND (s.sem_biometria <> p.ano_nascimento_sem_biometria OR s.por_biometria <> p.habilitados_biometria
         OR s.por_biografia <> p.dado_pessoal_confere)`, [turno]));
  inv.push(medir('D8 votos fora da janela = 0', 'software da urna (log)',
    `SELECT COUNT(*) n ${log}`,
    `SELECT ${CHAVE}, s.tipo_urna, p.votos_fora_da_janela, p.urna_pronta_s, p.inicio_encerramento_s ${log} AND p.votos_fora_da_janela > 0`, [turno]));

  resultado.turnos[turno] = inv;
}

await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, 'banco-invariantes.json'), `${JSON.stringify(resultado, null, 1)}\n`);
for (const [turno, inv] of Object.entries(resultado.turnos)) {
  for (const i of inv) console.log(`${turno}t ${i.nome}: ${i.testadas ?? '-'} testadas, ${i.violacoes ?? '-'} violações${i.porUfTipo ? ` ${JSON.stringify(i.porUfTipo)}` : ''}`);
}
