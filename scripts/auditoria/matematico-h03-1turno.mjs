// Matemático forense, H03 no 1º turno completo (28 UFs, todos os cargos): fechamento por UF × cargo entre a soma dos
// BUs (banco, cópia de leitura) e o total oficial da divulgação (resultados.tse.jus.br, JSON `*-u.json` já baixados em
// data/raw/1t/referencia), identidade do nulo técnico (vnt) e efeito da classificação sobre os resultados.
//
// Invariantes testados (cada voto do BU tem um, e só um, destino oficial, dado pela destinação `dvt` do JSON):
//   I0  universo: seções no banco = seções da UF na divulgação (ts); BU completo = seções instaladas (si); nenhuma
//       seção completa sem linha em secao_eleicao.
//   I1  aptos (Σ secao_eleicao.aptos) = eleitorado das seções instaladas (esi); comparecimento = c.
//   I2  brancos BU = vb; nulos BU = vn.
//   I3  cada candidato publicado: votos BU = vap; cada partido com legenda válida: legenda BU (+ nominais dos
//       candidatos "Válido (legenda)") = tvtl.
//   I4  categorias: Σ BU por destino = vnom, vl, van, vansj; o que não tem destino no JSON (número de candidato ou
//       partido ausente) = vnt; e o total = tv.
//   I5  efeito: com o vnt contado como válido (cada número omitido para o seu candidato e partido), muda o eleito,
//       a ida ao 2º turno ou alguma vaga? (o modelo de cálculo é validado antes contra o resultado oficial).
// Sem rede. Uso: node scripts/auditoria/matematico-h03-1turno.mjs
// Saídas: data/parsed/auditoria/matematico/h03-1t-{resumo.txt,fechamento.csv,omitidos.csv,efeito.csv}
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { UFS } from '../../src/config.js';

const OUT = 'data/parsed/auditoria/matematico';
const REF = 'data/raw/1t/referencia';
mkdirSync(OUT, { recursive: true });
const linhas = [];
const p = (...a) => { const s = a.join(' '); linhas.push(s); console.log(s); };
const N = (x) => Number(x ?? 0);
const f = (x) => Number(x).toLocaleString('pt-BR');
const pct = (a, b) => `${(100 * a / b).toFixed(3)}%`;
const NOME = { 1: 'Presidente', 3: 'Governador', 5: 'Senador', 6: 'Dep. Federal', 7: 'Dep. Estadual', 8: 'Dep. Distrital' };
const DESTINO = { 'Válido': 'vnom', 'Válido (legenda)': 'vl', 'Anulado': 'van', 'Anulado sub judice': 'vansj' };
const inicio = Date.now();

const { db, fonte } = await abrirLeitura();
p(`Banco: ${fonte}`);

// ---------- referência oficial ----------
function lerRef(abr, cargo) {
  const arq = `${REF}/${abr}-c${String(cargo).padStart(4, '0')}-e${cargo === 1 ? '006257' : '006259'}-u.json`;
  if (!existsSync(arq)) return null;
  const j = JSON.parse(readFileSync(arq, 'utf8'));
  const c = j.carg[0];
  if (Number(c.cd) !== cargo) throw new Error(`${arq}: cargo ${c.cd}`);
  const cand = new Map(); const par = new Map(); const agr = [];
  for (const a of c.agr) {
    const ag = { n: String(a.n), vag: N(a.vag), par: [], votos: 0, cands: [] };
    for (const pa of a.par) {
      const np = Number(pa.n);
      ag.par.push(np);
      ag.votos += N(pa.tvtn) + N(pa.tvtl);
      par.set(np, { dvt: pa.dvt, tvtl: N(pa.tvtl), tvtn: N(pa.tvtn), agr: ag.n });
      for (const k of pa.cand) {
        const o = { n: Number(k.n), nmu: k.nmu, dvt: k.dvt, st: k.st, e: k.e, vap: N(k.vap), partido: np, agr: ag.n };
        cand.set(o.n, o);
        if (k.dvt === 'Válido') ag.cands.push(o);
      }
    }
    agr.push(ag);
  }
  // os JSON majoritários não têm os campos de legenda (vl): vale 0
  return { arq, dg: `${j.dg} ${j.hg}`, v: { vl: 0, ...Object.fromEntries(Object.entries(j.v).map(([k, x]) => [k, N(x)])) },
    e: Object.fromEntries(Object.entries(j.e).map(([k, x]) => [k, N(String(x).replace(',', '.'))])),
    s: Object.fromEntries(Object.entries(j.s).map(([k, x]) => [k, N(String(x).replace(',', '.'))])), qe: N(c.qe), cand, par, agr };
}

