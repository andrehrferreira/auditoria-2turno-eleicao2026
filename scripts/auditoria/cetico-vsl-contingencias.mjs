// Revisor cético, achado "votos-sem-log-contingencia": varre TODOS os pacotes de contingência (tipo_urna reserva*) do
// turno e, para cada um, reconta os votos distintos de cada logd.dat (raiz e aninhados), marca as urnas que deram
// "GAP erro 72" (mídia de votação de outra carga) e mede, por sessão de urna, a maior quantidade de votos por biografia
// em qualquer janela de 13 votos seguidos. Serve para:
//  (a) conferir de forma independente que só 3 pacotes de contingência têm BU > votos no log;
//  (b) testar o mecanismo benigno: urna recusada (erro 72) entre a urna que votou e a contingência apaga o log da ME;
//  (c) dar uma linha de base empírica (heterogênea por urna) para "12 de 13 por biografia".
// Uso: node scripts/auditoria/cetico-vsl-contingencias.mjs [--turno 2] [--limite N]
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { open } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { parseArgs } from 'node:util';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { values: args } = parseArgs({ options: { turno: { type: 'string', default: '2' }, limite: { type: 'string' } } });
const turno = Number(args.turno);
const DIA = { 1: '04/10/2026', 2: '25/10/2026' }[turno];
const JANELA = 13;
const db = new DatabaseSync('data/db/eleicao2026.sqlite', { readOnly: true });
let alvos = db.prepare(`SELECT uf, municipio, zona, secao, hash, tipo_urna, comparecimento, sem_biometria, por_biometria, por_biografia
  FROM secao WHERE turno = ? AND tipo_urna LIKE 'reserva%' AND situacao = 'completa' ORDER BY 1, 2, 3, 4`).all(turno);
if (args.limite) alvos = alvos.slice(0, Number(args.limite));

const mem = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
async function logs(h, nome, out = []) {
  for (const e of await listarEntradas(h)) {
    const d = await lerEntrada(h, e);
    if (e.nome === 'logd.dat') out.push({ nome, texto: d.toString('latin1') });
    else if (e.nome.endsWith('.jez')) await logs(mem(d), `${nome}/${e.nome}`, out);
  }
  return out;
}
function sessao(texto) {
  const votos = []; const chaves = []; let ciclo = null; let erro72 = false; const urnas = new Set(); const secoes = new Set();
  for (const linha of texto.split('\n')) {
    const c = linha.replace(/\r$/, '').split('\t');
    if (c.length < 5 || !c[0].startsWith(DIA)) continue;
    const msg = c[4]; urnas.add(c[2]);
    if (msg.startsWith('Seção Eleitoral: ')) secoes.add(msg.slice(17).trim());
    if (msg.includes('GAP erro 72')) erro72 = true;
    if (msg === 'Aguardando digitação do identificador do eleitor') ciclo = { bio: false, ano: false, dado: false };
    else if (!ciclo) continue;
    else if (msg.includes('Tipo de habilitação do eleitor [biométrica]')) ciclo.bio = true;
    else if (msg.startsWith('Ano de nascimento digitado é igual ao do cadastro')) ciclo.ano = true;
    else if (msg === 'Dado digitado confere') ciclo.dado = true;
    else if (msg === 'O voto do eleitor foi computado') {
      votos.push(ciclo.bio ? 'B' : ciclo.ano ? 'S' : ciclo.dado ? 'G' : '?'); chaves.push(`${c[2]}|${c[0]}|${c[5]}`); ciclo = null;
    } else if (msg.startsWith('Urna ligada em') || msg.startsWith('Início das operações do logd')) ciclo = null;
  }
  let maxG = 0;
  for (let i = 0; i + JANELA <= votos.length; i++) { let g = 0; for (let j = i; j < i + JANELA; j++) if (votos[j] === 'G') g++; maxG = Math.max(maxG, g); }
  return { votos, chaves, erro72, urnas: [...urnas], secoes: [...secoes], maxG13: votos.length >= JANELA ? maxG : null };
}

