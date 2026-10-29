// Cientista político: variação de comparecimento (presidente) entre os turnos por local de votação de um município.
// Agrupa pelo local do 1º turno. Seções que mudaram de local entre os turnos ficam marcadas e fora da conta.
// Uso: node scripts/auditoria/politico-locais-comparecimento.mjs <uf> <cd_municipio_tse> [mínimo de aptos]
// Ex.: node scripts/auditoria/politico-locais-comparecimento.mjs ap 6050 200
import { createReadStream } from 'node:fs';
import readline from 'node:readline';
import { createInflateRaw } from 'node:zlib';
import { ZIPS, entradasZip } from './contagem-zip.mjs';

const [uf, municipio, minimo = '200'] = process.argv.slice(2);
if (!uf || !municipio) { console.error('uso: <uf> <cd_municipio_tse> [mínimo de aptos]'); process.exit(1); }

function campos(l) {
  const out = [];
  let i = 0;
  while (i <= l.length) {
    if (l[i] === '"') { const k = l.indexOf('"', i + 1); out.push(l.slice(i + 1, k)); i = k + 2; }
    else { let k = l.indexOf(';', i); if (k < 0) k = l.length; out.push(l.slice(i, k)); i = k + 1; }
  }
  return out;
}

const e = (await entradasZip(ZIPS.detalheSecao)).find((x) => x.nome === 'detalhe_votacao_secao_2026_BR.csv');
const rl = readline.createInterface({ input: createReadStream(ZIPS.detalheSecao, { start: e.inicioDados, end: e.inicioDados + e.tamanhoComprimido - 1 }).pipe(createInflateRaw()).setEncoding('latin1'), crlfDelay: Infinity });
let col = null;
const secoes = new Map();
const alvo = `;${municipio};`;
for await (const linha of rl) {
  if (!col) { col = Object.fromEntries(campos(linha).map((x, i) => [x, i])); continue; }
  if (!linha.includes(alvo)) continue;
  const c = campos(linha);
  if (c[col.SG_UF].toLowerCase() !== uf || c[col.CD_MUNICIPIO] !== municipio || c[col.CD_CARGO] !== '1') continue;
  const k = `${c[col.NR_ZONA]}/${c[col.NR_SECAO]}`;
  const s = secoes.get(k) ?? {};
  s[c[col.NR_TURNO]] = { local: `${c[col.NR_ZONA]} | ${c[col.NM_LOCAL_VOTACAO]} | ${c[col.DS_LOCAL_VOTACAO_ENDERECO]}`, aptos: +c[col.QT_APTOS], comp: +c[col.QT_COMPARECIMENTO] };
  secoes.set(k, s);
}
const locais = new Map();
let mudaram = 0;
for (const s of secoes.values()) {
  if (!s[1] || !s[2]) continue;
  if (s[1].local !== s[2].local) { mudaram++; continue; }
  const g = locais.get(s[1].local) ?? { aptos: 0, c1: 0, c2: 0, secoes: 0 };
  g.aptos += s[1].aptos; g.c1 += s[1].comp; g.c2 += s[2].comp; g.secoes++;
  locais.set(s[1].local, g);
}
const lista = [...locais].filter(([, g]) => g.aptos >= Number(minimo)).map(([local, g]) => ({ local, ...g, variacaoPp: +(100 * (g.c2 - g.c1) / g.aptos).toFixed(1) }))
  .sort((a, b) => a.variacaoPp - b.variacaoPp);
console.log(JSON.stringify({ uf, municipio, secoes: secoes.size, mudaramDeLocal: mudaram, locais: lista.length }));
for (const l of lista.slice(0, 15)) console.log(`${l.variacaoPp}\t${l.secoes} seç.\t${l.aptos} aptos\t${l.local}`);
