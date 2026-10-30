// Cético revisor, parecer 40: H03 no 2º turno por caminho próprio.
// Fonte do BU: o texto impresso (imgbu/imgbusa) extraído do zip oficial por cetico-40-extrair.mjs, sem banco e sem bu.dat.
// Fontes oficiais lidas direto dos zips (leitor próprio, sem contagem-zip.mjs) e dos JSON da divulgação.
//   R0 universo: seções do zip × linhas do detalhe (instalada Sim/Não); seção com imgbu e imgbusa ao mesmo tempo.
//   R1 conta interna do BU impresso: Σ candidatos = nominais; nominais + legenda + brancos + nulos = total apurado;
//      aptos = originais + temporários; total do Presidente = comparecimento do cabeçalho (urna).
//   R2 seção × cargo, 6 campos × detalhe_votacao_secao_2026_BRASIL.csv.
//   R3 Presidente por seção e número × votacao_secao_2026_BR.csv (arquivo, não a tabela voto_oficial).
//   R4 zona, município e UF × candidato × votacao_candidato_munzona (arquivos de UF).
//   R5 país (Presidente) e 6 UFs (Governador) × JSON da divulgação: candidatos, c, a, vb, vn, vnt, vnom, tv, te, esi, esni.
//   R6 BU impresso × banco (voto_bu, secao_eleicao, secao): testa a carga que os scripts do matemático usam.
// Uso: node scripts/auditoria/cetico-40-2t-oficial.mjs   Saída: data/parsed/auditoria/cetico/40-2t-oficial-resumo.txt
import { createReadStream, readFileSync, writeFileSync } from 'node:fs';
import { open } from 'node:fs/promises';
import readline from 'node:readline';
import { createInflateRaw } from 'node:zlib';
import { listarEntradas } from '../../src/zip.js';
import { abrirLeitura } from '../../src/banco-leitura.js';

const OUT = 'data/parsed/auditoria/cetico';
const saida = [];
const p = (...x) => { const s = x.join(' '); saida.push(s); console.log(s); };
const f = (x) => Number(x).toLocaleString('pt-BR');
const pad = (v, n) => String(Number(v)).padStart(n, '0');
const ini = Date.now();

async function* csv(zip, nomeEntrada) {
  const h = await open(zip, 'r');
  const e = (await listarEntradas(h)).find((x) => x.nome === nomeEntrada);
  const cab = Buffer.alloc(30); await h.read(cab, 0, 30, e.offsetLocal); await h.close();
  const inicio = e.offsetLocal + 30 + cab.readUInt16LE(26) + cab.readUInt16LE(28);
  let fl = createReadStream(zip, { start: inicio, end: inicio + e.tamanhoComprimido - 1 });
  if (e.metodo === 8) fl = fl.pipe(createInflateRaw());
  const rl = readline.createInterface({ input: fl.setEncoding('latin1'), crlfDelay: Infinity });
  let col = null;
  for await (const l of rl) {
    if (!l) continue;
    const c = l.split(';').map((x) => x.replace(/^"|"$/g, ''));
    if (!col) { col = Object.fromEntries(c.map((n, i) => [n, i])); continue; }
    yield (n) => c[col[n]];
  }
}

// ---------- BU impresso ----------
const bu = new Map(); // seção → registro
const ambos = [];
for (const l of readFileSync(`${OUT}/40-imgbu-2t.jsonl`, 'utf8').split('\n')) {
  if (!l) continue;
  const r = JSON.parse(l);
  if (r.ue && r.sa) ambos.push(r.k);
  bu.set(r.k, r);
}
const fonte = (r) => r.sa ?? r.ue; // se houver SA, é o BU da junta que vale (mesma regra do banco: tipo_arquivo sa*)
const cargoBu = (r, nome) => fonte(r)?.cargos.find((c) => c.cargo === nome);
const NOME = { 1: 'PRESIDENTE', 3: 'GOVERNADOR' };
p(`BU impresso do 2º turno: ${f(bu.size)} seções no zip; com imgbu e imgbusa ao mesmo tempo: ${ambos.length}${ambos.length ? ' ' + ambos.join(', ') : ''}`);
let semTexto = 0, comAviso = 0;
for (const r of bu.values()) { if (!fonte(r)) semTexto++; if (fonte(r)?.avisos) comAviso++; }
p(`  sem BU impresso: ${semTexto}; com linha não reconhecida: ${comAviso}`);

