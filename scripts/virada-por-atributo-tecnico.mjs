// O ganho de Lula entre turnos depende de atributo técnico da urna, dentro do mesmo município?
// Comportamento do eleitor varia com a geografia política; manipulação de software tenderia a acompanhar atributos
// técnicos (modelo da urna, lote de carga), mesmo entre seções vizinhas. Compara cada seção com a média do próprio
// município e agrega o desvio por modelo de urna e por dia de carga. Teste de permutação: embaralha o atributo dentro
// do município e mede quanto desvio aparece por acaso.
// Com --local, a comparação é dentro do mesmo LOCAL de votação (mesmo prédio), o que controla onde a urna foi posta.
// Uso: node scripts/virada-por-atributo-tecnico.mjs [--local] [uf ...]
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { abrirLeitura } from '../src/banco-leitura.js';
import { DIR_DADOS, UFS } from '../src/config.js';

const porLocal = process.argv.includes('--local');
const locais = new Map();
if (porLocal) {
  const { db } = await abrirLeitura();
  for (const r of db.prepare('select uf, municipio, zona, secao, local from secao where turno = 2').iterate()) {
    locais.set(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, `${r.uf}/${r.municipio}/${r.zona}/L${r.local}`);
  }
}

async function lerTurno(turno, uf) {
  const m = new Map();
  try {
    for await (const l of createInterface({ input: createReadStream(path.join(DIR_DADOS, 'parsed', `${turno}t`, 'perfil', `${uf}.jsonl`)) })) {
      if (!l.trim()) continue;
      const p = JSON.parse(l);
      const e = p.bu.eleicoes.find((x) => x.idEleicao === (turno === 1 ? 6257 : 6258));
      const v = e?.cargos.find((c) => c.codigoCargo === 1)?.votos ?? {};
      const k = `${p.municipio}/${p.zona}/${p.secao}`;
      m.set(k, m.has(k) ? null : { municipio: p.municipio, l: v['13'] ?? 0, f: v['22'] ?? 0, modelo: p.log?.modeloUrna ?? '?', carga: (p.bu.urna.dataHoraCarga ?? '').slice(0, 8), tipo: p.bu.urna.tipoUrna, comp: p.bu.qtdEleitoresCompareceram });
    }
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
  return m;
}

// semente fixa para a permutação ser reproduzível
let semente = 12345;
// mulberry32: aritmética inteira de 32 bits (o LCG anterior estourava a precisão do double e ciclava em ~10 mil)
const aleatorio = () => {
  semente = (semente + 0x6d2b79f5) | 0;
  let t = Math.imul(semente ^ (semente >>> 15), 1 | semente);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const secoes = [];
const argUfs = process.argv.slice(2).filter((a) => a !== '--local');
const ufs = argUfs.length ? argUfs : UFS;
for (const uf of ufs) {
  const [a, b] = [await lerTurno(1, uf), await lerTurno(2, uf)];
  if (!a || !b) { console.error(`[${uf}] sem perfil de um dos turnos: pulada`); continue; }
  for (const [k, s2] of b) {
    const s1 = a.get(k);
    if (!s1 || !s2 || s1.tipo === 3 || s2.tipo === 3 || s2.tipo === 4 || s2.modelo !== s1.modelo) continue;
    const gl = s2.l - s1.l;
    const gf = s2.f - s1.f;
    if (s2.comp < 30) continue;
    // métrica: ganho líquido de Lula sobre Flávio, por votante do 2º turno
    // "mun" é o grupo de comparação: município, ou local de votação com --local
    const grupo = porLocal ? locais.get(`${uf}/${k}`) : `${uf}/${s2.municipio}`;
    if (!grupo) continue;
    secoes.push({ mun: grupo, modelo: s2.modelo, carga: s2.carga, x: (gl - gf) / s2.comp, peso: s2.comp });
  }
}

function desvioPorAtributo(lista, attr) {
  const porMun = new Map();
  for (const s of lista) {
    if (!porMun.has(s.mun)) porMun.set(s.mun, []);
    porMun.get(s.mun).push(s);
  }
  const acc = {};
  for (const grupo of porMun.values()) {
    if (new Set(grupo.map((s) => s[attr])).size < 2) continue; // só municípios com mais de um valor do atributo
    const media = grupo.reduce((a, s) => a + s.x * s.peso, 0) / grupo.reduce((a, s) => a + s.peso, 0);
    for (const s of grupo) {
      const o = (acc[s[attr]] ??= { secoes: 0, peso: 0, soma: 0 });
      o.secoes++;
      o.peso += s.peso;
      o.soma += (s.x - media) * s.peso;
    }
  }
  return Object.fromEntries(Object.entries(acc).map(([k, o]) => [k, { secoes: o.secoes, desvioPp: (100 * o.soma) / o.peso }]));
}

function permutar(lista, attr) {
  const porMun = new Map();
  for (const s of lista) {
    if (!porMun.has(s.mun)) porMun.set(s.mun, []);
    porMun.get(s.mun).push(s);
  }
  const out = [];
  for (const grupo of porMun.values()) {
    const valores = grupo.map((s) => s[attr]);
    for (let i = valores.length - 1; i > 0; i--) {
      const j = Math.floor(aleatorio() * (i + 1));
      [valores[i], valores[j]] = [valores[j], valores[i]];
    }
    grupo.forEach((s, i) => out.push({ ...s, [attr]: valores[i] }));
  }
  return out;
}

console.log(`${secoes.length} seções (mesmo modelo de urna nos dois turnos, sem contingência, ≥ 30 votantes)`);
console.log('Métrica: (ganho de Lula − ganho de Flávio) ÷ votantes do 2º turno, comparada com a média do próprio município.\n');
for (const attr of ['modelo', 'carga']) {
  const real = desvioPorAtributo(secoes, attr);
  const PERM = 50;
  const maxPerm = [];
  for (let p = 0; p < PERM; p++) {
    const d = desvioPorAtributo(permutar(secoes, attr), attr);
    maxPerm.push(Math.max(...Object.values(d).filter((o) => o.secoes >= 200).map((o) => Math.abs(o.desvioPp))));
  }
  maxPerm.sort((a, b) => a - b);
  console.log(`Por ${attr} (só valores com ≥ 200 seções em municípios com mais de um valor):`);
  for (const [k, o] of Object.entries(real).filter(([, o]) => o.secoes >= 200).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`  ${k.padEnd(10)} ${String(o.secoes).padStart(7)} seções   desvio ${o.desvioPp >= 0 ? '+' : ''}${o.desvioPp.toFixed(2)} pp`);
  }
  console.log(`  acaso (permutação dentro do município, ${PERM}×): maior |desvio| mediano ${maxPerm[PERM >> 1].toFixed(2)} pp, p95 ${maxPerm[Math.floor(PERM * 0.95)].toFixed(2)} pp\n`);
}
