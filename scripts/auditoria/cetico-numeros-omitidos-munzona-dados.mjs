// Cético (lente: dados e definições) — achado "numeros-omitidos-munzona" (docs/analysis/coerencia-contagem/01-bu-x-oficial.md).
// Pergunta: os números que faltam no votacao_candidato_munzona do 1º turno são uma diferença de DEFINIÇÃO?
// Testes:
//   1. Reproduz o conjunto de números (UF × cargo × número) com voto nominal no BU e sem linha no munzona.
//   2. Situação de cada um no consulta_cand_2026 (o que o arquivo traz e o que não traz).
//   3. Totais oficiais do cargo na divulgação (data/raw/1t/referencia/*-u.json, bloco "v"): nulos (vn), nulos técnicos (vnt),
//      brancos (vb), nominais (vnom), legenda (vl), anulados (van), anulados sub judice (vansj) × BU da UF.
//      Identidades testadas: BU nulo = vn; BU branco = vb; BU nominal + BU legenda = vnom + vl + van + vansj + vnt;
//      votos BU dos números omitidos = vnt.
//   4. Presidente (a divulgação só tem total nacional): votacao_secao do país inteiro, NR_VOTAVEL 28/95/96 × vnt/vb/vn.
//   5. Impacto: majoritários (2º turno / eleito) e proporcionais (modelo de distribuição de vagas validado contra o oficial).
// Uso: node scripts/auditoria/cetico-numeros-omitidos-munzona-dados.mjs [--ufs ac,al,...] [--sem-secao]
// Saída: data/parsed/auditoria/cetico/numeros-omitidos-munzona-*.{csv,txt,json}
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { parseArgs } from 'node:util';
import { entradasZip, linhasBrutas } from './contagem-zip.mjs';

const { values: args } = parseArgs({ options: { ufs: { type: 'string' }, 'sem-secao': { type: 'boolean', default: false } } });
const TURNO = 1;
const CARGOS = [1, 3, 5, 6, 7, 8];
const nomeCargo = { 1: 'Presidente', 3: 'Governador', 5: 'Senador', 6: 'Dep. Federal', 7: 'Dep. Estadual', 8: 'Dep. Distrital' };
const OUT = 'data/parsed/auditoria/cetico';
mkdirSync(OUT, { recursive: true });
const log = [];
const p = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
const n = (x) => Number(x).toLocaleString('pt-BR');

// ---------- 1. BU (banco, somente leitura) ----------
const db = new DatabaseSync('data/db/eleicao2026.sqlite', { readOnly: true });
const carregadas = db.prepare('SELECT uf FROM carga WHERE turno = ? ORDER BY uf').all(TURNO).map((r) => r.uf);
const ufs = args.ufs ? args.ufs.split(',').filter((u) => carregadas.includes(u)) : carregadas.filter((u) => u !== 'zz');
p(`UFs do 1º turno carregadas no banco (${carregadas.length}): ${carregadas.join(',')}; analisadas: ${ufs.join(',')}`);
const qBu = db.prepare(`SELECT cargo, tipo_voto, numero, SUM(quantidade) AS q FROM voto_bu
  WHERE turno = ? AND uf = ? AND cargo IN (${CARGOS.join(',')}) GROUP BY cargo, tipo_voto, numero`);
const buNum = new Map(); // uf|cargo|numero -> votos nominais
const buTot = new Map(); // uf|cargo -> {nominal, legenda, branco, nulo}
for (const uf of ufs) {
  for (const r of qBu.all(TURNO, uf)) {
    const kt = `${uf}|${r.cargo}`;
    const t = buTot.get(kt) ?? { nominal: 0, legenda: 0, branco: 0, nulo: 0, outros: 0 };
    if (t[r.tipo_voto] === undefined) t.outros += r.q; else t[r.tipo_voto] += r.q;
    buTot.set(kt, t);
    if (r.tipo_voto === 'nominal') buNum.set(`${uf}|${r.cargo}|${r.numero}`, (buNum.get(`${uf}|${r.cargo}|${r.numero}`) ?? 0) + r.q);
  }
}

