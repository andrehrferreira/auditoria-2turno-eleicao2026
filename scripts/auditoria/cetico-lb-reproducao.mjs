// Revisor cético, achado "linha-de-base-2018-2022" (cientista-politico/04). Reprodução independente:
// leitor zip próprio (não usa contagem-zip.mjs), soma de presidente no munzona de 2018, 2022 e 2026, com
// checagens que o script do autor não faz: linhas duplicadas, destinação dos votos, nominais × nominais válidos,
// SQ_CANDIDATO por número, números com voto só num turno. Em 2026 decompõe o +4,0% de nominais em
// comparecimento × brancos/nulos pelo detalhe_votacao_secao_2026_BR (seção a seção), por região.
// 2018 e 2022: o repo não tem detalhe; usa os totais oficiais nacionais publicados pelo TSE como REFERÊNCIA
// EXTERNA (constantes abaixo, conferidas pela identidade válidos + brancos + nulos = comparecimento e pelos
// válidos que o munzona do repo reproduz). Não são dado do repo: tratar como Hipótese até baixar o detalhe.
//
// Uso: node scripts/auditoria/cetico-lb-reproducao.mjs
// Saída: data/parsed/auditoria/cetico/lb-reproducao.json
import { createReadStream, writeFileSync, mkdirSync } from 'node:fs';
import { open } from 'node:fs/promises';
import readline from 'node:readline';
import { createInflateRaw } from 'node:zlib';

const DIR = 'data/raw/dadosabertos';
const SAIDA = 'data/parsed/auditoria/cetico/lb-reproducao.json';
const REG = { ac: 'N', am: 'N', ap: 'N', pa: 'N', ro: 'N', rr: 'N', to: 'N', al: 'NE', ba: 'NE', ce: 'NE', ma: 'NE', pb: 'NE', pe: 'NE', pi: 'NE', rn: 'NE', se: 'NE', df: 'CO', go: 'CO', ms: 'CO', mt: 'CO', es: 'SE', mg: 'SE', rj: 'SE', sp: 'SE', pr: 'S', rs: 'S', sc: 'S', zz: 'EX' };
// Referência externa (TSE, resultado oficial nacional de presidente). comp = válidos + brancos + nulos.
const OFICIAL = {
  2018: { 1: { validos: 107050749, brancos: 3106937, nulos: 7206205 }, 2: { validos: 104838753, brancos: 2486593, nulos: 8608105 } },
  2022: { 1: { validos: 118229719, brancos: 1964779, nulos: 3487874 }, 2: { validos: 118552353, brancos: 1769678, nulos: 3930765 } },
};

async function entradas(zip) {
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
  const out = [];
  for (let k = 0, o = 0; k < total; k++) {
    const metodo = cd.readUInt16LE(o + 10);
    let comp = cd.readUInt32LE(o + 20), desc = cd.readUInt32LE(o + 24);
    const ln = cd.readUInt16LE(o + 28), le = cd.readUInt16LE(o + 30), lc = cd.readUInt16LE(o + 32);
    let local = cd.readUInt32LE(o + 42);
    const nome = cd.toString('utf8', o + 46, o + 46 + ln);
    let x = o + 46 + ln; const fim = x + le;
    while (x < fim) {
      const id = cd.readUInt16LE(x), sz = cd.readUInt16LE(x + 2);
      if (id === 1) { let y = x + 4; if (desc === 0xffffffff) { desc = Number(cd.readBigUInt64LE(y)); y += 8; } if (comp === 0xffffffff) { comp = Number(cd.readBigUInt64LE(y)); y += 8; } if (local === 0xffffffff) local = Number(cd.readBigUInt64LE(y)); }
      x += 4 + sz;
    }
    out.push({ nome, metodo, comp, local });
    o = fim + lc;
  }
  for (const e of out) { const lh = Buffer.alloc(30); await h.read(lh, 0, 30, e.local); e.dados = e.local + 30 + lh.readUInt16LE(26) + lh.readUInt16LE(28); }
  await h.close();
  return out;
}
const tira = (s) => (s.length >= 2 && s[0] === '"' ? s.slice(1, -1) : s); // campos do TSE não têm ; dentro de aspas nestes arquivos
async function* linhas(zip, nome) {
  const e = (await entradas(zip)).find((x) => x.nome === nome);
  if (!e) throw new Error(`${nome} ausente de ${zip}`);
  let f = createReadStream(zip, { start: e.dados, end: e.dados + e.comp - 1 });
  if (e.metodo === 8) f = f.pipe(createInflateRaw());
  const rl = readline.createInterface({ input: f.setEncoding('latin1'), crlfDelay: Infinity });
  let col = null, bruto = 0;
  for await (const l of rl) {
    if (!l) continue;
    const c = l.split(';').map(tira);
    if (!col) { col = Object.fromEntries(c.map((v, i) => [v, i])); continue; }
    if (c.length !== Object.keys(col).length) bruto++;
    yield [c, col, bruto];
  }
}
const pct = (x) => +(100 * x).toFixed(2);
const out = { geradoEm: new Date().toISOString(), munzona: {}, detalhe2026: null, decomposicao: {} };

