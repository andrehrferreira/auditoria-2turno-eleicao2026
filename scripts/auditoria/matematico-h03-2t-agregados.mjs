// Matemático forense, H03 no 2º turno, níveis agregados: zona, município, UF e país (Presidente e Governador).
//
// Invariantes (a soma das seções tem de ser o resultado de cada nível; nenhum pode falhar se os arquivos forem honestos):
//   A1  zona × candidato: Σ BU das seções da zona = votacao_candidato_munzona (QT_VOTOS_NOMINAIS, somando as linhas com e
//       sem voto em trânsito); nenhum par só de um lado; QT_VOTOS_NOMINAIS_VALIDOS = QT_VOTOS_NOMINAIS onde o destino é "Válido".
//   A2  município × candidato e UF × candidato: as mesmas somas, agregadas (decorre de A1; contado para o relatório).
//   A3  UF (Governador) e país (Presidente) na divulgação (JSON *-u.json de resultados.tse.jus.br, já baixados em
//       data/raw/2t/referencia): seções ts/si/sni, eleitorado te/esi/esni, comparecimento c, abstenção a, brancos vb,
//       nulos vn, nulo técnico vnt, total de nulos tvn, nominais válidos vnom, anulados van, anulados sub judice vansj,
//       válidos vv, total tv, e o voto de cada candidato (vap) = soma dos BUs.
//       O eleitorado das 41 seções não instaladas (esni) vem do detalhe_votacao_secao (o banco não tem BU delas).
//   A4  toda linha do 2º turno no munzona é de Presidente ou de Governador de uma das 6 UFs com 2º turno.
// Sem rede. Uso: node scripts/auditoria/matematico-h03-2t-agregados.mjs [--contraprova]
// Saídas: data/parsed/auditoria/matematico/h03-2t-agregados-{resumo.txt,divulgacao.csv,candidatos.csv}
// --contraprova: altera em memória a soma dos BUs (nada é gravado no banco) com 6 alterações, cada uma visível até um nível:
//   K1 move 1 voto do nº 13 (Presidente) entre duas zonas do mesmo município → zona 2, município 0, UF 0, país 0;
//   K2 move 1 voto do nº 22 entre dois municípios da mesma UF → zona 2, município 2, UF 0, país 0;
//   K3 +1 voto do nº 11 (Governador DF) numa zona → zona/município/UF 1 cada; DF: vnom, vv, tv e o candidato 11;
//   K4 +1 voto no nº 99 (Governador TO) numa zona → zona/município/UF 1 cada (só no BU); TO: vnt, tvn, tv;
//   K5 +1 branco no Governador do AC → AC: vb, tv;   K6 +1 apto no Governador do ES → ES: esi, te, a.
//   Esperado: Presidente zona 4, município 2, UF 0; Governador zona 2, município 2, UF 2; divulgação: BR 0 campos,
//   AC 2, DF 3 (+ candidato 11), ES 3, TO 3 (+ nº 99 só no BU), AM e RN 0. Saídas com sufixo -contraprova.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { parseArgs } from 'node:util';
import { ZIPS, entradasZip, linhasBrutas } from './contagem-zip.mjs';

const { values: args } = parseArgs({ options: { contraprova: { type: 'boolean', default: false } } });
const SUF = args.contraprova ? '-contraprova' : '';

const TURNO = 2;
const OUT = 'data/parsed/auditoria/matematico';
const REF = 'data/raw/2t/referencia';
mkdirSync(OUT, { recursive: true });
const saida = [];
const p = (...a) => { const s = a.join(' '); saida.push(s); console.log(s); };
const f = (x) => Number(x).toLocaleString('pt-BR');
const N = (x) => Number(x ?? 0);
const pad = (v, n) => String(Number(v)).padStart(n, '0');
const NOME = { 1: 'Presidente', 3: 'Governador' };
const UFS_GOV = ['ac', 'am', 'df', 'es', 'rn', 'to'];
const DESTINO = { 'Válido': 'vnom', 'Anulado': 'van', 'Anulado sub judice': 'vansj' };
const inicio = Date.now();

const { db, fonte } = await abrirLeitura();
p(`Banco: ${fonte}`);

