// Engenheiro de segurança, H20 (docs/analysis/engenheiro-seguranca-urna/11): leitura no diário bruto dos casos
// apontados por seguranca-h20-analise.mjs. Para cada seção, lê o pacote do turno pedido (o diário do 2º turno é
// cumulativo: traz a carga, o 1º e o 2º turno) e imprime, por urna, na ordem física:
//   - todo acerto de relógio (hora digitada na carga ou no ADH, "Data e hora atualizada", horário de verão), com a
//     diferença entre a hora digitada e o relógio da urna no mesmo instante;
//   - os eventos-chave dos dias de votação pedidos (zerésima, "Urna pronta", 1º e último voto, encerramento, BU,
//     religamentos, contingência) e todo retrocesso do relógio, com as linhas vizinhas;
// e o recebimento no TSE (dados abertos, via recebimento-negativos.csv não basta: lê o resultado de
// seguranca-h20-recebimento.mjs se a seção estiver nele). Sequências de 8 ou mais dígitos viram '#'.
// Uso: node scripts/auditoria/seguranca-h20-casos.mjs --turno 2 --secoes ba/35734/0026/0289,ce/14192/0040/0141 [--dias 04/10/2026,25/10/2026]
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, secoes: { type: 'string' }, dias: { type: 'string', default: '04/10/2026,25/10/2026' } } });
const dias = values.dias.split(',');
const memoria = (b) => ({ read: async (d, o, n, p) => ({ bytesRead: b.copy(d, o, p, p + n) }), stat: async () => ({ size: b.length }) });
async function textos(h, prof = 0, nome = 'logd.dat') {
  const out = [];
  for (const e of await listarEntradas(h)) {
    const d = await lerEntrada(h, e);
    if (e.nome === 'logd.dat') out.push({ prof, nome, t: d.toString('latin1') });
    else if (e.nome.endsWith('.jez') && prof < 4) out.push(...(await textos(memoria(d), prof + 1, e.nome.replace(/\d{8,}/g, '#'))));
  }
  return out;
}
const abs = (l) => Date.UTC(+l.slice(6, 10), +l.slice(3, 5) - 1, +l.slice(0, 2), +l.slice(11, 13), +l.slice(14, 16), +l.slice(17, 19)) / 1000;
const limpa = (s) => s.replace(/\d{8,}/g, '#');
const CHAVE = /ZERÉSIMA\] via|Urna pronta|encerramento confirmado|Inicio do Encerramento|\[BU\] \[INÍCIO\]|Urna ligada em|contingência|horário de verão|Votação encerrada|Seção Eleitoral/;
const AJUSTE = /digitada pelo operador|Data e hora atualizada|horário de verão/;

for (const id of values.secoes.split(',')) {
  const [uf, m, z, s] = id.split('/');
  const dir = path.join(DIR_DADOS, 'raw', `${values.turno}t`, 'urnas', uf, m.padStart(5, '0'), z.padStart(4, '0'), s.padStart(4, '0'));
  console.log(`\n######## ${id} (pacote do ${values.turno}º turno)`);
  for (const hp of (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name)) {
    const nomes = await readdir(path.join(dir, hp));
    const log = acharArquivo(nomes, 'log');
    if (!log) continue;
    for (const { prof, nome, t } of await textos(memoria(await readFile(path.join(dir, hp, log))))) {
      const porUrna = new Map();
      for (const l of t.split('\n')) {
        if (l.length < 20 || l[2] !== '/') continue;
        const c = l.replace(/\r$/, '').split('\t');
        if (!porUrna.has(c[2])) porUrna.set(c[2], []);
        porUrna.get(c[2]).push(c);
      }
      for (const [urna, L] of porUrna) {
        console.log(`== urna ${urna}, texto ${nome} (prof ${prof}), ${L.length} linhas`);
        const votos = {};
        for (let i = 0; i < L.length; i++) {
          const c = L[i], dia = c[0].slice(0, 10), msg = c[4] ?? '';
          if (msg === 'O voto do eleitor foi computado') { (votos[dia] ??= []).push(c[0].slice(11)); continue; }
          if (AJUSTE.test(msg)) {
            let extra = '';
            const mm = /(\d\d\/\d\d\/\d{4}) - (\d\d:\d\d)/.exec(msg);
            if (mm) extra = ` [digitada − relógio = ${Math.round((abs(`${mm[1]} ${mm[2]}:00`) - abs(c[0])) / 60)} min]`;
            console.log(`  AJUSTE ${c[0]} ${c[3]} ${limpa(msg)}${extra}`);
          } else if (dias.includes(dia) && CHAVE.test(msg)) console.log(`  ${c[0]} ${c[3]} ${limpa(msg)}`);
          if (i > 0 && abs(c[0]) < abs(L[i - 1][0])) console.log(`  RETROCESSO ${Math.round(abs(c[0]) - abs(L[i - 1][0]))} s: ${L[i - 1][0]} ${limpa(L[i - 1][4] ?? '')} -> ${c[0]} ${c[3]} ${limpa(msg)}`);
        }
        for (const [dia, v] of Object.entries(votos)) if (dias.includes(dia) || v.length) console.log(`  votos em ${dia}: ${v.length} (1º ${v[0]}, último ${v[v.length - 1]})`);
      }
    }
  }
}
