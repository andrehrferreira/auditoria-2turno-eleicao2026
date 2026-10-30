// Matemático forense, H03 no 2º turno, seção a seção, todos os campos (Presidente e Governador).
//
// Invariantes (se os arquivos forem honestos e o oficial for a soma dos BUs, nenhum pode falhar):
//   S0  universo: toda linha do detalhe_votacao_secao do 2º turno corresponde a uma seção do banco, e toda seção completa
//       com BU de Presidente/Governador tem linha no detalhe; nenhuma linha duplicada (seção × cargo).
//   S1  por seção e cargo (1 e 3): aptos, comparecimento, nominais, brancos, nulos e legenda do BU = detalhe;
//       votos anulados em apuração separada do detalhe = 0 (não existe esse tipo de voto no BU da urna).
//   S2  Presidente, voto a voto por seção: cada número (inclusive 95 branco e 96 nulo) do BU = tabela voto_oficial
//       (votacao_secao_2026_BR.csv carregado no banco); nenhuma seção ou número só de um lado.
//   S3  nulo técnico por seção = 0: todo voto nominal do BU é para um número que a divulgação (resultados.tse.jus.br,
//       JSON já baixado em data/raw/2t/referencia) lista como candidato do cargo naquela UF; nominais = Σ candidatos.
//   S4  por UF × cargo: Σ seções do BU = Σ seções do detalhe, nos 6 campos (decorre de S1; tabela para o relatório).
//
// Fontes: cópia de leitura do banco (src/banco-leitura.js) e o zip oficial detalhe_votacao_secao_2026.zip, entrada
// detalhe_votacao_secao_2026_BRASIL.csv (país inteiro, todos os cargos; lida em streaming, sem extrair). Sem rede.
// Uso: node scripts/auditoria/matematico-h03-2t-secao.mjs [--contraprova]
// Saídas: data/parsed/auditoria/matematico/h03-2t-secao-{resumo.txt,uf.csv,divergencias.csv}
// --contraprova: altera em memória 3 valores do BU (AC 01007/0009/0003 Presidente: +1 branco e +1 voto no nº 99;
//   primeira seção de Governador lida: +1 apto) e confere que o teste acusa: S1 3 divergências, S2 2, S3 1. Saídas com
//   sufixo -contraprova; nada é gravado no banco.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { parseArgs } from 'node:util';
import { ZIPS, entradasZip, linhasCsv } from './contagem-zip.mjs';

const { values: args } = parseArgs({ options: { contraprova: { type: 'boolean', default: false } } });
const SUF = args.contraprova ? '-contraprova' : '';

const TURNO = 2;
const OUT = 'data/parsed/auditoria/matematico';
const REF = 'data/raw/2t/referencia';
mkdirSync(OUT, { recursive: true });
const saida = [];
const p = (...a) => { const s = a.join(' '); saida.push(s); console.log(s); };
const f = (x) => Number(x).toLocaleString('pt-BR');
const pad = (v, n) => String(Number(v)).padStart(n, '0');
const ELEICAO = { 1: 6258, 3: 6260 };
const NOME = { 1: 'Presidente', 3: 'Governador' };
const CAMPOS = ['aptos', 'comparecimento', 'nominais', 'brancos', 'nulos', 'legenda'];
const inicio = Date.now();

const { db, fonte } = await abrirLeitura();
p(`Banco: ${fonte}`);

// ---------- candidatos de cada UF × cargo, pela divulgação ----------
function candidatos(arquivo) {
  const j = JSON.parse(readFileSync(`${REF}/${arquivo}`, 'utf8'));
  const nums = new Set();
  for (const a of j.carg[0].agr) for (const pa of a.par) for (const c of pa.cand) nums.add(Number(c.n));
  return nums;
}
const candPres = candidatos('br-c0001-e006258-u.json');
const UFS_GOV = ['ac', 'am', 'df', 'es', 'rn', 'to'];
const candGov = new Map(UFS_GOV.map((uf) => [uf, candidatos(`${uf}-c0003-e006260-u.json`)]));
p(`Divulgação: Presidente ${[...candPres].join(', ')}; Governador ${UFS_GOV.map((u) => `${u.toUpperCase()} ${[...candGov.get(u)].join('/')}`).join(', ')}`);

