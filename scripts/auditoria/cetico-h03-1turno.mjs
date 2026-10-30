// Cético revisor, parecer 26: conferências independentes do H03 do 1º turno (docs/analysis/matematico-forense/06).
// Não reaproveita o código do autor. Mede:
//   A  identidade interna dos JSON da divulgação (tv, tvn, vv) e campos que o autor não compara (vsan, vscv, tval, tvan).
//   B  tipos de voto do BU no 1º turno por eleição × cargo (há tipo fora de nominal/legenda/branco/nulo? legenda em majoritário?).
//   C  conjunto de números sem linha no munzona (saída contagem-munzona) × conjunto de omitidos da divulgação (saída do autor).
//   D  proporcionais: votos de cada agremiação derivados do BU (não do tvtn/tvtl do JSON); modelo próprio de quociente e sobras,
//      com registro da fase de cada vaga; base × oficial e cenário "vnt válido"; margens das cláusulas 80% e 20% no cenário.
//   E  majoritários: votos que bastariam do omitido para mudar o resultado; vagas de senador por UF.
//   F  eleição 6261 (PE): seções, aptos, comparecimento, comparado com a 6259 nas mesmas seções; há referência oficial?
//   G  votacao_secao_2026_BR: quais cargos o arquivo traz (o teste 2 do autor só cobre presidente).
// Sem rede. Uso: node --max-old-space-size=8000 scripts/auditoria/cetico-h03-1turno.mjs [--sem-g]
// Saída: data/parsed/auditoria/cetico/h03-1t-cetico.txt
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { UFS } from '../../src/config.js';
import { ZIPS, entradasZip, linhasCsv } from './contagem-zip.mjs';

const OUT = 'data/parsed/auditoria/cetico';
const REF = 'data/raw/1t/referencia';
mkdirSync(OUT, { recursive: true });
const saida = [];
const p = (...a) => { const s = a.join(' '); saida.push(s); console.log(s); };
const N = (x) => Number(String(x ?? 0).replace(',', '.'));
const f = (x) => Number(x).toLocaleString('pt-BR');

const { db, fonte } = await abrirLeitura();
p(`Banco: ${fonte}`);

// ---------- referência ----------
const arquivos = readdirSync(REF).filter((a) => /^[a-z]{2}-c\d{4}-e\d{6}-u\.json$/.test(a));
const refs = new Map();
for (const a of arquivos) {
  const j = JSON.parse(readFileSync(`${REF}/${a}`, 'utf8'));
  const [abr, c] = a.split('-');
  refs.set(`${abr}|${Number(c.slice(1))}`, { arq: a, j });
}
p(`\n== A. JSON da divulgação: ${refs.size} arquivos ==`);
let okA = 0; const extras = [];
for (const [k, { j }] of refs) {
  const v = Object.fromEntries(Object.entries(j.v).map(([x, y]) => [x, N(y)]));
  const vl = v.vl ?? 0;
  const i1 = v.tv === v.vv + v.vb + v.tvn + v.van + v.vansj;
  const i1b = v.tv === v.vvc + v.vb + v.tvn;
  const i2 = v.tvn === v.vn + v.vnt;
  const i3 = v.vv === v.vnom + vl;
  const i4 = v.vvc === v.vv;
  if (i1 && i2 && i3) okA++; else p(`  ${k}: tv=vv+vb+tvn+van+vansj ${i1}; tv=vvc+vb+tvn ${i1b}; tvn=vn+vnt ${i2}; vv=vnom+vl ${i3}; vvc=vv ${i4}`, JSON.stringify(v));
  if (v.vsan || v.vscv) extras.push(`${k} vsan ${v.vsan} vscv ${v.vscv}`);
  const chaves = Object.keys(j.v).filter((x) => !/^p/.test(x));
  if (k === 'br|1' || k === 'sp|6') p(`  campos de v (${k}): ${chaves.join(',')}`);
}
p(`  identidade tv = vv + vb + (vn + vnt) + van + vansj e vv = vnom + vl: ${okA}/${refs.size}`);
p(`  arquivos com vsan ou vscv ≠ 0: ${extras.length ? extras.join('; ') : 'nenhum'}`);

