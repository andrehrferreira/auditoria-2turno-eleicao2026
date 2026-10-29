// Revisor cético, achado "numeros-omitidos-munzona" (docs/analysis/coerencia-contagem/01-bu-x-oficial.md), lente
// "explicações alternativas e poder do teste". Somente leitura: banco (readOnly), zips dos dados abertos e JSONs de
// referência do resultados.tse.jus.br já baixados em data/raw/1t/referencia. Sem rede.
//
// O que faz (1º turno, só as UFs já carregadas no banco, tabela `carga`):
//  T1  reproduz o conjunto de números com voto nominal no BU e sem linha no votacao_candidato_munzona (UF × cargo × nº);
//  T2  procura cada número no consulta_cand_2026 (nome na urna, partido, situação, situação de totalização);
//  T3  fecha a conta de cada UF × cargo contra o total oficial do resultados.tse.jus.br (campo `v` do JSON):
//      vnt (nulos técnicos) = Σ BU dos números omitidos; vn = nulos do BU; vb = brancos; vansj/van = Σ BU dos
//      candidatos "Anulado sub judice"/"Anulado"; vnom = Σ BU dos "Válido"; vl = legenda; tv = soma de tudo.
//      Presidente: o JSON é nacional, então a comparação é com o votacao_secao do país inteiro (nº 28 e 96).
//  T4  poder: o teste T3 é de igualdade exata em inteiros; mostra a menor divergência que ele acusaria.
//  T5  efeito no resultado: majoritários (maioria absoluta, vagas de senador) e proporcionais (refaz a distribuição
//      de vagas, valida contra o oficial e simula os votos omitidos contados para o candidato e a legenda).
// Uso: node scripts/auditoria/cetico-numeros-omitidos-alternativas.mjs [--sem-munzona]
// Saída: data/parsed/auditoria/cetico/numeros-omitidos-*.{csv,txt,json}
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { parseArgs } from 'node:util';
import { ZIPS, entradasZip, linhasCsv } from './contagem-zip.mjs';

const { values: args } = parseArgs({ options: { 'sem-munzona': { type: 'boolean', default: false } } });
const TURNO = 1;
const CARGOS = [1, 3, 5, 6, 7, 8];
const NOME = { 1: 'Presidente', 3: 'Governador', 5: 'Senador', 6: 'Dep. Federal', 7: 'Dep. Estadual', 8: 'Dep. Distrital' };
const UFS_AUTOR = 'ac,al,am,ap,ba,ce,df,es,go,ma,mg,ms,mt'.split(',');
const DIR = 'data/parsed/auditoria/cetico';
mkdirSync(DIR, { recursive: true });
const saida = [];
const log = (...x) => { const s = x.join(' '); saida.push(s); console.log(s); };
const N = (x) => Number(x ?? 0);
const fmt = (n) => Number(n).toLocaleString('pt-BR');

// ---------- banco ----------
const db = new DatabaseSync('data/db/eleicao2026.sqlite', { readOnly: true });
const ufs = db.prepare('SELECT uf FROM carga WHERE turno = ? ORDER BY uf').all(TURNO).map((r) => r.uf).filter((u) => u !== 'zz');
log(`UFs do 1º turno carregadas no banco agora: ${ufs.length} (${ufs.join(',')})`);
const qBu = db.prepare(`SELECT cargo, tipo_voto, numero, SUM(quantidade) AS q FROM voto_bu
  WHERE turno = ? AND uf = ? AND cargo IN (${CARGOS.join(',')}) GROUP BY 1, 2, 3`);
const bu = new Map(); // uf|cargo → { nominal: Map(numero→q), branco, nulo, legenda, outros }
for (const uf of ufs) {
  for (const r of qBu.all(TURNO, uf)) {
    const k = `${uf}|${r.cargo}`;
    if (!bu.has(k)) bu.set(k, { nominal: new Map(), branco: 0, nulo: 0, legenda: 0, outros: 0 });
    const t = bu.get(k);
    if (r.tipo_voto === 'nominal') t.nominal.set(r.numero, (t.nominal.get(r.numero) ?? 0) + r.q);
    else if (r.tipo_voto in t && r.tipo_voto !== 'nominal') t[r.tipo_voto] += r.q;
    else t.outros += r.q;
  }
}
log(`BU: ${bu.size} pares UF × cargo`);