// ---------- 2. munzona: números publicados ----------
const ZMZ = 'data/raw/dadosabertos/votacao_candidato_munzona/votacao_candidato_munzona_2026.zip';
const entMz = await entradasZip(ZMZ);
const noMunzona = new Set();
let geracaoMz = new Set();
for (const nome of ['votacao_candidato_munzona_2026_BR.csv', ...ufs.map((u) => `votacao_candidato_munzona_2026_${u.toUpperCase()}.csv`)]) {
  const e = entMz.find((x) => x.nome === nome);
  if (!e) { p(`munzona: ${nome} não existe`); continue; }
  let col;
  for await (const c of linhasBrutas(ZMZ, e)) {
    if (!col) { col = Object.fromEntries(c.map((x, i) => [x, i])); continue; }
    if (Number(c[col.NR_TURNO]) !== TURNO) continue;
    const uf = c[col.SG_UF].toLowerCase();
    if (!ufs.includes(uf)) continue;
    geracaoMz.add(`${c[col.DT_GERACAO]} ${c[col.HH_GERACAO]}`);
    noMunzona.add(`${uf}|${Number(c[col.CD_CARGO])}|${Number(c[col.NR_CANDIDATO])}`);
  }
}
const omitidos = [...buNum].filter(([k]) => !noMunzona.has(k)).map(([k, q]) => { const [uf, cargo, numero] = k.split('|'); return { uf, cargo: Number(cargo), numero: Number(numero), bu: q }; });
p(`\n1. Números com voto nominal no BU e sem linha no munzona (1º turno, geração munzona ${[...geracaoMz].join(', ')}): ${omitidos.length}, ${n(omitidos.reduce((s, o) => s + o.bu, 0))} votos`);
const porCargo = {};
for (const o of omitidos) { const r = (porCargo[o.cargo] ??= { numeros: 0, votos: 0 }); r.numeros++; r.votos += o.bu; }
for (const [c, r] of Object.entries(porCargo)) p(`   ${nomeCargo[c].padEnd(15)} ${String(r.numeros).padStart(4)} números  ${n(r.votos).padStart(8)} votos`);
const UFS_AUTOR = 'ac,al,am,ap,ba,ce,df,es,go,ma,mg,ms,mt'.split(',');
const so13 = omitidos.filter((o) => UFS_AUTOR.includes(o.uf));
p(`   Só nas 13 UFs do autor: ${so13.length} números, ${n(so13.reduce((s, o) => s + o.bu, 0))} votos (autor: 107 e 94.798)`);

// ---------- 3. consulta_cand ----------
const ZCC = 'data/raw/dadosabertos/consulta_cand/consulta_cand_2026.zip';
const entCc = await entradasZip(ZCC);
const cand = new Map(); // UE|cargo|numero -> [linhas]
const sitTotGeral = new Map();
let colCc;
for await (const c of linhasBrutas(ZCC, entCc.find((e) => e.nome === 'consulta_cand_2026_BRASIL.csv'))) {
  if (!colCc) { colCc = Object.fromEntries(c.map((x, i) => [x, i])); continue; }
  if (Number(c[colCc.NR_TURNO]) !== TURNO) continue;
  const k = `${c[colCc.SG_UE].toLowerCase()}|${Number(c[colCc.CD_CARGO])}|${Number(c[colCc.NR_CANDIDATO])}`;
  const linha = { sq: c[colCc.SQ_CANDIDATO], partido: c[colCc.SG_PARTIDO], sitCand: c[colCc.DS_SITUACAO_CANDIDATURA], sitTot: c[colCc.DS_SIT_TOT_TURNO], geracao: `${c[colCc.DT_GERACAO]} ${c[colCc.HH_GERACAO]}` };
  (cand.get(k) ?? cand.set(k, []).get(k)).push(linha);
  sitTotGeral.set(linha.sitCand, (sitTotGeral.get(linha.sitCand) ?? 0) + 1);
}
p(`\n2. consulta_cand_2026 (1º turno): colunas de situação da candidatura: ${Object.keys(colCc).filter((x) => /SITUACAO|JULG|DETALHE|INSERIDO/.test(x)).join(', ')}`);
p(`   DS_SITUACAO_CANDIDATURA em todas as linhas: ${[...sitTotGeral].map(([k, v]) => `${k}=${v}`).join(', ')} (leiame: "aplicável somente até 2022")`);
const sitOmit = new Map();
for (const o of omitidos) {
  const abr = o.cargo === 1 ? 'br' : o.uf;
  const ls = cand.get(`${abr}|${o.cargo}|${o.numero}`) ?? [];
  o.consulta = ls.length ? ls.map((l) => `${l.sq}:${l.partido}:${l.sitTot}`).join(' / ') : 'AUSENTE';
  o.sqs = ls.length;
  const chave = ls.length ? ls.map((l) => l.sitTot).sort().join('+') : 'AUSENTE';
  sitOmit.set(chave, (sitOmit.get(chave) ?? 0) + 1);
}
p(`   Omitidos por DS_SIT_TOT_TURNO no consulta_cand: ${[...sitOmit].map(([k, v]) => `${k}=${v}`).join(', ')}`);
p(`   Omitidos com mais de um SQ_CANDIDATO no mesmo número: ${omitidos.filter((o) => o.sqs > 1).map((o) => `${o.uf}/${o.cargo}/${o.numero}`).join(', ') || 'nenhum'}`);