const pacotes = []; const sessoes = []; let i = 0; const t0 = Date.now();
for (const s of alvos) {
  const dir = `data/raw/${turno}t/urnas/${s.uf}/${s.municipio}/${s.zona}/${s.secao}/${s.hash}`;
  let nomes; try { nomes = readdirSync(dir); } catch { pacotes.push({ ...s, erro: 'sem diretório' }); continue; }
  const jez = nomes.find((n) => n.endsWith('-log.jez'));
  if (!jez) { pacotes.push({ ...s, erro: 'sem log' }); continue; }
  const h = await open(`${dir}/${jez}`);
  let ls; try { ls = await logs(h, jez); } catch (e) { pacotes.push({ ...s, erro: e.message }); continue; } finally { await h.close(); }
  const distintos = new Set(); const info = [];
  for (const l of ls) {
    const r = sessao(l.texto);
    const outra = r.secoes.some((x) => x !== '0000' && x !== s.secao);
    if (!outra) r.chaves.forEach((k) => distintos.add(k));
    info.push({ nome: l.nome.split('/').slice(1).join('/') || 'raiz', urnas: r.urnas.join(','), votos: r.votos.length, erro72: r.erro72, outra });
    if (!outra && r.votos.length) sessoes.push({ secao: `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`, log: l.nome, urnas: r.urnas.join(','), n: r.votos.length,
      G: r.votos.filter((v) => v === 'G').length, maxG13: r.maxG13 });
  }
  const temErro72 = info.some((x) => x.erro72);
  pacotes.push({ uf: s.uf, municipio: s.municipio, zona: s.zona, secao: s.secao, tipo_urna: s.tipo_urna, bu: s.comparecimento, log: distintos.size,
    semLog: s.comparecimento - distintos.size, logs: ls.length, temErro72, logsSemVoto: info.filter((x) => x.votos === 0).length,
    detalhe: info.map((x) => `${x.nome}[${x.urnas}] ${x.votos}${x.erro72 ? ' ERRO72' : ''}${x.outra ? ' OUTRA' : ''}`).join(' ; ') });
  if (++i % 500 === 0) console.error(`${i}/${alvos.length} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}

const com = pacotes.filter((p) => !p.erro);
const tab = (f) => ({ pacotes: com.filter(f).length, comSemLog: com.filter((p) => f(p) && p.semLog > 0).length, votosSemLog: com.filter(f).reduce((t, p) => t + Math.max(0, p.semLog), 0) });
console.log(`Pacotes de contingência: ${alvos.length}; lidos ${com.length}; com erro de leitura ${pacotes.length - com.length}`);
console.log(`BU > log: ${com.filter((p) => p.semLog > 0).length} pacotes, ${com.reduce((t, p) => t + Math.max(0, p.semLog), 0)} votos; BU < log: ${com.filter((p) => p.semLog < 0).length}`);
console.log(`Com urna que deu GAP erro 72 no pacote: ${JSON.stringify(tab((p) => p.temErro72))}; sem: ${JSON.stringify(tab((p) => !p.temErro72))}`);
for (const p of com.filter((p) => p.semLog !== 0 || p.temErro72)) console.log(`  ${p.uf} ${p.municipio}/${p.zona}/${p.secao} BU ${p.bu} log ${p.log} semLog ${p.semLog} :: ${p.detalhe}`);
const s13 = sessoes.filter((x) => x.maxG13 !== null);
const dist = new Map(); for (const x of s13) dist.set(x.maxG13, (dist.get(x.maxG13) ?? 0) + 1);
console.log(`\nSessões de urna com >= ${JANELA} votos (contingência e urnas substituídas): ${s13.length}`);
console.log(`Maior nº de votos por biografia numa janela de ${JANELA}: ${[...dist].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}:${v}`).join(' ')}`);
for (const x of s13.filter((x) => x.maxG13 >= 12)) console.log(`  >=12/13: ${x.secao} ${x.log} urna ${x.urnas} n=${x.n} G=${x.G}`);
const totN = sessoes.reduce((t, x) => t + x.n, 0), totG = sessoes.reduce((t, x) => t + x.G, 0);
console.log(`Taxa de biografia nessas sessões: ${totG}/${totN} = ${(totG / totN).toFixed(4)}`);
mkdirSync('data/parsed/auditoria/cetico', { recursive: true });
writeFileSync(`data/parsed/auditoria/cetico/cetico-vsl-contingencias-${turno}t.json`, JSON.stringify({ pacotes, sessoes }, null, 0));