// ---------- referência oficial (resultados.tse.jus.br, JSON por UF e cargo) ----------
const pad = (n, l) => String(n).padStart(l, '0');
function lerRef(abr, cargo) {
  const eleicao = cargo === 1 ? 6257 : 6259;
  const f = `data/raw/1t/referencia/${abr}-c${pad(cargo, 4)}-e${pad(eleicao, 6)}-u.json`;
  if (!existsSync(f)) return null;
  const j = JSON.parse(readFileSync(f, 'utf8'));
  const c = j.carg[0];
  const cand = new Map();
  const agr = [];
  for (const a of c.agr) {
    const ag = { n: a.n, tp: a.tp, vag: N(a.vag), par: [], votos: 0, cands: [] };
    for (const p of a.par) {
      ag.par.push(Number(p.n));
      ag.votos += N(p.tvtn) + N(p.tvtl);
      for (const k of p.cand) {
        const o = { n: Number(k.n), nmu: k.nmu, dvt: k.dvt, st: k.st, e: k.e, vap: N(k.vap), partido: Number(p.n), agr: a.n };
        cand.set(o.n, o);
        if (k.dvt === 'Válido') ag.cands.push(o);
      }
    }
    agr.push(ag);
  }
  return { arquivo: f, dg: `${j.dg} ${j.hg}`, v: j.v, qe: N(c.qe), cand, agr };
}

// ---------- consulta_cand ----------
const consulta = new Map(); // UF|cargo|numero → [ { nmu, partido, sit, sitTot } ]
let semSituacao = 0, linhasConsulta = 0;
{
  const zip = 'data/raw/dadosabertos/consulta_cand/consulta_cand_2026.zip';
  const e = (await entradasZip(zip)).find((x) => x.nome === 'consulta_cand_2026_BRASIL.csv');
  for await (const o of linhasCsv(zip, e)) {
    if (Number(o.NR_TURNO) !== TURNO) continue;
    linhasConsulta++;
    if (o.DS_SITUACAO_CANDIDATURA === '#NE') semSituacao++;
    const k = `${o.SG_UF.toLowerCase()}|${Number(o.CD_CARGO)}|${Number(o.NR_CANDIDATO)}`;
    if (!consulta.has(k)) consulta.set(k, []);
    consulta.get(k).push({ nmu: o.NM_URNA_CANDIDATO, partido: o.SG_PARTIDO, sit: `${o.CD_SITUACAO_CANDIDATURA} ${o.DS_SITUACAO_CANDIDATURA}`, sitTot: o.DS_SIT_TOT_TURNO, geracao: `${o.DT_GERACAO} ${o.HH_GERACAO}` });
  }
}
log(`consulta_cand (1º turno): ${fmt(linhasConsulta)} linhas; DS_SITUACAO_CANDIDATURA = "#NE" em ${fmt(semSituacao)} (${(100 * semSituacao / linhasConsulta).toFixed(1)}%)`);

// ---------- munzona: presença de cada número (UF × cargo × nº) ----------
let munzona = null;
if (!args['sem-munzona']) {
  munzona = new Map(); // uf|cargo|numero → { q, dest:Set }
  const entradas = await entradasZip(ZIPS.munzona);
  const arquivos = ['votacao_candidato_munzona_2026_BR.csv', ...ufs.map((u) => `votacao_candidato_munzona_2026_${u.toUpperCase()}.csv`)];
  for (const nome of arquivos) {
    const e = entradas.find((x) => x.nome === nome);
    if (!e) { log(`munzona: falta ${nome}`); continue; }
    for await (const o of linhasCsv(ZIPS.munzona, e)) {
      if (Number(o.NR_TURNO) !== TURNO) continue;
      const k = `${o.SG_UF.toLowerCase()}|${Number(o.CD_CARGO)}|${Number(o.NR_CANDIDATO)}`;
      const m = munzona.get(k) ?? { q: 0, dest: new Set() };
      m.q += N(o.QT_VOTOS_NOMINAIS); m.dest.add(o.NM_TIPO_DESTINACAO_VOTOS); munzona.set(k, m);
    }
  }
  log(`munzona: ${fmt(munzona.size)} números (UF × cargo × nº) no 1º turno`);
}