// ---------- BU, por seção e cargo ----------
const bu = new Map(); // uf|mun|zona|secao|cargo → registro
const secoes = new Map(); // uf|mun|zona|secao → { situacao, tipo_arquivo }
for (const s of db.prepare('SELECT uf, municipio, zona, secao, situacao, tipo_arquivo FROM secao WHERE turno = ?').iterate(TURNO)) {
  secoes.set(`${s.uf}|${s.municipio}|${s.zona}|${s.secao}`, { situacao: s.situacao, tipo_arquivo: s.tipo_arquivo });
}
const ele = new Map(); // uf|mun|zona|secao|eleicao → linha
for (const e of db.prepare(`SELECT uf, municipio, zona, secao, eleicao, aptos, comparecimento_majoritario AS cmaj FROM secao_eleicao
  WHERE turno = ? AND eleicao IN (6258, 6260)`).iterate(TURNO)) ele.set(`${e.uf}|${e.municipio}|${e.zona}|${e.secao}|${e.eleicao}`, e);
const novo = () => ({ nominais: 0, brancos: 0, nulos: 0, legenda: 0, outros: 0, porNumero: new Map(), porNominal: new Map() });
for (const v of db.prepare(`SELECT uf, municipio, zona, secao, cargo, tipo_voto, numero, SUM(quantidade) AS q FROM voto_bu
  WHERE turno = ? AND cargo IN (1, 3) GROUP BY 1, 2, 3, 4, 5, 6, 7`).iterate(TURNO)) {
  const k = `${v.uf}|${v.municipio}|${v.zona}|${v.secao}|${v.cargo}`;
  if (!bu.has(k)) bu.set(k, novo());
  const r = bu.get(k);
  if (v.tipo_voto === 'nominal') {
    r.nominais += v.q;
    r.porNumero.set(v.numero, (r.porNumero.get(v.numero) ?? 0) + v.q);
    r.porNominal.set(v.numero, (r.porNominal.get(v.numero) ?? 0) + v.q);
  } else if (v.tipo_voto === 'branco') { r.brancos += v.q; r.porNumero.set(95, (r.porNumero.get(95) ?? 0) + v.q); }
  else if (v.tipo_voto === 'nulo') { r.nulos += v.q; r.porNumero.set(96, (r.porNumero.get(96) ?? 0) + v.q); }
  else if (v.tipo_voto === 'legenda') r.legenda += v.q;
  else r.outros += v.q;
}
if (args.contraprova) {
  const kp = 'ac|01007|0009|0003|1';
  const rp = bu.get(kp);
  rp.brancos++; rp.porNumero.set(95, rp.porNumero.get(95) + 1);
  rp.nominais++; rp.porNumero.set(99, 1); rp.porNominal.set(99, 1); // só o dado do BU muda; a detecção (S3) roda depois
  const kg = [...bu.keys()].find((k) => k.endsWith('|3'));
  const kge = `${kg.slice(0, -2)}|6260`;
  ele.set(kge, { ...ele.get(kge), aptos: ele.get(kge).aptos + 1 });
  p(`CONTRAPROVA: ${kp} +1 branco e +1 voto no nº 99; ${kge} +1 apto (esperado: S1 3 divergências, S2 2, S3 1)`);
}
// S3 roda depois de carregar o BU (e depois da contraprova, se houver): cada voto nominal tem de ser para um candidato listado
const nulosTecnicos = [];
for (const [k, r] of bu) {
  const [uf, , , , cargo] = k.split('|');
  const lista = cargo === '1' ? candPres : candGov.get(uf);
  for (const [numero, q] of r.porNominal) if (q > 0 && !lista?.has(numero)) nulosTecnicos.push({ k, numero, q });
}
const tiposOutros = [...bu.values()].reduce((a, r) => a + r.outros, 0);
p(`BU do 2º turno: ${f(secoes.size)} seções, ${f(bu.size)} pares seção × cargo com voto (Presidente e Governador); votos de outro tipo: ${tiposOutros}`);
console.error(`  BU carregado em ${((Date.now() - inicio) / 1000).toFixed(0)} s`);

