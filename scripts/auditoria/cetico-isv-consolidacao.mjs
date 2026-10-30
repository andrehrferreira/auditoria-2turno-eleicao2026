// Cético, consolidação do achado "invariantes sem violação" (parecer 21). Confere o ponto em que as lentes divergiam
// sobre o log de RJ 60011/0008/0061 (1º turno): o bit 0x02 apagado só nos bytes de posição ímpar do logd.dat?
// Mede, nas linhas corrompidas e em todo o arquivo, quantos bytes têm o bit 0x02 ligado, separados pela paridade
// do deslocamento no arquivo.
// Uso: node scripts/auditoria/cetico-isv-consolidacao.mjs [--dir <diretório da seção>]
// Saída: data/parsed/auditoria/cetico/isv/consolidacao-rj-paridade.json
import { mkdir, open, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { values } = parseArgs({ options: {
  dir: { type: 'string', default: path.join(DIR_DADOS, 'raw', '1t', 'urnas', 'rj', '60011', '0008', '0061') },
} });
let base = values.dir;
const sub = (await readdir(base, { withFileTypes: true })).filter((d) => d.isDirectory());
if (sub.length) base = path.join(base, sub[0].name);
const nomeLog = (await readdir(base)).find((n) => n.endsWith('-log.jez'));
const h = await open(path.join(base, nomeLog));
let dat;
try {
  for (const e of await listarEntradas(h)) if (e.nome === 'logd.dat') dat = await lerEntrada(h, e);
} finally { await h.close(); }
if (!dat) throw new Error('logd.dat não encontrado no log.jez');

// Linhas do arquivo com o deslocamento inicial de cada uma (quebra = 0x0A).
const linhas = [];
let ini = 0;
for (let i = 0; i <= dat.length; i++) if (i === dat.length || dat[i] === 0x0a) { linhas.push([ini, i]); ini = i + 1; }
const formato = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}\t(INFO|ALERTA|ERRO)\t\d{8}\t[A-Z]{2,6}\t[^\t]*\t[0-9A-F]{16}\r?$/;
const conta = (a, b) => {
  const r = { par: { bytes: 0, bit02: 0 }, impar: { bytes: 0, bit02: 0 } };
  for (let p = a; p < b; p++) { const k = p % 2 ? 'impar' : 'par'; r[k].bytes++; if (dat[p] & 0x02) r[k].bit02++; }
  return r;
};
const estranhas = [];
linhas.forEach(([a, b], i) => {
  if (b <= a) return;
  const txt = dat.subarray(a, b).toString('latin1');
  if (!formato.test(txt)) estranhas.push({ linha: i + 1, inicio: a, fim: b, paridade: conta(a, b), texto: txt.slice(0, 160) });
});
const bem = { par: { bytes: 0, bit02: 0 }, impar: { bytes: 0, bit02: 0 } };
const marcadas = new Set(estranhas.map((e) => e.linha));
linhas.forEach(([a, b], i) => {
  if (marcadas.has(i + 1)) return;
  const r = conta(a, b);
  for (const k of ['par', 'impar']) { bem[k].bytes += r[k].bytes; bem[k].bit02 += r[k].bit02; }
});
// T2 (com biometria do BU > B do cadastro + TTE): separa a classe "por biometria" (digital) do total "com
// biometria" (digital + biografia), por turno e por UF, a partir do arquivo do autor (todas as violações).
const { readFile } = await import('node:fs/promises');
const viol = (await readFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'matematico', 'turnos-violacoes.jsonl'), 'utf8'))
  .split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.inv === 'T2');
const t2 = {};
for (const r of viol) {
  const i = r.turno - 1;
  const lim = r.cadastro[i].b + r.tte[i];
  const a = (t2[r.turno] ??= { secoes: 0, excesso: 0, soDigitalSecoes: 0, soDigitalExcesso: 0, porUf: {} });
  a.secoes++; a.excesso += r.comBio - lim;
  if (r.porBiometria > lim) { a.soDigitalSecoes++; a.soDigitalExcesso += r.porBiometria - lim; }
  const u = (a.porUf[r.uf] ??= { secoes: 0, excesso: 0 }); u.secoes++; u.excesso += r.comBio - lim;
}
console.log('T2 por turno:', JSON.stringify(Object.fromEntries(Object.entries(t2).map(([k, v]) => [k, { ...v, porUf: undefined }]))));
const saida = { diretorio: base, arquivo: nomeLog, bytesLogd: dat.length, linhas: linhas.length, estranhas: estranhas.length, linhasBemFormadas: bem, detalhe: estranhas, t2 };
const dirSaida = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'isv');
await mkdir(dirSaida, { recursive: true });
await writeFile(path.join(dirSaida, 'consolidacao-rj-paridade.json'), JSON.stringify(saida, null, 1));
console.log(`logd.dat ${dat.length} bytes, ${linhas.length} linhas, ${estranhas.length} fora do formato`);
console.log('bem formadas:', JSON.stringify(bem));
for (const e of estranhas) console.log(e.linha, e.inicio, JSON.stringify(e.paridade), e.texto.slice(0, 70));