// ---------- banco ----------
const qSit = db.prepare('SELECT situacao, COUNT(*) AS n FROM secao WHERE turno = 1 AND uf = ? GROUP BY 1');
const qSemEleicao = db.prepare(`SELECT COUNT(*) AS n FROM secao s WHERE s.turno = 1 AND s.uf = ? AND s.situacao = 'completa'
  AND NOT EXISTS (SELECT 1 FROM secao_eleicao e WHERE e.turno = 1 AND e.uf = s.uf AND e.municipio = s.municipio AND e.zona = s.zona AND e.secao = s.secao)`);
const qEle = db.prepare(`SELECT eleicao, COUNT(*) AS secoes, SUM(aptos) AS aptos, SUM(aptos_secao) AS aptos_secao, SUM(aptos_tte) AS aptos_tte,
  SUM(comparecimento_majoritario) AS cmaj, SUM(comparecimento_proporcional) AS cprop FROM secao_eleicao WHERE turno = 1 AND uf = ? GROUP BY eleicao`);
const qBu = db.prepare(`SELECT cargo, tipo_voto, numero, SUM(quantidade) AS q FROM voto_bu
  WHERE turno = 1 AND uf = ? AND cargo IN (1,3,5,6,7,8) GROUP BY 1, 2, 3`);

