// Parecer cético 29 (H09): nas 2 seções de MG com apuração mista por cédula (1º turno), a posição i das listas de
// cédula do RDV é a mesma cédula em todos os cargos? Teste de permutação (semente fixa) entre listas de cargos da
// mesma cédula. Se a ordem de cada cargo fosse independente, o alinhamento observado seria raro.
//
// Estatísticas, por seção:
//   - deputado federal × estadual (cédula proporcional): posições com o mesmo partido (2 primeiros dígitos), ou
//     branco com branco, ou nulo com nulo; e só branco/nulo coincidentes;
//   - governador × par de senador (cédula majoritária): branco/nulo do governador na mesma posição em que o par de
//     senador (2i, 2i+1) é branco/branco ou nulo/nulo;
//   - presidente × governador (eleições diferentes no RDV): o mesmo teste;
//   - senador: pares (2i, 2i+1) com o mesmo candidato duas vezes (impossível na mesma cédula) × pares deslocados.
// Não há dado pessoal: só votos do RDV publicado.
//
// Uso: node scripts/auditoria/cetico-h09-cedula.mjs
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { decodificarArquivo } from '../../src/asn1.js';
import { DIR_DADOS } from '../../src/config.js';
import { arquivoRdv } from '../../src/esquemas.js';

const SECOES = ['mg/41238/0039/0168', 'mg/50075/0047/0041'];
const RODADAS = 200_000;

function geradorFixo(semente) { // mulberry32
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const classe = (v) => (v.tipoVoto === 'nominal' || v.tipoVoto === 'legenda' ? `P${String(v.digitacao).slice(0, 2)}` : v.tipoVoto === 'nulo' ? 'N' : 'B');
const iguais = (a, b) => a.reduce((s, x, i) => s + (x === b[i] ? 1 : 0), 0);
const bnIguais = (a, b) => a.reduce((s, x, i) => s + ((x === 'N' || x === 'B') && x === b[i] ? 1 : 0), 0);

function permutacao(a, b, f, aleatorio) {
  const obs = f(a, b);
  const c = [...b];
  let maiorIgual = 0;
  for (let r = 0; r < RODADAS; r++) {
    for (let i = c.length - 1; i > 0; i--) {
      const j = Math.floor(aleatorio() * (i + 1));
      [c[i], c[j]] = [c[j], c[i]];
    }
    if (f(a, c) >= obs) maiorIgual++;
  }
  return { observado: obs, p: Number(((maiorIgual + 1) / (RODADAS + 1)).toPrecision(2)) };
}

for (const s of SECOES) {
  const dir = path.join(DIR_DADOS, 'raw', '1t', 'urnas', s);
  const h = (await readdir(dir)).find((x) => !x.endsWith('.json'));
  const nomes = await readdir(path.join(dir, h));
  const rdv = decodificarArquivo(arquivoRdv, await readFile(path.join(dir, h, nomes.find((n) => n.endsWith('-rdv.dat')))));
  const L = {};
  for (const e of rdv.rdv.eleicoes.eleicoesSA ?? []) {
    if (e.origemVotosSA !== 'cedula') continue;
    for (const c of e.votosCargos) L[c.idCargo.cargoConstitucional] = { votos: c.votos, cedula: e.tipoCedulaSA, eleicao: e.idEleicao };
  }
  const aleatorio = geradorFixo(29);
  const df = L.deputadoFederal.votos.map(classe);
  const de = L.deputadoEstadual.votos.map(classe);
  const gov = L.governador.votos.map(classe);
  const pres = L.presidente.votos.map(classe);
  const sen = L.senador.votos;
  const n = gov.length;
  const parSen = Array.from({ length: n }, (_, i) => {
    const a = classe(sen[2 * i]);
    return a === classe(sen[2 * i + 1]) && (a === 'N' || a === 'B') ? a : 'x';
  });
  let parRepetido = 0;
  let parDeslocadoRepetido = 0;
  const mesmo = (a, b) => a.tipoVoto === 'nominal' && b.tipoVoto === 'nominal' && a.digitacao === b.digitacao;
  for (let i = 0; i < n; i++) if (mesmo(sen[2 * i], sen[2 * i + 1])) parRepetido++;
  for (let i = 0; i + 1 < n; i++) if (mesmo(sen[2 * i + 1], sen[2 * i + 2])) parDeslocadoRepetido++;
  console.log(`${s}: ${n} cédulas; listas ${Object.entries(L).map(([c, x]) => `${c} (eleição ${x.eleicao}, ${x.cedula}, ${x.votos.length})`).join(', ')}`);
  console.log(`  dep. federal × estadual, mesmo partido ou branco/nulo na mesma posição: ${JSON.stringify(permutacao(df, de, iguais, aleatorio))}`);
  console.log(`  dep. federal × estadual, só branco/nulo coincidentes: ${JSON.stringify(permutacao(df, de, bnIguais, aleatorio))}`);
  console.log(`  governador × par de senador, branco/nulo coincidentes: ${JSON.stringify(permutacao(gov, parSen, bnIguais, aleatorio))}`);
  console.log(`  presidente × governador, branco/nulo coincidentes: ${JSON.stringify(permutacao(pres, gov, bnIguais, aleatorio))}`);
  console.log(`  senador: pares (2i, 2i+1) com o mesmo candidato duas vezes: ${parRepetido}; pares deslocados (2i+1, 2i+2): ${parDeslocadoRepetido}`);
}
