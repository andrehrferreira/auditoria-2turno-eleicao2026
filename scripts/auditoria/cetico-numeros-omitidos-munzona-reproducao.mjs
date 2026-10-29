// Revisor cético, achado "numeros-omitidos-munzona" (docs/analysis/coerencia-contagem/01-bu-x-oficial.md).
// Reprodução independente: não usa contagem-munzona.mjs nem contagem-zip.mjs. Lê o banco (somente leitura), os zips
// dos dados abertos (leitor CSV próprio, com aspas) e os JSON de resultados.tse.jus.br já baixados (data/raw/1t/referencia).
// Perguntas:
//  1. Quantos (UF, cargo, número) têm voto nominal no BU e não aparecem no munzona? Quantos votos?
//  2. Situação desses números no consulta_cand_2026.
//  3. A totalização oficial (JSON de resultados) põe esses votos em "nulo técnico" (vnt)? vn = nulos do BU?
//  4. O detalhe_votacao_secao conta esses votos como nominais? Nulos do detalhe = nulos do BU?
//  5. Presidente nº 28: total nacional no votacao_secao × vnt nacional.
// Uso: node scripts/auditoria/cetico-numeros-omitidos-munzona-reproducao.mjs
// Saída: data/parsed/auditoria/cetico/numeros-omitidos-munzona-*.{csv,json,txt}
import { createReadStream, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { open } from 'node:fs/promises';
import readline from 'node:readline';
import { createInflateRaw } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';

const SAIDA = 'data/parsed/auditoria/cetico';
mkdirSync(SAIDA, { recursive: true });
const log = [];
const p = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };

// ---------- leitor ZIP mínimo (diretório central, ZIP64 só para offsets/tamanhos) ----------
async function entradas(zip) {
  const h = await open(zip, 'r');
  const { size } = await h.stat();
  const n = Math.min(size, 65557);
  const cauda = Buffer.alloc(n);
  await h.read(cauda, 0, n, size - n);
  let i = cauda.length - 22;
  while (i >= 0 && cauda.readUInt32LE(i) !== 0x06054b50) i--;
  let total = cauda.readUInt16LE(i + 10), tamCd = cauda.readUInt32LE(i + 12), offCd = cauda.readUInt32LE(i + 16);
  if (offCd === 0xffffffff || total === 0xffff) {
    const loc = i - 20; // localizador ZIP64
    const offEocd64 = Number(cauda.readBigUInt64LE(loc + 8));
    const e64 = Buffer.alloc(56); await h.read(e64, 0, 56, offEocd64);
    total = Number(e64.readBigUInt64LE(32)); tamCd = Number(e64.readBigUInt64LE(40)); offCd = Number(e64.readBigUInt64LE(48));
  }
  const cd = Buffer.alloc(tamCd); await h.read(cd, 0, tamCd, offCd);
  const out = [];
  for (let k = 0, o = 0; k < total; k++) {
    const metodo = cd.readUInt16LE(o + 10);
    let comp = cd.readUInt32LE(o + 20), descomp = cd.readUInt32LE(o + 24);
    const ln = cd.readUInt16LE(o + 28), le = cd.readUInt16LE(o + 30), lc = cd.readUInt16LE(o + 32);
    let local = cd.readUInt32LE(o + 42);
    const nome = cd.toString('utf8', o + 46, o + 46 + ln);
    let x = o + 46 + ln; const fimx = x + le;
    while (x < fimx) {
      const id = cd.readUInt16LE(x), t = cd.readUInt16LE(x + 2); let y = x + 4;
      if (id === 1) {
        if (descomp === 0xffffffff) { descomp = Number(cd.readBigUInt64LE(y)); y += 8; }
        if (comp === 0xffffffff) { comp = Number(cd.readBigUInt64LE(y)); y += 8; }
        if (local === 0xffffffff) { local = Number(cd.readBigUInt64LE(y)); y += 8; }
      }
      x += 4 + t;
    }
    const lh = Buffer.alloc(30); await h.read(lh, 0, 30, local);
    out.push({ nome, metodo, comp, inicio: local + 30 + lh.readUInt16LE(26) + lh.readUInt16LE(28) });
    o = fimx + lc;
  }
  await h.close();
  return out;
}

