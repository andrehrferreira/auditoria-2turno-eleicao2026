// Revisor cético, achado "linha-de-base-2018-2022", consolidação dos três vereditos.
// Confere os pontos em que os revisores divergiram, com o detalhe_votacao_secao_2026_BR (universo completo, presidente):
//  (a) tamanho exato da queda de brancos+nulos (-1,85 mi x -1,82 mi) e onde entram os 5.246 votos do nº 28;
//  (b) os dois contrafactuais (comparecimento fixo x fração de brancos/nulos fixa);
//  (c) aptos por UF e por seção entre turnos: o total nacional é igual, mas as regiões diferem em centenas.
// Uso: node scripts/auditoria/cetico-lbc-consolidacao.mjs   Saída: data/parsed/auditoria/cetico/lbc-consolidacao.json
// Leitor de zip próprio (mesma técnica do cetico-lb-reproducao.mjs), sem dependências.
import { createReadStream, writeFileSync } from 'node:fs';
import { open } from 'node:fs/promises';
import readline from 'node:readline';
import { createInflateRaw } from 'node:zlib';

const ZIP = 'data/raw/dadosabertos/detalhe_votacao_secao/detalhe_votacao_secao_2026.zip';
const SAIDA = 'data/parsed/auditoria/cetico/lbc-consolidacao.json';
const NOM_MUNZONA_1T = 119300788; // votos nominais de presidente no munzona do 1º turno (sem o nº 28)

async function entrada(zip, nome) {
  const h = await open(zip, 'r');
  const { size } = await h.stat();
  const n = Math.min(size, 65557);
  const t = Buffer.alloc(n); await h.read(t, 0, n, size - n);
  let i = t.length - 22; while (i >= 0 && t.readUInt32LE(i) !== 0x06054b50) i--;
  let total = t.readUInt16LE(i + 10), tam = t.readUInt32LE(i + 12), off = t.readUInt32LE(i + 16);
  if (off === 0xffffffff || total === 0xffff || tam === 0xffffffff) {
    const loc = Buffer.alloc(20); await h.read(loc, 0, 20, size - n + i - 20);
    const e = Buffer.alloc(56); await h.read(e, 0, 56, Number(loc.readBigUInt64LE(8)));
    total = Number(e.readBigUInt64LE(32)); tam = Number(e.readBigUInt64LE(40)); off = Number(e.readBigUInt64LE(48));
  }
  const cd = Buffer.alloc(tam); await h.read(cd, 0, tam, off);
  let achado = null;
  for (let k = 0, o = 0; k < total; k++) {
    const metodo = cd.readUInt16LE(o + 10);
    let comp = cd.readUInt32LE(o + 20), desc = cd.readUInt32LE(o + 24), local = cd.readUInt32LE(o + 42);
    const ln = cd.readUInt16LE(o + 28), le = cd.readUInt16LE(o + 30), lc = cd.readUInt16LE(o + 32);
    const nm = cd.toString('utf8', o + 46, o + 46 + ln);
    let x = o + 46 + ln; const fim = x + le;
    while (x < fim) {
      const id = cd.readUInt16LE(x), sz = cd.readUInt16LE(x + 2);
      if (id === 1) {
        let y = x + 4;
        if (desc === 0xffffffff) { desc = Number(cd.readBigUInt64LE(y)); y += 8; }
        if (comp === 0xffffffff) { comp = Number(cd.readBigUInt64LE(y)); y += 8; }
        if (local === 0xffffffff) local = Number(cd.readBigUInt64LE(y));
      }
      x += 4 + sz;
    }
    if (nm === nome) achado = { metodo, comp, local };
    o = fim + lc;
  }
  if (!achado) throw new Error(`${nome} ausente de ${zip}`);
  const lh = Buffer.alloc(30); await h.read(lh, 0, 30, achado.local);
  achado.dados = achado.local + 30 + lh.readUInt16LE(26) + lh.readUInt16LE(28);
  await h.close();
  return achado;
}