const bu = new Map(); // abr|cargo → { nominal: Map, legenda: Map, branco, nulo, outros, aptos, comp, secoes }
const universo = [];
const novo = () => ({ nominal: new Map(), legenda: new Map(), branco: 0, nulo: 0, outros: 0, aptos: 0, comp: 0, secoesEle: 0 });
const soma = (m, k, q) => m.set(k, (m.get(k) ?? 0) + q);
for (const uf of UFS) {
  const t0 = Date.now();
  const sit = Object.fromEntries(qSit.all(uf).map((r) => [r.situacao, r.n]));
  const ele = new Map(qEle.all(uf).map((r) => [r.eleicao, r]));
  const semEle = qSemEleicao.get(uf).n;
  for (const r of qBu.all(uf)) {
    for (const abr of r.cargo === 1 ? [uf, 'br'] : [uf]) {
      const k = `${abr}|${r.cargo}`;
      if (!bu.has(k)) bu.set(k, novo());
      const t = bu.get(k);
      if (r.tipo_voto === 'nominal') soma(t.nominal, r.numero, r.q);
      else if (r.tipo_voto === 'legenda') soma(t.legenda, r.numero, r.q);
      else if (r.tipo_voto === 'branco' || r.tipo_voto === 'nulo') t[r.tipo_voto] += r.q;
      else t.outros += r.q;
    }
  }
  for (const [eleicao, e] of ele) {
    // 6257 federal, 6259 estadual; outras (consulta popular 6261 em PE, cargo 25) ficam fora do H03
    const cargos = eleicao === 6257 ? [1] : eleicao === 6259 ? [3, 5, 6, 7, 8] : [];
    for (const cargo of cargos) {
      for (const abr of cargo === 1 ? [uf, 'br'] : [uf]) {
        const k = `${abr}|${cargo}`;
        if (!bu.has(k)) continue; // cargo sem voto nenhum nesta UF (ex.: estadual no DF)
        const t = bu.get(k);
        t.aptos += e.aptos; t.comp += cargo >= 6 ? e.cprop : e.cmaj; t.secoesEle += e.secoes;
        t.aptosTte = (t.aptosTte ?? 0) + e.aptos_tte;
      }
    }
  }
  universo.push({ uf, completa: sit.completa ?? 0, sem_arquivo: sit.sem_arquivo ?? 0, outras: Object.entries(sit).filter(([s]) => !['completa', 'sem_arquivo'].includes(s)).reduce((a, [, n]) => a + n, 0),
    sem_secao_eleicao: semEle, secoes_6257: ele.get(6257)?.secoes ?? 0, secoes_6259: ele.get(6259)?.secoes ?? 0 });
  console.error(`  ${uf}: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

// ---------- I0 universo ----------
p('\n== I0. Universo do 1º turno ==');
let totSec = 0, totComp = 0, totSemArq = 0, ok0 = 0;
for (const u of universo) {
  const ref = u.uf === 'zz' ? null : lerRef(u.uf, 3);
  u.ts = ref?.s.ts ?? ''; u.si = ref?.s.si ?? '';
  const secoes = u.completa + u.sem_arquivo + u.outras;
  totSec += secoes; totComp += u.completa; totSemArq += u.sem_arquivo;
  const bate = ref ? secoes === u.ts && u.completa === u.si && !u.outras && !u.sem_secao_eleicao : !u.outras && !u.sem_secao_eleicao;
  if (bate) ok0++;
  p(`  ${u.uf.toUpperCase()} seções ${f(secoes).padStart(7)} (completas ${f(u.completa)}, sem arquivo ${u.sem_arquivo}, outras ${u.outras}, completas sem secao_eleicao ${u.sem_secao_eleicao})  divulgação: ts ${ref ? f(u.ts) : '-'} si ${ref ? f(u.si) : '-'}  ${bate ? 'ok' : 'DIVERGE'}`);
}
const refBr = lerRef('br', 1);
p(`  País: ${f(totSec)} seções, ${f(totComp)} completas, ${totSemArq} sem arquivo. Divulgação nacional (presidente): ts ${f(refBr.s.ts)}, si ${f(refBr.s.si)}, sni ${f(refBr.s.sni)}. UFs que fecham: ${ok0}/28`);

// ---------- I1–I4 ----------
const fech = []; const omitidos = []; const candDiv = []; const parDiv = []; const soOficial = [];
const pares = [...bu.keys()].filter((k) => !k.startsWith('zz|')).sort(); // ZZ só vota presidente, que é nacional
for (const k of pares) {
  const [abr, cs] = k.split('|'); const cargo = Number(cs);
  if (cargo === 1 && abr !== 'br') continue; // presidente: a divulgação é nacional
  const ref = lerRef(abr, cargo);
  if (!ref) { p(`  SEM REFERÊNCIA: ${k}`); continue; }
  const t = bu.get(k);
  const cat = { vnom: 0, vl: 0, van: 0, vansj: 0, vnt: 0, outro: 0 };
  let vntNom = 0, vntLeg = 0;
  for (const [num, q] of t.nominal) {
    const c = ref.cand.get(num);
    if (!c) { cat.vnt += q; vntNom += q; omitidos.push({ abr, cargo, tipo: 'nominal', numero: num, votos: q }); continue; }
    if (c.vap !== q) candDiv.push({ abr, cargo, numero: num, bu: q, vap: c.vap, dvt: c.dvt });
    cat[DESTINO[c.dvt] ?? 'outro'] += q;
  }
  for (const [c] of ref.cand) if (!t.nominal.has(c) && ref.cand.get(c).vap > 0) soOficial.push({ abr, cargo, numero: c, vap: ref.cand.get(c).vap });
  const legValida = new Map();
  for (const [part, q] of t.legenda) {
    const pa = ref.par.get(part);
    if (!pa) { cat.vnt += q; vntLeg += q; omitidos.push({ abr, cargo, tipo: 'legenda', numero: part, votos: q }); continue; }
    cat[DESTINO[pa.dvt] ?? 'outro'] += q;
    if (pa.dvt === 'Válido (legenda)') soma(legValida, part, q);
  }
  for (const [num, c] of ref.cand) if (c.dvt === 'Válido (legenda)') soma(legValida, c.partido, t.nominal.get(num) ?? 0);
  for (const [part, pa] of ref.par) if (pa.dvt === 'Válido (legenda)' && (legValida.get(part) ?? 0) !== pa.tvtl) parDiv.push({ abr, cargo, partido: part, bu: legValida.get(part) ?? 0, tvtl: pa.tvtl });
  const nominal = [...t.nominal.values()].reduce((a, b) => a + b, 0), legenda = [...t.legenda.values()].reduce((a, b) => a + b, 0);
  const v = ref.v;
  fech.push({ abr, cargo, secoes: t.secoesEle, aptos_bu: t.aptos, aptos_of: ref.e.esi, comp_bu: t.comp, comp_of: ref.e.c,
    vb_bu: t.branco, vb_of: v.vb, vn_bu: t.nulo, vn_of: v.vn, vnom_bu: cat.vnom, vnom_of: v.vnom, vl_bu: cat.vl, vl_of: v.vl,
    van_bu: cat.van, van_of: v.van, vansj_bu: cat.vansj, vansj_of: v.vansj, vnt_bu: cat.vnt, vnt_of: v.vnt,
    tv_bu: nominal + legenda + t.branco + t.nulo + t.outros, tv_of: v.tv, vv_bu: cat.vnom + cat.vl, vv_of: v.vv,
    vnt_nominal: vntNom, vnt_legenda: vntLeg, outro_bu: cat.outro + t.outros, geracao_ref: ref.dg });
}
const CAMPOS = ['aptos', 'comp', 'vb', 'vn', 'vnom', 'vl', 'van', 'vansj', 'vnt', 'vv', 'tv'];
p('\n== I1–I4. Fechamento BU × total oficial da divulgação, por UF × cargo ==');
p(`Pares: ${fech.length} (27 UFs × cargos estaduais + presidente nacional com as 28 UFs)`);
for (const c of CAMPOS) {
  const dif = fech.filter((x) => x[`${c}_bu`] !== x[`${c}_of`]);
  p(`  ${c.padEnd(6)} iguais ${fech.length - dif.length}/${fech.length}  Σ BU ${f(fech.reduce((a, x) => a + x[`${c}_bu`], 0)).padStart(14)}  Σ oficial ${f(fech.reduce((a, x) => a + x[`${c}_of`], 0)).padStart(14)}${dif.length ? '  DIVERGE: ' + dif.map((x) => `${x.abr} ${x.cargo} (${x[`${c}_bu`]} × ${x[`${c}_of`]})`).join(', ') : ''}`);
}
p(`  votos com destino desconhecido (outro): ${fech.reduce((a, x) => a + x.outro_bu, 0)}`);
p(`  I3 candidatos publicados com BU ≠ vap: ${candDiv.length}; candidatos com vap > 0 sem voto no BU: ${soOficial.length}; partidos com legenda válida BU ≠ tvtl: ${parDiv.length}`);
for (const d of [...candDiv, ...soOficial, ...parDiv].slice(0, 20)) p('   ', JSON.stringify(d));
const paresOk = fech.filter((x) => CAMPOS.every((c) => x[`${c}_bu`] === x[`${c}_of`]) && !x.outro_bu).length;
p(`  Pares que fecham em todos os ${CAMPOS.length} campos: ${paresOk}/${fech.length}`);

// ---------- vnt ----------
p('\n== Identidade do nulo técnico: vnt = Σ BU dos números de candidato ausentes da divulgação + Σ legenda BU de partido ausente ==');
const vntOk = fech.filter((x) => x.vnt_bu === x.vnt_of).length;
p(`  Fecha em ${vntOk}/${fech.length} pares; pares com vnt > 0: ${fech.filter((x) => x.vnt_of > 0).length}; Σ vnt oficial ${f(fech.reduce((a, x) => a + x.vnt_of, 0))}`);
const porCargo = new Map();
for (const x of fech) { const r = porCargo.get(x.cargo) ?? { pares: 0, comVnt: 0, vnt: 0, nominal: 0, legenda: 0 }; r.pares++; if (x.vnt_of) r.comVnt++; r.vnt += x.vnt_of; r.nominal += x.vnt_nominal; r.legenda += x.vnt_legenda; porCargo.set(x.cargo, r); }
for (const [c, r] of [...porCargo].sort((a, b) => a[0] - b[0])) p(`  ${NOME[c].padEnd(15)} pares ${String(r.pares).padStart(2)}, com vnt ${String(r.comVnt).padStart(2)}, vnt ${f(r.vnt).padStart(9)} (nominais ${f(r.nominal)}, legenda ${f(r.legenda)})`);
const triplasNom = omitidos.filter((o) => o.tipo === 'nominal');
const distintos = new Set(triplasNom.map((o) => `${o.abr}|${o.cargo}|${o.numero}`)).size;
p(`  Números de candidato omitidos: ${triplasNom.length} pares UF/BR × cargo × número (= candidatos distintos ${distintos}; o presidente conta uma vez, no BR); partidos com legenda omitida: ${omitidos.filter((o) => o.tipo === 'legenda').map((o) => `${o.abr} ${NOME[o.cargo]} ${o.numero} (${f(o.votos)})`).join('; ') || 'nenhum'}`);
p('  vnt por UF × cargo (só pares com vnt > 0):');
for (const x of fech.filter((y) => y.vnt_of > 0)) {
  const top = omitidos.filter((o) => o.abr === x.abr && o.cargo === x.cargo).sort((a, b) => b.votos - a.votos);
  p(`    ${x.abr.toUpperCase()} ${NOME[x.cargo].padEnd(15)} vnt ${f(x.vnt_of).padStart(8)} = BU ${f(x.vnt_bu).padStart(8)} (${top.length} itens; maior: ${top[0].tipo === 'legenda' ? 'legenda ' : 'nº '}${top[0].numero} ${f(top[0].votos)}) ${x.vnt_bu === x.vnt_of ? 'ok' : 'DIVERGE'}`);
}

// ---------- I5 efeito ----------
p('\n== I5. Efeito: o vnt contado como válido muda algum resultado? ==');
const efeito = [];
// majoritários: 1 vaga (presidente, governador) com maioria absoluta; senador com e = 's' vagas
function majoritario(abr, cargo, ref) {
  const val = [...ref.cand.values()].filter((c) => c.dvt === 'Válido');
  const ord = (l) => [...l].sort((a, b) => b.vap - a.vap);
  const vagas = cargo === 5 ? val.filter((c) => c.e === 's').length : 1;
  const resultado = (lista, vv) => {
    const o = ord(lista);
    if (cargo === 5) return { eleitos: o.slice(0, vagas).map((c) => c.n).sort().join(','), segundo: '' };
    return o[0].vap * 2 > vv ? { eleitos: String(o[0].n), segundo: '' } : { eleitos: '', segundo: [o[0].n, o[1].n].sort().join(',') };
  };
  // no JSON, `e = 's'` marca também quem vai ao 2º turno; o que separa os casos é `st` ("Eleito" × "2º turno")
  const segundoOf = val.filter((c) => c.st === '2º turno').map((c) => c.n).sort().join(',');
  const oficial = { eleitos: segundoOf ? '' : val.filter((c) => c.st === 'Eleito').map((c) => c.n).sort().join(','), segundo: segundoOf };
  const base = resultado(val, ref.v.vv);
  const extra = omitidos.filter((o) => o.abr === abr && o.cargo === cargo && o.tipo === 'nominal').map((o) => ({ n: o.numero, vap: o.votos, omitido: true }));
  const vnt = extra.reduce((a, o) => a + o.vap, 0);
  const cf = resultado([...val, ...extra], ref.v.vv + vnt);
  const o1 = ord(val);
  const r = { abr, cargo: NOME[cargo], vagas, vv: ref.v.vv, vnt, modelo_igual_oficial: base.eleitos === oficial.eleitos && base.segundo === oficial.segundo,
    oficial: oficial.eleitos ? `eleito ${oficial.eleitos}` : `2º turno ${oficial.segundo}`, cenario: cf.eleitos ? `eleito ${cf.eleitos}` : `2º turno ${cf.segundo}`,
    lider: `${o1[0].n} ${pct(o1[0].vap, ref.v.vv)} → ${pct(o1[0].vap, ref.v.vv + vnt)}`, maior_omitido: extra.length ? `${ord(extra)[0].n} ${ord(extra)[0].vap}` : '' };
  r.muda = r.oficial !== r.cenario ? 'SIM' : 'não';
  if (cargo === 5) r.margem = `último eleito ${o1[vagas - 1].n} ${o1[vagas - 1].vap}; maior omitido ${r.maior_omitido || '-'}`;
  else r.margem = `maioria absoluta (mínimo ${f(Math.floor(ref.v.vv / 2) + 1)}): ${o1[0].vap * 2 > ref.v.vv ? 'acima do mínimo' : 'faltam'} ${f(Math.abs(o1[0].vap - (Math.floor(ref.v.vv / 2) + 1)))} votos`;
  return r;
}
// proporcionais: CE arts. 106–109 (Lei 14.211/2021) e 3ª fase com todas as agremiações (STF, ADIs 7228/7263/7325)
const qeDe = (vv, vagas) => { const x = vv / vagas; return x - Math.floor(x) > 0.5 ? Math.ceil(x) : Math.floor(x); };
function distribuir(agrs, qe, vagas) {
  const st = agrs.map((a) => ({ ...a, cands: [...a.cands].sort((x, y) => y.vap - x.vap), eleitos: 0 }));
  let livres = vagas;
  for (const a of st) { a.eleitos = Math.min(Math.floor(a.votos / qe), a.cands.filter((c) => c.vap >= 0.1 * qe).length); livres -= a.eleitos; }
  const media = (a) => a.votos / (a.eleitos + 1);
  while (livres > 0) {
    const el = st.filter((a) => a.votos >= 0.8 * qe && a.cands[a.eleitos] && a.cands[a.eleitos].vap >= 0.2 * qe);
    if (!el.length) break;
    el.sort((x, y) => media(y) - media(x)); el[0].eleitos++; livres--;
  }
  while (livres > 0) {
    const el = st.filter((a) => a.cands.length > a.eleitos);
    if (!el.length) break;
    el.sort((x, y) => media(y) - media(x)); el[0].eleitos++; livres--;
  }
  return st;
}
const eleitosDe = (st) => st.flatMap((a) => a.cands.slice(0, a.eleitos).map((c) => c.n)).sort((a, b) => a - b).join(',');
function proporcional(abr, cargo, ref) {
  const vagas = ref.agr.reduce((a, x) => a + x.vag, 0);
  const qeCalc = qeDe(ref.v.vv, vagas);
  const base = distribuir(ref.agr, ref.qe, vagas);
  const oficialEleitos = [...ref.cand.values()].filter((c) => c.e === 's').map((c) => c.n).sort((a, b) => a - b).join(',');
  const modeloOk = base.every((a, i) => a.eleitos === ref.agr[i].vag) && eleitosDe(base) === oficialEleitos;
  const agrs = ref.agr.map((a) => ({ ...a, cands: [...a.cands], par: [...a.par] }));
  let vnt = 0; const novas = [];
  for (const o of omitidos.filter((x) => x.abr === abr && x.cargo === cargo)) {
    vnt += o.votos;
    const part = o.tipo === 'legenda' ? o.numero : Number(String(o.numero).slice(0, 2));
    let a = agrs.find((x) => x.par.includes(part));
    if (!a) { a = { n: `novo ${part}`, vag: 0, par: [part], votos: 0, cands: [] }; agrs.push(a); novas.push(part); }
    a.votos += o.votos;
    if (o.tipo === 'nominal') a.cands.push({ n: o.numero, vap: o.votos, omitido: true });
  }
  const qe2 = qeDe(ref.v.vv + vnt, vagas);
  const cf = distribuir(agrs, qe2, vagas);
  const mudVagas = cf.map((a, i) => (a.eleitos !== (base[i]?.eleitos ?? 0) ? `${a.n}: ${base[i]?.eleitos ?? 0}→${a.eleitos}` : null)).filter(Boolean);
  const omitEleitos = cf.flatMap((a) => a.cands.slice(0, a.eleitos).filter((c) => c.omitido).map((c) => `${c.n} (${c.vap})`));
  const maior = omitidos.filter((x) => x.abr === abr && x.cargo === cargo && x.tipo === 'nominal').sort((a, b) => b.votos - a.votos)[0];
  return { abr, cargo: NOME[cargo], vagas, vv: ref.v.vv, vnt, qe_oficial: ref.qe, qe_calculado: qeCalc, modelo_igual_oficial: modeloOk && qeCalc === ref.qe,
    oficial: `${vagas} vagas`, cenario: mudVagas.length ? mudVagas.join('; ') : 'mesmas vagas', muda: mudVagas.length || omitEleitos.length || eleitosDe(cf) !== eleitosDe(base) ? 'SIM' : 'não',
    margem: `maior omitido ${maior ? `${maior.numero} ${maior.votos} = ${(100 * maior.votos / ref.qe).toFixed(1)}% do QE` : '-'}${novas.length ? `; agremiação nova: ${novas.join(',')}` : ''}${omitEleitos.length ? `; omitido eleito: ${omitEleitos.join(',')}` : ''}`,
    lider: '', maior_omitido: maior ? `${maior.numero} ${maior.votos}` : '' };
}
for (const x of fech) {
  const ref = lerRef(x.abr, x.cargo);
  efeito.push(x.cargo <= 5 ? majoritario(x.abr, x.cargo, ref) : proporcional(x.abr, x.cargo, ref));
}
for (const c of [1, 3, 5, 6, 7, 8]) {
  const l = efeito.filter((e) => e.cargo === NOME[c]);
  p(`  ${NOME[c].padEnd(15)} pares ${String(l.length).padStart(2)}; modelo reproduz o oficial ${l.filter((e) => e.modelo_igual_oficial).length}/${l.length}; resultado muda com o vnt válido: ${l.filter((e) => e.muda === 'SIM').map((e) => e.abr.toUpperCase()).join(',') || 'nenhum'}`);
}
for (const e of efeito.filter((y) => !y.modelo_igual_oficial)) p(`    modelo ≠ oficial: ${e.abr} ${e.cargo} oficial ${e.oficial}; ${e.lider} ${e.margem}`);
for (const e of efeito.filter((y) => y.muda === 'SIM')) p(`    MUDA: ${e.abr.toUpperCase()} ${e.cargo}: oficial ${e.oficial} → com vnt válido ${e.cenario}; vnt ${f(e.vnt)}; líder ${e.lider}; ${e.margem}`);
p('  Majoritários com vnt > 0 (margem):');
for (const e of efeito.filter((y) => y.vnt > 0 && ['Presidente', 'Governador', 'Senador'].includes(y.cargo))) p(`    ${e.abr.toUpperCase()} ${e.cargo.padEnd(10)} vnt ${f(e.vnt).padStart(8)}; oficial ${e.oficial}; cenário ${e.cenario}; líder ${e.lider}; ${e.margem}`);
p('  Governadores sem vnt, mas perto da maioria absoluta (< 1 ponto):');
for (const e of efeito.filter((y) => y.cargo === 'Governador' && y.vnt === 0)) { const m = /([\d,.]+)% →/.exec(e.lider); if (m && Math.abs(Number(m[1]) - 50) < 1) p(`    ${e.abr.toUpperCase()} oficial ${e.oficial}; líder ${e.lider}; ${e.margem}`); }

// ---------- saídas ----------
const csv = (rows) => { if (!rows.length) return ''; const cols = Object.keys(rows[0]); return [cols.join(';'), ...rows.map((r) => cols.map((c) => String(r[c] ?? '').replaceAll(';', ',')).join(';'))].join('\n') + '\n'; };
writeFileSync(`${OUT}/h03-1t-fechamento.csv`, csv(fech));
writeFileSync(`${OUT}/h03-1t-omitidos.csv`, csv(omitidos));
writeFileSync(`${OUT}/h03-1t-efeito.csv`, csv(efeito));
writeFileSync(`${OUT}/h03-1t-universo.csv`, csv(universo));
p(`\nTempo: ${((Date.now() - inicio) / 1000).toFixed(0)} s. Saídas: ${OUT}/h03-1t-{resumo.txt,fechamento.csv,omitidos.csv,efeito.csv,universo.csv}`);
writeFileSync(`${OUT}/h03-1t-resumo.txt`, linhas.join('\n') + '\n');