// CSV com ';' e aspas (campo entre aspas pode conter ';'), latin1.
function campos(linha) {
  const r = []; let i = 0;
  while (i <= linha.length) {
    if (linha[i] === '"') {
      let v = ''; i++;
      for (;;) {
        const j = linha.indexOf('"', i);
        if (j < 0) { v += linha.slice(i); i = linha.length; break; }
        v += linha.slice(i, j);
        if (linha[j + 1] === '"') { v += '"'; i = j + 2; } else { i = j + 1; break; }
      }
      r.push(v); i++; // pula ';'
    } else {
      const j = linha.indexOf(';', i);
      if (j < 0) { r.push(linha.slice(i)); break; }
      r.push(linha.slice(i, j)); i = j + 1;
    }
  }
  return r;
}
async function* csv(zip, nome, lista) {
  const e = lista.find((x) => x.nome === nome);
  if (!e) throw new Error(`entrada ausente: ${nome}`);
  let s = createReadStream(zip, { start: e.inicio, end: e.inicio + e.comp - 1 });
  if (e.metodo === 8) s = s.pipe(createInflateRaw());
  const rl = readline.createInterface({ input: s.setEncoding('latin1'), crlfDelay: Infinity });
  let cab = null;
  for await (const l of rl) {
    if (!l) continue;
    const c = campos(l);
    if (!cab) { cab = c; continue; }
    if (c.length !== cab.length) throw new Error(`${nome}: linha com ${c.length} campos, cabeçalho ${cab.length}: ${l.slice(0, 200)}`);
    const o = {}; for (let k = 0; k < cab.length; k++) o[cab[k]] = c[k];
    yield o;
  }
}

// ---------- 1. BU (banco) ----------
const db = new DatabaseSync('data/db/eleicao2026.sqlite', { readOnly: true });
const ufs = db.prepare('SELECT uf FROM carga WHERE turno = 1 ORDER BY uf').all().map((r) => r.uf).filter((u) => u !== 'zz');
const UFS_AUTOR = ['ac', 'al', 'am', 'ap', 'ba', 'ce', 'df', 'es', 'go', 'ma', 'mg', 'ms', 'mt'];
p(`UFs do 1º turno carregadas no banco agora: ${ufs.length} (${ufs.join(',')})`);
const CARGOS = [1, 3, 5, 6, 7, 8];
const buZona = new Map();   // uf|mun|zona|cargo|num -> votos
const buNum = new Map();    // uf|cargo|num -> votos
const buTipo = new Map();   // uf|cargo|tipo -> votos
const q1 = db.prepare(`SELECT municipio, zona, cargo, numero, SUM(quantidade) q FROM voto_bu
  WHERE turno = 1 AND uf = ? AND tipo_voto = 'nominal' GROUP BY municipio, zona, cargo, numero`);
const q2 = db.prepare(`SELECT cargo, tipo_voto, SUM(quantidade) q FROM voto_bu WHERE turno = 1 AND uf = ? GROUP BY cargo, tipo_voto`);
const q3 = db.prepare(`SELECT COUNT(*) n, COUNT(DISTINCT municipio||'/'||zona||'/'||secao) s FROM voto_bu WHERE turno = 1 AND uf = ? AND cargo = 1 AND tipo_voto='nulo'`);
const add = (m, k, v) => m.set(k, (m.get(k) ?? 0) + v);
for (const uf of ufs) {
  for (const r of q1.all(uf)) {
    if (!CARGOS.includes(r.cargo)) continue;
    add(buZona, `${uf}|${Number(r.municipio)}|${Number(r.zona)}|${r.cargo}|${r.numero}`, r.q);
    add(buNum, `${uf}|${r.cargo}|${r.numero}`, r.q);
  }
  for (const r of q2.all(uf)) add(buTipo, `${uf}|${r.cargo}|${r.tipo_voto}`, r.q);
  const d = q3.get(uf); if (d.n !== d.s) p(`AVISO ${uf}: ${d.n} linhas de nulo presidente para ${d.s} seções (duplicação?)`);
}
p(`BU: ${buZona.size} chaves zona×número, ${buNum.size} chaves UF×cargo×número`);

