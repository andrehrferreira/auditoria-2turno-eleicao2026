// Estatístico eleitoral, H13 sinal V2 (adendo de 30/10/2026 ao plano 16, teste b): hora e sequência de cada voto pela
// via de liberação, lendo todos os diários de um turno (um processo, sem linhas de execução extras).
// Fluxo e cópias como em estatistico-h08-varredura.mjs (mesmas funções de leitura). Via de cada voto computado:
// digital > ano de nascimento (V2) > dado pessoal (V3). Por seção:
//   hora[v][h]       votos da via v na hora local h (0–23)
//   ultima[v]        votos da via v na última hora antes do "Inicio do Encerramento" do fluxo
//   v2Seq            votos V2 cujo voto anterior da mesma urna também foi V2; v2MaxSeq maior sequência de V2
//   v2Rajada10       maior número de V2 em 10 minutos; v2MinIntervalo menor intervalo entre dois V2 seguidos
//   v2Foto, v2PedeDigital  ciclos V2 com "Foto do eleitor apresentada" / "Solicita digital"
//   erros, alertas   linhas ERRO e ALERTA do dia; semEncerramento fluxos com voto e sem início do encerramento
// Nenhum título é gravado.
// Uso: node scripts/auditoria/estatistico-h13-v2-horario.mjs --turno 2 [--uf sp,mg]
// Saída: data/parsed/auditoria/estatistico/h13-v2/horario-<t>t.jsonl
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { fluxosDoTexto, juntarCopias, textos } from './estatistico-h08-varredura.mjs';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, uf: { type: 'string' }, secoes: { type: 'string' }, saida: { type: 'string' } } });
const turno = values.turno;
const DIA = { 1: '04/10/2026', 2: '25/10/2026' }[turno];
const BASE = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas');
const SAIDA = values.saida ?? path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h13-v2', `horario-${turno}t.jsonl`);
const memoria = (buf) => ({ read: async (d, o, n, p) => ({ bytesRead: buf.copy(d, o, p, p + n) }), stat: async () => ({ size: buf.length }) });
const sub = async (d) => (await readdir(d, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
const seg = (l) => Number(l.slice(11, 13)) * 3600 + Number(l.slice(14, 16)) * 60 + Number(l.slice(17, 19));

function fluxo(linhas, s) {
  const vistas = new Set();
  const votos = []; // [t, via]
  let enc = null;
  let m = { bio: false, ano: false, dado: false, foto: false, pede: false };
  const zera = () => { m = { bio: false, ano: false, dado: false, foto: false, pede: false }; };
  for (const l of linhas) {
    if (vistas.has(l)) continue;
    vistas.add(l);
    const c = l.split('\t');
    const msg = c[4] ?? '';
    if (c[1] === 'ERRO') s.erros++;
    else if (c[1] === 'ALERTA') s.alertas++;
    if (msg === 'Identificador do eleitor digitado pelo mesário' || msg === 'Aguardando digitação do identificador do eleitor') zera();
    else if (msg.startsWith('Inicio do Encerramento')) enc = seg(l);
    else if (msg.includes('Tipo de habilitação do eleitor [biométrica]')) m.bio = true;
    else if (msg.startsWith('Ano de nascimento digitado é igual ao do cadastro')) m.ano = true;
    else if (msg === 'Dado digitado confere') m.dado = true;
    else if (msg === 'Foto do eleitor apresentada') m.foto = true;
    else if (msg.startsWith('Solicita digital. Tentativa')) m.pede = true;
    else if (msg === 'O voto do eleitor foi computado') {
      const via = m.bio ? 'v1' : m.ano ? 'v2' : m.dado ? 'v3' : 'outra';
      if (via === 'v2') { if (m.foto) s.v2Foto++; if (m.pede) s.v2PedeDigital++; }
      votos.push([seg(l), via]);
      zera();
    }
  }
  if (votos.length && enc === null) s.semEncerramento++;
  let seq = 0, prev = null, prevT = null;
  const v2t = [];
  for (const [t, via] of votos) {
    s.votos++;
    s.hora[via] ??= new Array(24).fill(0);
    s.hora[via][Math.floor(t / 3600)]++;
    if (enc !== null && t >= enc - 3600 && t <= enc) s.ultima[via] = (s.ultima[via] ?? 0) + 1;
    if (via === 'v2') {
      v2t.push(t);
      if (prev === 'v2') {
        s.v2Seq++; seq++;
        const d = t - prevT;
        if (d >= 0) s.v2MinIntervalo = s.v2MinIntervalo === null ? d : Math.min(s.v2MinIntervalo, d);
      } else seq = 1;
      s.v2MaxSeq = Math.max(s.v2MaxSeq, seq);
    } else seq = 0;
    prev = via; prevT = t;
  }
  for (let i = 0, j = 0; i < v2t.length; i++) {
    while (v2t[i] - v2t[j] > 600) j++;
    s.v2Rajada10 = Math.max(s.v2Rajada10, i - j + 1);
  }
}

async function secao(id) {
  const [uf, mun, zona, sec] = id.split('/');
  const dirS = path.join(BASE, uf, mun, zona, sec);
  const s = { id, votos: 0, hora: {}, ultima: {}, v2Seq: 0, v2MaxSeq: 0, v2Rajada10: 0, v2MinIntervalo: null, v2Foto: 0, v2PedeDigital: 0, erros: 0, alertas: 0, semEncerramento: 0 };
  const copias = new Map();
  const hashes = new Set();
  for (const hash of await sub(dirS)) {
    const nomes = await readdir(path.join(dirS, hash));
    const log = acharArquivo(nomes, 'log');
    if (!log) continue;
    const bytes = await readFile(path.join(dirS, hash, log));
    const h = createHash('sha256').update(bytes).digest('hex');
    if (hashes.has(h)) continue;
    hashes.add(h);
    for (const t of await textos(memoria(bytes))) {
      for (const [urna, ls] of fluxosDoTexto(t, DIA, sec, { n: 0 })) { if (!copias.has(urna)) copias.set(urna, []); copias.get(urna).push(ls); }
    }
  }
  for (const lista of copias.values()) fluxo(juntarCopias(lista).linhas, s);
  return s;
}

await mkdir(path.dirname(SAIDA), { recursive: true });
const out = createWriteStream(SAIDA);
const inicio = Date.now();
let n = 0, erros = 0;
const ids = [];
if (values.secoes) ids.push(...values.secoes.split(','));
else {
  for (const uf of values.uf ? values.uf.split(',') : UFS) {
    const b = path.join(BASE, uf);
    for (const m of await sub(b)) for (const z of await sub(path.join(b, m))) for (const s of await sub(path.join(b, m, z))) ids.push(`${uf}/${m}/${z}/${s}`);
  }
}
for (const id of ids) {
  try { out.write(`${JSON.stringify(await secao(id))}\n`); } catch (e) { erros++; out.write(`${JSON.stringify({ id, erro: e.message })}\n`); }
  if (++n % 20000 === 0) console.log(`${n}/${ids.length} seções · ${((Date.now() - inicio) / 60000).toFixed(1)} min`);
}
await new Promise((r) => out.end(r));
console.log(`RESUMO turno ${turno}: ${n} seções, ${erros} erro(s), ${((Date.now() - inicio) / 60000).toFixed(1)} min`);