// ---------- 4. divulgação (bloco "v" por UF × cargo) ----------
const REF = 'data/raw/1t/referencia';
const arqRef = readdirSync(REF).filter((f) => /-u\.json$/.test(f));
const json = new Map();
for (const f of arqRef) {
  const j = JSON.parse(readFileSync(`${REF}/${f}`, 'utf8'));
  const carg = j.carg?.[0];
  json.set(`${j.cdabr}|${Number(carg?.cd)}`, { arquivo: f, dg: `${j.dg} ${j.hg}`, v: Object.fromEntries(Object.entries(j.v).map(([k, x]) => [k, Number(x)])), carg });
}
const linhasId = [];
p('\n3. Identidades BU × totais oficiais da divulgação (por UF e cargo; presidente fica para o teste 4)');
let falhas = 0;
for (const uf of ufs) for (const cargo of CARGOS.filter((c) => c !== 1)) {
  const t = buTot.get(`${uf}|${cargo}`);
  const j = json.get(`${uf}|${cargo}`);
  if (!t && !j) continue;
  if (!t || !j) { p(`   ${uf} ${nomeCargo[cargo]}: só ${t ? 'BU' : 'divulgação'}`); continue; }
  const omit = omitidos.filter((o) => o.uf === uf && o.cargo === cargo).reduce((s, o) => s + o.bu, 0);
  const v = j.v;
  const r = {
    uf, cargo, dg: j.dg,
    bu_nulo: t.nulo, vn: v.vn, bu_branco: t.branco, vb: v.vb,
    bu_nom_leg: t.nominal + t.legenda, oficial_nom_leg: v.vnom + (v.vl || 0) + v.van + v.vansj + v.vnt,
    omitidos_bu: omit, vnt: v.vnt, tvn: v.tvn, bu_outros: t.outros,
  };
  r.ok = r.bu_nulo === r.vn && r.bu_branco === r.vb && r.bu_nom_leg === r.oficial_nom_leg && r.omitidos_bu === r.vnt && r.tvn === r.vn + r.vnt;
  if (!r.ok) { falhas++; p(`   DIVERGE ${uf} ${nomeCargo[cargo]} (divulgação ${j.dg}): ${JSON.stringify(r)}`); }
  linhasId.push(r);
}
const somaVnt = linhasId.reduce((s, r) => s + r.vnt, 0);
const somaOm = linhasId.reduce((s, r) => s + r.omitidos_bu, 0);
p(`   ${linhasId.length} pares UF × cargo; ${linhasId.length - falhas} com TODAS as identidades exatas; ${falhas} com alguma diferença.`);
p(`   Σ votos BU dos omitidos (sem presidente) = ${n(somaOm)}; Σ vnt (nulos técnicos) oficiais = ${n(somaVnt)}; Σ vn oficial = ${n(linhasId.reduce((s, r) => s + r.vn, 0))} = Σ nulos BU ${n(linhasId.reduce((s, r) => s + r.bu_nulo, 0))}`);
p(`   Pares com vnt > 0 e nenhum número omitido: ${linhasId.filter((r) => r.vnt > 0 && r.omitidos_bu === 0).length}; com número omitido e vnt = 0: ${linhasId.filter((r) => r.omitidos_bu > 0 && r.vnt === 0).length}`);
const cols = Object.keys(linhasId[0] ?? {});
writeFileSync(`${OUT}/numeros-omitidos-munzona-identidades.csv`, [cols.join(';'), ...linhasId.map((r) => cols.map((c) => r[c]).join(';'))].join('\n') + '\n');