// ---------- R1 conta interna ----------
const r1 = { cargos: 0, somaCands: 0, total: 0, aptos: 0, presComp: 0, govMaiorPres: 0, campoNulo: 0, ex: [] };
for (const r of bu.values()) {
  const b = fonte(r); if (!b) continue;
  for (const c of b.cargos) {
    r1.cargos++;
    if ([c.aptos, c.orig, c.temp, c.nom, c.br, c.nu, c.tot].some((x) => x === null)) { r1.campoNulo++; r1.ex.push(`${r.k} ${c.cargo} campo nulo`); continue; }
    if (c.somaCands !== c.nom) { r1.somaCands++; r1.ex.push(`${r.k} ${c.cargo} Σcand ${c.somaCands} ≠ nom ${c.nom}`); }
    if (c.nom + (c.leg ?? 0) + c.br + c.nu !== c.tot) { r1.total++; r1.ex.push(`${r.k} ${c.cargo} soma ≠ total ${c.tot}`); }
    if (c.orig + c.temp !== c.aptos) { r1.aptos++; r1.ex.push(`${r.k} ${c.cargo} aptos`); }
  }
  const pr = b.cargos.find((c) => c.cargo === 'PRESIDENTE'), gv = b.cargos.find((c) => c.cargo === 'GOVERNADOR');
  if (!b.sa && pr && pr.tot !== b.cab.comp) { r1.presComp++; r1.ex.push(`${r.k} comp ${b.cab.comp} ≠ pres ${pr.tot}`); }
  if (pr && gv && gv.tot > pr.tot) r1.govMaiorPres++;
}
p(`\n== R1. Conta interna do BU impresso ==`);
p(`  ${f(r1.cargos)} seção × cargo; Σ candidatos ≠ nominais ${r1.somaCands}; soma ≠ total apurado ${r1.total}; aptos ≠ originais + temporários ${r1.aptos}; campo ausente ${r1.campoNulo}`);
p(`  urna: total do Presidente ≠ comparecimento do cabeçalho ${r1.presComp}; Governador > Presidente ${r1.govMaiorPres}`);
for (const e of r1.ex.slice(0, 10)) p(`    ${e}`);