// ---------- BU ----------
const nominalZona = new Map(); // uf|mun|zona|cargo|numero → votos
for (const r of db.prepare(`SELECT uf, municipio, zona, cargo, numero, SUM(quantidade) AS q FROM voto_bu
  WHERE turno = ? AND cargo IN (1, 3) AND tipo_voto = 'nominal' GROUP BY 1, 2, 3, 4, 5`).iterate(TURNO)) {
  nominalZona.set(`${r.uf}|${r.municipio}|${r.zona}|${r.cargo}|${r.numero}`, r.q);
}
const tipoUf = new Map(); // uf|cargo|tipo → votos
for (const r of db.prepare(`SELECT uf, cargo, tipo_voto, SUM(quantidade) AS q FROM voto_bu WHERE turno = ? AND cargo IN (1, 3) GROUP BY 1, 2, 3`).iterate(TURNO)) {
  tipoUf.set(`${r.uf}|${r.cargo}|${r.tipo_voto}`, r.q);
}
const secoesUf = new Map(db.prepare(`SELECT uf, COUNT(*) AS ts, SUM(situacao = 'completa') AS si, SUM(situacao = 'sem_arquivo') AS sni
  FROM secao WHERE turno = ? GROUP BY uf`).all(TURNO).map((r) => [r.uf, r]));
const eleUf = new Map(db.prepare(`SELECT e.uf, e.eleicao, COUNT(*) AS secoes, SUM(e.aptos) AS aptos, SUM(e.comparecimento_majoritario) AS c
  FROM secao_eleicao e JOIN secao s ON s.turno = e.turno AND s.uf = e.uf AND s.municipio = e.municipio AND s.zona = e.zona AND s.secao = e.secao
  WHERE e.turno = ? AND e.eleicao IN (6258, 6260) AND s.situacao = 'completa' GROUP BY 1, 2`).all(TURNO).map((r) => [`${r.uf}|${r.eleicao}`, r]));
console.error(`  BU carregado em ${((Date.now() - inicio) / 1000).toFixed(0)} s`);

if (args.contraprova) {
  const chaves = [...nominalZona.keys()].sort();
  const parte = (k) => k.split('|');
  const soma = (k, d) => nominalZona.set(k, (nominalZona.get(k) ?? 0) + d);
  // K1: duas zonas do mesmo município, nº 13
  const z13 = chaves.filter((k) => parte(k)[3] === '1' && parte(k)[4] === '13');
  let k1a, k1b;
  for (const a of z13) { const b = z13.find((x) => x !== a && parte(x)[0] === parte(a)[0] && parte(x)[1] === parte(a)[1]); if (b) { k1a = a; k1b = b; break; } }
  soma(k1a, -1); soma(k1b, +1);
  // K2: dois municípios da mesma UF, nº 22
  const z22 = chaves.filter((k) => parte(k)[3] === '1' && parte(k)[4] === '22');
  const k2a = z22[0], k2b = z22.find((x) => parte(x)[0] === parte(k2a)[0] && parte(x)[1] !== parte(k2a)[1]);
  soma(k2a, -1); soma(k2b, +1);
  // K3: +1 no nº 11 do Governador do DF
  const k3 = chaves.find((k) => k.startsWith('df|') && parte(k)[3] === '3' && parte(k)[4] === '11');
  soma(k3, +1);
  // K4: +1 no nº 99 do Governador do TO
  const kt = chaves.find((k) => k.startsWith('to|') && parte(k)[3] === '3');
  const k4 = `${parte(kt).slice(0, 4).join('|')}|99`;
  soma(k4, +1);
  // K5 e K6
  tipoUf.set('ac|3|branco', tipoUf.get('ac|3|branco') + 1);
  eleUf.set('es|6260', { ...eleUf.get('es|6260'), aptos: eleUf.get('es|6260').aptos + 1 });
  p(`CONTRAPROVA: K1 ${k1a} −1 / ${k1b} +1; K2 ${k2a} −1 / ${k2b} +1; K3 ${k3} +1; K4 ${k4} +1; K5 AC Governador +1 branco; K6 ES Governador +1 apto`);
  p('  Esperado: Presidente zona 4, município 2, UF 0; Governador zona 2, município 2, UF 2; divulgação BR 0, AC 2, AM 0, DF 3 (+ candidato 11), ES 3, RN 0, TO 3 (+ nº 99 só no BU)');
}


