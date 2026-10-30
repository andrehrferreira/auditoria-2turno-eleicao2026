// H21, passo 1: frequência de cada número nulo digitado no RDV, por turno, cargo, âmbito, zona e seção
// (plano: docs/analysis/estatistico-eleitoral/13-h21-plano.md). Universo completo: uma passada por toda a tabela voto_rdv
// da cópia de leitura, os dois turnos.
//   - Só tipo_voto = 'nulo' (digitado pelo eleitor). nuloAposSuspensao e nuloPorRepeticao são contados e ficam fora.
//   - Âmbito: 'br' para presidente (cargo 1); a UF para os demais cargos.
//   - Exposição: total de nulos do cargo em cada zona e turno.
// Só leitura. Uso: node --max-old-space-size=12288 scripts/auditoria/estatistico-h21-extrair.mjs
// Saídas em data/parsed/auditoria/estatistico-eleitoral/h21/:
//   frequencia.csv   uma linha por (cargo, âmbito, número): ocorrências, seções e zonas em cada turno, maior contagem numa seção
//   zonas.jsonl      só os números com 10+ ocorrências num turno: contagem por zona nos dois turnos
//   exposicao.json   nulos por (cargo, zona) e por (cargo, âmbito), município principal de cada zona, totais e exclusões
import { createWriteStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { RAIZ } from './forense-lib.mjs';

const SAIDA = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'estatistico-eleitoral', 'h21');
const N_MIN = 10;
const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
await mkdir(SAIDA, { recursive: true });

const { db, fonte } = await abrirLeitura();
log(`fonte ${path.basename(fonte)}`);

const numeros = new Map(); // cargo|ambito|d -> { n:[,,], s:[,,], z: Map(zona -> [, c1, c2]), max: [, {sec, q}, {sec, q}] }
const expZona = new Map(); // cargo|uf|zona -> [, e1, e2]
const expAmbito = new Map(); // cargo|ambito -> [, E1, E2]
const munZona = new Map(); // uf|zona -> Map(municipio -> nulos)
const totais = { nulo: [0, 0, 0], linhasNulo: [0, 0, 0], foraDoTeste: {} };

const q = db.prepare(`SELECT turno, uf, municipio, zona, secao, cargo, tipo_voto, digitacao, quantidade FROM voto_rdv
  WHERE tipo_voto IN ('nulo', 'nuloAposSuspensao', 'nuloPorRepeticao')`);
let linhas = 0;
for (const r of q.iterate()) {
  linhas++;
  if (linhas % 5_000_000 === 0) log(`${linhas} linhas`);
  const t = r.turno;
  if (r.tipo_voto !== 'nulo') {
    const k = `${t}|${r.cargo}|${r.tipo_voto}`;
    totais.foraDoTeste[k] = (totais.foraDoTeste[k] ?? 0) + r.quantidade;
    continue;
  }
  totais.nulo[t] += r.quantidade;
  totais.linhasNulo[t]++;
  const ambito = r.cargo === 1 ? 'br' : r.uf;
  const zona = `${r.uf}|${r.zona}`;
  const d = r.digitacao ?? '';
  const k = `${r.cargo}|${ambito}|${d}`;
  let o = numeros.get(k);
  if (!o) { o = { n: [0, 0, 0], s: [0, 0, 0], z: new Map(), max: [null, null, null] }; numeros.set(k, o); }
  o.n[t] += r.quantidade;
  o.s[t]++;
  let zz = o.z.get(zona);
  if (!zz) { zz = [0, 0, 0]; o.z.set(zona, zz); }
  zz[t] += r.quantidade;
  if (!o.max[t] || r.quantidade > o.max[t].q) o.max[t] = { sec: `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, q: r.quantidade };
  const kz = `${r.cargo}|${zona}`;
  let ez = expZona.get(kz);
  if (!ez) { ez = [0, 0, 0]; expZona.set(kz, ez); }
  ez[t] += r.quantidade;
  const ka = `${r.cargo}|${ambito}`;
  let ea = expAmbito.get(ka);
  if (!ea) { ea = [0, 0, 0]; expAmbito.set(ka, ea); }
  ea[t] += r.quantidade;
  let mz = munZona.get(zona);
  if (!mz) { mz = new Map(); munZona.set(zona, mz); }
  mz.set(r.municipio, (mz.get(r.municipio) ?? 0) + r.quantidade);
}
log(`${linhas} linhas lidas; ${numeros.size} números distintos (cargo × âmbito)`);

// nomes de município
const nomeMun = new Map(db.prepare('SELECT uf, codigo, nome FROM municipio').all().map((m) => [`${m.uf}|${m.codigo}`, m.nome]));
db.close();

const freq = createWriteStream(path.join(SAIDA, 'frequencia.csv'));
const zonasOut = createWriteStream(path.join(SAIDA, 'zonas.jsonl'));
freq.write('cargo;ambito;digitacao;n1;n2;secoes1;secoes2;zonas1;zonas2;max_secao1;max_q1;max_secao2;max_q2\n');
let testaveis = 0;
const escrever = (s, linha) => (s.write(linha) ? null : new Promise((res) => s.once('drain', res)));
for (const [k, o] of numeros) {
  const [cargo, ambito, d] = k.split('|');
  let z1 = 0, z2 = 0;
  for (const v of o.z.values()) { if (v[1]) z1++; if (v[2]) z2++; }
  const p = escrever(freq, `${cargo};${ambito};${d};${o.n[1]};${o.n[2]};${o.s[1]};${o.s[2]};${z1};${z2};${o.max[1]?.sec ?? ''};${o.max[1]?.q ?? ''};${o.max[2]?.sec ?? ''};${o.max[2]?.q ?? ''}\n`);
  if (p) await p;
  if (o.n[1] >= N_MIN || o.n[2] >= N_MIN) {
    testaveis++;
    const zs = [...o.z].map(([zona, v]) => [zona, v[1], v[2]]);
    const p2 = escrever(zonasOut, JSON.stringify({ cargo: Number(cargo), ambito, d, n: [o.n[1], o.n[2]], s: [o.s[1], o.s[2]], max: [o.max[1], o.max[2]], z: zs }) + '\n');
    if (p2) await p2;
  }
}
await new Promise((res) => freq.end(res));
await new Promise((res) => zonasOut.end(res));

const munPrincipal = {};
for (const [zona, m] of munZona) {
  const [cod] = [...m].sort((a, b) => b[1] - a[1])[0];
  const uf = zona.split('|')[0];
  munPrincipal[zona] = { municipio: cod, nome: nomeMun.get(`${uf}|${cod}`) ?? cod, municipios: m.size };
}
await writeFile(path.join(SAIDA, 'exposicao.json'), JSON.stringify({
  geradoEm: new Date().toISOString(), fonte: path.basename(fonte), linhas, numerosDistintos: numeros.size, testaveis, nMin: N_MIN,
  totais, expZona: Object.fromEntries([...expZona].map(([k, v]) => [k, [v[1], v[2]]])),
  expAmbito: Object.fromEntries([...expAmbito].map(([k, v]) => [k, [v[1], v[2]]])), munPrincipal,
}));
log(`fim: ${testaveis} números com ${N_MIN}+ ocorrências num turno; nulos ${totais.nulo[1]} (1º) e ${totais.nulo[2]} (2º)`);