// ---------- 5. presidente: votacao_secao nacional × divulgação nacional ----------
const jp = json.get('br|1');
p(`\n4. Presidente: divulgação nacional (${jp.dg}): vnt ${n(jp.v.vnt)}, vn ${n(jp.v.vn)}, vb ${n(jp.v.vb)}, vnom ${n(jp.v.vnom)}, van ${jp.v.van}, vansj ${jp.v.vansj}`);
const buPres = { 28: 0, nulo: 0, branco: 0 };
for (const uf of ufs) { buPres[28] += buNum.get(`${uf}|1|28`) ?? 0; const t = buTot.get(`${uf}|1`); if (t) { buPres.nulo += t.nulo; buPres.branco += t.branco; } }
if (!args['sem-secao']) {
  const ZVS = 'data/raw/dadosabertos/votacao_secao/votacao_secao_2026_BR.zip';
  const e = (await entradasZip(ZVS)).find((x) => x.nome.endsWith('.csv'));
  let col; const nac = new Map(); const nasUfs = new Map(); const sq28 = new Map();
  for await (const c of linhasBrutas(ZVS, e)) {
    if (!col) { col = Object.fromEntries(c.map((x, i) => [x, i])); continue; }
    if (Number(c[col.NR_TURNO]) !== TURNO || Number(c[col.CD_CARGO]) !== 1) continue;
    const nr = Number(c[col.NR_VOTAVEL]); const q = Number(c[col.QT_VOTOS]);
    nac.set(nr, (nac.get(nr) ?? 0) + q);
    if (ufs.includes(c[col.SG_UF].toLowerCase())) nasUfs.set(nr, (nasUfs.get(nr) ?? 0) + q);
    if (nr === 28) { const k = `${c[col.SQ_CANDIDATO]}`; sq28.set(k, (sq28.get(k) ?? 0) + q); }
  }
  const nominalNac = [...nac].filter(([k]) => k !== 95 && k !== 96).reduce((s, [, q]) => s + q, 0);
  p(`   votacao_secao, país inteiro: nº 28 = ${n(nac.get(28) ?? 0)} (SQ_CANDIDATO: ${[...sq28].map(([k, v]) => `${k}=${n(v)}`).join(', ')}); nulo (96) = ${n(nac.get(96))}; branco (95) = ${n(nac.get(95))}; nominais = ${n(nominalNac)}`);
  p(`   Identidades nacionais: nº28 = vnt? ${(nac.get(28) ?? 0) === jp.v.vnt}; 96 = vn? ${nac.get(96) === jp.v.vn}; 95 = vb? ${nac.get(95) === jp.v.vb}; nominais − nº28 = vnom? ${nominalNac - (nac.get(28) ?? 0) === jp.v.vnom}`);
  p(`   Nas UFs analisadas: BU nº 28 = ${n(buPres[28])}, votacao_secao nº 28 = ${n(nasUfs.get(28) ?? 0)}; BU nulo = ${n(buPres.nulo)}, votacao_secao 96 = ${n(nasUfs.get(96) ?? 0)}`);
}