// ---------- eleitorado das seções não instaladas (detalhe, arquivo de Presidente) ----------
const entradasDet = await entradasZip(ZIPS.detalheSecao);
let esniBr = 0, sniDetalhe = 0;
{
  let col = null;
  for await (const c of linhasBrutas(ZIPS.detalheSecao, entradasDet.find((e) => e.nome === 'detalhe_votacao_secao_2026_BR.csv'))) {
    if (!col) { col = Object.fromEntries(c.map((n, i) => [n, i])); continue; }
    if (c[col.NR_TURNO] !== String(TURNO) || c[col.ST_SECAO_INSTALADA] !== 'Não') continue;
    sniDetalhe++; esniBr += N(c[col.QT_APTOS]);
  }
}

// ---------- A1/A4: munzona ----------
const entradas = await entradasZip(ZIPS.munzona);
const nomesMz = entradas.map((e) => e.nome).filter((n) => /^votacao_candidato_munzona_2026_[A-Z]{2}\.csv$/.test(n));
const oficialZona = new Map();
const linhasPorArquivo = [];
const destinos = new Map();
let validosDiferentes = 0;
for (const nome of nomesMz) {
  let col = null, n2 = 0;
  for await (const c of linhasBrutas(ZIPS.munzona, entradas.find((e) => e.nome === nome))) {
    if (!col) { col = Object.fromEntries(c.map((x, i) => [x, i])); continue; }
    if (c[col.NR_TURNO] !== String(TURNO)) continue;
    n2++;
    const cargo = N(c[col.CD_CARGO]);
    const k = `${c[col.SG_UF].toLowerCase()}|${pad(c[col.CD_MUNICIPIO], 5)}|${pad(c[col.NR_ZONA], 4)}|${cargo}|${N(c[col.NR_CANDIDATO])}`;
    const q = N(c[col.QT_VOTOS_NOMINAIS]);
    oficialZona.set(k, (oficialZona.get(k) ?? 0) + q);
    const d = `${NOME[cargo] ?? `cargo ${cargo}`} | ${c[col.NM_TIPO_DESTINACAO_VOTOS]} | trânsito ${c[col.ST_VOTO_EM_TRANSITO]}`;
    destinos.set(d, (destinos.get(d) ?? 0) + q);
    if (c[col.NM_TIPO_DESTINACAO_VOTOS] === 'Válido' && N(c[col.QT_VOTOS_NOMINAIS_VALIDOS]) !== q) validosDiferentes++;
  }
  if (n2) linhasPorArquivo.push(`${nome.replace('votacao_candidato_munzona_2026_', '').replace('.csv', '')} ${f(n2)}`);
}
p(`\n== A4. munzona: linhas do 2º turno por arquivo (lidos ${nomesMz.length} arquivos, todos os de UF e o BR) ==`);
p(`  ${linhasPorArquivo.join('; ')}`);
for (const [d, q] of [...destinos].sort()) p(`  ${d}: ${f(q)} votos`);
p(`  Linhas "Válido" com nominais válidos ≠ nominais: ${validosDiferentes}`);