// ---------- 2. munzona ----------
const ZM = 'data/raw/dadosabertos/votacao_candidato_munzona/votacao_candidato_munzona_2026.zip';
const lm = await entradas(ZM);
const ofZona = new Map(); const ofNum = new Map(); const ofDest = new Map();
let presNosArquivosUF = 0;
const arqs = ['votacao_candidato_munzona_2026_BR.csv', ...ufs.map((u) => `votacao_candidato_munzona_2026_${u.toUpperCase()}.csv`)];
const nacionalPres = new Map(); // presidente, todas as UFs (BR.csv), número -> votos
for (const nome of arqs) {
  for await (const o of csv(ZM, nome, lm)) {
    if (o.NR_TURNO !== '1') continue;
    const cargo = Number(o.CD_CARGO); const uf = o.SG_UF.toLowerCase(); const num = Number(o.NR_CANDIDATO);
    const q = Number(o.QT_VOTOS_NOMINAIS);
    if (cargo === 1 && nome.endsWith('_BR.csv')) add(nacionalPres, num, q);
    if (cargo === 1 && !nome.endsWith('_BR.csv')) { presNosArquivosUF++; continue; } // evita dupla contagem
    if (!ufs.includes(uf)) continue;
    add(ofZona, `${uf}|${Number(o.CD_MUNICIPIO)}|${Number(o.NR_ZONA)}|${cargo}|${num}`, q);
    add(ofNum, `${uf}|${cargo}|${num}`, q);
    ofDest.set(`${uf}|${cargo}|${num}`, `${o.DS_SITUACAO_CANDIDATURA}/${o.DS_DETALHE_SITUACAO_CAND}/${o.NM_TIPO_DESTINACAO_VOTOS}`);
  }
}
p(`munzona: ${ofZona.size} chaves zona×número; linhas de presidente nos arquivos por UF (ignoradas): ${presNosArquivosUF}`);

// comparação zona a zona
const porCargo = {}; const omitidos = new Map(); let difValor = 0, soOficial = 0, soBu = 0;
for (const k of new Set([...buZona.keys(), ...ofZona.keys()])) {
  const [uf, , , cargo, num] = k.split('|');
  const b = buZona.get(k), o = ofZona.get(k);
  const c = (porCargo[cargo] ??= { pares: 0, iguais: 0, bu: 0, of: 0, soBu: 0 });
  c.pares++; c.bu += b ?? 0; c.of += o ?? 0;
  if (b === o) { c.iguais++; continue; }
  if (b === undefined) { if (o > 0) soOficial++; else c.iguais++; continue; }
  if (o === undefined) { soBu++; c.soBu++; continue; }
  difValor++;
}
p(`pares com valor diferente dos dois lados: ${difValor}; só no oficial com voto > 0: ${soOficial}; só no BU: ${soBu}`);
for (const [c, r] of Object.entries(porCargo)) p(`  cargo ${c}: pares ${r.pares} iguais ${r.iguais} BU ${r.bu} oficial ${r.of} dif ${r.bu - r.of} só no BU ${r.soBu}`);
// números ausentes do munzona inteiro (UF×cargo×número)
for (const [k, v] of buNum) if (!ofNum.has(k)) omitidos.set(k, { votos: v });
// algum número presente no munzona mas com algumas zonas faltando?
let parciais = 0; for (const [k] of buNum) if (ofNum.has(k) && ofNum.get(k) !== buNum.get(k)) parciais++;
p(`números (UF×cargo×nº) ausentes do munzona: ${omitidos.size}; números presentes com total diferente: ${parciais}`);