// ---------- S0/S1: detalhe oficial ----------
const porUf = new Map(); // uf|cargo → { secoes, bu: {...}, of: {...} }
const acumula = (uf, cargo, b, o) => {
  const k = `${uf}|${cargo}`;
  if (!porUf.has(k)) porUf.set(k, { uf, cargo, linhas: 0, iguais: 0, bu: Object.fromEntries(CAMPOS.map((c) => [c, 0])), of: Object.fromEntries(CAMPOS.map((c) => [c, 0])) });
  const r = porUf.get(k);
  r.linhas++;
  for (const c of CAMPOS) { r.bu[c] += b?.[c] ?? 0; r.of[c] += o[c]; }
  return r;
};
const vistas = new Set();
const duplicadas = [];
const divergencias = [];
const semBu = new Map(); // motivo → { linhas, aptos, comparecimento }
const origem = new Map();
let anuladosApuSep = 0, linhasLidas = 0;
const abstencoes = new Map(); // regra → { linhas, violam, aptos }
const entradas = await entradasZip(ZIPS.detalheSecao);
const entrada = entradas.find((e) => e.nome === 'detalhe_votacao_secao_2026_BRASIL.csv');
const cargosNoDetalhe = new Map();
for await (const o of linhasCsv(ZIPS.detalheSecao, entrada)) {
  if (Number(o.NR_TURNO) !== TURNO) continue;
  linhasLidas++;
  const cargo = Number(o.CD_CARGO);
  cargosNoDetalhe.set(`${cargo} ${o.DS_CARGO} eleição ${o.CD_ELEICAO}`, (cargosNoDetalhe.get(`${cargo} ${o.DS_CARGO} eleição ${o.CD_ELEICAO}`) ?? 0) + 1);
  const uf = o.SG_UF.toLowerCase();
  const ks = `${uf}|${pad(o.CD_MUNICIPIO, 5)}|${pad(o.NR_ZONA, 4)}|${pad(o.NR_SECAO, 4)}`;
  const k = `${ks}|${cargo}`;
  if (vistas.has(k)) { duplicadas.push(k); continue; }
  vistas.add(k);
  const of = { aptos: Number(o.QT_APTOS), comparecimento: Number(o.QT_COMPARECIMENTO), nominais: Number(o.QT_VOTOS_NOMINAIS),
    brancos: Number(o.QT_VOTOS_BRANCOS), nulos: Number(o.QT_VOTOS_NULOS), legenda: Number(o.QT_VOTOS_LEGENDA) };
  anuladosApuSep += Number(o.QT_VOTOS_ANULADOS_APU_SEP);
  // abstenções do próprio oficial: aptos − comparecimento na seção instalada; na não instalada o TSE não conta abstenção
  const abst = Number(o.QT_ABSTENCOES), esperado = o.ST_SECAO_INSTALADA === 'Sim' ? of.aptos - of.comparecimento : 0;
  const ka = `abstenções = ${o.ST_SECAO_INSTALADA === 'Sim' ? 'aptos − comparecimento (instalada)' : '0 (não instalada)'}`;
  const ta = abstencoes.get(ka) ?? { linhas: 0, violam: 0, aptos: 0 }; ta.linhas++; ta.aptos += of.aptos; if (abst !== esperado) ta.violam++; abstencoes.set(ka, ta);
  const og = `${o.DS_ORIGEM_VOTO} | instalada ${o.ST_SECAO_INSTALADA} | anulada ${o.ST_SECAO_ANULADA}`;
  origem.set(og, (origem.get(og) ?? 0) + 1);
  const s = secoes.get(ks);
  if (!s || s.situacao !== 'completa') {
    const m = `${NOME[cargo] ?? cargo}: ${s ? `seção ${s.situacao}` : 'seção ausente do banco'} | ${og}`;
    const r = semBu.get(m) ?? { linhas: 0, aptos: 0, comparecimento: 0, votos: 0 };
    r.linhas++; r.aptos += of.aptos; r.comparecimento += of.comparecimento; r.votos += of.nominais + of.brancos + of.nulos + of.legenda;
    semBu.set(m, r);
    acumula(uf, cargo, null, of);
    continue;
  }
  const e = ele.get(`${ks}|${ELEICAO[cargo]}`);
  const v = bu.get(k) ?? novo();
  const b = { aptos: e?.aptos ?? null, comparecimento: e?.cmaj ?? null, nominais: v.nominais, brancos: v.brancos, nulos: v.nulos, legenda: v.legenda };
  const r = acumula(uf, cargo, b, of);
  const difs = CAMPOS.filter((c) => b[c] !== of[c]);
  if (!difs.length) r.iguais++;
  for (const c of difs) divergencias.push({ chave: k, campo: c, bu: b[c], oficial: of[c] });
}
p(`\n== S0. Universo: detalhe_votacao_secao_2026_BRASIL.csv, 2º turno ==`);
p(`  Linhas lidas: ${f(linhasLidas)}; duplicadas (seção × cargo): ${duplicadas.length}`);
for (const [k, n] of [...cargosNoDetalhe].sort()) p(`    cargo ${k}: ${f(n)} linhas`);
p('  Origem do voto no oficial:');
for (const [k, n] of [...origem].sort((a, b) => b[1] - a[1])) p(`    ${f(n).padStart(9)}  ${k}`);
p('  Linhas do oficial sem BU completo no banco:');
for (const [k, r] of semBu) p(`    ${f(r.linhas)} ${k}: aptos ${f(r.aptos)}, comparecimento ${r.comparecimento}, votos ${r.votos}`);
const foraDoOficial = [...bu.keys()].filter((k) => !vistas.has(k));
const compSemLinha = [];
for (const [ks, s] of secoes) {
  if (s.situacao !== 'completa') continue;
  for (const cargo of [1, 3]) {
    const e = ele.get(`${ks}|${ELEICAO[cargo]}`);
    if (e && !vistas.has(`${ks}|${cargo}`)) compSemLinha.push(`${ks}|${cargo} (aptos ${e.aptos}, comparecimento ${e.cmaj})`);
  }
}
p(`  Pares seção × cargo com voto no BU e sem linha no oficial: ${foraDoOficial.length}${foraDoOficial.length ? ': ' + foraDoOficial.slice(0, 10).join(', ') : ''}`);
p(`  Pares seção × eleição do BU (Presidente/Governador) sem linha no oficial: ${compSemLinha.length}${compSemLinha.length ? ': ' + compSemLinha.slice(0, 10).join(', ') : ''}`);

