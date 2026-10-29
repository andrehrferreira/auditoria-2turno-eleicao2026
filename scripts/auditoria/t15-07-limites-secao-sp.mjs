// T15, tópico 07: conta os votos do log da seção SP 64777/0395/0298 (2º turno), a única do Brasil
// que ficou fora da contagem de votos depois das 17h (o leitor de perfil não abriu o diário).
// SP está no fuso de Brasília. Uso: node scripts/auditoria/t15-07-limites-secao-sp.mjs
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { lerLogJez, eventosLog } from '../../src/exportar.js';

const dir = 'data/raw/2t/urnas/sp/64777/0395/0298';
const sub = (await readdir(dir, { withFileTypes: true })).filter((d) => d.isDirectory());
const saida = [];
for (const d of sub) {
  const arq = path.join(dir, d.name, 'o03221sp6477703950298-log.jez');
  const { eventos, urnas } = eventosLog(await lerLogJez(arq), '25/10/2026');
  const votos = eventos.filter((e) => e.mensagem === 'O voto do eleitor foi computado');
  const hora = (e) => e.dataHora.slice(11);
  const r = {
    pacote: d.name.slice(0, 12), urnas, votos: votos.length,
    apos17h: votos.filter((e) => hora(e) >= '17:00:00').length,
    apos18h: votos.filter((e) => hora(e) >= '18:00:00').length,
    intervaloMinimoS: Math.min(...votos.slice(1).map((e, i) => (Date.parse(e.dataHora.replace(' ', 'T')) - Date.parse(votos[i].dataHora.replace(' ', 'T'))) / 1000)),
    primeiro: votos[0] && hora(votos[0]), ultimo: votos.at(-1) && hora(votos.at(-1)),
  };
  saida.push(r);
}
console.log(JSON.stringify(saida, null, 1));
await writeFile('data/parsed/auditoria/t15/07-limites-secao-sp.json', JSON.stringify(saida, null, 1));
