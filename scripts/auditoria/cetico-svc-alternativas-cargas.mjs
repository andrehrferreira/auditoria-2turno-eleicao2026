// Revisão cética do achado software-verificacao-caminhos, item 3 do foco (carga/troca no dia), universo completo.
// A carga (SCUE) abre um logd.dat novo e arquiva o anterior dentro do pacote; por isso "carga depois de votar" não aparece
// dentro de um mesmo arquivo. Este script usa a varredura do autor (<uf>.secoes.jsonl, todos os logd.dat de todos os
// pacotes) e o banco, e procura, por pacote:
//   (a) log ARQUIVADO (profundidade >= 1) da MESMA urna do BU com boot de votação no dia (Urna pronta ou voto computado em
//       25/10): a urna votou, o log foi arquivado (carga nova ou carga sobreposta) e ela seguiu como a urna do BU;
//   (b) log de OUTRA urna com voto computado no dia, separado pelo tipo de urna do BU: esperado em urna reserva
//       (contingência); numa seção com tipo_urna = 'secao' indicaria troca de urna com votos sem procedimento de contingência.
// Os boots só entram na varredura se alcançam 25/10 pelo relógio da urna (limite herdado do autor).
// Uso: node scripts/auditoria/cetico-svc-alternativas-cargas.mjs
// Saída: data/parsed/auditoria/cetico/svc-cargas-2t.json
import { createReadStream, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

const dir = path.join(DIR_DADOS, 'parsed', 'auditoria', 'engenheiro-seguranca-urna', '2t');
const { db, fonte } = await abrirLeitura();
console.error(`banco: ${fonte}`);
const banco = new Map(db.prepare('SELECT uf, municipio, zona, secao, numero_interno_urna n, tipo_urna t, tipo_arquivo a, comparecimento c FROM secao WHERE turno = 2')
  .all().map((r) => [`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, r]));

const r = { fonte, pacotes: 0, semBanco: 0, ufs: [], arquivadoMesmaUrnaVotouNoDia: [], outraUrnaVotouNoDiaPorTipo: {}, outraUrnaVotouNoDiaEmSecao: [] };
const votouNoDia = (l) => l.boots.some((b) => b.pronta || b.votos > 0);
const votosNoDia = (l) => l.boots.reduce((a, b) => a + b.votos, 0);
for (const arq of readdirSync(dir).filter((n) => n.endsWith('.secoes.jsonl')).sort()) {
  r.ufs.push(arq.slice(0, 2));
  const rl = readline.createInterface({ input: createReadStream(path.join(dir, arq)), crlfDelay: Infinity });
  for await (const linha of rl) {
    if (!linha) continue;
    const p = JSON.parse(linha);
    r.pacotes++;
    const id = `${p.uf}/${p.municipio}/${p.zona}/${p.secao}`;
    const b = banco.get(id);
    if (!b) { r.semBanco++; continue; }
    const urnaBu = String(b.n).padStart(8, '0');
    const outras = new Map();
    for (const l of p.logs) {
      const mesma = l.urnas.includes(urnaBu);
      if (mesma && l.profundidade >= 1 && votouNoDia(l)) {
        r.arquivadoMesmaUrnaVotouNoDia.push({ id, tipoUrna: b.t, tipoArquivo: b.a, profundidade: l.profundidade, votosNoDia: votosNoDia(l), boots: l.boots.filter((x) => x.pronta || x.votos > 0).map((x) => `${x.ligada}→${x.ultimaLinha} v${x.votos}`) });
      }
      if (!mesma && votosNoDia(l) > 0) outras.set(l.urnas.join(','), (outras.get(l.urnas.join(',')) ?? 0) + votosNoDia(l));
    }
    if (outras.size) {
      r.outraUrnaVotouNoDiaPorTipo[b.t] = (r.outraUrnaVotouNoDiaPorTipo[b.t] ?? 0) + 1;
      if (b.t === 'secao') r.outraUrnaVotouNoDiaEmSecao.push({ id, tipoArquivo: b.a, urnaBu, comparecimento: b.c, outras: Object.fromEntries(outras) });
    }
  }
}
const saida = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');
mkdirSync(saida, { recursive: true });
writeFileSync(path.join(saida, 'svc-cargas-2t.json'), JSON.stringify(r, null, 1));
console.log(`UFs ${r.ufs.length}; pacotes ${r.pacotes}; sem banco ${r.semBanco}`);
console.log(`(a) log arquivado da mesma urna do BU com votação no dia: ${r.arquivadoMesmaUrnaVotouNoDia.length}`);
for (const x of r.arquivadoMesmaUrnaVotouNoDia) console.log('  ', JSON.stringify(x));
console.log('(b) pacotes com log de outra urna que computou voto no dia, por tipo de urna do BU:', r.outraUrnaVotouNoDiaPorTipo);
for (const x of r.outraUrnaVotouNoDiaEmSecao) console.log('   secao:', JSON.stringify(x));
