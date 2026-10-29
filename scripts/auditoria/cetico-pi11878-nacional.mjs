// Cético (lente reprodução e código): confere de forma independente, só com o banco (cópia de leitura),
// se PI 11878/0028/0099 é a única seção com "migração mínima" >= 10 entre os finalistas.
// Migração mínima do 22 = votos22_2T − (votos22_1T + outros nominais_1T + brancos/nulos_1T + abstenção_1T + aptos novos).
// Usa a soma dos votos de presidente como comparecimento (vale também para BU do Sistema de Apuração).
// O 1º turno ainda está parcial no banco: o resultado vale só para as UFs com os dois turnos carregados.
//
// Uso: node scripts/auditoria/cetico-pi11878-nacional.mjs
// Saída: data/parsed/auditoria/cetico/pi11878-nacional.json
import { mkdirSync, writeFileSync } from 'node:fs';
import { abrirLeitura } from '../../src/banco-leitura.js';

const SAIDA = 'data/parsed/auditoria/cetico/pi11878-nacional.json';
const { db, fonte } = await abrirLeitura();
const ufs = db.prepare(`SELECT uf FROM carga GROUP BY uf HAVING COUNT(DISTINCT turno) = 2 ORDER BY uf`).all().map((r) => r.uf);

const q = db.prepare(`
WITH v AS (
  SELECT turno, municipio, zona, secao,
    SUM(CASE WHEN tipo_voto = 'nominal' AND numero = 13 THEN quantidade ELSE 0 END) l,
    SUM(CASE WHEN tipo_voto = 'nominal' AND numero = 22 THEN quantidade ELSE 0 END) f,
    SUM(quantidade) tot
  FROM voto_bu WHERE uf = ? AND cargo = 1 GROUP BY turno, municipio, zona, secao),
a AS (SELECT turno, municipio, zona, secao, MAX(aptos) aptos FROM secao_eleicao WHERE uf = ? GROUP BY turno, municipio, zona, secao)
SELECT v1.municipio, v1.zona, v1.secao, v1.l l1, v1.f f1, v1.tot t1, v2.l l2, v2.f f2, v2.tot t2, a1.aptos ap1, a2.aptos ap2
FROM v v1 JOIN v v2 ON v2.turno = 2 AND v2.municipio = v1.municipio AND v2.zona = v1.zona AND v2.secao = v1.secao
LEFT JOIN a a1 ON a1.turno = 1 AND a1.municipio = v1.municipio AND a1.zona = v1.zona AND a1.secao = v1.secao
LEFT JOIN a a2 ON a2.turno = 2 AND a2.municipio = v1.municipio AND a2.zona = v1.zona AND a2.secao = v1.secao
WHERE v1.turno = 1`);

let total = 0, semAptos = 0;
const positivos = [];
for (const uf of ufs) {
  for (const r of q.all(uf, uf)) {
    total++;
    if (r.ap1 == null || r.ap2 == null) { semAptos++; continue; }
    const mig13 = Math.max(0, r.l2 - (r.l1 + (r.t1 - r.l1 - r.f1) + Math.max(0, r.ap1 - r.t1) + Math.max(0, r.ap2 - r.ap1)));
    const mig22 = Math.max(0, r.f2 - (r.f1 + (r.t1 - r.l1 - r.f1) + Math.max(0, r.ap1 - r.t1) + Math.max(0, r.ap2 - r.ap1)));
    if (mig13 > 0 || mig22 > 0) positivos.push({ secao: `${uf}/${r.municipio}/${r.zona}/${r.secao}`, mig13, mig22, aptos: [r.ap1, r.ap2], votos1: [r.l1, r.f1, r.t1], votos2: [r.l2, r.f2, r.t2] });
  }
}
positivos.sort((x, y) => Math.max(y.mig13, y.mig22) - Math.max(x.mig13, x.mig22));
const res = { fonte, geradoEm: new Date().toISOString(), ufsComDoisTurnos: ufs, secoesComparadas: total, semAptos,
  comMigracaoPositiva: positivos.length, comMigracao10ouMais: positivos.filter((p) => Math.max(p.mig13, p.mig22) >= 10).length, positivos };
mkdirSync('data/parsed/auditoria/cetico', { recursive: true });
writeFileSync(SAIDA, JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
