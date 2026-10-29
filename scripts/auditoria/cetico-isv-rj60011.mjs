// Cético, achado "invariantes sem violação", item (e): log com bits trocados em RJ 60011/0008/0061 (1º turno).
// Lê o log.jez bruto (CRC-32 de cada entrada conferido por src/zip.js), lista as entradas, e no logd.dat do dia
// procura linhas fora do formato: hash de encadeamento (última coluna) que não é [0-9A-F]{16}, nível fora do
// catálogo, ou mensagem a 1 caractere de uma mensagem conhecida; para cada caractere trocado, o XOR com o esperado.
// Uso: node scripts/auditoria/cetico-isv-rj60011.mjs
import { open } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const DIR = path.join(DIR_DADOS, 'raw', '1t', 'urnas', 'rj', '60011', '0008', '0061');
const { readdir } = await import('node:fs/promises');
const [hash] = (await readdir(DIR)).filter((n) => !n.endsWith('.json'));
const arq = path.join(DIR, hash, 'o03220rj6001100080061-log.jez');
const DIA = '04/10/2026';

async function textos(handle, rotulo, prof = 0) {
  const saida = [];
  for (const e of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, e); // lança erro se o CRC-32 não confere
    console.log(`${'  '.repeat(prof)}entrada ${rotulo}/${e.nome}: ${dados.length} bytes, CRC-32 ok`);
    if (e.nome === 'logd.dat') saida.push({ nome: `${rotulo}/${e.nome}`, texto: dados.toString('latin1') });
    else if (e.nome.endsWith('.jez') && prof < 3) {
      const h = { read: async (d, o, t, p) => ({ bytesRead: dados.copy(d, o, p, p + t) }), stat: async () => ({ size: dados.length }) };
      saida.push(...(await textos(h, `${rotulo}/${e.nome}`, prof + 1)));
    }
  }
  return saida;
}

const handle = await open(arq);
const logs = await textos(handle, path.basename(arq));
await handle.close();

const NIVEIS = new Set(['INFO', 'ALERTA', 'ERRO', 'EXTERNO']);
for (const { nome, texto } of logs) {
  const linhas = texto.split('\n').map((l) => l.replace(/\r$/, ''));
  const doDia = linhas.filter((l) => l.startsWith(DIA));
  const contagem = new Map();
  for (const l of doDia) {
    const m = l.split('\t')[4] ?? '';
    contagem.set(m, (contagem.get(m) ?? 0) + 1);
  }
  const conhecidas = [...contagem].filter(([, n]) => n >= 5).map(([m]) => m);
  const urnas = new Map();
  for (const l of doDia) urnas.set(l.split('\t')[2], (urnas.get(l.split('\t')[2]) ?? 0) + 1);
  console.log(`\n${nome}: ${linhas.length} linhas, ${doDia.length} do dia ${DIA}; urnas na coluna 3: ${JSON.stringify(Object.fromEntries(urnas))}`);
  doDia.forEach((l) => {
    const c = l.split('\t');
    const motivos = [];
    if (!/^[0-9A-F]{16}$/.test(c.at(-1) ?? '')) motivos.push(`hash fora de [0-9A-F]{16}: ${c.at(-1)}`);
    if (!NIVEIS.has(c[1])) motivos.push(`nível ${c[1]}`);
    const m = c[4] ?? '';
    if (!contagem.has(m) || contagem.get(m) < 5) {
      const viz = conhecidas.find((k) => k.length === m.length && [...k].filter((ch, i) => ch !== m[i]).length <= 3);
      if (viz) {
        const trocas = [...viz].map((ch, i) => (ch !== m[i] ? `'${ch}'(0x${ch.charCodeAt(0).toString(16)})→'${m[i]}'(0x${m.charCodeAt(i).toString(16)}) xor 0x${(ch.charCodeAt(0) ^ m.charCodeAt(i)).toString(16)}` : null)).filter(Boolean);
        motivos.push(`mensagem a ${trocas.length} caractere(s) de "${viz}": ${trocas.join(', ')}`);
      } else if (contagem.get(m) === 1 && !/^(Urna|Iniciando|Seção|Zona|Município|Local|Turno|Modelo|Serial|Versão|Identificação|Tempo|Total|Data|Hora|Gerando|Gravando|Fim|Aguardando|Inicio)/.test(m)) {
        motivos.push(`mensagem única: "${m}"`);
      }
    }
    if (motivos.length && motivos.some((x) => !x.startsWith('mensagem única'))) console.log(`  ${JSON.stringify(c.slice(0, 4).join(' | '))} ${JSON.stringify(m)}\n    → ${motivos.join(' ; ')}`);
  });
}
