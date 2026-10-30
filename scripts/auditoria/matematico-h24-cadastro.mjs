// Matemático forense, H24: cadastro da seção (dados abertos) × aptos do BU, por turno. Universo completo.
// Fato de partida (h24-resultado.json, V5): o "eleitorado da eleição federal" dos dados abertos é igual aos aptos do BU
// em todas as seções; o "eleitorado da seção" não é igual aos aptos da seção do BU. A leitura: o eleitorado da seção é o
// cadastro; os aptos da seção do BU são o cadastro MENOS quem pediu para votar em trânsito noutro lugar (saída).
// Invariantes que essa leitura impõe (cada violação é contada):
//  C1 saída = eleitorado da seção (abertos) − aptos da seção (BU) ≥ 0 em cada seção e turno
//     (aptos da seção acima do cadastro seria eleitor a mais);
//  C2 o eleitorado da seção (cadastro) é o mesmo nos dois turnos;
//  C3 Σ saídas = Σ entradas (aptos em trânsito, TTE) em cada turno: cada eleitor em trânsito sai de uma seção e entra
//     em outra, e só nas seções do universo (exterior incluído).
// Seção agregada: soma na principal (tabela secao_agregada).
// Uso: node scripts/auditoria/matematico-h24-cadastro.mjs → data/parsed/auditoria/matematico-forense/h24-cadastro.json
import { createReadStream } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { SAIDA, chave } from './matematico-h23-lib.mjs';

const FED = { 1: 6257, 2: 6258 };
const A = new Map();
for await (const l of createInterface({ input: createReadStream(path.join(SAIDA, 'h24-atributos.jsonl')), crlfDelay: Infinity })) if (l) { const o = JSON.parse(l); A.set(o.k, o); }
const { db, fonte } = await abrirLeitura();
const agregadas = new Map();
for (const r of db.prepare('SELECT turno, uf, municipio, zona, secao, secao_principal FROM secao_agregada').iterate()) {
  const kp = `${r.turno}|${r.uf}/${r.municipio}/${r.zona}/${String(r.secao_principal).padStart(4, '0')}`;
  (agregadas.get(kp) ?? agregadas.set(kp, []).get(kp)).push(chave(r));
}
const R = { fonte };
const cad = { 1: new Map(), 2: new Map() };
for (const t of [1, 2]) {
  const o = { secoes: 0, somaSaidas: 0, somaTTE: 0, somaCadastro: 0, somaAptosSecao: 0, C1violacoes: 0, C1exemplos: [], saidaPorFaixa: {}, maiorSaida: null };
  for (const r of db.prepare('SELECT uf, municipio, zona, secao, aptos, aptos_secao, aptos_tte FROM secao_eleicao WHERE turno = ? AND eleicao = ?').iterate(t, FED[t])) {
    const k = chave(r);
    const ks = [k, ...(agregadas.get(`${t}|${k}`) ?? [])];
    const linhas = ks.map((x) => A.get(x)?.[`t${t}`]).filter(Boolean);
    if (!linhas.length) continue;
    const cadastro = linhas.reduce((a, x) => a + x.qtSecao, 0);
    cad[t].set(k, cadastro);
    const saida = cadastro - r.aptos_secao;
    o.secoes++; o.somaSaidas += saida; o.somaTTE += r.aptos_tte; o.somaCadastro += cadastro; o.somaAptosSecao += r.aptos_secao;
    if (saida < 0) { o.C1violacoes++; if (o.C1exemplos.length < 20) o.C1exemplos.push({ k, cadastro, aptosSecao: r.aptos_secao, tte: r.aptos_tte }); }
    const f = saida < 0 ? '<0' : saida === 0 ? '0' : saida <= 2 ? '1-2' : saida <= 9 ? '3-9' : saida <= 49 ? '10-49' : '50+';
    o.saidaPorFaixa[f] = (o.saidaPorFaixa[f] ?? 0) + 1;
    if (!o.maiorSaida || saida > o.maiorSaida.saida) o.maiorSaida = { k, saida, cadastro, aptosSecao: r.aptos_secao };
  }
  o.C3vale = o.somaSaidas === o.somaTTE;
  R[`${t}t`] = o;
}
db.close();
let iguais = 0; let diferentes = 0; const ex = [];
for (const [k, c1] of cad[1]) {
  const c2 = cad[2].get(k);
  if (c2 === undefined) continue;
  if (c1 === c2) iguais++; else { diferentes++; if (ex.length < 20) ex.push({ k, cadastro1t: c1, cadastro2t: c2 }); }
}
R.C2 = { iguais, diferentes, exemplos: ex };
await writeFile(path.join(SAIDA, 'h24-cadastro.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, (c, v) => (c === 'C1exemplos' || c === 'exemplos' ? v.slice(0, 5) : v), 1));