for (const ano of [2018, 2022, 2026]) {
  const zip = `${DIR}/votacao_candidato_munzona/votacao_candidato_munzona_${ano}.zip`;
  const tot = { 1: {}, 2: {} }, totValidos = { 1: {}, 2: {} }, dest = {}, sq = {}, chaves = new Set();
  const reg = {}; let dup = 0, colunasRuins = 0, linhasP = 0;
  for await (const [c, col, ruins] of linhas(zip, `votacao_candidato_munzona_${ano}_BR.csv`)) {
    colunasRuins = ruins;
    if (c[col.CD_CARGO] !== '1') continue;
    linhasP++;
    const t = c[col.NR_TURNO], nr = c[col.NR_CANDIDATO], uf = c[col.SG_UF].toLowerCase();
    const k = [t, c[col.CD_MUNICIPIO], c[col.NR_ZONA], c[col.SQ_CANDIDATO], c[col.ST_VOTO_EM_TRANSITO]].join('|');
    if (chaves.has(k)) dup++; else chaves.add(k);
    const q = +c[col.QT_VOTOS_NOMINAIS], qv = +c[col.QT_VOTOS_NOMINAIS_VALIDOS];
    tot[t][nr] = (tot[t][nr] ?? 0) + q;
    totValidos[t][nr] = (totValidos[t][nr] ?? 0) + qv;
    (sq[nr] ??= new Set()).add(c[col.SQ_CANDIDATO]);
    const d = `${t}|${c[col.NM_TIPO_DESTINACAO_VOTOS]}|${c[col.ST_VOTO_EM_TRANSITO]}`; dest[d] = (dest[d] ?? 0) + q;
    const r = REG[uf] ?? '?'; reg[r] ??= { 1: 0, 2: 0 }; reg[r][t] += q;
  }
  const s = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const fin = Object.keys(tot[2]).filter((nr) => tot[2][nr] > 0);
  const delta = Object.fromEntries(fin.map((nr) => [nr, tot[2][nr] - (tot[1][nr] ?? 0)]));
  const [A, B] = fin.sort((x, y) => delta[y] - delta[x]);
  const v1 = s(tot[1]), v2 = s(tot[2]);
  const E = v1 - (tot[1][A] ?? 0) - (tot[1][B] ?? 0);
  out.munzona[ano] = {
    linhasPresidente: linhasP, linhasDuplicadas: dup, linhasComColunasErradas: colunasRuins, destinacao: dest,
    nominaisIgualValidos: s(tot[1]) === s(totValidos[1]) && s(tot[2]) === s(totValidos[2]),
    numerosComMaisDeUmSQ: Object.entries(sq).filter(([, v]) => v.size > 1).map(([k, v]) => `${k}:${v.size}`),
    finalistas2t: fin, A, B, totais: tot,
    dA: delta[A], dB: delta[B], E, nominais1: v1, nominais2: v2,
    parteA: pct(delta[A] / (delta[A] + delta[B])), dAsobreE: pct(delta[A] / E), dNominais: pct((v2 - v1) / v1),
    regioes: Object.fromEntries(Object.entries(reg).map(([r, v]) => [r, { n1: v[1], n2: v[2], dPct: pct((v[2] - v[1]) / v[1]) }])),
  };
  console.log(ano, 'A', A, 'B', B, 'parteA', out.munzona[ano].parteA, 'dNominais', out.munzona[ano].dNominais, 'dup', dup, 'dest', JSON.stringify(dest));
}