// ---------- votacao_secao nacional (presidente) ----------
const presNacional = new Map(); // NR_VOTAVEL → votos, país inteiro (inclui UFs ainda não carregadas e ZZ)
{
  const e = (await entradasZip(ZIPS.votacaoSecao)).find((x) => x.nome.endsWith('.csv'));
  for await (const o of linhasCsv(ZIPS.votacaoSecao, e)) {
    if (Number(o.NR_TURNO) !== TURNO || o.CD_CARGO !== '1') continue;
    const n = Number(o.NR_VOTAVEL);
    presNacional.set(n, (presNacional.get(n) ?? 0) + N(o.QT_VOTOS));
  }
}

// ---------- T1/T2/T3 ----------
const omitidos = [];
const fechamento = [];
const refPres = lerRef('br', 1);
for (const [k, t] of [...bu].sort()) {
  const [uf, cs] = k.split('|');
  const cargo = Number(cs);
  const ref = cargo === 1 ? refPres : lerRef(uf, cargo);
  if (!ref) { log(`sem referência para ${uf} cargo ${cargo}`); continue; }
  const s = { uf, cargo, vnom: 0, vansj: 0, van: 0, vnt: 0, outrosDvt: 0, omitidos: 0, omitidosMunzona: 0, divergCand: 0 };
  for (const [numero, q] of t.nominal) {
    const c = ref.cand.get(numero);
    const noMunzona = munzona ? munzona.has(`${uf}|${cargo}|${numero}`) : null;
    if (!c) {
      s.vnt += q; s.omitidos++;
      if (noMunzona === false) s.omitidosMunzona++;
      const cc = consulta.get(`${cargo === 1 ? 'br' : uf}|${cargo}|${numero}`) ?? [];
      omitidos.push({ uf, cargo, numero, bu: q, no_munzona: noMunzona, no_consulta_cand: cc.length,
        nome_urna: cc.map((x) => x.nmu).join(' / '), partido: cc.map((x) => x.partido).join(' / '),
        situacao: cc.map((x) => x.sit).join(' / '), sit_tot: cc.map((x) => x.sitTot).join(' / ') });
      continue;
    }
    if (noMunzona === false) s.divergCand++; // está no JSON mas não no munzona
    if (cargo !== 1 && c.vap !== q) s.divergCand++;
    if (c.dvt === 'Válido') s.vnom += q;
    else if (c.dvt === 'Anulado sub judice') s.vansj += q;
    else if (c.dvt === 'Anulado') s.van += q;
    else s.outrosDvt += q;
  }
  const v = ref.v;
  if (cargo !== 1) {
    fechamento.push({ uf, cargo,
      vnt_bu: s.vnt, vnt_of: N(v.vnt), vn_bu: t.nulo, vn_of: N(v.vn), vb_bu: t.branco, vb_of: N(v.vb),
      vansj_bu: s.vansj, vansj_of: N(v.vansj), van_bu: s.van, van_of: N(v.van), vnom_bu: s.vnom, vnom_of: N(v.vnom),
      vl_bu: t.legenda, vl_of: N(v.vl), tv_bu: t.branco + t.nulo + t.legenda + t.outros + [...t.nominal.values()].reduce((a, b) => a + b, 0), tv_of: N(v.tv),
      outros_bu: t.outros + s.outrosDvt, cand_diverg: s.divergCand, omitidos: s.omitidos, omitidos_fora_munzona: s.omitidosMunzona, geracao_ref: ref.dg });
  }
}

