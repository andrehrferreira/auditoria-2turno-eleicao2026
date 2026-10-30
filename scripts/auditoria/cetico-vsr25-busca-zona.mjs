// Revisor cético, parecer 25: procura, em TODOS os pacotes de uma zona (log.jez da raiz e .jez aninhados), nos turnos
// pedidos, linhas de log que casam com uma expressão (ex.: o serial de uma MV ou o número de uma urna cujo log falta).
// Responde: o log que falta numa seção existe no pacote de outra seção? Caminhos montados como os do banco
// (data/raw/<t>t/urnas/<uf>/<municipio>/<zona>/<secao>/<hash>/), sem varrer outras pastas. Somente leitura.
// Uso: node scripts/auditoria/cetico-vsr25-busca-zona.mjs --uf sp --zona 0002 --turno 1 --padrao "9F62BC72|7FBB29C7" [--dia 04/10/2026]
import { existsSync, readdirSync } from 'node:fs';
import { open } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { values: a } = parseArgs({ options: { uf: { type: 'string' }, zona: { type: 'string' }, turno: { type: 'string', multiple: true }, padrao: { type: 'string' }, dia: { type: 'string' }, max: { type: 'string', default: '8' } } });
const re = new RegExp(a.padrao);
const mem = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
async function logs(h, nome, out = []) {
  for (const e of await listarEntradas(h)) {
    const d = await lerEntrada(h, e);
    if (e.nome === 'logd.dat') out.push({ nome, texto: d.toString('latin1') });
    else if (e.nome.endsWith('.jez')) await logs(mem(d), `${nome}/${e.nome}`, out);
  }
  return out;
}
let pacotes = 0;
for (const turno of (a.turno ?? ['1', '2'])) {
  const raizUf = `data/raw/${turno}t/urnas/${a.uf}`;
  if (!existsSync(raizUf)) continue;
  for (const mun of readdirSync(raizUf)) {
    const raizZona = `${raizUf}/${mun}/${a.zona}`;
    if (!existsSync(raizZona)) continue;
    for (const sec of readdirSync(raizZona)) {
      for (const hash of readdirSync(`${raizZona}/${sec}`, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
        const dir = `${raizZona}/${sec}/${hash}`;
        const jez = readdirSync(dir).find((n) => n.endsWith('log.jez'));
        if (!jez) continue;
        pacotes++;
        const h = await open(`${dir}/${jez}`);
        const lista = await logs(h, 'log.jez');
        await h.close();
        for (const l of lista) {
          const hits = l.texto.split('\n').filter((x) => (!a.dia || x.startsWith(a.dia)) && re.test(x));
          if (!hits.length) continue;
          console.log(`${turno}t ${a.uf}/${mun}/${a.zona}/${sec} [${l.nome}] ${hits.length} linha(s)`);
          for (const x of hits.slice(0, Number(a.max))) console.log(`   ${x.replace(/\r$/, '').split('\t').slice(0, 5).join(' ')}`);
        }
      }
    }
  }
}
console.log(`pacotes lidos: ${pacotes}`);
