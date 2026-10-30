// Cético revisor, parecer 47 (H20). Leitura no diário bruto de seções escolhidas, independente dos scripts do
// engenheiro. Por urna e por arquivo (logd.dat do pacote e .jez aninhados), na ordem física:
//   - toda linha de acerto de relógio, religamento, contingência, seção declarada, zerésima, urna pronta,
//     encerramento e BU (com --dias, só nesses dias; os acertos sempre);
//   - todo retrocesso do relógio, com 4 linhas antes e 3 depois;
//   - votos do dia por urna (1º e último).
// Uso: node scripts/auditoria/cetico-47-bruto.mjs --turno 1 --secoes ro/00035/0021/0257,... [--dias 04/10/2026] [--todos-retrocessos]
// Sequências de 8 ou mais dígitos viram '#'.
import { open, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, secoes: { type: 'string' }, dias: { type: 'string' }, 'so-retrocessos': { type: 'boolean' } } });
const dias = values.dias ? values.dias.split(',') : null;
const emMemoria = (buf) => ({ read: async (d, o, n, p) => ({ bytesRead: buf.copy(d, o, p, p + n) }), stat: async () => ({ size: buf.length }) });
const limpa = (s) => s.replace(/\d{8,}/g, '#');
const abs = (l) => Date.UTC(+l.slice(6, 10), +l.slice(3, 5) - 1, +l.slice(0, 2), +l.slice(11, 13), +l.slice(14, 16), +l.slice(17, 19)) / 1000;
const datado = (l) => l.length >= 19 && l[2] === '/' && l[5] === '/' && l[10] === ' ';
const CHAVE = /data e hora|hor[aá]rio|Urna ligada|Início das operações do logd|registro do log|Fechando o arquivo|contingência|Seção Eleitoral|ZERÉSIMA\]|Urna pronta|encerramento confirmado|\[BU\] \[INÍCIO\]|corrompido|Encerramento só pode/i;

async function textos(h, nivel, nome, out) {
  for (const e of await listarEntradas(h)) {
    const d = await lerEntrada(h, e);
    if (e.nome === 'logd.dat') out.push({ nivel, nome, t: d.toString('latin1') });
    else if (e.nome.endsWith('.jez') && nivel < 5) await textos(emMemoria(d), nivel + 1, limpa(e.nome), out);
  }
  return out;
}

for (const id of values.secoes.split(',')) {
  const dir = path.join(DIR_DADOS, 'raw', `${values.turno}t`, 'urnas', ...id.split('/'));
  console.log(`######## ${id} (turno ${values.turno})`);
  for (const pac of (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name)) {
    const arq = acharArquivo(await readdir(path.join(dir, pac)), 'log');
    if (!arq) { console.log('  pacote sem log'); continue; }
    const h = await open(path.join(dir, pac, arq));
    let ts;
    try { ts = await textos(h, 0, 'logd.dat', []); } finally { await h.close(); }
    for (const { nivel, nome, t } of ts) {
      const porUrna = new Map();
      for (const b of t.split('\n')) {
        const l = b.endsWith('\r') ? b.slice(0, -1) : b;
        const c = l.split('\t');
        if (c.length < 5 || !datado(l)) continue;
        if (!porUrna.has(c[2])) porUrna.set(c[2], []);
        porUrna.get(c[2]).push(l);
      }
      for (const [urna, ls] of porUrna) {
        console.log(`== arquivo ${nome} (nível ${nivel}), urna ${urna}, ${ls.length} linhas, de ${ls[0].slice(0, 19)} a ${ls.at(-1).slice(0, 19)}`);
        const votos = {};
        for (let i = 0; i < ls.length; i++) {
          const l = ls[i];
          const c = l.split('\t');
          if (c[4] === 'O voto do eleitor foi computado') {
            const d = l.slice(0, 10);
            const v = (votos[d] ??= { n: 0, p: l.slice(11, 19), u: '' });
            v.n++; v.u = l.slice(11, 19);
          }
          const dia = !dias || dias.includes(l.slice(0, 10));
          const acerto = /data e hora (atualizada|que foi digitada|solicitadas)|ajuste de data e hora|hor[aá]rio da urna alterado/i.test(c[4]) || c[3] === 'ADH';
          if (!values['so-retrocessos'] && (acerto || (dia && CHAVE.test(c[4])))) console.log(`  ${i} ${l.slice(0, 19)} ${c[3]} ${limpa(c[4])}`);
          if (i > 0 && abs(l) < abs(ls[i - 1])) {
            console.log(`  >>> RETROCESSO na linha ${i}: ${abs(l) - abs(ls[i - 1])} s`);
            for (let j = Math.max(0, i - 4); j <= Math.min(ls.length - 1, i + 3); j++) { const cj = ls[j].split('\t'); console.log(`      ${j} ${ls[j].slice(0, 19)} ${cj[3]} ${limpa(cj[4] ?? '')}`); }
          }
        }
        for (const [d, v] of Object.entries(votos)) console.log(`  votos em ${d}: ${v.n} (1º ${v.p}, último ${v.u})`);
      }
    }
  }
}