// ---------- 6. impacto ----------
p('\n5. Impacto no resultado');
const pct = (a, b) => (100 * a / b).toFixed(4) + '%';
// presidente
{
  const v = jp.v; const cs = jp.carg.agr.flatMap((a) => a.par.flatMap((x) => x.cand)).map((c) => ({ n: c.n, vap: Number(c.vap) })).sort((a, b) => b.vap - a.vap);
  p(`   Presidente: 1º colocado nº ${cs[0].n} com ${pct(cs[0].vap, v.vv)} dos válidos; com os ${n(v.vnt)} nulos técnicos como válidos: ${pct(cs[0].vap, v.vv + v.vnt)}. Maioria absoluta não muda (2º turno nos dois casos).`);
}
// governador e senador
for (const r of linhasId.filter((x) => (x.cargo === 3 || x.cargo === 5) && x.vnt > 0)) {
  const j = json.get(`${r.uf}|${r.cargo}`); const v = j.v;
  const cs = j.carg.agr.flatMap((a) => a.par.flatMap((x) => x.cand)).map((c) => ({ n: c.n, vap: Number(c.vap), dvt: c.dvt, st: c.st })).sort((a, b) => b.vap - a.vap);
  const om = omitidos.filter((o) => o.uf === r.uf && o.cargo === r.cargo);
  if (r.cargo === 3) {
    const metade = Math.floor(v.vv / 2) + 1;
    p(`   Governador ${r.uf.toUpperCase()}: 1º nº ${cs[0].n} ${n(cs[0].vap)} de ${n(v.vv)} válidos = ${pct(cs[0].vap, v.vv)} (precisava de ${n(metade)}, faltaram ${n(metade - cs[0].vap)}). Com os ${n(v.vnt)} nulos técnicos como válidos: ${pct(cs[0].vap, v.vv + v.vnt)}. Omitido(s): ${om.map((o) => `nº ${o.numero} ${n(o.bu)}`).join(', ')}.`);
  } else {
    const eleitos = cs.filter((c) => /^Eleito/.test(c.st));
    const ultimo = eleitos.at(-1);
    p(`   Senador ${r.uf.toUpperCase()}: ${eleitos.length} eleito(s), o menos votado com ${n(ultimo.vap)}; omitido(s): ${om.map((o) => `nº ${o.numero} ${n(o.bu)} (${pct(o.bu, ultimo.vap)} do último eleito)`).join(', ')}.`);
  }
}
// proporcionais: modelo de distribuição (Lei 14.211/2021, 80/20, 3ª fase para todos, ADI 7228)
function distribuir(carg, extra = new Map(), extraVv = 0) {
  const agrs = carg.agr.map((a) => {
    const cands = a.par.flatMap((x) => x.cand).filter((c) => c.dvt === 'Válido').map((c) => Number(c.vap)).sort((x, y) => y - x);
    const votos = a.par.reduce((s, x) => s + Number(x.tvtn) + Number(x.tvtl), 0) + (extra.get(a.n) ?? 0);
    return { n: a.n, com: a.com, votos, cands, oficial: Number(a.vag), vagas: 0 };
  });
  const vagas = agrs.reduce((s, a) => s + a.oficial, 0);
  const vv = agrs.reduce((s, a) => s + a.votos, 0) + 0 * extraVv;
  const qe = Math.round(vv / vagas); // fração > 0,5 arredonda para cima (equivale a Math.round, salvo empate exato)
  for (const a of agrs) {
    const qp = Math.floor(a.votos / qe);
    a.vagas = Math.min(qp, a.cands.filter((v) => v >= 0.1 * qe).length);
  }
  let resto = vagas - agrs.reduce((s, a) => s + a.vagas, 0);
  while (resto > 0) {
    let cand = agrs.filter((a) => a.votos >= 0.8 * qe && a.cands.filter((v) => v >= 0.2 * qe).length > a.vagas);
    if (!cand.length) cand = agrs.filter((a) => a.cands.length > a.vagas);
    if (!cand.length) break;
    cand.sort((x, y) => y.votos / (y.vagas + 1) - x.votos / (x.vagas + 1));
    cand[0].vagas++; resto--;
  }
  return { qe, vagas, agrs };
}
const linhasProp = [];
let modeloOk = 0, modeloTot = 0;
for (const uf of ufs) for (const cargo of [6, 7, 8]) {
  const j = json.get(`${uf}|${cargo}`);
  if (!j) continue;
  const base = distribuir(j.carg);
  const bate = base.agrs.every((a) => a.vagas === a.oficial);
  modeloTot++; if (bate) modeloOk++;
  const om = omitidos.filter((o) => o.uf === uf && o.cargo === cargo);
  if (!om.length) { if (!bate) p(`   (modelo não reproduz ${uf} ${nomeCargo[cargo]}; sem omitidos ali)`); continue; }
  // cenário: votos dos omitidos contados como válidos para a agremiação do partido (2 primeiros dígitos do número)
  const extra = new Map();
  const semAgr = [];
  for (const o of om) {
    const part = String(o.numero).slice(0, 2);
    const a = j.carg.agr.find((x) => x.par.some((y) => y.n === part));
    if (a) extra.set(a.n, (extra.get(a.n) ?? 0) + o.bu); else semAgr.push(o.numero);
  }
  const cen = distribuir(j.carg, extra);
  const mud = cen.agrs.filter((a, i) => a.vagas !== base.agrs[i].vagas).map((a, i) => `${a.com}: ${base.agrs.find((b) => b.n === a.n).vagas}→${a.vagas}`);
  const maxOm = Math.max(...om.map((o) => o.bu));
  // candidato: menor votação entre os eleitos da UF/cargo
  const eleitos = j.carg.agr.flatMap((a) => a.par.flatMap((x) => x.cand)).filter((c) => c.e === 's').map((c) => Number(c.vap));
  const menorEleito = Math.min(...eleitos);
  const r = { uf, cargo, omitidos: om.length, votos_omitidos: om.reduce((s, o) => s + o.bu, 0), maior_omitido: maxOm, qe_oficial: Number(j.carg.qe), qe_modelo: base.qe, menor_eleito: menorEleito, modelo_reproduz: bate, mudanca_vagas_se_validos: mud.join(' | ') || 'nenhuma', partido_sem_agremiacao: semAgr.join(',') };
  linhasProp.push(r);
}
p(`   Proporcionais: o modelo de distribuição reproduz as vagas oficiais por agremiação em ${modeloOk} de ${modeloTot} pares UF × cargo.`);
for (const r of linhasProp) p(`   ${r.uf} ${nomeCargo[r.cargo]}: ${r.omitidos} omitidos, ${n(r.votos_omitidos)} votos (maior ${n(r.maior_omitido)}; QE ${n(r.qe_oficial)}; menor eleito ${n(r.menor_eleito)}); modelo reproduz: ${r.modelo_reproduz ? 'sim' : 'NÃO'}; vagas mudariam se fossem válidos: ${r.mudanca_vagas_se_validos}${r.partido_sem_agremiacao ? `; sem agremiação: ${r.partido_sem_agremiacao}` : ''}`);
const colsP = Object.keys(linhasProp[0] ?? { uf: 1 });
writeFileSync(`${OUT}/numeros-omitidos-munzona-proporcionais.csv`, [colsP.join(';'), ...linhasProp.map((r) => colsP.map((c) => r[c]).join(';'))].join('\n') + '\n');

const colsO = ['uf', 'cargo', 'numero', 'bu', 'sqs', 'consulta'];
writeFileSync(`${OUT}/numeros-omitidos-munzona-lista.csv`, [colsO.join(';'), ...omitidos.sort((a, b) => a.uf.localeCompare(b.uf) || a.cargo - b.cargo || a.numero - b.numero).map((o) => colsO.map((c) => o[c]).join(';'))].join('\n') + '\n');
writeFileSync(`${OUT}/numeros-omitidos-munzona.txt`, log.join('\n') + '\n');
p(`\nArquivos: ${OUT}/numeros-omitidos-munzona-{lista,identidades,proporcionais}.csv e .txt`);