// ---------- 3. consulta_cand ----------
const ZC = 'data/raw/dadosabertos/consulta_cand/consulta_cand_2026.zip';
const lc = await entradas(ZC);
const cand = new Map(); // uf|cargo|num -> [linhas]
const sitDist = new Map();
let linhasBrasil = 0, linhasBR = 0;
for (const nome of ['consulta_cand_2026_BRASIL.csv', 'consulta_cand_2026_BR.csv']) {
  for await (const o of csv(ZC, nome, lc)) {
    if (o.NR_TURNO !== '1') continue;
    if (nome.endsWith('BRASIL.csv')) linhasBrasil++; else { linhasBR++; if (Number(o.CD_CARGO) !== 1) continue; }
    const cargo = Number(o.CD_CARGO);
    if (cargo === 1 && nome.endsWith('BRASIL.csv')) continue; // presidente vem do BR.csv
    add(sitDist, `${o.DS_SITUACAO_CANDIDATURA}|${o.DS_SIT_TOT_TURNO}`, 1);
    const ufc = cargo === 1 ? 'br' : o.SG_UF.toLowerCase();
    const k = `${ufc}|${cargo}|${Number(o.NR_CANDIDATO)}`;
    if (!cand.has(k)) cand.set(k, []);
    cand.get(k).push({ sq: o.SQ_CANDIDATO, partido: o.SG_PARTIDO, situacao: `${o.CD_SITUACAO_CANDIDATURA} ${o.DS_SITUACAO_CANDIDATURA}`, totTurno: o.DS_SIT_TOT_TURNO, geracao: `${o.DT_GERACAO} ${o.HH_GERACAO}` });
  }
}
p(`consulta_cand 1º turno: ${linhasBrasil} linhas no BRASIL.csv, ${linhasBR} no BR.csv`);
p('distribuição situação candidatura | situação totalização (1º turno, sem presidente duplicado):');
for (const [k, v] of [...sitDist].sort((a, b) => b[1] - a[1])) p(`  ${k}: ${v}`);

// ---------- 4. resultados.tse.jus.br (JSON já baixados) ----------
const REF = 'data/raw/1t/referencia';
const ref = new Map(); // uf|cargo -> {v, nums:Set}
for (const uf of [...ufs, 'br']) for (const cargo of CARGOS) {
  const e = cargo === 1 ? '006257' : '006259';
  if ((cargo === 1) !== (uf === 'br')) continue;
  let j; try { j = JSON.parse(readFileSync(`${REF}/${uf}-c${String(cargo).padStart(4, '0')}-e${e}-u.json`, 'utf8')); } catch { continue; }
  const nums = new Set();
  for (const a of j.carg[0].agr) for (const pp of a.par) for (const c of pp.cand) nums.add(Number(c.n));
  ref.set(`${uf}|${cargo}`, { v: j.v, nums, geracao: `${j.dg} ${j.hg}` });
}