p(`\n== S1. Seção a seção, 6 campos (BU × detalhe) ==`);
for (const cargo of [1, 3]) {
  const l = [...porUf.values()].filter((r) => r.cargo === cargo);
  const linhas = l.reduce((a, r) => a + r.linhas, 0);
  const iguais = l.reduce((a, r) => a + r.iguais, 0);
  const dif = divergencias.filter((d) => d.chave.endsWith(`|${cargo}`));
  p(`  ${NOME[cargo]}: ${f(linhas)} linhas no oficial; com BU e iguais nos 6 campos: ${f(iguais)}; divergências seção × campo: ${dif.length}`);
  for (const c of CAMPOS) {
    const sb = l.reduce((a, r) => a + r.bu[c], 0), so = l.reduce((a, r) => a + r.of[c], 0);
    p(`    ${c.padEnd(15)} BU ${f(sb).padStart(13)}  oficial ${f(so).padStart(13)}  seções divergentes ${dif.filter((d) => d.campo === c).length}`);
  }
}
p(`  Votos anulados em apuração separada (oficial, soma das linhas do 2º turno): ${anuladosApuSep}`);
for (const [k, t] of abstencoes) p(`  Conta interna do oficial, ${k}: ${f(t.linhas)} linhas (aptos ${f(t.aptos)}), violações ${t.violam}`);
for (const d of divergencias.slice(0, 30)) p(`    DIVERGE ${d.chave} ${d.campo}: BU ${d.bu} × oficial ${d.oficial}`);