// ---------- B ----------
p('\n== B. Tipos de voto do BU no 1º turno (eleição × cargo × tipo) ==');
const qTipos = db.prepare(`SELECT eleicao, cargo, tipo_voto, COUNT(*) AS linhas, SUM(quantidade) AS q,
  SUM(CASE WHEN tipo_voto = 'legenda' AND numero <> partido THEN 1 ELSE 0 END) AS leg_num_ne_partido
  FROM voto_bu WHERE turno = 1 AND uf = ? GROUP BY 1, 2, 3`);
const tipos = new Map();
const buUf = new Map(); // uf → linhas por cargo/tipo/numero (para D)
const qBu = db.prepare(`SELECT cargo, tipo_voto, numero, SUM(quantidade) AS q FROM voto_bu WHERE turno = 1 AND uf = ? AND cargo IN (1,3,5,6,7,8) GROUP BY 1, 2, 3`);
for (const uf of UFS) {
  for (const r of qTipos.all(uf)) {
    const k = `${r.eleicao}|${r.cargo}|${r.tipo_voto}`;
    const t = tipos.get(k) ?? { linhas: 0, q: 0, ne: 0 };
    t.linhas += r.linhas; t.q += r.q; t.ne += r.leg_num_ne_partido; tipos.set(k, t);
  }
  buUf.set(uf, qBu.all(uf));
  console.error(`  B ${uf}`);
}
for (const [k, t] of [...tipos].sort()) p(`  ${k.padEnd(22)} linhas ${f(t.linhas).padStart(12)}  votos ${f(t.q).padStart(13)}${t.ne ? `  legenda com numero ≠ partido: ${t.ne}` : ''}`);

// ---------- C ----------
p('\n== C. Números sem linha no munzona × números ausentes da divulgação ==');
const lerCsv = (arq) => { const [cab, ...ls] = readFileSync(arq, 'utf8').trim().split('\n'); const c = cab.split(';'); return ls.map((l) => Object.fromEntries(l.split(';').map((x, i) => [c[i], x]))); };
const mz = new Map(); let mzOutroTipo = 0;
for (const d of lerCsv('data/parsed/auditoria/contagem/munzona-1t-divergencias.csv')) {
  if (Number(d.oficial) !== 0 || Number(d.linhas_oficial) !== 0) { mzOutroTipo++; continue; }
  const abr = d.cargo === '1' ? 'br' : d.uf;
  const k = `${abr}|${Number(d.cargo)}|${Number(d.numero)}`;
  mz.set(k, (mz.get(k) ?? 0) + Number(d.bu));
}
const om = new Map();
for (const o of lerCsv('data/parsed/auditoria/matematico/h03-1t-omitidos.csv')) if (o.tipo === 'nominal') om.set(`${o.abr}|${Number(o.cargo)}|${Number(o.numero)}`, Number(o.votos));
const soMz = [...mz].filter(([k]) => !om.has(k)); const soOm = [...om].filter(([k]) => !mz.has(k));
const votoDif = [...mz].filter(([k, q]) => om.has(k) && om.get(k) !== q);
p(`  divergências do munzona que não são "BU sem linha": ${mzOutroTipo}`);
p(`  números no munzona: ${mz.size} (${f([...mz.values()].reduce((a, b) => a + b, 0))} votos); na divulgação: ${om.size} (${f([...om.values()].reduce((a, b) => a + b, 0))} votos)`);
p(`  só no munzona: ${soMz.length}; só na divulgação: ${soOm.length}; mesmos números com votos diferentes: ${votoDif.length}`);