// tabela dos omitidos
const linhasOmit = [];
for (const [k, o] of [...omitidos].sort()) {
  const [uf, cargo, num] = k.split('|');
  const kc = Number(cargo) === 1 ? `br|1|${num}` : k;
  const cs = cand.get(kc) ?? [];
  const r = ref.get(Number(cargo) === 1 ? 'br|1' : `${uf}|${cargo}`);
  linhasOmit.push({ uf, cargo: Number(cargo), numero: Number(num), votos_bu: o.votos, no_json_resultados: r ? r.nums.has(Number(num)) : 'sem json',
    consulta_cand: cs.length ? cs.map((c) => `${c.situacao}; tot=${c.totTurno}; ${c.partido}; sq=${c.sq}`).join(' || ') : 'AUSENTE' });
}
const porCargoOmit = {};
for (const l of linhasOmit) { const c = (porCargoOmit[l.cargo] ??= { n: 0, votos: 0, n13: 0, votos13: 0 }); c.n++; c.votos += l.votos_bu; if (UFS_AUTOR.includes(l.uf)) { c.n13++; c.votos13 += l.votos_bu; } }
p('\nOmitidos por cargo (todas as UFs carregadas | só as 13 UFs do autor):');
let tn = 0, tv = 0, tn13 = 0, tv13 = 0;
for (const [c, r] of Object.entries(porCargoOmit)) { p(`  cargo ${c}: ${r.n} números, ${r.votos} votos | ${r.n13} números, ${r.votos13} votos`); tn += r.n; tv += r.votos; tn13 += r.n13; tv13 += r.votos13; }
p(`  total: ${tn} números, ${tv} votos | ${tn13} números, ${tv13} votos`);
const sitOmit = new Map(); for (const l of linhasOmit) add(sitOmit, l.consulta_cand.replace(/; [A-Z]+[^;]*; sq=\d+/g, '').replace(/ \|\| .*/, ' (+outra linha)'), 1);
p('Situação dos omitidos no consulta_cand:'); for (const [k, v] of [...sitOmit].sort((a, b) => b[1] - a[1])) p(`  ${v}× ${k}`);
p(`Omitidos que aparecem no JSON de resultados: ${linhasOmit.filter((l) => l.no_json_resultados === true).length}`);

// nulos: vn (nulo digitado) × BU nulo; vnt (nulo técnico) × soma dos omitidos
p('\nTotalização oficial (JSON resultados) × BU, por UF e cargo:');
const linhasNulo = [];
let okVn = 0, okVnt = 0, nTot = 0;
for (const uf of ufs) for (const cargo of CARGOS.slice(1)) {
  const r = ref.get(`${uf}|${cargo}`); if (!r) continue;
  nTot++;
  const nuloBu = buTipo.get(`${uf}|${cargo}|nulo`) ?? 0;
  const omit = linhasOmit.filter((l) => l.uf === uf && l.cargo === cargo).reduce((s, l) => s + l.votos_bu, 0);
  const vn = Number(r.v.vn), vnt = Number(r.v.vnt), tvn = Number(r.v.tvn);
  if (vn === nuloBu) okVn++; if (vnt === omit) okVnt++;
  linhasNulo.push({ uf, cargo, nulo_bu: nuloBu, vn_oficial: vn, omitidos_bu: omit, vnt_oficial: vnt, tvn_oficial: tvn, tvn_menos_bu_mais_omit: tvn - (nuloBu + omit), vansj: Number(r.v.vansj), van: Number(r.v.van) });
  if (vn !== nuloBu || vnt !== omit) p(`  DIFERE ${uf} cargo ${cargo}: nulo BU ${nuloBu} vn ${vn}; omitidos ${omit} vnt ${vnt}`);
}
p(`  ${nTot} pares UF×cargo: vn = nulo do BU em ${okVn}; vnt = votos dos omitidos em ${okVnt}`);
const sNB = linhasNulo.reduce((s, l) => s + l.nulo_bu, 0), sOm = linhasNulo.reduce((s, l) => s + l.omitidos_bu, 0), sTvn = linhasNulo.reduce((s, l) => s + l.tvn_oficial, 0);
p(`  soma (sem presidente): tvn oficial ${sTvn} = nulo BU ${sNB} + omitidos ${sOm} = ${sNB + sOm}`);

