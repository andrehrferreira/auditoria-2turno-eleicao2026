// A trava de encerramento da urna ("Encerramento só pode ser solicitado após as 17:00:00 horas") em municípios fora do
// fuso de Brasília. Para cada seção: hora (relógio da urna) da última recusa antes do encerramento e hora do
// encerramento aceito. Se o relógio fosse de Brasília, a trava das 17:00 impediria encerrar antes das 17:00 no relógio
// da urna. Uso: node scripts/trava-encerramento-fuso.mjs <uf> [limite de seções]
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../src/config.js';
import { lerLogs } from '../src/perfil-secoes.js';

const [uf = 'ac', limite = '100000'] = process.argv.slice(2);
async function* logs(dir) {
  for (const i of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, i.name);
    if (i.isDirectory()) yield* logs(p);
    else if (/-log\.jez$/.test(i.name)) yield p;
  }
}
const recusas = [];
const encerramentos = [];
const textosTrava = new Map();
let secoes = 0;
for await (const arq of logs(path.join(DIR_DADOS, 'raw', '2t', 'urnas', uf))) {
  if (secoes++ >= Number(limite)) break;
  const { texto } = await lerLogs(arq);
  let ultimaRecusa = null;
  for (const l of texto.split('\n')) {
    if (!l.startsWith('25/10/2026')) continue;
    const m = l.split('\t')[4] ?? '';
    if (/Encerramento só pode ser solicitado/.test(m)) {
      ultimaRecusa = l.slice(11, 19);
      textosTrava.set(m, (textosTrava.get(m) ?? 0) + 1);
    }
    if (/^Procedimento de encerramento confirmado/.test(m)) {
      encerramentos.push(l.slice(11, 19));
      if (ultimaRecusa) recusas.push([ultimaRecusa, l.slice(11, 19)]);
      break;
    }
  }
}
const ord = (v) => [...v].sort();
console.log(`${uf}: ${secoes} logs lidos`);
console.log('mensagens de trava (texto exato e quantas vezes):', JSON.stringify([...textosTrava]));
console.log(`seções com recusa antes do encerramento: ${recusas.length}`);
console.log('recusa mais tarde × encerramento aceito (relógio da urna):', ord(recusas.map((r) => r.join(' → '))).slice(-5).join(' | '));
console.log('encerramento aceito mais cedo (relógio da urna):', ord(encerramentos).slice(0, 3).join(', '));
