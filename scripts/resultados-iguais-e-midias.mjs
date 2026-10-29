// Duas alegações das redes (29/10/2026):
//  (1) "o mesmo drive de leitura usado em várias seções": seriais de mídia de resultado (MR, log), flash de votação
//      (FV, BU) e nº interno da urna (BU) repetidos entre seções (H11, doc 07 A12);
//  (2) "resultados iguais em seções diferentes / seções fantasmas": seções com exatamente os mesmos votos de 13, 22,
//      brancos e nulos. Compara com o acaso: para cada seção, sorteia os votos com as próprias proporções da seção
//      (multinomial com o mesmo comparecimento) e conta quantos grupos iguais aparecem.
// Para cada grupo de seções iguais, verifica se são urnas, mídias e logs diferentes.
// Uso: node scripts/resultados-iguais-e-midias.mjs [turno]   (lê data/parsed/<t>t/perfil/)
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DIR_DADOS, UFS } from '../src/config.js';

const turno = process.argv[2] ?? '2';
const ELEICAO = turno === '1' ? 6257 : 6258;
const secoes = [];
for (const uf of UFS) {
  for await (const l of createInterface({ input: createReadStream(path.join(DIR_DADOS, 'parsed', `${turno}t`, 'perfil', `${uf}.jsonl`)) })) {
    if (!l.trim()) continue;
    const p = JSON.parse(l);
    const e = p.bu.eleicoes.find((x) => x.idEleicao === ELEICAO);
    const v = e?.cargos.find((c) => c.codigoCargo === 1)?.votos ?? {};
    secoes.push({
      k: `${uf}/${p.municipio}/${p.zona}/${p.secao}`, tipo: p.bu.urna.tipoUrna,
      l: v['13'] ?? 0, f: v['22'] ?? 0, b: v.branco ?? 0, n: v.nulo ?? 0, aptos: e?.aptos ?? null,
      urna: p.bu.urna.numeroInternoUrna, fv: p.bu.urna.numeroSerieFV, mr: p.log?.serialMR ?? null, vsc: p.sha256Vsc,
      ultimoVoto: p.log?.ultimoVoto ?? null,
    });
  }
}
console.log(`${turno}º turno: ${secoes.length} pacotes de seção lidos`);

// (1) mídias e urnas repetidas
for (const campo of ['mr', 'fv', 'urna']) {
  const grupos = new Map();
  for (const s of secoes) {
    if (s[campo] == null) continue;
    if (!grupos.has(s[campo])) grupos.set(s[campo], new Set());
    grupos.get(s[campo]).add(s.k);
  }
  const rep = [...grupos].filter(([, g]) => g.size > 1);
  console.log(`  ${campo.toUpperCase()}: ${grupos.size} seriais; ${rep.length} usados em mais de uma seção${rep.length ? ' → ' + rep.slice(0, 8).map(([sr, g]) => `${sr}: ${[...g].join(', ')}`).join(' | ') : ''}`);
}

// (2) votos iguais
const chave = (s) => `${s.l}|${s.f}|${s.b}|${s.n}`;
function grupos(lista) {
  const m = new Map();
  for (const s of lista) {
    if (s.l + s.f + s.b + s.n < 50) continue; // seções muito pequenas coincidem por acaso com facilidade
    const k = chave(s);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(s);
  }
  return [...m.values()].filter((g) => g.length > 1);
}
const reais = grupos(secoes);
const secoesEmGrupo = reais.reduce((a, g) => a + g.length, 0);
console.log(`\n  Votos iguais (13, 22, brancos e nulos), seções com 50 votos ou mais: ${reais.length} grupos, ${secoesEmGrupo} seções; maior grupo: ${Math.max(0, ...reais.map((g) => g.length))}`);

// mesmo grupo com algo em comum = suspeito; tudo diferente = coincidência numérica
let compartilham = 0;
const exemplos = [];
for (const g of reais) {
  const igual = (c) => new Set(g.map((s) => s[c])).size < g.length;
  const comum = ['urna', 'fv', 'mr', 'vsc'].filter((c) => igual(c));
  if (comum.length) { compartilham++; if (exemplos.length < 5) exemplos.push(`${g.map((s) => s.k).join(' = ')} [mesmo ${comum.join(', ')}]`); }
}
console.log(`  grupos em que as seções compartilham urna, FV, MR ou pacote assinado: ${compartilham}${exemplos.length ? ' → ' + exemplos.join(' | ') : ''}`);
const mesmosAptos = reais.filter((g) => new Set(g.map((s) => s.aptos)).size < g.length).length;
console.log(`  grupos com também o mesmo número de aptos: ${mesmosAptos}`);

// acaso: multinomial com as proporções da própria seção (gerador mulberry32, semente fixa)
let semente = 2026;
const aleatorio = () => {
  semente = (semente + 0x6d2b79f5) | 0;
  let t = Math.imul(semente ^ (semente >>> 15), 1 | semente);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
function sortear(s) {
  const n = s.l + s.f + s.b + s.n;
  const p = [s.l / n, s.f / n, s.b / n];
  const out = { l: 0, f: 0, b: 0, n: 0 };
  for (let i = 0; i < n; i++) {
    const u = aleatorio();
    if (u < p[0]) out.l++; else if (u < p[0] + p[1]) out.f++; else if (u < p[0] + p[1] + p[2]) out.b++; else out.n++;
  }
  return out;
}
const sims = [];
for (let r = 0; r < 3; r++) {
  const g = grupos(secoes.map((s) => (s.l + s.f + s.b + s.n < 50 ? s : sortear(s))));
  sims.push(`${g.length} grupos / ${g.reduce((a, x) => a + x.length, 0)} seções`);
}
console.log(`  acaso (votos sorteados com as proporções de cada seção, 3 vezes): ${sims.join('; ')}`);

// Esperado por acaso para seriais de 32 bits (8 dígitos hexadecimais): pares = n(n−1)/2 ÷ 2^32
for (const campo of ['mr', 'fv']) {
  const n = new Set(secoes.filter((s) => s[campo] != null).map((s) => s.k)).size;
  console.log(`  ${campo.toUpperCase()}: pares repetidos esperados por acaso com ${n} mídias e seriais aleatórios de 32 bits: ${((n * (n - 1)) / 2 / 2 ** 32).toFixed(1)}`);
}
// Clone exige igualdade em tudo: votos de presidente + aptos + comparecimento + último voto no log
const completo = new Map();
for (const s of secoes) {
  if (s.l + s.f + s.b + s.n < 50) continue;
  const k = `${chave(s)}|${s.aptos}|${s.ultimoVoto}`;
  if (!completo.has(k)) completo.set(k, []);
  completo.get(k).push(s.k);
}
const clones = [...completo.values()].filter((g) => g.length > 1);
console.log(`  seções iguais também em aptos e no horário do último voto: ${clones.length} grupos${clones.length ? ' → ' + clones.slice(0, 5).map((g) => g.join(' = ')).join(' | ') : ''}`);