// ---------- 5. detalhe_votacao_secao: nominais e nulos por UF×cargo ----------
const ZD = 'data/raw/dadosabertos/detalhe_votacao_secao/detalhe_votacao_secao_2026.zip';
const ld = await entradas(ZD);
const det = new Map();
for (const nome of ['detalhe_votacao_secao_2026_BR.csv', ...ufs.map((u) => `detalhe_votacao_secao_2026_${u.toUpperCase()}.csv`)]) {
  for await (const o of csv(ZD, nome, ld)) {
    if (o.NR_TURNO !== '1') continue;
    const uf = o.SG_UF.toLowerCase(); const cargo = Number(o.CD_CARGO);
    if (!ufs.includes(uf)) continue;
    if (cargo === 1 && !nome.endsWith('_BR.csv')) continue;
    const d = det.get(`${uf}|${cargo}`) ?? { nom: 0, nul: 0, bra: 0, leg: 0, apu: 0 };
    d.nom += Number(o.QT_VOTOS_NOMINAIS); d.nul += Number(o.QT_VOTOS_NULOS); d.bra += Number(o.QT_VOTOS_BRANCOS); d.leg += Number(o.QT_VOTOS_LEGENDA); d.apu += Number(o.QT_VOTOS_ANULADOS_APU_SEP);
    det.set(`${uf}|${cargo}`, d);
  }
}
let detOkNom = 0, detOkNul = 0, detN = 0;
for (const [k, d] of det) {
  const [uf, cargo] = k.split('|'); detN++;
  const nom = buTipo.get(`${uf}|${cargo}|nominal`) ?? 0, nul = buTipo.get(`${uf}|${cargo}|nulo`) ?? 0;
  if (d.nom === nom) detOkNom++; else p(`  detalhe ${k}: nominais ${d.nom} BU ${nom}`);
  if (d.nul === nul) detOkNul++; else p(`  detalhe ${k}: nulos ${d.nul} BU ${nul}`);
}
p(`\ndetalhe × BU: ${detN} pares UF×cargo; nominais iguais (incluindo os omitidos) ${detOkNom}; nulos iguais (sem os omitidos) ${detOkNul}`);

// ---------- 6. presidente nº 28 nacional ----------
const ZS = 'data/raw/dadosabertos/votacao_secao/votacao_secao_2026_BR.zip';
const ls = await entradas(ZS);
const pres = new Map(); let nm28 = new Set();
for await (const o of csv(ZS, 'votacao_secao_2026_BR.csv', ls)) {
  if (o.NR_TURNO !== '1' || o.CD_CARGO !== '1') continue;
  const n = Number(o.NR_VOTAVEL); add(pres, n, Number(o.QT_VOTOS));
  if (n === 28) nm28.add(o.NM_VOTAVEL);
}
const rp = ref.get('br|1');
p(`\nPresidente 1º turno nacional: votacao_secao nº 28 = ${pres.get(28)} (NM_VOTAVEL: ${[...nm28].join(' / ')}); nulos (96) = ${pres.get(96)}`);
p(`  JSON resultados br: vn ${rp.v.vn}, vnt ${rp.v.vnt}, tvn ${rp.v.tvn}; nº 28 no JSON: ${rp.nums.has(28)}; nº 28 no munzona BR: ${nacionalPres.get(28) ?? 'ausente'}`);
p(`  consulta_cand nº 28 presidente: ${JSON.stringify(cand.get('br|1|28') ?? 'AUSENTE')}`);
p(`  números de presidente no votacao_secao: ${[...pres.keys()].sort((a, b) => a - b).join(',')}; no munzona BR: ${[...nacionalPres.keys()].sort((a, b) => a - b).join(',')}`);

const cols = Object.keys(linhasOmit[0]);
writeFileSync(`${SAIDA}/numeros-omitidos-munzona-reproducao-lista.csv`, [cols.join(';'), ...linhasOmit.map((l) => cols.map((c) => l[c]).join(';'))].join('\n') + '\n');
const cn = Object.keys(linhasNulo[0]);
writeFileSync(`${SAIDA}/numeros-omitidos-munzona-reproducao-nulos.csv`, [cn.join(';'), ...linhasNulo.map((l) => cn.map((c) => l[c]).join(';'))].join('\n') + '\n');
writeFileSync(`${SAIDA}/numeros-omitidos-munzona-reproducao.txt`, log.join('\n') + '\n');
p(`\nArquivos: ${SAIDA}/numeros-omitidos-munzona-reproducao{-lista.csv,-nulos.csv,.txt}`);