p(`\n== A1/A2. Candidato por zona, município e UF: Σ BU × munzona ==`);
const nivel = (chave) => {
  const bu = new Map(), of = new Map();
  for (const [k, q] of nominalZona) { const kk = chave(k); bu.set(kk, (bu.get(kk) ?? 0) + q); }
  for (const [k, q] of oficialZona) { const kk = chave(k); of.set(kk, (of.get(kk) ?? 0) + q); }
  const r = { 1: { pares: 0, iguais: 0, soBu: 0, soOf: 0, dif: 0, ex: [] }, 3: { pares: 0, iguais: 0, soBu: 0, soOf: 0, dif: 0, ex: [] } };
  for (const kk of new Set([...bu.keys(), ...of.keys()])) {
    const cargo = Number(kk.split('|').at(-2));
    const t = r[cargo];
    t.pares++;
    const b = bu.get(kk), o = of.get(kk);
    if (b === o) t.iguais++;
    else if (o === undefined) { if (b === 0) t.iguais++; else { t.soBu++; t.ex.push(`${kk}: só BU ${b}`); } }
    else if (b === undefined) { if (o === 0) t.iguais++; else { t.soOf++; t.ex.push(`${kk}: só oficial ${o}`); } }
    else { t.dif++; t.ex.push(`${kk}: BU ${b} × oficial ${o}`); }
  }
  return r;
};
const niveis = {
  'zona': (k) => k,
  'município': (k) => { const [uf, mun, , c, n] = k.split('|'); return `${uf}|${mun}|${c}|${n}`; },
  'UF': (k) => { const [uf, , , c, n] = k.split('|'); return `${uf}|${c}|${n}`; },
};
for (const [nomeNivel, fn] of Object.entries(niveis)) {
  const r = nivel(fn);
  for (const cargo of [1, 3]) {
    const t = r[cargo];
    p(`  ${nomeNivel.padEnd(9)} ${NOME[cargo].padEnd(10)} pares ${f(t.pares).padStart(7)}, iguais ${f(t.iguais).padStart(7)}, só no BU ${t.soBu}, só no oficial ${t.soOf}, valores diferentes ${t.dif}`);
    for (const e of t.ex.slice(0, 10)) p(`      ${e}`);
  }
}

