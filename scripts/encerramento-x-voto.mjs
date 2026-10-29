// Tabela que circula (29/10/2026): "nas urnas que fecharam até 17:00 Flávio teve +1,4 milhão; nas que fecharam de
// 17:01 em diante, Lula +5,8 milhões". Reproduz a tabela pelo horário de encerramento do BU, de dois jeitos:
//   (a) horário cru da urna, que é o relógio LOCAL (doc 06);
//   (b) convertido para Brasília pelo fuso de cada município (tabela do Auditor C, docs/analysis/linha-do-tempo/01).
// Sem converter, as seções de AC, AM, MS, MT, RO e RR (15h/16h locais = 17h de Brasília) caem todas em "até 17:00".
// Uso: node scripts/encerramento-x-voto.mjs
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../src/banco-leitura.js';
import { DIR_DADOS } from '../src/config.js';

const fuso = new Map();
for (const l of (await readFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'tempo', '2t', 'fuso-municipio.csv'), 'utf8')).split(/\r?\n/).slice(1)) {
  const c = l.split(',');
  if (c.length > 6) fuso.set(`${c[0]}/${c[1]}`, Number(c[6]));
}
const { db } = await abrirLeitura();
const votos = new Map();
for (const r of db.prepare("select uf, municipio, zona, secao, numero, sum(quantidade) q from voto_bu where turno = 2 and cargo = 1 and eleicao = 6258 and numero in (13, 22) group by 1,2,3,4,5").iterate()) {
  const k = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
  const v = votos.get(k) ?? { l: 0, f: 0 };
  if (r.numero === 13) v.l = r.q; else v.f = r.q;
  votos.set(k, v);
}
const FAIXAS = [['até 17:00:00', 0, 61200], ['17:00:01 a 17:00:59', 61201, 61259], ['17:01 a 17:01:59', 61260, 61319], ['17:02 a 19:00', 61320, 68400], ['após 19:00', 68401, Infinity]];
const tabela = (nome) => Object.fromEntries(FAIXAS.map(([n]) => [n, { secoes: 0, f: 0, l: 0, ufsForaDeBrasilia: 0 }]));
const crua = tabela();
const brasilia = tabela();
let semHora = 0, semFuso = 0;
const seg = (t) => { const m = /(\d\d):(\d\d):(\d\d)$/.exec(t ?? ''); return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : null; };
for (const r of db.prepare("select uf, municipio, zona, secao, encerramento from secao where turno = 2 and uf <> 'zz'").iterate()) {
  const v = votos.get(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`);
  const t = seg(r.encerramento);
  if (!v || t === null) { semHora++; continue; }
  const d = fuso.get(`${r.uf}/${r.municipio}`);
  if (d === undefined) { semFuso++; continue; }
  for (const [tab, x] of [[crua, t], [brasilia, t - d * 3600]]) {
    const [n] = FAIXAS.find(([, a, b]) => x >= a && x <= b);
    const o = tab[n];
    o.secoes++; o.f += v.f; o.l += v.l;
    if (d !== 0) o.ufsForaDeBrasilia++;
  }
}
const imprimir = (titulo, tab) => {
  console.log(`\n${titulo}`);
  console.log('faixa'.padEnd(22) + 'seções'.padStart(9) + 'Flávio'.padStart(12) + 'Lula'.padStart(12) + 'vantagem'.padStart(18) + '  seções fora do fuso de Brasília');
  let s = 0, f = 0, l = 0;
  for (const [n, o] of Object.entries(tab)) {
    s += o.secoes; f += o.f; l += o.l;
    const van = o.f >= o.l ? `Flávio +${o.f - o.l}` : `Lula +${o.l - o.f}`;
    console.log(n.padEnd(22) + String(o.secoes).padStart(9) + String(o.f).padStart(12) + String(o.l).padStart(12) + van.padStart(18) + String(o.ufsForaDeBrasilia).padStart(10));
  }
  console.log('total'.padEnd(22) + String(s).padStart(9) + String(f).padStart(12) + String(l).padStart(12) + `Lula +${l - f}`.padStart(18));
};
imprimir('(a) horário CRU da urna (relógio local), como na tabela que circula:', crua);
imprimir('(b) horário convertido para Brasília pelo fuso de cada município:', brasilia);
console.log(`\nsem horário ou sem voto: ${semHora}; sem fuso: ${semFuso} (exterior fora)`);

// (c) Composição: dentro do MESMO local de votação, as seções que fecharam no 1º minuto (17:00:xx de Brasília) votam
// diferente das que fecharam depois? Se a diferença sumir, ela vem de quais seções têm fila (tamanho, local), não da hora.
const porLocal = new Map();
for (const r of db.prepare("select uf, municipio, zona, secao, local, encerramento, comparecimento from secao where turno = 2 and uf <> 'zz'").iterate()) {
  const v = votos.get(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`);
  const t = seg(r.encerramento);
  const d = fuso.get(`${r.uf}/${r.municipio}`);
  if (!v || t === null || d === undefined || v.l + v.f === 0) continue;
  const tarde = t - d * 3600 >= 61260;
  const k = `${r.uf}/${r.municipio}/${r.zona}/${r.local}`;
  const o = porLocal.get(k) ?? { cedo: { l: 0, f: 0, n: 0, comp: 0 }, tarde: { l: 0, f: 0, n: 0, comp: 0 } };
  const g = o[tarde ? 'tarde' : 'cedo'];
  g.l += v.l; g.f += v.f; g.n++; g.comp += r.comparecimento;
  porLocal.set(k, o);
}
let locais = 0, peso = 0, soma = 0, compCedo = 0, nCedo = 0, compTarde = 0, nTarde = 0;
for (const o of porLocal.values()) {
  if (!o.cedo.n || !o.tarde.n) continue;
  locais++;
  const pc = o.cedo.l / (o.cedo.l + o.cedo.f);
  const pt = o.tarde.l / (o.tarde.l + o.tarde.f);
  const w = o.cedo.l + o.cedo.f + o.tarde.l + o.tarde.f;
  soma += (pt - pc) * w; peso += w;
  compCedo += o.cedo.comp; nCedo += o.cedo.n; compTarde += o.tarde.comp; nTarde += o.tarde.n;
}
console.log(`\n(c) ${locais} locais de votação com seções dos dois grupos (fechou em 17:00:xx × depois, horário de Brasília):`);
console.log(`  parcela do 13 entre os finalistas, seções que fecharam depois − seções que fecharam no 1º minuto, no mesmo local: ${(100 * soma / peso).toFixed(2)} pontos`);
console.log(`  votantes por seção: fecharam no 1º minuto ${(compCedo / nCedo).toFixed(0)}; fecharam depois ${(compTarde / nTarde).toFixed(0)}`);
