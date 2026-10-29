// Revisor cético, achado "votos-sem-log-contingencia": procura o log de uma urna em TODOS os pacotes de uma zona
// (log.jez da raiz e .jez aninhados), nos dois turnos. Responde: o log da urna que falta existe em outro pacote?
// Uso: node scripts/auditoria/cetico-vsl-busca-urna.mjs --uf ba --zona 0173 --urna 01681986 --urna 01833178 [--turno 2 --turno 1]
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { open } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { values: args } = parseArgs({ options: { uf: { type: 'string' }, zona: { type: 'string' }, urna: { type: 'string', multiple: true }, turno: { type: 'string', multiple: true } } });
const turnos = (args.turno ?? ['2', '1']).map(Number);
const alvos = args.urna;
const mem = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
async function logs(h, nome, out = []) {
  for (const e of await listarEntradas(h)) {
    const d = await lerEntrada(h, e);
    if (e.nome === 'logd.dat') out.push({ nome, texto: d.toString('latin1') });
    else if (e.nome.endsWith('.jez')) await logs(mem(d), `${nome}/${e.nome}`, out);
  }
  return out;
}
const achados = []; let pacotes = 0;
for (const turno of turnos) {
  const raizUf = `data/raw/${turno}t/urnas/${args.uf}`;
  if (!existsSync(raizUf)) continue;
  for (const mun of readdirSync(raizUf)) {
    const raizZona = `${raizUf}/${mun}/${args.zona}`;
    if (!existsSync(raizZona)) continue;
    for (const sec of readdirSync(raizZona)) {
      for (const hash of readdirSync(`${raizZona}/${sec}`, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
        const dir = `${raizZona}/${sec}/${hash}`;
        const jez = readdirSync(dir).find((n) => n.endsWith('-log.jez') || n.endsWith('-logsa.jez'));
        if (!jez) continue;
        pacotes++;
        const h = await open(`${dir}/${jez}`);
        let ls; try { ls = await logs(h, jez); } catch (e) { console.error(`${dir}: ${e.message}`); continue; } finally { await h.close(); }
        for (const l of ls) {
          for (const u of alvos) {
            const nomeTem = l.nome.includes(u);
            if (!nomeTem && !l.texto.includes(`\t${u}\t`)) continue;
            const linhas = l.texto.split('\n').filter((x) => x.split('\t')[2] === u);
            const dias = [...new Set(linhas.map((x) => x.slice(0, 10)))];
            const votosPorDia = {};
            for (const x of linhas) if (x.includes('O voto do eleitor foi computado')) votosPorDia[x.slice(0, 10)] = (votosPorDia[x.slice(0, 10)] ?? 0) + 1;
            const secoes = [...new Set(linhas.filter((x) => /\tSeção (Eleitoral|informada pelo operador): /.test(x)).map((x) => `${x.slice(0, 10)}:${x.split(': ')[1].trim()}`))];
            achados.push({ turno, pacote: `${mun}/${args.zona}/${sec}`, log: l.nome, urna: u, nomeDoArquivoTemUrna: nomeTem, linhas: linhas.length, dias, votosPorDia, secoesDeclaradas: secoes });
          }
        }
      }
    }
  }
}
for (const a of achados) console.log(`${a.turno}t ${a.pacote} ${a.log} urna ${a.urna}: ${a.linhas} linhas, dias ${a.dias.join(',')}, votos ${JSON.stringify(a.votosPorDia)}, seções ${a.secoesDeclaradas.join(',')}`);
console.log(`\n${pacotes} pacotes lidos (${args.uf} zona ${args.zona}, turnos ${turnos}); ${achados.length} ocorrências`);
mkdirSync('data/parsed/auditoria/cetico', { recursive: true });
writeFileSync(`data/parsed/auditoria/cetico/cetico-vsl-busca-urna-${args.uf}-${args.zona}.json`, JSON.stringify({ alvos, turnos, pacotes, achados }, null, 1));