// ---------- A3: divulgação ----------
p(`\n== A3. Total da divulgação (Presidente no país, Governador por UF) × soma dos BUs ==`);
function lerRef(arq) {
  const j = JSON.parse(readFileSync(`${REF}/${arq}`, 'utf8'));
  const cand = new Map();
  for (const a of j.carg[0].agr) for (const pa of a.par) for (const c of pa.cand) cand.set(Number(c.n), { dvt: c.dvt, vap: N(c.vap), nmu: c.nmu, st: c.st });
  const num = (o) => Object.fromEntries(Object.entries(o).filter(([, x]) => /^\d+$/.test(String(x))).map(([k, x]) => [k, N(x)]));
  return { dg: `${j.dg} ${j.hg}`, s: num(j.s), e: num(j.e), v: num(j.v), cand };
}
const CAMPOS = ['ts', 'si', 'sni', 'te', 'esi', 'esni', 'c', 'a', 'vb', 'vn', 'vnt', 'tvn', 'vnom', 'van', 'vansj', 'vv', 'tv', 'vsan', 'vscv'];
const linhasDiv = [];
const linhasCand = [];
const alvo = [['br', 1, 'br-c0001-e006258-u.json', 6258], ...UFS_GOV.map((u) => [u, 3, `${u}-c0003-e006260-u.json`, 6260])];
for (const [abr, cargo, arq, eleicao] of alvo) {
  const ref = lerRef(arq);
  const ufs = abr === 'br' ? [...secoesUf.keys()] : [abr];
  const soma = (fn) => ufs.reduce((a, u) => a + N(fn(u)), 0);
  const bu = {
    ts: soma((u) => (abr === 'br' ? secoesUf.get(u)?.ts : eleUf.get(`${u}|${eleicao}`)?.secoes)),
    si: soma((u) => eleUf.get(`${u}|${eleicao}`)?.secoes),
    sni: abr === 'br' ? soma((u) => secoesUf.get(u)?.sni) : 0,
    esi: soma((u) => eleUf.get(`${u}|${eleicao}`)?.aptos),
    esni: abr === 'br' ? esniBr : 0,
    c: soma((u) => eleUf.get(`${u}|${eleicao}`)?.c),
    vb: soma((u) => tipoUf.get(`${u}|${cargo}|branco`)),
    vn: soma((u) => tipoUf.get(`${u}|${cargo}|nulo`)),
    legenda: soma((u) => tipoUf.get(`${u}|${cargo}|legenda`)),
    vnom: 0, van: 0, vansj: 0, vnt: 0, vsan: 0, vscv: 0,
  };
  bu.te = bu.esi + bu.esni;
  bu.a = bu.esi - bu.c;
  const porNum = new Map();
  for (const [k, q] of nominalZona) {
    const [uf, , , c, n] = k.split('|');
    if (Number(c) !== cargo || !ufs.includes(uf)) continue;
    porNum.set(Number(n), (porNum.get(Number(n)) ?? 0) + q);
  }
  for (const [n, q] of porNum) {
    const cd = ref.cand.get(n);
    if (!cd) bu.vnt += q; else bu[DESTINO[cd.dvt] ?? 'vnt'] += q;
  }
  bu.tvn = bu.vn + bu.vnt;
  bu.vv = bu.vnom + bu.legenda;
  bu.tv = bu.vv + bu.vb + bu.tvn + bu.van + bu.vansj;
  const difs = CAMPOS.filter((c) => bu[c] !== ref[c in ref.s ? 's' : c in ref.e ? 'e' : 'v'][c]);
  const row = { abrangencia: abr.toUpperCase(), cargo: NOME[cargo], geracao: ref.dg };
  for (const c of CAMPOS) { const o = ref[c in ref.s ? 's' : c in ref.e ? 'e' : 'v'][c]; row[`${c}_bu`] = bu[c]; row[`${c}_oficial`] = o; }
  row.campos_iguais = `${CAMPOS.length - difs.length}/${CAMPOS.length}`;
  linhasDiv.push(row);
  p(`  ${abr.toUpperCase()} ${NOME[cargo].padEnd(10)} (gerado ${ref.dg}) campos iguais ${CAMPOS.length - difs.length}/${CAMPOS.length}${difs.length ? '  DIVERGE: ' + difs.map((c) => `${c} BU ${bu[c]} × ${row[`${c}_oficial`]}`).join(', ') : ''}`);
  p(`     seções ${f(bu.ts)} (instaladas ${f(bu.si)}, não instaladas ${bu.sni}); eleitorado ${f(bu.te)} (instaladas ${f(bu.esi)}, não instaladas ${bu.esni}); comparecimento ${f(bu.c)}; abstenção ${f(bu.a)}`);
  p(`     brancos ${f(bu.vb)}; nulos ${f(bu.vn)}; nulo técnico ${bu.vnt}; nominais válidos ${f(bu.vnom)}; anulados ${bu.van}; sub judice ${bu.vansj}; total ${f(bu.tv)}`);
  for (const [n, cd] of ref.cand) {
    const b = porNum.get(n) ?? 0;
    linhasCand.push({ abrangencia: abr.toUpperCase(), cargo: NOME[cargo], numero: n, nome_urna: cd.nmu, destino: cd.dvt, situacao: cd.st, votos_bu: b, votos_oficial: cd.vap, igual: b === cd.vap ? 'sim' : 'NÃO' });
    p(`     nº ${n} ${cd.nmu} (${cd.st}): BU ${f(b)} × oficial ${f(cd.vap)} ${b === cd.vap ? 'ok' : 'DIVERGE'}`);
  }
  for (const [n, q] of porNum) if (!ref.cand.has(n)) p(`     nº ${n} só no BU: ${q} (nulo técnico)`);
}
p(`  Seções não instaladas no detalhe (arquivo de Presidente): ${sniDetalhe}, eleitorado ${esniBr}`);

const csv = (rows) => { if (!rows.length) return ''; const cols = Object.keys(rows[0]); return [cols.join(';'), ...rows.map((r) => cols.map((c) => String(r[c] ?? '')).join(';'))].join('\n') + '\n'; };
writeFileSync(`${OUT}/h03-2t-agregados${SUF}-divulgacao.csv`, csv(linhasDiv));
writeFileSync(`${OUT}/h03-2t-agregados${SUF}-candidatos.csv`, csv(linhasCand));
p(`\nTempo: ${((Date.now() - inicio) / 1000).toFixed(0)} s. Saídas: ${OUT}/h03-2t-agregados${SUF}-{resumo.txt,divulgacao.csv,candidatos.csv}`);
writeFileSync(`${OUT}/h03-2t-agregados${SUF}-resumo.txt`, saida.join('\n') + '\n');
