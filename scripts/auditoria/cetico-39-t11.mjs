// Cético, parecer 39: reprodução independente da decomposição dos 383 votos do tópico 11.
// Não usa a varredura do engenheiro nem biometria-por-urna.json para contar votos: lê o log.jez bruto de cada uma das
// 2.818 trocas novas (pacote do BU, mesma pasta de hash do banco), abre todos os logd.dat aninhados e conta as linhas
// "O voto do eleitor foi computado" de 25/10/2026, por urna, de dois jeitos:
//   - por cópia: soma de todos os logd.dat (o que a contagem por urna do tópico fazia);
//   - distintas: a linha inteira (data/hora, nível, urna, aplicação, mensagem, hash encadeado) como chave; a mesma linha
//     em dois logd.dat é o mesmo voto.
// De biometria-por-urna.json usa só a lista das 2.818 seções e o grupo (h14Antes/h14Dia/h14SemRegistro), para comparar.
// Uso: node scripts/auditoria/cetico-39-t11.mjs → data/parsed/auditoria/cetico-revisor/39-t11.json
import { open, readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS, caminhos, dirSecao } from '../../src/config.js';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { acharArquivo } from '../../src/lacres.js';
import { textosDeLog } from './seguranca-varrer-logs.mjs';

const DIA = '25/10/2026';
const MSG = 'O voto do eleitor foi computado';
const A = path.join(DIR_DADOS, 'parsed', 'auditoria');
const bpu = JSON.parse(await readFile(path.join(A, 'reservas-rastro', 'biometria-por-urna.json'), 'utf8'));
const { db, fonte } = await abrirLeitura();
const q = db.prepare('SELECT comparecimento c, numero_interno_urna u, hash h FROM secao WHERE turno = 2 AND uf = ? AND municipio = ? AND zona = ? AND secao = ?');
const dirUrnas = caminhos(2).urnas;

const grupos = {};
const casos = [];
let lidos = 0;
const foraDeOrdem = [];
for (const s of bpu.secoes) {
  const [uf, municipio, zona, secao] = s.k.split('/');
  const bu = q.get(uf, municipio, zona, secao);
  bu.u = String(bu.u).padStart(8, '0'); // no banco o número interno é inteiro (zeros à esquerda caem)
  const dir = path.join(dirSecao(dirUrnas, { uf, municipio, zona, secao }), bu.h);
  const nLog = acharArquivo(await readdir(dir), 'log');
  const handle = await open(path.join(dir, nLog), 'r');
  let textos;
  try { textos = await textosDeLog(handle); } finally { await handle.close(); }
  lidos++;
  const porCopia = new Map(); // urna → votos somando cópias
  const distintas = new Map(); // urna → Set(linha)
  const urnasPorLog = [];
  for (const t of textos) {
    const urnasDia = {};
    for (const linha of t.texto.split(/\r?\n/)) {
      if (!linha.startsWith(DIA)) continue;
      const c = linha.split('\t');
      if (c[4] !== MSG) continue;
      porCopia.set(c[2], (porCopia.get(c[2]) ?? 0) + 1);
      (distintas.get(c[2]) ?? distintas.set(c[2], new Set()).get(c[2])).add(linha);
      urnasDia[c[2]] = (urnasDia[c[2]] ?? 0) + 1;
    }
    urnasPorLog.push({ prof: t.profundidade, nome: t.nome, votosDia: urnasDia });
  }
  let resCopia = 0, outCopia = 0, resDist = 0, outDist = 0;
  for (const [u, n] of porCopia) { if (u === bu.u) resCopia += n; else outCopia += n; }
  for (const [u, set] of distintas) { if (u === bu.u) resDist += set.size; else outDist += set.size; }
  // Ordem no tempo: todo voto de urna anterior deve vir antes do primeiro voto da urna do BU (hh:mm:ss do dia 25/10).
  const horas = (u, fora) => [...distintas].filter(([x]) => (x === u) !== fora).flatMap(([, set]) => [...set].map((l) => l.slice(11, 19)));
  const hRes = horas(bu.u, false); const hOut = horas(bu.u, true);
  if (hRes.length && hOut.length && hOut.reduce((a, b) => (b > a ? b : a)) > hRes.reduce((a, b) => (b < a ? b : a))) foraDeOrdem.push({ k: s.k, grupo: s.grupo });
  const g = (grupos[s.grupo] ??= { secoes: 0, bu: 0, reservaCopia: 0, outrasCopia: 0, reservaDist: 0, outrasDist: 0, secoesOutrasDist: 0, difBpuReserva: 0, difBpuOutras: 0 });
  g.secoes++; g.bu += bu.c; g.reservaCopia += resCopia; g.outrasCopia += outCopia; g.reservaDist += resDist; g.outrasDist += outDist;
  if (outDist > 0) g.secoesOutrasDist++;
  if (resCopia !== s.reserva.votos) g.difBpuReserva++;
  if (outCopia !== s.outras.votos) g.difBpuOutras++;
  const distTotal = resDist + outDist;
  if (resCopia + outCopia !== resDist + outDist || distTotal !== bu.c || s.grupo === 'h14SemRegistro' || resCopia !== s.reserva.votos || outCopia !== s.outras.votos) {
    casos.push({ k: s.k, grupo: s.grupo, bu: bu.c, urnaBu: bu.u, reservaCopia: resCopia, outrasCopia: outCopia, reservaDist: resDist, outrasDist: outDist,
      bpuReserva: s.reserva.votos, bpuOutras: s.outras.votos, distintasMenosBu: distTotal - bu.c, logs: urnasPorLog });
  }
}
db.close();
const tot = Object.values(grupos).reduce((t, g) => { for (const [c, v] of Object.entries(g)) t[c] = (t[c] ?? 0) + v; return t; }, {});
const semLinha = casos.filter((c) => c.distintasMenosBu < 0).reduce((a, c) => a - c.distintasMenosBu, 0);
const acima = casos.filter((c) => c.distintasMenosBu > 0);
const fecho = tot.reservaDist + grupos.h14Dia.outrasDist + grupos.h14SemRegistro.outrasDist + grupos.h14Antes.outrasDist + semLinha;
const r = { fonte, lidos, foraDeOrdem, grupos, total: tot, votosDoBuSemLinha: semLinha, secoesDistintasAcimaDoBu: acima.length, fecho, casos };
await mkdir(path.join(A, 'cetico-revisor'), { recursive: true });
await writeFile(path.join(A, 'cetico-revisor', '39-t11.json'), JSON.stringify(r, null, 1));
console.log(fonte, 'pacotes lidos', lidos);
console.table(grupos);
console.log({ foraDeOrdem, votosDoBuSemLinha: semLinha, secoesDistintasAcimaDoBu: acima.length, fecho });
for (const c of casos) console.log(JSON.stringify({ ...c, logs: c.logs.map((l) => `${l.prof}:${l.nome}:${JSON.stringify(l.votosDia)}`) }));
