// Engenheiro de segurança, H20 item 2 (docs/analysis/engenheiro-seguranca-urna/11): tenta reproduzir o "hash de
// encadeamento" de 16 hexadecimais da última coluna do logd.dat a partir das linhas públicas. Se algum algoritmo
// padrão, sobre alguma combinação simples de (hash anterior, linha), desse o hash gravado, a ordem física do diário
// poderia ser conferida linha a linha contra a cadeia. Resultado esperado de um sistema com segredo: nenhuma combinação.
// Testa: todos os resumos do OpenSSL do Node (SHA-1/2/3, MD5, BLAKE2, RIPEMD, SM3 ...), codificação latin1 e utf8,
// 20 combinações de concatenação (com e sem separador, hash anterior em texto ou em bytes, linha anterior inteira,
// fim de linha), resumo inteiro ou invertido, procurando o valor gravado em qualquer posição do resumo.
// Uso: node scripts/auditoria/seguranca-h20-hash-linha.mjs --turno 2 --secao ac/01007/0009/0001 [--linhas 6]
import { createHash, getHashes } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, secao: { type: 'string', default: 'ac/01007/0009/0001' }, linhas: { type: 'string', default: '6' } } });
const dirSecao = path.join(DIR_DADOS, 'raw', `${values.turno}t`, 'urnas', ...values.secao.split('/'));
const hp = (await readdir(dirSecao, { withFileTypes: true })).find((e) => e.isDirectory()).name;
const nomes = await readdir(path.join(dirSecao, hp));
const buf = await readFile(path.join(dirSecao, hp, acharArquivo(nomes, 'log')));
const memoria = (b) => ({ read: async (d, o, n, p) => ({ bytesRead: b.copy(d, o, p, p + n) }), stat: async () => ({ size: b.length }) });
const h = memoria(buf);
const ent = (await listarEntradas(h)).find((e) => e.nome === 'logd.dat');
const L = (await lerEntrada(h, ent)).toString('latin1').split('\n').slice(0, Number(values.linhas)).map((l) => l.replace(/\r$/, ''));
const algs = getHashes().filter((a) => !/rsa|with|ssl3|shake/i.test(a));
const partes = L.map((l) => { const i = l.lastIndexOf('\t'); return { linha: l, corpo: l.slice(0, i), hash: l.slice(i + 1) }; });
let tentativas = 0, achados = 0;
const testa = (rotulo, k, dados) => {
  for (const a of algs) {
    for (const enc of ['latin1', 'utf8']) {
      const d = typeof dados === 'string' ? Buffer.from(dados, enc) : dados;
      let dig;
      try { dig = createHash(a).update(d).digest(); } catch { continue; }
      tentativas++;
      const alvo = partes[k].hash;
      for (const hx of [dig.toString('hex').toUpperCase(), Buffer.from(dig).reverse().toString('hex').toUpperCase()]) {
        if (hx.includes(alvo)) { achados++; console.log(`ACHOU linha ${k}: ${a} ${enc} ${rotulo}`); }
      }
      if (typeof dados !== 'string') break;
    }
  }
};
for (let k = 0; k < partes.length; k++) {
  const { corpo } = partes[k];
  testa('corpo', k, corpo);
  testa('corpo+\\t', k, `${corpo}\t`);
  testa('corpo+\\n', k, `${corpo}\n`);
  if (k === 0) continue;
  const ant = partes[k - 1];
  const variantes = {
    'ant+corpo': ant.hash + corpo, 'corpo+ant': corpo + ant.hash, 'ant\\tcorpo': `${ant.hash}\t${corpo}`, 'corpo\\tant': `${corpo}\t${ant.hash}`,
    'ant+corpo\\n': `${ant.hash}${corpo}\n`, 'ant(min)+corpo': ant.hash.toLowerCase() + corpo, 'corpo\\tant(min)': `${corpo}\t${ant.hash.toLowerCase()}`,
    'linhaAnt\\ncorpo': `${ant.linha}\n${corpo}`, 'linhaAnt+corpo': ant.linha + corpo, 'linhaAnt\\tcorpo': `${ant.linha}\t${corpo}`,
    'linhaAnt\\ncorpo\\t': `${ant.linha}\n${corpo}\t`, 'corpo\\tant\\n': `${corpo}\t${ant.hash}\n`, 'corpo\\nant': `${corpo}\n${ant.hash}`,
    'ant\\ncorpo\\n': `${ant.hash}\n${corpo}\n`,
  };
  for (const [r, v] of Object.entries(variantes)) testa(r, k, v);
  const antBin = Buffer.from(ant.hash, 'hex');
  testa('antBin+corpo', k, Buffer.concat([antBin, Buffer.from(corpo, 'latin1')]));
  testa('corpo+antBin', k, Buffer.concat([Buffer.from(corpo, 'latin1'), antBin]));
  testa('corpo\\t+antBin', k, Buffer.concat([Buffer.from(`${corpo}\t`, 'latin1'), antBin]));
}
console.log(JSON.stringify({ secao: values.secao, turno: values.turno, linhas: partes.length, algoritmos: algs.length, tentativas, achados }));