// T1: reprodução do autor (13 UFs)
log('\n== T1. Números com voto nominal no BU e fora da referência oficial (JSON) ==');
const agrupa = (lista) => { const m = new Map(); for (const o of lista) { const r = m.get(o.cargo) ?? { n: 0, q: 0, foraMunzona: 0 }; r.n++; r.q += o.bu; if (o.no_munzona === false) r.foraMunzona++; m.set(o.cargo, r); } return m; };
for (const [rot, lista] of [['13 UFs do autor', omitidos.filter((o) => UFS_AUTOR.includes(o.uf))], [`${ufs.length} UFs carregadas agora`, omitidos]]) {
  const m = agrupa(lista);
  log(`${rot}: ${lista.length} números, ${fmt(lista.reduce((a, o) => a + o.bu, 0))} votos no BU; ausentes também do munzona: ${lista.filter((o) => o.no_munzona === false).length}; presentes no munzona: ${lista.filter((o) => o.no_munzona === true).length}`);
  for (const c of CARGOS) if (m.has(c)) log(`  ${NOME[c].padEnd(15)} ${String(m.get(c).n).padStart(3)} números  ${fmt(m.get(c).q).padStart(9)} votos`);
}
if (munzona) {
  // números presentes no munzona mas fora do JSON, e o inverso (consistência entre as duas fontes oficiais)
  let soMunzona = 0;
  for (const [k] of munzona) { const [uf, c, n] = k.split('|'); if (uf === 'br' || !ufs.includes(uf) || !CARGOS.includes(Number(c))) continue; const ref = Number(c) === 1 ? refPres : lerRefCache(uf, Number(c)); if (ref && !ref.cand.has(Number(n))) soMunzona++; }
  log(`Números no munzona e ausentes do JSON oficial (UFs carregadas): ${soMunzona}`);
}
function lerRefCache(uf, c) { lerRefCache.m ??= new Map(); const k = `${uf}|${c}`; if (!lerRefCache.m.has(k)) lerRefCache.m.set(k, lerRef(uf, c)); return lerRefCache.m.get(k); }

// T2: consulta_cand
log('\n== T2. Situação dos números omitidos no consulta_cand_2026 ==');
const tally = new Map();
for (const o of omitidos) { const k = `${o.no_consulta_cand ? 'presente' : 'AUSENTE'} | situação ${o.situacao || '-'} | totalização ${o.sit_tot || '-'}`; tally.set(k, (tally.get(k) ?? 0) + 1); }
for (const [k, n] of [...tally].sort((a, b) => b[1] - a[1])) log(`  ${String(n).padStart(4)}  ${k}`);
// controle: como o consulta_cand classifica os candidatos publicados como "Anulado"/"Anulado sub judice"
const ctl = new Map();
for (const uf of ufs) for (const c of CARGOS.filter((x) => x !== 1)) {
  const ref = lerRefCache(uf, c); if (!ref) continue;
  for (const k of ref.cand.values()) { const cc = consulta.get(`${uf}|${c}|${k.n}`) ?? []; const kk = `${k.dvt} → ${cc.map((x) => x.sitTot).join('/') || 'AUSENTE'}`; ctl.set(kk, (ctl.get(kk) ?? 0) + 1); }
}
log('  Controle: destinação no JSON oficial → DS_SIT_TOT_TURNO no consulta_cand (candidatos publicados, UFs carregadas):');
for (const [k, n] of [...ctl].sort((a, b) => b[1] - a[1])) log(`    ${String(n).padStart(6)}  ${k}`);

