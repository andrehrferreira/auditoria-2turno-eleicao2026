// Revisor cético, parecer 25: confere os votos que cetico-vsr25-universo.mjs atribuiu a seção "indefinida".
// O universo só lê as linhas do dia. Quando a urna foi ligada na véspera e não religou no dia, a linha
// "Seção Eleitoral: NNNN" é da véspera, e os votos do dia ficam sem seção declarada (contados como da própria seção).
// Este script relê esses pacotes (lista tirada de data/parsed/auditoria/cetico/vsr25/<t>t/<uf>.jsonl) e acompanha a
// seção declarada no log INTEIRO, por urna e por arquivo. Responde: algum voto "indefinido" é de outra seção?
// Uso: node scripts/auditoria/cetico-vsr25-indefinida.mjs --turno 1
import { open, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const DIA = { 1: '04/10/2026', 2: '25/10/2026' };
const { values } = parseArgs({ options: { turno: { type: 'string', default: '1' } } });
const turno = Number(values.turno);
const dir = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'vsr25', `${turno}t`);
const { db } = await abrirLeitura();
const memoria = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
async function textos(h, prof = 0, out = []) {
  for (const e of await listarEntradas(h)) {
    const d = await lerEntrada(h, e);
    if (e.nome === 'logd.dat') out.push(d.toString('latin1'));
    else if (e.nome.endsWith('.jez') && prof < 3) await textos(memoria(d), prof + 1, out);
  }
  return out;
}
const total = { pacotes: 0, votosIndefinidos: 0, resolvidos: {}, aindaSemSecao: 0, casos: [] };
for (const arq of (await readdir(dir)).filter((n) => /^[a-z]{2}\.jsonl$/.test(n)).sort()) {
  for (const l of (await readFile(path.join(dir, arq), 'utf8')).split('\n').filter(Boolean)) {
    const p = JSON.parse(l);
    if (!p.indefinida) continue;
    total.pacotes++;
    total.votosIndefinidos += p.indefinida;
    const { hash } = db.prepare('select hash from secao where turno=? and uf=? and municipio=? and zona=? and secao=?').get(turno, p.uf, p.municipio, p.zona, p.secao);
    const d = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', p.uf, p.municipio, p.zona, p.secao, hash);
    const h = await open(path.join(d, (await readdir(d)).find((n) => n.endsWith('-log.jez'))));
    const lista = await textos(h);
    await h.close();
    const vistos = new Set();
    const porSecao = {};
    for (const texto of lista) {
      const secao = new Map(); // urna → última seção declarada (≠ 0000), em qualquer data, até a linha atual
      const declaradaNoDia = new Set();
      for (const bruta of texto.split('\n')) {
        const linha = bruta.replace(/\r$/, '');
        const c = linha.split('\t');
        const m = c[4] ?? '';
        if (m.startsWith('Seção Eleitoral: ')) {
          const s = m.slice(17).trim();
          if (s !== '0000') secao.set(c[2], s);
          if (linha.startsWith(DIA[turno])) declaradaNoDia.add(c[2]);
        }
        // Só os votos que o universo pôs em "indefinida": urna sem declaração no próprio dia, neste arquivo
        if (m === 'O voto do eleitor foi computado' && linha.startsWith(DIA[turno]) && !declaradaNoDia.has(c[2]) && !vistos.has(linha)) {
          vistos.add(linha);
          const s = secao.get(c[2]) ?? 'sem declaração';
          porSecao[s] = (porSecao[s] ?? 0) + 1;
        }
      }
    }
    for (const [s, n] of Object.entries(porSecao)) {
      const k = s === p.secao ? 'propria' : s === 'sem declaração' ? 'semDeclaracao' : 'outra';
      total.resolvidos[k] = (total.resolvidos[k] ?? 0) + n;
    }
    if (Object.keys(porSecao).some((s) => s !== p.secao)) total.casos.push({ secao: `${p.uf}/${p.municipio}/${p.zona}/${p.secao}`, indefinida: p.indefinida, porSecao });
  }
}
console.log(`${turno}º turno: ${total.pacotes} pacotes com votos sem "Seção Eleitoral" no dia (${total.votosIndefinidos} votos).`);
console.log(`  Pela última declaração no log inteiro: ${JSON.stringify(total.resolvidos)}`);
for (const c of total.casos) console.log(`  ${c.secao}: ${c.indefinida} indefinidos → ${JSON.stringify(c.porSecao)}`);
