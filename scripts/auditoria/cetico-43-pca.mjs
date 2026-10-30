// Cético, parecer 43: leitura própria do perfil_comparecimento_abstencao (TSE) de 2018, 2022 e 2026, para conferir o
// salto dos votantes de 85–99 (demógrafo 09). Caminho diferente do demógrafo:
//  - lê o BRASIL.csv dos TRÊS anos (o demógrafo leu os CSV por UF em 2026);
//  - a faixa vem do TEXTO DS_FAIXA_ETARIA (o demógrafo usou o código); guarda o par código→texto de cada ano;
//  - soma todas as colunas de quantidade (comparecimento, abstenção, TTE, facultativo, obrigatório, deficiência), para
//    ver se "votante" mudou de definição (aptos = comparecimento + abstenção? 70+ todo facultativo?);
//  - separa ZZ (exterior) e VT (voto em trânsito) em vez de só descartar;
//  - soma o detalhe_votacao_secao (Presidente) de 2018, 2022 e 2026 e o BU do banco (2026) para conferir o total de
//    votantes do perfil contra a contagem por seção.
// Agregado; nenhum CPF, nenhum título. Não varre data/raw (abre só os zips nomeados).
// Uso: node --max-old-space-size=6000 scripts/auditoria/cetico-43-pca.mjs
// Saída: data/parsed/auditoria/cetico-revisor/p43/pca.json
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { entradasZip, linhasBrutas } from './contagem-zip.mjs';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', 'p43');
const DA = path.join(DIR_DADOS, 'raw', 'dadosabertos');
const t0 = Date.now(); const log = (...a) => console.error(`${((Date.now() - t0) / 1000).toFixed(0)}s`, ...a);

// faixa pelo texto: "16 anos", "21 a 24 anos", "85 a 89 anos", "100 anos ou mais", "Inválido"
function faixaDoTexto(ds) {
  const n = (ds.match(/\d+/g) ?? []).map(Number);
  if (!n.length) return 'invalida';
  const a = n[0];
  if (/mais/i.test(ds) && a >= 100) return '100+';
  if (a < 16) return 'invalida';
  if (a <= 17) return '16-17';
  if (a <= 24) return '18-24';
  if (a <= 59) return '25-59';
  if (a >= 100) return '100+';
  const ini = Math.floor(a / 5) * 5; return `${ini}-${ini + 4}`;
}
const COLS = ['QT_APTOS', 'QT_COMPARECIMENTO', 'QT_ABSTENCAO', 'QT_COMPARECIMENTO_TTE', 'QT_COMPAREC_FACULTATIVO', 'QT_COMPAREC_OBRIGATORIO', 'QT_COMPARECIMENTO_DEFICIENCIA'];
const novo = () => COLS.map(() => 0);
const add = (m, k, v) => { const a = m.get(k) ?? m.set(k, novo()).get(k); for (let i = 0; i < v.length; i++) a[i] += v[i]; };

const R = { colunas: COLS, anos: {} };
const zonas = {}; // ano → Map(uf|mun|zona|faixa → vetor), só 1º turno
for (const ano of [2018, 2022, 2026]) {
  const zip = path.join(DA, 'perfil_comparecimento_abstencao', `perfil_comparecimento_abstencao_${ano}.zip`);
  const e = (await entradasZip(zip)).find((x) => /BRASIL\.csv$/i.test(x.nome));
  const br = new Map(); const uf = new Map(); const z = new Map(); const pares = new Map(); const geracao = new Set();
  let col = null; let nc = 0; let linhas = 0; let tortas = 0; let difApt = 0;
  for await (const c of linhasBrutas(zip, e)) {
    if (!col) { col = Object.fromEntries(c.map((n, i) => [n, i])); nc = c.length; continue; }
    linhas++; if (c.length !== nc) { tortas++; continue; }
    const t = c[col.NR_TURNO]; const u = c[col.SG_UF]; const ds = c[col.DS_FAIXA_ETARIA];
    geracao.add(`${t}:${c[col.DT_GERACAO]}`);
    const par = `${c[col.CD_FAIXA_ETARIA]}=${ds}`; pares.set(par, (pares.get(par) ?? 0) + 1);
    const f = faixaDoTexto(ds);
    const v = COLS.map((n) => Number(c[col[n]]) || 0);
    if (v[0] !== v[1] + v[2]) difApt++;
    const grupo = u === 'ZZ' ? 'ZZ' : u === 'VT' ? 'VT' : 'BR';
    add(br, `${t}|${grupo}|${f}`, v);
    add(uf, `${t}|${u}|${f}`, v);
    if (t === '1' && grupo === 'BR' && ano !== 2018) add(z, `${u}|${String(Number(c[col.CD_MUNICIPIO])).padStart(5, '0')}|${String(Number(c[col.NR_ZONA])).padStart(4, '0')}|${f}`, v);
  }
  R.anos[ano] = { entrada: e.nome, linhas, linhasComColunasDiferentes: tortas, linhasAptosDiferenteDeCompMaisAbst: difApt, geracao: [...geracao].sort(),
    paresCodigoTexto: Object.fromEntries([...pares.entries()].sort()), brasil: Object.fromEntries(br), uf: Object.fromEntries(uf) };
  if (ano !== 2018) zonas[ano] = Object.fromEntries(z);
  log(`pca ${ano}: ${linhas} linhas, ${tortas} tortas`);
}

// detalhe por seção, Presidente: aptos e comparecimento por turno, sem ZZ
R.detalhe = {};
for (const ano of [2018, 2022, 2026]) {
  const zip = path.join(DA, 'detalhe_votacao_secao', `detalhe_votacao_secao_${ano}.zip`);
  const ents = await entradasZip(zip);
  const e = ents.find((x) => /_BR\.csv$/i.test(x.nome)) ?? ents.find((x) => /BRASIL\.csv$/i.test(x.nome));
  const s = {}; let col = null; let nc = 0; let tortas = 0;
  for await (const c of linhasBrutas(zip, e)) {
    if (!col) { col = Object.fromEntries(c.map((n, i) => [n, i])); nc = c.length; continue; }
    if (c.length !== nc) { tortas++; continue; }
    if (c[col.CD_CARGO] !== '1') continue;
    const k = `${c[col.NR_TURNO]}|${c[col.SG_UF] === 'ZZ' ? 'ZZ' : 'BR'}`;
    const o = (s[k] ??= { secoes: 0, aptos: 0, comparecimento: 0 }); o.secoes++; o.aptos += Number(c[col.QT_APTOS]); o.comparecimento += Number(c[col.QT_COMPARECIMENTO]);
  }
  R.detalhe[ano] = { entrada: e.nome, tortas, ...s };
  log(`detalhe ${ano}`);
}
// BU 2026 no banco (cópia de leitura)
{
  const { db, fonte } = await abrirLeitura();
  R.bu2026 = { fonte, porTurno: db.prepare(`SELECT turno, CASE WHEN uf = 'zz' THEN 'ZZ' ELSE 'BR' END g, count(*) secoes, sum(comparecimento) comparecimento
    FROM secao WHERE situacao = 'completa' GROUP BY 1, 2`).all() };
  db.close();
}
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, 'pca.json'), JSON.stringify(R));
await writeFile(path.join(SAIDA, 'pca-zonas.json'), JSON.stringify(zonas));
log('fim');