// ---------- R2 detalhe ----------
p(`\n== R2. Seção × cargo × detalhe_votacao_secao_2026_BRASIL.csv ==`);
const CAMPOS = ['aptos', 'comp', 'nom', 'br', 'nu', 'leg'];
const r2 = { 1: { linhas: 0, iguais: 0, dif: new Map(), soma: {}, somaOf: {} }, 3: { linhas: 0, iguais: 0, dif: new Map(), soma: {}, somaOf: {} } };
const naoInst = { linhas: 0, aptos: 0, comp: 0, votos: 0, noZip: 0, ufs: new Map() };
const vistos = new Set(); let dup = 0; const exR2 = [];
const instaladaSemBu = [];
for await (const g of csv('data/raw/dadosabertos/detalhe_votacao_secao/detalhe_votacao_secao_2026.zip', 'detalhe_votacao_secao_2026_BRASIL.csv')) {
  if (g('NR_TURNO') !== '2') continue;
  const cargo = Number(g('CD_CARGO'));
  const ks = `${g('SG_UF').toLowerCase()}|${pad(g('CD_MUNICIPIO'), 5)}|${pad(g('NR_ZONA'), 4)}|${pad(g('NR_SECAO'), 4)}`;
  const kk = `${ks}|${cargo}`;
  if (vistos.has(kk)) { dup++; continue; } vistos.add(kk);
  const of = { aptos: +g('QT_APTOS'), comp: +g('QT_COMPARECIMENTO'), nom: +g('QT_VOTOS_NOMINAIS'), br: +g('QT_VOTOS_BRANCOS'), nu: +g('QT_VOTOS_NULOS'), leg: +g('QT_VOTOS_LEGENDA') };
  if (g('ST_SECAO_INSTALADA') !== 'Sim') {
    naoInst.linhas++; naoInst.aptos += of.aptos; naoInst.comp += of.comp; naoInst.votos += of.nom + of.br + of.nu + of.leg;
    naoInst.ufs.set(ks.slice(0, 2), (naoInst.ufs.get(ks.slice(0, 2)) ?? 0) + 1);
    if (bu.has(ks)) naoInst.noZip++;
    continue;
  }
  const t = r2[cargo];
  t.linhas++;
  const r = bu.get(ks);
  const c = r && cargoBu(r, NOME[cargo]);
  if (!c) { instaladaSemBu.push(kk); continue; }
  const b = { aptos: c.aptos, comp: c.tot, nom: c.nom, br: c.br, nu: c.nu, leg: c.leg ?? 0 };
  let ok = true;
  for (const x of CAMPOS) {
    t.soma[x] = (t.soma[x] ?? 0) + b[x]; t.somaOf[x] = (t.somaOf[x] ?? 0) + of[x];
    if (b[x] !== of[x]) { ok = false; t.dif.set(x, (t.dif.get(x) ?? 0) + 1); if (exR2.length < 15) exR2.push(`${kk} ${x}: BU ${b[x]} × oficial ${of[x]}`); }
  }
  if (ok) t.iguais++;
}
// seção × cargo do BU sem linha no detalhe
let buSemDetalhe = 0;
for (const [k, r] of bu) for (const cargo of [1, 3]) if (cargoBu(r, NOME[cargo]) && !vistos.has(`${k}|${cargo}`)) buSemDetalhe++;
p(`  linhas duplicadas ${dup}; não instaladas: ${naoInst.linhas} linhas (${[...naoInst.ufs].map(([u, n]) => `${u} ${n}`).join(', ')}), aptos ${naoInst.aptos}, comparecimento ${naoInst.comp}, votos ${naoInst.votos}, presentes no zip ${naoInst.noZip}`);
p(`  instaladas no detalhe sem BU impresso do cargo: ${instaladaSemBu.length}${instaladaSemBu.length ? ' ' + instaladaSemBu.slice(0, 5).join(', ') : ''}; cargo no BU sem linha no detalhe: ${buSemDetalhe}`);
for (const cargo of [1, 3]) {
  const t = r2[cargo];
  p(`  ${NOME[cargo]}: ${f(t.linhas)} linhas instaladas; iguais nos 6 campos ${f(t.iguais)}; divergências por campo: ${[...t.dif].map(([x, n]) => `${x} ${n}`).join(', ') || 'nenhuma'}`);
  p(`    somas BU impresso: ${CAMPOS.map((x) => `${x} ${f(t.soma[x])}`).join('; ')}`);
  p(`    somas oficial:     ${CAMPOS.map((x) => `${x} ${f(t.somaOf[x])}`).join('; ')}`);
}
for (const e of exR2) p(`    ${e}`);

// ---------- R3 votacao_secao ----------
p(`\n== R3. Presidente por seção e número × votacao_secao_2026_BR.csv ==`);
const vs = new Map(); let geracao = '';
for await (const g of csv('data/raw/dadosabertos/votacao_secao/votacao_secao_2026_BR.zip', 'votacao_secao_2026_BR.csv')) {
  if (g('NR_TURNO') !== '2') continue;
  geracao = `${g('DT_GERACAO')} ${g('HH_GERACAO')}`;
  const k = `${g('SG_UF').toLowerCase()}|${pad(g('CD_MUNICIPIO'), 5)}|${pad(g('NR_ZONA'), 4)}|${pad(g('NR_SECAO'), 4)}`;
  if (g('CD_CARGO') !== '1') { vs.set('outro cargo', (vs.get('outro cargo') ?? 0) + 1); continue; }
  if (!vs.has(k)) vs.set(k, new Map());
  const m = vs.get(k); const n = Number(g('NR_VOTAVEL'));
  m.set(n, (m.get(n) ?? 0) + Number(g('QT_VOTOS')));
}
const outroCargo = vs.get('outro cargo') ?? 0; vs.delete('outro cargo');
let r3sec = 0, r3ig = 0, r3soBu = 0, r3soOf = 0; const r3dif = []; const tot3 = new Map(); const soBuEx = [];
for (const [k, r] of bu) {
  const c = cargoBu(r, 'PRESIDENTE'); if (!c) continue;
  const b = new Map(Object.entries(c.cands).map(([n, v]) => [Number(n), v]));
  b.set(95, c.br); b.set(96, c.nu);
  for (const [n, v] of [...b]) if (v === 0) b.delete(n);
  const o = vs.get(k);
  if (!o) { if (b.size) { r3soBu++; soBuEx.push(k); } else r3ig++; continue; }
  r3sec++;
  let ok = true;
  for (const n of new Set([...b.keys(), ...o.keys()])) {
    const x = b.get(n) ?? 0, y = o.get(n) ?? 0;
    const t = tot3.get(n) ?? [0, 0]; t[0] += x; t[1] += y; tot3.set(n, t);
    if (x !== y) { ok = false; r3dif.push(`${k} nº ${n}: BU ${x} × oficial ${y}`); }
  }
  if (ok) r3ig++;
}
for (const k of vs.keys()) if (!bu.has(k)) r3soOf++;
p(`  arquivo gerado em ${geracao}; linhas de outro cargo: ${outroCargo}; seções no arquivo ${f(vs.size)}; seções comparadas ${f(r3sec)}; iguais (inclui sem voto dos dois lados) ${f(r3ig)}`);
p(`  só no BU (com voto) ${r3soBu}${soBuEx.length ? ' ' + soBuEx.slice(0, 5).join(', ') : ''}; só no oficial ${r3soOf}; divergências ${r3dif.length}`);
for (const [n, t] of [...tot3].sort((a, b) => a[0] - b[0])) p(`    nº ${n}: BU ${f(t[0])} × oficial ${f(t[1])}`);
for (const e of r3dif.slice(0, 10)) p(`    ${e}`);

