// Cético, parecer 39 (H23): recontagem própria do "fora do bloco da zona" (1º turno) e da madrugada, só com o BU,
// e sensibilidade a duas escolhas do matemático: o limiar do dia de cerimônia (3+ cargas) e a distância (2+ dias).
// Uso: node scripts/auditoria/cetico-39-h23-bloco.mjs → data/parsed/auditoria/cetico-revisor/39-h23-bloco.json
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { abrirLeitura } from '../../src/banco-leitura.js';

const { db, fonte } = await abrirLeitura();
const rows = db.prepare("SELECT uf, zona, municipio, secao, tipo_urna t, data_hora_carga c FROM secao WHERE turno = 1 AND situacao = 'completa'").all();
db.close();
const Z = new Map();
for (const r of rows) { const z = `${r.uf}/${r.zona}`; const o = Z.get(z) ?? []; o.push(r); Z.set(z, o); }
const R = { fonte, bus: rows.length, zonas: Z.size, madrugada: rows.filter((r) => Number(r.c.slice(11, 13)) < 6).length, grade: {} };
for (const minCer of [3, 5, 10]) for (const dist of [1, 2, 3]) {
  let fora = 0; let reserva = 0;
  for (const l of Z.values()) {
    const dias = new Map(); for (const r of l) dias.set(r.c.slice(0, 10), (dias.get(r.c.slice(0, 10)) ?? 0) + 1);
    const cer = [...dias].filter(([, n]) => n >= minCer).map(([d]) => Date.parse(d));
    for (const r of l) {
      const d = r.c.slice(0, 10); if (dias.get(d) >= minCer) continue;
      const m = cer.length ? Math.min(...cer.map((c) => Math.abs(c - Date.parse(d)) / 864e5)) : Infinity;
      if (m >= dist && dias.get(d) <= 2) { fora++; if (r.t !== 'secao') reserva++; }
    }
  }
  R.grade[`cerimonia>=${minCer} distancia>=${dist}`] = { fora, tipoReserva: reserva };
}
await writeFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '39-h23-bloco.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
