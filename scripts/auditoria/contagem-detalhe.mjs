// Auditor A (contagem), testes 1 e 2: BU × detalhe_votacao_secao (dados abertos do TSE), seção a seção e cargo a cargo.
// Compara aptos, comparecimento, nominais, brancos, nulos e legenda de cada seção e cargo do BU (banco SQLite)
// com o arquivo oficial. Só as UFs já carregadas no banco para o turno (tabela `carga`).
// Uso: node scripts/auditoria/contagem-detalhe.mjs --turno 2 [--uf ac,df]
// Saída: resumo no terminal e divergências em data/parsed/auditoria/contagem/detalhe-<t>t-divergencias.csv
import { mkdirSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { parseArgs } from 'node:util';
import { ZIPS, entradasZip, linhasCsv } from './contagem-zip.mjs';

const { values: args } = parseArgs({ options: { turno: { type: 'string', default: '2' }, uf: { type: 'string' } } });
const turno = Number(args.turno);
const db = new DatabaseSync('data/db/eleicao2026.sqlite', { readOnly: true });
const carregadas = db.prepare('SELECT uf FROM carga WHERE turno = ? ORDER BY uf').all(turno).map((r) => r.uf);
const ufs = args.uf ? args.uf.split(',').filter((u) => carregadas.includes(u)) : carregadas;
const CAMPOS = ['aptos', 'comparecimento', 'nominais', 'brancos', 'nulos', 'legenda'];
const PROPORCIONAIS = new Set([6, 7, 8]);
const pad = (v, n) => String(Number(v)).padStart(n, '0');

const qSecao = db.prepare(`SELECT municipio, zona, secao, situacao, tipo_urna, tipo_arquivo, status_aux, comparecimento, modelo_urna
  FROM secao WHERE turno = ? AND uf = ?`);
const qEleicao = db.prepare(`SELECT municipio, zona, secao, eleicao, aptos, aptos_secao, aptos_tte, comparecimento_majoritario, comparecimento_proporcional
  FROM secao_eleicao WHERE turno = ? AND uf = ?`);
const qVotos = db.prepare(`SELECT municipio, zona, secao, eleicao, cargo, tipo_voto, SUM(quantidade) AS q
  FROM voto_bu WHERE turno = ? AND uf = ? GROUP BY municipio, zona, secao, eleicao, cargo, tipo_voto`);

const resumo = new Map(); // cargo → contadores
const divergencias = [];
const porOrigem = new Map();
const semBu = []; // linhas do oficial sem seção completa no banco
let linhasOficial = 0;

const conta = (cargo) => {
  if (!resumo.has(cargo)) resumo.set(cargo, { linhas: 0, iguais: 0, oficial: Object.fromEntries(CAMPOS.map((c) => [c, 0])), bu: Object.fromEntries(CAMPOS.map((c) => [c, 0])), linhasDivergentes: Object.fromEntries(CAMPOS.map((c) => [c, 0])), anuladosApuSep: 0 });
  return resumo.get(cargo);
};

function carregarUf(uf) {
  const secoes = new Map();
  for (const s of qSecao.all(turno, uf)) secoes.set(`${s.municipio}|${s.zona}|${s.secao}`, { ...s, eleicoes: new Map(), votos: new Map(), vistas: new Set() });
  for (const e of qEleicao.all(turno, uf)) secoes.get(`${e.municipio}|${e.zona}|${e.secao}`)?.eleicoes.set(e.eleicao, e);
  for (const v of qVotos.all(turno, uf)) {
    const s = secoes.get(`${v.municipio}|${v.zona}|${v.secao}`);
    const k = `${v.eleicao}|${v.cargo}`;
    if (!s.votos.has(k)) s.votos.set(k, { nominal: 0, branco: 0, nulo: 0, legenda: 0, outros: 0 });
    const t = s.votos.get(k);
    if (v.tipo_voto in t) t[v.tipo_voto] += v.q; else t.outros += v.q;
  }
  return secoes;
}

const entradas = await entradasZip(ZIPS.detalheSecao);
const zipUf = new Map(); // uf → secoes carregadas
for (const uf of ufs) zipUf.set(uf, carregarUf(uf));
console.error(`banco: ${ufs.length} UFs do ${turno}º turno carregadas (${ufs.join(',')})`);

const arquivos = ['detalhe_votacao_secao_2026_BR.csv', ...ufs.filter((u) => u !== 'zz').map((u) => `detalhe_votacao_secao_2026_${u.toUpperCase()}.csv`)];
for (const nome of arquivos) {
  const entrada = entradas.find((e) => e.nome === nome);
  for await (const o of linhasCsv(ZIPS.detalheSecao, entrada)) {
    if (Number(o.NR_TURNO) !== turno) continue;
    const uf = o.SG_UF.toLowerCase();
    const secoes = zipUf.get(uf);
    if (!secoes) continue;
    linhasOficial++;
    const cargo = Number(o.CD_CARGO);
    const eleicao = Number(o.CD_ELEICAO);
    const chave = `${pad(o.CD_MUNICIPIO, 5)}|${pad(o.NR_ZONA, 4)}|${pad(o.NR_SECAO, 4)}`;
    const origem = `${o.DS_ORIGEM_VOTO} | instalada=${o.ST_SECAO_INSTALADA} | anulada=${o.ST_SECAO_ANULADA}`;
    porOrigem.set(origem, (porOrigem.get(origem) ?? 0) + 1);
    const of = {
      aptos: Number(o.QT_APTOS), comparecimento: Number(o.QT_COMPARECIMENTO), nominais: Number(o.QT_VOTOS_NOMINAIS),
      brancos: Number(o.QT_VOTOS_BRANCOS), nulos: Number(o.QT_VOTOS_NULOS), legenda: Number(o.QT_VOTOS_LEGENDA),
    };
    const r = conta(cargo);
    r.linhas++;
    r.anuladosApuSep += Number(o.QT_VOTOS_ANULADOS_APU_SEP);
    for (const c of CAMPOS) r.oficial[c] += of[c];
    const s = secoes.get(chave);
    if (!s || s.situacao !== 'completa') {
      semBu.push({ uf, chave, cargo, situacao: s?.situacao ?? 'ausente_no_banco', status_aux: s?.status_aux ?? '', origem, ...of });
      continue;
    }
    s.vistas.add(cargo);
    const e = s.eleicoes.get(eleicao);
    const v = s.votos.get(`${eleicao}|${cargo}`) ?? { nominal: 0, branco: 0, nulo: 0, legenda: 0, outros: 0 };
    const bu = {
      aptos: e?.aptos ?? null,
      comparecimento: e ? (PROPORCIONAIS.has(cargo) ? e.comparecimento_proporcional : e.comparecimento_majoritario) : null,
      nominais: v.nominal, brancos: v.branco, nulos: v.nulo, legenda: v.legenda,
    };
    for (const c of CAMPOS) r.bu[c] += bu[c] ?? 0;
    const difs = CAMPOS.filter((c) => bu[c] !== of[c]);
    if (!difs.length) { r.iguais++; continue; }
    for (const c of difs) r.linhasDivergentes[c]++;
    divergencias.push({ uf, chave, cargo, eleicao, tipo_urna: s.tipo_urna, tipo_arquivo: s.tipo_arquivo, status_aux: s.status_aux, origem, campos: difs.join('+'),
      ...Object.fromEntries(CAMPOS.flatMap((c) => [[`${c}_bu`, bu[c]], [`${c}_oficial`, of[c]]])), outros_bu: v.outros });
  }
}

// Seções completas no banco que não apareceram no oficial (por cargo do BU)
const foraDoOficial = [];
for (const [uf, secoes] of zipUf) {
  for (const [chave, s] of secoes) {
    if (s.situacao !== 'completa') continue;
    for (const k of s.votos.keys()) {
      const cargo = Number(k.split('|')[1]);
      if (![1, 3, 5, 6, 7, 8].includes(cargo)) continue; // consultas populares não estão no detalhe
      if (!s.vistas.has(cargo)) foraDoOficial.push({ uf, chave, cargo, tipo_urna: s.tipo_urna, status_aux: s.status_aux });
    }
  }
}

const nomeCargo = { 1: 'Presidente', 3: 'Governador', 5: 'Senador', 6: 'Dep. Federal', 7: 'Dep. Estadual', 8: 'Dep. Distrital' };
console.log(`\nBU × detalhe_votacao_secao, ${turno}º turno, UFs: ${ufs.join(',')}  (linhas do oficial lidas: ${linhasOficial})`);
for (const [cargo, r] of [...resumo].sort((a, b) => a[0] - b[0])) {
  console.log(`\n${nomeCargo[cargo] ?? cargo}: ${r.linhas} seções no oficial, ${r.iguais} idênticas ao BU nos 6 campos; anulados apuração em separado (oficial): ${r.anuladosApuSep}`);
  for (const c of CAMPOS) console.log(`  ${c.padEnd(15)} oficial ${String(r.oficial[c]).padStart(12)}  BU ${String(r.bu[c]).padStart(12)}  dif ${String(r.oficial[c] - r.bu[c]).padStart(8)}  seções divergentes ${r.linhasDivergentes[c]}`);
}
console.log('\nOrigem do voto no oficial (linhas):');
for (const [k, n] of [...porOrigem].sort((a, b) => b[1] - a[1])) console.log(`  ${n}\t${k}`);
console.log(`\nLinhas do oficial sem BU completo no banco: ${semBu.length}`);
const agrupa = (lista, f) => [...lista.reduce((m, x) => m.set(f(x), (m.get(f(x)) ?? 0) + 1), new Map())];
for (const [k, n] of agrupa(semBu, (x) => `${x.situacao} | aux=${x.status_aux} | ${x.origem} | comparecimento>0: ${x.comparecimento > 0}`)) console.log(`  ${n}\t${k}`);
console.log(`Seções completas no banco ausentes do oficial (seção×cargo): ${foraDoOficial.length}`);
for (const x of foraDoOficial.slice(0, 20)) console.log(`  ${x.uf} ${x.chave} cargo ${x.cargo} ${x.tipo_urna} ${x.status_aux}`);
console.log(`\nDivergências (seção×cargo): ${divergencias.length}`);
for (const [k, n] of agrupa(divergencias, (x) => `cargo ${x.cargo} | ${x.campos} | ${x.tipo_urna}/${x.tipo_arquivo} | ${x.origem}`).sort((a, b) => b[1] - a[1])) console.log(`  ${n}\t${k}`);

const dir = 'data/parsed/auditoria/contagem';
mkdirSync(dir, { recursive: true });
const csv = (lista) => {
  if (!lista.length) return '';
  const cols = Object.keys(lista[0]);
  return [cols.join(';'), ...lista.map((x) => cols.map((c) => x[c] ?? '').join(';'))].join('\n') + '\n';
};
const sufixo = args.uf ? `-${ufs.join('_')}` : '';
writeFileSync(`${dir}/detalhe-${turno}t${sufixo}-divergencias.csv`, csv(divergencias));
writeFileSync(`${dir}/detalhe-${turno}t${sufixo}-sem-bu.csv`, csv(semBu));
console.log(`\nArquivos: ${dir}/detalhe-${turno}t${sufixo}-divergencias.csv, ${dir}/detalhe-${turno}t${sufixo}-sem-bu.csv`);