// ---------- D ----------
p('\n== D. Proporcionais: modelo próprio, votos das agremiações tirados do BU ==');
const buDe = (abr, cargo) => {
  const nom = new Map(), leg = new Map();
  const ufs = cargo === 1 ? UFS : [abr];
  for (const uf of ufs) for (const r of buUf.get(uf)) if (r.cargo === cargo) {
    if (r.tipo_voto === 'nominal') nom.set(r.numero, (nom.get(r.numero) ?? 0) + r.q);
    if (r.tipo_voto === 'legenda') leg.set(r.numero, (leg.get(r.numero) ?? 0) + r.q);
  }
  return { nom, leg };
};
const qeDe = (vv, vagas) => { const x = vv / vagas; const fl = Math.floor(x); return x - fl > 0.5 ? fl + 1 : fl; };
function dhondt(ags, qe, vagas) {
  // ags: [{id, votos, cands:[{n,v}]}] ; retorna {eleitos: Map id→n, fase: [...]} com fase de cada vaga
  const st = ags.map((a) => ({ id: a.id, votos: a.votos, cands: [...a.cands].sort((x, y) => y.v - x.v || x.n - y.n), k: 0 }));
  const fases = []; let livres = vagas;
  for (const a of st) { const qp = Math.floor(a.votos / qe); const aptos = a.cands.filter((c) => c.v >= 0.1 * qe).length; a.k = Math.min(qp, aptos); livres -= a.k; for (let i = 0; i < a.k; i++) fases.push({ fase: 1, ag: a.id, n: a.cands[i].n }); }
  const m = (a) => a.votos / (a.k + 1);
  while (livres > 0) {
    const el = st.filter((a) => a.votos >= 0.8 * qe && a.k < a.cands.length && a.cands[a.k].v >= 0.2 * qe).sort((x, y) => m(y) - m(x));
    if (!el.length) break;
    fases.push({ fase: 2, ag: el[0].id, n: el[0].cands[el[0].k].n, media: m(el[0]) }); el[0].k++; livres--;
  }
  while (livres > 0) {
    const el = st.filter((a) => a.k < a.cands.length).sort((x, y) => m(y) - m(x));
    if (!el.length) break;
    fases.push({ fase: 3, ag: el[0].id, n: el[0].cands[el[0].k].n, media: m(el[0]) }); el[0].k++; livres--;
  }
  return { st, fases, eleitos: fases.map((x) => x.n).sort((a, b) => a - b).join(',') };
}
const omit = lerCsv('data/parsed/auditoria/matematico/h03-1t-omitidos.csv');
const linhasD = [];
for (const [k, { j }] of [...refs].sort()) {
  const cargo = Number(k.split('|')[1]); const abr = k.split('|')[0];
  if (cargo < 6) continue;
  const c = j.carg[0]; const v = Object.fromEntries(Object.entries(j.v).map(([x, y]) => [x, N(y)]));
  const { nom, leg } = buDe(abr, cargo);
  const ags = []; let somaTv = 0;
  for (const a of c.agr) {
    const ag = { id: String(a.n), votos: 0, cands: [], vag: N(a.vag), tvJson: 0 };
    for (const pa of a.par) {
      ag.tvJson += N(pa.tvtn) + N(pa.tvtl);
      if (pa.dvt === 'Válido (legenda)') ag.votos += leg.get(Number(pa.n)) ?? 0;
      for (const kd of pa.cand) {
        const q = nom.get(Number(kd.n)) ?? 0;
        if (kd.dvt === 'Válido') { ag.votos += q; ag.cands.push({ n: Number(kd.n), v: q, eOf: kd.e === 's' }); }
        if (kd.dvt === 'Válido (legenda)') ag.votos += q;
      }
    }
    somaTv += ag.tvJson; ags.push(ag);
  }
  const vagas = ags.reduce((s, a) => s + a.vag, 0);
  const vvBu = ags.reduce((s, a) => s + a.votos, 0);
  const qe = qeDe(vvBu, vagas);
  const base = dhondt(ags, qe, vagas);
  const ofic = ags.flatMap((a) => a.cands.filter((x) => x.eOf).map((x) => x.n)).sort((a, b) => a - b).join(',');
  const vagOk = base.st.every((a, i) => a.k === ags[i].vag);
  // cenário
  const ags2 = ags.map((a) => ({ ...a, cands: [...a.cands], par: c.agr.find((x) => String(x.n) === a.id).par.map((x) => Number(x.n)) }));
  let vnt = 0;
  for (const o of omit.filter((x) => x.abr === abr && Number(x.cargo) === cargo)) {
    const q = Number(o.votos); vnt += q;
    const part = o.tipo === 'legenda' ? Number(o.numero) : Math.floor(Number(o.numero) / (cargo === 6 ? 100 : 1000));
    let a = ags2.find((x) => x.par.includes(part));
    if (!a) { a = { id: `novo${part}`, votos: 0, cands: [], vag: 0, par: [part] }; ags2.push(a); }
    a.votos += q; if (o.tipo === 'nominal') a.cands.push({ n: Number(o.numero), v: q, omit: true });
  }
  const qe2 = qeDe(vvBu + vnt, vagas);
  const cen = dhondt(ags2, qe2, vagas);
  // variante: o voto nominal omitido vale só para a agremiação (o candidato não pode ser eleito, como no art. 175 § 4º do CE)
  const cenLeg = dhondt(ags2.map((a) => ({ ...a, cands: a.cands.filter((x) => !x.omit) })), qe2, vagas);
  const fase3b = base.fases.filter((x) => x.fase === 3).length, fase3c = cen.fases.filter((x) => x.fase === 3).length;
  // margens no cenário: agremiações sem vaga perto de 80%; candidato seguinte perto de 20%
  const menorMedia = Math.min(...cen.fases.filter((x) => x.fase > 1).map((x) => x.media), Infinity);
  const linha = { par: k, vagas, vv_bu: vvBu, vv_of: v.vv, soma_tvtn_tvtl: somaTv, qe_calc: qe, qe_of: N(c.qe), base_igual: vagOk && base.eleitos === ofic, vnt, qe2,
    muda: cen.eleitos !== base.eleitos, muda_so_legenda: cenLeg.eleitos !== base.eleitos, fase3_base: fase3b, fase3_cen: fase3c, menor_media_sobras_cen: Math.round(menorMedia) };
  linhasD.push(linha);
  if (abr === 'rj' && cargo === 6) {
    p(`  RJ dep. federal: vagas ${vagas}, vv ${f(vvBu)}, QE ${f(qe)} (oficial ${f(N(c.qe))}); 80% ${f(0.8 * qe)}; 20% ${f(0.2 * qe)}; 10% ${f(0.1 * qe)}`);
    p(`   base: vagas por fase ${[1, 2, 3].map((x) => base.fases.filter((y) => y.fase === x).length).join('/')}; menor média vencedora nas sobras ${f(Math.round(Math.min(...base.fases.filter((x) => x.fase > 1).map((x) => x.media))))}`);
    const a70 = ags2.find((x) => x.par.includes(70));
    const a70b = base.st.find((x) => x.id === a70.id);
    p(`   agremiação do partido 70: votos BU ${f(a70b.votos)}, vagas ${a70b.k}, maior candidato ${f(a70b.cands[0]?.v ?? 0)}; média ${f(Math.round(a70b.votos / (a70b.k + 1)))}`);
    p(`   cenário: vv ${f(vvBu + vnt)}, QE ${f(qe2)}; 80% ${f(0.8 * qe2)}; 20% ${f(0.2 * qe2)}; vagas por fase ${[1, 2, 3].map((x) => cen.fases.filter((y) => y.fase === x).length).join('/')}`);
    const a70c = cen.st.find((x) => x.id === a70.id);
    p(`   partido 70 no cenário: votos ${f(a70c.votos)} (${(100 * a70c.votos / qe2).toFixed(1)}% do QE), vagas ${a70c.k}, maior candidato ${f(a70c.cands[0].v)} (${a70c.cands[0].omit ? 'omitido' : 'publicado'}), 2º ${f(a70c.cands[1]?.v ?? 0)}`);
    // margem: quão perto do 20% está o candidato seguinte de cada agremiação com ≥ 80% e média alta
    const perto = cen.st.filter((a) => a.votos >= 0.8 * qe2 && a.k < a.cands.length).map((a) => ({ id: a.id, prox: a.cands[a.k].v, media: Math.round(a.votos / (a.k + 1)) }))
      .filter((x) => x.media >= menorMedia * 0.9).sort((a, b) => b.media - a.media).slice(0, 8);
    p(`   no cenário, agremiações com ≥ 80% e média ≥ 90% da menor vencedora (${f(Math.round(menorMedia))}): ${perto.map((x) => `${x.id.slice(-6)} média ${f(x.media)} próximo cand ${f(x.prox)} (${(100 * x.prox / qe2).toFixed(1)}% QE)`).join('; ')}`);
    const quase80 = cen.st.filter((a) => a.votos < 0.8 * qe2 && a.votos >= 0.7 * qe2).map((a) => `${a.id.slice(-6)} ${f(a.votos)}`);
    p(`   agremiações entre 70% e 80% do QE no cenário: ${quase80.join('; ') || 'nenhuma'}`);
  }
}
const dOk = linhasD.filter((x) => x.base_igual && x.qe_calc === x.qe_of && x.vv_bu === x.vv_of).length;
p(`  pares proporcionais: ${linhasD.length}; modelo próprio (votos do BU) reproduz QE, vv, vagas e eleitos oficiais: ${dOk}/${linhasD.length}`);
for (const x of linhasD.filter((y) => !(y.base_igual && y.qe_calc === y.qe_of && y.vv_bu === y.vv_of))) p('   ≠', JSON.stringify(x));
p(`  pares em que Σ(tvtn+tvtl) do JSON ≠ vv: ${linhasD.filter((x) => x.soma_tvtn_tvtl !== x.vv_of).map((x) => `${x.par} ${x.soma_tvtn_tvtl}×${x.vv_of}`).join('; ') || 'nenhum'}`);
p(`  pares com vaga na 3ª fase (base): ${linhasD.filter((x) => x.fase3_base).map((x) => `${x.par}:${x.fase3_base}`).join(', ') || 'nenhum'}; no cenário: ${linhasD.filter((x) => x.fase3_cen).map((x) => `${x.par}:${x.fase3_cen}`).join(', ') || 'nenhum'}`);
p(`  cenário vnt válido muda eleitos em: ${linhasD.filter((x) => x.muda).map((x) => x.par).join(', ') || 'nenhum par'}`);
p(`  variante "omitido vale só para a agremiação" muda eleitos em: ${linhasD.filter((x) => x.muda_so_legenda).map((x) => x.par).join(', ') || 'nenhum par'}`);