const e = await entrada(ZIP, 'detalhe_votacao_secao_2026_BR.csv');
let f = createReadStream(ZIP, { start: e.dados, end: e.dados + e.comp - 1 });
if (e.metodo === 8) f = f.pipe(createInflateRaw());
const rl = readline.createInterface({ input: f.setEncoding('latin1'), crlfDelay: Infinity });
const tira = (s) => (s.length >= 2 && s[0] === '"' ? s.slice(1, -1) : s);
const C = ['QT_APTOS', 'QT_COMPARECIMENTO', 'QT_VOTOS_NOMINAIS', 'QT_VOTOS_BRANCOS', 'QT_VOTOS_NULOS'];
let col = null;
const uf = {};
const secoes = { 1: new Map(), 2: new Map() };
for await (const l of rl) {
  if (!l) continue;
  const c = l.split(';').map(tira);
  if (!col) { col = Object.fromEntries(c.map((v, i) => [v, i])); continue; }
  if (c[col.CD_CARGO] !== '1') continue;
  const t = c[col.NR_TURNO], u = c[col.SG_UF].toLowerCase();
  const a = (uf[`${t}|${u}`] ??= Object.fromEntries(C.map((k) => [k, 0])));
  for (const k of C) a[k] += +c[col[k]];
  secoes[t].set([u, c[col.CD_MUNICIPIO], c[col.NR_ZONA], c[col.NR_SECAO]].join('|'), +c[col.QT_APTOS]);
}

const ufs = [...new Set(Object.keys(uf).map((k) => k.split('|')[1]))].sort();
const aptosUF = {};
for (const u of ufs) {
  const d = (uf[`2|${u}`]?.QT_APTOS ?? 0) - (uf[`1|${u}`]?.QT_APTOS ?? 0);
  if (d) aptosUF[u] = d;
}
let secMudou = 0, somaAbs = 0, somaLiq = 0, so1 = 0, so2 = 0;
const exemplos = [];
for (const [k, v] of secoes[1]) {
  if (!secoes[2].has(k)) { so1++; continue; }
  const d = secoes[2].get(k) - v;
  if (d) { secMudou++; somaAbs += Math.abs(d); somaLiq += d; if (exemplos.length < 8) exemplos.push({ secao: k, aptos1: v, aptos2: secoes[2].get(k) }); }
}
for (const k of secoes[2].keys()) if (!secoes[1].has(k)) so2++;

const br = (t) => ufs.reduce((s, u) => { const a = uf[`${t}|${u}`]; if (a) for (const k of C) s[k] += a[k]; return s; }, Object.fromEntries(C.map((k) => [k, 0])));
const b1 = br('1'), b2 = br('2');
const bn1 = b1.QT_VOTOS_BRANCOS + b1.QT_VOTOS_NULOS, bn2 = b2.QT_VOTOS_BRANCOS + b2.QT_VOTOS_NULOS;
const v28 = b1.QT_VOTOS_NOMINAIS - NOM_MUNZONA_1T;
const pct = (x) => +(100 * x).toFixed(3);
const r = {
  geradoEm: new Date().toISOString(),
  brasil: { t1: b1, t2: b2 },
  votos28_contadosComoNominaisNoDetalhe: v28,
  quedaBrancosNulos_detalhe: bn2 - bn1,
  quedaBrancosNulos_com28comoNulo: bn2 - (bn1 + v28),
  dComparecimento: b2.QT_COMPARECIMENTO - b1.QT_COMPARECIMENTO,
  dNominaisPct_munzona: pct(b2.QT_VOTOS_NOMINAIS / NOM_MUNZONA_1T - 1),
  dNominaisPct_detalhe: pct(b2.QT_VOTOS_NOMINAIS / b1.QT_VOTOS_NOMINAIS - 1),
  // contrafactual 1: comparecimento do 1º turno, fração de brancos/nulos do 2º (só a queda de brancos/nulos age)
  contrafactual_comparecimentoFixo_pct: pct((b1.QT_COMPARECIMENTO * (1 - bn2 / b2.QT_COMPARECIMENTO)) / b1.QT_VOTOS_NOMINAIS - 1),
  // contrafactual 2: fração de brancos/nulos do 1º turno, comparecimento do 2º (só o comparecimento age)
  contrafactual_fracaoBNFixa_pct: pct((b2.QT_COMPARECIMENTO * (1 - bn1 / b1.QT_COMPARECIMENTO)) / b1.QT_VOTOS_NOMINAIS - 1),
  aptos: {
    difPorUF_2Tmenos1T: aptosUF,
    somaDifUF: Object.values(aptosUF).reduce((a, b) => a + b, 0),
    secoes1T: secoes[1].size, secoes2T: secoes[2].size, secoesSo1T: so1, secoesSo2T: so2,
    secoesComAptosDiferentes: secMudou, somaAbsDif: somaAbs, somaLiqDif: somaLiq, exemplos,
  },
};
writeFileSync(SAIDA, JSON.stringify(r, null, 1));
console.log(JSON.stringify(r, null, 1));