// T3: fechamento
log('\n== T3. Fechamento BU × total oficial (resultados.tse.jus.br) por UF × cargo ==');
const campos = ['vnt', 'vn', 'vb', 'vansj', 'van', 'vnom', 'vl', 'tv'];
let pares = 0, paresOk = 0;
const difs = [];
for (const f of fechamento) {
  pares++;
  const ruins = campos.filter((c) => f[`${c}_bu`] !== f[`${c}_of`]);
  if (!ruins.length && !f.cand_diverg && !f.outros_bu) paresOk++;
  else difs.push(`${f.uf} ${NOME[f.cargo]}: ${ruins.map((c) => `${c} BU ${f[`${c}_bu`]} × of ${f[`${c}_of`]}`).join('; ')} cand_diverg ${f.cand_diverg} outros ${f.outros_bu}`);
}
log(`Pares UF × cargo (exceto presidente): ${pares}; fecham em todos os 8 campos e em todo candidato: ${paresOk}`);
for (const d of difs) log(`  DIVERGE ${d}`);
const somaC = (c, f = fechamento) => [f.reduce((a, x) => a + x[`${c}_bu`], 0), f.reduce((a, x) => a + x[`${c}_of`], 0)];
for (const [rot, f] of [['13 UFs do autor', fechamento.filter((x) => UFS_AUTOR.includes(x.uf))], ['todas carregadas', fechamento]]) {
  log(`  ${rot}: nulos técnicos (vnt) BU-omitidos ${fmt(somaC('vnt', f)[0])} × oficial ${fmt(somaC('vnt', f)[1])}; nulos (vn) BU ${fmt(somaC('vn', f)[0])} × oficial ${fmt(somaC('vn', f)[1])}`);
}
log('  Por cargo (todas carregadas): BU nulos + BU omitidos × oficial tvn (nulos totais):');
for (const c of [3, 5, 6, 7, 8]) {
  const f = fechamento.filter((x) => x.cargo === c);
  if (!f.length) continue;
  const b = f.reduce((a, x) => a + x.vn_bu + x.vnt_bu, 0), o = f.reduce((a, x) => a + x.vn_of + x.vnt_of, 0);
  log(`    ${NOME[c].padEnd(15)} ${fmt(b).padStart(11)} × ${fmt(o).padStart(11)}  ${b === o ? 'igual' : 'DIFERENTE'}`);
}
// presidente: nacional
const pv = refPres.v;
const omitPres = [...new Set(omitidos.filter((o) => o.cargo === 1).map((o) => o.numero))];
const vntSecao = omitPres.reduce((a, n) => a + (presNacional.get(n) ?? 0), 0);
let nomSecao = 0; for (const [n, q] of presNacional) if (n !== 95 && n !== 96 && refPres.cand.get(n)?.dvt === 'Válido') nomSecao += q;
const semRef = [...presNacional.keys()].filter((n) => n !== 95 && n !== 96 && !refPres.cand.has(n));
log(`Presidente (país inteiro, votacao_secao × JSON br): números sem candidato no JSON: ${semRef.join(',')}; votos ${fmt(vntSecao)} × vnt oficial ${fmt(N(pv.vnt))}; nulos 96 ${fmt(presNacional.get(96))} × vn ${fmt(N(pv.vn))}; brancos ${fmt(presNacional.get(95))} × vb ${fmt(N(pv.vb))}; válidos ${fmt(nomSecao)} × vnom ${fmt(N(pv.vnom))}`);

// T4: poder
log('\n== T4. Poder do teste T3 ==');
log('Igualdade exata em inteiros por UF × cargo e por candidato. Menor divergência detectável: 1 voto. Simulação: tira 1 voto de');
log('um número omitido e dá ao 1º colocado de cada UF × cargo; quantos pares o teste acusaria:');
let acusa = 0, sim = 0;
for (const f of fechamento.filter((x) => x.omitidos > 0)) { sim++; const vnt = f.vnt_bu - 1, vnom = f.vnom_bu + 1; if (vnt !== f.vnt_of || vnom !== f.vnom_of) acusa++; }
log(`  ${acusa} de ${sim} pares com números omitidos acusariam (vnt e vnom quebram juntos).`);

