// Parecer cético 57: urna de reserva no dia (tipo reservaSecao no BU) entre as 159 seções fora do normal da H02(d), por classe
// do autor, contra a taxa do país no 2º turno. Lê outliers-2t.csv (lista e classe do autor, reproduzidas por cetico-57-h02d.mjs).
// Uso: node scripts/auditoria/cetico-57-reserva.mjs   Saída: data/parsed/auditoria/cetico/57/reserva.json
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
const D = path.join(DIR_DADOS, 'parsed', 'auditoria');
const linhas = (await readFile(path.join(D, 'estatistico-eleitoral', 'h02-h05-final', 'outliers-2t.csv'), 'utf8')).trim().split('\n');
const sep = linhas[0].includes(';') ? ';' : ','; const cab = linhas[0].split(sep);
const L = linhas.slice(1).map((l) => Object.fromEntries(l.split(sep).map((v, i) => [cab[i], v])));
const { db } = await abrirLeitura();
const q = db.prepare('SELECT tipo_urna FROM secao WHERE turno = 2 AND uf = ? AND municipio = ? AND zona = ? AND secao = ?');
const pais = db.prepare("SELECT SUM(tipo_urna <> 'secao') r, COUNT(*) n FROM secao WHERE turno = 2 AND uf <> 'zz' AND comparecimento > 0").get();
const out = { pais: { reserva: pais.r, secoes: pais.n, taxa: pais.r / pais.n }, porClasse: {} };
for (const x of L) { const [uf, m, z, s] = x.k.split('/'); const t = q.get(uf, m, z, s).tipo_urna; const o = (out.porClasse[x.classe] ??= { secoes: 0, reserva: 0, manual: 0, manualReserva: 0 }); o.secoes++; o.manual += +x.manual; if (t !== 'secao') { o.reserva++; o.manualReserva += +x.manual; } }
db.close();
await writeFile(path.join(D, 'cetico', '57', 'reserva.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