// ---------- R4 munzona ----------
p(`\n== R4. Candidato por zona, município e UF × votacao_candidato_munzona (arquivos de UF e BR) ==`);
const mzZip = 'data/raw/dadosabertos/votacao_candidato_munzona/votacao_candidato_munzona_2026.zip';
const hz = await open(mzZip, 'r'); const nomesMz = (await listarEntradas(hz)).map((e) => e.nome).filter((n) => /_[A-Z]{2}\.csv$/.test(n)); await hz.close(); // inclui _BR.csv (Presidente)
const mz = new Map(); let linhasMz = 0; const destinos = new Map();
for (const nome of nomesMz) {
  for await (const g of csv(mzZip, nome)) {
    if (g('NR_TURNO') !== '2') continue;
    linhasMz++;
    const k = `${g('SG_UF').toLowerCase()}|${pad(g('CD_MUNICIPIO'), 5)}|${pad(g('NR_ZONA'), 4)}|${Number(g('CD_CARGO'))}|${Number(g('NR_CANDIDATO'))}`;
    mz.set(k, (mz.get(k) ?? 0) + Number(g('QT_VOTOS_NOMINAIS')));
    const d = `${g('NM_TIPO_DESTINACAO_VOTOS')}`; destinos.set(d, (destinos.get(d) ?? 0) + 1);
  }
}
const buZona = new Map();
for (const [k, r] of bu) for (const cargo of [1, 3]) {
  const c = cargoBu(r, NOME[cargo]); if (!c) continue;
  const [uf, mun, zona] = k.split('|');
  for (const [n, v] of Object.entries(c.cands)) { const kk = `${uf}|${mun}|${zona}|${cargo}|${Number(n)}`; buZona.set(kk, (buZona.get(kk) ?? 0) + v); }
}
p(`  ${nomesMz.length} arquivos de UF; linhas do 2º turno ${f(linhasMz)}; destinos: ${[...destinos].map(([d, n]) => `${d} ${n}`).join(', ')}`);
const nivel = (nomeN, fn) => {
  for (const cargo of [1, 3]) {
    const a = new Map(), b = new Map();
    for (const [k, v] of buZona) if (k.split('|')[3] === String(cargo)) { const kk = fn(k); a.set(kk, (a.get(kk) ?? 0) + v); }
    for (const [k, v] of mz) if (k.split('|')[3] === String(cargo)) { const kk = fn(k); b.set(kk, (b.get(kk) ?? 0) + v); }
    let pares = 0, ig = 0; const ex = [];
    for (const kk of new Set([...a.keys(), ...b.keys()])) { pares++; if ((a.get(kk) ?? 0) === (b.get(kk) ?? 0)) ig++; else ex.push(`${kk}: BU ${a.get(kk) ?? '-'} × oficial ${b.get(kk) ?? '-'}`); }
    p(`  ${nomeN.padEnd(9)} ${NOME[cargo].padEnd(10)} pares ${f(pares).padStart(7)}; iguais ${f(ig).padStart(7)}; diferentes ${ex.length}`);
    for (const e of ex.slice(0, 5)) p(`      ${e}`);
  }
};
nivel('zona', (k) => k);
nivel('município', (k) => { const [u, m, , c, n] = k.split('|'); return `${u}|${m}|${c}|${n}`; });
nivel('UF', (k) => { const [u, , , c, n] = k.split('|'); return `${u}|${c}|${n}`; });