// ---------- S2: Presidente voto a voto (voto_oficial) ----------
p(`\n== S2. Presidente, número a número por seção (BU × voto_oficial) ==`);
const geracao = db.prepare('SELECT DISTINCT data_geracao AS d FROM carga_oficial WHERE turno = ?').all(TURNO).map((r) => r.d);
const oficial = new Map(); // uf|mun|zona|secao|1 → Map numero → q
for (const o of db.prepare('SELECT uf, municipio, zona, secao, cargo, eleicao, numero, quantidade FROM voto_oficial WHERE turno = ? AND cargo = 1').iterate(TURNO)) {
  const k = `${o.uf}|${o.municipio}|${o.zona}|${o.secao}|1`;
  if (!oficial.has(k)) oficial.set(k, new Map());
  const m = oficial.get(k);
  m.set(o.numero, (m.get(o.numero) ?? 0) + o.quantidade);
}
const presBu = [...bu.entries()].filter(([k]) => k.endsWith('|1'));
let iguais2 = 0; const div2 = []; const porNum = new Map();
for (const [k, r] of presBu) {
  const m = oficial.get(k);
  if (!m) { div2.push(`${k}: só no BU`); continue; }
  let ok = true;
  for (const n of new Set([...r.porNumero.keys(), ...m.keys()])) {
    const b = r.porNumero.get(n) ?? 0, o = m.get(n) ?? 0;
    const t = porNum.get(n) ?? { bu: 0, of: 0 }; t.bu += b; t.of += o; porNum.set(n, t);
    if (b !== o) { ok = false; div2.push(`${k} nº ${n}: BU ${b} × oficial ${o}`); }
  }
  if (ok) iguais2++;
}
const soOficial2 = [...oficial.keys()].filter((k) => !bu.has(k));
p(`  voto_oficial gerado em ${geracao.join(', ')}; seções: BU ${f(presBu.length)}, oficial ${f(oficial.size)}, só no oficial ${soOficial2.length}`);
p(`  Seções iguais em todos os números: ${f(iguais2)}; divergências: ${div2.length}`);
for (const [n, t] of [...porNum].sort((a, b) => a[0] - b[0])) p(`    nº ${String(n).padStart(2)}: BU ${f(t.bu).padStart(12)}  oficial ${f(t.of).padStart(12)}`);
for (const d of [...div2, ...soOficial2].slice(0, 20)) p(`    ${d}`);

// ---------- S3: nulo técnico por seção ----------
p(`\n== S3. Nulo técnico por seção (voto nominal em número fora da lista da divulgação) ==`);
p(`  Pares seção × número com voto fora da lista: ${nulosTecnicos.length}; votos: ${nulosTecnicos.reduce((a, x) => a + x.q, 0)}`);
for (const x of nulosTecnicos.slice(0, 20)) p(`    ${x.k} nº ${x.numero}: ${x.q}`);
const ufsGovBu = new Set([...bu.keys()].filter((k) => k.endsWith('|3')).map((k) => k.split('|')[0]));
p(`  UFs com voto de Governador no BU: ${[...ufsGovBu].sort().join(', ')} (divulgação: ${UFS_GOV.join(', ')})`);

// ---------- S4: por UF ----------
p(`\n== S4. Por UF × cargo: Σ BU × Σ detalhe (todas as linhas do oficial, inclusive sem BU) ==`);
const linhasUf = [];
for (const r of [...porUf.values()].sort((a, b) => a.cargo - b.cargo || a.uf.localeCompare(b.uf))) {
  const iguaisUf = CAMPOS.filter((c) => r.bu[c] === r.of[c]);
  const row = { uf: r.uf.toUpperCase(), cargo: NOME[r.cargo], secoes_oficial: r.linhas, secoes_iguais: r.iguais };
  for (const c of CAMPOS) { row[`${c}_bu`] = r.bu[c]; row[`${c}_oficial`] = r.of[c]; }
  row.campos_iguais = `${iguaisUf.length}/6`;
  linhasUf.push(row);
  p(`  ${row.uf} ${row.cargo.padEnd(10)} seções ${f(r.linhas).padStart(7)} (iguais ${f(r.iguais)})  ${CAMPOS.map((c) => `${c} ${f(r.bu[c])}${r.bu[c] === r.of[c] ? '' : ` ≠ ${f(r.of[c])}`}`).join('; ')}`);
}

const csv = (rows) => { if (!rows.length) return ''; const cols = Object.keys(rows[0]); return [cols.join(';'), ...rows.map((r) => cols.map((c) => String(r[c] ?? '')).join(';'))].join('\n') + '\n'; };
writeFileSync(`${OUT}/h03-2t-secao${SUF}-uf.csv`, csv(linhasUf));
writeFileSync(`${OUT}/h03-2t-secao${SUF}-divergencias.csv`, csv(divergencias.length ? divergencias : [{ chave: '', campo: '', bu: '', oficial: '' }]));
p(`\nTempo: ${((Date.now() - inicio) / 1000).toFixed(0)} s. Saídas: ${OUT}/h03-2t-secao${SUF}-{resumo.txt,uf.csv,divergencias.csv}`);
writeFileSync(`${OUT}/h03-2t-secao${SUF}-resumo.txt`, saida.join('\n') + '\n');
