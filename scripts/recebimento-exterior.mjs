// O sistema do TSE recebia boletins antes das 17h de Brasília? Teste pelo exterior: urnas que fecham às 17h LOCAIS em
// fusos à frente de Brasília (Ásia, Europa) encerram horas antes das 17h de Brasília. Se o TSE as recebeu antes das 17h,
// não havia "porta fechada" até as 17h, e a ausência de boletins brasileiros recebidos antes das 17h vira prova de que
// nenhuma urna do país fechou antes disso. Uso: node scripts/recebimento-exterior.mjs [turno]
import { open, readdir } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../src/config.js';
import { lerEntrada, listarEntradas } from '../src/zip.js';

const turno = process.argv[2] ?? '2';
const dir = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'detalhe_votacao_secao');
const h = await open(path.join(dir, (await readdir(dir)).find((n) => n.endsWith('.zip'))));
const porUf = new Map();
for (const e of (await listarEntradas(h)).filter((x) => x.nome.endsWith('.csv') && !/_BR\.csv$/i.test(x.nome))) {
  const buf = await lerEntrada(h, e);
  const fimCab = buf.indexOf(10);
  const col = buf.toString('latin1', 0, fimCab).trim().split(';').map((c) => c.replace(/"/g, ''));
  const i = (n) => col.indexOf(n);
  for (let pos = fimCab + 1; pos < buf.length; ) {
    let fim = Math.min(buf.length, pos + 64 * 1024 * 1024);
    if (fim < buf.length) fim = buf.indexOf(10, fim) + 1 || buf.length;
    for (const l of buf.toString('latin1', pos, fim).split(/\r?\n/)) {
      if (!l) continue;
      const c = l.split(';').map((x) => x.replace(/"/g, ''));
      if (c[i('NR_TURNO')] !== turno || c[i('DS_CARGO')] !== 'Presidente') continue;
      const uf = c[i('SG_UF')].toLowerCase();
      const t = c[i('DT_RECEBIMENTO_BU_HOR_TSE')];
      const o = porUf.get(uf) ?? { n: 0, antes17: 0, min: null, exemplos: [] };
      o.n++;
      const m = /(\d\d)\/(\d\d)\/(\d{4}) (\d\d):(\d\d):(\d\d)/.exec(t);
      if (m) {
        const iso = `${m[3]}-${m[2]}-${m[1]} ${m[4]}:${m[5]}:${m[6]}`;
        if (!o.min || iso < o.min) o.min = iso;
        if (iso < `${iso.slice(0, 10)} 17:00:00` && iso.slice(0, 10) === (turno === '2' ? '2026-10-25' : '2026-10-04')) {
          o.antes17++;
          if (o.exemplos.length < 3) o.exemplos.push(`${c[i('NM_MUNICIPIO')]} ${iso}`);
        }
        if (iso.slice(0, 10) < (turno === '2' ? '2026-10-25' : '2026-10-04')) o.antes17++;
      }
      porUf.set(uf, o);
    }
    pos = fim;
  }
}
await h.close();
for (const [uf, o] of [...porUf].sort()) {
  if (o.antes17 || uf === 'zz' || uf === 'ac') console.log(`${uf}: ${o.n} seções; recebimento mais cedo ${o.min}; recebidas antes das 17h de Brasília do dia da eleição: ${o.antes17}${o.exemplos.length ? ' (ex.: ' + o.exemplos.join('; ') + ')' : ''}`);
}
