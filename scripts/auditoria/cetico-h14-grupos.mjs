// Parecer cético 30 (H14): cruza a definição de grupos do estatístico
// (reservas-1t2t/secoes.csv) com a do engenheiro (reservas-rastro/grupos.jsonl).
// Uso: node scripts/auditoria/cetico-h14-grupos.mjs
import fs from 'node:fs';
import readline from 'node:readline';
const B = 'data/parsed/auditoria';
const est = new Map();
let cab;
const rl = readline.createInterface({ input: fs.createReadStream(`${B}/reservas-1t2t/secoes.csv`) });
for await (const l of rl) {
  const c = l.split(';');
  if (!cab) { cab = c; continue; }
  const k = `${c[0]}/${c[1]}/${c[2]}/${c[3]}`;
  est.set(k, { classe: c[4], tipo1: c[5], tipo2: c[6] });
}
const eng = new Map();
const rl2 = readline.createInterface({ input: fs.createReadStream(`${B}/reservas-rastro/grupos.jsonl`) });
for await (const l of rl2) { if (!l) continue; const o = JSON.parse(l); eng.set(o.k, o.grupo); }
const tab = {};
let soEst = {}, soEng = {};
for (const [k, e] of est) {
  const g = eng.get(k) ?? '(ausente no eng)';
  if (g === '(ausente no eng)') soEst[e.classe] = (soEst[e.classe] || 0) + 1;
  const kk = `${e.classe} | ${g}`;
  tab[kk] = (tab[kk] || 0) + 1;
}
for (const [k, g] of eng) if (!est.has(k)) soEng[g] = (soEng[g] || 0) + 1;
const H14E = new Set(['contingencia_dia_com_votos', 'contingencia_dia_antes_abertura', 'troca_antes_secao_reserva', 'troca_antes_reserva_reserva']);
const linhas = Object.entries(tab).sort((a, b) => b[1] - a[1]);
console.log('estatístico | engenheiro : seções');
for (const [k, n] of linhas) console.log(`${k} : ${n}`);
console.log('só no estatístico (classe):', soEst);
console.log('só no engenheiro (grupo):', soEng);
const classes = [...new Set([...est.values()].map(e => e.classe))];
console.log('classes do estatístico:', classes);
