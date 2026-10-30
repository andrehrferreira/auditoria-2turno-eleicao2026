// Engenheiro de segurança, H20 (docs/analysis/engenheiro-seguranca-urna/11): o voto de Presidente das seções com
// anomalia de relógio destoa do resto do mesmo local de votação? % do 13 sobre 13 + 22, por turno, na seção e nas outras
// seções do mesmo local (tabela secao.local do banco).
// Uso: node scripts/auditoria/seguranca-h20-votos-local.mjs go/92274/0119/0049,sp/71072/0280/0913
import { abrirLeitura } from '../../src/banco-leitura.js';

const ids = (process.argv[2] ?? '').split(',').filter(Boolean);
const { db } = await abrirLeitura();
const loc = db.prepare('SELECT local FROM secao WHERE turno = ? AND uf = ? AND municipio = ? AND zona = ? AND secao = ?');
const doLocal = db.prepare('SELECT secao FROM secao WHERE turno = ? AND uf = ? AND municipio = ? AND zona = ? AND local = ?');
const votos = db.prepare('SELECT numero, SUM(quantidade) q FROM voto_oficial WHERE turno = ? AND uf = ? AND municipio = ? AND zona = ? AND secao = ? AND cargo = 1 AND numero IN (13, 22) GROUP BY numero');
console.log('turno,secao,p13_secao,votos13e22_secao,p13_resto_do_local,votos13e22_resto,outras_secoes');
for (const id of ids) {
  const [uf, m, z, s] = id.split('/');
  for (const turno of [1, 2]) {
    const l = loc.get(turno, uf, m, z, s);
    if (!l) continue;
    const soma = (sec) => { const o = { 13: 0, 22: 0 }; for (const r of votos.all(turno, uf, m, z, sec)) o[r.numero] = r.q; return o; };
    const a = soma(s);
    const resto = { 13: 0, 22: 0 };
    let n = 0;
    for (const { secao } of doLocal.all(turno, uf, m, z, l.local)) {
      if (secao === s) continue;
      const o = soma(secao);
      resto[13] += o[13]; resto[22] += o[22]; n++;
    }
    const p = (o) => (o[13] + o[22] ? (100 * o[13] / (o[13] + o[22])).toFixed(2) : '');
    console.log([turno, id, p(a), a[13] + a[22], p(resto), resto[13] + resto[22], n].join(','));
  }
}
db.close();
