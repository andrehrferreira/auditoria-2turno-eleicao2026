// Revisor cético, "votos sem rastro no log": procura, em TODOS os pacotes de uma zona (todos os municípios dela, os
// dois turnos), qualquer log (inclusive .jez aninhados) com linhas de uma urna, de um serial de MV, de um código de
// carga ou de uma seção declarada. Serve para saber se o log da urna que gravou os votos sem rastro foi publicado
// em OUTRO pacote.
// Uso: node scripts/auditoria/cetico-vsr-busca-zona.mjs --uf ba --zona 0183 --rotulo ba0175 --padrao "02424441" --padrao "008B59DC" ...
import { open, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { values } = parseArgs({ options: { uf: { type: 'string' }, zona: { type: 'string' }, padrao: { type: 'string', multiple: true }, rotulo: { type: 'string' }, turno: { type: 'string', multiple: true } } });
const turnos = values.turno ?? ['1', '2'];
const padroes = values.padrao.map((p) => new RegExp(p));
const mem = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
async function logds(handle, nome, out, prof = 0) {
  for (const e of await listarEntradas(handle)) {
    if (e.nome === 'logd.dat') out.push({ nome: `${nome}/logd.dat`, texto: (await lerEntrada(handle, e)).toString('latin1') });
    else if (e.nome.endsWith('.jez') && prof < 4) await logds(mem(await lerEntrada(handle, e)), `${nome}/${e.nome}`, out, prof + 1);
  }
  return out;
}
const ls = async (d) => { try { return (await readdir(d, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name); } catch { return []; } };
const res = { uf: values.uf, zona: values.zona, padroes: values.padrao, pacotesLidos: {}, achados: [] };
for (const t of turnos) {
  res.pacotesLidos[t] = 0;
  const base = path.join(DIR_DADOS, 'raw', `${t}t`, 'urnas', values.uf);
  for (const mun of await ls(base)) {
    for (const sec of await ls(path.join(base, mun, values.zona))) {
      for (const hash of await ls(path.join(base, mun, values.zona, sec))) {
        const dir = path.join(base, mun, values.zona, sec, hash);
        const nomeLog = (await readdir(dir)).find((n) => n.endsWith('-log.jez'));
        if (!nomeLog) continue;
        res.pacotesLidos[t]++;
        const h = await open(path.join(dir, nomeLog));
        try {
          for (const l of await logds(h, nomeLog, [])) {
            const porPadrao = {};
            for (const linha of l.texto.split('\n')) {
              padroes.forEach((p, i) => {
                if (!p.test(linha)) return;
                const k = values.padrao[i];
                porPadrao[k] ??= { n: 0, urnas: new Set(), primeira: linha.trim().slice(0, 180), ultima: null };
                porPadrao[k].n++;
                porPadrao[k].urnas.add(linha.split('\t')[2]);
                porPadrao[k].ultima = linha.trim().slice(0, 180);
              });
            }
            for (const [k, v] of Object.entries(porPadrao)) res.achados.push({ turno: t, pacote: `${mun}/${values.zona}/${sec}`, log: l.nome, padrao: k, linhas: v.n, urnas: [...v.urnas], primeira: v.primeira, ultima: v.ultima });
          }
        } finally { await h.close(); }
      }
    }
  }
}
const arq = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', `cetico-vsr-busca-zona-${values.rotulo ?? `${values.uf}${values.zona}`}.json`);
await writeFile(arq, `${JSON.stringify(res, null, 1)}\n`);
console.log('pacotes lidos', JSON.stringify(res.pacotesLidos));
for (const a of res.achados) console.log(a.turno, a.pacote, a.log, '|', a.padrao, a.linhas, a.urnas.join(','), '|', a.primeira, '|', a.ultima);
console.log(`gravado ${arq}`);