// ---------- R5 divulgação ----------
p(`\n== R5. Divulgação (JSON) × soma do BU impresso ==`);
const alvo = [['br', 1, 'br-c0001-e006258-u.json'], ...['ac', 'am', 'df', 'es', 'rn', 'to'].map((u) => [u, 3, `${u}-c0003-e006260-u.json`])];
for (const [abr, cargo, arq] of alvo) {
  const j = JSON.parse(readFileSync(`data/raw/2t/referencia/${arq}`, 'utf8'));
  const cand = new Map();
  for (const a of j.carg[0].agr) for (const pa of a.par) for (const c of pa.cand) cand.set(Number(c.n), { vap: Number(c.vap), dvt: c.dvt });
  const s = { c: 0, vb: 0, vn: 0, vnt: 0, vnom: 0, esi: 0, si: 0, porN: new Map() };
  for (const [k, r] of bu) {
    if (abr !== 'br' && !k.startsWith(`${abr}|`)) continue;
    const c = cargoBu(r, NOME[cargo]); if (!c) continue;
    s.si++; s.c += c.tot; s.vb += c.br; s.vn += c.nu; s.esi += c.aptos;
    for (const [n, v] of Object.entries(c.cands)) { s.porN.set(Number(n), (s.porN.get(Number(n)) ?? 0) + v); if (cand.get(Number(n))?.dvt === 'Válido') s.vnom += v; else s.vnt += v; }
  }
  const esni = abr === 'br' ? naoInst.aptos : 0;
  const ref = { si: +j.s.si, esi: +j.e.esi, esni: +j.e.esni, te: +j.e.te, c: +j.e.c, a: +j.e.a, vb: +j.v.vb, vn: +j.v.vn, vnt: +j.v.vnt, vnom: +j.v.vnom, tv: +j.v.tv };
  const meu = { si: s.si, esi: s.esi, esni, te: s.esi + esni, c: s.c, a: s.esi - s.c, vb: s.vb, vn: s.vn, vnt: s.vnt, vnom: s.vnom, tv: s.vnom + s.vb + s.vn + s.vnt };
  const difs = Object.keys(ref).filter((x) => ref[x] !== meu[x]);
  const cd = [...cand].map(([n, c]) => `${n}: ${f(s.porN.get(n) ?? 0)}${(s.porN.get(n) ?? 0) === c.vap ? '' : ` ≠ ${f(c.vap)}`}`).join('; ');
  const fora = [...s.porN.keys()].filter((n) => !cand.has(n));
  p(`  ${abr.toUpperCase()} ${NOME[cargo]} (gerado ${j.dg} ${j.hg}): ${Object.keys(ref).length - difs.length}/${Object.keys(ref).length} campos iguais${difs.length ? ' DIVERGE ' + difs.map((x) => `${x} ${meu[x]}×${ref[x]}`).join(', ') : ''}; ${cd}; números fora da lista ${fora.length}`);
}

// ---------- R6 banco ----------
p(`\n== R6. BU impresso × banco (o que os scripts do matemático leem) ==`);
const { db, fonte: fb } = await abrirLeitura();
p(`  ${fb}`);
const dbv = new Map();
for (const v of db.prepare(`SELECT uf, municipio, zona, secao, cargo, tipo_voto, numero, SUM(quantidade) q FROM voto_bu WHERE turno = 2 AND cargo IN (1, 3) GROUP BY 1,2,3,4,5,6,7`).iterate()) {
  const k = `${v.uf}|${v.municipio}|${v.zona}|${v.secao}|${v.cargo}`;
  if (!dbv.has(k)) dbv.set(k, new Map());
  const key = v.tipo_voto === 'nominal' ? v.numero : v.tipo_voto;
  dbv.get(k).set(key, (dbv.get(k).get(key) ?? 0) + v.q);
}
const dbe = new Map();
for (const e of db.prepare(`SELECT uf, municipio, zona, secao, eleicao, aptos, aptos_secao, aptos_tte, comparecimento_majoritario cm FROM secao_eleicao WHERE turno = 2 AND eleicao IN (6258, 6260)`).iterate())
  dbe.set(`${e.uf}|${e.municipio}|${e.zona}|${e.secao}|${e.eleicao === 6258 ? 1 : 3}`, e);