// T5: efeito no resultado
log('\n== T5. Os votos omitidos mudariam o resultado? ==');
const efeito = [];
// majoritários
function majoritario(ref, cargo, uf, extra) {
  const vv = N(ref.v.vv), vagas = cargo === 5 ? [...ref.cand.values()].filter((c) => c.e === 's').length : 1;
  const ord = [...ref.cand.values()].filter((c) => c.dvt === 'Válido').sort((a, b) => b.vap - a.vap);
  const lider = ord[0], ultimoEleito = ord[vagas - 1], prox = ord[vagas];
  for (const o of extra) {
    const vv2 = vv + o.bu;
    const linha = { uf, cargo: NOME[cargo], numero: o.numero, nome_urna: o.nome_urna, votos_omitidos: o.bu };
    if (cargo === 5) {
      linha.ultimo_eleito = `${ultimoEleito.nmu} ${ultimoEleito.vap}`; linha.falta_para_vaga = ultimoEleito.vap - o.bu;
      linha.mudaria = o.bu > ultimoEleito.vap ? 'SIM (passaria o último eleito)' : 'não';
    } else {
      const pctAntes = (100 * lider.vap / vv), pctDepois = (100 * lider.vap / vv2);
      linha.lider = `${lider.nmu} ${lider.vap} (${pctAntes.toFixed(3)}% → ${pctDepois.toFixed(3)}% dos válidos)`;
      linha.segundo = `${ord[1].nmu} ${ord[1].vap}`;
      linha.falta_maioria_antes = Math.floor(vv / 2) + 1 - lider.vap;
      linha.mudaria = o.bu > ord[1].vap ? 'SIM (iria ao 2º turno no lugar do 2º)' : (lider.vap > vv / 2 && lider.vap <= vv2 / 2 ? 'SIM (forçaria 2º turno)' : 'não');
    }
    efeito.push(linha);
    log(`  ${uf} ${NOME[cargo]} nº ${o.numero} (${o.nome_urna}): ${fmt(o.bu)} votos → ${linha.mudaria}. ${cargo === 5 ? `Último eleito: ${linha.ultimo_eleito}` : `Líder ${linha.lider}; 2º ${linha.segundo}; faltavam ${linha.falta_maioria_antes} votos para a maioria`}`);
  }
}
{
  const nac = omitPres.map((n) => ({ numero: n, bu: presNacional.get(n) ?? 0, nome_urna: (consulta.get(`br|1|${n}`) ?? []).map((x) => x.nmu).join(' / ') }));
  majoritario(refPres, 1, 'BR', nac);
}
for (const c of [3, 5]) for (const uf of ufs) {
  const ex = omitidos.filter((o) => o.uf === uf && o.cargo === c);
  if (ex.length) majoritario(lerRefCache(uf, c), c, uf, ex);
}
// proporcionais: distribuição de vagas (CE arts. 106-109, Lei 14.211/2021, STF ADIs 7228/7263/7325)
function distribuir(agrs, vv, vagas, qeOficial) {
  const qe = qeOficial ?? (() => { const x = vv / vagas; return (x - Math.floor(x)) > 0.5 ? Math.ceil(x) : Math.floor(x); })();
  const st = agrs.map((a) => ({ ...a, cands: [...a.cands].sort((x, y) => y.vap - x.vap), eleitos: 0 }));
  let livres = vagas;
  for (const a of st) { const qp = Math.floor(a.votos / qe); const aptos = a.cands.filter((c) => c.vap >= 0.1 * qe).length; a.eleitos = Math.min(qp, aptos); livres -= a.eleitos; }
  while (livres > 0) { // 2ª fase: 80% QE e candidato com 20% QE
    const elegiveis = st.filter((a) => a.votos >= 0.8 * qe && a.cands.slice(a.eleitos).some((c) => c.vap >= 0.2 * qe));
    if (!elegiveis.length) break;
    elegiveis.sort((x, y) => y.votos / (y.eleitos + 1) - x.votos / (x.eleitos + 1));
    elegiveis[0].eleitos++; livres--;
  }
  while (livres > 0) { // 3ª fase: todas as agremiações, maiores médias
    const elegiveis = st.filter((a) => a.cands.length > a.eleitos);
    if (!elegiveis.length) break;
    elegiveis.sort((x, y) => y.votos / (y.eleitos + 1) - x.votos / (x.eleitos + 1));
    elegiveis[0].eleitos++; livres--;
  }
  return { qe, st };
}
let validos = 0, invalidos = 0, mudancas = 0;
const prop = [];
for (const c of [6, 7, 8]) for (const uf of ufs) {
  const ref = lerRefCache(uf, c); if (!ref) continue;
  const vagas = ref.agr.reduce((a, x) => a + x.vag, 0);
  const somaAgr = ref.agr.reduce((a, x) => a + x.votos, 0);
  const base = distribuir(ref.agr, N(ref.v.vv), vagas, ref.qe);
  const bate = base.st.every((a) => a.eleitos === a.vag);
  const eleitosOficiais = [...ref.cand.values()].filter((k) => k.e === 's').length;
  if (bate) validos++; else invalidos++;
  const ex = omitidos.filter((o) => o.uf === uf && o.cargo === c);
  if (!ex.length) { if (!bate) log(`  ${uf} ${NOME[c]}: modelo de distribuição NÃO reproduz o oficial (sem omitidos aqui)`); continue; }
  // cenário: todos os omitidos da UF × cargo contam para o candidato e para a agremiação do partido (2 primeiros dígitos)
  const agrs = ref.agr.map((a) => ({ ...a, cands: [...a.cands] }));
  const semAgr = [];
  let extra = 0;
  for (const o of ex) {
    const partido = Number(String(o.numero).slice(0, 2));
    const a = agrs.find((x) => x.par.includes(partido));
    extra += o.bu;
    if (!a) { semAgr.push(`${o.numero}`); continue; }
    a.votos += o.bu; a.cands.push({ n: o.numero, nmu: o.nome_urna, vap: o.bu, omitido: true });
  }
  const cf = distribuir(agrs, N(ref.v.vv) + extra, vagas);
  const mud = cf.st.map((a, i) => (a.eleitos !== base.st[i].eleitos ? `${a.n}: ${base.st[i].eleitos}→${a.eleitos}` : null)).filter(Boolean);
  const eleitosOmit = cf.st.flatMap((a) => a.cands.slice(0, a.eleitos).filter((k) => k.omitido).map((k) => `${k.n} ${k.nmu} (${k.vap})`));
  if (mud.length || eleitosOmit.length) mudancas++;
  const maior = ex.reduce((m, o) => (o.bu > m.bu ? o : m));
  prop.push({ uf, cargo: NOME[c], vagas, qe: ref.qe, qe_cf: cf.qe, soma_agr_igual_vv: somaAgr === N(ref.v.vv), modelo_reproduz_oficial: bate, eleitos_oficiais: eleitosOficiais,
    omitidos: ex.length, votos_omitidos: extra, maior_omitido: `${maior.numero} ${maior.nome_urna} ${maior.bu}`, maior_pct_qe: (100 * maior.bu / ref.qe).toFixed(1),
    sem_agremiacao: semAgr.join(','), muda_vagas: mud.join(' ; ') || 'não', omitido_seria_eleito: eleitosOmit.join(' ; ') || 'não' });
}
log(`  Proporcionais: modelo de distribuição reproduz o oficial em ${validos} de ${validos + invalidos} UF × cargo.`);
for (const p of prop) log(`  ${p.uf} ${p.cargo.padEnd(14)} vagas ${String(p.vagas).padStart(3)} QE ${fmt(p.qe).padStart(7)}  omitidos ${String(p.omitidos).padStart(2)} (${fmt(p.votos_omitidos).padStart(6)} votos; maior ${p.maior_omitido}, ${p.maior_pct_qe}% do QE)  modelo=oficial: ${p.modelo_reproduz_oficial ? 'sim' : 'NÃO'}  muda vagas: ${p.muda_vagas}  omitido eleito: ${p.omitido_seria_eleito}${p.sem_agremiacao ? `  sem agremiação: ${p.sem_agremiacao}` : ''}`);
log(`  UF × cargo proporcionais em que o cenário muda algo: ${mudancas}`);

// ---------- arquivos ----------
const csv = (rows) => { if (!rows.length) return ''; const cols = Object.keys(rows[0]); return [cols.join(';'), ...rows.map((r) => cols.map((c) => String(r[c] ?? '').replaceAll(';', ',')).join(';'))].join('\n') + '\n'; };
writeFileSync(`${DIR}/numeros-omitidos-lista.csv`, csv(omitidos));
writeFileSync(`${DIR}/numeros-omitidos-fechamento.csv`, csv(fechamento));
writeFileSync(`${DIR}/numeros-omitidos-efeito-majoritario.csv`, csv(efeito));
writeFileSync(`${DIR}/numeros-omitidos-efeito-proporcional.csv`, csv(prop));
writeFileSync(`${DIR}/numeros-omitidos-alternativas.txt`, saida.join('\n') + '\n');
log(`\nArquivos em ${DIR}/numeros-omitidos-*`);
