// Parecer cético 53 (H26, fechamento), pergunta 5: o "local de votação" dos 30 casos da parte (a).
// politico-h26-a-secoes.mjs (linha 145) agrupa o local por uf|municipio|local, mas o número do local só é único dentro
// da zona. Para cada caso: seções com aquele número de local no município (o que o autor contou) e na zona (o local de
// verdade). Para o local 1546 da SP 71072/0002, os totais por turno (comparecimento, 13, 22) do local e do resto da zona.
// Só leitura (banco de leitura). Uso: node scripts/auditoria/cetico-53-local.mjs
// Saída: data/parsed/auditoria/cetico-revisor/53-local.json
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirLeitura } from '../../src/banco-leitura.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SAIDA = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico-revisor');
const A = JSON.parse(readFileSync(path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cientista-politico', 'h26-a-secoes.json'), 'utf8'));
const { db, fonte } = await abrirLeitura();
const qMun = db.prepare('SELECT COUNT(*) n FROM secao WHERE turno = 2 AND uf = ? AND municipio = ? AND local = ?');
const qZona = db.prepare('SELECT COUNT(*) n FROM secao WHERE turno = 2 AND uf = ? AND municipio = ? AND zona = ? AND local = ?');
const R = { geradoEm: new Date().toISOString(), banco: path.basename(fonte), casos: [], localSp: {} };
for (const c of A.casos) {
  const [uf, mun, zona] = c.secao.split('/');
  const municipio = qMun.get(uf, mun, c.local.codigo).n, naZona = qZona.get(uf, mun, zona, c.local.codigo).n;
  R.casos.push({ secao: c.secao, lado: c.lado, local: c.local.codigo, secoesAutor: c.local.secoes, secoesNoMunicipio: municipio, secoesNaZona: naZona, errado: municipio !== naZona });
}
R.casosErrados = R.casos.filter((c) => c.errado).length;
const qTot = db.prepare(`SELECT s.turno, (s.local = 1546) noLocal, COUNT(*) secoes, SUM(s.comparecimento) comparecimento,
    SUM((SELECT SUM(quantidade) FROM voto_bu v WHERE v.turno = s.turno AND v.uf = s.uf AND v.municipio = s.municipio AND v.zona = s.zona AND v.secao = s.secao AND v.cargo = 1 AND v.numero = 13)) v13,
    SUM((SELECT SUM(quantidade) FROM voto_bu v WHERE v.turno = s.turno AND v.uf = s.uf AND v.municipio = s.municipio AND v.zona = s.zona AND v.secao = s.secao AND v.cargo = 1 AND v.numero = 22)) v22
  FROM secao s WHERE s.uf = 'sp' AND s.municipio = '71072' AND s.zona = '0002' AND s.situacao = 'completa' GROUP BY s.turno, noLocal`);
for (const r of qTot.all()) R.localSp[`t${r.turno}|${r.noLocal ? 'local1546' : 'restoDaZona'}`] = r;
R.zonasComLocal1546EmSaoPaulo = db.prepare("SELECT COUNT(DISTINCT zona) n FROM secao WHERE turno = 2 AND uf = 'sp' AND municipio = '71072' AND local = 1546").get().n;
db.close();
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, '53-local.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify({ casosErrados: R.casosErrados, errados: R.casos.filter((c) => c.errado), localSp: R.localSp, zonas: R.zonasComLocal1546EmSaoPaulo }, null, 1));