// ---------- E ----------
p('\n== E. Majoritários ==');
for (const [k, { j }] of [...refs].sort()) {
  const cargo = Number(k.split('|')[1]); const abr = k.split('|')[0];
  if (cargo > 5) continue;
  const v = Object.fromEntries(Object.entries(j.v).map(([x, y]) => [x, N(y)]));
  const cands = j.carg[0].agr.flatMap((a) => a.par.flatMap((pa) => pa.cand)).map((x) => ({ n: Number(x.n), vap: N(x.vap), dvt: x.dvt, st: x.st, e: x.e }));
  const val = cands.filter((x) => x.dvt === 'Válido').sort((a, b) => b.vap - a.vap);
  const om5 = omit.filter((x) => x.abr === abr && Number(x.cargo) === cargo).map((x) => ({ n: Number(x.numero), v: Number(x.votos) }));
  const sts = [...new Set(cands.map((x) => `${x.st}/${x.e}`))].join(' ');
  if (cargo === 5) {
    const eleitos = cands.filter((x) => x.st === 'Eleito').length;
    if (eleitos !== 2 || om5.length) p(`  ${k} senador: eleitos ${eleitos}; último eleito ${val[eleitos - 1].n} ${f(val[eleitos - 1].vap)}; omitidos ${om5.map((x) => `${x.n}:${f(x.v)}`).join(',') || '-'}; status ${sts}`);
    continue;
  }
  const lider = val[0]; const precisa = 2 * lider.vap - v.vv; // votos válidos a mais que tiram a maioria absoluta
  if (om5.length || Math.abs(lider.vap / v.vv - 0.5) < 0.01) p(`  ${k}: líder ${lider.n} ${f(lider.vap)} / vv ${f(v.vv)} = ${(100 * lider.vap / v.vv).toFixed(3)}%; ${precisa > 0 ? `perde a maioria com ${f(precisa)} válidos de outros a mais` : `faltam ${f(Math.floor(v.vv / 2) + 1 - lider.vap)} para a maioria`}; omitidos ${om5.map((x) => `${x.n}:${f(x.v)}`).join(',') || '-'}; status ${sts}`);
}
const senEle = [...refs].filter(([k]) => k.endsWith('|5')).map(([, { j }]) => j.carg[0].agr.flatMap((a) => a.par.flatMap((pa) => pa.cand)).filter((x) => x.st === 'Eleito').length);
p(`  senado: UFs ${senEle.length}, eleitos por UF: ${[...new Set(senEle)].join(',')}`);