const dbs = new Map();
for (const s of db.prepare(`SELECT uf, municipio, zona, secao, situacao, tipo_arquivo, comparecimento, sem_biometria, por_biometria, por_biografia FROM secao WHERE turno = 2`).iterate())
  dbs.set(`${s.uf}|${s.municipio}|${s.zona}|${s.secao}`, s);
let r6 = 0, r6ig = 0; const r6dif = new Map(); const r6ex = [];
const marca = (campo, ex) => { r6dif.set(campo, (r6dif.get(campo) ?? 0) + 1); if (r6ex.length < 15) r6ex.push(ex); };
for (const [k, r] of bu) for (const cargo of [1, 3]) {
  const c = cargoBu(r, NOME[cargo]); if (!c) continue;
  r6++;
  const v = dbv.get(`${k}|${cargo}`) ?? new Map(), e = dbe.get(`${k}|${cargo}`);
  let ok = true;
  const comp = (campo, a, b) => { if (a !== b) { ok = false; marca(campo, `${k}|${cargo} ${campo}: impresso ${a} × banco ${b}`); } };
  for (const [n, q] of Object.entries(c.cands)) comp('candidato', q, v.get(Number(n)) ?? 0);
  for (const [n, q] of v) if (typeof n === 'number' && !(String(n) in c.cands) && q) comp('candidato só no banco', 0, q);
  comp('branco', c.br, v.get('branco') ?? 0); comp('nulo', c.nu, v.get('nulo') ?? 0); comp('legenda', c.leg ?? 0, v.get('legenda') ?? 0);
  comp('aptos', c.aptos, e?.aptos); comp('aptos_secao', c.orig, e?.aptos_secao); comp('aptos_tte', c.temp, e?.aptos_tte); comp('comparecimento eleição', c.tot, e?.cm);
  if (ok) r6ig++;
}
let r6s = 0, r6sig = 0;
for (const [k, r] of bu) {
  const b = fonte(r); const s = dbs.get(k); if (!b) continue;
  r6s++;
  let ok = s?.situacao === 'completa';
  if (!ok) marca('seção não completa no banco', `${k}: ${s?.situacao}`);
  if (!b.sa) {
    for (const [campo, a, x] of [['comparecimento seção', b.cab.comp, s?.comparecimento], ['sem_biometria', b.cab.sembio ?? null, s?.sem_biometria], ['por_biometria', b.cab.bio ?? null, s?.por_biometria], ['por_biografia', b.cab.biog ?? null, s?.por_biografia]])
      if (a !== x) { ok = false; marca(campo, `${k} ${campo}: impresso ${a} × banco ${x}`); }
  }
  if (ok) r6sig++;
}
const dbCompletas = [...dbs.values()].filter((s) => s.situacao === 'completa').length;
p(`  seção × cargo: ${f(r6)} comparados, iguais ${f(r6ig)}; seções: ${f(r6s)} comparadas, iguais ${f(r6sig)}; seções completas no banco ${f(dbCompletas)}; divergências: ${[...r6dif].map(([x, n]) => `${x} ${n}`).join(', ') || 'nenhuma'}`);
for (const e of r6ex) p(`    ${e}`);
const tiposSa = new Map(); for (const s of dbs.values()) if (String(s.tipo_arquivo).startsWith('sa')) tiposSa.set(s.tipo_arquivo, (tiposSa.get(s.tipo_arquivo) ?? 0) + 1);
p(`  tipo de arquivo SA no banco: ${[...tiposSa].map(([t, n]) => `${t} ${n}`).join(', ')}; seções do zip com imgbusa: ${[...bu.values()].filter((r) => r.sa).length}`);
p(`\nTempo ${((Date.now() - ini) / 1000).toFixed(0)} s`);
writeFileSync(`${OUT}/40-2t-oficial-resumo.txt`, saida.join('\n') + '\n');
