// Parecer cético 57: as 46 seções "sem explicação técnica" da H02(d), hora a hora no 2º turno.
// Fonte das horas: horario-2t.jsonl (frente H13; v1 = biometria, v3 = liberação manual, por hora local da urna), conferido
// contra o diário bruto (cetico-57-bruto.mjs) nas seções exportadas. Tipo de urna do banco (reservaSecao = urna trocada no dia).
// Classes do revisor (só rastro técnico):
//   R  urna de reserva no 2º turno (troca de urna no dia, registrada no BU);
//   B  bloco sem leitura: ≥ 70% das liberações manuais caem em horas em que a urna reconheceu ≤ 10% dos que pediram digital
//      (v1 ÷ (v1 + v3) ≤ 0,10, hora com ≥ 5 votos) — o leitor "parou" numa parte do dia;
//   M  misto: liberação manual em horas em que a urna reconhecia a maioria (compatível com seletividade ou com leitor intermitente).
// Uso: node scripts/auditoria/cetico-57-h02d-horas.mjs
// Saída: data/parsed/auditoria/cetico/57/h02d-horas.json
import { createReadStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

const D = path.join(DIR_DADOS, 'parsed', 'auditoria');
const h = JSON.parse(await readFile(path.join(D, 'cetico', '57', 'h02d.json'), 'utf8'));
const L = h.lista46; const alvo = new Set(L.map((x) => x.k));
const hor = new Map();
for await (const l of createInterface({ input: createReadStream(path.join(D, 'estatistico', 'h13-v2', 'horario-2t.jsonl')), crlfDelay: Infinity })) {
  if (!l) continue; const id = l.slice(7, l.indexOf('"', 7)); if (!alvo.has(id)) continue; hor.set(id, JSON.parse(l));
}
const { db } = await abrirLeitura();
const q = db.prepare('SELECT tipo_urna FROM secao WHERE turno = 2 AND uf = ? AND municipio = ? AND zona = ? AND secao = ?');
const out = { classes: {}, secoes: [] };
for (const x of L) {
  const [uf, m, z, s] = x.k.split('/');
  const tipo = q.get(uf, m, z, s).tipo_urna;
  const H = hor.get(x.k); const v1 = H.hora.v1 ?? [], v3 = H.hora.v3 ?? [], v2 = H.hora.v2 ?? [];
  let manTot = 0, manSemLeitura = 0;
  const horas = [];
  for (let i = 0; i < 24; i++) {
    const a = v1[i] ?? 0, b = v3[i] ?? 0, c = v2[i] ?? 0; manTot += b;
    if (a + b + c >= 5 && a / Math.max(1, a + b) <= 0.1) manSemLeitura += b;
    if (a + b + c) horas.push(`${i}h ${b}/${a + b + c}`);
  }
  const classe = tipo !== 'secao' ? 'R' : manSemLeitura >= 0.7 * manTot ? 'B' : 'M';
  const o = (out.classes[classe] ??= { secoes: 0, manual: 0 }); o.secoes++; o.manual += x.x2;
  out.secoes.push({ k: x.k, tipo, classe, manual: x.x2, manualHoraSemLeitura: manSemLeitura, p1t: x.p1t, mesmaUrnaEntreTurnos: x.mesmaUrna, desvio: x.desvio, horas: horas.join(' · ') });
}
db.close();
await writeFile(path.join(D, 'cetico', '57', 'h02d-horas.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.classes));
for (const s of out.secoes.filter((s) => s.classe !== 'R').sort((a, b) => b.manual - a.manual)) console.log(s.classe, s.k, s.manual, s.manualHoraSemLeitura, s.p1t.toExponential(1), s.desvio ? 'DESVIO' : '', '|', s.horas);