// ---------- F ----------
p('\n== F. Eleição 6261 (PE) ==');
const e61 = db.prepare(`SELECT a.municipio, a.zona, a.secao, a.aptos AS aptos61, a.comparecimento_majoritario AS c61, b.aptos AS aptos59, b.comparecimento_majoritario AS c59
  FROM secao_eleicao a LEFT JOIN secao_eleicao b ON b.turno = 1 AND b.uf = a.uf AND b.municipio = a.municipio AND b.zona = a.zona AND b.secao = a.secao AND b.eleicao = 6259
  WHERE a.turno = 1 AND a.eleicao = 6261`).all();
p(`  seções: ${e61.length}; aptos 6261 ${e61.reduce((s, x) => s + x.aptos61, 0)}; comparecimento 6261 ${e61.reduce((s, x) => s + x.c61, 0)}; mesmas seções na 6259: aptos ${e61.reduce((s, x) => s + (x.aptos59 ?? 0), 0)}, comparecimento ${e61.reduce((s, x) => s + (x.c59 ?? 0), 0)}; seções em que difere: ${e61.filter((x) => x.aptos61 !== x.aptos59 || x.c61 !== x.c59).length}`);
p(`  municípios: ${[...new Set(e61.map((x) => x.municipio))].join(',')}`);
const v61 = db.prepare(`SELECT cargo, tipo_voto, numero, SUM(quantidade) AS q FROM voto_bu WHERE turno = 1 AND uf = 'pe' AND eleicao = 6261 GROUP BY 1, 2, 3`).all();
p(`  votos BU 6261: ${v61.map((x) => `c${x.cargo} ${x.tipo_voto}${x.numero ?? ''}=${x.q}`).join('; ')}`);
p(`  referência oficial da 6261 em ${REF}: ${readdirSync(REF).filter((a) => a.includes('006261')).join(',') || 'nenhuma'}`);

// ---------- G ----------
if (!process.argv.includes('--sem-g')) {
  p('\n== G. Cargos no votacao_secao_2026_BR (1º turno) ==');
  const ent = (await entradasZip(ZIPS.votacaoSecao)).filter((x) => x.nome.endsWith('.csv'));
  p(`  entradas csv: ${ent.map((x) => x.nome).join(',')}`);
  const cg = new Map();
  for (const e of ent) for await (const o of linhasCsv(ZIPS.votacaoSecao, e)) { if (o.NR_TURNO !== '1') continue; cg.set(o.CD_CARGO, (cg.get(o.CD_CARGO) ?? 0) + 1); }
  p(`  linhas por cargo: ${[...cg].map(([c, n]) => `${c}:${f(n)}`).join('; ')}`);
}

writeFileSync(`${OUT}/h03-1t-cetico.txt`, saida.join('\n') + '\n');
writeFileSync(`${OUT}/h03-1t-cetico-proporcionais.csv`, [Object.keys(linhasD[0]).join(';'), ...linhasD.map((x) => Object.values(x).join(';'))].join('\n') + '\n');
p(`\nSaídas: ${OUT}/h03-1t-cetico.txt, ${OUT}/h03-1t-cetico-proporcionais.csv`);
