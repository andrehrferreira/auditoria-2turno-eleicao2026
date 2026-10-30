import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { linhasZip } from './seguranca-h27-lib.mjs';

// Parecer cético 38 (H27), parte 7: universo pacote × CEFT e urna/carga do BU (banco) × urna/carga EFETIVADA do CEFT,
// nos dois turnos. Confere o item 1.1 e 1.2 do doc 09 com o BU lido pelo parser do banco (não pelo doc 08).
// Saída: data/parsed/auditoria/cetico-revisor/38/efetivada.json
// Uso: node scripts/auditoria/cetico-38-efetivada.mjs

const z = (s) => String(s ?? '').replace(/^0+/, '');
const k4 = (uf, m, zn, s) => `${uf.toLowerCase()}/${String(m).padStart(5, '0')}/${String(zn).padStart(4, '0')}/${String(s).padStart(4, '0')}`;
const { db } = await abrirLeitura();
const R = {};
for (const t of [1, 2]) {
  const bu = new Map();
  for (const r of db.prepare(`SELECT uf, municipio, zona, secao, tipo_arquivo, numero_interno_urna u, codigo_carga c FROM secao WHERE turno = ? AND situacao = 'completa'`).iterate(t)) bu.set(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, r);
  const dir = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'correspondencias', `2026-${t}t`);
  const c = { pacotes: bu.size, ceft: 0, ceftSemPacote: 0, pacoteSemCeft: 0, urnaIgual: 0, urnaDifere: 0, cargaIgual: 0, cargaDifere: 0, difereSA: 0 };
  const vistos = new Set();
  for (const n of (await readdir(dir)).filter((x) => x.startsWith('CEFT_'))) {
    for await (const r of linhasZip(path.join(dir, n))) {
      const k = k4(r.SG_UF, r.CD_MUNICIPIO, r.NR_ZONA, r.NR_SECAO);
      c.ceft++; vistos.add(k);
      const b = bu.get(k);
      if (!b) { c.ceftSemPacote++; continue; }
      const sa = /^sa/.test(b.tipo_arquivo);
      if (Number(b.u) === Number(r.NR_URNA_EFETIVADA)) c.urnaIgual++; else { c.urnaDifere++; if (sa) c.difereSA++; }
      if (z(b.c) === z(r.CD_CARGA_URNA_EFETIVADA)) c.cargaIgual++; else c.cargaDifere++;
    }
  }
  c.pacoteSemCeft = [...bu.keys()].filter((k) => !vistos.has(k)).length;
  R[`${t}t`] = c;
}
await writeFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '38', 'efetivada.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
