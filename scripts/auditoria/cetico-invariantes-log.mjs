// Cético, achado "invariantes sem violação" (matemático forense), item (e): log com bits trocados em
// RJ 60011/0008/0061, 1º turno. Extrai os logd.dat do log.jez (cada .jez aninhado também), lista as linhas fora do
// formato (nível/urna/aplicação raros, hash fora de [0-9A-F]{16}, mensagem única com caractere estranho) e mede,
// byte a byte, a distância de Hamming de cada linha estranha para a linha bem-formada mais parecida do mesmo log.
// Uso: node scripts/auditoria/cetico-invariantes-log.mjs [--dir <diretório da seção>]
// Saída: data/parsed/auditoria/cetico/invariantes/log-rj-60011-0008-0061.json
import { mkdir, open, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { values } = parseArgs({ options: {
  dir: { type: 'string', default: path.join(DIR_DADOS, 'raw', '1t', 'urnas', 'rj', '60011', '0008', '0061') },
} });
const memoria = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
async function logs(handle, nome, prof = 0) {
  const out = [];
  for (const e of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, e);
    if (e.nome === 'logd.dat') out.push({ origem: `${nome}/${e.nome}`, bytes: dados });
    else if (e.nome.endsWith('.jez') && prof < 3) out.push(...(await logs(memoria(dados), `${nome}/${e.nome}`, prof + 1)));
  }
  return out;
}
const popcount = (x) => { let n = 0; while (x) { n += x & 1; x >>= 1; } return n; };

let base = values.dir;
const sub = (await readdir(base, { withFileTypes: true })).filter((d) => d.isDirectory());
if (sub.length) base = path.join(base, sub[0].name);
const nomeLog = (await readdir(base)).find((n) => n.endsWith('-log.jez'));
const h = await open(path.join(base, nomeLog));
const resultado = { diretorio: base, arquivo: nomeLog, logs: [] };
try {
  for (const { origem, bytes } of await logs(h, nomeLog)) {
    const linhas = bytes.toString('latin1').split('\n').map((l) => l.replace(/\r$/, ''));
    const campos = (l) => l.split('\t');
    const cont = new Map();
    for (const l of linhas) {
      const c = campos(l);
      if (c.length < 6) continue;
      for (const [k, v] of [['nivel', c[1]], ['urna', c[2]], ['app', c[3]], ['msg', c[4]]]) cont.set(`${k}|${v}`, (cont.get(`${k}|${v}`) ?? 0) + 1);
    }
    const urnas = [...cont.keys()].filter((k) => k.startsWith('urna|')).map((k) => [k.slice(5), cont.get(k)]);
    const estranhas = [];
    linhas.forEach((l, i) => {
      if (!l) return;
      const c = campos(l);
      const motivos = [];
      if (c.length !== 6) motivos.push(`colunas=${c.length}`);
      if (!/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/.test(c[0] ?? '')) motivos.push('dataHora');
      if (!['INFO', 'ALERTA', 'ERRO'].includes(c[1])) motivos.push(`nivel=${c[1]}`);
      if (c[5] !== undefined && !/^[0-9A-F]{16}$/.test(c[5])) motivos.push(`hash=${c[5]}`);
      if ((cont.get(`urna|${c[2]}`) ?? 0) <= 2) motivos.push(`urna=${c[2]}`);
      if ((cont.get(`app|${c[3]}`) ?? 0) <= 2) motivos.push(`app=${c[3]}`);
      if ((cont.get(`msg|${c[4]}`) ?? 0) === 1 && /[`@]|[^\x20-\x7e\xa0-\xff]/.test(c[4] ?? '')) motivos.push('msgUnicaComCaractereEstranho');
      if (motivos.length) estranhas.push({ linha: i + 1, motivos, texto: l });
    });
    const textosEstranhos = new Set(estranhas.map((e) => e.texto));
    const bem = linhas.filter((l) => l && !textosEstranhos.has(l));
    for (const e of estranhas) {
      const a = Buffer.from(e.texto, 'latin1');
      let melhor = null;
      for (const l of bem) {
        const b = Buffer.from(l, 'latin1');
        if (b.length !== a.length) continue;
        let bits = 0;
        for (let k = 20; k < a.length - 17; k++) bits += popcount(a[k] ^ b[k]); // sem data/hora e sem TAB+hash
        if (!melhor || bits < melhor.bits) melhor = { bits, texto: l };
      }
      if (melhor) {
        const b = Buffer.from(melhor.texto, 'latin1');
        const difs = [];
        for (let k = 20; k < a.length - 17; k++) {
          if (a[k] !== b[k]) difs.push({ pos: k, era: `${String.fromCharCode(b[k])} 0x${b[k].toString(16)}`, ficou: `${String.fromCharCode(a[k])} 0x${a[k].toString(16)}`, xor: `0x${(a[k] ^ b[k]).toString(16)}`, bits: popcount(a[k] ^ b[k]) });
        }
        e.maisParecida = { bitsDiferentes: melhor.bits, texto: melhor.texto, bytes: difs };
      }
      const hs = campos(e.texto)[5];
      if (hs && !/^[0-9A-F]{16}$/.test(hs)) {
        e.hashForaHex = [...hs].map((ch, i) => (/[0-9A-F]/.test(ch) ? null : {
          pos: i, ch, hexA1Bit: [...'0123456789ABCDEF'].filter((x) => popcount(x.charCodeAt(0) ^ ch.charCodeAt(0)) === 1),
        })).filter(Boolean);
      }
    }
    resultado.logs.push({ origem, bytes: bytes.length, linhas: linhas.length, urnas, estranhas });
  }
} finally {
  await h.close();
}
const destino = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'invariantes');
await mkdir(destino, { recursive: true });
await writeFile(path.join(destino, 'log-rj-60011-0008-0061.json'), `${JSON.stringify(resultado, null, 1)}\n`);
for (const l of resultado.logs) {
  console.log(`${l.origem}: ${l.linhas} linhas, urnas ${JSON.stringify(l.urnas)}, ${l.estranhas.length} linha(s) estranha(s)`);
  for (const e of l.estranhas) {
    console.log(`  #${e.linha} [${e.motivos.join(', ')}] ${JSON.stringify(e.texto)}`);
    if (e.maisParecida) console.log(`     ~ ${e.maisParecida.bitsDiferentes} bit(s) de ${JSON.stringify(e.maisParecida.texto)}\n       ${JSON.stringify(e.maisParecida.bytes)}`);
    if (e.hashForaHex) console.log(`     hash fora de hex: ${JSON.stringify(e.hashForaHex)}`);
  }
}