// 2026: detalhe por seção, presidente, os dois turnos
{
  const z = `${DIR}/detalhe_votacao_secao/detalhe_votacao_secao_2026.zip`;
  const campos = ['QT_APTOS', 'QT_COMPARECIMENTO', 'QT_ABSTENCOES', 'QT_VOTOS_NOMINAIS', 'QT_VOTOS_BRANCOS', 'QT_VOTOS_NULOS', 'QT_VOTOS_LEGENDA', 'QT_VOTOS_ANULADOS_APU_SEP'];
  const agg = {}; const outros = {}; const chaves = new Set(); let dup = 0, inconsist = 0;
  for await (const [c, col] of linhas(z, 'detalhe_votacao_secao_2026_BR.csv')) {
    if (c[col.CD_CARGO] !== '1') continue;
    const t = c[col.NR_TURNO], uf = c[col.SG_UF].toLowerCase();
    const k = [t, uf, c[col.CD_MUNICIPIO], c[col.NR_ZONA], c[col.NR_SECAO]].join('|');
    if (chaves.has(k)) dup++; else chaves.add(k);
    const v = campos.map((f) => +c[col[f]]);
    if (v[1] !== v[3] + v[4] + v[5] + v[6] + v[7]) inconsist++;
    for (const r of [REG[uf] ?? '?', 'BR']) {
      const a = (agg[`${t}|${r}`] ??= Object.fromEntries(campos.map((f) => [f, 0])));
      campos.forEach((f, i) => { a[f] += v[i]; });
    }
    const o = `${t}|${c[col.DS_ORIGEM_VOTO]}|instalada=${c[col.ST_SECAO_INSTALADA]}|anulada=${c[col.ST_SECAO_ANULADA]}`;
    outros[o] = (outros[o] ?? 0) + 1;
  }
  out.detalhe2026 = { agregados: agg, origem: outros, secoesDuplicadas: dup, secoesComparecimentoNaoFecha: inconsist };
  for (const r of ['BR', 'N', 'NE', 'SE', 'S', 'CO', 'EX']) {
    const a = agg[`1|${r}`], b = agg[`2|${r}`];
    if (!a || !b) continue;
    const bn1 = a.QT_VOTOS_BRANCOS + a.QT_VOTOS_NULOS, bn2 = b.QT_VOTOS_BRANCOS + b.QT_VOTOS_NULOS;
    const dNom = b.QT_VOTOS_NOMINAIS - a.QT_VOTOS_NOMINAIS, dComp = b.QT_COMPARECIMENTO - a.QT_COMPARECIMENTO;
    out.decomposicao[`2026 ${r}`] = {
      aptos1: a.QT_APTOS, aptos2: b.QT_APTOS, comp1: a.QT_COMPARECIMENTO, comp2: b.QT_COMPARECIMENTO,
      dNominaisPct: pct(dNom / a.QT_VOTOS_NOMINAIS), dComparecimentoPct: pct(dComp / a.QT_COMPARECIMENTO),
      comparecimentoPp: [pct(a.QT_COMPARECIMENTO / a.QT_APTOS), pct(b.QT_COMPARECIMENTO / b.QT_APTOS)],
      brancosNulosPctComp: [pct(bn1 / a.QT_COMPARECIMENTO), pct(bn2 / b.QT_COMPARECIMENTO)],
      parteDoDNominaisVindaDeComparecimento: pct(dComp / dNom), parteVindaDeQuedaBN: pct((bn1 - bn2) / dNom),
      nominaisAComparecimentoConstante: pct((b.QT_VOTOS_NOMINAIS / b.QT_COMPARECIMENTO) * a.QT_COMPARECIMENTO / a.QT_VOTOS_NOMINAIS - 1),
    };
  }
}
for (const ano of [2018, 2022]) {
  const o = OFICIAL[ano]; const c1 = o[1].validos + o[1].brancos + o[1].nulos, c2 = o[2].validos + o[2].brancos + o[2].nulos;
  const dNom = o[2].validos - o[1].validos;
  out.decomposicao[`${ano} BR (referência externa)`] = {
    validosBatemComMunzona: o[1].validos === out.munzona[ano].nominais1 && o[2].validos === out.munzona[ano].nominais2,
    comp1: c1, comp2: c2, dNominaisPct: pct(dNom / o[1].validos), dComparecimentoPct: pct((c2 - c1) / c1),
    brancosNulosPctComp: [pct((o[1].brancos + o[1].nulos) / c1), pct((o[2].brancos + o[2].nulos) / c2)],
    nominaisAComparecimentoConstante: pct((o[2].validos / c2) * c1 / o[1].validos - 1),
  };
}
mkdirSync('data/parsed/auditoria/cetico', { recursive: true });
writeFileSync(SAIDA, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.decomposicao, null, 1));
console.log(JSON.stringify({ dup: out.detalhe2026.secoesDuplicadas, naoFecha: out.detalhe2026.secoesComparecimentoNaoFecha, origem: out.detalhe2026.origem }, null, 1));
for (const a of [2018, 2022, 2026]) console.log(a, JSON.stringify(out.munzona[a].regioes), out.munzona[a].numerosComMaisDeUmSQ, 'nom=val', out.munzona[a].nominaisIgualValidos, 'colErr', out.munzona[a].linhasComColunasErradas);
